// tests/d6-r1/recovery-free.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import * as fs2 from "node:fs/promises";
import path7 from "node:path";
import os from "node:os";

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

// packages/artifacts/src/storage.ts
import path4 from "node:path";
import { createHash as createHash2, randomUUID as randomUUID2 } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { setTimeout as delay2 } from "node:timers/promises";

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
var storageKey = (id) => createHash2("sha256").update(id).digest("hex");
var ArtifactConflictError = class extends Error {
  constructor() {
    super("Artifact changed since it was loaded. Reload before saving.");
    this.name = "ArtifactConflictError";
  }
};
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
  const check2 = () => options.signal?.throwIfAborted();
  check2();
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
      check2();
      if (budget > 0 && remaining() <= 0) throw contention;
      let entered = false;
      try {
        return await acquireArtifactLock(root2, bundle, async () => {
          check2();
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
        check2();
        if (!(error instanceof ArtifactBusyError) || remaining() <= 0) throw error;
        contention = error;
        try {
          await delay2(Math.min(25, remaining()), void 0, { signal: options.signal });
        } catch (waitingError) {
          check2();
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
async function commitTransaction(root2, bundle, original, staged, options = {}) {
  if (checksum(await (options.capture?.() ?? capture(bundle, Object.keys(original)))) !== checksum(original))
    throw new ArtifactConflictError();
  const directory = await storageDirectory(
    root2,
    "transactions",
    storageKey(options.identity ?? bundle)
  );
  const journal = path4.join(directory, "pending.json");
  await atomicWriteText(journal, JSON.stringify({ original, ...options.identity ? { bundle, identity: options.identity } : {} }));
  try {
    await writeSnapshot(bundle, staged, options.beforeWrite);
    await rm2(journal);
  } catch (cause) {
    try {
      await writeSnapshot(bundle, original, options.beforeRollbackWrite);
      await rm2(journal);
    } catch (rollbackError) {
      throw new AggregateError(
        [cause, rollbackError],
        "Commit and rollback failed; recovery journal retained."
      );
    }
    options.rollback?.();
    throw cause;
  }
}

// packages/artifacts/src/role-bundle.ts
import path5 from "node:path";
import { appendFileSync } from "node:fs";
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
  return locked(location, async (_, files) => project(files), options);
}
async function recoverRoleBundleRoot(ownerRoot, options = {}) {
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
function saveRoleBundle(location, input) {
  return locked(location, async (resolved, original) => {
    if (!input.expectedChecksum || checksum(original) !== input.expectedChecksum) throw new ArtifactConflictError();
    const staged = structuredClone(input.files);
    validateSnapshot(staged, resolved.paths);
    const candidate = project(staged), previous = project(original);
    await input.validate(structuredClone(candidate), structuredClone(previous));
    const current = () => capture(resolved.directory, resolved.paths, { includeManifest: false });
    if (checksum(await current()) !== previous.checksum) throw new ArtifactConflictError();
    await input.admit();
    if (checksum(await current()) !== previous.checksum) throw new ArtifactConflictError();
    if (candidate.checksum === previous.checksum) return previous;
    try {
      await commitTransaction(resolved.root, resolved.directory, original, staged, {
        identity: resolved.identity,
        capture: current,
        beforeWrite: input.beforeWrite,
        beforeRollbackWrite: input.beforeRollbackWrite
      });
    } catch (error) {
      if (error instanceof AggregateError) throw new RoleBundleRecoveryRequiredError(error);
      throw error;
    }
    const committed = project(await current());
    if (committed.checksum !== candidate.checksum) throw new ArtifactConflictError();
    return committed;
  });
}

// packages/visual-artifacts/src/runtime-read-admission.ts
async function withRuntimeGraphRead(ownerRoot, capture2, options = {}) {
  return withRoleBundleGraph(ownerRoot, capture2, options);
}

// src/server/visual-artifacts.ts
import { createHash as createHash3, randomUUID as randomUUID3 } from "node:crypto";
import path6 from "node:path";

// packages/visual-artifacts/src/source.ts
var voidTags = new Set("area base br col embed hr img input link meta param source track wbr".split(" "));
var optionalTags = new Set("p li dt dd rt rp option optgroup thead tbody tfoot tr td th".split(" "));
var blockTags = new Set("address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hr main nav ol p pre section table ul".split(" "));
var escapeAttribute = (value) => value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
var decode = (value) => value.replaceAll("&quot;", '"').replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
function parseSource(source) {
  const nodes = [], stack = [], diagnostics = [];
  const implicitClose = (offset) => {
    const node = stack.pop();
    node.closeStart = offset;
    node.end = offset;
    node.manual = true;
    diagnostics.push({ severity: "warning", message: `Implicitly closed ${node.tag} is preserved as a manual region.`, node: node.id });
  };
  const token = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][\w:-]*(?:\s+(?:[^>"']|"[^"]*"|'[^']*')*)?\s*\/?>|(<\/?[A-Za-z][\w:-]*[^<>]*(?:>|(?=<)|$)|<(?:\s+\/?[A-Za-z]|\/\s+[A-Za-z]|[0-9])[^<>]*\bdata-uip-(?:node|component)\b[^<>]*(?:>|(?=<)|$)|<!--[\s\S]*$|<![^>]*$|<\?[^>]*(?:>|$))/gi;
  let match;
  while (match = token.exec(source)) {
    const raw = match[0];
    if (match[1]) {
      diagnostics.push({ severity: "error", message: `Malformed opening tag at offset ${match.index}.` });
      continue;
    }
    if (raw.startsWith("<!")) continue;
    const tag = /^<\/?([\w:-]+)/.exec(raw)[1].toLowerCase();
    if (raw.startsWith("</")) {
      if (!/^<\/[\w:-]+\s*>$/.test(raw)) diagnostics.push({ severity: "error", message: `Malformed closing tag at offset ${match.index}.` });
      while (stack.length && stack.at(-1).tag !== tag && optionalTags.has(stack.at(-1).tag)) implicitClose(match.index);
      const node2 = stack.at(-1);
      if (!node2 || node2.tag !== tag) {
        diagnostics.push({ severity: "error", message: `Unmatched closing tag ${tag}. Visual editing requires explicit balanced markup.` });
        continue;
      }
      node2.closeStart = match.index;
      node2.end = token.lastIndex;
      stack.pop();
      continue;
    }
    while (stack.length) {
      const top = stack.at(-1).tag;
      const closes = top === "p" && blockTags.has(tag) || ["li", "option", "optgroup", "tr", "thead", "tbody", "tfoot"].includes(top) && top === tag || ["dt", "dd"].includes(top) && ["dt", "dd"].includes(tag) || ["td", "th"].includes(top) && ["td", "th"].includes(tag);
      if (!closes) break;
      implicitClose(match.index);
    }
    const attributes = {};
    const selfClosing = raw.endsWith("/>");
    const attrs = raw.slice(tag.length + 1, selfClosing ? -2 : -1);
    const attribute = /\s+([^\s=/'"><`&]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/y;
    const identities = /* @__PURE__ */ new Set();
    let cursor = 0;
    while (cursor < attrs.length && !/^\s*$/.test(attrs.slice(cursor))) {
      attribute.lastIndex = cursor;
      const attr = attribute.exec(attrs);
      if (!attr) {
        diagnostics.push({ severity: "error", message: `Malformed or unsupported attributes at offset ${match.index + tag.length + 1 + cursor}.` });
        break;
      }
      cursor = attribute.lastIndex;
      const folded = attr[1].replace(/[A-Z]/g, (letter) => letter.toLowerCase());
      const identity = folded === "data-uip-node" || folded === "data-uip-component";
      const name = identity ? folded : attr[1];
      const value = attr[2] ?? attr[3] ?? attr[4];
      if (identity) {
        if (identities.has(name)) {
          diagnostics.push({ severity: "error", message: `Duplicate identity attribute ${name} at offset ${match.index}.` });
          continue;
        }
        identities.add(name);
        if (!value || /&(?!(?:quot|lt|gt|amp);)/.test(value) || selfClosing && attr[4] !== void 0 && cursor === attrs.length) {
          diagnostics.push({ severity: "error", message: `Malformed or unsupported identity value for ${name} at offset ${match.index}.` });
          continue;
        }
      }
      const ordinarySlash = !identity && selfClosing && attr[4] !== void 0 && cursor === attrs.length ? "/" : "";
      Object.defineProperty(attributes, name, { value: decode(value ?? "") + ordinarySlash, writable: true, enumerable: true, configurable: true });
    }
    const node = { id: attributes["data-uip-node"], tag, attributes, start: match.index, openEnd: token.lastIndex, closeStart: token.lastIndex, end: token.lastIndex, parent: stack.at(-1), children: [], manual: !attributes["data-uip-node"] };
    node.parent?.children.push(node);
    nodes.push(node);
    if (["script", "style", "textarea"].includes(tag)) {
      if (identities.size) diagnostics.push({ severity: "error", message: `Managed identity is unsupported on raw-text ${tag} at offset ${match.index}.` });
      const close = new RegExp(`</${tag}\\s*>`, "ig");
      close.lastIndex = token.lastIndex;
      const ending = close.exec(source);
      if (ending) {
        node.closeStart = ending.index;
        node.end = close.lastIndex;
        token.lastIndex = close.lastIndex;
      } else diagnostics.push({ severity: "error", message: `Unclosed ${tag}.` });
      node.manual = true;
    } else if (!voidTags.has(tag) && !raw.endsWith("/>")) stack.push(node);
  }
  while (stack.length && optionalTags.has(stack.at(-1).tag)) implicitClose(source.length);
  for (const node of stack) diagnostics.push({ severity: "error", message: `Unclosed ${node.tag}.` });
  const ids = /* @__PURE__ */ new Set();
  for (const node of nodes) if (node.id) {
    if (!/^[A-Za-z][\w-]*$/.test(node.id) || ids.has(node.id)) diagnostics.push({ severity: "error", message: `Invalid or duplicate node ID: ${node.id}.`, node: node.id });
    ids.add(node.id);
    if (!isWrapper(node) && !isWrapper(node.parent)) diagnostics.push({ severity: "warning", message: "Layout is manual because this node has no Builder wrapper.", node: node.id });
  }
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) for (const node of nodes) {
    delete node.id;
    delete node.attributes["data-uip-node"];
    delete node.attributes["data-uip-component"];
    node.manual = true;
  }
  return { nodes, diagnostics };
}
function isWrapper(node) {
  return Boolean(node?.attributes.class?.split(/\s+/).includes("uip-layout-item"));
}

// packages/visual-artifacts/src/form.ts
function generateForm(metadata, dataset) {
  if (metadata.kind !== "component") throw new Error("Forms must be Platform Components.");
  if (dataset && (!dataset.dataset?.id || !Array.isArray(dataset.fields) || dataset.fields.some((f) => !/^[A-Za-z][\w]*$/.test(f.key) || !f.id))) throw new Error("Import a published Dataset schema with stable field IDs.");
  const fields = (dataset?.fields ?? []).filter((f) => ["string", "number", "integer", "boolean", "date"].includes(f.type)).map((f) => ({
    id: `field_${f.id}`,
    node: `control_${f.key}`,
    key: f.key,
    datasetFieldId: f.id,
    type: f.type === "number" || f.type === "integer" ? "number" : f.type === "boolean" ? "boolean" : "string",
    datasetRequired: f.required,
    required: f.required,
    label: f.key,
    default: f.default,
    visible: true,
    editable: true,
    ...f.type === "date" ? { codec: "date", help: "UTC timestamp, e.g. 2026-01-01T00:00:00.000Z. No date/time conversion is performed." } : {}
  }));
  metadata.capabilities = ["visual", "form"];
  metadata.modes = { default: "public", overrides: { public: {} } };
  metadata.form = { node: "form", datasetId: dataset?.dataset.id ?? "", primaryKey: dataset?.fields.find((f) => f.type === "id")?.key ?? "id", fields, submit: { service: "dataset.write", readService: "dataset.read" } };
  metadata.public = { properties: {
    mode: { type: "string", default: "public" },
    operation: { type: "string", enum: ["create", "edit"], default: "create" },
    recordId: { type: "string" },
    initialRecord: { type: "object" },
    readOnly: { type: "boolean", default: false },
    disabled: { type: "boolean", default: false }
  }, events: Object.fromEntries(["submitStarted", "submitSucceeded", "submitFailed", "recordCreated", "recordUpdated", "cancelRequested"].map((name) => [name, { payload: { result: { type: "object" } } }])), slots: [] };
  metadata.state = { ...metadata.state, values: {}, dirty: false, submitting: false, submitted: false, submitError: null, validation: {}, savedRecord: null };
  const controls = fields.map((f) => `<div class="uip-layout-item" data-uip-node="row_${f.key}"><${f.type === "number" ? "uib-forms-number" : f.type === "boolean" ? "uib-forms-checkbox" : f.key.toLowerCase().includes("email") ? "uib-forms-email" : "uib-forms-textbox"} data-uip-node="${f.node}" name="${f.key}" label="${escapeAttribute(f.label)}"></${f.type === "number" ? "uib-forms-number" : f.type === "boolean" ? "uib-forms-checkbox" : f.key.toLowerCase().includes("email") ? "uib-forms-email" : "uib-forms-textbox"}><span data-uip-field-error="${escapeAttribute(f.id)}" role="alert"></span></div>`).join("\n");
  return { metadata: JSON.stringify(metadata, null, 2) + "\n", source: `<section class="uip-layout-item" data-uip-node="content"><h2 data-uip-node="heading">${escapeAttribute(dataset?.dataset.name ?? "New")} form</h2><p data-uip-node="instructions">Complete the fields and submit to save.</p><uib-forms-form data-uip-node="form" label="${escapeAttribute(dataset?.dataset.name ?? "New")} form">
${controls}
</uib-forms-form><p data-uip-node="submit-error" role="alert"></p><pre data-uip-node="saved-result"></pre></section>
`, css: ":host{max-width:42rem} [hidden]{display:none!important} .uip-layout-item{margin-block:.75rem} [role=alert]{color:#a01818}\n", fixtures: "{}\n", code: "export {};\n" };
}

// packages/visual-artifacts/src/validation.ts
function parseMetadata(text) {
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Metadata must be an object.");
    return { metadata: value, diagnostics: [] };
  } catch (error) {
    return { diagnostics: [{ severity: "error", message: `Metadata: ${String(error)}` }] };
  }
}
function componentReferences(source) {
  return [...new Set(parseSource(source).nodes.map((n) => n.attributes["data-uip-component"]).filter(Boolean))];
}

// tests/d6-r1/unused-server.ts
var denied = () => {
  throw new Error("UNADMITTED_SERVER_OPERATION");
};
var moveToOsTrash = denied;
var platformRoot = "D6_R1_UNUSABLE_PLATFORM_ROOT";

// src/server/visual-artifacts.ts
var platformComponentsRoot = path6.join(platformRoot, "components");
var roles = { source: ".html", css: ".css", metadata: ".visual.json", fixtures: ".fixtures.json", code: ".functions.ts" };
var hash = (files) => createHash3("sha256").update(JSON.stringify(files)).digest("hex");
var VisualArtifactService = class {
  constructor(root2, kind, faults = {}) {
    this.root = root2;
    this.kind = kind;
    this.faults = faults;
  }
  root;
  kind;
  faults;
  async location(locator) {
    const file = await this.file(locator), stem = path6.basename(file, ".visual.json");
    return { root: this.root, directory: path6.dirname(file), anchor: path6.basename(file), paths: Object.values(roles).map((extension) => stem + extension) };
  }
  async file(locator, create = false) {
    if (!locator.endsWith(".visual.json") || locator.includes("\\") || locator.split("/").some((p) => !/^[a-zA-Z0-9_-]+(?:\.visual\.json)?$/.test(p))) throw new Error("Invalid Visual Artifact locator.");
    for (let ancestor = path6.resolve(this.root); ; ancestor = path6.dirname(ancestor)) {
      const info = await lstat2(ancestor).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (info?.isSymbolicLink()) throw new Error("Visual Artifact roots cannot contain symlinks.");
      if (path6.dirname(ancestor) === ancestor) break;
    }
    if (create) await mkdir2(this.root, { recursive: true });
    const resolvedRoot = await realpath2(this.root);
    let current = resolvedRoot;
    for (const segment of locator.split("/")) {
      current = path6.join(current, segment);
      const info = await lstat2(current).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (info?.isSymbolicLink()) throw new Error("Visual Artifact paths cannot contain symlinks.");
    }
    return realpath2(current).catch((error) => {
      if (error.code === "ENOENT") return current;
      throw error;
    });
  }
  async list(options = {}) {
    await recoverRoleBundleRoot(this.root, options);
    const locators = [];
    const walk = async (dir, prefix = "") => {
      for (const entry of await readdir2(dir, { withFileTypes: true }).catch((error) => {
        if (error.code === "ENOENT") return [];
        throw error;
      })) {
        if (entry.name.startsWith(".") || entry.isSymbolicLink()) continue;
        const relative = `${prefix}${entry.name}`;
        if (entry.isDirectory()) await walk(path6.join(dir, entry.name), `${relative}/`);
        else if (entry.name.endsWith(".visual.json")) locators.push(relative);
      }
    };
    await walk(this.root);
    const bundles = [];
    locators.sort();
    for (let offset = 0; offset < locators.length; offset += 4) {
      bundles.push(...await Promise.all(locators.slice(offset, offset + 4).map(async (locator) => {
        try {
          return await this.read(locator, options);
        } catch (error) {
          if (options.recovery === "refuse") throw error;
          return { locator, hash: "", files: { source: "", css: "", metadata: "", fixtures: "", code: "" }, diagnostics: [{ severity: "error", message: String(error) }] };
        }
      })));
    }
    for (const key of ["artifactId", "componentId"]) {
      const ids = /* @__PURE__ */ new Set();
      for (const bundle of bundles) {
        const id = bundle.metadata?.[key];
        if (id && ids.has(id)) bundles.filter((b) => b.metadata?.[key] === id).forEach((b) => b.diagnostics.push({ severity: "error", message: `Duplicate permanent identity: ${id}.` }));
        if (id) ids.add(id);
      }
    }
    return bundles;
  }
  async read(locator, options = {}) {
    const location = await this.location(locator), file = path6.join(location.directory, location.anchor);
    const stem = file.slice(0, -".visual.json".length);
    const files = {};
    const snapshot = await readRoleBundle(location, options);
    for (const [role, extension] of Object.entries(roles)) files[role] = snapshot.files[path6.basename(stem) + extension] ?? "";
    if (!files.metadata) throw new Error("Visual Artifact metadata is missing.");
    const parsed = parseMetadata(files.metadata);
    const diagnostics = [...parsed.diagnostics];
    if (parsed.metadata?.kind !== this.kind) diagnostics.push({ severity: "error", message: `Expected a ${this.kind} in this source location.` });
    if (!files.source) diagnostics.push({ severity: "error", message: "HTML source is missing or empty." });
    try {
      JSON.parse(files.fixtures || "{}");
    } catch {
      diagnostics.push({ severity: "error", message: "Preview fixtures are invalid JSON." });
    }
    return { locator, files, hash: hash(files), metadata: parsed.metadata, diagnostics };
  }
  async create(name, route, form, shellId, initialRegionId = "region-main", admit = async () => {
  }) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error("Use a lowercase name with letters, numbers, and hyphens.");
    const locator = `${name}/${this.kind}.visual.json`;
    const file = await this.file(locator, true);
    if (await lstat2(path6.dirname(file)).then(() => true, (error) => {
      if (error.code === "ENOENT") return false;
      throw error;
    })) throw new Error("An artifact folder already exists.");
    const temporary = path6.join(this.root, `.creating-${randomUUID3()}`);
    const metadata = { schemaVersion: 1, artifactId: `art_${randomUUID3()}`, kind: this.kind, name, displayName: name.replaceAll("-", " "), ...this.kind === "component" ? { componentId: `cmp_platform_${randomUUID3()}`, public: { properties: {}, events: {}, slots: [] } } : this.kind === "page" ? { route: route ?? `/${name}`, ...shellId ? { shellId, routeId: `route_${randomUUID3()}` } : {} } : {} };
    const files = form ? generateForm(metadata, form.dataset) : { source: `<section class="uip-layout-item" data-uip-node="node_${randomUUID3()}"></section>
`, css: "", metadata: JSON.stringify(metadata, null, 2) + "\n", fixtures: "{}\n", code: "export {};\n" };
    if (form?.authoring) {
      metadata.form.contractVersion = 1;
      files.metadata = JSON.stringify(metadata, null, 2) + "\n";
    }
    if (shellId || this.kind === "shell") files.source = initialRegionId ? `<main class="uip-layout-item" data-uip-node="node_${randomUUID3()}" data-uip-region="${initialRegionId}" data-uip-region-name="Main Content"></main>
` : "<!-- No Page Region overrides; use Shell defaults. -->\n";
    if (shellId) files.source = "<!-- No Page Region overrides; add a Region to replace or explicitly empty its Shell default. -->\n";
    await mkdir2(temporary);
    try {
      for (const [role, extension] of Object.entries(roles)) await atomicWriteText(path6.join(temporary, `${this.kind}${extension}`), files[role]);
      if (this.kind === "page") await atomicWriteText(path6.join(temporary, "index.ts"), pageEntry());
      await admit();
      await rename2(temporary, path6.dirname(file));
    } finally {
      await rm2(temporary, { recursive: true, force: true });
    }
    return this.read(locator);
  }
  async save(locator, role, content, expectedHash, admit) {
    if (!Object.hasOwn(roles, role) || typeof content !== "string" || !expectedHash) throw new Error("File role, text, and expected hash are required.");
    const current = await this.read(locator);
    return this.saveCandidate(locator, { ...current.files, [role]: content }, expectedHash, { repair: true, admit });
  }
  /** Complete source candidate; normal callers must supply authority and graph validation. */
  async saveCandidate(locator, files, expectedHash, options) {
    const location = await this.location(locator), original = await readRoleBundle(location), stem = path6.basename(location.anchor, ".visual.json");
    const previousFiles = Object.fromEntries(Object.entries(roles).map(([role, extension]) => [role, original.files[stem + extension] ?? ""]));
    if (!expectedHash || hash(previousFiles) !== expectedHash) throw Object.assign(new Error("Visual Artifact changed on disk. Reload or recover your editor changes before saving."), { status: 409 });
    const staged = structuredClone(files);
    if (Object.keys(staged).length !== Object.keys(roles).length || Object.keys(roles).some((role) => typeof staged[role] !== "string")) throw new Error("A complete Visual role candidate is required.");
    if (!options.repair && (!options.validate || !options.admit)) throw new Error("Normal Visual saves require complete validation and original authority admission.");
    await saveRoleBundle(location, {
      expectedChecksum: original.checksum,
      files: Object.fromEntries(Object.entries(roles).map(([role, extension]) => [stem + extension, staged[role]])),
      validate: async () => {
        const previous = parseMetadata(previousFiles.metadata).metadata, incoming = parseMetadata(staged.metadata);
        if (incoming.metadata && previous && ["artifactId", "componentId", "kind", "routeId"].some((key) => previous[key] && incoming.metadata[key] !== previous[key])) throw new Error("Artifact, Route and Component identities and kind are immutable.");
        if (!options.repair) {
          const diagnostics = [...incoming.diagnostics];
          if (incoming.metadata?.kind !== this.kind) diagnostics.push({ severity: "error", message: "Visual kind does not match its owner collection." });
          try {
            JSON.parse(staged.fixtures || "{}");
          } catch {
            diagnostics.push({ severity: "error", message: "Preview fixtures are invalid JSON." });
          }
          if (!previous) diagnostics.push({ severity: "error", message: "Restore the authoritative identity through Advanced Repair before normal editing." });
          if (diagnostics.some((d) => d.severity === "error")) throw Object.assign(new Error(diagnostics.map((d) => d.message).join(" ")), { status: 422 });
          await options.validate({ locator, files: staged, metadata: incoming.metadata, diagnostics, hash: hash(staged) });
        }
      },
      admit: async () => {
        await options.admit?.();
      },
      ...this.faults
    });
    return { locator, files: staged, metadata: parseMetadata(staged.metadata).metadata, diagnostics: parseMetadata(staged.metadata).diagnostics, hash: hash(staged) };
  }
  async remove(locator, expectedHash, knownArtifacts, admit = async () => {
  }) {
    const current = await this.read(locator);
    if (!expectedHash || current.hash !== expectedHash) throw new Error("Artifact changed. Reload before deletion.");
    const id = current.metadata?.componentId;
    const users = id ? knownArtifacts.filter((b) => b !== current && (componentReferences(b.files.source).includes(id) || b.metadata?.dependencies?.includes(id))) : [];
    if (users.length) throw new Error(`Component is used by: ${users.map((b) => b.locator).join(", ")}.`);
    const file = await this.file(locator);
    if (path6.basename(file) !== `${this.kind}.visual.json`) throw new Error("Delete manually placed artifact files through source control.");
    await admit();
    if ((await this.read(locator)).hash !== expectedHash) throw Object.assign(new Error("Artifact changed during deletion admission."), { status: 409 });
    await moveToOsTrash(path6.dirname(file));
  }
};
function pageEntry() {
  return `import source from './page.html?raw';
import css from './page.css?raw';
import metadata from './page.visual.json';
import * as functions from './page.functions';
import { components, packages } from 'virtual:uip-visual-artifacts';
import { createVisualPage } from '@ui-platform/visual-artifacts/runtime';
import type { ArtifactMetadata } from '@ui-platform/visual-artifacts';
export const route = metadata.route;
export const title = metadata.displayName;
import { createApplicationDataServices } from '@uib/platform-core/application-data';
export const { render } = createVisualPage({ source, css, metadata: metadata as ArtifactMetadata, functions }, { components, packages, services: createApplicationDataServices() });
`;
}

// tests/d6-r1/recovery-free.test.ts
var refuse = { recovery: "refuse", timeoutMs: 40 };
var probes = 0;
var originalKill = process.kill;
process.kill = (() => {
  probes++;
  throw Object.assign(new Error("injected dead fixture owner"), { code: "ESRCH" });
});
process.env.UI_GRAPH_LOCK_TRACE = "0";
delete process.env.UI_GRAPH_LOCK_METRICS;
test.after(() => {
  process.kill = originalKill;
});
async function fixture(run) {
  const f = await setup();
  try {
    await run(f);
  } finally {
    inject();
    assert.ok(path7.resolve(f.root).startsWith(path7.resolve(os.tmpdir()) + path7.sep + "d6-r1-"));
    await fs2.rm(f.root, { recursive: true, force: true });
  }
}
async function setup() {
  const root2 = await fs2.mkdtemp(path7.join(os.tmpdir(), "d6-r1-"));
  const directory = path7.join(root2, "one");
  await fs2.mkdir(directory);
  const files = { "page.html": '<section data-uip-node="saved-card"></section>\n', "page.css": "", "page.visual.json": JSON.stringify({ schemaVersion: 1, artifactId: "original-page", kind: "page", name: "one", displayName: "One", route: "/one" }), "page.fixtures.json": "{}", "page.functions.ts": "export {};\n" };
  for (const [name, value] of Object.entries(files)) await fs2.writeFile(path7.join(directory, name), value);
  const location = { root: root2, directory, anchor: "page.visual.json", paths: Object.keys(files) };
  const identity = await fs2.realpath(path7.join(directory, location.anchor));
  const lock = path7.join(root2, ".uib", "locks", storageKey(identity) + ".lock");
  const journal = path7.join(root2, ".uib", "transactions", storageKey(identity), "pending.json");
  configure(root2);
  return { root: root2, directory, files, location, identity, lock, journal, service: new VisualArtifactService(root2, "page") };
}
async function put(file, text) {
  await fs2.mkdir(path7.dirname(file), { recursive: true });
  await fs2.writeFile(file, text);
}
var code = (expected) => (error) => {
  assert.equal(error.code, expected);
  return true;
};
async function preserved(f) {
  for (const [name, value] of Object.entries(f.files)) assert.equal(await fs2.readFile(path7.join(f.directory, name), "utf8"), value);
}
test("healthy role, graph and actual Visual read/list preserve bytes/hash and release only own locks", () => fixture(async (f) => {
  const before = probes;
  const snapshot = await withRuntimeGraphRead(f.root, () => readRoleBundle(f.location, refuse), refuse);
  assert.deepEqual(snapshot.files, f.files);
  assert.equal((await readRoleBundle(f.location)).checksum, snapshot.checksum);
  const a = await f.service.read("one/page.visual.json", refuse);
  assert.equal(a.metadata?.artifactId, "original-page");
  assert.equal((await f.service.list(refuse))[0].hash, a.hash);
  assert.equal((await f.service.read("one/page.visual.json")).hash, a.hash);
  assert.equal(probes, before);
  await preserved(f);
  assert.deepEqual(await fs2.readdir(path7.dirname(f.lock)), []);
  const removed = events.filter((e) => e.op === "rm");
  assert.ok(removed.length > 0);
  assert.ok(removed.every((e) => e.file.endsWith(".lock")));
}));
test("valid foreign/dead owner remains busy without probe, callback, reclaim or guard", () => fixture(async (f) => {
  await put(f.lock, "7654321");
  const before = probes;
  let calls = 0;
  const started = performance.now();
  await assert.rejects(withArtifactLock(f.root, f.directory, async () => {
    calls++;
  }, f.identity, refuse), code("source.busy"));
  assert.ok(performance.now() - started < 1500);
  assert.equal(calls, 0);
  assert.equal(probes, before);
  assert.equal(await fs2.readFile(f.lock, "utf8"), "7654321");
  assert.ok(!events.some((e) => e.op === "rm" || e.file.endsWith(".recovery")) || !events.some((e) => e.op.startsWith("open") && e.file.endsWith(".recovery")));
  assert.ok(!events.some((e) => e.op === "rm"));
  await preserved(f);
}));
test("empty, malformed and ambiguous owner publication stays unresolved", () => fixture(async (f) => {
  const before = probes;
  for (const owner of ["", "0", "12\n", "1 2", "9007199254740993", "-1"]) {
    await put(f.lock, owner);
    await assert.rejects(readRoleBundle(f.location, { ...refuse, timeoutMs: 0 }), code("source.owner-unresolved"));
    assert.equal(await fs2.readFile(f.lock, "utf8"), owner);
  }
  assert.equal(probes, before);
  assert.ok(!events.some((e) => e.op === "rm"));
  await preserved(f);
}));
test("recovery guard and nonfile lock refuse before any acquisition or owner read", () => fixture(async (f) => {
  await put(f.lock + ".recovery", "opaque");
  await assert.rejects(readRoleBundle(f.location, refuse), code("source.admission-unsafe"));
  assert.ok(!events.some((e) => e.op.startsWith("open") || e.op === "rm"));
  await fs2.rm(f.lock + ".recovery");
  await fs2.mkdir(f.lock);
  await assert.rejects(readRoleBundle(f.location, refuse), code("source.admission-unsafe"));
}));
test("pending, malformed, legacy and missing-anchor journals refuse without reading or replaying bytes", () => fixture(async (f) => {
  for (const text of ["{bad", "{}", JSON.stringify({ bundle: f.directory, identity: f.identity, original: f.files })]) {
    await put(f.journal, text);
    configure(f.root);
    await assert.rejects(readRoleBundle(f.location, refuse), code("source.recovery-required"));
    await assert.rejects(f.service.list(refuse), code("source.recovery-required"));
    let calls = 0;
    await assert.rejects(withRoleBundleGraph(f.root, async () => {
      calls++;
    }, refuse), code("source.recovery-required"));
    assert.equal(calls, 0);
    assert.equal(await fs2.readFile(f.journal, "utf8"), text);
    assert.ok(!events.some((e) => e.op === "readFile" && e.file === f.journal));
    assert.ok(!events.some((e) => e.op === "rm" && !e.file.endsWith(".lock")));
    await preserved(f);
  }
  await fs2.rm(path7.join(f.directory, f.location.anchor));
  await assert.rejects(f.service.list(refuse), code("source.recovery-required"));
}));
test("unknown transaction membership and injected status failure are sanitized recovery refusals", () => fixture(async (f) => {
  await put(path7.join(f.root, ".uib", "transactions", "unlocatable"), "opaque");
  await assert.rejects(recoverRoleBundleRoot(f.root, refuse), code("source.recovery-required"));
  await fs2.rm(path7.join(f.root, ".uib", "transactions", "unlocatable"));
  inject((op, file) => {
    if (op === "readdir" && file.endsWith("transactions")) throw new Error("secret-owner-journal");
  });
  await assert.rejects(readRoleBundle(f.location, refuse), (error) => {
    assert.equal(error.code, "source.recovery-required");
    assert.equal(error.cause, void 0);
    assert.ok(!String(error).includes("secret"));
    return true;
  });
}));
test("default recovery mode still reclaims injected dead fixture lock and restores retained journal", () => fixture(async (f) => {
  await put(f.lock, "7654321");
  const before = probes;
  assert.deepEqual((await readRoleBundle(f.location)).files, f.files);
  assert.equal(probes, before + 1);
  await put(f.journal, JSON.stringify({ bundle: f.directory, identity: f.identity, original: f.files }));
  await fs2.writeFile(path7.join(f.directory, "page.html"), "interrupted");
  await recoverRoleBundleRoot(f.root);
  await preserved(f);
  await assert.rejects(fs2.stat(f.journal), { code: "ENOENT" });
}));
test("default save admission and normal source writing remain functional", () => fixture(async (f) => {
  const previous = await readRoleBundle(f.location);
  let validation = 0, admission = 0;
  const files = { ...f.files, "page.html": "ordinary saved edit" };
  const saved = await saveRoleBundle(f.location, { expectedChecksum: previous.checksum, files, validate() {
    validation++;
  }, admit() {
    admission++;
  } });
  assert.equal(validation, 1);
  assert.equal(admission, 1);
  assert.deepEqual(saved.files, files);
  assert.deepEqual((await readRoleBundle(f.location, refuse)).files, files);
}));
test("bounded queue contention and cancellation do not enter or jump a live holder", () => fixture(async (f) => {
  let release, entered;
  const ready = new Promise((r) => entered = r), hold = new Promise((r) => release = r);
  const first = withArtifactLock(f.root, f.directory, async () => {
    entered();
    await hold;
  }, f.identity, refuse);
  await ready;
  let calls = 0;
  const abort = new AbortController();
  const reason = new Error("fixture cancelled");
  const pending = withArtifactLock(f.root, f.directory, async () => {
    calls++;
  }, f.identity, { ...refuse, timeoutMs: 500, signal: abort.signal });
  abort.abort(reason);
  await assert.rejects(pending, (error) => error === reason);
  await assert.rejects(withArtifactLock(f.root, f.directory, async () => {
    calls++;
  }, f.identity, refuse), code("source.busy"));
  assert.equal(calls, 0);
  release();
  await first;
  await withArtifactLock(f.root, f.directory, async () => {
    calls++;
  }, f.identity, refuse);
  assert.equal(calls, 1);
}));
test("foreign contention cancellation and pre-abort preserve exact reason without mutation", () => fixture(async (f) => {
  await put(f.lock, "7654321");
  const abort = new AbortController();
  const reason = new Error("stop wait");
  const pending = readRoleBundle(f.location, { ...refuse, timeoutMs: 1e3, signal: abort.signal });
  setTimeout(() => abort.abort(reason), 15);
  await assert.rejects(pending, (error) => error === reason);
  configure(f.root);
  await assert.rejects(readRoleBundle(f.location, { ...refuse, signal: abort.signal }), (error) => error === reason);
  assert.ok(!events.some((e) => e.op.startsWith("open") || e.op === "rm"));
}));
test("callback error is returned once without acquisition retry", () => fixture(async (f) => {
  let calls = 0;
  const failure = new ArtifactBusyError();
  await assert.rejects(withArtifactLock(f.root, f.directory, async () => {
    calls++;
    throw failure;
  }, f.identity, { ...refuse, timeoutMs: 500 }), (error) => error === failure);
  assert.equal(calls, 1);
  assert.equal(events.filter((e) => e.op === "open:wx").length, 1);
}));
test("canonical role and graph identities, lock ordering and nested refusal remain exact", () => fixture(async (f) => {
  await withRoleBundleGraph(f.root, async () => {
    await readRoleBundle(f.location, refuse);
    await assert.rejects(withRoleBundleGraph(f.root, async () => {
    }, refuse), /order violation/);
  }, refuse);
  const opened = events.filter((e) => e.op === "open:wx").map((e) => path7.basename(e.file));
  assert.deepEqual(opened, [storageKey("visual-runtime-graph-v1") + ".lock", storageKey(f.identity) + ".lock"]);
  await withArtifactLock(f.root, f.directory, async () => {
    await assert.rejects(withRoleBundleGraph(f.root, async () => {
    }, refuse), /order violation/);
  }, f.identity, refuse);
  await assert.rejects(readRoleBundle({ ...f.location, paths: [...f.location.paths, "page.html"] }, refuse), /Unique safe role/);
  await assert.rejects(readRoleBundle({ ...f.location, root: f.directory, directory: f.root }, refuse), /outside its owner root/);
}));
test("cleanup failure prevents success and never reacquires admitted work", () => fixture(async (f) => {
  let calls = 0;
  const failure = new Error("injected uncertain close");
  inject((op, file) => {
    if (op === "handle.closed" && file === f.lock) throw failure;
  });
  await assert.rejects(withArtifactLock(f.root, f.directory, async () => {
    calls++;
    return "must not publish";
  }, f.identity, refuse), (error) => error === failure);
  assert.equal(calls, 1);
  assert.equal(events.filter((e) => e.op === "open:wx").length, 1);
  assert.ok(!events.some((e) => e.op === "rm"));
  assert.equal(await fs2.readFile(f.lock, "utf8"), String(process.pid));
}));
test("Visual list refuses a locked sibling and preserves default diagnostic behavior", () => fixture(async (f) => {
  await put(f.lock, "7654321");
  await assert.rejects(f.service.list(refuse), code("source.busy"));
  await fs2.rm(f.lock);
  await fs2.writeFile(path7.join(f.directory, "page.visual.json"), "malformed");
  const listed = await f.service.list(refuse);
  assert.ok(listed[0].diagnostics.some((d) => d.severity === "error"));
  await fs2.rm(path7.join(f.directory, "page.visual.json"));
  assert.deepEqual(await f.service.list(refuse), []);
}));
test("invalid recovery mode refuses before coordination, and signal abort during root check stops capture", () => fixture(async (f) => {
  await assert.rejects(withArtifactLock(f.root, f.directory, async () => {
  }, f.identity, { recovery: "other" }), /Invalid artifact recovery mode/);
  assert.equal(events.length, 0);
  const abort = new AbortController(), reason = new Error("root check aborted");
  inject((op, file) => {
    if (op === "readdir" && file.endsWith("transactions")) abort.abort(reason);
  });
  await assert.rejects(readRoleBundle(f.location, { ...refuse, signal: abort.signal }), (error) => error === reason);
  assert.ok(!events.some((e) => e.op === "readFile" && e.file.endsWith("page.html")));
}));
