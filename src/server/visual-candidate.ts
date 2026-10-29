import path from 'node:path';
import { readFile, readdir } from 'node:fs/promises';
import { transform } from 'esbuild';
import { compileVisualFunctions } from '@ui-platform/artifacts';
import { assertPlainPageRoute, assertPageUnused, validatePageLinks, componentReferences, parseMetadata, validateArtifact, validateCompositionDefinition } from '@ui-platform/visual-artifacts';
import type { ArtifactBundle, ArtifactFiles, CompositionDefinition, PackageComponent, RuntimeArtifact } from '@ui-platform/visual-artifacts';
import { validateRuntimeFunctionSource } from '@ui-platform/visual-artifacts/vite';
import { VisualArtifactService, platformComponentsRoot, toRuntime, visualWorkspace, knownVisualArtifacts } from './visual-artifacts.js';
import { appPath } from './applications.js';
import { pageAdmissionKind, validatePageMembership, capturePageRoutes } from '@ui-platform/visual-artifacts';

export class VisualCandidateError extends Error { readonly status = 422; readonly code = 'source.validation'; }
export async function validateVisualRoleSyntax(files: ArtifactFiles): Promise<void> {
  if (!files.source.trim()) throw new Error('HTML source is missing or empty. Keep an explicit empty Region or Shell-default comment where appropriate.');
  JSON.parse(files.fixtures || '{}'); compileVisualFunctions(files.code);
  await validateRuntimeFunctionSource(files.code);
  const css = await transform(files.css, { loader: 'css', logLevel: 'silent' });
  if (css.warnings.length) throw new Error('CSS source is incomplete or invalid: ' + css.warnings.map(warning => warning.text).join(' '));
}
/** Capture dependencies before taking the target role lock. Callers hold the
 * shared Foundation graph lock; validation below reads only this captured graph.
 */
