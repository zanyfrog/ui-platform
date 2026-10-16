# Builder V1 WP4 — Form Authoring Plan and Architecture Reconciliation

2026-10-15. **ARCHITECTURE DECISIONS APPROVED — implementation authorized in WP4-A through WP4-F order; stop at verification and acceptance gates.**

The user's current WP4 instruction governs this plan. WP0–WP2 remain accepted and closed. WP3 is **accepted for planning purposes**, with its reported machine evidence subject to independent confirmation. Its documented V1 limitations are accepted without expansion. This document records source inspection and proposed work; it does not certify new runtime behavior or independently confirm WP3 test results.

## 1. Scope and explicit exclusions

Enable this ordinary Builder journey without writing source JSON:

**Create Form from a Dataset or blank → author structure and fields → map Dataset fields → configure validation and conditional presentation → preview → explicitly submit through protected services → reload persisted results.**

In scope:

- A Form contribution in the generic Artifact Editor, using the WP1 workspace and WP2 working-copy lifecycle. Proposed sections: Structure, Fields, Dataset Mapping, Validation, Modes and Conditions, Preview, and Advanced Source. Calculated-field controls use the canonical versioned declarative contract reconciled in WP4-A.
- Reuse the authoritative Form-capable Platform Component definition: one HTML tree, existing metadata, CSS, fixtures and code roles. Keep permanent Component, artifact, node, Form-field, Dataset and Dataset-field identities.
- Create from a selected, authorized Dataset using verified applied discovery; create a blank Form and subsequently select/map its Dataset. Blank/unmapped Forms may be saved as authoring drafts but cannot submit until valid and connected.
- Add, remove and reorder supported controls; edit labels/help, defaults, presentation required/read-only/visibility, existing modes and create/edit applicability. Structural and mapping changes are one logical command and coherent save.
- Map each persisted control through a permanent Dataset-field ID and derive its current key/type/required constraints from the verified applied schema. Expose read/write adapters from the existing approved service catalog.
- Configure create/edit, record input and public mode through existing public properties/bindings. Reuse Edit Definition/return-to-origin and minimal existing Page insertion to exercise the Form in an Application.
- Author the existing bounded declarative conditions through typed controls; preserve existing bindings and calculated declarations without conversion or deletion. Reconcile existing capabilities first; where absent, define one shared versioned contract with deterministic typed evaluation, stable field references, cycle detection and protected validation of persisted results.
- Preview through the same renderer, Form runtime, validation and expression evaluator as the running Application. Provide fixture-based, nonpersisting presentation preview; submission testing uses explicit isolated development test storage and the existing protected path. Normal running-Application submissions use the existing protected connected Dataset. Clearly label these modes.
- Field and summary diagnostics, source-preserving handling of unsupported features, actual protected create/read/update, denial and restart evidence.

Excluded:

- Dataset migration, post-apply schema evolution, additional Dataset hosts, multi-Dataset Forms, joins, relationships and new Dataset constraints. WP3's one-Dataset host and first-apply boundaries remain intact.
- A second Form registry, structural tree, schema authority, authorization evaluator, expression engine or browser persistence engine; arbitrary JavaScript/formula authoring as a substitute for declarative rules.
- Application-owned copies of shared Form definitions, automatic grants, role-derived presentation modes, anonymous/production identity work, or permission editing inside the Form.
- Broad palette/catalog redesign, Page route/Shell authoring, Menu destinations, theme/assets, Trigger/Workflow editors and general create/link orchestration. Existing event contracts are preserved; no new automation designer is planned.
- General application-wide Problems/validation aggregation, general-purpose disposable test-host infrastructure beyond the bounded isolated Form submission target, deployment, Publish changes, and complete WP6 reference acceptance. These remain separately gated work.
- Bulk conversion of legacy generic Form artifacts or UI Base controls; automatic remapping when switching Datasets or changing field keys.

**Reconciliation with the umbrella plan:** its previous WP4 combined palette, properties, automation, routes, Menu, branding and create/link flows. The current user instruction narrows WP4 to Forms. Those other items are deferred, not completed or implicitly reassigned to WP5/WP6. The original end-to-end acceptance checklist remains the record of outstanding program scope.

## 2. Existing components and services to reuse

