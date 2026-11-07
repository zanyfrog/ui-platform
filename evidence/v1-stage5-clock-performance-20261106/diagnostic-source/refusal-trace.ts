// Temporary opt-in investigation instrumentation. No authority input or decision changes.
import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import type {RequestListener} from 'node:http';
const context=new AsyncLocalStorage<string>();const spans=new AsyncLocalStorage<string>();let nextSpan=0;
export const traceId=()=>context.getStore()??'';
export function trace(component:string,stage:string,fields:Record<string,string|number|boolean>={}){
  if(process.env.UI_PLATFORM_STAGE5_REFUSAL_TRACE!=='1')return;
  try{process.stderr.write('UIB_REFUSAL_TRACE '+JSON.stringify({pid:process.pid,id:traceId(),at:performance.now(),component,stage,...fields})+'\n');}catch{}
}
export function errorCode(error:unknown){const value=error as {code?:unknown;message?:unknown};for(const v of [value?.code,value?.message])if(typeof v==='string'&&/^[A-Z][A-Z0-9_]{1,63}$/.test(v))return v;return 'UNCLASSIFIED_ERROR';}
export function errorFacts(error:unknown):Record<string,string|number|boolean>{const e=error as any;const result:Record<string,string|number|boolean>={code:errorCode(error),now:Date.now()/1000};if(['iat','exp','nbf','aud','iss','typ','jti'].includes(e?.claim))result.claim=e.claim;if(['missing','check_failed','invalid'].includes(e?.reason))result.reason=e.reason;for(const key of ['iat','exp','nbf'])if(typeof e?.payload?.[key]==='number')result[key]=e.payload[key];return result;}
export async function step<T>(component:string,stage:string,action:()=>Promise<T>):Promise<T>{const start=performance.now(),span='s'+(++nextSpan),parent=spans.getStore()??'http-root';trace(component,stage+':start',{span,parent});try{const result=await spans.run(span,action);trace(component,stage+':end',{span,parent,elapsed:performance.now()-start,...(typeof result==='boolean'?{accepted:result}:{})});return result;}catch(error){trace(component,stage+':error',{span,parent,elapsed:performance.now()-start,code:errorCode(error)});throw error;}}
export function traced(component:string,handler:RequestListener):RequestListener{
  return (request,response)=>context.run(typeof request.headers['x-uib-diagnostic-id']==='string'&&/^[a-f0-9-]{36}$/.test(request.headers['x-uib-diagnostic-id'])?request.headers['x-uib-diagnostic-id']:randomUUID(),()=>{
    const started=performance.now();trace(component,'request-start',{operation:(request.url??'').split('/').pop()??'',method:request.method??''});
    response.once('finish',()=>trace(component,'response',{status:response.statusCode,elapsed:performance.now()-started}));
    return handler(request,response);
  });
}
