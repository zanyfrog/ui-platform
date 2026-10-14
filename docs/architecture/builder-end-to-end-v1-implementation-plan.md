# Builder End-to-End V1 — Implementation Plan

Date: 2026-10-13. Status: proposed, not executed. Basis: [gap review](builder-end-to-end-v1-gap-review.md). IDs below map directly to its gap register and the [acceptance checklist](builder-end-to-end-v1-acceptance-checklist.md).

## Sequence and dependencies

Recommended order: **WP0 development onboarding contracts → WP1 workspace → WP2 editing lifecycle → WP3 data onboarding → WP4 authoring integration → WP5 diagnostics and safe testing → WP6 reference acceptance**. WP0 is an explicit prerequisite because the accepted fixture-only identity and Standard runtime cannot support a newly created protected Application. Workspace work may proceed after its interfaces are agreed; no parallel agent execution is implied.

Dependency chain: WP1 depends on WP0 identity/owner contracts; WP2 on WP1 adapters; WP3 on WP0 and WP2; WP4 on WP1–WP3; WP5 may begin validator mapping after WP0 but completes after WP3/WP4; WP6 requires all earlier gates. A package is complete only when its tests and review gate pass, not when a screen is present.

## WP0 — Development Application authority and host contracts

**Goal:** remove fixture-only integration assumptions without implementing production identity. **Effort: Medium**, potentially Large if existing trusted resource composition cannot serve new development Applications. Addresses G01/G02/G14 prerequisites.

- Included: map creation → stable app ID → explicit authorized role assignment → Dataset resource binding → session proxy → preview host; reconcile management and applied-resource resolvers; design onboarding status and failure recovery; define approved service catalog ownership; identify host configuration/origin/cookie requirements. Implement only the narrow development adapters after approval of this plan.
- Excluded: IdP, production sessions, automatic creator grants, client actor/credential authority, app-owned shared Components, new I-AM activation shortcut.
- Dependencies: accepted I-AM WP1–WP6, V1 sessions, Data Services applied-resource contract and Standard template.
- Acceptance: authorized platform creation followed by scoped administration of the new permanent Application ID; explicit role activation through accepted trusted path; deny unrelated app/forged actor/revoked User. Document partial-onboarding recovery without silent privilege escalation.
- Regression: management route coverage, identity/session invalidation, Dataset proxy trusted handoff, production exclusion and existing fixture behavior.
- Risks: a hardcoded fixture restriction exists in the main server, not only seed data. Separate resource ownership resolution must remain authoritative. Review implementation scope if enabling arbitrary Applications exposes unsupported host assumptions.
- Gate: approve proposed development provisioning policy and concrete host adapter contract; production WP7 stays deferred.

## WP1 — Application workspace and artifact adapters

**Goal:** one Application workspace with multiple deduplicated open artifacts and one focused editor. **Effort: Medium**. Addresses G03/G06/G08 navigation.

- Included: owner-qualified identity/tab keys; adapters for Visual Page/Shell/Component/Form, composition Menu/settings/CSS, generic Dataset, Platform Trigger/Workflow; editor mount/focus/dispose and retained selection/internal-tab state; guarded close and Problems navigation interface. Form is a view of Component identity. Legacy Page source inspection remains an explicit fallback, not a competing normal Page editor.
- Excluded: browser-style history, full management self-hosting, format migrations, new registries.
- Dependencies: WP0 ownership/access contracts; existing plugin lifecycle and working-copy host.
- Acceptance: open A/B/A reuses A; exactly one editor focused; close B preserves A; retain selections and pending local edits; denied targets cannot be opened via direct tab commands; generic and Visual routes remain distinct.
- Regression: generic context/shell tests, plugin cleanup/failure isolation, stale open-response race, cross-app/shared-definition identity collision and identity suspension.
- Risks: existing editors close over mutable single selection, DOM and timers; adapters must extract retained state and clean subscriptions without saving/discarding implicitly.
- Gate: demonstrate workspace behavior with at least two artifact formats and a shared Form definition.

## WP2 — Consistent autosave and per-artifact Undo/Redo

**Goal:** reliable local editing independent of focus and save completion. **Effort: Large**. Addresses G04/G05.

- Included: adapt existing two-second working-copy lifecycle to each accepted service; expected-checksum/hash conflict mapping; server candidate validation for normal saves; staged invalid state; common Saved/Saving/Unsaved/Conflict/Save Failed and Save Now; logical command history per artifact surviving autosave; explicit structural-operation coordination. Account for sequential Visual role writes and report partial failures honestly.
- Excluded: permanent version database, Git history/commits, automatic merging, changing accepted repair-save APIs to reject all invalid source.
- Dependencies: WP1; subsystem validators and existing service locks/atomic writers.
- Acceptance: 2–3 seconds inactivity; save only changed artifact; invalid candidate stays local; edits during save preserved; stale tokens rejected; undo after autosave and redo after focus switch; failed/invalid close retains copy; access revocation stops queued writes. Explicit repair save remains distinguishable from normal autosave.
- Regression: existing working-copy race/conflict/recovery tests plus multi-role candidate validation, rapid switches, undo command coalescing, slow save, format reconciliation and external-change recovery.
- Risks: client validity checks alone cannot enforce source policy; validating single roles independently can reject valid coordinated changes or save invalid intermediate state. Do not assume generic transaction guarantees apply to Visual bundles.
- Gate: prove pending invalid state never writes normal authoritative source and history survives autosave.

