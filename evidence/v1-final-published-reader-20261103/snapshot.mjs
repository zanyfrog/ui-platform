import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
const base='C:/Projects/Modular/builder-demo';
const files=[];
function walk(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const full=path.join(dir,entry.name);if(entry.isDirectory())walk(full);else if(entry.isFile()) files.push({path:full,bytes:fs.statSync(full).size,sha256:createHash('sha256').update(fs.readFileSync(full)).digest('hex')});}}
walk(path.join(base,'apps'));
const db=new DatabaseSync(path.join(base,'runtime/iam-v1-development.sqlite'),{readOnly:true});
const tables=db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'security_%' ORDER BY name").all().map(({name})=>{const rows=db.prepare(`SELECT * FROM "${name}"`).all();return{name,rows:rows.length,sha256:createHash('sha256').update(JSON.stringify(rows)).digest('hex')};});db.close();
const ledger=new DatabaseSync(path.join(base,'runtime/development-applications.sqlite'),{readOnly:true});
const registrations=ledger.prepare('SELECT application_id,application_key,created_by FROM development_applications ORDER BY application_id').all();ledger.close();
fs.writeFileSync(new URL(`./${process.argv[2]}.json`,import.meta.url),JSON.stringify({files,tables,registrations},null,2));
console.log(JSON.stringify({files:files.length,tables,registrations}));

