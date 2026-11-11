# V1 Implementation Sequence

**Final owner decision — November 10, 2026.** Local Windows V1 is **ACCEPTED and CLOSED** based on the verified Stage 1–7 implementation and supporting evidence. All stage evidence and documented qualifications stand and are non-blocking for this closure. This decision resolves the overall local acceptance gate described below. Future work requires separate authorization.

**Stage 7 owner disposition.** Local Source Integrity, External Change Detection, and Interrupted-Save Recovery is accepted within its verified Windows scope. The final custom Preview iframe timeout and Windows fixture-cleanup lock remain unresolved qualifications. Earlier accepted Preview evidence stands. The next gate is overall local V1 acceptance review using existing evidence.

**Stage 5 milestone — November 7, 2026:** Accepted for the verified local Windows integration configuration, including the 15-second host proof budget, at the exact revisions recorded in the [owner acceptance record](../v1-stage5-local-windows-acceptance-closure-20261107.md). Stage 6 and Stage 7 remain separately authorized milestones. Overall V1 acceptance remains open.

**Current scope override — November 6, 2026:** Functional, reliable local Windows V1 is the current acceptance target. Ubuntu/production clock qualification, Caddy, cloud resources and production-host readiness do not gate local V1. Stage 5 security capabilities must work locally under unchanged security contracts. Production deployment and recovery execution remain future, separately authorized milestones; this override does not begin Stage 6/7 or waive local release/data-integrity requirements. See [the local scope review gate](../v1-stage5-local-development-scope-review-gate-20261106.md).

November 3, 2026. **PROPOSED; implementation not authorized.** Stop at the UI Platform V1 Final Technical Planning Review Gate. Authority, evidence labels, commits, preserved acceptance and source ledger are in [Technical Decisions](V1-TECHNICAL-DECISIONS.md). Root abbreviations: Platform = `C:/Projects/Modular/ui-platform`; Base = `C:/Projects/Modular/ui-base`; Data = `C:/Projects/Modular/UI Platform Data Services`, including `packages/i-am`.

## Independently reviewable stages

| Stage | Dependencies / affected repositories and exact seams | Bounded result and acceptance exit | Explicit exclusions |
| --- | --- | --- | --- |
| 1. Component admission | Approved planning gate; Platform registry/native admission, visual model/validation/source/inspector/runtime; Base UI/Forms/Hero metadata and needed shared defects. See component plan. | Eight tags, Forms Select demonstration, Card selection/actions, Panel collapse, Hero links/actions; configure/save/reload/Preview/publish in an isolated target. Matrix C1–C5. | No replacement Builder, blanket package activation, bulk source migration, production auth or CRUD completion. |
| 2. Visual inventory CRUD | Stage 1; Platform visual source/action/binding controls, runtime/services and existing Form helpers; Data client/secured request/engine only where the existing interface proves insufficient. | Dataset creation/schema application; list/detail/create/edit/delete/refresh without custom application JS or hand-entered action JSON. Matrix D1–D4. | No general query language, grid framework, arbitrary SQL, generalized Workflow designer or multi-Dataset hosting promise. |
| 3. Asset adapter increment | Stage 1 for shared controls; Platform composition upload helper/manager, retained chooser and presentation adapter; Base assets for generic defects. | Composition UI uses uploader/picker presentation over protected file/hash transport; successful user-owned browser upload and retained-interface regressions. Matrix A1–A2. | No asset-ID migration, removal of accepted interfaces before parity, or claim that private byte enforcement already exists. |
| 4. Role administration | Settled four-role decisions; Platform management routes/security administration; Data I-AM WP3 administration/evaluator/delegation. Can follow stages 2–3 independently. | Reusable scoped role assignment/revocation and application provisioning; direct endpoint allow/deny, grant ceiling and last-admin protection. Matrix I1–I5 under admitted development boundary, repeated in production later. | No role inheritance, data bypass, broad grant repair or operational power implied by role title. |
| 5. Production security/runtime | Approved environment/IdP/session choices and release policy; stages 2–4 contracts. Platform production host/session/release resolver seams; Data trusted actor/secured host composition and current I-AM/applied schema; protected asset service. | Trusted sign-in, permanent identity mapping, release-qualified behavior, protected data/private bytes, management isolation. Matrix P1–P4, A3, I1–I6 on selected target. | No removal of development guards, production use of static/dev tokens, client actor headers or unrestricted Builder proxy. |
| 6. Controlled release target | Stage 5; approved operator/OS/process/deployment choices; Platform artifact build/deployment/local target/migrations; Data schema/runtime configuration. | Staged immutable release, actual health/activation adapter, update/restart and compatible rollback. Matrix W2–W3, O1–O2. | No infrastructure platform, multi-cloud target suite, or automatic data restore on failure. |
| 7. Local Source Integrity, External Change Detection, and Interrupted-Save Recovery | Accepted local Stages 1–6; existing editor, watchers and Foundation transactions. | External-change warnings, draft-preserving checksum conflicts, explicit reload or overwrite, current authority at commit, and verified rollback or authorized journal recovery. Matrix O3–O6. | Git/GitHub preserves committed source. Platform-managed backup, coordinated capture, full restore, and operational-data backup are outside local V1. |

