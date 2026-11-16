import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile, rm, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { appsDir } from '../src/server/paths.js';
import { VisualArtifactService } from '../src/server/visual-artifacts.js';
import { createCliReadonly } from '../src/server/cli-readonly.js';

async function fixture() {
 const key='cli-mutations-'+crypto.randomUUID(),root=path.join(appsDir,key),id=crypto.randomUUID();
 await mkdir(root,{recursive:true});
 const manifest={manifestVersion:'1.0.0',appId:id,template:'standard',templateVersion:'2.0.0',packages:{}};
 await writeFile(path.join(root,'app.manifest.json'),JSON.stringify(manifest));await writeFile(path.join(root,'package.json'),JSON.stringify({name:key,dependencies:{}}));
 const shells=new VisualArtifactService(path.join(root,'shells'),'shell');const first=await shells.create('first'),second=await shells.create('second');
 const settings:any={presentation:{model:'composition-v1',defaultShellId:first.metadata!.artifactId,theme:{},siteStyles:[],branding:{applicationName:'Disposable'},assetsRoot:'assets'}};
 const saveSettings=()=>writeFile(path.join(root,'app.settings.json'),JSON.stringify(settings));await saveSettings();
 let permitted=true,shellPermitted=true,active=true,revokeAtAdmission=false;
 const identity:any={bindCliRequest(){if(!active)throw Error('CLI_UNAUTHENTICATED');},currentUser:()=>active?'editor':null,policyDigest:()=> 'policy',
 authorize:async(_r:any,permission:string)=>permission==='ui.application.view'||permission==='ui.page.view'||(permission==='ui.presentation.view'?shellPermitted:permitted),
 captureCliEditorPrincipal(){return ()=>{if(!active)throw Error('CLI_UNAUTHENTICATED');};},captureAdmission(_r:any,permission:string){return async()=>{if(revokeAtAdmission&&permission==='ui.page.edit')active=false;if(!active||!await identity.authorize(_r,permission))throw Error('V1_PERMISSION_DENIED');};}};
 const registry:any={byApplicationId:(value:string)=>value===id?{key}:undefined};
 const cli=createCliReadonly(identity,{} as any,registry,async()=>[]);
 async function invoke(method:string,body?:unknown,page?:string,app=id){const req:any=Readable.from(body===undefined?[]:[JSON.stringify(body)]);Object.assign(req,{method,url:'/api/cli/'+(page?'page':'pages')+'?app='+app+(page?'&page='+page:''),headers:{},socket:{remoteAddress:'127.0.0.1'}});let status=0,text='';await cli(req,{writeHead(value:number){status=value;return this;},end(value:string){text=value;}} as any);return {status,data:JSON.parse(text)};}
 const service=new VisualArtifactService(path.join(root,'src/pages'),'page');
 return {root,id,key,first,second,settings,saveSettings,service,invoke,deny:()=>permitted=false,allow:()=>permitted=true,denyShell:()=>shellPermitted=false,revoke:()=>revokeAtAdmission=true,close:()=>rm(root,{recursive:true,force:true})};
}

