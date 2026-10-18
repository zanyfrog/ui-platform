import http from 'node:http';
import { isolatedPreviewCode, visualPreviewRevision } from './visual-preview.js';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import crypto from 'node:crypto';
import path from 'node:path';
import { discoverApps, createApp, getApp, saveSettings, appPath, readApplicationOwnerId } from './applications.js';
import { discoverTemplates, getTemplate } from './templates.js';
import { moveToOsTrash } from './trash.js';
import { ensurePreview, stopAllPreviews, stopPreview } from './preview.js';
import { exportApp } from './exporter.js';
import { appendHistory } from './history.js';
import { startWorkspaceWatcher } from './watcher.js';
import { startApplicationArtifactWatchers } from './artifact-watcher.js';
import { ArtifactEditorWorkspace } from './artifact-editor.js';
import { ArtifactEditorSecurity } from './editor-security.js';
import { editorSecurityConfig } from './editor-security-config.js';
import { appsDir, runtimeDir } from './paths.js';
import { deletePageSource, getPageSource, getPageTree, movePageSource, savePageSource } from './page-builder.js';
import { discoverComponents, getAppPackageAsset } from './component-registry.js';
import { disableAppPackage, enableAppPackage, getAppPackageCatalog, getGlobalPackageCatalog } from './packages.js';
import { installManualPackage } from './package-installer.js';
import { addAppFoundationDependencies, getAppFoundationDependencies, installGitHubFoundationSource, listFoundationSources, migrateFoundationSourceUpdate, previewFoundationSourceUpdate, refreshFoundationSource } from './foundation-sources.js';
import { getUnifiedPackageCatalog, removeUnusedFoundationSource } from './unified-package-catalog.js';
import { acquirePackageFromUrl } from './package-acquisition.js';
import { getActivePresentationCss, getApplicationPresentation, getDraftPresentationCss, getPresentationAssetPath, initializeApplicationPresentation, publishPresentation, removePresentationAsset, rollbackPresentation, savePresentationDraft, uploadPresentationAsset } from './application-presentation.js';
import { createApplicationDataProxy } from './application-data-proxy.js';
import { V1DevelopmentIdentity } from './v1-development-identity.js';
import { V1_FIXTURE_APPLICATION_KEY, developmentUsers } from './v1-development-policy.js';
import { V1_AUTHORITY_ID, V1_FIXTURE_APPLICATION_ID } from './v1-development-policy.js';
import { managementCheck } from './v1-management-routes.js';
import { ensureV1DevelopmentApplication } from './v1-development-app.js';
import { VisualArtifactService, knownVisualArtifacts, platformComponentsRoot, visualWorkspace } from './visual-artifacts.js';
import { compileVisualFunctions } from '@ui-platform/artifacts';
import { build as bundleBrowserModule } from 'esbuild';
import { AutomationStore } from './automation-store.js';
import { platformRoot } from './paths.js';
import { regions, primaryRouteSignature } from '@ui-platform/visual-artifacts';
import { withApplicationMutation } from './composition-lock.js';
import { prepareVisualCandidate, VisualCandidateError } from './visual-candidate.js';
import { applyTemplateUpdate, compareTemplate } from './template-updates.js';
import { assertShellUnused, changePageShell, compositionAssetInfo, compositionSourceChoices, compositionSettings, compositionSourcePath, compositionWorkspace, readCompositionSource, saveCompositionAsset, saveCompositionSource, validateCompositionEdit } from './application-composition.js';

import { DevelopmentApplicationRegistry } from './development-application-registry.js';
import { DevelopmentApplicationRuntime } from './development-application-runtime.js';
import { createBuilderWorkspaceHandler } from './builder-workspace.js';
import { DatasetDevelopment } from './dataset-development.js';
import { FormSubmissionTesting } from './form-submission-testing.js';
const port = Number(process.env.UI_PLATFORM_API_PORT ?? 4090);
const builderWp0Enabled = process.env.UI_PLATFORM_BUILDER_WP0 === '1';
const v1Enabled = process.env.UI_PLATFORM_V1_DEVELOPMENT_IDENTITY === '1';
if (builderWp0Enabled && (!v1Enabled || process.env.NODE_ENV !== 'development' || !import.meta.url.endsWith('.ts'))) throw new Error('BUILDER_WP0_DEVELOPMENT_ONLY');
const developmentApplications = builderWp0Enabled ? new DevelopmentApplicationRegistry(path.join(runtimeDir, 'development-applications.sqlite'), appsDir) : undefined;
const v1PolicyStorePath = path.resolve(process.env.UI_PLATFORM_V1_POLICY_STORE ?? path.join(runtimeDir, 'iam-v1-development.sqlite'));
const v1Identity = v1Enabled ? new V1DevelopmentIdentity({ enabled: true, environment: process.env.NODE_ENV ?? '',
  developmentRuntime: import.meta.url.endsWith('.ts'), policyStorePath: v1PolicyStorePath, applicationRegistry: developmentApplications,
  origins: [port, Number(process.env.UI_PLATFORM_UI_PORT ?? 5174)].flatMap(value => [`http://localhost:${value}`, `http://127.0.0.1:${value}`]) }) : null;
const developmentRuntime = developmentApplications && v1Identity ? new DevelopmentApplicationRuntime(process.env.UI_PLATFORM_BUILDER_HOSTS_FILE,
  v1PolicyStorePath, developmentApplications, v1Identity, [port, Number(process.env.UI_PLATFORM_UI_PORT ?? 5174)].flatMap(value => [`http://localhost:${value}`, `http://127.0.0.1:${value}`])) : undefined;
