# Foundation regression diagnosis — bounded review

2026-10-20. **IMPLEMENTATION PRESERVED; UNACCEPTED. STOP AT FOUNDATION REGRESSION DIAGNOSIS REVIEW GATE.** D6, WP5-F and WP5-I remain open and unaccepted. All **40 umbrella requirements remain unchecked**, zero checked.

The current execution environment independently denies the native hard-link operation used by unchanged immutable identity publication. This explains an environmental prerequisite failure without requiring the cleanup correction or a real store. Separately, the graph test's unconditional child-first expectation is stronger than the documented cooperative handoff guarantee. Neither result turns the failed F22 run into a pass. No production correction, generated-output change, test alteration or regression rerun was made.

## 1. Preserved baseline and scope

`evidence/foundation-regression-diagnosis-20261020/before.json` captures **2,603 existing UI files**, **158 Data Services files**, **38 captured Application files**, Git HEADs/status and direct real Component/lock/journal state. All expected hashes matched the preceding implementation inventory, accounting for its authorized source/build changes. `reviewed-inputs.json` separately indexes the implementation, compiled implementation, new fault test, all 13 existing Foundation test files and relevant package/dependency records. Six dependency records were freshly verified before the native diagnostic.

| Input | Exact preserved SHA-256 |
| --- | --- |
| packages/artifacts/src/storage.ts | acc1bcbd194bcb2565fbd2addaa58ab236a0a48cb384c25ba232962f887f1cb3 |
| packages/artifacts/dist/storage.js | 455c33c4311671e8fb4818a76e5a35cc15e3b6adba1a38248d4e714a7285f67f |
| packages/artifacts/tests/cleanup-ownership.test.ts | df824ad8a16542ae962ff23babd1710e37af4311feff7c8d511b1a093437746a |
| packages/artifacts/tests/graph-admission.test.ts | aba915c46873d834ca8325c182cf2f061b30640ae6fd458e45500c332e7fab32 |

The prior F22 result remains **57 passed / 51 failed / 108 total**, 13 files, one unhandled rejection, native exit 1. Its original stdout/stderr/JSON are read-only inputs. The 58 passing cleanup fault tests, successful builds/typechecks/export checks and all older results remain historical facts; none was rerun here.

Only new documentation, indexes and the bounded native-capability diagnostic source/output were written. No Foundation reader, writer, recovery or application request was directed at real Component storage. No full F22, Builder focused selection, UI suite, build or typecheck ran in this phase. No security/permission configuration, antivirus, repository setting, assertion, timer, acquisition budget or retry setting changed. No Git commit, push, reset, revert or synchronization occurred.

## 2. Filesystem failure mechanism and native diagnostic

### Unchanged product path

`packages/artifacts/src/storage.ts:45–64` publishes an immutable identity binding through:

1. Create a unique sibling with exclusive wx.
2. Write content, sync and close the handle.
3. Set the disposable sibling to mode 0444.
4. Hard-link that sibling to the immutable final pathname; an existing destination is not replaced.
5. Remove the temporary sibling in finally.

`artifact-service.ts:124–151` invokes this path during refresh when a discovered manifest has no immutable binding under `.uib/bundles`. Errors other than EEXIST propagate. Consequently many ArtifactService consumers fail before reaching their intended functional checkpoints when link creation is denied. A source/transaction assertion receiving that exception does not prove a transaction regression.

The entire `immutableWrite` function matches the preserved pre-cleanup source `evidence/builder-v1-wp5-f-foundation-remediation/storage-before.ts.txt` after newline normalization. The cleanup implementation patch is confined to lock ownership/dispatch; it does not change this function. `historical-and-static.json` records the comparison and normalized function hash. Native capability failure below loads **no Foundation module**, isolating that symptom from the new cleanup control flow.

### Controlled native execution

The completed diagnostic is `fs-capability-run.mjs`, using only native filesystem operations in one uniquely created directory:

`C:\Projects\Modular\ui-platform\docs\architecture\evidence\foundation-regression-diagnosis-20261020\fs-disposable-qWPOvV`

Canonical parent equality, no root symlink and an empty directory were verified before controlled file operations. This root is independent of `ui-platform/components` and never uses the Customer or graph lock path. The process uses ordinary inherited privileges: parent PowerShell PID **2864**, Node PID **24688**, Node **v24.19.0**, executable `C:\Program Files\nodejs\node.exe`, user `NIMO-LAPTOP\zanyf`, administrator-role membership **false**. Child PPID was checked against the recorded parent PID. The fixed C: volume reports **NTFS**. The directory's exact SDDL and Node statfs context are retained in the JSON; source modes are recorded before/after each link. This records ordinary token membership, not a complete kernel-policy or per-file SACL audit.

Two minimal controlled cases ran once each, without automatic retry:

| Case | Operations before link | Native link result | Resulting state |
| --- | --- | --- | --- |
| immutable-original-sequence | wx → UTF-8 write → sync → close → chmod 0444 | **EPERM**, errno **-4048**, syscall **link** | Source still one link; target absent. |
| writable-link-control | wx → identical write → sync → close; no chmod | **EPERM**, errno **-4048**, syscall **link** | Writable source still one link; target absent. |

Exact source/target pairs are recorded in `fs-capability.json` events 8 and 19:

- `...\fs-disposable-qWPOvV\immutable-original-sequence.tmp` → `...\fs-disposable-qWPOvV\immutable-original-sequence.json`
- `...\fs-disposable-qWPOvV\writable-link-control.tmp` → `...\fs-disposable-qWPOvV\writable-link-control.json`

The JSON contains the complete absolute paths, native exception stacks, operation arguments, UTC/monotonic sequence, inode/device/mode/link-count data and cleanup results. Source modes were 0100444 and 0100666 respectively; each nlink remained 1. Both native handles closed successfully. All four scoped file-removal calls succeeded; rmdir succeeded; final lstat returned expected ENOENT. ENOENT for missing link targets/readback and the removed root is an observation of absence, not another capability failure. Only the new disposable files had chmod applied, matching the original operation; no existing file permissions or ACLs were changed.

The completed diagnostic's native exit is **0**, meaning evidence collection completed, **not** that hard links or regressions passed. Complete stdout/stderr and native exit are retained separately.

### Preflight harness failure retained

The first diagnostic entry point, `fs-capability.mjs`, created the unique directory and stopped **before its controlled file-operation loop**: its nested token-query process supplied empty stdout, and JSON parsing failed (`Unexpected end of JSON input`), native exit **1**. Its original source, source hash and outputs are preserved. That evidence does not identify why the token query returned empty output.

The revised entry point retains the same native operation loop and reads an ordinary-token/volume/ACL record produced directly by its immediate parent PowerShell process. It checks the parent PID, non-administrator membership, canonical directory and emptiness, reuses the still-empty unique root and performs the first actual link attempts. The original failure was neither overwritten nor represented as a link attempt. No privilege escalation or policy change was used to make the diagnostic run.

### What this proves

**Demonstrated:** under this execution context, valid same-directory native hard links are denied independently of Foundation. Changing only the read-only bit is insufficient to permit them. Basic create/write/sync/close/delete work. The original hard-link prerequisite cannot be exercised successfully here, so the related regressions cannot establish their later checkpoints in this environment.

**Not established:** which sandbox, access-control, filter, security policy or other OS predicate denies the operation; whether another ordinary non-administrator execution context would allow it; or whether every failed test has the same cause. NTFS identification and directory SDDL alone do not identify the denial layer. No security adjustments, administrator run, alternate persistence mechanism or broad reproduction was attempted. The unchanged product exception is honest propagation of a native failure, not proof that every host supports the required capability.

## 3. Graph ordering: contract, source and retained observations

