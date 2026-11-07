import { canonicalChecksum } from "@ui-platform/versioned-definition-registry";
import type { SecurityActivation, SecurityChangeRequest, SecurityDiagnostic, SecurityDocument, SecurityGrantBoundary, SecurityRecord, SecurityRule, SecurityScope } from "../wp1/models.js";
import { securityChecksum, validateSecurityDocument } from "../wp1/validation.js";
import { SecurityDefinitionService } from "../wp1/service.js";
import type { SecurityAdminAuditDraft } from "../wp1/store.js";
import { SecurityAuthorizationEvaluator } from "../wp2/evaluator.js";
import { activeBeneficiaries, actorAdministrativePaths, actorBoundarySignatures, actorRuleSignatures, adminAnchor, applicationScope, boundaryAllowsRule, platformAdminAnchor, platformScope, rulesForChanged } from "./graph.js";
import type { ActivateAdministrationRequest, AdministrationConfiguration, AdministrationIdentityBoundary, AdministrationScopeAuthority, ProvisionApplicationRequest, RecoveryIdentityBoundary, RecoveryRequest } from "./types.js";

const deny = (code: string): SecurityActivation => ({ status: "rejected", diagnostics: [{ code, path: "$", message: "Security administration request denied." }] });
const safeId = (value: unknown): value is string => typeof value === "string" && /^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(value);
const status = (r: SecurityRecord | undefined) => r && "status" in r ? r.status : undefined;
const recordApp = (r: SecurityRecord): string | null => {
  if (r.kind === "role-assignment" || r.kind === "service-assignment") return r.scope.resource.applicationId;
  if (r.kind === "group-membership" || r.kind === "service-use-approval") return r.applicationId;
  if (r.kind === "user" || r.kind === "service" || r.kind === "person-link") return null;
  return r.owner.kind === "application" ? r.owner.applicationId : null;
};
const operationFor = (before: SecurityRecord | undefined, after: SecurityRecord): "create" | "edit" | "assign" | "revoke" | "archive" => {
  if (status(after) === "archived") return "archive";
  if (after.kind === "role-assignment" || after.kind === "group-membership" || after.kind === "service-assignment" || after.kind === "service-use-approval") return after.status === "active" ? "assign" : "revoke";
  return before ? "edit" : "create";
};
const diagnostic = (code: string): SecurityDiagnostic => ({ code, path: "$", message: "Security administration request denied." });

/** WP3 transactional policy gate. WP1's open authoring service remains a development fixture. */
export class SecurityAdministrationService {
  private readonly templateStages = new Map<string, string>();
  private readonly templateLeases = new Map<string, { release(): void }>();
  constructor(
    readonly definitions: SecurityDefinitionService,
    private readonly evaluator: SecurityAuthorizationEvaluator,
    private readonly identity: AdministrationIdentityBoundary,
    private readonly recoveryIdentity: RecoveryIdentityBoundary,
    private readonly scopes: AdministrationScopeAuthority,
    private readonly config: AdministrationConfiguration,
  ) {
    if (process.env.NODE_ENV === "production") throw new Error("WP3_PRODUCTION_IDENTITY_NOT_CONFIGURED");
    definitions.store.protectAdministration();
  }
  private now(): Date { const d = (this.config.clock ?? (() => new Date()))(); if (!Number.isFinite(d.getTime())) throw new Error("TRUSTED_TIME_INVALID"); return d; }
  /** UI, API, CLI and file reconciliation may stage drafts, but staging never grants authority. */
  stage(request: SecurityChangeRequest) {
    const documents=this.definitions.store.snapshot().documents;
    const stamp=this.templateAffected(documents,request) ? this.config.templateAuthority?.capture(request,documents) : undefined;
    const candidate=this.definitions.stage(request);
    if(stamp!==undefined && candidate.activatable)this.templateStages.set(candidate.id,stamp);
    return candidate;
  }
  // Text candidates still stage as drafts; template activation requires the same owning binding.
  stageText(input: Parameters<SecurityDefinitionService["stageText"]>[0]) {
    const candidate=this.definitions.stageText(input),stored=this.definitions.store.candidate(candidate.id);
    if(stored && this.templateAffected(this.definitions.store.snapshot().documents,stored.request)) {
      const stamp=this.config.templateAuthority?.capture(stored.request,this.definitions.store.snapshot().documents);
      if(stamp!==undefined && candidate.activatable)this.templateStages.set(candidate.id,stamp);
    }
    return candidate;
  }
  private templateAffected(documents: readonly SecurityDocument[],request: SecurityChangeRequest): boolean {
    const before=documents.map(d=>d.definition),prepared=this.definitions.prepareActivation(documents as SecurityDocument[],request);
    const after=prepared.after?.map(d=>d.definition)??before;
    return request.changes.some(c=>[before,after].some(graph=>{
      const r=graph.find(r=>r.id===c.document.definition.id);
      return r?.kind==='grant-boundary' && r.permissions.some(p=>p.predicateTemplateIds.length>0) || rulesForChanged(r,graph).some(g=>!!g.rule.where);
    }));
  }
  private templateCurrent(candidateId:string,documents:readonly SecurityDocument[],request:SecurityChangeRequest): boolean {
    if(!this.templateAffected(documents,request))return true;
    const stamp=this.templateStages.get(candidateId);
    if(stamp===undefined)return false;
    const proof=this.config.templateAuthority?.assertCurrent(stamp,request,documents);
    if(proof && typeof proof==='object' && typeof proof.release==='function'){this.templateLeases.set(candidateId,proof);return true;}
    return proof===true;
  }
  private activateBound(candidateId:string,action:()=>SecurityActivation):SecurityActivation {
    try{return action();}finally{const lease=this.templateLeases.get(candidateId);this.templateLeases.delete(candidateId);lease?.release();}
  }
  candidate(id: string) { return this.definitions.candidate(id); }
  audit() { return this.definitions.store.adminAudit(); }

