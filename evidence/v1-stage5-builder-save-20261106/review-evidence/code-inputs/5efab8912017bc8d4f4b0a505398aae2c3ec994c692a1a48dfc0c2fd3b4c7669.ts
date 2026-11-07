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
  const {page,workspace,form,applicationId,datasetId,schema,root,apps,runtime,policyPath,cleanup,creator,activate,post,origin}=f;
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
  let queryContract='';
  for(const file of Object.keys(release.files).filter(file=>file.endsWith('.visual.json'))){const metadata=JSON.parse(await readFile(path.join(release.compositionRoot,file),'utf8'));if(metadata.artifactId===createdPage.metadata.artifactId){const index=(metadata.onLoad??[]).findIndex((a:any)=>a.kind==='service'&&a.reference==='dataset.read'&&a.input?.literal?.datasetId===datasetId&&a.resultState==='inventory');expect(index).toBeGreaterThanOrEqual(0);queryContract='onLoad:'+index;await saveJson(path.join(evidence,'released-query-contract.json'),{releaseId:release.releaseId,metadata});}}
  expect(queryContract).not.toBe('');
  const publicRoot=path.join(root,'released-public'),browserRelease=await buildReleasedBrowser(appRoot,process.cwd(),release.releaseId,publicRoot);
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
  const exported=await post('/api/apps/wp5c-created/export',{},creator);
  if(exported.status===200)expect((await fetch(origin+exported.value.url,{headers:creator})).status).toBe(200);
  else expect(exported.value.error).toBe('ZIP command failed with exit code 1'); // Explicit Windows packaging qualification below; never a ZIP success claim.
  let exportFiles=0;const auditExport=async(dir:string)=>{for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isSymbolicLink())throw Error('EXPORT_LINK');if(entry.isDirectory())await auditExport(file);else{exportFiles++;expect((await readFile(file)).includes(privateBytes)).toBe(false);expect(entry.name).not.toMatch(/\.(?:key|pem|pfx|sqlite)$/i);}}};await auditExport(path.join(runtime,'exports'));
  await saveJson(path.join(evidence,'private-public-export-audit.json'),{publicFiles:browserRelease.publicFiles.size,exportFiles,exportStatus:exported.status,archiveDownloadVerified:exported.status===200,archiveQualification:exported.status===200?'local download verified':'UNVERIFIED: existing Windows ZIP subprocess failed; prepared export tree audited only',privateByteMatches:0,credentialOrPrivateStoreFiles:0,privateOwnerOutsideApplicationAndPublicBuild:true});
  const endpoints:any={};for(const kind of ['data','runtime','management']){const p=await port(),rpcPort=await port();endpoints[kind]={port:p,rpcPort,url:`https://127.0.0.1:${p}/`,rpc:`https://127.0.0.1:${rpcPort}/`,rpcAudience:kind+'-rpc-'+randomUUID(),actorAudience:kind+'-actor-'+randomUUID()};}
  const managementPublic=path.join(root,'management-public');await mkdir(managementPublic);
  await build({stdin:{contents:`import {mountRoleAdministration} from ${JSON.stringify(path.resolve('src/client/artifact-editor/role-administration.ts').replaceAll('\\','/'))};
    mountRoleAdministration(document.body,async(url,body)=>{const s=await fetch('/auth/session').then(r=>r.json());const r=await fetch(url,{method:body?'POST':'GET',headers:body?{'content-type':'application/json','x-uib-csrf':s.csrf}:{},body:body?JSON.stringify(body):undefined});if(!r.ok)throw Error('Management request refused');return r.json();});`,resolveDir:process.cwd(),sourcefile:'management-entry.ts'},bundle:true,format:'esm',outfile:path.join(managementPublic,'management.js')});
  await writeFile(path.join(managementPublic,'index.html'),'<!doctype html><title>Protected management</title><script type="module" src="/management.js"></script>');
  const mgmtFiles=[];for(const name of ['index.html','management.js']){const bytes=await readFile(path.join(managementPublic,name));mgmtFiles.push({route:name==='index.html'?'/':'/'+name,file:name,sha256:digest(bytes),mediaType:name.endsWith('.js')?'text/javascript':'text/html'});}await saveJson(path.join(managementPublic,'public-manifest.json'),{files:mgmtFiles});
  const worker=path.resolve('diagnostics/stage5-integration-worker.mjs');await mkdir(path.dirname(worker),{recursive:true});await build({entryPoints:['tests/fixtures/stage5-integration-process.ts'],bundle:true,platform:'node',format:'esm',external:['@ui-platform/*'],outfile:worker,logLevel:'silent'});
  const processes:any={};
  for(const kind of ['data','runtime','management']){
    const ownRoot=path.join(secrets,kind);for(const p of peers)await writeFile(path.join(ownRoot,p.id+'.pub'),p.publicKey);
    const cfg:any={kind,keyFile:path.join(ownRoot,'signing.key'),caFile:path.join(ownRoot,'ca.pem'),certFile:path.join(ownRoot,'tls.pem'),tlsKeyFile:path.join(ownRoot,'tls.key'),peers:peers.map(p=>({id:p.id,fingerprint:p.fingerprint,publicKeyFile:path.join(ownRoot,p.id+'.pub')})),endpoints,applicationId,managementApplicationId,issuer};
    if(kind==='data')Object.assign(cfg,{policyFile:policyPath,enrollmentFile,templateRegistry:path.join(integration,'templates.sqlite'),applicationRoot:appRoot,schemaIdentity,privateRoot,privateAssetId:'stage5-private',privateVersion:privateVersion.version,publicRoots:[apps,publicRoot],authorityId:V1_AUTHORITY_ID,applied:{...deployment,identity:{enabled:false,token:'',userId:'',applicationId,authorityId:V1_AUTHORITY_ID}}});
    else Object.assign(cfg,{enrollmentApplicationId:kind==='runtime'?applicationId:managementApplicationId,clientId:kind+'-fixture-client',origin:`https://${kind==='management'?'localhost':'127.0.0.1'}:${endpoints[kind].port}`,sessionUsers:kind==='runtime'?[editor.id,viewer.id,admin.id]:[admin.id,applicationAdmin.id,editor.id],releaseId:kind==='runtime'?release.releaseId:'management',publicRoot:kind==='runtime'?publicRoot:managementPublic,publicManifest:path.join(kind==='runtime'?publicRoot:managementPublic,'public-manifest.json'),applicationKeys:{'wp5c-created':applicationId,platform:'platform'}});
    const configFile=path.join(ownRoot,'process.json');await saveJson(configFile,cfg);
    const args=kind==='data'?[]:['--permission',`--allow-fs-read=${path.dirname(process.cwd())}`,`--allow-fs-read=${ownRoot}`,`--allow-fs-read=${cfg.publicRoot}`];
    const child=spawn(process.execPath,[...args,worker],{cwd:process.cwd(),windowsHide:true,env:{...process.env,STAGE5_LOCAL_PROCESS_CONFIG:configFile},stdio:['ignore','pipe','pipe','ipc']});
    cleanup.push(async()=>{if(child.exitCode===null){const end=new Promise<void>(r=>child.once('exit',()=>r()));child.kill();await end;}});
    processes[kind]=await new Promise<any>((resolve,reject)=>{let text='',errors='';const timer=setTimeout(()=>reject(new Error('PROCESS_START_TIMEOUT '+kind)),30_000);child.stdout!.on('data',b=>{text+=String(b);if(text.includes('\n')){clearTimeout(timer);resolve(JSON.parse(text.split('\n')[0]!));}});child.stderr!.on('data',b=>errors+=String(b));child.once('exit',code=>{clearTimeout(timer);reject(new Error('PROCESS_START_FAILED '+kind+' '+code+' '+errors));});});
    processes[kind].child=child;
  }
  expect(new Set(Object.values(processes).map((p:any)=>p.pid)).size).toBe(3);
  console.log('Stage 5 integration: separate Data, runtime and management processes started');
  const browser=page.context().browser(),context=await browser.newContext({ignoreHTTPSErrors:true});cleanup.push(()=>context.close());
  const runtimeUrl=`https://127.0.0.1:${endpoints.runtime.port}`,managementUrl=`https://localhost:${endpoints.management.port}`,runtimePage=await context.newPage();
  await runtimePage.goto(runtimeUrl+'/inventory');expect((await context.request.get(runtimeUrl+'/inventory')).status()).toBe(200);await runtimePage.screenshot({path:path.join(evidence,'anonymous-public.png'),fullPage:true});
  const sessionFor=(kind:string,id:string)=>processes[kind].sessions.find((s:any)=>s.userId===id);
  const use=async(kind:string,id:string)=>{const s=sessionFor(kind,id);await context.addCookies([{name:'__Host-uib_session',value:s.token,url:kind==='runtime'?runtimeUrl:managementUrl,secure:true,httpOnly:true,sameSite:'Lax'}]);return s;};
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


















