# Builder V1 WP5-C — D5 Trusted Service Contract Proposal

## Current authorization — D5 approved

**D5 ARCHITECTURE REVIEW APPROVED. D5.1–D5.6 and WP5-C C1–C5 IMPLEMENTATION AUTHORIZED**, by explicit user instruction. Earlier STOP AT D5 REVIEW and proposed/unapproved wording below is retained planning history, superseded by this decision. Implement the approved contract and plan in order, then **STOP AT WP5-C IMPLEMENTATION VERIFICATION/REVIEW**. Do not begin WP5-D. D6 remains WP5-F; A37 management restart remains WP6. All 40 umbrella requirements remain unchecked.


2026-10-17. **PROPOSED, NOT APPROVED OR IMPLEMENTED. STOP AT D5 ARCHITECTURE REVIEW.** Read with the [WP5-C plan](builder-v1-wp5-c-plan.md). The previously approved D5 allocation requires this separate prerequisite review; it does not approve this registration or permission design.

## Actual inventory and suitability

| Inspected source | Actual behavior today |
| --- | --- |
| `scripts/trigger-workflow-reference-host.ts`: `startAutomationReference` | Creates `reference.notification` in a fixture-local Map. `transactional: false`; `invoke(input)` appends `structuredClone(input)` to a process-local `notifications: unknown[]` and returns `{ delivered: true }`. No email, network or durable delivery. Fixture additionally assigns Platform authority; that assignment is not suitable normal-host onboarding and must not be copied. |
| `src/server/automation-runtime.ts`: `RegisteredAutomationService`, `action` | Interface accepts unknown input/output and context plus protected read/write ports. Rejects unregistered service; nontransactional services are allowed only afterCommit for Triggers, or in Workflows. There is no I/O signature or dedicated service-permission check at this boundary. |
| `src/server/builder-development-host.ts` | Normal service map is empty. Approved Workflow readiness permits only CRUD actions on the configured single Dataset. No existing normal-host notification registration, permission grant or typed approval can be claimed. |
| `src/server/application-diagnostic-adapters.ts`: `registeredAutomationCatalog` | Reports registered identities/transactional flags as `contract-review-required`; correctly does not infer approval or signatures. |
| `src/client/automation/editor.ts` | Add-action currently hardcodes this reference identity with null input. That is a source-editor convenience, not a trusted catalog or approval. Planned typed controls must remove this unsupported default path. |
| `tests/trigger-workflow.test.ts`, `tests/trigger-workflow-browser.test.ts` | Test-only maps/substitutes prove order and committed afterCommit failure, including an explicit `NOTIFICATION_FAILED` substitute. They do not establish normal-host registration or dedicated service authority. |

**Recommendation:** reuse the existing candidate as a minimal deterministic, in-memory reference effect. Keep its existing identity and implementation behavior. Narrow its approved input at a trusted wrapper; do not invent a new notification product. The word `delivered` means appended to that host's in-memory sink only. It proves no external or durable delivery. The reference journey must label that meaning and the sink's restart lifetime.

Existing Visual `dataset.read`, `dataset.write`, `dataset.deleteRecord` and `workflow.run` adapters are protected platform capabilities, not evidence of additional registered `AutomationRuntime` callback services. Keep their current dispatch and permissions; do not expose them as invented entries in the notification service catalog.

## Proposed fixed version-1 signature and validation ownership

| Contract item | Proposed value |
| --- | --- |
| Registry identity | Existing `reference.notification`; qualified by trusted authority/Application registration. No new executable artifact identity. |
| Registration contract version | `1`, in a host-owned descriptor, separate from unchanged AutomationDefinition schemaVersion 1. A contract digest covers identity, version, signature, phase restrictions, permission and implementation binding. |
| Input | Exactly a plain object `{ message: string }`; required message length 1–2000 UTF-16 code units, no implicit coercion/trimming; reject unknown keys, arrays, missing/nonstring values and unsafe object keys. Existing fixture previously accepted arbitrary values; old reference fixtures remain explicitly legacy test fixtures, not approved version-1 callers. |
| Output | Exactly `{ delivered: true }`, meaning the validated clone was appended once during this invocation. No generated IDs, clocks, recipients, external endpoints or arbitrary return objects. |
| Allowed execution | Workflow step or Trigger `afterCommit`, `each` or `batch` using the existing input binding. `transactional: false`; no pending-record patches. No precommit exception or reinterpretation of afterInsert/afterUpdate as afterCommit. |

