# UIB Service Architecture

This document was split out of docs/architecture/UIB-Architecture-Guide.md on 2026-09-03. The Architecture Guide remains the authoritative umbrella document; this file preserves and organizes the detailed architecture content for this topic.

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

