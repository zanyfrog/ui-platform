# UI Platform — Application Build, Migration & Deployment Architecture v1

**Status:** Implementation specification / architecture waypoint  
**Audience:** Codex and UI Platform developers  
**Scope:** Incremental application builds; schema migration generation, approval, and execution; portable production bundles; deployment orchestration and recovery.  
**Dependencies:** Artifact Foundation v1.1, Artifact Definition Registry, the existing Schema/Versioned Definition work, Dataset Operation Engine (DOE), central Trigger Registry, and application configuration.  
**Relationship to earlier plans:** This document supersedes **per-artifact publish and internal artifact source-versioning** proposals. It does **not** supersede permanent artifact IDs, centralized trigger ownership, the shared validation architecture, or Git-based source control.

> **Implementation rule:** Inspect the actual repositories and reuse existing names, definitions, package conventions, logger, ORM/DOE, schema registry, CLI, and file watcher wherever possible. The interfaces below describe required behavior; adapt their exact signatures to established interfaces instead of creating duplicate parallel systems.

---

## 1. Outcomes and Boundaries

Build three cooperating modules:

1. **Application Build Engine**: watches files; tracks dirty artifacts; resolves dependencies; validates and incrementally builds active/reachable artifacts; produces a coherent production build.
2. **Migration Engine**: previews schema differences on developer request; persists a migration artifact **only after confirmation**; applies approved migrations to Development; records environment-specific results in a ledger; prepares and executes production migrations safely.
3. **Deployment Orchestrator**: validates/builds the whole application; produces a streamlined, timestamp-identified runtime bundle; preflights the target; coordinates backup, migration, health checks, and activation.

**Outside v1:** multi-cloud deployment adapter marketplace, visual migration designer, live automatic destructive schema migration, Git replacement, artifact-level publishing, distributed build farm, unrestricted forced deployment, and an end-user inline production editor.

### Architectural invariants

- Files in the development tree are ordinary human-editable source and may be invalid. Saving remains allowed.
- **Only one shared validation implementation** is used by UI, CLI, Registry, incremental builder, migration preflight, application build, import/export, and deployment.
- Git/GitHub, not UI Platform, owns source history/diffs/rollback.
- Application/site is the **publish/deploy unit**; there is no generic artifact-level Publish.
- Trigger `active` (and an explicitly enabled scheduled/background registration) is a runtime property, not publication status. Passive artifacts have no generic `active` flag.
- Production contains what is needed to run, not editing and development infrastructure. Operational logging remains enabled; verbose debug facilities default off.
- A source schema edit **does not alter an applied database schema** until the developer generates, reviews, and confirms a migration.
- No production promotion can silently combine new output with stale development build output.

---

## 2. System Architecture

```text
Development source (apps/, system Trigger Registry, shared packages)
       │
       ├── Filesystem watcher + startup scan/reconciliation
       │       └── changed/dirty artifact tracker
       │
       ├── ArtifactService + Artifact Definition Registry
       │       └── one shared validation service
       │
       ├── Reference/dependency graph
       │       └── active/reachable runtime closure
       │
       ├── Dependency-aware incremental queue
       │       └── .uib/build/<applicationId>/ (intermediate cache)
       │
       └── Schema changes ──► migration preview/approval
                                   └── apply to Development + ledger

Application production build
       ├── scan + full freshness reconciliation
       ├── application/reference validation + build policy
       ├── compile only the required coherent runtime graph
       ├── produce dist/production/<buildId>/
       └── generate runtime-manifest.json + validation report
                        │
Production deployment ──► target environment preflight
       ├── deployment lock + approved pending migrations
       ├── verified backup and maintenance mode when required
       ├── migration execution + environment ledger
       ├── staged runtime / health checks
       └── atomic runtime promotion where supported
```

Use narrow module boundaries: the Artifact Service discovers/loads/validates artifacts, the build engine decides **what needs compilation**, the migration engine changes **database state**, and the deployment orchestrator decides **when and where the finished application goes live**.

---

## 3. Artifact Participation and Application Entry Points

### 3.1 No generic Active property

| Kind | Runtime participation rule |
|---|---|
| Routes | Registered application routes are entry points; they reference Pages and their dependencies. |
| Pages, Forms, Heroes, Templates, CSS, Schemas, services | Included when referenced by an entry point or by an included artifact; global application-level references also count. |
| Triggers | Only `active: true` triggers from the **central system Trigger Registry** are entry points; still require an explicit dataset. |
| Workflows | Invoked workflows are dependencies; explicitly registered startup/scheduled/background workflows are entry points (with `enabled` only where registration semantics require it). |
| Email templates | Referenced templates and templates explicitly registered as runtime entry points are included. An abandoned template is not included merely because its file exists. |
| Unknown or malformed artifact | Detect/report when under known artifact roots; do not silently treat it as a valid runtime entry point. |

