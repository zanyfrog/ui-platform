# WP5-F remaining scope and roadmap dependency review

2026-10-22, America/New_York. **READ-ONLY PLANNING. STOP AT WP5-F Remaining Scope and Roadmap — Roadmap/Implementation Authorization Review Gate.** Both fixture increments are accepted only within their documented limits, most recently [Sample Coverage and Builder Integration](builder-v1-wp5-f-sample-integration-closure-20261022.md). Complete WP5-F, D6 and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.

## Decision summary

The shortest useful independent next increment is **Builder Shell Presentation Isolation and Preview Wiring Verification**: extract a small shared production view boundary for artifact navigation, tabs, editor stage and fixture Preview status/lifecycle wiring, then verify that exact view with the already admitted real editing modules and synthetic inputs. This would close an identifiable presentation-integration gap without claiming normal backend qualification. It is a proposal, not work authorized or started here.

Full ordinary Builder shell integration cannot presently be qualified end to end under a prohibition on live protected dependencies. The unchanged production composition root performs real discovery, authorization/polling, editor mounting and broad feature composition. Mocking all of that may make a browser run safe, but changes what the result establishes. A real shared view with explicit input boundaries can support a narrower honest claim; it cannot establish production authority, coherent saved capture, transactional storage, external writers or remote revocation.

More fixture families and pure inspectors remain possible, but have less immediate value than this remaining UI seam. They should not become an indefinite substitute for deciding the D6/security/capture prerequisites of complete WP5-F.

## 1. Independently implementable Builder/Preview work

All rows require a separate bounded authorization and exact source admission before execution. None authorizes reading saved protected inputs.

| Work | Dependency-free boundary and claim limit |
| --- | --- |
| Shared shell presentation and Preview wiring | Real production view for navigation/tabs/stage/status, explicit callbacks/data/session notifications and controlled scheduling; synthetic discovery/authority answers and existing in-memory editing adapter in tests. No ordinary endpoint or default editor path in test closure. Qualifies only shared presentation/orchestration |
| Fixture usability/accessibility | Typed controls over the existing exact Card/Panel/route schemas, keyboard/label/error feedback, truthful fixture-versus-selected-artifact identity. Preserve all schema/security constraints and editor independence; no new native or source capability |
| Bounded lifecycle/resource robustness | Admitted fixture-only cleanup/timeout/late-response/repeated-open/race, stale keyboard/pointer inertness, memory/session limits and compatibility evidence on explicitly named installed browsers. No policy weakening, new installation or arbitrary-code sandbox claims |
| Pure Region/route/manifest diagnostics | Authored in-memory metadata/literal sources using existing pure helpers; exact bounds, identities and rejection reasons. A Region occupancy/remap inspector is not native Region rendering; route inspection is already accepted and does not qualify routing |
| Native package/renderer safety audits | Static inspection of explicit local source/manifest/resource paths without importing packages for discovery. Admission matrix and closure planning can advance independently; actual new execution needs complete safe admission and authorization |
| Further native fixture rendering | Conditional: authored fixtures may use an existing implementation only if its full initialization/render/event/resource closure is admitted without runtime changes, substitute native dependencies or effects. Current Panel is a native layout fixture; legacy package metadata cannot become an invented canonical Definition |
| Visual/Form/Region fixture feasibility | Source-only closure/contract review and synthetic schema modeling can proceed independently. Actual native fixture activation is conditional: current Visual renderer imports the Forms barrel and Form/composition runtimes; Forms includes recent-value storage helpers. Denied browser effects alone do not admit those paths. If safe execution needs a protected-runtime change or native shim, stop that candidate for architecture review |

Pure typed imports and stateless helpers must not be confused with protected store access. For example, the inspected `ValidatorRegistry` source has type-only imports and local validation maps, whereas storage readers acquire real state. This observation neither authorizes Foundation execution nor proves that the resolved compiled package closure is admitted. The recommended minimum below does not require adding that registry or the default Properties/plugin graph to the executed test closure.

## 2. Work dependent on protected integration prerequisites

