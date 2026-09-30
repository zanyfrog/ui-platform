# DS0-WP2-R4 consolidated verification and G5 acceptance report

September 29, 2026, America/New_York (execution timestamps use UTC September 30). **STOP AT G5 — awaiting explicit user acceptance.**

## 1. Recommended disposition

Recommend accepting the bounded development-checkout WP2 increment with the limitations below. The specifically authorized C2 test-only increment establishes successful CRUD through the ordinary admitted listener after real controlled activation. All fresh standard verification commands passed:

- Data Services build, typecheck, strict compilation and **616 tests / 21 files**.
- UI Platform selected compatibility **12 tests / 2 files**, typecheck, production check, and the **standard editor-contract command: 103 tests / 13 files**.
- No diagnostic alternative was needed for this R4 execution.

The two failed **R3** standard editor-command executions remain failures. Their isolated and serialized passes remain diagnostic evidence, not equivalent standard-command passes. The fresh R4 standard pass does not close the consumer timeout/cleanup defect or Windows watcher EPERM.

There was no production change or interface change. Only five tests were appended to the existing activation integration test. No new R4 change is committed. No next milestone, release, push, deployment, data migration, schema upgrade, published-trigger bridge, validator refactor or additional recovery feature was performed.

The earlier C2 stop remains preserved verbatim as [the stop report](evidence/ds0-wp2-r4/03-preserved-stop-report.md), SHA-256 `29A153B763589C22FDF816D91C09D820F2631A3FEA345BDB20548DFF23683260`. The user's subsequent explicit authorization permitted this limited test increment and resumption of R4; C2 was not waived or rewritten.

## 2. Baselines, commits and preservation

The accepted R3 commit already existed. Its exact ten paths and all ten reviewed working-file hashes matched before R4 changes; no duplicate commit was created. See [G4 acceptance record](ds0-wp2-r3-acceptance-record.md).

| Accepted stage | Data Services commit / baseline | Reconciliation |
| --- | --- | --- |
| STAB-0 / B1 | `313b7e0c64e8e93f75632bb9dc015614d7709668` | Accepted provisioning baseline; ancestor of current HEAD. |
| STAB-1 / B2 | `577683840535e668c2000f24562702e7b51c6a0b` | Exact accepted 13-file commit set; ancestor. |
| STAB-2 / B3 | `d0aa1044b551086d2fbfaccf80357e7e6a5827dc` | Exact accepted 10-file commit set; ancestor. Historical raw-byte qualification retained below. |
| STAB-3 / B4 | `9a6f0d5623863a8d44b879eda08316b0e3c79571` | Exact accepted 8-file commit set; ancestor. |
| STAB-4 | Same D `9a6f0d5623863a8d44b879eda08316b0e3c79571` | Consolidated review, not another implementation; report and unresolved register preserved. |
| R1 / G2 | `07f11bc3ad16e249b97311be7641f1c91d48753e` | Exact accepted 11-file commit set; ancestor. |
| R2 / G3 | `d866b86d1fd7f2807ee3708a593b164930df156e` | Exact accepted 11-file commit set; ancestor. |
| R3 / G4 | `8b988af80ca5ce859a84791e4d63de5d00119a3b` | Exact accepted 10-file commit set; current D HEAD. |

| Repository | Exact current HEAD | Final scope/status |
| --- | --- | --- |
| Data Services, `C:\Projects\Modular\UI Platform Data Services` | `8b988af80ca5ce859a84791e4d63de5d00119a3b` | master; one unstaged test-file change, no new files or commits. |
| UI Platform, `C:\Projects\Modular\ui-platform` | `6e790b7acc9c7141d426ddfec4a8538709c26323` | main; review/report/evidence documentation only; no tracked source change. |
| ui-base, `C:\Projects\Modular\ui-base` | `96898f73809272e680fcb3402f064a039fff4350` | main; clean. |

