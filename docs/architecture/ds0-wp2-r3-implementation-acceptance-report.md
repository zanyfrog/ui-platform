# DS0-WP2-R3 implementation and acceptance report

Date: September 29, 2026 (America/New_York; final diagnostic execution crossed September 30 UTC). **Gate G4 — awaiting explicit user review.**

## 1. Outcome and authorization boundary

R3 implements read-only diagnostics and the narrowly approved guarded recovery path for the isolated development host. Data Services build, typecheck, strict compilation and **611 tests across 21 files pass**. This includes all 482 accepted STAB/R1/R2 tests and 129 new R3 tests. Real ORM/I-AM/DOE composition, the unchanged production request handler, fresh readers and actual child processes are exercised.

UI Platform compatibility, typecheck and production checks pass. Its standard editor-contract command **failed twice**: an unchanged consumer-contract test exceeded its existing five-second timeout; the second run also reproduced the known Windows watcher `EPERM`. Both files passed individually. The identical 13-file editor test selection passed **103/103** with file-level parallelism disabled, without changing source, assertions or timeout settings. This diagnostic pass does not turn the standard command into a pass or close either limitation.

R3 is uncommitted. No R4, migration, deployment, release, push, schema upgrade, production hosting, published-trigger activation or UI Platform migration-state bridge was implemented. No state/journal format, digest algorithm, package version or dependency lock changed. No existing definition store was deployed to or migrated.

## 2. Accepted R2 baseline and repository review

The accepted R2 implementation was already committed locally as `d866b86d1fd7f2807ee3708a593b164930df156e` (`WP2-R2 is implemented`), parent `07f11bc3ad16e249b97311be7641f1c91d48753e`. Its exact eleven-file set and all eleven accepted working-file hashes matched the R2 evidence before R3 edits. No duplicate commit was created. See the [G3 acceptance record and two open follow-ups](ds0-wp2-r2-acceptance-record.md), [before snapshot](evidence/ds0-wp2-r3/before.json) and [preservation manifest](evidence/ds0-wp2-r3/preservation.json).

| Repository | Recorded and final HEAD | Status / preservation |
| --- | --- | --- |
| Data Services | `d866b86d1fd7f2807ee3708a593b164930df156e` | Initially clean; final ten scoped R3 files, unstaged and uncommitted. |
| UI Platform | `1037ebe43c5e0a636945b8dcc069bc4fc79e8f5f` | No tracked source diff; new acceptance/report/evidence documents only. |
| ui-base | `96898f73809272e680fcb3402f064a039fff4350` | Clean; unchanged. |

All 87 pre-existing tracked Data Services files were checked: **84 whole files unchanged**, README and index original byte prefixes preserved, and one intentional controller edit. All original tests, R1 verifier/resolver/fingerprint files, R2 owner/eligibility/host files, production HTTP handler and DOE/I-AM/ORM implementations remain unchanged. **173 protected prior evidence/report files match, zero mismatches.** The exact source hashes and original-prefix checks are in the preservation manifest.

Unchanged SHA-256 lockfile hashes:

| Repository | `package-lock.json` |
| --- | --- |
| Data Services | `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F` |
| UI Platform | `5E4A3F737256772D16427A4EB78B1E86336E8B11E4F555998BA76882DFC79EFA` |
| ui-base | `2A8BE906BE643F1DCBD2F33685ED5C3B711E99740F3D19CDB542276608A4673E` |

## 3. Implemented contracts and recovery boundaries

### Read-only diagnosis

`ActivationDiagnostics.inspect(domain, pin?)` directly observes file inventories, raw-byte hashes, JSON syntax, state phase, lock presence and optional provisional journal eligibility. It neither creates directories/locks nor calls `snapshot`, `recoverState` or `withExclusive`. Tests make these mutating store APIs throw if called during inspection. Results explicitly say `non-atomic-observation`, `not-certified` and `requires-independent-runtime-verification`. A lock's presence never implies PID-based liveness, expiry or permission to take over. Invalid UTF-8, duplicate JSON keys and unsupported structures cannot qualify for recovery. Public diagnostics omit payloads and owner tokens.

### Explicit owned reconciliation

`ActivationController.recoverAndResume(pin)` is additive. Ordinary R2 first activation and restart retain their rejection of journals. The new path acquires and retains the accepted root owner, closes admission, drains work, then independently checks:

