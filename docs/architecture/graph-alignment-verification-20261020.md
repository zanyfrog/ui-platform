# Graph alignment implementation and limited Foundation verification

2026-10-20. **AUTHORIZED LIMITED SELECTION PASSED: 82/82. FOUNDATION CLEANUP REMAINS UNACCEPTED.** Stop at **GRAPH ALIGNMENT IMPLEMENTATION AND LIMITED VERIFICATION REVIEW GATE**. D6, WP5-F and WP5-I remain open and unaccepted. All **40 umbrella requirements remain unchecked**, zero checked.

## 1. Exact test-only change and pre-execution review

Only the body of the named handoff integration case in `packages/artifacts/tests/graph-admission.test.ts` changed. It now calls the test-only aligned integration helper. All imports, the other nine cases/assertions and the 15000-ms integration bound remain byte-identical to the original prefix/suffix. The original file remains separately preserved at `evidence/graph-contract-environment-20261020/graph-admission.original.test.ts.txt`, SHA-256 `aba915c46873d834ca8325c182cf2f061b30640ae6fd458e45500c332e7fab32`. Historical failed child-first results are unchanged.

New test files/helpers:

- `packages/artifacts/tests/helpers/graph-alignment.ts`: exact-path native phase observation, explicit child EEXIST synchronization, direct local queue registration, fail-only exclusion witness, assertions and evidence capture.
- `packages/artifacts/tests/helpers/graph-child.mjs`: unchanged built Foundation graph acquisition through a real child; native operation observation loaded before package import; PID/publication/callback/release events.
- `packages/artifacts/tests/graph-timing.test.ts`: 14 focused controlled timing/negative/boundary cases, with isolated native filesystem/timer mocks and real native-delay cancellation cases.

The exact test/helper diff is `evidence/graph-alignment-verification-20261020/test-only.patch`, SHA-256 **a7687c65a9c3515392d863e37ceb5d387a831d43c4ed1a81bd0e3972fca73a4d**. It was generated and reviewed **before execution**. `diff-review.json` and `pre-execution-review.md` record compliance. One hundred other existing package source/build/test paths matched baseline, including the existing 58-case cleanup test. A 114-file execution-input hash freeze covered test changes, production/compiled package files, dependencies, exact patch and launch helpers; it was checked before capability, before tests and between the two selections. No implementation or test edits followed execution.

Review confirmed the original child **3000-ms**, parent **5000-ms**, handoff **50-ms**, poll **25-ms** and integration **15000-ms** bounds. No retry, product configuration, generated output, ownership format or locking/recovery authority changed. Later callbacks receive no parent approval or sequencing gate: their witness fails immediately on collision and never waits/retries. No child-first/global FIFO assertion remains. Source paths resolve only to disposable fixture roots. The unchanged imports now unused by the original case are deliberately retained to preserve unrelated file bytes.

The diagnostic-only launch code lives in the new evidence directory, not the installed test/product runtime. Its full source is retained and frozen; `verification-helper-additions.patch` is a post-run convenience diff of those same unchanged reviewed sources. No test hook was added to production Foundation.

## 2. Native executions and results

Every listed test run was serial (`--maxWorkers=1 --no-file-parallelism`), retry-disabled (`--retry=0`) and fail-fast (`--bail=1`). No assertion failed, so the conditional cleanup selection ran once after the graph selection passed. No other F22 or Builder/UI suite ran.

| Check | Result | Native exit / evidence |
| --- | --- | --- |
| Artifact package test-only typecheck, no emit | Passed, final test/helper sources included | **0**, `typecheck.*` |
| Child/preloader/capability JS syntax and host launcher parse | Passed | Syntax/parse records in `syntax.json` and individual streams |
| Fresh original-sequence native hard-link capability | One attempt, passed, exact linked identity/bytes verified, cleanup passed | **0**, `capability-result.json`, `capability.exit.json` |
| graph-admission.test.ts | **10/10 passed**: aligned case plus all nine retained cases | Graph selection native **0** |
| graph-timing.test.ts | **14/14 passed** | Same graph selection native **0** |
| cleanup-ownership.test.ts | **58/58 passed**, unchanged source/assertions | Cleanup selection native **0** |
| **Total authorized tests** | **82 passed, zero failed** | Two separate invocations, no rerun |

