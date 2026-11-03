import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const platform='C:/Projects/Modular/ui-platform',pilot='C:/Projects/Modular/builder-demo/apps/codex-test-v1-local-pilot-20261102';
const sourceRoot='C:/Projects/Modular/ui-base/packages';
const read=file=>JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,''));
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const sources=new Map();
for(const dir of fs.readdirSync(sourceRoot,{withFileTypes:true})){
  if(!dir.isDirectory()||dir.isSymbolicLink())continue;
  const root=path.join(sourceRoot,dir.name),file=path.join(root,'package.json');
  if(fs.existsSync(file))sources.set(read(file).name,{root,metadata:read(file)});
}
const closure=[],seen=new Set();
function visit(name){if(seen.has(name))return;seen.add(name);const source=sources.get(name);if(!source){closure.push({name,missingTrustedSource:true});return;}
  closure.push({name,version:source.metadata.version,sourceRoot:source.root,packageJsonSha256:hash(path.join(source.root,'package.json')),dependencies:source.metadata.dependencies??{},peerDependencies:source.metadata.peerDependencies??{},optionalDependencies:source.metadata.optionalDependencies??{},scripts:source.metadata.scripts??{}});
  for(const dependency of Object.keys(source.metadata.dependencies??{}))if(dependency.startsWith('@ui-base/'))visit(dependency);
}
visit('@ui-base/ui');
const installations=[];
for(const owner of [platform,pilot]){
 const metadata=read(path.join(owner,'package.json')),lock=read(path.join(owner,'package-lock.json'));
 for(const source of closure){const installed=path.join(owner,'node_modules',source.name);if(!fs.existsSync(installed)){installations.push({owner,name:source.name,present:false});continue;}
  const canonical=fs.realpathSync(installed),expected=fs.realpathSync(source.sourceRoot);
  // Only read metadata through the already identified trusted local package mapping.
  const admittedRead=canonical.toLowerCase()===expected.toLowerCase()||canonical.toLowerCase()===path.resolve(installed).toLowerCase();
  const installedMetadata=admittedRead?read(path.join(installed,'package.json')):undefined;
  installations.push({owner,name:source.name,installedRoot:installed,symbolicLink:fs.lstatSync(installed).isSymbolicLink(),canonicalRoot:canonical,metadataReadWithinKnownRoots:admittedRead,
   installedVersion:installedMetadata?.version,declaredDependency:metadata.dependencies?.[source.name]??null,lockEntry:lock.packages?.[`node_modules/${source.name}`]??null});
 }
}
const ui=sources.get('@ui-base/ui').root,sourceFiles=[];
function walk(root,relative=''){for(const entry of fs.readdirSync(path.join(root,relative),{withFileTypes:true})){
 if(entry.name==='node_modules'||entry.isSymbolicLink())continue;const name=path.join(relative,entry.name),file=path.join(root,name);
 if(entry.isDirectory())walk(root,name);else if(entry.isFile())sourceFiles.push({path:name.replaceAll('\\','/'),bytes:fs.statSync(file).size,sha256:hash(file)});
}}
walk(ui);sourceFiles.sort((a,b)=>a.path.localeCompare(b.path));
const pack=read(new URL('./pack-dry-run.json',import.meta.url))[0];
const packedFiles=pack.files.map(entry=>({path:entry.path,bytes:entry.size,sha256:hash(path.join(ui,entry.path))}));
const result={toolchain:{node:process.version,npm:'11.17.0',uiBaseDeclaredPackageManager:read('C:/Projects/Modular/ui-base/package.json').packageManager},closure,installations,
 dependencyRecords:[platform,pilot].flatMap(owner=>['package.json','package-lock.json'].map(name=>({path:path.join(owner,name),sha256:hash(path.join(owner,name))}))),
 sourceFiles,sourceInventorySha256:createHash('sha256').update(JSON.stringify(sourceFiles)).digest('hex'),
 packDryRun:{name:pack.name,version:pack.version,filename:pack.filename,entryCount:pack.entryCount,integrity:pack.integrity,shasum:pack.shasum,files:packedFiles},
 noTarballCreated:!fs.existsSync(path.join(platform,pack.filename))};
fs.writeFileSync(new URL('./installation-inventory.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({closure:closure.map(p=>({name:p.name,version:p.version,dependencies:p.dependencies})),uiInstallations:installations.filter(p=>p.name==='@ui-base/ui'),sourceInventorySha256:result.sourceInventorySha256,packEntries:pack.entryCount,noTarballCreated:result.noTarballCreated}));
