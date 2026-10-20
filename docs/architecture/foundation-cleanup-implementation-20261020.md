# Foundation cleanup ownership implementation review

2026-10-20. **IMPLEMENTED; ACCEPTANCE BLOCKED BY FOUNDATION REGRESSIONS.** Stop at **FOUNDATION CLEANUP IMPLEMENTATION REVIEW GATE**. D6, WP5-F and WP5-I remain open and unaccepted. All **40 umbrella requirements remain unchecked**, zero checked.

## 1. Implementation and boundary

The approved decisions 1–3 are implemented only in `packages/artifacts/src/storage.ts`. The normal `npm run build --workspace @ui-platform/artifacts` generated the corrected `packages/artifacts/dist/storage.js`. No other existing implementation, test, configuration, runtime or declaration bytes changed in the recorded baseline. New test-only fault injection is in `packages/artifacts/tests/cleanup-ownership.test.ts`. No dependency installation, real-store acquisition, recovery, Builder focused/UI suite, commit, push, reset or synchronization occurred.

The main cleanup scope now encloses initial wx and the entire guarded replacement path. A successful exclusive create assigns its returned main handle immediately. A separate owned recovery handle is protected before its acquisition, and only a successfully returned guard is cleaned. The guarded valid-positive-PID, ESRCH probe, reread/compare, old-file removal and replacement-create race mappings remain intact.

Guard cleanup records failures without throwing out of the finalizer. A guard close or unlink failure prevents PID write/sync and callback admission, but the main finalizer still attempts the owned replacement's cleanup. Each owned handle has one eligible close attempt. A rejected close skips that handle's unlink, even when a fault delegates native close before rejecting. Successful close permits one unlink attempt. Unknown/unowned main or guard files are never granted cleanup ownership by failed acquisition.

After eligible cleanup, an explicit primary-presence flag distinguishes no error from thrown undefined/null. A lone error retains exact identity. Multiple failures use standard AggregateError with primary first (when present), cleanup errors in guard.close/eligible guard.unlink/main.close/eligible main.unlink order, exact cause and element identities, and an explicit phase-bearing cleanup message. Values are not mutated, flattened, deduplicated or decorated. No busy/recovery status/code or commit metadata is promoted onto composites.

A module-private `LockCleanupFailure` carrier conveys terminal cleanup provenance to `withArtifactLock`; it is consumed before entered, cancellation and busy-retry dispatch, and only its public outcome escapes. The carrier is neither exported nor added to declarations. Ordinary no-cleanup-failure retry/cancellation behavior, PID format, publication/admission order, acquisition budgets, graph/role boundaries, transaction semantics and callback/no-replay behavior retain the original code paths.

## 2. Verification executions and native results

Complete stdout, stderr, exit records, JSON test reports and per-case residual-state traces are retained under `evidence/foundation-cleanup-implementation-20261020/`. CLI arguments and the process-local temporary root are recorded in the exit JSON files. No automatic test retry was enabled.

| Execution | Native exit | Result |
| --- | --- | --- |
| Initial Foundation typecheck | 0 | Passed. |
| Normal Foundation package build | 0 | Passed; regenerated output through tsc, without patching compiled code. |
| First new-fault runner invocation | 1 | Suite failed before collection/execution: **zero tests**, denied cache-file rename in sandbox temporary storage. `fault.stdout.txt`, `fault.stderr.txt`, `fault-results.json`, `fault.exit.json` retain this failure. |
| New-fault runner with dedicated disposable TEMP/TMP | 0 | **58/58 passed**, one file, serial, retry 0; `fault-isolated-*` and `fault-lifecycle.json`. |
| Existing Foundation F22 regressions | 1 | **57 passed, 51 failed, 108 total**, 13 files, plus **one unhandled rejection**; serial, retry 0. No rerun after this result. |
| Final Foundation typecheck including final new test source | 0 | Passed. |

