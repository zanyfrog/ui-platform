import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { generateForm } from '@ui-platform/visual-artifacts';
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
const owned: string[] = [], unique = 'wp2-proof-' + randomUUID();
const report: string[] = []; const pass = (message: string) => { report.push(message); console.log(`PASS: ${message}`); };
let browser: any, vite: Awaited<ReturnType<typeof createServer>> | undefined, child: ReturnType<typeof spawn> | undefined;
try {
  await ensureV1DevelopmentApplication(apps);
  const app = path.join(apps, appKey);
  const pageMeta = { schemaVersion: 1, artifactId: 'art_wp2_page', kind: 'page', name: 'wp2-page', displayName: 'WP2 Page', route: '/wp2', routeId: 'route_wp2_page', shellId: 'art_wp2_shell', state: { label: 'Original' }, bindings: [{ node: 'one-text', target: 'text', value: 'local.label' }] };
  const shellMeta = { schemaVersion: 1, artifactId: 'art_wp2_shell', kind: 'shell', name: 'wp2-shell', displayName: 'WP2 Shell' };
  const componentMeta = { schemaVersion: 1 as const, artifactId: 'art_' + randomUUID(), componentId: 'cmp_platform_' + randomUUID(), kind: 'component' as const, name: unique + '-component', displayName: 'WP2 Component ' + unique, public: { properties: {}, events: {}, slots: [] } };
  const formMeta = { ...componentMeta, artifactId: 'art_' + randomUUID(), componentId: 'cmp_platform_' + randomUUID(), name: unique + '-form', displayName: 'WP2 Form ' + unique };
  const writeBundle = async (directory: string, stem: string, metadata: unknown, source: string, extra: Record<string,string> = {}) => {
    await mkdir(directory, { recursive: true });
    for (const [extension, content] of Object.entries({ '.visual.json': JSON.stringify(metadata, null, 2), '.html': source, '.css': '', '.fixtures.json': '{}', '.functions.ts': 'export {};', ...extra })) await writeFile(path.join(directory, stem + extension), content);
  };
  const componentDir = path.resolve('components', componentMeta.name), formDir = path.resolve('components', formMeta.name);
  owned.push(componentDir, formDir);
  await writeBundle(componentDir, 'component', componentMeta, '<section class="uip-layout-item" data-uip-node="component-root">Component</section>');
  const generated = generateForm(formMeta, { dataset: { id: 'dataset-wp2', name: 'WP2 Dataset' }, fields: [{ id: 'wp2-id', key: 'id', type: 'id' }, { id: 'wp2-title', key: 'title', type: 'string' }] } as any);
  await writeBundle(formDir, 'component', JSON.parse(generated.metadata), generated.source, { '.css': generated.css, '.fixtures.json': generated.fixtures, '.functions.ts': generated.code });
  await writeBundle(path.join(app, 'shells/public'), 'shell', shellMeta, '<main data-uip-node="shell-main" data-uip-region="region-main"></main>');
  const pageDirectory = path.join(app, 'src/pages/wp2');
  await writeBundle(pageDirectory, 'page', pageMeta, `<main data-uip-node="content" data-uip-region="region-main"><div class="uip-layout-item" data-uip-node="one"><p data-uip-node="one-text">One</p></div><div class="uip-layout-item" data-uip-node="two">Two</div><uip-component data-uip-node="form-instance" data-uip-component="${formMeta.componentId}"></uip-component><uip-component data-uip-node="component-instance" data-uip-component="${componentMeta.componentId}"></uip-component></main>`);
  await writeFile(path.join(pageDirectory, 'index.ts'), 'export {};');
  await mkdir(path.join(app, 'menus')); await mkdir(path.join(app, 'styles')); await mkdir(path.join(app, 'assets'));
  await writeFile(path.join(app, 'menus/main.json'), JSON.stringify({ schemaVersion: 1, menuId: 'menu-wp2', name: 'WP2 Menu', items: [{ itemId: 'item-original', label: 'Original', destination: { kind: 'page', pageId: pageMeta.artifactId } }] }, null, 2));
  await writeFile(path.join(app, 'styles/site.css'), ':root{--wp2-color:blue}');
  await writeFile(path.join(app, 'app.settings.json'), JSON.stringify({ application: { name: 'WP2 Fixture', status: 'active' }, presentation: { model: 'composition-v1', defaultShellId: shellMeta.artifactId, theme: { '--app-color-primary': '#2456a6' }, siteStyles: ['styles/site.css'], branding: { applicationName: 'WP2 Fixture' }, assetsRoot: 'assets' } }, null, 2));
  for (const kind of ['trigger', 'workflow']) {
    const directory = path.resolve(kind + 's', unique); owned.push(directory); await mkdir(directory);
    await writeFile(path.join(directory, kind + '.json'), JSON.stringify({ schemaVersion: 1, kind, id: kind + '_' + randomUUID(), name: unique, displayName: 'WP2 ' + kind, enabled: false, appId, datasetId: 'dataset-wp2', primaryKey: 'id', actions: [], ...(kind === 'trigger' ? { dataset: 'people', phase: 'beforeInsert', priority: 0 } : {}) }, null, 2));
  }
  new V1DevelopmentIdentity({ enabled: true, environment: 'development', developmentRuntime: true, policyStorePath: policyPath, origins: ['http://localhost:5174'] }).close();
  const policy = new SecurityDefinitionStore(policyPath);
  try {
    const context = {};
    const result = await initializeDevelopmentPlatformSecurity(new SecurityDefinitionService(policy), { async verify(value) {
      assert.equal(value, context); return { operatorId: 'wp1-explicit-local-browser-operator', deploymentId: developmentSecurityConfiguration.deploymentId, strong: true as const, capabilityId: developmentSecurityConfiguration.bootstrapCapabilityId };
    } }, developmentSecurityScopes, developmentSecurityConfiguration, { context, administratorUserId: developmentUsers[1].id,
      grantablePermissionIds: ['ui.platform.component.admin', 'ui.platform.automation.admin'], applicationAnchors: [{ applicationId: appId, administratorUserId: developmentUsers[0].id }], expectedRevision: policy.revision(), reason: 'Explicit development browser verification setup' });
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
    { kind: 'permission-set', id: 'wp1.component-set', key: 'wp1.component-set', name: 'WP1 Component administration', owner: { kind: 'platform' }, status: 'active', includes: [], rules: ['ui.platform.component.admin', 'ui.platform.automation.admin'].map((permissionId, index) => ({ id: 'wp2.rule.' + index, permissionId, effect: 'allow', scope: platform })) },
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
  await workspace.getByRole('navigation', { name: 'Application artifacts' }).getByRole('button', { name: 'WP2 Page', exact: true }).first().waitFor().catch(async error => {
    console.log('Workspace diagnostic:', await workspace.textContent().catch(() => 'not mounted'), 'Page errors:', errors, 'Server:', output); throw error;
  });
  const discovered: WorkspaceArtifact[] = await page.evaluate(async key => {
    const session = await fetch('/api/editor/session').then(r => r.json());
    return fetch(`/api/apps/${key}/builder-workspace`, { headers: { 'x-editor-revision': session.revision } }).then(r => r.json());
  }, appKey);
  assert(Array.isArray(discovered), JSON.stringify(discovered));
  const byKind = (kind: string) => discovered.find(item => item.kind === kind && (kind !== 'component' || item.componentId === componentMeta.componentId))!;
  const visual = byKind('page'), shell = byKind('shell'), component = byKind('component'), form = discovered.find(item => item.componentId === formMeta.componentId)!;
  const menu = byKind('menu'), settings = byKind('settings'), style = byKind('style'), trigger = discovered.find(item => item.kind === 'trigger' && item.locator.startsWith(unique + '/'))!, workflow = discovered.find(item => item.kind === 'workflow' && item.locator.startsWith(unique + '/'))!;
  assert([visual,shell,component,form,menu,settings,style,trigger,workflow].every(Boolean), JSON.stringify(discovered));
  const stage = workspace.locator('[data-stage]');
  const open = async (item: WorkspaceArtifact) => { await workspace.locator('nav button').filter({ hasText: item.name }).first().click(); await page.waitForFunction((name: string) => [...document.querySelectorAll('.builder-workspace [role="tab"]')].some(tab => tab.getAttribute('aria-selected') === 'true' && tab.textContent?.startsWith(name)), item.name); await stage.locator('.workspace-editor').waitFor(); };
  const saved = () => page.waitForFunction(() => /^Saved(?:$| ·)/.test(document.querySelector('.workspace-editor [data-status]')?.textContent ?? ''), { timeout: 15000 });
  const until = async (check: () => Promise<boolean>, label: string) => { for (let i = 0; i < 150; i++) { if (await check()) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error('Timed out: ' + label + '\n' + await stage.innerText()); };
  const visualSource = () => stage.getByLabel('Visual source', { exact: true });
  const role = (name: string) => stage.getByLabel('Visual source file', { exact: true }).selectOption(name);
  const jsonFile = async (file: string) => JSON.parse(await readFile(file, 'utf8'));
  const replies: string[] = []; let leaveWarnings = 0, rejectLeave = false;
  page.on('dialog', async (dialog: any) => { if (dialog.type() === 'beforeunload') { leaveWarnings++; await (rejectLeave ? dialog.dismiss() : dialog.accept()); } else if (dialog.type() === 'prompt') { assert(replies.length, dialog.message()); await dialog.accept(replies.shift()); } else await dialog.accept(); });
  let puts = 0, publishes = 0;
  page.on('request', (request: any) => { if (request.method() === 'PUT') puts++; if (request.method() === 'POST' && request.url().endsWith('/publish')) publishes++; });
  const publish = await page.evaluate(async key => {
    const root = '/api/apps/' + key + '/presentation';
    const initialized = await fetch(root + '/initialize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    if (!initialized.ok) throw new Error(await initialized.text());
    const published = await fetch(root + '/publish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    if (!published.ok) throw new Error(await published.text()); return published.json();
  }, appKey);
  assert.equal(publish.manifest.activeVersion, 1);
  const publishedRoot = path.join(app, 'presentation/versions/v1');
  const fingerprint = async () => { const { readdir } = await import('node:fs/promises'); const values: Array<[string,string]> = []; const walk = async (directory: string) => { for (const entry of await readdir(directory, { withFileTypes: true })) { const file = path.join(directory, entry.name); if (entry.isDirectory()) await walk(file); else values.push([path.relative(publishedRoot,file), createHash('sha256').update(await readFile(file)).digest('hex')]); } }; await walk(publishedRoot); return JSON.stringify(values.sort()); };
  const immutableBefore = await fingerprint();
  await open(visual); const noFocusWrites = puts;
  await open(shell); await open(visual); await new Promise(resolve => setTimeout(resolve, 2300)); assert.equal(puts, noFocusWrites);
  pass('Focus switches and unchanged candidates do not write source');
  const pageSource = path.join(pageDirectory, 'page.html'), pageCss = path.join(pageDirectory, 'page.css');
  await visualSource().fill((await visualSource().inputValue()) + '\n<!-- inactive authorized save -->');
  await open(shell);
  await until(async () => (await readFile(pageSource,'utf8')).includes('inactive authorized save'), 'inactive Page save');
  await open(visual); await saved(); assert((await visualSource().inputValue()).includes('inactive authorized save'));
  pass('Page inactivity autosave completes after switching tabs with its original artifact context');
  await stage.locator('[data-nodes]').selectOption('one');
  await stage.locator('[data-move="down"]').click(); await saved();
  await until(async () => { const text=await readFile(pageSource,'utf8'); return text.indexOf('data-uip-node="one"') > text.indexOf('data-uip-node="two"'); }, 'structural move');
  await open(shell); await role('css'); await visualSource().fill(':host{--wp2-shell:green}'); await saved();
  await open(visual); await stage.getByRole('button',{name:'Undo',exact:true}).click(); await saved();
  assert((await readFile(pageSource,'utf8')).indexOf('data-uip-node="one"') < (await readFile(pageSource,'utf8')).indexOf('data-uip-node="two"'));
  await stage.getByRole('button',{name:'Redo',exact:true}).click(); await saved();
  pass('Page structural Undo/Redo and Shell styling retain independent histories across autosave and switching');
  await open(component); replies.push('tone','string','"calm"');
  await stage.getByRole('button',{name:'Add public property',exact:true}).click(); await saved();
  assert.equal((await jsonFile(path.join(componentDir,'component.visual.json'))).public.properties.tone.default,'calm');
  await stage.getByRole('button',{name:'Undo',exact:true}).click(); await saved();
  assert.equal((await jsonFile(path.join(componentDir,'component.visual.json'))).public.properties.tone,undefined);
  await open(form); await stage.getByLabel('Default mode',{exact:true}).fill('admin'); await stage.getByLabel('Default mode',{exact:true}).blur(); await saved();
  assert.equal((await jsonFile(path.join(formDir,'component.visual.json'))).modes.default,'admin');
  await open(component); await stage.getByRole('button',{name:'Redo',exact:true}).click(); await saved();
  await open(form); await stage.getByRole('button',{name:'Undo',exact:true}).click(); await saved();
  assert.equal((await jsonFile(path.join(formDir,'component.visual.json'))).modes.default,'public');
  pass('Platform Component property and Form configuration edits autosave and preserve independent Undo/Redo and permanent IDs');
  for (const item of [trigger,workflow]) {
    await open(item); await stage.getByRole('button',{name:'Add service action',exact:true}).click(); await saved();
    assert.equal((await jsonFile(path.resolve(item.kind+'s',item.locator))).actions.length,1);
  }
  await open(trigger); await stage.getByRole('button',{name:'Undo',exact:true}).click(); await saved();
  assert.equal((await jsonFile(path.resolve('triggers',trigger.locator))).actions.length,0);
  await open(workflow); await open(trigger); await stage.getByRole('button',{name:'Redo',exact:true}).click(); await saved();
  assert.equal((await jsonFile(path.resolve('triggers',trigger.locator))).actions.length,1);
  pass('Trigger and Workflow ordered action edits use normal autosave and independent retained Undo/Redo');
  await open(menu); replies.push('WP2 Added',JSON.stringify({kind:'page',pageId:pageMeta.artifactId}));
  await stage.getByRole('button',{name:'Add root item',exact:true}).click(); await saved();
  assert.equal((await jsonFile(path.join(app,'menus/main.json'))).items.length,2);
  await open(settings); await stage.getByLabel('applicationName',{exact:true}).fill('WP2 Branding'); await saved();
  assert.equal((await jsonFile(path.join(app,'app.settings.json'))).presentation.branding.applicationName,'WP2 Branding');
  await open(style); await stage.locator('textarea[data-source]').fill(':root{--wp2-color:red}'); await saved();
  await open(menu); await stage.getByRole('button',{name:'Undo',exact:true}).click(); await saved();
  assert.equal((await jsonFile(path.join(app,'menus/main.json'))).items.length,1);
  await open(style); await stage.getByRole('button',{name:'Undo',exact:true}).click(); await saved();
  assert.equal(await readFile(path.join(app,'styles/site.css'),'utf8'),':root{--wp2-color:blue}');
  pass('Menus, composition settings and editable CSS autosave with per-source history');
  await open(visual); await role('metadata'); const authoritative = await readFile(path.join(pageDirectory,'page.visual.json'),'utf8');
  const invalidResponse = page.waitForResponse((response: any) => response.request().method()==='PUT' && response.url().includes('/visual-pages?') && response.status()===422);
  await visualSource().fill('{'); await invalidResponse;
  assert.equal(await readFile(path.join(pageDirectory,'page.visual.json'),'utf8'),authoritative);
  const invalidWrites = puts;
  await open(shell); await open(visual); assert.equal(await visualSource().inputValue(),'{');
  await new Promise(resolve => setTimeout(resolve, 2300)); assert.equal(puts, invalidWrites);
  rejectLeave=true; await page.reload({timeout:3000}).catch(()=>{}); assert.equal(leaveWarnings,1); rejectLeave=false;
  await stage.getByRole('button',{name:'Undo',exact:true}).click(); await saved();
  pass('Invalid Visual candidates are rejected by the real server, survive switching, and trigger the native leave warning');
  await role('css'); await visualSource().fill(':host{--local-conflict:1}');
  await writeFile(pageCss,':host{--external-source:1}');
  await page.waitForFunction(() => document.querySelector('.workspace-editor [data-status]')?.textContent?.startsWith('Conflict'));
  assert.equal(await visualSource().inputValue(),':host{--local-conflict:1}');
  await stage.getByRole('button',{name:'Reload / discard editor changes',exact:true}).click();
  await page.waitForFunction(() => document.querySelector('.workspace-editor [data-status]')?.textContent?.includes('Undo/Redo history reset'));
  assert.equal(await visualSource().inputValue(),':host{--external-source:1}');
  assert.equal(await stage.getByRole('button',{name:'Undo',exact:true}).isDisabled(),true);
  pass('External source changes retain the local draft; explicit reload resets only that artifact history with visible notification');
  let admitted!:()=>void, release!:()=>void, delay=true;
  const admission=new Promise<void>(resolve=>admitted=resolve), held=new Promise<void>(resolve=>release=resolve);
  await page.route('**/visual-pages?*',async (route: any) => { if(route.request().method()==='PUT' && delay) { delay=false; const response=await route.fetch(); admitted(); await held; await route.fulfill({response}); } else await route.continue(); });
  await visualSource().fill(':host{--slow:1}'); await admission;
  await visualSource().fill(':host{--slow:2}'); await open(shell); release();
  await until(async()=> (await readFile(pageCss,'utf8'))===':host{--slow:2}', 'newer inactive save');
  await open(visual); await saved(); assert.equal(await visualSource().inputValue(),':host{--slow:2}');
  await page.unroute('**/visual-pages?*');
  pass('A delayed committed response cannot replace a newer edit; its subsequent inactive save uses the correct source revision');
  let fail=true;
  await page.route('**/visual-pages?*',async (route:any)=> { if(route.request().method()==='PUT' && fail) { fail=false; await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Injected unavailable save service'})}); } else await route.continue(); });
  await visualSource().fill(':host{--retry:1}');
  await page.waitForFunction(()=>document.querySelector('.workspace-editor [data-status]')?.textContent?.startsWith('Save Failed'));
  assert.equal(await readFile(pageCss,'utf8'),':host{--slow:2}');
  await stage.getByRole('button',{name:'Save Now',exact:true}).click(); await saved();
  assert.equal(await readFile(pageCss,'utf8'),':host{--retry:1}'); await page.unroute('**/visual-pages?*');
  pass('Failed saves remain recoverable and explicit Save Now retries the validated normal pathway');
  assert.equal(await fingerprint(), immutableBefore); assert.equal(publishes,1);
  pass('Ordinary editing leaves all bytes of the explicitly published immutable snapshot unchanged and never publishes automatically');
  await page.evaluate(async ({ key, id }: { key: string; id: string }) => {
    const host = document.createElement('aside'); host.id = 'wp2-standalone'; document.body.append(host);
    const { mountVisualEditor } = await import('/src/client/visual-artifacts/editor.ts');
    (window as any).wp2Standalone = await mountVisualEditor(host, key, { applicationId: id });
  }, { key: appKey, id: appId });
  const standalone = page.locator('#wp2-standalone');
  await standalone.getByLabel('Visual Artifact', { exact: true }).selectOption('shell:' + shell.locator);
  await standalone.getByLabel('Visual source file', { exact: true }).selectOption('css');
  await standalone.getByLabel('Visual source', { exact: true }).fill(':host{--standalone:1}');
  await standalone.getByLabel('Visual Artifact', { exact: true }).selectOption('page:' + visual.locator);
  await until(async () => (await readFile(path.join(app, 'shells', shell.locator.replace('.visual.json', '.css')), 'utf8')) === ':host{--standalone:1}', 'standalone inactive save');
  await standalone.getByLabel('Visual Artifact', { exact: true }).selectOption('shell:' + shell.locator);
  await standalone.getByRole('button', { name: 'Undo', exact: true }).click();
  await standalone.getByRole('button', { name: 'Save Now', exact: true }).click();
  await until(async () => (await readFile(path.join(app, 'shells', shell.locator.replace('.visual.json', '.css')), 'utf8')) === ':host{--wp2-shell:green}', 'standalone Undo');
  await standalone.getByRole('button', { name: 'Redo', exact: true }).click();
  await standalone.getByRole('button', { name: 'Save Now', exact: true }).click();
  await until(async () => (await readFile(path.join(app, 'shells', shell.locator.replace('.visual.json', '.css')), 'utf8')) === ':host{--standalone:1}', 'standalone Redo');
  await page.evaluate(async () => { await (window as any).wp2Standalone.dispose(); document.querySelector('#wp2-standalone')?.remove(); });
  pass('Standalone Visual picker uses the same lifecycle: inactive saves complete and per-artifact Undo/Redo survives switching');
  let queued!:()=>void, unblock!:()=>void;
  const queuedRequest=new Promise<void>(resolve=>queued=resolve), blocked=new Promise<void>(resolve=>unblock=resolve);
  await page.route('**/visual-pages?*',async (route:any)=> { if(route.request().method()==='PUT') { queued(); await blocked; await route.continue(); } else await route.continue(); });
  await visualSource().fill(':host{--revoked-draft:1}'); await queuedRequest;
  await page.getByLabel('Development identity',{exact:true}).selectOption('workflow-editor@example.local');
  unblock(); await new Promise(resolve=>setTimeout(resolve,1500));
  assert.equal(await readFile(pageCss,'utf8'),':host{--retry:1}');
  assert(!(await page.locator('body').innerText()).includes('--revoked-draft'));
  pass('A queued save is rejected after identity revocation, and the next User cannot see or inherit the previous draft');
  assert.deepEqual(errors,[]);
  const evidence=process.env.UI_BUILDER_WP2_EVIDENCE;
  if(evidence) { await mkdir(evidence,{recursive:true}); await writeFile(path.join(evidence,'specialized-browser-results.json'),JSON.stringify({passed:report,pageErrors:errors,normalSaveRequests:puts,publishRequests:publishes,identities:[visual,shell,component,form,menu,settings,style,trigger,workflow].map(item=>workspaceIdentityKey(item.identity))},null,2)); }

} finally {
  await browser?.close(); await vite?.close();
  if (child && child.exitCode === null && child.signalCode === null) { const stopped = once(child, 'exit'); if (process.platform === 'win32') execFileSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true, stdio: 'ignore' }); else child.kill(); await stopped; }
  for (const directory of owned) {
    const parent = path.dirname(directory), name = path.basename(directory);
    assert(['components','triggers','workflows'].some(collection => parent === path.resolve(collection)) && name.startsWith(unique), 'Unsafe fixture cleanup path: ' + directory);
    await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
  await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
}
