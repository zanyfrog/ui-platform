import type { SecurityDocument, SecurityRecord } from '@ui-platform/i-am/definitions';

export const pilot = {
  key: 'codex-test-v1-local-pilot-20261102', applicationId: 'de8d1851-3e36-435f-b093-95ce94d940e7',
  securityAdmin: 'usr_06fefc50791f4f15ac0139de699701b9', administrator: 'usr_f01e0c1c58424bed9ac4e8601ff9890a',
  authorityId: 'ui-platform-development', deploymentId: 'builder-demo',
} as const;
export const pilotPermissions = ['ui.application.view', 'ui.application.edit', 'ui.page.view', 'ui.page.edit',
  'ui.presentation.view', 'ui.presentation.edit', 'ui.presentation.admin'] as const;
export type PilotStatus = { applicationId: string; applicationKey: string; deploymentId: string; authorityId: string;
  principalId: string; revision: number; anchor: { userId: string; assignmentId: string; boundaryId: string } | null };

/** Fixed plan only; the existing protected service remains the authorization boundary. */
export function pilotGrantChanges(cleanup: boolean): Array<{ document: SecurityDocument }> {
  const root = { authorityId: pilot.authorityId, applicationId: pilot.applicationId, kind: 'application' as const, id: pilot.applicationId };
  const scope = { resource: root, descendants: true };
  const owner = { kind: 'application' as const, applicationId: pilot.applicationId };
  const prefix = `local-pilot.${pilot.applicationId}`;
  const base = (id: string) => ({ id, key: id, name: id, status: 'active' as const });
  const permissions: string[] = [...pilotPermissions, ...(cleanup ? ['ui.page.admin'] : [])];
  const records: SecurityRecord[] = [
    { ...base(`${prefix}.set`), kind: 'permission-set', owner, includes: [], rules: permissions.map((permissionId, i) => ({
      id: `${prefix}.rule.${i}`, permissionId, effect: 'allow', scope: { resource: root, descendants: !permissionId.startsWith('ui.application.') },
    })) },
    { ...base(`${prefix}.role`), kind: 'role', owner, permissionSets: [{ id: `${prefix}.set` }] },
    { kind: 'role-assignment', id: `${prefix}.assignment`, status: 'active', userId: pilot.administrator,
      roleId: `${prefix}.role`, scope, startsAt: '2026-11-02T00:00:00Z', endsAt: null },
  ];
  return records.map(definition => ({ document: { format: 'ui-platform.security', formatVersion: 1, definition } }));
}
