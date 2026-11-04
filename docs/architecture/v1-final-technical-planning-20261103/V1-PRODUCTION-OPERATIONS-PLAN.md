# V1 Production Operations Plan

November 3, 2026. **PROPOSED; no production, recovery or implementation authorization.** [Technical Decisions](V1-TECHNICAL-DECISIONS.md) defines evidence labels and source roots. The accepted local pilot remains accepted with its qualifications; it is not a production deployment qualification.

## Constraints and architecture alternatives

Finalized requirements: one independently administered self-hosted production environment, trusted external identity integrated with I-AM, runtime separate from Builder/management, behavior from published release, current authorization on protected operations, public/private assets, complete application/data recovery, 6-hour RPO, 30-day backup retention and 90-day security/operational audit retention. Operators hold separately granted authority. A 24-hour RTO is a planning candidate only.

VERIFIED-SOURCE constraints: current development uses Node/TypeScript/Web Components, physical admitted native UI inputs, JSON-file ORM, SQLite WAL security storage, file-backed release/schema/resource state and local directory deployment. Runtime build checks Node major and platform/architecture. Manifests include relative workspace dependencies; transferable deployment must contain admitted built inputs rather than assume sibling source folders exist. Node engine declaration alone is insufficient qualification for built-in SQLite and the installed toolchain. Actual production server capacity/OS, IdP/protocol, network, DNS/TLS, operator, data size, disk type, service manager, maintenance window and off-server storage remain UNVERIFIED.

| Alternative | Fit / trade-off | Recommendation status |
| --- | --- | --- |
| Separate OS services/processes on one production server | Smallest fit for existing local target. Separate service accounts, directories, listeners and network rules; operator must provide real activation/health/restart integration. | Preferred candidate if operator standards permit. |
| Containers on one production server | Stronger packaging/process separation; adds image, volume, backup and runtime management requirements. | Justified alternative if already supported by operator. |
| Separate runtime and management machines | Stronger host isolation, greater administration/backup coordination. | Available alternative if required by trust/network constraints; not assumed necessary for V1. |

No hardware, operating system, identity provider, container engine, proxy or service manager is selected here. Obtain owner constraints, compare supported choices against actual compatibility and approve the resulting target before implementation. Native services versus containers must still meet the same evidence matrix. A single host is not high availability; no availability SLA is inferred.

## Minimum request flow

```text
Browser -> trusted TLS entry
  public routes -> verified release HTML/JS/CSS and explicitly public assets
  protected API/private assets -> production application server -> secure session
    -> permanent issuer/subject mapping -> I-AM User
    -> server-resolved application/environment/active release
    -> release-admitted query/Form/action contract
    -> authenticated internal Data Services request / trusted actor context
    -> current I-AM Dataset/field/row checks + applied schema pin
    -> secured engine -> ORM -> truthful committed/read-back outcome

Builder/management -> separate restricted entry/session audience and server
Operator -> separately authorized deployment/recovery tools
Backup -> encrypted, verified off-server repository under separate access control
```

Public requests never acquire editor or administrator identity. Authenticated Viewer and anonymous visitor are separate cases. Runtime cannot call management through a development proxy. Static/private storage separation and backend listener restrictions are mandatory even when a front-end proxy exists.

## Exact source dependency map and missing adapters

