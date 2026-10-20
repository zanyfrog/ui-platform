# Builder V1 WP5-F — D6 admission and graph-lock proposal

2026-10-18. **PROPOSED — GATE 1: D6 ARCHITECTURE REVIEW. NO IMPLEMENTATION AUTHORIZED.** Scope: the smallest safe remediation for cooperating Builder/runtime graph admission, preserving accepted WP2 identity, coherent readers, validation, journaling and final admission.

## Source-backed findings

| Finding | Evidence / confidence |
| --- | --- |
| Cross-process contention is intentionally rejected at the Foundation primitive | `packages/artifacts/src/storage.ts`: process-local promise queue, exclusive `open(..., 'wx')`, PID publication/probe, live-owner rejection. Confirmed implementation behavior |
| Read and write graph paths share one exclusive namespace | `packages/artifacts/src/role-bundle.ts`: canonical owner root plus `visual-runtime-graph-v1`; `src/server/composition-lock.ts`: every Application mutation uses Platform `components` root. Runtime Vite plugins and `visual-preview.ts` use the shared root when configured. Confirmed, configuration-dependent root equality must be verified |
| Runtime readers have a bounded retry wrapper; Builder mutation acquisition does not | `packages/visual-artifacts/src/runtime-read-admission.ts`: at most 20 attempts, 100 ms between matching busy failures; `composition-lock.ts` calls Foundation directly. Confirmed asymmetry, not a measured latency distribution |
| Read-only workspace operations hold exclusive admission | `src/server/builder-workspace.ts`: discovery, authorization and Problems validation run inside `withApplicationMutation`, including revision/membership checks and response emission. Confirmed extended section; incremental duration unmeasured |
| Candidate validation can be expensive while graph admission is held | `src/server/index.ts` normal Visual save calls `prepareVisualCandidate`, syntax validation, dependency checks and final admission inside mutation; `visual-candidate.ts` uses esbuild and cross-artifact validation. Runtime plugins compile/validate inside their graph capture callback. Confirmed call placement, duration unknown |
| Dataset invalid-name rejection is downstream of graph acquisition | `src/server/dataset-development.ts`: creation enters mutation before `DATASET_NAME_REQUIRED` 422; general failure mapping can return 409. Confirmed explanation for a lock error masking validation |
| Historical WP5-B failure is not introduced by E | Existing `evidence/builder-v1-wp5-e/d6-accepted-baseline-run.json`, setup and normalized four-file lock-source comparison; accepted E verification. Demonstrated reproduction, no newly executed reproduction |
| WP4 current run contains the lock error | Existing `wp4-rerun.txt` records 409 with the lock message instead of 422. Accepted-source WP4 run stopped earlier on missing Dataset contract; independent baseline cause remains unresolved |

The demonstrated mechanism is live-owner conflict on a shared exclusive namespace plus inconsistent caller admission handling. Existing evidence does **not** identify the exact owner PID, hold duration or lock nesting at each failed assertion. Runtime compilation, Builder polling/Problems and unrelated Application traffic are plausible contenders. E may increase lock duration; unchanged lock source does not exclude that contribution. No Windows filesystem defect, deadlock or stale-source conflict is established as the root cause of these two failures.

## Before concurrency model

Builder Application queue → global graph lock → dependency capture/validation → target role lock → original checksum, candidate validation, source recheck, original authority admission, source recheck → journaled write/readback → release role → release graph.

Runtime graph load → bounded retry of same graph lock → recovery-aware bundle reads → capture, validation and compilation → release. Workspace GET/Problems also behaves as a graph-exclusive operation. Separate processes do not share the in-memory queue; another live lock holder can immediately reject Builder. Shared Platform Components justify cross-Application coordination; current global contention extends even to unrelated Applications.

Role reads are not ordinary lock-free reads: they may recover a retained journal. Removing exclusive locking from them is unsafe. Sequential role replacement is not filesystem-wide atomicity; uncoordinated external tools remain outside the protocol.

## Recommended architecture

