# WP5-F — WP5-C initial insert diagnostic review

2026-10-19. **Historical cause remains unidentified. D6 remains blocked by the preserved 500/501 complete UI result.** One authorized focused reproduction passed its original initial-insert assertion. No corrective implementation or further run follows this report.

## Historical evidence and limits

The preceding `builder-v1-wp5-f-publication-final-ui` evidence retains `full-ui.log` (lines 872–886), `results.json`, and the saved WP5-C browser attempt. The failure is the initial insert at `tests/builder-v1-wp5-c-browser.test.ts:161`, before Workflow authoring or the previous Save Now checkpoint. The assertion records `success:false, committed:false`; its abbreviated object display omits additional response properties. The browser attempt cannot reconstruct a server-to-server operation response. Existing fixture cleanup removed that run's temporary host state.

Consequently, that failure's complete HTTP status/body, typed errors, operation/correlation identifiers, precise transaction phase, applied Dataset and policy snapshot are unavailable. No retained normal-host log correlates a typed rejection with that insert. The existing booleans alone cannot distinguish validation, authorization, admission, storage, readiness or transport causes. They do not establish an expected rejection, a product defect or a test-setup defect.

## One focused reproduction

Evidence: `evidence/builder-v1-wp5-f-wp5c-insert-diagnostic/`. The normal, non-administrator run was 2026-10-19 21:15:03–21:15:37 local time. `results.json` records **1/1 passed** (test 28.827 seconds). This was the original journey prefix through the initial insert, not the full WP5-C journey or a complete UI suite. No second reproduction was performed.

The diagnostic clone retained the original setup, Application creation, Dataset authoring/Apply, original User, records, initial assertions, normal host construction, cleanup and declared test timeout. The initial assertion is verbatim (`generation.json`). Observers captured existing request/response bytes without supplying identity, changing production behavior or adding a readiness wait. State reads occurred after the operation response. The request observer intercepted existing data emissions without putting the stream into flowing mode early. SQLite snapshots used read-only connections. Diagnostic I/O and wrappers can affect scheduling, so this passing run cannot exclude a workload-dependent failure.

The temporary executable test was archived as `instrumented-test.ts.txt`; it is no longer under `tests/`. `accepted-test-before.ts.txt` and its SHA-256 verify that the existing accepted test was unchanged during this phase. There were no retries, artificial delays, new timeout budgets, fixture bypasses, production edits or configuration changes.

`observations.jsonl` references:

| Line | Observation | Result |
| --- | --- | --- |
| 1 | Normal host POST `/operations`, 01:15:35.608–01:15:36.389 UTC | HTTP 200, committed |
| 2 | Platform POST `/api/apps/wp5c-created/application-data/operations`, captured 01:15:36.405 UTC | HTTP 200, identical operation response |
| 3 | API stdout/stderr available at response | Retained for correlation; not an internal engine phase trace |
| 4 | Source/applied schema, host configuration, policy, resources and storage snapshot | No snapshot errors |

Both HTTP responses contain operationId/correlationId `2f96d69e-837c-4320-9953-619b2694a36c`, `success:true`, `committed:true`, `commitOutcome:committed`, and counts requested 2 / succeeded 2 / failed 0 / unknown 0. No typed operation error was returned. The normal-host wrapper's empty `getHeaders()` snapshot does not prove headers were absent: the platform observation retains the actual JSON/no-store response headers.

## Captured state and original authority

These are observations of the passing reproduction, **not reconstructed historical failure state**:

- Application `f7315afb-5596-474b-aa2a-e06fdb384637`; Dataset `359c85d5-fd6a-4e6d-a2aa-5a9f334bf479`; original User `usr_80831c82612048e9bca61a5012dc7063` (Page and Form Editor).
- Source schema has required `id` (id type) and `name` (string). Normal registration uses primary key `id` and required string fields `id`/`name`. Publication version 1 checksum `sha256:a7ecbb3f4856bba5f771a87e2f31fab122a411c089514f217676107b96155c76`; application ledger reached `applied` at 01:15:35.039 UTC, before insert.
- Insert maps to create permission `dataset.create`; field writes map to `dataset.write`. Existing policy includes the active original-User role path and Application-descendant allow rules for these permissions. Policy revision 5 document digest `sha256:5c3462099c53befe5ce6df7b2154d7f93bfe781c05f59a7b0b43bb3251d0f1f0` matches the forwarded signed original-User claim. Observational HMAC comparison reports true. No alternate actor or authorization context was supplied.
- Resources snapshot contains active Application, Dataset and both fields with matching ownership/parentage. Applied generation is `51df5936-72e3-4401-b925-f4518852fc84`.
- The intended Application/Dataset ORM JSON contains exactly `[{"id":"selected","name":"Ada"},{"id":"unrelated","name":"Keep"}]`. Thus actual requested values reached the intended storage in this run, rather than merely receiving a success response.

Sensitive identity keys, tokens and nonces are redacted in the diagnostic copy. Original records and User identity are retained.

## Component analysis and confidence

`src/server/application-data-proxy.ts` forwards the signed original User to the registered normal host and preserves structured operation outcomes. The normal Data Services handler authenticates the request and invokes the secured operation engine. In `../UI Platform Data Services/packages/dataset-operations/src/secured-engine.ts`, `outcome()` (lines 69–76) includes typed errors and commit outcome; the write catch at lines 352–363 distinguishes post-commit failure, unknown commit outcome and earlier rollback/rejection. The failed assertion did not preserve those discriminating fields. `committed:false` by itself does not prove rollback or a particular pre-commit phase.

The focused run demonstrates readiness sufficient for this request, successful validation/security admission, commit and preserved transport. It does not eliminate intermittent readiness, authorization revision, admission, storage or transport issues in the historical full workload. No graph-lock timeout, Windows filesystem cause or watcher causal relationship is demonstrated.

The initial operation/assertion and normal-host integration exist in the accepted pre-D6 history (`722ef6d`, 2026-10-18); the relevant Data Services engine is in accepted checkpoint `81b769e`. Their existence predates D6. **Whether the failing behavior predates D6 is unknown.** No before/after failing response pair exists. Confidence is high in the captured successful operation and in the historical evidence gap; confidence is insufficient for causal attribution.

## Next gate and inventory

No correction is evidence-supported, and no architectural change is proposed. Recommend **WP5-C diagnostic review**, retaining the blocked 500/501 result. The smallest next investigation would retain this bounded response/state instrumentation during a separately authorized workload capable of reproducing the rejection, preserving typed error/correlation/phase evidence at the instant of failure. Do not repeat a complete suite merely seeking green. Internal failure-phase instrumentation may be needed only if the complete response still leaves ambiguity. Any product, lifecycle, security or persistence correction requires separate implementation authorization and regression tests selected from the demonstrated cause.

All additions are listed and hashed in `builder-v1-wp5-f-wp5c-initial-insert-diagnostic-files.json`. This phase adds only this report, its inventory and the separate diagnostic evidence directory. Existing production code, tests, configuration and prior evidence are unchanged. Preservation comparison results are in `preservation.json` in the new evidence directory. No commit, push, GitHub synchronization, security implementation, focused preview, WP5-G or WP6 work. All 40 umbrella requirements remain unchecked. D6, WP5-F and WP5-I are not accepted or closed. **Stopped at WP5-C diagnostic review.**
