import { readFileSync, realpathSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHmac, randomBytes } from 'node:crypto';
import type { DevelopmentApplicationRegistry } from './development-application-registry.js';
import type { V1DevelopmentIdentity } from './v1-development-identity.js';
import { V1_AUTHORITY_ID } from './v1-development-policy.js';
import { createApplicationDataProxy } from './application-data-proxy.js';

export interface DevelopmentRuntimeConnection {
  applicationId: string; key: string; hostUrl: string; trustedUiServerKey: string;
  policyStore: string; datasetId: string; workflowIds: string[];
}
/** Local host configuration is outside Application source. It never registers
 * resources or grants policy; the protected host must independently bind the Dataset. */
export class DevelopmentApplicationRuntime {
  private readonly previewOrigins = new Map<string, Set<string>>();
  private readonly managed = new Map<string, DevelopmentRuntimeConnection>();
  connectManaged(config: DevelopmentRuntimeConnection) {
    const existing = this.connection(config.applicationId);
    if (existing && existing.datasetId !== config.datasetId) throw new Error('ONE_DATASET_HOST_LIMIT');
    this.managed.set(config.applicationId, structuredClone(config));
  }
  connectedDataset(applicationId: string) { return this.connection(applicationId)?.datasetId; }
  disconnectManaged(applicationId: string) { this.managed.delete(applicationId); }
  constructor(private readonly file: string | undefined, private readonly policyStore: string,
    private readonly registry: DevelopmentApplicationRegistry, private readonly identity: V1DevelopmentIdentity,
    private readonly origins: string[]) {}
  allowPreview(applicationId: string, origin: string) {
    const url = new URL(origin);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.origin !== origin || !this.registry.provisioning.resolve(applicationId)) throw new Error('DEVELOPMENT_PREVIEW_ORIGIN_INVALID');
    this.previewOrigins.set(applicationId, new Set([origin]));
  }
  private connection(applicationId: string): DevelopmentRuntimeConnection | undefined {
    const managed = this.managed.get(applicationId);
    if (managed) return structuredClone(managed);
    if (!this.file) return undefined;
    let connections: DevelopmentRuntimeConnection[];
    try { connections = JSON.parse(readFileSync(this.file, 'utf8')) as DevelopmentRuntimeConnection[]; }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return undefined; throw error; }
    if (!Array.isArray(connections)) throw new Error('DEVELOPMENT_RUNTIME_CONFIG_INVALID');
    const matches = connections.filter(c => c.applicationId === applicationId);
    if (!matches.length) return undefined;
    if (matches.length !== 1) throw new Error('DEVELOPMENT_RUNTIME_DUPLICATE');
    const config = matches[0]!;
    const host = new URL(config.hostUrl);
    if (host.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(host.hostname) || host.pathname !== '/' || host.username || host.password || host.search || host.hash ||
        config.trustedUiServerKey.length < 32 || !config.datasetId || !Array.isArray(config.workflowIds) ||
        new Set(config.workflowIds).size !== config.workflowIds.length || realpathSync(config.policyStore) !== realpathSync(this.policyStore) ||
        this.registry.byKey(config.key)?.applicationId !== applicationId) throw new Error('DEVELOPMENT_RUNTIME_CONFIG_INVALID');
    return config;
  }
  private assertion(config: DevelopmentRuntimeConnection, req: IncomingMessage): string {
    const userId = this.identity.currentUser(req);
    if (!userId) throw new Error('DEVELOPMENT_RUNTIME_UNAUTHENTICATED');
    const payload = Buffer.from(JSON.stringify({ userId, applicationId: config.applicationId, authorityId: V1_AUTHORITY_ID,
      policyDigest: this.identity.policyDigest(), issuedAt: Date.now() - 100, nonce: randomBytes(24).toString('hex') })).toString('base64url');
    return `v1.${payload}.${createHmac('sha256', config.trustedUiServerKey).update(payload).digest('base64url')}`;
  }
  async authoringCatalog(applicationId: string, req: IncomingMessage) {
    const config = this.connection(applicationId);
    if (!config || !await this.identity.authorize(req, 'ui.application.view', { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'application', id: applicationId })) throw new Error('AUTOMATION_CATALOG_UNAVAILABLE');
    const response = await fetch(new URL('/onboarding', config.hostUrl), { method: 'POST', headers: { authorization: `Bearer ${this.assertion(config, req)}` }, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error('AUTOMATION_CATALOG_UNAVAILABLE');
    const proof = await response.json();
    if (proof.applicationId !== applicationId || proof.datasetId !== config.datasetId || proof.authorityId !== V1_AUTHORITY_ID || !proof.catalog || proof.catalog.appId !== applicationId) throw new Error('AUTOMATION_CATALOG_UNAVAILABLE');
    return proof.catalog;
  }
  async readiness(applicationId: string, req: IncomingMessage): Promise<{ ready: boolean; diagnostic?: string }> {
    try {
      const config = this.connection(applicationId); if (!config) return { ready: false };
      const result = await fetch(new URL('/onboarding', config.hostUrl), { method: 'POST', headers: { authorization: `Bearer ${this.assertion(config, req)}` }, signal: AbortSignal.timeout(5000) });
      if (!result.ok) return { ready: false, diagnostic: 'DEVELOPMENT_HOST_REJECTED' };
      const proof = await result.json();
      const ready = proof.applicationId === applicationId && proof.authorityId === V1_AUTHORITY_ID && proof.datasetId === config.datasetId &&
        !!proof.publication?.checksum && !!proof.serving?.generation && !!proof.serving?.fingerprint &&
        Array.isArray(proof.workflowIds) && config.workflowIds.every(id => proof.workflowIds.includes(id));
      return ready ? { ready: true } : { ready: false, diagnostic: 'DEVELOPMENT_HOST_BINDING_INVALID' };
    } catch { return { ready: false, diagnostic: 'DEVELOPMENT_HOST_UNAVAILABLE' }; }
  }
  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const match = /^\/api\/apps\/([^/]+)\/application-data\/(queries|operations|workflows)$/.exec(url.pathname);
    if (!match) return false;
    try {
      const applicationId = this.registry.byKey(decodeURIComponent(match[1]!))?.applicationId;
      const config = applicationId && this.connection(applicationId);
      if (!config) throw new Error('DEVELOPMENT_RUNTIME_REQUIRED');
      const proxy = createApplicationDataProxy({ enabled: true, environment: 'development', protectedHostUrl: config.hostUrl,
        v1Identity: { resolveUser: request => this.identity.currentUser(request), policyDigest: () => this.identity.policyDigest(),
          applicationId: config.applicationId, authorityId: V1_AUTHORITY_ID, trustedUiServerKey: config.trustedUiServerKey,
          origins: [...this.origins, ...this.previewOrigins.get(config.applicationId) ?? []] } });
      const original = req.url;
      req.url = `/api/application-data/${match[2]}${url.search}`;
      try { await proxy(req, res); } finally { req.url = original; }
    } catch { res.writeHead(503, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify({ code: 'DEVELOPMENT_RUNTIME_REQUIRED' })); }
    return true;
  }
}