Complete stdout/stderr, exact commands/arguments, native exit/PID records and full test JSON are in the phase evidence directory. `graph-results.json` records 24 tests in two files; `cleanup-results.json` records 58 in one file. The graph native command took approximately 1.61s and the cleanup command 1.59s according to their runners; those are observations, not new timing guarantees. No full build was needed or run; no-emit typecheck preserved generated output. No test timeout or production budget was increased.

## 3. GA1–GA10 coverage and functional outcomes

| Criterion | Evidence/result in this selection |
| --- | --- |
| **GA1 — cross-process exclusion and real contention** | Aligned integration passed. Parent holder was admitted with its witness held; actual child native wx returned EEXIST before release. Parent owner bytes remained its PID, no parent unlink occurred before release, and no waiting contender callback entered. Independent witness never collided; exact callback/phase counts and release checks passed. |
| **GA2 — local queue scope/order and cancellation holes** | Integration direct local registrations produced local-0 through local-3 in order after filtering independent-process entries. Retained cancellation case and new controlled middle-entry cancellation passed; successor could not bypass the holder/predecessor. No wrapper invocation-order or cross-process FIFO claim. |
| **GA3 — cooperative handoff** | Unqueued acquisition requested no artificial handoff. Controlled queued acquisition requested 50ms, made no second exclusive attempt at clock 49, and resumed at 50. A 4975-ms queued wait capped handoff at 25 and expired without admission. |
| **GA4 — contention polling** | Live owner retained; no additional attempt at 24ms, next attempt after the requested 25. Remaining-deadline branch requested 12ms after 4988ms had elapsed and exhausted honestly without callback/unowned cleanup. |
| **GA5 — one deadline and publication admission** | Queue 4900 + handoff 50 + polling 25 + 25 consumed the original 5000ms; waiting callback count 0, no deadline reset, foreign live PID retained. Publication consuming the deadline could not admit work and still cleaned its owned handle/file. |
| **GA6 — cancellation** | Pre-abort preserved exact reason without any open. Cancelled queued middle entry preserved exact reason and did not release its predecessor or let a later caller jump it. Retained live-owner/cancellation assertions passed unchanged. |
| **GA7 — phase-specific cancellation semantics** | Actual native promise-delay handoff abort returned AbortError/ABORT_ERR with exact cause. Contention-delay abort preserved the original outer signal reason. No waiting callback or unowned unlink. |
| **GA8 — admission/no replay** | Retained graph busy/no-replay and admitted-work-abort cases passed. New admitted busy rejection survived a spent deadline and abort with one callback/open. Cleanup suite retained frozen/primitive/unresolved/busy identity and post-admission cancellation cases. |
| **GA9 — cleanup remains terminal** | All original 58 cleanup cases passed: guard close/unlink, publication/close/unlink faults, combined errors, no unlink after rejected close, no unowned cleanup, no retry/callback replay or abort masking. Exact aggregate cause/order and ordinary/combined serializer expectations retained. |
| **GA10 — graph/role/canonical boundaries** | Existing recursion and role-to-graph inversion assertions passed unchanged. New disposable unrelated-role journal marker remained byte-identical across graph admission. A disposable junction-root alias was refused before lock acquisition. Broader role/journal/Windows recovery suites were **not rerun**; those are not replaced by these focused graph checks. |

The timing file controls global queue timers and monotonic accounting on one virtual clock, with explicit request/phase barriers. It verifies requested timing and admission rules, not OS hard-real-time scheduling. The two native-delay abort cases use the real Node promise-delay API for phase-specific error semantics. Native fs calls remain original operations on disposable roots; controls are test-only and reset after each case.

## 4. Graph phase and identity evidence

Integration run ID **74e5ea97-c409-4f27-80d6-210bbecc1fae** used:

- Parent test worker PID **27400**, graph child PID **37748** (PPID 27400).
- Canonical shared fixture root `...\runtime-638e7e9bb1f04076965f509ea6139c0f\d6-4xII6y`.
- Fixed graph identity key **236dfbe257a229da85d588f4f851f4ea1e72efefbe5565e69e305f0d6f69602d**. The fixed graph key is intentionally the same protocol identity; the complete storage/lock pathname is isolated by its disposable root and never targets the real store.
- Child loaded compiled storage SHA-256 **455c33c4311671e8fb4818a76e5a35cc15e3b6adba1a38248d4e714a7285f67f**, matching the approved unchanged build.

