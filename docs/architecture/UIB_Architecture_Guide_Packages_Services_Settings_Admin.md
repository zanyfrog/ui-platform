# UIB Platform Architecture Guide — Packages, Services, Settings, Components, and Administration

**Status:** Canonical working architecture guide  
**Project:** UIB Platform  
**Date:** 2026-09-03

---


## Document Control and Preservation Policy

This file is intended to be the **canonical working Architecture Guide** for the UIB package, service, settings, component, and administration architecture.

The Markdown (`.md`) format is only the storage format. The artifact itself is an Architecture Guide and should preserve both:

1. **The resulting architecture** — how UIB is intended to work.
2. **The decision history** — what was proposed, what was accepted, what was deferred, and why.

### Preservation rule

When this guide is revised, existing substantive decisions should **not be silently removed or compressed away**. A change should instead be handled as one of the following:

- **Confirmed** — explicitly accepted as the current design.
- **Accepted Recommendation** — initially recommended and then accepted by the project owner.
- **Deferred** — intentionally postponed; architecture should remain compatible where practical.
- **Future** — desirable capability that is not part of the initial implementation.
- **Superseded** — an earlier decision intentionally replaced by a newer decision.
- **Open** — a decision still requiring resolution.

If a decision is superseded, the old decision should remain in the Decision Record with a pointer to the newer decision.

### Source completeness

This guide incorporates the substantive content of the package/settings/admin design conversation that led to it. A conversation-derived record is included in the appendices so later restructuring of the guide does not erase the reasoning or the user's explicit answers.

### Relationship to other UIB architecture documents

This guide is an umbrella architecture document. More detailed specifications may be split out later, including:

- Package Manifest Specification
- Service Contract Specification
- Settings Specification
- Package Manager Specification
- Data Service Specification
- Admin Extension Specification
- Job / Scheduler Specification
- Component Metadata / Registry Specification

Those documents should refine this guide rather than contradict it. Any contradiction should be resolved by updating the Decision Record.

---

## Decision Status Legend

| Status | Meaning |
|---|---|
| **CONFIRMED** | Explicitly accepted as the current design. |
| **ACCEPTED RECOMMENDATION** | Recommended during discussion and explicitly accepted. |
| **DEFERRED** | Intentionally postponed; preserve future compatibility where reasonable. |
| **FUTURE** | Planned or desirable later capability, not required initially. |
| **OPEN** | Not yet decided. |
| **SUPERSEDED** | Historical decision replaced by a later one; retain for traceability. |

---

## 1. Purpose

This document consolidates the current design decisions for the UIB Platform's package management, service architecture, settings system, administration experience, component discovery, package updates, data access, lifecycle management, CLI/HTTP access, and extension model.

The goal is to support a highly modular platform where:

- A package may provide **one component or many components**.
- A package may also provide services, admin pages, routes, server-side functionality, settings, templates, actions, events, validators, themes, icons, CLI commands, middleware, and background-job definitions.
- Packages should be reusable across one or many applications.
- A package may be installed for the platform, for a single application, or for multiple applications.
- Packages should not directly access the file system.
- Platform resources should be accessed through versioned UIB service contracts.
- The Admin UI, CLI, HTTP API, and runtime should all use the same underlying services and business logic.
- The platform should support safe package installation, updates, activation, health checks, history, backup, and rollback.

---

# 2. Core Architectural Principle

> Packages declare what they provide, what they require, what settings they expose, what data they use, and how they participate in the platform lifecycle. The UIB Platform manages discovery, installation, configuration, communication, security, storage, updates, activation, health, and administration.

Packages should not directly reach into the internals of another package.

Packages should not directly access:

- the operating-system file system;
- arbitrary application files;
- another package's internal files;
- a private database implementation;
- an independently started HTTP server;
- arbitrary unmanaged timers or schedulers.

Instead, packages should use platform services.

Conceptually:

```text
Package
   ↓
Versioned Service Contract
   ↓
UIB Service
   ↓
Implementation
```

Not:

```text
Package
   ↓
filesystem / database / random server / package internals
```

This separation is foundational to keeping UIB modular as it grows.

---

# 3. High-Level Platform Architecture

```text
UIB Platform
│
├── Core Services
│   ├── Application Service
│   ├── Package Service
│   ├── Settings Service
│   ├── Component Registry Service
│   ├── Template Registry Service
│   ├── Service Registry
│   ├── Routing / Server Service
│   ├── Event Service
│   ├── Runtime Service
│   ├── Data Service
│   ├── Logging Service
│   ├── Backup / Restore Service
│   ├── Health Service
│   └── Job / Scheduler Service
│
├── Optional / Specialized Services
│   ├── Authentication Service
│   ├── ORM / Data Adapter Service
│   ├── File Service
│   ├── Email Service
│   ├── Notification Service
│   └── Other future services
│
└── Packages
    ├── @uib/uib-base
    ├── @uib/forms
    ├── @uib/calendar
    ├── @uib/reservations
    └── future third-party packages
```

A key design preference is to keep services focused instead of building one large platform core.

---

# 4. Service Packages

The platform should favor distinct service packages for distinct platform capabilities.

Examples:

```text
@uib/settings-service
@uib/package-service
@uib/data-service
@uib/event-service
@uib/logging-service
@uib/router-service
@uib/job-service
@uib/auth-service
```

Administrative UIs should also be independently modular where practical:

```text
@uib/admin-settings
@uib/admin-packages
@uib/admin-data
@uib/admin-users
@uib/admin-security
@uib/admin-logging
```

This allows a headless service to exist without requiring the corresponding Admin UI.

For example:

```text
@uib/settings-service
```

may be used by an exported application without necessarily including:

```text
@uib/admin-settings
```

This pattern should be consistent wherever useful:

```text
@uib/auth-service
@uib/admin-auth

@uib/settings-service
@uib/admin-settings

@uib/package-service
@uib/admin-packages

@uib/data-service
@uib/admin-data
```

---

# 5. Service Registry

UIB should provide a Service Registry.

The Service Registry makes platform services discoverable by capability or contract rather than by implementation internals.

Conceptually:

```text
Service Registry
│
├── settings
├── packages
├── logging
├── events
├── data
├── authentication
├── routing
├── jobs
└── files
```

A package may request a service through a typed contract.

Example:

```ts
const settings = services.get(SettingsService);
const data = services.get(DataService);
const log = services.get(LoggingService);
```

Packages should not need to know which implementation package satisfies the contract.

---

# 6. Versioned Service Contracts

Every important UIB service should expose a formal, versioned interface.

Examples:

```text
Settings Service Contract v1
Data Service Contract v1
Event Service Contract v1
Logging Service Contract v1
Routing Service Contract v1
Job Service Contract v1
Package Service Contract v1
```

A package should be able to require a compatible service contract rather than a specific internal implementation version.

Example:

```json
{
  "requiresServices": {
    "settings": "^1",
    "logging": "^1",
    "events": "^1",
    "data": "^1"
  }
}
```

This is intentionally separate from normal npm dependencies.

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

# 9. Component Metadata and Discovery

The Page Builder should not need hard-coded knowledge of package-specific components.

Each component should expose metadata sufficient for discovery and editing.

Example:

```ts
{
  name: "Button",
  displayName: "Button",
  category: "Controls",
  icon: "button.svg",

  properties: {
    // metadata
  },

  events: {
    click: {
      // metadata
    }
  },

  slots: [],

  settings: {
    // component settings metadata
  }
}
```

A package may expose component discovery through a module or package definition:

```ts
export const packageDefinition = {
  components: [...],
  templates: [...],
  services: [...]
};
```

The complete component list should not have to be hard-coded centrally.

The Page Builder should query the Component Registry:

> What components are currently available?

It should not need to understand npm package details.

---

# 10. Registry Separation

The following should remain separate concepts:

```text
Package Registry
@uib/uib-base
     │
     ├──────── Component Registry
     │           Button
     │           Card
     │           Grid
     │
     └──────── Settings Registry
                 theme
                 animation
                 responsiveBreakpoints
```

Recommended registries include:

- Package Registry
- Component Registry
- Template Registry
- Settings Registry
- Service Registry
- Route Registry
- Admin Extension Registry
- Job Registry

This prevents package management from becoming tightly coupled to the Page Builder or runtime.

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

# 18. Package Update Policies

Package auto-update should support more than a Boolean value.

Recommended policies:

- `manual`
- `patch`
- `minor`
- `latest`
- `pinned`

Example:

```json
{
  "@uib/uib-base": {
    "version": "2.4.1",
    "updatePolicy": "minor"
  }
}
```

Meaning:

> Automatically upgrade within the current major version, but do not automatically cross into a new major version.

Recommended default:

```text
Auto Minor
```

Major-version updates should normally require administrator approval.

---

# 19. Update Channels

Packages should support optional release channels.

Recommended channels:

```text
stable
preview
beta
development
```

Example:

```json
{
  "channel": "stable",
  "updatePolicy": "minor"
}
```

A package may expose:

```text
uib-base
 ├─ stable       2.8.4
 ├─ preview      2.9.0-rc.2
 └─ development  3.0.0-dev.41
```

This is especially useful during UIB platform development.

---

# 20. Update Policy Scope

For now:

- Platform/package-level update policy is authoritative.
- Application administrators do not override update policy.
- Applications do not independently pin different package versions.

A useful hierarchy is:

```text
Platform Package Policy
        ↓
Package-specific Policy
        ↓
Installed Version
```

Example:

```text
Global policy:
Auto Minor
```

Package-specific overrides may exist:

```text
uib-base:
Auto Patch

uib-forms:
Auto Minor

uib-auth:
Manual
```

These overrides remain platform-level.

---

# 21. Controlled Package Activation

Installing an update should not immediately modify a running application.

UIB should distinguish:

```text
Installed Version: 2.6.0
Active Version:    2.5.2
```

The Admin UI may display:

> Update installed. Activation required.

Activation should occur during a controlled restart, reload, or rebuild.

This creates a safer deployment model.

---

# 22. Package Update Safety

Before an automatic update, UIB should:

```text
1. Record current installed and active versions.
2. Snapshot package/application settings.
3. Create or verify an application backup as required.
4. Check dependency compatibility.
5. Check platform compatibility.
6. Install the new version.
7. Run package health checks.
8. Run package migration hooks if required.
9. Activate the update in a controlled way.
10. Verify startup/runtime health.
11. Roll back automatically if activation or startup fails.
12. Record the entire operation in package history.
```

---

# 23. Package Update History

Admin should expose package update history.

Example:

```text
Sep 3
uib-base
2.4.1 → 2.5.0
Automatic update
Success

Aug 18
uib-forms
1.7.2 → 1.8.0
Administrator initiated
Success
```

History should include:

- date/time;
- package;
- old version;
- new version;
- initiating actor or automation;
- update channel;
- update policy;
- success/failure;
- rollback information;
- health-check results;
- migration results.

---

# 24. Package Health

Admin should provide clear package health states.

Example:

```text
● Healthy
▲ Update available
▲ Deprecated component used
● Disabled
✖ Missing dependency
✖ Version conflict
✖ Incompatible with Platform
✖ Migration failed
✖ Activation failed
```

Example conflict:

```text
@uib/forms 3.0 requires
@uib/uib-base >=3.0

Platform currently uses
@uib/uib-base 2.6.4
```

Health should be accessible through the Admin UI, CLI, and HTTP API.

---

# 25. Package Usage Analysis

Before uninstalling, disabling, or making a breaking update, UIB should be able to answer:

> What is using this package?

Example:

```text
uib-base is currently used by:

Reservations
    17 Button components
    6 Card components
    2 Grid components

Forms
    8 Button components
    3 Modal components
```

Package usage analysis should include:

- applications;
- pages;
- component instances;
- templates;
- routes;
- settings;
- services;
- admin extensions;
- jobs;
- data stores;
- dependent packages.

Uninstall should be blocked until required dependencies are resolved.

---

# 26. Package Detail Admin View

Admin → Packages should provide a clean package summary.

Example:

```text
Calendar Package

Version       3.2.0
Status        Healthy
Installed For Reservations
Updates       Automatic Minor

Components    4
Admin Pages   1
Server        Yes
```

Advanced information should be collapsible.

Recommended controls:

```text
▶ Dependencies (3)
▶ Used By (2)
▶ Components (4)
▶ Settings (12)
▶ Data Used / Written
▶ Server Routes
▶ CLI Commands
▶ Background Jobs
▶ Update History
▶ Health
▶ Permissions / Capabilities
```

Dependencies can remain hidden in an accordion by default.

Expanded dependency view:

```text
uib-base        2.5.1   Required
uib-icons       1.7.0   Required
uib-date        1.3.2   Required
```

---

# 27. Package Enable / Disable

A package should support disabling without uninstalling.

This is useful for troubleshooting, testing, and safe administration.

For now, individual components inside a package do not need their own enable/disable control.

The package itself may be enabled or disabled.

---

# 28. Admin as an Extensible Package-Driven System

The UIB Admin environment should itself use the package architecture.

Conceptually:

```text
Admin
│
├── Applications       @uib/admin-applications
├── Packages           @uib/admin-packages
├── Components         @uib/admin-components
├── Settings           @uib/admin-settings
├── Data               @uib/admin-data
├── Users              @uib/admin-users
├── Security           @uib/admin-security
└── Logs               @uib/admin-logging
```

Installed packages may contribute additional Admin pages:

```text
Calendar
Reservations
Forms
Authentication
```

A package should be able to provide a complete Admin page, not merely a settings form.

This supports future packages such as:

```text
@uib/database
@uib/auth
@uib/calendar
```

with their own administration experiences.

---

# 29. UIB Should Build Itself With Its Own Architecture

A guiding principle should be:

> The UIB Platform should build its own Admin experience using the same package, component, service, registry, routing, and settings architecture that it exposes to application developers.

This helps validate the abstractions early and reduces special-case platform code.

---

# 30. Settings as a First-Class Service

Settings should be implemented as an independent service package.

Recommended conceptual package:

```text
@uib/settings-service
```

It should own:

- schema registration;
- default values;
- scope resolution;
- inheritance;
- validation;
- storage access;
- change events;
- security;
- API integration;
- CLI integration.

The settings service should not require the Admin UI.