test('CLI creation defaults/overrides/plain, Shell and route validation, normal update and revision protection',async()=>{
 const f=await fixture();try{
  let r=await f.invoke('POST',{name:'default',route:'/default'});assert.equal(r.status,201,JSON.stringify(r.data));assert.equal(r.data.mode,'composed');assert.equal(r.data.shellId,f.first.metadata!.artifactId);assert.match(r.data.id,/^art_/);const created=r.data;
  let bundle=await f.service.read('default/page.visual.json');assert.ok(bundle.metadata!.routeId);
  r=await f.invoke('POST',{name:'override',route:'/override',shell:f.second.metadata!.artifactId});assert.equal(r.status,201);assert.equal(r.data.shellId,f.second.metadata!.artifactId);
  r=await f.invoke('POST',{name:'plain',route:'/plain',mode:'plain'});assert.equal(r.status,201);assert.equal(r.data.mode,'plain');assert.equal(r.data.shellId,undefined);assert.equal((await f.service.read('plain/page.visual.json')).metadata!.shellId,undefined);
  r=await f.invoke('POST',{name:'conflict',route:'/default'});assert.equal(r.status,409);assert.equal(r.data.commitOutcome,'not-committed');
  r=await f.invoke('POST',{name:'invalid',route:'/invalid',mode:'plain',shell:f.first.metadata!.artifactId});assert.equal(r.status,400);
  r=await f.invoke('POST',{name:'invalid',route:'/invalid',shell:'art_missing'});assert.equal(r.data.code,'CLI_PAGE_SHELL_INVALID');
  const shellMetadata=path.join(f.root,'shells/second/shell.visual.json');await writeFile(shellMetadata,JSON.stringify({...f.second.metadata,artifactId:f.first.metadata!.artifactId}));
  assert.equal((await f.invoke('POST',{name:'ambiguous',route:'/ambiguous'})).data.code,'CLI_PAGE_SHELL_INVALID');await writeFile(shellMetadata,f.second.files.metadata);
  const shellSource=path.join(f.root,'shells/second/shell.html');await writeFile(shellSource,'');assert.equal((await f.invoke('POST',{name:'broken',route:'/broken',shell:f.second.metadata!.artifactId})).data.code,'CLI_PAGE_SHELL_INVALID');await writeFile(shellSource,f.second.files.source);
  f.settings.presentation.defaultShellId='art_missing';await f.saveSettings();r=await f.invoke('POST',{name:'missing',route:'/missing'});assert.equal(r.data.code,'CLI_PAGE_SHELL_INVALID');
  delete f.settings.presentation.defaultShellId;await f.saveSettings();r=await f.invoke('POST',{name:'missing',route:'/missing'});assert.equal(r.data.code,'CLI_PAGE_SHELL_REQUIRED');
  r=await f.invoke('POST',{name:'explicit',route:'/explicit',shell:f.second.metadata!.artifactId});assert.equal(r.status,201);f.settings.presentation.defaultShellId=f.first.metadata!.artifactId;await f.saveSettings();
  const candidate={...bundle.files,source:'<main class="uip-layout-item" data-uip-node="main" data-uip-region="region-main"><p data-uip-node="text">Changed</p></main>\n'};
  r=await f.invoke('PUT',{files:candidate,expectedHash:bundle.hash},created.id);assert.equal(r.status,200,JSON.stringify(r.data));assert.equal(r.data.id,created.id);assert.notEqual(r.data.hash,bundle.hash);const updated=await f.service.read(bundle.locator);assert.equal(updated.metadata!.routeId,bundle.metadata!.routeId);assert.equal(updated.metadata!.artifactId,bundle.metadata!.artifactId);
  r=await f.invoke('PUT',{files:candidate,expectedHash:bundle.hash},created.id);assert.equal(r.status,409);
  r=await f.invoke('PUT',{files:{...candidate,metadata:JSON.stringify({...bundle.metadata,routeId:'route_changed'})},expectedHash:updated.hash},created.id);assert.equal(r.status,422);assert.equal((await f.service.read(bundle.locator)).hash,updated.hash);
  r=await f.invoke('PUT',{files:{...candidate,source:'<unclosed'},expectedHash:updated.hash},created.id);assert.equal(r.status,422);
  r=await f.invoke('PUT',{files:{...candidate,source:'<main data-uip-node="main" data-uip-region="region-missing"></main>'},expectedHash:updated.hash},created.id);assert.equal(r.status,422);
  r=await f.invoke('PUT',{files:{source:'incomplete'},expectedHash:updated.hash},created.id);assert.equal(r.status,400);
  r=await f.invoke('DELETE',{expectedHash:bundle.hash},created.id);assert.equal(r.status,409);
  const listing=await f.invoke('GET');assert.equal(listing.status,200);assert.ok(listing.data.some((p:any)=>p.id===created.id));const shown=await f.invoke('GET',undefined,created.id);assert.deepEqual(shown.data.files,updated.files);
 }finally{await f.close();}
});

