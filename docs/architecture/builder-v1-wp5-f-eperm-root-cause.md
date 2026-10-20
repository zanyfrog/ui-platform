# WP5-F — retained Windows EPERM trace: root-cause review

2026-10-19. Read-only analysis of the previously captured trace. **D6 remains blocked; no correction implemented or acceptance declared.**

## Decision and confidence

The trace establishes the failed directory rename and its NTFS completion path with high confidence. It also establishes a concurrent, successful **stat-by-name operation on a descendant of the staging directory**, issued by another thread in the same API process and still active at the recorded denial. This is a materially stronger finding than the earlier status-only analysis.

The leading explanation is a transient descendant-open conflict during directory publication. Confidence in the observed overlap is high; confidence that it is the particular NTFS rejection predicate is **moderate**, not conclusive. The retained events do not contain the executed NTFS branch, its directory open-list state, the complete access decision, or the JavaScript async caller of the stat request. A particular blocking user handle, watcher, external process or filter driver has **not** been proven responsible. Historical root-cause resolution must not be claimed.

## Analyzer, symbols and correlation

WPA/xperf/WPAExporter were unavailable in the checked command and standard toolkit locations. The Store package query was denied; this is not proof that no Store installation exists. Analysis instead uses the retained native TraceRpt decode of `publication.etl`, ETW image-load metadata, Windows DbgHelp, matching public symbols and read-only static disassembly. No new ETL collection, full-suite run, Windows settings change or process termination occurred.

