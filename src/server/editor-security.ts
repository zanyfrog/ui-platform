import { randomBytes } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ArtifactValidationResult } from '@ui-platform/artifacts';
import { ArtifactEditorWorkspace, EditorRequestError, editorError } from './artifact-editor.js';
import type { EditorArtifactDto, EditorWatchEvent } from '../shared/artifact-editor.js';
import type { EditorOperation, EditorPrincipal, EditorSessionDto } from '../shared/editor-security.js';

export interface EditorScope {
  applicationKey: string;
  artifactId?: string;
  artifactType?: string;
  ownership?: 'application' | 'system' | 'package';
}
export interface EditorAuthorizer {
  can(principal: EditorPrincipal, operation: EditorOperation, scope: EditorScope): boolean;
}
export interface EditorIdentityProvider {
  currentPrincipal(request: IncomingMessage): EditorPrincipal | null;
}
export interface EditorSecurityOptions {
  enabled: boolean;
  environment: string;
  developmentRuntime: boolean;
  origins: string[];
  fixtures: EditorPrincipal[];
  workspace(applicationKey: string): Promise<ArtifactEditorWorkspace>;
  /** Trusted server configuration, never inferred from request paths or emails. */
  ownership?: Record<string, 'application' | 'system' | 'package'>;
  authorizer?: EditorAuthorizer;
  audit?: (event: { action: string; actor?: string; applicationKey?: string; operation?: string }) => void;
  sessionLifetimeMs?: number;
}
interface Session {
  token: string;
  revision: string;
  csrfToken: string;
  subjectId?: string;
  expires: number;
  switching: boolean;
  writes: Set<Promise<unknown>>;
  streams: Set<ServerResponse>;
  known: Map<string, EditorScope>;
}
const token = () => randomBytes(32).toString('hex');
const cookieName = 'uib_editor_session';
const fail = (status: number, code: string, message: string): never => { throw new EditorRequestError(status, code, message); };
const localAddress = (address?: string) => address === '127.0.0.1' || address === '::1' || address === '::ffff:127.0.0.1';
const appKeyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const fixtureAuthorizer: EditorAuthorizer = {
  can(principal, operation, scope) {
    if (!principal.applicationKeys.includes(scope.applicationKey)) return false;
    if (principal.roleIds.includes('admin')) return true;
    if (!principal.roleIds.some(role => ['editor', 'reviewer', 'viewer'].includes(role))) return false;
    if (scope.ownership && scope.ownership !== 'application') return false;
    return operation !== 'edit' || principal.roleIds.includes('editor');
  },
};

function send(res: ServerResponse, status: number, value: unknown) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(JSON.stringify(value));
}
async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []; let size = 0;
  for await (const chunk of req) {
    const bytes = Buffer.from(chunk); size += bytes.length;
    if (size > 2 * 1024 * 1024) fail(413, 'editor.request', 'Editor request is too large.');
    chunks.push(bytes);
  }
  try {
    const result = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error();
    return result;
  } catch { return fail(400, 'editor.request', 'A JSON object is required.'); }
}

