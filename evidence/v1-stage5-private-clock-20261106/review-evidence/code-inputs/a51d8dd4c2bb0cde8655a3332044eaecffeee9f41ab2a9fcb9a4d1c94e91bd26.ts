import { continueStage5Integration } from './fixtures/stage5-integration-journey.js';
import { realpath } from 'node:fs/promises';
import { platformRoot } from '../src/server/paths.js';
import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile,cp,lstat,unlink,readdir } from 'node:fs/promises';
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
import { notificationPermission } from '../src/shared/automation-service-contract.js';
import { AutomationStore } from '../src/server/automation-store.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); }, 60_000);
const doc = (definition: SecurityRecord): SecurityDocument => ({ format: 'ui-platform.security', formatVersion: 1, definition });
const platformScope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system' as const, id: 'platform' }, descendants: true };
const dataPermissions = ['dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete', 'dataset.write'];
const editorPermissions = ['ui.presentation.view', 'ui.presentation.edit', 'ui.artifact.view', 'ui.artifact.edit', 'ui.artifact.admin', 'ui.application.view', 'ui.application.edit', 'ui.page.view', 'ui.page.edit'];

it('Stage 5: actual Builder publication, protected three-process application and current I-AM workflow', async () => {
  const isolated=process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT, original=process.env.UI_PLATFORM_TEST_ORIGINAL_ROOT;
  if(!isolated||!original) throw new Error('PHYSICAL_ISOLATION_REQUIRED');
  if(await realpath(platformRoot)!==await realpath(isolated)||await realpath(process.cwd())!==await realpath(isolated)||await realpath(isolated)===await realpath(original))throw new Error('PHYSICAL_ISOLATION_REQUIRED');
  for(const rel of ['components','src/server','packages/artifacts','node_modules/@ui-platform/artifacts'])if(!(await realpath(path.join(isolated,rel))).startsWith(await realpath(isolated)+path.sep))throw new Error('PHYSICAL_ISOLATION_REQUIRED');
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
    grantablePermissionIds: [...new Set(['ui.platform.application.create', 'ui.platform.component.admin', 'ui.presentation.admin', 'ui.application.view', 'ui.application.edit', 'ui.workflow.edit', 'ui.platform.automation.admin', notificationPermission, 'workflow.invoke', ...editorPermissions, ...dataPermissions])],
    capabilityDefinitions: [...dataPermissions.map(id => ({ id, applicableKinds: ['dataset', 'field'] })), { id: notificationPermission, applicableKinds: ['artifact'] }, { id: 'workflow.invoke', applicableKinds: ['workflow'] }],
    applicationAnchors: [{ applicationId: V1_FIXTURE_APPLICATION_ID, administratorUserId: developmentUsers[0].id }], expectedRevision: policy.revision(), reason: 'Explicit local WP0 development setup' });
  expect(setup.status, JSON.stringify(setup)).toBe('activated');
  const probe = createServer(); await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as { port: number }).port; await new Promise<void>(resolve => probe.close(() => resolve()));
  let output = '';
  const child: ChildProcess = spawn(process.execPath, ['--import', './scripts/test-loopback-only.mjs', '--import', 'tsx', 'src/server/index.ts'], { windowsHide: true,
    env: { ...process.env, NODE_ENV: 'development', UI_PLATFORM_WP4_TRACE: '1', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '1', UI_PLATFORM_BUILDER_WP0: '1',
      UI_PLATFORM_V1_POLICY_STORE: policyPath, UI_APPS_DIR: apps, UI_RUNTIME_DIR: runtime, UI_PLATFORM_BUILDER_HOSTS_FILE: hostsFile,
      UI_PLATFORM_API_PORT: String(port), UI_PLATFORM_UI_PORT: String(port), npm_config_offline: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout!.on('data', bytes => { output += String(bytes); if (String(bytes).includes('WP4 ')) console.log(String(bytes)); }); child.stderr!.on('data', bytes => { output += String(bytes); });
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
    const route = applicationId === null ? '/api/platform/security' : `/api/apps/wp5c-created/security`;
    const changes = records.map(definition => { const previous = policy.documents().find(d => d.definition.id === definition.id); return { document: doc(definition), ...(previous ? { expectedChecksum: securityChecksum(previous) } : {}) }; });
    const staged = await post(`${route}/stage`, { changes, expectedRevision: policy.revision(), reason: 'Explicit WP0 role administration' });
    expect(staged.value.diagnostics).toEqual([]);
    const activated = await post(`${route}/activate`, { candidateId: staged.value.id, checksum: staged.value.checksum, expectedRevision: staged.value.baseRevision, reason: 'Explicit WP0 role administration' });
    expect(activated.value.status, JSON.stringify(activated.value)).toBe('activated');
  };
  const base = (id: string) => ({ id, key: id, name: id, status: 'active' as const });
  await activate(null, [
    { ...base('wp0.creator-set'), kind: 'permission-set', owner: { kind: 'platform' }, includes: [], rules: ['ui.platform.application.create', 'ui.platform.component.admin', 'ui.platform.automation.admin'].map((permissionId, index) => ({ id: 'wp4.platform.' + index, permissionId, effect: 'allow' as const, scope: platformScope })) },
    { ...base('wp0.creator-role'), kind: 'role', owner: { kind: 'platform' }, permissionSets: [{ id: 'wp0.creator-set' }] },
    { kind: 'role-assignment', id: 'wp0.creator-assignment', userId: developmentUsers[2].id, roleId: 'wp0.creator-role', status: 'active', scope: platformScope, startsAt: '2026-01-01T00:00:00Z', endsAt: null },
  ]);
  const created = await post('/api/apps', { key: 'wp5c-created', name: 'WP4 Dataset Application', templateId: 'standard' }, creator);
  expect(created.status, JSON.stringify(created.value) + output).toBe(201);
  const applicationId = created.value.appId as string;
  expect(applicationId).toMatch(/^[a-f0-9-]{36}$/);
  const second = await post('/api/apps', { key: 'wp5c-other', name: 'WP4 Other Application', templateId: 'standard' }, creator);
  expect(second.status).toBe(201); expect(second.value.appId).not.toBe(applicationId);
  expect((await fetch(origin + '/api/apps/wp5c-other', { headers: creator })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp5c-created', { headers: creator })).status).toBe(403);
  expect((await post('/api/apps/wp5c-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Unauthorized attempt' }, creator)).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp5c-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('authority-required');
  expect((await post('/api/apps/wp5c-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Explicit initial Application security administrator' })).value.status).toBe('activated');
  expect((await post('/api/apps/wp5c-created/security/stage', { changes: [], expectedRevision: policy.revision() }, { ...security, 'x-v1-csrf': 'forged' })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp5c-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('runtime-required');
  const registry = new DevelopmentApplicationRegistry(path.join(runtime, 'development-applications.sqlite'), apps); cleanup.push(async () => registry.close());
  const scope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'application' as const, id: applicationId }, descendants: true };
  const owner = { kind: 'application' as const, applicationId };
  const assignment: SecurityRecord = { kind: 'role-assignment', id: 'wp4.author-assignment', userId: developmentUsers[2].id, roleId: 'wp4.author-role', status: 'active', scope, startsAt: '2026-01-01T00:00:00Z', endsAt: null };
  await activate(applicationId, [
    { ...base('wp4.author-set'), kind: 'permission-set', owner, includes: [], rules: [...new Set(editorPermissions.concat(dataPermissions, [notificationPermission, 'workflow.invoke']))].map((permissionId, i) => ({ id: `wp4.allow.${i}`, permissionId, effect: 'allow' as const, scope: permissionId === notificationPermission ? { resource: { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'artifact' as const, id: 'reference.notification', parentId: applicationId }, descendants: false } : scope })) },
    { ...base('wp4.author-role'), kind: 'role', owner, permissionSets: [{ id: 'wp4.author-set' }] }, assignment,
  ]);
  // The template's file: dependencies install as junctions. Materialize only the disposable
  // application's admitted UI-Base packages before invoking the unchanged physical-only publisher.
  const installed=path.join(apps,'wp5c-created','node_modules/@ui-base');
  for(const name of await readdir(installed)){const destination=path.join(installed,name);if(!(await lstat(destination)).isSymbolicLink())continue;
    const source=await realpath(destination);if(!source.startsWith(path.dirname(process.cwd())+path.sep))throw new Error('UNISOLATED_APPLICATION_PACKAGE');
    const metadata=await readFile(path.join(source,'package.json'));await unlink(destination);await cp(source,destination,{recursive:true,dereference:true,filter:p=>!path.relative(source,p).split(path.sep).includes('node_modules')});expect(await readFile(path.join(destination,'package.json'))).toEqual(metadata);
  }
  const probeUi = createServer(); await new Promise<void>(resolve => probeUi.listen(0, '127.0.0.1', resolve));
  const uiPort = (probeUi.address() as { port: number }).port; await new Promise<void>(resolve => probeUi.close(() => resolve()));
  // Same-origin UI uses the API port allowed in the test host. Vite is middleware on that origin via a separate allowed Host.
  const vite = await createViteServer({ configFile: 'vite.config.ts', cacheDir: path.join(root, 'vite-cache'), optimizeDeps: { include: ['@ui-base/ui/component-reference'] }, server: { host: '127.0.0.1', port: uiPort, strictPort: true, proxy: { '/api': { target: origin, changeOrigin: true } } } });
  await vite.listen(); cleanup.push(() => vite.close());
  const playwright = createRequire(path.resolve('../ui-base/package.json'))('playwright');
  const browser = await playwright.chromium.launch({ headless: false, channel: 'msedge' }); cleanup.push(() => browser.close());
  const browserContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await browserContext.newPage();
  page.setDefaultTimeout(15_000);
  page.on('response', async (response: any) => { if (response.url().includes('/datasets/') && response.status() >= 400) console.log('Dataset error:', response.status(), await response.text().catch(() => 'response closed')); });
  const browserErrors: string[] = []; page.on('pageerror', (error: Error) => browserErrors.push(error.message));
  page.on('response', async (response: any) => { if (response.url().includes('/form-tests/') && response.request().method() === 'POST') console.log('Form test response:', response.status(), response.url(), await response.text().catch(() => 'closed')); });
  page.on('request', (request: any) => { if (request.url().includes('/form-tests/')) console.log('Form test request:', request.method(), request.url()); });
  page.on('response', async (response: any) => { if (response.url().includes('preview=1') && response.status() >= 400) console.log('Preview failure:', response.status(), await response.text()); });
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
  await page.locator('[data-app="wp5c-created"]').first().click();
  await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  const workspace = page.getByRole('region', { name: 'Application Builder workspace' });
  const reportRoot = path.resolve(process.env.UI_PLATFORM_TEST_EVIDENCE_ROOT ?? 'docs/architecture/evidence', 'v1-stage2-builder'); await mkdir(reportRoot, { recursive: true });
  cleanup.push(async () => { if (!page.isClosed()) { const attempt=Date.now(); await page.screenshot({path:path.join(reportRoot,`browser-attempt-${attempt}.png`),fullPage:true}); await writeFile(path.join(reportRoot,`browser-attempt-${attempt}.txt`),await page.locator('body').innerText()+'\nSERVER\n'+output); } });
  const editor = workspace.getByLabel('Generic Artifact Editor', { exact: true });
  const createdDataset = page.waitForResponse((r: any) => r.url().endsWith('/datasets/create'));
  page.once('dialog', (dialog: any) => dialog.accept('Stage 2 Inventory')); await workspace.getByRole('button', { name: 'Create Dataset', exact: true }).click();
  const datasetId = (await (await createdDataset).json()).manifest.artifactId;
  await editor.getByRole('tab', { name: 'Fields', exact: true }).click();
  await editor.getByRole('button', { name: 'Add field', exact: true }).click(); await editor.getByLabel('Field name', { exact: true }).nth(1).fill('name');
  await editor.getByLabel('Data type', { exact: true }).nth(1).selectOption('string'); await editor.getByLabel('Required', { exact: true }).nth(1).check();
  for (const [name, type] of [['quantity', 'number'], ['active', 'boolean']]) {
    await editor.getByRole('button', { name: 'Add field', exact: true }).click();
    const index = await editor.getByLabel('Field name', { exact: true }).count() - 1;
    await editor.getByLabel('Field name', { exact: true }).nth(index).fill(name);
    await editor.getByLabel('Data type', { exact: true }).nth(index).selectOption(type);
    await editor.getByLabel('Required', { exact: true }).nth(index).check();
  }
  await editor.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect.poll(() => editor.locator('[role=status]').textContent(), { timeout: 60000 }).toBe('Saved');
  await editor.getByRole('tab', { name: 'Development Apply/Connect', exact: true }).click();
  await editor.getByRole('button', { name: 'Validate saved definition', exact: true }).click(); await editor.getByText('validate completed.', { exact: true }).first().waitFor();
  page.once('dialog', (dialog: any) => dialog.accept()); await editor.getByRole('button', { name: 'Apply to Development…', exact: true }).click(); await editor.getByText('apply completed.', { exact: true }).first().waitFor();
  const schema = JSON.parse(await readFile(path.join(apps, 'wp5c-created', 'datasets', datasetId, 'dataset.json'), 'utf8'));

  expect(schema.fields.map((field: any) => field.key)).toEqual(['id', 'name', 'quantity', 'active']);
  const formName = 'stage2-inventory-form-' + Date.now();
  const componentFolder = path.resolve('components', formName);
  cleanup.push(async () => { if (path.dirname(componentFolder) !== path.resolve('components')) throw Error('Unsafe cleanup'); await rm(componentFolder, { recursive: true, force: true }); });
  await workspace.locator('header').getByRole('button', { name: 'Create Form', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Create Form' });
  await dialog.getByLabel('Form name', { exact: true }).fill(formName);
  await dialog.getByLabel('Create Form from', { exact: true }).selectOption(datasetId);
  const response = page.waitForResponse((response: any) => response.request().method() === 'POST' && response.url().endsWith('/visual-components'));
  await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  const form = await (await response).json();
  expect(form.metadata.form.datasetId).toBe(datasetId);
  expect(form.metadata.form.fields.map((field: any) => field.datasetFieldId)).toEqual(schema.fields.filter((field: any) => field.type !== 'id').map((field: any) => field.id));
  await mkdir('evidence/v1-stage5-integration-local', { recursive: true });
  await writeFile('evidence/v1-stage5-integration-local/builder-schema-form.json', JSON.stringify({ applicationId, datasetId, schema, form: form.metadata, browserErrors }, null, 2));
  await page.screenshot({ path: 'evidence/v1-stage5-integration-local/builder-schema-form.png', fullPage: true });
  expect(browserErrors).toEqual([]);
  await continueStage5Integration({root,runtime,apps,policyPath,applicationId,datasetId,schema,form,page,workspace,creator,security,activate,post,cleanup,origin});
}, 420000);

