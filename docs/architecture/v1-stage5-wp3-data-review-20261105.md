# Data Services WP3 extension — separate review packet

**Prepared for independent maintainer review. Not a claim of independent reviewer acceptance.** Baseline `81b769eef3763d02343f5347888c26edab6ef7bc`; no commit/push. Only these Data files change:

- `packages/i-am/src/wp3/types.ts`
- `packages/i-am/src/wp3/graph.ts`
- `packages/i-am/src/wp3/service.ts`
- `packages/i-am/tests/wp3-template-contract.test.ts`

Exact SHA-256 hashes and disposable generated-output identities are in `evidence/v1-stage5-wp3-integration-20261105/data-changed-file-hashes.json` in the UI Platform review package. No original generated output, package installation, manifest or lockfile changes.

## API assessment

The optional `permitsTemplateRule` interface carries `SecurityRule`, the actual `SecurityGrantBoundary`, its permission entry and applicable assignment scope. `boundaryAllowsRule` requires a nonempty predicate-template ceiling and an affirmative full-rule validation for predicate-bearing rules. Missing configuration and expression-only callbacks fail closed. This intentional bounded change is the authorized replacement for the previously insufficient predicate callback; the old `permitsPredicate` member remains for source compatibility but is not an authorization fallback.

The optional `templateAuthority` configuration captures an owning binding at staging, asserts it inside serialized activation, and validates template-bearing boundary delegation using authenticated actor/current paths plus previous/proposed permission arrays and committed documents. Its synchronous assertion may return a lease; `activateBound` releases the lease after the policy transaction completes or rolls back. Service-local candidate stamps make restart/restaging behavior explicit. Text drafts cannot bypass the same activation binding.

The existing WP3 permission/operation ceilings, target ownership, no-self-escalation, last-administrator anchors and atomic administration audit still run. Host approval does not replace these checks or turn grantable permissions into usable permissions. No WP1 policy representation, WP2 evaluator, WP4 planner, predicate execution, delegation engine or bootstrap rule changes. Production identity startup guard remains in place.

## Verification assessment

The physical Data copy passes **151 tests across all seven I-AM test files**, including 24 focused extension cases and 39 existing WP3 cases. New cases cover exact deny activation and actual durable audit; full assignment context; allow/permission/application/Dataset/field/literal/operator refusals; explicit Platform delegation versus unauthorized minting; empty/unknown ceilings; staging/activation schema/owner/registry/revocation checks; a change after the final asynchronous identity check; competing activation at one revision; lease release after refusal/audit rollback; unconfigured/legacy adapter refusal; and unchanged non-template activation.

`wp3-activation-observations.json` contains actual SQLite staging/activation/audit outcomes from isolated Data test identities and synchronous host-binding fixtures. These focused fixtures establish the WP3 contract, not real inventory ownership. An earlier diagnostic Platform browser run exercised the actual inventory schema/field binding, protected management actions, Viewer row/field behavior and cross-process revocation. **The final uninstrumented Platform journey failed with HTTP 403 during Viewer-policy activation; overall integration is blocked.** Diagnostic success does not supersede that failure. No refused row policy is directly seeded into that journey.

The production host adapter uses actual owner state, keeps registry/owner SQLite reservations through commit, and detects semantic owner changes while tolerating WAL checkpoints. The direct compiled-contract/owner-lock tests verify missing-context refusal and that owner writes are blocked until lease release. These are bounded local checks; production schema-writer coordination, identity initialization and OS isolation remain outside acceptance.

Reviewers should confirm the four-file scope and source hashes, host-lease release paths, before/after rule checks, delegation-path inputs, restart/restaging behavior and preserved legacy diagnostics. The final Platform review matrix retains all production qualifications and the separate Windows ZIP packaging limitation.
