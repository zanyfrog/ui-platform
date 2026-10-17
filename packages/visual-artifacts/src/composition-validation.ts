import { validateArtifact, componentReferences } from './validation.js';
import { parseSource } from './source.js';
import { regions, themeCss, validateMenu, applyMenuOverrides, composeShellMenus, type CompositionDefinition } from './composition.js';
import { valueErrors, type RuntimeArtifact, type PackageComponent } from './model.js';

export interface CompositionDiagnostic {
  severity: 'error' | 'warning'; code: string; message: string;
  artifactId?: string; menuId?: string; node?: string; field?: string;
}

/** Shared complete-graph rules, with independent failures retained for Problems.
 * Dependent checks are skipped only when their prerequisites are unavailable. */
export function compositionDiagnostics(definition: CompositionDefinition, components: RuntimeArtifact[], packages: PackageComponent[] = []): CompositionDiagnostic[] {
  const diagnostics: CompositionDiagnostic[] = [];
  const issue = (code: string, message: string, location: Partial<CompositionDiagnostic> = {}) => diagnostics.push({ severity: 'error', code, message, ...location });
  const check = (code: string, work: () => void, location: Partial<CompositionDiagnostic> = {}) => {
    try { work(); } catch (error) { issue(code, error instanceof Error ? error.message : String(error), location); }
  };
  const { settings, pages, shells, menus, routes } = definition;
  const required = new Set<string>();
  for (const artifact of [...pages, ...shells]) check('composition.dependencies', () => {
    for (const id of [...componentReferences(artifact.source), ...(artifact.metadata.dependencies ?? [])]) required.add(id);
  }, { artifactId: artifact.metadata.artifactId });
  const selected = new Map<string, RuntimeArtifact>();
  for (const id of required) {
    const component = components.find(component => component.metadata.componentId === id);
    if (component && !selected.has(id)) {
      selected.set(id, component);
      check('composition.dependencies', () => {
        for (const nested of [...componentReferences(component.source), ...(component.metadata.dependencies ?? [])]) required.add(nested);
      }, { artifactId: component.metadata.artifactId });
    }
  }
  components = [...selected.values()];
  if (settings.assetsRoot !== 'assets' || !settings.branding?.applicationName || !Array.isArray(settings.siteStyles)) issue('composition.settings', 'Composition requires branding, source styles and the Application assets root.');
  const identities = new Set<string>();
  for (const artifact of [...pages, ...shells, ...components]) {
    const artifactId = artifact.metadata.artifactId;
    if (identities.has(artifactId)) issue('composition.duplicate-identity', 'Duplicate Visual Artifact identity.', { artifactId }); identities.add(artifactId);
    check('composition.artifact-validation', () => {
      diagnostics.push(...validateArtifact(artifact, components, packages).map(d => ({ ...d, code: 'visual.validation', artifactId })));
    }, { artifactId });
  }
  if (!shells.some(shell => shell.metadata.artifactId === settings.defaultShellId)) issue('composition.default-shell', 'Application default Shell is missing.', { field: 'defaultShellId' });
  const routeIds = new Set<string>(), paths = new Set<string>();
  for (const page of pages) {
    const m = page.metadata;
    const location = { artifactId: m.artifactId };
    check('composition.page-validation', () => {
      const shell = shells.find(shell => shell.metadata.artifactId === m.shellId);
      if (!m.routeId || !m.shellId || !shell) issue('composition.page-identities', `Page requires permanent Route and Shell identities: ${m.name}.`, location);
      if (!m.route?.startsWith('/') || /[\s?#\\]/.test(m.route) || m.route.includes('//') || m.route.split('/').some(part => part === '.' || part === '..')) issue('composition.route-path', 'Primary Route path is invalid.', { ...location, field: 'route' });
      if (m.route !== undefined) {
        const signature = m.route.replace(/:[A-Za-z][\w]*|\[[A-Za-z][\w]*\]/g, ':parameter').replace(/\/$/, '') || '/';
        if (routeIds.has(m.routeId ?? '') || paths.has(signature)) issue('composition.route-duplicate', 'Each Page requires a unique primary Route.', location);
        routeIds.add(m.routeId ?? ''); paths.add(signature);
      }
      if (!routes.some(route => route.routeId === m.routeId && route.pageId === m.artifactId && route.path === m.route)) issue('composition.route-capture', 'Runtime Route does not match its captured Page.', location);
      for (const node of parseSource(page.source).nodes) {
        let parent: typeof node | undefined = node;
        while (parent && !Object.hasOwn(parent.attributes, 'data-uip-region')) parent = parent.parent;
        if (!parent) issue('composition.page-region', `Page content must belong to a Shell Region: ${m.displayName}.`, { ...location, node: node.id });
      }
      if (shell) check('composition.region-mapping', () => {
        const allowed = new Set(regions(shell.source).map(region => region.regionId));
        if (regions(page.source).some(region => !allowed.has(region.regionId))) throw new Error(`Map or discard unmatched Regions in ${m.displayName}.`);
      }, location);
      for (const menuId of Object.keys(m.menuOverrides ?? {})) if (!menus.some(menu => menu.menuId === menuId)) issue('composition.menu-override', `Page Menu override refers to a missing Menu: ${menuId}.`, location);
      for (const menu of menus) check('composition.menu-override', () => validateMenu(applyMenuOverrides(menu, m.menuOverrides)), { ...location, menuId: menu.menuId });
      if (shell && m.route && m.routeId) check('composition.rendered-shell', () => {
        const params = Object.fromEntries([...m.route!.matchAll(/:([A-Za-z][\w]*)|\[([A-Za-z][\w]*)\]/g)].map(match => [match[1] ?? match[2], '__parameter__']));
        diagnostics.push(...validateArtifact(composeShellMenus(shell, definition, page, m.routeId!, params), components, packages).map(d => ({ ...d, code: 'visual.validation', artifactId: m.artifactId })));
      }, location);
    }, location);
  }
  const menuIds = new Set<string>(); for (const menu of menus) {
    check('composition.menu', () => validateMenu(menu), { menuId: menu.menuId });
    if (menuIds.has(menu.menuId)) issue('composition.menu-duplicate', 'Duplicate Menu identity.', { menuId: menu.menuId }); menuIds.add(menu.menuId);
  }
  check('composition.theme', () => { themeCss(settings); });
  for (const [shellId, values] of Object.entries(settings.shellConfiguration ?? {})) {
    check('composition.shell-configuration', () => {
      const shell = shells.find(shell => shell.metadata.artifactId === shellId); if (!shell) { issue('composition.shell-configuration', 'Shell configuration target is missing.'); return; }
      for (const [name, value] of Object.entries(values)) {
        const location = { artifactId: shellId, field: name };
        const contract = shell.metadata.public?.properties[name]; if (!contract) { issue('composition.shell-property', `Unknown Shell property: ${name}.`, location); continue; }
        for (const message of valueErrors(value, contract, name)) issue('composition.shell-property', message, location);
      }
    }, { artifactId: shellId });
  }
  return diagnostics;
}

/** Compatibility for existing save/runtime callers: same authority, fail closed. */
export function validateCompositionDefinition(definition: CompositionDefinition, components: RuntimeArtifact[], packages: PackageComponent[] = []): void {
  const error = compositionDiagnostics(definition, components, packages).find(d => d.severity === 'error');
  if (error) throw new Error(error.message);
}
