import { canonicalChecksum } from "@ui-platform/versioned-definition-registry";
import type { SecurityGrantBoundary, SecurityPredicate, SecurityRecord, SecurityRule, SecurityScope } from "../wp1/models.js";
import { assignmentEffectiveAt } from "../wp1/validation.js";
import type { AdministrationScopeAuthority } from "./types.js";

type Via = { kind: "role" | "group"; id: string; assignmentId: string; scope: SecurityScope; indefinite: boolean };
type RulePath = { via: Via; rule: SecurityRule; setIds: string[] };
const active = (r: SecurityRecord | undefined) => !!r && "status" in r && r.status === "active";
const byId = (records: readonly SecurityRecord[]) => new Map(records.map(r => [r.id, r]));
const appScope = (authorityId: string, appId: string): SecurityScope => ({ resource: { authorityId, applicationId: appId, kind: "application", id: appId }, descendants: false });
const systemScope = (authorityId: string, systemId: string): SecurityScope => ({ resource: { authorityId, applicationId: null, kind: "system", id: systemId }, descendants: false });

function actorVia(records: readonly SecurityRecord[], userId: string, now: Date, authorityId: string): Via[] {
  const index = byId(records), user = index.get(userId);
  if (user?.kind !== "user" || user.status !== "active") return [];
  const result: Via[] = [];
  for (const r of records) {
    if (r.kind === "role-assignment" && r.userId === userId && assignmentEffectiveAt(r, now)) {
      const role = index.get(r.roleId);
      if (role?.kind === "role" && active(role)) result.push({ kind: "role", id: role.id, assignmentId: r.id, scope: r.scope, indefinite: r.endsAt === null });
    }
    if (r.kind === "group-membership" && r.userId === userId && assignmentEffectiveAt(r, now)) {
      const group = index.get(r.groupId);
      if (group?.kind === "group" && active(group)) result.push({ kind: "group", id: group.id, assignmentId: r.id, scope: appScope(authorityId, r.applicationId), indefinite: r.endsAt === null });
    }
  }
  return result;
}

function paths(records: readonly SecurityRecord[], via: readonly Via[]): RulePath[] {
  const index = byId(records), result: RulePath[] = [];
  const walk = (setId: string, source: Via, seen: Set<string>, setIds: string[]) => {
    if (seen.has(setId)) throw new Error("ADMIN_GRAPH_CYCLE");
    const set = index.get(setId);
    if (set?.kind !== "permission-set") throw new Error("ADMIN_SET_UNRESOLVED");
    if (set.status !== "active") return;
    const next = new Set(seen); next.add(setId);
    const chain = [...setIds, setId];
    for (const rule of set.rules) result.push({ via: source, rule, setIds: chain });
    for (const child of set.includes) walk(child.id, source, next, chain);
  };
  for (const source of via) {
    const owner = index.get(source.id);
    if (!owner || (owner.kind !== "role" && owner.kind !== "group")) throw new Error("ADMIN_BENEFICIARY_UNRESOLVED");
    for (const ref of owner.permissionSets) walk(ref.id, source, new Set(), []);
  }
  return result;
}

function boundaryFor(records: readonly SecurityRecord[], via: Via, operation: string, target: SecurityScope, scopes: AdministrationScopeAuthority): SecurityGrantBoundary[] {
  return records.filter((r): r is SecurityGrantBoundary => r.kind === "grant-boundary" && r.owner.kind === "platform" && r.status === "active" && r.beneficiary.kind === via.kind && r.beneficiary.id === via.id && r.operations.includes(operation as SecurityGrantBoundary["operations"][number]) && scopes.contains(r.scope, target));
}

/** A current, non-expiring admin path needs usable admin capability AND a usable Grant Boundary. */
export function adminAnchor(records: readonly SecurityRecord[], appId: string, authorityId: string, now: Date, scopes: AdministrationScopeAuthority): { userId: string; assignmentId: string; boundaryId: string } | undefined {
  const index = byId(records), app = index.get(appId);
  if (app?.kind !== "application-security" || app.status !== "active") return undefined;
  const permission = index.get(app.requiredAdministratorPermissionId);
  if (permission?.kind !== "permission" || permission.status !== "active" || permission.lifecycle === "retired" || !permission.applicableKinds.includes("application")) return undefined;
  const target = appScope(authorityId, appId);
  for (const user of records.filter((r): r is Extract<SecurityRecord, { kind: "user" }> => r.kind === "user" && r.status === "active")) {
    const via = actorVia(records, user.id, now, authorityId).filter(v => scopes.contains(v.scope, target));
    const all = paths(records, via).filter(p => p.rule.permissionId === permission.id && scopes.contains(p.rule.scope, target));
    if (all.some(p => p.rule.effect === "deny")) continue;
    for (const allow of all.filter(p => p.rule.effect === "allow" && !p.rule.fields?.length && (!p.rule.where || p.rule.where.op === "true") && p.via.indefinite)) {
      const boundary = boundaryFor(records, allow.via, "activate", target, scopes).find(b => b.operations.includes("assign") && b.permissions.some(p => p.permissionId === permission.id && scopes.contains(p.scope, target)));
      if (boundary) return { userId: user.id, assignmentId: allow.via.assignmentId, boundaryId: boundary.id };
    }
  }
  return undefined;
}

