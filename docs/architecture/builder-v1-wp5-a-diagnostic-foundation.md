# Builder V1 WP5-A — Contracts and Diagnostic Foundation

**BUILDER V1 WP5-A — ACCEPTED AND CLOSED**, 2026-10-17, by user review of the diagnostic foundation and final reported evidence.

The user approved WP5-A through WP5-I and D1–D6 on 2026-10-17, with execution stopping at this increment. WP4 remains accepted and closed. All 40 umbrella acceptance requirements remain unchecked until final WP6 review.

## User review decision

Accepted evidence: **401/401 UI Platform tests across 59 suites, 14/14 focused checks and 146/146 editor/storage contracts**; final builds, typechecks, production exclusion and browser compatibility checks passed. Original successful, unsuccessful/transitional and historical WP0–WP4 evidence remains preserved.

The normal-host service contract and concurrent graph-lock contention remain open. Before WP5-C, submit a proposed typed, authorized, trusted registration contract for the existing reference.notification candidate (or another existing approved service) for review; do not invent/register services. D6 remediation planning is allocated to WP5-F, with admission/locking design review before implementation and reliable simultaneous Builder/runtime operation required before WP5-I acceptance. A37 full management-restart/browser evidence remains in WP6.

WP5-B is authorized under the approved architecture, with existing Component reuse mandatory. Stop at WP5-B verification/review and do not automatically begin WP5-C. The [WP5-B inventory and contract review](builder-v1-wp5-b-component-reuse.md) records the discovered Admin target blocker; UI implementation is stopped for architectural review. All 40 umbrella requirements remain unchecked. Historical implementation/review instructions below record the completed WP5-A phase and are superseded by this user decision.

## Implemented boundary

This increment supplies reusable server-side contracts and native validation adapters, not a Problems UI, new public validation endpoint or Publish gate. Application-wide discovery/navigation/refresh is WP5-E; direct-request publication admission is WP5-H. Callers must not mistake a validated subset for the complete Application closure.

`src/shared/application-diagnostics.ts` defines the diagnostic envelope: original severity/code/message, subsystem, captured revision, owner-qualified Workspace target and optional native file/path/line/column. Native node/field precision is retained; automation strings remain artifact-level rather than fabricated step locations. Status distinguishes complete validation, incomplete source/reference/access and stale capture; validity and release eligibility remain separate.

`src/server/application-diagnostics.ts` orchestrates trusted server contributions over captured source. Existing owner/identity services must authorize capture, reads and return admission. Denied source identities/revisions and raw read exceptions are not returned. Authority changes throw before any result escapes; revision changes discard diagnostics and return a nonpublishable stale result. Duplicate identities, absent roots and unresolved reachable dependencies fail closed. Owner-qualified keys prevent same-ID collisions across Applications and Platform/package owners.

The closure follows explicit roots and existing resolved references, without inventing build-order or runtime policy rules. Unrelated draft errors remain visible but do not become release blockers. A denied unrelated draft gives an opaque incomplete warning; missing roots/dependencies and incomplete reachable sources block. Empty roots cannot accidentally yield a publishable result. Full closure construction and revisions/discovery admission are required trusted integration inputs, not browser-supplied booleans or validators. No permission grants or source writes occur.

`src/server/application-diagnostic-adapters.ts` projects existing generic Editor DTO validation/references, AutomationStore diagnostics/dependencies, Visual metadata/source/role syntax and composition diagnostics. Captured DTOs/source metadata are cloned; executable functions are not captured or invoked. Reference resolution requires an existing authorized qualified target; unknown owners/services remain incomplete rather than guessed. Existing DOE/I-AM, Dataset schema validation, Form expressions/calculations and WP2 editing lifecycle remain untouched.

## Authoritative composition reporting

`packages/visual-artifacts/src/composition-validation.ts` now exposes structured `compositionDiagnostics`. The same existing checks collect independent failures: settings/default Shell, Visual identities/validation, route identities/path/collisions/capture, Page containment/Region mapping, Menu overrides/identity/validation, rendered Shell, theme and public Shell configuration. Dependent checks skip unavailable prerequisites while independent artifacts/checks continue.

Existing `validateCompositionDefinition` callers still receive a throwing, fail-closed compatibility API backed by this collector. Save/runtime callers retain the same authoritative rules. No separate composition validator, schema or expression engine is introduced. Warnings are retained in the reporting API and do not become throwing errors.

The filesystem `compositionWorkspace` loader still performs early validation and may throw while loading malformed settings/Menu/source files. WP5-E must enumerate and capture those source units independently before invoking native adapters; catching its first exception alone remains insufficient. This limitation is explicit rather than a claim that full Application aggregation is already wired.

## D5 service inventory and prerequisite

