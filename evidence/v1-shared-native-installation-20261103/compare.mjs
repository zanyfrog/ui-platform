import fs from 'node:fs';
import{createHash}from'node:crypto';
const here=new URL('./',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n,here),'utf8'));
const before=read('applications-before.json'),after=read('applications-after.json'),files=new Map(after.files.map(f=>[f.path,f]));
const changed=before.files.filter(f=>files.get(f.path)?.sha256!==f.sha256).map(f=>({path:f.path,appendedBytes:files.get(f.path).bytes-f.bytes,originalPrefixPreserved:createHash('sha256').update(fs.readFileSync(f.path).subarray(0,f.bytes)).digest('hex')===f.sha256}));
const initial=new Map(read('tree-after.json').map(e=>[e.path,e])),post=new Map(read('tree-post-verification.json').map(e=>[e.path,e]));
const cacheChanges=[...new Set([...initial.keys(),...post.keys()])].filter(p=>JSON.stringify(initial.get(p))!==JSON.stringify(post.get(p)));
const result={applicationFiles:before.files.length,changedApplicationFiles:changed,securityTablesUnchanged:JSON.stringify(before.tables)===JSON.stringify(after.tables),registrationsUnchanged:JSON.stringify(before.registrations)===JSON.stringify(after.registrations),postInstallVerificationTreeChanges:cacheChanges};
fs.writeFileSync(new URL('preservation-comparison.json',here),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
