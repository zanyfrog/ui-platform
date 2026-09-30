const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const p=path.resolve(__dirname,'../../../..'),d=path.resolve(p,'../UI Platform Data Services');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const prior=JSON.parse(fs.readFileSync(path.join(__dirname,'review.json'),'utf8'));
const git=(root,...args)=>cp.execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const test='packages/dataset-operations/tests/activation-http.test.ts';
const source=prior.sourceInventory.map(i=>{
 const bytes=fs.readFileSync(path.join(d,i.path)),actual=hash(bytes),boundary=i.path===test?bytes.indexOf(Buffer.from('\n// R4 C2:')):-1;
 return{path:i.path,acceptedSha256:i.accepted,actualSha256:actual,unchanged:actual===i.accepted,originalPrefixPreserved:boundary>=0&&hash(bytes.subarray(0,boundary))===i.accepted};
});
const evidence=prior.protectedArtifacts.map(i=>({path:i.path,acceptedSha256:i.sha256,actualSha256:hash(fs.readFileSync(i.path))}));
const repos=prior.repositories.map(r=>({root:r.root,head:git(r.root,'rev-parse','HEAD'),branch:git(r.root,'branch','--show-current'),status:git(r.root,'status','--porcelain'),staged:git(r.root,'diff','--cached','--name-only'),lockfileSha256:hash(fs.readFileSync(path.join(r.root,'package-lock.json'))),acceptedLockfileSha256:r.lockfileSha256}));
const npm=fs.readFileSync(path.join(__dirname,'npm-invocations.jsonl'),'utf8').trim().split('\n').map(s=>JSON.parse(s));
const stopManifest=JSON.parse(fs.readFileSync(path.join(__dirname,'artifact-hashes.json'),'utf8').replace(/^\uFEFF/,''));
const originalReport=stopManifest.find(i=>i.path.endsWith('ds0-wp2-r4-consolidated-g5-report.md'));
const preservedStopReport={expected:originalReport.sha256,actual:hash(fs.readFileSync(path.join(__dirname,'03-preserved-stop-report.md')))};
const interfacePaths=['packages/orm/package.json','packages/orm/src/index.ts','packages/orm/src/types.ts','packages/orm/src/json-file-orm.ts','packages/dataset-operations/package.json','packages/dataset-operations/src/index.ts','packages/dataset-operations/src/types.ts','packages/dataset-operations/src/operation-manager.ts','packages/dataset-operations/src/request-handler.ts','packages/i-am/package.json','packages/i-am/src/index.ts','packages/i-am/src/types.ts','packages/i-am/src/authorization-service.ts','packages/dataset-operations/tests/support/activation-host.ts','packages/dataset-operations/tests/support/r2-fixtures.ts','packages/dataset-operations/tests/recovery.test.ts'];
const result={recordedAt:new Date().toISOString(),repositories:repos,sourceInventory:source,protectedEvidence:evidence,preservedStopReport,
 interfaceInspection:interfacePaths.map(file=>({path:file,sha256:hash(fs.readFileSync(path.join(d,file)))})),
 changedFiles:git(d,'diff','--name-only').split('\n').filter(Boolean),untrackedDataServices:git(d,'ls-files','--others','--exclude-standard'),
 node:process.version,npm:{invocations:npm.length,versions:[...new Set(npm.map(i=>i.version))]},historicalQualification:prior.historicalMismatches};
result.unexpectedSourceChanges=source.filter(i=>!i.unchanged&&!i.originalPrefixPreserved);
result.evidenceMismatches=evidence.filter(i=>i.acceptedSha256!==i.actualSha256);
fs.writeFileSync(path.join(__dirname,'final-preservation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({unchangedSourceFiles:source.filter(i=>i.unchanged).length,originalPrefixesPreserved:source.filter(i=>i.originalPrefixPreserved).length,unexpectedChanges:result.unexpectedSourceChanges.length,evidenceFiles:evidence.length,evidenceMismatches:result.evidenceMismatches.length,changedFiles:result.changedFiles,locksUnchanged:repos.every(i=>i.lockfileSha256===i.acceptedLockfileSha256),historicalQualifications:result.historicalQualification.length,npm:result.npm,preservedStopReport},null,2));
if(result.unexpectedSourceChanges.length||result.evidenceMismatches.length||JSON.stringify(result.changedFiles)!==JSON.stringify([test])||result.untrackedDataServices||repos.some(i=>i.staged||i.lockfileSha256!==i.acceptedLockfileSha256)||preservedStopReport.expected!==preservedStopReport.actual)process.exitCode=1;
