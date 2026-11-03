import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';
const dir=path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/,'$1'),read=n=>JSON.parse(fs.readFileSync(path.join(dir,n),'utf8')),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const b=read('before.json'),a=read('after-menu.json'),old=new Map(b.files.map(f=>[f.path,f]));
const result={changed:a.files.filter(f=>old.get(f.path)?.sha256!==f.sha256),removed:b.files.filter(f=>!a.files.some(n=>n.path===f.path)),securityUnchanged:JSON.stringify(b.tables)===JSON.stringify(a.tables),registrationsUnchanged:JSON.stringify(b.registrations)===JSON.stringify(a.registrations)};
fs.writeFileSync(path.join(dir,'menu-repair-preservation.json'),JSON.stringify(result,null,2));
const files=fs.readdirSync(dir).filter(n=>n!=='files.json').map(n=>path.join(dir,n));files.push(path.resolve('docs/architecture/v1-local-pilot-administration-cleanup-menu-repair-continuation-20261103.md'));
fs.writeFileSync(path.join(dir,'files.json'),JSON.stringify(files.map(p=>({path:p,bytes:fs.statSync(p).size,sha256:hash(p)})),null,2));console.log(JSON.stringify(result));
