import path from 'node:path';
import { lstat, realpath, readdir, readFile } from 'node:fs/promises';
import { appendFileSync } from 'node:fs';
import { capture, checksum, safeFile, validRelativePath, type Snapshot } from './bundle.js';
import { ArtifactConflictError, commitTransaction, recoverTransaction, withArtifactLock, storageKey, type ArtifactLockOptions } from './storage.js';

/** An explicit set of existing source roles. No implicit manifest or format conversion. */
export interface RoleBundleLocation {
  root: string;
  directory: string;
  anchor: string;
  paths: readonly string[];
}
export interface RoleBundleSnapshot { files: Record<string, string | null>; checksum: string }
/** Acquisition options only; never a permission grant or a freshness claim. */
export type RoleBundleReadOptions = ArtifactLockOptions;
export class RoleBundleRecoveryRequiredError extends Error {
  readonly code = 'source.recovery-required';
  constructor(cause: unknown) { super('Source recovery is required. Reads and writes are blocked until recovery succeeds.', { cause }); }
}
export interface RoleBundleSave {
  expectedChecksum: string;
  files: Record<string, string | null>;
  /** Authoritative format/identity/dependency validation of the complete candidate. */
  validate(candidate: Readonly<RoleBundleSnapshot>, previous: Readonly<RoleBundleSnapshot>): void | Promise<void>;
  /** Recheck the captured original session, owner and policy at admission. */
  admit(): void | Promise<void>;
  /** Trusted fault-injection hooks; never populated from an HTTP request. */
  beforeWrite?: (file: string, index: number) => void | Promise<void>;
  beforeRollbackWrite?: (file: string, index: number) => void | Promise<void>;
}
async function canonical(location: RoleBundleLocation) {
  const directory = path.resolve(location.directory), root = path.resolve(location.root);
  const ancestors = new Set<string>();
  for (const target of [root, directory]) for (let ancestor = target; ; ancestor = path.dirname(ancestor)) {
    ancestors.add(ancestor);
    if (path.dirname(ancestor) === ancestor) break;
  }
  await Promise.all([...ancestors].map(async ancestor => {
    if ((await lstat(ancestor)).isSymbolicLink()) throw new Error('Source bundle roots cannot contain symlinks.');
  }));
  const [resolvedRoot, resolvedDirectory] = await Promise.all([realpath(root), realpath(directory)]);
  const relative = path.relative(resolvedRoot, resolvedDirectory);
  if (relative === '..' || relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) throw new Error('Source bundle is outside its owner root.');
  const paths = [...location.paths];
  if (!paths.length || new Set(paths.map(name => process.platform === 'win32' ? name.toLowerCase() : name)).size !== paths.length || paths.some(name => !validRelativePath(name)) || !paths.includes(location.anchor)) throw new Error('Unique safe role paths including the anchor are required.');
  await Promise.all(paths.map(async name => {
    const target = await safeFile(resolvedDirectory, name);
    const physical = await realpath(target).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
    if (physical && path.relative(resolvedDirectory, physical).replaceAll(path.sep, '/') !== name) throw new Error('Role paths must preserve the existing physical filename and casing.');
  }));
  const anchor = await safeFile(resolvedDirectory, location.anchor);
  const identity = await realpath(anchor).catch(error => { if (error.code === 'ENOENT') return anchor; throw error; });
  return { root: resolvedRoot, directory: resolvedDirectory, paths, identity };
}
function validateSnapshot(snapshot: Snapshot, paths: readonly string[]) {
  if (!snapshot || typeof snapshot !== 'object' || Array.isArray(snapshot) || Object.keys(snapshot).length !== paths.length || paths.some(name => !Object.hasOwn(snapshot, name) || snapshot[name] !== null && typeof snapshot[name] !== 'string')) throw new Error('The source journal/candidate does not match the declared role bundle.');
}
const project = (files: Snapshot): RoleBundleSnapshot => ({ files: structuredClone(files), checksum: checksum(files) });
async function locked<T>(location: RoleBundleLocation, work: (resolved: Awaited<ReturnType<typeof canonical>>, files: Snapshot) => Promise<T>, options: RoleBundleReadOptions = {}) {
  const resolved = await canonical(location);
  return withArtifactLock(resolved.root, resolved.directory, async () => {
    try {
      if (options.recovery === 'refuse') await recoverRoleBundleRoot(resolved.root, options);
      else await recoverTransaction(resolved.root, resolved.directory, { identity: resolved.identity, validate: files => validateSnapshot(files, resolved.paths) });
    }
    catch (error) {
      options.signal?.throwIfAborted();
      if (error instanceof RoleBundleRecoveryRequiredError) throw error;
      throw new RoleBundleRecoveryRequiredError(options.recovery === 'refuse' ? undefined : error);
    }
    options.signal?.throwIfAborted();
    const files = await capture(resolved.directory, resolved.paths, { includeManifest: false });
    return work(resolved, files);
  }, resolved.identity, { timeoutMs: 5_000, ...options });
}
/** Cooperating readers wait for writes/rollback and recover a retained journal first. */
export function readRoleBundle(location: RoleBundleLocation, options: RoleBundleReadOptions = {}): Promise<RoleBundleSnapshot> {
  return locked(location, async (_, files) => project(files), { ...options });
}
/** Recover before collection discovery, including bundles whose anchor was lost.
 * A legacy/unlocatable journal remains blocked for explicit operator recovery.
 */
