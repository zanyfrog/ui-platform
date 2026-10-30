import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=path.resolve('.'), disposable='C:/Projects/Modular/v1-normal-smoke-20261026-01/ui-platform';
const ev=path.join(root,'evidence/v1-shared-composition-20261029');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const accepted=JSON.parse(await fs.readFile('docs/architecture/v1-mixed-page-admission-files-20261028.json','utf8'));
const sources=new Set(accepted.modifiedPrimarySources.map(r=>path.relative(root,r.path)));
sources.add('packages/visual-artifacts/src/page-admission.ts');
sources.add('src/server/native-ui-base.ts');
for(const file of execFileSync('git',['diff','--name-only'],{encoding:'utf8'}).trim().split('\n')) if(file.startsWith('src/')||file.startsWith('packages/visual-artifacts/src/')) sources.add(file);
const copies=[...sources].map(p=>[path.join(root,p),path.join(disposable,p)]);
for(const file of await fs.readdir('packages/visual-artifacts/dist')) if(/\.(?:js|d\.ts)$/.test(file)) {
  for(const target of ['packages/visual-artifacts/dist','node_modules/@ui-platform/visual-artifacts/dist']) copies.push([path.join(root,'packages/visual-artifacts/dist',file),path.join(disposable,target,file)]);
}
const records=JSON.parse(await fs.readFile(path.join(ev,'native-deployment.json'),'utf8').catch(e=>{if(e.code==='ENOENT')return '[]';throw e;}));
for(const [source,target] of copies) {
  const before=await fs.readFile(target).catch(e=>{if(e.code==='ENOENT')return null;throw e;});
  const bytes=await fs.readFile(source); if(before?.equals(bytes)) continue;
  if(before) await fs.writeFile(path.join(ev,'before',hash(before)),before);
  await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,bytes);
  records.push({source,target,before:before?hash(before):null,after:hash(bytes)});
}
await fs.writeFile(path.join(ev,'native-deployment.json'),JSON.stringify(records,null,2));
console.log('Updated '+records.length+' source/build files; prior bytes retained.');
