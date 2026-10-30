import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { isVersionCompatible } from '@uib/platform-core';
import type { AppPackageDeclaration, AppPackageListEntry, ComponentManifestEntry } from '../shared/types.js';

export const nativeUiBaseName = '@ui-base/ui';
const admitted = [
  { tag: 'uib-card', id: 'cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1', module: './src/layout/uib-card.js' },
  { tag: 'uib-panel', id: '@ui-base/ui:uib-panel', module: './src/layout/uib-panel.js' },
] as const;

/** Native manifest projection, not a fabricated Platform service manifest.
 * Only an explicit versioned platform-only declaration activates these entries. */
export async function nativeUiBaseEntry(platform: string, declaration?: AppPackageDeclaration): Promise<AppPackageListEntry | undefined> {
  const root = path.join(platform, 'node_modules', nativeUiBaseName);
  const physical = async (file: string) => {
    if ((await lstat(file)).isSymbolicLink() || (await realpath(file)).toLowerCase() !== path.resolve(file).toLowerCase()) throw new Error('Native UI Base inputs must use physical installed paths.');
  };
  try { await physical(root); } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  const packageFile = path.join(root, 'package.json'), manifestPath = path.join(root, 'ui.component.json');
  await physical(packageFile); await physical(manifestPath);
  const metadata = JSON.parse(await readFile(packageFile, 'utf8'));
  if (metadata.name !== nativeUiBaseName || typeof metadata.version !== 'string') throw new Error('Installed native UI Base package identity is invalid.');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const components: ComponentManifestEntry[] = [];
  for (const expected of admitted) {
    const matches = manifest.components?.filter((c: ComponentManifestEntry) => c.tagName === expected.tag) ?? [];
    if (matches.length !== 1) throw new Error('Native Card/Panel contract is missing or ambiguous.');
    const entry = matches[0];
    if ((entry.identity?.componentId ?? entry.id ?? `${nativeUiBaseName}:${entry.tagName}`) !== expected.id || entry.module !== expected.module) throw new Error('Native Card/Panel identity or module differs from its admitted contract.');
    await physical(path.resolve(root, expected.module)); components.push(entry);
  }
  const compatible = !!declaration?.version && isVersionCompatible(metadata.version, declaration.version);
  const selected = declaration?.resolution === 'platform-only';
  const enabled = declaration?.enabled === true;
  const valid = !enabled || selected && compatible;
  return { name: nativeUiBaseName, displayName: 'UI Base — Card and Panel', version: metadata.version,
    status: !enabled ? declaration ? 'disabled' : 'available' : valid ? 'enabled' : 'incompatible',
    sourceType: 'platform-node-modules', sourceLabel: 'Installed native UI Base (Card and Panel)', manifestPath, packageRoot: root,
    capabilities: [], requiresServices: {}, components, issues: valid ? [] : ['Native UI Base requires an explicit compatible version and platform-only resolution.'],
    appEnabled: enabled, declared: !!declaration, requestedVersion: declaration?.version, resolution: declaration?.resolution ?? 'platform-only',
    resolved: valid, globalAvailable: true, appLocalAvailable: false };
}

export function assertNativeUiBaseModule(modulePath: string): void {
  if (!admitted.some(entry => entry.module === modulePath)) throw new Error('Only the explicitly admitted native Card/Panel entry modules are available.');
}
