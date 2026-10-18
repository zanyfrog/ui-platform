import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:http';
import { V1DevelopmentIdentity } from '../src/server/v1-development-identity.js';
import { V1_AUTHORITY_ID, V1_FIXTURE_APPLICATION_ID, developmentUsers } from '../src/server/v1-development-policy.js';
import { developmentSecurityConfiguration, developmentSecurityScopes } from '../src/server/v1-security-administration.js';
import { SecurityDefinitionService, SecurityDefinitionStore, securityChecksum, type SecurityDocument, type SecurityRecord } from '@ui-platform/i-am/definitions';
import { initializeDevelopmentPlatformSecurity } from '@ui-platform/i-am/administration';
import { DevelopmentApplicationRegistry } from '../src/server/development-application-registry.js';
import { createRequire } from 'node:module';
import { createServer as createViteServer } from 'vite';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); }, 60_000);
const doc = (definition: SecurityRecord): SecurityDocument => ({ format: 'ui-platform.security', formatVersion: 1, definition });
const platformScope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system' as const, id: 'platform' }, descendants: true };
const dataPermissions = ['dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete', 'dataset.write'];
const editorPermissions = ['ui.presentation.view', 'ui.presentation.edit', 'ui.artifact.view', 'ui.artifact.edit', 'ui.artifact.admin', 'ui.application.view', 'ui.application.edit', 'ui.page.view', 'ui.page.edit'];

