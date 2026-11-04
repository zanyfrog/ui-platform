import type { ArtifactDefinition, ValidationDiagnostic } from "../types.js";
import { isObject } from "../bundle.js";
import { fingerprint } from "./common.js";

/** Shape matches @ui-platform/schema-manager DatasetSchema; no source revision lifecycle. */
export interface DatasetSchema {
  definitionType: "dataset-schema";
  definitionFormatVersion: 1;
  dataset: { id: string; key: string; name: string; pluralName: string };
  fields: {
    id: string;
    key: string;
    type: string;
    required?: boolean;
    default?: unknown;
  }[];
}
export type MigrationOperation =
  | { operation: "addField"; field: DatasetSchema["fields"][number] }
  | { operation: "dropField"; fieldId: string; key: string }
  | { operation: "renameField"; fieldId: string; from: string; to: string }
  | { operation: "custom"; description: string; handlerId: string };
export interface MigrationDefinition {
  migrationId: string;
  datasetId: string;
  fromSchemaFingerprint: string;
  toSchemaFingerprint: string;
  targetSchema: DatasetSchema;
  dependsOnMigrationIds: string[];
  operations: MigrationOperation[];
  provider: string;
  destructive: boolean;
  requiresBackup: boolean;
  requiresMaintenance: boolean;
  approval: { actorId: string; confirmedAt: string; destructive: boolean };
  checksum: string;
}
export function schemaErrors(value: unknown): string[] {
  if (
    !isObject(value) ||
    value.definitionType !== "dataset-schema" ||
    value.definitionFormatVersion !== 1 ||
    !isObject(value.dataset) ||
    !Array.isArray(value.fields)
  )
    return ["Invalid DatasetSchema shape."];
  const errors: string[] = [];
  for (const key of ["id", "key", "name", "pluralName"])
    if (typeof value.dataset[key] !== "string" || !value.dataset[key])
      errors.push(`Dataset ${key} is required.`);
  const ids = new Set<string>(),
    keys = new Set<string>();
  for (const field of value.fields) {
    if (
      !isObject(field) ||
      typeof field.id !== "string" ||
      !field.id ||
      typeof field.key !== "string" ||
      !field.key ||
      typeof field.type !== "string" ||
      !field.type ||
      (field.required !== undefined && typeof field.required !== "boolean")
    ) {
      errors.push(
        "Fields require permanent IDs, keys, types, and Boolean required flags.",
      );
      continue;
    }
    if (ids.has(field.id) || keys.has(field.key))
      errors.push("Field IDs and keys must be unique.");
    ids.add(field.id);
    keys.add(field.key);
  }
  if (
    !value.fields.some(
      (f) => isObject(f) && f.key === "id" && f.required === true,
    )
  )
    errors.push("Required id field is required.");
  return errors;
}
export const migrationChecksum = (
  definition: Omit<MigrationDefinition, "checksum"> | MigrationDefinition,
) => {
  const { checksum: _, ...body } = definition as MigrationDefinition;
  return fingerprint(body);
};
export function migrationErrors(value: unknown): string[] {
  if (!isObject(value)) return ["Migration must be an object."];
  const errors = schemaErrors(value.targetSchema);
  for (const field of ["migrationId", "datasetId", "provider"])
    if (typeof value[field] !== "string" || !value[field])
      errors.push(`${field} is required.`);
  for (const field of [
    "fromSchemaFingerprint",
    "toSchemaFingerprint",
    "checksum",
  ])
    if (
      typeof value[field] !== "string" ||
      !/^sha256:[a-f0-9]{64}$/.test(value[field] as string)
    )
      errors.push(`${field} must be a SHA-256 fingerprint.`);
  if (
    !Array.isArray(value.dependsOnMigrationIds) ||
    !value.dependsOnMigrationIds.every(
      (id) => typeof id === "string" && id !== value.migrationId,
    )
  )
    errors.push("Invalid migration dependencies.");
  for (const field of ["destructive", "requiresBackup", "requiresMaintenance"])
    if (typeof value[field] !== "boolean")
      errors.push(`${field} must be Boolean.`);
  if (
    !isObject(value.approval) ||
    typeof value.approval.actorId !== "string" ||
    !value.approval.actorId ||
    typeof value.approval.confirmedAt !== "string" ||
    typeof value.approval.destructive !== "boolean"
  )
    errors.push("Recorded approval is required.");
  if (!Array.isArray(value.operations)) errors.push("Operations are required.");
  else
    for (const operation of value.operations) {
      if (!isObject(operation)) {
        errors.push("Invalid operation.");
        continue;
      }
      const fields =
        operation.operation === "dropField"
          ? ["fieldId", "key"]
          : operation.operation === "renameField"
            ? ["fieldId", "from", "to"]
            : operation.operation === "custom"
              ? ["description", "handlerId"]
              : operation.operation === "addField"
                ? []
                : undefined;
      if (
        !fields ||
        fields.some((f) => typeof operation[f] !== "string" || !operation[f])
      )
        errors.push("Invalid operation fields.");
      if (
        operation.operation === "addField" &&
        (!isObject(operation.field) ||
          !["id", "key", "type"].every(
            (f) =>
              typeof (operation.field as Record<string, unknown>)[f] ===
              "string",
          ))
      )
        errors.push("Invalid added field.");
      if (
        ["dropField", "custom"].includes(String(operation.operation)) &&
        value.destructive !== true
      )
        errors.push("Destructive classification cannot be omitted.");
    }
  if (
    value.destructive &&
    (!value.requiresBackup ||
      !value.requiresMaintenance ||
      !isObject(value.approval) ||
      !value.approval.destructive)
  )
    errors.push(
      "Destructive migrations require explicit approval, backup, and maintenance.",
    );
  if (!errors.length) {
    const migration = value as unknown as MigrationDefinition;
    if (
      migration.targetSchema.dataset.id !== migration.datasetId ||
      fingerprint(migration.targetSchema) !== migration.toSchemaFingerprint ||
      migrationChecksum(migration) !== migration.checksum
    )
      errors.push("Migration identity, target schema, or checksum mismatch.");
  }
  return errors;
}
function definition(
  artifactType: string,
  check: (value: unknown) => string[],
): ArtifactDefinition {
  return {
    artifactType,
    currentDefinitionVersion: 1,
    capabilities: { edit: true, format: true },
    fileRoles: { definition: { required: true, extensions: [".json"] } },
    validators: [
      ({ files, manifest }) => {
        const diagnostics: ValidationDiagnostic[] = [];
        try {
          const value = JSON.parse(
            files.find((f) => f.role === "definition")?.content ?? "null",
          );
          for (const message of check(value))
            diagnostics.push({
              severity: "error",
              code: `${artifactType}.definition`,
              message,
            });
          if (
            artifactType === "migration" &&
            value?.migrationId !== manifest.artifactId
          )
            diagnostics.push({
              severity: "error",
              code: "migration.identity",
              message: "Migration ID must equal artifact ID.",
            });
          if (
            artifactType === "dataset" &&
            value?.dataset?.id !== manifest.artifactId
          )
            diagnostics.push({
              severity: "error",
              code: "dataset.identity",
              message: "Dataset ID must equal artifact ID.",
            });
        } catch {
          diagnostics.push({
            severity: "error",
            code: `${artifactType}.syntax`,
            message: "Definition is not valid JSON.",
          });
        }
        return diagnostics;
      },
    ],
  };
}
export const migrationDefinition = definition("migration", migrationErrors);
export const datasetDefinition = definition("dataset", schemaErrors);
