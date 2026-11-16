import path from 'node:path';
import { assertPlainPageRoute, assertPageUnused, primaryRouteSignature, pageAdmissionKind, regions, validateArtifact, validateCompositionDefinition } from '@ui-platform/visual-artifacts';
import type { ArtifactBundle, ArtifactFiles } from '@ui-platform/visual-artifacts';
import { pageCreationShell } from '../shared/page-creation.js';
import { appPath } from './applications.js';
import { compositionSettings, compositionWorkspace } from './application-composition.js';
import { discoverComponents } from './component-registry.js';
import { withApplicationMutation } from './composition-lock.js';
import { VisualArtifactService, knownVisualArtifacts, toRuntime, visualWorkspace } from './visual-artifacts.js';
import { prepareVisualCandidate, validateVisualRoleSyntax, VisualCandidateError } from './visual-candidate.js';

export const pageFailure = (status: number, code: string, message: string): never => { throw Object.assign(new Error(message), { status, code }); };
export interface PageAdmission {
  admit(): Promise<void>;
  principal(): void | Promise<void>;
  /** Paired CLI creation requires an explicit valid composition choice. */
  requireShell?: boolean;
  shell?(id: string): Promise<void>;
}
export function assertPageIdentities(pages: ArtifactBundle[]): void {
  const ids = new Set<string>();
  for (const page of pages) {
    const id = page.metadata?.artifactId;
    if (typeof id !== 'string' || !/^art_[\w-]+$/.test(id) || page.metadata?.kind !== 'page' || ids.has(id)) pageFailure(422, 'CLI_PAGE_IDENTITY_INVALID', 'Page identities are missing, invalid or ambiguous.');
    ids.add(id);
  }
}
export async function resolveVisualPage(key: string, id: string): Promise<ArtifactBundle> {
  const pages = await new VisualArtifactService(path.join(appPath(key), 'src/pages'), 'page').list({ recovery: 'refuse' });
  assertPageIdentities(pages);
  const page = pages.find(page => page.metadata!.artifactId === id);
  if (!page) pageFailure(404, 'CLI_PAGE_NOT_FOUND', 'Page identity was not found.');
  return page!;
}

