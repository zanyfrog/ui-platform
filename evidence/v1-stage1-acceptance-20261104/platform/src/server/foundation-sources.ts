/**
 * Purpose: Manages trusted GitHub workspace sources for shared foundation dependencies such as UI-Base.
 * Use: Package APIs install a pinned source and add selected workspace packages to application package.json files.
 */

import { appendFile, cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import path from 'node:path';
import crypto from 'node:crypto';
import type { AppFoundationDependencyPayload, AppFoundationDependencyResult, FoundationMigrationResult, FoundationSource, FoundationSourcePayload, FoundationSourceRevision, FoundationSourceUpdatePlan, FoundationWorkspacePackage } from '../shared/types.js';
import { appendHistory } from './history.js';
import { atomicWriteJson, readJson } from './json-files.js';
import { platformRoot, runtimeDir } from './paths.js';
import { appPath, discoverApps } from './applications.js';
import { readRawAppManifest, recordFoundationImport, replaceFoundationImport } from './app-manifests.js';
import { spawnNpm } from './npm-process.js';

const SOURCE_STATE_VERSION = '1.0.0';
const SOURCE_STATE_FILE = path.join('data', 'foundation-sources.manifest.json');
const sourceRemotePattern = /^(?:git@github\.com:|https:\/\/github\.com\/)([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?$/;
const commitPattern = /^[0-9a-f]{40}$/i;

interface FoundationSourceState {
  manifestVersion: typeof SOURCE_STATE_VERSION;
  updatedAt: string;
  sources: Record<string, FoundationSource>;
  updates: Record<string, FoundationSourceUpdatePlan>;
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
  const existing = (await loadSourceState(platformRootDir)).sources[sourceId];
  if (existing) {
    if (existing.repository === repository) return existing;
    throw new Error('A foundation source with this identifier is already registered.');
  }
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
    if (state.sources[source.id]) throw new Error('A foundation source with this identifier was registered while this source was being installed.');
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

export async function refreshFoundationSource(sourceId: string, platformRootDir = platformRoot): Promise<FoundationSource> {
  const state = await loadSourceState(platformRootDir);
  const source = state.sources[sourceId];
  if (!source) throw new Error('Foundation source was not found.');
  const workspaceRoot = path.resolve(platformRootDir, source.workspacePath);
  if (!isWithin(path.join(platformRootDir, 'data', 'foundation-sources'), workspaceRoot)) throw new Error('Foundation source workspace path is invalid.');
  const packages = await inspectFoundationWorkspace(workspaceRoot);
  const refreshed = { ...source, packages };
  state.sources[sourceId] = refreshed;
  state.updatedAt = new Date().toISOString();
  await saveSourceState(platformRootDir, state);
  await appendPlatformHistory(platformRootDir, { action: 'foundation.source.refreshed', sourceId, commit: source.commit, packages: packages.map((pkg) => pkg.name) });
  return refreshed;
}

export async function previewFoundationSourceUpdate(sourceId: string, ref?: string, platformRootDir = platformRoot): Promise<FoundationSourceUpdatePlan> {
  if (ref?.startsWith('-')) throw new Error('Git references cannot start with a hyphen.');
  const state = await loadSourceState(platformRootDir);
  const source = state.sources[sourceId];
  if (!source) throw new Error('Foundation source was not found.');
  const stagingRoot = path.join(runtimeDir, 'foundation-source-update', crypto.randomUUID());
  const checkoutRoot = path.join(stagingRoot, 'checkout');
  await mkdir(stagingRoot, { recursive: true });
  try {
    await runGit(['clone', '--no-checkout', source.repository, checkoutRoot]);
    await runGit(['-C', checkoutRoot, 'checkout', '--detach', ref || 'HEAD']);
    const commit = (await runGit(['-C', checkoutRoot, 'rev-parse', 'HEAD'])).trim();
    if (!commitPattern.test(commit)) throw new Error('GitHub source did not resolve to an immutable commit SHA.');
    if (commit === source.commit) throw new Error('The selected ref already resolves to the current pinned commit.');
    const packages = await inspectFoundationWorkspace(checkoutRoot);
    const workspacePath = path.join('data', 'foundation-sources', sourceId, commit).replaceAll('\\', '/');
    const targetRoot = path.join(platformRootDir, workspacePath);
    if (!(await exists(targetRoot))) { await mkdir(path.dirname(targetRoot), { recursive: true }); await cp(checkoutRoot, targetRoot, { recursive: true }); }
    const candidate: FoundationSourceRevision = { commit, installedAt: new Date().toISOString(), workspacePath, packages };
    const current = new Map(source.packages.map((pkg) => [pkg.name, pkg]));
    const next = new Map(packages.map((pkg) => [pkg.name, pkg]));
    const apps = await discoverApps();
    const affectedApps = await Promise.all(apps.map(async (app) => {
      const imported = (await readRawAppManifest(appPath(app.key))).foundationImports[sourceId];
      if (!imported) return { appKey: app.key, directPackages: [], status: 'not-on-current-revision' as const, issues: ['Application does not use this source.'] };
      if (imported.commit !== source.commit) return { appKey: app.key, directPackages: imported.selectedPackages, status: 'not-on-current-revision' as const, issues: ['Application is pinned to a retained revision.'] };
      const missing = imported.selectedPackages.filter((name) => !next.has(name));
      return { appKey: app.key, directPackages: imported.selectedPackages, status: missing.length ? 'blocked' as const : 'ready' as const, issues: missing.map((name) => 'Removed or renamed package: ' + name) };
    }));
    const plan: FoundationSourceUpdatePlan = {
      id: crypto.randomUUID(), sourceId, repository: source.repository, fromCommit: source.commit, toCommit: commit, preparedAt: new Date().toISOString(), candidate,
      addedPackages: [...next.keys()].filter((name) => !current.has(name)).sort(),
      removedPackages: [...current.keys()].filter((name) => !next.has(name)).sort(),
      changedPackages: [...next.values()].filter((pkg) => current.get(pkg.name)?.version !== pkg.version).map((pkg) => pkg.name).sort(),
      affectedApps,
    };
    state.updates[plan.id] = plan; state.updatedAt = new Date().toISOString(); await saveSourceState(platformRootDir, state);
    await appendPlatformHistory(platformRootDir, { action: 'foundation.source.update.previewed', sourceId, fromCommit: plan.fromCommit, toCommit: plan.toCommit });
    return plan;
  } finally { await rm(stagingRoot, { recursive: true, force: true }); }
}

export async function migrateFoundationSourceUpdate(planId: string, appKeys: string[], platformRootDir = platformRoot): Promise<FoundationMigrationResult[]> {
  const state = await loadSourceState(platformRootDir); const plan = state.updates[planId];
  if (!plan) throw new Error('Foundation update plan was not found.');
  const source = state.sources[plan.sourceId];
  if (!source || source.commit !== plan.fromCommit) throw new Error('The source changed after this update was previewed. Create a new preview.');
  const selected = new Set(appKeys); const results: FoundationMigrationResult[] = [];
  for (const affected of plan.affectedApps.filter((app) => selected.has(app.appKey))) {
    if (affected.status !== 'ready') { results.push({ appKey: affected.appKey, status: 'blocked', issues: affected.issues }); continue; }
    results.push(await migrateApplication(source, plan, affected.appKey, platformRootDir));
  }
  if (results.some((result) => result.status === 'migrated')) {
    state.sources[plan.sourceId] = { ...source, commit: plan.toCommit, installedAt: plan.candidate.installedAt, workspacePath: plan.candidate.workspacePath, packages: plan.candidate.packages, revisions: { ...(source.revisions ?? {}), [source.commit]: { commit: source.commit, installedAt: source.installedAt, workspacePath: source.workspacePath, packages: source.packages } } };
  }
  delete state.updates[planId]; state.updatedAt = new Date().toISOString(); await saveSourceState(platformRootDir, state);
  await appendPlatformHistory(platformRootDir, { action: 'foundation.source.update.migrated', sourceId: plan.sourceId, fromCommit: plan.fromCommit, toCommit: plan.toCommit, results });
  return results;
}

export async function removeFoundationSource(sourceId: string, platformRootDir = platformRoot): Promise<void> {
  const state = await loadSourceState(platformRootDir);
  const source = state.sources[sourceId];
  if (!source) throw new Error('Foundation source was not found.');
  const workspaceRoot = path.resolve(platformRootDir, source.workspacePath);
  if (!isWithin(path.join(platformRootDir, 'data', 'foundation-sources'), workspaceRoot)) throw new Error('Foundation source workspace path is invalid.');
  await rm(workspaceRoot, { recursive: true, force: true });
  delete state.sources[sourceId];
  state.updatedAt = new Date().toISOString();
  await saveSourceState(platformRootDir, state);
  await appendPlatformHistory(platformRootDir, { action: 'foundation.source.removed', sourceId, repository: source.repository, commit: source.commit });
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
  const resolvedSource = sourceForAppImport(source, importRecord?.commit);
  const sourcePackageNames = new Set(resolvedSource.packages.map((pkg) => pkg.name));
  const requiredPackageNames = (await discoverFoundationImportRequirements(appDir)).filter((name) => sourcePackageNames.has(name));
  const dependencies = appPackage.dependencies ?? {};
  const fromSourcePackageNames: string[] = [];
  const existingPackageNames: string[] = [];
  for (const pkg of resolvedSource.packages) {
    const value = dependencies[pkg.name];
    if (!value) continue;
    const expectedPath = path.resolve(platformRootDir, resolvedSource.workspacePath, pkg.packagePath);
    const resolvedPath = value.startsWith('file:') ? path.resolve(appDir, value.slice('file:'.length)) : undefined;
    if (resolvedPath === expectedPath) fromSourcePackageNames.push(pkg.name);
    else existingPackageNames.push(pkg.name);
  }
  return {
    sourceId: source.id,
    fromSourcePackageNames,
    existingPackageNames,
    directPackageNames: (importRecord?.selectedPackages ?? []).filter((name) => fromSourcePackageNames.includes(name)),
    requiredPackageNames,
    hasImportRecord: Boolean(importRecord),
  };
}

export async function discoverFoundationImportRequirements(appDir: string): Promise<string[]> {
  const sourceRoot = path.join(appDir, 'src');
  const names = new Set<string>();
  const visit = async (directory: string): Promise<void> => {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    await Promise.all(entries.map(async (entry) => {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) return visit(filePath);
      if (!entry.isFile() || !/\.(?:[cm]?[jt]sx?)$/i.test(entry.name)) return;
      const source = await readFile(filePath, 'utf8').catch(() => '');
      for (const match of source.matchAll(/(?:\bfrom\s*|\bimport\s*)['"](@ui-base\/[A-Za-z0-9._-]+)/g)) names.add(match[1]);
    }));
  };
  await visit(sourceRoot);
  return [...names].sort();
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

async function migrateApplication(source: FoundationSource, plan: FoundationSourceUpdatePlan, appKey: string, platformRootDir: string): Promise<FoundationMigrationResult> {
  const appDir = appPath(appKey);
  const packagePath = path.join(appDir, 'package.json');
  const manifestPath = path.join(appDir, 'app.manifest.json');
  const lockPath = path.join(appDir, 'package-lock.json');
  const original = await Promise.all([readFile(packagePath), readFile(manifestPath), readFile(lockPath).catch(() => undefined)]);
  try {
    const manifest = await readRawAppManifest(appDir); const imported = manifest.foundationImports[source.id];
    if (!imported || imported.commit !== plan.fromCommit) return { appKey, status: 'blocked', issues: ['Application is not pinned to the previewed source revision.'] };
    const selected = resolveSelectedPackages({ ...source, ...plan.candidate }, imported.selectedPackages);
    const appPackage = JSON.parse(original[0].toString('utf8')) as { dependencies?: Record<string, string> };
    const dependencies = { ...(appPackage.dependencies ?? {}) };
    for (const pkg of selected) {
      const packageRoot = path.join(platformRootDir, plan.candidate.workspacePath, pkg.packagePath);
      const relative = path.relative(appDir, packageRoot).replaceAll('\\', '/');
      dependencies[pkg.name] = 'file:' + (relative.startsWith('.') ? relative : './' + relative);
    }
    appPackage.dependencies = dependencies;
    await atomicWriteJson(packagePath, appPackage);
    await replaceFoundationImport(appDir, { sourceId: source.id, repository: source.repository, commit: plan.toCommit, selectedPackages: imported.selectedPackages, resolvedPackages: selected.map((pkg) => pkg.name) });
    await runNpm(appDir, ['install', '--ignore-scripts']);
    await runNpm(appDir, ['run', 'typecheck']);
    await runNpm(appDir, ['run', 'build']);
    await appendHistory(appDir, { action: 'foundation.source.migrated', appId: appKey, sourceId: source.id, fromCommit: plan.fromCommit, toCommit: plan.toCommit, selectedPackages: imported.selectedPackages, resolvedPackages: selected.map((pkg) => pkg.name), validation: ['npm install --ignore-scripts', 'npm run typecheck', 'npm run build'] });
    return { appKey, status: 'migrated', issues: [] };
  } catch (error) {
    await writeFile(packagePath, original[0]); await writeFile(manifestPath, original[1]);
    if (original[2]) await writeFile(lockPath, original[2]); else await rm(lockPath, { force: true });
    return { appKey, status: 'failed', issues: [error instanceof Error ? error.message : String(error)] };
  }
}

function sourceForAppImport(source: FoundationSource, commit?: string): FoundationSourceRevision {
  if (commit && commit !== source.commit && source.revisions?.[commit]) return source.revisions[commit];
  return { commit: source.commit, installedAt: source.installedAt, workspacePath: source.workspacePath, packages: source.packages };
}

function runNpm(cwd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawnNpm(args, { cwd, stdio: 'ignore' });
    child.once('error', reject); child.once('exit', (code) => code === 0 ? resolve() : reject(new Error('npm ' + args.join(' ') + ' failed with exit code ' + code)));
  });
}

function sourceIdForRepository(repository: string): string {
  const match = repository.match(sourceRemotePattern);
  if (!match) throw new Error('Only github.com SSH or HTTPS repository URLs are supported.');
  return (match[1] + '-' + match[2]).toLowerCase();
}

function isWithin(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative);
}

async function loadSourceState(rootDir: string): Promise<FoundationSourceState> {
  const filePath = path.join(rootDir, SOURCE_STATE_FILE);
  try {
    const value = await readJson<Partial<FoundationSourceState>>(filePath);
    return {
      manifestVersion: SOURCE_STATE_VERSION,
      updatedAt: typeof value.updatedAt === 'string' ? value.updatedAt : new Date().toISOString(),
      sources: value.sources && typeof value.sources === 'object' ? value.sources : {},
      updates: value.updates && typeof value.updates === 'object' ? value.updates : {},
    };
  } catch {
    return { manifestVersion: SOURCE_STATE_VERSION, updatedAt: new Date().toISOString(), sources: {}, updates: {} };
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
