# Stage 5 local Windows development scope and review gate

**Current acceptance target: a functional, reliable UI Platform V1 in the existing local Windows environment.** Production deployment is a future milestone. Ubuntu availability/clock qualification, Caddy, cloud infrastructure and production-host preparation are removed as local acceptance prerequisites. No Ubuntu VM/WSL/remote/cloud resource will be created, installed, started or requested as part of current V1 work.

This owner direction supersedes the hosting prerequisites in earlier planning/review records. Their factual results and hashes remain historical evidence. Scope notices now appear in the current Technical Decisions, Implementation Sequence and Final Acceptance Matrix. No Stage 6/7 execution, staging, commit or push is authorized. Both baselines remain unchanged: UI `main` `d3729a13c8312d35be4fe61b784f84f9e3bd4446`; Data `81b769eef3763d02343f5347888c26edab6ef7bc`.

## Local requirements remain mandatory

I-AM/WP3 grant ceilings, explicit permissions, permanent identity/field/resource ownership, sessions/CSRF/epoch revocation, current authority, replay protection, release binding, data integrity and truthful commit outcomes remain required locally. Strict zero future-`iat`, the 15-second assertion lifetime, expiry/age/`nbf`, proof budgets and transport deadlines are unchanged. Local fixtures stay within their existing development boundary; production guards remain intact.

Local V1 is not accepted while required application scenarios fail. Failed integration tests, unknown commit outcomes and intermittent refusals are not converted into passes by this scope clarification. Future hosting work will not be used as a substitute for solving local defects.

## Work completed at this gate

- Completed the [four-file WP3 technical review](v1-stage5-wp3-technical-review-20261106.md), preserving the distinction from independent approval. Demonstrated and corrected a false rejected result after a durable commit when template cleanup throws. Added rollback, conservative template refusal, text candidate and restart/restaging regressions.
- Final focused verification passed **157 Data tests and 13 relevant Stage 5 security tests** in verified physical copies. Earlier before/after runs remain separate. No complete application acceptance is claimed from those focused results.
- Ran one hypothesis-driven local diagnostic intended to exercise 12 additional protected writes and capture exact planner/evaluation failures. It failed at the **initial protected read** before reaching those writes. This is a real local blocker, not a production-host qualification.
- Compared existing built-in clock readings in two short Windows experiments without changing any serving clock or security policy. This supports a local clock-source investigation; it does not implement or approve a clock authority or tolerance.

## Current Windows refusal and clock findings

The diagnostic's initial `/runtime/execute` query received HTTP 403. Its causal trace identifies Data **`ServiceRpcVerifier.authenticate` on `/identity/current`** rejecting a service assertion with `ERR_JWT_CLAIM_VALIDATION_FAILED`, claim `iat`, reason `check_failed`. The failure associated with the initial read records issue time **2 ms** ahead of the receiver wall-clock sample. Two earlier traced identity RPC rejections during management negative requests record **8 ms** and **7 ms** leads. They are distinct requests; those earlier expected HTTP refusals are not evidence that every intended negative check reached its deeper permission predicate.

The failing protected read's correlation ID is `dd5c84bc-6b08-4272-be3e-ec7467e51fd1`. The first rejected component and numeric claims are preserved in redacted request traces. The 12 extra Form probes were **not executed**. No new stale-plan predicate was observed; the historical `PLAN_EVIDENCE_STALE` remains unattributed to its exact comparison. The new WP3 cleanup defect is not claimed to explain these JWT or historical failures.

Two isolated five-second experiments compared `Date.now()` with SQLite's built-in time reading through existing Node `node:sqlite`, using only in-memory databases and ordered IPC:

| Experiment | Observation | Limit |
| --- | --- | --- |
| Initial, one measured direction | 170,370 exchanges; no negative Node or SQLite deltas; Node minimum +10 ms, SQLite minimum 0 ms | Positive Node delta includes scheduling/transport and possible clock offset; does not prove agreement or the reverse direction. |
| Bidirectional | 149,220 exchanges; child→parent Node deltas negative on every exchange, minimum **−9 ms**; reverse Node minimum **+8 ms**. SQLite had zero negative deltas in either direction, minimum 0 ms | Short exploratory sample, not a universal bound, production qualification or an application clock implementation. |

These are observed comparisons of existing local capabilities, not proof that SQLite should become the application clock. No service source, JWT `currentDate`, evaluator clock or token timestamp was replaced. The useful next hypothesis is **local Windows wall-clock source coherence** across issuers and verifiers under the unchanged security contract. A source design must verify precision, whole-second behavior, restarts, forward/backward adjustments, expiry/age/`nbf` and actual RPC outcomes before adoption. No hosting change or positive issue-time allowance is assumed necessary.

## Local failure register

| Finding | Local status / next evidence |
| --- | --- |
| WP3 false rejection after committed cleanup fault | Corrected candidate; deterministic before failure and focused after/negative tests pass. Independent approval remains distinct. |
| Actual identity RPC future-`iat` refusals | Current local reliability blocker. New request-specific 2/7/8 ms evidence and a 9 ms ordered Node discrepancy are retained. Next work should qualify a coherent local source without timing relaxation. |
| Historical `PLAN_EVIDENCE_STALE` | Exact first comparison remains unknown. Controlled negatives identify possible predicates; successful diagnostic rechecks do not resolve the historical failure. |
| Historical private-metadata 403 | First denier remains unknown; not relabeled as the newly traced identity RPC failure. |
| Fresh Viewer staging 403 | Earlier uninstrumented planner-package failure remains untraced and unresolved. |
| Historical saved `field3` | First divergent operation remains unknown. Permanent-ID witnesses and the separate readiness correction remain; no product Builder fix is claimed. |
| Other untraced Form/startup refusals | Retained separately; targeted new evidence is required before attribution. |
| Downloadable ZIP failure on Windows | Existing limitation remains. Prepared-tree/private-byte scans do not prove the archive. Assess the required local packaging criterion separately; no exporter change was made. |

