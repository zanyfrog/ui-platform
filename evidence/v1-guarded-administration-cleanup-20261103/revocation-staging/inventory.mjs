import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';
const dir=path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/,'$1');
const files=fs.readdirSync(dir).filter(n=>n!=='files.json').map(n=>path.join(dir,n));
for(const n of ['revocation-browser-candidate.json','revocation-stored-candidate.json','revocation-proposal.json','prepare-revocation.mjs','verify-revocation.mjs'])files.push(path.resolve(dir,'..',n));
files.push(path.resolve('docs/architecture/v1-local-pilot-administration-cleanup-revocation-staging-continuation-20261103.md'));
fs.writeFileSync(path.join(dir,'files.json'),JSON.stringify(files.map(p=>({path:p,bytes:fs.statSync(p).size,sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')})),null,2));console.log(JSON.stringify({inventoriedFiles:files.length}));
