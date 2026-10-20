import {
  atomicWriteText as atomicWrite,
  retryWindowsFileOperation,
} from "./file-operations.js";
import {
  mkdir,
  open,
  readFile,
  rm,
  lstat,
  link,
  chmod,
  type FileHandle,
} from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { AsyncLocalStorage } from 'node:async_hooks';
import { setTimeout as delay } from 'node:timers/promises';
import { capture, checksum, safeFile, type Snapshot } from "./bundle.js";

export const storageKey = (id: string): string =>
  createHash("sha256").update(id).digest("hex");
export class ArtifactConflictError extends Error {
  constructor() {
    super("Artifact changed since it was loaded. Reload before saving.");
    this.name = "ArtifactConflictError";
  }
}

/** Refuse storage symlinks as well as bundle symlinks. */
export async function storageDirectory(
  root: string,
  ...segments: string[]
): Promise<string> {
  let dir = root;
  for (const segment of [".uib", ...segments]) {
    dir = path.join(dir, segment);
    await mkdir(dir, { recursive: true });
    if ((await lstat(dir)).isSymbolicLink())
      throw new Error(`Storage may not contain symbolic links: ${dir}`);
  }
  return dir;
}
/** Complete the snapshot before making its immutable name visible. */
export async function immutableWrite(
  file: string,
  content: string,
): Promise<void> {
  const temp = `${file}.${randomUUID()}.tmp`;
  const handle = await open(temp, "wx");
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await chmod(temp, 0o444);
    await link(temp, file); // Fails if the final name exists; never replaces an identity binding.
  } finally {
    await rm(temp, { force: true });
  }
}
async function writeSnapshot(
  bundle: string,
  snapshot: Snapshot,
  beforeWrite?: (file: string, index: number) => void | Promise<void>,
): Promise<void> {
  // Manifest goes last, so readers see new role mappings only after their files exist.
  const entries = Object.entries(snapshot).sort(([a], [b]) =>
    a === "artifact.json" ? 1 : b === "artifact.json" ? -1 : a.localeCompare(b),
  );
  for (let index = 0; index < entries.length; index++) {
    const [name, content] = entries[index];
    await beforeWrite?.(name, index);
    const file = await safeFile(bundle, name);
    if (content === null)
      await retryWindowsFileOperation(() => rm(file, { force: true }));
    else await atomicWrite(file, content);
  }
}
const localLocks = new Map<string, Promise<void>>();
const heldLocks = new AsyncLocalStorage<Array<{ key: string; active: boolean; graph: boolean }>>();
export class ArtifactBusyError extends Error {
  readonly code: string = 'source.busy';
  readonly status = 503;
  constructor() { super('Artifact is locked by another writer.'); }
}
export class ArtifactOwnerUnresolvedError extends ArtifactBusyError {
  override readonly code = 'source.owner-unresolved';
  constructor() {
    super();
    this.name = 'ArtifactOwnerUnresolvedError';
    this.message = 'Artifact lock ownership is unresolved; exclusive admission was not obtained.';
  }
}
export interface ArtifactLockOptions {
  /** Acquisition budget only; never interrupts or retries admitted work. */
  timeoutMs?: number;
  signal?: AbortSignal;
  observe?: (measurement: { waitMs: number; holdMs: number; acquired: boolean }) => void;
}
// Consumed only by withArtifactLock, before its retry/cancellation dispatch.
// The public outcome retains exact lone-error identity, including primitives.
class LockCleanupFailure {
  constructor(readonly outcome: unknown) {}
}
export async function withArtifactLock<T>(
  root: string,
  bundle: string,
  run: () => Promise<T>,
  identity = bundle,
  options: ArtifactLockOptions = {},
): Promise<T> {
  const key = path.join(root, storageKey(identity));
  const held = (heldLocks.getStore() ?? []).filter(lock => lock.active);
  if (held.some(lock => lock.key === key) || identity === 'visual-runtime-graph-v1' && held.length)
    throw new Error('Artifact lock order violation: nested or role-to-graph acquisition.');
  const started = performance.now();
  const budget = options.timeoutMs ?? 0;
  if (!Number.isFinite(budget) || budget < 0) throw new Error('Invalid artifact acquisition budget.');
  const remaining = () => Math.max(0, budget - (performance.now() - started));
  let acquiredAt: number | undefined;
  const check = () => options.signal?.throwIfAborted();
  check();
  const predecessor = localLocks.get(key);
  const previous = predecessor ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  localLocks.set(key, current);
  let queued = true;
  try {
    // A cancelled queue entry releases only after its predecessor; later callers
    // must never jump a live local holder.
    const cancellation = new AbortController();
    const abort = () => cancellation.abort(options.signal?.reason);
    options.signal?.addEventListener('abort', abort, { once: true });
    const timer = budget > 0 ? setTimeout(() => cancellation.abort(new ArtifactBusyError()), remaining()) : undefined;
    try {
      await Promise.race([previous, new Promise<never>((_, reject) => {
        cancellation.signal.addEventListener('abort', () => reject(cancellation.signal.reason), { once: true });
      })]);
    } finally {
      if (timer) clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
    queued = false;
    if (budget > 0 && remaining() <= 0) throw new ArtifactBusyError();
    // A continuously populated local queue must not reacquire in the tiny unlink
    // window forever while another process polls. Yield two polling intervals
    // before a queued graph handoff, still inside the same acquisition budget.
    if (predecessor && identity === 'visual-runtime-graph-v1') {
      await delay(Math.min(50, remaining()), undefined, { signal: options.signal });
    }
    let contention: ArtifactBusyError = new ArtifactBusyError();
    for (;;) {
      check();
      if (budget > 0 && remaining() <= 0) throw contention;
      let entered = false;
      try {
        return await acquireArtifactLock(root, bundle, async () => {
          check();
          if (budget > 0 && remaining() <= 0) throw new ArtifactBusyError();
          entered = true; acquiredAt = performance.now();
          const scope = { key, active: true, graph: identity === 'visual-runtime-graph-v1' };
          try { return await heldLocks.run([...held, scope], run); }
          finally { scope.active = false; }
        }, identity);
      } catch (error) {
        if (error instanceof LockCleanupFailure) throw error.outcome;
        if (entered) throw error;
        check();
        if (!(error instanceof ArtifactBusyError) || remaining() <= 0) throw error;
        contention = error;
        try { await delay(Math.min(25, remaining()), undefined, { signal: options.signal }); }
        catch (waitingError) { check(); throw waitingError; }
      }
    }
  } finally {
    if (queued) void previous.then(release); else release();
    void current.then(() => { if (localLocks.get(key) === current) localLocks.delete(key); });
    try { options.observe?.({ waitMs: (acquiredAt ?? performance.now()) - started,
      holdMs: acquiredAt === undefined ? 0 : performance.now() - acquiredAt, acquired: acquiredAt !== undefined }); }
    catch { /* Telemetry cannot affect admission or replay callbacks. */ }
  }
}
async function acquireArtifactLock<T>(
  root: string,
  bundle: string,
  run: () => Promise<T>,
  identity: string,
): Promise<T> {
  const directory = await storageDirectory(root, "locks");
  const file = path.join(directory, `${storageKey(identity)}.lock`);
  // No timed lock stealing: slow writers must not lose their locks.
  let handle: FileHandle | undefined;
  let hasPrimary = false;
  let primary: unknown;
  let result!: T;
  const cleanupFailures: Array<{ phase: string; error: unknown }> = [];
  const cleanup = async (owned: FileHandle, pathname: string, phase: string) => {
    try { await owned.close(); }
    catch (error) { cleanupFailures.push({ phase: phase + '.close', error }); return; }
    // A rejected close is uncertain, even if the native handle was closed.
    try { await rm(pathname, { force: true }); }
    catch (error) { cleanupFailures.push({ phase: phase + '.unlink', error }); }
  };
  // This scope owns every returned main handle, including a replacement whose
  // recovery guard fails to release before PID publication can begin.
  try {
    try {
      handle = await open(file, "wx");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
      const ownerText = async () => {
        try { return await readFile(file, 'utf8'); }
        catch (error) {
          // The previous holder can release between exclusive-open and owner read.
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new ArtifactBusyError();
          throw error;
        }
      };
      const parseOwner = (text: string) => {
        const owner = Number(text);
        if (!/^[1-9]\d*$/.test(text) || !Number.isSafeInteger(owner)) throw new ArtifactOwnerUnresolvedError();
        return owner;
      };
      // An unknown owner is never dead; retain the original guarded authority.
      const owner = parseOwner(await ownerText());
      try {
        process.kill(owner, 0);
      } catch (probe) {
        if ((probe as NodeJS.ErrnoException).code !== "ESRCH")
          throw new ArtifactBusyError();
        let recovery: FileHandle | undefined;
        try {
          recovery = await open(file + '.recovery', "wx").catch(error => {
            if (error.code === 'EEXIST') throw new ArtifactBusyError();
            throw error;
          });
          if (parseOwner(await ownerText()) !== owner) throw new ArtifactBusyError();
          try {
            await rm(file);
            handle = await open(file, "wx");
          } catch (error) {
            if (['ENOENT', 'EEXIST'].includes((error as NodeJS.ErrnoException).code ?? '')) throw new ArtifactBusyError();
            throw error;
          }
        } finally {
          if (recovery) await cleanup(recovery, file + '.recovery', 'guard');
        }
      }
      if (!handle) throw new ArtifactBusyError();
    }
    // Guard cleanup failure is a publication/admission barrier.
    if (cleanupFailures.length === 0) {
      await handle.writeFile(String(process.pid));
      await handle.sync();
      result = await run();
    }
  } catch (error) {
    hasPrimary = true;
    primary = error;
  } finally {
    if (handle) await cleanup(handle, file, 'main');
  }
  if (cleanupFailures.length) {
    const errors = [...(hasPrimary ? [primary] : []), ...cleanupFailures.map(f => f.error)];
    const outcome = errors.length === 1 ? errors[0] : new AggregateError(
      errors,
      (hasPrimary ? 'Artifact operation failed; ownership cleanup failed: ' : 'Artifact ownership cleanup failed: ') +
        cleanupFailures.map(f => f.phase).join(', ') + '.',
      { cause: hasPrimary ? primary : cleanupFailures[0].error },
    );
    throw new LockCleanupFailure(outcome);
  }
  if (hasPrimary) throw primary;
  return result;
}

export async function recoverTransaction(
  root: string,
  bundle: string,
  options: { identity?: string; validate?: (snapshot: Snapshot) => void; beforeWrite?: (file: string, index: number) => void | Promise<void> } = {},
): Promise<boolean> {
  const directory = await storageDirectory(
    root,
    "transactions",
    storageKey(options.identity ?? bundle),
  );
  const journal = path.join(directory, "pending.json");
  let pending: { original: Snapshot; bundle?: string; identity?: string };
  try {
    pending = JSON.parse(await readFile(journal, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw e;
  }
  if ((pending.bundle !== undefined && pending.bundle !== bundle) ||
      (pending.identity !== undefined && pending.identity !== options.identity))
    throw new Error("Source journal location does not match its recovery lock.");
  options.validate?.(pending.original);
  await writeSnapshot(bundle, pending.original, options.beforeWrite);
  await rm(journal);
  return true;
}
/** Caller holds the lock; pending.json survives a process crash until recovery. */
export async function commitTransaction(
  root: string,
  bundle: string,
  original: Snapshot,
  staged: Snapshot,
  options: {
    beforeWrite?: (file: string, index: number) => void | Promise<void>;
    rollback?: () => void;
    identity?: string;
    capture?: () => Promise<Snapshot>;
    beforeRollbackWrite?: (file: string, index: number) => void | Promise<void>;
  } = {},
): Promise<void> {
  if (
    checksum(await (options.capture?.() ?? capture(bundle, Object.keys(original)))) !==
    checksum(original)
  )
    throw new ArtifactConflictError();
  const directory = await storageDirectory(
    root,
    "transactions",
    storageKey(options.identity ?? bundle),
  );
  const journal = path.join(directory, "pending.json");
  await atomicWrite(journal, JSON.stringify({ original, ...(options.identity ? { bundle, identity: options.identity } : {}) }));
  try {
    await writeSnapshot(bundle, staged, options.beforeWrite);
    await rm(journal);
  } catch (cause) {
    try {
      await writeSnapshot(bundle, original, options.beforeRollbackWrite);
      await rm(journal);
    } catch (rollbackError) {
      throw new AggregateError(
        [cause, rollbackError],
        "Commit and rollback failed; recovery journal retained.",
      );
    }
    options.rollback?.();
    throw cause;
  }
}
