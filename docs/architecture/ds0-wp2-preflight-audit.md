# DS0-WP2 preflight audit

Audit date: September 26, 2026, America/New_York. Validation completed approximately 20:20 EDT.

## 1. Executive summary

**Readiness: HOLD at the review gate. Do not begin DS0-WP2 or implement repairs on the strength of this audit.**

The main-machine checkouts match their freshly fetched upstream branches. The recovered DS0-WP1 implementation is present in Data Services, including the seven-file schema-application change from the secondary-machine branch. No uncommitted work, untracked files, stashes, missing Git objects, or unmerged Data Services branch commits were found at audit start. This establishes synchronization with the available remote references, not that all work from every machine was pushed or that these branches are the approved architectural baseline.

The Data Services checkout has **no installed dependencies or built package exports**. Its commands fail there. A temporary, hash-verified copy installed from the unchanged lockfile builds and typechecks successfully and passes **8/8 tests**, including **4/4 schema-application tests**. This corroborates the recovered WP1 test counts, but does not reproduce a complete acceptance decision.

UI Platform builds and typechecks. Its full test run passes 175/178 tests: two server tests fail due to a sandbox identity lookup error and one watcher test fails with Windows `EPERM`. The server tests pass in an unsandboxed contract run; the watcher failure persists. The contract gate finishes at **102/103 passing**, not green. The production client exclusion check passes.

Additional probes against real emitted Data Services libraries found defects not covered by the eight existing tests:

- Nested schema changes retain the same checksum; a changed draft is reported clean and a tampered published schema passes integrity verification.
- An after-commit handler failure returns `committed: false` although the row was persisted.
- The exported `restore` operation executes deletion and reports success.
- A write grant's record scope is not enforced by the operation manager.

Actual HTTP processes were exercised using temporary data and ephemeral loopback ports. Schema publication/readback and central trigger create/list work. **There is no verified UI Platform-to-DOE application data path.** The Operations service constructs its own ORM and I-AM rather than calling the independently launched services. A dataset registered over the ORM HTTP API is unavailable to Operations. This missing composition is not evidence of a newly introduced regression.

### Evidence and authority

Repository aliases used below:

- **P:** `C:\Projects\Modular\ui-platform`
- **D:** `C:\Projects\Modular\UI Platform Data Services`
- **B:** `C:\Projects\Modular\ui-base`
- **T:** `C:\Users\zanyf\AppData\Local\Temp\ds0-wp2-preflight`

The user recovered a September 26 discussion in which DS0-WP1 was **conditionally accepted**, with four focused tests, eight total tests, build and typecheck passing. The recovered follow-up objectives are runtime activation/reload verification, safe recovery, and stronger durability/concurrency testing. These are **provisional recovered requirements**, not a complete DS0-WP2 specification. The discussion's complete text, acceptance conditions and approved implementation plan were not available to this audit. No standalone DS0 acceptance report or DS0 plan was found in the inspected checkouts, tracked path histories, or matching Downloads filenames. The user confirmed that a saved acceptance report cannot be established.

Form Builder WP1A, Artifact Editor Phase 2 WP1–WP5, and Application Build/Migration work packages are separate workstreams. Their reports are useful integration evidence, not DS0 acceptance. The earlier authorization recovered by the user does not supersede this request's explicit review gate.

## 2. Repository and Git synchronization matrix

All three are independent repositories, not submodules. Recursive `.git` discovery under `C:\Projects\Modular` found these three repositories. Each has one registered worktree, its listed checkout. Tracked-index inspection found no mode-160000 gitlinks or `.gitmodules`. `git submodule status` could not run because this shell's Git helper could not locate `basename`, `sed`, and `git-sh-setup`; index and filesystem evidence supplied the submodule inventory instead.

| Repository | Branch / upstream | Full HEAD after fetch | Working tree at start | Ahead / behind |
| --- | --- | --- | --- | --- |
| P | `main` / `origin/main` | `b8e495d94e9a49cc0122d5075f621a3ca609be52` | Clean; no stashes | 0 / 0 |
| D | `master` / `origin/master` | `313b7e0c64e8e93f75632bb9dc015614d7709668` | Clean; no stashes | 0 / 0 |
| B | `main` / `origin/main` | `96898f73809272e680fcb3402f064a039fff4350` | Clean; no stashes | 0 / 0 |

