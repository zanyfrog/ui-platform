# Stage 5 WP3 Local Acceptance and Checkpoint Readiness Gate

**WP3 LOCAL ACCEPTANCE APPROVED by the project owner on November 6, 2026, for the exact four-file candidate below.** Documented technical review plus explicit owner acceptance satisfies the review requirement for this local Windows V1 milestone. No independent maintainer approval is claimed. Independent security/maintainer review remains required before future production deployment or broader distribution.

**Stage 5 integration and overall V1 remain open. No staging, commit, push or history change is authorized or performed.** This record supersedes the local approval-pending statements in the historical technical review and scope gate; their factual evidence and original hashes are preserved.

UI Platform remains on `main` at `d3729a13c8312d35be4fe61b784f84f9e3bd4446`. Data Services remains at `81b769eef3763d02343f5347888c26edab6ef7bc`. The accepted review is [WP3 technical review](v1-stage5-wp3-technical-review-20261106.md). The machine-readable owner decision, evidence reconciliation, exact staging inventories, content review and preservation checks are under `evidence/v1-stage5-wp3-local-acceptance-20261106/`.

## Exact accepted Data identities

| Data Services path | Accepted SHA-256 |
| --- | --- |
| `packages/i-am/src/wp3/types.ts` | `cf323e381c975a3c4b5b5b9bf8397e005c5f187466e6fabfafc30888ff329696` |
| `packages/i-am/src/wp3/graph.ts` | `d72cfb05151ce13950e1fa00e25e1028581588206074f2937463d950a2a26853` |
| `packages/i-am/src/wp3/service.ts` | `7099dd392621767e9af321cda8da892bda7020c6ed0a7aa92cf16dbbabe074a9` |
| `packages/i-am/tests/wp3-template-contract.test.ts` | `af20b640ef0cb7160bbbea03fdf7271654bd463c21a9a6ff08f146fa2588cc83` |

All four working files match these reviewed identities. No accepted WP3 source was modified in this task. Acceptance covers full-rule predicate-template/grant-boundary validation, transaction-bound staging/activation, current identity/policy/owner checks, restart/explicit restaging, non-template compatibility, truthful cleanup outcomes and conservative refusal after uncertain lease cleanup. Substantive later changes require appropriate review.

## Accepted regression evidence

The before reproducer recorded **151 existing Data tests passed and one added test failed**. Its caller received rejected/`ADMIN_AUTHORITY_UNAVAILABLE`, while the store had committed revision **2**, one administration audit entry and an activated durable candidate result. Cleanup had thrown after commit.

The accepted correction preserves the durable transaction outcome, emits a payload-free cleanup warning and disables subsequent template activation in that service instance after uncertain cleanup. Failed-audit rollback still leaves revision/audit unchanged; ordinary non-template behavior remains checked. Restart/restaging and text-candidate safeguards remain covered.

Final retained verification is **157 Data tests and 13 Stage 5 security tests passed**. The Data count comprises 156 cases from the accepted checked-in source plus one unchanged appended cleanup reproducer in the disposable copy. The copied pre-append test hash equals the accepted test hash above; tested `types.ts`, `graph.ts` and `service.ts` match their accepted hashes. The before/after observations and report identities are reconciled in `accepted-test-evidence.json`. No tests were rerun or new integration pass inferred in this acceptance-recording task.

**Remaining WP3-specific issues:** no known blocking contract defect remains in the accepted review scope. Cleanup-fault refusal until service/owner reinitialization is an explicitly accepted fail-closed behavior, not an unverified grant repair. The local review-process requirement is satisfied by this owner decision. Independent review remains a future production/distribution qualification. Passing WP3 tests do not establish reliable cross-process application integration.

## Exact dependency-ordered checkpoint candidates

**Data candidate — ready for separate Git authorization:** `data-staging-inventory.json` contains exactly the four accepted paths, byte sizes, current/baseline hashes and tracked/untracked state, against Data baseline `81b769eef3763d02343f5347888c26edab6ef7bc`. There are no Data manifest, lockfile, dependency, original generated-build, evaluator or planner changes in the candidate. No fifth file is proposed in Data Services.

**Dependent UI candidate — content-reviewed incomplete local integration checkpoint:** `ui-staging-inventory.json` lists every proposed path and group against UI baseline `d3729a13c8312d35be4fe61b784f84f9e3bd4446`. It includes accumulated local implementation/tests, scope/review records, verification/diagnostic tools and conservative historical evidence retention. It does not claim Stage 5 integration acceptance or a production release.

The proposed order is:

1. Separately authorize and create the exact Data four-file checkpoint.
2. Independently identify its resulting commit and bind the UI checkpoint record to that actual Data revision. No future commit SHA is invented here.
3. Separately authorize the exact dependent UI candidate, preserving unresolved integration status, local acceptance boundaries and exclusions.

These are future actions only. Git indices remain empty. Source hashes are pinned now; baseline ancestry, live remote state and selected staging contents must be independently rechecked when Git mutation is later authorized. No fetch or live remote query was performed in this task.

The UI inventory's `stagingPaths` is the complete proposed path membership. Ordinary items have SHA-256 values. Its two metadata members—its own inventory and `changed-file-hashes.json`—are explicitly identified to avoid circular self-hashes. The final hash manifest pins the UI inventory and all other changed files, excludes itself, and has its own SHA-256 reported separately. Neither staging inventory is an executed Git operation.

