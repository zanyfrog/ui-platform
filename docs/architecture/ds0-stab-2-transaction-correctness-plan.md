# DS0 STAB-2 transaction-correctness implementation plan

Date: September 27, 2026. **DESIGN ONLY — STOPPED AT STAB-2 DESIGN REVIEW GATE.**

## 1. Scope and baseline

This plan refines B3 using section 6 of the approved [stabilization repair plan](ds0-baseline-stabilization-repair-plan.md), the [preflight audit](ds0-wp2-preflight-audit.md) and current Data Services source. STAB-1 is accepted and B2 closed for its tested scope; see the [acceptance record](ds0-stab-1-acceptance-record.md). B1 remains closed. B3 remains open pending authorized implementation, testing and acceptance.

D = `C:\Projects\Modular\UI Platform Data Services`, clean at **`577683840535e668c2000f24562702e7b51c6a0b`**, parent `313b7e0c64e8e93f75632bb9dc015614d7709668`. The existing STAB-1 commit exactly matches the approved 13-file scope and tested hashes. P = `C:\Projects\Modular\ui-platform`, HEAD `e6b6a86936b8aa24645f24ae53db3cf61a3c0345`, no tracked runtime changes. D lockfile SHA-256 remains `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F`.

[Baseline review evidence](evidence/ds0-stab-2/baseline-review.json) pins six inspected transaction source files and hashes all preserved STAB-1 reports/evidence. No implementation source, package version, lockfile or application data changed for this plan. No tests were added or run: the proposed tests below are not execution evidence. Accepted 88/88 results establish STAB-1, not a B3 repair.

STAB-2 covers DOE ownership, failure propagation and truthful transaction results. It excludes STAB-3 restore/scoped-write containment, full record-scoped authorization, DS0-WP2, schema activation/reload, checksum changes, trigger publication integration, migration, package release and deployment. No durable coordinator, automatic recovery or multi-file storage redesign is proposed.

## 2. Current implementation and architecture

| Current D source | Finding |
| --- | --- |
| DOE `src/operation-manager.ts`, execute | tx/ownTransaction are scoped inside try. Catch does not roll back. Before/after trigger and write failures can abandon staged transaction resources. |
| Same method, commit then afterCommit | Any caught failure returns success=false, committed=false and all records failed, including an afterCommit failure after persistence. The audit reproduced this. |
| Same method, run child callback | Child failure is returned as a result with no shared failed state. A handler can ignore it and permit root commit. Early child authorization/validation/depth failures matter too. |
| Public execute(request, parent?, transaction?) | Arbitrary caller-owned transactions can join, but OrmTransaction supplies no ownership proof, failed-state marker or commit veto. DOE cannot prevent an external owner committing poisoned work. |
| ORM `src/json-file-orm.ts`, JsonTransaction | Stages arrays in a Map, persists sequentially, marks closed only after all persists return. Mid-commit failure can leave partially changed files and an open transaction. Rollback clears the Map; it does not restore files. |
| Same file, persist/records/stage | Per-file temporary write/rename, instance-local cache, no transaction-wide atomic replacement or writer fencing. stage checks concrete JsonTransaction identity via instanceof, but not closed state or originating ORM instance. |
| DOE `src/types.ts` | Only success/committed booleans and requested/succeeded/failed counts. Context has no unknown state. atomic is recorded but does not choose an execution mode. |
| DOE `src/service.ts` | POST /operations directly serializes results with HTTP 200. Initialization registers policy/trigger datasets only; no business-dataset registration or handler-loader route. |
| DOE existing test / README | One happy-path test queries the same ORM instance, so cache can hide persistence defects. Failure/uncertainty semantics are undocumented. |

Here DOE files are under `packages/dataset-operations`; ORM files under `packages/orm`. The existing Dataset Operation Manager architecture sections 11–12 require participating nested operations to complete before commit, assign transaction lifecycle to DOE, and prohibit claiming atomicity storage cannot provide. ORM Architecture assigns transaction capability to ORM and business scope to DOE. The broader all-or-none goal is not an implemented multi-file durability guarantee; this plan records the gap without rewriting architecture.

## 3. Ownership and phase model

Use a private per-root execution session to retain the original transaction handle, ownership, phase, shared failure, outstanding children and result snapshots. Keep it outside try so cleanup can use it. Do not replace the concrete transaction with a proxy passed to ORM writes: that would break the current instanceof requirement. Keep bookkeeping alongside the handle.

