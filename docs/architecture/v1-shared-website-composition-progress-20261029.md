# Shared Website Composition — Implementation Progress

2026-10-29. **In progress; not the Acceptance Review Gate.**

The user accepted Mixed Plain/Composed Page Admission and authorized resuming bounded Shared Website Composition, including the separate settings and empty-theme amendments. The earlier blocker reports remain historical evidence.

## Settings contract check

The complete existing required contract is covered by the approved fields: `model`, `defaultShellId`, `branding.applicationName`, `theme`, `siteStyles` and `assetsRoot`. `defaultMenus`, additional branding fields and `shellConfiguration` are optional. No schema or validator changes were made. A detached complete thirteen-Page graph validates with exactly the approved required fields, an existing test Shell identity and the two required installed native contracts.

The original live settings baseline remains SHA-256 `4e18fc40680c03c56e30046165acebbe19b408c9e7a167ca87d1958dbaf62cf5`, captured before any configuration changes. Live settings have not yet been modified. No real Shell identity has been fabricated.

## Implemented source

- Ordinary `Set up shared website` control selects a valid saved Shell by name. The new POST operation uses the existing presentation-edit authorization and normal editor principal, then saves through the existing settings service with expected-hash admission, whole-Application validation, existing application mutation serialization and a final authorization callback. The original text outside the appended presentation member is retained.
- Existing Change Page Shell is available for plain Pages and uses a named Shell selector. Explicit plain adoption requires a real main Region, adds one managed Page-owned main wrapper around the original HTML bytes and allocates one Route identity in the same complete Page candidate transaction. Subsequent Shell changes retain that Route identity. Artifact/node identities, authored content and existing metadata/layout remain intact.
- Ordinary semantic header/nav/footer insertion supports shared Shell authoring. The existing leaf Text content controls, application Menu controls and Page identity destinations are reused. An initially redundant text control was removed during verification before completing the authoring workflow.
- Shared runtime pathname links now work in Shell and composed Page roots under the existing explicit host-navigation flag, including the generated `_self` Menu links. Modified clicks, downloads and other browser targets remain ordinary browser actions. Accepted plain fragment handling remains restricted to its original scope.
- Saved Design Preview uses its existing authorized saved-revision lifecycle for composed cross-Page navigation, iframe-owned URLs/history, reload initialization, disposal and Page focus within the main Region.
- The revision-aware composition plugin now explicitly requests recovery refusal for every development source-root preflight. Existing refusing role reads, graph admission and source rechecks remain. The three previously qualified read modules are not edited.
- Composition capture accepts explicit installed-package manifests using the existing runtime manifest/identity convention. This is needed because all thirteen Pages remain validated while the Application package file has no dependencies; six unrelated Pages reference the installed Card/Panel contracts. No Application dependency configuration or protected Component root is changed.

## Verification completed so far

- `verify-shared-composition.mjs`: actual role service and application mutation lock, real settings enablement and three Page adoptions in detached physical fixtures. Stale hashes and denied authority refuse; unrelated settings/Page stay unchanged; metadata and original HTML survive; Route identity is stable on subsequent Shell selection.
- `verify-shared-host-read.mjs`: actual composition plugin/Foundation capture succeeds on clean detached source. Pending journals in each of the four source collections refuse, with bytes unchanged. Explicit Card/Panel contracts preserve their identities; duplicate explicit contracts refuse. Generated native import strings are not executed by this test.
- `verify-shared-full-graph.mjs`: all thirteen actual Page snapshots captured with three hypothetical adoptions. Capture without required native contracts refuses; the two explicit installed contracts admit the full graph. No live adoption or source repair occurs.
- `verify-composed-preview.mjs`: actual Preview client/runtime in isolated DOM, fake saved transport. Shared Menu and Page literal navigation, branding, active Menu, nested Page focus, reload initialization, Back/Forward, disposal and failed-revision retention pass.
- Accepted 30-test admission/navigation regression runner and strict scoped typechecking pass in `evidence/v1-mixed-page-admission-20261028/run-1793291872561`. New run output was added; original runs remain unchanged.
- Visual package build, server typecheck and client production build pass. Broader client typecheck still has the same seven unrelated diagnostics previously documented. No legacy Vitest/Windows/recovery investigations were repeated.

These tests do not establish normal Chrome, live ownership/session, production filesystem or unrestricted host qualification.

## Disposable deployment and outstanding verification

Source/package outputs were copied narrowly into the existing disposable platform. Every replaced target's previous bytes and before/after hashes are retained in `evidence/v1-shared-composition-20261029/deployment.json` and its content-addressed `before` folder. The new host configuration is staged as a text file; it has not replaced the active Vite configuration or launched the composition plugin. The staged host retains the disposable owner marker, physical-root checks, strict filesystem boundary and no Application dependencies. It explicitly admits Card/Panel contracts and pins installed native dependency bytes.

Normal Chrome successfully created `shared-website/shell.visual.json` with actual identity `art_a8ca1455-8234-424c-ac66-6480701267f1`. Using ordinary insertion/move/branding controls, its header was placed before the existing `region-main`, a span was bound to `applicationName`, and one shared footer was authored and saved. Screenshot: `evidence/v1-shared-composition-20261029/normal-shell-authoring.png`. A name-selector automation mismatch and text input that had not committed were resolved by reading the actual node options and using fresh selection plus normal sequential typing. Authoritative saved HTML confirms the footer text. No source textarea was edited. A setup-button visibility issue in retained workspace editors was corrected by placing it in the visible editor toolbar.

The existing API process must restart to load the new server operations, and a fresh cache must load the new runtime. The operator has been asked to restart the same command with only `UI_PLATFORM_VITE_CACHE_DIR` pointing to `runtime/vite-cache-composition-20261029`; all other values remain unchanged. This session cannot manage that Windows process, as established in prior work; no new process/security investigation was attempted. No restart confirmation has yet been received.

Remaining work after restart: settings enablement with the actual saved Shell, shared Menu authoring, adoption of the actual Home/About/Contact, saved Preview revision/history verification, activation and verification of the bounded recovery-refusing website host, mouse/keyboard/direct URL/Reload/Back/Forward, shared-content edit propagation, final preservation checks and exact changed-file inventory. No acceptance declaration, commits or pushes.