### Expected versus observed

The original `graph-admission.test.ts:78–104` holds the graph, launches a real child, invokes four local callers, receives a child IPC `waiting` message, then releases the holder. Original line 101 requires the first line of `order.txt` to equal **child**. The failed run observed **local-3** instead; the prior child-exit assertion passed, indicating native child exit 0. The retained result does **not** include the complete order file or exact parent/child acquisition events. The child's failure-free completion is not proof it attempted exclusive creation before the holder released.

### Existing semantic guarantee

`builder-v1-wp5-f-d6-implementation.md:21–23` explicitly states: **“No global fairness guarantee is claimed across independent processes.”** It describes the 50-ms yield as an acquisition opportunity and bounded cooperative handoff, **“not a new FIFO filesystem protocol or a guarantee against arbitrary process scheduling.”** `builder-v1-wp5-f-d6-verification.md:61` likewise disclaims starvation guarantees under arbitrary OS schedules/unbounded traffic. Its historical handoff pass is evidence of a successful observed schedule, not a stronger protocol definition.

Current source preserves those semantics:

- `withRoleBundleGraph` awaits realpath and ancestor lstat checks **before** calling `withArtifactLock`. Invocation order is not necessarily local queue-insertion order. Four calls constructed as indices 0–3 do not prove index 0 entered the queue first.
- `localLocks` sequences a key within one module/process. It is not shared with the child process. The filesystem wx is the cross-process admission authority.
- A caller that actually finds a local predecessor and uses the graph identity yields `min(50, remaining)` after its predecessor finishes. This consumes the original deadline; it is not a reservation for a specific waiting process.
- A contending process polls after failures with `min(25, remaining)`. Neither Node timers nor process scheduling provide a deterministic cross-process priority order. No waiter ticket, acknowledgment of a pending wx or global FIFO exists.
- In the child, `withRoleBundleGraph(...)` is invoked, then IPC `waiting` is sent immediately. That function suspends on asynchronous canonicalization first. The message is therefore **not an acquisition-attempt barrier**.

A permitted counterexample is a child delayed in canonicalization or scheduling beyond the local 50-ms yield: a local caller can exclusively create, publish, enter and release before the child attempts wx. Another permitted distinction is local-3 reaching the local queue before other asynchronously canonicalizing local callers. These are static possible schedules, **not a reconstruction of the historical run**. Local-first output alone does not establish lock overlap, lost exclusion, callback replay, starvation or changed acquisition authority.

### Cleanup correction's asynchronous boundaries

On normal initial acquisition, old cleanup awaited close then rm directly. The corrected path awaits an async cleanup helper containing those same two native awaits, then resolves the recorded result after arbitration. This adds a helper-completion continuation. A successful dead-owner replacement similarly adds a helper-completion boundary for guard cleanup, plus the main helper boundary. Capturing a callback result before cleanup versus returning it through finally does not add another callback invocation.

The local queue is still released **after** main cleanup. The graph identity, queue predecessor logic, 50-ms yield, 25-ms polling, five-second graph acquisition budget, original child 3000-ms budget and explicit 15000-ms test bound remain unchanged. Extra continuations can perturb timing but add no child reservation or cross-process fairness guarantee. The failing graph case is not evidence that dead-owner guard cleanup occurred; no such phase was captured. A specific timing effect of the correction remains unproven without a controlled comparison, which is not executed here.

### Historical passing evidence

The accepted retained remediation records show the same named real-process handoff assertion passing:

| Record | Whole selection | Handoff case duration |
| --- | --- | ---: |
| `builder-v1-wp5-f-foundation-remediation/foundation-results.json` | 48/48 passed | 413.321 ms |
| `builder-v1-wp5-f-foundation-remediation/foundation-final-results.json` | 106/106 passed | 343.743 ms |

