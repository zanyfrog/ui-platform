# Builder V1 WP5 — Planning and Architecture Reconciliation

2026-10-17. **WP5 ARCHITECTURE APPROVED — IMPLEMENTATION AUTHORIZED. D1–D6 and WP5-A through WP5-I approved by the user. WP5-A is accepted and closed by user review. WP5-B is authorized; stop at its verification/review gate and do not automatically begin WP5-C.**

**BUILDER V1 WP4 — ACCEPTED AND CLOSED** by the user. Preserve WP0–WP3 contracts, WP3 planning acceptance and its evidence qualification, WP4 evidence and hidden-field reconciliation. Do not reopen WP4 without a separately reviewed reason. All 40 [umbrella acceptance requirements](builder-end-to-end-v1-acceptance-checklist.md) remain unchecked; package acceptance does not establish complete Builder V1 acceptance.

## Scope and exclusions

WP5 originally covered Problems, focused preview, isolated tests and minimal Release integration. The user approved explicit WP5-A through WP5-I increments for deferred UI authoring before WP6. Do not create a separate WP5B unless a later review identifies a necessary architectural split. WP6 should demonstrate an already implemented journey, rather than become an unplanned implementation package.

Approved scope: complete supported Page/Shell/Component composition controls, categorized palette, public instance bindings/slots/events, typed Trigger/Workflow authoring and invocation, Menu destinations, asset/theme linking; aggregate existing validators into Problems; preview saved revisions through existing renderers; explicitly test protected operations in isolated storage; gate existing Publish with authoritative validation. Reuse WP1 navigation and WP2 working copies throughout.

Exclude new artifact formats or persistence authorities, authorization/schema/expression engines, Dataset migration or multi-Dataset hosting, unsupported Dataset relationships, arbitrary service/custom-code authoring, production test writes, deployment products, automatic Publish/Git operations, durable automation audit/retry systems and automatic rollback of already committed workflow actions. Accepted Date/JSON handling and Form calculation/visibility contracts remain intact. Advanced source remains available but cannot substitute for primary UI-only acceptance controls.

## Existing services and contracts to reuse

Paths below are repository-relative; Data Services is the sibling repository.

| Concern | Existing authority / implementation | Integration boundary |
| --- | --- | --- |
| Editing and navigation | `src/shared/builder-workspace.ts`, existing workspace/adapters, `src/client/artifact-editor/working-copy.ts` | Owner-qualified permanent identities, node/field/step/section targets, honest artifact fallback, common autosave/Undo/Redo/conflict lifecycle. No second editor lifecycle. |
| Generic validation | `packages/artifacts/src/validation/validate-artifact.ts`, `validator-registry.ts`, `validate-references.ts`; `src/server/artifact-editor.ts` | Preserve structured diagnostics, registry rules and source locations. Validate through authorized services. |
| Visual candidate validation | `packages/visual-artifacts/src/validation.ts`; `src/server/visual-candidate.ts` | Existing metadata, Form, public interface, dependency and role syntax checks; coherent candidate admission and dependency rechecks. |
| Composition | `src/server/application-composition.ts`; `packages/visual-artifacts/src/composition-validation.ts` | Routes, Shells/Regions, Menu destinations, assets/themes; existing explicit Shell remapping and expected hashes. |
| Dataset validation and runtime | `src/server/dataset-development.ts`, existing Dataset editor; sibling Dataset Operations schema/application/bootstrap, DOE, ORM and I-AM | Distinguish draft, applied and connected schema. Mandatory Dataset validation and permissions remain authoritative. No new schema validator. |
| Automation | `src/shared/automation.ts`, `src/server/automation-store.ts`, `automation-runtime.ts` | Existing diagnostics, permanent IDs, ordered actions, phase/scope and protected execution. Retain bounded value references and failure/commit semantics. |
| Catalogs | `src/server/component-registry.ts`, `unified-package-catalog.ts`, actual host-registered services | Installed Component metadata drives insertion/props. Package management listings alone do not establish a renderable Component or callable service. |
| Rendering and focused preview | `src/server/visual-preview.ts`, `src/client/visual-artifacts/preview.ts`, `packages/visual-artifacts/src/runtime*.ts` and composition runtime | Revision-pinned coherent graph; same rendering logic as development/published consumers. Existing Form preview UI is the mode-separation model. |
| Managed Application preview | `src/server/preview.ts`, existing Standard runtime and application data proxy | Normal running Application uses protected connected development storage; it is distinct from design preview and isolated tests. |
| Isolated Form testing | `src/server/form-submission-testing.ts`, `builder-development-host.ts` | Reuse qualified test sessions, fresh development Dataset bootstrap, server-side identity checks, DOE/ORM and explicit disposal. General automation testing is a gap, not an existing feature. |
| Publishing | `src/server/application-presentation.ts`, `composition-snapshots.ts`, `visual-source-plan.ts` | Existing publish/rollback, source fingerprints, immutable closure/assets, admission and partial-write reporting. Integrate a gate into the existing publisher. |
| Dependency graph | `packages/artifacts/src/application/graph.ts`, existing Visual/composition/automation references | Generic reachability is useful but does not already unify every source format. Add adapters rather than synthetic competing manifests. |

