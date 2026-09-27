# DS0 baseline stabilization repair plan

Date: September 27, 2026. Status: **PROPOSED — STOPPED AT REPAIR-PLAN REVIEW GATE.**

Evidence source: `C:\Projects\Modular\ui-platform\docs\architecture\ds0-wp2-preflight-audit.md`, September 26 audit. Its SHA-256 at this review is `F4770FFC052B0C308190F578FB9E87E72E8DD14CAD3A4AA46AD28414C2162F9B`. The audit is preserved unchanged. This plan uses its reproduced findings; today's source reads establish affected interfaces and confirm the baseline, not a new acceptance test run.

## 1. Scope and review boundary

Only baseline provisioning and narrowly bounded repairs for B2, B3 and B4 are proposed. This is **not DS0-WP2**. No runtime activator, reload coordinator, applied-schema resolver, operational recovery workflow, state-store durability redesign, or trigger publication bridge is authorized by this plan.

The user's instruction to produce the plan first and stop is applied before dependency installation as well as source changes. Installation and actual-checkout validation are the first proposed execution package after approval. They have **not** been performed today. The earlier temporary-copy results must not be reported as results from the actual checkout.

Published version history and existing application data must remain untouched. No rehash-in-place, reindex, automatic republish, historical metadata edit, state conversion, or migration is included. Any such work needs separate approval based on an explicit inventory and compatibility proposal.

Repository aliases for affected files below:

- **P:** `C:\Projects\Modular\ui-platform`
- **D:** `C:\Projects\Modular\UI Platform Data Services`
- **B:** `C:\Projects\Modular\ui-base`

## 2. Preserved baseline and current status

Verified September 27 at approximately 03:27 EDT:

| Repository | Audited SHA, also current HEAD | Branch / configured upstream | Current working tree |
| --- | --- | --- | --- |
| P | `b8e495d94e9a49cc0122d5075f621a3ca609be52` | main / origin/main | Only the pre-existing untracked preflight audit; no staged or tracked modifications |
| D | `313b7e0c64e8e93f75632bb9dc015614d7709668` | master / origin/master | Clean |
| B | `96898f73809272e680fcb3402f064a039fff4350` | main / origin/main | Clean |

This document is an additional untracked report in P. No refs, branches or tags were moved or created. These recorded SHAs are the repair comparison baseline; they are not a claim that origin/main is universally authoritative. Today's inspection did not fetch remote refs; the September 26 audit records successful fetches and 0/0 tracking differences.

D's lockfile SHA-256 is `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F`. D still has no `node_modules`. Installed host tools remain Node 24.19.0 and npm 11.17.0. D declares `packageManager: npm@10`, which does not establish an exact patch version. **Propose npm 10.8.2**, the explicit version recorded by B, subject to approval with this plan. Do not silently use npm 11, the floating latest npm 10, or modify D's manifest to assert an agreement that has not occurred.

Before approved execution, recheck all three statuses and SHAs, preserve this audit and plan, and stop to reconcile unexpected changes. Do not reset a checkout to force a match. Record actual implementation commits separately from the audited baseline.

## 3. Proposed work-package boundaries and order

These identifiers are stabilization labels, not recovered DS0 plan numbering.

| Package | Scope | Dependencies | Exit evidence |
| --- | --- | --- | --- |
| STAB-0 | Provision D and reproduce existing baseline in actual checkout | Plan approval and exact npm version agreement | Unchanged lockfile; built exports; build/typecheck; eight existing tests, four focused state-store tests |
| STAB-1 | B2 canonical checksum repair with explicit legacy handling | STAB-0; checksum compatibility decision approved | Nested-content/tamper tests; byte-preservation tests; consumer compatibility results |
| STAB-2 | B3 transaction ownership and truthful result semantics | STAB-0; result compatibility decision approved | Real persistence and injected-failure tests, including nested operation failures |
| STAB-3 | B4 unsupported-operation and scoped-write containment | STAB-2 for joined-transaction failure behavior | Restore cannot delete; scoped writes fail closed; ordinary authorized CRUD remains working |
| STAB-4 | Consolidated baseline acceptance evidence and unresolved-boundary record | STAB-1–3 | Actual-checkout results, diff review and explicit remaining limitations; another review gate |