/** Shared browser/paired-CLI Page orchestration; all writes retain the Visual service. */
export async function createVisualPage(key: string, input: { name: string; route?: string; pageMode?: unknown; shellId?: unknown; form?: Parameters<VisualArtifactService['create']>[2] }, authority: PageAdmission): Promise<ArtifactBundle> {
  return withApplicationMutation(appPath(key), async () => {
    const service = new VisualArtifactService(path.join(appPath(key), 'src/pages'), 'page');
    const composition = await compositionSettings(key);
    if (authority.requireShell && input.pageMode !== 'plain' && !composition) pageFailure(422, 'CLI_PAGE_SHELL_REQUIRED', 'Configure Application composition and a default Shell, specify a valid Shell, or use --mode plain.');
    // Explicit Shell selection may repair a missing default selection in a composed Application.
    const shellId = pageCreationShell(input, authority.requireShell && input.shellId && composition ? String(input.shellId) : composition?.defaultShellId);
    if (authority.requireShell && input.pageMode !== 'plain' && !shellId) pageFailure(422, 'CLI_PAGE_SHELL_REQUIRED', 'Configure a default Shell, specify a valid --shell, or use --mode plain.');
    const shells = shellId ? await new VisualArtifactService(path.join(appPath(key), 'shells'), 'shell').list({ recovery: 'refuse' }) : [];
    const matches = shells.filter(shell => shell.metadata?.artifactId === shellId);
    if (shellId && matches.length !== 1) pageFailure(422, 'CLI_PAGE_SHELL_INVALID', 'Selected/default Shell is missing or ambiguous. Configure a default Shell, specify a valid --shell, or use --mode plain.');
    const shell = matches[0];
    if (shell) {
      await authority.shell?.(shellId!);
      if (authority.requireShell && (shell.metadata?.kind !== 'shell' || shell.diagnostics.some(d => d.severity === 'error') || validateArtifact(toRuntime(shell)!, (await visualWorkspace(key, await discoverComponents(key))).components.map(toRuntime).filter((item): item is NonNullable<typeof item> => !!item), await discoverComponents(key)).some(d => d.severity === 'error'))) pageFailure(422, 'CLI_PAGE_SHELL_INVALID', 'Selected Shell requires repair before creating a Page.');
    }
    const initialRegionId = shell ? regions(shell.files.source).find(region => region.regionId === 'region-main')?.regionId ?? regions(shell.files.source)[0]?.regionId ?? null : 'region-main';
    const pages = await service.list({ recovery: 'refuse' });
    if (authority.requireShell) assertPageIdentities(pages);
    if (composition) {
      const signature = primaryRouteSignature(input.route ?? `/${input.name}`);
      if (pages.some(page => page.metadata?.route && primaryRouteSignature(page.metadata.route) === signature)) pageFailure(409, 'CLI_PAGE_ROUTE_CONFLICT', 'A Page already owns that primary Route.');
    }
    if (!shellId) {
      if (pages.some(page => page.metadata?.route === (input.route ?? `/${input.name}`))) pageFailure(409, 'CLI_PAGE_ROUTE_CONFLICT', 'A Page already owns that Route.');
      assertPlainPageRoute(input.route ?? `/${input.name}`, pages);
    }
    return service.create(input.name, input.route, input.form, shellId, initialRegionId, async () => {
      if (authority.requireShell) {
        if (JSON.stringify(await compositionSettings(key)) !== JSON.stringify(composition)) pageFailure(409, 'CLI_PAGE_CONFLICT', 'Composition settings changed. Reload before creating.');
        if (shell && (await new VisualArtifactService(path.join(appPath(key), 'shells'), 'shell').read(shell.locator)).hash !== shell.hash) pageFailure(409, 'CLI_PAGE_CONFLICT', 'Selected Shell changed. Reload before creating.');
        if (shellId) await authority.shell?.(shellId);
      }
      await authority.admit();
    });
  });
}
export async function updateVisualPage(key: string, locator: string, files: ArtifactFiles, expectedHash: string, authority: PageAdmission): Promise<ArtifactBundle> {
  await authority.principal();
  try { await validateVisualRoleSyntax(files); }
  catch (error) { throw new VisualCandidateError(error instanceof Error ? error.message : String(error)); }
  const syntax = JSON.stringify(files);
  return withApplicationMutation(appPath(key), async () => {
    const service = new VisualArtifactService(path.join(appPath(key), 'src/pages'), 'page');
    const validation = await prepareVisualCandidate(key, 'page', locator, await discoverComponents(key), false, syntax);
    return service.saveCandidate(locator, files, expectedHash, { validate: candidate => validation.validate(candidate), admit: async () => {
      await validation.recheck(); await authority.principal(); await authority.admit();
    } });
  });
}
export async function deleteVisualPage(key: string, locator: string, expectedHash: string, authority: PageAdmission): Promise<void> {
  return withApplicationMutation(appPath(key), async () => {
    const service = new VisualArtifactService(path.join(appPath(key), 'src/pages'), 'page');
    const page = await service.read(locator, { recovery: 'refuse' });
    if (!expectedHash || page.hash !== expectedHash) pageFailure(409, 'CLI_PAGE_CONFLICT', 'Page revision changed. Reload before deletion.');
    if (page.metadata?.route) assertPageUnused(page.metadata.route, await service.list({ recovery: 'refuse' }), locator);
    const definition = await compositionWorkspace(key, await discoverComponents(key), undefined, { recovery: 'refuse' });
    if (definition) {
      const pages = definition.pages.filter(item => item.metadata.artifactId !== page.metadata?.artifactId);
      const packages = await discoverComponents(key), workspace = await visualWorkspace(key, packages, { recovery: 'refuse' });
      if (page.metadata?.route) assertPageUnused(page.metadata.route, [...workspace.pages, ...workspace.shells], locator);
      validateCompositionDefinition({ ...definition, pages, routes: definition.routes.filter(route => route.pageId !== page.metadata?.artifactId) }, workspace.components.map(toRuntime).filter((item): item is NonNullable<typeof item> => !!item), packages);
    }
    await service.remove(locator, expectedHash, await knownVisualArtifacts(), authority.admit);
  });
}

