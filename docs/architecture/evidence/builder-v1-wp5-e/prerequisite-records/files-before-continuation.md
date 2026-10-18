# WP5-E prerequisite changed-file inventory

This inventory distinguishes this implementation from unrelated demo work already present or updated concurrently in the workspace. No Git commit was made.

## Product and tests

- `packages/artifacts/src/storage-api.ts`: additive export of existing cross-process lock.
- `src/shared/platform-settings.ts`: typed/versioned contract, validation and exact decimal parser.
- `src/server/platform-settings.ts`: Platform-owned JSON persistence and conflict/fallback handling.
- `src/server/platform-settings-http.ts`: authenticated HTTP/event-stream orchestration.
- `src/server/index.ts`: existing identity/admission integration and handler registration.
- `src/client/artifact-editor/autosave-configuration.ts`: single shared in-memory configuration subscription.
- `src/client/artifact-editor/editing-lifecycle.ts`: configurable timer, enabled state, rescheduling and disposal.
- `src/client/platform-settings.ts`: Settings UI, live connection and failure reporting.
- `src/client/main.ts`: development Platform settings startup/navigation.
- `tests/platform-settings.test.ts`: focused authority, timing and HTTP-stream checks.

## Records

- `docs/architecture/builder-v1-wp5-e-prerequisite-review.md`: prior blocker retained with superseding authorization note.
- `docs/architecture/builder-v1-wp5-e-implementation.md`: implementation, coverage and legacy Page contract stop.
- `docs/architecture/builder-v1-wp5-e-verification.md`: actual results, failed/transitional runs and unresolved ledger.
- `docs/architecture/builder-v1-wp5-e-files.md`: this inventory.
- `docs/architecture/builder-v1-wp5-plan.md`: latest authorization/status without rewriting prior decisions.
- `docs/architecture/builder-end-to-end-v1-acceptance-checklist.md`: WP5-E pending prerequisite checkpoint; no umbrella checks changed.
- `docs/architecture/evidence/builder-v1-wp5-e/`: all new machine reports, transcripts, preservation manifests and protective copies; exact files are enumerated by `changed-files.json` in that directory. The manifest excludes its own hash.

Unrelated demo changes in README, package scripts, `scripts/dev.mjs`, `scripts/dev-demo.ts`, demo documents and prior WP5-D browser evidence are not WP5-E implementation. They were not reverted. Generated build outputs are ignored build products, not manually edited source. Test-runner workspace temp files are disposable verification output, not a settings store.
