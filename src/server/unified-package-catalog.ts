/**
 * Purpose: Produces one read model for UIB extension and foundation workspace packages.
 * Use: The Package Manager uses this catalog for scanning package availability and app usage.
 */

import type { FoundationPackageUsage, FoundationSource, UnifiedPackageCatalogEntry, UnifiedPackageCatalogPayload } from '../shared/types.js';
import { discoverApps } from './applications.js';
import { getGlobalPackageCatalog } from './packages.js';
import { getAppFoundationDependencies, listFoundationSources, removeFoundationSource } from './foundation-sources.js';

export async function getUnifiedPackageCatalog(): Promise<UnifiedPackageCatalogPayload> {
  const [uibCatalog, sourcePayload, apps] = await Promise.all([
    getGlobalPackageCatalog(),
    listFoundationSources(),
    discoverApps(),
  ]);
  const usageBySource = await Promise.all(sourcePayload.sources.map((source) => getSourceUsage(source, apps.map((app) => app.key))));
  const foundationEntries = sourcePayload.sources.flatMap((source, index) => source.packages.map((pkg) => ({
    kind: 'foundation' as const,
    name: pkg.name,
    displayName: packageDisplayName(pkg.name),
    version: pkg.version,
    status: 'installed' as const,
    lifecycleLabel: 'Foundation workspace',
    sourceLabel: source.id,
    sourceId: source.id,
    repository: source.repository,
    commit: source.commit,
    installedAt: source.installedAt,
    appUsage: usageBySource[index].get(pkg.name) ?? [],
    details: [
      'Pinned GitHub workspace package.',
      pkg.dependencies.length ? 'Depends on: ' + pkg.dependencies.join(', ') : 'No UI-Base workspace dependencies declared.',
    ],
  })));
  const entries: UnifiedPackageCatalogEntry[] = [
    ...uibCatalog.entries.map((entry) => ({
      kind: 'uib-extension' as const,
      name: entry.name,
      displayName: entry.displayName,
      version: entry.version,
      description: entry.description,
      icon: entry.icon,
      status: entry.status,
      lifecycleLabel: 'UIB extension',
      sourceLabel: entry.sourceLabel,
      installedAt: entry.addedAt,
      firstDiscoveredAt: entry.firstDiscoveredAt,
      addedAt: entry.addedAt,
      lastDiscoveredAt: entry.lastDiscoveredAt,
      appUsage: [],
      details: [
        entry.capabilities.length ? 'Capabilities: ' + entry.capabilities.join(', ') : 'No capabilities declared.',
        ...entry.issues,
      ],
    })),
    ...foundationEntries,
  ].sort((a, b) => a.displayName.localeCompare(b.displayName) || a.name.localeCompare(b.name));
  return { entries, rejected: uibCatalog.rejected, foundationSources: sourcePayload.sources };
}

export async function removeUnusedFoundationSource(sourceId: string): Promise<void> {
  const [sources, apps] = await Promise.all([listFoundationSources(), discoverApps()]);
  const source = sources.sources.find((item) => item.id === sourceId);
  if (!source) throw new Error('Foundation source was not found.');
  const usage = await getSourceUsage(source, apps.map((app) => app.key));
  const appKeys = [...new Set([...usage.values()].flat().map((item) => item.appKey))];
  if (appKeys.length) throw new Error('This source is still used by: ' + appKeys.join(', ') + '. Remove or migrate those application dependencies first.');
  await removeFoundationSource(sourceId);
}

async function getSourceUsage(source: FoundationSource, appKeys: string[]): Promise<Map<string, FoundationPackageUsage[]>> {
  const usage = new Map<string, FoundationPackageUsage[]>();
  await Promise.all(appKeys.map(async (appKey) => {
    try {
      const state = await getAppFoundationDependencies({ appKey, sourceId: source.id });
      const direct = new Set(state.directPackageNames);
      for (const name of state.fromSourcePackageNames) {
        const relationship: FoundationPackageUsage['relationship'] = state.hasImportRecord ? (direct.has(name) ? 'direct' : 'dependency') : 'legacy';
        usage.set(name, [...(usage.get(name) ?? []), { appKey, relationship }]);
      }
    } catch {
      // An invalid application must not prevent the global catalog from loading.
    }
  }));
  return usage;
}

function packageDisplayName(name: string): string {
  return name.split('/').pop()?.replace(/(^|[-_])(.)/g, (_, prefix: string, letter: string) => prefix ? ' ' + letter.toUpperCase() : letter.toUpperCase()) ?? name;
}
