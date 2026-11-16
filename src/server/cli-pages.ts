import type { IncomingMessage } from 'node:http';
import type { V1DevelopmentIdentity } from './v1-development-identity.js';
import type { DevelopmentApplicationRegistry } from './development-application-registry.js';
import { readApplicationOwnerId } from './applications.js';
import { V1_AUTHORITY_ID } from './v1-development-policy.js';
import { createVisualPage, updateVisualPage, deleteVisualPage, duplicateVisualPage, resolveVisualPage, pageFailure } from './page-management.js';
import type { ArtifactFiles } from '@ui-platform/visual-artifacts';

const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const roles = ['source', 'css', 'metadata', 'fixtures', 'code'];
export async function cliPageMutation(req: IncomingMessage, url: URL, actorRequest: IncomingMessage, identity: V1DevelopmentIdentity, registry: DevelopmentApplicationRegistry): Promise<{ status: number; data: unknown } | null> {
  const creating = req.method === 'POST' && url.pathname === '/api/cli/pages';
  const updating = req.method === 'PUT' && url.pathname === '/api/cli/page';
  const deleting = req.method === 'DELETE' && url.pathname === '/api/cli/page';
  const duplicating = req.method === 'POST' && url.pathname === '/api/cli/page-duplicate';
  if (!creating && !updating && !deleting && !duplicating) return null;
  let admitted = false;
  try {
    if ([...url.searchParams.keys()].some(key => !['app', ...(creating ? [] : ['page'])].includes(key)) || url.searchParams.getAll('app').length !== 1 || !url.searchParams.get('app') ||
        !creating && (url.searchParams.getAll('page').length !== 1 || !/^art_[\w-]+$/.test(url.searchParams.get('page') ?? ''))) pageFailure(400, 'CLI_REQUEST_INVALID', 'Permanent Application and Page IDs are required.');
    let text = ''; for await (const chunk of req) { text += chunk; if (Buffer.byteLength(text) > 2 * 1024 * 1024) pageFailure(413, 'CLI_REQUEST_INVALID', 'Page request exceeds 2 MB.'); }
    let input: unknown; try { input = JSON.parse(text); } catch { pageFailure(400, 'CLI_REQUEST_INVALID', 'A JSON object is required.'); }
    const keys = duplicating ? ['name', 'route', 'expectedHash'] : creating ? ['name', 'route', 'shell', 'mode'] : updating ? ['files', 'expectedHash'] : ['expectedHash'];
    if (!object(input) || Object.keys(input).some(key => !keys.includes(key))) pageFailure(400, 'CLI_REQUEST_INVALID', 'Unsupported Page request fields.');
    const value = input as Record<string, unknown>;
    if (creating && (typeof value.name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(value.name) || typeof value.route !== 'string' || !value.route ||
        value.mode !== undefined && value.mode !== 'plain' || value.shell !== undefined && (typeof value.shell !== 'string' || !/^art_[\w-]+$/.test(value.shell)) || value.mode === 'plain' && value.shell !== undefined)) pageFailure(400, 'CLI_REQUEST_INVALID', 'Create requires name/route; use --shell or --mode plain, never both.');
    if (duplicating && (typeof value.name !== 'string' || !/^[a-z][a-z0-9-]*$/.test(value.name) || typeof value.route !== 'string' || !value.route)) pageFailure(400, 'CLI_REQUEST_INVALID', 'Duplicate requires a new Page name and route.');
    if (!creating && (typeof value.expectedHash !== 'string' || !/^[a-f0-9]{64}$/.test(value.expectedHash))) pageFailure(400, 'CLI_REQUEST_INVALID', 'A complete expected revision hash is required.');
    if (updating && (!object(value.files) || Object.keys(value.files).length !== roles.length || roles.some(role => typeof (value.files as Record<string, unknown>)[role] !== 'string'))) pageFailure(400, 'CLI_REQUEST_INVALID', 'Update requires exactly five string roles: source, css, metadata, fixtures and code.');
    const appId = url.searchParams.get('app')!, app = registry.byApplicationId(appId);
    if (!app) pageFailure(403, 'CLI_SCOPE_DENIED', 'Application access denied.');
    const key = app!.key;
    const owner = async () => { if (registry.byApplicationId(appId)?.key !== key || await readApplicationOwnerId(key) !== appId) pageFailure(403, 'CLI_SCOPE_DENIED', 'Original Application owner changed.'); };
    await owner();
    const appResource = { authorityId: V1_AUTHORITY_ID, applicationId: appId, kind: 'application' as const, id: appId };
    if (!await identity.authorize(actorRequest, 'ui.application.view', appResource)) pageFailure(403, 'CLI_SCOPE_DENIED', 'Application access denied.');
    const appAdmission = identity.captureAdmission(actorRequest, 'ui.application.view', appResource);
    const principal = identity.captureCliEditorPrincipal(actorRequest);
    const permission = deleting ? 'ui.page.admin' : 'ui.page.edit';
    const resource = { authorityId: V1_AUTHORITY_ID, applicationId: appId, kind: 'page' as const, id: 'pages', parentId: appId };
    const broad = await identity.authorize(actorRequest, permission, resource);
    const page = creating ? undefined : await resolveVisualPage(key, url.searchParams.get('page')!);
    if (!broad && (duplicating || !page || !await identity.authorize(actorRequest, permission, { ...resource, id: page.metadata!.artifactId }))) pageFailure(403, 'CLI_PAGE_DENIED', 'Page mutation access denied.');
    const admission = identity.captureAdmission(actorRequest, permission, broad ? resource : { ...resource, id: page!.metadata!.artifactId });
    if (page && page.hash !== value.expectedHash) pageFailure(409, 'CLI_PAGE_CONFLICT', 'Page revision changed. Reload before mutating.');
    if (updating) {
      let metadata: any; try { metadata = JSON.parse((value.files as ArtifactFiles).metadata); } catch { pageFailure(422, 'CLI_PAGE_VALIDATION', 'Candidate metadata must be valid JSON.'); }
      if (metadata?.artifactId !== page!.metadata!.artifactId) pageFailure(422, 'CLI_PAGE_VALIDATION', 'Permanent Page identity must be preserved.');
    }
    let sourceAdmission: (() => Promise<void>) | undefined;
    if (duplicating) {
      const readResource = { ...resource, id: 'pages' };
      if (!await identity.authorize(actorRequest, 'ui.page.view', readResource)) readResource.id = page!.metadata!.artifactId;
      if (!await identity.authorize(actorRequest, 'ui.page.view', readResource)) pageFailure(403, 'CLI_PAGE_DENIED', 'Source Page read access denied.');
      sourceAdmission = identity.captureAdmission(actorRequest, 'ui.page.view', readResource);
    }
    const authority = {
      requireShell: true,
      principal,
      async shell(id: string) {
        const scope = { authorityId: V1_AUTHORITY_ID, applicationId: appId, kind: 'artifact' as const, id: 'presentation', parentId: appId };
        if (!await identity.authorize(actorRequest, 'ui.presentation.view', scope)) pageFailure(403, 'CLI_PAGE_SHELL_DENIED', 'Selected Shell access denied.');
        await identity.captureAdmission(actorRequest, 'ui.presentation.view', scope)();
      },
      async admit() { principal(); await owner(); await appAdmission(); await admission(); await owner(); principal(); admitted = true; },
    };
    if (duplicating) {
      const result = await duplicateVisualPage(key, page!.metadata!.artifactId, value.name as string, value.route as string, value.expectedHash as string, { ...authority, read: async () => { principal(); await sourceAdmission!(); } });
      return { status: 201, data: { id: result.metadata!.artifactId, name: result.metadata!.name, route: result.metadata!.route, mode: result.metadata!.shellId ? 'composed' : 'plain', ...(result.metadata!.shellId ? { shellId: result.metadata!.shellId, routeId: result.metadata!.routeId } : {}), hash: result.hash, commitOutcome: 'committed' } };
    }
    if (creating) {
      const result = await createVisualPage(key, { name: value.name as string, route: value.route as string, pageMode: value.mode, shellId: value.shell }, authority);
      return { status: 201, data: { id: result.metadata!.artifactId, name: result.metadata!.name, route: result.metadata!.route, mode: result.metadata!.shellId ? 'composed' : 'plain', ...(result.metadata!.shellId ? { shellId: result.metadata!.shellId } : {}), hash: result.hash, commitOutcome: 'committed' } };
    }
    if (updating) {
      const result = await updateVisualPage(key, page!.locator, value.files as ArtifactFiles, value.expectedHash as string, authority);
      return { status: 200, data: { id: result.metadata!.artifactId, hash: result.hash, commitOutcome: 'committed' } };
    }
    await deleteVisualPage(key, page!.locator, value.expectedHash as string, authority);
    return { status: 200, data: { id: page!.metadata!.artifactId, removed: true, mode: 'os-trash', commitOutcome: 'committed' } };
  } catch (error) {
    const failure = error as { status?: number; code?: string; name?: string; message?: string; publicationOutcome?: string };
    if (failure.publicationOutcome === 'unknown' || admitted && failure.publicationOutcome !== 'not-committed') return { status: 500, data: { code: 'CLI_PAGE_OUTCOME_UNCONFIRMED', message: 'Mutation outcome is unconfirmed. Inspect authoritative Page state before any retry.', commitOutcome: 'unknown' } };
    const authorization = failure.message?.startsWith('V1_') || failure.message === 'CLI_UNAUTHENTICATED';
    const conflict = failure.status === 409 || failure.name === 'ArtifactConflictError' || failure.code === 'source.recovery-required';
    const status = authorization ? 403 : conflict ? 409 : failure.status ?? 422;
    const specific = failure.code?.startsWith('CLI_');
    return { status, data: { code: specific ? failure.code : authorization ? 'CLI_PAGE_DENIED' : conflict ? 'CLI_PAGE_CONFLICT' : 'CLI_PAGE_VALIDATION', message: specific ? failure.message : authorization ? 'Original editing authority is no longer valid.' : conflict ? 'Page source changed or requires recovery. Reload before mutating.' : 'Page candidate, route or references failed normal validation.', commitOutcome: 'not-committed' } };
  }
}
