# Builder V1 WP5-E — prerequisite review and architectural blocker

## Qualified user acceptance and closure — 2026-10-18

**BUILDER V1 WP5-E IS ACCEPTED AND CLOSED**, limited to E1–E7 functionality and verified subsystem boundaries, subject to the documented D6 graph-lock remediation dependency. Accepted results: 36/36 focused, 1/1 actual browser journey, 146/146 editor/storage contracts, 760/760 Data Services, successful builds/typechecks/production exclusion, and all 745 historical evidence hashes preserved. Full UI remains **474/476 — NOT PASSED**; both graph-lock failures and the inconclusive WP4 accepted-source baseline remain retained. The earlier 86/87 affected record remains a failed run.

D6 carries into separately reviewed WP5-F architecture work; no lock weakening, admission bypass or WP5-F implementation is authorized here. WP5-I requires reliable simultaneous Builder/runtime operation and successful regression verification of affected scenarios. All 40 umbrella requirements remain unchecked. Complete Builder V1 acceptance remains pending. See [qualified closure and proposed checkpoint](builder-v1-wp5-e-closure.md). No commit or push has been performed; separate authorization is required. Original verification-time wording and results below remain historical.

## Subsequent architecture authorization — 2026-10-18

The user subsequently approved a single Platform-owned JSON settings authority, validated atomic updates with concurrent-write protection, a typed/versioned contract, existing server-side identity/administrator authorization and live propagation. The disabled fallback below was explicitly approved. The original missing-authority blocker is superseded; the following initial inspection remains historical. See `builder-v1-wp5-e-implementation.md` for the completed implementation. The subsequent approved read-only legacy resolution also supersedes the legacy stop; see builder-v1-wp5-e-verification.md for current results. WP5-E remains open and unaccepted.

2026-10-18. WP5-E implementation is authorized by the user, including the approved autosave clarification. WP5-D remains accepted and closed. This record is a prerequisite inspection, not implementation verification or acceptance.

## Stop condition reached

E4 explicitly requires: “If no suitable existing persistent settings authority is available, stop and document the architectural blocker instead of introducing an unreviewed parallel settings store.”

No suitable implemented Platform-wide persistent settings authority was found in the inspected UI Platform source, packages, or UI Base packages. The Platform Settings navigation item is disabled (`src/client/main.ts`, sidebar). `docs/architecture/settings-architecture.md` describes a recommended independent settings service and conceptual get/set/resolve/subscribe interface; this is architecture guidance, not an implemented storage/security/change-notification contract. `packages/platform-core/src/manifest.ts` describes settings metadata, not persistent Platform preferences. Existing Application settings use Application-owned `app.settings.json` through `src/server/applications.ts` and `settings-session.ts`; substituting that Application scope would violate the approved Platform-wide scope.

Implementation stops here. No new settings store, settings API, lifecycle change, Problems UI, or dependency refresh was introduced. Resolving this blocker requires review of a Platform settings authority (or identification of a suitable existing authority), including persistence location, read/write authorization, validated updates, concurrent writes, and propagation to open editors. This record does not approve that architecture.

## Approved autosave behavior retained for implementation

Without a saved preference, new and existing installations use enabled=true and delayMs=2000. Saved preferences take precedence, including enabled=false across restart. Delay is an exact integer millisecond value from 100 through 60000, in increments of 10 milliseconds; the UI accepts hundredths of a second without silently rounding invalid input. Configuration changes restart pending inactivity periods without forcing an immediate save and preserve admitted saves and dirty drafts.

Invalid/unreadable stored preferences must be reported without overwriting the stored value. Proposed safe fallback for architecture review: disable automatic saves until valid configuration is available, retain dirty drafts and explicit Save Now, and display the configuration failure. This proposal has not been implemented or represented as an approved exception to the user's defaults.

## Initial editing adapter inventory

| Adapter | Existing lifecycle |
| --- | --- |
| Generic artifact editors, including Dataset via working copies | `artifact-editor/working-copy.ts` constructs shared `EditingLifecycle` |
| Visual Page/Shell/Component/Form | `visual-artifacts/editor.ts` constructs shared lifecycle |
| Composition sources, including Menu | `visual-artifacts/composition-manager.ts` constructs shared lifecycle |
| Trigger/Workflow | `automation/editor.ts` constructs shared lifecycle |
| Application presentation | `artifact-editor/presentation-session.ts` constructs shared lifecycle |
| Application settings | `artifact-editor/settings-session.ts` constructs shared lifecycle |
| Legacy Page source editor | `builder.ts` has a separate local save routine and 3000ms timer |

The legacy Page surface is a coverage exception. Its adapter feasibility and safety need assessment before claiming universal coverage; no migration or new editing authority is approved by this record. Management operations remain separate. This is an initial construction-site inventory, not verified end-to-end coverage.

## Verification, evidence, and unresolved issues

Read-only source searches and inspection established the findings above. No automated suites, builds, typechecks, browser verification, persistence/restart checks, or historical hash verification were run for WP5-E. No passed test claims are made. Existing historical evidence was not edited; hash preservation remains unverified in this increment. WP5-E is not ready for implementation review.

Unresolved issues:

1. Blocking: suitable persistent Platform settings authority absent from inspected implementation.
2. Pending architecture decision: invalid/unreadable settings fallback and configuration error reporting.
3. Pending assessment: legacy Page editor lifecycle adapter and coverage.
4. Unimplemented/unverified: E1–E7, all required regression/browser evidence and final deliverables.

Changed-file inventory for this prerequisite increment: this record and the current-authorization entry in `builder-v1-wp5-plan.md`. Existing unrelated working-tree changes were retained. Accepted WP5-D closure and historical records were not rewritten. A01–A40 remain unchecked. No commit, push, WP5-F work, acceptance, or closure was performed.
