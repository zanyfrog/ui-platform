# ui-platform

Filesystem-first lifecycle/orchestration package for dynamically generated UI applications.

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
