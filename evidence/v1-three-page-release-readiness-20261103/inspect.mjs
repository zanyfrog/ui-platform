import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {compositionDiagnostics,assertPageUnused} from '@ui-platform/visual-artifacts';
import {pilotGrantChanges} from '../../src/shared/pilot-administration.ts';
const root='C:/Projects/Modular/builder-demo/apps/codex-test-v1-local-pilot-20261102';
const read=p=>fs.readFileSync(p,'utf8');
function bundles(dir,kind){return fs.readdirSync(dir,{withFileTypes:true}).filter(e=>e.isDirectory()&&!e.name.startsWith('.')).flatMap(e=>{const stem=path.join(dir,e.name,kind);if(!fs.existsSync(stem+'.visual.json'))return[];const files=Object.fromEntries(Object.entries({source:'.html',css:'.css',metadata:'.visual.json',fixtures:'.fixtures.json',code:'.functions.ts'}).map(([k,s])=>[k,fs.existsSync(stem+s)?read(stem+s):'']));return[{locator:e.name+'/'+kind+'.visual.json',metadata:JSON.parse(files.metadata),files,source:files.source,css:files.css,hash:createHash('sha256').update(JSON.stringify(files)).digest('hex')}];});}
const pages=bundles(path.join(root,'src/pages'),'page'),shells=bundles(path.join(root,'shells'),'shell'),components=bundles(path.resolve('components'),'component');
const settings=JSON.parse(read(path.join(root,'app.settings.json'))).presentation;
const menus=fs.readdirSync(path.join(root,'menus')).filter(n=>n.endsWith('.json')).map(n=>JSON.parse(read(path.join(root,'menus',n))));
const routes=pages.map(p=>({pageId:p.metadata.artifactId,routeId:p.metadata.routeId,path:p.metadata.route}));
const definition={pages,shells,settings,menus,routes,siteCss:read(path.join(root,'styles/site.css'))};
const admin=pages.find(p=>p.metadata.route==='/admin');
let rawLinksGuard;try{assertPageUnused('/admin',[...pages,...shells],admin.locator);rawLinksGuard='No incoming HTML Page links found by existing guard';}catch(e){rawLinksGuard=e.message;}
const without={...definition,pages:pages.filter(p=>p!==admin),routes:routes.filter(r=>r.pageId!==admin.metadata.artifactId)};
const diagnostics=compositionDiagnostics(definition,components,[]);
const removalDiagnostics=compositionDiagnostics(without,components,[]);
const db=new DatabaseSync('C:/Projects/Modular/builder-demo/runtime/iam-v1-development.sqlite',{readOnly:true});
const policyRevision=db.prepare('SELECT revision FROM security_state').get().revision;
const functionalPlan=pilotGrantChanges(false),cleanupPlan=pilotGrantChanges(true);
const existingMatches=functionalPlan.map(({document})=>{const row=db.prepare('SELECT json FROM security_documents WHERE id = ?').get(document.definition.id);const stored=row?JSON.parse(row.json):null;return{id:document.definition.id,unchanged:JSON.stringify(stored)===JSON.stringify(document)};});
db.close();
const result={policyRevision,existingFunctionalRecordsMatch:existingMatches,proposedCleanupDocuments:cleanupPlan,admin:admin.metadata,rawLinksGuard,pages:pages.map(p=>({metadata:p.metadata,revision:p.hash})),shells:shells.map(s=>({metadata:s.metadata,revision:s.hash})),menus,settings,componentRevisionMap:components.map(c=>({name:c.metadata.displayName,id:c.metadata.artifactId,componentId:c.metadata.componentId,revision:c.hash,references:c.metadata.form??c.metadata.dependencies??c.metadata.sources??null})),staticCurrentGraphDiagnostics:diagnostics,staticRemovalGraphDiagnostics:removalDiagnostics,limitations:'Read-only source graph using existing compositionDiagnostics/assertPageUnused and no package catalog. Not live permission, deletion, full native admission or Publish verification; no disk source or security changes.'};
fs.writeFileSync(new URL('source-analysis.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify({policyRevision,rawLinksGuard,currentErrors:diagnostics.filter(d=>d.severity==='error'),removalErrors:removalDiagnostics.filter(d=>d.severity==='error'),components:result.componentRevisionMap.map(c=>({name:c.name,revision:c.revision}))}));
