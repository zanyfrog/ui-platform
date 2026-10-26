import { workspaceIdentityKey } from './builder-workspace.js';
import type { WorkspaceIdentity } from './builder-workspace.js';

export type SavedPreviewUnavailableCode='NO_SELECTION'|'REPAIR_ONLY_IDENTITY'|'UNRESOLVED_IDENTITY'|'PACKAGE_DEFINITION_ONLY'|'SAVED_NODE_UNRESOLVED'|'SOURCE_OWNER_UNAVAILABLE'|'UNSUPPORTED_ARTIFACT'|'PROVIDER_NOT_QUALIFIED';
/** Wire metadata echo only: neither the owner's opaque result nor authority. */
export type SavedPreviewOwnerSelection = {
  state:'unavailable';reason:string;generation:{selection:number;source:number};target:null;
} | {
  state:'identified';reason:'RETAINED_SAVED_VERSION_ONLY';generation:{selection:number;source:number};
  target:{source:{applicationId:string;page:WorkspaceIdentity;committedHash:string;nodeId:string};implementation:{componentId:string;packageId:string;packageVersion:string;importPath:string;exportName:string;definitionRevision:string|null};context:{subjectId:string;sessionRevision:string}};
};
export interface SavedPreviewSelection {
  subjectId:string;sessionRevision:string;applicationId:string;applicationKey:string;
  identity:WorkspaceIdentity;kind:string;dirty:boolean;
  sourceNode?:{nodeId:string;savedRevision:string};
  ownerSelection?:SavedPreviewOwnerSelection;
}
export interface SavedPreviewRequest {schema:'saved-preview-request-v1';generation:number;trigger:'explicit-check';selection:SavedPreviewSelection|null}
export interface SavedPreviewUnavailable {kind:'unavailable';code:SavedPreviewUnavailableCode}
export class SavedPreviewRequestError extends Error {constructor(){super('SAVED_PREVIEW_REQUEST_INVALID');}}
function invalid():never {throw new SavedPreviewRequestError();}
function fields(v:unknown,required:string[],optional:string[]=[]):asserts v is Record<string,unknown> {
  if(!v||typeof v!=='object'||Array.isArray(v)||![Object.prototype,null].includes(Object.getPrototypeOf(v)))invalid();
  const d=Object.getOwnPropertyDescriptors(v);
  if(Reflect.ownKeys(v).some(k=>typeof k!=='string')||Object.entries(d).some(([k,p])=>!p.enumerable||!('value'in p)||![...required,...optional].includes(k))||required.some(k=>!Object.hasOwn(d,k)))invalid();
}
const text=(v:unknown):v is string=>typeof v==='string'&&v.length>0;
export function parseSavedPreviewSelection(value:unknown):SavedPreviewSelection {
  fields(value,['subjectId','sessionRevision','applicationId','applicationKey','identity','kind','dirty'],['sourceNode','ownerSelection']);
  for(const k of ['subjectId','sessionRevision','applicationId','applicationKey','kind'])if(!text(value[k]))invalid();
  if(typeof value.dirty!=='boolean')invalid();
  fields(value.identity,['owner','format'],['id','repairLocator']);const identity=value.identity;
  fields(identity.owner,['kind','id'],['revision']);const owner=identity.owner;
  if(!['application','platform','package'].includes(String(owner.kind))||!text(owner.id)||owner.revision!==undefined&&!text(owner.revision))invalid();
  if(!['visual','generic','composition','automation','package','legacy'].includes(String(identity.format)))invalid();
  if(!!identity.id===!!identity.repairLocator||identity.id!==undefined&&!text(identity.id)||identity.repairLocator!==undefined&&!text(identity.repairLocator))invalid();
  if(owner.kind==='application'&&owner.id!==value.applicationId)invalid();
  if(value.sourceNode!==undefined){fields(value.sourceNode,['nodeId','savedRevision']);if(!text(value.sourceNode.nodeId)||!text(value.sourceNode.savedRevision))invalid();}
  if(value.ownerSelection!==undefined){
    fields(value.ownerSelection,['state','reason','generation','target']);const selected=value.ownerSelection;
    fields(selected.generation,['selection','source']);
    for(const v of Object.values(selected.generation))if(!Number.isSafeInteger(v)||Number(v)<0)invalid();
    if(selected.state==='unavailable'){
      if(!text(selected.reason)||selected.target!==null||value.sourceNode!==undefined)invalid();
    }else if(selected.state==='identified'){
      if(selected.reason!=='RETAINED_SAVED_VERSION_ONLY'||value.kind!=='page')invalid();
      fields(selected.target,['source','implementation','context']);const target=selected.target;
      fields(target.source,['applicationId','page','committedHash','nodeId']);const source=target.source;
      fields(source.page,['owner','format','id']);fields(source.page.owner,['kind','id'],['revision']);
      if(source.page.format!=='visual'||source.page.owner.kind!=='application'||!text(source.page.id)||!text(source.page.owner.id)||source.page.owner.revision!==undefined&&!text(source.page.owner.revision))invalid();
      if(source.applicationId!==value.applicationId||source.page.owner.id!==value.applicationId||workspaceIdentityKey(source.page as unknown as WorkspaceIdentity)!==workspaceIdentityKey(identity as unknown as WorkspaceIdentity))invalid();
      if(!text(source.committedHash)||!/^([a-f0-9]{64})$/.test(source.committedHash)||!text(source.nodeId))invalid();
      fields(target.context,['subjectId','sessionRevision']);if(target.context.subjectId!==value.subjectId||target.context.sessionRevision!==value.sessionRevision)invalid();
      fields(target.implementation,['componentId','packageId','packageVersion','importPath','exportName','definitionRevision']);
      for(const [k,v]of Object.entries(target.implementation))if(k==='definitionRevision'?v!==null&&!text(v):!text(v))invalid();
      fields(value.sourceNode,['nodeId','savedRevision']);
      if(value.sourceNode.nodeId!==source.nodeId||value.sourceNode.savedRevision!==source.committedHash)invalid();
    }else invalid();
  }
  const result=JSON.parse(JSON.stringify(value)) as SavedPreviewSelection;workspaceIdentityKey(result.identity);return result;
}
export function parseSavedPreviewRequest(value:unknown):SavedPreviewRequest {
  fields(value,['schema','generation','trigger','selection']);
  if(value.schema!=='saved-preview-request-v1'||value.trigger!=='explicit-check'||!Number.isSafeInteger(value.generation)||Number(value.generation)<0)invalid();
  return {schema:'saved-preview-request-v1',generation:value.generation as number,trigger:'explicit-check',selection:value.selection===null?null:parseSavedPreviewSelection(value.selection)};
}
export function savedPreviewSelectionKey(s:SavedPreviewSelection):string {
  return JSON.stringify([s.subjectId,s.sessionRevision,s.applicationId,s.applicationKey,workspaceIdentityKey(s.identity),s.kind,s.sourceNode?.nodeId??null,s.sourceNode?.savedRevision??null,s.ownerSelection??null]);
}
/** Local readiness facts only. No authority/source/service call and no available outcome. */
export function productionSavedPreviewUnavailable(request:SavedPreviewRequest):SavedPreviewUnavailable {
  const s=parseSavedPreviewRequest(request).selection;
  const code:SavedPreviewUnavailableCode=!s?'NO_SELECTION':s.identity.repairLocator?'REPAIR_ONLY_IDENTITY':s.identity.owner.kind==='package'||s.identity.format==='package'?'PACKAGE_DEFINITION_ONLY':
    s.identity.format!=='visual'||!['page','shell','component','form'].includes(s.kind)?'UNSUPPORTED_ARTIFACT':s.ownerSelection?.state==='unavailable'?'SOURCE_OWNER_UNAVAILABLE':!s.sourceNode?'SAVED_NODE_UNRESOLVED':'PROVIDER_NOT_QUALIFIED';
  return {kind:'unavailable',code};
}
export const savedPreviewUnavailableText:Record<SavedPreviewUnavailableCode,string>={
  NO_SELECTION:'No selected artifact.',REPAIR_ONLY_IDENTITY:'Repair-only identity cannot identify a saved Preview.',UNRESOLVED_IDENTITY:'Original selection identity is unresolved.',
  PACKAGE_DEFINITION_ONLY:'Installed package Definition selected; no saved instance selected.',SAVED_NODE_UNRESOLVED:'Saved source node is unresolved; no node was inferred.',
  UNSUPPORTED_ARTIFACT:'This artifact is unsupported for saved Preview.',PROVIDER_NOT_QUALIFIED:'Production capture/provider is not qualified.',
  SOURCE_OWNER_UNAVAILABLE:'The source owner has no eligible retained saved Card target.',
};
