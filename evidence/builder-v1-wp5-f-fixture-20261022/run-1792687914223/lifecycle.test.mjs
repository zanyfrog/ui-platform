// tests/fixture-preview/lifecycle.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";

// src/client/fixture-preview/lifecycle.ts
var identityKey = (value) => JSON.stringify([value.subjectId, value.sessionId, value.applicationId, value.artifactKey]);
var PreviewLifecycle = class {
  value;
  sequence = 0;
  constructor(identity2) {
    if (Object.values(identity2).some((value) => typeof value !== "string" || !value || value.length > 4096) || Object.keys(identity2).length !== 4) throw new Error("PREVIEW_IDENTITY_INVALID");
    this.value = { state: "empty", identity: structuredClone(identity2) };
  }
  get snapshot() {
    return structuredClone(this.value);
  }
  refresh() {
    if (this.value.state === "disposed" || this.value.state === "revoked") throw new Error("PREVIEW_SESSION_CLOSED");
    const sequence = ++this.sequence;
    const pending = { identity: structuredClone(this.value.identity), sequence, requestId: `request-${sequence}` };
    this.value = { ...this.value, state: "capturing", pending, reason: void 0 };
    return structuredClone(pending);
  }
  matches(request) {
    return this.value.state === "capturing" && this.value.pending?.sequence === request.sequence && this.value.pending.requestId === request.requestId && identityKey(request.identity) === identityKey(this.value.identity);
  }
  succeed(request, capture2) {
    if (!this.matches(request) || identityKey(capture2.identity) !== identityKey(this.value.identity) || !capture2.captureId) return false;
    if (this.value.last?.captureId === capture2.captureId && JSON.stringify(this.value.last.provenance) !== JSON.stringify(capture2.provenance)) return false;
    this.value = { state: "ready", identity: this.value.identity, last: structuredClone(capture2) };
    return true;
  }
  fail(request, reason) {
    if (!this.matches(request)) return false;
    this.value = { ...this.value, state: this.value.last ? "stale" : "unavailable", pending: void 0, reason };
    return true;
  }
  invalidate(reason) {
    if (this.value.state === "disposed" || this.value.state === "revoked") return;
    this.sequence++;
    this.value = { ...this.value, state: this.value.last ? "stale" : "unavailable", pending: void 0, reason };
  }
  revoke(reason) {
    if (this.value.state === "disposed") return;
    this.sequence++;
    this.value = { state: "revoked", identity: this.value.identity, reason };
  }
  dispose() {
    this.sequence++;
    this.value = { state: "disposed", identity: this.value.identity };
  }
};

