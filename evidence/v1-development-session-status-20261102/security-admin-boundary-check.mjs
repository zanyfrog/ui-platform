import { DatabaseSync } from 'node:sqlite';
import { writeFileSync } from 'node:fs';
const db = new DatabaseSync('C:/Projects/Modular/builder-demo/runtime/iam-v1-development.sqlite', { readOnly: true });
try {
  const records = db.prepare('SELECT json FROM security_documents').all().map(r => JSON.parse(r.json).definition);
  const principalId = 'usr_06fefc50791f4f15ac0139de699701b9';
  const boundary = records.find(r => r.id === 'development.platform-security.boundary');
  const now = Date.now();
  const assigned = records.some(r => r.kind === 'role-assignment' && r.userId === principalId && r.roleId === boundary?.beneficiary?.id && r.status === 'active' && r.scope?.resource?.authorityId === 'ui-platform-development' && r.scope?.resource?.kind === 'system' && r.scope?.resource?.id === 'platform' && r.scope?.descendants === true && (!r.startsAt || Date.parse(r.startsAt) <= now) && (!r.endsAt || Date.parse(r.endsAt) > now));
  const roleActive = records.some(r => r.kind === 'role' && r.id === boundary?.beneficiary?.id && r.status === 'active');
  const required = ['ui.application.security.admin', 'ui.application.view', 'ui.application.edit', 'ui.page.view', 'ui.page.edit', 'ui.presentation.view', 'ui.presentation.edit', 'ui.presentation.admin', 'ui.page.admin'];
  const result = { principalId, evidenceKind: 'read-only-current-policy-inspection-not-provisioning-admission',
    activeAssignedBeneficiaryRole: assigned && roleActive, boundaryActive: boundary?.status === 'active',
    authorityId: boundary?.scope?.resource?.authorityId, resourceKind: boundary?.scope?.resource?.kind,
    resourceId: boundary?.scope?.resource?.id, descendants: boundary?.scope?.descendants,
    operations: boundary?.operations,
    requiredPermissionCeilingCoverage: Object.fromEntries(required.map(id => [id, boundary?.permissions?.some(p => p.permissionId === id && p.scope?.resource?.kind === 'system' && p.scope?.resource?.id === 'platform' && p.scope?.descendants === true) ?? false])) };
  writeFileSync(new URL('./security-admin-boundary-result.json', import.meta.url), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally { db.close(); }
