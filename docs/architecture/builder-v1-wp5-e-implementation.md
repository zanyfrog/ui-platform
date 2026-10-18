# Builder V1 WP5-E — implementation and architecture record

## Qualified user acceptance and closure — 2026-10-18

**BUILDER V1 WP5-E IS ACCEPTED AND CLOSED**, limited to E1–E7 functionality and verified subsystem boundaries, subject to the documented D6 graph-lock remediation dependency. Accepted results: 36/36 focused, 1/1 actual browser journey, 146/146 editor/storage contracts, 760/760 Data Services, successful builds/typechecks/production exclusion, and all 745 historical evidence hashes preserved. Full UI remains **474/476 — NOT PASSED**; both graph-lock failures and the inconclusive WP4 accepted-source baseline remain retained. The earlier 86/87 affected record remains a failed run.

D6 carries into separately reviewed WP5-F architecture work; no lock weakening, admission bypass or WP5-F implementation is authorized here. WP5-I requires reliable simultaneous Builder/runtime operation and successful regression verification of affected scenarios. All 40 umbrella requirements remain unchecked. Complete Builder V1 acceptance remains pending. See [qualified closure and proposed checkpoint](builder-v1-wp5-e-closure.md). No commit or push has been performed; separate authorization is required. Original verification-time wording and results below remain historical.

2026-10-18. **E1–E7 implementation complete; verification/review results recorded in builder-v1-wp5-e-verification.md. WP5-E remains open and unaccepted.**

## Approved legacy resolution and implemented Problems scope

The user resolved the legacy review by retaining TypeScript Page inspection as read-only and making the shared-lifecycle Visual Page editor the supported Page authoring authority. The standalone legacy Save control, local save routine and 3000ms timer have been removed. The server PUT endpoint returns 405/`LEGACY_PAGE_READ_ONLY`; the underlying legacy save function also rejects before accessing a source path. No legacy source, identity, renderer, route or format was converted. Explicit authorized rename/delete management actions remain separate. Existing Pages navigation selects the supported Visual entry for generated Visual Page source rather than exposing a second writable legacy copy. Unmatched legacy source remains read-only inspection. The management permission regression now explicitly proves the authorized legacy PUT is rejected and source bytes are unchanged; it no longer expects the intentionally removed ordinary write capability.

Application Builder now exposes **Validate Application** and an **Application Problems** region. The existing WP5-A `validateCapturedApplication` foundation and native generic/Visual/automation/composition adapters remain the diagnostic authority. Authorized workspace discovery supplies permanent owner-qualified targets. Menus, settings and styles are captured independently when the fail-fast composition loader cannot build a complete graph. Native `compositionDiagnostics`, `validateMenu`, and a factored owning CSS syntax check report independent failures without a second validator. The CSS helper is used by both save and diagnostic paths.

Problems retains severity, code, message, subsystem, qualified target, saved revision and available native source/node/field information. Composition diagnostics pointing at another captured source carry that target's captured revision. Identical repeated native messages within a contribution are deduplicated without changing severity or rules. Legacy validation is explicitly unavailable, unconfigured composition is informational, and denied scopes or unresolved source/ownership remain incomplete. Unassigned malformed global automation produces opaque incompleteness rather than being guessed into an Application. This endpoint always returns `publishable=false`; it is not the WP5-H Publish gate.

Selecting a Problem uses the existing WP1 coordinator and freshly authorized descriptor. Visual node navigation and supported generic source file/line selection reuse native editor controls; unsupported field/step/source precision has an artifact-level note. Read-only fallback inspection refreshes its text on authorized focus. Deleted/inaccessible/ambiguous identities fail closed. A moved locator suspends the old adapter and retains its original draft; recovery or explicit close/reopen is required rather than rebinding a queued save to a new path. Unrelated editors and drafts are not saved, rewritten, closed or focused by validation.

Successful source transports emit a source-save notification. Workspace and native watcher notifications coalesce refresh requests. Platform Component and automation writes invalidate the active Application context conservatively; Application-local writes are filtered by Application key. Only an active Problems view refreshes. No source or working copy travels in the notification, and development notifications are removed from production builds.

The server's disposable, bounded cache is keyed by original subject, permanent Application identity and policy digest. Captured native references determine reverse transitive invalidation; changed sources and their dependents rerun, retaining unrelated cached results. Incomplete/uncertain capture conservatively reruns full validation, and explicit full Validate always remains available. The cache is not a source/dependency authority. Native discovery/read services may still validate as part of their existing read contracts; the cache only avoids redundant diagnostic-adapter execution. Full source revisions and membership are rechecked before return under existing graph admission. Stale captures have no diagnostics/revisions, and the client rejects superseded success and error responses. Revocation hides Problems and editor source; completely unauthorized Application requests return an opaque denial. Denied source identities/revisions are excluded from response metadata as well as diagnostics.

The user approved the centralized Platform settings design following the initial missing-authority prerequisite review. This record supersedes that blocker; it does not reopen accepted WP5-D or authorize WP5-F.

## Implemented authority and lifecycle configuration

`PlatformSettingsAuthority` owns `${UI_RUNTIME_DIR}/platform.settings.json` (the existing Platform runtime directory by default). The contract is `format: ui-platform.settings`, `version: 1`, `editor.autosave: { enabled, delayMs }`. No Application settings file, database or feature-specific alternate store is used. New settings domains require a reviewed version/validator extension to this same authority.