Distinguish internal preflight, staging, commit-attempted, committed/post-commit, rolling-back, closed and unknown phases. Set commit-attempted immediately before awaiting commit; confirmed committed only after it resolves. Keep the new phase enum private initially rather than unnecessarily widening exported OperationContext state and breaking exhaustive callers.

### Owned pre-commit failure

1. Resolve definition, authorize and normalize/validate before root begin. Failure here means no begin/commit/rollback.
2. Once begun, root is the sole owner. Before/after triggers and child writes share its handle without commit/rollback authority.
3. Mark shared failure before returning a child error or unwinding. Reject further writes. Settle already-started children before cleanup; never race rollback with their writes.
4. Roll back the owned transaction once, only if commit was never attempted. Preserve the original failure if rollback also throws; add TRANSACTION_ROLLBACK_FAILED and do not claim clean resource disposal.
5. Retire failed handles. With the tested JSON adapter, no commit attempt means no staging was persisted through that transaction, even if cleanup fails. This relies on the adapter honoring staged-write semantics; arbitrary external trigger effects are outside the transaction.

### Unknown commit outcome

Any rejection after invoking commit yields **unknown**, whether it occurred before the first file changed, after one file changed, or after all files changed but before acknowledgement. Do not infer certainty from an exception message, stage count or cached query. Never call rollback as though it restored files, retry commit, retry the operation or run afterCommit on this path.

Retire the session and report TRANSACTION_COMMIT_OUTCOME_UNKNOWN, preserving operation/correlation IDs and sanitized causal diagnostics. No compensation, replay or recovery protocol is added. Tests can know their fault location, but the public response remains conservative unless an adapter later gains a separately approved authoritative outcome contract.

### Confirmed commit followed by failure

Snapshot this operation's ORM result records/count before post-commit callbacks can mutate them. Once commit resolves, never roll back for a later error. An afterCommit failure returns **success=false, committed=true, commitOutcome=committed**, the retained successful write count/records and POST_COMMIT_FAILED. It must not invite replay of the write.

Records describe the operation's ORM write result, not a guaranteed final row image after all descendant updates. Root counts cover its request, not an aggregate of nested datasets. This avoids inventing a cross-operation accounting contract.

## 4. Nested failures, ignored promises and lifecycle

Use a private internal execute path with an execution-session capability captured by trigger callbacks. Register each child synchronously before its first await. Preserve actor/source/correlation lineage; a caller-provided context object cannot manufacture ownership or clear the failed marker.

- Every child failure poisons the shared pre-commit session, including lookup, authorization, validation and recursion failures before its ORM call. Ignoring a returned failure or catching an exception cannot clear it.
- After each handler returns, await children started by that handler, including ignored promises, and their descendants before advancing the parent or committing. Each child drains its own children. A child must not await a global set containing itself/ancestors, which would deadlock.
- On failure, drain registered work before root rollback. Do not start further triggers or ORM writes after the marker. Preserve causal child IDs/codes without putting record values into diagnostics.
- Bound callbacks to their handler and registered work. A retained callback invoked after closure returns OPERATION_CONTEXT_CLOSED before mutation; it cannot reopen the old transaction or silently become a fresh root. Such a rejected late call cannot retroactively alter an already-returned result.
- **Recommend sequential child operations per parent callback.** Reject overlapping siblings (including Promise.all) before the second stages a write, poison with NESTED_CONCURRENCY_UNSUPPORTED, drain the first and roll back. Recursive awaited descendants remain supported. Current read-modify-stage behavior can lose same-dataset parallel updates; a reentrant transaction scheduler is outside this repair. This restriction needs approval.
- Joined children do not independently commit, roll back or run afterCommit. Recommend preserving current root-only afterCommit dispatch; deferred per-child delivery would be a separate lifecycle expansion.

Children started during root afterCommit use new owned transactions with retained lineage, never the committed parent handle. Track/await them too. Ignoring a failed post-commit child must produce POST_COMMIT_FAILED for the parent while retaining the parent's confirmed commit. A successfully committed child cannot be undone by a later handler failure. Related diagnostics must distinguish a child's unknown or committed-with-error outcome from the parent's confirmed outcome.

Trusted handlers can bypass DOE through captured ORM objects or external I/O; this plan cannot undo those effects. Never-settling handlers/children can stall completion; cancellation/timeouts and distributed side-effect management are not implemented here.

## 5. External transaction boundary — approval required

**Recommend rejecting caller-supplied transactions and caller-supplied parent contexts at the public execute boundary.** Retain optional parameters only as deprecated compatibility inputs returning EXTERNAL_TRANSACTION_UNSUPPORTED / EXTERNAL_CONTEXT_UNSUPPORTED. Internal nesting uses the private capability path. Reject before definition/auth/trigger/write calls and never commit or roll back the supplied object.

