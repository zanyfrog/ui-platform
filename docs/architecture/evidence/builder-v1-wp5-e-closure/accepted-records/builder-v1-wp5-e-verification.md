# Builder V1 WP5-E — implementation verification/review

2026-10-18. **BUILDER V1 WP5-E — READY FOR REVIEW.** Implementation verification is complete with the non-green regression results below. WP5-E remains open and unaccepted. WP5-D remains ACCEPTED AND CLOSED. No commit, push, WP5-F/G or WP6 was performed. All 40 umbrella acceptance requirements remain unchecked.

## Verification results

| Check | Actual result | Evidence in `evidence/builder-v1-wp5-e/` |
| --- | --- | --- |
| Focused settings, lifecycle and Problems | 36/36 passed | `focused-final.json` |
| Dedicated actual Edge browser journey | 1/1 passed on final source | `browser-final.json`, `browser-run-6.json` |
| Full UI Platform regression | **474/476 passed; two failures** | `ui-full-final.json` |
| Earlier affected serial regression | **86/87 passed; one failure**, retained | `affected-serial.json` |
| Full Data Services regression | 760/760 passed | `data-services-full.json` |
| UI typecheck | Passed, exit 0 | `review-checks.json`, `review-typecheck.txt` |
| UI build and production editor exclusion | Passed, exit 0 | `review-checks.json`, `review-production.txt` |
| Editor/storage contracts | 146/146 passed | `review-contracts-rerun.txt`, `review-contracts-rerun-status.json` |
| Data Services build and typecheck | Passed, exit 0 | `data-services-review-checks.json` |
| Historical evidence | Final hash verification recorded separately | `historical-preservation-final.json` |

The full UI regression is not a pass. WP5-B failed while saving a Visual artifact with `Artifact is locked by another writer.` WP4 expected invalid Dataset name validation (422), but admission returned 409 with the same lock error. `wp4-rerun.txt` reproduces that actual error; this is not established to be a stale-revision failure. No assertion was weakened to accept it.

## Graph-lock investigation

The accepted-source snapshot at commit `722ef6d5636f2c6f2cff25c259ede61a1ac04749` independently reproduces the WP5-B failure without WP5-E implementation (`d6-accepted-baseline-run.json`). Its only environment adjustment points the snapshot at the existing Platform root and installed dependencies, so it exercises the same source/lock namespace. Setup is recorded in `d6-baseline-setup.json`; normalized accepted/current lock implementation hashes are identical in `d6-lock-source-comparison.json`. The WP4 accepted-source comparison (`wp4-accepted-baseline.json`) stopped earlier on a missing Dataset contract response, so it does not independently establish the WP4 lock cause. The current WP4 response proves a lock rejection; its relationship to D6 is supported by the shared unchanged admission/lock path, but that baseline comparison remains inconclusive.

This supports the previously retained D6 issue. It does not quantify contention frequency or prove that longer diagnostic capture cannot increase lock hold time. D6 remains unresolved for separately authorized WP5-F remediation. Locks and admission guarantees were not weakened. Disposable accepted-source snapshot remains outside this repository under `C:/Projects/Modular/.wp5-e-baseline`.

## E1–E7 ledger

| Item | Implementation / verification status |
| --- | --- |
| E1 Application Problems | Implemented using WP5-A aggregation and native validators. Independent diagnostics and honest incomplete states verified. |
| E2 Qualified navigation | Implemented with existing permanent identities/coordinator, native node/source selection and explicit artifact fallback. Browser navigation verified. |
| E3 Dependency refresh | Implemented with revision-qualified native references, reverse invalidation and conservative full fallback. Superseded/stale results rejected; unrelated drafts retained. |
| E4 Platform settings | Central typed/versioned JSON authority, validated atomic writes, existing lock/admission/security and live sessions. Persistence, process restart, conflicts, CSRF, authorization and revocation verified. |
| E5 Editor coverage | Six shared lifecycle construction sites inventoried in implementation record. Legacy TypeScript source read-only on client and server; supported Visual Page authority retained. No conversion. |
| E6 Autosave | Default true/2000ms; exact 100–60000ms in 10ms increments; disable/re-enable and timer restart; admitted saves preserved. Invalid configuration remains untouched with disabled fallback and Save Now. |
| E7 Verification/evidence | Focused, browser, contracts, builds/typechecks, production exclusion and full regressions executed. Two full UI lock failures remain explicitly unresolved. Implementation review only; no acceptance. |

## Browser and settings evidence

The real Edge journey exercises administrator configuration, nonadministrator read-only settings, exact input rejection, browser reload, two simultaneous writable editors, disable/re-enable, explicit Save Now, Undo/Redo and unrelated dirty-draft preservation. Native invalid Dataset and Visual node diagnostics appear together; navigation and successful-save refresh remove the corrected diagnostic while retaining the other. Invalid settings bytes are preserved until explicit operator restoration. CSRF and stale-revision rejection, identity changes, authorization revocation, API process restart and reconnect are covered. Screenshots and `verification.json` are retained in timestamped browser folders. Cross-process conflicting writes and fresh-process disabled persistence are also covered by focused tests.

These are subsystem browser checks. Test applications are provisioned using existing APIs before actual Builder interactions; this does not independently verify the umbrella UI-only application-provisioning requirement.

## Limitations and boundaries

- Unavailable native validation, uncertain ownership and incomplete reference graphs remain explicit incomplete states; they trigger conservative full refresh. Native reads may validate while capturing; cache counters do not measure all underlying validator work.
- Existing precise Visual node and generic source positioning is reused. Unsupported field/step positioning falls back honestly to the owning artifact. Moved locators suspend the old adapter and preserve its draft; explicit recovery or close/reopen is required.
- Invalid/unreadable settings disable autosave without rewriting the stored file. Valid configuration must be restored explicitly. Direct filesystem writers that ignore the existing lock/revision protocol are outside concurrent-update protection.
- Existing DEV Builder trusted identity/security boundaries remain. No production identity or editor capability expansion is claimed; production exclusion passed.
- No independent Publish gate, validator, dependency authority, settings database or new editing lifecycle was introduced. Management, Apply, Publish and isolated tests remain outside inactivity autosave.

## Transitional runs and preservation

All unsuccessful attempts are retained. Initial sandbox runner attempts failed with EPERM before tests. The first affected subset collided with concurrent distribution output generation; serial 86/87 supersedes its completeness, not its evidence. Browser attempts 1–5 retain parser/setup/wait corrections and two product fixes (Settings view preservation and explicit denial after full revocation); run 6 passed. The initial continuation typecheck caught a misplaced notification hook; fixed reruns passed. Production exclusion caught an unguarded development notification marker; the DEV guard fixed it. Final isolated contract compilation caught a missing Vite type reference; the reference was added and 146/146 passed. No native validation rule was weakened for a test fixture.

Historical evidence is checked against the 745-file pre-continuation SHA256 manifest. Regenerated outputs are copied into this WP5-E evidence directory before verified original bytes are restored. The final preservation report and changed-file manifest document results. Earlier prerequisite report/inventory versions are preserved under `prerequisite-records/`. Unrelated demo changes are excluded from WP5-E ownership.

