# DS0 STAB-1 implementation and acceptance report

Date: September 27, 2026. **IMPLEMENTED — AWAITING USER ACCEPTANCE. STOPPED AT THE STAB-1 ACCEPTANCE GATE.**

## 1. Executive result and authority

The authorized Data Services checksum repair is implemented in the actual checkout. The final build and typecheck pass. All **88 Data Services tests pass**, including the original eight, canonical golden vectors, legacy/mixed-history preservation, publication/rollback interruption tests, and actual Schema Manager/Trigger Manager HTTP communication against temporary synthetic stores. UI Platform compatibility checks pass: 12 focused tests and 103 editor contract tests (overlapping suites; not 115 unique tests).

Authority is the approved STAB-1 compatibility assessment, decisions A1–A7, the later explicit **Option A status-metadata exception**, and the user's instruction to continue after an approval-service availability interruption. A8 remains deferred. A9 remains a release proposal. This report supersedes its earlier pre-implementation preservation-policy hold; the user resolved that hold by approving Option A.

STAB-0 remains accepted and B1 remains closed for its recorded environment. B2 is a candidate for closure upon STAB-1 acceptance, not automatically accepted by this report. B3/B4 and full record-scoped authorization remain outside this repair. No STAB-2/STAB-3, DS0-WP2, deployment, migration, package release, commit or push was performed.

## 2. Repository baseline and preservation

Aliases: D = `C:\Projects\Modular\UI Platform Data Services`; P = `C:\Projects\Modular\ui-platform`; B = `C:\Projects\Modular\ui-base`.

| Repository | Branch / upstream | HEAD before and after this implementation | Working tree |
| --- | --- | --- | --- |
| D | master / origin/master | `313b7e0c64e8e93f75632bb9dc015614d7709668` | Clean before; eight existing files changed and five new files listed below. Uncommitted. |
| P | main / origin/main | `e6b6a86936b8aa24645f24ae53db3cf61a3c0345` | No tracked source changes. Existing untracked assessment preserved; implementation report and evidence added/updated. |
| B | main / origin/main | `96898f73809272e680fcb3402f064a039fff4350` | Clean. |

No branch was assumed authoritative merely because of its name. No fetch/merge/rebase/reset was needed or performed for this bounded implementation. P's earlier transition from audited `b8e495d94e9a49cc0122d5075f621a3ca609be52` to the recorded HEAD was already reconciled in the assessment as prior documentation/evidence only.

The pre-edit 56-file D inventory was preserved and compared by SHA-256: **48 unchanged; eight intentionally changed**. This includes unchanged package manifests, lockfile, architecture sources, all original tests, ORM, I-AM, dataset-operations, and every schema-application source/state/journal implementation file. [Preservation evidence](evidence/ds0-stab-1/preservation-and-repositories.json), [per-file comparison](evidence/ds0-stab-1/tracked-file-preservation.json), and [13 implementation file hashes](evidence/ds0-stab-1/implementation-file-hashes.json) identify the uncommitted result precisely.

| Protected artifact | SHA-256 after execution |
| --- | --- |
| D package-lock.json | `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F` |
| P package-lock.json | `5E4A3F737256772D16427A4EB78B1E86336E8B11E4F555998BA76882DFC79EFA` |
| Accepted STAB-0 report | `EA1394C439425805B51FAED4E7633C82F14311DFC60E0328162257B7DF8E16DE` |
| Approved stabilization plan | `03647EE877E701923B0ABB53E1FAB3AF106751A55AD622DE9E7970852EECF270` |
| STAB-1 compatibility assessment | `2E9ADFB27A1208AF6E650910183464D43433D38ECF186F39D6CB2D6F830DA7A4` |

No dependency installation was repeated; the accepted STAB-0 installation was used. D's three previously discovered default definition roots remain absent. No live store was started, opened through a mutating manager, rewritten, rehashed, republished or migrated. Test stores were freshly created under the Windows temporary directory and removed by test cleanup. External deployments/other machines remain **unverified**, not empty by assumption. Temporary editing copies under P's ignored `.uib/stab1-edits` were staging only; builds and tests ran in D, not in those copies.

## 3. Changed files

All runtime changes are in D. No UI Platform fingerprint or source contract was changed.

