# V1 practical website authoring — normal Chrome attempt

Date: 2026-10-27. **Incomplete normal-browser verification; not accepted or closed.** This supplements, without rewriting, the blocked and resumed implementation reports.

## Observed ordinary authoring

The user confirmed regular-terminal startup and authorized the existing Wikimedia image. Chrome at http://localhost:5374/ reached the normal application. The restarted session was signed out; the existing development selector signed in Application Admin (admin@example.local). Application `v1-identity-fixture`, permanent owner `dev-v1-identity-fixture`, opened normally. No alternate identity, permission or settings change was used.

Fresh Page: `v1-practical-website-20261027/page.visual.json`, route `/v1-practical-website-20261027`, artifact `art_4fcfbaf1-ac40-449e-9f28-2b2174c97d7b`. All content was authored through insertion/property/layout controls, never the source textarea:

| Section | Authored content |
|---|---|
| Introduction | Heading, paragraph, literal HTTPS link to the photograph's Commons description |
| Feature | Heading, paragraph, authorized external image and alt text, native UI Base Card heading/body |
| Closing | Heading, paragraph, literal mailto link |

Section identities: Introduction `node_67dba64a-9624-49bc-a05c-21e50a81e659`; Feature `node_2a45d433-4110-439c-b771-e375faa52fb1`; Closing `node_1bde28f5-5cf6-424e-ab8b-c2917e1f0001`. Full node identities and Structure labels are retained in normal-browser evidence.

Each section was selected by its displayed `section — Introduction/Feature/Closing` label. Indentation reflects the actual existing inserted wrapper hierarchy. Section Base padding 24px/Mobile padding 12px and Card wrapper Base width 480px/Mobile 100% were entered using existing controls. Save completed; Reload reported “Saved · Source baseline replaced. Undo/Redo history reset.” HTML before/after Reload was identical. This is an observed round trip, not yet a complete final saved-revision comparison.

## Image load and reproduced blocker

The existing Design Preview reached Ready and loaded the user's exact HTTPS URL:

`https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg`

Alt: “Mountain landscape overlooking a lake in Switzerland”. Actual image complete=true, naturalWidth=10109. Current network/content policies permitted this load; none were changed.

The image rendered at 10108.987px inside a 720.825px container. This concrete website-authoring blocker prompted one small default-style correction in the **existing** renderer: `img{max-width:100%;height:auto}` before presentation/authored CSS. Existing authored CSS can override this default; existing layout metadata remains authoritative. No new renderer, per-image metadata, asset mechanism or property framework was added.

The exact actual-runtime fixture verifies that rule is emitted. The package build and scoped tests/typecheck pass. Corrected normal-browser geometry remains pending because Chrome continued receiving the old optimized renderer (computed maxWidth=none). The old overflow measurement is retained.

## Stale dependency finding and safe restoration

The first normal unsafe-href inspector check also revealed a stale shared module: the browser accepted the test draft despite the updated helper's passing refusal tests. This is a **failed** normal-browser enforcement check, not evidence of successful refusal. The safe HTTPS destination was restored immediately; current HTML then matched the previously saved baseline and status returned Saved. No unsafe value was previewed or navigated to. No claim is made that no intermediate autosave was attempted; final normal saved/Preview hash proof is still required.

The earlier regular restart reused Vite's dependency cache. The actual development script already supports `UI_PLATFORM_VITE_CACHE_DIR`; the operator was asked to restart once with a fresh disposable directory `C:\Projects\Modular\v1-normal-smoke-20261026-01\runtime\vite-cache-practical-20261027`, preserving the old cache and all other environment values. No cache deletion, lock cleanup or security change was attempted. Product/shared source and generated modules are already synchronized into the disposable application.

While awaiting that restart, a normal authenticated saved-role browser navigation failed with ERR_CONNECTION_REFUSED at localhost:5374. No startup/recovery attempt was made by Codex. The requested fresh-cache restart/readiness confirmation is pending.

## Verification and preservation

Final scoped run after the image correction: `evidence/v1-practical-authoring-20261027/resumed/run-1793128703751`: eight source tests, two actual-editor Card/Panel/layout/Preview workflows with new Structure/inspector cases, zero scoped typecheck diagnostics, and actual-runtime image-rule assertion. Shared package build passes. Earlier attempts remain retained. One command initially used a duplicated ui-platform prefix from the wrong working directory while adding the image assertion; it changed no file, and the assertion was then added correctly and rerun. The inherited unused import.meta/IIFE warning remains recorded.

Evidence under `evidence/v1-practical-authoring-20261027/normal-browser`: authored HTML, metadata, IDs, labels, UI observations including the failed stale-module check, overflow geometry, pre-fix runtime source/deployment snapshots and preservation results. No final screenshots or saved/Preview hashes are submitted as complete proof yet.

All previously existing Page files remain unchanged. Historical evidence/reports/inventories and pre-existing refresh scheduling remain preserved. The new Page is retained for continuation. Four logical product sources now differ: editor.ts, source.ts, validation.ts and runtime.ts, plus the documented disposable/generated copies. No I-AM, permission, settings, autosave, recovery, restricted Saved Preview, production, Windows-security or Git synchronization work occurred.

## Required continuation

After the requested operator restart is confirmed, reopen this saved fresh Page in normal Chrome; confirm new URL refusal without source changes; Reload and compare all IDs/content/layout; render the saved native Card and authorized image; measure corrected image fit; capture screenshots and normal authorized saved/expected-hash Preview comparisons. Do not re-create the Page or edit accepted Pages. If the corrected image is blocked by policy, report the restriction without changing it.

Normal-browser unsaved-draft protection remains deferred and unaccepted. Stop/status: **V1 Page Builder — Practical Website Authoring Acceptance Review Gate**, incomplete pending fresh-cache development restart and final browser proof. Recommended next action is that continuation, not additional architecture or broader implementation.