- Strict journal format, transaction ID, timestamps, existing SHA-256 grammar and recomputed next-state digest using unchanged insertion-order `JSON.stringify` hashing.
- Exact environment and complete pinned identity, one supported target record, valid phase-specific fields, no recovery gate or unexplained properties.
- Recognized verification tag/fingerprint and a complete unique field mapping that matches independently configured actual ORM registration and the verified canonical publication. A matching stored checksum alone is insufficient.
- Unique linked ledger entries, exact ordered phases, timestamp links, valid detail types and no missing, repeated or orphaned entries.
- For before-matching journals: exactly one supported transition, unchanged ledger prefix and unchanged identity/other record fields except the approved transition patch and timestamps.
- For next-matching journals: current and next are structurally equal and satisfy full final-state invariants. The absent preimage is **not** reconstructed or certified.
- Applied metadata has the approved activation tag/receipt grammar; referenced receipt bytes must match their digest. This remains eligibility evidence, not a substitute for fresh runtime health.

Only after those checks does the controller retain original state/journal/owner bytes, hashes and inventory in an exclusively created, synced and read-back `ds0-recovery-evidence-v1` evidence file. This is a new diagnostic artifact in the existing evidence root, not a change to persisted state or journal formats. It includes private coordination evidence and must remain local to the isolated host/operator.

Ownership, closed admission and byte observations are checked again before calling the **unchanged** store `recoverState`. Post-call inspection requires that only the journal disappeared and state/owner bytes remain identical. There is no nested acquisition of the non-reentrant state lock and no claim that individual state calls protect the workflow. The accepted cooperative owner supplies that limited protection; uncooperative direct callers remain excluded.

The resulting state, exact pinned publication and actual ORM are revalidated. Applying resumes retain their operation ID and perform verification; pending resumes preserve existing verification and reject disagreement; applied restarts do not append another applied transition. Every successful path reruns the authorized seven-step production-handler health sequence, checks fresh-reader persistence and retains a fresh health receipt before ordinary admission opens.

| Observed condition | Implemented action / result |
| --- | --- |
| Before-matching valid journal | Preserve evidence; remove the uncommitted journal through the existing algorithm. Never install its nextState. Resume the observed current phase. |
| Next-matching valid journal | Preserve evidence; remove the redundant journal. Revalidate and resume/restart the observed current phase. |
| No journal, exact supported applying/pending/applied state | Explicit owned resume/restart; no duplicate begin or applied transition. |
| Ambiguous/corrupt/unsupported journal, recovery-required state, orphan temporary file | Block; preserve existing bytes. |
| Present owner or state lock, including after process death | Block; diagnostics remain read-only. No force unlock, automatic clearing or PID takeover. |
| Reconciliation/state-write exception or lost acknowledgment | `stateWriteOutcome=unknown`, admission closed, owner/evidence retained. No automatic retry. |
| Unknown ORM probe commit | Preserve DOE unknown outcome and persisted footprint; stop further probes. No rollback, replay, speculative cleanup or retry. |
| Changed publication/ORM/owner/state, failed evidence or health | Block; do not certify serving. A completed reconciliation alone is not activation success. |

## 4. Exact changed files

Paths are relative to Data Services. Full SHA-256 values are recorded per file in [preservation.json](evidence/ds0-wp2-r3/preservation.json).

| File | Change |
| --- | --- |
| `packages/schema-application/src/diagnostics.ts` | New direct read-only observations and public diagnostic findings. |
| `packages/schema-application/src/journal-validation.ts` | New independent R0 invariant validation, original-byte evidence retention and unchanged-algorithm digest comparison. |
| `packages/schema-application/src/activation-controller.ts` | Explicit guarded recovery/resume; revalidation; an ownership check immediately before pending transition. Existing first/restart paths preserved. |
| `packages/schema-application/src/index.ts` | Add diagnostic exports only; original store source retained byte-for-byte as a prefix. |
| `packages/schema-application/README.md` | Append R3 contract and limitations. |
| `packages/dataset-operations/tests/recovery.test.ts` | 68 read-only, before/next, resume, invariant and preservation tests. |
| `packages/dataset-operations/tests/recovery-failures.test.ts` | 51 evidence, I/O, uncertainty, revalidation and write/rename failure tests. |
| `packages/dataset-operations/tests/recovery-process.test.ts` | 10 deterministic real-process crash, contention and restart tests. |
| `packages/dataset-operations/tests/support/r3-fixtures.ts` | Capture genuine store transitions and real health receipts in temporary synthetic roots. |
| `packages/dataset-operations/tests/support/recovery-child.ts` | Test-only IPC barriers around real state/journal writes and reconciliation. |

The separate R1/R2 validator duplication has not been refactored. R3's journal validator is a narrow independent recovery boundary, not an approved shared-validator redesign.

## 5. Commands, test evidence and count reconciliation

Actual checkout execution used Node **v24.19.0** and the approved local **npm 10.8.2** CLI at `C:/Users/zanyf/AppData/Local/Temp/ds0-stab0-npm-10.8.2/package/bin/npm-cli.js`, including the preserved shim for nested npm calls. The trace records **27 npm invocations, all 10.8.2**. No dependency installation, global npm change, version change or lockfile rewrite occurred.

