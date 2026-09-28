# DS0-WP2 readiness and requirements reconciliation

September 28, 2026. **REVIEW ONLY — PROPOSED REQUIREMENTS; STOPPED AT WP2 AUTHORIZATION GATE.**

## 1. Recommendation and approval boundary

The stabilized development checkout is a suitable starting point for a **bounded, separately authorized schema-activation prototype**. Recommend first application of an already published canonical schema, verification against a preconfigured real ORM, controlled runtime replacement/restart for that same version, and failure/recovery characterization in isolated synthetic environments. Do not include schema upgrades, physical data migrations, published-trigger activation or production deployment in this first scope.

This is a **new recommended scope**, not the recovered complete DS0-WP2 specification. It addresses the three recovered objectives at a deliberately limited level. It does not promise automatic repair of ambiguous state, power-loss durability, multi-writer safety or end-to-end Platform migration integration. If the owner intended upgrades, hot reload without interruption or automatic recovery of every failure, this proposal is insufficient and must be expanded by explicit design approval.

Before implementation, approve or revise decisions **D1–D6 in section 8**, then explicitly authorize the selected work packages. STAB-4 acceptance alone does not authorize them. All scoped B1–B4 closures and unresolved limitations remain preserved.

## 2. Preservation and review provenance

The user's latest instruction accepts STAB-4 for the recorded development-checkout baseline. This document records that acceptance without rewriting the historical reports or closing their unresolved issues.

| Repository | Reviewed HEAD | Observation |
| --- | --- | --- |
| UI Platform, `C:\Projects\Modular\ui-platform` | `9560d104390a82141b7c311037ef66f640c8ddf4` | Existing commit “Stopped at the STAB-4 review gate” already contains exactly the 16 STAB-4 reports/evidence files; clean on entry. |
| Data Services, `C:\Projects\Modular\UI Platform Data Services` | `9a6f0d5623863a8d44b879eda08316b0e3c79571` | Accepted STAB-3 baseline; clean, unchanged. |

The STAB-4 commit was already present, so no duplicate/empty commit, amendment or history rewrite was made. No new proposal was silently added to that reviewed commit. New reconciliation artifacts remain uncommitted for review. The [preservation evidence](evidence/ds0-wp2-reconciliation/review.json) records the 16 artifact hashes, unchanged 69 D files, unchanged 89 earlier DS0/watcher evidence files, repository SHAs and lockfile hashes. The [read-only review script](evidence/ds0-wp2-reconciliation/review.cjs) is included for reproducibility.

Commit whitespace checking reports exit 2 solely for captured command-output blank lines/trailing whitespace in eight STAB-4 log files. Those logs are preserved verbatim. The review script's initial assumption of a zero whitespace-check exit was corrected to record that result; no product failure or evidence repair was inferred. The documentation content and source inventories match. No source, package version, lockfile, state file or published definition changed.

This review used source/document reads, searches, Git/history checks and SHA-256 comparisons. It did **not** rerun tests, open a real definition store through mutating read-like APIs, invoke state recovery, or start runtime services. The latest accepted STAB-4 evidence remains 345 Data Services tests, 112 unique Platform tests (12 focused + 103 contracts minus three overlapping adapter tests), builds/typechecks and dependency validation. Those counts are inherited evidence, not new execution claims.

### Evidence sources

