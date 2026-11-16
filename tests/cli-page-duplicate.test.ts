import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, readdir, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { appsDir } from '../src/server/paths.js';
import { VisualArtifactService, platformComponentsRoot } from '../src/server/visual-artifacts.js';
import { getPageTree, getPageSource } from '../src/server/page-builder.js';
import { createCliReadonly } from '../src/server/cli-readonly.js';

async function fixture(composed=false) {
 const key='duplicate-'+crypto.randomUUID(),root=path.join(appsDir,key),id=crypto.randomUUID();await mkdir(root,{recursive:true});
 await writeFile(path.join(root,'app.manifest.json'),JSON.stringify({manifestVersion:'1.0.0',appId:id,template:'standard',templateVersion:'2.0.0',packages:{}}));await writeFile(path.join(root,'package.json'),JSON.stringify({name:key,dependencies:{}}));
 const sharedService=new VisualArtifactService(platformComponentsRoot,'component'),component=await sharedService.create('dup-shared-'+crypto.randomUUID());
 const shells=new VisualArtifactService(path.join(root,'shells'),'shell');let shell:any;
 if(composed)shell=await shells.create('shell');
 await writeFile(path.join(root,'app.settings.json'),JSON.stringify(composed?{presentation:{model:'composition-v1',defaultShellId:shell.metadata.artifactId,theme:{},siteStyles:[],branding:{applicationName:'Disposable'},assetsRoot:'assets'}}:{}));
 if(composed){await mkdir(path.join(root,'menus'));await writeFile(path.join(root,'menus/main.json'),JSON.stringify({schemaVersion:1,menuId:'main',name:'Main',items:[]}));}
 const pages=new VisualArtifactService(path.join(root,'src/pages'),'page');let source=await pages.create('source','/source',undefined,shell?.metadata.artifactId);
 const files={...source.files,source:`<section class="uip-layout-item" data-uip-node="root"${composed?' data-uip-region="region-main"':''}><h2 data-uip-node="title">Original</h2><uip-component data-uip-node="shared" data-uip-component="${component.metadata!.componentId}"></uip-component><a data-uip-node="source-link" href="/source">Source</a></section>\n`,css:'h2 { color: purple; }\n',fixtures:'{"value":"fixture"}\n',code:'export function mark(context) { context.setState("marked", true); }\n'};
 if(composed)files.metadata=JSON.stringify({...source.metadata,menuOverrides:{main:{additions:[{item:{itemId:'self',label:'Self',destination:{kind:'page',pageId:source.metadata!.artifactId}}},{item:{itemId:'self-route',label:'Self Route',destination:{kind:'route',routeId:source.metadata!.routeId}}}]}}});
 source=await pages.saveCandidate(source.locator,files,source.hash,{repair:true});
 const access={create:true,read:true,shell:true,active:true};let hook:(()=>Promise<void>)|undefined;
 const identity:any={bindCliRequest(){if(!access.active)throw Error('CLI_UNAUTHENTICATED');},currentUser:()=>access.active?'editor':null,policyDigest:()=> 'policy',
 authorize:async(_r:any,p:string,resource:any)=>p==='ui.page.edit'?(resource.id==='pages'?access.create:true):p==='ui.page.view'?access.read:p==='ui.presentation.view'?access.shell:true,
 captureCliEditorPrincipal(){return ()=>{if(!access.active)throw Error('CLI_UNAUTHENTICATED');};},captureAdmission(r:any,p:string,scope:any){return async()=>{if(!access.active||!await identity.authorize(r,p,scope))throw Error('V1_PERMISSION_DENIED');if(p==='ui.page.edit'&&hook)await hook();};}};
 const cli=createCliReadonly(identity,{} as any,{byApplicationId:(value:string)=>value===id?{key}:undefined} as any,async()=>[]);
 async function duplicate(name='copy',route='/copy',hash=source.hash,sourceId=source.metadata!.artifactId){const req:any=Readable.from([JSON.stringify({name,route,expectedHash:hash})]);Object.assign(req,{method:'POST',url:'/api/cli/page-duplicate?app='+id+'&page='+sourceId,headers:{},socket:{remoteAddress:'127.0.0.1'}});let status=0,text='';await cli(req,{writeHead(s:number){status=s;return this;},end(value:string){text=value;}} as any);return {status,data:JSON.parse(text)};}
 async function absent(name='copy'){await assert.rejects(stat(path.join(root,'src/pages',name)));assert.equal((await readdir(path.join(root,'src/pages'))).some(name=>name.startsWith('.creating-')),false);}
 return {root,id,key,pages,source,component,shell,sharedService,access,duplicate,absent,admission(fn:()=>Promise<void>){hook=fn;},async close(){await rm(root,{recursive:true,force:true});await rm(path.join(platformComponentsRoot,path.dirname(component.locator)),{recursive:true,force:true});}};
}

