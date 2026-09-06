# UIB App Manifest Specification

**Status:** Normative v1 specification
**Version:** 1.0.0
**Applies to:** Application-owned identity and package declarations

---

## 1. Purpose

This specification defines `app.manifest.json`, the application-owned source of truth for portable app identity and package intent.

Runtime settings that directly configure app behavior remain in the app settings file. Package-provided metadata remains in each package's `<package-name>.manifest.json`. Platform catalog state remains a rebuildable platform-owned index/cache.

## 2. File Location

Each application SHOULD include this file at the application root:

```text
app.manifest.json
```

The platform MAY lazily create `app.manifest.json` for existing applications from legacy app metadata when the file is missing.

## 3. Required Shape

```json
{
  "manifestVersion": "1.0.0",
  "appId": "2fc49bf7-0da2-48f4-8948-49ad6f405bff",
  "template": "standard",
  "templateVersion": "1.0.0",
  "createdAt": "2026-09-05T12:00:00.000Z",
  "packages": {
    "@uib/calendar": {
      "enabled": true,
      "version": "^1.0.0",
      "resolution": "app-first"
    }
  }
}
```

`manifestVersion` MUST be `1.0.0` for this specification.

## 4. Package Declarations

The `packages` object MUST be keyed by npm package name.

Each package declaration MAY include:

- `enabled`: whether the app intends to use the package.
- `version`: an exact semver version or a `^major.minor.patch` range.
- `resolution`: package resolution preference.
- `addedAt`: ISO 8601 timestamp for first app declaration.
- `updatedAt`: ISO 8601 timestamp for the most recent app declaration change.

Disable operations SHOULD set `enabled` to `false` instead of removing the package declaration. Removal MAY be added later as a separate action.

## 5. Resolution Order

For app package views and app runtime resolution, the default `app-first` order is:

1. app-local `packages/*/*.manifest.json`
2. app-local `node_modules/@uib/*/*.manifest.json`
3. platform `packages/*/*.manifest.json`
4. platform `node_modules/@uib/*/*.manifest.json`

This allows an app to carry packages with it and remain portable when moved or copied.

## 6. Unresolved Packages

If an app declares an enabled package that cannot be resolved, the platform MUST preserve the app declaration and show a warning state.

If an app declares an enabled package whose resolved version does not satisfy the requested version, the platform MUST preserve the app declaration and show an incompatible warning state.

Missing or incompatible packages are warn-only in this implementation step; they do not automatically modify the app manifest or block app discovery.

## 7. Separation of Responsibilities

- `app.manifest.json` owns app identity and package intent.
- `app.settings.json` owns runtime/admin-configurable app settings.
- `<package-name>.manifest.json` owns package capability metadata.
- `data/package-catalog.manifest.json` owns platform discovery/cache/history metadata.