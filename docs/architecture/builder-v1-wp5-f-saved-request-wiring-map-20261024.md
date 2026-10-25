# Saved Preview request wiring — before implementation

2026-10-24. Recorded before code changes. Existing source snapshots/hash baseline are under `evidence/builder-v1-wp5-f-saved-preview-request-20261024/`.

| Boundary | Exact ownership / new wiring |
| --- | --- |
| `shell.ts` production composition | Instantiate one actual SavedPreviewRequestController and pass it into the same shared `createBuilderShellView`. No discovery/authorization/default-adapter/persistence work moves |
| `shell-view.ts` selection | Derive subject/session/Application/owner-qualified artifact/kind and dirty hints from existing focused, active, nonsuspended tab and session. No editor methods/DOM inspection/node inference; original identity remains caller-owned |
| New visible action/status | A sibling section alongside existing fixture Preview, one “Check saved Preview availability” action through the existing delegated click listener; new status subscription only updates that section, not editor DOM. Permanently unavailable provider, no success or grant path |
| Source notifications in root | Existing saved-source/workspace callbacks additionally invalidate request generation; existing fixture/Problems callbacks remain. No new event subscriptions/poll/scheduler |
| Session/authority suspension in root | Existing session revision change and failed authority poll additionally suspend readiness before existing coordinator suspension. Poll policy/interval and services unchanged |
| View mount/park/dispose | View resumes/parks/disposes readiness and removes its status subscription on terminal dispose. Existing single root click listener stays view-owned; no additional native listeners, timers or frames |
| New shared contract | Runtime-validated original selection/request lifecycle metadata and explicit unavailable codes only. Existing `workspaceIdentityKey` reused; type-only source imports do not execute readers |
| Completion sequencing | Production controller snapshots selection and generation; an optional test-only completion barrier permits deterministic late-response verification. It cannot supply capture/allow data; only the fixed unavailable provider determines outcome |

No callback for Save/flush/reload/discard/history/creation/link/upload/Problems/default adapters is added to the controller. Dirty is informational and does not alter autosave. Existing fixture code stays byte-identical. Default construction in the view permits old callers to remain compatible; production passes its explicit controller and owns existing root lifecycle notifications. The normal composition root is verified by static wiring comparison, not executed in the isolated harness.

Exact prospective execution: named new shared/controller + `tests/preview-contract-model/saved-preview-request.test.ts`; new `tests/fixture-preview/saved-preview-request-harness.ts` using identical production view/controller plus already admitted real EditorRuntimeContext/working copy/source editor/coordinator/session facade/memory transport; dedicated `scripts/verify-saved-preview-request.mjs`. Full resolved import closure is inspected/admitted before execution. No Node pure models, NativeCardHost, backend, Foundation, source provider or native renderer entry. Existing fixture panel is present but its render action is not invoked; any iframe construction in readiness verification fails.