| ID | Source and authority |
| --- | --- |
| E1 | User-supplied recovery of the September 26 conversation in this thread: conditional WP1 acceptance, four focused/eight total tests, successful build/typecheck, and three follow-up objectives. The full original transcript/complete DS0 plan was not supplied or independently verified. |
| E2 | [September 26 preflight](ds0-wp2-preflight-audit.md), especially architecture conflicts and readiness findings. Some original B1–B4 observations were subsequently repaired; its architecture gaps are not silently marked resolved. |
| E3 | [Approved stabilization plan](ds0-baseline-stabilization-repair-plan.md); [STAB-0 report](ds0-stab-0-execution-acceptance-report.md); [STAB-1 assessment](ds0-stab-1-compatibility-assessment.md), [implementation report](ds0-stab-1-implementation-acceptance-report.md) and [acceptance record](ds0-stab-1-acceptance-record.md); [STAB-2 design](ds0-stab-2-transaction-correctness-plan.md), [implementation report](ds0-stab-2-implementation-acceptance-report.md) and [acceptance record](ds0-stab-2-acceptance-record.md); [STAB-3 design](ds0-stab-3-write-containment-plan.md) and [implementation report](ds0-stab-3-implementation-acceptance-report.md). User approvals in this thread supersede their historical gate status without rewriting them. |
| E4 | Accepted [STAB-4 consolidated report](ds0-stab-4-consolidated-acceptance-report.md), [unresolved register U1–U12](ds0-stab-4-unresolved-issues.md), and separate [proposed readiness decision W1–W7](ds0-wp2-readiness-decision.md). Acceptance of the baseline did not approve W1–W7 architecture choices. |
| E5 | D `_architecture_v2/UI_Platform_Data_Services_Architecture_V2/`: Dataset Operation Manager, ORM, I-AM and Versioned Definitions architecture. The latter's active-schema consumption and coordinated publication/migration statements are broader architecture, not a recovered DS0 work-package plan. |
| E6 | D `packages/schema-application/{src/index.ts,README.md,tests/state-store.test.ts}`, ORM types/implementation, DOE and Schema/Trigger Manager contracts; P `packages/artifacts/src/application/{json-provider,migrations,build,trigger-adapter}.ts`. Current behavior is implementation evidence, not authority to invent missing requirements. |

## 3. Reconstructed requirements with explicit confidence and authority

“Recovered approval” below means the user's supplied account of a prior decision, not an independently recovered complete specification. “Proposal” and “inference” require new approval before becoming implementation requirements.

| ID | Statement | Classification / provenance | Consequence |
| --- | --- | --- | --- |
| R1 | WP1 was conditionally accepted September 26; implementation is schema-application state store. Four focused/eight original total tests, build and typecheck were reported passing. | **Recovered approval, provisional completeness**, E1; actual-checkout STAB-0 reproduced the counts. | Preserve that narrow acceptance. Test counts do not establish the missing conditional obligations or formal WP1 acceptance criteria. |
| R2 | WP2 should verify runtime activation/reload. | **Recovered approved objective**, E1. | Exact runtime topology, health criteria, upgrade versus first activation and reload guarantees remain missing. |
| R3 | WP2 should provide safe recovery. | **Recovered approved objective**, E1. | Safe detection, resumability, repair, compensation and operator authority are not specified. Do not equate them. |
| R4 | WP2 should strengthen durability/concurrency testing. | **Recovered approved objective**, E1. | Target failures, OS/filesystems, process topology and promised guarantees are missing. Tests cannot create storage guarantees. |
| R5 | DOE orchestrates authorization/triggers/operation lifetime; ORM provides storage capabilities; central runtime TriggerRegistry remains authoritative. | **Documented architecture constraint**, E5 and accepted stabilization decisions. | No second registry, ORM permission engine or application-component filesystem bypass. |
| R6 | Applying → verified-pending-activation → applied; uncertainty gates recovery. Logical id maps only to a required ORM string primary key; namespaces unsupported. | **Documented WP1 contract/implementation**, E6. | Preserve these constraints unless separately amended. Caller-supplied verification/activation metadata is not real runtime proof. |
| R7 | B1–B4 scoped closure; preserve canonical/legacy rules, truthful commit outcomes, scoped-write containment, existing history/data and hash domains. A8 persisted identity changes deferred; A9 release proposal only. | **Explicit current approved constraints**, E3/E4 and user instructions. | New WP2 design cannot silently override these contracts or authorize migration/release. |
| R8 | W1–W7 readiness gates and U1–U12 resolution paths. | **Documented proposals/open issues**, E4. | A review checklist, not decisions already made or a complete approved WP2 plan. |
| R9 | Verify a pinned identity/version against real ORM; keep ordinary traffic gated until verified runtime readiness; reverify after process restart. | **Safety inference and new proposed acceptance criteria**, derived from R2/R3 and E6. | Recommended, but requires approval of exact behavior and compatibility scope. |
| R10 | First activation + same-version restart, D-only state authority in a disposable fixture, no migration/upgrade/trigger publication bridge. | **New bounded proposal in this document**. | Must not be represented as the original intended exhaustive WP2 scope. |
| R11 | Complete DS0 plan, formal WP1 conditional acceptance terms, runtime SLA/health evidence, authority selection and failure model. | **Missing decisions/evidence**, E1/E2/E4. | Recover them or approve a clearly labeled replacement baseline. No completion claim until addressed. |

