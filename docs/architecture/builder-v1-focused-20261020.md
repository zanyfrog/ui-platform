# Builder V1 — bounded focused verification review

2026-10-20, America/New_York. **NOT PASSED; STOP AT FOCUSED VERIFICATION REVIEW GATE.** One invocation of the authorized original 62-test selection stopped on an unresolved-owner failure. **12 passed, 1 failed, 49 not executed.** Native exit **1**, signal null, collector error null; Vitest end reason **interrupted**. No retry, second test run, complete suite, build or unrelated test was executed.

The four original browser journeys (WP4, WP5-B, WP5-D and WP5-E) passed. Source-template composition failed at its original line 91 with `ArtifactOwnerUnresolvedError`, `source.owner-unresolved`, status 503. A different, newly observed zero-byte shared-role lock remains untouched for Customer Summary Card. The missing historical WP5-B lock remains absent. **Do not authorize complete-suite execution from this result.**

D6, WP5-F and WP5-I remain open and unaccepted. All **40** umbrella requirements remain unchecked; none is checked. This record supplements rather than replaces the historical 56/62, 491/501, 500/501 and earlier failed results.

## Prerequisites and scope

Read-only prerequisite snapshots in `evidence/builder-v1-focused-20261020/` are `prerequisite-first.json`, `before.json` and `prerequisite-at-launch.json`. They confirm:

- Canonical anchor `C:\Projects\Modular\ui-platform\components\wp5b-shared-9b12bff2\component.visual.json` still hashes to `eeea95554098a2bf3112bf6532920d01f1393311b2047ed54a37bdb02126e5c5`.
- All five role hashes and file identities match the approved checkpoint. The definition remains artifact `art_70754e07-2ae4-4dbc-a9db-00e1c0281030`, Component `cmp_platform_22ee929c-1bd6-46cd-8d7d-13e278e29a62`. Access times are not treated as immutable evidence.
- The exact expected historical lock and recovery guard are absent, the identity-keyed transaction directory is empty, pending journal is absent, and the Component contains only its five expected roles, without atomic siblings. No normal reader was invoked by preflight.
- Existing UI source/evidence matches the approved checkpoint: **2,332** tracked/nonignored regular files captured, no checkpoint mismatch. All four compiled Foundation storage outputs match the remediation inventory; no rebuild was performed. Another **138** existing Component/compiled-output files were captured, including ignored state.
- Data Services has **158** captured regular files and clean Git status. UI HEAD remains `c86ecb3708fd619791b7f667b02b0c4c673bd686`; Data Services HEAD remains `81b769eef3763d02343f5347888c26edab6ef7bc`. No remote state was queried.

`tooling-reconciliation.json` gives raw hashes and findings for all five pre-existing paths. `scripts/demo-health.mjs` extends reference health to transform modules; `scripts/dev-composition-reference.ts` calls the dependency/build repair helper; `scripts/reference-dependencies.ts` can restore missing reference build inputs and invoke install/build when explicitly called. `tests/demo-health.test.ts` and `tests/reference-dependencies.test.ts` test those helpers. Repository reference/import inspection found those paths belong to demo/reference launchers and their own tests. The selected files start the normal API directly and do not invoke these launchers/helpers. Both tooling test files are outside the explicit selection. **All five remain unchanged and did not affect the selected execution.** This is scope reconciliation, not independent acceptance of that tooling.

The initial conservative launch check returned exit 1 **before starting any test process**, because existing development API consumers were present. Its ordinary-token process inventory is preserved in `native-context.json`. Read-only reclassification identified normal development consumers and no independent Vitest runner. They were left running; none was terminated or reconfigured. `launch-context.json` records that context and a non-administrator token, with null `NODE_OPTIONS`. The only Vitest invocation is marked by the exclusive-create `single-run-started.json`. The earlier prerequisite-check refusal is not a failed test attempt or rerun. Existing development traffic is a workload/confounding factor for contention and actor attribution; this was not a globally quiescent host.

## Exact execution and accounting

Native process PID 32512 ran **12:13:34.690–12:21:40.441 EDT** (16:13:34.690–16:21:40.441 UTC), approximately 485.75 seconds including launch/teardown. Vitest reports 484.59 seconds. The original nine test-file arguments are unchanged from the Foundation integration script:

`application-composition`, `visual-role-reader`, `runtime-refresh`, `workspace-watcher`, `visual-artifacts`, `builder-v1-wp5-b`, `builder-v1-wp5-d-browser`, `builder-v1-wp5-e-browser`, and `builder-v1-wp4`, all under `tests/` with their original `.test.ts` suffixes.

Options remain `--maxWorkers=1 --no-file-parallelism --retry=0 --testTimeout=180000 --hookTimeout=60000`. Existing browser tests retain their own **600000-ms** declarations and original per-action/assertion limits. Test progress confirms retry count 0. The reporter confirms exactly the original nine module specifications; unchanged source hashes preserve the original definitions/assertions. Actual worker scheduling begins with D, WP4, E and B, then composition; CLI argument order does not impose worker execution order.

Only output locations, existing graph telemetry and a supplemental observation/cancellation reporter differ from the old invocation. Evidence uses new paths through the existing `UI_PLATFORM_TEST_EVIDENCE_ROOT`, `UI_PLATFORM_WP4_EVIDENCE_ROOT` and `UI_D6_BROWSER_EVIDENCE_ROOT` contracts. The existing `.wp5-f-temp` scratch location is retained. No production hook, assertion, implementation, configuration file, acquisition budget or test timeout was changed.

| Original selected file | Original tests | Passed | Failed | Not executed |
| --- | ---: | ---: | ---: | ---: |
| application-composition.test.ts | 9 | 8 | 1 | 0 |
| builder-v1-wp4.test.ts | 1 | 1 | 0 | 0 |
| builder-v1-wp5-b.test.ts | 1 | 1 | 0 | 0 |
| builder-v1-wp5-d-browser.test.ts | 1 | 1 | 0 | 0 |
| builder-v1-wp5-e-browser.test.ts | 1 | 1 | 0 | 0 |
| runtime-refresh.test.ts | 7 | 0 | 0 | 7 |
| visual-artifacts.test.ts | 22 | 0 | 0 | 22 |
| visual-role-reader.test.ts | 15 | 0 | 0 | 15 |
| workspace-watcher.test.ts | 5 | 0 | 0 | 5 |
| **Total** | **62** | **12** | **1** | **49** |

The native JSON reports 13 total/12 passed/1 failed/0 pending, because the remaining 49 were not collected/executed before cancellation. They are **unverified**, not passing or product failures. `execution-accounting.json` maps every original test to its outcome; every executed test name belongs to the original selection. `result-summary.json` deliberately has `identical62TestNames=false` because only 13 ran, not because a test definition was altered.

The reporter received the failed result at **16:21:40.343 UTC**, requested cancellation at **.344**, and ended with reason `interrupted` at **.363**. The final publication-snapshot case in the already-running composition worker has diagnostic start **.317** and duration about 21 ms; its reporting event arrived at **.346**. It was already in flight before the main-process stop request. No later module ran after cancellation. Cancellation does not retroactively prevent work already executed in a worker; no new run was launched to finish the remaining cases.

## Original functional checkpoint outcomes

| Checkpoint | Current evidence/outcome |
| --- | --- |
| WP4 Dataset Mapping, native 422, stale-origin/A18 coordination | Full original browser test passed, 165.263 s. Exact `DATASET_NAME_REQUIRED` 422 preserved; applied Dataset, cancel/failure/stale-origin refusal and return-link assertions reached. |
| WP4 Form rules, isolated protected tests, normal runtime persistence/reload | Passed. `wp4/acceptance.json` retains hidden-field, calculation/condition, protected submission and identity assertions. `runtime-transport.json` records HTTP 200, `success:true`, `committed:true`, `commitOutcome:committed`; operation/correlation ID **951b2ce6-7257-4895-b896-c28179b10353**. Protected query returns intended record **db738937-e38c-4b30-8f1e-18310c376301**, name `Browser Application`, quantity 3, price 9, total 27. Source assertions check outbound values, returned identity and reload. |
| WP5-B creation response/original Visual save | Passed, with full original journey in 172.061 s. Definition/instance separation, package bytes, Form read/edit/delete, unrelated-record retention, invalid/denied/revoked requests and unchanged-storage checks reached. |
| WP5-B three actual overlapping rounds | Passed: Builder remains open (`builderClosedBeforeRuntime=false`), each round saves while runtime reload and Problems/graph reads overlap; both read statuses are 200 in all three rounds. Runtime shows the latest saved revision. `wp5b/browser-acceptance.json` retains exact times and identities. This proves the recorded bounded workload, not arbitrary traffic or UI-only provisioning. |
| WP5-D authored Menu tab, branding, Public/Admin runtime | Passed, 43.794 s. Nested Menu/encoded route parameter, stable identities, undo/redo/cancel, portable asset/logo/theme and both Shells reached. Its fixture closes Builder before runtime and explicitly does not supply independent simultaneous-use proof. |
| WP5-E page creation, settings/Problems/refresh/revocation/restart | Passed, 85.718 s. Full `verification.json` includes dirty-editor save, exact-node navigation, independent Problems, dependency refresh, invalid settings handling, legacy 405/CSRF403/stale409, identity/revocation and process restart/reconnect. Application creation succeeded; no publication EPERM failure observed in this journey. |
| Source-template update composition | **Failed** at original test line 91, normal `applyTemplateUpdate` commit shared-bundle reread. Later source replacement/omission/assets/provenance assertions in that case not reached. Other eight composition cases passed, including the separate immutable publication-snapshot check. |
| Reference composition validation, coherent reader, focused refresh and unpublished watcher selections | **Not executed** after the stop. The original reference-validation failure and these regression checkpoints remain unverified on this run. Browser success does not substitute for those 49 tests. |

