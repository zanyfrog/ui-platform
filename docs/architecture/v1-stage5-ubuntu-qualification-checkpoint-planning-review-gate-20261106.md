# Stage 5 Ubuntu Qualification and Checkpoint Planning Review Gate

**PLANNING ONLY. Ubuntu host admission is blocked by missing designation/access authorization. The accumulated Stage 5 increment remains uncommitted and integration remains blocked. Stage 5 and overall V1 remain open.** No host connection/start, measurement campaign, Windows integration test, staging, commit or push occurred.

UI Platform `main` remains `d3729a13c8312d35be4fe61b784f84f9e3bd4446`; Data Services remains `81b769eef3763d02343f5347888c26edab6ef7bc`. The accepted Stage 4 checkpoint `56d8359` remains an ancestor of the UI baseline. The baseline already contains the accepted initial Stage 5 local checkpoint; this inventory describes the subsequent uncommitted work. Reference: [Planner Freshness and Clock Decision gate](v1-stage5-planner-freshness-clock-decision-review-gate-20261106.md).

Machine-readable outputs are under `evidence/v1-stage5-checkpoint-planning-20261106/`: `checkpoint-inventory.json` classifies exact paths/hashes/dispositions; `excluded-content.json` lists local-only roots and exclusion rules; `preservation-summary.json` records baseline/dependency/preservation checks; `changed-file-hashes.json` inventories current nonignored changed files and these new planning records, excluding itself. No existing implementation, test, prior evidence or dependency file was changed by this task.

## Ubuntu admission: missing inputs

The session and existing review records identify **no explicitly designated non-production Ubuntu 24.04 host and no authorized access identity**. Installed/access-capable WSL, VMs, containers, SSH clients or remote services do not supply that authorization. No such environment was enumerated, booted, connected to or treated as a target in this task. Host-dependent work stopped before access.

Required inputs are:

1. The owner's explicit designation of an **existing non-production Ubuntu 24.04 host**, with an unambiguous host identifier and environment owner.
2. The authorized access identity and connection method, permitted read-only commands/paths, and operator-controlled credential delivery. Credentials must not be added to this repository or ordinary review evidence.
3. Identification of the intended Node executable/build, or permission to inventory the installed executable without installing/replacing it. Its exact path/version/build identity and SHA-256 must be recorded.
4. Separate authorization for test execution: ephemeral peers, IPC/loopback channels, disposable test identities if needed, output location/custody, resource limits and process lifecycle. Restarting a probe is distinct from restarting an existing application/time service or host.
5. Explicit approval of the **30-minute campaign** and its scope. Planning approval is not execution approval. Existing service/host restarts, clock adjustments, time-service outages and sleep/resume tests need their own fault-test authority.

No Ubuntu inventory or clock measurements were performed. There are no new host-derived results in this package.

## Prepared read-only qualification plan

After admission and within the separately approved scope, inventory Ubuntu release/kernel, virtualization/container/time-namespace context, the intended Node/V8 binary/build and active time service/version. Inspect synchronization status, source health, uncertainty and recent adjustment metadata using only monitoring operations supported by the installed service. Do not install Chrony or infer the active service from another Ubuntu release. The preceding decision package links the Ubuntu 24.04 monitoring and pinned Node references.

Use the exact intended Node binary for independent peers. Record process start/boot identity, wall-clock samples, process-local monotonic samples and ordered send/receive timestamps. Keep observed ordered deltas distinct from exact simultaneous offsets; transport delay is included in positive deltas. Never compare independent monotonic origins as though they were a shared wall clock.

| Directed pair | Existing application relationship | Qualification channel constraint |
| --- | --- | --- |
| Runtime → Data | Protected runtime/asset requests and identity RPC | Approved isolated qualification copies; preserve current binding/admission checks. |
| Data → Runtime | Current-session status and authorized session operations | Clock measurement must not revoke real sessions or alter application state. |
| Management → Data | Protected management and identity RPC | Qualification operations require explicit test scope; inventory alone permits no policy writes. |
| Data → Management | Current-management-session status | Preserve independent service identity and current session/epoch checks. |
| Runtime → Management | No direct admitted production service path | Test-only clock peers on an isolated channel; do not add a production route, certificate admission or User grant. |
| Management → Runtime | No direct admitted production service path; management revocation is mediated by Data | Same test-only constraint; no new production trust edge. |

Proposed campaign, **not executed**: 30 minutes, peer starts at 0/3/11 seconds, all six directed comparisons, at least 10,000 ordered exchanges per direction and 1,000 samples within ±10 ms of whole-second boundaries per direction. If approved, add bounded ephemeral-peer restart observations and record each restart/sample cohort separately. An unmet quota is incomplete evidence; do not silently extend execution or restart existing services. Representative probe clocks alone do not prove the clocks of already-running application processes; a designated isolated application build is required for that additional claim.

