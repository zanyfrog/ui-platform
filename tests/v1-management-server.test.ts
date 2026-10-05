import { afterEach, expect, it } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { V1_FIXTURE_APPLICATION_ID, V1_FIXTURE_APPLICATION_KEY, developmentUsers } from '../src/server/v1-development-policy.js';
import { V1_AUTHORITY_ID } from '../src/server/v1-development-policy.js';
import { V1DevelopmentIdentity } from '../src/server/v1-development-identity.js';
import { SecurityDefinitionService, SecurityDefinitionStore, type SecurityDocument, type SecurityRecord } from '@ui-platform/i-am/definitions';
import { createSecuredDevelopmentHost, type SecuredDevelopmentHostConfig } from '@ui-platform/dataset-operations';
import { AppliedResourceRegistry, QualifiedAppliedResolver } from '../../UI Platform Data Services/packages/schema-application/src/index.js';
import { fixture, applied, generation, registration } from '../../UI Platform Data Services/packages/schema-application/tests/r1-fixtures.js';
import { CanonicalSchemaReader } from '../../UI Platform Data Services/packages/schema-application/src/index.js';
import { randomUUID } from 'node:crypto';
import { ApplicationDataClient, createSessionApplicationDataTransport } from '@uib/platform-core/application-data';
import { bindDatasetForm } from '@uib/platform-core/dataset-form';

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0).reverse()) await cleanup(); });

async function start(prepare?: (root: string) => Promise<{ datasetUrl: string; key: string }>) {
  const root = await mkdtemp(path.join(tmpdir(), 'uib-v1-server-'));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  const apps = path.join(root, 'apps'), app = path.join(apps, V1_FIXTURE_APPLICATION_KEY);
  await mkdir(path.join(app, 'src', 'pages'), { recursive: true });
  await writeFile(path.join(app, 'src', 'pages', 'Home.ts'), 'export const title = "Home";\n');
  await writeFile(path.join(app, 'src', 'main.ts'), 'export {};\n');
  await writeFile(path.join(app, 'app.manifest.json'), JSON.stringify({ manifestVersion: '1.0.0', appId: V1_FIXTURE_APPLICATION_ID,
    template: 'v1-test', templateVersion: '1.0.0', packages: {}, foundationImports: {} }));
  await writeFile(path.join(app, '.v1-development-fixture.json'), JSON.stringify({ applicationId: V1_FIXTURE_APPLICATION_ID }));
  await writeFile(path.join(app, 'app.settings.json'), JSON.stringify({ application: { name: 'V1 Identity Fixture', status: 'active' } }));
  await writeFile(path.join(app, 'app-services.json'), '{}');
  await writeFile(path.join(app, 'package.json'), '{}');
  await writeFile(path.join(app, 'tsconfig.json'), '{}');
  for (const [bundle, type, file] of [['form-bundle', 'form', 'form.json'], ['workflow-bundle', 'workflow', 'workflow.json']] as const) {
    await mkdir(path.join(app, bundle), { recursive: true });
    await writeFile(path.join(app, bundle, 'artifact.json'), JSON.stringify({ schemaVersion: 1, definitionVersion: 1,
      artifactId: `v1-${type}`, artifactType: type, name: `V1 ${type}`, files: { definition: file } }));
    await writeFile(path.join(app, bundle, file), '{}');
  }
  const dataset = await prepare?.(root);
  const probe = createServer(); await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as { port: number }).port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  let output = '';
  const child: ChildProcess = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], { cwd: process.cwd(), windowsHide: true,
    env: { ...process.env, NODE_ENV: 'development', UI_PLATFORM_EDITOR: '0', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '1',
      UI_PLATFORM_V1_POLICY_STORE: path.join(root, 'policy.sqlite'), UI_PLATFORM_API_PORT: String(port), UI_PLATFORM_UI_PORT: String(port),
      ...(dataset ? { UI_PLATFORM_WP5_APPLICATION_DATA: '1', UI_PLATFORM_WP5_DATASET_HOST_URL: dataset.datasetUrl,
        UI_PLATFORM_V1_TRUSTED_UI_KEY: dataset.key } : {}),
      UI_APPS_DIR: apps, UI_RUNTIME_DIR: path.join(root, 'runtime'), UI_TEMPLATES_DIR: path.join(root, 'templates') },
    stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', bytes => { output += String(bytes); }); child.stderr!.on('data', bytes => { output += String(bytes); });
  cleanups.push(async () => { if (child.exitCode === null && child.signalCode === null) { const exited = once(child, 'exit'); child.kill(); await exited; } });
  const origin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (child.exitCode !== null) throw new Error(output);
    if (await fetch(origin + '/api/health').then(response => response.ok).catch(() => false)) return origin;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`V1 server did not start: ${output}`);
}