for(const composed of [false,true])test(`${composed?'composed':'plain'} complete duplication publishes copied roles with independent identities and shared references`,async()=>{
 const f=await fixture(composed);try{
  let observed=false;f.admission(async()=>{observed=true;await assert.rejects(stat(path.join(f.root,'src/pages/copy')));const stages=(await readdir(path.join(f.root,'src/pages'))).filter(name=>name.startsWith('.creating-'));assert.equal(stages.length,1);assert.equal((await f.pages.list()).some(page=>page.locator.startsWith('.creating-')),false);assert.equal((await getPageTree(f.key)).pages.some(page=>page.source.includes('.creating-')),false);await assert.rejects(getPageSource(f.key,'src/pages/'+stages[0]+'/index.ts'));assert.deepEqual((await readdir(path.join(f.root,'src/pages',stages[0]))).sort(),['index.ts','page.css','page.fixtures.json','page.functions.ts','page.html','page.visual.json']);});
  const result=await f.duplicate();assert.equal(result.status,201,JSON.stringify(result.data));assert.equal(observed,true);assert.equal(result.data.commitOutcome,'committed');
  const copy=await f.pages.read('copy/page.visual.json');assert.equal(copy.metadata!.artifactId,result.data.id);assert.notEqual(copy.metadata!.artifactId,f.source.metadata!.artifactId);assert.equal(copy.hash,result.data.hash);assert.equal(copy.metadata!.route,'/copy');assert.equal(copy.metadata!.name,'copy');assert.equal(copy.metadata!.displayName,'copy');assert.equal(copy.metadata!.shellId,f.source.metadata!.shellId);
  for(const role of ['source','css','fixtures','code']as const)assert.equal(copy.files[role],f.source.files[role]);assert.match(copy.files.source,new RegExp(f.component.metadata!.componentId!));assert.deepEqual((await f.pages.read(f.source.locator)).files,f.source.files);
  if(composed){assert.ok(copy.metadata!.routeId);assert.notEqual(copy.metadata!.routeId,f.source.metadata!.routeId);assert.equal(copy.metadata!.menuOverrides!.main.additions![0].item.destination.kind,'page');assert.equal((copy.metadata!.menuOverrides!.main.additions![0].item.destination as any).pageId,copy.metadata!.artifactId);assert.equal((copy.metadata!.menuOverrides!.main.additions![1].item.destination as any).routeId,copy.metadata!.routeId);}else assert.equal(copy.metadata!.routeId,undefined);
  await f.pages.save(copy.locator,'css','h2{color:red}',copy.hash);assert.deepEqual((await f.pages.read(f.source.locator)).files,f.source.files);
 }finally{await f.close();}
});

test('stale source, conflicting routes, source-read/destination-create and Shell authorization refuse without a destination',async()=>{
 const f=await fixture(true);try{
  assert.equal((await f.duplicate('copy','/copy','0'.repeat(64))).status,409);await f.absent();
  assert.equal((await f.duplicate('copy','/source')).status,409);await f.absent();
  assert.equal((await f.duplicate('copy','/copy',f.source.hash,'art_missing')).status,404);await f.absent();
  for(const permission of ['read','create','shell']as const){f.access[permission]=false;assert.equal((await f.duplicate()).status,403);await f.absent();f.access[permission]=true;}
  f.admission(async()=>{f.access.active=false;throw Error('V1_PERMISSION_DENIED');});const result=await f.duplicate();assert.equal(result.status,403);assert.equal(result.data.commitOutcome,'not-committed');await f.absent();
 }finally{await f.close();}
});

