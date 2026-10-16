# Builder V1 WP3 — Verification

2026-10-15. **BUILDER V1 WP3 — ACCEPTED FOR PLANNING PURPOSES** by the user after architecture and verification review. Reported machine evidence below remains subject to independent confirmation; this status update does not rerun or independently certify it. Documented V1 limitations are accepted without expansion. WP0–WP2 accepted records remain intact; complete WP6 UI-only acceptance is not claimed. [WP4 planning](builder-v1-wp4-plan.md) is authorized for review only; implementation is not authorized.

## Final results

| Check | Result |
| --- | --- |
| Full UI Platform regression | 370/370 tests, 56 files, zero failed/pending; exit 0 |
| Final affected browser/runtime checks after the applied-schema Records adjustment | 19/19 tests, 3 files; exit 0 |
| Full Data Services regression | 750/750 tests, zero failed/pending; exit 0 |
| Emitted editor/storage contracts | 143/143 tests, 15 files; emitted consumer and generated contract checks pass |
| UI Platform build and typechecks | Pass |
| Data Services build and typechecks | Pass |
| Production-editor exclusion | Pass |

Machine evidence: [UI regression](evidence/builder-v1-wp3/ui-results.json), [final focused regression](evidence/builder-v1-wp3/final-focused-results.json), [sibling regression](evidence/builder-v1-wp3/sibling-results.json), [verification summary](evidence/builder-v1-wp3/verification-results.json), [editor contracts](evidence/builder-v1-wp3/editor-contracts.txt). The accepted WP0 acceptance artifact was restored byte-for-byte after regression execution.

## Environment and commands

Windows, Node 24.19.0, Microsoft Edge/Playwright. Tests use disposable normally registered Standard Applications and temporary policy, activation, resource and record stores. Local HTTP/browser tests require execution outside the restricted sandbox because it denies localhost connections. Test temporary files use `C:/Projects/Modular/.wp3-test-temp` through TEMP/TMP.

UI Platform:

```text
npx vitest run --maxWorkers=1 --hookTimeout=60000 --reporter=json --outputFile=../.wp3-ui-results.json
npm run check:editor-contracts
npm run typecheck
npm run build
node scripts/check-editor-production.mjs
```

Data Services:

```text
npm run build
npx vitest run --maxWorkers=1 --reporter=json --outputFile=../.wp3-sibling-results.json
npm run typecheck
```

Focused development:

```text
npx vitest run tests/builder-v1-wp3.test.ts tests/builder-workspace-requests.test.ts --maxWorkers=1
npx vitest run packages/dataset-operations/tests/development-dataset-authoring.test.ts
```

## Actual Builder journey

The WP3 test creates new Standard Applications through the normal creation API; no Dataset or records are preseeded. Explicit trusted setup and stage/activate administration grant reviewed permissions to existing development Users. No creator access is automatic.

An actual Edge browser signs in, opens the ordinary Builder, creates Person through Create Dataset, adds named permanent fields, configures Required, adds a temporary numeric/defaulted field and removes it, saves through WP2, renames without replacing the field ID, switches to another artifact and returns, and exercises Undo/Redo. An empty field-name draft receives a real 422; stored bytes remain unchanged and the draft can be corrected.

The browser validates saved source, confirms Apply, observes real publication/controller activation evidence, and separately confirms Connect. Real authenticated host readiness binds the expected Dataset and permanent Application. Records controls create, update, reload and delete persisted records through ApplicationDataClient and protected DOE. Screenshots: [Builder Records](evidence/builder-v1-wp3/builder-records.png), [Standard preview](evidence/builder-v1-wp3/standard-preview.png), [configured Form](evidence/builder-v1-wp3/configured-form.png).

Records field controls resolve the verified applied schema, independently of newer saved source. The final focused regression also proves that changing source leaves the applied Dataset name/schema unchanged, reports the mismatch and rejects reapplication. The rendered Standard preview screenshot was visually inspected after the stronger heading/error-overlay assertion passed.

