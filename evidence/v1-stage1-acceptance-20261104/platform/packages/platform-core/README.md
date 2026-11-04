# @uib/platform-core

Core UIB platform contracts, manifest validation, package discovery, package catalog state, and service registry helpers.

Use this package from platform services, Admin UI adapters, CLI commands, HTTP endpoints, and tests that need the same package and service rules. Import public APIs from the package root:

```ts
import { listGlobalPackageCatalog, ServiceRegistry, validatePackageManifest } from '@uib/platform-core';
```

## File Guide

| File | Purpose | How to use |
|---|---|---|
| `README.md` | Package-level file guide and usage overview for platform-core. | Start here when changing platform-core files so every file purpose, consumer path, and verification command stays discoverable. |
| `package.json` | Declares the npm package name, build/test scripts, exports, package files, and Node/runtime expectations. | Use npm workspace commands such as `npm run build --workspace @uib/platform-core`, `npm run typecheck --workspace @uib/platform-core`, and `npm run test --workspace @uib/platform-core`. |
| `platform-core.manifest.json` | The package's own UIB manifest, proving `@uib/platform-core` can be discovered like any other UIB package. | Keep the file name aligned with `<package-name>.manifest.json`; update capabilities and service requirements when platform-core provides new manifest-visible features. |
| `tsconfig.json` | TypeScript settings for source and tests. | Used by package typechecking and inherited by the build config. |
| `tsconfig.build.json` | Build-specific TypeScript settings for emitted declarations and compiled output. | Used by `npm run build --workspace @uib/platform-core`; keep `include` limited to source files so tests are not published. |
| `src/index.ts` | Public barrel export for platform-core APIs. | Export new public modules here so consumers import from `@uib/platform-core` instead of deep source paths. |
| `src/manifest.ts` | UIB package manifest TypeScript contracts and runtime validation helpers. | Use `validatePackageManifest` for parsed manifest JSON and `getManifestFileName` to enforce `<package-name>.manifest.json` naming. |
| `src/manifest-discovery.ts` | Workspace and installed-package manifest discovery. | Use `discoverPackageManifests({ rootDir })` to scan `packages/*` and `node_modules/@uib/*`, returning accepted and rejected manifests with source metadata. |
| `src/package-catalog.ts` | Platform-owned catalog state and app enablement helpers. | Use `refreshPackageCatalog`, `listGlobalPackageCatalog`, `listAppPackageCatalog`, `enablePackageForApp`, and `disablePackageForApp` to merge discovered manifests with `data/package-catalog.manifest.json`. |
| `src/service-registry.ts` | In-memory registry for versioned service contracts. | Register services with string keys and exact versions; resolve them with exact or `^major.minor.patch` ranges. |
| `src/schemas/package-manifest.schema.json` | JSON Schema for UIB package manifest files. | Reference from editors, CI, or package authoring tools to validate manifest shape before runtime validation. |
| `tests/platform-core.test.ts` | Baseline tests for manifest helpers, discovery, and service registry behavior. | Extend when package naming, manifest validation, source discovery, or service compatibility rules change. |
| `tests/package-catalog.test.ts` | Catalog-focused tests for persistent state, timestamps, installed packages, and app enablement. | Extend when catalog state, package status, app filtering, or discovery merge rules change. |

## Catalog State

The default catalog state file is `data/package-catalog.manifest.json` under the platform root. It is platform-owned state, not package-provided metadata. Package-provided metadata comes from each package's `<package-name>.manifest.json` file.

## Verification

Run the focused package checks after editing this package:

```bash
npm run typecheck --workspace @uib/platform-core
npm run test --workspace @uib/platform-core
```