No authoritative typed callback I/O schema exists in the inspected `RegisteredAutomationService` contract. Native `automationDiagnostics` validates action/value structure, not a registered service's input/output. Data Services' existing `validateServiceProgram` validates its distinct published declarative CRUD executable; it cannot validate this callback's signature and must not be misrepresented as doing so.

Propose a fixed TypeScript input/output contract with one bounded validation function owned by the existing automation service boundary, following current native explicit object/key/type checks. The server calls it on the resolved input before invocation and validates the output afterward. The authorized catalog exposes only this descriptor's field/type/length metadata for editor controls; client checks are advisory. This is a finite extension of the existing registered callback contract, not a generic schema DSL, new schema engine or user-authored validator. Native action shape, Dataset schema and all existing authoritative validators continue to apply independently. If implementation discovers an authoritative reusable callback signature contract, reconcile with it before adding this predicate.

Retain current AutomationValue literal/path/fields serialization. A supported message can be a literal or an existing typed string Field/context path through `{ fields: { message: ... } }`. No string interpolation, new operators or expression grammar. Missing paths must fail input validation, never stringify undefined or a record object.

Existing actions store an unversioned service ID. For this bounded proposal the trusted host accepts only the explicitly approved version-1 descriptor and revalidates every captured definition/catalog against its digest at admission. It must not silently interpret old actions using an incompatible later signature. A future incompatible service-contract migration is a separate review, not permission to mutate stored action formats in WP5-C.

## Trusted registration and dedicated permissions

Propose a read-only host descriptor extending the existing trusted registry entry with contract version/digest, signature metadata, permitted execution phases, Application allowlist and required invocation permission. Host code binds the already existing implementation to a host-local sink. Neither source metadata, HTTP JSON, package discovery nor a Builder text field can supply callbacks, allowlists, permissions, digests or sink objects. Readiness rejects duplicate/unknown identity, unsupported version or mismatched descriptor/implementation. Normal-host selection remains unavailable until the approved descriptor and explicit grants exist.

Proposed dedicated permission ID: **`automation.reference.notification.invoke`**. This name and its resource mapping require review; no such permission or grant is asserted to exist today. Use the existing I-AM `SecurityPermission` / permission-set / assignment / activation lifecycle and `SecurityAuthorizationEvaluator`, with an Application-owned `artifact` resource whose permanent ID is the existing service ID and whose parent is that Application. This avoids adding a `service` resource kind: `SecurityResourceKind` currently has `artifact` but no `service`, while the separate `SecurityService` represents a principal. The trusted resource authority resolves this artifact only from an approved active registration under that authority/Application; a client-supplied artifact cannot create it. Require exact service-resource scope for the intended grant; existing broader policy grants remain subject to the authoritative evaluator rather than a second policy filter.

Editing a Workflow, having Dataset write authority, possessing a service string or a normal host Workflow allowlist entry does not itself confer this dedicated invocation permission. Registration approval is not a grant. The existing Workflow invocation permission and permanent-ID allowlist remain required as well. Authorized management provisions the dedicated permission/grant explicitly; do not copy reference fixture Platform-role assignment or grant creator privileges automatically. Missing policy definitions/grants fail closed with actionable administrator prerequisites.

## Identity, Application and revocation admission

1. Authenticate the normal request using existing attested development identity and Application routing. Preserve the existing Workflow endpoint allowlist and I-AM authorization; read the primary record through DOE with the same trusted execution.
2. Resolve the service by trusted descriptor under the exact authority/Application. Check enabled source, permanent artifact identity, single applied Dataset target, registered contract version and phase. Input cannot change the Application, actor, service identity or permission.
3. Resolve existing action bindings from authorized data/context, validate input, and authorize the dedicated service-resource request through existing attestation/evaluator with the inherited opaque trusted identity. Recheck registration/resource/policy currency at effect admission using native revision/current-authority conventions. Expired, inactive or revoked authority rejects before the effect.
4. Invoke the fixed host implementation once, validate output and record a sanitized outcome correlated to existing execution/artifact/action IDs. Never log credentials or full record data by default. No automatic retries.