| Repository | Fetch and push remote, both named `origin` | Other advertised branch evidence |
| --- | --- | --- |
| P | `https://github.com/zanyfrog/ui-platform.git` | Only `origin/main` and symbolic `origin/HEAD` |
| D | `https://github.com/zanyfrog/ui-platform-data-services.git` | `origin/at-aberdeen-proving-grounds` at `d784b26ba2ba6acaae3606b8bfe2ebcbca9b69db`; HEAD has 1 exclusive commit, branch has 0 |
| B | `https://github.com/zanyfrog/ui-base.git` | `origin/codex/action-icon-support` at `7086948f8cbd9216e76f818c0373e055dd5127b1`; HEAD has 1 exclusive commit, branch has 3 |

`git fetch --all --tags` succeeded for each repository. No merge, rebase, reset, checkout, push, pruning, stash application or change discard was performed. Process-local `git -c safe.directory=<exact repository>` was needed for the two sibling repositories because of the sandbox account's different ownership; global Git configuration was not changed.

### Relevant history and synchronization conclusions

- D `972eab3`: initial Data Services implementation; `a6ebfbf`: versioned schema/trigger services and architecture; `fa3601a`: schema/trigger HTTP services; `d68075a`: check-in helper.
- D `d784b26`, titled “changes made, I may not have had the most current here,” adds `packages/schema-application/{README.md,package.json,src/index.ts,tests/state-store.test.ts,tsconfig.json}` and updates root manifest/build order and lockfile. D `313b7e0` merges that branch. Comparing the merge to its first parent shows **no changes to existing dataset-operations or schema-manager source**. The merged branch's work is present; no evidence warrants reapplying it.
- D reflog records a fast-forward from `d68075a` to `313b7e0` on September 26 at 19:59 EDT. P reflog records its fast-forward to `b8e495d` at 19:35 EDT. These updates predate this audit.
- P `ed44145` adds Artifact Foundation; `27e1b95` adds v1.1 watching; `082dcbd` adds application build/migration/deployment; `bffb107`, `397e856`, and `b8e495d` advance the artifact editor. They are not DS0-WP1 commits.
- B's alternative branch has `4fc1549` (action icons), `2fcb6cf` (action group registration), and `7086948` (check-in hardening). `git cherry` reports all three as non-equivalent patches relative to HEAD. The branch also differs in hero/component metadata. **UNKNOWN:** whether these should be incorporated. They are not identified as DS0 prerequisites and were not merged automatically.
- All local branches were enumerated: one per repository. Their upstream symmetric differences contain no commits. Stash lists and staged/unstaged diffs are empty. No revert-labelled DS0/schema-application history was found. Patch/content evidence does not show a duplicated or reverted state-store implementation.
- `git fsck --full --no-reflogs` found no corruption. P has eight dangling trees, no reported dangling commits; D and B reported no findings. Dangling trees alone do not establish missing work.
- D's architecture bundle last changed at `a6ebfbf61413e61af00ca2ea395c987ccfbf1bbd`; the new state-store commit does not update it. Available branches contain the observed documents, but no complete DS0 plan. Unpushed work on another machine, unpublished documents, and deleted/unadvertised remote refs remain **UNKNOWN**.

### Packages and dependency resolution

| Consumer | Local dependency / contract | Observed resolution |
| --- | --- | --- |
| P | `@uib/platform-core` and `@ui-platform/artifacts` | Workspaces, both 0.1.0; built exports resolve |
| P | 11 `file:../ui-base/packages/...` packages | Links to B, not copied independent versions |
| P artifact schema adapter | D `packages/schema-manager/src/index.ts` | Test-time source inspection, default sibling path or `UI_DATA_SERVICES_ROOT`; no runtime package dependency |
| P trigger adapter | Structural `CentralTriggerRegistry.list(appId)` | Caller injects registry and registration-to-artifact mapping; real D registry passed a probe |
| D DOE | `@ui-platform/orm`, `@ui-platform/i-am` | Exact 0.1.0 workspace dependencies |
| D schema application | `@ui-platform/orm`, `@ui-platform/schema-manager` | Exact 0.1.0; imported types; no runtime activation composition |
| D schema manager | ORM and versioned-definition-registry | Exact 0.1.0 |
| D trigger manager | versioned-definition-registry | Exact 0.1.0; not consumed by DOE |