## WP3 — Dataset authoring, development apply/connect and runtime wiring

**Goal:** connect UI-authored source to real protected development data. **Effort: Large**, highest uncertainty. Addresses G09/G10/G14.

- Included: focused Dataset fields/required rules/relationships only as supported by accepted schema; permanent Dataset/field identities; discover/connect existing applied Dataset; explicit development onboarding/apply state and supported confirmation; protected records view; Standard runtime data/Workflow proxy configuration; approved service availability. Provide creation through existing SchemaManager/application services where supported rather than extending the offline migration provider by assertion.
- Excluded: new schema store, generalized online migrations, unsupported type-change transformations, production apply/deployment and full Dataset Manager rewrite.
- Dependencies: WP0/WP2; published schema reader, applied resource binding, serving configuration, DOE/ORM.
- Acceptance: new or connected Dataset chosen through UI, no schema JSON paste; source/apply/runtime statuses are distinct; required-field rejection; read/create/update/delete persist and denied fields remain unchanged; same trusted User used by Builder and runtime; full preview works without reference launcher.
- Regression: schema compatibility, applied identity/owner and stale schema rejection, cross-app denial, unsupported migration blocking, host failure/restart and source-to-runtime freshness.
- Risks: current reference seeds publication, activation state, ORM and permissions in code; offline provider does not create Datasets. If existing onboarding cannot be safely exposed, report a blocker and revise scope at the gate rather than substitute a fixture.
- Gate: newly created Standard Application performs real protected data operations through normal managed runtime.

## WP4 — Palette, properties, automation and create/link flows

**Goal:** author the reference Application's composition and behavior entirely through controls. **Effort: Large**. Addresses G06–G13/G18.

- Included: existing unified insertion upgraded with Content/Package/Platform/Forms grouping; public instance properties/bindings/events/slots, visibility and layout using existing contracts; Edit Definition; Form Dataset/mode/operation/record mapping/submission; route controls; Menu destinations; approved Trigger/Workflow action inputs and pickers; cross-artifact create-and-link with origin preservation; assets/branding/theme controls.
- Excluded: second Form artifact/registry, Application Component ownership, arbitrary service code creation, workflow graph/branching, advanced theme designer and broad expression language.
- Dependencies: WP1–WP3; accepted component metadata, automation source and runtime.
- Acceptance: shared Form instance edits do not mutate definition; definition focus returns to original Page; create Dataset from Form and link after valid save; cancel/stale origin handled; Form success and Page button invoke permanent Workflow ID; Menu navigation and route parameters work; no source-panel editing in primary reference journey.
- Regression: private internals, public contract validation, mandatory Form rule precedence, stable IDs, ordered automation, unknown service/Workflow, disabled definition, reference-aware deletion, cross-app/Platform authority.
- Risks: runtime supports more than inspector; keep supported UI subset explicit. Shared Platform changes affect multiple consumers and need dependency refresh/diagnostics.
- Gate: complete composition/data/automation authoring walkthrough through controls, with no resource assembly via fixtures.

## WP5 — Application Problems, focused preview and isolated tests

**Goal:** usable diagnostics and safe artifact testing over actual runtime/engines. **Effort: Large**. Addresses G15–G17/G19.

- Included: aggregate existing subsystem validators without duplicating rules; preserve all severities/codes/locations; stable navigation target and artifact fallback; save-driven dependency invalidation; full on-demand and pre-Publish validation; focus-following saved-source preview; Menu/theme/sample Shell adapters; disposable Dataset/Workflow/Trigger execution environment and deterministic approved service substitutes; minimal Application Release area retaining publisher/rollback.
- Excluded: parallel renderer, durable audit/retry system, production test writes, new release product, automatic Git commits.
- Dependencies: WP0, WP3/WP4 completed for test-host wiring and complete dependency graph.
- Acceptance: simultaneous independent errors all reported; warning/info do not block ordinary editing; reachable errors block Publish; diagnostics jump to node/field/step when provided; artifact-only fallback honest; focused tests leave ordinary development and production stores unchanged; full Application Preview reads development source before Publish; published snapshot remains unchanged.
- Regression: missing Shell/Route/Menu/Component/Dataset/Workflow/service/assets, invalid source/conflicts, shared dependency invalidation, disabled/unknown actions, workflow earlier commits, afterCommit committed failure, isolation target tampering and external-service suppression.
- Risks: composition throws early; adapting only the top exception cannot aggregate. Separate test storage is mandatory because Workflow and afterCommit behavior cannot be made safe by wrapping everything in a fake rollback.
- Gate: demonstrate safe mutation tests and actionable multi-subsystem Problems before release gating is considered complete.

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

Relative total effort: **Large**; no calendar estimate is defensible before WP0/WP3 contracts are validated. Small work includes grouping/labels and Release placement; these do not offset the large data, lifecycle and validation work. Review at each package gate and stop on discovered architectural prerequisites instead of broadening scope silently.

**STOP: this is a plan. No proposed package was executed in this audit.**
