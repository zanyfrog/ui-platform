# Builder V1 WP4 — Verification

2026-10-16. **READY FOR ACCEPTANCE REVIEW — WP4 is not accepted.** The approved plan authorizes implementation and verification, with final acceptance reserved for review. WP0–WP3 contracts and documented limitations remain intact; complete Builder V1 acceptance is not claimed.

## Recorded checks

| Check | Current result |
| --- | --- |
| Full Data Services regression | 756/756 passed; zero failed; exit 0. [Machine results](evidence/builder-v1-wp4/sibling-results.json) |
| Focused generic editor / Form contract / coordinator checks | 28/28 passed; [machine results](evidence/builder-v1-wp4/editor-focused-results.json). |
| Actual browser acceptance journey | Passed; [browser results](evidence/builder-v1-wp4/browser-results.json), [journey ledger](evidence/builder-v1-wp4/acceptance.json). Five targeted browser tests passed, including the full WP4 journey. |
| Full UI Platform regression | 377/377 passed across 58 test files; zero failed; exit 0. Final isolated serial execution. [Machine results](evidence/builder-v1-wp4/ui-results.json), [run log](evidence/builder-v1-wp4/ui-regression.log). |
| Builds, typechecks, emitted editor/storage contracts and production exclusion | UI typecheck and build/production exclusion passed; emitted editor/package/storage contracts 144/144 passed. [Typecheck](evidence/builder-v1-wp4/typecheck.log), [build/production exclusion](evidence/builder-v1-wp4/build-production.log), [contracts](evidence/builder-v1-wp4/editor-contracts.log). Data Services [build](evidence/builder-v1-wp4/data-services-build.log) and [typecheck](evidence/builder-v1-wp4/data-services-typecheck.log) passed. |

## Browser and evidence provenance

`tests/builder-v1-wp4.test.ts` uses actual Edge/Playwright interactions with the ordinary Builder, an API-created Standard Application, explicit existing trusted security setup/stage/activate, UI-created Dataset fields and existing Apply/Connect. The Form authoring journey does not paste or edit source JSON. Programmatic protected calls supplement browser proof for forged calculations, normal-store update/read and unchanged-storage comparisons; they do not replace browser authoring acceptance.

The scenario covers blank Form creation, canceled Dataset creation, A18 configure/save/apply/connect/return-link, mapping and explicit JSON handling, stable identities and Undo/Redo, typed condition/calculation controls, nonpersisting preview, isolated create/read/edit, calculated-value tampering, separate normal/test storage, Dataset-based Form creation and existing Page insertion/running Application submission. The successful ledger includes canceled and failed Dataset creation, stale-origin refusal, invalid JSON draft preservation and blocked submission, actual Dataset-based Form creation, Page insertion, protected running-Application browser submission and reload. Screenshots were visually inspected: [rules](evidence/builder-v1-wp4/form-rules.png), [isolated submission](evidence/builder-v1-wp4/isolated-submission.png), [running Application](evidence/builder-v1-wp4/running-application.png).

## Unsuccessful attempts and repairs

- The first sandboxed storage checks encountered Windows temporary-file rename `EPERM`. The authorized elevated rerun exercised the actual storage path; no failing sandbox result was counted as a pass.
- A new Trigger test initially used the wrong fixture context property (`records` rather than `newRecords`); it was corrected, then all 25 focused expression/DOE tests passed.
- Early browser attempts exposed Builder Vite HTML reloads, source-lock contention in preview/read authorization, unchanged blur events that canceled Submit clicks, and preview iframes remounted during generic-shell/session refreshes. Fixes preserve the existing source service and renderer: Builder-only watcher exclusion, bounded coherent read admission, actual-value change detection, stable same-session handling and a persistent workspace preview surface.
- Some runs exceeded timeouts during long host pauses. Later runs temporarily prevent idle sleep for the test process and restore it on exit; no permanent power configuration is changed.
- Browser wait ordering was corrected to wait for the new Form and Page controls after authorized asynchronous workspace navigation. Failed runs are not acceptance evidence.