| Responsibility | Existing implementation / contract | WP4 use |
| --- | --- | --- |
| Artifact workspace and shared definitions | `src/client/builder-workspace/{coordinator,adapters}.ts`, `src/server/builder-workspace.ts`; [WP1 architecture](builder-v1-wp1-workspace-architecture.md) | Owner-qualified canonical tabs, authorized focus, retained origin and Edit Definition. A shared Form has one Component/Form identity even when opened from different Applications. |
| Generic editor | `src/client/artifact-editor/{shell,context,plugins,default-plugins}.ts` | Register Form contributions in the common shell; extend transport adaptation where needed, preserving source and plugin failure isolation. |
| Editing and persistence | [WP2 lifecycle](builder-v1-wp2-editing-lifecycle.md), [runtime design](builder-v1-wp2-runtime-design.md), [reader guarantees](builder-v1-wp2-reader-contract.md); WorkingCopy, EditingLifecycle, Foundation and existing Visual services | Two-second autosave, Save Now, logical Undo/Redo, invalid draft retention, expected-checksum conflicts, recovery, original identity and coherent multi-role revisions. |
| Form source and generation | `packages/visual-artifacts/src/{model,form}.ts`; [Form/Data architecture](visual-artifact-form-data-integration-v1.md); existing VisualArtifactService | Existing `capabilities: ["visual", "form"]`, public interface, modes, mappings and `generateForm`. No competing `form.json` definition for these Components. |
| Visual structure editing | `src/client/visual-artifacts/editor.ts`, `packages/visual-artifacts/src/{source,validation}.ts` | Extract/reuse source-edit commands and validation behind Form panels; HTML remains the ordering/tree authority. |
| UI controls and validation | Installed `ui-base-forms`; `model.ts:valueErrors`, `form.ts:formValueErrors`, `validation.ts` | Existing controls, control validity, scalar/required checks and authoritative source validation. Dataset-required constraints cannot be weakened. |
| Conditions and bindings | `model.ts:Expression`, `expression.ts:evaluate`, `runtime.ts`; [Visual architecture](visual-artifact-platform-component-v1.md) | Named-source paths, typed literals and `not/eq/and/or`; existing conditions, bindings and public event actions. These are presentation expressions, separate from I-AM's security compiler. |
| Rendering and submission | `packages/visual-artifacts/src/{runtime,form-runtime}.ts`, `src/client/visual-artifacts/preview.ts` | `mountVisualArtifact`/`mountComposedPage` and `attachFormRuntime` for both preview and Application runtime; existing read-after-commit and public events. |
| Dataset discovery and serving | `src/server/dataset-development.ts`, `src/shared/dataset-authoring.ts`; [WP3 architecture](builder-v1-wp3-dataset-authoring.md) | Owner-qualified discovery/status and verified `appliedSchema`; distinguish source drafts from connected applied resources. Reuse explicit Apply/Connect without changing it. |
| Protected data operations | `packages/platform-core/src/application-data.ts`, Application-qualified proxy, development host, Data Services DOE/I-AM/ORM | Existing `dataset.read`/`dataset.write` adapters, trusted server identity, current authorization, final write validation and actual persisted records. |
| Security and ownership | Existing workspace/Visual services, Platform Component administration and WP0 registration | Preserve Platform owner for the shared definition and Application owner for its Dataset. Dataset edit authority does not confer shared Component edit or data-write authority. |

The legacy generic Form example/editor and the Form-capable Platform Component are distinct existing contracts. Generic **editor reuse** must not create a second authoritative definition or migrate either format implicitly.

## 3. Architectural gaps and proposed solutions

