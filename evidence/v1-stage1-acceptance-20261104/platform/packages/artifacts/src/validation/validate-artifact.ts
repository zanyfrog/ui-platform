import { validateReferences } from "./validate-references.js";
import path from "node:path";
import * as prettier from "prettier";
import { checksum, error, parseManifest, type Snapshot } from "../bundle.js";
import { ArtifactDefinitionRegistry, capabilities } from "../definitions.js";
import { ValidatorRegistry } from "./validator-registry.js";
import type {
  ArtifactValidationContext,
  ArtifactValidationResult,
  EditableArtifact,
  ValidationDiagnostic,
} from "../types.js";

export function validationResult(
  diagnostics: ValidationDiagnostic[],
): ArtifactValidationResult {
  return {
    valid: !diagnostics.some((diagnostic) => diagnostic.severity === "error"),
    diagnostics,
  };
}
export async function validateSnapshot(
  bundlePath: string,
  snapshot: Snapshot,
  definitions: ArtifactDefinitionRegistry,
  validators: ValidatorRegistry,
  options: Pick<ArtifactValidationContext, "resolveReference" | "routes"> = {},
): Promise<EditableArtifact> {
  const { manifest, diagnostics } = parseManifest(snapshot["artifact.json"]);
  const definition = manifest
    ? (definitions.get(manifest.artifactType) ?? null)
    : null;
  const files = manifest
    ? Object.entries(manifest.files).flatMap(([role, name]) =>
        snapshot[name] == null
          ? []
          : [
              {
                role,
                path: name,
                absolutePath: path.join(bundlePath, name),
                content: snapshot[name]!,
                language: path.extname(name).slice(1),
              },
            ],
      )
    : [];
  let outgoing: EditableArtifact["references"]["outgoing"] = [];
  if (manifest) {
    if (!definition)
      diagnostics.push(
        error(
          "artifact.unknown-type",
          `Unknown artifact type: ${manifest.artifactType}`,
          "artifact.json",
        ),
      );
    for (const name of Object.values(manifest.files))
      if (snapshot[name] == null)
        diagnostics.push(
          error("file.missing", `Referenced file is missing: ${name}`, name),
        );
    for (const file of files) {
      if (
        ![".json", ".ts", ".tsx", ".css"].includes(
          path.extname(file.path).toLowerCase(),
        )
      )
        continue;
      try {
        await prettier.format(file.content, { filepath: file.absolutePath });
      } catch (e) {
        diagnostics.push(
          error(
            "source.syntax",
            e instanceof Error ? e.message : String(e),
            file.path,
          ),
        );
      }
    }
    if (definition) {
      if (manifest.definitionVersion !== definition.currentDefinitionVersion)
        diagnostics.push(
          error(
            "definition.version",
            `Unsupported definitionVersion: ${manifest.definitionVersion}`,
            "artifact.json",
          ),
        );
      for (const [role, rule] of Object.entries(definition.fileRoles)) {
        const name = manifest.files[role];
        if (rule.required && !name)
          diagnostics.push(
            error(
              "file.role-required",
              `Required file role: ${role}`,
              "artifact.json",
            ),
          );
        if (
          name &&
          rule.extensions &&
          !rule.extensions.includes(path.extname(name).toLowerCase())
        )
          diagnostics.push(
            error(
              "file.extension",
              `Unsupported extension for role ${role}.`,
              name,
            ),
          );
      }
      const context: ArtifactValidationContext = {
        manifest,
        bundlePath,
        files,
        validators,
        ...options,
      };
      for (const validator of definition.validators) {
        try {
          diagnostics.push(...(await validator(context)));
        } catch (e) {
          diagnostics.push(
            error("validator.failure", `Validator failed: ${String(e)}`),
          );
        }
      }
      try {
        outgoing = definition.extractReferences?.(context) ?? [];
      } catch (e) {
        diagnostics.push(error("reference.extraction", String(e)));
      }
      if (options.resolveReference)
        diagnostics.push(
          ...(await validateReferences(
            outgoing,
            options.resolveReference,
            manifest.artifactId,
          )),
        );
    }
  }
  for (const diagnostic of diagnostics)
    diagnostic.artifactId ??= manifest?.artifactId;
  return {
    manifest,
    manifestContent: snapshot["artifact.json"] ?? "",
    bundlePath,
    files,
    definition,
    capabilities: definition?.capabilities ?? {
      ...capabilities,
    },
    validation: validationResult(diagnostics),
    references: { outgoing },
    checksum: checksum(snapshot),
  };
}
