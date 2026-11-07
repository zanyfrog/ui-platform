import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=await fs.realpath('.'),dataRoot=await fs.realpath('../UI Platform Data Services');
const evidence='evidence/v1-stage5-wp3-integration-20261105';
const recordFailedRun=process.argv.includes('--record-failed-run');
if(process.argv.slice(2).some(arg=>arg!=='--record-failed-run'))throw Error('UNSUPPORTED_ARGUMENT');
const uiBase='d3729a13c8312d35be4fe61b784f84f9e3bd4446',dataBase='81b769eef3763d02343f5347888c26edab6ef7bc';
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true}).trim();
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const write=async(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2)+'\n');
const normalized=bytes=>bytes.toString('utf8').replaceAll('\r\n','\n').trimEnd();
if(git(root,'rev-parse','HEAD')!==uiBase||git(root,'branch','--show-current')!=='main'||git(dataRoot,'rev-parse','HEAD')!==dataBase)throw Error('GIT_BASELINE_DISCREPANCY');
for(const repository of [root,dataRoot])if(git(repository,'diff','--cached','--name-only'))throw Error('UNEXPECTED_STAGING');
const allowedData=['packages/i-am/src/wp3/types.ts','packages/i-am/src/wp3/graph.ts','packages/i-am/src/wp3/service.ts','packages/i-am/tests/wp3-template-contract.test.ts'];
const changed=repository=>[...new Set([...git(repository,'diff','--name-only').split('\n'),...git(repository,'ls-files','--others','--exclude-standard').split('\n')])].filter(Boolean).sort();
const uiAllowed=file=>file.startsWith('src/server/production/')||file==='src/server/role-administration.ts'||file==='packages/visual-artifacts/src/runtime.ts'||file==='src/shared/released-runtime-services.ts'||/^tests\/(?:fixtures\/)?stage5[^/]*\.(?:test\.)?ts$/.test(file)||/^scripts\/(?:record|verify|check)-stage5[^/]*\.mjs$/.test(file)||file.startsWith('docs/architecture/v1-stage5')||file.startsWith('evidence/v1-stage5');
if(changed(root).some(file=>!uiAllowed(file)))throw Error('UI_SCOPE_DISCREPANCY');
const dataChanged=changed(dataRoot);if(dataChanged.some(file=>!allowedData.includes(file))||dataChanged.length!==4)throw Error('DATA_SCOPE_DISCREPANCY');
const inputs=await json(evidence+'/paths-and-inputs.json'),target=await fs.realpath(inputs.target),dataTarget=path.join(path.dirname(target),'UI Platform Data Services');
if(target===root||!(await fs.realpath(path.join(target,'components'))).startsWith(target+path.sep))throw Error('PHYSICAL_ISOLATION_REQUIRED');
const platform=await json(evidence+'/results.json'),data=await json(evidence+'/wp3-results.json'),preservation=await json(evidence+'/completion.json');
if(data.success!==true||data.numFailedTests||!preservation.sharedSnapshotEqual||preservation.originalLockDirectoryEvents.length)throw Error('TEST_OR_PRESERVATION_DISCREPANCY');
if(recordFailedRun){if(platform.success!==false||platform.numFailedTests!==1)throw Error('FAILED_RUN_RECORD_MISMATCH');}
else if(platform.success!==true||platform.numFailedTests)throw Error('TEST_OR_PRESERVATION_DISCREPANCY');
const runSources=await json(evidence+'/run-source-inputs.json'),reconciled=[];
for(const [name,expected]of Object.entries(runSources)){
  const isData=name.startsWith('Data Services/'),relative=name.slice(isData?'Data Services/'.length:'UI Platform/'.length),current=await fs.readFile(path.join(isData?dataRoot:root,relative)),copied=await fs.readFile(path.join(isData?dataTarget:target,relative));
  if(hash(copied)!==expected)throw Error('TESTED_SOURCE_COPY_CHANGED: '+name);
  if(hash(current)!==expected){if(!['packages/i-am/src/wp3/service.ts','src/server/production/management.ts'].includes(relative)||normalized(current)!==normalized(copied))throw Error('FINAL_SOURCE_DISCREPANCY: '+name);reconciled.push({file:name,testedSha256:expected,finalSha256:hash(current),difference:'terminal whitespace/line endings only; normalized source equal'});}
}
await fs.mkdir(evidence+'/checks',{recursive:true});
const boundary=await json(path.join(target,'diagnostics/stage5/checks.json'));if(boundary.typecheckExitCode!==0||boundary.runtimeManagementImportCheck!=='PASS')throw Error('BOUNDARY_CHECK_FAILED');
await write(evidence+'/checks/boundaries.json',boundary);
const isolation=[];for(const [base,prefix]of [[target,'ui'],[dataTarget,'data']])for(const kind of ['missing','original']){const report=await json(path.join(base,'diagnostics/isolation-'+kind+'.json'));if(!JSON.stringify(report).includes('PHYSICAL_ISOLATION_REQUIRED'))throw Error('ISOLATION_REFUSAL_MISSING');isolation.push({surface:prefix,configuration:kind,result:'PHYSICAL_ISOLATION_REQUIRED before initialization'});}
await write(evidence+'/checks/isolation-refusals.json',isolation);
const before=await json(evidence+'/preservation-before.json');let componentFiles=0,nativePackageFiles=0;
for(const [relative,expected]of Object.entries(before.files)){if(relative.split(/[\\/]/).includes('.uib'))throw Error('FORBIDDEN_GRAPH_METADATA');if(hash(await fs.readFile(relative))!==expected)throw Error('ORIGINAL_COMPONENT_DISCREPANCY');componentFiles++;}
for(const item of await json(evidence+'/package-closure.json'))for(const [relative,expected]of Object.entries(item.files)){if(hash(await fs.readFile(path.join(item.source,relative)))!==expected)throw Error('ORIGINAL_PACKAGE_DISCREPANCY');nativePackageFiles++;}
const basePath=await fs.realpath('../ui-base');if(git(basePath,'status','--porcelain')||git(basePath,'rev-parse','HEAD')!=='732eec58ca3d4bd2521197b9d3b6c0457dbc6608')throw Error('UI_BASE_DISCREPANCY');
const manifests={};for(const [repository,baseline,files]of [[root,uiBase,['package.json','package-lock.json','src/server/production/package.json','src/server/production/package-lock.json']],[dataRoot,dataBase,['package.json','package-lock.json','packages/i-am/package.json']]])for(const file of files){const bytes=await fs.readFile(path.join(repository,file)),original=execFileSync('git',['show',baseline+':'+file],{cwd:repository,windowsHide:true});if(normalized(bytes)!==normalized(original))throw Error('DEPENDENCY_MANIFEST_DISCREPANCY');manifests[(repository===root?'UI Platform/':'Data Services/')+file]=hash(bytes);}
const lock=await json('src/server/production/package-lock.json'),securityPackages=[];
for(const [relative,pin]of Object.entries(lock.packages)){if(!relative)continue;const installed=await json('src/server/production/'+relative+'/package.json');if(installed.version!==pin.version||!pin.integrity||pin.hasInstallScript||['preinstall','install','postinstall','prepare'].some(key=>installed.scripts?.[key]))throw Error('SECURITY_PACKAGE_DISCREPANCY');securityPackages.push({name:installed.name,version:pin.version,integrity:pin.integrity,installLifecycleScripts:false});}
const generated={};for(const file of await fs.readdir(path.join(dataTarget,'packages/i-am/dist/wp3')))if(/^(types|graph|service)\./.test(file))generated['packages/i-am/dist/wp3/'+file]=hash(await fs.readFile(path.join(dataTarget,'packages/i-am/dist/wp3',file)));
const dataFiles={};for(const file of dataChanged){const bytes=await fs.readFile(path.join(dataRoot,file));dataFiles[file]={sha256:hash(bytes),bytes:bytes.length};}
await write(evidence+'/data-changed-file-hashes.json',{baseline:dataBase,repository:dataRoot,algorithm:'SHA-256',files:dataFiles,disposableGeneratedOutputs:generated,review:'Separate review packet prepared; independent maintainer acceptance is not claimed'});
const currentEvidence=path.join(target,'evidence/v1-stage5-integration-local');
await fs.mkdir(evidence+'/current-run',{recursive:true});
await fs.cp(currentEvidence,evidence+'/current-run/integration-local',{recursive:true});
const journey=await json(path.join(currentEvidence,'integration-results.json')).catch(error=>{if(recordFailedRun&&error.code==='ENOENT')return null;throw error;}),exportAudit=await json(path.join(currentEvidence,'private-public-export-audit.json'));
const failedTests=platform.testResults.flatMap(file=>file.assertionResults.filter(test=>test.status==='failed').map(test=>({file:file.name,title:test.fullName,messages:test.failureMessages})));
const reviewStatus=recordFailedRun?'BLOCKED: final browser integration failed; no acceptance/checkpoint recommended':'LOCAL REVIEW GATE; Stage 5 and V1 remain open';
await write(evidence+'/verification-summary.json',{status:reviewStatus,baseline:{ui:uiBase,data:dataBase,uiBase:git(basePath,'rev-parse','HEAD')},tests:{platform:{passed:platform.numPassedTests,failed:platform.numFailedTests,skipped:platform.numPendingTests},iam:{passed:data.numPassedTests,failed:data.numFailedTests}},failedTests,reconciledSourceWhitespace:reconciled,isolation,originalPreservation:{componentFiles,nativePackageFiles,sharedSnapshotEqual:true,originalLockDirectoryEvents:[]},manifests,securityPackages,journey,currentJourneyEvidence:'current-run/integration-local',exportQualification:exportAudit,independentDataReview:'Required at explicit review gate; separate packet supplied',productionQualification:false,committed:false,pushed:false});
const inventory={};let evidenceScanned=0;const findings=[];const privatePixel=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jG1sAAAAASUVORK5CYII=','base64');
for(const file of changed(root)){if(file===evidence+'/changed-file-hashes.json')continue;const bytes=await fs.readFile(file);inventory['UI Platform/'+file]={sha256:hash(bytes),bytes:bytes.length};if(file.startsWith('evidence/')){evidenceScanned++;const value=bytes.toString('utf8');if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|__Host-uib_session=|"(?:client_secret|access_token|id_token)"\s*:\s*"[^"\s]+"/.test(value)||/\.(?:key|pem|pfx|sqlite|zip)$/i.test(file)||bytes.includes(privatePixel))findings.push(file);}else if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/]/.test(bytes.toString('utf8')))findings.push(file);}
for(const [file,item]of Object.entries(dataFiles))inventory['Data Services/'+file]=item;
if(findings.length)throw Error('CONTENT_REVIEW_REQUIRED: '+findings.join(','));
await write(evidence+'/changed-file-hashes.json',{algorithm:'SHA-256',excludedSelf:true,baseline:{ui:uiBase,data:dataBase},contentReview:{evidenceFilesScanned:evidenceScanned,secretPrivatePixelOrDisposableStoreFindings:findings,scope:'Pattern scan plus scoped inventory and inspected targeted screenshots; no general absence proof'},files:inventory});
console.log(JSON.stringify({status:reviewStatus,platformPassed:platform.numPassedTests,platformFailed:platform.numFailedTests,platformSkipped:platform.numPendingTests,iamPassed:data.numPassedTests,componentFiles,nativePackageFiles,inventoryFiles:Object.keys(inventory).length,zipArchiveVerified:exportAudit.archiveDownloadVerified,committed:false,pushed:false}));