An **entry-point registry** is assembled from app routes, application settings/registrations, active triggers, scheduled/background registration, and explicitly exposed services/email endpoints. Follow typed references and relevant code imports from these roots to compute the runtime closure. Reference existence/type checks run through shared artifact validation.

### 3.2 Inactive, unreachable, invalid

- **Inactive self-registering artifact:** record changes and dirty state; do not compile it. Reactivation always triggers reevaluation even if its file timestamp did not change.
- **Unreferenced passive artifact:** it can be discovered and validated as a development diagnostic; it is excluded from the production build closure.
- **Invalid recognized artifact:** record diagnostics; exclude it from successful compilation. If an entry point or reachable dependency requires it, the dependent chain is **blocked** and application build/deploy validation reports an error.
- **Missing/inactive required dependency:** emit a diagnostic naming the referencing artifact, the missing/inactive artifact, and the dependency path. Do not activate it implicitly.
- **Non-artifact unrelated file:** normal file watching rules apply; ignore it unless it is a known build input (such as a shared package source or build configuration).

Application-wide diagnostics may examine all discovered artifacts, including unused artifacts, while **production blocking status** is evaluated against the required runtime closure plus mandatory application/security/build checks. Never suppress a discovered error merely because the artifact is not deployed.

---

## 4. Dependency Graph and Incremental Build Engine

### 4.1 Graph and freshness

Represent each artifact and significant shared build input as a stable node. Record typed edges such as `route -> page`, `page -> form`, `form -> schema`, `page -> component`, `template -> base template`, plus source imports, package dependencies, application-level registrations, and migration/schema gates. A dependency must finish successfully **before** its dependent is built.

An artifact's successful build fingerprint must include, as applicable:

```text
hash(
  normalized authoritative source content + manifest,
  effective Artifact Definition/compiler and relevant settings,
  dependency successful output fingerprints,
  installed relevant package/toolchain versions,
  target build mode
)
```

Use source content hashes, not timestamps alone, to determine freshness. A stored fingerprint is valid only if the source/dependency/build-setting snapshot still matches. Generated cache/state belongs under `.uib/build/<applicationId>/`, not inside each source `artifact.json`.

If a code-level import or configuration change cannot be represented reliably as a narrow dependency, conservatively invalidate the affected package/application subtree or perform a full application rebuild. Reject unsupported **build-order dependency cycles** with a diagnostic; distinguish harmless runtime references from true build-order dependencies.

### 4.2 Watcher and queue algorithm

1. Watch recognized artifact roots plus relevant shared package/configuration inputs. Perform an initial scan; reconcile periodically or when watcher overflow/restart is suspected.
2. Map changed files to stable artifact IDs using discovery/index data. For broken manifests, retain a path-based diagnostic record.
3. Mark changed artifacts dirty immediately. Recompute graph effects when manifests/references/registration flags change.
4. Apply one **configurable platform-wide fixed debounce** (suggested starting default: 300 ms); coalesce repeated events per artifact.
5. If an artifact is already **queued**, update its target dirty generation, without adding a duplicate.
6. If it is already **building**, mark `dirtyDuringBuild`; never discard a newer change because a build started on older inputs.
7. Determine current runtime reachability. Defer building unreachable/inactive artifacts but retain their dirty information.
8. Before building a reachable artifact, recursively ensure all required dependencies have successful **current** builds. Build dirty dependencies first; independent ready nodes may run in parallel.
9. After build, recheck input snapshot/generation. If the inputs changed while building, discard outdated output and enqueue exactly one follow-up build.
10. When a dependency output changes, invalidate and enqueue its reachable dependents in dependency order; do not rebuild an unchanged dependent when its complete fingerprint still matches.

Suggested internal queue states: `clean`, `dirty`, `queued`, `building`, `dirty-during-build`, `succeeded`, `failed`, `blocked`, `deferred`. These are **derived build states**, never generic artifact lifecycle fields.

Pseudocode:

```ts
function onArtifactChange(id: ArtifactId) {
  tracker.markDirty(id);
  graph.reconcileIfStructuralChange(id);
  if (!graph.isRuntimeReachable(id)) return; // remember dirty state
  debounce.schedule(id, () => queue.enqueueOrUpdate(id));
}

async function buildQueued(id: ArtifactId) {
  const snapshot = tracker.captureGenerationAndInputs(id);
  for (const dependency of graph.buildDependencies(id)) {
    await ensureFreshSuccessfulBuild(dependency);
  }
  if (graph.hasFailedRequiredDependency(id)) return markBlocked(id);
  const result = await sharedValidationThenCompile(id, snapshot);
  if (tracker.changedSince(id, snapshot)) {
    discardOutdatedResult(result);
    queue.enqueueOrUpdate(id);
    return;
  }
  recordResultAndFingerprint(result);
  if (result.outputChanged) graph.invalidateReachableDependents(id);
}
```

