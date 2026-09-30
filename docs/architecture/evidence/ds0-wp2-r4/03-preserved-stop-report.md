# DS0-WP2-R4 consolidated requirements review — G5 held

**Disposition: STOPPED FOR REVIEW. R4 verification is incomplete; final G5 acceptance is not recommended yet.**

## 1. Stop condition

The approved [requirements reconciliation, C2](ds0-wp2-readiness-requirements-reconciliation.md) requires:

> Use read-only runtime/definition health checks plus synthetic unscoped CRUD after admission to prove the selected schema is used.

The accepted implementation/tests establish genuine private **pre-admission** health probes, state promotion, qualified serving assertions and several public requests. They do not establish a successful authorized insert/update/delete sequence through the ordinary admitted endpoint of the activated host:

| Reviewed evidence | What it establishes | Why it does not complete C2 |
| --- | --- | --- |
| `packages/dataset-operations/tests/support/activation-host.ts:155` and `:163` | Authorized query/CRUD through the unchanged production handler on the private candidate listener; fresh ORM readers. | Requests use `privateUrl` before promotion and ordinary admission. |
| `packages/dataset-operations/tests/activation-http.test.ts:20` | Successful activation, receipt, qualified resolver, public `/health`, unsupported restore request and blocked trigger mutation. | Public health and rejection are not successful admitted CRUD. |
| Same file, `owned host drains a real query before releasing ownership or restarting` | An ordinary admitted query is tracked during shutdown. | No admitted insert/update/delete persistence sequence. |
| `packages/dataset-operations/tests/activation-drain.test.ts:26` | A real DOE insert and ignored nested insert remain in a standalone admission gate's drain after disconnect. | This deliberately separate fixture uses a no-op readiness callback and enabled triggers, not the activated host's real serving assertion; it also does not exercise update/delete. |
| R3 recovery and process tests | Narrow recovery, new private health receipts, fresh readers, qualified readiness and clean restart. | No additional ordinary admitted CRUD sequence. |

[R0 §6.2](ds0-wp2-r0-contract-design.md) explicitly puts private health before ordinary admission. That is compatible with C2 requiring additional post-admission verification; no reviewed decision explicitly waives that additional evidence. Reusing the same production handler is useful structural evidence but does not prove the full ordinary admission/serving boundary works for CRUD.

**C2 is therefore not fully established. This is an evidence gap, not a demonstrated runtime defect and not a reversal of scoped R1–R3 acceptance.** The user's instruction says: “If a genuine regression or unmet required criterion is identified, stop and report it for review.” Accordingly, no test, fixture, adapter, integration or production source was modified, and the fresh R4 runtime command sequence was not started. The remaining work in this report records the stop and preserves the accepted baseline; it does not silently add coverage or amend C2.

## 2. Accepted commits and current preservation

R3 already existed as a local commit. The [G4 acceptance record](ds0-wp2-r3-acceptance-record.md) records that all ten accepted R3 hashes match and no duplicate commit was created.

| Stage | Data Services commit / recorded baseline | Verification |
| --- | --- | --- |
| STAB-0 / B1 | `313b7e0c64e8e93f75632bb9dc015614d7709668` | Accepted provisioning baseline; confirmed ancestor of current HEAD. No implementation commit was required for provisioning. |
| STAB-1 / B2 | `577683840535e668c2000f24562702e7b51c6a0b` | Exact 13-file accepted commit inventory; ancestor. |
| STAB-2 / B3 | `d0aa1044b551086d2fbfaccf80357e7e6a5827dc` | Exact 10-file inventory; ancestor. Historical raw-checkout-byte caveat below. |
| STAB-3 / B4 | `9a6f0d5623863a8d44b879eda08316b0e3c79571` | Exact 8-file inventory; ancestor. |
| STAB-4 | Same D `9a6f0d5623863a8d44b879eda08316b0e3c79571` | Consolidated review, not another implementation; original report/register retained. |
| R1 / G2 | `07f11bc3ad16e249b97311be7641f1c91d48753e` | Exact 11-file inventory; ancestor. |
| R2 / G3 | `d866b86d1fd7f2807ee3708a593b164930df156e` | Exact 11-file inventory; ancestor. |
| R3 / G4 | `8b988af80ca5ce859a84791e4d63de5d00119a3b` | Exact 10-file inventory; current clean D HEAD. All ten reviewed raw hashes match. |

| Current repository | HEAD | Status at review |
| --- | --- | --- |
| Data Services | `8b988af80ca5ce859a84791e4d63de5d00119a3b` | `master`, clean, no staged changes. |
| UI Platform | `6e790b7acc9c7141d426ddfec4a8538709c26323` | `main`, initially clean; only new R4 review/evidence and R3 acceptance documentation added. |
| ui-base | `96898f73809272e680fcb3402f064a039fff4350` | `main`, clean. |

The [machine-readable review](evidence/ds0-wp2-r4/review.json) contains exact file SHA-256 values, Git blob hashes, reviewed interface hashes, repository status and commands. **94 current accepted Data Services files match exactly; 208 protected report/evidence artifacts match exactly.** No source, manifest, package version or dependency lock changed in R4.

