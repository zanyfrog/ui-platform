import { realpathSync } from "node:fs";
const physical=process.env.UI_PLATFORM_DATA_PHYSICAL_ROOT,original=process.env.UI_PLATFORM_DATA_ORIGINAL_ROOT;
if(!physical||!original||realpathSync('.')!==realpathSync(physical)||realpathSync(physical)===realpathSync(original))throw Error('PHYSICAL_ISOLATION_REQUIRED');
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SecurityDefinitionStore } from "../src/wp1/store.js";
import { SecurityDefinitionService } from "../src/wp1/service.js";
import { runSecurityCli } from "../src/wp1/cli.js";
import { securityChecksum } from "../src/wp1/validation.js";
import type { SecurityDocument, SecurityRecord, SecurityResourceRef, SecurityScope } from "../src/wp1/models.js";
import { SecurityAuthorizationEvaluator } from "../src/wp2/evaluator.js";
import { wp1StorePolicyAuthority } from "../src/wp2/index.js";
import type { AccessRequest } from "../src/wp2/types.js";
import { SecurityAdministrationService } from "../src/wp3/service.js";
import { initializeDevelopmentPlatformSecurity } from "../src/wp3/bootstrap.js";
import { runAdministrativeCli } from "../src/wp3/cli.js";
import type { AdministrationScopeAuthority } from "../src/wp3/types.js";

