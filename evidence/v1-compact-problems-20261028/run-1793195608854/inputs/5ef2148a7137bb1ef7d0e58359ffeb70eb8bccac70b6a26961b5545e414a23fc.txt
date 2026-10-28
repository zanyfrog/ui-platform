import test from 'node:test';import assert from 'node:assert/strict';
import {groupEditorProblems} from '../../src/client/visual-artifacts/editor-problems.js';
test('exact duplicates deduplicate within source context and affected nodes are retained',()=>{
 const warning={severity:'warning' as const,message:'Manual layout',node:'one'};const groups=groupEditorProblems({saved:[],local:[warning,warning,{...warning,node:'two'}]});assert.equal(groups[0].unique.length,2);assert.equal(groups[0].grouped.size,1);assert.deepEqual([...groups[0].grouped.values()][0].map(d=>d.node),['one','two']);
});
test('saved revision and draft findings never share groups',()=>{
 const d={severity:'warning' as const,message:'Same message',node:'one'};const a=groupEditorProblems({saved:[d],local:[d],revision:'first'}),b=groupEditorProblems({saved:[d],local:[d],revision:'second'});assert.equal(a[0].unique.length,1);assert.equal(a[1].unique.length,1);assert.notEqual([...a[0].grouped.keys()][0],[...a[1].grouped.keys()][0]);assert.notEqual([...a[1].grouped.keys()][0],[...b[1].grouped.keys()][0]);
});
test('severity and message differences are never downgraded or merged',()=>{
 const groups=groupEditorProblems({saved:[],local:[{severity:'error',message:'Broken',node:'one'},{severity:'warning',message:'Broken',node:'one'},{severity:'warning',message:'Other',node:'one'}]});assert.equal(groups[0].grouped.size,3);assert.equal(groups[0].unique.filter(d=>d.severity==='error').length,1);assert.equal(groups[0].unique.filter(d=>d.severity==='warning').length,2);
});
test('artifact-level findings and input arrays remain unchanged',()=>{
 const input={saved:[],local:[{severity:'error' as const,message:'Broken'}]},before=JSON.stringify(input);assert.equal(groupEditorProblems(input)[0].unique.length,1);assert.equal(JSON.stringify(input),before);
});
