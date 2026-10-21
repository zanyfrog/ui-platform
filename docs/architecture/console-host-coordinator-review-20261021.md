# Console-host coordinator architecture review — October 21, 2026

Documentation-only proposal. No coordinator correction, process experiment, native capability check or test execution is performed or authorized by this report. Foundation cleanup remains implemented but unaccepted; the 55 Foundation cases remain unexecuted.

## 1. Findings and evidence boundaries

Reviewed source: `evidence/foundation-remaining-verification-20261020/host-run.ps1`, SHA-256 **b562bba4af945dcc389f3fc97cf2b8026eea3df8817062ca700b6403e9e8a746**. Exact source, preloader, capability, production and regression hashes plus file metadata are recorded in `evidence/console-host-review-20261021/reviewed-sources.json`.

Demonstrated source behavior:

| Location | Current behavior | Consequence |
|---|---|---|
| ChildSnapshot.Read | Collects PID/parent PID only; does not distinguish enumeration failure from an empty/partial result | No creation identity or explicit coverage failure |
| Observe-Children | Expands a persistent PID-only `$owned` map for six passes; records native children by PID | PID reuse and stale state can associate the wrong process; depth is arbitrary |
| Get-Process failures | Missing process/path/start data are silently skipped | An uninspected short-lived descendant is not reported as a coverage gap |
| Node shortcut | Skips Node descendants on path equality, relying on preloader contexts | Missing/stale preloader coverage is not reconciled against all observed Node identities |
| Native allowlist | PowerShell/esbuild paths allowed; a hash is recorded after classification but not compared to the frozen expected executable hash | Path alone currently grants executable-class eligibility |
| Native rejection | Throws on an unexpected path before saving the candidate PID/start/path and token | Historical rejection has a path, not a complete rejected-process identity |
| Inspect-Pending | Uses self-reported PPID, nonce and Node hash, OS token and approximate runtime timeOrigin comparison | Useful gate, but runtime timeOrigin is not an exact OS creation time; parent linkage needs independent verification |
| Run-Native catch | Calls `$process.Kill($true)`, waits, then rethrows before the normal exit-record statements | Root native completion and descendant completion records can be lost; cleanup error can replace the original rejection |
| Completion loop | Native child process objects are retained only after successful inspection, and only normal completion writes them | Rejected/disappeared processes lack explicit unavailable evidence; some descendants may still run when root exits |
| Coordinator launch | Child streams redirected, coordinator streams not separately captured | Tool-retained diagnostic exists, but durable full coordinator streams/native completion are incomplete |

The retained attempt proves rejection of the observed path `C:\WINDOWS\system32\conhost.exe`, coordinator native exit 1, empty runtime/context directories, no capability result and no Vitest launch. It does **not** prove that a particular historical conhost PID, token, file hash or console relationship was verified. No malicious or elevated process is demonstrated. No successful hard-link result is inferred. The existing 82 passing graph/cleanup cases remain historical evidence, separate from this attempt.