Admin UI may be provided separately:

```text
@uib/admin-settings
```

---

# 31. Settings Metadata

Packages should define settings metadata so UIB can automatically generate administration interfaces.

Instead of only storing:

```json
{
  "allowRegistration": true
}
```

the package may define:

```json
{
  "name": "allowRegistration",
  "label": "Allow User Registration",
  "description": "Allow visitors to create an account.",
  "type": "boolean",
  "default": false,
  "category": "Security",
  "scope": "application",
  "requiresRestart": false
}
```

This separates developer-defined capabilities from administrator-controlled behavior.

---

# 32. Settings Storage

Package-defined defaults and schemas belong with the package.

Actual configured values belong to the application or appropriate settings scope.

Example:

```text
apps/
  reservations/
    app.settings.json
```

Example:

```json
{
  "application": {
    "name": "Reservations"
  },

  "packages": {
    "@uib/uib-base": {
      "theme": "modern",
      "animations": true
    },

    "@uib/forms": {
      "validationMode": "onBlur"
    }
  }
}
```

The package itself may define:

```json
{
  "theme": {
    "type": "select",
    "label": "Theme",
    "options": [
      "modern",
      "classic",
      "minimal"
    ],
    "default": "modern"
  }
}
```

The Admin UI can then be generated automatically.

---

# 33. Settings Scopes

UIB should formalize settings scopes.

Recommended scopes:

```text
platform
workspace
application
page
component
user
session
```

Not every package needs every scope.

A setting can declare which scopes are legal.

Example:

```json
{
  "name": "animations",
  "type": "boolean",
  "scope": [
    "application",
    "page"
  ]
}
```

An application may define:

```text
Animations = ON
```

while a particular page overrides:

```text
Animations = OFF
```

---

# 34. Settings Resolution and Inheritance

Recommended resolution order:

```text
package default
       ↓
platform setting
       ↓
workspace setting
       ↓
application setting
       ↓
page setting
       ↓
component instance setting
       ↓
runtime override
```

Example:

```text
Default Button Color = blue
Application Button Color = green
Page Button Color = purple
```

A button on that page resolves to:

```text
purple
```

unless the component instance or runtime context provides another override.

This is intentionally similar to a cascade model.

---

# 35. How Settings Are Passed Around

Components should not call the CLI.

Components should not make arbitrary HTTP calls just to fetch settings.

Instead, the platform should expose one shared Settings Service.

Conceptually:

```text
                ┌─────────────────────┐
                │ Settings Repository │
                └──────────┬──────────┘
                           │
                    Settings Service
                           │
             ┌─────────────┼─────────────┐
             │             │             │
           CLI          HTTP API      Runtime
             │             │             │
         developers       admin       components
```

The CLI, HTTP API, Admin UI, server-side packages, and runtime all use the same settings logic.

---

# 36. Runtime Settings Consumption

Components should normally receive already-resolved settings.

A component should not need to know:

- where the setting was stored;
- which scope supplied it;
- whether it came from JSON;
- whether it came from a database;
- whether it was overridden;
- whether it came through HTTP.

Example:

```tsx
const settings =
  useComponentSettings("@uib/uib-base", "Button");
```

Possible result:

```json
{
  "variant": "primary",
  "size": "medium",
  "rounded": true
}
```

The Settings Service performs inheritance and resolution.

---

# 37. Settings Service Contract Example

Conceptual interface:

```ts
interface SettingsService {
  get(scope, key): Promise<unknown>;
  set(scope, key, value): Promise<void>;
  resolve(context): Promise<ResolvedSettings>;
  subscribe(listener): Unsubscribe;
}
```

The exact implementation may evolve.

Settings could initially be backed by:

```text
app.settings.json
```

and later by:

```text
database
distributed configuration service
cloud service
```

without changing package consumers.

---

# 38. Event Service

UIB should provide an internal Event Service.

Settings should not require constant polling.

When an administrator changes a setting, the Settings Service may emit:

```text
settings.changed
```

Example payload:

```ts
{
  scope: "application",
  appId: "...",
  package: "@uib/uib-base",
  key: "theme",
  oldValue: "classic",
  newValue: "modern"
}
```

Useful platform events may include:

```text
package.installed
package.updated
package.activated
package.disabled
package.uninstalled

settings.changed

app.created
app.started
app.stopped

component.registered
component.removed

job.registered
job.started
job.completed
job.failed
```

Packages should subscribe through the Event Service rather than directly coupling to one another.

---

# 39. Data Access

Packages may write runtime data.

However:

> No package should directly access the file system.

Packages should use the Data Service.

Example:

```ts
const events = data.open("events");
```

rather than:

```ts
fs.writeFile(...);
```

Application-specific data should remain logically within the application's data area.

Conceptually:

```text
apps/
  reservations/
    data/
      calendar/
      forms/
      reservations/
```

The Data Service may map logical stores to JSON, JSONL, a database, or another persistence mechanism.

Packages should not depend on the physical persistence implementation.

---

# 40. Data Transparency in Admin

Administrators should be able to see what data a package intends to read, write, own, or manage.

Package metadata should declare expected data use.

Example:

```json
{
  "data": {
    "stores": [
      {
        "name": "events",
        "purpose": "Stores calendar events",
        "access": "read-write",
        "scope": "application",
        "retention": "application-managed"
      }
    ]
  }
}
```

Admin should expose a section such as:

```text
▶ Data Used / Written
```

Possible display:

```text
Calendar Package

Store: events
Purpose: Calendar events
Scope: Application
Access: Read / Write
Owner: @uib/calendar

Store: calendar-sync-state
Purpose: External calendar synchronization state
Scope: Application
Access: Read / Write
Owner: @uib/calendar
```

This is important so an administrator can understand what installing or uninstalling a package may affect.

---

# 41. Resource Ownership

Resources created by a package should record package ownership metadata where appropriate.

Example:

```text
ownerPackage = @uib/calendar
```

Ownership should be available for:

- data stores;
- routes;
- settings;
- admin pages;
- components;
- jobs;
- migrations;
- generated assets;
- registered services.

This improves:

- uninstall safety;
- migration safety;
- troubleshooting;
- auditing;
- health checks;
- usage analysis.

---

# 42. Server-Side Functionality

Packages may provide server-side functionality.

However, packages should not start their own independent HTTP servers.

Packages should register routes through the UIB Routing / Server Service.

Example:

```ts
router.register({
  method: "GET",
  path: "/events",
  handler: ...
});
```

This allows the platform to centralize:

- authentication;
- authorization;
- logging;
- error handling;
- route ownership;
- middleware;
- rate controls;
- auditing;
- application routing.

---

# 43. CLI Extensibility

Packages should be allowed to expose CLI commands.

Example:

```bash
uib calendar import events.csv
uib forms export responses
```

Packages should register commands with the CLI service or command registry.

They should not modify UIB core CLI source code.

---

# 44. Core Package CLI

Recommended package commands:

```bash
uib package list

uib package search

uib package info @uib/uib-base

uib package install @uib/uib-base

uib package update @uib/uib-base

uib package remove @uib/uib-base

uib package update --all

uib package check
```

Development linking:

```bash
uib package dev ../uib-base
```

This should support local package development without requiring normal publishing for every development iteration.

