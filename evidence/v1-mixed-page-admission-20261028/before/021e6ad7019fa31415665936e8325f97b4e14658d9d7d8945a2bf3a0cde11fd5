import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { SecurityAuthorizationEvaluator, type AccessRequest, type ResourceAuthority } from '@ui-platform/i-am/evaluator';
import type { SecurityResourceRef } from '@ui-platform/i-am/definitions';
import { SecurityDefinitionStore } from '@ui-platform/i-am/definitions';
import { V1_AUTHORITY_ID, V1_FIXTURE_APPLICATION_ID, V1_FIXTURE_APPLICATION_KEY, developmentUsers, seedV1DevelopmentPolicy } from './v1-development-policy.js';
import { SecurityDefinitionService } from '@ui-platform/i-am/definitions';
import type { EditorOperation } from '../shared/editor-security.js';
import type { EditorScope } from './editor-security.js';

import { SecurityAdministrationService, adminAnchor, type AdministrationIdentityBoundary } from '@ui-platform/i-am/administration';
import type { SecurityDocument, SecurityRecord, SecurityScope } from '@ui-platform/i-am/definitions';
import { developmentSecurityConfiguration, developmentSecurityScopes } from './v1-security-administration.js';
import type { DevelopmentApplicationRegistry } from './development-application-registry.js';

type Session = { token: string; csrf: string; revision: string; userId: string | null; expires: number };
const cookieName = 'uib_v1_development_session';
const token = () => randomBytes(32).toString('hex');
const localAddress = (address?: string) => address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface V1DevelopmentIdentityOptions {
  enabled: boolean;
  environment: string;
  developmentRuntime: boolean;
  policyStorePath: string;
  origins: string[];
  sessionLifetimeMs?: number;
  applicationRegistry?: DevelopmentApplicationRegistry;
}