  private target(records: readonly SecurityRecord[], applicationId: string | null): { scope: SecurityScope; permissionId: string } | undefined {
    if (applicationId === null) return { scope: platformScope(this.config.resourceAuthorityId, this.config.systemResourceId), permissionId: this.config.platformAdministratorPermissionId };
    const app = records.find(r => r.kind === "application-security" && r.id === applicationId);
    return app?.kind === "application-security" && app.status === "active" ? { scope: applicationScope(this.config.resourceAuthorityId, applicationId), permissionId: app.requiredAdministratorPermissionId } : undefined;
  }
  private scopeForRecord(r: SecurityRecord, target: SecurityScope): SecurityScope {
    if (r.kind === "role-assignment" || r.kind === "service-assignment") return r.scope;
    if (r.kind === "group-membership" || r.kind === "service-use-approval") return applicationScope(this.config.resourceAuthorityId, r.applicationId);
    return target;
  }
  private checkChange(beforeDocs: SecurityDocument[], afterDocs: SecurityDocument[], request: SecurityChangeRequest, actorId: string, appId: string | null, authority: { scope: SecurityScope; permissionId: string }, reason: string, preflightRevision: string, now: Date, provisioning = false): { diagnostics: SecurityDiagnostic[]; audit?: SecurityAdminAuditDraft } {
    const before = beforeDocs.map(x => x.definition), after = afterDocs.map(x => x.definition);
    const old = new Map(before.map(x => [x.id, x])), next = new Map(after.map(x => [x.id, x]));
    const target = authority;
    if (preflightRevision !== String(request.expectedRevision)) return { diagnostics: [diagnostic("ADMIN_AUTHORITY_STALE")] };
    const paths = actorAdministrativePaths(before, actorId, now, target.scope, target.permissionId, "activate", this.scopes, this.config.resourceAuthorityId);
    if (!paths.length) return { diagnostics: [diagnostic("ADMIN_AUTHORITY_DENIED")] };
    const boundaries = paths.map(p => p.boundary);
    const changed = request.changes.map(c => c.document.definition.id);
    const operations: string[] = [];
    for (const id of changed) {
      const current = old.get(id), proposed = next.get(id);
      if (!proposed) return { diagnostics: [diagnostic("ADMIN_TARGET_MISSING")] };
      const initialBoundary = provisioning && !current && proposed.kind === "grant-boundary" && proposed.owner.kind === "platform";
      if (!initialBoundary && (recordApp(proposed) !== appId || current && recordApp(current) !== appId)) return { diagnostics: [diagnostic("ADMIN_OWNERSHIP_DENIED")] };
      if ("owner" in proposed && proposed.owner.kind === "shared-package") return { diagnostics: [diagnostic("ADMIN_SHARED_PROTECTED")] };
      const operation = operationFor(current, proposed);
      operations.push(operation);
      const scope = initialBoundary ? proposed.scope : this.scopeForRecord(proposed, provisioning ? applicationScope(this.config.resourceAuthorityId, appId!) : target.scope);
      if (!boundaries.some(b => b.operations.includes(operation) && this.scopes.contains(b.scope, scope))) return { diagnostics: [diagnostic("ADMIN_OPERATION_DENIED")] };
      if ((proposed.kind === "service" || proposed.kind === "user" || proposed.kind === "person-link" || proposed.kind === "grant-boundary" && !initialBoundary) && appId !== null) return { diagnostics: [diagnostic("ADMIN_PLATFORM_PROTECTED")] };
      if (proposed.kind === "grant-boundary") {
        if((proposed.permissions.some(p=>p.predicateTemplateIds.length>0) || current?.kind==='grant-boundary' && current.permissions.some(p=>p.predicateTemplateIds.length>0)) &&
          this.config.templateAuthority?.permitsDelegation({actorId,paths,previous:current?.kind==='grant-boundary'?current:undefined,proposed,documents:beforeDocs})!==true) return {diagnostics:[diagnostic('ADMIN_TEMPLATE_DELEGATION_DENIED')]};
        if (!boundaries.some(b => this.scopes.contains(b.scope, proposed.scope))) return { diagnostics: [diagnostic("ADMIN_GRANT_CEILING")] };
        const actorVia = activeBeneficiaries(before, actorId, now, this.config.resourceAuthorityId);
        if (actorVia.some(v => v.kind === proposed.beneficiary.kind && v.id === proposed.beneficiary.id)) return { diagnostics: [diagnostic("ADMIN_SELF_ESCALATION")] };
        for (const permission of proposed.permissions) {
          const synthetic: SecurityRule = { id: proposed.id, permissionId: permission.permissionId, effect: "allow", scope: permission.scope };
          if (!boundaryAllowsRule(boundaries, synthetic, undefined, this.scopes)) return { diagnostics: [diagnostic("ADMIN_GRANT_CEILING")] };
        }
      }
      for (const graph of [before, after]) for (const grant of rulesForChanged(graph === before ? current : proposed, graph)) {
        if (!boundaryAllowsRule(boundaries, grant.rule, grant.scope, this.scopes)) return { diagnostics: [diagnostic("ADMIN_GRANT_CEILING")] };
      }
      if (proposed.kind === "service-use-approval") {
        if (!boundaries.some(b => b.serviceUseApprovalIds.includes(proposed.id))) return { diagnostics: [diagnostic("ADMIN_SERVICE_APPROVAL_DENIED")] };
        for (const p of proposed.permissionCeiling) {
          const synthetic: SecurityRule = { id: proposed.id, permissionId: p.permissionId, effect: "allow", scope: p.scope };
          if (!boundaryAllowsRule(boundaries, synthetic, undefined, this.scopes)) return { diagnostics: [diagnostic("ADMIN_GRANT_CEILING")] };
        }
      }
      if (proposed.kind === "application-security" && current?.kind === "application-security" && proposed.requiredAdministratorPermissionId !== current.requiredAdministratorPermissionId) {
        for (const permissionId of [current.requiredAdministratorPermissionId, proposed.requiredAdministratorPermissionId]) {
          const synthetic: SecurityRule = { id: proposed.id, permissionId, effect: "allow", scope: target.scope };
          if (!boundaryAllowsRule(boundaries, synthetic, undefined, this.scopes)) return { diagnostics: [diagnostic("ADMIN_GRANT_CEILING")] };
        }
      }
    }
    const beforeAccess = actorRuleSignatures(before, actorId, now, this.config.resourceAuthorityId);
    const afterAccess = actorRuleSignatures(after, actorId, now, this.config.resourceAuthorityId);
    const beforeBoundaries = actorBoundarySignatures(before, actorId, now, this.config.resourceAuthorityId);
    const afterBoundaries = actorBoundarySignatures(after, actorId, now, this.config.resourceAuthorityId);
    if ([...afterAccess.allows].some(x => !beforeAccess.allows.has(x)) || [...beforeAccess.denies].some(x => !afterAccess.denies.has(x)) || [...afterBoundaries].some(x => !beforeBoundaries.has(x))) return { diagnostics: [diagnostic("ADMIN_SELF_ESCALATION")] };
    for (const previous of before.filter((r): r is Extract<SecurityRecord, { kind: "application-security" }> => r.kind === "application-security" && r.status === "active")) {
      if (next.get(previous.id)?.kind !== "application-security" || status(next.get(previous.id)) !== "active") return { diagnostics: [diagnostic("LAST_ADMIN_REQUIRED")] };
    }
    for (const app of after.filter((r): r is Extract<SecurityRecord, { kind: "application-security" }> => r.kind === "application-security" && r.status === "active")) {
      if (!adminAnchor(after, app.id, this.config.resourceAuthorityId, now, this.scopes)) return { diagnostics: [diagnostic("LAST_ADMIN_REQUIRED")] };
    }
    if (platformAdminAnchor(before, now, this.config.resourceAuthorityId, this.config.systemResourceId, this.config.platformAdministratorPermissionId, this.scopes) &&
        !platformAdminAnchor(after, now, this.config.resourceAuthorityId, this.config.systemResourceId, this.config.platformAdministratorPermissionId, this.scopes)) return { diagnostics: [diagnostic("LAST_PLATFORM_ADMIN_REQUIRED")] };
    return { diagnostics: [], audit: { kind: "administration", operation: [...new Set(operations)].sort().join("+"), actorId, targetIds: changed, applicationId: appId, authorityPath: [...new Set(paths.flatMap(p => [p.via.assignmentId, p.boundary.id]))].sort(), reason, beforeDigest: canonicalChecksum(beforeDocs), afterDigest: canonicalChecksum(afterDocs) } };
  }

