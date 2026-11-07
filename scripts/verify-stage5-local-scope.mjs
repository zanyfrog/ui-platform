import fs from 'node:fs/promises';
const args=process.argv.slice(2),attempt=args.find(a=>/^--attempt=[a-z0-9-]+$/.test(a))?.slice(10),review=args.includes('--review');
if(!attempt||args.some(a=>!['--review','--clock-only'].includes(a)&&!/^--attempt=[a-z0-9-]+$/.test(a)))throw Error('Unique attempt required');
const destination='evidence/v1-stage5-local-scope-20261106/'+attempt;if(await fs.stat(destination).then(()=>true,()=>false))throw Error('IMMUTABLE_ATTEMPT_EXISTS');
process.argv=[...process.argv.slice(0,2),'--security-only'];
let source=(await fs.readFile('scripts/verify-stage5-integration.mjs','utf8')).replaceAll('evidence/v1-stage5-wp3-integration-20261105',destination);
source=source.replace("securityOnly?['packages/i-am/tests/wp3-template-contract.test.ts','packages/i-am/tests/wp3-administration.test.ts']:['packages/i-am/tests']","securityOnly?['packages/i-am/tests']:['packages/i-am/tests']");
if(args.includes('--clock-only')){
 source=source.replace("const tests = ['stage5-integration'];","const tests = ['stage5-local-clock-source'];").replace('!transformed.includes("\'stage5-integration\'")','!transformed.includes("\'stage5-local-clock-source\'")');
}else if(review){
 const cases=await fs.readFile('scripts/stage5-wp3-review-regressions.ts','utf8');
 const append=`const reviewTest=path.join(dataRoot,'packages/i-am/tests/wp3-template-contract.test.ts'),beforeReview=await fs.readFile(reviewTest);await fs.appendFile(reviewTest,${JSON.stringify('\n'+cases)});await fs.writeFile(path.join(evidence,'review-test-provenance.json'),JSON.stringify({beforeSha256:createHash('sha256').update(beforeReview).digest('hex'),afterSha256:createHash('sha256').update(await fs.readFile(reviewTest)).digest('hex')}));`;
 source=source.replace("const tests = ['stage5-integration'];","const tests = ['stage5-security','stage5-rpc-boundary','stage5-predicate-contract'];").replace('!transformed.includes("\'stage5-integration\'")','!transformed.includes("\'stage5-security\'")');
 source=source.replace("await import('data:text/javascript,' + encodeURIComponent(transformed));",`const reviewed=transformed.replace('const dataTests=spawnSync',${JSON.stringify(append+'\nconst dataTests=spawnSync')});await import('data:text/javascript,'+encodeURIComponent(reviewed));`);
}else{
 let owner=await fs.readFile('scripts/stage5-planner-predicate-diagnostics.mjs','utf8');
 const original="const evaluatorAfter=evaluatorBefore.slice(0,start)+method+evaluatorBefore.slice(end);";
 owner=owner.replace(original,"let evaluatorAfter=evaluatorBefore.slice(0,start)+method+evaluatorBefore.slice(end);evaluatorAfter=evaluatorAfter.replace('} catch (error) {\\r\\n      reasonCode =','} catch (error) {\\r\\n      (globalThis as any)[Symbol.for(\\\"stage5.plannerTrace\\\")]?.({phase: \\\"evaluation-failure\\\", reason: error instanceof Error && /^[A-Z_]+$/.test(error.message)?error.message:\\\"ERROR\\\", evaluatedAt:now.toISOString()});\\r\\n      reasonCode =');");
 let ui=await fs.readFile('scripts/stage5-builder-security-diagnostics.mjs','utf8');
 ui=ui.replace('const scope=new AsyncLocalStorage<any>();',"const scope=new AsyncLocalStorage<any>();(globalThis as any)[Symbol.for('stage5.plannerTrace')]=(value:any)=>event('planner.predicate',value);");
 ui=ui.replace('sample<60','sample<0');
 const burst=`const protectedWrites:any[]=[];for(let probe=0;probe<12;probe++){const started=Date.now(),outcome=await execute({releaseId:release.releaseId,artifactId:form.metadata.artifactId,contract:'form',values:{operation:'create',record:{id:randomUUID(),name:'Hidden',quantity:probe,active:true}}});protectedWrites.push({probe,started,finished:Date.now(),status:outcome.status,value:outcome.value});await saveJson(path.join(evidence,'protected-write-probes.json'),protectedWrites);expect(outcome.status,JSON.stringify(outcome.value)).toBe(200);expect(outcome.value.committed,JSON.stringify(outcome.value)).toBe(true);}
const assetUrl=`;
 ui=ui.replace(".replace(\"const download=await context.request.get(assetUrl+'/download');\",",'.replace(\"const assetUrl=\",'+JSON.stringify(burst)+').replace(\"const download=await context.request.get(assetUrl+\'/download\');\",');
 source=source.replace("await import('data:text/javascript,' + encodeURIComponent(transformed));",`let instrumented=transformed.replace('const dataBuild=spawnSync',${JSON.stringify(owner+'\nconst dataBuild=spawnSync')});instrumented=instrumented.replace('const compiled=spawnSync',${JSON.stringify(ui+'\nconst compiled=spawnSync')});await import('data:text/javascript,'+encodeURIComponent(instrumented));`);
}
await import('data:text/javascript,'+encodeURIComponent(source));
