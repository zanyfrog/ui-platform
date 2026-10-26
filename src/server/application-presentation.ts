import crypto from 'node:crypto';
import { defaultPresentation, validatePresentation, renderPresentationCss } from './presentation-format.js';
export { defaultPresentation, validatePresentation, renderPresentationCss };
export { createPresentationPublicationOwner, PresentationPublicationError } from './presentation-publications.js';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ApplicationPresentation, ApplicationPresentationManifest, ApplicationPresentationStatus, PresentationAsset, PresentationHero } from '../shared/presentation.js';
import { APPLICATION_PRESENTATION_VERSION } from '../shared/presentation.js';
import { appPath, getApp } from './applications.js';
import { atomicWriteJson, atomicWriteText, readJson } from './json-files.js';
import { appendHistory } from './history.js';
import { discoverComponents } from './component-registry.js';
import { compositionSettings, compositionWorkspace } from './application-composition.js';
import { compositionSourceFingerprint, compositionSourceFiles, copyCompositionSnapshot, copyReferencedSharedComponents } from './composition-snapshots.js';
import { prepareVisualSourcePlan, partialSourceOperation } from './visual-source-plan.js';
import { platformComponentsRoot } from './visual-artifacts.js';
import { withApplicationMutation } from './composition-lock.js';
import { readRoleBundle, saveRoleBundle } from '@ui-platform/artifacts/storage';
import { transform } from 'esbuild';

const MANIFEST_FILE = 'presentation.manifest.json';
const DRAFT_DIR = 'draft';
const PRESENTATION_FILE = 'presentation.json';