// src/client/fixture-preview/samples.ts
var FixtureDenied = class extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
  code;
};
var defaultSample = () => ({ fixture: "native-card-v1", heading: "Synthetic Card", body: "Authored synthetic slot text", footer: "Synthetic footer", variant: "outlined", density: "comfortable", selectable: true });
var keys = ["fixture", "heading", "body", "footer", "variant", "density", "selectable"];
function validateSample(input) {
  if (!input || typeof input !== "object" || Array.isArray(input) || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) throw new FixtureDenied("SAMPLE_SCHEMA_UNSUPPORTED");
  const descriptors = Object.getOwnPropertyDescriptors(input);
  if (Reflect.ownKeys(input).length !== keys.length || Object.keys(descriptors).some((key) => !keys.includes(key) || descriptors[key].get || descriptors[key].set)) throw new FixtureDenied("SAMPLE_FIELDS_UNSUPPORTED");
  const sample = input;
  if (sample.fixture !== "native-card-v1") throw new FixtureDenied("FIXTURE_RENDERER_NOT_ADMITTED");
  for (const key of ["heading", "body", "footer"]) if (typeof sample[key] !== "string" || sample[key].length > 512 || /[\u0000-\u001f<>]/.test(sample[key])) throw new FixtureDenied(`SAMPLE_TEXT_INVALID:${key}`);
  if (!["outlined", "elevated", "flat"].includes(sample.variant) || !["comfortable", "compact"].includes(sample.density) || typeof sample.selectable !== "boolean") throw new FixtureDenied("SAMPLE_PROPERTY_INVALID");
  return { fixture: sample.fixture, heading: sample.heading, body: sample.body, footer: sample.footer, variant: sample.variant, density: sample.density, selectable: sample.selectable };
}
function denyCapability(capability) {
  throw new FixtureDenied(`FIXTURE_CAPABILITY_DENIED:${capability}`);
}
var unsupportedFixtures = Object.freeze({
  component: "PLATFORM_COMPONENT_CAPTURE_UNAVAILABLE: saved source and dependency admission prerequisites remain open",
  package: "PACKAGE_NOT_ADMITTED: only the bundled native Card implementation is audited",
  regions: "REGION_SCHEMA_UNSUPPORTED: composition renderer closure is not admitted",
  route: "ROUTE_SCHEMA_UNSUPPORTED: no captured route contract is available",
  form: "FORM_MODE_UNSUPPORTED: create/edit Form renderer closure is not admitted",
  source: "EXECUTABLE_SOURCE_DENIED: source functions and imports are never fixture inputs",
  resource: "RESOURCE_NOT_ADMITTED: no URL or external resource capability exists",
  saved: "SAVED_CAPTURE_UNAVAILABLE: D6 acquisition and trusted revocation prerequisites remain open"
});

// src/client/fixture-preview/protocol.ts
function validChannel(value, expected) {
  if (!value || typeof value !== "object") return false;
  const v = value;
  const fields = v.type === "render" ? ["nonce", "session", "identity", "sequence", "type", "sample"] : ["nonce", "session", "identity", "sequence", "type", ...v.reason === void 0 ? [] : ["reason"]];
  return Object.keys(v).length === fields.length && Object.keys(v).every((key) => fields.includes(key)) && ["render", "ready", "unavailable"].includes(v.type) && v.nonce === expected.nonce && v.session === expected.session && v.identity === expected.identity && v.sequence === expected.sequence && Number.isSafeInteger(v.sequence) && v.sequence > 0 && (v.reason === void 0 || typeof v.reason === "string" && v.reason.length <= 256);
}

// src/shared/platform-settings.ts
var defaultAutosave = Object.freeze({ enabled: true, delayMs: 2e3 });
var record = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function validateAutosave(value) {
  if (!record(value) || Object.keys(value).some((key) => !["enabled", "delayMs"].includes(key)) || typeof value.enabled !== "boolean" || !Number.isInteger(value.delayMs) || value.delayMs < 100 || value.delayMs > 6e4 || value.delayMs % 10 !== 0)
    throw new Error("Autosave requires a boolean enabled value and an integer delay of 100\u201360000 milliseconds in increments of 10.");
}