test('invalid copied dependencies, anchors and syntax fail complete validation and remove hidden staging',async()=>{
 const f=await fixture();try{
  for(const files of [
   {...f.source.files,source:f.source.files.source.replace(f.component.metadata!.componentId!,'cmp_platform_missing')},
   {...f.source.files,source:'<section class="uip-layout-item" data-uip-node="root" id="bad slug"></section>'},
   {...f.source.files,code:'export function broken('},
   {...f.source.files,source:'<a data-uip-node="missing" href="/missing">Missing</a>'},
  ]){const current=await f.pages.read(f.source.locator);const source=await f.pages.saveCandidate(current.locator,files,current.hash,{repair:true});const result=await f.duplicate('copy','/copy',source.hash);assert.equal(result.status,422,JSON.stringify(result.data));assert.equal(result.data.commitOutcome,'not-committed');await f.absent();}
 }finally{await f.close();}
});

test('publication admission rechecks source, dependent revisions, graph membership and staging bytes',async()=>{
 for(const change of ['source','shell','route','staging','owner']as const){const f=await fixture(true);try{
  f.admission(async()=>{
   if(change==='source')await writeFile(path.join(f.root,'src/pages/source/page.css'),'changed outside graph');
   if(change==='shell')await writeFile(path.join(f.root,'shells/shell/shell.css'),'changed outside graph');
   if(change==='route'){const dir=path.join(f.root,'src/pages/competitor');await mkdir(dir);await writeFile(path.join(dir,'page.visual.json'),JSON.stringify({schemaVersion:1,artifactId:'art_competitor',kind:'page',name:'competitor',displayName:'Competitor',route:'/copy'}));await writeFile(path.join(dir,'page.html'),'<section></section>');}
   if(change==='staging'){const stage=(await readdir(path.join(f.root,'src/pages'))).find(name=>name.startsWith('.creating-'))!;await writeFile(path.join(f.root,'src/pages',stage,'page.html'),'tampered');}
   if(change==='owner')await writeFile(path.join(f.root,'app.manifest.json'),JSON.stringify({appId:'changed-owner'}));
  });const result=await f.duplicate();assert.ok([403,409].includes(result.status),JSON.stringify({change,result}));assert.equal(result.data.commitOutcome,'not-committed');await f.absent();
 }finally{await f.close();}}
});

test('complete creation cannot overwrite an existing destination and starter creation is unchanged',async()=>{
 const f=await fixture();try{
  f.admission(async()=>{await mkdir(path.join(f.root,'src/pages/copy'));await writeFile(path.join(f.root,'src/pages/copy/retained.txt'),'retain');});const result=await f.duplicate();assert.equal(result.status,409);assert.equal(result.data.commitOutcome,'not-committed');assert.equal(await readFile(path.join(f.root,'src/pages/copy/retained.txt'),'utf8'),'retain');
  const starter=await f.pages.create('starter','/starter');assert.ok(starter.metadata!.artifactId);assert.match(starter.files.source,/data-uip-node/);
 }finally{await f.close();}
});

test('duplicate CLI requires source hash and bounded options before pairing',()=>{
 const cli=path.resolve('scripts/uip.mjs');for(const args of [[],['--expected-hash','bad'],['--expected-hash','0'.repeat(64),'--shell','art_shell']]){const result=spawnSync(process.execPath,[cli,'page','duplicate','--app','app','--page','art_source','--name','copy','--route','/copy',...args],{encoding:'utf8'});assert.equal(result.status,1);assert.doesNotMatch(result.stdout,/challenge/);}
 const valid=spawnSync(process.execPath,[cli,'page','duplicate','--app','app','--page','art_source','--name','copy','--route','/copy','--expected-hash','0'.repeat(64)],{encoding:'utf8'});assert.match(valid.stderr,/Interactive terminal required/);
});

test('lost result after publication is uncertain and leaves one complete destination',async t=>{
 const f=await fixture();try{
  const original=VisualArtifactService.prototype.createCompletePage;let attempts=0;
  t.mock.method(VisualArtifactService.prototype,'createCompletePage',async function(this:VisualArtifactService,...args:Parameters<typeof original>){attempts++;await original.apply(this,args);throw Error('Injected lost publication result');});
  const result=await f.duplicate();assert.equal(result.status,500);assert.equal(result.data.commitOutcome,'unknown');assert.equal(attempts,1);
  const published=await f.pages.read('copy/page.visual.json');for(const role of ['source','css','fixtures','code']as const)assert.equal(published.files[role],f.source.files[role]);assert.deepEqual((await f.pages.read(f.source.locator)).files,f.source.files);
 }finally{await f.close();}
});
