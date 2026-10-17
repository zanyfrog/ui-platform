# WP4 hidden-field submission reconciliation

**BUILDER V1 WP4 — ACCEPTED AND CLOSED**, 2026-10-16, by the user following final hidden-field reconciliation review.

## Final closure record

Accepted evidence: **387/387 UI Platform, 756/756 Data Services, 146/146 editor/storage contracts**; builds, typechecks, production exclusion and focused hidden-field renderer/protected persistence tests passed.

Conditional visibility alone does not exclude retained mapped values from submission. Host restrictions, operation applicability, read-only behavior, calculated-field persistence and DOE/I-AM authorization retain separate semantics; mandatory Dataset validation is preserved.

Retain the concurrent source-reader contention limitation. Closing Builder before Application startup is not proof of contention-free simultaneous operation. WP3 restart tests plus WP4 Application reload suffice for WP4; A37 full management-restart/browser evidence remains required at final acceptance.

WP5 is authorized for [planning and architecture reconciliation only](builder-v1-wp5-plan.md). Stop at planning review; no WP5 implementation is authorized. Complete Builder V1 acceptance remains separate. Do not reopen or expand WP4 without a separately reviewed reason. Historical planning, review and unsuccessful verification records below are retained; earlier gates are superseded by this user closure.

## Inspection and correction

The reviewed implementation retained values in `state.values` when modes/conditions changed. However, `formPayload` explicitly skipped `visible === false`, and `attachFormRuntime` also converted missing controls or hidden ancestors into payload exclusions. Thus a retained condition-hidden value was omitted; the implementation did not meet the established contract. The earlier generic adapter check changed only a visible field while other values were unchanged or host-denied. It did not prove writable hidden-field submission.

The corrected runtime constructs payloads from retained mapped state, without consulting presentation visibility or DOM presence. `effectiveField` derives runtime-only submission eligibility from existing operation and host restrictions. No eligibility flag is saved into the Form definition. Existing source formats, identities, validation, renderer and DOE/I-AM remain authoritative.

| Concern | Final behavior |
| --- | --- |
| Conditional visibility, hidden ancestors, mode/field visibility | Preserve values. Visibility alone never excludes a mapped value. A removed control remains eligible through its retained state. |
| Create | Include defined eligible mapped values, including hidden values; use the existing primary-key creation behavior. |
| Edit | Include permanent record identity and changed eligible values, including hidden changes. Unchanged hidden values are retained without resending them. |
| Ordinary read-only fields | Retain values in state; exclude ordinary writes. Visibility does not override read-only behavior. |
| Host read/write restrictions and global read-only/disabled state | Independently restrict submission, including persisted calculations. Read-denied values cannot become writable merely because visibility filtering was removed. The runtime restriction is supplemental; protected DOE/I-AM authorizes requests independently. |
| Create/edit applicability | Continue to exclude fields outside their declared operation, independently of visibility. |
| Calculated fields | Remain noneditable. Include persisted computed values even when hidden; exclude display-only calculations. Host-denied/unreadable calculations or dependencies cannot bypass restrictions; protected DOE verifies final persisted values with the existing shared evaluator. |
| Required/type/Dataset validation | Remains active for hidden fields. Hidden missing/invalid required values block submission. Visibility never waives Dataset constraints; protected mandatory validation and denied-write unchanged-storage checks remain. |

## Verification

| Check | Result |
| --- | --- |
| Focused Form contract and real Form browser integration | **35/35 passed**, including 12 Form contract tests, 20 editor lifecycle tests and three Form integration tests. [Machine results](evidence/builder-v1-wp4-hidden-fields/focused-results.json), [run log](evidence/builder-v1-wp4-hidden-fields/focused.log). |
| Actual renderer hidden-field assertions | **23 browser assertions passed**, including create/edit direct-condition, ancestor-condition, mode-hidden, hidden calculated, host-denied and hidden required-field cases. [Captured assertions](evidence/builder-v1-wp4-hidden-fields/renderer-checks.txt). |
| Full UI regression and actual Builder/protected browser journey | **387/387 passed** across 58 files; exit 0. [Machine results](evidence/builder-v1-wp4-hidden-fields/ui-results.json), [run log](evidence/builder-v1-wp4-hidden-fields/ui-regression.log), [browser ledger](evidence/builder-v1-wp4-hidden-fields/acceptance.json). The ledger records the hidden field identity, created/edited values and reader setup. |
| Protected Data Services regression | **756/756 passed**, exit 0; no backend source changes. [Machine results](evidence/builder-v1-wp4-hidden-fields/data-services-results.json), [run log](evidence/builder-v1-wp4-hidden-fields/data-services-regression.log). Backend [build](evidence/builder-v1-wp4-hidden-fields/data-services-build.log) and [typecheck](evidence/builder-v1-wp4-hidden-fields/data-services-typecheck.log) passed. |
| Editor/package/storage contracts | **146/146 passed** across 15 test files. [Run log](evidence/builder-v1-wp4-hidden-fields/editor-contracts.log). |
| Typecheck and build/production exclusion | Passed after the final runtime/lifecycle changes; records are [typecheck](evidence/builder-v1-wp4-hidden-fields/typecheck.log) and [build/production](evidence/builder-v1-wp4-hidden-fields/build-production.log). |

Evidence is recorded separately under `evidence/builder-v1-wp4-hidden-fields/`; original accepted/reviewed machine evidence is preserved.