// src/client/artifact-editor/autosave-configuration.ts
var current = { ...defaultAutosave };
var listeners = /* @__PURE__ */ new Set();
function autosaveConfiguration() {
  return { ...current };
}
function configureAutosave(value) {
  validateAutosave(value);
  if (current.enabled === value.enabled && current.delayMs === value.delayMs) return;
  current = { ...value };
  for (const listener of listeners) listener({ ...current });
}
function subscribeAutosave(listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

// src/client/artifact-editor/editing-lifecycle.ts
var EditingLifecycle = class {
  constructor(value, save, equal = (a, b) => JSON.stringify(a) === JSON.stringify(b), limits = { entries: 100, bytes: 8 * 1024 * 1024 }) {
    this.save = save;
    this.equal = equal;
    this.limits = limits;
    this.current = structuredClone(value);
    this.baseline = structuredClone(value);
    this.unsubscribeAutosave = subscribeAutosave((value2) => {
      this.autosave = value2;
      this.lastEdit = Date.now();
      this.schedule();
      this.emit();
    });
  }
  save;
  equal;
  limits;
  current;
  baseline;
  generation = 0;
  savedGeneration = 0;
  state = "idle";
  failure;
  notice;
  suspended = false;
  disposed = false;
  inFlight;
  timer;
  lastEdit = 0;
  past = [];
  future = [];
  group;
  groupTime = 0;
  uncertain = false;
  listeners = /* @__PURE__ */ new Set();
  autosave = autosaveConfiguration();
  unsubscribeAutosave;
  get dirty() {
    return this.uncertain || !this.equal(this.current, this.baseline);
  }
  get canUndo() {
    return !this.suspended && !this.disposed && !!this.past.length;
  }
  get canRedo() {
    return !this.suspended && !this.disposed && !!this.future.length;
  }
  get historySize() {
    return { entries: this.past.length + this.future.length, bytes: [...this.past, ...this.future].reduce((n, entry) => n + entry.bytes, 0) };
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  emit() {
    for (const listener of this.listeners) listener();
  }
  entry(value) {
    const retained = structuredClone(value), seen = /* @__PURE__ */ new WeakSet();
    const estimate = (item) => {
      if (typeof item === "string") return 32 + item.length * 2;
      if (!item || typeof item !== "object") return 8;
      if (seen.has(item)) return 0;
      seen.add(item);
      return 64 + Object.entries(item).reduce((bytes, [key, child]) => bytes + 16 + key.length * 2 + estimate(child), 0);
    };
    return { value: retained, bytes: estimate(retained) };
  }
  bound() {
    while (this.historySize.entries > this.limits.entries || this.historySize.bytes > this.limits.bytes) {
      if (this.past.length) this.past.shift();
      else this.future.shift();
    }
  }
  edit(value, group) {
    if (this.suspended || this.disposed) throw new Error("Editing access is suspended or closed.");
    if (this.equal(value, this.current)) return;
    const now = Date.now();
    if (!group || group !== this.group || now - this.groupTime > 750) this.past.push(this.entry(this.current));
    this.future = [];
    this.group = group;
    this.groupTime = now;
    this.bound();
    this.current = structuredClone(value);
    this.changed();
  }
  changed() {
    this.generation++;
    this.lastEdit = Date.now();
    this.notice = void 0;
    if (this.state !== "conflict") {
      this.state = this.inFlight ? "saving" : this.dirty ? "pending" : "saved";
      this.failure = void 0;
    }
    this.schedule();
    this.emit();
  }
  undo() {
    if (!this.canUndo) return;
    this.future.push(this.entry(this.current));
    this.current = this.past.pop().value;
    this.group = void 0;
    this.bound();
    this.changed();
  }
  redo() {
    if (!this.canRedo) return;
    this.past.push(this.entry(this.current));
    this.current = this.future.pop().value;
    this.group = void 0;
    this.bound();
    this.changed();
  }
  schedule() {
    clearTimeout(this.timer);
    if (!this.autosave.enabled || this.disposed || this.suspended || this.inFlight || this.failure || this.state === "conflict" || this.state === "error" || !this.dirty) return;
    this.timer = setTimeout(() => {
      void this.flush();
    }, Math.max(0, this.autosave.delayMs - (Date.now() - this.lastEdit)));
  }
  async flush() {
    clearTimeout(this.timer);
    if (this.inFlight) {
      await this.inFlight;
      if (this.state !== "error" && this.state !== "conflict") return this.flush();
      return;
    }
    if (this.disposed || this.suspended || this.state === "conflict") return;
    if (!this.dirty) {
      this.savedGeneration = this.generation;
      this.state = "saved";
      this.emit();
      return;
    }
    const candidate = structuredClone(this.current), baseline = structuredClone(this.baseline), generation = this.generation;
    this.state = "saving";
    this.failure = void 0;
    this.emit();
    this.inFlight = (async () => {
      try {
        const saved = await this.save(candidate, baseline);
        this.baseline = structuredClone(saved);
        this.savedGeneration = generation;
        this.uncertain = false;
        if (this.generation === generation) this.current = structuredClone(saved);
        if (this.state !== "conflict") this.state = this.dirty ? "pending" : "saved";
      } catch (error) {
        const failure = error;
        if (this.state !== "conflict") {
          const invalid = failure.status === 422 || failure.validation?.valid === false;
          if (invalid && this.generation !== generation) {
            this.state = this.dirty ? "pending" : "saved";
            this.failure = void 0;
          } else {
            this.state = failure.status === 409 ? "conflict" : invalid ? "pending" : "error";
            this.failure = failure.message ?? String(error);
            if (this.state === "error") this.uncertain = true;
          }
        }
      }
    })();
    await this.inFlight;
    this.inFlight = void 0;
    if (this.generation !== generation || !this.failure) this.schedule();
    this.emit();
  }
  conflict(message = "Source changed outside Builder. Compare or reload; local changes retained.") {
    clearTimeout(this.timer);
    this.state = "conflict";
    this.failure = message;
    this.emit();
  }
  reset(remote, local = remote) {
    if (this.inFlight) throw new Error("Wait for the admitted save before replacing the baseline.");
    clearTimeout(this.timer);
    this.uncertain = false;
    this.baseline = structuredClone(remote);
    this.current = structuredClone(local);
    this.past = [];
    this.future = [];
    this.group = void 0;
    this.generation++;
    this.savedGeneration = this.dirty ? this.generation - 1 : this.generation;
    this.state = this.dirty ? "pending" : "idle";
    this.failure = void 0;
    this.notice = "Source baseline replaced. Undo/Redo history reset.";
    this.schedule();
    this.emit();
  }
  confirmBaseline(remote) {
    if (!this.equal(remote, this.baseline)) throw new Error("Changed source requires explicit baseline replacement.");
    this.baseline = structuredClone(remote);
    this.uncertain = false;
  }
  suspend() {
    this.suspended = true;
    clearTimeout(this.timer);
    this.emit();
  }
  resume() {
    if (this.disposed) throw new Error("Editor is closed.");
    if (!this.suspended) return;
    this.suspended = false;
    this.schedule();
    this.emit();
  }
  async dispose() {
    this.suspend();
    if (this.inFlight) await this.inFlight;
    this.disposed = true;
    this.unsubscribeAutosave();
    this.past = [];
    this.future = [];
    this.listeners.clear();
  }
};

// tests/fixture-preview/lifecycle.test.ts
var identity = { subjectId: "synthetic-subject", sessionId: "synthetic-session", applicationId: "app-permanent-1", artifactKey: JSON.stringify(["platform", "synthetic-owner", "visual", "synthetic-id"]) };
var capture = (id) => ({ identity, captureId: id, provenance: { kind: "fixture", fixtureId: "native-card-v1" }, content: defaultSample() });
test("identity is immutable and distinguishes original subject, session, permanent Application and owner", () => {
  const initial = structuredClone(identity), lifecycle = new PreviewLifecycle(initial);
  initial.applicationId = "renamed-key-is-not-id";
  assert.equal(lifecycle.snapshot.identity.applicationId, identity.applicationId);
  for (const field of Object.keys(identity)) assert.notEqual(identityKey(identity), identityKey({ ...identity, [field]: "different" }));
  assert.throws(() => new PreviewLifecycle({ ...identity, applicationId: "" }), /IDENTITY_INVALID/);
});
test("last success is distinct from pending and cannot be relabeled on failure", () => {
  const lifecycle = new PreviewLifecycle(identity);
  assert.equal(lifecycle.snapshot.state, "empty");
  const first = lifecycle.refresh();
  assert.equal(lifecycle.snapshot.state, "capturing");
  assert(lifecycle.succeed(first, capture("capture-original")));
  const next = lifecycle.refresh();
  assert.equal(lifecycle.snapshot.last?.captureId, "capture-original");
  assert.equal(lifecycle.snapshot.pending?.requestId, next.requestId);
  lifecycle.fail(next, "RESOURCE_NOT_ADMITTED");
  assert.equal(lifecycle.snapshot.state, "stale");
  assert.equal(lifecycle.snapshot.last?.captureId, "capture-original");
  assert.equal(lifecycle.snapshot.pending, void 0);
  const external = lifecycle.snapshot;
  external.last.captureId = "tampered";
  assert.equal(lifecycle.snapshot.last?.captureId, "capture-original");
});
test("deferred response loses to explicit newer refresh", async () => {
  const lifecycle = new PreviewLifecycle(identity);
  const old = lifecycle.refresh();
  let resolve;
  const deferred = new Promise((done) => {
    resolve = done;
  });
  const completion = deferred.then((value) => lifecycle.succeed(old, value));
  const latest = lifecycle.refresh();
  assert(lifecycle.succeed(latest, capture("new")));
  resolve(capture("old"));
  assert.equal(await completion, false);
  assert.equal(lifecycle.snapshot.last?.captureId, "new");
});
test("a retained capture cannot be relabeled as another saved revision or fixture", () => {
  const lifecycle = new PreviewLifecycle(identity);
  lifecycle.succeed(lifecycle.refresh(), capture("same-capture"));
  const pending = lifecycle.refresh();
  assert.equal(lifecycle.succeed(pending, { ...capture("same-capture"), provenance: { kind: "saved", revision: "new-revision" } }), false);
  assert.equal(lifecycle.snapshot.last?.provenance.kind, "fixture");
});
test("wrong response identity, request identity and sequence are rejected", () => {
  const lifecycle = new PreviewLifecycle(identity), request = lifecycle.refresh();
  for (const field of Object.keys(identity)) {
    const wrong = { ...identity, [field]: "other" };
    assert.equal(lifecycle.succeed({ ...request, identity: wrong }, capture("wrong")), false);
    assert.equal(lifecycle.succeed(request, { ...capture("wrong"), identity: wrong }), false);
  }
  assert.equal(lifecycle.succeed({ ...request, sequence: request.sequence + 1 }, capture("wrong")), false);
  assert.equal(lifecycle.succeed({ ...request, requestId: "replay" }, capture("wrong")), false);
});
test("invalidation cancels pending without automatic recapture or content replacement", () => {
  const lifecycle = new PreviewLifecycle(identity), first = lifecycle.refresh();
  lifecycle.succeed(first, capture("old"));
  const pending = lifecycle.refresh();
  lifecycle.invalidate("DEPENDENCY_CHANGED");
  assert.equal(lifecycle.snapshot.state, "stale");
  assert.equal(lifecycle.snapshot.pending, void 0);
  assert.equal(lifecycle.succeed(pending, capture("late")), false);
  assert.equal(lifecycle.snapshot.last?.captureId, "old");
});
test("simulated revocation clears successful and pending content and rejects future/late work", () => {
  const lifecycle = new PreviewLifecycle(identity);
  lifecycle.succeed(lifecycle.refresh(), capture("old"));
  const pending = lifecycle.refresh();
  lifecycle.revoke("SIMULATED");
  assert.equal(lifecycle.snapshot.state, "revoked");
  assert.equal(lifecycle.snapshot.last, void 0);
  assert.equal(lifecycle.snapshot.pending, void 0);
  assert.equal(lifecycle.succeed(pending, capture("late")), false);
  assert.throws(() => lifecycle.refresh(), /SESSION_CLOSED/);
});
test("disposal is terminal, including deferred rejection and revocation", () => {
  const lifecycle = new PreviewLifecycle(identity), pending = lifecycle.refresh();
  lifecycle.dispose();
  lifecycle.revoke("late");
  lifecycle.invalidate("late");
  assert.equal(lifecycle.snapshot.state, "disposed");
  assert.equal(lifecycle.fail(pending, "late"), false);
  assert.equal(lifecycle.succeed(pending, capture("late")), false);
  assert.throws(() => lifecycle.refresh(), /SESSION_CLOSED/);
});
test("initial failures are unavailable; explicit refresh alone recovers", () => {
  const lifecycle = new PreviewLifecycle(identity);
  lifecycle.fail(lifecycle.refresh(), "UNSUPPORTED");
  assert.equal(lifecycle.snapshot.state, "unavailable");
  lifecycle.succeed(lifecycle.refresh(), capture("recovered"));
  assert.equal(lifecycle.snapshot.state, "ready");
});
test("samples are bounded data with exact fields and native supported values", () => {
  const sample = defaultSample(), copy = validateSample(sample);
  copy.heading = "changed";
  assert.notEqual(sample.heading, copy.heading);
  for (const variant of ["outlined", "elevated", "flat"]) assert.equal(validateSample({ ...sample, variant }).variant, variant);
  for (const change of [{ functions: {} }, { href: "https://invalid.test" }, { body: "<script>" }, { heading: "x".repeat(513) }, { variant: "unknown" }, { fixture: "different" }, { selectable: "true" }, { mode: "edit" }, { regions: {} }, { route: {} }, { dataset: {} }]) assert.throws(() => validateSample({ ...sample, ...change }));
  let invoked = false;
  const accessor = { ...sample };
  Object.defineProperty(accessor, "heading", { get() {
    invoked = true;
    return "";
  } });
  assert.throws(() => validateSample(accessor));
  assert.equal(invoked, false);
  assert.throws(() => validateSample(Object.assign(/* @__PURE__ */ Object.create({ inherited: true }), sample)));
});
test("service/resource and unsupported schema requests have specific denial reasons", () => {
  for (const capability of ["Dataset", "Workflow", "Trigger", "service", "storage", "Publish", "resource", "upload", "download", "navigation", "mutation"]) assert.throws(() => denyCapability(capability), new RegExp(`FIXTURE_CAPABILITY_DENIED:${capability}`));
  for (const reason of Object.values(unsupportedFixtures)) assert.match(reason, /^[A-Z_]+:/);
});
test("protocol rejects cross-session, wrong nonce/identity, sequence, upgrade and extra capabilities", () => {
  const channel = { nonce: "synthetic-nonce", session: "synthetic-session", identity: identityKey(identity), sequence: 1 };
  assert(validChannel({ ...channel, type: "render", sample: defaultSample() }, channel));
  for (const change of [{ nonce: "replay" }, { session: "other" }, { identity: "other" }, { sequence: 2 }, { sequence: 0 }, { type: "Publish" }, { capability: "save" }, { sample: defaultSample() }]) assert.equal(validChannel({ ...channel, type: "ready", ...change }, channel), false);
});
test("in-memory WP2 dirty bytes, identity and Undo/Redo history survive preview lifecycle", async () => {
  configureAutosave({ enabled: false, delayMs: 2e3 });
  let saves = 0;
  const draft = new EditingLifecycle({ identity: "original-working-copy", source: "saved" }, async (value) => {
    saves++;
    return value;
  });
  draft.edit({ identity: "original-working-copy", source: "dirty one" });
  draft.edit({ identity: "original-working-copy", source: "dirty two" });
  draft.undo();
  const snapshot = () => ({ current: draft.current, baseline: draft.baseline, generation: draft.generation, savedGeneration: draft.savedGeneration, history: draft.historySize, dirty: draft.dirty, canUndo: draft.canUndo, canRedo: draft.canRedo });
  const before = structuredClone(snapshot());
  const lifecycle = new PreviewLifecycle(identity);
  lifecycle.succeed(lifecycle.refresh(), capture("one"));
  lifecycle.invalidate("changed");
  lifecycle.fail(lifecycle.refresh(), "denied");
  lifecycle.revoke("SIMULATED");
  lifecycle.dispose();
  assert.deepEqual(snapshot(), before);
  assert.equal(saves, 0);
  draft.redo();
  assert.equal(draft.current.source, "dirty two");
  draft.undo();
  assert.equal(draft.current.source, "dirty one");
  await draft.dispose();
  configureAutosave({ enabled: true, delayMs: 2e3 });
});
