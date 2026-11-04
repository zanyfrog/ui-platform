import { canonical, digest, digestBytes, normalizeManifest, validateBinding, validateEpoch, ContractError } from './model.ts';
import type { Binding, Epoch, Manifest, Limits } from './model.ts';

export type Refusal = 'busy' | 'owner-unresolved' | 'recovery-required' | 'missing' | 'denied' | 'ambiguous' |
  'changed' | 'owner-changed' | 'authority-changed' | 'unsupported' | 'cycle' | 'expired' | 'superseded' |
  'limit' | 'malformed' | 'disposed' | 'acquisition-error' | 'clock-invalid';
export type RoleKey = { identity: string; role: string };
export type IdentityObservation = { identity: string; owner: Binding['owner']; permanentId: string };
export type ReadObservation = {
  admission: 'entered'; binding: Binding; epoch: Epoch; allowed: boolean; ownerValidity: string;
  selectedRevision: string; nativeClosure: 'admitted' | 'unsupported'; manifest: Manifest;
  identities: IdentityObservation[];
  roleOutcomes: (RoleKey & { status: 'read' | 'missing' | 'denied' | 'unreadable' })[];
  collections: { scope: string; members: { identity: string; ordinal: number }[] }[];
};
export type Observation = { metadata: ReadObservation; bytes: ReadonlyMap<string, Uint8Array> } |
  { refusal: 'busy' | 'owner-unresolved' | 'recovery-required' };
export type AcquisitionLimits = { manifest: Limits; maxRoles: number; maxEdges: number; maxMembers: number; maxIdentities: number };
export type CaptureContract = { binding: Binding; epoch: Epoch; ownerValidity: string; selectedRevision: string;
  requiredRoles: RoleKey[]; requiredCollections: string[]; limits: AcquisitionLimits };
export type Ticket = { sequence: number; generation: number };
export type Candidate = { binding: Binding; epoch: Epoch; manifest: Manifest; bytes: Map<string,Uint8Array>;
  identities: IdentityObservation[]; orderedMembership: ReadObservation['collections'];
  contentId: string; observationId: string; expires: number };
export type Result = { kind: 'first-pass' } | { kind: 'complete'; candidate: Candidate } | { kind: 'refused'; reason: Refusal };
type Captured = { metadata: ReadObservation; bytes: Map<string,Uint8Array>; fingerprint: string };
class Refused extends Error { reason: Refusal; constructor(reason: Refusal) { super(reason); this.reason=reason; } }
const reject = (reason: Refusal): never => { throw new Refused(reason); };
const need = (value: unknown, reason: Refusal) => { if(!value) reject(reason); };
const clone = <T>(v:T):T => JSON.parse(canonical(v));
const exact = (v: object, fields: string[]) => {
  need(v && typeof v==='object' && !Array.isArray(v),'malformed');
  need(Object.keys(v).sort().join('|')===fields.sort().join('|'),'malformed');
};
const nonempty = (v: unknown) => typeof v==='string' && v.length>0;
const integer = (v: unknown) => Number.isSafeInteger(v) && Number(v)>=0;
const key = (r: RoleKey) => canonical([r.identity,r.role]);
function distinct(values: string[]) { need(new Set(values).size===values.length,'ambiguous'); }
function sorted<T>(values:T[]):T[] { return values.sort((a,b)=>canonical(a)<canonical(b)?-1:canonical(a)>canonical(b)?1:0); }
function mapError(error: unknown): Refusal {
  if(error instanceof Refused) return error.reason;
  if(error instanceof ContractError && error.code==='OVER_LIMIT') return 'limit';
  return 'malformed';
}
function copyCandidate(c:Candidate):Candidate {
  return {...clone({binding:c.binding,epoch:c.epoch,manifest:c.manifest,identities:c.identities,orderedMembership:c.orderedMembership,contentId:c.contentId,observationId:c.observationId,expires:c.expires}),bytes:new Map([...c.bytes].map(([id,b])=>[id,new Uint8Array(b)]))};
}

