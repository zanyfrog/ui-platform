# DS0 STAB-4 consolidated stabilization acceptance report

September 28, 2026 (America/New_York). **REVIEW COMPLETE — AWAITING STAB-4 ACCEPTANCE.**

## 1. Disposition and recorded acceptance

Recommend accepting the consolidated **development-checkout stabilization baseline**, with the [unresolved-issues register](ds0-stab-4-unresolved-issues.md) retained. All current consolidated regression checks pass. This does not establish production readiness or authorize DS0-WP2; the [separate proposed WP2 readiness decision](ds0-wp2-readiness-decision.md) recommends holding implementation authorization pending explicit decisions.

The user accepted STAB-0/B1, STAB-1/B2 and STAB-2/B3 for their recorded scopes. The latest instruction accepts **STAB-3 and closes B4 only for the documented DOE/I-AM containment scope**. This report records that acceptance without rewriting the historical implementation reports' awaiting-acceptance wording. Full record-scoped authorization is still future work.

STAB-3 was already locally committed before this turn: `9a6f0d5623863a8d44b879eda08316b0e3c79571`, parent `d0aa1044b551086d2fbfaccf80357e7e6a5827dc`, title “STAB-3 is implemented and ready for acceptance.” The existing commit changes exactly the approved eight files; all eight match the accepted tested hashes. Review covered the two production guards, explicit dispatch, preserved type surface, test instrumentation/new cases and documentation. The working tree and index were clean. No duplicate/empty commit or amendment was warranted; this agent did not create that pre-existing commit.

## 2. Authority and evidence reviewed

Reviewed the [original preflight](ds0-wp2-preflight-audit.md), [approved stabilization plan](ds0-baseline-stabilization-repair-plan.md), [STAB-0 provisioning report](ds0-stab-0-execution-acceptance-report.md), [STAB-1 assessment](ds0-stab-1-compatibility-assessment.md), [STAB-1 implementation report](ds0-stab-1-implementation-acceptance-report.md), [STAB-1 acceptance record](ds0-stab-1-acceptance-record.md), [STAB-2 design](ds0-stab-2-transaction-correctness-plan.md), [STAB-2 implementation report](ds0-stab-2-implementation-acceptance-report.md), [STAB-2 acceptance record](ds0-stab-2-acceptance-record.md), [STAB-3 design](ds0-stab-3-write-containment-plan.md) and [STAB-3 implementation report](ds0-stab-3-implementation-acceptance-report.md).

Current-source review covered canonical serialization and VDR inspection/check/verified-read/publication/history paths; DOE operation, authorization, transaction and nested-session paths; I-AM scope selection; ORM persistence; schema-application state/journal interfaces; P migration state and trigger adapter boundaries; and the existing test selection scripts. Original architecture documents and recovered September 26 conversation requirements were treated as distinct evidence, not silently combined into a new approved DS0 specification.

## 3. B1–B4 consolidated verification

| Finding | Accepted scope and current verification | Remaining boundary |
| --- | --- | --- |
| B1 — closed | STAB-0 installed from the existing lockfile in D using local npm 10.8.2; eight original tests and four overlapping focused state-store tests passed. Today Node 24.19.0/npm 10.8.2, dependency tree, all seven workspace builds/typechecks and full suite pass in the same actual checkout. | No new install or global npm change. This is the recorded Windows checkout/toolchain, not certification of another machine or deployment. |
| B2 — closed | canonical-json-v1 recursively serializes the defined JSON domain with golden vectors; nested tampering fails. Explicit inspect/checkVersion/readVerifiedVersion/readVerifiedActive/verifyHistory APIs and Schema/Trigger Manager adapters separate raw inspection from verification. Legacy/mixed history and real HTTP tests pass. | Value digest does not authenticate metadata/provenance or solve concurrent writers. Legacy is unverified, never certified by matching an old digest. Deployment and state identity changes remain separate. |
| B3 — closed | Private session owns transaction lifecycle; external handles/contexts reject. Sequential joined work stays provisional; ignored pre-commit child failure poisons root. Every thrown commit is unknown with no rollback/retry; confirmed commit retains records/counts after callback failure. Actual ORM, fresh-reader, injected partial persistence and HTTP tests pass. | Truthful reporting does not make multiple file writes atomic or provide operational recovery. Direct trusted ORM/admin operations and external side effects remain outside DOE's ownership guarantee. |
| B4 — closed within containment scope | Exact CRUD guard precedes dataset/I-AM/trigger/storage work, captured action prevents substitution, switch has no delete fallback. Defined scopes reject after denied-decision precedence; S4 denies malformed falsy matching write scopes. Real grants/stores, all CRUD counters, raw-byte inventories, actors/options, nesting and HTTP tests pass. | Valid in-scope writes intentionally reject. No restore capability, scope evaluator, broad input validator, authorization redesign or deployment certification. |

