# DS0 STAB-3 implementation and acceptance report

Date: September 28, 2026 (America/New_York). **IMPLEMENTED — AWAITING USER ACCEPTANCE. STOPPED AT STAB-3 ACCEPTANCE GATE.**

## 1. Executive result and authority

Implemented the approved [STAB-3 design](ds0-stab-3-write-containment-plan.md), decisions S1–S6 and boundaries STAB-3A–D, in the actual Data Services checkout. Data Services build, typecheck, strict new-test/legacy-consumer compilation, **217/217 focused tests** and **345/345 total tests** pass. UI Platform focused compatibility **12/12**, editor contracts **103/103**, typecheck and production build/exclusion pass. The two Platform test suites overlap and must not be added as unique tests.

DOE now rejects unsupported operations before lookup/authorization/trigger/storage work, captures one supported action, explicitly dispatches CRUD and rejects every otherwise-allowed defined record scope. I-AM prevents defined falsy matching scopes from disappearing into unrestricted write permission. Existing STAB-2 ownership, nested poisoning, unknown-commit and confirmed post-commit outcomes remain intact.

No requirement forced changes outside the approved boundaries. No scope evaluator, restore feature, general request validator, ORM authorization layer, production registration endpoint or public result/interface expansion was introduced. B1–B3 remain accepted for their recorded scopes. **B4 is a candidate for closure only upon user acceptance of this tested scope.** STAB-4 and DS0-WP2 have not begun.

## 2. Repository baseline and preservation

D = `C:\Projects\Modular\UI Platform Data Services`; P = `C:\Projects\Modular\ui-platform`; B = `C:\Projects\Modular\ui-base`.

| Repository | HEAD before and after | Current state |
| --- | --- | --- |
| D / master | `d0aa1044b551086d2fbfaccf80357e7e6a5827dc` | Accepted STAB-2 baseline. Clean on entry; six tracked files modified and two new test files, all approved STAB-3. Uncommitted. |
| P / main | `a4b835dc89100cf30e0b0018a0210e08eca6856a` | No tracked source changes. Prior STAB-2 acceptance record/STAB-3 design evidence preserved; this report and implementation evidence added. |
| B / main | `96898f73809272e680fcb3402f064a039fff4350` | Clean and unchanged. |

The [before inventory](evidence/ds0-stab-3-implementation/before.json) captures all **67 tracked D files**. The [preservation inventory](evidence/ds0-stab-3-implementation/preservation.json) proves **61 unchanged and six intended changes**, records all eight implementation-file hashes and repository statuses, and reports zero unexpected changes. All original `.test.ts` files remain byte-identical, including the original STAB-1/STAB-2 assertions. The existing transaction fixture was extended; no original test case was replaced or removed.

All 13 accepted STAB-1 source hashes, 17 STAB-1 evidence hashes and 17 STAB-2 report/evidence hashes match their preserved inventories. ORM, runtime TriggerRegistry, production request handler/service, I-AM policy store/types/service, schema-application and architecture sources remain unchanged. DOE's result types are unchanged; its types file adds only the restore-support comment.

| Protected lockfile | SHA-256 before and after |
| --- | --- |
| D | `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F` |
| P | `5E4A3F737256772D16427A4EB78B1E86336E8B11E4F555998BA76882DFC79EFA` |
| B | `2A8BE906BE643F1DCBD2F33685ED5C3B711E99740F3D19CDB542276608A4673E` |

No package manifest/version or lockfile changed; no dependency installation or global npm change occurred. Builds refreshed ignored outputs. Edits were prepared in a task-created P staging directory, copied to D, and tested in D. All eight copies were hash-matched before deleting only that temporary staging directory. No existing definition history, application/policy store or deployment was modified. Test fixtures used isolated temporary roots and synthetic actors/grants/rows.

## 3. Changed files and work boundaries

All paths in this table are relative to D.

| File | Change |
| --- | --- |
| `packages/dataset-operations/src/operation-manager.ts` | STAB-3A/B: early shared allowlist, captured action, explicit switch, defined-scope guard. Existing session/result/catch/run logic retained. |
| `packages/dataset-operations/src/types.ts` | Documents retained restore literal as runtime-unsupported; no union/field/export change. |
| `packages/i-am/src/authorization-service.ts` | STAB-3B/S4: write-only check of all matching grants for defined falsy scope, throwing sanitized AUTHORIZATION_DENIED. |
| `packages/dataset-operations/tests/transaction-fixture.ts` | STAB-3C: count insert/update/delete and definition lookup; expose real policy store/service for observation; recursively snapshot raw bytes and directory/file inventory. Delegates to actual ORM. |
| `packages/dataset-operations/tests/operation-security.test.ts` (new) | 185 cases covering dispatch, substitution, scope/option/actor combinations, raw-byte preservation, nesting, HTTP and query regression. |
| `packages/i-am/tests/write-scope-containment.test.ts` (new) | 32 cases covering real persisted malformed scopes, all write actions, irrelevant grants, preserved query/export behavior and DOE error propagation. |
| `packages/dataset-operations/README.md` | STAB-3D: containment, precedence, results, intentional availability changes and future scope evaluation. |
| `packages/i-am/README.md` | STAB-3D: narrow malformed-scope contract and distinct I-AM/DOE HTTP behavior. |

