# DS0 STAB-3 unsupported-operation and scoped-write containment plan

Date: September 28, 2026 (America/New_York). **DESIGN ONLY — STOPPED AT STAB-3 DESIGN REVIEW GATE.**

## 1. Purpose, authority and baseline

Implementing this proposal requires a further approval. The current authorization covers investigation and planning only. B4 remains open. The user accepted STAB-2 and closed B3 for the tested checkout; see the [acceptance record](ds0-stab-2-acceptance-record.md). This proposal follows section 7 of the approved [baseline stabilization repair plan](ds0-baseline-stabilization-repair-plan.md), the [B4 audit](ds0-wp2-preflight-audit.md), and current source. It does not create restore semantics or implement record-scope evaluation.

Repository aliases: D = `C:\Projects\Modular\UI Platform Data Services`; P = `C:\Projects\Modular\ui-platform`; B = `C:\Projects\Modular\ui-base`. Source references below are D-relative unless prefixed P.

| Repository | Current reviewed HEAD | State on entry |
| --- | --- | --- |
| D / master | `d0aa1044b551086d2fbfaccf80357e7e6a5827dc` | Clean; existing commit contains exactly accepted STAB-2 |
| P / main | `a4b835dc89100cf30e0b0018a0210e08eca6856a` | Clean; existing commit preserves STAB-2 report/evidence |
| B / main | `96898f73809272e680fcb3402f064a039fff4350` | Clean; unchanged |

The [review inventory](evidence/ds0-stab-3-design/review.json) records hashes, commit file scope, lockfiles and preserved evidence. All ten D STAB-2 files exactly match the tested hashes. The original 17 P report/evidence artifacts remain unchanged. New artifacts from this turn are this plan, the acceptance record and review evidence only. No runtime source, store, dependency, version or lockfile was modified; no new tests were executed.

## 2. Current dispatch and authorization paths

| Entry/path | Actual implementation and implication |
| --- | --- |
| Public library write | `dataset-operations/src/index.ts` exports `DatasetOperationManager`; `execute` rejects external parent/transaction arguments, otherwise calls private `executeInternal`. All insert/update/delete/restore requests converge here. |
| HTTP write | `src/request-handler.ts:16`: authenticated `POST /operations` parses JSON and calls public execute. JSON is not runtime-validated against the TypeScript operation union. Service composition in `src/service.ts` supplies local ORM/I-AM/registry. |
| Trigger child before commit | `operation-manager.ts`, `run`: `context.datasets.execute` checks lifetime/overlap, inherits actor and correlation, sets trigger source, then invokes the same private execution path with the root session. Ignored child failures poison the root under STAB-2. |
| Trigger child after commit | Same callback entry, but a new owned session. A rejected child cannot undo the already-confirmed parent. STAB-2 reports parent POST_COMMIT_FAILED with committed outcome. |
| Actual write dispatch | `executeInternal` authorizes `request.operation`, normalizes records, begins/joins, runs a generated before phase, then uses insert/update/else-delete. Every value other than insert/update reaches delete if earlier steps succeed. Restore is in the exported request/action unions but lacks a dedicated ORM primitive or declared trigger phase. |
| Query | Public `query`, HTTP `POST /queries`: asks I-AM for query access, combines returned scope with request.where, filters selected fields and calls ORM query. No write dispatch; preserve it. |
| Runtime trigger administration | `TriggerRegistry.create/update`, exposed by trigger HTTP routes, directly owns ORM transactions. These are administrative registry writes, not DOE business-operation dispatch. No scoped-write gate exists here; this proposal does not change them. |
| I-AM administration | `OrmIamPolicyStore.saveGrant/removeGrant/saveMembership` writes policy via direct ORM; service POST /grants has an administrative bearer check. These paths are not DOE requests and must not be redirected through DOE, which would introduce circular authorization. |
| Direct ORM clients | Exported ORM insert/update/delete accept concrete transactions, with no I-AM or operation-string dispatch. ORM query has a query-expression switch. Preserve the lower-level boundary; trusted code holding an ORM can bypass DOE. |
| Schema/Trigger Manager, VDR, schema-application | Definition publication/rollback and state/journal changes are separate APIs, not DatasetOperationRequest dispatch or row restore. Do not gate or rename them. |
| P integration | Searches of P src/packages/scripts/tests found no DOE execute/result client or /operations caller. P's `packages/artifacts/src/application/trigger-adapter.ts` reads the structural TriggerRegistry.list subset. Schema adapters, migrations and application logs use separate contracts. No P runtime edit is proposed. |