[Initial commit/source review](evidence/ds0-wp2-r4/review.json) and [final preservation manifest](evidence/ds0-wp2-r4/final-preservation.json) record exact inventories and SHA-256 values. Of 94 accepted Data Services files, **93 remain entirely byte-identical**, and the modified test's **complete original byte prefix is preserved**. All production implementations, interfaces, fixtures, adapters, existing test assertions and package manifests are unchanged. **208 prior report/evidence artifacts match**, with zero mismatches. All staged sets remain empty.

| Lockfile | Unchanged SHA-256 |
| --- | --- |
| Data Services | `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F` |
| UI Platform | `5E4A3F737256772D16427A4EB78B1E86336E8B11E4F555998BA76882DFC79EFA` |
| ui-base | `2A8BE906BE643F1DCBD2F33685ED5C3B711E99740F3D19CDB542276608A4673E` |

### Historical STAB-2 qualification — still unresolved

The initial historical comparison could not match 13 tested checkout hashes using Git bytes or uniform CRLF reconstruction alone. For twelve, exact preserved current bytes or an exact prefix match the accepted hash and normalize to the historical Git blob. These are explicitly representation comparisons, not assertions of identical Git/checkout bytes.

The original STAB-2 `packages/dataset-operations/src/operation-manager.ts` raw checkout bytes have **not** been independently reconstructed; STAB-3 later changed the file. Its accepted commit, exact inventory and original acceptance record remain preserved. Current source matches the accepted baseline and fresh transaction tests pass, but neither fact substitutes for independent historical raw-byte equivalence. The old review helper's exit 1 and this qualification remain retained. No tampering or runtime regression is inferred. See [initial comparison](evidence/ds0-wp2-r4/01-review.txt) and [qualified comparison](evidence/ds0-wp2-r4/02-reviewed-preservation.txt).

## 3. Interface inspection before test changes

Inspected actual package exports, TypeScript types, implementations and working consumers before writing the C2 tests. Hashes of these reviewed files are in `interfaceInspection` in the final manifest.

| Boundary | Confirmed existing contract and use |
| --- | --- |
| ORM | Package exports emitted `dist/index.d.ts` / `dist/index.js`; source index exports types and JsonFileDatasetOrm. `query(plan: OrmQueryPlan, transaction?: OrmTransaction): Promise<Record<string, unknown>[]>` requires `plan.resource`. Registration is synchronous; observed-definition lookup is asynchronous. |
| DOE | Source/package entry exports request/result types and manager. `execute(request, parent?, transaction?)` returns a promised DatasetOperationResult; public external ownership remains rejected. `query(DatasetQueryRequest)` returns promised rows. Write results preserve optional public commitOutcome/unknown-count types, populated by the repaired manager. |
| I-AM | Entry exports actor, authorization request/decision, policy service and policy store. `authorize(AuthorizationRequest)` is asynchronous; allowed, fields and absence of recordScope are checked using the real persisted synthetic grant. |
| Production request handler | Existing internal composition factory returns a RequestListener implemented asynchronously. Its ordinary write route serializes the DOE result; query route returns a row array. The established development gate awaits the returned promise and performs the actual qualified-serving assertion. No invented query result envelope. |
| Activation host | Existing typed HostManifest, activationFixture and DevelopmentActivationHost reused without modification. `listen()` returns the ordinary URL; `activateFirst(pin)` returns a readiness result; `resolveQualified()` verifies the real serving state. No no-op assertion or private listener substitution. |

The corrected R3 fresh-reader call remains `await reader.query({resource:f.manifest.pin.reference})`, consistent with the actual exported query-plan interface. New fresh-reader queries explicitly use `OrmQueryPlan`; HTTP requests/results use exported DOE types and authorization requests use the I-AM type. No established API was adjusted to make a fixture compile.

Strict compilation of the modified test completed successfully **before any new runtime test**, and full strict consumer/fixture compilation passed again during consolidated verification.

## 4. C2 increment and precise change

Only `packages/dataset-operations/tests/activation-http.test.ts` changed, by appending imports and five cases after its original contents.