| Lockfile | Preserved SHA-256 |
| --- | --- |
| Data Services | `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F` |
| UI Platform | `5E4A3F737256772D16427A4EB78B1E86336E8B11E4F555998BA76882DFC79EFA` |
| ui-base | `2A8BE906BE643F1DCBD2F33685ED5C3B711E99740F3D19CDB542276608A4673E` |

### Historical byte-hash qualification

Git blobs and tested Windows working files need not have identical line endings. The initial historical comparison could not match 13 recorded checkout hashes using Git bytes or uniform CRLF reconstruction alone. For twelve, exact preserved current bytes or an exact preserved prefix match the accepted checkout hash and normalize to the historical Git blob. Those are explicitly labeled representation comparisons, not byte-identical Git blobs.

The old STAB-2 `packages/dataset-operations/src/operation-manager.ts` checkout bytes could not be independently reconstructed by this method; STAB-3 subsequently changed that file. The accepted STAB-2 commit/inventory and its preserved acceptance record remain available, and current source matches the accepted R3 baseline, but a fresh historical raw-byte equivalence claim for that one file is **not established**. The review helper intentionally retains exit 1 for this unresolved historical check. No source regression or tampering is inferred from it. Original [comparison output](evidence/ds0-wp2-r4/01-review.txt) and [qualified comparison output](evidence/ds0-wp2-r4/02-reviewed-preservation.txt) are retained.

## 3. C1–C12 requirements-to-evidence matrix

“Historical evidence” means the accepted R1–R3 reports/logs and unchanged source inspected during this review. It is not a fresh R4 runtime pass. Criteria below other than C2 remain provisional for consolidated acceptance until the stopped validation sequence is completed.

| Criterion | Evidence and bounded conclusion | G5 status |
| --- | --- | --- |
| C1 — verified identity | R1 fingerprint/verification/resolver tests; R2 canonical selection and independent registration; R3 exact pin/mapping validation. No checksum-prefix trust upgrade. | Historical evidence supports the bounded criterion; fresh R4 rerun pending. |
| C2 — runtime activation | R2 ordered activation/private health/receipt/promotion/qualified serving and R3 recovery health are established historically. Successful CRUD through the ordinary admitted activated host is missing from the reviewed evidence. | **Not fully established — stop condition.** |
| C3 — publication versus applied | R2 clean restart revalidates the exact pinned version after a later active publication, fresh generation and unchanged applied bytes. No upgrade is inferred. | Historical evidence supports; fresh rerun pending. |
| C4 — authority isolation | R2 conflicting/extra UI Platform authority and shared/junction root rejection; isolated synthetic roots; original P migration implementation unchanged. | Historical scoped evidence supports; no claim about arbitrary external deployments or uninspected data roots. |
| C5 — failure before verification | R1 negative identity/definition tests; R2 preflight/auth/trigger rejection and raw inventories; R3 invalid journals never invoke recovery. Allowed owner/state deltas are distinguished from zero-write cases. | Historical evidence supports; fresh rerun pending. |
| C6 — activation/promotion interruption | R2 lost promotion acknowledgment, receipt/health failures and actual serving checks; R3 transition/write/rename faults and IPC-confirmed process kills. Stale ownership gates crash restart pending separately authorized operator action. | Historical evidence reviewed; fresh consolidated rerun and full criterion closure pending. No automatic crash recovery claim. |
| C7 — journal/recovery cases | R3 strict full invariants, before/next transitions, digest mismatch, malformed JSON/UTF-8, evidence retention, actual delegated write/rename failures and exact post-reconciliation byte comparison. | Historical evidence supports the G1-R narrow cases; fresh rerun pending. |
| C8 — operational recovery limits | Explicit same-pin applying/pending resume; applied restart without duplicate state transition; ambiguous/recovery-required/stale-lock cases remain blocked. | Historical evidence supports containment, not general repair; fresh rerun pending. |
| C9 — process/concurrency model | R2 lifetime owner/process restart; R3 ten real-process tests including six state/journal crashes and two reconciliation crashes, plus before/next contention/restart. Individual state locks are not claimed to cover the workflow. | Historical evidence supports the approved cooperative-owner topology only; fresh rerun pending. |
| C10 — durability claims | Windows process kills and deterministic I/O failures characterize uncertainty. No power-cut testing, writer fencing or atomic multi-file storage was implemented. | Limits remain explicit; stronger guarantees are excluded, not passed. |
| C11 — regression/preservation | Current 94-file/208-artifact hashes and locks match. Accepted R3 D build/typecheck/strict and 611 tests passed. R3 standard editor command failed twice; diagnostic alternatives remain separately labeled. | **Fresh R4 command sequence not run due to C2 stop.** One older raw-checkout hash remains unreconstructed. No blanket pass. |
| C12 — documented exclusions | No production trigger bridge, UI/P migration-state integration, upgrades, migrations, production security/audit completeness, arbitrary legacy recovery or deployment certification. All issue records remain open. | Documented and preserved; does not authorize the next milestone. |

## 4. Interface compatibility amendment