**Important:** schema edits create a pending-migration gate. A dependent must not compile **against the proposed unapplied database schema** if doing so assumes a database structure that does not exist. See §5.

### 4.3 Development failure behavior

When a required artifact is invalid or fails compilation, mark it failed, mark dependent nodes blocked, show/log diagnostics, and keep unrelated branches working. **Do not silently serve a stale last-known-good build as though it represented current source.** A development error page/panel for the affected route is acceptable. If stale cached output is retained internally for troubleshooting, never select it as the current successful build or package it for Production.

---

## 5. Schema State and Migration Generation

### 5.1 Authoritative schema states

Distinguish:

- **Proposed source schema**: the manually edited artifact on disk, potentially invalid or pending migration.
- **Applied schema**: the structure actually present in the target environment's database; verified using the migration ledger/provider introspection where supported.
- **Pending migration proposal**: reviewable comparison, not yet a permanent migration artifact and not yet executed.
- **Confirmed migration artifact**: persistent, Git-tracked instructions approved by the developer.

Changing a schema file causes watcher-based artifact validation and `migration-pending` reporting. It does **not** alter the Development DB, and its dependent development builds must not assume the new applied schema until execution succeeds.

### 5.2 Developer-controlled generation

1. Developer edits a Dataset Schema and saves it; automatic validation/logging runs.
2. Developer selects **Generate Migration** (UI or CLI).
3. Migration Engine compares the **applied** schema/baseline with proposed source using permanent field IDs, lifecycle metadata, defaults, relationships, provider capability metadata, and the existing schema definition rules.
4. Build a human-readable **preview**: operation order; adds/modifies/renames/deletes; dataset destruction; data-loss implications; provider support; defaults/backfill; estimated impact if measurable; warnings; backup/maintenance requirements.
5. Preview holds source/applied schema fingerprints. A changed source or changed applied baseline invalidates the preview and forces regeneration before confirmation.
6. If the conversion cannot be safely generated, request a **custom migration definition**. The developer must review and confirm the custom logic and its destructive effects explicitly.
7. **Only after confirmation**, persist the migration as an artifact in the application source tree; assign an immutable migration ID, content checksum, source and target schema fingerprints, dependencies/order, and applicable provider constraints.
8. Execute the confirmed migration in Development after preflight and required backup; write ledger state and operation logs; only on success clear the pending-schema gate and build the affected dependency chain.

The user-approved behavior is **Generate -> Preview -> Confirm -> Persist Migration -> Execute**. Never auto-execute a schema migration merely because the watcher detects a dirty schema.

### 5.3 Migration artifact example

Suggested layout (reuse the actual Artifact Foundation bundle conventions):

```text
apps/reservations/migrations/customer/
└── 20260924T191500Z-add-preferred-name/
    ├── artifact.json
    └── migration.json
```

Suggested conceptual content (adapt to canonical registry schema rather than maintaining duplicate definitions):

```json
{
  "schemaVersion": 1,
  "artifactId": "migration_customer_20260924T191500Z",
  "artifactType": "migration",
  "name": "add-preferred-name",
  "definitionVersion": 1,
  "files": { "definition": "migration.json" },
  "config": { "dataset": "customer" }
}
```

```json
{
  "datasetId": "schema_customer",
  "fromSchemaFingerprint": "sha256:OLD",
  "toSchemaFingerprint": "sha256:NEW",
  "dependsOnMigrationIds": [],
  "operations": [
    {
      "operation": "addField",
      "fieldId": "fld_customer_preferred_name",
      "name": "preferredName",
      "type": "string",
      "required": false
    }
  ],
  "requiresBackup": false,
  "requiresMaintenance": false
}
```

For destructive operations such as dropping a field, dropping a dataset, or irreversible data transformation, `requiresBackup` and a clearly identified destructive-operation classification are mandatory. A deletion confirmed in Development **really deletes the selected data**; the developer must see that in the preview. Production requires **a second explicit destructive-migration confirmation** during deployment preflight.

Do not regenerate migration operations from log messages. Migration definitions are source-controlled, replayable instructions; the ledger describes environmental application state.

### 5.4 Migration artifact and validator compatibility

