import { afterEach, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { SecurityDefinitionService, SecurityDefinitionStore, securityChecksum } from '@ui-platform/i-am/definitions';
import { V1DevelopmentIdentity } from '../src/server/v1-development-identity.js';
import { V1_AUTHORITY_ID, V1_FIXTURE_APPLICATION_ID, developmentUsers } from '../src/server/v1-development-policy.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); });

async function host() {
  const root = await mkdtemp(path.join(tmpdir(), 'uib-v1-identity-'));
  const file = path.join(root, 'policy.sqlite');
  const origin = 'http://localhost:5174';
  const identity = new V1DevelopmentIdentity({ enabled: true, environment: 'development', developmentRuntime: true,
    policyStorePath: file, origins: [origin] });
  const server = createServer(async (req, res) => {
    if (await identity.handle(req, res)) return;
    const area = new URL(req.url ?? '/', 'http://localhost').searchParams.get('area');
    const kind = area === 'workflow' ? 'workflow' : 'page';
    const allowed = await identity.authorize(req, `ui.${kind}.edit`, { authorityId: V1_AUTHORITY_ID,
      applicationId: V1_FIXTURE_APPLICATION_ID, kind, id: kind === 'page' ? 'fixture-page' : 'fixture-workflow', parentId: V1_FIXTURE_APPLICATION_ID });
    res.writeHead(allowed ? 200 : 403).end();
  });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  cleanup.push(async () => { await new Promise<void>(resolve => server.close(() => resolve())); identity.close(); await rm(root, { recursive: true, force: true }); });
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('missing address');
  return { base: `http://127.0.0.1:${address.port}`, file, origin };
}

it('uses the real I-AM role graph for one session and denies a direct workflow call', async () => {
  const { base, origin } = await host();
  const anonymous = await fetch(`${base}/api/development-identity/session`);
  const cookie = anonymous.headers.get('set-cookie')!.split(';')[0]!;
  const csrf = (await anonymous.json()).csrfToken as string;
  const login = async (email: string) => fetch(`${base}/api/development-identity/session`, { method: 'POST',
    headers: { cookie, origin, 'x-v1-csrf': csrf, 'content-type': 'application/json' }, body: JSON.stringify({ email }) });
  expect((await login('unknown@example.local')).status).toBe(403);
  const signedIn = await login('mixed@example.local');
  expect(signedIn.status).toBe(200);
  expect((await signedIn.json()).user.userId).toBe(developmentUsers[4].id);
  expect((await fetch(`${base}/check?area=page`, { headers: { cookie } })).status).toBe(200);
  expect((await fetch(`${base}/check?area=workflow`, { headers: { cookie } })).status).toBe(403);
  expect((await fetch(`${base}/check?area=page`)).status).toBe(403);
});

it('rejects a disabled User on the next request without rebuilding the session', async () => {
  const { base, file, origin } = await host();
  const anonymous = await fetch(`${base}/api/development-identity/session`);
  const cookie = anonymous.headers.get('set-cookie')!.split(';')[0]!;
  const csrf = (await anonymous.json()).csrfToken as string;
  expect((await fetch(`${base}/api/development-identity/session`, { method: 'POST',
    headers: { cookie, origin, 'x-v1-csrf': csrf, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'mixed@example.local', userId: developmentUsers[0].id }) })).status).toBe(200);
  expect((await fetch(`${base}/check?area=page`, { headers: { cookie } })).status).toBe(200);
  const store = new SecurityDefinitionStore(file);
  try {
    const service = new SecurityDefinitionService(store);
    const previous = service.active().find(doc => doc.definition.id === developmentUsers[4].id)!;
    const candidate = service.stage({ changes: [{ document: { ...previous, definition: { ...previous.definition, status: 'inactive' } },
      expectedChecksum: securityChecksum(previous) }], expectedRevision: service.revision(), actorId: 'v1-test-admin',
      source: 'cli', idempotencyKey: 'disable-mixed-user' });
    expect(candidate.activatable).toBe(true);
    expect(service.activate(candidate.id, candidate.checksum, 'v1-test-admin').status).toBe('activated');
  } finally { store.close(); }
  expect((await fetch(`${base}/check?area=page`, { headers: { cookie } })).status).toBe(403);
  expect((await fetch(`${base}/api/development-identity/session`, { headers: { cookie } }).then(response => response.json())).user).toBeNull();
});

it('refuses development login outside a development source runtime', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'uib-v1-guard-'));
  try {
    expect(() => new V1DevelopmentIdentity({ enabled: true, environment: 'production', developmentRuntime: false,
      policyStorePath: path.join(root, 'policy.sqlite'), origins: ['http://localhost:5174'] })).toThrow('V1_DEVELOPMENT_IDENTITY_UNAVAILABLE');
  } finally { await rm(root, { recursive: true, force: true }); }
});

it('keeps Application Admin, Security Admin and application scope distinct under composed sets', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'uib-v1-roles-'));
  const identity = new V1DevelopmentIdentity({ enabled: true, environment: 'development', developmentRuntime: true,
    policyStorePath: path.join(root, 'policy.sqlite'), origins: ['http://localhost:5174'] });
  try {
    const scope = { applicationKey: 'v1-identity-fixture', artifactType: 'form', artifactId: 'fixture-form', ownership: 'application' as const };
    expect(await identity.authorizeEditor(developmentUsers[0].id, 'admin', scope)).toBe(true);
    expect(await identity.authorizeEditor(developmentUsers[0].id, 'security', scope)).toBe(false);
    expect(await identity.authorizeEditor(developmentUsers[1].id, 'security', scope)).toBe(true);
    expect(await identity.authorizeEditor(developmentUsers[1].id, 'edit', scope)).toBe(false);
    expect(await identity.authorizeEditor(developmentUsers[4].id, 'read', scope)).toBe(true);
    expect(await identity.authorizeEditor(developmentUsers[4].id, 'admin', scope)).toBe(false);
    expect(await identity.authorizeEditor(developmentUsers[4].id, 'edit', { ...scope, applicationKey: 'another-app' })).toBe(false);
    expect(await identity.authorizeEditor(developmentUsers[5].id, 'edit', scope)).toBe(true);
    expect(await identity.authorizeEditor(developmentUsers[5].id, 'edit', { ...scope, artifactType: 'workflow' })).toBe(true);
    expect(await identity.authorizeEditor(developmentUsers[5].id, 'security', scope)).toBe(false);
  } finally { identity.close(); await rm(root, { recursive: true, force: true }); }
});