Form Builder WP1A, Generic Artifact Editor WP numbering and broader Versioned Definitions implementation phases are separate workstreams. They cannot fill missing DS0 requirements by matching labels.

## 4. Current-source reconciliation and conflicts

### Applied versus published versus physical state

The older versioned-definitions architecture says runtime uses the active published schema. WP1 adds environment-specific applied state, with a pending-activation phase. Current DOE uses manually registered ORM definitions. These are three different facts; the registry's active version is not proof of either physical compatibility or environment readiness.

P's migration provider has its own schema/ledger state and `schemaGate`; its offline adapter calls for writers to stop and later refresh definitions/caches. D has a separate state file and ledger. **Recommendation, subject to D2:** in the isolated prototype only, D's state records environment activation eligibility; Schema Manager/VDR records publication identity; the actual ORM is the source of observed physical/runtime structure. P's migration state is neither consulted nor rewritten. This is a bounded coexistence decision, not a global selection of D over P. Cross-system disagreement in a shared environment must block onboarding rather than choose an authority automatically.

### State and recovery capabilities actually available

- `beginApplication` rejects an existing dataset identity regardless of version. There is no approved upgrade/reapply transition. Recommend limiting this increment to first application and reconstruction of the **same pinned version** on restart; version upgrades need a separate state-machine proposal.
- `markApplied` stores supplied activation metadata after the pending phase. No live reload or health verifier currently backs that metadata. The first of the four state-store tests reaches pending activation with synthetic fingerprints; it is not an activation integration test.
- `markRecoveryRequired` gates the environment; no explicit clear/repair transition exists. Recommend retaining that gate for ambiguous outcomes. Do not add a “clear recovery” shortcut or edit state by hand to make tests pass.
- `snapshot` and `recoverState` acquire locks and may remove/reconcile a pending journal. They are not read-only inspection APIs. A future diagnostic path must state whether it only reads bytes or performs recovery.
- The lock file uses exclusive creation and syncs its own metadata; state/journal writes use temporary files and rename without a demonstrated power-loss durability protocol. Existing journal matching checks are not a proof of every record invariant or runtime state.

These are design inputs, not newly declared WP1 regressions. A requirement to change persisted identities, journal format/hash, state transitions, ORM interfaces or recovery authority must return for approval at the contract gate.

### Verified runtime contract recommendation (D3)

Pin `{environment, appId, permanent dataset ID, runtime reference, version, checksum}`; independently obtain the canonical format and verified payload via `readVerifiedVersion` and checked publication selection. The unchanged persisted checksum prefix alone supplies no format or trust evidence. Retain format/verification as qualified runtime evidence; on each restart reacquire it from the verified publication instead of silently converting stored identities. Existing unqualified/legacy environments are outside this prototype, not grandfathered into trust.

Compare real `getDatasetDefinition` output against an explicit mapping of published field IDs to runtime keys/types/required/default/primary-key rules. Do not infer permanent field identity from a name alone. Specify normalization and the new verifier fingerprint domain at the contract gate; do not reuse/change P fingerprints or journal hashing incidentally. Reject unsupported types, namespaces, identity/version mismatches and ambiguous publication selection.

Recommend a controlled development host that closes admission, drains owned operations, constructs a fresh ORM/DOE/I-AM/registry composition to avoid stale caches, verifies it, exercises readiness, records the applied transition and only then opens ordinary traffic. Exercise the existing production HTTP handler in integration tests. This proposes controlled replacement and restart, **not zero-downtime hot reload** and not a new production registration endpoint. A boolean callback, static metadata or compilation alone cannot count as health evidence.

After restart, even a persisted applied record is insufficient to open traffic: reverify publication and actual runtime, reconstruct and health-check the same version first. A failed promotion/reload/acknowledgment keeps admission closed. Recovery cannot replay original data writes or infer no writes from `committed=false`.

