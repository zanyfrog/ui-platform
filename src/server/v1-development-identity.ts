import { createHash, randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { SecurityAuthorizationEvaluator, type AccessRequest, type ResourceAuthority } from '@ui-platform/i-am/evaluator';
import type { SecurityResourceRef } from '@ui-platform/i-am/definitions';
import { SecurityDefinitionStore } from '@ui-platform/i-am/definitions';
import { V1_AUTHORITY_ID, V1_FIXTURE_APPLICATION_ID, V1_FIXTURE_APPLICATION_KEY, developmentUsers, seedV1DevelopmentPolicy } from './v1-development-policy.js';
import { SecurityDefinitionService } from '@ui-platform/i-am/definitions';
import type { EditorOperation } from '../shared/editor-security.js';
import type { EditorScope } from './editor-security.js';

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
}

/** Development authentication only. Every request re-reads I-AM User and policy state. */
export class V1DevelopmentIdentity {
  private readonly sessions = new Map<string, Session>();
  private readonly store: SecurityDefinitionStore;
  private readonly evaluator: SecurityAuthorizationEvaluator;
  readonly enabled: boolean;
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
    const contexts = new WeakMap<object, { userId: string; revision: string }>();
    const attested = new WeakSet<AccessRequest>();
    const root: SecurityResourceRef = { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system', id: 'platform' };
    const resources: ResourceAuthority = {
      revision: async () => `v1-${this.store.revision()}`,
      resolve: async ref => {
        if (ref.authorityId !== V1_AUTHORITY_ID) return undefined;
        if (ref.kind === 'system' && ref.applicationId === null && ref.id === root.id) return { ref: root, status: 'active' };
        if (ref.kind === 'application' && ref.applicationId === ref.id && ref.id === V1_FIXTURE_APPLICATION_ID)
          return { ref, parent: root, status: 'active' };
        if (ref.applicationId === V1_FIXTURE_APPLICATION_ID && ref.parentId === V1_FIXTURE_APPLICATION_ID &&
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
          if (!state || !this.activeUser(state.userId)) throw new Error('IDENTITY_UNTRUSTED');
          return { principal: { type: 'user' as const, id: state.userId }, principalRevision: String(this.store.revision()), sessionRevision: state.revision };
        },
        assertRequest: async request => { if (!attested.has(request)) throw new Error('REQUEST_UNATTESTED'); },
      },
      freshnessMs: 1_000,
    });
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
  /** Only trusted server adapters call this after binding the editor principal to the V1 session. */
  async authorizeEditor(userId: string, operation: EditorOperation, scope: EditorScope): Promise<boolean> {
    if (scope.applicationKey !== V1_FIXTURE_APPLICATION_KEY || !this.activeUser(userId)) return false;
    if (operation === 'discover') {
      if (await this.authorizeEditor(userId, 'security', scope)) return true;
      for (const area of ['page', 'form', 'workflow', 'artifact'] as const) {
        if (await this.authorizeUser(userId, String(this.store.revision()), `ui.${area}.view`,
          { authorityId: V1_AUTHORITY_ID, applicationId: V1_FIXTURE_APPLICATION_ID, kind: area,
            id: `v1-${area}`, parentId: V1_FIXTURE_APPLICATION_ID })) return true;
      }
      return false;
    }
    if (operation === 'security') return this.authorizeUser(userId, String(this.store.revision()), 'ui.security.admin',
      { authorityId: V1_AUTHORITY_ID, applicationId: V1_FIXTURE_APPLICATION_ID, kind: 'security-definition',
        id: 'v1-security', parentId: V1_FIXTURE_APPLICATION_ID });
    const area = scope.artifactType === 'form' ? 'form' : scope.artifactType === 'workflow' ? 'workflow' :
      ['page', 'route', 'routeGroup'].includes(scope.artifactType ?? '') ? 'page' : 'artifact';
    const action = operation === 'edit' ? 'edit' : operation === 'admin' ? 'admin' : 'view';
    if (scope.ownership && scope.ownership !== 'application' && action !== 'admin') return false;
    return this.authorizeUser(userId, String(this.store.revision()), `ui.${area}.${action}`,
      { authorityId: V1_AUTHORITY_ID, applicationId: V1_FIXTURE_APPLICATION_ID, kind: area,
        id: scope.artifactId ?? `v1-${area}`, parentId: V1_FIXTURE_APPLICATION_ID });
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
