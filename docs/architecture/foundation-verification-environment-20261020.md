# Foundation verification environment — ordinary-user capability assessment

2026-10-20. **ONE NATIVE CAPABILITY CONFIRMATION PASSED. NO FOUNDATION OR UI TESTS RUN.** Foundation cleanup remains implemented but unaccepted. D6, WP5-F and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.

## 1. Pre-execution assessment and independent gate

Before capability execution, the worker wrote its executable/hash, PID/PPID, process-start identity, exact proposed path and parent token context, then waited without creating any disposable directory/file/link. The separate `pre-capability-assessment.md` was written and reviewed before its one-shot nonce/hash gate was released. Its SHA-256 is included in `capability-go.json`. This is an agent safety check under the user's existing one-check authorization, not another user approval or test run.

The live worker was independently inspected using PROCESS_QUERY_LIMITED_INFORMATION and TOKEN_QUERY. No token privilege adjustment, duplication, impersonation, RunAs, UAC or administrator launch occurred. The first inspection's IsInRole call returned Access is denied; its source/error are preserved. The v2 query used actual group SIDs plus token fields instead, confirming no Administrators SID membership and elevated=0. All query handles closed in finally. The worker's initial self-report that only parent inheritance had been inspected is superseded by this later direct worker query, not rewritten.

Evidence directory, containing all records referenced below:

`C:\Projects\Modular\ui-platform\docs\architecture\evidence\graph-contract-environment-20261020`

## 2. Exact alternative context

| Property | Inspected value |
| --- | --- |
| Capability worker | Node PID **28276**, PPID **3012** |
| Windows process start | **2026-10-20T21:06:01.4007462Z**; Node performance timeOrigin retained separately |
| Executable | `C:\Program Files\nodejs\node.exe`, **v24.19.0** |
| Executable SHA-256 | `3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237` |
| Parent | PowerShell PID **3012**, start **2026-10-20T21:06:00.3145416Z**; executable/hash in `host-standard-user-context.json` |
| User | `NIMO-LAPTOP\zanyf`, SID `S-1-5-21-1734589849-1334209607-508583849-1001` |
| Worker token | **Not administrator; elevated=0; AppContainer=0; medium integrity S-1-16-8192** |
| Filesystem | Fixed **C: NTFS** volume, statfs recorded |
| Exact disposable root | `C:\Projects\Modular\ui-platform\docs\architecture\evidence\graph-contract-environment-20261020\native-capability-1c8a76457eab4abf81343359ebe8c5d7` |

This is the existing ordinary-user host context outside the restricted tool AppContainer. A same-phase read-only sample of the restricted tool context confirms **AppContainer=1, low integrity S-1-16-4096, elevated=0, non-administrator**. Both contexts have the same user SID, Node executable hash, shell executable hash and evidence-directory SDDL. The original denied diagnostic context was not token-inspected at its historical execution; do not claim an exact retrospective token match.

Selecting this existing host context changed the process containment/integrity context, not repository ACLs or security policy. The exact denying Windows predicate is still unproven; AppContainer and integrity changed together and are not independently isolated. The capability check demonstrates context-dependent success, not an exhaustive security root cause or authority for unrelated host execution.

## 3. Isolation, rights and preservation requirements

The reviewed source is `capability-worker.mjs`; `context.ps1` captures parent context and launches it normally. Before release, the target root was absent, the worker reported zero capability operations, and the planned parent was canonical. At execution it created the exact new directory without recursive/existing-root reuse, checked canonical equality/no root symlink, and targeted only `identity-binding.tmp` and `identity-binding.json` inside it.

Required rights were inherited create/write/sync/close, chmod on the **new disposable source only**, one native same-directory hard link, read/stat and removal of those known disposable files/root after confirmed close. The existing evidence-directory ACL was recorded and matched across contexts. No ACL edits, permission grants, security setting/antivirus changes or privileged token were used. The worker imported native Node modules only, not Foundation, a normal reader, an application request or a recovery path. No Customer key, journal or actual Component root was an operation target.

The one-shot gate matched both nonce and exact preflight bytes' hash. Complete stdout/stderr, source files, native exit, process/token queries, operation log, link identity/bytes and residual cleanup state are retained. All existing source, test, generated, historical evidence, dependency and captured Application paths were baselined before the experiment and compared afterward. That scope is enumerated preservation, not a full-volume or complete external-process audit.

## 4. Actual native result

**Exactly one link attempt. Native exit 0.** No automatic retry, writable-file control, test suite or second capability attempt occurred in this phase.

| Sequence | Actual result |
| --- | --- |
| Exclusive root creation / canonical safety / statfs | Passed |
| Source wx → UTF-8 write → sync → close | Passed; handle ultimately fd **-1** |
| chmod 0444 | Passed; mode **0100444** |
| Original native `link(source, target)` | **Passed**, event 9 |
| Identity proof | Source and target inode **4785074604806423**, same device, nlink **2** each; before link nlink **1** |
| Content proof | Exact hex bytes match `{"artifactId":"diagnostic-only"}` |
| Source/target removal and root rmdir | All passed |
| Final root observation | **ENOENT**, expected after cleanup |

