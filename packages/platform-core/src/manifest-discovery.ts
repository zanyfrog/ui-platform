/**
 * Purpose: Finds and validates UIB package manifests from workspace packages and installed @uib dependencies.
 * Use: Platform services call discoverPackageManifests before building catalogs or reporting manifest issues.
 */

import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { validateManifestFileName, validatePackageManifest, type ManifestValidationResult, type UibPackageManifest } from './manifest.js';

export type ManifestDiscoverySourceType = 'workspace' | 'installed';

export interface ManifestDiscoverySource {
  type: ManifestDiscoverySourceType;
  packageRoot: string;
}

export interface ManifestDiscoveryOptions {
  rootDir: string;
  includeWorkspacePackages?: boolean;
  includeInstalledPackages?: boolean;
}

export interface DiscoveredPackageManifest {
  manifest: UibPackageManifest;
  filePath: string;
  source: ManifestDiscoverySource;
  validation: ManifestValidationResult;
}

export interface RejectedPackageManifest {
  filePath: string;
  source: ManifestDiscoverySource;
  validation: ManifestValidationResult;
}

export interface ManifestDiscoveryResult {
  manifests: DiscoveredPackageManifest[];
  rejected: RejectedPackageManifest[];
}

interface CandidateManifestFile {
  filePath: string;
  source: ManifestDiscoverySource;
}

export async function discoverPackageManifests(options: ManifestDiscoveryOptions): Promise<ManifestDiscoveryResult> {
  const includeWorkspacePackages = options.includeWorkspacePackages ?? true;
  const includeInstalledPackages = options.includeInstalledPackages ?? true;
  const candidateFiles: CandidateManifestFile[] = [];

  if (includeWorkspacePackages) {
    candidateFiles.push(...(await findWorkspaceManifestFiles(options.rootDir)));
  }

  if (includeInstalledPackages) {
    candidateFiles.push(...(await findInstalledUibManifestFiles(options.rootDir)));
  }

  const manifests: DiscoveredPackageManifest[] = [];
  const rejected: RejectedPackageManifest[] = [];

  for (const candidate of candidateFiles) {
    const parsed = await readManifestFile(candidate.filePath);
    if (!parsed.ok) {
      rejected.push({ filePath: candidate.filePath, source: candidate.source, validation: { valid: false, issues: [parsed.error] } });
      continue;
    }

    const validation = validatePackageManifest(parsed.value, { fileName: path.basename(candidate.filePath) });

    if (validation.valid) {
      manifests.push({ manifest: parsed.value as UibPackageManifest, filePath: candidate.filePath, source: candidate.source, validation });
    } else {
      rejected.push({ filePath: candidate.filePath, source: candidate.source, validation });
    }
  }

  return { manifests, rejected };
}

async function findWorkspaceManifestFiles(rootDir: string): Promise<CandidateManifestFile[]> {
  const packagesDir = path.join(rootDir, 'packages');
  const packageDirs = await readDirectoryIfExists(packagesDir);
  const files: CandidateManifestFile[] = [];

  for (const packageDir of packageDirs) {
    if (!packageDir.isDirectory()) {
      continue;
    }

    const fullPackageDir = path.join(packagesDir, packageDir.name);
    const packageFiles = await readDirectoryIfExists(fullPackageDir);

    for (const file of packageFiles) {
      if (file.isFile() && file.name.endsWith('.manifest.json')) {
        files.push({ filePath: path.join(fullPackageDir, file.name), source: { type: 'workspace', packageRoot: fullPackageDir } });
      }
    }
  }

  return files;
}

async function findInstalledUibManifestFiles(rootDir: string): Promise<CandidateManifestFile[]> {
  const uibNodeModulesDir = path.join(rootDir, 'node_modules', '@uib');
  const packageDirs = await readDirectoryIfExists(uibNodeModulesDir);
  const files: CandidateManifestFile[] = [];

  for (const packageDir of packageDirs) {
    if (!packageDir.isDirectory()) {
      continue;
    }

    const packageName = `@uib/${packageDir.name}`;
    const fullPackageDir = path.join(uibNodeModulesDir, packageDir.name);
    const packageFiles = await readDirectoryIfExists(fullPackageDir);

    for (const file of packageFiles) {
      if (file.isFile() && file.name.endsWith('.manifest.json') && validateManifestFileName(packageName, file.name)) {
        files.push({ filePath: path.join(fullPackageDir, file.name), source: { type: 'installed', packageRoot: fullPackageDir } });
      }
    }
  }

  return files;
}

async function readManifestFile(filePath: string): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  try {
    return { ok: true, value: JSON.parse(await readFile(filePath, 'utf8')) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Unable to read manifest.' };
  }
}

async function readDirectoryIfExists(dir: string) {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch {
    return [];
  }
}