| Boundary | Reuse | Missing bounded integration / acceptance |
| --- | --- | --- |
| External sign-in | Data I-AM `src/wp1/models.ts`, WP2 trusted identity interfaces; Platform development identity as behavior reference | Provider-specific validation adapter, trusted issuer/audience/signature/time checks, permanent `(issuer, subject)` mapping with uniqueness/lifecycle checks. Email/display name is not an identity key. Do not auto-map external admin claims to Platform Administrator. Unknown/disabled identity fails closed or follows approved provisioning. |
| Application session | Existing protected route checks; no production session lifecycle verified | Server-owned secure session with Secure/HttpOnly/SameSite cookie, rotation, idle/absolute expiry, logout/revocation, request-forgery protection and origin checks. Persistent session store or deliberate restart invalidation; no acceptance of forged actor headers. Exact timeouts/provider protocol need approval. |
| Internal trusted actor | Data `packages/dataset-operations/src/development-actor-provider.ts` TrustedActorProvider shape and `secured-request-handler.ts` TrustedDatasetAuthenticator | Separate production provider composed with existing engine. Authenticate server-to-server requests and bind actor/application/authority, audience, expiry and replay controls. Browser cannot choose authority/actor/grants/host. Do not remove development-only guards or rename their credentials into production tokens. |
| Data host | Data `secured-development-host.ts` composition, `secured-engine.ts`, schema-application applied resolver/resource registry and current I-AM evaluator | Production composition with trusted provider, configured persistent stores, applied schema/runtime pins, readiness and current policy. Existing development host explicitly rejects nondevelopment mode. Maintain final authorization/staleness checks and current delegation limits; no admin data bypass. |
| Release-qualified Forms | Platform `src/server/form-contract.ts`; Data ProtectedFormResolver/TrustedDatasetExecution | Current resolver reads shared component authoring root. Replace production resolution with verified release closure keyed by trusted app/environment/release/Form/Dataset identity. Release contract must remain current for the request or reject on pointer change; never accept client-supplied validation/calculation JSON. |
| Release-qualified actions/queries | Platform visual model/runtime, composition snapshots/publications and artifact build | Capture admitted action/query definitions and server allowlist in the same release manifest, including dependent Forms/shared components, modules/CSS and executable digests where used. Production adapter resolves references there. Preserve published program approval/digest checks under current I-AM; a release never carries its own live grant authority. |
| Management authorization | Platform `v1-management-routes.ts`, `v1-security-administration.ts`; Data WP3 administration service | Production identity wiring, reusable scoped role UI and endpoint inventory. Distinguish source export from runtime content view; review broad presentation-admin publish/rollback. Deny unknown protected routes. |
| Private asset access | Platform composition path/hash safeguards, presentation version ownership; Base assets provider interface | Server-owned metadata with permanent application/asset identity, visibility and revision/release association; authorization for metadata, thumbnail, range/download and bytes. Recheck current I-AM on each protected request. Private storage outside public output, no static URL fallback, no shared public cache, no scope chosen by browser. |
| Activation/health | Platform artifact `DeploymentService`, `LocalDirectoryDeploymentTarget`, migration provider | Approved operator adapter actually switches process/config and checks runtime/release ID, static routes, dependencies, data/schema, policy/session and protected asset behavior. Existing callbacks are seams, not installed production operations. |

Resolve application identity from trusted host routing/configuration and authenticated session context; compare requested resource ownership independently. A runtime may use the currently active release only (recommended minimum): stale release write requests fail with a clear reload instruction. Supporting multiple simultaneous release versions would require additional pin/expiry policy and is not assumed. Current security can revoke access immediately even while behavior remains fixed to the published release. Applied schema compatibility must be checked independently of either release or security revision.

## Four-role enforcement

Roles are named bundles of scoped grants, not inheritance or automatic authority. Platform Administrators alone create applications. Application Administrators administer assigned applications, manage roles within grant ceilings and publish within granted authority. Editors edit assigned Pages/Forms; shared Shell/Menu/theme changes require an additional grant. Authenticated Viewers may read authorized runtime content/data; anonymous visitors receive only intentionally public content/assets. Every data operation requires independent Dataset/field/row grants for all roles.

Publishing is separate from deployment. Platform Administrator title alone grants neither publication in every app nor operator recovery. Application Administrators request recovery; only separately authorized operators execute it. Retain WP3 staging/activation checksum, current-policy checks, audit, delegation and last-administrator safeguards. Source export and management visibility must not accidentally accompany runtime Viewer access. Private asset authority is a server check even if upload/selection UI is retained.

## Assets and publication

Use the three dispositions in [Component Admission Plan](V1-COMPONENT-ADMISSION-PLAN.md). Keep path/hash and draft/version contracts; do not substitute the generic provider's global/public defaults or development identity headers. Browser File inputs must provide actual bytes through admitted server transport, with validation and size/type limits defined for the supported asset subset. Client checks alone are insufficient.

Public assets are copied/hashed into the identified release; authoring replacement cannot silently alter released bytes. Private references resolve to protected endpoints and release-compatible versions. Assets explicitly made public cannot be made secret retroactively in downloaded/cached copies; changing visibility must stop subsequent origin access and prevent further public publication, with the limitation recorded. No private asset bytes, credentials or security snapshots enter downloadable source/static bundles. Test direct URLs and encoded traversal, application mismatch, stale revision, revoked identity and cache behavior.

