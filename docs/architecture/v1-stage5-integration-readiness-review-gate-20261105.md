# Stage 5 Integration-Readiness Review Gate — 2026-11-05

Historical checkpoint: the later WP3 extension authorization resolved this record's contract blocker. See [the current final review gate](v1-stage5-wp3-integration-final-review-gate-20261105.md). The evidence below retains its original bounded scope and does not represent the current integration outcome.

**BLOCKED / incomplete local integration. Not an acceptance recommendation. Stage 5 and overall V1 remain open.** Baseline: Platform `main` at `d3729a13c8312d35be4fe61b784f84f9e3bd4446`. No commit or push is authorized or performed.

## Decision required before continuation

The actual protected WP3 activation rejected the proposed Viewer policy with `ADMIN_GRANT_CEILING`. The rule denies reads of the inventory row whose permanent `name` field equals `Hidden`. `src/server/v1-security-administration.ts` deliberately implements `developmentSecurityScopes.permitsPredicate()` as `false`. Data Services `packages/i-am/src/wp3/graph.ts::boundaryAllowsRule` requires this owning scope authority to approve every proposed predicate. This is an actual refusal, not a simulated failure. Field-only restrictions are not the cause of this predicate check.

The request explicitly requires stopping before changing accepted I-AM semantics or expanding the security model. Neither the predicate authority nor the policy store was bypassed. No direct seeding of the refused Viewer policy was substituted. The complete browser journey therefore stops before the new three-process topology starts. Code after this barrier is unverified integration work, not passing evidence.

Proposed separately authorized extension: a production administration scope adapter with an explicit, finite predicate-template registry, bound to the actual application's applied Dataset and permanent field identities. Require exact template matching, current schema/ownership, existing grant-boundary template IDs, and fail-closed unknown predicates. Keep the accepted development adapter and I-AM evaluator unchanged. The operator must approve which templates and administrators may create them. A general `permitsPredicate: true` implementation is not proposed. This extension has **not** been implemented.

## Implemented contracts, with verification limits

- `identity-integration.ts` connects permanent enrollment to unique active Users in the authoritative I-AM store. Remote identity/current checks and session status/revocation use `service-rpc.ts`: separate mTLS certificate fingerprints and signing keys, receiver-instance audiences, short-lived signed method/path/body bindings, replay refusal and fixed peer path allowlists. These new adapters typecheck; complete three-process lifecycle verification remains blocked.
- `publication-integration.ts` reads the actual Application/presentation manifests, published version checksum, frozen package integrity and existing release admission. `applied-integration.ts` reuses Data's canonical publication/applied/registry inspector and existing ORM dependency. It uses that inspector's historical development name only for schema verification; developer identity is not production authentication.
- `release-browser-build.ts` builds the actual frozen composition through the existing compiler. A small optional `servicesForArtifact` hook in the visual runtime gives each nested Form its own release-qualified transport. Existing default callers retain their service behavior. Public build execution against protected Data is not yet verified by this journey.
- `private-asset-owner.ts` addresses an exact gap: the existing Application asset owner/export path is public and has no persisted private version index. This narrow extension adds external content-addressed raster blobs and a SQLite version/hash index, operator/current-authority callbacks and conflict checks. Existing public asset handling is unchanged. Private transport supports safe raster thumbnail presentation. New owner/export/browser integration remains unverified beyond typechecking; retained Stage 5 transport tests do not prove this new owner.
- The management frontend has its own sessions, service identity and fixed application registry. It forwards only supported administration routes to the Data-owned listener. Existing WP3 stage/activate/provision rules remain authoritative. Role projection and assignment/revocation reuse existing implementations. Cross-process role and epoch revocation in the new journey remains unverified.
- Runtime transport failures now report unavailable/unknown write outcome rather than implying a refused write could not have committed. No write retry is added.

## Actual browser progress

The disposable workflow provisions applications through the existing protected API and onboarding authority; an authorized Editor creates/applies the inventory Dataset and creates its mapped Form through existing controls. Supported controls create a Page, insert the Form and declare its protected query. An Editor publication attempt is refused. A separately granted Publisher publishes the actual frozen release. The shared Form editor then saves draft B with the name field noneditable; the authoritative selected release ID remains A. Sanitized publication file hashes and browser screenshots are retained with the focused evidence.

