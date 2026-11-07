import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const evidence='evidence/v1-stage5-integration-20261105';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
const read=async p=>JSON.parse(await fs.readFile(p,'utf8'));
const hash=b=>createHash('sha256').update(b).digest('hex');
const baseline='d3729a13c8312d35be4fe61b784f84f9e3bd4446';
if(git('rev-parse','HEAD')!==baseline||git('branch','--show-current')!=='main')throw Error('BASELINE_DISCREPANCY');
const inputs=await read(evidence+'/paths-and-inputs.json'),target=inputs.target;
if(await fs.realpath(target)===await fs.realpath('.'))throw Error('PHYSICAL_ISOLATION_REQUIRED');
await fs.mkdir(evidence+'/checks',{recursive:true});
for(const name of ['isolation-missing','isolation-original']){
  const report=await read(path.join(target,'diagnostics',name+'.json'));
  if(report.numFailedTests!==1||!JSON.stringify(report).includes('PHYSICAL_ISOLATION_REQUIRED'))throw Error('ISOLATION_REFUSAL_MISSING');
  await fs.writeFile(evidence+'/checks/'+name+'.json',JSON.stringify({failedTests:report.numFailedTests,refusal:'PHYSICAL_ISOLATION_REQUIRED',beforeInitialization:true},null,2));
}
await fs.copyFile(path.join(target,'diagnostics/stage5/checks.json'),evidence+'/checks/boundaries.json');
const preserved=await read(evidence+'/completion.json');
if(!preserved.sharedSnapshotEqual||preserved.originalLockDirectoryEvents.length)throw Error('PRESERVATION_DISCREPANCY');
const unchanged=['package.json','package-lock.json','src/server/production/package.json','src/server/production/package-lock.json'];
const manifests={};for(const file of unchanged){const bytes=await fs.readFile(file),old=execFileSync('git',['show',baseline+':'+file],{windowsHide:true});if(!bytes.equals(old))throw Error('DEPENDENCY_DISCREPANCY');manifests[file]=hash(bytes);}
const dependencies=await read('src/server/production/package-lock.json');
const packages=[];for(const [name,pin]of Object.entries(dependencies.packages)){if(!name)continue;const installed=await read('src/server/production/'+name+'/package.json');if(installed.version!==pin.version||!pin.integrity||pin.hasInstallScript||['preinstall','install','postinstall'].some(k=>installed.scripts?.[k]))throw Error('DEPENDENCY_DISCREPANCY');packages.push({name:installed.name,version:pin.version,integrity:pin.integrity,installLifecycleScripts:false});}
const repositories={};for(const repository of ['../ui-base','../UI Platform Data Services']){if(git('-C',repository,'status','--porcelain'))throw Error('DEPENDENT_REPOSITORY_DISCREPANCY');repositories[repository]=git('-C',repository,'rev-parse','HEAD');}
const results=await read(evidence+'/results.json'),focused=await read(evidence+'/security-only/results.json');
if(results.numFailedTests!==1||!JSON.stringify(results).includes('ADMIN_GRANT_CEILING')||focused.numFailedTests!==1||!JSON.stringify(focused).includes('ADMIN_GRANT_CEILING'))throw Error('UNEXPECTED_TEST_FAILURE');
await fs.writeFile(evidence+'/verification-summary.json',JSON.stringify({baseline,branch:'main',status:'BLOCKED: existing predicate administration scope refuses Viewer policy; no bypass',regressions:{passed:results.numPassedTests,failed:results.numFailedTests,pending:results.numPendingTests,failedIntegration:'ADMIN_GRANT_CEILING'},focusedIntegration:'same actual refusal; publication/draft evidence retained',manifests,securityPackages:packages,unchangedRepositories:repositories,graphPreservation:preserved.sharedSnapshotEqual,originalLockDirectoryEvents:preserved.originalLockDirectoryEvents,productionQualification:false,committed:false,pushed:false},null,2));
const list=[...new Set([...git('diff','--name-only').split('\n'),...git('ls-files','--others','--exclude-standard').split('\n')])].filter(Boolean).sort();
const files={};let scanned=0;const findings=[];
for(const file of list){if(file===evidence+'/changed-file-hashes.json')continue;const bytes=await fs.readFile(file);files[file]={sha256:hash(bytes),bytes:bytes.length};if(file.startsWith(evidence+'/')){scanned++;const s=bytes.toString('utf8');if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|__Host-uib_session=|"(?:client_secret|access_token|id_token)"\s*:\s*"[^"\s]+"/.test(s)||/\.(?:key|pem|pfx|sqlite|zip)$/i.test(file))findings.push(file);}}
if(findings.length)throw Error('EVIDENCE_CONTENT_REQUIRES_REVIEW: '+findings.join(','));
await fs.writeFile(evidence+'/changed-file-hashes.json',JSON.stringify({baseline,algorithm:'SHA-256',excludedSelf:true,contentReview:{evidenceFilesScanned:scanned,secretOrDisposableStoreFindings:findings,limitations:'Pattern scan plus reviewed allowlist/screenshots; not a general proof of absence'},files},null,2));
console.log(JSON.stringify({files:Object.keys(files).length,regressions:{passed:results.numPassedTests,failed:results.numFailedTests,pending:results.numPendingTests},status:'BLOCKED',preserved:true}));
