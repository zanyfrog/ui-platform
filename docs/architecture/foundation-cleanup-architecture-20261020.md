# Foundation cleanup ownership — narrow architecture proposal

2026-10-20. **PROPOSED; DOCUMENTATION ONLY. STOP AT FOUNDATION CLEANUP ARCHITECTURE REVIEW GATE.** No implementation, test, compiled output, runtime or configuration is changed. No probe or verification is run. D6, WP5-F and WP5-I remain open and unaccepted; all **40** umbrella requirements remain unchecked.

Recommended correction: enter the main cleanup scope **before either main-lock exclusive-create path**, record ownership only when that create returns a handle, and retain that cleanup obligation through recovery-guard release. Guard cleanup failure blocks publication/admission but cannot bypass main cleanup. Close-before-unlink and existing recovery decisions remain unchanged.

Recommended error policy: preserve a lone error's exact identity; preserve the primary error unchanged when cleanup succeeds; use a standard `AggregateError` only when multiple failures must be reported. Mark cleanup failure privately as terminal to the current invocation **before** the existing busy retry/cancellation dispatch. Combined-failure representation and terminal cleanup dispatch require explicit architecture approval before implementation.

## 1. Reviewed baseline and demonstrated problem

Sources reviewed: `packages/artifacts/src/storage.ts:102–245`, its installed compiled `dist/storage.js`, `storage-api.ts`, `role-bundle.ts`, existing unresolved-owner/graph/role/Windows tests, and `src/server/index.ts:207–213` error serialization. Exact hashes and line references are in `evidence/foundation-cleanup-architecture-20261020/reviewed-inputs.json`.

The accepted single disposable probe showed: known dead PID → recovery guard → replacement wx success → guard close succeeds → injected guard unlink failure → exact error propagates, callback count 0, replacement handle still open and file empty. The current main publication/cleanup try starts **after** guard cleanup, so it does not protect that replacement. This is demonstrated implementation behavior under the injected failure, not attribution of the real Customer Summary Card event. The actual lock's creator and historical failure mechanism remain unknown.

Current nested finalizers also mask errors: a cleanup exception can replace the operation error; a close rejection skips its following unlink. The proposed correction keeps that conservative **skip unlink on unconfirmed close** policy while preventing one resource's cleanup failure from skipping cleanup of another resource already owned by this invocation.

## 2. Ownership invariants and smallest implementation boundary

Use two independent internal ownership records: **main handle** and **recovery-guard handle**. They are local bookkeeping, not a new ownership authority, persisted format, lease or coordinator.

| Invariant | Required behavior |
| --- | --- |
| Main cleanup scope exists before wx | Establish the outer scope before the initial `open(file, "wx")`. The same outer scope also surrounds owner inspection, guard work, replacement wx, publication and callback. |
| Ownership begins only on success | Assign the returned handle/owned flag immediately after successful wx, with no intervening await or user hook. An unsuccessful create gives no cleanup authority over that pathname. |
| Replacement is never outside cleanup coverage | Replacement wx occurs inside that already-active main scope. Guard close/unlink, errors and cancellation do not remove its cleanup obligation. |
| Guard ownership is separate | Enter the guard scope before guard wx; assign ownership on its successful return. Guard EEXIST or other open failure gives no right to close/unlink somebody else's guard. |
| Confirmed dead owner remains the only recovery authority | Preserve positive-PID parsing, ESRCH requirement, exclusive guard, actual owner reread/compare and existing race-to-busy handling. Empty/invalid metadata is never reclaimed. |
| Cleanup is conditional and once-only | For each owned handle, attempt close once. Attempt its pathname unlink once **only if that close resolves successfully**. A rejected close is uncertain even if a test's native delegate actually closed first. No close/unlink retries are introduced. |
| Independent obligations survive other failures | Guard cleanup failure does not prevent attempting owned-main cleanup. Main cleanup failure does not retroactively retry guard cleanup. Unattempted unlink after a close rejection is recorded as skipped, not silently called successful. |
| Guard cleanup is an admission barrier | If any guard cleanup fails, do not publish PID, sync or enter the callback. Go directly to owned-main cleanup, then resolve the failure outcome. |
| No success on release failure | A successful callback with failed main cleanup still rejects. Existing callback effects/commits are not undone or replayed to make that rejection appear harmless. |
| No new universal fence | A retained guard is not reinterpreted as excluding ordinary wx acquisition. Terminal means this invocation does not retry, not that every future caller is globally suspended. |

