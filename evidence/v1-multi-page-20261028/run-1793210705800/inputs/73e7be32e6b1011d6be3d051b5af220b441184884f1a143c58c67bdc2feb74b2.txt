import { escapeAttribute, parseSource } from './source.js';
import type { Action, ArtifactMetadata, RuntimeArtifact } from './model.js';

export const recommendedRegionIds = ['region-header', 'region-navigation', 'region-hero', 'region-main', 'region-sidebar', 'region-secondary', 'region-footer'] as const;
export interface CompositionSettings {
  model: 'composition-v1'; defaultShellId: string;
  theme: Record<string, string>; siteStyles: string[];
  defaultMenus?: Record<string, string>;
  branding: { applicationName: string; shortName?: string; primaryLogo?: string; secondaryLogo?: string; favicon?: string };
  assetsRoot: string;
  shellConfiguration?: Record<string, Record<string, unknown>>;
}
export interface CompositionRoute { routeId: string; pageId: string; path: string }
export type MenuDestination = { kind: 'page'; pageId: string; params?: Record<string, string> } | { kind: 'route'; routeId: string; params?: Record<string, string> } | { kind: 'url'; url: string } | { kind: 'action'; actions: Action[] };
export interface MenuItem { itemId: string; label: string; destination: MenuDestination; target?: '_self' | '_blank' | '_parent' | '_top'; hidden?: boolean; disabled?: boolean; children?: MenuItem[] }
export interface ApplicationMenu { schemaVersion: 1; menuId: string; name: string; items: MenuItem[]; sourcePath?: string }
export type MenuOverrides = Record<string, { items?: Record<string, { hidden?: boolean; disabled?: boolean }>; additions?: Array<{ parentItemId?: string; item: MenuItem }> }>;
export interface CompositionDefinition { settings: CompositionSettings; shells: RuntimeArtifact[]; pages: RuntimeArtifact[]; routes: CompositionRoute[]; menus: ApplicationMenu[]; siteCss: string }

