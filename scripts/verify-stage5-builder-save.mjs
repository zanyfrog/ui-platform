import fs from 'node:fs/promises';
const args=process.argv.slice(2),attempt=args.find(a=>/^--attempt=[a-z0-9-]+$/.test(a))?.slice(10);
if(!attempt||args.some(a=>!['--full','--security-trace','--editing-only'].includes(a)&&!/^--attempt=[a-z0-9-]+$/.test(a)))throw Error('Unique attempt required');
const destination='evidence/v1-stage5-builder-save-20261106/'+attempt;if(await fs.stat(destination).then(()=>true,()=>false))throw Error('IMMUTABLE_ATTEMPT_EXISTS');
process.argv=[...process.argv.slice(0,2),...(args.includes('--full')?[]:['--security-only'])];
let source=(await fs.readFile('scripts/verify-stage5-integration.mjs','utf8')).replaceAll('evidence/v1-stage5-wp3-integration-20261105',destination);
if(args.includes('--full'))source=source.replace("'stage5-security', 'stage4-role-administration'","'stage5-security', 'stage5-rpc-boundary', 'stage4-role-administration'");
if(args.includes('--editing-only'))source=source.replace("const tests = ['stage5-integration'];","const tests = ['editing-lifecycle','artifact-editor','editor-context','editor-properties','editor-security-client','editor-security-server','editor-security'];").replace('!transformed.includes("\'stage5-integration\'")','!transformed.includes("\'editing-lifecycle\'")');
if(args.includes('--security-trace')){const injection=await fs.readFile('scripts/stage5-builder-security-diagnostics.mjs','utf8');source=source.replace("await import('data:text/javascript,' + encodeURIComponent(transformed));",`const instrumented=transformed.replace('const compiled=spawnSync',${JSON.stringify(injection+'\nconst compiled=spawnSync')});await import('data:text/javascript,'+encodeURIComponent(instrumented));`);}
await import('data:text/javascript,'+encodeURIComponent(source));
