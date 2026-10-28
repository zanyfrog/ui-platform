import {
  discoverPackageManifests,
  isVersionCompatible,
  refreshPackageCatalog,
  type DiscoveredPackageManifest,
  type PackageCatalogEntry,
  type RejectedPackageManifest,
} from '@uib/platform-core';
import type {
  AppManifest,
  AppPackageCatalogPayload,
  AppPackageDeclaration,
  AppPackageListEntry,
  PackageCatalogPayload,
  PackageListEntry,
  PackageListSourceType,
  PackageManifestIssue,
} from '../shared/types.js';
import { appManifestPathFor, ensureAppManifest, setAppPackageDeclaration } from './app-manifests.js';
import { appendHistory } from './history.js';
import { appPath } from './applications.js';
import { platformRoot } from './paths.js';

interface CandidatePackage {
  manifest: DiscoveredPackageManifest['manifest'];
  filePath: string;
  packageRoot: string;
  sourceType: PackageListSourceType;
  firstDiscoveredAt?: string;
  addedAt?: string;
  lastDiscoveredAt?: string;
}

export interface ResolveAppPackageCatalogOptions {
  appManifest: AppManifest;
  appDir: string;
  platformRootDir: string;
}

export async function getGlobalPackageCatalog(): Promise<PackageCatalogPayload> {
  const catalog = await refreshPackageCatalog({ rootDir: platformRoot });
  return {
    entries: catalog.entries.map(toGlobalPackageListEntry).sort(sortPackages),
    rejected: catalog.rejected.map((issue) => toManifestIssue(issue, sourceTypeForPlatform(issue.source.type))),
    stateFilePath: catalog.stateFilePath,
  };
}

export async function getAppPackageCatalog(key: string): Promise<AppPackageCatalogPayload> {
  const appManifest = await ensureAppManifest(key);
  return resolveAppPackageCatalog({ appManifest, appDir: appPath(key), platformRootDir: platformRoot });
}

export async function resolveAppPackageCatalog(options: ResolveAppPackageCatalogOptions): Promise<AppPackageCatalogPayload> {
  const [appDiscovery, platformCatalog] = await Promise.all([
    discoverPackageManifests({ rootDir: options.appDir }),
    refreshPackageCatalog({ rootDir: options.platformRootDir }),
  ]);

  const appCandidates = new Map<string, CandidatePackage>();
  for (const discovered of appDiscovery.manifests) {
    setPreferredCandidate(appCandidates, discovered.manifest.name, toCandidate(discovered, sourceTypeForApp(discovered.source.type)));
  }

  const platformCandidates = new Map<string, CandidatePackage>();
  for (const entry of platformCatalog.entries) {
    setPreferredCandidate(platformCandidates, entry.name, toCandidateFromCatalog(entry));
  }

  const packageNames = new Set<string>([
    ...Object.keys(options.appManifest.packages),
    ...appCandidates.keys(),
    ...platformCandidates.keys(),
  ]);

  const entries = [...packageNames]
    .map((packageName) => toAppPackageListEntry(packageName, options.appManifest, appCandidates, platformCandidates))
    .sort(sortPackages);

  return {
    appManifest: options.appManifest,
    entries,
    rejected: [
      ...appDiscovery.rejected.map((issue) => toManifestIssue(issue, sourceTypeForApp(issue.source.type))),
      ...platformCatalog.rejected.map((issue) => toManifestIssue(issue, sourceTypeForPlatform(issue.source.type))),
    ],
  };
}

export async function getActiveAppPackages(key: string): Promise<AppPackageListEntry[]> {
  const catalog = await getAppPackageCatalog(key);
  return activePackageEntries(catalog.entries);
}

export function activePackageEntries(entries: AppPackageListEntry[]): AppPackageListEntry[] {
  return entries.filter((entry) => entry.appEnabled && entry.resolved && entry.status !== 'missing' && entry.status !== 'incompatible');
}

