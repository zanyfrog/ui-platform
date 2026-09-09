/**
 * Purpose: Verifies staged manual package installation at platform and app scope.
 * Use: Extend these tests when package acquisition, validation, or installation history changes.
 */

import { mkdir, mkdtemp, readFile, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { refreshPackageCatalog } from '@uib/platform-core';
import { installManualPackage } from '../src/server/package-installer.js';

describe('manual package installation', () => {
  it('installs a validated folder at platform scope and refreshes discovery', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'uib-package-install-'));
    const source = await createPackage(root, 'calendar');
    const result = await installManualPackage({ sourcePath: source, scope: 'platform', platformRootDir: root, stagingRootDir: path.join(root, '.staging') });

    expect(result).toMatchObject({ name: '@uib/calendar', version: '1.0.0', scope: 'platform' });
    await expect(stat(path.join(root, 'packages', 'calendar', 'calendar.manifest.json'))).resolves.toBeTruthy();
    const catalog = await refreshPackageCatalog({ rootDir: root });
    expect(catalog.entries.map((entry) => entry.name)).toEqual(['@uib/calendar']);
    expect(await readFile(path.join(root, 'data', 'package-history.jsonl'), 'utf8')).toContain('package.installed');
  });

  it('installs a validated folder inside the application without changing app intent', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'uib-package-install-'));
    const appDir = path.join(root, 'app');
    await mkdir(appDir, { recursive: true });
    await writeFile(path.join(appDir, 'app.manifest.json'), '{"packages":{}}\n', 'utf8');
    const source = await createPackage(root, 'forms');
    const result = await installManualPackage({ sourcePath: source, scope: 'app', appKey: 'test-app', appDir, platformRootDir: root, stagingRootDir: path.join(root, '.staging') });

    expect(result.scope).toBe('app');
    await expect(stat(path.join(appDir, 'packages', 'forms', 'forms.manifest.json'))).resolves.toBeTruthy();
    expect(await readFile(path.join(appDir, 'app.manifest.json'), 'utf8')).toBe('{"packages":{}}\n');
  });

  it('rejects a package whose package.json and UIB manifest disagree', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'uib-package-install-'));
    const source = await createPackage(root, 'broken');
    await writeFile(path.join(source, 'broken.manifest.json'), JSON.stringify({
      name: '@uib/broken',
      version: '2.0.0',
      manifestVersion: '1.0.0',
      displayName: 'Broken',
      capabilities: ['components'],
    }, null, 2) + '\n', 'utf8');

    await expect(installManualPackage({ sourcePath: source, scope: 'platform', platformRootDir: root, stagingRootDir: path.join(root, '.staging') })).rejects.toThrow('package.json.version and the UIB manifest version must match');
    await expect(stat(path.join(root, 'packages', 'broken'))).rejects.toThrow();
  });

  async function createPackage(root: string, name: string): Promise<string> {
    const source = path.join(root, 'source-' + name);
    await mkdir(source, { recursive: true });
    await writeFile(path.join(source, 'package.json'), JSON.stringify({ name: '@uib/' + name, version: '1.0.0' }, null, 2) + '\n', 'utf8');
    await writeFile(path.join(source, name + '.manifest.json'), JSON.stringify({
      name: '@uib/' + name,
      version: '1.0.0',
      manifestVersion: '1.0.0',
      displayName: name,
      capabilities: ['components'],
      components: [{ name: name, tagName: 'uib-' + name }],
    }, null, 2) + '\n', 'utf8');
    return source;
  }
});