Actual JWT outcomes must be measured using the pinned verifier and approved synthetic test credentials/audiences, separately from numeric clock comparisons. Retain zero future-`iat`, the original 15-second assertion lifetime, strict expiry/maximum age/`nbf`, replay protection, mTLS/request/application/release bindings and current identity/session/epoch/policy/resource/schema authority. No production credentials or private records are needed. Retain sanitized per-direction input identities, timestamps, verifier results and refusal codes; exclude tokens, cookies, private keys and raw credential/configuration dumps.

## Current security-policy recommendation

Retain the current strict policy and the existing recommendation to qualify zero tolerance on the actual Ubuntu target before considering a new time architecture. Clock-health admission is a **separate proposed contract**, not an implemented feature or a claim of current readiness. NTP status and passing samples cannot prove continuous exact peer agreement.

No future allowance, shared clock service, backdating, generic `clockTolerance`, new admission logic, longer evidence lifetime, increased proof budget/deadline, authority cache or write retry is authorized or implemented. The earlier 8 ms laboratory candidate remains unapproved. Shared-authority and future-only alternatives remain the separately approvable designs in the preceding review; Windows findings are not transferred into Ubuntu qualification.

## Unresolved local failure register

| Finding | Current attribution/status |
| --- | --- |
| Historical `PLAN_EVIDENCE_STALE` | Owning function is `SecurityAuthorizationEvaluator.assertPlannerCurrent`; original first comparison remains unknown. Controlled negatives distinguish 13 predicates; two later diagnostic journeys each recorded 98 allows and no stale rejection. They do not resolve the failure. |
| Unexpected private-metadata 403 | Original request's first denier remains untraced; later successful metadata reads do not establish its cause. |
| Fresh Viewer policy staging 403 | Last uninstrumented planner-package `journey-001`, journey line 139. First denier remains unknown; no retrospective clock/planner attribution. Earlier Viewer refusals remain distinct historical records. |
| Historical saved `field3` | First divergent operation remains unknown. The separate witnessed initial-field count/readiness error was corrected in the test helper; it does not explain the original persisted-definition discrepancy. |
| Clock availability | Windows process ordering and an actual 1 ms future-`iat` RPC refusal demonstrate local availability limitations. Ubuntu is unmeasured; no policy allowance follows. |
| Other Form/startup refusals | Prior untraced protected Form/service-start failures remain recorded independently of the precisely traced future-`iat` refusal. |
| Windows downloadable ZIP | Prepared-tree scans do not verify a downloadable archive. The exporter is unchanged and archive qualification remains open. |

No new compatibility tests were needed or executed for this inventory-only task.

## Checkpoint inventory and proposed structure

The inventory reconciles the preceding **610-entry manifest**, SHA-256 `76398e5b28b5a582f866190a8e41573591819a0802ec049ce1cfaf2523eeb9b7`, with **zero prior-file changes**. Its manifest itself is also retained. Every inventoried file has an exact repository-relative path, byte size, SHA-256, tracked-modified/untracked state, category, proposed checkpoint grouping and disposition. New planning metadata is identified separately so no prior review appears rewritten.

| Existing accumulated category | Files | Proposed treatment |
| --- | ---: | --- |
| Reviewed local implementation | 18 | UI runtime/integration, identity/management/private ownership/publication, single-sample RPC and owner-snapshot work. Bounded reviews are retained; integration/production remain unaccepted. |
| WP3 independent-review dependency | 4 | Separate Data Services review and later separately authorized repository checkpoint. |
| Test-only corrections/witnesses | 12 | Preserve permanent-ID checks, refusal expectations and isolated fixture boundaries. |
| Verification/recording harnesses | 17 | Separate tooling group; these scripts are not production entry points. |
| Experimental diagnostic harnesses | 4 | Keep visibly separate from production distribution; optional later tooling checkpoint after source review. |
| Existing review records | 10 | Preserve decisions and qualifications chronologically. |
| Sanitized review-evidence candidates | 535 | Include exact input identities, controlled negatives, preservation and sanitized refusal evidence; historical diagnostic-source/code-input blobs remain historical code. |
| Raw diagnostics proposed for exclusion | 11 | Local-only candidates listed by exact path; no deletion or historical hash rewrite. |

New planning records/tooling are additional to that table. Metadata inventories are explicitly identified in the machine-readable outputs and included in the final SHA inventory as appropriate; the hash inventory excludes only itself.

Recommended **future logical structure**, requiring a new Git authorization before any action:

- **A — Data WP3 dependency:** four-file maintainer review first, with an explicit acceptance outcome and eventual exact Data revision. No UI-only checkpoint may claim the new WP3 contract works against the unchanged Data baseline.
- **B — UI local implementation and tests:** capture the 18 UI source files and required tests as a local integration checkpoint, tied to the approved Data revision and retained dependencies. Label it as incomplete integration with the failure register, not a production release.
- **C — Verification tooling:** retain isolated-target verification/recording tools. Consider the four experimental diagnostics separately; exclude them from production packaging and preserve their diagnostic-only status.
- **D — Review/evidence/planning:** preserve the review chain, exact source identities, sanitized positive/negative evidence and this host-admission/checkpoint decision. Maintain the unresolved register and qualification matrix in the checkpoint description.

