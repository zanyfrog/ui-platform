import { actorAdministrativePaths, boundaryAllowsRule, rulesForChanged } from '@ui-platform/i-am/administration';
import type { SecurityDocument, SecurityRecord, SecurityScope } from '@ui-platform/i-am/definitions';
import { securityChecksum } from '@ui-platform/i-am/definitions';
import { developmentSecurityConfiguration, developmentSecurityScopes } from './v1-security-administration.js';
import type { AdministrationScopeAuthority } from '@ui-platform/i-am/administration';

/** A read projection of existing policy, never a second role registry. */
export function roleAdministrationState(documents: SecurityDocument[], applicationId: string, actorId: string, revision: number,
  config = developmentSecurityConfiguration, scopes: AdministrationScopeAuthority = developmentSecurityScopes) {
  const records = documents.map(d => d.definition), authorityId = config.resourceAuthorityId;
  const application: SecurityScope = { resource: { authorityId, applicationId, kind: 'application', id: applicationId }, descendants: false };
  const platform: SecurityScope = { resource: { authorityId, applicationId: null, kind: 'system', id: config.systemResourceId }, descendants: false };
  const boundaries = [
    ...actorAdministrativePaths(records, actorId, new Date(), application, config.applicationAdministratorPermissionId, 'assign', scopes, authorityId),
    ...actorAdministrativePaths(records, actorId, new Date(), platform, config.platformAdministratorPermissionId, 'assign', scopes, authorityId),
  ].map(path => path.boundary);
  const roles = records.filter((r): r is Extract<SecurityRecord, { kind: 'role' }> => r.kind === 'role' && r.status === 'active' && r.owner.kind === 'application' && r.owner.applicationId === applicationId)
    .map(role => { const grants = rulesForChanged(role, records); return { id: role.id, name: role.name, grants: grants.map(g => g.rule),
      withinGrantCeiling: grants.every(g => boundaryAllowsRule(boundaries, g.rule, g.scope, scopes)) }; });
  const assignments = documents.filter(d => d.definition.kind === 'role-assignment' && d.definition.scope.resource.applicationId === applicationId)
    .map(d => ({ ...d.definition, checksum: securityChecksum(d) }));
  return { applicationId, revision, roles, assignments,
    users: records.filter((r): r is Extract<SecurityRecord, { kind: 'user' }> => r.kind === 'user' && r.status === 'active').map(r => ({ id: r.id, name: r.displayName })),
    scopes: [...new Map([application, { ...application, descendants: true }, ...roles.flatMap(r => r.grants.map(g => g.scope))]
      .filter(s => s.resource.applicationId === applicationId).map(s => [JSON.stringify(s), s])).values()] };
}
