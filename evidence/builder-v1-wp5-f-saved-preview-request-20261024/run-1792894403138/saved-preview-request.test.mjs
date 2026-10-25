// tests/preview-contract-model/saved-preview-request.test.ts
import test from "node:test";
import assert from "node:assert/strict";

// src/shared/builder-workspace.ts
function workspaceIdentityKey(identity) {
  if (!identity || !identity.owner || !["application", "platform", "package"].includes(identity.owner.kind) || !identity.owner.id || !["visual", "generic", "composition", "automation", "package", "legacy"].includes(identity.format) || !!identity.id === !!identity.repairLocator) throw new Error("WORKSPACE_IDENTITY_INVALID");
  return JSON.stringify([
    identity.owner.kind,
    identity.owner.id,
    identity.owner.revision ?? null,
    identity.format,
    identity.id ? ["permanent", identity.id] : ["repair-only", identity.repairLocator]
  ]);
}

// src/shared/saved-preview-request.ts
var SavedPreviewRequestError = class extends Error {
  constructor() {
    super("SAVED_PREVIEW_REQUEST_INVALID");
  }
};
function invalid() {
  throw new SavedPreviewRequestError();
}
function fields(v, required, optional = []) {
  if (!v || typeof v !== "object" || Array.isArray(v) || ![Object.prototype, null].includes(Object.getPrototypeOf(v))) invalid();
  const d = Object.getOwnPropertyDescriptors(v);
  if (Reflect.ownKeys(v).some((k) => typeof k !== "string") || Object.entries(d).some(([k, p]) => !p.enumerable || !("value" in p) || ![...required, ...optional].includes(k)) || required.some((k) => !Object.hasOwn(d, k))) invalid();
}
var text = (v) => typeof v === "string" && v.length > 0;
function parseSavedPreviewSelection(value) {
  fields(value, ["subjectId", "sessionRevision", "applicationId", "applicationKey", "identity", "kind", "dirty"], ["sourceNode"]);
  for (const k of ["subjectId", "sessionRevision", "applicationId", "applicationKey", "kind"]) if (!text(value[k])) invalid();
  if (typeof value.dirty !== "boolean") invalid();
  fields(value.identity, ["owner", "format"], ["id", "repairLocator"]);
  const identity = value.identity;
  fields(identity.owner, ["kind", "id"], ["revision"]);
  const owner = identity.owner;
  if (!["application", "platform", "package"].includes(String(owner.kind)) || !text(owner.id) || owner.revision !== void 0 && !text(owner.revision)) invalid();
  if (!["visual", "generic", "composition", "automation", "package", "legacy"].includes(String(identity.format))) invalid();
  if (!!identity.id === !!identity.repairLocator || identity.id !== void 0 && !text(identity.id) || identity.repairLocator !== void 0 && !text(identity.repairLocator)) invalid();
  if (owner.kind === "application" && owner.id !== value.applicationId) invalid();
  if (value.sourceNode !== void 0) {
    fields(value.sourceNode, ["nodeId", "savedRevision"]);
    if (!text(value.sourceNode.nodeId) || !text(value.sourceNode.savedRevision)) invalid();
  }
  const result = JSON.parse(JSON.stringify(value));
  workspaceIdentityKey(result.identity);
  return result;
}
function parseSavedPreviewRequest(value) {
  fields(value, ["schema", "generation", "trigger", "selection"]);
  if (value.schema !== "saved-preview-request-v1" || value.trigger !== "explicit-check" || !Number.isSafeInteger(value.generation) || Number(value.generation) < 0) invalid();
  return { schema: "saved-preview-request-v1", generation: value.generation, trigger: "explicit-check", selection: value.selection === null ? null : parseSavedPreviewSelection(value.selection) };
}
function savedPreviewSelectionKey(s) {
  return JSON.stringify([s.subjectId, s.sessionRevision, s.applicationId, s.applicationKey, workspaceIdentityKey(s.identity), s.kind, s.sourceNode?.nodeId ?? null, s.sourceNode?.savedRevision ?? null]);
}
function productionSavedPreviewUnavailable(request2) {
  const s = parseSavedPreviewRequest(request2).selection;
  const code = !s ? "NO_SELECTION" : s.identity.repairLocator ? "REPAIR_ONLY_IDENTITY" : s.identity.owner.kind === "package" || s.identity.format === "package" ? "PACKAGE_DEFINITION_ONLY" : s.identity.format !== "visual" || !["page", "shell", "component", "form"].includes(s.kind) ? "UNSUPPORTED_ARTIFACT" : !s.sourceNode ? "SAVED_NODE_UNRESOLVED" : "PROVIDER_NOT_QUALIFIED";
  return { kind: "unavailable", code };
}