| D file | Change |
| --- | --- |
| `packages/versioned-definition-registry/src/canonical.ts` (new) | Strict recursive canonical serializer/checksum; bounded duplicate-aware JSON parser; status-token-only metadata replacement. |
| `packages/versioned-definition-registry/src/registry.ts` | Explicit inspection/check/verified/history APIs, format dispatch, identity guards, qualified draft comparison, pre-mutation publication checks and interruption reporting. |
| `packages/versioned-definition-registry/src/types.ts` | Inspection/verified variants, per-version/history outcomes, checksum format and draft basis fields, typed errors. Existing raw published shape retained. |
| `packages/versioned-definition-registry/src/index.ts` | Public contracts plus checksum-format constant and strict JSON ingress helper. |
| `packages/schema-manager/src/index.ts` | Permanent-ID adapter and explicit inspection/verification wrappers; DatasetSchema interface preserved. |
| `packages/trigger-manager/src/index.ts` | Equivalent trigger identity and inspection/verification wrappers. No runtime registration changes. |
| Both manager `src/service.ts` files | Additive explicit routes, strict bounded JSON ingress, deliberate status/error contracts, non-sensitive storage/interruption errors. Existing raw active/version routes retained. |
| `packages/versioned-definition-registry/tests/canonical.test.ts` (new) | 36 canonicalization/parser tests, including nine fixed byte/digest vectors. |
| `packages/versioned-definition-registry/tests/registry.test.ts` (new) | 31 integrity, legacy/mixed-history, mutation-preservation and interruption tests. |
| `packages/schema-manager/tests/stab1-contracts.test.ts` (new) | 13 tests covering both manager adapters, real HTTP services and nested schema tampering. |
| `packages/versioned-definition-registry/README.md` (new), root `README.md` | Full format/API/HTTP/legacy/preservation/failure/deployment contracts and compatibility notes. |

The individual changed/new file hashes are recorded in the evidence manifest. Existing published-format files are not implementation artifacts and were not modified. Generated `dist` output was refreshed by the normal builds.

## 4. Implemented integrity and compatibility behavior

### Canonical-json-v1

The explicit identity is `(checksumFormat: canonical-json-v1, checksum: sha256:<64 lowercase hex>)`. Hash the normalized definition **value only**. Recursively sort object keys by UTF-16 code units; preserve array order. Serialize finite binary64 numbers and valid Unicode strings using ECMAScript JSON rules; -0 becomes 0. UTF-8 bytes contain no insignificant whitespace, BOM or final newline. No locale sorting or Unicode normalization is used.

Reject unsupported values, non-finite numbers, BigInt, undefined, holes, cycles, accessors/hooks, custom prototypes and hidden/extra properties. Raw ingress rejects duplicate keys before collapse, malformed JSON/UTF-8, unpaired surrogates and bounds violations (1 MiB, depth 100). Object APIs cannot recover duplicate names already lost by callers. Golden vectors pin both canonical text and digest; this is a project-defined format, not a claim to implement an external standard.

Value hashing does not authenticate metadata, provenance or an attacker who can rewrite both payload and digest. Identity/ref/status consistency and adapter semantic checks remain separate. Schema-application checksums and P artifact/migration fingerprints retain their distinct original meanings.

### Read and history boundaries

| Surface | Implemented behavior |
| --- | --- |
| `inspectVersion`, `inspectActive`, `inspectHistory` | Stored claims with `kind: inspection`, `verification: not-performed`, declared format class; unavailable content/metadata has a structured alternative. No content digest calculation. |
| `checkVersion` | Per-version verified, legacy-unverified, unsupported-format, mismatch, missing-content, invalid-content or invalid-metadata result. Canonical success also requires semantic validation. |
| `readVerifiedVersion` | Returns the checked defensive snapshot only on success. Legacy/unsupported/corrupt content fails closed. |
| `readVerifiedActive` | Requires unambiguous active selection, checks that version and detects selection/metadata change during the read. No post-return freshness guarantee. |
| `verifyHistory` / `verifyIntegrity` | Honest per-version counts/outcomes and active result; `valid` only for a nonempty fully verified consistent history. Empty is not verified; mixed history remains partially verified. |
| Existing raw getters and manager aliases | Transitional inspection shape preserved and documented as unverified. They are not silently converted to verified consumption. |

A valid canonical active version can be read in a mixed history without certifying unrelated legacy records. Unknown formats never fall back to a guessed algorithm. Malformed/missing payloads are not mislabeled legacy-unverified. Active selection rejects missing/duplicate active state or malformed version metadata instead of choosing a version silently.

Legacy editing uses the unique parseable active version's nonempty observed string ID. Same-ID editing is allowed with `identityBasis.verification: unavailable`, `baseVerification: legacy-unverified` and `comparison: unavailable`; it is never called clean. This does not authenticate the observed ID. A changed/missing/ambiguous identity blocks editing. Legacy active publication and legacy rollback sources remain blocked without file or draft changes.

