# V1 Technical Decisions

**Current scope override — November 6, 2026:** V1 development and acceptance use the existing local Windows environment. Ubuntu, Caddy, cloud infrastructure and production-host preparation are future production qualifications and are not local acceptance prerequisites. Required I-AM/WP3, permission, identity/session/revocation, data integrity and truthful outcome contracts remain mandatory locally. Local application failures remain blockers. No infrastructure or later-stage execution is authorized. See [the current local scope and review gate](../v1-stage5-local-development-scope-review-gate-20261106.md). The original planning record below is retained with this explicit scope override.

Planning date: November 3, 2026. Gate: **UI Platform V1 Final Technical Planning Review Gate**. Implementation is not authorized. Only these five planning documents may be written. All proposed tests and operations below require later bounded authorization; none was executed for this review.

## Authority and evidence

Precedence: finalized user product decisions; later accepted milestone closures; V1 Addendum; earlier reviews; current source evidence. Material discrepancies must be reported, never silently used to reverse acceptance. The original Status/Gap Review, UI-Base Reuse Audit and Addendum were retrieved from the Codex chat **Review UI Platform V1 status**, ID `01a1a3fc-0429-7eb0-8d28-1175a9cff305`. They are response artifacts, not missing repository Markdown reports. The initial inventory is `C:/Projects/Modular/UI-Base-Packages-Reference.md`, dated November 3; package capabilities were checked against source.

Evidence labels throughout this set:

- **ACCEPTED:** a user-approved historical result, within its recorded boundary.
- **VERIFIED-SOURCE:** inspected source implements the stated mechanism; no new runtime pass is implied.
- **PROPOSED:** recommendation awaiting implementation authorization or technical approval.
- **UNVERIFIED:** behavior or environmental capability not demonstrated in this planning pass.

Read-only Git observations found initially clean worktrees at:

| Repository | HEAD |
| --- | --- |
| `C:/Projects/Modular/ui-platform` | `6384c42f7f192c5bcefe3323ac338cb12a2abafe` |
| `C:/Projects/Modular/ui-base` | `3cbe073c9192c4eba8086b88dd2978b179539b2f` |
| `C:/Projects/Modular/UI Platform Data Services` | `81b769eef3763d02343f5347888c26edab6ef7bc` |

No tests, builds, application/store constructors, HTTP application visits, deployments or recovery operations were run. In particular, some apparently read-only service constructors initialize stores; source files were read directly instead. No applicable AGENTS.md was found in the inspected workspace/repository/document paths.

## Accepted baseline and conflicts

The [local pilot closure](../v1-local-audience-pilot-acceptance-closure-20261103.md) accepts ordinary authoring, shared composition, three Pages, explicit Publish, frozen published-v1 build and an independent loopback reader. It does not accept public/LAN hosting, production identity or overall V1 completion. Preserve its 390px DOM/navigation/geometry evidence and missing mobile screenshot distinction, socket-enumeration qualification, dependency-installation boundary and historical failed tests.

Preserve [HTML-first closure](../v1-html-first-acceptance-closure-20261026.md), [two-component closure](../v1-two-component-acceptance-closure-20261027.md), [shared composition](../v1-shared-website-composition-closure-20261030.md), [mixed admission](../v1-mixed-page-admission-closure-20261029.md), [images](../v1-image-and-asset-selection-closure-20261031.md), [appearance/layout](../v1-appearance-and-layout-inspector-acceptance-closure-20261101.md), and [saved Preview context](../v1-saved-preview-status-navigation-context-acceptance-closure-20261101.md). Later closures qualify earlier open items only to the extent explicitly stated. Normal-browser unsaved-draft Preview protection remains deferred/unaccepted. Service upload evidence is not successful browser-owned upload evidence. Page revisions do not independently freeze mutable asset bytes. Legacy Windows EPERM suite failures and broader client diagnostics remain historical limitations.

Explicit product decisions supersede the Addendum's proposed noninteractive Card, noncollapsible Panel, optional Hero actions, conditional uploads/private assets and undecided retention. Those are now required. Eight initial tags, an additional existing component, four nonhierarchical roles, self-hosting, external identity, 6-hour RPO, 30-day backups and 90-day audit retention are settled. RTO is not settled; 24 hours is a candidate only. No conflict with an accepted milestone was identified: bounded prior acceptance and required future qualification describe different scopes.

