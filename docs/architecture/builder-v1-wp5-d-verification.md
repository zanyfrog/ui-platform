# Builder V1 WP5-D — Implementation Verification / Review


## Formal user closure — 2026-10-18

**BUILDER V1 WP5-D — ACCEPTED AND CLOSED**, following explicit user review. Accepted evidence: UI Platform **453/453**, Data Services **760/760**, editor/storage contracts **146/146**, focused checks **7/7**; builds, typechecks, production-client exclusion and actual Builder/browser verification passed. All **591 historical evidence hashes** are preserved. Earlier pending-review wording and machine acceptance flags below remain original verification-time history and are superseded by this formal decision. Their original results are not rewritten.

This increment is formal closure and GitHub checkpoint reconciliation only. See the [closure and repository reconciliation](builder-v1-wp5-d-closure.md). Existing architecture, behavior, limitations and successful/unsuccessful/transitional evidence are retained. **WP5-E and subsequent work are not authorized.** D6 remains WP5-F subject to separate admission/locking architecture review; A37 remains WP6. All 40 umbrella requirements remain unchecked, and complete Builder V1 acceptance remains pending.

**WP5-C C1–C5 is ACCEPTED AND CLOSED by user review. WP5-D is implemented and verified, awaiting review; it is not accepted or closed by these test results. STOP AT WP5-D IMPLEMENTATION VERIFICATION/REVIEW. Do not begin WP5-E.**

## Final results

| Check | Result | Durable evidence |
| --- | --- | --- |
| UI Platform full regression | **453/453**, 65 files | [Final report](evidence/builder-v1-wp5-d/reports/wp5-d-ui-final.json) |
| Data Services full regression | **760/760**, 35 files | [Report](evidence/builder-v1-wp5-d/reports/data-services-wp5-d-full.json) |
| Editor/storage contracts | **146/146**, 15 files | [Final transcript](evidence/builder-v1-wp5-d/transcripts/wp5-d-release-contracts.log.txt) |
| Focused native contracts + actual Builder/browser journey | **7/7**, 2 files | [Report](evidence/builder-v1-wp5-d/reports/wp5-d-focused-final.json) |
| UI Platform build/typecheck | Passed | [Build](evidence/builder-v1-wp5-d/transcripts/wp5-d-release-build.log.txt), [typecheck](evidence/builder-v1-wp5-d/transcripts/wp5-d-release-typecheck.log.txt) |
| Data Services build/typecheck | Passed | [Build](evidence/builder-v1-wp5-d/transcripts/data-services-wp5-d-build.log.txt), [typecheck](evidence/builder-v1-wp5-d/transcripts/data-services-wp5-d-typecheck.log.txt) |
| Production exclusion | Passed | [Transcript](evidence/builder-v1-wp5-d/transcripts/wp5-d-release-production.log.txt) |
| Accepted historical evidence | **591/591 original SHA-256 hashes preserved** | [Hash verification](evidence/builder-v1-wp5-d/historical-preservation.json) |

Final full UI command: `npm test -- --maxWorkers=1 --no-file-parallelism --testTimeout=30000 --hookTimeout=30000 --retry=1 --reporter=default --reporter=json --outputFile=.uib/wp5-d-ui-final.json`. Implementation was frozen during this run. Its duration was 633.42 seconds. Retry is explicitly enabled; this record does not claim every assertion passed on its first attempt. Serial regression isolation is not a simultaneous-use test.

Data Services used `npm test -- --reporter=json --outputFile=.wp5-d-full.json`; editor/storage used `npm run check:editor-contracts`. Both repositories ran their build and typecheck scripts. Production exclusion used `node scripts/check-editor-production.mjs` after the final UI build. The first full UI run also passed 453/453, before the final retained-tab destination refresh/image-picker adjustments; its [report](evidence/builder-v1-wp5-d/reports/wp5-d-ui-full.json) is retained separately. The final report above covers the completed implementation, including those adjustments.

## Actual browser interactions and acceptance observations

The browser signs in using the established development identity and opens the actual Application Builder. Native setup creates the temporary Application and administers grants; this is explicitly not UI-only Application provisioning evidence.

1. Open Main Navigation, retain that Menu tab, then create a parameterized Page through the Builder creation dialog. Return to the retained Menu and select the newly created permanent Route identity from freshly authorized choices.
2. Add a nested Menu item, choose a literal route parameter containing a slash, edit its label, Undo/Redo, save and verify its permanent item identity remains unchanged. Cancel another item dialog and verify source bytes remain unchanged.
3. Create an additional Menu through the workspace management control. Upload an actual SVG file through the Builder file picker. Select its portable source path for Application branding; edit Application name, short name and primary theme token, and select the existing theme stylesheet.
4. In the actual Admin Shell editor, select its sidebar, place the existing authored Menu by name, insert a native image and select the existing Application branding binding. Save and reload through the normal Visual editor lifecycle.
5. Direct protected negative requests prove unknown Menu destinations, unrelated-user writes, stale source hashes, invalid theme declarations and missing assets leave the saved source unchanged. These are native-request checks, not a claim that every UI rejection path was exercised.
6. After closing Builder and allowing its requests to settle, capture the native portable composition snapshot and verify exact asset bytes and native Menu source. Start the normal running Application and verify both Public and Admin Shells consume the authored nested Menu, correctly encoded route destination, loaded logo and theme token. Browser page errors are empty.

