# Builder V1 WP5-A — Verification and Review

2026-10-17. **IMPLEMENTATION VERIFIED — RETURNED FOR WP5-A REVIEW.** WP5-A is not accepted, WP5-B has not begun, WP4 remains accepted and closed, and complete Builder V1 acceptance remains pending.

## Evidence and execution scope

The [architecture record](builder-v1-wp5-a-diagnostic-foundation.md) defines the implemented foundation and its integration limits. Machine results and logs are retained in `evidence/builder-v1-wp5-a/`, separately from accepted WP0–WP4 evidence. Source fixtures and CLI execution below are subsystem regression evidence, not a UI-only authoring journey.

| Check | Result / evidence |
| --- | --- |
| Focused foundation regression | **14/14 passed** against the final rebuilt implementation; [results](evidence/builder-v1-wp5-a/focused-results.json). |
| Full UI Platform regression, including real browser suites | **401/401 passed across 59 suites**, zero failures, exit 0; [results](evidence/builder-v1-wp5-a/ui-results.json). All five implementation/test SHA256 hashes match before/after this final run. |
| Editor/storage contracts | **146/146 passed** in the final sequential gate run; local `contracts.log`. |
| Build | **Passed**, including packages, Vite client and emitted server; local `build.log`. |
| Typechecks | **Passed** for client, server, Visual, Platform core and artifacts packages; local `typecheck.log`. |
| Production exclusion | **Passed**; local `production-exclusion.log`. |
| Data Services | No sibling source, schema, permissions, DOE or I-AM implementation changed. Existing protected integration tests run in the UI regression. The accepted WP4 756/756 sibling result remains historical; no new sibling full-run result is claimed. |

## Focused behavior covered

- Independent composition errors, Menu/route/property failures, malformed metadata types, existing throwing validator compatibility and accurate resolved/fallback targets.
- Reachable release errors versus unrelated draft diagnostics, same permanent ID under different owners, missing/empty roots, duplicate identities and cyclic-reference traversal without inventing build-order rules.
- Denied source suppression before validation, sanitized read failures, continued independent validation, unavailable references and incomplete reachable validation.
- Revision changes discard all stale output; authority changes during validation or final rechecks prevent results from escaping.
- Native severity/code/file/field/line/column preservation; no fabricated automation step location.
- Real generic Artifact Editor, VisualArtifactService and AutomationStore invalid sources aggregated without source writes.
- Captured source remains stable when caller objects change; Dataset/service references retain typed owner resolution.
- Catalog projection enumerates actual registrations, infers no approval and executes no service effects.
- Real cross-process lock contention rejects before capture, then reads the current revision after release. This is not ordinary simultaneous Builder/runtime browser acceptance.

## Unsuccessful attempts and diagnosis

1. Initial server typecheck reported TS2322 from mixed Workflow/service reference `flatMap` inference. An explicit native-reference generic fixes it; the later server typecheck passes. The initial compiler failure was tool output, not a retained successful machine run.
2. Initial focused runner failed before executing tests because sandbox temporary-cache rename returned EPERM. Retained [machine results](evidence/builder-v1-wp5-a/failed-cache-results.json) and local `failed-cache.log`.
3. First executable focused run passed 10/11; its supposedly valid test composition used invalid permanent identity prefixes and omitted required theme. Fixtures were corrected to the existing native contract, with no validator weakening. Retained [results](evidence/builder-v1-wp5-a/failed-fixture-results.json).
4. Added contention test initially used CommonJS resolution for an import-only package export; 11/12 passed. The child now imports through the package's existing ESM export. Retained [results](evidence/builder-v1-wp5-a/failed-import-results.json).
5. Full sandbox regression: 277/400 passed, 123 failed, one unhandled error; this is not acceptance evidence. Local HTTP connections were denied (`EACCES 127.0.0.1`) and Foundation immutable hard links failed with EPERM. A single security HTTP test passed outside the sandbox, confirming the connectivity difference. Retained [results](evidence/builder-v1-wp5-a/failed-sandbox-ui-results.json), local `failed-sandbox-ui-regression.log` and diagnostic logs. A preliminary diagnostic selected the wrong test file and skipped all tests; it is not a pass claim.
6. The first unrestricted regression passed 399/400. It overlapped a package rebuild/typecheck with the automation browser scenario, and Vite logged runtime module reloads; the Form activation result did not appear. The overlap was an execution mistake; reloads are a credible contaminant, not a proven exclusive cause. Retained [results](evidence/builder-v1-wp5-a/failed-rebuild-ui-results.json). A subsequent sequential browser run passed 4/4; [results](evidence/builder-v1-wp5-a/browser-results.json).
7. Final review found malformed metadata types could abort composition dependency/page checks. The added regression failed against the pre-fix emitted package (`dependencies` was not iterable); that run passed 400/401 and is retained as [pre-guard results](evidence/builder-v1-wp5-a/pre-guard-ui-results.json). Source changed during that run, so it is not a clean final implementation verification. The authoritative collector now isolates those failures, and the Visual adapter retains native diagnostics when references cannot be extracted. After rebuilding, all 14 focused checks, 146 contracts and the complete 401-test suite pass against frozen source. No further source edits occurred during the final run.

