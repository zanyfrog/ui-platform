# DS0-WP2-R1 implementation and acceptance report

September 29, 2026. **Implemented for review — STOPPED AT G2. User acceptance pending.**

## Scope and result

R1 implements the verified canonical reader, independently observed ORM comparison, permanent field-ID mapping, deterministic versioned fingerprint and qualified applied resolver from the [approved R0 contract](ds0-wp2-r0-contract-design.md). The user's G1 decisions authorize these additive contracts; their additional journal requirement is preserved by rejecting every journal artifact without reconciliation.

Final Data Services build, typecheck, strict source/test/package-consumer compilation and full regression suite pass: **447 tests in 15 files**. The focused schema-application suite passes **106 tests in four files**, including the four unchanged original tests. UI Platform compatibility, typecheck, production build/check and editor contracts pass. These are R1 verification/compatibility results, not evidence of a running activated host.

No owner sidecar, activation controller, runtime host, health probe, state promotion, journal reconciliation or R2–R4 behavior was implemented. No existing store was activated, migrated, republished or rehashed. No commit, push, deployment or release was performed. Package versions and dependency locks are unchanged.

## Repository and toolchain baseline

The checkout was inspected before changes; both P and D were clean. The older STAB-4 P SHA remains historical evidence, while the current P HEAD already contained the committed R0 work when this request began. This turn did not create that commit.

| Repository | Entry and exit HEAD | Resulting changes |
| --- | --- | --- |
| Data Services (D), `C:\Projects\Modular\UI Platform Data Services` | `9a6f0d5623863a8d44b879eda08316b0e3c79571` | Eleven R1 files below; unstaged/uncommitted |
| UI Platform (P), `C:\Projects\Modular\ui-platform` | `6b4a53b6a985abdf08698efa76dd0efd69948157` | This report and R1 evidence only; no tracked source changes |
| ui-base | `96898f73809272e680fcb3402f064a039fff4350` | Clean |

Node **24.19.0**, approved local npm **10.8.2**. Corrected execution uses the existing STAB-0 explicit launcher in `C:/Users/zanyf/AppData/Local/Temp/ds0-stab0-npm-10.8.2/shims`, prepended only to the child-process PATH. All **21 traced npm invocations** used 10.8.2. No install or global npm change occurred. [Npm invocation evidence](evidence/ds0-wp2-r1/npm-invocations.jsonl).

| Lockfile | Unchanged SHA-256 |
| --- | --- |
| D/package-lock.json | `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F` |
| P/package-lock.json | `5E4A3F737256772D16427A4EB78B1E86336E8B11E4F555998BA76882DFC79EFA` |
| ui-base/package-lock.json | `2A8BE906BE643F1DCBD2F33685ED5C3B711E99740F3D19CDB542276608A4673E` |

## Implemented contracts and compatibility

