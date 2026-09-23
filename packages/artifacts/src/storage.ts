import {
  mkdir,
  open,
  readFile,
  rename,
  rm,
  lstat,
  link,
  chmod,
} from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
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
async function atomicWrite(file: string, content: string): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  const handle = await open(temp, "wx");
  try {
    await handle.writeFile(content, "utf8");
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temp, file);
  } finally {
    await rm(temp, { force: true });
  }
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
    if (content === null) await rm(file, { force: true });
    else await atomicWrite(file, content);
  }
}
const localLocks = new Map<string, Promise<void>>();
export async function withArtifactLock<T>(
  root: string,
  bundle: string,
  run: () => Promise<T>,
): Promise<T> {
  const key = path.join(root, storageKey(bundle));
  const previous = localLocks.get(key) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  localLocks.set(key, current);
  await previous;
  try {
    return await acquireArtifactLock(root, bundle, run);
  } finally {
    release();
    if (localLocks.get(key) === current) localLocks.delete(key);
  }
}
async function acquireArtifactLock<T>(
  root: string,
  bundle: string,
  run: () => Promise<T>,
): Promise<T> {
  const directory = await storageDirectory(root, "locks");
  const file = path.join(directory, `${storageKey(bundle)}.lock`);
  // No timed lock stealing: slow writers must not lose their locks.
  let handle;
  try {
    handle = await open(file, "wx");
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "EEXIST") throw e;
    const owner = Number(await readFile(file, "utf8"));
    if (!Number.isInteger(owner) || owner <= 0)
      throw new Error(
        "Artifact lock is incomplete; operator recovery is required.",
      );
    try {
      process.kill(owner, 0);
    } catch (probe) {
      if ((probe as NodeJS.ErrnoException).code !== "ESRCH")
        throw new Error("Artifact is locked by another writer.");
      // A separate recovery lock prevents two recoverers from removing a new live lock.
      const recovery = await open(`${file}.recovery`, "wx");
      try {
        if (Number(await readFile(file, "utf8")) !== owner)
          throw new Error("Artifact lock changed; retry.");
        await rm(file);
        handle = await open(file, "wx");
      } finally {
        await recovery.close();
        await rm(`${file}.recovery`, { force: true });
      }
    }
    if (!handle) throw new Error("Artifact is locked by another writer.");
  }
  try {
    await handle.writeFile(String(process.pid));
    await handle.sync();
    return await run();
  } finally {
    await handle.close();
    await rm(file, { force: true });
  }
}
export async function recoverTransaction(
  root: string,
  bundle: string,
): Promise<boolean> {
  const directory = await storageDirectory(
    root,
    "transactions",
    storageKey(bundle),
  );
  const journal = path.join(directory, "pending.json");
  let pending: { original: Snapshot };
  try {
    pending = JSON.parse(await readFile(journal, "utf8"));
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw e;
  }
  await writeSnapshot(bundle, pending.original);
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
  } = {},
): Promise<void> {
  if (
    checksum(await capture(bundle, Object.keys(original))) !==
    checksum(original)
  )
    throw new ArtifactConflictError();
  const directory = await storageDirectory(
    root,
    "transactions",
    storageKey(bundle),
  );
  const journal = path.join(directory, "pending.json");
  await atomicWrite(journal, JSON.stringify({ original }));
  try {
    await writeSnapshot(bundle, staged, options.beforeWrite);
    await rm(journal);
  } catch (cause) {
    try {
      await writeSnapshot(bundle, original);
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
