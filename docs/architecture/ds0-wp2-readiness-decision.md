# Proposed DS0-WP2 readiness decision

September 28, 2026. **PROPOSED: HOLD WP2 IMPLEMENTATION AUTHORIZATION.** Separate from [STAB-4 consolidated acceptance](ds0-stab-4-consolidated-acceptance-report.md); awaiting owner review, not an authorization or a recovered historical plan.

## 1. What is ready

The recorded D checkout `9a6f0d5623863a8d44b879eda08316b0e3c79571` and P checkout `61ef52556db69813e11ffbc387e133232005494a` pass the consolidated scoped checks. B1 provisioning, B2 canonical integrity/legacy containment, B3 transaction-result correctness and B4 DOE/I-AM write containment are accepted for their documented scopes. Their repaired interfaces and regression fixtures provide a usable development baseline for a subsequently approved work package.

This removes those specific baseline defects as prerequisites. It does not settle the definition of WP2, runtime integration, applied-state authority, durability guarantees, trigger activation or existing deployment compatibility.

## 2. Why implementation authorization should remain on hold

The recovered September 26 decisions establish provisional objectives: runtime activation/reload verification, safe recovery, and stronger durability/concurrency testing. They do not establish a complete DS0 plan or all WP1 conditional acceptance requirements. Later user gates expressly prohibit beginning WP2; the earlier recovered authorization is not treated as overriding these gates.

Current schema-application code implements state persistence and transitions. AppliedSchemaResolver, OrmSchemaVerifier and RuntimeSchemaActivator are interfaces, with activation reserved for a future service. No actual verified-definition→applied-state→ORM→DOE reload→health-check path exists to certify. That absence is planned functionality, not a new stabilization regression. Passing P migration/deployment tests demonstrates P's separate contracts, not integration with D's applied-schema state.

## 3. Decisions and evidence required before a bounded WP2 authorization

The following are proposed decision gates, not invented historical requirements. The project owner must approve or replace them explicitly. References U1–U12 resolve to the [issues register](ds0-stab-4-unresolved-issues.md).

| Gate | Exact decision needed before implementation | Reviewable evidence/artifact needed |
| --- | --- | --- |
| W1 — scope and WP1 baseline | Recover the complete approved DS0 plan and conditional WP1 obligations, or approve a replacement scope with clear provenance. State whether the three recovered objectives are exhaustive and name deliverables, exclusions and acceptance authority. | A versioned scope/acceptance matrix, linked conversation/plan evidence or explicit new owner decisions. Do not substitute Form Builder WP1A. U6. |
| W2 — applied-state ownership | Decide which component owns physical schema state, migration ledger, verified-pending-activation and applied promotion; define interaction rather than assume one store wins. | State-transition/ownership table, environment/dataset identity mapping, conflict examples, and approved coexistence/bridge contract preserving current records. U4. |
| W3 — verified identity and runtime contract | Decide resolver/verifier/activator responsibilities and how unqualified persisted references interact with canonical-json-v1 without undoing A8's deferral. Define runtime bootstrap, reload acknowledgment, health-check success and version pinning. | API/sequence proposal, explicit trust/identity checks and stale/legacy/error outcomes; exact service roots and test topology. A separate approval is needed if persisted identities must change. U7/U10/U12. |
| W4 — recovery/durability boundary | Approve supported crash/I/O/concurrency model, recovery authority and operator workflow. Decide whether initial work is bounded to isolated single-writer synthetic stores or needs separately scoped storage/fencing changes. | Failure matrix for before/after state writes, publication interruption, partial ORM commit, lost acknowledgment, stale lock, restart and competing writers; expected observable outcomes and no-blind-retry policy. U1/U12. |
| W5 — trigger scope | Include publication-to-runtime trigger activation with an approved bridge, or explicitly defer it and limit WP2 claims to the chosen schema path. | Registration/handler/version ownership and failure ordering if included; written exclusion if deferred. Central TriggerRegistry remains the authority. U5. |
| W6 — availability and Windows limitations | Decide whether valid scoped writes remain disabled for WP2 and whether its activation path depends on unresolved Windows directory moves. | Explicit unscoped synthetic-fixture constraints or a separate scope-evaluator proposal; watcher limitation acceptance or separate investigation plan tied to the chosen path. No policy widening workaround. U3/U8/U9. |
| W7 — deployment exclusion | Confirm development-only work against fresh synthetic roots, with no deployment/migration/release, or separately authorize an operational readiness project. | For any real-store work, current absolute-root/consumer inventory, legacy policy, writer coordination, recoverable backup procedure and release proposal are required first. The dated local zero-store inventory is insufficient for external deployments. U2/U11. |

No missing implementation must be completed secretly to satisfy these gates: the needed pre-authorization artifacts are requirements and design decisions. Once they are approved, the owner can authorize a bounded WP2 implementation plan. Features and their runtime tests belong in that authorized work, not in STAB-4.

## 4. Proposed future implementation/acceptance evidence, subject to approval

Recommended sequencing after W1–W7 decisions: contract/state-authority review → isolated verifier/resolver/runtime-activation implementation → recovery and failure injection → durability/concurrency verification → independent acceptance. This sequence is a proposal, not a DS0 work-package renumbering or current authorization.

Acceptance evidence should demonstrate actual verified schema consumption and runtime behavior, including:

- Known canonical publication and permanent identity resolved against the selected environment's approved applied-state authority; legacy/ambiguous/stale inputs reject without unauthorized changes.
- Real ORM/runtime definition verification, reload completion and meaningful health checks before an applied promotion; failed verification/reload/health cannot advertise an applied version.
- Interrupted transitions, partial persistence and uncertain commits remain observable and gated; approved recovery does not replay original writes based only on false booleans or relabel unverified history.
- Restart/lock/contention tests exercise the promised failure model on the target filesystem and topology. Single-writer limitations must be stated if writer fencing is excluded.
- If triggers are included, the approved version/registration/handler sequence is exercised through real invocation; if excluded, no trigger activation claim is made.
- STAB-1 through STAB-3 regression evidence, byte-preservation controls, unchanged journal/hash domains and agreed consumer compatibility remain intact; exact tests and overlaps are recorded.

These criteria require owner approval as part of the complete plan; they are not presented as recovered formal WP1 acceptance criteria. No test has yet proven the above combined WP2 path.

## 5. Review choice and stop

Recommended decisions now: accept STAB-4's consolidated development evidence with its issue register; retain B1–B4 scoped closures; **do not authorize WP2 implementation yet**. If further work is desired, separately authorize only the requirements/architecture reconciliation needed to make W1–W7 concrete. No deployment, legacy conversion, package release or source repair is bundled into that recommendation.

**STOP: STAB-4 review gate.** This proposed readiness decision is advisory until reviewed. No WP2 implementation or unrelated repair has started.
