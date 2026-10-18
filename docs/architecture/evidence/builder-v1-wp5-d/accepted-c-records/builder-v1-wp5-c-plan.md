# Builder V1 WP5-C — Detailed Plan and Prerequisite Review

## Current authorization — D5 approved

**D5 ARCHITECTURE REVIEW APPROVED. D5.1–D5.6 and WP5-C C1–C5 IMPLEMENTATION AUTHORIZED**, by explicit user instruction. Earlier STOP AT D5 REVIEW and proposed/unapproved wording below is retained planning history, superseded by this decision. Implement the approved contract and plan in order, then **STOP AT WP5-C IMPLEMENTATION VERIFICATION/REVIEW**. Do not begin WP5-D. D6 remains WP5-F; A37 management restart remains WP6. All 40 umbrella requirements remain unchecked.


2026-10-17. **PLANNING ONLY. STOP AT WP5-C D5 ARCHITECTURE REVIEW.** The user has accepted and closed WP5-B. Neither this plan nor the existing WP5 allocation authorizes proceeding past the latest D5 gate. No WP5-C implementation, service registration or WP5-D work has begun in this planning increment. All 40 umbrella requirements remain unchecked.

## Scope and allocation

Implement the existing approved WP5-C allocation after review: typed Trigger/Workflow fields, ordered actions and approved service selection; Form success and Page activation of the same Workflow; visible failure results. This supplies subsystem evidence for A24–A27 and completes the automation event controls contributing to A14. WP5-G still owns general isolated automation testing; WP6 owns the complete UI-only reference journey.

Reuse WP1 owner-qualified workspace navigation, WP2 working copies and protected source transports, WP4 Form submission/visibility/calculation contracts, WP5-A diagnostics and WP5-B public-instance/event controls. Preserve permanent Application, Dataset, Field, Trigger, Workflow and Visual identities. Renaming or reordering a step must not change its action ID. Source keys required by existing automation are resolved against the authoritative applied Dataset; they do not become a second permanent Field identity system.

Exclude new automation/source formats, arbitrary service registration or handler authoring, a policy/schema/expression engine, Dataset migration, multi-Dataset hosts, new Components/renderers, package Button fabrication, whole-Workflow transactions/rollback, durable notification delivery/audit/retries, external messaging and automatic Publish. Menu/branding remains WP5-D, Problems/refresh WP5-E, design-preview and contention remediation WP5-F, isolated test infrastructure WP5-G and release admission WP5-H. No WP5-F locking implementation is included here.

## Inspected authorities and gaps

Paths in this table are relative to UI Platform unless prefixed `Data Services:`.

| Existing authority | Reuse and bounded gap |
| --- | --- |
| `src/shared/automation.ts`: `AutomationDefinition`, `AutomationValue`, `automationDiagnostics`, `automationDependencies` | Preserve schemaVersion 1, ordered actions and literal / explicit path / named-fields bindings. Add typed controls over these existing values; never interpret text as code or add interpolation. Native validators remain authoritative. |
| `src/client/automation/editor.ts`, `src/server/automation-store.ts` | Keep `EditingLifecycle`, source hashes, conflict/recovery, autosave and server validation. Existing editor exposes action/source text and inserts an unapproved default notification action; replace that supported UI path with an explicitly selected approved action after D5. Preserve advanced-source repair without using it as acceptance evidence. |
| `src/server/automation-runtime.ts` | Reuse Trigger source-provider registration, ordered each/batch execution, Workflow primary-record rereads, protected ports and audit. Current service interface has only `transactional` and `invoke(unknown, context, port)`; it lacks approved typed signatures and dedicated invocation permission checks. D5 is a prerequisite. |
| `src/server/builder-development-host.ts` | Normal map is empty; normal approved Workflows currently allow only CRUD actions on the pinned Dataset. Admission must recognize only the separately approved host service contract, not weaken to arbitrary service strings. Preserve single-Dataset checks. |
| `src/server/application-diagnostic-adapters.ts`, `src/shared/application-diagnostics.ts` | Current service catalog deliberately reports `contract-review-required`. Registration alone is not approval. Extend its read-only projection only after D5 and retain native missing/incomplete diagnostics. |
| `packages/visual-artifacts/src/model.ts`, `runtime.ts`; `packages/platform-core/src/application-data.ts` | Existing `workflow` action invokes protected `workflow.run` with permanent Workflow ID and scalar primary-record expression; declared result state receives native result. Reuse renderer/transport. Current generic service action does not capture an action result; do not silently redefine it. |
| `packages/visual-artifacts/src/form.ts`, `form-runtime.ts`; WP5-B `authoring-controls.ts` | Use actual public Form success payload and existing expressions; verify numeric/string primary IDs without coercion. Workflow selection is missing from the supported B event controls. Author on the instance, without editing Form/package definitions. |
| Data Services: `secured-development-host.ts`, `secured-engine.ts`, `secured-request-handler.ts` | Reuse trusted identity, Workflow allowlist/permission and protected Dataset execution. Add only reviewed host capability plumbing for service authorization. Do not trust actor/context values copied into action inputs. |
| Data Services: `trigger-registry.ts`, I-AM `wp1/models.ts`, `wp2/evaluator.ts`, existing delegated service publication/interpreter | Keep registry order, inherited execution and existing delegated publication/capability checks. A trusted host callback is distinct from a published declarative service program; neither registry can be used to bypass the other. |

