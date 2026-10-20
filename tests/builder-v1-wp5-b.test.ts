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
const editorPermissions = ['ui.presentation.view', 'ui.presentation.edit', 'ui.artifact.view', 'ui.artifact.edit', 'ui.artifact.admin', 'ui.application.view', 'ui.application.edit', 'ui.page.view', 'ui.page.edit'];

it('WP5-B: actual Builder composition, package instances, bindings, slots, events and protected route delete', async () => {
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
    const route = applicationId === null ? '/api/platform/security' : `/api/apps/wp5b-created/security`;
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
  const created = await post('/api/apps', { key: 'wp5b-created', name: 'WP4 Dataset Application', templateId: 'standard' }, creator);
  expect(created.status, JSON.stringify(created.value) + output).toBe(201);
  const applicationId = created.value.appId as string;
  expect(applicationId).toMatch(/^[a-f0-9-]{36}$/);
  const second = await post('/api/apps', { key: 'wp5b-other', name: 'WP4 Other Application', templateId: 'standard' }, creator);
  expect(second.status).toBe(201); expect(second.value.appId).not.toBe(applicationId);
  expect((await fetch(origin + '/api/apps/wp5b-other', { headers: creator })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp5b-created', { headers: creator })).status).toBe(403);
  expect((await post('/api/apps/wp5b-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Unauthorized attempt' }, creator)).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp5b-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('authority-required');
  expect((await post('/api/apps/wp5b-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Explicit initial Application security administrator' })).value.status).toBe('activated');
  expect((await post('/api/apps/wp5b-created/security/stage', { changes: [], expectedRevision: policy.revision() }, { ...security, 'x-v1-csrf': 'forged' })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp5b-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('runtime-required');
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
  await page.locator('[data-app="wp5b-created"]').first().click();
  await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  const workspace = page.getByRole('region', { name: 'Application Builder workspace' });
  const reportRoot = path.resolve(process.env.UI_D6_BROWSER_EVIDENCE_ROOT ?? 'docs/architecture/evidence/builder-v1-wp5-f-d6/simultaneous-builder-runtime'); await mkdir(reportRoot, { recursive: true });
  cleanup.push(async () => { await writeFile(path.join(reportRoot, 'server-output.log'), output); await writeFile(path.join(reportRoot, 'browser-errors.json'), JSON.stringify(browserErrors)); });
  const editor = workspace.getByLabel('Generic Artifact Editor', { exact: true });
  const createdDataset = page.waitForResponse((r: any) => r.url().endsWith('/datasets/create'));
  page.once('dialog', (dialog: any) => dialog.accept('WP5-B Records')); await workspace.getByRole('button', { name: 'Create Dataset', exact: true }).click();
  const datasetId = (await (await createdDataset).json()).manifest.artifactId;
  await editor.getByRole('tab', { name: 'Fields', exact: true }).click();
  await editor.getByRole('button', { name: 'Add field', exact: true }).click(); await editor.getByLabel('Field name', { exact: true }).nth(1).fill('name');
  await editor.getByLabel('Data type', { exact: true }).nth(1).selectOption('string'); await editor.getByLabel('Required', { exact: true }).nth(1).check();
  await editor.getByRole('button', { name: 'Save now', exact: true }).click();
  await expect.poll(() => editor.locator('[role=status]').textContent(), { timeout: 60000 }).toBe('Saved');
  await editor.getByRole('tab', { name: 'Development Apply/Connect', exact: true }).click();
  await editor.getByRole('button', { name: 'Validate saved definition', exact: true }).click(); await editor.getByText('validate completed.', { exact: true }).first().waitFor();
  page.once('dialog', (dialog: any) => dialog.accept()); await editor.getByRole('button', { name: 'Apply to Development…', exact: true }).click(); await editor.getByText('apply completed.', { exact: true }).first().waitFor();
  page.once('dialog', (dialog: any) => dialog.accept()); await editor.getByRole('button', { name: 'Connect Runtime…', exact: true }).click(); await editor.getByText('connect completed.', { exact: true }).first().waitFor();
  const schema = JSON.parse(await readFile(path.join(apps, 'wp5b-created', 'datasets', datasetId, 'dataset.json'), 'utf8'));
  const storage = path.join(runtime, 'builder-datasets', applicationId, datasetId, 'domain', 'orm', `${applicationId}__default__${schema.dataset.key}.json`);
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
  const suffix = randomUUID().slice(0, 8), sharedName = `wp5b-shared-${suffix}`;
  cleanup.push(async () => { const folder = path.resolve('components', sharedName); if (path.dirname(folder) !== path.resolve('components') || !path.basename(folder).startsWith('wp5b-shared-')) throw new Error('Unsafe cleanup'); await rm(folder, { recursive: true, force: true }); });
  const definitionBytes = async (name: string) => Object.fromEntries(await Promise.all(['html', 'css', 'visual.json', 'fixtures.json', 'functions.ts'].map(async extension => [extension, await readFile(path.join('components', name, `component.${extension}`), 'utf8')])));
  const shared = await createVisual('component', sharedName);
  await workspace.getByRole('button', { name: 'Select artifact root', exact: true }).click();
  await workspace.getByLabel('Public member name', { exact: true }).fill('title'); await workspace.getByRole('button', { name: 'Declare public member', exact: true }).click();
  await insert('html:p'); await workspace.getByLabel('Binding target', { exact: true }).selectOption('text'); await workspace.getByLabel('Binding value', { exact: true }).fill('public.title'); await workspace.getByRole('button', { name: 'Apply binding', exact: true }).click();
  await saveVisual(); const sharedFile = path.join('components', sharedName, 'component.visual.json'), sharedBefore = await readFile(sharedFile, 'utf8'), sharedRoles = await definitionBytes(sharedName);
  const publicShell = await createVisual('shell', `public-shell-${suffix}`); await selectRegion(); await insert('html:h2');
  await workspace.getByLabel('Text content', { exact: true }).fill('Public Shell fallback'); await workspace.getByLabel('Text content', { exact: true }).press('Tab'); await saveVisual();
  const shell = await createVisual('shell', `alternate-${suffix}`);
  let shellPrompts = ['region-content', 'Content']; const shellDialog = (dialog: any) => { void dialog.accept(shellPrompts.shift()); if (!shellPrompts.length) page.off('dialog', shellDialog); }; page.on('dialog', shellDialog);
  await workspace.getByRole('button', { name: 'Add Region', exact: true }).click();
  await workspace.getByLabel('Visual node', { exact: true }).selectOption(await workspace.getByLabel('Visual node', { exact: true }).locator('option').evaluateAll((options: HTMLOptionElement[]) => options.find(option => option.textContent?.startsWith('region-main'))!.value));
  page.once('dialog', (dialog: any) => dialog.accept()); await workspace.getByRole('button', { name: 'Remove selected node', exact: true }).click(); await saveVisual();
  const pageOne = await createVisual('page', `admin-${suffix}`, '/admin/people/:id', publicShell.metadata.artifactId);
  await selectRegion(); const cardOption = await workspace.getByLabel('Insert element', { exact: true }).locator('option').evaluateAll((options: HTMLOptionElement[]) => options.find(option => option.textContent?.toLowerCase().includes('card') && option.value.startsWith('package:'))?.value);
  expect(cardOption).toBeTruthy(); const manifest = path.resolve('../ui-base/packages/ui-base-ui/ui.component.json'), packageBefore = await readFile(manifest, 'utf8');
  const packageModule = path.resolve('../ui-base/packages/ui-base-ui/src/layout/uib-card.js'), packageCode = await readFile(packageModule, 'utf8');
  const cardOne = await insert(cardOption!); await workspace.getByLabel('Setting heading', { exact: true }).fill('First independent Card'); await workspace.getByLabel('Setting heading', { exact: true }).press('Tab');
  expect(await workspace.getByRole('button', { name: 'Edit Definition', exact: true }).count()).toBe(0);
  // Package-defined public footer slot, authored using ordinary insertion controls.
  const footer = await insert('html:p'); await workspace.getByLabel('Text content', { exact: true }).fill('Authored footer'); await workspace.getByLabel('Text content', { exact: true }).press('Tab');
  await workspace.getByLabel('Instance child slot', { exact: true }).selectOption('footer');
  await selectRegion(); const cardTwo = await insert(cardOption!); await workspace.getByLabel('Setting heading', { exact: true }).fill('Second independent Card'); await workspace.getByLabel('Setting heading', { exact: true }).press('Tab');
  await selectRegion(); await insert(`component:${shared.metadata.componentId}`); await workspace.getByLabel('Setting title', { exact: true }).fill('First shared consumer'); await workspace.getByLabel('Setting title', { exact: true }).press('Tab');
  await workspace.getByRole('button', { name: 'Select artifact root', exact: true }).click(); await workspace.getByLabel('New local state', { exact: true }).fill('deleteResult'); await workspace.getByRole('button', { name: 'Declare local state', exact: true }).click();
  await workspace.getByLabel('New local state', { exact: true }).fill('cardEventResult'); await workspace.getByRole('button', { name: 'Declare local state', exact: true }).click();
  await workspace.getByLabel('Visual node', { exact: true }).selectOption(cardOne); await workspace.getByLabel('Setting interactionMode', { exact: true }).selectOption('"action"');
  await workspace.getByLabel('Setting action', { exact: true }).fill('inspect'); await workspace.getByLabel('Setting action', { exact: true }).press('Tab');
  await workspace.getByLabel('Action event', { exact: true }).selectOption('uib-card-action'); await workspace.getByLabel('Action kind', { exact: true }).selectOption('set');
  await workspace.getByLabel('Action local state', { exact: true }).selectOption('cardEventResult'); await workspace.getByLabel('Action value value', { exact: true }).fill('event.detail.action'); await workspace.getByRole('button', { name: 'Add event action', exact: true }).click();
  await selectRegion(); const deleteNode = await insert('html:button'); await workspace.getByLabel('Text content', { exact: true }).fill('Delete selected record'); await workspace.getByLabel('Text content', { exact: true }).press('Tab');
  await workspace.getByLabel('Action kind', { exact: true }).selectOption('record-delete'); await workspace.getByRole('button', { name: 'Load applied delete targets', exact: true }).click();
  await workspace.getByLabel('Delete Dataset', { exact: true }).selectOption(datasetId).catch(async (cause: Error) => { throw new Error(String(cause) + '\nWorkspace: ' + await workspace.textContent() + '\nServer: ' + output); }); await workspace.getByLabel('Delete record value', { exact: true }).fill('route.id'); await workspace.getByLabel('Delete result state', { exact: true }).selectOption('deleteResult'); await workspace.getByRole('button', { name: 'Add event action', exact: true }).click();
  await selectRegion(); const resultNode = await insert('html:p'); await workspace.getByLabel('Binding value', { exact: true }).fill('local.deleteResult.success'); await workspace.getByRole('button', { name: 'Apply binding', exact: true }).click(); await saveVisual();
  await selectRegion(); const cardResultNode = await insert('html:p'); await workspace.getByLabel('Binding value', { exact: true }).fill('local.cardEventResult'); await workspace.getByRole('button', { name: 'Apply binding', exact: true }).click(); await saveVisual();
  const pageTwo = await createVisual('page', `second-${suffix}`, '/secondary', shell.metadata.artifactId);
  await selectRegion(); await insert(`component:${shared.metadata.componentId}`); await workspace.getByLabel('Setting title', { exact: true }).fill('Second shared consumer'); await workspace.getByLabel('Setting title', { exact: true }).press('Tab'); await saveVisual();
  await workspace.getByRole('button', { name: 'Edit Definition', exact: true }).click(); await expect.poll(() => workspace.getByRole('tab', { name: shared.metadata.displayName, exact: true }).getAttribute('aria-selected'), { timeout: 60000 }).toBe('true'); await focusVisual(pageTwo.metadata.displayName);
  expect(await readFile(sharedFile, 'utf8')).toBe(sharedBefore); expect(await definitionBytes(sharedName)).toEqual(sharedRoles); expect(await readFile(manifest, 'utf8')).toBe(packageBefore); expect(await readFile(packageModule, 'utf8')).toBe(packageCode);
  // Two independent instances of an actual WP4 Form definition, including route-bound edit.
  const formName = `wp5b-shared-form-${suffix}`;
  cleanup.push(async () => { const folder = path.resolve('components', formName); if (path.dirname(folder) !== path.resolve('components') || !path.basename(folder).startsWith('wp5b-shared-form-')) throw new Error('Unsafe cleanup'); await rm(folder, { recursive: true, force: true }); });
  await workspace.locator('header').getByRole('button', { name: 'Create Form', exact: true }).click(); let formDialog = page.getByRole('dialog', { name: 'Create Form' });
  await formDialog.getByLabel('Form name', { exact: true }).fill(formName); await formDialog.getByLabel('Create Form from', { exact: true }).selectOption(datasetId);
  const formResponse = page.waitForResponse((r: any) => r.request().method() === 'POST' && r.url().endsWith('/visual-components')); await formDialog.getByRole('button', { name: 'Create', exact: true }).click(); const form = await (await formResponse).json();
  await workspace.getByLabel('Generic Artifact Editor', { exact: true }).getByRole('heading', { name: form.metadata.displayName, exact: true }).waitFor();
  const formFile = path.join('components', formName, 'component.visual.json'), formBefore = await readFile(formFile, 'utf8'), formRoles = await definitionBytes(formName);
  await focusVisual(pageTwo.metadata.displayName); await selectRegion(); await insert(`component:${form.metadata.componentId}`); await saveVisual();
  await focusVisual(pageOne.metadata.displayName); await selectRegion(); const editFormNode = await insert(`component:${form.metadata.componentId}`);
  await workspace.getByLabel('Setting operation', { exact: true }).selectOption('"edit"');
  await workspace.getByLabel('Binding target', { exact: true }).selectOption('property:recordId'); await workspace.getByLabel('Binding value', { exact: true }).fill('route.id'); await workspace.getByRole('button', { name: 'Apply binding', exact: true }).click(); await saveVisual();
  expect(await readFile(formFile, 'utf8')).toBe(formBefore); expect(await definitionBytes(formName)).toEqual(formRoles);
  await workspace.getByRole('button', { name: 'Edit Definition', exact: true }).click(); await editor.getByRole('heading', { name: form.metadata.displayName, exact: true }).waitFor(); await focusVisual(pageOne.metadata.displayName);
  // Native collision rejection through the ordinary creation dialog; no source edits.
  await workspace.locator('header').getByRole('button', { name: 'Create Page', exact: true }).click(); let dialog = page.getByRole('dialog', { name: 'Create Page' }); await dialog.getByLabel('Artifact name').fill(`collision-${suffix}`); await dialog.getByLabel('Page route', { exact: true }).fill('/admin/people/:different');
  const collisionResponse = page.waitForResponse((r: any) => r.request().method() === 'POST' && r.url().endsWith('/visual-pages')); await dialog.getByRole('button', { name: 'Create', exact: true }).click(); expect((await collisionResponse).status()).toBeGreaterThanOrEqual(400);
  await focusVisual(pageOne.metadata.displayName); page.removeAllListeners('dialog');
  const mappingPrompts = [shell.metadata.artifactId, 'region-content']; const mapDialog = (dialog: any) => { void dialog.accept(mappingPrompts.shift()); if (!mappingPrompts.length) page.off('dialog', mapDialog); }; page.on('dialog', mapDialog);
  const mappingResponse = page.waitForResponse((r: any) => r.request().method() === 'POST' && r.url().endsWith('/page-shell')); await workspace.getByRole('button', { name: 'Change Page Shell', exact: true }).click(); const mapped = await (await mappingResponse).json();
  expect(mapped.metadata.artifactId).toBe(pageOne.metadata.artifactId); expect(mapped.metadata.routeId).toBe(pageOne.metadata.routeId); expect(mapped.metadata.shellId).toBe(shell.metadata.artifactId); expect(mapped.files.source).toContain('region-content'); expect(mapped.files.source).toContain(deleteNode);
  await workspace.getByRole('button', { name: 'Design preview', exact: true }).click();
  const data = '/api/apps/wp5b-created/application-data'; expect((await post(`${data}/operations`, { datasetId, operation: 'insert', records: [{ id: 'selected', name: 'Delete me' }, { id: 'unrelated', name: 'Keep me' }] }, creator)).value).toMatchObject({ success: true, committed: true });
  const beforePreview = await readFile(storage, 'utf8'); const preview = page.frameLocator('iframe[title="Nonpersisting Visual Artifact design preview"]'); await preview.getByRole('button', { name: 'Delete selected record', exact: true }).click(); expect(await readFile(storage, 'utf8')).toBe(beforePreview);
  await preview.locator(`[data-uip-node="${cardOne}"]`).click(); await expect.poll(() => preview.locator(`[data-uip-node="${cardResultNode}"]`).textContent()).toBe('inspect');
  await page.screenshot({ path: path.join(reportRoot, 'builder-authoring.png'), fullPage: true });
  // D6: keep the actual Builder browser and API process active throughout runtime startup.
  const managed = await post('/api/apps/wp5b-created/preview', {}, creator); expect(managed.status, JSON.stringify(managed.value) + output).toBe(200);
  const running = await browserContext.newPage(); running.on('pageerror', (error: Error) => browserErrors.push(error.message));
  await running.goto(managed.value.url);
  const targetUrl = new URL(running.url()); targetUrl.pathname = targetUrl.pathname.replace(/\/?$/, '/') + 'admin/people/selected'; await running.goto(targetUrl.href);
  await expect.poll(() => running.getByLabel('name', { exact: true }).inputValue(), { timeout: 45000 }).toBe('Delete me');
  const overlapping: unknown[] = [];
  for (let round = 0; round < 3; round++) {
    expect(page.isClosed()).toBe(false);
    let saveStartedAt = 0, saveEndedAt = 0, overlapStartedAt = 0;
    const saveRequest = page.waitForRequest((request: any) => request.method() === 'PUT' && request.url().includes('/visual-')).then(() => { saveStartedAt = Date.now(); });
    const results = await Promise.all([
      (async () => { await selectRegion(); await insert('html:p'); await workspace.getByLabel('Text content', { exact: true }).fill(`D6 simultaneous save ${round}`); await workspace.getByLabel('Text content', { exact: true }).press('Tab'); await saveVisual(); saveEndedAt = Date.now(); return 'saved'; })(),
      saveRequest.then(() => { overlapStartedAt = Date.now(); return running.reload().then(() => 'runtime-reloaded'); }),
      saveRequest.then(() => page.evaluate(async () => {
        const session = await fetch('/api/editor/session').then(r => r.json());
        const headers = { 'x-editor-revision': session.revision };
        const responses = await Promise.all(['/api/apps/wp5b-created/builder-workspace/validate?full=1', '/api/apps/wp5b-created/visual-artifacts'].map(url => fetch(url, { headers })));
        return Promise.all(responses.map(async response => ({ status: response.status, body: await response.json() })));
      })),
    ]);
    expect((results[2] as Array<{ status: number }>).map(r => r.status)).toEqual([200, 200]);
    expect(overlapStartedAt).toBeGreaterThanOrEqual(saveStartedAt); expect(overlapStartedAt).toBeLessThanOrEqual(saveEndedAt);
    overlapping.push({ round, saveStartedAt, overlapStartedAt, saveEndedAt, results: [results[0], results[1]], readStatuses: (results[2] as Array<{ status: number }>).map(r => r.status) });
  }
  await running.reload(); await running.getByText('D6 simultaneous save 2', { exact: true }).waitFor();
  await page.screenshot({ path: path.join(reportRoot, 'builder-still-active.png'), fullPage: true });
  await running.getByLabel('name', { exact: true }).fill('Edited through authored Admin Form'); await running.getByRole('button', { name: 'Submit', exact: true }).click();
  await running.locator('[data-uip-node="saved-result"]').filter({ hasText: 'Edited through authored Admin Form' }).waitFor({ timeout: 45000 });
  expect(JSON.parse(await readFile(storage, 'utf8'))).toContainEqual({ id: 'selected', name: 'Edited through authored Admin Form' });
  await running.getByRole('button', { name: 'Delete selected record', exact: true }).click().catch(async (cause: Error) => { await running.screenshot({ path: path.join(reportRoot, 'running-failure.png'), fullPage: true }); throw new Error(String(cause) + '\nURL: ' + targetUrl.href + '\nBody: ' + await running.locator('body').innerText() + '\nBrowser: ' + browserErrors.join('\n') + '\nServer: ' + output); });
  await expect.poll(async () => JSON.parse(await readFile(storage, 'utf8')).some((row: any) => row.id === 'selected'), { timeout: 45000 }).toBe(false);
  const finalRows = JSON.parse(await readFile(storage, 'utf8')); expect(finalRows).toContainEqual({ id: 'unrelated', name: 'Keep me' });
  await expect.poll(() => running.locator(`[data-uip-node="${resultNode}"]`).textContent()).toBe('true');
  await running.screenshot({ path: path.join(reportRoot, 'running-delete.png'), fullPage: true });
  const beforeDenied = await readFile(storage, 'utf8');
  for (const target of [{ datasetId: 'unknown', primaryFieldId: schema.fields[0].id, recordId: 'unrelated' }, { datasetId, primaryFieldId: 'invalid', recordId: 'unrelated' }, { datasetId, primaryFieldId: schema.fields[0].id, recordId: 42 }]) expect((await post(`${data}/operations`, { kind: 'record-delete', version: 1, ...target }, creator)).value).toMatchObject({ success: false, committed: false });
  expect((await post(`${data}/operations`, { kind: 'record-delete', version: 1, datasetId, primaryFieldId: schema.fields[0].id, recordId: 'unrelated' }, unrelated)).value).toMatchObject({ success: false, committed: false }); expect(await readFile(storage, 'utf8')).toBe(beforeDenied);
  await activate(applicationId, [{ ...assignment, status: 'inactive' }]);
  expect((await post(`${data}/operations`, { kind: 'record-delete', version: 1, datasetId, primaryFieldId: schema.fields[0].id, recordId: 'unrelated' }, creator)).value).toMatchObject({ success: false, committed: false }); expect(await readFile(storage, 'utf8')).toBe(beforeDenied);
  expect(browserErrors).toEqual([]);
  await writeFile(path.join(reportRoot, 'browser-acceptance.json'), JSON.stringify({ applicationId, datasetId, shellIds: [pageOne.metadata.shellId, shell.metadata.artifactId], pageIds: [pageOne.metadata.artifactId, pageTwo.metadata.artifactId], sharedId: shared.metadata.componentId, cardNodes: [cardOne, cardTwo], footer, deleteNode, resultNode, packageDefinitionsUnchanged: true, sharedDefinitionUnchanged: true, builderClosedBeforeRuntime: false, simultaneousOperationProven: true, overlapping, browserErrors, verifiedAt: new Date().toISOString() }, null, 2));
}, 600_000);
