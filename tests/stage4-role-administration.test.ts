import { afterEach, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile, cp, lstat, realpath } from 'node:fs/promises';
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
import { platformRoot } from '../src/server/paths.js';

const cleanup: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanup.splice(0).reverse()) await close(); }, 60_000);
const doc = (definition: SecurityRecord): SecurityDocument => ({ format: 'ui-platform.security', formatVersion: 1, definition });
const platformScope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system' as const, id: 'platform' }, descendants: true };
const dataPermissions = ['dataset.read', 'dataset.create', 'dataset.update', 'dataset.delete', 'dataset.write'];
const editorPermissions = ['ui.form.view', 'ui.form.edit', 'ui.package.admin', 'ui.package.view', 'ui.presentation.admin', 'ui.presentation.view', 'ui.presentation.edit', 'ui.artifact.view', 'ui.artifact.edit', 'ui.artifact.admin', 'ui.application.view', 'ui.application.edit', 'ui.page.view', 'ui.page.edit'];

it('Stage 4: normal role administration and protected WP3 refusals', async () => {
  // Disposable application stores do not isolate the source-derived graph.
  // Require the physical-target runner before any setup or server launch.
  const isolatedRoot = process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT;
  const originalRoot = process.env.UI_PLATFORM_TEST_ORIGINAL_ROOT;
  if (!isolatedRoot || !originalRoot) throw new Error('Run node scripts/verify-stage4-isolation.mjs; an isolated platform is required.');
  const actualRoot = await realpath(platformRoot);
  expect(actualRoot).toBe(await realpath(isolatedRoot));
  expect(actualRoot).toBe(await realpath(process.cwd()));
  expect(actualRoot).not.toBe(await realpath(originalRoot));
  for (const relative of ['components', 'src/server', 'packages/artifacts', 'node_modules/@ui-platform/artifacts']) {
    const resolved = await realpath(path.join(actualRoot, relative));
    expect(resolved.startsWith(actualRoot + path.sep)).toBe(true);
  }
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
    { ...base('wp0.creator-set'), kind: 'permission-set', owner: { kind: 'platform' }, includes: [], rules: ['ui.platform.application.create'].map((permissionId, index) => ({ id: 'wp4.platform.' + index, permissionId, effect: 'allow' as const, scope: platformScope })) },
    { ...base('wp0.creator-role'), name: 'Platform Administrator', kind: 'role', owner: { kind: 'platform' }, permissionSets: [{ id: 'wp0.creator-set' }] },
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

  const evidence=path.resolve('evidence/v1-stage4-20261105');await mkdir(evidence,{recursive:true});
  const vite=await createViteServer({configFile:'vite.config.ts',cacheDir:path.join(root,'vite-cache'),server:{host:'127.0.0.1',port:0}});await vite.listen();cleanup.push(()=>vite.close());
  const uiOrigin=vite.resolvedUrls!.local[0].slice(0,-1);const playwright=createRequire(path.resolve('../ui-base/package.json'))('playwright');
  const browser=await playwright.chromium.launch({headless:false,channel:'msedge'});cleanup.push(()=>browser.close());const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(15000);
  await page.route(origin+'/**',async(route:any)=>{const u=new URL(route.request().url());if(u.pathname.startsWith('/api/'))return route.continue();const r=await fetch(uiOrigin+u.pathname+u.search);await route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())});});
  await page.goto(origin);await page.getByLabel('Development identity',{exact:true}).selectOption(developmentUsers[1].email);
  const panel=page.locator('details').filter({has:page.getByText('Role administration',{exact:true})});await panel.locator('summary').click();
  await panel.getByLabel('Administration application key',{exact:true}).fill('wp5c-created');await panel.getByRole('button',{name:'Refresh role assignments',exact:true}).click();
  await panel.getByLabel('Role user',{exact:true}).selectOption(developmentUsers[0].id);await panel.getByLabel('Administration reason',{exact:true}).fill('Stage 4 disposable provisioning');
  await panel.getByRole('button',{name:'Provision Application administrator',exact:true}).click();await expect.poll(()=>panel.getByRole('status').textContent(),{timeout:15000}).toContain('Initial administrator provisioned');
  const scope={resource:{authorityId:V1_AUTHORITY_ID,applicationId,kind:'application' as const,id:applicationId},descendants:true};const owner={kind:'application' as const,applicationId};
  const {VisualArtifactService}=await import('../src/server/visual-artifacts.js');const pages=new VisualArtifactService(path.join(apps,'wp5c-created','src/pages'),'page');const assigned=await pages.create('assigned','/assigned');const unassigned=await pages.create('unassigned','/unassigned');
  const pageScope={resource:{authorityId:V1_AUTHORITY_ID,applicationId,kind:'page' as const,id:assigned.metadata!.artifactId,parentId:applicationId},descendants:false};
  for(const [folder,id] of [['assigned-form','stage4-assigned-form'],['unassigned-form','stage4-unassigned-form']]){const dir=path.join(apps,'wp5c-created',folder);await mkdir(dir);await writeFile(path.join(dir,'artifact.json'),JSON.stringify({schemaVersion:1,definitionVersion:1,artifactId:id,artifactType:'form',name:folder,files:{definition:'form.json'}}));await writeFile(path.join(dir,'form.json'),'{}');}
  const formScope={resource:{authorityId:V1_AUTHORITY_ID,applicationId,kind:'form' as const,id:'stage4-assigned-form',parentId:applicationId},descendants:false};
  const prefix='initial.'+applicationId;const existing=(id:string)=>policy.documents().find(d=>d.definition.id===id)!.definition;
  const boundary=existing(prefix+'.boundary') as Extract<SecurityRecord,{kind:'grant-boundary'}>;
  const allowed=['ui.application.security.admin','ui.application.view','ui.application.edit','ui.page.view','ui.page.edit','ui.form.view','ui.form.edit','ui.presentation.view','ui.presentation.edit','ui.presentation.admin'];
  await activate(null,[{...boundary,scope,permissions:allowed.map(permissionId=>({permissionId,scope,predicateTemplateIds:[]}))}]);
  const set=(id:string,name:string,rules:any[]):SecurityRecord=>({...base(id),name,kind:'permission-set',owner,includes:[],rules:rules.map((r,i)=>({id:id+'.'+i,effect:'allow',...r}))});
  const role=(id:string,name:string,setId:string):SecurityRecord=>({...base(id),name,kind:'role',owner,permissionSets:[{id:setId}]});
  const initialRole=existing(prefix+'.role') as Extract<SecurityRecord,{kind:'role'}>;const initialAssignment=existing(prefix+'.assignment') as Extract<SecurityRecord,{kind:'role-assignment'}>;
  await activate(applicationId,[set('stage4.admin.set','Application Administrator functional grants',['ui.application.view','ui.application.edit','ui.presentation.view','ui.presentation.edit','ui.presentation.admin'].map(permissionId=>({permissionId,scope}))),
    {...initialRole,name:'Application Administrator',permissionSets:[...initialRole.permissionSets,{id:'stage4.admin.set'}]},{...initialAssignment,scope},
    set('stage4.editor.set','Editor exact Page grants',[{permissionId:'ui.application.view',scope:{...scope,descendants:false}},{permissionId:'ui.page.view',scope:pageScope},{permissionId:'ui.page.edit',scope:pageScope},{permissionId:'ui.form.view',scope:formScope},{permissionId:'ui.form.edit',scope:formScope}]),role('stage4.editor','Editor','stage4.editor.set'),
    set('stage4.viewer.set','Authenticated Viewer: no management grants',[]),role('stage4.viewer','Authenticated Viewer','stage4.viewer.set'),
    set('stage4.ceiling.set','Outside delegated ceiling',[{permissionId:'ui.package.admin',scope}]),role('stage4.ceiling','Outside grant ceiling','stage4.ceiling.set')]);
  const admin=await login(developmentUsers[0].email);expect((await post('/api/apps',{key:'admin-cannot-create',name:'Denied',templateId:'standard'},admin)).status).toBe(403);const endpoint='/api/apps/wp5c-created/security';const state=async(headers=admin)=>fetch(origin+endpoint+'/roles',{headers}).then(r=>r.json());
  await page.getByLabel('Development identity',{exact:true}).selectOption(developmentUsers[0].email);await panel.locator('summary').click();await panel.getByLabel('Administration application key',{exact:true}).fill('wp5c-created');await panel.getByRole('button',{name:'Refresh role assignments',exact:true}).click();
  await panel.getByLabel('Role user',{exact:true}).selectOption(developmentUsers[3].id);await panel.getByLabel('Application role',{exact:true}).selectOption('stage4.editor');
  let current=await state();await panel.getByLabel('Assignment scope',{exact:true}).selectOption(String(current.scopes.findIndex((s:any)=>s.resource.id===applicationId&&s.descendants)));await panel.getByLabel('Administration reason',{exact:true}).fill('Assign Editor to one Page');
  await panel.getByRole('button',{name:'Stage role assignment',exact:true}).click();await expect.poll(()=>panel.getByRole('status').textContent(),{timeout:15000}).toContain('Candidate staged');await panel.getByRole('button',{name:'Activate role change',exact:true}).click();await expect.poll(()=>panel.getByRole('status').textContent(),{timeout:15000}).toContain('Role change activated');
  await page.screenshot({path:path.join(evidence,'assignment.png'),fullPage:true});current=await state();const assignment=current.assignments.find((a:any)=>a.roleId==='stage4.editor');expect(assignment).toBeDefined();expect((await state(await login(developmentUsers[0].email))).assignments.some((a:any)=>a.id===assignment.id&&a.status==='active')).toBe(true);
  const editor=await login(developmentUsers[3].email);const editorSessionResponse=await fetch(origin+'/api/editor/session',{headers:editor});const editorSession=await editorSessionResponse.json();const editorCookie=editorSessionResponse.headers.get('set-cookie');if(editorCookie)editor.cookie+='; '+editorCookie.split(';')[0];Object.assign(editor,{'x-editor-csrf':editorSession.csrfToken,'x-editor-revision':editorSession.revision});const pageRoute=(locator:string)=>origin+'/api/apps/wp5c-created/visual-pages?locator='+encodeURIComponent(locator);
  expect((await fetch(pageRoute(assigned.locator),{headers:editor})).status).toBe(200);expect((await fetch(pageRoute(unassigned.locator),{headers:editor})).status).toBe(403);
  const saved=await fetch(pageRoute(assigned.locator),{method:'PUT',headers:editor,body:JSON.stringify({mode:'normal',files:{...assigned.files,source:assigned.files.source+'<p data-uip-node="node_stage4">Editor saved</p>'},expectedHash:assigned.hash})});expect(saved.status,await saved.text()).toBe(200);
  const editorPage=await browser.newPage({viewport:{width:1440,height:1000}});editorPage.setDefaultTimeout(15000);await editorPage.route(origin+'/**',async(route:any)=>{const u=new URL(route.request().url());if(u.pathname.startsWith('/api/'))return route.continue();const r=await fetch(uiOrigin+u.pathname+u.search);await route.fulfill({status:r.status,headers:Object.fromEntries(r.headers),body:Buffer.from(await r.arrayBuffer())});});
  await editorPage.goto(origin);await editorPage.getByLabel('Development identity',{exact:true}).selectOption(developmentUsers[3].email);await editorPage.locator('[data-app="wp5c-created"]').first().click();await editorPage.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();
  const editorWorkspace=editorPage.getByRole('region',{name:'Application Builder workspace'});await editorWorkspace.getByText('assigned',{exact:true}).first().click();
  await editorWorkspace.getByLabel('Insert element',{exact:true}).selectOption('html:p');await editorWorkspace.getByRole('button',{name:'Insert selected item',exact:true}).click();await editorWorkspace.getByLabel('Text content',{exact:true}).fill('Stage 4 browser Editor');await editorWorkspace.getByLabel('Text content',{exact:true}).press('Tab');await editorWorkspace.getByRole('button',{name:'Save Now',exact:true}).click();
  await expect.poll(()=>editorWorkspace.locator('[data-status]').allTextContents(),{timeout:15000}).toContain('Saved');await editorWorkspace.getByRole('button',{name:'Reload / discard editor changes',exact:true}).click();await expect.poll(()=>editorWorkspace.getByLabel('Text content',{exact:true}).inputValue(),{timeout:15000}).toBe('Stage 4 browser Editor');await editorPage.screenshot({path:path.join(evidence,'assigned-editor.png'),fullPage:true});
  const discovery=await fetch(origin+'/api/apps/wp5c-created/builder-workspace',{headers:editor}).then(r=>r.json());expect(discovery.some((a:any)=>a.identity.id===assigned.metadata!.artifactId)).toBe(true);expect(JSON.stringify(discovery)).not.toContain(unassigned.metadata!.artifactId);
  const forms=await fetch(origin+'/api/apps/wp5c-created/artifacts',{headers:editor}).then(r=>r.json());expect(Array.isArray(forms),JSON.stringify(forms)).toBe(true);const form=forms.find((f:any)=>f.artifactId==='stage4-assigned-form');expect(form).toBeDefined();expect(forms.some((f:any)=>f.artifactId==='stage4-unassigned-form')).toBe(false);const formUrl=origin+'/api/apps/wp5c-created/artifacts/'+form.locator;const formLoaded=await fetch(formUrl,{headers:editor}).then(r=>r.json());expect((await fetch(formUrl,{method:'PUT',headers:editor,body:JSON.stringify({expectedChecksum:formLoaded.checksum,files:{'form.json':'{"fields":[]}'}})})).status).toBe(200);
  const checks:any={};for(const [name,route] of [['publish','/presentation/publish'],['shared','/composition-source?path=app.settings.json'],['admin','/security/assign']]){const r=await post('/api/apps/wp5c-created'+route,{},editor);expect(r.status).toBe(403);checks[name]=r.status;}
  const stage=async(action:string,body:any,headers=admin)=>post(endpoint+'/'+action,{...body,expectedRevision:policy.revision(),reason:'Stage 4 direct negative case'},headers);
  const activateCandidate=async(c:any,headers=admin)=>post(endpoint+'/activate',{candidateId:c.id,checksum:c.checksum,expectedRevision:c.baseRevision,reason:'Stage 4 direct negative case'},headers);
  expect((await stage('assign',{roleId:'stage4.editor',userId:developmentUsers[4].id,scope,expectedApplicationId:second.value.appId})).status).toBe(403);expect((await fetch(origin+'/api/apps/wp5c-other/security/roles',{headers:admin})).status).toBe(403);
  const ceiling=await stage('assign',{roleId:'stage4.ceiling',userId:developmentUsers[4].id,scope});const ceilingDenied=await activateCandidate(ceiling.value);expect(ceilingDenied.status).toBe(403);expect(JSON.stringify(ceilingDenied.value)).toContain('ADMIN_GRANT_CEILING');
  await panel.getByRole('button',{name:'Refresh role assignments',exact:true}).click();await panel.getByLabel('Role user',{exact:true}).selectOption(developmentUsers[4].id);await panel.getByLabel('Application role',{exact:true}).selectOption('stage4.ceiling');current=await state();await panel.getByLabel('Assignment scope',{exact:true}).selectOption(String(current.scopes.findIndex((s:any)=>s.resource.id===applicationId&&s.descendants)));await panel.getByRole('button',{name:'Stage role assignment',exact:true}).click();await expect.poll(()=>panel.getByRole('status').textContent(),{timeout:15000}).toContain('Candidate staged');await panel.getByRole('button',{name:'Activate role change',exact:true}).click();await expect.poll(()=>panel.getByRole('status').textContent(),{timeout:15000}).toContain('ADMIN_GRANT_CEILING');await page.screenshot({path:path.join(evidence,'grant-ceiling-refusal.png'),fullPage:true});
  const last=await stage('revoke',{assignmentId:prefix+'.assignment'});const lastDenied=await activateCandidate(last.value);expect(lastDenied.status).toBe(403);expect(JSON.stringify(lastDenied.value)).toContain('LAST_ADMIN_REQUIRED');
  await panel.getByRole('button',{name:'Refresh role assignments',exact:true}).click();await panel.getByLabel('Current assignment',{exact:true}).selectOption(prefix+'.assignment');await panel.getByRole('button',{name:'Stage role revocation',exact:true}).click();await expect.poll(()=>panel.getByRole('status').textContent(),{timeout:15000}).toContain('Candidate staged');await panel.getByRole('button',{name:'Activate role change',exact:true}).click();await expect.poll(()=>panel.getByRole('status').textContent(),{timeout:15000}).toContain('LAST_ADMIN_REQUIRED');await page.screenshot({path:path.join(evidence,'last-admin-refusal.png'),fullPage:true});
  expect((await stage('assign',{roleId:'stage4.editor',userId:developmentUsers[4].id,scope:{...scope,resource:{...scope.resource,applicationId:second.value.appId,id:second.value.appId}}})).status).toBe(403);
  expect((await stage('revoke',{assignmentId:assignment.id},editor)).status).toBe(403);
  await panel.getByRole('button',{name:'Refresh role assignments',exact:true}).click();await panel.getByLabel('Current assignment',{exact:true}).selectOption(assignment.id);await panel.getByRole('button',{name:'Stage role revocation',exact:true}).click();await expect.poll(()=>panel.getByRole('status').textContent(),{timeout:15000}).toContain('Candidate staged');await panel.getByRole('button',{name:'Activate role change',exact:true}).click();await expect.poll(()=>panel.getByRole('status').textContent(),{timeout:15000}).toContain('Role change activated');expect((await fetch(pageRoute(assigned.locator),{headers:editor})).status).toBe(403);expect(await editorPage.evaluate(async(url:string)=>(await fetch(url)).status,pageRoute(assigned.locator))).toBe(403);
  const viewerCandidate=await stage('assign',{roleId:'stage4.viewer',userId:developmentUsers[4].id,scope});expect((await activateCandidate(viewerCandidate.value)).status).toBe(200);const viewer=await login(developmentUsers[4].email);for(const suffix of ['', '/export','/composition-asset?info=1&path=assets/images/probe.svg'])expect((await fetch(origin+'/api/apps/wp5c-created'+suffix,{headers:viewer})).status).toBe(403);
  expect((await post('/api/apps',{key:'public-cannot-create',name:'Denied',templateId:'standard'},{origin,'content-type':'application/json'} as any)).status).toBe(401);
  for(const suffix of ['', '/visual-pages?locator='+encodeURIComponent(assigned.locator),'/composition-asset?info=1&path=assets/images/probe.svg'])expect([401,403]).toContain((await fetch(origin+'/api/apps/wp5c-created'+suffix)).status);
  const stale=await stage('assign',{roleId:'stage4.viewer',userId:developmentUsers[5].id,scope});const newer=await stage('assign',{roleId:'stage4.viewer',userId:developmentUsers[3].id,scope});expect((await activateCandidate(newer.value)).status).toBe(200);const staleDenied=await activateCandidate(stale.value);expect(staleDenied.status).toBe(403);
  const publicUpload=new FormData();publicUpload.set('id','stage4-public');publicUpload.set('name','Intentionally public presentation asset');publicUpload.set('type','image');publicUpload.set('alt','Public fixture');publicUpload.set('asset',new Blob(['<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'],{type:'image/svg+xml'}),'public.svg');const uploadHeaders={...admin};delete (uploadHeaders as any)['content-type'];const publicCreated=await fetch(origin+'/api/apps/wp5c-created/presentation/assets',{method:'POST',headers:uploadHeaders,body:publicUpload});expect(publicCreated.status).toBe(201);const publicRead=await fetch(origin+'/api/apps/wp5c-created/presentation/assets/stage4-public');expect(publicRead.status).toBe(200);expect(await publicRead.text()).toContain('<svg');
  expect((await post('/api/apps/wp5c-created/security/revoke',{assignmentId:prefix+'.assignment'},viewer)).status).toBe(403);expect((await post('/api/apps/wp5c-created/presentation/publish',{},viewer)).status).toBe(403);expect((await post('/api/apps/wp5c-created/composition-asset',{},viewer)).status).toBe(403);
  const audit=policy.adminAudit();expect(audit.some(a=>a.applicationId===applicationId&&a.targetIds.includes(assignment.id)&&a.operation==='assign')).toBe(true);expect(audit.some(a=>a.applicationId===applicationId&&a.targetIds.includes(assignment.id)&&a.operation==='revoke')).toBe(true);await writeFile(path.join(evidence,'administration-audit.json'),JSON.stringify(audit,null,2));
  await page.screenshot({path:path.join(evidence,'revocation.png'),fullPage:true});await writeFile(path.join(evidence,'protected-results.json'),JSON.stringify({applicationId,assignmentId:assignment.id,checks,ceiling:ceilingDenied,lastAdmin:lastDenied,stale:staleDenied,publicAssetStatus:publicRead.status,viewerPublicAssetStatus:(await fetch(origin+'/api/apps/wp5c-created/presentation/assets/stage4-public',{headers:viewer})).status,forms:'assigned Form edited; unassigned Form excluded',qualification:'Development-session management boundary; production runtime Viewer/public reader enforcement is Stage 5.'},null,2));
},180000);
