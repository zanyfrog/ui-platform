# UIB Architecture Decision Record

This document was split out of docs/architecture/UIB-Architecture-Guide.md on 2026-09-03. The Architecture Guide remains the authoritative umbrella document; this file preserves and organizes the detailed architecture content for this topic.

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

