/** WP0 PROPOSAL ONLY. No production exports, implementation, or runtime trust claim.
 * Companion semantics: ../iam-wp0-contract-reconciliation.md and file-formats.md.
 * JSON validation, trusted factories and transactional invariants are mandatory.
 */
export type Id = string; // Nonempty opaque owner-issued permanent ID; never a name.
export type Instant = string; // Validated UTC RFC 3339 instant.
export type Revision = string; // Opaque authority-issued revision, never client-authored.
export type Digest = string; // Algorithm-qualified canonical-content digest.
export type Lifecycle = "active" | "inactive" | "archived";
export type PrincipalRef =
  | { type: "user"; userId: Id }
  | { type: "service"; serviceId: Id }
  | { type: "system"; systemId: Id };
export type Owner =
  | { kind: "application"; applicationId: Id }
  | { kind: "platform" } // Definition ownership, distinct from System principal.
  | { kind: "shared-package"; packageId: Id };
export interface DefinitionBase {
  id: Id;
  key: string;
  name: string;
  description?: string;
  status: Lifecycle;
  owner: Owner; // Server verifies ownership; file does not grant it.
}
export interface UserPrincipal {
  id: Id;
  displayName: string;
  status: Lifecycle;
  // Authentication bindings and sessions are managed records, not public files.
}
/** Platform-managed real principal, optionally authorized for an Application. */
export interface ServicePrincipal {
  kind: "service";
  id: Id;
  displayName: string;
  status: Lifecycle;
  applicationId?: Id;
}
/** Portable desired configuration; target deployment provisions a new real Service. */
export interface ServiceRequirement extends DefinitionBase {
  kind: "service-requirement";
  owner: { kind: "application"; applicationId: Id };
  executionCapabilityIds: Id[];
  requestedPermissionSets: SetReference[];
}
export interface SystemPrincipal {
  id: Id;
  status: Lifecycle;
  workloadId: string;
  capabilityProfileId: Id; // Platform-owned, explicit, protected; no wildcard bypass.
}
export interface AuthenticationBinding {
  id: Id;
  principal: PrincipalRef;
  provider: string;
  issuer: string;
  subject: string;
  status: Lifecycle;
}
export type RecordKey = { type: "string"; value: string } | { type: "number"; value: number };
export interface PersonLink {
  id: Id;
  userId: Id;
  applicationId: Id;
  datasetId: Id;
  recordKey: RecordKey;
}
export type ResourceKind = "system" | "application" | "dataset" | "record" | "field"
  | "page" | "form" | "trigger" | "workflow" | "artifact" | "security-definition";
export interface ResourceRef {
  authorityId: Id;
  applicationId: Id | null; // Null only for system-owned roots.
  kind: ResourceKind;
  id: Id;
  parentId?: Id; // Required for fields/records; owner registry validates hierarchy.
  recordKey?: RecordKey; // Required iff kind=record.
}
export interface ResourceDescriptor {
  ref: ResourceRef;
  parent?: ResourceRef;
  name: string;
  aliases: string[];
  status: "active" | "retired";
  registryRevision: Revision;
}
export interface AppliedDatasetBinding {
  resource: ResourceRef;
  environmentId: Id;
  schemaVersion: number;
  schemaDigest: Digest;
  registryRevision: Revision;
  physical: { appId: string; dataset: string; namespace?: string };
  fields: Array<{ fieldId: Id; key: string }>;
}
export interface ResourceRegistry {
  resolve(ref: ResourceRef): Promise<ResourceDescriptor>;
  resolveName(input: { applicationId: Id; kind: ResourceKind; name: string }): Promise<ResourceRef>;
  bindDataset(input: { applicationId: Id; datasetId: Id; environmentId: Id }): Promise<AppliedDatasetBinding>;
  // Registration remains an owner-registry operation, not an I-AM mutation.
}
export interface Scope { resource: ResourceRef; descendants: boolean }
export interface PermissionDefinition {
  kind: "permission";
  id: Id;
  owner: Owner;
  name: string; // e.g. dataset.records.view; Dataset name is a display alias.
  applicableKinds: ResourceKind[];
  lifecycle: "active" | "deprecated" | "retired";
}
export type Scalar = string | number | boolean | null;
export type Operand =
  | { kind: "literal"; value: Scalar | Scalar[] }
  | { kind: "field"; fieldId: Id }
  | { kind: "fact"; factId: Id }; // Trusted registered provider, not request JSON facts.
export type Predicate =
  | { op: "true" | "false" }
  | { op: "and" | "or"; args: Predicate[] }
  | { op: "not"; arg: Predicate }
  | { op: "eq" | "ne" | "in" | "gt" | "gte" | "lt" | "lte"; left: Operand; right: Operand };
