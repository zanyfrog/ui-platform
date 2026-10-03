# I-AM WP4 implementation and acceptance record

Date: 2026-10-03 (America/New_York). Scope: WP4 only. WP5 is not authorized.

## Repositories and change state

- UI Platform HEAD: `cd361d37b8a8ba85ae169fa18144e14a83bf9074`.
- UI Platform Data Services HEAD: `b90d5ad1117c5226a967e7b2744b7bee4ffbde78`. HEAD moved from accepted-WP3 commit `7b8c241917bea20aae20fd10f76d0251e3e62fb7` to a WP4 commit during this work. This pass issued no commit, push, release, production migration or deployment.
- UI Platform has this uncommitted acceptance record only. The Data Services HEAD contains the initial WP4 implementation in `packages/schema-manager`, `packages/schema-application` and `packages/i-am` (`wp2` and new `wp4`). Remaining uncommitted follow-up edits are `packages/i-am/src/wp3/{service,types}.ts`, `packages/i-am/src/wp4/{README.md,index.ts,plan.ts,references.ts}`, `packages/i-am/tests/{wp3-administration.test.ts,wp4-plan.test.ts}` and `packages/schema-application/tests/resource-registry.test.ts`.
- The new I-AM external subpath is `@ui-platform/i-am/dataset-security`.

## Implemented contract

Schema Manager retains Dataset and Field permanent IDs in VDR-verified history and rejects reintroduction of a Field ID after its published retirement. Legacy drafts remain editable; VDR continues to block publication of unverified legacy history. The owner-side `AppliedResourceRegistry` records Application, Dataset and Field identity, status, aliases, parentage, revision and history. Application `appId` is immutable; changing its name changes only the alias. Dataset/Field registration requires an owner-authorized call and a verified applied serving schema. A stale, unapplied, wrong-namespace or changed schema binding fails closed. Dataset physical-key changes require explicit review. Retired IDs stay in history and cannot be reactivated or silently replaced by a same-name resource.

I-AM's read-only owner adapter supplies WP2's trusted resource ancestry and the WP4 plan compiler. The host supplies opaque request attestation, the same owner-backed resource authority to WP2 and WP4, an approved mapping from existing Permission IDs to Dataset operations and independent Field uses, and an unforgeable planner capability. WP2 remains the evaluator; WP4 consumes its full eligible-path and row/Field-cell evidence under that capability. Ordinary explanations remain redacted. Trusted facts become typed literals in a restricted, database-neutral predicate IR. The plan contains a verified applied binding, exact request digest, policy/principal/session/resource/fact stamp, per-row/per-Field allow and deny predicates, read projection and omissions, and final-write/count/pagination obligations. The host can call `assertCurrent(plan, request)` only on the service-issued plan and exact re-attested request; the planner rechecks WP2 evidence and the owner binding.

The query-intent walker checks every represented select, filter, sort, group and aggregate dependency. An unauthorized dependency rejects the plan. Join, computed projection, export, bare aggregate COUNT without a Field ID, unknown query nodes and unsupported security NOT fail closed. COUNT and EXISTS are independent Dataset operations and carry row restrictions. CREATE uses proposed state; UPDATE uses separate old and proposed-state evaluations; DELETE uses old state. Missing write state cannot become an unconditional grant. Every write plan requires a later final-write check. A representative test consumer demonstrates read omission while preserving allowed `null`; it is not production DOE enforcement.

`validateDatasetFieldReferences` provides an owner-backed preflight for policy publication. A WP4 host can inject it into the WP3 activation gate; bad references reject before activation. The resulting-graph and administrative checks still run in WP3. The existing transaction cannot atomically pin an independent owner-registry revision, so WP2 and WP4 recheck resources at use time. Offline legacy migration can reconcile a reviewed, VDR-verified owner mapping with current registry IDs; ambiguous aliases remain quarantined, and original migration input hashes remain evidence. No production cutover occurs.

## Canonical W4 matrix

