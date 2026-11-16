#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin,stdout } from 'node:process';
import { parseFile,serialize } from './uip-format.mjs';
let importSent = false;
const help=`uip (local development)
  uip --help
  uip app list [--server http://127.0.0.1:5490]
  uip page list --app <application-id>
  uip page show --app <application-id> --page <artifact-id>
  uip dataset list --app <permanent-id> [--server <local-url>]
  uip data export --app <id> --dataset <id> --format csv|json --out <file>
  uip data validate --file <csv-or-json> [--format csv|json]
  uip data import --app <id> --dataset <id> --file <csv-or-json> [--dry-run]
Protected commands pair once per process: sign in in Builder, click Pair local CLI,
paste the displayed public challenge there, then enter the browser code here.
Credentials last at most 5 minutes; never saved.
Validate checks file structure/explicit IDs only, not schema or IAM.
CSV exports use #uip-json-cells-v1 and JSON-valued cells for lossless value types.
`;
async function main(){const args=process.argv.slice(2);if(!args.length||args.length===1&&args[0]==='--help'){stdout.write(help);return;}
  const [area,action,...rest]=args,options={};for(let i=0;i<rest.length;){const key=rest[i++];if(!key?.startsWith('--')||Object.hasOwn(options,key))throw Error('Invalid or duplicate option.');if(key==='--dry-run'){options[key]=true;continue;}if(!rest[i]||rest[i].startsWith('--'))throw Error('Missing option value.');options[key]=rest[i++];}
  const valid=area==='page'&&action==='list'?['--app','--server']:area==='page'&&action==='show'?['--app','--page','--server']:area==='app'&&action==='list'?['--server']:area==='dataset'&&action==='list'?['--app','--server']:area==='data'&&action==='export'?['--app','--dataset','--format','--out','--server']:area==='data'&&action==='import'?['--app','--dataset','--file','--dry-run','--server']:area==='data'&&action==='validate'?['--file','--format']:null;
  if(!valid||Object.keys(options).some(k=>!valid.includes(k)))throw Error('Unsupported command/option. Run uip --help.');
  if(area==='data'&&action==='validate'){if(!options['--file'])throw Error('--file is required');const format=options['--format']??options['--file'].split('.').at(-1);const rows=parseFile(await fs.readFile(options['--file'],'utf8'),format);stdout.write(JSON.stringify({records:rows.length,formatValid:true,schemaValidated:false,authorizationValidated:false,persisted:false})+'\n');return;}
  if(area!=='app'&&!options['--app']||action==='export'&&(!options['--dataset']||!options['--out']||!['csv','json'].includes(options['--format'])))throw Error('Required options missing.');
  if(area==='page'&&action==='show'&&!options['--page'])throw Error('--page is required');
  let importBody;
  if(action==='import'){
    if(!options['--file']||!options['--dataset'])throw Error('--file and --dataset are required.');
    const records=parseFile(await fs.readFile(options['--file'],'utf8'),options['--file'].split('.').at(-1).toLowerCase());
    importBody=JSON.stringify({records,dryRun:options['--dry-run']===true});
    if(Buffer.byteLength(importBody)>900000)throw Error('Import exceeds 900000 bytes.');
  }
  const server=new URL(options['--server']??'http://127.0.0.1:5490');if(server.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(server.hostname)||server.username||server.password||server.search||server.hash||server.pathname!=='/')throw Error('A local HTTP Platform origin is required.');
  async function request(route,init={}){const response=await fetch(new URL(route,server),{...init,redirect:'error',signal:AbortSignal.timeout(20_000)});if(!response.ok){let code='CLI_REQUEST_DENIED';try{code=(await response.json()).code??code;}catch{}throw Error(code);}return response.json();}
  if(!stdin.isTTY)throw Error('Interactive terminal required for memory-only pairing.');
  const proof=randomBytes(32).toString('hex'),challenge=createHash('sha256').update(proof).digest('hex');
  stdout.write('In your signed-in Builder, click Pair local CLI and paste this public challenge:\n'+challenge+'\n');
  const rl=createInterface({input:stdin,output:stdout});let code;try{code=await rl.question('Single-use browser pairing code: ');}finally{rl.close();}
  const {credential}=await request('/api/cli/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:code.trim(),proof})});
  const query=new URLSearchParams();if(options['--app'])query.set('app',options['--app']);if(options['--dataset'])query.set('dataset',options['--dataset']);
  if(area==='page'){
    if(options['--page'])query.set('page',options['--page']);
    const result=await request('/api/cli/'+(action==='list'?'pages':'page')+'?'+query,{headers:{authorization:'Bearer '+credential}});
    stdout.write(JSON.stringify(result,null,2)+'\n');return;
  }
  if(action==='import'){
    importSent=true;
    const result=await request('/api/cli/import?'+query,{method:'POST',headers:{authorization:'Bearer '+credential,'content-type':'application/json'},body:importBody});
    stdout.write(JSON.stringify(result,null,2)+'\n');if(!result.success)process.exitCode=1;return;
  }
  const route=area==='app'?'apps':area==='dataset'?'datasets':'export';const rows=await request('/api/cli/'+route+(query.size?'?'+query:''),{headers:{authorization:'Bearer '+credential}});
  if(action==='export'){const data=serialize(rows,options['--format']);await fs.writeFile(options['--out'],data,{flag:'wx',mode:0o600});stdout.write('Exported '+rows.length+' records.\n');}else stdout.write(JSON.stringify(rows,null,2)+'\n');
}
main().catch(error=>{process.stderr.write(importSent?'uip: import response unavailable or denied; outcome is unconfirmed. Do not automatically retry; inspect authoritative records first.\n':'uip: '+(error instanceof Error && !error.message.includes('uip.')?error.message:'command failed or access denied')+'\n');process.exitCode=1;});
