import assert from 'node:assert/strict';
import { V1DevelopmentIdentity } from '../src/server/v1-development-identity.js';
import { V1_AUTHORITY_ID, V1_FIXTURE_APPLICATION_ID, developmentUsers } from '../src/server/v1-development-policy.js';
import { createServer, type Server } from 'node:http';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';


import { SecurityDefinitionService, SecurityDefinitionStore, type SecurityDocument, type SecurityRecord } from '@ui-platform/i-am/definitions';
import { JsonFileDatasetOrm } from '../../UI Platform Data Services/packages/orm/src/index.js';
import { SchemaManager, type DatasetSchema } from '../../UI Platform Data Services/packages/schema-manager/src/index.js';
import { AppliedResourceRegistry, CanonicalSchemaReader, QualifiedAppliedResolver, verifyCandidate, type ActivationPin } from '../../UI Platform Data Services/packages/schema-application/src/index.js';
import { createSecuredDevelopmentHost, type SecuredDevelopmentHostConfig } from '@ui-platform/dataset-operations';

const cleanup: Array<() => Promise<void>> = [];
export async function closeFormReference() { for (const close of cleanup.splice(0).reverse()) await close(); }
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
export async function startFormReference(uiPort?: number) {
  const root = await mkdtemp(join(tmpdir(), 'visual-form-data-'));
  cleanup.push(() => rm(root, { recursive: true, force: true }));
  const publications = join(root, 'publications'), stateRoot = join(root, 'state'), ormData = join(root, 'orm');
  await Promise.all([publications, stateRoot, ormData, join(root, 'apps'), join(root, 'templates')].map(path => mkdir(path, { recursive: true })));
  const reference = { appId: V1_FIXTURE_APPLICATION_ID, dataset: 'people' };
  const schema: DatasetSchema = JSON.parse(await readFile('references/form-data/person.dataset.json', 'utf8'));
  const schemas = new SchemaManager(publications);
  await schemas.createDraft(reference, schema);
  const published = await schemas.publishDraft(reference);
  const pin: ActivationPin = { environmentId: 'development', appId: V1_FIXTURE_APPLICATION_ID, datasetId: 'dataset-person-form-reference', reference,
    publication: { definitionType: 'dataset-schema', definitionFormatVersion: 1, version: published.version,
      checksumFormat: 'canonical-json-v1', checksum: published.checksum } };
  const registration = { reference, primaryKey: 'id', fields: schema.fields.map(field => ({ name: field.key, type: 'string' as const, ...(field.required ? { required: true } : {}) })) };
  const orm = new JsonFileDatasetOrm(ormData); orm.register(registration);
  const reader = new CanonicalSchemaReader(schemas);
  const verified = await verifyCandidate({ pin, reader, orm });
  const generation = randomUUID(), stamp = '2026-10-03T00:00:00.000Z', operationId = 'visual-form-data-reference';
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
  const owner = new AppliedResourceRegistry(join(root, 'resources.sqlite'), V1_AUTHORITY_ID, 'system', pin.environmentId,
    { async assertApplicationOwner(context) { if (context !== ownerContext) throw new Error('OWNER_DENIED'); },
      async assertDatasetRetired() { throw new Error('RETIREMENT_DENIED'); } }, schemas,
    new QualifiedAppliedResolver({ stateRoot, pin, reader, runtime: { generation, orm, async assertServing() {} } }));
  await owner.registerApplication(ownerContext, V1_FIXTURE_APPLICATION_ID, 'Person Form reference');
  await owner.bindAppliedDataset(ownerContext, V1_FIXTURE_APPLICATION_ID, 'dataset-person-form-reference'); owner.close();
  const policyPath = join(root, 'security.sqlite');
  const identity = new V1DevelopmentIdentity({ enabled: true, environment: 'development', developmentRuntime: true, policyStorePath: policyPath, origins: ['http://127.0.0.1:5190'] }); identity.close();
  const store = new SecurityDefinitionStore(policyPath), service = new SecurityDefinitionService(store);
  const appRef = { authorityId: V1_AUTHORITY_ID, applicationId: V1_FIXTURE_APPLICATION_ID, kind: 'application' as const, id: V1_FIXTURE_APPLICATION_ID };
  const datasetRef = { authorityId: V1_AUTHORITY_ID, applicationId: V1_FIXTURE_APPLICATION_ID, kind: 'dataset' as const, id: 'dataset-person-form-reference' };
  const scope = { resource: appRef, descendants: true };
  const permissions = ['read', 'create', 'write'].map(id => document({ kind: 'permission', id: `p-${id}`, key: id, name: id,
    status: 'active', owner: { kind: 'application', applicationId: V1_FIXTURE_APPLICATION_ID }, lifecycle: 'active', applicableKinds: ['dataset'] }));
  const records: SecurityDocument[] = [...permissions,
    document({ kind: 'permission-set', id: 'set-a', key: 'set-a', name: 'Set A', status: 'active', owner: { kind: 'application', applicationId: V1_FIXTURE_APPLICATION_ID }, includes: [],
      rules: [
        { id: 'allow-read', permissionId: 'p-read', effect: 'allow', scope: { resource: datasetRef, descendants: true } },
        { id: 'allow-create', permissionId: 'p-create', effect: 'allow', scope: { resource: datasetRef, descendants: true } },
        { id: 'allow-write', permissionId: 'p-write', effect: 'allow', scope: { resource: datasetRef, descendants: true } },
        { id: 'deny-secret-write', permissionId: 'p-write', effect: 'deny', scope: { resource: datasetRef, descendants: true }, fields: ['person-internalNotes'] },
      ] }),
    document({ kind: 'role', id: 'role-a', key: 'role-a', name: 'Role A', status: 'active', owner: { kind: 'application', applicationId: V1_FIXTURE_APPLICATION_ID }, permissionSets: [{ id: 'set-a' }] }),
    document({ kind: 'role-assignment', id: 'assignment-a', status: 'active', userId: developmentUsers[0].id, roleId: 'role-a', scope, startsAt: '2026-01-01T00:00:00Z', endsAt: null })];
  const staged = service.stage({ changes: records.map(document => ({ document })), expectedRevision: store.revision(), source: 'api', actorId: 'developer', idempotencyKey: randomUUID() });
  assert.deepEqual(staged.diagnostics, []); assert.equal(service.activate(staged.id, staged.checksum, 'developer').status, 'activated');
  store.close();
  const token = 'wp5-development-token-with-fixed-user';
  const config: SecuredDevelopmentHostConfig = { identity: { enabled: true, trustedUiServerKey: 'form-reference-trusted-server-key-2026', allowLegacyToken: false, token, userId: developmentUsers[0].id, applicationId: V1_FIXTURE_APPLICATION_ID, authorityId: V1_AUTHORITY_ID },
    paths: { policyStore: policyPath, resourceRegistry: join(root, 'resources.sqlite'), schemaPublications: publications, schemaApplicationState: stateRoot, ormData },
    pin, serving: { generation, fingerprint: verified.verification.ormFingerprint }, registration,
    permissions: { operation: { read: 'p-read', create: 'p-create', update: 'p-write' }, field: { read: 'p-read', filter: 'p-read', sort: 'p-read', write: 'p-write' } }, port: 4103 };
  const protectedHost = createSecuredDevelopmentHost(config, 'development');
  cleanup.push(async () => protectedHost.close());
  const protectedOrigin = await listen(createServer(protectedHost.handler));
  const port = await freePort();
  let output = '';
  const child: ChildProcess = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], { cwd: process.cwd(), windowsHide: true,
    env: { ...process.env, NODE_ENV: 'development', UI_PLATFORM_EDITOR: '0', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '1', UI_PLATFORM_V1_POLICY_STORE: policyPath, UI_PLATFORM_V1_TRUSTED_UI_KEY: 'form-reference-trusted-server-key-2026', UI_PLATFORM_UI_PORT: String(uiPort ?? port), UI_PLATFORM_WP5_APPLICATION_DATA: '1',
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
  return { root, origin, policyPath, ormData, schema }; 
}