Exact executable paths, arguments, working directories, start/end times and exits are in [commands.json](evidence/ds0-wp2-r3/commands.json), [retry commands](evidence/ds0-wp2-r3/retry-commands.json), [isolated commands](evidence/ds0-wp2-r3/isolated-commands.json) and [serialized diagnostic command](evidence/ds0-wp2-r3/serial-command.json). `run.cjs` and the other retained runners reproduce the selections.

| Execution | Result / evidence |
| --- | --- |
| D `node npm-cli.js run build` | Exit 0 — [build](evidence/ds0-wp2-r3/07-build.txt). |
| D `node npm-cli.js run typecheck` | Exit 0 — [typecheck](evidence/ds0-wp2-r3/08-typecheck.txt). |
| D `tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext` with R1/R2/R3 and STAB consumer/security fixtures | Exit 0 — [strict](evidence/ds0-wp2-r3/09-strict.txt); exact 14 entry files in command manifest. |
| D `vitest run` | **611/611, 21 files**, exit 0 — [full regression](evidence/ds0-wp2-r3/10-full-tests.txt). |
| P `vitest run` schema-adapter compatibility + migrations-deployment | **12/12, 2 files**, exit 0 — [compatibility](evidence/ds0-wp2-r3/11-platform-focused.txt). |
| P `node npm-cli.js run typecheck` | Exit 0 — [typecheck](evidence/ds0-wp2-r3/12-platform-typecheck.txt). |
| P `node npm-cli.js run check:editor-production` | Exit 0; known large-chunk warning retained — [production](evidence/ds0-wp2-r3/13-platform-production.txt). |
| P standard `check:editor-contracts`, initial run | **102 passed, 1 failed / 103**, exit 1 — [initial](evidence/ds0-wp2-r3/14-platform-contracts.txt). Consumer timeout; subsequent temporary-file `ENOENT`. |
| Same standard editor command, unchanged retry | **101 passed, 2 failed / 103**, exit 1 — [retry](evidence/ds0-wp2-r3/retry-14-platform-contracts.txt). Consumer timeout/cleanup `ENOTEMPTY`; known watcher rename `EPERM`. |
| Unchanged consumer file individually | **5/5**, exit 0 — [consumer diagnostic](evidence/ds0-wp2-r3/17-consumer-isolated.txt). |
| Unchanged watcher file individually | **5/5**, exit 0 — [watcher diagnostic](evidence/ds0-wp2-r3/18-watcher-isolated.txt). |
| Same 13 editor files with `--no-file-parallelism` | **103/103**, exit 0 — [serialized diagnostic](evidence/ds0-wp2-r3/19-platform-contracts-serial.txt). No test or timeout changes. |
| Original source/evidence and Git review | No unexpected differences, no staged source, unchanged locks — [preservation](evidence/ds0-wp2-r3/16-preservation.txt). `git diff --check` passes; LF/CRLF advisories only. |

Unique D count: **482 accepted + 68 + 51 + 10 = 611**. Earlier focused runs overlap the final suite; they are not additional unique tests. P's 12 compatibility cases overlap three of the 103 editor cases, yielding **112 distinct selected cases across 14 files**, not its entire test suite. Retries and isolated/serialized diagnostics are repeated executions. There is no single successful standard parallel editor command in this R3 record.

### Initial failures and corrections retained

- Initial R3 focused execution: **51 passed, 6 failed / 57**. The six successful-recovery scenarios reached a test fresh-reader assertion that used the wrong ORM query signature. Corrected it to the existing query-plan interface; no ORM contract change. [Initial test log](evidence/ds0-wp2-r3/02-initial-focused.txt).
- Initial test strict compilation found two harness errors: that query signature and a fixture union narrowing. Both corrected. [Strict diagnostics](evidence/ds0-wp2-r3/03-test-strict.txt).
- Expanded execution: **76 passed, 8 failed / 84**. Node's ESM filesystem namespace could not be spied upon directly. A test-only Vitest delegating wrapper corrected fault injection; no production fault hook. [Expanded initial log](evidence/ds0-wp2-r3/05-expanded-focused.txt).
- Corrected focused executions passed **92/92**, then **127/127**. Two further reconciliation process-crash tests bring the final R3 selection to 129, all included in the passing 611-test full run. [92 tests](evidence/ds0-wp2-r3/07-focused.txt), [127 tests](evidence/ds0-wp2-r3/09-expanded-focused.txt).
- Initial preservation helper referenced an incorrect property name in the prior manifest. It failed without source mutation; corrected to `evidenceChecks`. The original [failure](evidence/ds0-wp2-r3/15-preservation.txt) and [successful verification](evidence/ds0-wp2-r3/16-preservation.txt) are retained.
- UI Platform failures were not repaired or suppressed. Isolation and serialized success suggest execution-concurrency sensitivity for the consumer timeout, but do not establish its cause or a complete fix. It remains a newly observed validation limitation, separate from the previously documented watcher defect.

