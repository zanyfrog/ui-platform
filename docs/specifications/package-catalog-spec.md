# UIB Package Catalog Specification

**Status:** Normative v1 specification
**Version:** 1.0.0
**Applies to:** Global package catalog discovery and platform-owned package catalog state

---

## 1. Purpose

This specification defines the first UIB Package Catalog model. The catalog combines package-provided manifest metadata with platform-owned state so Admin, CLI, HTTP APIs, and runtime services can answer what packages are available and how they are used.

The global Package Manager presents one unified list for installed/discovered UIB extensions and registered foundation workspace packages. The list is a shared read model only: extension enablement and foundation npm dependency selection remain distinct lifecycle operations.

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
## 9. App-Owned Package Intent

App-scoped package enablement MUST be read from the application's `app.manifest.json` package declarations. The platform catalog MAY index and display app usage, but app-level package intent MUST remain portable with the application folder.

The platform SHOULD resolve packages app-first for app-scoped package views and SHOULD preserve missing or incompatible app declarations as warning states.

## 10. Installation Boundary

Package acquisition and installation are separate from discovery and app enablement. The first managed installation source is a local package folder or ZIP archive. Platform installation places a validated package in the platform package workspace and makes it available globally; it MUST NOT enable the package for an application. App-level installation places a validated package in the application package folder and remains portable with that application; it MUST NOT change app.manifest.json until the app explicitly enables the package.

## 11. Unified Global Read Model

`GET /api/package-catalog` MUST list only installed or discovered packages. Each entry MUST identify its lifecycle type, package name, version, source, availability/status, and available timestamps.

Foundation entries MUST identify their immutable source repository and commit. The catalog MUST list each application that uses a foundation package and classify the relationship as a direct selection, resolved dependency, or legacy/untracked dependency. UIB extension usage continues to be derived from application manifests and is not rewritten by this view.
