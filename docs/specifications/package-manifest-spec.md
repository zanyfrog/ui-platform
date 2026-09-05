# UIB Package Manifest Specification

**Status:** Normative v1 specification
**Version:** 1.0.0
**Applies to:** UIB packages using npm package naming

---

## 1. Purpose

This specification defines the UIB package manifest format. A UIB package manifest declares what a package provides, what it requires, what settings and data it uses, and how it participates in platform lifecycle operations.

The manifest is authoritative package metadata for UIB. Normal npm metadata remains in `package.json`; UIB-specific metadata belongs in a separate manifest file.

## 2. Manifest File Name

A UIB package MUST provide a separate manifest file named:

```text
<package-name>.manifest.json
```

For scoped npm packages, `<package-name>` MUST be the unscoped package name.

Examples:

| npm package name | manifest file |
|---|---|
| `@uib/calendar` | `calendar.manifest.json` |
| `@uib/platform-core` | `platform-core.manifest.json` |
| `forms` | `forms.manifest.json` |

## 3. Package Naming

Official UIB packages MUST use npm package naming under the `@uib/*` scope.

The first supported package name pattern is:

```text
@uib/<package-name>
```

Local or internal package IDs MAY be introduced later, but they are outside this v1 specification.

## 4. Required Fields

A manifest MUST include:

- `name`: the npm package name.
- `version`: the package version.
- `manifestVersion`: the manifest schema version.
- `displayName`: a human-readable package name.
- `capabilities`: the package capability list.

`manifestVersion` MUST be `1.0.0` for this specification.

## 5. Capabilities

`capabilities` MUST be an array of one or more strings. The initial well-known capability values are:

- `components`
- `templates`
- `pages`
- `routes`
- `settings`
- `admin`
- `services`
- `data`
- `actions`
- `events`
- `validators`
- `themes`
- `icons`
- `cli`
- `server`
- `jobs`
- `migrations`
- `assets`

Packages MAY declare future capability strings, but the platform MAY warn when a capability is unknown.

## 6. Service Requirements

A package MAY require UIB services using semver-compatible ranges:

```json
{
  "requiresServices": {
    "settings": "^1.0.0",
    "logging": "^1.0.0"
  }
}
```

Service keys are string identifiers. Service version compatibility is defined by the UIB Service Contract Specification.

## 7. Components

When a package declares the `components` capability, it SHOULD provide component metadata using the `components` field.

```json
{
  "components": [
    {
      "name": "Button",
      "tagName": "uib-button",
      "displayName": "Button",
      "category": "Controls"
    }
  ]
}
```

Each component entry MUST include `name` and `tagName`.

## 8. Settings

When a package declares the `settings` capability, it SHOULD declare a settings schema reference or inline setting metadata.

```json
{
  "settings": {
    "schema": "./settings.schema.json"
  }
}
```

The detailed settings schema format is defined separately by the UIB Settings Specification.

## 9. Data Declarations

Packages that read, write, own, or manage runtime data MUST declare their logical data stores.

```json
{
  "data": {
    "stores": [
      {
        "name": "events",
        "purpose": "Stores calendar events",
        "access": "read-write",
        "scope": "application"
      }
    ]
  }
}
```

Data store declarations MUST include `name`, `purpose`, `access`, and `scope`.

## 10. Admin Extensions

Packages MAY contribute Admin pages or generated settings pages.

```json
{
  "admin": {
    "pages": [
      {
        "id": "calendar-settings",
        "label": "Calendar",
        "route": "/admin/calendar"
      }
    ]
  }
}
```

## 11. Routes, CLI, Jobs, and Lifecycle Hooks

Packages MAY declare routes, CLI commands, scheduled jobs, and lifecycle hooks. These declarations are metadata only; packages MUST register runtime behavior through UIB services.

Packages MUST NOT launch independent HTTP servers, create unmanaged timers, or directly access the operating-system file system.

## 12. Validation

The platform MUST validate manifests before registration. Invalid manifests MUST NOT be registered as active package metadata.

At minimum, validation MUST check:

- required fields;
- npm package name format;
- manifest filename compatibility with package name;
- `manifestVersion`;
- capability list shape;
- service requirement version ranges;
- component metadata shape when present;
- data declaration shape when present.

## 13. Discovery

The platform MUST initially discover manifests from:

- workspace packages matching `packages/*/*.manifest.json`;
- installed official packages matching `node_modules/@uib/*/*.manifest.json`.

Additional discovery locations MAY be added later.
