# Generic Artifact Editor Phase 2 — WP0 integration gate

Inspected 2026-09-25. Scope: contract inventory and executable compatibility gate only. WP1–WP5 are not implemented by this stage. Existing uncommitted Foundation and Phase 1 implementations are retained; no production interfaces or behavior were changed.

## Built Foundation contract

The root dependency and lockfile pin `@ui-platform/artifacts` to **0.1.0**, matching the workspace package. `packages/artifacts/package.json` exports:

| Entry | Emitted runtime / declarations | Consumer |
| --- | --- | --- |
| `@ui-platform/artifacts` | `dist/index.js` / `dist/index.d.ts` | Node service, definitions, types, CLI and application tooling; browser imports must be type-only |
| `@ui-platform/artifacts/validation` | `dist/validation/validator-registry.js` / `.d.ts` | Browser-safe value validators |
| `@ui-platform/artifacts/storage` | `dist/file-operations.js` / `.d.ts` | Node storage operations |

The validation runtime exports `ValidatorRegistry`, `requiredValidator`, `maxLengthValidator`, and `validateValue`. `validateValue(value, configurations, registry?, field?)` returns `ValidationDiagnostic[]`; max-length configuration uses `{ validator: 'max-length', max: 25 }`.

The root exports `FileSystemArtifactService`, `ArtifactDefinitionRegistry`, `ArtifactConflictError`, `ArtifactValidationError`, `validationResult`, `validateReferences`, and the application build/migration/deployment APIs. The complete emitted declaration inventory already lives in `generic-artifact-editor-readiness.md`; `scripts/document-artifact-contracts.mjs --check` verifies it against a fresh build rather than maintaining another handwritten copy.

`ArtifactService` exposes discover, load, validate, save, getReferences, startWatching and handleExternalChange. `ArtifactChanges.files` is keyed by **bundle-relative path**, not file role. `expectedChecksum` is optional in Foundation but required by the editor transport. `EditableArtifact.manifest` and `.definition` are nullable; `manifestContent` is available for repair. Definitions include executable validators/formatters/reference extractors and must not be serialized. Capabilities are only `edit` and `format`, not authorization policy. References contain `outgoing` only.

## Existing server and transport seams

`src/server/index.ts` uses a single `node:http` request callback with manual URL dispatch, not an Express middleware stack. Application keys resolve through `getApp` and `appPath` before an application-scoped `ArtifactEditorWorkspace` is selected. No authentication, session, permission or CSRF middleware is present in this route composition.

| Method | Path | Existing operation |
| --- | --- | --- |
| GET | `/api/apps/:appKey/artifacts` | `workspace.discover()` |
| GET | `/api/apps/:appKey/artifacts/:locator` | `workspace.load(locator)` |
| PUT | `/api/apps/:appKey/artifacts/:locator` | `workspace.save(locator, body)` |
| GET | `/api/apps/:appKey/artifacts/:locator/validation` | `workspace.validate(locator)` |
| GET | `/api/apps/:appKey/artifacts/:locator/references` | `workspace.references(locator)` |
| GET | `/api/events` | Shared SSE stream, including `artifact-change` and `workspace-change` |

`ArtifactEditorWorkspace(root, appKey, publish?, buildQueue?, reportError?)` owns the existing `FileSystemArtifactService`, projects browser DTOs without definitions/absolute bundle paths, and retains opaque process-local locators. Unknown locators return 404. Save errors distinguish missing checksum/request errors (400), stale checksums (409), rejected artifact operations (422), and operational failure (500). 401/403 remain WP1 work.

`startApplicationArtifactWatchers` receives the workspace's existing service through its optional services adapter. Both save and watcher changes call `workspace.changed`; its optional build argument accepts `onSourceChanged(file): Promise<unknown>`. The server does not instantiate a build engine. Keep that hook and report unconfigured build integration in later UI.

The browser's existing `discoverEditorArtifacts(appKey)` and `createArtifactEditorTransport(appKey)` provide fetch/EventSource integration. `ArtifactEditorTransport` exposes load, save, validateSaved, getReferences, and optional per-locator subscribe. EventSource uses the shared `/api/events` endpoint and reconciles on reconnect. No additional HTTP client is needed.

## Actual Phase 1 working-copy contract

`EditorWorkingCopyHost(transport)` has **only** `open(locator): Promise<EditorWorkingCopy>` and `close(locator): Promise<boolean>`. Concurrent opens share one copy. Editing/recovery methods belong to the returned copy:

| Method/property | Contract |
| --- | --- |
| `snapshot` | Detached snapshot containing artifact, baselineChecksum, localGeneration, lastSavedGeneration, saveState, error and dirty |
| `subscribe(listener: () => void)` | Returns unsubscribe; listener reads `copy.snapshot` |
| `setManifest(source: string)` | Updates raw manifest and provisional parsed value |
| `setFile(filePath, content: string \| null, role?, language?)` | Path-based mutation; null removes a file; manifest mapping must be updated separately |
| `flush(): Promise<void>` | Attempts save; failure is reflected in snapshot, not a successful-close guarantee |
| `compare()` | Returns `{ local, remote }` DTOs |
| `reload()` | Explicit discard/reload; refuses edits arriving during reload |
| `resolve(remote, merged)` | Requires a matching conflict and matching locators |
| `close(): Promise<boolean>` | False retains unsaved copy; navigation must stay |