| Contract | Behavior and evidence |
| --- | --- |
| `ActivationPin` / `CanonicalSchemaReader` | Validates the complete environment/app/permanent dataset/reference/publication identity, checksum grammar and explicit canonical-json-v1 format. Uses existing Schema Manager verified reads and history reporting. Active selection must match the requested pin; pinned reads never follow a newer active publication. No raw inspection result is treated as verified. |
| History restrictions | Selected legacy, unknown-format, missing, corrupt or mismatched content rejects. Corrupt/inconsistent selection gates reading. A canonical historical version can remain pinned after a newer canonical publication. Readable unrelated legacy history may coexist and remains reported unverified by Schema Manager. |
| `verifyCandidate` | Reads the verified publication then compares the actual ORM's `getDatasetDefinition`. Produces candidate structural evidence only, with no readiness field. It never calls `register`, writes rows or changes state. Caller pins/schema values are copied before asynchronous comparison. |
| `compareObservedDefinition` | Low-level structural comparator, explicitly documented as not authenticating publication content. Exact field sets, permanent-ID mapping, supported type/default/required/primary-key rules and observed schemaVersion are checked. Unsupported constraints or definitions reject. |
| `CanonicalOrmSchemaVerifier` | Adapts the existing `OrmSchemaVerifier` interface through a constructor-bound complete pin and verified reader. The supplied schema must equal verified content; it cannot be used to certify an unrelated candidate. |
| Fingerprint | `ds0-orm-verification-v1:sha256:<hex>` over the domain prefix, NUL and strict canonical descriptor. Recursive UTF-16 ordering; permanent field-ID sorting; explicit default/schemaVersion presence; strict JSON, 1 MiB and depth-100 bounds. Distinct from publication, UI Platform and state/journal hashes. Private serializer uses Node built-ins; no dependency or VDR private production import. |
| `QualifiedAppliedResolver` | Direct read-only state bytes; never `snapshot`, `recoverState` or another state-store mutator. Rejects journals, locks, temporary/unknown files, duplicate-key JSON, recovery gates, incomplete applied records/ledger, wrong pins, old fingerprints, wrong mappings and stale generations. Rechecks publication, observed definition and state after the serving assertion. Unknown requested field IDs and wrong expected version/checksum reject. |
| Serving boundary | A supplied trusted `ServingRuntime.assertServing` port is mandatory before returning `verified-serving`. R1 does not implement its provider. Future host code must prove ownership, health and admission for the exact pin/fingerprint/generation. Resolver tests use a clearly labeled test fixture port; no-op fixtures are not suitable for applications or activation proof. |
| Existing contracts | `AppliedSchemaResolver` and `OrmSchemaVerifier` assignments compile. Legacy-shaped applied resolution is returned only after qualified checks. Existing identity, verification and state/journal interfaces retain their members and behavior. Old opaque verification strings still typecheck but cannot certify a qualified R1 read. |

The independently supplied registration is explicitly authored in the tests, separately from the publication. The implementation only observes it. A spy confirms no registration during verification, while mismatched independent registrations reject. ORM row files are initialized before preservation snapshots; all R1 paths thereafter are read-only. Permanent field IDs bind published IDs to observed names/types; this does not add IDs to stored rows or prove registration provenance beyond the trusted caller boundary.

The resolver supports only the approved isolated single-target prototype. It requires a valid applied ledger and recognized verifier/activator tags; older synthetic or opaque applied evidence is rejected without rewriting it. Read-only double observation detects tested changes but does not provide atomic observation or fencing. Exclusivity, root-authority configuration and actual serving evidence remain future controlled-host responsibilities.

## Changed Data Services files

Paths below are relative to D. All are within `packages/schema-application/`.

| File | Change |
| --- | --- |
| `src/activation-contracts.ts` | New pin, candidate/qualified result, reader/serving ports and typed error class |
| `src/fingerprint.ts` | New private strict serializer and versioned fingerprint |
| `src/verification.ts` | New canonical reader, observed comparison, candidate verification and existing-interface adapter |
| `src/resolver.ts` | New read-only applied resolver and strict state eligibility parsing/checking |
| `src/index.ts` | Five appended lines: comment and additive exports; original bytes preserved as prefix |
| `README.md` | Appended R1 usage/boundary documentation; original bytes preserved as prefix |
| `tests/fingerprint.test.ts` | 32 tests |
| `tests/verification.test.ts` | 45 tests |
| `tests/resolver.test.ts` | 25 tests |
| `tests/r1-fixtures.ts` | Disposable real stores, independent registration, raw-byte inventory and test-only applied/serving fixtures |
| `tests/r1-consumer-fixture.ts` | Strict emitted-package/legacy-interface compilation fixture; not a runtime test |

The test fixtures author synthetic applied bytes solely to exercise read boundaries; no activation implementation or state-promotion service is added. The original `state-store.test.ts` and all other existing test files are unchanged.

## V1–V6 acceptance coverage

