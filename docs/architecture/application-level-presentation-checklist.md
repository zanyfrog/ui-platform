# Application-Level Presentation: Implementation Checklist

This checklist records the agreed v1 boundary: versioned application styling, local assets, rendered shells/templates, and UI Base-powered reusable heroes. UI Base owns the allowlisted visual defaults that application presentation may inherit.

- [x] Define and validate application-presentation contracts.
- [x] Store a mutable draft plus immutable, checksummed published versions.
- [x] Record initialization, draft, publish, and rollback history.
- [x] Provide application-scoped presentation API endpoints.
- [x] Generate the active CSS cascade (`ui-base` → tokens → app CSS).
- [x] Store active assets beneath `presentation/assets`, with draft uploads in `presentation/draft/assets`, using stable IDs and portable paths.
- [x] Add local asset upload/remove controls.
- [x] Add stable local asset serving by semantic asset ID.
- [x] Add a Presentation Manager with draft/active status and publish/rollback controls.
- [x] Add desktop, tablet, and mobile preview modes for tokens/CSS.
- [x] Specify component-provided presentation metadata and discovery behaviour.
- [x] Adopt Hero presentation metadata in UI Base for inheritable `theme`, `size`, and `visual_mode` defaults only.
- [x] Adopt Heading presentation metadata in UI Base for inheritable `size` and `align` defaults only; heading level remains page-owned.
- [x] Render component-default controls from UI Base metadata instead of requiring raw component-default JSON.
- [x] Keep existing applications presentation-free until explicitly initialized.
- [x] Add public, authenticated, and minimal shell runtime with route-derived navigation.
- [x] Add Standard Content, Two Column, Dashboard, Form, and Detail Record template runtime defaults.
- [x] Add dashboard controls for shell settings, route-derived navigation, and per-route shell/template selection.
- [x] Add reusable hero definitions and page-level hero selection using `@ui-base/hero`.
- [x] Use the UI Base hero editor and its embedded preview; persist only up to two link CTAs.
- [x] Resolve hero image asset IDs against this application's local asset map.
- [x] Omit an unassigned or disabled hero at runtime rather than hiding it with CSS.
- [x] Validate hero assignment and core styling/asset rules.
- [x] Restore rollbacks into the mutable draft; require a separate Publish to activate them.
- [x] Keep draft runtime configuration and draft assets out of the active runtime until Publish.
- [x] Prevent removal of assets referenced by draft or active shells and heroes.
- [x] Test full publish, draft-only rollback, active CSS output, staged assets, and emitted runtime configuration.
- [x] Compile and smoke-test a generated application bundle with its published presentation runtime.
- [ ] Adopt similarly scoped presentation metadata for additional UI Base components as their ownership contracts are defined.
- [x] Document CSS precedence, public schema, lifecycle, and deferred UI Base metadata adoption.