`saveState` is `idle | pending | saving | saved | conflict | error`. There is no existing `access-revoked` state. Snapshots are detached clones, not runtime-frozen objects. All panels must subscribe to the same copy and read the latest snapshot before editing. `protectPendingChanges(copy, window?)` returns an unload-listener cleanup function. The copy owns the sole two-second debounce, serialized saves, generation reconciliation, watcher refresh and conflict handling. Saved validation remains saved-source validation even when source is dirty.

`tests/contracts/editor-consumer.ts` compiles directly against these existing adapters and emitted Foundation exports. It is a compile-only probe, not an additional runtime context or working-copy implementation. The runtime context adapter remains WP2.

## UI and presentation inventory

`src/client/main.ts` is imperative DOM/TypeScript with UI Base Web Components, not React. It already imports `@ui-base/ui`, forms, theme, icons and `@ui-base/ui-layout`. The linked UI Base package implements `uib-tabs`, `uib-tab` and `uib-tab-panel` in `../ui-base/packages/ui-base-ui/src/layout/index.js`, with `selected`, `orientation`, keyboard navigation, responsive layout and `uib-tabs-change`. Main already uses these tabs for applications.

`src/shared/presentation.ts` defines Application Presentation tokens, typography, component defaults, layout shells/templates/routes, heroes, CSS and assets. `src/server/application-presentation.ts` manages that presentation lifecycle. These are appearance settings, not artifact editor slots. UI Base components provide DOM composition and slots; no ready-made Generic Artifact Editor template/slot registry was found. WP2 should compose those components around the existing host using an editor-local presentation adapter; do not extend persistent presentation contracts silently.

`src/client/builder.ts` uses a textarea for page source. No Monaco/CodeMirror or equivalent rich source component is installed in the root manifest. WP4 needs a source panel abstraction and a deliberate dependency choice. Do not reuse the page builder's independent save mechanism for artifact editing.

## Compatibility findings and proposals for later gates

1. **Host method placement:** the plan's shorthand places edits on the host. Adapt the context to `await host.open(locator)` and delegate to that copy; no host API change is needed.
2. **Authorization and deployment boundary:** API and Vite currently bind `0.0.0.0`; artifact SSE broadcasts to all connected responses and editor routes are registered without a development gate. WP1 must enforce explicit development enablement, a local-only boundary (including the UI proxy), server sessions, request authorization and event filtering. Do not equate a loopback proxy connection with proof that the browser is local. Existing production exclusion is not proven by this WP0 build.
3. **Revocation:** the working copy has no cancel/suspend/permission setter. Prefer an authorization-aware wrapper around the existing transport plus context mutation guards and a session generation check for queued writes; keep the server authoritative. Verify behavior for active saves and identity switches before deciding whether any additive host API is necessary. Report such a need before changing it.
4. **Ownership and reference filtering:** Foundation supplies no explicit application/system/package ownership policy or authorized locator on outgoing references. WP1 needs server-owned policy metadata and authorized ID-to-locator resolution, including removed-event handling. Do not use email or browser-provided paths as authority. Restricted details in references/diagnostics require filtering as well as discovery and events.
5. **Presentation metadata:** no serializable field/editor schema exists on `ArtifactDefinition`. WP3 should register a JSON-safe descriptor bridge keyed by artifact type and definition version, without modifying or serializing server definitions. Plugin rendering should fit Web Components/DOM rather than introduce React by assumption.
6. **Deferred facilities:** reverse references, Git history, a configured build engine and a generic editor template are absent. Preserve the existing boundaries and present their absence honestly.

No upstream public interface was modified to address these findings. WP1 security behavior intentionally remains unimplemented at this gate.

## Automated gate and handoff

Run `npm run check:editor-contracts` in CI after dependencies are provisioned. It checks the exact manifest/lockfile pin, freshly builds Foundation, compiles the Phase 1 consumer probe, checks emitted-contract documentation, and runs the existing built-package, consumer, schema-adapter, Windows-storage, watcher and Phase 1 editor regression suites. Child failures propagate a nonzero exit status. The existing built-package tests import the real package entry points in a separate Node process and verify browser validator isolation.

No existing hosted CI workflow was found. This adds a CI-ready command; it does not claim an external CI run or invent a sibling repository checkout/credential policy. Full workspace installation/build requires the existing linked `../ui-base` checkout. Keep it provisioned in the CI environment.

WP0 changed only this inventory, `scripts/check-editor-contracts.mjs`, `tsconfig.editor-contracts.json`, `tests/contracts/editor-consumer.ts`, and the additional root package script. No public API additions, new service, validator, timer, source-history model or security behavior were introduced.

Validation: contract gate **36/36 tests** across 8 files; full suite **111/111 tests** across 22 files; workspace typecheck and full client/server build passed. Vite reported a non-blocking JavaScript chunk-size warning (635.92 kB, above its 500 kB threshold). No test failures or retries occurred.
