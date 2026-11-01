import { composeShellMenus, regions, themeCss } from './composition.js';
import type { CompositionDefinition } from './composition.js';
import { parseSource } from './source.js';
import { mountVisualArtifact } from './runtime.js';
import type { ArtifactInstance, RuntimeOptions } from './runtime.js';
import type { RuntimeArtifact } from './model.js';
import { assertManagedVisualRevision, bindManagedVisualProjection } from './revision-guard.js';

export function mountComposedPage(definition: CompositionDefinition, page: RuntimeArtifact, options: RuntimeOptions & { routeId?: string; assetUrl?: (relative: string) => string; editor?: boolean }): ArtifactInstance {
  assertManagedVisualRevision(page, [...definition.shells, ...options.components], definition);
  const original = definition.shells.find(shell => shell.metadata.artifactId === page.metadata.shellId);
  if (!original) throw new Error('The selected Shell is missing. Select a Shell explicitly.');
  const shell = composeShellMenus(original, definition, page, options.routeId ?? '', options.route as Record<string, string>);
  const template = document.createElement('template'); template.innerHTML = shell.source;
  for (const element of template.content.querySelectorAll<HTMLElement>('[data-uip-branding]')) {
    const key = element.dataset.uipBranding as keyof typeof definition.settings.branding;
    const value = definition.settings.branding[key];
    if (element instanceof HTMLImageElement) { if (value) element.src = options.assetUrl?.(value) ?? value; else element.removeAttribute('src'); }
    else element.textContent = value ?? '';
  }
  if (options.editor) for (const element of template.content.querySelectorAll<HTMLElement>('[data-uip-node]')) {
    if (!element.closest('[data-uip-region]')) { element.dataset.uipLocked = 'true'; element.title = 'Shell content — edit in the Shell editor'; }
  }
  shell.source = template.innerHTML;
  bindManagedVisualProjection(original, shell);
  const available = new Set(regions(shell.source).map(region => region.regionId)), content: Record<string, RuntimeArtifact> = {};
  for (const region of regions(page.source)) {
    if (!available.has(region.regionId)) throw new Error(`Page Region is missing from its Shell: ${region.regionId}. Map or discard it explicitly.`);
    const source = page.source.slice(region.start, region.end);
    const ids = new Set(parseSource(source).nodes.map(node => node.id));
    const metadata = structuredClone(page.metadata);
    for (const key of ['bindings', 'conditions', 'repeaters', 'events'] as const) metadata[key] = metadata[key]?.filter(item => ids.has(item.node)) as never;
    metadata.layout = Object.fromEntries(Object.entries(metadata.layout ?? {}).filter(([id]) => ids.has(id)));
    content[region.regionId] = { ...page, metadata, source };
  }
  const css = `${themeCss(definition.settings)}\n${definition.siteCss}`;
  return mountVisualArtifact(shell, { ...options, context: { ...options.context, branding: definition.settings.branding }, presentationCss: css,
    inputs: definition.settings.shellConfiguration?.[shell.metadata.artifactId], regionInputs: options.inputs,
    regionScope: { state: structuredClone(page.metadata.state ?? {}), data: {}, subscribers: new Set(), initialized: false },
    regions: Object.fromEntries(Object.entries(content).map(([id, artifact]) => [id, bindManagedVisualProjection(page, { ...artifact, css: `${shell.css}\n${artifact.css}` }) as RuntimeArtifact])) });
}
