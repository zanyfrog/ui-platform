/**
 * Purpose: Classifies a supplied package source and dispatches it to its appropriate installer.
 * Use: The unified package acquisition endpoints call acquirePackageFromUrl for GitHub and npm inputs.
 */

import { mkdir, readdir, rm } from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawn } from 'node:child_process';
import { installGitHubFoundationSource, type InstallGitHubFoundationSourceOptions } from './foundation-sources.js';
import { installManualPackage, type InstallManualPackageOptions, type InstalledPackageResult } from './package-installer.js';
import { runtimeDir } from './paths.js';

export type PackageSourceKind = 'github' | 'npm' | 'unknown';

export type PackageAcquisitionResult =
  | { kind: 'foundation-source'; source: Awaited<ReturnType<typeof installGitHubFoundationSource>> }
  | { kind: 'package'; package: InstalledPackageResult };

const githubPattern = /^(?:git@github\.com:|https:\/\/github\.com\/)[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\.git)?(?:[/?#].*)?$/;
const npmWebPattern = /^https:\/\/(?:www\.)?npmjs\.com\/package\//;
const npmRegistryPattern = /^https:\/\/registry\.npmjs\.org\//;

export function classifyPackageSource(source: string): PackageSourceKind {
  const value = source.trim();
  if (githubPattern.test(value)) return 'github';
  if (value.startsWith('npm:') || npmWebPattern.test(value) || npmRegistryPattern.test(value) || /^@?[a-z0-9][a-z0-9._-]*(?:\/[a-z0-9][a-z0-9._-]*)?(?:@[a-z0-9][a-z0-9._-]*)?$/i.test(value)) return 'npm';
  return 'unknown';
}

export async function acquirePackageFromUrl(
  sourceUrl: string,
  options: Omit<InstallManualPackageOptions, 'sourcePath'> & { foundation?: Omit<InstallGitHubFoundationSourceOptions, 'repository'> },
): Promise<PackageAcquisitionResult> {
  const kind = classifyPackageSource(sourceUrl);
  if (kind === 'github') {
    if (options.scope !== 'platform') throw new Error('GitHub foundation sources are installed at platform scope. Add the source globally, then select its packages for an app.');
    const source = await installGitHubFoundationSource({ repository: sourceUrl, ...(options.foundation ?? {}) });
    return { kind: 'foundation-source', source };
  }
  if (kind === 'npm') return { kind: 'package', package: await installNpmPackage(sourceUrl, options) };
  throw new Error('Could not identify this source. Use a GitHub repository URL, an npm package URL/specifier, or upload a package archive.');
}

async function installNpmPackage(sourceUrl: string, options: Omit<InstallManualPackageOptions, 'sourcePath'>): Promise<InstalledPackageResult> {
  const stagingRoot = path.join(options.stagingRootDir ?? path.join(runtimeDir, 'npm-package-acquisition'), crypto.randomUUID());
  try {
    await mkdir(stagingRoot, { recursive: true });
    await runNpmPack(npmSpecFromSource(sourceUrl), stagingRoot);
    const archives = (await readdir(stagingRoot)).filter((name) => /\.(tgz|tar\.gz)$/i.test(name));
    if (archives.length !== 1) throw new Error('npm did not produce exactly one package archive.');
    return installManualPackage({ ...options, sourcePath: path.join(stagingRoot, archives[0]), stagingRootDir: path.join(stagingRoot, 'install') });
  } finally {
    await rm(stagingRoot, { recursive: true, force: true });
  }
}

function npmSpecFromSource(source: string): string {
  const value = source.trim();
  if (value.startsWith('npm:')) return value.slice('npm:'.length);
  if (!npmWebPattern.test(value)) return value;
  const url = new URL(value);
  const parts = url.pathname.replace(/^\/package\//, '').split('/').filter(Boolean).map(decodeURIComponent);
  const packageName = parts[0]?.startsWith('@') ? `${parts[0]}/${parts[1] ?? ''}` : parts[0];
  const versionIndex = parts.indexOf('v');
  const version = versionIndex >= 0 ? parts[versionIndex + 1] : undefined;
  if (!packageName || packageName.endsWith('/')) throw new Error('The npm package URL is incomplete.');
  return version ? `${packageName}@${version}` : packageName;
}

function runNpmPack(spec: string, destination: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['pack', spec, '--pack-destination', destination, '--ignore-scripts'], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('exit', (code) => code === 0 ? resolve() : reject(new Error(stderr.trim() || 'npm pack failed with exit code ' + code)));
  });
}