No separate DOE CLI dispatcher was found in the inspected first-party source. Source `ui`, `form`, `api`, `trigger`, `import`, `sync` and `system` labels all use the same manager; they do not grant authorization or select a different storage path. External callers, launchers and deployments remain unverified.

### How grants reach DOE

`OrmIamPolicyStore` reads persisted permission grants and, for user actors, group memberships. `PolicyAuthorizationService.authorize` matches enabled grants by exact app/dataset/action and direct user/service/system identity or a user's group membership. Fields are unioned across matching grants. Writes are allowed only with a matching grant and no denied requested fields; queries have different field handling.

The service returns the **first truthy recordScope among all matching grants**. An unscoped matching grant does not erase another matching scope. DOE currently consumes only allowed/field access for writes, discarding that scope; query consumes it. Scope is a QueryExpression in current types, not the complete declarative linked-record architecture. No per-row write evaluator, old/new-image policy or multi-grant scope composition is implemented.

Nested requests reauthorize for the child dataset/action with the inherited actor. The callback overwrites caller-provided actor/source/lineage. There is no special exemption for system actors, source labels or nested operations. Authorization is in-process in default DOE service composition, not an HTTP call to the separately launched I-AM service. The two services default to different data roots; a grant saved to a separate I-AM deployment is not proven visible to DOE. This existing configuration boundary is not repaired here.

An additional source-level edge case: policy JSON is cast to PermissionGrant without validating nested scope data; `matching.find(g => g.recordScope)` drops `null`, `false`, `0` and empty-string scopes. A DOE-only check cannot observe a scope already dropped upstream. Decision S4 below proposes narrow write containment for this case. No inspection or migration of live policy stores was performed.

## 3. Proposed unsupported-operation contract

Accept only the exact primitive string values `insert`, `update`, `delete`. Reject restore, export/query submitted as writes, unknown strings, casing/whitespace variants and non-string operation values with `UNSUPPORTED_OPERATION`. Do not coerce or trim input into permission to write. Retain the public restore union literal for source compatibility, documented as unsupported; retain I-AM's broader action vocabulary. No new public capability or result field is needed.

Place the operation guard inside the shared `executeInternal` try/catch, after existing session/depth safety checks but before dataset lookup, authorization, normalization, begin, registry lookup or handlers. Use an explicit ExecutionFailure diagnostic so the new code survives STAB-2 sanitization. Public external-context/transaction rejection and stale/overlap rejection retain their existing precedence. For an otherwise valid request, an unsupported operation wins over a missing dataset or denied grant. A previously poisoned session retains its initiating failure.

Capture the validated operation before the first await and use that same value for context, I-AM action, before/after phases and explicit three-case dispatch. Do not re-read a caller-mutable `request.operation` after authorization or trigger work. The switch default must reject, never delete. This closes operation substitution during an awaited dependency without attempting a general request-immutability redesign.

The new guard covers malformed **operation values** in otherwise well-shaped request envelopes. Missing/null root envelopes, non-array records and generic HTTP schema validation are separate existing concerns; keep the existing transport error policy. Do not claim this change is a complete runtime request validator. Tests should distinguish invalid JSON/envelopes from valid envelopes containing unsupported operations.

## 4. Proposed scoped-write contract

After a successful I-AM decision, before normalization, transaction begin, trigger lookup or ORM write, reject when `decision.recordScope !== undefined`, using `RECORD_SCOPED_WRITE_UNSUPPORTED`. Both an absent scope and an explicit undefined value are unscoped under the existing optional TypeScript contract. A defined value, including an empty object, empty boolean expression, null or other invalid runtime value from a custom adapter, cannot be interpreted as unscoped.

