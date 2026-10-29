import path from 'node:path';
import { randomBytes, randomUUID } from 'node:crypto';
import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { bootstrapDevelopmentDataset, inspectDevelopmentDataset } from '@ui-platform/dataset-operations';
import { createBuilderDevelopmentHost, type BuilderDevelopmentHostConfig } from './builder-development-host.js';
import { createApplicationDataProxy } from './application-data-proxy.js';
import type { ArtifactEditorSecurity } from './editor-security.js';
import type { V1DevelopmentIdentity } from './v1-development-identity.js';
import type { DevelopmentApplicationRegistry } from './development-application-registry.js';
import { V1_AUTHORITY_ID } from './v1-development-policy.js';
import { VisualArtifactService, platformComponentsRoot } from './visual-artifacts.js';

type TestHost = { userId: string; applicationId: string; key: string; datasetId: string; formId: string; server: Server; host: ReturnType<typeof createBuilderDevelopmentHost>; config: BuilderDevelopmentHostConfig; hostUrl: string };
/** Bounded explicit Form test target. Reuses bootstrap/DOE/ORM; never connects to the normal Application runtime. */
export class FormSubmissionTesting {
  private readonly hosts = new Map<string, TestHost>();
  constructor(private readonly options: { root: string; datasetsRoot: string; policyStore: string; registry: DevelopmentApplicationRegistry; identity: V1DevelopmentIdentity; security: ArtifactEditorSecurity; origins: string[] }) {}
  private async end(id: string) { const entry = this.hosts.get(id); if (!entry) return; this.hosts.delete(id); await new Promise<void>(resolve => entry.server.close(() => resolve())); entry.host.close(); }
  async close() { await Promise.all([...this.hosts.keys()].map(id => this.end(id))); }
  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? '/', 'http://localhost'), match = /^\/api\/apps\/([^/]+)\/form-tests\/(start|end|([a-f0-9-]+)\/(queries|operations))$/.exec(url.pathname);
    if (!match) return false;
    const send = (status: number, value: unknown) => res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(value));
    try {
      if (process.env.NODE_ENV !== 'development' || !import.meta.url.endsWith('.ts') || req.method !== 'POST') throw new Error('FORM_TEST_DEVELOPMENT_ONLY');
      const key = decodeURIComponent(match[1]), applicationId = this.options.registry.byKey(key)?.applicationId, userId = this.options.identity.currentUser(req);
      if (!applicationId || !userId) throw new Error('FORM_TEST_IDENTITY_REQUIRED');
      if (match[3]) {
        const entry = this.hosts.get(match[3]);
        if (!entry || entry.applicationId !== applicationId || entry.key !== key || entry.userId !== userId) throw new Error('FORM_TEST_TARGET_DENIED');
        const proxy = createApplicationDataProxy({ enabled: true, environment: 'development', protectedHostUrl: entry.hostUrl, prepareIntent: (route, intent) => {
          const value = intent as { datasetId?: string; formId?: string };
          if (!value || value.datasetId !== entry.datasetId || value.formId !== undefined && value.formId !== entry.formId) throw new Error('FORM_TEST_TARGET_DENIED');
          return route === '/operations' ? { ...value, formId: entry.formId } : value;
        }, v1Identity: { resolveUser: request => this.options.identity.currentUser(request), policyDigest: () => this.options.identity.policyDigest(), applicationId, authorityId: V1_AUTHORITY_ID, trustedUiServerKey: entry.config.identity.trustedUiServerKey!, origins: this.options.origins } });
        const original = req.url; req.url = `/api/application-data/${match[4]}`; try { await proxy(req, res); } finally { req.url = original; } return true;
      }
      this.options.security.workspacePrincipal(req, true);
      let source = ''; for await (const chunk of req) { source += chunk; if (source.length > 16000) throw new Error('FORM_TEST_REQUEST_INVALID'); }
      const input = JSON.parse(source || '{}');
      if (match[2] === 'end') { const entry = this.hosts.get(input.testId); if (!entry || entry.userId !== userId || entry.applicationId !== applicationId) throw new Error('FORM_TEST_TARGET_DENIED'); await this.end(input.testId); send(200, { ended: true }); return true; }
      if (Object.keys(input).sort().join(',') !== 'datasetId,formId' || !/^[a-f0-9-]{36}$/.test(input.datasetId)) throw new Error('FORM_TEST_REQUEST_INVALID');
      const admission = this.options.identity.captureAdmission(req, 'ui.artifact.admin', { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'artifact', id: input.datasetId, parentId: applicationId });
      const assert = async () => { this.options.security.workspacePrincipal(req, true); if (this.options.identity.currentUser(req) !== userId || this.options.registry.byKey(key)?.applicationId !== applicationId) throw new Error('FORM_TEST_OWNER_CHANGED'); await admission(); };
      await assert();
      if (!await this.options.identity.authorize(req, 'ui.application.view', { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'application', id: applicationId })) throw new Error('FORM_TEST_SOURCE_DENIED');
      const forms = await new VisualArtifactService(platformComponentsRoot, 'component').list();
      const found = forms.filter(f => f.metadata?.componentId === input.formId);
      if (found.length !== 1 || found[0].metadata?.form?.datasetId !== input.datasetId || found[0].diagnostics.some(d => d.severity === 'error')) throw new Error('FORM_TEST_SOURCE_INVALID');
      const deployment = JSON.parse(await readFile(path.join(this.options.datasetsRoot, applicationId, input.datasetId, 'host.json'), 'utf8')) as { config: BuilderDevelopmentHostConfig };
      if (deployment.config.pin.appId !== applicationId || deployment.config.pin.datasetId !== input.datasetId) throw new Error('FORM_TEST_OWNER_INVALID');
      const applied = await inspectDevelopmentDataset(deployment.config);
      for (const [id, host] of this.hosts) if (host.userId === userId && host.applicationId === applicationId) await this.end(id);
      const testId = randomUUID(), root = path.join(this.options.root, applicationId, testId); await mkdir(root, { recursive: true });
      const isolated = await bootstrapDevelopmentDataset({ owner: { applicationIdForKey: k => this.options.registry.byKey(k)?.applicationId, isCurrentOwner: id => !!this.options.registry.provisioning.resolve(id) }, authorityId: V1_AUTHORITY_ID, systemResourceId: 'platform', applicationKey: key,
        root: path.join(root, 'domain'), schema: applied.schema, registration: deployment.config.registration, assertAuthority: assert });
      const config: BuilderDevelopmentHostConfig = { ...deployment.config, pin: isolated.pin, paths: { ...isolated.paths, policyStore: this.options.policyStore }, serving: isolated.serving, registration: isolated.registration,
        workflows: undefined, automation: { triggersRoot: path.join(root, 'triggers'), workflowsRoot: path.join(root, 'workflows') }, identity: { ...deployment.config.identity, trustedUiServerKey: randomBytes(32).toString('hex'), token: randomBytes(32).toString('hex') } };
      if (path.resolve(config.paths.ormData) === path.resolve(deployment.config.paths.ormData)) throw new Error('FORM_TEST_STORAGE_NOT_ISOLATED');
      await assert(); const host = createBuilderDevelopmentHost(config), server = createServer(host.handler);
      try {
        await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); await assert();
        const hostUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
        this.hosts.set(testId, { userId, applicationId, key, datasetId: input.datasetId, formId: input.formId, server, host, config, hostUrl });
      } catch (error) { server.close(); host.close(); throw error; }
      send(201, { testId, mode: 'isolated-development', datasetId: input.datasetId, storageIsolated: true, automation: 'empty-isolated-catalog' }); return true;
    } catch (error) { send(403, { code: 'FORM_TEST_DENIED', error: (error as Error).message }); return true; }
  }
}