Stages 1–4 prove local behavior; they do not establish production security. Stage 7 qualifies local editing and source recovery independently of production disaster recovery. Separate authorizations and review gates prevent one stage from implicitly authorizing another.

## Smallest visual CRUD contracts

VERIFIED-SOURCE: `ArtifactMetadata.sources` supports fixture/service references; state, bindings, conditions, repeaters and onLoad actions exist. `service` actions await a service but do not capture its result. `record-delete` has a typed Dataset/primary-field/record/result-state contract. Form runtime already maps permanent fields, validates, writes and reports read-back. The plan fills these seams rather than replacing them.

| Contract | Proposed minimum | Existing reuse / admission |
| --- | --- | --- |
| Source identity | Stable source name, application-owned Dataset ID, applied schema/field identities, allowed query reference | Existing sources, application data client and applied-resource resolver; never caller-selected backend URL. |
| Query inputs | List with bounded page/limit and deterministic primary-key ordering; detail equality on permanent primary field; optional one category filter for Select demonstration | Existing protected query intent vocabulary. UI exposes only supported operators/fields; server validates them. No new backend query grammar unless inspection during implementation proves necessary. |
| Result | Rows, selected record, loading/empty/error and request generation; denied is distinct from empty; only authorized fields returned | Bind existing source/state to service completion; validate response and ignore stale responses after newer request, route change or destruction. Do not store authority in result metadata. |
| Repeater | Existing node/collection/item/index declaration; permanent record ID for selection; bound Card heading/display fields | Reuse existing clones; do not rely on row index as record identity. Add keyed preservation only if necessary to prevent observed focus/selection defects. |
| Actions | Visual select-record, open detail/edit route, create Form, submit, delete, refresh | Existing set/navigate/Form/delete; use generic event inspector. Expose typed result capture/refresh on service source; add one typed query action only if needed. |
| Refresh | Initial load, explicit refresh, successful Form commit/delete; preserve query and clear stale selection when target disappears | No polling loop. Known committed/read-back failure refreshes by reading; unknown commit outcome shows reconciliation action without automatic write retry. |
| Persistence/release | Save sources/query/result bindings/actions alongside existing metadata; literal content/placement stays HTML | Shared validation, source helpers, expected hashes and frozen release closure. Protected server resolves admitted query/Form/action contracts from selected release. |

Inventory acceptance uses permanent ID, required name, quantity and active flag; add category for the ninth-component demonstration only. List repeated Cards, select detail, create/edit with existing Forms, then protected single-record delete and refresh. Validate zero/false/empty separately, denied fields/rows, target application mismatch, stale record and service interruption. All ordinary configuration must be through controls. Trusted setup/provisioning is recorded separately from the application authoring journey.

## Exact stage 1 authorization request to prepare later

The first implementation authorization should name:

1. The approved eight tags, ninth Select and Card/Panel/Hero behaviors in [Component Admission Plan](V1-COMPONENT-ADMISSION-PLAN.md).
2. Allowed edits in Base owning-package metadata/implementation only for demonstrated shared defects; Platform registry/native admission, visual validation/source/inspector/runtime integration and focused tests. Any package manifests/archive/install outputs needed to exercise updated physical packages must be explicitly included. Data Services changes are outside this first stage.
3. A fresh disposable application root/store, actor/provisioning method and evidence destination. No existing pilot/Page/security-state repair is implied.
4. Explicit permission to run the focused source/round-trip/runtime tests and browser acceptance, including required builds and isolated dependency preparation. Current planning authorization forbids them.
5. Preservation baseline and changed-file inventory, expected hash/admission checks, duplicate/missing-module refusal, unsupported-setting refusal and package version checks.
6. Stop at Component Admission Review Gate with matrix C1–C5 evidence and documented limitations. No commit/push, production work, broad control conversion or next-stage execution unless separately granted.

Production technical choices can remain pending while stage 1 proceeds. If physical-package integration cannot be bounded without additional files, return that exact dependency for authorization before modifying it.

## Scope discipline

Retain native HTML for semantic content. Retain existing specialized source/number/tri-state controls, dirty-tab lifecycle and native dialogs where replacement risks accepted semantics. Full UI Layout replacement, App Manager administration replacement, all-package certification, Tour/Calendar products, advanced rich text/wizards, import orchestration and multi-host orchestration are outside V1. New defects enter a stage only when required for its stated acceptance; accepted limitations remain documented until explicitly requalified.
