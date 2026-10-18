# Builder End-to-End V1 — Implementation Plan


## Formal user closure — 2026-10-18

**BUILDER V1 WP5-D — ACCEPTED AND CLOSED**, following explicit user review. Accepted evidence: UI Platform **453/453**, Data Services **760/760**, editor/storage contracts **146/146**, focused checks **7/7**; builds, typechecks, production-client exclusion and actual Builder/browser verification passed. All **591 historical evidence hashes** are preserved. Earlier pending-review wording and machine acceptance flags below remain original verification-time history and are superseded by this formal decision. Their original results are not rewritten.

This increment is formal closure and GitHub checkpoint reconciliation only. See the [closure and repository reconciliation](builder-v1-wp5-d-closure.md). Existing architecture, behavior, limitations and successful/unsuccessful/transitional evidence are retained. **WP5-E and subsequent work are not authorized.** D6 remains WP5-F subject to separate admission/locking architecture review; A37 remains WP6. All 40 umbrella requirements remain unchecked, and complete Builder V1 acceptance remains pending.


## Current review decision — WP5-C accepted; WP5-D authorized

**BUILDER V1 WP5-C — ACCEPTED AND CLOSED**, by explicit user review. Accepted evidence: UI Platform 446/446, Data Services 760/760, editor/storage contracts 146/146, builds, typechecks, production exclusion and actual Builder/browser evidence. Historical successful, failed and transitional records and hashes are retained. Earlier review-gate text is historical and superseded by this decision. No WP5-C contract is reopened.

**WP5-D Menu and Branding Authoring is authorized for implementation**, using the approved native composition, storage, styling and editing contracts. Stop at WP5-D implementation verification/review; do not begin WP5-E. D6 remains WP5-F subject to separate architecture review; A37 remains WP6. All 40 umbrella requirements remain unchecked. Complete Builder V1 acceptance remains pending.

## Current authorization — D5 approved

**D5 ARCHITECTURE REVIEW APPROVED. D5.1–D5.6 and WP5-C C1–C5 IMPLEMENTATION AUTHORIZED**, by explicit user instruction. Earlier STOP AT D5 REVIEW and proposed/unapproved wording below is retained planning history, superseded by this decision. Implement the approved contract and plan in order, then **STOP AT WP5-C IMPLEMENTATION VERIFICATION/REVIEW**. Do not begin WP5-D. D6 remains WP5-F; A37 management restart remains WP6. All 40 umbrella requirements remain unchecked.


Date: 2026-10-13; status updated 2026-10-17. **WP0–WP2 remain accepted and closed. WP3 remains accepted for planning purposes, with machine evidence subject to independent confirmation. BUILDER V1 WP4 — ACCEPTED AND CLOSED.** Preserve accepted contracts and limitations. **WP5 architecture D1–D6 and WP5-A through I are approved. WP5-A is accepted and closed. WP5-B is accepted and closed. WP5-C planning/prerequisite review only is authorized; stop at the separate D5 architecture review gate before any C implementation or WP5-D.** See the [WP5 plan](builder-v1-wp5-plan.md), [gap review](builder-end-to-end-v1-gap-review.md) and [acceptance checklist](builder-end-to-end-v1-acceptance-checklist.md). All 40 end-to-end boxes remain unchecked.

## WP5-B final user acceptance and WP5-C planning gate — 2026-10-17

**BUILDER V1 WP5-B — ACCEPTED AND CLOSED**, by the user's explicit acceptance of the reported verification and browser evidence. This decision supersedes earlier pending-review instructions in this document; those entries remain historical. WP0–WP5-A contracts and limitations, including closed WP4 hidden-field semantics, remain intact. No accepted WP5-B scope is reopened.

Accepted reported evidence: **417/417 UI Platform, 760/760 Data Services, 146/146 editor/storage contracts and 29/29 focused checks**; builds, typechecks, production exclusion and documented real Builder/runtime browser interactions passed. Preserve successful, unsuccessful and transitional evidence, the original 351 historical evidence files and all WP5-B evidence/inventory snapshots. These are accepted prior results, not a new execution in the WP5-C planning increment.

The bounded native record-delete declaration, protected Dataset/primary-field resolution and DOE/I-AM authority checks, declared result state, honest missing/denied/stale/failed/committed outcomes and existing Form/service/expression/rendering compatibility remain accepted. Package/Platform definitions and Application instances remain separate.