function setPreferredCandidate(candidates: Map<string, CandidatePackage>, packageName: string, candidate: CandidatePackage): void {
  if (!candidates.has(packageName)) {
    candidates.set(packageName, candidate);
  }
}
export async function enableAppPackage(key: string, packageName: string, version?: string): Promise<AppPackageCatalogPayload> {
  const catalog = await getAppPackageCatalog(key);
  const current = catalog.entries.find((entry) => entry.name === packageName);
  const now = new Date().toISOString();
  const requestedVersion = version ?? current?.requestedVersion ?? (current?.version ? defaultVersionRange(current.version) : undefined);

  if (!current?.resolved && !requestedVersion) {
    throw new Error(`Package "${packageName}" is not available to this application.`);
  }

  await setAppPackageDeclaration(key, packageName, {
    enabled: true,
    version: requestedVersion,
    resolution: 'app-first',
    addedAt: catalog.appManifest.packages[packageName]?.addedAt ?? now,
    updatedAt: now,
  });
  await appendHistory(appPath(key), { action: 'package.enabled', appId: catalog.appManifest.appId, packageName, actor: 'local-user' });
  return getAppPackageCatalog(key);
}

export async function disableAppPackage(key: string, packageName: string): Promise<AppPackageCatalogPayload> {
  const manifest = await ensureAppManifest(key);
  const existing = manifest.packages[packageName];
  const now = new Date().toISOString();
  const declaration: AppPackageDeclaration = {
    enabled: false,
    version: existing?.version,
    resolution: existing?.resolution ?? 'app-first',
    addedAt: existing?.addedAt ?? now,
    updatedAt: now,
  };
  await setAppPackageDeclaration(key, packageName, declaration);
  await appendHistory(appPath(key), { action: 'package.disabled', appId: manifest.appId, packageName, actor: 'local-user' });
  return getAppPackageCatalog(key);
}

export function appManifestFilePath(key: string): string {
  return appManifestPathFor(key);
}

function toAppPackageListEntry(
  packageName: string,
  appManifest: AppManifest,
  appCandidates: Map<string, CandidatePackage>,
  platformCandidates: Map<string, CandidatePackage>,
): AppPackageListEntry {
  const declaration = appManifest.packages[packageName];
  const appCandidate = appCandidates.get(packageName);
  const platformCandidate = platformCandidates.get(packageName);
  const candidate = chooseCandidate(declaration, appCandidate, platformCandidate);
  const requestedVersion = declaration?.version;
  const issues: string[] = [];
  let status: AppPackageListEntry['status'] = declaration?.enabled ? 'enabled' : declaration ? 'disabled' : 'available';

  if (declaration?.enabled && !candidate) {
    status = 'missing';
    issues.push('Package is enabled in app.manifest.json but no matching package manifest was found.');
  } else if (declaration?.enabled && requestedVersion && candidate && !isVersionCompatible(candidate.manifest.version, requestedVersion)) {
    status = 'incompatible';
    issues.push(`App requests ${requestedVersion}, but resolved package version is ${candidate.manifest.version}.`);
  }

  return {
    ...toPackageListEntry(packageName, candidate),
    status,
    appEnabled: declaration?.enabled === true,
    declared: Boolean(declaration),
    requestedVersion,
    resolution: declaration?.resolution ?? 'app-first',
    resolved: Boolean(candidate),
    globalAvailable: Boolean(platformCandidate),
    appLocalAvailable: Boolean(appCandidate),
    issues,
  };
}

function chooseCandidate(
  declaration: AppPackageDeclaration | undefined,
  appCandidate: CandidatePackage | undefined,
  platformCandidate: CandidatePackage | undefined,
): CandidatePackage | undefined {
  switch (declaration?.resolution) {
    case 'app-only':
      return appCandidate;
    case 'platform-first':
      return platformCandidate ?? appCandidate;
    case 'platform-only':
      return platformCandidate;
    case 'app-first':
    default:
      return appCandidate ?? platformCandidate;
  }
}