B2 publication policy retains the approved Option A exception: only a successfully canonical-verified previously active version's lifecycle status token may change during successful supersession/rollback. Published payload/checksum/format/identity/version/timestamps/provenance, legacy published files and already-historical files stay immutable. Rejected publication/rollback validates before mutation and preserves drafts/files. I/O interruption reports DEFINITION_PUBLICATION_INCOMPLETE with active-state evidence; no atomicity or silent active-version selection is claimed. A readable unrelated legacy historical version is not automatically a veto on a verified current baseline, but stays unverified; legacy active baselines and rollback targets remain blocked.

STAB-1 preserved raw transitional getter/HTTP contracts and added explicit verified interfaces. Same observed unambiguous legacy permanent identity permits draft editing, with unavailable verification/comparison. A8 remains deferred: schema-application published identities and journal hashing are unchanged. A9 remains a coordinated release proposal, not version/lock authorization. STAB-2 optional result fields remain optional in public types and populated by the repaired manager; missing legacy outcome remains unspecified. STAB-3 kept restore in the union while rejecting it at runtime.

## 4. Repository and protected baseline

| Repository | Branch / upstream | Current HEAD | Status |
| --- | --- | --- | --- |
| D: `C:\Projects\Modular\UI Platform Data Services` | master / origin/master | `9a6f0d5623863a8d44b879eda08316b0e3c79571` | Clean before/after regression; no source edits this turn |
| P: `C:\Projects\Modular\ui-platform` | main / origin/main | `61ef52556db69813e11ffbc387e133232005494a` | Existing source/reports unchanged; new STAB-4 reports/evidence only |
| B: `C:\Projects\Modular\ui-base` | main / origin/main | `96898f73809272e680fcb3402f064a039fff4350` | Clean and unchanged |

D history is audited `313b7e0` → accepted STAB-1 `5776838` → STAB-2 `d0aa104` → STAB-3 `9a6f0d5`. P's pre-existing `61ef525` adds 23 prior acceptance/design/evidence artifacts; no runtime source changes. The full SHAs, recent histories, remotes and status are in [review.json](evidence/ds0-stab-4/review.json). Each repository is 0 ahead/0 behind its **locally cached** upstream reference. No fetch was performed in this review, so this is not a current remote-server synchronization claim. No source-of-truth preference for origin/main was assumed.

The [baseline inventory](evidence/ds0-stab-4/before.json) and [review script](evidence/ds0-stab-4/review.cjs) preserve **69 tracked D files** and **89 prior DS0/watcher documents/evidence artifacts**. There are zero post-review mismatches. Separately, **27 unique accepted implementation hashes** match after overlaying only approved later STAB-2/STAB-3 changes to shared files; this avoids falsely requiring the pre-STAB-3 manager hash to remain current. All original test files, production HTTP composition, schema-application, ORM algorithm/interfaces, runtime registry and architecture boundaries are preserved. Git's STAB-3 commit whitespace check passes.

| Lockfile | Unchanged SHA-256 |
| --- | --- |
| D | `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F` |
| P | `5E4A3F737256772D16427A4EB78B1E86336E8B11E4F555998BA76882DFC79EFA` |
| B | `2A8BE906BE643F1DCBD2F33685ED5C3B711E99740F3D19CDB542276608A4673E` |

Seven D workspaces remain version 0.1.0 with linked/deduplicated internal dependencies; npm ls reports no missing/invalid dependency. P remains 0.1.2 with its existing artifacts pin. No package version, lockfile, history or application data changed. Ignored build outputs were refreshed; tests use synthetic temporary roots.

## 5. Consolidated execution and counts

