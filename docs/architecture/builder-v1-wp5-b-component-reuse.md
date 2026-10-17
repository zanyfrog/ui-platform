# Builder V1 WP5-B — Component Reuse Inventory and Contract Review

2026-10-17. **WP5-A ACCEPTED AND CLOSED. WP5-B IMPLEMENTED AND VERIFIED UNDER THE APPROVED BOUNDED NATIVE ADAPTER; USER REVIEW REQUIRED.** The initial stopped contract review below is retained as history. WP5-B is not accepted or closed; no WP5-C implementation has begun.

## Initial inventory and contract-review history

The user accepted WP5-A's reported 401/401 UI tests, 14/14 focused checks, 146/146 editor/storage contracts, builds, typechecks, production exclusion and browser compatibility evidence. Closure is recorded in its architecture/verification, the implementation plan and umbrella checklist. Historical unsuccessful/transitional runs and prior WP0–WP4 records remain preserved; all 40 umbrella requirements remain unchecked.

This WP5-B inspection uses the actual installed packages, native Application catalog and shared Component Registry. It creates no Component implementation, package definition, renderer, expression engine, runtime service or alternate registry. Machine evidence: [component inventory](evidence/builder-v1-wp5-b/component-inventory.json), [native contract probe](evidence/builder-v1-wp5-b/admin-target-contract-probe.json).

## Existing installed Components

| Installed package | Version | Current declared visual manifest entries | Reuse boundary |
| --- | --- | --- | --- |
| `@ui-base/ui` | 0.5.1 | `uib-heading`, `uib-heading-block`, `uib-card`, `uib-panel`, `uib-instruction`, `uib-action-group` | Card has a complete canonical definition; the other five have legacy/presentation metadata only. |
| `@ui-base/hero` | 0.2.3 | `uib-hero` | Legacy/presentation metadata only. |
| `@ui-base/assets` | 0.1.17 | No `ui.component.json` | Installed package does not establish an insertable Component contract. |
| `@ui-base/calendar` | 0.2.0 | No `ui.component.json` | Do not turn export discovery into an approved visual definition. |
| `@ui-base/core` | 0.1.0 | No `ui.component.json` | Infrastructure, not a substitute Component library. |
| `@ui-base/design-system` | 0.1.0 | No `ui.component.json` | Reuse existing styling infrastructure. |
| `@ui-base/forms` | 0.1.0 | No `ui.component.json` | Existing shared Form runtime imports these controls; this does not make every control a separately registered palette entry. |
| `@ui-base/icons` | 0.1.0 | No `ui.component.json` | Do not invent a canonical control/slot/property contract. |
| `@ui-base/theme` | 0.1.0 | No `ui.component.json` | Existing theme infrastructure; branding authoring remains WP5-D. |
| `@ui-base/tour-ui` | 0.1.1 | No `ui.component.json` | Exported/custom-element code alone is not a full visual contract. |
| `@ui-base/ui-layout` | 0.1.0 | No `ui.component.json` | Reuse existing layout machinery; no replacement layout library. |

Native `discoverComponents('test-my-app')` returned those seven manifest entries without activation issues, each with its existing runtime module. This is the existing non-composition Application, which inherits the Platform's installed ui-base dependencies. A composed Application instead needs its own enabled installed dependencies; this inventory does not grant package or source authority to any User. Global export/metadata discovery must remain distinct from Application insertion eligibility.

The actual shared `ComponentRegistry.registerManifest` accepted **one canonical definition**, `uib-card`, owned by `@ui-base/ui`, scope `platform`, with permanent ID `cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1`. The returned registered definition is frozen. The ID prefix does not turn an owning package definition into an editable shared Visual Component.

Card's existing contract contains 23 settings, including heading/body/header/footer/media, variant/density, interaction mode, navigation/action/selection settings, accessibility and handler references. It declares default/media/header/footer slots and `change`, `uib-card-select`, `uib-card-action` events with payload metadata. Reuse its binding kinds, enums, visibility rules, interaction modes and validation through the existing registry/renderer. Handler-reference settings must not invent executable registrations.