The owned record needs: optional handle, exact path already used by the existing protocol, creation-success flag, close-attempt/success flag and unlink-attempt/success flag. Use explicit error-presence flags, never truthiness: JavaScript may throw `undefined`, `null`, false or a frozen Error. No fd/stat, second read or filesystem identity query is added to decide ownership or whether to unlink. Existing cooperative-path ownership assumptions and external-writer limits remain; this is not a filesystem-wide atomicity redesign.

The narrow future production scope should be **`storage.ts` only**, including its private acquisition helper and a small private cleanup-result dispatch in `withArtifactLock`. A focused new test file may be separately authorized. No public storage export, API route, role-bundle transaction/journal, graph identity or reader implementation change is expected. Normal build output may be regenerated only under later implementation/build authorization; it is unchanged now.

## 3. Precise before/after control flow

| Phase | Current flow | Proposed flow |
| --- | --- | --- |
| Main scope entry | Main cleanup try begins after acquisition/recovery/guard cleanup. | Enter owned-main cleanup scope **before** the first wx. Initial or replacement handle is covered from its successful return. |
| Initial wx succeeds | Publish/sync/callback then main finally. | Record main ownership and continue to the same publication/admission sequence. |
| Initial wx fails other than EEXIST | Propagate; no main handle. | Same error and no main cleanup. Never unlink the path merely because open failed. |
| EEXIST: owner unknown/live | Existing parse/probe gives unresolved/busy. | Same result; no owned main or guard is invented. Existing bounded retry/cancellation remains applicable when cleanup has not failed. |
| Valid PID, ESRCH | Acquire guard, reread/compare. | Same authority and comparison. Guard's cleanup scope is independently established before its open. |
| Guard wx fails | Busy/native error; no owned guard. | Same; do not unlink an existing guard. Main cleanup remains a no-op unless this invocation actually owns a handle. |
| Reread invalid/changed | Preserve unknown/current owner, throw unresolved/busy; guard finally runs. | Same owner protection. Record primary error, finish owned-guard cleanup, then owned-main cleanup if applicable; resolve errors afterward. |
| Confirmed old owner removal | Guarded `rm(file)` then replacement wx. ENOENT/EEXIST races map to busy. | Same operations/ordering/mapping. The old dead-owner unlink is a recovery operation, **not** the later release of a newly owned main file. |
| Replacement wx fails | No replacement handle; guard finally may mask body error. | No main ownership. Preserve the body error and any guard cleanup errors; never unlink a winner's/unknown main file. |
| Replacement wx succeeds | New empty main handle exists, but main finally has not begun. | Record the new handle within the pre-existing main cleanup scope. This is the corrected gap. |
| Guard close | A rejection skips guard unlink and bypasses main cleanup. | Capture guard-close error, skip guard unlink, block publication; still attempt owned-main cleanup. No extra guard close attempt. |
| Guard unlink | A rejection bypasses main cleanup. | Capture guard-unlink error, block publication; still attempt owned-main cleanup. Never reconstruct or retry deleting an uncertain guard. |
| PID write/sync | Original `String(process.pid)` write then sync. | Identical, but reached only if recovery body and guard cleanup succeeded. Errors become primary operation errors with owned-main cleanup still mandatory. |
| Admission | Wrapper checks existing signal/deadline, then sets entered and calls original callback. | Identical checks/order and exactly-once callback. No new mid-recovery cancellation check, callback timeout or replay. |
| Main close/unlink | Sequential finally; close failure skips unlink, any failure can mask primary. | Attempt main close once; unlink once only on confirmed close success. Retain all thrown cleanup values alongside any primary. |
| Error/value resolution | Finally throws can implicitly replace earlier outcomes; pre-admission catch may replace with cancellation/retry busy errors. | After all eligible cleanup attempts, explicitly arbitrate. Cleanup-failed outcomes use private terminal dispatch before retry/cancellation. Ordinary outcomes retain existing dispatch. |

