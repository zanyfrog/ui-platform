# WP5-F — Windows Application-publication EPERM investigation

2026-10-19, America/New_York. Targeted investigation authorized after review of the Form refresh correction. **Cause unresolved; no production remediation is justified by the collected evidence. D6 remains blocked.**

## Historical failure and publication boundary

The complete UI run in `evidence/builder-v1-wp5-f-form-refresh/ui-verified.json` remains **495/496 — NOT PASSED**. WP5-E receives 500 instead of 201 at `tests/builder-v1-wp5-e-browser.test.ts:80`. Windows rejects the staging-directory rename at `src/server/applications.ts:176` with EPERM. The historical process and its staging directory have already been cleaned up; their live handles cannot now be recovered.

Application creation prepares an unpublished `.creating-<key>-<uuid>` sibling, installs dependencies, builds services, rebases internal junctions, and then calls one directory rename. On failure it attempts staging cleanup and propagates the error. No publication protocol, authorization or cleanup behavior was changed during this investigation.

The npm helpers await `exit`, not `close`. The standard service build script only creates `dist` and copies `src/index.js`; it does not start a development server or a persistent compiler watcher. The API starts a polling workspace watcher at startup. That watcher can walk staging directories, whereas Application discovery and the artifact-watcher collection explicitly skip dot-prefixed directories. This is a possible interaction to investigate, not evidence that it caused the failure.

The relevant `applications.ts`, `npm-process.ts`, `application-links.ts`, `watcher.ts` and `artifact-watcher.ts` source is unchanged from pre-D6 HEAD. Similar Windows directory-rename symptoms were already tracked in `artifact-watcher-windows-rename-issue.md`, but that report also lacks an attributed handle. The similarity does not establish a common cause.

## Diagnostics and observations

All new evidence is under `docs/architecture/evidence/builder-v1-wp5-f-windows-eperm/`.

| Record | Observation and limit |
| --- | --- |
| `diagnostic-capability.json` | NT kernel File I/O recording via installed WPR is denied with `0x80070005`; the session has no administrator token. WPR status confirms no recording started. |
| Microsoft Handle probe | Downloaded the portable utility from the official Microsoft Sysinternals endpoint; Authenticode signature is valid, signer Microsoft Corporation. SHA-256 recorded. A read-only workspace search did not return; only its verified task-owned PID was stopped. No target handles were closed. Its duration estimate in the capability record is approximate, not a measured diagnostic latency. |
| `creation-probe.json`, `.log` | Eight independent standard-template creations succeed. An instrumentation path-normalization mistake means this first run records attempt outcomes but does not capture publication/child events. It is retained as limited evidence. |
| `creation-probe-instrumented.json`, `.log` | Corrected instrumentation: eight further independent creations succeed, with eight publication successes and no failures. Sixteen npm processes each emit `exit` and `close`. |
| `probe-summary.json` | In the eight instrumented cases, the last observed npm `close` precedes publication by 21.57–30.57 ms. These successful samples do not exclude an unobserved descendant or external holder in the historical failure. |
| `wp5-e-diagnostic.log` | First observed-test launcher fails before tests because the diagnostic preload used a Windows drive path instead of a `file:///` URL. Retained separately; not a product regression result. |
| `wp5-e-observed.json`, `.log` | The unchanged exact WP5-E browser test passes, 1/1, in 95.16 seconds, with retries disabled and no overlapping fixture run. |
| `wp5-e-publication.jsonl` | Diagnostic preload records child lifecycles, API-local pending directory enumerations and native watcher registrations. Both Application publications succeed; no API-local enumeration is pending at either publication. Captured native Application watches are installed after publication. Nested Page publication also succeeds. |

There are **16 independent direct creation successes**, eight with complete event instrumentation, followed by a successful exact WP5-E journey. No failed creation was retried. Probe runs were bounded and sequential. The preload adds observation overhead and can change scheduling; a passing observed run cannot prove absence of a transient race.

The direct probes isolate Application creation without the API's workspace watchers. The exact WP5-E run includes the normal API watcher startup and full browser journey. The preload observes JavaScript promise lifetimes and registered native watches, not every kernel handle, handle share mode, minifilter decision or external process. An empty pending-enumeration list is not proof that no Windows handle exists.

## Proven findings versus hypotheses

**Proven:** the original Windows rename error is recorded; publication and process helpers predate D6; the error is not reproduced in these new attempts; observed npm `close` events precede successful publication; no persistent service-build watcher is started by the standard build script; kernel tracing is unavailable with the current token; no responsible holder has been identified.

**Unproven:** npm descendant/current-directory handles, transient workspace enumeration, another filesystem reader, antivirus/indexing software, junction handling or a different Windows filesystem/filter condition. NTFS is the observed filesystem. There is no captured failing Windows operation with its underlying status/share mode/stack, so none of these candidates may be presented as root cause. Successful reads or later successful renames do not resolve that uncertainty.

No `exit`→`close` substitution, staging-watcher exclusion, EPERM retry, arbitrary delay, process shutdown, timeout change or assertion relaxation was implemented. The observations do not justify choosing one of those as a causal correction.

## Remaining evidence needed and acceptance recommendation

The next useful step is an administrator-enabled, bounded Windows File I/O/handle trace spanning a recurrence, scoped for analysis to the Application staging and destination paths. Preserve process/thread lifetimes and the failing rename, preceding CreateFile/QueryDirectory operations, share/delete modes, close events, underlying Windows result and stacks. Identify the holder or filter decision at the failed operation, rather than surveying handles after cleanup. No tracing session is currently running.

Only after attribution should a correction be selected and tested against the original scenario and atomic publication semantics. A material publication/lifecycle/authorization/recovery change requires the separate design decision specified by the user. No such change is proposed as approved here.

**D6 IMPLEMENTATION BLOCKED — root cause not reproduced or causally attributed.** The new WP5-E pass does not replace the failed complete-suite record or establish a correction. No new full-suite green claim is made. With no production correction, the conditional post-correction full UI, simultaneous-operation, editor-contract, Data Services, build/typecheck and production-exclusion verification cycle was not restarted. Prior verified Form behavior and original D6 regressions remain preserved evidence, not newly relabeled results.

## Inventory, preservation and boundaries

`builder-v1-wp5-f-windows-eperm-files.json` is the exact investigation-only file inventory. `preservation-final.json` compares the prior refresh inventory and original baseline. No runtime source, test assertion, configuration, graph-lock timeout, Form behavior, security mechanism or accepted record changed. All historical evidence, 40 unchecked umbrella requirements and repository HEADs remain unchanged. No commit, push, GitHub synchronization, WP5-G/WP6, acceptance or closure occurred.

Task-owned supporting files outside the repository: signed portable Handle binaries/archive under `C:/Projects/Modular/.wp5-f-windows-tools/`; isolated probe Applications under the two `.wp5-f-eperm-probe-*` roots named in the probe JSON records. These are retained for inspection and are not running Application runtimes.

Microsoft documents Handle's administrator requirement and reporting features at [Handle — Sysinternals](https://learn.microsoft.com/en-us/sysinternals/downloads/handle). This utility was used in reporting mode only. **Stop at D6 acceptance review.**
