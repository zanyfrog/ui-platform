# WP5-F — Foundation unresolved-owner remediation

2026-10-19. Authorized implementation of the approved unresolved-owner acquisition correction. **Foundation deterministic checks pass; focused UI integration is 56/62 — NOT PASSED.** This is implementation acceptance-review evidence, not D6/WP5-F/WP5-I acceptance or closure. The complete UI suite was not run. A pre-existing unresolved shared-Component lock remains untouched and requires a separate recovery decision before further UI verification is recommended.

## Implementation and architecture conformance

This phase changes two production source files: `packages/artifacts/src/storage.ts` and its public storage export in `storage-api.ts`. The phase-specific diff is `evidence/builder-v1-wp5-f-foundation-remediation/phase-only.patch`; it separates this correction from earlier uncommitted D6 work. The new deterministic test file is `packages/artifacts/tests/unresolved-owner.test.ts`. One existing role-bundle assertion now expects the approved typed unresolved-owner outcome instead of the superseded generic incomplete-lock message. Its preserved input is `role-bundle-test-before.ts.txt`; the existing source/identity, file-retention, recovery and timing assertions remain intact. No UI assertions were changed.

`ArtifactOwnerUnresolvedError` extends the existing `ArtifactBusyError` family with name `ArtifactOwnerUnresolvedError`, code **`source.owner-unresolved`**, HTTP-compatible status **503** and an explicit unresolved-ownership message. It is exported through the existing `@ui-platform/artifacts/storage` entry point. Existing Platform error serialization already preserves `status` and `code`; no server error mapping or authorization behavior changes.

Exclusive `open("wx")`, PID write/sync, global graph identity, canonical source identity and `.recovery` authority remain the existing protocol. The correction does not publish a new format, coordinator, lease or security authority. A reader classifies empty or syntactically invalid metadata as unresolved, without inferring a dead owner or removing its file. Positive safe-integer decimal PID text follows existing live/dead rules. The canonical writer still emits only `String(process.pid)`.

Each acquisition attempt reads current metadata afresh. An unresolved observation returns to the existing 25-ms acquisition polling loop, capped by the **same remaining deadline** used for local queue waiting and filesystem contention. No deadline restarts after an observation. Persistent unresolved state ends with the distinct typed diagnostic. If later observation establishes a live PID, the eventual outcome is ordinary `source.busy`; disappearance restarts exclusive acquisition and does not preserve a stale owner inference. Zero-budget callers do not gain a new waiting budget: they fail closed on their first unresolved observation.

On a dead-owner recovery candidate, the existing recovery guard is acquired, then current owner text is reread and validated before removal. A now-unresolved owner is not removed; a different valid PID causes fresh acquisition. Contended recovery guards and disappearance/exclusive-create replacement races become bounded contention rather than generic terminal errors. The recovery guard still releases through its original finally block. No new recovery authority or journal operation is introduced.

Abort is checked before attempts and after acquisition failures; unresolved waiting uses the existing signal-aware bounded delay. Cancellation during waiting retains its original reason. After exclusive creation/PID sync, the callback boundary checks both cancellation and remaining deadline. No protected callback enters after a spent acquisition budget. Once work enters, errors—including the exact unresolved/busy class—are propagated without replay, and acquisition cancellation does not replace the admitted work's error or interrupt its transaction. Existing close/unlink failures also remain failures, not retries of admitted work.

## Deterministic coverage

The tests exercise the actual Foundation acquisition implementation. A real child process uses the existing exclusive-create/write/sync/close/unlink protocol, with an IPC barrier before PID publication. The production reader makes at least six empty observations, beyond the old initial-plus-three window, while the child remains owner; it does not enter until that owner publishes and completes normally. No production delay, permission weakening or alternate acquisition protocol is used.

Additional deterministic cases cover:

- PID publication between observations, changing unresolved classification to valid-live contention.
- Empty and invalid metadata retained at typed exhaustion; negative cases use shorter explicit test budgets without changing any production/default graph budget. The existing role-bundle integration still exhausts actual five-second live and unresolved waits.
- A controlled monotonic clock verifies that time spent in the local queue consumes the original deadline, and that PID publication consuming the remainder cannot admit work.
- Cancellation before acquisition and during unresolved inspection, with no callback or unknown-owner deletion.
- Disappearance and replacement of unresolved metadata; a replacement valid live PID remains untouched.
- Replacement with empty or live metadata after an earlier dead-owner observation and recovery-guard acquisition, before the recovery removal decision.
- Injected PID write, sync, close and removal failures, with original errors retained and no callback replay. The injected close failure occurs after the real close, avoiding a test handle leak; its retained file models cleanup failure without changing production cleanup semantics.
- An admitted callback throwing the exact unresolved error after abort is not replayed and its error is not replaced by acquisition cancellation.