The [separate D5 proposal](builder-v1-wp5-c-d5-service-contract.md) inventories the real candidate and proposes the missing contract. It does not assert that the candidate is registered or authorized in the normal host today.

## Proposed implementation sequence after D5 approval

These are subdivisions of WP5-C, not a separate WP5B or changes to the approved A–I allocation. Stop on any newly discovered authority or source-format blocker.

| Step | Deliverable and dependencies | Verification gate |
| --- | --- | --- |
| C1 — approved catalog and host admission | Implement only the reviewed D5 descriptor, fixed I/O validation, identity/permission boundary and read-only authorized catalog. Depends on D5 decisions, current I-AM/resource authority and existing host setup. No registration HTTP endpoint. | Tests for empty/unregistered/denied/revoked catalogs, direct invocation, owner/revision checks, supported phases, input/output failures and honest effect outcomes. Normal host readiness rejects unapproved services and multi-Dataset actions. |
| C2 — typed definition controls | Application/Dataset selectors, applied primary-field resolution, Trigger phase/priority/each-or-batch, ordered stable-ID actions; Workflow CRUD/service steps. Use authorized catalogs; hide no unsupported saved configuration. | Native validation, independent drafts, autosave/Undo/Redo, invalid draft retention, stale Dataset/contract conflicts, reorder/rename identities and server direct-request checks. |
| C3 — typed action inputs | Pending-field set and rejection where native phase permits; protected CRUD records/query; approved service inputs. Controls construct existing `AutomationValue` trees within depth/size limits. Field/path choices come from authoritative metadata and actual context. | No raw action JSON in supported journey; required/type errors; unsupported values retained with diagnostics. No forward/prior-step-output binding added: native `AutomationValue` has no step-result source. |
| C4 — invocation and result inspection | Add existing `workflow` action to supported instance-event UI. Authorized permanent Workflow picker; existing primary-ID expression control; explicit declared local result state and supported binding display. Form success and a real existing Page interactive target invoke the same Workflow. | Actual browser authoring, protected success/failure, failedStep/action correlation, completedSteps/committedSteps, afterCommit failure and uncertain transport outcome. No package Button assumed. Design preview exposes no executable Workflow capability. |
| C5 — regression and browser evidence | End-to-end supported C journey, direct-request abuse, compatibility and inventory. Depends on C1–C4. Reuse approved deterministic test fixture; broader isolated session features remain G. | Full affected regressions/contracts/builds/typechecks/production exclusion plus real Builder interactions and evidence preservation. Stop at WP5-C verification/review; do not automatically start D. |

Creation controls must preserve existing source ownership and WP1 creation/coordinator paths. Before adding controls, verify the native default/create path can represent a complete valid typed definition without manual IDs/JSON. Any new persistence or identity authority is a blocker requiring review, not an implied part of C2.

## End-to-end subsystem acceptance criteria