export interface PolicyRule {
  id: Id;
  permissionId: Id;
  effect: "allow" | "deny";
  scope: Scope;
  fields?: Id[]; // Absent=all applicable fields; [] invalid. IDs, never physical keys.
  where?: Predicate; // Absent=true. Null/malformed is invalid, never unrestricted.
}
export interface SetReference {
  id: Id;
  sharedPackage?: { packageId: Id; revision: Revision; digest: Digest };
}
export interface PermissionSet extends DefinitionBase {
  kind: "permission-set";
  includes: SetReference[];
  rules: PolicyRule[];
}
export interface Role extends DefinitionBase { kind: "role"; permissionSets: SetReference[] }
export interface Group extends DefinitionBase {
  kind: "group";
  owner: { kind: "application"; applicationId: Id };
  permissionSets: SetReference[];
}
export interface AssignmentBase {
  id: Id;
  status: Lifecycle;
  startsAt: Instant;
  endsAt: Instant | null;
}
export interface RoleAssignment extends AssignmentBase {
  kind: "role-assignment";
  userId: Id;
  roleId: Id;
  scope: Scope;
}
export interface GroupMembership extends Omit<AssignmentBase, "startsAt"> {
  kind: "group-membership";
  applicationId: Id;
  userId: Id;
  groupId: Id;
  startsAt: Instant | null;
}
export interface ServiceAssignment extends AssignmentBase {
  kind: "service-assignment";
  serviceId: Id;
  permissionSet: SetReference;
  scope: Scope;
}
// Deliberately no UserPermissionSetAssignment or Role/Group nesting contract.
export interface GrantBoundary extends DefinitionBase {
  kind: "grant-boundary";
  beneficiary: { kind: "role" | "group"; id: Id };
  scope: Scope;
  operations: Array<"create" | "edit" | "assign" | "revoke" | "activate" | "archive">;
  permissions: Array<{ permissionId: Id; scope: Scope; predicateTemplateIds: Id[] }>;
  serviceUseApprovalIds: Id[];
  // Creation/amendment requires a separately protected grant-boundary authority.
}
export interface ServiceUseApproval extends AssignmentBase {
  kind: "service-use-approval";
  applicationId: Id;
  serviceId: Id;
  executable: ResourceRef; // Trigger or Workflow only.
  executableDigest: Digest;
  executionCapabilityId: Id;
  allowedInitiatorScope: Scope;
  // Narrow execution permission envelope; intersect with Service assignments.
  permissionCeiling: Array<{ permissionId: Id; scope: Scope }>;
}
export type ExecutionIdentity =
  | { mode: "inherit" }
  | { mode: "service"; serviceId: Id; approvalId: Id; executionCapabilityId: Id };
export interface ApplicationSecurity extends DefinitionBase {
  kind: "application-security";
  owner: { kind: "application"; applicationId: Id };
  requiredAdministratorPermissionId: Id;
  sharedPackages: Array<{ packageId: Id; revision: Revision; digest: Digest }>;
}
/** Exported as a request for later Service provisioning, never as a principal. */
export interface BlueprintServiceRequirement {
  sourceExecutableId: Id;
  executionCapabilityId: Id;
  suggestedServiceKey?: string;
}
export type BlueprintSecurityDefinition = PermissionDefinition | PermissionSet | Role | Group | ApplicationSecurity | ServiceRequirement;
/** I-AM data contract consumed by Blueprint's own manifest/provider; not an I-AM exporter. */
export interface BlueprintSecuritySection {
  formatVersion: 1;
  sourceApplicationId: Id;
  definitions: BlueprintSecurityDefinition[]; // Application-owned source only.
  platformDependencies: Array<{ id: Id; kind: "permission" | "permission-set" | "role"; revision: Revision; digest: Digest }>;
  sharedPackageDependencies: Array<{ packageId: Id; revision: Revision; digest: Digest }>;
  serviceRequirements: BlueprintServiceRequirement[];
  // No Users, Person links, membership/Role/Service assignments, Service principals,
  // Service-use approvals, grant boundaries, sessions, credentials or active policy.
}
export interface BlueprintSecurityImportValidation {
  sourceDigest: Digest;
  targetApplicationId: Id;
  newIds: Array<{ sourceId: Id; targetId: Id }>;
  resolvedPlatformDependencies: Array<{ id: Id; revision: Revision; digest: Digest }>;
  unresolvedReferences: Array<{ sourceId: Id; reasonCode: string }>;
  serviceRequirements: BlueprintServiceRequirement[];
  status: "blocked" | "ready-to-stage"; // Blueprint stages through I-AM; import never activates alone.
}
export type SecurityDefinition = PermissionDefinition | PermissionSet | Role | Group | ServiceRequirement
  | RoleAssignment | GroupMembership | ServiceAssignment
  | GrantBoundary | ServiceUseApproval | ApplicationSecurity;