Both native completion records report exit 0. Their commands used serial execution, retry 0 and explicitly larger outer default test/hook harness bounds (180000/60000); the handoff test itself has its own 15000-ms bound. Those commands and the older source versions are not silently treated as identical to the current 108-case run. The current graph test hash is preserved; a test-name match and older pass do not substitute for identity-qualified acquisition traces. `historical-and-static.json` retains the two specific results and source hashes. Nine other current graph cases passed in F22.

### Decision and experiment boundary

The unconditional child-first assertion is not guaranteed by the documented protocol. This is a **test/contract alignment decision**, not a demonstrated incompatibility of cleanup ownership with mutual exclusion. The actual historical losing schedule remains unknown. No pass is granted, assertion weakened, fairness behavior changed or failure dismissed as harmless.

**No active graph diagnostic was necessary or executed.** Static source plus the explicit historical contract establishes that local-first can be permitted; another single schedule could neither create the missing guarantee nor conclusively attribute the historical event. The optional one-run allowance remains unused. Review must decide whether deterministic child-first priority is a real requirement. If so, it needs a separately reviewed coordination design beyond this cleanup correction. If bounded cooperative opportunity is the intended contract, separately review how the regression fixture can verify it with explicit acquisition synchronization and unchanged safety/budget requirements. No assertion or test edit is authorized by this diagnosis.

## 4. Failure classification and attribution confidence

`failure-index.json` enumerates all **51** failures by exact test name, source result hash, raw failure stack/text and any retained native source/target pair. It distinguishes actual native stacks from assertion wrappers. It contains **42** failures with complete link source/target pairs in their JSON failure text; three additional explicit-link failures have abbreviated received-error messages. No missing native stack or path is invented.

| Group | Count | Established evidence | Attribution / confidence |
| --- | ---: | --- | --- |
| Explicit EPERM/link failures | 45 | 42 retain exact native paths/stacks; three assertion wrappers report received EPERM/link but shorten details. Unchanged immutableWrite is the failing path where retained native stacks identify it. Native-only diagnostic independently denies link. | **High:** current environment lacks the required native capability. **Limited per-call detail** for three abbreviated wrappers; not proof that all later functional assertions would pass elsewhere. |
| Conflict-type assertion receiving truncated EPERM | 1 | `detects edits made during asynchronous staging...` received an EPERM exception instead of ArtifactConflictError. Native operation/path is shortened by the assertion. | **High** that an upstream filesystem exception displaced the expected result; **medium** that it is the same link denial, given missing complete per-call exception. |
| Application-build coalescing timeout | 1 | Original 5000-ms timeout. Retained unhandled rejection reports EPERM/link, immutableWrite → refresh/discover → build snapshot/pass, and points to application-build/coalescing as the latest case. Source awaits `began` before it reaches the later await of `running`; only compile resolves `began`. Snapshot failure precedes compile. | **High, source-and-trace supported:** early rejected build can leave the compile gate unfulfilled and the running promise unhandled. Exact per-operation task ID is absent; this is stronger than timing proximity but not a new correlated reproduction. |
| Watcher discovery timeout | 1 | Original 5000-ms timeout; no matching retained per-watcher error log. Source changed handler calls refresh; binding failure prevents notification, while watcher reports errors and can continue scanning. | **Probable / medium:** native link limitation supplies a concrete mechanism for waiting forever for the first event. The precise failing checkpoint/error in this historical fixture is **not directly demonstrated**. |
| Application CLI validation return mismatch | 1 | Actual 2, expected 1. Original raw stderr contains an unwrapped EPERM/link from a `uib-build-*` root. This test file has one runApplicationCli invocation and uses default stderr. CLI catch writes the exception then returns 2; validation must first snapshot/discover. | **High:** corroborated upstream filesystem failure rather than validation-invalid return. No operation ID is present, so retain that correlation limit. |
| Artifact CLI root-validation return mismatch | 1 | Actual 2, expected 1. CLI catch serializes an error into test-captured stdout and returns 2; the assertion fails before parsing that captured output, which was not retained. Root validation begins with discovery. | **Probable / medium:** link failure is consistent, but the precise caught error cannot be recovered from retained output. **Not independently attributed conclusively.** |
| Graph child-first assertion | 1 | Expected child, observed local-3, child exit 0; full order/acquisition sequence missing. | **High:** deterministic priority is not supplied by the documented algorithm. **Unknown:** exact schedule and whether new continuation timing contributed. Separate contract decision required. |
| Unhandled rejection (additional runner diagnostic) | 1, not an extra failed test | Explicit EPERM/link stack in application-build. | **High:** a native denial rejected build work; structural gate/await ordering explains how it can become unhandled. Do not add it to the 51-test count. |

