// tests/d6-p3/presentation.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import * as fs2 from "node:fs/promises";
import path9 from "node:path";
import { createHash as createHash4 } from "node:crypto";
import { setTimeout as delay3 } from "node:timers/promises";

// src/server/presentation-publications.ts
import path7 from "node:path";
import { randomUUID as randomUUID3 } from "node:crypto";

// tests/d6-r1/fs-guard.ts
import * as fs from "node:fs/promises";
import path from "node:path";
var events = [];
var root = "";
var fault;
function configure(directory, inject2) {
  root = path.resolve(directory);
  fault = inject2;
  events.length = 0;
}
function inject(value) {
  fault = value;
}
function check(op, file) {
  const target = path.resolve(String(file));
  const inside = target === root || target.startsWith(root + path.sep);
  const ancestor = op === "lstat" && (root === target || root.startsWith(target.endsWith(path.sep) ? target : target + path.sep));
  if (!root || !inside && !ancestor) throw new Error("OUTSIDE_DISPOSABLE_FIXTURE: " + op);
  events.push({ op, file: target });
  fault?.(op, target);
}
var lstat2 = async (file) => {
  check("lstat", file);
  return fs.lstat(file);
};
var realpath2 = async (file) => {
  check("realpath", file);
  return fs.realpath(file);
};
var readFile2 = async (file, ...args) => {
  check("readFile", file);
  return fs.readFile(file, ...args);
};
var readdir2 = async (file, ...args) => {
  check("readdir", file);
  return fs.readdir(file, ...args);
};
var mkdir2 = async (file, ...args) => {
  check("mkdir", file);
  return fs.mkdir(file, ...args);
};
var rm2 = async (file, ...args) => {
  check("rm", file);
  return fs.rm(file, ...args);
};
var chmod2 = async (file, ...args) => {
  check("chmod", file);
  return fs.chmod(file, ...args);
};
var rename2 = async (from, to) => {
  check("rename", from);
  check("rename", to);
  return fs.rename(from, to);
};
var open2 = async (file, ...args) => {
  check("open:" + args[0], file);
  const handle = await fs.open(file, ...args);
  return {
    writeFile: async (...values) => {
      check("handle.writeFile", file);
      return handle.writeFile(...values);
    },
    sync: async () => {
      check("handle.sync", file);
      return handle.sync();
    },
    close: async () => {
      check("handle.close", file);
      await handle.close();
      check("handle.closed", file);
    }
  };
};

// packages/artifacts/src/file-operations.ts
import path2 from "node:path";
import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
async function retryWindowsFileOperation(operation) {
  const waits = [25, 50, 100, 200, 400];
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (process.platform !== "win32" || !["EPERM", "EACCES", "EBUSY"].includes(
        error.code ?? ""
      ) || attempt >= waits.length)
        throw error;
      await delay(waits[attempt]);
    }
  }
}
async function atomicWriteText(file, content) {
  await mkdir2(path2.dirname(file), { recursive: true });
  const temporary = `${file}.${randomUUID()}.tmp`;
  const handle = await open2(temporary, "wx");
  try {
    try {
      await handle.writeFile(content, "utf8");
      await handle.sync();
    } finally {
      await handle.close();
    }
    await retryWindowsFileOperation(() => rename2(temporary, file));
  } finally {
    await retryWindowsFileOperation(() => rm2(temporary, { force: true }));
  }
}

// packages/artifacts/src/role-bundle.ts
import path5 from "node:path";
import { appendFileSync } from "node:fs";

// packages/artifacts/src/bundle.ts
import path3 from "node:path";
import { createHash } from "node:crypto";
var isObject = (value) => !!value && typeof value === "object" && !Array.isArray(value);
function validRelativePath(name) {
  return !!name && !name.includes("\\") && !name.includes(":") && !path3.posix.isAbsolute(name) && name.split("/").every(
    (part) => !!part && part !== "." && part !== ".." && !part.endsWith(".") && !part.endsWith(" ") && !/[<>"|?*\x00-\x1f]/.test(part) && !/^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)
  ) && !name.split("/").some((part) => [".uib", ".git"].includes(part.toLowerCase()));
}
async function safeFile(bundle, name) {
  if (!validRelativePath(name))
    throw new Error(`Unsafe artifact path: ${name}`);
  const root2 = await realpath2(bundle);
  const parts = name.split("/");
  let current = root2;
  for (const part of parts) {
    current = path3.join(current, part);
    try {
      if ((await lstat2(current)).isSymbolicLink())
        throw new Error(`Symbolic links are not supported: ${name}`);
    } catch (e) {
      if (e.code !== "ENOENT") throw e;
    }
    if (current !== path3.join(root2, ...parts) && await readOptional(path3.join(current, "artifact.json")) !== null)
      throw new Error(`File belongs to a nested artifact bundle: ${name}`);
  }
  return current;
}
async function readOptional(file) {
  try {
    return await readFile2(file, "utf8");
  } catch (e) {
    if (e.code === "ENOENT") return null;
    throw e;
  }
}
function declaredPaths(content) {
  try {
    const value = JSON.parse(content ?? "null");
    return isObject(value) && isObject(value.files) ? Object.values(value.files).filter(
      (v) => typeof v === "string" && validRelativePath(v) && v.toLowerCase() !== "artifact.json"
    ) : [];
  } catch {
    return [];
  }
}
async function capture(bundle, extra = [], options = {}) {
  const manifest = options.includeManifest === false ? null : await readOptional(await safeFile(bundle, "artifact.json"));
  const snapshot = /* @__PURE__ */ Object.create(null);
  if (options.includeManifest !== false) snapshot["artifact.json"] = manifest;
  for (const name of /* @__PURE__ */ new Set([...declaredPaths(manifest), ...extra]))
    snapshot[name] = await readOptional(await safeFile(bundle, name));
  return snapshot;
}
function checksum(snapshot) {
  return createHash("sha256").update(
    JSON.stringify(
      Object.entries(snapshot).sort(([a], [b]) => a.localeCompare(b))
    )
  ).digest("hex");
}

// packages/artifacts/src/storage.ts
import path4 from "node:path";
import { createHash as createHash2, randomUUID as randomUUID2 } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { setTimeout as delay2 } from "node:timers/promises";
var storageKey = (id) => createHash2("sha256").update(id).digest("hex");
async function storageDirectory(root2, ...segments) {
  let dir = root2;
  for (const segment of [".uib", ...segments]) {
    dir = path4.join(dir, segment);
    await mkdir2(dir, { recursive: true });
    if ((await lstat2(dir)).isSymbolicLink())
      throw new Error(`Storage may not contain symbolic links: ${dir}`);
  }
  return dir;
}
async function writeSnapshot(bundle, snapshot, beforeWrite) {
  const entries = Object.entries(snapshot).sort(
    ([a], [b]) => a === "artifact.json" ? 1 : b === "artifact.json" ? -1 : a.localeCompare(b)
  );
  for (let index = 0; index < entries.length; index++) {
    const [name, content] = entries[index];
    await beforeWrite?.(name, index);
    const file = await safeFile(bundle, name);
    if (content === null)
      await retryWindowsFileOperation(() => rm2(file, { force: true }));
    else await atomicWriteText(file, content);
  }
}
var localLocks = /* @__PURE__ */ new Map();
var heldLocks = new AsyncLocalStorage();
var ArtifactBusyError = class extends Error {
  code = "source.busy";
  status = 503;
  constructor() {
    super("Artifact is locked by another writer.");
  }
};
var ArtifactOwnerUnresolvedError = class extends ArtifactBusyError {
  code = "source.owner-unresolved";
  constructor() {
    super();
    this.name = "ArtifactOwnerUnresolvedError";
    this.message = "Artifact lock ownership is unresolved; exclusive admission was not obtained.";
  }
};
var ArtifactAdmissionUnsafeError = class extends Error {
  code = "source.admission-unsafe";
  status = 503;
  constructor() {
    super("Safe artifact admission could not be established.");
  }
};
var LockCleanupFailure = class {
  constructor(outcome) {
    this.outcome = outcome;
  }
  outcome;
};
async function withArtifactLock(root2, bundle, run, identity = bundle, options = {}) {
  options = { ...options };
  if (options.recovery !== void 0 && options.recovery !== "refuse") throw new Error("Invalid artifact recovery mode.");
  const key = path4.join(root2, storageKey(identity));
  const held = (heldLocks.getStore() ?? []).filter((lock) => lock.active);
  if (held.some((lock) => lock.key === key) || identity === "visual-runtime-graph-v1" && held.length)
    throw new Error("Artifact lock order violation: nested or role-to-graph acquisition.");
  const started = performance.now();
  const budget = options.timeoutMs ?? 0;
  if (!Number.isFinite(budget) || budget < 0) throw new Error("Invalid artifact acquisition budget.");
  const remaining = () => Math.max(0, budget - (performance.now() - started));
  let acquiredAt;
  const check3 = () => options.signal?.throwIfAborted();
  check3();
  const predecessor = localLocks.get(key);
  const previous = predecessor ?? Promise.resolve();
  let release;
  const current = new Promise((resolve) => {
    release = resolve;
  });
  localLocks.set(key, current);
  let queued = true;
  try {
    const cancellation = new AbortController();
    const abort = () => cancellation.abort(options.signal?.reason);
    options.signal?.addEventListener("abort", abort, { once: true });
    const timer = budget > 0 ? setTimeout(() => cancellation.abort(new ArtifactBusyError()), remaining()) : void 0;
    try {
      await Promise.race([previous, new Promise((_, reject) => {
        cancellation.signal.addEventListener("abort", () => reject(cancellation.signal.reason), { once: true });
      })]);
    } finally {
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener("abort", abort);
    }
    queued = false;
    if (budget > 0 && remaining() <= 0) throw new ArtifactBusyError();
    if (predecessor && identity === "visual-runtime-graph-v1") {
      await delay2(Math.min(50, remaining()), void 0, { signal: options.signal });
    }
    let contention = new ArtifactBusyError();
    for (; ; ) {
      check3();
      if (budget > 0 && remaining() <= 0) throw contention;
      let entered = false;
      try {
        return await acquireArtifactLock(root2, bundle, async () => {
          check3();
          if (budget > 0 && remaining() <= 0) throw new ArtifactBusyError();
          entered = true;
          acquiredAt = performance.now();
          const scope = { key, active: true, graph: identity === "visual-runtime-graph-v1" };
          try {
            return await heldLocks.run([...held, scope], run);
          } finally {
            scope.active = false;
          }
        }, identity, options.recovery);
      } catch (error) {
        if (error instanceof LockCleanupFailure) throw error.outcome;
        if (entered) throw error;
        check3();
        if (!(error instanceof ArtifactBusyError) || remaining() <= 0) throw error;
        contention = error;
        try {
          await delay2(Math.min(25, remaining()), void 0, { signal: options.signal });
        } catch (waitingError) {
          check3();
          throw waitingError;
        }
      }
    }
  } finally {
    if (queued) void previous.then(release);
    else release();
    void current.then(() => {
      if (localLocks.get(key) === current) localLocks.delete(key);
    });
    try {
      options.observe?.({
        waitMs: (acquiredAt ?? performance.now()) - started,
        holdMs: acquiredAt === void 0 ? 0 : performance.now() - acquiredAt,
        acquired: acquiredAt !== void 0
      });
    } catch {
    }
  }
}
async function acquireArtifactLock(root2, bundle, run, identity, recoveryMode) {
  const directory = await storageDirectory(root2, "locks");
  const file = path4.join(directory, `${storageKey(identity)}.lock`);
  if (recoveryMode === "refuse") {
    for (const candidate of [file, file + ".recovery"]) {
      const stat2 = await lstat2(candidate).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      if (stat2 && (candidate !== file || stat2.isSymbolicLink() || !stat2.isFile())) throw new ArtifactAdmissionUnsafeError();
    }
  }
  let handle;
  let hasPrimary = false;
  let primary;
  let result;
  const cleanupFailures = [];
  const cleanup = async (owned, pathname, phase) => {
    try {
      await owned.close();
    } catch (error) {
      cleanupFailures.push({ phase: phase + ".close", error });
      return;
    }
    try {
      await rm2(pathname, { force: true });
    } catch (error) {
      cleanupFailures.push({ phase: phase + ".unlink", error });
    }
  };
  try {
    try {
      handle = await open2(file, "wx");
    } catch (e) {
      if (e.code !== "EEXIST") throw e;
      const ownerText = async () => {
        try {
          return await readFile2(file, "utf8");
        } catch (error) {
          if (error.code === "ENOENT") throw new ArtifactBusyError();
          throw error;
        }
      };
      const parseOwner = (text) => {
        const owner2 = Number(text);
        if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(owner2)) throw new ArtifactOwnerUnresolvedError();
        return owner2;
      };
      const owner = parseOwner(await ownerText());
      if (recoveryMode === "refuse") throw new ArtifactBusyError();
      try {
        process.kill(owner, 0);
      } catch (probe) {
        if (probe.code !== "ESRCH")
          throw new ArtifactBusyError();
        let recovery;
        try {
          recovery = await open2(file + ".recovery", "wx").catch((error) => {
            if (error.code === "EEXIST") throw new ArtifactBusyError();
            throw error;
          });
          if (parseOwner(await ownerText()) !== owner) throw new ArtifactBusyError();
          try {
            await rm2(file);
            handle = await open2(file, "wx");
          } catch (error) {
            if (["ENOENT", "EEXIST"].includes(error.code ?? "")) throw new ArtifactBusyError();
            throw error;
          }
        } finally {
          if (recovery) await cleanup(recovery, file + ".recovery", "guard");
        }
      }
      if (!handle) throw new ArtifactBusyError();
    }
    if (cleanupFailures.length === 0) {
      await handle.writeFile(String(process.pid));
      await handle.sync();
      result = await run();
    }
  } catch (error) {
    hasPrimary = true;
    primary = error;
  } finally {
    if (handle) await cleanup(handle, file, "main");
  }
  if (cleanupFailures.length) {
    const errors = [...hasPrimary ? [primary] : [], ...cleanupFailures.map((f) => f.error)];
    const outcome = errors.length === 1 ? errors[0] : new AggregateError(
      errors,
      (hasPrimary ? "Artifact operation failed; ownership cleanup failed: " : "Artifact ownership cleanup failed: ") + cleanupFailures.map((f) => f.phase).join(", ") + ".",
      { cause: hasPrimary ? primary : cleanupFailures[0].error }
    );
    throw new LockCleanupFailure(outcome);
  }
  if (hasPrimary) throw primary;
  return result;
}
async function recoverTransaction(root2, bundle, options = {}) {
  const directory = await storageDirectory(
    root2,
    "transactions",
    storageKey(options.identity ?? bundle)
  );
  const journal = path4.join(directory, "pending.json");
  let pending;
  try {
    pending = JSON.parse(await readFile2(journal, "utf8"));
  } catch (e) {
    if (e.code === "ENOENT") return false;
    throw e;
  }
  if (pending.bundle !== void 0 && pending.bundle !== bundle || pending.identity !== void 0 && pending.identity !== options.identity)
    throw new Error("Source journal location does not match its recovery lock.");
  options.validate?.(pending.original);
  await writeSnapshot(bundle, pending.original, options.beforeWrite);
  await rm2(journal);
  return true;
}