Keep changes reviewable by package. Do not fold in dependency upgrades, UI Base branch reconciliation, new authorization semantics, general validation improvements, ORM atomicity redesign, or watcher repairs. Passing stabilization does not itself authorize WP2.

## 4. STAB-0 — dependencies and unchanged baseline

**Affected locations:** D `node_modules/` and ignored `packages/*/dist/` only; no tracked source, package.json or package-lock.json change expected. Evidence can be appended to a separate stabilization results document in P after execution.

Use an isolated npm 10.8.2 CLI, verify its reported version and Node compatibility before installation, and ensure nested npm scripts use that same executable. Do not globally replace the user's npm. If the selected version cannot run, stop and propose a toolchain adjustment rather than silently switching versions.

Run in **D's actual checkout**, in this order, using the agreed npm executable:

```text
npm --version
npm ci --ignore-scripts --no-audit --no-fund
npm ls --depth=0
npm run build
npm run typecheck
npm test
npm exec -- vitest run packages/schema-application/tests/state-store.test.ts
```

The audit's locked install succeeded with lifecycle scripts disabled. Retain that setting initially; if a required native tool needs a lifecycle step, identify and review that specific step rather than broadly enabling arbitrary scripts. Use the existing declared workspace build order so declaration exports exist before typechecking consumers. Do not use `npm install` to repair the manifest/lock relationship. If `npm ci` reports inconsistency, stop with the diagnostic.

Record tool versions, exit codes, output paths and lockfile hash before/after. The baseline expectation from the audit is 8 total tests and 4 focused tests. A different count, failure or changed lockfile requires explanation before implementation. Recheck Git status; no existing application data should change. Tests must use temporary data roots.

## 5. STAB-1 — B2 checksum repair and compatibility

### Smallest proposed code change

Replace VDR's top-level-key replacer hashing with deterministic serialization of the **entire JSON value**: recursively sort object keys, retain array order, preserve JSON primitive values and hash the UTF-8 result with SHA-256. Reject unsupported/non-JSON values predictably rather than silently omit them. Define the accepted JSON domain in tests; do not claim compliance with an external canonicalization standard without implementing it.

Use a versioned format discriminator for new checksums, proposed `checksumFormat: "canonical-json-v1"`, retaining the existing `sha256:<hex>` checksum string shape. Optional metadata in the public type permits reading old records; newly published test definitions must write the discriminator. Apply the same representation consistently to draft comparison, new publication and integrity verification. Unknown format discriminators fail closed.

### Existing published checksum assessment

Legacy untagged checksums omitted nested keys. They cannot authenticate nested historical content. A matching legacy digest is **not** proof that the artifact is intact; replacing it with a newly computed digest would certify potentially altered content without evidence. Even an artifact whose flat shape happened to hash fully lacks the new format marker; do not guess its trust level from content.

Recommended conservative compatibility policy for approval:

1. Preserve historical files byte-for-byte. Permit raw historical inspection via the existing version-reading path, explicitly documented as not an integrity assertion.
2. `verifyIntegrity` must report legacy versions as unsupported/unverified, not valid and not conclusively tampered. With the current report shape, return `valid: false` plus a distinct `DEFINITION_CHECKSUM_LEGACY_UNVERIFIED` error. A new-format digest mismatch remains an integrity error.
3. Do not declare a draft clean by comparing a canonical digest with a legacy digest. Treat the legacy comparison as unavailable, expose the diagnostic, and avoid claiming trustworthy equality; conservatively report modified for a valid draft under the existing state union.
4. Prevent verified active consumption or mutating publish/rollback paths from silently promoting an unverified legacy history. Validate this guard **before** writing the draft or changing any version metadata. Raw inspection remains possible. This is an intentional availability restriction requiring review.
5. New-format definitions in empty temporary registries support ordinary draft/publish/rollback tests. No publishing, activation or rollback is executed against existing application roots during stabilization.