Successful per-run browser directories contain `browser-acceptance.json`, `nested-menu.png`, `portable-branding.png`, `public-shell.png` and `admin-shell.png`. The [machine review summary](evidence/builder-v1-wp5-d/review-summary.json) identifies the final successful browser directory. Separate attempt directories preserve focused and full-run evidence rather than overwriting it.

The six focused native tests additionally prove supported picker path filtering and traversal rejection; exact binary storage and denied/stale write preservation; unchanged presentation permissions; native inherited/literal/empty route-parameter semantics; missing targets, unsafe URLs and duplicate item-ID rejection; and the existing theme-token validation contract.

## Unsuccessful and transitional evidence

All eleven numbered browser-attempt reports and raw transcripts are retained, including failures. They are not replaced by the final success:

| Attempt | Observation / correction |
| --- | --- |
| 1 | Sandbox temporary-cache rename EPERM prevented collection; rerun with approved local browser/server access. |
| 2 | Fixture used an invalid mixed-case Page source name; native validation correctly rejected it. Fixture corrected to its existing lowercase-name contract. |
| 3 | Theme stylesheet picker had an incomplete accessible label; explicit label added. |
| 4–5 | Input could be ignored during asynchronous refresh; making the surface inert alone did not prevent programmatic field input. Explicit pending-field disabling now accompanies inert state. |
| 6–7 | Focused Shell composition read returned undefined because its workspace record does not embed composition. The normal adapter now falls through to the existing independently protected native composition endpoint. Picker labels were also made explicit. |
| 8–9 | Fixture used incorrect names for the existing insert/reload buttons; aligned to their actual controls. |
| 10 | Independent portable snapshot reader hit `Artifact is locked by another writer` while Builder was still polling. This reproduces the retained D6 limitation; no lock implementation was changed. |
| 11 | Complete initial browser journey passed after quiescing Builder before snapshot/runtime capture. |
| Final focused/full | Retained-tab destination refresh added and proven; logo choices limited to supported images and demonstration placements selected in the Admin sidebar. Focused 7/7 and final full 453/453 passed. |

Early copied-fixture evidence initially used the WP5-B folder. Its newly generated attempt files were moved to `transitional-misplaced/`, and accepted WP5-B files were restored from raw backups. Both full regression runs subsequently regenerated historical evidence. Their changed outputs were archived under `regression-produced/full-1/` and `regression-produced/final/` before restoring all 591 originals. The [first restoration](evidence/builder-v1-wp5-d/restoration-full-1.json) and [final restoration](evidence/builder-v1-wp5-d/restoration-final.json) record the generated and original hashes. Original accepted C/program records are also retained in `accepted-c-records/`; C's historical machine inventories remain unchanged verification snapshots.

The first editor/storage check passed 145/146 with a Windows watcher-directory rename EPERM. No watcher/storage code was changed. The unchanged rerun passed 146/146, and the final release check passed 146/146 again. Both failed and successful raw transcripts are retained.

## Scope, limitations and gate

See [implemented architecture](builder-v1-wp5-d-implementation.md) and [complete changed-file inventory](builder-v1-wp5-d-files.md). WP5-D adds authoring controls and bounded read adapters; it changes no native Menu format, expression semantics, renderer, Component definitions, DOE/I-AM authority, trusted service contract or lock implementation.

- Theme selection uses actual native Application stylesheet sources and existing `--app-*` tokens. No named composition-theme registry or new theme-definition format is fabricated. Focused representative Menu/theme samples remain WP5-F.
- Existing advanced Page-local override/action capabilities and legacy package metadata limits remain as documented; unsupported package properties/slots/events and a package Button are not invented. The UI-only acceptance journey above covers Application Menus and their Shell consumers.
- Closing Builder before snapshot/runtime startup is a bounded verification prerequisite, not a contention remediation or proof of reliable simultaneous operation. The failed live-reader attempt is retained. **D6 remains WP5-F under separate admission/locking architecture review**, and reliable simultaneous use remains required before WP5-I acceptance.
- **A37 full management-restart/browser evidence remains WP6. All 40 umbrella requirements remain unchecked.** Full Builder V1 acceptance remains pending.

**STOP AT WP5-D IMPLEMENTATION VERIFICATION/REVIEW. WP5-E has not begun.**
