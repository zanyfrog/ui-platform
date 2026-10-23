# WP5-F Shared Builder Shell Presentation and Preview Wiring — implementation evidence

2026-10-22. Status: implemented within the authorized shared-presentation/synthetic-verification boundary; **awaiting increment acceptance**. This report does not supersede either accepted fixture increment, its closure, evidence or inventories. Complete WP5-F, D6 and WP5-I remain open and unaccepted. All 40 A01–A40 requirements remain unchecked.

## Change and production wiring

The production `src/client/builder-workspace/shell.ts` now delegates scaffold, title/status, grouped navigation, tab labels/actions, editor-stage placement, collapse, fixture Preview placement/selection and root mount/park to `shell-view.ts`. The exact pre-implementation control/function/data/callback map is [the move map](builder-v1-wp5-f-shell-view-move-map-20261022.md). The view receives presentation state and existing editor DOM, plus navigation and close callbacks. Preview still receives identity/dirty hints only. No editor methods or transport capabilities enter the view.

Production keeps authorization, discovery and sequence checks, the real coordinator/default adapters, creation/link/upload controls, Problems/dialog behavior, source/session subscriptions, authority polling and persistence ownership. Problems is inserted before Preview, preserving the existing order. Production's existing exported mount/park/navigate API and long-lived singleton policy remain. Terminal view disposal is a harness lifecycle capability, not a newly asserted production shutdown policy.

`production-wiring-proof.json` records six successful static comparisons against HEAD: services/subscriptions, coordinator construction, link/Create Form, Refresh/Create Dataset, session subscription and authority interval. The last two normalize only the extracted navigation-clear call. Authority remains 2000ms and Problems debounce remains 150ms. The full diff changes only the mapped presentation calls; this is static wiring evidence, not execution of the normal production root.

## Identical module and bounded execution

The production import `./shell-view.js` and harness import `../../src/client/builder-workspace/shell-view.js` resolve to the same source. Both call `createBuilderShellView`. The executed harness dependency graph contains that exact module, SHA-256 `a1f47d456fad3f4b6c8d347e7b0ce592a7c4fc83dd4ad3b111dffc93b9605282`. See run `shared-module-proof.json`, `dependency-graphs.json` and `verified-source-hashes.json`.

The new view imports only shared identity helpers, the admitted Preview panel and its binding. Its import test denies access to document/window/fetch/timers and passes. Factory invocation creates presentation DOM and the admitted panel; explicit Refresh starts the fixture host. The view creates no authority, scheduler, transport or background discovery.

The dedicated harness uses actual EditorRuntimeContext, EditorWorkingCopy, renderSourceEditor and BuilderWorkspaceCoordinator with fixed synthetic identities, authored in-memory artifacts and memory editing transports. Its exact GET session facade never forwards a network request; other fetches and EventSource fail. Production creation/link/upload/Problems callbacks throw if unexpectedly called. Default transport/recovery definitions in the admitted editing closure remain uninvoked. No Foundation modules, default adapters or normal Application root execute.

## Verification results

Evidence root: `evidence/builder-v1-wp5-f-shell-view-20261022`; successful run: `run-1792717673051`. One verifier run, serial, zero retries. Direct compilation uses exact entries and an explicit transitive-source allowlist, without ordinary workspace configuration/setup or wildcard discovery:

| Exact entry | Result / use |
| --- | --- |
| `tests/fixture-preview/lifecycle.test.ts` | 13 passing regression tests |
| `tests/fixture-preview/sample-coverage.test.ts` | 4 passing regression tests |
| `tests/fixture-preview/builder-editing.test.ts` | 3 passing regression tests |
| `tests/fixture-preview/shell-view.test.ts` | 5 passing new tests |
| `tests/fixture-preview/builder-editing-harness.ts` | Previous browser entry, restricted native Card smoke and source equality |
| `tests/fixture-preview/shell-view-harness.ts` | New shared-view browser entry |

**25/25 Node tests pass; six browser checkpoints pass.** The prior seven-checkpoint browser suite was not rerun in full; its evidence remains historical. Scoped no-emit type checking of the new view/binding closure passed, recorded in `scoped-typecheck.json`. Production root received syntax transformation/static inspection only. No broad build or integrated suite was run.

Browser: Edge 155.0.4283.62, dedicated loopback server with only `/`, `/harness.js`, `/regression`, `/regression.js`, all explicit memory assets, no proxy. Existing workspace CSS is served as inspected text. The isolated browser process needed the tool's sandbox execution exception; no Windows identity/token/elevation investigation or Foundation work occurred. Browser requests, failures, console, navigation, download/file-chooser observations and effect results are retained in `browser-results.json`.

The six checkpoints cover:

1. Previous harness native fixture rendering without source mutation, supplementing the 20 existing unit regressions.
2. Actual shared navigation/tab/status/dirty/close controls, retained real source-editor DOM, file/range, identity and Undo/Redo. Dirty close correctly retains the draft.
3. Preview Refresh/sample changes/error/unavailable/stale/local revoke/dispose, collapse/park/unmount/remount and retained editing state; no Preview-triggered mutation/action callback.
4. Restricted frame effects and forged messages; simulated local session suspension hides source/frame while retaining the working copy; terminal view disposal is inert and rejects remount.
5. Deferred synthetic authorization and superseded focus through actual navigation controls: the newest stage and owner/Preview identity win.
6. Exact paired no-Preview/Preview disabled/enabled autosave traces, including pending save, tab changes and park/remount.

