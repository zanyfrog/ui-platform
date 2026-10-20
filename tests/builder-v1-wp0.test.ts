import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import { randomUUID } from 'node:crypto';
import { V1DevelopmentIdentity } from '../src/server/v1-development-identity.js';
import { V1_AUTHORITY_ID, V1_FIXTURE_APPLICATION_ID, developmentUsers } from '../src/server/v1-development-policy.js';
import { developmentSecurityConfiguration, developmentSecurityScopes } from '../src/server/v1-security-administration.js';
import { SecurityDefinitionService, SecurityDefinitionStore, securityChecksum, type SecurityDocument, type SecurityRecord } from '@ui-platform/i-am/definitions';
import { initializeDevelopmentPlatformSecurity } from '@ui-platform/i-am/administration';
import { DevelopmentApplicationRegistry } from '../src/server/development-application-registry.js';
import { bootstrapDevelopmentDataset } from '@ui-platform/dataset-operations';
import { createBuilderDevelopmentHost } from '../src/server/builder-development-host.js';
import { AutomationStore } from '../src/server/automation-store.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
const doc = (definition: SecurityRecord): SecurityDocument => ({ format: 'ui-platform.security', formatVersion: 1, definition });
const platformScope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system' as const, id: 'platform' }, descendants: true };
const dataPermissions = ['dataset.read', 'dataset.create', 'dataset.update', 'dataset.write'];

