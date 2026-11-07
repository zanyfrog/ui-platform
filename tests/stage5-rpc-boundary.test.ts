import {it,expect,vi} from 'vitest';
import {mkdtemp,readFile,writeFile,realpath,rm,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {createServer,request as httpsRequest} from 'node:https';
import {X509Certificate} from 'node:crypto';
import {ServiceRpcClient,ServiceRpcVerifier} from '../src/server/production/service-rpc.js';
import {generateKeyPair,SignJWT,decodeJwt} from '../src/server/production/node_modules/jose/dist/webapi/index.js';
import {digest,json} from '../src/server/production/boundary.js';

import { internalJwtClock } from '../src/server/production/internal-jwt-clock.js';
// Stub individual trusted samples here; discontinuity behavior is tested separately.
const RealDate=Date;
function clock(samples:number[]){let index=0;const next=()=>samples[Math.min(index++,samples.length-1)]!;
  const mock=vi.spyOn(internalJwtClock,'sample').mockImplementation(()=>({wall:next(),before:0n,after:0n}));
  return()=>mock.mockRestore();
}
it('one sender clock sample preserves the 15-second RPC lifetime across a second boundary',async()=>{
  const physical=process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT,original=process.env.UI_PLATFORM_TEST_ORIGINAL_ROOT;
  if(!physical||!original||await realpath('.')!==await realpath(physical)||await realpath(physical)===await realpath(original))throw Error('PHYSICAL_ISOLATION_REQUIRED');
  const root=await mkdtemp(path.join(tmpdir(),'stage5-clock-boundary-')),observations:any[]=[];
  let server:ReturnType<typeof createServer>|undefined;
  try{
    const run=(args:string[])=>execFileSync('C:/Program Files/Git/usr/bin/openssl.exe',args,{cwd:root,windowsHide:true,stdio:'ignore'});
    run(['req','-x509','-newkey','rsa:2048','-nodes','-keyout','ca.key','-out','ca.pem','-days','1','-subj','/CN=Disposable clock regression']);
    for(const name of ['server','client']){run(['req','-newkey','rsa:2048','-nodes','-keyout',name+'.key','-out',name+'.csr','-subj','/CN='+name]);await writeFile(path.join(root,name+'.ext'),'subjectAltName=DNS:localhost,IP:127.0.0.1\nextendedKeyUsage=serverAuth,clientAuth\n');run(['x509','-req','-in',name+'.csr','-CA','ca.pem','-CAkey','ca.key','-CAcreateserial','-out',name+'.pem','-days','1','-extfile',name+'.ext']);}
    const ca=await readFile(path.join(root,'ca.pem'),'utf8'),tls={ca,cert:await readFile(path.join(root,'server.pem'),'utf8'),key:await readFile(path.join(root,'server.key'),'utf8')},clientTls={ca,cert:await readFile(path.join(root,'client.pem'),'utf8'),key:await readFile(path.join(root,'client.key'),'utf8')};
    const keys=await generateKeyPair('EdDSA'),other=await generateKeyPair('EdDSA'),audience='clock-boundary-instance',route='/identity/current',bytes=Buffer.from('{}');
    const verifier=new ServiceRpcVerifier(audience,[{id:'clock-peer',keyId:'clock-peer',key:keys.publicKey,fingerprint:new X509Certificate(clientTls.cert).fingerprint256,paths:[route]}]);
    const base=Math.floor(RealDate.now()/1000),boundary=(base+1)*1000;
    let receiver=boundary,label='boundary',captured='',nonce=0;
    server=createServer({...tls,requestCert:true,rejectUnauthorized:true},async(req,res)=>{
      const chunks:Buffer[]=[];for await(const chunk of req)chunks.push(Buffer.from(chunk));
      const token=String(req.headers.authorization??'').slice(7);captured=token;
      const p=decodeJwt(token),restore=clock([receiver]);
      let status=200,code='ALLOW';try{await verifier.authenticate(req,Buffer.concat(chunks));}catch(error){status=403;code=String((error as any).code??(error as Error).message);}finally{restore();}
      observations.push({label,receiverMs:receiver,iat:p.iat,exp:p.exp,nbf:p.nbf??null,span:Number(p.exp)-Number(p.iat),status,code});json(res,status,{current:status===200});
    });
    await new Promise<void>(resolve=>server!.listen(0,'127.0.0.1',resolve));const endpoint=`https://127.0.0.1:${(server.address() as any).port}/`;
    const client=new ServiceRpcClient(endpoint,clientTls,'clock-peer','clock-peer',keys.privateKey,audience,[route]);
    const send=async(token:string,body=bytes,url=route,method='POST')=>new Promise<number>((resolve,reject)=>{const req=httpsRequest(new URL(url,endpoint),{...clientTls,method,headers:{authorization:'Bearer '+token}},res=>{res.resume();res.once('end',()=>resolve(res.statusCode!));});req.once('error',reject);req.end(body);});
    const token=async(overrides:any={},key=keys.privateKey)=>new SignJWT({method:'POST',path:route,bodyHash:digest(bytes),iat:base,exp:base+15,iss:'clock-peer',aud:audience,jti:'clock-'+(++nonce),...overrides}).setProtectedHeader({alg:'EdDSA',kid:'clock-peer',typ:'uib-service-rpc+jwt'}).sign(key);
    const restore=clock([boundary-1,boundary]);let pending:Promise<any>;
    try{pending=client.call(route,{});}finally{restore();}
    let boundaryAllowed=true;try{await pending!;}catch{boundaryAllowed=false;}
    await mkdir('diagnostics',{recursive:true});await writeFile('diagnostics/rpc-boundary-observations.json',JSON.stringify({observations},null,2));
    expect(boundaryAllowed,JSON.stringify(observations)).toBe(true);
    expect(observations[0].span).toBe(15);
    // Exactly at expiry is denied; one millisecond before it remains valid.
    label='before-expiry';receiver=(base+15)*1000-1;expect(await send(await token())).toBe(200);
    label='at-expiry';receiver=(base+15)*1000;expect(await send(await token())).toBe(403);
    label='genuine-future-1ms';receiver=boundary-1;expect(await send(await token({iat:base+1,exp:base+16}))).toBe(403);
    label='genuine-future-second';receiver=base*1000;expect(await send(await token({iat:base+1,exp:base+16}))).toBe(403);
    label='not-before-future';receiver=base*1000;expect(await send(await token({nbf:base+1}))).toBe(403);
    label='max-age';receiver=(base+16)*1000;expect(await send(await token({exp:base+30}))).toBe(403);
    label='replay-first';receiver=(base+1)*1000;const replay=await token();expect(await send(replay)).toBe(200);label='replay-second';expect(await send(replay)).toBe(403);
    for(const [name,overrides]of [['audience',{aud:'foreign'}],['service',{iss:'foreign'}],['body',{bodyHash:'forged'}],['path',{path:'/foreign'}],['method',{method:'GET'}],['lifetime',{exp:base+16}]] as const){label=name;expect(await send(await token(overrides))).toBe(403);}
    label='signature';expect(await send(await token({},other.privateKey))).toBe(403);
    await writeFile('diagnostics/rpc-boundary-observations.json',JSON.stringify({observations,assertionLifetimeSeconds:15,generalClockToleranceAdded:false,genuineFutureOneMillisecondStillDenied:true},null,2));
  }finally{vi.restoreAllMocks();if(server){server.closeAllConnections();await new Promise<void>(resolve=>server!.close(()=>resolve()));}await rm(root,{recursive:true,force:true,maxRetries:10,retryDelay:100});}
},60000);