Acceptance is limited to the WP5-B subsystem. Native API setup does not establish UI-only Application provisioning; native collision tests do not establish every Builder UI rejection path; closing Builder before runtime startup does not establish reliable simultaneous use. Legacy package entries expose only actual registered public contracts; no manifest-backed package Button exists. Complete Builder V1 acceptance remains pending and **all 40 A01–A40 umbrella requirements remain unchecked**.

The user authorizes **WP5-C planning and prerequisite review only**. See the [detailed WP5-C plan](builder-v1-wp5-c-plan.md), [separate D5 trusted service-contract proposal](builder-v1-wp5-c-d5-service-contract.md) and [planning verification](builder-v1-wp5-c-planning-verification.md). D5 is not approved by this closure. **STOP AT WP5-C D5 ARCHITECTURE REVIEW. Do not implement WP5-C/register services or begin WP5-D.** D6 contention remediation remains WP5-F, subject to separate admission/locking design review, with reliable simultaneous Builder/runtime operation required before WP5-I acceptance. A37 full management-restart/browser evidence remains WP6.

## Sequence and dependencies

Recommended order: **WP0 development onboarding contracts → WP1 workspace → WP2 editing lifecycle → WP3 data onboarding → WP4 authoring integration → WP5 diagnostics and safe testing → WP6 reference acceptance**. WP0 was the explicit prerequisite for new protected development Applications and is now accepted and closed. Its implemented ownership, administration, runtime and recovery contracts remain the baseline for subsequent work packages; no parallel agent execution is implied.

Dependency chain: WP1 depends on WP0 identity/owner contracts; WP2 on WP1 adapters; WP3 on WP0 and WP2; WP4 on WP1–WP3. WP4 is now closed. WP5 decisions/allocation are approved; current authorization is WP5-C planning/prerequisite review only, with a separate D5 architecture gate before implementation. WP6 requires all preceding implementation and acceptance gates. A package is complete only when its tests and review gate pass, not when a screen is present.

## WP0 — Development Application authority and host contracts (accepted and closed)

**Goal:** remove fixture-only integration assumptions without implementing production identity. **Effort: Medium**, potentially Large if existing trusted resource composition cannot serve new development Applications. Addresses G01/G02/G14 prerequisites.

- Included: map creation → stable app ID → explicit authorized role assignment → Dataset resource binding → session proxy → preview host; reconcile management and applied-resource resolvers; design onboarding status and failure recovery; define approved service catalog ownership; identify host configuration/origin/cookie requirements. Implement only the narrow development adapters after approval of this plan.
- Excluded: IdP, production sessions, automatic creator grants, client actor/credential authority, app-owned shared Components, new I-AM activation shortcut.
- Dependencies: accepted I-AM WP1–WP6, V1 sessions, Data Services applied-resource contract and Standard template.
- Acceptance: authorized platform creation followed by scoped administration of the new permanent Application ID; explicit role activation through accepted trusted path; deny unrelated app/forged actor/revoked User. Document partial-onboarding recovery without silent privilege escalation.
- Regression: management route coverage, identity/session invalidation, Dataset proxy trusted handoff, production exclusion and existing fixture behavior.
- Retained boundaries: accepted WP0 registration enables authorized new development Applications beyond the fixture. Separate authoritative resource ownership and explicit security provisioning remain required; no automatic creator grant or production identity support is implied.
- Gate: approve proposed development provisioning policy and concrete host adapter contract; production WP7 stays deferred.

## WP1 — Application workspace and artifact adapters (accepted and closed)

Authorized implementation completed and accepted by the user 2026-10-14; see [architecture](builder-v1-wp1-workspace-architecture.md), [verification](builder-v1-wp1-verification.md) and [inventory](builder-v1-wp1-files.txt). WP1 is closed. Retain Windows watcher/rename limitations and all WP0 security boundaries. At WP1 acceptance, WP2–WP6 had not begun; WP2 has since been accepted and closed as recorded below.

**Goal:** one Application workspace with multiple deduplicated open artifacts and one focused editor. **Effort: Medium**. Addresses G03/G06/G08 navigation.

