/**
 * Purpose: Installs a locally supplied UIB package folder or ZIP archive.
 * Use: The package API calls installManualPackage before refreshing discovery or offering app enablement.
 */

import { appendFile } from 'node:fs/promises';
import { cp, mkdir, readdir, readFile, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import { getManifestFileName, getUnscopedPackageName, isOfficialUibPackageName, refreshPackageCatalog, validatePackageManifest, type UibPackageManifest } from '@uib/platform-core';
import { appPath } from './applications.js';
import { appendHistory } from './history.js';
import { runtimeDir, platformRoot } from './paths.js';

export type PackageInstallScope = 'platform' | 'app';

export interface InstallManualPackageOptions {
  sourcePath: string;
  scope: PackageInstallScope;
  appKey?: string;
  platformRootDir?: string;
  appDir?: string;
  stagingRootDir?: string;
}

export interface InstalledPackageResult {
  name: string;
  version: string;
  scope: PackageInstallScope;
  packageRoot: string;
  manifestPath: string;
  sourceType: 'folder' | 'zip';
}

export async function installManualPackage(options: InstallManualPackageOptions): Promise<InstalledPackageResult> {
  if (!options.sourcePath.trim()) throw new Error('A package source path is required.');
  const sourcePath = path.resolve(options.sourcePath);
  const platformRootDir = options.platformRootDir ?? platformRoot;
  const appDir = options.appDir ?? (options.appKey ? appPath(options.appKey) : undefined);
  if (options.scope === 'app' && !appDir) throw new Error('appKey is required for an app-scoped package installation.');
  if (!(await isDirectoryOrFile(sourcePath))) throw new Error('The package source path does not exist.');
  if (options.scope === 'app' && !(await isDirectory(appDir!))) throw new Error('The target application folder does not exist.');

  const stagingRoot = path.join(options.stagingRootDir ?? path.join(runtimeDir, 'package-install'), crypto.randomUUID());
  await mkdir(stagingRoot, { recursive: true });
  try {
    const sourceInfo = await stat(sourcePath);
    if (!sourceInfo.isDirectory() && !isSupportedArchive(sourcePath)) throw new Error('Manual package sources must be a folder, .zip, .tgz, or .tar.gz archive.');
    const sourceType = sourceInfo.isDirectory() ? 'folder' : 'zip';
    const packageSource = sourceType === 'folder' ? sourcePath : await extractZip(sourcePath, stagingRoot);
    const manifest = await readAndValidatePackage(packageSource);
    const packageFolder = getUnscopedPackageName(manifest.name);
    const packageRoot = path.join(options.scope === 'platform' ? platformRootDir : appDir!, 'packages', packageFolder);
    if (await exists(packageRoot)) throw new Error('Package ' + manifest.name + ' is already installed at this scope.');

    const stagedPackage = path.join(stagingRoot, 'package');
    await copyPackage(packageSource, stagedPackage);
    await mkdir(path.dirname(packageRoot), { recursive: true });
    await rename(stagedPackage, packageRoot);
    const manifestPath = path.join(packageRoot, getManifestFileName(manifest.name));

    if (options.scope === 'platform') {
      await refreshPackageCatalog({ rootDir: platformRootDir });
      await appendPlatformHistory(platformRootDir, {
        action: 'package.installed',
        packageName: manifest.name,
        version: manifest.version,
        sourceType,
        sourcePath,
        scope: 'platform',
      });
    } else {
      await appendHistory(appDir!, {
        action: 'package.installed',
        appId: options.appKey,
        packageName: manifest.name,
        version: manifest.version,
        sourceType,
        sourcePath,
        scope: 'app',
      });
    }

    return { name: manifest.name, version: manifest.version, scope: options.scope, packageRoot, manifestPath, sourceType };
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

function isSupportedArchive(filePath: string): boolean {
  return /\.(zip|tgz|tar\.gz)$/i.test(filePath);
}

async function readAndValidatePackage(packageRoot: string): Promise<UibPackageManifest> {
  const packageJsonPath = path.join(packageRoot, 'package.json');
  const packageJson = JSON.parse(await readFile(packageJsonPath, 'utf8')) as { name?: string; version?: string };
  if (!packageJson.name || !isOfficialUibPackageName(packageJson.name)) throw new Error('package.json.name must use the official @uib/* npm scope.');
  const manifestPath = path.join(packageRoot, getManifestFileName(packageJson.name));
  const value = JSON.parse(await readFile(manifestPath, 'utf8')) as UibPackageManifest;
  const validation = validatePackageManifest(value, { fileName: path.basename(manifestPath) });
  if (!validation.valid) throw new Error('Package manifest validation failed: ' + validation.issues.join(' '));
  if (value.name !== packageJson.name) throw new Error('package.json.name and the UIB manifest name must match.');
  if (value.version !== packageJson.version) throw new Error('package.json.version and the UIB manifest version must match.');
  return value;
}

async function extractZip(zipFile: string, stagingRoot: string): Promise<string> {
  const archiveEntries = await runCommand('tar', ['-tf', zipFile]);
  for (const entry of archiveEntries.split(/\r?\n/).filter(Boolean)) {
    const normalized = entry.replaceAll('\\', '/');
    if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized) || normalized.split('/').includes('..')) {
      throw new Error('ZIP archive contains a path outside the staging directory.');
    }
  }
  await runCommand('tar', ['-xf', zipFile, '-C', stagingRoot]);
  return locatePackageRoot(stagingRoot);
}

async function locatePackageRoot(root: string): Promise<string> {
  const candidates: string[] = [];
  if (await hasPackageFiles(root)) candidates.push(root);
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (entry.isDirectory() && await hasPackageFiles(path.join(root, entry.name))) candidates.push(path.join(root, entry.name));
  }
  if (candidates.length !== 1) throw new Error('ZIP archive must contain exactly one UIB package root.');
  return candidates[0];
}

async function hasPackageFiles(root: string): Promise<boolean> {
  if (!(await isFile(path.join(root, 'package.json')))) return false;
  const files = await readdir(root, { withFileTypes: true });
  return files.some((entry) => entry.isFile() && entry.name.endsWith('.manifest.json'));
}

async function copyPackage(source: string, destination: string): Promise<void> {
  await cp(source, destination, {
    recursive: true,
    filter: (sourcePath) => !sourcePath.split(path.sep).some((part) => ['node_modules', '.git', '.ui'].includes(part)),
  });
}

function runCommand(command: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve(stdout) : reject(new Error(stderr.trim() || command + ' failed with exit code ' + code)));
  });
}

async function appendPlatformHistory(rootDir: string, event: Record<string, unknown>): Promise<void> {
  const historyPath = path.join(rootDir, 'data', 'package-history.jsonl');
  await mkdir(path.dirname(historyPath), { recursive: true });
  await appendFile(historyPath, JSON.stringify({ time: new Date().toISOString(), ...event }) + '\n', 'utf8');
}

async function isDirectoryOrFile(file: string): Promise<boolean> {
  return stat(file).then((info) => info.isDirectory() || info.isFile()).catch(() => false);
}

async function exists(file: string): Promise<boolean> {
  return stat(file).then(() => true).catch(() => false);
}

async function isDirectory(file: string): Promise<boolean> {
  return stat(file).then((info) => info.isDirectory()).catch(() => false);
}

async function isFile(file: string): Promise<boolean> {
  return stat(file).then((info) => info.isFile()).catch(() => false);
}
