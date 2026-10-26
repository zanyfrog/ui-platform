/** Existing presentation-owner extension. No route, legacy acquisition or automatic sealing. */
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { lstat, realpath, mkdir, open, chmod, rename, readFile, readdir } from 'node:fs/promises';
import { withRoleBundleGraph, withArtifactLock, recoverRoleBundleRoot, atomicWriteText } from '@ui-platform/artifacts/storage';

import { PresentationPublicationError, fail, hash, canonical, freeze, snapshotIndex, verifyIndexShape, type PresentationPublicationRefusal, type PresentationOwnerBinding, type CompletedPresentationSnapshot, type PresentationPublicationIndex as PresentationIndex } from './presentation-publication-contract.js';
export { PresentationPublicationError };
export type { CompletedPresentationSnapshot, PresentationOwnerBinding } from './presentation-publication-contract.js';
const validId = (id: unknown): id is string => typeof id === 'string' && /^pres_([1-9]\d{0,15})_[a-f0-9]{64}$/.test(id) && Number.isSafeInteger(Number(id.split('_')[1]));
export interface PresentationPublicationOptions { readonly timeoutMs?: number; readonly signal?: AbortSignal }
export interface PresentationPublicationSelection {
  readonly schema: 'presentation-publication-selection-v1'; readonly owner: PresentationOwnerBinding;
  readonly generation: number; readonly publicationId: string;
}
export type PresentationPublicationIndex = Readonly<PresentationIndex>;
export interface PresentationPublicationLease {
  readonly publicationId: string; readonly index: PresentationPublicationIndex; readonly expiresAt: number;
  read(resourceId: string): Uint8Array;
  dispose(): void;
}
function optionsFor(options: PresentationPublicationOptions) {
  const timeoutMs = options.timeoutMs ?? 5000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 5000) fail('INVALID_INPUT');
  return { recovery: 'refuse' as const, timeoutMs, signal: options.signal };
}
async function boundary<T>(options: PresentationPublicationOptions, work: () => Promise<T>): Promise<T> {
  try { if (options.signal?.aborted) fail('CANCELED'); return await work(); }
  catch (error: any) {
    if (error instanceof PresentationPublicationError) throw error;
    if (options.signal?.aborted) fail('CANCELED');
    const known: Record<string, PresentationPublicationRefusal> = { 'source.busy': 'BUSY', 'source.owner-unresolved': 'OWNER_UNRESOLVED', 'source.admission-unsafe': 'UNSAFE', 'source.recovery-required': 'RECOVERY_REQUIRED', ENOENT: 'UNSEALED' };
    fail(known[error?.code] ?? 'IO_UNCERTAIN');
  }
}
function check(signal?: AbortSignal) { if (signal?.aborted) fail('CANCELED'); }
async function canonicalRoot(root: string) {
  for (let target = path.resolve(root); ; target = path.dirname(target)) {
    if ((await lstat(target)).isSymbolicLink()) fail('UNSAFE');
    if (path.dirname(target) === target) break;
  }
  const resolved = await realpath(root);
  if (!(await lstat(resolved)).isDirectory()) fail('UNSAFE');
  return resolved;
}
async function child(directory: string, name: string, create = false) {
  const target = path.join(directory, name);
  let stat = await lstat(target).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
  if (!stat && create) {
    await mkdir(target).catch(error => { if (error.code !== 'EEXIST') throw error; }); stat = await lstat(target);
  }
  if (!stat) fail('UNSEALED');
  if (stat.isSymbolicLink() || !stat.isDirectory()) fail('UNSAFE');
  return target;
}
async function exactFile(file: string, size: number, signal?: AbortSignal) {
  check(signal);
  const stat = await lstat(file);
  if (stat.isSymbolicLink() || !stat.isFile() || stat.nlink !== 1) fail('UNSAFE');
  if (stat.size !== size) fail('CONTENT_CHANGED');
  const bytes = await readFile(file, { signal }); check(signal);
  if (bytes.length !== size) fail('CONTENT_CHANGED'); return new Uint8Array(bytes);
}
async function exclusive(file: string, bytes: Uint8Array | string) {
  const handle = await open(file, 'wx');
  try { await handle.writeFile(bytes); await handle.sync(); } finally { await handle.close(); }
  await chmod(file, 0o444);
}

