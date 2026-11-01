import test from 'node:test';
import assert from 'node:assert/strict';
import {insertNode,setNodeAttribute as mutateAttribute,removeNodeAttribute as removeAttribute,removeManagedNode,validatePageAnchorChange,parseSource} from '../../packages/visual-artifacts/src/source.js';
import {duplicateSection} from '../../packages/visual-artifacts/src/duplicate-section.js';
import {fixture} from '../html-first/backend.js';
const setNodeAttribute=(source:string,id:string,name:string,value:string)=>mutateAttribute(source,id,name,value,'page');
const removeNodeAttribute=(source:string,id:string,name:string)=>removeAttribute(source,id,name,'page');
const initial = '<section class="uip-layout-item" data-uip-node="intro"><a data-uip-node="link">Go</a></section><section class="uip-layout-item" data-uip-node="target"><h2 data-uip-node="heading">Target</h2></section>';
const anchored = setNodeAttribute(initial,'target','id','features');
const linked = setNodeAttribute(anchored,'link','href','#features');
test('literal anchor/link editing preserves content, managed IDs, containment and order',()=>{
 assert.deepEqual(parseSource(linked).nodes.map(n=>[n.id,n.parent?.id]),parseSource(initial).nodes.map(n=>[n.id,n.parent?.id]));
 assert.ok(linked.includes('id="features"'));assert.ok(linked.includes('href="#features"'));assert.ok(linked.includes('>Target</h2>'));
 assert.doesNotThrow(()=>validatePageAnchorChange(linked,linked));
});
test('ordinary insertion outer wrapper supports a Page-root anchor without changing wrapper identity',()=>{
 let n=0;const inserted=insertNode(initial,'section',undefined,undefined,()=>`new_${++n}`);
 const candidate=setNodeAttribute(inserted,'new_2','id','closing');
 assert.equal(parseSource(candidate).nodes.find(n=>n.id==='new_2')!.parent?.id,'new_1');
 assert.doesNotThrow(()=>setNodeAttribute(candidate,'link','href','#closing'));
 const nested=insertNode(initial,'section',undefined,'intro',()=>`nested_${++n}`);
 assert.throws(()=>setNodeAttribute(nested,`nested_${n}`,'id','nested'));
});
test('invalid, duplicate, nested and unmanaged targets and unsupported references refuse',()=>{
 for(const id of ['Bad','1bad','a b','a%20b','a_b'])assert.throws(()=>setNodeAttribute(initial,'target','id',id));
 assert.throws(()=>setNodeAttribute(initial+'<div id="features"></div>','target','id','features'));
 for(const legacy of ['<div id="fe&#97;tures"></div>','<div id="fe&#x61;tures"></div>','<div id="old" id="features"></div>','<a href="&num;features">Legacy</a>'])assert.throws(()=>setNodeAttribute(initial+legacy,'target','id','features'),/encoded|duplicate/);
 assert.throws(()=>setNodeAttribute(initial,'heading','id','features'));
 for(const href of ['#missing','#Features','#%66eatures','#'])assert.throws(()=>setNodeAttribute(anchored,'link','href',href));
 assert.throws(()=>setNodeAttribute(initial+'<section id="features"></section>','link','href','#features'));
 assert.throws(()=>setNodeAttribute(anchored+'<div id="features"></div>','link','href','#features'));
 assert.throws(()=>validatePageAnchorChange(initial,anchored.replace('id="features"','id="features" ID="features"')));
});
test('surviving links prevent rename, clear and subtree removal with referring identity',()=>{
 assert.throws(()=>setNodeAttribute(linked,'target','id','renamed'),/link/);
 assert.throws(()=>removeNodeAttribute(linked,'target','id'),/link/);
 assert.throws(()=>removeManagedNode(linked,'target'),/link/);
 const noLink=removeManagedNode(linked,'intro');assert.doesNotThrow(()=>removeManagedNode(noLink,'target'));
 assert.throws(()=>removeManagedNode(linked+'<a href="#features">Manual</a>','target'),/unsupported|unmanaged/);
});
test('unchanged legacy fragments are preserved; new external URLs are not local references',()=>{
 const legacy='<a data-uip-node="legacy" href="#%66oo">Old</a><section id="foo">Old target</section>';
 assert.doesNotThrow(()=>validatePageAnchorChange(legacy,legacy+'<p data-uip-node="new">New</p>'));
 assert.doesNotThrow(()=>setNodeAttribute(initial,'link','href','https://example.test/#elsewhere'));
});
test('normal authorized fixture Save retains hash on failed anchor admission and persists valid HTML',async()=>{
 const f=await fixture();try{let saved=await f.read();const save=(source:string)=>f.bridge('/api/apps/fixture-app/visual-pages',JSON.stringify({method:'PUT',body:JSON.stringify({files:{...saved.files,source},expectedHash:saved.hash})}));
 await save(linked);saved=await f.read();assert.equal(saved.files.source,linked);const hash=saved.hash;
 for(const source of [linked.replace('id="features"','id="changed"'),linked.replace('#features','#missing'),linked.replace('id="features"','id="Bad"')]){await assert.rejects(()=>save(source));assert.equal((await f.read()).hash,hash);}
 }finally{await f.close();}
});
test('accepted duplication continues refusing anchored/reference-bearing Pages',()=>{
 const metadata={schemaVersion:1,artifactId:'art_anchors',kind:'page',name:'anchors',displayName:'Anchors',route:'/anchors'};
 for(const source of [anchored,linked])assert.throws(()=>duplicateSection({source,metadata:JSON.stringify(metadata),css:'',fixtures:'{}',code:'export {};'},'target',[]));
});

test('Page admission does not expand generic Component/Shell fragment policy',()=>{
 const source='<a data-uip-node="link">Widget</a>';
 for(const kind of ['component','shell',undefined] as const)assert.ok(mutateAttribute(source,'link','href','#widget',kind).includes('href="#widget"'));
 assert.throws(()=>mutateAttribute(source,'link','href','#widget','page'));
});