export interface DefinitionDocument {
  format: "ui-platform.security";
  formatVersion: 1;
  definition: SecurityDefinition;
}

declare const verifiedSecurityContext: unique symbol;
/** In-process opaque handle issued/validated by trusted host; not deserializable proof. */
export interface TrustedSecurityContext {
  readonly [verifiedSecurityContext]: true;
  readonly handleId: Id;
  readonly principal: PrincipalRef;
  readonly sessionId?: Id;
  readonly credentialBindingId: Id;
  readonly assurance: { level: string; authenticatedAt: Instant; methods: readonly string[] };
}
export interface AuthenticationBoundary {
  authenticate(input: { credential: string; audience: string }): Promise<TrustedSecurityContext>;
  assertValid(context: TrustedSecurityContext, requiredAssurance?: string): Promise<void>;
  // Provider adapter supplies proofs; centralized boundary resolves principal/session status.
}
declare const verifiedRecoveryContext: unique symbol;
/** Issued only for deployment-designated operators by the trusted platform boundary.
 * This is neither an Application Role/Group nor an automatically seeded account.
 */
export interface TrustedRecoveryContext {
  readonly [verifiedRecoveryContext]: true;
  readonly operator: TrustedSecurityContext;
  readonly deploymentId: Id;
  readonly recoveryCapabilityId: Id;
  readonly assurance: { level: "strong"; authenticatedAt: Instant; methods: readonly string[] };
}
export interface RecoveryBoundary {
  authenticateRecovery(input: { credential: string; deploymentId: Id }): Promise<TrustedRecoveryContext>;
  bootstrapOrRepair(input: {
    context: TrustedRecoveryContext;
    applicationId: Id;
    expectedPolicyRevision: Revision;
    reason: string;
    idempotencyKey: string;
  }): Promise<ActivationResult>;
  // Must write a durable recovery audit record and establish valid last-admin coverage.
}
export interface DelegationStep {
  id: Id;
  from: PrincipalRef;
  to: PrincipalRef;
  executable: ResourceRef;
  executableDigest: Digest;
  approvalId: Id;
  executionCapabilityId: Id;
  decisionId: Id;
  policyRevision: Revision;
  occurredAt: Instant;
}
export interface OperationContextV2 {
  identity: { operationId: Id; rootOperationId: Id; parentOperationId?: Id; correlationId: Id };
  security: {
    initiator: PrincipalRef;
    executor: TrustedSecurityContext;
    chain: readonly DelegationStep[];
  };
  target: ResourceRef;
  source: { type: "ui" | "form" | "api" | "trigger" | "workflow" | "import" | "sync" | "system"; resourceId?: Id };
  operation: { type: "query" | "insert" | "update" | "delete"; initiatedAt: Instant };
  lifecycle: { phase: string; operationDepth: number; triggerDepth: number };
  transaction: { transactionId?: Id; state: "none" | "active" | "committed" | "rolledBack" };
  authorization: { decisionIds: Id[]; policyRevision?: Revision };
  behavior: { atomic: true; unauthorizedWriteBehavior: "reject" };
}
export interface DecisionStamp {
  authorityId: Id;
  policyRevision: Revision;
  principalRevision: Revision;
  sessionRevision: Revision;
  resourceRevision: Revision;
  factRevision: Revision;
  evaluatedAt: Instant;
  expiresAt: Instant; // Freshness upper bound, never an independent cache authority.
}
export interface ProvenancePath {
  assignmentId: Id;
  via: Array<{ kind: "role" | "group" | "permission-set" | "service-assignment" | "system-profile"; id: Id }>;
  ruleId: Id;
  effect: "allow" | "deny";
  applicable: boolean;
  reasonCode?: string;
}
export interface FieldUse {
  fieldId: Id;
  usage: "read" | "write" | "filter" | "sort" | "group" | "aggregate" | "join" | "export";
}
export interface AccessRequest {
  context: TrustedSecurityContext;
  resource: ResourceRef;
  permissionId: Id;
  operationId: Id;
  fields: FieldUse[];
  records?: Array<{ key?: RecordKey; before?: Record<Id, unknown>; after?: Record<Id, unknown> }>;
  // Only trusted DOE supplies record snapshots; HTTP caller facts are not accepted.
}
export interface DataEnforcementPlan {
  rowPredicate: Predicate;
  fieldPredicates: Array<{ fieldId: Id; read: Predicate; write: Predicate }>;
  approvedInferenceFields: Id[];
  appliedBinding: AppliedDatasetBinding;
  requiresFinalWriteCheck: boolean;
}
export type AuthorizationDecisionV2 = {
  contractVersion: 2;
  decisionId: Id;
  requestDigest: Digest;
  stamp: DecisionStamp;
  provenance: ProvenancePath[];
} & (
  | { effect: "deny"; reasonCode: string }
  | { effect: "allow"; enforcement: { kind: "resource" } | { kind: "dataset"; plan: DataEnforcementPlan } }
);
export interface IamDecisionServiceV2 {
  authorize(request: AccessRequest): Promise<AuthorizationDecisionV2>;
  can(request: AccessRequest): Promise<{ allowed: boolean; conditional: boolean; decisionId: Id }>;
  canAny(requests: AccessRequest[]): Promise<{ allowed: boolean; conditional: boolean; decisionIds: Id[] }>;
  explain(request: AccessRequest, audience: TrustedSecurityContext): Promise<AuthorizationDecisionV2>;
  assertCurrent(decision: AuthorizationDecisionV2, context: TrustedSecurityContext): Promise<void>;
}