Artifact Foundation v1.1 currently proves Route/RouteGroup, Form, and Trigger. Register `migration` as an additional artifact type through the existing Artifact Definition Registry and shared validator; do not fork artifact storage/validation logic. Compare a migration's source/target fingerprints and checksum before executing it. Never silently mutate an already-applied migration definition; create a new migration for subsequent changes.

---

## 6. Migration Ledger vs. Operation Logs

**Three separate responsibilities:**

| Record | Location / ownership | Purpose |
|---|---|---|
| Migration definition | Git-tracked application source artifact | Authoritative ordered operations that can move to another environment. |
| Migration ledger | Each target database/environment, through a provider-independent adapter | Authoritative **applied state**, ordering, checksum verification, and safe retry/recovery decisions. |
| Operation log | Existing application/system operations logger | Timeline of generation, approval, backup, execution, error, restore, and deploy activity, linked by IDs. |

Minimum conceptual ledger fields:

```ts
interface MigrationLedgerEntry {
  migrationId: string;
  datasetId: string;
  migrationChecksum: string;
  fromSchemaFingerprint: string;
  toSchemaFingerprint: string;
  state: "applying" | "applied" | "failed" | "recovery-required";
  startedAt: string;
  completedAt?: string;
  environmentId: string;
  deploymentId?: string;
  backupId?: string;
  actorId?: string;
  errorReference?: string;
}
```

Requirements:

- Only **one application of a migration per environment**. Verify both migration ID and checksum; identical already-applied migrations are skipped, while changed content under the same ID is a hard conflict.
- A failed/incomplete migration is **not** treated as unapplied and blindly retried. Provider-specific inspection/recovery must establish the real DB state.
- Write ledger changes in the same database transaction as migration operations **when the provider supports it**. Otherwise use staged state plus explicit recovery verification.
- Mask sensitive DB identifiers and never put secrets or row-level personal data in operation logs.
- The production deploy derives pending migration work from **confirmed source migration artifacts compared with the target environment ledger**, not the Development log.
- Persist a stable initial applied-schema baseline when onboarding an existing database; never guess that a newly edited source file reflects the actual database.

---

## 7. Development Migration Execution

```text
Schema changed -> validated -> pending migration (no DB changes)
Developer Generate -> review preview -> Confirm
             ↓
Persist immutable migration definition in source
             ↓
Acquire development migration lock
             ↓
Verify baseline and backup as required
             ↓
Apply to Development using provider/DOE migration capability
             ↓
Write environment ledger + linked operation log
             ↓
Refresh applied-schema index
             ↓
Unblock and rebuild schema and reachable dependents
```

If migration fails, the proposed source remains editable, the existing database's **actual** state is inspected, the schema gate remains pending/failed, affected dependents stay blocked, and unrelated development continues. Restore from a verified backup if the attempted migration left the environment in an unsafe state and recovery rules call for restoration.

Migrating against the active database is distinct from saving a schema artifact. No generic artifact-level Publish operation is introduced.

---

## 8. Application Validation and Build Policies

### 8.1 Full diagnostics versus build blockers

**Application Validation** discovers and reports artifact-level, global, and cross-artifact problems even in unused source where feasible. **Build Validation** determines whether the required runtime closure is coherent.

Recommended initial policy:

| Context | Normal behavior |
|---|---|
| Development editing/save | Report and log; do not block editing or Save. |
| Incremental Development build | Compile reachable/valid branches; fail affected nodes and their dependents; unrelated branches continue. |
| Production build | Validate full required runtime graph and mandatory global checks. Hard compilation, missing required dependencies, unapplied required schema gates, and invalid output block. |
| Deploy | Normally block errors under target policy. A narrowly authorized override can waive only specifically classified overrideable **policy** diagnostics. |

Avoid a global rule that any artifact error whatsoever prevents compiling an otherwise independent development branch. Equally, don't ignore a broken artifact referenced by a runtime entry point.

### 8.2 Explicit non-overrideable failures

- Production compilation/bundling cannot complete.
- Required runtime module, active entry point, or mandatory dependency is missing or failed.
- Runtime manifest/package integrity verification fails.
- Required secrets/environment configuration are unavailable.
- Migration has failed, prerequisite checksum/baseline mismatches, backup requirements cannot be met, or recovery is unresolved.
- Staged runtime fails mandatory startup/health check or target switch cannot be completed safely.

An explicit `--force` / UI override may waive only diagnostics **preclassified** by a validation/build policy as overrideable; it is not an instruction to ignore failed compilation or migration. Record actor, target environment, reason, diagnostic IDs, and build/deployment IDs; require independent destructive-migration approval regardless of `--force`. Implement authorization checks at the existing security layer when available; never treat CLI flag possession as authorization in a managed deployment.

---

