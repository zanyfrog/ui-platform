# WP5-F L3-A — Native Renderer Admission Audit

2026-10-23. **Source-only architecture review; no renderer/test/build execution.** [L1-B closure](builder-v1-wp5-f-l1b-closure-20261023.md) records the limited model acceptance. Complete WP5-F, D6 and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.

## Decision and smallest useful target

Recommend a separately authorized **L3-B Canonical Card Admission and Captured-Input Compatibility** increment: validate authored instances against the actual installed Card Definition, bind exact immutable manifest/native bytes, and exercise the unchanged production `renderComponentInstance` with `preview:true` in the existing restricted-host pattern. Begin with text slots, visual variants/density and no-interaction/selectable local state; reject navigation/action/media/service/handler content before rendering. This advances canonical Definition/instance compatibility beyond fixture schemas without inventing a parallel component. It is not saved-artifact acquisition or production Preview activation.

Full Page/Shell/Region/Form native rendering cannot be admitted merely by supplying empty services. The current Visual renderer imports the Forms barrel and passes `preview:false` when it constructs canonical package components. Policy does not propagate from the fixture renderer into that path. A separate renderer-policy/closure design is needed; no runtime change is implemented or implicitly approved by this audit.

## Audit boundary and identity findings

Ordinary UI Base source/manifests and existing UI Platform renderer/contracts were read as text. No module was imported, registry loaded, custom element instantiated, saved Component read, Foundation reader called, database opened or current operational state inspected. Paths below are relative to `C:/Projects/Modular` where prefixed `ui-base/` or `ui-platform/`.

`ui-base/packages/ui-base-ui/ui.component.json` contains six entries. **Only Card has canonical schemaVersion `1.0.0`**; heading, heading-block, Panel, instruction and action-group retain legacy presentation metadata. `ui-base-hero/ui.component.json` has no canonical Definition entry in this inspection. This is the bounded manifest inventory, not admission of all other UI Base packages or definitions held in protected Platform Components. Registry `registerManifest` explicitly skips legacy entries; none may be promoted by an adapter inventing a Definition.

Canonical Card identity is `cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1`, name `card`, owner scope `platform`, package `@ui-base/ui` **0.5.1**, runtime compatibility `^0.5.1`. Implementation is code/custom-element `uib-card`, export `UibCard`, import `@ui-base/ui/card`, module `./src/layout/uib-card.js`. Aliases `@ui-base/ui` and `@ui-base/ui/layout` do not change component identity. Lifecycle says installed/workspace-only save and unimplemented publication stage gate; metadata declaring published revisions immutable does not establish an implemented release path.

## 1. Definition schema and reviewed native candidates

Canonical schema is enforced by `ui-base-ui/src/platform/definition.js`: serializable JSON only; identity/ownership/package/version; code/composite implementation metadata, custom-element binding/import/export/aliases; runtime attributes/properties/events/slots; builder settings/groups; capability list; presentation CSS variables; package/service dependencies and lifecycle. Composite validation explicitly rejects composite graph support at this reference stage. Settings validate declared types/defaults/enums/bindings and visible-when rules; URL validation permits normal HTTP/mail/tel use in authoring and is **not** restricted Preview resource admission.

### Canonical Card settings

| Existing setting / supported native contract | Native behavior / restricted condition |
| --- | --- |
| `heading`, `label`, `name`, `ariaLabel`, `ariaDescribedBy` strings | Attributes/accessible identity; finite authored strings, no HTML interpretation or external ID binding |
| `body` (default `Card body`), `header`, `footer` strings | Renderer creates textContent slot nodes. Native default/header/footer slots also support elements, but arbitrary element slots are outside initial admission |
| `mediaSrc`, `mediaAlt` | Image slot creates an actual `img.src`. Empty-only in smallest target; captured image support needs separate resource/CSP compatibility approval |
| `variant`: elevated/outlined/flat (default elevated); `density`: comfortable/compact (default comfortable) | Native layout/styles; eligible for finite enum admission |
| `cssClass` string | Existing CSS class attribute; initially empty or separately admitted tokens/styles only, not arbitrary stylesheet authority |
| `interactionMode`: none/link/action/selectable | Initial target none/selectable only. Keep native selected/disabled behavior; reject unsupported modes rather than rewriting link/action into selectable |
| `href`, `target` (`''`, `_self`, `_blank`, `_parent`, `_top`), `rel` | Native anchor/default navigation capabilities; empty-only initially. Authoring URL validation is insufficient to permit them |
| `action`, `actionToken`, `actionHandler`, `selectionHandler` | Dispatch or registry-handler references; empty-only initially, no application code invoked |
| `selected`, `disabled` booleans | Visibility/interaction-mode rules still apply; local selection allowed only while current and admitted. No record save or outward action |

