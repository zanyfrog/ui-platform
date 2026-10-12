import { createHash, randomUUID } from 'node:crypto';
import { lstat, mkdir, readdir, readFile, rename, realpath } from 'node:fs/promises';
import path from 'node:path';
import { componentReferences, generateForm, parseMetadata, validateArtifact } from '@ui-platform/visual-artifacts';
import type { ArtifactBundle, ArtifactFiles, ArtifactMetadata, DatasetDefinition, PackageComponent, RuntimeArtifact } from '@ui-platform/visual-artifacts';
import { atomicWriteText } from './json-files.js';
import { moveToOsTrash } from './trash.js';
import { appPath } from './applications.js';
import { appsDir, platformRoot } from './paths.js';

export const platformComponentsRoot = path.join(platformRoot, 'components');
const roles = { source: '.html', css: '.css', metadata: '.visual.json', fixtures: '.fixtures.json', code: '.functions.ts' } as const;
const hash = (files: ArtifactFiles) => createHash('sha256').update(JSON.stringify(files)).digest('hex');
const locks = new Map<string, Promise<unknown>>();

/** One file service for Pages and Components; roots and metadata are the specializations. */
export class VisualArtifactService {
  constructor(readonly root: string, readonly kind: 'page' | 'component') {}
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
    return current;
  }
  async list(): Promise<ArtifactBundle[]> {
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
    for (const locator of locators.sort()) {
      try { bundles.push(await this.read(locator)); }
      catch (error) { bundles.push({ locator, hash: '', files: { source: '', css: '', metadata: '', fixtures: '', code: '' }, diagnostics: [{ severity: 'error', message: String(error) }] }); }
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
  async read(locator: string): Promise<ArtifactBundle> {
    const file = await this.file(locator);
    const stem = file.slice(0, -'.visual.json'.length);
    const files = {} as ArtifactFiles;
    for (const [role, extension] of Object.entries(roles)) {
      const target = `${stem}${extension}`;
      const info = await lstat(target).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
      if (info?.isSymbolicLink()) throw new Error('Visual Artifact files cannot be symlinks.');
      (files as unknown as Record<string, string>)[role] = info ? await readFile(target, 'utf8') : '';
    }
    if (!files.metadata) throw new Error('Visual Artifact metadata is missing.');
    const parsed = parseMetadata(files.metadata);
    const diagnostics = [...parsed.diagnostics];
    if (parsed.metadata?.kind !== this.kind) diagnostics.push({ severity: 'error', message: `Expected a ${this.kind} in this source location.` });
    if (!files.source) diagnostics.push({ severity: 'error', message: 'HTML source is missing or empty.' });
    try { JSON.parse(files.fixtures || '{}'); } catch { diagnostics.push({ severity: 'error', message: 'Preview fixtures are invalid JSON.' }); }
    return { locator, files, hash: hash(files), metadata: parsed.metadata, diagnostics };
  }
  async create(name: string, route?: string, form?: { dataset?: DatasetDefinition }): Promise<ArtifactBundle> {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new Error('Use a lowercase name with letters, numbers, and hyphens.');
    const locator = `${name}/${this.kind}.visual.json`;
    const file = await this.file(locator, true);
    if (await lstat(path.dirname(file)).then(() => true, error => { if (error.code === 'ENOENT') return false; throw error; })) throw new Error('An artifact folder already exists.');
    const temporary = path.join(this.root, `.creating-${randomUUID()}`);
    const metadata: ArtifactMetadata = { schemaVersion: 1, artifactId: `art_${randomUUID()}`, kind: this.kind, name, displayName: name.replaceAll('-', ' '), ...(this.kind === 'component' ? { componentId: `cmp_platform_${randomUUID()}`, public: { properties: {}, events: {}, slots: [] } } : { route: route ?? `/${name}` }) };
    const files: ArtifactFiles = form ? generateForm(metadata, form.dataset) : { source: `<section class="uip-layout-item" data-uip-node="node_${randomUUID()}"></section>\n`, css: '', metadata: JSON.stringify(metadata, null, 2) + '\n', fixtures: '{}\n', code: 'export {};\n' };
    await mkdir(temporary);
    for (const [role, extension] of Object.entries(roles)) await atomicWriteText(path.join(temporary, `${this.kind}${extension}`), files[role as keyof ArtifactFiles]);
    if (this.kind === 'page') await atomicWriteText(path.join(temporary, 'index.ts'), pageEntry());
    await rename(temporary, path.dirname(file));
    return this.read(locator);
  }
  async save(locator: string, role: keyof ArtifactFiles, content: string, expectedHash: string): Promise<ArtifactBundle> {
    if (!Object.hasOwn(roles, role) || typeof content !== 'string' || !expectedHash) throw new Error('File role, text, and expected hash are required.');
    const key = `${this.root}/${locator}`;
    const previous = locks.get(key) ?? Promise.resolve();
    const next = previous.catch(() => {}).then(async () => {
      const current = await this.read(locator);
      if (current.hash !== expectedHash) throw new Error('Visual Artifact changed on disk. Reload or recover your editor changes before saving.');
      if (role === 'metadata') {
        const incoming = parseMetadata(content).metadata;
        // Malformed source may be saved for repair, but parseable identity changes may not.
        if (incoming && current.metadata && ((current.metadata.artifactId && incoming.artifactId !== current.metadata.artifactId) || (current.metadata.componentId && incoming.componentId !== current.metadata.componentId) || (['page', 'component'].includes(current.metadata.kind) && incoming.kind !== current.metadata.kind))) throw new Error('Artifact and Component identities and kind are immutable.');
      }
      const file = await this.file(locator);
      await atomicWriteText(file.slice(0, -'.visual.json'.length) + roles[role], content);
      return this.read(locator);
    });
    locks.set(key, next);
    try { return await next; } finally { if (locks.get(key) === next) locks.delete(key); }
  }
  async remove(locator: string, expectedHash: string, knownArtifacts: ArtifactBundle[]): Promise<void> {
    const current = await this.read(locator);
    if (!expectedHash || current.hash !== expectedHash) throw new Error('Artifact changed. Reload before deletion.');
    const id = current.metadata?.componentId;
    const users = id ? knownArtifacts.filter(b => b !== current && (componentReferences(b.files.source).includes(id) || b.metadata?.dependencies?.includes(id))) : [];
    if (users.length) throw new Error(`Component is used by: ${users.map(b => b.locator).join(', ')}.`);
    const file = await this.file(locator);
    // Only service-created dedicated bundles can be deleted as a folder.
    if (path.basename(file) !== `${this.kind}.visual.json`) throw new Error('Delete manually placed artifact files through source control.');
    await moveToOsTrash(path.dirname(file));
  }
}
export function pageEntry(): string {
  return `import source from './page.html?raw';\nimport css from './page.css?raw';\nimport metadata from './page.visual.json';\nimport * as functions from './page.functions';\nimport { components, packages } from 'virtual:uip-visual-artifacts';\nimport { createVisualPage } from '@ui-platform/visual-artifacts/runtime';\nimport type { ArtifactMetadata } from '@ui-platform/visual-artifacts';\nexport const route = metadata.route;\nexport const title = metadata.displayName;\nimport { createApplicationDataServices } from '@uib/platform-core/application-data';\nexport const { render } = createVisualPage({ source, css, metadata: metadata as ArtifactMetadata, functions }, { components, packages, services: createApplicationDataServices() });\n`;
}
export function toRuntime(bundle: ArtifactBundle): RuntimeArtifact | undefined { return bundle.metadata ? { metadata: bundle.metadata, source: bundle.files.source, css: bundle.files.css } : undefined; }
export async function visualWorkspace(appKey: string, packages: PackageComponent[]) {
  const pageService = new VisualArtifactService(path.join(appPath(appKey), 'src', 'pages'), 'page');
  const componentService = new VisualArtifactService(platformComponentsRoot, 'component');
  const [pages, components] = await Promise.all([pageService.list(), componentService.list()]);
  const runtime = components.map(toRuntime).filter((item): item is RuntimeArtifact => Boolean(item));
  for (const bundle of [...pages, ...components]) if (bundle.metadata) bundle.diagnostics.push(...validateArtifact(toRuntime(bundle)!, runtime, packages));
  return { pages, components, packages };
}
export async function knownVisualArtifacts(): Promise<ArtifactBundle[]> {
  const all = await new VisualArtifactService(platformComponentsRoot, 'component').list();
  all.push(...await new VisualArtifactService(path.join(platformRoot, 'references'), 'page').list());
  for (const app of await readdir(appsDir, { withFileTypes: true }).catch(() => [])) if (app.isDirectory() && !app.isSymbolicLink()) all.push(...await new VisualArtifactService(path.join(appsDir, app.name, 'src', 'pages'), 'page').list());
  return all;
}