New evidence is under `evidence/builder-v1-wp5-f-eperm-root-cause/`; the previous `builder-v1-wp5-f-elevated-eperm/` directory is unchanged. `extract-context.py` selects a 5-ms window around publication and exports image metadata from the existing CSV. The window has 757 stack records. `analyze-stacks.py` derives the modal FILETIME-to-stack-QPC offset **134368361982035786** from 756 matching pairs, then assigns stacks only by exact converted timestamp and PID/TID. No nearest-neighbor stack assignment is used. The retained trace header reports a 10,000,000-Hz performance counter. The relevant ETW [stack payload fields](https://learn.microsoft.com/en-us/windows/win32/etw/stackwalk-event) identify the original event timestamp, process and thread.

Use **`validated-publication/publication-resolved-stacks.json`** and **`validated-child/publication-resolved-stacks.json`** for the final stack results. Their adjacent `symbol-load-results.json` files record image hashes, CodeView identities, symbol hashes and validation. Available Microsoft PDBs resolve the kernel, NTFS, Filter Manager, fileinfo, ntdll and KernelBase frames. The official Node v24.19.0 symbol archive matches its published release checksum and the captured node.exe identity; it resolves the libuv worker frames. Trace image checksums match the examined on-disk images; available nonzero image timestamps match too (`classified-findings.json`).

Initial sandbox DNS failures are retained. Network-enabled retrieval subsequently succeeded for the available Microsoft symbols. Microsoft returned HTTP 404 for the requested gameflt and WdFilter PDB identities; later sandbox attempts remained unable to resolve their host. These modules retain image/offset references, not invented function names. Their missing public symbols do not establish absence or responsibility.

An intermediate validator incorrectly demanded equality between the image age and the PDB information-stream age. Its rejected outputs are retained. The final validator follows Microsoft's [PDB1::OpenValidate4 implementation](https://github.com/microsoft/microsoft-pdb/blob/master/PDB/dbi/pdb.cpp): matching GUID, PDB age at least the image age, and matching DBI age (or legacy zero). All loaded final PDBs pass that rule. Node symbols came from the official Node release archive; the generic resolver's Microsoft URL field for an already-cached Node PDB is not its download provenance (`node-symbol-download.json` records the actual source).

## Exact publication request

Affected root: `C:/Projects/Modular/.wp5-f-temp/builder-wp0-Qlokbm/apps/`. Source: `.creating-wp5e-created-0371b16e-9645-44a8-a070-2bf8d4b7f844`; destination: `wp5e-created`.

API PID **10116**, rename TID **10124**, IRP **`0xFFFFE1863769BA08`**, source file object **`0xFFFFE1863F61E080`**, file key **`0xFFFF8085F11EE180`**, information class **10**. The events are:

| Event | UTC time / FILETIME |
| --- | --- |
| Rename | 17:36:15.3747104 / 134369049753747104 |
| RenamePath, destination above | 17:36:15.3747688 / 134369049753747688 |
| OperationEnd, `0xC0000022` | 17:36:15.3747943 / 134369049753747943 |

The rename entry stack resolves through `MoveFileExW+0x1d` → `MoveFileWithProgressTransactedW+0x32f` → `NtSetInformationFile` → Filter Manager → `fileinfo!FIPreSetInformationCallback`. The operation-completion stack resolves through **`NtfsFsdSetInformation+0x155` → `NtfsCommonSetInformation+0xe4f` → `NtfsExtendedCompleteRequestInternal+0x247` → I/O completion → Filter Manager post callbacks → `fileinfo!FIETWLogOperationEnd+0xa4`**. The event's status is the observed access denial, not merely an inferred JavaScript EPERM translation.

`ntfs-common-set-information.asm.txt` shows that the return address **`0xFFFFF8063C79E4D3`** follows the call to `NtfsExtendedCompleteRequestInternal` at **`0xFFFFF8063C79E4CE`**. That is a common completion site, not a unique access-denial branch. The same static function contains a call to `NtfsSetRenameInfo` at `0xFFFFF8063C79DF80`; static code alone does not prove which internal branch executed. Disassembly used portable Capstone in a separate tools folder, without loading the NTFS driver for execution.

## Concurrent descendant stat: established operation, unproven denial predicate

Another API worker, **TID 14480**, issued a stat request for staging descendant **`shells/admin/shell.html`**. References are in `child-open-stacks.json`, its validated symbol output and `publication-context.csv`:

| Event | UTC time / FILETIME | Identity / result |
| --- | --- | --- |
| Create | 17:36:15.3747443 / 134369049753747443 | IRP `0xFFFFE186425560F8`, file object `0xFFFFE1863C9620F0`, share 7 |
| Create completion | 17:36:15.3747662 / 134369049753747662 | STATUS_SUCCESS, information 1 |
| QueryInfo, class 77 | 17:36:15.3747855 / 134369049753747855 | same object/IRP; completes successfully at .3747964 |
| Rename denial on TID 10124 | 17:36:15.3747943 | occurs before the query completes/cleans up |
| QueryInfo, class 34 | 17:36:15.3748130 / 134369049753748130 | same object, IRP `0xFFFFE1863BFA5738`; success at .3748256 |
| Cleanup | 17:36:15.3748701 / 134369049753748701 | success at .3748801 |
| Close | 17:36:15.3748937 / 134369049753748937 | success at .3749052 |

The entry stack is **`node!fs__stat_impl_from_path+0x66` → `uv__fs_work+0x6ad` → `KernelBase!GetFileInformationByName+0xd0` → `NtQueryInformationByName` → `IoQueryInformationByName` → object parsing/create → fileinfo pre-create**. This establishes a transient kernel file-object operation used for metadata lookup. No matching user `CreateHandle`/handle number appears for this object in the selected events; it must not be described as a leaked persistent user handle. Share 7 includes delete sharing, so this is not evidence of an ordinary missing-FILE_SHARE_DELETE conflict.

Microsoft's [directory rename algorithm](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-fsa/87f86c9b-6c2a-4803-84b7-131a74a434fa) includes an access-denial condition for remaining descendant opens. Its [open-descendant algorithm](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-fsa/133840e4-778e-44ca-9b41-da2323615075) examines surviving opens recursively after relevant oplock processing. The observed transient object overlaps a compatible rejection condition. These specifications do not prove that this particular internal stat operation occupied the relevant NTFS open list at the check, or that this was the executed rejection branch.

`src/server/watcher.ts:9–19` recursively scans the Applications root and stats files, skipping several generated directories but **not `.creating-*` directories**. It starts at API startup and repeats every 1500 ms. That is a supported candidate JavaScript source for this stat. The publication function has already awaited npm installation, service build and link rebasing; rebasing walks `node_modules` with readdir/readlink, not a shell.html stat. The native worker stack does not retain the JS async caller, so watcher attribution remains an inference. No source code is changed.

## Handle, process, reparse and filter assessment

`analyze-opens.py` correlates 5,543 scoped pre-rename Create requests with 192,457 related records, pairing completion only before another use of the same IRP and checking cleanup/reuse plus handle events. It initially found three candidates. `classified-findings.json` rejects two: they returned **STATUS_REPARSE (`0x104`)**, belonged to the already-exited npm process, and their later apparent handle events belong to recycled objects. The remaining confirmed user handle is the rename's own source handle **`0x354`**, share 7, opened successfully at .3729333 and closed at .3748884, followed by cleanup at .3749004. It is expected publication activity, not an attributed blocker.

That pre-rename candidate pass deliberately excludes opens beginning after Rename entry. The separate child analysis above captures the important stat that starts **during** the rename. The distinction explains why the earlier candidate lists missed it. Fifty-seven requests lacked an unambiguous completion under this selection rule; no absence-of-all-other-opens claim is made.

The recorded npm install process ended at 17:36:13.8584450 UTC. The service-build parent and recorded descendants ended before 17:36:15.3140883, about 60.6 ms before Rename entry. There is no demonstrated still-running npm/build child or shutdown leak at publication.

Reparse requests occurred during npm workspace-link access, but the failed operation is a class-10 rename of the staging root; no event proves a malformed junction or reparse target caused it. Requested/granted access masks, the exact security token/DACL decision and NTFS internal directory state are not present in these selected schemas. A permissions defect, destination-state conflict or another NTFS condition cannot be conclusively excluded.

Filter Manager and fileinfo appear as the observed logging/dispatch path. A later class-34 query during the descendant stat's close passes through **WdFilter image offsets**; this proves participation in that query, not responsibility for the preceding rename denial. Other modules in neighboring stacks likewise are not accused. There is no evidence-supported antivirus exception, filter disablement, external-process termination or security-setting change to recommend.

## Separate classification of WP4 and WP5-B failures

The diagnostic suite remains **493/496**, separate from the preserved historical **495/496** baseline. No rerun was performed here.

| Failure | Established boundary | Classification / next evidence |
| --- | --- | --- |
| WP4, test line 155 | Timed out after 15 seconds waiting for the exact stale-origin refusal message after adding a Form mode and returning from Dataset creation | Separate Builder stale-origin/link-feedback investigation warranted. It failed before the normal runtime Form persistence section, so it does not demonstrate renewed runtime value loss. No saved DOM/status, request trace or browser snapshot at this early failure establishes whether another refusal, pending navigation or stale-origin state caused the missing message. |
| WP5-B, saveVisual line 164, caller line 212 | After authoring a binding, Save Now did not become disabled within the poll budget | Separate save/autosave/contention investigation warranted. The retained server-output log records 42 graph-lock measurements for API PID 30620, a failed acquisition after 4999.6646 ms, successful waits up to 4914.8331 ms and holds up to 4001.1860 ms. Browser error list is empty. These establish contention but do not tie a specific request/lock attempt to the failed save condition; no request-correlated UI/save-state timeline was retained. |

The WP4 expected message is thrown only after several authorization/navigation/link checks (`src/client/builder-workspace/shell.ts:132–144`); a missing message alone cannot distinguish those paths. WP5-B's helper can also reach the final poll without a manual PUT when Save Now was initially disabled, so the failure is not proof of a rejected PUT. Do not assume either failure was caused by tracing. Do not alter graph-lock budgets or the reviewed Form correction based on this evidence. Future classification work should capture the particular UI status, save state and request outcome at failure; it is distinct from Windows publication diagnosis.

## Smallest next decision

No unconditional production fix is justified by this trace alone. The smallest **candidate** correction, if the descendant-stat explanation is confirmed, is to keep the workspace signature walker outside unpublished `.creating-*` Application trees while continuing to observe the published destination. This preserves the one atomic directory publication and does not require retries, delays, lock changes, security changes or child-process shutdown. It remains a proposal for separate authorization, with explicit published-refresh and creation/recovery verification required.

The smallest remaining causal investigation is a bounded observation of this specific rename plus descendant stat that identifies the JS request source and the NTFS denial predicate/open-list state. A Microsoft filesystem/debugger analysis targeted at `NtfsSetRenameInfo` and the transient `IoQueryInformationByName` object would distinguish the leading explanation from an access/directory-state alternative. Generic File I/O tracing alone may repeat the present ambiguity; another broad full-suite run would not fill those fields. Any new tracing, debugger attachment, instrumentation or controlled behavioral comparison requires separate authorization. None is undertaken here.

## Preservation and inventory

`builder-v1-wp5-f-eperm-root-cause-files.json` lists all new repository files, evidence and hashes, plus the separate portable-tool inventory. `preservation-check.json` verifies prior manifests including the retained 8.57-GB ETL and 29.34-GB CSV. All earlier reports and failed/successful evidence remain unchanged. Product source, tests, assertions, configuration, lock budgets, Form behavior and all 40 unchecked umbrella requirements are preserved. No commit, push, synchronization, preview/security work, WP5-G/WP6, acceptance or closure. **STOPPED AT D6 ROOT-CAUSE REVIEW.**