## Source editing and autosave preservation

Captured comparisons include actual source bytes and stored bytes, current and baseline checksum, working-copy artifact/owner identity, generation/save state, Undo/Redo availability, selected source file/range, focused key, callback calls and save records. Intentional user navigation/focus is distinguished from Preview preservation; the view does not call editor focus. Browser snapshots exercise actual source input, file selection and history, rather than synthetic state labels alone.

Both disabled scenarios produce zero saves after advancing beyond the configured deadline. Both enabled scenarios produce exactly one ordinary timer-driven memory save at 2000ms, with matching bytes/checksums/history/pending state and callback/save traces. Refresh overlaps the held pending save, followed by actual tab and park/remount actions. The comparisons are exact between matched scenarios. Cleanup disposes synthetic contexts only after the comparisons and is not counted as a Preview mutation. Production autosave implementation/configuration is byte-preserved.

## Restricted Preview and lifecycle evidence

Existing CSP, sandbox, resource rejection, protocol and native implementations are unchanged. The browser probes denied frame network/mutation/upload/publish, top navigation, popups, storage/cookie access, form/link/download/file input and external image/style/script effects. Fetch reports TypeError; protected storage/top access reports SecurityError; popup is null; untrusted script does not execute. Policy violations and receiving-server requests are recorded. Forged ready/render/Save/Publish messages with the wrong channel leave host state unchanged. No file chooser, download, unexpected top navigation or browser page error occurred.

These probes qualify the existing bounded fixture host, not a general arbitrary-code sandbox or all possible self-navigation. Local session invalidation is simulated; it does not establish trusted production revocation. Native Card and Panel behavior remains the previously admitted fixture behavior. Route inspection remains pure inspection.

The view owns one delegated root click listener, no timer. Measured attach/detach traces show one listener while mounted, zero while parked/unmounted/disposed, and exactly one after repeated remount. Detached moved controls invoke no actions. Park clears the frame/stage without discarding working copies; remount restores caller-supplied state. Dispose clears frame/root/listener, rejects remount, and does not invoke callbacks. Late authorization/focus are separately guarded by the actual coordinator. Existing Preview control listeners/startup timeout remain Preview-owned; existing terminal guards/frame cleanup are exercised without rewriting that implementation. Production root subscriptions, authority interval and Problems debounce retain their original ownership; global production teardown is not qualified.

The screenshot `shared-shell-dirty-remounted.png` was visually inspected: actual shared shell, retained dirty tab/source selection and fixture-only Preview labels are visible. Existing source-editor help mentions Foundation; the harness banner explicitly identifies synthetic memory verification. No Foundation execution is inferred from that help text.

## Preservation and exact inventory

`before.json` recorded 1438 admitted existing file hashes and starting HEAD/status. Final comparison preserves **1437/1438 byte-for-byte**, with only the authorized production `src/client/builder-workspace/shell.ts` modified. No baseline files are missing. HEAD is unchanged. Native renderers, WP2 context/working-copy/coordinator/source/autosave code, Preview bootstrap/policy/samples, prior tests, reports, closures and evidence inventories are preserved. The three pre-existing untracked roadmap/closure files remain baseline records, not changes from this increment.

The exact new/modified file inventory, sizes and SHA-256 hashes are in [the increment inventory](builder-v1-wp5-f-shell-view-files-20261022.json), including every new evidence file. The inventory lists itself without a recursive self-hash. This is preservation of the explicitly enumerated admitted workspace/evidence baseline; it makes no OS-wide or protected-store preservation claim. No protected stores were read/enumerated. No commit, push or synchronization was performed.

## Supported scope and remaining gaps

| Functionality | Qualified status / dependency |
| --- | --- |
| Shared production shell presentation and Preview wiring | Actual identical module exercised with synthetic callbacks/session/transports; production delegation statically mapped |
| Ordinary source editing, history, selection and autosave under that view | Actual admitted editing stack exercised in memory; bounded accepted fixture families only |
| Full ordinary Builder root/default adapters/backend integration | **Open/unqualified**: root services, real authorization/discovery, specialized adapters and live lifecycle not executed |
| Card/Panel fixtures and pure route inspection | Existing bounded scope retained; no new sample families or executable routes |
| Canonical Region/route/Form/other Component execution | **Open**: requires candidate-specific closure review, protected access where applicable, and separate authorization; direct Panel layout is not canonical Region support |
| Coherent saved-source capture and immutable delivery | **Open**: D6/Foundation reader, coherent bytes/revisions/closure, trusted authority and delivery dependencies |
| Production revocation/reauthorization/authority races | **Open**: trusted server/session invalidation and protected dependency qualification; local simulation is insufficient |
| Protected storage, Component locks/journals/transactions/recovery | **Open**, separately authorized dependency; no operational qualification here |
| Effecting tests and Release/Publish | Defer to separately authorized WP5-G/H; no effect capability added to design Preview |
| Integrated readiness and operator journey | WP5-I and subsequent packages remain open; this increment supplies bounded evidence only |

The remaining-scope roadmap continues as historical planning context. Any next work needs its own reviewed boundary and authorization. Missing/conflicting dependencies stop their affected portion. No protected access, policy weakening, native replacement, altered persistence/authority semantics or broad architecture work is implied by this report.

**STOP: WP5-F Shared Builder Shell Presentation — Increment Acceptance Review Gate.** Acceptance is for the user to decide. Complete WP5-F, D6 and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.
