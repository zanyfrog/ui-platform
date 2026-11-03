import fs from 'node:fs';
import path from 'node:path';
import{createHash}from'node:crypto';
const dir=path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/,'$1');
const files=fs.readdirSync(dir).filter(n=>n!=='files.json').map(n=>path.join(dir,n));
files.push(path.resolve('docs/architecture/v1-local-pilot-checksum-aware-cleanup-staging-chrome-continuation-20261103.md'),path.resolve(dir,'../browser-protected-state.json'),path.resolve(dir,'../reviewed-request.json'));
files.push(...JSON.parse(fs.readFileSync(path.join(dir,'post-stage.json'),'utf8')).sourceFiles.map(f=>f.path));
const inventory=files.map(p=>({path:p,bytes:fs.statSync(p).size,sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')}));
fs.writeFileSync(path.join(dir,'files.json'),JSON.stringify(inventory,null,2));console.log(JSON.stringify({inventoriedFiles:inventory.length}));
