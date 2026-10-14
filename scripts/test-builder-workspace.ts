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
  await workspace.getByRole('navigation', { name: 'Application artifacts' }).getByRole('button', { name: 'Customer Reference Page', exact: false }).first().waitFor();
  const discovered: WorkspaceArtifact[] = await page.evaluate(async key => {
    const session = await fetch('/api/editor/session').then(r => r.json());
    return fetch(`/api/apps/${key}/builder-workspace`, { headers: { 'x-editor-revision': session.revision } }).then(r => r.json());
  }, appKey);
  assert(Array.isArray(discovered), JSON.stringify(discovered));
  const visual = discovered.find(item => item.kind === 'page' && item.identity.format === 'visual')!;
  const dataset = discovered.find(item => item.identity.id === 'wp1-dataset')!;
  const form = discovered.find(item => item.componentId === formMetadata.componentId)!;
  assert(visual && dataset && form, JSON.stringify(discovered));
  const open = (item: WorkspaceArtifact) => workspace.locator('nav button').filter({ hasText: item.name }).first().click();
  await open(visual); await workspace.getByLabel('Visual node', { exact: true }).selectOption('wp1-form-instance');
  await workspace.getByRole('button', { name: 'Edit Definition', exact: true }).click();
  await workspace.getByRole('tab', { name: form.name, exact: true }).waitFor();
  assert.equal(await workspace.locator('[data-stage] > article').count(), 1);
  await workspace.getByRole('tab', { name: visual.name, exact: true }).click();
  assert.equal(await workspace.getByLabel('Visual node', { exact: true }).inputValue(), 'wp1-form-instance');
  await workspace.getByLabel('Visual source file', { exact: true }).selectOption('css');
  const draft = '/* WP1 retained unsaved draft */\n'; await workspace.getByLabel('Visual source', { exact: true }).fill(draft);
  let writes = 0; page.on('request', (request: any) => { if (['PUT', 'DELETE'].includes(request.method())) writes++; });
  await open(dataset); await workspace.getByLabel('Generic Artifact Editor', { exact: true }).waitFor();
  await workspace.getByRole('tab', { name: visual.name, exact: false }).click();
  assert.equal(await workspace.getByLabel('Visual source file', { exact: true }).inputValue(), 'css');
  assert.equal(await workspace.getByLabel('Visual source', { exact: true }).inputValue(), draft);
  assert.equal(await workspace.getByLabel('Visual node', { exact: true }).inputValue(), 'wp1-form-instance');
  assert.equal(await workspace.getByRole('tab', { name: visual.name, exact: false }).count(), 1);
  await workspace.getByRole('button', { name: `Close ${dataset.name}`, exact: true }).click();
  assert.equal(await workspace.getByLabel('Visual source', { exact: true }).inputValue(), draft); assert.equal(writes, 0);
  pass('Normal management entry: real Visual Page → generic Dataset → Page retains node, CSS section and unsaved source; independent Dataset close; zero switching writes');
  await open(form); await workspace.getByLabel('Visual source file', { exact: true }).selectOption('metadata');
  await workspace.getByLabel('Visual source', { exact: true }).fill('{ invalid form metadata');
  await workspace.getByRole('tab', { name: visual.name, exact: false }).click(); await open(form);
  assert.equal(await workspace.getByLabel('Visual source', { exact: true }).inputValue(), '{ invalid form metadata');
  page.once('dialog', (dialog: any) => dialog.dismiss()); await workspace.getByRole('button', { name: `Close ${form.name}`, exact: true }).click();
  assert.equal(await workspace.getByRole('tab', { name: form.name, exact: false }).count(), 1);
  pass('Edit Definition opens the real shared Form Component editor; one permanent identity; invalid metadata survives switching and guarded close');
  const denied = await page.evaluate(async ({ key, identity }) => {
    const session = await fetch('/api/editor/session').then(r => r.json());
    const results: number[] = [];
    for (const [body, extra] of [
      [{ identity: { ...identity, id: 'unknown-permanent-id' } }, {}], [{ identity: { ...identity, owner: { kind: 'application', id: 'forged-owner' } } }, {}],
      [{ identity }, { 'x-editor-revision': 'forged' }], [{ identity }, { 'x-editor-csrf': 'forged' }],
    ] as Array<[unknown, Record<string, string>]>) results.push((await fetch(`/api/apps/${key}/builder-workspace/authorize`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-editor-revision': session.revision, 'x-editor-csrf': session.csrfToken, ...extra }, body: JSON.stringify(body) })).status);
    return results;
  }, { key: appKey, identity: visual.identity }); assert.deepEqual(denied, [403, 403, 403, 403]);
  pass('Real authorization route rejects unknown identity, forged owner, stale revision and forged CSRF');
  await page.getByLabel('Development identity', { exact: true }).selectOption(developmentUsers[3].email);
  await page.locator(`[data-app="${appKey}"]`).first().click(); await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  assert.equal(await workspace.getByLabel('Visual source', { exact: true }).count(), 0);
  await workspace.getByRole('tab', { name: 'Suspended artifact', exact: true }).first().click();
  await workspace.getByText('Workspace access denied.', { exact: false }).waitFor();
  assert.equal(await workspace.getByLabel('Visual source', { exact: true }).count(), 0);
  await page.getByLabel('Development identity', { exact: true }).selectOption(developmentUsers[0].email);
  await page.locator(`[data-app="${appKey}"]`).first().click(); await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  await open(visual); assert.equal(await workspace.getByLabel('Visual source', { exact: true }).inputValue(), draft);
  pass('Identity change suspends retained editors without a reload; denied identity cannot expose cached source; original-author reauthorization recovers the Page draft');
  await cp(app, path.join(apps, 'unregistered-owner'), { recursive: true });
  const unknownOwner = await page.evaluate(async ({ key, identity }) => {
    const session = await fetch('/api/editor/session').then(r => r.json());
    return (await fetch(`/api/apps/${key}/builder-workspace/authorize`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-editor-revision': session.revision, 'x-editor-csrf': session.csrfToken }, body: JSON.stringify({ identity }) })).status;
  }, { key: 'unregistered-owner', identity: visual.identity });
  assert.equal(unknownOwner, 403); pass('Copied Application source cannot impersonate authoritative WP0 Application registration');
  await open(form);
  await workspace.getByLabel('Visual source', { exact: true }).waitFor();
  assert.equal(await workspace.getByLabel('Visual source', { exact: true }).inputValue(), '{ invalid form metadata');
  const revocationStore = new SecurityDefinitionStore(policyPath);
  const prior = revocationStore.documents().find(document => document.definition.id === 'wp1.component-assignment')!;
  const revokeRevision = revocationStore.revision(); revocationStore.close();
  const revoked = await post('/api/platform/security/stage', { changes: [{ document: { ...prior, definition: { ...prior.definition, status: 'inactive' } }, expectedChecksum: securityChecksum(prior) }], expectedRevision: revokeRevision, reason: 'WP1 focused Component revocation verification' });
  assert.deepEqual(revoked.diagnostics, []);
  assert.equal((await post('/api/platform/security/activate', { candidateId: revoked.id, checksum: revoked.checksum, expectedRevision: revoked.baseRevision, reason: 'WP1 focused Component revocation verification' })).status, 'activated');
  await page.waitForFunction(() => document.querySelector('.builder-workspace [data-stage]')?.childElementCount === 0);
  assert.equal(await workspace.getByLabel('Visual source', { exact: true }).count(), 0);
  await workspace.getByRole('button', { name: 'Refresh artifacts', exact: true }).click();
  await open(visual); assert.equal(await workspace.getByLabel('Visual source', { exact: true }).inputValue(), draft);
  pass('Durable administration revokes Component authority during focus; source quarantined; unrelated authorized Page draft recovers');
  assert.equal(writes, 0); assert.deepEqual(errors, []);
  const evidence = process.env.UI_BUILDER_WP1_EVIDENCE;
  if (evidence) { await mkdir(evidence, { recursive: true }); await page.screenshot({ path: path.join(evidence, 'workspace-retained-page.png'), fullPage: true }); await writeFile(path.join(evidence, 'browser-results.json'), JSON.stringify({ passed: report, sourceWritesDuringSwitching: writes, pageErrors: errors, visualIdentity: workspaceIdentityKey(visual.identity), formIdentity: workspaceIdentityKey(form.identity) }, null, 2)); }
} finally {
  await browser?.close(); await vite?.close();
  if (child && child.exitCode === null && child.signalCode === null) { const stopped = once(child, 'exit'); if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else child.kill(); await stopped; }
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
