import { afterEach, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { V1DevelopmentIdentity } from '../src/server/v1-development-identity.js';
import { DevelopmentApplicationRegistry } from '../src/server/development-application-registry.js';
import { SecurityDefinitionService, SecurityDefinitionStore, securityChecksum } from '@ui-platform/i-am/definitions';
import { initializeDevelopmentPlatformSecurity } from '@ui-platform/i-am/administration';
import { developmentSecurityConfiguration, developmentSecurityScopes } from '../src/server/v1-security-administration.js';
import { V1_FIXTURE_APPLICATION_ID } from '../src/server/v1-development-policy.js';
import { pilot, pilotGrantChanges, pilotPermissions, pilotRecordIds } from '../src/shared/pilot-administration.js';
import { PilotAdministration, type PilotRequest } from '../src/client/artifact-editor/pilot-administration.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
async function fixture() {
  const environment = process.env.NODE_ENV; process.env.NODE_ENV = 'development';
  cleanup.push(async () => { if (environment === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = environment; });
  const root = await mkdtemp(path.join(tmpdir(), 'pilot-admin-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const file = path.join(root, 'policy.sqlite'), apps = path.join(root, 'apps'), app = path.join(apps, pilot.key);
  await mkdir(app, { recursive: true });
  const manifest = path.join(app, 'app.manifest.json');
  await writeFile(manifest, JSON.stringify({ appId: pilot.applicationId }));
  await writeFile(path.join(app, 'app.settings.json'), JSON.stringify({ application: { status: 'active' } }));
  new V1DevelopmentIdentity({ enabled: true, environment: 'development', developmentRuntime: true, policyStorePath: file, origins: ['http://localhost:5274'] }).close();
  const store = new SecurityDefinitionStore(file); cleanup.push(async () => store.close());
  const handle = {};
  const setup = await initializeDevelopmentPlatformSecurity(new SecurityDefinitionService(store), { async verify(context) {
    if (context !== handle) throw new Error('test setup denied');
    return { operatorId: 'isolated-fixture', deploymentId: developmentSecurityConfiguration.deploymentId, strong: true as const, capabilityId: developmentSecurityConfiguration.bootstrapCapabilityId };
  } }, developmentSecurityScopes, developmentSecurityConfiguration, { context: handle, administratorUserId: pilot.securityAdmin,
    grantablePermissionIds: [...pilotPermissions, 'ui.page.admin'], applicationAnchors: [{ applicationId: V1_FIXTURE_APPLICATION_ID, administratorUserId: pilot.administrator }],
    expectedRevision: store.revision(), reason: 'Isolated administrative integration test' });
  expect(setup.status, JSON.stringify(setup)).toBe('activated');
  const registry = new DevelopmentApplicationRegistry(path.join(root, 'ledger.sqlite'), apps); cleanup.push(async () => registry.close());
  registry.registerCreated({ key: pilot.key, appId: pilot.applicationId, valid: true, status: 'active' }, pilot.administrator);
  const identity = new V1DevelopmentIdentity({ enabled: true, environment: 'development', developmentRuntime: true, policyStorePath: file,
    origins: ['http://localhost:5274'], deploymentId: pilot.deploymentId, applicationRegistry: registry });
  cleanup.push(async () => identity.close());
  // A provisioning-state read must never invoke runtime readiness/host creation.
  identity.setRuntimeReadiness(async () => { throw new Error('unexpected runtime readiness'); });
  const server = createServer(async (req, res) => { if (await identity.handle(req, res) || await identity.handleAdministration(req, res)) return; res.writeHead(404).end(); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  cleanup.push(() => new Promise<void>(resolve => server.close(() => resolve())));
  const base = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const login = async (email: string) => {
    const initial = await fetch(base + '/api/development-identity/session'); const cookie = initial.headers.get('set-cookie')!.split(';')[0]!;
    const session = await initial.json(); const headers = { cookie, origin: 'http://localhost:5274', 'content-type': 'application/json', 'x-v1-csrf': session.csrfToken };
    expect((await fetch(base + '/api/development-identity/session', { method: 'POST', headers, body: JSON.stringify({ email }) })).status).toBe(200);
    return headers;
  };
  const route = (suffix: string) => base + `/api/apps/${pilot.key}/${suffix}`;
  return { root, store, manifest, base, route, login };
}
it('refuses anonymous, unauthorized, wrong owner and missing CSRF without policy writes', async () => {
  const f = await fixture(); const revision = f.store.revision();
  expect((await fetch(f.route('security/pilot-status'))).status).toBe(403);
  const author = await f.login('admin@example.local');
  expect((await fetch(f.route('security/pilot-status'), { headers: author })).status).toBe(403);
  const security = await f.login('security@example.local');
  const state = await fetch(f.route('security/pilot-status'), { headers: security });
  expect(state.headers.get('set-cookie')).toBeNull(); expect((await state.json()).anchor).toBeNull();
  const { 'x-v1-csrf': removed, ...bad } = security;
  expect((await fetch(f.route('onboarding'), { method: 'POST', headers: bad, body: JSON.stringify({ administratorUserId: pilot.administrator, reason: 'test' }) })).status).toBe(403);
  expect((await fetch(f.route('onboarding'), { method: 'POST', headers: author, body: JSON.stringify({ administratorUserId: pilot.administrator, reason: 'client label cannot bypass admission' }) })).status).toBe(403);
  await writeFile(f.manifest, JSON.stringify({ appId: 'different-owner' }));
  expect((await fetch(f.route('security/pilot-status'), { headers: security })).status).toBe(403);
  expect(f.store.revision()).toBe(revision);
});
it('separates provision, stage, review and activate through real protected contracts', async () => {
  const f = await fixture(); const headers = await f.login('security@example.local');
  const requests: string[] = [];
  const request: PilotRequest = async (action, body) => {
    requests.push(action);
    const suffix = action === 'pilot-status' ? 'security/pilot-status' : action === 'onboarding' ? action : `security/${action}`;
    const response = await fetch(f.route(suffix), { headers, ...(body === undefined ? {} : { method: 'POST', body: JSON.stringify(body) }) });
    const result = await response.json(); if (!response.ok) throw new Error(result.code ?? result.status); return result;
  };
  const model = new PilotAdministration(request);
  await expect(model.provision(' ')).rejects.toThrow('nonempty'); expect(requests).toEqual([]);
  await model.refresh(); expect(model.status?.applicationId).toBe(pilot.applicationId); expect(requests).toEqual(['pilot-status']);
  await model.provision('Isolated pilot initial administrator');
  await model.refresh(); expect(model.status?.anchor?.userId).toBe(pilot.administrator);
  const state = model.status!;
  expect(state.recordChecksums).toEqual(Object.fromEntries(pilotRecordIds.map(id => [id, null])));
  const stale = await fetch(f.route('security/stage'), { method: 'POST', headers, body: JSON.stringify({ changes: pilotGrantChanges(false), expectedRevision: state.revision - 1, reason: 'stale test' }) });
  const staleValue = await stale.json(); expect(stale.ok && staleValue.activatable).toBeFalsy();
  await model.stage('Isolated pilot functional plan', false);
  expect(model.candidate?.activatable).toBe(true); expect(requests.at(-1)).toBe('stage');
  const candidate = model.candidate!;
  await expect(model.activate('Isolated pilot functional plan', false, false)).rejects.toThrow('Review');
  await expect(model.activate('changed reason', false, true)).rejects.toThrow('Review');
  const denied = await fetch(f.route('security/activate'), { method: 'POST', headers, body: JSON.stringify({ candidateId: candidate.id, checksum: 'wrong', expectedRevision: candidate.baseRevision, reason: 'bad checksum' }) });
  expect(denied.status).toBe(403);
  const staleActivation = await fetch(f.route('security/activate'), { method: 'POST', headers, body: JSON.stringify({ candidateId: candidate.id, checksum: candidate.checksum, expectedRevision: candidate.baseRevision - 1, reason: 'bad revision' }) });
  expect(staleActivation.status).toBe(403);
  await model.activate('Isolated pilot functional plan', false, true);
  expect(model.candidate).toBeUndefined(); expect(requests.at(-1)).toBe('activate');
  const records = f.store.snapshot().documents.map(d => d.definition);
  expect(records.some(r => r.id === `local-pilot.${pilot.applicationId}.assignment`)).toBe(true);
  // Existing records must update through native checksums, never a duplicate role.
  const active = f.store.snapshot();
  await model.refresh();
  expect(Object.keys(model.status!.recordChecksums)).toEqual(pilotRecordIds);
  for (const id of pilotRecordIds) expect(model.status!.recordChecksums[id]).toBe(securityChecksum(active.documents.find(d => d.definition.id === id)!));
  const stage = async (changes: unknown, expectedRevision = active.revision) => {
    const response = await fetch(f.route('security/stage'), { method: 'POST', headers, body: JSON.stringify({ changes, expectedRevision, reason: 'isolated checksum regression' }) });
    return response.json();
  };
  const missing = await stage(pilotGrantChanges(true));
  expect(missing.activatable).toBe(false);
  expect(missing.diagnostics.map((d: {code:string}) => d.code)).toEqual(['CHECKSUM_CONFLICT', 'CHECKSUM_CONFLICT', 'CHECKSUM_CONFLICT']);
  const staleChecksums = Object.fromEntries(pilotRecordIds.map(id => [id, `sha256:${'0'.repeat(64)}`]));
  expect((await stage(pilotGrantChanges(true, staleChecksums))).activatable).toBe(false);
  const matching = pilotGrantChanges(true, model.status!.recordChecksums);
  expect((await stage(matching, active.revision - 1)).diagnostics.some((d: {code:string}) => d.code === 'REVISION_CONFLICT')).toBe(true);
  await model.stage('isolated temporary cleanup; staged, not activated', true);
  expect(model.candidate?.activatable).toBe(true);
  expect(model.review!.changes).toEqual(matching);
  const priorSet = pilotGrantChanges(false)[0].document.definition;
  const nextSet = matching[0].document.definition;
  if (priorSet.kind !== 'permission-set' || nextSet.kind !== 'permission-set') throw new Error('set');
  expect(nextSet.rules.slice(0, 7)).toEqual(priorSet.rules);
  expect(nextSet.rules.slice(7).map(r => ({permissionId:r.permissionId,scope:r.scope}))).toEqual([
    { permissionId: 'ui.page.admin', scope: { resource: { authorityId:pilot.authorityId,applicationId:pilot.applicationId,kind:'application',id:pilot.applicationId },descendants:true } },
  ]);
  expect(matching.slice(1).map(c => c.document)).toEqual(pilotGrantChanges(false).slice(1).map(c => c.document));
  expect(f.store.snapshot()).toEqual(active); // Includes the initial anchor and unrelated policy.
  const audit = new DatabaseSync(path.join(f.root, 'policy.sqlite'), { readOnly: true });
  try {
    const evidence = JSON.stringify(audit.prepare('SELECT * FROM security_admin_audit').all());
    expect(evidence).toContain('Isolated pilot initial administrator');
    expect(evidence).toContain('Isolated pilot functional plan');
    expect(evidence).toContain(pilot.securityAdmin);
  } finally { audit.close(); }
});
it('refuses incomplete protected checksum state before sending a stage request', async () => {
  const f = await fixture(), headers = await f.login('security@example.local');
  const response = await fetch(f.route('security/pilot-status'), { headers });
  const state = await response.json();
  const model = new PilotAdministration(async action => {
    expect(action).toBe('pilot-status');
    return { ...state, recordChecksums: {} };
  });
  await expect(model.stage('no blind update', true)).rejects.toThrow('checksums unavailable');
});
it('fixes the plan to the exact pilot and requires a verified state before staging', async () => {
  const changes = pilotGrantChanges(false);
  const set = changes[0].document.definition;
  expect(set.kind).toBe('permission-set');
  if (set.kind !== 'permission-set') throw new Error('set');
  expect(set.rules.map(r => r.permissionId)).toEqual(pilotPermissions);
  expect(set.rules.every(r => r.scope.resource.applicationId === pilot.applicationId)).toBe(true);
  expect(pilotGrantChanges(true)[0].document.definition).not.toEqual(set);
  const calls: string[] = [];
  const model = new PilotAdministration(async action => { calls.push(action); return { applicationId: 'wrong owner' }; });
  await expect(model.stage('reason', false)).rejects.toThrow('mismatch'); expect(calls).toEqual(['pilot-status']);
  model.invalidate(); await expect(model.activate('reason', false, true)).rejects.toThrow('Review');
});
