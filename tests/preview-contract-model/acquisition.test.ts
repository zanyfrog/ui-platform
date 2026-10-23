import test from 'node:test';
import assert from 'node:assert/strict';
import { AcquisitionModel } from '../../src/preview-contract-model/acquisition.ts';
import type { CaptureContract, Observation, ReadObservation, Refusal, Result } from '../../src/preview-contract-model/acquisition.ts';
import { canonical, digest, digestBytes, ContractError } from '../../src/preview-contract-model/model.ts';

const clone=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
function fixture() {
  const binding={authorityId:'auth',subjectId:'alice',sessionHandle:'s1',sessionRevision:'s1',applicationId:'app-permanent',owner:{kind:'application' as const,id:'app-permanent'},selectedIdentity:'selected'};
  const epoch={policy:{authorityId:'auth',lineage:'lineage-1',revision:'10'},sessionRevision:'s1',ownerRevision:'owner-1',scopeDigest:digest('visible-fields'),validUntil:1000};
  const contract:CaptureContract={binding,epoch,ownerValidity:'owner-valid-1',selectedRevision:'saved-1',requiredRoles:[{identity:'selected',role:'source'},{identity:'dependency',role:'module'}],requiredCollections:['routes'],limits:{manifest:{maxBytes:100,maxResources:10,maxCaptures:2,maxConcurrentDeliveries:2,maxReplayEvents:2},maxRoles:10,maxEdges:10,maxMembers:10,maxIdentities:10}};
  const bytes=new Map([['source',new Uint8Array([0x61])],['module',new Uint8Array([0x62])]]);
  const metadata:ReadObservation={admission:'entered',binding:clone(binding),epoch:clone(epoch),allowed:true,ownerValidity:'owner-valid-1',selectedRevision:'saved-1',nativeClosure:'admitted',
    identities:[{identity:'selected',owner:clone(binding.owner),permanentId:'artifact-one'},{identity:'dependency',owner:{kind:'package',id:'authored-package'},permanentId:'component-one'}],
    roleOutcomes:[{identity:'selected',role:'source',status:'read'},{identity:'dependency',role:'module',status:'read'}],
    collections:[{scope:'routes',members:[{identity:'selected',ordinal:0},{identity:'dependency',ordinal:1}]}],
    manifest:{schema:'preview-capture-model-v1',applicationId:binding.applicationId,owner:clone(binding.owner),selectedIdentity:'selected',selectedRevision:'saved-1',
      roles:[{identity:'selected',role:'source',revision:'r1',resourceId:'source'},{identity:'dependency',role:'module',revision:'r2',resourceId:'module'}],dependencies:[{from:'selected',to:'dependency',kind:'component'}],membership:[{scope:'routes',identities:['selected','dependency']}],
      packages:[{name:'authored-package',version:'1',activationRevision:'active-1',manifestId:'module',executableIds:['module'],resourceIds:[]}],composition:{routes:[{ordinal:0,resourceId:'source'},{ordinal:1,resourceId:'module'}],shells:[],regions:[],themeIds:[],styleIds:[],assetIds:[]},
      resources:[...bytes].map(([id,b])=>({id,sha256:digestBytes(b),byteLength:b.length,mediaType:'text/plain'})),rendererVersion:'authored-renderer-1',capabilityPolicyVersion:'no-effects-1'}};
  return {contract,metadata,bytes};
}
function setup(change?: (f:ReturnType<typeof fixture>)=>void) {
  const f=fixture();change?.(f);let time=10;let calls:string[]=[];
  let answer={binding:clone(f.contract.binding),epoch:clone(f.contract.epoch),allowed:true};
  let acquire:(phase:'first'|'validation')=>Observation|Promise<Observation>=()=>({metadata:clone(f.metadata),bytes:f.bytes});
  const model=new AcquisitionModel(f.contract,()=>time,p=>{calls.push(p);return acquire(p);},()=>answer);
  return {f,model,calls,answer,setTime:(v:number)=>{time=v;},setAcquire:(fn:typeof acquire)=>{acquire=fn;}};
}
function refused(result:Result,reason:Refusal) {assert.deepEqual(result,{kind:'refused',reason});}
async function ready(x:ReturnType<typeof setup>) {const t=x.model.begin(400);assert.deepEqual(await x.model.first(t),{kind:'first-pass'});const r=await x.model.validate(t);assert.equal(r.kind,'complete');return r;}
function deferred<T>() {let resolve!:(v:T)=>void;const promise=new Promise<T>(r=>{resolve=r;});return {promise,resolve};}

