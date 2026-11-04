import type { AdministrationConfiguration, AdministrationScopeAuthority } from '@ui-platform/i-am/administration';
import { V1_AUTHORITY_ID } from './v1-development-policy.js';

export const developmentSecurityConfiguration: AdministrationConfiguration & { bootstrapCapabilityId: string; applicationAdministratorPermissionId: string } = {
  resourceAuthorityId: V1_AUTHORITY_ID, systemResourceId: 'platform',
  platformAdministratorPermissionId: 'ui.platform.security.admin', applicationAdministratorPermissionId: 'ui.application.security.admin',
  recoveryCapabilityId: 'development.security.recovery', bootstrapCapabilityId: 'development.security.local-setup', deploymentId: 'ui-platform-development',
};
export const developmentSecurityScopes: AdministrationScopeAuthority = {
  contains(ceiling, requested) {
    const a = ceiling.resource, b = requested.resource;
    if (a.authorityId !== V1_AUTHORITY_ID || b.authorityId !== a.authorityId) return false;
    if (a.kind === b.kind && a.id === b.id && a.applicationId === b.applicationId && a.parentId === b.parentId) return ceiling.descendants || !requested.descendants;
    if (!ceiling.descendants) return false;
    if (a.kind === 'system' && a.applicationId === null && a.id === 'platform') return true;
    if (a.kind === 'application' && a.id === a.applicationId) return a.id === b.applicationId;
    return false;
  },
  permitsPredicate() { return false; },
};
