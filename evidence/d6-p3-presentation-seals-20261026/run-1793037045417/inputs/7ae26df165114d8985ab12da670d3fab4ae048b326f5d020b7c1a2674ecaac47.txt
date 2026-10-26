import path from 'node:path';
import type { ApplicationPresentation, PresentationAsset, PresentationHero } from '../shared/presentation.js';
import { APPLICATION_PRESENTATION_VERSION } from '../shared/presentation.js';

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

export function renderPresentationCss(presentation: ApplicationPresentation): string {
  const tokens = { ...presentation.tokens, ...presentation.typography };
  const declarations = Object.entries(tokens).map(([name, value]) => `  ${name}: ${value};`).join('\n');
  return `/* Generated from the active Application Presentation version. */\n:root {\n${declarations}\n}\n\n.ui-presentation-shell { min-height:100vh; color:var(--app-color-text,#172033); background:var(--app-color-surface,#fff); font-family:var(--app-font-body,system-ui,sans-serif); }\n.ui-presentation-header { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:1rem max(1.25rem,calc((100vw - var(--app-content-max-width,75rem))/2)); border-bottom:1px solid color-mix(in srgb,var(--app-color-text,#172033) 12%,transparent); background:var(--app-color-surface,#fff); }\n.ui-presentation-brand { color:var(--app-color-primary,#1f4f8f); font-weight:800; text-decoration:none; }\n.ui-presentation-header nav { display:flex; flex-wrap:wrap; gap:1rem; }\n.ui-presentation-header nav a { color:inherit; text-decoration:none; }\n.ui-presentation-header nav a[aria-current=page] { color:var(--app-color-primary,#1f4f8f); font-weight:800; }\n.ui-presentation-main { width:min(var(--app-content-max-width,75rem),calc(100% - 2rem)); margin:0 auto; padding:var(--app-spacing-lg,1.5rem) 0; }\n.ui-presentation-footer { padding:1rem max(1.25rem,calc((100vw - var(--app-content-max-width,75rem))/2)); color:color-mix(in srgb,var(--app-color-text,#172033) 65%,transparent); border-top:1px solid color-mix(in srgb,var(--app-color-text,#172033) 12%,transparent); }\n.template-two-column { display:grid; grid-template-columns:minmax(0,1fr) minmax(14rem,.32fr); gap:var(--app-spacing-lg,1.5rem); }\n.template-dashboard { display:grid; gap:var(--app-spacing-lg,1.5rem); }\n.template-form { max-width:48rem; margin-inline:auto; }\n.template-detail-record { max-width:64rem; }\n@media (max-width: 640px) { .ui-presentation-header { align-items:flex-start; flex-direction:column; } .template-two-column { grid-template-columns:1fr; } }\n\n${presentation.css.trim()}\n`;
}