**Actual plumbing gap requiring approval:** Workflow runtime has `TrustedDatasetExecution`, but passes only display/context data and protected ports into its generic action method. TriggerContext supplies actor/source and protected closures, not the opaque attested execution handle. Copied actor JSON is not trusted identity. Propose a narrowly scoped host authorization callback/capability carried through the existing engine-owned Trigger execution closure and Workflow action call. It attests/authorizes only the registered service invocation against the original trusted context, never exposes that context in AutomationValue/browser metadata and never manufactures authority from `context.actor`. Deny if unavailable. Preserve close/reentry checks and operation lifetime; afterCommit authorization must use the current identity, not a cached precommit grant.

Use the existing I-AM admission model: removal/revocation before effect admission denies; a completed effect cannot be revoked retroactively. Do not promise atomic commit across policy storage and an external service. The candidate's append is synchronous after the final authorized admission; any asynchronous preparation must finish before that check. D6 graph/source locking work remains separate.

## Transaction and honest result contract

| Situation | Required behavior |
| --- | --- |
| Nontransactional candidate in before*/afterInsert/afterUpdate/afterDelete | Reject before calling it, preserving native phase rules. Before-commit failure rolls back the Dataset transaction through DOE. No sink append. |
| Trigger afterCommit success | Dataset commit already exists; append once and return the fixed output. Do not count sink append as a second Dataset commit. |
| Trigger afterCommit denial/failure | Existing protected result reports committed Dataset data plus failed afterCommit work and duplicate-write warning. Do not return rollback or retry the original write. |
| Workflow later step fails | Preserve native completedSteps, failedStep and actual committedSteps from DOE writes; earlier Dataset commits and completed sink effects remain. Workflow is not one atomic transaction. |
| Service throws before append | Failed step with no confirmed service effect; zero additional Dataset commits. Test substitute must declare its failure-before-effect behavior truthfully. |
| Output invalid or failure after possible append | Report service failure with service-effect outcome `occurred` only if host evidence proves it, otherwise `unknown`; no rollback/no retry. Output validation cannot undo an effect. |
| Transport response lost | Execution/effect outcome is unknown to the client. Do not translate it into a confirmed denied/uncommitted result or retry. |

Current `WorkflowResult` exposes aggregate status, IDs, completedSteps, failedStep, error, committedSteps and optional postCommitFailed/repeatWriteMayDuplicate; it does not return service outputs. Propose additive optional, sanitized per-service outcome evidence in the existing runtime result/audit, correlated by action ID, with `not-performed | occurred | unknown` and a bounded diagnostic, to prevent an output-validation failure from hiding an already performed effect. Keep Dataset commit counters unchanged; do not reinterpret `committedSteps` as total effects. Known legacy service entries without evidence cannot claim `not-performed` after a thrown invocation. The exact additive field name is an implementation detail under this reviewed contract; no new executable step-result binding is authorized. Existing consumers ignoring new result fields remain compatible.

## Deterministic testing and isolation

Reuse the existing candidate logic with a separate host-local notifications array per explicit test host/session. No singleton sink, network, mail, filesystem delivery, background dispatch or live ports. The approved normal host also uses its own in-memory reference sink; test sessions cannot read or append it. Inputs/outputs are cloned. Limit observation to authorized diagnostic/test results; expose no unauthenticated sink endpoint. Lifecycle/disposal follows existing host/test session boundaries, with bounded observation and explicit cleanup. No durable delivery claim is made.

Provide fixed success and fail-before-effect substitutes under the same reviewed signature, phases and permission gate, selected by trusted test assembly only. Tests may additionally simulate malformed output and uncertain response to verify honest reporting. Production/ordinary source cannot select a failure injector. Continue using isolated DOE/ORM/identity fixtures; service substitutes must not capture normal storage or bypass authorization. General WP5-G isolated test UI is still a later package; C uses disclosed explicit fixtures rather than claiming G complete.

