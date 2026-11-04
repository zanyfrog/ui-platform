import { createHash } from 'node:crypto';

/** Authored-data model only. No production authority, transport or scheduler. */
export class ContractError extends Error {
  readonly code: string;
  constructor(code: string) { super(code); this.code = code; this.name = 'ContractError'; }
}
const fail = (code: string): never => { throw new ContractError(code); };
const requireThat = (ok: unknown, code: string) => { if (!ok) fail(code); };
export function canonical(value: unknown): string {
  const active = new Set<object>();
  function visit(v: unknown): string {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
    if (typeof v === 'number') {
      requireThat(Number.isFinite(v) && (!Number.isInteger(v) || Number.isSafeInteger(v)), 'NUMBER_INVALID');
      return JSON.stringify(v);
    }
    if (typeof v !== 'object') return fail('VALUE_UNSUPPORTED');
    requireThat(!active.has(v), 'CYCLE'); active.add(v);
    const descriptors = Object.getOwnPropertyDescriptors(v);
    requireThat(Reflect.ownKeys(v).every(k => typeof k === 'string'), 'KEY_UNSUPPORTED');
    let result: string;
    if (Array.isArray(v)) {
      requireThat(Object.keys(descriptors).length === v.length + 1, 'ARRAY_INVALID');
      result = '[' + Array.from({ length: v.length }, (_, i) => {
        const d = descriptors[String(i)]; requireThat(d && 'value' in d && d.enumerable, 'ARRAY_INVALID');
        return visit(d.value);
      }).join(',') + ']';
    } else {
      requireThat([Object.prototype, null].includes(Object.getPrototypeOf(v)), 'PROTOTYPE_UNSUPPORTED');
      result = '{' + Object.keys(descriptors).sort().map(k => {
        const d = descriptors[k]; requireThat('value' in d && d.enumerable, 'PROPERTY_UNSUPPORTED');
        return JSON.stringify(k) + ':' + visit(d.value);
      }).join(',') + '}';
    }
    active.delete(v); return result;
  }
  return visit(value);
}
export const digestBytes = (bytes: Uint8Array | string) => 'sha256:' + createHash('sha256').update(bytes).digest('hex');
export const digest = (value: unknown) => digestBytes(canonical(value));
const copy = <T>(v: T): T => JSON.parse(canonical(v));
const text = (v: unknown) => typeof v === 'string' && v.length > 0;
const integer = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const exact = (v: object, keys: string[]) => {
  requireThat(v !== null && typeof v === 'object' && !Array.isArray(v), 'INPUT_INVALID');
  requireThat(Object.keys(v).sort().join('|') === keys.sort().join('|'), 'FIELDS_UNSUPPORTED');
};
const revision = (v: unknown): bigint => {
  requireThat(typeof v === 'string' && /^(0|[1-9][0-9]*)$/.test(v), 'REVISION_INVALID'); return BigInt(v as string);
};
export type Cursor = { authorityId: string; lineage: string; revision: string };
export type Binding = { authorityId: string; subjectId: string; sessionHandle: string; sessionRevision: string;
  applicationId: string; owner: { kind: 'application' | 'platform' | 'package'; id: string }; selectedIdentity: string };