The cleanup path must not return or throw prematurely from an inner finally and thereby skip the outer obligation or overwrite the outcome. Collect guard cleanup failures without throwing them out of that finalizer. Route any guard failure directly to main cleanup; do not accidentally fall through into PID publication. Once cleanup completes, decide success/error **outside** cleanup finalizers. A small internal result record is sufficient; do not add a second coordinator or new persisted state.

Conceptual order, not executable implementation:

1. Establish main cleanup scope; attempt initial wx or existing owner/recovery path.
2. If recovering, establish guard cleanup scope; perform existing guarded reread/remove/replacement; finish eligible guard cleanup.
3. If recovery body or guard cleanup failed, bypass publication/admission.
4. Otherwise perform existing PID write → sync → admission → original callback.
5. Finish eligible main cleanup regardless of the outcome of steps 2–4.
6. Resolve original result/error or the explicitly reported cleanup-failed outcome.

No JavaScript finally can guarantee cleanup after forced process termination, fatal runtime failure or an unreturned native handle. This correction covers ordinary control-flow errors/cancellation with a returned owned handle; it does not eliminate the pre-PID visibility window or resolve existing abandoned locks.

## 4. Deterministic error policy

### Definitions and ordering

**P** is the actual primary operation error: acquisition/owner-read/probe/recovery-body failure, PID write/sync, existing admission cancellation/deadline error or callback rejection. It may be any thrown value; retain its identity. Guard close/unlink and main close/unlink are **cleanup failures C**, not replacement primary errors.

Record C in actual fixed cleanup order: `guard.close`, `guard.unlink` if guard close succeeded, `main.close`, `main.unlink` if main close succeeded. Each record retains phase plus exact thrown value. A skipped operation is not a new error, and absence of an error is not assumed success for an unattempted operation. Do not flatten an original AggregateError, deduplicate equal error references or mutate/freeze/decorate an original thrown object. Two distinct failing operations that throw the same object are still two recorded failures.

| Primary P | Cleanup failures C | Required final public outcome | Retry/cancellation policy |
| --- | --- | --- | --- |
| None | None | Original callback value, or existing acquisition/dispatch flow. | Existing behavior. |
| Present | None | Exact P, subject to the **existing** pre-admission cancellation dispatch described below. | Existing busy/deadline/cancellation and entered/no-replay policy unchanged. |
| None | Exactly one | Throw that exact cleanup error/value. Do not wrap or mutate it merely to attach phase information. | **Terminal to this invocation** even if it happens to be an ArtifactBusyError or owner-unresolved instance. |
| None | Two or more | Standard `AggregateError`; `.errors` contains C values in cleanup order; `.cause` is first C. Fixed message identifies ownership cleanup and ordered failed phases. | Terminal; no acquisition replay or cancellation replacement. |
| Present | One or more | Standard `AggregateError`; `.cause === P`; `.errors === [P, ...C values]` by element identity/order. Fixed message distinguishes an operation error followed by ownership cleanup failure and lists failed cleanup phases. | Terminal; primary remains inspectable, every cleanup failure remains visible. |

The AggregateError itself is new; the original primary's identity is preserved as cause/errors[0], **not** falsely claimed as the identity of the outer rejection. This is the intentional exception to exact top-level identity when multiple failures must be represented. Messages must explicitly mention cleanup failure so `String(error)` diagnostic consumers do not hide it. Full original errors remain in standard `.errors`/`.cause`, and existing server logging can inspect them. No live diagnostic event channel is required to avoid suppressing cleanup errors.

### Private terminal provenance

Use a module-private branded carrier/result for any outcome that includes a cleanup failure. It contains the already-resolved public failure, not a second copy of it. In `withArtifactLock`, recognize that private provenance **before** `if (entered)`, `check()` or the `ArtifactBusyError` retry condition and throw its contained public failure directly. It must never escape the public boundary or be exported via `storage-api.ts`; do not recognize it by user-controlled message/code or by generic AggregateError shape.

This small dispatch change is necessary: simply throwing a cleanup Error from the enlarged finally is insufficient. Before admission, the existing outer catch checks abort first and can replace a cleanup failure with the cancellation reason; a busy-family cleanup Error could also be retried. A raw generic wrapper would stop retrying but lose existing lone-error identity. The private carrier solves both issues without mutating frozen errors, attaching hidden fields to primary errors or inventing public error codes.

### Cancellation and admission precedence

