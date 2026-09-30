const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const cp = require('node:child_process');
const p = path.resolve(__dirname, '../../../..');
const d = path.resolve(p, '../UI Platform Data Services');
const hash = b => crypto.createHash('sha256').update(b).digest('hex').toUpperCase();
const git = (root, ...args) => cp.execFileSync('git', ['-c', 'safe.directory='+root.replaceAll('\\','/'), '-C', root, ...args], {encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
const before = JSON.parse(fs.readFileSync(path.join(__dirname,'before.json'),'utf8').replace(/^\uFEFF/,''));
const prior = JSON.parse(fs.readFileSync(path.join(__dirname,'../ds0-wp2-r2/preservation.json'),'utf8'));
const original = before.baseline.map(item => {
  const bytes = fs.readFileSync(path.join(d,item.path));
  const current = hash(bytes);
  const marker = item.path.endsWith('/README.md') ? '\n## WP2-R3' : item.path === 'packages/schema-application/src/index.ts' ? '\n// WP2-R3' : undefined;
  const boundary = marker ? bytes.indexOf(Buffer.from(marker)) : -1;
  const prefixPreserved = boundary >= 0 && hash(bytes.subarray(0,boundary)) === item.sha256;
  return {...item,current,unchanged:current===item.sha256,prefixPreserved,intentionalControllerChange:item.path==='packages/schema-application/src/activation-controller.ts'};
});
const evidence = [...before.artifacts,...prior.evidenceChecks,...JSON.parse(fs.readFileSync(path.join(__dirname,'../ds0-wp2-r2/artifact-hashes.json'),'utf8'))]
  .map(item=>({path:item.path,expected:item.sha256,current:hash(fs.readFileSync(item.path))}));
const evidenceUnique = [...new Map(evidence.map(item=>[item.path,item])).values()];
const changed = git(d,'diff','--name-only').split('\n').filter(Boolean);
const added = git(d,'ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
const r2Files=git(d,'diff-tree','--no-commit-id','--name-only','-r','d866b86d1fd7f2807ee3708a593b164930df156e').split('\n').sort();
const expectedR2=before.r2.map(i=>i.path).sort();
const repos=before.repositories.map(r=>({root:r.root,head:git(r.root,'rev-parse','HEAD'),status:git(r.root,'status','--porcelain'),lockfileSha256:hash(fs.readFileSync(path.join(r.root,'package-lock.json'))),expectedLock:r.lock}));
const npm=fs.readFileSync(path.join(__dirname,'npm-invocations.jsonl'),'utf8').trim().split('\n').map(s=>JSON.parse(s));
const output={recordedAt:new Date().toISOString(),r2CommitAlreadyPresent:'d866b86d1fd7f2807ee3708a593b164930df156e',r2ExactFileSet:JSON.stringify(r2Files)===JSON.stringify(expectedR2),r2AcceptedHashes:before.r2,
  repositories:repos,originalFiles:original,unexpectedOriginalChanges:original.filter(i=>!i.unchanged&&!i.prefixPreserved&&!i.intentionalControllerChange),
  protectedEvidence:evidenceUnique,evidenceMismatches:evidenceUnique.filter(i=>i.expected!==i.current),
  changedFiles:[...changed,...added].sort().map(file=>({path:file,sha256:hash(fs.readFileSync(path.join(d,file)))})),
  npm:{invocations:npm.length,versions:[...new Set(npm.map(i=>i.version))]},stagedDataServices:git(d,'diff','--cached','--name-only'),trackedPlatformDiff:git(p,'diff','--name-only')};
fs.writeFileSync(path.join(__dirname,'preservation.json'),JSON.stringify(output,null,2)+'\n');
const summary={originalFiles:original.length,wholeFilesUnchanged:original.filter(i=>i.unchanged).length,prefixesPreserved:original.filter(i=>i.prefixPreserved).length,changedFiles:output.changedFiles.length,evidenceFiles:evidenceUnique.length,evidenceMismatches:output.evidenceMismatches.length,unexpectedChanges:output.unexpectedOriginalChanges.length,r2ExactFileSet:output.r2ExactFileSet,locksUnchanged:repos.every(r=>r.lockfileSha256===r.expectedLock),npm:output.npm};
console.log(JSON.stringify(summary,null,2));
if(output.unexpectedOriginalChanges.length||output.evidenceMismatches.length||!output.r2ExactFileSet||!summary.locksUnchanged||before.r2.some(i=>!i.matches)||output.stagedDataServices||output.trackedPlatformDiff)process.exitCode=1;