## Remaining choices and recommendations

| ID | Choice and alternatives | Recommended minimum / trade-off | Approval dependency |
| --- | --- | --- | --- |
| T1 | Complete owning-package manifests versus Platform-specific component editors | Complete versioned metadata and explicit admission; retain generic inspector/source/runtime. Small shared defects go to UI-Base. Avoid a second instance store or broad migration. | Approve bounded stage 1; eight tags already approved. |
| T2 | Ninth component: Forms Select versus another layout primitive | `uib-forms-select`: existing implementation, scalar options attribute, value/change semantics, useful inventory category. Demonstrates extension through the same metadata/admission path. Layout primitive would test fewer binding semantics. | Accept this demonstration choice. |
| T3 | Query service closure versus a new query/action framework | Extend existing service sources/actions with bounded query input, result and refresh configuration. Reuse repeaters, state, Forms and protected delete. Add a typed query action only if the existing service contract cannot safely expose results. | Approve contracts described in sequence; no arbitrary SQL or JavaScript. |
| T4 | Replace all three asset interfaces versus staged adapters | Composition uploader first; retain image chooser pending parity; retain presentation version-owned form for V1. Public/private storage and byte enforcement remain mandatory regardless of retained UI. | Approve dispositions; do not waive browser upload proof. |
| T5 | Shared authoring runtime versus release-qualified protected host | New production composition over existing secured engine/request handler, current I-AM and applied schema. Resolve Forms/actions/queries from a verified release closure. Keep development guards intact. | Approve runtime contract and supported release policy. |
| T6 | One host with isolated processes versus separate machines/containers | One independently administered production server, separate runtime/API, Data Services and management boundaries; external IdP; off-server backup. Process/service isolation is the minimum candidate. Containers are an alternative if operator standards justify them. | Owner supplies constraints and approves OS/process/deployment technology before selection. |
| T7 | Direct external bearer handling versus server session | Candidate: provider-supported federated sign-in terminated by trusted server; server-owned secure session; permanent issuer/subject-to-I-AM mapping. No browser actor assertion or role-to-admin shortcut. | IdP/protocol/session requirements and lifecycle approval; no provider selected. |
| T8 | Reuse present permission IDs versus split management capabilities | Reuse existing IDs where semantics fit. Review source export currently using application-view and broad presentation-admin publish/rollback. Runtime Viewer must not gain management/source export. | Approve endpoint-specific role policy before production enforcement work. |
| T9 | Coordinated quiesced backups versus online cross-store snapshot protocol | Quiesce all cooperating writers, capture one manifest covering files/schema/records/security/release state, verify, encrypt and copy off server. Simpler for one environment, with a measured maintenance interval. | Approve downtime window and off-server destination/access custody. |
| T10 | Backup timing and 24-hour candidate RTO | Candidate every 4 hours with measured capture/transfer/retry margin; alert before newest verified off-server restore point exceeds 6 hours. Qualify a 24-hour candidate through full drills before adopting it. | RTO approval remains outstanding; schedule alone is not RPO proof. |

## Source dependency ledger

Paths in this table are relative to the named repository root above. These are concrete reuse/change seams, not an assertion that every file needs editing.