| Timing | Policy |
| --- | --- |
| Cancelled in local queue/before acquisition | Existing cancellation reason/order; no file ownership invented, no predecessor bypass. |
| Abort/deadline occurs while recovery or PID publication is in progress | Do not add cancellation checks or force-cancel filesystem operations. Existing admission check still runs after successful publication/sync; if reached, it refuses callback and owned cleanup follows. |
| Pre-admission primary error with successful cleanup | Preserve today's outer `check()` behavior: an already-aborted signal may replace that pre-admission error with its cancellation reason; ordinary busy contention remains bounded by the original deadline. No broader error-precedence redesign. |
| Cleanup failed, whether before or after admission | Terminal provenance wins over the **subsequent** outer abort check. Do not mask any cleanup failure with a late abort or re-enter acquisition. If the actual primary was a cancellation reason, it remains the aggregate cause. An abort not yet raised by original code is not fabricated as another error. |
| Callback already admitted | Existing callback/transaction is not interrupted by acquisition abort/deadline. Exact callback rejection survives when cleanup succeeds. Combined failure preserves it as aggregate cause. Callback runs at most once. |

Cleanup is not cancelled by the acquisition signal or cut off at the acquisition deadline. Native filesystem operations can exceed nominal timing under stalls, as already documented; this is not an increased acquisition budget. Local queue release/telemetry finally remains active even if filesystem cleanup fails. A retained main pathname continues to fail closed under existing filesystem rules; releasing the local queue is not permission to bypass it.

### Public error compatibility and required approval

Existing pure busy/unknown-owner errors retain their class, `source.busy`/`source.owner-unresolved`, status 503 and identity when cleanup succeeds. Conflict, denied authority, journal-recovery, generic error and callback contracts remain unchanged in those ordinary cases. Single native cleanup errors retain identity/code. No public helper, new error class/code or declaration signature is proposed.

For **combined failures only**, the proposed standard aggregate has no copied `code`, `status`, `committed` or `recoveryRequired` from P. Promoting a busy/recovery code would misleadingly describe a mixed cleanup outcome. The current inspected server serializer would therefore use generic **HTTP 500**, while logging the aggregate and returning its explicit cleanup-failure message. This is an explicit combined-case representation decision requiring approval, not an assertion of byte-identical old error behavior. Existing finally code previously masked one failure with another; that masking is deliberately not preserved.

Do not conflate an ownership cleanup aggregate with journal corruption. `role-bundle.ts` wraps commit/rollback AggregateErrors only around `commitTransaction`; cleanup arbitration occurs outside that callback/try. No broad AggregateError-to-`source.recovery-required` mapping is added. An existing primary recovery error remains nested unchanged if cleanup also fails; existing journals remain under their own authority.

Alternatives rejected for this narrow proposal: last-finally-error-wins (loses primary/earlier cleanup failures); attach cleanup fields to P (fails for frozen objects/primitives, changes arbitrary objects); log-only secondary errors (caller cannot reliably inspect them); always wrap lone errors (needless public identity change); infer retryability solely from public error class after cleanup (can retry a partially cleaned acquisition). If current consumers require another combined-case envelope/status, return for architecture review before implementation.

## 5. Regression and fault-injection acceptance matrix

**Design only; no listed test is run or written now.** E means related existing source coverage was inspected, not that corrected behavior has been verified. N means new focused coverage is required; parameterization listed here is targeted, not a full Cartesian fault matrix.

Existing coverage: `unresolved-owner.test.ts` has retained final 21-case evidence (expanded package run captured 19 before two later additions); graph tests cover queue/cancellation/no-replay/order/real-process handoff; role tests cover source/journal/identity recovery, including a real process crash with a valid PID; Windows tests cover atomic replacement and transactional failures. Their historical package results do not verify this proposal. The existing close fault closes the native handle **before** throwing, so it does not establish true still-open close-failure behavior. The accepted disposable guard-unlink probe demonstrates the old leak and must remain frozen as historical evidence, not be rewritten into a corrected pass.

