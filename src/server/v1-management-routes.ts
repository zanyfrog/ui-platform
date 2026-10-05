import type { SecurityResourceRef } from '@ui-platform/i-am/definitions';
import { V1_AUTHORITY_ID } from './v1-development-policy.js';

export interface ManagementCheck { permissionId: string; resource: SecurityResourceRef }
const system: SecurityResourceRef = { authorityId: V1_AUTHORITY_ID, applicationId: null, kind: 'system', id: 'platform' };
const child = (applicationId: string, kind: 'page' | 'form' | 'workflow' | 'artifact', id: string): SecurityResourceRef =>
  ({ authorityId: V1_AUTHORITY_ID, applicationId, kind, id, parentId: applicationId });
const app = (applicationId: string): SecurityResourceRef =>
  ({ authorityId: V1_AUTHORITY_ID, applicationId, kind: 'application', id: applicationId });

/** The current browser API inventory. An unknown management route has no implicit permission. */
export function managementCheck(method: string, pathname: string, applicationId?: string): ManagementCheck | null {
  const parts = pathname.split('/').filter(Boolean);
  if (parts[0] !== 'api') return null;
  if (pathname === '/api/apps' && method === 'POST') return { permissionId: 'ui.platform.application.create', resource: system };
  if (['packages', 'package-catalog', 'foundation-sources'].includes(parts[1] ?? ''))
    return { permissionId: 'ui.platform.package.admin', resource: system };
  if (parts[1] !== 'apps' || !parts[2] || !applicationId) return null;
  const area = parts[3];
  const read = method === 'GET';
  if (!area || area === 'info' || area === 'components') return {
    permissionId: method === 'DELETE' ? 'ui.application.admin' : read ? 'ui.application.view' : 'ui.application.edit', resource: app(applicationId),
  };
  if (area === 'pages' || area === 'page') return {
    permissionId: read ? 'ui.page.view' : method === 'DELETE' ? 'ui.page.admin' : 'ui.page.edit',
    resource: child(applicationId, 'page', 'pages'),
  };
  if (area === 'presentation') return {
    permissionId: read ? 'ui.presentation.view' : ['publish', 'rollback'].includes(parts[4] ?? '') ? 'ui.presentation.admin' : 'ui.presentation.edit',
    resource: child(applicationId, 'artifact', 'presentation'),
  };
  if (area === 'packages' || area === 'foundation-dependencies') return {
    permissionId: read ? 'ui.package.view' : ['enable', 'disable'].includes(parts[5] ?? '') ? 'ui.package.admin' : 'ui.package.edit',
    resource: child(applicationId, 'artifact', 'packages'),
  };
  if (area === 'settings' || area === 'preview' || area === 'export') return {
    permissionId: area === 'export' ? 'ui.application.view' : 'ui.application.edit', resource: app(applicationId),
  };
  return null;
}
