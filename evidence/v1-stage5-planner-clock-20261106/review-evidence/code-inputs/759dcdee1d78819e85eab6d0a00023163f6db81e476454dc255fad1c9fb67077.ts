import { describe, expect, it } from "vitest";
import { SecurityAuthorizationEvaluator } from "../src/wp2/evaluator.js";
import { DatasetSecurityPlanService } from "../src/wp4/plan.js";
import { compileSecurityPredicate, evaluateRestrictedCell, queryDependencies } from "../src/wp4/expression.js";
import { reconcileOwnerMappingWithRegistry } from "../src/wp4/migration.js";
import { validateDatasetFieldReferences } from "../src/wp4/references.js";
import { previewLegacyGrants, type LegacyOwnerMapping } from "../src/wp1/migration.js";
import { FileVersionedDefinitionRegistry, type VersionedDefinitionAdapter } from "@ui-platform/versioned-definition-registry";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { DatasetPlanRequest, DatasetSecurityPlan, PermissionCatalog } from "../src/wp4/types.js";
import type { AccessRequest, EvaluatorDependencies } from "../src/wp2/types.js";
import type { SecurityDocument, SecurityRecord, SecurityResourceRef, SecurityRule } from "../src/wp1/models.js";

const root: SecurityResourceRef = { authorityId: "resources", applicationId: null, kind: "system", id: "system" };
const app: SecurityResourceRef = { authorityId: "resources", applicationId: "app-a", kind: "application", id: "app-a" };
const dataset: SecurityResourceRef = { authorityId: "resources", applicationId: "app-a", kind: "dataset", id: "ds-a" };
const field = (id: string): SecurityResourceRef => ({ authorityId: "resources", applicationId: "app-a", kind: "field", id, parentId: "ds-a" });
const scope = (resource: SecurityResourceRef, descendants = false) => ({ resource, descendants });
const doc = (definition: SecurityRecord): SecurityDocument => ({ format: "ui-platform.security", formatVersion: 1, definition });
const rule = (id: string, permissionId: string, effect: "allow" | "deny", patch: Partial<SecurityRule> = {}): SecurityRule =>
  ({ id, permissionId, effect, scope: scope(dataset, true), ...patch });
const eq = (id: string, value: string) => ({ op: "eq", left: { kind: "field", fieldId: id }, right: { kind: "literal", value } } as const);
const permissionIds = ["p-read", "p-create", "p-update", "p-delete", "p-count", "p-exists", "p-write", "p-filter", "p-sort", "p-group", "p-aggregate"];
const permissions: PermissionCatalog = {
  operation: x => ({ read: "p-read", create: "p-create", update: "p-update", delete: "p-delete", count: "p-count", exists: "p-exists" })[x],
  field: x => ({ read: "p-read", write: "p-write", filter: "p-filter", sort: "p-sort", group: "p-group", aggregate: "p-aggregate" } as Record<string, string>)[x],
};

