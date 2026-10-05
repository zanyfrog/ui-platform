import { randomUUID } from 'node:crypto';
import type { SecurityDocument, SecurityRecord, SecurityResourceKind, SecurityScope } from '@ui-platform/i-am/definitions';
import { SecurityDefinitionService } from '@ui-platform/i-am/definitions';

/** A security fixture application, never an implicit grant for an unrelated app. */
export const V1_FIXTURE_APPLICATION_ID = 'dev-v1-identity-fixture';
export const V1_FIXTURE_APPLICATION_KEY = 'v1-identity-fixture';
export const V1_AUTHORITY_ID = 'ui-platform-development';
const appOwner = { kind: 'application' as const, applicationId: V1_FIXTURE_APPLICATION_ID };
const platformOwner = { kind: 'platform' as const };
const systemScope: SecurityScope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system', id: 'platform' }, descendants: false };
const appScope: SecurityScope = { resource: { authorityId: V1_AUTHORITY_ID, applicationId: V1_FIXTURE_APPLICATION_ID, kind: 'application', id: V1_FIXTURE_APPLICATION_ID }, descendants: true };

/** The registry is owned here by the existing browser management surface. */
export const managementPermissions = [
  { id: 'ui.application.view', kind: 'application' },
  { id: 'ui.application.edit', kind: 'application' },
  { id: 'ui.application.admin', kind: 'application' },
  { id: 'ui.page.view', kind: 'page' },
  { id: 'ui.page.edit', kind: 'page' },
  { id: 'ui.page.admin', kind: 'page' },
  { id: 'ui.form.view', kind: 'form' },
  { id: 'ui.form.edit', kind: 'form' },
  { id: 'ui.form.admin', kind: 'form' },
  { id: 'ui.workflow.view', kind: 'workflow' },
  { id: 'ui.workflow.edit', kind: 'workflow' },
  { id: 'ui.workflow.admin', kind: 'workflow' },
  { id: 'ui.presentation.view', kind: 'artifact' },
  { id: 'ui.presentation.edit', kind: 'artifact' },
  { id: 'ui.presentation.admin', kind: 'artifact' },
  { id: 'ui.artifact.view', kind: 'artifact' },
  { id: 'ui.artifact.edit', kind: 'artifact' },
  { id: 'ui.artifact.admin', kind: 'artifact' },
  { id: 'ui.package.view', kind: 'artifact' },
  { id: 'ui.package.edit', kind: 'artifact' },
  { id: 'ui.package.admin', kind: 'artifact' },
  { id: 'ui.security.admin', kind: 'security-definition' },
  { id: 'ui.platform.application.create', kind: 'system' },
  { id: 'ui.platform.package.admin', kind: 'system' },
] as const satisfies ReadonlyArray<{ id: string; kind: SecurityResourceKind }>;

export const developmentUsers = [
  { id: 'usr_f01e0c1c58424bed9ac4e8601ff9890a', email: 'admin@example.local', name: 'Application Admin' },
  { id: 'usr_06fefc50791f4f15ac0139de699701b9', email: 'security@example.local', name: 'Security Admin' },
  { id: 'usr_80831c82612048e9bca61a5012dc7063', email: 'page-form-editor@example.local', name: 'Page and Form Editor' },
  { id: 'usr_b2137595f243461ebfe7cd5360467131', email: 'workflow-editor@example.local', name: 'Workflow Editor' },
  { id: 'usr_9298a60d175a4e7f9ff4dd63a906bf77', email: 'mixed@example.local', name: 'Mixed Permissions' },
  { id: 'usr_7485b37d5c274809ab503479212e8bd4', email: 'combined@example.local', name: 'Page, Form and Workflow Editor' },
] as const;

const document = (definition: SecurityRecord): SecurityDocument => ({ format: 'ui-platform.security', formatVersion: 1, definition });
const ref = (id: string) => ({ id });
const base = (id: string, name: string) => ({ id, key: id, name, status: 'active' as const, owner: appOwner });
const set = (id: string, name: string, includes: string[], permissions: string[]): SecurityRecord => ({
  kind: 'permission-set', ...base(id, name), includes: includes.map(ref), rules: permissions.map(permissionId => ({
    id: `${id}.${permissionId}.allow`, permissionId, effect: 'allow' as const, scope: appScope,
  })),
});