// packages/artifacts/src/role-bundle.ts
var RoleBundleRecoveryRequiredError = class extends Error {
  code = "source.recovery-required";
  constructor(cause) {
    super("Source recovery is required. Reads and writes are blocked until recovery succeeds.", { cause });
  }
};
async function canonical(location) {
  const directory = path5.resolve(location.directory), root2 = path5.resolve(location.root);
  const ancestors = /* @__PURE__ */ new Set();
  for (const target of [root2, directory]) for (let ancestor = target; ; ancestor = path5.dirname(ancestor)) {
    ancestors.add(ancestor);
    if (path5.dirname(ancestor) === ancestor) break;
  }
  await Promise.all([...ancestors].map(async (ancestor) => {
    if ((await lstat2(ancestor)).isSymbolicLink()) throw new Error("Source bundle roots cannot contain symlinks.");
  }));
  const [resolvedRoot, resolvedDirectory] = await Promise.all([realpath2(root2), realpath2(directory)]);
  const relative = path5.relative(resolvedRoot, resolvedDirectory);
  if (relative === ".." || relative.startsWith(".." + path5.sep) || path5.isAbsolute(relative)) throw new Error("Source bundle is outside its owner root.");
  const paths = [...location.paths];
  if (!paths.length || new Set(paths.map((name) => process.platform === "win32" ? name.toLowerCase() : name)).size !== paths.length || paths.some((name) => !validRelativePath(name)) || !paths.includes(location.anchor)) throw new Error("Unique safe role paths including the anchor are required.");
  await Promise.all(paths.map(async (name) => {
    const target = await safeFile(resolvedDirectory, name);
    const physical = await realpath2(target).catch((error) => {
      if (error.code === "ENOENT") return void 0;
      throw error;
    });
    if (physical && path5.relative(resolvedDirectory, physical).replaceAll(path5.sep, "/") !== name) throw new Error("Role paths must preserve the existing physical filename and casing.");
  }));
  const anchor = await safeFile(resolvedDirectory, location.anchor);
  const identity = await realpath2(anchor).catch((error) => {
    if (error.code === "ENOENT") return anchor;
    throw error;
  });
  return { root: resolvedRoot, directory: resolvedDirectory, paths, identity };
}
function validateSnapshot(snapshot, paths) {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot) || Object.keys(snapshot).length !== paths.length || paths.some((name) => !Object.hasOwn(snapshot, name) || snapshot[name] !== null && typeof snapshot[name] !== "string")) throw new Error("The source journal/candidate does not match the declared role bundle.");
}
var project = (files) => ({ files: structuredClone(files), checksum: checksum(files) });
async function locked(location, work, options = {}) {
  const resolved = await canonical(location);
  return withArtifactLock(resolved.root, resolved.directory, async () => {
    try {
      if (options.recovery === "refuse") await recoverRoleBundleRoot(resolved.root, options);
      else await recoverTransaction(resolved.root, resolved.directory, { identity: resolved.identity, validate: (files2) => validateSnapshot(files2, resolved.paths) });
    } catch (error) {
      options.signal?.throwIfAborted();
      if (error instanceof RoleBundleRecoveryRequiredError) throw error;
      throw new RoleBundleRecoveryRequiredError(options.recovery === "refuse" ? void 0 : error);
    }
    options.signal?.throwIfAborted();
    const files = await capture(resolved.directory, resolved.paths, { includeManifest: false });
    return work(resolved, files);
  }, resolved.identity, { timeoutMs: 5e3, ...options });
}
function readRoleBundle(location, options = {}) {
  return locked(location, async (_, files) => project(files), { ...options });
}
async function recoverRoleBundleRoot(ownerRoot, options = {}) {
  options = { ...options };
  if (options.recovery !== void 0 && options.recovery !== "refuse") throw new Error("Invalid artifact recovery mode.");
  options.signal?.throwIfAborted();
  const root2 = await realpath2(ownerRoot).catch((error) => {
    if (error.code === "ENOENT") return void 0;
    throw error;
  });
  if (!root2) return;
  const transactions = path5.join(root2, ".uib", "transactions");
  try {
    for (let ancestor = path5.resolve(ownerRoot); ; ancestor = path5.dirname(ancestor)) {
      if ((await lstat2(ancestor)).isSymbolicLink()) throw new Error("Source recovery roots cannot contain symlinks.");
      if (path5.dirname(ancestor) === ancestor) break;
    }
    for (const directory of [path5.join(root2, ".uib"), transactions]) {
      const stat2 = await lstat2(directory).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      if (stat2 && (stat2.isSymbolicLink() || !stat2.isDirectory())) throw new Error("Unsafe source transaction storage.");
    }
    for (const name of await readdir2(transactions).catch((error) => {
      if (error.code === "ENOENT") return [];
      throw error;
    })) {
      options.signal?.throwIfAborted();
      if (options.recovery === "refuse" && !/^[a-f0-9]{64}$/.test(name)) throw new RoleBundleRecoveryRequiredError(void 0);
      const directory = path5.join(transactions, name);
      if ((await lstat2(directory)).isSymbolicLink() || !(await lstat2(directory)).isDirectory()) throw new Error("Unsafe source transaction storage.");
      const journalFile = path5.join(directory, "pending.json");
      const journalStat = await lstat2(journalFile).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      if (options.recovery === "refuse") {
        if (journalStat) throw new RoleBundleRecoveryRequiredError(void 0);
        continue;
      }
      if (journalStat?.isSymbolicLink()) throw new Error("Unsafe source transaction journal.");
      const text = await readFile2(journalFile, "utf8").catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      if (text === void 0) continue;
      const journal = JSON.parse(text);
      if (typeof journal.bundle !== "string" || typeof journal.identity !== "string" || name !== storageKey(journal.identity) || path5.dirname(journal.identity) !== journal.bundle || !journal.identity.endsWith(".visual.json")) throw new Error("A source journal requires explicit location recovery.");
      const anchor = path5.basename(journal.identity), stem = anchor.slice(0, -".visual.json".length);
      const paths = [".html", ".css", ".visual.json", ".fixtures.json", ".functions.ts"].map((extension) => stem + extension);
      validateSnapshot(journal.original, paths);
      await readRoleBundle({ root: root2, directory: journal.bundle, anchor, paths });
      if (await lstat2(journalFile).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      })) throw new Error("The original journal identity was not recovered. Explicit location recovery is required.");
    }
  } catch (error) {
    options.signal?.throwIfAborted();
    if (error instanceof RoleBundleRecoveryRequiredError) throw error;
    throw new RoleBundleRecoveryRequiredError(options.recovery === "refuse" ? void 0 : error);
  }
}
async function withRoleBundleGraph(ownerRoot, work, options = {}) {
  options = { ...options };
  const root2 = await realpath2(ownerRoot);
  for (let ancestor = path5.resolve(ownerRoot); ; ancestor = path5.dirname(ancestor)) {
    if ((await lstat2(ancestor)).isSymbolicLink()) throw new Error("Source graph roots cannot contain symlinks.");
    if (path5.dirname(ancestor) === ancestor) break;
  }
  return withArtifactLock(root2, root2, async () => {
    if (options.recovery === "refuse") await recoverRoleBundleRoot(root2, options);
    options.signal?.throwIfAborted();
    return work();
  }, "visual-runtime-graph-v1", {
    // Measured WP4/WP5-B holds reached 1.66s. A 5s acquisition budget
    // accommodates brief serial work; it never extends or retries admitted work.
    timeoutMs: 5e3,
    ...options,
    observe: (measurement) => {
      if (process.env.UI_GRAPH_LOCK_TRACE === "1") {
        const record = JSON.stringify({ pid: process.pid, ...measurement });
        console.error("GRAPH_LOCK " + record);
        if (process.env.UI_GRAPH_LOCK_METRICS) appendFileSync(process.env.UI_GRAPH_LOCK_METRICS, record + "\n");
      }
      options.observe?.(measurement);
    }
  });
}