it('WP0: normal creation, explicit authority, applied protected Dataset, mandatory Workflow, isolation, revocation, recovery and managed preview', async () => {
  const previousEnv = process.env.NODE_ENV; process.env.NODE_ENV = 'development';
  cleanup.push(async () => { if (previousEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousEnv; });
  const root = await mkdtemp(path.join(tmpdir(), 'builder-wp0-'));
  cleanup.push(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }));
  const runtime = path.join(root, 'runtime'), apps = path.join(root, 'apps'), policyPath = path.join(root, 'policy.sqlite'), hostsFile = path.join(root, 'hosts.json');
  await mkdir(runtime); await mkdir(apps);
  // Existing V1 identity initialization only. No new Application, Dataset, Workflow or grants are fixture-seeded.
  new V1DevelopmentIdentity({ enabled: true, environment: 'development', developmentRuntime: true, policyStorePath: policyPath, origins: ['http://localhost:5174'] }).close();
  const policy = new SecurityDefinitionStore(policyPath); cleanup.push(async () => policy.close());
  const setupHandle = {};
  const setup = await initializeDevelopmentPlatformSecurity(new SecurityDefinitionService(policy), { async verify(context) {
    if (context !== setupHandle) throw new Error('LOCAL_SETUP_DENIED');
    return { operatorId: 'explicit-local-test-operator', deploymentId: developmentSecurityConfiguration.deploymentId, strong: true as const, capabilityId: developmentSecurityConfiguration.bootstrapCapabilityId };
  } }, developmentSecurityScopes, developmentSecurityConfiguration, { context: setupHandle, administratorUserId: developmentUsers[1].id,
    grantablePermissionIds: ['ui.platform.application.create', 'ui.application.view', 'ui.application.edit', 'ui.workflow.edit', ...dataPermissions],
    capabilityDefinitions: dataPermissions.map(id => ({ id, applicableKinds: ['dataset', 'field'] })),
    applicationAnchors: [{ applicationId: V1_FIXTURE_APPLICATION_ID, administratorUserId: developmentUsers[0].id }], expectedRevision: policy.revision(), reason: 'Explicit local WP0 development setup' });
  expect(setup.status).toBe('activated');
  const probe = createServer(); await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as { port: number }).port; await new Promise<void>(resolve => probe.close(() => resolve()));
  let output = '';
  const child: ChildProcess = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], { windowsHide: true,
    env: { ...process.env, NODE_ENV: 'development', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '1', UI_PLATFORM_BUILDER_WP0: '1',
      UI_PLATFORM_V1_POLICY_STORE: policyPath, UI_APPS_DIR: apps, UI_RUNTIME_DIR: runtime, UI_PLATFORM_BUILDER_HOSTS_FILE: hostsFile,
      UI_PLATFORM_API_PORT: String(port), UI_PLATFORM_UI_PORT: String(port), npm_config_offline: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', bytes => { output += String(bytes); }); child.stderr!.on('data', bytes => { output += String(bytes); });
  cleanup.push(async () => { if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit');
    if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' });
    else child.kill(); await exited; } });
  const origin = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 200; i++) { if (child.exitCode !== null) throw new Error(output); if (await fetch(origin + '/api/health').then(r => r.ok).catch(() => false)) break; await new Promise(r => setTimeout(r, 50)); }
  const login = async (email: string) => {
    const response = await fetch(origin + '/api/development-identity/session'); const cookie = response.headers.get('set-cookie')!.split(';')[0]!;
    const session = await response.json(); const headers = { cookie, origin, 'content-type': 'application/json', 'x-v1-csrf': session.csrfToken };
    expect((await fetch(origin + '/api/development-identity/session', { method: 'POST', headers, body: JSON.stringify({ email }) })).status).toBe(200);
    return headers;
  };
  const security = await login(developmentUsers[1].email), creator = await login(developmentUsers[2].email), unrelated = await login(developmentUsers[3].email);
  const post = async (route: string, body: unknown, headers = security) => { const r = await fetch(origin + route, { method: 'POST', headers, body: JSON.stringify(body) }); const text = await r.text(); return { status: r.status, value: text ? JSON.parse(text) : {} }; };
  const activate = async (applicationId: string | null, records: SecurityRecord[]) => {
    const route = applicationId === null ? '/api/platform/security' : `/api/apps/wp0-created/security`;
    const changes = records.map(definition => { const previous = policy.documents().find(d => d.definition.id === definition.id); return { document: doc(definition), ...(previous ? { expectedChecksum: securityChecksum(previous) } : {}) }; });
    const staged = await post(`${route}/stage`, { changes, expectedRevision: policy.revision(), reason: 'Explicit WP0 role administration' });
    expect(staged.value.diagnostics).toEqual([]);
    const activated = await post(`${route}/activate`, { candidateId: staged.value.id, checksum: staged.value.checksum, expectedRevision: staged.value.baseRevision, reason: 'Explicit WP0 role administration' });
    expect(activated.value.status, JSON.stringify(activated.value)).toBe('activated');
  };
  const base = (id: string) => ({ id, key: id, name: id, status: 'active' as const });
  await activate(null, [
    { ...base('wp0.creator-set'), kind: 'permission-set', owner: { kind: 'platform' }, includes: [], rules: [{ id: 'wp0.create', permissionId: 'ui.platform.application.create', effect: 'allow', scope: platformScope }] },
    { ...base('wp0.creator-role'), kind: 'role', owner: { kind: 'platform' }, permissionSets: [{ id: 'wp0.creator-set' }] },
    { kind: 'role-assignment', id: 'wp0.creator-assignment', userId: developmentUsers[2].id, roleId: 'wp0.creator-role', status: 'active', scope: platformScope, startsAt: '2026-01-01T00:00:00Z', endsAt: null },
  ]);
  const created = await post('/api/apps', { key: 'wp0-created', name: 'WP0 Created Application', templateId: 'standard' }, creator);
  expect(created.status, JSON.stringify(created.value) + output).toBe(201);
  const applicationId = created.value.appId as string;
  expect(applicationId).toMatch(/^[a-f0-9-]{36}$/);
  const second = await post('/api/apps', { key: 'wp0-other', name: 'WP0 Other Application', templateId: 'standard' }, creator);
  expect(second.status).toBe(201); expect(second.value.appId).not.toBe(applicationId);
  expect((await fetch(origin + '/api/apps/wp0-other', { headers: creator })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp0-created', { headers: creator })).status).toBe(403);
  expect((await post('/api/apps/wp0-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Unauthorized attempt' }, creator)).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp0-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('authority-required');
  expect((await post('/api/apps/wp0-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Explicit initial Application security administrator' })).value.status).toBe('activated');
  expect((await post('/api/apps/wp0-created/security/stage', { changes: [], expectedRevision: policy.revision() }, { ...security, 'x-v1-csrf': 'forged' })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp0-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('runtime-required');
  const registry = new DevelopmentApplicationRegistry(path.join(runtime, 'development-applications.sqlite'), apps); cleanup.push(async () => registry.close());
  const datasetId = `dataset-${randomUUID()}`, fieldId = `field-${randomUUID()}`, fieldName = `field-${randomUUID()}`, fieldPrivate = `field-${randomUUID()}`;
  const dataset = await bootstrapDevelopmentDataset({ owner: { applicationIdForKey: key => registry.byKey(key)?.applicationId, isCurrentOwner: id => !!registry.provisioning.resolve(id) }, authorityId: V1_AUTHORITY_ID, systemResourceId: 'platform', applicationKey: 'wp0-created', root: path.join(root, 'dataset-host'),
    schema: { definitionType: 'dataset-schema', definitionFormatVersion: 1, dataset: { id: datasetId, key: 'records', name: 'Record', pluralName: 'Records' },
      fields: [{ id: fieldId, key: 'id', type: 'id', required: true }, { id: fieldName, key: 'name', type: 'string' }, { id: fieldPrivate, key: 'privateNote', type: 'string' }] },
    registration: { reference: { appId: applicationId, dataset: 'records' }, primaryKey: 'id', fields: [{ name: 'id', type: 'string', required: true }, { name: 'name', type: 'string' }, { name: 'privateNote', type: 'string' }] } });
  const workflowsRoot = path.join(root, 'workflows'), triggersRoot = path.join(root, 'triggers'); await mkdir(triggersRoot);
  const workflow = await new AutomationStore(workflowsRoot, 'workflow').create('rename', { displayName: 'Rename', enabled: true, appId: applicationId, datasetId, primaryKey: 'id', actions: [
    { id: 'rename-record', type: 'crud', datasetId, operation: 'update', records: { fields: { id: { from: 'record', path: ['id'] }, name: { literal: 'workflow-completed' } } } },
  ] });
  const workflowId = workflow.definition!.id;
  const scope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'application' as const, id: applicationId }, descendants: true };
  const owner = { kind: 'application' as const, applicationId };
  const assignment: SecurityRecord = { kind: 'role-assignment', id: 'wp0.developer-assignment', userId: developmentUsers[2].id, roleId: 'wp0.developer-role', status: 'active', scope, startsAt: '2026-01-01T00:00:00Z', endsAt: null };
  await activate(applicationId, [
    { ...base('wp0.developer-set'), kind: 'permission-set', owner, includes: [], rules: [
      ...['ui.application.view', 'ui.application.edit', 'ui.workflow.edit', ...dataPermissions].map((permissionId, i) => ({ id: `wp0.allow.${i}`, permissionId, effect: 'allow' as const, scope })),
      { id: 'wp0.deny-private', permissionId: 'dataset.write', effect: 'deny', scope, fields: [fieldPrivate] },
    ] }, { ...base('wp0.developer-role'), kind: 'role', owner, permissionSets: [{ id: 'wp0.developer-set' }] }, assignment,
  ]);
  const key = 'wp0-trusted-ui-host-key-at-least-32-characters';
  const host = createBuilderDevelopmentHost({ identity: { enabled: true, token: 'unused-legacy-development-token-42', allowLegacyToken: false,
    userId: developmentUsers[2].id, trustedUiServerKey: key, applicationId, authorityId: V1_AUTHORITY_ID }, paths: { policyStore: policyPath,
      resourceRegistry: dataset.paths.resourceRegistry, schemaPublications: dataset.paths.schemaPublications, schemaApplicationState: dataset.paths.schemaApplicationState, ormData: dataset.paths.ormData },
    pin: dataset.pin, serving: dataset.serving, registration: dataset.registration, port: 0, workflows: { permissionId: 'ui.workflow.edit', ids: [workflowId] }, automation: { workflowsRoot, triggersRoot },
    management: { registryFile: path.join(runtime, 'development-applications.sqlite'), applicationsRoot: apps },
    permissions: { operation: { read: 'dataset.read', create: 'dataset.create', update: 'dataset.update' }, field: { read: 'dataset.read', write: 'dataset.write', filter: 'dataset.read', sort: 'dataset.read' } } });
  cleanup.push(async () => host.close());
  const server: Server = createServer(host.handler); await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  cleanup.push(() => new Promise<void>(resolve => server.close(() => resolve())));
  const hostUrl = `http://127.0.0.1:${(server.address() as { port: number }).port}`;
  const connections = [{ applicationId, key: 'wp0-created', hostUrl, trustedUiServerKey: key, policyStore: policyPath, datasetId, workflowIds: [workflowId] }];
  await writeFile(hostsFile, JSON.stringify(connections));
  expect((await fetch(origin + '/api/apps/wp0-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('ready');
  await writeFile(hostsFile, '{invalid');
  expect((await fetch(origin + '/api/apps/wp0-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('failed-incomplete');
  await writeFile(hostsFile, JSON.stringify(connections));
  const data = '/api/apps/wp0-created/application-data';
  const inserted = await post(`${data}/operations`, { datasetId, operation: 'insert', records: [{ id: 'record-a', name: 'created' }] }, creator);
  expect(inserted.value, JSON.stringify(inserted.value)).toMatchObject({ success: true, committed: true });
  expect((await post(`${data}/queries`, { datasetId, select: ['id', 'name'] }, creator)).value).toMatchObject([{ id: 'record-a', name: 'created' }]);
  const storage = path.join(dataset.paths.ormData, `${applicationId}__default__records.json`);
  const beforeDenied = await readFile(storage, 'utf8');
  const denied = await post(`${data}/operations`, { datasetId, operation: 'update', records: [{ id: 'record-a', privateNote: 'forbidden' }] }, creator);
  expect(denied.value.success, JSON.stringify(denied)).toBe(false); expect(await readFile(storage, 'utf8')).toBe(beforeDenied);
  expect((await post(`${data}/queries`, { datasetId, actor: { type: 'user', userId: developmentUsers[0].id } }, creator)).status).toBe(403);
  expect((await post(`${data}/queries`, { datasetId }, { ...creator, authorization: 'Bearer forged' })).status).toBe(403);
  expect((await post(`${data}/queries`, { datasetId: 'unknown-dataset' }, creator)).status).toBe(403);
  expect((await post(`${data}/queries`, { datasetId: 'dataset-person-form-reference' }, creator)).status).toBe(403);
  expect((await post(`${data}/queries`, { datasetId, applicationId: second.value.appId }, creator)).status).toBe(403);
  const foreign = await post('/api/apps/wp0-created/security/stage', { changes: [{ document: doc({ ...base('wp0.foreign-role'), kind: 'role', owner: { kind: 'application', applicationId: second.value.appId }, permissionSets: [] }) }], expectedRevision: policy.revision() });
  expect(foreign.value.diagnostics, JSON.stringify(foreign)).toEqual([]);
  const foreignActivation = await post('/api/apps/wp0-created/security/activate', { candidateId: foreign.value.id, checksum: foreign.value.checksum, expectedRevision: foreign.value.baseRevision, reason: 'Attempted cross-Application owner capture' });
  expect(foreignActivation.value).toMatchObject({ status: 'rejected', diagnostics: [{ code: 'ADMIN_OWNERSHIP_DENIED' }] });
  expect(policy.documents().some(d => d.definition.id === 'wp0.foreign-role')).toBe(false);
  expect((await post(`${data}/workflows`, { workflowId, primaryRecordId: 'record-a' }, unrelated)).status).toBe(403);
  expect((await post(`${data}/workflows`, { workflowId: 'unknown-workflow', primaryRecordId: 'record-a' }, creator)).status).toBe(403);
  const invocation = await post(`${data}/workflows`, { workflowId, primaryRecordId: 'record-a' }, creator);
  expect(invocation.value).toMatchObject({ success: true, completedSteps: 1, committedSteps: 1 });
  expect((await post(`${data}/queries`, { datasetId, select: ['id', 'name'] }, creator)).value).toMatchObject([{ name: 'workflow-completed' }]);
  const preview = await post('/api/apps/wp0-created/preview', {}, creator);
  expect(preview.status).toBe(200);
  const page = await fetch(`${preview.value.url}/wp0-created/`);
  expect(page.status).toBe(200); expect(await page.text()).toContain('src/main.ts');
  const previewResponse = await fetch(new URL(`${data}/queries`, preview.value.url), { method: 'POST', headers: { ...creator, origin: new URL(preview.value.url).origin }, body: JSON.stringify({ datasetId, select: ['id', 'name'] }) });
  expect(previewResponse.status).toBe(200); expect(await previewResponse.json()).toMatchObject([{ name: 'workflow-completed' }]);
  const previewWorkflow = await fetch(new URL(`${data}/workflows`, preview.value.url), { method: 'POST', headers: { ...creator, origin: new URL(preview.value.url).origin }, body: JSON.stringify({ workflowId, primaryRecordId: 'record-a' }) });
  expect(previewWorkflow.status).toBe(200); expect(await previewWorkflow.json()).toMatchObject({ success: true, committedSteps: 1 });
  await activate(applicationId, [{ ...assignment, status: 'inactive' }]);
  const beforeRevoked = await readFile(storage, 'utf8');
  expect((await post(`${data}/workflows`, { workflowId, primaryRecordId: 'record-a' }, creator)).status).toBe(403);
  const revoked = await post(`${data}/operations`, { datasetId, operation: 'update', records: [{ id: 'record-a', name: 'revoked' }] }, creator);
  expect(revoked.value.success).toBe(false); expect(await readFile(storage, 'utf8')).toBe(beforeRevoked);
  expect((await post('/api/apps/wp0-created/onboarding', { administratorUserId: developmentUsers[2].id, reason: 'Attempted replay' })).value.diagnostics).toMatchObject([{ code: 'PROVISION_ALREADY_EXISTS' }]);
  await writeFile(hostsFile, '[]');
  expect((await fetch(origin + '/api/apps/wp0-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('runtime-required');
  await writeFile(hostsFile, JSON.stringify(connections));
  expect((await fetch(origin + '/api/apps/wp0-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('ready');
  const beforeReplay = policy.revision();
  const replay = await initializeDevelopmentPlatformSecurity(new SecurityDefinitionService(policy), { async verify() {
    return { operatorId: 'explicit-local-test-operator', deploymentId: developmentSecurityConfiguration.deploymentId, strong: true as const, capabilityId: developmentSecurityConfiguration.bootstrapCapabilityId };
  } }, developmentSecurityScopes, developmentSecurityConfiguration, { context: {}, administratorUserId: developmentUsers[2].id, grantablePermissionIds: [], applicationAnchors: [], expectedRevision: policy.revision(), reason: 'Attempted repeated setup' });
  expect(replay).toMatchObject({ status: 'rejected', diagnostics: [{ code: 'BOOTSTRAP_ALREADY_INITIALIZED' }] });
  expect(policy.revision()).toBe(beforeReplay);
  expect(policy.adminAudit().some(a => a.operation === 'provision-application' && a.applicationId === applicationId && a.actorId === developmentUsers[1].id)).toBe(true);
  const evidenceRoot = path.resolve(process.env.UI_PLATFORM_TEST_EVIDENCE_ROOT ?? 'docs/architecture/evidence', 'builder-v1-wp0'); await mkdir(evidenceRoot, { recursive: true });
  await writeFile(path.join(evidenceRoot, 'acceptance.json'), JSON.stringify({ verifiedAt: new Date().toISOString(), applicationId, otherApplicationId: second.value.appId,
    datasetId, fieldIds: [fieldId, fieldName, fieldPrivate], workflowId, applicationCreator: developmentUsers[2].id, platformSecurityAdministrator: developmentUsers[1].id,
    applicationSecurityAdministrator: developmentUsers[0].id, policyRevision: policy.revision(), activation: dataset.activation, publication: dataset.pin.publication,
    serving: dataset.serving, workflowInvocation: invocation.value, administrationAudit: policy.adminAudit(),
    checks: ['normal-standard-creation', 'no-automatic-creator-access', 'explicit-platform-bootstrap', 'explicit-first-application-anchor', 'protected-read', 'committed-write',
      'denied-write-unchanged-storage', 'mandatory-workflow-success', 'unauthorized-workflow-denial', 'cross-application-owner-rejection', 'forged-actor-and-bearer-rejection',
      'unknown-dataset-and-workflow-rejection', 'role-revocation-unchanged-storage', 'bootstrap-replay-rejection', 'provision-replay-rejection', 'failed-onboarding-and-reconnection', 'normal-managed-preview'],
    provenance: { applications: 'normal creation API from Standard', security: 'trusted local one-time setup, then WP3 protected HTTP activation',
      dataset: 'explicit local owner bootstrap using real ActivationController CRUD health probes and AppliedResourceRegistry', workflow: 'existing AutomationStore source creation; host-approved inherited protected CRUD',
      preview: 'normal managed preview API and actual Standard HTML response' }, disposableTestEnvironment: true }, null, 2));
}, 180_000);
