# UIB Platform Architecture Guide — Packages, Services, Settings, Components, and Administration

**Status:** Canonical working architecture guide  
**Project:** UIB Platform  
**Date:** 2026-09-03

---

## Document Control and Preservation Policy

This file is the authoritative umbrella Architecture Guide for the UIB package, service, settings, component, and administration architecture.

The detailed architecture content has been split into focused documents so each area can evolve without turning this guide into a hard-to-review monolith. This guide remains authoritative for architectural intent, preservation rules, and cross-topic direction.

When the architecture is revised, existing substantive decisions should **not be silently removed or compressed away**. A change should instead be handled as one of the following:

- **Confirmed** — explicitly accepted as the current design.
- **Accepted Recommendation** — initially recommended and then accepted by the project owner.
- **Deferred** — intentionally postponed; architecture should remain compatible where practical.
- **Future** — desirable capability that is not part of the initial implementation.
- **Superseded** — an earlier decision intentionally replaced by a newer decision.
- **Open** — a decision still requiring resolution.

If a decision is superseded, the old decision should remain in the Decision Record with a pointer to the newer decision.

## Decision Status Legend

| Status | Meaning |
|---|---|
| **CONFIRMED** | Explicitly accepted as the current design. |
| **ACCEPTED RECOMMENDATION** | Recommended during discussion and explicitly accepted. |
| **DEFERRED** | Intentionally postponed; preserve future compatibility where reasonable. |
| **FUTURE** | Planned or desirable later capability, not required initially. |
| **OPEN** | Not yet decided. |
| **SUPERSEDED** | Historical decision replaced by a later one; retain for traceability. |

## Split Architecture Documents

| Topic | Document |
|---|---|
| Core package model, package catalog, package dependencies, examples, permissions | [package-architecture.md](./package-architecture.md) |
| Service packages, registry, contracts, server/CLI/HTTP adapters, events, logging | [service-architecture.md](./service-architecture.md) |
| Component metadata, discovery, and registry separation | [component-registry-architecture.md](./component-registry-architecture.md) |
| Settings service, metadata, storage, scopes, resolution, runtime consumption, settings admin | [settings-architecture.md](./settings-architecture.md) |
| Admin extensibility, package detail views, data disclosure, status model, audit views | [admin-architecture.md](./admin-architecture.md) |
| Data access, resource ownership, application data location, file-system prohibition | [data-architecture.md](./data-architecture.md) |
| Update policies, channels, activation, health, lifecycle hooks, jobs, backup and rollback | [lifecycle-and-updates.md](./lifecycle-and-updates.md) |
| Implementation boundaries, deferred/future items, open questions, next docs, final direction | [architecture-planning.md](./architecture-planning.md) |
| Decision record and conversation-derived rationale | [../decisions/architecture-decision-record.md](../decisions/architecture-decision-record.md) |
| Future detailed specifications | [../specifications/README.md](../specifications/README.md) |

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

## Rule for Future Updates

When future conversations modify this architecture:

1. Update the relevant architecture section.
2. Add or update the corresponding Decision Record entry.
3. Mark the old decision as **SUPERSEDED** rather than deleting it when history matters.
4. Add the change to the Change Log.
5. Keep deferred decisions visible until explicitly resolved.
6. Do not remove conversation-derived requirements merely because implementation has not started.
7. Treat examples as illustrative unless the Decision Record explicitly marks them as required.