- Included: owner-qualified identity/tab keys; adapters for Visual Page/Shell/Component/Form, composition Menu/settings/CSS, generic Dataset, Platform Trigger/Workflow; editor mount/focus/dispose and retained selection/internal-tab state; guarded close and Problems navigation interface. Form is a view of Component identity. Legacy Page source inspection remains an explicit fallback, not a competing normal Page editor.
- Excluded: browser-style history, full management self-hosting, format migrations, new registries.
- Dependencies: WP0 ownership/access contracts; existing plugin lifecycle and working-copy host.
- Acceptance: open A/B/A reuses A; exactly one editor focused; close B preserves A; retain selections and pending local edits; denied targets cannot be opened via direct tab commands; generic and Visual routes remain distinct.
- Regression: generic context/shell tests, plugin cleanup/failure isolation, stale open-response race, cross-app/shared-definition identity collision and identity suspension.
- Risks: existing editors close over mutable single selection, DOM and timers; adapters must extract retained state and clean subscriptions without saving/discarding implicitly.
- Gate: demonstrate workspace behavior with at least two artifact formats and a shared Form definition.

## WP2 — Consistent autosave and per-artifact Undo/Redo (accepted and closed)

**Status: BUILDER V1 WP2 — ACCEPTED AND CLOSED**, 2026-10-15, following user review of the completed implementation and verification. Accepted evidence: **362/362 UI Platform tests, 143/143 editor/storage contracts**, browser checks, build, typechecks and production exclusion. No additional implementation is authorized at this closure gate.

The accepted implementation supplies one two-second lifecycle across supported standalone/workspace editors; bounded per-artifact Undo/Redo; retained invalid drafts; authoritative normal validation and separate advanced repair; save/conflict/recovery states; original-identity inactive/queued authorization; Foundation multi-role transactions/recovery; coherent revision-pinned Visual dependencies with safe ordinary shared helper identities. Existing Page, Shell, Component/Form, Dataset/generic, automation, Menu, settings, style and presentation compatibility and WP0/WP1 security/workspace boundaries are preserved. See [verification and limitations](builder-v1-wp2-verification.md) and [inventory](builder-v1-wp2-files.txt). Source-level/service/browser acceptance remains distinct from the complete WP6 UI-only acceptance.

**Goal:** reliable local editing independent of focus and save completion. **Effort: Large**. Addresses G04/G05.

- Included: adapt existing two-second working-copy lifecycle to each accepted service; expected-checksum/hash conflict mapping; server candidate validation for normal saves; staged invalid state; common Saved/Saving/Unsaved/Conflict/Save Failed and Save Now; logical command history per artifact surviving autosave; explicit structural-operation coordination. Account for sequential Visual role writes and report partial failures honestly.
- Excluded: permanent version database, Git history/commits, automatic merging, changing accepted repair-save APIs to reject all invalid source.
- Dependencies: WP1; subsystem validators and existing service locks/atomic writers.
- Acceptance: 2–3 seconds inactivity; save only changed artifact; invalid candidate stays local; edits during save preserved; stale tokens rejected; undo after autosave and redo after focus switch; failed/invalid close retains copy; access revocation stops queued writes. Explicit repair save remains distinguishable from normal autosave.
- Regression: existing working-copy race/conflict/recovery tests plus multi-role candidate validation, rapid switches, undo command coalescing, slow save, format reconciliation and external-change recovery.
- Risks: client validity checks alone cannot enforce source policy; validating single roles independently can reject valid coordinated changes or save invalid intermediate state. Do not assume generic transaction guarantees apply to Visual bundles.
- Gate: prove pending invalid state never writes normal authoritative source and history survives autosave.

## WP3 — Dataset Authoring, Development Apply/Connect, and Runtime Integration

**Accepted for planning purposes, 2026-10-15.** Implementation and reported verification are documented in the [architecture](builder-v1-wp3-dataset-authoring.md) and [verification](builder-v1-wp3-verification.md). Machine evidence remains subject to independent confirmation. The scope below records the original target; unsupported relationships and other documented V1 limitations remain accepted without expansion. This does not authorize Dataset migration or multi-Dataset hosting.

**Goal:** connect UI-authored source to real protected development data. **Effort: Large**, highest uncertainty. Addresses G09/G10/G14.

