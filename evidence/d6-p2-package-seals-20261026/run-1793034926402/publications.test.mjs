// tests/d6-p2/publications.test.ts
import test from "node:test";
import assert from "node:assert/strict";
import * as fs2 from "node:fs/promises";
import path7 from "node:path";
import { createHash as createHash4 } from "node:crypto";
import { setTimeout as delay3 } from "node:timers/promises";

// src/server/package-publications.ts
import path6 from "node:path";
import { createHash as createHash3, randomUUID as randomUUID3 } from "node:crypto";

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

// src/server/package-publication-profile.ts
var nativeCardPublicationProfile = {
  "schema": "native-card-owner-profile-v1",
  "componentId": "cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1",
  "packageId": "@ui-base/ui",
  "packageVersion": "0.5.1",
  "definitionRevision": null,
  "definitionDigest": "sha256:9445a78d24cf269e3c89193362f17f384f7786550952e0e27dff52d0c7293656",
  "definitionBinding": {
    "schemaVersion": "1.0.0",
    "ownership": {
      "scope": "platform",
      "package": {
        "packageId": "@ui-base/ui",
        "scope": "platform",
        "version": "0.5.1"
      },
      "provenance": {
        "origin": "installed-package",
        "promotedFromComponentId": null,
        "promotedFromRevisionId": null
      }
    },
    "version": {
      "packageVersion": "0.5.1",
      "runtimeCompatibility": "^0.5.1",
      "revisionId": null
    },
    "implementation": {
      "type": "code",
      "tagName": "uib-card",
      "module": "./src/layout/uib-card.js",
      "importPath": "@ui-base/ui/card",
      "exportName": "UibCard",
      "runtimeBinding": {
        "kind": "custom-element",
        "tagName": "uib-card"
      },
      "aliases": [
        {
          "importPath": "@ui-base/ui",
          "exportName": "UibCard"
        },
        {
          "importPath": "@ui-base/ui/layout",
          "exportName": "UibCard"
        }
      ],
      "registrationSideEffects": [
        "uib-stack",
        "uib-grid",
        "uib-row",
        "uib-column",
        "uib-panel",
        "uib-card",
        "uib-dialog",
        "uib-accordion",
        "uib-tab",
        "uib-tab-panel",
        "uib-tabs",
        "uib-splitter",
        "uib-icon"
      ]
    }
  },
  "nativeAdmissionClosureDigest": "sha256:c5b2fe68d5ddeec6d2a5a4a9bdcbe78b1312dd1ddac4d8d716a103381a417227",
  "exports": {
    "card": "./src/layout/uib-card.js",
    "renderer": "./src/platform/renderer.js",
    "registry": "./src/platform/registry.js"
  },
  "resources": [
    {
      "id": "@ui-base/core/package.json",
      "sha256": "a6db0302261f806f3afe9a1becfe63c80d5abaa3c2717424b91c809eef068e98",
      "byteLength": 629,
      "mediaType": "application/json",
      "dependencies": []
    },
    {
      "id": "@ui-base/core/src/base-element.js",
      "sha256": "52beb5f85dbbdce865c2caab36ae061107a5c30b495a7956a4fae5c79074d097",
      "byteLength": 3277,
      "mediaType": "text/javascript",
      "dependencies": [
        "@ui-base/core/src/utils.js"
      ]
    },
    {
      "id": "@ui-base/core/src/index.js",
      "sha256": "70ec5f617b2621b342332d4eba03f0e36a2f05cff98e9b78ff8ae8d5bb7c155a",
      "byteLength": 167,
      "mediaType": "text/javascript",
      "dependencies": [
        "@ui-base/core/src/base-element.js",
        "@ui-base/core/src/localization.js",
        "@ui-base/core/src/metadata.js",
        "@ui-base/core/src/utils.js",
        "@ui-base/core/src/validation.js"
      ]
    },
    {
      "id": "@ui-base/core/src/localization.js",
      "sha256": "807d5f64a177486fd4dcd46fa9f1d4b8cbcd538f2c9e8997d21cec94c60ff08f",
      "byteLength": 2018,
      "mediaType": "text/javascript",
      "dependencies": []
    },
    {
      "id": "@ui-base/core/src/metadata.js",
      "sha256": "0b1f41d5513f349f6a670e51046acb10e4b325965b13ebe30ebeecd75041abca",
      "byteLength": 647,
      "mediaType": "text/javascript",
      "dependencies": []
    },
    {
      "id": "@ui-base/core/src/utils.js",
      "sha256": "ec86d7b9553f35310e0f9b22fdcd1d86c7c33edea0aa81695f8142e120f8c9e1",
      "byteLength": 6535,
      "mediaType": "text/javascript",
      "dependencies": []
    },
    {
      "id": "@ui-base/core/src/validation.js",
      "sha256": "1c3b3e584a4fcdc5632337c686b8875fbf0fbb19dbf0d08c46d4510fc732d0f4",
      "byteLength": 3321,
      "mediaType": "text/javascript",
      "dependencies": []
    },
    {
      "id": "@ui-base/icons/package.json",
      "sha256": "ba6d6d2513977cc66dd5294284990f74c30a3412d76ad804ca2aeb41d7061257",
      "byteLength": 533,
      "mediaType": "application/json",
      "dependencies": []
    },
    {
      "id": "@ui-base/icons/src/icon-registry.js",
      "sha256": "a8096cac3b75e52dde86be549165ab73b8d1f73d33b6c89f56cec4cf73b614f3",
      "byteLength": 2512,
      "mediaType": "text/javascript",
      "dependencies": []
    },
    {
      "id": "@ui-base/icons/src/uib-icon.js",
      "sha256": "e45128cc6dc41dea18dd0181746300004344cb38a1dc728e6db7043ff0222b30",
      "byteLength": 2388,
      "mediaType": "text/javascript",
      "dependencies": [
        "@ui-base/core/src/index.js",
        "@ui-base/icons/src/icon-registry.js"
      ]
    },
    {
      "id": "@ui-base/ui/package.json",
      "sha256": "308a510a0ffb8693bb9c93dee15e406ecf9cb4f445cd9954a74b2d08b2cb8edd",
      "byteLength": 2511,
      "mediaType": "application/json",
      "dependencies": []
    },
    {
      "id": "@ui-base/ui/src/layout/index.js",
      "sha256": "e228e97fa0bc807ce9114827e569c04b0cd0809e688a57d1ea36e919575a538a",
      "byteLength": 33754,
      "mediaType": "text/javascript",
      "dependencies": [
        "@ui-base/core/src/index.js",
        "@ui-base/icons/src/uib-icon.js"
      ]
    },
    {
      "id": "@ui-base/ui/src/layout/uib-card.js",
      "sha256": "4f4317c5b07e3ac396f2283a9dd0a9b5063653ee9d9baf9a0778af0b7e82bf45",
      "byteLength": 39,
      "mediaType": "text/javascript",
      "dependencies": [
        "@ui-base/ui/src/layout/index.js"
      ]
    },
    {
      "id": "@ui-base/ui/src/platform/definition.js",
      "sha256": "89b56d0ecbf9db988b2743b9182c2057e10d5c452f13b5c81d24690e4769f2a2",
      "byteLength": 10865,
      "mediaType": "text/javascript",
      "dependencies": []
    },
    {
      "id": "@ui-base/ui/src/platform/registry.js",
      "sha256": "fdbd0bfd5278b417feeaafe0604738265acd35ec641a7c7352ef4f1376dc8f85",
      "byteLength": 3890,
      "mediaType": "text/javascript",
      "dependencies": [
        "@ui-base/ui/src/platform/definition.js"
      ]
    },
    {
      "id": "@ui-base/ui/src/platform/renderer.js",
      "sha256": "5c0201efc5f1ceccd8423a3873a4875c07b7550077dc811e8e10aa3ac22baae4",
      "byteLength": 4189,
      "mediaType": "text/javascript",
      "dependencies": [
        "@ui-base/ui/src/layout/uib-card.js",
        "@ui-base/ui/src/platform/definition.js"
      ]
    },
    {
      "id": "@ui-base/ui/ui.component.json",
      "sha256": "40aa778eb59a7fb06b3bb420d11798d351a201597b329ba8a6142b29f7052469",
      "byteLength": 28739,
      "mediaType": "application/json",
      "dependencies": []
    }
  ]
};
var nativeCardPublicationRevision = "d316d26927cd29f85dc8a79f975c40d80ef5091ad22ba54334555c7357f6229f";

