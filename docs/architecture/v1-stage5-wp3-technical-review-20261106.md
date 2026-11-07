# Stage 5 WP3 technical review — local Windows V1

**Technical review complete for the current bounded four-file candidate. One blocking integrity finding was demonstrated, corrected and verified. Independent-maintainer approval is not satisfied.** No individual maintainer is designated. The owner explicitly authorized this technical review and reserved any change to the independent-approval requirement for a separate decision. This report does not approve staging, commits, pushes, local integration acceptance or production use.

Data baseline: `81b769eef3763d02343f5347888c26edab6ef7bc`. UI baseline: `d3729a13c8312d35be4fe61b784f84f9e3bd4446`. Review scope remains exactly:

- `packages/i-am/src/wp3/types.ts`
- `packages/i-am/src/wp3/graph.ts`
- `packages/i-am/src/wp3/service.ts`
- `packages/i-am/tests/wp3-template-contract.test.ts`

Current and baseline SHA-256 identities are in `evidence/v1-stage5-local-scope-20261106/data-review-hashes.json`. Prior review packets and evidence remain historical and unchanged. Current scope is [local Windows V1](v1-stage5-local-development-scope-review-gate-20261106.md); Ubuntu/Caddy/cloud/production host preparation does not gate this technical review.

## Verified finding and bounded correction

**R1 — committed template activation could be falsely reported rejected after cleanup failure.** `activateBound` returned the store action inside a `try/finally`; a throwing template-lease `release()` escaped after commit. The outer handler converted that exception into `ADMIN_AUTHORITY_UNAVAILABLE` with status rejected, even though the policy and audit were durable. This is a truthful-outcome defect; it can mislead clients about authority changes. It was not established as the cause of any historical intermittent refusal.

`wp3-review-before` ran an additional regression only in the copied Data test module. **151 existing tests passed and the new test failed.** Its observed result was rejected, while the store revision was **2**, the administration audit count was **1**, and the candidate's durable result was **activated at revision 2**. The regression source is preserved unchanged across before/after runs.

The correction remains inside WP3 `service.ts`. Cleanup exceptions no longer override the policy transaction's committed or rolled-back outcome. A fixed, payload-free `WP3_TEMPLATE_LEASE_RELEASE_FAILED` warning is emitted. The service instance marks template lease state faulted and refuses subsequent template activations until the owner/service is reinitialized. Ordinary non-template activation retains its existing checks and behavior. No grant, identity, predicate, timing, replay or transaction rule was relaxed; no public activation result shape was changed.

Regressions verify committed result equals durable candidate result, audit/revision truth, lease release attempt, later template refusal, ordinary non-template compatibility, and failed-audit rollback followed by fail-closed template retry. A cleanup failure after rollback still reports rejection and leaves revision/audit unchanged. The correction does not automatically restart a service or recover a lock.

`wp3-review-after` passed **154 Data tests and 13 relevant Stage 5 tests**, including the original review regression. `wp3-review-final` added text/restart/capture coverage and passed **157 Data tests and 13 Stage 5 tests**. The Data count is the existing 151, five added source regressions, plus the identical appended review reproducer. This is focused technical evidence, not a passing complete application journey.

## Contract and boundary assessment

| Area | Reviewed behavior / evidence |
| --- | --- |
| Predicate grant ceiling | Predicate-bearing rules require a nonempty admitted template ceiling and affirmative full-rule callback. Expression-only legacy callbacks provide no fallback. Rule effect, permission, scope, assignment scope, boundary and template binding remain available to the owning validator. Missing configuration fails closed. |
| Delegation and ownership | Template-bearing grant-boundary changes require explicit owner approval using authenticated actor/current administrative paths and previous/proposed boundary state. Existing operation/permission ceilings, no self-escalation, target ownership and last-administrator anchors remain. |
| Stage versus authority | Draft creation does not activate policy. Candidate stamps are service-instance-local. Activation remains bound to candidate checksum, expected policy revision, authenticated actor and current owner assertion inside the store's serialized transaction. |
| Text/CLI compatibility | New tests verify text staging uses the same bound authority; malformed text never activates. A valid draft left behind by failed owner capture remains unstamped and cannot activate even if owner health later recovers. Existing administrative CLI and original non-template cases remain covered. |
| Restart/restaging | New test reconstructs the administration service, verifies an old unstamped candidate refuses, then explicitly restages the same request and verifies authorized activation. Restart does not reconstruct usable binding authority implicitly. |
| Transaction/lease lifetime | Owner lease spans serialized checks and policy commit/rollback. Audit failure rolls policy back and release is attempted. R1 fixes cleanup outcome translation and adds conservative instance-level refusal after an uncertain release. |
| Identity and policy freshness | Existing identity rechecks, policy revision conflict, owner/schema/registry/revocation checks and final synchronous binding assertion remain. Existing evaluator/planner algorithms and proof budgets are unchanged. |
| Legacy behavior and production guard | Non-template administration remains covered. Existing production identity startup refusal is retained. Local development fixtures remain explicitly local; they grant no production bypass. |
| Integration dependencies | UI finite-template host must provide real schema/owner/registry binding and lease callbacks. UI cannot claim the extension works against the unchanged Data baseline. Source checkpoints must identify the accepted Data revision and rebuild from it; disposable generated builds are not original source changes. |

No additional blocking defect was identified in the reviewed four-file candidate after R1's correction. This statement is bounded to source review and recorded regressions; actual local application reliability is still blocked by independent runtime failures. It does not certify all possible failure modes or replace the existing independent approval gate.

## Independent approval: necessity and practical process

Independent maintainer approval is a governance/ownership safeguard for a cross-repository authorization change. It is not a technical prerequisite for continuing already-authorized local implementation and isolated tests. Production-host availability is unrelated to it. No designated reviewer currently exists, so treating absence of a reviewer as an indefinite development freeze would not advance local V1.

**Recommendation for the owner's decision:** use a bounded owner-approved local review gate, while retaining independent review before future production use or broader dependency distribution. Proposed decision text:

> For the current local Windows V1 milestone only, the owner may accept the exact four-file WP3 candidate after the documented technical review, passing WP3/security regressions, review of its exact hashes and explicit owner acceptance of the local contract. Independent Data Services maintainer approval remains required before production deployment or broader distribution. This does not accept failed application integration, waive security contracts, approve additional stages or authorize Git writes.

**This proposal is not in effect.** Until the owner decides, the existing independent-maintainer requirement remains unsatisfied. A second practical option is to name an independent reviewer for this exact packet; no reviewer was contacted or impersonated here. Development and targeted verification can continue under the existing authorization while that decision is pending. Any later checkpoint still needs separate Git authorization.

Local acceptance should therefore have three explicit records: technical review outcome, owner's decision on the local approval process, and actual local integration results. None substitutes for another. The current technical candidate has verified focused results; the local integration record remains failing, and the approval-process decision is pending.