## Failure and compatibility matrix

| Case | Required result |
| --- | --- |
| Unknown/unregistered service | Existing unavailable/not-registered semantics; no invocation. Persisted drafts may remain repairable with native diagnostics; unavailable targets cannot run or pass readiness. |
| Registered but unapproved, missing version/signature/permission | No selectable approved entry; direct requests fail closed, no fallback to the legacy callback map. |
| Unauthorized/revoked User or grant; wrong authority/Application | Native I-AM denial or nondisclosing unavailable target; no service effect or unauthorized Dataset mutation. Prior authorized Workflow commits remain honestly reported. |
| Wrong input/path type, stale Dataset or contract, unsupported phase | Native validation/admission error; no service effect. Never coerce or remap to another registered service/Dataset. |
| Concurrent registration change | Recheck the trusted descriptor/revision at admission; reject stale captured catalog/action state. Do not substitute an old implementation silently. |
| Existing Trigger/Workflow source | Keep schemaVersion 1, service identity strings, permanent action IDs, ordering, each/batch scopes, existing dependency extraction and value semantics. New approvals are host metadata, not a second source definition. |
| Existing protected data and published services | Reuse DOE/I-AM/Trigger Registry. Native published service-principal execution still requires its existing publication, executable digest, service-use approval, execution capability and permission ceiling. Reference callback uses inherited identity and cannot opt into service-principal mode. |
| Existing Visual actions/Form | Keep `workflow.run`, generic service actions, bounded record-delete and WP4 Forms compatible. No shared definition edits or replacement renderer. Design preview supplies no executable capability. |

The service string remains an existing dependency extracted by `automationDependencies`. Diagnostic resolution qualifies it through the trusted Application registration, not a global guessed ID. No additional permanent automation artifacts, public handler route or automation engine is introduced. Existing reference tests may retain explicitly trusted legacy maps; those fixtures cannot establish normal-host service approval. The normal host never exposes a permissive legacy fallback.

## D5 decisions approved by the user (proposal wording retained)

| Decision | Proposed approval |
| --- | --- |
| D5.1 — candidate | Reuse existing `reference.notification` as an in-memory deterministic reference effect only; no external/durable delivery. |
| D5.2 — signature/version | Approve exact `{message:string}` input and `{delivered:true}` output, fixed validator ownership, version-1 trusted descriptor/digest; unchanged action serialization. |
| D5.3 — registration/permission | Approve host-only registration, Application-qualified artifact resource, dedicated proposed permission and explicit existing I-AM activation/grants; no automatic fixture privilege. |
| D5.4 — trusted context | Approve the bounded existing-engine/host capability plumbing for both Workflow and Trigger service permission checks; actor JSON is never authority. |
| D5.5 — outcomes | Approve afterCommit/Workflow-only effects and additive sanitized service-effect evidence alongside unchanged Dataset commit reporting; no retries/rollback fiction. |
| D5.6 — isolation/compatibility | Approve separate deterministic sinks/substitutes, no external effects and no permissive normal-host legacy fallback; retain native published-service security and all WP0–WP5-B contracts. |

After approval, C1 must prove these boundaries with direct and browser tests before C5 review. A missing trusted capability or authoritative resource/permission contract is a blocker to return for review, not permission to add another engine. **No registration or implementation is performed by this proposal. WP5-D and WP5-F remain outside this gate.**

## Current implementation verification/review gate

D5.1–D5.6 and the C1–C5 plan are approved. See [implemented architecture](builder-v1-wp5-c-implementation.md) and [verification/results](builder-v1-wp5-c-verification.md). Earlier planning-only STOP AT D5 REVIEW wording is historical. **STOP AT WP5-C IMPLEMENTATION VERIFICATION/REVIEW. Do not begin WP5-D.** No WP5-C or Builder V1 acceptance is claimed. All 40 umbrella requirements remain unchecked.
