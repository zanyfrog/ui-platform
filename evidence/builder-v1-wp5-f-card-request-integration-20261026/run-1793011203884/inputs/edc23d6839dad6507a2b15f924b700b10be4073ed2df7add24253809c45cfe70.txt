import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSavedPreviewSelection, parseSavedPreviewRequest, productionSavedPreviewUnavailable, SavedPreviewRequestError } from '../../src/shared/saved-preview-request.js';
import type { SavedPreviewSelection } from '../../src/shared/saved-preview-request.js';
import { SavedPreviewRequestController } from '../../src/client/builder-workspace/saved-preview-request.js';
const selection=():SavedPreviewSelection=>({subjectId:'alice',sessionRevision:'session-1',applicationId:'app-permanent',applicationKey:'app-key',identity:{owner:{kind:'application',id:'app-permanent'},format:'visual',id:'page-one'},kind:'page',dirty:false});
const request=(s:SavedPreviewSelection|null)=>({schema:'saved-preview-request-v1' as const,generation:1,trigger:'explicit-check' as const,selection:s});
function deferred(){let release!:()=>void;const promise=new Promise<void>(r=>{release=r;});return {promise,release};}
for(const [name,make,code]of [
  ['no artifact',()=>null,'NO_SELECTION'],
  ['repair only',()=>{const s=selection();s.identity={owner:s.identity.owner,format:'visual',repairLocator:'repair-only'};return s;},'REPAIR_ONLY_IDENTITY'],
  ['package definition',()=>{const s=selection();s.identity={owner:{kind:'package',id:'@ui-base/ui',revision:'0.5.1'},format:'package',id:'canonical-card'};s.kind='package';return s;},'PACKAGE_DEFINITION_ONLY'],
  ['unresolved saved node',selection,'SAVED_NODE_UNRESOLVED'],
  ['unsupported artifact',()=>({...selection(),kind:'dataset',identity:{...selection().identity,format:'generic' as const}}),'UNSUPPORTED_ARTIFACT'],
  ['unqualified production provider',()=>({...selection(),sourceNode:{nodeId:'explicit-authored-node',savedRevision:'saved-1'}}),'PROVIDER_NOT_QUALIFIED'],
] as const)test('explicit unavailable outcome: '+name,()=>{assert.deepEqual(productionSavedPreviewUnavailable(request(make())),{kind:'unavailable',code});});
test('runtime contract rejects hidden capabilities, fields and inconsistent owner',()=>{
  assert.throws(()=>parseSavedPreviewRequest({...request(selection()),capture:{bytes:'forbidden'}}),SavedPreviewRequestError);
  assert.throws(()=>parseSavedPreviewSelection({...selection(),identity:{...selection().identity,owner:{kind:'application',id:'other-app'}}}),SavedPreviewRequestError);
  assert.throws(()=>parseSavedPreviewRequest({...request(selection()),generation:NaN}),SavedPreviewRequestError);
  assert.throws(()=>parseSavedPreviewSelection({...selection(),sourceNode:{nodeId:'x',savedRevision:''}}),SavedPreviewRequestError);
});
test('accessors cannot supply or mutate identity during validation',()=>{
  let invoked=false;const input={...selection()};Object.defineProperty(input,'subjectId',{enumerable:true,get(){invoked=true;return 'alice';}});
  assert.throws(()=>parseSavedPreviewSelection(input),SavedPreviewRequestError);assert.equal(invoked,false);
});
test('parsed requests and snapshots are copies of original identity',async()=>{
  const c=new SavedPreviewRequestController(),s=selection();c.select(s);s.identity.id='retargeted';await c.check();assert.equal(c.snapshot.request!.selection!.identity.id,'page-one');
  const snapshot=c.snapshot;snapshot.selection!.identity.id='mutated';assert.equal(c.snapshot.selection!.identity.id,'page-one');assert.equal(c.snapshot.outcome!.kind,'unavailable');
});
test('invalid original identity has explicit unresolved unavailable state',async()=>{
  const c=new SavedPreviewRequestController();c.select({subjectId:'incomplete'});assert.equal(c.snapshot.outcome!.code,'UNRESOLVED_IDENTITY');assert.equal(c.snapshot.selection,null);assert.equal((await c.check())!.code,'UNRESOLVED_IDENTITY');
});
test('dirty-only updates are informational and preserve pending generation',async()=>{
  const d=deferred(),c=new SavedPreviewRequestController(()=>d.promise);c.select(selection());const pending=c.check(),g=c.snapshot.generation;c.select({...selection(),dirty:true});assert.equal(c.snapshot.generation,g);assert.equal(c.snapshot.state,'pending');d.release();await pending;assert.equal(c.snapshot.selection!.dirty,true);assert.equal(c.snapshot.outcome!.kind,'unavailable');
});
for(const field of ['subject','session','Application','owner','artifact','source-node'] as const)test(field+' change cancels obsolete check',async()=>{
  const d=deferred(),c=new SavedPreviewRequestController(()=>d.promise);c.select(selection());const pending=c.check(),s=selection();
  if(field==='subject')s.subjectId='bob';if(field==='session')s.sessionRevision='session-2';if(field==='Application'){s.applicationId='other-app';s.applicationKey='other-key';s.identity.owner.id='other-app';}
  if(field==='owner')s.identity.owner={kind:'platform',id:'platform-authority'};if(field==='artifact')s.identity.id='page-two';if(field==='source-node')s.sourceNode={nodeId:'explicit-node',savedRevision:'saved-1'};
  c.select(s);d.release();assert.equal(await pending,undefined);assert.equal(c.snapshot.outcome,null);assert.equal(c.snapshot.state,'idle');assert.deepEqual(c.snapshot.selection,s);
});
for(const operation of ['sourceChanged','park','suspend','dispose'] as const)test(operation+' cancels pending and cannot be undone by completion',async()=>{
  const d=deferred(),c=new SavedPreviewRequestController(()=>d.promise);c.select(selection());const pending=c.check();c[operation]();const after=c.snapshot;d.release();assert.equal(await pending,undefined);assert.deepEqual(c.snapshot,after);
});
test('later explicit check supersedes prior completion without restoring prior request',async()=>{
  const first=deferred(),second=deferred();let calls=0;const c=new SavedPreviewRequestController(()=>++calls===1?first.promise:second.promise);c.select(selection());const a=c.check(),b=c.check();first.release();assert.equal(await a,undefined);assert.equal(c.snapshot.state,'pending');second.release();await b;assert.equal(c.snapshot.state,'unavailable');assert.equal(c.snapshot.request!.generation,c.snapshot.generation);assert.equal(calls,2);
});
test('park/resume, suspend/reselection and terminal disposal have no automatic check',async()=>{
  let calls=0;const c=new SavedPreviewRequestController(async()=>{calls++;});c.select(selection());c.park();await c.check();assert.equal(calls,0);c.resume();assert.equal(c.snapshot.selection,null);c.select(selection());assert.equal(calls,0);await c.check();assert.equal(calls,1);c.suspend();await c.check();assert.equal(calls,1);c.select(selection());assert.equal(c.snapshot.outcome,null);c.dispose();c.select(selection());c.resume();await c.check();assert.equal(c.snapshot.state,'disposed');assert.equal(calls,1);
});
test('completion failure stays permanently unavailable without retry or grant',async()=>{
  let calls=0;const c=new SavedPreviewRequestController(async()=>{calls++;throw Error('authored completion failed');});c.select({...selection(),sourceNode:{nodeId:'node',savedRevision:'rev'}});assert.deepEqual(await c.check(),{kind:'unavailable',code:'PROVIDER_NOT_QUALIFIED'});assert.equal(calls,1);assert.deepEqual(Object.keys(c.snapshot.outcome!).sort(),['code','kind']);
});
test('subscription cleanup on disposal makes later operations inert',()=>{
  const c=new SavedPreviewRequestController();let notifications=0;c.subscribe(()=>notifications++);c.dispose();const count=notifications;c.select(selection());c.sourceChanged();c.park();c.suspend();c.dispose();assert.equal(notifications,count);
});