// src/client/builder-workspace/saved-preview-request.ts
var copy = (v) => JSON.parse(JSON.stringify(v));
var SavedPreviewRequestController = class {
  value = { state: "idle", generation: 0, reason: "Select an artifact to check local readiness.", selection: null, request: null, outcome: null };
  listeners = /* @__PURE__ */ new Set();
  completion;
  unresolvedIdentity = false;
  constructor(completion = () => Promise.resolve()) {
    this.completion = completion;
  }
  get snapshot() {
    return copy(this.value);
  }
  subscribe(listener) {
    if (this.value.state === "disposed") return () => {
    };
    this.listeners.add(listener);
    listener(this.snapshot);
    return () => {
      this.listeners.delete(listener);
    };
  }
  emit() {
    for (const listener of this.listeners) listener(this.snapshot);
  }
  cancel(state, reason, clearSelection = false) {
    this.value = { ...this.value, state, generation: this.value.generation + 1, reason, request: null, outcome: null, ...clearSelection ? { selection: null } : {} };
    this.emit();
  }
  select(input) {
    if (this.value.state === "disposed") return;
    let selected = null;
    try {
      if (input !== void 0 && input !== null) selected = parseSavedPreviewSelection(input);
    } catch {
      this.unresolvedIdentity = true;
      this.cancel("unavailable", "Invalid original identity.", true);
      this.value.outcome = { kind: "unavailable", code: "UNRESOLVED_IDENTITY" };
      this.emit();
      return;
    }
    this.unresolvedIdentity = false;
    const changed = (selected ? savedPreviewSelectionKey(selected) : null) !== (this.value.selection ? savedPreviewSelectionKey(this.value.selection) : null);
    if (changed) {
      this.value.selection = selected;
      this.cancel("idle", "Original selection changed; explicit check required.");
    } else {
      this.value.selection = selected;
      if (selected && ["parked", "suspended"].includes(this.value.state)) this.cancel("idle", "Selection restored; explicit check required.");
      else this.emit();
    }
  }
  async check() {
    if (["disposed", "parked", "suspended"].includes(this.value.state)) return;
    const generation = this.value.generation + 1;
    const unresolvedIdentity = this.unresolvedIdentity;
    const request2 = { schema: "saved-preview-request-v1", generation, trigger: "explicit-check", selection: this.value.selection ? copy(this.value.selection) : null };
    this.value = { ...this.value, state: "pending", generation, reason: "Checking local prerequisites only; no source acquisition.", request: request2, outcome: null };
    this.emit();
    try {
      await this.completion();
    } catch {
    }
    if (this.value.generation !== generation || this.value.state !== "pending") return;
    const outcome = unresolvedIdentity ? { kind: "unavailable", code: "UNRESOLVED_IDENTITY" } : productionSavedPreviewUnavailable(request2);
    this.value = { ...this.value, state: "unavailable", reason: "Readiness is not authorization or available rendering.", outcome };
    this.emit();
    return copy(outcome);
  }
  sourceChanged(reason = "Saved source changed; explicit check required.") {
    if (this.value.state !== "disposed") this.cancel(this.value.state === "parked" ? "parked" : this.value.state === "suspended" ? "suspended" : "idle", reason);
  }
  park() {
    if (this.value.state !== "disposed") this.cancel("parked", "Workspace parked.", true);
  }
  resume() {
    if (this.value.state === "parked") this.cancel("idle", "Workspace mounted; explicit check required.");
  }
  suspend(reason = "Session or owner changed.") {
    if (this.value.state !== "disposed") this.cancel("suspended", reason, true);
  }
  dispose() {
    if (this.value.state !== "disposed") {
      this.cancel("disposed", "Saved readiness disposed.", true);
      this.listeners.clear();
    }
  }
};

