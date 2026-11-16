import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { spawnSync } from 'node:child_process';
import { createCliReadonly } from '../src/server/cli-readonly.js';
import { appsDir } from '../src/server/paths.js';

test('protected page discovery uses authoritative bundles, current permissions and isolated application IDs', async () => {
 await mkdir(appsDir,{recursive:true}); const key='cli-pages-'+crypto.randomUUID(),root=path.join(appsDir,key);await mkdir(root);
 const pages=path.join(root,'src/pages');
 let active=true,policy='one',broad=false,changePolicy=false;
 const grants=new Set(['art_visible']);
 const identity:any={bindCliRequest(){if(!active)throw Error('CLI_UNAUTHENTICATED');},currentUser:()=>active?'reader':null,policyDigest:()=>policy,
 authorize:async(_req:any,permission:string,resource:any)=>{if(changePolicy && permission==='ui.page.view')policy='changed';return permission==='ui.application.view'||permission==='ui.page.view'&&(resource.id==='pages'?broad:grants.has(resource.id));}};
 const registry:any={byApplicationId:(id:string)=>id==='app-id'?{key}:undefined};
 const handler=createCliReadonly(identity,{} as any,registry,async()=>[]);
 async function invoke(url:string,method='GET') {const req:any=Readable.from([]);Object.assign(req,{url,method,headers:{},socket:{remoteAddress:'127.0.0.1'}});let status=0,body='';await handler(req,{writeHead(s:number){status=s;return this;},end(b:string){body=b;}} as any);return {status,data:JSON.parse(body)};}
 async function page(name:string,id?:string){const dir=path.join(pages,name);await mkdir(dir,{recursive:true});await writeFile(path.join(dir,'page.visual.json'),JSON.stringify({schemaVersion:1,...(id?{artifactId:id}:{}),kind:'page',name,displayName:name,route:'/'+name}));await writeFile(path.join(dir,'page.html'),'<section data-uip-node="one">'+name+'</section>');}
 try {
  await page('visible','art_visible');await page('secret','art_secret');
  let result=await invoke('/api/cli/pages?app=app-id');assert.equal(result.status,200);assert.deepEqual(result.data.map((p:any)=>p.id),['art_visible']);assert.equal(JSON.stringify(result.data).includes('secret'),false);assert.equal(JSON.stringify(result.data).includes('locator'),false);
  result=await invoke('/api/cli/page?app=app-id&page=art_visible');assert.equal(result.status,200);assert.equal(result.data.metadata.artifactId,'art_visible');assert.match(result.data.hash,/^[a-f0-9]{64}$/);assert.ok(Array.isArray(result.data.diagnostics));assert.match(result.data.files.source,/visible/);assert.deepEqual(Object.keys(result.data).sort(),['diagnostics','files','hash','metadata']);
  const before=result.data.hash;await writeFile(path.join(pages,'visible/page.html'),'<section>changed</section>');assert.notEqual((await invoke('/api/cli/page?app=app-id&page=art_visible')).data.hash,before);
  for(const target of ['art_secret','absent','visible/page.visual.json'])assert.equal((await invoke('/api/cli/page?app=app-id&page='+target)).status,403);
  assert.equal((await invoke('/api/cli/pages?app=foreign')).status,403);assert.equal((await invoke('/api/cli/pages?app='+key)).status,403);
  assert.equal((await invoke('/api/cli/pages?app=app-id&locator=secret')).status,403);assert.equal((await invoke('/api/cli/page?app=app-id&page=art_visible&page=art_secret')).status,403);assert.equal((await invoke('/api/cli/pages?app=app-id','POST')).status,400);
  broad=true;assert.equal((await invoke('/api/cli/pages?app=app-id')).data.length,2);broad=false;
  changePolicy=true;assert.equal((await invoke('/api/cli/pages?app=app-id')).status,403);changePolicy=false;
  active=false;assert.equal((await invoke('/api/cli/pages?app=app-id')).status,403);active=true;
  await page('duplicate','art_visible');for(const route of ['pages?app=app-id','page?app=app-id&page=art_visible'])assert.equal((await invoke('/api/cli/'+route)).data.code,'CLI_PAGE_IDENTITY_INVALID');await rm(path.join(pages,'duplicate'),{recursive:true});
  await page('invalid','not-a-permanent-id');assert.equal((await invoke('/api/cli/pages?app=app-id')).data.code,'CLI_PAGE_IDENTITY_INVALID');await rm(path.join(pages,'invalid'),{recursive:true});
  await page('missing');assert.equal((await invoke('/api/cli/pages?app=app-id')).data.code,'CLI_PAGE_IDENTITY_INVALID');await rm(path.join(pages,'missing'),{recursive:true});
  const pending=path.join(pages,'.uib/transactions/stale/pending.json');await mkdir(path.dirname(pending),{recursive:true});await writeFile(pending,'stale journal bytes');for(const route of ['pages?app=app-id','page?app=app-id&page=art_visible'])assert.equal((await invoke('/api/cli/'+route)).status,403);assert.equal(await readFile(pending,'utf8'),'stale journal bytes');
 } finally {await rm(root,{recursive:true,force:true});}
});

test('page executable accepts only bounded list/show options',()=>{
 const cli=path.resolve('scripts/uip.mjs');
 for(const args of [['page','list','--app','a'],['page','show','--app','a','--page','p']]){const result=spawnSync(process.execPath,[cli,...args],{encoding:'utf8'});assert.match(result.stderr,/Interactive terminal required/);}
 assert.match(spawnSync(process.execPath,[cli,'page','show','--app','a'],{encoding:'utf8'}).stderr,/--page is required/);
 assert.match(spawnSync(process.execPath,[cli,'page','list','--app','a','--page','p'],{encoding:'utf8'}).stderr,/Unsupported command/);
});