The dedicated TEMP/TMP setting was confined to the verification process environment. It did not change any configuration or timeout. Its root is `docs/architecture/evidence/foundation-cleanup-implementation-20261020/runtime-temp`; it is separate from real Component storage and has been retained with generated cache files. The first runner failure is not counted as a product test failure or silently discarded. The later invocation corrected runner isolation, retaining unchanged assertions and budgets.

The existing editor-package-contract tests perform another normal package build and check actual Node public exports, published consumer TypeScript entry points and browser validation isolation. **All three passed.** All existing generated declarations and other recorded generated files remained byte-identical. No complete platform build, whole-platform typecheck or UI execution was attempted; the package build/typecheck and existing package export checks are the relevant bounded checks here.

## 3. Targeted fault matrix results

All listed cases ran against uniquely created disposable roots. Each canonical `probe-card/component.visual.json` anchor and SHA-256 key is captured in `fault-lifecycle.json`; every key differs from the real Customer key. A child process exited with code 0 before its PID was used; each dead-owner fixture reconfirmed ESRCH. No fake process-death authority was inserted in production.

| Approved IDs | Cases passed | Evidence established |
| --- | ---: | --- |
| F01/F02 | 2 | Exact callback value/count, initial and guarded replacement success; reread/remove/replacement/guard-release/publication/admission order; closed handles and absent owned files. |
| F03 | 2 | Guard EEXIST/native failure does not grant ownership or clean foreign guard/main bytes. |
| F04 | 3 | Empty, invalid and different live reread preserve main bytes, refuse admission, release owned guard. |
| F05 | 4 | Dead unlink ENOENT/native failure and replacement wx EEXIST/native failure preserve original mappings; no owned main cleanup. Injected competing winner remains intact. |
| F06 | 2 | Guard close rejects before/after native close; no guard unlink or PID publication; main closes/unlinks independently; actual guard fd variant captured. |
| F07 | 2 | Guard unlink rejects before/after delegated deletion; replacement closes/unlinks, callback 0, exact error, no reconstruction/retry. |
| F08 | 2 | PID write failure on initial/replacement route; no callback/sync, successful main cleanup, exact error. |
| F09 | 2 | PID sync failure on both routes; exact decimal current PID verified after actual write, no callback, successful main cleanup. |
| F10 | 4 | Initial/replacement close rejection before/after native close; one close, no unlink, PID-bearing file retained, actual fd states recorded. |
| F11 | 4 | Initial/replacement unlink rejection before/after deletion; confirmed closed handles, actual retained/absent bytes, no callback replay. |
| F12 | 6 | Frozen Error, busy, unresolved, number, null and undefined callback errors retain identity despite post-admission abort; callback once. |
| F13 | 1 | Pre-abort preserves foreign bytes and exact reason; no open or callback. Cancelled-local-waiter coverage also passed in F22. |
| F14 | 1 | Abort after replacement creation preserves guard release → PID write/sync → original admission refusal, callback 0 and main cleanup. |
| F15 | 2 | Controlled monotonic clock exhausts original 5000ms budget during publication on both routes; callback 0 and successful cleanup. No production budget change. |
| F16 | 2 | Write+close and sync+unlink retain primary/cause and cleanup ordering; no skipped-close unlink or retry. |
| F17 | 2 | Callback busy primary with close/unlink failure aggregates correctly; one callback and one initial acquisition. |
| F18 | 2 | Unresolved/live reread primary plus guard-close failure; aggregate identities and foreign main bytes retained, no main cleanup ownership. |
| F19 | 3 | Approved selected pairs of guard/main cleanup failures; eligible independent obligations attempted, skipped unlinks explicit, ordered aggregate. |
| F20 | 2 | Busy and unresolved cleanup errors survive late abort with exact identity; one guarded acquisition path, no callback or retry. |
| F21 | 9 | Undefined/null/frozen/nested primary, repeated identical cleanup reference and lone arbitrary cleanup values; no flattening/deduplication or lost presence. |
| Serializer compatibility | 1 | Actual unchanged server error function, extracted and transpiled without importing/starting the server, preserves ordinary unresolved 503 and composite 500. |
| **Total** | **58** | All passed; original assertions/timeouts outside the new file remain unchanged. |

