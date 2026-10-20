# WP5-F — elevated Windows EPERM diagnostics

2026-10-19, America/New_York. Diagnostic-only authorization. No product, test, assertion or configuration change is authorized by this work. Stop at D6 diagnostic review; no implementation acceptance or closure.

## Elevation and collection

Windows UAC granted the capability helper an administrator token. `elevation-capability.json` confirms that token and successful WPR status/profile queries before collection. The recording helper separately confirmed elevation, refused to interfere with an existing recording, and started the validated `publication.wprp` profile. The actual UI suite retained its normal, non-administrator token, with no Node preload (`suite-context.json`).

One complete serial UI suite ran with retries disabled, unchanged assertions, no overlapping fixture run and all evidence redirected into this diagnostic directory. The custom WPR profile captures process/thread and image metadata, File I/O/name initialization, generic handles, and stacks for create/cleanup/close, rename/set-information, directory enumeration, query-information, operation completion and handle operations. Kernel collection is machine-wide; analysis is restricted to the affected staging/destination paths and correlated operations. Raw diagnostic files remain local and are not uploaded or synchronized.

Collection had a 20-minute limit and an 8-GiB temporary-file size stop threshold, polled every 500 ms. This is a stopping threshold, not an exact allocation bound or hard real-time guarantee. The recorder reports `target-publication-EPERM-observed`, not a time/size-limit stop. WPR saved `publication.etl` successfully (8,572,895,232 bytes), returned exit code 0 and confirmed no recording active afterward. The recorder interval was 13:32:15–13:37:34; the end timestamp includes WPR merge/save time and is not a separately measured stop-request timestamp.

## Recurrence under the actual workload

The diagnostic full run is **493/496 — NOT PASSED** (`ui-diagnostic.json`). It records:

- WP4: a timeout waiting for the existing “Origin changed. No link was made.” message, before normal runtime persistence.
- WP5-B: the existing `saveVisual` UI condition did not become true. No assertion was changed or retried.
- WP5-E: **the target Application creation EPERM recurred at the same assertion and unchanged publication rename**.

The failing source is `C:/Projects/Modular/.wp5-f-temp/builder-wp0-Qlokbm/apps/.creating-wp5e-created-0371b16e-9645-44a8-a070-2bf8d4b7f844`; destination is the sibling `wp5e-created`. The API reports `applications.ts:176`, and the test receives 500 instead of 201 at `builder-v1-wp5-e-browser.test.ts:80`. Installation and service build completed before the rejected rename. The complete failure output is retained in `ui-diagnostic.log` and JSON, separate from all earlier failures and successes.

Tracing can perturb scheduling. The additional UI failures are observations, not proof that the trace caused them. This diagnostic run does not replace the historical 495/496 record, revoke the reviewed Form correction or constitute a new acceptance claim.

## Trace analysis

Native Windows TraceRpt exports the saved ETL only after suite completion, with a separate 15-minute export bound and 64-GiB CSV-size stopping threshold. The normal-token `Get-WinEvent` read failed with an unauthorized-operation error; that attempt is recorded separately. No further recording is started for analysis. The CSV/schema/summary are local intermediate diagnostic evidence; `scope-trace.py` restricts initial selection to this exact fixture root and Application staging/destination names.

TraceRpt reports 32,703 buffers, 38,706,981 events and zero lost events. The buffer count times the configured 256-KiB buffer size equals the saved ETL length. The exporter completed its decode and produced the final summary; its wrapper did not retain a numeric process exit code (`exitCode: null`). Completion is supported by the artifacts, not an invented exit-code claim. Its displayed progress exceeded 100 percent and is not used as a completion metric.

The exact publication request is correlated by IRP, thread and adjacent timestamps in `rename-irp-events.json`:

| Observation | Value |
| --- | --- |
| API process / issuing thread | node.exe PID 10116 / TID 10124 |
| Rename event, UTC | 2026-10-19 17:36:15.3747104 |
| RenamePath destination event, UTC | 2026-10-19 17:36:15.3747688 |
| Completion, UTC | 2026-10-19 17:36:15.3747943 |
| IRP | `0xFFFFE1863769BA08` |
| File object / file key | `0xFFFFE1863F61E080` / `0xFFFF8085F11EE180` |
| Information class | 10 |
| Completion status | decimal 3221225506, hexadecimal `0xC0000022` (`STATUS_ACCESS_DENIED`) |

This establishes the Windows denial of the actual directory publication operation, rather than only its JavaScript EPERM translation. Microsoft documents the status mapping in its [STATUS codes reference](https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-samr/7440cfac-6052-4925-84e4-c32e417de300). It does **not** establish which access check, filesystem state or component caused the denial. In particular, an access-denied status is not proof of an incompatible share-mode handle or a persistent permission defect.

The source root open associated with this file object requested share access 7 (read/write/delete sharing). The capture includes scoped CreateFile requests and directory enumerations, cleanup/close and handle events, process lifetimes, and raw stack events. `target-path-events.csv`, `root-directory-opens.json` and `object-lifetimes.csv` preserve the selected records. The exported Create event provides create options, attributes and share access; it does not provide a complete desired-access/security-decision explanation.

The process timeline (`related-process-identities.json`) shows npm install PID 34916 ending at 17:36:13.8584450 UTC. The service-build parent PID 11944 ended at 17:36:15.3140883 UTC; its recorded descendants also ended before publication. These findings do not support attributing this recurrence to a still-running npm/build child or prescribing a shutdown workaround. They do not rule out all delayed kernel activity or other filesystem conditions.

No responsible blocking handle has been causally identified. The preliminary non-delete-sharing candidate list is **not a list of live blockers**: it uses cleanup/reuse as an upper bound, includes unsuccessful/reparse opens and recycled file-object addresses, and its apparent overlaps belong to the already-exited npm process. Handle-close and process-end records invalidate treating those candidates as proof. No antivirus, watcher or other process is blamed.

### Analysis corrections and limits

All intermediate attempts remain preserved. The first scoping script had a syntax error before reading the trace; its correction and preflight failure are recorded. The first completion selector looked for `OpEnd`; the actual exported event name is `OperationEnd`. The subsequent exact-IRP extraction supplies the completion above; the earlier empty `rename-completions.csv` is not evidence of a missing completion. IRP addresses are rapidly reused, so the full extracted list must be correlated by thread, operation and adjacent timestamps, not address alone.

The coarse candidate correlation selected FILETIME prefixes covering 17:36:00–17:36:19 UTC; its original narrower scope description is inaccurate. Only the exact publication timestamps above support the denial finding. Raw stack events are retained, but symbol-resolved stack attribution and a complete security/filter decision chain have not been established. Zero reported event loss does not eliminate those schema and analysis limits. The trace therefore reproduces and localizes the failure but does **not resolve its historical root cause**.

## Recommendation at diagnostic review

Keep D6 implementation acceptance blocked. There is no evidence-supported production correction to propose yet. Do not add retries, delays, longer graph-lock budgets, relaxed assertions or process shutdown changes. Further work should first inspect the retained ETL in a stack-capable Windows analyzer and, if necessary, obtain a narrowly scoped filesystem/security diagnostic explaining this specific access denial. Any new collection or architecture change requires a subsequent decision; no further tracing is started here.

## Preservation and boundaries

This phase changes only new diagnostic documentation, scripts and evidence. `builder-v1-wp5-f-elevated-eperm-files.json` gives the exact inventory and hashes; `preservation-check.json` records comparison with prior manifests. Product code, tests, assertions, configuration, prior evidence, graph-lock budgets, reviewed Form behavior and the 40 unchecked umbrella requirements are preserved. The historical 495/496 baseline remains intact. No commit, push, GitHub synchronization, focused preview/security implementation, WP5-G/WP6 work, D6/WP5-F/WP5-I acceptance or closure. **Stopped at D6 diagnostic review.**

The profile follows Microsoft's [WPR provider definitions](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/2-system-and-event-provider-definitions); installed WPR validated every selected keyword/stack before recording (`profile-validation.txt`).