All checks below completed with exit **0** on September 28. D ran in its actual checkout. npm means `node C:\Users\zanyf\AppData\Local\Temp\ds0-stab0-npm-10.8.2\package\bin\npm-cli.js`, with its existing local shims prepended to PATH for nested commands. Node 24.19.0 satisfies npm's `^18.17.0 || >=20.5.0` engine range. D TypeScript/Vitest are 5.9.3/3.2.7; P TypeScript/Vitest/Vite are 7.0.2/4.1.11/8.2.2. No dependency installation was needed.

| Command | Result / evidence |
| --- | --- |
| D `npm ls --depth=0` | Valid seven-workspace tree: [01-dependencies.txt](evidence/ds0-stab-4/01-dependencies.txt) |
| D `npm run build` | Seven package builds: [02-build.txt](evidence/ds0-stab-4/02-build.txt) |
| D `npm run typecheck` | Seven workspace checks: [03-typecheck.txt](evidence/ds0-stab-4/03-typecheck.txt) |
| D `npm test` | **345/345, 12 files**: [04-full-tests.txt](evidence/ds0-stab-4/04-full-tests.txt) |
| D strict new-test and legacy-consumer compilation, flags below | Pass: [05-consumer-tests-compilation.txt](evidence/ds0-stab-4/05-consumer-tests-compilation.txt) |
| P `node node_modules/vitest/vitest.mjs run packages/artifacts/tests/schema-adapter-compatibility.test.ts packages/artifacts/tests/migrations-deployment.test.ts` | **12/12, 2 files**: [06-platform-focused.txt](evidence/ds0-stab-4/06-platform-focused.txt) |
| P `npm run typecheck` | Pass: [07-platform-typecheck.txt](evidence/ds0-stab-4/07-platform-typecheck.txt) |
| P `npm run check:editor-production` | Build and production exclusion pass: [08-platform-production.txt](evidence/ds0-stab-4/08-platform-production.txt) |
| P `node scripts/check-editor-contracts.mjs` | Consumer/artifact compilation, contract-document check and **103/103, 13 files**: [09-platform-contracts.txt](evidence/ds0-stab-4/09-platform-contracts.txt) |

Strict compilation command:

```text
node node_modules/typescript/bin/tsc --noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext packages/dataset-operations/tests/operation-security.test.ts packages/i-am/tests/write-scope-containment.test.ts packages/dataset-operations/tests/result-consumer-fixture.ts
```

The silent compilation log records the observed exit code. The full D suite includes all focused security, state-store and integrity tests, so separate identical focused reruns were unnecessary. No tests or assertions were changed, skipped or retried in STAB-4. There were no new build/typecheck/test failures. Earlier STAB-0 harness failures and STAB-2/STAB-3 initial failures/corrections remain in their original reports/logs; this consolidated pass does not erase them.

| Cumulative D suite | Unique tests |
| --- | ---: |
| STAB-0 original baseline | 8 |
| STAB-1 additions | 80 |
| STAB-2 additions | 40 |
| STAB-3 additions (185 DOE + 32 I-AM) | 217 |
| **Current total** | **345** |

Original schema-application four are included in eight and 345. DOE's 226 are included in 345. The historical focused STAB-3 217 are also included, not additional tests. P focused 12 = three schema-adapter + nine migration/deployment tests; editor contracts 103 include those same three schema-adapter tests. Thus today's P coverage is **112 unique tests across 14 files**, with 115 executed test instances across the two runs. This is the relevant scoped Platform regression selection, not a claim to have run every Platform test.

The runtime claims are supported by actual ORM persistence, fresh readers, deterministic faults, raw-byte inventories and loopback production-handler tests inside the D suite. Compilation alone is not used as communication proof. P adapter tests prove their structural/validation contract, not a deployed UI→DOE→verified-schema activation chain.

## 6. Gate and boundaries

The [issues register](ds0-stab-4-unresolved-issues.md) is part of this proposed consolidated acceptance. The watcher EPERM did not reproduce today; it remains open. The existing non-blocking client chunk warning remains. Neither is silently reclassified as repaired.

Recommended review decision: accept STAB-4's consolidated evidence for this development baseline, preserving the user's B1–B4 scoped closures and all remaining issues. Consider the separate WP2 decision independently. No production readiness, architecture resolution, migration or release follows from this acceptance.

**STOP: STAB-4 review gate.** No source repairs, new commit, push, release, deployment, data migration, dependency change or DS0-WP2 implementation was performed. The requested STAB-3 commit was already present and verified; only these new review artifacts are uncommitted in P.