Windows console clients and console hosts are separate roles. Windows can create a console or attach a client to an existing one; hiding a window or redirecting streams is not a contractual guarantee that no host process will exist. Therefore a console-host descendant during Node/PowerShell launch is plausible. These OS facts do not identify the rejected historical instance. [Microsoft definitions](https://learn.microsoft.com/en-us/windows/console/definitions), [console architecture](https://devblogs.microsoft.com/commandline/windows-command-line-inside-the-windows-console/).

## 2. Exact classification policy

Keep **discovery**, **executable eligibility**, **verified launch association**, **security-context verification**, and **termination authority** as separate fields. Neither basename nor a matching path is trust. Classifications: `expected-verified`, `unknown-unverified`, `exited-before-verification`, `mismatch-observed` and `unrelated`. A positive token-policy mismatch establishes incompatibility with this run, not a general malware verdict.

For a future console-host candidate, require all of CH1–CH6 before continuing test work:

| ID | Required evidence and decision |
|---|---|
| CH1 image | Resolve the fixed native Windows System32 directory in the reviewed host architecture; no PATH lookup or wildcard. Read the canonical conhost file, reject reparse/redirection surprises, record volume/file ID, length, last-write metadata and SHA-256. Compare actual process image path with this exact file and hash against the freshly frozen reviewed value before and after execution. Any OS servicing change requires review, not automatic hash refresh. Record Windows file version and Microsoft signature/catalog validation if available; a signature alone does not establish launch association. The measured current file is `C:\Windows\System32\conhost.exe`, SHA-256 **c86146188b78e484f32cc29e2331689659943b47689a85570342044f499938ac**. This is current on-disk evidence only, not a historical loaded-image measurement or proof of signature validity. |
| CH2 process | Open a stable process handle, record OS PID, exact GetProcessTimes creation FILETIME, QueryFullProcessImageName path, snapshot/event timestamp and source. Key records by run ID + PID + creation FILETIME, not PID alone. Query identity through the same handle and reject a replacement PID. Keep OS creation time distinct from Node timeOrigin. |
| CH3 authorized association | Match the candidate's captured creator relationship to a specific launched/verified identity in this run, using contemporaneous OS parent evidence and retained parent handle/creation identity. Parent must have existed at child creation, within its recorded lifetime and the specific launch phase. Link to the coordinator's recorded root launch ID and known Node/PowerShell child chain. A numeric parent PID without lifetime proof, timing proximity, command line, or shared user is insufficient. If Windows reports a broker parent or shared host rather than a verifiable chain, classify unknown and stop; do not invent a creator edge. |
| CH4 console evidence | Record available OS console membership or retained process-creation evidence as corroboration. GetConsoleProcessList reports clients attached to the *calling process's current console*; it is not a universal client-to-conhost lookup, and absence of the host PID is not proof of unrelatedness. Do not AttachConsole/FreeConsole in the running coordinator or alter child console flags merely to obtain evidence. No new ETW/event subscription/helper process is implicitly authorized. Existing readable logs may corroborate, with their limitations. A fully verified creator chain under CH3 can establish bounded launch association without pretending to prove console membership; otherwise stop pending a separately approved observation method. |
| CH5 actual token | Independently query actual token through the stable handle: user SID equals approved host, administrator membership false under existing conservative group rule, elevation 0, AppContainer 0 and medium integrity S-1-16-8192. Log native access errors. If token cannot be queried, record unknown and stop; never infer token from image path or parent. No token or privilege manipulation. |
| CH6 run scope | Confirm run ID, launch phase, immutable source/executable inputs and capture health. The candidate must not predate the run's verified creator relationship. Expected shared/pre-existing console services are not owned by this run and receive no termination authority. No generic `conhost*`, System32-wide, same-user or descendant-wide exception. |

Current file metadata is not a measurement of a running process's loaded image pages; the proposed evidence does not claim resistance to arbitrary privileged process tampering. Snapshot parentage is bounded operational evidence, not cryptographic creator attestation. Inability to establish CH1–CH6 remains fail-closed.

For PowerShell, esbuild and Node use the same handle/creation/hash/security/association requirements, with their exact separately frozen paths. Reconcile every discovered Node identity with a matching approved pre-entry context; self-reported PPID alone must not pass. Do not alter preloader timing budget or product/test runtime behavior as part of the console exception.

Short-lived process: retain first observation immediately. If it exits before opening/querying, preserve observed PID/PPID/time and native error; missing fields remain null with reasons. If a retained handle supports later exit/time queries, use it; never reopen a reused PID to fill historical fields. A process that was never fully verified cannot become trusted merely by exiting. Stop further authorization and mark the run's identity coverage incomplete. Polling cannot prove discovery of every process between samples; report snapshot interval, gaps and coverage limitations. No claim of exhaustive process attestation from 20-ms sampling.

OS references: [PROCESSENTRY32 parent identifier](https://learn.microsoft.com/en-us/windows/win32/api/tlhelp32/ns-tlhelp32-processentry32), [GetProcessTimes creation identity](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes), [GetConsoleProcessList scope](https://learn.microsoft.com/en-us/windows/console/getconsoleprocesslist).

## 3. Failure evidence and termination safety

The future coordinator must own a run-wide state machine: `prerequisites → capability → independent capability review → selection → finalization`. Any unknown identity, evidence-write failure, input mismatch, incomplete discovery or token mismatch irrevocably changes the current run to `stopped`; no new gate approvals or tests may start. Already admitted callbacks cannot be undone; any partial test work must be accounted for without replay.

Record rejection **before throwing**: run/phase/acquisition-independent launch ID, sequence, UTC and monotonic timestamp, observation method, candidate PID/creation or explicitly unavailable fields, parent evidence, image/hash, token evidence/errors, classification, exact rejection reason and original error identity/stack/HResult/native error. Flush the event record; evidence-write failure is itself a blocking secondary error. Preserve both errors if writing fails; use coordinator stderr as fallback, not a fabricated successful record.

Replace broad tree termination with a frozen set of verified owned process **handles**. A directly launched root can be owned from its captured process handle, OS creation identity and launch record even when a descendant is unknown. Verified workers/children require independently established linkage. Candidate/unknown/shared/pre-existing hosts are never put in the termination set. Discovery does not grant ownership. Immediately before termination verify the handle's identity and liveness; request termination of that exact handle only (no Kill(true), taskkill tree, PID-name filter or fresh PID lookup). Record requested/not-requested/already-exited, result, native error and identity per process. Prefer verified children before root where known; do not enumerate and kill newly appearing unverified descendants during cleanup. An expected console host normally exits with its console clients; do not directly terminate it solely for being an expected host. Residual unknown processes are reported for a separate decision, not forcibly removed. This can leave residual processes when ownership cannot be established; report blocked/quiescence-unproven and do not proceed to another phase.

The existing Kill(true) is anchored to the launched root, but .NET's descendant traversal is broader than the coordinator's independently verified identities. It must not be treated as proof that every terminated process was verified. No retained per-target termination record proves what happened historically. [Microsoft Process.Kill documentation](https://learn.microsoft.com/en-us/dotnet/api/system.diagnostics.process.kill) also warns that waiting for the root does not establish that all descendants have exited.

Put completion collection in an unconditional finally, independent of inspection or termination success. Preserve each retained handle's actual exit code, start/exit time and availability/error; root running, terminated, exited naturally and unknown exit are distinct. A kill request is not a measured exit. After a separately approved bounded finalization interval (proposed 5 seconds per run, not an acquisition/test timeout), report still-running/unavailable rather than wait indefinitely or invent completion. No tests start while finalization is unresolved. Flush streams before hashing when possible; explicitly mark partial streams when not drained. No assumption that exit 0 proves test completion or coverage.

Use an outer ordinary-user supervisor with coordinator stdout/stderr redirected from process creation, native coordinator completion in supervisor finally, and a separate child completion manifest. It must not be affected by coordinator evidence serialization failure. If evidence storage is unavailable, retain supervisor stderr/exit and stop; complete evidence cannot be claimed. No transcript-as-replacement for raw stderr. Preserve raw records append-only, UTF-8, monotonic sequence plus UTC calibration, terminal manifest with SHA-256/length, explicit missing files/gaps, and create-new paths only. Hashes attest captured bytes, not unobserved events. Set the control stop flag before performing fallible I/O.

Primary error precedence: original prerequisite/test/launch error is primary; subsequent termination, wait, drain or manifest errors are ordered secondary records. If operation succeeded but cleanup/capture fails, that failure is primary and blocks acceptance. Preserve native process status separately from coordinator policy failure: an original child exit 0 plus coordinator capture failure is not a successful verified run. Supervisor exit nonzero indicates coordinator failure but never substitutes for a missing child exit. Preserve original exception as primary/inner rather than replacing it with a cleanup exception.

## 4. Git provenance reconciliation

Current UI HEAD: **197427b3c0c112754481e8daad83faa1b8b8b737**. Previous graph evidence recorded **c86ecb3708fd619791b7f667b02b0c4c673bd686**. Local commit parent links and reflog show:

| EDT on October 20 | Commit | Parent | Recorded subject |
|---|---|---|---|
| 10:05:28 | c86ecb3708fd619791b7f667b02b0c4c673bd686 | 7050993160cee3ffeb49674fa4696dc6ff8f694a | pre Shared-Component Lock Recovery Review |
| 17:02:33 | f4380b2ee67835316c55942dacd99a9baa3aa2c3 | c86ecb3708fd619791b7f667b02b0c4c673bd686 | Builder V1 — Foundation Regression Diagnosis Review |
| 17:20:51 | 197427b3c0c112754481e8daad83faa1b8b8b737 | f4380b2ee67835316c55942dacd99a9baa3aa2c3 | Builder V1 — Graph Contract and Environment Review |

Both new records identify Kelly Harris in author/committer metadata; the reflog labels them local `commit` transitions. This explains the available local ancestry, not independently authenticated human action or external audit provenance. No assumption of a push, signature, remote state or verification-agent authorship is made. The failed attempt's own before and after HEAD was already 197427b3; it did not record a HEAD transition. Historical graph report and live Git metadata are different evidence sources; their recorded times do not establish why the older graph snapshot was used. Do not rewrite either.

The aggregate old-graph-to-current-HEAD diff is **422 files, 185,656 insertions, 51 deletions**. It is not documentation-only: it includes the already authorized storage cleanup source, cleanup tests and pre-existing tooling changes alongside extensive evidence. Exact name/status list, parent chain, reflog, source diff and working-tree snapshot are preserved in `git-provenance.json`. Existing compiled storage and source hashes match the approved inventory; no acceptance is inferred from commit membership. Data Services HEAD remains 81b769eef3763d02343f5347888c26edab6ef7bc. Local Git inspection used no optional locks; no fetch, commit, reset, configuration change or synchronization occurred.

## 5. Proposed edits, validation and approval decisions

See `console-host-coordinator-proposed-diff-20261021.md` for the exact edit locations and design diff. Only a **new disposable coordinator/supervisor copy** may change in a future implementation; the historical coordinator and evidence must stay byte-for-byte intact. The proposal does not change Foundation, Node runtime installation, product configuration, test files, preloader budgets, assertions or persistence protocols. Helper contracts are fully specified here; the design diff is not executable implementation or authorization to apply it.

| Case | Required future validation result; none executed now |
|---|---|
| Genuine fixed-image conhost, verified creator lifetime, matching ordinary token | Classified expected; no extra termination authority; capability gate may continue |
| Name-only conhost, alternate path, symlink/redirection, wrong file ID/hash | Block before new approvals; preserve rejection; do not terminate candidate |
| Genuine binary, unrelated or pre-existing host | Excluded from owned set; cannot satisfy run association; block if relevant descendant cannot be explained |
| Correct path, wrong token or inaccessible token | Proven policy mismatch or unknown respectively; both block; no inferred token |
| Parent PID reused, parent exited before linkage proof, broker-only parent | No verified creator chain; block, retain available OS evidence |
| Candidate exits during query; PID reappears | Preserve first observation and missing fields; new PID+creation identity is separate; no fabricated backfill |
| Node path observed without approved matching preloader record | Block; no shortcut by executable class |
| Discovery/Process32First/Next fails; snapshot truncation or depth overflow | Explicit coverage failure; no empty-success return or silent six-pass cutoff |
| Unknown descendant during admitted test | Stop new work; preserve partial results, no replay; terminate only proven owned handles |
| Cleanup kill/wait/drain fails after rejection | Original error stays primary; all secondary errors and measured/unavailable native statuses retained |
| Root exits while descendant remains | Root exit and residual state separate; no quiescence assumption; no next phase |
| Completion manifest write or stream capture fails | Evidence-incomplete, nonzero coordinator outcome; no successful-run claim |
| Hash/source/security context changes | Stop before work or at detection; preserve evidence, no automatic refresh/retry |

Approval decisions before implementation: CH1–CH6 strict policy, blocking short-lived/inaccessible relevant processes, identity-based owned-handle termination replacing Kill(true), no direct console-host termination, and proposed bounded finalization interval. If Windows broker relationships cannot satisfy CH3 with available evidence, return for design review rather than add a broker/name wildcard. Future validation should first be static/source and controlled record-driven coordinator-only cases; any active coordinator validation requires explicit scope and must not implicitly launch Foundation tests or capability checks.

## 6. Separate authorization-ready verification plan

Proposed future authorization, **not granted by this review**:

1. Implement/review the coordinator-only design in a fresh evidence directory, preserve exact original and proposed diff, freeze helper/supervisor/executable hashes, and complete separately approved coordinator validation. No production/test edits.
2. Independently verify ordinary host and actual Node/worker/native-child identities: same approved user, medium, elevation 0, administrator false, AppContainer 0. Verify fixed console-host image and CH1–CH6; use no UAC, RunAs, security-policy or ACL change. Do not start selection if association or capture coverage is incomplete.
3. Record exact current Git HEAD/status and source/dist/graph/cleanup/eight-selection/dependency hashes against accepted inventories. Directly inspect canonical Customer anchor/key, zero-byte lock metadata/bytes, five roles, journal, guard, transaction entries and atomic siblings. Preserve all historical evidence and Applications. No Foundation call against the real store. Stop on identity, recovery-state or integrity mismatch.
4. Establish unique canonical non-reparse disposable TEMP/TMP root(s), separate from real components and all prior evidence. Verify approved executable/filesystem/permissions/security boundary and fresh evidence outputs. Run **one** native immutable hard-link capability confirmation. Preserve raw stdout/stderr, operation paths, native result, cleanup and process identities. Capability failure or incomplete evidence stops; no automatic retry.
5. Independently inspect capability success, source preservation and process classification before opening the test gate. Execute **only** the existing eight files / 55 cases once: application-build 7, artifacts 20, consumer-contract 5, migrations-deployment 9, security-definitions 2, watcher-fallback 1, watcher 5, windows-storage 6 (all `packages/artifacts/tests/*.test.ts`). No file substitutions or extra tests. Vitest flags remain `--maxWorkers=1 --no-file-parallelism --retry=0 --bail=1 --reporter=verbose --reporter=json`; original timeouts/acquisition budgets unchanged. One invocation, no retry.
6. Preserve coordinator and native child streams/statuses independently, original test JSON/failures, per-test passed/failed/not-executed accounting, process/phase records, explicit observation losses and disposable residual state. No manufactured JSON when Vitest never starts. If a failure or identity/evidence stop occurs, do not edit or rerun.
7. Recheck measured source/historical/Application hashes, Git HEAD/status and direct real lock/Component/journal/guard state. Account only test-generated state separately; no real cleanup. Produce readiness recommendation using 55 new results and the earlier 82 passing cases as distinct executions. Do not declare Foundation accepted. Stop at Remaining Foundation Regression Review Gate.

No capability or verification launch is authorized until a separate approval explicitly covers the corrected coordinator and the fresh run. This plan adds no automatic F22 remainder, full 108-case rerun, Builder focused verification or UI suite.

## 7. Preservation and changed files

`evidence/console-host-review-20261021/before.json` measures existing evidence/source/dependency/Application bytes against the previous preservation inventories and captures direct real-state evidence. `preservation.json` supplies the after comparison, HEADs, status, checklist count and all mismatches. `console-host-coordinator-review-20261021-files.json` enumerates only newly written review documents and JSON evidence, with sizes/hashes; its own self-hash is intentionally excluded. This is an enumerated inventory, not a full-volume snapshot or exhaustive installed-dependency audit. Access-time effects of read-only inspection are recorded, not reset.

Completed comparisons: **2,992 existing enumerated files matched**, with zero baseline differences and zero after-review content changes. Reviewed source and current on-disk console-host hashes also remained unchanged. Both Git HEADs matched before/after; direct Customer Summary Card identity/lock/five-role/journal/guard checks passed. The checklist retained **40 unchecked / 0 checked** entries. The preservation comparison covers the measured inventories and does not claim an independent active-process identity measurement. No live process experiment was used to fill the historical attribution gaps.

No coordinator implementation, active process experiment, capability, Foundation/UI test, source/test/configuration edit, real-lock operation or Git mutation occurred. Foundation cleanup is implemented but unaccepted. D6, WP5-F and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.

**STOP AT CONSOLE-HOST COORDINATOR ARCHITECTURE REVIEW GATE.**
