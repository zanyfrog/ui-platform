# Builder V1 WP1 — Verification

Date: 2026-10-14. Operator: Codex automated verification on Windows, Node 24.19.0, local Microsoft Edge/Playwright. Gate: **BUILDER V1 WP1 — ACCEPTED AND CLOSED** by the user after architecture and evidence review. Accepted verification: 300/300 UI Platform tests, 106/106 editor contracts, browser integration, builds, typechecks and production exclusion. Windows watcher/rename limitations and all WP0 security boundaries remain in force. Next work package: WP2 — Consistent Auto-Save and Per-Artifact Undo/Redo; do not begin automatically. WP2–WP6 have not begun.

## Results

Retained machine-readable counts: [verification results](evidence/builder-v1-wp1/verification-results.json).

| Check | Result |
| --- | --- |
| Full UI Platform regression | 300/300 tests, 49 test files; 290 existing assertions retained plus 10 new workspace tests |
| Focused workspace tests | 10/10 |
| Editor contracts/security/storage regressions | 106/106 across 13 files; emitted consumer contracts and generated documentation checks pass |
| Existing standalone automation browser regression | 4/4; also included in the full suite |
| Existing Visual Artifact browser/runtime script | 10 PASS groups, including real installed controls, shared Form runtime, real API editor save/reload/conflict and built responsive route |
| New workspace browser demonstration | 6 PASS groups, zero source PUT/DELETE requests during switching, no page errors |
| Typechecks and production build | Pass |
| Production editor exclusion | Pass; development workspace/session transport excluded from client build |
| Data Services sibling | No WP1 files or contracts changed; no additional sibling regression required. Accepted WP0 747/747 baseline remains retained |

## Reproduction

Run from `C:/Projects/Modular/ui-platform`:

```powershell
npm run typecheck
npm run build
npx vitest run tests/builder-workspace.test.ts
npm run check:editor-contracts
node scripts/check-editor-production.mjs
npx vite build --config references/visual-artifacts/vite.config.ts
node scripts/test-visual-artifacts-browser.mjs
$env:UI_BUILDER_WP1_EVIDENCE='docs/architecture/evidence/builder-v1-wp1'
node --import tsx scripts/test-builder-workspace.ts
$env:TEMP='C:/Projects/Modular/.wp1-test-temp'
$env:TMP=$env:TEMP
npm test -- --maxWorkers=1 --testTimeout=15000 --retry=1 --reporter=json --outputFile=C:/Projects/Modular/.wp1-ui-results.json
```

Create the workspace temporary directory before the last command. Local-server/browser and filesystem tests require ordinary trusted local execution. Restricted execution initially blocked Vitest temporary-file rename. A full run using the Windows user temporary directory also encountered an existing watcher directory-rename EPERM; the accepted WP0 workspace-temp setup passed without removing assertions or modifying watcher tests. A subsequent rerun hit the same transient rename condition in unchanged WP0 Application creation; the final full run allows one retry per test and retains every assertion.

An early full run exposed two standalone automation sign-in navigation regressions from applying retained-session behavior globally. The implementation now preserves reload behavior until an Application workspace is mounted. The standalone browser regression and complete suite pass with that compatibility behavior.

## Focused identity and lifecycle evidence

`tests/builder-workspace.test.ts` covers A/B/A deduplication, retained selection/section/draft, guarded close, independent disposal, Application ownership collisions, repair versus permanent identity, shared Platform Form/Component identity across requesting Applications, stale authorization/mount disposal, original-subject suspension/recovery, denied and mismatched target commands, adapter focus failure, cleanup isolation, parking and final disposal. The editor retains its own state; the coordinator exposes no Save operation.

## Real browser and security evidence

The [browser results](evidence/builder-v1-wp1/browser-results.json) and [screenshot](evidence/builder-v1-wp1/workspace-retained-page.png) come from the normal development management entry, a real source API process, real Vite client, real I-AM policy store and real existing editors. Fetch/editor implementations are not mocked.

The script prepares disposable source artifacts in the accepted dedicated V1 Application fixture: a real Visual reference Page using the existing shared PersonForm, a generic Dataset definition and existing fixture generic artifacts. This is declared programmatic test-source preparation, not a completed WP6 UI-only Application-authoring journey. Dataset source is not misrepresented as an applied runtime Dataset.

The test explicitly selects the existing Security Admin through the approved trusted one-time local initialization boundary. It grants only a Component-administration ceiling, then stages and activates a separate Component role assignment to the existing Application Admin through the protected administration API. It does not assign authority based on names, automatically grant a creator, write security tables, or replace the policy store. All stores used by this demonstration are disposable; accepted WP0 initialization/ownership boundaries remain unchanged.

Verified interactions:

1. Normal management Application entry reaches the shared workspace. Page → Dataset → Page retains the selected Form-instance node, CSS section and unsaved text. Dataset uses the real generic editor rather than a visual canvas. Closing Dataset leaves the Page unchanged.
2. Edit Definition opens the real shared PersonForm Component definition. Returning restores Page context. Incomplete Form metadata survives switching and Cancel on guarded close. There is one Component identity, with no second Form artifact.
3. Direct authorization requests with an unknown permanent ID, forged owner, forged editor revision or forged CSRF token return 403.
4. Identity change suspends retained tabs without reloading an active workspace. A Workflow-only identity cannot reveal cached Page/Form source. Returning to the original authorized subject recovers the unsaved Page draft.
5. Copying source and the fixture's permanent ID into an unregistered Application directory does not establish ownership: its direct workspace authorization request returns 403.
6. Trusted, durable administration makes the Component role assignment inactive while its editor is focused. The visible source is quarantined. Refreshing authority and focusing the unrelated still-authorized Page recovers its unchanged draft.

The browser request ledger observes zero source PUT/DELETE requests during this sequence. Existing standalone Visual browser tests separately exercise the unchanged real save/reload/conflict services. Existing WP0 regressions remain in the complete suite and continue to protect new permanent Application registration, applied Dataset/host isolation, mandatory Workflow invocation, forged-authority rejection and onboarding recovery.

## Limits and deferred work

The browser demonstration proves integration using Page, generic Dataset and shared Form formats. Broader Workflow/Trigger, composition and Package service behavior also retains its existing regression coverage; this is not a claim of a UI-only full authoring journey through every type.

Existing generic autosave and specialized manual save semantics remain distinct. Inactive generic copies may perform their own previously scheduled, session-bound save. Switching initiates neither Save nor discard. Visual sequential file saves retain their existing partial-write/conflict behavior. WP2 common candidate validation, autosave and Undo/Redo are not implemented.

Package/legacy inspection is read-only; repair locators are visibly distinct. Unsupported Problems locations fall back to the artifact. WP3 Dataset onboarding, WP4 typed authoring/create-and-link, WP5 aggregation/isolated testing and WP6 reference journey remain deferred. All accepted [WP0 limitations](builder-v1-wp0-verification.md) remain in force.

The exact source/document/evidence changes are in [the inventory](builder-v1-wp1-files.txt). The sibling I-AM checkout has no WP1 changes. No later work package is authorized or started by this gate.