/** Development authentication only. Every request re-reads I-AM User and policy state. */
export class V1DevelopmentIdentity {
  private readonly sessions = new Map<string, Session>();
  private readonly store: SecurityDefinitionStore;
  private readonly evaluator: SecurityAuthorizationEvaluator;
  readonly enabled: boolean;
  private readonly administration?: SecurityAdministrationService;
  private withAdministration?: <T>(req: IncomingMessage, action: (service: SecurityAdministrationService, context: object) => Promise<T>) => Promise<T>;
  private runtimeReady?: (applicationId: string, req: IncomingMessage) => Promise<{ ready: boolean; diagnostic?: string }>;
  constructor(private readonly options: V1DevelopmentIdentityOptions) {
    if (options.enabled && (options.environment !== 'development' || !options.developmentRuntime || !options.origins.length))
      throw new Error('V1_DEVELOPMENT_IDENTITY_UNAVAILABLE');
    for (const origin of options.origins) {
      const url = new URL(origin);
      if (url.origin !== origin || url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
        throw new Error('V1_DEVELOPMENT_ORIGIN_INVALID');
    }
    this.enabled = options.enabled;
    this.store = new SecurityDefinitionStore(options.policyStorePath);
    if (this.enabled) seedV1DevelopmentPolicy(new SecurityDefinitionService(this.store));
    const contexts = new WeakMap<object, { userId: string; revision: string; session?: Session }>();
    const attested = new WeakSet<AccessRequest>();
    const root: SecurityResourceRef = { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system', id: 'platform' };
    const resources: ResourceAuthority = {
      revision: async () => `sha256:${createHash('sha256').update(JSON.stringify([this.store.revision(), options.applicationRegistry?.revision() ?? 'fixture'])).digest('hex')}`,
      resolve: async ref => {
        if (ref.authorityId !== V1_AUTHORITY_ID) return undefined;
        if (ref.kind === 'system' && ref.applicationId === null && ref.id === root.id) return { ref: root, status: 'active' };
        if (ref.kind === 'application' && ref.applicationId === ref.id && (ref.id === V1_FIXTURE_APPLICATION_ID || !!options.applicationRegistry?.provisioning.resolve(ref.id)))
          return { ref, parent: root, status: 'active' };
        if ((ref.applicationId === V1_FIXTURE_APPLICATION_ID || !!(ref.applicationId && options.applicationRegistry?.provisioning.resolve(ref.applicationId))) && ref.parentId === ref.applicationId &&
            ['page', 'form', 'workflow', 'artifact', 'security-definition'].includes(ref.kind))
          return { ref, parent: { authorityId: V1_AUTHORITY_ID, applicationId: ref.applicationId, kind: 'application', id: ref.applicationId }, status: 'active' };
        return undefined;
      },
    };
    this.evaluator = new SecurityAuthorizationEvaluator({
      policy: { read: async () => { const snapshot = this.store.snapshot(); return { revision: String(snapshot.revision), documents: snapshot.documents }; } },
      resources,
      facts: { revision: async () => 'v1-no-facts', resolve: async () => ({ present: false as const }) },
      identity: {
        verify: async context => {
          if (!context || typeof context !== 'object') throw new Error('IDENTITY_UNTRUSTED');
          const state = contexts.get(context);
          if (!state || !this.activeUser(state.userId) || state.session && (state.session.revision !== state.revision || state.session.userId !== state.userId || state.session.expires <= Date.now())) throw new Error('IDENTITY_UNTRUSTED');
          return { principal: { type: 'user' as const, id: state.userId }, principalRevision: String(this.store.revision()), sessionRevision: state.revision };
        },
        assertRequest: async request => { if (!attested.has(request)) throw new Error('REQUEST_UNATTESTED'); },
      },
      freshnessMs: 1_000,
    });
    if (this.enabled && options.applicationRegistry) {
      const identity: AdministrationIdentityBoundary = {
        verify: async context => {
          const state = context && typeof context === 'object' ? contexts.get(context) : undefined;
          if (!state || !this.activeUser(state.userId) || state.session && (state.session.revision !== state.revision || state.session.userId !== state.userId || state.session.expires <= Date.now())) throw new Error('ADMIN_IDENTITY_INVALID');
          return { actorId: state.userId, principalRevision: String(this.store.revision()), sessionRevision: state.revision };
        },
        attestDecisionRequest: (context, resource, permissionId, operationId) => {
          const request: AccessRequest = { context, resource, permissionId, operationId, fields: [] };
          attested.add(request); return request;
        },
      };
      this.administration = new SecurityAdministrationService(new SecurityDefinitionService(this.store), this.evaluator, identity,
        { async verify() { throw new Error('RECOVERY_LOCAL_SETUP_REQUIRED'); } }, developmentSecurityScopes,
        { ...developmentSecurityConfiguration, applicationProvisioning: options.applicationRegistry.provisioning });
      this.withAdministration = async (req, action) => {
        const userId = this.currentUser(req), session = this.session(req);
        if (!userId || !session) throw new Error('ADMIN_IDENTITY_INVALID');
        this.csrf(req, session);
        const context = Object.freeze({}); contexts.set(context, { userId, revision: session.revision, session });
        try { return await action(this.administration!, context); } finally { contexts.delete(context); }
      };
    }
    this.authorizeUser = async (userId, revision, permissionId, resource) => {
      const context = Object.freeze({});
      contexts.set(context, { userId, revision });
      try {
        const request: AccessRequest = { context, permissionId, resource, operationId: permissionId, fields: [] };
        attested.add(request);
        return (await this.evaluator.authorize(request)).effect === 'allow';
      } finally { contexts.delete(context); }
    };
  }
  close() { this.sessions.clear(); this.store.close(); }
  policyDigest(): string { return `sha256:${createHash('sha256').update(JSON.stringify(this.store.snapshot().documents)).digest('hex')}`; }
  setRuntimeReadiness(check: (applicationId: string, req: IncomingMessage) => Promise<{ ready: boolean; diagnostic?: string }>) { this.runtimeReady = check; }
  registeredApplication(key: string): string | undefined { return this.options.applicationRegistry?.byKey(key)?.applicationId; }
  async handleAdministration(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const parts = new URL(req.url ?? '/', 'http://localhost').pathname.split('/').filter(Boolean);
    if (this.administration && parts[0] === 'api' && parts[1] === 'platform' && parts[2] === 'security' && parts.length === 4) {
      try {
        if (req.method !== 'POST' || !await this.authorize(req, developmentSecurityConfiguration.platformAdministratorPermissionId,
          { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system', id: 'platform' })) throw new Error('ADMIN_AUTHORITY_DENIED');
        let size = 0; const chunks: Buffer[] = [];
        for await (const chunk of req) { const bytes = Buffer.from(chunk); size += bytes.length; if (size > 100_000) throw new Error('ADMIN_REQUEST_INVALID'); chunks.push(bytes); }
        const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        const result = await this.withAdministration!(req, async (service, context) => {
          if (parts[3] === 'stage') return service.stage({ changes: input.changes, expectedRevision: input.expectedRevision,
            actorId: this.currentUser(req)!, source: 'api', idempotencyKey: randomUUID(), ...(input.reason === undefined ? {} : { reason: input.reason }) });
          if (parts[3] === 'activate') return service.activate({ context, applicationId: null, candidateId: input.candidateId,
            checksum: input.checksum, expectedRevision: input.expectedRevision, reason: input.reason });
          throw new Error('ADMIN_REQUEST_INVALID');
        });
        res.writeHead('status' in result && result.status !== 'activated' ? 403 : 200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(result));
      } catch { res.writeHead(403, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify({ code: 'ADMIN_AUTHORITY_DENIED' })); }
      return true;
    }
    if (!this.administration || parts[0] !== 'api' || parts[1] !== 'apps' || !parts[2] || !['onboarding', 'security'].includes(parts[3] ?? '')) return false;
    try {
      const applicationId = this.registeredApplication(decodeURIComponent(parts[2]));
      if (!applicationId) throw new Error('ADMIN_APPLICATION_UNKNOWN');
      const root: SecurityResourceRef = { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system', id: 'platform' };
      const resource: SecurityResourceRef = { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'application', id: applicationId };
      const platform = await this.authorize(req, developmentSecurityConfiguration.platformAdministratorPermissionId, root);
      const appAdmin = await this.authorize(req, developmentSecurityConfiguration.applicationAdministratorPermissionId, resource);
      if (!platform && !appAdmin) throw new Error('ADMIN_AUTHORITY_DENIED');
      if (parts[3] === 'onboarding' && parts.length === 4 && req.method === 'GET') {
        const configured = !!adminAnchor(this.store.snapshot().documents.map(d => d.definition), applicationId, V1_AUTHORITY_ID, new Date(), developmentSecurityScopes);
        const readiness = configured ? await this.runtimeReady?.(applicationId, req) : undefined;
        const runtime = !!readiness?.ready;
        res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify({ applicationId, sourceCreated: true,
          authorityConfigured: configured, runtimeConnected: runtime, status: !configured ? 'authority-required' : runtime ? 'ready' : readiness?.diagnostic ? 'failed-incomplete' : 'runtime-required',
          ...(readiness?.diagnostic ? { diagnostic: readiness.diagnostic } : {}) }));
        return true;
      }
      if (req.method !== 'POST') throw new Error('ADMIN_REQUEST_INVALID');
      let size = 0; const chunks: Buffer[] = [];
      for await (const chunk of req) { const bytes = Buffer.from(chunk); size += bytes.length; if (size > 100_000) throw new Error('ADMIN_REQUEST_INVALID'); chunks.push(bytes); }
      const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      const result = await this.withAdministration!(req, async (service, context) => {
        if (parts[3] === 'onboarding' && parts.length === 4) {
          if (!platform || typeof input.administratorUserId !== 'string' || !input.reason?.trim()) throw new Error('ADMIN_REQUEST_INVALID');
          const owner = { kind: 'application' as const, applicationId };
          const scope: SecurityScope = { resource, descendants: false };
          const prefix = `initial.${applicationId}`;
          const base = (id: string) => ({ id, key: id, name: id, status: 'active' as const });
          const permissionId = developmentSecurityConfiguration.applicationAdministratorPermissionId;
          const records: SecurityRecord[] = [
            { ...base(applicationId), kind: 'application-security', owner, requiredAdministratorPermissionId: permissionId, sharedPackages: [] },
            { ...base(`${prefix}.set`), kind: 'permission-set', owner, includes: [], rules: [{ id: `${prefix}.rule`, permissionId, effect: 'allow', scope }] },
            { ...base(`${prefix}.role`), kind: 'role', owner, permissionSets: [{ id: `${prefix}.set` }] },
            { kind: 'role-assignment', id: `${prefix}.assignment`, status: 'active', userId: input.administratorUserId, roleId: `${prefix}.role`, scope, startsAt: new Date().toISOString(), endsAt: null },
            { ...base(`${prefix}.boundary`), kind: 'grant-boundary', owner: { kind: 'platform' }, beneficiary: { kind: 'role', id: `${prefix}.role` }, scope,
              operations: ['create', 'edit', 'assign', 'revoke', 'activate', 'archive'], permissions: [{ permissionId, scope, predicateTemplateIds: [] }], serviceUseApprovalIds: [] },
          ];
          const candidate = service.stage({ changes: records.map(definition => ({ document: { format: 'ui-platform.security', formatVersion: 1, definition } as SecurityDocument })),
            expectedRevision: this.store.revision(), actorId: this.currentUser(req)!, source: 'api', idempotencyKey: randomUUID(), ...(input.reason === undefined ? {} : { reason: input.reason }) });
          return service.provisionApplication({ context, applicationId, candidateId: candidate.id, checksum: candidate.checksum,
            expectedRevision: candidate.baseRevision, administratorUserId: input.administratorUserId, administratorAssignmentId: `${prefix}.assignment`, reason: input.reason });
        }
        if (parts[3] === 'security' && parts.length === 5 && parts[4] === 'stage') return service.stage({ changes: input.changes,
          expectedRevision: input.expectedRevision, actorId: this.currentUser(req)!, source: 'api', idempotencyKey: randomUUID(), ...(input.reason === undefined ? {} : { reason: input.reason }) });
        if (parts[3] === 'security' && parts.length === 5 && parts[4] === 'activate') return service.activate({ context, applicationId,
          candidateId: input.candidateId, checksum: input.checksum, expectedRevision: input.expectedRevision, reason: input.reason });
        throw new Error('ADMIN_REQUEST_INVALID');
      });
      res.writeHead('status' in result && result.status !== 'activated' ? 403 : 200, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(403, { 'content-type': 'application/json', 'cache-control': 'no-store' }).end(JSON.stringify({ code: error instanceof Error ? error.message : 'ADMIN_AUTHORITY_UNAVAILABLE' }));
    }
    return true;
  }
  private activeUser(userId: string) {
    return this.store.snapshot().documents.map(doc => doc.definition).find(record => record.kind === 'user' && record.id === userId && record.status === 'active');
  }
  private session(req: IncomingMessage): Session | undefined {
    const cookie = req.headers.cookie?.split(';').map(value => value.trim()).find(value => value.startsWith(`${cookieName}=`));
    const session = cookie ? this.sessions.get(cookie.slice(cookieName.length + 1)) : undefined;
    if (session && session.expires <= Date.now()) { this.sessions.delete(session.token); return undefined; }
    return session;
  }
  private boundary(req: IncomingMessage) {
    if (!this.enabled || !localAddress(req.socket.remoteAddress) || req.headers.forwarded || req.headers['x-forwarded-for'] || req.headers['x-forwarded-host'])
      throw new Error('V1_DEVELOPMENT_IDENTITY_UNAVAILABLE');
  }
  private csrf(req: IncomingMessage, session: Session) {
    if (typeof req.headers.origin !== 'string' || !this.options.origins.includes(req.headers.origin) ||
        req.headers['x-v1-csrf'] !== session.csrf || !req.headers['content-type']?.startsWith('application/json'))
      throw new Error('V1_DEVELOPMENT_CSRF_DENIED');
  }
  currentUser(req: IncomingMessage): string | null {
    this.boundary(req);
    const session = this.session(req);
    return session?.userId && this.activeUser(session.userId) ? session.userId : null;
  }
  /** Trusted host-only evaluation; callers cannot pass an actor through HTTP input. */
  private authorizeUser: (userId: string, revision: string, permissionId: string, resource: SecurityResourceRef) => Promise<boolean>;
  async authorize(req: IncomingMessage, permissionId: string, resource: SecurityResourceRef): Promise<boolean> {
    const session = this.session(req);
    const userId = this.currentUser(req);
    if (!session || !userId) return false;
    return this.authorizeUser(userId, session.revision, permissionId, resource);
  }
  captureAdmission(req: IncomingMessage, permissionId: string, resource: SecurityResourceRef): () => Promise<void> {
    const session = this.session(req), userId = this.currentUser(req), revision = session?.revision, scope = structuredClone(resource);
    const assert = () => { this.boundary(req); if (!session || !userId || this.session(req) !== session || session.revision !== revision || this.currentUser(req) !== userId) throw new Error('V1_ORIGINAL_AUTHORITY_REVOKED'); };
    assert();
    return async () => { assert(); if (!await this.authorizeUser(userId!, revision!, permissionId, scope)) throw new Error('V1_PERMISSION_DENIED'); assert(); };
  }
  /** Only trusted server adapters call this after binding the editor principal to the V1 session. */
  async authorizeEditor(userId: string, operation: EditorOperation, scope: EditorScope): Promise<boolean> {
    const applicationId = scope.applicationKey === V1_FIXTURE_APPLICATION_KEY ? V1_FIXTURE_APPLICATION_ID : this.options.applicationRegistry?.byKey(scope.applicationKey)?.applicationId;
    if (!applicationId || !this.activeUser(userId)) return false;
    if (operation === 'discover') {
      if (await this.authorizeEditor(userId, 'security', scope)) return true;
      for (const area of ['page', 'form', 'workflow', 'artifact'] as const) {
        if (await this.authorizeUser(userId, String(this.store.revision()), `ui.${area}.view`,
          { authorityId: V1_AUTHORITY_ID, applicationId, kind: area,
            id: `v1-${area}`, parentId: applicationId })) return true;
      }
      return false;
    }
    if (operation === 'security') return this.authorizeUser(userId, String(this.store.revision()), 'ui.security.admin',
      { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'security-definition',
        id: 'v1-security', parentId: applicationId });
    const area = scope.artifactType === 'form' ? 'form' : scope.artifactType === 'workflow' ? 'workflow' :
      ['page', 'route', 'routeGroup'].includes(scope.artifactType ?? '') ? 'page' : 'artifact';
    const action = operation === 'edit' ? 'edit' : operation === 'admin' ? 'admin' : 'view';
    if (scope.ownership && scope.ownership !== 'application' && action !== 'admin') return false;
    return this.authorizeUser(userId, String(this.store.revision()), `ui.${area}.${action}`,
      { authorityId: V1_AUTHORITY_ID, applicationId, kind: area,
        id: scope.artifactId ?? `v1-${area}`, parentId: applicationId });
  }
  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    if (new URL(req.url ?? '/', 'http://localhost').pathname !== '/api/development-identity/session') return false;
    if (!this.enabled) { res.writeHead(404).end(); return true; }
    try {
      this.boundary(req);
      let session = this.session(req);
      if (req.method === 'GET') {
        if (!session) {
          for (const [id, existing] of this.sessions) if (existing.expires <= Date.now()) this.sessions.delete(id);
          if (this.sessions.size >= 256) throw new Error('V1_DEVELOPMENT_SESSION_LIMIT');
          session = { token: token(), csrf: token(), revision: token(), userId: null,
            expires: Date.now() + (this.options.sessionLifetimeMs ?? 8 * 60 * 60 * 1_000) };
          this.sessions.set(session.token, session);
          res.setHeader('set-cookie', `${cookieName}=${session.token}; HttpOnly; SameSite=Strict; Path=/api`);
        }
      } else if (req.method === 'POST' || req.method === 'DELETE') {
        if (!session) throw new Error('V1_DEVELOPMENT_SESSION_MISSING');
        this.csrf(req, session);
        if (req.method === 'DELETE') session.userId = null;
        else {
          let size = 0; const chunks: Buffer[] = [];
          for await (const chunk of req) { const bytes = Buffer.from(chunk); size += bytes.length; if (size > 1024) throw new Error('V1_DEVELOPMENT_LOGIN_INVALID'); chunks.push(bytes); }
          let email: unknown;
          try { email = JSON.parse(Buffer.concat(chunks).toString('utf8')).email; } catch { throw new Error('V1_DEVELOPMENT_LOGIN_INVALID'); }
          if (typeof email !== 'string' || !emailPattern.test(email) || email.length > 254) throw new Error('V1_DEVELOPMENT_LOGIN_INVALID');
          const matches = this.store.snapshot().documents.map(doc => doc.definition).filter((record): record is Extract<typeof record, { kind: 'user' }> =>
            record.kind === 'user' && developmentUsers.some(user => user.id === record.id) && record.email?.toLowerCase() === email.toLowerCase());
          if (matches.length !== 1 || matches[0]!.status !== 'active') throw new Error('V1_DEVELOPMENT_LOGIN_DENIED');
          session.userId = matches[0]!.id;
        }
        session.revision = token();
      } else { res.writeHead(405).end(); return true; }
      const userId = session!.userId && this.activeUser(session!.userId) ? session!.userId : null;
      if (!userId) session!.userId = null;
      const user = userId ? this.activeUser(userId) : undefined;
      const users = this.store.snapshot().documents.map(doc => doc.definition).filter(record => record.kind === 'user' &&
        developmentUsers.some(user => user.id === record.id) && record.email && record.status === 'active');
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
      res.end(JSON.stringify({ csrfToken: session!.csrf, revision: session!.revision,
        user: user && user.kind === 'user' ? { userId: user.id, email: user.email, displayName: user.displayName } : null,
        identities: users.map(record => record.kind === 'user' ? { email: record.email, displayName: record.displayName } : null).filter(Boolean) }));
    } catch (error) {
      const code = error instanceof Error ? error.message : 'V1_DEVELOPMENT_IDENTITY_UNAVAILABLE';
      const status = code.includes('MISSING') ? 401 : code.includes('DENIED') || code.includes('CSRF') ? 403 : code.includes('INVALID') ? 400 : 503;
      res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      res.end(JSON.stringify({ code }));
    }
    return true;
  }
}