function harness(rules: SecurityRule[]) {
  const records: SecurityRecord[] = [
    { kind: "user", id: "user-a", displayName: "User", status: "active" },
    ...permissionIds.map(id => ({ kind: "permission", id, key: id, name: id, status: "active", owner: { kind: "application", applicationId: "app-a" }, lifecycle: "active", applicableKinds: ["dataset"] } as SecurityRecord)),
    { kind: "permission-set", id: "set-a", key: "set-a", name: "Set", status: "active", owner: { kind: "application", applicationId: "app-a" }, includes: [], rules },
    { kind: "role", id: "role-a", key: "role-a", name: "Role", status: "active", owner: { kind: "application", applicationId: "app-a" }, permissionSets: [{ id: "set-a" }] },
    { kind: "role-assignment", id: "assignment-a", status: "active", userId: "user-a", roleId: "role-a", scope: scope(app, true), startsAt: "2026-01-01T00:00:00Z", endsAt: null },
  ];
  const state = { policyRevision: "1", resourceRevision: "r1", factRevision: "f1", principalRevision: "p1", sessionRevision: "s1", now: new Date("2026-06-01T00:00:00Z"), policyAvailable: true };
  const context = {}, otherContext = {}, capability = {};
  const attested = new WeakSet<AccessRequest>();
  const facts = new Map<string, string | number | boolean | null>();
  const knownFieldIds = ["field-a", "field-b", "salary", "status"];
  const resources = [{ ref: root }, { ref: app, parent: root }, { ref: dataset, parent: app }, ...knownFieldIds.map(id => ({ ref: field(id), parent: dataset }))];
  const resolver = { async revision() { return state.resourceRevision; }, async resolve(ref: SecurityResourceRef) {
    const entry = resources.find(x => JSON.stringify(x.ref) === JSON.stringify(ref));
    return entry && { ...entry, status: "active" as const };
  } };
  const dep: EvaluatorDependencies = {
    policy: { async read() { if (!state.policyAvailable) throw new Error("offline"); return { revision: state.policyRevision, documents: records.map(doc) }; } },
    identity: {
      async verify(handle) { if (handle !== context) throw new Error("bad handle"); return { principal: { type: "user" as const, id: "user-a" }, principalRevision: state.principalRevision, sessionRevision: state.sessionRevision }; },
      async assertRequest(request) { if (!attested.has(request)) throw new Error("unattested"); },
    },
    resources: resolver,
    facts: { async revision() { return state.factRevision; }, async resolve(id) { return facts.has(id) ? { present: true, value: facts.get(id)! } : { present: false }; } },
    clock: () => state.now,
    freshnessMs: 1000,
    plannerCapability: capability,
  };
  const evaluator = new SecurityAuthorizationEvaluator(dep);
  const registry = {
    ...resolver,
    async bindDataset(applicationId: string, datasetId: string) {
      if (applicationId !== "app-a" || datasetId !== "ds-a") throw new Error("unknown binding");
      return { resource: dataset, environmentId: "dev", schemaVersion: 1, schemaDigest: "sha256:verified", registryRevision: state.resourceRevision,
        physical: { appId: "app-a", dataset: "employees" }, fields: knownFieldIds.map(id => ({ fieldId: id, key: id })) };
    },
  };
  const identity = { async attest(input: AccessRequest) { const request = { ...input, fields: [...input.fields] }; attested.add(request); return request; } };
  const service = new DatasetSecurityPlanService(registry, evaluator, dep.policy, identity, permissions, capability);
  const request = (patch: Partial<DatasetPlanRequest> = {}): DatasetPlanRequest => ({ context, resource: dataset, operationId: "op-a", operation: "read", query: { kind: "select", fieldId: "field-a" }, ...patch });
  return { state, records, facts, context, otherContext, capability, evaluator, service, registry, request, attested, knownFieldIds, resources, identity, policy: dep.policy };
}

function project(plan: DatasetSecurityPlan, row: Record<string, unknown>, index: number) {
  const output: Record<string, unknown> = {};
  for (const id of plan.readProjection) {
    const cells = plan.cells.filter(c => c.fieldId === id && c.recordIndex === index);
    if (cells.length && cells.every(c => evaluateRestrictedCell(c.allow, c.deny, row, new Map()) === "yes")) output[id] = row[id];
  }
  return output;
}