## Architecture and gaps

### One diagnostic view over existing validators

Define an aggregation envelope carrying severity, original code/message, owner-qualified artifact identity, source revision, subsystem and optional node/field/step/location. Preserve native details; do not invent precision. Invalid/unreadable source produces a diagnostic and permits independent validators to continue. Access-denied sources must not leak another owner's contents. Distinguish validation failure from incomplete validation and stale results.

Composition validation and parts of candidate preparation currently throw on the first failure. Catching one top-level exception cannot satisfy A33. Refactor reporting within the owning validator where needed to collect independent errors while retaining the same authoritative checks for saves and Publish. Cross-source adapters resolve existing permanent references; they do not copy rules into a new validation engine.

Maintain revision-qualified dependency edges across Page, Shell, Component/Form, Menu/settings/assets, Dataset and automation. Successful saves invalidate affected consumers; local invalid drafts remain local and clearly labeled. Background validation must not save, rewrite, discard or focus another working copy. Discard stale asynchronous results. Full on-demand validation remains available when incremental completeness is uncertain.

Approved D2 release policy: show all authorized Application diagnostics, but block Publish on errors or incomplete validation in its complete reachable release closure. Disabled/unreferenced drafts remain visible without silently entering the published closure. Verify complete root/reference discovery and server-side admission during WP5-E/H. Runtime dependencies that are validated but not copied by the existing publisher must be labeled explicitly; do not claim every Application service is versioned by a presentation snapshot.

### Deferred UI controls use existing source models

Page/Shell controls edit existing route/Region definitions, enforce collisions and require explicit mapping when switching Shells. Palette entries come from installed implementations and authorized shared definitions. Public interface metadata drives typed properties, bindings, mode, slots and event targets; definition/private content remains separate from instance edits. Reuse existing metadata expressions and the accepted shared calculation contract only where applicable.

Automation controls project the existing bounded `AutomationValue` contract: literal, explicit record/oldRecord/newRecord/context path, or named fields. They are not a second calculation language. Dataset fields, action kinds, phases/scopes and approved service signatures drive typed controls; unsupported source is explained rather than silently converted. Workflow invocation uses permanent IDs and existing event/runtime services. Failure results show failed step, earlier commits and afterCommit failure without automatic retry.

Menu controls choose existing Page/Route identities and supported parameter bindings. Branding uses existing asset upload/settings/theme paths with explicit selection and representative samples. Admin read/edit/delete controls reuse existing protected adapters and route/record binding metadata. No new CRUD or policy engine is needed.

The normal host currently constructs an empty registered automation-service map. A general usable service catalog cannot be asserted from the service interface alone. Expose only actually registered, approved host services with their existing contracts; unsupported/unknown services fail closed. Any reference service implementation and permissions are disclosed prerequisites, not hidden fixtures (D5).

### Preview and explicit tests have separate capabilities

Three modes must be explicit:

1. **Design preview:** saved coherent revision, actual renderer, sample props/regions/routes; no persisted submissions or service effects. Retain WP4 design behavior with executable custom functions disabled. Omitting a service object is not a sandbox for arbitrary JavaScript.
2. **Isolated development test:** explicit start/run/end, visible isolated target, protected services against fresh test storage and approved deterministic service substitutes. No ordinary development/production records or live external effects.
3. **Running Application:** ordinary managed runtime with its existing protected development services and persisted submissions. Publish is unnecessary for development iteration.

The existing generic preview iframe can receive live development services when neither design mode nor a test session is selected. Therefore generic focused preview cannot be declared nonpersisting without explicit capability routing. Extend the existing mode contract and adapters; do not change the renderer or treat labels as isolation. Menu/theme samples and Shell sample Regions use the same composition logic. Failed revision capture shows a bounded busy/error state; never substitute an unreported stale revision.

