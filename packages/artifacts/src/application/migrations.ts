import path from "node:path";
import { mkdir, rename } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { safeFile } from "../bundle.js";
import { ArtifactValidationError } from "../validation/artifact-validation-error.js";
import type { ArtifactService, EditableArtifact } from "../types.js";
import { storageDirectory } from "../storage.js";
import {
  fingerprint,
  identifier,
  logOperation,
  readJson,
  writeJson,
} from "./common.js";
import {
  migrationChecksum,
  migrationErrors,
  schemaErrors,
  type DatasetSchema,
  type MigrationDefinition,
  type MigrationOperation,
} from "./migration-definition.js";

export interface MigrationLedgerEntry {
  migrationId: string;
  datasetId: string;
  migrationChecksum: string;
  fromSchemaFingerprint: string;
  toSchemaFingerprint: string;
  state: "applying" | "applied" | "failed" | "recovery-required";
  environmentId: string;
  startedAt: string;
  completedAt?: string;
  deploymentId?: string;
  backupId?: string;
  actorId: string;
}
export interface BackupReference {
  id: string;
  environmentId: string;
  checksum: string;
}
export interface MigrationProvider {
  id: string;
  environmentId: string;
  production: boolean;
  /** Shared with deployment. Cross-process, exclusive; must not steal an unverified lease. */
  exclusive<T>(action: () => Promise<T>): Promise<T>;
  appliedSchema(datasetId: string): Promise<DatasetSchema>;
  ledger(): Promise<MigrationLedgerEntry[]>;
  record(entry: MigrationLedgerEntry): Promise<void>;
  preflight(migration: MigrationDefinition): Promise<void>;
  /** Transactional providers must atomically commit operations/schema and applied ledger entry. */
  execute(
    migration: MigrationDefinition,
    applied: MigrationLedgerEntry,
  ): Promise<void>;
  maintenance(enabled: boolean): Promise<void>;
  createBackup(): Promise<BackupReference>;
  verifyBackup(backup: BackupReference): Promise<void>;
  restoreBackup(backup: BackupReference): Promise<void>;
}
export interface MigrationPreview {
  previewId: string;
  datasetId: string;
  environmentId: string;
  provider: string;
  sourceChecksum: string;
  fromSchemaFingerprint: string;
  toSchemaFingerprint: string;
  targetSchema: DatasetSchema;
  operations: MigrationOperation[];
  customRequired: boolean;
  warnings: string[];
  destructive: boolean;
  dependsOnMigrationIds: string[];
}
export interface MigrationApproval {
  actorId: string;
  destructive: boolean;
  reason?: string;
}
export interface MigrationOptions {
  root: string;
  applicationId: string;
  service: ArtifactService;
  provider: MigrationProvider;
  authorize: (
    action: "confirm" | "apply",
    approval: MigrationApproval,
  ) => Promise<boolean>;
  onApplied?: (datasetId: string) => Promise<void>;
}
export class MigrationEngine {
  constructor(readonly options: MigrationOptions) {
    identifier(options.applicationId);
  }
  private async source(datasetId: string) {
    const artifact = await this.options.service.load(datasetId);
    if (!artifact.validation.valid)
      throw new ArtifactValidationError(
        "Source dataset must pass shared artifact validation.",
        artifact.validation,
      );
    if (artifact.manifest?.artifactType !== "dataset")
      throw new Error("Expected a dataset artifact.");
    const schema = JSON.parse(
      artifact.files.find((f) => f.role === "definition")!.content,
    ) as DatasetSchema;
    return { artifact, schema };
  }
  async schemaGate(artifact: EditableArtifact) {
    try {
      if (
        (await this.options.provider.ledger()).some(
          (e) => e.state !== "applied",
        )
      )
        return false;
      return (
        fingerprint(
          await this.options.provider.appliedSchema(
            artifact.manifest!.artifactId,
          ),
        ) ===
        fingerprint(
          JSON.parse(
            artifact.files.find((f) => f.role === "definition")!.content,
          ),
        )
      );
    } catch {
      return false;
    }
  }
  async preview(datasetId: string): Promise<MigrationPreview> {
    const { artifact, schema } = await this.source(datasetId);
    const applied = await this.options.provider.appliedSchema(datasetId);
    if (
      schemaErrors(applied).length ||
      applied.dataset.id !== schema.dataset.id
    )
      throw new Error(
        "Applied schema baseline is invalid or has a different permanent identity.",
      );
    const operations: MigrationOperation[] = [],
      warnings: string[] = [];
    let customRequired =
      fingerprint(applied.dataset) !== fingerprint(schema.dataset);
    for (const field of applied.fields) {
      const next = schema.fields.find((f) => f.id === field.id);
      if (!next)
        operations.push({
          operation: "dropField",
          fieldId: field.id,
          key: field.key,
        });
      else {
        if (next.key !== field.key)
          operations.push({
            operation: "renameField",
            fieldId: field.id,
            from: field.key,
            to: next.key,
          });
        if (fingerprint({ ...field, key: next.key }) !== fingerprint(next))
          customRequired = true;
        if (
          next.key !== field.key &&
          applied.fields.some((f) => f.id !== field.id && f.key === next.key)
        )
          customRequired = true;
      }
    }
    for (const field of schema.fields)
      if (!applied.fields.some((f) => f.id === field.id)) {
        operations.push({ operation: "addField", field });
        if (field.required && field.default === undefined)
          customRequired = true;
      }
    const destructive =
      customRequired || operations.some((o) => o.operation === "dropField");
    if (destructive)
      warnings.push(
        "Execution may permanently remove or transform data. A verified backup and write maintenance are required.",
      );
    if (customRequired)
      warnings.push(
        "This change needs a reviewed custom handler; generated operations alone are not safe.",
      );
    const ledger = await this.options.provider.ledger();
    if (ledger.some((e) => e.state !== "applied"))
      throw new Error(
        "Environment requires migration recovery before a new preview.",
      );
    const preview: MigrationPreview = {
      previewId: randomUUID(),
      datasetId,
      environmentId: this.options.provider.environmentId,
      provider: this.options.provider.id,
      sourceChecksum: artifact.checksum,
      fromSchemaFingerprint: fingerprint(applied),
      toSchemaFingerprint: fingerprint(schema),
      targetSchema: schema,
      operations,
      destructive,
      customRequired,
      warnings,
      dependsOnMigrationIds: ledger
        .filter((e) => e.datasetId === datasetId)
        .slice(-1)
        .map((e) => e.migrationId),
    };
    await writeJson(
      path.join(
        await storageDirectory(this.options.root, "proposals"),
        `${preview.previewId}.json`,
      ),
      preview,
    );
    return preview;
  }
  async confirm(
    previewId: string,
    approval: MigrationApproval,
    custom?: { handlerId: string; description: string },
  ): Promise<MigrationDefinition> {
    identifier(previewId);
    if (this.options.provider.production)
      throw new Error(
        "Confirm and persist source migrations against Development; Production uses deployment preflight.",
      );
    if (
      !approval.actorId ||
      !(await this.options.authorize("confirm", approval))
    )
      throw new Error("Migration confirmation is not authorized.");
    const migration = await this.options.provider.exclusive(async () => {
      const preview = await readJson<MigrationPreview>(
        path.join(
          await storageDirectory(this.options.root, "proposals"),
          `${previewId}.json`,
        ),
      );
      const { artifact, schema } = await this.source(preview.datasetId);
      if (
        preview.environmentId !== this.options.provider.environmentId ||
        preview.provider !== this.options.provider.id ||
        preview.sourceChecksum !== artifact.checksum ||
        preview.toSchemaFingerprint !== fingerprint(schema) ||
        preview.fromSchemaFingerprint !==
          fingerprint(
            await this.options.provider.appliedSchema(preview.datasetId),
          )
      )
        throw new Error(
          "Stale migration preview; regenerate before confirming.",
        );
      if (preview.destructive && !approval.destructive)
        throw new Error(
          "Explicit destructive migration confirmation is required.",
        );
      if (preview.customRequired && (!custom?.handlerId || !custom.description))
        throw new Error("A reviewed custom migration handler is required.");
      // Recompute operations from authoritative current schemas; proposal files are not executable authority.
      const fresh = await this.preview(preview.datasetId);
      if (
        fingerprint(fresh.operations) !== fingerprint(preview.operations) ||
        fresh.destructive !== preview.destructive ||
        fresh.customRequired !== preview.customRequired
      )
        throw new Error("Preview content changed; regenerate.");
      const migrationId = `migration-${previewId}`;
      const body: Omit<MigrationDefinition, "checksum"> = {
        migrationId,
        datasetId: preview.datasetId,
        fromSchemaFingerprint: preview.fromSchemaFingerprint,
        toSchemaFingerprint: preview.toSchemaFingerprint,
        targetSchema: schema,
        dependsOnMigrationIds: fresh.dependsOnMigrationIds,
        operations: preview.customRequired
          ? [{ operation: "custom", ...custom! }]
          : fresh.operations,
        provider: preview.provider,
        destructive: fresh.destructive,
        requiresBackup: fresh.operations.length > 0 || fresh.customRequired,
        requiresMaintenance:
          fresh.operations.length > 0 || fresh.customRequired,
        approval: {
          actorId: approval.actorId,
          confirmedAt: new Date().toISOString(),
          destructive: approval.destructive,
        },
      };
      const definition = { ...body, checksum: migrationChecksum(body) };
      if (migrationErrors(definition).length)
        throw new Error("Migration definition failed shared validation.");
      await this.options.provider.preflight(definition);
      const parent = await safeFile(this.options.root, "migrations");
      await mkdir(parent, { recursive: true });
      const staging = path.join(
        await storageDirectory(this.options.root, "proposals"),
        `bundle-${randomUUID()}`,
      );
      await mkdir(staging);
      await writeJson(path.join(staging, "migration.json"), definition);
      await writeJson(path.join(staging, "artifact.json"), {
        schemaVersion: 1,
        artifactId: migrationId,
        artifactType: "migration",
        name: migrationId,
        definitionVersion: 1,
        files: { definition: "migration.json" },
        config: { dataset: preview.datasetId },
      });
      await rename(staging, path.join(parent, migrationId));
      await logOperation(this.options.root, {
        operation: "migration.confirm",
        status: "confirmed",
        applicationId: this.options.applicationId,
        environmentId: preview.environmentId,
        migrationId,
        actorId: approval.actorId,
      });
      return definition;
    });
    await this.apply(migration.migrationId, approval);
    return migration;
  }
  async load(migrationId: string): Promise<MigrationDefinition> {
    const artifact = await this.options.service.load(migrationId);
    if (!artifact.validation.valid)
      throw new ArtifactValidationError(
        "Migration failed shared validation.",
        artifact.validation,
      );
    if (artifact.manifest?.artifactType !== "migration")
      throw new Error("Expected a migration artifact.");
    const definition = JSON.parse(
      artifact.files.find((f) => f.role === "definition")!.content,
    ) as MigrationDefinition;
    return definition;
  }
  async pendingForEnvironment(): Promise<MigrationDefinition[]> {
    const ledger = await this.options.provider.ledger();
    if (ledger.some((e) => e.state !== "applied"))
      throw new Error("Migration recovery is required.");
    const all: MigrationDefinition[] = [];
    for (const summary of await this.options.service.discover(
      this.options.root,
    ))
      if (summary.artifactType === "migration")
        all.push(await this.load(summary.bundlePath));
    for (const migration of all) {
      const entry = ledger.find((e) => e.migrationId === migration.migrationId);
      if (entry && entry.migrationChecksum !== migration.checksum)
        throw new Error("Applied migration checksum conflict.");
    }
    const done = new Set(ledger.map((e) => e.migrationId));
    const pending = all.filter((m) => !done.has(m.migrationId)),
      ordered: MigrationDefinition[] = [];
    while (pending.length) {
      const index = pending.findIndex((m) =>
        m.dependsOnMigrationIds.every((id) => done.has(id)),
      );
      if (index < 0)
        throw new Error("Missing migration prerequisite or dependency cycle.");
      const [next] = pending.splice(index, 1);
      ordered.push(next);
      done.add(next.migrationId);
    }
    return ordered;
  }
  async apply(migrationId: string, approval: MigrationApproval): Promise<void> {
    if (this.options.provider.production)
      throw new Error(
        "Production migrations require the deployment orchestrator.",
      );
    await this.options.provider.exclusive(async () => {
      const migration = await this.load(migrationId);
      let backup: BackupReference | undefined;
      await this.check(migration, approval);
      if (
        (await this.options.provider.ledger()).some(
          (e) => e.migrationId === migrationId && e.state === "applied",
        )
      )
        return;
      if (migration.requiresMaintenance)
        await this.options.provider.maintenance(true);
      if (migration.requiresBackup) {
        backup = await this.options.provider.createBackup();
        await this.options.provider.verifyBackup(backup);
      }
      await this.applyLocked(migration, approval, backup);
      if (migration.requiresMaintenance)
        await this.options.provider.maintenance(false);
    });
    await this.options.onApplied?.((await this.load(migrationId)).datasetId);
  }
  async check(migration: MigrationDefinition, approval: MigrationApproval) {
    const provider = this.options.provider;
    if (!approval.actorId || !(await this.options.authorize("apply", approval)))
      throw new Error("Migration application is not authorized.");
    if (migrationErrors(migration).length || migration.provider !== provider.id)
      throw new Error("Migration/provider validation failed.");
    const ledger = await provider.ledger();
    const previous = ledger.find(
      (e) => e.migrationId === migration.migrationId,
    );
    if (previous && previous.migrationChecksum !== migration.checksum)
      throw new Error("Migration checksum conflict.");
    if (ledger.some((e) => e.state !== "applied"))
      throw new Error(
        "Migration recovery is required; blind retry is forbidden.",
      );
    if (previous?.state === "applied") return;
    if (migration.destructive && !approval.destructive)
      throw new Error(
        "Explicit destructive approval is required for this environment.",
      );
    if (
      !migration.dependsOnMigrationIds.every((id) =>
        ledger.some((e) => e.migrationId === id && e.state === "applied"),
      )
    )
      throw new Error("Missing migration prerequisite.");
    if (
      fingerprint(await provider.appliedSchema(migration.datasetId)) !==
      migration.fromSchemaFingerprint
    )
      throw new Error("Applied schema baseline changed.");
    await provider.preflight(migration);
  }
  /** Orchestrator holds the environment lock and maintenance through health/promotion. */
  async applyLocked(
    migration: MigrationDefinition,
    approval: MigrationApproval,
    backup?: BackupReference,
    deploymentId?: string,
  ) {
    await this.check(migration, approval);
    if (
      (await this.options.provider.ledger()).some(
        (e) => e.migrationId === migration.migrationId && e.state === "applied",
      )
    )
      return;
    if (migration.requiresBackup) {
      if (
        !backup ||
        backup.environmentId !== this.options.provider.environmentId
      )
        throw new Error("Verified environment backup is required.");
      await this.options.provider.verifyBackup(backup);
    }
    const entry: MigrationLedgerEntry = {
      migrationId: migration.migrationId,
      datasetId: migration.datasetId,
      migrationChecksum: migration.checksum,
      fromSchemaFingerprint: migration.fromSchemaFingerprint,
      toSchemaFingerprint: migration.toSchemaFingerprint,
      state: "applying",
      environmentId: this.options.provider.environmentId,
      actorId: approval.actorId,
      startedAt: new Date().toISOString(),
      backupId: backup?.id,
      deploymentId,
    };
    await this.options.provider.record(entry);
    try {
      await this.options.provider.execute(migration, {
        ...entry,
        state: "applied",
        completedAt: new Date().toISOString(),
      });
      if (
        fingerprint(
          await this.options.provider.appliedSchema(migration.datasetId),
        ) !== migration.toSchemaFingerprint ||
        !(await this.options.provider.ledger()).some(
          (e) =>
            e.migrationId === migration.migrationId &&
            e.state === "applied" &&
            e.migrationChecksum === migration.checksum,
        )
      )
        throw new Error("Applied state verification failed.");
    } catch {
      await this.options.provider.record({
        ...entry,
        state: "recovery-required",
      });
      await logOperation(this.options.root, {
        operation: "migration.apply",
        status: "recovery-required",
        applicationId: this.options.applicationId,
        environmentId: entry.environmentId,
        migrationId: entry.migrationId,
        deploymentId,
      });
      throw new Error(
        "Migration failed; environment remains gated pending inspection/recovery.",
      );
    }
    await logOperation(this.options.root, {
      operation: "migration.apply",
      status: "applied",
      applicationId: this.options.applicationId,
      environmentId: entry.environmentId,
      migrationId: entry.migrationId,
      deploymentId,
      actorId: approval.actorId,
      backupId: backup?.id,
    });
  }
}