/** Observation labels/answers only; never performs real graph or source acquisition. */
export class AcquisitionModel {
  private contract: CaptureContract;
  private clock: ()=>number;
  private acquire: (phase:'first'|'validation')=>Observation|Promise<Observation>;
  private authority: ()=>{binding:Binding;epoch:Epoch;allowed:boolean};
  private generation=0; private sequence=0; private lastTime=-1; private disposed=false; private revoked=false;
  private pending?: {ticket:Ticket;expires:number;first?:Captured;inFlight:boolean};
  private previous?:Candidate; private lastRefusal?:Refusal;
  constructor(contract:CaptureContract, clock:()=>number,
    acquire:(phase:'first'|'validation')=>Observation|Promise<Observation>,
    authority:()=>{binding:Binding;epoch:Epoch;allowed:boolean}) {
    this.contract=clone(contract); this.clock=clock; this.acquire=acquire; this.authority=authority;
    try {
      const c=this.contract; exact(c,['binding','epoch','ownerValidity','selectedRevision','requiredRoles','requiredCollections','limits']);
      validateBinding(c.binding); validateEpoch(c.epoch,c.binding);
      need(nonempty(c.ownerValidity)&&nonempty(c.selectedRevision),'malformed');
      exact(c.limits,['manifest','maxRoles','maxEdges','maxMembers','maxIdentities']);
      exact(c.limits.manifest,['maxBytes','maxResources','maxCaptures','maxConcurrentDeliveries','maxReplayEvents']);
      need(Object.values(c.limits).filter(v=>typeof v==='number').every(v=>integer(v)&&v>0) && Object.values(c.limits.manifest).every(v=>integer(v)&&v>0),'limit');
      need(Array.isArray(c.requiredRoles)&&c.requiredRoles.length>0 && Array.isArray(c.requiredCollections),'malformed');
      for(const r of c.requiredRoles) { exact(r,['identity','role']); need(nonempty(r.identity)&&nonempty(r.role),'malformed'); }
      distinct(c.requiredRoles.map(key)); distinct(c.requiredCollections); need(c.requiredCollections.every(nonempty),'malformed');
      need(c.requiredRoles.length<=c.limits.maxRoles && c.requiredCollections.length<=c.limits.maxMembers,'limit');
    } catch(e) { throw new ContractError('ACQUISITION_'+mapError(e).toUpperCase()); }
  }
  private now() {
    const t=this.clock(); if(!integer(t)||t<this.lastTime) { this.clear(); reject('clock-invalid'); }
    this.lastTime=t; return t;
  }
  private clear() { this.generation++; this.pending=undefined; this.previous=undefined; }
  private checkAuthority() {
    need(!this.disposed,'disposed');need(!this.revoked,'authority-changed'); const now=this.now();
    if(now>=this.contract.epoch.validUntil) { this.clear(); reject('expired'); }
    let a:ReturnType<AcquisitionModel['authority']>;
    try { a=clone(this.authority()); validateBinding(a.binding); validateEpoch(a.epoch,a.binding); }
    catch { this.clear();this.revoked=true; reject('authority-changed'); }
    if(!a!.allowed||canonical(a!.binding)!==canonical(this.contract.binding)||canonical(a!.epoch)!==canonical(this.contract.epoch)) { this.clear();this.revoked=true; reject('authority-changed'); }
    return now;
  }
  private ticket(ticket:Ticket) {
    need(this.pending && canonical(ticket)===canonical(this.pending.ticket),'superseded');
    if(this.now()>=this.pending!.expires) { this.pending=undefined; reject('expired'); }
  }
  begin(expires:number):Ticket {
    try { const now=this.checkAuthority();need(integer(expires)&&expires>now&&expires<=this.contract.epoch.validUntil,'expired');
      const ticket={sequence:++this.sequence,generation:this.generation};this.pending={ticket,expires,inFlight:false};this.lastRefusal=undefined;return clone(ticket);
    } catch(e) { throw new ContractError('ACQUISITION_'+mapError(e).toUpperCase()); }
  }
  private capture(input:Observation):Captured {
    need(input && typeof input==='object' && [Object.prototype,null].includes(Object.getPrototypeOf(input)),'malformed');
    const properties=Object.getOwnPropertyDescriptors(input);
    need(Reflect.ownKeys(input).every(k=>typeof k==='string')&&Object.values(properties).every(d=>'value' in d&&d.enumerable),'malformed');
    if('refusal' in input) { exact(input,['refusal']); need(['busy','owner-unresolved','recovery-required'].includes(input.refusal),'malformed');return reject(input.refusal); }
    exact(input,['metadata','bytes']);const metadata=clone(input.metadata),m=metadata.manifest,c=this.contract;
    exact(metadata,['admission','binding','epoch','allowed','ownerValidity','selectedRevision','nativeClosure','manifest','identities','roleOutcomes','collections']);
    need(metadata.admission==='entered','malformed');
    validateBinding(metadata.binding);validateEpoch(metadata.epoch,metadata.binding);
    if(canonical(metadata.binding)!==canonical(c.binding)||canonical(metadata.epoch)!==canonical(c.epoch)||metadata.allowed!==true) reject('authority-changed');
    need(metadata.ownerValidity===c.ownerValidity,'owner-changed');
    need(metadata.selectedRevision===c.selectedRevision && m.selectedRevision===c.selectedRevision,'changed');
    need(metadata.nativeClosure==='admitted','unsupported');
    need(m.applicationId===c.binding.applicationId&&m.selectedIdentity===c.binding.selectedIdentity&&canonical(m.owner)===canonical(c.binding.owner),'owner-changed');
    need(Array.isArray(metadata.identities)&&Array.isArray(metadata.collections)&&Array.isArray(metadata.roleOutcomes)&&Array.isArray(m.roles)&&Array.isArray(m.dependencies),'malformed');
    need(metadata.identities.length<=c.limits.maxIdentities&&m.roles.length<=c.limits.maxRoles&&m.dependencies.length<=c.limits.maxEdges,'limit');
    distinct(metadata.identities.map(i=>i.identity));
    for(const i of metadata.identities) {
      exact(i,['identity','owner','permanentId']);exact(i.owner,['kind','id']);
      need(nonempty(i.identity)&&nonempty(i.permanentId)&&nonempty(i.owner.id)&&['application','platform','package'].includes(i.owner.kind),'malformed');
    }
    distinct(metadata.identities.map(i=>canonical([i.owner,i.permanentId])));
    const identitySet=new Set(metadata.identities.map(i=>i.identity));
    need(identitySet.has(c.binding.selectedIdentity),'missing');
    need(canonical(metadata.identities.find(i=>i.identity===c.binding.selectedIdentity)!.owner)===canonical(c.binding.owner),'owner-changed');
    for(const r of metadata.roleOutcomes) {
      exact(r,['identity','role','status']);need(nonempty(r.identity)&&nonempty(r.role),'malformed');
      need(['read','missing','denied','unreadable'].includes(r.status),'malformed');
      if(r.status!=='read') reject(r.status==='denied'?'denied':'missing');
    }
    distinct(metadata.roleOutcomes.map(key));distinct(m.roles.map(key));
    const actualRoles=new Set(m.roles.map(key));
    need(c.requiredRoles.every(r=>actualRoles.has(key(r))),'missing');
    need(canonical([...actualRoles].sort())===canonical(metadata.roleOutcomes.map(key).sort()),'missing');
    need(m.roles.every(r=>identitySet.has(r.identity)) && metadata.identities.every(i=>m.roles.some(r=>r.identity===i.identity)),'missing');
    const edges=new Map([...identitySet].map(id=>[id,[] as string[]]));
    for(const d of m.dependencies) { need(identitySet.has(d.from)&&identitySet.has(d.to),'missing');edges.get(d.from)!.push(d.to); }
    const visiting=new Set<string>(),visited=new Set<string>();
    const visit=(id:string)=>{need(!visiting.has(id),'cycle');if(visited.has(id))return;visiting.add(id);for(const next of edges.get(id)!)visit(next);visiting.delete(id);visited.add(id);};
    visit(c.binding.selectedIdentity);need(visited.size===identitySet.size,'unsupported');
    distinct(metadata.collections.map(g=>g.scope));let members=0;
    need(c.requiredCollections.every(scope=>metadata.collections.some(g=>g.scope===scope)),'missing');
    need(metadata.collections.length===m.membership.length,'missing');
    for(const group of metadata.collections) {
      exact(group,['scope','members']);need(nonempty(group.scope)&&Array.isArray(group.members),'malformed');
      members+=group.members.length;need(members<=c.limits.maxMembers,'limit');
      distinct(group.members.map(v=>v.identity));distinct(group.members.map(v=>String(v.ordinal)));
      for(const member of group.members) { exact(member,['identity','ordinal']);need(identitySet.has(member.identity),'missing');need(integer(member.ordinal),'malformed'); }
      group.members.sort((a,b)=>a.ordinal-b.ordinal);
      const membership=m.membership.find(g=>g.scope===group.scope);need(membership&&canonical([...membership.identities].sort())===canonical(group.members.map(v=>v.identity).sort()),'missing');
    }
    metadata.manifest=normalizeManifest(m,c.limits.manifest);
    metadata.identities=sorted(metadata.identities);metadata.roleOutcomes=sorted(metadata.roleOutcomes);metadata.collections=sorted(metadata.collections);
    need(input.bytes instanceof Map && input.bytes.size===m.resources.length,'missing');const bytes=new Map<string,Uint8Array>();
    for(const ref of m.resources) {const b=input.bytes.get(ref.id);need(b instanceof Uint8Array&&b.length===ref.byteLength&&digestBytes(b)===ref.sha256,'changed');bytes.set(ref.id,new Uint8Array(b!));}
    return {metadata,bytes,fingerprint:digest(metadata)};
  }
  private fail(ticket:Ticket,e:unknown):Result {
    const reason=mapError(e);this.lastRefusal=reason;
    // A late/superseded call must not cancel the newer candidate.
    if(this.pending&&canonical(ticket)===canonical(this.pending.ticket))this.pending=undefined;
    if(reason==='authority-changed'||reason==='owner-changed'||reason==='clock-invalid'){this.clear();this.revoked=true;}
    return {kind:'refused',reason};
  }
  async first(ticket:Ticket):Promise<Result> { return this.observe(ticket,'first'); }
  async validate(ticket:Ticket):Promise<Result> { return this.observe(ticket,'validation'); }
  private async observe(ticket:Ticket,phase:'first'|'validation'):Promise<Result> {
    try {
      this.checkAuthority();this.ticket(ticket);need(!this.pending!.inFlight,'superseded');
      need(phase==='first'?!this.pending!.first:!!this.pending!.first,'malformed');
      this.pending!.inFlight=true;
      let input:Observation;try {input=await this.acquire(phase);}catch {reject('acquisition-error');}
      this.checkAuthority();this.ticket(ticket);const capture=this.capture(input!);this.pending!.inFlight=false;
      if(phase==='first') {this.pending!.first=capture;return {kind:'first-pass'};}
      const first=this.pending!.first!;need(first.fingerprint===capture.fingerprint,'changed');
      const content={schema:'acquisition-content-model-v1',manifest:first.metadata.manifest,identities:first.metadata.identities,orderedMembership:first.metadata.collections};
      const candidate:Candidate={binding:clone(this.contract.binding),epoch:clone(this.contract.epoch),manifest:clone(content.manifest),
        identities:clone(content.identities),orderedMembership:clone(content.orderedMembership),
        bytes:new Map([...first.bytes].map(([id,b])=>[id,new Uint8Array(b)])),contentId:digest(content),observationId:first.fingerprint,expires:this.pending!.expires};
      this.previous=candidate;this.pending=undefined;return {kind:'complete',candidate:copyCandidate(candidate)};
    } catch(e) {return this.fail(ticket,e);}
  }
  revoke() {if(!this.disposed){this.clear();this.revoked=true;this.lastRefusal='authority-changed';}}
  dispose() {this.clear();this.disposed=true;this.lastRefusal='disposed';}
  snapshot() {
    if(!this.disposed){try{this.checkAuthority();}catch(e){this.lastRefusal=mapError(e);}}
    if(this.previous && this.previous.expires<=this.lastTime)this.previous=undefined;
    return {generation:this.generation,pending:this.pending?clone(this.pending.ticket):null,previous:this.previous?copyCandidate(this.previous):null,lastRefusal:this.lastRefusal??null,disposed:this.disposed};
  }
}