Keep ordinary `!decision.allowed` rejection first and preserve AUTHORIZATION_DENIED. Do not disclose scope expressions or row contents in errors. Do not filter rows, compare in-scope/out-of-scope records, clear grants, change actors, or retry using elevated credentials. The whole request rejects, including legitimate in-scope writes, empty batches, mixed batches and insert/update/delete. `unauthorizedWriteBehavior=filter` is a field option and must not bypass this gate; neither can atomic=false or any source label.

For the built-in I-AM service, matching valid scopes remain returned exactly as today, including scopes from a second grant even when another grant permits unscoped access. DOE rejects such decisions. A disabled, other-actor, other-dataset or other-action scope must not block an unrelated unscoped write. No new grant-union/intersection/precedence policy is introduced.

### S4: malformed scope presence at the I-AM boundary

Recommended small additional guard: for write actions insert/update/delete/restore, if any matching grant has a **defined but falsy** recordScope, throw a sanitized AUTHORIZATION_DENIED before producing an allow decision. Valid QueryExpression objects are truthy. Defined truthy expressions (including structurally malformed objects) still reach DOE and are rejected there. Check all matching grants so a valid earlier scope cannot mask malformed policy, and never rewrite policy files.

This is presence containment, not expression validation or evaluation. Omitted/undefined scope remains the existing representation for unscoped grants. Keep query/export behavior unchanged. No new I-AM interface field or exception type is required: DOE already preserves AUTHORIZATION_DENIED from authorization errors. The existing standalone /authorize handler would return its current HTTP 400 exception response for this newly rejected malformed-write-policy case; ordinary decisions and DOE's HTTP 200 business-result envelope remain unchanged. This additional I-AM behavior change explicitly requires approval with S4.

Alternative: change only DOE and explicitly exclude malformed persisted/adapted policy from the containment claim. This is smaller but leaves a demonstrated source-level route for a configured falsy scope to disappear. Not recommended for an unqualified B4 closure. A general validated policy-write API or scope-aware grant compiler is a larger separate design, not this package.

## 5. Transaction, nesting and rejection results

| Scenario | Required outcome and preservation |
| --- | --- |
| Root unsupported/scoped write | success=false, committed=false, commitOutcome=not-committed; requested=N, succeeded=0, failed=N, unknown=0; no records. Zero begin/write/commit/rollback and no trigger lookup/invocation for that request. |
| Joined child rejects before its own write | success=false, committed=false, commitOutcome=joined; failed=N, unknown=0, no records. Set shared failure through the existing catch path. No child begin/rollback/commit; no child trigger or ORM write. |
| Parent already staged before child rejection | Await tracked descendants, abort later staging via assertActive, root rolls back once before commit. Root not-committed; zero commits. Existing persisted files remain byte-identical although earlier in-memory parent/sibling staging occurred. |
| Grandchild failure ignored by both ancestors | Same poisoned-root guarantee, even for void child promises or ignored/caught results. Sequential valid nesting remains supported. |
| afterCommit child rejected | Child not-committed with zero own mutation. Parent remains committed with successful original records/counts and POST_COMMIT_FAILED; do not undo/replay the parent. Byte preservation compares the child's pre-invocation baseline, not the root's pre-commit store. |
| Stale/overlapping callback or external context/handle | Preserve STAB-2 rejection codes and ownership rules. These boundary failures can precede the proposed B4 diagnostics. |

Zero-record failures still carry the error code when all count fields are zero. Absent commitOutcome from legacy producers remains unspecified. All repaired-manager results populate commitOutcome and counts.unknown. No caller should retry merely because success/committed is false; unsupported capability and scope containment are persistent rejections until separately authorized changes.

“Before mutation” applies to the rejected operation. A nested child cannot prevent an already-run parent handler's external side effects, but STAB-2 prevents its transaction from committing after a pre-commit failure. Trusted handlers directly calling an ORM or a separately captured manager cannot be sandboxed by this callback design; do not claim system-wide containment for arbitrary trusted code.

## 6. Decisions requiring approval

