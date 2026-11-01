# V1 Page Builder — Saved Preview Status and Navigation Context Acceptance Review Gate

2026-11-01. **IMPLEMENTATION SUBMITTED; VERIFICATION INCOMPLETE. Acceptance and closure require separate approval.**

## Implementation

The existing saved Design Preview action is labelled Open/Refresh saved Preview. An adjacent live status reports the editing artifact, confirmed mounted Preview Page/route, saving, loading, unsaved edits, saved changes not yet shown, displayed saved changes, or blocked/unavailable status. The mounted hash remains in expandable diagnostics and is populated only from a mounted reply. Save Now, autosave configuration, source admission, permissions and the existing renderer remain the authorities.

Opening Preview waits for an existing in-flight save, then rechecks dirty/conflict/failure/suspension and current editor identity. It does not initiate a second save operation. A failed or unfinished save retains editor changes. Edits do not replace the active iframe. Previous automatic composed-Page Preview opening and dependency-refresh calls are removed; explicit Open/Refresh controls the saved Preview handoff.

The existing iframe messages now carry application/session, per-document identity, monotonic navigation sequence, state and the actually mounted bundle's locator/kind/name/route/hash. Parent origin and active-frame checks remain. Retired documents, foreign applications/sessions, older sequences and repeated completed responses are refused. Navigation reserves its sequence before asynchronous destination lookup. History URLs retain the session so Back/Forward and iframe Reload can report context. Reload document identity resets sequence admission and retires the previous document.

For the editing artifact, freshness compares its saved bundle hash with the mounted hash and separately checks dirty/save state. For a different mounted Page, it uses the saved Page list already read by Preview; absent that authoritative revision, freshness is unconfirmed. This is a saved-source observation at mount, not a claim of live disk synchronization or a new source-read authority. Shared dependency freshness is not represented by the Page hash alone.

## Actual normal Chrome observations

Used the existing disposable V1 Development Identity Fixture at http://localhost:5374/. Existing retained/suspended editor tabs were left open; testing used a separate new tab. Only the two changed Preview/editor source files were copied to the disposable source tree for its development server. No server, identity database, permissions, settings or native dependencies were replaced.

Created codex-test-preview-plain with explicit Plain Page and route /codex-test-preview-plain. Added a managed heading, Application image using the existing chooser, saved-Page link to /appearance-plain, blue text (RGB 36,86,166), 32px heading and wrapper padding of 1rem with a Mobile 0.5rem override. Normal Chrome DOM inspection confirmed the actual rendered heading, decoded Application SVG (complete=true, naturalWidth=240), 32px font, blue computed color and 16px base wrapper padding. Mobile CSS was present; a separate Mobile viewport computed-style check was not completed.

Initial mounted revision observed: 54d2a53d8558e37b89b8c64e465100a9a30704adad93582b0d18b88a2f647a67. After the second text revision and explicit refresh, mounted revision was 0d68dd8c7169473906c58a58d7c2408482581998a0cb7fd8efea7cbf1c521989 and status was Displaying saved changes. A third committed text edit immediately reported Newer editor changes not yet displayed / edits not yet saved while the iframe retained that second revision and its old heading. After existing autosave completed, status changed to Saved changes not yet shown. Explicit refresh returned Displaying saved changes. The final hash was not captured in that immediate observation, so no final exact-hash proof is asserted.

Clicking the actual saved link mounted appearance plain at /appearance-plain, revision c5a72013f6313e2a5ea19329230be987e41729e8454d0f8c3b84829075eaa3ea, while Editing remained codex test preview plain. Status explicitly said Preview is displaying another Page. Chrome Back returned to the editing Page and its current saved status; Forward returned to appearance plain with the mismatch status. The top-level Builder URL remained http://localhost:5374/. No accepted destination Page was edited.

Created codex-test-preview-composed with the existing shared website Shell and route /codex-test-preview-composed. Created a Page-owned Main Content Region and heading. **The complete composed workflow did not pass.** After rapid control interaction, the saved link contained malformed Visit plain testhref attributes, the image lacked src, and intended appearance CSS was absent. This was observed during browser automation; root cause is unestablished and is not attributed conclusively to this change. Attempts to correct only this new disposable Page through normal source input failed to commit. No direct saved-source replacement or Shell alteration was used to manufacture success. Its saved snapshot is retained as failed evidence.