---

# 45. Settings CLI

Recommended settings commands:

```bash
uib settings list

uib settings get reservations

uib settings get reservations @uib/uib-base

uib settings set reservations \
  @uib/uib-base.animations=false
```

The CLI must call the same Settings Service used by the Admin UI and runtime.

The CLI is an interface, not the source of business logic.

---

# 46. HTTP API

The Admin frontend should use HTTP APIs that call the same underlying services.

Conceptual package API:

```http
GET    /api/packages
GET    /api/packages/:package
POST   /api/packages/install
POST   /api/packages/:package/update
POST   /api/packages/:package/activate
DELETE /api/packages/:package
```

Conceptual settings API:

```http
GET    /api/apps/:appId/settings
PATCH  /api/apps/:appId/settings
```

Conceptual health API:

```http
GET    /api/packages/:package/health
```

The HTTP API should not duplicate business logic.

---

# 47. Shared Service Layer

The Admin UI, CLI, HTTP API, application runtime, and server packages should all use shared services.

Conceptually:

```text
                    Core Services
                         │
     ┌───────────────────┼───────────────────┐
     │                   │                   │
  Admin UI             CLI               HTTP API
     │                   │                   │
     └───────────────────┼───────────────────┘
                         │
                  Application Runtime
```

Examples of shared services:

```text
PackageManager
SettingsService
ComponentRegistry
TemplateRegistry
DependencyResolver
UpdateManager
DataService
EventService
LoggingService
HealthService
BackupService
JobService
```

---

# 48. Package Lifecycle Hooks

Packages should support formal lifecycle hooks.

Recommended hooks:

```ts
install()
upgrade(oldVersion, newVersion)
activate()
deactivate()
uninstall()
start()
stop()
```

The upgrade hook is especially important for settings/data migrations.

Example:

```text
Calendar 2 → Calendar 3

old:
event.startDate

new:
event.start
event.timeZone
```

The package needs a formal migration point.

Lifecycle hooks should run through controlled platform services with logging and error handling.

---

# 49. Background Jobs / Scheduler

Packages may need scheduled or background jobs.

Examples:

```text
Calendar:
sync external calendars every hour

Reservations:
expire abandoned reservations

Forms:
purge temporary uploads
```

The exact schedule is likely to vary by application.

For now, the architecture should expect and support per-application job configuration without requiring the full scheduler feature to be implemented immediately.

Packages should register jobs through a Job / Scheduler Service.

Packages should not create unmanaged timers.

---

# 50. Logging

Every package should automatically have access to platform logging.

Example:

```ts
const log = services.logger.forPackage("@uib/calendar");

log.info(...);
log.warn(...);
log.error(...);
```

Admin should eventually support log filtering by:

```text
Application
Package
Severity
Date
Request / Correlation ID
```

Logging is especially important for:

- installation;
- updates;
- migration;
- activation;
- server routes;
- jobs;
- health checks;
- data access failures.

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

# 52. Admin Package Settings

Recommended platform-level settings related to packages:

1. Automatic package updates — Off / Patch / Minor / Latest
2. Update channel — Stable / Preview / Beta / Development
3. Check for package updates — startup / daily / weekly / manual
4. Automatically install dependencies
5. Automatically roll back failed updates
6. Allow prerelease packages
7. Approved package registries
8. Allow third-party packages
9. Require signed/trusted packages
10. Package update notifications
11. Development package linking
12. Settings inheritance
13. Application override permissions
14. Package compatibility enforcement
15. Package health checks
16. Unused-package detection
17. Deprecated-component warnings
18. Backup before updates
19. Package audit/history retention
20. Package disable without uninstalling

For now, third-party package support may remain disabled or deferred even though the underlying metadata should support it.

---

# 53. Admin Settings Categories Inspired by Salesforce

The UIB Admin experience should separate settings by purpose.

Recommended broad categories:

## Security & Access

- Users
- Roles
- Permission Sets
- Sharing
- Authentication
- Session settings

## Data Model

- Objects
- Fields
- Relationships
- Record types
- Validation
- Picklists

## User Interface

- Applications
- Pages
- Templates
- Components
- Navigation
- Page layouts

## Business Behavior

- Actions
- Events
- Flows / automation
- Queues
- Notifications
- Package configuration

## System

- Packages
- Logging
- Backups
- Updates
- Health
- Platform settings

This organization can evolve while preserving a consistent metadata-driven Admin model.

---

# 54. Package-Supplied Admin Settings

Installed packages should be able to contribute settings categories dynamically.

Example:

```text
Admin
├── Applications
├── Pages
├── Packages
├── Security
├── Users
├── Data
└── Settings
     ├── Platform
     ├── uib-base
     ├── Forms
     └── Calendar
```

Installing:

```text
@uib/calendar
```

may automatically cause:

```text
Admin → Settings → Calendar
```

to appear.

No UIB Platform source-code change should be required.

---

# 55. Package-Supplied Admin Pages

Packages should be allowed to provide full Admin pages, not only generated settings forms.

Examples:

```text
@uib/calendar
  → Calendar Administration

@uib/database
  → Database Administration

@uib/auth
  → Authentication Administration
```

Admin extension pages should be registered through the Admin Extension Registry.

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

# 58. Data Location and Application Ownership

Application runtime data should remain application-specific.

Conceptually:

```text
apps/
  reservations/
    data/
      calendar/
      forms/
      reservations/
```

Packages interact with this through the Data Service.

The Data Service should preserve logical ownership and separation while allowing the physical implementation to evolve.

This is consistent with the broader UIB approach that application-specific runtime data belongs to the application rather than being centrally owned by the ORM.

---

# 59. Backups and Rollback

Package installation, updates, and migrations should integrate with application history and backup/restore.

Before risky operations, the platform should be able to capture:

- package versions;
- active versions;
- settings;
- package-owned data metadata;
- application state necessary for rollback.

Rollback should restore a known-good state when activation, migration, or startup fails.

---

# 60. Package Audit Trail

Package changes should be auditable.

Recommended events include:

```text
installed
updated
activated
deactivated
disabled
enabled
rolled back
uninstalled
migration started
migration completed
migration failed
dependency added
dependency removed
setting changed
```

Audit records should contain:

- timestamp;
- application where applicable;
- package;
- actor;
- action;
- previous state;
- new state;
- result;
- relevant error or health information.

---

# 61. Package Data Disclosure

Because packages may write application data, the administrator should always be able to answer:

> What data will this package create or modify?

Before installation, Admin should ideally show:

```text
This package requests:

Data
  ✓ Read application-scoped calendar data
  ✓ Write application-scoped calendar data

Routes
  ✓ Register 4 server routes

Jobs
  ✓ Register 1 scheduled job

Admin
  ✓ Add 1 administration page

Settings
  ✓ Register 12 settings

Components
  ✓ Register 4 components
```

This becomes even more important when third-party packages are introduced.

---

# 62. No Direct File-System Access

This is a confirmed architectural rule.

> No package should directly access the file system.

All persistent data access should flow through approved UIB services such as:

- Data Service
- File Service
- Settings Service
- Backup Service

This enables:

- permissions;
- auditing;
- portability;
- safer exports;
- future alternate persistence backends;
- cloud deployment;
- testing;
- package isolation.

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

