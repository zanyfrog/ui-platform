/**
 * Purpose: Defines UIB package manifest contracts and validation helpers.
 * Use: Package authors validate <package-name>.manifest.json files before discovery or catalog registration.
 */

export const UIB_MANIFEST_VERSION = '1.0.0';
export const UIB_PACKAGE_SCOPE = '@uib/';

export const WELL_KNOWN_PACKAGE_CAPABILITIES = [
  'components',
  'templates',
  'pages',
  'routes',
  'settings',
  'admin',
  'services',
  'data',
  'actions',
  'events',
  'validators',
  'themes',
  'icons',
  'cli',
  'server',
  'jobs',
  'migrations',
  'assets',
] as const;

export type UibPackageCapability = (typeof WELL_KNOWN_PACKAGE_CAPABILITIES)[number] | (string & {});
export type UibServiceRequirements = Record<string, string>;

export interface UibComponentManifestEntry {
  name: string;
  tagName: string;
  displayName?: string;
  category?: string;
  description?: string;
  icon?: string;
  importPath?: string;
  attributes?: string[];
  properties?: string[];
  events?: string[];
  slots?: string[];
}

export interface UibSettingsManifest {
  schema?: string;
  entries?: Record<string, unknown>;
}

export type UibDataStoreAccess = 'read' | 'write' | 'read-write' | 'manage';
export type UibDataStoreScope = 'platform' | 'workspace' | 'application' | 'page' | 'component' | 'user' | 'session';

export interface UibDataStoreDeclaration {
  name: string;
  purpose: string;
  access: UibDataStoreAccess;
  scope: UibDataStoreScope;
}

export interface UibDataManifest {
  stores: UibDataStoreDeclaration[];
}

export interface UibAdminPageManifest {
  id: string;
  label: string;
  route: string;
}

export interface UibAdminManifest {
  pages?: UibAdminPageManifest[];
}

export interface UibPackageManifest {
  name: string;
  version: string;
  manifestVersion: typeof UIB_MANIFEST_VERSION;
  displayName: string;
  description?: string;
  icon?: string;
  capabilities: UibPackageCapability[];
  requiresServices?: UibServiceRequirements;
  components?: UibComponentManifestEntry[];
  settings?: UibSettingsManifest;
  data?: UibDataManifest;
  admin?: UibAdminManifest;
  routes?: unknown[];
  cli?: unknown[];
  jobs?: unknown[];
  lifecycle?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

export interface ManifestValidationResult {
  valid: boolean;
  issues: string[];
}

const npmPackageNamePattern = /^(?:@[a-z0-9][a-z0-9._-]*\/)?[a-z0-9][a-z0-9._-]*$/;
const serviceKeyPattern = /^[a-z][a-z0-9-]*$/;
const exactVersionPattern = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/;
const supportedRangePattern = /^(?:\^\d+\.\d+\.\d+|\d+\.\d+\.\d+)$/;

export function getUnscopedPackageName(packageName: string): string {
  return packageName.startsWith('@') ? packageName.split('/')[1] ?? '' : packageName;
}

export function getManifestFileName(packageName: string): string {
  return `${getUnscopedPackageName(packageName)}.manifest.json`;
}

export function validateManifestFileName(packageName: string, fileName: string): boolean {
  return fileName === getManifestFileName(packageName);
}

export function isOfficialUibPackageName(packageName: string): boolean {
  return packageName.startsWith(UIB_PACKAGE_SCOPE) && npmPackageNamePattern.test(packageName);
}

export function isSupportedVersionRange(range: string): boolean {
  return supportedRangePattern.test(range);
}

export function validatePackageManifest(
  value: unknown,
  options: { fileName?: string; requireOfficialScope?: boolean } = {},
): ManifestValidationResult {
  const issues: string[] = [];

  if (!isRecord(value)) {
    return { valid: false, issues: ['Manifest must be a JSON object.'] };
  }

  const manifest = value as Partial<UibPackageManifest>;

  requireString(manifest.name, 'name', issues);
  requireString(manifest.version, 'version', issues);
  requireString(manifest.manifestVersion, 'manifestVersion', issues);
  requireString(manifest.displayName, 'displayName', issues);

  if (typeof manifest.name === 'string') {
    if (!npmPackageNamePattern.test(manifest.name)) {
      issues.push('name must be a valid npm package name.');
    }

    if (options.requireOfficialScope !== false && !isOfficialUibPackageName(manifest.name)) {
      issues.push('official UIB package names must use the @uib/* npm scope.');
    }

    if (options.fileName && !validateManifestFileName(manifest.name, options.fileName)) {
      issues.push(`manifest file name must be ${getManifestFileName(manifest.name)}.`);
    }
  }

  if (manifest.manifestVersion !== UIB_MANIFEST_VERSION) {
    issues.push(`manifestVersion must be ${UIB_MANIFEST_VERSION}.`);
  }

  if (typeof manifest.version === 'string' && !exactVersionPattern.test(manifest.version)) {
    issues.push('version must be an exact semver version.');
  }

  if (!Array.isArray(manifest.capabilities) || manifest.capabilities.length === 0) {
    issues.push('capabilities must be a non-empty array.');
  } else {
    manifest.capabilities.forEach((capability, index) => {
      if (typeof capability !== 'string' || capability.trim() === '') {
        issues.push(`capabilities[${index}] must be a non-empty string.`);
      }
    });
  }

  if (manifest.requiresServices !== undefined) {
    validateServiceRequirements(manifest.requiresServices, issues);
  }

  if (manifest.components !== undefined) {
    validateComponents(manifest.components, issues);
  }

  if (manifest.data !== undefined) {
    validateDataManifest(manifest.data, issues);
  }

  if (manifest.admin !== undefined) {
    validateAdminManifest(manifest.admin, issues);
  }

  return { valid: issues.length === 0, issues };
}

function validateServiceRequirements(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push('requiresServices must be an object.');
    return;
  }

