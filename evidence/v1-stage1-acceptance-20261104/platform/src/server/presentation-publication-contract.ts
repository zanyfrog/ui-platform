/** Pure validation for the existing presentation owner's initial resource-free subset. */
import { createHash } from 'node:crypto';
import { validatePresentation, renderPresentationCss } from './presentation-format.js';
import type { ApplicationPresentation, PresentationVersionInfo } from '../shared/presentation.js';
export type PresentationPublicationRefusal = 'INVALID_INPUT'|'UNSUPPORTED_PRODUCER'|'UNSUPPORTED_CONTENT'|'MEMBERSHIP_INVALID'|'CONTENT_CHANGED'|'UNPUBLISHED'|'VERSION_MISMATCH'|'VERSION_EXISTS'|'UNSEALED'|'SELECTION_CHANGED'|'CANCELED'|'EXPIRED'|'DISPOSED'|'BUSY'|'OWNER_UNRESOLVED'|'UNSAFE'|'RECOVERY_REQUIRED'|'IO_UNCERTAIN'|'LIMIT_EXCEEDED';
export class PresentationPublicationError extends Error {
  constructor(readonly code: PresentationPublicationRefusal) { super('Presentation publication unavailable: '+code); this.name='PresentationPublicationError'; }
}
export function fail(code:PresentationPublicationRefusal):never { throw new PresentationPublicationError(code); }
export const hash=(v:string|Uint8Array)=>createHash('sha256').update(v).digest('hex');
export function canonical(v:any):string { return v===null||typeof v!=='object'?JSON.stringify(v):Array.isArray(v)?'['+v.map(canonical).join(',')+']':'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}'; }
export function freeze<T>(v:T):Readonly<T>{if(v&&typeof v==='object'){for(const x of Object.values(v))freeze(x);Object.freeze(v);}return v;}
export interface PresentationOwnerBinding {readonly kind:'application';readonly id:string}
export interface CompletedPresentationSnapshot {
  readonly producer:'owner-completed-presentation-v1';readonly version:number;readonly files:ReadonlyMap<string,Uint8Array>;
}
export const resourceIds=['app.settings.json','application.css','presentation.json','publication.manifest.json'] as const;
export interface PresentationResource {id:string;sha256:string;byteLength:number;mediaType:string;dependencies:readonly string[]}
export interface PresentationPublicationIndex {
  schema:'presentation-publication-v1';owner:PresentationOwnerBinding;producer:'owner-completed-presentation-v1';subset:'static-card-presentation-v1';
  version:number;versionRecord:PresentationVersionInfo;presentationChecksum:string;resources:readonly PresentationResource[];
}
function exact(v:any,required:string[],optional:string[]=[]):void{
  if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v)))fail('INVALID_INPUT');
  if(Reflect.ownKeys(v).some(k=>typeof k!=='string')||Object.entries(Object.getOwnPropertyDescriptors(v)).some(([k,p])=>!p.enumerable||!('value'in p)||![...required,...optional].includes(k))||required.some(k=>!Object.hasOwn(v,k)))fail('INVALID_INPUT');
}
function parsed(bytes:Uint8Array){
  let value:any;const text=Buffer.from(bytes).toString('utf8');
  if(!Buffer.from(text,'utf8').equals(Buffer.from(bytes)))fail('INVALID_INPUT');
  try{value=JSON.parse(text);}catch{fail('INVALID_INPUT');}
  // Existing owner writers emit one of these formats. No duplicate-key or
  // unsupported syntax can be normalized into a different accepted document.
  if(text!==JSON.stringify(value)&&text!==JSON.stringify(value,null,2)+'\n')fail('INVALID_INPUT');return value;
}
function subset(value:any):ApplicationPresentation{
  exact(value,['schemaVersion','name','tokens','typography','componentDefaults','layout','heroes','css','assets']);
  if(value.schemaVersion!=='1.0.0'||typeof value.name!=='string'||!value.name.trim()||value.name.length>1024)fail('UNSUPPORTED_CONTENT');
  for(const key of ['typography','componentDefaults','heroes']){exact(value[key],[]);}
  if(!Array.isArray(value.assets)||value.assets.length||typeof value.css!=='string'||value.css.trim())fail('UNSUPPORTED_CONTENT');
  exact(value.tokens,[],['--app-color-primary','--app-color-surface','--app-color-text','--app-spacing-sm','--app-spacing-md','--app-spacing-lg','--app-radius-card','--app-content-max-width','--app-font-body']);
  for(const [key,v]of Object.entries(value.tokens)){
    if(typeof v!=='string'||v.length>64)fail('UNSUPPORTED_CONTENT');
    if(key.startsWith('--app-color-')?!/^#(?:[a-f0-9]{3}|[a-f0-9]{6}|[a-f0-9]{8})$/i.test(v):key==='--app-font-body'?v!=='system-ui, sans-serif':!/^\d{1,4}(?:\.\d{1,4})?(?:rem|em|px|vw|vh|%)$/.test(v))fail('UNSUPPORTED_CONTENT');
  }
  // Require the owner-specified tokens used by its stylesheet; no fallback theme.
  if(['--app-color-primary','--app-color-surface','--app-color-text','--app-spacing-lg','--app-content-max-width','--app-font-body'].some(k=>!Object.hasOwn(value.tokens,k)))fail('UNSUPPORTED_CONTENT');
  const l=value.layout;exact(l,['defaultShell','defaultTemplate','routes','shells','navigation']);
  if(l.defaultShell!=='minimal'||l.defaultTemplate!=='standard'||!Array.isArray(l.navigation)||l.navigation.length)fail('UNSUPPORTED_CONTENT');
  exact(l.routes,[]);exact(l.shells,['public','authenticated','minimal']);
  for(const s of Object.values(l.shells) as any[]){exact(s,['showNavigation','navigationPlacement','showFooter','footerText']);if(s.showNavigation!==false||s.navigationPlacement!=='top'||s.showFooter!==false||s.footerText!=='')fail('UNSUPPORTED_CONTENT');}
  let result:ApplicationPresentation;try{result=validatePresentation(value);}catch{fail('UNSUPPORTED_CONTENT');}
  if(canonical(JSON.parse(JSON.stringify(result)))!==canonical(value))fail('UNSUPPORTED_CONTENT');return result;
}
export function snapshotIndex(owner:PresentationOwnerBinding,input:CompletedPresentationSnapshot):{index:PresentationPublicationIndex;bytes:Map<string,Uint8Array>}{
  exact(input,['producer','version','files']);
  if(input.producer!=='owner-completed-presentation-v1')fail('UNSUPPORTED_PRODUCER');
  if(!Number.isSafeInteger(input.version)||input.version<1)fail('VERSION_MISMATCH');
  if(!(input.files instanceof Map)||input.files.size!==4)fail('MEMBERSHIP_INVALID');
  const bytes=new Map<string,Uint8Array>();
  for(const id of resourceIds){const b=input.files.get(id);if(!(b instanceof Uint8Array))fail('MEMBERSHIP_INVALID');const copy=new Uint8Array(b);if(copy.length>65536)fail('LIMIT_EXCEEDED');bytes.set(id,copy);}
  // The actual Application owner stores UUID in its manifest, not settings.
  // Settings establish the explicit legacy context only; never invent appId.
  const context=parsed(bytes.get('app.settings.json')!);exact(context,['application']);
  exact(context.application,['name','status'],['description']);
  if(context.application.status!=='active'||Object.values(context.application).some(v=>typeof v!=='string'||v.length>1024)||!context.application.name.trim())fail('VERSION_MISMATCH');
  const manifest=parsed(bytes.get('publication.manifest.json')!);exact(manifest,['type','schemaVersion','applicationId','activeVersion','draft','versions']);
  if(manifest.type!=='ui-platform.presentation'||manifest.schemaVersion!=='1.0.0'||manifest.applicationId!==owner.id)fail('VERSION_MISMATCH');
  if(manifest.activeVersion!==input.version)fail('UNPUBLISHED');
  exact(manifest.draft,['exists'],['modifiedAt','checksum']);if(typeof manifest.draft.exists!=='boolean')fail('INVALID_INPUT');
  if(manifest.draft.modifiedAt!==undefined&&(typeof manifest.draft.modifiedAt!=='string'||!Number.isFinite(Date.parse(manifest.draft.modifiedAt))))fail('INVALID_INPUT');
  if(manifest.draft.checksum!==undefined&&(typeof manifest.draft.checksum!=='string'||!/^[a-f0-9]{64}$/.test(manifest.draft.checksum)))fail('INVALID_INPUT');
  if(!Array.isArray(manifest.versions)||manifest.versions.length>256)fail('INVALID_INPUT');const versions=new Set<number>();let record:PresentationVersionInfo|undefined;
  for(const v of manifest.versions){exact(v,['version','checksum','publishedAt','actor']);if(!Number.isSafeInteger(v.version)||v.version<1||versions.has(v.version)||typeof v.checksum!=='string'||!/^[a-f0-9]{64}$/.test(v.checksum)||typeof v.publishedAt!=='string'||!Number.isFinite(Date.parse(v.publishedAt))||typeof v.actor!=='string'||!v.actor||v.actor.length>256)fail('VERSION_MISMATCH');versions.add(v.version);if(v.version===input.version)record=v;}
  if(!record)fail('UNPUBLISHED');const raw=parsed(bytes.get('presentation.json')!),presentation=subset(raw);
  if(hash(JSON.stringify(raw))!==record.checksum)fail('CONTENT_CHANGED');
  if(!Buffer.from(bytes.get('application.css')!).equals(Buffer.from(renderPresentationCss(presentation))))fail('CONTENT_CHANGED');
  const resources=resourceIds.map(id=>({id,byteLength:bytes.get(id)!.length,sha256:hash(bytes.get(id)!),mediaType:id.endsWith('.css')?'text/css':'application/json',dependencies:id==='application.css'?['presentation.json']:id==='presentation.json'?['app.settings.json']:[]}));
  return{index:{schema:'presentation-publication-v1',owner,producer:'owner-completed-presentation-v1',subset:'static-card-presentation-v1',version:input.version,versionRecord:structuredClone(record),presentationChecksum:record.checksum,resources},bytes};
}
export function verifyIndexShape(index:any,owner:PresentationOwnerBinding):asserts index is PresentationPublicationIndex{
  exact(index,['schema','owner','producer','subset','version','versionRecord','presentationChecksum','resources']);
  if(index.schema!=='presentation-publication-v1'||canonical(index.owner)!==canonical(owner)||index.producer!=='owner-completed-presentation-v1'||index.subset!=='static-card-presentation-v1'||!Number.isSafeInteger(index.version)||index.version<1||!Array.isArray(index.resources)||index.resources.length!==4)fail('CONTENT_CHANGED');
  for(let i=0;i<4;i++){const r=index.resources[i];exact(r,['id','sha256','byteLength','mediaType','dependencies']);if(r.id!==resourceIds[i]||typeof r.sha256!=='string'||!/^[a-f0-9]{64}$/.test(r.sha256)||!Number.isSafeInteger(r.byteLength)||r.byteLength<0||r.byteLength>65536||!Array.isArray(r.dependencies))fail('MEMBERSHIP_INVALID');}
}
