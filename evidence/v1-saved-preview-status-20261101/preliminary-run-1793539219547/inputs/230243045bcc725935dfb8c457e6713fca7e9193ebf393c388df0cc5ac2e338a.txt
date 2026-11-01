import test from 'node:test';import assert from 'node:assert/strict';
import {insertNode,parseSource,setNodeSetting,readNodeSettings,setNodeAttribute} from '../../packages/visual-artifacts/src/source.js';
import {validateArtifact} from '../../packages/visual-artifacts/src/validation.js';
import {legacyPackageSettingContracts} from '../../packages/visual-artifacts/src/model.js';
import {fixture} from './backend.js';
test('real owner save/reload preserves HTML literal attributes, booleans, text slots and order',async()=>{
 const f=await fixture();try{
  const def=f.packages[0].definition;let n=0,source=insertNode('','uib-card',f.packages[0].id,undefined,()=>`node_${++n}`),id='node_2';
  for(const[k,v]of Object.entries({heading:'A "quote" & <literal>\nnext',variant:'outlined',disabled:true,body:'Body $1 & "quoted" <text>',header:'Header',footer:'Footer'}))source=setNodeSetting(source,id,k,v,def);
  assert.ok(!source.includes('data-uip-settings'));const before=await f.read();const saved=JSON.parse(await f.bridge('/api/apps/fixture-app/visual-pages',JSON.stringify({method:'PUT',body:JSON.stringify({files:{...before.files,source},expectedHash:before.hash})})));const loaded=await f.read();assert.equal(loaded.hash,saved.hash);assert.equal(loaded.files.source,source);assert.deepEqual(readNodeSettings(loaded.files.source,id,def),readNodeSettings(source,id,def));
  assert.ok(source.indexOf('Body')<source.indexOf('Header'));const updated=setNodeSetting(source,id,'heading','Second value',def);assert.equal(readNodeSettings(updated,id,def).heading,'Second value');assert.ok(!updated.includes('data-uip-settings'));
 }finally{await f.close();}
});
test('explicit field edit replaces its old JSON duplicate, preserves other legacy data and false semantics',async()=>{
 const f=await fixture();try{const def=f.packages[0].definition;let source='<uib-card data-uip-node="card" data-uip-component="'+f.packages[0].id+'" heading="literal" data-uip-settings="{&quot;heading&quot;:&quot;legacy&quot;,&quot;interactionMode&quot;:&quot;none&quot;}"></uib-card>';
 assert.equal(readNodeSettings(source,'card',def).heading,'legacy');source=setNodeSetting(source,'card','heading','New literal',def);assert.equal(readNodeSettings(source,'card',def).heading,'New literal');assert.ok(!parseSource(source).nodes[0].attributes['data-uip-settings'].includes('heading'));source=setNodeSetting(source,'card','disabled',true,def);source=setNodeSetting(source,'card','disabled',false,def);assert.equal(parseSource(source).nodes[0].attributes.disabled,undefined);
 }finally{await f.close();}
});
test('second real UI Base Panel uses declared same-name HTML properties and shared validation',async()=>{
 const f=await fixture();try{const panel=f.packages[1],contracts=legacyPackageSettingContracts(panel);let source='<uib-panel data-uip-node="panel" data-uip-component="'+panel.id+'"></uib-panel>';source=setNodeSetting(source,'panel','variant','flat',undefined,contracts);source=setNodeSetting(source,'panel','density','compact',undefined,contracts);assert.ok(!source.includes('data-uip-settings'));assert.equal(readNodeSettings(source,'panel',undefined,contracts).variant,'flat');const metadata=(await f.read()).metadata!;assert.deepEqual(validateArtifact({metadata,source,css:''},[],f.packages).filter(d=>d.severity==='error'),[]);assert.throws(()=>setNodeSetting(source,'panel','variant','invalid',undefined,contracts));
 }finally{await f.close();}
});
test('nested/mixed content and malformed/duplicate managed identities are not silently rewritten',async()=>{
 const f=await fixture();try{const def=f.packages[0].definition;for(const inner of ['<uib-panel data-uip-node="child"></uib-panel>','text<span slot="header">Header</span>more'])assert.throws(()=>setNodeSetting('<uib-card data-uip-node="card">'+inner+'</uib-card>','card','body','replace',def));assert.throws(()=>setNodeSetting('<uib-card data-uip-node="card" DATA-UIP-NODE="other"></uib-card>','card','heading','x',def));
 const source=setNodeAttribute('<uib-card data-uip-node="card"></uib-card>','card','heading','<&" $& $1');assert.equal(parseSource(source).nodes[0].attributes.heading,'<&" $& $1');
 }finally{await f.close();}
});
