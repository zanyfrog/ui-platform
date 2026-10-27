import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from '../../node_modules/esbuild/lib/main.js';
const out=import.meta.dirname, root=path.resolve(out,'../..');
// Execute exact pure source modules; no service, browser, store or runtime rendering.
const sources=['source','validation','model','expression','form'];
const allowed=new Map(sources.map(name=>[path.join(root,'packages/visual-artifacts/src',name+'.ts'),path.join(out,'inputs',name+'.ts')]));
const expression=path.resolve(root,'../UI Platform Data Services/packages/dataset-operations/src/declarative-expression.ts');
allowed.set(expression,path.join(out,'inputs/declarative-expression.ts'));
const result=await build({stdin:{contents:"export {setNodeAttribute,parseSource} from './packages/visual-artifacts/src/source.ts';export {validateArtifact} from './packages/visual-artifacts/src/validation.ts';",resolveDir:root,loader:'ts'},bundle:true,write:false,format:'esm',platform:'node',metafile:true,plugins:[{name:'exact-pure-inputs',setup(b){b.onResolve({filter:/.*/},a=>{const target=a.path==='@ui-platform/dataset-operations/expression'?expression:path.resolve(a.resolveDir,a.path.replace(/\.js$/,'.ts'));if(!allowed.has(target))throw Error('UNADMITTED_IMPORT '+target);return {path:target};});b.onLoad({filter:/.*/},a=>({contents:fs.readFileSync(allowed.get(a.path),'utf8'),loader:'ts',resolveDir:path.dirname(a.path)}));}}]});
fs.writeFileSync(path.join(out,'resolved-graph.json'),JSON.stringify(result.metafile,null,2));
fs.writeFileSync(path.join(out,'probe-modules.mjs'),result.outputFiles[0].text);
const {setNodeAttribute,parseSource,validateArtifact}=await import('./probe-modules.mjs');
const metadata={schemaVersion:1,artifactId:'art_url_probe',kind:'page',name:'url-probe',displayName:'URL probe',route:'/url-probe'};
const findings=[];
for(const [tag,attribute,value] of [['a','href','javascript:alert(1)'],['img','src','data:image/svg+xml,<svg></svg>'],['a','href','/ordinary-route'],['img','alt','A "quoted" & <literal> description']]){
 const original=tag==='img'?'<img data-uip-node="node_probe">':'<a data-uip-node="node_probe">Link</a>';
 const source=setNodeAttribute(original,'node_probe',attribute,value);
 const errors=validateArtifact({metadata,source,css:''}).filter(d=>d.severity==='error');
 assert.equal(parseSource(source).nodes[0].attributes[attribute],value);
 findings.push({tag,attribute,value,source,errors});
}
assert.equal(findings[0].errors.length,0,'Probe no longer reproduces missing URL-scheme validation');
fs.writeFileSync(path.join(out,'url-contract-result.json'),JSON.stringify({scope:'Pure source helper/shared validator only; unsafe URLs never navigated, rendered or saved',existingHelperRejectsJavascriptScheme:false,findings},null,2));
console.log('Confirmed: attribute escaping and managed identity checks do not supply URL scheme refusal. No URL was rendered or saved.');