| Criteria | Coverage |
| --- | --- |
| V1: golden bytes/digests | Five primitive/object vectors plus a full hand-specified ORM descriptor and literal expected digest. The full vector digest was independently computed with .NET SHA-256 over the specified bytes; production output is asserted against the literal. |
| V2: determinism and binding | Recursive ordering/parity with accepted VDR canonicalization, independent field reordering, timestamps excluded, changes to permanent dataset/field IDs, key/type/required/default presence, environment/version/checksum and observed schemaVersion alter the fingerprint. Unicode normalization and array order remain significant. |
| V3: strict unsupported input | Unsupported scalar/object types, non-finite numbers, sparse arrays, cycles, hidden/symbol/accessor properties, hooks, lone surrogates and size/depth limits reject. Hooks are not invoked. |
| V4: observed ORM mapping | Real ORM definition observation, no register call, exact supported defaults/types, missing/extra/duplicate fields, wrong types/required/default/primary/schemaVersion/classification reject. Unsupported candidate semantic properties and duplicate IDs/keys reject. |
| V5: verified identity/history | Wrong identity/reference/namespace/version/checksum/format/Windows path, legacy/unknown/tampered/unreadable content, inconsistent active metadata reject. Canonical historical pin does not follow latest; unrelated legacy history is not certified. |
| V6: qualified resolver boundaries | Candidate can verify while applying/pending but cannot resolve as applied. Incomplete/wrong applied identity/mapping/ledger/timestamps, unknown tags, stale generation, unknown requested fields, failed serving assertion, changed state bytes and changed registration reject. Journals/locks/orphan temporaries remain untouched. |

Raw-byte assertions inventory every filename, directory and file's complete bytes across the temporary publication, ORM and (where present) state trees. Snapshots are taken after deliberate fixture corruption/setup and compared after rejected/successful read-only operations. This proves no additional mutation by those paths; it does not characterize power-loss behavior or claim pre-fixture corruption was caused by R1.

## Commands and results

`node` is the installed Node executable. `npm-cli` below means the exact approved local CLI path recorded above. Detailed argument arrays, working directories, times and exit codes are in [initial command records](evidence/ds0-wp2-r1/commands.json) and [corrected command records](evidence/ds0-wp2-r1/corrected-commands.json). Original logs are retained rather than overwritten.

| Check / command | Final outcome / evidence |
| --- | --- |
| D `node npm-cli run build` | Exit 0, all seven workspaces — [corrected build](evidence/ds0-wp2-r1/corrected-06-build.txt) |
| D `node npm-cli run typecheck` | Exit 0 — [typecheck](evidence/ds0-wp2-r1/corrected-07-typecheck.txt) |
| D `node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext` plus new test/consumer and existing security/consumer files | Exit 0, including actual package-root declarations and legacy consumers — [strict compilation](evidence/ds0-wp2-r1/corrected-08-strict.txt) |
| D `node node_modules/vitest/vitest.mjs run packages/schema-application/tests` | 106/106, four files — [focused](evidence/ds0-wp2-r1/04-focused.txt) |
| D `node node_modules/vitest/vitest.mjs run` | 447/447, 15 files — [full suite](evidence/ds0-wp2-r1/09-full-tests.txt) |
| P `node node_modules/vitest/vitest.mjs run packages/artifacts/tests/schema-adapter-compatibility.test.ts packages/artifacts/tests/migrations-deployment.test.ts` | 12/12, two files — [compatibility](evidence/ds0-wp2-r1/10-platform-focused.txt) |
| P `node npm-cli run typecheck` | Exit 0 — [typecheck](evidence/ds0-wp2-r1/corrected-11-platform-typecheck.txt) |
| P `node npm-cli run check:editor-production` | Exit 0, includes production build and client check — [production](evidence/ds0-wp2-r1/corrected-12-platform-production.txt) |
| P `node npm-cli run check:editor-contracts` | Exit 0; 103/103, 13 files, plus emitted-contract checks — [editor contracts](evidence/ds0-wp2-r1/13-platform-contracts.txt) |
| D `git diff --check` | Exit 0; only Git LF/CRLF conversion advisories |
| `node docs/architecture/evidence/ds0-wp2-r1/preservation.cjs` | Exit 0 — [preservation evidence](evidence/ds0-wp2-r1/preservation.json) |