All seven D package manifests use version 0.1.0 and root exports pointing to `dist/index.js` / `dist/index.d.ts`. Package version alone cannot distinguish the old baseline from the added WP1 state store; retain the repository SHA. No `@ui-platform/data-services` aggregate package exists.

P's installed UI Base versions: assets 0.1.17, calendar 0.2.0, core 0.1.0, design-system 0.1.0, forms 0.1.0, hero 0.2.3, icons 0.1.0, theme 0.1.0, tour-ui 0.1.1, ui 0.5.1, ui-layout 0.1.0.

Node is 24.19.0, npm 11.17.0. P uses TypeScript 7.0.2, artifacts' nested TypeScript 6.0.3, Vite 8.2.2, Vitest 4.1.11, tsx 4.23.12 and Node types 26.4.0. The two TypeScript versions satisfy different declared ranges; this is not a duplicate Data Services package. P's `latest` declarations make the lockfile important. D declares `packageManager: npm@10`; the temporary locked install under npm 11 resolves TypeScript 5.9.3, Vitest 3.2.7, tsx 4.23.13 and Node types 22.20.2. Validation proves this observed combination, not npm 10 or every supported Node version.

`npm ls --depth=0` succeeds for P, but `npm ls --all` exits 1: ten required dependency edges inside linked UI Base packages are unresolved from B, whose `node_modules` is absent. These include forms -> core/ui, assets -> ui, hero -> assets/ui, icons -> core, theme -> design-system, and ui -> core/hero/tour-ui. A `createRequire` resolution probe succeeds from P but returns `MODULE_NOT_FOUND` for core/ui from the real forms package path. P's Vite configuration deliberately uses `preserveSymlinks: true`, explaining why its bundle can still pass. Missing optional packages for other operating systems or optional Vitest features are not classified as defects.

## 3. Architecture reconciliation

Primary D sources are under `_architecture_v2/UI_Platform_Data_Services_Architecture_V2/`: the README, `Dataset_Operation_Manager_Architecture.md`, `ORM_Architecture.md`, `I-AM_Architecture.md`, and `UI_Platform_Data_Services_Versioned_Definitions_Architecture.md`. The last document calls itself an implementation addendum, not proof that all specified functionality has shipped.

| Boundary | Actual implementation | Reconciliation |
| --- | --- | --- |
| DOE versus ORM | DOE gets an ORM definition, asks I-AM, applies defaults/required checks, invokes triggers and ORM writes. ORM stores JSON arrays and in-memory definitions/cache. | Basic ownership is recognizable. Full schema validation, accurate failure/commit reporting and transaction guarantees do not match the broader architecture. |
| Transactions | ORM stages per transaction; commit persists each file separately. DOE does not call rollback in its catch path; a caught child failure can be returned rather than propagated as an exception. | No crash-safe multi-file atomicity or writer fencing. P's application-build integration document already acknowledges this limitation. |
| Central triggers | DOE's `TriggerRegistry` stores registrations in the system dataset `ui-platform/trigger_definitions`; handlers are trusted in-memory functions indexed by handlerId. | App/dataset filtering and enabled phases work. This remains the runtime registry. |
| Trigger versioning | `TriggerManager` stores file-backed draft/published definitions separately. Its definition type includes `key`, while the runtime type includes name/timestamps. | No publish-to-runtime bridge or shared exported trigger type. Publishing a trigger does not register it for execution; a real probe confirmed separate inventories. This is unfinished integration, not a new deletion in WP1. |
| Dataset definitions | `SchemaManager.DatasetSchema` has permanent dataset/field IDs and mutable keys; VDR stores drafts and sequential versions. ORM definitions instead use field names/types and an optional schemaVersion string. | An explicit conversion/verifier is needed. Schema application documents `id` -> required ORM string primary key; it does not implement that verifier. Namespaces are explicitly rejected because schema-manager keys omit them. |
| Version integrity | VDR's digest uses `JSON.stringify(value, Object.keys(value).sort())`. | The replacer list filters nested keys too. Nested fields/labels can change without changing the digest. This violates published integrity and clean/modified semantics now, not a future feature. |
| Applied state | `EnvironmentSchemaStateStore` persists environment-scoped records and a ledger: applying -> verified-pending-activation -> applied, plus recovery-required. | WP1 state store exists. `AppliedSchemaResolver`, `OrmSchemaVerifier`, `RuntimeSchemaActivator` and `SchemaApplicationManager` are interfaces only. No actual ORM check, reload or health check runs when marking applied. |
| Recovery/durability | Exclusive `wx` lock, lock-file sync, pending journal, temporary-file rename, current/before/next checksum decisions. | No state/journal file sync, startup stale-lock recovery protocol, or implemented operator recovery service. State validation checks only outer shape, not record invariants. Existing tests cover selected journal cases and same-process lock contention, not power loss or competing processes. These are WP2 investigation/implementation areas, not assertions of WP1 regressions. |
| Security | Library I-AM uses allow grants; HTTP entry points use a loopback-only development bearer token. Operations accepts actor in request data. | Appropriate evidence for a trusted development boundary only. UI editor fixture sessions are a different authorization mechanism. Record-scoped writes are currently unsafe; no production identity integration was demonstrated. |
| Validation | DOE applies required/default fields but does not enforce declared field types; restore falls through to ORM delete. | Required/default handling is implemented. Comprehensive validation is incomplete; destructive dispatch of an advertised operation is a present defect. |
| Logging/errors | DOE returns operation/correlation IDs. HTTP execution failure can still be status 200 with success=false; thrown errors generally become text 400. `String(error).split(':')[0]` frequently returns `Error`. | No persistent DOE operation/security audit was found. Startup console logs and P's separate artifact log do not satisfy D's full audit architecture. Clients must inspect result bodies. |
| UI/CLI | P edits artifact source through ArtifactService; CLI delegates to the same artifact/application services and a caller-supplied `createTooling` module. | Form/page/component editing does not establish dataset execution. No built-in DS0 schema-application UI, CLI, or registered runtime service was located. |

