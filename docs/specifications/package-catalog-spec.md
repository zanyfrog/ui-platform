# UIB Package Catalog Specification

**Status:** Normative v1 specification
**Version:** 1.0.0
**Applies to:** Global package catalog discovery and platform-owned package catalog state

---

## 1. Purpose

This specification defines the first UIB Package Catalog model. The catalog combines package-provided manifest metadata with platform-owned state so Admin, CLI, HTTP APIs, and runtime services can answer what packages are available and how they are used.

## 2. Sources

The catalog MUST discover package manifests from:

- workspace packages matching `packages/*/*.manifest.json`;
- installed official packages matching `node_modules/@uib/*/*.manifest.json`.

Discovered packages MUST appear globally as available packages when their manifests are valid.

## 3. Package-Provided Metadata

The package manifest is the source of truth for package-provided display and capability metadata, including:

- package name;
- display name;
- version;
- description;
- icon;
- capabilities;
- service requirements;
- component metadata;
- settings metadata;
- data declarations;
- Admin page declarations.

Icons MUST come from the package manifest for the initial implementation.

## 4. Platform-Owned Catalog State

The platform MUST store platform-owned catalog state in:

```text
data/package-catalog.manifest.json
```

This state MUST NOT overwrite package-owned manifest files.

The state manifest MUST include:

- `manifestVersion`;
- `updatedAt`;
- `packages` keyed by npm package name.

Each package state entry SHOULD include:

- `name`;
- `firstDiscoveredAt`;
- `addedAt`;
- `lastDiscoveredAt`;
- `lastSeenVersion`;
- `lastManifestPath`;
- `source`;
- `status`;
- `installedAt`;
- `installedVersion`;
- `activeVersion`;
- `updatePolicy`;
- `channel`;
- `health`;
- `enabledForApps`.

## 5. Timestamps

The catalog MUST preserve `firstDiscoveredAt` after the first successful discovery of a package.

The catalog MUST update `lastDiscoveredAt` on each successful discovery scan.

The catalog MUST record per-application `enabledAt` when a package is enabled for an app.

All timestamps MUST be ISO 8601 strings.

## 6. Statuses

The initial package catalog statuses are:

- `available`
- `installed`
- `enabled`
- `disabled`
- `missing-dependency`
- `incompatible`
- `error`

`available` is derived from current successful manifest discovery.

Install, enable, disable, health, and compatibility metadata are stored in platform-owned catalog state.

## 7. Global Before App-Scoped

The first catalog view MUST be global. App-scoped catalog views SHOULD be derived from the global catalog and per-app enablement metadata.

## 8. Removed Manifests

A package whose manifest is no longer discovered MUST NOT appear as currently available.

The platform MAY preserve historical catalog state for that package so first-discovery timestamps, audit details, and enablement history are not lost.