Count reconciliation: prior D 345 + **102 new R1 tests** = **447**. Focused 106 = 102 new + four original; all 106 are included in the full 447 and are not additional coverage. Three new test files increase the full suite from 12 to 15. P's focused 12 and editor 103 overlap in three schema-adapter cases: **112 unique tests across 14 files**, 115 executed test instances. This is the relevant P regression selection, not its entire test suite. No original test was removed, skipped or weakened.

## Initial failures and corrections

1. Initial build passed; initial focused run had **92 passing / seven failing** tests (99 at that point). One failure exposed a missing root-level primitive byte-limit guard in the new serializer. The other six were new fixtures incorrectly assuming `metadata.json` plus an embedded payload; actual VDR uses `version.json` metadata and `definition.json` payload. Both issues were corrected, preserving the initial log. [Initial focused evidence](evidence/ds0-wp2-r1/02-initial-focused.txt).
2. A batched source-write command exceeded Windows' command-line length and failed before launch (OS error 206). The authorized files were then written individually. This was a tool invocation failure, not an application/storage test failure.
3. Initial strict compilation passed; additional resolver/golden/adapter coverage brought the focused suite to 106, all passing. [Initial strict](evidence/ds0-wp2-r1/03-initial-strict.txt), [expanded strict](evidence/ds0-wp2-r1/05-strict.txt).
4. The consolidated runner incorrectly placed the extracted npm `bin` directory on PATH. Its template `npm.cmd` expects an installed `node_modules/npm` layout; nested builds/typechecks failed with MODULE_NOT_FOUND. The emitted-package consumer consequently saw an old declaration missing the new adapter export. D/P affected build/typecheck/strict/production checks were rerun with the already-existing explicit STAB-0 shim and npm tracing; all passed. The already-successful full D, P compatibility and editor-contract tests were retained, not needlessly rerun. [Failed build](evidence/ds0-wp2-r1/06-build.txt), [stale declaration failure](evidence/ds0-wp2-r1/08-strict.txt).

No regression failure remained after those corrections. The production build still reports the known >500 kB chunk warning. The documented Windows watcher EPERM limitation remains unresolved and separate; successful selected watcher/contract tests are not a claim that the original issue is fixed.

## Preservation and hashes

[Before snapshot](evidence/ds0-wp2-r1/before.json) and [final manifest](evidence/ds0-wp2-r1/preservation.json) record repository state and exact SHA-256 values for all eleven changed files. All **69 original D files** preserve their original content: 67 whole-file hashes unchanged, with exact original-byte prefix hashes verified for the two append-only files. This includes all original STAB source and tests and the complete state-store implementation/hash code.

All **105 prior evidence checks** (89 earlier artifacts plus 16 committed STAB-4 artifacts) match. The accepted R0 document remains SHA-256 `04362E70A06AD1B3ADC4A66927B0BA0B1424BB9ACD2BF662B09FD64FD375360A`, matching its recorded evidence. No staged changes or tracked P source changes were found. Generated build outputs are local ignored artifacts; no package release was made.

## Remaining limitations and G2 recommendation

- R1 qualifies structural identity and applied eligibility. It does not establish an exclusive host, health, admission control, process restart or live HTTP activation. The required serving port has no production provider in this increment.
- Journal presence always gates the resolver. Even matching checksums cause no deletion/recovery attempt; full independent invariant validation and the conditionally approved G1-R path remain future work. No ambiguous evidence is discarded.
- Non-atomic multi-file persistence, durability and writer fencing are unchanged. Repeated read-only checks are not transaction isolation or protection against an uncooperative writer.
- Existing opaque/legacy applied verification cannot certify the new runtime; it is rejected without migration. Legacy stores/external deployments remain unverified. UI Platform migration authority and published-trigger/runtime-registration integration remain separate and unchanged.
- Scoped-write containment, unsupported-operation rejection and accepted STAB-1/STAB-2 behavior remain as previously accepted. Missing original WP2 plan/WP1 criteria and the watcher limitation remain in the unresolved register.

**Recommend accepting R1 for this tested development checkout at G2.** The implementation remains uncommitted for explicit review. Acceptance does not authorize R2–R4, deployment, migration, release or changes to persisted formats. Stop here until the user decides the next scope.
