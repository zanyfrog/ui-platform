# WP5-F Focused Preview — Fixture Foundation

2026-10-22, America/New_York. **STOP AT WP5-F Focused Preview Increment Review Gate.** Implementation and bounded evidence are ready for review; this report does not accept the increment, complete WP5-F, D6 or WP5-I. All 40 umbrella requirements remain unchecked.

## Implemented behavior

The Builder now includes a visibly labeled fixture demonstration panel. It receives the original subject/session, permanent Application ID, owner-qualified workspace identity and dirty status. It receives no editor object, transport, source bundle or record. Selecting an artifact identifies the demonstration session; it does **not** render or claim to capture that selected artifact. The independently bundled Card demonstration remains explicitly identified as a fixture.

`PreviewLifecycle` implements empty, capturing, ready, stale, unavailable, revoked and disposed states. Requests have a separate sequence/request identity; successful captures remain separate from pending work. Matching checks reject superseded, invalidated, disposed, revoked and wrong-identity responses. A retained capture cannot acquire a different provenance/revision under the same capture ID. Snapshot copies prevent external mutation. Refresh is explicit; invalidation never starts capture. Saved revision provenance is a typed future-provider contract only; no saved-capture provider or activation is implemented.

Ephemeral Card samples support heading, body/default slot, named footer slot, variant, density and local selectable behavior. Exact-key validation rejects other fields, markup, accessors, runtime objects, unsupported values and oversized text. Text is limited to 512 characters per field and the panel limits JSON input to 4096 characters. Sample field order is canonicalized before computing a render identity that includes the trusted bootstrap digest and policy version. Samples are authored synthetic strings; no record or source reader seeds them. Edits mark the old view stale, and only Refresh renders the new sample. Identity replacement resets sample controls. Revocation/disposal clears the capture, frame and sample controls.

Staleness destroys the entire rendering frame, including native listeners/observers and its registrations. A text-only inert summary retains the original capture label and authored heading/body/footer. It is labeled **Static sample summary (rendering destroyed)**; it does not claim to preserve native layout or the user's transient Card selection state. Capturing/failure never silently promotes this summary to a current rendering.

The saved-artifact action directly reports `SAVED_CAPTURE_UNAVAILABLE`; it has no provider, endpoint, Save/flush or source-access path. Existing WP2 autosave settings/lifecycle remain unchanged. Builder source-save/workspace-change signals conservatively invalidate the demonstration. Existing session changes clear it; these client notifications are **not** trusted production revocation evidence.

## Native renderer and restricted host admission

The host uses the existing UI Base `renderComponentInstance` implementation, existing `ComponentRegistry`, actual canonical Card Definition from `ui.component.json`, and actual `UibCard` implementation. No replacement Component, rewritten runtime or synthetic renderer claims parity. The Card is bundled from the existing `@ui-base/ui` 0.5.1 sources. It is an installed-code Card fixture, **not** a shared Platform Component capture.

The explicit build admits 17 source inputs: three fixture modules; the renderer, definition and registry modules; Card export and layout implementation; package manifest; six core source modules; icon implementation and its in-memory registry. `renderer-build.json` records every raw source hash, bytes and output graph. Layout/icon initialization registers existing element classes in the isolated frame; no unselected element is instantiated. The admitted Card path only constructs text slots, fixed attributes/CSS and local selection events. Registry services/handlers are never registered or supplied. The ordinary fetch-based `loadCardRegistry` helper is tree-shaken out. Its unused `import.meta` expression produces an esbuild warning during analysis; neither the helper nor `import_meta` occurs in the delivered bootstrap.

The bootstrap is a checked-in generated text asset, reproducible using only `scripts/build-fixture-preview.mjs`. Its resolver/load admission rejects any file outside the explicit list. No Vite configuration, normal package script, plugin, source discovery or application server executes. A static output check rejects dynamic imports/eval/Function constructors and direct network/storage primitives. `static-boundary.json` records additional source and final dependency preservation checks.