/** Initial fixture seed goes through WP1 validation and audited activation. Existing authority is never overwritten. */
export function seedV1DevelopmentPolicy(service: SecurityDefinitionService): void {
  if (service.active().length) {
    const records = new Map(service.active().map(doc => [doc.definition.id, doc.definition]));
    if (records.get(V1_FIXTURE_APPLICATION_ID)?.kind !== 'application-security' ||
        developmentUsers.some(user => records.get(user.id)?.kind !== 'user') ||
        managementPermissions.some(permission => records.get(permission.id)?.kind !== 'permission'))
      throw new Error('V1_DEVELOPMENT_POLICY_CONFLICT');
    return;
  }
  const records: SecurityRecord[] = [
    ...managementPermissions.map(permission => ({ kind: 'permission' as const, id: permission.id, key: permission.id,
      name: permission.id, status: 'active' as const, owner: platformOwner, lifecycle: 'active' as const,
      applicableKinds: [permission.kind] })),
    ...developmentUsers.map(user => ({ kind: 'user' as const, id: user.id, displayName: user.name, email: user.email, status: 'active' as const })),
    { kind: 'application-security', ...base(V1_FIXTURE_APPLICATION_ID, 'V1 Development Identity Fixture'),
      requiredAdministratorPermissionId: 'ui.application.admin', sharedPackages: [] },
    set('v1.application.viewer', 'Application Viewer', [], ['ui.application.view']),
    set('v1.application.editor', 'Application Editor', ['v1.application.viewer'], ['ui.application.edit']),
    set('v1.application.admin', 'Application Admin', ['v1.application.editor'], ['ui.application.admin']),
    ...(['page', 'form', 'workflow', 'presentation', 'artifact', 'package'] as const).flatMap(area => [
      set(`v1.${area}.viewer`, `${area} Viewer`, [], [`ui.${area}.view`]),
      set(`v1.${area}.editor`, `${area} Editor`, [`v1.${area}.viewer`], [`ui.${area}.edit`]),
      set(`v1.${area}.admin`, `${area} Admin`, [`v1.${area}.editor`], [`ui.${area}.admin`]),
    ]),
    set('v1.security.admin', 'Security Admin', [], ['ui.security.admin']),
    { kind: 'permission-set', id: 'v1.platform.admin', key: 'v1.platform.admin', name: 'Platform Management', status: 'active',
      owner: platformOwner, includes: [], rules: ['ui.platform.application.create', 'ui.platform.package.admin'].map(permissionId => ({
        id: `v1.platform.admin.${permissionId}.allow`, permissionId, effect: 'allow' as const, scope: systemScope,
      })) },
    { kind: 'role', ...base('v1.role.application-admin', 'Application Admin'), permissionSets: [
      'application', 'page', 'form', 'workflow', 'presentation', 'artifact', 'package'].map(area => ref(`v1.${area}.admin`)) },
    { kind: 'role', ...base('v1.role.security-admin', 'Security Admin'), permissionSets: [ref('v1.application.viewer'), ref('v1.security.admin')] },
    { kind: 'role', ...base('v1.role.page-form-editor', 'Page and Form Editor'), permissionSets: [ref('v1.application.viewer'), ref('v1.page.editor'), ref('v1.form.editor')] },
    { kind: 'role', ...base('v1.role.workflow-editor', 'Workflow Editor'), permissionSets: [ref('v1.application.viewer'), ref('v1.workflow.editor')] },
    { kind: 'role', ...base('v1.role.mixed', 'Mixed Permissions'), permissionSets: [ref('v1.application.viewer'), ref('v1.page.editor'), ref('v1.form.editor')] },
    { kind: 'role', id: 'v1.role.platform-admin', key: 'v1.role.platform-admin', name: 'Platform Manager', status: 'active',
      owner: platformOwner, permissionSets: [ref('v1.platform.admin')] },
    ...[
      [developmentUsers[0].id, 'v1.role.application-admin'],
      [developmentUsers[1].id, 'v1.role.security-admin'],
      [developmentUsers[2].id, 'v1.role.page-form-editor'],
      [developmentUsers[3].id, 'v1.role.workflow-editor'],
      [developmentUsers[4].id, 'v1.role.mixed'],
      [developmentUsers[5].id, 'v1.role.page-form-editor'],
      [developmentUsers[5].id, 'v1.role.workflow-editor'],
    ].map(([userId, roleId], index) => ({ kind: 'role-assignment' as const, id: `v1.assignment.${index}`, status: 'active' as const,
      startsAt: '2020-01-01T00:00:00.000Z', endsAt: null, userId, roleId, scope: appScope })),
  ];
  const candidate = service.stage({ changes: records.map(definition => ({ document: document(definition) })),
    actorId: 'v1-development-seed', source: 'cli', expectedRevision: service.revision(),
    idempotencyKey: randomUUID(), reason: 'Initialize deterministic V1 development identity fixture' });
  if (!candidate.activatable) throw new Error(`V1_DEVELOPMENT_POLICY_INVALID: ${JSON.stringify(candidate.diagnostics)}`);
  const result = service.activate(candidate.id, candidate.checksum, 'v1-development-seed');
  if (result.status !== 'activated') throw new Error(`V1_DEVELOPMENT_POLICY_INVALID: ${JSON.stringify(result)}`);
}