| Evidence | Source inspected / implication |
| --- | --- |
| E1 Components | UI Platform `src/server/component-registry.ts` discovers manifests/installed packages and flags missing modules/duplicate tags; `src/server/native-ui-base.ts` explicitly admits only Card/Panel, enforces physical installed paths and version selection. Extend narrowly, retaining refusals. |
| E2 Authoring | UI Platform `packages/visual-artifacts/src/{model,source,validation,runtime}.ts`, `src/client/visual-artifacts/editor.ts`; UI-Base `packages/ui-base-ui/src/platform/{definition,registry,renderer}.js`. Existing typed settings, mappings, bindings, events and repeaters; structured setting support is not universally established. |
| E3 Components | UI-Base `packages/ui-base-ui/ui.component.json`, `src/layout/index.js`, `src/actions/uib-action-button.js`; Forms `src/{metadata,form-control-base}.js`, `src/controls/uib-forms-select.js`; Hero `ui.component.json`, `src/uib-hero.js`. Runtime events exist beyond current manifest declarations. Forms has no `ui.component.json` at inspection. |
| E4 Data | UI Platform `packages/visual-artifacts/src/{form,form-runtime,runtime,model}.ts`, `src/server/{application-data-proxy,form-contract,development-application-runtime}.ts`. Form writes/read-back and delete already exist; generic service action discards return values and sources lack query/result lifecycle configuration. |
| E5 Identity | Data Services `packages/dataset-operations/src/{development-actor-provider,secured-development-host,secured-request-handler,secured-engine}.ts`; `packages/i-am/src/{token-verifier,wp2/evaluator,wp3/service,wp6/delegation}.ts`. Production identity/session host is missing; static token verifier is not an external IdP integration. |
| E6 Management | UI Platform `src/server/{v1-management-routes,v1-security-administration,v1-development-identity,v1-development-policy,dataset-development}.ts`. Existing checks and bounded pilot administration need production identity and reusable role UI. |
| E7 Assets | UI Platform `src/client/visual-artifacts/{image-selection,composition-manager}.ts`, `src/client/main.ts`, `src/server/{application-composition,application-presentation}.ts`; UI-Base `packages/ui-base-assets/src/components/uib-asset-{uploader,picker,browser}.js`, `src/providers/orm-asset-provider.js`. File/hash and version-owned contracts differ from generic asset-record provider. |
| E8 Releases | UI Platform `src/server/{composition-snapshots,presentation-publications,exporter}.ts`; `packages/visual-artifacts/src/{composition-runtime,composition-vite,revision-composition-vite,page-entry}.ts`. Reuse frozen release and managed revision machinery; not all development reader paths are recovery-free production paths. |
| E9 Operations | UI Platform `packages/artifacts/src/application/{build,deployment,local-target,migrations,json-provider,common}.ts`. Integrity, migration, stage/health/promote, conditional rollback, explicit recovery and operation logs exist. Provider backup covers its schema/state/rows, not complete cross-store recovery. |
| E10 Security recovery | Data Services `packages/i-am/src/wp1/{store,portability}.ts`. SQLite WAL security/admin audit is distinct from portable definitions. Portable view intentionally excludes live assignments/authority; ordinary export is not a security backup. |

## Environmental qualifications and blockers

VERIFIED-SOURCE: current workspace is a Windows development arrangement with relative file dependencies, a vendored native UI archive, TS-source package exports and Node SQLite use. `paths.ts` contains a sibling `orm` default, whereas the authorized actual Data Services repository has a different name. Treat it as a configuration/dependency seam to trace when used, not proof that a separate ORM deployment exists. No unexplained location was treated as available. No production hardware, OS, DNS/TLS, operator, identity provider, storage, data volume, maintenance window, off-server destination or key custody was established from inspected evidence.

Production blockers within accepted scope: missing trusted production identity/session/provider wiring; release-qualified Form/action/query authority; server-enforced private asset metadata/bytes; full role/API isolation; browser-owned upload proof; visual CRUD configuration; whole-application consistent restore and retention; connected deployment/health/restart target. They have bounded proposed remedies in the companion documents. No demonstrated technical impossibility requires expanding V1 scope. Environmental selections and an approved achievable RTO require owner input; they cannot be inferred from the local pilot.

## First authorization prerequisites

Approve stage 1 in [implementation sequence](V1-IMPLEMENTATION-SEQUENCE.md), the ninth-component choice and exact allowed source/test/package outputs. Designate a fresh disposable acceptance target and evidence location; permit focused mutating verification there and explicitly account for prerequisite package builds/installations. Preserve accepted pilot inputs and historical evidence. Record source/dependency baseline and allowed integration mechanism for updated physical packages. Stop after component admission review, before CRUD, production, permissions, dependency refresh beyond the admitted package scope, or deployment. This review grants none of those permissions.
