# DS0 STAB-2 implementation and acceptance report

Date: September 27, 2026 (America/New_York). **IMPLEMENTED — AWAITING USER ACCEPTANCE. STOPPED AT STAB-2 ACCEPTANCE GATE.**

## 1. Executive result and authority

Implemented the approved [STAB-2 design](ds0-stab-2-transaction-correctness-plan.md), decisions T1–T7 and boundaries STAB-2A–2E, in the actual Data Services checkout. Build, typecheck, consumer compatibility compilation and **128/128 tests pass**. UI Platform production build/exclusion, typecheck, **12/12 focused compatibility tests** and **103/103 editor contract tests** pass. The two P suites overlap; they are not 115 unique tests.

The implementation makes ownership explicit, rolls back owned transactions only before commit, reports every thrown commit as unknown, preserves confirmed writes on post-commit failure, and tracks nested operations even when callers ignore their promises/results. It rejects external transaction/context inputs, overlapping siblings and stale callbacks. No ORM interface change or expansion beyond the approved public result/error contracts was required.

B1 and B2 remain accepted/closed for their recorded scopes. B3 is a candidate for closure **only upon user acceptance of STAB-2**; this report does not accept itself. B4, STAB-3, DS0-WP2, release, deployment and migration remain outside this work. No commit or push was made during this implementation.

## 2. Repository baseline and preservation

D = `C:\Projects\Modular\UI Platform Data Services`; P = `C:\Projects\Modular\ui-platform`; B = `C:\Projects\Modular\ui-base`.

| Repository | Recorded HEAD | State |
| --- | --- | --- |
| D, master | `577683840535e668c2000f24562702e7b51c6a0b` | Accepted STAB-1 commit; clean at implementation start. HEAD unchanged; four tracked files modified and six new files, all under dataset-operations. Uncommitted. |
| P, main | `849f2afc704a0e433a444c260be86e7dede57cde` | Current documentation baseline; no tracked runtime changes by this work. New STAB-2 report/evidence. |
| B, main | `96898f73809272e680fcb3402f064a039fff4350` | Clean and unchanged. |

P's previous planning baseline was `e6b6a86936b8aa24645f24ae53db3cf61a3c0345`. The externally created `849f2af` commit, dated September 27 at 20:32:27 EDT and titled “Stab - 2”, contains only the 21 prior STAB-1/2 documentation/evidence files. Its baseline-to-HEAD diff contains no runtime changes. This agent did not create that commit. The current tests therefore still exercise the previously inspected P runtime source.

[Before inventory](evidence/ds0-stab-2-implementation/before.json) captured all 61 tracked D files. [Final preservation evidence](evidence/ds0-stab-2-implementation/preservation.json) records **57 byte-identical files and four intended changes**, repository status/SHAs, all ten changed/new file hashes, and the approved plan hash. All **13 accepted STAB-1 implementation hashes** and **17 STAB-1 report/evidence hashes** match. ORM code/interface, schema-application state/journal code, runtime TriggerRegistry, I-AM and original tests remain unchanged.

| Protected lockfile | SHA-256 after execution |
| --- | --- |
| D | `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F` |
| P | `5E4A3F737256772D16427A4EB78B1E86336E8B11E4F555998BA76882DFC79EFA` |
| B | `2A8BE906BE643F1DCBD2F33685ED5C3B711E99740F3D19CDB542276608A4673E` |

Package manifests/versions and locks have no changes. No installation was repeated; the accepted STAB-0 dependencies/local npm were used. Builds refreshed ignored outputs. Editing copies under P's ignored `.uib/stab2-edits` are staging, not a second runtime checkout. Tests ran in D against temporary synthetic roots; no existing application store, published history or deployment configuration was migrated or modified.

## 3. Changes by approved work boundary

All paths below are within D `packages/dataset-operations`.

