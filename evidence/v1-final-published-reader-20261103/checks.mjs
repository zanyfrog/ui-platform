import fs from 'node:fs';import path from 'node:path';import{createHash}from'node:crypto';
const dir=path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/,'$1'),read=p=>JSON.parse(fs.readFileSync(p,'utf8')),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const historical=[];
for(const name of ['v1-published-reader-20261103','v1-corrected-published-reader-20261103']){
 const inventory=read(`evidence/${name}/files.json`).filter(f=>f.path.replaceAll('\\','/').includes(`/evidence/${name}/`)||f.path.replaceAll('\\','/').includes('/docs/architecture/'));
 if(!inventory.every(f=>hash(f.path)===f.sha256))throw Error('Historical evidence changed: '+name);
 historical.push({directory:name,verifiedFiles:inventory.length});
}
const b=read(path.join(dir,'before.json')),accepted=read('evidence/v1-corrected-published-reader-20261103/after.json');
if(JSON.stringify(b)!==JSON.stringify(accepted))throw Error('Application/security baseline differs');
const deps=read('evidence/v1-shared-native-installation-20261103/dependency-files.json'),inv=read('evidence/v1-native-physical-assessment-20261102/installation-inventory.json'),payload=Object.values(inv).find(v=>Array.isArray(v)&&v.length===54&&v[0]?.sha256);
if(!deps.every(f=>hash(f.path)===f.sha256)||fs.lstatSync('node_modules/@ui-base/ui').isSymbolicLink()||!payload.every(f=>hash(path.join('node_modules/@ui-base/ui',f.path))===f.sha256))throw Error('Native/dependency preservation failed');
const preservation={historical,applicationSecurityBaselineIdentical:true,dependenciesUnchanged:true,nativePhysical:true,native54HashesUnchanged:true};
fs.writeFileSync(path.join(dir,'baseline-preservation.json'),JSON.stringify(preservation,null,2));
const candidate=path.join(dir,'candidate');if(!fs.existsSync(candidate)){console.log(JSON.stringify(preservation));process.exit(0);}
function walk(d,base=d){return fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>{const p=path.join(d,e.name);return e.isDirectory()?walk(p,base):[{path:path.relative(base,p).replaceAll('\\','/'),bytes:fs.statSync(p).size,sha256:hash(p)}]});}
const files=walk(candidate),patterns=[/^index\.html$/,/^assets\/index-[\w-]+\.js$/,/^assets\/index-[\w-]+\.css$/,/^assets\/ui\.component-[\w-]+\.json$/,/^assets\/logo-[\w-]+\.svg$/];
if(files.length!==5||!patterns.every(pattern=>files.filter(f=>pattern.test(f.path)).length===1)||files.some(f=>f.path.includes('.gitkeep')))throw Error('Unexpected output; stop before reader replacement');
const logo=files.find(f=>f.path.endsWith('.svg')),source='C:/Projects/Modular/builder-demo/apps/codex-test-v1-local-pilot-20261102/presentation/versions/v1/composition/assets/branding/logo.svg',url='/'+logo.path;
const js=fs.readFileSync(path.join(candidate,files.find(f=>f.path.endsWith('.js')).path),'utf8');
if(logo.sha256!==hash(source)||!js.includes(url)||js.includes('.gitkeep'))throw Error('Asset output mismatch');
const result={files,fingerprint:createHash('sha256').update(JSON.stringify(files)).digest('hex'),logoByteIdentical:true,runtimeLogoUrl:url,noPlaceholderFilesOrReferences:true,routeResolutions:['/','/about','/contact'].map(route=>({route,url:new URL(url,'http://127.0.0.1:5189'+route).href})),preservation};
fs.writeFileSync(path.join(dir,'output-inventory.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