// src/server/package-publications.ts
var PackagePublicationError = class extends Error {
  constructor(code) {
    super("Package publication unavailable: " + code);
    this.code = code;
    this.name = "PackagePublicationError";
  }
  code;
};
function fail(code) {
  throw new PackagePublicationError(code);
}
var hash = (value) => createHash3("sha256").update(value).digest("hex");
function canonical2(value) {
  return value === null || typeof value !== "object" ? JSON.stringify(value) : Array.isArray(value) ? "[" + value.map(canonical2).join(",") + "]" : "{" + Object.keys(value).sort().map((key) => JSON.stringify(key) + ":" + canonical2(value[key])).join(",") + "}";
}
function freeze(value) {
  if (value && typeof value === "object") {
    for (const item of Object.values(value)) freeze(item);
    Object.freeze(value);
  }
  return value;
}
var profile = freeze(JSON.parse(JSON.stringify(nativeCardPublicationProfile)));
var profileRevision = nativeCardPublicationRevision;
var validId = (id) => typeof id === "string" && /^pub_[a-f0-9]{64}$/.test(id);
function indexFor(owner) {
  return { schema: "package-publication-v1", owner, producer: "owner-staged-native-card-v1", profileRevision, implementation: {
    componentId: profile.componentId,
    packageId: profile.packageId,
    packageVersion: profile.packageVersion,
    definitionRevision: profile.definitionRevision,
    definitionDigest: profile.definitionDigest,
    definitionBinding: profile.definitionBinding,
    nativeAdmissionClosureDigest: profile.nativeAdmissionClosureDigest,
    exports: profile.exports
  }, resources: profile.resources };
}
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
    if (error instanceof PackagePublicationError) throw error;
    if (options.signal?.aborted) fail("CANCELED");
    const known = { "source.busy": "BUSY", "source.owner-unresolved": "OWNER_UNRESOLVED", "source.admission-unsafe": "UNSAFE", "source.recovery-required": "RECOVERY_REQUIRED", ENOENT: "UNSEALED" };
    fail(known[error?.code] ?? "IO_UNCERTAIN");
  }
}
function check2(signal) {
  if (signal?.aborted) fail("CANCELED");
}
async function canonicalRoot(root2) {
  for (let target = path6.resolve(root2); ; target = path6.dirname(target)) {
    if ((await lstat2(target)).isSymbolicLink()) fail("UNSAFE");
    if (path6.dirname(target) === target) break;
  }
  const resolved = await realpath2(root2);
  if (!(await lstat2(resolved)).isDirectory()) fail("UNSAFE");
  return resolved;
}
async function child(directory, name, create = false) {
  const target = path6.join(directory, name);
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
async function createPackagePublicationOwner(setup2) {
  return boundary({}, async () => {
    if (setup2.owner?.kind !== "application" || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(setup2.owner.id)) fail("INVALID_INPUT");
    if (hash(canonical2(profile)) !== profileRevision) fail("UNSUPPORTED_PRODUCER");
    const owner = freeze({ kind: "application", id: setup2.owner.id });
    const [root2, graphRoot] = await Promise.all([canonicalRoot(setup2.root), canonicalRoot(setup2.graphRoot)]);
    return new PackagePublicationOwner(root2, graphRoot, owner, construction);
  });
}
var construction = /* @__PURE__ */ Symbol("existing-package-owner");
var PackagePublicationOwner = class {
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
    return child(await child(this.root, ".uib", create), "package-publications-v1", create);
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
      if (input?.producer !== "owner-staged-native-card-v1" || input.revision !== profileRevision) fail("UNSUPPORTED_PRODUCER");
      if (!(input.files instanceof Map) || input.files.size !== profile.resources.length) fail("MEMBERSHIP_INVALID");
      const bytes = /* @__PURE__ */ new Map();
      for (const resource of profile.resources) {
        const value = input.files.get(resource.id);
        if (!(value instanceof Uint8Array)) fail("MEMBERSHIP_INVALID");
        const copy = new Uint8Array(value);
        if (copy.length !== resource.byteLength || hash(copy) !== resource.sha256) fail("CONTENT_CHANGED");
        bytes.set(resource.id, copy);
      }
      const index = canonical2(indexFor(this.owner)), publicationId = "pub_" + hash(index);
      return this.graph(options, async () => {
        const space = await this.namespace(true), sealed = await child(space, "sealed", true), staging = await child(space, "staging", true);
        const final = path6.join(sealed, publicationId);
        if (await lstat2(final).catch((error) => {
          if (error.code === "ENOENT") return void 0;
          throw error;
        })) fail("PUBLICATION_EXISTS");
        const candidate = await child(staging, randomUUID3(), true), blobs = await child(candidate, "bytes", true);
        const written = /* @__PURE__ */ new Set();
        for (const resource of profile.resources) {
          check2(options.signal);
          if (!written.has(resource.sha256)) {
            await exclusive(path6.join(blobs, resource.sha256), bytes.get(resource.id));
            written.add(resource.sha256);
          }
        }
        await exclusive(path6.join(candidate, "index.json"), index);
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
    const expected = canonical2(indexFor(this.owner));
    const text = await exactFile(path6.join(directory, "index.json"), Buffer.byteLength(expected), signal);
    if (hash(text) !== publicationId.slice(4) || Buffer.from(text).toString("utf8") !== expected) fail("CONTENT_CHANGED");
    const blobs = await child(directory, "bytes"), bytes = /* @__PURE__ */ new Map();
    if (canonical2((await readdir2(blobs)).sort()) !== canonical2([...new Set(profile.resources.map((resource) => resource.sha256))].sort())) fail("MEMBERSHIP_INVALID");
    for (const resource of profile.resources) {
      const content = await exactFile(path6.join(blobs, resource.sha256), resource.byteLength, signal);
      if (hash(content) !== resource.sha256) fail("CONTENT_CHANGED");
      bytes.set(resource.id, content);
    }
    return bytes;
  }
  async load(publicationId, signal) {
    if (!validId(publicationId)) fail("INVALID_INPUT");
    const space = await this.namespace(), sealed = await child(space, "sealed"), directory = await child(sealed, publicationId);
    return this.loadDirectory(directory, publicationId, signal);
  }
  lease(publicationId, bytes, leaseMs, signal) {
    const expiresAt = performance.now() + leaseMs;
    let disposed = false;
    const index = freeze(JSON.parse(canonical2(indexFor(this.owner))));
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
      return this.lease(publicationId, bytes, leaseMs, options.signal);
    }));
  }
  async selection(create, options, work) {
    const directory = await child(await this.namespace(create), "selection", create), file = path6.join(directory, "selected.visual.json");
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
        if (!previous || previous.schema !== "package-publication-selection-v1" || canonical2(previous.owner) !== canonical2(this.owner) || !Number.isSafeInteger(previous.generation) || previous.generation < 1 || !validId(previous.publicationId) || canonical2(previous) !== canonical2({ schema: previous.schema, owner: this.owner, generation: previous.generation, publicationId: previous.publicationId })) fail("CONTENT_CHANGED");
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
        const next = { schema: "package-publication-selection-v1", owner: this.owner, generation: expectedGeneration + 1, publicationId };
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
        return this.lease(previous.publicationId, bytes, leaseMs, options.signal);
      });
    }));
  }
};