# 64. Recommended Admin Package Page Structure

A package detail page could be organized as:

```text
Package Header
  Name
  Icon
  Description
  Publisher
  Installed Version
  Active Version
  Latest Version
  Channel
  Update Policy
  Health

Actions
  Update
  Activate
  Disable
  Enable
  Uninstall
  Roll Back

Sections
  Overview
  Components
  Settings
  Admin Pages
  Server Routes
  Services
  Data Used / Written
  Jobs
  CLI Commands
  Dependencies
  Used By
  Health
  History
```

Dependencies and other advanced information should use accordions to keep the normal view uncluttered.

---

# 65. Package Status Model

Recommended package status information:

```text
Available
Installed
Pending Activation
Active
Disabled
Update Available
Health Warning
Failed
Rollback Available
Deprecated
```

A package may have more than one status dimension.

Example:

```text
Installation: Installed
Activation: Active
Health: Warning
Update: Available
```

This is preferable to forcing every state into one status value.

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

# 67. Deferred / Future Capabilities

The following should be considered future-compatible:

- per-application package version isolation;
- third-party package publishing;
- signed packages;
- package trust scoring;
- fine-grained package capability permission approval;
- package sandboxing;
- remote package repositories;
- cloud-hosted settings;
- distributed settings;
- alternate Data Service implementations;
- per-component enable/disable;
- application-specific package update policies;
- package marketplace reviews and ratings;
- package certification.

---

# 68. Remaining Open Questions

The major architectural direction is now largely decided. The following items can remain open until implementation gets closer.

## 68.1 Package installation storage model

Should a package that is only used by one application still be physically installed once in a shared workspace package location, with application enablement metadata pointing to it?

**Current recommendation:** Yes, while the platform supports one version of each package.

This avoids duplicate package files and preserves the one-version-for-now decision.

---

## 68.2 Package data uninstall policy

When a package is uninstalled, what should happen to package-owned data?

Potential policies:

```text
Keep data
Archive data
Delete data after explicit confirmation
Package-defined migration/export
```

**Recommendation:** Never silently delete package-owned application data.

Admin should clearly show the affected stores and require an explicit data-retention decision where deletion is possible.

---

## 68.3 Package migration failure behavior

If a package update installs successfully but its data migration fails:

**Recommendation:** Do not activate the new version. Preserve the previous active version, log the failure, and make rollback/retry available.

---

## 68.4 Package route naming

Package server routes should probably be namespaced by application and/or package to avoid collisions.

Example conceptual pattern:

```text
/api/apps/:appId/packages/:packageName/...
```

or a registered logical namespace resolved by the Router Service.

The exact public URL convention can be decided later.

---

## 68.5 Package job configuration

Jobs are expected to vary by application.

The package should define:

- job type;
- default schedule;
- configuration schema;
- whether the job is optional;
- required services.

The application should own the actual configured schedule and enabled state.

Exact scheduling UI and persistence can be defined when the Job Service is implemented.

---

# 69. Confirmed Design Decisions

The following are confirmed decisions from the current design discussion.

- Packages may be installed for the platform and used by one or many applications.
- A package may be used by only a single application.
- Different applications will not use different versions of the same package at this time.
- A separate package catalog/repository service should exist independently.
- Third-party packages should be supported by the architecture, but full support can wait until needed.
- Packages may provide server-side functionality.
- Application administrators will not override platform package update policy at this time.
- Package updates should use controlled activation rather than immediately changing running applications.
- Individual component enable/disable is not needed at this time.
- Direct and dependency packages should both be visible, with dependency details collapsible in an accordion.
- Packages may provide full Admin pages.
- Separate focused service packages are preferred.
- Packages may write runtime application data.
- Administrators must be able to see what data packages intend to read/write/manage.
- Packages should define server routes through the UIB Router/Server Service.
- Packages may expose CLI commands.
- Important UIB services should use formal versioned service contracts.
- Resources should record package ownership where appropriate.
- Packages should have lifecycle hooks.
- Job/scheduler support should be designed in now, with per-application behavior expected.
- Every package should receive platform logging.
- No package should directly access the file system.
- The Admin UI, CLI, HTTP API, and runtime should share common service/business logic.
- `uib-base` should be treated as a first-class UIB package.
- A package may contain one component or many components.
- UIB should build its own Admin experience using the same extensibility model exposed to applications.

---

# 70. Recommended Next Architecture Documents

This document should serve as the umbrella architecture for package/service/settings administration.

The next useful specifications would be:

1. **UIB Package Manifest Specification**
   - complete JSON schema;
   - required vs optional fields;
   - capabilities;
   - dependencies;
   - service contracts;
   - settings;
   - data declarations;
   - lifecycle hooks;
   - admin extensions;
   - routes;
   - jobs.

2. **UIB Service Contract Specification**
   - Service Registry;
   - service lookup;
   - service lifecycle;
   - interface versioning;
   - errors;
   - dependency injection;
   - testing/mocking.

3. **UIB Settings Specification**
   - scope;
   - inheritance;
   - schema format;
   - validation;
   - storage;
   - secret settings;
   - runtime resolution;
   - events;
   - CLI;
   - HTTP API.

4. **UIB Package Manager Specification**
   - catalog;
   - install;
   - dependencies;
   - update policies;
   - channels;
   - activation;
   - rollback;
   - health;
   - audit history.

5. **UIB Data Service Specification**
   - logical stores;
   - package ownership;
   - read/write declarations;
   - JSON/JSONL adapters;
   - ORM adapters;
   - transactions;
   - backup;
   - retention;
   - uninstall behavior.

6. **UIB Admin Extension Specification**
   - generated settings pages;
   - full Admin pages;
   - navigation contribution;
   - permissions;
   - package status UI;
   - health UI;
   - dependency accordion;
   - data disclosure UI.

7. **UIB Job / Scheduler Specification**
   - package job declarations;
   - per-application schedules;
   - enable/disable;
   - job ownership;
   - logging;
   - retries;
   - execution history.

---

# 71. Final Architectural Direction

The emerging UIB architecture can be summarized as:

```text
Applications
     │
     ├── use Components
     ├── use Services
     ├── own Settings
     └── own Runtime Data
             │
             ▼
        UIB Service Layer
             │
     ┌───────┼────────┐
     │       │        │
 Settings   Data    Events
 Packages   Logs    Routing
 Jobs       Health  Backup
     │       │        │
     └───────┼────────┘
             │
        Service Registry
             │
             ▼
          Packages
     ┌───────┼──────────┐
     │       │          │
 Components Admin     Server
 Settings   Jobs      Routes
 Data       CLI       Services
```

The most important architectural constraint is:

> **Packages participate in the platform through declared metadata and versioned UIB service contracts. They do not directly manipulate platform internals or the file system.**

This allows UIB to support reusable components, modular services, safe package management, application-specific configuration, server-side capabilities, package-owned runtime data, future third-party extensions, and independent application export without tightly coupling every feature to the platform core.

---

# Appendix A — Conversation-Derived Decision Record

This appendix preserves the substantive design conversation that produced this architecture. It is intentionally more repetitive than the main guide. The repetition is a safeguard: if the main architecture is reorganized later, the original intent and accepted recommendations remain traceable.

