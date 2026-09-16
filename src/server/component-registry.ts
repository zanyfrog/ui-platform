import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { AppPackageListEntry, ComponentCatalogEntry, ComponentManifestEntry } from '../shared/types.js';
import { uiBasePackagesDir } from './paths.js';
import { getActiveAppPackages } from './packages.js';

const ignoredExportNames = new Set(['.', './styles.css', './tokens.css', './default.css', './dark.css', './sample-tour.css', './metadata', './analyzer', './writer', './page-importer', './page-import-artifact', './uib-layout-manager', './uib-layout-editor', './platform-info']);

function displayName(tagName: string): string {
  return tagName.replace(/^uib-/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function json<T>(file: string): Promise<T | null> {
  try { return JSON.parse(await readFile(file, 'utf8')) as T; } catch { return null; }
}

async function metadataTags(packageDir: string): Promise<string[]> {
  const candidates = [path.join(packageDir, 'src', 'metadata.js'), path.join(packageDir, 'src', 'metadata', 'index.js'), path.join(packageDir, 'src', 'components.ts'), path.join(packageDir, 'src', 'components.js')];
  const tags = new Set<string>();
  for (const file of candidates) {
    const source = await readFile(file, 'utf8').catch(() => '');
    for (const match of source.matchAll(/tagName\s*:\s*['"`]([^'"`]+)['"`]/g)) tags.add(match[1]);
    for (const match of source.matchAll(/customElements\.define\(\s*['"`]([^'"`]+)['"`]/g)) tags.add(match[1]);
  }
  return [...tags].sort();
}

function manifestEntries(value: unknown): ComponentManifestEntry[] {
  if (!value || typeof value !== 'object') return [];
  const components = (value as { components?: unknown }).components;
  if (!Array.isArray(components)) return [];
  return components.filter((item): item is ComponentManifestEntry => Boolean(item && typeof item === 'object' && typeof (item as ComponentManifestEntry).tagName === 'string'));
}

async function packageEntries(packageDir: string): Promise<ComponentCatalogEntry[]> {
  const packageJson = await json<{ name?: string; version?: string; exports?: Record<string, unknown> }>(path.join(packageDir, 'package.json'));
  if (!packageJson?.name) return [];
  const manifest = await json<unknown>(path.join(packageDir, 'ui.component.json'));
  const explicit = manifestEntries(manifest);
  const entries: Array<ComponentManifestEntry & { metadataStatus: ComponentCatalogEntry['metadataStatus'] }> = explicit.length
    ? explicit.map((entry) => ({ ...entry, metadataStatus: 'manifest' as const }))
    : (await metadataTags(packageDir)).map((tagName) => ({ tagName, metadataStatus: 'package-metadata' as const }))
    ;
  if (!entries.length) {
    entries.push(...Object.keys(packageJson.exports ?? {})
      .filter((name) => !ignoredExportNames.has(name) && !name.endsWith('.css'))
      .map((name) => ({ tagName: name.slice(2).replaceAll('/', '-'), importPath: name, metadataStatus: 'exports' as const })));
  }
  return entries.map((entry) => toComponentCatalogEntry(entry, packageJson.name!, packageJson.version ?? '0.0.0'));
}

function activatedPackageEntries(pkg: AppPackageListEntry, appKey: string): ComponentCatalogEntry[] {
  return pkg.components.map((entry) => toComponentCatalogEntry(entry, pkg.name, pkg.version, entry.importPath ?? pkg.manifestPath, appKey));
}

function toComponentCatalogEntry(
  entry: ComponentManifestEntry,
  packageName: string,
  packageVersion: string,
  source = entry.importPath ?? `package:${packageName}`,
  appKey?: string,
): ComponentCatalogEntry {
  const id = entry.id ?? `${packageName}:${entry.tagName}`;
  return {
    id,
    tagName: entry.tagName,
    name: entry.name ?? displayName(entry.tagName),
    category: entry.category ?? 'Components',
    description: entry.description,
    module: entry.module,
    importPath: entry.importPath,
    attributes: entry.attributes,
    properties: entry.properties,
    events: entry.events,
    slots: entry.slots,
    presentation: entry.presentation,
    packageName,
    packageVersion,
    source,
    metadataStatus: (entry as ComponentManifestEntry & { metadataStatus?: ComponentCatalogEntry['metadataStatus'] }).metadataStatus ?? 'manifest',
    moduleUrl: appKey && entry.module
      ? `/api/apps/${encodeURIComponent(appKey)}/package-assets/${encodeURIComponent(packageName)}/${encodeURI(entry.module.slice(2))}`
      : undefined,
  };
}

async function packageDirs(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => path.join(root, entry.name));
}

export async function discoverComponents(appKey?: string): Promise<ComponentCatalogEntry[]> {
  if (appKey) {
    const activePackages = await getActiveAppPackages(appKey);
    const entries = activePackages.flatMap((pkg) => activatedPackageEntries(pkg, appKey));
    const tags = new Map<string, ComponentCatalogEntry[]>();
    for (const entry of entries) tags.set(entry.tagName, [...(tags.get(entry.tagName) ?? []), entry]);
    return entries.map((entry) => {
      const matches = tags.get(entry.tagName) ?? [];
      const activationIssues = [...(entry.activationIssues ?? [])];
      if (!entry.module) activationIssues.push('This component does not declare a runtime module in its package manifest.');
      if (matches.length > 1) activationIssues.push(`The tag name is also declared by ${matches.filter((match) => match.id !== entry.id).map((match) => match.packageName).join(', ')}.`);
      return { ...entry, activationIssues: activationIssues.length ? activationIssues : undefined };
    }).sort(sortComponents);
  }

  const dirs = await packageDirs(uiBasePackagesDir);
  const entries = (await Promise.all(dirs.map(packageEntries))).flat();
  return entries.sort(sortComponents);
}

export async function getAppPackageAsset(appKey: string, packageName: string, modulePath: string): Promise<{ filePath: string; packageName: string }> {
  const activePackage = (await getActiveAppPackages(appKey)).find((entry) => entry.name === packageName);
  if (!activePackage) throw new Error(`Active package "${packageName}" was not found.`);
  const filePath = resolvePackageModulePath(activePackage.packageRoot, modulePath);
  const info = await stat(filePath);
  if (!info.isFile()) throw new Error(`Package asset is not a file: ${modulePath}`);
  return { filePath, packageName: activePackage.name };
}

export function resolvePackageModulePath(packageRoot: string, modulePath: string): string {
  if (!modulePath.startsWith('./') || modulePath.includes('\\')) throw new Error('Package asset paths must begin with ./ and use forward slashes.');
  const filePath = path.resolve(packageRoot, modulePath);
  const relative = path.relative(packageRoot, filePath);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('Component module must remain inside its package root.');
  return filePath;
}

function sortComponents(a: ComponentCatalogEntry, b: ComponentCatalogEntry): number {
  return a.packageName.localeCompare(b.packageName) || a.name!.localeCompare(b.name!);
}