// src/server/presentation-publication-contract.ts
import { createHash as createHash3 } from "node:crypto";

// src/server/presentation-format.ts
import path6 from "node:path";

// src/shared/presentation.ts
var APPLICATION_PRESENTATION_VERSION = "1.0.0";

// src/server/presentation-format.ts
function defaultPresentation() {
  return {
    schemaVersion: APPLICATION_PRESENTATION_VERSION,
    name: "Default",
    tokens: {
      "--app-color-primary": "#1f4f8f",
      "--app-color-surface": "#ffffff",
      "--app-color-text": "#172033",
      "--app-spacing-sm": "0.5rem",
      "--app-spacing-md": "1rem",
      "--app-spacing-lg": "1.5rem",
      "--app-radius-card": "0.5rem",
      "--app-content-max-width": "75rem",
      "--app-font-body": "system-ui, sans-serif"
    },
    typography: {},
    componentDefaults: {},
    layout: { defaultShell: "authenticated", defaultTemplate: "standard", routes: {}, shells: defaultShells(), navigation: [] },
    heroes: {},
    css: "",
    assets: []
  };
}
function normalizeStringMap(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object.`);
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (!key.startsWith("--")) throw new Error(`${name} keys must be CSS custom properties beginning with --.`);
    if (typeof item !== "string") throw new Error(`${name}.${key} must be a string.`);
    result[key] = item;
  }
  return result;
}
function normalizeAssets(value) {
  if (!Array.isArray(value)) throw new Error("assets must be an array.");
  const ids = /* @__PURE__ */ new Set();
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Each asset must be an object.");
    const asset = item;
    if (!asset.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.id) || ids.has(asset.id)) throw new Error("Each asset requires a unique lowercase ID.");
    ids.add(asset.id);
    if (!asset.name || !asset.path || typeof asset.active !== "boolean") throw new Error(`Asset ${asset.id} requires name, path, and active.`);
    if (!["logo", "image", "icon", "illustration", "background", "favicon", "other"].includes(String(asset.type))) throw new Error(`Asset ${asset.id} has an unsupported type.`);
    if (path6.isAbsolute(asset.path) || asset.path.split(/[\\/]/).includes("..")) throw new Error(`Asset ${asset.id} path must remain within presentation/assets.`);
    return { id: asset.id, name: asset.name, type: asset.type, path: asset.path.replaceAll("\\", "/"), alt: typeof asset.alt === "string" ? asset.alt : void 0, active: asset.active };
  });
}
function validatePresentation(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Presentation must be an object.");
  const input = value;
  if (typeof input.name !== "string" || !input.name.trim()) throw new Error("Presentation name is required.");
  if (typeof input.css !== "string") throw new Error("css must be a string.");
  if (!input.componentDefaults || typeof input.componentDefaults !== "object" || Array.isArray(input.componentDefaults)) throw new Error("componentDefaults must be an object.");
  const layout = normalizeLayout(input.layout);
  const heroes = normalizeHeroes(input.heroes);
  for (const [route, assignment] of Object.entries(layout.routes)) {
    if (assignment.heroId && !heroes[assignment.heroId]) throw new Error(`Route ${route} references an unknown hero.`);
  }
  return { schemaVersion: APPLICATION_PRESENTATION_VERSION, name: input.name.trim(), tokens: normalizeStringMap(input.tokens ?? {}, "tokens"), typography: normalizeStringMap(input.typography ?? {}, "typography"), componentDefaults: input.componentDefaults, layout, heroes, css: input.css, assets: normalizeAssets(input.assets ?? []) };
}
function normalizeHeroes(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([id, raw]) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const hero = raw;
    if (!["standard", "compact", "image-background"].includes(String(hero.variant)) || !hero.data || typeof hero.data !== "object" || Array.isArray(hero.data)) return [];
    return [[id, { id, enabled: hero.enabled !== false, variant: hero.variant, data: normalizeHeroData(hero.data) }]];
  }));
}
function normalizeHeroData(value) {
  const data = { ...value };
  const actionKeys = ["action-components", "action_components", "hero_action_buttons", "actions"];
  const source = actionKeys.map((key) => data[key]).find((item) => item !== void 0 && item !== "");
  if (source === void 0) return data;
  let actions = [];
  try {
    const parsed2 = typeof source === "string" ? JSON.parse(source) : source;
    actions = Array.isArray(parsed2) ? parsed2 : parsed2 && typeof parsed2 === "object" ? [parsed2] : [];
  } catch {
    actions = [];
  }
  const links = actions.filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item)).filter((item) => String(item.type ?? item.kind ?? "link").toLowerCase() !== "action").slice(0, 2).map((item) => ({ ...item, type: "link" }));
  const serialized = JSON.stringify(links);
  for (const key of actionKeys) data[key] = serialized;
  return data;
}
function normalizeLayout(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const shellNames = ["public", "authenticated", "minimal"];
  const templates = ["standard", "two-column", "dashboard", "form", "detail-record"];
  const defaultShell = shellNames.includes(String(input.defaultShell)) ? input.defaultShell : "authenticated";
  const defaultTemplate = templates.includes(String(input.defaultTemplate)) ? input.defaultTemplate : "standard";
  const routes = Object.fromEntries(Object.entries(input.routes ?? {}).flatMap(([route, assignment]) => {
    if (!route.startsWith("/") || !assignment || typeof assignment !== "object") return [];
    const item = assignment;
    return [[route, { ...shellNames.includes(String(item.shell)) ? { shell: item.shell } : {}, ...templates.includes(String(item.template)) ? { template: item.template } : {}, ...typeof item.heroId === "string" ? { heroId: item.heroId } : {} }]];
  }));
  const shellInput = input.shells && typeof input.shells === "object" ? input.shells : {};
  const shells = Object.fromEntries(shellNames.map((name) => [name, normalizeShell(shellInput[name])]));
  const navigation = Array.isArray(input.navigation) ? input.navigation.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item;
    if (typeof entry.route !== "string" || !entry.route.startsWith("/")) return [];
    return [{ route: entry.route, ...typeof entry.label === "string" ? { label: entry.label } : {}, ...typeof entry.icon === "string" ? { icon: entry.icon } : {}, ...typeof entry.visible === "boolean" ? { visible: entry.visible } : {}, ...Number.isFinite(entry.order) ? { order: Number(entry.order) } : {} }];
  }) : [];
  return { defaultShell, defaultTemplate, routes, shells, navigation };
}
function defaultShells() {
  const base = { showNavigation: true, navigationPlacement: "top", showFooter: true, footerText: "\xA9 Application" };
  return { public: { ...base }, authenticated: { ...base }, minimal: { showNavigation: false, navigationPlacement: "top", showFooter: false, footerText: "" } };
}
function normalizeShell(value) {
  const fallback = defaultShells().public;
  return { logoAssetId: typeof value?.logoAssetId === "string" ? value.logoAssetId : void 0, showNavigation: typeof value?.showNavigation === "boolean" ? value.showNavigation : fallback.showNavigation, navigationPlacement: value?.navigationPlacement === "side" ? "side" : "top", showFooter: typeof value?.showFooter === "boolean" ? value.showFooter : fallback.showFooter, footerText: typeof value?.footerText === "string" ? value.footerText : fallback.footerText };
}
function renderPresentationCss(presentation) {
  const tokens = { ...presentation.tokens, ...presentation.typography };
  const declarations = Object.entries(tokens).map(([name, value]) => `  ${name}: ${value};`).join("\n");
  return `/* Generated from the active Application Presentation version. */
:root {
${declarations}
}

.ui-presentation-shell { min-height:100vh; color:var(--app-color-text,#172033); background:var(--app-color-surface,#fff); font-family:var(--app-font-body,system-ui,sans-serif); }
.ui-presentation-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem max(1.25rem,calc((100vw - var(--app-content-max-width,75rem))/2)); border-bottom:1px solid color-mix(in srgb,var(--app-color-text,#172033) 12%,transparent); background:var(--app-color-surface,#fff); }
.ui-presentation-brand { color:var(--app-color-primary,#1f4f8f); font-weight:800; text-decoration:none; }
.ui-presentation-header nav { display:flex; flex-wrap:wrap; gap:1rem; }
.ui-presentation-header nav a { color:inherit; text-decoration:none; }
.ui-presentation-header nav a[aria-current=page] { color:var(--app-color-primary,#1f4f8f); font-weight:800; }
.ui-presentation-main { width:min(var(--app-content-max-width,75rem),calc(100% - 2rem)); margin:0 auto; padding:var(--app-spacing-lg,1.5rem) 0; }
.ui-presentation-footer { padding:1rem max(1.25rem,calc((100vw - var(--app-content-max-width,75rem))/2)); color:color-mix(in srgb,var(--app-color-text,#172033) 65%,transparent); border-top:1px solid color-mix(in srgb,var(--app-color-text,#172033) 12%,transparent); }
.template-two-column { display:grid; grid-template-columns:minmax(0,1fr) minmax(14rem,.32fr); gap:var(--app-spacing-lg,1.5rem); }
.template-dashboard { display:grid; gap:var(--app-spacing-lg,1.5rem); }
.template-form { max-width:48rem; margin-inline:auto; }
.template-detail-record { max-width:64rem; }
@media (max-width: 640px) { .ui-presentation-header { align-items:flex-start; flex-direction:column; } .template-two-column { grid-template-columns:1fr; } }

${presentation.css.trim()}
`;
}

// src/server/presentation-publication-contract.ts
var PresentationPublicationError = class extends Error {
  constructor(code) {
    super("Presentation publication unavailable: " + code);
    this.code = code;
    this.name = "PresentationPublicationError";
  }
  code;
};
function fail(code) {
  throw new PresentationPublicationError(code);
}
var hash = (v) => createHash3("sha256").update(v).digest("hex");
function canonical2(v) {
  return v === null || typeof v !== "object" ? JSON.stringify(v) : Array.isArray(v) ? "[" + v.map(canonical2).join(",") + "]" : "{" + Object.keys(v).sort().map((k) => JSON.stringify(k) + ":" + canonical2(v[k])).join(",") + "}";
}
function freeze(v) {
  if (v && typeof v === "object") {
    for (const x of Object.values(v)) freeze(x);
    Object.freeze(v);
  }
  return v;
}
var resourceIds = ["app.settings.json", "application.css", "presentation.json", "publication.manifest.json"];
function exact(v, required, optional = []) {
  if (!v || typeof v !== "object" || Array.isArray(v) || ![Object.prototype, null].includes(Object.getPrototypeOf(v))) fail("INVALID_INPUT");
  if (Reflect.ownKeys(v).some((k) => typeof k !== "string") || Object.entries(Object.getOwnPropertyDescriptors(v)).some(([k, p]) => !p.enumerable || !("value" in p) || ![...required, ...optional].includes(k)) || required.some((k) => !Object.hasOwn(v, k))) fail("INVALID_INPUT");
}
function parsed(bytes) {
  let value;
  const text = Buffer.from(bytes).toString("utf8");
  try {
    value = JSON.parse(text);
  } catch {
    fail("INVALID_INPUT");
  }
  if (text !== JSON.stringify(value) && text !== JSON.stringify(value, null, 2) + "\n") fail("INVALID_INPUT");
  return value;
}
function subset(value) {
  exact(value, ["schemaVersion", "name", "tokens", "typography", "componentDefaults", "layout", "heroes", "css", "assets"]);
  if (value.schemaVersion !== "1.0.0" || typeof value.name !== "string" || !value.name.trim() || value.name.length > 1024) fail("UNSUPPORTED_CONTENT");
  for (const key of ["typography", "componentDefaults", "heroes"]) {
    exact(value[key], []);
  }
  if (!Array.isArray(value.assets) || value.assets.length || typeof value.css !== "string" || value.css.trim()) fail("UNSUPPORTED_CONTENT");
  exact(value.tokens, [], ["--app-color-primary", "--app-color-surface", "--app-color-text", "--app-spacing-sm", "--app-spacing-md", "--app-spacing-lg", "--app-radius-card", "--app-content-max-width", "--app-font-body"]);
  for (const [key, v] of Object.entries(value.tokens)) {
    if (typeof v !== "string" || v.length > 64) fail("UNSUPPORTED_CONTENT");
    if (key.startsWith("--app-color-") ? !/^#(?:[a-f0-9]{3}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(v) : key === "--app-font-body" ? v !== "system-ui, sans-serif" : !/^\d{1,4}(?:\.\d{1,4})?(?:rem|em|px|vw|vh|%)$/.test(v)) fail("UNSUPPORTED_CONTENT");
  }
  if (["--app-color-primary", "--app-color-surface", "--app-color-text", "--app-spacing-lg", "--app-content-max-width", "--app-font-body"].some((k) => !Object.hasOwn(value.tokens, k))) fail("UNSUPPORTED_CONTENT");
  const l = value.layout;
  exact(l, ["defaultShell", "defaultTemplate", "routes", "shells", "navigation"]);
  if (l.defaultShell !== "minimal" || l.defaultTemplate !== "standard" || !Array.isArray(l.navigation) || l.navigation.length) fail("UNSUPPORTED_CONTENT");
  exact(l.routes, []);
  exact(l.shells, ["public", "authenticated", "minimal"]);
  for (const s of Object.values(l.shells)) {
    exact(s, ["showNavigation", "navigationPlacement", "showFooter", "footerText"]);
    if (s.showNavigation !== false || s.navigationPlacement !== "top" || s.showFooter !== false || s.footerText !== "") fail("UNSUPPORTED_CONTENT");
  }
  let result;
  try {
    result = validatePresentation(value);
  } catch {
    fail("UNSUPPORTED_CONTENT");
  }
  if (canonical2(JSON.parse(JSON.stringify(result))) !== canonical2(value)) fail("UNSUPPORTED_CONTENT");
  return result;
}
function snapshotIndex(owner, input) {
  exact(input, ["producer", "version", "files"]);
  if (input.producer !== "owner-completed-presentation-v1") fail("UNSUPPORTED_PRODUCER");
  if (!Number.isSafeInteger(input.version) || input.version < 1) fail("VERSION_MISMATCH");
  if (!(input.files instanceof Map) || input.files.size !== 4) fail("MEMBERSHIP_INVALID");
  const bytes = /* @__PURE__ */ new Map();
  for (const id of resourceIds) {
    const b = input.files.get(id);
    if (!(b instanceof Uint8Array)) fail("MEMBERSHIP_INVALID");
    const copy = new Uint8Array(b);
    if (copy.length > 65536) fail("LIMIT_EXCEEDED");
    bytes.set(id, copy);
  }
  const context = parsed(bytes.get("app.settings.json"));
  exact(context, ["application"]);
  exact(context.application, ["name", "status"], ["description"]);
  if (context.application.status !== "active" || Object.values(context.application).some((v) => typeof v !== "string" || v.length > 1024) || !context.application.name.trim()) fail("VERSION_MISMATCH");
  const manifest = parsed(bytes.get("publication.manifest.json"));
  exact(manifest, ["type", "schemaVersion", "applicationId", "activeVersion", "draft", "versions"]);
  if (manifest.type !== "ui-platform.presentation" || manifest.schemaVersion !== "1.0.0" || manifest.applicationId !== owner.id) fail("VERSION_MISMATCH");
  if (manifest.activeVersion !== input.version) fail("UNPUBLISHED");
  exact(manifest.draft, ["exists"], ["modifiedAt", "checksum"]);
  if (typeof manifest.draft.exists !== "boolean") fail("INVALID_INPUT");
  if (manifest.draft.modifiedAt !== void 0 && (typeof manifest.draft.modifiedAt !== "string" || !Number.isFinite(Date.parse(manifest.draft.modifiedAt)))) fail("INVALID_INPUT");
  if (manifest.draft.checksum !== void 0 && !/^[a-f0-9]{64}$/.test(manifest.draft.checksum)) fail("INVALID_INPUT");
  if (!Array.isArray(manifest.versions) || manifest.versions.length > 256) fail("INVALID_INPUT");
  const versions = /* @__PURE__ */ new Set();
  let record;
  for (const v of manifest.versions) {
    exact(v, ["version", "checksum", "publishedAt", "actor"]);
    if (!Number.isSafeInteger(v.version) || v.version < 1 || versions.has(v.version) || typeof v.checksum !== "string" || !/^[a-f0-9]{64}$/.test(v.checksum) || typeof v.publishedAt !== "string" || !Number.isFinite(Date.parse(v.publishedAt)) || typeof v.actor !== "string" || !v.actor || v.actor.length > 256) fail("VERSION_MISMATCH");
    versions.add(v.version);
    if (v.version === input.version) record = v;
  }
  if (!record) fail("UNPUBLISHED");
  const raw = parsed(bytes.get("presentation.json")), presentation = subset(raw);
  if (hash(JSON.stringify(raw)) !== record.checksum) fail("CONTENT_CHANGED");
  if (!Buffer.from(bytes.get("application.css")).equals(Buffer.from(renderPresentationCss(presentation)))) fail("CONTENT_CHANGED");
  const resources = resourceIds.map((id) => ({ id, byteLength: bytes.get(id).length, sha256: hash(bytes.get(id)), mediaType: id.endsWith(".css") ? "text/css" : "application/json", dependencies: id === "application.css" ? ["presentation.json"] : id === "presentation.json" ? ["app.settings.json"] : [] }));
  return { index: { schema: "presentation-publication-v1", owner, producer: "owner-completed-presentation-v1", subset: "static-card-presentation-v1", version: input.version, versionRecord: structuredClone(record), presentationChecksum: record.checksum, resources }, bytes };
}
function verifyIndexShape(index, owner) {
  exact(index, ["schema", "owner", "producer", "subset", "version", "versionRecord", "presentationChecksum", "resources"]);
  if (index.schema !== "presentation-publication-v1" || canonical2(index.owner) !== canonical2(owner) || index.producer !== "owner-completed-presentation-v1" || index.subset !== "static-card-presentation-v1" || !Number.isSafeInteger(index.version) || index.version < 1 || !Array.isArray(index.resources) || index.resources.length !== 4) fail("CONTENT_CHANGED");
  for (let i = 0; i < 4; i++) {
    const r = index.resources[i];
    exact(r, ["id", "sha256", "byteLength", "mediaType", "dependencies"]);
    if (r.id !== resourceIds[i] || typeof r.sha256 !== "string" || !/^[a-f0-9]{64}$/.test(r.sha256) || !Number.isSafeInteger(r.byteLength) || r.byteLength < 0 || r.byteLength > 65536 || !Array.isArray(r.dependencies)) fail("MEMBERSHIP_INVALID");
  }
}

// src/server/presentation-publications.ts
var validId = (id) => typeof id === "string" && /^pres_([1-9]\d{0,15})_[a-f0-9]{64}$/.test(id) && Number.isSafeInteger(Number(id.split("_")[1]));
function optionsFor(options) {
  const timeoutMs = options.timeoutMs ?? 5e3;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 5e3) fail("INVALID_INPUT");
  return { recovery: "refuse", timeoutMs, signal: options.signal };
}
async function boundary(options, work) {
  try {
    if (options.signal?.aborted) fail("CANCELED");
    return await work();
  } catch (error) {
    if (error instanceof PresentationPublicationError) throw error;
    if (options.signal?.aborted) fail("CANCELED");
    const known = { "source.busy": "BUSY", "source.owner-unresolved": "OWNER_UNRESOLVED", "source.admission-unsafe": "UNSAFE", "source.recovery-required": "RECOVERY_REQUIRED", ENOENT: "UNSEALED" };
    fail(known[error?.code] ?? "IO_UNCERTAIN");
  }
}
function check2(signal) {
  if (signal?.aborted) fail("CANCELED");
}
async function canonicalRoot(root2) {
  for (let target = path7.resolve(root2); ; target = path7.dirname(target)) {
    if ((await lstat2(target)).isSymbolicLink()) fail("UNSAFE");
    if (path7.dirname(target) === target) break;
  }
  const resolved = await realpath2(root2);
  if (!(await lstat2(resolved)).isDirectory()) fail("UNSAFE");
  return resolved;
}
async function child(directory, name, create = false) {
  const target = path7.join(directory, name);
  let stat2 = await lstat2(target).catch((error) => {
    if (error.code === "ENOENT") return void 0;
    throw error;
  });
  if (!stat2 && create) {
    await mkdir2(target).catch((error) => {
      if (error.code !== "EEXIST") throw error;
    });
    stat2 = await lstat2(target);
  }
  if (!stat2) fail("UNSEALED");
  if (stat2.isSymbolicLink() || !stat2.isDirectory()) fail("UNSAFE");
  return target;
}
async function exactFile(file, size, signal) {
  check2(signal);
  const stat2 = await lstat2(file);
  if (stat2.isSymbolicLink() || !stat2.isFile() || stat2.nlink !== 1) fail("UNSAFE");
  if (stat2.size !== size) fail("CONTENT_CHANGED");
  const bytes = await readFile2(file, { signal });
  check2(signal);
  if (bytes.length !== size) fail("CONTENT_CHANGED");
  return new Uint8Array(bytes);
}
async function exclusive(file, bytes) {
  const handle = await open2(file, "wx");
  try {
    await handle.writeFile(bytes);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await chmod2(file, 292);
}
async function createPresentationPublicationOwner(setup2) {
  return boundary({}, async () => {
    if (setup2.owner?.kind !== "application" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(setup2.owner.id)) fail("INVALID_INPUT");
    const owner = freeze({ kind: "application", id: setup2.owner.id });
    const [root2, graphRoot] = await Promise.all([canonicalRoot(setup2.root), canonicalRoot(setup2.graphRoot)]);
    return new PresentationPublicationOwner(root2, graphRoot, owner, construction);
  });
}
var construction = /* @__PURE__ */ Symbol("existing-presentation-owner");
var PresentationPublicationOwner = class {
  constructor(root2, graphRoot, owner, token) {
    this.root = root2;
    this.graphRoot = graphRoot;
    this.owner = owner;
    if (token !== construction) fail("INVALID_INPUT");
  }
  root;
  graphRoot;
  owner;
  async namespace(create = false) {
    return child(await child(this.root, ".uib", create), "presentation-publications-v1", create);
  }
  async graph(options, work) {
    const admission = optionsFor(options);
    return withRoleBundleGraph(this.graphRoot, async () => {
      await canonicalRoot(this.root);
      await recoverRoleBundleRoot(this.root, admission);
      check2(admission.signal);
      const value = await work();
      check2(admission.signal);
      return value;
    }, admission);
  }
  async publish(input, options = {}) {
    options = { ...options };
    return boundary(options, async () => {
      const staged = snapshotIndex(this.owner, input), bytes = staged.bytes;
      const index = canonical2(staged.index), publicationId = "pres_" + staged.index.version + "_" + hash(index);
      return this.graph(options, async () => {
        const space = await this.namespace(true), sealed = await child(space, "sealed", true), staging = await child(space, "staging", true);
        const final = path7.join(sealed, "v" + staged.index.version);
        if (await lstat2(final).catch((error) => {
          if (error.code === "ENOENT") return void 0;
          throw error;
        })) fail("VERSION_EXISTS");
        const candidate = await child(staging, randomUUID3(), true), blobs = await child(candidate, "bytes", true);
        const written = /* @__PURE__ */ new Set();
        for (const resource of staged.index.resources) {
          check2(options.signal);
          if (!written.has(resource.sha256)) {
            await exclusive(path7.join(blobs, resource.sha256), bytes.get(resource.id));
            written.add(resource.sha256);
          }
        }
        await exclusive(path7.join(candidate, "index.json"), index);
        await this.loadDirectory(candidate, publicationId, options.signal);
        check2(options.signal);
        await rename2(candidate, final);
        check2(options.signal);
        return publicationId;
      });
    });
  }
  async loadDirectory(directory, publicationId, signal) {
    if (canonical2((await readdir2(directory)).sort()) !== canonical2(["bytes", "index.json"])) fail("MEMBERSHIP_INVALID");
    const file = path7.join(directory, "index.json"), stat2 = await lstat2(file);
    if (stat2.size > 32768) fail("LIMIT_EXCEEDED");
    const text = await exactFile(file, stat2.size, signal);
    let index;
    try {
      index = JSON.parse(Buffer.from(text).toString("utf8"));
    } catch {
      fail("CONTENT_CHANGED");
    }
    verifyIndexShape(index, this.owner);
    if (Buffer.from(text).toString("utf8") !== canonical2(index) || publicationId !== "pres_" + index.version + "_" + hash(text)) fail("CONTENT_CHANGED");
    const blobs = await child(directory, "bytes"), bytes = /* @__PURE__ */ new Map();
    if (canonical2((await readdir2(blobs)).sort()) !== canonical2([...new Set(index.resources.map((r) => r.sha256))].sort())) fail("MEMBERSHIP_INVALID");
    for (const resource of index.resources) {
      const content = await exactFile(path7.join(blobs, resource.sha256), resource.byteLength, signal);
      if (hash(content) !== resource.sha256) fail("CONTENT_CHANGED");
      bytes.set(resource.id, content);
    }
    const expected = snapshotIndex(this.owner, { producer: "owner-completed-presentation-v1", version: index.version, files: bytes });
    if (canonical2(expected.index) !== canonical2(index)) fail("CONTENT_CHANGED");
    return { index: freeze(index), bytes };
  }
  async load(publicationId, signal) {
    if (!validId(publicationId)) fail("INVALID_INPUT");
    const space = await this.namespace(), sealed = await child(space, "sealed"), directory = await child(sealed, "v" + publicationId.split("_")[1]);
    return this.loadDirectory(directory, publicationId, signal);
  }
  lease(publicationId, index, bytes, leaseMs, signal) {
    const expiresAt = performance.now() + leaseMs;
    let disposed = false;
    return Object.freeze({
      publicationId,
      index,
      expiresAt,
      read(resourceId) {
        check2(signal);
        if (disposed) fail("DISPOSED");
        if (performance.now() >= expiresAt) {
          bytes.clear();
          fail("EXPIRED");
        }
        const value = bytes.get(resourceId);
        if (!value) fail("MEMBERSHIP_INVALID");
        return new Uint8Array(value);
      },
      dispose() {
        disposed = true;
        bytes.clear();
      }
    });
  }
  async read(publicationId, leaseMs, options = {}) {
    options = { ...options };
    return boundary(options, () => this.graph(options, async () => {
      if (!Number.isFinite(leaseMs) || leaseMs <= 0 || leaseMs > 3e4) fail("INVALID_INPUT");
      const bytes = await this.load(publicationId, options.signal);
      check2(options.signal);
      return this.lease(publicationId, bytes.index, bytes.bytes, leaseMs, options.signal);
    }));
  }
  async selection(create, options, work) {
    const directory = await child(await this.namespace(create), "selection", create), file = path7.join(directory, "selected.visual.json");
    return withArtifactLock(this.root, directory, async () => {
      await recoverRoleBundleRoot(this.root, { ...optionsFor(options) });
      const stat2 = await lstat2(file).catch((error) => {
        if (error.code === "ENOENT") return void 0;
        throw error;
      });
      let previous = null;
      if (stat2) {
        if (stat2.size > 2048) fail("CONTENT_CHANGED");
        const bytes = await exactFile(file, stat2.size, options.signal);
        try {
          previous = JSON.parse(Buffer.from(bytes).toString("utf8"));
        } catch {
          fail("CONTENT_CHANGED");
        }
        if (!previous || previous.schema !== "presentation-publication-selection-v1" || canonical2(previous.owner) !== canonical2(this.owner) || !Number.isSafeInteger(previous.generation) || previous.generation < 1 || !validId(previous.publicationId) || canonical2(previous) !== canonical2({ schema: previous.schema, owner: this.owner, generation: previous.generation, publicationId: previous.publicationId })) fail("CONTENT_CHANGED");
      }
      check2(options.signal);
      return work(file, previous);
    }, file, optionsFor(options));
  }
  async select(publicationId, expectedGeneration, options = {}) {
    options = { ...options };
    return boundary(options, () => this.graph(options, async () => {
      if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 0 || expectedGeneration >= Number.MAX_SAFE_INTEGER) fail("INVALID_INPUT");
      await this.load(publicationId, options.signal);
      return this.selection(true, options, async (file, previous) => {
        if ((previous?.generation ?? 0) !== expectedGeneration) fail("SELECTION_CHANGED");
        const next = { schema: "presentation-publication-selection-v1", owner: this.owner, generation: expectedGeneration + 1, publicationId };
        check2(options.signal);
        await atomicWriteText(file, canonical2(next));
        check2(options.signal);
        return freeze(next);
      });
    }));
  }
  async readSelected(expectedGeneration, leaseMs, options = {}) {
    options = { ...options };
    return boundary(options, () => this.graph(options, async () => {
      if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 1 || !Number.isFinite(leaseMs) || leaseMs <= 0 || leaseMs > 3e4) fail("INVALID_INPUT");
      return this.selection(false, options, async (_, previous) => {
        if (!previous || previous.generation !== expectedGeneration) fail("SELECTION_CHANGED");
        const bytes = await this.load(previous.publicationId, options.signal);
        check2(options.signal);
        return this.lease(previous.publicationId, bytes.index, bytes.bytes, leaseMs, options.signal);
      });
    }));
  }
};

// evidence/d6-p3-presentation-seals-20261026/run-1793036957464/before-format.ts
import path8 from "node:path";
function defaultPresentation2() {
  return {
    schemaVersion: APPLICATION_PRESENTATION_VERSION,
    name: "Default",
    tokens: {
      "--app-color-primary": "#1f4f8f",
      "--app-color-surface": "#ffffff",
      "--app-color-text": "#172033",
      "--app-spacing-sm": "0.5rem",
      "--app-spacing-md": "1rem",
      "--app-spacing-lg": "1.5rem",
      "--app-radius-card": "0.5rem",
      "--app-content-max-width": "75rem",
      "--app-font-body": "system-ui, sans-serif"
    },
    typography: {},
    componentDefaults: {},
    layout: { defaultShell: "authenticated", defaultTemplate: "standard", routes: {}, shells: defaultShells2(), navigation: [] },
    heroes: {},
    css: "",
    assets: []
  };
}
function normalizeStringMap2(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${name} must be an object.`);
  const result = {};
  for (const [key, item] of Object.entries(value)) {
    if (!key.startsWith("--")) throw new Error(`${name} keys must be CSS custom properties beginning with --.`);
    if (typeof item !== "string") throw new Error(`${name}.${key} must be a string.`);
    result[key] = item;
  }
  return result;
}
function normalizeAssets2(value) {
  if (!Array.isArray(value)) throw new Error("assets must be an array.");
  const ids = /* @__PURE__ */ new Set();
  return value.map((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) throw new Error("Each asset must be an object.");
    const asset = item;
    if (!asset.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.id) || ids.has(asset.id)) throw new Error("Each asset requires a unique lowercase ID.");
    ids.add(asset.id);
    if (!asset.name || !asset.path || typeof asset.active !== "boolean") throw new Error(`Asset ${asset.id} requires name, path, and active.`);
    if (!["logo", "image", "icon", "illustration", "background", "favicon", "other"].includes(String(asset.type))) throw new Error(`Asset ${asset.id} has an unsupported type.`);
    if (path8.isAbsolute(asset.path) || asset.path.split(/[\\/]/).includes("..")) throw new Error(`Asset ${asset.id} path must remain within presentation/assets.`);
    return { id: asset.id, name: asset.name, type: asset.type, path: asset.path.replaceAll("\\", "/"), alt: typeof asset.alt === "string" ? asset.alt : void 0, active: asset.active };
  });
}
function validatePresentation2(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Presentation must be an object.");
  const input = value;
  if (typeof input.name !== "string" || !input.name.trim()) throw new Error("Presentation name is required.");
  if (typeof input.css !== "string") throw new Error("css must be a string.");
  if (!input.componentDefaults || typeof input.componentDefaults !== "object" || Array.isArray(input.componentDefaults)) throw new Error("componentDefaults must be an object.");
  const layout = normalizeLayout2(input.layout);
  const heroes = normalizeHeroes2(input.heroes);
  for (const [route, assignment] of Object.entries(layout.routes)) {
    if (assignment.heroId && !heroes[assignment.heroId]) throw new Error(`Route ${route} references an unknown hero.`);
  }
  return { schemaVersion: APPLICATION_PRESENTATION_VERSION, name: input.name.trim(), tokens: normalizeStringMap2(input.tokens ?? {}, "tokens"), typography: normalizeStringMap2(input.typography ?? {}, "typography"), componentDefaults: input.componentDefaults, layout, heroes, css: input.css, assets: normalizeAssets2(input.assets ?? []) };
}
function normalizeHeroes2(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([id, raw]) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !raw || typeof raw !== "object" || Array.isArray(raw)) return [];
    const hero = raw;
    if (!["standard", "compact", "image-background"].includes(String(hero.variant)) || !hero.data || typeof hero.data !== "object" || Array.isArray(hero.data)) return [];
    return [[id, { id, enabled: hero.enabled !== false, variant: hero.variant, data: normalizeHeroData2(hero.data) }]];
  }));
}
function normalizeHeroData2(value) {
  const data = { ...value };
  const actionKeys = ["action-components", "action_components", "hero_action_buttons", "actions"];
  const source = actionKeys.map((key) => data[key]).find((item) => item !== void 0 && item !== "");
  if (source === void 0) return data;
  let actions = [];
  try {
    const parsed2 = typeof source === "string" ? JSON.parse(source) : source;
    actions = Array.isArray(parsed2) ? parsed2 : parsed2 && typeof parsed2 === "object" ? [parsed2] : [];
  } catch {
    actions = [];
  }
  const links = actions.filter((item) => Boolean(item) && typeof item === "object" && !Array.isArray(item)).filter((item) => String(item.type ?? item.kind ?? "link").toLowerCase() !== "action").slice(0, 2).map((item) => ({ ...item, type: "link" }));
  const serialized = JSON.stringify(links);
  for (const key of actionKeys) data[key] = serialized;
  return data;
}
function normalizeLayout2(value) {
  const input = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const shellNames = ["public", "authenticated", "minimal"];
  const templates = ["standard", "two-column", "dashboard", "form", "detail-record"];
  const defaultShell = shellNames.includes(String(input.defaultShell)) ? input.defaultShell : "authenticated";
  const defaultTemplate = templates.includes(String(input.defaultTemplate)) ? input.defaultTemplate : "standard";
  const routes = Object.fromEntries(Object.entries(input.routes ?? {}).flatMap(([route, assignment]) => {
    if (!route.startsWith("/") || !assignment || typeof assignment !== "object") return [];
    const item = assignment;
    return [[route, { ...shellNames.includes(String(item.shell)) ? { shell: item.shell } : {}, ...templates.includes(String(item.template)) ? { template: item.template } : {}, ...typeof item.heroId === "string" ? { heroId: item.heroId } : {} }]];
  }));
  const shellInput = input.shells && typeof input.shells === "object" ? input.shells : {};
  const shells = Object.fromEntries(shellNames.map((name) => [name, normalizeShell2(shellInput[name])]));
  const navigation = Array.isArray(input.navigation) ? input.navigation.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const entry = item;
    if (typeof entry.route !== "string" || !entry.route.startsWith("/")) return [];
    return [{ route: entry.route, ...typeof entry.label === "string" ? { label: entry.label } : {}, ...typeof entry.icon === "string" ? { icon: entry.icon } : {}, ...typeof entry.visible === "boolean" ? { visible: entry.visible } : {}, ...Number.isFinite(entry.order) ? { order: Number(entry.order) } : {} }];
  }) : [];
  return { defaultShell, defaultTemplate, routes, shells, navigation };
}
function defaultShells2() {
  const base = { showNavigation: true, navigationPlacement: "top", showFooter: true, footerText: "\xA9 Application" };
  return { public: { ...base }, authenticated: { ...base }, minimal: { showNavigation: false, navigationPlacement: "top", showFooter: false, footerText: "" } };
}
function normalizeShell2(value) {
  const fallback = defaultShells2().public;
  return { logoAssetId: typeof value?.logoAssetId === "string" ? value.logoAssetId : void 0, showNavigation: typeof value?.showNavigation === "boolean" ? value.showNavigation : fallback.showNavigation, navigationPlacement: value?.navigationPlacement === "side" ? "side" : "top", showFooter: typeof value?.showFooter === "boolean" ? value.showFooter : fallback.showFooter, footerText: typeof value?.footerText === "string" ? value.footerText : fallback.footerText };
}
function renderPresentationCss2(presentation) {
  const tokens = { ...presentation.tokens, ...presentation.typography };
  const declarations = Object.entries(tokens).map(([name, value]) => `  ${name}: ${value};`).join("\n");
  return `/* Generated from the active Application Presentation version. */
:root {
${declarations}
}

.ui-presentation-shell { min-height:100vh; color:var(--app-color-text,#172033); background:var(--app-color-surface,#fff); font-family:var(--app-font-body,system-ui,sans-serif); }
.ui-presentation-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem max(1.25rem,calc((100vw - var(--app-content-max-width,75rem))/2)); border-bottom:1px solid color-mix(in srgb,var(--app-color-text,#172033) 12%,transparent); background:var(--app-color-surface,#fff); }
.ui-presentation-brand { color:var(--app-color-primary,#1f4f8f); font-weight:800; text-decoration:none; }
.ui-presentation-header nav { display:flex; flex-wrap:wrap; gap:1rem; }
.ui-presentation-header nav a { color:inherit; text-decoration:none; }
.ui-presentation-header nav a[aria-current=page] { color:var(--app-color-primary,#1f4f8f); font-weight:800; }
.ui-presentation-main { width:min(var(--app-content-max-width,75rem),calc(100% - 2rem)); margin:0 auto; padding:var(--app-spacing-lg,1.5rem) 0; }
.ui-presentation-footer { padding:1rem max(1.25rem,calc((100vw - var(--app-content-max-width,75rem))/2)); color:color-mix(in srgb,var(--app-color-text,#172033) 65%,transparent); border-top:1px solid color-mix(in srgb,var(--app-color-text,#172033) 12%,transparent); }
.template-two-column { display:grid; grid-template-columns:minmax(0,1fr) minmax(14rem,.32fr); gap:var(--app-spacing-lg,1.5rem); }
.template-dashboard { display:grid; gap:var(--app-spacing-lg,1.5rem); }
.template-form { max-width:48rem; margin-inline:auto; }
.template-detail-record { max-width:64rem; }
@media (max-width: 640px) { .ui-presentation-header { align-items:flex-start; flex-direction:column; } .template-two-column { grid-template-columns:1fr; } }

${presentation.css.trim()}
`;
}

// tests/d6-p3/presentation.test.ts
var appId = "4bdc70a0-9bb4-4bf1-9dd4-3abbaf59f220";
var parent = path9.resolve(process.cwd(), "evidence/d6-p3-presentation-seals-20261026/disposable");
var hash2 = (v) => createHash4("sha256").update(v).digest("hex");
var encoded = (v) => Buffer.from(JSON.stringify(v, null, 2) + "\n");
var traces = [];
var probes = 0;
var originalKill = process.kill;
process.kill = (() => {
  probes++;
  throw new Error("PID_PROBE_FORBIDDEN");
});
process.env.UI_GRAPH_LOCK_TRACE = "0";
delete process.env.UI_GRAPH_LOCK_METRICS;
test.after(async () => {
  process.kill = originalKill;
  assert.equal(probes, 0);
  const file = process.env.D6_P3_TRACE_FILE;
  assert.ok(path9.resolve(file).startsWith(path9.resolve(process.cwd(), "evidence/d6-p3-presentation-seals-20261026") + path9.sep));
  await fs2.writeFile(file, JSON.stringify({ traces, probes, nativeExecution: false }, null, 2));
});
function completed(version = 1) {
  const p = defaultPresentation();
  p.name = "Explicit owner version";
  p.layout.defaultShell = "minimal";
  for (const shell of Object.values(p.layout.shells)) {
    shell.showNavigation = false;
    shell.showFooter = false;
    shell.footerText = "";
  }
  const checksum2 = hash2(JSON.stringify(p));
  const manifest = { type: "ui-platform.presentation", schemaVersion: "1.0.0", applicationId: appId, activeVersion: version, draft: { exists: true, checksum: hash2("different unsaved draft") }, versions: [{ version, checksum: checksum2, publishedAt: "2026-10-26T00:00:00.000Z", actor: "fixture-owner" }] };
  const files = /* @__PURE__ */ new Map([["publication.manifest.json", encoded(manifest)], ["presentation.json", encoded(p)], ["application.css", Buffer.from(renderPresentationCss(p))], ["app.settings.json", encoded({ application: { name: "Original Application", status: "active" } })]]);
  return { producer: "owner-completed-presentation-v1", version, files };
}
function edit(snapshot, id, fn) {
  const v = JSON.parse(Buffer.from(snapshot.files.get(id)).toString("utf8"));
  fn(v);
  snapshot.files.set(id, encoded(v));
}
function rebind(snapshot) {
  const p = JSON.parse(Buffer.from(snapshot.files.get("presentation.json")).toString("utf8"));
  edit(snapshot, "publication.manifest.json", (m) => m.versions.find((v) => v.version === snapshot.version).checksum = hash2(JSON.stringify(p)));
  snapshot.files.set("application.css", Buffer.from(renderPresentationCss(p)));
}
async function setup() {
  await fs2.mkdir(parent, { recursive: true });
  const root2 = await fs2.mkdtemp(path9.join(parent, "owner-")), ownerRoot = path9.join(root2, "owner"), graphRoot = path9.join(root2, "graph");
  await fs2.mkdir(ownerRoot);
  await fs2.mkdir(graphRoot);
  configure(root2);
  const owner = await createPresentationPublicationOwner({ root: ownerRoot, graphRoot, owner: { kind: "application", id: appId } });
  return { root: root2, ownerRoot, graphRoot, owner, space: path9.join(ownerRoot, ".uib/presentation-publications-v1") };
}
async function fixture(run) {
  const f = await setup();
  try {
    await run(f);
  } finally {
    traces.push({ root: f.root, events: [...events] });
    inject();
    assert.ok(path9.resolve(f.root).startsWith(parent + path9.sep + "owner-"));
    async function writable(dir) {
      for (const e of await fs2.readdir(dir, { withFileTypes: true })) {
        const p = path9.join(dir, e.name);
        if (e.isDirectory()) await writable(p);
        else await fs2.chmod(p, 438);
      }
    }
    await writable(f.root);
    await fs2.rm(f.root, { recursive: true, force: true });
  }
}
var refused = (...codes) => (e) => {
  assert.ok(e instanceof PresentationPublicationError);
  assert.ok(codes.includes(e.code), e.code);
  assert.equal(e.cause, void 0);
  assert.ok(!String(e).includes(process.cwd()));
  return true;
};
test("pure owner default, normalization and CSS behavior match original byte-preserved functions", () => {
  assert.deepEqual(defaultPresentation(), defaultPresentation2());
  for (const change of [(p) => {
  }, (p) => {
    p.tokens["--app-color-text"] = "#123456";
    p.css = "h1 { color:red; }";
  }, (p) => {
    p.layout.defaultShell = "public";
    p.assets = [{ id: "logo", name: "Logo", type: "logo", path: "logo.png", active: true }];
  }]) {
    const p = defaultPresentation();
    change(p);
    assert.deepEqual(validatePresentation(p), validatePresentation2(p));
    assert.equal(renderPresentationCss(p), renderPresentationCss2(p));
  }
});
test("actual owner seals exact published JSON/CSS/context/manifest with immutable original version binding", () => fixture(async (f) => {
  const snapshot = completed(), id = await f.owner.publish(snapshot);
  assert.match(id, /^pres_1_[a-f0-9]{64}$/);
  const lease = await f.owner.read(id, 1e3);
  assert.equal(lease.index.owner.id, appId);
  assert.equal(lease.index.version, 1);
  assert.equal(lease.index.versionRecord.checksum, hash2(JSON.stringify(JSON.parse(Buffer.from(snapshot.files.get("presentation.json")).toString()))));
  assert.equal(lease.index.resources.length, 4);
  assert.ok(Object.isFrozen(lease.index.resources[0]));
  for (const [id2, bytes] of snapshot.files) assert.deepEqual(lease.read(id2), new Uint8Array(bytes));
  const output = lease.read("application.css"), original = output[0];
  output[0] ^= 1;
  assert.equal(lease.read("application.css")[0], original);
  lease.dispose();
  assert.throws(() => lease.read("application.css"), refused("DISPOSED"));
}));
test("draft matching checksum cannot establish publication, selected version and owner must match", () => fixture(async (f) => {
  for (const mutate of [(m) => {
    m.activeVersion = null;
  }, (m) => {
    m.versions = [];
  }, (m) => {
    m.applicationId = "different-owner";
  }, (m) => {
    m.activeVersion = 2;
  }]) {
    const s2 = completed();
    edit(s2, "publication.manifest.json", mutate);
    await assert.rejects(f.owner.publish(s2), refused("UNPUBLISHED", "VERSION_MISMATCH"));
  }
  const s = completed();
  edit(s, "app.settings.json", (c) => c.application.status = "disabled");
  await assert.rejects(f.owner.publish(s), refused("VERSION_MISMATCH"));
}));
test("missing CSS or required context and failed/incomplete copy never become partial publication", () => fixture(async (f) => {
  for (const id of ["application.css", "app.settings.json"]) {
    const s2 = completed();
    s2.files.delete(id);
    await assert.rejects(f.owner.publish(s2), refused("MEMBERSHIP_INVALID"));
  }
  const s = completed();
  s.files.set("application.css", new Uint8Array());
  await assert.rejects(f.owner.publish(s), refused("CONTENT_CHANGED"));
  inject((op, file) => {
    if (op === "handle.writeFile" && file.includes(path9.sep + "bytes" + path9.sep)) throw new Error("copy failed secret");
  });
  await assert.rejects(f.owner.publish(completed()), refused("IO_UNCERTAIN"));
  inject();
  assert.deepEqual(await fs2.readdir(path9.join(f.space, "sealed")), []);
  assert.equal((await fs2.readdir(path9.join(f.space, "staging"))).length, 1);
}));
test("all declared assets, missing asset, CSS imports/URLs, fonts and custom semantics refuse", () => fixture(async (f) => {
  for (const mutate of [(p) => {
    p.assets = [{ id: "missing", name: "Missing", path: "missing.png", active: true, type: "image" }];
  }, (p) => {
    p.css = '@import "missing.css";';
  }, (p) => {
    p.css = "x{background:url(missing.png)}";
  }, (p) => {
    p.tokens["--app-font-body"] = "remote-font";
  }, (p) => {
    p.heroes = { hero: { id: "hero", enabled: true, variant: "standard", data: {} } };
  }, (p) => {
    p.componentDefaults = { "uib-card": { href: "/route" } };
  }, (p) => {
    p.layout.routes = { "/": { heroId: "hero" } };
  }]) {
    const s2 = completed();
    edit(s2, "presentation.json", mutate);
    rebind(s2);
    await assert.rejects(f.owner.publish(s2), refused("UNSUPPORTED_CONTENT", "INVALID_INPUT"));
  }
  const s = completed();
  edit(s, "app.settings.json", (c) => c.presentation = { model: "composition-v1" });
  await assert.rejects(f.owner.publish(s), refused("INVALID_INPUT", "UNSUPPORTED_CONTENT"));
}));
test("missing supplied theme token refuses without substitution or normalization", () => fixture(async (f) => {
  const s = completed();
  edit(s, "presentation.json", (p) => delete p.tokens["--app-color-text"]);
  rebind(s);
  await assert.rejects(f.owner.publish(s), refused("UNSUPPORTED_CONTENT"));
  const bad = completed();
  edit(bad, "presentation.json", (p) => p.name = "  normalized  ");
  rebind(bad);
  await assert.rejects(f.owner.publish(bad), refused("UNSUPPORTED_CONTENT"));
}));
test("duplicate manifest versions and same-version replacement cannot overwrite a seal", () => fixture(async (f) => {
  const dup = completed();
  edit(dup, "publication.manifest.json", (m) => m.versions.push(m.versions[0]));
  await assert.rejects(f.owner.publish(dup), refused("VERSION_MISMATCH"));
  const id = await f.owner.publish(completed());
  await assert.rejects(f.owner.publish(completed()), refused("VERSION_EXISTS"));
  const s = completed();
  edit(s, "presentation.json", (p) => p.tokens["--app-color-text"] = "#abcdef");
  rebind(s);
  await assert.rejects(f.owner.publish(s), refused("VERSION_EXISTS"));
  const lease = await f.owner.read(id, 1e3);
  assert.deepEqual(lease.read("application.css"), new Uint8Array(completed().files.get("application.css")));
  lease.dispose();
}));
test("owner checksum and exact generated CSS must agree; syntactically duplicate JSON keys refuse", () => fixture(async (f) => {
  const s = completed();
  edit(s, "presentation.json", (p) => p.name = "Changed");
  await assert.rejects(f.owner.publish(s), refused("CONTENT_CHANGED"));
  const css = completed();
  css.files.set("application.css", Buffer.from("/* altered resource */"));
  await assert.rejects(f.owner.publish(css), refused("CONTENT_CHANGED"));
  const duplicate = completed();
  duplicate.files.set("app.settings.json", Buffer.from('{"appId":"wrong","appId":"' + appId + '"}'));
  await assert.rejects(f.owner.publish(duplicate), refused("INVALID_INPUT"));
}));
test("input source mutation after copying cannot change pending publication", () => fixture(async (f) => {
  const s = completed(), expected = new Uint8Array(s.files.get("application.css")), promise = f.owner.publish(s);
  s.files.get("application.css")[0] ^= 1;
  const id = await promise, lease = await f.owner.read(id, 1e3);
  assert.deepEqual(lease.read("application.css"), expected);
  lease.dispose();
}));
test("staging is invisible and interrupted rename does not promote incomplete data", () => fixture(async (f) => {
  const fake = "pres_1_" + "a".repeat(64);
  await fs2.mkdir(path9.join(f.space, "staging", "incomplete"), { recursive: true });
  await fs2.writeFile(path9.join(f.space, "staging", "incomplete", "index.json"), "{}");
  await assert.rejects(f.owner.read(fake, 1e3), refused("UNSEALED"));
  inject((op, file) => {
    if (op === "rename" && file.includes(path9.sep + "staging" + path9.sep)) throw new Error("interrupted rename");
  });
  await assert.rejects(f.owner.publish(completed()), refused("IO_UNCERTAIN"));
  inject();
  assert.deepEqual(await fs2.readdir(path9.join(f.space, "sealed")), []);
}));
test("selection versions and generations are separate; old lease retains prior published bytes", () => fixture(async (f) => {
  const first = await f.owner.publish(completed(1)), second = await f.owner.publish(completed(2));
  await f.owner.select(first, 0);
  const old = await f.owner.readSelected(1, 1e3);
  await f.owner.select(second, 1);
  await assert.rejects(f.owner.readSelected(1, 1e3), refused("SELECTION_CHANGED"));
  await assert.rejects(f.owner.select(first, 1), refused("SELECTION_CHANGED"));
  assert.equal(old.index.version, 1);
  old.dispose();
  const current = await f.owner.readSelected(2, 1e3);
  assert.equal(current.index.version, 2);
  current.dispose();
}));
test("concurrent readers, version producers and pointer writers use actual Foundation ordering", () => fixture(async (f) => {
  const results = await Promise.allSettled([f.owner.publish(completed()), f.owner.publish(completed())]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected" && r.reason.code === "VERSION_EXISTS").length, 1);
  const id = results.find((r) => r.status === "fulfilled").value;
  await f.owner.select(id, 0);
  const [a, b] = await Promise.all([f.owner.read(id, 1e3), f.owner.read(id, 1e3)]);
  assert.deepEqual(a.read("application.css"), b.read("application.css"));
  a.dispose();
  b.dispose();
  const selected = await Promise.allSettled([f.owner.select(id, 1), f.owner.select(id, 1)]);
  assert.equal(selected.filter((r) => r.status === "fulfilled").length, 1);
}));
test("disk mutation, missing blob, extra member and altered index refuse while copied leases remain stable", () => fixture(async (f) => {
  const id = await f.owner.publish(completed()), lease = await f.owner.read(id, 1e3), directory = path9.join(f.space, "sealed", "v1"), r = lease.index.resources.find((r2) => r2.id === "application.css"), file = path9.join(directory, "bytes", r.sha256), original = await fs2.readFile(file);
  await fs2.chmod(file, 438);
  const bad = Buffer.from(original);
  bad[0] ^= 1;
  await fs2.writeFile(file, bad);
  await assert.rejects(f.owner.read(id, 1e3), refused("CONTENT_CHANGED"));
  assert.deepEqual(lease.read("application.css"), new Uint8Array(original));
  lease.dispose();
  await fs2.writeFile(file, original);
  await fs2.writeFile(path9.join(directory, "bytes", "extra"), "extra");
  await assert.rejects(f.owner.read(id, 1e3), refused("MEMBERSHIP_INVALID"));
  await fs2.rm(path9.join(directory, "bytes", "extra"));
  await fs2.rm(file);
  await assert.rejects(f.owner.read(id, 1e3), refused("MEMBERSHIP_INVALID"));
}));
test("cancellation before/during staging, during read and after admission prevents stale access", () => fixture(async (f) => {
  const pre = new AbortController();
  pre.abort();
  await assert.rejects(f.owner.publish(completed(), { signal: pre.signal }), refused("CANCELED"));
  const mid = new AbortController();
  inject((op, file) => {
    if (op === "handle.sync" && file.includes("presentation-publications-v1")) mid.abort();
  });
  await assert.rejects(f.owner.publish(completed(), { signal: mid.signal }), refused("CANCELED"));
  inject();
  assert.deepEqual(await fs2.readdir(path9.join(f.space, "sealed")), []);
  const id = await f.owner.publish(completed()), reading = new AbortController();
  inject((op, file) => {
    if (op === "readFile" && file.includes(path9.sep + "bytes" + path9.sep)) reading.abort();
  });
  await assert.rejects(f.owner.read(id, 1e3, { signal: reading.signal }), refused("CANCELED"));
  inject();
  const after = new AbortController(), lease = await f.owner.read(id, 1e3, { signal: after.signal });
  after.abort();
  assert.throws(() => lease.read("application.css"), refused("CANCELED"));
  lease.dispose();
}));
test("interrupted selection preserves previous pointer and retention; lease expiry never redirects", () => fixture(async (f) => {
  const first = await f.owner.publish(completed(1)), second = await f.owner.publish(completed(2));
  await f.owner.select(first, 0);
  inject((op, file) => {
    if (op === "handle.writeFile" && file.includes("selected.visual.json.") && file.endsWith(".tmp")) throw new Error("pointer write failed");
  });
  await assert.rejects(f.owner.select(second, 1), refused("IO_UNCERTAIN"));
  inject();
  const lease = await f.owner.readSelected(1, 10);
  await delay3(20);
  assert.throws(() => lease.read("application.css"), refused("EXPIRED"));
  lease.dispose();
  assert.ok((await fs2.stat(path9.join(f.space, "sealed", "v1"))).isDirectory());
  assert.ok((await fs2.stat(path9.join(f.space, "sealed", "v2"))).isDirectory());
}));
test("commit cancellation race never auto-selects and visible seal always fully verifies", () => fixture(async (f) => {
  const abort = new AbortController();
  inject((op, file) => {
    if (op === "rename" && file.endsWith(path9.join("sealed", "v1"))) setTimeout(() => abort.abort(), 0);
  });
  let id;
  try {
    id = await f.owner.publish(completed(), { signal: abort.signal });
  } catch (e) {
    assert.ok(e instanceof PresentationPublicationError);
    assert.equal(e.code, "CANCELED");
  }
  inject();
  await delay3(5);
  const sealed = await fs2.readdir(path9.join(f.space, "sealed"));
  assert.ok(sealed.length <= 1);
  if (id) {
    const lease = await f.owner.read(id, 1e3);
    lease.dispose();
  }
  await assert.rejects(f.owner.readSelected(1, 1e3), refused("UNSEALED"));
}));
test("pending journal and foreign lock refuse without replay, foreign unlink or PID probe", () => fixture(async (f) => {
  const journal = path9.join(f.ownerRoot, ".uib/transactions", "b".repeat(64), "pending.json");
  await fs2.mkdir(path9.dirname(journal), { recursive: true });
  await fs2.writeFile(journal, "{pending");
  await assert.rejects(f.owner.publish(completed()), refused("RECOVERY_REQUIRED"));
  assert.ok(!events.some((e) => e.op === "readFile" && e.file === journal));
  await fs2.rm(journal);
  const lock = path9.join(f.graphRoot, ".uib/locks", storageKey("visual-runtime-graph-v1") + ".lock");
  await fs2.mkdir(path9.dirname(lock), { recursive: true });
  await fs2.writeFile(lock, "7654321");
  configure(f.root);
  await assert.rejects(f.owner.publish(completed(), { timeoutMs: 30 }), refused("BUSY"));
  assert.equal(await fs2.readFile(lock, "utf8"), "7654321");
  assert.ok(!events.some((e) => e.op === "rm"));
}));
test("bounded canceled queued request, invalid owner and unsupported inputs cannot publish", () => fixture(async (f) => {
  let enter, release;
  const ready = new Promise((r) => enter = r), held = new Promise((r) => release = r), holder = withRoleBundleGraph(f.graphRoot, async () => {
    enter();
    await held;
  }, { recovery: "refuse" });
  await ready;
  const a = new AbortController(), pending = f.owner.publish(completed(), { signal: a.signal });
  a.abort();
  await assert.rejects(pending, refused("CANCELED"));
  release();
  await holder;
  await assert.rejects(createPresentationPublicationOwner({ root: f.ownerRoot, graphRoot: f.graphRoot, owner: { kind: "application", id: "folder-label" } }), refused("INVALID_INPUT"));
  await assert.rejects(f.owner.publish({ ...completed(), producer: "draft-save" }), refused("UNSUPPORTED_PRODUCER"));
  await assert.rejects(f.owner.publish(completed(), { timeoutMs: 0 }), refused("INVALID_INPUT"));
  await assert.rejects(f.owner.read("mutable-current-version", 1e3), refused("INVALID_INPUT"));
}));
test("actual Application settings shape is preserved; invented UUID settings and composed standard template refuse", () => fixture(async (f) => {
  const invented = completed();
  invented.files.set("app.settings.json", encoded({ appId, name: "Invented shape" }));
  await assert.rejects(f.owner.publish(invented), refused("INVALID_INPUT"));
  const composed = completed();
  composed.files.set("app.settings.json", await fs2.readFile(path9.resolve(process.cwd(), "templates/standard/files/app.settings.json")));
  await assert.rejects(f.owner.publish(composed), refused("INVALID_INPUT", "UNSUPPORTED_CONTENT"));
  const id = await f.owner.publish(completed()), lease = await f.owner.read(id, 1e3);
  const settings = JSON.parse(Buffer.from(lease.read("app.settings.json")).toString("utf8"));
  assert.equal(settings.appId, void 0);
  assert.equal(settings.application.status, "active");
  lease.dispose();
}));