Runtime includes common base attributes, readonly/public properties and four slots: default/media/header/footer. Events are `change` then `uib-card-select` for local selection, and cancelable `uib-card-action` after selection for actions. The registry renderer serializes declared detail, calls `onEvent`, suppresses registered handlers in Preview and prevents cancelable events/default anchor clicks. Selection events are not cancelable; legitimate native local state may change. These are trusted adapter behaviors, not a security boundary against arbitrary scripts.

### Other actual implementations: metadata is not a canonical Definition

All following UI package entries are `@ui-base/ui` 0.5.1, identified by tag/module rather than an invented canonical componentId.

| Candidate / exact module | Existing source API and dependencies | Initialization/events/cleanup/resources and eligibility limit |
| --- | --- | --- |
| `uib-panel`, `src/layout/uib-panel.js` → `layout/index.js:UibPanel` | heading/label, variant elevated/outlined/flat, density comfortable/compact; native collapsible/open and disabled; header/default/footer/actions slots. Legacy manifest exposes variant/density only | Native toggle button changes open and emits `uib-panel-toggle`. Shadow-root DOM/listeners rebuilt on render, no external service in this path. Existing accepted Panel fixture is genuine native layout, but no canonical Region or Panel Definition support follows |
| `uib-heading`, `src/content/uib-heading.js` | Core helpers; text/heading, level 1–6, size compact/default/large, align start/center/end; default text slot | Registers element; escaped text/shadow CSS with token/system-font fallbacks. No data/network path found in reviewed module. Future legacy-tag admission must stay explicitly legacy, not claim canonical registry rendering |
| `uib-heading-block`, `src/content/uib-heading-block.js` | Core plus `uib-eyebrow.js`, `uib-heading.js`; eyebrow/headline/subheadline/body/level/size/align; named text slots | Escaped text and nested native heading/eyebrow; shadow DOM rebuilt. Must capture both nested implementation bytes and reject arbitrary slotted content. No canonical Definition |
| `uib-instruction`, `src/content/uib-instruction.js` | Core; heading/summary/variant info-tip-warning-danger-success, density, icon, collapsible/open, numbered/complete/current/show-progress and base attributes | Details/toggle events and MutationObserver; disconnect releases observer. Source templates/styles and slot content need finite admission; unknown nested elements remain unapproved. Legacy presentation metadata only |
| `uib-action-group`, `src/actions/uib-action-group.js` | Core + `uib-action-button.js`; actions JSON/property, align, stacked | Builds action buttons with labels/actions/links/targets. Button emits `uib-action-button-click`/`uib-action`, includes originalEvent detail and can render actual anchors. Escaping or javascript:-only href rejection is not complete policy. No service/handler authority should leave a design frame. Not initial target; no canonical Definition |

`@ui-base/hero` legacy manifest and other unreviewed package families remain outside executable admission. No package-wide eligibility follows from metadata discovery or dependency version ranges.

## 2. Exact executable closure and effects

The smallest Card direct-source closure is finite and uses actual existing implementations:

| Package / source path under its `src/` | Required role and reviewed effects |
| --- | --- |
| `ui-base-ui/platform/renderer.js`, `registry.js`, `definition.js` | Actual construction/validation/registration. Renderer imports Card; registry stores Definition/route/handler/service maps. `loadCardRegistry` fetches a manifest by default: **do not call it**; use already captured manifest with `registerManifest`. No runtime handlers/services are registered for initial Preview |
| `ui-base-ui/layout/uib-card.js`, `layout/index.js` | Card file reexports the shared layout module. Import defines stack/grid/row/column/Panel/Card/dialog/accordion/tab/tab-panel/tabs/splitter; side effects must be recorded, not hidden by a shim. Only admitted elements may be instantiated. Card installs a MutationObserver on connection and disconnects it; click/keyboard listeners belong to shadow DOM. Disposing the whole isolated frame releases registrations and DOM |
| `ui-base-core/index.js`, `utils.js`, `localization.js`, `validation.js`, `metadata.js`, `base-element.js` | Package `@ui-base/core` 0.1.0 export resolution includes the whole barrel. Utilities/ID generation, base attributes/events, local metadata/validation/catalog maps. Localization setter can dispatch a document event when invoked; it is not invoked to admit arbitrary behavior. No module-level backend/storage call identified in this reviewed closure |
| `ui-base-icons/uib-icon.js`, `icon-registry.js` | `@ui-base/icons/icon`, package 0.1.0; local default SVG registry plus custom-element registration. Icon `src`/`url` creates an image and registry accepts SVG strings: these surfaces are **not** generally admitted. Initial Card text-only path instantiates no arbitrary icons/resources |