Retain Foundation as the only lock and recovery authority, and retain the existing global graph identity initially. Introduce a scoped acquisition contract there, or a thin graph admission facade over it, for **acquisition contention only**. All cooperating graph callers use it; no new storage, daemon, broker or independent lock registry.

An acquisition attempt either owns the existing lock or returns a structured busy outcome before invoking work. Bounded cancellable waiting retries acquisition with a monotonic deadline and bounded backoff. It must not catch a matching error thrown from inside work and replay the entire callback. The current runtime message-based wrapper cannot serve as the final contract because it encloses the callback too. Preserve defaults for unrelated Foundation users until audited. A deadline is an availability limit, not evidence of a correctness fix; select it from observed hold times and a documented responsiveness budget, not by increasing the existing timeout until tests pass.

On success, recapture source under admission and keep expected revisions and original identity. On timeout, return a typed source-busy result distinct from stale/conflict/validation/denied/recovery-required. Do not return success or substitute an older graph. Validation should yield its native 422 once source admission succeeds; a genuinely exhausted admission can still honestly return busy. Do not simply remap every lock failure to 422.

Then reduce only proven expensive pure work under the lock: capture immutable bytes plus closure membership and revision vector under graph admission; release; validate/compile only those bytes; reacquire graph admission for freshness/membership and authority checks before publishing a successful current capture or entering the existing write transaction. No hidden live reads during detached validation. If a dependency changes, explicitly reject/restart a read-only capture within a bounded budget; never automatically replay a mutating callback. For mutation, reject stale preparation and preserve the dirty draft. Keep validation that cannot be detached safely in its current section until its input contract is demonstrated.

Final write admission stays under graph then role lock. Preserve target original checksum, candidate validation result tied to complete dependency vector, fresh captured-session authority, source recheck after asynchronous admission, journal/rollback/recovery and readback. Moving validation must not remove any of these guarantees. No-op writes retain checks. Root recovery remains under the same ordered authority.

This recommendation is staged: consistent acquisition semantics first, then measured lock-duration reduction. Neither is claimed sufficient for reliable simultaneous use until D6 verification passes.

## Proposed lock-order contract

1. Retain the Application-local scheduler as an outer serialization aid; it is not cross-process authority. Acquire it before graph admission when needed.
2. Acquire the single canonical Platform graph lock before any role/storage lock that contributes to its graph. Runtime/Builder must resolve the same physical root and exact identity; reject root alias mismatch. Verify Windows path casing/canonicalization before sharing.
3. Capture dependencies before taking the target role lock. Release dependency role locks before the target transaction. Do not hold two role locks simultaneously; if an existing path requires that, stop and review a canonical total order rather than inventing it.
4. Never reacquire graph admission while holding a role lock, or reacquire the same graph/role lock recursively. Add trusted async operation context to detect and fail fast on nested acquisition. A nested helper may consume an explicit already-held scope only if ownership/lifetime is verifiable; no request-supplied bypass token.
5. Do not call a separately scheduled Application mutation from inside a graph callback. Extract an internal already-admitted helper instead. No browser/network waits or response rendering inside the section; required final authority checks remain, measured and bounded.
6. Release in reverse order on success, error, cancellation and disconnect. Acquisition cancellation must never release another operation's lock. Distinguish acquired ownership from waiting.

Nested same-process queue acquisition can self-wait indefinitely today. Source inspection establishes the risk, not a demonstrated reachable deadlock in either failure. Trace audited paths before changing them.

## Ownership, Windows and recovery

Existing lock ownership is a PID, not a transaction nonce or lease. Creation can precede PID publication; the implementation briefly waits for publication and blocks incomplete locks. Live locks are never stolen. `ESRCH` recovery uses a separate recovery lock and owner reread; ambiguous probes block. PID reuse can cause conservative false busy. Do not expand recovery based on elapsed time.

Audit acquisition/release races: EEXIST followed by ENOENT may mean the holder released; classify only demonstrated release as acquisition retry, while malformed/incomplete/recovery-required states fail closed. Test handle close/unlink failures and recovery-lock contention without blind deletion. Existing Windows file operations retry EPERM/EACCES/EBUSY for rename/delete; those retries differ from graph admission and must not be conflated. No diagnosis assumes Unix unlink semantics on Windows.

