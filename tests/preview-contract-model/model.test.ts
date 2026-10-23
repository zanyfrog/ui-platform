import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { canonical, digest, digestBytes, manifestDigest, normalizeManifest, PreviewModel, ContractError, validateBinding, validateCursor } from '../../src/preview-contract-model/model.ts';
import type { Binding, Epoch, Limits, Manifest, Event } from '../../src/preview-contract-model/model.ts';

const limits: Limits = {maxBytes:10000,maxResources:10,maxCaptures:3,maxConcurrentDeliveries:2,maxReplayEvents:2};
const binding: Binding = {authorityId:'auth',subjectId:'alice',sessionHandle:'opaque-s1',sessionRevision:'s1',applicationId:'permanent-app',owner:{kind:'application',id:'permanent-app'},selectedIdentity:'application/permanent-app/page/one'};
const epoch: Epoch = {policy:{authorityId:'auth',lineage:'lineage-one',revision:'10'},sessionRevision:'s1',ownerRevision:'owner-1',scopeDigest:digest('read-scope'),validUntil:1000};
const clone = <T>(v:T):T => JSON.parse(JSON.stringify(v));
function fixture() {
  const bytes = new Map([['source',new TextEncoder().encode('authored source')],['module',new TextEncoder().encode('authored module')],['route',new TextEncoder().encode('/one')]]);
  const m: Manifest = {schema:'preview-capture-model-v1',applicationId:binding.applicationId,owner:clone(binding.owner),selectedIdentity:binding.selectedIdentity,selectedRevision:'saved-1',
    roles:[{identity:binding.selectedIdentity,role:'source',revision:'r1',resourceId:'source'},{identity:'package/card',role:'module',revision:'r2',resourceId:'module'}],
    dependencies:[{from:binding.selectedIdentity,to:'package/card',kind:'component'}],membership:[{scope:'selected-closure',identities:[binding.selectedIdentity,'package/card']}],
    packages:[{name:'authored-card',version:'1.0',activationRevision:'active-1',manifestId:'module',executableIds:['module'],resourceIds:[]}],
    composition:{routes:[{ordinal:0,resourceId:'route'}],shells:[],regions:[],themeIds:[],styleIds:[],assetIds:[]},
    resources:[...bytes].map(([id,b])=>({id,sha256:digestBytes(b),byteLength:b.length,mediaType:'text/plain'})),rendererVersion:'authored-native-contract-1',capabilityPolicyVersion:'non-effecting-1'};
  return {m,bytes};
}
function setup(custom = limits) {
  let time=10; let answer={binding:clone(binding),epoch:clone(epoch),allowed:true};
  const model=new PreviewModel(binding,custom,()=>time,()=>answer);
  const reconcile=()=>model.reconcile('channel-one','channel-generation-one',answer.epoch.policy,500);
  reconcile();
  const ready=()=>{const f=fixture(); const ticket=model.refresh();return {...f,...model.complete(ticket,f.m,f.bytes,400)};};
  const event=(sequence='1'):Event=>({channelId:'channel-one',generation:'channel-generation-one',sequence,cursor:clone(answer.epoch.policy),kind:'health',healthUntil:500});
  return {model,ready,reconcile,event,setTime:(v:number)=>{time=v;},answer,setAnswer:(v:typeof answer)=>{answer=v;}};
}
function error(fn:()=>unknown,code:string) { assert.throws(fn,(e:unknown)=>e instanceof ContractError && e.code===code); }

