import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, rename, realpath, rm } from 'node:fs/promises';
import path from 'node:path';
import { validatePageAnchorChange, componentReferences, generateForm, parseMetadata, validateArtifact } from '@ui-platform/visual-artifacts';
import type { ArtifactBundle, ArtifactFiles, ArtifactMetadata, DatasetDefinition, PackageComponent, RuntimeArtifact } from '@ui-platform/visual-artifacts';
import { atomicWriteText } from './json-files.js';
import { moveToOsTrash } from './trash.js';
import { appPath } from './applications.js';
import { appsDir, platformRoot } from './paths.js';
import { readRoleBundle, saveRoleBundle, recoverRoleBundleRoot, type RoleBundleLocation, type RoleBundleReadOptions } from '@ui-platform/artifacts/storage';

export const platformComponentsRoot = path.join(platformRoot, 'components');
const roles = { source: '.html', css: '.css', metadata: '.visual.json', fixtures: '.fixtures.json', code: '.functions.ts' } as const;
const hash = (files: ArtifactFiles) => createHash('sha256').update(JSON.stringify(files)).digest('hex');

/** One file service for Pages and Components; roots and metadata are the specializations. */
export class VisualArtifactService {
  constructor(readonly root: string, readonly kind: 'page' | 'component' | 'shell', private faults: Pick<import('@ui-platform/artifacts/storage').RoleBundleSave, 'beforeWrite' | 'beforeRollbackWrite'> = {}) {}
  private async location(locator: string): Promise<RoleBundleLocation> {
    const file = await this.file(locator), stem = path.basename(file, '.visual.json');
    return { root: this.root, directory: path.dirname(file), anchor: path.basename(file), paths: Object.values(roles).map(extension => stem + extension) };
  }
  async file(locator: string, create = false): Promise<string> {
    if (!locator.endsWith('.visual.json') || locator.includes('\\') || locator.split('/').some(p => !/^[a-zA-Z0-9_-]+(?:\.visual\.json)?$/.test(p))) throw new Error('Invalid Visual Artifact locator.');
    for (let ancestor = path.resolve(this.root); ; ancestor = path.dirname(ancestor)) {
      const info = await lstat(ancestor).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (info?.isSymbolicLink()) throw new Error('Visual Artifact roots cannot contain symlinks.');
      if (path.dirname(ancestor) === ancestor) break;
    }
    if (create) await mkdir(this.root, { recursive: true });
    const resolvedRoot = await realpath(this.root);
    let current = resolvedRoot;
    for (const segment of locator.split('/')) {
      current = path.join(current, segment);
      const info = await lstat(current).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (info?.isSymbolicLink()) throw new Error('Visual Artifact paths cannot contain symlinks.');
    }
    return realpath(current).catch(error => { if (error.code === 'ENOENT') return current; throw error; });
  }
  async list(options: RoleBundleReadOptions = {}): Promise<ArtifactBundle[]> {
    options = { ...options };
    await recoverRoleBundleRoot(this.root, options);
    const locators: string[] = [];
    const walk = async (dir: string, prefix = '') => {
      for (const entry of await readdir(dir, { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; })) {
        if (entry.name.startsWith('.') || entry.isSymbolicLink()) continue;
        const relative = `${prefix}${entry.name}`;
        if (entry.isDirectory()) await walk(path.join(dir, entry.name), `${relative}/`);
        else if (entry.name.endsWith('.visual.json')) locators.push(relative);
      }
    };
    await walk(this.root);
    const bundles: ArtifactBundle[] = [];
    locators.sort();
    // Independent read-only role captures may run in a bounded batch. Each
    // retains its own Foundation lock/recovery; output remains locator-ordered.
    for (let offset = 0; offset < locators.length; offset += 4) {
      const reads = locators.slice(offset, offset + 4).map(async locator => {
        try { return await this.read(locator, options); }
        catch (error) {
          if (options.recovery === 'refuse') throw error;
          return { locator, hash: '', files: { source: '', css: '', metadata: '', fixtures: '', code: '' }, diagnostics: [{ severity: 'error' as const, message: String(error) }] };
        }
      });
      bundles.push(...await Promise.all(reads).catch(async error => {
        if (options.recovery === 'refuse') await Promise.allSettled(reads);
        throw error;
      }));
    }
    for (const key of ['artifactId', 'componentId'] as const) {
      const ids = new Set<string>();
      for (const bundle of bundles) {
        const id = bundle.metadata?.[key];
        if (id && ids.has(id)) bundles.filter(b => b.metadata?.[key] === id).forEach(b => b.diagnostics.push({ severity: 'error', message: `Duplicate permanent identity: ${id}.` }));
        if (id) ids.add(id);
      }
    }
    return bundles;
  }
  async read(locator: string, options: RoleBundleReadOptions = {}): Promise<ArtifactBundle> {
    options = { ...options };
    const location = await this.location(locator), file = path.join(location.directory, location.anchor);
    const stem = file.slice(0, -'.visual.json'.length);
    const files = {} as ArtifactFiles;
    const snapshot = await readRoleBundle(location, options);
    for (const [role, extension] of Object.entries(roles)) files[role as keyof ArtifactFiles] = snapshot.files[path.basename(stem) + extension] ?? '';
    if (!files.metadata) throw new Error('Visual Artifact metadata is missing.');
    const parsed = parseMetadata(files.metadata);
    const diagnostics = [...parsed.diagnostics];
    if (parsed.metadata?.kind !== this.kind) diagnostics.push({ severity: 'error', message: `Expected a ${this.kind} in this source location.` });
    if (!files.source) diagnostics.push({ severity: 'error', message: 'HTML source is missing or empty.' });
    try { JSON.parse(files.fixtures || '{}'); } catch { diagnostics.push({ severity: 'error', message: 'Preview fixtures are invalid JSON.' }); }
    return { locator, files, hash: hash(files), metadata: parsed.metadata, diagnostics };
  }
  async create(name: string, route?: string, form?: { dataset?: DatasetDefinition; authoring?: boolean }, shellId?: string, initialRegionId: string | null = 'region-main', admit: () => Promise<void> = async () => {}): Promise<ArtifactBundle> {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('Use a lowercase name with letters, numbers, and hyphens.');
    const locator = `${name}/${this.kind}.visual.json`;
    const file = await this.file(locator, true);
    if (await lstat(path.dirname(file)).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; })) throw new Error('An artifact folder already exists.');
    const temporary = path.join(this.root, `.creating-${randomUUID()}`);
    const metadata: ArtifactMetadata = { schemaVersion: 1, artifactId: `art_${randomUUID()}`, kind: this.kind, name, displayName: name.replaceAll('-', ' '), ...(this.kind === 'component' ? { componentId: `cmp_platform_${randomUUID()}`, public: { properties: {}, events: {}, slots: [] } } : this.kind === 'page' ? { route: route ?? `/${name}`, ...(shellId ? { shellId, routeId: `route_${randomUUID()}` } : {}) } : {}) };
    const files: ArtifactFiles = form ? generateForm(metadata, form.dataset) : { source: `<section class="uip-layout-item" data-uip-node="node_${randomUUID()}"></section>\n`, css: '', metadata: JSON.stringify(metadata, null, 2) + '\n', fixtures: '{}\n', code: 'export {};\n' };
    if (form?.authoring) { metadata.form!.contractVersion = 1; files.metadata = JSON.stringify(metadata, null, 2) + '\n'; }
    if (shellId || this.kind === 'shell') files.source = initialRegionId ? `<main class="uip-layout-item" data-uip-node="node_${randomUUID()}" data-uip-region="${initialRegionId}" data-uip-region-name="Main Content"></main>\n` : '<!-- No Page Region overrides; use Shell defaults. -->\n';
    if (shellId) files.source = '<!-- No Page Region overrides; add a Region to replace or explicitly empty its Shell default. -->\n';
    await mkdir(temporary);
    try {
    for (const [role, extension] of Object.entries(roles)) await atomicWriteText(path.join(temporary, `${this.kind}${extension}`), files[role as keyof ArtifactFiles]);
    if (this.kind === 'page') await atomicWriteText(path.join(temporary, 'index.ts'), pageEntry());
    await admit(); await rename(temporary, path.dirname(file));
    } finally { await rm(temporary, { recursive: true, force: true }); }
    return this.read(locator);
  }
  async save(locator: string, role: keyof ArtifactFiles, content: string, expectedHash: string, admit?: () => Promise<void>): Promise<ArtifactBundle> {
    if (!Object.hasOwn(roles, role) || typeof content !== 'string' || !expectedHash) throw new Error('File role, text, and expected hash are required.');
    const current = await this.read(locator);
    return this.saveCandidate(locator, { ...current.files, [role]: content }, expectedHash, { repair: true, admit });
  }
  /** Complete source candidate; normal callers must supply authority and graph validation. */
  async saveCandidate(locator: string, files: ArtifactFiles, expectedHash: string, options: {
    repair?: boolean; validate?: (candidate: ArtifactBundle) => Promise<void>; admit?: () => Promise<void>;
  }): Promise<ArtifactBundle> {
    const location = await this.location(locator), original = await readRoleBundle(location), stem = path.basename(location.anchor, '.visual.json');
    const previousFiles = Object.fromEntries(Object.entries(roles).map(([role, extension]) => [role, original.files[stem + extension] ?? ''])) as unknown as ArtifactFiles;
    if (!expectedHash || hash(previousFiles) !== expectedHash) throw Object.assign(new Error('Visual Artifact changed on disk. Reload or recover your editor changes before saving.'), { status: 409 });
    const staged = structuredClone(files);
    if (Object.keys(staged).length !== Object.keys(roles).length || Object.keys(roles).some(role => typeof staged[role as keyof ArtifactFiles] !== 'string')) throw new Error('A complete Visual role candidate is required.');
    if (!options.repair && (!options.validate || !options.admit)) throw new Error('Normal Visual saves require complete validation and original authority admission.');
    await saveRoleBundle(location, { expectedChecksum: original.checksum, files: Object.fromEntries(Object.entries(roles).map(([role, extension]) => [stem + extension, staged[role as keyof ArtifactFiles]])),
      validate: async () => {
        const previous = parseMetadata(previousFiles.metadata).metadata, incoming = parseMetadata(staged.metadata);
        if (incoming.metadata && previous && (['artifactId', 'componentId', 'kind', 'routeId'] as const).some(key => previous[key] && incoming.metadata![key] !== previous[key])) throw new Error('Artifact, Route and Component identities and kind are immutable.');
        if (!options.repair) {
          if (this.kind === 'page') validatePageAnchorChange(previousFiles.source, staged.source);
          const diagnostics = [...incoming.diagnostics];
          if (incoming.metadata?.kind !== this.kind) diagnostics.push({ severity: 'error', message: 'Visual kind does not match its owner collection.' });
          try { JSON.parse(staged.fixtures || '{}'); } catch { diagnostics.push({ severity: 'error', message: 'Preview fixtures are invalid JSON.' }); }
          if (!previous) diagnostics.push({ severity: 'error', message: 'Restore the authoritative identity through Advanced Repair before normal editing.' });
          if (diagnostics.some(d => d.severity === 'error')) throw Object.assign(new Error(diagnostics.map(d => d.message).join(' ')), { status: 422 });
          await options.validate!({ locator, files: staged, metadata: incoming.metadata, diagnostics, hash: hash(staged) });
        }
      }, admit: async () => { await options.admit?.(); }, ...this.faults,
    });
    return { locator, files: staged, metadata: parseMetadata(staged.metadata).metadata, diagnostics: parseMetadata(staged.metadata).diagnostics, hash: hash(staged) };
  }
  async remove(locator: string, expectedHash: string, knownArtifacts: ArtifactBundle[], admit: () => Promise<void> = async () => {}): Promise<void> {
    const current = await this.read(locator);
    if (!expectedHash || current.hash !== expectedHash) throw new Error('Artifact changed. Reload before deletion.');
    const id = current.metadata?.componentId;
    const users = id ? knownArtifacts.filter(b => b !== current && (componentReferences(b.files.source).includes(id) || b.metadata?.dependencies?.includes(id))) : [];
    if (users.length) throw new Error(`Component is used by: ${users.map(b => b.locator).join(', ')}.`);
    const file = await this.file(locator);
    // Only service-created dedicated bundles can be deleted as a folder.
    if (path.basename(file) !== `${this.kind}.visual.json`) throw new Error('Delete manually placed artifact files through source control.');
    await admit();
    if ((await this.read(locator)).hash !== expectedHash) throw Object.assign(new Error('Artifact changed during deletion admission.'), { status: 409 });
    await moveToOsTrash(path.dirname(file));
  }
}
export function pageEntry(): string {
  return `import source from './page.html?raw';\nimport css from './page.css?raw';\nimport metadata from './page.visual.json';\nimport * as functions from './page.functions';\nimport { components, packages } from 'virtual:uip-visual-artifacts';\nimport { createVisualPage } from '@ui-platform/visual-artifacts/runtime';\nimport type { ArtifactMetadata } from '@ui-platform/visual-artifacts';\nexport const route = metadata.route;\nexport const title = metadata.displayName;\nimport { createApplicationDataServices } from '@uib/platform-core/application-data';\nexport const { render } = createVisualPage({ source, css, metadata: metadata as ArtifactMetadata, functions }, { components, packages, services: createApplicationDataServices() });\n`;
}
export function toRuntime(bundle: ArtifactBundle): RuntimeArtifact | undefined { return bundle.metadata ? { metadata: bundle.metadata, source: bundle.files.source, css: bundle.files.css } : undefined; }
export async function visualWorkspace(appKey: string, packages: PackageComponent[], options: RoleBundleReadOptions = {}) {
  options = { ...options };
  const pageService = new VisualArtifactService(path.join(appPath(appKey), 'src', 'pages'), 'page');
  const componentService = new VisualArtifactService(platformComponentsRoot, 'component');
  const reads = [pageService.list(options), componentService.list(options), new VisualArtifactService(path.join(appPath(appKey), 'shells'), 'shell').list(options)];
  const [pages, components, shells] = await Promise.all(reads).catch(async error => {
    if (options.recovery === 'refuse') await Promise.allSettled(reads);
    throw error;
  });
  const runtime = components.map(toRuntime).filter((item): item is RuntimeArtifact => Boolean(item));
  for (const bundle of [...pages, ...components, ...shells]) if (bundle.metadata) {
    try { bundle.diagnostics.push(...validateArtifact(toRuntime(bundle)!, runtime, packages)); }
    catch { bundle.diagnostics.push({ severity: 'error', message: 'Visual validation is unavailable until invalid metadata is repaired.' }); }
  }
  return { pages, components, shells, packages };
}
export async function knownVisualArtifacts(): Promise<ArtifactBundle[]> {
  const all = await new VisualArtifactService(platformComponentsRoot, 'component').list();
  all.push(...await new VisualArtifactService(path.join(platformRoot, 'references'), 'page').list());
  for (const app of await readdir(appsDir, { withFileTypes: true }).catch(() => [])) if (app.isDirectory() && !app.isSymbolicLink()) {
    all.push(...await new VisualArtifactService(path.join(appsDir, app.name, 'src', 'pages'), 'page').list());
    all.push(...await new VisualArtifactService(path.join(appsDir, app.name, 'shells'), 'shell').list());
  }
  return all;
}