| Decision | Recommended approval |
| --- | --- |
| S1 | Exact insert/update/delete allowlist in shared private execution, before authorization/trigger/storage work; capture one validated operation and remove fallback deletion. Preserve restore type literal, reject it at runtime. |
| S2 | Reject every allowed decision with a defined recordScope using RECORD_SCOPED_WRITE_UNSUPPORTED, including legitimate in-scope and empty-batch writes. Preserve denied-decision precedence and valid unscoped CRUD. |
| S3 | Preserve STAB-2 root/joined/post-commit outcomes, diagnostic precedence, ignored-child poisoning and HTTP 200 business envelopes. New errors use existing OperationError, without public contract expansion. |
| S4 | Add the narrow I-AM write-only malformed-falsy-scope guard described above. This is the only proposed I-AM runtime change; queries, action vocabulary and valid policy decisions remain unchanged. |
| S5 | Bound implementation to STAB-3A–D below. No scope evaluator, restore feature, general HTTP/policy validator, ORM change, direct administrative-path redesign or UI Platform runtime edit. |
| S6 | Require real ORM/I-AM/HTTP and byte-preservation evidence, full regression checks and an acceptance report before B4 closure. No deployment certification or DS0-WP2 authorization follows automatically. |

These are proposed implementation decisions. Earlier acceptance of temporary scoped-write rejection as a planning direction does not authorize execution now. If S4 is declined, explicitly narrow the acceptance claim or return for another policy-presence design; do not silently accept malformed scopes.

## 7. Proposed implementation boundaries and files

| Boundary | Files and work | Exit criterion |
| --- | --- | --- |
| STAB-3A: capability containment | `packages/dataset-operations/src/operation-manager.ts`; comments in `src/types.ts`; new `tests/operation-security.test.ts` | Shared early guard, immutable local operation selection and explicit dispatch; restore/unknown values cannot reach delete or trigger phases. |
| STAB-3B: scope containment | Same manager; S4 only in `packages/i-am/src/authorization-service.ts`; new `packages/i-am/tests/write-scope-containment.test.ts`; DOE security tests | Valid scopes reject without evaluation; malformed falsy matching write scopes deny; unscoped authorization and query semantics retained. |
| STAB-3C: integration/regression | New DOE security test file, additions to `tests/nested-transactions.test.ts` and `tests/operation-service-contract.test.ts`; narrowly extend `tests/transaction-fixture.ts` | Real persisted grants/rows, all three CRUD counters, fresh readers, tracked nesting and real HTTP contracts; original tests/expectations retained. |
| STAB-3D: compatibility and acceptance | DOE README; I-AM contract note where appropriate; P implementation/acceptance report and evidence | Document unsupported restore, temporary scoped-write outage, new codes, malformed-policy behavior, counts, commands, hashes, exact test counts and limitations; stop for acceptance. |

No production request-handler/service change is expected. They already pass through the shared manager and serialize the result. No ORM/I-AM type/export-map change, new dependency or package version/lockfile change is expected. If implementation proves another production interface or storage change necessary, stop and identify the specific conflict before expanding scope. Test helper changes must retain the original STAB-2 failure scenarios and assertions.

## 8. Required regression and acceptance tests

Use synthetic temporary roots only. Compose actual JsonFileDatasetOrm, OrmIamPolicyStore, PolicyAuthorizationService and TriggerRegistry. Persist fixture grants, membership and rows before resetting observation counters. The current STAB-2 fixture counts only insert as a write: extend test instrumentation to update/delete too, delegating to the original ORM; do not infer zero writes from its old insert-only counter. Observe definition/authorization/registry accesses separately to prove ordering.