  /** Only an already-authorized Platform administrator can provision the first scope.
   * A five-record, admin-only bundle prevents this exception becoming a general
   * cross-owner activation API. Existing users/capabilities must already be authoritative. */
  async provisionApplication(input: ProvisionApplicationRequest): Promise<SecurityActivation> {
    try {
      if (!safeId(input.applicationId) || !safeId(input.administratorUserId) || !safeId(input.administratorAssignmentId) ||
          !safeId(input.candidateId) || !safeId(input.checksum) || !Number.isSafeInteger(input.expectedRevision) || !input.reason?.trim()) return deny("PROVISION_REQUEST_INVALID");
      const verified = await this.identity.verify(input.context);
      if (!safeId(verified.actorId)) return deny("ADMIN_IDENTITY_INVALID");
      const owner = this.config.applicationProvisioning?.resolve(input.applicationId);
      const expected = applicationScope(this.config.resourceAuthorityId, input.applicationId).resource;
      if (!owner || owner.status !== "active" || !owner.revision || canonicalChecksum(owner.resource) !== canonicalChecksum(expected) ||
          owner.owner.kind !== "application" || owner.owner.applicationId !== input.applicationId) return deny("PROVISION_OWNER_INVALID");
      const ownerDigest = canonicalChecksum(owner);
      const candidate = this.definitions.store.candidate(input.candidateId);
      if (!candidate || candidate.candidate.checksum !== input.checksum || candidate.request.expectedRevision !== input.expectedRevision) return deny("ADMIN_CANDIDATE_INVALID");
      const snapshot = this.definitions.store.snapshot();
      if (snapshot.documents.some(d => d.definition.id === input.applicationId)) return deny("PROVISION_ALREADY_EXISTS");
      if (snapshot.revision !== input.expectedRevision) return { status: "conflict", diagnostics: [diagnostic("REVISION_CONFLICT")] };
      const target = this.target(snapshot.documents.map(d => d.definition), null)!;
      const authorization = await this.evaluator.authorize(this.identity.attestDecisionRequest(input.context, target.scope.resource, target.permissionId, `security-provision:${input.candidateId}`));
      if (authorization.effect !== "allow" || authorization.stamp.policyRevision !== String(input.expectedRevision) ||
          authorization.stamp.principalRevision !== verified.principalRevision || authorization.stamp.sessionRevision !== verified.sessionRevision) return deny("ADMIN_AUTHORITY_DENIED");
      if (this.config.resourceReferences) {
        const prepared = this.definitions.prepareActivation(snapshot.documents, candidate.request);
        if (!prepared.after || prepared.diagnostics.length) return { status: "rejected", diagnostics: prepared.diagnostics };
        try { if ((await this.config.resourceReferences.validate(prepared.after)).revision !== authorization.stamp.resourceRevision) return deny("RESOURCE_REFERENCE_STALE"); }
        catch { return deny("RESOURCE_REFERENCE_INVALID"); }
      }
      if (canonicalChecksum(await this.identity.verify(input.context)) !== canonicalChecksum(verified)) return deny("ADMIN_IDENTITY_STALE");
      const now = this.now();
      return this.activateBound(input.candidateId,()=>this.definitions.store.activate(input.candidateId, input.checksum, verified.actorId, (before, request) => {
        if(!this.templateCurrent(input.candidateId,before,request))return {diagnostics:[diagnostic(this.config.templateAuthority?'ADMIN_TEMPLATE_BINDING_STALE':'ADMIN_GRANT_CEILING')]};
        const liveOwner = this.config.applicationProvisioning?.resolve(input.applicationId);
        if (!liveOwner || canonicalChecksum(liveOwner) !== ownerDigest) return { diagnostics: [diagnostic("PROVISION_OWNER_STALE")] };
        const old = before.map(d => d.definition);
        const changes = request.changes.map(c => c.document.definition);
        if (changes.length !== 5 || changes.some(r => old.some(p => p.id === r.id))) return { diagnostics: [diagnostic("PROVISION_NEW_RECORDS_REQUIRED")] };
        const app = changes.find(r => r.kind === "application-security");
        const role = changes.find(r => r.kind === "role");
        const set = changes.find(r => r.kind === "permission-set");
        const assignment = changes.find(r => r.kind === "role-assignment");
        const boundary = changes.find(r => r.kind === "grant-boundary");
        const scope = applicationScope(this.config.resourceAuthorityId, input.applicationId);
        const exactScope = (s: SecurityScope) => canonicalChecksum(s) === canonicalChecksum(scope);
        if (app?.kind !== "application-security" || app.id !== input.applicationId || app.status !== "active" || app.sharedPackages.length ||
            role?.kind !== "role" || role.status !== "active" || role.permissionSets.length !== 1 || role.permissionSets[0]!.id !== set?.id || role.permissionSets[0]!.sharedPackage ||
            set?.kind !== "permission-set" || set.status !== "active" || set.includes.length || set.rules.length !== 1 ||
            set.rules[0]!.permissionId !== app.requiredAdministratorPermissionId || set.rules[0]!.effect !== "allow" || !exactScope(set.rules[0]!.scope) || set.rules[0]!.where || set.rules[0]!.fields ||
            assignment?.kind !== "role-assignment" || assignment.id !== input.administratorAssignmentId || assignment.userId !== input.administratorUserId ||
            assignment.roleId !== role.id || assignment.status !== "active" || assignment.endsAt !== null || !exactScope(assignment.scope) ||
            boundary?.kind !== "grant-boundary" || boundary.owner.kind !== "platform" || boundary.status !== "active" || !exactScope(boundary.scope) ||
            boundary.beneficiary.kind !== "role" || boundary.beneficiary.id !== role.id || boundary.serviceUseApprovalIds.length ||
            boundary.permissions.length !== 1 || boundary.permissions[0]!.permissionId !== app.requiredAdministratorPermissionId || !exactScope(boundary.permissions[0]!.scope) || boundary.permissions[0]!.predicateTemplateIds.length ||
            !boundary.operations.includes("activate") || !boundary.operations.includes("assign") ||
            !old.some(r => r.kind === "user" && r.id === input.administratorUserId && r.status === "active") ||
            !old.some(r => r.kind === "permission" && r.id === app.requiredAdministratorPermissionId && r.owner.kind === "platform" && r.status === "active" && r.lifecycle === "active")) return { diagnostics: [diagnostic("PROVISION_SCOPE_INVALID")] };
        const prepared = this.definitions.prepareActivation(before, request);
        if (!prepared.after || prepared.diagnostics.length) return prepared;
        const anchor = adminAnchor(prepared.after.map(d => d.definition), input.applicationId, this.config.resourceAuthorityId, now, this.scopes);
        if (!anchor || anchor.userId !== input.administratorUserId || anchor.assignmentId !== input.administratorAssignmentId || anchor.boundaryId !== boundary.id) return { diagnostics: [diagnostic("LAST_ADMIN_REQUIRED")] };
        const checked = this.checkChange(before, prepared.after, request, verified.actorId, input.applicationId, target, input.reason!, authorization.stamp.policyRevision, now, true);
        // Delegating operations is bounded independently from delegating permissions.
        const paths = actorAdministrativePaths(old, verified.actorId, now, target.scope, target.permissionId, "activate", this.scopes, this.config.resourceAuthorityId);
        if (!boundary.operations.every(op => paths.some(p => p.boundary.operations.includes(op) && this.scopes.contains(p.boundary.scope, boundary.scope)))) return { diagnostics: [diagnostic("ADMIN_OPERATION_DENIED")] };
        return { after: prepared.after, diagnostics: checked.diagnostics, adminAudit: checked.audit && { ...checked.audit, operation: "provision-application" } };
      }));
    } catch { return deny("ADMIN_AUTHORITY_UNAVAILABLE"); }
  }
  async activate(input: ActivateAdministrationRequest): Promise<SecurityActivation> {
    try {
      if (!safeId(input.candidateId) || !safeId(input.checksum) || !Number.isSafeInteger(input.expectedRevision) || !input.reason?.trim()) return deny("ADMIN_REQUEST_INVALID");
      const verified = await this.identity.verify(input.context);
      if (!safeId(verified.actorId)) return deny("ADMIN_IDENTITY_INVALID");
      const candidate = this.definitions.store.candidate(input.candidateId);
      if (!candidate || candidate.candidate.checksum !== input.checksum || candidate.request.expectedRevision !== input.expectedRevision) return deny("ADMIN_CANDIDATE_INVALID");
      const snapshot = this.definitions.store.snapshot();
      if (snapshot.revision !== input.expectedRevision) return { status: "conflict", diagnostics: [diagnostic("REVISION_CONFLICT")] };
      const appTarget = this.target(snapshot.documents.map(x => x.definition), input.applicationId);
      if (!appTarget) return deny("ADMIN_TARGET_INVALID");
      let target = appTarget;
      let authorization = await this.evaluator.authorize(this.identity.attestDecisionRequest(input.context, target.scope.resource, target.permissionId, `security-activate:${input.candidateId}`));
      if (authorization.effect !== "allow" && input.applicationId !== null) {
        target = this.target(snapshot.documents.map(x => x.definition), null)!;
        authorization = await this.evaluator.authorize(this.identity.attestDecisionRequest(input.context, target.scope.resource, target.permissionId, `security-activate:${input.candidateId}`));
      }
      if (authorization.effect !== "allow" || authorization.stamp.policyRevision !== String(input.expectedRevision) || authorization.stamp.principalRevision !== verified.principalRevision || authorization.stamp.sessionRevision !== verified.sessionRevision) return deny("ADMIN_AUTHORITY_DENIED");
      if (this.config.resourceReferences) {
        const prepared = this.definitions.prepareActivation(snapshot.documents, candidate.request);
        if (!prepared.after || prepared.diagnostics.length) return { status: "rejected", diagnostics: prepared.diagnostics };
        try {
          const proof = await this.config.resourceReferences.validate(prepared.after);
          if (proof.revision !== authorization.stamp.resourceRevision) return deny("RESOURCE_REFERENCE_STALE");
        } catch { return deny("RESOURCE_REFERENCE_INVALID"); }
      }
      const again = await this.identity.verify(input.context);
      if (canonicalChecksum(again) !== canonicalChecksum(verified)) return deny("ADMIN_IDENTITY_STALE");
      const now = this.now();
      return this.activateBound(input.candidateId,()=>this.definitions.store.activate(input.candidateId, input.checksum, verified.actorId, (before, request) => {
        if(!this.templateCurrent(input.candidateId,before,request))return {diagnostics:[diagnostic(this.config.templateAuthority?'ADMIN_TEMPLATE_BINDING_STALE':'ADMIN_GRANT_CEILING')]};
        const parsed = this.definitions.prepareActivation(before, request);
        if (!parsed.after || parsed.diagnostics.length) return parsed;
        const checked = this.checkChange(before, parsed.after, request, verified.actorId, input.applicationId, target, input.reason!, authorization.stamp.policyRevision, now);
        return { after: parsed.after, diagnostics: checked.diagnostics, adminAudit: checked.audit };
      }));
    } catch { return deny("ADMIN_AUTHORITY_UNAVAILABLE"); }
  }

