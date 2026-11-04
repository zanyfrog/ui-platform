/**
 * Purpose: Maintains the platform package catalog by merging discovered manifests with platform-owned state.
 * Use: Admin, CLI, HTTP, and runtime services call these helpers to list global packages and manage app enablement.
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { discoverPackageManifests, type DiscoveredPackageManifest, type ManifestDiscoveryOptions, type RejectedPackageManifest } from './manifest-discovery.js';
import type { UibPackageManifest } from './manifest.js';

export const PACKAGE_CATALOG_STATE_VERSION = '1.0.0';
export const DEFAULT_PACKAGE_CATALOG_STATE_PATH = path.join('data', 'package-catalog.manifest.json');

export type PackageCatalogStatus = 'available' | 'installed' | 'enabled' | 'disabled' | 'missing-dependency' | 'incompatible' | 'error';
export type PackageUpdatePolicy = 'manual' | 'patch' | 'minor' | 'latest' | 'pinned';
export type PackageUpdateChannel = 'stable' | 'preview' | 'beta' | 'development';
export type PackageHealthStatus = 'unknown' | 'healthy' | 'warning' | 'error';

export interface PackageCatalogHealth {
  status: PackageHealthStatus;
  issues: string[];
  checkedAt?: string;
}

export interface PackageAppEnablement {
  appId: string;
  status: 'enabled' | 'disabled';
  enabledAt?: string;
  disabledAt?: string;
}

export interface PackageCatalogStateEntry {
  name: string;
  firstDiscoveredAt: string;
  addedAt: string;
  lastDiscoveredAt?: string;
  lastSeenVersion?: string;
  lastManifestPath?: string;
  source?: 'workspace' | 'installed';
  status?: PackageCatalogStatus;
  installedAt?: string;
  installedVersion?: string;
  activeVersion?: string;
  updatePolicy?: PackageUpdatePolicy;
  channel?: PackageUpdateChannel;
  health?: PackageCatalogHealth;
  enabledForApps?: Record<string, PackageAppEnablement>;
}

export interface PackageCatalogStateManifest {
  manifestVersion: typeof PACKAGE_CATALOG_STATE_VERSION;
  updatedAt: string;
  packages: Record<string, PackageCatalogStateEntry>;
}

export interface PackageCatalogEntry {
  name: string;
  displayName: string;
  version: string;
  description?: string;
  icon?: string;
  manifest: UibPackageManifest;
  status: PackageCatalogStatus;
  available: boolean;
  firstDiscoveredAt: string;
  addedAt: string;
  lastDiscoveredAt: string;
  installedAt?: string;
  installedVersion?: string;
  activeVersion?: string;
  updatePolicy?: PackageUpdatePolicy;
  channel?: PackageUpdateChannel;
  health: PackageCatalogHealth;
  enabledForApps: Record<string, PackageAppEnablement>;
  source: {
    type: 'workspace' | 'installed';
    manifestPath: string;
    packageRoot: string;
  };
  capabilities: UibPackageManifest['capabilities'];
  requiresServices: NonNullable<UibPackageManifest['requiresServices']>;
  components: NonNullable<UibPackageManifest['components']>;
  settings?: UibPackageManifest['settings'];
  data?: UibPackageManifest['data'];
  admin?: UibPackageManifest['admin'];
}

export interface PackageCatalogRefreshOptions extends ManifestDiscoveryOptions {
  stateFilePath?: string;
  now?: () => string;
}

export interface PackageCatalogRefreshResult {
  entries: PackageCatalogEntry[];
  state: PackageCatalogStateManifest;
  rejected: RejectedPackageManifest[];
  stateFilePath: string;
}

export interface EnablePackageForAppOptions {
  rootDir: string;
  packageName: string;
  appId: string;
  stateFilePath?: string;
  now?: () => string;
}

export interface AppPackageCatalogOptions extends PackageCatalogRefreshOptions {
  appId: string;
}

export async function refreshPackageCatalog(options: PackageCatalogRefreshOptions): Promise<PackageCatalogRefreshResult> {
  const stateFilePath = resolvePackageCatalogStatePath(options.rootDir, options.stateFilePath);
  const now = resolveNow(options.now);
  const state = await loadPackageCatalogState(options.rootDir, stateFilePath);
  const discovery = await discoverPackageManifests(options);

  for (const discovered of discovery.manifests) {
    const existing = state.packages[discovered.manifest.name];
    state.packages[discovered.manifest.name] = mergeStateEntry(existing, discovered, now);
  }

  state.updatedAt = now;
  await savePackageCatalogState(stateFilePath, state);

  return {
    entries: discovery.manifests.map((discovered) => toCatalogEntry(discovered, state.packages[discovered.manifest.name])),
    state,
    rejected: discovery.rejected,
    stateFilePath,
  };
}

export async function listGlobalPackageCatalog(options: PackageCatalogRefreshOptions): Promise<PackageCatalogEntry[]> {
  return (await refreshPackageCatalog(options)).entries;
}

export async function listAppPackageCatalog(options: AppPackageCatalogOptions): Promise<PackageCatalogEntry[]> {
  const entries = await listGlobalPackageCatalog(options);
  return entries.filter((entry) => entry.enabledForApps[options.appId]?.status === 'enabled');
}

export async function enablePackageForApp(options: EnablePackageForAppOptions): Promise<PackageCatalogStateManifest> {
  const stateFilePath = resolvePackageCatalogStatePath(options.rootDir, options.stateFilePath);
  const now = resolveNow(options.now);
  const state = await loadPackageCatalogState(options.rootDir, stateFilePath);
  const existing = state.packages[options.packageName];

  const entry: PackageCatalogStateEntry = existing ?? {
    name: options.packageName,
    firstDiscoveredAt: now,
    addedAt: now,
  };

  const existingApp = entry.enabledForApps?.[options.appId];
  entry.enabledForApps = {
    ...(entry.enabledForApps ?? {}),
    [options.appId]: {
      appId: options.appId,
      status: 'enabled',
      enabledAt: existingApp?.enabledAt ?? now,
    },
  };
  entry.status = 'enabled';
  state.packages[options.packageName] = entry;
  state.updatedAt = now;

  await savePackageCatalogState(stateFilePath, state);
  return state;
}

export async function disablePackageForApp(options: EnablePackageForAppOptions): Promise<PackageCatalogStateManifest> {
  const stateFilePath = resolvePackageCatalogStatePath(options.rootDir, options.stateFilePath);
  const now = resolveNow(options.now);
  const state = await loadPackageCatalogState(options.rootDir, stateFilePath);
  const existing = state.packages[options.packageName];

  if (!existing) {
    throw new Error(`Package "${options.packageName}" has not been discovered.`);
  }

  existing.enabledForApps = {
    ...(existing.enabledForApps ?? {}),
    [options.appId]: {
      appId: options.appId,
      status: 'disabled',
      enabledAt: existing.enabledForApps?.[options.appId]?.enabledAt,
      disabledAt: now,
    },
  };
  existing.status = Object.values(existing.enabledForApps).some((app) => app.status === 'enabled') ? 'enabled' : 'disabled';
  state.updatedAt = now;

  await savePackageCatalogState(stateFilePath, state);
  return state;
}

export async function loadPackageCatalogState(rootDir: string, stateFilePath?: string): Promise<PackageCatalogStateManifest> {
  const resolvedPath = resolvePackageCatalogStatePath(rootDir, stateFilePath);

  try {
    const parsed = JSON.parse(await readFile(resolvedPath, 'utf8')) as Partial<PackageCatalogStateManifest>;
    return normalizePackageCatalogState(parsed);
  } catch {
    const now = new Date().toISOString();
    return { manifestVersion: PACKAGE_CATALOG_STATE_VERSION, updatedAt: now, packages: {} };
  }
}

export async function savePackageCatalogState(stateFilePath: string, state: PackageCatalogStateManifest): Promise<void> {
  await mkdir(path.dirname(stateFilePath), { recursive: true });
  await writeFile(stateFilePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8');
}

export function resolvePackageCatalogStatePath(rootDir: string, stateFilePath = DEFAULT_PACKAGE_CATALOG_STATE_PATH): string {
  return path.isAbsolute(stateFilePath) ? stateFilePath : path.join(rootDir, stateFilePath);
}

function mergeStateEntry(
  existing: PackageCatalogStateEntry | undefined,
  discovered: DiscoveredPackageManifest,
  now: string,
): PackageCatalogStateEntry {
  return {
    ...existing,
    name: discovered.manifest.name,
    firstDiscoveredAt: existing?.firstDiscoveredAt ?? now,
    addedAt: existing?.addedAt ?? now,
    lastDiscoveredAt: now,
    lastSeenVersion: discovered.manifest.version,
    lastManifestPath: discovered.filePath,
    source: discovered.source.type,
    status: existing?.status ?? 'available',
    health: existing?.health ?? { status: 'unknown', issues: [] },
    enabledForApps: existing?.enabledForApps ?? {},
  };
}

function toCatalogEntry(discovered: DiscoveredPackageManifest, stored: PackageCatalogStateEntry): PackageCatalogEntry {
  return {
    name: discovered.manifest.name,
    displayName: discovered.manifest.displayName,
    version: discovered.manifest.version,
    description: discovered.manifest.description,
    icon: discovered.manifest.icon,
    manifest: discovered.manifest,
    status: deriveStatus(stored),
    available: true,
    firstDiscoveredAt: stored.firstDiscoveredAt,
    addedAt: stored.addedAt,
    lastDiscoveredAt: stored.lastDiscoveredAt ?? stored.firstDiscoveredAt,
    installedAt: stored.installedAt,
    installedVersion: stored.installedVersion,
    activeVersion: stored.activeVersion,
    updatePolicy: stored.updatePolicy,
    channel: stored.channel,
    health: stored.health ?? { status: 'unknown', issues: [] },
    enabledForApps: stored.enabledForApps ?? {},
    source: {
      type: discovered.source.type,
      manifestPath: discovered.filePath,
      packageRoot: discovered.source.packageRoot,
    },
    capabilities: discovered.manifest.capabilities,
    requiresServices: discovered.manifest.requiresServices ?? {},
    components: discovered.manifest.components ?? [],
    settings: discovered.manifest.settings,
    data: discovered.manifest.data,
    admin: discovered.manifest.admin,
  };
}

function deriveStatus(stored: PackageCatalogStateEntry): PackageCatalogStatus {
  if (stored.status === 'disabled' || stored.status === 'missing-dependency' || stored.status === 'incompatible' || stored.status === 'error') {
    return stored.status;
  }

  if (Object.values(stored.enabledForApps ?? {}).some((app) => app.status === 'enabled')) {
    return 'enabled';
  }

  return stored.status ?? 'available';
}

function normalizePackageCatalogState(value: Partial<PackageCatalogStateManifest>): PackageCatalogStateManifest {
  const packages = value.packages && typeof value.packages === 'object' && !Array.isArray(value.packages) ? value.packages : {};
  return {
    manifestVersion: PACKAGE_CATALOG_STATE_VERSION,
    updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
    packages: packages as Record<string, PackageCatalogStateEntry>,
  };
}

function resolveNow(now?: () => string): string {
  return now ? now() : new Date().toISOString();
}