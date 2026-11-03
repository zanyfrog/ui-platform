import fs from'node:fs';import path from'node:path';import{createHash}from'node:crypto';import{DatabaseSync}from'node:sqlite';import{pilotGrantChanges}from'../../src/shared/pilot-administration.ts';
import{compositionSourceFingerprint,compositionChecksum,compositionSourceFiles}from'../../src/server/composition-snapshots.ts';
const root='C:/Projects/Modular/builder-demo/apps/codex-test-v1-local-pilot-20261102',here=new URL('./',import.meta.url),mode=process.argv[2],hash=v=>createHash('sha256').update(v).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const manifest=read(path.join(root,'presentation/presentation.manifest.json')),draft=read(path.join(root,'presentation/draft/presentation.json'));
const db=new DatabaseSync('C:/Projects/Modular/builder-demo/runtime/iam-v1-development.sqlite',{readOnly:true});const revision=db.prepare('SELECT revision FROM security_state').get().revision;
const sevenExact=pilotGrantChanges(false).every(c=>JSON.stringify(JSON.parse(db.prepare('SELECT json FROM security_documents WHERE id=?').get(c.document.definition.id).json))===JSON.stringify(c.document));db.close();if(revision!==11||!sevenExact)throw Error('Policy differs; stop');
const sourceFiles=await compositionSourceFiles(root),sourceFingerprint=await compositionSourceFingerprint(root,path.resolve('components'));
const pages=[...sourceFiles].filter(([p])=>p.startsWith('src/pages/')&&p.endsWith('.visual.json')).map(([p,b])=>({path:p,metadata:JSON.parse(b.toString())}));
const output={policyRevision:revision,sevenExact,manifest,manifestFileSha256:hash(fs.readFileSync(path.join(root,'presentation/presentation.manifest.json'))),draftFileSha256:hash(fs.readFileSync(path.join(root,'presentation/draft/presentation.json'))),draftSemanticChecksum:hash(JSON.stringify(draft)),sourceFingerprint,sourceChecksum:await compositionChecksum(root),sourceFiles:[...sourceFiles].map(([p,b])=>({path:p,bytes:b.length,sha256:hash(b)})),pages,settings:read(path.join(root,'app.settings.json')),mainMenu:read(path.join(root,'menus/main.json')),adminMenu:read(path.join(root,'menus/admin.json'))};
if(mode==='before'){
 const current=read('evidence/v1-first-presentation-publish-20261103/before.json'),baseline=read('evidence/v1-final-publish-readiness-20261103/after.json');const old=new Map(baseline.files.map(f=>[f.path,f.sha256]));
 if(current.files.some(f=>!f.path.endsWith('operations.jsonl')&&old.get(f.path)!==f.sha256)||baseline.files.some(f=>!current.files.some(n=>n.path===f.path))||JSON.stringify(current.tables)!==JSON.stringify(baseline.tables)||JSON.stringify(current.registrations)!==JSON.stringify(baseline.registrations)||manifest.activeVersion!==null||manifest.versions.length||pages.length!==3)throw Error('Reviewed baseline differs; stop');
 output.reviewedBaselineMatches=true;
}else if(manifest.activeVersion!==null){
 const version=manifest.activeVersion,base=path.join(root,'presentation/versions',`v${version}`),snapshot=path.join(base,'composition');
 output.version=version;output.versionRecord=manifest.versions.find(v=>v.version===version);output.versionDraft=read(path.join(base,'presentation.json'));output.versionDraftChecksum=hash(JSON.stringify(output.versionDraft));
 output.recordedPublishedFingerprint=fs.readFileSync(path.join(base,'composition.source-checksum'),'utf8');
 const published=await compositionSourceFiles(snapshot);output.snapshotFiles=[...published].map(([p,b])=>({path:p,bytes:b.length,sha256:hash(b)}));output.publishedPages=[...published].filter(([p])=>p.startsWith('src/pages/')&&p.endsWith('.visual.json')).map(([p,b])=>({path:p,metadata:JSON.parse(b.toString())}));
 output.snapshotSourceBytesMatch=[...sourceFiles].every(([p,b])=>published.get(p)?.equals(b));
 const pre=read('evidence/v1-first-presentation-publish-20261103/before-state.json');output.authoringFingerprintUnchanged=sourceFingerprint===pre.sourceFingerprint;output.draftUnchanged=output.draftFileSha256===pre.draftFileSha256;
 output.fingerprintConsistent=output.recordedPublishedFingerprint===sourceFingerprint;output.versionChecksumConsistent=output.versionRecord?.checksum===output.versionDraftChecksum;
}
fs.writeFileSync(new URL(`${mode}-state.json`,here),JSON.stringify(output,null,2));console.log(JSON.stringify({mode,revision,sevenExact,activeVersion:manifest.activeVersion,versions:manifest.versions,sourceFingerprint,pages:pages.map(p=>p.metadata.route),snapshotMatch:output.snapshotSourceBytesMatch,draftUnchanged:output.draftUnchanged,fingerprintConsistent:output.fingerprintConsistent,versionChecksumConsistent:output.versionChecksumConsistent}));
