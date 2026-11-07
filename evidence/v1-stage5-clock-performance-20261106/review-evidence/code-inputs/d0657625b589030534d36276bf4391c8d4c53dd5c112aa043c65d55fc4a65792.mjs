import fs from 'node:fs/promises';
const args=process.argv.slice(2),attempt=args.find(a=>/^--attempt=[a-z0-9-]+$/.test(a))?.slice(10);
if(!attempt||args.some(a=>!['--clock-only','--snapshot-only','--security-only'].includes(a)&&!/^--attempt=[a-z0-9-]+$/.test(a)))throw Error('Unique attempt required');
const destination='evidence/v1-stage5-clock-performance-20261106/'+attempt;if(await fs.stat(destination).then(()=>true,()=>false))throw Error('IMMUTABLE_ATTEMPT_EXISTS');
process.env.UI_PLATFORM_STAGE5_REFUSAL_TRACE='0';process.argv=[...process.argv.slice(0,2),...(args.includes('--clock-only')||args.includes('--snapshot-only')||args.includes('--security-only')?['--security-only']:[])];
let source=(await fs.readFile('scripts/verify-stage5-integration.mjs','utf8')).replaceAll('evidence/v1-stage5-wp3-integration-20261105',destination);
if(args.includes('--clock-only'))source=source.replace("const tests = ['stage5-integration'];","const tests = ['stage5-clock-consistency'];").replace('!transformed.includes("\'stage5-integration\'")','!transformed.includes("\'stage5-clock-consistency\'")');
if(args.includes('--snapshot-only'))source=source.replace("const tests = ['stage5-integration'];","const tests = ['stage5-applied-snapshot'];").replace('!transformed.includes("\'stage5-integration\'")','!transformed.includes("\'stage5-applied-snapshot\'")');
if(args.includes('--snapshot-only')){
 const metric=`await fs.mkdir(path.join(target,'diagnostics'),{recursive:true});
const metricPath=path.join(target,'diagnostics/schema-canonical-count.txt');await fs.writeFile(metricPath,'');
const resolverFile=path.join(path.dirname(target),'UI Platform Data Services/packages/schema-application/dist/resolver.js');
const resolverBefore=await fs.readFile(resolverFile,'utf8');
const resolverAfter="import {appendFileSync as stage5Count} from 'node:fs';\\n"+resolverBefore.replace('async resolveForRuntime(input) {','async resolveForRuntime(input) { stage5Count('+JSON.stringify(metricPath)+',"1\\\\n");');
await fs.writeFile(resolverFile,resolverAfter);
await fs.writeFile(path.join(target,'diagnostics/generated-counter-provenance.json'),JSON.stringify({file:resolverFile,beforeSha256:createHash('sha256').update(resolverBefore).digest('hex'),afterSha256:createHash('sha256').update(resolverAfter).digest('hex'),purpose:'Temporary invocation counter in disposable generated output only; no original Data source or authority behavior changed'}));
const tests = ['stage5-applied-snapshot'];`;
 source=source.replace("await import('data:text/javascript,' + encodeURIComponent(transformed));",`const measured=transformed.replace("const tests = ['stage5-applied-snapshot'];",${JSON.stringify(metric)});await import('data:text/javascript,'+encodeURIComponent(measured));`);
}
await import('data:text/javascript,'+encodeURIComponent(source));
