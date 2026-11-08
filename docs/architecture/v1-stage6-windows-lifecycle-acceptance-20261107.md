# Stage 6 Windows Recovery and Lifecycle Acceptance

The project owner accepted and closed Windows Stage 6 with the qualifications below. The accepted scope is the physically isolated Windows lifecycle exercised through November 7, 2026. The tested candidate is identified by the source and evidence hashes in the proposed checkpoint inventory.

| Accepted capability | Evidence |
|---|---|
| Controller-owned A→B promotion, verified B serving, stale A-write refusal and a valid B operation | [Controlled run 002](../../evidence/v1-windows-controlled-promotion-20261107/verification-run-002.json) |
| Generic promotion refused before pointer mutation | [Run 002 guard regression](../../evidence/v1-windows-controlled-promotion-20261107/verification-run-002.json) |
| Failed-B exact-A recovery and uncertain recovery with admission closed | [Recovery journeys](../../evidence/v1-windows-stage6-recovery-20261107/verification.json) |
| Three-process restart with fresh audiences, real transaction drainage and persistence of an exact nonempty Dataset record | [Restart](../../evidence/v1-windows-stage6-lifecycle-20261107/verification.json), [drain and persistence](../../evidence/v1-windows-stage6-lifecycle-20261107/drain-verification.json) |
| Independent schema-state, publication and SQLite registry writer refusals before and after pointer promotion | [Live writer probes](../../evidence/v1-windows-stage6-lifecycle-20261107/writers-verification.json) |
| Supervisor, audience, approval and concurrent or duplicate request refusals, plus focused TLS, bundle, durable-reader and callback negatives | [Security verification](../../evidence/v1-windows-stage6-lifecycle-20261107/security-verification.json) |
| Compatible rollback to exact A, incompatible and unauthorized rollback refusals, and uncertain rollback remaining fail-closed | [Rollback journeys](../../evidence/v1-windows-stage6-lifecycle-20261107/rollback-verification.json) |

[Retained Data serving](../../evidence/v1-windows-retained-data-20261107/verification.json) and [durable A serving](../../evidence/v1-windows-durable-serving-20261107/verification.json) are predecessor witnesses. The [unsafe generic-promotion attempt](../../evidence/v1-windows-controlled-promotion-20261107/verification.json) remains a failed run. The drain and rollback records preserve separate artifact-lock preflight refusals before promotion. Deliberately injected verification failures in the recovery and rollback journeys are test conditions.

## Retained qualifications

1. Individual writer-lock release ordering was not separately instrumented.
2. TLS and served-bundle negative cases were covered by focused tests. Live deployment failures beyond those cases remain outside the demonstrated scope.
3. A pointer change during the live HTTPS verification probe was not separately exercised.
4. Incompatible rollback used a deliberately mismatched required schema identity without executing a schema migration.
5. The tests used physically isolated disposable Windows environments. Production deployment qualification is separate.

These qualifications are nonblocking for the accepted Windows milestone. Stage 7 backup, restore and audit require separate authorization. Overall UI Platform V1 remains open and unaccepted.

## Checkpoint boundary

The [proposed closure inventory](../../evidence/v1-windows-stage6-lifecycle-20261107/acceptance-checkpoint.json) lists the exact candidate in dependency order. Data Services is proposed first, followed by UI Platform. Git staging, commits and pushes require separate owner authorization.