## Deployment, update, restart and rollback

Reuse artifact build/migration/deployment machinery. Record source commits, exact dependency payloads, build target, manifest/file digests, application/environment IDs and release closure. Require external configuration/secrets and production credentials; no mutable source directory is a production dependency.

Preflight validates candidate integrity/runtime compatibility, current schema and pending migration ledger, operator authority, backup/readiness and required configuration. Stage into an immutable release directory; health-check before migration, staged and promoted phases; switch the active pointer only through the approved target adapter. Confirm actual process serves the selected release. The local target only claims atomic release-pointer replacement; a pointer is not cross-store atomic activation.

Restart must reconstruct state, invalidate or reload caches appropriately and preserve data/policy/release selection. Failed updates retain truthful deployment state. Roll back runtime only when the provider establishes compatibility with current schema/data. Otherwise remain in maintenance/recovery-required state. Never auto-restore data or reopen writes after uncertain migration. Explicit deployment recovery in `deployment.ts` already requires backup identity, data-loss acknowledgement, reason and recovery probes; whole-application recovery extends that authority discipline.

## Backup inventory and existing services

| Existing mechanism (VERIFIED-SOURCE) | Reuse / limit |
| --- | --- |
| Composition snapshots, presentation versions and exporter | Application definitions/release references/assets reuse; ordinary export excludes live security material and is not disaster recovery. |
| Artifact snapshots/history/build manifest | Identify content and dependencies; not a coordinated data/security backup. |
| `MigrationProvider` / `JsonFileMigrationProvider` | Quiescence, environment-bound checksummed schema/ledger/rows backup and restore. Only configured Dataset files are covered; not application files, I-AM or all registries. |
| `DeploymentService` / local target | Stage/health/promotion and recovery state/audit; no complete retention scheduler/off-server repository. |
| I-AM WP1 SQLite store / WP3 audit | Security definitions/assignments/grant boundaries/approvals and audit recovery source. WAL must be captured consistently. Portable security view intentionally excludes live authority. |
| Artifact `common.ts` operations JSONL / Data/I-AM audit | Existing correlated records to collect. No verified complete 90-day protected collection/retention path. Post-commit audit failure must retain truthful commit outcome. |

Capture all definitions (Pages, Forms, shared components/Shell/Menu/theme/settings), publication pointers/versions, exact admitted dependency/runtime inputs, schema publications/applied state and migration ledgers, application/resource registries/permanent identity mappings, all records, public/private assets and metadata, relevant I-AM configuration, application-bound approvals/delegation state, and required environment configuration references. Include queued work/state if enabled; never replay indeterminate jobs automatically. Store secret/key recovery material in a separately protected recovery mechanism; do not put sessions or bearer credentials in ordinary bundles. Inventory shared/global stores explicitly so single-app recovery cannot overwrite other applications.

## Smallest coordinated backup protocol (PROPOSED)

1. Authorized operator/scheduler starts an environment-scoped backup generation. Block configuration/publication/deployment/security changes and data/asset writers; drain in-flight requests/jobs. Record all writer acknowledgements and stable policy/schema/release revisions. Existing locks coordinate cooperating writers only: prohibit external writers operationally and fail if quiescence cannot be established.
2. Under verified maintenance, invoke existing schema/rows backup and capture application/release/assets/resource/configuration state. Use a supported consistent SQLite backup or clean stopped-store copy including the required WAL state; copying a live database file alone is not accepted. Do not construct/open stores during inspection as a backup method.
3. Write a manifest: backup ID, environment/application coverage, capture start/cut/end time, source/runtime versions, schema/policy/release revisions, permanent IDs, every payload hash, size and key reference, writer/quiescence proof and audit checkpoint. Quiescence keeps the captures logically consistent; a set of independently timed copies is insufficient.
4. Verify manifest and payload completeness/checksums and store consistency before reopening writers. Release maintenance safely, refresh processes/caches and health-check. Failed capture is not a successful recovery point. Encrypt and transfer to the protected off-server repository; verify remotely and mark complete only after durable acknowledgement. Keep local staging until success/retry policy permits removal.
5. Monitor latest verified off-server capture time, transfer lag, job failure and free space. Candidate cadence is every 4 hours with a measured completion/retry budget under 2 hours. Actual achieved RPO is the maximum age of the newest usable off-server capture, not scheduler frequency. Alert early enough to act before 6 hours; record a breach if the bound is exceeded. Extended outage requires explicit operational escalation, not a silent RPO claim.
6. Retain usable complete generations for at least 30 days from capture, including dependencies needed for restoration. Apply deletion only after verifying successor coverage and retention. Separate backup writer/read/recovery/delete authority; protect off-server copies from production compromise/deletion. Encryption keys must remain recoverable independently of the failed server, with tested custody and rotation.

