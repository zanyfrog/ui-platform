import { afterEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { ArtifactEditorWorkspace } from '../src/server/artifact-editor.js';
import { ArtifactEditorSecurity, fixtureAuthorizer, type EditorSecurityOptions } from '../src/server/editor-security.js';
import { editorSecurityConfig } from '../src/server/editor-security-config.js';
import type { EditorSessionDto } from '../src/shared/editor-security.js';
import { SecurityDefinitionService, SecurityDefinitionStore, parseSecurityDocument, reconcileSecurityDirectory, securityChecksum } from '@ui-platform/i-am/definitions';
import { SecurityAuthorizationEvaluator, wp1StorePolicyAuthority } from '@ui-platform/i-am/evaluator';
import { SecurityAdministrationService } from '@ui-platform/i-am/administration';

const cleanups: (() => Promise<unknown>)[] = [];
afterEach(async () => { vi.restoreAllMocks(); for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });
const principal = (role: string, apps = ['alpha']) => ({ subjectId: `dev-${role}`, label: `${role}@uib.test`, roleIds: [role], applicationKeys: apps, isDevelopmentFixture: true });
function deferred() { let resolve!: () => void; const promise = new Promise<void>(done => { resolve = done; }); return { promise, resolve }; }

async function fixture(overrides: Partial<EditorSecurityOptions> = {}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'editor-security-'));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  const workspaces = new Map<string, ArtifactEditorWorkspace>();
  let security!: ArtifactEditorSecurity;
  for (const appKey of ['alpha', 'beta']) {
    const appRoot = path.join(root, appKey);
    for (const [id, type] of [['public-form', 'form'], ['secret-trigger', 'trigger'], ['linked-route', 'route']]) {
      const bundle = path.join(appRoot, id); await mkdir(bundle, { recursive: true });
      await writeFile(path.join(bundle, 'artifact.json'), JSON.stringify({ schemaVersion: 1, definitionVersion: 1, artifactId: id, artifactType: type, name: id,
        files: type === 'form' ? { definition: 'form.json' } : {}, config: type === 'route' ? { path: '/', page: 'secret-trigger' } : {} }));
      if (type === 'form') await writeFile(path.join(bundle, 'form.json'), '{"fields":[]}');
    }
    workspaces.set(appKey, new ArtifactEditorWorkspace(appRoot, appKey, event => security.publish(event), undefined, console.error, overrides.securityDefinitions ? {
      stage: (text, actorId) => {
        const parsed = parseSecurityDocument(text);
        const old = parsed.document && overrides.securityDefinitions!.active().find(item => item.definition.id === parsed.document!.definition.id);
        return overrides.securityDefinitions!.stageText({ text, expectedChecksum: old && securityChecksum(old), source: 'ui', actorId, idempotencyKey: randomUUID(), expectedRevision: overrides.securityDefinitions!.revision() });
      },
    } : undefined));
  }
  const server = http.createServer((req, res) => { void security.handle(req, res).then(handled => { if (!handled) {
    const url = new URL(req.url ?? '/', 'http://localhost');
    if (req.method === 'GET' && url.pathname === '/api/health') { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"ok":true}'); return; }
    if (req.method === 'GET' && ['/api/templates', '/api/components'].includes(url.pathname)) { res.writeHead(200, { 'content-type': 'application/json' }); res.end('[]'); return; }
    res.writeHead(404, { 'content-type': 'application/json' }); res.end('{"error":"Not found"}');
  } }); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address() as { port: number }, origin = `http://127.0.0.1:${address.port}`;
  const audit = vi.fn();
  security = new ArtifactEditorSecurity({ enabled: true, environment: 'development', developmentRuntime: true, origins: [origin],
    fixtures: ['admin', 'editor', 'reviewer', 'viewer'].map(role => principal(role, role === 'admin' ? ['alpha', 'beta'] : ['alpha'])),
    workspace: async key => { const workspace = workspaces.get(key); if (!workspace) throw new Error('Private path should never escape'); return workspace; }, audit, ...overrides });
  cleanups.push(async () => { security.close(); server.closeAllConnections(); await new Promise<void>(resolve => server.close(() => resolve())); });
  async function request(endpoint: string, options: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
    return new Promise<{ status: number; body: any; cookie?: string; cookieHeader?: string }>((resolve, reject) => {
      const payload = options.body === undefined ? undefined : JSON.stringify(options.body);
      const req = http.request(origin + endpoint, { method: options.method ?? 'GET', headers: { ...options.headers, ...(payload === undefined ? {} : { 'content-length': String(Buffer.byteLength(payload)) }) } }, response => {
        let text = ''; response.on('data', chunk => { text += String(chunk); });
        response.on('end', () => { try { const cookieHeader = response.headers['set-cookie']?.[0]; resolve({ status: response.statusCode!, body: JSON.parse(text), cookie: cookieHeader?.split(';')[0], cookieHeader }); } catch (error) { reject(error); } });
      });
      req.on('error', reject); req.end(payload);
    });
  }
  async function client(role?: string) {
    const initial = await request('/api/editor/session');
    const cookie = initial.cookie!; let session: EditorSessionDto = initial.body;
    const headers = () => ({ cookie, origin, 'content-type': 'application/json', 'x-editor-csrf': session.csrfToken, 'x-editor-revision': session.revision });
    const call = (endpoint: string, method = 'GET', body?: unknown, extra: Record<string, string> = {}) => request(endpoint, { method, body, headers: { ...headers(), ...extra } });
    async function select(role: string | null) {
      const response = await call('/api/editor/session', role === null ? 'DELETE' : 'POST', { fixtureId: role ? `dev-${role}` : null });
      if (response.status === 200) session = response.body;
      return response;
    }
    if (role) expect((await select(role)).status).toBe(200);
    return { cookie, initial, headers, call, select };
  }
  async function locator(id: string, appKey = 'alpha') { return (await workspaces.get(appKey)!.discover()).find(item => item.artifactId === id)!.locator; }
  async function stream(headers: Record<string, string>, appKey?: string) {
    let text = '', ended = false;
    const response = await new Promise<http.IncomingMessage>((resolve, reject) => {
      const req = http.get(origin + '/api/events' + (appKey ? `?appKey=${appKey}` : ''), { headers }, resolve); req.on('error', reject);
    });
    response.on('data', chunk => { text += String(chunk); }); response.on('end', () => { ended = true; });
    cleanups.push(async () => { response.destroy(); });
    return { response, text: () => text, ended: () => ended };
  }
  return { root, security, workspaces, request, client, locator, stream, audit, origin };
}

describe('editor HTTP authorization around the real workspace', () => {
  it('uses the WP3 graph and durable gate for real HTTP security activation, independent of fixture admin labels', async () => {
    const dbRoot = await mkdtemp(path.join(os.tmpdir(), 'iam-wp3-http-')); cleanups.push(() => rm(dbRoot, { recursive: true, force: true }));
    const store = new SecurityDefinitionStore(path.join(dbRoot, 'security.sqlite')); cleanups.push(async () => store.close());
    const definitions = new SecurityDefinitionService(store);
    const system = { authorityId: 'resources', applicationId: null, kind: 'system' as const, id: 'system' };
    const application = { authorityId: 'resources', applicationId: 'alpha', kind: 'application' as const, id: 'alpha' };
    const scope = { resource: application, descendants: true };
    const owner = { kind: 'application' as const, applicationId: 'alpha' };
    const initial = [
      ...['dev-admin', 'dev-editor'].map(id => ({ kind: 'user', id, displayName: id, status: 'active' })),
      { kind: 'permission', id: 'p-security', key: 'security', name: 'Security', status: 'active', owner, lifecycle: 'active', applicableKinds: ['application'] },
      { kind: 'permission-set', id: 'set-security', key: 'set-security', name: 'Security', status: 'active', owner, includes: [], rules: [{ id: 'rule-security', permissionId: 'p-security', effect: 'allow', scope: { resource: application, descendants: false } }] },
      { kind: 'role', id: 'role-security', key: 'role-security', name: 'Security', status: 'active', owner, permissionSets: [{ id: 'set-security' }] },
      { kind: 'role-assignment', id: 'assignment-editor', userId: 'dev-editor', roleId: 'role-security', status: 'active', scope, startsAt: '2026-01-01T00:00:00Z', endsAt: null },
      { kind: 'application-security', id: 'alpha', key: 'alpha', name: 'Application', status: 'active', owner, requiredAdministratorPermissionId: 'p-security', sharedPackages: [] },
      { kind: 'grant-boundary', id: 'boundary-security', key: 'boundary-security', name: 'Boundary', status: 'active', owner: { kind: 'platform' }, beneficiary: { kind: 'role', id: 'role-security' }, scope, operations: ['create', 'edit', 'assign', 'revoke', 'activate', 'archive'], permissions: [{ permissionId: 'p-security', scope, predicateTemplateIds: [] }], serviceUseApprovalIds: [] },
    ];
    const seed = definitions.stage({ changes: initial.map(definition => ({ document: { format: 'ui-platform.security', formatVersion: 1, definition } as never })), expectedRevision: 0, source: 'api', actorId: 'trusted-seed', idempotencyKey: randomUUID() });
    expect(seed.diagnostics).toEqual([]);
    expect(definitions.activate(seed.id, seed.checksum, 'trusted-seed')).toMatchObject({ status: 'activated', revision: 1 });
    const attested = new WeakSet<object>();
    const actorId = (context: any) => { if (!context?.isDevelopmentFixture || !['dev-admin', 'dev-editor'].includes(context.subjectId)) throw new Error('UNTRUSTED'); return context.subjectId as string; };
    const identity = {
      async verify(context: unknown) { return { actorId: actorId(context), principalRevision: 'principal-1', sessionRevision: 'session-1' }; },
      attestDecisionRequest(context: unknown, resource: any, permissionId: string, operationId: string) { const request = { context, resource, permissionId, operationId, fields: [] }; attested.add(request); return request; },
    };
    const evaluator = new SecurityAuthorizationEvaluator({ policy: wp1StorePolicyAuthority(store), identity: {
      async verify(context) { return { principal: { type: 'user' as const, id: actorId(context) }, principalRevision: 'principal-1', sessionRevision: 'session-1' }; },
      async assertRequest(request) { if (!attested.has(request)) throw new Error('UNATTESTED'); },
    }, resources: { async revision() { return 'resources-1'; }, async resolve(ref) { for (const item of [{ ref: system }, { ref: application, parent: system }]) if (JSON.stringify(ref) === JSON.stringify(item.ref)) return { ...item, status: 'active' as const }; return undefined; } },
      facts: { async revision() { return 'facts-1'; }, async resolve() { return { present: false as const }; } }, clock: () => new Date('2026-06-01T00:00:00Z') });
    const administration = new SecurityAdministrationService(definitions, evaluator, identity, { async verify() { throw new Error('RECOVERY_DISABLED'); } }, {
      contains(ceiling, requested) { const a = ceiling.resource, b = requested.resource; return a.authorityId === b.authorityId && a.id === b.id && a.kind === b.kind && (ceiling.descendants || !requested.descendants); },
      permitsPredicate() { return false; },
    }, { resourceAuthorityId: 'resources', systemResourceId: 'system', platformAdministratorPermissionId: 'p-platform', recoveryCapabilityId: 'recovery-1', deploymentId: 'deployment-1', clock: () => new Date('2026-06-01T00:00:00Z') });
    const f = await fixture({ securityDefinitions: definitions, securityAdministration: administration });
    const document = { format: 'ui-platform.security', formatVersion: 1, definition: { kind: 'role', id: 'new-role', key: 'new-role', name: 'New Role', status: 'active', owner, permissionSets: [] } };
    const appAdmin = await f.client('admin'), securityAdmin = await f.client('editor');
    const stage = await appAdmin.call('/api/apps/alpha/security/stage', 'POST', { text: JSON.stringify(document), expectedRevision: 1, idempotencyKey: randomUUID() });
    expect(stage.body.activatable).toBe(true);
    expect(definitions.revision()).toBe(1);
    const body = { candidateId: stage.body.id, checksum: stage.body.checksum, expectedRevision: 1, reason: 'reviewed role creation' };
    expect((await appAdmin.call('/api/apps/alpha/security/activate', 'POST', body)).body.status).toBe('rejected');
    expect((await securityAdmin.call('/api/apps/alpha/security/activate', 'POST', body)).body.status).toBe('activated');
    expect(administration.audit()).toMatchObject([{ actorId: 'dev-editor', revision: 2, targetIds: ['new-role'] }]);
    const assignmentDocument = { format: 'ui-platform.security', formatVersion: 1, definition: { kind: 'role-assignment', id: 'assignment-admin', userId: 'dev-admin', roleId: 'role-security', status: 'active', scope, startsAt: '2026-01-01T00:00:00Z', endsAt: null } };
    const stagedAssignment = await securityAdmin.call('/api/apps/alpha/security/stage', 'POST', { text: JSON.stringify(assignmentDocument), expectedRevision: 2, idempotencyKey: randomUUID() });
    expect(stagedAssignment.status).toBe(200);
    expect(stagedAssignment.body.activatable).toBe(true);
    expect((await securityAdmin.call('/api/apps/alpha/security/activate', 'POST', { candidateId: stagedAssignment.body.id, checksum: stagedAssignment.body.checksum, expectedRevision: 2, reason: 'approved administrator assignment' })).body.status).toBe('activated');
    expect(administration.audit()).toMatchObject([{ actorId: 'dev-editor', revision: 2 }, { actorId: 'dev-editor', revision: 3, targetIds: ['assignment-admin'] }]);
  });
  it('stages and explicitly activates a WP1 application draft only through a development administrator session', async () => {
    const dbRoot = await mkdtemp(path.join(os.tmpdir(), 'iam-http-stage-')); cleanups.push(() => rm(dbRoot, { recursive: true, force: true }));
    const store = new SecurityDefinitionStore(path.join(dbRoot, 'security.sqlite')); cleanups.push(async () => store.close());
    const service = new SecurityDefinitionService(store), f = await fixture({ securityDefinitions: service });
    const document = { format: 'ui-platform.security', formatVersion: 1, definition: { kind: 'role', id: 'role-a', key: 'reader', name: 'Reader', status: 'active', owner: { kind: 'application', applicationId: 'alpha' }, permissionSets: [] } };
    const route = '/api/apps/alpha/security/stage';
    expect((await f.request(route, { method: 'POST', body: { text: JSON.stringify(document), expectedRevision: 0, idempotencyKey: 'stage-a' } })).status).toBe(401);
    const editor = await f.client('editor');
    expect((await editor.call(route, 'POST', { text: JSON.stringify(document), expectedRevision: 0, idempotencyKey: 'stage-editor' })).status).toBe(403);
    const admin = await f.client('admin');
    expect((await admin.call(route, 'POST', { text: JSON.stringify(document), expectedRevision: 0, idempotencyKey: 'stage-no-csrf' }, { 'x-editor-csrf': 'wrong' })).status).toBe(403);
    const staged = await admin.call(route, 'POST', { text: JSON.stringify(document), expectedRevision: 0, idempotencyKey: 'stage-a' });
    expect(staged.status).toBe(200); expect(staged.body.activatable).toBe(true); expect(service.revision()).toBe(0);
    expect(service.candidateRequest(staged.body.id)?.actorId).toBe('dev-admin');
    const activation = await admin.call('/api/apps/alpha/security/activate', 'POST', { candidateId: staged.body.id, checksum: staged.body.checksum });
    expect(activation.status).toBe(200); expect(activation.body).toMatchObject({ status: 'activated', revision: 1 });
    expect(service.audit()).toMatchObject([{ actorId: 'dev-admin', source: 'api' }]);
    expect((await admin.call('/api/apps/beta/security/activate', 'POST', { candidateId: staged.body.id, checksum: staged.body.checksum })).status).toBe(403);
    const uiBundle = path.join(f.root, 'alpha', 'role-ui'); await mkdir(uiBundle);
    const uiDocument = { ...document, definition: { ...document.definition, id: 'role-ui', key: 'role-ui', name: 'UI Role' } };
    await writeFile(path.join(uiBundle, 'artifact.json'), JSON.stringify({ schemaVersion: 1, artifactId: 'role-ui', artifactType: 'security.role', name: 'UI Role', definitionVersion: 1, files: { definition: 'definition.json' } }));
    await writeFile(path.join(uiBundle, 'definition.json'), JSON.stringify(uiDocument));
    const uiLocator = await f.locator('role-ui'), uiRoute = `/api/apps/alpha/artifacts/${uiLocator}`;
    const loaded = await admin.call(uiRoute);
    const saved = await admin.call(uiRoute, 'PUT', { expectedChecksum: loaded.body.checksum, files: { 'definition.json': JSON.stringify({ ...uiDocument, definition: { ...uiDocument.definition, name: 'Edited UI Role' } }) } });
    expect(saved.status).toBe(200); expect(saved.body.securityStageStatus).toBe('staged'); expect(saved.body.securityCandidate.activatable).toBe(true);
    expect(service.candidateRequest(saved.body.securityCandidate.id)?.source).toBe('ui');
    expect(service.revision()).toBe(1);
    expect(() => new ArtifactEditorSecurity({ enabled: false, environment: 'production', developmentRuntime: false, origins: [], fixtures: [], workspace: async () => { throw new Error(); }, securityDefinitions: service })).toThrow('requires the authenticated development source server');
  });
  it('requires an authenticated explicit activation after filesystem reconciliation', async () => {
    const dbRoot = await mkdtemp(path.join(os.tmpdir(), 'iam-reconcile-http-')); cleanups.push(() => rm(dbRoot, { recursive: true, force: true }));
    const store = new SecurityDefinitionStore(path.join(dbRoot, 'security.sqlite')); cleanups.push(async () => store.close());
    const service = new SecurityDefinitionService(store), f = await fixture({ securityDefinitions: service });
    const bundle = path.join(dbRoot, 'source', 'role-a'); await mkdir(bundle, { recursive: true });
    const document = { format: 'ui-platform.security', formatVersion: 1, definition: { kind: 'role', id: 'role-a', key: 'reader', name: 'Reader', status: 'active', owner: { kind: 'application', applicationId: 'alpha' }, permissionSets: [] } };
    await writeFile(path.join(bundle, 'artifact.json'), JSON.stringify({ schemaVersion: 1, artifactId: 'role-a', artifactType: 'security.role', name: 'Reader', definitionVersion: 1, files: { definition: 'definition.json' } }));
    await writeFile(path.join(bundle, 'definition.json'), JSON.stringify(document));
    const candidates: Array<{ id: string; checksum: string }> = [];
    const watcher = reconcileSecurityDirectory(path.join(dbRoot, 'source'), service, event => { if (event.candidate) candidates.push(event.candidate); });
    cleanups.push(async () => watcher.close());
    expect(candidates).toHaveLength(1);
    expect(service.candidateRequest(candidates[0].id)?.actorId).toBe('unverified-file');
    expect(service.revision()).toBe(0);
    const admin = await f.client('admin');
    const activated = await admin.call('/api/apps/alpha/security/activate', 'POST', { candidateId: candidates[0].id, checksum: candidates[0].checksum });
    expect(activated.body).toMatchObject({ status: 'activated', revision: 1 });
    expect(service.audit()).toMatchObject([{ actorId: 'dev-admin', source: 'text-reconcile' }]);
  });
  it('rejects every unauthenticated artifact endpoint and SSE without trusting identity headers', async () => {
    const f = await fixture(), id = await f.locator('public-form');
    for (const [endpoint, method] of [[`/api/apps/alpha/artifacts`, 'GET'], [`/api/apps/alpha/artifacts/${id}`, 'GET'], [`/api/apps/alpha/artifacts/${id}`, 'PUT'], [`/api/apps/alpha/artifacts/${id}/validation`, 'GET'], [`/api/apps/alpha/artifacts/${id}/references`, 'GET'], ['/api/events', 'GET']]) {
      const response = await f.request(endpoint, { method, headers: { 'x-user-email': 'admin@uib.test', authorization: 'admin' } });
      expect(response.status).toBe(401); expect(JSON.stringify(response.body)).not.toContain(f.root);
    }
    const anonymous = await f.client();
    expect(anonymous.initial.body.principal).toBeNull();
    expect(anonymous.initial.cookieHeader).toContain('HttpOnly; SameSite=Strict; Path=/api');
    expect((await anonymous.call('/api/apps/alpha/artifacts')).status).toBe(401);
    expect((await anonymous.call('/api/editor/session', 'POST', { email: 'admin@uib.test' })).status).toBe(400);
  });
  it.each(['viewer', 'reviewer'])('%s reads and validates but cannot mutate even with a valid checksum', async role => {
    const f = await fixture(), client = await f.client(role), id = await f.locator('public-form'), endpoint = `/api/apps/alpha/artifacts/${id}`;
    const loaded = await client.call(endpoint); expect(loaded.status).toBe(200); expect(loaded.body.capabilities.edit).toBe(false);
    expect((await client.call(endpoint + '/validation')).status).toBe(200);
    expect((await client.call(endpoint + '/references')).status).toBe(200);
    expect((await client.call(endpoint, 'PUT', { expectedChecksum: loaded.body.checksum, files: { 'form.json': '{}' } })).status).toBe(403);
    expect((await client.call(endpoint, 'PUT', { expectedChecksum: 'stale' })).status).toBe(403);
    expect(await readFile(path.join(f.root, 'alpha/public-form/form.json'), 'utf8')).toBe('{"fields":[]}');
  });
  it('filters discovery, references and diagnostics and denies restricted operations', async () => {
    const f = await fixture(), client = await f.client('editor'), secret = await f.locator('secret-trigger'), route = await f.locator('linked-route');
    const discovery = await client.call('/api/apps/alpha/artifacts');
    expect(discovery.body.map((item: { artifactId: string }) => item.artifactId)).toEqual(expect.arrayContaining(['public-form', 'linked-route']));
    expect(JSON.stringify(discovery.body)).not.toContain('secret-trigger');
    for (const suffix of ['', '/validation', '/references']) expect((await client.call(`/api/apps/alpha/artifacts/${secret}${suffix}`)).status).toBe(403);
    expect((await client.call(`/api/apps/alpha/artifacts/${secret}`, 'PUT', { expectedChecksum: 'x' })).status).toBe(403);
    expect((await client.call(`/api/apps/alpha/artifacts/${route}/references`)).body.outgoing).toEqual([]);
    expect(JSON.stringify((await client.call(`/api/apps/alpha/artifacts/${route}/validation`)).body)).not.toContain('secret-trigger');
  });
  it('allows admin system edits and preserves 400/409 and safe failures', async () => {
    const f = await fixture(), client = await f.client('admin'), id = await f.locator('secret-trigger'), endpoint = `/api/apps/alpha/artifacts/${id}`;
    const artifact = (await client.call(endpoint)).body;
    expect((await client.call(endpoint, 'PUT', {})).status).toBe(400);
    expect((await client.call(endpoint, 'PUT', { expectedChecksum: artifact.checksum, manifest: { ...artifact.manifest, label: 'Edited trigger' } })).status).toBe(200);
    expect((await client.call(endpoint, 'PUT', { expectedChecksum: artifact.checksum })).status).toBe(409);
    const current = (await client.call(endpoint)).body;
    const escaped = await client.call(endpoint, 'PUT', { expectedChecksum: current.checksum, files: { '../escape.txt': 'no' } });
    expect(escaped.status).toBeGreaterThanOrEqual(400); expect(JSON.stringify(escaped.body)).not.toContain(f.root);
    expect(f.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'mutation', actor: 'dev-admin' }));
    expect(JSON.stringify(f.audit.mock.calls)).not.toContain(client.cookie);
  });
  it('allows app editor invalid-file saves but prevents identity/type promotion', async () => {
    const f = await fixture(), client = await f.client('editor'), id = await f.locator('public-form'), endpoint = `/api/apps/alpha/artifacts/${id}`;
    const artifact = (await client.call(endpoint)).body;
    expect((await client.call(endpoint, 'PUT', { expectedChecksum: artifact.checksum, manifest: { ...artifact.manifest, artifactType: 'trigger' } })).status).toBe(403);
    const saved = await client.call(endpoint, 'PUT', { expectedChecksum: artifact.checksum, files: { 'form.json': '{broken' } });
    expect(saved.status).toBe(200); expect(saved.body.saved).toBe(true); expect(saved.body.validation.valid).toBe(false);
  });
  it('denies cross-application access before workspace lookup and isolates locators for multi-app admins', async () => {
    const f = await fixture(), editor = await f.client('editor'), admin = await f.client('admin'), id = await f.locator('public-form');
    for (const suffix of ['', `/${id}`, `/${id}/validation`, `/${id}/references`]) expect((await editor.call('/api/apps/beta/artifacts' + suffix)).status).toBe(403);
    expect((await editor.call(`/api/apps/beta/artifacts/${id}`, 'PUT', { expectedChecksum: 'x' })).status).toBe(403);
    expect((await admin.call(`/api/apps/beta/artifacts/${id}`)).status).toBe(404);
    expect((await admin.call(`/api/apps/beta/artifacts/${id}`, 'PUT', { expectedChecksum: 'x' })).status).toBe(404);
    expect((await editor.call('/api/apps/nonexistent/artifacts')).status).toBe(403);
  });
  it('fails closed on legacy source, export, download and mutation route families for every identity', async () => {
    const f = await fixture();
    const legacy: Array<[string, string]> = [
      ['/api/apps', 'GET'], ['/api/apps', 'POST'], ['/api/apps/alpha', 'DELETE'],
      ['/api/apps/alpha/page?source=src%2Fpages%2Findex.ts', 'GET'], ['/api/apps/alpha/page?source=src%2Fpages%2Findex.ts', 'PUT'], ['/api/apps/alpha/page?source=src%2Fpages%2Findex.ts', 'DELETE'],
      ['/api/apps/alpha/pages', 'GET'], ['/api/apps/alpha/pages', 'POST'], ['/api/apps/alpha/app-services/private.js', 'GET'],
      ['/api/apps/alpha/package-assets/pkg/module.js', 'GET'], ['/api/apps/alpha/presentation/draft.css', 'GET'],
      ['/api/apps/alpha/presentation/assets/private.svg', 'GET'], ['/api/apps/alpha/export', 'POST'], ['/api/downloads/export.zip', 'GET'],
      ['/api/packages', 'GET'], ['/api/packages/install', 'POST'], ['/api/packages/acquire', 'POST'],
      ['/api/package-catalog', 'GET'], ['/api/foundation-sources', 'GET'], ['/api/foundation-sources/private', 'DELETE'],
      ['/api/apps/alpha/packages', 'GET'], ['/api/apps/alpha/packages', 'POST'], ['/api/apps/alpha/packages/acquire', 'POST'],
      ['/api/apps/alpha/foundation-dependencies', 'POST'], ['/api/apps/alpha/settings', 'PUT'],
      ['/api/apps/alpha/preview', 'POST'], ['/api/apps/alpha/components', 'GET'],
    ];
    for (const role of [undefined, 'viewer', 'reviewer', 'editor', 'admin']) {
      const client = await f.client(role);
      for (const [endpoint, method] of legacy) {
        const response = await client.call(endpoint, method, method === 'GET' ? undefined : {});
        expect(response.status, `${role ?? 'anonymous'} ${method} ${endpoint}`).toBe(role ? 403 : 401);
        expect(JSON.stringify(response.body)).not.toContain(f.root);
      }
    }
    expect(f.audit.mock.calls.filter(([event]) => event.action === 'legacy-route-denied').length).toBe(legacy.length * 4);
  });
  it('keeps the explicitly safe unrelated development endpoints available', async () => {
    const f = await fixture();
    for (const role of [undefined, 'viewer', 'admin']) {
      const client = await f.client(role);
      for (const endpoint of ['/api/health', '/api/templates', '/api/components']) expect((await client.call(endpoint)).status).toBe(200);
      expect((await client.call('/api/components', 'POST', {})).status).toBe(role ? 403 : 401);
    }
    expect((await f.request('/api/health')).status).toBe(200);
  });
  it('requires same-origin CSRF and rejects hostile hosts and forwarded connections', async () => {
    const f = await fixture(), client = await f.client('admin');
    expect((await client.call('/api/editor/session', 'POST', { fixtureId: 'dev-editor' }, { 'x-editor-csrf': '' })).status).toBe(403);
    expect((await client.call('/api/editor/session', 'POST', { fixtureId: 'dev-editor' }, { origin: 'https://evil.example' })).status).toBe(403);
    for (const extra of [{ host: 'evil.example' }, { 'x-forwarded-for': '127.0.0.1' }, { 'sec-fetch-site': 'cross-site' }]) expect((await client.call('/api/apps/alpha/artifacts', 'GET', undefined, extra)).status, JSON.stringify(extra)).toBe(403);
    const id = await f.locator('public-form'), loaded = (await client.call(`/api/apps/alpha/artifacts/${id}`)).body;
    expect((await client.call(`/api/apps/alpha/artifacts/${id}`, 'PUT', { expectedChecksum: loaded.checksum }, { 'x-editor-csrf': 'wrong' })).status).toBe(403);
  });
  it('filters SSE by app and artifact, handles authorized removals, and closes on identity switch', async () => {
    const f = await fixture(), client = await f.client('editor'), id = await f.locator('public-form'), secret = await f.locator('secret-trigger'), beta = await f.locator('public-form', 'beta');
    await client.call('/api/apps/alpha/artifacts');
    const stream = await f.stream(client.headers(), 'alpha'); expect(stream.response.statusCode).toBe(200);
    const secondStream = await f.stream(client.headers(), 'alpha');
    f.security.publish({ appKey: 'beta', locator: beta, kind: 'changed' });
    f.security.publish({ appKey: 'alpha', locator: secret, kind: 'changed' });
    f.security.publish({ appKey: 'alpha', locator: id, kind: 'changed' });
    await vi.waitFor(() => expect(stream.text()).toContain(id));
    expect(stream.text()).not.toContain(secret); expect(stream.text()).not.toContain(beta);
    f.security.publish({ appKey: 'alpha', locator: id, kind: 'removed' });
    await vi.waitFor(() => expect(stream.text()).toContain('removed'));
    await vi.waitFor(() => expect(secondStream.text()).toContain('removed'));
    await client.select('reviewer'); await vi.waitFor(() => expect(stream.ended()).toBe(true));
    const blocked = await f.stream(client.headers(), 'beta'); expect(blocked.response.statusCode).toBe(403);
  });
  it('invalidates old request revisions even if the new identity also permits editing', async () => {
    const f = await fixture(), client = await f.client('editor'), oldHeaders = client.headers(), id = await f.locator('public-form');
    const artifact = (await client.call(`/api/apps/alpha/artifacts/${id}`)).body;
    await client.select('admin');
    const response = await f.request(`/api/apps/alpha/artifacts/${id}`, { method: 'PUT', headers: oldHeaders, body: { expectedChecksum: artifact.checksum, files: { 'form.json': '{}' } } });
    expect(response.status).toBe(403); expect(response.body.code).toBe('editor.session-changed');
    expect((await client.select(null)).body.principal).toBeNull();
    expect((await client.call('/api/apps/alpha/artifacts')).status).toBe(401);
  });
  it('rejects a request still preparing a write when identity changes', async () => {
    const f = await fixture(), client = await f.client('editor'), id = await f.locator('public-form'), workspace = f.workspaces.get('alpha')!;
    const original = workspace.load.bind(workspace), entered = deferred(), release = deferred();
    vi.spyOn(workspace, 'load').mockImplementationOnce(async locator => { entered.resolve(); await release.promise; return original(locator); });
    const pending = client.call(`/api/apps/alpha/artifacts/${id}`, 'PUT', { expectedChecksum: 'not-yet-authorized' });
    await entered.promise; await client.select('reviewer'); release.resolve();
    expect((await pending).status).toBe(403);
    expect(await readFile(path.join(f.root, 'alpha/public-form/form.json'), 'utf8')).toBe('{"fields":[]}');
  });
  it('drains an admitted save before acknowledging a switch and rejects later old-session writes', async () => {
    const f = await fixture(), client = await f.client('editor'), id = await f.locator('public-form'), endpoint = `/api/apps/alpha/artifacts/${id}`, workspace = f.workspaces.get('alpha')!;
    const artifact = (await client.call(endpoint)).body, original = workspace.save.bind(workspace), entered = deferred(), release = deferred();
    vi.spyOn(workspace, 'save').mockImplementationOnce(async (...args) => { entered.resolve(); await release.promise; return original(...args); });
    const pending = client.call(endpoint, 'PUT', { expectedChecksum: artifact.checksum, files: { 'form.json': '{"fields":[],"label":"before switch"}' } });
    await entered.promise;
    let switched = false; const switching = client.select('reviewer').then(value => { switched = true; return value; });
    await vi.waitFor(async () => expect((await client.call('/api/editor/session')).status).toBe(403));
    expect(switched).toBe(false);
    expect((await client.call(endpoint, 'PUT', { expectedChecksum: artifact.checksum })).status).toBe(403);
    release.resolve(); expect((await pending).status).toBe(403); expect((await switching).status).toBe(200);
    expect(await readFile(path.join(f.root, 'alpha/public-form/form.json'), 'utf8')).toContain('before switch');
    expect((await client.call(endpoint, 'PUT', { expectedChecksum: artifact.checksum })).status).toBe(403);
  });
  it('revokes an identity across sessions and closes its streams', async () => {
    const f = await fixture(), one = await f.client('editor'), two = await f.client('editor'), stream = await f.stream(one.headers());
    await f.security.revoke('dev-editor');
    await vi.waitFor(() => expect(stream.ended()).toBe(true));
    for (const client of [one, two]) expect((await client.call('/api/apps/alpha/artifacts')).status).toBe(401);
    const next = await f.client(); expect((await next.select('editor')).status).toBe(400);
  });
  it('honors an independent server policy on every operation', async () => {
    const policy = { can: vi.fn((p, operation, scope) => operation !== 'references' && fixtureAuthorizer.can(p, operation, scope)) };
    const f = await fixture({ authorizer: policy }), client = await f.client('editor'), id = await f.locator('public-form');
    expect((await client.call(`/api/apps/alpha/artifacts/${id}/references`)).status).toBe(403);
    expect((await client.call(`/api/apps/alpha/artifacts/${id}`)).status).toBe(403);
    expect(policy.can).toHaveBeenCalledWith(expect.objectContaining({ subjectId: 'dev-editor' }), 'references', expect.objectContaining({ applicationKey: 'alpha', ownership: 'application' }));
  });
  it('expires idle sessions and streams without allowing a delayed write', async () => {
    const f = await fixture({ sessionLifetimeMs: 800 }), client = await f.client('editor'), stream = await f.stream(client.headers());
    await vi.waitFor(() => expect(stream.ended()).toBe(true), { timeout: 1800 });
    expect((await client.call('/api/apps/alpha/artifacts')).status).toBe(401);
  });
  it('does not emit an event whose authorization read finishes after revocation', async () => {
    const f = await fixture(), client = await f.client('editor'), id = await f.locator('public-form'), stream = await f.stream(client.headers());
    const workspace = f.workspaces.get('alpha')!, original = workspace.load.bind(workspace), entered = deferred(), release = deferred();
    vi.spyOn(workspace, 'load').mockImplementationOnce(async locator => { entered.resolve(); await release.promise; return original(locator); });
    f.security.publish({ appKey: 'alpha', locator: id, kind: 'changed' });
    await entered.promise; await f.security.revoke('dev-editor'); release.resolve();
    await vi.waitFor(() => expect(stream.ended()).toBe(true)); expect(stream.text()).not.toContain(id);
  });
  it('keeps malformed raw manifests repairable by administrators and hidden from other roles', async () => {
    const f = await fixture(), admin = await f.client('admin'), editor = await f.client('editor'), id = await f.locator('public-form'), endpoint = `/api/apps/alpha/artifacts/${id}`;
    const artifact = (await admin.call(endpoint)).body;
    const saved = await admin.call(endpoint, 'PUT', { expectedChecksum: artifact.checksum, manifest: '{broken' });
    expect(saved.status).toBe(200); expect(saved.body.artifact.manifest).toBeNull(); expect(saved.body.artifact.manifestContent).toBe('{broken');
    expect((await editor.call(endpoint)).status).toBe(403);
    expect((await admin.call(endpoint, 'PUT', { expectedChecksum: saved.body.artifact.checksum, manifest: artifact.manifest })).status).toBe(200);
  });
  it('honors server ownership overrides without trusting a manifest ownership field', async () => {
    const f = await fixture({ ownership: { 'alpha:public-form': 'package' } }), client = await f.client('editor'), id = await f.locator('public-form');
    expect((await client.call(`/api/apps/alpha/artifacts/${id}`)).status).toBe(403);
    expect((await client.call('/api/apps/alpha/artifacts')).body.some((item: { artifactId: string }) => item.artifactId === 'public-form')).toBe(false);
  });
});