// tests/d6-p2/publications.test.ts
var parent = path7.resolve(process.cwd(), "evidence/d6-p2-package-seals-20261026/disposable");
var appId = "4bdc70a0-9bb4-4bf1-9dd4-3abbaf59f220";
var traces = [];
var pidProbes = 0;
var originalKill = process.kill;
process.kill = (() => {
  pidProbes++;
  throw new Error("FORBIDDEN_PID_PROBE");
});
process.env.UI_GRAPH_LOCK_TRACE = "0";
delete process.env.UI_GRAPH_LOCK_METRICS;
test.after(async () => {
  process.kill = originalKill;
  assert.equal(pidProbes, 0);
  const file = process.env.D6_P2_TRACE_FILE;
  assert.ok(path7.resolve(file).startsWith(path7.resolve(process.cwd(), "evidence/d6-p2-package-seals-20261026") + path7.sep));
  await fs2.writeFile(file, JSON.stringify({ traces, pidProbes, nativeCodeExecuted: false }, null, 2));
});
async function setup() {
  await fs2.mkdir(parent, { recursive: true });
  const root2 = await fs2.mkdtemp(path7.join(parent, "owner-"));
  const ownerRoot = path7.join(root2, "owner"), graphRoot = path7.join(root2, "graph");
  await fs2.mkdir(ownerRoot);
  await fs2.mkdir(graphRoot);
  configure(root2);
  const owner = await createPackagePublicationOwner({ root: ownerRoot, graphRoot, owner: { kind: "application", id: appId } });
  const files = /* @__PURE__ */ new Map();
  for (const r of nativeCardPublicationProfile.resources) {
    const bytes = await fs2.readFile(path7.resolve(process.cwd(), "tests/d6-p2/bytes", r.sha256 + ".txt"));
    assert.equal(createHash4("sha256").update(bytes).digest("hex"), r.sha256);
    files.set(r.id, new Uint8Array(bytes));
  }
  const snapshot = { producer: "owner-staged-native-card-v1", revision: nativeCardPublicationRevision, files };
  const space = path7.join(ownerRoot, ".uib/package-publications-v1");
  return { root: root2, ownerRoot, graphRoot, owner, files, snapshot, space };
}
async function fixture(run) {
  const f = await setup();
  try {
    await run(f);
  } finally {
    traces.push({ fixture: f.root, events: [...events] });
    inject();
    assert.ok(path7.resolve(f.root).startsWith(parent + path7.sep + "owner-"));
    async function writable(dir) {
      for (const e of await fs2.readdir(dir, { withFileTypes: true })) {
        const p = path7.join(dir, e.name);
        if (e.isDirectory()) await writable(p);
        else await fs2.chmod(p, 438);
      }
    }
    await writable(f.root);
    await fs2.rm(f.root, { recursive: true, force: true });
  }
}
var refused = (expected) => (error) => {
  assert.ok(error instanceof PackagePublicationError);
  assert.equal(error.code, expected);
  assert.equal(error.cause, void 0);
  assert.ok(!String(error).includes(process.cwd()));
  return true;
};
var baseId = nativeCardPublicationProfile.resources[0].id;
async function publish(f) {
  return f.owner.publish(f.snapshot, { timeoutMs: 1e3 });
}
test("actual owner publishes complete pinned static closure and returns immutable copy-isolated lease", () => fixture(async (f) => {
  const id = await publish(f);
  assert.match(id, /^pub_[a-f0-9]{64}$/);
  const lease = await f.owner.read(id, 1e3);
  assert.equal(lease.index.owner.id, appId);
  assert.equal(lease.index.resources.length, 17);
  assert.equal(lease.index.implementation.componentId, nativeCardPublicationProfile.componentId);
  assert.equal(lease.index.implementation.definitionRevision, null);
  assert.equal(lease.index.implementation.definitionBinding.implementation.importPath, "@ui-base/ui/card");
  assert.equal(lease.index.implementation.definitionBinding.implementation.exportName, "UibCard");
  assert.equal(lease.index.implementation.definitionBinding.ownership.scope, "platform");
  assert.ok(Object.isFrozen(lease.index.resources));
  assert.ok(Object.isFrozen(lease.index.resources[0].dependencies));
  const bytes = lease.read(baseId), original = bytes[0];
  bytes[0] ^= 1;
  assert.equal(lease.read(baseId)[0], original);
  assert.deepEqual(lease.read(baseId), f.files.get(baseId));
  lease.dispose();
  assert.throws(() => lease.read(baseId), refused("DISPOSED"));
  assert.ok((await fs2.stat(path7.join(f.space, "sealed", id))).isDirectory());
}));
test("incomplete staging, missing seal and legacy mutable files cannot be read or promoted", () => fixture(async (f) => {
  const fake = "pub_" + "a".repeat(64);
  await fs2.mkdir(path7.join(f.space, "staging", fake), { recursive: true });
  await fs2.writeFile(path7.join(f.space, "staging", fake, "index.json"), "{}");
  await fs2.writeFile(path7.join(f.ownerRoot, "legacy-package.json"), '{"version":"0.5.1"}');
  await assert.rejects(f.owner.read(fake, 1e3), refused("UNSEALED"));
  await assert.rejects(f.owner.readSelected(1, 1e3), refused("UNSEALED"));
  assert.equal(await fs2.readFile(path7.join(f.ownerRoot, "legacy-package.json"), "utf8"), '{"version":"0.5.1"}');
}));
test("failed writes remain staged and invisible; no rollback, recovery or cleanup", () => fixture(async (f) => {
  inject((op, file) => {
    if (op === "handle.writeFile" && file.includes(path7.sep + "bytes" + path7.sep)) throw new Error("secret native file fault");
  });
  await assert.rejects(publish(f), refused("IO_UNCERTAIN"));
  inject();
  assert.equal((await fs2.readdir(path7.join(f.space, "sealed"))).length, 0);
  assert.equal((await fs2.readdir(path7.join(f.space, "staging"))).length, 1);
  assert.ok(!events.some((e) => e.op === "rm" && e.file.includes("package-publications-v1")));
}));
test("rename failure leaves completed candidate invisible without overwrite or retry", () => fixture(async (f) => {
  inject((op, file) => {
    if (op === "rename" && file.includes(path7.sep + "staging" + path7.sep)) throw new Error("rename rejected");
  });
  await assert.rejects(publish(f), refused("IO_UNCERTAIN"));
  inject();
  assert.deepEqual(await fs2.readdir(path7.join(f.space, "sealed")), []);
  assert.equal(events.filter((e) => e.op === "rename").length, 1);
}));
test("duplicate publication is never overwritten; same-version changed byte refuses", () => fixture(async (f) => {
  const id = await publish(f), index = await fs2.readFile(path7.join(f.space, "sealed", id, "index.json"));
  await assert.rejects(publish(f), refused("PUBLICATION_EXISTS"));
  f.files.get(baseId)[0] ^= 1;
  await assert.rejects(publish(f), refused("CONTENT_CHANGED"));
  assert.deepEqual(await fs2.readFile(path7.join(f.space, "sealed", id, "index.json")), index);
  assert.deepEqual(await fs2.readdir(path7.join(f.space, "sealed")), [id]);
}));
test("missing, duplicate effective membership, extra modules/assets and unsupported writer refuse", () => fixture(async (f) => {
  const original = f.files.get(baseId);
  f.files.delete(baseId);
  await assert.rejects(publish(f), refused("MEMBERSHIP_INVALID"));
  f.files.set(baseId, original);
  f.files.set("duplicate-card", original);
  await assert.rejects(publish(f), refused("MEMBERSHIP_INVALID"));
  f.files.delete("duplicate-card");
  f.files.set("external-image.png", original);
  await assert.rejects(publish(f), refused("MEMBERSHIP_INVALID"));
  f.files.delete("external-image.png");
  await assert.rejects(f.owner.publish({ ...f.snapshot, producer: "npm-discovery" }), refused("UNSUPPORTED_PRODUCER"));
  await assert.rejects(f.owner.publish({ ...f.snapshot, revision: "same-version-label" }), refused("UNSUPPORTED_PRODUCER"));
  assert.ok(!events.some((e) => e.op.startsWith("open")));
}));
test("Definition/export ambiguity or changed metadata cannot pass a pinned declaration", () => fixture(async (f) => {
  const definition = nativeCardPublicationProfile.resources.find((r) => r.id.endsWith("ui.component.json"));
  const packageJson = nativeCardPublicationProfile.resources.find((r) => r.id === "@ui-base/ui/package.json");
  for (const resource of [definition, packageJson]) {
    const before = f.files.get(resource.id);
    const value = JSON.parse(Buffer.from(before).toString("utf8"));
    if (resource === definition) value.components.push(value.components.find((c) => c.identity?.componentId === nativeCardPublicationProfile.componentId));
    else value.exports["./card"] = "./ambiguous.js";
    f.files.set(resource.id, Buffer.from(JSON.stringify(value)));
    await assert.rejects(publish(f), refused("CONTENT_CHANGED"));
    f.files.set(resource.id, before);
  }
}));
test("copy-before-await isolates staged snapshot from a competing mutable producer buffer", () => fixture(async (f) => {
  const promise = publish(f);
  f.files.get(baseId)[0] ^= 1;
  const id = await promise, lease = await f.owner.read(id, 1e3);
  assert.notDeepEqual(lease.read(baseId), f.files.get(baseId));
  lease.dispose();
}));
test("selection compare-and-set generation is separate from package installation; old lease retains exact bytes", () => fixture(async (f) => {
  const id = await publish(f), first = await f.owner.select(id, 0);
  assert.equal(first.generation, 1);
  assert.equal(first.owner.id, appId);
  const lease = await f.owner.readSelected(1, 1e3);
  const second = await f.owner.select(id, 1);
  assert.equal(second.generation, 2);
  await assert.rejects(f.owner.select(id, 1), refused("SELECTION_CHANGED"));
  await assert.rejects(f.owner.readSelected(1, 1e3), refused("SELECTION_CHANGED"));
  assert.deepEqual(lease.read(baseId), f.files.get(baseId));
  lease.dispose();
  assert.ok(!events.some((e) => /app\.manifest\.json|package\.json$/.test(e.file)));
}));
test("concurrent readers and selection writers serialize without mixed generation or seal deletion", () => fixture(async (f) => {
  const id = await publish(f);
  await f.owner.select(id, 0);
  const [a, b] = await Promise.all([f.owner.read(id, 1e3), f.owner.read(id, 1e3)]);
  const results = await Promise.allSettled([f.owner.select(id, 1), f.owner.select(id, 1)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected" && r.reason.code === "SELECTION_CHANGED").length, 1);
  assert.deepEqual(a.read(baseId), b.read(baseId));
  a.dispose();
  b.dispose();
  assert.ok(!events.some((e) => e.op === "rm" && e.file.includes(path7.sep + "sealed" + path7.sep)));
}));
test("sealed byte/index tampering or unexpected membership refuses; admitted memory lease is unchanged", () => fixture(async (f) => {
  const id = await publish(f), lease = await f.owner.read(id, 1e3), directory = path7.join(f.space, "sealed", id);
  const target = path7.join(directory, "bytes", nativeCardPublicationProfile.resources[0].sha256), original = await fs2.readFile(target);
  await fs2.chmod(target, 438);
  const changed = Buffer.from(original);
  changed[0] ^= 1;
  await fs2.writeFile(target, changed);
  await assert.rejects(f.owner.read(id, 1e3), refused("CONTENT_CHANGED"));
  assert.deepEqual(lease.read(baseId), new Uint8Array(original));
  lease.dispose();
  await fs2.writeFile(target, original);
  await fs2.writeFile(path7.join(directory, "bytes", "extra"), "unexpected");
  await assert.rejects(f.owner.read(id, 1e3), refused("MEMBERSHIP_INVALID"));
  await fs2.rm(path7.join(directory, "bytes", "extra"));
  const index = path7.join(directory, "index.json");
  await fs2.chmod(index, 438);
  await fs2.writeFile(index, "{}");
  await assert.rejects(f.owner.read(id, 1e3), refused("CONTENT_CHANGED"));
}));
test("cancellation before admission, during staging, during reads and after lease prevents late success", () => fixture(async (f) => {
  const pre = new AbortController();
  pre.abort();
  await assert.rejects(publishWith(pre.signal), refused("CANCELED"));
  async function publishWith(signal) {
    return f.owner.publish(f.snapshot, { signal });
  }
  const mid = new AbortController();
  inject((op, file) => {
    if (op === "handle.sync" && file.includes("package-publications-v1")) mid.abort();
  });
  await assert.rejects(publishWith(mid.signal), refused("CANCELED"));
  inject();
  assert.deepEqual(await fs2.readdir(path7.join(f.space, "sealed")), []);
  const id = await publish(f), readAbort = new AbortController();
  inject((op, file) => {
    if (op === "readFile" && file.includes(path7.sep + "bytes" + path7.sep)) readAbort.abort();
  });
  await assert.rejects(f.owner.read(id, 1e3, { signal: readAbort.signal }), refused("CANCELED"));
  inject();
  const after = new AbortController(), lease = await f.owner.read(id, 1e3, { signal: after.signal });
  after.abort();
  assert.throws(() => lease.read(baseId), refused("CANCELED"));
  lease.dispose();
}));
test("finite lease expiration/disposal never deletes retained publications or redirects to mutable source", () => fixture(async (f) => {
  const id = await publish(f), lease = await f.owner.read(id, 15);
  await delay3(25);
  assert.throws(() => lease.read(baseId), refused("EXPIRED"));
  lease.dispose();
  assert.ok((await fs2.stat(path7.join(f.space, "sealed", id))).isDirectory());
  const fresh = await f.owner.read(id, 1e3);
  assert.deepEqual(fresh.read(baseId), f.files.get(baseId));
  fresh.dispose();
  await assert.rejects(f.owner.read(id, 30001), refused("INVALID_INPUT"));
}));
test("pending journal and foreign/dead lock refuse without replay, foreign deletion or PID probes", () => fixture(async (f) => {
  const journal = path7.join(f.ownerRoot, ".uib/transactions", "b".repeat(64), "pending.json");
  await fs2.mkdir(path7.dirname(journal), { recursive: true });
  await fs2.writeFile(journal, "{interrupted secret");
  await assert.rejects(publish(f), refused("RECOVERY_REQUIRED"));
  assert.ok(!events.some((e) => e.op === "readFile" && e.file === journal));
  await fs2.rm(journal);
  const lock = path7.join(f.graphRoot, ".uib/locks", storageKey("visual-runtime-graph-v1") + ".lock");
  await fs2.mkdir(path7.dirname(lock), { recursive: true });
  await fs2.writeFile(lock, "7654321");
  configure(f.root);
  await assert.rejects(f.owner.publish(f.snapshot, { timeoutMs: 35 }), refused("BUSY"));
  assert.equal(await fs2.readFile(lock, "utf8"), "7654321");
  assert.ok(!events.some((e) => e.op === "rm"));
}));
test("bounded contention and canceled queued acquisition never publish or reacquire callback", () => fixture(async (f) => {
  let enter, release;
  const ready = new Promise((r) => enter = r), held = new Promise((r) => release = r);
  const holder = withRoleBundleGraph(f.graphRoot, async () => {
    enter();
    await held;
  }, { recovery: "refuse" });
  await ready;
  const abort = new AbortController(), pending = f.owner.publish(f.snapshot, { signal: abort.signal, timeoutMs: 500 });
  abort.abort();
  await assert.rejects(pending, refused("CANCELED"));
  await assert.rejects(f.owner.publish(f.snapshot, { timeoutMs: 30 }), refused("BUSY"));
  release();
  await holder;
  const id = await publish(f);
  assert.match(id, /^pub_/);
}));
test("invalid owner, unsupported profiles and invalid limits refuse without inventing identity", () => fixture(async (f) => {
  await assert.rejects(createPackagePublicationOwner({ root: f.ownerRoot, graphRoot: f.graphRoot, owner: { kind: "application", id: "directory-label" } }), refused("INVALID_INPUT"));
  await assert.rejects(f.owner.publish(f.snapshot, { timeoutMs: 5001 }), refused("INVALID_INPUT"));
  await assert.rejects(f.owner.publish(f.snapshot, { timeoutMs: 0 }), refused("INVALID_INPUT"));
  await assert.rejects(f.owner.read("live-package-path", 1e3), refused("INVALID_INPUT"));
}));
test("concurrent publishers cannot overwrite the same content identity", () => fixture(async (f) => {
  const results = await Promise.allSettled([publish(f), publish(f)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected" && r.reason.code === "PUBLICATION_EXISTS").length, 1);
  assert.equal((await fs2.readdir(path7.join(f.space, "sealed"))).length, 1);
}));
test("interrupted selection write preserves previous generation and seal without recovery", () => fixture(async (f) => {
  const id = await publish(f);
  await f.owner.select(id, 0);
  inject((op, file) => {
    if (op === "handle.writeFile" && file.includes("selected.visual.json.") && file.endsWith(".tmp")) throw new Error("interrupted pointer write");
  });
  await assert.rejects(f.owner.select(id, 1), refused("IO_UNCERTAIN"));
  inject();
  const lease = await f.owner.readSelected(1, 1e3);
  assert.equal(lease.publicationId, id);
  lease.dispose();
  await assert.rejects(f.owner.readSelected(2, 1e3), refused("SELECTION_CHANGED"));
}));
test("missing required sealed member or wrong original Application owner refuses", () => fixture(async (f) => {
  const id = await publish(f);
  const wrong = await createPackagePublicationOwner({ root: f.ownerRoot, graphRoot: f.graphRoot, owner: { kind: "application", id: "2bdc70a0-9bb4-4bf1-9dd4-3abbaf59f220" } });
  await assert.rejects(wrong.read(id, 1e3), refused("CONTENT_CHANGED"));
  const blob = path7.join(f.space, "sealed", id, "bytes", nativeCardPublicationProfile.resources[0].sha256);
  await fs2.chmod(blob, 438);
  await fs2.rm(blob);
  await assert.rejects(f.owner.read(id, 1e3), refused("MEMBERSHIP_INVALID"));
}));
test("cancellation racing after commit cannot select or return a late target; completed seal stays verifiable", () => fixture(async (f) => {
  const abort = new AbortController();
  inject((op, file) => {
    if (op === "rename" && file.includes(path7.sep + "sealed" + path7.sep)) setTimeout(() => abort.abort(), 0);
  });
  let completed;
  try {
    completed = await f.owner.publish(f.snapshot, { signal: abort.signal });
  } catch (error) {
    assert.ok(error instanceof PackagePublicationError);
    assert.equal(error.code, "CANCELED");
  }
  inject();
  await delay3(5);
  const sealed = await fs2.readdir(path7.join(f.space, "sealed"));
  assert.ok(sealed.length <= 1);
  if (completed) assert.equal(completed, sealed[0]);
  for (const id of sealed) {
    const lease = await f.owner.read(id, 1e3);
    assert.equal(lease.index.resources.length, 17);
    lease.dispose();
  }
  await assert.rejects(f.owner.readSelected(1, 1e3), refused("UNSEALED"));
}));
test("unsafe sealed namespace and uncertain lock cleanup refuse without a result", () => fixture(async (f) => {
  const id = await publish(f);
  inject((op, file) => {
    if (op === "handle.closed" && file.endsWith(storageKey("visual-runtime-graph-v1") + ".lock")) throw new Error("close outcome uncertain");
  });
  await assert.rejects(f.owner.read(id, 1e3), refused("IO_UNCERTAIN"));
  inject();
  const lock = path7.join(f.graphRoot, ".uib/locks", storageKey("visual-runtime-graph-v1") + ".lock");
  await fs2.rm(lock);
  const sealed = path7.join(f.space, "sealed");
  await fs2.rename(sealed, path7.join(f.space, "retained-sealed"));
  await fs2.writeFile(sealed, "not a directory");
  await assert.rejects(f.owner.read(id, 1e3), refused("UNSAFE"));
}));
