# Builder V1 WP5-C — Verification and Review Record


## Current review decision — WP5-C accepted; WP5-D authorized

**BUILDER V1 WP5-C — ACCEPTED AND CLOSED**, by explicit user review. Accepted evidence: UI Platform 446/446, Data Services 760/760, editor/storage contracts 146/146, builds, typechecks, production exclusion and actual Builder/browser evidence. Historical successful, failed and transitional records and hashes are retained. Earlier review-gate text is historical and superseded by this decision. No WP5-C contract is reopened.

**WP5-D Menu and Branding Authoring is authorized for implementation**, using the approved native composition, storage, styling and editing contracts. Stop at WP5-D implementation verification/review; do not begin WP5-E. D6 remains WP5-F subject to separate architecture review; A37 remains WP6. All 40 umbrella requirements remain unchecked. Complete Builder V1 acceptance remains pending.

2026-10-17. **D5.1–D5.6 approved; WP5-C implementation authorized. C1–C5 implemented and verified; pending user verification/review. STOP AT WP5-C IMPLEMENTATION VERIFICATION/REVIEW.** Do not begin WP5-D. WP5-C acceptance and complete Builder V1 acceptance remain pending; all 40 umbrella requirements are unchecked.

## Implemented scope

See the [implemented architecture](builder-v1-wp5-c-implementation.md), [approved plan and historical D5 gate](builder-v1-wp5-c-plan.md) and [approved D5 contract with retained proposal history](builder-v1-wp5-c-d5-service-contract.md). C1–C4 implement the bounded trusted service contract/permissions, native typed authoring, existing event invocation and honest result-state inspection. C5 supplies security, compatibility and actual browser verification. No WP5-D/F/G infrastructure was implemented.

## Results

| Check | Final result | Evidence |
| --- | --- | --- |
| Complete UI Platform regression | **446/446; 63 files** | [complete report](evidence/builder-v1-wp5-c/reports/wp5-c-ui-post-recovery.json), [command log](evidence/builder-v1-wp5-c/transcripts/wp5-c-ui-post-recovery.log.txt) |
| Complete Data Services regression | **760/760; 35 files** | [complete report](evidence/builder-v1-wp5-c/reports/data-services-wp5-c-full.json) |
| Editor/storage contracts | **146/146; 15 files** | [contract log](evidence/builder-v1-wp5-c/transcripts/wp5-c-editor-contracts.log.txt) |
| New WP5-C security/transport and actual browser cases | **29/29**, included in 446 | C services file (28) and browser file (1) in the complete UI report |
| Affected security + legacy/new browser set | **33/33** | [affected report](evidence/builder-v1-wp5-c/reports/wp5-c-final-affected.json); subsequent full run also verifies independent metadata permissions |
| Post-recovery Visual/reference + security checks | **50/50** | [focused log](evidence/builder-v1-wp5-c/transcripts/wp5-c-post-recovery-focused.log.txt) |
| UI build / typecheck / production exclusion | **passed** | [build](evidence/builder-v1-wp5-c/transcripts/wp5-c-ui-build-final.log.txt), [typecheck](evidence/builder-v1-wp5-c/transcripts/wp5-c-typecheck-final.log.txt), [production exclusion](evidence/builder-v1-wp5-c/transcripts/wp5-c-production-final.log.txt) |
| Data Services build / typecheck | **passed** | [build](evidence/builder-v1-wp5-c/transcripts/data-services-wp5-c-build-final.log.txt), [typecheck](evidence/builder-v1-wp5-c/transcripts/data-services-wp5-c-typecheck.log.txt) |

Final complete UI command: `npm test -- --maxWorkers=1 --no-file-parallelism --testTimeout=30000 --hookTimeout=30000 --retry=1 --reporter=json --outputFile=.uib/wp5-c-ui-post-recovery.json`. It completed normally with exit code 0. One retry was configured; the JSON reporter does not expose a reliable per-case retry count, so no first-attempt/no-flake claim is made. All earlier unsuccessful reports remain separate and unchanged. No failed case is silently merged into the successful report.

The final implementation source was rebuilt and frozen before the final checks. Serial execution isolates fixtures sharing global source roots; it does not prove ordinary simultaneous-use reliability. The actual browser proof is [browser-acceptance.json](evidence/builder-v1-wp5-c/browser-acceptance.json), with [typed authoring](evidence/builder-v1-wp5-c/typed-automation.png), [instance event authoring](evidence/builder-v1-wp5-c/workflow-event-authoring.png), [running success](evidence/builder-v1-wp5-c/runtime-workflow-success.png), [dedicated permission denial](evidence/builder-v1-wp5-c/runtime-workflow-denied.png), [unknown transport outcome](evidence/builder-v1-wp5-c/runtime-workflow-unknown.png) and [nonpersisting preview](evidence/builder-v1-wp5-c/nonpersisting-preview.png). Screenshots were visually inspected.

## Actual browser interactions and evidence limits

The WP5-C browser test creates the Dataset through Builder and performs Development Apply. A trusted external normal host uses that applied deployment. The test then creates the Workflow and Trigger through Builder, configures ordered typed actions, native Trigger phase/scope/priority and literal inputs, exercises editing/history/reload and keeps stable IDs. It creates a Page and shared Form through Builder and configures both Page-button and Form-success instance actions to invoke the same permanent Workflow with route-bound record identity and declared local result state. Source/action/schema JSON is not edited for these authoring steps.

