// Exactly one authored-data test; no workspace setup/config or product execution.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const model='src/preview-contract-model/model.ts',test='tests/preview-contract-model/model.test.ts';
const sources=[model,test,'scripts/verify-preview-contract-model.mjs','docs/architecture/builder-v1-wp5-f-l2b-vectors-admission-20261023.md'];
const allowed={
  [model]:['node:crypto'],
  [test]:['node:test','node:assert/strict','node:crypto','../../src/preview-contract-model/model.ts'],
};
const hashes={};const imports={};
for(const file of sources){const text=readFileSync(path.join(root,file),'utf8');hashes[file]=createHash('sha256').update(text).digest('hex');
  if(allowed[file]){
    const imported=[...text.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);
    if(imported.some(p=>!allowed[file].includes(p)))throw Error('UNADMITTED_IMPORT '+file);
    if(/\bimport\s*\(|\brequire\s*\(|\bfetch\s*\(|\bset(?:Timeout|Interval)\s*\(/.test(text))throw Error('UNADMITTED_EXECUTION '+file);
    imports[file]=imported;
  }
}
const out=path.join(root,'evidence/builder-v1-wp5-f-l2b-20261023',`run-${Date.now()}`);mkdirSync(out);
const args=['--experimental-strip-types','--test','--test-concurrency=1','--test-reporter=tap',test];
writeFileSync(path.join(out,'admission.json'),JSON.stringify({sources,sha256:hashes,imports,args,serial:true,retries:0,setupHooks:[],workspaceConfiguration:false,closure:'Model + one test + Node builtins only. No product modules, providers, protected readers, browser or network.'},null,2));
const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH;
const result=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
writeFileSync(path.join(out,'tests.tap'),result.stdout??'');writeFileSync(path.join(out,'stderr.txt'),result.stderr??'');
const changed=sources.filter(p=>hashes[p]!==createHash('sha256').update(readFileSync(path.join(root,p))).digest('hex'));
writeFileSync(path.join(out,'result.json'),JSON.stringify({exitCode:result.status,error:result.error?.message??null,signal:result.signal,changedSources:changed,passed:result.status===0&&!changed.length,node:process.version,limits:'Pure authored model correctness only; no durability/writer completeness/real timing/coherent source/native sandbox/disclosure race qualification.'},null,2));
console.log(JSON.stringify({out,exitCode:result.status,changedSources:changed}));process.exitCode=result.status===0&&!changed.length?0:1;