## 5. Unresolved-issue decision matrix

“Prerequisite” means a decision/contract is required before the dependent implementation. It does not mean the missing feature must secretly be implemented during this review.

| Issue | Classification for recommended bounded scope | Recommended disposition / dependency |
| --- | --- | --- |
| U6 complete plan/WP1 terms | **Prerequisite** | D1 must adopt new bounded requirements or supply the missing authoritative plan. Preserve uncertainty about original scope. |
| U4 applied-schema authority | **Prerequisite** | D2 approves isolated D activation authority and excludes P migration integration; shared environments remain blocked pending a separate bridge decision. |
| U7 verified identity and U10 runtime topology | **Prerequisite** | D3 approves verified pinned reads, actual ORM comparison, controlled host lifecycle and restart proof; contract gate resolves format/fingerprint/admission details before implementation. A8 remains deferred. |
| U1/U12 durability, concurrency, recovery | **Prerequisite for the promised guarantees; broader storage redesign is separate** | D4 chooses process-crash/I/O characterization and cooperative single-owner tests, closed admission on uncertainty, no automatic stale-lock reclamation. Power-loss guarantees, multi-file atomicity and writer fencing remain excluded and explicitly unproven. |
| U5 trigger publication/runtime bridge | **Explicitly deferrable; separate integration project if excluded** | D5 defers publication activation; central runtime registry remains unchanged. Synthetic handlers may test ordinary DOE lifecycle, never count as published-trigger activation. Include only with a separately approved bridge/handler identity contract. |
| U2 legacy stores/external deployments | **Deferrable only for fresh synthetic roots; prerequisite for any real-store work** | D5 excludes real/legacy store activation. Keep legacy rejection/preservation tests. Future deployment needs current root/consumer inventory and approved transition policy; historical local zero counts prove nothing about external deployments. |
| U3 valid scoped writes/restore | **Explicitly deferrable; separate authorization/restore projects** | Keep containment; synthetic authorized unscoped fixtures only. No weakening grants in existing environments. |
| U8 Windows watcher EPERM | **Deferrable if host uses explicit lifecycle, not watcher-driven activation; conditional prerequisite otherwise** | D5 excludes watcher-based reload. Preserve issue and regression checks; direct state/ORM rename failures are tested separately. Dependence on directory-watch activation reopens the decision. |
| U9 timeouts/ENOTEMPTY/chunk warning | **Separate projects**, monitor regression evidence | Preserve existing evidence; diagnose new failures independently. No test weakening or optimization work bundled here. |
| U11 release coordination | **Separate project; prerequisite for release/deployment** | Exact existing versions/locks and checkout SHAs remain. No publishing, pin changes or mixed-writer deployment. |
| Prior preflight: UI Base real-path dependency resolution, absent aggregate package/VDR dev entry, production identity/audit gaps | **Separate projects / topology constraints**, not resolved by stabilization | P's supported build passing is not proof that every UI Base real-path import works; do not adopt the absent aggregate package or VDR service launcher. Use inspected supported library/handler composition. Require a separate review if the intended host depends on those paths or production identity/audit. These historical limitations were not retested or repaired here. |

Non-atomic persistence and unqualified old state identities cannot be “deferred” while simultaneously claiming arbitrary safe production recovery. Such a claim would require a different scope and approvals.

## 6. Proposed work packages and dependencies

Labels below are new planning labels, not recovered official DS0 numbering. No package is authorized by this document.