if (developmentRuntime) v1Identity!.setRuntimeReadiness((applicationId, req) => developmentRuntime.readiness(applicationId, req));
if (v1Identity) await ensureV1DevelopmentApplication(appsDir);
const applicationData = createApplicationDataProxy({ enabled: process.env.UI_PLATFORM_WP5_APPLICATION_DATA === '1',
  environment: process.env.NODE_ENV ?? '', protectedHostUrl: process.env.UI_PLATFORM_WP5_DATASET_HOST_URL,
  v1Identity: v1Identity && process.env.UI_PLATFORM_WP5_APPLICATION_DATA === '1' ? {
    resolveUser: request => v1Identity.currentUser(request),
    policyDigest: () => v1Identity.policyDigest(),
    trustedUiServerKey: process.env.UI_PLATFORM_V1_TRUSTED_UI_KEY ?? '',
    applicationId: V1_FIXTURE_APPLICATION_ID, authorityId: V1_AUTHORITY_ID,
    origins: [port, Number(process.env.UI_PLATFORM_UI_PORT ?? 5174)].flatMap(value => [`http://localhost:${value}`, `http://127.0.0.1:${value}`]),
  } : undefined });
const editorSettings = v1Identity ? { enabled: true, fixtures: developmentUsers.map(user => ({ subjectId: user.id, label: user.email,
  roleIds: [], applicationKeys: [V1_FIXTURE_APPLICATION_KEY], isDevelopmentFixture: true })), ownership: {} } : await editorSecurityConfig();
const wp1Module = editorSettings.enabled && process.env.NODE_ENV === 'development' && import.meta.url.endsWith('.ts')
  ? await import('@ui-platform/i-am/definitions') : null;
const wp1Store = wp1Module ? new wp1Module.SecurityDefinitionStore(v1Identity ? v1PolicyStorePath : path.join(runtimeDir, 'iam-wp1-development.sqlite')) : null;
const wp1Service = wp1Store && wp1Module ? new wp1Module.SecurityDefinitionService(wp1Store) : null;
const editorSecurity = new ArtifactEditorSecurity({
  ...editorSettings,
  environment: process.env.NODE_ENV ?? '',
  developmentRuntime: import.meta.url.endsWith('.ts'),
  origins: [port, Number(process.env.UI_PLATFORM_UI_PORT ?? 5174)].flatMap(value => [`http://localhost:${value}`, `http://127.0.0.1:${value}`]),
  workspace: async key => { await getApp(key); return editorWorkspace(appPath(key)); },
  securityDefinitions: v1Identity ? undefined : wp1Service ?? undefined,
  trustedDevelopmentUser: v1Identity ? request => v1Identity.currentUser(request) : undefined,
  authorizer: v1Identity ? { can: (principal, operation, scope) => v1Identity.authorizeEditor(principal.subjectId, operation, scope) } : undefined,
  audit: event => console.info('artifact-editor-security', JSON.stringify(event)),
});
const editorWorkspaces = new Map<string, ArtifactEditorWorkspace>();
const builderWorkspace = v1Identity ? createBuilderWorkspaceHandler(v1Identity, editorSecurity) : undefined;
const datasetDevelopment = developmentApplications && developmentRuntime && v1Identity ? new DatasetDevelopment({
  root: path.join(runtimeDir, 'builder-datasets'), policyStore: v1PolicyStorePath,
  registryFile: path.join(runtimeDir, 'development-applications.sqlite'), applicationsRoot: appsDir,
  identity: v1Identity, security: editorSecurity, registry: developmentApplications, runtime: developmentRuntime,
  workspace: key => editorWorkspace(appPath(key)),
}) : undefined;
const formTesting = developmentApplications && v1Identity ? new FormSubmissionTesting({ root: path.join(runtimeDir, 'form-submission-tests'), datasetsRoot: path.join(runtimeDir, 'builder-datasets'), policyStore: v1PolicyStorePath,
  registry: developmentApplications, identity: v1Identity, security: editorSecurity, origins: [port, Number(process.env.UI_PLATFORM_UI_PORT ?? 5174)].flatMap(value => [`http://localhost:${value}`, `http://127.0.0.1:${value}`]) }) : undefined;
function editorWorkspace(root: string) {
  let workspace = editorWorkspaces.get(root);
  if (!workspace) {
    workspace = new ArtifactEditorWorkspace(root, path.basename(root), event => {
      editorSecurity.publish(event);
    }, undefined, console.error, wp1Service && wp1Module ? {
      stage: (text, actorId) => {
        const parsed = wp1Module.parseSecurityDocument(text);
        const old = parsed.document && wp1Service.active().find(doc => doc.definition.id === parsed.document!.definition.id);
        return wp1Service.stageText({ text, expectedChecksum: old && wp1Module.securityChecksum(old), source: 'ui', actorId, idempotencyKey: crypto.randomUUID(), expectedRevision: wp1Service.revision() });
      },
    } : undefined);
    editorWorkspaces.set(root, workspace);
  }
  return workspace;
}

function json(res: http.ServerResponse, status: number, value: unknown): void {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(value));
}

async function body(req: http.IncomingMessage): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = Buffer.from(chunk);
    size += buffer.length;
    if (size > 100 * 1024 * 1024) throw new Error('Package upload exceeds the 100 MB limit.');
    chunks.push(buffer);
  }
  if (!chunks.length) return {};
  const value = Buffer.concat(chunks);
  const contentType = req.headers['content-type'] ?? '';
  if (contentType.startsWith('multipart/form-data')) return parseMultipart(value, contentType);
  return JSON.parse(value.toString('utf8'));
}

interface UploadedFile { name: string; filename: string; content: Buffer; }
interface MultipartBody { fields: Record<string, string>; files: Record<string, UploadedFile>; }