The current OrmTransaction has only id/commit/rollback; DOE cannot veto an outside commit, prove ownership or enforce failed-state lifetime. Searches found no legitimate external public join caller in the repositories; only DOE's own trigger callback supplies these arguments. External consumers remain unknown, so this is a behavioral compatibility break requiring approval.

The rejection's not-committed outcome refers only to this invocation, not to the supplied transaction's pre-existing state. DOE makes no failed-state guarantee for handles it refused to touch.

Alternative: an explicit owner-managed session API with shared failure/commit-veto/lifetime enforcement. That extends ORM/public contracts and needs additional scope. A WeakMap for raw handles alone cannot prevent an external caller invoking commit directly. Fail-closed rejection is the bounded recommendation, not an assumption that external ownership already works.

## 6. Result contract and caller compatibility

Retain all existing fields. Recommend additive **optional type fields**, always populated by the repaired manager:

```ts
commitOutcome?: "not-committed" | "joined" | "committed" | "unknown";
// additional member of counts:
unknown?: number;
```

Optional typing preserves old result-producing mocks/adapters. Updated consumers must treat an absent outcome as **legacy/unspecified**, never infer not-committed from committed=false. Required fields are an alternative requiring a coordinated source migration. unknown is zero except when commit outcome is unknown.

committed means confirmed completion of this operation's owned commit. success means the invocation's applicable lifecycle completed, not power-loss durability. Keep code/message errors with optional phase/related-operation/outcome metadata. Preserve known OrmError.code and known DOE codes; stop deriving codes with String(error).split(':')[0], which often reports only Error. Sanitize unknown diagnostics so HTTP does not leak paths or record contents.

For N requested records and W successful ORM writes (normally N with current batch primitives):

| Situation | success / committed | commitOutcome | succeeded / failed / unknown | Evidence and error |
| --- | --- | --- | --- | --- |
| Preflight or begin fails | false / false | not-committed | 0 / N / 0 | No records; specific cause. |
| Owned staging fails, rollback succeeds | false / false | not-committed | 0 / N / 0 | No confirmed records; original/root-child cause. |
| Pre-commit rollback also fails | false / false | not-committed | 0 / N / 0 | Original cause plus rollback failure; no clean-cleanup claim. |
| Joined child succeeds | true / false | joined | W / 0 / 0 | Provisional records; succeeded is local staging success, not persisted success. |
| Joined child fails | false / false | joined | 0 / N / 0 | Local failure poisons root; root supplies final outcome. |
| Commit invocation throws | false / false | unknown | 0 / 0 / N | Omit records as committed evidence; COMMIT_OUTCOME_UNKNOWN code. |
| Commit/post-commit succeed | true / true | committed | W / 0 / 0 | Retained operation records. |
| afterCommit or its child fails | false / true | committed | W / 0 / 0 | Retained operation records; POST_COMMIT_FAILED. |
| External handle/context or stale callback rejected | false / false | not-committed | 0 / N / 0 | No writes by this invocation; no inference about an external handle. |

Use full error code TRANSACTION_COMMIT_OUTCOME_UNKNOWN in implementation. Joined counts intentionally preserve existing provisional success counts while qualifying them explicitly. Do not mutate a returned child result later when the root completes, or sum provisional counts as committed rows. For post-commit failure, failed=0 means no failed write in this request, not no handler errors. For unknown, failed=0 does not mean success; unknown=N accounts for uncertainty. Zero-record requests can have unknown outcome and unknown=0; the enum is authoritative. Do not guess per-row partial persistence.

Preserve POST /operations HTTP 200 result envelopes for business outcomes, including unknown/post-commit errors. Neither HTTP 200 nor !success is evidence of commit state. A new transport status policy/authentication scheme is not part of this repair.

### Inspected consumers and risks

Searches covered D first-party package TypeScript excluding dist and P src/packages/tests. DOE's observed result consumers are its HTTP serializer, trigger callbacks and happy-path test. No direct P dataset-operations import or DatasetOperationResult/commitOutcome consumer was found. P migration/deployment and schema-application state use separate contracts; do not relabel their checksums or outcomes.

The serializer already forwards the result, but tests must prove additive fields survive. Unknown external consumers may assume committed=false means no persisted writes, every error means failed=requested, or failed writes can be replayed safely. Those assumptions are unsafe. Waiting for ignored children, external join rejection, overlapping-child rejection and stale-callback refusal are also behavioral changes. Optional fields do not eliminate these risks. Any future release/cutover needs consumer inventory and separate authorization; versions/locks remain unchanged during this repair.