| Boundary / files | Delivered change |
| --- | --- |
| STAB-2A: `src/types.ts` | Existing result fields retained; optional commitOutcome/counts.unknown, exported outcome/error types, approved optional diagnostic metadata and legacy-unspecified comment. |
| STAB-2B/C: `src/operation-manager.ts` | Private execution-session bookkeeping beside the real ORM handle; ownership/phase controls; rollback/unknown/post-commit paths; shared failed state; tracked children, sequential nesting, overlap/stale/external rejection. |
| STAB-2D: `src/request-handler.ts` (new), `src/service.ts` | Extracted the existing handler into a private composition seam shared by production startup and real loopback tests. Default service initialization/listener and HTTP envelope/authentication/routes retained. No new endpoint or package-root export. |
| STAB-2D: `tests/operation-failures.test.ts` (new) | 17 preflight/ownership/rollback/persistence/unknown/post-commit tests. |
| STAB-2D: `tests/nested-transactions.test.ts` (new) | 18 nesting, ignored-promise, overlap, stale-callback and independent post-commit child tests. |
| STAB-2D: `tests/operation-service-contract.test.ts` (new) | Five real HTTP/safe-consumer compatibility tests. |
| Test-only helpers: `tests/transaction-fixture.ts`, `tests/result-consumer-fixture.ts` (new) | Real ORM/I-AM/registry setup, fresh readers, deterministic fault/barrier instrumentation; legacy result producer and outcome-aware one-call consumer. |
| STAB-2E: `README.md` | Result/count/error contracts, ownership restrictions, lifecycle behavior, HTTP migration guidance and explicit storage limits. |

That is **four changed tracked files and six new files**. No ORM source/interface, package export map, version or dependency changed. The original DOE happy-path test is preserved. The handler extraction was the minimal test-composition seam approved by T7, not new production bootstrapping capability.

## 4. Result and ownership behavior

Every result produced by the repaired manager populates commitOutcome and counts.unknown, while their public type members remain optional for older producers. Missing commitOutcome is unspecified. Existing operation/correlation IDs, success, committed, counts, records and errors remain present under their documented conditions.

| Path | Outcome and write accounting |
| --- | --- |
| Preflight/begin failure | not-committed; no owned commit; succeeded=0, failed=requested, unknown=0. No rollback if no handle was acquired. |
| Owned pre-commit failure | not-committed; one rollback after registered children settle. Original diagnostic retained; cleanup failure adds TRANSACTION_ROLLBACK_FAILED. |
| Joined success | joined, committed=false; records/succeeded count are explicitly provisional staging results. A later root rollback does not mutate the previously returned child result. |
| Joined failure | joined, committed=false; root failure marker is set even for early child authorization/validation/depth errors. |
| Thrown commit | unknown, success=false, committed=false, succeeded=failed=0, unknown=requested; no confirmed records. No rollback/retry/afterCommit. |
| Confirmed commit | committed=true and commitOutcome=committed. |
| Confirmed commit then callback failure | success=false, committed=true, retained write records/counts, failed=0 and POST_COMMIT_FAILED. No replay or rollback. |

The commit-attempt phase is set before calling commit, so synchronous/async failure cannot be mislabeled pre-commit. Tests deliberately show unknown even when instrumentation knows no file changed or all writes completed. Zero-record requests can have unknown outcome with unknown=0; the enum remains authoritative.

The root alone owns its handle. Public supplied parent contexts/transactions reject before authorization, trigger or storage work; the borrowed handle is never committed or rolled back. Internal nesting uses the private session with the original concrete transaction, preserving the ORM's instanceof requirement. The implementation did not add a new owner contract to OrmTransaction.

Known ORM/DOE error codes are retained; generic exceptions use stable sanitized diagnostics with operation/phase lineage. Raw exception messages can contain paths/records and are not copied into operation results. This intentional error-message compatibility change is documented; causal and cleanup diagnostics remain separate.

## 5. Nested-operation and post-commit guarantees

Child promises are registered before returning to a handler and awaited even when ignored. Any pre-commit child failure sets the shared failure marker; swallowing its result or exception cannot allow commit. Each handler drains its own descendants, avoiding an ancestor/self wait. Handler failure also waits for already-started children before rollback.

Overlapping sibling invocation rejects with NESTED_CONCURRENCY_UNSUPPORTED, marks the pre-commit root failed and waits for the first child before cleanup. Sequential awaited recursion remains supported. Callback lifetime is bounded to its handler: stale calls reject with OPERATION_CONTEXT_CLOSED before mutation. A stale earlier-handler callback invoked while the root is still staging poisons that root too. A call after return cannot retroactively change an already-returned result, but cannot reopen its transaction.

Joined children do not independently run afterCommit. Root afterCommit children instead own independent transactions with retained lineage. Ignored failures are still observed; the parent's confirmed commit remains intact. Related child unknown/committed-with-error outcomes are not overwritten with the parent outcome. Tests prove both successful and failed independent children and preserve records despite callback mutation attempts.

Records describe the operation's ORM write result, not the final image after all possible descendant updates. Counts belong to each request, not an aggregate across datasets. Trusted handlers bypassing DOE through other captured objects or external I/O remain outside these guarantees.

## 6. Persistence and communication evidence