Mandatory verification: validate every completed backup and off-server copy; before production acceptance perform a full isolated restore from an off-server generation. Proposed ongoing full restore drill: monthly and after material storage/schema/security/dependency/backup changes. Owner may require a stricter cadence; checksum success alone is never a restore drill. Keep dated results and exercise failure detection. All future execution needs explicit authorization.

## Recovery and privilege safety

Application Administrator requests recovery with application, desired recovery point and reason. A separately authorized operator creates a reviewed plan naming backup/environment, overwrite scope, expected loss, shared dependencies and validation. Destructive restoration requires separate explicit authorization bound to that plan and backup. Preserve a pre-recovery snapshot where feasible and retain the incident audit outside the restored image.

Restore first to an isolated clean target with outbound jobs/notifications/writes disabled. Verify encryption access and all hashes, then definitions, applied schema/ledger, records, private/public assets, release pointer, dependencies and resource ownership. Restore security state only under independently validated authority: same-environment recovery preserves permanent identities but reconciles post-backup revocations/disabled accounts and stale approvals before reopening. A pre-revocation backup must not silently revive revoked access. Invalidate sessions and rotate/re-provision credentials as required. Preserve exact program digests and review approvals against restored code/current policy.

For a different environment, do not import live assignments, external identity mappings, service approvals or operator grants as authority. Perform explicit remapping/reprovisioning within target delegation limits. Portable definitions remain distinct from security disaster recovery. Application recovery must not replace global I-AM or other-app state without explicit coordinated scope. Treat missing global dependencies as a recovery blocker.

Re-run positive/negative role/data/private-asset checks and release/record consistency on the isolated target. Authorized promotion follows only after review. Resume writers/jobs only after health/current authority verification; reconcile indeterminate operations manually. Log requestor, approver/operator, target, generation, loss window, validation and promotion outcome.

## Audit collection and retention

Collect authentication/session outcomes, allow/deny protected requests, application/role/grant/approval changes, publish/release/deployment/migration/rollback, asset upload/read denial, backup/restore and operator actions. Reuse I-AM transactional administration/delegation audit and existing operations/DOE outcomes; supply missing host/access/session/asset events. Record timestamp, actor/initiator/executor, application/environment/release, resource/operation, policy revision, decision/reason code, correlation and truthful commit result. Do not log secrets/tokens or unnecessary record payloads.

Forward to a protected durable collector/off-server store, restrict reading and deletion, synchronize clocks, handle disk-full/collector interruption with bounded durable buffering and alerting. Security-changing operations must not claim success without their required durable audit; for already committed operations report post-commit audit failure truthfully rather than retrying the write. Exercise these cases before acceptance.

Retain security and operational audit for at least 90 days independently of the 30-day backup lifecycle. Restoring an old backup must not truncate newer audit history or duplicate event identity. Verify searchability and deletion boundaries at the configured age using controlled clock/retention fixtures, plus an approved ongoing aged-record check; do not manufacture a claim of 90 elapsed days. Collector outage/loss must be visible and addressed before qualification.

## Qualifying the 24-hour RTO candidate

RTO remains unapproved. Agree the start event (recommended: service loss/incident declaration), endpoint (correct release/data/security restored and validated service reopened), maximum dataset/assets/backup size, replacement-host availability, operator coverage, off-server bandwidth, key/IdP availability and dependency versions. Measure detection, approval, provisioning, download/decrypt, restore, security reconciliation, validation and activation separately. Include waiting for destructive authorization and failed/drill retry time in realistic staffing assumptions. Demonstrate a full off-server clean-target drill at representative worst-case size, with outage/dependency failure scenarios and recorded margin. Only owner approval after that evidence can turn 24 hours into a requirement; do not mark V1 RTO passed while the objective remains undecided.