### Option A preservation and mutation ordering

Publication/rollback validate history and current/source versions, draft/source semantic validity, canonical serialization, normalization, permanent identity, version allocation and unchanged observed selection/draft before the first mutation. Rollback never stages a draft before these checks.

On success, the only edit to an existing published file is the root **status string token** of the previously active, successfully verified canonical version. It becomes historical on publish or rolled-back on rollback publication. All other bytes, including payload, checksum/format, permanent identity, version, timestamps and provenance, remain unchanged. Previously historical and legacy versions are untouched. Rollback creates a new version with sourceVersion provenance.

Rejected operations are byte-preserving, including draft files and directory/file inventories in the tests. Once mutation has been attempted, an I/O interruption is reported as `DEFINITION_PUBLICATION_INCOMPLETE` with `mutationStarted: true` and `activeState: consistent/inconsistent/unknown`. The flag describes entry into the mutation stage, not proof that each write succeeded. Consistent active selection does not make the overall interrupted operation successful.

**No atomicity claim:** the existing single-writer file-store model remains. Partial new files, two active records, a partial status write or a stale draft can remain after I/O failure. The code explicitly detects/reports ambiguous/incomplete active state and refuses active reads; it performs no automatic repair, rollback, locking redesign or retry. A hard process crash cannot return an exception; subsequent checks expose inconsistent selection, but cannot prove complete durable publication or detect every stale-draft scenario.

## 5. HTTP and integration verification

Both services retain bearer-admin authentication and unauthenticated health. Roots remain cwd-relative defaults or the existing explicit environment override. No launcher/configuration was changed.

Base paths remain `/schemas/{appId}/{dataset}` and `/triggers/{appId}/{triggerKey}`.

| Contract | Result / evidence |
| --- | --- |
| Existing `/active`, `/versions/{n}` | Raw published response retained, including readable legacy records. Tested through actual HTTP. |
| New `/inspection/active`, `/inspection/versions/{n}`, `/inspection/history` | Explicit unverified inspection envelope(s). Tested. |
| New `/versions/{n}/check` | Per-version report; legacy-unverified tested. |
| New `/active/verified`, `/versions/{n}/verified` | Verified canonical envelope; legacy and tampered content return 409 without their payloads in the error. Tested. |
| New `/history/verify`, existing `/verify` | HTTP 200 report, including valid=false/unverified; additive detail rather than false certification. Tested. |
| Draft/publish/rollback | Existing route shapes retained; strict duplicate/depth/size/BOM ingress rejection, canonical publication and rollback, and legacy mutation blocks tested. |
| Missing version | Verified read returns 404; no fabricated version or raw fallback. Tested. |
| Interrupted publication | Actual child service returns HTTP 500 with explicit inconsistent-active details; subsequent raw and verified active reads return 409. Both services tested with test-process-only EIO injection. |

HTTP mapping is documented: 404 genuinely missing version/no publication; 409 incompatible/corrupt/conflicting stored state; 422 invalid JSON/publication draft; 400 invalid reference/version/request; 500 interrupted publication or unavailable storage. Filesystem error messages are sanitized. `check`/inspection availability reports can themselves return HTTP 200 without asserting verification. Existing `verify.valid` is now deliberately conservative; strict input and legacy write restrictions are behavioral changes requiring coordinated release notes.

The real HTTP tests launch built D services on loopback with fresh temporary roots and synthetic tokens, perform requests, then stop them. This is runtime communication evidence for the manager services, not merely compilation or unit-test inference. UI Platform has no existing verified VDR runtime bridge to exercise; the P tests verify its actual schema adapter and artifact/editor/migration contracts. No ORM activation, physical schema application, runtime trigger registration or end-to-end UI-to-VDR deployment is claimed.

## 6. Toolchain, commands and results

D used Node **24.19.0**, the approved **local npm 10.8.2**, TypeScript **5.9.3**, and Vitest **3.2.7**. npm 10.8.2 declares Node `^18.17.0 || >=20.5.0`, covering the installed Node. Global npm remains **11.17.0** and was not replaced. P used its existing Vitest **4.1.11** and installed compilers. No package version or lockfile changed.

For every D npm script below, the command prefix was:

```powershell
$env:PATH = 'C:\Users\zanyf\AppData\Local\Temp\ds0-stab0-npm-10.8.2\shims;' + $env:PATH
node 'C:\Users\zanyf\AppData\Local\Temp\ds0-stab0-npm-10.8.2\package\bin\npm-cli.js'
```