## A.1 Salesforce-inspired administration discussion

### Initial request

The administration discussion began by identifying the types of Salesforce settings administrators most often configure.

The areas identified as especially relevant were:

1. Users
2. Permission Sets
3. Permission Set Groups
4. Profiles
5. Roles / Role Hierarchy
6. Sharing Settings
7. Objects & Fields
8. Page Layouts
9. Lightning Record Pages
10. Record Types
11. Flows
12. Validation Rules
13. Picklist Values
14. Queues
15. Public Groups
16. Email / Deliverability Settings
17. Apps / App Manager
18. Login & Session Settings
19. Reports & Dashboards
20. Custom Settings / Custom Metadata

The discussion grouped these into broader administration domains:

```text
Security & access
Data model
User interface
Business behavior
System
```

### Architecture conclusion

**ACCEPTED RECOMMENDATION:** UIB settings should not be modeled merely as raw key/value pairs. Packages should be able to publish settings metadata that describes:

- name;
- label;
- description;
- type;
- default;
- category;
- scope;
- whether restart/reload is required;
- valid options and validation rules.

UIB can then generate appropriate Admin UI automatically.

The guiding idea accepted from this discussion is:

> Developers define capabilities and metadata; administrators configure behavior without editing source code.

---

## A.2 Component packages and package administration

### User requirement

The platform needs a way to add component packages such as `uib-base`.

A package must be able to represent:

- one component; or
- many components.

The package concept should be reusable and leveraged throughout the platform rather than being special-cased for a single library.

### Proposed package capabilities

The package model was expanded beyond component libraries. A package may contribute:

```text
Components
Templates
Pages
Routes
Settings
Admin pages
Services
Data providers
Actions
Events
Validators
Themes
Icons
CLI commands
Server middleware
Server handlers
Background jobs
Assets
Migrations
```

**CONFIRMED:** Packages may contain one or many components.

**CONFIRMED:** Packages may provide server-side functionality.

**CONFIRMED:** Packages may provide complete Admin pages in addition to generated settings pages.

---

## A.3 Package manifest and metadata

A UIB-aware package manifest was proposed in addition to normal npm metadata.

The manifest may describe:

- package name;
- display name;
- description;
- icon;
- version;
- UIB package type;
- components;
- templates;
- services;
- server capabilities;
- Admin extensions;
- settings schema;
- platform compatibility;
- required service contracts;
- UIB package dependencies;
- capabilities;
- data stores;
- jobs;
- lifecycle hooks.

The complete component inventory does not need to be centrally hard-coded. Packages may expose discovery metadata/modules.

**ACCEPTED RECOMMENDATION:** The Page Builder should discover components through a Component Registry instead of understanding npm/package implementation details.

---

## A.4 Platform installation and per-application use

A question was raised whether packages should be installable globally, per application, or both.

### User decision

> Both. It may be likely that a package is only installed for a single application.

**CONFIRMED:** UIB must support both platform availability/installation and application-specific use.

The resulting conceptual model is:

```text
AVAILABLE TO PLATFORM
        ↓
INSTALLED / ENABLED FOR APPLICATION
```

A package may therefore be relevant to only one application even if the physical package implementation is managed by the platform.

---

## A.5 Package version isolation

A question was raised whether separate applications should be able to use different versions of the same package.

### User decision

> No, not at this time.

**CONFIRMED:** UIB initially uses one platform version of each package.

Example:

```text
@uib/uib-base = 2.5.1
```

All applications using it use the same platform version.

**DEFERRED:** Per-application version isolation may be considered later.

---

## A.6 Package catalog / repository

A separate UIB package catalog/repository was proposed, layered over npm or another package source.

### User decision

> Sure, a separate service package that is independent.

**CONFIRMED:** Package catalog/repository capability should be an independent service package.

The catalog should answer:

- what packages exist;
- what versions exist;
- what they provide;
- what they require;
- who published them;
- compatibility;
- release/update channels;
- application usage.

---

## A.7 Third-party packages

A question was raised whether outside developers should eventually be able to create UIB packages.

### User decision

> Yes, but I would hold off until we need them.

**CONFIRMED:** Architecture should support third-party packages.

**DEFERRED:** Full marketplace/publishing/trust workflows are not required initially.

The manifest and capability model should nevertheless avoid blocking future:

- package signing;
- trust policies;
- permission approval;
- certification;
- marketplace publishing;
- sandboxing.

---

## A.8 Server-side package functionality

A question was raised whether packages should initially be UI-only.

### User decision

> Server side also.

**CONFIRMED:** Packages may include server-side functionality.

**ACCEPTED RECOMMENDATION:** Packages should not launch independent HTTP servers. Routes should be registered through the UIB Router/Server Service so authentication, authorization, logging, errors, auditing, and route ownership remain centralized.

Conceptual registration:

```ts
router.register({
  method: "GET",
  path: "/events",
  handler: ...
});
```

---

## A.9 Package update policy overrides

A question was raised whether an individual application should be able to override platform update policy.

### User decision

> Not at this time.

**CONFIRMED:** Package update policy is platform/package controlled initially.

Applications do not independently choose another version or update policy.

---

## A.10 Controlled package activation

A question was raised whether applications should receive a newly installed version immediately or only after a controlled restart/rebuild.

### User decision

> As recommended.

**ACCEPTED RECOMMENDATION:** Installing an update and activating an update should be separate concepts.

Example:

```text
Installed Version: 2.6.0
Active Version:    2.5.2
```

An update may be downloaded/installed and then activated through a controlled restart, reload, or rebuild.

---

## A.11 Individual component enable/disable

A question was raised whether components inside a package should be individually enabled or disabled.

### User decision

> Not at this time.

**CONFIRMED:** Package-level enable/disable is sufficient initially.

**DEFERRED:** Per-component enable/disable.

---

## A.12 Direct vs transitive dependencies in Admin

A question was raised whether Admin should show only directly installed packages or also dependency packages.

### User decision

> Both, the dependencies can be hidden within a control like an accordion.

**CONFIRMED:** Admin should show direct and transitive dependencies.

Dependency detail should be collapsible to keep the default view uncluttered.

Recommended labels:

```text
Direct
Dependency
Direct + Dependency
```

---

## A.13 Package-provided Admin pages

A question was raised whether packages should provide full Admin pages rather than only settings metadata.

### User decision

> Yes.

**CONFIRMED:** Packages may contribute complete Admin pages and navigation entries.

This enables modules such as Calendar, Authentication, Data, or Reservations to provide purpose-built administration experiences.

---

## A.14 Separate focused service packages

The discussion moved toward separating platform capabilities into focused services.

### User direction

> I like to take your recommendation of creating different packages for the different services.

**CONFIRMED:** UIB should prefer focused service packages rather than a monolithic core.

Representative structure:

```text
@uib/settings-service
@uib/package-service
@uib/data-service
@uib/event-service
@uib/logging-service
@uib/router-service
@uib/job-service
@uib/auth-service
```

Admin UI packages may be separated from headless service packages:

```text
@uib/settings-service
@uib/admin-settings

@uib/package-service
@uib/admin-packages

@uib/data-service
@uib/admin-data
```

---

