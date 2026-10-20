# WP5-F D6 — implementation verification and review record

2026-10-18, America/New_York. Workstream A implementation verification; Workstream B investigation only. **D6 acceptance is not granted by this record.** No focused-preview implementation, security mechanism, WP5-G/WP6 work, commit, push, synchronization, umbrella check or WP5-F/WP5-I closure.

## Baseline and preservation

UI Platform remains on `main` at `7050993160cee3ffeb49674fa4696dc6ff8f694a`, the observed planning baseline beyond the supplied `a79490c` checkpoint. Data Services HEAD remains `81b769eef3763d02343f5347888c26edab6ef7bc`. The four preexisting WP5-F planning documents were untracked at authorization start and are preserved rather than treated as new workstream output.

Before implementation, hashes were collected for **1,445 UI Platform files and 158 Data Services files**, including all **894 existing repository evidence files**. This encompasses the previously accepted 745-file historical set and later closure records. Initial fixture runs wrote seven fixed-path evidence outputs; new output copies were retained under `initial-run-produced/`, and every original was restored byte for byte from the before-task preservation copy. `initial-evidence-preservation.json` identifies those seven files. Subsequent fixture evidence is routed into new D6 directories. No historical result is relabeled or regenerated as accepted evidence.

The historical full UI result remains **474/476 — NOT PASSED**. The accepted-source WP5-B reproduction and inconclusive WP4 accepted-source comparison remain as recorded. New evidence is separate; no umbrella requirement is checked. Final preservation and exact inventory are recorded alongside the evidence after verification completes.

## Evidence ledger — no discarded failures

All paths below are under `docs/architecture/evidence/builder-v1-wp5-f-d6/`.

| Record | Result / interpretation |
| --- | --- |
| `before-regressions.json`, `before-regressions-2.json` | Sandbox temp-rename/loopback/process restrictions prevented useful browser reproduction; not product pass/fail evidence |
| `measured-baseline.json` | Both targeted scenarios reject a live lock with waiting disabled. Typed telemetry-stage busy mapping is 503, unlike historical generic 409; this reproduces the lock mechanism, not the exact old status mapping |
| `baseline-measurements.json` | 14 successful hold measurements plus one failed acquisition; maximum hold 1,652.1214 ms; five-second graph budget selected before enabling waiting |
| `after-targeted.json` | 13/13 passed: original WP5-B and WP4 assertions plus then-current acquisition/runtime tests. The original browser journey still closed Builder before runtime; this is not simultaneous-use proof |
| `admission-final.json` | 33/33 then-current acquisition/Windows/recovery/runtime checks passed |
| `ui-full.json` | **476/488 — NOT PASSED**. Three browser failures plus nine migration compatibility failures; retained verbatim |
| `coordination-correction.json` | 34/35; one live-PID test hit its old five-second harness limit while intentionally exhausting the new five-second role-acquisition limit |
| `coordination-correction-bounded.json` | 35/35 with an outer 15-second harness; migration coordination, real-process handoff and recovery checks pass |
| `targeted-2.json` | 21/22: WP5-C, WP5-D, migration and coordination pass; overlapping WP5-B read still exhausted admission |
| `capture-optimization.json` | 72/72: Visual semantics, coherent runtime readers, explicit-role recovery/path checks, coordination and migration compatibility after bounded capture optimization |
| `simultaneous-3.json` | 1/1 actual strengthened WP5-B browser journey passed; all three overlap rounds and ordinary Form/delete assertions pass |
| `editor-contracts-capture.log` | 145/146: old five-second PID-test harness expires before remaining assertions |
| `editor-contracts-verified.log` | 145/146: live-PID harness fixed; separate Windows watcher rename EPERM in concurrent test workers |
| `editor-contracts-serial.log` | **146/146**, serial with retries disabled; static package/declaration/document checks also pass |
| `data-services-full.json` | **760/760**, no Data Services source changes |
| `typecheck-capture.log`, `build-capture.log`, `production-exclusion-capture.log` | Passed for final product code; production client has no editor fixture selector/session/transport |
| `data-services-build.log`, `data-services-typecheck.log` | Passed; unchanged sibling compatibility |
| `ui-final.json` | **488/489 — NOT PASSED**. Both original regression assertions pass; WP4 later ordinary runtime Form submission fails waiting for saved-result |
| `wp4-diagnostic.json` | Isolated reproduction: no application-data request, empty required controls and a late source-triggered runtime reload; no browser exception |
| `wp4-settled.json` | Readiness instrumentation failed because a status selector matched two elements; retained, selector corrected |
| `wp4-ready.json` | **0/1 — NOT PASSED**. Saved indicator and network-idle waits do not prevent loss of entered name before submission; stronger pre-submit assertion catches it |

## Diagnosis and corrective changes