test('predeclared byte and role projection vectors are exact',()=>{
  assert.equal(digestBytes('a'),'sha256:ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb');
  assert.equal(digestBytes('b'),'sha256:3e23e8160039594a33894f6564e1b1348bbd7a0088d42c4acb73eeaed59c009d');
  assert.equal(canonical({role:'source',identity:'selected',nativeRevision:'r1',byteDigest:digestBytes('a')}),'{"byteDigest":"sha256:ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb","identity":"selected","nativeRevision":"r1","role":"source"}');
});
test('matching authored passes complete once with separate original binding and epoch',async()=>{
  const x=setup(),r=await ready(x);assert.deepEqual(x.calls,['first','validation']);assert.equal(r.kind,'complete');if(r.kind!=='complete')return;
  assert.deepEqual(r.candidate.binding,x.f.contract.binding);assert.deepEqual(r.candidate.epoch,x.f.contract.epoch);assert.equal(r.candidate.contentId,digest({schema:'acquisition-content-model-v1',manifest:r.candidate.manifest,identities:r.candidate.identities,orderedMembership:r.candidate.orderedMembership}));assert.equal(new TextDecoder().decode(r.candidate.bytes.get('source')),'a');
});
test('observation storage permutations preserve semantic ordinals and fingerprints',async()=>{
  const x=setup();const t=x.model.begin(400);await x.model.first(t);x.f.metadata.identities.reverse();x.f.metadata.roleOutcomes.reverse();x.f.metadata.manifest.roles.reverse();x.f.metadata.manifest.resources.reverse();x.f.metadata.manifest.membership[0].identities.reverse();x.f.metadata.collections[0].members.reverse();x.f.metadata.manifest.composition.routes.reverse();
  assert.equal((await x.model.validate(t)).kind,'complete');
});
for(const [name,edit] of [
  ['role bytes unchanged revision',(f:ReturnType<typeof fixture>)=>{f.bytes.set('source',new Uint8Array([0x62]));f.metadata.manifest.resources.find(r=>r.id==='source')!.sha256=digestBytes('b');}],
  ['native revision unchanged bytes',(f:ReturnType<typeof fixture>)=>{f.metadata.manifest.roles[0].revision='r1-new';}],
  ['selected saved revision',(f:ReturnType<typeof fixture>)=>{f.metadata.selectedRevision='saved-2';f.metadata.manifest.selectedRevision='saved-2';}],
  ['collection reorder',(f:ReturnType<typeof fixture>)=>{f.metadata.collections[0].members[0].ordinal=1;f.metadata.collections[0].members[1].ordinal=0;}],
  ['collection rename',(f:ReturnType<typeof fixture>)=>{f.metadata.collections[0].scope='renamed';f.metadata.manifest.membership[0].scope='renamed';f.metadata.collections.push({scope:'routes',members:[]});f.metadata.manifest.membership.push({scope:'routes',identities:[]});}],
  ['package activation',(f:ReturnType<typeof fixture>)=>{f.metadata.manifest.packages[0].activationRevision='active-2';}],
  ['same package version new executable bytes',(f:ReturnType<typeof fixture>)=>{f.bytes.set('module',new Uint8Array([0x61]));f.metadata.manifest.resources.find(r=>r.id==='module')!.sha256=digestBytes('a');}],
] as const) test('validation refuses entire candidate on changed '+name,async()=>{
  const x=setup(),t=x.model.begin(400);await x.model.first(t);edit(x.f);refused(await x.model.validate(t),'changed');assert.equal(x.model.snapshot().previous,null);assert.deepEqual(x.calls,['first','validation']);
});
for(const [name,edit,reason] of [
  ['removed collection',(f:ReturnType<typeof fixture>)=>{f.metadata.collections=[];f.metadata.manifest.membership=[];},'missing'],
  ['removed member',(f:ReturnType<typeof fixture>)=>{f.metadata.collections[0].members.pop();f.metadata.manifest.membership[0].identities.pop();},'changed'],
  ['added member',(f:ReturnType<typeof fixture>)=>{f.metadata.collections[0].members.push({identity:'selected',ordinal:2});},'ambiguous'],
  ['missing dependency',(f:ReturnType<typeof fixture>)=>{f.metadata.manifest.dependencies[0].to='absent';},'missing'],
  ['unreadable shared dependency',(f:ReturnType<typeof fixture>)=>{f.metadata.roleOutcomes[1].status='unreadable';},'missing'],
  ['denied shared dependency',(f:ReturnType<typeof fixture>)=>{f.metadata.roleOutcomes[1].status='denied';},'denied'],
  ['missing required role',(f:ReturnType<typeof fixture>)=>{f.metadata.manifest.roles.pop();},'missing'],
  ['duplicate identity',(f:ReturnType<typeof fixture>)=>{f.metadata.identities.push(clone(f.metadata.identities[0]));},'ambiguous'],
  ['ambiguous same owner and permanent ID',(f:ReturnType<typeof fixture>)=>{f.metadata.identities[1].owner=clone(f.metadata.identities[0].owner);f.metadata.identities[1].permanentId=f.metadata.identities[0].permanentId;},'ambiguous'],
  ['owner validity',(f:ReturnType<typeof fixture>)=>{f.metadata.ownerValidity='owner-valid-2';},'owner-changed'],
  ['Application binding',(f:ReturnType<typeof fixture>)=>{f.metadata.manifest.applicationId='other-app';},'owner-changed'],
  ['native unsupported closure',(f:ReturnType<typeof fixture>)=>{f.metadata.nativeClosure='unsupported';},'unsupported'],
  ['cycle',(f:ReturnType<typeof fixture>)=>{f.metadata.manifest.dependencies.push({from:'dependency',to:'selected',kind:'component'});},'cycle'],
  ['unreachable closure',(f:ReturnType<typeof fixture>)=>{f.metadata.manifest.dependencies=[];},'unsupported'],
  ['wrong bytes digest',(f:ReturnType<typeof fixture>)=>{f.bytes.set('module',new Uint8Array([9]));},'changed'],
] as const) test('explicit refusal for '+name,async()=>{
  const x=setup(),t=x.model.begin(400);await x.model.first(t);edit(x.f);refused(await x.model.validate(t),reason);assert.equal(x.model.snapshot().previous,null);
});
for(const reason of ['busy','owner-unresolved','recovery-required'] as const) for(const phase of ['first','validation'] as const) test(reason+' remains typed at '+phase+' with no callback retry',async()=>{
  const x=setup(),t=x.model.begin(400);if(phase==='validation')await x.model.first(t);x.setAcquire(()=>({refusal:reason}));refused(await (phase==='first'?x.model.first(t):x.model.validate(t)),reason);assert.deepEqual(x.calls,phase==='first'?['first']:['first','validation']);
});
for(const field of ['permission','session','policy','owner','subject'] as const) test('fresh authority '+field+' invalidation between observations clears all candidates',async()=>{
  const x=setup();await ready(x);const t=x.model.begin(400);await x.model.first(t);
  if(field==='permission')x.answer.allowed=false;
  if(field==='session'){x.answer.binding.sessionRevision='s2';x.answer.epoch.sessionRevision='s2';}
  if(field==='policy')x.answer.epoch.policy.revision='11';if(field==='owner')x.answer.epoch.ownerRevision='owner-new';if(field==='subject')x.answer.binding.subjectId='bob';
  refused(await x.model.validate(t),'authority-changed');assert.equal(x.model.snapshot().previous,null);assert.equal(x.calls.length,3);
});
test('permission and epoch change in observation refuse even when injected current answer has not advanced',async()=>{
  const x=setup(),t=x.model.begin(400);await x.model.first(t);x.f.metadata.epoch.policy.revision='11';refused(await x.model.validate(t),'authority-changed');
});
test('deferred validation versus concurrent Refresh supersedes old candidate without canceling newest',async()=>{
  const x=setup(),a=x.model.begin(400);await x.model.first(a);const d=deferred<Observation>();x.setAcquire(()=>d.promise);const old=x.model.validate(a);const b=x.model.begin(400);d.resolve({metadata:x.f.metadata,bytes:x.f.bytes});refused(await old,'superseded');assert.deepEqual(x.model.snapshot().pending,b);
  x.setAcquire(()=>({metadata:x.f.metadata,bytes:x.f.bytes}));await x.model.first(b);assert.equal((await x.model.validate(b)).kind,'complete');
});
test('deferred acquisition versus revocation cannot resurrect content or retry',async()=>{
  const x=setup(),t=x.model.begin(400),d=deferred<Observation>();x.setAcquire(()=>d.promise);const late=x.model.first(t);x.model.revoke();d.resolve({metadata:x.f.metadata,bytes:x.f.bytes});refused(await late,'authority-changed');assert.equal(x.model.snapshot().previous,null);assert.equal(x.calls.length,1);
});
test('expiry after callback starts refuses late result at exact injected deadline',async()=>{
  const x=setup(),t=x.model.begin(30),d=deferred<Observation>();x.setAcquire(()=>d.promise);const late=x.model.first(t);x.setTime(30);d.resolve({metadata:x.f.metadata,bytes:x.f.bytes});refused(await late,'expired');
});
test('previous authorized candidate survives failed replacement but authority loss clears both',async()=>{
  const x=setup();await ready(x);const old=x.model.snapshot().previous!,t=x.model.begin(400);await x.model.first(t);x.f.metadata.manifest.roles[0].revision='new';refused(await x.model.validate(t),'changed');assert.equal(x.model.snapshot().previous!.contentId,old.contentId);x.model.revoke();assert.equal(x.model.snapshot().previous,null);
});
test('capture copies first-pass bytes; returned candidates and snapshots cannot mutate retained capture',async()=>{
  const x=setup(),t=x.model.begin(400);await x.model.first(t);const source=x.f.bytes.get('source')!;source.fill(0);x.f.bytes.set('source',new Uint8Array([0x61]));const r=await x.model.validate(t);assert.equal(r.kind,'complete');if(r.kind!=='complete')return;
  r.candidate.bytes.get('source')!.fill(0);r.candidate.binding.subjectId='attacker';const s=x.model.snapshot();assert.equal(s.previous!.binding.subjectId,'alice');assert.deepEqual([...s.previous!.bytes.get('source')!],[0x61]);s.previous!.bytes.clear();assert.equal(x.model.snapshot().previous!.bytes.size,2);
});
for(const [name,change] of [
  ['roles',(f:ReturnType<typeof fixture>)=>{f.contract.limits.maxRoles=1;}],
  ['edges',(f:ReturnType<typeof fixture>)=>{f.metadata.manifest.dependencies.push({from:'selected',to:'dependency',kind:'extra'});f.contract.limits.maxEdges=1;}],
  ['members',(f:ReturnType<typeof fixture>)=>{f.contract.limits.maxMembers=1;}],
  ['identities',(f:ReturnType<typeof fixture>)=>{f.contract.limits.maxIdentities=1;}],
  ['bytes',(f:ReturnType<typeof fixture>)=>{f.contract.limits.manifest.maxBytes=1;}],
] as const) test('explicit authored '+name+' limit',async()=>{
  if(name==='roles'){assert.throws(()=>setup(change),e=>e instanceof ContractError&&e.code==='ACQUISITION_LIMIT');return;}
  const x=setup(change),t=x.model.begin(400);refused(await x.model.first(t),'limit');
});
test('malformed metadata/accessors and non-JSON observations refuse without executing getters',async()=>{
  const x=setup(),t=x.model.begin(400);let ran=false;const bad=Object.defineProperty({},'metadata',{enumerable:true,get(){ran=true;return x.f.metadata;}});x.setAcquire(()=>bad as Observation);refused(await x.model.first(t),'malformed');assert.equal(ran,false);
  const y=setup(),u=y.model.begin(400);y.f.metadata.collections=null as unknown as ReadObservation['collections'];refused(await y.model.first(u),'malformed');
});
test('callback rejection is one acquisition-error, never replayed as admission contention',async()=>{
  const x=setup(),t=x.model.begin(400);x.setAcquire(()=>{throw Error('authored callback failure');});refused(await x.model.first(t),'acquisition-error');assert.deepEqual(x.calls,['first']);
});
test('dispose is terminal; late completion is refused and original L2 model remains unused',async()=>{
  const x=setup(),t=x.model.begin(400),d=deferred<Observation>();x.setAcquire(()=>d.promise);const late=x.model.first(t);x.model.dispose();d.resolve({metadata:x.f.metadata,bytes:x.f.bytes});refused(await late,'disposed');assert.equal(x.model.snapshot().previous,null);assert.throws(()=>x.model.begin(400),e=>e instanceof ContractError&&e.code==='ACQUISITION_DISPOSED');
});
test('added unique collection member and its reachable roles refuse a changed closure',async()=>{
  const x=setup(),t=x.model.begin(400);await x.model.first(t);
  x.f.metadata.identities.push({identity:'third',owner:{kind:'platform',id:'platform'},permanentId:'third-id'});
  x.f.metadata.roleOutcomes.push({identity:'third',role:'source',status:'read'});
  x.f.metadata.manifest.roles.push({identity:'third',role:'source',revision:'r3',resourceId:'source'});
  x.f.metadata.manifest.dependencies.push({from:'selected',to:'third',kind:'component'});
  x.f.metadata.collections[0].members.push({identity:'third',ordinal:2});x.f.metadata.manifest.membership[0].identities.push('third');
  refused(await x.model.validate(t),'changed');
});
test('renamed collection member cannot silently omit an originally required role',async()=>{
  const x=setup(),t=x.model.begin(400);await x.model.first(t);x.f.metadata.identities[1].identity='renamed';x.f.metadata.roleOutcomes[1].identity='renamed';x.f.metadata.manifest.roles[1].identity='renamed';x.f.metadata.manifest.dependencies[0].to='renamed';x.f.metadata.collections[0].members[1].identity='renamed';x.f.metadata.manifest.membership[0].identities[1]='renamed';refused(await x.model.validate(t),'missing');
});
test('selected owner identity change invalidates previous capture, not just replacement',async()=>{
  const x=setup();await ready(x);const t=x.model.begin(400);await x.model.first(t);x.f.metadata.identities[0].owner.id='other';refused(await x.model.validate(t),'owner-changed');assert.equal(x.model.snapshot().previous,null);
});
test('backwards injected clock and expired authority cannot acquire or keep previous bytes',async()=>{
  const x=setup();await ready(x);x.setTime(9);assert.equal(x.model.snapshot().lastRefusal,'clock-invalid');assert.equal(x.model.snapshot().previous,null);
  const y=setup();await ready(y);y.setTime(1000);assert.equal(y.model.snapshot().previous,null);assert.throws(()=>y.model.begin(1200),e=>e instanceof ContractError&&e.code==='ACQUISITION_EXPIRED');
});
test('semantic collection ordinals enter immutable content identity across independent successful captures',async()=>{
  const x=setup(),a=await ready(x);const y=setup(f=>{f.metadata.collections[0].members[0].ordinal=1;f.metadata.collections[0].members[1].ordinal=0;}),b=await ready(y);
  assert.equal(a.kind,'complete');assert.equal(b.kind,'complete');if(a.kind!=='complete'||b.kind!=='complete')return;
  assert.notEqual(a.candidate.contentId,b.candidate.contentId);assert.equal(canonical(a.candidate.manifest),canonical(b.candidate.manifest));
});
test('original authority epoch remains separate from identical captured content identity',async()=>{
  const a=await ready(setup());const b=await ready(setup(f=>{f.contract.binding.subjectId='bob';f.metadata.binding.subjectId='bob';f.contract.epoch.policy.revision='20';f.metadata.epoch.policy.revision='20';}));
  if(a.kind!=='complete'||b.kind!=='complete')assert.fail('expected complete');assert.equal(a.candidate.contentId,b.candidate.contentId);assert.notEqual(a.candidate.observationId,b.candidate.observationId);
});