## A.15 Package Service internal decomposition

The Package Service was proposed as multiple focused responsibilities:

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

These are internal responsibilities and need not appear as separate user-facing products.

**ACCEPTED RECOMMENDATION:** Preserve these concerns separately so package management does not become a single tightly coupled implementation.

---

## A.16 Service Registry

A Service Registry was proposed to allow packages to consume capabilities by versioned contract.

Conceptually:

```text
Service Registry
│
├── settings
├── packages
├── logging
├── events
├── data
├── authentication
├── routing
├── jobs
└── files
```

**ACCEPTED RECOMMENDATION:** Packages should request platform capabilities through the Service Registry rather than importing another package's private implementation.

---

## A.17 Versioned service contracts

A question was raised whether services should provide formal versioned interfaces.

### User decision

> Yes, as recommended.

**CONFIRMED:** Important UIB services should expose versioned service contracts.

Examples:

```text
Settings Service Contract v1
Data Service Contract v1
Event Service Contract v1
Logging Service Contract v1
Routing Service Contract v1
Job Service Contract v1
```

A package may require a compatible contract instead of depending on a private implementation.

---

## A.18 Settings Service

The Settings Service was separated from Admin UI.

It should own:

- schema registration;
- defaults;
- storage abstraction;
- scope resolution;
- inheritance;
- validation;
- security;
- change events;
- API access;
- CLI access.

**ACCEPTED RECOMMENDATION:** Components should normally receive resolved settings rather than fetching them via CLI or arbitrary HTTP calls.

The Admin UI, CLI, HTTP API, server packages, and runtime all use the same Settings Service business logic.

---

## A.19 Settings transport: CLI, HTTP, and runtime

The user asked whether settings would be passed around using CLI or HTTP calls.

The accepted model is not to make CLI or HTTP the core settings mechanism.

Instead:

```text
                Settings Repository
                        │
                 Settings Service
                        │
          ┌─────────────┼─────────────┐
          │             │             │
         CLI          HTTP API      Runtime
```

**CONFIRMED DESIGN DIRECTION:** CLI and HTTP are interfaces/adapters into shared services.

They do not own duplicated settings logic.

Runtime components should access resolved settings through a provider/hook/service abstraction.

---

## A.20 Settings scopes

Settings scopes discussed:

```text
platform
workspace
application
page
component
user
session
```

**ACCEPTED RECOMMENDATION:** A setting should declare which scopes it supports.

Recommended inheritance:

```text
package default
       ↓
platform
       ↓
workspace
       ↓
application
       ↓
page
       ↓
component instance
       ↓
runtime override
```

The application owns configured values at its applicable scope, while the package owns schema/default metadata.

---

## A.21 Event Service

The Event Service was proposed so settings and package state changes do not require polling.

Representative events:

```text
package.installed
package.updated
package.activated
package.disabled
package.uninstalled

settings.changed

app.created
app.started
app.stopped

component.registered
component.removed

job.registered
job.started
job.completed
job.failed
```

**ACCEPTED RECOMMENDATION:** Packages communicate through platform events rather than direct package-to-package coupling when event-driven communication is appropriate.

---

## A.22 Package data access

A question was raised whether packages should be allowed to store runtime data.

### User decision

> Yes. I do want to know what data they would be writing.

**CONFIRMED:** Packages may persist runtime data.

**CONFIRMED:** Administrators must be able to see what data a package expects to read, write, own, or manage.

Package metadata should therefore declare expected logical data stores, purpose, scope, and access.

Example:

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

---

## A.23 No direct file-system access

The user explicitly confirmed:

> I agree, no package should directly access the file system.

**CONFIRMED — ARCHITECTURAL RULE:** No package should directly access the operating-system file system.

Persistent access should go through approved platform services such as:

```text
Data Service
File Service
Settings Service
Backup Service
```

This rule supports portability, auditing, permissions, alternate storage implementations, export, testing, and future cloud deployment.

---

## A.24 Data Service

Because packages may write data but may not directly access files, the Data Service becomes the normal persistence abstraction.

Example:

```ts
const events = data.open("events");
```

not:

```ts
fs.writeFile(...);
```

Application-specific runtime data remains logically owned by the application.

Conceptually:

```text
apps/
  reservations/
    data/
      calendar/
      forms/
      reservations/
```

The underlying physical implementation may be JSON, JSONL, an ORM/database adapter, or another backend.

---

## A.25 Resource ownership

A question was raised whether UIB should know which package created a resource.

### User decision

> Yes, as recommended.

**CONFIRMED:** Resources should carry package ownership metadata where appropriate.

Applicable resources include:

- logical data stores;
- routes;
- settings;
- Admin pages;
- components;
- jobs;
- migrations;
- services;
- generated assets.

This supports uninstall safety, migrations, usage analysis, troubleshooting, auditing, and health checks.

---

## A.26 CLI extension commands

A question was raised whether packages should be able to add CLI commands.

### User decision

> Yes, as recommended.

**CONFIRMED:** Packages may register CLI commands.

Examples:

```bash
uib calendar import events.csv
uib forms export responses
```

Packages extend the CLI through a command registry/service rather than modifying UIB core CLI source.

---

## A.27 Package lifecycle hooks

A question was raised whether packages should support lifecycle hooks.

### User decision

> Yes, as recommended.

**CONFIRMED:** Package lifecycle should include hooks such as:

```text
install
upgrade
activate
deactivate
uninstall
start
stop
```

The `upgrade(oldVersion, newVersion)` hook is especially important for settings/data migrations.

---

## A.28 Jobs / scheduler

A question was raised whether packages should be able to define scheduled/background jobs.

### User response

> This will likely be different per app. For now have an expectation and design it in.

**CONFIRMED:** The architecture should support package-declared jobs.

**DEFERRED IMPLEMENTATION:** The full Job/Scheduler Service need not be completed immediately.

**CONFIRMED DESIGN EXPECTATION:** Actual schedules and enabled states are likely application-specific.

Packages should declare job type/configuration and register jobs through a Job/Scheduler Service rather than creating unmanaged timers.

---

## A.29 Logging

A question was raised whether packages should automatically receive platform logging.

### User decision

> Yes, as recommended.

**CONFIRMED:** Every package should have access to scoped platform logging.

Conceptual API:

```ts
const log = services.logger.forPackage("@uib/calendar");
```

Admin should ultimately be able to filter logs by application, package, severity, date, and correlation/request identifiers.

---

## A.30 Auto-update requirements

The user explicitly requested a setting to automatically update installed packages to the latest applicable version depending on configuration.

The proposed update policies were:

```text
manual
patch
minor
latest
pinned
```

**ACCEPTED RECOMMENDATION:** Use semantic update policies rather than only `autoUpdate: true/false`.

Recommended normal default:

```text
minor
```

Major-version changes should generally require explicit administrator action.

---

## A.31 Update channels

Release channels proposed:

```text
stable
preview
beta
development
```

This lets development work track preview/development packages while ordinary applications remain on stable versions.

---

## A.32 Update safety and rollback

The accepted update flow includes:

```text
Record current versions
Snapshot settings
Backup relevant state
Resolve dependencies
Check compatibility
Install update
Run health checks
Run migrations
Controlled activation
Verify startup/runtime health
Rollback on failure
Record history
```

