import { validateArtifact, componentReferences } from './validation.js';
import { parseSource } from './source.js';
import { regions, themeCss, validateMenu, applyMenuOverrides, composeShellMenus, type CompositionDefinition } from './composition.js';
import { valueErrors, type RuntimeArtifact, type PackageComponent } from './model.js';

/** Shared complete-graph rules for source candidates and pinned runtime graphs. */
export function validateCompositionDefinition(definition: CompositionDefinition, components: RuntimeArtifact[], packages: PackageComponent[] = []): void {
  const { settings, pages, shells, menus, routes } = definition;
  const required = new Set([...pages, ...shells].flatMap(artifact => [...componentReferences(artifact.source), ...(artifact.metadata.dependencies ?? [])]));
  const selected = new Map<string, RuntimeArtifact>();
  for (const id of required) {
    const component = components.find(component => component.metadata.componentId === id);
    if (component && !selected.has(id)) { selected.set(id, component); for (const nested of [...componentReferences(component.source), ...(component.metadata.dependencies ?? [])]) required.add(nested); }
  }
  components = [...selected.values()];
  if (settings.assetsRoot !== 'assets' || !settings.branding?.applicationName || !Array.isArray(settings.siteStyles)) throw new Error('Composition requires branding, source styles and the Application assets root.');
  const identities = new Set<string>();
  for (const artifact of [...pages, ...shells, ...components]) {
    if (identities.has(artifact.metadata.artifactId)) throw new Error('Duplicate Visual Artifact identity.'); identities.add(artifact.metadata.artifactId);
    const errors = validateArtifact(artifact, components, packages).filter(d => d.severity === 'error');
    if (errors.length) throw new Error(`${artifact.metadata.displayName}: ${errors.map(error => error.message).join(' ')}`);
  }
  if (!shells.some(shell => shell.metadata.artifactId === settings.defaultShellId)) throw new Error('Application default Shell is missing.');
  const routeIds = new Set<string>(), paths = new Set<string>();
  for (const page of pages) {
    const m = page.metadata;
    if (!m.routeId || !m.shellId || !shells.some(shell => shell.metadata.artifactId === m.shellId)) throw new Error(`Page requires permanent Route and Shell identities: ${m.name}.`);
    if (!m.route?.startsWith('/') || /[\s?#\\]/.test(m.route) || m.route.includes('//') || m.route.split('/').some(part => part === '.' || part === '..')) throw new Error('Primary Route path is invalid.');
    const signature = m.route.replace(/:[A-Za-z][\w]*|\[[A-Za-z][\w]*\]/g, ':parameter').replace(/\/$/, '') || '/';
    if (routeIds.has(m.routeId) || paths.has(signature)) throw new Error('Each Page requires a unique primary Route.'); routeIds.add(m.routeId); paths.add(signature);
    if (!routes.some(route => route.routeId === m.routeId && route.pageId === m.artifactId && route.path === m.route)) throw new Error('Runtime Route does not match its captured Page.');
    for (const node of parseSource(page.source).nodes) {
      let parent: typeof node | undefined = node;
      while (parent && !Object.hasOwn(parent.attributes, 'data-uip-region')) parent = parent.parent;
      if (!parent) throw new Error(`Page content must belong to a Shell Region: ${m.displayName}.`);
    }
    const shell = shells.find(shell => shell.metadata.artifactId === m.shellId)!;
    const allowed = new Set(regions(shell.source).map(region => region.regionId));
    if (regions(page.source).some(region => !allowed.has(region.regionId))) throw new Error(`Map or discard unmatched Regions in ${m.displayName}.`);
    for (const menuId of Object.keys(m.menuOverrides ?? {})) if (!menus.some(menu => menu.menuId === menuId)) throw new Error(`Page Menu override refers to a missing Menu: ${menuId}.`);
    for (const menu of menus) validateMenu(applyMenuOverrides(menu, m.menuOverrides));
    const params = Object.fromEntries([...m.route.matchAll(/:([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\]/g)].map(match => [match[1] ?? match[2], '__parameter__']));
    const errors = validateArtifact(composeShellMenus(shell, definition, page, m.routeId, params), components, packages).filter(d => d.severity === 'error');
    if (errors.length) throw new Error(errors.map(error => error.message).join(' '));
  }
  const menuIds = new Set<string>(); for (const menu of menus) { validateMenu(menu); if (menuIds.has(menu.menuId)) throw new Error('Duplicate Menu identity.'); menuIds.add(menu.menuId); }
  themeCss(settings);
  for (const [shellId, values] of Object.entries(settings.shellConfiguration ?? {})) {
    const shell = shells.find(shell => shell.metadata.artifactId === shellId); if (!shell) throw new Error('Shell configuration target is missing.');
    for (const [name, value] of Object.entries(values)) {
      const contract = shell.metadata.public?.properties[name]; if (!contract) throw new Error(`Unknown Shell property: ${name}.`);
      const errors = valueErrors(value, contract, name); if (errors.length) throw new Error(errors.join(' '));
    }
  }
}
