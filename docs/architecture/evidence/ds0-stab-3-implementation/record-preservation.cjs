// Read-only repository checks; output is confined to this evidence directory.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), cp = require('node:child_process');
const p = path.resolve(__dirname, '../../../..'), d = path.resolve(p, '../UI Platform Data Services'), b = path.resolve(p, '../ui-base');
const git = (root,...args) => cp.execFileSync('git',['-c',`safe.directory=${root.replaceAll('\\','/')}`,'-C',root,...args],{encoding:'utf8'}).trim();
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();
const read = file => JSON.parse(fs.readFileSync(path.join(p,file),'utf8'));
const before = JSON.parse(fs.readFileSync(path.join(__dirname,'before.json'),'utf8'));
const compared = before.files.map(x=>({...x,after:hash(path.join(d,x.path)),unchanged:hash(path.join(d,x.path))===x.sha256}));
const changed = git(d,'diff','--name-only').split('\n').filter(Boolean);
const added = git(d,'ls-files','--others','--exclude-standard').split('\n').filter(Boolean);
const allowed = ['packages/dataset-operations/README.md','packages/dataset-operations/src/operation-manager.ts','packages/dataset-operations/src/types.ts','packages/dataset-operations/tests/transaction-fixture.ts','packages/dataset-operations/tests/operation-security.test.ts','packages/i-am/README.md','packages/i-am/src/authorization-service.ts','packages/i-am/tests/write-scope-containment.test.ts'];
const previous = read('docs/architecture/evidence/ds0-stab-3-design/review.json');
const stab1 = read('docs/architecture/evidence/ds0-stab-1/implementation-file-hashes.json');
const stab1Review = read('docs/architecture/evidence/ds0-stab-2/baseline-review.json');
const npm = 'C:/Users/zanyf/AppData/Local/Temp/ds0-stab0-npm-10.8.2/package/bin/npm-cli.js';
const result = {
  recordedAt:new Date().toISOString(),
  repositories:[d,p,b].map(root=>({path:root,head:git(root,'rev-parse','HEAD'),branch:git(root,'branch','--show-current'),status:git(root,'status','--short'),lockfileSha256:hash(path.join(root,'package-lock.json'))})),
  trackedBefore:compared.length,unchanged:compared.filter(x=>x.unchanged).length,changedTracked:compared.filter(x=>!x.unchanged),
  implementationFiles:[...changed,...added].map(file=>({path:file,sha256:hash(path.join(d,file))})),
  unexpectedChanges:[...changed,...added].filter(file=>!allowed.includes(file)),
  originalTestMismatches:compared.filter(x=>x.path.endsWith('.test.ts')&&!x.unchanged),
  protectedManifestMismatches:compared.filter(x=>(x.path.endsWith('package.json')||x.path.endsWith('package-lock.json'))&&!x.unchanged),
  stab1SourceMismatches:stab1.filter(x=>hash(path.join(d,x.path))!==x.sha256),
  stab1EvidenceMismatches:stab1Review.preservedStab1Artifacts.filter(x=>hash(path.isAbsolute(x.path)?x.path:path.join(p,x.path))!==x.sha256),
  stab2EvidenceMismatches:previous.preserved.filter(x=>hash(path.join(p,x.path))!==x.sha256),
  tools:{node:process.version,npm:cp.execFileSync(process.execPath,[npm,'--version'],{encoding:'utf8'}).trim(),npmNodeEngines:JSON.parse(fs.readFileSync(path.resolve(npm,'../../package.json'),'utf8')).engines.node,
    dataServicesTypeScript:JSON.parse(fs.readFileSync(path.join(d,'node_modules/typescript/package.json'))).version,dataServicesVitest:JSON.parse(fs.readFileSync(path.join(d,'node_modules/vitest/package.json'))).version,
    platformTypeScript:JSON.parse(fs.readFileSync(path.join(p,'node_modules/typescript/package.json'))).version,platformVitest:JSON.parse(fs.readFileSync(path.join(p,'node_modules/vitest/package.json'))).version,platformVite:JSON.parse(fs.readFileSync(path.join(p,'node_modules/vite/package.json'))).version},
  planSha256:hash(path.join(p,'docs/architecture/ds0-stab-3-write-containment-plan.md')),
  platformLockMatchesBefore:before.platformLock===hash(path.join(p,'package-lock.json')),
  diffCheck:git(d,'diff','--check')
};
fs.writeFileSync(path.join(__dirname,'preservation.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,changedTracked:result.changedTracked.map(x=>x.path)},null,2));
if(result.unexpectedChanges.length||result.originalTestMismatches.length||result.protectedManifestMismatches.length||result.stab1SourceMismatches.length||result.stab1EvidenceMismatches.length||result.stab2EvidenceMismatches.length||!result.platformLockMatchesBefore)process.exitCode=1;
