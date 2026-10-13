import type { ArtifactInstance } from '@ui-platform/visual-artifacts/runtime';
import { visualDatasetServices } from './data-services.js';
import type { ArtifactBundle, PackageComponent, RuntimeArtifact } from '@ui-platform/visual-artifacts';
import type { CompositionDefinition } from '@ui-platform/visual-artifacts';
const output = document.querySelector('#preview')!;
const events = document.querySelector('#events')!;
let instance: ArtifactInstance | undefined;
window.addEventListener('message', async event => {
  if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'uip-preview') return;
  const { bundle, components, packages, appKey, composition, shells } = event.data as { bundle: ArtifactBundle; components: ArtifactBundle[]; shells?: ArtifactBundle[]; packages: PackageComponent[]; appKey: string; composition?: CompositionDefinition };
  try {
    instance?.destroy(); events.textContent = '';
    const runtime = async (item: ArtifactBundle, kind: 'pages' | 'components' | 'shells'): Promise<RuntimeArtifact> => ({ metadata: item.metadata!, source: item.files.source, css: item.files.css,
      functions: item.files.code.trim() ? await import(/* @vite-ignore */ `/api/apps/${encodeURIComponent(appKey)}/visual-${kind}?locator=${encodeURIComponent(item.locator)}&code=1&hash=${item.hash}`) : undefined });
    // Register the application's installed implementations before loading the shared renderer.
    for (const pkg of packages) if (pkg.moduleUrl) await import(/* @vite-ignore */ pkg.moduleUrl);
    const { mountVisualArtifact, mountComposedPage } = await import('@ui-platform/visual-artifacts/runtime');
    const fixtures = JSON.parse(bundle.files.fixtures || '{}');
    const artifact = await runtime(bundle, bundle.metadata!.kind === 'page' ? 'pages' : bundle.metadata!.kind === 'shell' ? 'shells' : 'components');
    const options = { components: await Promise.all(components.filter(c => c.metadata && !c.diagnostics.some(d => d.severity === 'error')).map(c => runtime(c, 'components'))), packages,
      inputs: fixtures.public, sources: fixtures.sources, context: fixtures.context, route: fixtures.route,
      services: visualDatasetServices,
      navigate: (to: string) => { events.textContent += `Navigation requested: ${to}\n`; }, onError: (error: unknown) => { events.textContent += `Runtime error: ${String(error)}\n`; } };
    if (composition) composition.shells = await Promise.all((shells ?? []).map(shell => runtime(shell, 'shells')));
    const page = artifact.metadata.kind === 'shell' ? { metadata: { schemaVersion: 1 as const, artifactId: 'art_shell_preview', kind: 'page' as const, name: 'shell-preview', displayName: 'Shell Preview', route: '/', shellId: artifact.metadata.artifactId }, source: '', css: '' } : artifact;
    instance = composition && page.metadata.shellId ? mountComposedPage(composition, page, { ...options, editor: true, routeId: page.metadata.routeId, assetUrl: relative => `/api/apps/${encodeURIComponent(appKey)}/composition-asset?path=${encodeURIComponent(relative)}` }) : mountVisualArtifact(artifact, options);
    for (const name of Object.keys(artifact.metadata.public?.events ?? {})) instance.host.addEventListener(name, event => { events.textContent += `${name}: ${JSON.stringify((event as CustomEvent).detail)}\n`; });
    output.replaceChildren(instance.host);
  } catch (error) { output.textContent = `Preview blocked: ${String(error)}`; }
});