export function actorAdministrativePaths(records: readonly SecurityRecord[], actorId: string, now: Date, target: SecurityScope, permissionId: string, operation: string, scopes: AdministrationScopeAuthority, authorityId: string): Array<{ via: Via; boundary: SecurityGrantBoundary }> {
  const index = byId(records), p = index.get(permissionId);
  if (p?.kind !== "permission" || p.status !== "active" || p.lifecycle === "retired" || !p.applicableKinds.includes(target.resource.kind)) return [];
  const via = actorVia(records, actorId, now, authorityId).filter(v => scopes.contains(v.scope, target));
  const all = paths(records, via).filter(x => x.rule.permissionId === permissionId && scopes.contains(x.rule.scope, target));
  if (all.some(x => x.rule.effect === "deny")) return [];
  return all.filter(x => x.rule.effect === "allow" && !x.rule.fields?.length && (!x.rule.where || x.rule.where.op === "true")).flatMap(x => boundaryFor(records, x.via, operation, target, scopes).map(boundary => ({ via: x.via, boundary })));
}

export function actorRuleSignatures(records: readonly SecurityRecord[], actorId: string, now: Date, authorityId: string): { allows: Set<string>; denies: Set<string> } {
  const signatures = { allows: new Set<string>(), denies: new Set<string>() };
  for (const p of paths(records, actorVia(records, actorId, now, authorityId))) {
    const key = canonicalChecksum({ permissionId: p.rule.permissionId, scope: p.rule.scope, assignmentScope: p.via.scope, fields: p.rule.fields ?? null, where: p.rule.where ?? null });
    (p.rule.effect === "allow" ? signatures.allows : signatures.denies).add(key);
  }
  return signatures;
}

export function platformAdminAnchor(records: readonly SecurityRecord[], now: Date, authorityId: string, systemId: string, permissionId: string, scopes: AdministrationScopeAuthority): boolean {
  const target = systemScope(authorityId, systemId);
  return records.some(r => r.kind === "user" && r.status === "active" && actorAdministrativePaths(records, r.id, now, target, permissionId, "activate", scopes, authorityId)
    .some(p => p.via.indefinite && p.boundary.operations.includes("assign") && p.boundary.permissions.some(g => g.permissionId === permissionId && scopes.contains(g.scope, target))));
}

/** Legacy initialization may add a missing administrative ceiling only for an
 * explicitly selected User who already has non-expiring administrator use. */
export function hasAdministratorUseAnchor(records: readonly SecurityRecord[], userId: string, appId: string, permissionId: string, authorityId: string, now: Date, scopes: AdministrationScopeAuthority): boolean {
  const target = appScope(authorityId, appId);
  const grants = paths(records, actorVia(records, userId, now, authorityId).filter(v => scopes.contains(v.scope, target)))
    .filter(p => p.rule.permissionId === permissionId && scopes.contains(p.rule.scope, target));
  return !grants.some(p => p.rule.effect === "deny") && grants.some(p => p.via.indefinite && p.rule.effect === "allow" && !p.rule.fields?.length && (!p.rule.where || p.rule.where.op === "true"));
}
export function actorBoundarySignatures(records: readonly SecurityRecord[], actorId: string, now: Date, authorityId: string): Set<string> {
  const via = actorVia(records, actorId, now, authorityId);
  return new Set(records.filter((r): r is SecurityGrantBoundary => r.kind === "grant-boundary" && r.owner.kind === "platform" && r.status === "active" && via.some(v => v.kind === r.beneficiary.kind && v.id === r.beneficiary.id)).map(r => canonicalChecksum({ scope: r.scope, operations: r.operations, permissions: r.permissions, serviceUseApprovalIds: r.serviceUseApprovalIds })));
}

export function rulesForChanged(record: SecurityRecord | undefined, records: readonly SecurityRecord[]): Array<{ rule: SecurityRule; scope?: SecurityScope }> {
  if (!record) return [];
  const index = byId(records), result: Array<{ rule: SecurityRule; scope?: SecurityScope }> = [];
  const walk = (setId: string, scope: SecurityScope | undefined, seen: Set<string>) => {
    if (seen.has(setId)) throw new Error("ADMIN_GRAPH_CYCLE");
    const set = index.get(setId);
    if (set?.kind !== "permission-set") throw new Error("ADMIN_SET_UNRESOLVED");
    const next = new Set(seen); next.add(setId);
    for (const rule of set.rules) result.push({ rule, scope });
    for (const child of set.includes) walk(child.id, scope, next);
  };
  if (record.kind === "permission-set") walk(record.id, undefined, new Set());
  if (record.kind === "role" || record.kind === "group") for (const ref of record.permissionSets) walk(ref.id, undefined, new Set());
  if (record.kind === "role-assignment") {
    const role = index.get(record.roleId);
    if (role?.kind !== "role") throw new Error("ADMIN_ROLE_UNRESOLVED");
    for (const ref of role.permissionSets) walk(ref.id, record.scope, new Set());
  }
  if (record.kind === "group-membership") {
    const group = index.get(record.groupId);
    if (group?.kind !== "group") throw new Error("ADMIN_GROUP_UNRESOLVED");
    for (const ref of group.permissionSets) walk(ref.id, undefined, new Set());
  }
  if (record.kind === "service-assignment") walk(record.permissionSet.id, record.scope, new Set());
  return result;
}

export function boundaryAllowsRule(boundaries: readonly SecurityGrantBoundary[], rule: SecurityRule, assignmentScope: SecurityScope | undefined, scopes: AdministrationScopeAuthority): boolean {
  return boundaries.some(b => b.permissions.some(p => p.permissionId === rule.permissionId && scopes.contains(p.scope, rule.scope) && (!assignmentScope || scopes.contains(p.scope, assignmentScope)) && (!rule.where || p.predicateTemplateIds.length > 0 && scopes.permitsTemplateRule?.({ rule, boundary: b, permission: p, assignmentScope }) === true)));
}

export const applicationScope = appScope;
export const platformScope = systemScope;
export const activeBeneficiaries = actorVia;
