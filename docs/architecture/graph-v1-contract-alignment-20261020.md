# Builder V1 graph contract decision and regression design

2026-10-20. **G1–G3 APPROVED BY THE USER. TEST DESIGN ONLY; IMPLEMENTATION NOT AUTHORIZED.** The Foundation cleanup correction remains implemented but unaccepted. D6, WP5-F and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.

## 1. Decision record

**G1:** Retain bounded cooperative graph handoff. The filesystem exclusive create remains the cross-process admission authority. The existing per-module/process local queue orders actual entries to the same key. Queued graph callers retain the `min(50, remaining)` handoff opportunity; contention retains `min(25, remaining)` polling. One original acquisition deadline covers queue, handoff, contention and publication/admission checks. Cancellation and admitted-work/no-replay behavior remain unchanged. There is no deterministic child-first priority, global FIFO order or starvation guarantee across independent processes.

“Local ordering” means local queue insertion order within the existing module instance and key, not arbitrary asynchronous public-call invocation order. `withRoleBundleGraph` performs awaited canonicalization before calling the lock. A caller invoked earlier can therefore reach the local queue later. Independent module instances/processes do not share that queue. No new coordinator, token, lease or fairness authority is approved.

**G2:** Revise the regression design to observe actual phases and verify G1, replacing the unconditional child-first assertion with substantive exclusion, queue, handoff, polling, admission/deadline, cancellation and no-replay checks. This document proposes that design; no existing test or assertion is changed or executed now.

**G3:** Keep immutable publication exactly as exclusive sibling create → write → sync → close → chmod 0444 → hard link → temporary cleanup. Environment capability must accommodate this algorithm. Copy, rename, overwrite, privileged execution and weaker identity publication are not alternatives approved by this decision.

The prior assertion at `graph-admission.test.ts:101` expected `child`, observed `local-3`. It remains a historical failed check. G1 resolves the contract question, not the exact historical schedule. No result is reclassified as a pass. The original full test file is preserved byte-for-byte in `evidence/graph-contract-environment-20261020/graph-admission.original.test.ts.txt`; original raw F22 results remain at their existing paths/hashes.

## 2. Proposed change boundaries

A later authorization could revise only the named integration case in `packages/artifacts/tests/graph-admission.test.ts`, add a narrowly scoped test-only child/preload helper, and add a separate timing-test file if module mocks would otherwise affect existing cases. Existing independent graph cases, cleanup fault tests, production files, compiled output, configurations and acquisition/test budgets must remain unchanged. Review the final test diff before running anything outside that explicit selection.

The revised integration case must keep its original **15000-ms** outer test bound, child **3000-ms** acquisition budget and parent graph **5000-ms** budget. No retries, deadline restarts, larger setup waits, polling-speed changes or child-first forcing are allowed. Setup/phase failures fail honestly with retained evidence; they do not trigger another attempt. An unhealthy runner can still fail within that finite workload; success is not an arbitrary-schedule liveness theorem.

## 3. Explicit phase synchronization

Give every attempt a run/operation ID, PID, process-start identity, canonical disposable root, graph key and module/executable/source hash. Parent and child use one unique verified disposable root; verify equal canonical root and graph key before contention. Parent imports must resolve to one Foundation module instance; do not mix src and dist in the parent and accidentally create distinct local queues. The child uses the existing built package with its hash recorded. No real Component, Application or unresolved lock path is a valid fixture input.

| Phase | Required evidence / barrier | What it does not prove |
| --- | --- | --- |
| Child bootstrap-ready | IPC after instrumentation is loaded and unchanged Foundation is imported; report identity/version/root/key | No lock request yet. |
| Parent holder-admitted | Callback-enter event and a held exclusion witness, then explicit holder gate | Not permission for another callback. |
| Local queue registration | Valid direct supported `withArtifactLock(canonicalRoot, canonicalRoot, ..., 'visual-runtime-graph-v1', {timeoutMs:5000})` calls from the test continuation, in an explicit sequence | Not invocation ordering through asynchronous canonicalization or any global FIFO. |
| Child exclusive-attempt | Test-only native-open wrapper records exact graph pathname and wx immediately before delegating | Attempt alone is not ownership. |
| Child contention-observed | Original native wx actually returned EEXIST while the parent holder gate is still closed; child sends the error outcome and operation ID | Not a reservation or next-owner entitlement. |
| Parent release-commanded | Only after holder-admitted, local registrations and child EEXIST are established, release the initial holder | Does not fix the later inter-process winner. |
| Callback-enter / exit | Entry count and witness ownership; exit recorded only after protected work and eligible witness cleanup | An IPC arrival timestamp is not acquisition time. |
| Main close/unlink / settled | Path-qualified native completion events, then the acquisition promise's exact outcome | Callback exit alone is not full lock release. |

