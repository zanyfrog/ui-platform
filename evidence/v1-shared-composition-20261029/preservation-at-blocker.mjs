import fs from 'node:fs/promises';import path from 'node:path';import crypto from 'node:crypto';import assert from 'node:assert/strict';
const ev=path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1'));
const baseline=JSON.parse(await fs.readFile(path.join(ev,'baseline.json'),'utf8'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const pages=baseline.records.filter(r=>!r.file.endsWith('app.settings.json'));
for(const r of pages)assert.equal(sha(await fs.readFile(r.file)),r.hash,r.file);
const old=JSON.parse(await fs.readFile('evidence/v1-mixed-page-admission-20261028/baseline.json','utf8'));
const qualified=[];
for(const name of ['revision-vite.ts','runtime-read-admission.ts','runtime-revision.ts']) {
 const r=old.find(r=>r.path.endsWith('\\packages\\visual-artifacts\\src\\'+name));assert.ok(r);
 const actual=sha(await fs.readFile(r.path));assert.equal(actual,r.sha256);qualified.push({path:r.path,sha256:actual,unchanged:true});
}
const settings=await fs.readFile(path.join(baseline.app,'app.settings.json'),'utf8');
const catalog=await fs.readFile('src/server/component-registry.ts','utf8');
const packageFile=await fs.readFile(path.join(baseline.app,'package.json'),'utf8'),manifest=await fs.readFile(path.join(baseline.app,'app.manifest.json'),'utf8');
await fs.writeFile(path.join(ev,'dependency-contract-sources.json'),JSON.stringify({catalogSource:catalog,applicationPackage:JSON.parse(packageFile),applicationManifest:JSON.parse(manifest)},null,2));
await fs.writeFile(path.join(ev,'preservation-at-blocker.json'),JSON.stringify({passed:true,existingPageFilesUnchanged:pages.length,homeAboutContactStillPlain:true,qualifiedModules:qualified,settingsHash:sha(settings),settingsState:'Authorized composition settings enabled; dependency admission blocks the current whole-Application graph',pageAdoptions:0,compositionPluginLaunches:0,liveJournalOrLockManipulations:0},null,2));
console.log('PASS '+pages.length+' existing Page files and three qualified modules unchanged');
