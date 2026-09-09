/**
 * Purpose: Manages trusted GitHub workspace sources for shared foundation dependencies such as UI-Base.
 * Use: Package APIs install a pinned source and add selected workspace packages to application package.json files.
 */

import { appendFile, cp, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AppFoundationDependencyPayload, AppFoundationDependencyResult, FoundationSource, FoundationSourcePayload, FoundationWorkspacePackage } from '../shared/types.js';
import { appendHistory } from './history.js';
import { atomicWriteJson, readJson } from './json-files.js';
import { platformRoot, runtimeDir } from './paths.js';
import { appPath } from './applications.js';
import { readRawAppManifest, recordFoundationImport } from './app-manifests.js';

const SOURCE_STATE_VERSION = '1.0.0';
const SOURCE_STATE_FILE = path.join('data', 'foundation-sources.manifest.json');
const sourceRemotePattern = /^(?:git@github\.com:|https:\/\/github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/;
const commitPattern = /^[0-9a-f]{40}$/i;

interface FoundationSourceState {
  manifestVersion: typeof SOURCE_STATE_VERSION;
  updatedAt: string;
  sources: Record<string, FoundationSource>;
}

export interface InstallGitHubFoundationSourceOptions {
  repository: string;
  ref?: string;
  platformRootDir?: string;
  stagingRootDir?: string;
}

export interface AddAppFoundationDependenciesOptions {
  sourceId: string;
  packageNames: string[];
  appKey?: string;
  appDir?: string;
  platformRootDir?: string;
}

export async function listFoundationSources(platformRootDir = platformRoot): Promise<FoundationSourcePayload> {
  const state = await loadSourceState(platformRootDir);
  return { sources: Object.values(state.sources).sort((a, b) => a.id.localeCompare(b.id)) };
}

export async function installGitHubFoundationSource(options: InstallGitHubFoundationSourceOptions): Promise<FoundationSource> {
  const repository = options.repository.trim();
  const ref = options.ref?.trim();
  if (ref?.startsWith('-')) throw new Error('Git references cannot start with a hyphen.');
  const sourceId = sourceIdForRepository(repository);
  const platformRootDir = options.platformRootDir ?? platformRoot;
  const stagingRoot = path.join(options.stagingRootDir ?? path.join(runtimeDir, 'foundation-source-install'), crypto.randomUUID());
  const checkoutRoot = path.join(stagingRoot, 'checkout');
  await mkdir(stagingRoot, { recursive: true });
  try {
    await runGit(['clone', '--no-checkout', repository, checkoutRoot]);
    await runGit(['-C', checkoutRoot, 'checkout', '--detach', ref || 'HEAD']);
    const commit = (await runGit(['-C', checkoutRoot, 'rev-parse', 'HEAD'])).trim();
    if (!commitPattern.test(commit)) throw new Error('GitHub source did not resolve to an immutable commit SHA.');
    const packages = await inspectFoundationWorkspace(checkoutRoot);
    const workspacePath = path.join('data', 'foundation-sources', sourceId, commit).replaceAll('\\', '/');
    const targetRoot = path.join(platformRootDir, workspacePath);
    if (!(await exists(targetRoot))) {
      await mkdir(path.dirname(targetRoot), { recursive: true });
      // Staging and platform data may be on different Windows filesystem boundaries.
      await cp(checkoutRoot, targetRoot, { recursive: true });
    }
    const source: FoundationSource = {
      id: sourceId,
      kind: 'github',
      repository,
      commit,
      installedAt: new Date().toISOString(),
      workspacePath,
      packages,
    };
    const state = await loadSourceState(platformRootDir);
    state.sources[source.id] = source;
    state.updatedAt = new Date().toISOString();
    await saveSourceState(platformRootDir, state);
    await appendPlatformHistory(platformRootDir, {
      action: 'foundation.source.installed',
      sourceId: source.id,
      repository: source.repository,
      commit: source.commit,
      packages: source.packages.map((pkg) => pkg.name),
    });
    return source;
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

export async function inspectFoundationWorkspace(workspaceRoot: string): Promise<FoundationWorkspacePackage[]> {
  const workspacePackage = JSON.parse(await readFile(path.join(workspaceRoot, 'package.json'), 'utf8')) as { workspaces?: string[] | { packages?: string[] } };
  const patterns = Array.isArray(workspacePackage.workspaces) ? workspacePackage.workspaces : workspacePackage.workspaces?.packages ?? [];
  if (!patterns.includes('packages/*')) throw new Error('Foundation source must declare the packages/* npm workspace pattern.');
  const packagesDir = path.join(workspaceRoot, 'packages');
  const entries = await readdir(packagesDir, { withFileTypes: true }).catch(() => []);
  const packages: FoundationWorkspacePackage[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packagePath = path.join('packages', entry.name).replaceAll('\\', '/');
    const packageJson = await readPackageJson(path.join(workspaceRoot, packagePath, 'package.json'));
    if (!packageJson?.name?.startsWith('@ui-base/')) continue;
    packages.push({
      name: packageJson.name,
      version: packageJson.version ?? '0.0.0',
      packagePath,
      dependencies: Object.keys(packageJson.dependencies ?? {}).filter((name) => name.startsWith('@ui-base/')),
    });
  }
  if (!packages.length) throw new Error('Foundation source does not contain any @ui-base/* workspace packages.');
  return packages.sort((a, b) => a.name.localeCompare(b.name));
}

export async function addAppFoundationDependencies(options: AddAppFoundationDependenciesOptions): Promise<AppFoundationDependencyResult> {
  const platformRootDir = options.platformRootDir ?? platformRoot;
  const appDir = options.appDir ?? (options.appKey ? appPath(options.appKey) : undefined);
  if (!appDir) throw new Error('appKey is required when appDir is not provided.');
  const state = await loadSourceState(platformRootDir);
  const source = state.sources[options.sourceId];
  if (!source) throw new Error('Foundation source was not found.');
  const requestedPackages = [...new Set(options.packageNames)].sort();
  const selected = resolveSelectedPackages(source, options.packageNames);
  const packages = selected.map((pkg) => pkg.name);
  const transitivePackages = packages.filter((name) => !requestedPackages.includes(name));
  const appPackagePath = path.join(appDir, 'package.json');
  const appPackage = JSON.parse(await readFile(appPackagePath, 'utf8')) as { dependencies?: Record<string, string> };
  const dependencies = { ...(appPackage.dependencies ?? {}) };
  for (const pkg of selected) {
    const packageRoot = path.join(platformRootDir, source.workspacePath, pkg.packagePath);
    const relative = path.relative(appDir, packageRoot).replaceAll('\\', '/');
    dependencies[pkg.name] = 'file:' + (relative.startsWith('.') ? relative : './' + relative);
  }
  appPackage.dependencies = dependencies;
  await atomicWriteJson(appPackagePath, appPackage);
  await recordFoundationImport(appDir, {
    sourceId: source.id,
    repository: source.repository,
    commit: source.commit,
    selectedPackages: requestedPackages,
    resolvedPackages: packages,
  });
  if (options.appKey) {
    await appendHistory(appDir, {
      action: 'foundation.dependencies.added',
      appId: options.appKey,
      sourceId: source.id,
      commit: source.commit,
      packages,
      requestedPackages,
      transitivePackages,
    });
  }
  return { sourceId: source.id, packages, requestedPackages, transitivePackages, installRequired: true };
}

export async function getAppFoundationDependencies(options: Omit<AddAppFoundationDependenciesOptions, 'packageNames'>): Promise<AppFoundationDependencyPayload> {
  const platformRootDir = options.platformRootDir ?? platformRoot;
  const appDir = options.appDir ?? (options.appKey ? appPath(options.appKey) : undefined);
  if (!appDir) throw new Error('appKey is required when appDir is not provided.');
  const state = await loadSourceState(platformRootDir);
  const source = state.sources[options.sourceId];
  if (!source) throw new Error('Foundation source was not found.');
  const appPackage = JSON.parse(await readFile(path.join(appDir, 'package.json'), 'utf8')) as { dependencies?: Record<string, string> };
  const importRecord = (await readRawAppManifest(appDir)).foundationImports[source.id];
  const dependencies = appPackage.dependencies ?? {};
  const fromSourcePackageNames: string[] = [];
  const existingPackageNames: string[] = [];
  for (const pkg of source.packages) {
    const value = dependencies[pkg.name];
    if (!value) continue;
    const expectedPath = path.resolve(platformRootDir, source.workspacePath, pkg.packagePath);
    const resolvedPath = value.startsWith('file:') ? path.resolve(appDir, value.slice('file:'.length)) : undefined;
    if (resolvedPath === expectedPath) fromSourcePackageNames.push(pkg.name);
    else existingPackageNames.push(pkg.name);
  }
  return {
    sourceId: source.id,
    fromSourcePackageNames,
    existingPackageNames,
    directPackageNames: (importRecord?.selectedPackages ?? []).filter((name) => fromSourcePackageNames.includes(name)),
    hasImportRecord: Boolean(importRecord),
  };
}

function resolveSelectedPackages(source: FoundationSource, requestedNames: string[]): FoundationWorkspacePackage[] {
  const packageMap = new Map(source.packages.map((pkg) => [pkg.name, pkg]));
  const selected = new Map<string, FoundationWorkspacePackage>();
  const include = (name: string) => {
    const pkg = packageMap.get(name);
    if (!pkg) throw new Error('Package ' + name + ' is not available from foundation source ' + source.id + '.');
    if (selected.has(name)) return;
    selected.set(name, pkg);
    pkg.dependencies.forEach(include);
  };
  requestedNames.forEach(include);
  if (!selected.size) throw new Error('Select at least one foundation package.');
  return [...selected.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function sourceIdForRepository(repository: string): string {
  const match = repository.match(sourceRemotePattern);
  if (!match) throw new Error('Only github.com SSH or HTTPS repository URLs are supported.');
  return (match[1] + '-' + match[2]).toLowerCase();
}

async function loadSourceState(rootDir: string): Promise<FoundationSourceState> {
  const filePath = path.join(rootDir, SOURCE_STATE_FILE);
  try {
    const value = await readJson<Partial<FoundationSourceState>>(filePath);
    return {
      manifestVersion: SOURCE_STATE_VERSION,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
      sources: value.sources && typeof value.sources === 'object' ? value.sources : {},
    };
  } catch {
    return { manifestVersion: SOURCE_STATE_VERSION, updatedAt: new Date().toISOString(), sources: {} };
  }
}

async function saveSourceState(rootDir: string, state: FoundationSourceState): Promise<void> {
  await atomicWriteJson(path.join(rootDir, SOURCE_STATE_FILE), state);
}

async function appendPlatformHistory(rootDir: string, event: Record<string, unknown>): Promise<void> {
  const historyPath = path.join(rootDir, 'data', 'package-history.jsonl');
  await mkdir(path.dirname(historyPath), { recursive: true });
  await appendFile(historyPath, JSON.stringify({ time: new Date().toISOString(), ...event }) + '\n', 'utf8');
}

async function readPackageJson(filePath: string): Promise<{ name?: string; version?: string; dependencies?: Record<string, string> } | null> {
  try {
    return JSON.parse(await readFile(filePath, 'utf8')) as { name?: string; version?: string; dependencies?: Record<string, string> };
  } catch {
    return null;
  }
}

function runGit(args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || 'git failed with exit code ' + code)));
  });
}

async function exists(file: string): Promise<boolean> {
  return stat(file).then(() => true).catch(() => false);
}