test('CLI refuses unauthorized writes, inaccessible Shells, foreign Apps and original-authority revocation',async()=>{
 const f=await fixture();try{
  const created=await f.invoke('POST',{name:'target',route:'/target'});const page=await f.service.read('target/page.visual.json');
  f.deny();for(const [method,body,id]of [['POST',{name:'denied',route:'/denied'},undefined],['PUT',{files:page.files,expectedHash:page.hash},created.data.id],['DELETE',{expectedHash:page.hash},created.data.id]] as const){const r=await f.invoke(method,body,id);assert.equal(r.status,403);assert.equal(r.data.commitOutcome,'not-committed');}f.allow();
  assert.equal((await f.invoke('POST',{name:'foreign',route:'/foreign'},undefined,'foreign-app')).status,403);
  f.denyShell();assert.equal((await f.invoke('POST',{name:'inaccessible',route:'/inaccessible'})).data.code,'CLI_PAGE_SHELL_DENIED');
  const before=(await f.service.list()).length;f.revoke();assert.equal((await f.invoke('POST',{name:'revoked',route:'/revoked',mode:'plain'})).status,403);assert.equal((await f.service.list()).length,before);
 }finally{await f.close();}
});

test('CLI complete delete orchestration protects Page/Shell/Menu references and trashes an unused Page',async()=>{
 const f=await fixture();try{
  const target=await f.invoke('POST',{name:'target',route:'/target'}),caller=await f.invoke('POST',{name:'caller',route:'/caller'});
  let page=await f.service.read('caller/page.visual.json');await f.service.save(page.locator,'source','<a data-uip-node="link" href="/target">Target</a>',page.hash);
  assert.equal((await f.invoke('DELETE',{expectedHash:target.data.hash},target.data.id)).status,422);
  page=await f.service.read('caller/page.visual.json');await f.service.save(page.locator,'source','<!-- Shell defaults -->',page.hash);
  const shellService=new VisualArtifactService(path.join(f.root,'shells'),'shell');let shell=await shellService.read(f.first.locator);await shellService.save(shell.locator,'source',shell.files.source+'<a data-uip-node="shell-link" href="/target">Target</a>',shell.hash);
  assert.equal((await f.invoke('DELETE',{expectedHash:target.data.hash},target.data.id)).status,422);
  shell=await shellService.read(f.first.locator);await shellService.save(shell.locator,'source',f.first.files.source,shell.hash);
  await mkdir(path.join(f.root,'menus'));const menu=path.join(f.root,'menus/main.json');await writeFile(menu,JSON.stringify({schemaVersion:1,menuId:'main',name:'Main',items:[{itemId:'target',label:'Target',destination:{kind:'page',pageId:target.data.id}}]}));
  assert.equal((await f.invoke('DELETE',{expectedHash:target.data.hash},target.data.id)).status,422);await rm(menu);
  const result=await f.invoke('DELETE',{expectedHash:target.data.hash},target.data.id);assert.equal(result.status,200,JSON.stringify(result.data));assert.equal(result.data.removed,true);assert.equal(result.data.mode,'os-trash');await assert.rejects(stat(path.join(f.root,'src/pages/target')));
 }finally{await f.close();}
});

test('CLI mutation parsing requires complete candidates and expected hashes before pairing',async()=>{
 const cli=path.resolve('scripts/uip.mjs');
 for(const args of [['page','create','--app','a','--name','test','--route','/test','--mode','plain','--shell','art_shell'],['page','update','--app','a','--page','art_page','--file','missing'],['page','delete','--app','a','--page','art_page']]){const r=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.equal(r.status,1);assert.doesNotMatch(r.stdout,/challenge/);}
 const r=spawnSync(process.execPath,[cli,'page','create','--app','a','--name','test','--route','/test'],{encoding:'utf8'});assert.match(r.stderr,/Interactive terminal required/);
});

 test('post-admission failure reports uncertain outcome without retrying',async t=>{
  const f=await fixture();try{
   const target=await f.invoke('POST',{name:'target',route:'/target'});let attempts=0;
   t.mock.method(VisualArtifactService.prototype,'remove',async function(_locator:string,_hash:string,_known:unknown,admit:()=>Promise<void>){attempts++;await admit();throw Error('Injected OS-trash failure after admission');});
   const result=await f.invoke('DELETE',{expectedHash:target.data.hash},target.data.id);
   assert.equal(result.status,500);assert.equal(result.data.code,'CLI_PAGE_OUTCOME_UNCONFIRMED');assert.equal(result.data.commitOutcome,'unknown');assert.equal(attempts,1);
  }finally{await f.close();}
 });
