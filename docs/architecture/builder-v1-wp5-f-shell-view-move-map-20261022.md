# WP5-F shared shell view — pre-implementation move map

2026-10-22, America/New_York. Recorded before product source changes under the explicit Shared Builder Shell Presentation authorization. This document specifies the extraction boundary, not acceptance. Complete WP5-F, D6 and WP5-I remain open; A01–A40 remain unchecked.

## Exact controls and functions

| Existing `builder-workspace/shell.ts` work | Destination / data and event contract | Production callback retained |
| --- | --- | --- |
| Workspace section, header/title, status, nav, tablist, stage scaffold | `createBuilderShellView` factory in `shell-view.ts`; same class/ARIA/data selectors | Existing composition root obtains the same root/header controls |
| `status(message)` DOM update | `view.status(message)`; text only | Existing `run` catch messages, discovery/navigation/creation/Problems outcomes unchanged |
| `discover()` grouped artifact-list DOM construction | `view.artifacts(entries)`; existing groups/order/text, owner-qualified button keys | Discovery request, sequence/Application/park checks remain in root; click delegates to existing `navigate(target)` |
| `renderTabs()` tab label, selected/dirty/pending/conflict text, close controls | `view.render({active, applicationKey, tabs, focused, session})`; read-only precomputed editor states and editor DOM element, never editor object/methods | Tab activate delegates to existing `navigate` with original owner/Application rule; close delegates to existing coordinator.close and retained-draft message |
| Stage placement inside `renderTabs()` | Same view.render; replace stage only when editor element changes; no focus or source mutation | Existing coordinator/editor adapter remains sole focus/working-copy authority |
| Fixture Preview creation/selection/element placement | View-owned actual `FixturePreviewPanel`, existing `selectFixturePreview` binding | Root supplies existing session/identity/dirty hints only; no capture/source/editor/transport capability |
| `data-collapse` handler | View-owned collapse click; same nav.hidden, aria-expanded and navigation-collapsed class | No service callback |
| Source/workspace/session Preview notification calls | Explicit view.preview lifecycle methods / read-only binding | Root still owns source/workspace/session subscriptions, filtering, coordinator suspension and notifications |
| Root mount/park DOM attachment | view.mount/view.park; same root is reused | Existing exported mountApplicationWorkspace, parkWorkspace and navigate remain; root retains discovery/park/sequence orchestration |

The existing header Refresh artifacts, Create Dataset, Create Form, Return/link and Cancel/link scaffold remains. Their `.onclick` assignments stay production-owned. Existing dynamically added Create Menu, Upload asset, Create Page/Shell/Platform Component and Validate Application controls, Problems panel, dialogs and handlers remain entirely in the root. Nothing is removed or replaced with successful test substitutes. Test harness callbacks for unapproved services throw if invoked.

## Ownership and dependency contract

- Importing the new module creates no DOM, subscriptions, scheduler, coordinator or request. Calling its factory creates presentation DOM and the already admitted Preview panel; no frame starts until explicit Refresh.
- View inputs: artifact identity/labels/groups, Application key, original session/subject, tab selection, dirty/pending/conflict flags, suspended/active state and editor HTMLElement. Only navigation and close callbacks leave moved controls. The view does not authorize, discover, poll, save/flush/reload/discard, call editor focus/history APIs or initialize default adapters/plugins.
- One view-owned delegated click listener covers collapse/navigation/tab/close. Attach at mount, detach at park, reattach once at remount, remove on terminal dispose. Re-rendering controls creates no per-button closures/listeners. The view owns no timers. Existing production authority interval (2000ms), Problems debounce (150ms), source/session/document subscriptions and editor timers remain root/editor-owned and unchanged.
- Park clears Preview/frame and detaches the root and view listener without disposing working copies; caller still parks the coordinator. Remount reuses the same DOM/view and restores only state supplied by the caller. Terminal dispose removes view listener/root, clears stage and destroys Preview; it does not dispose or mutate editors. Production's existing long-lived singleton API is retained; terminal disposal is exercised by the dedicated view harness, not introduced as a new production shutdown policy.
- Preview's existing control listeners and host startup timeout remain owned by the admitted Preview implementation; frame destruction/terminal guards and canceled startup timing remain independently verified. No new native renderer or iframe policy change is proposed.

Production `shell.ts` will import this exact module; a new exact-file harness will import it directly with real admitted source/context/working-copy/coordinator modules and synthetic session/memory transports. Static import proof, actual build graph and raw module hash will connect both usages. No alias/reimplementation of the production view, backend, native class or editing lifecycle is permitted.

## Verification boundary

Existing four exact fixture entries remain reviewed regressions. New entries are `tests/fixture-preview/shell-view.test.ts` and `tests/fixture-preview/shell-view-harness.ts`; a dedicated verifier will compile only explicit admitted files and serve exact in-memory loopback assets. It will test moved DOM and lifecycle, late navigation via actual coordinator sequencing, real source/file/range/history and matched disabled/enabled autosave, strict unexpected-service callbacks and restricted-frame effects. No normal shell/adapters/backend is executed; static source mapping does not qualify production authority/persistence or full ordinary integration. Any required broad rewrite or changed authority/polling/editing contract is a stop for the affected candidate.