test('predeclared canonical vectors have exact canonical bytes and known SHA-256',()=>{
  const vectors:[unknown,string,string?][]=[
    [{},'{}','44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a'],
    [null,'null','74234e98afe7498fb5daf1f36ac2d78acc339464f950703b8c019892f982b90b'],
    [{b:2,a:1},'{"a":1,"b":2}','43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777'],
    [{z:[true,null,'x'],a:{y:-0}},'{"a":{"y":0},"z":[true,null,"x"]}'],[[2,1],'[2,1]']];
  for(const [input,expected,sha]of vectors){assert.equal(canonical(input),expected);assert.equal(digest(input),'sha256:'+(sha??createHash('sha256').update(expected).digest('hex')));}
  assert.equal(digest({a:1,b:2}),digest({b:2,a:1})); assert.notEqual(digest([1,2]),digest([2,1]));
});
test('canonicalization rejects executable/non-JSON and conflicting property representations without invoking getters',()=>{
  let called=false;const getter={get x(){called=true;return 1;}};
  for(const v of [undefined,()=>0,Symbol('x'),BigInt(1),new Date(),NaN,Infinity,Number.MAX_SAFE_INTEGER+1,getter,Object.defineProperty({},'x',{value:1}),{[Symbol('x')]:1}]) assert.throws(()=>canonical(v),ContractError);
  const cyclic:unknown[]=[];cyclic.push(cyclic);error(()=>canonical(cyclic),'CYCLE');error(()=>canonical(Array(2)),'ARRAY_INVALID');assert.equal(called,false);
});
test('binding and cursor reject unsupported fields, empty identity and noncanonical revision',()=>{
  error(()=>validateBinding({...binding,subjectId:''}),'BINDING_INVALID');
  error(()=>validateBinding({...binding,secret:'unsupported'} as Binding),'FIELDS_UNSUPPORTED');
  error(()=>validateCursor({...epoch.policy,revision:'01'}),'REVISION_INVALID');
});
test('manifest authored set permutations canonicalize identically; route ordinals preserve semantics',()=>{
  const {m}=fixture(),other=clone(m);other.roles.reverse();other.resources.reverse();other.membership[0].identities.reverse();
  assert.equal(manifestDigest(m,limits),manifestDigest(other,limits));
  other.composition.routes[0].ordinal=1;assert.notEqual(manifestDigest(m,limits),manifestDigest(other,limits));
  assert.equal(canonical(normalizeManifest(m,limits)),canonical(normalizeManifest(clone(m),limits)));
});
test('same package version with different executable bytes changes capture content identity',()=>{
  const {m}=fixture(),other=clone(m);other.resources.find(r=>r.id==='module')!.sha256=digestBytes('different same-length bytes');
  assert.equal(other.packages[0].version,m.packages[0].version);assert.notEqual(manifestDigest(m,limits),manifestDigest(other,limits));
});
for(const [name,change,code] of [
  ['duplicate resource',(m:Manifest)=>m.resources.push(clone(m.resources[0])),'IDENTITY_CONFLICT'],
  ['missing dependency',(m:Manifest)=>{m.dependencies[0].to='foreign';},'DEPENDENCY_MISSING'],
  ['foreign membership',(m:Manifest)=>m.membership[0].identities.push('foreign'),'MEMBERSHIP_FOREIGN'],
  ['missing selected membership',(m:Manifest)=>{m.membership=[];},'MEMBERSHIP_MISSING'],
  ['duplicate membership',(m:Manifest)=>m.membership[0].identities.push(m.selectedIdentity),'IDENTITY_CONFLICT'],
  ['unsupported field',(m:Manifest)=>Object.assign(m,{liveUrl:'https://denied.invalid'}),'FIELDS_UNSUPPORTED'],
  ['missing resource',(m:Manifest)=>{m.packages[0].manifestId='missing';},'RESOURCE_MISSING'],
] as const) test('manifest rejects '+name,()=>{const {m}=fixture();change(m);error(()=>normalizeManifest(m,limits),code);});
test('explicit authored limits required; total byte/resource limits reject without production defaults',()=>{
  error(()=>new PreviewModel(binding,{...limits,maxBytes:0},()=>0,()=>({binding,epoch,allowed:true})),'LIMIT_INVALID');
  error(()=>manifestDigest(fixture().m,{...limits,maxBytes:1}),'OVER_LIMIT');
  error(()=>manifestDigest(fixture().m,{...limits,maxResources:1}),'OVER_LIMIT');
});
test('ready only after explicit Refresh; source stale retains inert authorized content and failed Refresh stays stale',()=>{
  const x=setup();assert.equal(x.model.snapshot().visible,false);assert.equal(x.model.snapshot().state,'refresh-required');
  x.ready();assert.equal(x.model.snapshot().interactive,true);x.model.stale();assert.equal(x.model.snapshot().visible,true);assert.equal(x.model.snapshot().interactive,false);
  const t=x.model.refresh();assert.equal(x.model.snapshot().state,'stale-pending');x.model.failed(t);assert.equal(x.model.snapshot().state,'stale');
});
for(const kind of ['policy','session','owner','expiry','reset-required','unhealthy'] as const) test('observed '+kind+' event synchronously hides pending/current display',()=>{
  const x=setup();x.ready();const t=x.model.refresh();x.model.receive({...x.event(),kind});assert.equal(x.model.snapshot().visible,false);assert.equal(x.model.snapshot().pending,null);error(()=>x.model.complete(t,fixture().m,fixture().bytes,400),'AUTHORITY_UNHEALTHY');
});
test('policy removal during capture rejects late candidate before visibility',()=>{
  const x=setup(),t=x.model.refresh();x.answer.allowed=false;error(()=>x.model.complete(t,fixture().m,fixture().bytes,400),'AUTHORITY_CHANGED');assert.equal(x.model.snapshot().visible,false);
});
test('permission removal after delivery prepare but before abstract send emits no bytes',()=>{
  const x=setup(),c=x.ready(),permit=x.model.prepare(c.handle,'source',c.m.resources[0].sha256,binding,epoch);x.answer.allowed=false;
  error(()=>x.model.send(permit),'AUTHORITY_CHANGED');assert.equal(x.model.snapshot().permits,0);assert.equal(x.model.snapshot().visible,false);
});
test('invalidation after abstract send cannot recall already emitted model bytes; no production race claim',()=>{
  const x=setup(),c=x.ready(),p=x.model.prepare(c.handle,'source',c.m.resources[0].sha256,binding,epoch);const sent=x.model.send(p);x.model.invalidate();assert.equal(new TextDecoder().decode(sent),'authored source');assert.equal(x.model.snapshot().visible,false);
});
for(const field of ['session','subject','owner','policy'] as const) test('fresh delivery admission rejects changed '+field+' and cross-binding',()=>{
  const x=setup(),c=x.ready();
  if(field==='session'){x.answer.binding.sessionRevision='s2';x.answer.epoch.sessionRevision='s2';}
  if(field==='subject')x.answer.binding.subjectId='bob';
  if(field==='owner')x.answer.epoch.ownerRevision='owner-2';
  if(field==='policy')x.answer.epoch.policy.revision='11';
  error(()=>x.model.prepare(c.handle,'source',c.m.resources[0].sha256,binding,epoch),'AUTHORITY_CHANGED');assert.equal(x.model.snapshot().visible,false);
});
test('logout invalidates before pending response; disposal is terminal and late response cannot return',()=>{
  const x=setup();x.ready();const t=x.model.refresh();x.model.invalidate();x.model.dispose();x.model.dispose();
  error(()=>x.model.complete(t,fixture().m,fixture().bytes,400),'DISPOSED');error(()=>x.reconcile(),'DISPOSED');assert.equal(x.model.snapshot().state,'disposed');
});
test('rights expiry without source or policy write hides at exact injected boundary',()=>{
  const x=setup();x.ready();x.setTime(1000);assert.equal(x.model.snapshot().visible,false);error(()=>x.model.refresh(),'AUTHORITY_UNHEALTHY');
});
test('silent partition health deadline fails closed; reconnect never restores old capture',()=>{
  const x=setup();x.ready();x.setTime(500);assert.equal(x.model.snapshot().visible,false);x.setTime(501);x.model.reconcile('new-channel','new-generation',epoch.policy,900);assert.equal(x.model.snapshot().state,'refresh-required');assert.equal(x.model.snapshot().visible,false);
});
test('disconnect immediately hides; explicit reconciliation and Refresh required',()=>{
  const x=setup();x.ready();x.model.disconnect();assert.equal(x.model.snapshot().state,'disconnected');x.reconcile();assert.equal(x.model.snapshot().visible,false);x.ready();assert.equal(x.model.snapshot().visible,true);
});
test('commit-publication interruption modeled as durable head replay; old cursor cannot ready',()=>{
  const x=setup();x.ready();x.model.disconnect();const committed=clone(epoch.policy);committed.revision='11';x.answer.epoch.policy=committed;
  error(()=>x.model.reconcile('c','g',epoch.policy,500),'CURSOR_STALE');x.model.reconcile('c','g',committed,500);assert.equal(x.model.snapshot().visible,false);assert.equal(x.model.snapshot().state,'refresh-required');
});
test('ordered events and exact duplicates accepted idempotently without extending expiry',()=>{
  const x=setup();x.ready();const e=x.event();assert.equal(x.model.receive(e),'accepted');assert.equal(x.model.receive(e),'duplicate');assert.equal(x.model.receive(x.event('2')),'accepted');x.setTime(1000);assert.equal(x.model.snapshot().visible,false);
});
for(const [name,edit,code] of [
  ['gap',(e:Event)=>{e.sequence='3';},'SEQUENCE_GAP'],
  ['foreign lineage',(e:Event)=>{e.cursor.lineage='foreign';},'LINEAGE_FOREIGN'],
  ['stale cursor',(e:Event)=>{e.cursor.revision='9';},'CURSOR_STALE'],
  ['foreign channel',(e:Event)=>{e.channelId='foreign';},'CHANNEL_FOREIGN'],
  ['expired health',(e:Event)=>{e.healthUntil=10;},'HEALTH_EXPIRED'],
] as const) test('channel rejects '+name+' and hides',()=>{const x=setup();x.ready();const e=x.event();edit(e);error(()=>x.model.receive(e),code);assert.equal(x.model.snapshot().visible,false);});
test('conflicting duplicate and obsolete replay after retention window fail closed',()=>{
  const x=setup();x.ready();x.model.receive(x.event());error(()=>x.model.receive({...x.event(),healthUntil:450}),'REPLAY_CONFLICT');
  const y=setup();y.ready();y.model.receive(y.event());y.model.receive(y.event('2'));y.model.receive(y.event('3'));error(()=>y.model.receive(y.event()),'REPLAY_CONFLICT');assert.equal(y.model.snapshot().visible,false);
});
test('higher policy cursor on health invalidates rather than extending old capture',()=>{
  const x=setup();x.ready();const e=x.event();e.cursor.revision='11';x.model.receive(e);assert.equal(x.model.snapshot().visible,false);
});
test('capture immutable bytes copied both at input and output; content identity excludes subject epoch',()=>{
  const x=setup(),c=x.ready();const original=c.bytes.get('source')!;original.fill(0);c.m.resources[0].sha256=digest('tampered');
  const f=fixture();const p=x.model.prepare(c.handle,'source',f.m.resources[0].sha256,binding,epoch);const first=x.model.send(p);first.fill(0);
  const second=x.model.send(x.model.prepare(c.handle,'source',f.m.resources[0].sha256,binding,epoch));assert.equal(new TextDecoder().decode(second),'authored source');assert.equal(c.contentId,manifestDigest(f.m,limits));
});
test('resource cross-user, cross-epoch, foreign path and digest replay are explicit denials',()=>{
  const x=setup(),c=x.ready(),sha=c.m.resources[0].sha256;
  error(()=>x.model.prepare(c.handle,'source',sha,{...binding,subjectId:'bob'},epoch),'REPLAY_DENIED');
  error(()=>x.model.prepare(c.handle,'source',sha,binding,{...epoch,ownerRevision:'other'}),'REPLAY_DENIED');
  error(()=>x.model.prepare(c.handle,'https://denied.invalid',sha,binding,epoch),'RESOURCE_DENIED');
  error(()=>x.model.prepare(c.handle,'source',digest('wrong'),binding,epoch),'RESOURCE_DENIED');error(()=>x.model.prepare('foreign','source',sha,binding,epoch),'CAPTURE_UNKNOWN');
});
test('expired capture replay denied without lookup fallback',()=>{
  const x=setup(),c=x.ready();x.setTime(400);error(()=>x.model.prepare(c.handle,'source',c.m.resources[0].sha256,binding,epoch),'EXPIRED');assert.equal(x.model.snapshot().visible,false);
});
test('concurrent delivery and capture limits enforced; send permit cannot replay',()=>{
  const x=setup(),c=x.ready(),sha=c.m.resources[0].sha256;const p=x.model.prepare(c.handle,'source',sha,binding,epoch);x.model.prepare(c.handle,'source',sha,binding,epoch);
  error(()=>x.model.prepare(c.handle,'source',sha,binding,epoch),'OVER_LIMIT');x.model.send(p);error(()=>x.model.send(p),'PERMIT_INVALID');
  const y=setup({...limits,maxCaptures:1});y.ready();const t=y.model.refresh();error(()=>y.model.complete(t,fixture().m,fixture().bytes,400),'OVER_LIMIT');
});
test('superseded Refresh completion and wrong/mutated bytes cannot replace current',()=>{
  const x=setup(),c=x.ready(),old=x.model.refresh(),next=x.model.refresh();error(()=>x.model.complete(old,fixture().m,fixture().bytes,400),'CANDIDATE_SUPERSEDED');
  const f=fixture();f.bytes.get('module')!.fill(0);error(()=>x.model.complete(next,f.m,f.bytes,400),'RESOURCE_DIGEST');assert.equal(x.model.snapshot().visible,true);assert.equal(x.model.snapshot().interactive,false);
});
test('authority exceptions and backwards clock fail closed without a timer',()=>{
  let now=20,throwing=false;const model=new PreviewModel(binding,limits,()=>now,()=>{if(throwing)throw Error('authored unavailable');return {binding,epoch,allowed:true};});
  model.reconcile('c','g',epoch.policy,500);throwing=true;error(()=>model.refresh(),'AUTHORITY_UNAVAILABLE');assert.equal(model.snapshot().visible,false);
  throwing=false;model.reconcile('c','g',epoch.policy,500);now=19;error(()=>model.refresh(),'CLOCK_INVALID');assert.equal(model.snapshot().visible,false);
});
test('malformed manifest containers return explicit model errors rather than runtime TypeError',()=>{
  error(()=>normalizeManifest(null as unknown as Manifest,limits),'INPUT_INVALID');
  const f=fixture();f.m.composition.routes=null as unknown as Manifest['composition']['routes'];
  error(()=>normalizeManifest(f.m,limits),'INPUT_INVALID');
});
test('capture expiry between prepare and send hides; no late resource bytes',()=>{
  const x=setup(),c=x.ready(),p=x.model.prepare(c.handle,'source',c.m.resources[0].sha256,binding,epoch);
  x.setTime(400);error(()=>x.model.send(p),'EXPIRED');assert.equal(x.model.snapshot().visible,false);
});
test('obsolete or foreign reconciliation cannot restore display even if channel was connected',()=>{
  const x=setup();x.ready();error(()=>x.model.reconcile('new','new',{...epoch.policy,lineage:'foreign'},500),'CURSOR_STALE');assert.equal(x.model.snapshot().visible,false);
});
test('manifest owner/selection and supplied resource membership cannot retarget a capture',()=>{
  const x=setup(),t=x.model.refresh(),f=fixture();f.m.applicationId='other-app';
  error(()=>x.model.complete(t,f.m,f.bytes,400),'CAPTURE_BINDING');
  const y=fixture();y.bytes.set('extra',new Uint8Array([1]));error(()=>x.model.complete(t,y.m,y.bytes,400),'RESOURCE_CONFLICT');
});
test('identical content hash stays constant across different modeled subject epochs, without sharing access',()=>{
  const f=fixture(),x=setup(),a=x.ready();const b={...clone(binding),subjectId:'bob',sessionHandle:'bob-handle',sessionRevision:'bob-session'};
  const e={...clone(epoch),sessionRevision:'bob-session',ownerRevision:'owner-new'};
  const y=new PreviewModel(b,limits,()=>10,()=>({binding:b,epoch:e,allowed:true}));y.reconcile('bob-channel','bob-gen',e.policy,500);
  const t=y.refresh(),capture=y.complete(t,f.m,f.bytes,400);assert.equal(a.contentId,capture.contentId);
  error(()=>y.prepare(capture.handle,'source',f.m.resources[0].sha256,binding,epoch),'REPLAY_DENIED');
});
test('malformed incoming event fails closed before trusting any property accessor',()=>{
  const x=setup();x.ready();let invoked=false;const event=Object.defineProperty({},'sequence',{enumerable:true,get(){invoked=true;return '1';}});
  error(()=>x.model.receive(event as Event),'PROPERTY_UNSUPPORTED');assert.equal(invoked,false);assert.equal(x.model.snapshot().visible,false);
});