- Original SHA-256: `C648F5E580C4E89DB0D40948CC6B6454C57027BF6C7F8FC246FD0F57936AB84B`.
- New SHA-256: `04B74ACD584C9078AA7231C4F3236634DD12242F5B5A7571F8D833D84148FDB1`.
- Original 32 tests remain intact; the file now contains 37 cases.

**Positive case:** normal real activation reaches verified-serving with the actual gate open and actual qualified resolver. A new disposable synthetic ID, distinct from the private health-probe ID, is inserted, queried, updated, queried, deleted and queried for absence through the ordinary URL. An initial query confirms absence. Every step rechecks the real serving assertion, complete pin, generation and versioned fingerprint.

For each write the test checks HTTP status **and** success, committed, commitOutcome=committed, exact correlation ID, unique UUID operation ID, requested/succeeded/failed/unknown counts, exact returned record and no errors. Queries check the actual row-array response. Fresh independently registered ORM instances confirm persistence/absence and preservation of the pre-existing synthetic row after every operation.

The actual I-AM policy service confirms the synthetic actor has allowed, unscoped authorization with the requested fields. A missing-bearer write is independently rejected with the established 401 body and no persistence change.

Publication/history, owner sidecar, applied state/ledger, health receipts, policy and registry inventories/bytes remain unchanged throughout. Only the expected target data file can differ during CRUD; after deletion the **entire root inventory and raw bytes match the post-activation baseline**. No second promotion or publication is performed.

**Four negative cases:** insert, update, delete and query each receive 503 ACTIVATION_NOT_READY with unchanged complete inventories before activation and again after closing an actually activated host's admission. Closed admission also fails the actual qualified-serving assertion. No ordinary request can satisfy C2 merely by reaching a listener or obtaining generic liveness.

## 5. Fresh execution results

Node **v24.19.0**, approved local **npm 10.8.2**; all **25 traced npm invocations** used 10.8.2. The existing local CLI/shim was reused. No install, global npm change, package version change or lockfile rewrite occurred.

The [C2 command manifest](evidence/ds0-wp2-r4/c2-commands.json) and [full command manifest](evidence/ds0-wp2-r4/commands.json) record exact executables, arguments, checkout directories, start/end times and exits. Runners are retained beside the logs. All rows below are fresh R4 executions.

| Command / selection | Result |
| --- | --- |
| D strict TypeScript for modified activation test | Exit 0 before runtime execution — [04-c2-strict](evidence/ds0-wp2-r4/04-c2-strict.txt). |
| D Vitest activation test with `-t C2` | **5 passed**, 32 existing cases filtered out — [05-c2-focused](evidence/ds0-wp2-r4/05-c2-focused.txt). This filter is not a change to or disabling of those tests. |
| D local npm `run build` | Exit 0 — [07-build](evidence/ds0-wp2-r4/07-build.txt). |
| D local npm `run typecheck` | Exit 0 — [08-typecheck](evidence/ds0-wp2-r4/08-typecheck.txt). |
| D `tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext`, 14 STAB/R1/R2/R3/C2 entry fixtures | Exit 0 — [09-strict](evidence/ds0-wp2-r4/09-strict.txt); exact entry list in manifest. |
| D unfiltered `vitest run` | **616 passed / 21 files, no skipped tests**, exit 0 — [10-full-tests](evidence/ds0-wp2-r4/10-full-tests.txt). |
| P schema-adapter compatibility and migrations-deployment tests | **12 passed / 2 files**, exit 0 — [11-platform-focused](evidence/ds0-wp2-r4/11-platform-focused.txt). |
| P local npm `run typecheck` | Exit 0 — [12-platform-typecheck](evidence/ds0-wp2-r4/12-platform-typecheck.txt). |
| P local npm `run check:editor-production` | Exit 0 — [13-platform-production](evidence/ds0-wp2-r4/13-platform-production.txt); existing large-chunk warning remains. |
| P local npm `run check:editor-contracts`, unchanged standard command | **103 passed / 13 files**, exit 0 — [14-platform-contracts](evidence/ds0-wp2-r4/14-platform-contracts.txt). |
| Final preservation helper / diff whitespace check | Exit 0; no unexpected changes; Git LF/CRLF advisories only — [15-final-preservation](evidence/ds0-wp2-r4/15-final-preservation.txt). |

