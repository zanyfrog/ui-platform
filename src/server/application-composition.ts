import { createHash } from 'node:crypto';
import { lstat, mkdir, readFile, readdir, writeFile, rename } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { regions, remapPageRegions, themeCss, validateMenu, parseSource, parseMetadata, validateArtifact, applyMenuOverrides, composeShellMenus, valueErrors, validateCompositionDefinition, primaryRouteSignature } from '@ui-platform/visual-artifacts';
import type { ApplicationMenu, CompositionDefinition, CompositionSettings, PackageComponent } from '@ui-platform/visual-artifacts';
import { appPath } from './applications.js';
import { atomicWriteText } from './json-files.js';
import { VisualArtifactService, toRuntime, platformComponentsRoot } from './visual-artifacts.js';
import { withApplicationMutation } from './composition-lock.js';
import { transform } from 'esbuild';
import { discoverComponents } from './component-registry.js';

const hash = (text: string) => createHash('sha256').update(text).digest('hex');
export async function compositionSettings(appKey: string): Promise<CompositionSettings | undefined> {
  const settings = JSON.parse(await readFile(path.join(appPath(appKey), 'app.settings.json'), 'utf8'));
  return settings.presentation?.model === 'composition-v1' ? settings.presentation : undefined;
}
export async function compositionWorkspace(appKey: string, packages: PackageComponent[] = [], candidate?: { path: string; content: string }): Promise<CompositionDefinition | null> {
  const settings: CompositionSettings | undefined = candidate?.path === 'app.settings.json' ? JSON.parse(candidate.content).presentation : await compositionSettings(appKey); if (!settings || settings.model !== 'composition-v1') return null;
  if (settings.assetsRoot !== 'assets' || !settings.branding?.applicationName || !Array.isArray(settings.siteStyles)) throw new Error('Composition requires branding, source styles and the Application assets root.');
  const app = appPath(appKey);
  const [shells, pages] = await Promise.all([new VisualArtifactService(path.join(app, 'shells'), 'shell').list(), new VisualArtifactService(path.join(app, 'src/pages'), 'page').list()]);
  const menus: ApplicationMenu[] = [];
  const read = async (relative: string) => candidate?.path === relative ? candidate.content : (await readCompositionSource(appKey, relative)).content;
  const menuFiles = new Set(await readdir(path.join(app, 'menus')).catch(() => []));
  if (candidate?.path.startsWith('menus/')) menuFiles.add(candidate.path.slice('menus/'.length));
  for (const file of menuFiles) if (file.endsWith('.json')) {
    const content = await read(`menus/${file}`);
    const menu = JSON.parse(content); validateMenu(menu); menus.push({ ...menu, sourcePath: `menus/${file}` });
  }
  const valid = (items: typeof shells) => items.map(item => { if (!item.metadata || item.diagnostics.some(d => d.severity === 'error')) throw new Error(`Repair ${item.locator}.`); return toRuntime(item)!; });
  const runtimePages = valid(pages), runtimeShells = valid(shells);
  const sharedComponents = await new VisualArtifactService(platformComponentsRoot, 'component').list();
  const components = sharedComponents.map(toRuntime).filter((item): item is NonNullable<typeof item> => Boolean(item));
  for (const artifact of [...runtimePages, ...runtimeShells]) {
    const errors = validateArtifact(artifact, components, packages).filter(diagnostic => diagnostic.severity === 'error');
    if (errors.length) throw new Error(`${artifact.metadata.displayName}: ${errors.map(error => error.message).join(' ')}`);
    regions(artifact.source);
    if (artifact.metadata.kind === 'page') for (const node of parseSource(artifact.source).nodes) {
      let parent: typeof node | undefined = node;
      while (parent && !Object.hasOwn(parent.attributes, 'data-uip-region')) parent = parent.parent;
      if (!parent) throw new Error(`Page content must belong to a Shell Region: ${artifact.metadata.displayName}.`);
    }
  }
  if (!runtimeShells.some(shell => shell.metadata.artifactId === settings.defaultShellId)) throw new Error('Application default Shell is missing.');
  const routeIds = new Set<string>(), paths = new Set<string>();
  const routes = runtimePages.map(page => {
    const m = page.metadata;
    if (!m.routeId || !m.shellId || !runtimeShells.some(shell => shell.metadata.artifactId === m.shellId)) throw new Error(`Page requires permanent Route and Shell identities: ${m.name}.`);
    const signature = primaryRouteSignature(m.route!);
    if (routeIds.has(m.routeId) || paths.has(signature)) throw new Error('Each Page requires a unique primary Route.'); routeIds.add(m.routeId); paths.add(signature);
    return { pageId: m.artifactId, routeId: m.routeId, path: m.route! };
  });
  const menuIds = new Set<string>(); for (const menu of menus) { if (menuIds.has(menu.menuId)) throw new Error('Duplicate Menu identity.'); menuIds.add(menu.menuId); }
  themeCss(settings);
  const siteCss = (await Promise.all((settings.siteStyles as string[]).map(read))).join('\n');
  const definition = { settings, shells: runtimeShells, pages: runtimePages, routes, menus, siteCss };
  for (const page of runtimePages) {
    const shell = runtimeShells.find(shell => shell.metadata.artifactId === page.metadata.shellId)!;
    const available = new Set(regions(shell.source).map(region => region.regionId));
    if (regions(page.source).some(region => !available.has(region.regionId))) throw new Error(`Map or discard unmatched Regions in ${page.metadata.displayName}.`);
    for (const menuId of Object.keys(page.metadata.menuOverrides ?? {})) if (!menus.some(menu => menu.menuId === menuId)) throw new Error(`Page Menu override refers to a missing Menu: ${menuId}.`);
    for (const menu of menus) validateMenu(applyMenuOverrides(menu, page.metadata.menuOverrides));
    const params = Object.fromEntries([...page.metadata.route!.matchAll(/:([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\]/g)].map(match => [match[1] ?? match[2], '__parameter__']));
    const renderedShell = composeShellMenus(shell, definition, page, page.metadata.routeId!, params);
    const errors = validateArtifact(renderedShell, components, packages).filter(diagnostic => diagnostic.severity === 'error');
    if (errors.length) throw new Error(errors.map(error => error.message).join(' '));
  }
  for (const [shellId, values] of Object.entries(settings.shellConfiguration ?? {})) {
    const shell = runtimeShells.find(shell => shell.metadata.artifactId === shellId); if (!shell) throw new Error('Shell configuration target is missing.');
    for (const [name, value] of Object.entries(values)) {
      const contract = shell.metadata.public?.properties[name]; if (!contract) throw new Error(`Unknown Shell property: ${name}.`);
      const errors = valueErrors(value, contract, name); if (errors.length) throw new Error(errors.join(' '));
    }
  }
  for (const value of [settings.branding.primaryLogo, settings.branding.secondaryLogo, settings.branding.favicon]) if (value) {
    if (!(await compositionAssetInfo(appKey, value)).hash) throw new Error(`Branding asset is missing: ${value}.`);
  }
  validateCompositionDefinition(definition, components, packages);
  return definition;
}
export async function compositionSourcePath(appKey: string, relative: string): Promise<string> {
  if (!/^(app\.settings\.json|menus\/[a-z0-9-]+\.json|styles\/[a-z0-9-]+\.css|assets\/(?:[a-z0-9-]+\/)*[a-z0-9-]+\.(?:svg|png|jpg|jpeg|webp|ico|pdf|txt))$/.test(relative)) throw new Error('Unsupported composition source path.');
  let current = path.resolve(appPath(appKey));
  for (let ancestor = current; ; ancestor = path.dirname(ancestor)) {
    const info = await lstat(ancestor).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (info?.isSymbolicLink()) throw new Error('Composition roots cannot contain symlinks.');
    if (path.dirname(ancestor) === ancestor) break;
  }
  for (const segment of relative.split('/')) {
    current = path.join(current, segment);
    const info = await lstat(current).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (info?.isSymbolicLink()) throw new Error('Composition source paths cannot contain symlinks.');
  }
  return current;
}
export async function compositionAssetInfo(appKey: string, relative: string) {
  if (!relative.startsWith('assets/')) throw new Error('Application asset path required.');
  const content = await readFile(await compositionSourcePath(appKey, relative)).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
  return { path: relative, hash: content ? createHash('sha256').update(content).digest('hex') : null };
}
/** Read-only picker inventory over native Application sources. Never follow links. */
export async function compositionSourceChoices(appKey: string): Promise<{ assets: string[]; styles: string[] }> {
  const result = { assets: [] as string[], styles: [] as string[] };
  for (const [folder, entries] of [['assets', result.assets], ['styles', result.styles]] as const) {
    await compositionSourcePath(appKey, folder === 'assets' ? 'assets/probe.png' : 'styles/probe.css');
    const walk = async (relative: string): Promise<void> => {
      for (const entry of await readdir(path.join(appPath(appKey), relative), { withFileTypes: true }).catch(error => { if (error.code === 'ENOENT') return []; throw error; })) {
        if (entry.isSymbolicLink()) continue;
        const source = `${relative}/${entry.name}`;
        if (entry.isDirectory() && folder === 'assets') await walk(source);
        else if (entry.isFile()) { try { await compositionSourcePath(appKey, source); entries.push(source); } catch { /* Unsupported source contracts are not picker candidates. */ } }
      }
    };
    await walk(folder);
    entries.sort();
  }
  return result;
}
export async function saveCompositionAsset(appKey: string, relative: string, content: Buffer, expectedHash: string | null, admit: () => Promise<void> = async () => {}) {
  return locked(appKey, async () => {
    const current = await compositionAssetInfo(appKey, relative);
    if (current.hash !== expectedHash) throw new Error('Application asset changed. Reload before replacing it.');
    await admit();
    if ((await compositionAssetInfo(appKey, relative)).hash !== expectedHash) throw Object.assign(new Error('Application asset changed during admission.'), { status: 409 });
    const file = await compositionSourcePath(appKey, relative); await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`; await writeFile(temporary, content); await rename(temporary, file);
    return compositionAssetInfo(appKey, relative);
  });
}
export async function readCompositionSource(appKey: string, relative: string): Promise<{ path: string; content: string; hash: string }> {
  const content = await readFile(await compositionSourcePath(appKey, relative), 'utf8'); return { path: relative, content, hash: hash(content) };
}
export async function validateCompositionStyle(content: string): Promise<void> {
  const css = await transform(content, { loader: 'css', logLevel: 'silent' });
  if (css.warnings.length) throw new Error(css.warnings.map(item => item.text).join(' '));
}
export async function saveCompositionSource(appKey: string, relative: string, content: string, expectedHash: string | null, admit: () => Promise<void> = async () => {}) {
  return locked(appKey, async () => {
    const file = await compositionSourcePath(appKey, relative);
    const current = await readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; });
    if (current === null ? expectedHash !== null : !expectedHash || hash(current) !== expectedHash) throw Object.assign(new Error('Composition source changed. Reload or recover before saving.'), { status: 409 });
    try {
    if (relative.startsWith('menus/')) {
      const menu = JSON.parse(content) as ApplicationMenu; validateMenu(menu);
      if (current && JSON.parse(current).menuId !== menu.menuId) throw new Error('Menu identity is immutable.');
    }
    if (relative === 'app.settings.json') {
      const value = JSON.parse(content), old = JSON.parse(current!);
      if (JSON.stringify(value.application) !== JSON.stringify(old.application)) throw new Error('Edit application name/status through Application settings.');
      if (value.presentation?.model !== 'composition-v1') throw new Error('Composition model cannot be removed.');
      themeCss(value.presentation);
      const shells = await new VisualArtifactService(path.join(appPath(appKey), 'shells'), 'shell').list();
      if (!shells.some(shell => shell.metadata?.artifactId === value.presentation.defaultShellId)) throw new Error('Default Shell is missing.');
      for (const style of value.presentation.siteStyles) await compositionSourcePath(appKey, style);
    }
    if (relative.startsWith('styles/')) {
      await validateCompositionStyle(content);
    }
    try { await compositionWorkspace(appKey, await discoverComponents(appKey), { path: relative, content }); }
    catch { throw new Error('The candidate conflicts with Application composition. Check related routes, Menus, Shells and styles before saving.'); }
    } catch (error) { throw Object.assign(error instanceof Error ? error : new Error(String(error)), { status: 422 }); }
    await admit();
    if (await readFile(file, 'utf8').catch(error => { if (error.code === 'ENOENT') return null; throw error; }) !== current) throw Object.assign(new Error('Composition source changed during save admission.'), { status: 409 });
    if (content !== current) await atomicWriteText(file, content);
    return { path: relative, content, hash: hash(content) };
  });
}
export async function validateCompositionEdit(appKey: string, kind: 'page' | 'shell', locator: string, role: string, content: string): Promise<void> {
  if (!await compositionSettings(appKey)) return;
  const app = appPath(appKey), service = new VisualArtifactService(path.join(app, kind === 'shell' ? 'shells' : 'src/pages'), kind);
  const current = await service.read(locator);
  if (role === 'source' && parseSource(content).diagnostics.some(diagnostic => diagnostic.severity === 'error')) return; // Preserve the accepted source-repair workflow.
  if (role === 'metadata' && !parseMetadata(content).metadata) return;
  if (kind === 'page') {
    const metadata = role === 'metadata' ? JSON.parse(content) : current.metadata!;
    if (role === 'metadata' && metadata.shellId !== current.metadata?.shellId) throw new Error('Use Change Shell to map or discard unmatched Regions.');
    const shell = (await new VisualArtifactService(path.join(app, 'shells'), 'shell').list()).find(shell => shell.metadata?.artifactId === metadata.shellId);
    if (!shell) throw new Error('Selected Shell is missing.');
    if (role === 'source' && regions(content).some(region => !regions(shell.files.source).some(target => target.regionId === region.regionId))) throw new Error('Page Regions must exist in the selected Shell.');
  } else if (role === 'source') {
    const ids = new Set(regions(content).map(region => region.regionId));
    const users = (await new VisualArtifactService(path.join(app, 'src/pages'), 'page').list()).filter(page => page.metadata?.shellId === current.metadata?.artifactId && regions(page.files.source).some(region => !ids.has(region.regionId)));
    if (users.length) throw new Error(`Region removal/ID change requires remapping dependent Pages first: ${users.map(page => page.metadata?.name).join(', ')}.`);
  }
}
export async function changePageShell(appKey: string, locator: string, shellId: string, decisions: Record<string, string | null>, expectedHash: string, admit: () => Promise<void> = async () => {}) {
  return locked(appKey, async () => {
    const pages = new VisualArtifactService(path.join(appPath(appKey), 'src/pages'), 'page');
    const page = await pages.read(locator); if (page.hash !== expectedHash) throw new Error('Page changed. Reload before changing Shell.');
    const shell = (await new VisualArtifactService(path.join(appPath(appKey), 'shells'), 'shell').list()).find(shell => shell.metadata?.artifactId === shellId);
    if (!shell) throw new Error('Selected Shell is missing.');
    const source = remapPageRegions(page.files.source, shell.files.source, decisions);
    const metadata = structuredClone(page.metadata!); metadata.shellId = shellId;
    const retainedIds = new Set(parseSource(source).nodes.map(node => node.id));
    for (const key of ['bindings', 'conditions', 'repeaters', 'events'] as const) metadata[key] = metadata[key]?.filter(item => retainedIds.has(item.node)) as never;
    if (metadata.layout) metadata.layout = Object.fromEntries(Object.entries(metadata.layout).filter(([id]) => retainedIds.has(id)));
    if (metadata.modes) for (const [mode, overrides] of Object.entries(metadata.modes.overrides)) metadata.modes.overrides[mode] = Object.fromEntries(Object.entries(overrides).filter(([id]) => retainedIds.has(id)));
    // One Foundation transaction for the complete Shell-remapped Page candidate.
    const { prepareVisualCandidate } = await import('./visual-candidate.js');
    const validation = await prepareVisualCandidate(appKey, 'page', locator, await discoverComponents(appKey), true);
    return pages.saveCandidate(locator, { ...page.files, source, metadata: JSON.stringify(metadata, null, 2) + '\n' }, expectedHash, { validate: candidate => validation.validate(candidate), admit: async () => { await validation.recheck(); await admit(); } });
  });
}
export async function assertShellUnused(appKey: string, shellId: string): Promise<void> {
  const settings = await compositionSettings(appKey);
  if (settings?.defaultShellId === shellId) throw new Error('Choose another Application default Shell before deleting this Shell.');
  const pages = await new VisualArtifactService(path.join(appPath(appKey), 'src/pages'), 'page').list();
  if (pages.some(page => page.metadata?.shellId === shellId)) throw new Error('Shell is used by Pages. Change their Shells before deletion.');
}
async function locked<T>(key: string, work: () => Promise<T>): Promise<T> {
  return withApplicationMutation(appPath(key), work);
}