Extend isolated testing through existing bootstrap/DOE/ORM/automation services, preserving the accepted one-Dataset host limit. The existing Form host uses an empty automation catalog and alone cannot prove Trigger/Workflow behavior. Automation tests require captured authorized definitions, isolated registries/publications and permitted deterministic services. Bind test capability to User, Application, Dataset, automation identity, revision and mode; recheck authority and targets server-side at execution. Seeds must be explicit and protected; do not copy real records implicitly. Dispose capabilities/hosts; retained diagnostic files follow the existing disclosed cleanup policy.

Report transaction boundaries honestly: before-phase rejection, protected field denial, earlier successful workflow commits and afterCommit failure remain distinct. Do not simulate safety with a fake whole-workflow rollback. Multi-Dataset definitions are unsupported in this bounded host and must be rejected/explained rather than remapped (D4).

### Validate through the existing publishing authority

Minimal Release UI invokes existing publication/rollback contracts. Add authoritative validation before the publisher's first publication side effect; direct requests must receive the same gate. Capture dependency revisions and recheck authority/fingerprints at admission so source changes cannot bypass validation. Respect existing lock order and avoid nested reentrant locks. If source changes, fail/revalidate explicitly; do not silently publish the older validated graph.

Preserve published snapshot immutability, composition/shared Component closure, assets, expected checksums and honest partial-source failure reporting. Do not include test stores or live Dataset records in a presentation snapshot. A38/A39 require focused release tests; the final reference Application need not be published.

## Approved work packages and dependencies before WP6

Every increment below is architecturally approved, with implementation and verification in dependency order. The current user review closes WP5-A and authorizes WP5-B with a verification/review gate before WP5-C. At each gate provide affected regression/contracts/build evidence, actual browser interactions, changed-file inventory and limitations. Stop for review on a new authority/format/runtime prerequisite rather than expanding scope.

| Increment | Deliverable and umbrella allocation | Dependencies / verification gate |
| --- | --- | --- |
| WP5-A — contracts and diagnostic foundation | Native validator/reachability adapters, diagnostic envelope and catalog contracts; baseline accepted WP0–WP4 behavior. A33 foundation. | D1–D6 approved 2026-10-17. Gate: multiple independent invalid artifacts collected without rule duplication or source leakage; stale/incomplete results explicit. |
| WP5-B — composition and public instance authoring | Shells/Regions, Pages/routes/remapping; installed palette; supported typed props, bindings, mode, slots/events; shared definition/return and second consumer; Admin record binding/actions. A11–A15, A21–A22. | A; existing WP1/WP2/WP4 adapters. Gate: UI-only two-Shell authoring, stable IDs, instance/definition separation, route collisions/remapping and protected action targets. |
| WP5-C — automation authoring and invocation | Typed Trigger/Workflow fields/actions/service selection; Form success/Page button invocation and failure result inspection. A24–A27; event completion for A14. | A, B event/binding controls; approved service contracts. Gate: no raw action JSON in supported journey; permanent targets, deterministic ordering, denied/unknown services and honest committed failure. |
| WP5-D — Menu and branding authoring | Nested destination/parameter pickers; logo/asset/theme selection using existing settings/assets. A28–A29. | A, B route/Shell identities. Gate: both Shells consume nested Menu and portable assets, retained IDs and authorized writes. |
| WP5-E — Problems UI and refresh | Application Validate, native locations with fallback, dependency invalidation. A33–A35. | A plus B–D source adapters. Gate: simultaneous errors, accurate navigation, save-driven refresh, revocation and stale-result rejection without touching unrelated drafts. |
| WP5-F — focused design preview | Page/Shell/Component/Form/Menu/theme samples through existing renderer and explicit nonpersisting mode. A30–A31; A29 appearance. | B, D; A/E coherent validation status. Gate: saved revision/focus correctness, representative samples, no storage or external effect, shared renderer parity. |
| WP5-G — isolated protected tests | Dataset records, Workflow and Trigger test hosts, explicit service substitutes and failure inspection. A32, A27. | A, C, existing WP3/WP4 test/bootstrap contracts; D4/D5 resolved. Gate: success/denial/mandatory validation/earlier commits/afterCommit, target tampering/revocation, normal stores unchanged and no live external calls. |
| WP5-H — existing Release integration | Minimal Release area and server-side Publish gate with revision rechecks. A38–A39. | E, F/G relevant contracts; B–D reference closure. Gate: direct-request bypass denied, unreachable policy honored, race rejection, published bytes unchanged by later draft editing. |
| WP5-I — pre-WP6 readiness review | Integrated supported authoring/preview/test/Release browser evidence, regression/build/typecheck/production exclusion, inventory and remaining-gap ledger. | B–H reviewed. Gate: explicit package acceptance and review of final journey prerequisites; no assertion that all 40 rows passed. |