export async function recoverRoleBundleRoot(ownerRoot: string, options: RoleBundleReadOptions = {}): Promise<void> {
  options = { ...options };
  if (options.recovery !== undefined && options.recovery !== 'refuse') throw new Error('Invalid artifact recovery mode.');
  options.signal?.throwIfAborted();
  const root = await realpath(ownerRoot).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
  if (!root) return;
  const transactions = path.join(root, '.uib', 'transactions');
  try {
    for (let ancestor = path.resolve(ownerRoot); ; ancestor = path.dirname(ancestor)) {
      if ((await lstat(ancestor)).isSymbolicLink()) throw new Error('Source recovery roots cannot contain symlinks.');
      if (path.dirname(ancestor) === ancestor) break;
    }
    for (const directory of [path.join(root, '.uib'), transactions]) {
      const stat = await lstat(directory).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
      if (stat && (stat.isSymbolicLink() || !stat.isDirectory())) throw new Error('Unsafe source transaction storage.');
    }
    for (const name of await readdir(transactions).catch(error => { if (error.code === 'ENOENT') return []; throw error; })) {
      options.signal?.throwIfAborted();
      if (options.recovery === 'refuse' && !/^[a-f0-9]{64}$/.test(name)) throw new RoleBundleRecoveryRequiredError(undefined);
      const directory = path.join(transactions, name);
      if ((await lstat(directory)).isSymbolicLink() || !(await lstat(directory)).isDirectory()) throw new Error('Unsafe source transaction storage.');
      const journalFile = path.join(directory, 'pending.json');
      const journalStat = await lstat(journalFile).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
      // Membership can depend on any retained journal, even without an anchor.
      // Do not read or interpret journal bytes, replay or create storage here.
      if (options.recovery === 'refuse') {
        if (journalStat) throw new RoleBundleRecoveryRequiredError(undefined);
        continue;
      }
      if (journalStat?.isSymbolicLink()) throw new Error('Unsafe source transaction journal.');
      const text = await readFile(journalFile, 'utf8').catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
      if (text === undefined) continue;
      const journal = JSON.parse(text);
      if (typeof journal.bundle !== 'string' || typeof journal.identity !== 'string' || name !== storageKey(journal.identity) || path.dirname(journal.identity) !== journal.bundle || !journal.identity.endsWith('.visual.json')) throw new Error('A source journal requires explicit location recovery.');
      const anchor = path.basename(journal.identity), stem = anchor.slice(0, -'.visual.json'.length);
      const paths = ['.html', '.css', '.visual.json', '.fixtures.json', '.functions.ts'].map(extension => stem + extension);
      validateSnapshot(journal.original, paths);
      await readRoleBundle({ root, directory: journal.bundle, anchor, paths });
      if (await lstat(journalFile).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; })) throw new Error('The original journal identity was not recovered. Explicit location recovery is required.');
    }
  } catch (error) {
    options.signal?.throwIfAborted();
    if (error instanceof RoleBundleRecoveryRequiredError) throw error;
    throw new RoleBundleRecoveryRequiredError(options.recovery === 'refuse' ? undefined : error);
  }
}
/** Cooperating Visual graph compilers/mutators share this outer admission lock.
 * Acquire it before any individual role lock; it is not a multi-artifact commit.
 */
export async function withRoleBundleGraph<T>(ownerRoot: string, work: () => Promise<T>, options: ArtifactLockOptions = {}): Promise<T> {
  options = { ...options };
  const root = await realpath(ownerRoot);
  for (let ancestor = path.resolve(ownerRoot); ; ancestor = path.dirname(ancestor)) {
    if ((await lstat(ancestor)).isSymbolicLink()) throw new Error('Source graph roots cannot contain symlinks.');
    if (path.dirname(ancestor) === ancestor) break;
  }
  return withArtifactLock(root, root, async () => {
    if (options.recovery === 'refuse') await recoverRoleBundleRoot(root, options);
    options.signal?.throwIfAborted();
    return work();
  }, 'visual-runtime-graph-v1', {
    // Measured WP4/WP5-B holds reached 1.66s. A 5s acquisition budget
    // accommodates brief serial work; it never extends or retries admitted work.
    timeoutMs: 5_000,
    ...options,
    observe: measurement => {
      if (process.env.UI_GRAPH_LOCK_TRACE === '1') {
        const record = JSON.stringify({ pid: process.pid, ...measurement });
        console.error('GRAPH_LOCK ' + record);
        // Explicit operator diagnostics only; never include source or identity data.
        if (process.env.UI_GRAPH_LOCK_METRICS) appendFileSync(process.env.UI_GRAPH_LOCK_METRICS, record + '\n');
      }
      options.observe?.(measurement);
    },
  });
}
/** Uses Foundation's existing transaction writer, rollback, journal and stale checks. */
export function saveRoleBundle(location: RoleBundleLocation, input: RoleBundleSave): Promise<RoleBundleSnapshot> {
  return locked(location, async (resolved, original) => {
    if (!input.expectedChecksum || checksum(original) !== input.expectedChecksum) throw new ArtifactConflictError();
    const staged = structuredClone(input.files); validateSnapshot(staged, resolved.paths);
    const candidate = project(staged), previous = project(original);
    await input.validate(structuredClone(candidate), structuredClone(previous));
    const current = () => capture(resolved.directory, resolved.paths, { includeManifest: false });
    if (checksum(await current()) !== previous.checksum) throw new ArtifactConflictError();
    await input.admit();
    // A slow authority check must not weaken the expected-source condition.
    if (checksum(await current()) !== previous.checksum) throw new ArtifactConflictError();
    if (candidate.checksum === previous.checksum) return previous;
    try {
      await commitTransaction(resolved.root, resolved.directory, original, staged, {
        identity: resolved.identity, capture: current, beforeWrite: input.beforeWrite, beforeRollbackWrite: input.beforeRollbackWrite,
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