| Remaining functionality | Required dependency / acceptance evidence |
| --- | --- |
| Selected saved artifact Preview | Original subject/session and permanent owner binding; fresh read authority; coherent selected revision and complete transitive source/package/theme/asset closure. No fixture label or client Boolean substitutes for admission |
| Coherent capture under concurrent writers | Existing D6 graph/role acquisition and revision rechecks verified on the applicable source. No second graph coordinator, read bypass, retries after callback admission or inferred lock-recovery permission |
| Saved dependency/resource delivery | Immutable captured bytes and exact package/asset closure, capture-qualified access and current authority, no live discovery/import/resource fallback. Package version strings alone are insufficient |
| Shared Platform Components and protected schemas | Authorized source/field visibility and owner-qualified resolution through existing authorities. No protected Component enumeration or metadata read simply to populate samples |
| Actual saved Shell/Region/Page/Menu/Form/theme Preview | Audited native renderer semantics plus complete authorized capture of applicable composition, routes, field metadata, packages and assets. Synthetic equivalents may be independent but cannot close the saved-artifact case |
| Trusted production revocation | Authority-owned policy/session/ownership invalidation with sequence/health/expiry/fail-closed delivery semantics and reviewed timing limits; per-delivery reauthorization. Existing local session events, workspace events and polling are not this qualification |
| Full ordinary Builder/default adapters/backend | Separately admitted normal discovery/auth/session/editing/service paths, actual saved-source/authority boundaries, transactional persistence and affected concurrent scenarios. Presentation-only tests do not establish these |
| Complete WP5-F acceptance | Supported-type matrix and honest unavailable policies, integrated native rendering/capture/security/lifecycle/editor preservation evidence and explicit review. D6 success alone is not sufficient; trusted authority and renderer safety can independently block activation |

D6, authority design and renderer admission are distinct dependency lanes, not one serial shortcut. Pure audits and UI work can run independently when authorized. Protected Preview activation waits until **all relevant lanes** are reviewed; no polling mechanism or eventual D6 pass should be relabeled a trusted revocation channel. The October 20 checkpoint/focused-verification failures and unresolved operational attribution remain historical blockers; this review does not reobserve, diagnose or recover a lock.

## 3. Better deferred to WP5-G/H or later packages

These allocations follow the existing WP5 plan; they are not new downstream authorization.

| Responsibility | Appropriate gate |
| --- | --- |
| Dataset/Form submission, record mutations, Workflow/Trigger execution and service substitutes | **WP5-G isolated protected tests**, with its own disposable/test-store, authority, validation, failure/commit/afterCommit and unchanged-normal-store evidence. Keep design Preview non-effecting |
| Release placement, server Publish gate, closure/revision races and published snapshot behavior | **WP5-H existing Release integration**. Fixture admission and a disabled/unavailable Preview action do not prove Publish enforcement |
| Supported integrated authoring/Preview/test/Release journey; affected regressions, production exclusion and readiness inventory | **WP5-I pre-WP6 readiness review**, after relevant package and D6 decisions. Existing subsystem acceptances do not accept I |
| UI-only reference Application provisioning, full operator journey and management restart/A37 | **WP6**, separately authorized after readiness. No normal application launcher or VM preparation is implied by this roadmap |
| General executable package parity, arbitrary HTML/JS/imports, unrestricted package discovery or a new renderer/runtime | Subsequent architecture/package decisions if ever desired; outside the functions-disabled WP5-F contract |
| Windows Identity/N01, elevation/token, WinPE/VM, Foundation lock recovery and historical provenance remediation | Separate operational/security decisions, not a shortcut or prerequisite experiment for this independent UI increment |

## Can the full ordinary Builder shell be safely verified without live protected dependencies?

**Not as full ordinary integration, and not by executing the unchanged composition root under the current restriction.** Static inspection identified these edges:

- `builder-workspace/shell.ts` creates the actual coordinator with `authorizeWorkspace` and `mountWorkspaceEditor`, invokes discovery on mount, subscribes to editor/source notifications, and registers a two-second authority poll. It also wires create/link/upload and Problems actions. Even nominal focus/discovery is a backend operation.
- `builder-workspace/requests.ts` refreshes session and issues actual workspace GET or POST `/authorize`; it has an existing specific pre-read-busy retry policy. A fake authorization response in a harness qualifies only control flow, not these real decisions or D6 admission.
- `builder-workspace/adapters.ts` imports generic/Visual/composition/automation/Form editors. Its generic branch creates a default `EditorRuntimeContext` and default shell; request bindings and editor paths can perform normal reads/writes. Constructor injection was available in the accepted context tests, but the normal generic adapter does not currently accept that test transport.
- `artifact-editor/shell.ts` statically imports Properties and default plugins; `default-plugins.ts` imports Dataset tools and old Form Preview. Passing an empty plugin registry does not by itself remove all statically imported initialization/dependencies. The old Form Preview explicitly flushes dirty source and opens the ordinary visual-preview path. It is not the admitted fixture host.
- Existing source-editor/context/working-copy/coordinator modules and the shared `fixture-preview-binding.ts` were actually exercised in the accepted increment. That evidence should be reused without relabeling the test adapter as `mountWorkspaceEditor` or the source renderer as the full Builder shell.

It is technically plausible to intercept every request in a test process so the unchanged shell reaches only synthetic responses. That still requires a complete static import and initialization audit, fail-closed interception before module load, verification of every background task/cleanup, and no ordinary server or source reader. It is a larger and less clear next proof than isolating the presentation boundary, and it would remain a **synthetic shell integration** result. Do not weaken native/authority boundaries, silently alias live modules to no-op replacements or claim full parity from mocked adapters.

## Shortest useful next increment: Builder Shell Presentation Isolation and Preview Wiring

### Proposed scope and prerequisites

Extract only the shared artifact navigation, tab list/editor-stage placement and fixture Preview selection/status lifecycle into a side-effect-free view factory (proposed `src/client/builder-workspace/shell-view.ts`). The existing shell remains the production composition root and delegates to that exact view. Keep existing outward mount/park/navigation APIs and authority, autosave and persistence semantics. The view receives explicit existing coordinator/data/session notifications and action callbacks; importing it must not start discovery, polling, create operations or normal editor/default-plugin imports.

Preserve production behavior for creation/link/upload/Problems actions in existing callbacks; do not implement or execute those operations in this increment. Review the extraction's source mapping so omitted or moved controls do not silently disappear. If separating the small boundary forces a broad shell/editor architecture rewrite, stop and reduce the candidate rather than extending this authorization proposal.

Reuse the accepted real source/context/working-copy/coordinator adapter in a dedicated view harness. Synthetic artifact discovery/authority/session inputs and memory transports stay test-only. The view must be genuinely shared with production, not a separately recreated test shell. Preview continues to receive only read-only identity/dirty hints. Injected callbacks are wiring, not a new authority, mode switch, source service or persistence adapter available to an untrusted frame.

Before implementation: agree on the exact moved controls/functions and production-default wiring; inspect the full view closure and resolved asset inputs; define park/unmount/listener/scheduler ownership and read-only Preview contract; fix an exact source/test allowlist and new evidence location. No D6, real backend, protected-store, native renderer, WP2 lifecycle/autosave or policy changes are prerequisites for this bounded shared-view candidate. Those dependencies remain for full ordinary integration.

### Proposed test boundaries after separate authorization

Keep the existing four fixture entry files as individually reviewed regressions. Proposed additions are exact `tests/fixture-preview/shell-view.test.ts` and `tests/fixture-preview/shell-view-harness.ts`, plus a dedicated verifier. These are prospective filenames, not files created here or permission to run. Unit execution remains serial, zero retries, explicit entry files; browser delivery remains exact in-memory assets on a dedicated loopback server, no proxy or ordinary application server. Inspect imports/setup/transitive build/launch behavior before executing any selected file. No wildcard workspace tests, normal build hooks, integrated storage suite or any of the 55 deferred Foundation tests.

Verify the actual shared view's controls and events: artifact selection, tabs/status/dirty/pending indicators, selected editor-stage retention, collapse/park/remount, source-file/caret selection, original owner/session binding, pending/late discovery or focus outcomes, and local session suspension. Refresh/sample edits, unavailable/error/stale/revoke/dispose must not call Save/flush/reload/discard, alter history, retarget identity or recapture automatically. Test programmatic preservation separately from intentional user focus changes. Calls into unapproved creation/link/upload/Problems/default-editor callbacks should fail the harness, not become fake successes.