  /** Recovery can only restore a non-expiring admin assignment, never business permissions. */
  async recover(input: RecoveryRequest): Promise<SecurityActivation> {
    try {
      const proof = await this.recoveryIdentity.verify(input.context);
      if (!proof.strong || proof.deploymentId !== this.config.deploymentId || proof.capabilityId !== this.config.recoveryCapabilityId || !safeId(proof.operatorId) || !input.reason?.trim() || !safeId(input.applicationId)) return deny("RECOVERY_DENIED");
      const parsed = validateSecurityDocument(input.document);
      if (!parsed.document || parsed.diagnostics.length) return deny("RECOVERY_DOCUMENT_INVALID");
      const r = parsed.document.definition;
      if (r.kind !== "role-assignment" && r.kind !== "group-membership") return deny("RECOVERY_SCOPE_DENIED");
      if (r.status !== "active" || r.endsAt !== null || r.kind === "role-assignment" && r.scope.resource.applicationId !== input.applicationId || r.kind === "group-membership" && r.applicationId !== input.applicationId) return deny("RECOVERY_SCOPE_DENIED");
      const snapshot = this.definitions.store.snapshot();
      if (snapshot.revision !== input.expectedRevision) return { status: "conflict", diagnostics: [diagnostic("REVISION_CONFLICT")] };
      const old = snapshot.documents.find(x => x.definition.id === r.id);
      const stage = this.definitions.stage({ changes: [{ document: parsed.document, ...(old ? { expectedChecksum: securityChecksum(old) } : {}) }], expectedRevision: input.expectedRevision, source: "api", actorId: proof.operatorId, idempotencyKey: input.idempotencyKey, reason: input.reason });
      if (!stage.activatable) return deny("RECOVERY_CANDIDATE_INVALID");
      const now = this.now();
      return this.definitions.store.activate(stage.id, stage.checksum, proof.operatorId, (before, request) => {
        const prepared = this.definitions.prepareActivation(before, request);
        if (!prepared.after || prepared.diagnostics.length) return prepared;
        const beforeRecords = before.map(x => x.definition), afterRecords = prepared.after.map(x => x.definition);
        const app = afterRecords.find(x => x.kind === "application-security" && x.id === input.applicationId);
        if (app?.kind !== "application-security" || adminAnchor(beforeRecords, input.applicationId, this.config.resourceAuthorityId, now, this.scopes)) return { diagnostics: [diagnostic("RECOVERY_NOT_REQUIRED")] };
        const grants = rulesForChanged(r, afterRecords);
        if (!grants.length || grants.some(x => x.rule.effect === "allow" && x.rule.permissionId !== app.requiredAdministratorPermissionId)) return { diagnostics: [diagnostic("RECOVERY_BUSINESS_GRANT_DENIED")] };
        if (!adminAnchor(afterRecords, input.applicationId, this.config.resourceAuthorityId, now, this.scopes)) return { diagnostics: [diagnostic("LAST_ADMIN_REQUIRED")] };
        return { after: prepared.after, diagnostics: [], adminAudit: { kind: "recovery", operation: "restore-administrator", actorId: proof.operatorId, targetIds: [r.id], applicationId: input.applicationId, authorityPath: [proof.capabilityId], reason: input.reason, beforeDigest: canonicalChecksum(before), afterDigest: canonicalChecksum(prepared.after) } };
      });
    } catch { return deny("RECOVERY_AUTHORITY_UNAVAILABLE"); }
  }

  async inspect(request: import("../wp2/types.js").AccessRequest, audience: unknown): Promise<import("../wp2/types.js").AuthorizationDecision> {
    const actor = await this.identity.verify(audience);
    const snapshot = this.definitions.store.snapshot();
    const target = this.target(snapshot.documents.map(x => x.definition), request.resource.applicationId);
    if (!target) return this.evaluator.authorize(request);
    const capability = await this.evaluator.authorize(this.identity.attestDecisionRequest(audience, target.scope.resource, target.permissionId, `security-inspect:${request.operationId}`));
    if (capability.effect !== "allow" || capability.stamp.principalRevision !== actor.principalRevision) return this.evaluator.authorize(request);
    return this.evaluator.explain(request, audience);
  }
}
