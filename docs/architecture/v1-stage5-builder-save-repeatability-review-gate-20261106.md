# Stage 5 Builder/Save Repeatability Review Gate

**BLOCKED. The historical `field3` discrepancy has not been reproduced or attributed. No Builder/save product defect has been demonstrated or corrected. Stage 5 and overall UI Platform V1 remain open.** New supported-control verification follows permanent field IDs through editing, save, reload and canonical application. It improves the location of future failures; it is not evidence that the original cause was fixed.

UI Platform remains on `main` at `d3729a13c8312d35be4fe61b784f84f9e3bd4446`; Data Services remains at `81b769eef3763d02343f5347888c26edab6ef7bc`. Existing uncommitted Stage 5/WP3 changes are retained. This report continues [the private-access/clock gate](v1-stage5-private-access-clock-qualification-review-gate-20261106.md). Evidence, per-attempt source identities and SHA-256 inventory are under `evidence/v1-stage5-builder-save-20261106/`.

## Cause and first divergence: known limits

The historical private/clock package's `journey-001` first observed the discrepancy when reading the authoritative saved `dataset.json` **after validation and application**: `id,name,quantity,field3` instead of `id,name,quantity,active`. That original run did not retain input events, working-copy generations or save request/response definitions. Its evidence cannot identify whether the rename was never delivered, was lost during editing/save sequencing, targeted an unintended control, or was corrupted later. **The first divergent operation, and whether it belongs to product or automation, remain unknown.**

The ordinary Add field operation creates a new permanent UUID with a provisional key such as `field3`. Renaming changes only that field's `key`; type and required edits locate it by UUID. Consequently, the historical name is consistent with a provisional key remaining at save, but this is an inference from the code, not proof of a lost browser input or a save defect. No test expectation was changed to accept `field3`.

Source review followed the input handler in `dataset-editor.ts`, `EditorRuntimeContext.setFile`, the shared working copy, `EditingLifecycle` generation/candidate/baseline reconciliation, artifact transport and editor-shell rendering/focus restoration. Input commits synchronously into the shared source; autosave and manual save use the same lifecycle. The shell rebuilds controls on context notifications and attempts to restore focus by stable editor key. These facts identify relevant boundaries, but do not establish a specific historical race.

| Candidate explanation | Evidence and conclusion |
| --- | --- |
| Lost or incomplete browser input | Possible historically; no original event record. New traced input events contain `active`, on the expected permanent UUID, followed by saved `active`. Not reproduced. |
| Autosave/edit sequencing | Relevant because saves and rerenders are asynchronous; no observed saved response reverted the new key. Existing lifecycle/autosave regressions pass. No proven defect. |
| Test synchronization | Original test used positional locators and checked the names only after apply. That late assertion prevented precise attribution. New immediate checks and ID-based locators improve this gap without retrying edits. They do not prove it caused `field3`. |
| Name versus permanent-ID confusion | New traces and canonical comparisons retain the same UUID while changing only the key. No confusion observed. The original run lacks the corresponding pre-edit identity record. |
| Persisted-definition corruption or failed save | No reproduction: new save responses, direct read-only authoritative-file checks, server reload and applied canonical identities agree. No product fix is justified by the available evidence. |

## Traced field evidence

`trace-001` records `active` under permanent field ID `c094217c-9802-4742-9db3-3b652e78ba22`. Its event sequence is:

1. Sequence 27: before-fill controls contain provisional `field3` under that UUID.
2. Sequences 28–30: focus, beforeinput, then input value `active` on the connected control; editing status is Unsaved.
3. Sequence 33: after-fill read-back shows `active`, with the same UUID.
4. Sequences 34–38: type `boolean` and required `true` are delivered through their controls.
5. Sequence 40: authoritative HTTP 200 definition response contains that same UUID, key `active`, type `boolean`, required `true`.

This run passed the original saved-name assertion and Dataset apply. It later failed at Form execution, separately described below. `trace-001` did not capture PUT request bodies because the first observer selected POST only; its DOM and definition-response evidence remains valid. The observer was corrected for subsequent attempts, and its exact variants are retained.

`trace-002` adds 40 supported rename/type edits on the fourth field. All **43 expected field-name input events** were recorded: the three initial names plus 40 extra edits. Its save request retained `active`, boolean/required and the same fourth-field UUID. This stress experiment did not reproduce `field3`; its later Form failure is not a Builder failure. `trace-003` repeats that experiment with additional redacted security tracing. None is presented as a deterministic before-failing regression for the original discrepancy.

## Bounded test workflow change

Production Builder, persistence, HTML-first presentation, autosave configuration, permissions and publication code are unchanged. The affected Stage 5 test now:

