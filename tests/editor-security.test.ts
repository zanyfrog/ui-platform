import { afterEach, describe, expect, it, vi } from 'vitest';
import http from 'node:http';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { ArtifactEditorWorkspace } from '../src/server/artifact-editor.js';
import { ArtifactEditorSecurity, fixtureAuthorizer, type EditorSecurityOptions } from '../src/server/editor-security.js';
import { editorSecurityConfig } from '../src/server/editor-security-config.js';
import type { EditorSessionDto } from '../src/shared/editor-security.js';

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
    workspaces.set(appKey, new ArtifactEditorWorkspace(appRoot, appKey, event => security.publish(event)));
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
