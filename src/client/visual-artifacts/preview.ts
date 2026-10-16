import type { ArtifactInstance } from '@ui-platform/visual-artifacts/runtime';
import { visualDatasetServices } from './data-services.js';
import type { ArtifactBundle, PackageComponent, RuntimeArtifact } from '@ui-platform/visual-artifacts';
import type { CompositionDefinition } from '@ui-platform/visual-artifacts';
import { ApplicationDataClient, createSessionApplicationDataTransport, createApplicationDataServices } from '@uib/platform-core/application-data';
const output = document.querySelector('#preview')!;
const events = document.querySelector('#events')!;
let instance: ArtifactInstance | undefined;
let sequence = 0;
window.addEventListener('message', async event => {
  if (event.origin !== location.origin || event.source !== parent || event.data?.type !== 'uip-preview') return;
  const current = ++sequence;
  const { locator, kind, hash, appKey } = event.data as { locator: string; kind: string; hash: string; appKey: string };
  try {
    const collection = kind === 'page' ? 'pages' : kind === 'shell' ? 'shells' : 'components';
    const response = await fetch(`/api/apps/${encodeURIComponent(appKey)}/visual-${collection}?preview=1&locator=${encodeURIComponent(locator)}&hash=${encodeURIComponent(hash)}`, { cache: 'no-store' });
    const revision = await response.json(); if (!response.ok) throw new Error(revision.error ?? 'Preview revision unavailable.');
    if (current !== sequence) return;
    const { bundle, components, packages, composition, shells, code } = revision as { bundle: ArtifactBundle; components: ArtifactBundle[]; shells: ArtifactBundle[]; packages: PackageComponent[]; composition?: CompositionDefinition; code: Record<string, string> };
    instance?.destroy(); events.textContent = '';
    const runtime = async (item: ArtifactBundle, _kind: 'pages' | 'components' | 'shells'): Promise<RuntimeArtifact> => {
      if (event.data.design) return { metadata: item.metadata!, source: item.files.source, css: item.files.css, functions: {} };
      const url = URL.createObjectURL(new Blob([code[item.hash]], { type: 'text/javascript' }));
      try { return { metadata: item.metadata!, source: item.files.source, css: item.files.css, functions: await import(/* @vite-ignore */ url) }; }
      finally { URL.revokeObjectURL(url); }
    };
    // Register the application's installed implementations before loading the shared renderer.
    for (const pkg of packages) if (pkg.moduleUrl) await import(/* @vite-ignore */ pkg.moduleUrl);
    const { mountVisualArtifact, mountComposedPage } = await import('@ui-platform/visual-artifacts/runtime');
    const fixtures = JSON.parse(bundle.files.fixtures || '{}');
    const artifact = await runtime(bundle, bundle.metadata!.kind === 'page' ? 'pages' : bundle.metadata!.kind === 'shell' ? 'shells' : 'components');
    const options = { components: await Promise.all(components.filter(c => c.metadata && !c.diagnostics.some(d => d.severity === 'error')).map(c => runtime(c, 'components'))), packages,
      inputs: { ...fixtures.public, ...event.data.publicInputs }, sources: fixtures.sources, context: fixtures.context, route: fixtures.route,
      services: event.data.design ? {} : event.data.testId ? createApplicationDataServices(new ApplicationDataClient(createSessionApplicationDataTransport({ endpoint: `/api/apps/${encodeURIComponent(appKey)}/form-tests/${encodeURIComponent(event.data.testId)}` }))) : visualDatasetServices,
      navigate: (to: string) => { events.textContent += `Navigation requested: ${to}\n`; }, onError: (error: unknown) => { events.textContent += `Runtime error: ${String(error)}\n`; } };
    if (composition) composition.shells = await Promise.all((shells ?? []).map(shell => runtime(shell, 'shells')));
    if (current !== sequence) return;
    const page = artifact.metadata.kind === 'shell' ? { metadata: { schemaVersion: 1 as const, artifactId: 'art_shell_preview', kind: 'page' as const, name: 'shell-preview', displayName: 'Shell Preview', route: '/', shellId: artifact.metadata.artifactId }, source: '', css: '' } : artifact;
    instance = composition && page.metadata.shellId ? mountComposedPage(composition, page, { ...options, editor: true, routeId: page.metadata.routeId, assetUrl: relative => `/api/apps/${encodeURIComponent(appKey)}/composition-asset?path=${encodeURIComponent(relative)}` }) : mountVisualArtifact(artifact, options);
    for (const name of Object.keys(artifact.metadata.public?.events ?? {})) instance.host.addEventListener(name, event => { events.textContent += `${name}: ${JSON.stringify((event as CustomEvent).detail)}\n`; });
    output.replaceChildren(instance.host);
  } catch (error) { if (current === sequence) output.textContent = `Preview blocked: ${String(error)}`; }
});
