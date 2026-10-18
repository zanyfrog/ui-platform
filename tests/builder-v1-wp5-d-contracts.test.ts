import { afterAll, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { renderMenu, applyMenuOverrides, themeCss, validateMenu, type ApplicationMenu } from '@ui-platform/visual-artifacts';
import { managementCheck } from '../src/server/v1-management-routes.js';

const previous = process.env.UI_APPS_DIR;
const root = await mkdtemp(path.join(tmpdir(), 'wp5d-contract-')); process.env.UI_APPS_DIR = root;
const { compositionSourceChoices, saveCompositionAsset, compositionSourcePath } = await import('../src/server/application-composition.js');
afterAll(async () => { if (previous === undefined) delete process.env.UI_APPS_DIR; else process.env.UI_APPS_DIR = previous; await rm(root, { recursive: true, force: true }); });

it('lists only supported native portable asset and stylesheet paths', async () => {
  const app = path.join(root, 'picker'); await mkdir(path.join(app, 'assets/branding'), { recursive: true }); await mkdir(path.join(app, 'styles'));
  for (const file of ['assets/branding/logo.svg', 'assets/unsupported.js', 'assets/Bad Name.png', 'styles/site.css', 'styles/unsupported.js']) await writeFile(path.join(app, file), 'bytes');
  expect(await compositionSourceChoices('picker')).toEqual({ assets: ['assets/branding/logo.svg'], styles: ['styles/site.css'] });
  await expect(compositionSourceChoices('../other')).rejects.toThrow();
  await expect(compositionSourcePath('picker', 'assets/../outside.svg')).rejects.toThrow('Unsupported');
});
it('asset upload retains exact bytes and rejects stale or denied writes before mutation', async () => {
  await mkdir(path.join(root, 'upload')); const bytes = Buffer.from([0, 255, 17, 128]);
  const saved = await saveCompositionAsset('upload', 'assets/image.png', bytes, null);
  expect(await readFile(path.join(root, 'upload/assets/image.png'))).toEqual(bytes);
  await expect(saveCompositionAsset('upload', 'assets/image.png', Buffer.from('stale'), null)).rejects.toThrow('changed');
  await expect(saveCompositionAsset('upload', 'assets/image.png', Buffer.from('denied'), saved.hash, async () => { throw new Error('AUTHORITY_REVOKED'); })).rejects.toThrow('AUTHORITY_REVOKED');
  expect(await readFile(path.join(root, 'upload/assets/image.png'))).toEqual(bytes);
});
it('picker reads and uploads retain existing presentation permissions', () => {
  expect(managementCheck('GET', '/api/apps/picker/composition-asset', 'permanent-app')?.permissionId).toBe('ui.presentation.view');
  expect(managementCheck('POST', '/api/apps/picker/composition-asset', 'permanent-app')?.permissionId).toBe('ui.presentation.edit');
  expect(managementCheck('PUT', '/api/apps/picker/composition-source', 'permanent-app')?.resource).toMatchObject({ applicationId: 'permanent-app', id: 'presentation' });
});
const routes = [{ routeId: 'route_detail', pageId: 'art_detail', path: '/record/:id' }];
const menu: ApplicationMenu = { schemaVersion: 1, menuId: 'menu-shared', name: 'Shared', items: [{ itemId: 'item-parent', label: 'Parent', destination: { kind: 'url', url: 'https://example.com' }, children: [{ itemId: 'item-child', label: 'Detail', destination: { kind: 'route', routeId: 'route_detail' } }] }] };
it('native route inheritance and literal parameters encode exactly once, preserving shared instances', () => {
  const original = JSON.stringify(menu);
  expect(renderMenu(menu, routes, 'art_detail', 'route_detail', { id: 'a/b ?' }).source).toContain('/record/a%2Fb%20%3F');
  const local = applyMenuOverrides(menu, {}); local.items[0].children![0].destination = { kind: 'page', pageId: 'art_detail', params: { id: '' } };
  expect(renderMenu(local, routes, 'art_detail', 'route_detail', { id: 'fallback' }).source).toContain('href="/record/"');
  expect(local.items[0].children![0].itemId).toBe('item-child'); expect(JSON.stringify(menu)).toBe(original);
  expect(() => renderMenu(menu, routes, 'art_detail', 'route_detail')).toThrow('Route parameter is required');
});
it('unknown destinations, unsafe URLs and duplicate Menu identities fail existing validation', () => {
  const missing = structuredClone(menu); missing.items[0].children![0].destination = { kind: 'route', routeId: 'route_missing' };
  expect(() => renderMenu(missing, routes, 'art_detail', 'route_detail')).toThrow('target not found');
  const duplicate = structuredClone(menu); duplicate.items[0].children![0].itemId = 'item-parent'; expect(() => validateMenu(duplicate)).toThrow('stable IDs');
  const unsafe = structuredClone(menu); unsafe.items[0].destination = { kind: 'url', url: 'javascript:alert(1)' }; expect(() => validateMenu(unsafe)).toThrow('HTTP');
});
it('theme configuration retains existing token validation and no independent theme identity', () => {
  expect(themeCss({ theme: { '--app-color-primary': '#108060' } } as any)).toContain('--app-color-primary:#108060');
  expect(() => themeCss({ theme: { '--app-color-primary': 'red;}body{' } } as any)).toThrow('Invalid theme');
});
