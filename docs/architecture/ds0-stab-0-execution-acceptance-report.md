# DS0 STAB-0 execution and acceptance report

Date: September 27, 2026, America/New_York. Execution completed at 13:47 EDT; preservation checks at 13:48 EDT.

**Result: STAB-0 technical acceptance checks PASS. Stopped for user acceptance. STAB-1–3 and DS0-WP2 have not begun.**

## 1. Scope and outcome

Executed only the approved STAB-0 from `docs/architecture/ds0-baseline-stabilization-repair-plan.md`, using the September 26 preflight as the comparison evidence. Installation, build, typecheck, existing tests and focused tests ran in the **actual** `C:\Projects\Modular\UI Platform Data Services` checkout, not the earlier temporary source copy.

- Locked dependency installation succeeded: 62 packages installed.
- All seven workspaces built and typechecked successfully.
- Existing suite: **8/8 tests across 4 files**, no failures or skips.
- Focused schema-application suite: **4/4 tests in 1 file**, no failures or skips.
- Counts match the preflight exactly. There is no count discrepancy to investigate.
- Data Services remains Git-clean; all 56 pre-existing non-generated files retain their hashes. The lockfile is byte-identical.
- npm 10.8.2 was used locally, including nested build invocations. Global npm remains 11.17.0.

These checks close the local dependency/build prerequisite B1 for this recorded checkout/toolchain. They do **not** repair or close B2 checksum integrity, B3 transaction-result correctness, or B4 operation/scoped-write defects. The existing eight tests do not cover those defects. Passing STAB-0 does not establish production safety, inter-service communication, complete WP1 acceptance conditions, or DS0-WP2 readiness.

## 2. Baseline and preservation record

Aliases: P = `C:\Projects\Modular\ui-platform`; D = `C:\Projects\Modular\UI Platform Data Services`; B = `C:\Projects\Modular\ui-base`.

| Repository | Audited SHA = before SHA = after SHA | Branch / upstream | Before and after |
| --- | --- | --- | --- |
| P | `b8e495d94e9a49cc0122d5075f621a3ca609be52` | main / origin/main | No tracked/staged changes. Pre-existing untracked audit and plan retained; this report and evidence directory added. |
| D | `313b7e0c64e8e93f75632bb9dc015614d7709668` | master / origin/master | Clean before and after; ignored dependencies and compiled outputs added. |
| B | `96898f73809272e680fcb3402f064a039fff4350` | main / origin/main | Clean before and after. |

No fetch, merge, rebase, reset, checkout, commit, push, stash operation or reference change was performed. No global safe.directory entry was added; sibling Git reads used the exact repository as a command-local setting.

**D package-lock.json SHA-256, before and after:**

```text
84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F
```

The runner checked this hash after installation and each successful execution stage. Post-run comparison checked **56 existing files**, excluding `.git`, `node_modules` and generated `dist` directories: zero changed/missing files and zero unexpected non-generated files. No tracked manifests, source, tests, architecture documents or lockfiles changed.

D had no local `data/` directory before execution and still has none. All existing test files were inspected for their temporary-root setup: they use `mkdtemp` under the OS temporary directory. No application service, migration, publication command or existing deployment data root was used. This establishes preservation within the inspected checkout and executed paths; it is not an inventory of published histories on other machines or external deployments.

The original audit remains unchanged with SHA-256 `F4770FFC052B0C308190F578FB9E87E72E8DD14CAD3A4AA46AD28414C2162F9B`. The repair plan also remained unedited. Their post-run hashes are recorded in the evidence directory.

## 3. Toolchain and local npm isolation

| Item | Observed value |
| --- | --- |
| Node executable | `C:\Program Files\nodejs\node.exe` |
| Node version | 24.19.0 |
| Global npm, before / after | 11.17.0 / 11.17.0 |
| Approved execution npm | 10.8.2 |
| Local npm location | `C:\Users\zanyf\AppData\Local\Temp\ds0-stab0-npm-10.8.2\package` |
| npm 10.8.2 declared Node engines | `^18.17.0 || >=20.5.0` |
| Compatibility result | npm's bundled semver library confirms Node 24.19.0 satisfies the range; CLI and actual workloads execute successfully |
| TypeScript / Vitest / tsx | 5.9.3 / 3.2.7 / 4.23.13 |
| Node types | 22.20.2 |
| Data Services packages | Seven linked 0.1.0 workspaces, dependency edges deduplicated |

npm metadata was retrieved from `https://registry.npmjs.org/npm/10.8.2`; its tarball was downloaded to the temporary tool directory and verified against the metadata's SHA-512 integrity value before extraction:

```text
sha512-x/AIjFIKRllrhcb48dqUNAAZl0ig9+qMuN91RpZo3Cb2+zuibfh+KISl6+kVVyktDz230JKc208UkQwwMqyB+w==
```

No global installation/update command was used. An explicit temporary `npm.cmd` launcher invokes the approved CLI using the installed Node executable. Its directory was prepended to PATH only in the execution process. A temporary Node preload recorded npm process version/path/arguments and rejected unexpected versions: **all 13 traced npm invocations used 10.8.2**, including the seven nested workspace build commands. The initial install separately invoked that exact CLI directly. The preload only recorded audit evidence; it did not modify repository code or test assertions.

Hashes of the global npm launchers, manifest and CLI entry file were unchanged. This is a check of four selected global files plus unchanged global version, not a full operating-system integrity audit.

## 4. Commands and results

All npm commands below ran with cwd **D**. `npm` in the table means:

```text
"C:\Program Files\nodejs\node.exe" "C:\Users\zanyf\AppData\Local\Temp\ds0-stab0-npm-10.8.2\package\bin\npm-cli.js"
```

| Command | Exit / result |
| --- | --- |
| `npm --version` | 0; 10.8.2 |
| `npm ci --ignore-scripts --no-audit --no-fund` | 0; 62 packages installed in approximately seven seconds; no lifecycle-script enablement needed |
| `npm ls --depth=0` | 0; all seven workspace packages and declared development dependencies resolve |
| `cmd.exe /d /c "npm --version"`, with explicit local launcher first on PATH | 0; 10.8.2 |
| `npm run build` | 0; orm, i-am, versioned-definition-registry, schema-manager, schema-application, trigger-manager, dataset-operations all build |
| `npm run typecheck` | 0; all seven workspace typechecks pass |
| `npm test` | 0; 4 files / 8 tests pass |
| `npm exec --offline -- vitest run packages/schema-application/tests/state-store.test.ts` | 0; 1 file / 4 tests pass; offline prevents fetching a replacement test runner |

The build ran before typecheck/tests to emit package exports. Installation and execution used the host permission needed to write the sibling checkout and avoid the preflight's sandbox identity/config-loader failures. No test source was modified, skipped or retried to obtain these passing product results.

### Audit harness failures, retained rather than hidden

Two preparatory version-check attempts failed; neither was a Data Services test/build failure:

1. `npm exec -- cmd /d /c "npm --version"` was incorrect: npm began resolving registry package `cmd@1.0.0` rather than invoking the Windows shell. The process was interrupted (exit 1). Inspection found registry metadata fetches in the isolated npm cache, no package manifests under its `_npx` directory, no matching live process afterward, and an unchanged checkout/lockfile. This failed command is not used for reproducibility.
2. A subsequent direct shell check failed (exit 1) because the audit preload's Windows path lost backslashes in `NODE_OPTIONS`. Inspection also showed the extracted npm.cmd template assumes an installed directory layout. The harness was corrected to use forward slashes in the preload path and an explicit temporary launcher. The corrected check passed before the build began.

No additional registry package is reported as successfully installed or executed by these checks. These harness mistakes did not require dependency reinstall or a product repair. Their output and exit records remain in the evidence folder. The initial sandbox process-inventory query was denied; a read-only elevated query succeeded. The AGENTS.md search returned no matches (rg exit 1), not a validation failure.

Other completed checks: Git HEAD/status/staged and unstaged diff inspections; Node/global npm version/path reads; SHA-256 file inventories/comparisons; SHA-512 tarball verification; semver engine validation; inspection of test temporary-root usage and legacy-checksum call paths. These checks produced the results described above and below.

## 5. Test-count reconciliation

| Existing file in D | Preflight count | Actual-checkout count | Result |
| --- | --- | --- | --- |
| `packages/dataset-operations/tests/operation-manager.test.ts` | 1 | 1 | Pass |
| `packages/schema-manager/tests/schema-manager.test.ts` | 1 | 1 | Pass |
| `packages/trigger-manager/tests/trigger-manager.test.ts` | 2 | 2 | Pass |
| `packages/schema-application/tests/state-store.test.ts` | 4 | 4 | Pass |
| **Total** | **8** | **8** | **Exact match** |
| Separate focused schema-application run | **4** | **4** | **Exact match; not four additional unique tests** |

Full-suite duration was 601 ms; focused duration was 524 ms. The eight tests establish the same narrow baseline reported previously. No checksum, transaction-failure or scoped-write regression tests were added because STAB-1–3 implementation remains unauthorized.