| ID | Scenario / controlled fault | Required result and owned state before fixture cleanup | Coverage |
| --- | --- | --- | --- |
| F01 | Initial wx, publication, callback and release succeed | Exact callback value, one callback, main close/unlink once, no owned handle or file left. | E graph/role; N phase counts. |
| F02 | Confirmed dead PID, successful guarded replacement | Guard reread precedes old unlink; replacement wx before guard release; guard closes/unlinks before PID write; callback once; all owned resources released. | E role crash recovery; N explicit lifecycle assertions. |
| F03 | Guard wx EEXIST/other open failure | No guard ownership or guard close/unlink. Preserve other guard/main file; original busy/native error behavior with no cleanup failure. | N. |
| F04 | Dead-owner reread becomes empty/invalid or a different live PID | No old-main removal/replacement ownership; unknown/live bytes retained; owned guard cleanup still occurs. Original unresolved/busy classification. | E unresolved-owner cases; N owned-operation counts. |
| F05 | Confirmed-dead old unlink or replacement wx rejects | Existing ENOENT/EEXIST-to-busy mapping and native other errors unchanged. No cleanup of a main handle never returned; preserve another winner's file. Guard cleanup errors, if any, cannot be lost. | N targeted race/failure cases. |
| F06 | Guard close rejects after replacement (before native close; separately after native close) | No PID write/sync/callback. Guard unlink skipped. Main close/unlink attempted independently and succeeds in this case. Exact lone guard-close error; guard retained. Captured guard fd distinguishes variants; production must not infer success from fd. | N both variants. |
| F07 | Guard unlink rejects after replacement (before deletion; separately after delegated deletion) | Main close/unlink completes, callback 0, exact lone guard-unlink error. Guard retained/absent according to injected delegation; never reconstruct or retry it. | N; accepted probe is old-behavior evidence only. |
| F08 | PID write rejects | Callback 0; owned main cleanup succeeds, exact write error; any guard already released. Run initial/replacement routes to prove both handles covered. | E initial single-fault; N replacement route/counts. |
| F09 | PID sync rejects after PID write | Callback 0; main cleanup succeeds, exact sync error. PID bytes existed before cleanup; no metadata-format change. Initial/replacement routes. | E initial; N replacement route/counts. |
| F10 | Main close rejects before native close; separately after native close | Never unlink after a rejected close; no automatic close retry. Callback outcome cannot be reported as success; exact lone close error if no P. Preserve PID-bearing file; capture true/closed fd variants before test-only cleanup. | E after-close initial variant; N before-close/replacement variants. |
| F11 | Main unlink rejects before deletion; separately after delegated deletion | Main was confirmed closed; exact unlink error, callback not replayed; file retained/absent according to actual delegation. No reconstruction or second unlink. Initial/replacement routes. | E before-delete initial variant; N after-delete/replacement. |
| F12 | Callback rejects, cleanup succeeds | One callback; exact original Error/busy/owner-unresolved/primitive value, no replay; successful release. Do not let signal change after admission replace callback error. | E busy/owner-unresolved/abort; N frozen/general-value identity assertions. |
| F13 | Pre-aborted signal / cancelled local waiter | Original reason; no callback or foreign-file cleanup; cancelled queue cannot pass its predecessor. | E unchanged graph/owner tests. |
| F14 | Abort after replacement wx but before callback admission, guard cleanup succeeds | Preserve existing order: guard release then PID write/sync then original admission refusal; callback 0 and main cleanup succeeds. Do not introduce a mid-recovery shortcut/check. | N replacement-window case; E initial cancellation. |
| F15 | Publication consumes remaining deadline | No callback after deadline; main cleanup succeeds; same busy contract and shared original deadline. | E existing monotonic-clock case; N replacement route if not covered by F14. |
| F16 | Publication P plus main cleanup failure | Targeted write+close and sync+unlink pairs: aggregate cause is exact P; errors [P,C]; callback 0; skipped unlink after close failure, no retry. State reflects exact injected write/close timing. | N. |
| F17 | Callback P plus main close/unlink failure | Callback once, aggregate cause exact P/errors [P,C]; side effects not replayed or represented as rolled back. | N. |
| F18 | Reread unresolved/busy P plus guard close failure, no owned main | Aggregate [P,C], cause P; preserve unknown/winner main bytes; no false main unlink; terminal even before admission. | N, extending E reread cases. |
| F19 | Two cleanup failures without P | Selected pairs: guard unlink+main close, guard close+main close, guard unlink+main unlink. Both obligations attempted as eligible; skipped unlinks explicit. Aggregate cause first C, errors C in order, callback 0. | N. |
| F20 | Cleanup throws busy-family error while signal is aborted | No internal retry or cancellation masking. Exact lone C survives via terminal provenance; or correct aggregate if a real P was already thrown. Assert one invocation/attempt path and no new callback. | N; tests private dispatch without adding public type. |
| F21 | Frozen/primitive/nested aggregate primary and repeated error reference | Explicit presence flags handle thrown undefined/null; no mutation or flattening; cause/errors preserve identities and duplicate phase occurrences. A nested ownership/journal error does not get reclassified globally. | N targeted arbitration cases. |
| F22 | Existing graph/role/journal/Windows compatibility regressions | Existing queue, ordering, known-live/dead/unknown behavior, canonical casing/path refusal, journal/rollback/fresh-process reader, graph handoff and no interruption of admitted work retain their assertions. | E; future rerun required after separately authorized implementation. |

