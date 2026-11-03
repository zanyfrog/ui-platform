import fs from 'node:fs';
import path from 'node:path';
import{createHash}from'node:crypto';
import assert from 'node:assert/strict';
import{nativeUiBaseEntry}from'../../src/server/native-ui-base.ts';
const here=new URL('./',import.meta.url),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=read(new URL('tree-before.json',here)),after=read(new URL('tree-after.json',here));
const a=new Map(before.map(e=>[e.path,e])),b=new Map(after.map(e=>[e.path,e]));
const changes=[...new Set([...a.keys(),...b.keys()])].filter(key=>JSON.stringify(a.get(key))!==JSON.stringify(b.get(key))).map(key=>({path:key,before:a.get(key)??null,after:b.get(key)??null}));
const unexpected=changes.filter(e=>e.path!=='.package-lock.json'&&e.path!=='@ui-base/ui'&&!e.path.startsWith('@ui-base/ui/'));assert.deepEqual(unexpected,[]);
const root=path.resolve('node_modules/@ui-base/ui'),source='C:/Projects/Modular/ui-base/packages/ui-base-ui';
const inventory=read(new URL('../v1-native-physical-assessment-20261102/installation-inventory.json',here));
const expected=inventory.packDryRun.files;assert.ok(!fs.lstatSync(root).isSymbolicLink());
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for(const file of expected){const installed=path.join(root,file.path);assert.equal(hash(installed),file.sha256);assert.equal(hash(path.join(source,file.path)),file.sha256);
 for(let current=installed;;current=path.dirname(current)){assert.ok(!fs.lstatSync(current).isSymbolicLink());assert.equal(fs.realpathSync(current).toLowerCase(),path.resolve(current).toLowerCase());if(current===path.resolve('.'))break;}
}
assert.ok(!fs.existsSync(path.join(root,'node_modules')));
const closure=inventory.closure.map(c=>{const installed=path.join('node_modules',c.name,'package.json'),metadata=read(installed);assert.equal(metadata.version,c.version);return{name:c.name,version:metadata.version};});
const admission=await nativeUiBaseEntry(path.resolve('.'),{enabled:true,version:'0.5.1',resolution:'platform-only'});
assert.equal(admission.status,'enabled');assert.equal(admission.components.length,2);
const result={boundedTreeChanges:true,changes,installedPhysical:true,payloadFilesVerified:expected.length,sourceUnchanged:true,noNestedDependencies:true,closure,admission:{name:admission.name,version:admission.version,status:admission.status,components:admission.components.map(c=>({tagName:c.tagName,identity:c.identity,module:c.module}))}};
fs.writeFileSync(new URL('installed-verification.json',here),JSON.stringify(result,null,2));console.log(JSON.stringify({...result,changes:changes.length}));
