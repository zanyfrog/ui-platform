import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { AppManifest, AppPackageDeclaration, AppPackageResolution } from '../shared/types.js';
import { appsDir } from './paths.js';
import { atomicWriteJson, readJson } from './json-files.js';

export const APP_MANIFEST_FILE = 'app.manifest.json';
export const APP_MANIFEST_VERSION = '1.0.0';

const keyPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const packageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const supportedVersionRangePattern = /^(?:\^\d+\.\d+\.\d+|\d+\.\d+\.\d+)$/;

export function safeAppKey(key: string): string {
  if (!keyPattern.test(key)) throw new Error('Folder / URL Name must contain lowercase letters, numbers, and single hyphens only.');
  return key;
}

export function appManifestPathFor(keyInput: string): string {
  return path.join(appsDir, safeAppKey(keyInput), APP_MANIFEST_FILE);
}

export async function ensureAppManifest(keyInput: string): Promise<AppManifest> {
  const key = safeAppKey(keyInput);
  const appDir = path.join(appsDir, key);
  const manifestPath = path.join(appDir, APP_MANIFEST_FILE);

  try {
    return normalizeAppManifest(await readJson<unknown>(manifestPath));
  } catch (error) {
    if (!isMissingFileError(error)) throw error;
  }

  const legacy: Record<string, unknown> = await readJson<Record<string, unknown>>(path.join(appDir, 'ui.app.json')).catch(() => ({}));
  const created = createInitialAppManifest({
    appId: typeof legacy.appId === 'string' ? legacy.appId : '',
    template: typeof legacy.template === 'string' ? legacy.template : 'unknown',
    templateVersion: typeof legacy.templateVersion === 'string' ? legacy.templateVersion : 'unknown',
    createdAt: typeof legacy.createdAt === 'string' ? legacy.createdAt : undefined,
  });
  await atomicWriteJson(manifestPath, created);
  return created;
}

export async function writeInitialAppManifest(
  appDir: string,
  input: { appId: string; template: string; templateVersion: string; createdAt?: string; packages?: Record<string, AppPackageDeclaration> },
): Promise<AppManifest> {
  const manifest = createInitialAppManifest(input);
  await atomicWriteJson(path.join(appDir, APP_MANIFEST_FILE), manifest);
  return manifest;
}

export async function setAppPackageDeclaration(
  keyInput: string,
  packageName: string,
  declaration: AppPackageDeclaration,
): Promise<AppManifest> {
  assertPackageName(packageName);
  const manifest = await ensureAppManifest(keyInput);
  const next: AppManifest = {
    ...manifest,
    updatedAt: new Date().toISOString(),
    packages: {
      ...manifest.packages,
      [packageName]: normalizePackageDeclaration(declaration),
    },
  };
  await atomicWriteJson(appManifestPathFor(keyInput), next);
  return next;
}

export async function readRawAppManifest(appDir: string): Promise<AppManifest> {
  return normalizeAppManifest(JSON.parse(await readFile(path.join(appDir, APP_MANIFEST_FILE), 'utf8')));
}

function createInitialAppManifest(input: {
  appId: string;
  template: string;
  templateVersion: string;
  createdAt?: string;
  packages?: Record<string, AppPackageDeclaration>;
}): AppManifest {
  return {
    manifestVersion: APP_MANIFEST_VERSION,
    appId: input.appId,
    template: input.template,
    templateVersion: input.templateVersion,
    createdAt: input.createdAt,
    packages: normalizePackages(input.packages ?? {}),
  };
}

function normalizeAppManifest(value: unknown): AppManifest {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${APP_MANIFEST_FILE} must be a JSON object.`);
  }

  const manifest = value as Partial<AppManifest>;
  return {
    manifestVersion: APP_MANIFEST_VERSION,
    appId: stringOrEmpty(manifest.appId),
    template: stringOrDefault(manifest.template, 'unknown'),
    templateVersion: stringOrDefault(manifest.templateVersion, 'unknown'),
    createdAt: typeof manifest.createdAt === 'string' ? manifest.createdAt : undefined,
    updatedAt: typeof manifest.updatedAt === 'string' ? manifest.updatedAt : undefined,
    packages: normalizePackages(manifest.packages),
  };
}

function normalizePackages(value: unknown): Record<string, AppPackageDeclaration> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([packageName]) => packageNamePattern.test(packageName))
      .map(([packageName, declaration]) => [packageName, normalizePackageDeclaration(declaration)]),
  );
}

function normalizePackageDeclaration(value: unknown): AppPackageDeclaration {
  const declaration = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<AppPackageDeclaration> : {};
  const version = typeof declaration.version === 'string' && supportedVersionRangePattern.test(declaration.version) ? declaration.version : undefined;
  const resolution = normalizeResolution(declaration.resolution);
  return {
    enabled: declaration.enabled === true,
    version,
    resolution,
    addedAt: typeof declaration.addedAt === 'string' ? declaration.addedAt : undefined,
    updatedAt: typeof declaration.updatedAt === 'string' ? declaration.updatedAt : undefined,
  };
}

function normalizeResolution(value: unknown): AppPackageResolution {
  return value === 'app-only' || value === 'platform-first' || value === 'platform-only' ? value : 'app-first';
}

function assertPackageName(packageName: string): void {
  if (!packageNamePattern.test(packageName)) throw new Error(`Invalid package name: ${packageName}`);
}

function stringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function stringOrDefault(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

function isMissingFileError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT';
}