# UIB Package Architecture

This document was split out of docs/architecture/UIB-Architecture-Guide.md on 2026-09-03. The Architecture Guide remains the authoritative umbrella document; this file preserves and organizes the detailed architecture content for this topic.

---

# 7. Package Definition

A UIB package is more than an npm dependency.

A package may contribute any of the following:

- Components
- Templates
- Pages
- Routes
- Settings
- Admin pages
- Services
- Data providers
- Actions
- Events
- Validators
- Themes
- Icons
- CLI commands
- Server middleware
- Server-side handlers
- Background-job definitions
- Package migrations
- Assets

A package may contain one component or hundreds of components.

Example:

```text
Package
   │
   ├── Component
   ├── Component
   ├── Component
   │
   ├── Template
   ├── Service
   ├── Action
   ├── Settings
   ├── Admin Page
   └── Server Functionality
```

---

# 8. Example Package Manifest

A package should have a UIB-aware manifest in addition to its normal `package.json`.

Example:

```json
{
  "name": "@uib/calendar",
  "displayName": "UIB Calendar",
  "description": "Calendar components and services for UIB applications",
  "version": "3.2.0",
  "icon": "./assets/icon.svg",

  "uib": {
    "packageType": "extension",

    "components": "./components",
    "services": "./services",
    "admin": "./admin",
    "server": "./server",
    "templates": "./templates",
    "settings": "./settings.schema.json",

    "requires": {
      "platform": "^1",
      "services": {
        "settings": "^1",
        "events": "^1",
        "data": "^1"
      }
    },

    "capabilities": [
      "components",
      "server",
      "admin",
      "settings"
    ]
  }
}
```

A small package may simply declare:

```json
{
  "uib": {
    "capabilities": [
      "components"
    ]
  }
}
```

That package might contain only one component.

---

# 11. Platform Installation vs Application Use

UIB should support both:

1. Packages available/installed at the platform level.
2. Packages enabled or installed for a specific application.

Conceptually:

```text
AVAILABLE TO PLATFORM
        ↓
INSTALLED / ENABLED FOR APPLICATION
```

A package may be used by only one application.

Example:

```text
Platform Package Repository

@uib/uib-base        2.5.1
@uib/forms           1.8.0
@uib/calendar        3.2.0
```

Applications may use different subsets:

```text
Reservations
├── uib-base
├── forms
└── calendar

Survey App
├── uib-base
└── forms
```

---

## Application-Owned Package Intent

**Status:** CONFIRMED

Application-level package enablement and dependency intent should live with the application in `app.manifest.json`. The platform catalog remains an index/cache/read model that can be rebuilt from application folders and package manifests.

For app-scoped package views and runtime resolution, the platform should resolve packages app-first:

1. app-local packages;
2. app-local `node_modules/@uib` packages;
3. platform workspace packages;
4. platform `node_modules/@uib` packages.

Missing or incompatible app-declared packages should preserve the app's intent and surface warn-only status until install/repair workflows are implemented.
---

# 12. One Platform Version for Now

At this stage, different applications should **not** use different versions of the same package.

Example:

```text
@uib/uib-base = 2.5.1
```

is the currently installed platform version.

All applications using `@uib/uib-base` use that version.

This avoids version fragmentation and simplifies dependency resolution.

Support for per-application package versions may be revisited later.

---

# 13. Direct and Transitive Dependencies

UIB should distinguish between packages explicitly installed by an administrator and packages installed because another package requires them.

Example:

```text
Calendar       Direct
uib-base       Dependency
uib-icons      Dependency
```

If `uib-base` is both explicitly installed and required by another package:

```text
uib-base       Direct + Dependency
```

The dependency resolver must prevent accidental removal of a package still required elsewhere.

Removing Calendar must not remove `uib-base` if another package or application still requires it.

---

# 14. Package Dependencies

A package may declare UIB dependencies separately from its normal npm dependencies.

Example:

```json
{
  "uibDependencies": {
    "@uib/uib-base": "^2.4",
    "@uib/data": "^1.2"
  }
}
```

Installing:

```text
@uib/reservations
```

may therefore require:

```text
@uib/uib-base 2.x
@uib/data 1.x
```

The Admin UI should show the dependency impact before installation.

The platform may automatically install required dependencies after administrator approval.

---

# 15. Package Catalog

The UIB Package Service should include a Package Catalog.

The catalog should answer:

- What packages exist?
- What versions exist?
- What does each package provide?
- What does it require?
- Who published it?
- What package channel is available?
- What compatibility requirements exist?
- What applications use the package?
- What dependencies are required?

The catalog should be an independent service capability layered over the package source.

---

# 16. Package Source / Repository

UIB should support a UIB-specific package catalog or repository service layered over npm or another underlying package source.

The package catalog service should remain independent.

Future third-party package publishing should be supported by the architecture, but third-party publishing workflows, permissions, trust policies, and marketplace governance can be deferred until needed.

---

# 17. Package Management Service Decomposition

The Package Service should internally be decomposed into focused responsibilities.

```text
Package Service
│
├── PackageCatalog
├── PackageInstaller
├── DependencyResolver
├── PackageUpdater
├── PackageActivator
├── PackageHealth
└── PackageHistory
```

## PackageCatalog

Responsible for package discovery and metadata.

## PackageInstaller

Responsible for:

- download;
- validation;
- install;
- registration.

## DependencyResolver

Responsible for:

- dependency graphs;
- compatibility checks;
- conflicts;
- installation ordering;
- uninstall safety.

## PackageUpdater

Responsible for:

- installed version;
- latest version;
- update channels;
- update policy;
- update installation;
- rollback support.

## PackageActivator

Responsible for controlled activation of an installed package version.

## PackageHealth

Responsible for package health and compatibility diagnostics.

## PackageHistory

Responsible for install/update/activation/rollback/uninstall history.

---

# 27. Package Enable / Disable

A package should support disabling without uninstalling.

This is useful for troubleshooting, testing, and safe administration.

For now, individual components inside a package do not need their own enable/disable control.

The package itself may be enabled or disabled.

---

# 51. Package Capabilities and Permissions

Packages should declare the capabilities they require.

Examples:

```text
components
settings
server
routes
data-read
data-write
admin
jobs
cli
logging
events
templates
services
```

This metadata prepares the platform for future third-party package security and trust controls.

Third-party publishing and permission enforcement may be implemented later, but the architecture should support it now.

---

# 56. Package Example: Calendar

```text
@uib/calendar
│
├── Components
│   ├── Calendar
│   ├── EventCard
│   └── DatePicker
│
├── Server
│   └── Calendar API
│
├── Admin
│   └── Calendar Administration
│
├── Settings
│
├── Actions
│   ├── CreateEvent
│   └── DeleteEvent
│
├── Jobs
│   └── External Calendar Sync
│
├── Data
│   ├── events
│   └── calendar-sync-state
│
└── Dependencies
    ├── @uib/uib-base
    └── @uib/date-service
```

---

# 57. `uib-base` as a First-Class Package

`@uib/uib-base` should be treated as a first-class package rather than merely a source-code component library.

It may provide:

- base components;
- component metadata;
- themes;
- icons;
- layout capabilities;
- default settings;
- component categories;
- optional server-side capabilities if needed;
- Admin configuration;
- package health metadata.

This allows `uib-base` to participate in the same package lifecycle, settings, update, health, dependency, and administration systems as any other package.

---

# 63. Application Export Considerations

Because packages use service contracts instead of direct platform internals, exported applications can include only the services and packages they require.

For example, an exported app might include:

```text
@uib/settings-service
@uib/data-service
@uib/event-service
@uib/logging-service
@uib/router-service
@uib/uib-base
@uib/forms
```

without including the full UIB Platform Admin environment.

This supports the existing goal that generated applications can be exported and run independently after install/build.

---

# 66. Initial Implementation Boundaries

The architecture should support more than the first implementation needs.

The initial implementation does not need to include:

- per-application package versions;
- application-level update policy overrides;
- individual component enable/disable;
- full third-party package marketplace publishing;
- advanced third-party trust enforcement;
- complete job/scheduler functionality.

However, the initial contracts and metadata should avoid preventing those capabilities later.

---

