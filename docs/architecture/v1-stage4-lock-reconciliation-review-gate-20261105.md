# Stage 4 Lock Reconciliation Review Gate — 2026-11-05

Status: investigation complete within available read-only access; cause unresolved. Stage 4 acceptance, closure and Git synchronization remain paused. Overall V1 remains open.

## Scope and method

This investigation inspected filesystem metadata, existing evidence, Windows metadata/log availability, source and compiled lock code, current processes, Git trees and file hashes. It did not run tests, import or execute graph/storage services, acquire/recover/recreate a lock, mutate the Component graph, terminate processes, install dependencies, stage, commit or push. Only this report and its evidence summary were written.

Investigation starting HEAD: `e506df9549c9c565a94380e48ee3cedb50f11aea`; UI Platform worktree was clean. The previously accepted Stage 3 baseline is `86380f6430fcc4eea1a4d31c55a1951749707f9f`. Existing Stage 4 evidence was already committed at the starting HEAD; this investigation does not confer acceptance on it.

## Proven observations

The shared identity is `visual-runtime-graph-v1`; its SHA-256 filename is `236dfbe257a229da85d588f4f851f4ea1e72efefbe5565e69e305f0d6f69602d.lock` under `components/.uib/locks`. At 2026-11-05T10:14:40.4514774-05:00 it was absent and the locks directory was empty. The prior Stage 4 absence observation was 2026-11-05T09:54:27.4368572-05:00. No startup observation establishes when the historical lock disappeared.

The locks directory was created at 2026-10-14T23:41:38.7737513Z and last modified at 2026-11-05T14:52:44.3720262Z. Its current file ID is `0x000000000000000000170000000a5e2d`. A directory modification time records an entry change, not the filename, operation or responsible process. It cannot identify the historical lock's deletion.

The quarantine directory's creation and modification date remains 2026-10-20T15:08:24Z. Its only entry is the zero-byte, different-identity file `eeea95554098a2bf3112bf6532920d01f1393311b2047ed54a37bdb02126e5c5.lock.owner-unresolved-20261020` (created 2026-10-20T01:29:29Z, modified 01:30:54Z). No corresponding quarantine entry exists for the missing lock. There were 199 transaction directories and no `journal.json` files found in them; this is not a historical comparison of all transaction metadata.

### Comparison with accepted records

The Stage 2 closure record (`v1-stage2-acceptance-closure-20261104.md`) preserved a five-byte PID file containing `31504`, SHA-256 `9C1EA1A0CF2D1F07973EC0F060882227072E23A4306074525790EE917CCC3D72`, file ID `0x00000000000000000048000000009297`. Earlier review evidence had identified PID `33148`. Attribution between those observations was unresolved and accepted only as a qualification. Creation was November 4 at 13:13:42 Eastern; modification at 13:38:28 overlapped Stage 2 tests. Neither overlap proves a writer or distinguishes replacement from rewrite.

The Stage 3 physical preservation record reports that hashing the lock failed because another process was using the file. It does not supply a new digest, owner or precise observation time. It therefore cannot prove the historical file's identity or continued presence at Stage 3 closure. Current queries found neither historical PID running; this says nothing conclusive about their earlier lifetime or PID reuse.

## Available provenance and its limits

NTFS journal metadata was readable: journal ID `0x01dc25c6328d923a`, first retained USN `0x00000001c8000000`, next USN `0x00000001ca7439a0`, maximum size 32 MB. Reading journal records failed with exit 1, `Error 5: Access is denied.` No claim of an empty matching journal search is made. The directory's current USN read-data contained USN `0x00000000de0bb780`, zero reason and zero timestamp; this is not a deletion record.

Windows Security log access explicitly required elevated user rights. `auditpol` failed with error `0x00000522` (required privilege not held). Audit configuration and file audit events could not be established. The Sysmon Operational log was not present. In the bounded November 5 09:15–09:55 Eastern interval, 47 Application and 51 System events were inspected; none matched the lock stem, `ui-platform` or `node.exe`. These logs do not ordinarily establish every filesystem operation and do not exclude a normal recovery or unlink.

Existing targeted Stage 4 test/evidence and known runtime log locations supplied no per-lock recovery trace identifying a PID or filename operation. The final role-test JSON records an interval from 2026-11-05T14:51:54.732Z to approximately 14:52:46.140Z. The directory modification time falls inside that interval. This is temporal correlation only: any lock-directory entry change could account for it. Child-server stdout was not retained as a per-lock audit. Current trace/metrics environment variables were unset; this does not establish historical child environments.

Ordinary Node development services were running, including source-server processes started on November 4. Their presence establishes possible callers, not that they accessed the graph or removed a lock. Relative command lines do not establish their working directories. No process was stopped or probed with a signal during this investigation.

## Relevant code paths (inspected, not executed)

