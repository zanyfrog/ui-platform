import path from 'node:path';
import { mkdir, readFile, readdir } from 'node:fs/promises';
import { readRoleBundle, saveRoleBundle, type RoleBundleLocation, type RoleBundleSnapshot } from '@ui-platform/artifacts/storage';
import { parseMetadata, validateArtifact, validateCompositionDefinition } from '@ui-platform/visual-artifacts';
import type { ArtifactFiles, PackageComponent, RuntimeArtifact } from '@ui-platform/visual-artifacts';
import { VisualArtifactService, platformComponentsRoot, toRuntime } from './visual-artifacts.js';
import { validateVisualRoleSyntax } from './visual-candidate.js';
import { validateRuntimeCss } from '@ui-platform/visual-artifacts/vite';

const roles = { source: '.html', css: '.css', metadata: '.visual.json', fixtures: '.fixtures.json', code: '.functions.ts' };
/** Caller holds the existing Application/Visual graph lock. This is an explicit
 * multi-artifact operation: each Visual bundle uses Foundation recovery; there
 * is deliberately no cross-artifact transaction or cross-artifact Undo.
 */
export async function prepareVisualSourcePlan(root: string, changes: ReadonlyMap<string, Buffer>, packages: PackageComponent[] = []) {
  const services = [['src/pages', 'page'], ['shells', 'shell']] as const;
  const records: Array<{ location: RoleBundleLocation; before: RoleBundleSnapshot; files: Record<string, string | null>; artifact: RuntimeArtifact; changed: boolean }> = [];
  const managedPaths = new Set<string>();
  const sharedService = new VisualArtifactService(platformComponentsRoot, 'component'), shared = await sharedService.list();
  const components = shared.map(toRuntime).filter((item): item is RuntimeArtifact => !!item);
  for (const [collection, kind] of services) {
    const service = new VisualArtifactService(path.join(root, collection), kind);
    const existing = await service.list(), anchors = new Set(existing.map(bundle => bundle.locator));
    for (const file of changes.keys()) if (file.startsWith(collection + '/') && file.endsWith('.visual.json')) anchors.add(file.slice(collection.length + 1));
    for (const locator of anchors) {
      const anchorFile = path.join(root, collection, locator), stem = path.basename(locator, '.visual.json');
      await mkdir(path.dirname(anchorFile), { recursive: true });
      const location = { root: service.root, directory: path.dirname(anchorFile), anchor: path.basename(anchorFile), paths: Object.values(roles).map(extension => stem + extension) };
      const before = await readRoleBundle(location), files = { ...before.files };
      let changed = false;
      for (const name of location.paths) {
        const relative = path.relative(root, path.join(location.directory, name)).replaceAll('\\', '/'); managedPaths.add(relative);
        const content = changes.get(relative);
        if (content) { if (!Buffer.from(content.toString('utf8')).equals(content)) throw new Error('Visual roles require UTF-8 source text.'); files[name] = content.toString('utf8'); changed = true; }
      }
      const candidate = Object.fromEntries(Object.entries(roles).map(([role, extension]) => [role, files[stem + extension] ?? ''])) as unknown as ArtifactFiles;
      const parsed = parseMetadata(candidate.metadata), old = parseMetadata(before.files[location.anchor] ?? '').metadata;
      if (!parsed.metadata || parsed.diagnostics.some(item => item.severity === 'error') || parsed.metadata.kind !== kind) throw new Error('The selected source operation requires valid complete Visual candidates.');
      if (old && (['artifactId', 'routeId', 'componentId', 'kind'] as const).some(name => old[name] && old[name] !== parsed.metadata![name])) throw new Error('Source operations cannot replace permanent Visual identities.');
      await validateVisualRoleSyntax(candidate);
      records.push({ location, before, files, artifact: { metadata: parsed.metadata, source: candidate.source, css: candidate.css }, changed });
    }
  }
  const sourceChecks = new Map<string, string | null>();
  const text = async (relative: string) => {
    const original = await readFile(path.join(root, relative), 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    sourceChecks.set(relative, original);
    if (changes.has(relative)) return changes.get(relative)!.toString('utf8');
    if (original === null) throw Object.assign(new Error('Source file is missing.'), { code: 'ENOENT' });
    return original;
  };
  const settings = JSON.parse(await text('app.settings.json').catch(error => { if (error.code === 'ENOENT') return '{}'; throw error; })).presentation;
  for (const record of records) {
    const errors = validateArtifact(record.artifact, components, packages).filter(item => item.severity === 'error');
    if (errors.length) throw new Error(errors.map(item => item.message).join(' '));
  }
  if (settings?.model === 'composition-v1') {
    const names = new Set(await readdir(path.join(root, 'menus')).catch(error => { if (error.code === 'ENOENT') return []; throw error; }));
    for (const name of changes.keys()) if (/^menus\/[^/]+\.json$/.test(name)) names.add(name.slice(6));
    const menus = await Promise.all([...names].filter(name => name.endsWith('.json')).map(async name => JSON.parse(await text('menus/' + name))));
    const pages = records.filter(item => item.artifact.metadata.kind === 'page').map(item => item.artifact), shells = records.filter(item => item.artifact.metadata.kind === 'shell').map(item => item.artifact);
    const siteCss = (await Promise.all((settings.siteStyles as string[]).map(text))).join('\n');
    await validateRuntimeCss(siteCss);
    validateCompositionDefinition({ settings, pages, shells, menus, siteCss, routes: pages.map(page => ({ pageId: page.metadata.artifactId, routeId: page.metadata.routeId!, path: page.metadata.route! })) }, components, packages);
  }
  return {
    managedPaths,
    async commit(admit: () => Promise<void> = async () => {}) {
      const expected = new Map(records.map(record => [record, record.before.checksum]));
      const check = async (current?: typeof records[number]) => {
        for (const [relative, original] of sourceChecks) if (await readFile(path.join(root, relative), 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; }) !== original) throw Object.assign(new Error('Composition source changed during the explicit operation.'), { status: 409 });
        for (const record of records) if (record !== current && (await readRoleBundle(record.location)).checksum !== expected.get(record)) throw Object.assign(new Error('Visual dependency changed during the explicit operation.'), { status: 409 });
        for (const bundle of shared) if ((await sharedService.read(bundle.locator)).hash !== bundle.hash) throw Object.assign(new Error('A shared Component changed during the explicit operation.'), { status: 409 });
      };
      for (const record of records) if ((await readRoleBundle(record.location)).checksum !== record.before.checksum) throw Object.assign(new Error('Visual source changed while preparing the explicit operation.'), { status: 409 });
      for (const bundle of shared) if ((await sharedService.read(bundle.locator)).hash !== bundle.hash) throw Object.assign(new Error('A shared Component changed while preparing the explicit operation.'), { status: 409 });
      await admit(); const committed: string[] = [];
      try {
        for (const record of records.filter(item => item.changed)) {
          const saved = await saveRoleBundle(record.location, { expectedChecksum: record.before.checksum, files: record.files, validate() {}, async admit() { await admit(); await check(record); } });
          expected.set(record, saved.checksum);
          committed.push(record.artifact.metadata.artifactId);
        }
      } catch (error) {
        if (!committed.length) throw error;
        throw partialSourceOperation(error, committed);
      }
      return committed;
    },
  };
}

export function partialSourceOperation(error: unknown, committed: string[]): Error {
  const recoveryRequired = (error as { code?: string }).code === 'source.recovery-required';
  return Object.assign(new Error('The explicit source operation completed some source files before failing. Reload or recover the affected source before retrying.', { cause: error }), { status: 409, code: recoveryRequired ? 'source.recovery-required' : 'source.partial-operation', committed, recoveryRequired });
}
