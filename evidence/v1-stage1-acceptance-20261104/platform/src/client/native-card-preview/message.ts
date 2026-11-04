export interface Channel {nonce:string;session:string;identity:string;sequence:number}
export function validMessage(value:unknown,c:Channel):value is Channel&{type:'render'|'ready'|'unavailable';sample?:unknown;reason?:string} {
  if(!value||typeof value!=='object')return false;const v=value as Record<string,unknown>;
  const keys=v.type==='render'?['nonce','session','identity','sequence','type','sample']:['nonce','session','identity','sequence','type',...(v.reason===undefined?[]:['reason'])];
  return Object.keys(v).length===keys.length&&Object.keys(v).every(k=>keys.includes(k))&&['render','ready','unavailable'].includes(v.type as string)&&
    v.nonce===c.nonce&&v.session===c.session&&v.identity===c.identity&&v.sequence===c.sequence&&Number.isSafeInteger(v.sequence)&&Number(v.sequence)>0&&
    (v.reason===undefined||typeof v.reason==='string'&&v.reason.length<=256);
}
