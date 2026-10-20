# WP5-F — final UI verification follow-up

2026-10-19. One serial UI run following the user's machine-availability response. **500/501 — NOT PASSED.** This is verification evidence, not D6/WP5-F/WP5-I acceptance or closure.

Run interval: 2026-10-19T17:08:21.7379580-04:00 to 2026-10-19T17:18:00.7611639-04:00; exit code 1. The exact command, ordinary token context, process snapshot and power-event query are preserved in `evidence/builder-v1-wp5-f-publication-final-ui/`. No browser observer, Node preload, new kernel trace, power/security settings change or overlapping unrelated fixture run was introduced. Retries remained disabled. All original assertions and timing budgets were retained.

No product code, tests or existing configuration changed during this follow-up. The approved watcher correction remains the only product change from the preceding phase. Its SHA-256 before/after this run is recorded in `run-complete.json`; prior implementation/evidence comparisons have 2103 checks and 0 mismatches. UI/Data Services HEADs and all 40 unchecked umbrella requirements are preserved. The exact follow-up file inventory is `builder-v1-wp5-f-publication-final-ui-files.json`.

The prior **499/501** failed run, including its WP4 timeout across Modern Standby and its unexplained WP5-C save poll, remains unchanged. Original **495/496** and elevated **493/496** evidence also remains unchanged. Any successful rerun is supporting verification, not proof of the historical NTFS rejection predicate or of why the earlier UI assertions failed. A failed rerun likewise must not be hidden or retried automatically.

Earlier focused watcher/publication checks (15/15), diagnostic WP4/WP5-B journeys (2/2), editor contracts (146/146), Data Services tests (760/760), builds, typechecks and production exclusion passed on unchanged code. Those checks were not unnecessarily repeated here; their exact outcomes remain in the preceding phase's verification records. This report must be read with the final run's power findings, regression details and review recommendation appended below.

## Power records and required regressions

The existing System power-event query succeeded. Its last transition before the run was Modern Standby exit at **17:05:49.6222933**, reason Input Keyboard. It records **no selected power transition during 17:08:21–17:18:00** (`power-context.json`). The narrower query also reports NoMatchingEventsFound, rather than denied log access. There is no recorded Modern Standby overlap for this run. This does not establish continuous CPU scheduling, and no power setting was changed.

The full run passes WP4's complete Form entry, submission, intended-record persistence and reload journey, including the native 422 check. It also passes WP5-B's original Visual save journey, **three overlapping Builder/runtime rounds with Builder open**, WP5-E Application creation/browser behavior, all five unpublished-directory watcher tests, native staged-directory publication/link preservation, and the remaining lifecycle/reload tests. Per-case assertions are retained in `results.json`, with WP4 transport/readback and WP5-B overlap evidence in their respective directories. EPERM did not recur; this remains supporting evidence, not proof of the historical NTFS predicate.

## Sole failure and its limits

The sole failure is **`C:/Projects/Modular/ui-platform/tests/builder-v1-wp5-c-browser.test.ts:161`**, before Workflow authoring and before the previous Save Now poll checkpoint. The existing test starts its trusted normal host and submits an initial insert through `/api/apps/wp5c-created/application-data/operations`, with records `selected/Ada` and `unrelated/Keep`. The operation result has **`success: false`, `committed: false`**. This is a real failed assertion; the run is not considered passed.

`full-ui.log` lines 872–886 preserve the assertion and received values. The case's saved browser attempt text/image and the test result are retained unchanged. The assertion display omits additional response properties, so it does not establish the operation's error code, HTTP status, failure phase or correlation ID. A particular authorization, schema, storage, host-readiness, graph-admission or Windows filesystem cause cannot be assigned from this result. This is different from the prior WP5-C Save Now poll failure; because the test stops earlier, the old poll is not proved fixed or reproduced here.

No evidence ties this failed insert to the watcher exclusion, and no lock budget, autosave behavior, shutdown operation, data-service implementation or assertion is changed. The smallest next investigation is a targeted diagnostic capture of this operation's complete response (including error/correlation fields), normal-host log and applied Dataset/schema/authorization state. That should precede any separately authorized correction. Another full-suite run solely seeking green is not recommended.

## Review recommendation

**D6 remains blocked by 500/501 complete UI verification.** Retain the bounded watcher correction for review with its deterministic tests; do not declare the Windows predicate resolved or D6/WP5-F/WP5-I accepted/closed. Preserve the failed 499/501, 495/496 and 493/496 records alongside this new failed result. No additional implementation or automatic rerun follows this report.

No commits, pushes, GitHub synchronization, preview/security work or WP5-G/WP6 work. All 40 umbrella requirements remain unchecked. **Stopped at D6 correction and diagnostic review.**