Tests use actual JsonFileDatasetOrm instances, actual policy/trigger registration and temporary files. The fixture instruments the **original transaction object's** methods and delegates persistence to the real implementation. No proxy transaction, fake persistence result or production fault switch is used. Assertions read bytes or a fresh ORM instance with registered definitions; cached reads alone are not used as persistence proof.

Evidence includes:

- Before/after trigger and write failure: one owned rollback, zero commit, unchanged persisted baseline.
- Original failure plus rollback failure: both diagnostics, no claimed cleanup success or retry.
- Mid-commit failure across two datasets: a fresh reader sees one persisted dataset and one unchanged dataset; response remains unknown.
- All writes followed by lost acknowledgement: fresh reader sees the rows, but outcome remains unknown.
- A real filesystem destination-directory obstruction introduced after staging: rename fails during commit, response is unknown, no rollback, temporary-file evidence remains until fixture cleanup. This is separate from the P watcher issue.
- AfterCommit failure: a fresh reader sees the row, returned write records/counts are preserved, and no second write/rollback occurs.
- Child success followed by parent failure: the returned child remains joined/provisional while both datasets remain uncommitted on disk.
- Controlled promise barriers prove ignored children settle before commit/rollback without timing sleeps.

Four real HTTP scenarios exercise success, preflight failure, unknown commit and post-commit failure; a fifth consumer test covers a legacy producer with absent outcome. Tests open a loopback HTTP server using the same extracted production handler and real fixture manager/ORM/I-AM/registry. Authentication and HTTP 200 operation-envelope policy are checked. The service's default initialization still lacks business-dataset/handler bootstrapping; the test-only composition supplies those explicitly and does not claim deployed-service integration.

The consumer fixture compiles an old result literal and handles every outcome, including absent/unspecified. It makes exactly one request and never retries solely because success or committed is false. This is executable compatibility guidance, not proof that unknown external clients have adopted the contract. No existing P DOE-result consumer was found by the approved design review; P's separate migration/fingerprint contracts remain unchanged.

## 7. Commands, toolchain and exact results

D used Node **24.19.0**, local npm **10.8.2**, TypeScript **5.9.3**, Vitest **3.2.7**. npm's accepted Node range `^18.17.0 || >=20.5.0` covers this Node. Global npm was not changed or used for these scripts. P used its installed TypeScript **7.0.2**, Vitest **4.1.11** and Vite **8.2.2**. No dependency upgrade/install was performed.

For npm commands in the table, the exact executable was:

```text
node C:\Users\zanyf\AppData\Local\Temp\ds0-stab0-npm-10.8.2\package\bin\npm-cli.js
```

The accepted local `...\ds0-stab0-npm-10.8.2\shims` directory was prepended to PATH so nested npm scripts used the same version. D commands ran in D; P commands in P. Runs needing normal Windows filesystem identity used approved out-of-sandbox execution. No live store configuration was supplied.

| Command / stage | Exit / result | Evidence |
| --- | --- | --- |
| D `run build`, first source pass | 0; seven package builds | [01-build.txt](evidence/ds0-stab-2-implementation/01-build.txt) |
| D `test -- packages/dataset-operations/tests`, initial | 1; 31 passed, five failed | [02-focused-tests.txt](evidence/ds0-stab-2-implementation/02-focused-tests.txt) |
| D `run build`, corrected handler | 0 | [03-build-corrected.txt](evidence/ds0-stab-2-implementation/03-build-corrected.txt) |
| D focused tests, corrected | 0; four files, 36/36 before five further edge-case tests | [04-focused-corrected.txt](evidence/ds0-stab-2-implementation/04-focused-corrected.txt) |
| D `run build`, final | 0; seven package builds | [05-build-final.txt](evidence/ds0-stab-2-implementation/05-build-final.txt) |
| D `run typecheck` | 0; seven workspace checks | [06-typecheck.txt](evidence/ds0-stab-2-implementation/06-typecheck.txt) |
| D `node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext packages/dataset-operations/tests/result-consumer-fixture.ts` | 0; silent compiler success | [07-consumer-typecheck.txt](evidence/ds0-stab-2-implementation/07-consumer-typecheck.txt) |
| D `test`, final full suite | 0; ten files, **128/128** | [08-full-tests.txt](evidence/ds0-stab-2-implementation/08-full-tests.txt) |
| P `run check:editor-production` | 0; full build and production-exclusion check pass | [09-platform-production-build.txt](evidence/ds0-stab-2-implementation/09-platform-production-build.txt) |
| P `run typecheck` | 0 | [10-platform-typecheck.txt](evidence/ds0-stab-2-implementation/10-platform-typecheck.txt) |
| P `node node_modules/vitest/vitest.mjs run packages/artifacts/tests/schema-adapter-compatibility.test.ts packages/artifacts/tests/migrations-deployment.test.ts` | 0; two files, 12/12 | [11-platform-focused.txt](evidence/ds0-stab-2-implementation/11-platform-focused.txt) |
| P `node scripts/check-editor-contracts.mjs` | 0; artifact/consumer compilation, contract-document check, 13 files and 103/103 tests | [12-platform-contracts.txt](evidence/ds0-stab-2-implementation/12-platform-contracts.txt) |
| D `git diff --check`, command-scoped safe.directory | 0; no whitespace errors, ordinary LF/CRLF advisories | [diff-check.txt](evidence/ds0-stab-2-implementation/diff-check.txt) |
| Read-only Git/status/hash review | Intended scope only; no protected hash mismatch | [record-preservation.cjs](evidence/ds0-stab-2-implementation/record-preservation.cjs), [preservation.json](evidence/ds0-stab-2-implementation/preservation.json) |

