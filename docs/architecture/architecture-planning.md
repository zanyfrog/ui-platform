# UIB Architecture Planning, Boundaries, and Open Questions

This document was split out of docs/architecture/UIB-Architecture-Guide.md on 2026-09-03. The Architecture Guide remains the authoritative umbrella document; this file preserves and organizes the detailed architecture content for this topic.

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