## 6. Failure and preservation evidence

- All six before/next combinations across empty→applying, applying→pending and pending→applied execute successfully with real production-handler probes, exact evidence-byte copies, fresh-reader checks and preserved publication/ORM inventories. Before-matching does not install nextState; applied restart preserves original state bytes.
- Invalid identities, digests, formats, timestamps, fields, mappings, phases, ledger links/prefixes, duplicate keys, invalid UTF-8, unknown properties, recovery gates, state locks and orphan temporary files cannot call `recoverState`. Rejected existing inventories/bytes remain identical apart from the explicitly authorized owner sidecar.
- Evidence open/write/sync/readback failures and changes to state/journal/owner/admission after capture block reconciliation. Partial evidence is retained rather than cleaned up.
- Reconciliation exceptions both before and after actual removal remain unknown and non-retriable. Publication, observed ORM, health and promotion failures after reconciliation keep admission closed.
- A real persisted ORM commit with a deliberately lost acknowledgment yields the accepted unknown outcome, one commit attempt, no subsequent update/delete and no cleanup. A fresh reader observes the retained synthetic row.
- Twelve transition-level interruptions and 24 delegated filesystem write/rename interruptions cover applying, pending and applied boundaries, including lost acknowledgments and orphan temporary files. Diagnostics do not remove the resulting evidence.
- Six actual process kills occur at IPC-confirmed journal/state-write boundaries with state locks held. Two additional kills surround validated reconciliation. A competing process cannot acquire ownership or mutate files before or after the crash; raw inventories are compared. Separate two-process before/next recovery tests prove serving-lifetime exclusion and clean same-version restart with a fresh generation and unchanged applied bytes.
- Test fixture disposal occurs only after its owned child processes exit. It is disposable test teardown, not a production unlock or successful stale-lock recovery feature. No crash test claims to simulate machine power loss.

## 7. Remaining limitations and G4 decision

| Issue | Disposition |
| --- | --- |
| Multi-file ORM persistence, fsync durability, fencing and arbitrary concurrent writers | Unchanged. Unknown commits remain unknown. Cooperative root ownership is not a storage transaction redesign or fencing mechanism. |
| Stale ownership/state locks and recovery-required states | Deliberately blocked; any operator reclamation or state repair requires separate approval. |
| Legacy histories / external deployments | No activation, migration or certification added. External deployments remain unverified. |
| Missing journal preimage / provenance | Next-matching recovery validates final state, not erased history or cryptographic provenance. Isolated ownership assumptions remain essential. |
| Evidence durability | Exclusive write, sync and readback are tested; directory-entry durability and machine power-loss guarantees are not established. Diagnostic copies include private coordination evidence. |
| Direct legacy store APIs | Existing mutating snapshot/recovery behavior is unchanged. The new guard applies to the controlled host, not arbitrary direct callers. |
| Production query-error `ERR_HTTP_HEADERS_SENT` | Open follow-up `DS0-HTTP-QUERY-ERROR`; contained only by the accepted development adapter. No production repair. |
| Duplicated R1/R2 validation | Open follow-up `DS0-APPLIED-VALIDATOR`; a shared-validator contract review remains separate. |
| UI Platform standard editor validation | Standard command failed twice; isolated files and serialized 103-case selection passed. Consumer timeout/cleanup errors require separate investigation. |
| Windows watcher `EPERM` | Reproduced on the unchanged standard retry. Individual and serialized passes do not close it. |
| Applied-schema authority / published trigger bridge / production hosting | No authority bridge or published-trigger registration implemented. Enabled target triggers remain rejected; central runtime registry preserved. |
| Scoped writes, upgrades and migration | Accepted STAB-3 containment remains; full record-scope evaluation, upgrades and physical migrations remain separate work. |
| Missing original DS0 plan/WP1 criteria | Still missing. This is the separately approved bounded WP2 increment, not a reconstruction of missing approval. |

**G4 recommendation:** review R3 for scoped acceptance with the explicit UI Platform standard-command limitation above. Data Services implementation and regression criteria pass; blanket cross-platform validation success is not claimed. Preserve B1–B4 scoped closures and all unresolved limitations. R3 remains uncommitted pending the user's decision. Do not automatically begin R4, commit R3, push, release, deploy or migrate data.