| Package | Proposed deliverable and likely affected boundary | Depends on / exit gate |
| --- | --- | --- |
| WP2-R0 — contract freeze | Schema-application API/transition matrix, authority/trust table, pinned identity/format and fingerprint specification, runtime host/admission/health sequence, recovery action matrix and test topology. Identify exact files/exports and any additive interfaces. No persisted schema/journal change assumed. | D1–D6 approval; **G1 contract review before code**. Stop if first activation/restart requires an unapproved state/ORM/interface change. |
| WP2-R1 — verifier and resolver | Implement existing verifier/resolver responsibilities in `packages/schema-application`; verify published canonical payload and actual ORM definition/mapping. Separate pending candidate verification from public resolution of an applied record. Preserve state format and existing imports. | R0 accepted; **G2 identity/verification tests**. Publication-invalid or unqualified legacy input never becomes eligible. |
| WP2-R2 — controlled activation | Development-only composition using real ORM/I-AM/DOE and existing HTTP handler. Gate admission, drain/replace runtime, verify/read health, promote pending record, reopen. Restart revalidates the same pinned applied version. No P migration-state write or production endpoint. | R1; **G3 actual runtime/HTTP activation evidence**, not mocks-only. First application and same-version restart only. |
| WP2-R3 — guarded recovery and failure characterization | Read-only diagnostic report plus explicitly classified bounded resume/revalidation paths, fault injection around state/runtime handoff, process restart and cooperative contention. Preserve state/journal algorithm unless a separate change is approved. Ambiguous states remain recovery-required. | R0 failure matrix, R1/R2; **G4 recovery boundary acceptance**. No generic force-unlock or clear-recovery API. |
| WP2-R4 — consolidated verification | Run retained STAB suites, new runtime/failure tests and relevant P tests; record commands, versions, hashes, unique counts, unresolved limits and traceability to R2–R4/proposed criteria. | R1–R3; **G5 final WP2 acceptance review**. No deployment or release follows automatically. |

Likely runtime additions are in D schema-application and a narrowly scoped development/test composition; DOE/ORM/I-AM interfaces should be reused. P source should remain unchanged for this isolated scope. Exact export/host/recovery changes belong in R0's concrete reviewable contract. Do not interpret the table as approval to redesign ORM storage or the state store. A wider Platform bridge, upgrade lifecycle, automatic ambiguous recovery or production host requires a separate amended plan.

## 7. Proposed acceptance and failure tests

All criteria here are **new proposals**, derived from the recovered objectives. They are not asserted to have been previously approved. Tests use named fresh temporary roots, canonical synthetic publications, explicit actor grants, real storage/fresh readers and actual process/HTTP boundaries where claimed. Never use production histories or log application payloads.

| Criterion | Required evidence and pass condition |
| --- | --- |
| C1 verified identity | Tampered/missing/legacy/unknown-format content, ambiguous active selection, wrong environment/dataset/field ID, namespace/type/primary-key/default mismatch fail before promotion or traffic. Same checksum prefix is never sufficient. Compatible first application succeeds. |
| C2 runtime activation | Demonstrate a real pending candidate → verified live composition → health evidence → applied promotion → ordinary traffic sequence. Use read-only runtime/definition health checks plus synthetic unscoped CRUD after admission to prove the selected schema is used. No caller-supplied activation metadata alone counts. |
| C3 publication versus applied | Publishing another version does not silently advance the pinned runtime. Different-version activation is rejected/deferred in this scope; same-version reconstruction after process restart revalidates the exact identity. Define initial active-selection recheck timing in R0; no concurrent publication allowed in the prototype. |
| C4 authority isolation | P migration state and all pre-existing roots stay byte-identical. A configured shared/conflicting authority must reject onboarding, not choose a winner. Namespaced/unqualified existing environments reject. |
| C5 failure before verification | Lookup/integrity/ORM mismatch or authorization failure produces no applied state and no admitted runtime. Rejected operations preserve complete file inventory/raw bytes where no transition was authorized. Once applying is intentionally recorded, assert that bounded state delta rather than falsely claim zero writes. |
| C6 activation/promotion interruption | Inject failure before/after runtime construction, health, pending/applied state write, admission opening and response delivery. Keep traffic closed if state/runtime agreement cannot be proved. Lost acknowledgment triggers inspection/revalidation, never blind replay. A process crash after applied persistence but before admission must reverify on restart. |
| C7 journal and recovery cases | Exercise current/before/next/mismatching checksum cases, missing/truncated/corrupt state or journal, incomplete writes and actual rename errors. Define allowable store changes precisely. If existing recovery can discard evidence needed to decide safely, block acceptance and return for a separately approved journal/recovery contract change. Do not fabricate a successful recovery. |
| C8 operational recovery limits | Resume only a proven same-identity applying/pending transition after fresh verification; revalidate an applied record on restart without inventing an upgrade. Recovery-required/ambiguous identity or partial data persistence remains gated with diagnostic evidence. No automatic clear, compensation or stale-lock removal. This is safe containment, not universal repair. |
| C9 process/concurrency model | Deterministically coordinate two real processes contending for the existing state lock; one owner at a time for the protected action, losing operation produces no writes. Kill an owner, preserve stale lock, and demonstrate gated restart. Characterize the gap between individually locked state calls and the whole activation workflow: do not claim whole-workflow exclusion without proving an approved owner mechanism. Uncoordinated ORM/VDR writers remain unsupported. |
| C10 durability claims | Exercise process termination and I/O faults on Windows. Explicitly distinguish them from OS/power-loss tests; no fsync/power-loss or multi-file atomicity guarantee follows from process tests. If stronger durability is required, approval for storage work and corresponding evidence is necessary before acceptance. |
| C11 regression/preservation | Preserve B2 format/legacy rules, B3 outcomes/no replay, B4 containment, existing state/journal/P hash domains, package locks and historical bytes. Re-run Data Services build/typecheck/full tests and relevant P compatibility/typecheck/production/editor suites; record overlap rather than sum duplicate tests. |
| C12 documented exclusions | No claim of trigger-publication activation, live UI/P migration integration, schema upgrades, production security/audit completeness or recovery of arbitrary existing data. Retain Windows watcher and other unrelated known limitations. |