## 9. Production Build and Runtime Bundle

### 9.1 One simple canonical production format

Do **not** design a deployment-packaging plugin marketplace in v1. Generate one canonical Node-compatible directory bundle, optionally archivable/copied with normal filesystem tools. Advanced Docker, cloud, SSH, or SFTP adapters can be added later **outside** the build contract.

```text
dist/production/<buildId>/
├── server/                 # compiled server/runtime entry
├── public/                 # production JS, CSS, assets
├── runtime/                # generated route/validator/trigger/workflow data
├── runtime-manifest.json
├── validation-report.json
├── package.json            # only production runtime requirements
└── package-lock.json       # if required by packaging strategy
```

Produce a **runnable bundle for an explicitly supported Node version and target OS/architecture**. If native runtime dependencies exist, package/install them for the target compatibility profile and fail verification on mismatch. v1 packaging can use the repository's existing production dependency strategy; do not accidentally copy dev dependencies. Validate the final bundle in an isolated/staged runtime before activation. A compatible target still supplies Node/system prerequisites and runtime environment values unless the project explicitly bundles them.

Strip/omit production-irrelevant editor UI, discovery/editing tooling, development reconciliation, HMR, unused artifacts, unnecessary source files, and verbose debug panels. Keep required runtime validation/schema metadata and production log infrastructure. Debug/trace logging defaults off, with controlled configuration for troubleshooting. Optional source maps should be disabled by default or distributed separately with restricted access; do not serve private server source maps publicly.

### 9.2 Build ID and runtime manifest

Use UTC datetime **plus** unique information; Git is optional:

```text
reservations-20260924T191500Z-g7ae31c2-4d9f
```

When Git is unavailable, replace the Git portion with a generated suffix. Keep build identity distinct from source fingerprint. If Git working tree is dirty, record that in the manifest and use source hashes so a build is reproducible/traceable despite uncommitted files.

Example generated `runtime-manifest.json`:

```json
{
  "manifestVersion": 1,
  "buildId": "reservations-20260924T191500Z-g7ae31c2-4d9f",
  "applicationId": "reservations",
  "builtAt": "2026-09-24T19:15:00Z",
  "sourceFingerprint": "sha256:SOURCE_HASH",
  "gitCommit": "7ae31c2",
  "gitDirty": false,
  "uiPlatformVersion": "REPLACE_AT_BUILD",
  "runtimeCompatibility": {
    "node": "REPLACE_WITH_SUPPORTED_RANGE",
    "target": "REPLACE_WITH_TARGET"
  },
  "entryPoint": "server/index.js",
  "routesManifest": "runtime/routes.json",
  "registeredTriggersManifest": "runtime/triggers.json",
  "registeredWorkflowsManifest": "runtime/workflows.json",
  "requiredEnvironmentKeys": ["DATABASE_URL"],
  "migrationIdsIncluded": ["migration_customer_20260924T191500Z"],
  "validationReport": "validation-report.json"
}
```

Build output is immutable after packaging. Prefer deterministic ordering of generated manifest content. Never embed database passwords/API secrets in runtime manifest, build logs, or bundle source.

---

## 10. Environment Configuration

A single built production bundle should be reusable across compatible Test/QA/Staging/Production environments. Provide required **configuration keys and nonsecret defaults**, not environment-specific secret values, in the bundle. Supply DB credentials, SMTP secrets, encryption keys, API tokens, endpoint settings, feature switches, port/host settings, and logging levels through target environment configuration and secure secret providers.

Validate required values and target compatibility at preflight and startup. Environment `id`, effective policy, and deploy-target configuration are external to the source artifacts. Do not require rebuilding simply because a target environment URL/secret changes.

---

## 11. Deployment Orchestration, Migration, and Recovery

### 11.1 Environment-level lock for v1

Acquire **one deployment/migration lock per target environment**. Later a more granular schema-scoped lock may be considered, but environment-level exclusivity is v1. Verify/expire abandoned locks safely; record ownership and lease details. Also prevent conflicting concurrent developer migration applications against the same database.

### 11.2 Recommended deployment sequence

```text
1. Select validated source/build and target environment
2. Resolve complete runtime closure, pending confirmed migrations, policy
3. Full production build -> immutable candidate runtime bundle
4. Verify candidate manifest, dependencies, checksums, required config
5. Acquire environment deployment lock
6. Production preflight:
   - compare target ledger and migration checksums/order
   - assess destructive/data-loss and old/new runtime compatibility
   - explicitly approve destructive changes AGAIN for Production
   - classify policy diagnostics/approved overrides
   - choose whether maintenance/read-only access is required
7. Stage new bundle without switching traffic
8. Perform pre-migration startup checks possible against existing DB
9. Quiesce writes / enable maintenance if required
10. Take and verify pre-deployment backup when migration changes data;
    mandatory for destructive migration
11. Apply pending migrations in order using provider capability
12. Commit/verify ledger records and applied schema state
13. Start/check staged runtime with target environment against migrated DB
14. Run mandatory health and migration-readiness checks
15. Atomically promote target runtime/traffic pointer where target supports it
16. Verify post-promotion health; record success and release lock
17. Exit maintenance only when runtime and data are confirmed compatible
```

