import type { ArtifactValidationResult } from "../types.js";

/** Operational callers can fail without discarding or translating shared diagnostics. */
export class ArtifactValidationError extends Error {
  constructor(
    message: string,
    readonly validation: ArtifactValidationResult,
  ) {
    super(message);
    this.name = "ArtifactValidationError";
  }
}
