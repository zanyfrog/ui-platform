# Application build, migration, and deployment integration

This implements the service layer of [Application Build, Migration & Deployment v1](./application-build-migration-deployment-v1.md) alongside [Artifact Foundation v1.1](./artifact-foundation-v1.1-waypoint.md). The logical modules currently live in `@ui-platform/artifacts/src/application` to reuse the established workspace, validation, storage, and CLI. No additional registry or artifact publication lifecycle is introduced.

## Repository integration map

| Concern | Existing contract | Integration |
| --- | --- | --- |
| Discovery, identity, validation | `FileSystemArtifactService`, `ArtifactDefinitionRegistry`, `EditableArtifact` | Build and migration services receive the same service instance. Dataset and migration definitions register through the existing registry. |
| File watching | `ArtifactService.startWatching` | `ApplicationBuildEngine.startWatching` subscribes to it and reconciles all source/configuration inputs periodically. The platform's existing editor watcher remains available independently. |
| Schema IDs | Sibling Data Services `schema-manager` exports `DatasetSchema` with dataset `id` and field `id`/`key` | The dataset artifact adapter preserves this shape and permanent IDs. It does not invoke `publishDraft` or maintain another definition history. |
| Database | Sibling Data Services `JsonFileDatasetOrm` | `JsonFileMigrationProvider` is an **offline** adapter for its JSON-array files. File mappings must be supplied explicitly. |
| Trigger ownership | Sibling Data Services `dataset-operations/TriggerRegistry.list(appId)` | The tooling adapter maps enabled central registry registrations to artifact IDs. Only supplied `activeTriggers` IDs become trigger roots. An artifact's `active: true` flag alone is insufficient. |
| Logs | `.uib/logs/operations.jsonl` | Existing destination and correlated application/build/deployment/migration IDs; no row contents or environment values. Ledger state is separate. |
| CLI | `uib` from the artifacts workspace | Existing artifact commands remain; app/migration commands are thin service wrappers. |
| Deployment | No existing supervised production process manager | `LocalDirectoryDeploymentTarget` stages portable releases and replaces a JSON pointer. Host activation, health, quiescence, and compatibility probes are explicit required callbacks. |

## Application build integration

Construct `ApplicationBuildEngine` with:

- `service`: the application's shared artifact service, with its Page/service/workflow definitions registered.
- `entries()`: registered route IDs, global references, central active trigger IDs, and explicitly enabled background registrations. Do not enumerate every passive artifact as an entry point.
- `inputs()`: compiler/definition revision, installed dependency versions, effective settings, and content fingerprints of shared packages outside the application directory. Local source/configuration is hashed automatically; `.git`, `.uib`, `node_modules`, `dist`, and `dist-server` are excluded. External installed package changes must be represented here.
- `dependencies()`: additional typed edges, including code imports. `buildOrder: false` supports runtime-only references. Unmodeled local code/configuration edits conservatively invalidate the whole application.
- `compile()`: the app compiler. `compileFoundationArtifact` supports Route/RouteGroup, Form, Dataset, Migration, and self-contained Trigger source. Use `foundationCompilerVersion` in `inputs()`. Imported trigger code and Page/component compilation require the application's bundler; unsupported code fails closed.
- `schemaGate()`: connect `MigrationEngine.schemaGate`. Without a verified applied schema, reachable dataset/schema artifacts block builds.
- `packageRuntime()` and `verifyRuntime()`: the application's production bundler and staged process probes. The packaging callback receives only current reachable artifact outputs and an empty candidate directory. It must include production dependencies, the runtime entry, assets, runtime registrations, and operational logging, omitting editor/discovery/watch tooling and secrets. Verification must start/check the actual runtime and must not modify the bundle.

Use `buildDevelopment`, `ensureFreshBuild`, `validateApplication`, `startWatching`, or `buildProduction`. Current output is unavailable after failure/invalidation. Production has a separate mode fingerprint, rechecks source after packaging, includes confirmed migration contents/checksums, and verifies the finished inventory after runtime probes. Failed candidates retain a `.candidate-*` name and are never promoted to a Build ID.

The fixed debounce defaults to 300 ms, parallel compilation to four independent nodes, and reconciliation to one second. Cache storage is one current record per artifact under `.uib/build/<applicationId>/`; a checksum mismatch causes recompilation. No source manifest receives derived build state. Removed-artifact cache records are inert; automatic cache deletion is not yet provided.

## Database onboarding and supported provider

The current Data Services ORM has no exported schema-migration, snapshot, cache-invalidation, or writer-fencing API. Its transaction commits multiple JSON files individually. Therefore the initial adapter **requires stopping every process that writes these files**, and restarting with refreshed definitions/caches after migration. An environment lock alone cannot fence unrelated ORM writers. `setMaintenance(true)` must stop writers and verify that they are stopped; `setMaintenance(false)` must reload/restart them. Never wire a no-op callback for a real environment.

Configure `JsonFileMigrationProvider` with a dedicated `environmentRoot`, `dataRoot`, environment identity/production flag, and explicit mappings from permanent dataset IDs to existing ORM filenames (`appId__namespace__dataset.json`). Do not guess a database path from an artifact folder. The provider refuses symlinked dataset paths.

