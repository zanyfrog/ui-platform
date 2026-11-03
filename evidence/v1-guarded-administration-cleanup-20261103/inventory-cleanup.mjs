import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';
const dir=path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/,'$1');
const files=fs.readdirSync(dir).filter(n=>n!=='final-files.json').map(n=>path.join(dir,n));files.push(path.resolve('docs/architecture/v1-local-pilot-administration-cleanup-review-gate-20261103.md'));
fs.writeFileSync(path.join(dir,'final-files.json'),JSON.stringify(files.map(p=>({path:p,bytes:fs.statSync(p).size,sha256:createHash('sha256').update(fs.readFileSync(p)).digest('hex')})),null,2));
