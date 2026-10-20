# Shared-role guard cleanup — single disposable experiment report

2026-10-20, America/New_York. **The source-demonstrated cleanup gap is reproduced in the one authorized isolated scenario.** A controlled recovery-guard unlink rejection after replacement creation leaves the replacement handle open and its lock empty, outside the main publication/cleanup finally. The exact injected error propagates and the callback is not admitted. This establishes a reachable implementation mechanism under the injected failure, **not the historical cause of Customer Summary Card's unresolved lock**.

Deliverables: [diagnostic event contract](owner-diagnostic-20261020-contract.md), this report, the exact `fault-injection.patch`, source-copy review, native output/result records and `owner-diagnostic-20261020-files.json`. **STOP AT DIAGNOSTIC DESIGN AND DISPOSABLE PROBE REVIEW GATE.** D6, WP5-F and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.

## Scope and isolation proof before execution

Only one scenario and one `withArtifactLock` invocation ran. No Vitest/UI/focused/complete suite, broader fault matrix, publication-failure test or guard-close fault was run. Establishing a known exited PID was setup for this one scenario, not another fault scenario. No application endpoint, normal real-store reader/writer, recovery or real-store telemetry was invoked.

Real target was checked directly before preservation, after preparation and immediately before the probe:

`C:\Projects\Modular\ui-platform\components\customer-summary-card\component.visual.json`