- Included: focused Dataset fields/required rules/relationships only as supported by accepted schema; permanent Dataset/field identities; discover/connect existing applied Dataset; explicit development onboarding/apply state and supported confirmation; protected records view; Standard runtime data/Workflow proxy configuration; approved service availability. Provide creation through existing SchemaManager/application services where supported rather than extending the offline migration provider by assertion.
- Excluded: new schema store, generalized online migrations, unsupported type-change transformations, production apply/deployment and full Dataset Manager rewrite.
- Dependencies: WP0/WP2; published schema reader, applied resource binding, serving configuration, DOE/ORM.
- Acceptance: new or connected Dataset chosen through UI, no schema JSON paste; source/apply/runtime statuses are distinct; required-field rejection; read/create/update/delete persist and denied fields remain unchanged; same trusted User used by Builder and runtime; full preview works without reference launcher.
- Regression: schema compatibility, applied identity/owner and stale schema rejection, cross-app denial, unsupported migration blocking, host failure/restart and source-to-runtime freshness.
- Risks: current reference seeds publication, activation state, ORM and permissions in code; offline provider does not create Datasets. If existing onboarding cannot be safely exposed, report a blocker and revise scope at the gate rather than substitute a fixture.
- Gate: newly created Standard Application performs real protected data operations through normal managed runtime.

## WP4 — Visual Form authoring and protected submission (accepted and closed)

**BUILDER V1 WP4 — ACCEPTED AND CLOSED**, 2026-10-16, by the user following final hidden-field reconciliation review.

Accepted evidence: **387/387 UI Platform, 756/756 Data Services, 146/146 editor/storage contracts**; builds, typechecks, production exclusion and focused hidden-field renderer/protected persistence tests passed.

Conditional visibility alone does not exclude retained mapped values from submission. Host restrictions, operation applicability, read-only behavior, calculated-field persistence and DOE/I-AM authorization retain separate semantics; mandatory Dataset validation is preserved.

Retain the concurrent source-reader contention limitation. Closing Builder before Application startup is not proof of contention-free simultaneous operation. WP3 restart tests plus WP4 Application reload suffice for WP4; A37 full management-restart/browser evidence remains required at final acceptance.

Accepted scope, decisions and evidence remain in the [WP4 plan](builder-v1-wp4-plan.md), [architecture](builder-v1-wp4-form-authoring.md), [verification](builder-v1-wp4-verification.md), [hidden-field reconciliation history](builder-v1-wp4-hidden-field-reconciliation.md) and their original inventories/evidence. Do not reopen or expand WP4 without a separately reviewed reason. Deferred composition/automation work remains outstanding.

## WP5 — WP5-A/B accepted and closed; WP5-C planning and D5 review

**WP5 ARCHITECTURE APPROVED — IMPLEMENTATION AUTHORIZED**, 2026-10-17. WP5-A and WP5-B are accepted and closed. Current authorization is WP5-C planning and separate D5 architecture review only. The [WP5 plan](builder-v1-wp5-plan.md) defines scope, reuse, architectural gaps/solutions, acceptance criteria, risks and decisions D1–D6.

The approved allocation completes deferred UI-only controls before WP6: WP5-A validator/catalog contracts; B Page/Shell/palette/public instance/binding/Admin controls; C Trigger/Workflow/invocation; D Menu/branding; E Problems/navigation/refresh; F nonpersisting focused preview; G isolated protected tests; H existing Release integration; I pre-WP6 readiness review. This approved allocation retains verification and acceptance gates for every increment. See [WP5-A architecture](builder-v1-wp5-a-diagnostic-foundation.md) and [verification](builder-v1-wp5-a-verification.md).

Dependencies: accepted WP0–WP4 contracts/limitations, authoritative validators/renderers/DOE/I-AM, source/publish admission and approved registered services. No second renderer, schema, expression, authorization or publishing authority; no Dataset migration or multi-Dataset hosting. Retain every umbrella requirement and separate subsystem acceptance from final UI-only proof.

## WP6 — UI-only reference Application and acceptance

**Goal:** prove the full developer journey using the ordinary Builder and managed runtime. **Effort: Medium**, following prior gates. Addresses G20; closes all checklist items.

