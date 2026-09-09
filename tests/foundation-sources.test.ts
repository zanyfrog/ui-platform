/**
 * Purpose: Verifies trusted GitHub foundation workspace discovery and app dependency selection.
 * Use: Extend when supported source shapes or workspace dependency resolution change.
 */

import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { addAppFoundationDependencies, getAppFoundationDependencies, inspectFoundationWorkspace } from '../src/server/foundation-sources.js';

describe('foundation sources', () => {
  it('discovers UI-Base packages and their workspace dependencies', async () => {
    const root = await createWorkspace();
    const packages = await inspectFoundationWorkspace(root);

    expect(packages.map((pkg) => pkg.name)).toEqual(['@ui-base/core', '@ui-base/ui']);
    expect(packages.find((pkg) => pkg.name === '@ui-base/ui')?.dependencies).toEqual(['@ui-base/core']);
  });

  it('adds selected packages and their UI-Base dependencies to an app package.json', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'uib-foundation-source-'));
    const workspace = path.join(root, 'data', 'foundation-sources', 'zanyfrog-ui-base', 'a'.repeat(40));
    await createWorkspace(workspace);
    const appDir = path.join(root, 'app');
    await mkdir(appDir, { recursive: true });
    await writeFile(path.join(appDir, 'app.manifest.json'), JSON.stringify({
      manifestVersion: '1.0.0', appId: 'example', template: 'standard', templateVersion: '1.0.0', packages: {},
    }, null, 2) + '\n', 'utf8');
    await writeFile(path.join(appDir, 'package.json'), JSON.stringify({ name: '@ui-app/example', dependencies: {} }, null, 2) + '\n', 'utf8');
    await writeFile(path.join(root, 'data', 'foundation-sources.manifest.json'), JSON.stringify({
      manifestVersion: '1.0.0',
      updatedAt: '2026-09-08T00:00:00.000Z',
      sources: {
        'zanyfrog-ui-base': {
          id: 'zanyfrog-ui-base',
          kind: 'github',
          repository: 'git@github.com:zanyfrog/ui-base.git',
          commit: 'a'.repeat(40),
          installedAt: '2026-09-08T00:00:00.000Z',
          workspacePath: 'data/foundation-sources/zanyfrog-ui-base/' + 'a'.repeat(40),
          packages: await inspectFoundationWorkspace(workspace),
        },
      },
    }, null, 2) + '\n', 'utf8');

    const result = await addAppFoundationDependencies({
      sourceId: 'zanyfrog-ui-base',
      packageNames: ['@ui-base/ui'],
      appKey: 'example',
      appDir,
      platformRootDir: root,
    });
    const appPackage = JSON.parse(await readFile(path.join(appDir, 'package.json'), 'utf8')) as { dependencies: Record<string, string> };

    expect(result).toMatchObject({ packages: ['@ui-base/core', '@ui-base/ui'], requestedPackages: ['@ui-base/ui'], transitivePackages: ['@ui-base/core'] });
    expect(appPackage.dependencies['@ui-base/core']).toContain('data/foundation-sources/zanyfrog-ui-base');
    expect(appPackage.dependencies['@ui-base/ui']).toContain('data/foundation-sources/zanyfrog-ui-base');
    await expect(readFile(path.join(appDir, 'history', 'app-history.jsonl'), 'utf8')).resolves.toContain('"requestedPackages":["@ui-base/ui"]');
    await expect(getAppFoundationDependencies({ sourceId: 'zanyfrog-ui-base', appDir, platformRootDir: root })).resolves.toEqual({
      sourceId: 'zanyfrog-ui-base', fromSourcePackageNames: ['@ui-base/core', '@ui-base/ui'], existingPackageNames: [], directPackageNames: ['@ui-base/ui'], hasImportRecord: true,
    });
    const appManifest = JSON.parse(await readFile(path.join(appDir, 'app.manifest.json'), 'utf8')) as { foundationImports: Record<string, { selectedPackages: string[]; resolvedPackages: string[] }> };
    expect(appManifest.foundationImports['zanyfrog-ui-base']).toMatchObject({ selectedPackages: ['@ui-base/ui'], resolvedPackages: ['@ui-base/core', '@ui-base/ui'] });
  });

  async function createWorkspace(root?: string): Promise<string> {
    const workspace = root ?? await mkdtemp(path.join(tmpdir(), 'uib-foundation-workspace-'));
    await mkdir(path.join(workspace, 'packages', 'core'), { recursive: true });
    await mkdir(path.join(workspace, 'packages', 'ui'), { recursive: true });
    await writeFile(path.join(workspace, 'package.json'), JSON.stringify({ name: '@ui-base/workspace', workspaces: ['packages/*'] }, null, 2) + '\n', 'utf8');
    await writeFile(path.join(workspace, 'packages', 'core', 'package.json'), JSON.stringify({ name: '@ui-base/core', version: '1.0.0' }, null, 2) + '\n', 'utf8');
    await writeFile(path.join(workspace, 'packages', 'ui', 'package.json'), JSON.stringify({ name: '@ui-base/ui', version: '1.0.0', dependencies: { '@ui-base/core': '^1.0.0' } }, null, 2) + '\n', 'utf8');
    return workspace;
  }
});