Also pin the three package.json export/version/dependency contracts and `ui-base-ui/ui.component.json`. CSS is embedded in the native modules; token values/fallbacks are part of admitted rendering. No external fonts or token stylesheet are necessary for the initial default-style target. If a theme/style is supplied, capture and validate it separately; do not fetch package/global styles implicitly.

Public `@ui-base/ui/component-reference` resolves to `platform/index.js`, which additionally reexports `workspace.js` and `property-editor.js`. The full Visual runtime imports that barrel. Initial direct-source compatibility should use the exact already established renderer/registry source path, not execute broad workspace/property UI or modify package exports. Exact resolved source and installed bytes must be re-admitted before any future build; version ranges or this source map alone do not admit a changed installation.

The larger closure is **not executable-admitted**: Visual runtime → composition runtime/revision guards/model/validation/expression evaluator plus Forms barrel. `expression.ts` reexports the Data Services presentation evaluator. Forms exports controls, field layouts, rich-text, recent-values manager and recent-values utilities. `safeLocalStorage()` probes/writes/removes a key when called; controls may invoke recent-values behavior. A denied browser storage attempt does not make this code safe/admitted. This audit identifies that boundary without claiming every Forms/dependency implementation is fully reviewed. Stop there for execution until an exact closure/semantic policy is approved.

## 3. Application composition coverage and current gaps

| Existing contract | Immutable inputs that could support a bounded design path | Effects/current incompatibility and required decision |
| --- | --- | --- |
| Page: `visual-artifacts/src/runtime.ts:mountVisualArtifact` | ArtifactMetadata schemaVersion 1, native source/CSS, public property/event/slot contract, saved fixtures, local state, declarative bindings/conditions/repeaters/layout | Existing actions include navigate, service, record-delete, Workflow and custom function; sources can load services and onLoad executes actions. Empty services is not a complete design mode; current module imports Forms and broad barrel. Needs explicit whole-closure design policy before native use |
| Shell/Region: `composition-runtime.ts:mountComposedPage` | Captured Shell source, Page region slices, route/Menu composition, configuration/theme/site CSS/branding and complete participating definitions | Requires selected Shell, rejects unmapped Page Region; projects Page metadata per Region and shares Page state/data across regions. `assetUrl` can fall back to raw value. Region is a composition contract (`data-uip-region`), not UibPanel or a canonical Component Definition. No schematic replacement qualifies native Region rendering |
| Menu/routes: `composition.ts` | Captured route IDs/Page identities/parameter metadata, Menu tree/overrides, Shell menu placeholders | Destinations support Page/route/URL/action; renderer creates executable navigation/action surfaces. Pure routePath/matching or destination inspection is independent and already bounded; actual Menu rendering inherits native closure. Reject navigation/services rather than opening runtime |
| Form: `form-runtime.ts`, `model.ts` Form capability on Component | Authorized field/schema metadata, mode/operation, authored synthetic initialRecord/values, visibility/read-only restrictions and expressions | Edit without initialRecord can call Dataset read. Submit calls insert/update then readback, may generate UUID and invoke lifecycle events; input listeners/timers/control storage paths exist. Synthetic initialRecord alone does not admit entire Form runtime. Actual Dataset reads/writes and submission excluded from F; effecting verification belongs WP5-G |
| Nested Visual Components | Owner-qualified captured definitions, public props/events/slots and declared dependency graph | Recursively mounts native instances and runtime event actions; shared state and nested cleanup matter. Missing/dynamic edges/cycles need native validation; L1 model cycle refusal is not proof of native cycle semantics |
| Installed canonical Components inside Visual | Actual Definition/settings and registered custom-element bytes | Current runtime calls `renderComponentInstance(...preview:false)`, forwards extra attributes and appends children. No top-level design policy prevents arbitrary slot/attribute capabilities. Cannot treat direct Card preview:true results as full Visual eligibility |
| Theme/styles/branding | Captured validated CSS, token values, logo/image bytes and content identities | `themeCss` validates names and punctuation, but is not comprehensive CSS URL/font/resource admission. `composition-runtime` assigns asset src via callback/raw fallback; production saved theme Preview needs immutable-resource adapter with no fallback |