`src/server/composition-lock.ts` delegates `withApplicationMutation` to `withRoleBundleGraph(path.join(platformRoot, 'components'), ...)`, regardless of the supplied application root. `platformRoot` derives from source location in `src/server/paths.ts`, not the disposable application/runtime directories.

`packages/artifacts/src/role-bundle.ts` uses the shared `visual-runtime-graph-v1` identity. `packages/artifacts/src/storage.ts` implements exclusive creation; on an existing lock it reads a numeric PID. With `recovery: 'refuse'` it refuses before a PID probe. Under the default policy it probes the owner with signal zero; only ESRCH permits recovery. It obtains an exclusive `.recovery` guard, rechecks the PID, removes the old lock, creates and syncs its own PID file, then removes its owned lock on successful release. Normal recovery/release does not create a quarantine entry. Uncertain close failures preserve the lock. The installed compiled `dist/storage.js` and `dist/role-bundle.js` contain the corresponding behavior. Storage/graph source and package manifests were unchanged from the Stage 3 baseline.

Builder workspace discovery/authorization in `src/server/builder-workspace.ts`, and visual create/update/delete handlers in `src/server/index.ts`, reach this wrapper without a refusal override. Some visual read paths explicitly request refusal. Thus even apparently ordinary Builder activity can reach a recovery-capable shared lock operation.

The Stage 4 role workflow launches the source server with fresh application/runtime stores, but defaults its working root to the workspace unless `UI_PLATFORM_STAGE3_PHYSICAL_ROOT` is supplied. Disposable stores alone do not isolate the source-derived Component root. The Stage 2 Builder regression similarly launches the workspace source server. Its cleanup removes a specifically validated generated Component folder, not the sibling root lock directory. Both workflows have reachable shared-lock operations; neither fact proves that a particular historical invocation recovered this lock. The historical child root/environment and lock-acquisition PID are not retained.

The Stage 4 asset regression explicitly uses a physical clone and excludes the original `components/.uib`. Other tests that explicitly remove lock files use temporary fixture roots. The Stage 4 role teardown removes its temporary root and closes its own browser/server resources; no direct deletion of the original shared lock was found there. Development launchers can also call the same source server. These are alternative capable callers, not attributed causes.

## Current preservation verification

- Shared Component graph: 23 accepted tracked files and 23 current non-metadata files, with no additional graph files or symlinks found. All matched accepted Git blob content, allowing normal CRLF normalization. No diff from Stage 3 in `components`, `packages/artifacts`, `package.json` or `package-lock.json`.
- Installed package evidence: all 234 installed file hashes in the accepted Stage 3 package-closure manifest matched.
- Existing Stage 4 evidence inventory: all 47 listed file hashes matched their current bytes.
- UI-Base remained clean at `732eec58ca3d4bd2521197b9d3b6c0457dbc6608`; Data Services remained clean at `81b769eef3763d02343f5347888c26edab6ef7bc`.
- Normal dependency installation was read only. No package replacement or source modification occurred during this investigation.

These are current-content checks. They cannot exclude intermediate changes later reversed, lock operations, historical runtime activity or changes to metadata without an accepted baseline. The missing lock itself remains a preservation discrepancy despite the content checks passing.

## Findings, assumptions and remaining concerns

**Proven:** the lock is absent; current graph and checked package contents match accepted evidence; preexisting default recovery/release code is capable of producing an empty directory without quarantine; application-store isolation alone does not ensure shared-graph isolation.

**Plausible, unproven explanations:** a Stage 4 or Stage 2 workflow, an ordinary development service, or another caller performed default dead-owner recovery followed by release; alternatively another actor removed the file. The directory timestamp narrows a directory-entry change, not necessarily the historical file's disappearance. No explanation is selected as the cause.

**Unverified assumptions:** the historical PID file remained unchanged until the final Stage 4 test; that test used the original Component root; the directory timestamp names this particular lock; or a missing quarantine entry excludes recovery. None is adopted as fact.

**Remaining integrity concern:** the writer, exact removal time, operation and historical inode continuity remain unknown. Available access and retained logs do not support a causal attribution or a certification that no prohibited shared-lock operation occurred. No new graph/package content discrepancy was found.

## Smallest safe disposition options

1. An authorized Windows operator can supply a narrowly filtered, privileged read-only journal/audit export for the historical file ID, parent directory ID and filename over the relevant period, if records remain retained. No lock or graph operation is needed. Missing/overwritten records may still prevent attribution.
2. The owner can explicitly disposition the unexplained absence as a retained qualification based on the passing current-content checks and acknowledged historical evidence gap. This requires a decision; this report does not grant it or accept Stage 4.
3. Before any future functional run, separately authorize the smallest isolation/refusal guard needed to keep all tested server paths off the shared graph. Do not reproduce recovery against the original root or recreate a historical PID file. This is a prospective safeguard, not a finding about the past.

Stop: **Stage 4 Lock Reconciliation Review Gate**. No acceptance, closure, Git synchronization or Stage 5 work is authorized by these findings.