Each frame uses `sandbox="allow-scripts"`, an opaque origin, no-referrer and `credentialless`. Its CSP admits exactly the SHA-256 of the fixed bootstrap, denies executable attributes and all network/resource/worker/object/frame channels, and sets `base-uri 'none'` and `form-action 'none'`. Native renderer style elements require `style-src 'unsafe-inline'`; only fixed audited renderer CSS is admitted, and fixture inputs accept no HTML/CSS/URL resources. Images, fonts and media are denied. There are no external resource deliveries or live fallback URLs. The in-memory manifest and bootstrap are the only fixture resources.

Messaging checks exact parent/frame Window, parent origin or opaque `null` origin as appropriate, random channel nonce/session, original Preview identity, sequence and exact message shape. The frame accepts only one validated render command. There is no effect/forwarding command. Frame installation waits for the script digest and rejects installation if canceled in the meantime; startup has a five-second bound. One frame and one bounded successful sample are retained per panel. All normal rendering input is data-only.

Document capture listeners deny link/download/file-input activation, submissions and drops. CSP/sandbox independently deny network, native submissions, top navigation and popups. The opaque sandbox does **not** generally forbid arbitrary scripts from navigating their own frame; safety depends on admitting only the fixed renderer/bootstrap and rejecting arbitrary code/URL constructs. This increment makes no arbitrary-JavaScript sandbox claim.

## Supported and unavailable matrix

| Surface | Result in this increment |
| --- | --- |
| Existing native Card | Actual admitted renderer/implementation; default/footer text slots, heading, three variants, two densities, local selection |
| Synthetic sample controls | Validated ephemeral JSON controls; SAMPLE DATA visible in panel and frame; explicit Refresh |
| Stale view | Original capture retained as inert text summary; executable frame destroyed |
| Original selection identity | Displayed separately from fixture identity and capture digest; dirty warning |
| Saved artifact/revision capture | Unavailable: D6 acquisition, immutable closure and trusted authority prerequisites remain open |
| Shared Platform Component public properties | Unavailable: protected source/capture admission absent; no shared Component APIs accessed |
| Other installed Components | Unavailable: no audited exact-byte implementation closure; no synthetic substitution |
| Shell/named Regions | `REGION_SCHEMA_UNSUPPORTED`; composition closure not admitted |
| Route parameters/Menu navigation | `ROUTE_SCHEMA_UNSUPPORTED`; no captured route contract |
| Form create/edit synthetic records | `FORM_MODE_UNSUPPORTED`; Form renderer/field contract closure not admitted; no record-shaped live-data claim |
| Executable functions/imports/resources | Specific unavailable reasons; never delivered as executable inputs |
| Dataset/Workflow/Trigger/service/storage/Publish | No adapters, credentials, endpoints or message forwarding; effects rejected |

## Verification and browser observations

Before execution the selected files, imports, setup and launch/build paths were inspected. The verifier compiles only two exact entry files and their explicit allowed dependencies. It uses Node's test runner with `--test-concurrency=1`, no discovery/setup hooks and no retries; Playwright journeys are sequential. No workspace test configuration is loaded. No broad suite, normal launcher, Foundation reader, storage/concurrency test or any of the 55 deferred Foundation tests runs.

Authoritative final evidence is `evidence/builder-v1-wp5-f-fixture-20261022/run-1792687914223/`:

