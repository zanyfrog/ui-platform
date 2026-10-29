import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const out = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i, '$1'));
const app = 'C:/Projects/Modular/v1-normal-smoke-20261026-01/apps/v1-identity-fixture';
const files = [];
async function walk(dir) {
  for (const e of await fs.readdir(dir, {withFileTypes:true})) {
    if (e.name === '.git' || e.name === 'node_modules' || e.name === '.uib') continue;
    const p = path.join(dir,e.name);
    if(e.isDirectory()) await walk(p); else if(e.isFile()) files.push(p);
  }
}
await walk(path.join(app,'src/pages'));
files.push(path.join(app,'app.settings.json'));
await fs.mkdir(path.join(out,'before'),{recursive:true});
const records=[];
for(const file of files) {
  const bytes=await fs.readFile(file), hash=crypto.createHash('sha256').update(bytes).digest('hex');
  await fs.writeFile(path.join(out,'before',hash),bytes);
  records.push({file,hash});
}
await fs.writeFile(path.join(out,'baseline.json'),JSON.stringify({app,records},null,2));