Carry forward matched no-Preview/Preview traces for disabled and enabled autosave, including already pending memory saves across tab/park/remount. Record callback calls, actual DOM identity/selection, raw source/current/baseline/checksum/history and timer deadlines. Test teardown only disposes synthetic state after comparisons. Preserve the restricted-frame network/navigation/submission/upload/download/message/effect denials with receiving-server observations; a synthetic session/callback failure remains a local simulation, not trusted revocation.

### Acceptance criteria for that increment

1. The production shell delegates the enumerated view work to the same tested module, with a reviewable exact source/wiring diff and no altered authority, polling policy, autosave or persistence contract.
2. The isolated view's complete admitted closure has no ordinary requests, protected source/store readers, default editor/plugin initialization, effect adapters or import-time background operations. There is no native dependency replacement or fabricated authorization authority.
3. Actual shared-view navigation/tab/stage/status and fixture controls work in the dedicated browser while real admitted source-editing modules preserve bytes, checksums, original identity, file/range and Undo/Redo, with matching disabled/enabled timer traces.
4. Stale executable content is destroyed, denied/unavailable reasons remain truthful, terminal cleanup/late responses and listener/scheduler ownership are evidenced. Unexpected network, editor mutation, callback/effect or leak fails the affected case.
5. Deliver exact supported/unsupported claims, results, dependencies, before/after preservation and changed-file inventory at a separate acceptance gate. Label the result **shared Builder shell presentation integration**, leaving default adapters/backend/full ordinary integration open.

This is the shortest useful recommendation because it advances the precise production-wiring gap left by the accepted harness without first auditing every specialized editor, old Preview and protected backend. UI-only fixture polish is smaller but would not resolve that integration seam. Further native families can be separately chosen when an actual audit demonstrates a safe incremental closure.

## Roadmap and stop decisions

1. Review this closure and choose/revise the bounded shell-presentation proposal; authorize implementation explicitly if wanted. No execution follows from this report.
2. If authorized, complete the shared-view increment and stop for its own evidence/acceptance review. Keep full ordinary Builder integration open.
3. Independently authorize exact source-only native-closure or trusted-authority contract reviews when useful; retain candidate-specific stops and unavailable states. Do not bundle a protected-runtime fix into UI work.
4. Address D6/operational blockers only under their separate exact-scope decisions; then separately verify coherent capture, immutable delivery and trusted authority/invalidation. Do not treat D6 resolution as permission for protected Preview activation.
5. Review complete WP5-F supported scope and integration evidence, then separately sequence G/H, I readiness and WP6. No fixture acceptance automatically opens downstream packages or marks umbrella checks complete.

Stop the affected candidate before protected Component/store/lock/journal/transaction/recovery access, real backend/authenticated transport, D6 work, new executable package capabilities, policy weakening, native replacement or behavior changes outside the chosen view extraction. Preserve any failed evidence without broad retries. Missing/conflicting references stop only dependent work; safe independent authorized work may continue. Windows VM/token/identity/elevation/WinPE, Foundation recovery, commits/pushes/synchronization remain outside this roadmap review.

## Documentation-only preservation

This review adds only this roadmap, a new limited closure addendum and a new documentation inventory. Accepted source, existing reports/evidence/inventories/closure records and checklist are not rewritten. Before writing documentation, raw hash comparison of the preceding increment's **50 hashed entries** found zero mismatches; its 51st entry is the intentionally unhashed manifest self-entry. The new inventory records final enumerated preservation and source references. Hash comparisons/static source reads are not tests or builds. No protected store was read/enumerated, and no OS-wide or protected-store preservation claim is made.

**STOP AT WP5-F Remaining Scope and Roadmap — Roadmap/Implementation Authorization Review Gate. No implementation, tests, builds, browser launch, protected-store access, Windows work, recovery, commit or push is authorized or performed in this review. Complete WP5-F, D6 and WP5-I remain open; all 40 umbrella requirements remain unchecked.**