Destroy paths exist in Visual/Form runtimes: disposed flags/generations, form listener removal, nested destroy, bound-event cleanup, host removal. They are useful implementation contracts but not fresh cleanup evidence. Card has no exported destroy object; its observer disconnect plus element/frame removal must be measured in a future browser run. Initializations and custom-element registrations are code effects even if no element is mounted; every statically executed import must be admitted.

## 4. Capture-resource closure using L2/L1 contracts

Use L1-B original permanent identity, complete declared role/dependency/membership agreement and copied resource bytes, then L2's separate original-bound epoch/envelope and per-delivery admission. Pure model passes do not supply those bytes or permissions in production.

Required capture inventory for an admitted renderer:

1. Selected permanent owner-qualified identity, saved native revision, authorized schema/field visibility and all source roles; never drafts, repair-only ambiguous identities or copied data records.
2. Actual canonical Definition and instance settings/serviceRef declarations, owning package manifest, exact installed version and activation state, export mappings and **all executable module bytes** in the chosen closure. Native trusted bootstrap/renderer and policy versions are pinned. Dynamic imports, computed module paths, unresolved registration or unknown custom elements refuse before execution.
3. Transitive Component/Form/Shell/Region dependency identities and role bytes; relevant route/Menu/collection membership and semantic ordinals; public prop/slot/event contracts. Missing, unreadable, duplicate owner resolution, unsupported cycles or changed membership refuses the entire candidate. Never silently skip a shared Component.
4. Exact CSS/theme/site-style/token resources and every referenced image/font/media/SVG/import dependency. CSS url()/@import/font-face, HTML src/srcset/href, SVG references, embeds and data/blob schemes require explicit resource policy. Initially reject external/resource-bearing content rather than assume sanitized HTML or browser blocking preserves semantics.
5. Content-hashed resource IDs with byte length/media type, binding/epoch/expiry and capture/session limits. Same version/different executable bytes is changed content or refusal, not an allowed live update. Only the immutable captured index may resolve resources; missing ID/digest mismatch/expired/revoked/cross-binding request returns unavailable/denied with no source/package URL fallback.

A prebundled fixed trusted script may include admitted native modules as exact hashed bytes. That is not permission to execute captured arbitrary source or import a package dynamically. Current fixture CSP admits one fixed script and denies connect/images/fonts/media/frames/workers; arbitrary captured media/modules will not simply work there. Compatibility and any expanded resource delivery require a separately reviewed policy, not an inline CSP relaxation in a fixture increment. Unsupported code remains unavailable even if an iframe could execute it.

## 5. Admission matrix

Numbers are eligibility categories, not current production acceptance: **1** eligible under defined restrictions; **2** needs additional model/renderer work; **3** needs trusted production integration; **4** unsupported for WP5-F V1.

| Reviewed feature | Category / conditions |
| --- | --- |
| Canonical Card text/enum/style subset, local selectable/disabled state | **1**: actual Definition, pinned trusted native closure, preview:true, no handlers/services/URLs/arbitrary child nodes, restricted host and explicit currentness/cleanup. Separate compatibility test authorization still required |
| Genuine native Panel fixture/local toggle | **1** within existing fixture scope only; no canonical Panel or Region identity claim |
| Legacy heading/heading-block/instruction finite text/layout | **2**: explicit legacy contract adapter and exact native admission needed; no invented canonical Definition. Not preferred over canonical Card |
| Action-group/button link/action behavior; canonical Card action/link/media modes | **2** for bounded non-effecting intent/resource inspection only after real native semantics and resource policy are designed; **4** for actual navigation/effects/live resource execution |
| Page/Shell/Region/native Menu/nested declarative rendering | **2**: actual runtime policy propagation and full closure/resource/native validation required; current preview:false path is not admitted |
| Form create/edit appearance | **2**: safe initialization, full controls/storage/field-mode/native closure and no-effect semantics must be designed; no current native Form eligibility |
| Any actual saved-artifact input or protected field/schema/package activation | **3**: coherent D6 capture, original authority/owner visibility, immutable delivery and trusted invalidation remain prerequisites regardless of type |
| Captured CSS/assets/media/theme resource delivery | **2 + 3**: compatibility/policy work and trusted capture/delivery; current all-resource-denied host must not be weakened by assumption |
| Arbitrary user functions/scripts, dynamic package imports, unknown/effectful package initialization, arbitrary HTML/CSS/embeds | **4**; no generic sandbox or arbitrary executable parity |
| Record/data reads and mutations, Form submit/delete/upload, Workflow/Trigger/Publish, external/top navigation | **4** for F design Preview; separate WP5-G/H capabilities are not enabled by this review |
| Unreviewed packages/definitions or native cycles | Unavailable; **2** for a separately scoped source/semantics audit, not execution; unsupported executable content remains **4** |