The six legacy entries have existing code modules and supported presentation attributes but lack Card's complete typed public API/slot/event contract. Expose only what their existing metadata supports and clearly identify the missing contract. Do not create surrogate Components or silently promote export names into canonical definitions. There is no manifest-backed package Button entry in this inspected catalog; HTML content buttons remain a separate existing content category, not a fabricated package Button.

## Existing Platform Components

| Shared definition | Existing public contract |
| --- | --- |
| Composition Shared Help | No public properties/events/slots. |
| Customer List Item | Required object `person`; `openRequested` with typed `customerId`; footer slot. |
| Customer Summary Card | Required object `person`, boolean `disabled`; `openRequested`; footer slot. |
| PersonForm | Existing WP4 mode, operation, record ID/initial record, read-only/disabled and display properties; declared submission/record/cancel events. |

Permanent artifact/Component IDs, full public metadata and source hashes are retained in the machine inventory. Keep shared definition navigation and Page instance editing separate, including a return to the originating consumer. Do not expose package-owned definitions through the writable Platform Edit Definition command.

## Controls and adapters to reuse after review

- Keep `src/server/component-registry.ts`, installed manifest resolution and native shared `ComponentRegistry`; no additional definition authority or package-wide migration.
- Keep the existing Visual/composition renderer, `renderComponentInstance`, `readPackageSettings`, native contract validation and `mountVisualArtifact`. Page instances retain `data-uip-component`, node identities, `data-uip-settings`, bindings, events and slot children in existing source roles.
- Adapt supported native scalar/enum/presentation settings into typed controls. Show missing or unsupported metadata explicitly. Dynamic bindings reuse the existing expression contract; no string interpolation or substitute evaluator.
- Slot/event controls draw from the actual public contract. Package events wire existing Page metadata actions; unavailable registry handler/service references remain unavailable rather than being fabricated.
- Keep WP1 owner-qualified workspace navigation and WP2 command/autosave/conflict lifecycle. Reuse WP4 Form mode/operation/record-ID mapping and protected read/edit behavior. Native composition remains authoritative for routes, collisions, Shell/Region ownership and explicit remapping.
- Instance edits must write only the originating Page's existing source/metadata roles. Tests must hash installed package manifests/code and shared Platform definitions before/after independent instance edits.

## Discovered blocker: route-bound protected Admin delete

WP5-B explicitly includes protected Admin record-action controls (A21–A22). Existing Form instance bindings can read/edit a route-selected record, but their accepted operation contract is create/edit. Do not add delete semantics to the closed WP4 Form contract.

Existing Visual service actions have `input?: Expression`. The authoritative `PresentationExpression` supports a named path, a literal value, boolean presentation operators or the accepted versioned scalar calculation expression. It does **not** declare object/array construction from nested expressions. The runtime evaluates the whole input expression once and invokes the named service; a service action does not assign its result to local state. Existing `set` replaces a declared local state value; it does not assemble nested request fields.

The native probe demonstrates `route.id` evaluates to `42`, while a literal protected delete request containing `records: [{ id: 'route.id' }]` still contains the literal string `route.id`. Existing `dataset.write` forwards a complete `ProtectedWrite` to the existing ApplicationDataClient/DOE; it does not interpret embedded binding paths. A path to a preassembled request could work only if something else already constructed it, which is the missing UI authoring/runtime contract here.

Consequently, implementing the required general route-selected Admin delete by changing literal semantics, adding object expression operators, synthesizing trusted imperative function handlers or adding a new record-target action would introduce an unreviewed contract. A literal hard-coded record ID or a preassembled fixture is not evidence for the parameterized UI-only journey. A Workflow workaround would improperly move this requirement into WP5-C.

This is an **architectural interpretation requiring review**, based on the inspected native contracts and evaluator probe; it is not a claim that protected delete is absent from Data Services. Existing protected Dataset CRUD works. The gap is safely authoring a dynamic Page action using the currently declared Visual contract.

## Concrete proposal for review — not implemented

Approve a bounded native **record-target action adapter** within the existing Visual metadata/runtime authority, using existing ApplicationDataClient and DOE. Proposed declaration fields:

| Field | Proposed requirement |
| --- | --- |
| Operation | Explicit single-record delete for this gap; existing Form read/edit remains unchanged. |
| Dataset target | Permanent Dataset ID chosen from authorized verified applied discovery. |
| Primary field | Stable applied primary-field identity, resolved through existing schema authority; never arbitrary browser-supplied schema. |
| Record target | One existing expression, initially a selected route parameter; no new expression operator or object interpolation. |
| Result | Explicit declared local result state and honest protected operation outcome, including denial/failure; no automatic retry or rollback claim. |

Resolve the exact native declaration shape, backward compatibility/versioning and validator/reference extraction implications before coding. At runtime, assemble one ordinary protected request through the existing adapter; missing/stale/unresolved targets must fail closed, and DOE/I-AM remains authoritative. Preserve development-preview effect restrictions. No custom package Component, arbitrary service registration, replacement renderer, policy engine or expression engine is proposed.

**Decision needed:** approve this narrowly bounded native action-contract reconciliation, or identify an existing authoritative route-bound record-action contract to reuse. A generated-function approach would also need explicit review rather than being introduced as an ordinary metadata adapter.

## Verification status and remaining acceptance

Completed: source/package inventory, actual native registry registration, existing Application catalog lookup and native expression probe. Initial stdin execution failed because the Foundation CLI export tried to resolve argv `-`; the named-script retry succeeded. The local reproduction helper is retained as [probe source](evidence/builder-v1-wp5-b/inventory-probe.mts.txt); copy it to `.uib/wp5-b-inventory.mts` at the repository root before rerunning with Node/tsx. Catalog lookup updates normal local discovery bookkeeping; no Application or Component source was edited.

No product code changed in this inspection. No new full regression/build/browser result is claimed for WP5-B; WP5-A evidence remains historical and accepted. The required two-Shell/shared-consumer/remapping/collision/package-insertion/configuration/protected-Admin browser journey remains outstanding, as do independent-definition-byte checks and WP5-B implementation regression/contracts/build/typecheck/production-exclusion gates.

This update's inventory: WP5-A architecture and verification closure records; `builder-v1-wp5-plan.md`; umbrella implementation plan and acceptance checklist; this WP5-B review document; and `evidence/builder-v1-wp5-b/` containing the component inventory, expression probe, reproduction source, initial failed-probe record, review-status checks and local execution log. The five accepted WP5-A implementation/test hashes remain unchanged. Document verification resolves 92 local links, confirms all 40 ordered umbrella requirements remain unchecked and byte-verifies the 41 historical preservation-record files. No runtime regression is substituted by these document/probe checks.

D5 remains open before WP5-C: submit a typed, authorized trusted normal-host registration contract for existing `reference.notification` (or another existing approved service) for review; do not register/invent services. D6 planning is allocated to WP5-F, with design review before lock changes and reliable simultaneous Builder/runtime proof required before WP5-I acceptance. Neither prerequisite was resolved by WP5-A acceptance.

**STOP FOR THE DISCOVERED WP5-B CONTRACT REVIEW. Do not claim WP5-B complete, advance to WP5-C/F/WP6, or check any umbrella requirement.**

## WP5-B implementation and verification review gate — 2026-10-17

The user approved the bounded native single-record delete adapter after the documented Component inventory and expression-contract probe. **WP5-B is implemented and verified, pending user review; it is not accepted or closed. STOP AT WP5-B VERIFICATION/REVIEW. WP5-C has not begun.** See [architecture and retained review history](builder-v1-wp5-b-component-reuse.md), [verification and browser evidence](builder-v1-wp5-b-verification.md), and [changed-file inventory](builder-v1-wp5-b-files.md).

Final reported evidence: **417/417 UI Platform, 760/760 Data Services, 146/146 editor/storage contracts, 29/29 focused WP5-A/WP5-B checks**, builds, typechecks and production exclusion passed. The actual Builder browser journey authors two Shells, Regions, Pages/routes, installed Card settings/slots/events, independent shared Component/Form consumers, route-bound protected Form read/edit and explicit single-record delete. Native collision, identity, denial, revocation and unchanged-definition checks pass. These results do not establish complete Builder V1 acceptance.

