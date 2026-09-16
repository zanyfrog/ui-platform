# Application-Level Presentation: Implementation Checklist

This checklist records the agreed v1 boundary: versioned application styling, local assets, rendered shells/templates, and UI Base-powered reusable heroes. Component metadata is defined by the platform pending a separate UI Base adoption.

- [x] Define and validate application-presentation contracts.
- [x] Store a mutable draft plus immutable, checksummed published versions.
- [x] Record initialization, draft, publish, and rollback history.
- [x] Provide application-scoped presentation API endpoints.
- [x] Generate the active CSS cascade (`ui-base` → tokens → app CSS).
- [x] Store assets beneath `presentation/assets` using stable IDs and portable paths.
- [x] Add local asset upload/remove controls.
- [x] Add stable local asset serving by semantic asset ID.
- [x] Add a Presentation Manager with draft/active status and publish/rollback controls.
- [x] Add desktop, tablet, and mobile preview modes for tokens/CSS.
- [x] Specify component-provided presentation metadata and discovery behaviour.
- [ ] Adopt that metadata in UI Base in a separate, coordinated change.
- [x] Keep existing applications presentation-free until explicitly initialized.
- [x] Add public, authenticated, and minimal shell runtime with route-derived navigation.
- [x] Add Standard Content, Two Column, Dashboard, Form, and Detail Record template runtime defaults.
- [x] Add dashboard controls for shell settings, route-derived navigation, and per-route shell/template selection.
- [x] Add reusable hero definitions and page-level hero selection using `@ui-base/hero`.
- [x] Use the UI Base hero editor and its embedded preview; persist only up to two link CTAs.
- [x] Resolve hero image asset IDs against this application's local asset map.
- [x] Omit an unassigned or disabled hero at runtime rather than hiding it with CSS.
- [x] Validate hero assignment and core styling/asset rules.
- [ ] Test full publish, rollback, active CSS output, and generated-runtime compatibility.
- [ ] Document CSS precedence, public schema, lifecycle, and deferred structural artifacts.