B and C/D have explicit interface dependencies; parallel implementation is not assumed. E's foundational adapters begin in A, but its final coverage requires B–D. All approved increments finish and are reviewed before WP6 begins.

A01–A10, A16–A20 and A23 reuse accepted subsystem contracts; they still require final UI-only journey evidence. A17 retains accepted unsupported relationship/migration limits: no silently invented support or checked box. A36–A37 and A40 belong to WP6 integration/evidence, including full management-restart/browser verification. WP3 restart plus WP4 reload are sufficient only for the closed WP4 package.

## End-to-end WP5 acceptance criteria (approved; unchecked)

- [ ] Supported deferred authoring can be completed through ordinary controls without source/action/schema JSON; permanent identities, WP2 drafts/history and accepted security boundaries survive.
- [ ] Two Shells, explicit Page routes/Region mapping, installed/shared palette entries, two Form consumers, typed instance bindings/slots/events and parameterized protected Admin operations work together.
- [ ] Typed Trigger/Workflow authoring, approved service selection and both invocation surfaces use existing contracts; unknown targets/services fail closed; committed failures are accurate.
- [ ] Nested Menus and portable logo/theme assets are authored and previewed through actual composition rendering.
- [ ] Application Validate reports multiple independent subsystem problems, preserves severities/locations and incomplete status, navigates honestly and refreshes affected dependents after saves.
- [ ] Focused preview shows its captured saved revision and never persists or performs external effects. Custom-function policy and sample-data limitations are visible.
- [ ] Explicit isolated Dataset/Trigger/Workflow tests use existing protected services with mandatory schema validation; target tampering, identity revocation and unsupported multi-Dataset targets fail closed. Normal development/production stores remain unchanged.
- [ ] Isolated tests preserve protected calculation/visibility semantics, before-phase rejection, earlier workflow commits and afterCommit failure without retrying effects or claiming global rollback.
- [ ] Existing Publish is gated server-side by complete current closure validation; source/authority races reject safely. Later development saves leave published bytes unchanged.
- [ ] Affected UI Platform/Data Services regressions and editor/storage contracts, builds/typechecks and production exclusion pass; browser interactions and changed-file inventory are delivered. Failed/limited evidence remains explicit. Broaden runs only as required by affected boundaries and acceptance gates.
- [ ] All 40 umbrella rows remain pending until independently evidenced in the final journey; no raw-source/fixture step silently substitutes for UI authoring. WP5 review and complete Builder V1 acceptance remain distinct.

## Approved decisions and retained risks

| Decision | Approved resolution | Risk / consequence |
| --- | --- | --- |
| D1 — deferred work allocation | Approved WP5-A through I as reviewed increments before WP6, including deferred authoring. No separate WP5B without a later architectural review. | All deferred authoring must be implemented and verified before WP6; each increment retains its review gate. |
| D2 — release closure policy | Display all authorized diagnostics; block on reachable errors or incomplete validation. Use existing release roots plus explicitly declared runtime references, with no claim of broader snapshotting. | Complete reachable closure is mandatory. Unrelated drafts retain diagnostics without entering the closure. UI and direct requests require server-side revision and authority checks. |
| D3 — executable preview policy | Design preview retains WP4 functions-disabled/no-effect behavior. Executable effects require explicit isolated tests with approved capabilities. | Arbitrary custom JavaScript is not sandboxed by service omission; unrestricted function preview is excluded pending separate architecture. |
| D4 — isolated host scope | Keep single-Dataset testing; reject/explain unsupported cross-Dataset automation. Preserve all WP3 limitations. | Some existing automation definitions cannot be tested in this host. Multi-Dataset support requires a separately reviewed package, not a WP5 shortcut. |
| D5 — approved service inventory | Inventory actual registered/approved services, signatures and permissions before WP5-C selection. Identify the minimal deterministic reference effect through the trusted registry; stop for review if its contract is missing. | Current normal service map is empty. Which existing approved services will the final journey select? External notification and custom service source authoring stay excluded. |
| D6 — contention and final evidence | Preserve coherent-reader/locking guarantees. Investigate and document reproduction, diagnosis and proposed remediation. Ordinary simultaneous Builder/runtime use must be reliable for final acceptance; no stale substitution or weakened checks. | Closing Builder before Application startup is not contention-free concurrency proof. A37 full management-restart/browser evidence remains mandatory in WP6. |