## Actual browser compatibility evidence and preservation

The final aggregate includes six existing browser compatibility suites: WP0 managed development Application, WP3 Dataset/CRUD/restart, WP4 Form authoring/submission/reload, Trigger/Workflow invocation/management, coherent Visual revisions, and routed Form/data integration. All passed; [extracted final browser suite results](evidence/builder-v1-wp5-a/browser-final-results.json). These suites also contain API/fixture/service prerequisites and do not prove the complete UI-only journey.

Fresh records and screenshots are retained separately: [WP3 journey](evidence/builder-v1-wp5-a/browser-compatibility/builder-v1-wp3/acceptance.json), [WP4 journey](evidence/builder-v1-wp5-a/browser-compatibility/builder-v1-wp4/acceptance.json), [actual Form controls](evidence/builder-v1-wp5-a/browser-compatibility/builder-v1-wp4/form-rules.png), [isolated submission](evidence/builder-v1-wp5-a/browser-compatibility/builder-v1-wp4/isolated-submission.png) and [running Application](evidence/builder-v1-wp5-a/browser-compatibility/builder-v1-wp4/running-application.png). The fresh Form controls screenshot was visually inspected and shows the actual saved definition, typed calculation/condition controls and stable field references.

Existing tests emit into historical WP0/WP3/WP4 report paths. Their eight fresh outputs were copied into this increment before restoring the reviewed originals. **All 41 prior files match the reviewed reconciliation preservation record byte-for-byte by SHA256**; unchanged files retain their original line endings. No previously tracked evidence remains modified. See [preservation proof](evidence/builder-v1-wp5-a/prior-evidence-preservation.json); Git blob baselines are distinguished from raw working-copy byte hashes. Historical machine results and inventories were not replaced by fresh test results.

The [verification summary](evidence/builder-v1-wp5-a/verification-summary.json), [scope reconciliation](evidence/builder-v1-wp5-a/scope-reconciliation.json) and [evidence manifest](evidence/builder-v1-wp5-a/evidence-manifest.json) record the final gate, 40 unchecked requirements and retained file hashes. Failed/transitional runs remain separate from final successful evidence. `git diff --check` passes.

## Review prerequisites and retained limitations

The normal host has no approved automation service map/signature/permission contract and currently admits only same-Dataset CRUD workflows. The existing deterministic `reference.notification` fixture is a candidate, not an approved normal-host contract. **Stop for review before WP5-C service selection**; no service is invented or readiness restriction bypassed.

D6 investigation reproduces the exclusive graph-lock admission failure and proposes measured/coalesced/fair admission remediation. No lock change or reliable simultaneous-use claim is made. Ordinary simultaneous Builder/runtime use remains a final acceptance requirement, with A37 full management-restart/browser evidence still required in WP6.

The foundation is not yet wired into full Application discovery, Problems UI, incremental refresh or Publish. WP5-E must capture each authorized source independently and supply complete release roots/dependencies/revision admission; WP5-H must enforce validation for UI and direct publication requests. Existing throwing composition loading cannot substitute for collecting independent malformed files. Future integrations must never accept browser-supplied validators, authority decisions or a claimed complete subset.

Actual UI-only authoring evidence remains required in the increments delivering those controls. Existing browser regressions are compatibility evidence; they do not complete any of the 40 umbrella requirements.

## Inventory and gate

The [changed-file inventory](builder-v1-wp5-a-files.txt) identifies this increment and retained local evidence. All 40 ordered umbrella rows remain unchecked. Historical planning verification and WP4 machine records are preserved.

**STOP AT WP5-A VERIFICATION/REVIEW. Do not automatically begin WP5-B or claim WP5/Builder V1 acceptance.**
