/**
 * Purpose: Provides the in-memory registry for versioned UIB platform service contracts.
 * Use: Register concrete services by string key, then resolve them with exact or supported semver ranges.
 */

export interface ServiceRegistration<TService = unknown> {
  key: string;
  version: string;
  service: TService;
  description?: string;
  capabilities?: string[];
  ownerPackage?: string;
  metadata?: Record<string, unknown>;
}

export interface RegisterServiceOptions {
  replace?: boolean;
}

export class ServiceRegistryError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'invalid-service-key'
      | 'invalid-service-version'
      | 'duplicate-service'
      | 'missing-service'
      | 'incompatible-service-version',
  ) {
    super(message);
    this.name = 'ServiceRegistryError';
  }
}

const serviceKeyPattern = /^[a-z][a-z0-9-]*$/;
const exactVersionPattern = /^(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/;
const caretRangePattern = /^\^(\d+)\.(\d+)\.(\d+)$/;

export class ServiceRegistry {
  private readonly registrations = new Map<string, ServiceRegistration>();

  register<TService>(registration: ServiceRegistration<TService>, options: RegisterServiceOptions = {}): void {
    assertServiceKey(registration.key);
    assertVersion(registration.version);

    if (this.registrations.has(registration.key) && !options.replace) {
      throw new ServiceRegistryError(`Service "${registration.key}" is already registered.`, 'duplicate-service');
    }

    this.registrations.set(registration.key, registration);
  }

  get<TService>(key: string, requiredRange?: string): TService {
    assertServiceKey(key);
    const registration = this.registrations.get(key);

    if (!registration) {
      throw new ServiceRegistryError(`Service "${key}" is not registered.`, 'missing-service');
    }

    if (requiredRange && !isVersionCompatible(registration.version, requiredRange)) {
      throw new ServiceRegistryError(
        `Service "${key}" version ${registration.version} does not satisfy ${requiredRange}.`,
        'incompatible-service-version',
      );
    }

    return registration.service as TService;
  }

  has(key: string, requiredRange?: string): boolean {
    const registration = this.registrations.get(key);
    return Boolean(registration && (!requiredRange || isVersionCompatible(registration.version, requiredRange)));
  }

  list(): ServiceRegistration[] {
    return [...this.registrations.values()];
  }
}

export function isVersionCompatible(version: string, range: string): boolean {
  const versionMatch = exactVersionPattern.exec(version);
  if (!versionMatch) {
    return false;
  }

  const exactRangeMatch = exactVersionPattern.exec(range);
  if (exactRangeMatch) {
    return version === range;
  }

  const caretMatch = caretRangePattern.exec(range);
  if (!caretMatch) {
    return false;
  }

  const [major, minor, patch] = versionMatch.slice(1, 4).map(Number);
  const [rangeMajor, rangeMinor, rangePatch] = caretMatch.slice(1, 4).map(Number);

  if (major !== rangeMajor) {
    return false;
  }

  if (major === 0) {
    return minor === rangeMinor && patch >= rangePatch;
  }

  return minor > rangeMinor || (minor === rangeMinor && patch >= rangePatch);
}

function assertServiceKey(key: string): void {
  if (!serviceKeyPattern.test(key)) {
    throw new ServiceRegistryError(`"${key}" is not a valid service key.`, 'invalid-service-key');
  }
}

function assertVersion(version: string): void {
  if (!exactVersionPattern.test(version)) {
    throw new ServiceRegistryError(`"${version}" is not a valid service contract version.`, 'invalid-service-version');
  }
}