The new nesting/HTTP cases were placed in the new security test file, preserving the accepted nested-transactions and operation-service-contract test files byte-for-byte. This organizes the approved STAB-3C coverage without changing its scope. No new dependency or production composition seam was needed.

## 4. Implemented behavior and compatibility

### Exact supported-operation dispatch

The manager reads the action into its context before awaiting, then captures and checks that value in the shared execution try/catch. Only primitive exact insert/update/delete strings pass. Restore, query/export as writes, arbitrary strings, whitespace/case variants, null/undefined/numeric/boolean/object/array and boxed-string values reject with UNSUPPORTED_OPERATION. No coercion or delete fallback remains.

The guard precedes dataset lookup and I-AM; valid envelopes with unsupported actions therefore reject before a missing-dataset or denied-actor error. Existing external parent/transaction, callback lifetime/overlap, depth and poisoned-session checks retain their approved precedence. The same captured action drives I-AM, trigger phases and explicit dispatch, including when the original request is mutated during lookup, authorization or a handler. General immutability of unrelated request fields is not claimed.

The restore literal remains source-compatible and compiles in the strict test compilation. Malformed overall request envelopes are not newly validated; existing HTTP transport behavior remains. Raw inspection, schema rollback and other definition-management APIs are separate and unchanged.

### Record-scope containment and S4

After an allowed authorization decision, any `recordScope !== undefined` rejects with RECORD_SCOPED_WRITE_UNSUPPORTED before normalization, transaction begin, trigger lookup or writes. This includes legitimate in-scope requests, empty/mixed batches, ID-only delete/partial update, malformed/compound/empty scope objects, every supported CRUD action, all source labels and both atomic/field-filter settings. Omitted/undefined scope retains its existing unscoped meaning. Denied decisions still produce AUTHORIZATION_DENIED first. No scope or row contents appear in these diagnostics.

Built-in I-AM checks **all matching grants** for a defined falsy scope on insert/update/delete/restore and throws AUTHORIZATION_DENIED. Persisted grant bytes are never repaired or cleared. An earlier valid scoped grant or unscoped grant cannot hide a later malformed scope. Disabled or mismatched subject/resource/action grants do not affect unrelated unscoped writes. Truthy malformed scopes reach DOE and are contained there without evaluation. Query/export decisions retain the prior behavior, including the deliberately unchanged handling of malformed falsy scopes on those non-write actions.

User, group-derived user, service and system actors retain authorized unscoped CRUD. Scoped plus unscoped matching grants still lead to rejection under existing scope-selection semantics. No grant-composition algorithm or elevated bypass is added. Temporary rejection of valid scoped writes is an intentional availability break, not full record-scoped authorization.

### Transactions, nesting and HTTP

| Path | Verified result |
| --- | --- |
| Root rejection | not-committed; success=false, committed=false; succeeded=0, failed=requested, unknown=0; no records, begin, write, commit or rollback. |
| Joined rejected child | joined/provisional failure with no own mutation; shared failure poisons root even when a promise/result is ignored or caught. Root rolls back staging once before any commit. |
| Ignored grandchild | Both ancestors fail; a subsequent child cannot resume writes in the failed session. Persisted root remains byte-identical. |
| Rejected afterCommit child | Child not-committed; parent retains committed outcome, original successful records/counts and POST_COMMIT_FAILED. No replay or rollback of confirmed parent writes. |
| Existing commit uncertainty/cleanup failures | Accepted STAB-2 regression cases all pass unchanged, including partial persistence and unknown outcomes. No storage algorithm/interface change. |

The actual production request handler is used by nine new loopback HTTP scenarios: restore, unsupported value, three scoped CRUD actions, S4 malformed-scope denial, unscoped success, nested rejection and post-commit child rejection. Business results retain HTTP 200 and the full outcome/count/error contract; missing bearer stays 401. The outcome-aware consumer makes exactly one request and does not retry false success/committed booleans.

Standalone I-AM `/authorize` still uses its unchanged exception-to-HTTP-400 handler. That mapping was verified by source inspection; **a separately launched I-AM HTTP service was not exercised**. Its actual authorization service and persisted policy store were exercised directly, and its denial was tested through DOE's production HTTP handler. These tests do not claim deployed UI-to-service communication, shared configuration of separate service roots, or external-client compatibility.

