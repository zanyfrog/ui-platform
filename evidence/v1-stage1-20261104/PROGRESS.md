# Stage 1 implementation progress — not acceptance

The Stage 1 Component Admission Review Gate is not ready. C1–C5 remain UNVERIFIED as complete scenarios.

Implemented: owning Forms manifest for six controls (including Select), complete Panel and Action Button definitions, bounded Hero scalar/event definition, explicit versioned Forms admission and Action Button module admission, disabled Action Button refusal, Panel accessible toggle/content reference and focus restoration, canceled-event runtime refusal, and Select option validation. Existing Card identity is retained. UI package source version is 0.5.2; Forms is 0.1.1. Shared installed packages have not been replaced.

Validation: focused-tests.txt records 29 passing tests across the new admission suite, package activation and visual artifacts. Server TypeScript check passed. An earlier native-discovery regression run passed three tests but failed its fourth at Windows junction creation (EPERM); this is not a successful linked-path regression proof.

Actual Edge 156.0.4314.58 browser: browser-target/results.json records 18 checks on a fresh loopback fixture using physical package copies. The screenshot is browser-target/browser.png. This proves bounded runtime rendering, Panel toggle/focus, Card selection, Select change, and disabled Action Button behavior. It does not prove the ordinary shared-inspector journey, saved Preview, publication, full Card actions/keyboard/nested instances, or Hero actions/link safety. No complete C-row is passed from this fixture.

Remaining required work: finish inspector/save/reload/saved Preview/published acceptance on a fresh disposable application with isolated stores; complete C3/C5 positive and negative behavior and bindings tests; verify frozen package release closure and versions; review missing/duplicate-module and old-instance regressions; synchronize package lock/version outputs if required by the isolated packaging route. These are unfinished authorized implementation/verification tasks, not a request for additional authorization and not an established external blocker.

Baselines and repository state are in repository-state.json. Tracked source hashes are in changed-source-hashes.json; this list does not include untracked new files. New source files are ../.. /tests/stage1-component-admission.test.ts, ../.. /scripts/verify-stage1-browser.mjs, and the UI-Base Forms ui.component.json. Evidence outputs and physical package copies are confined to this evidence directory; test temporary roots are created and removed by the tests. No production stores or pilot evidence were targeted. No Data Services changes, Stage 2 work, commits or pushes were performed.

Recommendation: do not authorize Stage 2 on this evidence. Complete Stage 1 first. This document is a progress record, not the Stage 1 completion report.
