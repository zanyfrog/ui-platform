import fs from 'node:fs';
import {createHash} from 'node:crypto';
const here=new URL('./',import.meta.url),read=n=>JSON.parse(fs.readFileSync(new URL(n,here),'utf8'));
const before=read('browser-before-edit.json'),after=read('browser-final.json'),map=new Map(after.files.map(f=>[f.path,f]));
const changed=before.files.filter(f=>map.get(f.path)?.sha256!==f.sha256).map(f=>({path:f.path,before:f.sha256,after:map.get(f.path)?.sha256??null}));
const added=after.files.filter(f=>!before.files.some(b=>b.path===f.path));
const result={changedFiles:changed,addedFiles:added,securityTablesUnchanged:JSON.stringify(before.tables)===JSON.stringify(after.tables),registrationsUnchanged:JSON.stringify(before.registrations)===JSON.stringify(after.registrations),nonPilotFilesUnchanged:changed.every(f=>f.path.includes('codex-test-v1-local-pilot-20261102'))&&added.every(f=>f.path.includes('codex-test-v1-local-pilot-20261102'))};
fs.writeFileSync(new URL('browser-change-inventory.json',here),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