- Observes one additional field after Add field, captures its permanent UUID, and uses the existing stable editor-focus key to locate it after rerenders.
- Fills its expected name once and observes read-back before proceeding; selects type and required through supported controls and observes both. There is no edit retry or direct source/database seeding.
- Uses the existing manual Save now control and Saved status, then reads the authoritative definition without writing it. It compares exact UUID/key/type/required tuples.
- Uses Compare with server → Reload server source, checks the same controls and exact persisted definition, then validates and applies through the existing controls.
- Confirms source field identities survive apply and, in the integration fixture, match the Data-owned canonical field-ID/key mapping before service startup and Form execution.

The resulting `builder-field-identity.json` and `canonical-field-identity.json` preserve the relevant definitions. Existing mapped Form generation, publication A after draft B and protected runtime expectations remain unchanged.

The first version of the new assertion helper incorrectly nested an already editor-scoped locator inside a relative `has` filter. `journey-001` and `full-001` deterministically timed out finding the Data type control. This is a **new test-helper defect introduced during this investigation**, independently identified and corrected to use the selected input's actual label/article ancestors. It is not the cause of the historical `field3` result. Later attempts pass that boundary; their whole-journey outcomes remain separate.

## Fresh refusals and security boundary

`trace-001` and `trace-002` later failed because the Form's result did not contain Visible A. Their retained runtime result reported `PROTECTED_REQUEST_DENIED`, not committed. Their first internal denier was not instrumented, so they are not retrospectively labeled clock failures.

**`trace-003` establishes the first rejecting component for its own Form request.** Correlation ID `b779515a-a2c7-456a-9e4a-a1d9500a5b79` links browser runtime `/runtime/execute`, Data current checks and the nested `/sessions/status` RPC:

- Runtime receiver PID 44160 rejected the RPC in `ServiceRpcVerifier.authenticate` / pinned JWT verification: `ERR_JWT_CLAIM_VALIDATION_FAILED`, claim `iat`, reason `check_failed`.
- The rejection event records `iat = 1793990849`, `exp = 1793990864`, receiver `Date.now() = 1793990848999` ms: issue time was **1 ms in the receiver's future** at the recorded rejection sample. The original 15-second span is intact.
- The remote session-status adapter returned false, Data `iam.session-current` recorded false, `SecurityAuthorizationEvaluator.assertCurrent` failed, and the Data handler returned the protected refusal. This is fail-closed behavior; no grant or ownership relaxation is indicated.

Cross-process records are correlated causally. Process-local monotonic clocks are not treated as an exact shared timeline. Tokens, cookies, credential files, enrollment bodies and private asset bytes are absent from retained trace records. Temporary security diagnostics affect disposable copies only, use the existing IPC collector and do not widen the runtime filesystem permission.

`journey-002` passed supported field edits, exact save/reload identity checks, Dataset apply, mapped Form creation and canonical identity comparison. It then failed starting the management process with `SERVICE_RPC_UNAVAILABLE`. Its original failing RPC has no first-denier trace. That failure remains qualified independently of the traced Form refusal. No security or timing change was made to obtain a pass.

No clock tolerance, clock authority, JWT-policy change, I-AM/WP3/evaluator relaxation, proof-budget change, RPC deadline increase or write retry was implemented. The accepted single-sample RPC construction and owner-snapshot/fresh verification correction are byte-identical to the preceding package. The new 1 ms request-specific refusal strengthens the need for the separate timing-policy decision already documented; it does not attribute the historical private-metadata 403.

## Verification results

Each physical target has its own source/test hashes, credentials, stores, result and preservation record. `attempts.json` and individual review evidence retain every run. Passing subsets are not combined into an overall pass.

- `editing-001`: **105 passed**, plus **63 focused WP3 tests passed**. Existing editing lifecycle, undo/redo, in-flight generations, autosave/manual-save, editor context/properties and client/server security contracts remain covered.
- `trace-001`, `trace-002`, `trace-003`: each reached valid saved/applied fields; each later failed Form execution. Only `trace-003` has the specific first-denier attribution above.
- `journey-001` and `full-001`: failed the new helper's locator, corrected as described. `full-001` separately passed **45 Platform tests**, with **one browser failure and one existing skip**; **151 I-AM tests passed**. Its Stage 1–4 results remain individual passing observations, not an overall pass.
- `journey-002`: fresh uninstrumented journey failed at management process startup after Builder/save/reload/apply/Form/canonical checks passed.
- `full-002`: final uninstrumented full run passed **45 Platform tests and 151 I-AM tests**, but failed the Stage 5 Form write with **`PLAN_EVIDENCE_STALE`**, not committed; one existing test remained skipped. The browser reached and passed the new Builder/save/reload/apply/canonical assertions. Its own first stale predicate was not traced. In the pinned, unchanged I-AM source this error is emitted at two predicates in **`SecurityAuthorizationEvaluator.assertPlannerCurrent`**: capability/issued-evidence/expiry checks, or current decision/provenance mismatch. This source-based component attribution does not identify which predicate failed or establish a timing cause. The historical stale-plan qualification is now **freshly reproduced**, not resolved.
- `trace-004`: final diagnostic journey **passed in 174.138 seconds**, including 60 additional metadata reads, plus **63 WP3 tests passed**. It verifies publication A after draft B, Form commit/read-back, Viewer restrictions, private transports and open-session role/epoch/User/template revocation. No JWT rejection was recorded. It is instrumented diagnostic evidence, not a passing uninstrumented replacement for `full-002` or `journey-002`.
- Production type/import boundaries passed on the final full-run target. All four UI/Data missing-root and original-root configurations refused before initialization.