Existing graph/role/Windows tests cover valid live/dead PID behavior, local cancellation ordering, populated cross-process handoff, recursion and role-to-graph ordering, canonical alias/path/case refusals, source revision checks, journal failure/recovery through a fresh process, and no interruption of admitted work. Test JSON preserves every case/outcome; graph measurements preserve actual acquisition observations. Test instrumentation and synthetic clocks are isolated to tests.

## Execution and preservation

All native checks use the independently verified, unchanged diagnostic `Invoke-NativeCapture.ps1` from the preceding investigation. Each check has separate stdout, stderr and completion JSON with its real exit code. Native stderr cannot terminate post-run evidence collection. Runs use an ordinary non-administrator token, retries disabled and serial test execution. No independent fixture run overlaps the selected integration run. Commands, process snapshot and token context are retained in the new evidence directory.

Historical 491/501, 500/501, 499/501, 495/496 and 493/496 results, reports, raw ETL/CSV and diagnostic fixtures remain unchanged. The historical manifests still describe their historical source versions; verification compares the three authorized modified inputs against byte-for-byte phase-input snapshots, and all other prior paths against current unchanged bytes. Current remediated source hashes are recorded separately in the new inventory. This is an explicit authorized source-version transition, not a rewrite of prior evidence.

`builder-v1-wp5-f-foundation-remediation-files.json` lists the exact modified/new files and hashes, including the four regenerated ignored Foundation build outputs (`storage.js`, `storage.d.ts`, `storage-api.js`, `storage-api.d.ts`). Other build output bytes are ordinary regenerated artifacts; no historical evidence is used as a build target. `preservation.json` records original-baseline/prior-manifest comparisons, HEADs, staging state and all 40 unchecked umbrella requirements.

The approved Form refresh and Application watcher source changes are untouched. No security invalidation, focused preview, WP5-G/WP6, commit, push or GitHub synchronization. No D6/WP5-F/WP5-I acceptance or closure. **Stop at Foundation remediation acceptance review.**

## Remaining limitations

The retained UI failures did not capture the historical lock's owner bytes, filename and creation/write timeline. This correction addresses the proven mechanism; it does not establish that mechanism as the historical suite root cause. PID reuse remains an existing limitation. A numeric prefix that itself looks like a valid PID cannot be distinguished from complete publication without changing the approved owner format; this correction does not claim to solve that ambiguity. Recovery retains the existing compare/recovery-guard protocol and its PID-only identity limits.

An abandoned unresolved file remains in place and blocks acquisition; this change does not invent a safe recovery owner for it. Explicit operator handling may still be necessary. Filesystem operations already in progress are not forcibly cancelled, so wall-clock completion can exceed the nominal acquisition deadline under filesystem/scheduling stalls; admission is rechecked before work, and admitted transactions are never cut short. Cleanup failures preserve their existing fail-closed/error behavior. Focused success cannot replace a later separately authorized complete UI verification.

## Recorded verification results

| Check | Result / evidence |
| --- | --- |
| Foundation build | Passed, `artifacts-build.completion.json` |
| Initial four-file Foundation regressions | 48/48 passed, `foundation-results.json` |
| Expanded Foundation package | 106/106 passed across 13 files, `foundation-final-results.json` |
| Final unresolved-owner source | 21/21 passed, `final-owner-results.json`; includes the two additional between-read/deadline-boundary cases added after the package run. Final Foundation typecheck passed |
| Selected UI integrations | **56/62, six failed**, `ui-focused-results.json`; no retry or second UI journey run |
| Selected Data Services | 288/288 passed across six files, `data-focused-results.json` |
| Editor contracts | 146/146 passed, `editor-contracts.stdout.log` |
| UI build and typecheck | Both passed, separate completion/stdout/stderr files |
| Production exclusion | Passed: no fixture selector, session client or editor transport in production client |
| Complete 501-test UI suite | **Not run**, as required |

The integration script stopped after the UI failure. Subsequent independent checks were explicitly performed in `run-remaining.ps1`, after all UI fixtures had finished; they did not rerun the failed UI cases. All collector completion records have null collector error and retain the native exit code, including **1** for the failed UI selection. This verifies that the previously corrected console collector preserves a real failing test run and subsequent evidence rather than aborting on stderr. The original failed result remains separate from every later check.

