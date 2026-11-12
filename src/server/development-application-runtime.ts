import { readFileSync, realpathSync } from 'node:fs';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createHmac, randomBytes } from 'node:crypto';
import type { DevelopmentApplicationRegistry } from './development-application-registry.js';
import type { V1DevelopmentIdentity } from './v1-development-identity.js';
import { V1_AUTHORITY_ID } from './v1-development-policy.js';
import { createApplicationDataProxy } from './application-data-proxy.js';
import type { ProtectedRead, TrustedDatasetExecution } from '@ui-platform/dataset-operations';

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
    this.validateConnection(config, config.applicationId);
    this.managed.set(JSON.stringify([config.applicationId, config.datasetId]), structuredClone(config));
  }
  connectedDatasets(applicationId: string) { return this.connections(applicationId).map(c => c.datasetId); }
  connectedDataset(applicationId: string, datasetId?: string) {
    const ids = this.connectedDatasets(applicationId);
    return datasetId ? ids.find(id => id === datasetId) : ids.length === 1 ? ids[0] : undefined;
  }
  disconnectManaged(applicationId: string, datasetId?: string) {
    for (const [key, config] of this.managed) if (config.applicationId === applicationId && (!datasetId || config.datasetId === datasetId)) this.managed.delete(key);
  }
  constructor(private readonly file: string | undefined, private readonly policyStore: string,
    private readonly registry: DevelopmentApplicationRegistry, private readonly identity: V1DevelopmentIdentity,
    private readonly origins: string[]) {}
  allowPreview(applicationId: string, origin: string) {
    const url = new URL(origin);
    if (url.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.origin !== origin || !this.registry.provisioning.resolve(applicationId)) throw new Error('DEVELOPMENT_PREVIEW_ORIGIN_INVALID');
    this.previewOrigins.set(applicationId, new Set([origin]));
  }
  private validateConnection(config: DevelopmentRuntimeConnection, applicationId: string) {
    const host = new URL(config.hostUrl);
    if (host.protocol !== 'http:' || !['127.0.0.1', 'localhost'].includes(host.hostname) || host.pathname !== '/' || host.username || host.password || host.search || host.hash ||
        typeof config.trustedUiServerKey !== 'string' || config.trustedUiServerKey.length < 32 || typeof config.datasetId !== 'string' || !config.datasetId || !Array.isArray(config.workflowIds) ||
        config.workflowIds.some(id => typeof id !== 'string' || !id) || new Set(config.workflowIds).size !== config.workflowIds.length || realpathSync(config.policyStore) !== realpathSync(this.policyStore) ||
        this.registry.byKey(config.key)?.applicationId !== applicationId || config.applicationId !== applicationId) throw new Error('DEVELOPMENT_RUNTIME_CONFIG_INVALID');
  }
  private connections(applicationId: string): DevelopmentRuntimeConnection[] {
    let configured: DevelopmentRuntimeConnection[] = [];
    if (this.file) {
      try { configured = JSON.parse(readFileSync(this.file, 'utf8')); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      if (!Array.isArray(configured)) throw new Error('DEVELOPMENT_RUNTIME_CONFIG_INVALID');
    }
    const matches = configured.filter(c => c.applicationId === applicationId);
    const ids = new Set<string>();
    for (const config of matches) {
      this.validateConnection(config, applicationId);
      if (ids.has(config.datasetId)) throw new Error('DEVELOPMENT_RUNTIME_DUPLICATE');
      ids.add(config.datasetId);
    }
    const result = new Map(matches.map(c => [c.datasetId, c]));
    for (const config of this.managed.values()) if (config.applicationId === applicationId) {
      this.validateConnection(config, applicationId); result.set(config.datasetId, config);
    }
    return structuredClone([...result.values()]);
  }
  private selectConnection(applicationId: string, path: string, intent: unknown) {
    if (!intent || typeof intent !== 'object' || Array.isArray(intent)) throw new Error('DEVELOPMENT_DATASET_TARGET_INVALID');
    const value = intent as Record<string, unknown>;
    const connections = this.connections(applicationId);
    if (path === '/workflows') {
      if (Object.keys(value).some(k => !['workflowId', 'primaryRecordId'].includes(k)) || typeof value.workflowId !== 'string') throw new Error('DEVELOPMENT_WORKFLOW_TARGET_INVALID');
      const matches = connections.filter(c => c.workflowIds.includes(value.workflowId as string));
      if (matches.length !== 1) throw new Error('DEVELOPMENT_WORKFLOW_TARGET_UNAVAILABLE');
      return matches[0]!;
    }
    if (typeof value.datasetId !== 'string' || !value.datasetId) throw new Error('DEVELOPMENT_DATASET_TARGET_REQUIRED');
    const selected = connections.find(c => c.datasetId === value.datasetId);
    if (!selected) throw new Error('DEVELOPMENT_DATASET_TARGET_UNAVAILABLE');
    return selected;
  }
  private assertion(config: DevelopmentRuntimeConnection, req: IncomingMessage): string {
    const userId = this.identity.currentUser(req);
    if (!userId) throw new Error('DEVELOPMENT_RUNTIME_UNAUTHENTICATED');
    return this.userAssertion(config, userId);
  }
  private userAssertion(config: DevelopmentRuntimeConnection, userId: string): string {
    const payload = Buffer.from(JSON.stringify({ userId, applicationId: config.applicationId, authorityId: V1_AUTHORITY_ID,
      policyDigest: this.identity.policyDigest(), issuedAt: Date.now() - 100, nonce: randomBytes(24).toString('hex') })).toString('base64url');
    return `v1.${payload}.${createHmac('sha256', config.trustedUiServerKey).update(payload).digest('base64url')}`;
  }
  /** Called only by an admitted protected host operation, never by browser intent. */
  async assignmentReferenceRead(applicationId: string, query: ProtectedRead, trusted: TrustedDatasetExecution): Promise<Record<string, unknown>[]> {
    if (trusted.applicationId !== applicationId || trusted.authorityId !== V1_AUTHORITY_ID || trusted.actor.type !== 'user') throw new Error('ASSIGNMENT_REFERENCE_ACTOR_UNSUPPORTED');
    const config = this.connections(applicationId).find(c => c.datasetId === query.datasetId);
    if (!config) throw new Error('ASSIGNMENT_REFERENCE_DISCONNECTED');
    let response: Response;
    try { response = await fetch(new URL('/queries', config.hostUrl), { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${this.userAssertion(config, trusted.actor.userId)}` }, body: JSON.stringify(query), signal: AbortSignal.timeout(5000) }); }
    catch { throw new Error('ASSIGNMENT_REFERENCE_UNAVAILABLE'); }
    if (!response.ok) throw new Error('ASSIGNMENT_REFERENCE_DENIED');
    const rows = await response.json();
    if (!Array.isArray(rows) || rows.some(r => !r || typeof r !== 'object' || Array.isArray(r))) throw new Error('ASSIGNMENT_REFERENCE_RESPONSE_INVALID');
    return rows;
  }
  async authoringCatalog(applicationId: string, req: IncomingMessage) {
    const configs = this.connections(applicationId);
    if (!configs.length || !await this.identity.authorize(req, 'ui.application.view', { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'application', id: applicationId })) throw new Error('AUTOMATION_CATALOG_UNAVAILABLE');
    const catalogs = [];
    for (const config of configs) {
      const response = await fetch(new URL('/onboarding', config.hostUrl), { method: 'POST', headers: { authorization: `Bearer ${this.assertion(config, req)}` }, signal: AbortSignal.timeout(5000) });
      if (!response.ok) throw new Error('AUTOMATION_CATALOG_UNAVAILABLE');
      const proof = await response.json();
      if (proof.applicationId !== applicationId || proof.datasetId !== config.datasetId || proof.authorityId !== V1_AUTHORITY_ID || !proof.catalog || proof.catalog.appId !== applicationId) throw new Error('AUTOMATION_CATALOG_UNAVAILABLE');
      if (!Array.isArray(proof.catalog.datasets) || proof.catalog.datasets.some((d: { id: string }) => d.id !== config.datasetId)) throw new Error('AUTOMATION_CATALOG_UNAVAILABLE');
      catalogs.push(proof.catalog);
    }
    const unique = (items: Array<{ id: string }>, duplicateAllowed = false) => {
      const map = new Map<string, { id: string }>();
      for (const item of items) { const prior = map.get(item.id); if (prior && (!duplicateAllowed || JSON.stringify(prior) !== JSON.stringify(item))) throw new Error('AUTOMATION_CATALOG_DUPLICATE'); map.set(item.id, item); }
      return [...map.values()];
    };
    return { appId: applicationId, datasets: unique(catalogs.flatMap(c => c.datasets)), services: unique(catalogs.flatMap(c => c.services), true), workflows: unique(catalogs.flatMap(c => c.workflows)) };
  }
  async readiness(applicationId: string, req: IncomingMessage, datasetId?: string): Promise<{ ready: boolean; diagnostic?: string }> {
    try {
      const configs = this.connections(applicationId).filter(c => !datasetId || c.datasetId === datasetId);
      if (!configs.length) return { ready: false };
      for (const config of configs) {
        const result = await fetch(new URL('/onboarding', config.hostUrl), { method: 'POST', headers: { authorization: `Bearer ${this.assertion(config, req)}` }, signal: AbortSignal.timeout(5000) });
        if (!result.ok) return { ready: false, diagnostic: 'DEVELOPMENT_HOST_REJECTED' };
        const proof = await result.json();
        const ready = proof.applicationId === applicationId && proof.authorityId === V1_AUTHORITY_ID && proof.datasetId === config.datasetId &&
          !!proof.publication?.checksum && !!proof.serving?.generation && !!proof.serving?.fingerprint &&
          Array.isArray(proof.workflowIds) && config.workflowIds.every(id => proof.workflowIds.includes(id));
        if (!ready) return { ready: false, diagnostic: 'DEVELOPMENT_HOST_BINDING_INVALID' };
      }
      return { ready: true };
    } catch { return { ready: false, diagnostic: 'DEVELOPMENT_HOST_UNAVAILABLE' }; }
  }
  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const match = /^\/api\/apps\/([^/]+)\/application-data\/(queries|operations|workflows)$/.exec(url.pathname);
    if (!match) return false;
    try {
      const applicationId = this.registry.byKey(decodeURIComponent(match[1]!))?.applicationId;
      const configs = applicationId ? this.connections(applicationId) : [];
      const config = configs[0];
      if (!config) throw new Error('DEVELOPMENT_RUNTIME_REQUIRED');
      const proxy = createApplicationDataProxy({ enabled: true, environment: 'development', selectTarget: (path, intent) => {
          const selected = this.selectConnection(config.applicationId, path, intent);
          return { hostUrl: selected.hostUrl, trustedUiServerKey: selected.trustedUiServerKey };
        },
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