## Technical review and approval process

No independent Data maintainer has been designated. The owner authorized thorough technical review but explicitly withheld any automatic waiver of independent approval. Technical review is complete for the corrected candidate; independent approval is **not complete**.

The review packet recommends an explicit owner decision allowing bounded technical review plus owner acceptance for **local Windows V1 only**, with independent review retained before future production use/broader distribution. That proposal is not effective until approved. Alternatively the owner can name an independent reviewer for the exact candidate. This governance decision need not freeze already-authorized development/testing, and it does not make failed local integration acceptable. No reviewer was contacted and no approval was fabricated.

## Dependency-ordered checkpoint candidates

`evidence/v1-stage5-local-scope-20261106/checkpoint-candidates.json` gives exact file paths and SHA-256 values. Order proposed for later separate Git authorization:

0. **Scope/decision records:** record Windows local acceptance and the future-production register. Preserve prior evidence and approval history.
1. **Data WP3 candidate:** the same four-file extension with the cleanup-outcome correction and five source regressions. Hold its approval status until the owner resolves the local review process or obtains independent approval. Record the eventual exact Data revision.
2. **UI local implementation and tests:** tie integration code to that Data revision and unchanged dependencies. Retain permanent-ID witnesses and all current refusal/security expectations. Label any progress checkpoint as incomplete local integration until actual reliability passes.
3. **Verification tooling:** isolate diagnostic/measurement harnesses from production packaging. Keep exact source variants used for each experiment.
4. **Sanitized evidence:** preserve before/after regression, transaction/audit proof, source inputs and the unresolved failure register. Resolve the prior 11 raw-log retention candidates explicitly because historical manifests reference them.

These are proposed dependency groups, not executed commits or a final approved staging set. Ignored physical copies, generated builds, runtime stores, test keys/certificates/tokens, raw credential/configuration dumps and Component `.uib` metadata remain excluded. No cleanup or history rewrite occurred.

## Local acceptance versus future production qualification

| Item | Required for local Windows V1 / current status | Future production qualification, not a local prerequisite |
| --- | --- | --- |
| P1 | Existing local identity/enrollment boundary, cryptographic tests, sessions and explicit I-AM Users; retained | Real Auth0 tenant/plan/MFA/provider lifecycle and credentials |
| P2 | Current session/epoch and request verification, truthful failures, reliable honest requests; **blocked by actual local refusals** | Public HTTPS/Caddy, provider lifecycle and deployed clock qualification |
| P3 | Frozen release A after draft B, exact schema/field identities, protected Forms/queries; diagnostic successes retained, complete reliability open | Production release/schema custody, distribution and target CSP qualification |
| P4 | Separate local service identities, route/import/storage boundaries and existing Windows process restrictions; retained | Ubuntu accounts/ACLs/firewall/Caddy/host installation/cloud resources |
| A3 | Private owner/version/hash, authorized metadata/bytes/range/HEAD, no public export leakage; historical 403 unresolved | Production storage isolation, asset custody and deployed cache behavior |
| I1 | Local provision/onboard and explicit grants; retained | Real provider enrollment/operations |
| I2 | Current WP3 stage/activate/revoke, ceilings, last-admin and durable audit; focused tests pass; approval decision/Viewer refusal open | Independent review before production under the proposed process, real management hosting |
| I3 | Supported local Builder Dataset/Form/Page flows and permanent-ID persistence; retained; historical discrepancy open | Production/shared-environment operations |
| I4 | Viewer row/field restrictions and denied writes; diagnostic evidence retained, reliable complete journey open | Real deployed identities/applications/assets |
| I5 | Local public/protected release separation and bypass refusals; retained, reliable complete journey open | Production proxy/cache/domain inventory |
| I6 | Local open-session role/epoch/User/template revocation and stale evidence refusal; focused negatives pass, historical/local failures open | Provider-only disable propagation and concurrent production owner processes |

No future-production row above is a current requirement to acquire or authorize infrastructure. No further development stage was begun. Local release/data-integrity/security criteria remain mandatory.

## Preservation and evidence

All prior checkpoint-planning evidence is preserved. Relative to its **616-entry** manifest, only the two reviewed Data source/test files change: `wp3/service.ts` and `wp3-template-contract.test.ts`. The three previously unchanged current planning documents gain explicit scope notices. UI production code, other Data source, original evaluator/planner, dependency identities and accepted Stage 1–4 implementation remain unchanged. New test/harness/review artifacts are separately inventoried.

All **23 Component files and 234 native package files** rehash correctly. UI-Base remains clean/read-only at `732eec58ca3d4bd2521197b9d3b6c0457dbc6608`. Completed runs retain equal shared snapshots and zero original lock-directory events. The expected failing Data reproducer stopped before UI tests/observer startup; original files were independently rehashed at completion. Historical lock safeguards remain directory-only: no body access, acquisition, reconstruction, repair or recovery.

Pinned security packages, integrity values and install-hook absence remain verified. No infrastructure/provider operation, production deployment, Stage 6/7, backup/recovery execution, security-policy relaxation, staging, commit or push occurred. Generated test credentials remain inside excluded disposable targets. Exact before/after source variants, test results, review hashes and preservation records are in this package's SHA inventory.

**Stop at the local Windows V1 scope and WP3 technical review gate.** The technical review/candidate correction is verified within its scope. Approval-process change awaits the owner's decision, and local V1 acceptance remains blocked by actual local application reliability findings—not by Ubuntu or production preparation.
