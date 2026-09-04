# UIB Lifecycle, Updates, Jobs, and Rollback Architecture

This document was split out of docs/architecture/UIB-Architecture-Guide.md on 2026-09-03. The Architecture Guide remains the authoritative umbrella document; this file preserves and organizes the detailed architecture content for this topic.

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