An old binary also cannot reliably verify new-format data: it ignores the marker and computes the legacy algorithm. Mixed old/new readers or writers must not be certified. Deployment against existing published stores needs a separately approved compatibility procedure and coordinated consumers. Merely rolling code back after new-format publication is not guaranteed safe.

Before any deployment decision, conduct a read-only inventory of explicitly identified definition roots and checksum consumers, reporting counts/formats without copying application contents into logs. Do not assume all deployments use `./data/definitions`. The audit did not establish whether real published histories exist elsewhere. Migration, replacement attestations and trusted-source republication remain outside this plan.

### Affected files

| D path | Proposed change |
| --- | --- |
| `packages/versioned-definition-registry/src/registry.ts` | Replace digest; format-aware comparison/verification; pre-mutation legacy guards |
| `packages/versioned-definition-registry/src/types.ts` | Optional checksum-format metadata on published/draft contracts; reuse error array for legacy diagnostics |
| `packages/versioned-definition-registry/tests/registry.test.ts` (new) | Canonicalization, tamper and legacy compatibility regressions |
| `packages/versioned-definition-registry/README.md` (new, narrowly scoped) | Format and legacy limitations; no migration instructions that write history |
| `packages/schema-manager/tests/schema-manager.test.ts` | Real nested schema change and tampered publication cases |
| `packages/trigger-manager/tests/trigger-manager.test.ts` | New-format publication/verification remains compatible |

No change to schema-application's stored published identity or state format is proposed. Its old checksum references remain unresolved compatibility evidence; do not rewrite them. Source exports need changes only if a public symbol actually changes; keep the canonicalization helper private where possible.

### Required tests

- Equivalent nested objects with different key insertion order hash equally; changed field type/default/required flag, field ID and dataset label change the digest.
- Arrays retain order; reordered fields hash differently; nested arrays, null, booleans, numbers and Unicode strings are covered.
- Fresh draft -> publication -> clean draft; nested edit -> modified; nested published tamper -> failed integrity; ordinary version/rollback tests remain passing for new-format fixtures.
- Untagged fixture remains byte-identical after inspection, failed verification, blocked active consumption, blocked publication and blocked rollback. No new files or draft replacement occur in blocked mutation cases.
- Unknown format fails closed; legacy mismatch is not mistaken for full canonical integrity coverage.
- P's actual upstream schema-adapter contract test and D's consumers still typecheck. Consumers of metadata/checksum strings are inspected for assumptions about new fields and verification status.

## 6. STAB-2 — B3 commit truth and transaction ownership

### Smallest proposed behavior change

Retain the owned transaction and phase outside the try block. Roll back an owned transaction on failure **before commit is attempted**. Never roll back someone else's transaction or describe rollback after partial file persistence as restoration. Preserve both the original failure and a rollback failure in diagnostics.

Once commit has returned successfully, an afterCommit handler error must return `success: false, committed: true`, the persisted write counts/records, and a specific post-commit error. Callers must not retry the write simply because success is false. No automatic retry is added.

A thrown commit can occur after one of several JSON files was persisted. The existing boolean cannot express that uncertainty. Propose an additive result field `commitOutcome: "not-committed" | "joined" | "committed" | "unknown"`. Keep `committed` for compatibility, meaning only **confirmed complete commit**; `false` must no longer be read as proof of zero persisted writes. For unknown outcomes, use zero confirmed succeeded/failed counts and an additive `counts.unknown` equal to the unconfirmed request count; do not label every record failed. Update callers/tests/documentation that consume these results. This contract addition requires approval with the plan.

For nested writes, maintain a shared execution/transaction failure marker for the current root operation. Any joined child failure must prevent root commit even if a handler ignores the returned failure or catches an exception. Nested operations do not independently commit, roll back, or run afterCommit before the root. Reject further writes in a failed transaction. Operations launched after the root has committed use independent transactions and cannot roll back the parent. If exposed externally owned transactions cannot safely honor the failed-state invariant, fail closed at that entry boundary and surface the compatibility issue rather than adding an unreviewed transaction owner.