| Test group | Cases and pass criteria |
| --- | --- |
| Unsupported dispatch | Restore with a real matching restore grant and an existing row; arbitrary strings with matching malformed stored action grants; export/query, empty/case/space variants, null/undefined/number/boolean/object/array operations in otherwise valid envelopes. All return UNSUPPORTED_OPERATION before definition/I-AM/registry/begin/write. Existing row never disappears. Register ordinary trigger spies and raw synthetic restore-phase fixtures if needed to prove none run. |
| Operation consistency | Mutate the original request.operation during awaited authorization and during a before handler. The previously captured authorized operation determines phase and primitive; no update/delete substitution. No general mutation guarantee for unrelated request fields is implied. |
| Real scoped CRUD | For each insert/update/delete, use a valid persisted grant scoped to a synthetic owner field and both matching/nonmatching row inputs. Both reject. Include mixed batches and zero rows, partial update and ID-only delete, compound/empty and/or scopes; rejection needs no row evaluation. No begin/trigger/write/commit/rollback at root. |
| Decision presence | Custom adapter returns allowed=true with recordScope null/false/0/empty-string/empty-object: DOE rejects all defined values. Explicit undefined/omission is unscoped. Adapter denial retains AUTHORIZATION_DENIED. |
| Actual I-AM policy presence | Persist matching falsy defined scopes via the actual policy store; S4 denies writes, even with a second unscoped matching grant or valid earlier scoped grant. No files are rewritten. Query behavior remains baseline. Malformed truthy scope propagates and DOE contains it without evaluating it. |
| Subjects and grants | User direct and group membership, service and system actors; scoped plus unscoped matches in both insertion orders, multiple valid scoped grants, field grants combined across matches. Any selected scope rejects; disabled/unrelated scopes do not block valid unscoped CRUD. No-grant and field-denied behavior unchanged. |
| Options/source | Both atomic values and reject/filter field modes cannot bypass rejection. Parameterize source labels; explicit system source does not elevate a user. Nested actor-spoof fields are overwritten as today. |
| Ordinary unscoped CRUD | Real authorized insert/update/delete with fresh-reader assertions after every operation; same fields/defaults/validation, trigger order, records/counts and confirmed-commit outcomes. Existing no-grant, required-field and field-denial checks remain. |
| Nested pre-commit | Unsupported and scoped child from before and after parent handlers; awaited/ignored result, void promise, swallowed failure, grandchild failure ignored by two ancestors. Child handlers/ORM writes never run. Parent may stage first; root rolls back once, never commits, all persisted files remain unchanged. Later children cannot resume a poisoned session. |
| Nested lifecycle | Sequential unscoped children still joined/provisional with one commit. Stale/overlap/public external args retain STAB-2 codes. afterCommit rejected child leaves parent persisted with committed outcome and successful records/counts, child unchanged, no replay/rollback. |
| HTTP serialization | Loopback server using the exact production request-handler with real manager/ORM/I-AM/registry. POST /operations restore, unknown value, scoped CRUD, unscoped success, nested failure, post-commit rejected child. Assert HTTP 200, JSON codes, outcome/count fields and omitted failed records. Missing bearer stays 401; invalid JSON/envelope stays within existing transport behavior. |
| I-AM compatibility | Assert standalone /authorize's existing 400 exception policy for S4 using a safely isolated service process if tested end-to-end; do not add an endpoint or broaden production composition just to test it. At minimum explicitly test the actual service's write authorization rejection and inspect the unchanged serializer; do not call that an HTTP runtime test. |
| Consumer compatibility | Old result literal still compiles; restore request literal still compiles while runtime rejects. Outcome-aware consumer makes one request; no automatic retry on either new error, false booleans or unspecified legacy outcome. Error-string-dependent external clients require review. |
| Query non-regression | Actual persisted scoped query and caller where are combined as before; field selection and no-grant behavior stay unchanged. Do not certify untested query-security edge cases or repair them under this task. |

### Byte-preservation method

Snapshot recursive relative file paths and raw bytes after fixture setup and before the rejected operation. Compare the whole synthetic root afterward, including policy, trigger and business files; assert no added/deleted files or leftover .tmp files. Supplement with a fresh ORM reader to avoid cache-only claims. Compare caller records where appropriate to ensure rejection precedes normalization. Do not rely on parsed JSON equality or timestamps. Include absent business files as well as existing rows. For joined failure compare pre-root persisted state; for post-commit child rejection assert the known parent-only delta and unchanged child/policy/trigger bytes. Setup writes are outside the measured window.

### Validation commands after separate implementation approval

Use the accepted local npm 10.8.2 CLI and shims with Node 24.19.0 after rechecking versions; never silently substitute global npm. No installation is currently proposed. Record exits and full outputs.

