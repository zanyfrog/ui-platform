# Foundation Source Specification

**Status:** Normative v1 specification
**Version:** 1.0.0

## Purpose

This specification defines how the platform obtains shared runtime workspaces such as UI-Base without treating them as UIB extension packages.

## Use

An administrator registers a trusted GitHub repository through the Package Manager. The platform clones it with the machine's existing Git/SSH configuration, resolves the selected ref to an exact commit SHA, and records that immutable checkout as a foundation source. Applications then select the `@ui-base/*` packages they need from that source.

## Source Contract

The first supported adapter accepts a github.com SSH or HTTPS repository URL. It MUST:

1. Clone the repository without storing credentials.
2. Resolve the requested ref, or `HEAD`, to a 40-character commit SHA.
3. Require an npm workspace containing the literal `packages/*` pattern.
4. Discover only `@ui-base/*` packages for the initial UI-Base adapter.
5. Record the repository URL, resolved commit, install time, workspace path, and package metadata in `data/foundation-sources.manifest.json`.
6. Record source installation in `data/package-history.jsonl`.

The platform MUST use the machine's existing SSH agent or Git credential configuration. It MUST NOT store private tokens, SSH keys, or credentials in platform or application manifests.

Registering an already-known repository MUST return its current pinned source record. It MUST NOT replace that source with a newer ref through the registration path.

## App Dependency Selection

When an application selects foundation packages, the platform MUST add `file:` dependencies to the application's `package.json`. It MUST include transitive `@ui-base/*` workspace dependencies declared by the selected packages. The application owner runs `npm install --ignore-scripts` before running or building the application.

Before a write, the app package view MUST show the directly selected packages separately from packages that will be added automatically. History records both lists. A package that already exists from this source is shown as `Added from source`; a package that exists from another source is shown as `Already present`. Both states are checked and unavailable for duplicate selection.

The app Packages view MUST also list installed foundation packages. It identifies each as a direct selection, a resolved dependency, or an already-present dependency from another source.

`app.manifest.json` remains the source of truth for UIB extension-package enablement. Foundation workspace dependencies belong in the app's normal `package.json`, because they are standard npm dependencies rather than UIB extensions.

## Portability

An application export MUST vendor external `file:` package dependencies declared by the app into the portable workspace and replace those dependency paths with their resolved package versions. This lets an exported application carry the selected foundation packages without a required sibling platform checkout.

## Scope Boundary

UIB extension packages continue to require a `<package-name>.manifest.json` and use the UIB installation, discovery, enablement, and activation flow. Foundation workspaces retain their own package names and metadata. The two systems may appear in the same package-management UI, but they MUST remain distinct lifecycle types.

## Current API

- `GET /api/foundation-sources` lists registered foundation sources and discovered packages.
- `POST /api/foundation-sources/github` registers a GitHub source. The request accepts `repository` and optional `ref`.
- `POST /api/apps/:key/foundation-dependencies` adds selected packages from a source. The request accepts `sourceId` and `packageNames`.
- `POST /api/foundation-sources/:sourceId/refresh` re-inspects the already-pinned checkout. It does not fetch a newer commit or modify applications.
- `DELETE /api/foundation-sources/:sourceId` removes an unused source. The platform MUST refuse removal while an application has package dependencies resolved from that source.

## Source Changes

A source refresh MUST only re-scan the checkout already pinned in the source record. It MAY update discovered package metadata, but it MUST NOT change the pinned commit or any application dependency.

Updating a source to a new Git commit is an explicit migration. The platform MUST stage and inspect the proposed revision, show package changes and affected applications, and apply a selected migration per application. It MUST NOT silently rewrite an application's `package.json` or `app.manifest.json`.

Each selected npm application MUST be validated with `npm install --ignore-scripts`, `npm run typecheck`, and `npm run build`. A failed application migration MUST restore its `package.json`, `package-lock.json`, and `app.manifest.json`; other selected applications may still complete independently. The previous checkout MUST remain available until an administrator explicitly removes it.

## Deferred Work

Explicit source-update migrations, alternate foundation namespaces, package version conflict policy, and additional registry adapters remain future work.