export async function prepareVisualCandidate(appKey: string, kind: 'page' | 'shell' | 'component', locator: string, packages: PackageComponent[], allowShellChange = false, validatedSyntax?: string) {
  const root = appPath(appKey), workspace = await visualWorkspace(appKey, packages);
  const compositionFiles = new Map<string, string>();
  const read = async (relative: string) => { const text = await readFile(path.join(root, relative), 'utf8'); compositionFiles.set(relative, text); return text; };
  const settingsText = await read('app.settings.json');
  const settings = JSON.parse(settingsText).presentation;
  let definition: CompositionDefinition | undefined;
  if (settings?.model === 'composition-v1') {
    const menus = [];
    for (const name of await readdir(path.join(root, 'menus'))) if (name.endsWith('.json')) menus.push(JSON.parse(await read('menus/' + name)));
    const siteCss = (await Promise.all(settings.siteStyles.map((file: string) => read(file)))).join('\n');
    definition = { settings, menus, siteCss, pages: [], shells: [], routes: [] };
  }
  const old = (kind === 'page' ? workspace.pages : kind === 'shell' ? workspace.shells : workspace.components).find(bundle => bundle.locator === locator);
  const known = kind === 'component' ? await knownVisualArtifacts() : [];
  const records = [
    ...workspace.pages.map(bundle => ({ bundle, service: new VisualArtifactService(path.join(root, 'src/pages'), 'page'), kind: 'page' })),
    ...workspace.shells.map(bundle => ({ bundle, service: new VisualArtifactService(path.join(root, 'shells'), 'shell'), kind: 'shell' })),
    ...workspace.components.map(bundle => ({ bundle, service: new VisualArtifactService(platformComponentsRoot, 'component'), kind: 'component' })),
  ];
  return {
    async validate(candidate: ArtifactBundle): Promise<void> {
      try {
        // Only detached, byte-identical syntax work can be reused. All identity,
        // dependency and original-authority checks remain under graph admission.
        if (JSON.stringify(candidate.files) !== validatedSyntax) await validateVisualRoleSyntax(candidate.files);
        if (!candidate.metadata || parseMetadata(candidate.files.metadata).diagnostics.some(d => d.severity === 'error')) throw new Error('Correct the complete metadata candidate before saving.');
        const collection = kind === 'page' ? workspace.pages : kind === 'shell' ? workspace.shells : workspace.components;
        if (!old || collection.filter(bundle => bundle.metadata?.artifactId === candidate.metadata!.artifactId).length !== 1) throw new Error('The authoritative Visual identity is missing or ambiguous. Resolve the source conflict before normal editing.');
        if (kind === 'page' && !allowShellChange && old?.metadata?.shellId !== candidate.metadata.shellId) throw new Error('Use Change Page Shell to map or discard unmatched Regions explicitly.');
        const replace = (items: ArtifactBundle[], target: string) => items.map(bundle => kind === target && bundle.locator === locator ? candidate : bundle);
        if (kind === 'page') {
          const pages = replace(workspace.pages, 'page');
          if (definition) validatePageMembership(toRuntime(candidate)!);
          else if (pageAdmissionKind(candidate.metadata) === 'composed') throw new Error('Composed Page requires Application composition admission.');
          if (old.metadata?.route !== candidate.metadata.route) {
            if (pageAdmissionKind(candidate.metadata) === 'plain') assertPlainPageRoute(candidate.metadata.route, workspace.pages, locator);
            if (old.metadata?.route) assertPageUnused(old.metadata.route, [...pages, ...workspace.shells], '');
          } else if (workspace.pages.some(page => page.locator !== locator && page.metadata?.route === candidate.metadata!.route)) throw new Error('Duplicate saved Page route.');
          validatePageLinks(old.files.source, candidate.files.source, pages, { allowComposed: !!definition });
        }
        const components = replace(workspace.components, 'component').map(toRuntime).filter((item): item is RuntimeArtifact => !!item);
        const runtime = toRuntime(candidate)!;
        const errors = validateArtifact(runtime, components, packages).filter(d => d.severity === 'error');
        if (errors.length) throw new Error(errors.map(error => error.message).join(' '));
        if (definition) {
          const required = (items: ArtifactBundle[]) => items.map(bundle => { if (!bundle.metadata) throw new Error('Related source requires repair before this composition candidate can be validated.'); return toRuntime(bundle)!; });
          const pages = required(replace(workspace.pages, 'page')), shells = required(replace(workspace.shells, 'shell'));
          try { validateCompositionDefinition({ ...definition, pages, shells, routes: capturePageRoutes(pages) }, components, packages); }
          catch { throw new Error('The complete candidate conflicts with Application composition. Check its Shell Regions, routes, Menus and related source. Local changes are retained.'); }
        }
        if (kind === 'component' && JSON.stringify(old?.metadata?.public) !== JSON.stringify(candidate.metadata.public)) {
          const affected = new Set([candidate.metadata.componentId!]);
          for (const id of affected) for (const bundle of known) if (bundle.metadata && bundle.metadata.artifactId !== candidate.metadata.artifactId && (componentReferences(bundle.files.source).includes(id) || bundle.metadata.dependencies?.includes(id))) {
            if (validateArtifact(toRuntime(bundle)!, components, packages).some(d => d.severity === 'error')) throw new Error('This change would invalidate a dependent artifact. Keep the Component interface compatible.');
            if (bundle.metadata.componentId) affected.add(bundle.metadata.componentId);
          }
        }
      } catch (error) { if (error instanceof VisualCandidateError) throw error; throw new VisualCandidateError(error instanceof Error ? error.message : String(error)); }
    },
    async recheck(): Promise<void> {
      for (const record of records) if (!(record.kind === kind && record.bundle.locator === locator)) {
        if ((await record.service.read(record.bundle.locator)).hash !== record.bundle.hash) throw Object.assign(new Error('A Visual dependency changed during candidate validation. Retry against current source.'), { status: 409 });
      }
      for (const [file, text] of compositionFiles) if (await readFile(path.join(root, file), 'utf8') !== text) throw Object.assign(new Error('Composition source changed during candidate validation.'), { status: 409 });
    },
  };
}
