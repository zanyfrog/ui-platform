import {it,expect} from 'vitest';
import {mkdtemp,readFile,writeFile,mkdir,realpath,rm} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync,spawn} from 'node:child_process';
import {createServer} from 'node:https';
import {X509Certificate,randomUUID} from 'node:crypto';
import {build} from 'esbuild';
import {generateKeyPair,exportPKCS8} from '../src/server/production/node_modules/jose/dist/webapi/index.js';
import {ServiceRpcVerifier,serviceRpcHandler} from '../src/server/production/service-rpc.js';

// Investigation probe: an unexpected refusal is deliberately a failed regression,
// never relabeled as successful authorization or used to retry an application write.
it('fresh cross-process mTLS RPC assertions remain valid under repeated current checks',async()=>{
  const physical=process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT,original=process.env.UI_PLATFORM_TEST_ORIGINAL_ROOT;
  if(!physical||!original||await realpath('.')!==await realpath(physical)||await realpath(physical)===await realpath(original))throw Error('PHYSICAL_ISOLATION_REQUIRED');
  const root=await mkdtemp(path.join(tmpdir(),'stage5-rpc-probe-')),refusals:any[]=[];
  let server:ReturnType<typeof createServer>|undefined,child:ReturnType<typeof spawn>|undefined;
  try{
    const run=(args:string[])=>execFileSync('C:/Program Files/Git/usr/bin/openssl.exe',args,{cwd:root,windowsHide:true,stdio:'ignore'});
    run(['req','-x509','-newkey','rsa:2048','-nodes','-keyout','ca.key','-out','ca.pem','-days','1','-subj','/CN=Disposable RPC probe CA']);
    for(const name of ['server','client']){
      run(['req','-newkey','rsa:2048','-nodes','-keyout',name+'.key','-out',name+'.csr','-subj','/CN='+name]);
      await writeFile(path.join(root,name+'.ext'),'subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage='+ (name==='server'?'serverAuth':'clientAuth')+'\n');
      run(['x509','-req','-in',name+'.csr','-CA','ca.pem','-CAkey','ca.key','-CAcreateserial','-out',name+'.pem','-days','1','-extfile',name+'.ext']);
    }
    const keys=await generateKeyPair('EdDSA',{extractable:true}),audience=randomUUID();
    const tls={ca:await readFile(path.join(root,'ca.pem'),'utf8'),cert:await readFile(path.join(root,'server.pem'),'utf8'),key:await readFile(path.join(root,'server.key'),'utf8')};
    const clientTls={ca:tls.ca,cert:await readFile(path.join(root,'client.pem'),'utf8'),key:await readFile(path.join(root,'client.key'),'utf8')};
    const verifier=new ServiceRpcVerifier(audience,[{id:'probe',keyId:'probe',key:keys.publicKey,fingerprint:new X509Certificate(clientTls.cert).fingerprint256,paths:['/identity/current']}]);
    const authenticate=verifier.authenticate.bind(verifier);
    verifier.authenticate=async(request,bytes)=>{try{return await authenticate(request,bytes);}catch(error){const e=error as any;refusals.push({component:'ServiceRpcVerifier.authenticate',code:e.code??'UNKNOWN',claim:e.claim??'',reason:e.reason??'',iat:typeof e.payload?.iat==='number'?e.payload.iat:null,exp:typeof e.payload?.exp==='number'?e.payload.exp:null,now:Date.now()/1000,dateNow:new Date().getTime()/1000,monotonic:performance.now()});throw error;}};
    server=createServer({...tls,requestCert:true,rejectUnauthorized:true},serviceRpcHandler(verifier,{'/identity/current':async()=>({current:true})}));
    await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));
    const port=(server.address() as any).port;
    const config={endpoint:`https://127.0.0.1:${port}/`,tls:clientTls,audience,key:await exportPKCS8(keys.privateKey)};
    await writeFile(path.join(root,'config.json'),JSON.stringify(config));
    const entry=`import fs from 'node:fs/promises';import {ServiceRpcClient} from ${JSON.stringify(path.resolve('src/server/production/service-rpc.ts'))};import {importPKCS8} from ${JSON.stringify(path.resolve('src/server/production/node_modules/jose/dist/webapi/index.js'))};const c=JSON.parse(await fs.readFile(process.env.PROBE_CONFIG,'utf8'));const rpc=new ServiceRpcClient(c.endpoint,c.tls,'probe','probe',await importPKCS8(c.key,'EdDSA'),c.audience,['/identity/current']);const start=performance.now();let calls=0,failures=0;while(performance.now()-start<15000&&calls<4000){calls++;try{if((await rpc.call('/identity/current',{})).current!==true)failures++;}catch{failures++;}await new Promise(r=>setTimeout(r,2));}process.stdout.write(JSON.stringify({calls,failures,elapsed:performance.now()-start}));`;
    const worker=path.join(root,'worker.mjs');await build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'rpc-probe.ts'},outfile:worker,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
    child=spawn(process.execPath,[worker],{cwd:process.cwd(),windowsHide:true,env:{...process.env,PROBE_CONFIG:path.join(root,'config.json'),UI_PLATFORM_STAGE5_REFUSAL_TRACE:'0'},stdio:['ignore','pipe','pipe']});
    let stdout='',stderr='';child.stdout!.on('data',b=>stdout+=String(b));child.stderr!.on('data',b=>stderr+=String(b));
    const code=await new Promise<number|null>((resolve,reject)=>{child!.once('error',reject);child!.once('exit',resolve);});
    expect(code,stderr).toBe(0);const result=JSON.parse(stdout);
    await mkdir('diagnostics',{recursive:true});await writeFile('diagnostics/rpc-refusal-probe.json',JSON.stringify({result,refusals,contract:{assertionLifetimeSeconds:15,rpcTimeoutMs:3000,clockToleranceSeconds:0},credentialsRetained:false},null,2));
    expect(result.failures,JSON.stringify(refusals.slice(0,5))).toBe(0);
  }finally{
    if(child&&child.exitCode===null)child.kill();
    if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()));}
    await rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100});
  }
},60000);