No WP5-C initial-insert/save test, additional Foundation/Data Services/editor suite, build/typecheck/exclusion check or complete UI suite was run. Their previous evidence remains historical; no extra scope is inferred from successful browser cases.

## Failure and lock/admission observations

The preserved failure stack is `VisualArtifactService.read` (`src/server/visual-artifacts.ts:76`) → `prepareVisualSourcePlan` commit (`visual-source-plan.ts:76`) → `template-updates.ts:89` → original `application-composition.test.ts:91`. Error name **ArtifactOwnerUnresolvedError**, code **source.owner-unresolved**, status **503**. This is confirmed fail-closed role acquisition during a shared-bundle reread. It is not an assertion timeout, stale revision, permission denial or demonstrated Application publication EPERM. It is an in-process source operation, so no HTTP request/correlation ID is emitted for this failing call by the unchanged test; the exact lock filename/read-byte sequence is absent from its error payload.

`lock-lifecycle.jsonl` samples the original target and graph lock using direct filesystem reads at approximately 100-ms intervals, recording state changes, file IDs, owner bytes and times. It captures 609 state changes; 99 concern the original target, including 49 present snapshots. Those captured target owners contain valid numeric PID text; no sampled original-target state is empty, and no sampling read error occurred. Original expected path is absent after execution. Normal newly acquired/released locks during this authorized verification are not reconstruction of the disappeared historical file. File identity changes are retained rather than asserting reuse of the historical object.

Sampling is not a complete event trace: short publication windows can be missed, and it did **not** watch every shared-role lock. Role/graph admission and request logs are not a per-lock publisher trace. Hashing/sampling/reporting adds I/O and timing overhead; exact equivalence to an uninstrumented schedule is not claimed. Complete runner stdout/stderr and existing per-fixture output are retained; internal child streams appear where the unchanged fixtures expose them. No assertion or result is rewritten to compensate for missing internal correlation.

Graph telemetry contains **327 observations: 324 acquired, 3 not entered**. Maximum acquisition wait is **4858.701 ms**; maximum admitted hold **10169.004 ms** occurs in the failed source-template operation. Acquisition budgets limit admission waiting, not admitted callbacks, so this hold does not establish a budget change. Duration-only telemetry cannot assign causes to the three non-entered observations. Relevant WP5-B API/runtime process observations are retained per PID in `result-summary.json`; all three required browser overlap operations themselves passed. Existing development process activity is also visible in sampled graph owner bytes and is not misattributed to a test PID.

### Newly observed residual state — preserved, no recovery

At **12:23:03.415 EDT**, direct read-only post-stop inspection found:

`C:\Projects\Modular\ui-platform\components\.uib\locks\d179aa405e5fabc10c0dcd063888480c115eb75f2ef03df9f74ce3ec26e0043e.lock`