## 6. Compatibility inspection retained for later STAB-1 review

Read-only source inspection confirms that blocking legacy histories has consequences beyond the explicit active-read endpoint:

- `SchemaManager.ensureStableDatasetId` calls VDR `getActive` before both draft creation and replacement. A blanket legacy rejection in `getActive` can therefore block **editing drafts**, not just executing published schemas. Trigger Manager has the analogous stable-ID guard. Any eventual STAB-1 design must distinguish unverified historical inspection, identity checks and integrity-verified consumption deliberately.
- `getActive` currently delegates to `getVersion`. Blocking at `getVersion` could also remove raw historical inspection. The plan's inspection-preservation intent requires a reviewed boundary; no replacement API has been implemented.
- VDR `rollback` currently writes the selected historical content to the draft **before** publication. A legacy rejection only inside publication would still mutate the draft. The guard must be designed before that first write if approved later.
- Integrity verification iterates every historical version. Mixed legacy/new-format history can remain unverified as a whole even when a new active version has a correct canonical checksum. The eventual report/consumer semantics must not imply that one valid new version validates old history.
- Old readers do not understand a new format discriminator. The existing schema-application state records `{version, checksum, schemaId}` without format metadata. Blocking or changing comparisons may make existing persisted references unusable; no checksum references were rewritten today.
- Current HTTP failure mapping does not have a specific legacy-unverified case. Introducing one changes observable behavior and needs compatibility tests. Global rejection of existing histories is an availability change, not merely a hashing implementation detail.

There is no default local D data directory to inventory, but that does not prove legacy histories are absent from configured external locations. Before implementing or deploying STAB-1, identify those roots and consumers and review the exact availability policy. No legacy history blocking, canonical hashing, metadata tagging, migration, republishing or trust conversion was implemented under STAB-0. Acceptance of the planning direction does not settle these compatibility choices automatically.

**Full record-scoped authorization remains a separate future work item.** The planned temporary rejection of scoped writes is containment only, not an implementation of authorized scoped insert/update/delete, grant composition or concurrent row enforcement. No rejection change was made today.

## 7. Preserved architectural and Windows limitations

The two applied-state authorities remain unresolved: P's migration provider/ledger at `.uib/environments/<environment>/migration-state.json` and D's schema-application state at `environments/<environment>/schema-application/state.json`. No ownership was selected and no bridge or state migration was added.

Trigger Manager publication and the central runtime TriggerRegistry remain separate. Their publication-to-registration integration was documented, not implemented. No service runtime, activation/reload path or DS0-WP2 recovery work was started.

The Windows watcher EPERM issue remains open exactly as documented in `docs/architecture/artifact-watcher-windows-rename-issue.md` and the preflight. STAB-0 did not run the UI Platform watcher suite, so it neither reproduced nor cleared that issue today. No newly introduced Data Services product failure occurred. The two audit-harness failures above are distinct from the watcher and from the preflight's sandbox errors. No assertion about the entire UI Platform regression gate being green is made.

## 8. Evidence and acceptance gate

Durable evidence is saved under `P/docs/architecture/evidence/ds0-stab-0/`:

- `commands.json`: executed npm commands, cwd, exit codes and available timestamps, including interrupted/failed checks.
- `install.txt`, `dependencies.txt`, `build.txt`, `typecheck.txt`, `tests.txt`, `schema-application-tests.txt`: command outputs.
- `npm-metadata.json`, `toolchain-verification.txt`, `npm-invocations.txt`: downloaded tool metadata, integrity/engine checks and actual child npm versions.
- `data-services-before.json`, `preservation-after.json`: the 56-file baseline and comparison result, including unchanged lockfile hash.
- `global-npm-before.json`, `git-and-tools-before.txt`, `git-and-tools-after.txt`, `source-reports-after.json`: Git/tool and report-preservation evidence. The before Git snapshot was recorded after creating the evidence directory; its untracked evidence entry is audit output, not a pre-existing product change.
- Failed-version-check output and the initial/corrected audit runners are retained for transparency; the initial runner contains the known failed diagnostic and is not a recommended rerun command.

**STAB-0 acceptance recommendation: accept the provisioning and unchanged-baseline validation for the recorded SHA and toolchain.** B1 is resolved locally; B2–B4 and the remaining architecture/compatibility questions remain open.

**STOP at the STAB-0 acceptance gate.** No automatic progression to STAB-1, STAB-2, STAB-3, or DS0-WP2 is authorized or performed. Existing published schema history and application data remain untouched.
