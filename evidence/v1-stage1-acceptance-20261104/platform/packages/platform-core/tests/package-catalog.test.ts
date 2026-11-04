/**
 * Purpose: Verifies package catalog state, discovery timestamps, installed packages, and app enablement behavior.
 * Use: Extend these fixture-based tests when catalog status, state, or discovery rules change.
 */

import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PACKAGE_CATALOG_STATE_PATH,
  enablePackageForApp,
  listAppPackageCatalog,
  listGlobalPackageCatalog,
  refreshPackageCatalog,
  resolvePackageCatalogStatePath,
  type PackageCatalogStateManifest,
} from '../src/index.js';

describe('package catalog', () => {
  it('creates persistent catalog state during first discovery', async () => {
    const rootDir = await createCatalogFixture('2026-09-05T10:00:00.000Z');

    const result = await refreshPackageCatalog({ rootDir, now: () => '2026-09-05T10:00:00.000Z' });
    const statePath = resolvePackageCatalogStatePath(rootDir, DEFAULT_PACKAGE_CATALOG_STATE_PATH);
    const persisted = JSON.parse(await readFile(statePath, 'utf8')) as PackageCatalogStateManifest;

    expect(result.entries).toHaveLength(1);
    expect(result.entries[0]).toMatchObject({
      name: '@uib/calendar',
      displayName: 'UIB Calendar',
      version: '1.0.0',
      icon: './assets/calendar.svg',
      status: 'available',
      source: { type: 'workspace' },
    });
    expect(persisted.packages['@uib/calendar'].firstDiscoveredAt).toBe('2026-09-05T10:00:00.000Z');
    expect(persisted.packages['@uib/calendar'].addedAt).toBe('2026-09-05T10:00:00.000Z');
  });

  it('preserves firstDiscoveredAt across later discovery scans', async () => {
    const rootDir = await createCatalogFixture('2026-09-05T10:00:00.000Z');

    await refreshPackageCatalog({ rootDir, now: () => '2026-09-05T10:00:00.000Z' });
    const result = await refreshPackageCatalog({ rootDir, now: () => '2026-09-05T11:00:00.000Z' });

    expect(result.entries[0].firstDiscoveredAt).toBe('2026-09-05T10:00:00.000Z');
    expect(result.entries[0].lastDiscoveredAt).toBe('2026-09-05T11:00:00.000Z');
  });

  it('does not list removed manifests as currently available', async () => {
    const rootDir = await createCatalogFixture('2026-09-05T10:00:00.000Z');
    const manifestPath = path.join(rootDir, 'packages', 'calendar', 'calendar.manifest.json');

    await refreshPackageCatalog({ rootDir, now: () => '2026-09-05T10:00:00.000Z' });
    await rm(manifestPath);

    const result = await refreshPackageCatalog({ rootDir, now: () => '2026-09-05T11:00:00.000Z' });
    const persisted = JSON.parse(await readFile(result.stateFilePath, 'utf8')) as PackageCatalogStateManifest;

    expect(result.entries).toEqual([]);
    expect(persisted.packages['@uib/calendar'].firstDiscoveredAt).toBe('2026-09-05T10:00:00.000Z');
  });

  it('records per-app enablement without losing discovery metadata', async () => {
    const rootDir = await createCatalogFixture('2026-09-05T10:00:00.000Z');

    await refreshPackageCatalog({ rootDir, now: () => '2026-09-05T10:00:00.000Z' });
    await enablePackageForApp({
      rootDir,
      packageName: '@uib/calendar',
      appId: 'reservations',
      now: () => '2026-09-05T12:00:00.000Z',
    });

    const globalEntries = await listGlobalPackageCatalog({ rootDir, now: () => '2026-09-05T13:00:00.000Z' });
    const appEntries = await listAppPackageCatalog({ rootDir, appId: 'reservations', now: () => '2026-09-05T13:00:00.000Z' });

    expect(globalEntries[0].status).toBe('enabled');
    expect(globalEntries[0].enabledForApps.reservations).toMatchObject({
      appId: 'reservations',
      status: 'enabled',
      enabledAt: '2026-09-05T12:00:00.000Z',
    });
    expect(globalEntries[0].firstDiscoveredAt).toBe('2026-09-05T10:00:00.000Z');
    expect(appEntries.map((entry) => entry.name)).toEqual(['@uib/calendar']);
  });

  it('includes installed @uib packages in the global catalog', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'uib-package-catalog-'));
    const installedPackageDir = path.join(rootDir, 'node_modules', '@uib', 'forms');
    await mkdir(installedPackageDir, { recursive: true });
    await writeManifest(path.join(installedPackageDir, 'forms.manifest.json'), {
      name: '@uib/forms',
      version: '1.0.0',
      manifestVersion: '1.0.0',
      displayName: 'UIB Forms',
      icon: './assets/forms.svg',
      capabilities: ['components'],
    });

    const entries = await listGlobalPackageCatalog({ rootDir, now: () => '2026-09-05T10:00:00.000Z' });

    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      name: '@uib/forms',
      icon: './assets/forms.svg',
      source: { type: 'installed' },
    });
  });
});

async function createCatalogFixture(now: string): Promise<string> {
  const rootDir = await mkdtemp(path.join(tmpdir(), 'uib-package-catalog-'));
  const packageDir = path.join(rootDir, 'packages', 'calendar');
  await mkdir(packageDir, { recursive: true });
  await writeManifest(path.join(packageDir, 'calendar.manifest.json'), {
    name: '@uib/calendar',
    version: '1.0.0',
    manifestVersion: '1.0.0',
    displayName: 'UIB Calendar',
    description: 'Calendar components and services for UIB applications',
    icon: './assets/calendar.svg',
    capabilities: ['components', 'settings', 'data'],
    requiresServices: {
      settings: '^1.0.0',
    },
    components: [
      {
        name: 'Calendar',
        tagName: 'uib-calendar',
      },
    ],
    data: {
      stores: [
        {
          name: 'events',
          purpose: 'Stores calendar events',
          access: 'read-write',
          scope: 'application',
        },
      ],
    },
    metadata: {
      fixtureCreatedAt: now,
    },
  });
  return rootDir;
}

async function writeManifest(filePath: string, manifest: Record<string, unknown>): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}