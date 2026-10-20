# WP5-F — controlled Application publication correction

2026-10-19. Authorized correction experiment and separate diagnostic classification. **No D6/WP5-F/WP5-I acceptance or closure is declared.**

## Correction and contract review

The sole product change adds one exclusion condition and its explanatory comment to `src/server/watcher.ts`: while scanning the immediate Applications root, do not descend into directory entries whose names start with `.creating-`, compared case-insensitively. Nothing changes in Application creation, the staging-to-final atomic rename, authorization, activation, recovery, process shutdown, graph-lock budgets or Form refresh behavior.

This walker previously inspected unpublished staged files while other Application mechanisms already excluded them. `discoverApps()` in `src/server/applications.ts` ignores all dot-prefixed directory entries and checks valid Application keys. `startApplicationArtifactWatchers()` similarly ignores dot-prefixed directories before checking their manifest or starting owner services. Normal creation uses a reserved `.creating-${key}-${UUID}` sibling, performs installation/build/link preparation there, and publishes it with one `rename(tempDir, finalDir)`. The correction brings the signature walker into that existing unpublished/published boundary.

The workspace signature walker notifies `EditorSecurity.publishWorkspaceChange()`. Its subscribers refresh Application discovery and schedule Builder/Problems/dependency refresh under existing authorization. It is not the policy/session invalidation authority. A successfully renamed final directory is visible to the next ordinary scan and existing discovery; subsequent published edits continue to notify. No additional waiting, retry or new publication step is introduced.

Only immediate staging **directories under appsDir** are excluded. Existing `.env` files, unrelated dot directories, a file named `.creating-notes`, nested `.creating-content` in a published Application, and staging-like names under Templates/UI Base/Platform Components retain their existing behavior. Prefix comparison folds only the name used for exclusion; actual paths and identities are not rewritten. Valid published Application keys cannot begin with a dot. Existing junction handling and link rebasing are unchanged.

Failure cleanup and abandoned unpublished trees need not trigger discovery or workspace activation: they were never discoverable Applications. The exclusion does not suppress notifications for an existing published Application's recovery/source changes. If an unpublished tree is later validly published by the existing publication mechanism, its final directory is scanned normally. This does not add automatic recovery/promotion of abandoned trees or claim that arbitrary incomplete staging contents are safe to publish. WP2 journals, coherent readers, final admission and accepted recovery contracts are untouched.

## Controlled comparison

`tests/workspace-watcher.test.ts` adds five deterministic tests using an observed filesystem double and the ordinary watcher timer. The assertions directly record directory reads/stat calls and notifications; they do not depend on an EPERM occurring or on arbitrary sleeps. The same five tests ran before and after the product condition changed:

| Run | Result | Meaning |
| --- | --- | --- |
| `walker-before-controlled.json` | 1 passed / 4 failed | The prior walker enters staging trees and reacts to unpublished edits/cleanup. The legitimate-path preservation test already passes. |
| Corrected watcher, `focused-native.json` | 5 watcher tests passed | No staging-descendant reads/stats; publication and published edits notify; cleanup/abandoned staging edits do not; legitimate paths and Windows prefix case are covered. |
| Other focused native checks | 10 passed | Real Windows directory rename with rebased junction resolution, Application artifact watcher discovery/refresh, development registry and runtime reload contracts. Total focused result: **15/15**. |

The publication test in the controlled walker comparison models the atomic directory entry switch; it is not a kernel-level EPERM reproducer. The separate existing `application-links.test.ts` performs a real Windows rename and checks workspace-link resolution afterward. The original WP5-E browser test exercises ordinary Standard Application creation and published operation; its assertions are unchanged.

Earlier diagnostic attempts remain separate. `walker-before.json` contains zero executed tests because sandbox temporary-cache publication failed. `focused.json` records a sandbox junction-creation denial and an artifact-watcher timeout. These are preserved as failed verification attempts, not counted as passes or confused with the historical Application publication EPERM. Native verification runs outside that restricted sandbox with a normal, non-administrator token. Their standard runner limits match the previous complete-suite verification; existing assertion/polling timeouts are unchanged.

## Verification

The complete UI run is **499/501 — NOT PASSED** (`full-suite/results.json`). All five new watcher tests, the real Windows publication/link test, WP5-E's original Application creation browser journey and WP5-B's original save journey pass. WP5-B's saved browser evidence confirms **three overlapping Builder/runtime rounds**, with Builder remaining open. The separate diagnostic WP4 run passes native 422 validation and normal runtime Form submission/persistence, including the actual submitted values and intended record identity.