- [ ] C-A01: Create/select Trigger and Workflow through Builder, choose the authorized Application and pinned applied Dataset, and retain permanent IDs across rename, reorder, save, tab switching and reload. Existing WP2 draft/conflict recovery remains intact.
- [ ] C-A02: Author supported Trigger phases, priority, scope and ordered set/reject/CRUD/service actions using ordinary controls. Invalid combinations remain visible and fail native/server validation. Registration order is not substituted for native priority/ID ordering.
- [ ] C-A03: Author Workflow CRUD and approved notification steps, each referencing permanent targets. Display the selected service version and phase restrictions. Empty/denied catalogs provide an actionable unavailable state and cannot seed an unapproved default service.
- [ ] C-A04: Typed inputs use existing literal, record/oldRecord/newRecord/context path and named-fields forms. Required fields, unknown keys, missing paths and wrong types fail closed before effects. Applied Field IDs resolve to supported native keys; stale mappings require correction rather than guessed conversion.
- [ ] C-A05: Using actual Builder UI, wire one shared Form instance's success event and one actual supported Page interactive target to the same Workflow. Choose a scalar record ID from actual public metadata and explicitly declare a result state. A second Form/Component consumer and installed definitions remain unchanged.
- [ ] C-A06: Running Application demonstrates correct record targeting, deterministic step order and visible success. Failed primary reads, authorization denial, missing/stale/cross-Application targets, service removal and permission revocation reject through protected boundaries, including crafted direct requests.
- [ ] C-A07: Failure inspection shows native failedStep and its correlated stable action ID, completed steps, actual committed steps and service-effect certainty. Earlier writes remain committed after a later failure; afterCommit failure is not presented as rollback; unknown network outcome does not trigger retry. Service output is not fabricated as Workflow step output.
- [ ] C-A08: Nonpersisting design preview performs no Workflow, Dataset or external effect. Explicit deterministic test fixtures use independent storage and host-local sinks; normal records/sinks remain unchanged. General isolated testing UI remains G.
- [ ] C-A09: Existing Page service actions, bounded record-delete, Form create/edit/read, hidden retained-field submission, calculations, mandatory Dataset validation and DOE/I-AM regressions remain compatible. Multi-Dataset host requests are rejected with actionable diagnostics.
- [ ] C-A10: UI/Data Services affected full regressions, editor/storage contracts, builds/typechecks and production exclusion pass at C5. Capture actual browser actions, successes and failed attempts, source changes and unchanged-definition/evidence hashes. Subsystem results do not check any A01–A40 umbrella box.

## Evidence and verification plan

Reuse `tests/trigger-workflow.test.ts`, `tests/trigger-workflow-browser.test.ts`, WP5-A/B suites, native Visual/Form tests and Data Services protected-engine suites as starting points; add focused coverage at the owning boundary after approval. Run full relevant repository regressions and current build/typecheck/editor-exclusion scripts, recording exact commands/environment/results at implementation time. These are planned checks, not claims of a new test run.

Browser evidence must show actual create/configure/save/reload/event/result interactions. Native setup may prepare disclosed security/test prerequisites but cannot prove UI-only Application provisioning or all Builder rejection paths. Preserve earlier successful, unsuccessful and transitional evidence. Do not overwrite accepted B inventory hashes when closure documentation changes; its inventory is a historical verification snapshot.

## Dependencies, risks and decisions

1. **D5 approval required:** typed input/output, trusted service descriptor, dedicated permission/resource mapping, Trigger trusted-context plumbing, effect/outcome reporting and deterministic fixture isolation. Proposed choices are explicitly enumerated in the D5 document.
2. **Public event payloads:** inspected `form-runtime.ts` emits `submitSucceeded` with `{result}` containing the protected write outcome; it does not promise the primary ID there. `recordCreated`/`recordUpdated` wrap the reread saved record in `{result}`. Use existing `route`/declared-state record identity for a route-selected edit success, or an actually supported record-event path where appropriate; do not fabricate a success-payload ID. Verify actual saved Form and package/Platform event metadata before designing pickers. Missing exposed record identity or unsupported interactive metadata is a review blocker if it requires architecture; never invent a Component or silently change shared Form behavior.
3. **Workflow result limits:** existing runtime returns aggregate status/counters, not arbitrary prior-step outputs. Authoring and inspection must reflect that; no extra expression source or workflow variable system is included.
4. **Authorization races:** reuse native current-policy admission checks for service effects and protected writes. Revocation at/before admission rejects; already completed effects cannot be undone. Do not claim a cross-service transaction or solve locking incidentally.
5. **D6 remains open:** source-reader contention planning/remediation stays WP5-F and requires separate admission/locking design review. Reliable simultaneous Builder/runtime use is required before WP5-I acceptance. A37 full management-restart/browser evidence remains WP6.
6. **Approval sequence:** approve/revise D5 before implementation; then execute C1–C5 within approved scope and return at C verification/review. WP5-D and later remain gated. Complete Builder V1 acceptance remains pending.

## Historical D5 planning review gate (superseded by approval)

**WP5-B ACCEPTED AND CLOSED. WP5-C PLANNING COMPLETE FOR REVIEW; D5 PROPOSAL UNAPPROVED. STOP HERE.** This record grants no new authority or service registration. See [planning verification and changed-file inventory](builder-v1-wp5-c-planning-verification.md).

## Current implementation verification/review gate

D5.1–D5.6 and the C1–C5 plan are approved. See [implemented architecture](builder-v1-wp5-c-implementation.md) and [verification/results](builder-v1-wp5-c-verification.md). Earlier planning-only STOP AT D5 REVIEW wording is historical. **STOP AT WP5-C IMPLEMENTATION VERIFICATION/REVIEW. Do not begin WP5-D.** No WP5-C or Builder V1 acceptance is claimed. All 40 umbrella requirements remain unchecked.
