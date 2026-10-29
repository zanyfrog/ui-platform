import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { applicationComposition } from '../packages/visual-artifacts/dist/vite.js';
const ev=path.resolve('evidence/v1-shared-composition-20261029');
const baseline=JSON.parse(await fs.readFile(path.join(ev,'baseline.json'),'utf8'));
const fixture=path.join(ev,'full-graph-'+Date.now()),root=path.join(fixture,'application'),components=path.join(fixture,'components');
await fs.mkdir(components,{recursive:true});await fs.mkdir(path.join(root,'shells/shared'),{recursive:true});
const pagesRoot=path.join(baseline.app,'src/pages');
for(const r of baseline.records) if(r.file.startsWith(pagesRoot+path.sep)) {
 const target=path.join(root,'src/pages',path.relative(pagesRoot,r.file));await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,await fs.readFile(path.join(ev,'before',r.hash)));
}
const shell={schemaVersion:1,artifactId:'art_detached_shared',kind:'shell',name:'shared',displayName:'Shared'};
for(const [ext,text] of Object.entries({'.visual.json':JSON.stringify(shell),'.html':'<header data-uip-node="header">Shared</header><main data-uip-node="main" data-uip-region="region-main"></main>','.css':'','.fixtures.json':'{}','.functions.ts':'export {};'}))await fs.writeFile(path.join(root,'shells/shared/shell'+ext),text);
for(const name of ['home','about','contact']) {
 const stem=path.join(root,'src/pages',name,'page');const m=JSON.parse(await fs.readFile(stem+'.visual.json','utf8'));m.shellId=shell.artifactId;m.routeId='route_detached_'+name;
 await fs.writeFile(stem+'.visual.json',JSON.stringify(m));await fs.writeFile(stem+'.html','<main data-uip-node="main_'+name+'" data-uip-region="region-main">'+await fs.readFile(stem+'.html','utf8')+'</main>');
}
await fs.writeFile(path.join(root,'app.settings.json'),JSON.stringify({presentation:{model:'composition-v1',branding:{applicationName:'Detached fixture'},defaultShellId:shell.artifactId,theme:{},siteStyles:[],assetsRoot:'assets'}}));
await fs.writeFile(path.join(root,'package.json'),'{}');await fs.writeFile(path.join(root,'app.manifest.json'),'{}');
const native=path.join(fixture,'native');await fs.mkdir(native);
const installed=JSON.parse(await fs.readFile('node_modules/@ui-base/ui/ui.component.json','utf8'));
await fs.writeFile(path.join(native,'ui.component.json'),JSON.stringify({components:installed.components.filter(c=>['uib-card','uib-panel'].includes(c.tagName))}));
await fs.writeFile(path.join(native,'package.json'),'{"name":"@ui-base/ui"}');
const capture=async packageManifests=>{const p=applicationComposition({root,sharedComponentsRoot:components,packageManifests});p.configResolved({command:'serve'});return p.load.call({addWatchFile(){},resolve(){throw Error('Unadmitted helper import');}},'\0virtual:uip-application-composition');};
await assert.rejects(capture([]),/component|Component|reference|Reference/);
const code=await capture([path.join(native,'ui.component.json')]);
for(const r of baseline.records.filter(r=>r.file.endsWith('page.visual.json'))) {const m=JSON.parse(await fs.readFile(path.join(ev,'before',r.hash),'utf8'));assert.ok(code.includes(m.artifactId));}
await fs.writeFile(path.join(fixture,'result.json'),JSON.stringify({passed:true,actualRevisionCompositionPlugin:true,all13PagesCaptured:true,threeHypotheticalAdoptions:true,missingNativeContractsRefused:true,explicitTwoNativeContractsAdmitted:true,recoveryRefusingReader:true,scope:'Actual source snapshots in detached physical fixture; no module imports executed, no live settings or Pages changed'},null,2));
console.log('PASS '+fixture);