## Final content/security review

The scoped review checks every nonignored candidate file for private/generated extensions and credential/private-key/session-cookie/provider-token patterns. It reconciles all **680** prior inventory entries unchanged, verifies the exact accepted Data hashes, dependency identities and original evaluator/planner inputs, and inherits prior targeted masked-screenshot inspection through identical hashes. The content review is a bounded check, not a universal absence-of-secrets proof.

One UI checkpoint hygiene defect was identified and corrected: the existing default test discovery could pick up `evidence/v1-stage5-builder-save-20261106/diagnostic-source/original-stage5-integration.test.ts`, as well as disposable archived tests. `vite.config.ts` now adds only **`evidence/**`** to its test exclusions. Exact comparison with the baseline config confirms that sole change. Real `tests/` sources and selection remain unchanged. This keeps retained evidence as evidence rather than runnable application tests; it does not hide a required test failure. Validation here is a static exact-diff/path-scope check, not an executed suite pass.

Evidence/code-input archives are outside the configured application TypeScript include roots. Experimental diagnostics remain tooling/history and are excluded from production distribution. No temporary implementation trace helper is active in the application source. Source build configuration, runtime permissions, production identity guards, security timing policy, budgets, deadlines and write-retry behavior otherwise remain unchanged.

`final-content-review.json` records the result and limitations. Any content finding or source/hash change must invalidate this candidate and return for review; acceptance is not permission to adjust source during staging.

## Retention and exclusion choices

The exact candidate uses **conservative complete nonignored history**. It retains the prior 11 raw diagnostic files referenced by historical manifests, plus diagnostic harness/source records. This preserves byte-level evidence reconstruction and avoids silently breaking old hash references. The candidate does not require external storage or an archive operation to remain coherent.

For the owner's later Git decision:

- Recommended: authorize the conservative inventory with those existing hash-referenced logs retained. Their content is included in the scoped scan. The historical record remains large—approximately 25 MB before this small new decision package—but intact.
- Optional alternative: request a trimmed evidence candidate. Before omitting referenced files, approve a retained artifact location/custody and reconstruction mapping, preserving original hashes and explicitly recording any loss of self-containment. This alternative is not selected or executed here.
- Experimental harnesses may be retained as reviewed diagnostic source in Git while excluded from production packaging. Omitting them later requires checking evidence/source-input references and revising the proposed inventory explicitly.

Mandatory exclusions remain all ignored disposable runtime/package copies, temporary certificates/private keys/tokens, generated databases/builds, caches, `.env`, local logs and Component `.uib` metadata. `exclusions-and-retention.json` lists ignored attempt roots by name/Git-ignore decision only; their generated credential/store bodies were not read or hashed. Nothing was deleted, moved, staged or externally archived.

## Remaining local integration blockers

| Finding | Retained status |
| --- | --- |
| Cross-process future-`iat` rejections | Actual local Windows request failures remain. Recent traced `/identity/current` RPC refusals recorded 2/7/8 ms future claims; short independent Node comparisons observed up to 9 ms of ordered discrepancy. No tolerance or serving-clock change was implemented. |
| Historical `PLAN_EVIDENCE_STALE` | Owning evaluator function is known; the original first rejecting comparison remains unknown. Controlled negatives and later diagnostic successes do not resolve it. |
| Unexpected private-metadata 403 | Original first denier remains untraced. |
| Viewer staging refusals | Earlier fresh uninstrumented stage failure remains untraced; distinct from the newly accepted WP3 cleanup correction. |
| Historical saved `field3` and other Form/startup refusals | Separate witnesses and targeted evidence are retained; unproven original causes are not relabeled fixed. |
| Windows downloadable ZIP | Prepared-tree evidence does not prove a downloadable archive; the existing limitation remains for the relevant local packaging criterion. |

WP3 local acceptance does not accept any failed application scenario. Local V1 continues on existing Windows tooling and isolated targets with unchanged I-AM, permission, grant-ceiling, identity/session/epoch revocation, replay, data-integrity and authorization contracts. Ubuntu, Caddy, cloud hosting, live production provider configuration and production-host operations are future qualifications, not local development prerequisites.

## Preservation and stopping point

All **23 Component files and 234 native package files** rehash correctly. UI-Base remains clean/read-only at `732eec58ca3d4bd2521197b9d3b6c0457dbc6608`. Dependency manifests and pinned security identities/integrities/install-hook absence remain verified. Original Data evaluator source/generated evaluator/WP4 test identities remain unchanged. Stage 4 remains an ancestor of the UI baseline.

Original shared-lock safeguards remain directory-only: directory names/mtime are unchanged, and no historical lock body was read, acquired, reconstructed, repaired or recovered. No infrastructure/provider operation, new host, deployment, Stage 6/7, backup/recovery, security-policy relaxation or Git mutation occurred.

**Stop at this WP3 Local Acceptance and Checkpoint Readiness Gate. WP3 local acceptance is recorded; independent production/distribution review remains required. The proposed candidates await separate Git authorization. Stage 5 integration and overall V1 remain open.**
