import { afterEach, expect, it } from 'vitest';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ApplicationDataClient, createHttpApplicationDataTransport } from '@uib/platform-core/application-data';
import { bindDatasetForm } from '@uib/platform-core/dataset-form';
import { SecurityDefinitionService, SecurityDefinitionStore, securityChecksum, type SecurityDocument, type SecurityRecord } from '@ui-platform/i-am/definitions';
import { JsonFileDatasetOrm } from '../../UI Platform Data Services/packages/orm/src/index.js';
import { SchemaManager, type DatasetSchema } from '../../UI Platform Data Services/packages/schema-manager/src/index.js';
import { AppliedResourceRegistry, CanonicalSchemaReader, QualifiedAppliedResolver, verifyCandidate, type ActivationPin } from '../../UI Platform Data Services/packages/schema-application/src/index.js';
import { createSecuredDevelopmentHost, type SecuredDevelopmentHostConfig } from '@ui-platform/dataset-operations';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); });
const document = (definition: SecurityRecord): SecurityDocument => ({ format: 'ui-platform.security', formatVersion: 1, definition });
async function listen(server: Server): Promise<string> {
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); if (!address || typeof address === 'string') throw new Error('LISTEN_FAILED');
  cleanup.push(() => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())));
  return `http://127.0.0.1:${address.port}`;
}
async function freePort(): Promise<number> {
  const server = createServer();
  const origin = await listen(server);
  const port = Number(new URL(origin).port);
  const close = cleanup.pop()!; await close();
  return port;
}
async function setup() {
  const root = await mkdtemp(join(tmpdir(), 'wp5-form-path-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const publications = join(root, 'publications'), stateRoot = join(root, 'state'), ormData = join(root, 'orm');
  await Promise.all([publications, stateRoot, ormData, join(root, 'apps'), join(root, 'templates')].map(path => mkdir(path, { recursive: true })));
  const reference = { appId: 'travel', dataset: 'tours' };
  const schema: DatasetSchema = { definitionType: 'dataset-schema', definitionFormatVersion: 1,
    dataset: { id: 'dataset-tours', key: 'tours', name: 'Tours', pluralName: 'Tours' },
    fields: [{ id: 'field-id', key: 'id', type: 'id', required: true }, { id: 'field-name', key: 'name', type: 'string' }, { id: 'field-secret', key: 'secret', type: 'string' }] };
  const schemas = new SchemaManager(publications);
  await schemas.createDraft(reference, schema);
  const published = await schemas.publishDraft(reference);
  const pin: ActivationPin = { environmentId: 'development', appId: 'travel', datasetId: 'dataset-tours', reference,
    publication: { definitionType: 'dataset-schema', definitionFormatVersion: 1, version: published.version,
      checksumFormat: 'canonical-json-v1', checksum: published.checksum } };
  const registration = { reference, primaryKey: 'id', fields: [
    { name: 'id', type: 'string' as const, required: true }, { name: 'name', type: 'string' as const }, { name: 'secret', type: 'string' as const }] };
  const orm = new JsonFileDatasetOrm(ormData); orm.register(registration);
  const reader = new CanonicalSchemaReader(schemas);
  const verified = await verifyCandidate({ pin, reader, orm });
  const generation = randomUUID(), stamp = '2026-10-03T00:00:00.000Z', operationId = 'wp5-form-application';
  const state = { formatVersion: 1, environmentId: pin.environmentId,
    records: [{ operationId, environmentId: pin.environmentId, appId: pin.appId, datasetId: pin.datasetId,
      reference, published: { version: pin.publication.version, checksum: pin.publication.checksum, schemaId: pin.datasetId },
      phase: 'applied', startedAt: stamp, updatedAt: stamp, verification: verified.verification,
      activation: { activatedAt: stamp, activator: 'ds0-wp2-activator-v1',
        healthCheck: `ds0-activation-health-v1:${generation}:sha256:${'a'.repeat(64)}` } }],
    ledger: ['applying', 'verified-pending-activation', 'applied'].map((phase, index) => ({ entryId: `entry-${index}`,
      operationId, environmentId: pin.environmentId, appId: pin.appId, datasetId: pin.datasetId, phase, recordedAt: stamp })) };
  const stateDir = join(stateRoot, 'environments', pin.environmentId, 'schema-application');
  await mkdir(stateDir, { recursive: true }); await writeFile(join(stateDir, 'state.json'), JSON.stringify(state));
  const ownerContext = {};
  const owner = new AppliedResourceRegistry(join(root, 'resources.sqlite'), 'resources', 'system', pin.environmentId,
    { async assertApplicationOwner(context) { if (context !== ownerContext) throw new Error('OWNER_DENIED'); },
      async assertDatasetRetired() { throw new Error('RETIREMENT_DENIED'); } }, schemas,
    new QualifiedAppliedResolver({ stateRoot, pin, reader, runtime: { generation, orm, async assertServing() {} } }));
  await owner.registerApplication(ownerContext, 'travel', 'Travel');
  await owner.bindAppliedDataset(ownerContext, 'travel', 'dataset-tours'); owner.close();
  const policyPath = join(root, 'security.sqlite');
  const store = new SecurityDefinitionStore(policyPath), service = new SecurityDefinitionService(store);
  const appRef = { authorityId: 'resources', applicationId: 'travel', kind: 'application' as const, id: 'travel' };
  const datasetRef = { authorityId: 'resources', applicationId: 'travel', kind: 'dataset' as const, id: 'dataset-tours' };
  const scope = { resource: appRef, descendants: true };
  const permissions = ['read', 'create', 'write'].map(id => document({ kind: 'permission', id: `p-${id}`, key: id, name: id,
    status: 'active', owner: { kind: 'application', applicationId: 'travel' }, lifecycle: 'active', applicableKinds: ['dataset'] }));
  const records: SecurityDocument[] = [document({ kind: 'user', id: 'developer-a', displayName: 'Developer A', status: 'active' }), ...permissions,
    document({ kind: 'permission-set', id: 'set-a', key: 'set-a', name: 'Set A', status: 'active', owner: { kind: 'application', applicationId: 'travel' }, includes: [],
      rules: [
        { id: 'allow-read', permissionId: 'p-read', effect: 'allow', scope: { resource: datasetRef, descendants: true } },
        { id: 'deny-blocked-read', permissionId: 'p-read', effect: 'deny', scope: { resource: datasetRef, descendants: true },
          where: { op: 'eq', left: { kind: 'field', fieldId: 'field-name' }, right: { kind: 'literal', value: 'Blocked' } } },
        { id: 'deny-secret-read', permissionId: 'p-read', effect: 'deny', scope: { resource: datasetRef, descendants: true }, fields: ['field-secret'] },
        { id: 'allow-create', permissionId: 'p-create', effect: 'allow', scope: { resource: datasetRef, descendants: true } },
        { id: 'allow-write', permissionId: 'p-write', effect: 'allow', scope: { resource: datasetRef, descendants: true } },
        { id: 'deny-secret-write', permissionId: 'p-write', effect: 'deny', scope: { resource: datasetRef, descendants: true }, fields: ['field-secret'] },
      ] }),
    document({ kind: 'role', id: 'role-a', key: 'role-a', name: 'Role A', status: 'active', owner: { kind: 'application', applicationId: 'travel' }, permissionSets: [{ id: 'set-a' }] }),
    document({ kind: 'role-assignment', id: 'assignment-a', status: 'active', userId: 'developer-a', roleId: 'role-a', scope, startsAt: '2026-01-01T00:00:00Z', endsAt: null })];
  const staged = service.stage({ changes: records.map(document => ({ document })), expectedRevision: 0, source: 'api', actorId: 'developer', idempotencyKey: randomUUID() });
  expect(staged.diagnostics).toEqual([]); expect(service.activate(staged.id, staged.checksum, 'developer').status).toBe('activated');
  store.close();
  const token = 'wp5-development-token-with-fixed-user';
  const config: SecuredDevelopmentHostConfig = { identity: { enabled: true, token, userId: 'developer-a', applicationId: 'travel', authorityId: 'resources' },
    paths: { policyStore: policyPath, resourceRegistry: join(root, 'resources.sqlite'), schemaPublications: publications, schemaApplicationState: stateRoot, ormData },
    pin, serving: { generation, fingerprint: verified.verification.ormFingerprint }, registration,
    permissions: { operation: { read: 'p-read', create: 'p-create' }, field: { read: 'p-read', write: 'p-write' } }, port: 4103 };
  const protectedHost = createSecuredDevelopmentHost(config, 'development');
  cleanup.push(async () => protectedHost.close());
  const protectedOrigin = await listen(createServer(protectedHost.handler));
  const port = await freePort();
  let output = '';
  const child: ChildProcess = spawn(process.execPath, ['dist-server/server/index.js'], { cwd: process.cwd(), windowsHide: true,
    env: { ...process.env, NODE_ENV: 'development', UI_PLATFORM_EDITOR: '0', UI_PLATFORM_WP5_APPLICATION_DATA: '1',
      UI_PLATFORM_WP5_DATASET_HOST_URL: protectedOrigin, UI_PLATFORM_API_PORT: String(port), UI_APPS_DIR: join(root, 'apps'),
      UI_TEMPLATES_DIR: join(root, 'templates'), UI_RUNTIME_DIR: join(root, 'runtime') }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', value => { output += String(value); }); child.stderr!.on('data', value => { output += String(value); });
  cleanup.push(async () => { if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; } });
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(output);
    if (await fetch(origin + '/api/health').then(response => response.ok).catch(() => false)) break;
    await new Promise(resolve => setTimeout(resolve, 50));
    if (attempt === 99) throw new Error('UI host did not start: ' + output);
  }
  const client = new ApplicationDataClient(createHttpApplicationDataTransport({ endpoint: origin + '/api/application-data', credential: () => token }));
  return { root, origin, client, token, policyPath, ormData };
}

function formControls(values: Record<string, unknown>, hidden: string[] = []) {
  const controls = Object.entries(values).map(([name, value]) => ({ localName: 'input', type: 'text', value,
    getAttribute(attribute: string) { return attribute === 'name' ? name : attribute === 'hidden' && hidden.includes(name) ? '' : null; } }));
  return controls;
}
async function actualForm(controls: ReturnType<typeof formControls>, client: ApplicationDataClient) {
  if (!('HTMLElement' in globalThis)) (globalThis as Record<string, unknown>).HTMLElement = class extends EventTarget {
    localName = 'uib-forms-form'; shadowRoot: unknown; attributes = new Map<string, string>();
    attachShadow() { this.shadowRoot = { innerHTML: '', querySelector: () => null }; return this.shadowRoot; }
    getAttribute(name: string) { return this.attributes.get(name) ?? null; }
    hasAttribute(name: string) { return this.attributes.has(name); }
  };
  if (!('customElements' in globalThis)) {
    const registry = new Map<string, unknown>();
    (globalThis as Record<string, unknown>).customElements = { get: (name: string) => registry.get(name), define: (name: string, value: unknown) => registry.set(name, value) };
  }
  const { UibFormsForm } = await import('@ui-base/forms/form');
  const form = new UibFormsForm();
  form.querySelectorAll = (selector: string) => selector.startsWith('input,') ? controls : [];
  const result = new Promise<unknown>((resolve, reject) => bindDatasetForm(form, client, { datasetId: 'dataset-tours', operation: 'insert', onResult: resolve, onError: reject }));
  form._emitSubmit();
  return result;
}

it('routes the existing Form submit event through UI Platform and protected DOE, including crafted bypasses', async () => {
  const x = await setup();
  const accepted = await actualForm(formControls({ id: 'one', name: 'Hidden but allowed' }, ['name']), x.client);
  expect(accepted).toMatchObject({ success: true, committed: true });
  expect(await x.client.create('dataset-tours', [{ id: 'blocked', name: 'Blocked' }])).toMatchObject({ success: true, committed: true });
  expect(await x.client.create('dataset-tours', [{ id: 'null-name', name: null }])).toMatchObject({ success: true, committed: true });
  const pageRead = await x.client.read('dataset-tours', { select: ['id', 'name', 'secret'] });
  expect(pageRead).toEqual([{ id: 'one', name: 'Hidden but allowed' }, { id: 'null-name', name: null }]);
  await expect(x.client.read('dataset-tours', { select: ['name'], where: { field: 'secret', op: 'eq', value: 'injected' } })).rejects.toThrow('APPLICATION_DATA_REQUEST_DENIED');
  const dataFile = join(x.ormData, 'travel__default__tours.json');
  const before = await readFile(dataFile, 'utf8');
  const rejected = await actualForm(formControls({ id: 'two', name: 'Valid', secret: 'hidden but unauthorized' }, ['secret']), x.client);
  expect(rejected).toMatchObject({ success: false, committed: false });
  expect(await readFile(dataFile, 'utf8')).toBe(before);
  const path = x.origin + '/api/application-data/operations';
  const body = { datasetId: 'dataset-tours', operation: 'insert', records: [{ id: 'three', name: 'Direct', secret: 'injected' }] };
  const direct = await fetch(path, { method: 'POST', headers: { authorization: `Bearer ${x.token}`, 'content-type': 'application/json', 'x-user-id': 'administrator' }, body: JSON.stringify(body) });
  expect(direct.status).toBe(200); expect(await direct.json()).toMatchObject({ success: false, committed: false });
  expect(await readFile(dataFile, 'utf8')).toBe(before);
  expect((await fetch(path, { method: 'POST', headers: { authorization: `Bearer ${x.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ ...body, actor: { type: 'user', userId: 'administrator' } }) })).status).toBe(403);
  expect((await fetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).status).toBe(403);
  const store = new SecurityDefinitionStore(x.policyPath);
  const user = store.documents().find(value => value.definition.kind === 'user')!;
  const service = new SecurityDefinitionService(store);
  const candidate = service.stage({ changes: [{ document: { ...user, definition: { ...user.definition, status: 'inactive' } }, expectedChecksum: securityChecksum(user) }],
    expectedRevision: store.revision(), source: 'api', actorId: 'developer', idempotencyKey: randomUUID() });
  expect(candidate.diagnostics).toEqual([]); expect(service.activate(candidate.id, candidate.checksum, 'developer').status).toBe('activated');
  store.close();
  expect((await fetch(path, { method: 'POST', headers: { authorization: `Bearer ${x.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ datasetId: 'dataset-tours', operation: 'insert', records: [{ id: 'four', name: 'Disabled' }] }) })).status).toBe(403);
  expect(await readFile(dataFile, 'utf8')).toBe(before);
}, 60_000);