describe("WP4 Dataset security plan", () => {
  it("omits a denied read Field while preserving an allowed null and rejects write to a denied Field", async () => {
    const h = harness([rule("read-all", "p-read", "allow"), rule("deny-salary", "p-read", "deny", { fields: ["salary"] }), rule("update-all", "p-update", "allow"), rule("write-all", "p-write", "allow"), rule("write-deny", "p-write", "deny", { fields: ["salary"] })]);
    const read = h.request({ query: { kind: "all", nodes: [{ kind: "select", fieldId: "field-a" }, { kind: "select", fieldId: "salary" }] }, records: [{ after: { "field-a": null, salary: 200 } }] });
    const plan = await h.service.plan(read);
    expect(plan.effect).toBe("allow");
    expect(plan.readProjection).toEqual(["field-a"]);
    expect(plan.omitReadFields).toEqual(["salary"]);
    expect(project(plan, { "field-a": null, salary: 200 }, 0)).toEqual({ "field-a": null });
    await expect(h.service.assertCurrent(plan, read)).resolves.toBeUndefined();
    await expect(h.service.plan(h.request({ operation: "update", query: undefined, writeFields: ["salary"], records: [{ before: { salary: 100 }, after: { salary: 200 } }] }))).rejects.toThrow("WRITE_FIELD_UNAUTHORIZED");
  });

  it("keeps independent row/Field grants correlated and denies row-specific cells", async () => {
    const h = harness([rule("a-x", "p-read", "allow", { fields: ["field-a"], where: eq("status", "X") }), rule("b-y", "p-read", "allow", { fields: ["field-b"], where: eq("status", "Y") })]);
    const request = h.request({ query: { kind: "all", nodes: [{ kind: "select", fieldId: "field-a" }, { kind: "select", fieldId: "field-b" }] }, records: [{ after: { status: "X", "field-a": "A1", "field-b": "B1" } }, { after: { status: "Y", "field-a": "A2", "field-b": "B2" } }] });
    const plan = await h.service.plan(request);
    expect(plan.effect).toBe("conditional");
    expect(project(plan, request.records![0].after!, 0)).toEqual({ "field-a": "A1" });
    expect(project(plan, request.records![1].after!, 1)).toEqual({ "field-b": "B2" });
    expect(plan.readProjection).toEqual(["field-a", "field-b"]);
  });

  it("requires independent filter, sort, group and aggregate permissions and refuses hidden query aliases/features", async () => {
    const h = harness([rule("read", "p-read", "allow")]);
    for (const [kind, error] of [["filter", "QUERY_FIELD_UNAUTHORIZED"], ["sort", "QUERY_FIELD_UNAUTHORIZED"], ["group", "QUERY_FIELD_UNAUTHORIZED"], ["aggregate", "QUERY_FIELD_UNAUTHORIZED"]] as const) {
      const dependency = kind === "filter" ? { kind, expression: { op: "gt", fieldId: "salary", value: 100 } } : kind === "aggregate" ? { kind, operator: "sum", fieldId: "salary" } : { kind, fieldId: "salary" };
      await expect(h.service.plan(h.request({ query: { kind: "all", nodes: [{ kind: "select", fieldId: "field-a" }, dependency] } as never }))).rejects.toThrow(error);
    }
    await expect(h.service.plan(h.request({ query: { kind: "all", nodes: [{ kind: "select", fieldId: "field-a" }, { kind: "sort", fieldId: "salary", alias: "public" }] } as never }))).rejects.toThrow("QUERY_EXPRESSION_UNSUPPORTED");
    for (const kind of ["join", "computed", "export"] as const) await expect(h.service.plan(h.request({ query: { kind: "all", nodes: [{ kind: "select", fieldId: "field-a" }, { kind, dependencies: [] }] } }))).rejects.toThrow("QUERY_FEATURE_UNSUPPORTED");
    await expect(h.service.plan(h.request({ query: { kind: "all", nodes: [] } }))).rejects.toThrow("FIELD_SELECTION_REQUIRED");
    expect(queryDependencies({ kind: "filter", expression: { op: "eq", fieldId: "salary", value: null } }, new Set(["salary"]))).toEqual([{ fieldId: "salary", usage: "filter" }]);
  });

  it("binds count/exists and pagination semantics to row security", async () => {
    const h = harness([rule("count-x", "p-count", "allow", { where: eq("status", "X") }), rule("exists-x", "p-exists", "allow", { where: eq("status", "X") })]);
    for (const operation of ["count", "exists"] as const) {
      const request = h.request({ operation, query: undefined });
      const plan = await h.service.plan(request);
      expect(plan.effect).toBe("conditional");
      expect(plan.cardinalityUsesRowSecurity).toBe(true);
      expect(plan.paginationAfterSecurity).toBe(true);
      expect(evaluateRestrictedCell(plan.cells[0].allow, plan.cells[0].deny, { status: "X" }, new Map())).toBe("yes");
      expect(evaluateRestrictedCell(plan.cells[0].allow, plan.cells[0].deny, { status: "Y" }, new Map())).toBe("no");
    }
  });

  it("treats create as proposed-state authority and update as both old and new state, with a final-write checkpoint", async () => {
    const h = harness([rule("create", "p-create", "allow", { where: eq("status", "active") }), rule("update", "p-update", "allow", { where: eq("status", "active") }), rule("write", "p-write", "allow", { where: eq("status", "active") })]);
    const create = await h.service.plan(h.request({ operation: "create", query: undefined, writeFields: ["field-a"], records: [{ after: { status: "active", "field-a": "A" } }] }));
    expect(create.effect).toBe("allow");
    expect(create.requiresFinalWriteCheck).toBe(true);
    const unknown = await h.service.plan(h.request({ operation: "create", query: undefined, writeFields: ["field-a"] }));
    expect(unknown.effect).toBe("conditional");
    await expect(h.service.plan(h.request({ operation: "update", query: undefined, writeFields: ["field-a"], records: [{ before: { status: "active" } }] }))).rejects.toThrow("WRITE_STATE_REQUIRED");
    await expect(h.service.plan(h.request({ operation: "update", query: undefined, writeFields: ["field-a"], records: [{ before: { status: "active" }, after: { status: "inactive" } }] }))).rejects.toThrow("WRITE_FIELD_UNAUTHORIZED");
  });

  it("rejects changed request, mutated plan, revisions, unavailable authority, missing facts and unsupported predicates", async () => {
    const h = harness([rule("read", "p-read", "allow")]);
    const request = h.request();
    const plan = await h.service.plan(request);
    await expect(h.service.assertCurrent(plan, h.request({ operationId: "other" }))).rejects.toThrow("PLAN_STALE");
    await expect(h.service.assertCurrent(plan, h.request({ context: h.otherContext }))).rejects.toThrow();
    await expect(h.service.assertCurrent({ ...plan }, request)).rejects.toThrow("PLAN_STALE");
    h.state.resourceRevision = "r2";
    await expect(h.service.assertCurrent(plan, request)).rejects.toThrow();
    h.state.resourceRevision = "r1";
    h.state.policyRevision = "2";
    await expect(h.service.assertCurrent(plan, request)).rejects.toThrow();
    h.state.policyRevision = "1";
    h.state.policyAvailable = false;
    await expect(h.service.plan(request)).rejects.toThrow();
    h.state.policyAvailable = true;
    const set = h.records.find(x => x.kind === "permission-set");
    if (set?.kind !== "permission-set") throw new Error("fixture missing set");
    set.rules[0].where = { op: "eq", left: { kind: "fact", factId: "missing" }, right: { kind: "literal", value: true } };
    await expect(h.service.plan(request)).rejects.toThrow("PLAN_AUTHORIZATION_TRUSTED_FACT_MISSING");
    h.facts.set("missing", true);
    expect((await h.service.plan(request)).effect).toBe("allow");
    set.rules[0].where = { op: "not", arg: { op: "false" } };
    await expect(h.service.plan(request)).rejects.toThrow("SECURITY_EXPRESSION_UNSUPPORTED");
  });

  it("keeps planner evidence behind the host capability and rejects unsupported typed expressions", async () => {
    const h = harness([rule("read", "p-read", "allow")]);
    const request: AccessRequest = { context: h.context, resource: dataset, permissionId: "p-read", operationId: "op", fields: [{ fieldId: "field-a", usage: "read" }] };
    h.attested.add(request);
    expect((await h.evaluator.explain(request, h.context)).provenance).toEqual([]);
    await expect(h.evaluator.planEvidence(request, {})).rejects.toThrow("PLANNER_CAPABILITY_DENIED");
    const evidence = await h.evaluator.planEvidence(request, h.capability);
    expect(h.evaluator.trustedPlanFacts(evidence, h.capability).size).toBe(0);
    expect(() => h.evaluator.trustedPlanFacts(evidence, {})).toThrow("PLANNER_CAPABILITY_DENIED");
    expect(evaluateRestrictedCell([{ op: "eq", left: { kind: "field", fieldId: "field-a" }, right: { kind: "literal", value: null } }], [], { "field-a": null }, new Map())).toBe("yes");
    expect(evaluateRestrictedCell([{ op: "eq", left: { kind: "field", fieldId: "field-a" }, right: { kind: "literal", value: null } }], [], {}, new Map())).toBe("missing");
    expect(() => compileSecurityPredicate({ op: "not", arg: { op: "true" } }, new Set())).toThrow("SECURITY_EXPRESSION_UNSUPPORTED");
  });

  it("agrees on typed/null/missing row predicates and subtracts a narrow DENY from two ALLOW branches", () => {
    const ids = new Set(["field-a", "field-b"]);
    const allow = [compileSecurityPredicate(eq("field-a", "X"), ids), compileSecurityPredicate(eq("field-b", "Y"), ids)];
    const deny = [compileSecurityPredicate({ op: "eq", left: { kind: "field", fieldId: "field-b" }, right: { kind: "literal", value: "D" } }, ids)];
    for (const [row, expected] of [
      [{ "field-a": "X", "field-b": "N" }, "yes"], [{ "field-a": "N", "field-b": "Y" }, "yes"],
      [{ "field-a": "X", "field-b": "D" }, "no"], [{ "field-a": "N", "field-b": "N" }, "no"],
      [{ "field-a": "X" }, "missing"], [{ "field-a": null, "field-b": null }, "no"],
    ] as const) expect(evaluateRestrictedCell(allow, deny, row, new Map())).toBe(expected);
    expect(evaluateRestrictedCell([compileSecurityPredicate({ op: "eq", left: { kind: "field", fieldId: "field-a" }, right: { kind: "literal", value: 1 } }, ids)], [], { "field-a": "1" }, new Map())).toBe("no");
    expect(evaluateRestrictedCell([compileSecurityPredicate({ op: "gt", left: { kind: "field", fieldId: "field-a" }, right: { kind: "literal", value: 1 } }, ids)], [], { "field-a": null }, new Map())).toBe("missing");
  });

  it("does not infer Field rights from a deprecated or unclassified catalog entry", async () => {
    const h = harness([]);
    const permission = h.records.find(x => x.kind === "permission" && x.id === "p-read");
    if (permission?.kind !== "permission") throw new Error("fixture missing permission");
    permission.lifecycle = "deprecated";
    expect((await h.service.plan(h.request())).effect).toBe("deny");
    const missing: PermissionCatalog = { operation: permissions.operation, field: () => undefined };
    const service = new DatasetSecurityPlanService(h.registry, h.evaluator, h.policy, h.identity, missing, h.capability);
    await expect(service.plan(h.request({ operation: "create", query: undefined, writeFields: ["field-a"] }))).rejects.toThrow("FIELD_PERMISSION_UNKNOWN");
    const authorized = harness([rule("read", "p-read", "allow")]);
    let readPermission = "p-read";
    const changing: PermissionCatalog = { operation: permissions.operation, field: usage => usage === "read" ? readPermission : permissions.field(usage) };
    const reconfigured = new DatasetSecurityPlanService(authorized.registry, authorized.evaluator, authorized.policy, authorized.identity, changing, authorized.capability);
    const request = authorized.request();
    const plan = await reconfigured.plan(request);
    readPermission = "p-filter";
    await expect(reconfigured.assertCurrent(plan, request)).rejects.toThrow("PLAN_STALE");
  });

  it("preflights active Dataset/Field policy references against owner identity and revision", async () => {
    const h = harness([rule("read", "p-read", "allow", { fields: ["field-a"], where: eq("field-b", "X") })]);
    const docs = h.records.map(doc);
    await expect(validateDatasetFieldReferences(docs, h.registry, "resources")).resolves.toEqual({ revision: "r1" });
    const set = h.records.find(x => x.kind === "permission-set");
    if (set?.kind !== "permission-set") throw new Error("fixture missing set");
    set.rules[0].fields = ["unknown"];
    await expect(validateDatasetFieldReferences(h.records.map(doc), h.registry, "resources")).rejects.toThrow("RESOURCE_REFERENCE_UNKNOWN");
    set.rules[0].fields = ["field-a"];
    set.rules[0].scope.resource = { ...dataset, applicationId: "app-b" };
    await expect(validateDatasetFieldReferences(h.records.map(doc), h.registry, "resources")).rejects.toThrow("RESOURCE_REFERENCE_UNKNOWN");
  });

  it("uses explicit broad-scope semantics for a new Field but never transfers a field-specific grant by name", async () => {
    const h = harness([rule("broad", "p-read", "allow"), rule("deny-old", "p-read", "deny", { fields: ["salary"] })]);
    h.knownFieldIds.push("salary-v2"); h.resources.push({ ref: field("salary-v2"), parent: dataset }); h.state.resourceRevision = "r2";
    const replacement = await h.service.plan(h.request({ query: { kind: "select", fieldId: "salary-v2" } }));
    expect(replacement.readProjection).toEqual(["salary-v2"]);
    expect((await h.service.plan(h.request({ query: { kind: "select", fieldId: "salary" } }))).omitReadFields).toEqual(["salary"]);
    const set = h.records.find(x => x.kind === "permission-set");
    if (set?.kind !== "permission-set") throw new Error("fixture missing set");
    set.rules = [rule("old-only", "p-read", "allow", { fields: ["salary"] })];
    expect((await h.service.plan(h.request({ query: { kind: "select", fieldId: "salary-v2" } }))).effect).toBe("deny");
    const permission = h.records.find(x => x.kind === "permission" && x.id === "p-read");
    if (permission?.kind !== "permission") throw new Error("fixture missing permission");
    permission.lifecycle = "retired";
    await expect(h.service.plan(h.request())).rejects.toThrow("PLAN_AUTHORIZATION_PERMISSION_UNAVAILABLE");
  });

  it("reconciles a verified legacy owner mapping with live IDs without changing source hashes or activating grants", async () => {
    const root = mkdtempSync(join(tmpdir(), "wp4-migration-"));
    try {
      const map: LegacyOwnerMapping = { applicationId: "app-a", authorityId: "resources", legacyApplicationIds: ["old-app"], datasets: [{ id: "ds-a", legacyNames: ["employees"], fields: [{ id: "field-a", legacyNames: ["name"] }] }] };
      const adapter: VersionedDefinitionAdapter<LegacyOwnerMapping> = { definitionType: "migration-owner-map", permanentIdentity: x => x.applicationId,
        async validateDraft() { return { valid: true, errors: [], warnings: [] }; }, async normalizeForPublish(x) { return structuredClone(x); } };
      const owner = new FileVersionedDefinitionRegistry(join(root, "owner"), adapter);
      const ref = { definitionType: "migration-owner-map", appId: "app-a", key: "legacy-map", definitionId: "app-a" };
      await owner.create(ref, map); await owner.publishDraft(ref);
      const h = harness([]);
      const principals = { user: (id: string) => id === "old-user" ? "user-a" : undefined, service: () => undefined, permission: () => "p-read" };
      const resolver = await reconcileOwnerMappingWithRegistry(await owner.readVerifiedActive(ref), principals, h.registry);
      const source = JSON.stringify([{ id: "g1", subject: { type: "user", id: "old-user" }, resource: { appId: "old-app", dataset: "employees" }, actions: ["query"], fields: ["name"] }]);
      const preview = previewLegacyGrants(source, "[]", resolver, "2026-10-01T00:00:00Z");
      expect(preview.quarantined).toEqual([]);
      expect(preview.resourceEvidence[0]).toMatchObject({ datasetId: "ds-a", fieldIds: ["field-a"], registryRevision: "r1" });
      expect(preview.sourceSha256.grants).toMatch(/^[a-f0-9]{64}$/);
      h.state.resourceRevision = "r2";
      await expect(reconcileOwnerMappingWithRegistry(await owner.readVerifiedActive(ref), principals, { ...h.registry, async bindDataset() { return { ...(await h.registry.bindDataset("app-a", "ds-a")), registryRevision: "r1" }; } })).rejects.toThrow("MIGRATION_RESOURCE_UNRESOLVED");
    } finally { rmSync(root, { recursive: true, force: true }); }
  });
});