/** Trusted setup supplied by the existing presentation owner. It is not authorization. */
export async function createPresentationPublicationOwner(setup: { root: string; graphRoot: string; owner: PresentationOwnerBinding }): Promise<PresentationPublicationOwner> {
  return boundary({}, async () => {
    if (setup.owner?.kind !== 'application' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(setup.owner.id)) fail('INVALID_INPUT');
    const owner = freeze({ kind: 'application' as const, id: setup.owner.id });
    const [root, graphRoot] = await Promise.all([canonicalRoot(setup.root), canonicalRoot(setup.graphRoot)]);
    return new PresentationPublicationOwner(root, graphRoot, owner, construction);
  });
}
const construction = Symbol('existing-presentation-owner');
export class PresentationPublicationOwner {
  constructor(private readonly root: string, private readonly graphRoot: string, private readonly owner: PresentationOwnerBinding, token: symbol) { if (token !== construction) fail('INVALID_INPUT'); }
  private async namespace(create = false) { return child(await child(this.root, '.uib', create), 'presentation-publications-v1', create); }
  private async graph<T>(options: PresentationPublicationOptions, work: () => Promise<T>) {
    const admission = optionsFor(options);
    return withRoleBundleGraph(this.graphRoot, async () => {
      await canonicalRoot(this.root); await recoverRoleBundleRoot(this.root, admission); check(admission.signal);
      const value = await work(); check(admission.signal); return value;
    }, admission);
  }
  async publish(input: CompletedPresentationSnapshot, options: PresentationPublicationOptions = {}): Promise<string> {
    options = { ...options };
    return boundary(options, async () => {
      const staged = snapshotIndex(this.owner, input), bytes = staged.bytes;
      const index = canonical(staged.index), publicationId = 'pres_' + staged.index.version + '_' + hash(index);
      return this.graph(options, async () => {
        const space = await this.namespace(true), sealed = await child(space, 'sealed', true), staging = await child(space, 'staging', true);
        const final = path.join(sealed, 'v' + staged.index.version);
        if (await lstat(final).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; })) fail('VERSION_EXISTS');
        const candidate = await child(staging, randomUUID(), true), blobs = await child(candidate, 'bytes', true);
        const written = new Set<string>();
        for (const resource of staged.index.resources) {
          check(options.signal);
          if (!written.has(resource.sha256)) { await exclusive(path.join(blobs, resource.sha256), bytes.get(resource.id)!); written.add(resource.sha256); }
        }
        await exclusive(path.join(candidate, 'index.json'), index);
        await this.loadDirectory(candidate, publicationId, options.signal);
        check(options.signal);
        // Sole visibility point. Never merge, overwrite or clean up a failed candidate.
        await rename(candidate, final);
        check(options.signal); return publicationId;
      });
    });
  }
  private async loadDirectory(directory: string, publicationId: string, signal?: AbortSignal) {
    if (canonical((await readdir(directory)).sort()) !== canonical(['bytes','index.json'])) fail('MEMBERSHIP_INVALID');
    const file = path.join(directory,'index.json'), stat = await lstat(file);
    if (stat.size > 32768) fail('LIMIT_EXCEEDED');
    const text = await exactFile(file,stat.size,signal); let index: any;
    try { index=JSON.parse(Buffer.from(text).toString('utf8')); } catch { fail('CONTENT_CHANGED'); }
    verifyIndexShape(index,this.owner);
    if (Buffer.from(text).toString('utf8')!==canonical(index) || publicationId!=='pres_'+index.version+'_'+hash(text)) fail('CONTENT_CHANGED');
    const blobs = await child(directory,'bytes'), bytes = new Map<string,Uint8Array>();
    if(canonical((await readdir(blobs)).sort())!==canonical([...new Set(index.resources.map(r=>r.sha256))].sort()))fail('MEMBERSHIP_INVALID');
    for(const resource of index.resources){const content=await exactFile(path.join(blobs,resource.sha256),resource.byteLength,signal);if(hash(content)!==resource.sha256)fail('CONTENT_CHANGED');bytes.set(resource.id,content);}
    const expected=snapshotIndex(this.owner,{producer:'owner-completed-presentation-v1',version:index.version,files:bytes});
    if(canonical(expected.index)!==canonical(index))fail('CONTENT_CHANGED');
    return {index:freeze(index) as PresentationPublicationIndex,bytes};
  }
  private async load(publicationId: string, signal?: AbortSignal) {
    if(!validId(publicationId))fail('INVALID_INPUT');
    const space=await this.namespace(),sealed=await child(space,'sealed'),directory=await child(sealed,'v'+publicationId.split('_')[1]);
    return this.loadDirectory(directory,publicationId,signal);
  }
  private lease(publicationId: string, index: PresentationPublicationIndex, bytes: Map<string, Uint8Array>, leaseMs: number, signal?: AbortSignal): PresentationPublicationLease {
    const expiresAt = performance.now() + leaseMs; let disposed = false;
    return Object.freeze({ publicationId, index, expiresAt,
      read(resourceId: string) {
        check(signal); if (disposed) fail('DISPOSED'); if (performance.now() >= expiresAt) { bytes.clear(); fail('EXPIRED'); }
        const value = bytes.get(resourceId); if (!value) fail('MEMBERSHIP_INVALID'); return new Uint8Array(value);
      },
      dispose() { disposed = true; bytes.clear(); },
    });
  }
  async read(publicationId: string, leaseMs: number, options: PresentationPublicationOptions = {}): Promise<PresentationPublicationLease> {
    options = { ...options };
    return boundary(options, () => this.graph(options, async () => {
      if (!Number.isFinite(leaseMs) || leaseMs <= 0 || leaseMs > 30000) fail('INVALID_INPUT');
      const bytes = await this.load(publicationId, options.signal); check(options.signal);
      return this.lease(publicationId, bytes.index, bytes.bytes, leaseMs, options.signal);
    }));
  }
  private async selection<T>(create: boolean, options: PresentationPublicationOptions, work: (file: string, previous: PresentationPublicationSelection | null) => Promise<T>) {
    const directory = await child(await this.namespace(create), 'selection', create), file = path.join(directory, 'selected.visual.json');
    return withArtifactLock(this.root, directory, async () => {
      await recoverRoleBundleRoot(this.root, { ...optionsFor(options) });
      const stat = await lstat(file).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
      let previous: PresentationPublicationSelection | null = null;
      if (stat) {
        if (stat.size > 2048) fail('CONTENT_CHANGED');
        const bytes = await exactFile(file, stat.size, options.signal);
        try { previous = JSON.parse(Buffer.from(bytes).toString('utf8')); } catch { fail('CONTENT_CHANGED'); }
        if (!previous || previous.schema !== 'presentation-publication-selection-v1' || canonical(previous.owner) !== canonical(this.owner) || !Number.isSafeInteger(previous.generation) || previous.generation < 1 || !validId(previous.publicationId) || canonical(previous) !== canonical({ schema: previous.schema, owner: this.owner, generation: previous.generation, publicationId: previous.publicationId })) fail('CONTENT_CHANGED');
      }
      check(options.signal); return work(file, previous);
    }, file, optionsFor(options));
  }
  async select(publicationId: string, expectedGeneration: number, options: PresentationPublicationOptions = {}): Promise<PresentationPublicationSelection> {
    options = { ...options };
    return boundary(options, () => this.graph(options, async () => {
      if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 0 || expectedGeneration >= Number.MAX_SAFE_INTEGER) fail('INVALID_INPUT');
      await this.load(publicationId, options.signal);
      return this.selection(true, options, async (file, previous) => {
        if ((previous?.generation ?? 0) !== expectedGeneration) fail('SELECTION_CHANGED');
        const next: PresentationPublicationSelection = { schema: 'presentation-publication-selection-v1', owner: this.owner, generation: expectedGeneration + 1, publicationId };
        check(options.signal); await atomicWriteText(file, canonical(next)); check(options.signal); return freeze(next);
      });
    }));
  }
  async readSelected(expectedGeneration: number, leaseMs: number, options: PresentationPublicationOptions = {}): Promise<PresentationPublicationLease> {
    options = { ...options };
    return boundary(options, () => this.graph(options, async () => {
      if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 1 || !Number.isFinite(leaseMs) || leaseMs <= 0 || leaseMs > 30000) fail('INVALID_INPUT');
      return this.selection(false, options, async (_, previous) => {
        if (!previous || previous.generation !== expectedGeneration) fail('SELECTION_CHANGED');
        const bytes = await this.load(previous.publicationId, options.signal); check(options.signal);
        return this.lease(previous.publicationId, bytes.index, bytes.bytes, leaseMs, options.signal);
      });
    }));
  }
}