The ordinary Standard preview opens in the browser and reads/writes the same applied Dataset through its Application-qualified proxy. A configured Form uses the verified applied discovery result, existing Form generator/renderer and shared data service, submits a real record, and proves persisted bytes. Form configuration is disclosed test preparation, not a claim of WP4 visual Form authoring.

After management/host termination the same source, policy, owner and activation stores are reopened. Authorized Connect restarts the exact pin, verifies existing Dataset ownership, and reads the previously persisted record. No Dataset recreation, republication or new grant supplies that result.

Machine provenance and permanent IDs: [acceptance.json](evidence/builder-v1-wp3/acceptance.json).

## Security, limitations and recovery

Tests compare actual stored bytes before and after a denied restricted-field update, required-value failure, unauthorized operation and role revocation. Forged actor/bearer/Application inputs and unknown Datasets are denied. Unauthorized/stale/unconfirmed apply and forged editor CSRF are rejected. A second Dataset cannot replace the selected host connection. Changed source cannot silently reapply or migrate an existing Dataset.

Sibling tests exercise all registered types, id-only activation health, exact-pin restart with existing records, incorrect serving fingerprint and revoked apply admission. An incomplete domain cannot be reseeded. Existing Data Services controller and recovery regressions remain required; WP3 does not introduce automatic whole-operation rollback or general migration recovery.

Workspace read-retry tests prove bounded busy admission under the original session, denial without retry, revocation before another request, and failure on persistent contention. No mutation retries or lock stealing are introduced. Known foreign Trigger definitions are filtered by the existing host scope before binding; unrelated existing fixture Triggers cannot break the new Dataset's writes. Approved Workflow invocation and all existing Form/Workflow regressions remain in the suite.

Relationships, field labels, schema-embedded visibility/editability/permission properties and additional validation operators are unsupported by the authoritative V1 verifier and are explained in the editor. Permission rules are configured through existing trusted I-AM administration and reference permanent IDs. Runtime field-write denials are reported by DOE; the Records view is not a new client-side policy evaluator.

All changed source revisions after first application require a separately reviewed migration and are rejected by this adapter. One Dataset per protected host remains enforced. Reconnection after restart is explicit and authorized. Incomplete activation retains the attempt/domain and requires the existing Data Services recovery procedure.

## Failed attempts retained in the record

Initial restricted tests could not rename the sandbox's temporary Vitest cache or connect to localhost. Workspace-local TEMP/TMP and authorized local test execution resolved these environment failures; they are not counted as passes.

Early browser runs exposed a policy-update race that correctly suspended retained source, a strict selector matching two panels, live-writer source lock contention, and the global Trigger source provider attempting a foreign Dataset binding. The test explicitly reauthorizes after trusted policy changes; production changes retain bounded original-session read retries and scoped Trigger selection. Further harness fixes preserve browser-only imports from Vitest transformation and use the required permanent Form identities. None of these failed runs is counted as acceptance.

The first complete UI run had 366/368 passes: an existing Form browser cleanup timed out and an existing coherent-runtime browser test timed out. Both unchanged suites subsequently passed together, 18/18. The WP3 browser uses its own optimization cache; the full rerun uses a 60-second cleanup allowance without changing assertions.

A subsequent aggregate report returned a nonzero process exit and omitted the twelve-test editor-context file despite reporting its collected tests successful. It was not counted as a complete pass. The omitted suite passed separately; a fully logged rerun then completed all 368 tests in all 55 files with exit zero. That run included a long module-import stall, retained as an environment limitation rather than hidden.

Screenshot inspection then caught a real acceptance gap: Standard preview data requests succeeded while its initial render showed a source-lock error overlay. The browser assertion now requires the actual Standard Welcome heading and absence of an error overlay before data writes and screenshot capture. Existing Vite readers use bounded complete-capture retries for the exact live-writer error, with real live/incomplete-lock regression tests. An initial combined rerun timed out during an execution timing stall and is not counted as acceptance.