The full suite includes relevant retained Stage 1 admission/release/pin, Stage 2 Builder authoring, Stage 3 upload/retained presentation, Stage 4 role administration and Stage 5 security/predicate/RPC boundary checks. Native admission's existing skip remains a skip. The original autosave settings, one-second default proof budget, 15-second local proof budget, three-second service-RPC timeout and 15-second transport deadlines remain unchanged.

## Qualification matrix

| Item | Current local evidence | Remaining qualification |
| --- | --- | --- |
| P1 | Existing local User/enrollment integration and provider cryptographic fixtures retained | Actual Auth0 plan/tenant/MFA/enrollment/provider lifecycle open. |
| P2 | Current-session checks and a precisely traced fail-closed future-`iat` refusal | Cross-process clock availability, untraced startup/Form refusals and historical private 403 remain blockers; target HTTPS/provider lifecycle unqualified. |
| P3 | UUID-based edit/save/reload/apply and canonical mapping observed; frozen publication checks retained | Historical `field3` cause unresolved; whole-journey repeatability, target serving/release/schema ownership, packaging and final CSP open. |
| P4 | Separate local credentials/processes, read-only runtime capability and import/route boundaries retained | Ubuntu accounts/ACLs/network/Caddy/distribution and credential custody unqualified. |
| A3 | Existing private index/hash/version, ranges/HEAD/no-store and refusal tests retained | Historical private-metadata 403 unattributed; production asset owner/storage/custody and downloadable ZIP verification open. |
| I1 | Existing provision/onboard and explicit runtime grants retained | Production identity/enrollment pending. |
| I2 | Finite template/WP3 stage/activate/refusal/audit contracts retained | Independent Data maintainer review and production management qualification pending. |
| I3 | Supported Dataset/Form/Page controls; stronger permanent-ID witnesses | Historical saved-field cause remains unknown; production/shared-scope qualification open. |
| I4 | Existing successful Viewer row/field/write restrictions retained | Fresh complete repeatability and real identity/application/asset qualification remain open. |
| I5 | Existing public Page/protected route separation retained | Target proxy/cache/site inventory and fresh complete repeatability remain open. |
| I6 | Revocation checks retained; new current-session failure is fail-closed | Stale-plan freshly reproduced with its exact predicate untraced; unexplained refusals, provider-only disable propagation and concurrent real-owner writers remain open. |

## Preservation and stopping point

The preceding inventory has **436 entries**, identified by manifest SHA-256 `318e68dffcb492922994c99f5f6d9a36c5f846d838cd2977a59b3133669309f0`. Every prior entry is byte-identical except the two authorized test workflow files: `tests/stage5-integration.test.ts` and `tests/fixtures/stage5-integration-journey.ts`. All prior production code, dependencies, accepted Stage 1–4 implementation and historical evidence remain unchanged. Data Services' existing four-file WP3 increment is unchanged; no new Data Services source or contract changes occurred.

Preservation records rehash all **23 Component files and 234 native package files**. Completed runs retain equal before/after shared snapshots and zero original lock-directory events. Historical shared-runtime lock protection remains directory-only: no lock body access, acquisition, reconstruction, repair or recovery. UI-Base remains clean/read-only at `732eec58ca3d4bd2521197b9d3b6c0457dbc6608`. Pinned security dependencies, integrity values and install-hook absence are reverified against unchanged manifests.

Exact per-run source variants, redacted diagnostics, test reports and field identity evidence are inventoried. Generated credentials/certificates, runtime stores, physical copies and unnecessary raw diagnostics stay excluded. Temporary input/security diagnostics are absent from final uninstrumented source targets. No Stage 5 closure, production qualification, provider registration, production operation, Stage 6/7 execution, staging, commit or push occurred.

Historical private 403, Windows clock qualification, `PLAN_EVIDENCE_STALE`, Windows downloadable ZIP failure and independent Data maintainer review remain open. Ubuntu behavior was not measured or inferred from Windows.

**Stop at this blocked Builder/Save Repeatability Review Gate.** The historical cause and first divergent operation remain unproven; the new witnesses will localize a recurrence, but no speculative product correction or original before/after fix is claimed. No Stage 5 integration acceptance is requested.
