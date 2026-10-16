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

it('WP4: actual Form authoring, A18, declarative rules, isolated protected submission and runtime persistence', async () => {
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
    grantablePermissionIds: [...new Set(['ui.platform.application.create', 'ui.platform.component.admin', 'ui.application.view', 'ui.application.edit', 'ui.workflow.edit', ...editorPermissions, ...dataPermissions])],
    capabilityDefinitions: dataPermissions.map(id => ({ id, applicableKinds: ['dataset', 'field'] })),
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
    const route = applicationId === null ? '/api/platform/security' : `/api/apps/wp4-created/security`;
    const changes = records.map(definition => { const previous = policy.documents().find(d => d.definition.id === definition.id); return { document: doc(definition), ...(previous ? { expectedChecksum: securityChecksum(previous) } : {}) }; });
    const staged = await post(`${route}/stage`, { changes, expectedRevision: policy.revision(), reason: 'Explicit WP0 role administration' });
    expect(staged.value.diagnostics).toEqual([]);
    const activated = await post(`${route}/activate`, { candidateId: staged.value.id, checksum: staged.value.checksum, expectedRevision: staged.value.baseRevision, reason: 'Explicit WP0 role administration' });
    expect(activated.value.status, JSON.stringify(activated.value)).toBe('activated');
  };
  const base = (id: string) => ({ id, key: id, name: id, status: 'active' as const });
  await activate(null, [
    { ...base('wp0.creator-set'), kind: 'permission-set', owner: { kind: 'platform' }, includes: [], rules: ['ui.platform.application.create', 'ui.platform.component.admin'].map((permissionId, index) => ({ id: 'wp4.platform.' + index, permissionId, effect: 'allow' as const, scope: platformScope })) },
    { ...base('wp0.creator-role'), kind: 'role', owner: { kind: 'platform' }, permissionSets: [{ id: 'wp0.creator-set' }] },
    { kind: 'role-assignment', id: 'wp0.creator-assignment', userId: developmentUsers[2].id, roleId: 'wp0.creator-role', status: 'active', scope: platformScope, startsAt: '2026-01-01T00:00:00Z', endsAt: null },
  ]);
  const created = await post('/api/apps', { key: 'wp4-created', name: 'WP4 Dataset Application', templateId: 'standard' }, creator);
  expect(created.status, JSON.stringify(created.value) + output).toBe(201);
  const applicationId = created.value.appId as string;
  expect(applicationId).toMatch(/^[a-f0-9-]{36}$/);
  const second = await post('/api/apps', { key: 'wp4-other', name: 'WP4 Other Application', templateId: 'standard' }, creator);
  expect(second.status).toBe(201); expect(second.value.appId).not.toBe(applicationId);
  expect((await fetch(origin + '/api/apps/wp4-other', { headers: creator })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp4-created', { headers: creator })).status).toBe(403);
  expect((await post('/api/apps/wp4-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Unauthorized attempt' }, creator)).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp4-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('authority-required');
  expect((await post('/api/apps/wp4-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Explicit initial Application security administrator' })).value.status).toBe('activated');
  expect((await post('/api/apps/wp4-created/security/stage', { changes: [], expectedRevision: policy.revision() }, { ...security, 'x-v1-csrf': 'forged' })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp4-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('runtime-required');
  const registry = new DevelopmentApplicationRegistry(path.join(runtime, 'development-applications.sqlite'), apps); cleanup.push(async () => registry.close());
  const scope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId, kind: 'application' as const, id: applicationId }, descendants: true };
  const owner = { kind: 'application' as const, applicationId };
  const assignment: SecurityRecord = { kind: 'role-assignment', id: 'wp4.author-assignment', userId: developmentUsers[2].id, roleId: 'wp4.author-role', status: 'active', scope, startsAt: '2026-01-01T00:00:00Z', endsAt: null };
  await activate(applicationId, [
    { ...base('wp4.author-set'), kind: 'permission-set', owner, includes: [], rules: [...new Set(editorPermissions.concat(dataPermissions))].map((permissionId, i) => ({ id: `wp4.allow.${i}`, permissionId, effect: 'allow' as const, scope })) },
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
  await page.locator('[data-app="wp4-created"]').first().click();
  await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  const workspace = page.getByRole('region', { name: 'Application Builder workspace' });
  const reportRoot = path.resolve('docs/architecture/evidence/builder-v1-wp4'); await mkdir(reportRoot, { recursive: true });
  const formName = `wp4-form-${randomUUID().slice(0,8)}`;
  cleanup.push(async () => { const folder = path.resolve('components', formName); if (path.dirname(folder) !== path.resolve('components') || !path.basename(folder).startsWith('wp4-form-')) throw new Error('Unsafe test cleanup'); await rm(folder, { recursive: true, force: true }); });
  await workspace.getByRole('button', { name: 'Create Form', exact: true }).click();
  await page.getByRole('dialog', { name: 'Create Form' }).getByLabel('Form name', { exact: true }).fill(formName);
  const formCreated = page.waitForResponse((r: any) => r.request().method() === 'POST' && r.url().endsWith('/visual-components'));
  await page.getByRole('dialog', { name: 'Create Form' }).getByRole('button', { name: 'Create', exact: true }).click();
  const formBundle = await (await formCreated).json(); expect(formBundle.metadata?.form).toMatchObject({ contractVersion: 1, datasetId: '', fields: [] });
  console.log('WP4 checkpoint: blank Form created');
  const editor = workspace.getByLabel('Generic Artifact Editor', { exact: true });
  await editor.getByRole('tab', { name: 'Dataset Mapping', exact: true }).click();
  page.once('dialog', (dialog: any) => dialog.dismiss()); await editor.getByRole('button', { name: 'Create Dataset from Form', exact: true }).click();
  expect(JSON.parse(await readFile(path.join('components', formName, 'component.visual.json'), 'utf8')).form.datasetId).toBe('');
  // A failed creation cannot create a pending link.
  const failedCreation = page.waitForResponse((r:any)=>r.url().endsWith('/datasets/create'));
  page.once('dialog',(dialog:any)=>dialog.accept('X'.repeat(101))); await editor.getByRole('button',{name:'Create Dataset from Form',exact:true}).click(); expect((await failedCreation).status()).toBe(422);
  expect(JSON.parse(await readFile(path.join('components',formName,'component.visual.json'),'utf8')).form.datasetId).toBe('');
  // A changed originating Form rejects a completed Dataset creation; explicit cancel leaves it unlinked.
  const unusedCreation = page.waitForResponse((r:any)=>r.url().endsWith('/datasets/create'));
  page.once('dialog',(dialog:any)=>dialog.accept('Unlinked Dataset')); await editor.getByRole('button',{name:'Create Dataset from Form',exact:true}).click(); const unusedDataset = await (await unusedCreation).json();
  await editor.getByRole('tab',{name:'Fields',exact:true}).waitFor();
  await workspace.getByRole('tab',{name:formBundle.metadata.displayName,exact:true}).click(); await editor.getByRole('tab',{name:'Modes',exact:true}).click();
  page.once('dialog',(dialog:any)=>dialog.accept('alternate')); await editor.getByRole('button',{name:'Add mode',exact:true}).click();
  await workspace.getByRole('button',{name:'Return and link Dataset to Form',exact:true}).click(); await workspace.getByText('Origin changed. No link was made.',{exact:true}).waitFor();
  expect(JSON.parse(await readFile(path.join('components',formName,'component.visual.json'),'utf8')).form.datasetId).toBe('');
  await workspace.getByRole('button',{name:'Cancel Dataset link',exact:true}).click();
  await editor.getByRole('tab',{name:'Dataset Mapping',exact:true}).click();
  const datasetCreated = page.waitForResponse((r: any) => r.url().endsWith('/datasets/create'));
  page.once('dialog', (dialog: any) => dialog.accept('WP4 Records')); await editor.getByRole('button', { name: 'Create Dataset from Form', exact: true }).click();
  const dataset = await (await datasetCreated).json(), datasetId = dataset.manifest.artifactId;
  await editor.getByRole('tab', { name: 'Fields', exact: true }).click();
  const fieldSpecs = [['name','string',true], ['quantity','number',true], ['price','number',true], ['total','number',false], ['showDate','boolean',false], ['when','date',false], ['details','json',false]] as const;
  for (const [i, [key, type, required]] of fieldSpecs.entries()) {
    await editor.getByRole('button', { name: 'Add field', exact: true }).click();
    await editor.getByLabel('Field name', { exact: true }).nth(i+1).fill(key);
    await editor.getByLabel('Data type', { exact: true }).nth(i+1).selectOption(type);
    if (required) await editor.getByLabel('Required', { exact: true }).nth(i+1).check();
  }
  const saved = async () => { await editor.getByRole('button', { name: 'Save now', exact: true }).click(); await page.waitForFunction(() => document.querySelector('.artifact-editor [role=status]')?.textContent === 'Saved').catch(async (error: Error) => { throw new Error(String(error) + '\nEditor: ' + await editor.textContent() + '\nServer: ' + output); }); };
  await saved(); const schemaFile = path.join(apps, 'wp4-created', 'datasets', datasetId, 'dataset.json'), schema = JSON.parse(await readFile(schemaFile, 'utf8'));
  await editor.getByRole('tab', { name: 'Development Apply/Connect', exact: true }).click();
  await editor.getByRole('button', { name: 'Validate saved definition', exact: true }).click(); await editor.getByText('validate completed.', { exact: true }).first().waitFor();
  page.once('dialog', (dialog: any) => dialog.accept()); await editor.getByRole('button', { name: 'Apply to Development…', exact: true }).click(); await editor.getByText('apply completed.', { exact: true }).first().waitFor();
  page.once('dialog', (dialog: any) => dialog.accept()); await editor.getByRole('button', { name: 'Connect Runtime…', exact: true }).click(); await editor.getByText('connect completed.', { exact: true }).first().waitFor();
  console.log('WP4 checkpoint: Dataset applied and connected');
  await workspace.getByRole('button', { name: 'Return and link Dataset to Form', exact: true }).click();
  await editor.getByRole('tab', { name: 'Dataset Mapping', exact: true }).click();
  await editor.getByRole('button', { name: 'Refresh Datasets', exact: true }).click();
  await editor.getByRole('button', { name: 'Generate supported mappings', exact: true }).click(); await saved();
  await editor.getByText('No automatic control/conversion is available.', { exact: false }).first().waitFor();
  page.once('dialog', (dialog: any) => dialog.accept()); await editor.getByRole('button', { name: 'Manually map details as JSON object', exact: true }).click(); await saved();
  await editor.getByRole('tab', { name: 'Structure and Fields', exact: true }).click();
  const initialMetadata = JSON.parse(await readFile(path.join('components', formName, 'component.visual.json'), 'utf8'));
  const nameField = editor.locator('[data-form-field]').filter({ has: editor.getByRole('legend', { name: 'name', exact: true }) });
  // Scope by permanent Form-field ID; presentation labels are allowed to change.
  const nameRow = editor.locator(`[data-form-field="${initialMetadata.form.fields.find((f:any) => f.key === 'name').id}"]`);
  await nameRow.getByLabel('Field label', { exact: true }).fill('Person name'); await saved();
  await editor.getByRole('button', { name: 'Undo', exact: true }).click(); expect(await nameRow.getByLabel('Field label', { exact: true }).inputValue()).toBe('name');
  await editor.getByRole('button', { name: 'Redo', exact: true }).click(); expect(await nameRow.getByLabel('Field label', { exact: true }).inputValue()).toBe('Person name'); await saved();
  await editor.getByRole('tab', { name: 'Validation and Calculations', exact: true }).click();
  const rowFor = (key: string) => editor.locator(`[data-form-field="${initialMetadata.form.fields.find((f:any) => f.key === key)?.id ?? JSON.parse('null')}"]`);
  const total = rowFor('total'); await total.getByLabel('Calculated field', { exact: true }).check(); await total.getByLabel('Persist calculated value', { exact: true }).check();
  await total.getByLabel('total calculation kind', { exact: true }).selectOption('operator');
  await total.getByLabel('total calculation operator', { exact: true }).selectOption('multiply');
  await total.getByLabel('total calculation.1 kind', { exact: true }).selectOption('field'); await total.getByLabel('total calculation.1 field', { exact: true }).selectOption(schema.fields.find((f:any) => f.key === 'quantity').id);
  await total.getByLabel('total calculation.2 kind', { exact: true }).selectOption('field'); await total.getByLabel('total calculation.2 field', { exact: true }).selectOption(schema.fields.find((f:any) => f.key === 'price').id);
  const date = rowFor('when'); await date.getByLabel('Conditional visibility', { exact: true }).check(); await date.getByLabel('when condition kind', { exact: true }).selectOption('field'); await date.getByLabel('when condition field', { exact: true }).selectOption(schema.fields.find((f:any) => f.key === 'showDate').id); await saved();
  const finalMetadata = JSON.parse(await readFile(path.join('components', formName, 'component.visual.json'), 'utf8'));
  expect(finalMetadata.componentId).toBe(formBundle.metadata.componentId); expect(finalMetadata.form.fields.find((f:any) => f.key === 'name').id).toBe(initialMetadata.form.fields.find((f:any) => f.key === 'name').id);
  console.log('WP4 checkpoint: rules saved');
  await page.screenshot({ path: path.join(reportRoot, 'form-rules.png'), fullPage: true });
  await editor.getByRole('tab', { name: 'Preview and Submission Test', exact: true }).click();
  await editor.getByRole('button', { name: 'Open nonpersisting design preview', exact: true }).click();
  let frame = page.frameLocator('iframe[title="Form design preview"]');
  await frame.getByLabel('Person name', { exact: true }).fill('Preview only').catch(async (e:Error) => { await page.screenshot({path:path.join(reportRoot,'failure.png'),fullPage:true}); throw new Error(String(e)+'\nPreview: '+await frame.locator('body').innerText({timeout:2000}).catch(()=> 'frame unavailable')+'\nBrowser: '+browserErrors.join('\n')+'\nBuilder: '+await workspace.textContent()); });
  await frame.getByLabel('quantity', { exact: true }).fill('2'); await frame.getByLabel('price', { exact: true }).fill('3');
  expect(await frame.getByLabel('total', { exact: true }).inputValue()).toBe('6');
  expect(await frame.getByLabel('when', { exact: true }).count()).toBe(0);
  await frame.getByLabel('showDate', { exact: true }).check(); await frame.getByLabel('when', { exact: true }).fill('2026-10-16T12:34:56.000Z');
  await frame.getByRole('button', { name: 'Submit', exact: true }).click();
  console.log('WP4 design submit state:', await frame.locator('body').innerText());
  await frame.locator('[data-uip-node="submit-error"]').filter({ hasText: 'Missing Dataset adapter' }).waitFor();
  const storage = path.join(runtime, 'builder-datasets', applicationId, datasetId, 'domain', 'orm', `${applicationId}__default__${schema.dataset.key}.json`);
  const beforeTesting = await readFile(storage, 'utf8'); expect(beforeTesting).not.toContain('Preview only');
  console.log('WP4 checkpoint: nonpersisting preview verified');
  const testResponse = page.waitForResponse((r:any) => r.url().endsWith('/form-tests/start')); await editor.getByRole('button', { name: 'Start isolated submission test', exact: true }).click();
  const testInfo = await (await testResponse).json(); expect(testInfo, output).toMatchObject({ mode: 'isolated-development', storageIsolated: true });
  frame = page.frameLocator('iframe[title="Isolated Form submission test"]');
  await frame.getByLabel('Person name', { exact: true }).fill('Isolated person'); await frame.getByLabel('quantity', { exact: true }).fill('4'); await frame.getByLabel('price', { exact: true }).fill('5');
  await frame.getByLabel('details', { exact: true }).fill('{"note":"safe"}');
  await frame.getByLabel('details',{exact:true}).fill('{'); await frame.getByLabel('quantity',{exact:true}).fill('5'); expect(await frame.getByLabel('details',{exact:true}).inputValue()).toBe('{');
  await frame.getByRole('button',{name:'Submit',exact:true}).click(); await frame.locator('[data-uip-node="submit-error"]').filter({hasText:'Correct invalid JSON'}).waitFor();
  await frame.getByLabel('quantity',{exact:true}).fill('4'); await frame.getByLabel('details',{exact:true}).fill('{"note":"safe"}');
  console.log('Before test Submit:', await frame.locator('[data-uip-artifact]').evaluate((host:HTMLElement) => [...host.shadowRoot!.querySelectorAll<HTMLElement>('[data-uip-node]')].filter(e=>e.localName.startsWith('uib-forms-')).map(e=>({ tag:e.localName,name:e.getAttribute('name'),value:(e as unknown as {value:unknown}).value,checked:(e as unknown as {checked:unknown}).checked,invalid:e.hasAttribute('invalid'),required:e.hasAttribute('required'),disabled:e.hasAttribute('disabled') }))));
  await frame.getByRole('button', { name: 'Submit', exact: true }).click();
  console.log('After test Submit:', await frame.locator('[data-uip-node="submit-error"]').textContent(), await frame.locator('#events').textContent(), await frame.locator('[data-uip-node="saved-result"]').textContent());
  await frame.locator('[data-uip-node="saved-result"]').filter({ hasText: 'Isolated person' }).waitFor({ timeout: 45000 }).catch(async (e: Error) => { throw new Error(String(e) + '\nFrame: ' + await frame.locator('body').innerText({ timeout: 2000 }).catch(() => 'Frame unavailable') + '\nBuilder: ' + await workspace.textContent() + '\nBrowser: ' + browserErrors.join('\n') + '\nServer: ' + output); });
  const testRecord = JSON.parse(await frame.locator('[data-uip-node="saved-result"]').innerText()); expect(testRecord.total).toBe(20); expect(testRecord.details).toEqual({ note: 'safe' });
  expect(await readFile(storage, 'utf8')).toBe(beforeTesting);
  const testStorage = path.join(runtime, 'form-submission-tests', applicationId, testInfo.testId, 'domain', 'orm', `${applicationId}__default__${schema.dataset.key}.json`); expect(await readFile(testStorage, 'utf8')).toContain('Isolated person');
  await page.screenshot({ path: path.join(reportRoot, 'isolated-submission.png'), fullPage: true });
  const formId = finalMetadata.componentId;
  const crafted = await page.evaluate(async ({ datasetId, formId, testId }:any) => fetch(`/api/apps/wp4-created/form-tests/${testId}/operations`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ datasetId, formId, operation: 'insert', records: [{ id:'crafted', name:'Tampered', quantity:4, price:5, total:999 }] }) }).then(r => r.json()), { datasetId, formId, testId: testInfo.testId });
  expect(crafted).toMatchObject({ success: false, committed: false, errors: [{ code:'FORM_CALCULATED_VALUE_INVALID' }] });
  expect(await readFile(testStorage,'utf8')).not.toContain('Tampered');
  await editor.getByLabel('Preview operation', { exact: true }).selectOption('edit'); await editor.getByLabel('Preview record ID', { exact: true }).fill(testRecord.id);
  await editor.getByRole('button', { name: 'Refresh isolated test view', exact: true }).click();
  frame = page.frameLocator('iframe[title="Isolated Form submission test"]');
  await expect.poll(() => frame.getByLabel('Person name', { exact: true }).inputValue(), { timeout: 45000 }).toBe('Isolated person');
  await frame.getByLabel('Person name', { exact: true }).fill('Isolated edited');
  await frame.getByRole('button', { name: 'Submit', exact: true }).click();
  await frame.locator('[data-uip-node="saved-result"]').filter({ hasText: 'Isolated edited' }).waitFor({ timeout: 45000 });
  expect(await readFile(storage, 'utf8')).toBe(beforeTesting);
  // Protected normal Application submission uses the same Form contract and client path.
  const data = '/api/apps/wp4-created/application-data';
  const normal = await post(`${data}/operations`, { datasetId, formId, operation:'insert', records:[{ id:'normal', name:'Normal Application', quantity:2, price:7, total:14 }] }, creator);
  expect(normal.value, output).toMatchObject({ success:true, committed:true }); expect(await readFile(storage,'utf8')).toContain('Normal Application'); expect(await readFile(testStorage,'utf8')).not.toContain('Normal Application');
  expect((await post(`${data}/operations`, { datasetId, formId, operation:'update', records:[{ id:'normal', price:8, total:16 }] }, creator)).value).toMatchObject({ success:true, committed:true });
  const reloaded = await post(`${data}/queries`, { datasetId, select:['id','name','total'] }, creator); expect(reloaded.value).toContainEqual({ id:'normal', name:'Normal Application', total:16 });
  await editor.getByRole('button', { name: 'End isolated submission test', exact: true }).click(); await editor.getByText('Isolated test ended.', { exact:false }).first().waitFor();
  // Second creation path: choose the real applied Dataset in the creation dialog.
  const generatedName = `wp4-form-${randomUUID().slice(0,8)}`;
  cleanup.push(async () => { const folder = path.resolve('components', generatedName); if (path.dirname(folder) !== path.resolve('components') || !path.basename(folder).startsWith('wp4-form-')) throw new Error('Unsafe test cleanup'); await rm(folder,{recursive:true,force:true}); });
  await workspace.getByRole('button', { name:'Create Form', exact:true }).click(); const creationDialog = page.getByRole('dialog',{name:'Create Form'});
  await creationDialog.getByLabel('Form name',{exact:true}).fill(generatedName); await creationDialog.getByLabel('Create Form from',{exact:true}).selectOption(datasetId);
  const generatedResponse = page.waitForResponse((r:any) => r.request().method()==='POST' && r.url().endsWith('/visual-components')); await creationDialog.getByRole('button',{name:'Create',exact:true}).click();
  const generatedHttp = await generatedResponse, generatedBundle = await generatedHttp.json(); expect(generatedHttp.status(),JSON.stringify(generatedBundle)+output).toBe(201); expect(generatedBundle.metadata.form.fields.map((f:any)=>f.key)).toContain('when'); expect(generatedBundle.metadata.form.fields.map((f:any)=>f.key)).not.toContain('details');
  await editor.getByRole('heading',{name:generatedName.replaceAll('-',' '),exact:true}).waitFor();
  await editor.getByRole('tab',{name:'Dataset Mapping',exact:true}).click(); await editor.getByRole('button',{name:'Manually map details as JSON object',exact:true}).waitFor();
  // Insert the authored shared definition through the existing Page UI.
  await workspace.getByRole('navigation',{name:'Application artifacts'}).locator('button').filter({hasText:/^(Welcome|Home)$/}).first().click();
  const nodes = workspace.getByLabel('Visual node',{exact:true}); await nodes.waitFor(); await nodes.locator('option').filter({hasText:/^region-main/}).first().waitFor({state:'attached'}); const regionValue = await nodes.locator('option').evaluateAll((options: HTMLOptionElement[]) => options.find(o=>o.textContent?.startsWith('region-main'))?.value);
  expect(regionValue).toBeTruthy(); await nodes.selectOption(regionValue!);
  await workspace.getByLabel('Insert element',{exact:true}).selectOption(`component:${formId}`); await workspace.getByRole('button',{name:'Insert with layout wrapper',exact:true}).click();
  const pageSave = page.waitForResponse((r:any) => r.request().method()==='PUT' && r.url().includes('/visual-pages?')); await workspace.getByRole('button',{name:'Save Now',exact:true}).click(); expect((await pageSave).status()).toBe(200);
  const managed = await post('/api/apps/wp4-created/preview',{},creator); expect(managed.status,JSON.stringify(managed.value)+output).toBe(200);
  const running = await browserContext.newPage(); running.on('pageerror',(e:Error)=>browserErrors.push(e.message)); await running.goto(managed.value.url);
  await running.getByLabel('Person name',{exact:true}).fill('Browser Application').catch(async (error: Error) => { await running.screenshot({path:path.join(reportRoot,'running-failure.png'),fullPage:true}); throw new Error(String(error)+'\nRunning: '+await running.locator('body').innerText()+'\nBrowser: '+browserErrors.join('\n')+'\nServer: '+output); }); await running.getByLabel('quantity',{exact:true}).fill('3'); await running.getByLabel('price',{exact:true}).fill('9');
  await running.getByRole('button',{name:'Submit',exact:true}).click(); await running.locator('[data-uip-node="saved-result"]').filter({hasText:'Browser Application'}).waitFor({timeout:45000});
  const normalBrowserRecord = JSON.parse(await running.locator('[data-uip-node="saved-result"]').innerText()); expect(normalBrowserRecord.total).toBe(27);
  expect(await readFile(storage,'utf8')).toContain('Browser Application'); expect(await readFile(testStorage,'utf8')).not.toContain('Browser Application');
  await running.screenshot({path:path.join(reportRoot,'running-application.png'),fullPage:true}); await running.reload(); await running.getByLabel('Person name',{exact:true}).waitFor(); expect(await running.locator('vite-error-overlay').count()).toBe(0);
  await running.close();
  expect(browserErrors).toEqual([]);
  await writeFile(path.join(reportRoot,'acceptance.json'), JSON.stringify({ applicationId,datasetId,formId, formArtifactId:finalMetadata.artifactId, fieldIds:finalMetadata.form.fields.map((f:any) => f.datasetFieldId), testId:testInfo.testId, tests:['actual-builder-blank-form','cancel-dataset-create-no-link','failed-dataset-create-no-link','stale-origin-refuses-link','A18-create-configure-apply-connect-return-link','generic-editor-five-roles','identity-stable-undo-redo','applied-ID-mapping','explicit-date-json-handling','typed-calculation-and-condition-authoring','nonpersisting-design-preview','isolated-protected-submission','invalid-json-draft-preserved-and-blocked','crafted-calculation-rejected','isolated-versus-normal-storage','protected-normal-create-update-read','actual-builder-from-dataset-form','actual-page-form-insertion','running-application-browser-submit-reload'], provenance:{ application:'Normal Standard API creation', permissions:'Explicit existing trusted setup/stage/activate APIs', authoring:'Actual browser controls; no source JSON editing', normalSubmission:'Actual running Application browser submission and reload, supplemented by protected create/update/read API checks' }, browserErrors, verifiedAt:new Date().toISOString() },null,2));
}, 600_000);

