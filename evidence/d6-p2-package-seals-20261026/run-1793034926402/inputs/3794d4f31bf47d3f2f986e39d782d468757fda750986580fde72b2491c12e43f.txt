/** Existing package-owner extension. Internal only: no route, discovery or permission grant. */
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { lstat, realpath, mkdir, open, chmod, rename, readFile, readdir } from 'node:fs/promises';
import { withRoleBundleGraph, withArtifactLock, recoverRoleBundleRoot, atomicWriteText } from '@ui-platform/artifacts/storage';
import { nativeCardPublicationProfile, nativeCardPublicationRevision } from './package-publication-profile.js';

export type PackagePublicationRefusal = 'INVALID_INPUT' | 'UNSUPPORTED_PRODUCER' | 'MEMBERSHIP_INVALID' | 'CONTENT_CHANGED' | 'UNSEALED' | 'PUBLICATION_EXISTS' | 'SELECTION_CHANGED' | 'CANCELED' | 'EXPIRED' | 'DISPOSED' | 'BUSY' | 'OWNER_UNRESOLVED' | 'UNSAFE' | 'RECOVERY_REQUIRED' | 'IO_UNCERTAIN';
export class PackagePublicationError extends Error {
  constructor(readonly code: PackagePublicationRefusal) { super('Package publication unavailable: ' + code); this.name = 'PackagePublicationError'; }
}
function fail(code: PackagePublicationRefusal): never { throw new PackagePublicationError(code); }
const hash = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
function canonical(value: any): string {
  return value === null || typeof value !== 'object' ? JSON.stringify(value) : Array.isArray(value) ? '[' + value.map(canonical).join(',') + ']' : '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
}
function freeze<T>(value: T): Readonly<T> {
  if (value && typeof value === 'object') { for (const item of Object.values(value)) freeze(item); Object.freeze(value); }
  return value;
}
const profile = freeze(JSON.parse(JSON.stringify(nativeCardPublicationProfile))) as typeof nativeCardPublicationProfile;
const profileRevision = nativeCardPublicationRevision;
const validId = (id: unknown): id is string => typeof id === 'string' && /^pub_[a-f0-9]{64}$/.test(id);
export interface PublicationOwnerBinding { readonly kind: 'application'; readonly id: string }
export interface PackagePublicationOptions { readonly timeoutMs?: number; readonly signal?: AbortSignal }
export interface NativeCardBuildSnapshot {
  readonly producer: 'owner-staged-native-card-v1';
  readonly revision: string;
  readonly files: ReadonlyMap<string, Uint8Array>;
}
export interface PackagePublicationSelection {
  readonly schema: 'package-publication-selection-v1'; readonly owner: PublicationOwnerBinding;
  readonly generation: number; readonly publicationId: string;
}
function indexFor(owner: PublicationOwnerBinding) {
  return { schema: 'package-publication-v1', owner, producer: 'owner-staged-native-card-v1', profileRevision, implementation: {
    componentId: profile.componentId, packageId: profile.packageId, packageVersion: profile.packageVersion,
    definitionRevision: profile.definitionRevision, definitionDigest: profile.definitionDigest,
    definitionBinding: profile.definitionBinding,
    nativeAdmissionClosureDigest: profile.nativeAdmissionClosureDigest, exports: profile.exports,
  }, resources: profile.resources };
}
export type PackagePublicationIndex = Readonly<ReturnType<typeof indexFor>>;
export interface PackagePublicationLease {
  readonly publicationId: string; readonly index: PackagePublicationIndex; readonly expiresAt: number;
  read(resourceId: string): Uint8Array;
  dispose(): void;
}
function optionsFor(options: PackagePublicationOptions) {
  const timeoutMs = options.timeoutMs ?? 5000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0 || timeoutMs > 5000) fail('INVALID_INPUT');
  return { recovery: 'refuse' as const, timeoutMs, signal: options.signal };
}
async function boundary<T>(options: PackagePublicationOptions, work: () => Promise<T>): Promise<T> {
  try { if (options.signal?.aborted) fail('CANCELED'); return await work(); }
  catch (error: any) {
    if (error instanceof PackagePublicationError) throw error;
    if (options.signal?.aborted) fail('CANCELED');
    const known: Record<string, PackagePublicationRefusal> = { 'source.busy': 'BUSY', 'source.owner-unresolved': 'OWNER_UNRESOLVED', 'source.admission-unsafe': 'UNSAFE', 'source.recovery-required': 'RECOVERY_REQUIRED', ENOENT: 'UNSEALED' };
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

/** Trusted setup supplied by the existing installation/build owner. It is not authorization. */
export async function createPackagePublicationOwner(setup: { root: string; graphRoot: string; owner: PublicationOwnerBinding }): Promise<PackagePublicationOwner> {
  return boundary({}, async () => {
    if (setup.owner?.kind !== 'application' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(setup.owner.id)) fail('INVALID_INPUT');
    if (hash(canonical(profile)) !== profileRevision) fail('UNSUPPORTED_PRODUCER');
    const owner = freeze({ kind: 'application' as const, id: setup.owner.id });
    const [root, graphRoot] = await Promise.all([canonicalRoot(setup.root), canonicalRoot(setup.graphRoot)]);
    return new PackagePublicationOwner(root, graphRoot, owner, construction);
  });
}
const construction = Symbol('existing-package-owner');
export class PackagePublicationOwner {
  constructor(private readonly root: string, private readonly graphRoot: string, private readonly owner: PublicationOwnerBinding, token: symbol) { if (token !== construction) fail('INVALID_INPUT'); }
  private async namespace(create = false) { return child(await child(this.root, '.uib', create), 'package-publications-v1', create); }
  private async graph<T>(options: PackagePublicationOptions, work: () => Promise<T>) {
    const admission = optionsFor(options);
    return withRoleBundleGraph(this.graphRoot, async () => {
      await canonicalRoot(this.root); await recoverRoleBundleRoot(this.root, admission); check(admission.signal);
      const value = await work(); check(admission.signal); return value;
    }, admission);
  }
  async publish(input: NativeCardBuildSnapshot, options: PackagePublicationOptions = {}): Promise<string> {
    options = { ...options };
    return boundary(options, async () => {
      if (input?.producer !== 'owner-staged-native-card-v1' || input.revision !== profileRevision) fail('UNSUPPORTED_PRODUCER');
      if (!(input.files instanceof Map) || input.files.size !== profile.resources.length) fail('MEMBERSHIP_INVALID');
      // Copy and validate before the first asynchronous operation.
      const bytes = new Map<string, Uint8Array>();
      for (const resource of profile.resources) {
        const value = input.files.get(resource.id);
        if (!(value instanceof Uint8Array)) fail('MEMBERSHIP_INVALID');
        const copy = new Uint8Array(value);
        if (copy.length !== resource.byteLength || hash(copy) !== resource.sha256) fail('CONTENT_CHANGED');
        bytes.set(resource.id, copy);
      }
      const index = canonical(indexFor(this.owner)), publicationId = 'pub_' + hash(index);
      return this.graph(options, async () => {
        const space = await this.namespace(true), sealed = await child(space, 'sealed', true), staging = await child(space, 'staging', true);
        const final = path.join(sealed, publicationId);
        if (await lstat(final).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; })) fail('PUBLICATION_EXISTS');
        const candidate = await child(staging, randomUUID(), true), blobs = await child(candidate, 'bytes', true);
        const written = new Set<string>();
        for (const resource of profile.resources) {
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
    if (canonical((await readdir(directory)).sort()) !== canonical(['bytes', 'index.json'])) fail('MEMBERSHIP_INVALID');
    const expected = canonical(indexFor(this.owner));
    const text = await exactFile(path.join(directory, 'index.json'), Buffer.byteLength(expected), signal);
    if (hash(text) !== publicationId.slice(4) || Buffer.from(text).toString('utf8') !== expected) fail('CONTENT_CHANGED');
    const blobs = await child(directory, 'bytes'), bytes = new Map<string, Uint8Array>();
    if (canonical((await readdir(blobs)).sort()) !== canonical([...new Set(profile.resources.map(resource => resource.sha256))].sort())) fail('MEMBERSHIP_INVALID');
    for (const resource of profile.resources) {
      const content = await exactFile(path.join(blobs, resource.sha256), resource.byteLength, signal);
      if (hash(content) !== resource.sha256) fail('CONTENT_CHANGED'); bytes.set(resource.id, content);
    }
    return bytes;
  }
  private async load(publicationId: string, signal?: AbortSignal) {
    if (!validId(publicationId)) fail('INVALID_INPUT');
    const space = await this.namespace(), sealed = await child(space, 'sealed'), directory = await child(sealed, publicationId);
    return this.loadDirectory(directory, publicationId, signal);
  }
  private lease(publicationId: string, bytes: Map<string, Uint8Array>, leaseMs: number, signal?: AbortSignal): PackagePublicationLease {
    const expiresAt = performance.now() + leaseMs; let disposed = false;
    const index = freeze(JSON.parse(canonical(indexFor(this.owner)))) as PackagePublicationIndex;
    return Object.freeze({ publicationId, index, expiresAt,
      read(resourceId: string) {
        check(signal); if (disposed) fail('DISPOSED'); if (performance.now() >= expiresAt) { bytes.clear(); fail('EXPIRED'); }
        const value = bytes.get(resourceId); if (!value) fail('MEMBERSHIP_INVALID'); return new Uint8Array(value);
      },
      dispose() { disposed = true; bytes.clear(); },
    });
  }
  async read(publicationId: string, leaseMs: number, options: PackagePublicationOptions = {}): Promise<PackagePublicationLease> {
    options = { ...options };
    return boundary(options, () => this.graph(options, async () => {
      if (!Number.isFinite(leaseMs) || leaseMs <= 0 || leaseMs > 30000) fail('INVALID_INPUT');
      const bytes = await this.load(publicationId, options.signal); check(options.signal);
      return this.lease(publicationId, bytes, leaseMs, options.signal);
    }));
  }
  private async selection<T>(create: boolean, options: PackagePublicationOptions, work: (file: string, previous: PackagePublicationSelection | null) => Promise<T>) {
    const directory = await child(await this.namespace(create), 'selection', create), file = path.join(directory, 'selected.visual.json');
    return withArtifactLock(this.root, directory, async () => {
      await recoverRoleBundleRoot(this.root, { ...optionsFor(options) });
      const stat = await lstat(file).catch(error => { if (error.code === 'ENOENT') return undefined; throw error; });
      let previous: PackagePublicationSelection | null = null;
      if (stat) {
        if (stat.size > 2048) fail('CONTENT_CHANGED');
        const bytes = await exactFile(file, stat.size, options.signal);
        try { previous = JSON.parse(Buffer.from(bytes).toString('utf8')); } catch { fail('CONTENT_CHANGED'); }
        if (!previous || previous.schema !== 'package-publication-selection-v1' || canonical(previous.owner) !== canonical(this.owner) || !Number.isSafeInteger(previous.generation) || previous.generation < 1 || !validId(previous.publicationId) || canonical(previous) !== canonical({ schema: previous.schema, owner: this.owner, generation: previous.generation, publicationId: previous.publicationId })) fail('CONTENT_CHANGED');
      }
      check(options.signal); return work(file, previous);
    }, file, optionsFor(options));
  }
  async select(publicationId: string, expectedGeneration: number, options: PackagePublicationOptions = {}): Promise<PackagePublicationSelection> {
    options = { ...options };
    return boundary(options, () => this.graph(options, async () => {
      if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 0 || expectedGeneration >= Number.MAX_SAFE_INTEGER) fail('INVALID_INPUT');
      await this.load(publicationId, options.signal);
      return this.selection(true, options, async (file, previous) => {
        if ((previous?.generation ?? 0) !== expectedGeneration) fail('SELECTION_CHANGED');
        const next: PackagePublicationSelection = { schema: 'package-publication-selection-v1', owner: this.owner, generation: expectedGeneration + 1, publicationId };
        check(options.signal); await atomicWriteText(file, canonical(next)); check(options.signal); return freeze(next);
      });
    }));
  }
  async readSelected(expectedGeneration: number, leaseMs: number, options: PackagePublicationOptions = {}): Promise<PackagePublicationLease> {
    options = { ...options };
    return boundary(options, () => this.graph(options, async () => {
      if (!Number.isSafeInteger(expectedGeneration) || expectedGeneration < 1 || !Number.isFinite(leaseMs) || leaseMs <= 0 || leaseMs > 30000) fail('INVALID_INPUT');
      return this.selection(false, options, async (_, previous) => {
        if (!previous || previous.generation !== expectedGeneration) fail('SELECTION_CHANGED');
        const bytes = await this.load(previous.publicationId, options.signal); check(options.signal);
        return this.lease(previous.publicationId, bytes, leaseMs, options.signal);
      });
    }));
  }
}