Two failures remain in the new complete run:

- WP4 exceeds its unchanged 600,000-ms test limit; reported duration is 3,065,288 ms. This is distinct from the historical stale-origin-message failure.
- WP5-C fails its existing Save Now disabled poll at `builder-v1-wp5-c-browser.test.ts:216`, caller line 243. No assertion, autosave behavior or admission budget is changed.

Existing Windows System records (`system-power-events-attempt-02.json`) show Modern Standby entry at **15:23:08**, transitional exit/re-entry at **16:11:42**, and final exit at **16:52:22**. These transitions overlap WP4's long elapsed interval and the delayed status commands. They establish power-state interruption context; they do not prove the cause of every failed assertion. WP5-C's failure occurs after the final recorded resume and cannot simply be attributed to standby. The earlier denied sandbox System-log read is separately preserved.

The full failed run is retained as a failure, not relabeled as passed or discarded. An uninterrupted rerun requires an awake development machine; Windows power settings are not changed. No automatic full-suite retry is introduced. D6 acceptance cannot be recommended from this run.

All seven sequential verification stages finished (`verification-results.json`, `verification-complete.json`):

| Check | Result |
| --- | --- |
| Focused watcher/publication/refresh contracts | 15/15 passed |
| Diagnostic WP4 and WP5-B browser journeys | 2/2 passed |
| Complete UI suite | **499/501 — NOT PASSED** |
| Editor/storage contracts | 146/146 passed |
| Data Services | 760/760 passed |
| Data Services build and typecheck | Passed |
| UI typecheck, build and production exclusion | Passed |

The full verification used no diagnostic browser setup or Node preload and a normal non-administrator token. The process snapshot before verification contained no other Vitest/API/Vite fixture run. Fixtures were serial; the three required Builder/runtime overlaps are the intentional workload inside WP5-B. Source code remains unchanged after this verification. No additional complete-suite run is undertaken while uninterrupted machine availability is unconfirmed; no settings are changed to keep it awake.

## Separate UI failure diagnostics

The original WP4 and WP5-B journeys passed a serial diagnostic run (**2/2**). Read-only observers captured WP4's exact stale-origin refusal and its authorization/navigation/save context; WP5-B captured successful Visual save requests, source hashes and Save Now state transitions. Both also completed Form/native validation and the WP5-B journey completed three Builder/runtime overlap rounds.

See `builder-v1-wp5-f-publication-diagnostics.md` for the independent classification. Neither historical diagnostic-suite failure is causally explained by its successful rerun. No Workstream B implementation is changed, and any proposed behavior correction requires separate justification and authorization.

## Interpretation and limits

The controlled comparison supports the narrow correction: unpublished staging trees were unnecessarily inspected and now are not, while the required published behavior remains observable. A successful Windows creation run after this change is supporting evidence only. It does not prove that the historical transient stat was initiated by this walker, identify the exact NTFS denial predicate, or rule out every other cause of a future Windows EPERM.

No broad EPERM retry, lock-budget increase, arbitrary delay, changed process shutdown, assertion relaxation or fixture-only product workaround is introduced. The Application rename implementation remains byte-for-byte unchanged. The original **495/496** and elevated **493/496** results remain failed historical evidence.

## Preservation and review boundary

All new results are under `evidence/builder-v1-wp5-f-publication-correction/`. The exact phase inventory is `builder-v1-wp5-f-publication-correction-files.json`; original watcher bytes are preserved as `watcher-before.ts.txt`. Final preservation checks compare prior manifests, including the retained ETL/CSV and earlier reports/results, and explicitly identify this authorized watcher change.

`preservation-final.json` records **2,009 successful checks, zero mismatches**, unchanged UI/Data Services HEADs, no staged files, and all 40 umbrella requirements unchecked. The watcher is the only existing product file changed in this phase; its original and corrected hashes are recorded explicitly. Existing tests, configuration and historical reports/evidence retain their prior bytes.

Recommendation: retain the narrow watcher correction for review, but **do not recommend D6 acceptance**. An uninterrupted complete-suite pass and disposition of the WP5-C save-poll failure remain outstanding. The existing evidence does not justify widening this correction to save, lifecycle or admission behavior.

All 40 umbrella requirements remain unchecked. No commit, push, GitHub synchronization, focused-preview/security implementation, WP5-G/WP6, D6/WP5-F/WP5-I acceptance or closure. **Stopped at D6 correction and diagnostic review.**