- `wp4-form-contract.test.ts`: hidden create and changed edit values; unchanged edit omission; read/write/global-read-only and operation restrictions; ordinary read-only exclusion; hidden persisted versus display-only calculations; host-denied calculation exclusion; hidden mandatory/type validation.
- `references/form-data/src/checks.ts`, exercised by the actual Edge Form integration browser test: create/edit with direct and ancestor conditions removing controls, mode-hidden email, hidden persisted calculation, host-denied field, reveal/value retention, and hidden required-field submission failure before adapter invocation. These adapter captures prove runtime payload semantics; they are distinguished from persisted DOE evidence.
- `builder-v1-wp4.test.ts`: actual Builder-authored Date control is populated, condition-hidden, submitted into isolated protected storage, reloaded, edited while visible, hidden again and persisted. Protected read-back and the real storage file prove both values. Existing forged-calculation rejection, normal/test storage separation and normal Application browser submission remain.
- Full UI regression, emitted editor/storage contracts, typecheck, build and production exclusion passed before returning to the closure gate. Existing protected DOE regressions were rerun; no backend implementation changed.

## Unsuccessful attempts

The first focused run passed all 12 new/existing contract tests but encountered an existing authoring source-conflict failure and a reference-page reload while browser assertions were being extended. A second run proved both hidden Date writes through real DOE/storage, then hit an existing bounded runtime graph lock during normal Application loading; the new reference harness also correctly failed WP2's managed-revision guard because it cloned managed metadata. The harness was corrected to generate a fresh explicitly identified test artifact through the existing generator. No revision guard, source conflict, lock or assertion was bypassed. The focused stable-source rerun passed 15/15; after the verification repair below, 35/35 passed. Both unsuccessful result/log pairs are retained in the evidence directory; they are not counted as passes.

## Lifecycle verification repair

An aggregate run passed 383/385 but failed the WP4 authoring save and an existing Windows watcher rename (`EPERM`). Investigation found that a stale watcher notification temporarily marks a dirty editor as conflicting; when the authoritative reload proved the checksum unchanged, the state was restored but the temporary failure message remained. That suppressed autosave and could replace an earlier real error. The repair restores both prior state and prior failure only after confirming the unchanged authoritative baseline. Changed source still conflicts; genuine prior errors remain errors and are not retried automatically. Two focused regressions fail against the original behavior ([before-fix evidence](evidence/builder-v1-wp4-hidden-fields/stale-watch-before.log)) and pass with the repair. The existing conflict/recovery/security contracts are rerun. The browser journey also waits for the explicit Dataset-linked completion status before proceeding to mapping controls.

## Existing source-busy read boundary

After the lifecycle repair an aggregate run passed 386/387; the remaining failure was normal Application initial loading exceeding the existing bounded coherent-reader wait, with the explicit `Artifact is locked by another writer.` overlay. An intermediate fixture tried bounded explicit browser reloads for that exact read failure; repeated reloads did not clear the overlay in that run. Those results are preserved, not counted as passes.

The final browser journey confirms all authoring source saves and closes the completed Builder tab before opening the normal running Application. This stops its periodic source-graph captures from competing with initial Application compilation. It still uses the ordinary protected Application and shared renderer, verifies unchanged storage before Submit, submits once and reloads the Application afterward. No source lock, reader bound, authorization, renderer or mutation-retry behavior is changed. Concurrent active Builder polling/runtime initial-compilation contention remains a documented boundary; the revised journey does not claim to eliminate or verify that concurrency case.

The final preflight also exposed a 15-second browser wait expiring while the editor was still `Saving`. The wait is now bounded at 60 seconds and still requires the same explicit `Saved` status; no save is automatically repeated. Its failed diagnostic is preserved in `failed-browser-timing-results.json` / `.log`.

## Host suspension

A later aggregate attempt was interrupted by a long host suspension: it ran for 14,771 seconds and produced timeout/cleanup failures in WP4 and the workflow browser suite. That attempt is preserved as `host-suspension-results.json` and `host-suspension.log` and is not counted as successful evidence. The final run uses a temporary per-process Windows idle-sleep guard and restores it on exit; no permanent power configuration is changed.

## Evidence boundaries and program scope

The user accepts the existing WP3 restart regression plus WP4 Application reload for this package. Full management-restart/browser verification remains required for A37 in the final reference journey. This reconciliation does not claim that additional verification.

The [umbrella checklist](builder-end-to-end-v1-acceptance-checklist.md#deferred-program-scope-after-wp4) explicitly retains the deferred composition, Page, Menu, Trigger, Workflow, branding and other UI-only requirements. Its end-to-end boxes remain unchecked. The conditional review and reconciliation led to formal WP4 closure by the user on 2026-10-16. Complete Builder V1 acceptance remains separate; only WP5 planning is authorized.

Review the exact [changed-file inventory](builder-v1-wp4-hidden-field-files.txt) and [implementation hashes](evidence/builder-v1-wp4-hidden-fields/implementation-hashes.json). No backend source changed.

All 41 prior WP0–WP4 evidence files were restored byte-for-byte and SHA256-verified. See the [preservation record](evidence/builder-v1-wp4-hidden-fields/prior-evidence-preservation.json). The [scope reconciliation record](evidence/builder-v1-wp4-hidden-fields/scope-reconciliation.json) confirms all 40 ordered umbrella requirements remain present and unchecked.