The numbering and text below follow `docs/architecture/iam-wp0/acceptance-matrix.md`; the alternate W4-01–W4-11 labels in the WP4 request were reconciled into these six cases.

| Case | Status | Evidence |
| --- | --- | --- |
| W4-01 permanent rename/replacement/lifecycle | PASS | `schema-manager.test.ts` verifies Field rename, same-name fresh ID and retired-ID/rollback rejection. `resource-registry.test.ts` verifies Application alias rename, Dataset/Field rename, same-name Dataset/Field replacement, durable retirement history, and stale/unapplied binding rejection. |
| W4-02 authoritative hierarchy and ownership | PASS | `AppliedResourceRegistry` requires owner authorization and verified applied Schema Manager identity. `ownerResourceAdapter` rejects forged parent, foreign application and unsupported Record refs. Registry tests reject wrong app/parent and unexpected namespace. The WP4 reference preflight rejects unknown and wrong-owner IDs; WP3 activation-hook regression proves rejection before commit. |
| W4-03 Field read/write result semantics | PASS | `wp4-plan.test.ts` proves a denied Field is omitted from the plan's read projection while allowed `null` is retained by a test consumer; denied requested WRITE rejects the whole plan. Actual result projection and atomic DOE write enforcement remain WP5. |
| W4-04 query dependencies and inference | PASS | WP4 tests reject unauthorized filter, sort, group and aggregate uses, hidden aliases, unsupported join/computed/export, and empty READ projection. COUNT/EXISTS plans carry row predicates and explicit post-security count/pagination obligations. The recursive query walker rejects unknown nodes/operators. |
| W4-05 restricted expression and correlation | PASS | The compiler rejects NOT/unsupported inputs, substitutes trusted typed facts, and emits bounded restricted predicates. Table-driven reference tests cover typed equality, null, missing, two ALLOW branches and narrow DENY subtraction. Row/Field grant tests preserve separate row-specific cells instead of flattening them. |
| W4-06 new Field/capability semantics | PASS | A new Field receives a fresh ID. Dataset-wide grants apply to it only through explicit broad scope; an old Field-specific grant or DENY does not transfer by name. Retired Permission and missing catalog entries fail closed; deprecated lifecycle alone creates no right. |

## Verification

- Data Services: `npm run build` and `npm run typecheck` pass across all workspaces. Final `npx vitest run --maxWorkers=1`: **688/688 tests pass in 26 files**, including WP1, WP2, WP3, WP4, Schema Manager, applied-schema resolver, ORM and DOE compatibility suites.
- UI Platform: `npm run build` and `npm run typecheck` pass. Strict external TypeScript compile and Node import of `@ui-platform/i-am/dataset-security` pass. Security/schema/exporter/editor selection: 36/36 tests pass across five files.
- UI Platform broad maintained suite with ignored `.uib` scratch copies excluded: 29/30 files pass; one Artifact consumer test reached its own 30-second timeout under the full run, then passed 5/5 when run alone. Default discovery also includes incomplete ignored `.uib` scratch copies, which are not maintained source tests. The child-process ENOMEM error in sandboxed runs disappears when those tests run with normal child-process access. No production behavior was changed to mask these environment/fixture issues.
- `git diff --check` passes in both repositories.

## Limits and production restrictions

WP4 implements security **planning**. WP5 must make DOE enforce the plan before ORM access and prove projection, query rewriting, count/existence/pagination behavior, final-write authorization, atomic rejection and transaction rollback end to end. Direct ORM access remains trusted infrastructure only; ordinary application operations must go through DOE. No production data-security claim follows from a passing WP4 plan test. The current WP3 authority is development-only and production guarded. Record resource bindings are unresolved and fail closed. Future resource kinds need owner adapters. Aggregate statistical disclosure protection beyond explicit Field capability and row security is future hardening. A policy activation preflight may race an independent owner-registry update; evaluation and planning recheck current identity and revision before use.

**READY FOR WP4 ACCEPTANCE — WP5 NOT AUTHORIZED**
