// tests/fixture-preview/builder-editing.test.ts
import { test } from "node:test";
import assert from "node:assert/strict";

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
    const candidate = structuredClone(this.current), baseline = structuredClone(this.baseline), generation2 = this.generation;
    this.state = "saving";
    this.failure = void 0;
    this.emit();
    this.inFlight = (async () => {
      try {
        const saved = await this.save(candidate, baseline);
        this.baseline = structuredClone(saved);
        this.savedGeneration = generation2;
        this.uncertain = false;
        if (this.generation === generation2) this.current = structuredClone(saved);
        if (this.state !== "conflict") this.state = this.dirty ? "pending" : "saved";
      } catch (error) {
        const failure = error;
        if (this.state !== "conflict") {
          const invalid = failure.status === 422 || failure.validation?.valid === false;
          if (invalid && this.generation !== generation2) {
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
    if (this.generation !== generation2 || !this.failure) this.schedule();
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
function protectEditingDraft(needsWarning, host = window) {
  const handler = (event) => {
    if (needsWarning()) {
      event.preventDefault();
      event.returnValue = "";
    }
  };
  host.addEventListener("beforeunload", handler);
  return () => host.removeEventListener("beforeunload", handler);
}

// src/client/artifact-editor/working-copy.ts
var sourceEqual = (a, b) => a.manifestContent === b.manifestContent && JSON.stringify(a.files.map((f) => [f.path, f.content]).sort()) === JSON.stringify(b.files.map((f) => [f.path, f.content]).sort());
var EditorWorkingCopy = class {
  constructor(artifact2, transport) {
    this.transport = transport;
    this.lifecycle = new EditingLifecycle(artifact2, async (candidate, baseline) => {
      this.refreshSequence++;
      const files = /* @__PURE__ */ Object.create(null);
      for (const file of candidate.files) if (baseline.files.find((f) => f.path === file.path)?.content !== file.content) files[file.path] = file.content;
      for (const file of baseline.files) if (!candidate.files.some((f) => f.path === file.path)) files[file.path] = null;
      const changes = {
        expectedChecksum: baseline.checksum,
        mode: this.mode,
        files,
        ...candidate.manifestContent !== baseline.manifestContent ? { manifest: candidate.manifestContent } : {}
      };
      try {
        const result = await this.transport.save(candidate.locator, changes);
        if (!result.saved) throw new Error("The server did not save this artifact.");
        this.validation = void 0;
        const now = this.lifecycle.current;
        if (!sourceEqual(now, candidate)) {
          if (now.manifestContent === candidate.manifestContent) {
            now.manifestContent = result.artifact.manifestContent;
            now.manifest = structuredClone(result.artifact.manifest);
          }
          const paths = new Set([...candidate.files, ...result.artifact.files].map((f) => f.path));
          for (const filePath of paths) {
            const before = candidate.files.find((f) => f.path === filePath), current3 = now.files.find((f) => f.path === filePath), returned = result.artifact.files.find((f) => f.path === filePath);
            if (before?.content !== current3?.content) continue;
            now.files = now.files.filter((f) => f.path !== filePath);
            if (returned) now.files.push(structuredClone(returned));
          }
          now.checksum = result.artifact.checksum;
          now.capabilities = { ...result.artifact.capabilities };
        }
        return result.artifact;
      } catch (error) {
        const validation = error.validation;
        if (validation && sourceEqual(this.lifecycle.current, candidate)) this.validation = validation;
        throw error;
      }
    }, sourceEqual);
    this.unsubscribe = transport.subscribe?.(artifact2.locator, (event) => {
      void this.externalChange(event);
    });
    this.lifecycle.subscribe(() => {
      if (!this.lifecycle.inFlight && this.deferredEvent) {
        const event = this.deferredEvent;
        this.deferredEvent = void 0;
        void this.externalChange(event);
      }
    });
  }
  transport;
  lifecycle;
  unsubscribe;
  refreshSequence = 0;
  deferredEvent;
  validation;
  mode = "normal";
  get snapshot() {
    const c = this.lifecycle, artifact2 = structuredClone(c.current);
    artifact2.capabilities = { ...c.baseline.capabilities };
    artifact2.checksum = c.baseline.checksum;
    artifact2.validation = structuredClone(c.baseline.validation);
    artifact2.references = structuredClone(c.baseline.references);
    return { artifact: artifact2, baselineChecksum: c.baseline.checksum, localGeneration: c.generation, lastSavedGeneration: c.savedGeneration, saveState: c.state, error: c.failure, dirty: c.dirty, localValidation: this.validation ? structuredClone(this.validation) : void 0, canUndo: c.canUndo, canRedo: c.canRedo, notice: c.notice };
  }
  subscribe(listener) {
    return this.lifecycle.subscribe(listener);
  }
  setManifest(source, group) {
    const next = structuredClone(this.lifecycle.current);
    next.manifestContent = source;
    try {
      const parsed = JSON.parse(source);
      next.manifest = parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      next.manifest = null;
    }
    if (!next.manifest || next.manifest.artifactType !== next.presentation?.artifactType || next.manifest.definitionVersion !== next.presentation?.definitionVersion) next.presentation = void 0;
    this.validation = void 0;
    this.lifecycle.edit(next, group);
  }
  setFile(filePath, content, role, language, group) {
    const next = structuredClone(this.lifecycle.current), file = next.files.find((file2) => file2.path === filePath);
    if (content === null) next.files = next.files.filter((file2) => file2.path !== filePath);
    else if (file) file.content = content;
    else next.files.push({ path: filePath, role: role ?? filePath, language, content });
    this.validation = void 0;
    this.lifecycle.edit(next, group);
  }
  setFiles(changes, group) {
    const next = structuredClone(this.lifecycle.current);
    for (const [filePath, content] of Object.entries(changes)) {
      const file = next.files.find((f) => f.path === filePath);
      if (!file) throw new Error("Unknown authoritative file role.");
      file.content = content;
    }
    this.validation = void 0;
    this.lifecycle.edit(next, group);
  }
  undo() {
    this.validation = void 0;
    this.lifecycle.undo();
  }
  redo() {
    this.validation = void 0;
    this.lifecycle.redo();
  }
  async flush() {
    await this.lifecycle.flush();
    const event = this.deferredEvent;
    this.deferredEvent = void 0;
    if (event) await this.externalChange(event);
  }
  async repairSave() {
    if (this.lifecycle.inFlight) throw new Error("Wait for the admitted save before advanced source repair.");
    this.mode = "repair";
    const saving = this.flush();
    this.mode = "normal";
    await saving;
  }
  async externalChange(event) {
    const c = this.lifecycle;
    if (c.disposed || c.suspended) return;
    if (c.inFlight) {
      this.deferredEvent = event;
      return;
    }
    if (event.kind === "changed" && event.checksum === c.baseline.checksum) return;
    const sequence = ++this.refreshSequence, generation2 = c.generation, previousState = c.state, previousFailure = c.failure;
    if (c.dirty) c.conflict();
    try {
      const remote = event.kind === "removed" ? void 0 : await this.transport.load(c.current.locator);
      if (c.disposed || c.suspended || sequence !== this.refreshSequence) return;
      if (remote?.checksum === c.baseline.checksum) {
        c.state = previousState;
        c.failure = previousFailure;
        c.schedule();
        c.emit();
        return;
      }
      if (!remote || c.dirty || generation2 !== c.generation || c.inFlight) c.conflict();
      else c.reset(remote);
    } catch (error) {
      c.failure = error instanceof Error ? error.message : String(error);
      c.state = "error";
      c.emit();
    }
  }
  async reload() {
    const c = this.lifecycle;
    if (c.suspended) throw new Error("Working copy is suspended after an identity change.");
    if (c.inFlight) await c.inFlight;
    const generation2 = c.generation, remote = await this.transport.load(c.current.locator);
    if (generation2 !== c.generation) throw new Error("New edits arrived during reload.");
    this.validation = void 0;
    c.reset(remote);
  }
  async compare() {
    if (this.lifecycle.suspended) throw new Error("Working copy is suspended after an identity change.");
    return { local: structuredClone(this.lifecycle.current), remote: await this.transport.load(this.lifecycle.current.locator) };
  }
  resolve(remote, merged) {
    const c = this.lifecycle;
    if (c.suspended) throw new Error("Working copy is suspended after an identity change.");
    if (c.state !== "conflict" || remote.locator !== c.current.locator || merged.locator !== remote.locator) throw new Error("A matching conflict is required.");
    c.reset(remote, merged);
  }
  async close() {
    await this.flush();
    if (this.lifecycle.suspended || this.lifecycle.dirty || this.lifecycle.state === "conflict" || this.lifecycle.state === "error") return false;
    await this.discard();
    return true;
  }
  suspend() {
    this.lifecycle.suspend();
    this.unsubscribe?.();
    this.unsubscribe = void 0;
  }
  recover(transport, remote, resolution) {
    const c = this.lifecycle;
    if (!c.suspended || c.disposed) throw new Error("Only a suspended working copy can be recovered.");
    if (remote.locator !== c.current.locator) throw new Error("Recovery must load the same artifact.");
    const changed = remote.checksum !== c.baseline.checksum;
    if (changed && !resolution) throw new Error("The server copy changed. Choose reload or provide an explicit merge.");
    const local = resolution === "reload" ? remote : typeof resolution === "object" ? resolution.merged : c.current;
    if (local.locator !== remote.locator) throw new Error("A matching recovery artifact is required.");
    this.transport = transport;
    if (changed || resolution) c.reset(remote, local);
    else {
      c.confirmBaseline(remote);
      c.current.capabilities = { ...remote.capabilities };
      c.state = c.dirty ? "pending" : "saved";
      c.failure = void 0;
    }
    c.resume();
    this.unsubscribe = transport.subscribe?.(remote.locator, (event) => {
      void this.externalChange(event);
    });
  }
  async discard() {
    this.unsubscribe?.();
    this.unsubscribe = void 0;
    await this.lifecycle.dispose();
    return true;
  }
};
var EditorWorkingCopyHost = class {
  constructor(transport) {
    this.transport = transport;
  }
  transport;
  copies = /* @__PURE__ */ new Map();
  open(locator) {
    let copy = this.copies.get(locator);
    if (!copy) {
      copy = this.transport.load(locator).then((artifact2) => new EditorWorkingCopy(artifact2, this.transport)).catch((error) => {
        this.copies.delete(locator);
        throw error;
      });
      this.copies.set(locator, copy);
    }
    return copy;
  }
  async close(locator) {
    const copy = await this.copies.get(locator);
    if (copy && !await copy.close()) return false;
    this.copies.delete(locator);
    return true;
  }
  async discard(locator) {
    const promise = this.copies.get(locator);
    if (!promise) return true;
    const copy = await promise;
    await copy.discard();
    if (this.copies.get(locator) === promise) this.copies.delete(locator);
    return true;
  }
};
function protectPendingChanges(copy, host = window) {
  return protectEditingDraft(() => copy.snapshot.dirty || copy.snapshot.saveState === "conflict" || copy.snapshot.saveState === "error", host);
}

// src/shared/artifact-editor.ts
var EditorTransportError = class extends Error {
  constructor(status, message, code, validation) {
    super(message);
    this.status = status;
    this.code = code;
    this.validation = validation;
  }
  status;
  code;
  validation;
};

// src/client/artifact-editor/session.ts
var current2;
var generation = 0;
var loading;
var listeners2 = /* @__PURE__ */ new Set();
function notify() {
  for (const listener of listeners2) listener();
}
function editorSessionSnapshot() {
  return current2 ? structuredClone(current2) : void 0;
}
function subscribeEditorSession(listener) {
  listeners2.add(listener);
  return () => {
    listeners2.delete(listener);
  };
}
function invalidateEditorSession() {
  generation++;
  current2 = void 0;
  loading = void 0;
  notify();
}
async function decode(response) {
  const value = await response.json();
  if (!response.ok) throw new EditorTransportError(response.status, value.error, value.code);
  return value;
}
async function refreshEditorSession() {
  if (loading) return loading;
  const started = generation;
  const request = (async () => {
    const value = await decode(await fetch("/api/editor/session", { cache: "no-store", credentials: "same-origin" }));
    if (started !== generation) throw new EditorTransportError(403, "Editor identity changed.", "editor.session-changed");
    if (current2?.revision !== value.revision) generation++;
    current2 = value;
    notify();
    return structuredClone(value);
  })();
  loading = request;
  try {
    return await request;
  } finally {
    if (loading === request) loading = void 0;
  }
}
if (typeof window !== "undefined") window.addEventListener("storage", (event) => {
  if (event.key === "uib-editor-identity-change") {
    invalidateEditorSession();
    void refreshEditorSession().catch(() => {
    });
  }
});
function createEditorSessionBinding() {
  let revision;
  let boundGeneration;
  let revoked = false;
  function assert2() {
    if (revoked || boundGeneration !== void 0 && boundGeneration !== generation) throw new EditorTransportError(403, "Access changed. Local edits are retained; reopen under the current identity.", "editor.session-changed");
  }
  return {
    async headers() {
      assert2();
      const session = current2 ?? await refreshEditorSession();
      assert2();
      if (!session.principal) throw new EditorTransportError(401, "Select a development identity.", "editor.unauthorized");
      revision ??= session.revision;
      boundGeneration ??= generation;
      if (revision !== session.revision) {
        revoked = true;
        assert2();
      }
      return { "x-editor-revision": revision, "x-editor-csrf": session.csrfToken };
    },
    assert: assert2,
    revoke() {
      revoked = true;
    }
  };
}

// src/client/artifact-editor/saved-source.ts
var listeners3 = /* @__PURE__ */ new Set();
function sourceSaved(url) {
  if (true) return;
  const match = /^\/api\/apps\/([^/]+)\/(visual-|composition-source|settings|presentation|artifacts)/.exec(url);
  if (match || url.startsWith("/api/automation/")) for (const listener of listeners3) listener(match && !url.includes("/visual-components") ? decodeURIComponent(match[1]) : void 0);
}

// src/client/artifact-editor/transport.ts
function createArtifactEditorTransport(appKey) {
  const base = `/api/apps/${encodeURIComponent(appKey)}/artifacts`;
  const binding = createEditorSessionBinding();
  async function request(locator, suffix = "", changes) {
    const headers = await binding.headers();
    const response = await fetch(`${base}/${encodeURIComponent(locator)}${suffix}`, {
      credentials: "same-origin",
      headers: { ...headers, ...changes ? { "content-type": "application/json" } : {} },
      ...changes ? { method: "PUT", body: JSON.stringify(changes) } : {}
    });
    const value = await response.json();
    binding.assert();
    if (response.status === 401 || response.status === 403) {
      binding.revoke();
      invalidateEditorSession();
    }
    if (!response.ok) throw new EditorTransportError(response.status, value.error, value.code, value.validation);
    if (changes && !suffix && value.saved) sourceSaved(`${base}/${encodeURIComponent(locator)}`);
    return value;
  }
  return {
    load: (locator) => request(locator),
    save: (locator, changes) => request(locator, "", changes),
    validateSaved: (locator) => request(locator, "/validation"),
    getReferences: (locator) => request(locator, "/references"),
    subscribe(locator, listener) {
      const events = new EventSource(`/api/events?appKey=${encodeURIComponent(appKey)}`);
      const removeSessionListener = subscribeEditorSession(() => {
        try {
          binding.assert();
        } catch {
          events.close();
          removeSessionListener();
        }
      });
      events.addEventListener("artifact-change", (event) => {
        try {
          binding.assert();
        } catch {
          return;
        }
        const value = JSON.parse(event.data);
        if (value.appKey === appKey && value.locator === locator) listener(value);
      });
      events.addEventListener("open", () => {
        try {
          binding.assert();
          listener({ appKey, locator, kind: "changed" });
        } catch {
          events.close();
          removeSessionListener();
        }
      });
      events.addEventListener("error", () => {
        void refreshEditorSession().catch(() => {
          binding.revoke();
          invalidateEditorSession();
          events.close();
          removeSessionListener();
        });
      });
      return () => {
        removeSessionListener();
        events.close();
      };
    }
  };
}

// src/client/artifact-editor/recovery.ts
async function recoverSuspendedCopy(args) {
  const session = await refreshEditorSession();
  if (!session.principal || session.principal.subjectId !== args.originalSubjectId || session.fixtures.length !== 0 && !session.principal.applicationKeys.includes(args.applicationKey)) {
    throw new EditorTransportError(403, "Recovery is available only to the original identity with current application access.", "editor.recovery-forbidden");
  }
  const local = args.copy.snapshot;
  const remote = await args.transport.load(local.artifact.locator);
  if (remote.locator !== local.artifact.locator) throw new EditorTransportError(404, "The original artifact is no longer available.", "editor.not-found");
  const latest = editorSessionSnapshot();
  if (!latest?.principal || latest.revision !== session.revision || latest.principal.subjectId !== args.originalSubjectId) {
    throw new EditorTransportError(403, "Identity changed during recovery. Local changes remain suspended.", "editor.session-changed");
  }
  const changed = remote.checksum !== local.baselineChecksum;
  if (changed && !args.resolution) throw new EditorTransportError(409, "The artifact changed on the server. Review the comparison and choose reload or a merge.", "editor.recovery-conflict");
  args.copy.recover(args.transport, remote, args.resolution);
  return { remote, localChangesRemain: args.resolution !== "reload" };
}

// src/client/artifact-editor/context.ts
var EditorRuntimeContext = class {
  constructor(applicationKey, transportFactory = () => createArtifactEditorTransport(applicationKey), browserWindow = typeof window === "undefined" ? void 0 : window, applicationContext = () => applicationKey) {
    this.applicationKey = applicationKey;
    this.transportFactory = transportFactory;
    this.browserWindow = browserWindow;
    this.applicationContext = applicationContext;
    this.transport = transportFactory();
    this.host = new EditorWorkingCopyHost({
      load: (locator) => this.transport.load(locator),
      save: (locator, changes) => this.transport.save(locator, changes),
      validateSaved: (locator) => this.transport.validateSaved(locator),
      getReferences: (locator) => this.transport.getReferences(locator),
      subscribe: (locator, listener) => this.transport.subscribe?.(locator, listener) ?? (() => {
      })
    });
    this.detachSession = subscribeEditorSession(() => {
      const session = editorSessionSnapshot();
      if (this.copy && !this.locked && session && session.principal?.subjectId === this.owner && session.revision === this.revision) return;
      if (this.copy && (!session?.principal || session.revision !== this.revision || session.principal.subjectId !== this.owner)) {
        this.locked = true;
        this.comparison = void 0;
        this.copy.suspend();
      }
      this.emit();
    });
  }
  applicationKey;
  transportFactory;
  browserWindow;
  applicationContext;
  transport;
  host;
  copy;
  owner;
  revision;
  locked = false;
  busy = false;
  disposed = false;
  detachCopy;
  detachUnload;
  detachSession;
  listeners = /* @__PURE__ */ new Set();
  comparison;
  /** A revoked copy never exposes source, metadata, errors or comparisons to panels. */
  get snapshot() {
    return this.locked ? void 0 : this.copy?.snapshot;
  }
  get hasCopy() {
    return !!this.copy;
  }
  get suspended() {
    return this.locked;
  }
  get pending() {
    return this.busy;
  }
  get canEdit() {
    return !this.locked && !this.busy && !!this.copy?.snapshot.artifact.capabilities.edit;
  }
  get canRecover() {
    const principal = editorSessionSnapshot()?.principal;
    return this.locked && !!principal && principal.subjectId === this.owner && (editorSessionSnapshot()?.fixtures.length === 0 || principal.applicationKeys.includes(this.applicationContext()));
  }
  get reviewedComparison() {
    const session = editorSessionSnapshot();
    return this.comparison && session?.revision === this.comparison.revision && session.principal?.subjectId === this.owner ? structuredClone(this.comparison) : void 0;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
  refreshPresentation() {
    this.emit();
  }
  emit() {
    for (const listener of this.listeners) listener();
  }
  requireCopy(edit = false) {
    if (this.disposed || !this.copy || this.locked || edit && !this.copy.snapshot.artifact.capabilities.edit) throw new Error("This editor action is not authorized.");
    return this.copy;
  }
  async operation(action) {
    if (this.busy || this.disposed) throw new Error("An editor action is already in progress or the editor is closed.");
    this.busy = true;
    this.emit();
    try {
      return await action();
    } finally {
      this.busy = false;
      this.emit();
    }
  }
  setManifest(source, group) {
    if (this.busy) throw new Error("Wait for the current editor action.");
    this.requireCopy(true).setManifest(source, group);
  }
  setFile(path, content, role, language, group) {
    if (this.busy) throw new Error("Wait for the current editor action.");
    this.requireCopy(true).setFile(path, content, role, language, group);
  }
  undo() {
    this.requireCopy(true).undo();
  }
  setFiles(changes, group) {
    if (this.busy) throw new Error("Wait for the current editor action.");
    this.requireCopy(true).setFiles(changes, group);
  }
  redo() {
    this.requireCopy(true).redo();
  }
  release() {
    this.detachCopy?.();
    this.detachUnload?.();
    this.detachCopy = this.detachUnload = void 0;
    this.copy = void 0;
    this.comparison = void 0;
    this.locked = false;
    this.owner = this.revision = void 0;
  }
  async open(locator) {
    return this.operation(async () => {
      if (this.copy?.snapshot.artifact.locator === locator) return !this.locked;
      if (this.copy) {
        if (!await this.host.close(this.copy.snapshot.artifact.locator)) return false;
        this.release();
      }
      const session = await refreshEditorSession();
      if (!session.principal || session.fixtures.length !== 0 && !session.principal.applicationKeys.includes(this.applicationContext())) throw new Error("Select an identity with access to this application.");
      this.transport = this.transportFactory();
      const copy = await this.host.open(locator);
      if (editorSessionSnapshot()?.revision !== session.revision) {
        await this.host.discard(locator);
        throw new Error("Identity changed while opening the artifact.");
      }
      this.copy = copy;
      this.owner = session.principal.subjectId;
      this.revision = session.revision;
      this.detachCopy = copy.subscribe(() => {
        this.comparison = void 0;
        this.emit();
      });
      if (this.browserWindow) this.detachUnload = protectPendingChanges(copy, this.browserWindow);
      return true;
    });
  }
  flush() {
    return this.operation(async () => {
      await this.requireCopy(true).flush();
    });
  }
  /** Explicit service actions share pending/suspension state, without entering source history. */
  perform(action) {
    this.requireCopy();
    return this.operation(action);
  }
  repairSave() {
    return this.operation(async () => {
      await this.requireCopy(true).repairSave();
    });
  }
  suspend() {
    if (!this.copy) return;
    this.locked = true;
    this.comparison = void 0;
    this.copy.suspend();
    this.emit();
  }
  async settleAdmittedSave(copy) {
    if (copy.snapshot.saveState !== "saving") return;
    await new Promise((resolve) => {
      const detach = copy.subscribe(() => {
        if (copy.snapshot.saveState !== "saving") {
          detach();
          resolve();
        }
      });
    });
  }
  /** Comparison is a temporary decision view, never a second editable source store. */
  compare() {
    return this.operation(async () => {
      if (!this.copy) throw new Error("Open an artifact first.");
      await this.settleAdmittedSave(this.copy);
      const session = await refreshEditorSession();
      if (!session.principal || session.principal.subjectId !== this.owner || session.fixtures.length !== 0 && !session.principal.applicationKeys.includes(this.applicationContext())) throw new Error("Only the original authorized identity can review this copy.");
      const local = this.copy.snapshot;
      const remote = this.locked ? await this.transportFactory().load(local.artifact.locator) : (await this.requireCopy().compare()).remote;
      if (editorSessionSnapshot()?.revision !== session.revision) throw new Error("Identity changed during comparison.");
      this.comparison = { local: local.artifact, remote, generation: local.localGeneration, revision: session.revision };
      return this.reviewedComparison;
    });
  }
  /** Explicit choices; reload discards local edits, keep-local replaces remote source. */
  decide(choice) {
    return this.operation(async () => {
      const review = this.reviewedComparison, copy = this.copy;
      if (!review || !copy || review.generation !== copy.snapshot.localGeneration) throw new Error("Compare again before choosing a resolution.");
      if (choice !== "reload" && !review.remote.capabilities.edit) throw new Error("Current permission allows reading only. Reload or discard local changes.");
      if (choice === "resume" && review.remote.checksum !== copy.snapshot.baselineChecksum) throw new Error("Server source changed. Choose reload or keep local source explicitly.");
      const transport = this.transportFactory();
      const checked = { ...transport, load: async (locator) => {
        const remote = await transport.load(locator);
        if (choice !== "reload" && !remote.capabilities.edit) throw new Error("Current permission allows reading only. Reload or discard local changes.");
        if (remote.checksum !== review.remote.checksum) {
          this.comparison = void 0;
          throw new Error("Server source changed again. Compare again before choosing.");
        }
        return remote;
      } };
      if (this.locked) {
        await recoverSuspendedCopy({
          copy,
          originalSubjectId: this.owner,
          applicationKey: this.applicationContext(),
          transport: checked,
          resolution: choice === "reload" ? "reload" : choice === "keep-local" ? { merged: { ...review.local, capabilities: review.remote.capabilities } } : void 0
        });
        this.revision = editorSessionSnapshot().revision;
        this.locked = false;
      } else {
        this.requireCopy(choice !== "reload");
        const remote = await checked.load(review.remote.locator);
        if (choice === "reload") await copy.reload();
        else copy.resolve(remote, { ...review.local, capabilities: remote.capabilities });
      }
      this.comparison = void 0;
    });
  }
  close() {
    return this.operation(async () => {
      if (this.copy && !await this.host.close(this.copy.snapshot.artifact.locator)) return false;
      this.release();
      return true;
    });
  }
  discard() {
    return this.operation(async () => {
      if (this.copy) await this.host.discard(this.copy.snapshot.artifact.locator);
      this.release();
    });
  }
  async dispose() {
    if (this.disposed) return true;
    if (!await this.close()) return false;
    this.disposed = true;
    this.detachSession();
    this.listeners.clear();
    return true;
  }
};

// src/shared/builder-workspace.ts
function workspaceIdentityKey(identity2) {
  if (!identity2 || !identity2.owner || !["application", "platform", "package"].includes(identity2.owner.kind) || !identity2.owner.id || !["visual", "generic", "composition", "automation", "package", "legacy"].includes(identity2.format) || !!identity2.id === !!identity2.repairLocator) throw new Error("WORKSPACE_IDENTITY_INVALID");
  return JSON.stringify([
    identity2.owner.kind,
    identity2.owner.id,
    identity2.owner.revision ?? null,
    identity2.format,
    identity2.id ? ["permanent", identity2.id] : ["repair-only", identity2.repairLocator]
  ]);
}

// src/client/builder-workspace/coordinator.ts
var BuilderWorkspaceCoordinator = class {
  constructor(authorize, mount, subject) {
    this.authorize = authorize;
    this.mount = mount;
    this.subject = subject;
  }
  authorize;
  mount;
  subject;
  tabs = /* @__PURE__ */ new Map();
  focused;
  sequence = 0;
  disposed = false;
  requested;
  listeners = /* @__PURE__ */ new Set();
  opening = /* @__PURE__ */ new Map();
  captureLinkOrigin() {
    const tab = this.focused && this.tabs.get(this.focused), subject = this.subject();
    if (!tab || !subject || tab.suspended || tab.ownerSubject !== subject || !tab.artifact.editable) throw new Error("LINK_ORIGIN_UNAVAILABLE");
    return { key: tab.key, subject, applicationId: tab.artifact.applicationId, applicationKey: tab.artifact.applicationKey, editor: tab.editor };
  }
  assertLinkOrigin(origin) {
    const tab = this.tabs.get(origin.key);
    if (this.disposed || this.subject() !== origin.subject || !tab || tab.suspended || tab.ownerSubject !== origin.subject || tab.editor !== origin.editor || tab.artifact.applicationId !== origin.applicationId || tab.artifact.applicationKey !== origin.applicationKey) throw new Error("LINK_ORIGIN_STALE");
    return tab;
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
  deactivate() {
    if (this.focused) this.tabs.get(this.focused)?.editor.deactivate();
    this.focused = void 0;
  }
  async open(applicationKey, target) {
    if (this.disposed) return false;
    const sequence = ++this.sequence, subject = this.subject();
    this.deactivate();
    this.emit();
    let key;
    try {
      if (!subject) throw new Error("WORKSPACE_IDENTITY_REQUIRED");
      this.requested = workspaceIdentityKey(target.identity);
      const authorized = await this.authorize(applicationKey, target);
      key = workspaceIdentityKey(authorized.identity);
      if (key !== workspaceIdentityKey(target.identity)) throw new Error("WORKSPACE_IDENTITY_CHANGED");
      if (sequence !== this.sequence || this.subject() !== subject || this.disposed) return false;
      let tab = this.tabs.get(key);
      if (tab && tab.ownerSubject !== subject) throw new Error("Return to the original identity to recover this retained tab, or discard it.");
      if (!tab) {
        let pending = this.opening.get(key);
        if (!pending) {
          pending = { consumers: /* @__PURE__ */ new Set(), promise: this.mount(authorized).then((editor) => ({ key, artifact: authorized, editor, suspended: false, ownerSubject: subject })) };
          this.opening.set(key, pending);
        }
        pending.consumers.add(sequence);
        try {
          tab = await pending.promise;
          if (sequence !== this.sequence || this.subject() !== subject || this.disposed) return false;
          this.tabs.set(key, tab);
        } finally {
          pending.consumers.delete(sequence);
          if (!pending.consumers.size) {
            this.opening.delete(key);
            if (!this.tabs.has(key)) {
              const orphan = await pending.promise.catch(() => void 0);
              await orphan?.editor.dispose();
            }
          }
        }
      }
      await tab.editor.focus(authorized, target);
      if (sequence !== this.sequence || this.subject() !== subject || this.disposed) {
        if (this.focused !== key) tab.editor.deactivate();
        return false;
      }
      tab.artifact = authorized;
      tab.suspended = false;
      this.focused = key;
      this.emit();
      return true;
    } catch (error) {
      if (key && sequence === this.sequence) {
        const tab = this.tabs.get(key);
        if (tab) {
          tab.suspended = true;
          tab.editor.suspend();
        }
      }
      if (sequence === this.sequence) this.emit();
      throw error;
    }
  }
  park() {
    this.sequence++;
    this.deactivate();
    this.emit();
  }
  suspend() {
    this.sequence++;
    this.deactivate();
    for (const tab of this.tabs.values()) {
      tab.suspended = true;
      tab.editor.suspend();
    }
    this.emit();
  }
  async close(key, discard = false) {
    const tab = this.tabs.get(key);
    if (!tab) return true;
    if (!discard && !await tab.editor.guardClose()) return false;
    if (this.focused === key || this.requested === key) {
      this.sequence++;
      this.deactivate();
    }
    this.tabs.delete(key);
    try {
      await tab.editor.dispose();
    } finally {
      this.emit();
    }
    return true;
  }
  async dispose() {
    this.disposed = true;
    this.suspend();
    await Promise.allSettled([...this.tabs.keys()].map((key) => this.close(key, true)));
    this.listeners.clear();
  }
};

// src/client/builder-workspace/fixture-preview-binding.ts
function selectFixturePreview(panel, hints) {
  panel.select(hints ? { subjectId: hints.subjectId, sessionId: hints.sessionId, applicationId: hints.artifact.applicationId, artifactKey: workspaceIdentityKey(hints.artifact.identity) } : void 0, hints?.dirty ?? false);
}

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
  succeed(request, capture) {
    if (!this.matches(request) || identityKey(capture.identity) !== identityKey(this.value.identity) || !capture.captureId) return false;
    if (this.value.last?.captureId === capture.captureId && JSON.stringify(this.value.last.provenance) !== JSON.stringify(capture.provenance)) return false;
    this.value = { state: "ready", identity: this.value.identity, last: structuredClone(capture) };
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

// tests/fixture-preview/builder-editing.test.ts
function artifact(locator = "one") {
  const manifest = { artifactId: `synthetic-${locator}`, artifactType: "fixture", schemaVersion: 1, definitionVersion: 1, name: locator, files: { definition: "one.json" } };
  return { locator, manifest, manifestContent: JSON.stringify(manifest), files: [{ path: "one.json", role: "definition", content: '{"synthetic":1}' }, { path: "two.txt", role: "notes", content: "synthetic saved notes" }], checksum: "synthetic-baseline", capabilities: { edit: true, format: true }, validation: { valid: true, diagnostics: [] }, references: { outgoing: [] } };
}
var identity = { subjectId: "synthetic-subject", sessionId: "synthetic-session", applicationId: "synthetic-app-id", artifactKey: '["application","synthetic-app-id","generic","synthetic-one"]' };
var settle = async () => {
  for (let i = 0; i < 12; i++) await Promise.resolve();
};
async function fixture() {
  const originalFetch = globalThis.fetch, sessions = [], saves = [];
  invalidateEditorSession();
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/editor/session");
    assert.equal(init?.method ?? "GET", "GET");
    sessions.push(String(url));
    return Response.json({ revision: "synthetic-session", csrfToken: "synthetic-not-a-credential", principal: { subjectId: "synthetic-subject", label: "Synthetic", roleIds: [], applicationKeys: ["synthetic"], isDevelopmentFixture: true }, fixtures: [] });
  };
  const stored = new Map(["one", "two"].map((key) => [key, artifact(key)]));
  let release, hold = false;
  const transport = {
    load: async (key) => {
      assert(stored.has(key));
      return structuredClone(stored.get(key));
    },
    save: async (locator, changes) => {
      saves.push({ time: Date.now(), locator, changes: structuredClone(changes) });
      if (hold) await new Promise((resolve) => {
        release = resolve;
      });
      const next = structuredClone(stored.get(locator));
      assert.equal(changes.expectedChecksum, next.checksum);
      for (const file of next.files) if (changes.files && Object.hasOwn(changes.files, file.path)) file.content = changes.files[file.path];
      next.checksum += "-saved";
      stored.set(locator, next);
      return { saved: true, artifact: structuredClone(next), validation: next.validation };
    },
    validateSaved: async () => ({ valid: true, diagnostics: [] }),
    getReferences: async () => ({ outgoing: [] }),
    subscribe: () => () => {
    }
  };
  const contexts = [];
  const context = new EditorRuntimeContext("synthetic", () => transport, void 0);
  contexts.push(context);
  await context.open("one");
  return { context, transport, stored, saves, sessions, hold() {
    hold = true;
  }, release() {
    hold = false;
    release?.();
  }, async cleanup() {
    for (const item of contexts) {
      await item.discard();
      await item.dispose();
    }
    globalThis.fetch = originalFetch;
    invalidateEditorSession();
  } };
}
function previewOperations() {
  const preview = new PreviewLifecycle(identity);
  const request = preview.refresh();
  preview.succeed(request, { identity, captureId: "synthetic-capture", provenance: { kind: "fixture", fixtureId: "native-card-v1" }, content: "synthetic" });
  preview.invalidate("sample");
  preview.fail(preview.refresh(), "denied");
  preview.revoke("SIMULATED");
  preview.dispose();
}
test("actual context and working copy preserve source, baseline/checksum and history with autosave disabled", async (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 0 });
  configureAutosave({ enabled: false, delayMs: 2e3 });
  const f = await fixture();
  try {
    f.context.setFile("two.txt", "dirty synthetic one");
    f.context.setFile("two.txt", "dirty synthetic two");
    f.context.undo();
    const before = f.context.snapshot;
    const stored = structuredClone([...f.stored]);
    previewOperations();
    t.mock.timers.tick(1e4);
    await settle();
    assert.deepEqual(f.context.snapshot, before);
    assert.deepEqual([...f.stored], stored);
    assert.equal(f.saves.length, 0);
    f.context.redo();
    assert.equal(f.context.snapshot?.artifact.files[1].content, "dirty synthetic two");
    f.context.undo();
    assert.equal(f.context.snapshot?.artifact.files[1].content, "dirty synthetic one");
    const copy = new EditorWorkingCopy(artifact(), f.transport);
    copy.setFile("two.txt", "dirty direct");
    const direct = structuredClone({ current: copy.lifecycle.current, baseline: copy.lifecycle.baseline, history: copy.lifecycle.historySize });
    previewOperations();
    assert.deepEqual({ current: copy.lifecycle.current, baseline: copy.lifecycle.baseline, history: copy.lifecycle.historySize }, direct);
    await copy.discard();
  } finally {
    await f.cleanup();
    configureAutosave({ enabled: true, delayMs: 2e3 });
  }
});
test("real context autosave timing is identical with and without Preview and tab changes during a pending save", async (t) => {
  t.mock.timers.enable({ apis: ["Date", "setTimeout"], now: 0 });
  const traces = [];
  for (const withPreview of [false, true]) {
    const start = Date.now();
    configureAutosave({ enabled: true, delayMs: 2e3 });
    const f = await fixture();
    try {
      f.hold();
      f.context.setFile("two.txt", "synthetic timer edit");
      t.mock.timers.tick(1e3);
      if (withPreview) previewOperations();
      t.mock.timers.tick(999);
      await settle();
      assert.equal(f.saves.length, 0);
      t.mock.timers.tick(1);
      await settle();
      assert.equal(f.saves.length, 1);
      assert.equal(f.context.snapshot?.saveState, "saving");
      const artifact2 = { identity: { owner: { kind: "application", id: "synthetic-app-id" }, format: "generic", id: "synthetic-one" }, applicationId: "synthetic-app-id", applicationKey: "synthetic", locator: "one", name: "Synthetic", group: "Other", kind: "fixture", editable: true };
      const coordinator = new BuilderWorkspaceCoordinator(async (_app, target) => ({ ...artifact2, identity: target.identity }), async () => ({ element: {}, state: () => ({ dirty: !!f.context.snapshot?.dirty, pending: f.context.snapshot?.saveState === "saving" }), focus: async () => {
      }, deactivate: () => {
      }, suspend: () => {
      }, guardClose: async () => false, dispose: async () => {
      } }), () => "synthetic-subject");
      await coordinator.open("synthetic", { identity: artifact2.identity });
      coordinator.park();
      await coordinator.open("synthetic", { identity: artifact2.identity });
      if (withPreview) previewOperations();
      assert.equal(f.saves.length, 1);
      assert.equal(f.context.snapshot?.saveState, "saving");
      t.mock.timers.tick(500);
      f.release();
      await settle();
      traces.push({ saves: f.saves.map((event) => ({ ...event, time: event.time - start })), snapshot: f.context.snapshot, identity: workspaceIdentityKey(coordinator.tabs.values().next().value.artifact.identity) });
      assert.equal(f.context.snapshot?.dirty, false);
      await coordinator.dispose();
    } finally {
      f.release();
      await f.cleanup();
    }
  }
  assert.deepEqual(traces[1], traces[0]);
});
test("shared Preview binding transmits only original owner-qualified identity and dirty status", () => {
  const artifact2 = { identity: { owner: { kind: "application", id: "synthetic-owner" }, format: "generic", id: "synthetic-artifact" }, applicationId: "permanent-application", applicationKey: "mutable-key", locator: "synthetic", name: "Synthetic", kind: "fixture", group: "Other", editable: true };
  const calls = [];
  const sink = { select: (...values) => {
    calls.push(values);
  } };
  selectFixturePreview(sink, { artifact: artifact2, subjectId: "original", sessionId: "session", dirty: true });
  assert.deepEqual(calls[0], [{ subjectId: "original", sessionId: "session", applicationId: "permanent-application", artifactKey: workspaceIdentityKey(artifact2.identity) }, true]);
  assert(!JSON.stringify(calls).includes("mutable-key"));
  selectFixturePreview(sink);
  assert.deepEqual(calls[1], [void 0, false]);
});
