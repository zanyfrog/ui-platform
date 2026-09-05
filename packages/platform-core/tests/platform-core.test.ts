import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  discoverPackageManifests,
  getManifestFileName,
  isVersionCompatible,
  ServiceRegistry,
  ServiceRegistryError,
  validatePackageManifest,
} from '../src/index.js';

describe('@uib/platform-core', () => {
  it('normalizes scoped package names to manifest file names', () => {
    expect(getManifestFileName('@uib/calendar')).toBe('calendar.manifest.json');
    expect(getManifestFileName('@uib/platform-core')).toBe('platform-core.manifest.json');
  });

  it('validates a package manifest requiring a 1.0.0 service contract', () => {
    const manifest = {
      name: '@uib/calendar',
      version: '1.2.3',
      manifestVersion: '1.0.0',
      displayName: 'UIB Calendar',
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
    };

    expect(validatePackageManifest(manifest, { fileName: 'calendar.manifest.json' })).toEqual({
      valid: true,
      issues: [],
    });
  });

  it('registers and resolves services by string key and semver-compatible range', () => {
    const registry = new ServiceRegistry();
    const fakeSettings = {
      get(key: string) {
        return `value:${key}`;
      },
    };

    registry.register({
      key: 'settings',
      version: '1.0.0',
      service: fakeSettings,
      ownerPackage: '@uib/platform-core',
    });

    expect(registry.get<typeof fakeSettings>('settings', '^1.0.0').get('theme')).toBe('value:theme');
    expect(registry.has('settings', '^1.0.0')).toBe(true);
    expect(() => registry.get('settings', '^2.0.0')).toThrow(ServiceRegistryError);
  });

  it('checks initial supported semver compatibility rules', () => {
    expect(isVersionCompatible('1.0.0', '^1.0.0')).toBe(true);
    expect(isVersionCompatible('1.2.0', '^1.0.0')).toBe(true);
    expect(isVersionCompatible('2.0.0', '^1.0.0')).toBe(false);
    expect(isVersionCompatible('1.0.0', '1.0.0')).toBe(true);
  });

  it('discovers workspace and installed @uib package manifests', async () => {
    const rootDir = await mkdtemp(path.join(tmpdir(), 'uib-platform-core-'));
    const workspacePackageDir = path.join(rootDir, 'packages', 'calendar');
    const installedPackageDir = path.join(rootDir, 'node_modules', '@uib', 'forms');

    await mkdir(workspacePackageDir, { recursive: true });
    await mkdir(installedPackageDir, { recursive: true });

    await writeFile(
      path.join(workspacePackageDir, 'calendar.manifest.json'),
      JSON.stringify({
        name: '@uib/calendar',
        version: '1.0.0',
        manifestVersion: '1.0.0',
        displayName: 'UIB Calendar',
        capabilities: ['components'],
        requiresServices: {
          settings: '^1.0.0',
        },
      }),
    );

    await writeFile(
      path.join(installedPackageDir, 'forms.manifest.json'),
      JSON.stringify({
        name: '@uib/forms',
        version: '1.0.0',
        manifestVersion: '1.0.0',
        displayName: 'UIB Forms',
        capabilities: ['components'],
      }),
    );

    const result = await discoverPackageManifests({ rootDir });

    expect(result.rejected).toEqual([]);
    expect(result.manifests.map((entry) => entry.manifest.name).sort()).toEqual(['@uib/calendar', '@uib/forms']);
  });
});
