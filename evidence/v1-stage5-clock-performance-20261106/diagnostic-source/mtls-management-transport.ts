import {traceId,trace,errorCode} from './refusal-trace.js';
import { request as httpsRequest } from 'node:https';
import type { IncomingMessage } from 'node:http';
import type { InternalActor, InternalSigner } from './internal-trust.js';
import type { RuntimeTransport } from './runtime.js';
import { deny } from './boundary.js';

/** Separate management credential and fixed allowlist. This transport is never passed to the public runtime. */
export class MtlsManagementTransport implements RuntimeTransport {
  private readonly endpoint: URL;
  constructor(endpoint:string,private readonly tls:{ca:string;cert:string;key:string},private readonly signer:InternalSigner){
    this.endpoint=new URL(endpoint);if(this.endpoint.protocol!=='https:'||this.endpoint.pathname!=='/'||this.endpoint.username||this.endpoint.password||this.endpoint.search||this.endpoint.hash)deny();
  }
  async send(actor:InternalActor,path:string,bytes:Buffer,incoming:IncomingMessage){
    if(!/^\/management\/[A-Za-z0-9_.:-]+\/security\/(roles|stage|assign|revoke|activate|provision|revoke-sessions|template-register|template-revoke)$/.test(path))deny();
    const method=incoming.method!,assertion=await this.signer.sign(actor,method,path,bytes);
    return new Promise<{status:number;headers:Record<string,string>;bytes:Buffer}>((resolve,reject)=>{
      const request=httpsRequest(new URL(path,this.endpoint),{...this.tls,rejectUnauthorized:true,method,headers:{'x-uib-diagnostic-id':traceId(),authorization:`Bearer ${assertion}`,'content-type':'application/json'}},response=>{
        const chunks:Buffer[]=[];let size=0;response.on('data',chunk=>{if((size+=chunk.length)>1_000_000)response.destroy(new Error('UPSTREAM_LIMIT'));else chunks.push(Buffer.from(chunk));});response.on('error',reject);
        response.on('end',()=>resolve({status:response.statusCode??503,headers:{'content-type':'application/json'},bytes:Buffer.concat(chunks)}));
      });request.setTimeout(15_000,()=>request.destroy(new Error('UPSTREAM_TIMEOUT')));request.on('error',error=>{trace('transport','error',{code:errorCode(error)});reject(error);});request.end(bytes);
    });
  }
}