Build/Deploy may be one UI button, but **build**, **migration**, **deploy**, and **activation** remain distinct internal operations. A production candidate must not pick up outdated local development cache artifacts merely because they are available.

### 11.3 No false claim of a single transaction

Application filesystem replacement and an external database migration generally cannot share one physical transaction. Implement a durable **deployment state machine + recovery plan**, not a promise that every arbitrary migration can be reversed instantly.

| Failure point | Required v1 behavior |
|---|---|
| Before migration | Do not switch traffic. Discard staged candidate; retain current Production. |
| Backup creation/verification fails | Stop before migration; keep existing Production. |
| Migration fails | Stop; mark ledger/deployment recovery required where appropriate; inspect/restore using provider procedure; don't switch Production. |
| Migration succeeds, staged runtime health fails | Do not switch; keep maintenance/read-only if old runtime is incompatible; perform an explicitly safe rollback/restore plan or repair-forward. |
| Switch fails | Keep/restore old runtime pointer if compatible; follow database compatibility/recovery plan before reopening writes. |
| Post-switch health fails | Attempt runtime pointer rollback only if old runtime is compatible with current DB; otherwise hold maintenance and use controlled restore/repair-forward. |

A backup restore **may discard writes made after the backup**. Before restoring live production data, ensure writes were quiesced or obtain operator confirmation of potential loss. For v1 destructive/incompatible migrations, require maintenance/read-only mode around backup, migration, staged health validation, and promotion. Favor additive/expand-contract changes to reduce downtime when providers support them.

A backup is mandatory before production **data-changing migrations**, especially destructive ones; for code-only deploys it may be configurable. The backup interface must expose `create`, `verify`, `restore` (subject to provider capabilities), and backup identifiers without leaking credentials. A migration may declare `requiresMaintenance`; destructive/incompatible operations should require it unless the provider can prove safe online execution.

### 11.4 Health checks

Check process startup, required configuration, database connectivity and expected migration-ledger state, runtime route/service readiness, and application-defined health probes. Promotion requires mandatory checks to succeed. Keep old runtime in place until the new candidate is healthy; promotion is atomic where the host supports it (such as changing an active release pointer), otherwise use explicit downtime/rollback-safe procedures and disclose limitations.

---

## 12. Logging and Observability

Preserve operational logging in Production (errors, warnings, security/audit where applicable, startup/shutdown, request and trigger/workflow failures, deployment/build identity). Disable noisy debug/trace output by default rather than stripping useful log infrastructure.

Record correlated events with at least:

```text
timestamp, applicationId, artifactId when applicable,
buildId, deploymentId, migrationId when applicable,
environmentId, operation, status, diagnostic counts,
error code, duration, actor (for confirmation/override)
```

Keep application operation logs separate from security/audit logs and **separate from the authoritative migration ledger**. Never log secrets, migration data row contents, or sensitive configuration values.

---

## 13. Package Responsibilities and Example Contracts

Use existing monorepo/package naming conventions; these are logical modules and may begin within an existing package instead of proliferating NPM dependencies:

```text
@ui-platform/artifacts            existing Artifact Foundation API
@ui-platform/app-build            new graph, watcher coordination, queue, cache, build
@ui-platform/migrations           new generator, preview, confirm, apply, ledger adapter
@ui-platform/deployment           new preflight, packaging, health/promotion, recovery
@ui-platform/validation           shared validator API (reuse existing location)
```

Proposed **logical** interfaces (reconcile with the real repository before committing signatures):