- Included: Customer/Person development Application created from Standard template; Public registration and Admin record management; Public/Admin Shells and Menus; Package Card/Button and shared Platform summary/Form; Person Dataset; lifecycle Trigger and ordered activation Workflow; Form/Page invocation; branding/logo/theme; approved role setup; isolated focused tests; full navigation, protected CRUD and validation.
- Excluded: production release/deployment, external notifications, custom service source authoring, test fixtures assembling reference resources.
- Dependencies: all earlier gates.
- Acceptance: independent operator completes checklist from empty new-app state with no manual source edits/CLI assembly; evidence includes UI recording, artifact identities, saved source inventory, actual persisted create/update/delete/read and denied-operation unchanged bytes. No Application Publish needed. Restart/reopen proves source authority and runtime persistence.
- Regression: targeted contracts and browser suites, complete Platform regression, relevant Data Services regression when adapters affect that boundary, typecheck/build and production editor exclusion. Keep documented Windows watcher limitations visible; do not weaken assertions or treat environment failures as passes.
- Risks: a scripted fixture can hide missing UI steps; provenance ledger must identify every preparatory action, resource and privilege.
- Gate: independent acceptance review; all mandatory checklist rows evidenced. Programmatic assembly alone is insufficient.

## Reference evidence protocol and review gates

Environment installation, trusted development host bootstrap and predefined development Users are allowed prerequisites and must be disclosed. They may not silently precreate the reference Application, Dataset, Form, Menu, Trigger, Workflow, roles or links that the journey claims to author. Any necessary preapproved service implementation is disclosed and selected via UI. Reference data tests use deterministic local effects; no external notification is required.

Record each action as **Builder UI**, **direct source edit**, **CLI**, or **fixture/host bootstrap**. UI interaction with raw source text counts as source authoring for the primary acceptance assumption. Every source/CLI dependency becomes a gap unless explicitly reviewed and deferred. Record screenshots/recording with artifact IDs, server diagnostics, persisted records and denial results; evidence may redact sensitive paths/data but must remain reproducible.

Relative total effort: **Large**; no calendar estimate is defensible before WP4 contract reconciliation and review. Small work includes grouping/labels and Release placement; these do not offset the large data, lifecycle and validation work. Review at each package gate and stop on discovered architectural prerequisites instead of broadening scope silently.

**STOP: WP0–WP2 remain accepted and closed. WP3 remains accepted for planning purposes, with machine evidence subject to independent confirmation and V1 limitations retained. BUILDER V1 WP4 — ACCEPTED AND CLOSED. WP5 architecture and allocation are approved. Stop at the WP5-C D5 architecture review gate; do not implement WP5-C or begin WP5-D/WP6. Complete UI-only acceptance remains pending.**