Inspected actual package entry points, exported types, implementation and working consumers before proposing any new verification:

- ORM `package.json` exports `dist/index.d.ts` and `dist/index.js`; `src/index.ts` exports `types.ts` and `json-file-orm.ts`.
- Exported `DatasetOrm.query(plan: OrmQueryPlan, transaction?: OrmTransaction): Promise<Record<string, unknown>[]>` takes a **query plan**, whose required property is `resource: DatasetReference`.
- `JsonFileDatasetOrm.query` is asynchronous, resolves registration using `plan.resource`, then loads/filters/projects rows and returns the promised record array.
- Corrected R3 fresh-reader code is exactly `await reader.query({resource:f.manifest.pin.reference})`; it agrees with that exported plan contract. Existing host health and drain consumers likewise pass `{resource, where?}` plans and await the result.
- No ORM signature, exported interface, test helper or integration was changed. The accepted R3 strict compilation covered this test and passed; its exact arguments and exit 0 remain in [R3 commands](evidence/ds0-wp2-r3/commands.json) and [strict log](evidence/ds0-wp2-r3/09-strict.txt). **Fresh R4 strict compilation is pending**, not claimed successful.

Any subsequently authorized C2 fixture must reuse these existing typed contracts/helpers and compile strictly before runtime execution. A fixture signature error must be corrected in the fixture, not by changing the established API.

## 5. Execution record and unique counts

This R4 stop-stage executed read-only Git status/log/show/ancestry/path comparisons, source/requirements inspection and the preserved hashing helper. The exact Git arguments and exits are in `review.json`. No runtime test suite, build, typecheck, install, service deployment or migration command was run after the C2 stop was identified.

| Required fresh R4 command | Status |
| --- | --- |
| Data Services build, typecheck, strict fixture compilation and full regression suite | Not run: explicit unmet-criterion stop. |
| UI Platform compatibility, typecheck, production and standard editor-contract commands | Not run: explicit unmet-criterion stop. |
| Bounded isolation of a fresh standard-command failure | Not applicable yet; no fresh standard command executed. |

Preserved **historical R3** results, not R4 results:

| Execution | Result |
| --- | --- |
| D build / typecheck / strict compilation | Passed. |
| D full tests | 611 unique cases across 21 files: 482 accepted pre-R3 + 68 recovery + 51 failure + 10 process tests. Earlier focused runs overlap. |
| P compatibility | 12/12 across two files. |
| P typecheck / production check | Passed; known production chunk-size warning retained. |
| P standard editor command, first execution | Exit 1: 102 passed, 1 failed / 103; consumer timeout and temporary-file cleanup error. |
| P same standard command, second execution | Exit 1: 101 passed, 2 failed / 103; consumer timeout/cleanup and watcher `EPERM`. |
| P isolated consumer / watcher files | 5/5 each; diagnostic executions. |
| P same 13-file editor selection, serialized | 103/103; diagnostic only, **not an equivalent standard-command pass**. |

The P selections contain 112 unique cases across 14 files because three schema-adapter cases overlap between the 12-case compatibility and 103-case editor selections. Retries, isolated files and serialized runs are not additional unique coverage. No fresh R4 pass count is asserted.

## 6. Open limitations retained

- `DS0-HTTP-QUERY-ERROR`: production query error can raise `ERR_HTTP_HEADERS_SENT`; only the development adapter contains it. No repair.
- `DS0-APPLIED-VALIDATOR`: duplicated R1/R2 validation still requires a separate shared-validator contract review. No refactor.
- UI Platform consumer timeout/cleanup failures: preserved as unresolved; no timeout/assertion/runner change to manufacture a standard pass.
- Windows watcher `EPERM`: retained as a known intermittent defect; isolated/serialized success does not close it.
- Non-atomic multi-file persistence, no writer fencing and no proven power-loss durability.
- Stale ownership/state locks and recovery-required/ambiguous states require separate operator authorization; no force unlock or automatic clearing.
- Legacy stores/external deployments remain unverified; no migration or new-format deployment.
- Separate applied-schema authorities, published-trigger/runtime-registration integration, production hosting and full record-scoped authorization remain outside this increment.
- Missing original DS0 plan and formal WP1 conditions remain missing; the approved bounded increment is not presented as the recovered original plan.

## 7. Decision needed to resume

Recommended next decision: explicitly authorize a **test-only C2 evidence increment**, followed by resumption of R4. Reuse the existing development activation fixture and real serving assertion; after `verified-serving`, perform authorized synthetic insert/query/update/query/delete/query through the ordinary listener, verify business outcomes and fresh ORM persistence, and preserve pinned identity/state/history. Inspect the actual request/ORM contracts first and strictly compile before running the new test. No production interface or behavior change is proposed.

Alternatively, explicitly amend C2 if pre-admission private health was intended to replace its post-admission CRUD requirement. That would be a requirement change, not evidence that the original C2 passed.

**Hold G5 acceptance.** Resume consolidated commands only after this evidence-gap review is resolved. R3 remains accepted and locally committed; R4 introduces documentation/evidence only. No next milestone, push, release, deployment, migration or unrelated repair is authorized by this report.