### Conflicts requiring explicit decisions

1. **Published versus applied schema:** the older versioned-definitions addendum says DOE consumes the active schema through Schema Manager and coordinates publication with migration. WP1 introduces environment-specific applied state and pending activation, but DOE still reads manually registered ORM definitions. The owner must confirm how the recovered DS0 plan refines the older active-schema rule; this audit does not select an architecture silently.
2. **Two applied-state mechanisms:** P `packages/artifacts/src/application/json-provider.ts` persists migration baselines/ledger in `.uib/environments/<environment>/migration-state.json`; D WP1 persists `environments/<environment>/schema-application/state.json`. P's build `schemaGate` uses its migration provider, not D's applied-state resolver. These are separate existing stores, not duplicate npm installs. Their authority and adapter relationship must be established before activation can be advertised as end-to-end.
3. **Trigger ownership versus consumption:** D's architecture says DOE consumes Trigger Manager runtime definitions. Current DOE uses its central ORM registry independently. P intentionally adapts that registry and requires explicit artifact mappings. Do not replace it with artifact scanning or a second runtime registry to hide this gap.
4. **Documentation overclaims:** D README mentions a nonexistent aggregate `@ui-platform/data-services` package and describes audit capability beyond the code. The VDR package's `dev` script targets nonexistent `src/service.ts`; root `dev:definitions` delegates to it. These do not invalidate the working library exports, but the service instructions need correction after review.
5. P `data-architecture.md` prohibits ordinary packages' direct filesystem access, while the later artifact/application architecture defines service-owned filesystem adapters. Treat the latter as explicit service boundaries; do not infer permission for application components to bypass DOE. No new exception was introduced here.

## 4. Integration and communication verification matrix