The template uses local `file:` dependencies, which npm installs as junctions. The unchanged physical-only publication guard refused those paths. The test materializes only the disposable application's UI-Base dependency copies before publication, retaining package identities. Original installations, native admission and publication guards are not relaxed. This setup prerequisite must be addressed explicitly in eventual production packaging.

No claim is made here for the new journey's protected Form submission, filtered Viewer results, private thumbnail/export isolation, current-policy browser revocation or authenticated three-process separation. The focused test remains failing at the legitimate administration boundary.

## Evidence and preservation

See `evidence/v1-stage5-integration-20261105/verification-summary.json` for final test totals and isolation refusals, `completion.json` for original graph preservation, `package-closure.json` for physical package identities, and `changed-file-hashes.json` for the exact review inventory. The focused `security-only` run preserves the publication/draft evidence and the refusal. Disposable trees and raw failure diagnostics are excluded from the inventory. Temporary certificates, private keys, sessions and policy/application stores are not review artifacts.

Tests execute in verified physical targets. Missing and same-as-original isolation configuration must refuse before initialization. The accepted runner observes the historical lock directory without reading/acquiring/recovering/recreating the lock. Data Services and UI-Base source remain unchanged. Root and nested dependency manifests remain at the checkpoint; no new dependency is introduced. The existing pinned security libraries and their recorded integrity values remain in force. Windows processes would still share one OS account; Node filesystem permissions are not Ubuntu account isolation.

## Qualification matrix

The accepted checkpoint's qualifications remain authoritative. Existing Stage 1–5 regression passes apply only to their established scope.

| Criterion | This increment's local evidence | Remaining qualification |
| --- | --- | --- |
| P1 | Authoritative User adapter typechecks | Live Auth0 plan/tenant/client/MFA/enrollment and lifecycle blocked |
| P2 | RPC/session adapters typecheck; retained session/security tests | New authenticated cross-process lifecycle blocked; real HTTPS/Caddy and provider lifecycle pending |
| P3 | Actual publication, applied inspection, frozen build and A selection after draft B | Protected browser execution and target/schema ownership qualification incomplete |
| P4 | Public runtime import boundary passes; separate transport code | New process journey blocked; Ubuntu accounts/ACLs/network/credential custody unverified |
| A3 | Private owner and thumbnail extension typecheck; retained transport negatives | New owner/private browser/export audit blocked; target storage isolation unverified |
| I1 | Existing provisioning/onboarding flow exercised | Production identity and enrollment qualification pending |
| I2 | Actual predicate grant-ceiling refusal preserved | Approved predicate administration extension required; production management origin pending |
| I3 | Editor creates Dataset/Form/Page; explicit Publisher separation | Production/shared-scope qualification retained |
| I4 | New scoped Viewer activation refused | New row/field browser journey blocked; existing fixture coverage does not replace it |
| I5 | Retained anonymous/route boundary tests | Actual new published public/runtime journey incomplete; target caches/proxy pending |
| I6 | New revocation adapters typecheck | New cross-process browser revocation/disabled-user test blocked; provider-only disable propagation pending |

## Later operator decisions — no procurement or deployment

After predicate authority approval and completion of the local journey: approve Auth0 tenant/region, expected monthly active Users and client count, MFA methods and current plan quote; exact application and separate management domains/callback/logout HTTPS URLs; Ubuntu host sizing from measured workload, disk capacity, maintenance/access owners and Node compatibility; independent runtime/management/Data accounts, internal CA/signing-key rotation and credential custody; real application/release selection, schema ownership and private-asset import/index prerequisites. No prices or sizing are asserted as a verified quote here.

A separately authorized minimal production-like procedure should use one disposable real application and enrolled administrator/Editor/Viewer; verify provider MFA and enrollment, real browser publication/execution, row/field/private access, open-session role/epoch/User-disable revocation and outage refusals; audit proxy routes, exports/public outputs and account access. Retain sanitized evidence and stop before Stage 6 activation or Stage 7 recovery. No purchase, registration, provider credentials, host configuration or deployment is authorized by this record.