export type Epoch = { policy: Cursor; sessionRevision: string; ownerRevision: string; scopeDigest: string; validUntil: number };
export function validateCursor(c: Cursor) {
  copy(c); exact(c, ['authorityId', 'lineage', 'revision']);
  requireThat(text(c.authorityId) && text(c.lineage), 'CURSOR_INVALID'); revision(c.revision);
}
export function validateBinding(b: Binding) {
  copy(b); exact(b, ['authorityId', 'subjectId', 'sessionHandle', 'sessionRevision', 'applicationId', 'owner', 'selectedIdentity']);
  exact(b.owner, ['kind', 'id']);
  requireThat(Object.entries(b).filter(([k]) => k !== 'owner').every(([,v]) => text(v)) &&
    ['application', 'platform', 'package'].includes(b.owner.kind) && text(b.owner.id), 'BINDING_INVALID');
}
export function validateEpoch(e: Epoch, b: Binding) {
  copy(e); exact(e, ['policy', 'sessionRevision', 'ownerRevision', 'scopeDigest', 'validUntil']); validateCursor(e.policy);
  requireThat(e.policy.authorityId === b.authorityId && e.sessionRevision === b.sessionRevision && text(e.ownerRevision) &&
    /^sha256:[a-f0-9]{64}$/.test(e.scopeDigest) && integer(e.validUntil), 'EPOCH_INVALID');
}
export type ByteRef = { id: string; sha256: string; byteLength: number; mediaType: string };
export type Manifest = {
  schema: 'preview-capture-model-v1'; applicationId: string; owner: Binding['owner']; selectedIdentity: string; selectedRevision: string;
  roles: { identity: string; role: string; revision: string; resourceId: string }[];
  dependencies: { from: string; to: string; kind: string }[];
  membership: { scope: string; identities: string[] }[];
  packages: { name: string; version: string; activationRevision: string; manifestId: string; executableIds: string[]; resourceIds: string[] }[];
  composition: { routes: { ordinal: number; resourceId: string }[]; shells: string[];
    regions: { ordinal: number; resourceId: string }[]; themeIds: string[]; styleIds: string[]; assetIds: string[] };
  resources: ByteRef[]; rendererVersion: string; capabilityPolicyVersion: string;
};
export type Limits = { maxBytes: number; maxResources: number; maxCaptures: number; maxConcurrentDeliveries: number; maxReplayEvents: number };
function validateLimits(l: Limits) {
  copy(l); exact(l, ['maxBytes', 'maxResources', 'maxCaptures', 'maxConcurrentDeliveries', 'maxReplayEvents']);
  requireThat(Object.values(l).every(v => integer(v) && v > 0), 'LIMIT_INVALID');
}
function unique(values: string[], code = 'IDENTITY_CONFLICT'): string[] {
  requireThat(values.every(text) && new Set(values).size === values.length, code); return [...values].sort();
}
export function normalizeManifest(input: Manifest, limits: Limits): Manifest {
  try { return normalizeManifestData(input, limits); }
  catch (error) { if(error instanceof ContractError) throw error; return fail('INPUT_INVALID'); }
}
function normalizeManifestData(input: Manifest, limits: Limits): Manifest {
  validateLimits(limits); const m = copy(input);
  exact(m, ['schema','applicationId','owner','selectedIdentity','selectedRevision','roles','dependencies','membership','packages','composition','resources','rendererVersion','capabilityPolicyVersion']);
  requireThat(m.schema === 'preview-capture-model-v1', 'SCHEMA_UNSUPPORTED');
  requireThat([m.applicationId,m.selectedIdentity,m.selectedRevision,m.rendererVersion,m.capabilityPolicyVersion].every(text), 'MANIFEST_INVALID');
  exact(m.owner, ['kind','id']); requireThat(['application','platform','package'].includes(m.owner.kind) && text(m.owner.id), 'OWNER_INVALID');
  requireThat([m.roles,m.dependencies,m.membership,m.packages,m.resources].every(Array.isArray), 'MANIFEST_INVALID');
  unique(m.resources.map(r => r.id)); let total = 0;
  for (const r of m.resources) {
    exact(r,['id','sha256','byteLength','mediaType']); requireThat(/^sha256:[a-f0-9]{64}$/.test(r.sha256) && integer(r.byteLength) && text(r.mediaType), 'RESOURCE_INVALID');
    total += r.byteLength; requireThat(Number.isSafeInteger(total), 'OVER_LIMIT');
  }
  requireThat(total <= limits.maxBytes && m.resources.length <= limits.maxResources, 'OVER_LIMIT');
  const ids = new Set(m.resources.map(r => r.id)); const ref = (id: string) => requireThat(ids.has(id), 'RESOURCE_MISSING');
  unique(m.roles.map(r => canonical([r.identity,r.role])));
  const identities = new Set(m.roles.map(r => r.identity)); requireThat(identities.has(m.selectedIdentity), 'SELECTED_MISSING');
  for (const r of m.roles) { exact(r,['identity','role','revision','resourceId']); requireThat([r.identity,r.role,r.revision].every(text),'ROLE_INVALID'); ref(r.resourceId); }
  unique(m.dependencies.map(d => canonical(d)));
  for (const d of m.dependencies) { exact(d,['from','to','kind']); requireThat(identities.has(d.from) && identities.has(d.to) && text(d.kind),'DEPENDENCY_MISSING'); }
  unique(m.membership.map(g => g.scope));
  for (const g of m.membership) { exact(g,['scope','identities']); requireThat(Array.isArray(g.identities),'MEMBERSHIP_INVALID'); g.identities = unique(g.identities); requireThat(g.identities.every(id => identities.has(id)), 'MEMBERSHIP_FOREIGN'); }
  requireThat(m.membership.some(g => g.identities.includes(m.selectedIdentity)), 'MEMBERSHIP_MISSING');
  unique(m.packages.map(p => p.name));
  for (const p of m.packages) {
    exact(p,['name','version','activationRevision','manifestId','executableIds','resourceIds']); requireThat([p.name,p.version,p.activationRevision].every(text),'PACKAGE_INVALID');
    p.executableIds = unique(p.executableIds); p.resourceIds = unique(p.resourceIds); [p.manifestId,...p.executableIds,...p.resourceIds].forEach(ref);
  }
  exact(m.composition,['routes','shells','regions','themeIds','styleIds','assetIds']);
  for (const key of ['routes','regions'] as const) {
    unique(m.composition[key].map(r => String(r.ordinal)));
    for(const r of m.composition[key]) { exact(r,['ordinal','resourceId']); requireThat(integer(r.ordinal),'ORDINAL_INVALID'); ref(r.resourceId); }
    m.composition[key].sort((a,b) => a.ordinal-b.ordinal);
  }
  m.composition.shells = unique(m.composition.shells); requireThat(m.composition.shells.every(id => identities.has(id)), 'SHELL_MISSING');
  for(const key of ['themeIds','styleIds','assetIds'] as const) { m.composition[key] = unique(m.composition[key]); m.composition[key].forEach(ref); }
  const sort = <T>(a: T[]) => a.sort((x,y) => canonical(x) < canonical(y) ? -1 : canonical(x) > canonical(y) ? 1 : 0);
  sort(m.roles); sort(m.dependencies); sort(m.membership); sort(m.packages); sort(m.resources);
  return m;
}
export const manifestDigest = (m: Manifest, l: Limits) => digest(normalizeManifest(m,l));
export type Answer = { binding: Binding; epoch: Epoch; allowed: boolean };
export type Event = { channelId: string; generation: string; sequence: string; cursor: Cursor;
  kind: 'health' | 'policy' | 'session' | 'owner' | 'expiry' | 'reset-required' | 'unhealthy'; healthUntil: number };
