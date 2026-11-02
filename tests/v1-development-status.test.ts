import { afterEach, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { V1DevelopmentIdentity } from '../src/server/v1-development-identity.js';
import { SecurityDefinitionService, SecurityDefinitionStore, type SecurityRecord } from '@ui-platform/i-am/definitions';
import { V1_AUTHORITY_ID } from '../src/server/v1-development-policy.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0)) await close(); });
async function host(enabled = true) {
  const root = await mkdtemp(path.join(tmpdir(), 'uib-status-'));
  const file = path.join(root, 'policy.sqlite');
  const identity = new V1DevelopmentIdentity({ enabled, environment: 'development', developmentRuntime: true,
    policyStorePath: file, origins: ['http://localhost:5274'], deploymentId: 'builder-demo' });
  const server = createServer(async (req, res) => { if (!await identity.handle(req, res)) res.writeHead(404).end(); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('address');
  cleanup.push(async () => { await new Promise<void>(resolve => server.close(() => resolve())); identity.close(); await rm(root, { recursive: true, force: true }); });
  // Test-only introspection establishes byte-for-byte session immutability, including expiry/revision.
  const sessions = (identity as unknown as { sessions: Map<string, { expires: number }> }).sessions;
  return { file, identity, sessions, base: `http://127.0.0.1:${address.port}` };
}
it('never initializes or discloses authority for absent, unknown, malformed, or disabled sessions', async () => {
  const { base, sessions } = await host();
  for (const cookie of ['', 'uib_v1_development_session=unknown', 'uib_v1_development_session=%not-a-token', 'unrelated=value']) {
    const response = await fetch(base + '/api/development-identity/status', { headers: { cookie } });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ status: 'unauthenticated', authenticated: false, principalId: null });
    expect(sessions.size).toBe(0);
  }
  const disabled = await host(false);
  const response = await fetch(disabled.base + '/api/development-identity/status');
  expect(response.status).toBe(503); expect(response.headers.get('set-cookie')).toBeNull();
  expect(await response.json()).toEqual({ status: 'unavailable', authenticated: false, principalId: null });
  for (const options of [{ method: 'POST' }, { headers: { 'x-forwarded-for': '127.0.0.1' } }]) {
    const denied = await fetch(base + '/api/development-identity/status', options);
    expect(denied.status).toBeGreaterThanOrEqual(400);
    expect(denied.headers.get('set-cookie')).toBeNull();
    expect(await denied.json()).not.toHaveProperty('capabilities');
    expect(sessions.size).toBe(0);
  }
});
it('preserves sessions and policy across sign-in, live evaluator decisions, expiry and sign-out', async () => {
  const { base, sessions, identity, file } = await host();
  const initial = await fetch(base + '/api/development-identity/session');
  const cookie = initial.headers.get('set-cookie')!.split(';')[0]!;
  const csrf = (await initial.json()).csrfToken;
  const status = async () => {
    const before = JSON.stringify([...sessions]); const digest = identity.policyDigest();
    const response = await fetch(base + '/api/development-identity/status', { headers: { cookie } });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(JSON.stringify([...sessions])).toBe(before); expect(identity.policyDigest()).toBe(digest);
    return response.json();
  };
  expect((await status()).authenticated).toBe(false);
  const change = (method: string, headers = true) => fetch(base + '/api/development-identity/session', { method,
    headers: { cookie, origin: 'http://localhost:5274', 'content-type': 'application/json', ...(headers ? { 'x-v1-csrf': csrf } : {}) },
    body: JSON.stringify({ email: 'security@example.local' }) });
  expect((await change('POST', false)).status).toBe(403);
  expect((await change('POST')).status).toBe(200);
  const denied = await status();
  expect(denied).toEqual({ status: 'authenticated', authenticated: true,
    principalId: 'usr_06fefc50791f4f15ac0139de699701b9', deploymentId: 'builder-demo', authorityId: V1_AUTHORITY_ID,
    registeredApplications: false, capabilities: { 'ui.platform.security.admin': false, 'ui.platform.application.create': false } });
  // Activate only isolated fixture policy, then demonstrate that status uses the live evaluator.
  const store = new SecurityDefinitionStore(file);
  try {
    const service = new SecurityDefinitionService(store);
    const scope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system' as const, id: 'platform' }, descendants: true };
    const baseRecord = (id: string) => ({ id, key: id, name: id, status: 'active' as const });
    const records: SecurityRecord[] = [
      { ...baseRecord('status.set'), kind: 'permission-set', owner: { kind: 'platform' }, includes: [], rules: [{ id: 'status.rule', permissionId: 'ui.platform.application.create', effect: 'allow', scope }] },
      { ...baseRecord('status.role'), kind: 'role', owner: { kind: 'platform' }, permissionSets: [{ id: 'status.set' }] },
      { id: 'status.assignment', kind: 'role-assignment', userId: denied.principalId, roleId: 'status.role', status: 'active', scope, startsAt: '2020-01-01T00:00:00Z', endsAt: null },
    ];
    const candidate = service.stage({ changes: records.map(definition => ({ document: { format: 'ui-platform.security', formatVersion: 1, definition } })), expectedRevision: service.revision(), actorId: 'isolated-test', source: 'cli', idempotencyKey: 'status-test' });
    expect(service.activate(candidate.id, candidate.checksum, 'isolated-test').status).toBe('activated');
  } finally { store.close(); }
  expect((await status()).capabilities['ui.platform.application.create']).toBe(true);
  const session = [...sessions.values()][0]!; const expiry = session.expires;
  session.expires = 0;
  expect((await status()).authenticated).toBe(false); expect(sessions.size).toBe(1);
  session.expires = expiry;
  expect((await change('DELETE')).status).toBe(200);
  expect(await status()).toEqual({ status: 'unauthenticated', authenticated: false, principalId: null });
});