it('uses one V1 session for real Page and Form APIs and denies direct Workflow and application mutation', async () => {
  const origin = await start();
  const anonymous = await fetch(origin + '/api/development-identity/session');
  const initial = await anonymous.json();
  const v1Cookie = anonymous.headers.get('set-cookie')!.split(';')[0]!;
  expect((await fetch(origin + '/api/apps', { headers: { cookie: v1Cookie } })).status).toBe(401);
  const login = await fetch(origin + '/api/development-identity/session', { method: 'POST',
    headers: { cookie: v1Cookie, origin, 'content-type': 'application/json', 'x-v1-csrf': initial.csrfToken },
    body: JSON.stringify({ email: 'mixed@example.local', userId: developmentUsers[0].id }) });
  expect(login.status).toBe(200); expect((await login.json()).user.userId).toBe(developmentUsers[4].id);
  const headers = { cookie: v1Cookie, origin, 'content-type': 'application/json' };
  expect((await fetch(origin + '/api/apps', { headers }).then(response => response.json())).map((app: { appId: string }) => app.appId))
    .toEqual([V1_FIXTURE_APPLICATION_ID]);
  const pageUrl = `${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/page?source=src%2Fpages%2FHome.ts`;
  const pageRead = await fetch(pageUrl, { headers }); expect(pageRead.status).toBe(200);
  const page = await pageRead.json();
  expect((await fetch(pageUrl, { method: 'PUT', headers,
    body: JSON.stringify({ source: 'export const title = "Changed";\n', expectedHash: page.hash }) })).status).toBe(200);
  expect((await fetch(`${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/settings`, { method: 'PUT', headers, body: '{}' })).status).toBe(403);
  expect((await fetch(`${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/security/activate`, { method: 'POST',
    headers, body: '{}' })).status).toBe(403);
  const editorResponse = await fetch(origin + '/api/editor/session', { headers });
  expect(editorResponse.status).toBe(200);
  const editor = await editorResponse.json();
  expect(editor.principal.subjectId).toBe(developmentUsers[4].id);
  const editorCookie = editorResponse.headers.get('set-cookie')!.split(';')[0]!;
  const editorHeaders = { cookie: `${v1Cookie}; ${editorCookie}`, origin, 'content-type': 'application/json',
    'x-editor-revision': editor.revision, 'x-editor-csrf': editor.csrfToken };
  const discovery = await fetch(`${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/artifacts`, { headers: editorHeaders });
  expect(discovery.status).toBe(200);
  const artifacts = await discovery.json() as Array<{ artifactId: string; locator: string }>;
  expect(artifacts.map(artifact => artifact.artifactId)).toContain('v1-form');
  expect(artifacts.map(artifact => artifact.artifactId)).not.toContain('v1-workflow');
  const adminAnonymous = await fetch(origin + '/api/development-identity/session');
  const adminInitial = await adminAnonymous.json(), adminCookie = adminAnonymous.headers.get('set-cookie')!.split(';')[0]!;
  expect((await fetch(origin + '/api/development-identity/session', { method: 'POST', headers: { cookie: adminCookie,
    origin, 'content-type': 'application/json', 'x-v1-csrf': adminInitial.csrfToken },
    body: JSON.stringify({ email: 'admin@example.local' }) })).status).toBe(200);
  const adminEditorResponse = await fetch(origin + '/api/editor/session', { headers: { cookie: adminCookie } });
  const adminEditor = await adminEditorResponse.json(), adminEditorCookie = adminEditorResponse.headers.get('set-cookie')!.split(';')[0]!;
  const adminHeaders = { cookie: `${adminCookie}; ${adminEditorCookie}`, 'x-editor-revision': adminEditor.revision };
  const adminArtifacts = await fetch(`${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/artifacts`, { headers: adminHeaders })
    .then(response => response.json()) as Array<{ artifactId: string; locator: string }>;
  const workflowLocator = adminArtifacts.find(artifact => artifact.artifactId === 'v1-workflow')!.locator;
  const workflowUrl = `${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/artifacts/${workflowLocator}`;
  expect((await fetch(workflowUrl, { headers: editorHeaders })).status).toBe(403);
  expect((await fetch(workflowUrl, { method: 'PUT', headers: editorHeaders, body: '{}' })).status).toBe(403);
  const form = artifacts.find(artifact => artifact.artifactId === 'v1-form')!;
  const formUrl = `${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/artifacts/${form.locator}`;
  const loaded = await fetch(formUrl, { headers: editorHeaders }).then(response => response.json());
  expect((await fetch(formUrl, { method: 'PUT', headers: editorHeaders,
    body: JSON.stringify({ expectedChecksum: loaded.checksum, files: { 'form.json': '{"fields":[]}' } }) })).status).toBe(200);
  expect((await fetch(`${origin}/api/apps/${V1_FIXTURE_APPLICATION_KEY}/artifacts/${form.locator}`, { method: 'PUT',
    headers: { ...editorHeaders, 'x-editor-revision': 'forged' }, body: '{}' })).status).toBe(403);
});