The [umbrella scope ledger](builder-end-to-end-v1-acceptance-checklist.md#deferred-program-scope-after-wp4) retains deferred requirements and maps the approved pre-WP6 allocation. WP3 restart plus WP4 reload suffice for WP4 only; A37 full management-restart/browser verification remains mandatory. Concurrent source-reader contention remains documented.

WP5-A review decision, 2026-10-17: **BUILDER V1 WP5-A — ACCEPTED AND CLOSED**, 2026-10-17, by user review of the diagnostic foundation and final reported evidence. WP5-B is authorized under the approved architecture, with existing Component reuse mandatory. Stop at WP5-B verification/review and do not automatically begin WP5-C. The [WP5-B inventory and contract review](builder-v1-wp5-b-component-reuse.md) records the discovered Admin target blocker; UI implementation is stopped for architectural review.

The normal-host service contract and concurrent graph-lock contention remain open. Before WP5-C, submit a proposed typed, authorized, trusted registration contract for the existing reference.notification candidate (or another existing approved service) for review; do not invent/register services. D6 remediation planning is allocated to WP5-F, with admission/locking design review before implementation and reliable simultaneous Builder/runtime operation required before WP5-I acceptance. A37 full management-restart/browser evidence remains in WP6.

## Historical WP5-B implementation and verification review gate — 2026-10-17

The user approved the bounded native single-record delete adapter after the documented Component inventory and expression-contract probe. **WP5-B is implemented and verified, pending user review; it is not accepted or closed. STOP AT WP5-B VERIFICATION/REVIEW. WP5-C has not begun.** See [architecture and retained review history](builder-v1-wp5-b-component-reuse.md), [verification and browser evidence](builder-v1-wp5-b-verification.md), and [changed-file inventory](builder-v1-wp5-b-files.md).

Final reported evidence: **417/417 UI Platform, 760/760 Data Services, 146/146 editor/storage contracts, 29/29 focused WP5-A/WP5-B checks**, builds, typechecks and production exclusion passed. The actual Builder browser journey authors two Shells, Regions, Pages/routes, installed Card settings/slots/events, independent shared Component/Form consumers, route-bound protected Form read/edit and explicit single-record delete. Native collision, identity, denial, revocation and unchanged-definition checks pass. These results do not establish complete Builder V1 acceptance.

WP0–WP5-A historical records and unsuccessful/transitional WP5-B evidence are retained. All 351 prior evidence files match their original bytes after compatibility runs; all 40 umbrella requirements remain unchecked. WP4 and WP5-A remain accepted and closed. D5 trusted normal-host service-contract review remains required before WP5-C; D6 admission/locking design review and remediation remain WP5-F, with simultaneous-use reliability required before WP5-I. Closing Builder before runtime startup is not concurrency proof. A37 full management-restart/browser evidence remains WP6. No WP5-C, WP5-F or WP6 implementation is authorized by this review record.

## WP5-C implementation authorization and review boundary — 2026-10-17

**D5.1–D5.6 APPROVED; WP5-C C1–C5 IMPLEMENTATION AUTHORIZED** by explicit user decision. This supersedes earlier planning-only D5 gate entries, retained as history. C1–C4 implementation and C5 verification are recorded in the [implemented architecture](builder-v1-wp5-c-implementation.md) and [verification record](builder-v1-wp5-c-verification.md). **STOP AT WP5-C IMPLEMENTATION VERIFICATION/REVIEW. Do not begin WP5-D.** WP5-C is not accepted or closed by subsystem results. WP4/WP5-A/WP5-B remain closed; D6 remains WP5-F under separate review and A37 full restart/browser evidence remains WP6. All A01–A40 umbrella requirements remain unchecked.

## WP5-C verification/review gate — 2026-10-17

**WP5-C C1–C5 IMPLEMENTED AND VERIFIED; USER REVIEW REQUIRED. NOT ACCEPTED OR CLOSED.** D5.1–D5.6 approval remains current; earlier STOP AT D5 planning wording is historical. Final completed evidence: **446/446 UI Platform (63 files), 760/760 Data Services, 146/146 editor/storage contracts**, builds/typechecks/production exclusion and actual Builder/browser authoring, protected execution and independent permission/preview/transport checks. The full UI command is serial with explicit test/hook limits and one configured retry. Failed/transitional reports and bounded operator recovery of an interrupted test lock remain documented, rather than claimed as clean first attempts.

See [implemented architecture](builder-v1-wp5-c-implementation.md), [verification/history](builder-v1-wp5-c-verification.md) and [changed-file inventory](builder-v1-wp5-c-files.md). All 351 historical and 157 WP5-B evidence files, their original hashes and earlier accepted records are preserved. All 40 umbrella requirements remain unchecked. WP4/WP5-A/WP5-B remain closed. Native setup is not UI-only provisioning proof; no package Button or unsupported metadata is fabricated. **STOP AT WP5-C IMPLEMENTATION VERIFICATION/REVIEW. No WP5-D.** D6 remains WP5-F under separate design review; reliable simultaneous use remains required before WP5-I. A37 full management restart remains WP6. Complete Builder V1 acceptance remains pending.


## WP5-D implementation verification/review gate

WP5-C remains **ACCEPTED AND CLOSED**. WP5-D Menu and Branding Authoring is implemented and ready for review: final UI Platform **453/453**, Data Services **760/760**, editor/storage contracts **146/146**, focused contracts/browser **7/7**; builds, typechecks and production exclusion passed. Actual Builder authoring and Public/Admin runtime evidence, unsuccessful attempts, limitations and hashes are in the [D verification record](builder-v1-wp5-d-verification.md), [architecture](builder-v1-wp5-d-implementation.md) and [changed-file inventory](builder-v1-wp5-d-files.md). All 591 prior evidence files retain their original hashes, including the 351 historical, 157 WP5-B, three C-planning and 80 C files. Historical machine review snapshots are retained without rewriting their original acceptance flags.

**WP5-D is not accepted or closed by subsystem results. STOP AT WP5-D IMPLEMENTATION VERIFICATION/REVIEW. Do not begin WP5-E.** D6 remains WP5-F under separate architecture review, A37 remains WP6, and all A01–A40 umbrella requirements remain unchecked. Complete Builder V1 acceptance remains pending.