### Affected files

- D `packages/dataset-operations/src/operation-manager.ts`: explicit phase/ownership handling, shared nested failure state and stable failure codes.
- D `packages/dataset-operations/src/types.ts`: proposed additive outcome/count fields and contract comments.
- D `packages/dataset-operations/tests/operation-manager.test.ts`: happy-path retention and transaction failure regressions; split a new `operation-failures.test.ts` if needed for readability.
- D `packages/dataset-operations/README.md`: commit, joined, unknown and post-commit semantics; no automatic retry guarantee.
- D `packages/dataset-operations/src/service.ts`: only if needed to preserve/serialize the result contract; do not redesign HTTP authentication or status conventions.

Keep the ORM storage algorithm unchanged. Use the real JSON ORM for persistence assertions and a delegating fault-injection wrapper for precise failure points. Check disk or instantiate a fresh ORM; cached queries alone are insufficient proof of rollback or persistence.

### Required tests and compatibility risks

| Case | Expected evidence |
| --- | --- |
| Required-field/I-AM denial before transaction | No begin/commit/rollback or row mutation |
| before/after trigger or write fails before commit | Owned rollback once, no commit, no persisted rows; original error preserved |
| Root and child succeed | One root commit, joined child outcome, expected stored rows |
| Child fails, parent ignores/catches failure; deeper child fails | Root cannot commit staged writes; shared failure survives handler behavior |
| External transaction fails | Manager does not assume ownership; caller receives unusable/failed transaction evidence |
| afterCommit throws | Row exists on disk; committed=true, specific failure, successful write counts retained; no rollback |
| Commit throws before/after an injected file write | Outcome unknown, not a false claim of atomic rollback; no automatic retry or recovery |
| Rollback itself throws | Both failures reported; no false clean-rollback claim |
| HTTP response for post-commit/unknown outcome | Public result fields survive serialization; client assertions inspect body |

The additive fields are structurally compatible with many consumers, but the corrected semantics are behaviorally significant. Review all result consumers before use. No crash-safe transaction coordinator, restoration workflow, writer fencing, durable transaction journal or reload is included; those require separate scope.

## 7. STAB-3 — B4 smallest safe containment

### Unsupported operations

Use an explicit supported-operation dispatch for insert/update/delete. Reject restore and all unknown runtime values with `UNSUPPORTED_OPERATION` before triggers or writes; remove the else-delete fallback. Retain the exported restore literal initially for source compatibility but document its unsupported behavior. Do not invent restore semantics or alter application data to emulate restore.

### Scoped writes: recommended narrow policy

The smallest safe change is to **reject every write whose authorization decision contains a record scope**, with a specific unsupported-scoped-write error before transaction mutation or trigger execution. Unscoped authorized CRUD continues. This prevents the audit's unauthorized writes without inventing a row-filter evaluator, grant-combination policy, pre/post-image rules or concurrency guarantees.

This is intentionally a containment repair, not full scoped-write support. Previously accepted scoped requests, including legitimate ones, will fail. If preserving legitimate scoped writes is a requirement, do not implement this alternative silently: return for a separate scope-aware design covering existing-row authorization, final post-trigger values, batches, grant composition, transaction reads and concurrent updates. No grant is widened or removed to bypass the rejection.

The current I-AM decision uses a selected record scope; it does not establish a complete multiple-grant composition contract. Keeping scoped writes disabled avoids claiming that contract was solved. Query behavior and I-AM grant semantics remain unchanged.

### Affected files and regression tests

- D `packages/dataset-operations/src/operation-manager.ts`: operation guard and scoped-write rejection.
- D `packages/dataset-operations/src/types.ts`: unsupported restore documentation if needed; no new operation capability.
- D `packages/dataset-operations/tests/operation-manager.test.ts` or new `operation-security.test.ts`: real I-AM/ORM regressions.
- D `packages/dataset-operations/README.md`: explicit scoped-write limitation and unsupported restore.