async function prepareDataset(root: string) {
  const policyPath = path.join(root, 'policy.sqlite');
  const seed = new V1DevelopmentIdentity({ enabled: true, environment: 'development', developmentRuntime: true,
    policyStorePath: policyPath, origins: ['http://localhost:5174'] }); seed.close();
  const f = await fixture(V1_FIXTURE_APPLICATION_ID), a = await applied(f);
  const resourcePath = path.join(f.root, 'resources.sqlite'), ownerContext = {};
  const owner = new AppliedResourceRegistry(resourcePath, V1_AUTHORITY_ID, 'system', 'development', {
    async assertApplicationOwner(context) { if (context !== ownerContext) throw new Error('OWNER_DENIED'); },
    async assertDatasetRetired() { throw new Error('RETIREMENT_DENIED'); },
  }, f.manager, new QualifiedAppliedResolver({ stateRoot: f.stateRoot, pin: f.pin,
    reader: new CanonicalSchemaReader(f.manager), runtime: a.runtime }));
  await owner.registerApplication(ownerContext, V1_FIXTURE_APPLICATION_ID, 'V1 Fixture');
  await owner.bindAppliedDataset(ownerContext, V1_FIXTURE_APPLICATION_ID, 'dataset-tours'); owner.close();
  const store = new SecurityDefinitionStore(policyPath), service = new SecurityDefinitionService(store);
  const appRef = { authorityId: V1_AUTHORITY_ID, applicationId: V1_FIXTURE_APPLICATION_ID,
    kind: 'application' as const, id: V1_FIXTURE_APPLICATION_ID };
  const datasetRef = { authorityId: V1_AUTHORITY_ID, applicationId: V1_FIXTURE_APPLICATION_ID,
    kind: 'dataset' as const, id: 'dataset-tours' };
  const doc = (definition: SecurityRecord): SecurityDocument => ({ format: 'ui-platform.security', formatVersion: 1, definition });
  const documents: SecurityDocument[] = [
    ...(['read', 'create', 'write'] as const).map(action => doc({ kind: 'permission', id: `v1.dataset.${action}`,
      key: `v1.dataset.${action}`, name: `Dataset ${action}`, status: 'active',
      owner: { kind: 'application', applicationId: V1_FIXTURE_APPLICATION_ID }, lifecycle: 'active', applicableKinds: ['dataset'] })),
    doc({ kind: 'permission-set', id: 'v1.dataset.reader', key: 'v1.dataset.reader', name: 'Dataset Reader', status: 'active',
      owner: { kind: 'application', applicationId: V1_FIXTURE_APPLICATION_ID }, includes: [],
      rules: (['read', 'create', 'write'] as const).map(action => ({ id: `v1.dataset.${action}.allow`,
        permissionId: `v1.dataset.${action}`, effect: 'allow' as const, scope: { resource: datasetRef, descendants: true } })) }),
    doc({ kind: 'role', id: 'v1.role.dataset-reader', key: 'v1.role.dataset-reader', name: 'Dataset Reader', status: 'active',
      owner: { kind: 'application', applicationId: V1_FIXTURE_APPLICATION_ID }, permissionSets: [{ id: 'v1.dataset.reader' }] }),
    doc({ kind: 'role-assignment', id: 'v1.assignment.dataset-reader', status: 'active', userId: developmentUsers[4].id,
      roleId: 'v1.role.dataset-reader', scope: { resource: appRef, descendants: true },
      startsAt: '2020-01-01T00:00:00.000Z', endsAt: null }),
  ];
  const candidate = service.stage({ changes: documents.map(document => ({ document })), expectedRevision: service.revision(),
    source: 'cli', actorId: 'v1-test-seed', idempotencyKey: randomUUID() });
  expect(candidate.activatable).toBe(true);
  expect(service.activate(candidate.id, candidate.checksum, 'v1-test-seed').status).toBe('activated'); store.close();
  const key = 'v1-server-to-dataset-secret-key-42';
  const config: SecuredDevelopmentHostConfig = { identity: { enabled: true, token: 'legacy-fixed-user-token-with-32-characters',
    userId: developmentUsers[0].id, applicationId: V1_FIXTURE_APPLICATION_ID, authorityId: V1_AUTHORITY_ID,
    trustedUiServerKey: key, allowLegacyToken: false },
    paths: { policyStore: policyPath, resourceRegistry: resourcePath, schemaPublications: f.publications,
      schemaApplicationState: f.stateRoot, ormData: path.join(f.root, 'orm') },
    pin: f.pin, serving: { generation, fingerprint: a.record.verification.ormFingerprint },
    registration: registration(V1_FIXTURE_APPLICATION_ID), permissions: { operation: { read: 'v1.dataset.read', create: 'v1.dataset.create' },
      field: { read: 'v1.dataset.read', write: 'v1.dataset.write' } }, port: 4103 };
  const host = createSecuredDevelopmentHost(config, 'development');
  const server = createServer(host.handler);
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  cleanups.push(async () => { await new Promise<void>(resolve => server.close(() => resolve())); host.close(); });
  const address = server.address() as { port: number };
  return { datasetUrl: `http://127.0.0.1:${address.port}/`, key };
}