| Path | Evidence | Outcome / limit |
| --- | --- | --- |
| Browser-facing P -> P API -> ArtifactService | Existing real-server and real Vite-proxy tests in `tests/editor-security-server.test.ts` | Passed in unsandboxed contract run: session authorization, scoped discovery, production route exclusion. Not a browser walkthrough or DOE communication test. |
| P schema adapter -> actual D schema source contract | `packages/artifacts/tests/schema-adapter-compatibility.test.ts` | Passed structural TypeScript equality and pure validator compatibility. Reads source; deliberately does not load D publication/ORM runtime. |
| P build adapter -> real D central TriggerRegistry | Temporary probe imports P's built `activeTriggerArtifactIds` and D's actual registry/ORM | Passed explicit enabled-registration-to-artifact mapping across the two repositories. In-process library integration only. |
| D DOE -> real I-AM -> real ORM -> real trigger handler -> persisted read | Existing operation-manager integration test | Passed allowed insert, beforeInsert mutation, disabled-handler exclusion and query of stored row. Narrow happy-path coverage. |
| D Schema Manager HTTP | Temporary compiled process; unauthenticated request, PUT draft, POST publish, GET active | 401 without token; draft 200, publish 201, active version 1 read back. Real HTTP and temporary disk storage. |
| D Operations central registry HTTP | POST disabled trigger, GET app/dataset triggers | 201 and readback of one registration. Does not validate handler deployment or execution over HTTP. |
| D ORM/I-AM/Operations/Schema/Trigger health | Five compiled processes on ephemeral ports | All HTTP 200; health only establishes process availability. All five audit processes terminated afterwards. |
| Remote ORM registration + I-AM grant -> Operations | POST dataset to ORM and grant to I-AM, then POST Operations insert | Setup returns 201/204; Operations returns HTTP 200 with success=false and `Dataset audit.person is not registered.` Separate in-process instances/default stores; no HTTP adapters connect them. |
| Trigger publication -> DOE trigger invocation | Real TriggerManager publishes `published-only`; query real runtime registry | Published ID absent from runtime inventory. Bridge not implemented. |
| Published schema -> ORM registration/reload -> applied schema -> UI form execution | Source trace | Not implemented/verified. Interfaces and saved state are insufficient evidence. Treat as future integration pending exact DS0 scope. |
| P migration CLI/UI -> D applied-state runtime | Source trace of CLI, provider and schemaGate | No shared composition found. CLI requires a tooling module; no assumed live Data Services connection. |
| Failed operations -> caller/error log | Real afterCommit probe plus source | Persisted row with committed=false; generic `Error` code. Logging/commit truthfulness incomplete. |

Normal implemented library write path: request -> ORM definition lookup -> I-AM authorize -> normalize/required checks -> begin/join transaction -> before trigger -> ORM insert/update/delete -> after trigger -> commit root -> afterCommit. Trigger child operations reuse actor/correlation lineage and the supplied transaction. Query path: definition -> I-AM field authorization -> combine record scope with filter -> ORM query. Neither path currently resolves WP1 environment-applied schemas.

Operations service initialization registers only I-AM datasets and the central trigger dataset. There is no business-dataset registration route or handler-module loader there. The separate ORM registration route mutates that process's memory only. Merely aligning data directories would not fix metadata isolation and would introduce concurrent-cache/writer risks.

## 5. Tests and evidence

No tracked source, manifests, lockfiles, architecture decisions, or existing tests were modified. P's existing builds generated ignored outputs. Dependency installation, new probes and Data Services builds ran only under T. SHA-256 comparison of all **48 copied tracked package/configuration files** against D found zero mismatches after validation. Original D and B remained clean. No real application datasets were used.

### Command record

Commands below use the aliases defined above. Git inspection commands were run per relevant repository with an exact-path, process-local safe.directory setting where needed.

