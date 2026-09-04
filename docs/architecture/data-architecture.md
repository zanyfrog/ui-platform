# UIB Data Architecture

This document was split out of docs/architecture/UIB-Architecture-Guide.md on 2026-09-03. The Architecture Guide remains the authoritative umbrella document; this file preserves and organizes the detailed architecture content for this topic.

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

