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
import { prepareDevelopmentDataset, bootstrapDevelopmentDataset } from '@ui-platform/dataset-operations';
import { createRequire } from 'node:module';
import { createServer as createViteServer } from 'vite';
import { generateForm, type ArtifactMetadata } from '@ui-platform/visual-artifacts';
import { createBuilderDevelopmentHost } from '../src/server/builder-development-host.js';
import { AutomationStore } from '../src/server/automation-store.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); }, 60_000);
const doc = (definition: SecurityRecord): SecurityDocument => ({ format: 'ui-platform.security', formatVersion: 1, definition });
const platformScope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system' as const, id: 'platform' }, descendants: true };
const dataPermissions = ['dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete', 'dataset.write'];
const editorPermissions = ['ui.artifact.view', 'ui.artifact.edit', 'ui.artifact.admin', 'ui.application.view', 'ui.application.edit', 'ui.page.view', 'ui.page.edit'];

it('WP3: Builder authoring, activation, serving, protected CRUD, security and restart', async () => {
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
    grantablePermissionIds: [...new Set(['ui.platform.application.create', 'ui.application.view', 'ui.application.edit', 'ui.workflow.edit', ...editorPermissions, ...dataPermissions])],
    capabilityDefinitions: dataPermissions.map(id => ({ id, applicableKinds: ['dataset', 'field'] })),
    applicationAnchors: [{ applicationId: V1_FIXTURE_APPLICATION_ID, administratorUserId: developmentUsers[0].id }], expectedRevision: policy.revision(), reason: 'Explicit local WP0 development setup' });
  expect(setup.status, JSON.stringify(setup)).toBe('activated');
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
    const route = applicationId === null ? '/api/platform/security' : `/api/apps/wp3-created/security`;
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
  const created = await post('/api/apps', { key: 'wp3-created', name: 'WP3 Dataset Application', templateId: 'standard' }, creator);
  expect(created.status, JSON.stringify(created.value) + output).toBe(201);
  const applicationId = created.value.appId as string;
  expect(applicationId).toMatch(/^[a-f0-9-]{36}$/);
  const second = await post('/api/apps', { key: 'wp3-other', name: 'WP3 Other Application', templateId: 'standard' }, creator);
  expect(second.status).toBe(201); expect(second.value.appId).not.toBe(applicationId);
  expect((await fetch(origin + '/api/apps/wp3-other', { headers: creator })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp3-created', { headers: creator })).status).toBe(403);
  expect((await post('/api/apps/wp3-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Unauthorized attempt' }, creator)).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp3-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('authority-required');
  expect((await post('/api/apps/wp3-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Explicit initial Application security administrator' })).value.status).toBe('activated');
  expect((await post('/api/apps/wp3-created/security/stage', { changes: [], expectedRevision: policy.revision() }, { ...security, 'x-v1-csrf': 'forged' })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp3-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('runtime-required');
  const registry = new DevelopmentApplicationRegistry(path.join(runtime, 'development-applications.sqlite'), apps); cleanup.push(async () => registry.close());
  const scope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'application' as const, id: applicationId }, descendants: true };
  const owner = { kind: 'application' as const, applicationId };
  const assignment: SecurityRecord = { kind: 'role-assignment', id: 'wp3.author-assignment', userId: developmentUsers[2].id, roleId: 'wp3.author-role', status: 'active', scope, startsAt: '2026-01-01T00:00:00Z', endsAt: null };
  await activate(applicationId, [
    { ...base('wp3.author-set'), kind: 'permission-set', owner, includes: [], rules: [...new Set(editorPermissions.concat(dataPermissions))].map((permissionId, i) => ({ id: `wp3.allow.${i}`, permissionId, effect: 'allow' as const, scope })) },
    { ...base('wp3.author-role'), kind: 'role', owner, permissionSets: [{ id: 'wp3.author-set' }] }, assignment,
  ]);
  const probeUi = createServer(); await new Promise<void>(resolve => probeUi.listen(0, '127.0.0.1', resolve));
  const uiPort = (probeUi.address() as { port: number }).port; await new Promise<void>(resolve => probeUi.close(() => resolve()));
  // Same-origin UI uses the API port allowed in the test host. Vite is middleware on that origin via a separate allowed Host.
  const vite = await createViteServer({ configFile: 'vite.config.ts', cacheDir: path.join(root, 'vite-cache'), optimizeDeps: { include: ['@ui-base/ui/component-reference'] }, server: { host: '127.0.0.1', port: uiPort, strictPort: true, proxy: { '/api': { target: origin, changeOrigin: true } } } });
  await vite.listen(); cleanup.push(() => vite.close());
  const playwright = createRequire(path.resolve('../ui-base/package.json'))('playwright');
  const browser = await playwright.chromium.launch({ headless: true, channel: 'msedge' }); cleanup.push(() => browser.close());
  const browserContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await browserContext.newPage();
  page.setDefaultTimeout(15_000);
  page.on('response', async (response: any) => { if (response.url().includes('/datasets/') && response.status() >= 400) console.log('Dataset error:', response.status(), await response.text().catch(() => 'response closed')); });
  const browserErrors: string[] = []; page.on('pageerror', (error: Error) => browserErrors.push(error.message));
  // Browser Origin must be the trusted API origin; route UI HTML/assets through Vite while API remains unmodified.
  const uiOrigin = `http://127.0.0.1:${uiPort}`;
  await page.route(`${origin}/**`, async (route: any) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.continue();
    const response = await fetch(`${uiOrigin}${url.pathname}${url.search}`);
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
  });
  await page.goto(origin);
  await page.getByLabel('Development identity', { exact: true }).selectOption(developmentUsers[2].email);
  await page.locator('[data-app="wp3-created"]').first().click();
  await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  const workspace = page.getByRole('region', { name: 'Application Builder workspace' });
  const creationResponse = page.waitForResponse((r: any) => r.url().endsWith('/datasets/create'));
  page.once('dialog', (dialog: any) => dialog.accept('Person'));
  await workspace.getByRole('button', { name: 'Create Dataset', exact: true }).click();
  const createdDataset = await (await creationResponse).json();
  expect(createdDataset.manifest, output).toMatchObject({ artifactType: 'dataset' });
  const locator = createdDataset.locator, datasetId = createdDataset.manifest.artifactId;
  const editor = workspace.getByLabel('Generic Artifact Editor', { exact: true });
  await editor.getByRole('tab', { name: 'Fields', exact: true }).click();
  await editor.getByRole('button', { name: 'Add field', exact: true }).click();
  await editor.getByLabel('Field name', { exact: true }).nth(1).fill('name');
  await editor.getByLabel('Required', { exact: true }).nth(1).check();
  await editor.getByRole('button', { name: 'Add field', exact: true }).click();
  await editor.getByLabel('Field name', { exact: true }).nth(2).fill('privateNote');
  await editor.getByRole('button', { name: 'Save now', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.artifact-editor [role=status]')?.textContent === 'Saved');
  const schemaFile = path.join(apps, 'wp3-created', 'datasets', datasetId, 'dataset.json');
  await editor.getByRole('button', { name: 'Add field', exact: true }).click();
  await editor.getByLabel('Field name', { exact: true }).nth(3).fill('temporaryNumber');
  await editor.getByLabel('Data type', { exact: true }).nth(3).selectOption('number');
  await editor.getByLabel('Use default value', { exact: true }).nth(3).check();
  await editor.getByLabel('Default value', { exact: true }).fill('7');
  await editor.getByRole('button', { name: 'Save now', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.artifact-editor [role=status]')?.textContent === 'Saved');
  expect(JSON.parse(await readFile(schemaFile, 'utf8')).fields[3]).toMatchObject({ key: 'temporaryNumber', type: 'number', default: 7 });
  await editor.getByRole('button', { name: 'Remove field', exact: true }).nth(3).click();
  await editor.getByRole('button', { name: 'Save now', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.artifact-editor [role=status]')?.textContent === 'Saved');
  const authoredSchema = JSON.parse(await readFile(schemaFile, 'utf8'));
  const fieldName = authoredSchema.fields[1].id, fieldPrivate = authoredSchema.fields[2].id;
  expect(authoredSchema.fields.map((f: any) => f.key)).toEqual(['id', 'name', 'privateNote']);
  // Rename retains identity and history across a real workspace switch.
  await editor.getByLabel('Field name', { exact: true }).nth(1).fill('displayName');
  await editor.getByRole('button', { name: 'Save now', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.artifact-editor [role=status]')?.textContent === 'Saved');
  expect(JSON.parse(await readFile(schemaFile, 'utf8')).fields[1].id).toBe(fieldName);
  await workspace.getByRole('navigation', { name: 'Application artifacts' }).locator('button').filter({ hasText: 'Home' }).first().click();
  await workspace.getByRole('navigation', { name: 'Application artifacts' }).getByRole('button', { name: 'Person', exact: true }).click();
  await editor.getByRole('button', { name: 'Undo', exact: true }).click();
  expect(await editor.getByLabel('Field name', { exact: true }).nth(1).inputValue()).toBe('name');
  await editor.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await editor.getByLabel('Field name', { exact: true }).nth(1).inputValue()).toBe('displayName');
  await editor.getByRole('button', { name: 'Undo', exact: true }).click();
  await editor.getByRole('button', { name: 'Save now', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.artifact-editor [role=status]')?.textContent === 'Saved');
  // Invalid ordinary draft is retained and must not replace saved source.
  const beforeInvalid = await readFile(schemaFile, 'utf8');
  const invalid = page.waitForResponse((r: any) => r.request().method() === 'PUT' && r.status() === 422);
  await editor.getByLabel('Field name', { exact: true }).nth(1).fill(''); await invalid;
  expect(await readFile(schemaFile, 'utf8')).toBe(beforeInvalid);
  await editor.getByLabel('Field name', { exact: true }).nth(1).fill('name');
  await editor.getByRole('button', { name: 'Save now', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.artifact-editor [role=status]')?.textContent === 'Saved');
  // Runtime restriction is activated through the existing trusted administration path, using UI-created Field IDs.
  await activate(applicationId, [{ ...base('wp3.author-set'), kind: 'permission-set', owner, includes: [], rules: [
    ...[...new Set(editorPermissions.concat(dataPermissions))].map((permissionId, i) => ({ id: `wp3.allow.${i}`, permissionId, effect: 'allow' as const, scope })),
    { id: 'wp3.private-deny', permissionId: 'dataset.write', effect: 'deny', scope, fields: [fieldPrivate] },
  ] }]);
  // A policy change racing workspace polling deliberately suspends source. Reauthorize a fresh saved-source view.
  await page.reload();
  await page.locator('[data-app="wp3-created"]').first().click();
  await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  await workspace.getByRole('navigation', { name: 'Application artifacts' }).getByRole('button', { name: 'Person', exact: true }).click();
  await editor.getByRole('tab', { name: 'Development Apply/Connect', exact: true }).click();
  await editor.getByRole('button', { name: 'Validate saved definition', exact: true }).click();
  await editor.getByText('validate completed.', { exact: true }).first().waitFor().catch(async (error: Error) => { console.log('Workspace:', await workspace.textContent(), 'Server:', output); throw error; });
  page.once('dialog', (dialog: any) => dialog.accept());
  const applyResponse = page.waitForResponse((r: any) => r.url().endsWith('/datasets/apply'));
  await editor.getByRole('button', { name: 'Apply to Development…', exact: true }).click();
  const applied = await (await applyResponse).json(); expect(applied, output).toMatchObject({ applied: true, connection: 'disconnected', activation: { readiness: 'verified-serving' } });
  page.once('dialog', (dialog: any) => dialog.accept());
  const connectedResponse = page.waitForResponse((r: any) => r.url().endsWith('/datasets/connect'));
  await editor.getByRole('button', { name: 'Connect Runtime…', exact: true }).click();
  expect(await (await connectedResponse).json(), output).toMatchObject({ applied: true, connection: 'ready', connectedDatasetId: datasetId });
  await editor.getByRole('tab', { name: 'Records', exact: true }).click();
  await editor.getByLabel('New name', { exact: true }).fill('UI Person');
  await editor.getByRole('button', { name: 'Create record', exact: true }).click();
  await editor.getByLabel('Edit name', { exact: true }).waitFor().catch(async (error: Error) => { console.log('Records:', await workspace.textContent(), 'Server:', output); throw error; });
  expect(await editor.getByLabel('Edit name', { exact: true }).inputValue()).toBe('UI Person');
  await editor.getByLabel('Edit name', { exact: true }).fill('UI Edited');
  await editor.getByRole('button', { name: 'Update record', exact: true }).click();
  await page.waitForFunction(() => document.querySelector<HTMLInputElement>('[aria-label="Edit name"]')?.value === 'UI Edited');
  await editor.getByRole('button', { name: 'Reload records', exact: true }).click();
  await page.waitForFunction(() => document.querySelector<HTMLInputElement>('[aria-label="Edit name"]')?.value === 'UI Edited');
  await page.waitForFunction(() => !document.querySelector('.builder-workspace [role="tab"][aria-selected="true"]')?.textContent?.includes('(pending)'));
  const reportRoot = path.resolve('docs/architecture/evidence/builder-v1-wp3'); await mkdir(reportRoot, { recursive: true });
  await page.screenshot({ path: path.join(reportRoot, 'builder-records.png'), fullPage: true });
  page.once('dialog', (dialog: any) => dialog.accept());
  await editor.getByRole('button', { name: 'Delete record', exact: true }).click();
  await editor.getByLabel('Edit name', { exact: true }).waitFor({ state: 'detached' });
  const data = '/api/apps/wp3-created/application-data';
  const inserted = await post(`${data}/operations`, { datasetId, operation: 'insert', records: [{ id: 'persisted', name: 'Persistent' }] }, creator);
  expect(inserted.value).toMatchObject({ success: true, committed: true });
  const storage = path.join(runtime, 'builder-datasets', applicationId, datasetId, 'domain', 'orm', `${applicationId}__default__${authoredSchema.dataset.key}.json`);
  const beforeDenial = await readFile(storage, 'utf8');
  expect((await post(`${data}/operations`, { datasetId, operation: 'insert', records: [{ id: 'missing-name' }] }, creator)).value).toMatchObject({ success: false, committed: false, errors: [{ code: 'VALIDATION_FAILED' }] });
  expect((await post(`${data}/operations`, { datasetId, operation: 'update', records: [{ id: 'persisted', privateNote: 'denied' }] }, creator)).value.success).toBe(false);
  expect(await readFile(storage, 'utf8')).toBe(beforeDenial);
  expect((await post(`${data}/queries`, { datasetId, actor: { type: 'user', userId: developmentUsers[0].id } }, creator)).status).toBe(403);
  expect((await post(`${data}/queries`, { datasetId }, { ...creator, authorization: 'Bearer forged' })).status).toBe(403);
  expect((await post(`${data}/queries`, { datasetId: 'unknown' }, creator)).status).toBe(403);
  expect((await post(`${data}/queries`, { datasetId, applicationId: second.value.appId }, creator)).status).toBe(403);
  expect((await post(`${data}/operations`, { datasetId, operation: 'delete', records: [{ id: 'persisted' }] }, unrelated)).value.success).toBe(false);
  expect(await readFile(storage, 'utf8')).toBe(beforeDenial);
  const editorLogin = async (headers: Record<string, string>) => {
    const response = await fetch(origin + '/api/editor/session', { headers }); const session = await response.json();
    return { ...headers, cookie: `${headers.cookie}; ${response.headers.get('set-cookie')!.split(';')[0]}`, 'x-editor-csrf': session.csrfToken, 'x-editor-revision': session.revision };
  };
  const editorHeaders = await editorLogin(creator), unauthorizedEditor = await editorLogin(unrelated);
  const latest = await fetch(origin + `/api/apps/wp3-created/artifacts/${locator}`, { headers: editorHeaders }).then(r => r.json());
  const operation = { locator, expectedChecksum: latest.checksum, confirmed: true };
  expect((await post('/api/apps/wp3-created/datasets/apply', operation, unauthorizedEditor)).status).toBe(403);
  expect((await post('/api/apps/wp3-created/datasets/apply', { ...operation, expectedChecksum: 'stale' }, editorHeaders)).status).toBe(409);
  expect((await post('/api/apps/wp3-created/datasets/apply', { ...operation, confirmed: false }, editorHeaders)).status).toBe(400);
  expect((await post('/api/apps/wp3-created/datasets/apply', { ...operation, actor: { userId: developmentUsers[1].id } }, editorHeaders)).status).toBe(400);
  expect((await post('/api/apps/wp3-created/datasets/apply', operation, { ...editorHeaders, 'x-editor-csrf': 'forged' })).status).toBe(403);
  const another = await post('/api/apps/wp3-created/datasets/create', { name: 'Second' }, editorHeaders);
  expect(another.status).toBe(201);
  expect((await post('/api/apps/wp3-created/datasets/connect', { locator: another.value.locator, expectedChecksum: another.value.checksum, confirmed: true }, editorHeaders)).value.code).toBe('ONE_DATASET_HOST_LIMIT');
  const preview = await post('/api/apps/wp3-created/preview', {}, creator); expect(preview.status, JSON.stringify(preview.value)).toBe(200);
  const previewHtml = await fetch(preview.value.url).then(r => r.text()); expect(previewHtml).toContain('html');
  const previewRead = await fetch(new URL(data + '/queries', preview.value.url), { method: 'POST', headers: { ...creator, origin: new URL(preview.value.url).origin }, body: JSON.stringify({ datasetId, select: ['id', 'name'] }) });
  expect(await previewRead.json()).toMatchObject([{ id: 'persisted', name: 'Persistent' }]);
  const runningApplication = await page.context().newPage();
  await runningApplication.goto(preview.value.url);
  await runningApplication.getByRole('heading', { name: 'Your Application is ready', exact: true }).waitFor();
  expect(await runningApplication.locator('vite-error-overlay').count()).toBe(0);
  const previewWrite = await runningApplication.evaluate(async ({ path, datasetId }: any) => {
    const result = await fetch(path + '/operations', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ datasetId, operation: 'update', records: [{ id: 'persisted', name: 'Preview persisted' }] }) });
    return result.json();
  }, { path: data, datasetId });
  expect(previewWrite).toMatchObject({ success: true, committed: true }); expect(await readFile(storage, 'utf8')).toContain('Preview persisted');
  await runningApplication.screenshot({ path: path.join(reportRoot, 'standard-preview.png'), fullPage: true });
  await runningApplication.close();
  expect((await post(`${data}/operations`, { datasetId, operation: 'update', records: [{ id: 'persisted', name: 'Persistent' }] }, creator)).value.success).toBe(true);
  // WP4 configuration remains deferred. A configured existing Form consumes the applied discovery contract and shared runtime/client.
  const discoveredApplied = await fetch(origin + '/api/apps/wp3-created/datasets/discovery', { headers: editorHeaders }).then(r => r.json());
  const appliedSchema = discoveredApplied.find((a: any) => a.artifactId === datasetId).appliedSchema;
  expect(appliedSchema.dataset.id).toBe(datasetId);
  const metadata: ArtifactMetadata = { schemaVersion: 1, artifactId: 'art_wp3_configured_form', componentId: 'cmp_platform_wp3_configured_form', kind: 'component', name: 'wp3-form', displayName: 'WP3 configured Form' };
  const form = generateForm(metadata, { ...appliedSchema, fields: appliedSchema.fields.filter((f: any) => f.key !== 'privateNote') });
  await page.evaluate(async ({ metadata, form, endpoint }: any) => {
    // Keep these browser imports out of Vitest's server-side module transform.
    const load = new Function('specifier', 'return import(specifier)');
    const { mountVisualArtifact } = await load('/packages/visual-artifacts/src/runtime.ts');
    const { ApplicationDataClient, createSessionApplicationDataTransport, createApplicationDataServices } = await load('/packages/platform-core/src/application-data.ts');
    const client = new ApplicationDataClient(createSessionApplicationDataTransport({ endpoint }));
    const instance = mountVisualArtifact({ metadata, source: form.source, css: form.css, functions: {} }, { components: [], packages: [], services: createApplicationDataServices(client, { endpoint }) });
    const proof = document.createElement('aside'); proof.setAttribute('aria-label', 'WP3 configured Form proof'); proof.append(instance.host); document.body.append(proof);
  }, { metadata, form, endpoint: data });
  const formProof = page.getByLabel('WP3 configured Form proof', { exact: true });
  await formProof.getByLabel('name', { exact: true }).fill('Form Person');
  await formProof.getByRole('button', { name: 'Submit', exact: true }).click();
  await formProof.locator('[data-uip-node="saved-result"]').filter({ hasText: 'Form Person' }).waitFor();
  const formRecord = JSON.parse(await formProof.locator('[data-uip-node="saved-result"]').innerText());
  expect(await readFile(storage, 'utf8')).toContain('Form Person');
  await page.screenshot({ path: path.join(reportRoot, 'configured-form.png'), fullPage: true });
  expect((await post(`${data}/operations`, { datasetId, operation: 'delete', records: [{ id: formRecord.id }] }, creator)).value.success).toBe(true);
  await activate(applicationId, [{ ...assignment, status: 'inactive' }]);
  expect((await post(`${data}/operations`, { datasetId, operation: 'update', records: [{ id: 'persisted', name: 'revoked' }] }, creator)).value.success).toBe(false);
  expect(await readFile(storage, 'utf8')).toBe(beforeDenial);
  expect((await post('/api/apps/wp3-created/datasets/apply', operation, editorHeaders)).status).toBe(403);
  await activate(applicationId, [assignment]);
  await browser.close();
  // Saving newer source cannot silently migrate the published/applied Dataset.
  const changedSchema = structuredClone(authoredSchema); changedSchema.dataset.name = 'Changed source';
  const sourceSave = await fetch(origin + `/api/apps/wp3-created/artifacts/${locator}`, { method: 'PUT', headers: editorHeaders,
    body: JSON.stringify({ mode: 'normal', expectedChecksum: latest.checksum, files: { 'dataset.json': JSON.stringify(changedSchema) } }) }).then(r => r.json());
  expect(sourceSave.saved).toBe(true);
  const unsupported = await post('/api/apps/wp3-created/datasets/apply', { locator, expectedChecksum: sourceSave.artifact.checksum, confirmed: true }, editorHeaders);
  expect(unsupported.value.code).toBe('DATASET_MIGRATION_UNSUPPORTED');
  const sourceVersusApplied = await fetch(origin + `/api/apps/wp3-created/datasets/status?locator=${locator}`, { headers: editorHeaders }).then(r => r.json());
  expect(sourceVersusApplied).toMatchObject({ applied: true, appliedSchema: { dataset: { name: 'Person' } }, diagnostic: 'DATASET_SOURCE_DIFFERS_FROM_APPLIED_MIGRATION_UNSUPPORTED' });
  const restoredSource = await fetch(origin + `/api/apps/wp3-created/artifacts/${locator}`, { method: 'PUT', headers: editorHeaders,
    body: JSON.stringify({ mode: 'normal', expectedChecksum: sourceSave.artifact.checksum, files: { 'dataset.json': beforeInvalid } }) }).then(r => r.json());
  expect(restoredSource.saved).toBe(true);
  // Stop the actual management process and re-open the same durable Application/policy/owner/activation stores.
  const exit = once(child, 'exit'); if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else child.kill(); await exit;
  const restarted = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], { windowsHide: true, env: { ...process.env, NODE_ENV: 'development', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '1', UI_PLATFORM_BUILDER_WP0: '1', UI_PLATFORM_V1_POLICY_STORE: policyPath, UI_APPS_DIR: apps, UI_RUNTIME_DIR: runtime, UI_PLATFORM_API_PORT: String(port), UI_PLATFORM_UI_PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  restarted.stdout!.on('data', bytes => { output += bytes; }); restarted.stderr!.on('data', bytes => { output += bytes; });
  cleanup.push(async () => { if (restarted.exitCode === null && restarted.signalCode === null) { const exit = once(restarted, 'exit'); if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(restarted.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else restarted.kill(); await exit; } });
  for (let i = 0; i < 200; i++) { if (restarted.exitCode !== null) throw new Error(output); if (await fetch(origin + '/api/health').then(r => r.ok).catch(() => false)) break; await new Promise(r => setTimeout(r, 50)); }
  const reopenedHeaders = await editorLogin(await login(developmentUsers[2].email));
  const catalog = await fetch(origin + '/api/apps/wp3-created/datasets/discovery', { headers: reopenedHeaders }).then(r => r.json());
  const reopened = catalog.find((a: any) => a.artifactId === datasetId); expect(reopened.schema).toEqual(JSON.parse(beforeInvalid));
  const refreshed = await fetch(origin + `/api/apps/wp3-created/artifacts/${reopened.locator}`, { headers: reopenedHeaders }).then(r => r.json());
  const reconnected = await post('/api/apps/wp3-created/datasets/connect', { locator: reopened.locator, expectedChecksum: refreshed.checksum, confirmed: true }, reopenedHeaders);
  expect(reconnected.value, output).toMatchObject({ connection: 'ready', applied: true, connectedDatasetId: datasetId });
  expect((await post(`${data}/queries`, { datasetId, select: ['id', 'name'] }, reopenedHeaders)).value).toMatchObject([{ id: 'persisted', name: 'Persistent' }]);
  expect(registry.byKey('wp3-created')?.applicationId).toBe(applicationId);
  expect(browserErrors).toEqual([]);
  await writeFile(path.join(reportRoot, 'acceptance.json'), JSON.stringify({ applicationId, datasetId, fieldIds: authoredSchema.fields.map((f: any) => f.id), activation: applied.activation, publication: applied.publication,
    checks: ['builder-ui-create', 'fields-required-and-stable-identities', 'rename-undo-redo-across-tabs', 'invalid-autosave-unchanged-source', 'explicit-ui-apply-and-connect', 'real-publication-activation-owner-serving', 'ui-persisted-crud', 'restricted-field-unchanged-storage', 'required-value-rejected', 'foreign-forged-unknown-unauthorized-denied', 'stale-source-and-confirmation', 'one-dataset-host-limit', 'standard-managed-preview', 'configured-existing-form-persistence', 'role-revocation', 'restart-reconnection-persistence'],
    provenance: { application: 'Normal Standard creation API', dataset: 'Actual Builder UI controls, no pasted schema', permissions: 'Explicit trusted setup and existing stage/activate APIs', runtime: 'Actual Application-qualified protected host and ordinary managed preview' }, browserErrors, verifiedAt: new Date().toISOString() }, null, 2));
}, 240_000);

it('WP3: authoritative capabilities reject unsupported relationships, labels and types before application', async () => {
  const schema = { definitionType: 'dataset-schema' as const, definitionFormatVersion: 1 as const, dataset: { id: 'dataset', key: 'records', name: 'Record', pluralName: 'Records' }, fields: [{ id: 'field-id', key: 'id', type: 'id', required: true }] };
  expect((await prepareDevelopmentDataset('application', schema)).fields[0]).toMatchObject({ name: 'id', type: 'string', required: true });
  await expect(prepareDevelopmentDataset('application', { ...schema, relationships: [] } as typeof schema)).rejects.toThrow('DEFINITION_UNSUPPORTED');
  await expect(prepareDevelopmentDataset('application', { ...schema, fields: [...schema.fields, { id: 'other', key: 'other', type: 'money', required: false }] })).rejects.toThrow('DEFINITION_UNSUPPORTED');
  await expect(prepareDevelopmentDataset('application', { ...schema, fields: [{ ...schema.fields[0], label: 'Identity' }] } as typeof schema)).rejects.toThrow('DEFINITION_UNSUPPORTED');
});