It is **0 bytes**, SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`, one-link ordinary file, device 1344742221, inode **17169973580092885**. Reported birth time is **16:18:50.924633900 UTC** and write/change time **16:21:24.819927300 UTC**. Metadata is an observation, not authenticated creator/event history. It was absent from the fresh pre-run Component/storage file inventory.

SHA-256 of the current canonical anchor maps the filename exactly to:

`C:\Projects\Modular\ui-platform\components\customer-summary-card\component.visual.json`

Definition IDs are artifact **art_customer-summary-reference**, Component **cmp_platform_customer-summary-reference**. All five source-role hashes match the pre-run snapshot (`execution-accounting.json`); the preservation pass found no change to any pre-existing Component/build file. Its keyed transaction directory is empty, `pending.json` and exact recovery guard are absent. `residual-lock-observation.json` retains before/after raw metadata and anchor mapping, and `residual-lock-<key>.bin` is an evidence copy of the empty bytes. Neither the actual lock nor its source/journal was modified, acquired, quarantined or recovered.

This is a **different identity from the missing historical WP5-B lock**. Its presence is strongly consistent with the current shared-role refusal, but the failing exception does not contain a filename or per-read owner bytes, so this report does not claim direct causal correlation to that precise read. No PID can be inferred from empty text. The source plan enumerates/rechecks shared Components, so the failure can involve a Component unrelated to the template fixture's own source.

The residual file is new runtime/storage state during the observed interval, **not confirmed test-generated state**: tests and existing development consumers both used the shared store. Owner publication, last writer, interruption/cleanup history and responsible actor are unknown. The temporal overlap with WP5-B teardown does not establish that teardown or any named process created/truncated the file. No further experiment, normal read, liveness recovery, owner inference or cleanup was performed after stopping.

## Preservation and changed-file inventory

`preservation.json` compares before/after bytes for **2,332 UI files**, **158 Data Services files** and the **138 pre-existing ignored Component/compiled-output files**. **Zero existing-file byte changes**, zero unexpected tracked/nonignored additions outside this review, both HEADs unchanged. Original target identity/roles remain intact, its lock/guard absent and journal empty. Five tooling files and all captured historical reports/results/manifests/raw ETL/CSV retain their original bytes, including the 11 inventory-gap artifacts and 17 raw line-ending cases. This run does not close those provenance/governance gaps.

The only added file outside the new evidence/report paths is the residual Customer Summary Card zero-byte lock above. The automated inventory calls it a `new test-generated candidate`; that is an unproven attribution label, explicitly qualified by `execution-accounting.json` and this report. It is retained as **newly observed runtime state with unknown actor**. Empty runtime directories, ephemeral scratch state and Vite/npm caches are not a complete filesystem/metadata baseline; normal fixture setup/cleanup and cache writes are not claimed absent. No blanket scratch cleanup or historical-output restoration was performed. The preservation claim covers the enumerated files, not every byte on the volume. Access metadata can change through read-only inspection and is not reset.

New review additions are this report, `builder-v1-focused-20261020-files.json`, and the dedicated `evidence/builder-v1-focused-20261020/` tree containing preflight/source inventories, ordinary-token process context, one-run command record, observation/collector helpers, complete stdout/stderr/native completion, test JSON/progress, graph and lock observations, original browser evidence, residual snapshot and final preservation/accounting. The final JSON inventory gives every added file's exact path, size and raw SHA-256, and separately enumerates residual state. Its self-entry is explicitly unhashed to avoid circular hashing. There are **no implementation, assertion, test, configuration, Git or historical evidence edits**.

## Recommended next decision

**Do not proceed to complete-suite authorization or D6 acceptance.** The focused selection did not complete and an unresolved shared-role lock now blocks the source-composition checkpoint. The four browser passes support their recorded functional gates but cannot substitute for the failed case or the 49 unexecuted tests.

The next approval should be a **separate bounded unresolved-owner lifecycle/operational diagnostic review for the new Customer Summary Card identity**, preserving the current file and both old/new evidence chains. Review existing consumers and fixture setup/teardown participation in the shared store, and specify how to capture exact target identity, creation/PID publication/sync/close/unlink, failing read bytes, process lifetime and request/operation correlation if another experiment is later authorized. This result does not justify changing assertions, increasing budgets, broad retries, stealing locks, or claiming a universal filesystem cause.

Any eventual real-lock maintenance/recovery needs its own exact-target authorization and demonstrated exclusion/preservation procedure; the earlier historical-lock plan does not automatically transfer to this new identity. Do not infer dead ownership, delete the file, invent a recovery guard, recreate the original historical lock or run a normal reader merely to see whether it now passes. After the new blocker is separately resolved/reviewed, another focused-verification decision is required; no continuation or repeat is automatic. Narrow Foundation review and independent planning remain separate from D6 acceptance.

**STOP AT FOCUSED VERIFICATION REVIEW GATE. D6, WP5-F and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.**