/** HTTP/session/policy boundary around the existing workspace; no artifact storage. */
export class ArtifactEditorSecurity implements EditorIdentityProvider {
  private sessions = new Map<string, Session>();
  private principals = new Map<string, EditorPrincipal>();
  private authorizer: EditorAuthorizer;
  private subscriptions = new Set<{ session: Session; res: ServerResponse; appKey?: string; known: Map<string, EditorScope>; pending: Promise<void> }>();
  readonly enabled: boolean;
  constructor(private options: EditorSecurityOptions) {
    if (options.enabled && (options.environment !== 'development' || !options.developmentRuntime)) {
      throw new Error('Fixture authentication requires the development source server.');
    }
    this.enabled = options.enabled;
    for (const origin of options.origins) {
      const url = new URL(origin);
      if (url.origin !== origin || url.protocol !== 'http:' || !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) throw new Error('Editor origins must be explicit loopback HTTP origins.');
    }
    if (this.enabled && !options.origins.length) throw new Error('Editor origins are required.');
    for (const fixture of options.fixtures) {
      if (!fixture.subjectId || this.principals.has(fixture.subjectId) || !fixture.isDevelopmentFixture ||
        !Array.isArray(fixture.roleIds) || fixture.roleIds.some(role => !['admin', 'editor', 'reviewer', 'viewer'].includes(role)) ||
        !Array.isArray(fixture.applicationKeys) || fixture.applicationKeys.some(key => !appKeyPattern.test(key))) throw new Error('Invalid editor fixture configuration.');
      this.principals.set(fixture.subjectId, structuredClone(fixture));
    }
    this.authorizer = options.authorizer ?? fixtureAuthorizer;
  }
  private audit(action: string, principal?: EditorPrincipal | null, scope?: EditorScope, operation?: string) {
    // Audit observers cannot turn a committed save into a failure or leak tokens.
    try { this.options.audit?.({ action, actor: principal?.subjectId, applicationKey: scope?.applicationKey, operation }); } catch { /* observer only */ }
  }
  private boundary(req: IncomingMessage) {
    if (!this.enabled) fail(this.options.environment === 'production' || !this.options.developmentRuntime ? 404 : 401, 'editor.disabled', 'Artifact editor is disabled.');
    if (!localAddress(req.socket.remoteAddress) || req.headers.forwarded || req.headers['x-forwarded-for'] || req.headers['x-forwarded-host']) fail(403, 'editor.local-only', 'Editor requires a direct local connection.');
    const origin = `http://${req.headers.host ?? ''}`;
    if (!this.options.origins.includes(origin)) fail(403, 'editor.origin', 'Untrusted editor host.');
    if (req.headers.origin && req.headers.origin !== origin) fail(403, 'editor.origin', 'Cross-origin editor access is forbidden.');
    if (req.headers['sec-fetch-site'] && !['same-origin', 'none'].includes(String(req.headers['sec-fetch-site']))) fail(403, 'editor.origin', 'Cross-origin editor access is forbidden.');
  }
  private session(req: IncomingMessage): Session | undefined {
    const values = (req.headers.cookie ?? '').split(';').map(value => value.trim()).filter(value => value.startsWith(`${cookieName}=`));
    if (values.length !== 1) return undefined;
    const session = this.sessions.get(values[0].slice(cookieName.length + 1));
    if (session && session.expires <= Date.now()) { this.expire(session); return undefined; }
    return session;
  }
  private expire(session: Session) {
    session.revision = token(); session.subjectId = undefined;
    for (const stream of session.streams) stream.end();
    this.sessions.delete(session.token);
  }
  currentPrincipal(req: IncomingMessage): EditorPrincipal | null {
    const session = this.session(req);
    const principal = session?.subjectId ? this.principals.get(session.subjectId) : undefined;
    return principal && !session?.switching ? structuredClone(principal) : null;
  }
  private requireSession(req: IncomingMessage) {
    const session = this.session(req);
    if (!session) return fail(401, 'editor.unauthorized', 'Select a development identity.');
    return session;
  }
  private assertCurrent(req: IncomingMessage, session: Session, revision = session.revision) {
    if (session.expires <= Date.now()) { this.expire(session); fail(401, 'editor.unauthorized', 'Editor session expired.'); }
    if (session.switching || session.revision !== revision || req.headers['x-editor-revision'] !== revision) fail(403, 'editor.session-changed', 'Editor identity changed. Reopen the editor before saving.');
    const principal = this.currentPrincipal(req);
    if (!principal) return fail(401, 'editor.unauthorized', 'Select a development identity.');
    return principal;
  }
  private csrf(req: IncomingMessage, session: Session) {
    if (req.headers.origin !== `http://${req.headers.host}` || req.headers['x-editor-csrf'] !== session.csrfToken || !req.headers['content-type']?.startsWith('application/json')) fail(403, 'editor.csrf', 'Editor mutation requires same-origin CSRF protection.');
  }
  private allowed(principal: EditorPrincipal, operation: EditorOperation, scope: EditorScope) {
    return this.authorizer.can(principal, operation, scope);
  }
  private authorize(principal: EditorPrincipal, operation: EditorOperation, scope: EditorScope) {
    if (!this.allowed(principal, operation, scope)) { this.audit('denied', principal, scope, operation); fail(403, 'editor.forbidden', 'Editor operation is not permitted.'); }
  }
  private scope(appKey: string, artifact: EditorArtifactDto): EditorScope {
    const type = artifact.manifest?.artifactType, id = artifact.manifest?.artifactId;
    // Unknown/malformed and Trigger artifacts are restricted by default. Ownership
    // is policy metadata, never a path or client-supplied manifest property.
    const ownership = (id && this.options.ownership?.[`${appKey}:${id}`]) ||
      (type && ['form', 'route', 'routeGroup', 'page', 'schema', 'template', 'email-template', 'hero', 'workflow', 'css'].includes(type) ? 'application' : 'system');
    return { applicationKey: appKey, artifactId: id, artifactType: type, ownership };
  }
  private sessionDto(session: Session): EditorSessionDto {
    return { revision: session.revision, csrfToken: session.csrfToken,
      principal: structuredClone(session.subjectId ? this.principals.get(session.subjectId) ?? null : null),
      fixtures: [...this.principals.values()].map(value => ({ id: value.subjectId, label: value.label })) };
  }
  /** Server-side revocation. Stops admission immediately, then drains admitted writes. */
  async revoke(subjectId: string) {
    this.principals.delete(subjectId);
    const affected = [...this.sessions.values()].filter(session => session.subjectId === subjectId);
    for (const session of affected) { session.switching = true; session.revision = token(); for (const stream of session.streams) stream.end(); }
    await Promise.all(affected.flatMap(session => [...session.writes]));
    for (const session of affected) this.expire(session);
    this.audit('revoked', { subjectId } as EditorPrincipal);
  }
  private async select(req: IncomingMessage, res: ServerResponse, session: Session) {
    this.csrf(req, session);
    const revision = session.revision;
    if (session.switching || req.headers['x-editor-revision'] !== revision) fail(403, 'editor.session-changed', 'Editor identity changed. Refresh the identity selector.');
    const input = await readBody(req);
    if (session.switching || session.revision !== revision) fail(403, 'editor.session-changed', 'Editor identity changed.');
    const principal = req.method === 'DELETE' ? undefined : typeof input.fixtureId === 'string' ? this.principals.get(input.fixtureId) : undefined;
    if (req.method !== 'DELETE' && !principal) fail(400, 'editor.fixture', 'Select a configured fixture identity.');
    session.switching = true; session.revision = token(); session.known.clear();
    for (const stream of session.streams) stream.end();
    // This is an authorization admission barrier, not another artifact save queue.
    // A save already admitted to Foundation finishes before the switch is acknowledged.
    await Promise.all([...session.writes]);
    session.subjectId = principal?.subjectId; session.switching = false;
    this.audit('identity-selected', principal);
    send(res, 200, this.sessionDto(session));
  }
  private async visible(workspace: ArtifactEditorWorkspace, principal: EditorPrincipal) {
    const artifacts = await Promise.all((await workspace.discover()).map(summary => workspace.load(summary.locator)));
    const visible = artifacts.filter(artifact => this.allowed(principal, 'read', this.scope(workspace.appKey, artifact)) && this.allowed(principal, 'validate', this.scope(workspace.appKey, artifact)));
    const counts = new Map<string, number>();
    for (const artifact of artifacts) if (artifact.manifest) counts.set(artifact.manifest.artifactId, (counts.get(artifact.manifest.artifactId) ?? 0) + 1);
    return { artifacts, visible, ids: new Set(visible.flatMap(artifact => artifact.manifest && counts.get(artifact.manifest.artifactId) === 1 ? [artifact.manifest.artifactId] : [])) };
  }
  private validation(value: ArtifactValidationResult, workspace: ArtifactEditorWorkspace, hiddenIds: string[]) {
    return { ...value, diagnostics: value.diagnostics.map(diagnostic => {
      const serialized = JSON.stringify(diagnostic);
      if (hiddenIds.some(id => serialized.includes(id)) || serialized.includes(workspace.root) || /(?:[A-Za-z]:[\\/]|\/Users\/|\/home\/|\/tmp\/)/.test(serialized)) {
        return { severity: diagnostic.severity, code: diagnostic.code, message: 'Diagnostic details are restricted.' };
      }
      return diagnostic;
    }) };
  }
  private async project(workspace: ArtifactEditorWorkspace, principal: EditorPrincipal, artifact: EditorArtifactDto) {
    const { artifacts, ids } = await this.visible(workspace, principal);
    const hidden = artifacts.flatMap(item => item.manifest && !ids.has(item.manifest.artifactId) ? [item.manifest.artifactId] : []);
    const scope = this.scope(workspace.appKey, artifact);
    return { ...artifact, capabilities: { ...artifact.capabilities, edit: artifact.capabilities.edit && this.allowed(principal, 'edit', scope) },
      references: { outgoing: artifact.references.outgoing.filter(reference => ids.has(reference.artifactId)) },
      validation: this.validation(artifact.validation, workspace, hidden) };
  }
  private remember(session: Session, key: string, scope: EditorScope) {
    session.known.set(key, scope);
    for (const subscription of this.subscriptions) if (subscription.session === session) subscription.known.set(key, scope);
  }
  private subscribe(req: IncomingMessage, res: ServerResponse, session: Session, appKey?: string) {
    const principal = this.currentPrincipal(req);
    if (!principal || session.switching) fail(401, 'editor.unauthorized', 'Select a development identity.');
    if (appKey) this.authorize(principal!, 'discover', { applicationKey: appKey });
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
    res.write('event: ready\ndata: {}\n\n');
    const subscription = { session, res, appKey, known: new Map(session.known), pending: Promise.resolve() };
    this.subscriptions.add(subscription); session.streams.add(res);
    const timer = setTimeout(() => { this.expire(session); }, Math.max(1, session.expires - Date.now())); timer.unref();
    res.on('close', () => { clearTimeout(timer); session.streams.delete(res); this.subscriptions.delete(subscription); });
  }
  publish(event: EditorWatchEvent) {
    for (const subscription of this.subscriptions) {
      const { session, res, appKey } = subscription;
      const revision = session.revision;
      if (appKey && appKey !== event.appKey) continue;
      if (event.kind === 'removed') session.known.delete(`${event.appKey}:${event.locator}`);
      subscription.pending = subscription.pending.then(async () => {
        const principal = session.subjectId && this.principals.get(session.subjectId);
        if (!principal || session.switching || session.expires <= Date.now() || session.revision !== revision || res.writableEnded || !this.allowed(principal, 'discover', { applicationKey: event.appKey })) return;
        const key = `${event.appKey}:${event.locator}`;
        let scope: EditorScope | undefined;
        if (event.kind === 'removed') scope = subscription.known.get(key);
        else {
          const workspace = await this.options.workspace(event.appKey);
          scope = this.scope(event.appKey, await workspace.load(event.locator));
        }
        if (!scope || !this.allowed(principal, 'read', scope)) { subscription.known.delete(key); return; }
        if (session.switching || session.revision !== revision || res.writableEnded) return;
        if (event.kind === 'removed') subscription.known.delete(key); else { subscription.known.set(key, scope); session.known.set(key, scope); }
        res.write(`event: artifact-change\ndata: ${JSON.stringify(event)}\n\n`);
      }).catch(() => { /* Fail closed; never send paths/errors in SSE. */ });
    }
  }
  publishWorkspaceChange() {
    // No app details; subscribers still need a live identity. Artifact events use publish().
    for (const { session, res } of this.subscriptions) if (!session.switching && session.expires > Date.now() && session.subjectId && this.principals.has(session.subjectId)) res.write('event: workspace-change\ndata: {}\n\n');
  }
  close() { for (const session of this.sessions.values()) this.expire(session); }
  async handle(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
    const url = new URL(req.url ?? '/', 'http://localhost');
    const parts = url.pathname.split('/').filter(Boolean);
    const isSession = url.pathname === '/api/editor/session';
    const isEvents = url.pathname === '/api/events';
    const isArtifact = parts[0] === 'api' && parts[1] === 'apps' && parts[3] === 'artifacts';
    const isApi = parts[0] === 'api';
    if (!isSession && !isEvents && !isArtifact && !(this.enabled && isApi)) return false;
    try {
      this.boundary(req);
      if (this.enabled && isApi && !isSession && !isEvents && !isArtifact) {
        if (req.method === 'GET' && ['/api/health', '/api/templates', '/api/components'].includes(url.pathname)) return false;
        this.requireSession(req);
        const principal = this.currentPrincipal(req);
        if (!principal) fail(401, 'editor.unauthorized', 'Select a development identity.');
        this.audit('legacy-route-denied', principal, undefined, req.method);
        fail(403, 'editor.legacy-disabled', 'This management route is unavailable while fixture authorization is enabled.');
      }
      if (isSession && req.method === 'GET') {
        // Bound anonymous session allocation and clean up expired sessions.
        for (const current of this.sessions.values()) if (current.expires <= Date.now()) this.expire(current);
        let session = this.session(req);
        if (!session) {
          if (this.sessions.size >= 256) fail(503, 'editor.sessions', 'Too many development sessions.');
          session = { token: token(), revision: token(), csrfToken: token(), expires: Date.now() + (this.options.sessionLifetimeMs ?? 8 * 60 * 60 * 1000), switching: false, writes: new Set(), streams: new Set(), known: new Map() };
          this.sessions.set(session.token, session);
          res.setHeader('set-cookie', `${cookieName}=${session.token}; HttpOnly; SameSite=Strict; Path=/api`);
        }
        if (session.switching) fail(403, 'editor.session-changed', 'Identity change is in progress.');
        send(res, 200, this.sessionDto(session)); return true;
      }
      const session = this.requireSession(req);
      if (isSession) {
        if (req.method !== 'POST' && req.method !== 'DELETE') fail(405, 'editor.method', 'Method is not supported.');
        await this.select(req, res, session); return true;
      }
      if (isEvents) {
        if (req.method !== 'GET') fail(405, 'editor.method', 'Method is not supported.');
        this.subscribe(req, res, session, url.searchParams.get('appKey') ?? undefined); return true;
      }
      const principal = this.assertCurrent(req, session), revision = session.revision;
      const appKey = decodeURIComponent(parts[2]);
      if (!appKeyPattern.test(appKey)) fail(400, 'editor.application', 'Invalid application key.');
      this.authorize(principal, 'discover', { applicationKey: appKey });
      const workspace = await this.options.workspace(appKey);
      if (parts.length === 4 && req.method === 'GET') {
        const { artifacts, visible, ids } = await this.visible(workspace, principal);
        const hidden = artifacts.flatMap(item => item.manifest && !ids.has(item.manifest.artifactId) ? [item.manifest.artifactId] : []);
        this.assertCurrent(req, session, revision);
        for (const artifact of visible) this.remember(session, `${appKey}:${artifact.locator}`, this.scope(appKey, artifact));
        send(res, 200, visible.map(artifact => ({ locator: artifact.locator, artifactId: artifact.manifest?.artifactId, artifactType: artifact.manifest?.artifactType, name: artifact.manifest?.name, validation: this.validation(artifact.validation, workspace, hidden) }))); return true;
      }
      const locator = parts[4] && decodeURIComponent(parts[4]);
      if (!locator) fail(404, 'editor.not-found', 'Artifact was not found.');
      const operation: EditorOperation = req.method === 'PUT' && parts.length === 5 ? 'edit' : req.method === 'GET' && parts.length === 5 ? 'read' : req.method === 'GET' && parts.length === 6 && parts[5] === 'validation' ? 'validate' : req.method === 'GET' && parts.length === 6 && parts[5] === 'references' ? 'references' : fail(404, 'editor.not-found', 'Editor endpoint was not found.');
      const artifact = await workspace.load(locator);
      const scope = this.scope(appKey, artifact);
      this.authorize(principal, 'read', scope); this.authorize(principal, operation, scope);
      // Load/save DTOs include both diagnostics and references. Deny the aggregate
      // operation when a custom policy disallows one of those embedded results.
      if (operation === 'read' || operation === 'edit') {
        this.authorize(principal, 'validate', scope); this.authorize(principal, 'references', scope);
      }
      this.remember(session, `${appKey}:${locator}`, scope);
      if (operation === 'edit') {
        this.csrf(req, session);
        const input = await readBody(req);
        if (!principal.roleIds.includes('admin') && input.manifest !== undefined) {
          let manifest;
          try { manifest = typeof input.manifest === 'string' ? JSON.parse(input.manifest) : input.manifest; } catch { manifest = null; }
          // Identity/type changes require administrative policy review. Invalid raw
          // manifests remain repairable by admins; invalid declared files can autosave.
          if (!manifest || typeof manifest !== 'object' || manifest.artifactId !== artifact.manifest?.artifactId || manifest.artifactType !== artifact.manifest?.artifactType) fail(403, 'editor.identity', 'Changing or invalidating artifact identity requires an administrator.');
        }
        this.assertCurrent(req, session, revision);
        this.authorize(this.currentPrincipal(req)!, 'edit', scope);
        // Use the checksum observed during authorization, preventing a type/identity
        // change between the authorization read and Foundation's atomic save.
        if (input.expectedChecksum !== artifact.checksum) {
          if (typeof input.expectedChecksum !== 'string' || !input.expectedChecksum) fail(400, 'editor.checksum', 'expectedChecksum is required.');
          fail(409, 'editor.conflict', 'Artifact changed on disk. Reload or resolve the conflict.');
        }
        const save = workspace.save(locator, input);
        const settled = save.then(() => undefined, () => undefined);
        session.writes.add(settled);
        let result;
        try { result = await save; this.audit('mutation', principal, scope, 'edit'); }
        finally { session.writes.delete(settled); }
        this.assertCurrent(req, session, revision);
        const projected = await this.project(workspace, principal, result.artifact);
        this.assertCurrent(req, session, revision);
        send(res, 200, { saved: result.saved, artifact: projected, validation: projected.validation }); return true;
      }
      // load() already returns authoritative saved-source validation/references.
      // Use that same authorized snapshot: a second read could race an external
      // change to a restricted artifact type after the scope check.
      const projected = await this.project(workspace, principal, artifact);
      this.assertCurrent(req, session, revision);
      this.authorize(principal, 'read', scope); this.authorize(principal, operation, scope);
      send(res, 200, operation === 'validate' ? projected.validation : operation === 'references' ? projected.references : projected);
    } catch (error) {
      const failure = editorError(error);
      this.audit('request-denied', this.currentPrincipal(req), undefined, req.method);
      // Foundation rejection details may include paths or protected references.
      send(res, failure.status, { code: failure.body.code, error: failure.body.error });
    }
    return true;
  }
}