describe('disabled editor and production boundary', () => {
  it.each([{ enabled: false, environment: 'development', developmentRuntime: true, status: 401 }, { enabled: false, environment: 'production', developmentRuntime: false, status: 404 }])('denies editor APIs in $environment when disabled', async config => {
    const f = await fixture(config);
    for (const endpoint of ['/api/editor/session', '/api/events', '/api/apps/alpha/artifacts', '/api/apps/alpha/artifacts/any', '/api/apps/alpha/artifacts/any/validation', '/api/apps/alpha/artifacts/any/references']) expect((await f.request(endpoint)).status).toBe(config.status);
    expect((await f.request('/api/apps/alpha/artifacts/any', { method: 'PUT', body: {} })).status).toBe(config.status);
  });
  it('refuses fixture activation in production or in the emitted server even with a development environment', () => {
    for (const [environment, developmentRuntime] of [['production', true], ['development', false]] as const) expect(() => new ArtifactEditorSecurity({ enabled: true, environment, developmentRuntime, origins: [], fixtures: [], workspace: vi.fn() })).toThrow('development source server');
  });
  it('requires explicit opt-in and server-only settings', async () => {
    expect((await editorSecurityConfig({})).enabled).toBe(false);
    await expect(editorSecurityConfig({ UI_PLATFORM_EDITOR: '1', NODE_ENV: 'production' })).rejects.toThrow('NODE_ENV');
    await expect(editorSecurityConfig({ UI_PLATFORM_EDITOR: '1', NODE_ENV: 'development' })).rejects.toThrow('UI_PLATFORM_EDITOR_CONFIG');
  });
});