All native arguments, absolute paths, inode/device/time/mode values and UTC/monotonic sequences are in `capability-result.json`. `capability.exit.json` records the command/parent/native exit; host-worker stdout/stderr preserve the process streams. There was no capability error to suppress. Expected post-cleanup ENOENT is recorded separately from failure=null.

This preserves G3: exclusive sibling creation, write/sync/close, read-only mode and hard-link publication all ran unchanged. The added stat/read observations only verify the disposable link, not replace publication. No copy, rename, overwrite, permission fallback or larger timeout was used.

## 5. Updated failure attribution ledger

The machine-readable `failure-attribution-ledger.json` preserves the original F22 result hash and all **51** failed-test classifications. The original result remains **57 passed / 51 failed / 108 total**, with one separate unhandled rejection; no result is retroactively promoted to a pass.

| Historical group | Updated status |
| --- | --- |
| 45 explicit EPERM/link failures | Environment-dependent native capability failure strongly supported: native-only denial was retained; original-sequence link now succeeds in inspected ordinary host context. 42 original records retain exact native paths/stacks, three have abbreviated assertion errors. Later product checkpoints still unverified. |
| One conflict assertion receiving truncated EPERM | Upstream filesystem exception established; exact historical link call remains incompletely attributed. Host capability does not fill the missing exception data. |
| Application coalescing timeout + unhandled rejection | Retained native-link rejection and gate/await structure still provide high-confidence correlation. No reproduction or resolution proof. Unhandled rejection is not another failed test. |
| Watcher timeout | Filesystem mechanism remains probable; exact historical event/checkpoint unresolved. |
| Application CLI mismatch | High-confidence unique source/stderr correlation retained, without exact operation ID. Not rerun. |
| Artifact CLI mismatch | Probable filesystem explanation; original captured exception JSON remains unavailable. Not conclusively attributed. |
| Graph child-first failure | G1 resolves architectural intent as cooperative opportunity. Historical scheduling contribution remains unknown. G2 replacement coverage is designed, not implemented or verified. Original failed assertion remains failed. |

No evidence associates these failures with the real Customer lock's creation or cleanup. Its creator and historical mechanism remain unknown. Selecting a capable environment does not settle the remaining code/fixture checkpoints.

## 6. Preservation and exact changed-file inventory

`before.json` and final `preservation.json` cover **2,621 existing UI files**, **158 Data Services files**, **38 captured Application files** and six dependency records: **zero differences**. The existing cleanup source, compiled output, all tests and historical results are unchanged. The original graph test has an additional byte-identical documentation snapshot, SHA-256 `aba915c46873d834ca8325c182cf2f061b30640ae6fd458e45500c332e7fab32`.

UI HEAD remains `c86ecb3708fd619791b7f667b02b0c4c673bd686`; Data Services HEAD remains `81b769eef3763d02343f5347888c26edab6ef7bc`. Pre-existing edits remain uncommitted and preserved. No index/history write or repository configuration change was performed.

Direct Customer state comparison passed: canonical anchor/key `d179aa405e5fabc10c0dcd063888480c115eb75f2ef03df9f74ce3ec26e0043e`, zero-byte hash and file identity, creation/write/change metadata and all five roles match; transaction directory remains empty, pending journal/recovery guard absent. Access metadata is recorded rather than restored. No Foundation access, acquisition, removal, recovery or reconstruction touched that lock.

`graph-contract-environment-20261020-files.json` enumerates the exact new decision/design report, environment report, diagnostic-only helpers, original-test text snapshot, context/query/stream/operation records, updated ledger and preservation files, with hashes and sizes. Its self-entry is explicitly unhashed. Modified/deleted existing files are empty. The disposable directory and its two files were created and removed only within this experiment and are separately accounted for as transient state. No test helper was installed in the application or existing test tree.

## 7. Recommended next bounded authorization

Review and approve the GA1–GA10 design in `graph-v1-contract-alignment-20261020.md`, then separately authorize **test-only graph alignment implementation**, relevant no-emit typecheck and a named small Foundation selection in this validated ordinary-user context. The scope should preserve the original test snapshot/results, all production/generated code and original budgets, add explicit phase/exclusion/timing coverage, and stop on isolation/source-integrity loss or a new contract question.

Initial verification should cover the aligned graph cases and existing cleanup fault tests; separately authorize the filesystem-affected identity/journal/Windows/CLI/watcher checkpoints once the test diff is reviewed. An ordinary host launch must be context-checked again for that future run; this one capability success is not blanket permission to execute outside containment. Do not automatically run all F22, Builder focused tests, the UI suite or real-lock maintenance.

The cleanup implementation remains implemented but unaccepted. **STOP AT GRAPH CONTRACT AND VERIFICATION ENVIRONMENT REVIEW GATE. D6, WP5-F and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.**
