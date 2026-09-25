# ui-platform

Filesystem-first lifecycle/orchestration package for dynamically generated UI applications.

## Architecture waypoints

Use these companion specifications together:

- [Artifact Foundation v1.1](docs/architecture/artifact-foundation-v1.1-waypoint.md) defines artifact identity, bundles, discovery, save behavior, and shared validation.
- [Application Build, Migration & Deployment v1](docs/architecture/application-build-migration-deployment-v1.md) extends that foundation with dependency-aware builds, reviewed schema migrations, production bundles, and deployment recovery.

These documents describe implementation requirements; their work packages and acceptance criteria do not imply that the features are already implemented.

The [application build integration guide](docs/architecture/application-build-integration.md)
documents the implemented service APIs, CLI, JSON ORM provider, local deployment
target, required application adapters, and recovery procedures.

Run from `Modular/`:

```bash
npm run install:all
npm run start:platform
```

The package uses the uploaded UI Base source through local `file:` dependencies and manages generated apps under `../apps` and auto-discovered templates under `../templates`.

## Page Builder

The builder is local and filesystem-first. `src/pages` is the source of truth for static routes:

- `src/pages/index.ts` maps to `/`.
- `src/pages/about.ts` maps to `/about`.
- `src/pages/services/index.ts` maps to `/services`.
- Files or folders beginning with `_` are reserved for non-page code.

`GET /api/apps/:key/pages` returns the nested Site Tree and page descriptors. `GET` and `PUT` on `/api/apps/:key/page?source=...` inspect or update a page, and `POST /api/apps/:key/pages` moves a page source file. Page deletion moves the source file to the operating system Trash/Recycle Bin.

The client exposes the reusable `<ui-platform-tree>` custom element. It is used for the Site Tree and the selected page's source-backed structure tree, but can also be mounted by another local platform view.

## Component Catalog

Packages may provide `ui.component.json` with a `components` array. The platform indexes manifests across UI Base and app-local packages, then falls back to package metadata or exports for packages that have not been annotated yet. `GET /api/components` returns the shared catalog; the app-scoped endpoint also includes local app packages.

The editor marks pages as supported, partial, or code-managed. Source edits become dirty immediately, are automatically saved after three seconds of inactivity, and remain available through an explicit Save button while dirty.

See `../docs/UI-PLATFORM-V1-TECHNICAL-SPEC.md`.

## Application Presentation

Application Presentation is opt-in and filesystem-first. Initializing it for an
application creates `presentation/presentation.manifest.json`, a mutable
`presentation/draft/presentation.json`, local `presentation/assets`, and an
`active.css` file imported after UI Base styles by the application runtime.

The platform supports a mutable draft and immutable published versions. A draft
is previewable but never activates the application runtime. Publishing creates
one atomic logical version containing the presentation schema, stylesheet,
generated runtime configuration, and local assets. Rollback restores a prior
version into the draft; a separate Publish is required to activate it.

The styling cascade is UI Base styles, followed by application tokens and
typography, then application custom CSS. Application-owned files are stored
under `presentation/`: active assets live in `assets/`, draft-only uploads in
`draft/assets/`, and immutable publication snapshots in `versions/vN/`.
Assets cannot be removed while a draft or active shell/hero references them.
The active stylesheet is available at `GET /api/apps/:key/presentation/active.css`.
When a route renders a hero, its UI Base hero headline is the route's primary
heading and the runtime removes the page's first `h1`; routes without a hero
remain responsible for rendering their own primary heading.
See `docs/architecture/application-level-presentation-checklist.md` for the
public contract and deferred UI Base metadata adoption.