There were **no new strict-compilation or runtime-test failures** in this limited increment or fresh R4 sequence. No diagnostic rerun, assertion change, timeout adjustment or runner-concurrency alteration was used to obtain the R4 standard pass.

Unique count reconciliation:
- D: **611 accepted R3 cases + 5 C2 cases = 616**. Equivalently, 345 stabilized + 102 R1 + 35 R2 + 129 R3 + 5 C2. The focused five cases overlap the full run; they are not added again.
- P: **12 + 103 − 3 overlapping schema-adapter cases = 112 unique cases / 14 files**, with 115 executed instances. This is the relevant selection, not the entire P suite.
- Prior runs and diagnostic alternatives are historical repeated executions, not additional coverage.

## 6. C1–C12 requirements-to-evidence reconciliation

Authority: the approved bounded requirements in [requirements reconciliation](ds0-wp2-readiness-requirements-reconciliation.md), refined by [R0](ds0-wp2-r0-contract-design.md) and G1-O/V/H/R/I decisions. These are the newly approved increment, not a claim that the missing original WP2 plan was recovered.

| Criterion | Fresh evidence and conclusion | Boundary |
| --- | --- | --- |
| C1 verified identity | R1 fingerprint (32), verification (45), resolver (25), canonical/VDR tests and activation/recovery negatives pass in the full run. Exact permanent IDs, canonical format, observed registration and pin are checked; checksum equality alone cannot qualify. | No legacy activation/certification; supported definition subset only. |
| C2 runtime activation | Existing ordered activation/private health plus **new ordinary admitted CRUD and four closed-admission cases** pass. Business results, real authorization, fresh readers and invariant preservation establish the missing boundary. | Disposable synthetic host/actor only; generic HTTP 200 is insufficient. |
| C3 publication versus applied | Clean same-version restart tests reverify the pinned version after a later active publication; fresh generation and unchanged applied bytes. Process restart coverage also passes. | No automatic latest-version following, upgrade or concurrent publication support. |
| C4 authority isolation | Conflicting/shared/extra UI authority and junction tests pass. Synthetic root inventories and new C2 state/publication/policy preservation checks pass. P migration implementation is unchanged. | Existing external deployments/roots remain unverified; no authority bridge. |
| C5 failure before verification | Integrity/identity/ORM/auth/trigger negatives pass; rejected operations preserve inventories, with explicitly authorized owner/applying-state effects distinguished from zero mutation. | No false assertion of zero writes after an intentional applying transition. |
| C6 activation/promotion interruption | R2 state/receipt/health/ownership/admission/response-drain cases and R3 transition/write/rename/crash/lost-acknowledgment cases pass. New closed-admission cases cover ordinary requests before activation and after closure. Failures retain gating and uncertainty. | Evidence covers the deterministic implemented boundaries, not every possible OS/instruction interleaving. Stale-owner crash restart remains gated pending separate operator action. |
| C7 journal/recovery | All 68 R3 recovery cases and 51 failure cases pass: strict complete invariants, before/next cases, ambiguous/corrupt state, actual delegated rename failures, evidence retention and exact post-removal byte checks. | Before-match discards uncommitted journal, never installs nextState. Next-match does not certify an absent preimage. |
| C8 operational recovery limits | Same-pin applying/pending resume and applied restart pass; unknown commits, recovery-required states, ambiguous journals, temporary leftovers and stale locks remain blocked. | No compensation, blind retry, speculative cleanup, automatic clearing or extra recovery algorithm. |
| C9 process/concurrency | R2 two process tests, R3 ten process tests and drain tests pass: IPC-confirmed boundaries, losing contenders preserve bytes, owner retained throughout serving, clean restart and stale-lock containment. | Whole-workflow protection is the approved cooperative owner, not individual state locks; uncoordinated writers unsupported. |
| C10 durability claims | Windows process kills and delegated I/O faults exercise the admitted failure model with fresh readers and preserved evidence. | Power loss, fencing and multi-file atomicity are **not established** and were explicitly excluded; process kills are not power-cut tests. |
| C11 regression/preservation | All standard commands pass freshly; 93 unchanged files + exact original test prefix, 208 preserved artifacts, unchanged locks/interfaces and B2/B3/B4 regressions confirmed. | Historical STAB-2 raw-checkout-byte qualification remains; prior UI standard failures are not erased. |
| C12 exclusions | All accepted exclusions and outstanding issues remain explicit below. No new implementation beyond authorized C2 tests. | No production-readiness, arbitrary-data recovery, missing-original-plan or subsequent-milestone claim. |

