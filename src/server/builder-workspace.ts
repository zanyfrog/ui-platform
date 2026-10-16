import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { AuthorizedWorkspaceArtifact, WorkspaceArtifact, WorkspaceIdentity } from '../shared/builder-workspace.js';
import { workspaceIdentityKey } from '../shared/builder-workspace.js';
import { appPath, getApp, getApp as application } from './applications.js';
import { visualWorkspace } from './visual-artifacts.js';
import { discoverComponents } from './component-registry.js';
import { compositionWorkspace, readCompositionSource } from './application-composition.js';
import { getPageTree, getPageSource } from './page-builder.js';
import { AutomationStore } from './automation-store.js';
import { platformRoot } from './paths.js';
import type { V1DevelopmentIdentity } from './v1-development-identity.js';
import type { ArtifactEditorSecurity } from './editor-security.js';
import { V1_AUTHORITY_ID, V1_FIXTURE_APPLICATION_ID, V1_FIXTURE_APPLICATION_KEY } from './v1-development-policy.js';
import { withApplicationMutation } from './composition-lock.js';

/** Read-only orchestration over owner services. No second discovery registry. */
export function createBuilderWorkspaceHandler(identity: V1DevelopmentIdentity, security: ArtifactEditorSecurity) {
  return async (req: IncomingMessage, res: ServerResponse): Promise<boolean> => {
    const url = new URL(req.url ?? '/', 'http://localhost'), parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'api' || parts[1] !== 'apps' || parts[3] !== 'builder-workspace') return false;
    const send = (status: number, value: unknown) => res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(value));
    try {
      if (process.env.NODE_ENV !== 'development' || !import.meta.url.endsWith('.ts')) throw new Error('WORKSPACE_DEVELOPMENT_ONLY');
      security.workspacePrincipal(req, req.method === 'POST');
      return await withApplicationMutation(appPath(decodeURIComponent(parts[2])), async () => {
      const policyDigest = identity.policyDigest();
      const key = decodeURIComponent(parts[2]), app = await getApp(key);
      if (!(key === V1_FIXTURE_APPLICATION_KEY && app.appId === V1_FIXTURE_APPLICATION_ID) && identity.registeredApplication(key) !== app.appId) throw new Error('WORKSPACE_OWNER_DENIED');
      const permitted = async (permissionId: string, kind: 'application' | 'page' | 'artifact' | 'system', id = app.appId) => identity.authorize(req, permissionId,
        kind === 'system' ? { authorityId: V1_AUTHORITY_ID, applicationId: null, kind, id: 'platform' } :
          { authorityId: V1_AUTHORITY_ID, applicationId: app.appId, kind, id, ...(kind === 'application' ? {} : { parentId: app.appId }) });
      const [pages, presentation, components, automation, packages] = await Promise.all([
        permitted('ui.page.view', 'page', 'pages'), permitted('ui.presentation.view', 'artifact', 'presentation'), permitted('ui.application.view', 'application'),
        permitted('ui.platform.automation.admin', 'system'), permitted('ui.package.view', 'artifact', 'packages'),
      ]);
      const catalog = pages || presentation || components || packages ? await discoverComponents(key) : [];
      const visual = pages || presentation || components ? await visualWorkspace(key, catalog) : { pages: [], shells: [], components: [], packages: [] };
      // Filter source before it crosses the API. Dependencies remain subject to their own read permission.
      const visualContext = { pages: pages ? visual.pages : [], shells: presentation ? visual.shells : [], components: components ? visual.components : [], packages: catalog };
      const records: Array<{ summary: WorkspaceArtifact; load: () => Promise<Partial<AuthorizedWorkspaceArtifact>> }> = [];
      const add = (owner: WorkspaceIdentity['owner'], format: WorkspaceIdentity['format'], id: string | undefined, locator: string, group: string, kind: string, name: string, editable: boolean,
        load: () => Promise<Partial<AuthorizedWorkspaceArtifact>>, componentId?: string) => {
        const identity: WorkspaceIdentity = { owner, format, ...(id ? { id } : { repairLocator: locator }) };
        records.push({ summary: { identity, applicationKey: key, applicationId: app.appId, locator, group, kind, name, editable, ...(componentId ? { componentId } : {}) }, load });
      };
      for (const [kind, bundles, group, permission] of [
        ['page', visualContext.pages, 'Pages', 'ui.page.edit'], ['shell', visualContext.shells, 'Shells', 'ui.presentation.edit'], ['component', visualContext.components, 'Components and Forms', 'ui.platform.component.admin'],
      ] as const) for (const bundle of bundles) {
        const editable = await permitted(permission, kind === 'component' ? 'system' : kind === 'page' ? 'page' : 'artifact', kind === 'page' ? 'pages' : 'presentation');
        add(kind === 'component' ? { kind: 'platform', id: V1_AUTHORITY_ID } : { kind: 'application', id: app.appId }, 'visual', bundle.metadata?.artifactId,
          bundle.locator, group, kind, bundle.metadata?.displayName ?? 'Visual source needing repair', editable, async () => ({ visual: visualContext }), bundle.metadata?.componentId);
      }
      const generic = await security.workspaceArtifacts(req, key);
      for (const entry of generic) {
        const artifact = await security.workspaceArtifact(req, key, entry.locator);
        const kind = entry.artifactType ?? 'repair';
        // Generic bundles belong to their authoritative Application workspace root.
        // A Platform-only administration requirement is not a shared definition registry.
        add({ kind: 'application', id: app.appId }, 'generic', entry.artifactId, entry.locator,
          kind === 'dataset' || kind === 'schema' ? 'Datasets' : kind === 'workflow' ? 'Workflows' : kind === 'trigger' ? 'Triggers' : 'Other artifacts', kind,
          entry.name ?? 'Artifact needing repair', artifact.capabilities.edit, async () => ({ generic: artifact }));
      }
      if (presentation) {
        const composition = await compositionWorkspace(key, catalog).catch(() => null);
        if (composition) {
          composition.pages = pages ? composition.pages : [];
          for (const menu of composition.menus) if (menu.sourcePath) add({ kind: 'application', id: app.appId }, 'composition', menu.menuId, menu.sourcePath, 'Menus', 'menu', menu.name,
            await permitted('ui.presentation.edit', 'artifact', 'presentation'), async () => ({ composition, source: await readCompositionSource(key, menu.sourcePath!) }));
          add({ kind: 'application', id: app.appId }, 'composition', 'application-presentation-settings', 'app.settings.json', 'Application presentation/settings', 'settings', 'Application presentation/settings',
            await permitted('ui.presentation.edit', 'artifact', 'presentation'), async () => ({ composition, source: await readCompositionSource(key, 'app.settings.json') }));
          for (const style of composition.settings.siteStyles) add({ kind: 'application', id: app.appId }, 'composition', undefined, style, 'Application presentation/settings', 'style', style,
            await permitted('ui.presentation.edit', 'artifact', 'presentation'), async () => ({ composition, source: await readCompositionSource(key, style) }));
        }
      }
      if (automation) for (const kind of ['workflow', 'trigger'] as const) {
        const store = new AutomationStore(path.join(platformRoot, `${kind}s`), kind);
        for (const bundle of await store.list()) if (bundle.definition?.appId === app.appId) add({ kind: 'platform', id: V1_AUTHORITY_ID }, 'automation', bundle.definition.id,
          bundle.locator, kind === 'workflow' ? 'Workflows' : 'Triggers', kind, bundle.definition.displayName, true, async () => ({ automation: bundle }));
      }
      if (packages) for (const pkg of catalog) add({ kind: 'package', id: pkg.packageName, revision: pkg.packageVersion }, 'package', pkg.definition?.identity.componentId,
        pkg.id, 'Components and Forms', 'package', pkg.name ?? pkg.tagName, false, async () => ({ package: pkg }));
      if (pages) {
        const tree = await getPageTree(key);
        for (const page of tree.pages) if (!visualContext.pages.some(b => page.source.startsWith('src/pages/' + path.posix.dirname(b.locator) + '/'))) add({ kind: 'application', id: app.appId }, 'legacy', undefined,
          page.source, 'Pages', 'legacy', `${page.label} (source inspection)`, false, async () => ({ legacy: await getPageSource(key, page.source) }));
      }
      const unique = new Map<string, typeof records>();
      for (const item of records) { const id = workspaceIdentityKey(item.summary.identity); unique.set(id, [...unique.get(id) ?? [], item]); }
      const valid = [...unique.values()].filter(items => items.length === 1).map(items => items[0]);
      security.workspacePrincipal(req, req.method === 'POST');
      if (identity.policyDigest() !== policyDigest) throw new Error('WORKSPACE_AUTHORITY_CHANGED');
      if (req.method === 'GET' && parts.length === 4) { send(200, valid.map(item => item.summary)); return true; }
      if (req.method !== 'POST' || parts.length !== 5 || parts[4] !== 'authorize') throw new Error('WORKSPACE_REQUEST_INVALID');
      let text = ''; for await (const chunk of req) { text += chunk; if (text.length > 16000) throw new Error('WORKSPACE_REQUEST_INVALID'); }
      const target = JSON.parse(text), wanted = workspaceIdentityKey(target.identity);
      const item = valid.find(item => workspaceIdentityKey(item.summary.identity) === wanted);
      if (!item) throw new Error('WORKSPACE_TARGET_DENIED');
      const payload = await item.load();
      security.workspacePrincipal(req, true);
      if (identity.policyDigest() !== policyDigest) throw new Error('WORKSPACE_AUTHORITY_CHANGED');
      // Owner identity is checked again after asynchronous reads.
      if ((await application(key)).appId !== app.appId || key !== V1_FIXTURE_APPLICATION_KEY && identity.registeredApplication(key) !== app.appId) throw new Error('WORKSPACE_OWNER_CHANGED');
      send(200, { ...item.summary, ...payload }); return true;
      });
    } catch (error) {
      if (error instanceof Error && error.message === 'Artifact is locked by another writer.') {
        send(503, { code: 'WORKSPACE_SOURCE_BUSY', error: 'Source is busy. Authorization has not completed; retry the read.' }); return true;
      }
      send(403, { code: 'WORKSPACE_TARGET_DENIED', error: 'Workspace access denied. Refresh authorization or recover under the original identity.' }); return true;
    }
  };
}