Real key: `d179aa405e5fabc10c0dcd063888480c115eb75f2ef03df9f74ce3ec26e0043e`. Real lock remains zero bytes, inode **17169973580092885**, device **1344742221**, one link; empty SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`. Its five role hashes match the accepted investigation; transaction directory is empty, pending journal/guard absent, expected role membership unchanged. These checks use filesystem calls only, never Foundation `storageDirectory` or a normal source reader.

Disposable owner root:

`C:\Projects\Modular\ui-platform\docs\architecture\evidence\owner-guard-probe-20261020\disposable-r0mfvC\components`

Disposable canonical anchor is that root plus `\probe-card\component.visual.json`. Actual disposable SHA-256 key:

`a2992d64db6a19f44844879c800f03c9bce6e40aac4d1aa225b389a332b59a73`

The fixture was newly created with private synthetic roles, under the new evidence tree. Canonical paths/ancestors were checked for reparse/alias escapes; its key differs from the Customer key, old WP5-B key and graph key. Its root is outside the real Platform `components` root. `fixture-scope.json` records exact paths and ancestors; the runner accepts no arbitrary target arguments, validates scope/module hashes and refuses execution on any mismatch. The injected seam is hard-bound to this fixture's exact lock/guard names. Same volume does not imply same namespace or key; there is no hard link/junction into real Component data.

Ordinary non-administrator token and null `NODE_OPTIONS` are recorded in `native-context.json`. No UAC elevation or privilege/ACL/configuration change occurred. Native execution outside sandbox restrictions permitted the controlled child-process identity query; it did not make the process an administrator.

## Exact reviewed implementation copy and dependencies

The existing compiled Foundation implementation is copied into the new evidence directory; it is not imported from or written back into the installed package. Its TypeScript input hash was recorded as `a3b7e0bc87ea9244db78dd7066c8d33c236522ce1c326753724362131490ee3e`. No compilation occurred.

| Input/copy | Raw SHA-256 |
| --- | --- |
| Installed `packages/artifacts/dist/storage.js`, exact original evidence copy | `63d7615668b13c4e695c6ca9970ca8b5aa55d99ba19d082381e609028c9aad13` |
| Disposable instrumented `module-copy/storage.js` | `c99897a33f5f9edbc288f73cf7e9302c330c51c8fedf002545c06db98dd5f6df` |
| Unchanged local dependency `file-operations.js` | `9c328dba2779c88a464b8a4be549bac770e2d94cd5f945f234784306d7b32689` |
| Unchanged local dependency `bundle.js` | `3013c7a9d74e416ad51d54191f6af9af01cc2cc178a67679e79d10553a661346` |
| Fault seam module | `83acd7032fd3d24209ee261dcceed9b6ea1eb260369060ee58832e230d99c92e` |
| Node v24.19.0 executable | `3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237` |

Those two relative modules are the full local dependency closure for the copied storage module; other imports are Node built-ins. No Application, UI Base, normal package service or product reader is loaded. Existing `retryWindowsFileOperation` is present unchanged as a dependency, but not invoked by this lock acquisition. No new retry is introduced.

There are exactly **two edits** to the copied storage implementation:

1. One import of `diagnosticGuardUnlink` from the new private seam module.
2. Replace only the existing guard unlink statement after `await recovery.close()` with the seam call, passing the original rm function/options and the existing handle references.

Original statement:

```js
await rm(`${file}.recovery`, { force: true });
```

Disposable replacement:

```js
await diagnosticGuardUnlink(rm, `${file}.recovery`, { force: true }, { replacement: handle, recovery, file });
```

`fault-injection.patch` preserves the full two-hunk difference. `source-copy-review.json` confirms that reversing those exact edits restores the original text byte-for-byte, with existing line endings retained; both dependencies are copied byte-for-byte. Native `git diff --no-index` exits 1 because differences exist; that is not a failed experiment or Git mutation. The source-copy hashes were rechecked at launch.

The seam verifies: this exact disposable target, first/only fault, replacement fd open, recovery fd already **-1**, and replacement bytes empty. It captures nonmutating disposable state, then throws the one preconstructed plain Error with code **DIAG_GUARD_UNLINK_ONCE**. It does **not** delegate the guard unlink or inject a close failure. This models an unlink rejection **before deletion**, not an observed Windows permission failure. Extra state reads add diagnostic timing overhead; this is not a performance/scheduling-equivalence experiment. The installed implementation and all existing tests/assertions remain unchanged.

## Single execution and results

Native collector process PID **30576** ran **13:16:11.451–13:16:12.622 EDT** (17:16:11.451–17:16:12.622 UTC). `probe-native.completion.json` records native exit **0**, collector error **null**. Complete stdout/stderr are retained; stderr is empty. **Exit 0 means the expected disposable diagnostic observation was confirmed**, not that recovery or Builder acceptance passed.

| Step | Exact observation |
| --- | --- |
| Confirm known non-running PID | Owned setup child PID **30140**, parent **30576**; OS creation record and runtime instance time origin captured while child was alive. It exits normally, code 0/signal null. Parent probe returns **ESRCH** before seeding. If it had remained alive or been reused, execution would stop without selecting another PID or retrying. |
| Seed disposable source lock | Decimal text **30140**, 5 bytes, flushed and closed, syntactically valid owner format. Seed inode **6192449488101449**. No journal/recovery call touches real storage. |
| Run original guarded replacement | One copied `withArtifactLock` call, original **5000-ms** role acquisition budget. Existing EEXIST → PID parse/probe → recovery-guard wx → owner reread/compare → seed removal → replacement wx path executes. Reaching the seam after replacement proves the code's own dead-PID branch admitted that replacement. |
| Inject once at guard unlink | At **17:16:12.583 UTC**, replacement fd **4** is open, replacement inode **6473924464812105**, bytes empty; guard fd **-1** confirms its real close completed. Guard exists with empty bytes, inode **6755399441522859**. Fault count **1**; native guard-unlink delegations **0**. |
| Observe propagated result | The returned exception is the **exact same Error object**, code DIAG_GUARD_UNLINK_ONCE. One acquisition invocation; callback calls **0**. Existing acquisition observation: wait **5.936 ms**, hold **0**, admitted/acquired flag **false**. |
| Observe missed main cleanup | After the Promise rejects, replacement fd is still **4**, `replacement.stat()` succeeds and size remains 0. Empty main lock and empty guard remain. The main publication/cleanup finally has not protected/released the replacement. No PID write, sync or callback admission was reached along this control path. |
| Explicit diagnostic resource cleanup | After capturing `disposable-before-close.json`, close **only the captured owned replacement handle**. Its fd becomes **-1**. Both empty fixture files and all directories remain preserved; no unlink, recursive cleanup, second acquisition or repair follows. |

The setup child is not terminated forcibly; it exits through the controlled message. No other process is stopped. All fixture paths, primitive state, propagated stack, source hashes and cleanup observations are retained in `probe-result.json`, `probe-events.json`, `disposable-before-close.json`, the native logs and fixture tree. The exclusive-create `single-experiment-started.json` prevents silently reusing this run location for another attempt.

The probe also records different seed/replacement inode values with the **same reported birth timestamp**. That observation within this single scenario reinforces treating creation times as filesystem metadata, not a standalone publisher-event or actor chronology. It does not establish the mechanism behind the real lock's timestamps.

## What is now demonstrated, and what remains unknown

| Claim | Confidence / limit |
| --- | --- |
| A recovery-guard unlink rejection after replacement wx can escape before the main cleanup finally and retain an empty replacement/open handle. | **Demonstrated** in the reviewed implementation copy, with one targeted fault and direct handle state. The previous static concern now has controlled experimental support. |
| Callback/admission/metadata budget or retry behavior was changed to produce the result. | **No.** Callback never entered; budget and protocol code outside the two reviewed copy edits are unchanged; a non-busy injected Error propagates immediately. No broader matrix or retry ran. |
| This is a naturally occurring unlink failure, or a Windows EPERM predicate was reproduced. | **Not demonstrated.** Error is synthetic, at a specific pre-deletion call boundary. Guard-close rejection, other failures, process interruption and filesystem policy are outside this scenario. |
| This caused the real Customer Summary Card empty lock. | **Unknown.** No historical dead-PID/guard replacement/unlink error is captured for its key. This probe leaves a guard, whereas the real target's guard is absent. Unobserved later cleanup could be imagined, but is not evidence. |
| The real lock can now be safely reclaimed or the remaining UI tests resumed. | **Unsupported.** The real unresolved ownership, exact historical actor and missing per-read correlation remain unresolved. This isolated mechanism does not confer operational recovery authority. |
| The diagnostic event contract has been activated or fully verified. | **No.** It is a specification only. The probe's small private event log is not a real-store instrumentation deployment or a validation of all contract coverage/loss requirements. |

## Diagnostic contract decisions

The companion specification defines canonical scope, operation/acquisition/attempt IDs, stable process/parent/worker identity, all create/read/classify/probe/publication/sync/admission/callback/release/guard boundaries, process teardown/exit links, sequence/calibration, raw-byte integrity and event-loss/coverage rules. Proposed emitters cannot add protocol I/O, waits, retries, authority, altered callback execution or a changed error path. Collection limits are separate from application budgets; collector loss makes evidence incomplete rather than changing application behavior.

One important implementation prerequisite remains explicit: current owner reads return UTF-8 **strings**. Exact decimal/empty ASCII bytes can be represented losslessly, but malformed UTF-8's original bytes cannot be recovered by re-encoding the string or rereading the file later. Full arbitrary-byte/file-object coverage requires a separately reviewed observation method. No read API or ownership format is changed here to hide that gap. Unknown process start identity, uninstrumented consumers, event loss or ABA ambiguity similarly blocks stronger attribution claims.

## Preservation and exact changed-file scope

Before execution: raw hashes and Git state were recorded for **2,524 existing UI source/evidence/Component/build paths**, **158 Data Services files**, the loaded dependency closure, Node executable, collector and exact real lock/roles. Default Application root `C:\Projects\Modular\apps` has a separate **38-file** baseline covering nondependency source, built app files, configuration, history/data/logs. Symlink/junction traversal and node_modules/object-store directories are explicitly excluded; this is not a full-volume or live database transaction snapshot.

After execution: **zero changes** across all 2,524 UI paths, 158 Data Services files and 38 Application files; no application additions were found in that captured root. The real Customer lock retains the same path, inode, device/link count, size, zero-byte hash and recorded birth/write/change/access times. All five role hashes match. The real transaction directory remains empty; pending journal and recovery guard are absent. No real atomic-role membership change is observed. Read-only access metadata is recorded rather than reset or universally promised immutable.

UI HEAD remains `c86ecb3708fd619791b7f667b02b0c4c673bd686`; Data Services HEAD remains `81b769eef3763d02343f5347888c26edab6ef7bc`. All historical reports/manifests/results/raw trace evidence remain unchanged. Five pre-existing tooling changes remain preserved. No commit, push, reset, synchronization, Git setting/index/history change, production source/test/runtime/configuration edit or owner-format change occurred.

All additions are the two new specification/report Markdown files, `owner-diagnostic-20261020-files.json` and the new `evidence/owner-guard-probe-20261020/` tree. The tree includes exact original/copy/dependency/seam files, fault diff, isolation and source review, real-state and application snapshots, ordinary-token/native records, single-scenario output and retained disposable artifacts. The final inventory enumerates every added file's path, size and raw SHA-256; its own self-entry is intentionally unhashed. No pre-existing file is modified or deleted. The retained disposable `.lock`/`.recovery` files are independent evidence, not reconstruction of either real historical lock.

## Recommended next decision

Separately review a **narrow Foundation cleanup-ownership architecture correction** for the demonstrated replacement/guard-cleanup gap: define replacement-handle coverage from the instant wx succeeds, preserve existing recovery authority and original callback/admission behavior, and explicitly decide cleanup-error precedence. Only a later implementation authorization may change source and authorize meaningful regression coverage. No corrected implementation or broader tests follow automatically from this probe.

Keep real Customer Summary Card recovery/service return as a separate exact-target operational decision with maintained exclusion, complete preservation and explicit execution authority. A cleanup correction would not itself establish the current empty file's owner or authorize deleting it. Approve the diagnostic contract's required byte/process/coverage profile separately before any real-store activation.

**STOP AT DIAGNOSTIC DESIGN AND DISPOSABLE PROBE REVIEW GATE. D6, WP5-F and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.**