1. D: `npm run build`, `npm run typecheck`, focused DOE/I-AM security tests, then `npm test`.
2. D: repeat the STAB-2 standalone strict TypeScript consumer-fixture compilation from its report.
3. P: the two schema-adapter-compatibility/migrations-deployment test files, `npm run typecheck`, `npm run check:editor-production`, and `node scripts/check-editor-contracts.mjs`.
4. Compare before/after repository statuses, package/lock hashes, accepted STAB-1 files/evidence and original STAB-2 tests; review every intended change. Record the accepted STAB-2 commit as the delta baseline rather than overwriting its hashes.

Existing baseline: D 128 tests (88 through STAB-1 plus 40 STAB-2), ten test files; DOE 41 tests. P focused 12 and editor contracts 103 overlap. Require all existing tests retained plus the enumerated new cases. Exact new totals must come from implementation-run output, not a speculative design count. A failed test requires diagnosis; do not replace an assertion or skip it to meet the gate.

Preserve [Windows watcher issue](artifact-watcher-windows-rename-issue.md). It did not reproduce in accepted STAB-2, but remains unresolved. Recurrence must match the documented test/path/error; other failures are new until diagnosed. The deliberate STAB-2 ORM rename-fault test is separate. Record sandbox/tool startup failures and justified retries separately; do not call them watcher regressions or erase first-run evidence.

## 9. Compatibility, architecture and residual limits

This is an intentional behavior break for restore/unknown calls that previously reached delete and all valid scoped writes that previously succeeded. In-scope clients also lose write availability. Mixed scoped/unscoped grants conservatively reject under existing selection semantics; removing restrictive grants to regain writes is not an approved workaround. HTTP 200 remains a business envelope, not evidence of successful mutation. Published package versions remain unchanged here; release coordination and deployment need separate authorization and external-client assessment.

The existing Dataset Operation Manager architecture sections 8, 11 and 14 and I-AM architecture sections 8, 13 and 20 describe a broader action vocabulary, record-scope enforcement and trusted administration boundary. Temporary rejection is containment of an unimplemented capability, not fulfillment or cancellation of those requirements. Preserve those architecture files. The ORM architecture keeps authorization above storage; adding a permission engine to ORM would violate this boundary.

**Separate future work: full record-scoped authorization.** It needs approved declarative scope resolution, field/scope grant composition, actor facts and relationships, pre-image and final post-trigger image rules, delete/update identity checks, batch semantics, nested transaction reads, policy freshness, concurrent updates and race protection. Do not use ORM's existing query matcher as an implicitly approved write-scope evaluator. Restore semantics, runtime request validation, administrative authorization and trusted-code isolation are separate designs too.

STAB-1 checksum/history restrictions remain intact. STAB-2 unknown-commit and post-commit semantics, non-atomic multi-file storage, lack of durable recovery/writer fencing and callback side-effect limits remain intact. Query limitations are not resolved. DOE HTTP actor binding and trusted administrative token policy are unchanged. No system-wide security certification is implied by closing B4 for the tested manager path.

The two applied-state authorities, schema-application persisted identities/journal hashing, runtime trigger registration versus published definitions, missing complete DS0 plan and external deployment configuration remain unresolved as previously documented. Passing containment does not establish DS0-WP2 readiness.

## 10. Investigation evidence and gate

This turn used read-only Git status/log/show/diff/diff-check, SHA-256 comparisons, file reads and repository searches across D first-party sources and P integration code. Reviewed actual manager, request handler, service, types/exports, trigger registry, I-AM authorization/policy/service, JSON ORM, accepted tests and architecture documents. No test run is claimed for STAB-3. Exploratory reads initially targeted a nonexistent D docs directory and nonexistent standalone authorization test; actual architecture and test locations were then found with file search.

The pre-existing accepted STAB-2 source commit is preserved without an empty duplicate. Only new documentation/evidence was written in P; D remains clean. No fetch, push, release, deployment, migration or package/lockfile edit was performed.

**STOP: STAB-3 design review gate.** Review decisions S1–S6 and the proposed STAB-3A–D boundaries before any implementation. B4 stays open; STAB-4 and DS0-WP2 have not begun.