| Command / location | Result |
| --- | --- |
| `rg --files`, `rg -n` for DS0, WP1/WP2, acceptance, imports, ports, services, triggers and schemas; directory/package inspection | Inventories and source traces reported above; no applicable AGENTS.md found |
| `git rev-parse --show-toplevel HEAD`; `git status --porcelain=v1 --branch`; `git branch -avv`; `git remote -v`; `git worktree list --porcelain` | Three independent repos; one local branch/worktree each; clean initial state |
| `git submodule status` in P | Failed: missing Git shell helper utilities; `git ls-files --stage` found no gitlinks in any repo |
| `git fetch --all --tags` in P/D/B | Exit 0 for all; refs fetched, no working branch movement |
| `git rev-list --left-right --count HEAD...@{upstream}`; `git log --left-right --oneline HEAD...@{upstream}` | 0/0 and no divergent upstream commits for all three |
| `git stash list`; `git diff --stat`; `git diff --cached --stat`; recent `git log` / `git reflog` | No stashes or local changes; history evidence in section 2 |
| D `git show --stat d784b26`; `git diff 313b7e0^1 313b7e0 -- packages/dataset-operations packages/schema-manager` | Seven-file WP1 addition; no changes to those two established packages |
| `git fsck --full --no-reflogs` | No corruption; P dangling trees only |
| B `git log --left-right --oneline HEAD...origin/codex/action-icon-support`; `git cherry HEAD origin/codex/action-icon-support` | One versus three commits; three non-equivalent branch patches |
| P `node --version`; `npm --version` | 24.19.0 / 11.17.0 |
| P `npm ls --depth=0` | Exit 0; local package links resolve at root |
| P `npm ls --all` | Exit 1, ten missing required UI Base transitive edges; see section 2 |
| Node `createRequire` resolve probe from P and B forms package | P succeeds; real forms path cannot resolve core/ui |
| P `npm run typecheck` | Exit 0 |
| P `npm run build` | Exit 0; 138 Vite modules; 635.91 kB client JS warning, not failure |
| P `npm test` | Exit 1; 25/27 files, 175/178 tests pass; two sandbox `uv_os_get_passwd`/ENOMEM failures and watcher EPERM |
| P `npm run check:editor-contracts`, outside sandbox | Exit 1; 12/13 files, 102/103 tests pass; only watcher rename fails. Server/proxy tests pass |
| P `node scripts/check-editor-production.mjs`, after build | Exit 0; no fixture selector/session client/editor transport in production client |
| D `npm ls --depth=0` | Exit 1, ELSPROBLEMS; seven workspace packages and four development dependencies missing |
| D `npm run typecheck`; `npm run build`; `npm test` | Each fails: tsc/vitest not installed; not proof of source compilation/test failure |
| T/data-services `npm ci --ignore-scripts --no-audit --no-fund --cache T/npm-cache` | Exit 0; 62 packages installed from copied lockfile; original checkout untouched |
| T/data-services `npm run build`; `npm run typecheck` | Exit 0 for all seven workspaces; build run first to emit dependency exports |
| T/data-services `npm test`, sandboxed | Exit 1 before tests: esbuild configuration loading denied filesystem access |
| T/data-services `npm test`, outside sandbox | Exit 0; 4 files, 8 tests pass |
| T/data-services `node node_modules/vitest/vitest.mjs run packages/schema-application/tests/state-store.test.ts`, outside sandbox | Exit 0; 4/4 focused tests pass |
| T/data-services `npm ls --depth=0` | Exit 0; workspace dependencies deduplicated correctly |
| `node T/data-services/audit-probes.mjs` | Exit 0, observations below; zero exit means the probe completed, not that all observed product behavior was correct |
| `node T/data-services/audit-http.mjs` | Exit 0; HTTP assertions and service-isolation observations in section 4; all spawned services stopped |
| `Get-FileHash` comparison of 48 D/T tracked files; final Git status/diff checks | No copied-source mismatch; no pre-existing tracked files changed |

No dependency upgrades, automatic fixes, real migrations, production deployments, or package installation in P/D/B were performed. npm's sandbox log-directory warning was also observed; it is separate from the missing-dependency diagnostics.

### Focused runtime observations and reproduction cases

1. **Checksum:** publish a valid person schema; change `fields[0].type` from `id` to `string` and `dataset.name`; replace draft. `sameChecksum=true`, draft state=`clean`. Write the altered definition to that temporary published version; `verifyIntegrity` returns `{valid:true, errors:[]}`. Both mutations are nested keys excluded by VDR's replacer list.
2. **Commit truth:** register a real enabled afterCommit handler that throws; execute an authorized insert. Result is success=false, committed=false and one failed record, but a direct ORM query returns the inserted row. This matters for retry and recovery decisions.
3. **Record scope:** grant u1 writes scoped to `owner == u1`; insert/update an `owner == u2` row. Both proceed; the update returns success=true. The insert also accepts a string in a number field. Query scoping does not compensate for write authorization omissions.
4. **Restore:** grant restore, insert row `one`, then execute restore with `{id:'one'}`. Result is success=true, committed=true, and the row disappears. Source uses an insert/update/else-delete ternary; there is no unsupported-operation guard.
5. **Trigger definitions:** publish an enabled TriggerManager definition; it is absent from the runtime TriggerRegistry. P's active-trigger adapter does work when given an actual explicitly mapped runtime registration.
6. **Activation:** begin application, mark verified using supplied metadata, then mark applied with a health-check description that was never executed. Store reports applied. This demonstrates a state-only API, as WP1 documents, not a failing implemented activator.