Test restore against an existing row: failure, unchanged disk contents, no delete/beforeDelete/afterDelete invocation. Test arbitrary operation strings arriving over HTTP. Test scoped insert/update/delete for both in-scope and out-of-scope records: all rejected without mutation. Cover mixed batches, actor types, nested trigger writes, and multiple matching grants yielding a scope; denied nested writes must poison the root transaction under STAB-2. Preserve successful unscoped authorized CRUD, ordinary no-grant denial and existing query tests. Do not add general type validation or a new permission engine under B4.

## 8. Boundaries documented but not resolved

| Existing boundary | Recorded fact | Excluded decision/work |
| --- | --- | --- |
| P applied migration baseline | `packages/artifacts/src/application/json-provider.ts` and migrations service use `.uib/environments/<environment>/migration-state.json` | No replacement, synchronization or authority selection |
| D applied schema state | `packages/schema-application/src/index.ts` uses `environments/<environment>/schema-application/state.json`; resolver/verifier/activator remain interfaces | No activation, reload, schema-state migration, recovery service or durability redesign |
| Trigger publication | D TriggerManager owns file-backed versioned definitions | No publication-to-runtime bridge |
| Runtime trigger registration | D dataset-operations TriggerRegistry owns system registrations; P maps enabled registrations to artifact IDs | No second registry, scanning-based activation or changes to registration authority |

The missing complete DS0 plan and conditional WP1 acceptance conditions remain unknown. Baseline bug containment does not establish these architecture decisions or constitute DS0-WP2 readiness.

## 9. Validation and Windows failure accounting

After approved changes, run D build, typecheck, full tests and focused tests **in D**, using the agreed npm version and unchanged lockfile. Retain the eight original tests and add the regressions above. Then run P's schema compatibility test, build/typecheck, editor contracts and production-exclusion check to detect consumer regressions. No UI Base installation or feature-branch merge is included.

Preserve `P/docs/architecture/artifact-watcher-windows-rename-issue.md` unchanged. The preflight recorded Windows EPERM at watcher.test.ts:162 during directory rename, including outside the sandbox. If it recurs, report it by the same test/path/error as the existing issue. Do not skip the test, loosen assertions, add automatic retries, or mark the whole gate green. A different error, test failure or materially changed symptom is a new finding until diagnosed.

Separately record sandbox `uv_os_get_passwd`/ENOMEM and esbuild access-denied startup failures. The audit's unsandboxed retries resolved those, while the watcher remained failing. A justified retry may distinguish environment failures; preserve both results. Do not infer new baseline failures from an old report, or call a new unexplained failure the known watcher issue.

STAB-4 must list actual commands/versions/results, new test counts, known failures, changed files, before/after lockfile hashes and repository SHAs. A non-green platform gate may remain a documented limitation; it must never be reported as unconditional success.

## 10. Review decisions and stop condition

Approval is requested for this plan's concrete choices before execution:

1. npm **10.8.2** for STAB-0, invoked locally without changing global tools or the lockfile.
2. Explicit new checksum format and fail-closed handling of unverified legacy histories, with historical data left untouched and any migration separately approved.
3. Additive commit-outcome/unknown-count fields and corrected post-commit failure semantics; no automatic retries or claim of multi-file atomicity.
4. Temporarily reject all record-scoped writes as B4 containment; full scoped-write support remains a separate decision.

Today's completed work: baseline SHA/status verification, read-only source/contract inspection, hash recording and this repair plan. Commands used were Git rev-parse/status/diff, file reads/searches, Get-FileHash, node/npm version checks and dependency-directory existence inspection. No dependencies were installed and no tests were rerun today. No implementation, checksum rewrite, data migration, architecture resolution or WP2 work has begun.

**STOP: repair-plan review gate. Approval of stabilization must not be interpreted as approval to start DS0-WP2.**