For the bounded functional scope, no remaining C2 evidence gap or runtime regression was found. Stronger durability/production/deployment claims and independent reconstruction of the old STAB-2 checkout bytes remain unestablished; they are not silently converted to passes.

## 7. Failure evidence and outstanding issues

**Historical standard failures remain preserved.** R3 standard editor run one: 102 passed / 1 failed from consumer timeout and temporary-file cleanup failure. Run two: 101 passed / 2 failed from consumer timeout/cleanup and watcher EPERM. Individual files and serialized 103-case selection passed diagnostically. See the unchanged [R3 report](ds0-wp2-r3-implementation-acceptance-report.md) and its exact logs. Fresh standard R4 success shows non-reproduction on this execution, not defect closure or proof of cause.

Deterministic failure evidence rerun in R4 includes real commit persistence followed by lost acknowledgment, unknown outcomes with no rollback/retry/replay, 12 transition-level interruptions, 24 delegated filesystem write/rename interruptions, evidence open/write/sync/readback failures, six state/journal process kills, two reconciliation process kills and two process recovery/clean-restart cases. State/data inventories and fresh readers distinguish actual persistence from API acknowledgment. Test teardown of disposable roots after child exit is not an operator unlock feature.

| Open limitation | Retained disposition |
| --- | --- |
| DS0-HTTP-QUERY-ERROR | Production query-error ERR_HTTP_HEADERS_SENT defect remains; only the accepted development adapter contains it. No production repair. |
| DS0-APPLIED-VALIDATOR | Duplicated R1/R2 applied-state validation remains; future shared-validator contract review required. |
| P consumer timeout/cleanup failures | Unresolved intermittent validation limitation; historical errors retained despite fresh standard success. |
| Windows watcher EPERM | Unresolved known issue; no watcher change or timeout workaround. |
| Non-atomic multi-file ORM persistence | Unchanged algorithm; truthful unknown outcomes do not make storage atomic. |
| Writer fencing / power-loss durability | Not implemented or proven. Cooperative ownership cannot fence direct uncooperative writers. |
| Stale owners/state locks / recovery-required states | Remain blocked; separate operator authorization required. No force unlock or automatic PID takeover. |
| Legacy histories / external deployments | Unverified where not inspected; no migration, deployment or certification. |
| Applied-state authority / published triggers | Prototype D authority only; no P migration-state bridge or publication/runtime-registration bridge. Central registry preserved, enabled target triggers rejected. |
| Scoped writes / upgrades / production hosting | STAB-3 containment remains; full scope evaluator, schema upgrades, physical migrations and production security/audit hosting remain separate. |
| Historical STAB-2 raw bytes | Exact former checkout representation remains unreconstructed; accepted commit/evidence and current baseline remain preserved. |
| Original DS0 plan / formal WP1 conditions | Still not recovered; this is the separately approved bounded increment. |

## 8. G5 acceptance gate

Recommend **scoped G5 acceptance** of verified canonical first activation, same-version clean restart and narrow guarded recovery in the isolated development checkout, including the now-demonstrated ordinary admitted C2 CRUD path.

Acceptance must retain every limitation above, the historical standard editor failures and the historical STAB-2 byte qualification. It must not imply production deployment readiness or stronger storage guarantees.

**STOP AT G5.** The C2 test change and R4 documentation/evidence remain uncommitted. Do not commit, begin another work package, push, release, deploy or migrate data without explicit approval.