- The first parallel full UI run passed 366/377; shared source/catalog fixtures collided. Its [failed results](evidence/builder-v1-wp4/failed-parallel-ui-results.json) are preserved. A first serial run passed 375/377, with two browser failures; package builds/contracts overlapped that run, so it is not the final isolated regression. Both browser scenarios then passed in a dedicated five-test run. [Failed serial results](evidence/builder-v1-wp4/failed-serial-ui-results.json) remain available.
- The final editor contract check first encountered a Windows watcher directory-rename sharing `EPERM` (143/144). The unchanged full rerun passed 144/144. [Failed check](evidence/builder-v1-wp4/failed-editor-contracts.log) is retained. No check was skipped or assertion weakened.

## Acceptance evidence reconciliation

| Criteria | Evidence and review boundary |
| --- | --- |
| D1: shared source / WP2 lifecycle | Five-role projection and atomic history tests; full generic lifecycle/security/storage regression; actual shared Form UI authoring. No second source format or manifest. |
| D2: deterministic typed calculation contract | Shared expression tests and protected DOE tests cover typing, bounds, dependencies, cycles, tampering, unreadable dependencies, final Trigger values and stale definitions. Browser authors calculation and condition through typed controls. |
| D3: graceful Date/JSON | Exact ISO Date validation and generation tests; browser explicitly maps JSON, retains invalid drafts across another field change and blocks invalid submission. No Dataset schema conversion. |
| D4 / A18 | Browser cancellation, failed creation and changed-origin refusal, then successful WP3 create/save/apply/connect/return-link. Coordinator tests cover closed/suspended/identity-changed origins. |
| D5: same renderer / protected execution | Browser design preview has no persistence adapter; isolated create/read/edit and tamper denial; normal API create/update/read and running-Application browser submission/reload. Separate real storage files are compared. |
| WP0–WP3 authority and restart | Full regression reruns existing owner/security/apply/connect/CRUD/restart scenarios. This is machine confirmation by the implementing agent, not independent reviewer acceptance. No separate new WP4 management-server restart browser scenario is claimed; WP4 proves Application reload plus preserved existing restart contracts. |
| Full Builder journey | Broad composition, routes, Menu, automation authoring, WP5 and WP6 remain pending. Passing this package cannot check the complete reference-journey boxes. |

Plan and umbrella checkboxes remain acceptance review items, not automatic approvals. The exact [changed-file inventory](builder-v1-wp4-files.txt) separates WP4 changes from preserved pre-existing WP3 work. Prior WP0–WP3 evidence is restored byte-for-byte after the regression rerun; WP4 results are stored separately. All 21 prior evidence files were restored and hash-verified; [preservation record](evidence/builder-v1-wp4/prior-evidence-preservation.json). [Environment and provenance](evidence/builder-v1-wp4/environment.json) identify the implementing agent, installed browser, runtime and repository heads.

Reproduce from `ui-platform`: `npx vitest run --no-file-parallelism`, `npm run typecheck`, `npm run check:editor-contracts`, `npm run check:editor-production`. Run builds and browser regressions sequentially. From `UI Platform Data Services`: `npm test`, `npm run build`, `npm run typecheck`. Existing real browser tests require Edge/Playwright and protected local test setup; the ledger distinguishes that setup from UI authoring.

## Retained limitations

- WP3 remains accepted for planning purposes, with its prior machine evidence subject to independent confirmation. These new executions can recheck baseline behavior but do not claim an independent reviewer's acceptance.
- One Dataset per normal protected host and first apply remain; no migration or multi-Dataset Form/host expansion.
- Calculation operators are the documented typed scalar subset. JSON object mapping is explicit; unsupported JSON shapes are rejected. No arbitrary formula execution or new Dataset constraint engine is introduced.
- Design preview omits persistence services and executable Form functions; it is not a general custom-code sandbox. Normal runtime and explicit protected tests remain separate modes.
- Cross-artifact Undo, arbitrary filesystem readers, unsupported helper patterns and accepted Windows filesystem limitations remain.
- Final WP4 acceptance and the full WP6 UI-only journey require review; passing subsystem tests alone is insufficient.
