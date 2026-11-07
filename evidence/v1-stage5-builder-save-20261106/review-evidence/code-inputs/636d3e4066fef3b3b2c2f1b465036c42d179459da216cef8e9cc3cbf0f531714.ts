import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile, cp, lstat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn, execFileSync, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { createServer, type Server } from 'node:http';
import { randomUUID, createHash } from 'node:crypto';
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
const editorPermissions = ['ui.package.admin', 'ui.package.view', 'ui.presentation.admin', 'ui.presentation.view', 'ui.presentation.edit', 'ui.artifact.view', 'ui.artifact.edit', 'ui.artifact.admin', 'ui.application.view', 'ui.application.edit', 'ui.page.view', 'ui.page.edit'];

it('Stage 3: browser File reaches protected application transport', async () => {
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
  const child: ChildProcess = spawn(process.execPath, ['--import', './scripts/test-loopback-only.mjs', '--import', 'tsx', 'src/server/index.ts'], { windowsHide: true, cwd: process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT ?? process.cwd(),
    env: { ...process.env, NODE_ENV: 'development', UI_PLATFORM_WP4_TRACE: '1', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '1', UI_PLATFORM_BUILDER_WP0: '1',
      UI_PLATFORM_V1_POLICY_STORE: policyPath, UI_APPS_DIR: apps, UI_RUNTIME_DIR: runtime, UI_PLATFORM_BUILDER_HOSTS_FILE: hostsFile,
      UI_TEMPLATES_DIR: path.resolve('../templates'), UI_PLATFORM_API_PORT: String(port), UI_PLATFORM_UI_PORT: String(port), npm_config_offline: 'true' }, stdio: ['ignore', 'pipe', 'pipe'] });
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
  if(process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT){
    const moduleRoot=path.join(apps,'wp5c-created','node_modules','@ui-base');
    const inputs=JSON.parse(await readFile('evidence/v1-stage3-physical-20261105/package-closure.json','utf8'));
    for(const input of inputs){const destination=path.join(moduleRoot,input.name.slice(9));if(!path.resolve(destination).startsWith(path.resolve(apps)+path.sep))throw Error('Outside disposable apps');const stat=await lstat(destination).catch(()=>undefined);if(stat?.isSymbolicLink())await rm(destination,{recursive:true,force:true});else if(stat)throw Error('Unexpected physical app dependency '+destination);await cp(input.destination,destination,{recursive:true,dereference:true});if((await lstat(destination)).isSymbolicLink())throw Error('Application dependency remains linked');for(const [relative,digest] of Object.entries(input.files)){expect(createHash('sha256').update(await readFile(path.join(destination,relative))).digest('hex')).toBe(digest);}}
    await writeFile('evidence/v1-stage3-physical-20261105/application-package-inputs.json',JSON.stringify(inputs.map((i:any)=>({name:i.name,version:i.version,files:i.files,destination:path.join(moduleRoot,i.name.slice(9))})),null,2));
    const enabled=await post('/api/apps/wp5c-created/packages/'+encodeURIComponent('@ui-base/ui')+'/enable',{version:'0.5.2'},creator); expect(enabled.status,JSON.stringify(enabled.value)).toBe(200);
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
  const reportRoot = path.resolve(process.env.UI_PLATFORM_TEST_EVIDENCE_ROOT ?? 'docs/architecture/evidence', 'v1-stage3-builder'); await mkdir(reportRoot, { recursive: true });
  cleanup.push(async () => { if (!page.isClosed()) { const attempt=Date.now(); await page.screenshot({path:path.join(reportRoot,`browser-attempt-${attempt}.png`),fullPage:true}); await writeFile(path.join(reportRoot,`browser-attempt-${attempt}.txt`),await page.locator('body').innerText()+'\nSERVER\n'+output); } });
  const editor = workspace.getByLabel('Generic Artifact Editor', { exact: true });

  
  await writeFile('evidence/v1-stage3-20261104/builder-start.txt',await page.locator('body').innerText());
  await workspace.getByRole('button',{name:'Create Page',exact:true}).click();
  await page.getByRole('dialog',{name:'Create Page',exact:true}).getByLabel('Page name',{exact:true}).fill('stage3-page');
  await page.getByRole('dialog',{name:'Create Page',exact:true}).getByLabel('Page route',{exact:true}).fill('/stage3');
  await page.getByRole('dialog',{name:'Create Page',exact:true}).getByLabel('Page Shell',{exact:true}).selectOption('plain');
  await page.getByRole('dialog',{name:'Create Page',exact:true}).getByRole('button',{name:'Create',exact:true}).click();
  await workspace.getByRole('button',{name:'Create Shell',exact:true}).first().click();
  await page.getByRole('dialog',{name:'Create Shell',exact:true}).getByLabel('Artifact name',{exact:true}).fill('stage3-shell');
  await page.getByRole('dialog',{name:'Create Shell',exact:true}).getByRole('button',{name:'Create',exact:true}).click();
  await writeFile('evidence/v1-stage3-20261104/builder-page.txt',await page.locator('body').innerText());
  await page.locator('uib-tabs.app-tabs > uib-tab').nth(3).click();
  const presentation=page.locator('#presentationTarget');
  await presentation.getByRole('button',{name:'Initialize Presentation',exact:true}).click();
  await writeFile('evidence/v1-stage3-20261104/presentation-start.txt',await page.locator('body').innerText());
  await presentation.getByText('Shared Application asset uploader',{exact:true}).click();
  await presentation.locator('uib-asset-uploader input[type=file]').setInputFiles({name:'stage3.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"/>')});
  await presentation.getByRole('button',{name:'Create asset',exact:true}).click();
  await expect.poll(()=>presentation.locator('[role=status]').allTextContents(),{timeout:15000}).toContain('Saved assets/images/stage3.svg.');


  const assetEndpoint=origin+'/api/apps/wp5c-created/composition-asset';
  const info=await fetch(assetEndpoint+'?info=1&path=assets/images/stage3.svg',{headers:creator}).then(r=>r.json());
  const originalBytes=await fetch(assetEndpoint+'?path=assets/images/stage3.svg',{headers:creator}).then(r=>r.text());
  expect(info.hash).toBe(createHash('sha256').update(originalBytes).digest('hex'));
  const transportHeaders={...creator}; delete (transportHeaders as any)['content-type'];
  const conflict=new FormData(); conflict.set('asset',new Blob(['conflict']), 'stage3.svg'); conflict.set('path','assets/images/stage3.svg'); conflict.set('expectedHash','stale-hash');
  const refused=await fetch(assetEndpoint,{method:'POST',headers:transportHeaders,body:conflict}); expect(refused.ok).toBe(false);
  expect(await fetch(assetEndpoint+'?path=assets/images/stage3.svg',{headers:creator}).then(r=>r.text())).toBe(originalBytes);
  page.once('dialog',(d:any)=>d.dismiss()); await presentation.getByRole('button',{name:'Create asset',exact:true}).click();
  await expect.poll(()=>presentation.locator('[role=status]').allTextContents(),{timeout:15000}).toContain('Replacement canceled. No asset changed.');
  page.once('dialog',(d:any)=>d.accept()); await presentation.getByRole('button',{name:'Create asset',exact:true}).click();
  await expect.poll(()=>presentation.locator('[role=status]').allTextContents(),{timeout:15000}).toContain('Saved assets/images/stage3.svg.');
  await writeFile('evidence/v1-stage3-20261104/protected-results.json',JSON.stringify({applicationId,info,conflictStatus:refused.status,conflictMessage:await refused.text(),unchangedAfterConflict:true,cancellation:true,explicitReplacement:true},null,2));

  const oversized=new FormData(); oversized.set('asset',new Blob([new Uint8Array(100*1024*1024+1)]),'oversized.png'); oversized.set('path','assets/images/oversized.png'); oversized.set('expectedHash','');
  const tooLarge=await fetch(assetEndpoint,{method:'POST',headers:transportHeaders,body:oversized}); expect(tooLarge.status).toBe(413);
  const absent=await fetch(assetEndpoint+'?info=1&path=assets/images/oversized.png',{headers:creator}).then(r=>r.json()); expect(absent.hash).toBeNull();
  await writeFile('evidence/v1-stage3-20261104/size-rejection.json',JSON.stringify({status:tooLarge.status,body:await tooLarge.text(),asset:absent},null,2));
  await page.screenshot({path:'evidence/v1-stage3-20261104/normal-composition-upload.png',fullPage:true});
  await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  await workspace.getByText('stage3 page',{exact:true}).first().click();
  const visual=workspace.getByLabel('Visual Artifacts',{exact:true});
  await writeFile('evidence/v1-stage3-20261104/page-controls.txt',await page.locator('body').innerText());
  const insert=workspace.getByLabel('Insert element',{exact:true});
  await expect.poll(()=>insert.locator('option').count(),{timeout:15000}).toBeGreaterThan(0);
  const opts=await insert.locator('option').evaluateAll((els:any[])=>els.map(e=>({label:e.textContent,value:e.value})));
  await writeFile('evidence/v1-stage3-20261104/insertion-options.json',JSON.stringify(opts,null,2));
  const card=opts.find((o:any)=>/card/i.test(o.label)&&/package:/.test(o.value)); expect(card).toBeDefined();
  await insert.selectOption(card.value); await workspace.getByRole('button',{name:'Insert selected item',exact:true}).click();
  await workspace.getByRole('button',{name:'Save Now',exact:true}).click();
  await expect.poll(()=>workspace.locator('[data-status]').allTextContents(),{timeout:15000}).toContain('Saved');
  for(let attempt=0;attempt<3;attempt++){
  await workspace.getByRole('button',{name:'Choose Application image for mediaSrc',exact:true}).click();
  await page.getByRole('dialog',{name:'Choose Application image',exact:true}).getByLabel('Application images',{exact:true}).selectOption('assets/images/stage3.svg');
  await page.getByRole('dialog',{name:'Choose Application image',exact:true}).getByRole('button',{name:'Use selected image',exact:true}).click();
  try { await expect.poll(()=>workspace.getByLabel('Setting mediaSrc',{exact:true}).inputValue(),{timeout:5000}).toBe('assets/images/stage3.svg'); break; }
  catch(error){if(attempt===2)throw error;await workspace.getByRole('button',{name:'Save Now',exact:true}).click();}
  }
  await workspace.getByLabel('Setting mediaAlt',{exact:true}).fill('Stage 3 blue image'); await workspace.getByLabel('Setting mediaAlt',{exact:true}).press('Tab');
  await workspace.getByRole('button',{name:'Save Now',exact:true}).click();
  await workspace.getByRole('button',{name:'Reload / discard editor changes',exact:true}).click();
  await expect.poll(()=>workspace.getByLabel('Setting mediaSrc',{exact:true}).inputValue(),{timeout:15000}).toBe('assets/images/stage3.svg');
  await workspace.getByRole('button',{name:'Open/Refresh saved Preview',exact:true}).click();
  const preview=page.frameLocator('iframe[title="Nonpersisting Visual Artifact design preview"]');
  await expect.poll(()=>preview.locator('img').evaluateAll((els:any[])=>els.some(e=>e.complete&&e.naturalWidth===20)),{timeout:30000}).toBe(true);
  await writeFile('evidence/v1-stage3-20261104/preview-controls.txt',await page.locator('body').innerText());
  await page.screenshot({path:'evidence/v1-stage3-20261104/page-preview.png',fullPage:true});
  const bytes=await fetch(origin+'/api/apps/wp5c-created/composition-asset?path=assets/images/stage3.svg',{headers:creator}); expect(bytes.status).toBe(200); expect(await bytes.text()).toContain('<svg');
  expect((await fetch(origin+'/api/apps/wp5c-other/composition-asset?info=1&path=assets/images/stage3.svg',{headers:creator})).status).toBe(403);
  const denied=await fetch(origin+'/api/apps/wp5c-created/composition-asset?info=1&path=assets/images/stage3.svg',{headers:unrelated}); expect(denied.status).toBe(403);

  await page.locator('uib-tabs.app-tabs > uib-tab').nth(3).click();
  page.once('dialog',async(d:any)=>{await writeFile('evidence/v1-stage3-20261104/publish-refusal.txt',d.message());await d.accept();});
  const publishResponse=page.waitForResponse((r:any)=>r.url().endsWith('/presentation/publish'));
  await presentation.getByRole('button',{name:'Publish Changes',exact:true}).click();
  const pr=await publishResponse; await writeFile('evidence/v1-stage3-20261104/publish-response.json',JSON.stringify({status:pr.status(),body:await pr.text()},null,2));
  if(pr.ok()) await expect.poll(()=>presentation.locator('.presentation-version').textContent(),{timeout:30000}).toContain('v1 active');
  const published=await fetch(origin+'/api/apps/wp5c-created/presentation',{headers:creator}).then(r=>r.json());
  await writeFile('evidence/v1-stage3-20261104/published.json',JSON.stringify(published,null,2));

  expect(pr.status(),await pr.text()).toBe(200); page.removeAllListeners('dialog');
  const snapshot=(v:number)=>path.join(apps,'wp5c-created','presentation','versions','v'+v,'composition','assets','images','stage3.svg');
  expect(await readFile(snapshot(1),'utf8')).toBe(originalBytes);
  await presentation.getByText('Shared Application asset uploader',{exact:true}).click();
  await presentation.locator('uib-asset-uploader input[type=file]').setInputFiles({name:'stage3.svg',mimeType:'image/svg+xml',buffer:Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"/>')});
  page.once('dialog',(d:any)=>d.accept()); await presentation.getByRole('button',{name:'Create asset',exact:true}).click();
  await expect.poll(()=>presentation.locator('[role=status]').allTextContents(),{timeout:15000}).toContain('Saved assets/images/stage3.svg.');
  const replacement=await fetch(assetEndpoint+'?path=assets/images/stage3.svg',{headers:creator}).then(r=>r.text()); expect(replacement).not.toBe(originalBytes); expect(await readFile(snapshot(1),'utf8')).toBe(originalBytes);
  await presentation.getByRole('button',{name:'Publish Changes',exact:true}).click();
  await expect.poll(()=>presentation.locator('.presentation-version').textContent(),{timeout:30000}).toContain('v2 active');
  expect(await readFile(snapshot(2),'utf8')).toBe(replacement);
  const rollback=await post('/api/apps/wp5c-created/presentation/rollback',{version:1},creator);
  await writeFile('evidence/v1-stage3-physical-20261105/rollback.json',JSON.stringify(rollback,null,2)); expect(rollback.status).toBe(200);
  expect(await fetch(assetEndpoint+'?path=assets/images/stage3.svg',{headers:creator}).then(r=>r.text())).toBe(originalBytes);
  await presentation.getByRole('button',{name:'Publish Changes',exact:true}).click();
  await expect.poll(()=>presentation.locator('.presentation-version').textContent(),{timeout:30000}).toContain('v3 active'); expect(await readFile(snapshot(3),'utf8')).toBe(originalBytes);
  await writeFile('evidence/v1-stage3-physical-20261105/frozen-bytes.json',JSON.stringify({v1:createHash('sha256').update(await readFile(snapshot(1))).digest('hex'),v2:createHash('sha256').update(await readFile(snapshot(2))).digest('hex'),v3:createHash('sha256').update(await readFile(snapshot(3))).digest('hex'),rollback:'restored v1 to draft then explicitly published v3'},null,2));

  await activate(applicationId,[{...assignment,endsAt:'2026-01-02T00:00:00Z'}]);
  const revoked=await fetch(assetEndpoint+'?info=1&path=assets/images/stage3.svg',{headers:creator}); expect(revoked.status).toBe(403);
  await writeFile('evidence/v1-stage3-20261104/revocation.json',JSON.stringify({status:revoked.status,body:await revoked.text()},null,2));
  expect(pr.status(), 'A2 publication boundary: '+await pr.text()).toBe(200);
  await mkdir('evidence/v1-stage3-20261104',{recursive:true}); await page.screenshot({path:'evidence/v1-stage3-20261104/protected-upload.png',fullPage:true});
},240000);