### Future harness and acceptance rules

Use only uniquely created disposable storage/Component roots, canonical anchors and keys proven independent of real Platform storage. Exercise the **actual corrected implementation** through supported lock/role interfaces. Intercept only selected native fs operations/handle methods in tests; no production delay, fixture selector, global permission weakening or new production fault hook. Match exact private paths and distinguish main from guard handles, initial from replacement handles, and before- from after-delegation faults.

Record callback counts, actual handle/open/closed state, every eligible/attempted/skipped close/unlink and call order, error reference equality/cause/errors order, and raw residual bytes before test-only cleanup. Assert no unlink of unowned main/guard, no admission after guard failure, no retry caused by cleanup error and no admitted callback replay. A signal arriving during cleanup cannot replace the cleanup-failed outcome.

Tests that deliberately leave a true open handle must retain/capture it and then close **only the known disposable owned handle** after assertions; any later artifact cleanup is restricted to the verified temporary root. Do not rely on garbage collection or delete before recording failure state. No test may point to Customer Summary Card or use a real source read as a health probe. No historical evidence output is a test target.

Keep existing production acquisition budgets and all existing assertions/timeouts unchanged. New negative cases may use controlled clocks/barriers or existing explicit caller-budget patterns in isolated tests; no larger production budget, arbitrary delay or retry is justified. Tests intentionally exhausting a five-second budget must use a separately reviewed outer harness bound, not alter the five-second protocol. Run serially with retry disabled under later explicit verification authority. Do not overlap independent fixture runs.

A later implementation gate should first approve the exact focused fault cases, unchanged Foundation regressions and necessary build/typecheck/export checks. Because storage is shared across providers, migration/deployment and journal regressions cannot be assumed unaffected merely because the correction is small. Public combined-error behavior needs direct caller/reader checks; any server integration must demonstrate fully disposable Platform storage before execution. If isolation cannot be shown, stop for review. No UI run, current remaining 49, full suite, real recovery, or acceptance is authorized by this verification design.

## 6. Compatibility, boundaries and stop conditions

| Contract | Preservation requirement |
| --- | --- |
| Recovery authority | ESRCH + valid PID + guard + current reread/compare remains mandatory; no age-based/unknown-owner recovery. |
| Metadata | Writer remains exactly decimal `String(process.pid)` and sync; no nonce, lease, atomic publication redesign or migration. |
| Admission | Same five-second graph/role budgets, original deadline/queue accounting, polling/handoff/cancellation, no callback beyond deadline and no replay after entered. Only cleanup-failed outcomes bypass subsequent retry/abort dispatch. |
| Boundaries | Same canonical identity, global graph versus role locks, ordering context and journal authority. No second queue or coordinator. |
| Windows | Preserve close-before-unlink, native failures and race mappings; no broad filesystem retries, forced handle closure, permission changes, temporary rename/quarantine or platform-specific fallback. |
| Readers/API | Existing read snapshots, source validation, journal recovery and ordinary typed errors unchanged. New aggregate representation is confined to multiple failures and must not be labeled source journal recovery automatically. |
| Telemetry | Existing observe callback remains nonthrowing/non-authoritative. No live event-contract activation, raw-owner instrumentation or additional fs inspections are included in the correction. |

