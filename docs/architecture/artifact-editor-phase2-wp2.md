# Generic Artifact Editor Phase 2 — WP2 runtime and shell

Date: 2026-09-25. **WP2 stage gate: implemented and ready for review. WP3 has not started.**

The existing Phase 2 implementation plan was recovered from `C:/Users/zanyf/Downloads/UI-Platform-Generic-Artifact-Editor-Phase2-Codex-Implementation.md`, sections 5, 6 and WP2 in section 12, together with the WP0/WP1 handoffs. Existing uncommitted Foundation, Phase 1 and WP1 changes were retained.

## Runtime and lifecycle

`EditorRuntimeContext` is an editor-local adapter over the existing `EditorWorkingCopyHost`. The fixture entry retains one context/host per selected application. Navigation closes the current artifact before opening another; all shell panels read detached snapshots from that same copy. The context never stores a second editable manifest/files model. Only a temporary, authorized comparison snapshot is retained while awaiting a user decision.

The context delegates manifest/file mutations, saves, comparison, reload/resolve and close/discard to the existing copy/host. The original two-second debounce, serialized saves, generation reconciliation, checksum protection and watcher lifecycle are unchanged. No Foundation, Phase 1, transport DTO or server API signature changed. No dependencies, persistence, service, save timer, queue or validator were added.

The stable host uses a forwarding adapter for the existing transport. A new open creates a fresh session-bound transport only after the previous copy has closed. Revoked copies remain suspended and cannot use a replacement identity. Recovery reuses the original copy with the existing WP1 recovery helper. An operation guard prevents overlapping navigation/recovery actions; it is not a save coordinator.

Failed `host.close()` leaves the selected artifact and unsaved changes intact. Application navigation also waits for closure. The existing unload guard is installed for the open copy and removed on close/discard. Context and shell disposal release copy subscriptions, session listeners, unload handlers and DOM; watcher subscriptions remain owned by Phase 1. Disposal refuses to abandon a retained copy. Application disposal first closes all contexts before disposing them, so a refused close does not leave other reusable contexts half disposed.

## Shell and stage scope

The imperative DOM shell uses existing UI Base `uib-tabs`, `uib-tab` and `uib-tab-panel`, native controls and existing design tokens. It renders header, toolbar, tabs, diagnostics and extras, including:

- Accurate editing/saving/saved/conflict/error/suspended states and retry controls.
- Capability-controlled Save actions and context mutation guards.
- Overview and **read-only source preview**, including raw malformed manifests.
- Saved diagnostic results explicitly labeled as saved-source validation; dirty source is not misrepresented as validated.
- Explicitly unconfigured build, Git history and reverse-reference notices.
- Suspend, authorized comparison, recovery, close and confirmed discard controls.

The preview and diagnostic summary are the minimal shell integration seams. Descriptor-driven properties, field controls, plugin registration, rich source editing, formatting, diagnostic location navigation and full References UI remain WP3/WP4 work. The WP2 shell deliberately has no ordinary source mutation control; automated test panels exercise the context's mutation seam. The proof editors remain deferred.

## Presentation adaptation

WP0 found no existing Generic Artifact Editor composition registry, and persistent Application Presentation contracts describe application appearance rather than editor slots. Accordingly, WP2 adds only a **local, non-persistent presentation adapter**, `EditorPresentation`, with density, tab orientation, tab order and slot order. `mountArtifactEditor(container, presentationByApp)` accepts application-scoped overrides; `mountEditorShell().setPresentation()` can change them without replacing the context or saving.

Orders are deduplicated and restricted to known identifiers; mandatory slots/tabs are appended if omitted. Overrides cannot supply HTML, executable service hooks, permissions, alternate copies or save behavior. Existing UI Base tokens supply styling, and controls/tabs wrap on narrow screens. This is the documented adaptation of the plan's application presentation requirement; no persistent presentation API was extended. A future saved editor-layout setting requires a separately reviewed integration.

## Authorization and recovery

The development entry mounts only after WP1's session endpoint succeeds and is imported only under `import.meta.env.DEV`. Applications come from the authenticated session's application grants; artifacts come exclusively from `discoverEditorArtifacts`. Fixture mode does not initialize the legacy application catalog, management views or general management SSE client. The server remains authoritative and its legacy API deny boundary is unchanged.

Any identity invalidation/revision change synchronously suspends the copy, clears comparison data and removes source, artifact metadata and old errors from the shell DOM. Suspended ordinary snapshots are unavailable to panels. Changing to another identity does not expose retained source or authorize its writes. Newly authorized artifact options may be discovered for that identity, but leaving the retained editor still requires recovery or discard.

Recovery requires the original subject with current application access, a fresh session refresh and a successful artifact load. It waits for an admitted save to settle before comparison. The user then chooses:

- Resume retained changes only when the server still matches the baseline and current edit capability permits it.
- Reload server source, explicitly discarding local edits.
- Keep local source, explicitly replacing server source through the existing conflict-resolution/checksum save path.

