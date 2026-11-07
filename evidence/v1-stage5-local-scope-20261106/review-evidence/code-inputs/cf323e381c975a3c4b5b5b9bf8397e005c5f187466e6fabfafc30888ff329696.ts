import type { SecurityPredicate, SecurityResourceRef, SecurityScope, SecurityRule, SecurityGrantBoundary, SecurityChangeRequest, SecurityDocument } from "../wp1/models.js";
import type { AccessRequest } from "../wp2/types.js";

/** The host verifies opaque handles; IDs or assurance supplied in request JSON are never credentials. */
export interface AdministrationIdentityBoundary {
  verify(context: unknown): Promise<{ actorId: string; principalRevision: string; sessionRevision: string }>;
  attestDecisionRequest(context: unknown, resource: SecurityResourceRef, permissionId: string, operationId: string): AccessRequest;
}
export interface RecoveryIdentityBoundary {
  verify(context: unknown): Promise<{ operatorId: string; deploymentId: string; strong: true; capabilityId: string }>;
}
/** Trusted resource owner adapter. Unknown ancestry or predicate templates must return false. */
export interface AdministrationScopeAuthority {
  contains(ceiling: SecurityScope, requested: SecurityScope): boolean;
  permitsPredicate(templateIds: readonly string[], predicate: SecurityPredicate): boolean;
  /** Full-rule validation is mandatory for predicate-bearing administration. No expression-only fallback. */
  permitsTemplateRule?(input: { rule: SecurityRule; boundary: SecurityGrantBoundary; permission: SecurityGrantBoundary["permissions"][number]; assignmentScope?: SecurityScope }): boolean;
}
export interface AdministrationConfiguration {
  resourceAuthorityId: string;
  systemResourceId: string;
  platformAdministratorPermissionId: string;
  recoveryCapabilityId: string;
  deploymentId: string;
  clock?: () => Date;
  /** Synchronous owning-host checks run inside the serialized activation callback.
   * A staged binding is service-instance-local; restart requires restaging templates. */
  templateAuthority?: {
    capture(request: SecurityChangeRequest, documents: readonly SecurityDocument[]): string;
    /** A returned lease holds the host registry stable through policy commit/rollback. */
    assertCurrent(stamp: string, request: SecurityChangeRequest, documents: readonly SecurityDocument[]): boolean | { release(): void };
    permitsDelegation(input: { actorId: string; paths: ReturnType<typeof import("./graph.js").actorAdministrativePaths>; previous?: SecurityGrantBoundary; proposed: SecurityGrantBoundary; documents: readonly SecurityDocument[] }): boolean;
  };
  /** WP4 owner-backed preflight; host supplies this with its live resource authority. */
  resourceReferences?: { validate(documents: readonly import("../wp1/models.js").SecurityDocument[]): Promise<{ revision: string }> };
  /** Trusted Application registry, never a request-supplied manifest. Synchronous reads
   * must remain stable during the serialized activation callback; revision changes reject. */
  applicationProvisioning?: {
    resolve(applicationId: string): { resource: SecurityResourceRef; owner: { kind: "application"; applicationId: string }; status: "active"; revision: string } | undefined;
  };
}
/** Explicit first administrator; Application creation itself conveys no authority. */
export interface ProvisionApplicationRequest extends ActivateAdministrationRequest {
  applicationId: string;
  administratorUserId: string;
  administratorAssignmentId: string;
}
export interface ActivateAdministrationRequest {
  context: unknown;
  candidateId: string;
  checksum: string;
  expectedRevision: number;
  applicationId: string | null;
  reason?: string;
}
export interface RecoveryRequest {
  context: unknown;
  applicationId: string;
  document: import("../wp1/models.js").SecurityDocument;
  expectedRevision: number;
  idempotencyKey: string;
  reason: string;
}
