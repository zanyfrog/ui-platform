# DS0-WP2 G5 acceptance and local commit record

**ACCEPTED by the user for the explicitly bounded development-checkout scope.** This records the approval following the [R4 G5 report](ds0-wp2-r4-consolidated-g5-report.md); it does not rewrite that report's historical awaiting-acceptance wording or its evidence.

## Accepted capabilities

Acceptance covers verified canonical first activation; independently observed ORM/schema qualification; controlled cooperative ownership and admission; authorized pre-admission health; authorized CRUD through the ordinary admitted listener after verified serving; same-version clean restart; narrowly guarded before/next journal reconciliation and supported same-pin resume/restart; and the report's C1–C12 conclusions and limitations.

Accepted execution evidence remains Data Services build/typecheck/strict compilation and **616 tests**, plus UI Platform compatibility **12 tests**, typecheck, production and the **standard editor-contract command with 103 tests**. The earlier two standard editor-command failures remain failures. Their serialized diagnostic pass is not an equivalent standard-command pass, and the fresh R4 standard pass does not close intermittent editor/watcher defects. No test rerun was necessary for this unchanged-source acceptance/commit review.

## Verified existing local commits

| Repository | Commit | Parent | Exact committed scope |
| --- | --- | --- | --- |
| Data Services | `b5c1466c2825c76a36ea78f986192fefd4f3569b` | `8b988af80ca5ce859a84791e4d63de5d00119a3b` | One file: `packages/dataset-operations/tests/activation-http.test.ts`; only the accepted C2 addition. |
| UI Platform | `5413c6201e8129a848c8d80b924ba609601e5b8c` | `6e790b7acc9c7141d426ddfec4a8538709c26323` | 29 documentation/evidence files: R3 acceptance record, R4 G5 report and 27 R4 evidence files. |

Both commits existed before this acceptance-record operation. Their exact changed-path sets were verified; no duplicate commit or amendment was created. The Data Services test checkout SHA-256 remains `04B74ACD584C9078AA7231C4F3236634DD12242F5B5A7571F8D833D84148FDB1`. Its original accepted test contents remain an exact byte prefix.

[Commit verification and complete file inventory](evidence/ds0-wp2-r4/g5-commit-verification.json) records each committed file's path, Git blob ID, committed-blob SHA-256 and checkout SHA-256. These distinguish Git-normalized line endings from raw working-file bytes. It also verifies all 94 current Data Services baseline files, the protected evidence/report hashes and all three dependency locks. No mismatch was found. Package versions, source interfaces and dependencies are unchanged. Historical STAB-2 raw-checkout-byte qualification remains unresolved.

This acceptance record and its verification JSON are the only new files for the final acceptance-record commit. The resulting commit SHA and its exact two-file inventory/hashes are recorded in the completion response; a commit cannot contain its own final SHA without a circular dependency. The earlier implementation/report inventories are permanently recorded in the linked JSON.

## Explicitly unresolved / non-certified

- `DS0-HTTP-QUERY-ERROR`.
- `DS0-APPLIED-VALIDATOR`.
- Intermittent UI Platform consumer timeout/cleanup failures.
- Windows watcher `EPERM`.
- Non-atomic multi-file ORM persistence.
- Lack of writer fencing and power-loss durability guarantees.
- Stale owner/state-lock operator recovery; separate operator authorization remains required.
- Legacy/external deployment certification.
- UI Platform/Data Services applied-state authority integration.
- Published-trigger/runtime-registration integration.
- Full record-scoped authorization.
- Schema upgrades and physical migrations.
- Production hosting/security/audit readiness.
- Historical STAB-2 raw-checkout-byte qualification.
- Missing original DS0 plan/formal WP1 conditions.

## Stop boundary

Only local acceptance/commit recording is authorized here. No production fixes, validator refactor, trigger behavior change, new work package, scope expansion, push, release, deployment or migration was performed. **STOP after recording this acceptance and its commit evidence; wait for explicit authorization for the next milestone.**