The coalescing and CLI conclusions combine existing unique source paths with retained error text; no unrecorded failing read or owner identity is asserted. The artifact CLI and watcher cases remain gaps. There is no basis to infer an abandoned owner or guard-cleanup fault from any of these filesystem messages. The Customer lock's creator and historical mechanism remain unknown.

## 5. Preservation and changed-file inventory

Final `preservation.json` compared all **2,603 UI**, **158 Data Services** and **38 Application** baseline paths: **zero differences**. All six dependency hashes match. UI HEAD remains `c86ecb3708fd619791b7f667b02b0c4c673bd686`; Data Services HEAD remains `81b769eef3763d02343f5347888c26edab6ef7bc`. Pre-existing implementation and tooling edits remain in place, uncommitted. Existing results, compiled output and tests were not used as diagnostic write targets.

Direct real-state comparison passed: canonical Customer Summary Card identity/key `d179aa405e5fabc10c0dcd063888480c115eb75f2ef03df9f74ce3ec26e0043e`, zero-byte lock/hash, inode 17169973580092885/device 1344742221, creation/write/change metadata and all five role hashes match. The transaction directory remains empty and pending journal/recovery guard absent. Direct access timestamps are recorded rather than restored; no normal reader/acquisition/recovery was called. No real lock, journal, Component source or Application data changed.

`foundation-regression-diagnosis-20261020-files.json` lists every new report, diagnostic source, index, context/output and preservation file with size and SHA-256; its own entry is intentionally unhashed. There are no modified or deleted existing baseline files. The disposable capability directory was removed only after closing its known handles and recording residual state; it is not a retained evidence directory. Inventory scope is enumerated source/data/evidence and new additions, not a full-volume snapshot. No Vitest cache update occurred because no tests ran.

## 6. Recommended next authorization

1. **Resolve graph contract alignment first.** Preserve the failed assertion and approve a precise contract/verification design: bounded cooperative handoff versus a new deterministic priority requirement. Do not extend this cleanup correction into a fairness protocol incidentally. No runtime or test changes are proposed for execution under the current gate.
2. **Establish a suitable ordinary-privilege verification environment.** Separately authorize a minimal native capability confirmation in an approved disposable location/context that preserves the original immutable hard-link operation and security protections. Current evidence justifies an environment prerequisite check, not weakening immutable identity publication or running as administrator. If capability remains unavailable, document the limitation and keep affected acceptance blocked.
3. **Then authorize a specific bounded verification selection.** Once the contract and environment are settled, review a serial retry-disabled selection that directly covers the failed generic identity/journal/Windows/CLI/watcher checkpoints and the agreed graph test. Preserve original budgets and assertions unless an explicit architecture/test-design decision authorizes a change. Do not automatically rerun all 108 or Builder verification. Any new active reproduction or diagnostic correlation requires separate approval.

The cleanup implementation remains implemented but unaccepted. The native denial can be independently diagnosed without reverting it. No broader locking redesign, real-lock maintenance, Builder focused/full-suite run, D6/WP5 acceptance or umbrella closure follows from this report.

**STOP AT FOUNDATION REGRESSION DIAGNOSIS REVIEW GATE.**