function toPackageListEntry(packageName: string, candidate: CandidatePackage | undefined): PackageListEntry {
  if (!candidate) {
    return {
      name: packageName,
      displayName: packageName,
      version: '',
      status: 'missing',
      sourceType: 'app-packages',
      sourceLabel: 'Missing',
      manifestPath: '',
      packageRoot: '',
      capabilities: [],
      requiresServices: {},
      components: [],
      issues: [],
    };
  }

  return {
    name: candidate.manifest.name,
    displayName: candidate.manifest.displayName,
    version: candidate.manifest.version,
    description: candidate.manifest.description,
    icon: candidate.manifest.icon,
    status: candidate.sourceType === 'platform-node-modules' || candidate.sourceType === 'app-node-modules' ? 'installed' : 'available',
    sourceType: candidate.sourceType,
    sourceLabel: sourceLabel(candidate.sourceType),
    manifestPath: candidate.filePath,
    packageRoot: candidate.packageRoot,
    capabilities: candidate.manifest.capabilities,
    requiresServices: candidate.manifest.requiresServices ?? {},
    components: candidate.manifest.components ?? [],
    firstDiscoveredAt: candidate.firstDiscoveredAt,
    addedAt: candidate.addedAt,
    lastDiscoveredAt: candidate.lastDiscoveredAt,
    issues: [],
  };
}

function toGlobalPackageListEntry(entry: PackageCatalogEntry): PackageListEntry {
  const sourceType = sourceTypeForPlatform(entry.source.type);
  return {
    name: entry.name,
    displayName: entry.displayName,
    version: entry.version,
    description: entry.description,
    icon: entry.icon,
    status: entry.status === 'missing-dependency' ? 'error' : entry.status,
    sourceType,
    sourceLabel: sourceLabel(sourceType),
    manifestPath: entry.source.manifestPath,
    packageRoot: entry.source.packageRoot,
    capabilities: entry.capabilities,
    requiresServices: entry.requiresServices,
    components: entry.components,
    firstDiscoveredAt: entry.firstDiscoveredAt,
    addedAt: entry.addedAt,
    lastDiscoveredAt: entry.lastDiscoveredAt,
    issues: entry.health.issues,
  };
}

function toCandidate(discovered: DiscoveredPackageManifest, sourceType: PackageListSourceType): CandidatePackage {
  return {
    manifest: discovered.manifest,
    filePath: discovered.filePath,
    packageRoot: discovered.source.packageRoot,
    sourceType,
  };
}

function toCandidateFromCatalog(entry: PackageCatalogEntry): CandidatePackage {
  return {
    manifest: entry.manifest,
    filePath: entry.source.manifestPath,
    packageRoot: entry.source.packageRoot,
    sourceType: sourceTypeForPlatform(entry.source.type),
    firstDiscoveredAt: entry.firstDiscoveredAt,
    addedAt: entry.addedAt,
    lastDiscoveredAt: entry.lastDiscoveredAt,
  };
}

function toManifestIssue(issue: RejectedPackageManifest, sourceType: PackageListSourceType): PackageManifestIssue {
  return {
    filePath: issue.filePath,
    sourceType,
    packageRoot: issue.source.packageRoot,
    issues: issue.validation.issues,
  };
}

function sourceTypeForApp(sourceType: 'workspace' | 'installed'): PackageListSourceType {
  return sourceType === 'workspace' ? 'app-packages' : 'app-node-modules';
}

function sourceTypeForPlatform(sourceType: 'workspace' | 'installed'): PackageListSourceType {
  return sourceType === 'workspace' ? 'platform-packages' : 'platform-node-modules';
}

function sourceLabel(sourceType: PackageListSourceType): string {
  switch (sourceType) {
    case 'app-packages':
      return 'App packages';
    case 'app-node-modules':
      return 'App node_modules';
    case 'platform-packages':
      return 'Platform packages';
    case 'platform-node-modules':
      return 'Platform node_modules';
  }
}

function defaultVersionRange(version: string): string {
  return /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version) ? `^${version}` : version;
}

function sortPackages(a: { displayName: string; name: string }, b: { displayName: string; name: string }): number {
  return a.displayName.localeCompare(b.displayName) || a.name.localeCompare(b.name);
}