These are dependency groups, not proposed executed commits, a staging list or approval to split history. The exact file mapping is in `checkpoint-inventory.json`.

The 11 raw-log exclusion candidates include old full test output, build logs and graph metrics. Small `runtime-submit.txt` refusal evidence is retained in the sanitized-evidence category. **Historical manifests reference some proposed exclusions**: removing those files from a future checkpoint would make historical byte-level reconstruction incomplete unless a separately approved retained artifact location/custody is recorded. Resolve that choice at final content review; do not silently drop the files or rewrite old manifests. They remain untouched locally now. This package does not claim a final staging set is approved or self-contained after those exclusions.

Generated/disposable physical targets, credentials/certificates/tokens, databases, runtime/package copies, build output, caches, `.env`, local logs and Component `.uib` metadata must stay out of a future checkpoint. `excluded-content.json` records ignored attempt roots by directory name and Git-ignore decision only. It deliberately does not enumerate/read/hash generated credential bodies or the historical lock. No cleanup, deletion or movement occurred.

A scoped sensitive-content/extension scan over the nonignored inventory found no flagged private-key, bearer-cookie, provider-token or private/generated database/archive patterns. This is bounded inventory evidence, not a universal secrets audit or a substitute for final selective staging review.

## Independent Data Services review dependency

Only these Data files are uncommitted:

- `packages/i-am/src/wp3/types.ts`
- `packages/i-am/src/wp3/graph.ts`
- `packages/i-am/src/wp3/service.ts`
- `packages/i-am/tests/wp3-template-contract.test.ts`

Their exact current hashes are in the checkpoint inventory. [The separate Data review packet](v1-stage5-wp3-data-review-20261105.md) describes `permitsTemplateRule`, template authority capture/current-binding/lease behavior, delegation-path inputs, fail-closed legacy behavior, restart/restaging and transaction/release paths. Independent maintainer approval is still absent. Local tests and UI-owner authorization do not replace it. No WP2 evaluator/WP4 planner, Data dependency or new original generated-output change is included.

## Qualifications and preservation

| Item | Retained status |
| --- | --- |
| P1 | Actual Auth0/MFA/enrollment/provider lifecycle remains unqualified. |
| P2 | Stale/authority/revocation negatives verified historically; unresolved refusals, Windows timing availability and actual Ubuntu HTTPS/provider lifecycle remain blocked. |
| P3 | Local publication and permanent-ID witnesses retained; historical `field3`, real release/schema ownership, packaging/CSP and repeatability open. |
| P4 | Local process/filesystem/route/import evidence retained; Ubuntu accounts/ACLs/network/Caddy/credential custody unqualified. |
| A3 | Local private transport evidence retained; historical metadata 403, real asset ownership/storage and downloadable ZIP open. |
| I1 | Local provision/onboard retained; production identity/enrollment pending. |
| I2 | WP3 negative tests retained; Viewer staging refusal, independent Data review and production management qualification open. |
| I3 | Supported Builder and permanent-ID witnesses retained; original saved-field cause and production/shared-scope qualification open. |
| I4 | Diagnostic Viewer restrictions retained; fresh reliable complete execution and real identity/application/asset qualification open. |
| I5 | Diagnostic public/protected separation retained; target proxy/cache/site inventory and repeatability open. |
| I6 | Controlled stale/revision/revocation checks retained; unexplained failures, provider-only disable propagation and concurrent real owners open. |

All **23 Component files and 234 native package files** rehash correctly. UI-Base remains clean/read-only at `732eec58ca3d4bd2521197b9d3b6c0457dbc6608`. Dependency manifests match the preceding evidence; pinned security packages remain `jose 6.2.15`, `oauth4webapi 3.8.8`, `openid-client 6.8.9`, with recorded integrity values and no install hooks. Component admission and accepted global lock-recovery policy are unchanged. The original lock directory names/mtime remain unchanged; no lock body was accessed, acquired, reconstructed, repaired or recovered.

Local HEADs, empty staging areas and Stage 4 ancestry were queried read-only. No fetch, live remote query, Git synchronization or worktree cleanup occurred. No host creation/installation/boot/access, new infrastructure, Auth0 operation, purchase, production deployment, Stage 6/7 or backup/recovery execution occurred.

**Stop at this Ubuntu Qualification and Checkpoint Planning Review Gate.** Host designation/access and campaign scope are missing; final checkpoint content/review dependencies and all integration/production qualifications remain open. No Stage 5 acceptance, V1 closure, staging, commit or push is authorized or claimed.
