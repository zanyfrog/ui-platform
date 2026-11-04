import path from "node:path";
import { mkdir } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { withArtifactLock, storageDirectory } from "../storage.js";
import { safeFile } from "../bundle.js";
import { fingerprint, identifier, readJson, writeJson } from "./common.js";
import type {
  DatasetSchema,
  MigrationDefinition,
} from "./migration-definition.js";
import { schemaErrors } from "./migration-definition.js";
import type {
  BackupReference,
  MigrationLedgerEntry,
  MigrationProvider,
} from "./migrations.js";

interface EnvironmentState {
  schemas: Record<string, DatasetSchema>;
  ledger: MigrationLedgerEntry[];
}
interface Backup {
  state: EnvironmentState;
  data: Record<string, Record<string, unknown>[]>;
}
export interface JsonProviderOptions {
  environmentRoot: string;
  environmentId: string;
  production: boolean;
  dataRoot: string;
  /** Exact JsonFileDatasetOrm filenames (appId__namespace__dataset.json), keyed by permanent dataset ID. */
  datasetFiles: Record<string, string>;
  /** Stop all ORM writers and verify quiescence; on false restart them with refreshed definitions/caches. */
  setMaintenance: (enabled: boolean) => Promise<void>;
  customHandlers?: Record<
    string,
    (
      rows: Record<string, unknown>[],
      migration: MigrationDefinition,
    ) => Promise<Record<string, unknown>[]>
  >;
}
/** Offline adapter for the existing JSON-file ORM. Never claims multi-file transactional DDL. */
export class JsonFileMigrationProvider implements MigrationProvider {
  readonly id = "json-file-orm-offline-v1";
  readonly environmentId: string;
  readonly production: boolean;
  private quiesced = false;
  constructor(readonly options: JsonProviderOptions) {
    this.environmentId = identifier(options.environmentId);
    this.production = options.production;
  }
  async exclusive<T>(action: () => Promise<T>): Promise<T> {
    return withArtifactLock(
      this.options.environmentRoot,
      `environment:${this.environmentId}`,
      action,
    );
  }
  private async statePath() {
    return path.join(
      await storageDirectory(
        this.options.environmentRoot,
        "environments",
        this.environmentId,
      ),
      "migration-state.json",
    );
  }
  private async state(): Promise<EnvironmentState> {
    return readJson(await this.statePath());
  }
  /** Explicit onboarding only: baseline must be verified against the currently registered ORM schema. */
  async initialize(schemas: DatasetSchema[]): Promise<void> {
    await this.exclusive(async () => {
      for (const schema of schemas) {
        if (
          schemaErrors(schema).length ||
          !this.options.datasetFiles[schema.dataset.id]
        )
          throw new Error(
            "Invalid baseline or missing exact dataset filename.",
          );
        await this.rows(schema.dataset.id);
      }
      const file = await this.statePath();
      const { open } = await import("node:fs/promises");
      const handle = await open(file, "wx");
      try {
        await handle.writeFile(
          JSON.stringify({
            schemas: Object.fromEntries(schemas.map((s) => [s.dataset.id, s])),
            ledger: [],
          }),
        );
        await handle.sync();
      } finally {
        await handle.close();
      }
    });
  }
  private async datasetPath(id: string) {
    const name = this.options.datasetFiles[id];
    if (!name) throw new Error("Dataset has no configured ORM file mapping.");
    return safeFile(this.options.dataRoot, name);
  }
  private async rows(id: string): Promise<Record<string, unknown>[]> {
    const rows = await readJson<Record<string, unknown>[]>(
      await this.datasetPath(id),
    );
    if (
      !Array.isArray(rows) ||
      rows.some((r) => !r || typeof r !== "object" || Array.isArray(r))
    )
      throw new Error("Invalid ORM dataset contents.");
    return rows;
  }
  async appliedSchema(id: string): Promise<DatasetSchema> {
    const schema = (await this.state()).schemas[id];
    if (!schema)
      throw new Error(
        "Applied schema is not onboarded; verify the ORM baseline first.",
      );
    return schema;
  }
  async ledger() {
    return (await this.state()).ledger;
  }
  async record(entry: MigrationLedgerEntry) {
    const state = await this.state();
    const previous = state.ledger.find(
      (e) => e.migrationId === entry.migrationId,
    );
    if (previous && previous.migrationChecksum !== entry.migrationChecksum)
      throw new Error("Ledger checksum conflict.");
    state.ledger = [
      ...state.ledger.filter((e) => e.migrationId !== entry.migrationId),
      entry,
    ];
    await writeJson(await this.statePath(), state);
  }
  async maintenance(enabled: boolean) {
    await this.options.setMaintenance(enabled);
    this.quiesced = enabled;
  }
  async preflight(migration: MigrationDefinition) {
    await this.datasetPath(migration.datasetId);
    if (
      migration.targetSchema.fields.some(
        (f) =>
          !["string", "number", "boolean", "date", "json"].includes(f.type),
      )
    )
      throw new Error(
        "Target field type is not supported by the JSON ORM adapter.",
      );
    for (const op of migration.operations)
      if (
        op.operation === "custom" &&
        !this.options.customHandlers?.[op.handlerId]
      )
        throw new Error("Reviewed custom handler is not installed.");
    if (
      migration.operations.length &&
      (!migration.requiresBackup || !migration.requiresMaintenance)
    )
      throw new Error(
        "JSON ORM changes require verified backup and offline maintenance.",
      );
    if (!migration.operations.some((op) => op.operation === "custom")) {
      const schema = structuredClone(
        await this.appliedSchema(migration.datasetId),
      );
      for (const op of migration.operations) {
        if (op.operation === "addField") {
          if (
            schema.fields.some(
              (f) => f.id === op.field.id || f.key === op.field.key,
            )
          )
            throw new Error("Added field conflicts with applied schema.");
          schema.fields.push(op.field);
        }
        if (op.operation === "dropField") {
          const field = schema.fields.find(
            (f) => f.id === op.fieldId && f.key === op.key,
          );
          if (!field)
            throw new Error("Dropped field does not match applied identity.");
          schema.fields = schema.fields.filter((f) => f.id !== op.fieldId);
        }
        if (op.operation === "renameField") {
          const field = schema.fields.find(
            (f) => f.id === op.fieldId && f.key === op.from,
          );
          if (!field || schema.fields.some((f) => f.key === op.to))
            throw new Error("Renamed field conflicts with applied identity.");
          field.key = op.to;
        }
      }
      const normalize = (value: DatasetSchema) => ({
        ...value,
        fields: [...value.fields].sort((a, b) => a.id.localeCompare(b.id)),
      });
      if (
        fingerprint(normalize(schema)) !==
        fingerprint(normalize(migration.targetSchema))
      )
        throw new Error(
          "Migration operations do not produce the declared target schema.",
        );
    }
  }
  async execute(migration: MigrationDefinition, applied: MigrationLedgerEntry) {
    if (!this.quiesced && migration.operations.length)
      throw new Error("JSON ORM writers must be quiesced.");
    let rows = await this.rows(migration.datasetId);
    for (const op of migration.operations) {
      if (op.operation === "custom")
        rows = await this.options.customHandlers![op.handlerId](
          structuredClone(rows),
          migration,
        );
      else
        rows = rows.map((row) => {
          const next = Object.assign(
            Object.create(null) as Record<string, unknown>,
            row,
          );
          if (op.operation === "dropField") delete next[op.key];
          if (op.operation === "renameField" && Object.hasOwn(next, op.from)) {
            if (Object.hasOwn(next, op.to))
              throw new Error("Rename would overwrite existing data.");
            next[op.to] = next[op.from];
            delete next[op.from];
          }
          if (
            op.operation === "addField" &&
            op.field.default !== undefined &&
            !Object.hasOwn(next, op.field.key)
          )
            next[op.field.key] = structuredClone(op.field.default);
          return next;
        });
    }
    const ids = new Set<unknown>();
    for (const row of rows) {
      if (ids.has(row.id))
        throw new Error("Duplicate primary key after migration.");
      ids.add(row.id);
      for (const field of migration.targetSchema.fields) {
        const value = row[field.key];
        if (field.required && (value === undefined || value === null))
          throw new Error("Required field backfill failed.");
        if (
          value != null &&
          ["string", "number", "boolean"].includes(field.type) &&
          typeof value !== field.type
        )
          throw new Error("Field type validation failed.");
        if (
          value != null &&
          field.type === "date" &&
          (typeof value !== "string" || !Number.isFinite(Date.parse(value)))
        )
          throw new Error("Date field validation failed.");
      }
    }
    // Applying was persisted first. An interruption between these writes requires inspection/restore.
    await writeJson(await this.datasetPath(migration.datasetId), rows);
    const state = await this.state();
    state.schemas[migration.datasetId] = migration.targetSchema;
    state.ledger = [
      ...state.ledger.filter((e) => e.migrationId !== migration.migrationId),
      applied,
    ];
    await writeJson(await this.statePath(), state);
  }
  private async backupFile(id: string) {
    return path.join(
      await storageDirectory(
        this.options.environmentRoot,
        "environments",
        this.environmentId,
        "backups",
      ),
      `${identifier(id)}.json`,
    );
  }
  async createBackup(): Promise<BackupReference> {
    if (!this.quiesced)
      throw new Error("Backup requires quiesced ORM writers.");
    const state = await this.state(),
      data: Backup["data"] = {};
    for (const id of Object.keys(state.schemas)) data[id] = await this.rows(id);
    const backup = { state, data },
      id = randomUUID();
    await writeJson(await this.backupFile(id), backup);
    return {
      id,
      environmentId: this.environmentId,
      checksum: fingerprint(backup),
    };
  }
  async verifyBackup(reference: BackupReference) {
    if (
      reference.environmentId !== this.environmentId ||
      fingerprint(await readJson(await this.backupFile(reference.id))) !==
        reference.checksum
    )
      throw new Error("Backup verification failed.");
  }
  async restoreBackup(reference: BackupReference) {
    if (!this.quiesced)
      throw new Error(
        "Restore requires verified write quiescence and operator authorization.",
      );
    await this.verifyBackup(reference);
    const backup = await readJson<Backup>(await this.backupFile(reference.id));
    for (const [id, rows] of Object.entries(backup.data))
      await writeJson(await this.datasetPath(id), rows);
    await writeJson(await this.statePath(), backup.state);
  }
}