For queue registration, the direct lock function executes validation and `localLocks.set` synchronously before its first await. Use already canonical roots, valid positive budgets, no pre-abort and a caller outside held callback context; retain those preconditions. The explicit sequence of such calls establishes insertion order from the reviewed control flow without inventing a queue notification. Keep the initial holder and real child on `withRoleBundleGraph` so the integration still covers the supported graph wrapper. Existing wrapper/canonicalization tests remain; this change does not redefine their invocation order as FIFO.

The child `waiting` IPC event from the old fixture is insufficient: it precedes completion of asynchronous canonicalization. Replace that synchronization point with the actual original EEXIST result. If the event is absent, setup fails; do not infer it after sleeping or from a generic ready message.

Instrumentation is test-only and exact-path scoped. A child preload may wrap the existing native fs-promises open and returned handle methods before dynamic import, synchronizing built-in ESM bindings using the supported Node mechanism; the parent uses the existing Vitest native-fs mocking pattern. Delegate the original operation once, preserve its handle/bytes/error and never alter an admission decision. Verify that the wrapper actually observes the imported implementation before relying on events. If the available loader cannot supply that observation without a production change, stop for design review. No installed Foundation copy is edited or substituted.

Events should be emitted without awaiting IPC acknowledgment inside production acquisition/cleanup wrappers. Only the initial holder callback gate and external fixture setup are intentionally held. Do not insert one-at-a-time parent approvals for later callbacks, which would hide a mutual-exclusion bug. Instrumentation adds overhead and continuations; document it rather than claiming timing equivalence to an uninstrumented schedule.

## 4. Replacement integration assertions

Use an independent **failure-only exclusion witness** within the disposable root: each admitted callback exclusively creates a sentinel using wx, retains its actual handle across its critical section, then closes/unlinks it before callback completion. If a second callback encounters EEXIST, fail immediately and retain the trace; never wait or retry the witness. The witness detects overlap; it must not serialize production access or replay work. Initial holder includes the same witness so pre-release violations are detected.

After the synchronized initial holder releases, permit parent and child to compete naturally. Assert all of the following:

1. While the holder gate is closed, actual child EEXIST is observed, no contender callback enters, and no foreign owner file is removed or replaced. Record owner PID bytes and native handle lifecycle at defined completed-operation boundaries, without treating an asynchronous later reread as the original observation.
2. The finite positive workload completes within its unchanged budgets/harness, each admitted callback executes exactly once and the child exits 0. The output/trace contains exactly the expected operation IDs, with no duplicate or missing entry/exit pairs. If budget exhaustion or runner delay occurs, report that failure; do not grant success merely because G1 has no global fairness theorem.
3. The exclusion witness never overlaps; every callback's protected read/write is enclosed by its production admission/release boundaries. Each local caller's entry order matches the direct registration order after filtering out independent-process entries. Do **not** require child to be first, child to precede any particular local entry, or a shared global FIFO.
4. PID publication/sync precede each observed callback entry; successful close precedes unlink; owned resources are released, and no source/journal outside the disposable fixture is touched. Missing native event coverage fails the corresponding evidence assertion rather than being interpreted as success.
5. Rejecting callbacks retain their exact values and are never executed twice, including busy-family errors. Signal/deadline changes after admission do not interrupt or replay admitted work. Keep original independent no-replay tests and explicitly link their results to this acceptance matrix.

Parent/child event sequences are ordered per process. Use IPC/barrier causality and witness results for cross-process conclusions, not numerical comparison of different processes' performance clocks. Record UTC calibration, per-process monotonic sequence, process-start identity and dropped/missing event counts. Flush child records before successful exit and preserve complete stdout/stderr/native code; assert no missing operation IDs. An abrupt worker exit is a failed/incomplete trace, not exclusion evidence.