// Appended ONLY to the verified disposable wp4-plan test; uses its existing harness.
it('records exact stale-planner predicates without extending freshness or authority',async()=>{
 const fs=await import('node:fs/promises'),path=await import('node:path');
 const physical=process.env.UI_PLATFORM_DATA_PHYSICAL_ROOT,original=process.env.UI_PLATFORM_DATA_ORIGINAL_ROOT;
 if(!physical||!original||await fs.realpath('.')!==await fs.realpath(physical)||await fs.realpath(physical)===await fs.realpath(original))throw Error('PHYSICAL_ISOLATION_REQUIRED');
 const cases:any[]=[];
 for(const kind of ['unchanged','wrong-capability','unissued-copy','mutated-evidence','exact-expiry','policy','principal','session','resource','fact','request','revoked-role','cells','provenance']){
  const h=harness([rule('read','p-read','allow')]),request:AccessRequest=await h.identity.attest({context:h.context,resource:dataset,permissionId:'p-read',operationId:'op',fields:[{fieldId:'field-a',usage:'read'}]});
  let decision=await h.evaluator.planEvidence(request,h.capability),capability=h.capability,currentRequest=request;
  const observed:any[]=[];(globalThis as any)[Symbol.for('stage5.plannerTrace')]=(v:any)=>observed.push(v);
  if(kind==='wrong-capability')capability={};
  if(kind==='unissued-copy')decision=structuredClone(decision);
  if(kind==='mutated-evidence')decision.requestDigest='sha256:changed';
  if(kind==='exact-expiry')h.state.now=new Date(decision.stamp.expiresAt);
  if(kind==='policy')h.state.policyRevision='2';if(kind==='principal')h.state.principalRevision='p2';if(kind==='session')h.state.sessionRevision='s2';if(kind==='resource')h.state.resourceRevision='r2';if(kind==='fact')h.state.factRevision='f2';
  if(kind==='request')currentRequest=await h.identity.attest({...request,operationId:'different'});
  if(kind==='revoked-role'){const a=h.records.find(r=>r.kind==='role-assignment');if(a?.kind!=='role-assignment')throw Error('FIXTURE_MISSING');a.status='inactive';}
  if(kind==='cells'||kind==='provenance'){const s=h.records.find(r=>r.kind==='permission-set');if(s?.kind!=='permission-set')throw Error('FIXTURE_MISSING');s.rules.push(rule('extra',kind==='cells'?'p-read':'p-filter','allow'));}
  let rejected=false;try{await h.evaluator.assertPlannerCurrent(decision,currentRequest,capability);}catch(e){expect((e as Error).message).toBe('PLAN_EVIDENCE_STALE');rejected=true;}finally{delete(globalThis as any)[Symbol.for('stage5.plannerTrace')];}
  expect(rejected,kind).toBe(kind!=='unchanged');const failed=observed.find(e=>e.phase.endsWith('-reject')),first=failed?.checks.find((c:any)=>c.failed)?.name;
  const expected:Record<string,string>={'wrong-capability':'capability.same','unissued-copy':'issued.checksum','mutated-evidence':'issued.checksum','exact-expiry':'issued.expiry',policy:'current.policyRevision',principal:'current.principalRevision',session:'current.sessionRevision',resource:'current.resourceRevision',fact:'current.factRevision',request:'current.requestDigest','revoked-role':'current.effect',cells:'current.evaluatedCells',provenance:'current.provenance'};
  expect(first,kind).toBe(expected[kind]);cases.push({kind,rejected,firstPredicate:first??null,observed});
 }
 await fs.mkdir('diagnostics',{recursive:true});await fs.writeFile(path.resolve('diagnostics/planner-negative-cases.json'),JSON.stringify({cases,scope:'Controlled in-memory harness mutations, not real policy writes; no original source or budgets changed'},null,2));
});