function root(key: string): string { return path.join(appPath(key), 'presentation'); }
function activeAssetsRoot(key: string): string { return path.join(root(key), 'assets'); }
function draftAssetsRoot(key: string): string { return path.join(root(key), DRAFT_DIR, 'assets'); }
function manifestPath(key: string): string { return path.join(root(key), MANIFEST_FILE); }
function draftPath(key: string): string { return path.join(root(key), DRAFT_DIR, PRESENTATION_FILE); }
function versionPath(key: string, version: number): string { return path.join(root(key), 'versions', `v${version}`, PRESENTATION_FILE); }
function activeCssPath(key: string): string { return path.join(root(key), 'active.css'); }
function checksum(value: unknown): string { return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex'); }

async function readManifest(key: string): Promise<ApplicationPresentationManifest | null> {
  const snapshot = await presentationSource(key);
  return snapshot?.files[MANIFEST_FILE] ? JSON.parse(snapshot.files[MANIFEST_FILE]!) : null;
}
async function readDraft(key: string): Promise<ApplicationPresentation | null> {
  const snapshot = await presentationSource(key);
  return snapshot?.files[`${DRAFT_DIR}/${PRESENTATION_FILE}`] ? validatePresentation(JSON.parse(snapshot.files[`${DRAFT_DIR}/${PRESENTATION_FILE}`]!)) : null;
}
const presentationLocation = (key: string) => ({ root: root(key), directory: root(key), anchor: MANIFEST_FILE, paths: [MANIFEST_FILE, `${DRAFT_DIR}/${PRESENTATION_FILE}`] });
async function presentationSource(key: string) {
  if (!await stat(root(key)).catch(error => { if (error.code === 'ENOENT') return null; throw error; })) return undefined;
  return readRoleBundle(presentationLocation(key));
}
export async function getApplicationPresentation(key: string): Promise<ApplicationPresentationStatus> {
  const snapshot = await presentationSource(key);
  const manifest = snapshot?.files[MANIFEST_FILE] ? JSON.parse(snapshot.files[MANIFEST_FILE]!) as ApplicationPresentationManifest : null;
  const rawDraft = snapshot?.files[`${DRAFT_DIR}/${PRESENTATION_FILE}`];
  const draft = rawDraft ? validatePresentation(JSON.parse(rawDraft)) : null;
  if (!manifest || !draft) return { initialized: false, manifest: null, draft: null, draftDiffersFromActive: false };
  const active = manifest.activeVersion === null ? null : await readVersion(key, manifest.activeVersion);
  let compositionChanged = false;
  if (await compositionSettings(key)) compositionChanged = !manifest.activeVersion || await compositionSourceFingerprint(appPath(key), platformComponentsRoot) !== await readFile(path.join(root(key), 'versions', `v${manifest.activeVersion}`, 'composition.source-checksum'), 'utf8').catch(() => '');
  return { initialized: true, manifest, draft, sourceRevision: snapshot!.checksum, draftDiffersFromActive: !active || checksum(draft) !== checksum(active) || compositionChanged };
}
async function readVersion(key: string, version: number): Promise<ApplicationPresentation | null> {
  try { return validatePresentation(await readJson<unknown>(versionPath(key, version))); } catch { return null; }
}
export async function initializeApplicationPresentation(key: string, admit: () => Promise<void> = async () => {}): Promise<ApplicationPresentationStatus> {
  return withApplicationMutation(appPath(key), async () => { await admit(); return initializePresentationSource(key); });
}
async function initializePresentationSource(key: string): Promise<ApplicationPresentationStatus> {
  const app = await getApp(key);
  const existing = await getApplicationPresentation(key);
  if (existing.initialized) {
    await ensurePresentationRuntimeImport(key);
    return existing;
  }
  const draft = defaultPresentation();
  const now = new Date().toISOString();
  const manifest: ApplicationPresentationManifest = { type: 'ui-platform.presentation', schemaVersion: APPLICATION_PRESENTATION_VERSION, applicationId: app.appId, activeVersion: null, draft: { exists: true, modifiedAt: now, checksum: checksum(draft) }, versions: [] };
  await mkdir(path.dirname(draftPath(key)), { recursive: true });
  const original = await readRoleBundle(presentationLocation(key));
  await mkdir(activeAssetsRoot(key), { recursive: true });
  await mkdir(draftAssetsRoot(key), { recursive: true });
  await atomicWriteText(activeCssPath(key), '/* Application Presentation has not been published yet. */\n');
  await writePresentationRuntime(key, draft);
  await ensurePresentationRuntimeImport(key);
  await saveRoleBundle(presentationLocation(key), { expectedChecksum: original.checksum, files: { [MANIFEST_FILE]: JSON.stringify(manifest, null, 2) + '\n', [`${DRAFT_DIR}/${PRESENTATION_FILE}`]: JSON.stringify(draft, null, 2) + '\n' }, validate() { validatePresentation(draft); }, admit() {} });
  await appendHistory(appPath(key), { action: 'presentation.initialized', appId: app.appId, actor: 'local-user' });
  return getApplicationPresentation(key);
}
export async function savePresentationDraft(key: string, value: unknown, expectedRevision?: string, admit: () => Promise<void> = async () => {}): Promise<ApplicationPresentationStatus> {
  return withApplicationMutation(appPath(key), () => savePresentationDraftSource(key, value, expectedRevision, admit));
}
async function savePresentationDraftSource(key: string, value: unknown, expectedRevision?: string, admit: () => Promise<void> = async () => {}): Promise<ApplicationPresentationStatus> {
  let presentation: ApplicationPresentation;
  try {
  presentation = validatePresentation(value);
  await validateComponentDefaults(key, presentation.componentDefaults);
  const css = await transform(renderPresentationCss(presentation), { loader: 'css', logLevel: 'silent' });
  if (css.warnings.length) throw new Error(css.warnings.map(item => item.text).join(' '));
  } catch (error) { throw Object.assign(error instanceof Error ? error : new Error(String(error)), { status: 422 }); }
  let status = await getApplicationPresentation(key);
  if (!status.initialized) {
    if (expectedRevision) throw Object.assign(new Error('Presentation baseline was removed. Recover before saving.'), { status: 409 });
    await admit(); status = await initializePresentationSource(key);
  }
  if (expectedRevision && expectedRevision !== status.sourceRevision) throw Object.assign(new Error('Presentation source changed. Reload or recover before saving.'), { status: 409 });
  const manifest = status.manifest!;
  if (manifest.applicationId !== (await getApp(key)).appId) throw Object.assign(new Error('Original presentation owner changed.'), { status: 409 });
  if (checksum(presentation) === checksum(status.draft)) {
    await admit();
    if ((await readRoleBundle(presentationLocation(key))).checksum !== status.sourceRevision) throw Object.assign(new Error('Presentation source changed during admission.'), { status: 409 });
    return status;
  }
  const now = new Date().toISOString();
  manifest.draft = { exists: true, modifiedAt: now, checksum: checksum(presentation) };
  const original = await readRoleBundle(presentationLocation(key));
  await saveRoleBundle(presentationLocation(key), { expectedChecksum: expectedRevision ?? original.checksum, files: { [MANIFEST_FILE]: JSON.stringify(manifest, null, 2) + '\n', [`${DRAFT_DIR}/${PRESENTATION_FILE}`]: JSON.stringify(presentation, null, 2) + '\n' }, validate() { validatePresentation(presentation); }, admit });
  await appendHistory(appPath(key), { action: 'presentation.draft.updated', actor: 'local-user' });
  return getApplicationPresentation(key);
}

async function validateComponentDefaults(key: string, defaults: ApplicationPresentation['componentDefaults']): Promise<void> {
  if (!Object.keys(defaults).length) return;
  const [applicationComponents, uiBaseComponents] = await Promise.all([discoverComponents(key), discoverComponents()]);
  const components = new Map([...uiBaseComponents, ...applicationComponents].map((component) => [component.tagName, component]));
  for (const [tagName, settings] of Object.entries(defaults)) {
    const component = components.get(tagName);
    if (!component?.presentation) throw new Error(`${tagName} does not provide application-presentation metadata.`);
    for (const [name, value] of Object.entries(settings)) {
      const definition = component.presentation.settings[name];
      if (!definition) throw new Error(`${tagName}.${name} is not an application-presentation setting.`);
      if (definition.accessibilityLocked) throw new Error(`${tagName}.${name} is accessibility-locked and cannot be overridden.`);
      if (typeof value !== definition.type && !(definition.type === 'select' && (typeof value === 'string' || typeof value === 'number'))) throw new Error(`${tagName}.${name} must be a ${definition.type}.`);
      if (definition.type === 'select' && !definition.options?.includes(value as string | number)) throw new Error(`${tagName}.${name} must be one of its declared options.`);
    }
  }
}
export async function publishPresentation(key: string, admit: () => Promise<void> = async () => {}): Promise<ApplicationPresentationStatus> {
  return withApplicationMutation(appPath(key), async () => { await admit(); return publishPresentationSource(key, admit); });
}
async function publishPresentationSource(key: string, admit: () => Promise<void>): Promise<ApplicationPresentationStatus> {
  const status = await initializePresentationSource(key);
  const draft = status.draft!;
  const manifest = status.manifest!;
  const version = Math.max(0, ...manifest.versions.map((item) => item.version)) + 1;
  const now = new Date().toISOString();
  const hash = checksum(draft);
  const css = renderPresentationCss(draft);
  if (await compositionSettings(key)) {
    await compositionWorkspace(key, await discoverComponents(key));
    await copyCompositionSnapshot(appPath(key), path.join(root(key), 'versions', `v${version}`, 'composition'));
    await copyReferencedSharedComponents(appPath(key), path.join(root(key), 'versions', `v${version}`, 'composition'), platformComponentsRoot);
    await atomicWriteText(path.join(root(key), 'versions', `v${version}`, 'composition.source-checksum'), await compositionSourceFingerprint(appPath(key), platformComponentsRoot));
  }
  await atomicWriteJson(versionPath(key, version), draft);
  await atomicWriteText(path.join(root(key), 'versions', `v${version}`, 'application.css'), css);
  await syncDraftAssetsToActive(key);
  await copyPresentationAssetsToVersion(key, version);
  await atomicWriteText(activeCssPath(key), css);
  await ensurePresentationRuntimeImport(key);
  await writePresentationRuntime(key, draft);
  manifest.activeVersion = version;
  manifest.versions.push({ version, checksum: hash, publishedAt: now, actor: 'local-user' });
  manifest.draft = { exists: true, modifiedAt: now, checksum: hash };
  const baseline = await readRoleBundle(presentationLocation(key));
  if (baseline.checksum !== status.sourceRevision) throw Object.assign(new Error('Presentation changed while preparing Publish. The active pointer was not advanced.'), { status: 409 });
  await saveRoleBundle(presentationLocation(key), { expectedChecksum: baseline.checksum, files: { ...baseline.files, [MANIFEST_FILE]: JSON.stringify(manifest, null, 2) + '\n' }, validate() { validatePresentation(draft); }, admit });
  await appendHistory(appPath(key), { action: 'presentation.published', version, checksum: hash, actor: 'local-user' });
  return getApplicationPresentation(key);
}

/**
 * Application Presentation is opt-in.  Initializing it adds a single local
 * CSS import after UI Base imports, making the published CSS portable in app
 * builds and previews without coupling generated applications to this server.
 */
async function ensurePresentationRuntimeImport(key: string): Promise<void> {
  if (await compositionSettings(key)) return;
  const entry = path.join(appPath(key), 'src', 'main.ts');
  const marker = "import '../presentation/active.css';";
  const layoutImport = "import { composeApplicationPresentation } from '../presentation/runtime';";
  const runtimeMarker = 'ui-presentation-draft-css';
  const runtime = `const draftPresentationCss = new URLSearchParams(window.location.search).get('${runtimeMarker}');\nif (draftPresentationCss) {\n  const link = document.createElement('link');\n  link.rel = 'stylesheet';\n  link.href = draftPresentationCss;\n  document.head.append(link);\n}`;
  const source = await readFile(entry, 'utf8');
  const runtimeOccurrences = source.split(runtimeMarker).length - 1;
  if (source.includes(marker) && runtimeOccurrences === 1 && source.includes(layoutImport)) return;
  const withoutRuntime = source.replaceAll(runtime, '');
  const withCss = withoutRuntime.includes(marker) ? withoutRuntime : withoutRuntime.replace(/(import ['\"]@ui-app\/app-services['\"];?)/, `$1\n${marker}`);
  const cssReady = withCss.includes(marker) ? withCss : `${withoutRuntime}\n${marker}`;
  const withLayout = cssReady.includes(layoutImport) ? cssReady : cssReady.replace(marker, `${marker}\n${layoutImport}`);
  const rendered = withLayout.replace('root!.innerHTML = await page.render({ settings: config, route, navigate });', 'root!.innerHTML = composeApplicationPresentation({ content: await page.render({ settings: config, route, navigate }), route });');
  await writeFile(entry, `${rendered.trimEnd()}\n\n${runtime}\n`, 'utf8');
}

async function writePresentationRuntime(key: string, presentation: ApplicationPresentation): Promise<void> {
  if (await compositionSettings(key)) return;
  const app = await getApp(key);
  const routes = app.pages.map((route) => ({ route, label: route === '/' ? 'Home' : route.split('/').filter(Boolean).map((part) => part.replace(/-/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())).join(' ') }));
  const configuredNavigation = new Map(presentation.layout.navigation.map((item) => [item.route, item]));
  const config = { layout: presentation.layout, componentDefaults: presentation.componentDefaults, heroes: presentation.heroes, routes: routes.map((item, order) => ({ ...item, ...configuredNavigation.get(item.route), order: configuredNavigation.get(item.route)?.order ?? order })).filter((item) => item.visible !== false).sort((a, b) => a.order - b.order) };
  const serialized = JSON.stringify(config);
  const assetUrls = presentation.assets.filter((asset) => asset.active).map((asset) => `${JSON.stringify(asset.id)}: new URL(${JSON.stringify(`./assets/${asset.path}`)}, import.meta.url).href`).join(',\n  ');
  const module = `// Generated by UI Platform. Edit presentation through the platform.\nconst config = ${serialized} as const;\nconst assetUrls: Record<string, string> = {\n  ${assetUrls}\n};\n\nconst attribute = (value: unknown): string => JSON.stringify(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');\nconst attributeValue = (value: unknown): string => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');\nconst applyComponentDefaults = (content: string, tagName: string, defaults: Record<string, string | number | boolean>): string => Object.entries(defaults).reduce((output, [name, value]) => output.replace(new RegExp('<' + tagName + '\\\\b([^>]*)>', 'g'), (match, attrs) => new RegExp('\\\\s' + name + '(?:\\\\s|=|$)').test(attrs) ? match : '<' + tagName + attrs + ' ' + name + '=\"' + attributeValue(value) + '\">'), content);\n\nexport function presentationAssetUrl(id: string): string | undefined { return assetUrls[id]; }\n\nexport function composeApplicationPresentation(input: { content: string; route: string }): string {\n  const assignment = (config.layout.routes as Record<string, { shell?: string; template?: string; heroId?: string }>)[input.route] ?? {};\n  const shell = assignment.shell ?? config.layout.defaultShell;\n  const template = assignment.template ?? config.layout.defaultTemplate;\n  const shellSettings = (config.layout.shells as Record<string, { showNavigation: boolean; navigationPlacement: string; showFooter: boolean; footerText: string }>)[shell];\n  const nav = config.routes.map((item) => '<a data-route="' + item.route + '" href="' + item.route + '"' + (item.route === input.route ? ' aria-current="page"' : '') + '>' + item.label + '</a>').join('');\n  const selectedHero = assignment.heroId ? (config.heroes as Record<string, { enabled: boolean; variant: string; data: Record<string, unknown> }>)[assignment.heroId] : undefined;\n  const heroDefaults = ((config.componentDefaults as Record<string, Record<string, string | number | boolean>>)['uib-hero']) ?? {};\n  const heroData = selectedHero ? { ...heroDefaults, ...selectedHero.data, ...(selectedHero.variant === 'compact' ? { size: 'compact' } : {}), ...(selectedHero.variant === 'image-background' ? { visual_mode: 'background' } : {}) } : undefined;\n  const hero = selectedHero?.enabled && heroData ? '<uib-hero asset-map="' + attribute(assetUrls) + '" hero-data="' + attribute(heroData) + '"></uib-hero>' : '';\n  const headingContent = applyComponentDefaults(input.content, 'uib-heading', ((config.componentDefaults as Record<string, Record<string, string | number | boolean>>)['uib-heading']) ?? {});\n  // A hero's UI Base heading is the route h1; page content keeps its h1 only when no hero is rendered.\n  const pageContent = hero ? headingContent.replace(/<h1\\b[^>]*>[\\s\\S]*?<\\/h1>/i, '') : headingContent;\n  const content = hero + '<section class="ui-presentation-template template-' + template + '">' + pageContent + '</section>';\n  if (shell === 'minimal') return '<main class="ui-presentation-shell shell-minimal">' + content + '</main>';\n  const navigation = shellSettings.showNavigation ? '<nav class="navigation-' + shellSettings.navigationPlacement + '" aria-label="Primary">' + nav + '</nav>' : '';\n  const header = '<header class="ui-presentation-header"><a data-route="/" href="/" class="ui-presentation-brand">Application</a>' + navigation + '</header>';\n  const footer = shellSettings.showFooter ? '<footer class="ui-presentation-footer">' + shellSettings.footerText + '</footer>' : '';\n  return '<div class="ui-presentation-shell shell-' + shell + '">' + header + '<main class="ui-presentation-main">' + content + '</main>' + footer + '</div>';\n}\n`;
  const runtimeModule = module.replace(
    "  const headingContent = applyComponentDefaults(input.content, 'uib-heading', ((config.componentDefaults as Record<string, Record<string, string | number | boolean>>)['uib-heading']) ?? {});\n  // A hero's UI Base heading is the route h1; page content keeps its h1 only when no hero is rendered.\n  const pageContent = hero ? headingContent.replace(/<h1\\b[^>]*>[\\s\\S]*?<\\/h1>/i, '') : headingContent;\n",
    "  const componentDefaults = config.componentDefaults as Record<string, Record<string, string | number | boolean>>;\n  const componentContent = Object.entries(componentDefaults).reduce((content, [tagName, defaults]) => tagName === 'uib-hero' ? content : applyComponentDefaults(content, tagName, defaults), input.content);\n  // A hero's UI Base heading is the route h1; page content keeps its h1 only when no hero is rendered.\n  const pageContent = hero ? componentContent.replace(/<h1\\b[^>]*>[\\s\\S]*?<\\/h1>/i, '') : componentContent;\n",
  );
  await atomicWriteText(path.join(root(key), 'runtime.ts'), runtimeModule);
}
export async function rollbackPresentation(key: string, sourceVersion: number, admit: () => Promise<void> = async () => {}): Promise<ApplicationPresentationStatus> {
  return withApplicationMutation(appPath(key), async () => { await admit(); return rollbackPresentationSource(key, sourceVersion, admit); });
}
async function rollbackPresentationSource(key: string, sourceVersion: number, admit: () => Promise<void>): Promise<ApplicationPresentationStatus> {
  const status = await initializePresentationSource(key);
  if (!status.manifest!.versions.some((item) => item.version === sourceVersion)) throw new Error(`Presentation version v${sourceVersion} does not exist.`);
  const source = await readVersion(key, sourceVersion);
  if (!source) throw new Error(`Presentation version v${sourceVersion} could not be read.`);
  await cp(path.join(root(key), 'versions', `v${sourceVersion}`, 'assets'), draftAssetsRoot(key), { recursive: true, force: true }).catch(() => undefined);
  if (await compositionSettings(key)) {
    const snapshot = path.join(root(key), 'versions', `v${sourceVersion}`, 'composition');
    const historical = await readJson<any>(path.join(snapshot, 'app.settings.json'));
    const current = await readJson<any>(path.join(appPath(key), 'app.settings.json'));
    // Reuse the accepted explicit rollback-to-draft operation. Preserve Application
    // metadata and source files that did not exist in the historical presentation.
    const changes = await compositionSourceFiles(snapshot, true);
    changes.set('app.settings.json', Buffer.from(JSON.stringify({ ...current, presentation: historical.presentation }, null, 2) + '\n'));
    const visual = await prepareVisualSourcePlan(appPath(key), changes, await discoverComponents(key));
    const committed = await visual.commit(admit);
    try {
    for (const [relative, content] of changes) if (!visual.managedPaths.has(relative)) {
      const target = path.join(appPath(key), relative); await mkdir(path.dirname(target), { recursive: true });
      if (Buffer.from(content.toString('utf8')).equals(content)) await atomicWriteText(target, content.toString('utf8'));
      else await writeFile(target, content);
      committed.push(relative);
    }
    } catch (error) { if (committed.length) throw partialSourceOperation(error, committed); throw error; }
  }
  await savePresentationDraftSource(key, source, status.sourceRevision, admit);
  await appendHistory(appPath(key), { action: 'presentation.rollback.requested', sourceVersion, actor: 'local-user' });
  return getApplicationPresentation(key);
}
export async function getActivePresentationCss(key: string): Promise<string | null> {
  const manifest = await readManifest(key);
  if (!manifest?.activeVersion) return null;
  const file = path.join(root(key), 'versions', `v${manifest.activeVersion}`, 'application.css');
  try { await stat(file); return await readFile(file, 'utf8'); } catch { return null; }
}
export async function getDraftPresentationCss(key: string): Promise<string | null> {
  const draft = await readDraft(key);
  return draft ? renderPresentationCss(draft) : null;
}

export async function uploadPresentationAsset(key: string, input: { id: string; name: string; type: PresentationAsset['type']; alt?: string; filename: string; content: Buffer }): Promise<ApplicationPresentationStatus> {
  const status = await initializeApplicationPresentation(key);
  const id = input.id.trim().toLowerCase();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) throw new Error('Asset ID must contain lowercase letters, numbers, and hyphens only.');
  if (!['logo', 'image', 'icon', 'illustration', 'background', 'favicon', 'other'].includes(input.type)) throw new Error('Asset type is not supported.');
  const filename = path.basename(input.filename);
  if (!filename || filename === '.' || filename === '..') throw new Error('Asset filename is required.');
  const relativePath = `${id}/${filename}`;
  const existing = status.draft!.assets.filter((asset) => asset.id !== id);
  await mkdir(path.join(draftAssetsRoot(key), id), { recursive: true });
  await writeFile(path.join(draftAssetsRoot(key), id, filename), input.content);
  return savePresentationDraft(key, { ...status.draft!, assets: [...existing, { id, name: input.name.trim() || id, type: input.type, path: relativePath, alt: input.alt, active: true }] });
}

export async function removePresentationAsset(key: string, id: string): Promise<ApplicationPresentationStatus> {
  const status = await initializeApplicationPresentation(key);
  const asset = status.draft!.assets.find((item) => item.id === id);
  if (!asset) throw new Error(`Asset ${id} does not exist.`);
  const references = presentationAssetReferences(status.draft!, id, 'draft');
  const active = status.manifest!.activeVersion === null ? null : await readVersion(key, status.manifest!.activeVersion);
  if (active) references.push(...presentationAssetReferences(active, id, `active v${status.manifest!.activeVersion}`));
  if (references.length) throw new Error(`Asset ${id} is still in use by ${references.join(', ')}.`);
  await rm(path.join(draftAssetsRoot(key), id), { recursive: true, force: true });
  return savePresentationDraft(key, { ...status.draft!, assets: status.draft!.assets.filter((item) => item.id !== id) });
}

export async function getPresentationAssetPath(key: string, id: string): Promise<string> {
  const draft = await readDraft(key);
  const asset = draft?.assets.find((item) => item.id === id && item.active);
  if (!asset) throw new Error(`Asset ${id} does not exist.`);
  const draftFile = resolveAssetFile(draftAssetsRoot(key), asset.path);
  try { await stat(draftFile); return draftFile; } catch { return resolveAssetFile(activeAssetsRoot(key), asset.path); }
}
export async function copyPresentationAssetsToVersion(key: string, version: number): Promise<void> {
  const source = activeAssetsRoot(key);
  const destination = path.join(root(key), 'versions', `v${version}`, 'assets');
  await cp(source, destination, { recursive: true, force: true }).catch(() => undefined);
}

async function syncDraftAssetsToActive(key: string): Promise<void> {
  await mkdir(activeAssetsRoot(key), { recursive: true });
  await cp(draftAssetsRoot(key), activeAssetsRoot(key), { recursive: true, force: true }).catch(() => undefined);
}

function resolveAssetFile(assetsRoot: string, assetPath: string): string {
  const file = path.resolve(assetsRoot, assetPath);
  const resolvedRoot = path.resolve(assetsRoot);
  if (!file.startsWith(resolvedRoot + path.sep)) throw new Error('Asset path escapes application presentation storage.');
  return file;
}

function presentationAssetReferences(presentation: ApplicationPresentation, id: string, scope: string): string[] {
  const references: string[] = [];
  for (const [shell, settings] of Object.entries(presentation.layout.shells)) {
    if (settings.logoAssetId === id) references.push(`${scope} ${shell} shell logo`);
  }
  for (const [heroId, hero] of Object.entries(presentation.heroes)) {
    if (heroReferencesAsset(hero.data, id)) references.push(`${scope} hero ${heroId}`);
  }
  return references;
}

function heroReferencesAsset(value: unknown, id: string, key = ''): boolean {
  if (typeof value === 'string') {
    if (value === id && key.toLowerCase().includes('asset')) return true;
    try { return heroReferencesAsset(JSON.parse(value), id, key); } catch { return false; }
  }
  if (Array.isArray(value)) return value.some((item) => heroReferencesAsset(item, id, key));
  if (value && typeof value === 'object') return Object.entries(value).some(([name, item]) => heroReferencesAsset(item, id, name));
  return false;
}
