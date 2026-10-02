# I-AM WP2 implementation and acceptance record

**Gate result: READY FOR WP2 ACCEPTANCE — WP3 NOT AUTHORIZED.** Recorded 2026-10-02. WP1 was formally accepted for this work. WP0 D1–D7, including the platform-level trusted recovery capability and platform/application/Blueprint ownership rules, remain controlling. This record covers the authorization evaluator only.

## Source state

| Repository | Reviewed HEAD | Uncommitted changes at this gate |
| --- | --- | --- |
| UI Platform | `152a65be1f91c66ecf08c8ad5b07f1c52ab389b0` | This WP2 acceptance record only. No UI runtime or DOE source changed. |
| UI Platform Data Services | `4445c06cd67ca07c78038419b34ce2bdf6c37191` | `packages/i-am/src/wp1/store.ts` atomic active snapshot read; new WP2 types, evaluator, export adapter and README under `packages/i-am/src/wp2/`; additive `./evaluator` package export; `packages/i-am/tests/wp2-evaluator.test.ts`. No existing package-root evaluator or DOE code changed. |

The new `@ui-platform/i-am/evaluator` entry consumes WP1 `SecurityDocument` definitions. It requires a host-supplied authenticated context boundary, attested request boundary, permanent-ID resource authority, trusted fact provider, and separate explanation authorization. These are explicit dependencies, not WP2 implementations of production authentication or the WP4 owner registry.

## W2 acceptance matrix

| Case | Result | Concrete evidence |
| --- | --- | --- |
| W2-01 | **PASS** | `SecurityAuthorizationEvaluator` defaults to `NO_APPLICABLE_ALLOW`. It evaluates all applicable rules per cell and gives explicit DENY precedence across Role/Group paths; a salary-field DENY, expressed either as a field list or as a Field resource scope, overrides a broad Dataset ALLOW. Reversed definition ordering gives the same result. `wp2-evaluator.test.ts` W2-01. |
| W2-02 | **PASS** | Transitive set traversal retains all six paths in a two-Role/one-Group diamond while deduplicating the effective rule ID. A Group DENY remains visible beside the ALLOW paths in a privileged explanation. Ordinary `authorize` and unauthorized `explain` omit rule IDs/provenance. W2-02 test. |
| W2-03 | **PASS** | User, Service, Role, Group, Set, Role assignment, Group membership and Service assignment lifecycle/date checks remove access without deleting source records. Start is inclusive, end exclusive; future and expired assignment cases are covered. The trusted clock is injectable. W2-03 and Service tests. |
| W2-04 | **PASS** | Exact permanent resource refs and trusted parent chains are checked. Application scope reaches supported Dataset targets; Dataset scope and assignment scope do not reach siblings, parents, or another application. An invalid parent relationship denies. W2-04 test. Full owner-registry binding is deferred to WP4. |
| W2-05 | **PASS** | Each requested row/field cell separately unions ALLOWs and subtracts matching DENYs. A bounded X/Y/D truth table prevents the A-on-X/B-on-Y cross-product, checks conditional DENY, and gives the same answer for all six rule-order permutations. Unattested missing records remain conditional and cannot yield an operation ALLOW. A relevant exact Record scope without a trusted binding denies, rather than silently dropping the scoped DENY. W2-05 test. |
| W2-06 | **PASS** | The evaluator validates every active WP1 document and the complete graph before use. Store failure, malformed/unsupported rule, cyclic graph, missing principal/Permission/fact, unknown resource/field, and empty `canAny` all deny. Expected faults use bounded reason codes; unexpected authority errors are redacted. W2-06 test. |
| W2-07 | **PASS** | Decisions bind principal, permanent resource, Permission, operation, requested fields and record snapshots in a canonical request digest. The stamp carries policy, principal, session, resource and fact revisions, evaluation time and a bounded expiry. `assertCurrent` rejects forged/modified or expired decisions, a different request, changed revisions or a newly denied request and re-evaluates against the authority. W2-07 test. |

The test file also activates real WP1 definitions through `SecurityDefinitionService` and verifies the evaluator's atomic WP1 store adapter. A Service can access only through an effective Service assignment; an unknown identity has no System bypass. Privileged explanations include assignment, Role/Group/set path, rule effect, matching cell, scope and exclusion reason. The evaluator retains no authority cache.

## Contract detail for gate review

WP0's proposal sketched `assertCurrent(decision, context)`. That signature can check the context and revisions, but cannot itself prove that a later resource, Permission, field list or record snapshot is the one originally evaluated. WP2 therefore exposes `assertCurrent(decision, request)` with the *attested exact request*. It compares the canonical digest and re-evaluates. This is an explicit safety refinement of the proposed signature, not a new security model; review it at this gate before a DOE consumer depends on it. The rationale and host obligations are in `packages/i-am/src/wp2/README.md`.

The WP2 decision returns `effect`, `conditional`, reason, stamp, digest and per-cell outcomes. It deliberately does not return a completed Dataset ORM enforcement plan: conditional query access without attested records remains a DENY with `CONDITIONAL_EVALUATION_REQUIRED`. WP4 must qualify resource/field bindings and query-expression compilation; WP5 must enforce query filtering, field projection, writes and final payload reauthorization. `can()` and `canAny()` are probes only.

An exact Record-resource scope requires a trusted permanent Record ref. WP2 does not synthesize one from a Dataset row key; a Dataset request encountering a relevant Record scope denies with `RECORD_BINDING_UNAVAILABLE`, even if a broader ALLOW exists. WP4's authoritative resource registration must supply that binding for later Dataset-wide enforcement. A Dataset request with no field selection likewise denies when a field-specific DENY could apply.

## Verification and compatibility

- Data Services `npm run build` and `npm run typecheck` passed. The final full `npm test -- --maxWorkers=1` run, after the Field/Record scope correction, passed **23 files / 656 tests**, including WP1, WP2 and unchanged DOE compatibility tests. A separate focused I-AM regression run passed **3 files / 72 tests**; the final WP2-only run passed **9/9** with all six bounded rule-order permutations.
- UI Platform `npm run build` and `npm run typecheck` passed. The intended suite `npm test -- --maxWorkers=1 --exclude '.uib/**'` passed **30 files / 186 tests**. The exclusion is for preexisting `.uib` scratch copies, as recorded at WP1. A strict external TypeScript consumer compiled the new package subpath and a runtime import resolved it.
- Concurrent broad-suite attempts each had one unrelated timeout: Data Services `schema-application/resolver` and UI Platform `artifacts/consumer-contract`. Both cases passed immediately in isolation; both full suites subsequently passed when run separately. No production behavior or timeout setting was changed to hide those failures.
- One automatic permission review timed out before a focused test command began; the authorized retry ran and passed.
- `git diff --check` is clean. All work remains uncommitted for review.

WP2 is a decision engine, not production security certification. The WP1 SQLite adapter is a single-host development authority; complete protected production administration, D6 recovery and last-admin enforcement remain WP3, authoritative Dataset/Field registration and plans WP4, DOE enforcement WP5, delegated Service execution WP6, and production credentials/session and cross-process revocation WP7. WP8/WP9 remain untouched. **Stop at this acceptance gate.**