## 5. Persistence and regression evidence

The tests use real JsonFileDatasetOrm persistence, actual OrmIamPolicyStore/PolicyAuthorizationService and the central TriggerRegistry. The instrumented ORM delegates operations to the original implementation and counts insert, update and delete separately. No fake write result or fake transaction substitutes for storage. Custom authorization adapters are used only to test the public decision boundary with malformed runtime values; real policy-store tests separately cover built-in behavior.

Recursive snapshots retain relative path inventories, directory entries and exact raw file bytes encoded as base64, including unrelated sentinel bytes and an empty nested directory. Equality detects new/deleted/modified files and stray temporary files. Fixture grant/registration/seed writes complete before snapshot/counter reset. No application data is logged. Fresh ORM readers supplement byte comparisons, including existing-row restore rejection and ordinary CRUD persistence.

For pre-commit nested failures, comparison is against pre-root persisted state; earlier parent staging is not misreported as zero in-memory work. For post-commit child failures, comparison is against the child's post-parent-commit baseline. The confirmed parent delta is retained. No claim is made that rejected children undo prior external handler side effects.

| New test coverage | Count |
| --- | ---: |
| Unsupported values, precedence and operation substitution | 19 |
| Scoped in/out/mixed/empty CRUD | 12 |
| CRUD × seven sources × two atomic values × two field modes | 84 |
| Custom defined scope values, omitted/undefined decisions, persisted truthy scopes | 32 |
| Denial precedence, actors, mixed grants and unrelated scopes | 12 |
| Scoped query regression | 1 |
| Nested pre-commit, grandchild and afterCommit containment | 16 |
| Production DOE HTTP/consumer cases | 9 |
| **New DOE security tests** | **185** |
| New I-AM containment tests | **32** |
| **New focused total** | **217** |
| Accepted original tests, unchanged | **128** |
| **Full Data Services total: 12 files** | **345** |

The original 128 comprise eight pre-STAB-1 tests, 80 STAB-1 additions and 40 STAB-2 additions. DOE now has 226 tests: prior 41 plus 185. The original four schema-application tests still pass. No skips, assertion relaxation or removed tests were used.

## 6. Commands, versions and outcomes

Node **24.19.0** and local npm **10.8.2** were verified. npm's Node engine range `^18.17.0 || >=20.5.0` includes this Node. D uses TypeScript **5.9.3** / Vitest **3.2.7**; P uses TypeScript **7.0.2** / Vitest **4.1.11** / Vite **8.2.2**. The [preservation script](evidence/ds0-stab-3-implementation/record-preservation.cjs) records versions and hashes.

In the commands below, npm means the exact executable `node C:\Users\zanyf\AppData\Local\Temp\ds0-stab0-npm-10.8.2\package\bin\npm-cli.js`. Its sibling `shims` directory was prepended to PATH for nested npm scripts. No global npm was changed or substituted. D commands ran in the actual D checkout; P commands ran in P. Approved out-of-sandbox execution supplied normal Windows filesystem identity for checkout writes, builds and tests.

| Command/stage | Exit and result | Evidence |
| --- | --- | --- |
| D `npm run build`, initial | 0, all seven package builds | [01-build.txt](evidence/ds0-stab-3-implementation/01-build.txt) |
| D `npm test -- packages/dataset-operations/tests/operation-security.test.ts packages/i-am/tests/write-scope-containment.test.ts`, initial | 1, 191 failed during fixture initialization | [02-focused.txt](evidence/ds0-stab-3-implementation/02-focused.txt) |
| Same focused command after counter correction | 0, 191/191 before 26 additional edge/HTTP cases | [03-focused-corrected.txt](evidence/ds0-stab-3-implementation/03-focused-corrected.txt) |
| Strict test/consumer compilation, initial | 2, three intentional malformed-fixture cast diagnostics | [04-test-typecheck.txt](evidence/ds0-stab-3-implementation/04-test-typecheck.txt) |
| Strict compilation after explicit unknown casts | 0 | [05-test-typecheck-corrected.txt](evidence/ds0-stab-3-implementation/05-test-typecheck-corrected.txt) |
| D `npm run build`, final | 0, all seven package builds | [06-build-final.txt](evidence/ds0-stab-3-implementation/06-build-final.txt) |
| D `npm run typecheck` | 0, all seven workspace checks | [07-typecheck.txt](evidence/ds0-stab-3-implementation/07-typecheck.txt) |
| D focused command, final | 0, 217/217 in two files | [08-focused-final.txt](evidence/ds0-stab-3-implementation/08-focused-final.txt) |
| D `npm test`, full | 0, 345/345 in 12 files | [09-full-tests.txt](evidence/ds0-stab-3-implementation/09-full-tests.txt) |
| D strict test/consumer compilation, final | 0 | [10-test-consumer-typecheck.txt](evidence/ds0-stab-3-implementation/10-test-consumer-typecheck.txt) |
| P `node node_modules/vitest/vitest.mjs run packages/artifacts/tests/schema-adapter-compatibility.test.ts packages/artifacts/tests/migrations-deployment.test.ts` | 0, 12/12 | [11-platform-focused.txt](evidence/ds0-stab-3-implementation/11-platform-focused.txt) |
| P `npm run typecheck` | 0 | [12-platform-typecheck.txt](evidence/ds0-stab-3-implementation/12-platform-typecheck.txt) |
| P `npm run check:editor-production` | 0, production build and exclusion check | [13-platform-production-build.txt](evidence/ds0-stab-3-implementation/13-platform-production-build.txt) |
| P `node scripts/check-editor-contracts.mjs` | 0, consumer/artifact compilation, document-contract check and 103/103 tests in 13 files | [14-platform-contracts.txt](evidence/ds0-stab-3-implementation/14-platform-contracts.txt) |
| Git diff review, `git diff --check`, SHA-256 preservation checks | 0; expected scope only, no protected mismatch | [preservation.json](evidence/ds0-stab-3-implementation/preservation.json) |