Existing state-store tests exercise environment isolation/pending phase, identity/reference/namespace rejection, a journal matching durable state, and mismatched-journal gating plus in-process contention. They do not assert real activation, restart health, rollback safety, crash-point durability, multiple-process contention, recovery from a dead process's lock, or successive schema-version application. Those acceptance claims remain unproven.

Detailed local logs are retained under T: `platform-typecheck.log`, `platform-build.log`, `platform-test.log`, `platform-contracts.log`, `platform-production.log`, `platform-dependencies.log`, `ds-install.log`, `ds-build.log`, `ds-typecheck.log`, `ds-test.log`, `ds-test-unsandboxed.log`, `ds-state-tests.log`, `ds-probes.log`, and `ds-http.log`. Probe scripts remain in T/data-services. These temporary files may be cleared by Windows; this report preserves the material cases and outputs. No browser end-to-end walkthrough, power-loss experiment, or production-runtime communication was performed.

## 6. Missing or conflicting changes and finding classification

BLOCKER means resolve before proceeding with DS0-WP2 on an asserted reliable baseline. WARNING permits proceeding only with the stated limitation accepted. UNKNOWN identifies missing evidence; it must not be silently converted into an implementation requirement.

| ID | Classification | Finding and smallest safe corrective action |
| --- | --- | --- |
| B1 | **BLOCKER** | D's actual checkout cannot build/run because dependencies and emitted exports are absent. After approval, install from its existing lockfile using the agreed npm version, build in declared order, then rerun its tests/typecheck in place. Do not upgrade packages or replace the lockfile as an incidental fix. |
| B2 | **BLOCKER** | Published schema identity is not trustworthy because VDR omits nested content from checksums. Fix canonical hashing in that package, add nested-change/tamper regression coverage, and inspect any existing published metadata before choosing a compatibility/reindex procedure. Do not silently rewrite published history. |
| B3 | **BLOCKER** | DOE commit results can claim no commit after persistence; rollback is absent in its error path. Separate post-commit failure from uncommitted failure, report actual commit state, and retain/rollback owned transactions on pre-commit failure. Add failure-path tests, including child-operation propagation. Until then, activation/recovery must not trust success/committed alone. |
| B4 | **BLOCKER** | Existing DOE public operations permit restore-as-delete and ignore write record scope. Minimum repair: fail closed for unsupported operations; enforce applicable record scope before writes. Add focused real ORM/I-AM regression cases. Do not implement a new restore feature merely to remove the destructive fallback. |
| W1 | **WARNING** | Windows artifact-watcher directory rename EPERM persists in both full and contract runs. Existing open report already records it. Accept an explicit limitation for state-store-only work; investigate handle lifetimes before relying on watched rename/reload behavior. Never label the complete platform suite green. |
| W2 | **WARNING** | UI Base linked packages lack transitive resolution from their real paths. P's Vite preserveSymlinks path works. After approval, provision B from its lockfile and rerun full dependency/consumer checks before direct Node or other-toolchain use. This becomes a blocker if WP2 depends on those paths. |
| W3 | **WARNING** | HTTP service shells are independent; UI Platform does not compose a business DOE runtime. No automatic schema/trigger publish-to-runtime bridge exists. Use only an explicitly selected composition for future tests; do not interpret five healthy services as functioning inter-service communication. |
| W4 | **WARNING** | ORM multi-file commit and caches are not a coordinated atomic runtime; no writer fence/invalidation API exists. P already requires stopped writers/restart for offline migration. Preserve that limitation; don't introduce concurrent migration/activation assumptions. |
| W5 | **WARNING** | README/service-script overclaims, limited validation, generic errors and missing operational audit remain. Correct documentation and agree the runtime logging/error contract before presenting production readiness. |
| U1 | **UNKNOWN** | Complete approved DS0 plan and conditional WP1 acceptance conditions unavailable. Obtain or explicitly ratify them at review; three recovered objectives are insufficient to certify all prerequisites. This evidence gap independently prevents an unconditional go decision. |
| U2 | **UNKNOWN** | Intended UI Base feature branch and any unpushed other-machine changes. Confirm branch intent; do not merge speculative fixes. No evidence that these are required for DS0. |
| U3 | **UNKNOWN** | Relationship of P migration state, D applied-schema state, active publication and central trigger lifecycle. Recover the decision or approve a narrow reconciliation before wiring activation. Do not create another authority or silently retire either existing store. |
| I1 | **INFORMATION** | WP1 state-store package is present, merged, and its reported test counts reproduced in an unchanged temporary source copy. No missing WP1 source change identified. |
| I2 | **INFORMATION** | Actual resolver/verifier/activator, runtime reload, safe operational recovery, and stronger crash/concurrency tests are explicitly absent/future. Absence alone is not a WP2 regression or a reason to implement them during preflight. |
| I3 | **INFORMATION** | Exact upstream branch synchronization is confirmed. Separate compiler versions and optional cross-platform dependencies are not evidence of duplicate Data Services implementations. |

