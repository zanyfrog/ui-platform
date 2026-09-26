import { error } from "../bundle.js";
import type {
  ArtifactReference,
  ArtifactValidationContext,
  ValidationDiagnostic,
} from "../types.js";

/** One reference-validation implementation for artifact and application contexts. */
export async function validateReferences(
  references: ArtifactReference[],
  resolveReference: NonNullable<ArtifactValidationContext["resolveReference"]>,
  artifactId?: string,
): Promise<ValidationDiagnostic[]> {
  const diagnostics: ValidationDiagnostic[] = [];
  for (const reference of references) {
    try {
      const target = await resolveReference(reference.artifactId);
      if (!target)
        diagnostics.push({
          ...error(
            "reference.missing",
            `Reference not found: ${reference.artifactId}`,
            "artifact.json",
          ),
          field: reference.field,
        });
      else if (
        reference.expectedType &&
        target.artifactType !== reference.expectedType
      )
        diagnostics.push({
          ...error(
            "reference.type",
            `Reference ${reference.artifactId} must be ${reference.expectedType}.`,
            "artifact.json",
          ),
          field: reference.field,
        });
    } catch (e) {
      diagnostics.push(error("reference.failure", String(e), "artifact.json"));
    }
  }
  for (const diagnostic of diagnostics) diagnostic.artifactId = artifactId;
  return diagnostics;
}