Strict compilation used the unchanged STAB-2 consumer command flags and additionally compiled both new test files:

```text
node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext packages/dataset-operations/tests/operation-security.test.ts packages/i-am/tests/write-scope-containment.test.ts packages/dataset-operations/tests/result-consumer-fixture.ts
```

The compiler's successful runs are silent; their logs explicitly record the observed exit code, not invented compiler output. Test logs retain the original failures as well as corrected results.

### Initial failures and corrections

1. A new instrumentation counter named `definitions` shadowed the ORM's private map at runtime. All 191 initial cases failed at fixture registration (`this.definitions.set is not a function`), before exercising behavior. Renamed the counter `definitionReads`; all 191 then passed. Production ORM code was not changed.
2. Additional strict compilation found three TypeScript casts of intentionally invalid stored scopes that required an explicit `unknown` intermediary. Corrected only those test casts, preserving the malformed values and assertions. Final expanded test and consumer compilation passes.
3. Initial read-only Git commands without command-scoped safe.directory encountered sandbox ownership rejection. Repeated with the established command-local option; no global Git configuration changed. A write to the old `.uib` staging location was denied, so a new task-owned workspace staging directory was used and later removed after hash verification. These were tooling/environment issues, not runtime test failures or the watcher issue.

## 7. Remaining risks and limitations

| Classification | Remaining limitation |
| --- | --- |
| WARNING | Every valid scoped write is intentionally unavailable, including otherwise legitimate in-scope work. Full record-scoped authorization remains a separate future design and approval, covering grant composition, old/final row images, nested reads, relationship facts and concurrency. |
| WARNING | Existing callers that relied on restore-as-delete, unsupported dispatch or successful scoped writes now receive rejection. Error-string-dependent clients need review. Retaining types and HTTP status does not make the behavior change invisible. Do not remove restrictive policy to work around containment. |
| WARNING | Direct ORM, policy-store and trigger-administration paths remain trusted separate boundaries. No generic request/policy validator, actor binding redesign or sandbox for handler side effects was added. Queries retain existing semantics and limitations. |
| WARNING | STAB-2 multi-file persistence remains non-atomic without durable recovery, fsync guarantees or writer fencing. Unknown commits are not rolled back/retried; confirmed parent writes survive later callback failure. |
| WARNING | The [Windows watcher issue](artifact-watcher-windows-rename-issue.md) did not recur in 103/103 editor tests, but remains unresolved. No watcher code, retry, skip or weakened assertion was introduced. The passing injected ORM rename-failure test remains separate evidence. |
| INFORMATION | UI Platform retains its non-blocking large-client-chunk build warning. No P runtime source changed. |
| INFORMATION | Accepted STAB-1 checksum/history and deployment restrictions, schema-application persisted identities/journal hashing, two applied-state authorities and trigger publication/runtime-registration separation are preserved. |
| UNKNOWN | Other machines, deployed stores, independent I-AM HTTP runtime and external clients were not certified. Real loopback DOE tests are not deployment or end-to-end UI integration claims. |

## 8. Acceptance gate

Recommended disposition: accept STAB-3 and close B4 **for this tested DOE/I-AM containment scope**, with all listed compatibility and architecture limitations. Full record-scoped authorization and restore semantics remain unimplemented future work, not regressions to repair under this package.

**STOP: STAB-3 acceptance gate.** All eight Data Services changes remain uncommitted and reviewable. This report does not accept itself or authorize B4 closure. No commit, push, release, deployment, data migration, package/lockfile change, STAB-4 or DS0-WP2 work occurred.
