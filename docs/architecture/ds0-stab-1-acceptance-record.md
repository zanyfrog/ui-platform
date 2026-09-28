# DS0 STAB-1 acceptance and commit record

Date: September 27, 2026. **ACCEPTED for the recorded development checkout. B2 CLOSED for that tested scope.**

Authority: the user's explicit acceptance of DS0 STAB-1 with all documented deployment and compatibility limitations preserved. B1 remains closed under STAB-0; B3/B4 are not closed.

The [implementation report](ds0-stab-1-implementation-acceptance-report.md), compatibility assessment and every file in its evidence directory remain byte-for-byte unchanged. Their historical wording describes the prior gate; this addendum records subsequent acceptance. Accepted evidence remains D build/typecheck and 88/88 tests, P 12 focused tests and 103 editor-contract tests (overlapping suites), with the Windows watcher limitation retained.

## Commit reconciliation

At the start of this follow-up, Data Services was already clean at **`577683840535e668c2000f24562702e7b51c6a0b`**, titled `Stab 1`, parent `313b7e0c64e8e93f75632bb9dc015614d7709668`. That commit existed before this agent's follow-up work; this agent did not create it.

Reviewed its baseline-to-commit diff and compared the complete changed-path set with the accepted manifest: exactly the approved 13 paths, no extras or omissions. All 13 checkout SHA-256 values match the tested implementation manifest. Index and working tree are clean. The requested committed implementation is already present and verified; no duplicate/empty commit, amendment or history rewrite was needed.

Package manifests/versions and lockfile have no diff from the baseline. D lockfile SHA-256 remains `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F`. No push, release, migration, rehash or deployment was performed. No claim is made about whether another actor previously pushed the existing commit; remote references were not fetched.

[Review evidence](evidence/ds0-stab-2/baseline-review.json) records commit/path checks, transaction-source hashes and hashes of all 17 preserved STAB-1 report/evidence files. P remains at `e6b6a86936b8aa24645f24ae53db3cf61a3c0345`; this follow-up adds documentation only. Its existing report/evidence remain locally preserved, not silently inserted into the D commit.

## Retained limitations

Acceptance does not authorize deployment into existing stores or certify legacy histories. Raw inspection remains unverified; canonical publication remains single-writer and non-atomic; external stores/consumers remain unverified; the Windows watcher issue remains unresolved despite the passing recorded run. A8 persisted identity changes remain deferred, A9 is a release proposal only, and the two applied-state authorities and trigger publication/runtime registration remain separate.

The next authorized output is the [STAB-2 plan](ds0-stab-2-transaction-correctness-plan.md). No STAB-2 implementation, STAB-3, DS0-WP2, package release or deployment is authorized.
