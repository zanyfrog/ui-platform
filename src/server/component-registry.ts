import { readdir, readFile } from 'node:fs/promises';
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

function activatedPackageEntries(pkg: AppPackageListEntry): ComponentCatalogEntry[] {
  return pkg.components.map((entry) => toComponentCatalogEntry(entry, pkg.name, pkg.version, entry.importPath ?? pkg.manifestPath));
}

function toComponentCatalogEntry(
  entry: ComponentManifestEntry,
  packageName: string,
  packageVersion: string,
  source = entry.importPath ?? `package:${packageName}`,
): ComponentCatalogEntry {
  return {
    id: entry.id ?? `${packageName}:${entry.tagName}`,
    tagName: entry.tagName,
    name: entry.name ?? displayName(entry.tagName),
    category: entry.category ?? 'Components',
    description: entry.description,
    importPath: entry.importPath,
    attributes: entry.attributes,
    properties: entry.properties,
    events: entry.events,
    slots: entry.slots,
    packageName,
    packageVersion,
    source,
    metadataStatus: (entry as ComponentManifestEntry & { metadataStatus?: ComponentCatalogEntry['metadataStatus'] }).metadataStatus ?? 'manifest',
  };
}

async function packageDirs(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  return entries.filter((entry) => entry.isDirectory() && !entry.name.startsWith('.')).map((entry) => path.join(root, entry.name));
}

export async function discoverComponents(appKey?: string): Promise<ComponentCatalogEntry[]> {
  if (appKey) {
    const activePackages = await getActiveAppPackages(appKey);
    return activePackages.flatMap(activatedPackageEntries).sort(sortComponents);
  }

  const dirs = await packageDirs(uiBasePackagesDir);
  const entries = (await Promise.all(dirs.map(packageEntries))).flat();
  return entries.sort(sortComponents);
}

function sortComponents(a: ComponentCatalogEntry, b: ComponentCatalogEntry): number {
  return a.packageName.localeCompare(b.packageName) || a.name!.localeCompare(b.name!);
}