## 7. Proposed work boundaries and affected files

These subdivisions organize later implementation; they are not execution authorization. DOE paths below are relative to `packages/dataset-operations` in D.

| Boundary | Files | Exit evidence |
| --- | --- | --- |
| STAB-2A: contracts/characterization | src/types.ts, README.md; new tests/transaction-results.test.ts | Approved outcome/count/error policy; characterization of the audit failure with actual files; old literals compile if optional fields selected. |
| STAB-2B: ownership/phases | src/operation-manager.ts; new tests/operation-failures.test.ts | Owned pre-commit rollback, precise commit boundary, unknown/post-commit truth, preserved diagnostics. |
| STAB-2C: nested correctness | Same manager; optional private src/execution-session.ts; new tests/nested-transactions.test.ts | Shared failure before early returns, child draining, bounded callbacks, approved external/concurrency policy, one owner. |
| STAB-2D: persistence/HTTP | New tests/transaction-persistence.test.ts, tests/operation-service-contract.test.ts and test-only helper/bootstrap | Real files and real HTTP plus deterministic faults; original tests retained. |
| STAB-2E: acceptance | DOE README; P docs/architecture/ds0-stab-2-implementation-acceptance-report.md and evidence | Exact commands/counts, SHAs, hashes, limits and acceptance gate. |

src/service.ts should need no route behavior change. If HTTP testability requires a request-handler/service factory, approve only minimal dependency injection with default initialization/listener preserved. Do not add production dataset/handler registration routes for testing. src/index.ts changes only if new public types need exports beyond existing wildcard exports.

**Read/test dependencies, not production edits:** ORM json-file-orm.ts/types.ts, I-AM policy store, TriggerRegistry, schema-application, VDR and managers. Keep ORM storage algorithm and OrmTransaction interface unchanged under the recommended external-join policy. TriggerRegistry.create/update and I-AM policy mutators own direct ORM transactions independently; their cleanup gaps are recorded, not silently included in this DOE B3 repair. They are fixture setup/direct-ORM consumers, not repaired DOE result callers.

If the approved invariants cannot be enforced without an ORM/public-storage contract change, stop with the concrete conflict for review. Do not expand into a transaction engine redesign.

## 8. Real persistence and injected-failure tests

Use fresh temporary roots, explicit schema/policy/handler registration and cleanup. Persist baseline fixtures before injecting faults so setup is not the transaction under test. Snapshot file bytes; verify disk or instantiate a fresh ORM with the same registered definitions. Same-instance cached reads are insufficient.

A delegating DatasetOrm test wrapper must retain the **real concrete transaction**: instrument its commit/rollback methods at begin, or delegate/override public persist to inject precise failures. Passing a proxy transaction to writes violates instanceof. File write/rename injection belongs only in tests, never a production fault switch. Use controlled promises/barriers rather than sleeps.

| Case | Required assertions |
| --- | --- |
| Authorization, validation, missing definition, recursion | No root transaction if preflight fails; nested equivalents poison an already-open root. Disk unchanged. |
| Begin throws | not-committed; no rollback of an undefined handle; stable error. |
| before trigger / ORM write / after trigger fails | One owned rollback, zero commits/afterCommit, unchanged baseline files. |
| Rollback throws | Original error plus cleanup failure, no retry or false clean-rollback claim. |
| Ordinary insert/update/delete | Correct outcome/counts and fresh-reader persistence; existing happy path retained. |
| Successful root/child/grandchild | Original handle shared, one root commit, no child commit/rollback/afterCommit; expected datasets persisted. |
| Child failure ignored/caught; deeper child failure | Root cannot commit earlier staging; one rollback; causal child diagnostic survives handler behavior. |
| Child promise ignored | Slow controlled child failure vetoes commit; no premature return or dangling task. |
| Overlapping siblings / same-dataset hazard | Approved rejection before second write; first settles before rollback; awaited recursion works without deadlock. |
| Retained callback after closure | No disk changes or silently created root; deterministic context-closed response. |
| External handle/context supplied | No authorization/trigger/write/commit/rollback calls; no assertion about existing external work. |
| Commit throws before first persist | unknown, unknown=N; no rollback/afterCommit even though test disk is unchanged. |
| Commit throws after first of two persists | Fresh reader sees first new dataset and second old dataset; unknown, no false per-record certainty or restoration. |
| All writes succeed, wrapper throws afterward | Disk contains all changes; manager still reports unknown without acknowledged commit. |
| Write/rename/cache-update boundary fault | Unknown after commit attempt; inspect files, temp remnants, fresh vs cached views separately. |
| afterCommit throws | Persisted row exists; success=false, committed=true, succeeded=W, failed=0; no rollback. |
| Post-commit child succeeds/fails/is ignored | Independent transaction; parent stays committed; child failure propagates as post-commit error, retaining child's outcome. |
| HTTP contracts | Real loopback serialization of committed, unknown and post-commit outcomes, original fields/status policy retained; joined remains a library-only boundary. |
| Type/result compatibility | Old result literals compile; absence treated as unspecified; consumer covers enum and never retries based only on !success/!committed. |