- **13/13 unit tests pass**: identity, separate pending/last capture, provenance relabel rejection, deferred supersession, wrong identities/sequences, invalidation, terminal disposal, simulated revocation, unavailable recovery, sample validation, policy/schema denial, protocol shape and in-memory WP2 preservation.
- **Seven browser checkpoints pass**, Edge 155.0.4283.62: actual native Card render, local selection/slots, effect denials, stale inertness/failure identity retention/forged messages, changed samples through explicit Refresh, pending revocation/identity replacement/overlapping Refresh, saved-entry denial/disposal/history preservation.
- Receiving server saw exactly **GET /** and **GET /harness.js**, with null Cookie/Authorization. No effect request reached it. Browser request events separately recorded image/CSS attempts, both failed with `csp`; fetch attempts produced connect-src violations and TypeError. Browser event attempts are not mislabeled as successful network delivery.
- Top navigation raised SecurityError; popup creation returned null; native submission was browser-blocked because allow-forms was absent. Link/download/file-input activations produced no navigation, download or file chooser. Injected untrusted script was CSP-blocked. Local/session storage and cookies raised SecurityError. No new browser page or uncaught page error appeared. Actual console, CSP, request/failure, navigation, download and chooser observations are retained.
- Hostile probes intentionally use the browser test driver's evaluation to bypass fixture input admission; they are absent from shipped code. No real/protected record, ordinary service or authenticated application is used.

`browser-ready.png`, `browser-stale.png` and `browser-disposed.png` are retained; ready/stale layouts were visually inspected. Scoped TypeScript compilation exits 0 (`compilation.txt`). It uses direct file arguments with `--ignoreConfig`, strict null checks and `noImplicitAny=false` because the existing native JS renderer has no declarations. This is not a full Builder or workspace typecheck. The modified Builder shell also passes a syntax-only transform without loading dependencies.

Earlier attempts remain visible, not overwritten or called passing: root `unit-results.txt` has 11/12 before two diagnostic reasons gained explanatory text; `run-1792687661694` has 12/12 and a browser launch failure inside the execution sandbox; `run-1792687686521` has a verifier assumption about opaque-frame URL reporting; `run-1792687714863` incorrectly measured draft focus after its deliberate Card click; `run-1792687739807` has an ambiguous verifier status selector. These harness errors were corrected without weakening effect or preservation assertions. `run-1792687759208` passed the initial 12-test/five-checkpoint scope; `run-1792687840166` passed the expanded 13/seven scope before the final sample-control cleanup assertion. Every invocation has zero configured retries. Browser launch used the approved execution-sandbox exception after the initial process-launch failure; iframe sandbox/CSP stayed unchanged. No Windows identity/token/elevation investigation occurred.

## Preservation, inventory and remaining gaps

`before.json` captures HEAD, initially clean status and raw hashes for 1,328 enumerated pre-existing source/test/script/doc/visual-package/config files. `preservation.json` compares those exact paths after implementation: the only intended pre-existing file change is `src/client/builder-workspace/shell.ts`. All other enumerated bytes, historical records within that inventory, WP2 implementation and the acceptance checklist remain unchanged. Renderer inputs are rehashed against the build inventory. HEAD remains unchanged. This is an enumerated preservation claim, **not** a filesystem-wide or protected-store hash claim: protected Components, locks, journals, transactions and recovery state were deliberately not opened or enumerated. Source dependency admission provides the no-access boundary; it is not an OS filesystem audit.

Browser `before`, `afterReady`, `beforeStale`, `afterStale` and `afterSampleEdit` snapshots prove identical in-memory dirty draft/current/baseline bytes, permanent working-copy identity, generations, Undo/Redo availability/history size, autosave configuration, focus and selection [2,9], with zero saves. Explicit post-test Undo/Redo restores the expected prior values; those deliberate operations advance generation and are distinguished from Preview preservation. This uses the actual common WP2 EditingLifecycle with synthetic in-memory values and autosave disabled **only in the harness**. Production autosave configuration/source is unchanged. Normal Builder editor adapters/Monaco and enabled-autosave concurrent behavior were not exercised.

The exact changed-file list, sizes and SHA-256 hashes are in `builder-v1-wp5-f-fixture-foundation-20261022-files.json`, including this report, generated bootstrap, tests, scripts and every new evidence artifact. The manifest's own self-entry is intentionally unhashed. No commit, push, synchronization, package installation, ordinary build, protected-state operation or downstream work was performed.

Remaining review/acceptance gaps are: D6 saved-source graph acquisition and coherent closure; trusted authority-owned revocation/fail-closed delivery; immutable saved dependency/resource capture and fresh authorization; admitted Platform Component, other package, composition/Regions/route and Form contracts; full Builder/editor integration and enabled-autosave preservation evidence; broader browser/version compatibility and independent authority/effect boundary review. Unsupported rows are unavailable states, not proof of renderer parity. The fixture foundation does not close those requirements or the historical D6/provenance blockers.

**WP5-F Focused Preview Increment Review Gate. D6, complete WP5-F and WP5-I remain open. A01–A40 remain unchecked. Review evidence before acceptance or additional authorization.**