| Gap found in source inspection | Proposed solution | Boundary / acceptance condition |
| --- | --- | --- |
| Workspace mounts `mountVisualEditor` for Visual Forms and `mountEditorShell` only for generic artifacts. Generic context assumes the generic bundle/transport contract. | Add a narrow owner-aware Visual bundle adapter to the generic editor context/shell, then Form plugin contributions. Continue reading/writing through existing VisualArtifactService and Foundation coherent revisions. Do not fabricate an Application manifest or wrap a second lifecycle around the specialized editor. | Establish one working copy/history/save queue for the canonical shared Form. Preserve Platform authorization, original identity, checksum conflicts and all five source roles. This is a prerequisite, not already implemented generic compatibility. |
| Existing generation requires pasted Dataset JSON; mapping/root targets still require source authoring. WP3 now supplies qualified applied discovery. | Replace the ordinary import journey with an authorized picker backed by WP3 discovery. Keep source/applied/connected status distinct; only verified applied fields are eligible for executable mappings. | Never infer authority from a selected ID, source schema or display label. Unapplied/unconnected choices explain the blocked submission. No implicit apply or connect. |
| Form mappings carry both `datasetFieldId` and key/type/required hints; runtime payloads use keys. | Validate mappings against permanent IDs in the qualified applied schema and derive/check hints there. Mapping/reordering/removal updates HTML and metadata coherently. Explicitly review Dataset changes; do not match by label or silently regenerate identities. | Unknown/foreign/duplicate incompatible mappings and stale schema pins block execution with actionable diagnostics. No Dataset rewrite or migration. Renaming presentation labels changes no identity. |
| Dataset supports `date`/`json`, while `generateForm` currently supports `id/string/number/integer/boolean`; the WP3 Dataset editor does not expose integer. | Generate ID, string, number, boolean and lossless UTC ISO Date text controls. Expose JSON automatic-generation exclusions and offer explicit manual JSON-object mapping with safe parsing; reject unsupported shapes. Preserve existing source and list every incompatibility. | D3 approves graceful handling with supported controls and explicit safe manual mapping. Required unsupported mappings cannot silently disappear. Use correct existing rendering/conversion where available; explicitly expose every unsupported field and offer safe manual mapping. Never silently omit, convert or corrupt a field. |
| Existing modes and general node conditions are declarative, but Form capture only mutates values; reactive condition repaint and effective hidden/required behavior need joint verification. | Reuse the existing evaluator and render cycle for field-change invalidation. Reconcile condition exclusion, mode overrides, read-only/authorization restrictions and payload eligibility in the common Form runtime. | Test direct and ancestor conditions, repeated changes, focus/value retention, no stale hidden-field writes and identical preview/runtime results. Required Dataset values stay mandatory even when hidden; presentation cannot grant read/write. |
| Checked-in `Expression` supports only named paths, literals and `not/eq/and/or`. `FormField` has no calculation declaration, dependency ordering or cycle contract. The inspected Form/Visual architecture documents do not establish arithmetic calculated-field semantics. | Preserve all existing declarative source. Obtain the authoritative established calculated-field specification and reconcile its serializer, evaluator, typing, dependencies, cycle/error behavior and persistence policy before controls/runtime work. Where no authoritative contract exists, extend the existing shared evaluator through one versioned declarative contract, including deterministic typed operators, stable field references, dependency/cycle validation and protected persisted-value validation. | **D2 authorizes a canonical shared, versioned declarative calculation contract after reconciliation.** Do not relabel custom functions, security expressions or ordinary bindings as a complete calculation engine. No competing evaluator or arbitrary executable formula language is authorized. |
| Existing validation covers source/control/type/required and authoritative Dataset checks; not every `PropertyContract` constraint is a mapped Form-field constraint. | Expose controls only for constraints already applicable to the canonical Form/control definitions. Invoke existing validators; derive Dataset-required/type restrictions from applied discovery. Keep additional validation operators unsupported until separately approved. | No UI-only schema or duplicate validity rules. Client success cannot bypass DOE validation. Invalid drafts remain recoverable and cannot execute. |
| Shared definition may be opened from multiple Applications, while each Dataset is Application-owned. | Keep Platform owner on the definition and requesting Application on discovery/submission context. Recheck the qualified Dataset binding at runtime; warn that editing a shared definition affects all consumers. | A consuming Application cannot acquire another Application's Dataset authority by referencing the Form. No automatic cloning or owner transfer. |
| Focused workspace transport explicitly rejects general create/link POSTs. | Implement Form creation through existing authorized creation service/coordinator, with an origin token and reauthorization before any link, including the existing WP3 Create Dataset path in a new workspace tab. | Cancel, changed/closed origin, checksum conflict and permission revocation never attach a result to the wrong node. D4 includes A18: create Dataset through the existing WP3 path and coordinator, preserve the originating Form and link only with current authority and unchanged origin identity; cancellation, stale origins and failed creation cannot link. |
| Existing preview can receive real service adapters; program acceptance distinguishes preview isolation from ordinary development writes. | Default focused presentation preview to fixtures with no persistence adapter. Offer a separately labeled **Isolated development submission test** using a fresh bounded WP3/Data Services domain and existing ApplicationDataClient. Use ordinary Application execution for normal-store acceptance writes. | Opening/changing preview performs no write. Fixture results are never evidence of persistence. D5 requires a bounded explicit isolated development submission target using existing protected services; prove storage isolation rather than relying on labels. |
| Runtime writes commit before read-back; read-back can be denied/fail after a successful write. | Preserve backend commit evidence and make a committed-but-unreadable result explicit in Form UI; avoid implying rollback or automatically repeating the write. | Test commit failure, validation denial, read-back failure, duplicate submit suppression and no automatic retry. This is a presentation correction in the existing runtime, not a transaction engine. |

### Required data and authority flow

Authoring: **generic Form panel → one WP2 working copy → existing authorized Visual save/validation → Foundation coherent source revision**.