No data or artifact migration is proposed. All processes sharing this namespace must use compatible lock semantics; restart participating development hosts for rollout after approval, with no mixed root/identity configuration. Do not delete active locks or journals during rollout. Any need for lock file ownership-format changes requires a separately reviewed compatibility/recovery plan.

## Alternatives and tradeoffs

| Option | Assessment |
| --- | --- |
| Raise runtime timeout or add broad request retries | Small code change but asymmetric, can mask long holds or replay work; rejected as standalone remedy |
| Same-authority bounded acquisition + shorter capture sections | Recommended; preserves serialization and transactions, improves normal contention handling, requires pure-input/refetch audit and measured saturation tests |
| Shared-reader/exclusive-writer protocol | Potential throughput gain, but role recovery may write and crash-safe reader ownership/writer fairness require a new protocol; too broad for first remediation |
| Per-Application graph locks | Reduces unrelated contention but shared Components span Applications; needs multi-owner ordering and global dependency invalidation; defer |
| Lock-free optimistic filesystem reads | Can observe partial commits/rollback/recovery; checks alone do not replace accepted coherent-reader contract; reject |
| Central lock service | Additional authority/operational dependency; excluded |

## Verification strategy after implementation authorization

Use disposable fixtures and trusted gates/IPC barriers, not scheduling sleeps as proof. Observe attempted/acquired/released events, operation/resource identity and elapsed section time without source payloads. Tests must fail if expected serialization is absent; no retries that hide assertion failures.

| Deterministic scenario | Required result |
| --- | --- |
| Process A holds graph; B read/save waits; A releases | B enters only afterward and captures current complete bytes; no spurious live-owner error within budget |
| A holds beyond B deadline; B cancelled/disconnected | B never enters; explicit busy/cancel, no writes; A retains ownership |
| Callback throws busy-shaped error after entry | Exactly one callback invocation, no mutation replay |
| Same-process and cross-process competing readers/writers, multiple Applications sharing Component | Serialization, no starvation under documented bounded load, complete closure and final admission |
| Source or membership changes during detached validation | No current success/write using old dependencies; explicit stale and draft preservation |
| Revocation/owner switch during wait or final async checks | Original authority rechecked; denied write, no retargeting |
| Nested graph, role→graph and nested Application scheduler | Deterministic fast rejection, no deadlock or bypass |
| Failed role commit/rollback, dead process, incomplete PID, recovery contention | Accepted WP2 recovery/readback guarantees, fail closed on uncertainty |
| Windows release/acquisition and sharing failures | No removal of live/replacement locks; bounded failures and retained recovery evidence |

Re-run unchanged WP5-B Visual save and WP4 invalid Dataset-name tests; the latter must reach native validation and return expected 422. Audit both response and storage, not status alone. Re-run affected WP2/storage/runtime and diagnostics contracts, then required broader regressions/builds/typechecks/production exclusion under the eventual implementation authorization. Preserve original failed evidence; new evidence gets a separate location.

Actual browser plan: keep Builder and ordinary managed runtime open in separate sessions/processes throughout; author/save Visual Pages and shared Components, run Problems refresh, keep a dirty unrelated tab, and reload/navigate the runtime during captures and saves. Include two consuming Applications, repeated overlapping activity with an agreed workload, source changes during capture, revocation and recovery. Verify coherent rendering, admitted saves, accurate busy states, retained drafts/history and authorized ordinary runtime persistence. Record process/root configuration and timings; never close Builder to obtain a passing runtime load. No test is executed in this planning increment.

## Gate 1 acceptance and outstanding decisions

Review the proposed same-lock acquisition contract, nonreentrancy rule and capture/validate/recheck split separately from preview. Set measurable workload and responsiveness limits from observations before claiming reliability. Outstanding implementation findings: actual failure holder attribution, safe pure-work boundaries, root alignment across hosts, Windows races and starvation bounds. D6 is resolved only with both affected regressions and simultaneous-use evidence; required before WP5-I acceptance. **STOP AT GATE 1; architecture approval is not implementation authorization.**