/** Explicit source containers distinguish absent content from intentionally empty content. */
export function regions(source: string): Array<{ regionId: string; displayName: string; nodeId?: string; content: string; start: number; openEnd: number; closeStart: number; end: number }> {
  const parsed = parseSource(source);
  if (parsed.diagnostics.some(d => d.severity === 'error')) throw new Error('Repair region source structure first: ' + parsed.diagnostics.filter(d => d.severity === 'error').map(d => d.message).join(' '));
  const ids = new Set<string>();
  return parsed.nodes.filter(node => Object.hasOwn(node.attributes, 'data-uip-region')).map(node => {
    const regionId = node.attributes['data-uip-region'];
    if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(regionId) || ids.has(regionId)) throw new Error(`Invalid or duplicate Region ID: ${regionId}.`);
    ids.add(regionId);
    return { regionId, displayName: node.attributes['data-uip-region-name'] ?? regionId, nodeId: node.id, content: source.slice(node.openEnd, node.closeStart), start: node.start, openEnd: node.openEnd, closeStart: node.closeStart, end: node.end };
  });
}
export function remapPageRegions(source: string, shellSource: string, decisions: Record<string, string | null>): string {
  const current = regions(source), allowed = new Set(regions(shellSource).map(r => r.regionId));
  const destinations = new Set<string>();
  let result = source;
  const operations = current.map(region => {
    const destination = allowed.has(region.regionId) ? region.regionId : decisions[region.regionId];
    if (destination === undefined) throw new Error(`Map or explicitly discard ${region.regionId}.`);
    if (destination !== null && (!allowed.has(destination) || destinations.has(destination))) throw new Error('Region mapping must use unique target Regions.');
    if (destination !== null) destinations.add(destination);
    return { region, destination };
  });
  for (const { region, destination } of operations.sort((a, b) => b.region.start - a.region.start)) {
    const replacement = destination === null ? '' : source.slice(region.start, region.end).replace(/data-uip-region\s*=\s*(?:"[^"]*"|'[^']*')/, `data-uip-region="${escapeAttribute(destination)}"`);
    result = result.slice(0, region.start) + replacement + result.slice(region.end);
  }
  return result;
}
export function themeCss(settings: CompositionSettings): string {
  return ':host,:root{' + Object.entries(settings.theme).map(([name, value]) => {
    if (!/^--app-[a-z0-9-]+$/.test(name) || /[;{}<>]/.test(value)) throw new Error('Invalid theme variable.');
    return `${name}:${value}`;
  }).join(';') + '}';
}
export function applyMenuOverrides(menu: ApplicationMenu, overrides?: MenuOverrides): ApplicationMenu {
  const result = structuredClone(menu), override = overrides?.[menu.menuId];
  const all = new Map<string, MenuItem>();
  const walk = (items: MenuItem[]) => { for (const item of items) { if (all.has(item.itemId)) throw new Error('Duplicate Menu Item identity.'); all.set(item.itemId, item); walk(item.children ?? []); } };
  walk(result.items);
  for (const [id, change] of Object.entries(override?.items ?? {})) {
    const item = all.get(id); if (!item) throw new Error(`Menu override target is missing: ${id}.`);
    if (Object.keys(change).some(key => !['hidden', 'disabled'].includes(key))) throw new Error('Page overrides may only hide/show or disable/enable items.');
    Object.assign(item, change);
  }
  for (const { parentItemId, item } of override?.additions ?? []) {
    const parent = parentItemId ? all.get(parentItemId) : undefined;
    if (parentItemId && !parent) throw new Error('Page-local item parent is missing.');
    walk([item]); (parent ? (parent.children ??= []) : result.items).push(structuredClone(item));
  }
  return result;
}
export function validateMenu(menu: ApplicationMenu): void {
  if (menu.schemaVersion !== 1 || !menu.menuId || !menu.name || !Array.isArray(menu.items)) throw new Error('Invalid Application Menu.');
  const ids = new Set<string>();
  const walk = (items: MenuItem[]) => { for (const item of items) {
    if (!/^[a-z][\w-]*$/.test(item.itemId) || ids.has(item.itemId) || !item.label) throw new Error('Menu Items require unique stable IDs and labels.'); ids.add(item.itemId);
    if (item.target && !['_self', '_blank', '_parent', '_top'].includes(item.target)) throw new Error('Unsupported browser target.');
    const destination = item.destination;
    if (!destination || !['page', 'route', 'url', 'action'].includes(destination.kind)) throw new Error('Invalid Menu destination.');
    if (destination.kind === 'url' && !/^https?:\/\//i.test(destination.url)) throw new Error('External URLs must use HTTP or HTTPS.');
    if (destination.kind === 'url') new URL(destination.url);
    if (destination.kind === 'page' && !destination.pageId || destination.kind === 'route' && !destination.routeId || destination.kind === 'action' && !Array.isArray(destination.actions)) throw new Error('Menu destination identity/actions required.');
    walk(item.children ?? []);
  } }; walk(menu.items);
}
export function routePath(route: CompositionRoute, params: Record<string, string> = {}): string {
  return route.path.replace(/:([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\]/g, (_, colon, bracket) => {
    const value = params[colon ?? bracket]; if (value === undefined) throw new Error(`Route parameter is required: ${colon ?? bracket}.`); return encodeURIComponent(value);
  });
}
export function matchCompositionRoute(routes: CompositionRoute[], pathname: string): { route: CompositionRoute; params: Record<string, string> } | undefined {
  for (const route of [...routes].sort((a, b) => Number(/:|\[/.test(a.path)) - Number(/:|\[/.test(b.path)))) {
    const keys: string[] = [];
    const pattern = route.path.split('/').map(part => {
      const parameter = /^(?::([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\])$/.exec(part);
      if (parameter) { keys.push(parameter[1] ?? parameter[2]); return '([^/]+)'; }
      return part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('/');
    const match = new RegExp(`^${pattern}/?$`).exec(pathname);
    if (match) return { route, params: Object.fromEntries(keys.map((key, i) => [key, decodeURIComponent(match[i + 1])])) };
  }
  return undefined;
}
export function renderMenu(menu: ApplicationMenu, routes: CompositionRoute[], currentPageId: string, currentRouteId: string, params: Record<string, string> = {}, placementId = ''): { source: string; events: NonNullable<ArtifactMetadata['events']> } {
  validateMenu(menu);
  const events: NonNullable<ArtifactMetadata['events']> = [];
  const render = (item: MenuItem): { html: string; active: boolean } => {
    if (item.hidden) return { html: '', active: false };
    const children = (item.children ?? []).map(render), destination = item.destination;
    const current = destination.kind === 'page' ? destination.pageId === currentPageId : destination.kind === 'route' ? destination.routeId === currentRouteId && Object.entries(destination.params ?? {}).every(([key, value]) => params[key] === value) : false;
    const activePath = children.some(child => child.active);
    const node = `menu_${placementId.replace(/\W/g, '_')}_${menu.menuId.replace(/\W/g, '_')}_${item.itemId}`;
    let control: string;
    if (destination.kind === 'action') {
      if (!item.disabled) events.push({ node, event: 'click', actions: destination.actions });
      control = `<button type="button" data-uip-node="${node}"${item.disabled ? ' disabled' : ''}>${escapeAttribute(item.label)}</button>`;
    } else {
      const route = destination.kind === 'page' ? routes.find(r => r.pageId === destination.pageId) : destination.kind === 'route' ? routes.find(r => r.routeId === destination.routeId) : undefined;
      const url = destination.kind === 'url' ? destination.url : route ? routePath(route, { ...params, ...destination.params }) : undefined;
      if (!url) throw new Error(`Menu target not found: ${item.label}.`);
      control = `<a${item.disabled ? ' aria-disabled="true" tabindex="-1"' : ` href="${escapeAttribute(url)}"`} target="${item.target ?? '_self'}" rel="noopener noreferrer"${current ? ' aria-current="page"' : ''}>${escapeAttribute(item.label)}</a>`;
    }
    return { html: `<li class="${current ? 'current ' : ''}${activePath ? 'active-path' : ''}" data-current="${current}" data-active-path="${activePath}">${control}${children.some(child => child.html) ? `<ul>${children.map(child => child.html).join('')}</ul>` : ''}</li>`, active: current || activePath };
  };
  return { source: `<ul>${menu.items.map(item => render(item).html).join('')}</ul>`, events };
}
export function composeShellMenus(shell: RuntimeArtifact, definition: CompositionDefinition, page: RuntimeArtifact, routeId: string, params: Record<string, string> = {}): RuntimeArtifact {
  let source = shell.source;
  const metadata = structuredClone(shell.metadata);
  const placeholders = parseSource(source).nodes.filter(node => Object.hasOwn(node.attributes, 'data-uip-menu'));
  const compiled = placeholders.map((node, index) => {
    const reference = node.attributes['data-uip-menu'], menuId = definition.settings.defaultMenus?.[reference] ?? reference;
    const menu = definition.menus.find(menu => menu.menuId === menuId); if (!menu) throw new Error(`Application Menu is missing: ${menuId}.`);
    const rendered = renderMenu(applyMenuOverrides(menu, page.metadata.menuOverrides), definition.routes, page.metadata.artifactId, routeId, params, node.id ?? `placement_${index}`);
    metadata.events = [...(metadata.events ?? []), ...rendered.events];
    return { node, rendered };
  });
  for (const { node, rendered } of compiled.reverse()) {
    source = source.slice(0, node.openEnd) + rendered.source + source.slice(node.closeStart);
  }
  return { ...shell, metadata, source };
}