Native FileHandle references are retained by the test fixture. Per-case rows capture fds, exact hex residual bytes, attempts/completions, callbacks, opens, unused injected faults and public rejection structures before fixture cleanup. Deliberately still-open disposable handles are then closed directly and only that verified temporary root is deleted. This fixture cleanup is not evidence of production close success. Failed tests' assertions were not relaxed or altered.

## 4. Existing regression results and blocker classification

| Existing file | Passed | Failed |
| --- | ---: | ---: |
| application-build.test.ts | 0 | 7 |
| artifacts.test.ts | 1 | 19 |
| consumer-contract.test.ts | 0 | 5 |
| editor-package-contract.test.ts | 3 | 0 |
| graph-admission.test.ts | 9 | 1 |
| migrations-deployment.test.ts | 0 | 9 |
| role-bundle.test.ts | 16 | 0 |
| schema-adapter-compatibility.test.ts | 3 | 0 |
| security-definitions.test.ts | 0 | 2 |
| unresolved-owner.test.ts | 21 | 0 |
| watcher-fallback.test.ts | 0 | 1 |
| watcher.test.ts | 0 | 5 |
| windows-storage.test.ts | 4 | 2 |
| **Total** | **57** | **51** |

Observed causes and limits:

1. **Hard-link denial:** 45 failed-test messages explicitly include EPERM/link, including assertion failures whose received exception reports that operation. The source stack reaches unchanged `immutableWrite` link creation. Another conflict-type assertion reports a truncated EPERM exception. These are real failed checks, not accepted skips. The underlying reason for denied hard links was not established by a controlled comparison; a sandbox/filesystem restriction is plausible. Do not claim it proves every failure environmental or that the correction cannot contribute elsewhere.
2. **Two timeouts:** application-build coalescing and watcher discovery exceeded their original 5000ms harness bounds (JSON reports STACK_TRACE_ERROR; verbose stderr retains timeout text). The run also records an unhandled EPERM/link rejection in application-build coalescing. That supports an upstream interruption in that case, but does not conclusively explain both timeouts.
3. **Two CLI return-code mismatches:** actual 2 versus expected 1. Filesystem failure is a possible upstream cause; direct per-operation attribution for those returns is missing.
4. **Graph handoff ordering:** `graph-admission.test.ts:101` expected first line `child`, observed `local-3`. This is an unresolved compatibility failure. Nine other graph cases passed. A scheduling race, environment effects, an existing weakness or the correction's extra asynchronous cleanup boundaries are hypotheses, not established causes. The run alone does not demonstrate an architectural incompatibility conclusively, but acceptance cannot assume one away. No fairness tweak, timing change, automatic retry, assertion change or additional experiment was made.

The actual raw error evidence and complete test ordering are in `regression.stdout.txt`, `regression.stderr.txt` and `regression-results.json`; `regression-summary.json` and `failure-classification.json` are derived indexes. Message grouping is not a causal experiment. Passing role/journal/canonical-owner and unresolved tests support those cases; they do not establish all generic ArtifactService or Windows rollback checkpoints, which were interrupted by failures.

## 5. Combined-error compatibility

The approved multiple-error representation is implemented and directly tested: exact primary cause/errors[0], ordered cleanup identities, explicit phase message, no promoted code/status/committed/recoveryRequired and no mutation of originals. Single public typed errors retain their existing 503 identity/contract. The actual server serializer logs the same aggregate reference and returns generic HTTP 500 with its cleanup message, whereas an ordinary unresolved error produces 503/source.owner-unresolved.

This compatibility check executes only the extracted existing error function with isolated json/console capture; it is not an HTTP end-to-end or live server request. No application startup, real source read, real lock health probe or live diagnostic instrumentation occurs. Public package export/type checks passed through the existing suite; declaration hashes remained unchanged. Ownership cleanup aggregation remains outside callback-local commit/rollback handling, without any new AggregateError-to-journal-recovery mapping.