## 5. Deterministic timing and negative-coverage design

A real-process success cannot prove the exact 50-/25-ms scheduling rules. Verify these separately through test-only controlled timers/clocks and actual unchanged lock code. Keep global queue timers and `performance.now` consistent with the same virtual clock; selectively control the imported promise-delay API. Native fs phases still use disposable paths. Advance only after explicit phase completion, not a guessed number of microtask flushes. Reset every timer/clock/module mock after each case. Do not run timing-mocked cases concurrently with the integration case.

| ID | Proposed acceptance criterion | Existing related coverage / required addition |
| --- | --- | --- |
| GA1 | Real child is observed contending while holder is admitted; independent witness detects any overlapping callback; all operation counts correct, any inter-process order allowed | Replace old child-first integration assertion with section 3–4 checks. |
| GA2 | Same-module same-key direct registration order is preserved; a cancelled middle entry never lets a successor bypass its predecessor | Keep existing queue/cancellation case; add explicit direct registration/order observations where absent. |
| GA3 | After predecessor settlement, queued graph acquisition requests `min(50, remaining)` and makes no exclusive attempt before the controlled delay resolves; an unqueued acquisition has no invented handoff | New deterministic scheduler observation; test 50 and remaining-budget-capped branches. This is a minimum cooperative opportunity in the controlled clock, not an OS hard-time promise. |
| GA4 | A real live-owner EEXIST yields a requested `min(25, remaining)` delay and no next attempt before that delay resolves; no unsafe owner deletion | Retain existing live-owner protection and add exact delay/capped-remaining observations. A PID written by the fixture must be confirmed live; no dead-owner shortcut. |
| GA5 | Queue wait, handoff, contention and PID publication consume one original deadline; no callback after it is spent, and no reset on retry | Retain existing controlled-clock deadline/publication checks; add a queue-to-handoff/contended attempt transition if existing cases do not cover the combined accounting. No production budget increases. |
| GA6 | Pre-abort/queued abort retain existing reason and no callback/file cleanup authority; cancellation holes preserve predecessor ordering | Existing graph/owner cases plus phase evidence. |
| GA7 | Abort during native promise-delay handoff returns the existing AbortError/cause behavior; contention-delay abort retains the original outer signal-check behavior; callback 0 and no foreign unlink | Add phase-specific assertions only after confirming original API behavior. Do not incorrectly require identical top-level error identity for every cancellation phase. The unchanged handoff delay is outside the contention catch; preserve that distinction. |
| GA8 | A callback throwing exact busy/unresolved/frozen/primitive values executes once; post-admission abort/deadline cannot replay/interrupt it | Existing graph tests and 58-case cleanup fault coverage; retain their assertions, add only missing integration count evidence. |
| GA9 | Cleanup failure is terminal even before admission; no retry, cancellation masking, unowned unlink or unlink after rejected close | Retain approved cleanup fault tests F06–F21. A graph-alignment test must not replace or loosen them. |
| GA10 | Recursion, role-to-graph inversion, role/journal authority and canonical root safety retain existing contracts | Existing independent graph/role regressions remain required; no broadening production changes. |

The proposed revised verification is not “remove first-line assertion and check child exited.” It replaces priority with independently observed exclusion and exact counts, plus direct queue and deterministic timing/negative checks. No test claim may rely solely on elapsed wall time, telemetry acquired=true, or eventual output presence. Each barrier and failure route must have cleanup that releases only known fixture-owned handles/children and preserves residual state before disposal. Stop on isolation loss, unexpected real-store path, source hash mismatch or missing phase instrumentation.

## 6. Review and next gate

G1–G3 are accepted architecture decisions. GA1–GA10 and the helper details are a **proposed test design** requiring review and separate test-only implementation/execution authorization. No source, tests, generated outputs or configuration were changed here, and no graph or Foundation regression test ran. The original failure and all historical passes remain unchanged.

The alternative ordinary-user environment passed one native immutable-link capability confirmation; see `foundation-verification-environment-20261020.md`. That supports proposing a small test-only alignment and Foundation selection in the validated context. It does not accept the cleanup correction or authorize F22/Builder execution now.

**STOP AT GRAPH CONTRACT AND VERIFICATION ENVIRONMENT REVIEW GATE. D6, WP5-F and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.**