Discovery: **requesting Application + Dataset permanent ID → WP3 qualified discovery → verified applied schema and connection status → mapping checks**.

Submission: **shared Form renderer → existing ApplicationDataClient → Application-qualified proxy/trusted server identity → DOE + I-AM + applied Dataset binding → ORM → protected read-back**.

Presentation expressions never authorize that flow. A hidden field is not a security boundary. Host-provided restrictions can narrow presentation; the protected backend decides every data request, including crafted requests and requests made after revocation.

## 4. Work packages and dependencies

The user has approved D1–D5 and authorized these increments in order. Preserve all accepted WP0–WP3 contracts and limitations.

| Increment | Deliverable | Depends on | Review / exit evidence |
| --- | --- | --- | --- |
| WP4-A — Contract reconciliation | Incorporate approved D1–D5; document authoritative Form adapter, scalar matrix, applied-schema matching, effective field semantics, preview target and calculated-field architecture provenance. | Current planning approval; WP0–WP2 baseline; WP3 planning acceptance. | Reviewer agrees interfaces and exclusions. Independently confirm relevant WP3 machine evidence before relying on it for final WP4 runtime acceptance; do not reopen accepted limitations. |
| WP4-B — Generic editor integration | Shared Form owner-aware adapter and plugin registration; existing lifecycle and source/repair panels. | A; D1. | One canonical tab/copy/history; autosave/Undo/Redo/conflict/recovery/revocation and coherent five-role saves. |
| WP4-C — Creation, structure and mapping | Dataset picker, blank/from-Dataset creation, supported controls, mapping/constraint/mode inspectors and minimal existing instance configuration. | B; WP3 discovery; D3/D4. | Ordinary journey uses no pasted JSON; permanent IDs survive edits; incomplete/unsupported choices are explicit and cannot submit. |
| WP4-D — Declarative presentation | Typed conditions, common reactive runtime behavior and validation integration; canonical calculated-field controls following D2 reconciliation. | A/B/C; D2 for calculations. | Shared evaluator/validator; condition/mode/authorization intersection; calculated dependency/type/cycle/error cases and protected persisted-value validation. No second engine. |
| WP4-E — Preview and protected execution | Same render path for fixture preview and running Application; approved adapters; commit/read-back diagnostics. | C/D; connected WP3 host; D5. | Preview parity, no implicit writes, real protected create/read/update, denial/revocation and restart evidence. |
| WP4-F — Verification and review | Browser journey, service/regression checks, architecture/changed-file records and reproducible evidence ledger. | B–E; relevant WP3 evidence confirmation. | Every acceptance item below has result, environment, operator and evidence. No WP4 acceptance claim from subsystem tests alone; actual browser journey and full regressions are required. |

Dependency order: **planning review → A → B → C → D → E → F → WP4 acceptance review**. Reuse applicable existing tests and run checks appropriate to changed packages; broader sibling checks are required if shared service contracts change. Implementation is now authorized; stop at each defined verification gate and provide architecture, actual browser evidence, full regression results and an exact changed-file inventory at acceptance review.

## 5. End-to-end acceptance checklist

Implementation evidence is recorded in [WP4 verification](builder-v1-wp4-verification.md). Review checkboxes remain unchecked pending acceptance; they do not imply implementation is absent. Evidence must distinguish Builder UI actions, source edits, CLI actions and fixture/bootstrap steps. A programmatic assembly cannot substitute for the normal Builder authoring journey.

