import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import type { AppManifest } from '../src/shared/types.js';
import { activePackageEntries, resolveAppPackageCatalog } from '../src/server/packages.js';

describe('app package activation', () => {
  it('returns enabled resolved package components for activation', async () => {
    const fixture = await createFixture();
    await writeUibPackage(path.join(fixture.platformRoot, 'packages', 'calendar'), {
      name: '@uib/calendar',
      version: '1.0.0',
      tagName: 'uib-calendar',
    });

    const catalog = await resolveAppPackageCatalog({
      appDir: fixture.appDir,
      platformRootDir: fixture.platformRoot,
      appManifest: appManifest({ '@uib/calendar': { enabled: true, version: '^1.0.0' } }),
    });

    const active = activePackageEntries(catalog.entries);
    expect(active.map((entry) => entry.name)).toEqual(['@uib/calendar']);
    expect(active[0].components.map((component) => component.tagName)).toEqual(['uib-calendar']);
  });

  it('excludes disabled packages from activation', async () => {
    const fixture = await createFixture();
    await writeUibPackage(path.join(fixture.platformRoot, 'packages', 'calendar'), {
      name: '@uib/calendar',
      version: '1.0.0',
      tagName: 'uib-calendar',
    });

    const catalog = await resolveAppPackageCatalog({
      appDir: fixture.appDir,
      platformRootDir: fixture.platformRoot,
      appManifest: appManifest({ '@uib/calendar': { enabled: false, version: '^1.0.0' } }),
    });

    expect(catalog.entries.find((entry) => entry.name === '@uib/calendar')?.status).toBe('disabled');
    expect(activePackageEntries(catalog.entries)).toEqual([]);
  });

  it('preserves missing and incompatible package declarations as warning states', async () => {
    const fixture = await createFixture();
    await writeUibPackage(path.join(fixture.platformRoot, 'packages', 'calendar'), {
      name: '@uib/calendar',
      version: '1.0.0',
      tagName: 'uib-calendar',
    });

    const catalog = await resolveAppPackageCatalog({
      appDir: fixture.appDir,
      platformRootDir: fixture.platformRoot,
      appManifest: appManifest({
        '@uib/missing': { enabled: true, version: '^1.0.0' },
        '@uib/calendar': { enabled: true, version: '^2.0.0' },
      }),
    });

    const missing = catalog.entries.find((entry) => entry.name === '@uib/missing');
    const incompatible = catalog.entries.find((entry) => entry.name === '@uib/calendar');

    expect(missing).toMatchObject({ status: 'missing', resolved: false, appEnabled: true });
    expect(missing?.issues[0]).toContain('enabled in app.manifest.json');
    expect(incompatible).toMatchObject({ status: 'incompatible', resolved: true, appEnabled: true });
    expect(incompatible?.issues[0]).toContain('App requests ^2.0.0');
    expect(activePackageEntries(catalog.entries)).toEqual([]);
  });

  it('resolves app-local packages before platform packages by default', async () => {
    const fixture = await createFixture();
    await writeUibPackage(path.join(fixture.platformRoot, 'packages', 'calendar'), {
      name: '@uib/calendar',
      version: '1.0.0',
      tagName: 'platform-calendar',
    });
    await writeUibPackage(path.join(fixture.appDir, 'packages', 'calendar'), {
      name: '@uib/calendar',
      version: '1.0.1',
      tagName: 'app-calendar',
    });

    const catalog = await resolveAppPackageCatalog({
      appDir: fixture.appDir,
      platformRootDir: fixture.platformRoot,
      appManifest: appManifest({ '@uib/calendar': { enabled: true, version: '^1.0.0' } }),
    });

    const calendar = catalog.entries.find((entry) => entry.name === '@uib/calendar');
    expect(calendar).toMatchObject({ version: '1.0.1', sourceType: 'app-packages', status: 'enabled' });
    expect(calendar?.components.map((component) => component.tagName)).toEqual(['app-calendar']);
  });
  it('resolves app workspace packages before app installed packages', async () => {
    const fixture = await createFixture();
    await writeUibPackage(path.join(fixture.appDir, 'node_modules', '@uib', 'calendar'), {
      name: '@uib/calendar',
      version: '1.0.2',
      tagName: 'installed-calendar',
    });
    await writeUibPackage(path.join(fixture.appDir, 'packages', 'calendar'), {
      name: '@uib/calendar',
      version: '1.0.1',
      tagName: 'workspace-calendar',
    });

    const catalog = await resolveAppPackageCatalog({
      appDir: fixture.appDir,
      platformRootDir: fixture.platformRoot,
      appManifest: appManifest({ '@uib/calendar': { enabled: true, version: '^1.0.0' } }),
    });

    const calendar = catalog.entries.find((entry) => entry.name === '@uib/calendar');
    expect(calendar).toMatchObject({ version: '1.0.1', sourceType: 'app-packages', status: 'enabled' });
    expect(calendar?.components.map((component) => component.tagName)).toEqual(['workspace-calendar']);
  });
});

async function createFixture(): Promise<{ appDir: string; platformRoot: string }> {
  const root = await mkdtemp(path.join(tmpdir(), 'uib-package-activation-'));
  return { appDir: path.join(root, 'app'), platformRoot: path.join(root, 'platform') };
}

function appManifest(packages: AppManifest['packages']): AppManifest {
  return {
    manifestVersion: '1.0.0',
    appId: 'test-app',
    template: 'standard',
    templateVersion: '1.0.0',
    packages,
  };
}

async function writeUibPackage(packageDir: string, input: { name: string; version: string; tagName: string }): Promise<void> {
  await mkdir(packageDir, { recursive: true });
  await writeFile(
    path.join(packageDir, `${input.name.split('/').at(-1)}.manifest.json`),
    `${JSON.stringify({
      name: input.name,
      version: input.version,
      manifestVersion: '1.0.0',
      displayName: input.name,
      capabilities: ['components'],
      components: [{ name: input.tagName, tagName: input.tagName }],
    }, null, 2)}\n`,
    'utf8',
  );
}