The production service cannot register a normal business dataset/handler. Use a test-only bootstrap composing real ORM/I-AM/registry/manager and the same production request handler, or the approved minimal service-factory extraction. A fake endpoint returning handcrafted result JSON is insufficient. Do not introduce production bootstrapping features solely to make tests pass; record the tested composition honestly.

After authorization, recheck npm 10.8.2/Node 24.19.0 compatibility and baseline hashes; use the existing locked installation. Run D build, typecheck, targeted new tests and full suite. Starting baseline is 88 tests; reconcile all additions/changes. Run P schema/migration compatibility, build/typecheck, editor contracts and production-exclusion checks specified by the stabilization plan where applicable, without changing fingerprints/dependencies. Retain failed attempts and distinguish new symptoms from known limitations.

## 9. Explicit limits of multi-file storage

- Commit is sequential per-dataset replacement. A later failure can leave partial persistence. Even a single-file thrown commit is uncertain; successful return means adapter completion, not proved fsync/power-loss durability.
- Pre-commit rollback discards staged arrays, not persisted files, external trigger effects or independently committed post-commit children. No compensation is added.
- No transaction-wide locks, cross-process cache invalidation, snapshot isolation, conflict detection, journal, durable poisoned-state marker or recovery coordinator exists. Use one coordinated writer for the tested scope; independent roots/managers/processes can still overwrite each other.
- DOE session guards do not enforce closed state/origin on direct ORM handles or prevent callers bypassing DOE. Those are separate ORM contract decisions.
- options.atomic currently selects no different algorithm. Recommend retaining one logical transaction for either value and documenting that limitation; do not implement partial-batch mode here. The stronger architecture goal remains unmet at storage-failure boundaries.
- No automatic retry is justified by the booleans. Unknown needs separately approved investigation; replay after a post-commit error may duplicate writes. No new recovery API or idempotency engine is implied.
- Windows rename/access faults need direct tests without broad retries. P's separate watcher EPERM report remains preserved; its passing STAB-1 run did not resolve it. A new ORM failure is not automatically the watcher issue.
- The two schema applied-state authorities, schema-application state/journal identities and trigger publication/runtime registration remain untouched. All STAB-1 deployment/legacy limitations continue.

## 10. Decisions requiring approval

| Decision | Recommended bounded choice | Alternative / consequence |
| --- | --- | --- |
| T1 result fields | Optional types, always emitted by repaired manager; absent=unspecified; preserve joined provisional counts | Required fields provide stronger source guarantees but break old producers and require coordinated migration. |
| T2 owner boundary | Reject public external handle/context inputs; private session joins only | Supporting external owners requires commit-veto/lifetime contracts and broader scope. |
| T3 rollback and uncertainty | Owned rollback only before commit attempt; any thrown commit=unknown; no rollback/retry afterward | Inferring no persistence from an exception is unsafe. |
| T4 child scheduling/lifetime | Track/drain children, poison on every failure, reject overlapping siblings/stale callbacks | Concurrent scheduling/isolation is additional design, not an incidental refactor. |
| T5 afterCommit | Root-only dispatch; independent tracked post-commit children; report failures without undoing parent's outcome | Per-joined-child callbacks or compensation changes lifecycle and needs separate approval. |
| T6 HTTP/atomic option | Preserve 200 result envelopes and current logical transaction behavior; document limitations | New transport policy or true partial-batch/atomic storage requires expanded scope. |
| T7 HTTP test composition | Real ORM/handles/persistence, test bootstrap with production handler; minimal factory extraction if needed | No production registration or fault-injection feature. |

Prior approval supports the direction of truthful outcomes and nested propagation, not implementation of these concrete choices. Design approval remains separate from release, deployment and later work packages.

**STOP: STAB-2 design review gate.** No STAB-2 implementation has begun. No STAB-3, DS0-WP2, push, package release, migration or deployment was performed.