it('WP5-E: real settings, dirty editors, Problems navigation and saved dependency refresh', async () => {
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
  const launchServer = () => spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], { windowsHide: true,
    env: { ...process.env, NODE_ENV: 'development', UI_PLATFORM_WP4_TRACE: '1', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '1', UI_PLATFORM_BUILDER_WP0: '1',
      UI_PLATFORM_V1_POLICY_STORE: policyPath, UI_APPS_DIR: apps, UI_RUNTIME_DIR: runtime, UI_PLATFORM_BUILDER_HOSTS_FILE: hostsFile,
      UI_PLATFORM_API_PORT: String(port), UI_PLATFORM_UI_PORT: String(port), npm_config_offline: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
  let child: ChildProcess = launchServer();
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
    const route = applicationId === null ? '/api/platform/security' : `/api/apps/wp5e-created/security`;
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
  const created = await post('/api/apps', { key: 'wp5e-created', name: 'WP4 Dataset Application', templateId: 'standard' }, creator);
  expect(created.status, JSON.stringify(created.value) + output).toBe(201);
  const applicationId = created.value.appId as string;
  expect(applicationId).toMatch(/^[a-f0-9-]{36}$/);
  const second = await post('/api/apps', { key: 'wp5e-other', name: 'WP4 Other Application', templateId: 'standard' }, creator);
  expect(second.status).toBe(201); expect(second.value.appId).not.toBe(applicationId);
  expect((await fetch(origin + '/api/apps/wp5e-other', { headers: creator })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp5e-created', { headers: creator })).status).toBe(403);
  expect((await post('/api/apps/wp5e-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Unauthorized attempt' }, creator)).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp5e-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('authority-required');
  expect((await post('/api/apps/wp5e-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Explicit initial Application security administrator' })).value.status).toBe('activated');
  expect((await post('/api/apps/wp5e-created/security/stage', { changes: [], expectedRevision: policy.revision() }, { ...security, 'x-v1-csrf': 'forged' })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp5e-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('runtime-required');
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
  const routeUI = async (route: any) => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/')) return route.continue();
    const response = await fetch(`${uiOrigin}${url.pathname}${url.search}`);
    await route.fulfill({ status: response.status, headers: Object.fromEntries(response.headers), body: Buffer.from(await response.arrayBuffer()) });
  };
  await browserContext.route(`${origin}/**`, routeUI);
  await page.goto(origin);
  await page.getByLabel('Development identity', { exact: true }).selectOption(developmentUsers[2].email);
  await page.locator('[data-app="wp5e-created"]').first().click();
  await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  const workspace = page.getByRole('region', { name: 'Application Builder workspace' });
  const reportRoot = path.resolve('docs/architecture/evidence/builder-v1-wp5-e', `browser-${Date.now()}`); await mkdir(reportRoot, { recursive: true });
  const sideEffects: string[] = [];
  page.on('request', (request: any) => { if (request.method() === 'POST' && /\/(datasets\/(apply|connect)|form-tests|publish|rollback|composition-asset|execute)(?:[/?]|$)/.test(new URL(request.url()).pathname)) sideEffects.push(request.url()); });
  cleanup.push(async () => { if (!page.isClosed()) { await page.screenshot({ path: path.join(reportRoot, 'final-or-failure.png'), fullPage: true }); await writeFile(path.join(reportRoot, 'final-or-failure.txt'), await page.locator('body').innerText() + '\nSERVER\n' + output); } });
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); await adminContext.route(`${origin}/**`, routeUI);
  const adminPage = await adminContext.newPage(); adminPage.setDefaultTimeout(15000);
  await adminPage.goto(origin); await adminPage.getByLabel('Development identity', { exact: true }).selectOption(developmentUsers[1].email);
  await adminPage.locator('uib-menuitem[name=settings]').click();
  await adminPage.getByLabel('Autosave delay in seconds').waitFor();
  await expect.poll(() => adminPage.getByLabel('Autosave delay in seconds').inputValue()).toBe('2.00');
  const configure = async (enabled: boolean, seconds: string) => {
    await adminPage.getByLabel('Enable autosave').setChecked(enabled); await adminPage.getByLabel('Autosave delay in seconds').fill(seconds);
    const response = adminPage.waitForResponse((r: any) => r.url().endsWith('/api/platform/settings') && r.request().method() === 'PUT');
    await adminPage.getByRole('button', { name: 'Save settings', exact: true }).click(); const result = await response; expect(result.status(), await result.text()).toBe(200);
  };
  await adminPage.getByLabel('Autosave delay in seconds').fill('0.101'); await adminPage.getByRole('button', { name: 'Save settings', exact: true }).click();
  await adminPage.getByText('Enter seconds using at most two decimal places.', { exact: true }).waitFor();
  await configure(false, '0.25');
  await adminPage.screenshot({ path: path.join(reportRoot, 'administrator-disabled.png'), fullPage: true });
  await adminPage.reload(); await adminPage.locator('uib-menuitem[name=settings]').click();
  await expect.poll(() => adminPage.getByLabel('Autosave delay in seconds').inputValue()).toBe('0.25'); expect(await adminPage.getByLabel('Enable autosave').isChecked()).toBe(false);
  // Nonadministrator sees the same Platform preference but cannot edit it.
  const reader = await browserContext.newPage(); await reader.goto(origin); await reader.locator('uib-menuitem[name=settings]').click();
  await expect.poll(() => reader.getByLabel('Autosave delay in seconds').isDisabled()).toBe(true);
  await expect.poll(() => reader.getByLabel('Autosave delay in seconds').inputValue()).toBe('0.25');
  await reader.screenshot({ path: path.join(reportRoot, 'nonadministrator-readonly.png'), fullPage: true });
  const createPage = async (name: string) => {
    await workspace.locator('header').getByRole('button', { name: 'Create Page', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Create Page' }); await dialog.getByLabel('Artifact name').fill(name); await dialog.getByLabel('Page route').fill('/' + name);
    const response = page.waitForResponse((r: any) => r.url().endsWith('/visual-pages') && r.request().method() === 'POST');
    await dialog.getByRole('button', { name: 'Create', exact: true }).click(); const result = await response, value = await result.json(); expect(result.status(), JSON.stringify(value) + output).toBe(201);
    await expect.poll(() => workspace.getByRole('tab', { name: value.metadata.displayName, exact: true }).getAttribute('aria-selected'), { timeout: 30000 }).toBe('true');
    return value;
  };
  const first = await createPage('wp5e-first'); await workspace.locator('[data-file]').selectOption('css'); await workspace.locator('[data-source]').fill('.wp5e-first { color: red; }');
  await createPage('wp5e-second'); await workspace.locator('[data-file]').selectOption('css'); await workspace.locator('[data-source]').fill('.wp5e-second { color: blue; }');
  const appRoot = path.join(apps, 'wp5e-created'), firstCss = path.join(appRoot, 'src/pages/wp5e-first/page.css'), secondCss = path.join(appRoot, 'src/pages/wp5e-second/page.css');
  expect(await readFile(firstCss, 'utf8')).not.toContain('.wp5e-first'); expect(await readFile(secondCss, 'utf8')).not.toContain('.wp5e-second');
  await page.screenshot({ path: path.join(reportRoot, 'multiple-dirty-tabs.png'), fullPage: true });
  const explicit = page.waitForResponse((r: any) => r.url().includes('/visual-pages?') && r.request().method() === 'PUT');
  await workspace.getByRole('button', { name: 'Save Now', exact: true }).click(); const explicitResponse = await explicit; expect(explicitResponse.status(), await explicitResponse.text()).toBe(200);
  expect(await readFile(firstCss, 'utf8')).not.toContain('.wp5e-first'); expect(await readFile(secondCss, 'utf8')).toContain('.wp5e-second');
  await workspace.getByRole('tab', { name: first.metadata.displayName + ' •', exact: true }).click();
  expect(await workspace.locator('[data-source]').inputValue()).toContain('.wp5e-first');
  await workspace.getByRole('button', { name: 'Undo', exact: true }).click(); expect(await workspace.locator('[data-source]').inputValue()).not.toContain('.wp5e-first');
  await workspace.getByRole('button', { name: 'Redo', exact: true }).click(); expect(await workspace.locator('[data-source]').inputValue()).toContain('.wp5e-first');
  await configure(true, '0.25'); await expect.poll(() => readFile(firstCss, 'utf8'), { timeout: 15000 }).toContain('.wp5e-first');
  await configure(false, '2.00');
  await workspace.locator('[data-source]').fill('.wp5e-first { color: red; } .retained-unrelated { color: green; }');
  // Two independently invalid saved types are set up explicitly; diagnosis and correction are real UI actions.
  const createdDataset = page.waitForResponse((r: any) => r.url().endsWith('/datasets/create'));
  page.once('dialog', (dialog: any) => dialog.accept('WP5-E Records')); await workspace.getByRole('button', { name: 'Create Dataset', exact: true }).click();
  const datasetId = (await (await createdDataset).json()).manifest.artifactId;
  await workspace.getByLabel('Generic Artifact Editor', { exact: true }).waitFor();
  const datasetFile = path.join(appRoot, 'datasets', datasetId, 'dataset.json'), originalDataset = await readFile(datasetFile, 'utf8');
  const badDataset = JSON.parse(originalDataset); badDataset.fields[0].type = ''; await writeFile(datasetFile, JSON.stringify(badDataset));
  const visualFile = path.join(appRoot, 'src/pages/wp5e-second/page.html'), originalVisual = await readFile(visualFile, 'utf8');
  await writeFile(visualFile, originalVisual.replace('>', '><div data-uip-node="wp5e-invalid-node" data-uip-component="missing-component"></div>'));
  const validation = page.waitForResponse((r: any) => r.url().includes('/builder-workspace/validate'));
  await workspace.getByRole('button', { name: 'Validate Application', exact: true }).click(); const validated = await validation, report = await validated.json();
  await writeFile(path.join(reportRoot, 'initial-problems.json'), JSON.stringify(report, null, 2));
  expect(validated.status(), JSON.stringify(report) + output).toBe(200);
  const problems = workspace.getByRole('region', { name: 'Application Problems' });
  await expect.poll(() => problems.textContent(), { timeout: 30000 }).toContain('saved-source validation');
  expect(report.diagnostics.some((d: any) => d.subsystem === 'generic' && d.severity === 'error')).toBe(true);
  expect(report.diagnostics.some((d: any) => d.subsystem === 'visual' && d.severity === 'error')).toBe(true);
  await page.screenshot({ path: path.join(reportRoot, 'multiple-independent-problems.png'), fullPage: true });
  const visualProblem = report.diagnostics.find((d: any) => d.subsystem === 'visual' && d.target?.node === 'wp5e-invalid-node');
  expect(visualProblem).toBeTruthy(); await problems.getByRole('button').filter({ hasText: visualProblem.message }).first().click();
  await expect.poll(() => workspace.getByLabel('Visual node', { exact: true }).inputValue()).toBe('wp5e-invalid-node');
  await page.screenshot({ path: path.join(reportRoot, 'problem-exact-node-navigation.png'), fullPage: true });
  const datasetProblem = report.diagnostics.find((d: any) => d.subsystem === 'generic' && d.target?.identity.id === datasetId); expect(datasetProblem).toBeTruthy();
  await problems.getByRole('button').filter({ hasText: datasetProblem.message }).first().click();
  const editor = workspace.getByLabel('Generic Artifact Editor', { exact: true }); await editor.getByRole('tab', { name: 'Source', exact: true }).click(); await editor.getByLabel('Source file').selectOption('dataset.json');
  await editor.getByLabel('Source for dataset.json', { exact: true }).fill(originalDataset);
  const refreshed = page.waitForResponse((r: any) => r.url().includes('/builder-workspace/validate') && !r.url().includes('full=1'));
  await editor.getByRole('button', { name: 'Save now', exact: true }).click();
  const fresh = await (await refreshed).json(); expect(fresh.diagnostics.some((d: any) => d.subsystem === 'generic' && d.target?.identity.id === datasetId && d.severity === 'error')).toBe(false);
  expect(fresh.diagnostics.some((d: any) => d.subsystem === 'visual' && d.severity === 'error')).toBe(true);
  expect(await readFile(firstCss, 'utf8')).not.toContain('.retained-unrelated');
  await workspace.getByRole('tab', { name: first.metadata.displayName + ' •', exact: true }).click();
  expect(await workspace.locator('[data-source]').inputValue()).toContain('.retained-unrelated');
  await page.screenshot({ path: path.join(reportRoot, 'dependency-refresh-after-save.png'), fullPage: true });
  // Invalid settings are reported and retained verbatim; operator restoration resumes the same stream.
  const settingsFile = path.join(runtime, 'platform.settings.json'), validSettings = await readFile(settingsFile, 'utf8');
  await writeFile(settingsFile, '{invalid retained');
  await expect.poll(() => page.locator('[data-platform-settings-problem]').textContent()).toContain('invalid or unreadable');
  expect(await readFile(settingsFile, 'utf8')).toBe('{invalid retained');
  await writeFile(settingsFile, validSettings); await expect.poll(() => page.locator('[data-platform-settings-problem]').isHidden()).toBe(true);
  // Server boundary rejects legacy writes, including non-UI direct requests.
  const legacy = await page.evaluate(async () => { const session = await fetch('/api/editor/session').then(r => r.json()); const response = await fetch('/api/apps/wp5e-created/page?source=src/pages/index.ts', { method: 'PUT', headers: { 'content-type': 'application/json', 'x-editor-revision': session.revision, 'x-editor-csrf': session.csrfToken }, body: JSON.stringify({ source: 'overwrite' }) }); return { status: response.status, value: await response.json() }; });
  expect(legacy.status).toBe(405); expect(legacy.value.code).toBe('LEGACY_PAGE_READ_ONLY');
  const rejected = await adminPage.evaluate(async () => {
    const session = await fetch('/api/editor/session').then(r => r.json()), current = await fetch('/api/platform/settings', { headers: { 'x-editor-revision': session.revision } }).then(r => r.json());
    const put = (headers: Record<string, string>, expectedRevision: string) => fetch('/api/platform/settings', { method: 'PUT', headers: { 'content-type': 'application/json', 'x-editor-revision': session.revision, ...headers }, body: JSON.stringify({ settings: current.settings, expectedRevision }) }).then(r => r.status);
    return { csrf: await put({ 'x-editor-csrf': 'wrong' }, current.revision), stale: await put({ 'x-editor-csrf': session.csrfToken }, 'stale') };
  }); expect(rejected).toEqual({ csrf: 403, stale: 409 });
  await activate(applicationId, [{ ...assignment, endsAt: '2026-10-17T00:00:00Z' }]);
  await expect.poll(() => problems.getByRole('button').count(), { timeout: 15000 }).toBe(0);
  const revoked = await page.evaluate(async () => { const session = await fetch('/api/editor/session').then(r => r.json()); const response = await fetch('/api/apps/wp5e-created/builder-workspace/validate?full=1', { headers: { 'x-editor-revision': session.revision } }); return { status: response.status, body: await response.text() }; });
  expect(revoked.status).toBe(403); expect(revoked.body).not.toContain(datasetId); expect(revoked.body).not.toContain('missing-component');
  await reader.getByLabel('Development identity', { exact: true }).selectOption(developmentUsers[3].email);
  await expect.poll(() => workspace.getByRole('tab').count()).toBeGreaterThan(0);
  await expect.poll(() => problems.getByRole('button').count(), { timeout: 10000 }).toBe(0);
  const exited = once(child, 'exit');
  if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else child.kill();
  await exited;
  await expect.poll(() => adminPage.locator('[data-platform-settings-problem]').isHidden(), { timeout: 10000 }).toBe(false);
  child = launchServer(); child.stdout!.on('data', bytes => { output += String(bytes); }); child.stderr!.on('data', bytes => { output += String(bytes); });
  await expect.poll(() => fetch(origin + '/api/health').then(r => r.ok).catch(() => false), { timeout: 20000 }).toBe(true);
  await adminPage.reload(); await adminPage.getByLabel('Development identity', { exact: true }).selectOption(developmentUsers[1].email); await adminPage.locator('uib-menuitem[name=settings]').click();
  await expect.poll(() => adminPage.getByLabel('Autosave delay in seconds').inputValue()).toBe('2.00'); expect(await adminPage.getByLabel('Enable autosave').isChecked()).toBe(false);
  await adminPage.screenshot({ path: path.join(reportRoot, 'restart-persisted-disabled.png'), fullPage: true });
  expect(browserErrors).toEqual([]);
  expect(sideEffects).toEqual([]);
  await writeFile(path.join(reportRoot, 'verification.json'), JSON.stringify({ defaults: true, administratorSettings: true, nonadministratorReadonly: true, invalidPrecisionRejected: true, reloadPersistence: true, multipleDirtyEditors: true, explicitDisabledSave: true, undoRedo: true, enabledDirtySave: true, multipleIndependentProblems: true, exactNodeNavigation: true, savedRefresh: true, invalidSettingsRetainedAndRestored: true, legacyHttp405: true, csrf403: true, stale409: true, identityChangeHidesProblems: true, revokedDiagnosticsDenied: true, processRestartPersistenceAndReconnect: true, browserErrors }, null, 2));
}, 600000);