/** Independent Page copy; publication remains in the Visual creation service. */
export async function duplicateVisualPage(key: string, sourceId: string, name: string, route: string, expectedHash: string, authority: PageAdmission & { read(): Promise<void> }): Promise<ArtifactBundle> {
  await authority.read();
  const original = await resolveVisualPage(key, sourceId);
  if (original.hash !== expectedHash) pageFailure(409, 'CLI_PAGE_CONFLICT', 'Source Page revision changed. Reload before duplicating.');
  const composed = pageAdmissionKind(original.metadata!) === 'composed';
  if (composed && (!original.metadata!.shellId || !original.metadata!.routeId)) pageFailure(422, 'CLI_PAGE_VALIDATION', 'Source Page composition identities require repair.');
  const service = new VisualArtifactService(path.join(appPath(key), 'src/pages'), 'page');
  return service.createCompletePage(name, route, composed ? original.metadata!.shellId : undefined, async generated => {
    await authority.read(); await authority.principal();
    const source = await resolveVisualPage(key, sourceId);
    if (source.hash !== expectedHash) pageFailure(409, 'CLI_PAGE_CONFLICT', 'Source Page revision changed. Reload before duplicating.');
    if (composed) {
      await authority.shell?.(source.metadata!.shellId!);
      const matches = (await new VisualArtifactService(path.join(appPath(key), 'shells'), 'shell').list()).filter(shell => shell.metadata?.artifactId === source.metadata!.shellId);
      if (matches.length !== 1 || matches[0].diagnostics.some(d => d.severity === 'error')) pageFailure(422, 'CLI_PAGE_SHELL_INVALID', 'Source Shell is missing, ambiguous or invalid.');
    }
    const pages = await service.list({ recovery: 'refuse' });
    const signature = primaryRouteSignature(route);
    if (pages.some(page => page.metadata?.route && primaryRouteSignature(page.metadata.route) === signature)) pageFailure(409, 'CLI_PAGE_ROUTE_CONFLICT', 'A Page already owns that primary Route.');
    const metadata = { ...structuredClone(source.metadata!), ...generated };
    if (!composed) { delete metadata.shellId; delete metadata.routeId; }
    // Node/Region/HTML anchor identities are Page-local and retain all their bindings.
    // Only typed Menu destinations pointing at the copied Page/Route are self references.
    const remap = (value: unknown): void => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) { value.forEach(remap); return; }
      const object = value as Record<string, unknown>;
      if (object.kind === 'page' && object.pageId === sourceId) object.pageId = generated.artifactId;
      if (object.kind === 'route' && source.metadata!.routeId && object.routeId === source.metadata!.routeId) object.routeId = generated.routeId;
      Object.values(object).forEach(remap);
    };
    remap(metadata.menuOverrides);
    const files = { ...source.files, metadata: JSON.stringify(metadata, null, 2) + '\n' };
    const packages = await discoverComponents(key);
    const validation = await prepareVisualCandidate(key, 'page', name + '/page.visual.json', packages, false, undefined, true);
    return { files, validate: validation.validate, async admit() {
      await authority.principal(); await authority.read();
      if (composed) await authority.shell?.(source.metadata!.shellId!);
      await authority.admit();
      const latest = await resolveVisualPage(key, sourceId);
      if (latest.hash !== expectedHash) pageFailure(409, 'CLI_PAGE_CONFLICT', 'Source Page changed before duplicate publication.');
      await validation.recheck();
      if (JSON.stringify(await discoverComponents(key)) !== JSON.stringify(packages)) pageFailure(409, 'CLI_PAGE_CONFLICT', 'Installed dependencies changed before duplicate publication.');
    } };
  });
}