  for (const [key, range] of Object.entries(value)) {
    if (!serviceKeyPattern.test(key)) {
      issues.push(`requiresServices key "${key}" must be a valid service key.`);
    }

    if (typeof range !== 'string' || !isSupportedVersionRange(range)) {
      issues.push(`requiresServices.${key} must be an exact version or ^major.minor.patch range.`);
    }
  }
}

function validateComponents(value: unknown, issues: string[]): void {
  if (!Array.isArray(value)) {
    issues.push('components must be an array.');
    return;
  }

  value.forEach((component, index) => {
    if (!isRecord(component)) {
      issues.push(`components[${index}] must be an object.`);
      return;
    }

    requireString(component.name, `components[${index}].name`, issues);
    requireString(component.tagName, `components[${index}].tagName`, issues);
  });
}

function validateDataManifest(value: unknown, issues: string[]): void {
  if (!isRecord(value) || !Array.isArray(value.stores)) {
    issues.push('data.stores must be an array.');
    return;
  }

  value.stores.forEach((store, index) => {
    if (!isRecord(store)) {
      issues.push(`data.stores[${index}] must be an object.`);
      return;
    }

    requireString(store.name, `data.stores[${index}].name`, issues);
    requireString(store.purpose, `data.stores[${index}].purpose`, issues);

    if (!['read', 'write', 'read-write', 'manage'].includes(String(store.access))) {
      issues.push(`data.stores[${index}].access must be read, write, read-write, or manage.`);
    }

    if (!['platform', 'workspace', 'application', 'page', 'component', 'user', 'session'].includes(String(store.scope))) {
      issues.push(`data.stores[${index}].scope must be a supported UIB settings/data scope.`);
    }
  });
}

function validateAdminManifest(value: unknown, issues: string[]): void {
  if (!isRecord(value)) {
    issues.push('admin must be an object.');
    return;
  }

  if (value.pages === undefined) {
    return;
  }

  if (!Array.isArray(value.pages)) {
    issues.push('admin.pages must be an array.');
    return;
  }

  value.pages.forEach((page, index) => {
    if (!isRecord(page)) {
      issues.push(`admin.pages[${index}] must be an object.`);
      return;
    }

    requireString(page.id, `admin.pages[${index}].id`, issues);
    requireString(page.label, `admin.pages[${index}].label`, issues);
    requireString(page.route, `admin.pages[${index}].route`, issues);
  });
}

function requireString(value: unknown, path: string, issues: string[]): void {
  if (typeof value !== 'string' || value.trim() === '') {
    issues.push(`${path} is required and must be a non-empty string.`);
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
