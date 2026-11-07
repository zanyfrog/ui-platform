// Temporary opt-in investigation instrumentation. No authority input or decision changes.
import {AsyncLocalStorage} from 'node:async_hooks';
import {randomUUID} from 'node:crypto';
import type {RequestListener} from 'node:http';
const context=new AsyncLocalStorage<string>();
export const traceId=()=>context.getStore()??'';
export function trace(component:string,stage:string,fields:Record<string,string|number|boolean>={}){
  if(process.env.UI_PLATFORM_STAGE5_REFUSAL_TRACE!=='1')return;
  try{process.stderr.write('UIB_REFUSAL_TRACE '+JSON.stringify({pid:process.pid,id:traceId(),at:performance.now(),component,stage,...fields})+'\n');}catch{}
}
export function errorCode(error:unknown){const value=error as {code?:unknown;message?:unknown};for(const v of [value?.code,value?.message])if(typeof v==='string'&&/^[A-Z][A-Z0-9_]{1,63}$/.test(v))return v;return 'UNCLASSIFIED_ERROR';}
export async function step<T>(component:string,stage:string,action:()=>Promise<T>):Promise<T>{const start=performance.now();trace(component,stage+':start');try{const result=await action();trace(component,stage+':end',{elapsed:performance.now()-start,...(typeof result==='boolean'?{accepted:result}:{})});return result;}catch(error){trace(component,stage+':error',{elapsed:performance.now()-start,code:errorCode(error)});throw error;}}
export function traced(component:string,handler:RequestListener):RequestListener{
  return (request,response)=>context.run(typeof request.headers['x-uib-diagnostic-id']==='string'&&/^[a-f0-9-]{36}$/.test(request.headers['x-uib-diagnostic-id'])?request.headers['x-uib-diagnostic-id']:randomUUID(),()=>{
    const started=performance.now();trace(component,'request-start',{operation:(request.url??'').split('/').pop()??'',method:request.method??''});
    response.once('finish',()=>trace(component,'response',{status:response.statusCode,elapsed:performance.now()-started}));
    return handler(request,response);
  });
}
