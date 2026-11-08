import { expect } from 'vitest';
import path from 'node:path';
import { readFile,writeFile,mkdir,readdir } from 'node:fs/promises';
import { execFileSync,spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { X509Certificate,randomUUID } from 'node:crypto';
import { build } from 'esbuild';
import { DatabaseSync } from 'node:sqlite';
import { generateKeyPair,exportPKCS8,exportSPKI } from '../../src/server/production/node_modules/jose/dist/webapi/index.js';
import { SecurityDefinitionStore,securityChecksum } from '@ui-platform/i-am/definitions';
import { developmentUsers,V1_AUTHORITY_ID } from '../../src/server/v1-development-policy.js';
import { iamIdentityDirectory } from '../../src/server/production/identity-integration.js';
import { PrivateAssetOwner } from '../../src/server/production/private-asset-owner.js';
import { ApplicationPublicationSelection } from '../../src/server/production/publication-integration.js';
import { appliedIdentity } from '../../src/server/production/applied-integration.js';
import { inspectDevelopmentDataset } from '@ui-platform/dataset-operations';
import { buildReleasedBrowser } from '../../src/server/production/release-browser-build.js';
import { digest } from '../../src/server/production/boundary.js';
import { LocalDirectoryDeploymentTarget } from '../../packages/artifacts/src/application/local-target.js';
import { DeploymentService } from '../../packages/artifacts/src/application/deployment.js';
import { filesUnder } from '../../packages/artifacts/src/application/common.js';
import type { RuntimeManifest } from '../../packages/artifacts/src/application/build.js';

const port=async()=>{const server=createServer();await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const p=(server.address() as any).port;await new Promise<void>(r=>server.close(()=>r()));return p;};
const saveJson=(file:string,value:unknown)=>writeFile(file,JSON.stringify(value,null,2));
async function credentials(root:string){
  const ca=path.join(root,'ca');await mkdir(ca);const run=(args:string[])=>execFileSync('C:/Program Files/Git/usr/bin/openssl.exe',args,{cwd:ca,stdio:'ignore',windowsHide:true});
  run(['req','-x509','-newkey','rsa:2048','-nodes','-keyout','ca.key','-out','ca.pem','-days','1','-subj','/CN=Disposable integration CA']);
  const peers:any[]=[];
  for(const id of ['data','runtime','management']){
    const dir=path.join(root,id);await mkdir(dir);const keys=await generateKeyPair('EdDSA',{extractable:true});await writeFile(path.join(dir,'signing.key'),await exportPKCS8(keys.privateKey));await writeFile(path.join(dir,'signing.pub'),await exportSPKI(keys.publicKey));
    run(['req','-newkey','rsa:2048','-nodes','-keyout',`${id}.key`,'-out',`${id}.csr`,'-subj',`/CN=${id}`]);
    await writeFile(path.join(ca,`${id}.ext`),'subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth,clientAuth\n');
    run(['x509','-req','-in',`${id}.csr`,'-CA','ca.pem','-CAkey','ca.key','-CAcreateserial','-out',`${id}.pem`,'-days','1','-extfile',`${id}.ext`]);
    for(const [source,target]of [['ca.pem','ca.pem'],[`${id}.pem`,'tls.pem'],[`${id}.key`,'tls.key']])await writeFile(path.join(dir,target!),await readFile(path.join(ca,source!)));
    peers.push({id,fingerprint:new X509Certificate(await readFile(path.join(dir,'tls.pem'))).fingerprint256,publicKey:await readFile(path.join(dir,'signing.pub'),'utf8')});
  }
  return peers;
}
export async function continueStage5Integration(f:any){
  const {page,workspace,form,applicationId,datasetId,schema,root,apps,runtime,policyPath,cleanup,creator,unrelated,activate,post,origin}=f;
  const evidence=path.resolve('evidence/v1-stage5-integration-local');await mkdir(evidence,{recursive:true});
  const switchBuilderIdentity=async(email:string)=>{await page.getByLabel('Development identity',{exact:true}).selectOption(email);await expect.poll(()=>page.getByLabel('Development identity',{exact:true}).isEnabled(),{timeout:30_000}).toBe(true);await page.reload();await expect.poll(()=>page.getByLabel('Development identity',{exact:true}).inputValue(),{timeout:30_000}).toBe(email);await page.getByText('Select an application or create a new one.',{exact:false}).waitFor();};
  await workspace.getByRole('button',{name:'Create Page',exact:true}).click();const create=page.getByRole('dialog',{name:'Create Page',exact:true});
  await create.getByLabel('Page name',{exact:true}).fill('stage5-inventory');await create.getByLabel('Page route',{exact:true}).fill('/inventory');await create.getByLabel('Page Shell',{exact:true}).selectOption('plain');
  const pageResponse=page.waitForResponse((r:any)=>r.request().method()==='POST'&&r.url().endsWith('/visual-pages'));await create.getByRole('button',{name:'Create',exact:true}).click();const createdPage=await(await pageResponse).json();
  const visual=workspace;
  await workspace.getByText(createdPage.metadata.displayName,{exact:true}).first().click();
  await visual.getByLabel('Insert element',{exact:true}).selectOption('component:'+form.metadata.componentId);await visual.getByRole('button',{name:'Insert selected item',exact:true}).click();
  await visual.getByRole('button',{name:'Select artifact root',exact:true}).click();await visual.getByLabel('New local state',{exact:true}).fill('inventory');await visual.getByLabel('New local state type',{exact:true}).selectOption('result');await visual.getByRole('button',{name:'Declare local state',exact:true}).click();
  await visual.getByRole('button',{name:'Load applied query Datasets',exact:true}).click();await visual.getByLabel('Query Dataset',{exact:true}).selectOption(datasetId);await visual.getByLabel('Query result state',{exact:true}).selectOption('inventory');await visual.getByRole('button',{name:'Save protected query',exact:true}).click();
  await visual.getByRole('button',{name:'Save Now',exact:true}).click();await expect.poll(()=>visual.locator('span[data-status]').textContent(),{timeout:30_000}).toBe('Saved');
  console.log('Stage 5 integration: Page, Form placement and protected query saved through controls');
  await workspace.getByRole('button',{name:'Create Shell',exact:true}).first().click();const shellDialog=page.getByRole('dialog',{name:'Create Shell',exact:true});await shellDialog.getByLabel('Artifact name',{exact:true}).fill('stage5-shell');const shellResponse=page.waitForResponse((r:any)=>r.request().method()==='POST'&&r.url().endsWith('/visual-shells'));await shellDialog.getByRole('button',{name:'Create',exact:true}).click();expect((await shellResponse).status()).toBe(201);
  await page.locator('uib-tabs.app-tabs > uib-tab').nth(3).click();const presentation=page.locator('#presentationTarget');const initialize=page.waitForResponse((r:any)=>r.url().endsWith('/presentation/initialize'));await presentation.getByRole('button',{name:'Initialize Presentation',exact:true}).click();expect((await initialize).status()).toBe(201);await presentation.getByRole('button',{name:'Publish Changes',exact:true}).waitFor();
  expect((await post('/api/apps/wp5c-created/presentation/publish',{},creator)).status).toBe(403);
  const publisherScope={resource:{authorityId:V1_AUTHORITY_ID,applicationId,kind:'application',id:applicationId},descendants:true},publisherOwner={kind:'application',applicationId};
  await activate(applicationId,[{kind:'permission-set',id:'stage5.publisher-set',key:'stage5.publisher-set',name:'Explicit publication grants',status:'active',owner:publisherOwner,includes:[],rules:['ui.application.view','ui.presentation.view','ui.presentation.admin'].map((permissionId,i)=>({id:'publisher.'+i,permissionId,effect:'allow',scope:publisherScope}))},
    {kind:'role',id:'stage5.publisher-role',key:'stage5.publisher-role',name:'Publisher',status:'active',owner:publisherOwner,permissionSets:[{id:'stage5.publisher-set'}]},
    {kind:'role-assignment',id:'stage5.publisher-assignment',userId:developmentUsers[0].id,roleId:'stage5.publisher-role',status:'active',scope:publisherScope,startsAt:'2026-01-01T00:00:00Z',endsAt:null}]);
  await switchBuilderIdentity(developmentUsers[0].email);await page.locator('[data-app="wp5c-created"]').first().click();await page.locator('uib-tabs.app-tabs > uib-tab').nth(3).click();
  const [published]=await Promise.all([page.waitForResponse((r:any)=>r.url().endsWith('/presentation/publish'),{timeout:30_000}),presentation.getByRole('button',{name:'Publish Changes',exact:true}).click({timeout:30_000})]);expect(published.status(),await published.text()).toBe(200);
  console.log('Stage 5 integration: actual publication completed');
  const appRoot=path.join(apps,'wp5c-created'),deployment=JSON.parse(await readFile(path.join(runtime,'builder-datasets',applicationId,datasetId,'host.json'),'utf8')).config;
  const applied=await inspectDevelopmentDataset(deployment),schemaIdentity=appliedIdentity(applied),selection=new ApplicationPublicationSelection(appRoot,applicationId,schemaIdentity),release=await selection.read();
  expect([...applied.fields].map((f:any)=>({id:f.fieldId,key:f.key})).sort((a:any,b:any)=>a.id.localeCompare(b.id))).toEqual(schema.fields.map((f:any)=>({id:f.id,key:f.key})).sort((a:any,b:any)=>a.id.localeCompare(b.id)));
  await saveJson(path.join(evidence,'canonical-field-identity.json'),{source:schema.fields.map((f:any)=>({id:f.id,key:f.key})),canonical:applied.fields});
  let queryContract='';
  for(const file of Object.keys(release.files).filter(file=>file.endsWith('.visual.json'))){const metadata=JSON.parse(await readFile(path.join(release.compositionRoot,file),'utf8'));if(metadata.artifactId===createdPage.metadata.artifactId){const index=(metadata.onLoad??[]).findIndex((a:any)=>a.kind==='service'&&a.reference==='dataset.read'&&a.input?.literal?.datasetId===datasetId&&a.resultState==='inventory');expect(index).toBeGreaterThanOrEqual(0);queryContract='onLoad:'+index;await saveJson(path.join(evidence,'released-query-contract.json'),{releaseId:release.releaseId,metadata});}}
  expect(queryContract).not.toBe('');
  const publicRoot=path.join(root,'released-public');
  await expect(buildReleasedBrowser(appRoot,process.cwd(),{...release,releaseId:release.releaseId+'-wrong'},publicRoot)).rejects.toThrow();
  const browserRelease=await buildReleasedBrowser(appRoot,process.cwd(),release,publicRoot);
  const publicManifest={files:[...browserRelease.publicFiles].map(([route,item])=>({route,file:route==='/'||!route.includes('.')?'index.html':route.slice(1),sha256:item.sha256,mediaType:item.mediaType}))};await saveJson(path.join(publicRoot,'public-manifest.json'),publicManifest);
  // Ordinary authoring draft B changes the Form. The released Form remains editable and executable against A.
  await switchBuilderIdentity(developmentUsers[2].email);await page.locator('[data-app="wp5c-created"]').first().click();await page.locator('uib-tabs.app-tabs > uib-tab').nth(1).click();await workspace.getByText(form.metadata.displayName,{exact:true}).first().click();
  const formEditor=workspace.getByLabel('Generic Artifact Editor',{exact:true});await formEditor.getByRole('tab',{name:'Structure and Fields',exact:true}).click();await formEditor.locator('fieldset[data-form-field]').filter({has:page.getByText('name',{exact:true})}).getByLabel('editable',{exact:true}).uncheck();await formEditor.getByRole('button',{name:'Save now',exact:true}).click();await expect.poll(()=>formEditor.locator('[role=status]').textContent(),{timeout:30_000}).toBe('Saved');
  expect((await selection.read()).releaseId).toBe(release.releaseId);await saveJson(path.join(evidence,'publication-and-draft.json'),{applicationId,datasetId,releaseId:release.releaseId,schemaIdentity,frozenFiles:release.files,draftB:'editable=false through supported shared Form editor',selectionAfterDraftB:(await selection.read()).releaseId,productionQualification:false});await page.screenshot({path:path.join(evidence,'authoring-draft-B-after-publication.png'),fullPage:true});
  // Runtime identities are real disposable Users created through WP3, without the
  // Builder fixture Users' unrelated legacy application/service assignments.
  const user=(name:string)=>({id:'usr_stage5_'+randomUUID(),name}),viewer=user('Viewer'),editor=user('Editor'),admin=user('Platform template administrator'),applicationAdmin=user('Application administrator');
  await activate(null,[viewer,editor,admin,applicationAdmin].map(u=>({kind:'user',id:u.id,displayName:u.name,status:'active'})));
  const scope={resource:{authorityId:V1_AUTHORITY_ID,applicationId,kind:'application',id:applicationId},descendants:true},owner={kind:'application',applicationId};
  const assignmentFor=(id:string,userId:string,roleId:string,assignedScope:any)=>({kind:'role-assignment',id,userId,roleId,status:'active',scope:assignedScope,startsAt:'2026-01-01T00:00:00Z',endsAt:null});
  await activate(null,[assignmentFor('stage5.platform-admin-assignment',admin.id,'development.platform-security.role',{resource:{authorityId:V1_AUTHORITY_ID,applicationId:null,kind:'system',id:'platform'},descendants:true})]);
  await activate(applicationId,[assignmentFor('stage5.application-admin-assignment',applicationAdmin.id,`initial.${applicationId}.role`,{...scope,descendants:false}),
    {kind:'permission-set',id:'stage5.runtime-editor-set',key:'stage5.runtime-editor-set',name:'Released inventory Editor',status:'active',owner,includes:[],rules:['ui.page.view','ui.artifact.view','dataset.read','dataset.create','dataset.update','dataset.delete','dataset.write'].map((permissionId,i)=>({id:'stage5.editor.'+i,permissionId,effect:'allow',scope}))},
    {kind:'role',id:'stage5.runtime-editor-role',key:'stage5.runtime-editor-role',name:'Released inventory Editor',status:'active',owner,permissionSets:[{id:'stage5.runtime-editor-set'}]},assignmentFor('stage5.runtime-editor-assignment',editor.id,'stage5.runtime-editor-role',scope)]);
  const datasetScope={resource:{authorityId:V1_AUTHORITY_ID,applicationId,kind:'dataset',id:datasetId},descendants:true},field=(key:string)=>schema.fields.find((v:any)=>v.key===key).id;
  const viewerAssignment={kind:'role-assignment',id:'stage5.viewer-assignment',userId:viewer.id,roleId:'stage5.viewer-role',status:'active',scope,startsAt:'2026-01-01T00:00:00Z',endsAt:null};
  const viewerRecords=[{kind:'permission-set',id:'stage5.viewer-set',key:'stage5.viewer-set',name:'Scoped Viewer',status:'active',owner,includes:[],rules:[
    ...['ui.page.view','ui.artifact.view'].map((permissionId,i)=>({id:'stage5.ui.'+i,permissionId,effect:'allow',scope})),{id:'stage5.read',permissionId:'dataset.read',effect:'allow',scope:datasetScope},
    {id:'stage5.field-deny',permissionId:'dataset.read',effect:'deny',scope:datasetScope,fields:[field('quantity')]},
    {id:'stage5.row-deny',permissionId:'dataset.read',effect:'deny',scope:datasetScope,where:{op:'eq',left:{kind:'field',fieldId:field('name')},right:{kind:'literal',value:'Hidden'}}}]},
    {kind:'role',id:'stage5.viewer-role',key:'stage5.viewer-role',name:'Stage 5 Viewer',status:'active',owner,permissionSets:[{id:'stage5.viewer-set'}]},viewerAssignment];
  const integration=path.join(root,'integration'),secrets=path.join(integration,'credentials');await mkdir(secrets,{recursive:true});const peers=await credentials(secrets);
  const policy=new SecurityDefinitionStore(policyPath),operator={},enrollmentFile=path.join(integration,'enrollment.sqlite');
  const directory=iamIdentityDirectory(enrollmentFile,policy,async c=>{if(c!==operator)throw new Error('OPERATOR_DENIED');return'isolated-setup-operator';});
  const issuer='https://stage5-local-identity.example/',managementApplicationId='stage5-management';
  for(const user of [editor,viewer,admin,applicationAdmin])await directory.approve(operator,issuer,user.id,user.id,applicationId);await directory.approve(operator,issuer,admin.id,admin.id,managementApplicationId);await directory.approve(operator,issuer,applicationAdmin.id,applicationAdmin.id,managementApplicationId);await directory.approve(operator,issuer,editor.id,editor.id,managementApplicationId);
  const privateRoot=path.join(integration,'private-store'),assetOwner=await PrivateAssetOwner.open(privateRoot,[apps,publicRoot]),privateBytes=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG1sAAAAASUVORK5CYII=','base64');
  const assertOperator=async(context:unknown)=>{if(context!==operator)throw new Error('OPERATOR_DENIED');};
  const privateVersion=await assetOwner.save(applicationId,'stage5-private','Private image',privateBytes,null,()=>assertOperator(operator));assetOwner.close();directory.close();policy.close();
  for(const [route,file]of browserRelease.publicFiles){expect(Buffer.from(file.bytes).includes(privateBytes),route).toBe(false);}
  const exportRoute = '/api/apps/wp5c-created/export';
  const deniedExport = await post(exportRoute, {}, unrelated);
  expect(deniedExport.status).toBe(403);
  const exported = await post(exportRoute, {}, creator);
  expect(exported.status, JSON.stringify(exported.value)).toBe(200);
  expect(exported.value.downloadName).toBe('wp5c-created-export.zip');
  expect(exported.value.url).toMatch(/^\/api\/downloads\/wp5c-created-[\w-]+\.zip$/);
  const deniedDownload = await fetch(origin + exported.value.url, { headers: unrelated });
  expect(deniedDownload.status).toBe(403);
  const anonymousDownload = await fetch(origin + exported.value.url);
  expect(anonymousDownload.status).toBe(401);
  const invalidDownload = await fetch(origin + '/api/downloads/nonexistent.zip', { headers: creator });
  expect(invalidDownload.status).toBe(403);
  const downloaded = await fetch(origin + exported.value.url, { headers: creator });
  expect(downloaded.status).toBe(200);
  expect(downloaded.headers.get('content-type')).toBe('application/zip');
  expect(downloaded.headers.get('content-disposition')).toMatch(/^attachment; filename="[^"/]+\.zip"$/);
  const bytes = Buffer.from(await downloaded.arrayBuffer());
  expect(bytes.length).toBe(Number(downloaded.headers.get('content-length')));
  const token = path.basename(exported.value.url);
  const prepared = path.join(runtime, 'exports', token.slice(0, -4));
  expect(digest(bytes)).toBe(digest(await readFile(prepared + '.zip')));

  const preparedDirectories = new Set<string>();
  async function inventory(dir: string, relative = '', audit = false): Promise<Map<string, string>> {
    const files = new Map<string, string>();
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const name = relative + entry.name, file = path.join(dir, entry.name);
      expect(entry.name).not.toMatch(/^(?:node_modules|dist|dist-server|\.git|\.vite|\.uib|credentials|private-store|\.env(?:\..*)?)$/i);
      if (entry.isDirectory()) {
        if (!audit) preparedDirectories.add(name + '/');
        for (const [key, hash] of await inventory(file, name + '/', audit)) files.set(key, hash);
      } else {
        expect(entry.isFile(), name).toBe(true);
        const content = await readFile(file);
        if (audit) {
          expect(content.includes(privateBytes), name).toBe(false);
          expect(entry.name).not.toMatch(/\.(?:key|pem|pfx|sqlite3?|db)(?:-(?:wal|shm))?$/i);
          expect(content.subarray(0, 16).toString()).not.toBe('SQLite format 3\0');
          expect(content.toString()).not.toMatch(/-----BEGIN (?:\w+ )*PRIVATE KEY-----/);
        }
        files.set(name, digest(content));
      }
    }
    return files;
  }
  const archive = path.join(root, 'downloaded export.zip'), extracted = path.join(root, 'verified export');
  await writeFile(archive, bytes, { flag: 'wx' });
  await mkdir(extracted);
  const expected = await inventory(prepared);
  const listed = execFileSync('tar.exe', ['-tf', archive], { encoding: 'utf8', windowsHide: true }).trimEnd().split(/\r?\n/);
  for (const member of listed) {
    expect(member).not.toMatch(/^(?:[\\/]|[A-Za-z]:)|(?:^|[\\/])\.\.(?:[\\/]|$)/);
    expect(member.endsWith('/') ? preparedDirectories.has(member) : expected.has(member), member).toBe(true);
  }
  expect(listed.filter(member => !member.endsWith('/')).sort()).toEqual([...expected.keys()].sort());
  execFileSync('tar.exe', ['-xf', archive, '-C', extracted], { windowsHide: true });
  const actual = await inventory(extracted, '', true);
  expect(actual).toEqual(expected);
  const releasePrefix = 'app/' + path.relative(appRoot, release.compositionRoot).split(path.sep).join('/') + '/';
  let frozenFilesVerified = 0;
  for (const [relative, hash] of Object.entries(release.files)) {
    if (relative.split('/').includes('node_modules')) continue; // Existing portable export exclusions.
    expect(actual.get(releasePrefix + relative), relative).toBe(hash);
    frozenFilesVerified++;
  }
  expect(frozenFilesVerified).toBeGreaterThan(0);
  expect((await selection.read()).releaseId).toBe(release.releaseId);
  await saveJson(path.join(evidence, 'private-public-export-audit.json'), {
    publicFiles: browserRelease.publicFiles.size, exportFiles: actual.size, exportStatus: exported.status,
    downloadStatus: downloaded.status, archiveDownloadVerified: true, archiveSha256: digest(bytes), archiveBytes: bytes.length,
    releaseId: release.releaseId, frozenFilesVerified, deniedExport: deniedExport.status, deniedDownload: deniedDownload.status,
    anonymousDownload: anonymousDownload.status, invalidDownload: invalidDownload.status, privateByteMatches: 0,
    credentialOrPrivateStoreFiles: 0, privateOwnerOutsideApplicationAndPublicBuild: true,
  });
  const endpoints:any={};for(const kind of ['data','runtime','management']){const p=await port(),rpcPort=await port();endpoints[kind]={port:p,rpcPort,url:`https://127.0.0.1:${p}/`,rpc:`https://127.0.0.1:${rpcPort}/`,rpcAudience:kind+'-rpc-'+randomUUID(),actorAudience:kind+'-actor-'+randomUUID()};}
  const managementPublic=path.join(root,'management-public');await mkdir(managementPublic);
  await build({stdin:{contents:`import {mountRoleAdministration} from ${JSON.stringify(path.resolve('src/client/artifact-editor/role-administration.ts').replaceAll('\\','/'))};
    mountRoleAdministration(document.body,async(url,body)=>{const s=await fetch('/auth/session').then(r=>r.json());const r=await fetch(url,{method:body?'POST':'GET',headers:body?{'content-type':'application/json','x-uib-csrf':s.csrf}:{},body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error('Management request refused');return r.json();});`,resolveDir:process.cwd(),sourcefile:'management-entry.ts'},bundle:true,format:'esm',outfile:path.join(managementPublic,'management.js')});
  await writeFile(path.join(managementPublic,'index.html'),'<!doctype html><title>Protected management</title><script type="module" src="/management.js"></script>');
  const mgmtFiles=[];for(const name of ['index.html','management.js']){const bytes=await readFile(path.join(managementPublic,name));mgmtFiles.push({route:name==='index.html'?'/':'/'+name,file:name,sha256:digest(bytes),mediaType:name.endsWith('.js')?'text/javascript':'text/html'});}await saveJson(path.join(managementPublic,'public-manifest.json'),{files:mgmtFiles});
  const worker=path.resolve('diagnostics/stage5-integration-worker.mjs');await mkdir(path.dirname(worker),{recursive:true});await build({entryPoints:['tests/fixtures/stage5-integration-process.ts'],bundle:true,platform:'node',format:'esm',external:['@ui-platform/*'],outfile:worker,logLevel:'silent'});
  const deploymentRoot=process.env.UI_PLATFORM_RETAINED_RELEASE_JOURNEY === '1' ? path.join(root,'deployment') : undefined;
  if(deploymentRoot){
    const artifact=path.join(root,'deployment-initial-artifact');
    await mkdir(path.join(artifact,'public'),{recursive:true});
    const routes=[];
    const compiled=JSON.parse(await readFile(path.join(publicRoot,'public-manifest.json'),'utf8'));
    for(const [index,entry] of compiled.files.entries()){
      const bytes=await readFile(path.join(publicRoot,entry.file));
      expect(digest(bytes)).toBe(entry.sha256);
      const file='public/'+index;
      await writeFile(path.join(artifact,file),bytes);
      routes.push({route:entry.route,file,mediaType:entry.mediaType});
    }
    await saveJson(path.join(artifact,'release-selection.json'),{version:1,releaseId:release.releaseId,schemaIdentity,
      compositionDigest:digest(JSON.stringify(release.files)),publicFiles:routes});
    const manifest:RuntimeManifest={manifestVersion:1,applicationId,buildId:release.releaseId,builtAt:new Date().toISOString(),
      sourceFingerprint:digest(JSON.stringify(release.files)),uiPlatformVersion:'local-stage5',
      runtimeCompatibility:{node:process.versions.node.split('.')[0]!,target:`${process.platform}-${process.arch}`},
      entryPoint:routes.find(entry=>entry.route==='/application.js')!.file,requiredEnvironmentKeys:[],migrationIdsIncluded:[],migrationChecksums:{},
      files:await filesUnder(artifact),artifacts:[],validationReport:'release-selection.json'};
    await saveJson(path.join(artifact,'runtime-manifest.json'),manifest);
    const target=new LocalDirectoryDeploymentTarget({root:deploymentRoot,async health(){throw Error('INITIAL_BOOTSTRAP_ONLY');},async activate(){},async oldRuntimeCompatible(){return false;}});
    await target.stage(artifact,manifest);
    await target.promote(manifest);
    const {binding}=await target.readVerifiedActive(applicationId);
    await saveJson(path.join(evidence,'durable-initial-binding.json'),{buildId:binding.buildId,manifestFingerprint:binding.manifestFingerprint});
  }
  const processes:any={};
  let restartServing: typeof deployment.serving | undefined;
  const startProcesses=async()=>{
  for(const kind of ['data','runtime','management']){
    const ownRoot=path.join(secrets,kind);for(const p of peers)await writeFile(path.join(ownRoot,p.id+'.pub'),p.publicKey);
    const cfg:any={kind,keyFile:path.join(ownRoot,'signing.key'),caFile:path.join(ownRoot,'ca.pem'),certFile:path.join(ownRoot,'tls.pem'),tlsKeyFile:path.join(ownRoot,'tls.key'),peers:peers.map(p=>({id:p.id,fingerprint:p.fingerprint,publicKeyFile:path.join(ownRoot,p.id+'.pub')})),endpoints,applicationId,managementApplicationId,issuer};
    if(kind==='data')Object.assign(cfg,{policyFile:policyPath,enrollmentFile,templateRegistry:path.join(integration,'templates.sqlite'),applicationRoot:appRoot,schemaIdentity,privateRoot,privateAssetId:'stage5-private',privateVersion:privateVersion.version,publicRoots:[apps,publicRoot],authorityId:V1_AUTHORITY_ID,applied:{...deployment,identity:{enabled:false,token:'',userId:'',applicationId,authorityId:V1_AUTHORITY_ID}}});
    else Object.assign(cfg,{enrollmentApplicationId:kind==='runtime'?applicationId:managementApplicationId,clientId:kind+'-fixture-client',origin:`https://${kind==='management'?'localhost':'127.0.0.1'}:${endpoints[kind].port}`,sessionUsers:kind==='runtime'?[editor.id,viewer.id,admin.id]:[admin.id,applicationAdmin.id,editor.id],releaseId:kind==='runtime'?release.releaseId:'management',publicRoot:kind==='runtime'?publicRoot:managementPublic,publicManifest:path.join(kind==='runtime'?publicRoot:managementPublic,'public-manifest.json'),applicationKeys:{'wp5c-created':applicationId,platform:'platform'}});
    if(deploymentRoot&&kind!=='management')Object.assign(cfg,{deploymentRoot,applicationRoot:appRoot,schemaIdentity,retainDataOwner:kind==='data'});
    if(restartServing && kind==='data')cfg.applied.serving=restartServing;
    if(deploymentRoot && process.env.UI_PLATFORM_CONTROLLED_PROMOTION==='1' && !restartServing) {
      if(kind==='data')Object.assign(cfg,{approvedReleaseTransitionFile:path.join(deploymentRoot,'approved-transition.json'),
        recoveryWitness:process.env.UI_PLATFORM_RECOVERY_WITNESS,drainWitness:process.env.UI_PLATFORM_DRAIN_WITNESS==='1',
        writerWitness:process.env.UI_PLATFORM_WRITER_WITNESS==='1'});
      if(kind==='management')cfg.controlledDeployment=true;
    }
    if(deploymentRoot)cfg.transitionNegativeWitness=process.env.UI_PLATFORM_TRANSITION_NEGATIVES==='1';
    if(deploymentRoot&&process.env.UI_PLATFORM_ROLLBACK_WITNESS){
      if(kind==='data')cfg.approvedRollbackFile=path.join(deploymentRoot,'approved-rollback.json');
      else cfg.rollbackWitness=true;
    }
    const configFile=path.join(ownRoot,'process.json');await saveJson(configFile,cfg);
    const args=kind==='data'?[]:['--permission',`--allow-fs-read=${path.dirname(process.cwd())}`,`--allow-fs-read=${ownRoot}`,`--allow-fs-read=${cfg.publicRoot}`,...(deploymentRoot&&kind==='runtime'?[`--allow-fs-read=${deploymentRoot}`]:[])];
    const child=spawn(process.execPath,[...args,worker],{cwd:process.cwd(),windowsHide:true,env:{...process.env,STAGE5_LOCAL_PROCESS_CONFIG:configFile,...(cfg.retainDataOwner?{NODE_ENV:'development'}:{})},stdio:['ignore','pipe','pipe','ipc']});
    cleanup.push(async()=>{if(child.exitCode===null){const end=new Promise<void>(r=>child.once('exit',()=>r()));if(cfg.retainDataOwner&&child.connected)child.disconnect();else child.kill();await end;}});
    processes[kind]=await new Promise<any>((resolve,reject)=>{let text='',errors='';const timer=setTimeout(()=>reject(new Error('PROCESS_START_TIMEOUT '+kind)),30_000);child.stdout!.on('data',b=>{text+=String(b);if(text.includes('\n')){clearTimeout(timer);resolve(JSON.parse(text.split('\n')[0]!));}});child.stderr!.on('data',b=>errors+=String(b));child.once('exit',code=>{clearTimeout(timer);reject(new Error('PROCESS_START_FAILED '+kind+' '+code+' '+errors));});});
    processes[kind].child=child;
  }
  };
  await startProcesses();
  expect(new Set(Object.values(processes).map((p:any)=>p.pid)).size).toBe(3);
  console.log('Stage 5 integration: separate Data, runtime and management processes started');
  const browser=page.context().browser(),context=await browser.newContext({ignoreHTTPSErrors:true});cleanup.push(()=>context.close());
  const runtimeUrl=`https://127.0.0.1:${endpoints.runtime.port}`,managementUrl=`https://localhost:${endpoints.management.port}`,runtimePage=await context.newPage();
  await runtimePage.goto(runtimeUrl+'/inventory');expect((await context.request.get(runtimeUrl+'/inventory')).status()).toBe(200);await runtimePage.screenshot({path:path.join(evidence,'anonymous-public.png'),fullPage:true});
  const runtimeBundleHash = async () => {
    const response = await context.request.get(runtimeUrl + '/application.js');
    expect(response.status()).toBe(200);
    return digest(await response.body());
  };
  const servedA = await runtimeBundleHash();
  expect(servedA).toBe(browserRelease.publicFiles.get('/application.js')?.sha256);
  const preparation = `
    import {preparePresentationCandidate} from './src/server/application-presentation.ts';
    import {readApplicationOwnerId} from './src/server/applications.ts';
    const key = 'wp5c-created';
    const status = await preparePresentationCandidate(key, async () => {
      if (await readApplicationOwnerId(key) !== ${JSON.stringify(applicationId)}) throw Error('CANDIDATE_OWNER_MISMATCH');
    });
    console.log(JSON.stringify({activeVersion:status.manifest.activeVersion,version:status.manifest.versions.at(-1).version}));`;
  const preparationOutput = execFileSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', preparation], {
    cwd: process.cwd(), encoding: 'utf8', env: { ...process.env, UI_APPS_DIR: apps, UI_RUNTIME_DIR: runtime }, windowsHide: true, timeout: 30_000,
  });
  const preparedRelease = JSON.parse(preparationOutput.trim().split(/\r?\n/).at(-1)!);
  expect(preparedRelease.version).toBeGreaterThan(preparedRelease.activeVersion);
  const candidate = await selection.readPublishedVersion(preparedRelease.version);
  const candidateBrowser = await buildReleasedBrowser(appRoot, process.cwd(), candidate, path.join(root, 'candidate-public'));
  expect(candidate.releaseId).not.toBe(release.releaseId);
  expect(candidateBrowser.releaseId).toBe(candidate.releaseId);
  expect(await selection.read()).toEqual(release);
  expect(await runtimeBundleHash()).toBe(servedA);
  expect(candidateBrowser.publicFiles.get('/application.js')?.sha256).not.toBe(servedA);
  await saveJson(path.join(evidence, 'frozen-release-candidate.json'), {
    activeRelease: release.releaseId, candidateRelease: candidate.releaseId, schemaIdentity, activeVersion: preparedRelease.activeVersion,
    candidateVersion: preparedRelease.version, candidateFiles: candidate.files, candidateBrowserHash: candidateBrowser.publicFiles.get('/application.js')?.sha256,
    servedAHashBeforeAndAfter: servedA,
  });
  const sessionFor=(kind:string,id:string)=>processes[kind].sessions.find((s:any)=>s.userId===id);
  const use=async(kind:string,id:string)=>{const s=sessionFor(kind,id);await context.addCookies([{name:'__Host-uib_session',value:s.token,url:kind==='runtime'?runtimeUrl:managementUrl,secure:true,httpOnly:true,sameSite:'Lax'}]);return s;};
  if(deploymentRoot && process.env.UI_PLATFORM_CONTROLLED_PROMOTION==='1'){
    const {MigrationEngine,JsonFileMigrationProvider,FileSystemArtifactService}=await import('@ui-platform/artifacts');
    const artifact=path.join(root,'deployment-candidate-artifact');
    await mkdir(path.join(artifact,'public'),{recursive:true});
    const routes=[];
    for(const [route,entry] of candidateBrowser.publicFiles){
      const file='public/'+routes.length;
      expect(digest(entry.bytes)).toBe(entry.sha256);
      await writeFile(path.join(artifact,file),entry.bytes);
      routes.push({route,file,mediaType:entry.mediaType});
    }
    await saveJson(path.join(artifact,'release-selection.json'),{version:preparedRelease.version,releaseId:candidate.releaseId,schemaIdentity,
      compositionDigest:digest(JSON.stringify(candidate.files)),publicFiles:routes});
    const manifest:RuntimeManifest={manifestVersion:1,applicationId,buildId:candidate.releaseId,builtAt:new Date().toISOString(),
      sourceFingerprint:digest(JSON.stringify(candidate.files)),uiPlatformVersion:'local-stage5',
      runtimeCompatibility:{node:process.versions.node.split('.')[0]!,target:process.platform+'-'+process.arch},
      entryPoint:routes.find(entry=>entry.route==='/application.js')!.file,requiredEnvironmentKeys:[],migrationIdsIncluded:[],migrationChecksums:{},
      files:await filesUnder(artifact),artifacts:[],validationReport:'release-selection.json'};
    await saveJson(path.join(artifact,'runtime-manifest.json'),manifest);
    const datasetFiles={};
    const provider=new JsonFileMigrationProvider({environmentRoot:deploymentRoot,environmentId:deployment.pin.environmentId,production:false,
      dataRoot:deployment.paths.ormData,datasetFiles,async setMaintenance(){throw Error('SCHEMA_MIGRATION_NOT_AUTHORIZED');}});
    await provider.initialize([]);
    const migrations=new MigrationEngine({root:appRoot,applicationId,provider,service:new FileSystemArtifactService({root:appRoot}),async authorize(){return false;}});
    const target=new LocalDirectoryDeploymentTarget({root:deploymentRoot,async health(){throw Error('PREFLIGHT_ONLY');},async activate(){throw Error('PREFLIGHT_ONLY');},async oldRuntimeCompatible(){return false;}});
    const service=new DeploymentService({root:appRoot,applicationId,migrations,target,async environment(){return {};},async authorize(){return false;}});
    const plan=await service.preflight(artifact);
    expect(plan.migrations).toEqual([]);
    const approval={planId:plan.planId,applicationId,buildId:manifest.buildId,manifestFingerprint:plan.manifestFingerprint};
    await saveJson(path.join(deploymentRoot,'approved-transition.json'),{...approval,releaseId:candidate.releaseId,datasetFiles});
    const invoke=(kind:string,operation:string,input:unknown,wrongAudience:boolean|string=false)=>new Promise<any>((resolve,reject)=>{
      const child=processes[kind].child,id=randomUUID();
      const timer=setTimeout(()=>{child.off('message',receive);reject(Error('MANAGEMENT_TRANSITION_TIMEOUT'));},35_000);
      const receive=(message:any)=>{if(message.id!==id)return;clearTimeout(timer);child.off('message',receive);resolve(message);};
      child.on('message',receive);
      child.send({operation,id,approval:input,wrongAudience});
    });
    const transitionNegatives=process.env.UI_PLATFORM_TRANSITION_NEGATIVES==='1';
    const refusals:Record<string,boolean>={};
    if(transitionNegatives){
      const before=(await target.readVerifiedActive(applicationId)).binding;
      const denyTransition=async(name:string,kind:string,input:unknown,wrongAudience=false)=>{
        const response=await invoke(kind,'negative-transition',input,wrongAudience);
        refusals[name]=response.done===false;
        expect(refusals[name]).toBe(true);
        expect((await target.readVerifiedActive(applicationId)).binding).toEqual(before);
      };
      await denyTransition('runtime-identity','runtime',approval);
      await denyTransition('wrong-audience','management',approval,true);
      for(const key of ['planId','applicationId','buildId','manifestFingerprint']){
        await denyTransition('wrong-'+key,'management',{...approval,[key]:'incorrect'});
      }
      await saveJson(path.join(evidence,'transition-negatives.json'),{refusals,unchanged:before});
    }
    const drain=process.env.UI_PLATFORM_DRAIN_WITNESS==='1';
    const dataChild=processes.data.child;
    const witnessEvents:any[]=[];
    const waitWitness=(witness:string)=>new Promise<any>((resolve,reject)=>{
      const timer=setTimeout(()=>{dataChild.off('message',receive);reject(Error('DRAIN_WITNESS_TIMEOUT '+witness));},12_000);
      const receive=(message:any)=>{if(message.witness!==witness)return;clearTimeout(timer);dataChild.off('message',receive);witnessEvents.push(message);resolve(message);};
      dataChild.on('message',receive);
    });
    const request=async(data:unknown)=>context.request.post(runtimeUrl+'/runtime/execute',{
      headers:{origin:runtimeUrl,'x-uib-csrf':sessionFor('runtime',editor.id).csrf},data});
    let heldWrite:ReturnType<typeof request>|undefined, closed:ReturnType<typeof waitWitness>|undefined;
    const recordId=randomUUID();
    if(drain){
      await use('runtime',editor.id);
      const armed=waitWitness('drain-armed');dataChild.send({operation:'arm-drain'});await armed;
      const held=waitWitness('commit-held');
      heldWrite=request({releaseId:release.releaseId,artifactId:form.metadata.artifactId,contract:'form',
        values:{operation:'create',record:{id:recordId,name:'Drain witness',quantity:7,active:true}}});
      void heldWrite.catch(()=>{});
      await held;
      closed=waitWitness('admission-closed');
    }
    const consumed=transitionNegatives?waitWitness('transition-consumed'):undefined;
    const transition=invoke('management','activate-approved',approval);
    if(consumed)await consumed;
    const concurrent=transitionNegatives?invoke('management','negative-transition',approval):undefined;
    let closedHttp:number|undefined, committed:unknown;
    if(closed){
      try {
        expect((await closed).inFlight).toBeGreaterThan(0);
        expect((await target.readVerifiedActive(applicationId)).binding.buildId).toBe(release.releaseId);
        closedHttp=(await request({releaseId:release.releaseId,artifactId:createdPage.metadata.artifactId,contract:queryContract,values:{}})).status();
        expect(closedHttp).toBe(403);
        expect((await target.readVerifiedActive(applicationId)).binding.buildId).toBe(release.releaseId);
      } finally {
        const settled=waitWitness('commit-settled');
        dataChild.send({operation:'release-commit'});
        await settled;
      }
      const response=await heldWrite!;
      expect(response.status()).toBe(200);
      committed=await response.json();
      expect(committed).toMatchObject({committed:true,commitOutcome:'committed'});
    }
    const result=await transition;
    if(concurrent){
      expect((await concurrent).done).toBe(false);
      expect((await invoke('management','negative-transition',approval)).done).toBe(false);
      await saveJson(path.join(evidence,'transition-negatives.json'),{refusals,concurrentRefused:true,duplicateRefused:true,activation:result.result});
    }
    const active=await target.readVerifiedActive(applicationId);
    const served=await runtimeBundleHash();
    await saveJson(path.join(evidence,'controlled-transition.json'),{processes:Object.fromEntries(Object.entries(processes).map(([kind,p]:any)=>[kind,p.pid])),
      approval,result:result.result??null,activeBuild:active.binding.buildId,activeManifestFingerprint:active.binding.manifestFingerprint,served,schemaIdentity});
    expect(result.done).toBe(true);
    const witness=process.env.UI_PLATFORM_RECOVERY_WITNESS;
    if(witness){
      const uncertain=witness==='uncertain';
      expect(result.result).toMatchObject({state:uncertain?'recovery-required':'failed',
        outcome:uncertain?'recovery-required':'activation-failed-prior-verified',admissionOpen:!uncertain});
      expect(active.binding.buildId).toBe(release.releaseId);
      expect(served).toBe(servedA);
      const editorSession=await use('runtime',editor.id);
      const query=await context.request.post(runtimeUrl+'/runtime/execute',{headers:{origin:runtimeUrl,'x-uib-csrf':editorSession.csrf},
        data:{releaseId:release.releaseId,artifactId:createdPage.metadata.artifactId,contract:queryContract,values:{}}});
      await saveJson(path.join(evidence,'controlled-transition-http.json'),{recoveredAQuery:query.status(),admissionOpen:result.result.admissionOpen});
      expect(query.status()).toBe(uncertain?403:200);
      return;
    }
    expect(result.result.state).toBe('succeeded');
    if(process.env.UI_PLATFORM_WRITER_WITNESS==='1'){
      expect(result.result.writerWitnesses.map((w:any)=>w.releaseId)).toEqual([release.releaseId,candidate.releaseId]);
      expect(result.result.writerWitnesses.every((w:any)=>!w.admissionOpen)).toBe(true);
      expect(result.result.admissionOpen).toBe(true);
    }
    expect(active.binding.manifestFingerprint).toBe(plan.manifestFingerprint);
    expect(served).toBe(candidateBrowser.publicFiles.get('/application.js')?.sha256);
    const editorSession=await use('runtime',editor.id);
    const execute=async (data:unknown)=>context.request.post(runtimeUrl+'/runtime/execute',{headers:{origin:runtimeUrl,'x-uib-csrf':editorSession.csrf},data});
    const stale=await execute({releaseId:release.releaseId,artifactId:form.metadata.artifactId,contract:'form',values:{operation:'create',record:{id:randomUUID(),name:'Stale',quantity:1,active:true}}});
    const live=await execute({releaseId:candidate.releaseId,artifactId:createdPage.metadata.artifactId,contract:queryContract,values:{}});
    if(drain){
      const rows=await live.json();
      expect(rows).toEqual(expect.arrayContaining([expect.objectContaining({id:recordId,name:'Drain witness',quantity:7,active:true})]));
      await saveJson(path.join(evidence,'transaction-drain.json'),{events:witnessEvents,closedHttp,committed,recordId,verifiedBRead:true});
    }
    await saveJson(path.join(evidence,'controlled-transition-http.json'),{staleWrite:stale.status(),activeQuery:live.status()});
    expect(stale.status()).toBe(403);
    expect(live.status()).toBe(200);
    const rollbackMode=process.env.UI_PLATFORM_ROLLBACK_WITNESS;
    if(rollbackMode){
      const prior=await target.readVerifiedPrior(applicationId);
      const rollbackApproval={planId:randomUUID(),applicationId,buildId:prior.binding.buildId,manifestFingerprint:prior.binding.manifestFingerprint};
      await saveJson(path.join(deploymentRoot,'approved-rollback.json'),{...rollbackApproval,releaseId:release.releaseId,
        schemaIdentity:rollbackMode==='incompatible'?'incompatible-schema':schemaIdentity,failVerification:rollbackMode==='uncertain'});
      let unauthorizedRefused=false;
      if(rollbackMode==='incompatible'){
        unauthorizedRefused=(await invoke('runtime','rollback-approved',rollbackApproval)).done===false;
        expect(unauthorizedRefused).toBe(true);
        expect((await target.readVerifiedActive(applicationId)).binding).toEqual(active.binding);
      }
      const result=await invoke(rollbackMode==='unauthorized'?'runtime':'management','rollback-approved',rollbackApproval);
      const after=await target.readVerifiedActive(applicationId);
      const servedAfter=await runtimeBundleHash();
      const restored=rollbackMode==='compatible';
      const releaseId=restored?release.releaseId:candidate.releaseId;
      const valid=await execute({releaseId,artifactId:createdPage.metadata.artifactId,contract:queryContract,values:{}});
      const stale=await execute({releaseId:restored?candidate.releaseId:release.releaseId,artifactId:createdPage.metadata.artifactId,contract:queryContract,values:{}});
      await saveJson(path.join(evidence,'controlled-rollback.json'),{mode:rollbackMode,approval:rollbackApproval,result:result.result??null,authorized:result.done,
        before:active.binding.buildId,after:after.binding.buildId,manifest:after.binding.manifestFingerprint,servedAfter,schemaIdentity,
        registryRevision:processes.data.registryRevision,valid:valid.status(),stale:stale.status(),unauthorizedRefused});
      expect(after.binding).toEqual(restored?prior.binding:active.binding);
      expect(servedAfter).toBe(restored?servedA:served);
      expect(stale.status()).toBe(403);
      expect(valid.status()).toBe(rollbackMode==='uncertain'?403:200);
      if(rollbackMode==='unauthorized')expect(result.done).toBe(false);
      else {
        expect(result.done).toBe(true);
        expect(result.result).toMatchObject({outcome:restored?'activated':rollbackMode==='uncertain'?'recovery-required':'incompatible',
          admissionOpen:rollbackMode!=='uncertain'});
      }
    }
    if(process.env.UI_PLATFORM_RESTART_WITNESS==='1'){
      const snapshot=()=>Object.fromEntries(Object.entries(processes).map(([kind,p]:any)=>[kind,{pid:p.pid,
        rpcAudience:endpoints[kind].rpcAudience,actorAudience:endpoints[kind].actorAudience}]));
      const before=snapshot(), policyHash=digest(await readFile(policyPath));
      const ormBefore=await filesUnder(deployment.paths.ormData);
      const priorSchema=processes.data.schemaIdentity, priorRegistry=processes.data.registryRevision;
      restartServing=processes.data.serving;
      expect(restartServing).toBeDefined();
      for(const kind of ['management','runtime','data']){
        const child=processes[kind].child;
        const stopped=new Promise<number|null>((resolve,reject)=>{
          const timer=setTimeout(()=>reject(Error('CONTROLLED_SHUTDOWN_TIMEOUT '+kind)),15_000);
          child.once('exit',(code:number|null)=>{clearTimeout(timer);resolve(code);});
        });
        child.disconnect();
        expect(await stopped).toBe(0);
        endpoints[kind].rpcAudience=kind+'-rpc-'+randomUUID();
        endpoints[kind].actorAudience=kind+'-actor-'+randomUUID();
      }
      await startProcesses();
      const after=snapshot();
      for(const kind of ['data','runtime','management']){
        expect(after[kind]!.pid).not.toBe(before[kind]!.pid);
        expect(after[kind]!.rpcAudience).not.toBe(before[kind]!.rpcAudience);
        expect(after[kind]!.actorAudience).not.toBe(before[kind]!.actorAudience);
      }
      expect(processes.data.schemaIdentity).toBe(priorSchema);
      expect(processes.data.registryRevision).toBe(priorRegistry);
      expect(digest(await readFile(policyPath))).toBe(policyHash);
      expect(await filesUnder(deployment.paths.ormData)).toEqual(ormBefore);
      if(transitionNegatives){
        const identity={issuer,subject:editor.id,applicationId};
        const fresh=await invoke('runtime','identity-audience-witness',identity);
        const old=await invoke('runtime','identity-audience-witness',identity,before.data!.rpcAudience);
        expect(fresh.done).toBe(true);
        expect(old.done).toBe(false);
        await saveJson(path.join(evidence,'restart-audience-negatives.json'),{freshAccepted:true,staleRefused:true,oldAudience:before.data!.rpcAudience,newAudience:after.data!.rpcAudience});
      }
      expect((await target.readVerifiedActive(applicationId)).binding).toEqual(active.binding);
      const restartedBundle=await runtimeBundleHash();
      expect(restartedBundle).toBe(served);
      const restartedEditor=await use('runtime',editor.id);
      const query=async(releaseId:string)=>context.request.post(runtimeUrl+'/runtime/execute',{
        headers:{origin:runtimeUrl,'x-uib-csrf':restartedEditor.csrf},data:{releaseId,artifactId:createdPage.metadata.artifactId,contract:queryContract,values:{}}});
      const activeResponse=await query(candidate.releaseId);
      const activeQuery=activeResponse.status(),staleQuery=(await query(release.releaseId)).status();
      if(drain)expect(await activeResponse.json()).toEqual(expect.arrayContaining([expect.objectContaining({id:recordId,name:'Drain witness',quantity:7,active:true})]));
      await saveJson(path.join(evidence,'controlled-restart.json'),{before,after,activeBuild:active.binding.buildId,
        manifestFingerprint:active.binding.manifestFingerprint,restartedBundle,schemaIdentity:priorSchema,registryRevision:priorRegistry,
        ormInventoryUnchanged:true,policyHash,activeQuery,staleQuery,...(drain?{recordId,nonemptyRecordVerified:true}:{})});
      expect(activeQuery).toBe(200);
      expect(staleQuery).toBe(403);
    }
    return;
  }
  let managementActor=admin.id;await use('management',managementActor);
  const managementPost=async(action:string,value:any,key='wp5c-created')=>{const r=await context.request.post(`${managementUrl}/api/apps/${key}/security/${action}`,{headers:{origin:managementUrl,'x-uib-csrf':sessionFor('management',managementActor).csrf},data:value});return{status:r.status(),value:await r.json()};};
  const readPolicy=()=>{const p=new SecurityDefinitionStore(policyPath);try{return p.snapshot();}finally{p.close();}};
  const boundaryDocument=readPolicy().documents.find(d=>d.definition.kind==='grant-boundary'&&d.definition.id===`initial.${applicationId}.boundary`)!;expect(boundaryDocument).toBeTruthy();
  const registration={templateId:'inventory.exclude-hidden.v1',boundaryId:boundaryDocument.definition.id,applicationId,datasetId,fieldId:field('name'),schemaIdentity,reason:'Explicit Platform authorization of the finite inventory exclusion'};
  for(const user of [editor,applicationAdmin]){managementActor=user.id;await use('management',user.id);expect((await managementPost('template-register',registration)).status).toBe(403);}
  managementActor=admin.id;await use('management',admin.id);
  for(const wrong of [{templateId:'unknown'},{fieldId:field('quantity')},{schemaIdentity:'stale'},{applicationId:'foreign-application'}])expect((await managementPost('template-register',{...registration,...wrong})).status).toBe(403);
  const registered=await managementPost('template-register',registration);expect(registered.status,JSON.stringify(registered.value)).toBe(200);
  const stageActivate=async(records:any[],key='wp5c-created')=>{const snapshot=readPolicy(),changes=records.map(definition=>{const previous=snapshot.documents.find(d=>d.definition.id===definition.id);return{document:{format:'ui-platform.security',formatVersion:1,definition},...(previous?{expectedChecksum:securityChecksum(previous)}:{})};});
    const staged=await managementPost('stage',{changes,expectedRevision:snapshot.revision,reason:'Finite-template integration through actual WP3'},key);expect(staged.status,JSON.stringify(staged.value)).toBe(200);expect(staged.value.activatable,JSON.stringify(staged.value)).toBe(true);
    const activated=await managementPost('activate',{candidateId:staged.value.id,checksum:staged.value.checksum,expectedRevision:staged.value.baseRevision,reason:'Reviewed finite-template integration'},key);expect(activated.status,JSON.stringify(activated.value)).toBe(200);expect(activated.value.status,JSON.stringify(activated.value)).toBe('activated');return{candidateId:staged.value.id,status:activated.value.status};};
  const boundary=boundaryDocument.definition as any;
  const delegation=await stageActivate([{...boundary,scope,permissions:[...boundary.permissions,...['dataset.read','ui.page.view','ui.artifact.view'].map(permissionId=>({permissionId,scope,predicateTemplateIds:permissionId==='dataset.read'?['inventory.exclude-hidden.v1']:[]}))]}],'platform');
  managementActor=applicationAdmin.id;await use('management',applicationAdmin.id);
  const viewerActivation=await stageActivate(viewerRecords);
  await saveJson(path.join(evidence,'template-activation.json'),{template:registration,representation:(viewerRecords[0] as any).rules.find((r:any)=>r.id==='stage5.row-deny'),registration:registered.value,delegation,viewerActivation,productionQualification:false});
  const ownerSettings=path.join(appRoot,'app.settings.json'),ownerBytes=await readFile(ownerSettings),ownerValue=JSON.parse(ownerBytes.toString('utf8'));let ownerRefusal=0;
  try{await saveJson(ownerSettings,{...ownerValue,application:{...ownerValue.application,status:'disabled'}});await expect(selection.read()).rejects.toThrow();const snapshot=readPolicy(),currentSet=snapshot.documents.find(d=>d.definition.id==='stage5.viewer-set')!;ownerRefusal=(await managementPost('stage',{changes:[{document:{...currentSet,definition:{...currentSet.definition,name:'Must refuse changed ownership'}},expectedChecksum:securityChecksum(currentSet)}],expectedRevision:snapshot.revision,reason:'Owning application disabled'})).status;expect(ownerRefusal).toBe(403);}
  finally{await writeFile(ownerSettings,ownerBytes);}
  expect((await selection.read()).releaseId).toBe(release.releaseId);await saveJson(path.join(evidence,'owner-binding-refusal.json'),{disabledOwnerStageStatus:ownerRefusal,releaseSelectionRefused:true,originalOwnerBytesRestored:true});
  console.log('Stage 5 integration: finite Viewer restriction activated through actual protected management and WP3');
  const editorSession=await use('runtime',editor.id);const firstQuery=runtimePage.waitForResponse((r:any)=>r.url().endsWith('/runtime/execute')&&r.request().method()==='POST'&&JSON.parse(r.request().postData()??'{}').contract===queryContract);await runtimePage.reload();const initialQuery=await firstQuery;expect(initialQuery.status()).toBe(200);expect(await initialQuery.json()).toHaveLength(0);
  await runtimePage.getByLabel('name',{exact:true}).fill('Visible A');await runtimePage.getByLabel('quantity',{exact:true}).fill('3');await runtimePage.getByLabel('active',{exact:true}).check();
  await runtimePage.getByRole('button',{name:'Submit',exact:true}).click();
  try{await expect.poll(()=>runtimePage.locator('[data-uip-node="saved-result"]').textContent(),{timeout:20_000}).toContain('Visible A');}
  catch(error){await writeFile(path.resolve('diagnostics/runtime-submit.txt'),await runtimePage.locator('[data-uip-node="submit-error"]').allTextContents().then((v:string[])=>v.join('\n')));await runtimePage.screenshot({path:path.resolve('diagnostics/runtime-submit.png'),fullPage:true});throw error;}
  await runtimePage.screenshot({path:path.join(evidence,'published-form-A-after-draft-B.png'),fullPage:true});
  const execute=async(value:any)=>runtimePage.evaluate(async(value:any)=>{const s=await fetch('/auth/session').then(r=>r.json());const r=await fetch('/runtime/execute',{method:'POST',headers:{'content-type':'application/json','x-uib-csrf':s.csrf},body:JSON.stringify(value)});return{status:r.status,value:await r.json()};},value);
  const query={releaseId:release.releaseId,artifactId:createdPage.metadata.artifactId,contract:queryContract,values:{}};
  const all=await execute(query);expect(all.status).toBe(200);expect(all.value).toHaveLength(1);
  const fault=async(operation:string)=>{const id=randomUUID(),child=processes.runtime.child;await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('FAULT_INJECTION_TIMEOUT')),10_000);const onMessage=(m:any)=>{if(m.id===id){clearTimeout(timer);child.off('message',onMessage);m.done?resolve():reject(new Error('FAULT_INJECTION_FAILED'));}};child.on('message',onMessage);child.send({id,operation});});};
  await fault('stop-status');expect((await execute(query)).status).toBe(403);await fault('start-status');expect((await execute(query)).status).toBe(200);
  const wrongRegistration={...deployment,registration:{...deployment.registration,fields:deployment.registration.fields.filter((v:any)=>v.name!=='name')}};await expect(inspectDevelopmentDataset(wrongRegistration)).rejects.toThrow();
  await expect(new ApplicationPublicationSelection(appRoot,'foreign-application',schemaIdentity).read()).rejects.toThrow();
  const hidden=await execute({releaseId:release.releaseId,artifactId:form.metadata.artifactId,contract:'form',values:{operation:'create',record:{id:randomUUID(),name:'Hidden',quantity:9,active:false}}});expect(hidden.value.committed).toBe(true);
  expect((await execute({...query,definitions:{datasetId:'forged'}})).status).toBe(403);expect((await execute({...query,releaseId:'stale'})).status).toBe(403);
  expect((await execute({...query,contract:'function:0'})).status).toBe(403);
  const assetUrl=`${runtimeUrl}/runtime/assets/stage5-private/${privateVersion.version}`;
  const metadataResponse=await context.request.get(assetUrl+'/metadata');expect(metadataResponse.status()).toBe(200);expect((await metadataResponse.json()).sha256).toBe(privateVersion.sha256);
  const download=await context.request.get(assetUrl+'/download');expect(download.status()).toBe(200);expect((await download.body()).equals(privateBytes)).toBe(true);expect(download.headers()['cache-control']).toBe('private, no-store');
  const range=await context.request.get(assetUrl+'/download',{headers:{range:'bytes=0-7'}});expect(range.status()).toBe(206);expect((await range.body()).equals(privateBytes.subarray(0,8))).toBe(true);
  expect(range.headers()['cache-control']).toBe('private, no-store');
  expect((await context.request.head(assetUrl+'/download')).status()).toBe(200);
  await runtimePage.evaluate((url:string)=>{const image=document.createElement('img');image.alt='Private thumbnail';image.src=url;document.body.append(image);},assetUrl+'/thumbnail');
  await expect.poll(()=>runtimePage.getByAltText('Private thumbnail').evaluate((img:any)=>img.naturalWidth),{timeout:30_000}).toBe(1);
  await runtimePage.screenshot({path:path.join(evidence,'private-thumbnail.png'),fullPage:true,mask:[runtimePage.getByAltText('Private thumbnail')]});
  await use('runtime',viewer.id);const viewerQuery=runtimePage.waitForResponse((r:any)=>r.url().endsWith('/runtime/execute')&&r.request().method()==='POST'&&JSON.parse(r.request().postData()??'{}').contract===queryContract);await runtimePage.reload();const viewerResponse=await viewerQuery,visible={status:viewerResponse.status(),value:await viewerResponse.json()};expect(visible.status).toBe(200);expect(visible.value).toHaveLength(1);expect(visible.value[0].name).toBe('Visible A');expect(visible.value[0]).not.toHaveProperty('quantity');
  expect((await context.request.get(assetUrl+'/metadata')).status()).toBe(200);
  const deniedWrite=await execute({releaseId:release.releaseId,artifactId:form.metadata.artifactId,contract:'form',values:{operation:'create',record:{id:randomUUID(),name:'Not allowed',quantity:1,active:true}}});expect(deniedWrite.value.committed).toBe(false);
  const managementSession=await use('management',applicationAdmin.id),managementPage=await context.newPage();await managementPage.goto(managementUrl);await managementPage.getByText('Role administration',{exact:true}).click();await managementPage.getByLabel('Administration application key',{exact:true}).fill('wp5c-created');await managementPage.getByRole('button',{name:'Refresh role assignments',exact:true}).click();
  expect((await context.request.get(managementUrl+'/api/apps/foreign-application/security/roles')).status()).toBe(403);
  await expect.poll(()=>managementPage.locator('[role=status]').textContent(),{timeout:30_000}).toContain('Assignments loaded');
  await managementPage.getByLabel('Administration reason',{exact:true}).fill('Local current-policy revocation');await managementPage.getByLabel('Current assignment',{exact:true}).selectOption('stage5.viewer-assignment');await managementPage.getByRole('button',{name:'Stage role revocation',exact:true}).click();await expect.poll(()=>managementPage.locator('[role=status]').textContent(),{timeout:30_000}).toContain('Candidate staged');await managementPage.getByRole('button',{name:'Activate role change',exact:true}).click();await expect.poll(()=>managementPage.locator('[role=status]').textContent(),{timeout:30_000}).toContain('Role change activated');
  await managementPage.screenshot({path:path.join(evidence,'protected-management-revocation.png'),fullPage:true});
  expect((await execute(query)).status).toBe(403);expect((await context.request.get(assetUrl+'/metadata')).status()).toBe(403);expect((await context.request.get(assetUrl+'/download',{headers:{range:'bytes=0-7'}})).status()).toBe(403);
  // A distinct admitted service call invalidates the runtime epoch; the open browser cookie is not rotated into authority.
  const revoke=await managementPage.evaluate(async(userId:string)=>{const s=await fetch('/auth/session').then(r=>r.json());return(await fetch('/api/apps/wp5c-created/security/revoke-sessions',{method:'POST',headers:{'content-type':'application/json','x-uib-csrf':s.csrf},body:JSON.stringify({userId})})).status;},editor.id);expect(revoke).toBe(200);await use('runtime',editor.id);expect((await context.request.get(runtimeUrl+'/auth/session')).status()).toBe(403);
  await use('runtime',viewer.id);expect((await context.request.get(runtimeUrl+'/auth/session')).status()).toBe(200);
  managementActor=admin.id;await use('management',admin.id);const viewerUser=readPolicy().documents.find(d=>d.definition.kind==='user'&&d.definition.id===viewer.id)!.definition;
  await stageActivate([{...viewerUser,status:'inactive'}],'platform');expect((await context.request.get(runtimeUrl+'/auth/session')).status()).toBe(403);
  // Staging before independent template revocation must not preserve usable authority.
  managementActor=applicationAdmin.id;await use('management',applicationAdmin.id);const beforeRevoke=readPolicy(),viewerSet=beforeRevoke.documents.find(d=>d.definition.id==='stage5.viewer-set')!;
  const pending=await managementPost('stage',{changes:[{document:{...viewerSet,definition:{...viewerSet.definition,name:'Pending template change'}},expectedChecksum:securityChecksum(viewerSet)}],expectedRevision:beforeRevoke.revision,reason:'Template revocation freshness check'});expect(pending.value.activatable).toBe(true);
  managementActor=admin.id;await use('management',admin.id);expect((await managementPost('template-revoke',{templateId:'inventory.exclude-hidden.v1',reason:'Explicit end-of-qualification revocation'})).status).toBe(200);
  managementActor=applicationAdmin.id;await use('management',applicationAdmin.id);const refused=await managementPost('activate',{candidateId:pending.value.id,checksum:pending.value.checksum,expectedRevision:pending.value.baseRevision,reason:'Must fail after template revocation'});await saveJson(path.join(evidence,'template-revocation-response.json'),refused);expect(refused.value.status,JSON.stringify(refused)).toBe('rejected');expect(refused.value.diagnostics.map((d:any)=>d.code)).toContain('ADMIN_TEMPLATE_BINDING_STALE');
  for(const url of ['/api/apps','/api/application-data/queries','/api/development-identity/session','/management','/private-store/versions.sqlite','/runtime/assets/%2e%2e/v1/download'])expect((await context.request.get(runtimeUrl+url)).status()).toBeGreaterThanOrEqual(400);
  await context.clearCookies();expect((await context.request.get(assetUrl+'/thumbnail')).status()).toBe(403);
  const templateAuditDb=new DatabaseSync(path.join(integration,'templates.sqlite'),{readOnly:true});
  try{const audit=templateAuditDb.prepare('SELECT seq,action,actor,body FROM template_audit ORDER BY seq').all().map(row=>({...row,body:JSON.parse(String(row.body))}));expect(audit.map(row=>row.action)).toEqual(['register','revoke']);await saveJson(path.join(evidence,'template-audit.json'),audit);}finally{templateAuditDb.close();}
  const auditPolicy=new SecurityDefinitionStore(policyPath);try{await saveJson(path.join(evidence,'policy-administration-audit.json'),auditPolicy.adminAudit().map(a=>({actorId:a.actorId,operation:a.operation,authorityPath:a.authorityPath,targetIds:a.targetIds,reason:a.reason,beforeDigest:a.beforeDigest,afterDigest:a.afterDigest})));}finally{auditPolicy.close();}
  await saveJson(path.join(evidence,'integration-results.json'),{environment:'Windows loopback HTTPS; three independently credentialed processes; runtime/management Node filesystem permissions; local enrolled sessions, no live Auth0',applicationId,datasetId,releaseId:release.releaseId,schemaIdentity,applied:{schemaVersion:applied.schemaVersion,schemaDigest:applied.schemaDigest,fields:applied.fields},processes:Object.fromEntries(Object.entries(processes).map(([kind,p]:any)=>[kind,{pid:p.pid}])),publication:'actual Builder Publish v1',draftB:'Field editable=false saved after A',formA:'browser committed and read back',viewer:{rows:visible.value.length,quantityOmitted:true,hiddenRowOmitted:true,writeDenied:true},private:{metadata:200,download:200,thumbnailDecoded:true,head:200,range:206,privateNoStore:true,revoked:403,anonymous:403},managementRevocation:403,sessionEpochRevocation:403,disabledUserSession:403,templateRevocationStaleCandidateRefused:true,proofBudgetMs:15000,defaultProofBudgetUnchangedMs:1000,productionQualification:false});
}


















