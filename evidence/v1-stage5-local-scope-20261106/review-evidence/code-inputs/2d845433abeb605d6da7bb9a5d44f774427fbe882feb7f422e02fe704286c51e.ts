import {AsyncLocalStorage} from 'node:async_hooks';

import {createServer as httpsServer} from 'node:https';
import {randomUUID} from 'node:crypto';
import {jwtVerify} from './node_modules/jose/dist/webapi/index.js';
const scope=new AsyncLocalStorage<any>();(globalThis as any)[Symbol.for('stage5.plannerTrace')]=(value:any)=>event('planner.predicate',value);
const route=(s:any)=>String(s??'').split('?')[0].replace(/(\/runtime\/assets\/)[^/]+\/[^/]+/,'$1<asset>/<version>');
export function event(stage:string,extra:any={}){process.send?.({localTrace:{id:scope.getStore()?.id??'startup',pid:process.pid,wall:Date.now(),mono:performance.now(),stage,...extra}});}
export function traceHeaders(){return {'x-local-trace':scope.getStore()?.id??randomUUID()};}
export async function step(name:string,fn:()=>any){const start=performance.now();event(name+':start');try{const value=await fn();event(name+':end',{elapsed:performance.now()-start,...(typeof value==='boolean'?{value}: {})});return value;}catch(e){event(name+':error',{elapsed:performance.now()-start,code:(e as any)?.code??'ERROR',claim:(e as any)?.claim,reason:(e as any)?.reason});throw e;}}
export async function traceJwt(token:any,...args:any[]){const p=JSON.parse(Buffer.from(String(token).split('.')[1],'base64url').toString());const claims={iat:p.iat,exp:p.exp,nbf:p.nbf};event('jwt:start',claims);try{const value=await (jwtVerify as any)(token,...args);event('jwt:allow',claims);return value;}catch(e){event('jwt:reject',{...claims,code:(e as any)?.code,claim:(e as any)?.claim,reason:(e as any)?.reason});throw e;}}
export function createServer(options:any,listener:any){return httpsServer(options,(req,res)=>scope.run({id:typeof req.headers['x-local-trace']==='string'?req.headers['x-local-trace']:randomUUID()},()=>{const start=performance.now();event('http:start',{route:route(req.url),method:req.method});res.on('finish',()=>event('http:end',{route:route(req.url),status:res.statusCode,elapsed:performance.now()-start}));return listener(req,res);}));}
export function decorate(type:any,names:string[]){for(const name of names){const original=type.prototype[name];if(typeof original!=='function')throw Error('MISSING_TRACE_METHOD '+name);type.prototype[name]=function(...args:any[]){return step(type.name+'.'+name,()=>original.apply(this,args));};}}