Additional risks: validator early exits require careful shared reporting changes; source/Publish races require admission rechecks; isolated services must not capture live ports; workflow transactions differ by action/phase; retained working copies must not be destroyed by dependency refresh. No calendar estimate is asserted. The [WP5-A architecture record](builder-v1-wp5-a-diagnostic-foundation.md) records the service inventory prerequisite and contention investigation for review.

## Review gate and evidence status

The original [planning verification](builder-v1-wp5-planning-verification.md) remains historical. WP4 evidence/history remains preserved. WP5-A implementation and current verification are recorded separately in [WP5-A verification](builder-v1-wp5-a-verification.md). No WP5 or Builder V1 acceptance is inferred from subsystem checks.

**WP5-A ACCEPTED AND CLOSED. WP5-B AUTHORIZED; STOP AT WP5-B VERIFICATION/REVIEW. Do not automatically begin WP5-C. WP4 remains closed and complete Builder V1 acceptance remains pending.**

## WP5-B user clarification and current review boundary

**BUILDER V1 WP5-A — ACCEPTED AND CLOSED**, 2026-10-17, by user review of the diagnostic foundation and final reported evidence. WP5-B is authorized under the approved architecture, with existing Component reuse mandatory. Stop at WP5-B verification/review and do not automatically begin WP5-C. The [WP5-B inventory and contract review](builder-v1-wp5-b-component-reuse.md) records the earlier Admin target blocker and subsequent user approval of the bounded native adapter. Implementation and verification now stop at the WP5-B review gate.

Reuse ui-base, installed package Components, Platform Components and the shared Component Registry. Implement missing controls/adapters only; no duplicate runtime library, renderer or definition format. Package definitions remain separate from Page instances; independent instances must leave shared definition bytes unchanged. Missing metadata is explicit, and a missing contract requiring architecture changes returns for review.

The normal-host service contract and concurrent graph-lock contention remain open. Before WP5-C, submit a proposed typed, authorized, trusted registration contract for the existing reference.notification candidate (or another existing approved service) for review; do not invent/register services. D6 remediation planning is allocated to WP5-F, with admission/locking design review before implementation and reliable simultaneous Builder/runtime operation required before WP5-I acceptance. A37 full management-restart/browser evidence remains in WP6.

## WP5-B implementation and verification review gate — 2026-10-17

The user approved the bounded native single-record delete adapter after the documented Component inventory and expression-contract probe. **WP5-B is implemented and verified, pending user review; it is not accepted or closed. STOP AT WP5-B VERIFICATION/REVIEW. WP5-C has not begun.** See [architecture and retained review history](builder-v1-wp5-b-component-reuse.md), [verification and browser evidence](builder-v1-wp5-b-verification.md), and [changed-file inventory](builder-v1-wp5-b-files.md).

Final reported evidence: **417/417 UI Platform, 760/760 Data Services, 146/146 editor/storage contracts, 29/29 focused WP5-A/WP5-B checks**, builds, typechecks and production exclusion passed. The actual Builder browser journey authors two Shells, Regions, Pages/routes, installed Card settings/slots/events, independent shared Component/Form consumers, route-bound protected Form read/edit and explicit single-record delete. Native collision, identity, denial, revocation and unchanged-definition checks pass. These results do not establish complete Builder V1 acceptance.

WP0–WP5-A historical records and unsuccessful/transitional WP5-B evidence are retained. All 351 prior evidence files match their original bytes after compatibility runs; all 40 umbrella requirements remain unchecked. WP4 and WP5-A remain accepted and closed. D5 trusted normal-host service-contract review remains required before WP5-C; D6 admission/locking design review and remediation remain WP5-F, with simultaneous-use reliability required before WP5-I. Closing Builder before runtime startup is not concurrency proof. A37 full management-restart/browser evidence remains WP6. No WP5-C, WP5-F or WP6 implementation is authorized by this review record.
