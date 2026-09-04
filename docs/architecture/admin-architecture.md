# UIB Administration Architecture

This document was split out of docs/architecture/UIB-Architecture-Guide.md on 2026-09-03. The Architecture Guide remains the authoritative umbrella document; this file preserves and organizes the detailed architecture content for this topic.

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

