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

it('WP5-D: actual Builder nested Menus, route parameters and portable branding in Public/Admin Shells', async () => {
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
    const route = applicationId === null ? '/api/platform/security' : `/api/apps/wp5d-created/security`;
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
  const created = await post('/api/apps', { key: 'wp5d-created', name: 'WP4 Dataset Application', templateId: 'standard' }, creator);
  expect(created.status, JSON.stringify(created.value) + output).toBe(201);
  const applicationId = created.value.appId as string;
  expect(applicationId).toMatch(/^[a-f0-9-]{36}$/);
  const second = await post('/api/apps', { key: 'wp5d-other', name: 'WP4 Other Application', templateId: 'standard' }, creator);
  expect(second.status).toBe(201); expect(second.value.appId).not.toBe(applicationId);
  expect((await fetch(origin + '/api/apps/wp5d-other', { headers: creator })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp5d-created', { headers: creator })).status).toBe(403);
  expect((await post('/api/apps/wp5d-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Unauthorized attempt' }, creator)).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp5d-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('authority-required');
  expect((await post('/api/apps/wp5d-created/onboarding', { administratorUserId: developmentUsers[0].id, reason: 'Explicit initial Application security administrator' })).value.status).toBe('activated');
  expect((await post('/api/apps/wp5d-created/security/stage', { changes: [], expectedRevision: policy.revision() }, { ...security, 'x-v1-csrf': 'forged' })).status).toBe(403);
  expect((await fetch(origin + '/api/apps/wp5d-created/onboarding', { headers: security }).then(r => r.json())).status).toBe('runtime-required');
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
  await page.locator('[data-app="wp5d-created"]').first().click();
  await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  const workspace = page.getByRole('region', { name: 'Application Builder workspace' });
  const reportRoot = path.resolve(process.env.UI_PLATFORM_TEST_EVIDENCE_ROOT ?? 'docs/architecture/evidence', 'builder-v1-wp5-d', `browser-${Date.now()}`); await mkdir(reportRoot, { recursive: true });
  const editor = workspace.getByLabel('Generic Artifact Editor', { exact: true });
  cleanup.push(async () => { if (!page.isClosed()) { const attempt = Date.now(); await page.screenshot({ path: path.join(reportRoot, `attempt-${attempt}.png`), fullPage: true }); await writeFile(path.join(reportRoot, `attempt-${attempt}.txt`), await page.locator('body').innerText() + '\nSERVER\n' + output); } });
  const appRoot = path.join(apps, 'wp5d-created');
  const readMenu = async () => JSON.parse(await readFile(path.join(appRoot, 'menus/main.json'), 'utf8'));
  const originalMenu = await readMenu();
  const open = async (name: string) => { await workspace.getByRole('navigation', { name: 'Application artifacts' }).getByRole('button', { name, exact: true }).click(); await expect.poll(() => workspace.getByRole('tab', { name, exact: true }).getAttribute('aria-selected'), { timeout: 15000 }).toBe('true'); };
  // Retain a Menu tab before creating a Page: its picker must refresh native destinations.
  await open('Main Navigation');
  const routeResponse = page.waitForResponse((r: any) => r.request().method() === 'POST' && r.url().endsWith('/visual-pages'));
  await workspace.locator('header').getByRole('button', { name: 'Create Page', exact: true }).click();
  let dialog = page.getByRole('dialog', { name: 'Create Page' }); await dialog.getByLabel('Artifact name').fill('menu-record'); await dialog.getByLabel('Page route').fill('/record/:id'); await dialog.getByRole('button', { name: 'Create', exact: true }).click();
  const routeHttp = await routeResponse, record = await routeHttp.json(); expect(routeHttp.status(), JSON.stringify(record)).toBe(201);
  await expect.poll(() => workspace.getByRole('tab', { name: record.metadata.displayName, exact: true }).getAttribute('aria-selected'), { timeout: 15000 }).toBe('true');
  await open('Main Navigation');
  const row = () => workspace.locator('[data-menu] > div > ul > li').first();
  await row().getByRole('button', { name: 'Add child', exact: true }).click(); dialog = page.getByRole('dialog', { name: 'Menu item', exact: true });
  await dialog.getByLabel('Menu item label', { exact: true }).fill('Selected record'); await dialog.getByLabel('Destination kind').selectOption('route'); await dialog.getByLabel('Page or Route destination').selectOption(record.metadata.routeId);
  await dialog.getByLabel('Parameter id source').selectOption('literal'); await dialog.getByLabel('Parameter id value').fill('chosen/42'); await dialog.getByRole('button', { name: 'Add Menu item', exact: true }).click();
  await workspace.getByRole('button', { name: 'Save Now', exact: true }).click();
  await expect.poll(async () => (await readMenu()).items[0].children?.[0]?.label, { timeout: 15000 }).toBe('Selected record');
  const childId = (await readMenu()).items[0].children[0].itemId;
  await row().locator('li').first().getByRole('button', { name: 'Edit', exact: true }).click(); dialog = page.getByRole('dialog', { name: 'Menu item', exact: true });
  await dialog.getByLabel('Menu item label', { exact: true }).fill('Record detail'); await dialog.getByRole('button', { name: 'Apply Menu item', exact: true }).click();
  await workspace.getByRole('button', { name: 'Undo', exact: true }).click(); await expect.poll(() => row().locator('li').textContent()).toContain('Selected record');
  await workspace.getByRole('button', { name: 'Redo', exact: true }).click(); await expect.poll(() => row().locator('li').textContent()).toContain('Record detail');
  await workspace.getByRole('button', { name: 'Save Now', exact: true }).click(); await expect.poll(async () => (await readMenu()).items[0].children[0].label, { timeout: 15000 }).toBe('Record detail');
  expect((await readMenu()).items[0].children[0].itemId).toBe(childId); expect((await readMenu()).items[0].itemId).toBe(originalMenu.items[0].itemId);
  const beforeCancel = await readFile(path.join(appRoot, 'menus/main.json'), 'utf8'); await workspace.getByRole('button', { name: 'Add root item', exact: true }).click(); await page.getByRole('dialog', { name: 'Menu item' }).getByRole('button', { name: 'Cancel', exact: true }).click(); expect(await readFile(path.join(appRoot, 'menus/main.json'), 'utf8')).toBe(beforeCancel);
  await page.screenshot({ path: path.join(reportRoot, 'nested-menu.png'), fullPage: true });
  // Native Menu creation is a workspace management operation, not a focused-source mutation.
  page.once('dialog', (d: any) => d.accept('Additional navigation')); await workspace.locator('header').getByRole('button', { name: 'Create Menu', exact: true }).click(); await workspace.getByRole('tab', { name: 'Additional navigation', exact: true }).waitFor();
  const assetBytes = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="48" height="32"><rect width="48" height="32" fill="#108060"/></svg>');
  await workspace.locator('header').getByRole('button', { name: 'Upload Application asset', exact: true }).click(); dialog = page.getByRole('dialog', { name: 'Upload Application asset' });
  await dialog.getByLabel('Application asset', { exact: true }).setInputFiles({ name: 'journey-logo.svg', mimeType: 'image/svg+xml', buffer: assetBytes }); await dialog.getByRole('button', { name: 'Upload asset', exact: true }).click();
  await expect.poll(async () => readFile(path.join(appRoot, 'assets/images/journey-logo.svg')).catch(() => undefined), { timeout: 15000 }).toEqual(assetBytes);
  await open('Application presentation/settings'); await workspace.getByRole('button', { name: 'Refresh asset and theme choices' }).click();
  await workspace.getByLabel('Select primaryLogo asset', { exact: true }).selectOption('assets/images/journey-logo.svg');
  await workspace.getByLabel('applicationName', { exact: true }).fill('Authored identity'); await workspace.getByLabel('shortName', { exact: true }).fill('Authored Admin');
  await workspace.getByLabel('--app-color-primary', { exact: true }).fill('#108060'); await workspace.getByLabel('Theme stylesheets', { exact: true }).selectOption(['styles/site.css']);
  await workspace.getByRole('button', { name: 'Save Now', exact: true }).click();
  await expect.poll(async () => JSON.parse(await readFile(path.join(appRoot, 'app.settings.json'), 'utf8')).presentation.theme['--app-color-primary'], { timeout: 15000 }).toBe('#108060');
  await page.screenshot({ path: path.join(reportRoot, 'portable-branding.png'), fullPage: true });
  // Existing native Shell placements consume the same Menu and branding contracts.
  const composition = await fetch(origin + '/api/apps/wp5d-created/composition', { headers: creator }).then(r => r.json());
  const adminShell = composition.shells.find((s: any) => s.metadata.name === 'admin') ?? composition.shells.find((s: any) => s.source.includes('admin_shell'));
  await open(adminShell.metadata.displayName);
  await workspace.getByLabel('Visual node', { exact: true }).selectOption('admin_sidebar');
  await workspace.getByRole('button', { name: 'Place Application Menu', exact: true }).click(); dialog = page.getByRole('dialog', { name: 'Application Menu', exact: true }); await dialog.getByLabel('Application Menu', { exact: true }).selectOption('menu-main'); await dialog.getByRole('button', { name: 'Apply selection' }).click();
  await workspace.getByLabel('Visual node', { exact: true }).selectOption('admin_sidebar'); await workspace.getByLabel('Insert element', { exact: true }).selectOption('html:img'); await workspace.getByRole('button', { name: 'Insert with layout wrapper', exact: true }).click(); await workspace.getByLabel('Application branding', { exact: true }).selectOption('primaryLogo');
  await workspace.getByRole('button', { name: 'Save Now', exact: true }).click();
  await expect.poll(async () => (await readFile(path.join(appRoot, 'shells/admin/shell.html'), 'utf8')).includes('data-uip-branding="primaryLogo"'), { timeout: 15000 }).toBe(true);
  await workspace.getByRole('button', { name: 'Reload / discard editor changes', exact: true }).click();
  // Unknown identities, invalid themes and missing assets fail through the same protected source service.
  const settingsPath = path.join(appRoot, 'app.settings.json'), settingsBefore = await readFile(settingsPath, 'utf8');
  const menuSource = await fetch(origin + '/api/apps/wp5d-created/composition-source?path=menus/main.json', { headers: creator }).then(r => r.json());
  const badMenu = JSON.parse(menuSource.content); badMenu.items[0].destination = { kind: 'page', pageId: 'art_missing' };
  const save = async (locator: string, content: string, expectedHash: string, headers = creator) => fetch(origin + '/api/apps/wp5d-created/composition-source?path=' + encodeURIComponent(locator), { method: 'PUT', headers, body: JSON.stringify({ mode: 'normal', content, expectedHash }) });
  expect((await save('menus/main.json', JSON.stringify(badMenu), menuSource.hash)).ok).toBe(false); expect(await readFile(path.join(appRoot, 'menus/main.json'), 'utf8')).toBe(beforeCancel);
  expect((await save('menus/main.json', menuSource.content, menuSource.hash, unrelated)).status).toBe(403);
  expect((await save('menus/main.json', menuSource.content, 'stale-hash')).ok).toBe(false);
  const settingsSource = await fetch(origin + '/api/apps/wp5d-created/composition-source?path=app.settings.json', { headers: creator }).then(r => r.json());
  for (const corrupt of [(s: any) => { s.presentation.theme['--app-color-primary'] = 'red;}body{'; }, (s: any) => { s.presentation.branding.primaryLogo = 'assets/images/missing.png'; }]) { const invalid = JSON.parse(settingsBefore); corrupt(invalid); expect((await save('app.settings.json', JSON.stringify(invalid), settingsSource.hash)).ok).toBe(false); }
  expect(await readFile(settingsPath, 'utf8')).toBe(settingsBefore);
  // The known D6 limitation also applies to an independent snapshot reader.
  // Quiescence is a fixture prerequisite, not a concurrent-use verification.
  await page.close(); await new Promise(resolve => setTimeout(resolve, 250));
  const { copyCompositionSnapshot } = await import('../src/server/composition-snapshots.js'); const portable = path.join(root, 'portable'); await copyCompositionSnapshot(appRoot, portable); expect(await readFile(path.join(portable, 'assets/images/journey-logo.svg'))).toEqual(assetBytes);
  expect(JSON.parse(await readFile(path.join(portable, 'menus/main.json'), 'utf8'))).toEqual(await readMenu());
  // D6 remains WP5-F. Quiesce Builder before runtime startup; no simultaneous-use claim.
  const managed = await post('/api/apps/wp5d-created/preview', {}, creator); expect(managed.status, JSON.stringify(managed.value) + output).toBe(200);
  const running = await browserContext.newPage(); running.on('pageerror', (e: Error) => browserErrors.push(e.message)); await running.goto(managed.value.url);
  const baseUrl = new URL(running.url());
  for (const [route, shell, name] of [['', 'public', 'Authored identity'], ['admin', 'admin', 'Authored Admin']]) {
    const url = new URL(baseUrl); url.pathname = url.pathname.replace(/\/?$/, '/') + route; await running.goto(url.href);
    await running.getByText(name, { exact: true }).waitFor({ timeout: 45000 });
    const link = running.getByRole('link', { name: 'Record detail', exact: true }); await expect.poll(() => link.getAttribute('href'), { timeout: 45000 }).toContain('/record/chosen%2F42');
    await expect.poll(() => running.locator('img[data-uip-branding="primaryLogo"]').evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 45000 }).toBe(true);
    await expect.poll(() => running.locator('[data-uip-node]').first().evaluate((node: HTMLElement) => getComputedStyle(node).getPropertyValue('--app-color-primary').trim())).toBe('#108060');
    await running.screenshot({ path: path.join(reportRoot, `${shell}-shell.png`), fullPage: true });
  }
  expect(browserErrors).toEqual([]);
  await writeFile(path.join(reportRoot, 'browser-acceptance.json'), JSON.stringify({ applicationId, itemId: childId, routeId: record.metadata.routeId, pageId: record.metadata.artifactId, nestedMenu: true, identityRetained: true, undoRedo: true, cancelledUnchanged: true, publicAndAdminShells: true, assetsPortable: true, staleDeniedUnknownRejected: true, builderClosedBeforeRuntime: true, simultaneousUseProven: false, nativeApplicationProvisioning: true, browserErrors }, null, 2));
}, 600_000);