G0 is this authorization gate. G1 reviews concrete contracts after decisions are approved but before implementation. G2–G4 require actual evidence before proceeding to dependent features; G5 requires explicit user acceptance. Failures that reveal a need for state-format, identity, transaction-interface or authority changes pause the affected package for review rather than expanding scope silently.

## 8. Minimum decisions requiring approval

These six decisions consolidate prior W1–W7; they are not additional claimed historical approvals.

1. **D1 — adopt the bounded requirement baseline.** Approve R2–R4 as recovered objectives and the first-activation/same-version-restart scope plus C1–C12 as a newly agreed increment. Explicitly defer upgrades and broader automatic recovery; alternatively supply the complete plan and remaining WP1 conditions before proceeding.
2. **D2 — approve isolated state ownership.** For this prototype only, D records activation eligibility, VDR records publication identity and the real ORM supplies observed structure; P migration-state integration is deferred. Block shared/conflicting environments. This does not settle global applied-state authority.
3. **D3 — approve verified controlled runtime activation.** Pin and reverify canonical identities with runtime-qualified format evidence, preserve A8's persisted identity/journal deferral, and use a controlled development host with admission/drain/reconstruction/health checks. No zero-downtime promise or production registration endpoint. R0 must freeze the exact contracts.
4. **D4 — approve the recovery and failure model.** Cooperative single-owner synthetic environment; process-crash/I/O/real-process contention tests; reverify/resume only provable same-version states, leave ambiguous/recovery-required/stale-lock states gated. No automatic repair, replay, force-unlock, power-loss durability or multi-writer guarantee. If these limits do not satisfy “safe recovery,” approve a wider design before code.
5. **D5 — approve explicit deferrals and exclusions.** Published-trigger bridge, legacy/real-store deployment, full scoped-write authorization, upgrades/migrations, watcher-driven reload, production auth/audit, release/version changes and unrelated fixes remain separate. Keep ordinary authorized unscoped CRUD and central runtime registrations intact.
6. **D6 — approve work-package and acceptance gates.** Use R0–R4 and G1–G5; require concrete contract review before implementation, real integration/failure evidence, preservation checks and final user acceptance. State explicitly which package is authorized next; approving this review must not be interpreted as permission to deploy or skip G1.

## 9. Final readiness disposition

**Ready for a requirements/contract decision; not yet authorized for WP2 implementation.** The code baseline is stabilized, but recovered requirements are incomplete and the proposed boundaries need user approval. This review supplies a bounded option without silently settling conflicts or certifying planned functionality.

STAB-4 is accepted for its recorded baseline; B1–B4 closures and all unresolved limitations remain intact. Original reports, register, readiness assessment and evidence are preserved in the existing local commit. No new commit, push, package release, deployment, data migration or WP2 implementation occurred in this review.

**STOP: WP2 authorization gate.**