The resolution performs another authorized load and rejects a checksum that changed since review. Read-only authorization cannot resume or save dirty edits; reload/discard remain available. A further identity change removes the comparison immediately. A manual multi-region merge editor is deferred; WP2 provides explicit whole-source choices rather than claiming an automatic merge.

Discard has separate **Discard local copy…**, **Confirm discard** and **Keep copy** controls. It uses `host.discard`, waits for already-admitted writes and explicitly states that it does not undo completed server writes. Retained memory is not durable recovery storage; leaving/reloading the browser can lose it. The existing unload prompt is best effort.

## Integration issue found and fixed

Real browser testing exposed a WP1 integration mismatch: Vite's string-form proxy enables `changeOrigin`, rewriting Host to the API address while retaining the browser Origin. WP1 correctly rejected session selection as cross-origin. `vite.config.ts` now uses an explicit proxy with `changeOrigin: false`, preserving the browser-facing Host. The server's same-origin/CSRF checks were not loosened. A real Vite-proxy/server regression test verifies session selection and authorized discovery, and confirms legacy `/api/apps` remains forbidden.

The identity selector now refreshes session state before displaying a selection failure, so its error is not immediately erased by session rendering.

## Changed files for WP2

| Files | Purpose |
| --- | --- |
| `src/client/artifact-editor/context.ts` | Shared context, session suspension, safe navigation/recovery and cleanup |
| `src/client/artifact-editor/shell.ts`, `editor.css` | Responsive shell, safe presentation overrides, authorized discovery and decision controls |
| `src/client/main.ts` | Development-only shell entry, without fixture-mode legacy management initialization |
| `src/client/artifact-editor/identity-selector.ts` | Recovery guidance and persistent failure display |
| `vite.config.ts` | Preserve browser-facing Host for same-origin authorization |
| `tests/editor-context.test.ts` | Twelve adapter/lifecycle/security/race tests |
| `tests/browser/editor-shell.html`, `editor-shell.ts` | Nine automated real-DOM/UI Base browser tests |
| `tests/editor-security-server.test.ts` | Actual Vite-proxy authorization regression |
| `scripts/check-editor-contracts.mjs`, `check-editor-production.mjs` | Include context tests and shell exclusion markers |
| This report | Decisions, results, limitations and stage handoff |

All newly exported context/presentation/mount symbols are editor-local modules. Existing package public exports, host/copy signatures, DTOs and server routes remain unchanged.

## Verification

- **Full regression suite: 162/162 tests in 26 files passed** on final retry.
- **Compatibility gate: 87/87 tests in 12 files passed**, including freshly emitted Foundation contracts, browser validator isolation, schema adapter parity, Windows storage, watcher, Phase 1, security and context tests.
- **Workspace typecheck passed.**
- **Production client/server build and editor-exclusion check passed.** The existing non-blocking JavaScript chunk warning remains: approximately 635.91 kB against the 500 kB threshold.
- **Nine automated browser integration tests passed** using real UI Base custom elements and deterministic transport responses. They cover shared panel snapshots, template overrides without saving, failed navigation, immediate revoked-source DOM removal, authorized recovery, explicit changed-checksum choices, discard confirmation/cancel, read-only controls, authorized discovery and cleanup. They are separate from the Vitest count.
- **Real-server browser walkthrough passed** using isolated Form/Route fixtures: explicit identity selection, authorized artifact discovery, source preview, identity-switch hiding, original-user fresh comparison/reload recovery and artifact selection. The responsive layout was inspected at 390×844 and normal desktop width. Test servers were stopped afterward.

To repeat the browser harness, run Vite locally and open `/tests/browser/editor-shell.html`; it displays each assertion and the final result. It mocks only session/transport responses, imports the actual context/shell/UI Base implementation, and is not a production entry. No headless browser/hosted CI runner has been added. Use the WP1 server-only fixture configuration to repeat the real-server walkthrough.

Failures/retries: the first real dev server launch hit the previously recorded Windows sandbox `uv_os_get_passwd` ENOMEM restriction; the same command succeeded outside that sandbox. The initial real browser identity selection exposed the proxy mismatch described above and passed after correction. Two simultaneous Vite instances briefly reported the shared HMR port in use; HTTP testing remained functional. An intermediate full run passed 160 tests before the last two race cases were added. The final full run initially had 161 passes and one known watcher directory-rename `EPERM`; its unchanged five-test suite passed in isolation, and the complete rerun passed 162/162. No test was removed or weakened.

## Remaining limitations and next gate

No blocking WP2 failure remains. The intermittent Windows watcher directory-rename issue remains outside this shell change. Real identity-provider integration, production editing, persistent editor presentation settings, field-level authorization, build-engine configuration, rich merge/source editing, reverse references and Git integration remain deferred as described above and in WP1. Browser test automation is reproducible through the harness but is not wired into hosted CI.

**Stop here. WP3 descriptor/field/plugin implementation requires the next stage authorization.**