B2–B4 are pre-existing defects in established code; the schema-application merge did not introduce them. Blocking use of that baseline for trustworthy activation/recovery does not retroactively invent new WP1 acceptance criteria. If the complete recovered plan explicitly fences out one of these paths, the reviewer may document and narrow the prerequisite accordingly; that decision has not been assumed here.

## 7. Proposed repairs in dependency order

These are proposals only. None has been implemented.

1. **Recover/ratify authority (U1, U3):** identify the complete WP1 conditions and WP2 plan, including which runtime is reloaded, what applied means, state-store ownership, failure behavior and recovery authorization. Preserve the distinction between DS0, Form Builder WP1A and artifact-editor work.
2. **Provision the chosen baseline (B1; W2 as needed):** retain the recorded Git SHAs; install locked D dependencies and build exports. Provision UI Base if the chosen execution path needs its native resolution. Recheck status and lockfile integrity. Resolve the feature-branch question without assuming main or master is intrinsically authoritative.
3. **Repair identity integrity (B2):** correct the generic digest and test real nested schema changes/tampering. Inspect existing version data and review any migration of checksum metadata separately before a new verifier relies on it.
4. **Repair existing execution safety (B3, B4):** reject unsupported restore, enforce write record scope, and make transaction/failure reporting truthful. Verify before/after/afterCommit failures and nested operations with real storage. Do not advertise multi-file atomicity the ORM cannot supply.
5. **Record accepted operating limits (W1, W3–W5):** keep offline writer quiescence, explicit handler/registry composition and current service isolation visible. Investigate the watcher only in the scope needed for the chosen reload design. Correct misleading instructions without rewriting architecture by implication.
6. **Repeat the readiness checks:** run D's build/typecheck/eight existing tests in its actual checkout, the new targeted defect tests after approved repairs, P's relevant compatibility/HTTP checks, and the dependency-resolution checks. Keep unresolved watcher results explicit. Review the resulting evidence before authorizing WP2 implementation.

The recovered WP2 objectives—actual activation/reload verification, safe recovery, and stronger durability/concurrency testing—come **after** this preflight review and baseline decision. Their design or implementation is not part of the repairs performed here, because no repairs were authorized by this request.

## 8. Explicit DS0-WP2 readiness assessment

| Prerequisite dimension | Assessment |
| --- | --- |
| Available remote Git synchronization | Verified for all three tracking branches; DS0-WP1 branch merged |
| Presence of recovered WP1 source/contracts/tests | Verified |
| Reproduction of recovered WP1 narrow validation counts | Verified in isolated copy: 4 focused / 8 total, build/typecheck pass |
| Main-machine Data Services executable setup | Not ready: dependencies/build outputs absent |
| Correct schema identity and operation failure semantics | Not ready: reproduced defects B2–B4 |
| UI Platform core build/typecheck | Pass |
| Complete platform regression/Windows baseline | Not green; watcher failure persists; linked dependency limitation documented |
| Actual P-to-D business runtime communication | Not established; no existing composition found |
| Complete approved DS0 prerequisites/acceptance conditions | Unknown; recovered objectives are provisional |

**Decision: HOLD.** The repositories contain the recovered WP1 state-store work and appear synchronized, but this is not a clean or fully verified runtime baseline for DS0-WP2. Review the blockers, recovered requirements and architecture ownership questions before approving any corrective work or WP2 start.

The only repository addition from this audit is this report. Existing tracked files, branches, architecture and application data were preserved. Temporary validation outputs and ignored build products were created; fetched remote metadata was refreshed. No repairs, merges, rebases, resets, pushes, change discards or DS0-WP2 implementation were performed.
