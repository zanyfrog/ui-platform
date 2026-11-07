import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=await fs.realpath('.'),base='evidence/v1-stage5-refusal-investigation-20261106';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const json=async file=>JSON.parse(await fs.readFile(file,'utf8'));
const write=async(file,value)=>fs.writeFile(file,JSON.stringify(value,null,2)+'\n');
const git=(cwd,...args)=>execFileSync('git',args,{cwd,encoding:'utf8',windowsHide:true}).trim();
const dataRoot=await fs.realpath('../UI Platform Data Services');
if(git(root,'rev-parse','HEAD')!=='d3729a13c8312d35be4fe61b784f84f9e3bd4446'||git(root,'branch','--show-current')!=='main'||git(dataRoot,'rev-parse','HEAD')!=='81b769eef3763d02343f5347888c26edab6ef7bc')throw Error('BASELINE_DISCREPANCY');
for(const repository of [root,dataRoot])if(git(repository,'diff','--cached','--name-only'))throw Error('UNEXPECTED_STAGING');
// Every file in the prior package must still be identical, including prior evidence.
const priorManifest='evidence/v1-stage5-wp3-integration-20261105/changed-file-hashes.json';
const priorManifestSha256=sha(await fs.readFile(priorManifest));if(priorManifestSha256!=='cfd97cafaef40d772fd6ca5694e5b7ddd60b96b903248e662b554d0ad9e5f11d')throw Error('PRIOR_INVENTORY_CHANGED');
const prior=await json(priorManifest);
const changed=repository=>[...new Set([...git(repository,'diff','--name-only').split('\n'),...git(repository,'ls-files','--others','--exclude-standard').split('\n')])].filter(Boolean);
const dataExpected=Object.keys(prior.files).filter(name=>name.startsWith('Data Services/')).map(name=>name.slice('Data Services/'.length)).sort();
if(JSON.stringify(changed(dataRoot).sort())!==JSON.stringify(dataExpected))throw Error('DATA_SCOPE_DISCREPANCY');
for(const file of changed(root))if(!prior.files['UI Platform/'+file]&&file!==priorManifest&&!file.startsWith(base+'/')&&!['scripts/verify-stage5-refusal-investigation.mjs','scripts/record-stage5-refusal-investigation.mjs','tests/stage5-refusal-rpc.test.ts','docs/architecture/v1-stage5-management-identity-refusal-resolution-review-gate-20261106.md'].includes(file))throw Error('INVESTIGATION_SCOPE_DISCREPANCY: '+file);
for(const [name,item]of Object.entries(prior.files)){
  const isData=name.startsWith('Data Services/'),relative=name.slice(isData?'Data Services/'.length:'UI Platform/'.length);
  if(sha(await fs.readFile(path.join(isData?dataRoot:root,relative)))!==item.sha256)throw Error('PRE_INVESTIGATION_FILE_CHANGED: '+name);
}
const review=base+'/review-evidence';await fs.mkdir(review,{recursive:true});
const attempts=[];
for(const id of ['trace-001','trace-002','rpc-probe-001','rpc-probe-002','trace-003','baseline-uninstrumented-001']){
  const directory=base+'/'+id+(['trace-001','trace-002','rpc-probe-001','rpc-probe-002'].includes(id)?'/security-only':'');
  const input=await json(directory+'/paths-and-inputs.json'),result=await json(directory+'/results.json'),data=await json(directory+'/wp3-results.json'),completion=await json(directory+'/completion.json');
  if(!completion.sharedSnapshotEqual||completion.originalLockDirectoryEvents.length)throw Error('PRESERVATION_DISCREPANCY');
  for(const item of input.inputs)if(sha(await fs.readFile(path.join(input.target,item.file)))!==item.sha256)throw Error('COPIED_TEST_CHANGED');
  const sources=await json(directory+'/run-source-inputs.json');for(const [name,expected]of Object.entries(sources)){const isData=name.startsWith('Data Services/'),relative=name.slice(isData?'Data Services/'.length:'UI Platform/'.length);if(sha(await fs.readFile(path.join(isData?path.join(path.dirname(input.target),'UI Platform Data Services'):input.target,relative)))!==expected)throw Error('COPIED_SOURCE_CHANGED');}
  const failures=result.testResults.flatMap(file=>file.assertionResults.filter(test=>test.status==='failed').map(test=>({title:test.fullName,messages:id==='rpc-probe-001'?['Unpaced probe exceeded the unchanged 8192-entry replay-cache capacity; see probe summary.']:test.failureMessages.map(message=>message.slice(0,2000))})));
  const record={id,target:input.target,instrumentation:id.startsWith('trace-')?'temporary tracing enabled':id.startsWith('rpc-')?'diagnostic source, tracing disabled':'restored original production/browser sources; no tracing',tests:{passed:result.numPassedTests,failed:result.numFailedTests,skipped:result.numPendingTests},iam:{passed:data.numPassedTests,failed:data.numFailedTests},failures,sourceHashes:sources,testInputs:input.inputs,rawReportSha256:sha(await fs.readFile(directory+'/results.json')),preservation:completion};
  record.formOutcomeText=await fs.readFile(path.join(input.target,'diagnostics/runtime-submit.txt'),'utf8').catch(error=>{if(error.code==='ENOENT')return null;throw error;});
  const probe=id.startsWith('rpc-')?await json(path.join(input.target,'diagnostics/rpc-refusal-probe.json')):undefined;
  if(probe){record.probe={result:probe.result,refusals:probe.refusals.slice(0,5),refusalCount:probe.refusals.length,contract:probe.contract};await fs.copyFile(path.join(input.target,'tests/stage5-refusal-rpc.test.ts'),path.join(review,id+'-test-source.ts'));}
  await write(review+'/'+id+'.json',record);attempts.push({id,tests:record.tests,iam:record.iam,...(probe?{probe:record.probe.result}:{})});
  if(id==='trace-003'||id==='baseline-uninstrumented-001'){
    const safe=path.join(review,id+'-integration');await fs.mkdir(safe,{recursive:true});
    for(const file of ['publication-and-draft.json','released-query-contract.json','template-activation.json','owner-binding-refusal.json','private-public-export-audit.json','integration-results.json','template-audit.json','policy-administration-audit.json','published-form-A-after-draft-B.png','protected-management-revocation.png']){
      await fs.copyFile(path.join(input.target,'evidence/v1-stage5-integration-local',file),path.join(safe,file)).catch(error=>{if(error.code!=='ENOENT')throw error;});
    }
  }
}
const clean=await json(base+'/rpc-clean-source-results.json'),latestProbe=await json(base+'/baseline-uninstrumented-001/paths-and-inputs.json');
const cleanProbe=await json(path.join(latestProbe.target,'diagnostics/rpc-refusal-probe.json'));
const cleanTest=await fs.readFile(path.join(latestProbe.target,'tests/stage5-refusal-rpc.test.ts'));
if(!cleanTest.equals(await fs.readFile('tests/stage5-refusal-rpc.test.ts')))throw Error('CLEAN_PROBE_SOURCE_CHANGED');
await write(review+'/rpc-clean-source.json',{id:'rpc-clean-source',target:latestProbe.target,instrumentation:'none; restored production sources',tests:{passed:clean.numPassedTests,failed:clean.numFailedTests,skipped:clean.numPendingTests},probe:cleanProbe,testSha256:sha(cleanTest),rawReportSha256:sha(await fs.readFile(base+'/rpc-clean-source-results.json'))});
attempts.push({id:'rpc-clean-source',tests:{passed:clean.numPassedTests,failed:clean.numFailedTests,skipped:clean.numPendingTests},probe:cleanProbe.result});
await write(base+'/attempts.json',{status:'BLOCKED; timing-contract review required; no compatible correction implemented',setupFailure:{operation:'First RPC-probe harness selection',command:'node scripts/verify-stage5-refusal-investigation.mjs --attempt=rpc-probe-001 --rpc-probe',result:'Guard refused before target preparation/tests; corrected the selection assertion only; no executable test inputs or credentials were initialized'},attempts});
// Preserve only relevant redacted trace chains in the review set; raw targets stay local.
const targets={
  'trace-001':'trace-001/security-only/disposable/43a15a02-0014-43ad-af14-9ca51498f2fd/platform',
  'trace-002':'trace-002/security-only/disposable/ab80c6b1-5cd7-4085-a87d-bee1c01c8750/platform',
  'trace-003':'trace-003/disposable/315a9926-7b91-4216-b40f-4748e4928c49/platform'};
