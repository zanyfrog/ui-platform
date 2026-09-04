# UIB Settings Architecture

This document was split out of docs/architecture/UIB-Architecture-Guide.md on 2026-09-03. The Architecture Guide remains the authoritative umbrella document; this file preserves and organizes the detailed architecture content for this topic.

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