Smallest target deliberately excludes full Visual runtime and saved capture. The same production Card Definition/renderer is used; an adapter validates supported inputs and rejects others, rather than presenting a reimplementation or secretly translating unsupported modes into different behavior. If native compatibility requires a new renderer, shim, services, broad import closure or policy weakening, stop that candidate for architecture review.

## 6. Separately authorizable verification plan

No tests are executed or allowlisted for immediate execution by this report. Proposed L3-B exact new entries: `tests/preview-contract-model/native-card-admission.test.ts` for pure admission/Definition identity and `tests/fixture-preview/native-card-capture-harness.ts` for the native restricted-host boundary; a new dedicated verifier/evidence directory, never an old fixed-output runner. Final paths/full imports must be inspected and approved before execution.

| Proposed coverage | Required evidence after separate authorization |
| --- | --- |
| Definition/native identity | Assert actual componentId/package/version/runtimeBinding, registration owner/aliases, unknown/duplicate/legacy Definition rejection and expected registered constructor. Match exact source hashes/build graph; no fake native dependencies |
| Finite canonical settings/layout | Text slots, heading/label, native defaults/enums, selectable/disabled behavior, accessible names and emitted declared detail; unknown fields/mixed modes rejected before render. Native DOM/screenshot compares real implementation, not approximate fixture template |
| Immutable captured compatibility | Authored instance/Definition and pinned module/data index; changed same-version bytes, missing resources, forbidden media/URL/handler/service refs, dynamic import and foreign IDs refuse before initialization. No server or source lookup on failure |
| Effects and policy | Dedicated loopback server serves exact in-memory precompiled assets only; no proxy/normal runtime/credentials. Observe receiving requests, navigation, forms, downloads/file chooser, storage, popups, forged Save/Publish and wrong-window/nonce/sequence messages. Keep strict CSP/sandbox/resource rejection; button hiding alone is insufficient |
| Lifecycle/cleanup | Selection change, failed Refresh, stale inert state, simulated revoke, repeated open/close, pending/late responses and terminal dispose. Measure Card observer/listener/frame cleanup and no callback after disposal; stale content must not remain event-capable |
| Capture versions and unsupported content | Pin Definition/renderer/policy digests; unknown packages/native cycles/resource schemes/arbitrary slots remain unavailable without importing them. No approximation accepted as native parity |
| Builder editing independence (if included) | Reuse already admitted actual editing modules with authored memory transport only and exact separately reviewed entry; compare source/file/range/history/identity and matched autosave traces. No ordinary Builder launch or default adapter execution |

Potential future bundle closure: the exact direct Card paths in section 2, relevant package/manifest JSON, existing host/protocol/lifecycle/admission code and new adapter/harness only. Source before/after hashes must prove existing UI Base/runtime/policy implementations unchanged. Test execution serial, zero retries, exact files; no workspace hooks/discovery or normal npm launcher. Captured image/font/CSS delivery, broader Visual runtime, Forms, actual saved sources, D6, I-AM and backend routes are excluded from that first increment. A successful synthetic native compatibility run cannot qualify trusted production display/revocation or real coherent capture.

## Preservation and gate

Only this audit, L1-B closure addendum and [new inventory](builder-v1-wp5-f-l3a-files-20261023.json) are added. Before writing documentation, **1606 ordinary admitted source/evidence files** were hashed in the workspace inventory, including the accepted baseline and explicit UI Base source/manifests/core/icon paths; final comparisons and exact reference hashes are recorded there. Native source, accepted code/evidence/reports/inventories/closures and all checklists are unchanged. No OS or protected-store preservation claim is made.

**STOP AT WP5-F L3-A Native Renderer Admission — Architecture Decision Review Gate.** No production/source mutation, test/build/renderer execution, protected Component/Foundation/I-AM/backend access, D6 verification, current owner/PID/lock investigation, recovery, Windows Identity/N01/token/elevation/WinPE/VM, commit, push or GitHub synchronization occurred. Complete WP5-F, D6 and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.
