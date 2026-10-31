import test from 'node:test';
import assert from 'node:assert/strict';
import {insertNode,parseSource,setHeadingLevel} from '../../packages/visual-artifacts/src/source.js';
test('insertion retains managed contracts for all six headings',()=>{
 for(let level=1;level<=6;level++){let n=0;const source=insertNode('','h'+level,undefined,undefined,()=>`node_${++n}`);const nodes=parseSource(source).nodes;assert.equal(nodes[1].tag,'h'+level);assert.equal(nodes[1].id,'node_2');assert.equal(nodes[1].parent,nodes[0]);assert.ok(source.includes(`</h${level}>`));}
});
test('conversion changes only paired tag names and preserves attributes, mixed content and position',()=>{
 const source='<section data-uip-node="container"><p data-uip-node="before">Before</p><H2 class="title" data-uip-node="heading" aria-label="Title">Text &amp; <span>detail</span></H2 ><p data-uip-node="after">After</p></section>';
 const expected=source.replace('<H2 ','<h3 ').replace('</H2 >','</h3 >');const changed=setHeadingLevel(source,'heading','h3');assert.equal(changed,expected);const node=parseSource(changed).nodes.find(n=>n.id==='heading')!;assert.equal(node.parent?.id,'container');assert.equal(node.children[0].tag,'span');assert.deepEqual(parseSource(changed).nodes.filter(n=>n.id).map(n=>n.id),['container','before','heading','after']);
});
test('same level is byte-identical and repeated conversion never duplicates identity/content',()=>{
 let source='<h1 data-uip-node="title">A &lt;literal&gt;</h1>';assert.equal(setHeadingLevel(source,'title','h1'),source);for(let n=2;n<=6;n++){source=setHeadingLevel(source,'title','h'+n);assert.equal(parseSource(source).nodes.length,1);assert.equal((source.match(/data-uip-node=/g)||[]).length,1);assert.ok(source.includes('A &lt;literal&gt;'));}
});
test('malformed, duplicate, manual, nonheading and Component markup is refused',()=>{
 for(const source of ['<h2>Manual</h2>','<h2 data-uip-node="title">Unclosed','<h2 data-uip-node="title">Mismatch</h3>','<h2 data-uip-node="title">One</h2><h2 data-uip-node="title">Two</h2>','<h2 data-uip-node="title" DATA-UIP-NODE="other">Duplicate</h2>','<h2 data-uip-node="title"/>','<p data-uip-node="title">Paragraph</p>','<h2 data-uip-node="title" data-uip-component="cmp_platform_test">Component</h2>'])assert.throws(()=>setHeadingLevel(source,'title','h3'),undefined,source);
 for(const level of ['h0','h7','H2','div','h2 onclick=bad'])assert.throws(()=>setHeadingLevel('<h2 data-uip-node="title">Title</h2>','title',level));
});
