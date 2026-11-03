import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const dir=path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/,'$1');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8')), hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const prior=read('evidence/v1-published-reader-20261103/files.json');
const failureEvidencePreserved=prior.every(f=>hash(f.path)===f.sha256);
if(!failureEvidencePreserved) throw Error('Previous failure evidence changed');
const before=read(path.join(dir,'before.json')), accepted=read('evidence/v1-published-reader-20261103/after.json');
if(JSON.stringify(before)!==JSON.stringify(accepted))throw Error('Application/security baseline differs');
function walk(d,base=d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p,base):[{path:path.relative(base,p).replaceAll('\\','/'),bytes:fs.statSync(p).size,sha256:hash(p)}]});}
const candidate=path.join(dir,'candidate');
if(!fs.existsSync(candidate)){fs.writeFileSync(path.join(dir,'failure-preservation-before.json'),JSON.stringify({failureEvidencePreserved,files:prior.length,applicationSecurityBaselineIdentical:true},null,2));console.log('Accepted baseline and all prior evidence hashes preserved');process.exit(0);}
const files=walk(candidate), logos=files.filter(f=>f.path.endsWith('.svg'));
if(logos.length!==1)throw Error('Expected exactly one emitted logo');
const source='C:/Projects/Modular/builder-demo/apps/codex-test-v1-local-pilot-20261102/presentation/versions/v1/composition/assets/branding/logo.svg';
if(hash(source)!==logos[0].sha256)throw Error('Emitted logo bytes differ');
const code=files.filter(f=>f.path.endsWith('.js')).map(f=>fs.readFileSync(path.join(candidate,f.path),'utf8')).join('\n');
const url='/'+logos[0].path;
if(!code.includes(url))throw Error('Logo URL mismatch');
const value={failureEvidencePreserved,publishedLogoSha256:hash(source),emittedLogo:logos[0],runtimeLogoUrl:url,routeResolutions:['/','/about','/contact'].map(route=>({route,resolved:new URL(url,'http://127.0.0.1:5189'+route).href})),qualification:'Static URL resolution only; no corrected-reader browser proof. Existing package code also contains unrelated data URL literals, so absence of all data literals is not asserted.',unexpectedPlaceholder:files.filter(f=>f.path.includes('.gitkeep')),files,fingerprint:createHash('sha256').update(JSON.stringify(files)).digest('hex')};
fs.writeFileSync(path.join(dir,'output-inventory.json'),JSON.stringify(value,null,2)); console.log(JSON.stringify(value));
