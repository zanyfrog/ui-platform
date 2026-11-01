import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd(), evidence=path.resolve('evidence/v1-appearance-layout-20261031');
const baseline=JSON.parse(fs.readFileSync(path.join(evidence,'baseline.json'),'utf8'));
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const entries=new Map();
function add(p,category){p=path.resolve(p);if(!fs.existsSync(p)||!fs.statSync(p).isFile())return;entries.set(p,{path:p,category,bytes:fs.statSync(p).size,sha256:hash(p)});}
function walk(p,category,changed=false){if(!fs.existsSync(p))return;for(const item of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,item.name);if(item.isDirectory())walk(f,category,changed);else if(f!==path.join(evidence,'files.json')&&(!changed||baseline[f]!==hash(f)))add(f,category);}}
for(const name of ['editor.ts','appearance-css.ts','style-controls.ts']){add('src/client/visual-artifacts/'+name,'product-source');add('../v1-normal-smoke-20261026-01/ui-platform/src/client/visual-artifacts/'+name,'disposable-client-copy');}
add('scripts/verify-appearance-layout.mjs','verification');walk(path.resolve('tests/appearance-layout'),'verification');
add('docs/architecture/v1-appearance-and-layout-inspector-acceptance-review-gate-20261101.md','review-report');
walk(evidence,'evidence');walk(path.resolve('../v1-normal-smoke-20261026-01/apps/v1-identity-fixture'),'application-addition-or-change',true);
for(const dir of ['dist','dist-server','packages/platform-core/dist','packages/artifacts/dist','packages/visual-artifacts/dist'])walk(path.resolve(dir),'regenerated-build-output');
const files=[...entries.values()].sort((a,b)=>a.path.localeCompare(b.path));
const categories={};for(const f of files)categories[f.category]=(categories[f.category]??0)+1;
fs.writeFileSync(path.join(evidence,'files.json'),JSON.stringify({capturedAt:new Date().toISOString(),algorithm:'SHA-256',excludesSelf:true,liveLogsMayAppend:true,categories,files},null,2)+'\n');
for(const f of files)if(hash(f.path)!==f.sha256)throw Error('Changed during inventory: '+f.path);
console.log(JSON.stringify({verified:files.length,categories}));
