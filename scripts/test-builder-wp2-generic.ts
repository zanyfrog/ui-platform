import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { createServer as httpServer } from 'node:http';
import { createServer } from 'vite';
import { ensureV1DevelopmentApplication } from '../src/server/v1-development-app.js';
import { V1DevelopmentIdentity } from '../src/server/v1-development-identity.js';
import { developmentUsers, V1_FIXTURE_APPLICATION_KEY as appKey, V1_FIXTURE_APPLICATION_ID as appId } from '../src/server/v1-development-policy.js';
import { developmentSecurityConfiguration, developmentSecurityScopes } from '../src/server/v1-security-administration.js';
import { initializeDevelopmentPlatformSecurity } from '@ui-platform/i-am/administration';
import { SecurityDefinitionService, SecurityDefinitionStore, securityChecksum, type SecurityRecord } from '@ui-platform/i-am/definitions';
import { workspaceIdentityKey, type WorkspaceArtifact } from '../src/shared/builder-workspace.js';

const playwright = createRequire(path.resolve('../ui-base/package.json'))('playwright');
process.env.NODE_ENV = 'development';
const root = await mkdtemp(path.join(tmpdir(), 'builder-wp1-browser-')), apps = path.join(root, 'apps'), policyPath = path.join(root, 'policy.sqlite');
const report: string[] = []; const pass = (message: string) => { report.push(message); console.log(`PASS: ${message}`); };
let browser: any, vite: Awaited<ReturnType<typeof createServer>> | undefined, child: ReturnType<typeof spawn> | undefined;
try {
  await ensureV1DevelopmentApplication(apps);
  const app = path.join(apps, appKey);
  await cp('references/visual-artifacts/src/pages/customers', path.join(app, 'src/pages/customers'), { recursive: true });
  const formMetadata = JSON.parse(await readFile('components/person-form/component.visual.json', 'utf8'));
  const pageSourceFile = path.join(app, 'src/pages/customers/page.html');
  await writeFile(pageSourceFile, await readFile(pageSourceFile, 'utf8') + `\n<uip-component data-uip-node="wp1-form-instance" data-uip-component="${formMetadata.componentId}"></uip-component>\n`);
  await mkdir(path.join(app, 'dataset'));
  await writeFile(path.join(app, 'dataset/artifact.json'), JSON.stringify({ schemaVersion: 1, definitionVersion: 1, artifactId: 'wp1-dataset', artifactType: 'dataset', name: 'WP1 Dataset', files: { definition: 'dataset.json' } }));
  await writeFile(path.join(app, 'dataset/dataset.json'), '{}');
  await mkdir(path.join(app, 'wp2form'));
  await writeFile(path.join(app, 'wp2form/artifact.json'), JSON.stringify({ schemaVersion: 1, definitionVersion: 1, artifactId: 'wp2-generic-form', artifactType: 'form', name: 'WP2 Generic Form', files: { definition: 'form.json' } }));
  await writeFile(path.join(app, 'wp2form/form.json'), '{"fields":[]}');
  new V1DevelopmentIdentity({ enabled: true, environment: 'development', developmentRuntime: true, policyStorePath: policyPath, origins: ['http://localhost:5174'] }).close();
  const policy = new SecurityDefinitionStore(policyPath);
  try {
    const context = {};
    const result = await initializeDevelopmentPlatformSecurity(new SecurityDefinitionService(policy), { async verify(value) {
      assert.equal(value, context); return { operatorId: 'wp1-explicit-local-browser-operator', deploymentId: developmentSecurityConfiguration.deploymentId, strong: true as const, capabilityId: developmentSecurityConfiguration.bootstrapCapabilityId };
    } }, developmentSecurityScopes, developmentSecurityConfiguration, { context, administratorUserId: developmentUsers[1].id,
      grantablePermissionIds: ['ui.platform.component.admin'], applicationAnchors: [{ applicationId: appId, administratorUserId: developmentUsers[0].id }], expectedRevision: policy.revision(), reason: 'Explicit development browser verification setup' });
    assert.equal(result.status, 'activated', JSON.stringify(result));
  } finally { policy.close(); }
  const probe = httpServer(); await new Promise<void>(resolve => probe.listen(0, '127.0.0.1', resolve));
  const port = (probe.address() as { port: number }).port; await new Promise<void>(resolve => probe.close(() => resolve()));
  const uiProbe = httpServer(); await new Promise<void>(resolve => uiProbe.listen(0, '127.0.0.1', resolve));
  const uiPort = (uiProbe.address() as { port: number }).port; await new Promise<void>(resolve => uiProbe.close(() => resolve()));
  child = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], { windowsHide: true, env: { ...process.env,
    NODE_ENV: 'development', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '1', UI_PLATFORM_BUILDER_WP0: '1', UI_PLATFORM_V1_POLICY_STORE: policyPath,
    UI_APPS_DIR: apps, UI_RUNTIME_DIR: path.join(root, 'runtime'), UI_PLATFORM_API_PORT: String(port), UI_PLATFORM_UI_PORT: String(uiPort) }, stdio: ['ignore', 'pipe', 'pipe'] });
  let output = ''; child.stdout!.on('data', value => { output += value; }); child.stderr!.on('data', value => { output += value; });
  const apiOrigin = `http://127.0.0.1:${port}`;
  for (let attempt = 0; ; attempt++) {
    if (child.exitCode !== null) throw new Error(output);
    if (await fetch(apiOrigin + '/api/health').then(r => r.ok).catch(() => false)) break;
    if (attempt > 150) throw new Error(output); await new Promise(resolve => setTimeout(resolve, 50));
  }
  // Give the existing Application Admin explicit Component authority through the accepted administration API.
  const anonymous = await fetch(apiOrigin + '/api/development-identity/session'), session = await anonymous.json();
  const cookie = anonymous.headers.get('set-cookie')!.split(';')[0];
  const headers = { cookie, origin: apiOrigin, 'content-type': 'application/json', 'x-v1-csrf': session.csrfToken };
  assert.equal((await fetch(apiOrigin + '/api/development-identity/session', { method: 'POST', headers, body: JSON.stringify({ email: developmentUsers[1].email }) })).status, 200);
  const platform = { resource: { authorityId: 'ui-platform-development', applicationId: null, kind: 'system' as const, id: 'platform' }, descendants: true };
  const records: SecurityRecord[] = [
    { kind: 'permission-set', id: 'wp1.component-set', key: 'wp1.component-set', name: 'WP1 Component administration', owner: { kind: 'platform' }, status: 'active', includes: [], rules: [{ id: 'wp1.component-rule', permissionId: 'ui.platform.component.admin', effect: 'allow', scope: platform }] },
    { kind: 'role', id: 'wp1.component-role', key: 'wp1.component-role', name: 'WP1 Component administration', owner: { kind: 'platform' }, status: 'active', permissionSets: [{ id: 'wp1.component-set' }] },
    { kind: 'role-assignment', id: 'wp1.component-assignment', userId: developmentUsers[0].id, roleId: 'wp1.component-role', scope: platform, status: 'active', startsAt: '2020-01-01T00:00:00Z', endsAt: null },
  ];
  const post = async (route: string, body: unknown) => { const response = await fetch(apiOrigin + route, { method: 'POST', headers, body: JSON.stringify(body) }); const value = await response.json(); assert.equal(response.status, 200, JSON.stringify(value)); return value; };
  const revisionStore = new SecurityDefinitionStore(policyPath); const expectedRevision = revisionStore.revision(); revisionStore.close();
  const staged = await post('/api/platform/security/stage', { changes: records.map(definition => ({ document: { format: 'ui-platform.security', formatVersion: 1, definition } })), expectedRevision, reason: 'Explicit WP1 browser Component grant' });
  assert.deepEqual(staged.diagnostics, []);
  assert.equal((await post('/api/platform/security/activate', { candidateId: staged.id, checksum: staged.checksum, expectedRevision: staged.baseRevision, reason: 'Explicit WP1 browser Component grant' })).status, 'activated');
  vite = await createServer({ configFile: 'vite.config.ts', server: { host: '127.0.0.1', port: uiPort, strictPort: true, proxy: { '/api': { target: apiOrigin, changeOrigin: false } } } }); await vite.listen();
  browser = await playwright.chromium.launch({ headless: true, channel: 'msedge' });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = []; page.on('pageerror', (error: Error) => errors.push(error.message));
  page.on('response', (response: any) => { if (response.status() >= 400 && response.url().includes('/api/')) console.log('HTTP', response.status(), response.url()); });
  await page.goto(vite.resolvedUrls!.local[0]);
  await page.getByLabel('Development identity', { exact: true }).selectOption(developmentUsers[0].email);
  await page.locator(`[data-app="${appKey}"]`).first().click();
  await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  const workspace = page.getByRole('region', { name: 'Application Builder workspace' });
  // A section with an accessible label has a region role.
  await workspace.getByRole('navigation', { name: 'Application artifacts' }).getByRole('button', { name: 'Customer Reference Page', exact: false }).first().waitFor().catch(async error => {
    console.log('Workspace diagnostic:', await workspace.textContent().catch(() => 'not mounted'), 'Page errors:', errors, 'Server:', output); throw error;
  });
  const discovered: WorkspaceArtifact[] = await page.evaluate(async key => {
    const session = await fetch('/api/editor/session').then(r => r.json());
    return fetch(`/api/apps/${key}/builder-workspace`, { headers: { 'x-editor-revision': session.revision } }).then(r => r.json());
  }, appKey);
  assert(Array.isArray(discovered), JSON.stringify(discovered));
  const visual = discovered.find(item => item.kind === 'page' && item.identity.format === 'visual')!;
  const dataset = discovered.find(item => item.identity.id === 'wp1-dataset')!;
  const form = discovered.find(item => item.componentId === formMetadata.componentId)!;
  assert(visual && dataset && form, JSON.stringify(discovered));
  const open = async (item: WorkspaceArtifact) => {
    await workspace.locator('nav button').filter({ hasText: item.name }).first().click();
    await page.waitForFunction((name: string) => [...document.querySelectorAll('.builder-workspace [role="tab"]')].some(tab => tab.getAttribute('aria-selected') === 'true' && tab.textContent?.startsWith(name)), item.name);
  };
  let writes = 0; page.on('request', (request: any) => { if (['PUT', 'DELETE'].includes(request.method())) writes++; });
  const generic = discovered.find(item => item.identity.id === 'wp2-generic-form')!;
  assert(generic);
  await open(generic);
  const genericEditor = workspace.getByLabel('Generic Artifact Editor', { exact: true });
  await genericEditor.getByRole('tab', { name: 'Source', exact: true }).click();
  await genericEditor.getByLabel('Source file', { exact: true }).selectOption('form.json');
  const editorSource = genericEditor.getByLabel('Source for form.json', { exact: true });
  const invalidResponse = page.waitForResponse((response: any) => response.request().method() === 'PUT' && response.url().includes('/artifacts/') && response.status() === 422);
  await editorSource.fill('{');
  const invalidResult = await invalidResponse;
  await genericEditor.getByText('Changes retained locally.', { exact: false }).first().waitFor().catch(async error => {
    console.log('Validation response:', await invalidResult.json(), 'Editor:', await genericEditor.textContent(), 'Page errors:', errors); throw error;
  });
  assert.equal(await readFile(path.join(app, 'wp2form/form.json'), 'utf8'), '{"fields":[]}');
  assert((await genericEditor.textContent())!.includes('Changes retained locally.'));
  const beforeSwitch = writes;
  await open(visual);
  await open(generic);
  assert.equal(writes, beforeSwitch);
  assert.equal(await editorSource.inputValue(), '{');
  pass('WP2 generic normal autosave rejects invalid source through the real service; disk unchanged and diagnostics/draft survive switching');
  const savedResponse = page.waitForResponse((response: any) => response.request().method() === 'PUT' && response.url().includes('/artifacts/') && response.status() === 200);
  await editorSource.fill('{"fields":[],"label":"WP2 valid"}');
  await savedResponse;
  await page.waitForFunction(() => document.querySelector('.artifact-editor [role=status]')?.textContent === 'Saved');
  assert.equal(JSON.parse(await readFile(path.join(app, 'wp2form/form.json'), 'utf8')).label, 'WP2 valid');
  await genericEditor.getByRole('button', { name: 'Undo', exact: true }).click();
  assert.equal(await editorSource.inputValue(), '{');
  await open(visual);
  await open(generic);
  await genericEditor.getByRole('button', { name: 'Redo', exact: true }).click();
  assert.equal(JSON.parse(await editorSource.inputValue()).label, 'WP2 valid');
  const savedNow = page.waitForResponse((response: any) => response.request().method() === 'PUT' && response.url().includes('/artifacts/') && response.status() === 200);
  await editorSource.fill('{"fields":[],"label":"Save Now"}');
  await genericEditor.getByRole('button', { name: 'Save now', exact: true }).click();
  await savedNow;
  assert.equal(JSON.parse(await readFile(path.join(app, 'wp2form/form.json'), 'utf8')).label, 'Save Now');
  pass('WP2 generic correction autosaves after inactivity; Undo survives save, Redo survives tab switching, Save Now persists real source');
  let leaveWarnings = 0;
  page.on('dialog', async (dialog: any) => { assert.equal(dialog.type(), 'beforeunload'); leaveWarnings++; await dialog.dismiss(); });
  await editorSource.fill('{');
  await page.reload({ timeout: 5000 }).catch(() => {});
  assert.equal(leaveWarnings, 1); assert.equal(await editorSource.inputValue(), '{');
  await editorSource.fill('{"fields":[],"label":"Saved before leave"}');
  await genericEditor.getByRole('button', { name: 'Save now', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('.artifact-editor [role=status]')?.textContent === 'Saved');
  await page.reload(); assert.equal(leaveWarnings, 1);
  pass('WP2 native browser refresh warning protects an invalid local draft; successfully saved state leaves without a warning');
  // Exercise legacy adapters with their real controls and source services,
  // without starting a preview for this deliberately minimal security fixture.
  await page.evaluate(async ({ key, id }: { key: string; id: string }) => {
    const app = await fetch('/api/apps/' + key).then(r => r.json());
    const host = document.createElement('aside'); host.id = 'legacy-proof'; document.body.append(host);
    const form = document.createElement('form'); form.id = 'legacy-settings-proof'; form.innerHTML = '<label>Application name<input name="applicationName"></label>'; host.append(form);
    const input = form.querySelector('input')!;
    const { settingsSession } = await import('/src/client/artifact-editor/settings-session.ts');
    await settingsSession(app, form, () => ({ ...app.settings, application: { ...app.settings.application, name: input.value } }), value => { app.settings = value; input.value = (value as any).application.name; });
    const initialized = await fetch('/api/apps/' + key + '/presentation/initialize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    if (!initialized.ok) throw new Error(await initialized.text());
    const remote = await initialized.json();
    const { presentationSession } = await import('/src/client/artifact-editor/presentation-session.ts');
    const editing = await presentationSession(key, id, remote);
    const design = document.createElement('form'); design.id = 'legacy-design-proof'; design.innerHTML = '<label>Draft CSS<textarea name="css"></textarea></label>'; host.append(design);
    editing.bind(design, 'design', () => ({ ...editing.draft, css: design.querySelector('textarea')!.value }), value => ({ css: value.css }));
    const layout = document.createElement('form'); layout.id = 'legacy-layout-proof'; layout.innerHTML = '<label>Draft name<input name="name"></label>'; host.append(layout);
    editing.bind(layout, 'layout', () => ({ ...editing.draft, name: layout.querySelector('input')!.value }), value => ({ name: value.name }));
  }, { key: appKey, id: appId });
  const legacySettings = page.locator('#legacy-settings-proof'), legacyDesign = page.locator('#legacy-design-proof'), legacyLayout = page.locator('#legacy-layout-proof');
  const waitSaved = (selector: string) => page.waitForFunction((selector: string) => document.querySelector(selector + ' [role=status]')?.textContent?.startsWith('Saved'), selector);
  const oldSettings = JSON.parse(await readFile(path.join(app, 'app.settings.json'), 'utf8')).application.name;
  await legacySettings.getByLabel('Application name').fill('WP2 Settings Saved'); await waitSaved('#legacy-settings-proof');
  assert.equal(JSON.parse(await readFile(path.join(app, 'app.settings.json'), 'utf8')).application.name, 'WP2 Settings Saved');
  await legacySettings.getByRole('button', { name: 'Undo', exact: true }).click(); await legacySettings.getByRole('button', { name: 'Save Now', exact: true }).click(); await waitSaved('#legacy-settings-proof');
  assert.equal(JSON.parse(await readFile(path.join(app, 'app.settings.json'), 'utf8')).application.name, oldSettings);
  await legacySettings.getByRole('button', { name: 'Redo', exact: true }).click(); await waitSaved('#legacy-settings-proof');
  await legacyDesign.getByLabel('Draft CSS').fill(':root{--wp2-legacy:1}'); await waitSaved('#legacy-design-proof');
  const draftFile = path.join(app, 'presentation/draft/presentation.json');
  assert.equal(JSON.parse(await readFile(draftFile, 'utf8')).css, ':root{--wp2-legacy:1}');
  await legacyLayout.getByLabel('Draft name').fill('WP2 Layout Saved'); await waitSaved('#legacy-layout-proof');
  await legacyLayout.getByRole('button', { name: 'Undo', exact: true }).click(); await waitSaved('#legacy-layout-proof');
  assert.equal(JSON.parse(await readFile(draftFile, 'utf8')).css, ':root{--wp2-legacy:1}');
  await legacyLayout.getByRole('button', { name: 'Redo', exact: true }).click(); await waitSaved('#legacy-layout-proof');
  assert.equal(JSON.parse(await readFile(draftFile, 'utf8')).name, 'WP2 Layout Saved');
  pass('Legacy Application settings and presentation design/layout adapters use real common controls, validated services and retained independent Undo/Redo');
  assert.deepEqual(errors, []);
  for (const fixture of ['editor-shell', 'editor-properties', 'editor-route']) {
    const harness = await browser.newPage();
    await harness.goto(`${vite.resolvedUrls!.local[0]}tests/browser/${fixture}.html`);
    await harness.waitForFunction(() => document.body.dataset.result, { timeout: 30000 });
    const result = await harness.locator('body').getAttribute('data-result');
    assert.equal(result, 'passed', await harness.locator('#results').innerText());
    pass(`Existing ${fixture} browser presentation harness passes (deterministic transport; separate from real-service proof)`);
    await harness.close();
  }
  const evidence = process.env.UI_BUILDER_WP2_EVIDENCE;
  if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: path.join(evidence, 'workspace-retained-page.png'), fullPage: true }); await writeFile(path.join(evidence, 'browser-results.json'), JSON.stringify({ passed: report, sourceWritesIncludingWP2Editing: writes, pageErrors: errors, visualIdentity: workspaceIdentityKey(visual.identity), formIdentity: workspaceIdentityKey(form.identity) }, null, 2)); }
} finally {
  await browser?.close(); await vite?.close();
  if (child && child.exitCode === null && child.signalCode === null) { const stopped = once(child, 'exit'); if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else child.kill(); await stopped; }
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}