The shim ensures nested build/typecheck npm commands also resolve the approved local npm. D cwd was `C:\Projects\Modular\UI Platform Data Services`. P commands ran from `C:\Projects\Modular\ui-platform`.

| Command / stage | Exit and outcome | Evidence |
| --- | --- | --- |
| D `run build`, initial source pass | 0; all seven package builds passed | Tool execution record; later durable build logs below supersede this preliminary check |
| D `test`, initial regression run | 1; 37 passed, two HTTP failures; canonical suite collection failed on BigInt test-title formatting | [01-tests-initial.txt](evidence/ds0-stab-1/01-tests-initial.txt) |
| D `run build`, parser wiring correction | 0 | [02-build.txt](evidence/ds0-stab-1/02-build.txt) |
| D `test`, corrected initial suite | 0; 75/75 | [03-tests.txt](evidence/ds0-stab-1/03-tests.txt) |
| P `node node_modules/vitest/vitest.mjs run packages/artifacts/tests/schema-adapter-compatibility.test.ts packages/artifacts/tests/migrations-deployment.test.ts` | 0; 2 files, 12/12 | [04-platform-compatibility.txt](evidence/ds0-stab-1/04-platform-compatibility.txt) |
| D `run build`, final runtime code | 0; all seven package builds passed | [05-build-final.txt](evidence/ds0-stab-1/05-build-final.txt) |
| D `run typecheck`, final runtime code | 0; all seven workspace checks passed | [06-typecheck-final.txt](evidence/ds0-stab-1/06-typecheck-final.txt) |
| D `test`, expanded preservation suite | 0; 86/86 | [07-tests-final.txt](evidence/ds0-stab-1/07-tests-final.txt) |
| P `node scripts/check-editor-contracts.mjs` | 0; artifact build, consumer compilation and contract-document check passed; 13 files, 103/103 tests | [08-platform-editor-contracts.txt](evidence/ds0-stab-1/08-platform-editor-contracts.txt) |
| D `test`, final acceptance suite after adding HTTP interruption coverage | 0; 7 files, **88/88** | [09-tests-acceptance.txt](evidence/ds0-stab-1/09-tests-acceptance.txt) |
| D `git diff --check` with command-scoped safe.directory | 0; no whitespace errors; ordinary LF/CRLF advisory output | [diff-check.txt](evidence/ds0-stab-1/diff-check.txt) |
| Read-only HEAD/branch/upstream/status, file SHA-256 and tool-version recording | Completed; only intended file changes; protected hashes match | [record-preservation.ps1](evidence/ds0-stab-1/record-preservation.ps1) and its JSON outputs |

The initial HTTP failures exposed a missed CRLF-sensitive editing-script replacement: old JSON.parse remained in request ingress. The strict parser was wired correctly and actual service tests then passed. The collection error was a `%j` test-title attempting to serialize BigInt, corrected without weakening the unsupported-input assertion. Final tests supersede those failures; their logs are retained rather than hidden.

An initial sandbox Git status reported dubious ownership; subsequent read-only Git commands used command-scoped safe.directory, not global configuration changes. One out-of-workspace copy/test request was **not executed** because automatic approval review could not complete due to usage limits. It was retried successfully after the user requested continuation. This was approval-service availability, not a code failure or safety finding.

### Exact test-count reconciliation

| Group | Original unchanged tests | Added STAB-1 tests | Final |
| --- | ---: | ---: | ---: |
| Schema application state store | 4 | 0 | 4 |
| Existing Schema Manager tests | 1 | 0 | 1 |
| Existing Trigger Manager tests | 2 | 0 | 2 |
| Existing dataset operations tests | 1 | 0 | 1 |
| Canonical/parser tests | 0 | 36 | 36 |
| Registry integrity/preservation tests | 0 | 31 | 31 |
| Manager/HTTP/schema compatibility tests | 0 | 13 | 13 |
| **Total** | **8** | **80** | **88** |

The previous four focused/eight total report is preserved, not contradicted. All four original focused state-store tests are unchanged and pass within the final suite; the total grew through new tests. No repeated focused state-store run was needed after the full suite proved those same four passed.

## 7. Acceptance evidence against the approved requirements