WP0–WP5-A historical records and unsuccessful/transitional WP5-B evidence are retained. All 351 prior evidence files match their original bytes after compatibility runs; all 40 umbrella requirements remain unchecked. WP4 and WP5-A remain accepted and closed. D5 trusted normal-host service-contract review remains required before WP5-C; D6 admission/locking design review and remediation remain WP5-F, with simultaneous-use reliability required before WP5-I. Closing Builder before runtime startup is not concurrency proof. A37 full management-restart/browser evidence remains WP6. No WP5-C, WP5-F or WP6 implementation is authorized by this review record.


## Implemented native contract (normative)

The approved extension remains in Visual schemaVersion 1. An action uses:

```json
{
  "kind": "record-delete",
  "version": 1,
  "datasetId": "permanent-Dataset-ID",
  "primaryFieldId": "permanent-applied-primary-field-ID",
  "recordId": "route.id",
  "resultState": "deleteResult"
}
```

The same artifact must explicitly declare `state.deleteResult`, normally initialized to null. State must be an object, and the result-state name must be a nonempty string naming its own declared member. Arrays, string state containers, numeric result-state names, unknown action versions/keys and invalid expressions fail native validation before rendering/execution. No state is silently invented by the action. `recordId` uses the unchanged existing path/literal/versioned expression contract; literal objects still do not interpolate nested strings. Existing Form create/edit modes and generic service actions are unchanged.

The shared runtime evaluates the scalar target once and sends a versioned intent through `ApplicationDataClient`'s existing operations transport. It supplies no physical key, rows, actor, grant or schema. The existing authenticated request handler invokes the bounded adapter inside the existing protected engine. That adapter clones the intent, binds the Dataset through its qualified applied authority, resolves the ORM primary key to the applied permanent field identity, rejects mismatched identities and incorrect scalar types, and constructs exactly one protected delete row. It compares the fresh write binding with the captured binding and retains the direct target through the existing write/Trigger pipeline. Operation/record eligibility, current authorization, applied schema, atomic persistence and commit outcome remain DOE/I-AM responsibilities. Unknown, cross-Application, missing, stale, denied, revoked or malformed targets cannot create an alternate write path.

The declared local state retains the actual protected result, including operation IDs, counts, errors and commit outcome. Missing-or-denied is a failure, never a reported deletion. A committed after-commit failure remains committed with its errors. Known HTTP denial is not committed; transport/server uncertainty remains unknown and is not automatically retried. An unavailable adapter or expression-evaluation failure is known not to have executed. Design preview has no executable service adapters or named custom functions. Normal running Applications retain the same renderer and protected client path.

Reference extraction records the permanent Dataset dependency through the existing owner-qualified diagnostic graph. A field is checked within that Dataset's applied identity mapping, rather than invented as another source artifact. The extension requires matching updated runtime/host support: older validators reject the unknown action kind, and older protected handlers reject the unknown intent. There is no fallback to generic CRUD, new source format, expression engine, authorization engine, Component library or renderer.

## Implemented authoring adapters and limits

Workspace-coordinated dialogs create Shells, Pages and Platform Components using the existing native services and server-allocated identities. Focused tabs retain WP2 working copies, history, source roles, expected revisions and original authorized saves. Display names/routes, Region names, public members/local state, typed scalar/enum/structured values, named-source bindings, existing modes, public slots/events and the protected delete target are authored through controls. Page instance changes affect its own source/metadata; shared definition navigation and return retain consumer context. Slot insertion requires a declared public contract. Package definitions do not receive a writable Platform Edit Definition command.

Card uses its actual registered metadata, interaction modes, settings, slots and events. Registered executable-handler selection is unavailable in this host; public declarative event actions are available without fabricating handlers. The six legacy entries retain their limited presentation metadata: direct supported names include Heading/Heading Block size/align, Panel variant/density, Instruction density, Action Group align, and Hero theme/size. Missing typed public property/slot/event contracts remain explicit. Hero `visual_mode` is a presentation-record field without a declared direct instance binding; it is unavailable here and is not silently renamed to `visual-mode`. There is no manifest-backed package Button; HTML buttons are ordinary content.

The [verification record](builder-v1-wp5-b-verification.md) and [file inventory](builder-v1-wp5-b-files.md) describe the review evidence. This package does not implement WP5-C service registration/automation, WP5-D Menu/branding completion, WP5-F locking remediation or WP6 final acceptance. All accepted earlier contracts and all 40 unchecked umbrella requirements remain preserved.