Native trusted setup approves the newly allocated Workflow ID in the existing host allowlist. This is a disclosed deployment prerequisite, not UI-only Application provisioning or a new Builder allowlist authority. Explicit existing I-AM setup/activation provisions the dedicated service permission and grant. The running Application proves correct selected-record behavior, afterCommit and Workflow notification ordering, persisted Form edit and an unchanged unrelated record. Revoking only the dedicated service grant leaves Workflow/Dataset authority active and produces a visible failed action with no service/storage mutation. The authorized service catalog becomes empty.

Design preview is tested for zero storage/sink effects. Explicit transport substitutes verify uncertain and denied outcomes without making service calls. Shared Form source remains byte-identical after instance actions. Existing WP5-B package/shared-instance and protected record-delete regressions remain required compatibility evidence.

Closing Builder before the runtime capture avoids an accepted contention limitation; it is not simultaneous-use reliability evidence. Existing native setup/collision tests do not prove complete UI-only provisioning or every Builder rejection path. Missing legacy package metadata and absent registered package Button remain explicit. WP5-G general isolated test services and WP6 full reference/restart evidence remain separate.

## Unsuccessful/transitional attempts retained

- Initial C1 run failed before collecting tests because sandbox temporary-cache rename was denied. The permitted rerun outside that restriction passed. No authorization/effect check was bypassed.
- Browser attempt 1 failed on a copied test-selector encoding error. Edited files were inspected and corrected; accepted historical evidence was not transcoded.
- Attempt 2 exposed an in-flight artifact-type selector race. Management controls now disable switching while the operation completes.
- Attempt 3 used a nonexistent empty node option in the fixture; it now uses the actual Select artifact root control.
- Attempt 4 exposed Save being available during creation/list refresh; the same bounded operation guard now covers Save. Save verification also waits for completion.
- Attempt 5 switched to the Page before Form creation navigation completed. The fixture now waits for the Form editor, matching the established workspace journey.
- Attempt 6 passed the actual supported authoring/runtime/preview/revocation journey. Subsequent verification adds native history/scope and transport-outcome checks.
- The first full parallel UI run reported 429/440: competing live-writer locks, an obsolete raw-ID-prompt test and additional fixture/cleanup failures. The legacy reference host has no approved normal-host catalog; its test now uses native fixture creation for source-editor lifecycle coverage. Typed UI creation is independently proven by the new normal-host journey.
- An overlapping targeted legacy-browser run reported 2/4 while the parallel full run was active. It is not acceptance evidence. Subsequent complete regression execution is serialized to prevent fixtures sharing source roots from competing. No consistency check, live-owner protection, lock ordering or recovery rule was weakened.

- Subsequent serial runs reported 443/446, 442/446 and 445/446. These include cached modules while edits were in flight, a one-second catalog fixture wait, transient Windows/browser failures and an opaque management-runner error. The isolated management-server rerun passed 2/2 with verbose output. The catalog wait was extended to 15 seconds because the retained failed-attempt screenshot showed the authorized result had arrived after the assertion timed out.
- The next bounded run reported 439/446 and exposed an incomplete zero-byte shared source lock. Source readers correctly refused it, and several dependent reference/browser checks failed closed. No locking code was changed. The exact lock was archived with timestamps proving creation during that run; all workspace/server/test Node processes were stopped before operator recovery. Initial recovery checks refused active tooling processes and an unsafe timezone comparison; only after identifying Codex tooling helpers and comparing UTC filesystem times directly was the exact empty test lock removed. See [operator recovery record](evidence/builder-v1-wp5-c/operator-recovery.json) and [original zero-byte lock](evidence/builder-v1-wp5-c/interrupted-test-lock.bin). This is operator recovery of interrupted test state, not WP5-F admission/locking remediation or a live-owner steal.
- A disabled Workflow left in the wrong fixture directory by browser attempt 2 was archived before deleting only its known file and empty directory. See [original unsuccessful source](evidence/builder-v1-wp5-c/unsuccessful-source/attempt-2-workflow.json).
- After recovery the focused check passed 50/50 and the final complete UI suite passed 446/446. A wait returned much later than requested and the final suite took an extended time; process inspection showed remaining workers. It subsequently completed normally. No runner was killed and no incomplete run is presented as passed.

All command reports/logs and unsuccessful browser screenshots/transcripts are retained in the evidence inventory. The final table describes actual completed runs; intermediate failures are not acceptance evidence.

## Preservation and review gate

Final byte-preservation, changed-file inventory and umbrella checks are recorded in the [machine review summary](evidence/builder-v1-wp5-c/review-summary.json), [raw-byte preservation report](evidence/builder-v1-wp5-c/historical-preservation.json) and [changed-file inventory](builder-v1-wp5-c-files.md). The historical 351 files, 157 WP5-B files and their machine inventories/hashes are preserved. Existing test fixtures may write evidence temporarily; original bytes are restored from raw copies, never regenerated or normalized.

**Stop for WP5-C verification/review. Do not mark WP5-C accepted or begin WP5-D. D6 remains WP5-F; A37 full management restart remains WP6.**