Residual risks: abrupt termination still bypasses JS cleanup; close rejection leaves ownership/handle state uncertain; cleanup may fail and retain main/guard files; independent actors can ignore protocol; PID reuse/integer-prefix ambiguity and pre-publication visibility remain. The proposal improves cleanup **coverage and error reporting**, not guaranteed release under every OS failure or a safe reclaim rule. Guard retention after uncertain close is intentional; do not hide it behind successful main cleanup.

Stop implementation and return for review if it requires another production module/public error export, ownership-format or recovery-authority change, added retry/budget/timeout, altered journal behavior, unlink of an unowned or unconfirmed-close pathname, suppression of cleanup errors, loss of primary identity beyond the approved aggregate case, changed admission/callback order, or an escaped private carrier. Stop verification if disposable isolation, handle accounting, source hashes or evidence preservation cannot be established, or if any path targets real storage. No speculative real-lock cleanup may be bundled into this work.

## 7. Decisions requiring approval

1. **Ownership/control-flow decision:** approve outer main scope before wx, independent owned-guard scope, publication barrier on guard failure, eligible once-only close/unlink, and no unlink after a rejected close.
2. **Error-contract decision:** approve exact lone-error propagation, standard AggregateError for multiple failures with cause/errors identity/order and explicit cleanup-phase message, and no promoted busy/recovery status/code on composites. Acknowledge the proposed generic HTTP 500 for combined failures under current serialization.
3. **Dispatch decision:** approve a module-private cleanup-failed carrier/result consumed before existing retry/cancellation logic. Ordinary no-cleanup-failure dispatch remains unchanged; cleanup failure cannot be masked by abort or retried internally.
4. **Implementation/verification authority:** separately authorize a narrow `storage.ts` correction and focused disposable tests/build outputs with the reviewed matrix, stopping at implementation verification/review. This document grants none of that execution authority.

These can be approved together as the bounded cleanup architecture, but implementation still requires explicit authorization. If another aggregate representation or error precedence is selected, update the decision table before coding; do not resolve public error semantics incidentally during implementation.

Real Customer Summary Card maintenance/service return remains a separate exact-target operational gate. Neither this proposal nor an eventual correction identifies its creator, explains its historical event, authorizes reclaiming its lock, resumes D6 verification or accepts D6/WP5-F/WP5-I.

## 8. Documentation and preservation inventory

This phase writes only this architecture Markdown and new JSON documentation/evidence records under `docs/architecture/evidence/foundation-cleanup-architecture-20261020/`, plus `foundation-cleanup-architecture-20261020-files.json`. No executable helper, production code, test, configuration or compiled module is added/edited. Ephemeral read-only filesystem/hash inspection is used to prepare preservation records; no previous probe helper entry point or product module is invoked.

The initial record covers **2,564 existing UI source/evidence/Component/build files**, **158 Data Services files** and **38 previously captured default Application files**. All expected prior source/evidence hashes match. Existing disposable probe artifacts, fault-source copies and native outputs are historical evidence and are preserved as such. Real Customer key is `d179aa405e5fabc10c0dcd063888480c115eb75f2ef03df9f74ce3ec26e0043e`; its zero-byte file remains inode 17169973580092885/device 1344742221, with matching roles, empty transaction directory and absent pending journal/guard. Direct reads do not acquire a lock; access metadata is recorded rather than restored. Scope is the enumerated files, not a full-volume or active database snapshot.

`before.json`, `reviewed-inputs.json` and final `preservation.json` record hashes, Git state, real Component/lock/journal state and unchecked umbrella counts. The changed-file inventory gives exact new paths, sizes and SHA-256; its self-entry is explicitly unhashed. Both repository HEADs must remain unchanged, and pre-existing tooling edits must remain preserved. No commit, push, reset, synchronization, Git setting or index/history change is performed.

Final preservation comparison checked all 2,564 UI files, 158 Data Services files and 38 Application files with **zero differences**. Direct real-state comparison passed. Both repository HEADs remained identical to the initial record; umbrella counts are **40 unchecked, zero checked**. These results cover the recorded inventory and direct filesystem state, without claiming attribution for the historical lock or observation of unrecorded activity.

**STOP AT FOUNDATION CLEANUP ARCHITECTURE REVIEW GATE. No implementation or further execution follows. D6, WP5-F and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.**