Initial failures are retained, not hidden. Rerunning the editing helper against already-modified service text produced an empty handler, causing four HTTP timeouts; the helper was corrected to extract from the pinned accepted commit. The first rename test obstructed the file before ORM loading, correctly producing not-committed; its fault was moved after staging to test the intended commit-time rename failure. Neither test was skipped or weakened. Corrected and final checks pass.

The silent consumer compiler originally produced no Tee-Object file; its evidence note records the command and exit=0 established by the guarded pipeline continuing to full tests. It is a result record, not invented compiler output.

### Test count reconciliation

| Tests | Count |
| --- | ---: |
| Original unchanged pre-STAB-1 tests | 8 |
| Accepted unchanged STAB-1 additions | 80 |
| STAB-2 operation failure/persistence tests | 17 |
| STAB-2 nested/lifecycle tests | 18 |
| STAB-2 HTTP/consumer tests | 5 |
| **Final total** | **128** |

Final DOE coverage is **41 tests**: original one plus 40 added. The four original schema-application state-store tests still pass unchanged. No tests were removed. Helpers and the separately compiled consumer fixture are not counted as Vitest cases.

## 8. Remaining limitations and compatibility risks

| Classification | Limit |
| --- | --- |
| WARNING | The unchanged ORM remains non-atomic across files, with no fsync durability guarantee, journal, isolation or writer fencing. Tests expose partial persistence; STAB-2 reports it truthfully rather than repairing it. |
| WARNING | Unknown outcomes require separately approved investigation/reconciliation. No automatic retry, rollback after commit attempt, compensation or recovery API exists. |
| WARNING | External handle/context inputs, overlapping siblings and stale callbacks now reject. Ignored children are awaited. These approved behavioral changes can affect unknown external callers despite optional additive types. |
| WARNING | Joined results are provisional. Consumers must obtain the root result; false committed is not proof of zero writes, and false success is not permission to replay. |
| WARNING | Never-settling handlers/children can stall completion. Direct ORM misuse and external side effects bypass DOE session controls. Direct I-AM/TriggerRegistry transaction owners were not repaired. |
| WARNING | Existing options.atomic behavior is retained; it does not supply stronger storage atomicity or a separate partial-batch mode. |
| WARNING | P's known Windows watcher EPERM did not recur in 103/103 tests but remains unresolved. No watcher code/retry/skip changes were made. The deliberate ORM rename failure is separate fault-injection evidence. |
| INFORMATION | P build reports a non-blocking chunk-size warning (client JS 635.91 kB). P runtime source is unchanged; optimization is outside this task. |
| INFORMATION | B4 restore-as-delete dispatch and record-scoped-write behavior remain unchanged for STAB-3. Full record-scoped authorization is still a separate future item. |
| INFORMATION | Accepted STAB-1 compatibility/deployment restrictions, deferred persisted identities, the two applied-state authorities and trigger publication/runtime separation remain unchanged. |
| UNKNOWN | External consumers/deployments and other platforms/toolchains were not certified. Real HTTP fixtures are not a deployed end-to-end UI-to-DOE integration claim. |

## 9. Acceptance gate

Recommended disposition: review and accept STAB-2 for this tested checkout with the listed limitations. There is no remaining build/typecheck/test failure in the recorded scope and no requirement conflict forcing an ORM interface or unapproved public-contract change. B3 closure remains the user's decision.

**STOP: STAB-2 acceptance gate.** All ten D changes remain uncommitted and reviewable. No STAB-3, DS0-WP2, push, release, migration or deployment was started or scheduled.