## 6. Preservation and exact changes

Before editing, `before.json` recorded source and generated hashes, dependency manifests/lock and installed linked package metadata, Node version, Git HEADs/status and direct real identity/lock state. All 2,569 pre-existing UI inventory hashes matched the accepted prior baseline. `dependent-before.json` freshly checked 158 Data Services and 38 captured Application paths, all matching prior hashes. No Foundation real-store API was used for these inspections.

The final `preservation.json` checked the same **2,569 UI files**, **158 Data Services files** and **38 Application files**. Exactly two existing UI paths differ:

| Existing path | Before SHA-256 | After SHA-256 |
| --- | --- | --- |
| packages/artifacts/src/storage.ts | a3b7e0bc87ea9244db78dd7066c8d33c236522ce1c326753724362131490ee3e | acc1bcbd194bcb2565fbd2addaa58ab236a0a48cb384c25ba232962f887f1cb3 |
| packages/artifacts/dist/storage.js | 63d7615668b13c4e695c6ca9970ca8b5aa55d99ba19d082381e609028c9aad13 | 455c33c4311671e8fb4818a76e5a35cc15e3b6adba1a38248d4e714a7285f67f |

All other existing enumerated files, historical evidence, dependency records and declarations match; Data Services/Application differences are empty. Pre-existing tooling edits and untracked files remain preserved. UI HEAD remains `c86ecb3708fd619791b7f667b02b0c4c673bd686`; Data Services HEAD remains `81b769eef3763d02343f5347888c26edab6ef7bc`. No repository configuration, index/history or remote operation was intentionally performed; the authorized source/build changes remain uncommitted.

Direct real-state comparison passed: canonical Customer anchor and key `d179aa405e5fabc10c0dcd063888480c115eb75f2ef03df9f74ce3ec26e0043e`, zero bytes/empty SHA-256, inode 17169973580092885/device 1344742221, creation/write/change metadata and all five role hashes match. The keyed transaction directory remains empty; journal and recovery guard remain absent; Component entries remain the original five roles. Access metadata is recorded rather than restored. The actual lock was never acquired, removed, renamed, recreated or recovered. Its creator and historical failure mechanism remain unknown.

`foundation-cleanup-implementation-20261020-files.json` enumerates exact modified/new implementation, test, report, evidence and retained temporary-cache paths with sizes and SHA-256. Generated test cache state is separated from implementation. The known ignored `node_modules/.vite/vitest/.../results.json` is reported separately with no invented before hash: it was outside the preserved product/evidence baseline. Other dependency/cache directories and full-volume activity are not claimed exhaustively snapshotted. No existing historical evidence file was used as a new test output target.

## 7. Recommendation and next decision

**Do not accept the correction yet.** The targeted cleanup behavior is demonstrated by 58 passing new cases and the narrow implementation is reviewable, but F22 has not passed. Preserve this implementation and failed run for review. Do not infer D6 readiness or propose immediate Builder/full-suite execution.

The next authorization should be a bounded regression-failure investigation: first establish whether ordinary non-administrator disposable storage can perform the unchanged immutable-link path in an appropriately isolated execution environment; separately design exact process/operation correlation for the graph handoff failure. Any active reproduction or further test execution, environment change, before/after comparison or graph diagnosis requires a new explicit review decision here. Do not increase budgets, introduce retries, weaken assertions or extend the production correction to repair fairness/journal/filesystem behavior under this authorization. If a true architectural incompatibility is found, return to architecture review before changing code.

Abrupt process termination, native operations that fail to return handles, PID reuse, pre-publication visibility and uncertain close failures remain limitations of the existing protocol. This change improves cleanup ownership and failure reporting, not universal release guarantees or authority to reclaim the real unresolved lock. Real-lock maintenance and Builder acceptance require separate gates.

**STOP AT FOUNDATION CLEANUP IMPLEMENTATION REVIEW GATE. D6, WP5-F and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.**