// tests/preview-contract-model/saved-preview-request.test.ts
var selection = () => ({ subjectId: "alice", sessionRevision: "session-1", applicationId: "app-permanent", applicationKey: "app-key", identity: { owner: { kind: "application", id: "app-permanent" }, format: "visual", id: "page-one" }, kind: "page", dirty: false });
var request = (s) => ({ schema: "saved-preview-request-v1", generation: 1, trigger: "explicit-check", selection: s });
function deferred() {
  let release;
  const promise = new Promise((r) => {
    release = r;
  });
  return { promise, release };
}
for (const [name, make, code] of [
  ["no artifact", () => null, "NO_SELECTION"],
  ["repair only", () => {
    const s = selection();
    s.identity = { owner: s.identity.owner, format: "visual", repairLocator: "repair-only" };
    return s;
  }, "REPAIR_ONLY_IDENTITY"],
  ["package definition", () => {
    const s = selection();
    s.identity = { owner: { kind: "package", id: "@ui-base/ui", revision: "0.5.1" }, format: "package", id: "canonical-card" };
    s.kind = "package";
    return s;
  }, "PACKAGE_DEFINITION_ONLY"],
  ["unresolved saved node", selection, "SAVED_NODE_UNRESOLVED"],
  ["unsupported artifact", () => ({ ...selection(), kind: "dataset", identity: { ...selection().identity, format: "generic" } }), "UNSUPPORTED_ARTIFACT"],
  ["unqualified production provider", () => ({ ...selection(), sourceNode: { nodeId: "explicit-authored-node", savedRevision: "saved-1" } }), "PROVIDER_NOT_QUALIFIED"]
]) test("explicit unavailable outcome: " + name, () => {
  assert.deepEqual(productionSavedPreviewUnavailable(request(make())), { kind: "unavailable", code });
});
test("runtime contract rejects hidden capabilities, fields and inconsistent owner", () => {
  assert.throws(() => parseSavedPreviewRequest({ ...request(selection()), capture: { bytes: "forbidden" } }), SavedPreviewRequestError);
  assert.throws(() => parseSavedPreviewSelection({ ...selection(), identity: { ...selection().identity, owner: { kind: "application", id: "other-app" } } }), SavedPreviewRequestError);
  assert.throws(() => parseSavedPreviewRequest({ ...request(selection()), generation: NaN }), SavedPreviewRequestError);
  assert.throws(() => parseSavedPreviewSelection({ ...selection(), sourceNode: { nodeId: "x", savedRevision: "" } }), SavedPreviewRequestError);
});
test("accessors cannot supply or mutate identity during validation", () => {
  let invoked = false;
  const input = { ...selection() };
  Object.defineProperty(input, "subjectId", { enumerable: true, get() {
    invoked = true;
    return "alice";
  } });
  assert.throws(() => parseSavedPreviewSelection(input), SavedPreviewRequestError);
  assert.equal(invoked, false);
});
test("parsed requests and snapshots are copies of original identity", async () => {
  const c = new SavedPreviewRequestController(), s = selection();
  c.select(s);
  s.identity.id = "retargeted";
  await c.check();
  assert.equal(c.snapshot.request.selection.identity.id, "page-one");
  const snapshot = c.snapshot;
  snapshot.selection.identity.id = "mutated";
  assert.equal(c.snapshot.selection.identity.id, "page-one");
  assert.equal(c.snapshot.outcome.kind, "unavailable");
});
test("invalid original identity has explicit unresolved unavailable state", async () => {
  const c = new SavedPreviewRequestController();
  c.select({ subjectId: "incomplete" });
  assert.equal(c.snapshot.outcome.code, "UNRESOLVED_IDENTITY");
  assert.equal(c.snapshot.selection, null);
  assert.equal((await c.check()).code, "UNRESOLVED_IDENTITY");
});
test("dirty-only updates are informational and preserve pending generation", async () => {
  const d = deferred(), c = new SavedPreviewRequestController(() => d.promise);
  c.select(selection());
  const pending = c.check(), g = c.snapshot.generation;
  c.select({ ...selection(), dirty: true });
  assert.equal(c.snapshot.generation, g);
  assert.equal(c.snapshot.state, "pending");
  d.release();
  await pending;
  assert.equal(c.snapshot.selection.dirty, true);
  assert.equal(c.snapshot.outcome.kind, "unavailable");
});
for (const field of ["subject", "session", "Application", "owner", "artifact", "source-node"]) test(field + " change cancels obsolete check", async () => {
  const d = deferred(), c = new SavedPreviewRequestController(() => d.promise);
  c.select(selection());
  const pending = c.check(), s = selection();
  if (field === "subject") s.subjectId = "bob";
  if (field === "session") s.sessionRevision = "session-2";
  if (field === "Application") {
    s.applicationId = "other-app";
    s.applicationKey = "other-key";
    s.identity.owner.id = "other-app";
  }
  if (field === "owner") s.identity.owner = { kind: "platform", id: "platform-authority" };
  if (field === "artifact") s.identity.id = "page-two";
  if (field === "source-node") s.sourceNode = { nodeId: "explicit-node", savedRevision: "saved-1" };
  c.select(s);
  d.release();
  assert.equal(await pending, void 0);
  assert.equal(c.snapshot.outcome, null);
  assert.equal(c.snapshot.state, "idle");
  assert.deepEqual(c.snapshot.selection, s);
});
for (const operation of ["sourceChanged", "park", "suspend", "dispose"]) test(operation + " cancels pending and cannot be undone by completion", async () => {
  const d = deferred(), c = new SavedPreviewRequestController(() => d.promise);
  c.select(selection());
  const pending = c.check();
  c[operation]();
  const after = c.snapshot;
  d.release();
  assert.equal(await pending, void 0);
  assert.deepEqual(c.snapshot, after);
});
test("later explicit check supersedes prior completion without restoring prior request", async () => {
  const first = deferred(), second = deferred();
  let calls = 0;
  const c = new SavedPreviewRequestController(() => ++calls === 1 ? first.promise : second.promise);
  c.select(selection());
  const a = c.check(), b = c.check();
  first.release();
  assert.equal(await a, void 0);
  assert.equal(c.snapshot.state, "pending");
  second.release();
  await b;
  assert.equal(c.snapshot.state, "unavailable");
  assert.equal(c.snapshot.request.generation, c.snapshot.generation);
  assert.equal(calls, 2);
});
test("park/resume, suspend/reselection and terminal disposal have no automatic check", async () => {
  let calls = 0;
  const c = new SavedPreviewRequestController(async () => {
    calls++;
  });
  c.select(selection());
  c.park();
  await c.check();
  assert.equal(calls, 0);
  c.resume();
  assert.equal(c.snapshot.selection, null);
  c.select(selection());
  assert.equal(calls, 0);
  await c.check();
  assert.equal(calls, 1);
  c.suspend();
  await c.check();
  assert.equal(calls, 1);
  c.select(selection());
  assert.equal(c.snapshot.outcome, null);
  c.dispose();
  c.select(selection());
  c.resume();
  await c.check();
  assert.equal(c.snapshot.state, "disposed");
  assert.equal(calls, 1);
});
test("completion failure stays permanently unavailable without retry or grant", async () => {
  let calls = 0;
  const c = new SavedPreviewRequestController(async () => {
    calls++;
    throw Error("authored completion failed");
  });
  c.select({ ...selection(), sourceNode: { nodeId: "node", savedRevision: "rev" } });
  assert.deepEqual(await c.check(), { kind: "unavailable", code: "PROVIDER_NOT_QUALIFIED" });
  assert.equal(calls, 1);
  assert.deepEqual(Object.keys(c.snapshot.outcome).sort(), ["code", "kind"]);
});
test("subscription cleanup on disposal makes later operations inert", () => {
  const c = new SavedPreviewRequestController();
  let notifications = 0;
  c.subscribe(() => notifications++);
  c.dispose();
  const count = notifications;
  c.select(selection());
  c.sourceChanged();
  c.park();
  c.suspend();
  c.dispose();
  assert.equal(notifications, count);
});