- [ ] Independently confirm the relevant WP3 discovery, applied ownership, protected CRUD and restart evidence; record any discrepancy without expanding its accepted V1 scope.
- [ ] Authorized developer creates a Form from a connected supported Dataset through a picker, opens it in the generic editor and inserts an instance using existing Page integration.
- [ ] Developer creates a blank Form, saves/reopens it, adds supported fields, selects the Dataset and completes mappings through UI; incomplete drafts explain why execution is blocked.
- [ ] Component/artifact/node/Form-field/Dataset/field identities survive label, help, order and mode changes. Removing a control removes the intended mapping coherently; Undo/Redo restores both.
- [ ] Every mapping resolves by permanent ID against the owner-qualified verified applied schema. Duplicate/foreign/missing/stale/type-incompatible mappings fail visibly. A newer saved Dataset draft never replaces applied authority.
- [ ] Lossless Date controls, explicitly mapped JSON objects, unsupported JSON shapes/required complex mappings and WP3 migration/multi-host boundaries remain explicit. No silent omission, schema rewrite, reactivation or host replacement occurs.
- [ ] Autosave, Save Now, source repair, invalid draft retention, bounded logical Undo/Redo, tab switching, guarded close, delayed saves, conflict/recovery and coherent multi-role preview revisions retain WP2 behavior.
- [ ] Shared Form opens canonically from two consumers; Edit Definition returns to the original instance. Instance edits do not alter definition bytes; definition edits do not transfer ownership or create duplicate Forms.
- [ ] Revoked/changed identity, stale original context, unavailable Dataset and unauthorized Component edits are rejected; no queued work inherits a new User's authority.
- [ ] Existing required/type/control validation appears beside fields and in a summary. Dataset-required constraints cannot be weakened by modes/conditions/read-only presentation; invalid submission does not persist a record.
- [ ] Conditions use existing declarative paths/literals/operators. Direct and ancestor conditions react to input changes; mode and condition changes retain values and focus as specified, and hidden/read-only fields cannot leak into writes.
- [ ] Unknown modes, malformed/unsupported expressions and missing dependencies produce diagnostics without deleting source or executing arbitrary code.
- [ ] Calculated fields use one shared versioned declarative contract/evaluator with deterministic typed operators and stable field references; validate dependencies/cycles, reject unavailable/unreadable dependencies without disclosure, and protect persisted results against crafted client values through DOE validation.
- [ ] Preview and running Application use the same Form renderer, validation, conditions and calculation semantics for the same revision/inputs. Fixture preview cannot persist; merely opening preview never writes.
- [ ] Explicit submission testing uses isolated development storage with proved separation from the normal connected store. Normal running-Application submissions use existing protected Data Services.
- [ ] A18: Create Dataset from Form opens the existing WP3 creation path, preserves the originating Form and links only after successful authorized creation with a current origin identity. Cancellation, stale/closed origins, failed creation and revocation produce no unintended link.
- [ ] User explicitly executes against the connected development Dataset. Create commits a real record; protected read-back/reload proves storage. Edit loads by existing record binding and updates only permitted changed mapped values.
- [ ] Crafted prohibited field/operation, foreign owner/unknown Dataset, revoked policy and disconnected host requests fail through DOE with unchanged-storage evidence where no commit occurred. Presentation mode never confers authority.
- [ ] Duplicate submit is suppressed while pending; validation/write failure is distinct from committed-but-unreadable state; no automatic mutation retry or false rollback claim.
- [ ] Form public submission events and existing instance bindings remain compatible. Private nodes stay encapsulated. No new service or workflow engine is introduced.
- [ ] Application/server restart reloads the same saved Form identities, qualified Dataset binding and persisted records; no republish/reseed or migration is triggered.
- [ ] Relevant tests, builds/typechecks and production-editor exclusion pass; preserve existing accepted evidence. Record browser screenshots, IDs, diagnostics, real persisted state, limitations and exact changed files.
- [ ] Reviewer accepts WP4 implementation and its explicit exclusions before any later package begins. Complete WP6 acceptance remains separate.

## 6. Approved architecture decisions

All decisions below were explicitly approved by the user on 2026-10-15. No further planning permission is required.

| ID | Approved decision | Acceptance criteria |
| --- | --- | --- |
| D1 | Generic-editor adapter for existing shared Forms and WP2 lifecycle. | One source format, persistence authority, canonical owner and working copy; five-role atomic validation/save and full lifecycle regression. |
| D2 | Reconcile expression, conditional, Form and DOE capabilities; define one shared versioned declarative calculation contract if none exists. | Determinism, typed operators, stable field references, dependency/cycle checks and protected validation of persisted calculated values; no competing expression engine. |
| D3 | Graceful Date/JSON handling. | Correct supported render/conversion only; expose unsupported fields, allow explicit safe manual mapping, never silently omit/convert/corrupt Dataset fields. |
| D4 | Include Create Dataset from Form / A18. | Existing WP3 creation path and coordinator; preserved origin, current authority and identity-safe linking; cancellation, failure and stale origins create no unintended links. |
| D5 | Nonpersisting design preview; explicit isolated development submission tests; normal Application uses protected Data Services. | Same rendering logic, distinct labels, no implicit writes, evidence of actual test-storage isolation and protected normal submissions. |

**IMPLEMENTATION GATE — proceed WP4-A through WP4-F; stop for verification and acceptance review. WP4 is not accepted and Builder V1 is not complete.**

## WP4-A reconciliation record

The canonical versioned contract is recorded in [expression and protected-validation contract](builder-v1-wp4-expression-contract.md). D1–D5 remain approved. Implementation and machine verification evidence are recorded in [WP4 verification](builder-v1-wp4-verification.md); reviewer acceptance remains pending.