export interface Diagnostic { code: string; path: string; message: string; severity: "error" | "warning" }
export interface DefinitionChange {
  artifactId: Id;
  expectedChecksum: Digest | null; // Null only for creation.
  document: DefinitionDocument;
}
export interface ChangeRequest {
  context: TrustedSecurityContext;
  source: "ui" | "cli" | "text-reconcile" | "api";
  applicationId: Id | null;
  expectedPolicyRevision: Revision;
  changes: DefinitionChange[];
  reason?: string;
  idempotencyKey: string;
}
export interface Candidate {
  id: Id;
  checksum: Digest;
  basePolicyRevision: Revision;
  diagnostics: Diagnostic[];
  activatable: boolean; // Advisory until all checks repeat inside activation transaction.
}
export type ActivationResult =
  | { status: "activated"; changeId: Id; policyRevision: Revision; auditEventId: Id }
  | { status: "rejected" | "conflict"; diagnostics: Diagnostic[] }
  | { status: "unknown"; changeId: Id }; // Query status; do not blindly retry/revert.
export interface SecurityDefinitionService {
  validate(request: ChangeRequest): Promise<Candidate>;
  stage(request: ChangeRequest): Promise<Candidate>;
  reconcile(request: ChangeRequest): Promise<Candidate>; // Same pipeline, snapshots file edits.
  activate(input: {
    context: TrustedSecurityContext;
    candidateId: Id;
    expectedChecksum: Digest;
    expectedPolicyRevision: Revision;
    idempotencyKey: string;
    reason?: string;
  }): Promise<ActivationResult>;
  activationStatus(changeId: Id, context: TrustedSecurityContext): Promise<ActivationResult>;
  // Archive/inactive transitions are document changes; hard deletion only for proven unused drafts.
}
export interface PrincipalAdministrationService {
  // Same security-validation/transaction/audit pipeline; managed records are not application files.
  saveUser(input: {
    context: TrustedSecurityContext; user: UserPrincipal;
    expectedRevision: Revision; reason?: string; idempotencyKey: string;
  }): Promise<ActivationResult>;
  saveService(input: {
    context: TrustedSecurityContext; service: ServicePrincipal;
    expectedRevision: Revision; reason?: string; idempotencyKey: string;
  }): Promise<ActivationResult>;
  bindIdentity(input: {
    context: TrustedSecurityContext; binding: AuthenticationBinding;
    expectedRevision: Revision; reason?: string; idempotencyKey: string;
  }): Promise<ActivationResult>;
  linkPerson(input: {
    context: TrustedSecurityContext; link: PersonLink;
    expectedRevision: Revision; idempotencyKey: string;
  }): Promise<ActivationResult>;
  unlinkPerson(input: {
    context: TrustedSecurityContext; linkId: Id;
    expectedRevision: Revision; idempotencyKey: string;
  }): Promise<ActivationResult>;
  revokeSession(input: {
    context: TrustedSecurityContext; sessionId: Id; reason?: string;
    idempotencyKey: string;
  }): Promise<ActivationResult>;
}
export interface SecurityAuditEvent {
  id: Id;
  kind: "configuration" | "privileged-operation" | "deny" | "delegation" | "recovery";
  occurredAt: Instant;
  actor: PrincipalRef;
  initiator: PrincipalRef;
  chain: DelegationStep[];
  scope: Scope;
  operationId?: Id;
  decisionId?: Id;
  changeId?: Id;
  beforeRevision?: Revision;
  afterRevision?: Revision;
  protectedDiffRef?: Id; // Encrypted/access-controlled old/new values, no credentials.
  reason?: string;
  outcome: "denied" | "activated" | "not-committed" | "joined" | "committed" | "unknown";
}