const roots: string[] = [], stores: SecurityDefinitionStore[] = [];
const observations:unknown[]=[];
afterAll(()=>writeFileSync('wp3-template-observations.json',JSON.stringify({scope:'Actual WP3/SQLite outcomes with isolated Data test identities and synchronous host binding fixture; not live operator qualification',observations},null,2)));
afterEach(() => { vi.restoreAllMocks();for (const store of stores.splice(0)) try { store.close(); } catch { /* closed */ } for (const p of roots.splice(0)) rmSync(p, { recursive: true, force: true }); });
const root: SecurityResourceRef = { authorityId: "resources", applicationId: null, kind: "system", id: "system" };
const app: SecurityResourceRef = { authorityId: "resources", applicationId: "app-a", kind: "application", id: "app-a" };
const dataset: SecurityResourceRef = { authorityId: "resources", applicationId: "app-a", kind: "dataset", id: "ds-a" };
const appScope: SecurityScope = { resource: app, descendants: true };
const systemScope: SecurityScope = { resource: root, descendants: true };
const owner = { kind: "application", applicationId: "app-a" } as const;
const document = (definition: SecurityRecord): SecurityDocument => ({ format: "ui-platform.security", formatVersion: 1, definition });
const makeRule = (id: string, permissionId: string, scope: SecurityScope, effect: "allow" | "deny" = "allow") => ({ id, permissionId, effect, scope });
const set = (id: string, rules: ReturnType<typeof makeRule>[] = [], includes: string[] = [], override = {}): SecurityRecord => ({ kind: "permission-set", id, key: id, name: id, owner, status: "active", rules, includes: includes.map(id => ({ id })), ...override });
const role = (id: string, setIds: string[], override = {}): SecurityRecord => ({ kind: "role", id, key: id, name: id, owner, status: "active", permissionSets: setIds.map(id => ({ id })), ...override });
const assignment = (id: string, userId: string, roleId: string, override = {}): SecurityRecord => ({ kind: "role-assignment", id, userId, roleId, scope: appScope, status: "active", startsAt: "2026-01-01T00:00:00Z", endsAt: null, ...override });
const member = (id: string, userId: string, groupId: string, override = {}): SecurityRecord => ({ kind: "group-membership", id, userId, groupId, applicationId: "app-a", status: "active", startsAt: null, endsAt: null, ...override });
const scopeAuthority: AdministrationScopeAuthority = {
  contains(ceiling, requested) {
    const a = ceiling.resource, b = requested.resource;
    if (a.authorityId !== b.authorityId) return false;
    if (a.kind === b.kind && a.id === b.id && a.applicationId === b.applicationId) return ceiling.descendants || !requested.descendants;
    if (!ceiling.descendants) return false;
    if (a.kind === "system") return true;
    if (a.kind === "application") return a.id === b.applicationId;
    if (a.kind === "dataset") return a.id === b.parentId;
    return false;
  },
  permitsPredicate(ids, predicate) { return ids.includes("template-1") && predicate.op === "true"; },
};
function records(options: { bob?: boolean; bobFuture?: boolean; bobExpiring?: boolean; alice?: boolean; deny?: boolean } = {}): SecurityRecord[] {
  const applicationAdminPermission: SecurityRecord = { kind: "permission", id: "p-admin", key: "admin", name: "Security Admin", owner, status: "active", lifecycle: "active", applicableKinds: ["application"] };
  const viewPermission: SecurityRecord = { kind: "permission", id: "p-view", key: "view", name: "View", owner, status: "active", lifecycle: "active", applicableKinds: ["dataset"] };
  const platformPermission: SecurityRecord = { kind: "permission", id: "p-platform", key: "platform", name: "Platform Security", owner: { kind: "platform" }, status: "active", lifecycle: "active", applicableKinds: ["system"] };
  const applicationPermission: SecurityRecord = { kind: "permission", id: "p-app", key: "app", name: "Application Admin", owner, status: "active", lifecycle: "active", applicableKinds: ["application"] };
  const adminSet = set("set-admin", [makeRule("allow-admin", "p-admin", { resource: app, descendants: false }), ...(options.deny ? [makeRule("deny-view", "p-view", { resource: dataset, descendants: false }, "deny")] : [])]);
  const platformSet = set("set-platform", [makeRule("allow-platform", "p-platform", { resource: root, descendants: false })], [], { owner: { kind: "platform" } });
  const platformRole = role("role-platform", ["set-platform"], { owner: { kind: "platform" } });
  const platformBoundary: SecurityRecord = { kind: "grant-boundary", id: "gb-platform", key: "gb-platform", name: "Platform Boundary", owner: { kind: "platform" }, status: "active", beneficiary: { kind: "role", id: "role-platform" }, scope: systemScope, operations: ["create", "edit", "assign", "revoke", "activate", "archive"], permissions: [{ permissionId: "p-platform", scope: systemScope, predicateTemplateIds: [] }, { permissionId: "p-admin", scope: appScope, predicateTemplateIds: [] }, { permissionId: "p-view", scope: appScope, predicateTemplateIds: [] }], serviceUseApprovalIds: ["approval-1"] };
  const appBoundary: SecurityRecord = { kind: "grant-boundary", id: "gb-app", key: "gb-app", name: "App Boundary", owner: { kind: "platform" }, status: "active", beneficiary: { kind: "role", id: "role-admin" }, scope: appScope, operations: ["create", "edit", "assign", "revoke", "activate", "archive"], permissions: [{ permissionId: "p-admin", scope: appScope, predicateTemplateIds: [] }, { permissionId: "p-view", scope: appScope, predicateTemplateIds: [] }], serviceUseApprovalIds: [] };
  return [
    ...["alice", "bob", "dave", "target", "pat", "developer"].map(id => ({ kind: "user", id, displayName: id, status: "active" } as SecurityRecord)),
    applicationAdminPermission, viewPermission, platformPermission, applicationPermission,
    { kind: "service", id: "svc-existing", displayName: "Existing Worker", status: "active", applicationId: "app-a" },
    { kind: "service-use-approval", id: "approval-1", applicationId: "app-a", serviceId: "svc-existing", status: "inactive", startsAt: "2026-01-01T00:00:00Z", endsAt: null, executable: { authorityId: "resources", applicationId: "app-a", kind: "trigger", id: "trigger-1" }, executableDigest: `sha256:${"a".repeat(64)}`, executionCapabilityId: "execute-trigger", allowedInitiatorScope: appScope, permissionCeiling: [{ permissionId: "p-view", scope: appScope }] },
    { kind: "application-security", id: "app-a", key: "app-a", name: "Application", owner, status: "active", requiredAdministratorPermissionId: "p-admin", sharedPackages: [] },
    adminSet, set("set-view", [makeRule("allow-view", "p-view", { resource: dataset, descendants: false })]),
    set("set-app", [makeRule("allow-app", "p-app", { resource: app, descendants: false })]), platformSet,
    role("role-admin", ["set-admin"]), role("role-view", ["set-view"]), role("role-app", ["set-app"]), platformRole,
    { kind: "group", id: "group-view", key: "group-view", name: "View Group", owner, status: "active", permissionSets: [{ id: "set-view" }] },
    appBoundary, platformBoundary,
    ...(options.alice === false ? [] : [assignment("ra-alice", "alice", "role-admin")]),
    ...(options.bob ? [assignment("ra-bob", "bob", "role-admin", options.bobFuture ? { startsAt: "2026-06-02T00:00:00Z" } : options.bobExpiring ? { endsAt: "2026-06-02T00:00:00Z" } : {})] : []),
    assignment("ra-dave", "dave", "role-app"),
    { ...assignment("ra-pat", "pat", "role-platform"), scope: systemScope },
  ];
}
function fixture(options: Parameters<typeof records>[0] = {}, extension: Partial<import("../src/wp3/types.js").AdministrationConfiguration> = {}, scopes: AdministrationScopeAuthority = scopeAuthority) {
  const dir = mkdtempSync(join(tmpdir(), "iam-wp3-")); roots.push(dir);
  const path = join(dir, "security.sqlite"), store = new SecurityDefinitionStore(path); stores.push(store);
  const definitions = new SecurityDefinitionService(store);
  const initial = records(options);const gb=initial.find(r=>r.id==='gb-app');if(gb?.kind==='grant-boundary')gb.permissions.find(p=>p.permissionId==='p-view')!.predicateTemplateIds=['inventory.exclude-hidden.v1'];
  initial.push({ kind: "permission", id: "p-bootstrap", key: "bootstrap", name: "Application Security Administration", owner: { kind: "platform" }, status: "active", lifecycle: "active", applicableKinds: ["application"] });
  initial.push({ kind: "permission", id: "p-ungrantable", key: "ungrantable", name: "Undelegated Security Administration", owner: { kind: "platform" }, status: "active", lifecycle: "active", applicableKinds: ["application"] });
  const platformBoundary = initial.find(r => r.id === "gb-platform");
  if (platformBoundary?.kind === "grant-boundary") platformBoundary.permissions.push({ permissionId: "p-bootstrap", scope: systemScope, predicateTemplateIds: [] });
  const seed = definitions.stage({ changes: initial.map(definition => ({ document: document(definition) })), expectedRevision: 0, source: "api", actorId: "fixture-seed", idempotencyKey: randomUUID() });
  expect(seed.diagnostics).toEqual([]);
  expect(definitions.activate(seed.id, seed.checksum, "fixture-seed")).toMatchObject({ status: "activated", revision: 1 });
  const users = new Map<object, string>();
  const tokens = { alice: {}, bob: {}, dave: {}, target: {}, pat: {}, developer: {}, recovery: {}, weakRecovery: {}, outsider: {} };
  for (const id of ["alice", "bob", "dave", "target", "pat", "developer"] as const) users.set(tokens[id], id);
  const requests = new WeakSet<object>();
  const identity = {
    async verify(context: unknown) { const id = users.get(context as object); if (!id) throw new Error("UNAUTHENTICATED"); return { actorId: id, principalRevision: "principal-1", sessionRevision: "session-1" }; },
    attestDecisionRequest(context: unknown, resource: SecurityResourceRef, permissionId: string, operationId: string) {
      const request: AccessRequest = { context, resource, permissionId, operationId, fields: [] }; requests.add(request); return request;
    },
  };
  const evaluator = new SecurityAuthorizationEvaluator({
    policy: wp1StorePolicyAuthority(store),
    identity: { async verify(context) { const id = users.get(context as object); if (!id) throw new Error("UNAUTHENTICATED"); return { principal: { type: "user" as const, id }, principalRevision: "principal-1", sessionRevision: "session-1" }; }, async assertRequest(request) { if (!requests.has(request)) throw new Error("UNATTESTED"); } },
    resources: { async revision() { return "resources-1"; }, async resolve(ref) { for (const entry of [{ ref: root }, { ref: app, parent: root }, { ref: dataset, parent: app }]) if (JSON.stringify(entry.ref) === JSON.stringify(ref)) return { ...entry, status: "active" as const }; return undefined; } },
    facts: { async revision() { return "facts-1"; }, async resolve() { return { present: false as const }; } },
    explanations: { async mayExplain(audience) { return audience === tokens.alice || audience === tokens.pat; } },
    clock: () => new Date("2026-06-01T00:00:00Z"),
  });
  const ownerRegistry = new Map<string, { resource: SecurityResourceRef; owner: { kind: "application"; applicationId: string }; status: "active"; revision: string }>([["app-b", { resource: { ...app, id: "app-b", applicationId: "app-b" }, owner: { kind: "application", applicationId: "app-b" }, status: "active", revision: "owner-1" }]]);
  const administration = new SecurityAdministrationService(definitions, evaluator, identity, { async verify(context) { if (context === tokens.recovery) return { operatorId: "operator-1", deploymentId: "deployment-1", strong: true as const, capabilityId: "recovery-1" }; if (context === tokens.weakRecovery) return { operatorId: "operator-1", deploymentId: "deployment-1", strong: false as never, capabilityId: "recovery-1" }; throw new Error("RECOVERY_UNAUTHENTICATED"); } }, scopes, { ...extension, resourceAuthorityId: "resources", systemResourceId: "system", platformAdministratorPermissionId: "p-platform", recoveryCapabilityId: "recovery-1", deploymentId: "deployment-1", clock: () => new Date("2026-06-01T00:00:00Z"), applicationProvisioning: { resolve: id => ownerRegistry.get(id) } });
  const change = (record: SecurityRecord, source: "api" | "ui" | "cli" | "text-reconcile" = "api") => {
    const old = definitions.active().find(x => x.definition.id === record.id);
    return administration.stage({ changes: [{ document: document(record), ...(old ? { expectedChecksum: securityChecksum(old) } : {}) }], expectedRevision: definitions.revision(), source, actorId: source === "text-reconcile" ? "unverified-file" : "claimed-author", idempotencyKey: randomUUID(), reason: "reviewed security change" });
  };
  const activate = async(candidate: ReturnType<typeof change>, context: unknown, applicationId: string | null = "app-a") => {const result=await administration.activate({ context, candidateId: candidate.id, checksum: candidate.checksum, expectedRevision: candidate.baseRevision, applicationId, reason: "reviewed security change" });observations.push({candidateId:candidate.id,staged:candidate.activatable,actor:users.get(context as object),applicationId,status:result.status,codes:result.diagnostics?.map(d=>d.code),audit:store.adminAudit().map(a=>({actor:a.actorId,operation:a.operation,authorityPath:a.authorityPath,targetIds:a.targetIds}))});return result;};
  return { path, store, definitions, administration, evaluator, identity, tokens, change, activate, ownerRegistry };
}
const codes = (result: { diagnostics?: Array<{ code: string }> }) => result.diagnostics?.map(x => x.code) ?? [];