Run `initialize(schemas)` once after independently verifying those schemas against the currently registered ORM and actual data. Initialization refuses to replace an existing state file. The adapter cannot infer an applied baseline from proposed source. It currently supports existing datasets, field addition/default backfill, field renaming by permanent ID, and field deletion. Type/default/required changes, rename collisions, and complex changes require a reviewed installed custom handler. Dataset creation/deletion, SQL backends, online migration, and multi-host locks need additional provider capabilities; they are not silently emulated.

Environment state and the migration ledger live in `.uib/environments/<environmentId>/migration-state.json` under the configured environment root. Backups contain the actual configured data files and ledger/schema baseline. Treat that directory as sensitive environment data; never add it to an application bundle. Operations are not a multi-file transaction: an interrupted operation leaves an `applying`/`recovery-required` ledger record and blocks future application.

`preview` writes only an ephemeral proposal. `confirm` requires an authorization callback and recorded actor, rechecks source/baseline, registers a migration source bundle, then applies it to Development. Source edits alone never mutate the database. Destructive confirmation is separate from Production approval. An already-applied checksum is skipped; changed content or incomplete attempts fail. Backups are verified before mutation. Development failures deliberately keep maintenance active pending operator inspection.

## CLI wiring

Create a trusted local ES module exporting `createTooling({ root, applicationId, environmentId })`, returning `{ build, migrations, deployment }`. Construct these using the APIs above and existing app-specific compiler/process-manager integrations. The factory owns authorization; `--actor` and `--force` do not grant permission. This explicit module boundary avoids assuming the sibling Data Services service is running or modifying a live database during setup.

```sh
npm run uib -- app validate reservations --tooling ./tooling.mjs --json
npm run uib -- app watch reservations --tooling ./tooling.mjs
npm run uib -- app build reservations --mode production --tooling ./tooling.mjs
npm run uib -- migration preview customer --env development --tooling ./tooling.mjs
npm run uib -- migration confirm PREVIEW_ID --env development --actor developer --confirm-destructive --tooling ./tooling.mjs
npm run uib -- migration status all --env production --tooling ./tooling.mjs
npm run uib -- app preflight ./dist/production/BUILD_ID --target production --tooling ./tooling.mjs
npm run uib -- app deploy PLAN_ID --target production --actor operator --confirm-destructive --tooling ./tooling.mjs
```

`migration confirm` accepts `--custom-handler` and `--custom-description` for reviewed complex changes. `migration apply` is Development-only. `--yes` is unsupported. Production deploy accepts `--force --reason` only for explicitly overrideable policy diagnostics and still requires authorization and destructive confirmation. Exit codes: 0 success, 1 validation/build/deployment failure, 2 usage/operational failure.

## Deployment and recovery

`preflight` verifies the bundle, current target configuration, installed Node major and OS/architecture, migration checksums, ordering, and policy, then persists a reviewable plan. `deploy` repeats checks under the shared environment lock. A required configuration value is checked at execution time and never saved to the manifest/log. Build IDs use UTC timestamp plus a UUID suffix; Git commit and dirty state are recorded in the manifest when available. Compatibility is recorded from the actual build runtime; this implementation was verified on Windows with Node 24.

`LocalDirectoryDeploymentTarget` copies into a new immutable release directory and maintains `active-release.json` and `previous-release.json`. Supply a host supervisor that honors the pointer and implements `activate` and mandatory `health` probes. A JSON pointer is not itself a traffic router; atomic pointer replacement does not promise uninterrupted traffic or atomic database/filesystem changes. The host must provide downtime or routing behavior explicitly.

Deployments with pending migrations quiesce writes, take/verify a backup, apply in order, check the staged runtime, promote, and check again before reopening writes. Durable deployment state lives in `.uib/deployments/<environmentId>/`. Any unfinished state blocks the next deployment even after a process restart. A health failure after mutation leaves maintenance active. Pointer rollback is attempted only when compatibility is positively verified; data restore is never automatic.

For a recovery-required Production deployment, inspect the ledger, durable deployment record, and backup. `DeploymentService.recover` requires the exact deployment/plan/backup IDs, authorized actor, explicit `acceptDataLoss`, a reason, and recovery health probes. It quiesces writes again, verifies/restores the backup, verifies old-runtime compatibility, restores the pointer, checks recovery health, then reopens writes. Any failed recovery step leaves the durable gate in place. Backup restore can lose all writes after the backup. For Development recovery, hold the provider's environment lock, verify quiescence, inspect/restore the recorded backup, verify schema/data/ledger and runtime compatibility, then restart the ORM. Do not delete an incomplete ledger entry to enable a retry.

## Verification and integration limits

The tests exercise dependency/cache behavior, dirty-during-build reruns, shared CLI diagnostics, stale previews, custom migration gating, actual JSON row deletion, checksum/idempotency, backup failure, migration failure, fresh destructive Production approval, staged health failure, explicit restore, and local release-pointer behavior. Real provider/process-manager callbacks are tested with temporary environments; no existing application's data or production runtime is changed by this implementation.

The remaining deployment-specific setup is selecting a real application, mapping its central trigger registrations and applied schemas, and wiring its bundler/supervisor and authorization. Existing Page compiler/production process-manager contracts do not exist in Artifact Foundation v1.1, so the service requires these adapters rather than inventing a replacement application runtime. SQL/online providers and unsupported custom transformations require explicit implementation before they can execute.
