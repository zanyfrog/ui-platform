import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import { CliPairing, pairingChallenge } from '../src/server/cli-pairing.js';
import { V1DevelopmentIdentity } from '../src/server/v1-development-identity.js';
import { createCliReadonly } from '../src/server/cli-readonly.js';
import { DevelopmentApplicationRuntime } from '../src/server/development-application-runtime.js';
import { V1_FIXTURE_APPLICATION_ID as appId, V1_FIXTURE_APPLICATION_KEY as appKey } from '../src/server/v1-development-policy.js';
import { createHmac } from 'node:crypto';
import { parseFile,serialize } from '../scripts/uip-format.mjs';
const proof='a'.repeat(64);
test('pairing requires originating CLI proof, is single use and instance scoped',()=>{
 const parent={revision:'r',userId:'editor',expires:999999},other={revision:'b',userId:'other',expires:999999};const p=new CliPairing(x=>x===parent||x===other,()=>10);
 const code=p.create(parent,pairingChallenge(proof));assert.throws(()=>p.redeem(code.code,'b'.repeat(64)));const credential=p.redeem(code.code,proof).credential;
 assert.equal(p.parent(credential),parent);assert.throws(()=>p.redeem(code.code,proof));assert.throws(()=>new CliPairing(()=>true,()=>10).parent(credential));
});
test('pairing/access expire; logout, identity changes, revision changes and revocation invalidate authority',()=>{
 let now=0,active=true;const parent={revision:'r',userId:'editor' as string|null,expires:999999};const p=new CliPairing(()=>active,()=>now);
 let code=p.create(parent,pairingChallenge(proof));now=60001;assert.throws(()=>p.redeem(code.code,proof));
 const access=()=>p.redeem(p.create(parent,pairingChallenge(proof)).code,proof).credential;
 let token=access();parent.userId=null;assert.throws(()=>p.parent(token));parent.userId='editor';token=access();parent.userId='viewer';assert.throws(()=>p.parent(token));parent.userId='editor';token=access();parent.revision='new';assert.throws(()=>p.parent(token));token=access();active=false;assert.throws(()=>p.parent(token));active=true;token=access();now+=300001;assert.throws(()=>p.parent(token));
 token=access();parent.expires=now;assert.throws(()=>p.parent(token));
});
async function invoke(handle:any,url:string,method='GET',body?:unknown,headers:any={}){
 const req:any=Readable.from(body===undefined?[]:[JSON.stringify(body)]);req.url=url;req.method=method;req.headers=headers;req.socket={remoteAddress:'127.0.0.1'};
 let status=0,text='',outHeaders:any={};const res:any={setHeader(k:string,v:any){outHeaders[k]=v;},writeHead(s:number,h:any){status=s;Object.assign(outHeaders,h);return this;},end(b:any){text=String(b??'');}};
 await handle(req,res);return {status,data:text?JSON.parse(text):null,headers:outHeaders};
}
test('real Platform session pairing enforces CSRF, rejects CLI cookies and rechecks parent on forwarded requests',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'uip-session-'));const identity=new V1DevelopmentIdentity({enabled:true,environment:'development',developmentRuntime:true,policyStorePath:join(dir,'policy.sqlite'),origins:['http://127.0.0.1:5490']});
 try{
  const handle=identity.handle.bind(identity),s=await invoke(handle,'/api/development-identity/session');const cookie=s.headers['set-cookie'].split(';')[0],headers={cookie,origin:'http://127.0.0.1:5490','content-type':'application/json','x-v1-csrf':s.data.csrfToken};
  assert.equal((await invoke(handle,'/api/development-identity/cli-pairing','POST',{challenge:pairingChallenge(proof)},headers)).status,403);
  const login=await invoke(handle,'/api/development-identity/session','POST',{email:'admin@example.local'},headers);assert.ok(login.data.user);
  assert.equal((await invoke(handle,'/api/development-identity/cli-pairing','POST',{challenge:pairingChallenge(proof)},{...headers,'x-v1-csrf':'forged'})).status,403);
  const created=await invoke(handle,'/api/development-identity/cli-pairing','POST',{challenge:pairingChallenge(proof)},headers);assert.equal(created.status,200);
  assert.equal((await invoke(handle,'/api/cli/pair','POST',{code:created.data.code,proof},headers)).status,403);
  const redeemed=await invoke(handle,'/api/cli/pair','POST',{code:created.data.code,proof},{'content-type':'application/json'});assert.equal(redeemed.status,200);
  const request:any={headers:{authorization:'Bearer '+redeemed.data.credential},socket:{remoteAddress:'127.0.0.1'}};const forwarded:any={headers:{},socket:request.socket};identity.bindCliRequest(request,forwarded);assert.equal(identity.currentUser(forwarded),login.data.user.userId);
  await invoke(handle,'/api/development-identity/session','DELETE',{},headers);assert.throws(()=>identity.currentUser(forwarded));
 }finally{identity.close();rmSync(dir,{recursive:true,force:true});}
});
test('readonly routes reject unauthenticated and foreign targets; export only uses query proxy and revalidates before disclosure',async()=>{
 let authenticated=true,allowed=true,reads=0,expireDuring=false;const rows=[{id:'one',name:'visible'}];
 const identity:any={policyDigest:()=> 'policy',bindCliRequest(){if(!authenticated)throw Error('CLI_UNAUTHENTICATED');},currentUser(){if(!authenticated)throw Error('CLI_UNAUTHENTICATED');return 'reader';},authorize:async()=>allowed,cliOrigin:()=> 'http://127.0.0.1:5490'};
 const registry:any={byApplicationId:(id:string)=>id==='app'?{key:'sample'}:undefined};
 const runtime:any={connectedDatasets:()=>['dataset'],async handle(req:any,res:any){assert.match(req.url,/\/queries$/);assert.equal(req.method,'POST');let text='';for await(const chunk of req)text+=chunk;assert.equal(JSON.parse(text).datasetId,'dataset');reads++;if(expireDuring)authenticated=false;res.writeHead(200).end(JSON.stringify(rows));return true;}};
 const handle=createCliReadonly(identity,runtime,registry,async()=>[{appId:'app',key:'sample'}]);
 assert.equal((await invoke(handle,'/api/cli/apps')).data.length,1);assert.equal((await invoke(handle,'/api/cli/datasets?app=app')).data.length,1);
 assert.deepEqual((await invoke(handle,'/api/cli/export?app=app&dataset=dataset')).data,rows);
 assert.equal((await invoke(handle,'/api/cli/export?app=foreign&dataset=dataset')).status,403);allowed=false;assert.equal((await invoke(handle,'/api/cli/export?app=app&dataset=dataset')).status,403);allowed=true;
 const previous=reads;assert.equal((await invoke(handle,'/api/cli/export?app=app&dataset=dataset','POST',{})).status,405);assert.equal(reads,previous);
 authenticated=false;assert.equal((await invoke(handle,'/api/cli/apps')).status,403);authenticated=true;expireDuring=true;assert.equal((await invoke(handle,'/api/cli/export?app=app&dataset=dataset')).status,403);
});
test('CSV/JSON preserve permitted values; format validation rejects malformed/duplicate IDs without schema or persistence',()=>{
 const rows=[{id:'one',name:'Eagle, "Patrol"\nline',active:true,nullable:null,count:4},{id:'two',name:'=formula',active:false,nullable:null,count:0}];
 for(const format of ['json','csv'])assert.deepEqual(parseFile(serialize(rows,format),format),rows);
 assert.throws(()=>parseFile('[{"id":"x"},{"id":"x"}]','json'));assert.throws(()=>parseFile('[{"name":"missing"}]','json'));assert.throws(()=>parseFile('id,name\nx,"broken','csv'));assert.throws(()=>parseFile('id,id\nx,y','csv'));
});
test('paired real session traverses existing proxy, signs current IAM actor, and only exports permitted host values',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'uip-proxy-')),identity=new V1DevelopmentIdentity({enabled:true,environment:'development',developmentRuntime:true,policyStorePath:join(dir,'policy.sqlite'),origins:['http://127.0.0.1:5490']});
 const originalFetch=globalThis.fetch;let calls=0;const key='test-only-host-key-'.padEnd(40,'x');
 try{
  const auth=identity.handle.bind(identity),s=await invoke(auth,'/api/development-identity/session'),cookie=s.headers['set-cookie'].split(';')[0];
  const headers={cookie,origin:'http://127.0.0.1:5490','content-type':'application/json','x-v1-csrf':s.data.csrfToken};
  const login=await invoke(auth,'/api/development-identity/session','POST',{email:'admin@example.local'},headers);
  const code=(await invoke(auth,'/api/development-identity/cli-pairing','POST',{challenge:pairingChallenge(proof)},headers)).data.code;
  const token=(await invoke(auth,'/api/cli/pair','POST',{code,proof},{'content-type':'application/json'})).data.credential;
  const registry:any={byKey:(k:string)=>k===appKey?{applicationId:appId,key:appKey}:undefined,byApplicationId:(id:string)=>id===appId?{key:appKey}:undefined};
  const runtime=new DevelopmentApplicationRuntime(undefined,join(dir,'policy.sqlite'),registry,identity,['http://127.0.0.1:5490']);
  runtime.connectManaged({applicationId:appId,key:appKey,datasetId:'scouts',hostUrl:'http://127.0.0.1:9999',trustedUiServerKey:key,policyStore:join(dir,'policy.sqlite'),workflowIds:[]});
  globalThis.fetch=(async(url:any,init:any)=>{calls++;assert.equal(String(url),'http://127.0.0.1:9999/queries');const bearer=init.headers.authorization;const [,payload,signature]=bearer.split('.');assert.equal(signature,createHmac('sha256',key).update(payload).digest('base64url'));assert.equal(JSON.parse(Buffer.from(payload,'base64url').toString()).userId,login.data.user.userId);return Response.json([{id:'synthetic-scout',firstName:'Visible'}]);}) as typeof fetch;
  const cli=createCliReadonly(identity,runtime,registry,async()=>[{appId,key:appKey}]);const access={authorization:'Bearer '+token};
  assert.equal((await invoke(cli,'/api/cli/apps','GET',undefined,access)).data.length,1);
  const result=await invoke(cli,`/api/cli/export?app=${appId}&dataset=scouts`,'GET',undefined,access);assert.equal(result.status,200);assert.deepEqual(result.data,[{id:'synthetic-scout',firstName:'Visible'}]);assert.equal(calls,1);
  await invoke(auth,'/api/development-identity/session','POST',{email:'page-form-editor@example.local'},headers);
  assert.equal((await invoke(cli,`/api/cli/export?app=${appId}&dataset=scouts`,'GET',undefined,access)).status,403);assert.equal(calls,1);
 }finally{globalThis.fetch=originalFetch;identity.close();rmSync(dir,{recursive:true,force:true});}
});
test('executable help and local validation work; live import commands are unavailable',()=>{
 const dir=mkdtempSync(join(tmpdir(),'uip-file-')),cli=fileURLToPath(new URL('../scripts/uip.mjs',import.meta.url));
 try{
  assert.match(execFileSync(process.execPath,[cli,'--help'],{encoding:'utf8'}),/read-only/);
  for(const format of ['csv','json']){const file=join(dir,'scouts.'+format);writeFileSync(file,serialize([{id:'synthetic-id',firstName:'Synthetic',active:true}],format));const result=JSON.parse(execFileSync(process.execPath,[cli,'data','validate','--file',file],{encoding:'utf8'}));assert.equal(result.records,1);assert.equal(result.persisted,false);assert.equal(result.schemaValidated,false);}
  assert.equal(spawnSync(process.execPath,[cli,'data','import','--file',join(dir,'scouts.json')]).status,1);
  assert.deepEqual(parseFile(serialize([],'csv'),'csv'),[]);
  assert.throws(()=>serialize([{id:'one',secret:'visible'},{id:'two'}],'csv'),/uniform/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