Missing files resolve to enabled=true, delayMs=2000 without creating a file. Saved settings override defaults. Integer millisecond delays must be 100–60000 inclusive in increments of 10. The UI parses decimal digits into integer hundredths, rejecting excess precision, exponent notation, nonnumeric and out-of-range values without rounding.

Writes reuse Foundation's live-owner cross-process artifact lock and flushed atomic same-directory rename utility. A public additive export exposes the existing lock without changing its implementation. The server compares the loaded file hash under lock and rejects stale revisions. Admission is rechecked before persistence. A competing writer receives conflict or existing lock-busy failure; no live lock is stolen. Direct filesystem edits are operator actions outside the managed-writer protocol.

Invalid schema, unsupported versions, invalid JSON, symbolic configuration files and unreadable storage resolve to a reported fallback with autosave disabled and delayMs=2000. The original file is not replaced; even administrator API writes reject fallback configuration. Operator restoration of a valid file is required before ordinary updates resume. No stored contents or raw storage error/path is returned.

`/api/platform/settings` supports authenticated reads and administrator PUTs. It reuses the Artifact Editor session/revision/CSRF boundary and the existing `ui.platform.security.admin` system permission through the trusted V1 identity service. No new grant or implicit promotion is added. Reads require the current editor principal; writes capture original permission admission. Non-V1 identity configurations are denied rather than assigned a new identity authority.

`/api/platform/settings/events` supplies a session-bound event stream. It checks configuration and authority every 250ms, sends only changed snapshots and terminates on revocation. This is bounded live propagation, not a zero-latency distributed guarantee. Clients apply their successful PUT immediately, stream other-session changes, disable automatic saves on connection loss and retry. Server restart reconnects through the existing session boundary; an expired session requires login. The development Settings → Editor → Autosave interface is read-only for nonadministrators and reports configuration failures globally.

The single shared `EditingLifecycle` subscribes to the resolved configuration. Changes cancel/restart pending inactivity timers, retain dirty history, preserve in-flight saves, and leave explicit flush/Save Now safety checks intact. Disabled autosave schedules no inactivity save. Subscription cleanup occurs on lifecycle disposal. This does not execute Apply, upload, workflow execution or Publish. Workspace refresh no longer replaces an open Platform Settings screen, preserving pending settings input.

## Editing adapter inventory

| Surface | Current authoring authority | Configuration coverage |
| --- | --- | --- |
| Generic source/properties, Dataset and generic legacy design/layout/hero | `artifact-editor/working-copy.ts` → shared lifecycle | Shared lifecycle subscription |
| Visual Page/Shell/Component/Form | `visual-artifacts/editor.ts` → shared lifecycle | Shared lifecycle subscription |
| Menu/composition settings/styles | `visual-artifacts/composition-manager.ts` → shared lifecycle | Shared lifecycle subscription |
| Trigger/Workflow | `automation/editor.ts` → shared lifecycle | Shared lifecycle subscription |
| Application presentation | `artifact-editor/presentation-session.ts` → shared lifecycle | Shared lifecycle subscription |
| Application settings | `artifact-editor/settings-session.ts` → shared lifecycle | Shared lifecycle subscription |
| Legacy TypeScript Page source in WP1 | `builder-workspace/adapters.ts` | Explicitly read-only; no autosave |
| Standalone legacy TypeScript Page source | `builder.ts` read-only inspection | No writable path or inactivity timer; server PUT and service write reject |

The distinction between generic legacy artifacts and the standalone TypeScript Page inspector is material. Source inventory finds six shared lifecycle construction sites and no remaining standalone legacy save timer. Main Platform startup connects the centralized settings authority before opening supported Builder editors. Independent reference/test harnesses that directly import editors are verification entry points, not a second ordinary Platform configuration authority. The approved Builder authoring/session boundary remains development-only; no production identity authority was introduced.

## Historical legacy contract review — resolved by the user

The user required: “If integration would violate accepted editing contracts, stop for architectural review,” and required a stop if identity, storage or editing guarantees must change beyond the approved design.

Concrete conflict: accepted WP1 architecture explicitly makes legacy Page source inspection read-only and states transport locators are not permanent identities. `page-builder.ts` derives Page IDs as `page:${source}` and structure-node IDs from source offsets. Its standalone save service writes raw TypeScript at the supplied path with an optional content hash; it has no permanent artifact identity, native candidate validation result, or final original-session/owner admission callback inside a serialized save. The HTTP route authorizes entry, but does not supply WP2 admission at the write boundary. A lifecycle wrapper alone would schedule through this weaker path. Extending it to claim WP2-equivalent ordinary authoring would require a reviewed identity/save-validation/admission contract beyond a debounce adapter. No new identity registry, Page format, validation authority, writable WP1 adapter or legacy save change was introduced.

The user subsequently chose read-only inspection, explicitly disabled the ordinary legacy write path and authorized continuation. That decision supersedes this historical stop. No new identity or save-validation authority was introduced.

See [verification and unresolved issues](builder-v1-wp5-e-verification.md) and [changed-file inventory](builder-v1-wp5-e-files.md). All A01–A40 remain unchecked. No acceptance, closure, commit or push was performed.


Final capture qualifies the native composition graph with the existing composition checksum and rechecks it before returning. Cache entries include native composition availability; changing availability cannot reuse incomplete prior results. Denied identities are excluded from diagnostic revision metadata.