| Actual registration/contract | Signature and permission evidence | WP5 conclusion |
| --- | --- | --- |
| Normal Builder host: empty service map in `src/server/builder-development-host.ts` | No registered automation service signatures or dedicated service permission contracts. Its readiness check explicitly allows approved same-Dataset CRUD workflows only. Workflow execution uses the configured trusted workflow permission and DOE-protected operations. | No ordinary automation service is selectable. Do not bypass readiness or register a new implementation implicitly. |
| Existing Form/record adapters: `dataset.read` and `dataset.write` | Existing protected query/create/edit contracts; applied Dataset authority, field/operation permissions and mandatory DOE validation. These are not entries in the automation service map. | Reuse established adapters; do not relabel them as arbitrary callable automation services. |
| Reference launcher: `reference.notification` in `scripts/trigger-workflow-reference-host.ts` | `transactional: false`; input currently `unknown`; clones input into a local in-memory notification array and returns `{ delivered: true }`. No external delivery, durable persistence, approved typed input schema or dedicated service authorization contract is declared. | Existing minimal deterministic reference-effect candidate, not an approved normal-host service. Fixture registration/grants do not supply final UI-only provenance. |
| Test-only service maps (`tests/trigger-workflow.test.ts` and helpers) | Capture/order/failure probes exercise runtime semantics under test identity/ports. | Test fixtures are not production/development registry approvals and cannot populate the UI catalog. |

The new catalog projection enumerates only the supplied actual trusted registrations and marks entries `contract-review-required`; it never invokes implementations or infers approvals/signatures/permissions. An empty map yields an empty catalog.

**D5 review prerequisite before WP5-C:** the normal host has no approved reference service contract and rejects service workflows. Review whether/how the existing `reference.notification` contract is approved, typed, authorized and host-registered through the trusted registry, or explicitly select another existing approved service. Do not invent a new service, relax readiness or proceed with service selection while this prerequisite is missing. This does not block verification of the current read-only WP5-A foundation.

## D6 contention reproduction and diagnosis

The focused regression holds a real Foundation graph lock in a separate Node process, then attempts `withRuntimeGraphRead` in the test process. The bounded reader exhausts admission and rejects `Artifact is locked by another writer.` without invoking its capture callback. Releasing the lock writes the new revision; a fresh admitted capture returns that current revision. This reproduces the cross-process contention mechanism without weakening locks or supplying stale output.

Source diagnosis: `withRoleBundleGraph` uses the same exclusive `visual-runtime-graph-v1` lock for coherent captures/mutations. Foundation queues same-process callers but cross-process callers encountering a live owner fail admission. Runtime capture retries up to 20 attempts with 100 ms waits; graph capture duration and competing requests can exceed this budget. Builder workspace/source preview and runtime compilation both capture shared Platform dependencies; the focused Visual editor polls every three seconds. This explains a credible starvation/long-hold mechanism, not proof that every earlier browser timeout had the same cause.

The accepted WP4 failure history remains in [hidden-field reconciliation](builder-v1-wp4-hidden-field-reconciliation.md). Closing Builder before startup remains insufficient evidence of reliable simultaneous use. The new test is a controlled lock reproduction, not a simultaneous ordinary Builder/runtime browser acceptance run.

Proposed remediation for review: measure lock ownership/wait/hold durations and request types in the concurrent ordinary browser journey; coalesce redundant Builder captures and avoid holding the outer graph lock during work that does not require source consistency. Consider fair cross-process admission for complete captures while preserving graph-before-role lock order, live-owner protection, journal recovery, revision rechecks and cancellation/authority boundaries. Reacquire and capture current source after waiting; never substitute cached/stale source, steal a live lock or remove consistency checks. A larger retry count alone is not a demonstrated liveness solution.

No locking implementation changes are made in WP5-A. Ordinary simultaneous Builder/runtime use must be demonstrated reliable before final Builder V1 acceptance; a separately reviewed remediation and concurrent browser evidence remain required. Propose allocating the approved remediation to WP5-F preview integration, with the chosen admission design reviewed before changes and simultaneous-use browser proof required at WP5-I readiness. This allocation is a review proposal, not an implemented lock fix. A37 full management-restart/browser evidence stays in WP6.

## Gate

See [verification, unsuccessful attempts and limitations](builder-v1-wp5-a-verification.md) and [changed-file inventory](builder-v1-wp5-a-files.txt). Existing browser regression evidence protects accepted behavior; new UI-only authoring evidence belongs to the increments implementing those controls. WP5-A supplies no new authoring UI and claims no new UI-only journey completion.

**WP5-A CLOSED BY USER REVIEW. WP5-B is authorized with its own review gate; complete Builder V1 acceptance remains pending.**
