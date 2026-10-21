# Remaining Foundation regression verification — October 20, 2026

Status: blocked at the fresh execution-environment gate. The eight-file test selection was **not launched**. Foundation cleanup remains implemented but unaccepted.

## Scope and accounting

Static inspection verified the exact eight original files, their accepted hashes, and 55 literal test declarations without importing or executing the tests. There were no assertion, timeout, retry, production, generated-output or configuration changes.

| Original file under packages/artifacts/tests | Original cases | Passed | Failed | Not executed | Test native exit |
|---|---:|---:|---:|---:|---|
| application-build.test.ts | 7 | 0 | 0 | 7 | Not launched |
| artifacts.test.ts | 20 | 0 | 0 | 20 | Not launched |
| consumer-contract.test.ts | 5 | 0 | 0 | 5 | Not launched |
| migrations-deployment.test.ts | 9 | 0 | 0 | 9 | Not launched |
| security-definitions.test.ts | 2 | 0 | 0 | 2 | Not launched |
| watcher-fallback.test.ts | 1 | 0 | 0 | 1 | Not launched |
| watcher.test.ts | 5 | 0 | 0 | 5 | Not launched |
| windows-storage.test.ts | 6 | 0 | 0 | 6 | Not launched |
| Total, this authorization | **55** | **0** | **0** | **55** | Not launched |

The previous 24 graph and 58 cleanup cases remain separate historical passing evidence. None is counted as part of this execution. No functional checkpoint in the eight-file selection was reached. No test JSON exists because Vitest was never launched; `selection.json` and `accounting.json` preserve the static census and explicit not-executed accounting.

## Execution-environment record and stop

New evidence destination: `docs/architecture/evidence/foundation-remaining-verification-20261020/`. The coordinator reused the previously reviewed process-gate and hard-link capability scripts byte-for-byte. A query-only OS descendant observer was added to identify the unchanged tests' native PowerShell child as well as Node workers. It does not intercept filesystem calls, change test IPC, serialize callbacks, or instrument product locking.

Fresh host evidence recorded PID 38008, start `2026-10-21T02:18:03.9831936Z` (October 20 EDT), user `NIMO-LAPTOP\zanyf`, administrator false, elevation 0, AppContainer 0, medium integrity `S-1-16-8192`, NTFS. Executable: `C:\Users\zanyf\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\powershell\pwsh.exe`. Node: `C:\Program Files\nodejs\node.exe`, SHA-256 `3602f2bb1a10f2cbab4c36886218a33c1ab3db87290e73b033c46c77147d0237`. Exact executable and dependency hashes are in `execution-inputs.json`; permissions and boundary evidence are in `host-ready.json` and `pre-capability-review.json`.

The dedicated TEMP/TMP root was `C:\Projects\Modular\ui-platform\docs\architecture\evidence\foundation-remaining-verification-20261020\runtime-62f96480a04a4d4a8f2aba7164658966`, separate from real Component storage. No fixture was launched against it.

The coordinator started one capability process, then the descendant observer rejected `C:\WINDOWS\system32\conhost.exe`, which Windows created as a console-host descendant. The observed error was:

```
Exception: host-run.ps1:79
Unexpected descendant executable: C:\WINDOWS\system32\conhost.exe
```

The coordinator's catch path terminated its owned process tree and propagated the error; the shell recorded native coordinator exit **1**. The capability child's native exit was not retained because rejection occurred before the normal exit-record path. Do not substitute coordinator exit 1 for a measured capability-child exit. There is no capability result, Node process-gate context, approval, test-ready or test-go record. The capability stdout/stderr files are retained. No successful hard-link capability conclusion can be drawn from this attempt. Residual root and context inventories are in `after.json`. No retry or second capability attempt was made, and no tests were launched.

This is a demonstrated diagnostic-coordinator allowlist incompatibility with Windows console hosting, not a product regression or proof of native link denial. The prior native link success is historical evidence only. No new filesystem publication result or Foundation acceptance evidence was obtained.

