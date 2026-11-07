import fs from 'node:fs/promises';
const args=process.argv.slice(2),attempt=args.find(a=>/^--attempt=[a-z0-9-]+$/.test(a))?.slice(10);
if(!attempt||args.some(a=>!['--focused'].includes(a)&&!/^--attempt=[a-z0-9-]+$/.test(a)))throw Error('Unique attempt required');
const destination='evidence/v1-stage5-planner-clock-20261106/'+attempt;if(await fs.stat(destination).then(()=>true,()=>false))throw Error('IMMUTABLE_ATTEMPT_EXISTS');
process.argv=[...process.argv.slice(0,2),'--security-only'];
let source=(await fs.readFile('scripts/verify-stage5-integration.mjs','utf8')).replaceAll('evidence/v1-stage5-wp3-integration-20261105',destination);
// Include the existing evaluator/planner negative regressions in each isolated Data run.
source=source.replace("securityOnly?['packages/i-am/tests/wp3-template-contract.test.ts','packages/i-am/tests/wp3-administration.test.ts']:['packages/i-am/tests']","securityOnly?['packages/i-am/tests']:['packages/i-am/tests']");
if(args.includes('--focused'))source=source.replace("const tests = ['stage5-integration'];","const tests = ['stage5-security','stage5-predicate-contract','stage5-rpc-boundary','stage5-refusal-rpc'];").replace('!transformed.includes("\'stage5-integration\'")','!transformed.includes("\'stage5-security\'")');
else {
 const owner=await fs.readFile('scripts/stage5-planner-predicate-diagnostics.mjs','utf8');
 let ui=await fs.readFile('scripts/stage5-builder-security-diagnostics.mjs','utf8');
 ui=ui.replace('const privateProbes:any[]=[];for(let sample=0;sample<60;sample++)','const privateProbes:any[]=[];for(let sample=0;sample<0;sample++)');
 ui=ui.replace('const scope=new AsyncLocalStorage<any>();',"const scope=new AsyncLocalStorage<any>();(globalThis as any)[Symbol.for('stage5.plannerTrace')]=(value:any)=>event('planner.predicate',value);");
 source=source.replace("await import('data:text/javascript,' + encodeURIComponent(transformed));",`let instrumented=transformed.replace('const dataBuild=spawnSync',${JSON.stringify(owner+'\nconst dataBuild=spawnSync')});instrumented=instrumented.replace('const compiled=spawnSync',${JSON.stringify(ui+'\nconst compiled=spawnSync')});await import('data:text/javascript,'+encodeURIComponent(instrumented));`);
}
await import('data:text/javascript,'+encodeURIComponent(source));
