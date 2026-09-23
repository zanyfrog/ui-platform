export type ArtifactId = string;
export type ArtifactType = string;
export interface ArtifactManifest {
  schemaVersion: number;
  artifactId: ArtifactId;
  artifactType: ArtifactType;
  name: string;
  label?: string;
  description?: string;
  definitionVersion: number;
  files: Record<string, string>;
  config?: Record<string, unknown>;
}
export type DiagnosticSeverity = "error" | "warning" | "info";
export interface ValidationDiagnostic {
  severity: DiagnosticSeverity;
  code: string;
  message: string;
  artifactId?: string;
  file?: string;
  line?: number;
  column?: number;
  field?: string;
  path?: string;
}
export interface ArtifactValidationResult {
  valid: boolean;
  diagnostics: ValidationDiagnostic[];
}
export interface ArtifactFile {
  role: string;
  path: string;
  absolutePath: string;
  language?: string;
  content: string;
}
export interface ArtifactCapabilities {
  edit: boolean;
  format: boolean;
}
export interface ArtifactFileRoleDefinition {
  required?: boolean;
  extensions?: string[];
}
export interface ArtifactReference {
  artifactId: string;
  expectedType?: string;
  field: string;
}
export interface ArtifactReferenceSummary {
  outgoing: ArtifactReference[];
}
export interface ArtifactValidationContext {
  manifest: ArtifactManifest;
  bundlePath: string;
  files: ArtifactFile[];
  validators: ValidatorRegistryContract;
  resolveReference?: (
    id: string,
  ) => Promise<{ artifactType: string } | undefined>;
  routes?: { bundlePath: string; manifest: ArtifactManifest }[];
}
export type ArtifactValidator = (
  context: ArtifactValidationContext,
) => ValidationDiagnostic[] | Promise<ValidationDiagnostic[]>;
export type ArtifactFormatter = (
  file: ArtifactFile,
) => string | Promise<string>;
export type ArtifactReferenceExtractor = (
  context: ArtifactValidationContext,
) => ArtifactReference[];
export interface ArtifactDefinition {
  artifactType: string;
  currentDefinitionVersion: number;
  fileRoles: Record<string, ArtifactFileRoleDefinition>;
  capabilities: ArtifactCapabilities;
  validators: ArtifactValidator[];
  formatter?: ArtifactFormatter;
  extractReferences?: ArtifactReferenceExtractor;
}
export interface EditableArtifact {
  /** Null for malformed manifests; never invent an identity. */
  manifest: ArtifactManifest | null;
  manifestContent: string;
  bundlePath: string;
  files: ArtifactFile[];
  definition: ArtifactDefinition | null;
  capabilities: ArtifactCapabilities;
  validation: ArtifactValidationResult;
  references: ArtifactReferenceSummary;
  checksum: string;
}
export interface ArtifactSummary {
  artifactId?: string;
  artifactType?: string;
  name?: string;
  bundlePath: string;
  validation: ArtifactValidationResult;
}
export interface ArtifactChanges {
  manifest?: ArtifactManifest | string;
  /** Bundle-relative paths. Null deletes a declared file. */
  files?: Record<string, string | null>;
  expectedChecksum?: string;
}
export interface ArtifactSaveResult {
  saved: boolean;
  artifact: EditableArtifact;
  validation: ArtifactValidationResult;
}
export interface ValidatorConfiguration {
  validator: string;
  message?: string;
  [key: string]: unknown;
}
export interface ValueValidator {
  name: string;
  validateConfiguration(config: ValidatorConfiguration): string | undefined;
  validate(value: unknown, config: ValidatorConfiguration): string | undefined;
}
export interface ValidatorRegistryContract {
  get(name: string): ValueValidator | undefined;
}
export interface ArtifactLogEvent {
  timestamp: string;
  operation: string;
  artifactId?: string;
  artifactType?: string;
  bundlePath?: string;
  validation?: "PASSED" | "FAILED";
  diagnosticCounts?: Record<DiagnosticSeverity, number>;
  message?: string;
}
export interface ArtifactService {
  discover(root: string): Promise<ArtifactSummary[]>;
  load(artifactIdOrPath: string): Promise<EditableArtifact>;
  validate(artifactIdOrPath: string): Promise<ArtifactValidationResult>;
  save(
    artifactIdOrPath: string,
    changes: ArtifactChanges,
  ): Promise<ArtifactSaveResult>;
  getReferences(artifactIdOrPath: string): Promise<ArtifactReferenceSummary>;
  startWatching(options?: ArtifactWatchOptions): Promise<ArtifactWatcher>;
  handleExternalChange(filePath: string): Promise<EditableArtifact | undefined>;
}

export interface ArtifactWatchEvent {
  kind: "changed" | "removed";
  bundlePath: string;
  artifact?: EditableArtifact;
}
export interface ArtifactWatchOptions {
  debounceMs?: number;
  /** Reconciliation catches missed native events. Defaults to 1000 ms. */
  pollIntervalMs?: number;
  onChange?: (event: ArtifactWatchEvent) => void | Promise<void>;
  onError?: (error: Error) => void;
}
export interface ArtifactWatcher {
  /** Stops timers/native events and waits for in-flight validation. */
  close(): Promise<void>;
}