`graph-integration.json` retains **75 parent events** and **17 child events**, all contiguous per-process sequence numbers, IPC messages and child complete result/streams. One actual EEXIST contention report established the release barrier. Publication/sync precede callback entry; callback exit precedes successful main close, then unlink. The holder and each of four locals and child had exactly one callback enter/exit, witness acquire/release, publication/sync and successful close/unlink. All five parent main fds were -1 at residual capture. Main lock and witness were absent; only ordinary fixture output and `.uib` remained before fixture teardown.

Cross-process conclusions use the initial IPC barrier and failure-only witness. Different processes' monotonic clocks are not treated as one global clock. The output exact-ID set and local FIFO were asserted during the test; the raw order.txt was subsequently disposed by the original afterEach and is not retained as a separate raw artifact. Per-process event/IPC records remain; no unrecorded global winner order is asserted. This is one measured competing schedule, not a global fairness theorem or proof for arbitrary load.

`graph-timing.json` retains all 14 timing/boundary rows with clocks, requested delays, attempt/callback/unlink counts, fds and residual owner bytes before fixture disposal. Controlled negative cases intentionally retain their test-owned live-owner file until fixture teardown; they do not reclaim a real unresolved owner.

`fault-lifecycle.json` retains all 58 cleanup cases with native handle states and exact residual hex bytes **before** test-only cleanup, plus public error structures. There were no unused injected faults. Cases deliberately rejecting close can show a truly open native handle in this snapshot; the unchanged fixture then closes only its known disposable handles before removal. Snapshot-open is not falsely reported as production close success.

## 5. Fresh actual host/worker capability and isolation

The prior host success was supporting evidence only. Fresh coordinator PID **11344** independently confirmed ordinary `NIMO-LAPTOP\zanyf`, administrator=false, elevated=0, AppContainer=0, medium integrity. The exact Node executable was `C:\Program Files\nodejs\node.exe`, v24.19.0, SHA-256 **3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237**. NTFS and the evidence-parent SDDL were recorded. There was no RunAs/UAC, token adjustment, ACL edit or security-policy weakening.

Every Node entry point waited in the launch-only preloader before executing test/application code. The independent host coordinator queried that live PID/start/executable and actual token with PROCESS_QUERY_LIMITED_INFORMATION/TOKEN_QUERY, then released only an exact nonce-matched process. All **eight Node processes** were directly inspected as the same ordinary user, administrator=false, elevated=0, AppContainer=0 and medium integrity:

| Role | PID / PPID |
| --- | --- |
| Native capability | 28680 / 11344 |
| Graph runner | 22808 / 11344 |
| Controlled timing worker | 35756 / 22808 |
| Graph integration worker | 27400 / 22808 |
| Real graph child | 37748 / 27400 |
| Cleanup runner | 9720 / 11344 |
| Cleanup worker | 17080 / 9720 |
| Cleanup known-dead-PID fixture child | 10940 / 17080 |

Each context includes executable hash, exact Windows process start, independent inspection time and worker self-reported PID/PPID/timeOrigin. Query handles were closed; no inherited-token assumption replaced actual child inspection. The fixture child exited 0 before its PID was used and was confirmed non-running by the unchanged cleanup fixture.

Exact disposable parent:

`C:\Projects\Modular\ui-platform\docs\architecture\evidence\graph-alignment-verification-20261020\runtime-638e7e9bb1f04076965f509ea6139c0f`

This was created fresh. Process-local TEMP/TMP directed original/new fixture mkdtemp calls here, creating distinct roots; the graph child intentionally shared only its parent's one test root. The initial capability used runtime/capability and the unchanged wx/write/sync/close/chmod-0444/link sequence. Its one hard link produced inode **3659174697981963**, device **1344742221**, nlink **2**, exact expected bytes, closed fd -1 and successful scoped file/root cleanup. Only after this result, independent diff/input verification and written gate review were tests released. Source hashes were checked again between selections.

Primary stdout/stderr/results used unique new phase paths. Existing history could not be overwritten by those output arguments; the process-gate records use per-PID nonce/start identities. No normal Foundation read/acquisition/recovery, source root, application request or fixture addressed the Customer Component. Host execution was limited to the authorized scripts/selection, not unrestricted repository work.

