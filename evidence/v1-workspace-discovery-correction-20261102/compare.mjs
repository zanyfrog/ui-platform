import fs from 'node:fs';
import {createHash} from 'node:crypto';
const read=n=>JSON.parse(fs.readFileSync(new URL(`./${n}.json`,import.meta.url),'utf8'));
const before=read('before'),after=read('after'),current=new Map(after.files.map(f=>[f.path,f]));
const changed=before.files.filter(f=>current.get(f.path)?.sha256!==f.sha256).map(f=>({path:f.path,appendedBytes:current.get(f.path)?.bytes-f.bytes,
 originalPrefixPreserved:createHash('sha256').update(fs.readFileSync(f.path).subarray(0,f.bytes)).digest('hex')===f.sha256}));
const result={existingFiles:before.files.length,changedFiles:changed,securityTablesUnchanged:JSON.stringify(before.tables)===JSON.stringify(after.tables),registrationsUnchanged:JSON.stringify(before.registrations)===JSON.stringify(after.registrations)};
fs.writeFileSync(new URL('./comparison.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