function parseMultipart(payload: Buffer, contentType: string): MultipartBody {
  const boundary = /boundary=(?:"([^"]+)"|([^;\s]+))/.exec(contentType)?.[1] ?? /boundary=(?:"([^"]+)"|([^;\s]+))/.exec(contentType)?.[2];
  if (!boundary) throw new Error('Package upload is missing a multipart boundary.');
  const marker = Buffer.from('--' + boundary);
  const separator = Buffer.from('\r\n\r\n');
  const result: MultipartBody = { fields: {}, files: {} };
  let start = payload.indexOf(marker) + marker.length;
  while (start >= marker.length && start < payload.length) {
    if (payload.subarray(start, start + 2).equals(Buffer.from('--'))) break;
    if (payload.subarray(start, start + 2).equals(Buffer.from('\r\n'))) start += 2;
    const headersEnd = payload.indexOf(separator, start);
    if (headersEnd < 0) break;
    const headers = payload.subarray(start, headersEnd).toString('utf8');
    const next = payload.indexOf(marker, headersEnd + separator.length);
    if (next < 0) break;
    const content = payload.subarray(headersEnd + separator.length, next - 2);
    const disposition = /content-disposition:\s*form-data;\s*name="([^"]+)"(?:;\s*filename="([^"]*)")?/i.exec(headers);
    if (disposition) {
      const [, name, filename] = disposition;
      if (filename) result.files[name] = { name, filename: path.basename(filename), content };
      else result.fields[name] = content.toString('utf8');
    }
    start = next + marker.length;
  }
  return result;
}

async function acquirePackage(input: MultipartBody | Record<string, unknown>, scope: 'platform' | 'app', appKey?: string): Promise<unknown> {
  const multipart = isMultipartBody(input) ? input : null;
  const sourceUrl = String(multipart ? multipart.fields.sourceUrl ?? '' : (input as Record<string, unknown>).sourceUrl ?? '').trim();
  const uploaded = multipart?.files.packageFile;
  if (uploaded?.content.length) {
    const uploadRoot = path.join(runtimeDir, 'package-uploads', crypto.randomUUID());
    const uploadPath = path.join(uploadRoot, uploaded.filename || 'package-upload.zip');
    await mkdir(uploadRoot, { recursive: true });
    try {
      await writeFile(uploadPath, uploaded.content);
      return { kind: 'package', package: await installManualPackage({ sourcePath: uploadPath, scope, appKey }) };
    } finally {
      await rm(uploadRoot, { recursive: true, force: true });
    }
  }
  if (!sourceUrl) throw new Error('Upload a package archive or provide a GitHub or npm URL.');
  return acquirePackageFromUrl(sourceUrl, { scope, appKey });
}

function isMultipartBody(input: MultipartBody | Record<string, unknown>): input is MultipartBody {
  return 'fields' in input && 'files' in input && typeof input.fields === 'object' && input.fields !== null && typeof input.files === 'object' && input.files !== null;
}

function error(res: http.ServerResponse, err: unknown): void {
  console.error(err);
  const failure = err as { status?: number; code?: string; message?: string; name?: string; committed?: string[]; recoveryRequired?: boolean };
  const authority = failure.message?.startsWith('V1_');
  const status = failure.status ?? (authority ? 403 : failure.code === 'source.recovery-required' || failure.name === 'ArtifactConflictError' ? 409 : 500);
  json(res, status, { error: authority ? 'Original editing authority is no longer valid.' : failure.message ?? String(err), code: failure.code ?? (authority ? 'editor.authority-revoked' : undefined), ...(!authority && failure.committed ? { committed: failure.committed, recoveryRequired: !!failure.recoveryRequired } : {}) });
}

function appInfoPayload(req: http.IncomingMessage, url: URL, app: Awaited<ReturnType<typeof getApp>>): Record<string, string> {
  const origin = url.searchParams.get('origin') || `http://${req.headers.host ?? `localhost:${port}`}`;
  const fullUrl = `${origin.replace(/\/$/, '')}/${app.key}`;
  const settings = app.settings as any;
  return {
    name: app.name || 'Not set',
    description: String(settings?.ui?.description || 'Not set'),
    siteTitle: String(settings?.ui?.title || app.name || 'Not set'),
    fullUrl,
    status: app.status,
    contactEmail: String(settings?.settings?.contactEmail || 'Not set'),
    theme: String(settings?.ui?.theme || 'Not set'),
  };
}

