import { assertIsolatedPreviewFunctions } from '@ui-platform/visual-artifacts/vite';
import { compileVisualFunctions } from '@ui-platform/artifacts';
import type { ArtifactBundle } from '@ui-platform/visual-artifacts';
import { componentReferences } from '@ui-platform/visual-artifacts';
import { visualWorkspace } from './visual-artifacts.js';
import { compositionWorkspace } from './application-composition.js';
import { discoverComponents } from './component-registry.js';
import { withApplicationMutation } from './composition-lock.js';
import { appPath } from './applications.js';

/** The isolated inspector preview has no Application Vite helper graph.
 * Helpers continue to work in the Application runtime; explicitly block an
 * unsupported inspector import instead of giving it a different module instance.
 */
export function isolatedPreviewCode(bundle: ArtifactBundle): string {
  assertIsolatedPreviewFunctions(bundle.files.code);
  return compileVisualFunctions(bundle.files.code);
}
export function visualPreviewRevision(key: string, kind: string, locator: string, expectedHash: string, authorizeRelated: (kind: 'shell' | 'component') => Promise<void> = async () => {}) {
  return withApplicationMutation(appPath(key), async () => {
    const packages = await discoverComponents(key), workspace = await visualWorkspace(key, packages);
    const selected = (kind === 'page' ? workspace.pages : kind === 'shell' ? workspace.shells : kind === 'component' ? workspace.components : []).find(bundle => bundle.locator === locator);
    if (!selected || selected.hash !== expectedHash) throw Object.assign(new Error('Preview source changed. Reload its complete revision before previewing.'), { status: 409 });
    const composition = selected.metadata?.shellId || kind === 'shell' ? await compositionWorkspace(key, packages) : null;
    const shells = composition ? workspace.shells.filter(shell => shell.metadata?.artifactId === (kind === 'shell' ? selected.metadata?.artifactId : selected.metadata?.shellId)) : [];
    const required = new Set([selected, ...shells].flatMap(bundle => [...componentReferences(bundle.files.source), ...(bundle.metadata?.dependencies ?? [])]));
    const components: ArtifactBundle[] = [];
    for (const id of required) {
      const component = workspace.components.find(bundle => bundle.metadata?.componentId === id);
      if (!component) continue;
      components.push(component);
      for (const nested of [...componentReferences(component.files.source), ...(component.metadata?.dependencies ?? [])]) required.add(nested);
    }
    const participating = [selected, ...components, ...shells];
    if (shells.length) await authorizeRelated('shell');
    if (components.length || kind === 'component') await authorizeRelated('component');
    if (participating.some(bundle => !bundle.metadata || bundle.diagnostics.some(d => d.severity === 'error'))) throw Object.assign(new Error('Correct the complete preview graph before loading this revision.'), { status: 422 });
    const code = Object.fromEntries(participating.map(bundle => [bundle.hash, isolatedPreviewCode(bundle)]));
    // External source actors ignore our graph lock: recheck all participating bytes.
    const next = await visualWorkspace(key, packages);
    for (const bundle of participating) if (![...next.pages, ...next.shells, ...next.components].some(item => item.locator === bundle.locator && item.hash === bundle.hash)) throw Object.assign(new Error('Preview dependency changed while capturing its revision.'), { status: 409 });
    if (composition && JSON.stringify(await compositionWorkspace(key, packages)) !== JSON.stringify(composition)) throw Object.assign(new Error('Preview composition changed while capturing its revision.'), { status: 409 });
    return { bundle: selected, packages: workspace.packages, components, shells, composition: composition ? { ...composition, pages: kind === 'page' ? composition.pages.filter(page => page.metadata.artifactId === selected.metadata?.artifactId) : [], shells: composition.shells.filter(shell => shells.some(bundle => bundle.metadata?.artifactId === shell.metadata.artifactId)) } : null, code };
  });
}
