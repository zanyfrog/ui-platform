import {
  mkdir,
  open,
  readFile,
  readdir,
  rename,
  rm,
  lstat,
  link,
  chmod,
} from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { capture, checksum, safeFile, type Snapshot } from "./bundle.js";
import type { ArtifactRevision } from "./types.js";

export const storageKey = (id: string): string =>
  createHash("sha256").update(id).digest("hex");
export interface StoredSnapshot {
  metadata: ArtifactRevision;
  files: Snapshot;
}
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
    await link(temp, file); // Fails if the final name exists; never replaces a version.
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
export async function withArtifactLock<T>(
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
export async function readHistory(
  root: string,
  id: string,
): Promise<StoredSnapshot[]> {
  const dir = await storageDirectory(root, "history", storageKey(id));
  const names = (await readdir(dir))
    .filter((name) => /^r\d+\.json$/.test(name))
    .sort((a, b) => Number(a.slice(1, -5)) - Number(b.slice(1, -5)));
  return Promise.all(
    names.map(
      async (name) =>
        JSON.parse(
          await readFile(path.join(dir, name), "utf8"),
        ) as StoredSnapshot,
    ),
  );
}
/** Preserve path-addressed recovery history when a previously unreadable manifest gains an ID. */
export async function adoptPathHistory(
  root: string,
  bundle: string,
  id: string,
): Promise<void> {
  const history = await readHistory(root, `path:${bundle}`);
  if (!history.length) return;
  const dir = await storageDirectory(root, "history", storageKey(id));
  for (const item of history) {
    const file = path.join(dir, `${item.metadata.revision}.json`);
    const content = JSON.stringify(item);
    try {
      await immutableWrite(file, content);
    } catch (e) {
      if (
        (e as NodeJS.ErrnoException).code !== "EEXIST" ||
        (await readFile(file, "utf8")) !== content
      )
        throw new Error(
          "Cannot adopt recovery history into an artifact ID that already has different history.",
        );
    }
  }
}
export async function createRevision(
  root: string,
  id: string,
  snapshot: Snapshot,
  reason: ArtifactRevision["reason"],
): Promise<ArtifactRevision> {
  const dir = await storageDirectory(root, "history", storageKey(id));
  const history = await readHistory(root, id);
  const revision = `r${Math.max(0, ...history.map((item) => Number(item.metadata.revision.slice(1)))) + 1}`;
  const metadata: ArtifactRevision = {
    revision,
    reason,
    createdAt: new Date().toISOString(),
    checksum: checksum(snapshot),
  };
  // Exclusive create means an existing revision can never be replaced.
  await immutableWrite(
    path.join(dir, `${revision}.json`),
    JSON.stringify({ metadata, files: snapshot }),
  );
  return metadata;
}
export async function versions(root: string, id: string): Promise<string[]> {
  const dir = await storageDirectory(root, "versions", storageKey(id));
  return (await readdir(dir))
    .filter((name) => /^v\d+\.json$/.test(name))
    .sort((a, b) => Number(a.slice(1, -5)) - Number(b.slice(1, -5)));
}
export async function createPublishedVersion(
  root: string,
  id: string,
  snapshot: Snapshot,
): Promise<{ version: string; snapshotPath: string }> {
  const dir = await storageDirectory(root, "versions", storageKey(id));
  const existing = await versions(root, id);
  const version = `v${Math.max(0, ...existing.map((name) => Number(name.slice(1, -5)))) + 1}`;
  const snapshotPath = path.join(dir, `${version}.json`);
  await immutableWrite(
    snapshotPath,
    JSON.stringify({
      version,
      publishedAt: new Date().toISOString(),
      checksum: checksum(snapshot),
      files: snapshot,
    }),
  );
  return { version, snapshotPath };
}
