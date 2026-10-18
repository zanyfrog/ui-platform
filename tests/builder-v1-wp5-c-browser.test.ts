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
import { notificationPermission } from '../src/shared/automation-service-contract.js';
import { AutomationStore } from '../src/server/automation-store.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); }, 60_000);
const doc = (definition: SecurityRecord): SecurityDocument => ({ format: 'ui-platform.security', formatVersion: 1, definition });
const platformScope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system' as const, id: 'platform' }, descendants: true };
const dataPermissions = ['dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete', 'dataset.write'];
const editorPermissions = ['ui.presentation.view', 'ui.presentation.edit', 'ui.artifact.view', 'ui.artifact.edit', 'ui.artifact.admin', 'ui.application.view', 'ui.application.edit', 'ui.page.view', 'ui.page.edit'];

it('WP5-C: actual Builder typed automation and Form/Page Workflow invocation with approved normal-host service', async () => {
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
    grantablePermissionIds: [...new Set(['ui.platform.application.create', 'ui.platform.component.admin', 'ui.application.view', 'ui.application.edit', 'ui.workflow.edit', 'ui.platform.automation.admin', notificationPermission, 'workflow.invoke', ...editorPermissions, ...dataPermissions])],
    capabilityDefinitions: [...dataPermissions.map(id => ({ id, applicableKinds: ['dataset', 'field'] })), { id: notificationPermission, applicableKinds: ['artifact'] }, { id: 'workflow.invoke', applicableKinds: ['workflow'] }],
    applicationAnchors: [{ applicationId: V1_FIXTURE_APPLICATION_ID, administratorUserId: developmentUsers[0].id }], expectedRevision: policy.revision(), reason: 'Explicit local WP0 development setup' });
  expect(setup.status, JSON.stringify(setup)).toBe('activated');
  const probe = createServer(); await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as { port: number }).port; await new Promise<void>(resolve => probe.close(() => resolve()));
  let output = '';
  const child: ChildProcess = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], { windowsHide: true,
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
  const reportRoot = path.resolve('docs/architecture/evidence/builder-v1-wp5-c'); await mkdir(reportRoot, { recursive: true });
  cleanup.push(async () => { if (!page.isClosed()) { const attempt=Date.now(); await page.screenshot({path:path.join(reportRoot,`browser-attempt-${attempt}.png`),fullPage:true}); await writeFile(path.join(reportRoot,`browser-attempt-${attempt}.txt`),await page.locator('body').innerText()+'\nSERVER\n'+output); } });
  const editor = workspace.getByLabel('Generic Artifact Editor', { exact: true });
  const createdDataset = page.waitForResponse((r: any) => r.url().endsWith('/datasets/create'));
  page.once('dialog', (dialog: any) => dialog.accept('WP5-C Records')); await workspace.getByRole('button', { name: 'Create Dataset', exact: true }).click();
  const datasetId = (await (await createdDataset).json()).manifest.artifactId;
  await editor.getByRole('tab', { name: 'Fields', exact: true }).click();
  await editor.getByRole('button', { name: 'Add field', exact: true }).click(); await editor.getByLabel('Field name', { exact: true }).nth(1).fill('name');
  await editor.getByLabel('Data type', { exact: true }).nth(1).selectOption('string'); await editor.getByLabel('Required', { exact: true }).nth(1).check();
  await editor.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect.poll(() => editor.locator('[role=status]').textContent(), { timeout: 60000 }).toBe('Saved');
  await editor.getByRole('tab', { name: 'Development Apply/Connect', exact: true }).click();
  await editor.getByRole('button', { name: 'Validate saved definition', exact: true }).click(); await editor.getByText('validate completed.', { exact: true }).first().waitFor();
  page.once('dialog', (dialog: any) => dialog.accept()); await editor.getByRole('button', { name: 'Apply to Development…', exact: true }).click(); await editor.getByText('apply completed.', { exact: true }).first().waitFor();
  const schema = JSON.parse(await readFile(path.join(apps, 'wp5c-created', 'datasets', datasetId, 'dataset.json'), 'utf8'));
  const storage = path.join(runtime, 'builder-datasets', applicationId, datasetId, 'domain', 'orm', `${applicationId}__default__${schema.dataset.key}.json`);
  // Explicit trusted deployment prerequisite: reuse the applied normal host without a managed override.
  const config = JSON.parse(await readFile(path.join(runtime, 'builder-datasets', applicationId, datasetId, 'host.json'), 'utf8')).config;
  let normal: ReturnType<typeof createBuilderDevelopmentHost>, normalServer: Server;
  const startNormal = async (workflowIds: string[] = []) => {
    if (normalServer) { await new Promise<void>(r => normalServer.close(() => r())); normal.close(); }
    if (workflowIds.length) config.workflows = { permissionId: 'workflow.invoke', ids: workflowIds };
    normal = createBuilderDevelopmentHost(config); normalServer = createServer(normal.handler);
    await new Promise<void>(r => normalServer.listen(0, '127.0.0.1', r));
    await writeFile(hostsFile, JSON.stringify([{ applicationId, key: 'wp5c-created', hostUrl: `http://127.0.0.1:${(normalServer.address() as any).port}`, policyStore: policyPath, datasetId, workflowIds, trustedUiServerKey: config.identity.trustedUiServerKey }]));
  };
  await startNormal(); cleanup.push(async () => { await new Promise<void>(r => normalServer.close(() => r())); normal.close(); });
  const data = '/api/apps/wp5c-created/application-data';
  expect((await post(`${data}/operations`, { datasetId, operation: 'insert', records: [{ id: 'selected', name: 'Ada' }, { id: 'unrelated', name: 'Keep' }] }, creator)).value).toMatchObject({ success: true, committed: true });
  await page.getByRole('button', { name: 'Manage Triggers and Workflows', exact: true }).click();
  const automation = page.getByRole('region', { name: 'Trigger and Workflow management' });
  // section has an accessible label but no role=region on older browsers: use its native labelled selector.
  const auto = page.locator('section[aria-label="Trigger and Workflow management"]');
  await auto.getByLabel('Automation type', { exact: true }).selectOption('workflow');
  await auto.getByLabel('Creation Application', { exact: true }).selectOption(applicationId);
  await auto.getByRole('button', { name: 'Load protected authoring catalog', exact: true }).click();
  await expect.poll(() => auto.getByLabel('Creation Dataset', { exact: true }).locator('option').count(),{timeout:15000}).toBe(1);
  const suffix = randomUUID().slice(0,8), workflowName = `wp5c-workflow-${suffix}`, triggerName = `wp5c-trigger-${suffix}`;
  cleanup.push(async () => { for (const [dir,name] of [['workflows',workflowName],['triggers',triggerName]]) { const folder=path.resolve(dir,name); if(path.dirname(folder)!==path.resolve(dir)) throw new Error('Unsafe fixture cleanup'); await rm(folder,{recursive:true,force:true}); } });
  const createAutomation = async (name: string) => {
    page.once('dialog', (d:any) => d.accept(name));
    const response = page.waitForResponse((r:any) => r.request().method()==='POST' && /\/api\/automation\/(triggers|workflows)$/.test(r.url()));
    await auto.getByRole('button', { name: 'Create', exact: true }).click(); const result = await (await response).json(); expect(result.definition.id).toBeTruthy(); return result;
  };
  const workflow = await createAutomation(workflowName);
  await auto.getByLabel('New action type', { exact: true }).selectOption('service'); await auto.getByRole('button', { name: 'Add typed action', exact: true }).click();
  await auto.getByLabel('Service input.message value', { exact: true }).fill('UI authored workflow notification'); await auto.getByLabel('Service input.message value', { exact: true }).press('Tab');
  await auto.getByLabel('New action type', { exact: true }).selectOption('read'); await auto.getByRole('button', { name: 'Add typed action', exact: true }).click();
  await auto.getByRole('button', { name: 'Move up', exact: true }).click(); await auto.getByRole('button', { name: 'Move down', exact: true }).click();
  await auto.getByLabel('Service input.message value',{exact:true}).fill('Temporary retained draft');await auto.getByLabel('Service input.message value',{exact:true}).press('Tab');
  await auto.getByRole('button',{name:'Undo',exact:true}).click();expect(await auto.getByLabel('Service input.message value',{exact:true}).inputValue()).toBe('UI authored workflow notification');
  await auto.getByRole('button',{name:'Redo',exact:true}).click();expect(await auto.getByLabel('Service input.message value',{exact:true}).inputValue()).toBe('Temporary retained draft');
  await auto.getByRole('button',{name:'Undo',exact:true}).click();
  await auto.locator('[data-enabled]').check(); await auto.getByRole('button', { name: 'Save Now', exact: true }).click();
  await expect.poll(async () => (await fetch(origin+`/api/automation/workflows?locator=${workflowName}/workflow.json`,{headers:creator}).then(r=>r.json())).definition?.actions.length).toBe(2);
  await expect.poll(() => auto.locator('[data-status]').textContent()).toContain('Saved');
  const savedWorkflow = await fetch(origin+`/api/automation/workflows?locator=${workflowName}/workflow.json`,{headers:creator}).then(r=>r.json());
  expect(savedWorkflow.definition.id).toBe(workflow.definition.id); const actionIds=savedWorkflow.definition.actions.map((a:any)=>a.id);
  await auto.getByRole('button',{name:'Reload / discard local edits',exact:true}).click(); expect(await auto.locator('[data-action-index]').count()).toBe(2);
  await startNormal([workflow.definition.id]);
  await auto.getByLabel('Automation type',{exact:true}).selectOption('trigger');
  const trigger=await createAutomation(triggerName); await auto.locator('[data-phase]').selectOption('afterCommit');await auto.locator('[data-priority]').fill('5');
  await auto.getByLabel('New action type',{exact:true}).selectOption('service'); await auto.getByRole('button',{name:'Add typed action',exact:true}).click();
  await auto.getByLabel('Scope',{exact:true}).selectOption('batch');await auto.getByLabel('Scope',{exact:true}).selectOption('each');
  await auto.getByLabel('Service input.message value',{exact:true}).fill('UI authored afterCommit notification'); await auto.getByLabel('Service input.message value',{exact:true}).press('Tab');
  await auto.locator('[data-enabled]').check(); await auto.getByRole('button',{name:'Save Now',exact:true}).click(); await expect.poll(()=>auto.locator('[data-status]').textContent(),{timeout:15000}).toContain('Saved');
  await auto.screenshot({path:path.join(reportRoot,'typed-automation.png')});
  await page.getByRole('button',{name:'Manage Triggers and Workflows',exact:true}).click();
  const createVisual = async (kind: string, name: string, route?: string, shellId?: string) => {
    const label = kind === 'component' ? 'Create Platform Component' : kind === 'shell' ? 'Create Shell' : 'Create Page';
    await workspace.locator('header').getByRole('button', { name: label, exact: true }).click(); const dialog = page.getByRole('dialog', { name: label });
    await dialog.getByLabel('Artifact name', { exact: true }).fill(name);
    if (route) await dialog.getByLabel('Page route', { exact: true }).fill(route);
    if (shellId) await dialog.getByLabel('Page Shell', { exact: true }).selectOption(shellId);
    const response = page.waitForResponse((r: any) => r.request().method() === 'POST' && r.url().endsWith('/visual-' + (kind === 'component' ? 'components' : kind === 'shell' ? 'shells' : 'pages')));
    await dialog.getByRole('button', { name: 'Create', exact: true }).click(); const http = await response, value = await http.json();
    expect(http.status(), JSON.stringify(value) + output).toBe(201);
    await expect.poll(() => workspace.getByRole('tab', { name: value.metadata.displayName, exact: true }).getAttribute('aria-selected')).toBe('true');
    await workspace.getByLabel('Visual node', { exact: true }).waitFor(); return value;
  };
  const saveVisual = async () => {
    const save = workspace.getByRole('button', { name: 'Save Now', exact: true });
    if (await save.isEnabled()) { const response = page.waitForResponse((r: any) => r.request().method() === 'PUT' && r.url().includes('/visual-')); await save.click(); const http = await response; expect(http.status(), await http.text() + output).toBe(200); }
    await expect.poll(() => save.isDisabled()).toBe(true);
  };
  const selectRegion = async () => {
    const nodes = workspace.getByLabel('Visual node', { exact: true });
    const id = await nodes.locator('option').evaluateAll((options: HTMLOptionElement[]) => options.find(option => option.textContent?.startsWith('region-') && !option.disabled)?.value);
    if (!id) {
      let count = 0; page.on('dialog', onDialog); function onDialog(dialog: any) { void dialog.accept(count++ === 0 ? dialog.defaultValue() : 'Main'); if (count === 2) page.off('dialog', onDialog); }
      try { await workspace.getByRole('button', { name: 'Add Region', exact: true }).click(); } finally { page.off('dialog', onDialog); }
    }
    await nodes.selectOption(await nodes.locator('option').evaluateAll((options: HTMLOptionElement[]) => options.find(option => option.textContent?.startsWith('region-') && !option.disabled)!.value));
  };
  const insert = async (value: string) => { await workspace.getByLabel('Insert element', { exact: true }).selectOption(value); await workspace.getByRole('button', { name: 'Insert with layout wrapper', exact: true }).click(); return workspace.getByLabel('Visual node', { exact: true }).inputValue(); };
  const focusVisual = async (name: string) => { await workspace.getByRole('tab', { name, exact: true }).click(); await expect.poll(() => workspace.getByRole('tab', { name, exact: true }).getAttribute('aria-selected'), { timeout: 60000 }).toBe('true').catch(async (cause: Error) => { throw new Error(String(cause) + '\nFocus workspace: ' + await workspace.textContent() + '\nServer: ' + output); }); await workspace.getByLabel('Visual node', { exact: true }).waitFor(); };
  const pageArtifact=await createVisual('page',`wp5c-page-${suffix}`,'/people/:id');
  await selectRegion(); const runNode=await insert('html:button');
  await workspace.getByLabel('Binding target',{exact:true}).selectOption('text'); await workspace.getByLabel('Binding source',{exact:true}).selectOption('string'); await workspace.getByLabel('Binding value',{exact:true}).fill('Run authored workflow'); await workspace.getByRole('button',{name:'Apply binding',exact:true}).click();
  // Declare local result state using native metadata controls.
  await workspace.getByRole('button',{name:'Select artifact root',exact:true}).click();
  await workspace.getByLabel('New local state',{exact:true}).fill('execution'); await workspace.getByLabel('New local state type',{exact:true}).selectOption('object'); await workspace.getByRole('button',{name:'Declare local state',exact:true}).click();
  await workspace.getByLabel('Visual node',{exact:true}).selectOption(runNode);
  const addWorkflow = async (event:string) => {
    await workspace.getByLabel('Action event',{exact:true}).selectOption(event); await workspace.getByLabel('Action kind',{exact:true}).selectOption('workflow');
    await workspace.getByRole('button',{name:'Load approved Workflows',exact:true}).click();
    await expect.poll(()=>workspace.getByLabel('Workflow',{exact:true}).locator('option').count(),{timeout:15000}).toBe(1);
    await workspace.getByLabel('Workflow',{exact:true}).selectOption(workflow.definition.id); await workspace.getByLabel('Workflow record value',{exact:true}).fill('route.id');
    await workspace.getByLabel('Workflow result state',{exact:true}).selectOption('execution'); await workspace.getByRole('button',{name:'Add event action',exact:true}).click();
  };
  await addWorkflow('click'); await saveVisual();
  const resultNodes:Record<string,string>={};
  const statusLabels:Record<string,string>={success:'Workflow succeeded',completedSteps:'Completed steps',committedSteps:'Committed Dataset writes',failedStep:'Failed step',failedActionId:'Failed action identity',error:'Failure diagnostic',commitOutcome:'Transport outcome'};
  for(const field of ['success','completedSteps','committedSteps','failedStep','failedActionId','error','commitOutcome']) {
    await selectRegion();await insert('html:p');await workspace.getByLabel('Binding source',{exact:true}).selectOption('string');await workspace.getByLabel('Binding value',{exact:true}).fill(statusLabels[field]);await workspace.getByRole('button',{name:'Apply binding',exact:true}).click();await saveVisual();
    await selectRegion(); const id=await insert('html:p'); resultNodes[field]=id;
    await workspace.getByLabel('Binding value',{exact:true}).fill(`local.execution.${field}`); await workspace.getByRole('button',{name:'Apply binding',exact:true}).click(); await saveVisual();
  }
  const formName=`wp5c-form-${suffix}`;
  cleanup.push(async()=>{const folder=path.resolve('components',formName);if(path.dirname(folder)!==path.resolve('components'))throw new Error('Unsafe cleanup');await rm(folder,{recursive:true,force:true});});
  await workspace.locator('header').getByRole('button',{name:'Create Form',exact:true}).click(); const formDialog=page.getByRole('dialog',{name:'Create Form'});
  await formDialog.getByLabel('Form name',{exact:true}).fill(formName);await formDialog.getByLabel('Create Form from',{exact:true}).selectOption(datasetId);
  const formResponse=page.waitForResponse((r:any)=>r.request().method()==='POST'&&r.url().endsWith('/visual-components'));await formDialog.getByRole('button',{name:'Create',exact:true}).click();const form=await(await formResponse).json();
  await editor.getByRole('heading',{name:form.metadata.displayName,exact:true}).waitFor();
  const formFile=path.resolve('components',formName,'component.visual.json'), formBefore=await readFile(formFile,'utf8');
  await focusVisual(pageArtifact.metadata.displayName);await selectRegion();const formNode=await insert(`component:${form.metadata.componentId}`);
  await workspace.getByLabel('Setting operation',{exact:true}).selectOption('"edit"');
  await workspace.getByLabel('Binding target',{exact:true}).selectOption('property:recordId');await workspace.getByLabel('Binding value',{exact:true}).fill('route.id');await workspace.getByRole('button',{name:'Apply binding',exact:true}).click();
  await addWorkflow('submitSucceeded');await saveVisual();expect(await readFile(formFile,'utf8')).toBe(formBefore);
  await workspace.screenshot({path:path.join(reportRoot,'workflow-event-authoring.png')});
  // Explicit preview restriction: no persistence or sink effect.
  const bytesBefore=await readFile(storage,'utf8'),effectsBefore=normal.notifications.length;
  await workspace.getByRole('button',{name:'Design preview',exact:true}).click();
  const preview=page.frameLocator('iframe[title="Nonpersisting Visual Artifact design preview"]');await preview.getByRole('button',{name:'Run authored workflow',exact:true}).click();
  expect(await readFile(storage,'utf8')).toBe(bytesBefore);expect(normal.notifications.length).toBe(effectsBefore);
  await page.screenshot({path:path.join(reportRoot,'nonpersisting-preview.png'),fullPage:true});
  // Accepted existing contention limitation: close Builder before ordinary runtime capture; not concurrency proof.
  await page.close();const managed=await post('/api/apps/wp5c-created/preview',{restart:true},creator);expect(managed.status,JSON.stringify(managed.value)+output).toBe(200);
  const running=await browserContext.newPage();running.on('pageerror',(e:Error)=>browserErrors.push(e.message));await running.goto(managed.value.url);
  const route=new URL(running.url());route.pathname=route.pathname.replace(/\/?$/,'/')+'people/selected';await running.goto(route.href);
  await expect.poll(()=>running.getByLabel('name',{exact:true}).inputValue(),{timeout:45000}).toBe('Ada');
  const firstWorkflowRequest=running.waitForRequest((r:any)=>r.method()==='POST'&&r.url().endsWith('/workflows'));
  await running.getByRole('button',{name:'Run authored workflow',exact:true}).click();const actualWorkflowUrl=(await firstWorkflowRequest).url();await expect.poll(()=>normal.notifications.length,{timeout:45000}).toBe(1);
  await expect.poll(()=>running.locator(`[data-uip-node="${resultNodes.success}"]`).textContent()).toBe('true');
  await running.getByLabel('name',{exact:true}).fill('Authored Form edit');await running.getByRole('button',{name:'Submit',exact:true}).click();
  await expect.poll(()=>normal.notifications.length,{timeout:45000}).toBe(3);
  expect(normal.notifications).toEqual([{message:'UI authored workflow notification'},{message:'UI authored afterCommit notification'},{message:'UI authored workflow notification'}]);
  expect(JSON.parse(await readFile(storage,'utf8'))).toContainEqual({id:'unrelated',name:'Keep'});
  await running.screenshot({path:path.join(reportRoot,'runtime-workflow-success.png'),fullPage:true});
  // Revocation is a real existing policy activation, not a fake service boolean.
  const activeSet=policy.documents().find(d=>d.definition.id==='wp4.author-set')!.definition as Extract<SecurityRecord,{kind:'permission-set'}>;
  await activate(applicationId,[{...activeSet,rules:activeSet.rules.filter(r=>r.permissionId!=='ui.artifact.view')}]);
  const restrictedCatalog=await fetch(origin+'/api/apps/wp5c-created/automation-catalog',{headers:creator}).then(r=>r.json());
  expect(restrictedCatalog.datasets).toEqual([]);expect(restrictedCatalog.services).toHaveLength(1);expect(restrictedCatalog.workflows.map((w:any)=>w.id)).toContain(workflow.definition.id);
  await activate(applicationId,[activeSet]);
  await activate(applicationId,[{...activeSet,rules:activeSet.rules.filter(r=>r.permissionId!==notificationPermission)}]);const effectCount=normal.notifications.length;
  const beforeDenied=await readFile(storage,'utf8');
  await running.getByRole('button',{name:'Run authored workflow',exact:true}).click();
  await expect.poll(()=>running.locator(`[data-uip-node="${resultNodes.error}"]`).textContent()).toBe('SERVICE_AUTHORITY_DENIED');
  await running.screenshot({path:path.join(reportRoot,'runtime-workflow-denied.png'),fullPage:true});
  const denied=await post(`${data}/workflows`,{workflowId:workflow.definition.id,primaryRecordId:'selected'},creator);expect(denied.value.success===false||denied.status===403).toBe(true);expect(normal.notifications.length).toBe(effectCount);expect(await readFile(storage,'utf8')).toBe(beforeDenied);
  expect(denied.value).toMatchObject({success:false,failedStep:1,failedActionId:actionIds[0],committedSteps:0,serviceEffects:[{outcome:'not-performed'}]});
  const catalogAfter=await fetch(origin+'/api/apps/wp5c-created/automation-catalog',{headers:creator}).then(r=>r.json());expect(catalogAfter.services).toEqual([]);
  for(const target of [{workflowId:'unknown',primaryRecordId:'selected'},{workflowId:workflow.definition.id,primaryRecordId:{id:'selected'}}]){const bad=await post(`${data}/workflows`,target,creator);expect(bad.status===403||bad.value.success===false).toBe(true);}
  expect(await readFile(storage,'utf8')).toBe(beforeDenied);expect(normal.notifications.length).toBe(effectCount);
  // Explicit transport substitutes test uncertainty without invoking the protected host again.
  const transportPattern=actualWorkflowUrl;
  await running.route(transportPattern,(r:any)=>r.fulfill({status:503,contentType:'application/json',body:'{}'}));
  await running.getByRole('button',{name:'Run authored workflow',exact:true}).click();
  await expect.poll(()=>running.locator(`[data-uip-node="${resultNodes.commitOutcome}"]`).textContent()).toBe('unknown');
  await running.screenshot({path:path.join(reportRoot,'runtime-workflow-unknown.png'),fullPage:true});await running.unroute(transportPattern);
  await running.route(transportPattern,(r:any)=>r.fulfill({status:401,contentType:'application/json',body:'{}'}));
  await running.getByRole('button',{name:'Run authored workflow',exact:true}).click();
  await expect.poll(()=>running.locator(`[data-uip-node="${resultNodes.commitOutcome}"]`).textContent()).toBe('not-committed');await running.unroute(transportPattern);
  expect(normal.notifications.length).toBe(effectCount);expect(await readFile(storage,'utf8')).toBe(beforeDenied);
  const evidence={applicationId,datasetId,workflowId:workflow.definition.id,triggerId:trigger.definition.id,actionIds,runNode,formNode,resultNodes,formDefinitionUnchanged:true,normalHost:true,registeredService:'reference.notification',dedicatedPermission:notificationPermission,realBuilderAuthoring:true,rawSourceEdited:false,transportOutcomeChecks:true,independentCatalogPermissions:true,normalHostWorkflowAllowlist:'Explicit trusted fixture setup after UI creation; not UI-only provisioning evidence',builderClosedBeforeRuntime:true,simultaneousOperationProven:false,notificationsBeforeRevocation:effectCount,browserErrors,verifiedAt:new Date().toISOString()};
  expect(browserErrors).toEqual([]);await writeFile(path.join(reportRoot,'browser-acceptance.json'),JSON.stringify(evidence,null,2));
},600_000);