await mkdir(path.join(runtimeDir, 'exports'), { recursive: true });
const v1Exports = new Map<string, { userId: string; applicationId: string; expires: number }>();

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const parts = url.pathname.split('/').filter(Boolean);
  let admitManagement = async () => {};
  try {
    if (v1Identity && await v1Identity.handle(req, res)) return;
    if (v1Identity && await v1Identity.handleAdministration(req, res)) return;
    if (developmentRuntime && await developmentRuntime.handle(req, res)) return;
    if (await applicationData(req, res)) return;
    if (await editorSecurity.handle(req, res)) return;
    if (datasetDevelopment && await datasetDevelopment.handle(req, res)) return;
    if (formTesting && await formTesting.handle(req, res)) return;
    if (builderWorkspace && await builderWorkspace(req, res)) return;
    if (v1Identity && url.pathname.startsWith('/api/') && url.pathname !== '/api/health') {
      const publicRead = method === 'GET' && (['/api/templates', '/api/components'].includes(url.pathname) ||
        parts[1] === 'apps' && parts[2] && (parts[3] === 'package-assets' || parts[3] === 'app-services' ||
          parts[3] === 'presentation' && (parts[4] === 'active.css' || parts[4] === 'assets')));
      if (!publicRead) {
        let userId: string | null;
        try { userId = v1Identity.currentUser(req); } catch { return json(res, 403, { code: 'V1_IDENTITY_UNAVAILABLE' }); }
        if (!userId) return json(res, 401, { code: 'V1_LOGIN_REQUIRED' });
        if (!['GET', 'HEAD'].includes(method) && ![port, Number(process.env.UI_PLATFORM_UI_PORT ?? 5174)]
          .flatMap(value => [`http://localhost:${value}`, `http://127.0.0.1:${value}`]).includes(String(req.headers.origin ?? '')))
          return json(res, 403, { code: 'V1_ORIGIN_DENIED' });
        if (url.pathname === '/api/apps' && method === 'GET') {
          const visible = [];
          for (const app of await discoverApps()) if ((app.key === V1_FIXTURE_APPLICATION_KEY && app.appId === V1_FIXTURE_APPLICATION_ID || v1Identity.registeredApplication(app.key) === app.appId) &&
            await v1Identity.authorize(req, 'ui.application.view', { authorityId: 'ui-platform-development', applicationId: app.appId,
              kind: 'application', id: app.appId })) visible.push(app);
          return json(res, 200, visible);
        }
        if (parts[1] === 'downloads' && method === 'GET' && parts[2]) {
          const exportRecord = v1Exports.get(path.basename(decodeURIComponent(parts[2])));
          if (!exportRecord || exportRecord.userId !== userId || exportRecord.expires <= Date.now() ||
              !await v1Identity.authorize(req, 'ui.application.view', { authorityId: 'ui-platform-development',
                applicationId: exportRecord.applicationId, kind: 'application', id: exportRecord.applicationId }))
            return json(res, 403, { code: 'V1_PERMISSION_DENIED' });
        } else {
          let applicationId: string | undefined;
          if (parts[1] === 'apps' && parts[2]) {
            const key = decodeURIComponent(parts[2]);
            const appId = await readApplicationOwnerId(key);
            if (!(key === V1_FIXTURE_APPLICATION_KEY && appId === V1_FIXTURE_APPLICATION_ID) && v1Identity.registeredApplication(key) !== appId) return json(res, 403, { code: 'V1_APPLICATION_DENIED' });
            applicationId = appId;
          }
          const check = managementCheck(method, url.pathname, applicationId);
          if (!check || !await v1Identity.authorize(req, check.permissionId, check.resource))
            return json(res, 403, { code: 'V1_PERMISSION_DENIED' });
          const authority = v1Identity.captureAdmission(req, check.permissionId, check.resource), originalApplicationId = applicationId;
          admitManagement = async () => {
            if (originalApplicationId && parts[1] === 'apps' && await readApplicationOwnerId(decodeURIComponent(parts[2])) !== originalApplicationId) throw new Error('V1_ORIGINAL_OWNER_CHANGED');
            await authority();
            if (originalApplicationId && parts[1] === 'apps' && await readApplicationOwnerId(decodeURIComponent(parts[2])) !== originalApplicationId) throw new Error('V1_ORIGINAL_OWNER_CHANGED');
          };
        }
      }
    }
    if (url.pathname === '/api/health') return json(res, 200, { ok: true });
    if (parts[0] === 'api' && parts[1] === 'apps' && parts[3] === 'automation-catalog' && parts.length === 4 && method === 'GET') {
      if (!developmentRuntime) return json(res, 403, { error: 'Protected normal host required.' });
      const owner = await readApplicationOwnerId(decodeURIComponent(parts[2]));
      return json(res, 200, await developmentRuntime.authoringCatalog(owner, req));
    }
    if (url.pathname === '/api/automation/catalog' && method === 'GET') {
      if (!developmentRuntime) return json(res, 403, { error: 'Protected normal host required.' });
      return json(res, 200, await developmentRuntime.authoringCatalog(url.searchParams.get('applicationId') ?? '', req));
    }
    if (parts[0] === 'api' && parts[1] === 'automation' && ['triggers', 'workflows'].includes(parts[2]) && parts.length === 3) {
      // Platform-wide authoring requires the existing trusted development session and system permission.
      if (!v1Identity) return json(res, 403, { error: 'Trusted Platform management identity required.' });
      const kind = parts[2] === 'triggers' ? 'trigger' : 'workflow';
      const store = new AutomationStore(path.join(platformRoot, parts[2]), kind);
      const locator = url.searchParams.get('locator');
      if (method === 'GET') return json(res, 200, locator ? await store.read(locator) : await store.list());
      const input = await body(req);
      if (method === 'POST') return json(res, 201, await store.create(String(input.name ?? ''), input.definition, admitManagement));
      if (!locator) throw new Error('Artifact locator is required.');
      if (method === 'PUT') { if (input.mode === 'normal' && editorSecurity.enabled) editorSecurity.workspacePrincipal(req, true); return json(res, 200, await store.save(locator, input.source, input.expectedHash, async () => { if (input.mode === 'normal' && editorSecurity.enabled) editorSecurity.workspacePrincipal(req, true); await admitManagement(); })); }
      if (method === 'DELETE') {
        const other = await new AutomationStore(path.join(platformRoot, kind === 'trigger' ? 'workflows' : 'triggers'), kind === 'trigger' ? 'workflow' : 'trigger').list();
        const local = (await store.list()).filter(b => b.locator !== locator);
        const visual = await knownVisualArtifacts();
        await store.remove(locator, input.expectedHash, [...other, ...local].map(b => ({ name: b.locator, source: b.source })).concat(visual.map(b => ({ name: b.locator, source: b.files.metadata + b.files.code }))));
        return json(res, 200, { removed: true });
      }
      throw new Error('Unsupported automation request.');
    }
    if (url.pathname === '/api/templates' && method === 'GET') return json(res, 200, await discoverTemplates());
    if (url.pathname === '/api/apps' && method === 'GET') return json(res, 200, await discoverApps());
    if (url.pathname === '/api/apps' && method === 'POST') {
      const admittedUser = v1Identity?.currentUser(req);
      const application = await createApp(await body(req));
      if (developmentApplications) developmentApplications.registerCreated(application, admittedUser!);
      return json(res, 201, application);
    }
    if (url.pathname === '/api/components' && method === 'GET') return json(res, 200, await discoverComponents());
    if (url.pathname === '/api/packages' && method === 'GET') return json(res, 200, await getGlobalPackageCatalog());
    if (url.pathname === '/api/package-catalog' && method === 'GET') return json(res, 200, await getUnifiedPackageCatalog());
    if (url.pathname === '/api/packages/install' && method === 'POST') {
      const input = await body(req);
      return json(res, 201, await installManualPackage({ sourcePath: String(input.sourcePath ?? ''), scope: 'platform' }));
    }
    if (url.pathname === '/api/packages/acquire' && method === 'POST') return json(res, 201, await acquirePackage(await body(req), 'platform'));
    if (url.pathname === '/api/foundation-sources' && method === 'GET') return json(res, 200, await listFoundationSources());
    if (url.pathname === '/api/foundation-sources/github' && method === 'POST') {
      const input = await body(req);
      return json(res, 201, await installGitHubFoundationSource({ repository: String(input.repository ?? ''), ref: input.ref ? String(input.ref) : undefined }));
    }
    if (parts[0] === 'api' && parts[1] === 'foundation-sources' && parts[2] && parts.length === 4 && parts[3] === 'refresh' && method === 'POST') {
      return json(res, 200, await refreshFoundationSource(decodeURIComponent(parts[2])));
    }
    if (parts[0] === 'api' && parts[1] === 'foundation-sources' && parts[2] && parts.length === 4 && parts[3] === 'update-preview' && method === 'POST') {
      const input = await body(req);
      return json(res, 200, await previewFoundationSourceUpdate(decodeURIComponent(parts[2]), input.ref ? String(input.ref) : undefined));
    }
    if (parts[0] === 'api' && parts[1] === 'foundation-sources' && parts[2] && parts.length === 4 && parts[3] === 'migrations' && method === 'POST') {
      const input = await body(req);
      const appKeys = Array.isArray(input.appKeys) ? input.appKeys.map((value: unknown) => String(value)) : [];
      return json(res, 200, await migrateFoundationSourceUpdate(String(input.planId ?? ''), appKeys));
    }
    if (parts[0] === 'api' && parts[1] === 'foundation-sources' && parts[2] && parts.length === 3 && method === 'DELETE') {
      await removeUnusedFoundationSource(decodeURIComponent(parts[2]));
      return json(res, 200, { removed: true });
    }

    if (parts[0] === 'api' && parts[1] === 'apps' && parts[2]) {
      const key = decodeURIComponent(parts[2]);
      const expectedOwner = req.headers['x-editor-application-id'];
      if (expectedOwner !== undefined) {
        const originalAdmission = admitManagement;
        const owner = async () => { if (typeof expectedOwner !== 'string' || await readApplicationOwnerId(key) !== expectedOwner) throw Object.assign(new Error('The original Application owner changed. Recover before continuing.'), { status: 409, code: 'editor.owner-changed' }); };
        await owner(); admitManagement = async () => { await owner(); await originalAdmission(); await owner(); };
      }
      if (parts.length === 4 && parts[3] === 'composition-asset' && method === 'POST') {
        const input = await body(req); if (!isMultipartBody(input) || !input.files.asset) throw new Error('Upload an asset file.');
        return json(res, 201, await saveCompositionAsset(key, String(input.fields.path ?? ''), input.files.asset.content, input.fields.expectedHash || null, admitManagement));
      }
      if (parts.length === 4 && parts[3] === 'composition-asset' && method === 'GET') {
        if (url.searchParams.get('list') === '1') return json(res, 200, await compositionSourceChoices(key));
        const relative = url.searchParams.get('path') ?? ''; if (!relative.startsWith('assets/')) throw new Error('Application asset path required.');
        if (url.searchParams.get('info') === '1') return json(res, 200, await compositionAssetInfo(key, relative));
        const file = await compositionSourcePath(key, relative), content = await readFile(file);
        const types: Record<string, string> = { '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.txt': 'text/plain' };
        res.writeHead(200, { 'content-type': types[path.extname(file)] ?? 'application/octet-stream', 'cache-control': 'no-store' }); return res.end(content);
      }
      if (parts.length === 4 && parts[3] === 'composition') {
        if (method === 'GET') return json(res, 200, await compositionWorkspace(key, await discoverComponents(key)));
      }
      if (parts.length === 4 && parts[3] === 'composition-source') {
        const file = url.searchParams.get('path'); if (!file) throw new Error('Source path is required.');
        if (method === 'GET') return json(res, 200, await readCompositionSource(key, file));
        if (method === 'PUT') { const input = await body(req); if (input.mode === 'normal' && editorSecurity.enabled) editorSecurity.workspacePrincipal(req, true); return json(res, 200, await saveCompositionSource(key, file, input.content, input.expectedHash, async () => { if (input.mode === 'normal' && editorSecurity.enabled) editorSecurity.workspacePrincipal(req, true); await admitManagement(); })); }
      }
      if (parts.length === 4 && parts[3] === 'page-shell' && method === 'POST') {
        const input = await body(req); return json(res, 200, await changePageShell(key, input.locator, input.shellId, input.decisions ?? {}, input.expectedHash, admitManagement));
      }
      if (parts.length === 4 && parts[3] === 'template-update') {
        const app = await getApp(key), template = await getTemplate(app.template);
        if (method === 'GET') return json(res, 200, await compareTemplate(appPath(key), path.join(template.folder, 'files'), template.definition.id, template.definition.version));
        if (method === 'POST') { const input = await body(req); return json(res, 200, await applyTemplateUpdate(appPath(key), path.join(template.folder, 'files'), template.definition.id, template.definition.version, input.expectedHash, input.decisions, { packages: await discoverComponents(key), admit: admitManagement })); }
      }
      if (parts.length === 4 && ['visual-artifacts', 'visual-pages', 'visual-components', 'visual-shells'].includes(parts[3])) {
        await getApp(key);
        if (parts[3] === 'visual-artifacts' && method === 'GET') {
          return json(res, 200, await withApplicationMutation(appPath(key), async () => visualWorkspace(key, await discoverComponents(key))));
        }
        const kind = parts[3] === 'visual-components' ? 'component' : parts[3] === 'visual-shells' ? 'shell' : 'page';
        const service = new VisualArtifactService(kind === 'component' ? platformComponentsRoot : path.join(appPath(key), kind === 'shell' ? 'shells' : 'src/pages'), kind);
        const locator = url.searchParams.get('locator');
        if (parts[3] === 'visual-artifacts') throw new Error('The workspace endpoint supports GET only.');
        if (method === 'GET') {
          if (locator && url.searchParams.get('preview') === '1') {
            const owner = (await getApp(key)).appId;
            return json(res, 200, await visualPreviewRevision(key, kind, locator, url.searchParams.get('hash') ?? '', async related => {
              if (v1Identity && !await v1Identity.authorize(req, related === 'shell' ? 'ui.presentation.view' : 'ui.application.view', { authorityId: 'ui-platform-development', applicationId: owner, kind: related === 'shell' ? 'artifact' : 'application', id: related === 'shell' ? 'presentation' : owner, ...(related === 'shell' ? { parentId: owner } : {}) })) throw Object.assign(new Error('Preview dependencies require current source read authority.'), { status: 403 });
            }));
          }
          const bundle = locator ? await service.read(locator) : null;
          if (bundle && url.searchParams.get('code') === '1') {
            if (url.searchParams.get('hash') !== bundle.hash) throw Object.assign(new Error('Preview code revision changed. Reload the complete preview.'), { status: 409 });
            const code = isolatedPreviewCode(bundle);
            res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }); return res.end(code);
          }
          return json(res, 200, bundle ?? await service.list());
        }
        const input = await body(req);
        if (method === 'POST') return await withApplicationMutation(appPath(key), async () => {
          const composition = await compositionSettings(key);
          const shellId = kind === 'page' && composition ? input.shellId || composition.defaultShellId : undefined;
          const shell = shellId ? (await new VisualArtifactService(path.join(appPath(key), 'shells'), 'shell').list()).find(shell => shell.metadata?.artifactId === shellId) : undefined;
          if (shellId && !shell) throw new Error('Selected Shell is missing.');
          const initialRegionId = shell ? regions(shell.files.source).find(region => region.regionId === 'region-main')?.regionId ?? regions(shell.files.source)[0]?.regionId ?? null : 'region-main';
            if (kind === 'page' && composition) {
              const signature = primaryRouteSignature(input.route ?? `/${input.name}`);
              if ((await service.list()).some(page => page.metadata?.route && primaryRouteSignature(page.metadata.route) === signature)) throw new Error('A Page already owns that primary Route.');
            }
          const created = await service.create(String(input.name ?? ''), input.route, input.form ? { ...input.form, authoring: true } : undefined, shellId, initialRegionId, admitManagement);
          return json(res, 201, created);
        });
        if (!locator) throw new Error('Visual Artifact locator is required.');
        if (method === 'PUT') {
          if (input.mode === 'normal' && editorSecurity.enabled) editorSecurity.workspacePrincipal(req, true);
          return await withApplicationMutation(appPath(key), async () => {
            if (input.mode === 'normal') {
              const validation = await prepareVisualCandidate(key, kind, locator, await discoverComponents(key));
              const saved = await service.saveCandidate(locator, input.files, input.expectedHash, { validate: candidate => validation.validate(candidate), admit: async () => { await validation.recheck(); if (editorSecurity.enabled) editorSecurity.workspacePrincipal(req, true); await admitManagement(); } });
              return json(res, 200, saved);
            }
            if (input.mode !== undefined && input.mode !== 'repair') throw new VisualCandidateError('Unknown Visual save mode.');
            if (kind !== 'component') {
              if (input.files) { for (const role of ['source', 'metadata'] as const) await validateCompositionEdit(key, kind, locator, role, input.files[role]); }
              else await validateCompositionEdit(key, kind, locator, input.role, input.content);
            }
            const saved = input.files
              ? await service.saveCandidate(locator, input.files, input.expectedHash, { repair: true, admit: admitManagement })
              : await service.save(locator, input.role, input.content, input.expectedHash, admitManagement);
            return json(res, 200, saved);
          });
        }
        if (method === 'DELETE') return await withApplicationMutation(appPath(key), async () => { if (kind === 'shell') await assertShellUnused(key, (await service.read(locator)).metadata!.artifactId); await service.remove(locator, input.expectedHash, await knownVisualArtifacts(), admitManagement); return json(res, 200, { removed: true }); });
      }
      if (parts.length === 3 && method === 'GET') {
        const app = await getApp(key);
        const template = await getTemplate(app.template).catch(() => null);
        return json(res, 200, { ...app, templateDefinition: template?.definition ?? null });
      }
      if (parts.length === 4 && parts[3] === 'info' && method === 'GET') {
        const app = await getApp(key);
        return json(res, 200, appInfoPayload(req, url, app));
      }
      if (parts.length === 4 && parts[3] === 'pages' && method === 'GET') return json(res, 200, await getPageTree(key));
      if (parts.length === 4 && parts[3] === 'pages' && method === 'POST') {
        const input = await body(req);
        if (!input.source || !input.destination) throw new Error('source and destination are required.');
        return json(res, 200, await movePageSource(key, String(input.source), String(input.destination)));
      }
      if (parts.length === 4 && parts[3] === 'components' && method === 'GET') return json(res, 200, await discoverComponents(key));
      if (parts.length === 4 && parts[3] === 'presentation' && method === 'GET') return json(res, 200, await getApplicationPresentation(key));
      if (parts.length === 5 && parts[3] === 'presentation' && parts[4] === 'initialize' && method === 'POST') return json(res, 201, await initializeApplicationPresentation(key, admitManagement));
      if (parts.length === 4 && parts[3] === 'presentation' && method === 'PUT') {
        const input = await body(req), normal = input.mode === 'normal';
        if (normal && editorSecurity.enabled) editorSecurity.workspacePrincipal(req, true);
        if (normal && !input.expectedRevision) throw new VisualCandidateError('The original presentation revision is required.');
        return json(res, 200, await savePresentationDraft(key, normal ? input.value : input, normal ? input.expectedRevision : undefined, async () => { if (normal && editorSecurity.enabled) editorSecurity.workspacePrincipal(req, true); await admitManagement(); }));
      }
      if (parts.length === 5 && parts[3] === 'presentation' && parts[4] === 'publish' && method === 'POST') return json(res, 200, await publishPresentation(key, admitManagement));
      if (parts.length === 5 && parts[3] === 'presentation' && parts[4] === 'rollback' && method === 'POST') {
        const input = await body(req);
        return json(res, 200, await rollbackPresentation(key, Number(input.version), admitManagement));
      }
      if (parts.length === 5 && parts[3] === 'presentation' && parts[4] === 'active.css' && method === 'GET') {
        const css = await getActivePresentationCss(key);
        if (css === null) return json(res, 404, { error: 'No active presentation version.' });
        res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' });
        return res.end(css);
      }
      if (parts.length === 5 && parts[3] === 'presentation' && parts[4] === 'draft.css' && method === 'GET') {
        const css = await getDraftPresentationCss(key);
        if (css === null) return json(res, 404, { error: 'No presentation draft.' });
        res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store', 'access-control-allow-origin': '*' });
        return res.end(css);
      }
      if (parts.length === 5 && parts[3] === 'presentation' && parts[4] === 'assets' && method === 'POST') {
        const input = await body(req);
        if (!isMultipartBody(input) || !input.files.asset) throw new Error('Upload an asset file using the asset field.');
        const file = input.files.asset;
        return json(res, 201, await uploadPresentationAsset(key, { id: String(input.fields.id ?? ''), name: String(input.fields.name ?? ''), type: String(input.fields.type ?? 'other') as any, alt: input.fields.alt, filename: file.filename, content: file.content }));
      }
      if (parts.length === 6 && parts[3] === 'presentation' && parts[4] === 'assets' && method === 'DELETE') return json(res, 200, await removePresentationAsset(key, decodeURIComponent(parts[5])));
      if (parts.length === 6 && parts[3] === 'presentation' && parts[4] === 'assets' && method === 'GET') {
        const file = await getPresentationAssetPath(key, decodeURIComponent(parts[5]));
        const info = await stat(file);
        const extension = path.extname(file).toLowerCase();
        const contentType = extension === '.svg' ? 'image/svg+xml' : extension === '.png' ? 'image/png' : extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : extension === '.webp' ? 'image/webp' : extension === '.ico' ? 'image/x-icon' : 'application/octet-stream';
        res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store', 'content-length': String(info.size) });
        return createReadStream(file).pipe(res);
      }
      if (parts.length >= 6 && parts[3] === 'package-assets' && method === 'GET') {
        const packageName = decodeURIComponent(parts[4]);
        const modulePath = `./${decodeURIComponent(parts.slice(5).join('/'))}`;
        const asset = await getAppPackageAsset(key, packageName, modulePath);
        if (url.searchParams.get('bundle') === '1' && /\.[cm]?js$/.test(asset.filePath)) {
          const bundled = await bundleBrowserModule({ entryPoints: [asset.filePath], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
          res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store' }); return res.end(bundled.outputFiles[0].text);
        }
        const info = await stat(asset.filePath);
        const contentType = asset.filePath.endsWith('.css') ? 'text/css; charset=utf-8' : asset.filePath.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/javascript; charset=utf-8';
        res.writeHead(200, { 'content-type': contentType, 'cache-control': 'no-store', 'content-length': String(info.size) });
        return createReadStream(asset.filePath).pipe(res);
      }
      if (parts.length === 4 && parts[3] === 'packages' && method === 'GET') return json(res, 200, await getAppPackageCatalog(key));
      if (parts.length === 4 && parts[3] === 'packages' && method === 'POST') {
        const input = await body(req);
        return json(res, 201, await installManualPackage({ sourcePath: String(input.sourcePath ?? ''), scope: 'app', appKey: key }));
      }
      if (parts.length === 5 && parts[3] === 'packages' && parts[4] === 'acquire' && method === 'POST') return json(res, 201, await acquirePackage(await body(req), 'app', key));
      if (parts.length === 4 && parts[3] === 'foundation-dependencies' && method === 'POST') {
        const input = await body(req);
        const packageNames = Array.isArray(input.packageNames) ? input.packageNames.map((value: unknown) => String(value)) : [];
        return json(res, 200, await addAppFoundationDependencies({ appKey: key, sourceId: String(input.sourceId ?? ''), packageNames }));
      }
      if (parts.length === 5 && parts[3] === 'foundation-dependencies' && parts[4] && method === 'GET') {
        return json(res, 200, await getAppFoundationDependencies({ appKey: key, sourceId: decodeURIComponent(parts[4]) }));
      }
      if (parts.length === 6 && parts[3] === 'packages' && parts[5] === 'enable' && method === 'POST') {
        const input = await body(req);
        return json(res, 200, await enableAppPackage(key, decodeURIComponent(parts[4]), input.version ? String(input.version) : undefined));
      }
      if (parts.length === 6 && parts[3] === 'packages' && parts[5] === 'disable' && method === 'POST') {
        return json(res, 200, await disableAppPackage(key, decodeURIComponent(parts[4])));
      }
      if (parts.length === 4 && parts[3] === 'page' && method === 'GET') {
        const source = url.searchParams.get('source');
        if (!source) throw new Error('The source query parameter is required.');
        return json(res, 200, await getPageSource(key, source));
      }
      if (parts.length === 4 && parts[3] === 'page' && method === 'PUT') {
        const source = url.searchParams.get('source');
        if (!source) throw new Error('The source query parameter is required.');
        const input = await body(req);
        return json(res, 200, await savePageSource(key, source, String(input.source ?? ''), input.expectedHash ? String(input.expectedHash) : undefined));
      }
      if (parts.length === 4 && parts[3] === 'page' && method === 'DELETE') {
        const source = url.searchParams.get('source');
        if (!source) throw new Error('The source query parameter is required.');
        await deletePageSource(key, source);
        return json(res, 200, { removed: true, mode: 'os-trash' });
      }
      if (parts.length === 3 && method === 'DELETE') {
        await stopPreview(key);
        const app = await getApp(key);
        await appendHistory(appPath(key), { action: 'app.deleted-to-os-trash', appId: app.appId, actor: 'local-user' });
        await moveToOsTrash(appPath(key));
        return json(res, 200, { removed: true, mode: 'os-trash' });
      }
      if (parts.length === 5 && parts[3] === 'app-services' && method === 'GET') {
        const name = path.basename(decodeURIComponent(parts[4]));
        const file = path.join(appPath(key), 'packages', 'app-services', 'dist', name);
        const info = await stat(file);
        res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8', 'cache-control': 'no-store', 'content-length': String(info.size) });
        return createReadStream(file).pipe(res);
      }
      if (parts[3] === 'settings' && method === 'PUT') {
        const input = await body(req), normal = input.mode === 'normal';
        if (normal && editorSecurity.enabled) editorSecurity.workspacePrincipal(req, true);
        if (normal && !input.expectedHash) throw new VisualCandidateError('Original settings source revision is required.');
        return json(res, 200, await saveSettings(key, normal ? input.settings : input, normal ? input.expectedHash : undefined, async () => { if (normal && editorSecurity.enabled) editorSecurity.workspacePrincipal(req, true); await admitManagement(); }));
      }
      if (parts[3] === 'preview' && method === 'POST') {
        const preview = await ensurePreview(key);
        const applicationId = v1Identity?.registeredApplication(key);
        if (developmentRuntime && applicationId) {
          const browserOrigin = new URL(String(req.headers.origin));
          const previewUrl = new URL(preview.url); previewUrl.hostname = browserOrigin.hostname;
          developmentRuntime.allowPreview(applicationId, previewUrl.origin);
          return json(res, 200, { ...preview, url: previewUrl.origin });
        }
        return json(res, 200, preview);
      }
      if (parts[3] === 'export' && method === 'POST') {
        const exported = await exportApp(key);
        const token = path.basename(exported.zipFile);
        if (v1Identity) v1Exports.set(token, { userId: v1Identity.currentUser(req)!, applicationId: (await getApp(key)).appId,
          expires: Date.now() + 5 * 60_000 });
        return json(res, 200, { downloadName: exported.downloadName, url: `/api/downloads/${encodeURIComponent(token)}` });
      }
    }

    if (parts[0] === 'api' && parts[1] === 'downloads' && parts[2] && method === 'GET') {
      const name = path.basename(decodeURIComponent(parts[2]));
      const file = path.join(runtimeDir, 'exports', name);
      const info = await stat(file);
      res.writeHead(200, { 'content-type': 'application/zip', 'content-length': String(info.size), 'content-disposition': `attachment; filename="${name}"` });
      return createReadStream(file).pipe(res);
    }

    json(res, 404, { error: 'Not found' });
  } catch (err) { error(res, err); }
});

const stopWatcher = startWorkspaceWatcher(() => {
  editorSecurity.publishWorkspaceChange();
});

const artifactWatcher = editorSecurity.enabled ? await startApplicationArtifactWatchers(appsDir, () => {}, console.error, 1500, {
  get: root => editorWorkspace(root).service,
  removed: root => { editorWorkspaces.delete(root); },
  changed: (root, event) => editorWorkspace(root).changed(event),
}) : undefined;

server.listen(port, editorSecurity.enabled ? '127.0.0.1' : '0.0.0.0', () => console.log(`UI Platform API listening on http://localhost:${port}`));

async function shutdown() {
  stopWatcher();
  await artifactWatcher?.close();
  await stopAllPreviews();
  await datasetDevelopment?.close();
  await formTesting?.close();
  editorSecurity.close();
  v1Identity?.close();
  developmentApplications?.close();
  wp1Store?.close();
  server.close(() => process.exit(0));
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
