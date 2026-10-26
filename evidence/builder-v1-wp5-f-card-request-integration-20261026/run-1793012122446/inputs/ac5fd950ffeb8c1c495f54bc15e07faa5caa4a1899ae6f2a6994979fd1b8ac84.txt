import '../preview-contract-model/saved-preview-request.test.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import { fixture,context } from '../saved-card-selection/fixtures.js';
import { identifyRetainedSavedCard } from '../../src/client/visual-artifacts/saved-card-target.js';
import { parseSavedPreviewSelection,productionSavedPreviewUnavailable,savedPreviewSelectionKey } from '../../src/shared/saved-preview-request.js';
import { SavedPreviewRequestController } from '../../src/client/builder-workspace/saved-preview-request.js';
async function selection(){const snapshot=await identifyRetainedSavedCard(await fixture());assert.equal(snapshot.state,'identified');if(snapshot.state!=='identified')throw Error('fixture refused');return{subjectId:context.subjectId,sessionRevision:context.sessionRevision,applicationId:context.applicationId,applicationKey:'routing-key',identity:structuredClone(context.page),kind:'page',dirty:false,ownerSelection:JSON.parse(JSON.stringify(snapshot)),sourceNode:{nodeId:snapshot.target.source.nodeId,savedRevision:snapshot.target.source.committedHash}};}
test('exact owner metadata survives request schema as unavailable retained provenance',async()=>{const input=await selection();const parsed=parseSavedPreviewSelection(input);assert.deepEqual(parsed,input);assert.deepEqual(productionSavedPreviewUnavailable({schema:'saved-preview-request-v1',generation:1,trigger:'explicit-check',selection:parsed}),{kind:'unavailable',code:'PROVIDER_NOT_QUALIFIED'});input.ownerSelection.target.implementation.exportName='modified';assert.equal((parsed.ownerSelection as any).target.implementation.exportName,'UibCard');});
for(const [label,mutate]of [
  ['Application',(s:any)=>s.ownerSelection.target.source.applicationId='other'],
  ['Page',(s:any)=>s.ownerSelection.target.source.page.id='art_other'],
  ['owner',(s:any)=>s.ownerSelection.target.source.page.owner.revision='other'],
  ['subject',(s:any)=>s.ownerSelection.target.context.subjectId='other'],
  ['session',(s:any)=>s.ownerSelection.target.context.sessionRevision='other'],
  ['node',(s:any)=>s.sourceNode.nodeId='other'],
  ['hash',(s:any)=>s.sourceNode.savedRevision='other'],
  ['generation',(s:any)=>s.ownerSelection.generation.source=-1],
  ['extra capability',(s:any)=>s.ownerSelection.target.token='forbidden'],
  ['invented provenance',(s:any)=>s.ownerSelection.reason='AUTHORIZED'],
]as const)test(`rejects conflicting ${label}`,async()=>{const s=await selection();mutate(s);assert.throws(()=>parseSavedPreviewSelection(s),/SAVED_PREVIEW_REQUEST_INVALID/);});
test('unavailable owner cannot retain a source node; exact refusal generations remain',async()=>{const s:any=await selection();s.ownerSelection={state:'unavailable',reason:'SOURCE_UNCERTAIN',generation:{selection:8,source:9},target:null};assert.throws(()=>parseSavedPreviewSelection(s));delete s.sourceNode;const parsed=parseSavedPreviewSelection(s);assert.deepEqual(parsed.ownerSelection,s.ownerSelection);assert.equal(productionSavedPreviewUnavailable({schema:'saved-preview-request-v1',generation:1,trigger:'explicit-check',selection:parsed}).code,'SOURCE_OWNER_UNAVAILABLE');});
test('all target identity and generation changes invalidate the identity key',async()=>{const s=await selection(),before=savedPreviewSelectionKey(s);for(const modify of [(s:any)=>s.ownerSelection.generation.selection++,(s:any)=>s.ownerSelection.generation.source++,(s:any)=>s.ownerSelection.target.implementation.definitionRevision='declared-new']){const next=structuredClone(s);modify(next);assert.notEqual(savedPreviewSelectionKey(next),before);}});
test('forced owner emissions synchronously replace pending identity and suppress late completion',async()=>{let release!:()=>void;const c=new SavedPreviewRequestController(()=>new Promise(r=>{release=r;}));const s=await selection();c.select(s);const pending=c.check();assert.equal(c.snapshot.state,'pending');const next:any=structuredClone(s);delete next.sourceNode;next.ownerSelection={state:'unavailable',reason:'DIRTY_DRAFT',generation:{selection:3,source:6},target:null};c.select(next,true);assert.equal(c.snapshot.request,null);assert.equal(c.snapshot.selection?.sourceNode,undefined);release();await pending;assert.equal(c.snapshot.outcome,null);assert.equal(c.snapshot.state,'idle');});
test('forced callbacks cannot resume parked/suspended/disposed controllers',async()=>{for(const state of ['park','suspend','dispose']as const){const c=new SavedPreviewRequestController();c.select(await selection());c[state]();const before=c.snapshot;c.select(await selection(),true);assert.deepEqual(c.snapshot,before);}});
test('even an identical owner emission cancels the pending generation',async()=>{let release!:()=>void;const c=new SavedPreviewRequestController(()=>new Promise(r=>{release=r;}));const s=await selection();c.select(s);const pending=c.check(),generation=c.snapshot.generation;c.select(s,true);assert(c.snapshot.generation>generation);assert.equal(c.snapshot.request,null);release();await pending;assert.equal(c.snapshot.outcome,null);});
