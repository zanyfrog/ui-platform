import fs from 'node:fs';
const read=n=>JSON.parse(fs.readFileSync(new URL(`./${n}.json`,import.meta.url),'utf8'));
const before=read('before'),after=read('after'),current=new Map(after.files.map(f=>[f.path,f.sha256]));
const result={existingRegularFiles:before.files.length,changedFiles:before.files.filter(f=>current.get(f.path)!==f.sha256).map(f=>f.path),
  addedFiles:after.files.filter(f=>!before.files.some(b=>b.path===f.path)).map(f=>f.path),
  registrationsUnchanged:JSON.stringify(before.registrations)===JSON.stringify(after.registrations),
  securityTablesUnchanged:JSON.stringify(before.tables)===JSON.stringify(after.tables)};
fs.writeFileSync(new URL('./comparison.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