Post-run `verification-summary.json` found the disposable runtime parent **empty**, with no fixture roots/files. All eight inspected Node PIDs were absent in the later read-only process observation (`post-run-processes.json`); no cleanup action targeted unrelated processes. The empty runtime parent is retained. Detailed new timing/cleanup/integration root names are recorded; unchanged retained graph tests use their existing mkdtemp factory and do not individually log every root name.

## 6. Preservation and exact changed files

Before implementation, `before.json` captured source/build/test/dependency/Git and real-state baselines. Final `preservation.json` compared **2,645 existing UI paths**, **158 Data Services files**, **38 captured Application files** and six dependency records. Exactly one existing path changed, as authorized:

| Existing path | Before SHA-256 | After SHA-256 |
| --- | --- | --- |
| packages/artifacts/tests/graph-admission.test.ts | aba915c46873d834ca8325c182cf2f061b30640ae6fd458e45500c332e7fab32 | de2940e0109f258c702c7ae54f3d104bb3a50b3a29ac911142d4aa53750d0403 |

All other existing enumerated UI/historical files, Data Services, captured Applications and dependency bytes match. Production storage source remains **acc1bcbd194bcb2565fbd2addaa58ab236a0a48cb384c25ba232962f887f1cb3**; compiled storage remains **455c33c4311671e8fb4818a76e5a35cc15e3b6adba1a38248d4e714a7285f67f**. No generated output changed. Existing cleanup test remains **df824ad8a16542ae962ff23babd1710e37af4311feff7c8d511b1a093437746a**.

UI HEAD remains `c86ecb3708fd619791b7f667b02b0c4c673bd686`; Data Services HEAD remains `81b769eef3763d02343f5347888c26edab6ef7bc`. Pre-existing tooling/source edits remain preserved and uncommitted. No commit, push, reset, synchronization or repository configuration change occurred.

Direct real-state comparison passed: canonical Customer anchor/key **d179aa405e5fabc10c0dcd063888480c115eb75f2ef03df9f74ce3ec26e0043e**, zero-byte lock SHA/file identity, inode **17169973580092885** / device **1344742221**, creation/write/change metadata and five role hashes match. Transaction directory remains empty, pending journal and recovery guard absent. Access metadata is recorded rather than restored. No recovery, cleanup, reconstruction or normal acquisition touched that lock. Its creator/historical mechanism remain unknown.

`graph-alignment-verification-20261020-files.json` enumerates the one modified test, three new test/helper files, new report/launch/capture sources and all evidence with exact hashes/sizes; it separately records transient disposable state and the known test-generated Vitest results cache. The cache was outside the preserved source/history baseline, so its current hash is supplied without inventing a measured before hash. Manifest self-entry is intentionally unhashed. Inventory is enumerated workspace/evidence plus known cache state, not a full-volume or exhaustive node_modules snapshot.

## 7. Limitations and proposed next selection

This result supports the approved graph/cleanup behavior under this bounded ordinary-host workload. It is not Foundation cleanup acceptance, D6/WP5 closure, arbitrary-schedule fairness, HTTP end-to-end acceptance or proof that previous filesystem-sensitive failures are resolved. The cleanup serializer case executes the actual extracted serializer in isolation, not a live Platform server. Test-only phase wrappers and token setup add overhead; the runtime timing claims remain bounded/cooperative, not hard-real-time.

The historical **57/108** F22 pass count and all failures remain unchanged. This aligned graph success is new contract-correct evidence, not a rewrite of the old child-first result. The current 82 tests do not exercise the remaining generic immutable-binding/CLI/watcher/deployment/Windows functional checkpoints.

Recommended next bounded authorization: the **eight remaining filesystem-sensitive Foundation files, 55 existing cases**—application-build, artifacts, consumer-contract, migrations-deployment, security-definitions, watcher-fallback, watcher and windows-storage—in a freshly revalidated ordinary host context with isolated roots, unchanged assertions/timeouts, serial execution, retry 0 and stop-on-first-failure. Confirm exact current source/selection before launch. Do not repeat graph/cleanup solely for volume, and do not automatically run all 108, Builder focused tests or the UI suite. Any new failure returns for review before edits/rerun. Foundation correction acceptance remains a separate decision after required evidence is reviewed; real-lock operations remain separately unauthorized.

**STOP AT GRAPH ALIGNMENT IMPLEMENTATION AND LIMITED VERIFICATION REVIEW GATE. D6, WP5-F and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.**
