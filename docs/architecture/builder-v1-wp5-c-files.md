# Builder V1 WP5-C — Changed-file Inventory

WP5-C C1–C5 is implemented and verified, **pending user verification/review**. This does not accept or close WP5-C. Stop before WP5-D. All 40 umbrella requirements remain unchecked.

The [machine inventory](builder-v1-wp5-c-files.json) records SHA-256 hashes and sizes for implementation, tests, documentation and every WP5-C evidence file. Existing accepted records and all 351 historical + 157 WP5-B evidence files are preserved; three earlier planning evidence files are also unchanged. Accepted B source changes already present in the sibling repository are not attributed to C when unchanged from the pre-C source baseline. B closure documents retain their previous exact bytes. Ordinary ignored dependencies/build caches and raw backup copies are excluded.

## Implementation, tests and records

| Repository | File | Kind |
| --- | --- | --- |
| UI Platform Data Services | `packages/dataset-operations/src/secured-development-host.ts` | implementation |
| UI Platform Data Services | `packages/dataset-operations/src/secured-engine.ts` | implementation |
| UI Platform Data Services | `packages/dataset-operations/src/types.ts` | implementation |
| ui-platform | `docs/architecture/builder-end-to-end-v1-acceptance-checklist.md` | documentation |
| ui-platform | `docs/architecture/builder-end-to-end-v1-implementation-plan.md` | documentation |
| ui-platform | `docs/architecture/builder-v1-wp5-c-d5-service-contract.md` | documentation |
| ui-platform | `docs/architecture/builder-v1-wp5-c-implementation.md` | documentation |
| ui-platform | `docs/architecture/builder-v1-wp5-c-plan.md` | documentation |
| ui-platform | `docs/architecture/builder-v1-wp5-c-verification.md` | documentation |
| ui-platform | `docs/architecture/builder-v1-wp5-plan.md` | documentation |
| ui-platform | `packages/platform-core/src/application-data.ts` | implementation |
| ui-platform | `packages/visual-artifacts/src/runtime.ts` | implementation |
| ui-platform | `scripts/trigger-workflow-reference-host.ts` | implementation |
| ui-platform | `src/client/automation/authoring-controls.ts` | implementation |
| ui-platform | `src/client/automation/editor.ts` | implementation |
| ui-platform | `src/client/visual-artifacts/authoring-controls.ts` | implementation |
| ui-platform | `src/client/visual-artifacts/editor.ts` | implementation |
| ui-platform | `src/server/automation-runtime.ts` | implementation |
| ui-platform | `src/server/automation-services.ts` | implementation |
| ui-platform | `src/server/automation-store.ts` | implementation |
| ui-platform | `src/server/builder-development-host.ts` | implementation |
| ui-platform | `src/server/dataset-development.ts` | implementation |
| ui-platform | `src/server/development-application-runtime.ts` | implementation |
| ui-platform | `src/server/index.ts` | implementation |
| ui-platform | `src/server/v1-management-routes.ts` | implementation |
| ui-platform | `src/shared/automation-service-contract.ts` | implementation |
| ui-platform | `tests/builder-v1-wp5-c-browser.test.ts` | test |
| ui-platform | `tests/builder-v1-wp5-c-services.test.ts` | test |
| ui-platform | `tests/helpers/automation-fixture.ts` | test |
| ui-platform | `tests/trigger-workflow-browser.test.ts` | test |

## Evidence and exclusions

All files under `docs/architecture/evidence/builder-v1-wp5-c/` are enumerated in the machine inventory, including exact command logs under `transcripts/` as `.log.txt`, complete and failed JSON reports, browser screenshots/transcripts, archived unsuccessful source, the interrupted zero-byte test lock and operator recovery record, and original-hash preservation/review summaries.

The final complete UI run passed 446/446 with serial fixtures, explicit default time limits and one configured retry; earlier 429/440, 443/446, 442/446, 445/446 and 439/446 reports are retained. No per-case first-attempt claim is made. See [verification](builder-v1-wp5-c-verification.md) for complete results and limitations.

This index and its machine inventory exclude their own hashes to avoid circular references. No locking implementation, shared package Component definition, expression/schema/authorization engine, WP5-D or WP5-F implementation was added. Source-lock operator recovery is explicitly recorded and is not contention remediation or simultaneous-use proof.