An earlier launcher invocation referenced a nonexistent conventional PowerShell installation path and exited 1 before the coordinator started. It performed neither capability operations nor tests. Read-only census preparation also encountered an unavailable TypeScript AST API; it was replaced with a literal declaration census checked against the eight approved counts. These preparation failures did not alter source or tests.

## Preservation and evidence integrity

`before.json` records 2,709 UI source/evidence files, 158 Data Services files, 38 default Application files, dependency metadata, both Git HEADs/statuses and direct real-store identity evidence. `additional-application-before.json` records 55 files in `C:\Projects\Modular\builder-demo\apps` independently. `execution-inputs.json` freezes 127 source, dependency, launcher and executable inputs. `after.json` records the complete post-attempt comparison, direct real identity state, disposable residue and Git state. The adjacent changed-file inventory supplies exact new-file hashes and sizes.

Customer Summary Card was inspected only through direct filesystem reads: anchor `C:\Projects\Modular\ui-platform\components\customer-summary-card\component.visual.json`, key `d179aa405e5fabc10c0dcd063888480c115eb75f2ef03df9f74ce3ec26e0043e`. No Foundation reader, acquisition, recovery, unlink or reconstruction was invoked against it. Lock metadata/bytes, five roles, transaction directory, pending journal, guard and siblings are preserved in the before/after records. Access-time effects of reads are recorded rather than reset.

Post-attempt preservation completed successfully: **2,709 UI files, 158 Data Services files, 38 default Application files, 55 additional demo Application files, and 127 execution inputs** matched their measured hashes; no mismatches. Both Git HEADs matched the fresh baseline. UI HEAD was `197427b3c0c112754481e8daad83faa1b8b8b737`, Data Services HEAD `81b769eef3763d02343f5347888c26edab6ef7bc`. The earlier graph report recorded a different historical UI HEAD (`c86ecb3708fd619791b7f667b02b0c4c673bd686`); this report preserves that distinction. No Git mutation was performed during this task. The direct real-state comparison passed, including lock identity/bytes and five roles. The disposable runtime and process-context directories were empty. The umbrella checklist still contains **40 unchecked and 0 checked** requirements. No existing enumerated file changed; all new files are documentation or disposable verification/evidence helpers under this report's evidence directory.

The inventory is an enumerated source/evidence/application/dependency comparison, not a full-volume or exhaustive node_modules snapshot. No tests ran, and no test-generated cache state is attributed to this attempt. Process-list observations are bounded samples; the rejected console host's token was not verified and no inference that it was unsafe is warranted. Its identity was outside the explicitly reviewed allowlist. The coordinator diagnostic is preserved from the native execution-tool result; full separate coordinator stream files were not configured, a limitation to correct before the next authorization.

## Recommendation and next gate

Do not accept Foundation cleanup from this attempt. The remaining 55 cases are still required. The smallest next authorization is a documentation-reviewed correction to the disposable coordinator's process allowlist and failure-evidence handling, followed by a **new explicit authorization** for one fresh capability check and the same bounded eight-file selection. Review and hash the genuine Windows console-host executable; independently verify its process/token identity where queryable. Do not broadly permit arbitrary descendants. Retain native completion evidence even when a prerequisite rejects execution. Keep medium integrity, nonadministrator, unelevated, non-AppContainer operation; unchanged product/tests/budgets; isolated canonical roots; serial execution, retries 0, bail 1; and stop on an unverified identity, changed source, native capability failure, unexpected recovery state or test failure.

There is no need to change immutable hard-link publication, Foundation implementation, assertions, acquisition budgets or fairness. Prior 82 passing graph/cleanup cases remain relevant, but acceptance readiness still requires the unexecuted selection and preservation review. D6, WP5-F and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.

**STOP AT REMAINING FOUNDATION REGRESSION REVIEW GATE.**