```ts
interface BuildEngine {
  onSourceChanged(path: string): Promise<void>;
  validateApplication(appId: string): Promise<ApplicationValidationReport>;
  ensureFreshBuild(artifactId: string): Promise<ArtifactBuildResult>;
  buildProduction(appId: string): Promise<ProductionBuildResult>;
}

interface MigrationEngine {
  preview(datasetId: string, environmentId: string): Promise<MigrationPreview>;
  confirm(previewId: string, approval: MigrationApproval): Promise<MigrationArtifact>;
  apply(migrationId: string, environmentId: string): Promise<MigrationApplyResult>;
  pendingForEnvironment(appId: string, environmentId: string): Promise<MigrationArtifact[]>;
}

interface MigrationLedgerAdapter {
  readEnvironmentState(environmentId: string): Promise<AppliedMigrationState>;
  beginAttempt(migrationId: string, checksum: string): Promise<void>;
  recordOutcome(outcome: MigrationApplyResult): Promise<void>;
}

interface BackupProvider {
  create(environmentId: string, deploymentId: string): Promise<BackupReference>;
  verify(backup: BackupReference): Promise<void>;
  restore(backup: BackupReference): Promise<void>;
}

interface DeploymentService {
  preflight(buildId: string, environmentId: string): Promise<DeploymentPlan>;
  deploy(planId: string, approvals: DeploymentApprovals): Promise<DeploymentResult>;
}
```

**Trust boundary:** a confirmed migration and its checksums are trusted inputs only after validation, authorization, preview baseline recheck, and recorded approval. Validation plugins and migration code run in trusted developer/server tooling, never untrusted browser input.

---

## 14. CLI and UI Integration

The CLI and future UI must call the same build/migration/deploy services. Suggested command shape (conform to the actual CLI conventions):

```bash
uib app validate reservations
uib app build reservations --mode development
uib app build reservations --mode production

uib migration preview customer --env development
uib migration confirm <previewId>
uib migration apply <migrationId> --env development
uib migration status --env production

uib app deploy reservations --target production
# explicit, authorized override only for classified policy diagnostics:
uib app deploy reservations --target production --force --reason "approved exception"
```

A generated preview may live in an ephemeral `.uib/proposals/` workspace for CLI-to-UI handoff, **not** as a persistent migration artifact until confirmed. Previews store source/baseline fingerprints; stale previews cannot be confirmed. Do not let a noninteractive `--yes` silently bypass destructive production confirmation.

UI panels can later expose Application Health, Build Queue, Pending Migrations, Production Preflight, and Deployment History, but v1 services must not depend on those UI components.

---

## 15. Implementation Work Packages for Codex

Implement in this dependency order, using small independently testable changes and tests in the project's existing framework.

### WP1 — Reconcile upstream contracts

- Inspect Artifact Foundation v1.1 implementation and actual repository layout.
- Locate the Artifact Definition Registry, schema/field-ID model, DOE/ORM interfaces, central Trigger Registry, existing logger/CLI/watcher.
- Create an integration map; reuse canonical IDs and existing validation. If essential upstream functionality is absent, add a narrow adapter or a documented prerequisite, not a competing registry.

### WP2 — Entry-point registry and dependency graph

- Identify routes, active triggers, registered workflows and email/service entry points.
- Resolve typed artifact dependencies and significant code imports.
- Implement graph updates, reachable closure, reverse dependents, missing/inactive diagnostics, and build-order cycle handling.

### WP3 — Watcher, dirty tracker, queue, cache

- Wire existing filesystem watcher (or add narrowly if absent).
- Implement per-artifact dirty generations, fixed debounce, deduplication, dirty-during-build, dependency-first parallel scheduling.
- Store fingerprint-based successful build cache under `.uib/build/<applicationId>/` with safe cleanup.
- Implement startup full scan/reconciliation and conservative fallback invalidation.

### WP4 — Application validation and production builder

- Aggregate shared diagnostics, add cross-artifact checks, distinguish report-only diagnostics from build-blocking errors.
- Define build compilation hooks for initial artifact types and existing app runtime; produce a coherent runtime closure.
- Generate timestamped Build IDs, `runtime-manifest.json`, and validation report; exclude development-only components.

### WP5 — Migration artifacts, previews, and ledger

- Register migration type in canonical Artifact Definition Registry.
- Compare applied schema vs source schema using permanent IDs and existing schema lifecycle metadata.
- Generate reviewable preview with stale fingerprint rejection and custom migration fallback.
- Persist artifact **only upon confirmation**; apply to Development through provider/DOE adapter.
- Implement environment ledger and linked operation log; add pending-schema build gate and requeue dependents on success.

### WP6 — Backup, deploy orchestration, recovery

- Implement provider-independent backup create/verify/restore boundary; choose one supported initial provider using existing ORM/DOE infrastructure.
- Implement environment deployment lock, migration preflight, explicit destructive approval, staged runtime health, promotion and recovery state machine.
- Keep deployment packaging a simple portable directory in v1.
- Wire optional, auditable override for **explicitly overrideable** policy diagnostics only.

### WP7 — CLI, documentation, and end-to-end tests

- Add thin CLI wrappers; use service APIs, not parallel logic.
- Document environment setup, supported backup provider, Node/OS compatibility, runtime manifest and operational recovery procedure.
- Validate acceptance scenarios below.