for(const [id,target]of Object.entries(targets)){
  const traces={};for(const service of ['data','runtime','management'])traces[service]=await json(path.join(base,target,'diagnostics/refusal-trace-'+service+'.json'));
  const relevantIds=new Set(Object.values(traces).flat().filter(event=>event.code==='ERR_JWT_CLAIM_VALIDATION_FAILED').map(event=>event.id));
  const chains={};for(const [service,events]of Object.entries(traces))chains[service]=[...relevantIds].map(id=>({id,tail:events.filter(event=>event.id===id).slice(-22)}));
  const data=traces.data,requests=data.filter(event=>event.component==='runtime-data'&&event.stage==='request-start'),responses=data.filter(event=>event.component==='runtime-data'&&event.stage==='response');
  const pending=requests.filter(request=>!responses.some(response=>response.id===request.id)).map(request=>({request,lastEvent:data.filter(event=>event.id===request.id).at(-1),plannerChecks:data.filter(event=>event.id===request.id&&event.component==='planner').slice(-20)}));
  await write(review+'/'+id+'-refusal-chains.json',{chains,pending,firstRejectionClassification:id==='trace-003'?'RPC JWT iat claim: issued-at second observed 1ms ahead of receiving clock; subsequent current-session failure propagated to HTTP 403':id==='trace-001'?'RPC JWT claim rejection; rejected claim was not yet instrumented':'No unexpected JWT refusal captured; Form transport reported unknown outcome while Data continued beyond its 15-second request budget',nonceCacheMaximum:Object.fromEntries(Object.entries(traces).map(([service,events])=>[service,Math.max(0,...events.filter(event=>event.stage==='nonce').map(event=>event.size))]))});
}
const latest=await json(base+'/baseline-uninstrumented-001/paths-and-inputs.json');
const boundary=await json(path.join(latest.target,'diagnostics/stage5/checks.json'));if(boundary.typecheckExitCode!==0||boundary.runtimeManagementImportCheck!=='PASS')throw Error('BOUNDARY_CHECK_FAILED');
await write(review+'/boundary-checks.json',boundary);
const isolation=[];for(const [surface,target]of [['ui',latest.target],['data',path.join(path.dirname(latest.target),'UI Platform Data Services')]])for(const kind of ['missing','original']){
  const report=await json(path.join(target,'diagnostics/isolation-'+kind+'.json'));if(!JSON.stringify(report).includes('PHYSICAL_ISOLATION_REQUIRED'))throw Error('ISOLATION_REFUSAL_MISSING');isolation.push({surface,configuration:kind,result:'PHYSICAL_ISOLATION_REQUIRED before initialization',rawReportSha256:sha(await fs.readFile(path.join(target,'diagnostics/isolation-'+kind+'.json')))});
}
await write(review+'/isolation-checks.json',isolation);
const snapshot=await json(base+'/baseline-uninstrumented-001/preservation-before.json');let components=0,packages=0;
for(const [file,expected]of Object.entries(snapshot.files)){if(file.split(/[\\/]/).includes('.uib'))throw Error('FORBIDDEN_GRAPH_METADATA');if(sha(await fs.readFile(file))!==expected)throw Error('COMPONENT_CHANGED');components++;}
for(const group of await json(base+'/baseline-uninstrumented-001/package-closure.json'))for(const [relative,expected]of Object.entries(group.files)){if(sha(await fs.readFile(path.join(group.source,relative)))!==expected)throw Error('NATIVE_PACKAGE_CHANGED');packages++;}
if(components!==23||packages!==234||git('../ui-base','status','--porcelain')||git('../ui-base','rev-parse','HEAD')!=='732eec58ca3d4bd2521197b9d3b6c0457dbc6608')throw Error('PRESERVATION_DISCREPANCY');
const manifests=(await json('evidence/v1-stage5-wp3-integration-20261105/verification-summary.json')).manifests;
for(const [name,expected]of Object.entries(manifests)){const isData=name.startsWith('Data Services/'),relative=name.slice(isData?'Data Services/'.length:'UI Platform/'.length);if(sha(await fs.readFile(path.join(isData?dataRoot:root,relative)))!==expected)throw Error('MANIFEST_DISCREPANCY');}
const lock=await json('src/server/production/package-lock.json'),securityPackages=[];
for(const [relative,pin]of Object.entries(lock.packages)){if(!relative)continue;const installed=await json('src/server/production/'+relative+'/package.json');if(installed.version!==pin.version||!pin.integrity||pin.hasInstallScript||['preinstall','install','postinstall','prepare'].some(key=>installed.scripts?.[key]))throw Error('SECURITY_DEPENDENCY_DISCREPANCY');securityPackages.push({name:installed.name,version:pin.version,integrity:pin.integrity,installLifecycleScripts:false});}
await write(base+'/preservation-summary.json',{components,packages,priorPackageFilesUnchanged:Object.keys(prior.files).length,priorManifestSha256,manifests,securityPackages,temporaryInstrumentationRemoved:true,dataServicesChangesUnchanged:true,uiBaseClean:true,noStaging:true,noCommit:true,noPush:true,currentTarget:latest.target,originalGraph:'Accepted unchanged directory-only observation guard; no historical lock-body access, acquisition, recovery or mutation'});
const inventory={};
for(const [repository,label]of [[root,'UI Platform/'],[dataRoot,'Data Services/']])for(const file of changed(repository)){if(file===base+'/changed-file-hashes.json')continue;const bytes=await fs.readFile(path.join(repository,file));if(file.startsWith(base+'/')&&(/\.(?:key|pem|pfx|sqlite|zip)$/i.test(file)||/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/]|__Host-uib_session=|"(?:client_secret|access_token|id_token)"\s*:\s*"[^"\s]+"/.test(bytes.toString('utf8'))))throw Error('CONTENT_REVIEW_REQUIRED: '+file);inventory[label+file]={sha256:sha(bytes),bytes:bytes.length};}
await write(base+'/changed-file-hashes.json',{algorithm:'SHA-256',excludedSelf:true,status:'BLOCKED review package, not acceptance',files:inventory});
console.log(JSON.stringify({status:'BLOCKED',attempts:attempts.length,components,packages,inventoryFiles:Object.keys(inventory).length,sourceCorrection:'none; original sources restored',committed:false,pushed:false}));