`foundation-final-results.json` captures 19 unresolved-owner cases at that stage; the final isolated test execution captures all 21. These counts are not added as independent coverage totals. No production implementation changed after the first Foundation build; the final extra coverage and typecheck verify the final test source.

## Focused UI failures and retained unresolved lock

The failed selection has six failures:

| Case | Current failure boundary |
| --- | --- |
| Application composition, test line 91 | Typed `source.owner-unresolved` from shared-Component reread in `visual-source-plan.ts:76`, after bounded waiting |
| WP4, line 142 | Dataset Mapping tab click times out before the prior 422/stale-origin/runtime checkpoints; runtime Form behavior is not verified by this case |
| WP5-B, line 137 | Creation response lacks the expected `artifactId`; later save and three overlapping runtime rounds are not reached |
| WP5-D, line 140 | Wait for the authored menu tab times out before the previous branding-save checkpoint |
| WP5-E, line 159 | Page creation returns HTTP 503 with `source.busy`; captured graph measurement shows a roughly 5005.6-ms local admission wait with no acquisition |
| Visual artifact reference validation, line 158 | Complete stderr now preserves `Invalid artifact structure: Cannot read properties of undefined (reading 'metadata')` rather than only an abbreviated assertion |

The runtime-refresh, coherent Visual reader and unpublished-directory watcher selections pass. All six failure messages/stacks are retained in the selected UI JSON and full separate console streams. The WP5-E result is acquisition refusal during page creation, not Application publication EPERM. No timeout, assertion, Form or watcher changes are made to conceal these failures.

Read-only inspection found the existing lock:

`components/.uib/locks/eeea95554098a2bf3112bf6532920d01f1393311b2047ed54a37bdb02126e5c5.lock`

It contains **zero bytes**. Recomputing the existing SHA-256 identity from the canonical anchor maps it exactly to `components/wp5b-shared-9b12bff2/component.visual.json`. Its observed creation time is **2026-10-20 01:29:29.523 UTC** and last-write time **01:30:54.313 UTC** (21:30:54 local), before this implementation began at approximately 22:38 local. These timestamps show pre-existing state; they do not prove its creator, crash history, Windows handle state or abandonment. No PID can be inferred from empty text.

`inspect-existing-lock.mjs` calls the actual built `readRoleBundle` on that canonical Component without changing its source or lock. The operation refuses admission with `ArtifactOwnerUnresolvedError`, `source.owner-unresolved`, status 503 after **5006.45 ms**. `existing-lock-inspection.json` records identical before/after zero-byte content hash, inode, creation and modification times. No protected read callback is admitted and no lock is removed. This is the required fail-closed result for unresolved ownership, not permission to recover it.

This Component is among the shared bundles enumerated by `prepareVisualSourcePlan`; its unconditional shared-bundle recheck at line 76 explains how an unrelated source-template operation can encounter the blocked role reader. `VisualArtifactService.list()` can turn a failed role read into a diagnostic bundle with absent metadata, also consistent with the reference-validation structural failure. The precise original creator/metadata-loss mechanism remains unproven. A shared blocker is strongly supported for current source-read paths; the missing UI controls, WP5-B response and WP5-E queue exhaustion still lack full per-request correlation and are not all declared to have one proven cause.

No recovery/cleanup action is taken on this real lock or Component. Deleting it, deciding its owner is dead, bypassing it during discovery, changing shared-Component validation or increasing budgets would exceed the approved correction. The implementation correctly preserves the unresolved file, so a green UI result cannot be manufactured within this authorization.

## Acceptance-review recommendation

The bounded unresolved-owner implementation conforms to the approved architecture and passes its deterministic Foundation, Data Services, build/typecheck and contract checks. **Do not recommend a complete UI-suite run yet:** the focused UI gate remains **56/62 failed**, and the existing shared-Component lock requires a separately authorized recovery investigation/decision. Preserve its bytes/identity and determine an operator-authorized recovery procedure rather than automatic ownership inference. No broader lifecycle or recovery implementation is proposed here.

After that separate decision is completed, a separately authorized focused UI verification should establish the missing functional/overlap gates before readiness for complete-suite verification is reconsidered. No additional UI rerun occurs automatically. Historical **491/501** and **500/501** failures remain unexplained in their original context; this phase does not declare their root causes resolved. **Stopped at Foundation remediation acceptance review. D6, WP5-F and WP5-I remain unaccepted and open.**