| Requirement | Evidence / outcome |
| --- | --- |
| Deterministic recursive canonical hashing | Nine literal byte/digest golden vectors; nested/key-order/array/Unicode/numeric cases; unsupported and malformed ingress cases pass. |
| Explicit inspection and verified APIs | Registry, both adapters and actual HTTP envelopes/outcomes pass; raw getters/routes remain available. |
| Legacy same-ID editing without certification | Both manager adapters and VDR show unavailable comparison/basis; identity changes reject; publication/rollback preserve bytes. |
| Prerequisites before mutation | Invalid normalization/identity, malformed history, missing payload/metadata, legacy baseline/source and forged rollback request tests compare complete snapshots. |
| Narrow status exception and successful supersession | Pretty-formatted old metadata differs only in status token; old payload bytes unchanged; already-historical bytes preserved across rollback publication. |
| Mixed history | Verified active reads and new publication coexist with explicitly unverified untouched legacy history; rollback to legacy is blocked. |
| Interruption reporting | Six injected VDR failure cases span publish/rollback at new metadata, old status and draft writes. Two actual HTTP interruption cases prove 500 details and subsequent active-read refusal. |
| No unrelated checksum changes | Protected source hash comparison; original state tests; exact P DatasetSchema structural check and migration/editor tests pass. |
| No package/lock/store migration | Manifest/lock hashes unchanged; no install/release/deployment; default roots still absent and tests use synthetic roots. |

Golden vectors were executed on this Windows/Node 24.19.0 toolchain. Other Node versions, operating systems and locales were not empirically certified. Existing single-writer assumptions and strict parser bounds are explicit parts of the compatibility contract.

## 8. Remaining limitations and separate work

| Classification | Finding / boundary |
| --- | --- |
| WARNING | Publication remains non-atomic and single-writer. I/O failures are explicit, not repaired. Multi-writer fencing, durability and crash recovery require separately approved design/work; this task did not become a storage transaction redesign. |
| WARNING | Legacy active histories cannot publish, roll back or enter verified consumption. Raw inspection and qualified editing remain available. No conversion procedure or verified-only deployment is authorized. |
| UNKNOWN | External stores, deployments and consumers were not available for inspection. Absence at local defaults cannot establish rollout safety. |
| WARNING | Transitional raw getters/routes still expose unverified content intentionally. A future consumer cutover must be reviewed; the current code does not make those consumers verified. |
| WARNING | The previously observed Windows watcher rename EPERM remains a documented unresolved limitation. It **did not reproduce** in this 103/103 run. No watcher code changed, no fix or permanent resolution is claimed, and no new watcher failure was introduced in these results. |
| INFORMATION | The two applied-state authorities—P migration/applied-schema state and D schema-application state—remain separate. No authority reconciliation or persisted identity upgrade was performed. A8 is deferred. |
| INFORMATION | Trigger Manager publication and runtime TriggerRegistry registration remain separate. Verified trigger reads do not register or activate handlers. |
| INFORMATION | B3 truthful transaction outcomes and B4 record-scoped write behavior remain pending their own authorization. Full record-scoped authorization remains a separate future work item. |
| INFORMATION | Git source checks emitted normal LF/CRLF notices. Strict stored JSON byte handling is independent of source checkout line endings. |

No new unresolved build/typecheck/test failure remains for the implemented STAB-1 scope. That statement is limited to the recorded checkout, temporary-store scenarios and toolchain, not every deployment or concurrency/crash condition.

## 9. Coordinated release proposal — A9, not executed

Recommend a reviewed coordinated incompatible **0.2.0** release line for VDR, Schema Manager and Trigger Manager, retaining the documented transitional raw APIs. This is a proposal only; all versions remain unchanged.

1. Review/accept this implementation and its format/HTTP compatibility contract.
2. Inventory actual roots and consumers; decide availability and treatment of existing legacy histories separately. Do not rehash them or infer trust from newly calculated digests.
3. Approve precise VDR/manager version changes and exact dependency pins together. Review schema-application's exact Schema Manager dependency for a dependency-only compatible release; keep its state/journal format unchanged under A8.
4. Update the root lockfile only in that separately authorized release, with a reviewed diff. No ORM/I-AM/DOE release is intrinsically needed for this checksum repair.
5. Coordinate service/writer cutover; prohibit mixed old/new writers. Pin a compatible code rollback plan before any new-format writes. Old binaries are not automatically safe after canonical-format publication.

No step in that release/deployment sequence was executed. A package version bump alone cannot resolve unknown consumers or legacy authenticity.

## 10. Acceptance gate

**Recommended disposition: review and accept STAB-1 for this recorded development checkout, with the explicit limitations above.** Acceptance belongs to the user. B1 remains accepted; B2 closure awaits that acceptance. This report does not authorize release, deployment, legacy transition, A8 persisted identity work, STAB-2/STAB-3 or DS0-WP2.

**STOP: STAB-1 acceptance gate.** Source changes remain uncommitted and reviewable in D. No automatic continuation is scheduled.