Chrome screenshot capture timed out twice (Page.captureScreenshot); native window recovery then timed out waiting for app approval. No screenshots, composed Preview, keyboard qualification, normal-browser iframe Reload, or complete uninterrupted plain/composed chain are claimed. The new disposable Pages remain available for diagnosis; no accepted content was deleted.

## Focused verification

Final runner: node scripts/verify-saved-preview-status.mjs — PASS, evidence run-1793540041203. This reuses the retained appearance/layout fixture and pinned native dependencies, adds the real-editor status/message/save checks in tests/guided-content/editor-check.mjs, and records zero real-browser workflows in its fixture result. It reports 49 collected unit tests, runtime and saved Preview fixtures, retained image/link/plain/composed/shared behavior and strict scoped typechecking with zero diagnostics.

Added assertions cover loading before mount; no captured-request hash shown as mounted; confirmed current revision; duplicate/obsolete/out-of-order response refusal; foreign origin/frame/application; another Page and unknown saved revision; blocked mount/refusal reason; document replacement/retired reply; dirty changes retaining the same iframe; delayed save keeping the frame until completion; explicit open waiting for save; failed save feedback and retained draft. Actual iframe runtime/navigation integration is supplied by the retained runner, but the new rich protocol's full normal-browser Reload and delayed mount chain still needs qualification. Tests do not establish arbitrary message-order correctness across every document lifecycle.

Final npm run build — PASS (all relevant package builds, Vite production build and server TypeScript). git diff --check — PASS. Broad client tsc retains seven diagnostics: six missing UI Base declarations in fixture/native-card files and one main.ts string/boolean diagnostic; no diagnostic named either changed production file. These match the prior review's known diagnostic categories.

Additional vitest invocation of visual-save, fixture-preview/lifecycle and editor-security was NOT a passing gate: visual-save passed; the node:test lifecycle file printed 13 passing checks but Vitest collected no tests and rejected that suite; editor-security reported 26 failures due loopback connect EACCES (2 checks passed). Combined Vitest result: 2 failed files, 1 passed file; 26 failed and 11 passed collected tests. No security settings, elevation or environment repair was attempted. Other blocked legacy suites were not rerun. Preliminary runner attempts and failures are retained separately, not hidden as successes.

## Inventory and preservation

Production: src/client/visual-artifacts/editor.ts; src/client/visual-artifacts/preview.ts.
Test: tests/guided-content/editor-check.mjs; scripts/verify-saved-preview-status.mjs.
Documentation: this review gate.
Evidence: evidence/v1-saved-preview-status-20261101/** (exact recursive files/hashes in files.json). Initial attempts under the earlier appearance evidence directory were moved into this new evidence directory as preliminary-run-*; existing historical runs were not overwritten. Two earlier untracked architecture reports predated this task and were left intact.

Outside the repository, copied the two production source files to the existing disposable ui-platform source tree and created only codex-test-preview-plain and codex-test-preview-composed in its Application through normal Chrome. Saved snapshots of both new Pages are included. The final reporting-only failure-priority/suspended-state adjustments were fixture-tested but were not recopied to the disposable browser server after browser recovery stalled.

No commits/pushes, new renderer, revision store, routing authority, Publish/website-host expansion, dependency installation, image-upload changes, permission changes, autosave policy changes, or recovery reset. No claim of deferred unsaved-draft Preview protection. Full before/after filesystem preservation hashing of the disposable Application was not captured, so preservation is supported by the bounded action inventory, not a comprehensive byte comparison.

## Remaining gate requirements

Complete ordinary Chrome composed authoring/image/link/style workflow; establish/fix the observed control/source problem if reproducible; complete final exact saved-byte/hash proof, keyboard access, normal iframe Reload and Mobile computed styles; obtain screenshots when the capture surface is usable; review document-reload correlation under adversarial timing; and repeat full browser checks on final production source. Broader environment-blocked suites remain qualified. This submission does not declare acceptance or closure.