it('propagates the same signed-in User through the protected DOE and real ORM', async () => {
  const origin = await start(prepareDataset);
  const anonymous = await fetch(origin + '/api/development-identity/session');
  const initial = await anonymous.json(), cookie = anonymous.headers.get('set-cookie')!.split(';')[0]!;
  const login = (email: string) => fetch(origin + '/api/development-identity/session', { method: 'POST',
    headers: { cookie, origin, 'content-type': 'application/json', 'x-v1-csrf': initial.csrfToken }, body: JSON.stringify({ email }) });
  expect((await login('mixed@example.local')).status).toBe(200);
  const query = () => fetch(origin + '/api/application-data/queries', { method: 'POST',
    headers: { cookie, origin, 'content-type': 'application/json' }, body: JSON.stringify({ datasetId: 'dataset-tours', select: ['name'] }) });
  const allowed = await query();
  expect(allowed.status).toBe(200);
  expect(await allowed.json()).toEqual([{ name: 'fixture' }]);
  const browserFetch = ((input: Parameters<typeof fetch>[0], init?: RequestInit) => fetch(input, {
    ...init, headers: { ...init?.headers, cookie, origin } })) as typeof fetch;
  const client = new ApplicationDataClient(createSessionApplicationDataTransport({ endpoint: origin + '/api/application-data', fetch: browserFetch }));
  const form = new EventTarget();
  const submitted = new Promise<unknown>((resolve, reject) => bindDatasetForm(form, client,
    { datasetId: 'dataset-tours', operation: 'insert', onResult: resolve, onError: reject }));
  form.dispatchEvent(new CustomEvent('uib-forms-form-submit', { detail: { valid: true,
    values: { id: 'from-v1-form', name: 'Submitted' } } }));
  await submitted;
  expect(await query().then(response => response.json())).toEqual([{ name: 'fixture' }, { name: 'Submitted' }]);
  expect((await login('workflow-editor@example.local')).status).toBe(200);
  expect((await query()).status).toBe(403);
});