If upstream Artifact Foundation v1.1 is still being built, WP2/WP3 contracts and fixtures can be prepared in parallel, but don't wire two versions of the same Artifact Service or validator.

---

## 16. Required Acceptance Tests

### Incremental build

- A dirty Page builds after its dirty Form and Schema dependencies; clean dependencies with matching fingerprints are reused.
- A dependency source or toolchain change invalidates a dependent even when the dependent file timestamp is unchanged.
- Repeated changes while queued create one queue entry; a change during an active build schedules a subsequent build and prevents stale result publication.
- Independent DAG branches build in parallel; failed dependency blocks only its reachable dependents.
- Inactive Trigger modifications are tracked but not built; activation without a further file edit forces validation/build.
- An unknown/malformed artifact under artifact roots is diagnosed, not treated as an entry point.
- A broken reachable artifact produces visible development diagnostics; no silent old-build serving.
- Full production build detects cache staleness and produces an internally consistent bundle.

### Migration generation and development

- A source schema edit is validated and reported pending but does **not** mutate Development DB.
- Generate Migration returns a preview, not a persisted artifact; changing source or applied baseline makes an old preview unconfirmable.
- Confirmation persists the migration artifact and attempts Development application.
- Complex/unsafe diff requests a custom migration plus review.
- Confirmed destructive operation clearly warns and actually deletes only the selected data upon execution.
- Applied Development ledger records migration ID and checksum; the log references the same ID.
- The same migration cannot accidentally reapply; same ID with changed checksum is rejected.
- Failed migration does not mark the new schema applied, and affected builds remain gated until inspected/recovered.

### Production build/deploy

- Build ID includes UTC timestamp plus Git metadata when available (or unique suffix when absent); runtime manifest inventories runtime components and required environment keys.
- Production bundle excludes editor/development modules and retains operational logging/runtime validation.
- Migration ledger differences identify pending migrations for target; Production requires **new confirmation** for destructive operations.
- A required backup failure halts deployment before data mutation.
- Environment deployment lock prevents concurrent production migration/deployment.
- A failed migration, unresolved recovery, missing required dependency, broken build, missing required environment value, or failed mandatory health check cannot be overridden.
- Authorized force deploy overrides only preclassified policy diagnostics, with actor/reason/diagnostics logged.
- Staged runtime is checked before promotion; a failed staged check leaves the current runtime pointer unchanged and invokes the documented data compatibility/recovery policy.
- Recovery tests demonstrate maintenance/write-quiescing where backup restore could otherwise lose post-backup writes.

### Shared interfaces

- CLI and underlying shared validation report identical diagnostic codes/content for the same artifact and application inputs.
- No per-artifact Publish and no UI Platform-managed Git replacement/source revision subsystem is introduced.

---

## 17. Open Integration Choices (Nonblocking Defaults)

The behavioral decisions above are confirmed. Codex should inspect real project capabilities before fixing these infrastructure details:

1. **Initial database backup provider:** implement the interface and first adapter for the actual existing development/production database backend; document databases not yet supported.
2. **Initial deploy target:** generate a portable `dist/production/<buildId>/` unconditionally. For automated deployment, use the simplest already-supported local/server target; avoid inventing a cloud deployment plugin layer.
3. **Node and OS compatibility:** record the actually supported Node major version and native package target in the manifest; test with the current repository's runtime.
4. **Debounce/parallelism/cache limits:** start with platform-wide defaults and allow simple configuration. No per-artifact tuning in v1.
5. **Schema online migration capability:** ask the provider adapter whether an operation is transactional/online/reversible; default to conservative backup + maintenance when uncertain.

**Escalate only if** an existing repository contract or target database makes the mandated safe behavior impossible. Do not reinterpret the approved design silently.

---

## 18. Decision Record / Supersession Summary

- **Approved:** dependency-first queue; queued-change coalescing; dirty-during-build rerun; parallel independent builds; no silent last-known-good development output; no general artifact `active` flag; central active Trigger Registry; pending migrations manually generated/confirmed; confirmation before persisting migration artifact; separate environment ledger and linked logs; explicit second production destructive approval; simple portable runtime bundle; production operational logging retained; runtime secrets supplied by environment; narrowly classified force-deploy validation override; timestamp-inclusive Build ID; staged health checks; environment-level deployment lock; provider-independent backups.
- **Explicitly superseded:** automatic database migration on every dirty schema watcher event; internal artifact Draft revision/version history; per-artifact Publish; production promotion of mixed stale development outputs.
- **Future:** deployment adapters/plugins, more granular schema-scoped deployment locks, smarter incremental field-level impact analysis, and online-expand/contract optimization.
