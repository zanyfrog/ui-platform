import fs from 'node:fs/promises';
const args=process.argv.slice(2),attempt=args.find(a=>/^--attempt=[a-z0-9-]+$/.test(a))?.slice(10);
if(!attempt||args.some(a=>!['--clock-only','--snapshot-only','--security-only'].includes(a)&&!/^--attempt=[a-z0-9-]+$/.test(a)))throw Error('Unique attempt required');
const destination='evidence/v1-stage5-clock-performance-20261106/'+attempt;if(await fs.stat(destination).then(()=>true,()=>false))throw Error('IMMUTABLE_ATTEMPT_EXISTS');
process.env.UI_PLATFORM_STAGE5_REFUSAL_TRACE='0';process.argv=[...process.argv.slice(0,2),...(args.includes('--clock-only')||args.includes('--snapshot-only')||args.includes('--security-only')?['--security-only']:[])];
let source=(await fs.readFile('scripts/verify-stage5-integration.mjs','utf8')).replaceAll('evidence/v1-stage5-wp3-integration-20261105',destination);
if(args.includes('--clock-only'))source=source.replace("const tests = ['stage5-integration'];","const tests = ['stage5-clock-consistency'];").replace('!transformed.includes("\'stage5-integration\'")','!transformed.includes("\'stage5-clock-consistency\'")');
if(args.includes('--snapshot-only'))source=source.replace("const tests = ['stage5-integration'];","const tests = ['stage5-applied-snapshot'];").replace('!transformed.includes("\'stage5-integration\'")','!transformed.includes("\'stage5-applied-snapshot\'")');
await import('data:text/javascript,'+encodeURIComponent(source));
