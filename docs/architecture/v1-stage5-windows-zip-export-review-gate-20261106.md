# Stage 5 Windows ZIP Export Correction Review Gate

The portable export request and ZIP download both returned HTTP 200 in the complete corrected Windows journey. The downloaded archive opened and extracted successfully. Its 349 files matched the prepared export byte for byte, and the 46 included files from the selected frozen composition matched release A's recorded hashes.

UI Platform baseline `cc837601fc5775309d6daea6af179093b9bb6557`. Data Services dependency `d2525592eee4d6286537a7093510e59fd4c342f2`.

## Reproduction and correction

The baseline journey reproduced HTTP 500 from the authorized `POST /api/apps/wp5c-created/export`. It prepared 349 files and then received `ZIP command failed with exit code 1`. `zipFolder` rejected after the compressor exited. The application error handler turned that rejection into HTTP 500 before issuing a download URL. Streaming and browser download therefore never started on the failing request.

A separate probe ran the original compressor invocation on a one-file temporary directory. Windows PowerShell found `Compress-Archive` through inherited module discovery and raised `CouldNotAutoloadMatchingModule`. Explicit import by name exposed the underlying `PSSecurityException` with `UnauthorizedAccess`. The inherited module was the bundled PowerShell installation's Microsoft.PowerShell.Archive 1.2.6, whose script load the Windows PowerShell execution policy refused. Importing the Windows PowerShell system manifest under `$PSHOME` loaded version 1.0.1.0 under the same policy. On the same temporary input containing spaces and an apostrophe, the original command exited 1 and the corrected command exited 0 with a readable ZIP.

`src/server/exporter.ts` now imports the Windows PowerShell installation's own archive module by manifest path and invokes its module-qualified `Compress-Archive`. The production change is confined to compressor selection in the Windows branch. The existing ZIP implementation, staging tree, application ownership, export contents, route authorization, and download binding remain in use. The error is specific to the Windows compressor's inherited module discovery in this environment.

## Verification

| Run | Result |
| --- | --- |
| `before` | Existing journey completed with its historical ZIP exception. Export HTTP 500 and no downloadable archive. |
| `after-001` | Export and download reached HTTP 200. The new archive assertion rejected a legitimate empty directory because it only recognized directories with files. The journey stopped at that assertion. |
| `after-002` | Fresh complete uninstrumented journey passed in 93.625 seconds. The corrected test checks listed directories against the prepared directory inventory. |

Each run passed 68 focused Data WP3 tests. The final journey also exercised Builder controls, canonical Dataset identity, protected Form writes and reads, frozen publication A after draft B, Viewer restrictions, private asset metadata and bytes, and session, User and template revocation.

The final test fetched the response body from the real application download route and checked the ZIP content type, attachment disposition and content length. It matched the streamed bytes against the server archive, listed members with Windows `tar.exe`, checked member paths against the prepared tree before extraction, then compared all extracted file hashes. The 456,867-byte response had SHA-256 `00203e848761f1a08efa76136b67dcab0b8fe160986238291201633d0a1e830c`. The portable workspace includes current authoring files and included frozen release files under the existing package exclusions. All 46 included frozen composition files matched release A, and the selected release ID remained the same after export.

The extracted fixture archive passed checks for the private asset's bytes, private store and credential paths, private-key markers, SQLite signatures, database extensions and excluded build or dependency directories. An unrelated identity received 403 on export and on the valid download URL. Anonymous download received 401 and an invalid download token received 403. These are checks against the downloaded fixture archive and its application routes.

## Preservation and checkpoint

All 23 Component files, 234 native files, recorded dependency identities and 41 historical diagnostic paths passed hash verification. UI-Base and Data Services remained clean at their recorded revisions. The isolated runs reported no events on the original shared-lock directory and equal before/after snapshots. The final directory metadata matched the baseline and the lock body was never accessed.

The proposed checkpoint contains the exporter, two integration test files, this review record, the sanitized verification record, the run exclusion file and the hash inventory. Disposable runs, extracted contents, generated credentials and raw logs remain excluded. The index is empty. No commit or push occurred.

Historical `PLAN_EVIDENCE_STALE`, private-metadata and Viewer refusals, Form startup refusal and saved `field3` discrepancy remain separate and unresolved. The new run provides an independent success in its tested scope. Stage 5 and V1 remain open.
