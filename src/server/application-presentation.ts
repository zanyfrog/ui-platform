import crypto from 'node:crypto';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { ApplicationPresentation, ApplicationPresentationManifest, ApplicationPresentationStatus, PresentationAsset, PresentationHero } from '../shared/presentation.js';
import { APPLICATION_PRESENTATION_VERSION } from '../shared/presentation.js';
import { appPath, getApp } from './applications.js';
import { atomicWriteJson, atomicWriteText, readJson } from './json-files.js';
import { appendHistory } from './history.js';
import { discoverComponents } from './component-registry.js';

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

export function defaultPresentation(): ApplicationPresentation {
  return {
    schemaVersion: APPLICATION_PRESENTATION_VERSION,
    name: 'Default',
    tokens: {
      '--app-color-primary': '#1f4f8f', '--app-color-surface': '#ffffff', '--app-color-text': '#172033',
      '--app-spacing-sm': '0.5rem', '--app-spacing-md': '1rem', '--app-spacing-lg': '1.5rem',
      '--app-radius-card': '0.5rem', '--app-content-max-width': '75rem', '--app-font-body': 'system-ui, sans-serif',
    },
    typography: {}, componentDefaults: {}, layout: { defaultShell: 'authenticated', defaultTemplate: 'standard', routes: {}, shells: defaultShells(), navigation: [] }, heroes: {}, css: '', assets: [],
  };
}

