# V1 HTML-first acceptance closure and working Builder gate

Date: 2026-10-26. Decision: **ACCEPT AND CLOSE V1 HTML-First Simplification within its verified scope**, as directed by the user. Historical assessment, verification, failed attempts, saved fixture Pages, legacy representations and inventories remain intact. This addendum supersedes only the pending acceptance decision, not the recorded limitations.

## Acceptance evidence

The retained final run `evidence/v1-html-first-20261026/run-1793064739188` records four passing source tests, two passing actual-editor workflows, zero typecheck diagnostics and zero real-browser workflows. Card and Panel use the existing UI Base classes, shared HTML source helpers, VisualArtifactService and design Preview. Save/Reload preserves values and identities. Preview requests carry the saved hash; an unsaved draft cannot change the saved rendering, and dirty Preview initiation is refused. This is isolated fixture evidence with a nonproduction owner bridge, not normal HTTP/session authorization evidence.

This review rehashed 3,070 entries across the original baseline and final inventory, applying exactly the six recorded accepted source hashes: zero missing files or mismatches. Entries can overlap; this is not a unique-file count. Historical preservation still records 2,019 unchanged baseline files, six authorized modifications and no deletions. Current HEAD at review is `87edf535cbe197c7defba822104bd853eec8c098`; the historical report's HEAD `468ed031ac864fba9abc8b4c5f28d4fa8f79e8dd` is retained as historical evidence. No commit or synchronization was performed in this review.

## Normal application: concrete protected-operation decision

No listener was found on normal default ports 5174 and 4090. The ordinary development server was not started because the normal Builder source path implicates operations excluded by this authorization:

- `src/server/index.ts` handles workspace GET using `withApplicationMutation(appPath(key), ...visualWorkspace(...))`.
- `src/server/composition-lock.ts` enters `withRoleBundleGraph` at the existing platform `components` root.
- `src/server/visual-artifacts.ts` `visualWorkspace` lists Pages, Components and Shells with default options. `VisualArtifactService.list` calls `recoverRoleBundleRoot`; `read` calls `readRoleBundle` with default options.
- Development identity/Builder startup can also instantiate existing SQLite identity and application registries. No environment and authorized target were admitted for those operations here.

An apparently read-only UI visit therefore cannot be asserted recovery-free or free of existing lock/store operations. No workspace request, saved-target read, recovery, lock/journal modification or alternate identity was attempted. No product correction is justified by an observed normal-UI failure. Bypassing the graph or disabling authorization would violate scope.

The exact blocker to one authorized real saved Card is an admitted normal application/session and target Page whose existing ownership, read/write/dependency authorization and expected saved hash can be checked through a source path qualified for this no-recovery/no-existing-protected-lock boundary. The normal workspace path above has not met that condition. Edge automation is not the prerequisite. Resolving this storage/security admission decision requires separate authorization; this review does not restart D6-A1 or D6-R2.

## Browser diagnosis and manual normal-application procedure

Both retained Edge attempts fail before application loading. The first reports a closed browser, crashpad pipe termination and temporary profile site-list replacement failures, then exit code 0. The fresh persistent-profile attempt reports crash-server launch failure and exit code 3221225477 (0xC0000005). USB access and termination-cleanup errors are also logged. These logs do not establish a root cause or a Builder defect. No further launch, permission/token/elevation change, Windows investigation or recovery action was performed.

Default local entry URL: **http://localhost:5174/**. It is not currently verified live; the launcher may select another free port. Once a normal server/environment is separately admitted, use its printed `UI Platform` URL in an already running normal browser. No automation is required. There is no verified target-specific URL because no real Application/Page was opened.

1. Sign in through the existing authorized session; select the authorized Application and its Builder Page. Confirm the intended owner and read/write access. Stop on recovery or source admission errors.
2. Add UI Base Card. In Properties set a distinctive heading such as `V1 saved Card A`, a supported variant/density and body text. Save and wait for successful completion. Reload; confirm identity and all values persist.
3. Open the existing **design Preview**. Confirm the saved heading/body and actual Card rendering. Record Application, Page locator, node ID, save response hash and Preview request hash; those hashes must match.
4. Disable autosave using the existing control if available, or avoid a draft comparison until it can be disabled. Change the heading to `V1 unsaved Card B` without saving. The already opened saved Preview must still show A; dirty Preview initiation must be refused. Reload/discard the draft using the existing UI and confirm A remains saved.
5. Repeat Add, Properties edit, Save, Reload and design Preview for UI Base Panel. Record its node ID and matching saved/Preview hashes. Capture visible results and relevant successful requests without credentials.

These are pending manual steps, not claimed passes. Normal application Card/Panel workflow and normal HTTP saved-only Preview remain unverified.

## Preservation, changes and stopping point

This review adds only this closure addendum. No product source fix, second instance store, renderer, activation mode, publication mechanism or compatibility framework was introduced. Existing server ownership, authorization, saved hashes, component allowlisting and rendering remain unchanged. Existing Pages, legacy values, failed evidence and disposable interrupted fixtures are preserved.

Accepted source inventory remains the six files in the historical verification: shared `source.ts`, `model.ts`, `validation.ts`, `runtime.ts`, client `editor.ts` and test `visual-source-barrel.ts`. Existing new tests/verifier and evidence remain enumerated by `v1-html-first-files-20261026.json`; that inventory is not rewritten to include this addendum.

Design Preview is validated only within the retained isolated fixture scope. The restricted production Preview provider remains unavailable and unqualified pending its separate security and delivery requirements.

Stop: **concrete protected-operation/security decision before V1 Working Builder Workflow — Acceptance Review Gate**. HTML-first is closed; working normal-application Builder acceptance is pending. No broader WP5-F, D6 or WP5-I acceptance is implied.