type Capture = { content: Manifest; bytes: Map<string,Uint8Array>; digest: string; binding: Binding; epoch: Epoch; expires: number; generation: number };
type Permit = { capture: string; resource: string; generation: number; sent: boolean; canceled: boolean };
export class PreviewModel {
  private clock: () => number;
  private authority: () => Answer;
  private original: Binding;
  private limits: Limits;
  private epoch?: Epoch;
  private channel = ''; private channelGeneration = ''; private cursor?: Cursor; private sequence = 0n;
  private replay = new Map<string,string>(); private healthUntil = 0; private lastTime = -1;
  private captures = new Map<string,Capture>(); private permits = new Map<number,Permit>(); private nextPermit = 0;
  private nextCandidate = 0; private pending?: number; private current?: string;
  private generation = 0; private state = 'empty'; private healthy = false; private disposed = false;
  constructor(binding: Binding, limits: Limits, clock: () => number, authority: () => Answer) {
    this.clock = clock; this.authority = authority;
    validateBinding(binding); validateLimits(limits); this.original = copy(binding); this.limits = copy(limits);
  }
  private now() { const t = this.clock(); if(!integer(t) || t < this.lastTime) { this.hide('uncertain'); fail('CLOCK_INVALID'); } this.lastTime=t; return t; }
  private live() { requireThat(!this.disposed,'DISPOSED'); }
  private hide(state: string) {
    this.generation++; this.healthy=false; this.pending=undefined; this.current=undefined; this.captures.clear();
    for(const p of this.permits.values()) p.canceled=true;
    this.permits.clear(); this.state=state;
  }
  private check() {
    this.live(); const t = this.now();
    if(!this.epoch || !this.healthy) return fail('AUTHORITY_UNHEALTHY');
    if(t >= this.healthUntil || t >= this.epoch.validUntil) { this.hide('expired'); fail('EXPIRED'); }
    let answer: Answer;
    try { answer = copy(this.authority()); validateBinding(answer.binding); validateEpoch(answer.epoch,answer.binding); }
    catch { this.hide('uncertain'); return fail('AUTHORITY_UNAVAILABLE'); }
    if(!answer.allowed || canonical(answer.binding)!==canonical(this.original) || canonical(answer.epoch)!==canonical(this.epoch)) {
      this.hide('invalidated'); fail('AUTHORITY_CHANGED');
    }
    return t;
  }
  reconcile(channel: string, channelGeneration: string, cursor: Cursor, healthUntil: number) {
    this.live(); this.hide('uncertain'); const now=this.now(); validateCursor(cursor);
    const a=copy(this.authority()); validateBinding(a.binding); validateEpoch(a.epoch,a.binding);
    requireThat(a.allowed && canonical(a.binding)===canonical(this.original),'BINDING_DENIED');
    requireThat(canonical(cursor)===canonical(a.epoch.policy),'CURSOR_STALE');
    requireThat(text(channel) && text(channelGeneration) && integer(healthUntil) && healthUntil>now && a.epoch.validUntil>now,'EXPIRED');
    this.epoch=copy(a.epoch); this.cursor=copy(cursor); this.channel=channel; this.channelGeneration=channelGeneration;
    this.healthUntil=Math.min(healthUntil,a.epoch.validUntil); this.sequence=0n; this.replay.clear(); this.healthy=true; this.state='refresh-required';
  }
  receive(input: Event): 'accepted' | 'duplicate' {
    this.live();
    try {
      const event=copy(input);
      this.check(); exact(event,['channelId','generation','sequence','cursor','kind','healthUntil']); validateCursor(event.cursor);
      requireThat(event.channelId===this.channel && event.generation===this.channelGeneration,'CHANNEL_FOREIGN');
      requireThat(event.cursor.authorityId===this.cursor!.authorityId && event.cursor.lineage===this.cursor!.lineage,'LINEAGE_FOREIGN');
      const seq=revision(event.sequence), fingerprint=canonical(event);
      if(seq<=this.sequence) {
        requireThat(this.replay.get(event.sequence)===fingerprint,'REPLAY_CONFLICT'); return 'duplicate';
      }
      requireThat(seq===this.sequence+1n,'SEQUENCE_GAP');
      requireThat(revision(event.cursor.revision)>=revision(this.cursor!.revision),'CURSOR_STALE');
      requireThat(['health','policy','session','owner','expiry','reset-required','unhealthy'].includes(event.kind),'EVENT_UNSUPPORTED');
      if(event.kind!=='health' || revision(event.cursor.revision)>revision(this.cursor!.revision)) { this.hide(event.kind==='reset-required'?'reset-required':'invalidated'); return 'accepted'; }
      requireThat(integer(event.healthUntil) && event.healthUntil>this.now(),'HEALTH_EXPIRED');
      this.sequence=seq; this.cursor=copy(event.cursor); this.healthUntil=Math.min(event.healthUntil,this.epoch!.validUntil);
      this.replay.set(event.sequence,fingerprint); while(this.replay.size>this.limits.maxReplayEvents) this.replay.delete(this.replay.keys().next().value!);
      return 'accepted';
    } catch(error) { this.hide('uncertain'); throw error; }
  }
  disconnect() { this.live(); this.hide('disconnected'); }
  invalidate() { this.live(); this.hide('invalidated'); }
  stale() { this.check(); if(this.current) this.state='stale'; }
  refresh() { this.check(); this.pending=++this.nextCandidate; this.state=this.current?'stale-pending':'capturing'; return { candidate:this.pending,generation:this.generation }; }
  complete(ticket: {candidate:number;generation:number}, manifest: Manifest, bytes: ReadonlyMap<string,Uint8Array>, expires: number) {
    const now=this.check(); requireThat(ticket.generation===this.generation && ticket.candidate===this.pending,'CANDIDATE_SUPERSEDED');
    const m=normalizeManifest(manifest,this.limits);
    requireThat(m.applicationId===this.original.applicationId && m.selectedIdentity===this.original.selectedIdentity && canonical(m.owner)===canonical(this.original.owner),'CAPTURE_BINDING');
    requireThat(integer(expires) && expires>now && expires<=this.epoch!.validUntil,'EXPIRED');
    const captured=new Map<string,Uint8Array>(); requireThat(bytes.size===m.resources.length,'RESOURCE_CONFLICT');
    for(const r of m.resources) {
      const b=bytes.get(r.id); requireThat(b instanceof Uint8Array && b.length===r.byteLength && digestBytes(b)===r.sha256,'RESOURCE_DIGEST'); captured.set(r.id,new Uint8Array(b!));
    }
    requireThat(this.captures.size<this.limits.maxCaptures,'OVER_LIMIT');
    const handle='model-capture-'+ticket.candidate;
    this.captures.set(handle,{content:m,bytes:captured,digest:digest(m),binding:copy(this.original),epoch:copy(this.epoch!),expires,generation:this.generation});
    this.current=handle; this.pending=undefined; this.state='ready'; return {handle,contentId:digest(m)};
  }
  failed(ticket: {candidate:number;generation:number}) {
    this.check(); requireThat(ticket.generation===this.generation && ticket.candidate===this.pending,'CANDIDATE_SUPERSEDED');
    this.pending=undefined; this.state=this.current?'stale':'empty';
  }
  prepare(handle: string, resource: string, expectedDigest: string, binding: Binding, epoch: Epoch) {
    const now=this.check(); const c=this.captures.get(handle); requireThat(c,'CAPTURE_UNKNOWN');
    if(c!.expires<=now) { this.hide('expired'); fail('EXPIRED'); }
    requireThat(canonical(binding)===canonical(c!.binding) && canonical(epoch)===canonical(c!.epoch),'REPLAY_DENIED');
    const ref=c!.content.resources.find(r=>r.id===resource); requireThat(ref && ref.sha256===expectedDigest,'RESOURCE_DENIED');
    requireThat(this.permits.size<this.limits.maxConcurrentDeliveries,'OVER_LIMIT');
    const permit=++this.nextPermit; this.permits.set(permit,{capture:handle,resource,generation:this.generation,sent:false,canceled:false}); return permit;
  }
  send(permit: number) {
    this.check(); const p=this.permits.get(permit); requireThat(p && !p.canceled && !p.sent && p.generation===this.generation,'PERMIT_INVALID');
    const c=this.captures.get(p!.capture); if(!c || c.expires<=this.now()) { this.hide('expired'); fail('EXPIRED'); }
    p!.sent=true; this.permits.delete(permit); return new Uint8Array(c!.bytes.get(p!.resource)!);
  }
  snapshot() {
    if(!this.disposed && this.healthy) { try { this.check(); } catch { /* State already fail-closed. */ } }
    if(this.current && this.captures.get(this.current)!.expires<=this.now()) this.hide('expired');
    return {state:this.state,generation:this.generation,visible:!!this.current,interactive:this.state==='ready',pending:this.pending??null,captures:this.captures.size,permits:this.permits.size};
  }
  dispose() { if(!this.disposed) { this.hide('disposed'); this.disposed=true; } }
}
