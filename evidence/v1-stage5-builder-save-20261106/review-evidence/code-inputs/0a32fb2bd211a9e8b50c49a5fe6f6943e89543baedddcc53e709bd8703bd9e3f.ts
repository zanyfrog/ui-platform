import { expect, it } from 'vitest';
import { managementCheck } from '../src/server/v1-management-routes.js';
import { V1_FIXTURE_APPLICATION_ID } from '../src/server/v1-development-policy.js';

it.each([
  ['GET', '/api/apps/fixture', 'ui.application.view'],
  ['DELETE', '/api/apps/fixture', 'ui.application.admin'],
  ['GET', '/api/apps/fixture/pages', 'ui.page.view'],
  ['POST', '/api/apps/fixture/pages', 'ui.page.edit'],
  ['PUT', '/api/apps/fixture/page', 'ui.page.edit'],
  ['GET', '/api/apps/fixture/presentation', 'ui.presentation.view'],
  ['POST', '/api/apps/fixture/presentation/publish', 'ui.presentation.admin'],
  ['POST', '/api/apps/fixture/presentation/assets', 'ui.presentation.edit'],
  ['GET', '/api/apps/fixture/packages', 'ui.package.view'],
  ['POST', '/api/apps/fixture/packages', 'ui.package.edit'],
  ['POST', '/api/apps/fixture/packages/sample/enable', 'ui.package.admin'],
  ['PUT', '/api/apps/fixture/settings', 'ui.application.edit'],
  ['POST', '/api/apps/fixture/export', 'ui.application.view'],
  ['POST', '/api/apps', 'ui.platform.application.create'],
  ['POST', '/api/packages/install', 'ui.platform.package.admin'],
  ['POST', '/api/foundation-sources/github', 'ui.platform.package.admin'],
] as const)('%s %s requires %s', (method, pathname, permissionId) => {
  expect(managementCheck(method, pathname, V1_FIXTURE_APPLICATION_ID)?.permissionId).toBe(permissionId);
});

it('does not invent permission for unknown management routes or app-less resources', () => {
  expect(managementCheck('POST', '/api/apps/fixture/unknown', V1_FIXTURE_APPLICATION_ID)).toBeNull();
  expect(managementCheck('PUT', '/api/apps/fixture/settings')).toBeNull();
  expect(managementCheck('POST', '/api/security/grant')).toBeNull();
});
