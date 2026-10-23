// One exact authored observation test. No workspace test config, launchers or providers.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const test='tests/preview-contract-model/acquisition.test.ts';
const model='src/preview-contract-model/acquisition.ts',shared='src/preview-contract-model/model.ts';
const sources=[model,shared,test,'scripts/verify-acquisition-contract-model.mjs','docs/architecture/builder-v1-wp5-f-l1b-vectors-admission-20261023.md'];
const allow={
  [model]:['./model.ts'],[shared]:['node:crypto'],
  [test]:['node:test','node:assert/strict','../../src/preview-contract-model/acquisition.ts','../../src/preview-contract-model/model.ts'],
};
const hashes={},imports={};
for(const p of sources){const source=readFileSync(path.join(root,p),'utf8');hashes[p]=createHash('sha256').update(source).digest('hex');
  if(allow[p]) {
    const paths=[...source.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g)].map(m=>m[1]);
    if(paths.some(i=>!allow[p].includes(i)))throw Error('UNADMITTED_IMPORT '+p);
    if(/\bimport\s*\(|\bimport\s*['"]|\brequire\s*\(|\bfetch\s*\(|\bset(?:Timeout|Interval)\s*\(/.test(source))throw Error('UNADMITTED_EXECUTION '+p);
    imports[p]=paths;
  }
}
const out=path.join(root,'evidence/builder-v1-wp5-f-l1b-20261023',`run-${Date.now()}`);mkdirSync(out);
const args=['--experimental-strip-types','--test','--test-concurrency=1','--test-reporter=tap',test];
writeFileSync(path.join(out,'admission.json'),JSON.stringify({sources,sha256:hashes,imports,args,serial:true,retries:0,setupHooks:[],workspaceConfiguration:false,closure:'New acquisition model + unchanged admitted L2-B pure module + one test + Node builtins only. No PreviewModel instance or production execution.'},null,2));
const env={...process.env};delete env.NODE_OPTIONS;delete env.NODE_PATH;
const r=spawnSync(process.execPath,args,{cwd:root,env,encoding:'utf8',timeout:30000,maxBuffer:4*1024*1024});
writeFileSync(path.join(out,'tests.tap'),r.stdout??'');writeFileSync(path.join(out,'stderr.txt'),r.stderr??'');
const changed=sources.filter(p=>hashes[p]!==createHash('sha256').update(readFileSync(path.join(root,p))).digest('hex'));
writeFileSync(path.join(out,'result.json'),JSON.stringify({exitCode:r.status,error:r.error?.message??null,signal:r.signal,changedSources:changed,passed:r.status===0&&!changed.length,node:process.version,limits:'Authored observations only; no D6 acquisition, protected coherence, native execution, owner authority, durability or real concurrent-writer qualification.'},null,2));
console.log(JSON.stringify({out,exitCode:r.status,changedSources:changed}));process.exitCode=r.status===0&&!changed.length?0:1;