The first full run demonstrated that bounded graph acquisition alone was insufficient. A continuously populated local Builder queue repeatedly reacquired in the short unlink window while a separate runtime process polled. The corrected Foundation handoff yields two polling intervals (50 ms) before a queued graph acquisition, within the same unchanged five-second budget. A real child-process test verifies admission before a populated local queue drains.

Snapshot export outside graph admission exposed a role-level live-owner rejection. Explicit-role acquisition now waits at that existing lock; it never replays capture, recovery or a mutating callback. The original migration failures were introduced by an overbroad guard banning all distinct nested locks; that guard was corrected to retain recursive/same-resource and graph-order rejection while permitting existing provider → source coordination. The original nine failing assertions remain unchanged and now pass.

The second browser run showed remaining read saturation. Safe capture optimization removes duplicate location resolution, deduplicates and parallelizes independent canonical checks, and captures sorted collection entries in bounded batches of four. Every per-bundle lock, recovery, path/casing, validation and final admission check remains. No source cache or stale replacement is introduced. The added live-PID elapsed checks assert the intended five-second wait, unchanged lock bytes, incomplete-lock failure and successful current-source recovery; only that test's outer harness becomes 15 seconds.

## Simultaneous browser evidence

`simultaneous-3/browser-acceptance.json` records **builderClosedBeforeRuntime=false**, **simultaneousOperationProven=true**, three rounds, and no browser errors. Each round begins runtime reload and browser-origin Problems/graph reads after observing the Visual PUT start, before the save completes. Both reads return 200, the save is admitted, and the final runtime displays the latest saved text. The actual Builder remains open and saved; its screenshot was visually inspected. Existing ordinary runtime Form writes, protected delete, unrelated-record preservation, denied/tampered targets and revocation assertions remain and pass.

This is a bounded single-browser-context/two-page integration workload using a real API process and managed Application runtime process. Two Application definitions/shared consumers are provisioned by the existing fixture; it does not prove arbitrary multi-runtime load, UI-only provisioning or all 40 umbrella requirements.

## Measurements and limits

Budget: **5,000 ms** for graph and explicit-role acquisition; **25 ms** maximum acquisition poll interval; **50 ms** cooperative queued graph handoff within that budget. Admitted callbacks are never timed out/replayed by that acquisition policy. Uninterruptible filesystem/canonicalization work and scheduling can exceed a nominal wall-clock budget; no hard-real-time guarantee.

The successful focused simultaneous run recorded **129** graph observations: maximum acquisition wait **3,591.995 ms**, maximum hold **1,606.704 ms**. Two observations did not enter and ended after approximately 0.14–0.16 seconds. Duration-only telemetry does not record the cause; these are neither counted as successful admission nor asserted to be timeouts. Server/browser assertions for the required operations pass. Full-suite metrics include deliberate busy/cancellation/crash/recovery probes and must not be mistaken for a normal-workload latency distribution.

No starvation guarantee is made for arbitrary OS schedules or unbounded traffic. Windows PID ambiguity, incomplete/corrupt lock publication and retained/unrecoverable journals fail closed. Existing external actors ignoring locks can still race after final checks; no filesystem-wide ACID or new source authority is claimed. Larger graph/capture workloads need their own measurements; do not simply increase budgets to conceal saturation.

## Security workstream and review gates

[Security prerequisite investigation](builder-v1-wp5-f-security-prerequisite.md) identifies existing I-AM/session/owner authorities and reusable editor SSE/local suspension paths. No complete trusted cross-process committed invalidation feed was demonstrated. Proposed reuse requires an authority-contract extension with recoverable revision delivery, session/owner/expiry coverage and reviewed remote timing/health limits. Protected preview must remain unavailable without that prerequisite. **REQUIRES SEPARATE SECURITY ARCHITECTURE DECISION.** No invalidation/security implementation was performed.

**D6 IMPLEMENTATION BLOCKED.** The complete suite is not green. Both historical failing assertions and the strengthened simultaneous journey pass, but ordinary runtime persistence verification is unresolved. The isolated WP4 capture shows a source-triggered runtime reload and lost input before any data write. This is evidence of a refresh/readiness interaction, not proof that the storage operation was rejected. Waiting for the editor Saved indicator and initial network idle did not resolve it. No Form/runtime refresh behavior was changed, no submit retry added, and no timeout budget increased to obtain a pass. Further diagnosis must establish whether source refresh is delayed into active editing and preserve real user input semantics; a fixture-only readiness workaround is not yet justified.

WP4 retains its existing Builder-close boundary; only the strengthened WP5-B journey supplies simultaneous-operation proof. Added WP4 diagnostics record transport and final browser state, and new assertions check actual entered and submitted values without weakening existing persistence checks.

Final preservation is recorded in `preservation-final.json`; exact repository changes and hashes are in `../../builder-v1-wp5-f-d6-files.json` relative to the evidence directory. Approval/acceptance remains exclusively the user's decision. WP5-F is not accepted or closed.
