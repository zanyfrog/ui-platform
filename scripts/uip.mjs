#!/usr/bin/env node
import { createHash, randomBytes } from 'node:crypto';
import fs from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin,stdout } from 'node:process';
import { parseFile,serialize } from './uip-format.mjs';
const help=`uip (local development, read-only)
  uip --help
  uip app list [--server http://127.0.0.1:5490]
  uip dataset list --app <permanent-id> [--server <local-url>]
  uip data export --app <id> --dataset <id> --format csv|json --out <file>
  uip data validate --file <csv-or-json> [--format csv|json]
Protected commands pair once per process: sign in in Builder, click Pair local CLI,
paste the displayed public challenge there, then enter the browser code here.
Credentials last at most 5 minutes; never saved. Import/upsert and transaction dry-run
are deferred. Validate checks file structure/explicit IDs only, not schema or IAM.
CSV exports use #uip-json-cells-v1 and JSON-valued cells for lossless value types.
`;
async function main(){const args=process.argv.slice(2);if(!args.length||args.length===1&&args[0]==='--help'){stdout.write(help);return;}
  const [area,action,...rest]=args,options={};for(let i=0;i<rest.length;i+=2){if(!rest[i]?.startsWith('--')||!rest[i+1]||rest[i+1].startsWith('--')||Object.hasOwn(options,rest[i]))throw Error('Invalid or duplicate option.');options[rest[i]]=rest[i+1];}
  const valid=area==='app'&&action==='list'?['--server']:area==='dataset'&&action==='list'?['--app','--server']:area==='data'&&action==='export'?['--app','--dataset','--format','--out','--server']:area==='data'&&action==='validate'?['--file','--format']:null;
  if(!valid||Object.keys(options).some(k=>!valid.includes(k)))throw Error('Unsupported command/option. Run uip --help. No import writes are available.');
  if(area==='data'&&action==='validate'){if(!options['--file'])throw Error('--file is required');const format=options['--format']??options['--file'].split('.').at(-1);const rows=parseFile(await fs.readFile(options['--file'],'utf8'),format);stdout.write(JSON.stringify({records:rows.length,formatValid:true,schemaValidated:false,authorizationValidated:false,persisted:false})+'\n');return;}
  if(area!=='app'&&!options['--app']||action==='export'&&(!options['--dataset']||!options['--out']||!['csv','json'].includes(options['--format'])))throw Error('Required options missing.');
  const server=new URL(options['--server']??'http://127.0.0.1:5490');if(server.protocol!=='http:'||!['127.0.0.1','localhost','[::1]'].includes(server.hostname)||server.username||server.password||server.search||server.hash||server.pathname!=='/')throw Error('A local HTTP Platform origin is required.');
  async function request(route,init={}){const response=await fetch(new URL(route,server),{...init,redirect:'error',signal:AbortSignal.timeout(20_000)});if(!response.ok){let code='CLI_REQUEST_DENIED';try{code=(await response.json()).code??code;}catch{}throw Error(code);}return response.json();}
  if(!stdin.isTTY)throw Error('Interactive terminal required for memory-only pairing.');
  const proof=randomBytes(32).toString('hex'),challenge=createHash('sha256').update(proof).digest('hex');
  stdout.write('In your signed-in Builder, click Pair local CLI and paste this public challenge:\n'+challenge+'\n');
  const rl=createInterface({input:stdin,output:stdout});let code;try{code=await rl.question('Single-use browser pairing code: ');}finally{rl.close();}
  const {credential}=await request('/api/cli/pair',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({code:code.trim(),proof})});
  const query=new URLSearchParams();if(options['--app'])query.set('app',options['--app']);if(options['--dataset'])query.set('dataset',options['--dataset']);
  const route=area==='app'?'apps':area==='dataset'?'datasets':'export';const rows=await request('/api/cli/'+route+(query.size?'?'+query:''),{headers:{authorization:'Bearer '+credential}});
  if(action==='export'){const data=serialize(rows,options['--format']);await fs.writeFile(options['--out'],data,{flag:'wx',mode:0o600});stdout.write('Exported '+rows.length+' records.\n');}else stdout.write(JSON.stringify(rows,null,2)+'\n');
}
main().catch(()=>{process.stderr.write('uip: command failed or access denied. Check command options, session, permissions and output path. No import was performed.\n');process.exitCode=1;});