**ACCEPTED RECOMMENDATION:** Failed activation/startup should be capable of automatic rollback to a known-good version/state.

---

## A.33 Package health

The Admin experience should expose package health.

Representative states:

```text
Healthy
Update available
Deprecated component used
Disabled
Missing dependency
Version conflict
Incompatible with Platform
Migration failed
Activation failed
```

**ACCEPTED RECOMMENDATION:** Package health should be available through Admin, CLI, and HTTP/service interfaces.

---

## A.34 Package usage analysis

The platform should be able to answer:

> What will break if this package is removed or changed?

Usage may include:

```text
Applications
Pages
Component instances
Templates
Routes
Settings
Services
Admin extensions
Jobs
Data stores
Dependent packages
```

**ACCEPTED RECOMMENDATION:** Uninstall should be blocked while unresolved required dependencies remain.

---

## A.35 Package data disclosure in Admin

Because the user specifically wants visibility into package data writes, the package detail page should include a section such as:

```text
Data Used / Written
```

Before installation, a capability summary may show:

```text
Data
  Read application-scoped calendar data
  Write application-scoped calendar data

Routes
  Register server routes

Jobs
  Register scheduled jobs

Admin
  Add administration pages

Settings
  Register settings

Components
  Register components
```

This should later become especially important for third-party package trust and permissions.

---

## A.36 `uib-base`

The discussion used `uib-base` as the primary example of a component package.

**CONFIRMED DESIGN DIRECTION:** `@uib/uib-base` should be treated as a first-class UIB package, participating in:

- package discovery;
- dependency management;
- settings;
- metadata;
- component registration;
- update policy;
- activation;
- health;
- history;
- Admin display.

It should not be treated as an exceptional hard-coded library outside the package architecture.

---

## A.37 Admin built on the same architecture

The following principle was recommended and accepted as a design direction:

> UIB should build its own Admin environment using the same package/component/service/settings/registry architecture exposed to application developers.

Representative modular Admin packages:

```text
@uib/admin-applications
@uib/admin-packages
@uib/admin-components
@uib/admin-settings
@uib/admin-data
@uib/admin-users
@uib/admin-security
@uib/admin-logging
```

This provides a practical test of UIB's own extension model.

---

# Appendix B — Conversation Timeline

This is a compact chronological capture of the substantive exchanges. It is not intended to replace the architecture sections above; it exists to preserve context and intent.

## B.1 Administration inspiration

**User:** Asked for the top Salesforce settings administrators commonly change.

**Result:** The discussion identified Salesforce-style administration concepts and led to the recommendation that UIB use metadata-driven settings rather than simple raw values.

---

## B.2 Package management expansion

**User:** Requested support for adding component packages like `uib-base`, configurable automatic updates, better Admin package controls, and clarification on how settings should move through CLI/HTTP/runtime. Emphasized that the solution must support one or many reusable components.

**Result:** Package manifests, Package Admin, update policies, release channels, settings scopes, Settings Service, package dependencies, package health, package usage analysis, CLI/API interfaces, and registry separation were proposed.

---

## B.3 First package-design decision set

The following questions were asked and answered:

| Topic | User decision |
|---|---|
| Platform vs app package installation | **Both**; a package may be used by only one app |
| Different package versions per app | **No, not at this time** |
| Separate UIB package catalog/repository | **Yes**, independent service package |
| Third-party developers | **Yes eventually**, hold off until needed |
| Server-side package functionality | **Yes** |
| App override of platform update policy | **Not at this time** |
| Immediate vs controlled activation | **Controlled activation, as recommended** |
| Individual component enable/disable | **Not at this time** |
| Show transitive dependencies | **Yes**, collapsible/accordion |
| Package-provided full Admin pages | **Yes** |

The user also accepted the recommendation to use separate packages for different services.

---

## B.4 Service-oriented refinement

The architecture was refined around:

```text
Package Service
Settings Service
Data Service
Event Service
Logging Service
Router Service
Job Service
Service Registry
Admin extension packages
```

Additional questions were asked regarding package data, routes, CLI, versioned contracts, ownership, lifecycle, jobs, and logging.

---

## B.5 Second decision set

| Topic | User decision |
|---|---|
| Packages may store runtime data | **Yes**, but Admin must show what they write |
| Package HTTP endpoints | **Yes, through Router/Server Service** |
| Package CLI commands | **Yes** |
| Versioned service contracts | **Yes** |
| Track package ownership of resources | **Yes** |
| Lifecycle hooks | **Yes** |
| Scheduled/background jobs | **Design for it; likely app-specific; implementation can wait** |
| Automatic scoped logging | **Yes** |

The user then explicitly added:

> No package should directly access the file system.

That statement is preserved as a core architectural rule in this guide.

---

## B.6 Documentation decision

A comprehensive Markdown architecture specification was created.

The user then asked whether an Architecture Guide differs from Markdown because they did not want to lose anything from the conversation.

The distinction established was:

> **Markdown is the file format; Architecture Guide is the purpose and role of the artifact.**

The user requested that the document become a formal Architecture Guide and that the conversation be included to help ensure completeness.

This version implements that request by preserving:

- the complete prior architecture content;
- explicit decision statuses;
- a conversation-derived decision record;
- a chronological conversation timeline;
- deferred/open decisions;
- future-compatible capabilities;
- change-history guidance.

---

# Appendix C — Explicitly Deferred or Not-Yet-Implemented Items

The following items should not be mistaken for rejected ideas.

| Item | Current state |
|---|---|
| Different package versions per application | Deferred |
| Application-specific package update policy overrides | Deferred |
| Per-component enable/disable | Deferred |
| Full third-party package marketplace | Deferred |
| Package signing/trust enforcement | Future/deferred |
| Full scheduler implementation | Deferred, but architecture must support it |
| Per-app job schedules/configuration | Expected design requirement |
| Advanced package sandboxing | Future |
| Distributed/cloud Settings Service implementation | Future |
| Alternate physical Data Service backends | Future-compatible |
| Marketplace ratings/reviews/certification | Future |

---

# Appendix D — Documentation Change Log

## 2026-09-03 — Architecture Guide conversion

- Preserved the original comprehensive Package/Service/Settings/Admin architecture.
- Retitled the artifact as a canonical working Architecture Guide.
- Added document governance and preservation rules.
- Added decision-status definitions.
- Added a conversation-derived Decision Record.
- Added a chronological conversation timeline.
- Added an explicit deferred/future capability table.
- Preserved the rule that packages cannot directly access the file system.
- Preserved user decisions on package scope, versions, catalog, server support, update control, dependencies, Admin extensions, data visibility, routes, CLI, service contracts, ownership, lifecycle, jobs, and logging.

---

# Appendix E — Rule for Future Updates

When future conversations modify this architecture:

1. Update the relevant architecture section.
2. Add or update the corresponding Decision Record entry.
3. Mark the old decision as **SUPERSEDED** rather than deleting it when history matters.
4. Add the change to the Change Log.
5. Keep deferred decisions visible until explicitly resolved.
6. Do not remove conversation-derived requirements merely because implementation has not started.
7. Treat examples as illustrative unless the Decision Record explicitly marks them as required.