const templateId='inventory.exclude-hidden.v1';
const predicate={op:'eq' as const,left:{kind:'field' as const,fieldId:'name-permanent'},right:{kind:'literal' as const,value:'Hidden'}};
function templateFixture(){
  const live={registry:1,schema:'schema-1',owner:'owner-1',revoked:false,delegation:false,held:false},calls:any[]=[];
  const stamp=()=>JSON.stringify({registry:live.registry,schema:live.schema,owner:live.owner,revoked:live.revoked,delegation:live.delegation});
  const hooks={capture(){if(live.revoked||live.schema!=='schema-1'||live.owner!=='owner-1')throw Error('TEMPLATE_BINDING_INVALID');return stamp();},assertCurrent(value:string){if(live.revoked||live.schema!=='schema-1'||live.owner!=='owner-1'||value!==stamp())return false;live.held=true;return{release(){live.held=false;}};},
    permitsDelegation(input:any){calls.push({delegation:input});return live.delegation&&input.actorId==='pat'&&input.paths.some((p:any)=>p.boundary.id==='gb-platform')&&input.previous?.id==='gb-app'&&input.proposed.id==='gb-app'&&JSON.stringify(input.proposed.scope)===JSON.stringify(appScope)&&input.proposed.permissions.every((p:any)=>!p.predicateTemplateIds.length||p.permissionId==='p-view'&&JSON.stringify(p.scope)===JSON.stringify(appScope)&&JSON.stringify(p.predicateTemplateIds)===JSON.stringify([templateId]));}};
  const scopes:AdministrationScopeAuthority={...scopeAuthority,permitsTemplateRule(input){calls.push({...input,bindingHeld:live.held});return live.held&&!live.revoked&&input.boundary.id==='gb-app'&&input.permission.predicateTemplateIds.includes(templateId)&&input.rule.permissionId==='p-view'&&input.rule.effect==='deny'&&JSON.stringify(input.rule.scope)===JSON.stringify({resource:dataset,descendants:false})&&JSON.stringify(input.rule.where)===JSON.stringify(predicate)&&(!input.assignmentScope||JSON.stringify(input.assignmentScope)===JSON.stringify(appScope));}};
  const f=fixture({}, {templateAuthority:hooks},scopes);
  const record=(overrides:any={})=>set('viewer-restriction',[{...makeRule('exclude-hidden','p-view',{resource:dataset,descendants:false},'deny'),where:predicate,...overrides}]);
  return {...f,live,calls,record};
}
describe('bounded WP3 transaction hooks',()=>{
  it('preserves a committed outcome on cleanup failure and refuses subsequent template activation',async()=>{
    const warning=vi.spyOn(process,'emitWarning').mockImplementation(()=>{}),f=templateFixture(),c=f.change(f.record());
    const authority=(f.administration as any).config.templateAuthority,assert=authority.assertCurrent;
    authority.assertCurrent=(...args:any[])=>{const lease=assert(...args);return lease&&typeof lease==='object'?{release(){lease.release();throw Error('CLEANUP_FAULT');}}:lease;};
    const result=await f.activate(c,f.tokens.alice);expect(result.status).toBe('activated');expect(f.store.revision()).toBe(2);expect(f.store.adminAudit()).toHaveLength(1);expect(f.store.candidate(c.id)?.result).toEqual(result);expect(f.live.held).toBe(false);
    expect(warning).toHaveBeenCalledWith(expect.any(String),{code:'WP3_TEMPLATE_LEASE_RELEASE_FAILED'});
    const next=f.change({...f.record(),id:'next-template',key:'next-template'} as any);expect(codes(await f.activate(next,f.tokens.alice))).toContain('ADMIN_TEMPLATE_BINDING_STALE');expect(f.store.revision()).toBe(2);
    const plain=f.change(set('plain-after-cleanup',[makeRule('plain-after-cleanup','p-view',{resource:dataset,descendants:false})]));expect((await f.activate(plain,f.tokens.alice)).status).toBe('activated');
    observations.push({review:'cleanup-outcome-fixed',result,templateRetryRefused:true,ordinaryActivationUnaffected:true});
  });
  it('retains rollback and fails closed after cleanup failure on an unsuccessful activation',async()=>{
    vi.spyOn(process,'emitWarning').mockImplementation(()=>{});const f=templateFixture(),c=f.change(f.record()),authority=(f.administration as any).config.templateAuthority,assert=authority.assertCurrent;
    authority.assertCurrent=(...args:any[])=>{const lease=assert(...args);return lease&&typeof lease==='object'?{release(){lease.release();throw Error('CLEANUP_FAULT');}}:lease;};
    const db=new DatabaseSync(f.path);try{db.exec("CREATE TRIGGER cleanup_review_audit BEFORE INSERT ON security_admin_audit BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END");}finally{db.close();}
    expect((await f.activate(c,f.tokens.alice)).status).toBe('rejected');expect(f.store.revision()).toBe(1);expect(f.store.adminAudit()).toHaveLength(0);expect(f.live.held).toBe(false);
    const repaired=new DatabaseSync(f.path);try{repaired.exec('DROP TRIGGER cleanup_review_audit');}finally{repaired.close();}
    expect(codes(await f.activate(c,f.tokens.alice))).toContain('ADMIN_TEMPLATE_BINDING_STALE');expect(f.store.revision()).toBe(1);
  });
  it('permits only explicit Platform authorization of the existing exact application ceiling',async()=>{const f=templateFixture();f.live.delegation=true;const old=f.definitions.active().find(d=>d.definition.id==='gb-app')!.definition as any;const c=f.change({...old,name:'Explicitly approved template ceiling'});expect((await f.activate(c,f.tokens.pat,null)).status).toBe('activated');expect(f.calls.some(x=>x.delegation?.actorId==='pat'&&x.delegation.paths[0].boundary.id==='gb-platform')).toBe(true);});
  it.each(['schema','owner','revoked'] as const)('rejects invalid %s during staging',key=>{const f=templateFixture();if(key==='revoked')f.live.revoked=true;else f.live[key]='invalid';expect(()=>f.change(f.record())).toThrow('TEMPLATE_BINDING_INVALID');expect(f.store.revision()).toBe(1);});
  it('activates the exact deny rule through SQLite WP3 and records actual administrative audit',async()=>{
    const f=templateFixture(),c=f.change(f.record());expect(c.activatable).toBe(true);const result=await f.activate(c,f.tokens.alice);expect(result.status).toBe('activated');
    expect(f.calls.some(x=>x.rule?.effect==='deny'&&x.boundary.id==='gb-app'&&x.permission.permissionId==='p-view')).toBe(true);
    expect(f.calls.filter(x=>x.rule).every(x=>x.bindingHeld)).toBe(true);expect(f.live.held).toBe(false);
    expect(f.store.adminAudit().some(a=>a.actorId==='alice'&&a.operation==='create'&&a.targetIds.includes('viewer-restriction'))).toBe(true);
  });
  it('passes the real applicable assignment scope when assigning an approved restricted Role',async()=>{const f=templateFixture();expect((await f.activate(f.change(f.record()),f.tokens.alice)).status).toBe('activated');expect((await f.activate(f.change(role('template-role',['viewer-restriction'])),f.tokens.alice)).status).toBe('activated');expect((await f.activate(f.change(assignment('template-assignment','target','template-role')),f.tokens.alice)).status).toBe('activated');expect(f.calls.some(x=>x.assignmentScope&&JSON.stringify(x.assignmentScope)===JSON.stringify(appScope))).toBe(true);});
  it('releases the binding lease when durable policy audit fails and rolls the policy back',async()=>{const f=templateFixture(),c=f.change(f.record()),db=new DatabaseSync(f.path);db.exec("CREATE TRIGGER fail_template_audit BEFORE INSERT ON security_admin_audit BEGIN SELECT RAISE(ABORT, 'audit unavailable'); END");db.close();expect((await f.activate(c,f.tokens.alice)).status).not.toBe('activated');expect(f.store.revision()).toBe(1);expect(f.live.held).toBe(false);});
  it('serializes competing template activations at the captured policy revision',async()=>{const f=templateFixture(),a=f.change(f.record()),b=f.change({...f.record(),id:'second-template-set',key:'second-template-set'} as any);const results=await Promise.all([f.activate(a,f.tokens.alice),f.activate(b,f.tokens.alice)]);expect(results.filter(r=>r.status==='activated')).toHaveLength(1);expect(f.live.held).toBe(false);});
  it.each([
    ['polarity',{effect:'allow'}],['permission',{permissionId:'p-app'}],['application',{scope:{resource:{...dataset,applicationId:'foreign-app'},descendants:false}}],
    ['dataset',{scope:{resource:{...dataset,id:'foreign-dataset'},descendants:false}}],['field',{where:{...predicate,left:{kind:'field',fieldId:'wrong-field'}}}],
    ['literal',{where:{...predicate,right:{kind:'literal',value:'Visible'}}}],['operator',{where:{...predicate,op:'ne'}}],
  ])('refuses wrong %s with no policy activation',async(_label,change)=>{const f=templateFixture(),revision=f.store.revision(),c=f.change(f.record(change));const result=await f.activate(c,f.tokens.alice);expect(result.status).toBe('rejected');expect(f.store.revision()).toBe(revision);expect(f.live.held).toBe(false);});
  it('refuses a different administrative boundary and empty/unknown template ceilings',async()=>{
    for(const id of ['gb-app','foreign-boundary']){const f=templateFixture();const b=f.definitions.active().find(d=>d.definition.id==='gb-app')!.definition as any;
      // Propose a template delegation through actual WP3; even Platform authority does not mint approval.
      const candidate=f.change({...b,id,permissions:b.permissions.map((p:any)=>({...p,predicateTemplateIds:['unknown']}))});const result=await f.activate(candidate,f.tokens.pat,null);expect(result.status).toBe('rejected');expect(codes(result)).toContain('ADMIN_TEMPLATE_DELEGATION_DENIED');
    }
    const f=templateFixture(),c=f.change(f.record());expect((await f.activate(c,f.tokens.pat)).status).toBe('rejected'); // Platform ceiling has no template ID.
  });
  it('Application Administrators cannot mint template authority',async()=>{const f=templateFixture(),old=f.definitions.active().find(d=>d.definition.id==='gb-app')!.definition as any;const c=f.change({...old,permissions:old.permissions.map((p:any)=>({...p,predicateTemplateIds:['minted']}))});expect((await f.activate(c,f.tokens.alice,null)).status).toBe('rejected');});
  it.each(['registry','schema','owner','revoked'] as const)('refuses stale or revoked %s captured at staging',async(key)=>{const f=templateFixture(),c=f.change(f.record());if(key==='registry')f.live.registry++;else if(key==='revoked')f.live.revoked=true;else f.live[key]='changed';const result=await f.activate(c,f.tokens.alice);expect(codes(result)).toContain('ADMIN_TEMPLATE_BINDING_STALE');expect(f.store.revision()).toBe(1);});
  it('rechecks inside serialized activation after the last asynchronous identity check',async()=>{const f=templateFixture(),c=f.change(f.record()),verify=f.identity.verify;let count=0;f.identity.verify=async context=>{const result=await verify(context);if(++count===2)f.live.registry++;return result;};expect(codes(await f.activate(c,f.tokens.alice))).toContain('ADMIN_TEMPLATE_BINDING_STALE');expect(f.store.revision()).toBe(1);});
  it('unconfigured authority and legacy expression-only adapter refuse templated activation',async()=>{const f=fixture(),c=f.change(set('rejected',[{...makeRule('rule','p-view',{resource:dataset,descendants:false},'deny'),where:predicate} as any]));expect(codes(await f.activate(c,f.tokens.alice))).toContain('ADMIN_GRANT_CEILING');});
  it('non-template staging and activation remain unchanged',async()=>{const f=templateFixture(),c=f.change(set('plain',[makeRule('plain','p-view',{resource:dataset,descendants:false})]));expect((await f.activate(c,f.tokens.alice)).status).toBe('activated');});
});





// Appended only to the copied WP3 test during review; shares the existing fixture.
describe('WP3 cleanup outcome review',()=>{
 it('reports a committed activation truthfully when the binding cleanup throws',async()=>{
  const f=templateFixture(),c=f.change(f.record()),authority=(f.administration as any).config.templateAuthority;
  const assert=authority.assertCurrent;authority.assertCurrent=(...args:any[])=>{const lease=assert(...args);return lease&&typeof lease==='object'?{release(){lease.release();throw Error('REVIEW_CLEANUP_FAULT');}}:lease;};
  const result=await f.activate(c,f.tokens.alice);
  observations.push({review:'cleanup-after-commit',result,revision:f.store.revision(),auditCount:f.store.adminAudit().length,candidate:f.store.candidate(c.id)?.result});
  expect(f.store.revision()).toBe(2);expect(f.store.adminAudit()).toHaveLength(1);expect(result.status).toBe('activated');
 });
});
