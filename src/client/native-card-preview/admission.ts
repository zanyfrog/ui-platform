import { copySerializable, defaultSettings, validateDefinition, validateSettings } from '../../../../ui-base/packages/ui-base-ui/src/platform/definition.js';
export const CARD_ID='cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1';
export class CardDenied extends Error { code:string; constructor(code:string){super(code);this.code=code;} }
const deny=(code:string):never=>{throw new CardDenied(code);};
const need=(v:unknown,code:string)=>{if(!v)deny(code);};
export function canonical(value:unknown):string {
  const seen=new Set<object>();
  const visit=(v:unknown):string=>{
    if(v===null||typeof v==='string'||typeof v==='boolean')return JSON.stringify(v);
    if(typeof v==='number'){need(Number.isFinite(v)&&(!Number.isInteger(v)||Number.isSafeInteger(v)),'DATA_INVALID');return JSON.stringify(v);}
    if(typeof v!=='object')return deny('DATA_INVALID');need(!seen.has(v),'DATA_INVALID');seen.add(v);
    need(Reflect.ownKeys(v).every(k=>typeof k==='string'),'DATA_INVALID');const d=Object.getOwnPropertyDescriptors(v);
    let text:string;
    if(Array.isArray(v)){need(Object.keys(d).length===v.length+1,'DATA_INVALID');text='['+Array.from({length:v.length},(_,i)=>{const p=d[String(i)];need(p&&'value'in p&&p.enumerable,'DATA_INVALID');return visit(p.value);}).join(',')+']';}
    else{need([Object.prototype,null].includes(Object.getPrototypeOf(v)),'DATA_INVALID');text='{'+Object.keys(d).sort().map(k=>{const p=d[k];need('value'in p&&p.enumerable&&!['__proto__','constructor','prototype'].includes(k),'DATA_INVALID');return JSON.stringify(k)+':'+visit(p.value);}).join(',')+'}';}
    seen.delete(v);return text;
  };return visit(value);
}
export const clone=<T>(v:T):T=>JSON.parse(canonical(v));
export async function hashText(text:string){return 'sha256:'+Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),n=>n.toString(16).padStart(2,'0')).join('');}
const exact=(v:object,fields:string[])=>{need(v&&typeof v==='object'&&!Array.isArray(v),'FIELDS_INVALID');need(Object.keys(v).sort().join('|')===fields.sort().join('|'),'FIELDS_INVALID');};
export interface Binding {authorityId:string;subjectId:string;sessionHandle:string;sessionRevision:string;applicationId:string;owner:{kind:'package';id:string};selectedIdentity:string}
export interface Epoch {policy:{authorityId:string;lineage:string;revision:string};sessionRevision:string;ownerRevision:string;scopeDigest:string;validUntil:number}
export interface CardCapture {schema:'canonical-card-capture-v1';componentId:string;packageName:string;packageVersion:string;schemaVersion:string;definitionDigest:string;closureDigest:string;bundleDigest:string;activation:string;settings:Record<string,unknown>;binding:Binding;epoch:Epoch;expires:number;contentDigest:string}
export interface Profile {definition:any;definitionDigest:string;closureDigest:string;bundleDigest:string;activation:string;binding:Binding;epoch:Epoch;limits:{maxText:number;maxInputBytes:number}}
export type Authority={allowed:boolean;binding:Binding;epoch:Epoch};
export function contentOf(c:CardCapture){return {schema:c.schema,componentId:c.componentId,packageName:c.packageName,packageVersion:c.packageVersion,schemaVersion:c.schemaVersion,definitionDigest:c.definitionDigest,closureDigest:c.closureDigest,bundleDigest:c.bundleDigest,activation:c.activation,settings:c.settings};}
export async function seal(c:Omit<CardCapture,'contentDigest'>):Promise<CardCapture>{const copy=clone(c) as CardCapture;copy.contentDigest=await hashText(canonical(contentOf(copy)));return copy;}
export async function admit(input:unknown,profile:Profile,now:number,authority:Authority):Promise<CardCapture> {
  try { return await admitData(input,profile,now,authority); }
  catch(error){if(error instanceof CardDenied)throw error;throw new CardDenied('INPUT_INVALID');}
}
async function admitData(input:unknown,profile:Profile,now:number,authority:Authority):Promise<CardCapture> {
  const serialized=canonical(input);const p=clone(profile),a=clone(authority);
  need(Number.isSafeInteger(now)&&now>=0,'CLOCK_INVALID');
  exact(p.limits,['maxText','maxInputBytes']);need(Object.values(p.limits).every(n=>Number.isSafeInteger(n)&&n>0),'LIMIT_INVALID');
  need(new TextEncoder().encode(serialized).length<=p.limits.maxInputBytes,'INPUT_LIMIT');
  const c=JSON.parse(serialized) as CardCapture;
  exact(c,['schema','componentId','packageName','packageVersion','schemaVersion','definitionDigest','closureDigest','bundleDigest','activation','settings','binding','epoch','expires','contentDigest']);
  need(c.schema==='canonical-card-capture-v1'&&c.componentId===CARD_ID&&c.packageName==='@ui-base/ui'&&c.packageVersion==='0.5.1'&&c.schemaVersion==='1.0.0','IDENTITY_UNSUPPORTED');
  need(validateDefinition(p.definition).length===0&&p.definition.identity.componentId===CARD_ID&&p.definition.ownership.package.packageId==='@ui-base/ui'&&p.definition.version.packageVersion==='0.5.1','DEFINITION_INVALID');
  need(await hashText(canonical(p.definition))===p.definitionDigest&&c.definitionDigest===p.definitionDigest,'DEFINITION_CHANGED');
  need(c.closureDigest===p.closureDigest&&c.bundleDigest===p.bundleDigest&&/^sha256:[a-f0-9]{64}$/.test(c.closureDigest)&&/^sha256:[a-f0-9]{64}$/.test(c.bundleDigest),'EXECUTABLE_CHANGED');
  need(c.activation===p.activation&&typeof c.activation==='string'&&c.activation.length>0,'ACTIVATION_CHANGED');
  exact(c.binding,['authorityId','subjectId','sessionHandle','sessionRevision','applicationId','owner','selectedIdentity']);exact(c.binding.owner,['kind','id']);
  need(Object.entries(c.binding).filter(([k])=>k!=='owner').every(([,v])=>typeof v==='string'&&v.length>0)&&c.binding.owner.kind==='package'&&c.binding.owner.id==='@ui-base/ui'&&c.binding.selectedIdentity===CARD_ID,'BINDING_INVALID');
  exact(c.epoch,['policy','sessionRevision','ownerRevision','scopeDigest','validUntil']);exact(c.epoch.policy,['authorityId','lineage','revision']);
  need(c.epoch.policy.authorityId===c.binding.authorityId&&c.epoch.sessionRevision===c.binding.sessionRevision&&!!c.epoch.ownerRevision&&!!c.epoch.policy.lineage&&/^(0|[1-9][0-9]*)$/.test(c.epoch.policy.revision)&&/^sha256:[a-f0-9]{64}$/.test(c.epoch.scopeDigest),'EPOCH_INVALID');
  need(a.allowed===true&&canonical(c.binding)===canonical(p.binding)&&canonical(c.binding)===canonical(a.binding)&&canonical(c.epoch)===canonical(p.epoch)&&canonical(c.epoch)===canonical(a.epoch),'AUTHORITY_CHANGED');
  need(Number.isSafeInteger(c.expires)&&Number.isSafeInteger(c.epoch.validUntil)&&c.expires>now&&c.expires<=c.epoch.validUntil,'EXPIRED');
  exact(c.settings,Object.keys(c.settings));
  const allowed=['body','header','footer','heading','label','name','ariaLabel','ariaDescribedBy','variant','density','interactionMode','selected','disabled'];
  need(Object.keys(c.settings).every(k=>allowed.includes(k)),'CAPABILITY_DENIED');
  for(const [key,value]of Object.entries(c.settings))if(typeof value==='string'){need(value.length<=p.limits.maxText&&!/[<>\u0000-\u001f]/.test(value),'TEXT_INVALID');if(key==='interactionMode')need(['none','selectable'].includes(value),'MODE_DENIED');}
  need(validateSettings(p.definition,c.settings).length===0,'SETTINGS_INVALID');
  const effective={...defaultSettings(p.definition),...c.settings};need(['none','selectable'].includes(effective.interactionMode),'MODE_DENIED');
  need(await hashText(canonical(contentOf(c)))===c.contentDigest,'CONTENT_CHANGED');
  // Existing native JSON validator remains part of the admission contract.
  return copySerializable(c);
}