function normalizeStringMap(value: unknown, name: string): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${name} must be an object.`);
  const result: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (!key.startsWith('--')) throw new Error(`${name} keys must be CSS custom properties beginning with --.`);
    if (typeof item !== 'string') throw new Error(`${name}.${key} must be a string.`);
    result[key] = item;
  }
  return result;
}

function normalizeAssets(value: unknown): PresentationAsset[] {
  if (!Array.isArray(value)) throw new Error('assets must be an array.');
  const ids = new Set<string>();
  return value.map((item) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) throw new Error('Each asset must be an object.');
    const asset = item as Partial<PresentationAsset>;
    if (!asset.id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.id) || ids.has(asset.id)) throw new Error('Each asset requires a unique lowercase ID.');
    ids.add(asset.id);
    if (!asset.name || !asset.path || typeof asset.active !== 'boolean') throw new Error(`Asset ${asset.id} requires name, path, and active.`);
    if (!['logo', 'image', 'icon', 'illustration', 'background', 'favicon', 'other'].includes(String(asset.type))) throw new Error(`Asset ${asset.id} has an unsupported type.`);
    if (path.isAbsolute(asset.path) || asset.path.split(/[\\/]/).includes('..')) throw new Error(`Asset ${asset.id} path must remain within presentation/assets.`);
    return { id: asset.id, name: asset.name, type: asset.type as PresentationAsset['type'], path: asset.path.replaceAll('\\', '/'), alt: typeof asset.alt === 'string' ? asset.alt : undefined, active: asset.active };
  });
}

export function validatePresentation(value: unknown): ApplicationPresentation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Presentation must be an object.');
  const input = value as Partial<ApplicationPresentation>;
  if (typeof input.name !== 'string' || !input.name.trim()) throw new Error('Presentation name is required.');
  if (typeof input.css !== 'string') throw new Error('css must be a string.');
  if (!input.componentDefaults || typeof input.componentDefaults !== 'object' || Array.isArray(input.componentDefaults)) throw new Error('componentDefaults must be an object.');
  // Component metadata enforcement will be enabled when UI Base publishes its contract.
  const layout = normalizeLayout(input.layout);
  const heroes = normalizeHeroes(input.heroes);
  for (const [route, assignment] of Object.entries(layout.routes)) {
    if (assignment.heroId && !heroes[assignment.heroId]) throw new Error(`Route ${route} references an unknown hero.`);
  }
  return { schemaVersion: APPLICATION_PRESENTATION_VERSION, name: input.name.trim(), tokens: normalizeStringMap(input.tokens ?? {}, 'tokens'), typography: normalizeStringMap(input.typography ?? {}, 'typography'), componentDefaults: input.componentDefaults as ApplicationPresentation['componentDefaults'], layout, heroes, css: input.css, assets: normalizeAssets(input.assets ?? []) };
}

function normalizeHeroes(value: unknown): ApplicationPresentation['heroes'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).flatMap(([id, raw]) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !raw || typeof raw !== 'object' || Array.isArray(raw)) return [];
    const hero = raw as Partial<ApplicationPresentation['heroes'][string]>;
    if (!['standard', 'compact', 'image-background'].includes(String(hero.variant)) || !hero.data || typeof hero.data !== 'object' || Array.isArray(hero.data)) return [];
    return [[id, { id, enabled: hero.enabled !== false, variant: hero.variant as PresentationHero['variant'], data: normalizeHeroData(hero.data as Record<string, unknown>) }]];
  }));
}

/** Presentation heroes are visual content only: retain at most two navigational CTAs. */
function normalizeHeroData(value: Record<string, unknown>): Record<string, unknown> {
  const data = { ...value };
  const actionKeys = ['action-components', 'action_components', 'hero_action_buttons', 'actions'];
  const source = actionKeys.map((key) => data[key]).find((item) => item !== undefined && item !== '');
  if (source === undefined) return data;

  let actions: unknown[] = [];
  try {
    const parsed = typeof source === 'string' ? JSON.parse(source) : source;
    actions = Array.isArray(parsed) ? parsed : parsed && typeof parsed === 'object' ? [parsed] : [];
  } catch { actions = []; }
  const links = actions
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item))
    .filter((item) => String(item.type ?? item.kind ?? 'link').toLowerCase() !== 'action')
    .slice(0, 2)
    .map((item) => ({ ...item, type: 'link' }));
  const serialized = JSON.stringify(links);
  for (const key of actionKeys) data[key] = serialized;
  return data;
}

function normalizeLayout(value: unknown): ApplicationPresentation['layout'] {
  const input = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<ApplicationPresentation['layout']> : {};
  const shellNames = ['public', 'authenticated', 'minimal']; const templates = ['standard', 'two-column', 'dashboard', 'form', 'detail-record'];
  const defaultShell = shellNames.includes(String(input.defaultShell)) ? input.defaultShell as ApplicationPresentation['layout']['defaultShell'] : 'authenticated';
  const defaultTemplate = templates.includes(String(input.defaultTemplate)) ? input.defaultTemplate as ApplicationPresentation['layout']['defaultTemplate'] : 'standard';
  const routes = Object.fromEntries(Object.entries(input.routes ?? {}).flatMap(([route, assignment]) => {
    if (!route.startsWith('/') || !assignment || typeof assignment !== 'object') return [];
    const item = assignment as { shell?: unknown; template?: unknown; heroId?: unknown };
    return [[route, { ...(shellNames.includes(String(item.shell)) ? { shell: item.shell as ApplicationPresentation['layout']['defaultShell'] } : {}), ...(templates.includes(String(item.template)) ? { template: item.template as ApplicationPresentation['layout']['defaultTemplate'] } : {}), ...(typeof item.heroId === 'string' ? { heroId: item.heroId } : {}) }]];
  }));
  const shellInput = input.shells && typeof input.shells === 'object' ? input.shells as Record<string, Partial<ApplicationPresentation['layout']['shells']['public']>> : {};
  const shells = Object.fromEntries(shellNames.map((name) => [name, normalizeShell(shellInput[name])])) as ApplicationPresentation['layout']['shells'];
  const navigation = Array.isArray(input.navigation) ? input.navigation.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const entry = item as { route?: unknown; label?: unknown; icon?: unknown; visible?: unknown; order?: unknown };
    if (typeof entry.route !== 'string' || !entry.route.startsWith('/')) return [];
    return [{ route: entry.route, ...(typeof entry.label === 'string' ? { label: entry.label } : {}), ...(typeof entry.icon === 'string' ? { icon: entry.icon } : {}), ...(typeof entry.visible === 'boolean' ? { visible: entry.visible } : {}), ...(Number.isFinite(entry.order) ? { order: Number(entry.order) } : {}) }];
  }) : [];
  return { defaultShell, defaultTemplate, routes, shells, navigation };
}

function defaultShells(): ApplicationPresentation['layout']['shells'] {
  const base = { showNavigation: true, navigationPlacement: 'top' as const, showFooter: true, footerText: '© Application' };
  return { public: { ...base }, authenticated: { ...base }, minimal: { showNavigation: false, navigationPlacement: 'top', showFooter: false, footerText: '' } };
}
function normalizeShell(value: Partial<ApplicationPresentation['layout']['shells']['public']> | undefined): ApplicationPresentation['layout']['shells']['public'] {
  const fallback = defaultShells().public;
  return { logoAssetId: typeof value?.logoAssetId === 'string' ? value.logoAssetId : undefined, showNavigation: typeof value?.showNavigation === 'boolean' ? value.showNavigation : fallback.showNavigation, navigationPlacement: value?.navigationPlacement === 'side' ? 'side' : 'top', showFooter: typeof value?.showFooter === 'boolean' ? value.showFooter : fallback.showFooter, footerText: typeof value?.footerText === 'string' ? value.footerText : fallback.footerText };
}

async function readManifest(key: string): Promise<ApplicationPresentationManifest | null> {
  try { return await readJson<ApplicationPresentationManifest>(manifestPath(key)); } catch { return null; }
}
async function readDraft(key: string): Promise<ApplicationPresentation | null> {
  try { return validatePresentation(await readJson<unknown>(draftPath(key))); } catch { return null; }
}
export async function getApplicationPresentation(key: string): Promise<ApplicationPresentationStatus> {
  const manifest = await readManifest(key);
  const draft = await readDraft(key);
  if (!manifest || !draft) return { initialized: false, manifest: null, draft: null, draftDiffersFromActive: false };
  const active = manifest.activeVersion === null ? null : await readVersion(key, manifest.activeVersion);
  return { initialized: true, manifest, draft, draftDiffersFromActive: !active || checksum(draft) !== checksum(active) };
}
async function readVersion(key: string, version: number): Promise<ApplicationPresentation | null> {
  try { return validatePresentation(await readJson<unknown>(versionPath(key, version))); } catch { return null; }
}
export async function initializeApplicationPresentation(key: string): Promise<ApplicationPresentationStatus> {
  const app = await getApp(key);
  const existing = await getApplicationPresentation(key);
  if (existing.initialized) {
    await ensurePresentationRuntimeImport(key);
    return existing;
  }
  const draft = defaultPresentation();
  const now = new Date().toISOString();
  const manifest: ApplicationPresentationManifest = { type: 'ui-platform.presentation', schemaVersion: APPLICATION_PRESENTATION_VERSION, applicationId: app.appId, activeVersion: null, draft: { exists: true, modifiedAt: now, checksum: checksum(draft) }, versions: [] };
  await atomicWriteJson(draftPath(key), draft);
  await mkdir(activeAssetsRoot(key), { recursive: true });
  await mkdir(draftAssetsRoot(key), { recursive: true });
  await atomicWriteText(activeCssPath(key), '/* Application Presentation has not been published yet. */\n');
  await writePresentationRuntime(key, draft);
  await ensurePresentationRuntimeImport(key);
  await atomicWriteJson(manifestPath(key), manifest);
  await appendHistory(appPath(key), { action: 'presentation.initialized', appId: app.appId, actor: 'local-user' });
  return getApplicationPresentation(key);
}
export async function savePresentationDraft(key: string, value: unknown): Promise<ApplicationPresentationStatus> {
  const presentation = validatePresentation(value);
  await validateComponentDefaults(key, presentation.componentDefaults);
  const status = await initializeApplicationPresentation(key);
  const manifest = status.manifest!;
  const now = new Date().toISOString();
  manifest.draft = { exists: true, modifiedAt: now, checksum: checksum(presentation) };
  await atomicWriteJson(draftPath(key), presentation);
  await atomicWriteJson(manifestPath(key), manifest);
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
export async function publishPresentation(key: string): Promise<ApplicationPresentationStatus> {
  const status = await initializeApplicationPresentation(key);
  const draft = status.draft!;
  const manifest = status.manifest!;
  const version = Math.max(0, ...manifest.versions.map((item) => item.version)) + 1;
  const now = new Date().toISOString();
  const hash = checksum(draft);
  const css = renderPresentationCss(draft);
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
  await atomicWriteJson(manifestPath(key), manifest);
  await appendHistory(appPath(key), { action: 'presentation.published', version, checksum: hash, actor: 'local-user' });
  return getApplicationPresentation(key);
}

/**
 * Application Presentation is opt-in.  Initializing it adds a single local
 * CSS import after UI Base imports, making the published CSS portable in app
 * builds and previews without coupling generated applications to this server.
 */
async function ensurePresentationRuntimeImport(key: string): Promise<void> {
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
export async function rollbackPresentation(key: string, sourceVersion: number): Promise<ApplicationPresentationStatus> {
  const status = await initializeApplicationPresentation(key);
  if (!status.manifest!.versions.some((item) => item.version === sourceVersion)) throw new Error(`Presentation version v${sourceVersion} does not exist.`);
  const source = await readVersion(key, sourceVersion);
  if (!source) throw new Error(`Presentation version v${sourceVersion} could not be read.`);
  await cp(path.join(root(key), 'versions', `v${sourceVersion}`, 'assets'), draftAssetsRoot(key), { recursive: true, force: true }).catch(() => undefined);
  await savePresentationDraft(key, source);
  await appendHistory(appPath(key), { action: 'presentation.rollback.requested', sourceVersion, actor: 'local-user' });
  return getApplicationPresentation(key);
}
export function renderPresentationCss(presentation: ApplicationPresentation): string {
  const tokens = { ...presentation.tokens, ...presentation.typography };
  const declarations = Object.entries(tokens).map(([name, value]) => `  ${name}: ${value};`).join('\n');
  return `/* Generated from the active Application Presentation version. */\n:root {\n${declarations}\n}\n\n.ui-presentation-shell { min-height:100vh; color:var(--app-color-text,#172033); background:var(--app-color-surface,#fff); font-family:var(--app-font-body,system-ui,sans-serif); }\n.ui-presentation-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem max(1.25rem,calc((100vw - var(--app-content-max-width,75rem))/2)); border-bottom:1px solid color-mix(in srgb,var(--app-color-text,#172033) 12%,transparent); background:var(--app-color-surface,#fff); }\n.ui-presentation-brand { color:var(--app-color-primary,#1f4f8f); font-weight:800; text-decoration:none; }\n.ui-presentation-header nav { display:flex; flex-wrap:wrap; gap:1rem; }\n.ui-presentation-header nav a { color:inherit; text-decoration:none; }\n.ui-presentation-header nav a[aria-current=page] { color:var(--app-color-primary,#1f4f8f); font-weight:800; }\n.ui-presentation-main { width:min(var(--app-content-max-width,75rem),calc(100% - 2rem)); margin:0 auto; padding:var(--app-spacing-lg,1.5rem) 0; }\n.ui-presentation-footer { padding:1rem max(1.25rem,calc((100vw - var(--app-content-max-width,75rem))/2)); color:color-mix(in srgb,var(--app-color-text,#172033) 65%,transparent); border-top:1px solid color-mix(in srgb,var(--app-color-text,#172033) 12%,transparent); }\n.template-two-column { display:grid; grid-template-columns:minmax(0,1fr) minmax(14rem,.32fr); gap:var(--app-spacing-lg,1.5rem); }\n.template-dashboard { display:grid; gap:var(--app-spacing-lg,1.5rem); }\n.template-form { max-width:48rem; margin-inline:auto; }\n.template-detail-record { max-width:64rem; }\n@media (max-width: 640px) { .ui-presentation-header { align-items:flex-start; flex-direction:column; } .template-two-column { grid-template-columns:1fr; } }\n\n${presentation.css.trim()}\n`;
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
