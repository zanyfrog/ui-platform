# Generic Artifact Editor readiness — 2026-09-25

## Assessment

Artifact Foundation is ready for a **server-backed editor consumer** using the existing contracts below. This is verified against built package imports and emitted TypeScript declarations, not only source-module imports. No Generic Artifact Editor has been implemented in this review.

The root `@ui-platform/artifacts` entry is Node-only: it imports filesystem services, formatting, TypeScript, and CLI/application services. Browser code must use type-only imports for contracts and `@ui-platform/artifacts/validation` for value validation. A transport adapter is still required between browser state and the server service; `EditableArtifact.definition` contains functions and is not itself a JSON wire contract. Do not create a second validator in that adapter.

The package is currently version **0.1.0**. “Ready” means the consumption contracts are tested and documented; it is not a claim of a frozen 1.0 API or cross-process ACID guarantees. Pin the package version and keep the contract tests in the editor's integration checks.

## Schema adapter decision

Retain the adapter for now. The authoritative `DatasetSchema` interface is exported by the sibling `@ui-platform/schema-manager` root. There is no contracts-only subpath. Adding that package as a dependency would also bring `@ui-platform/orm` and `@ui-platform/versioned-definition-registry` into this independent artifact package's dependency graph. A type-only import would erase runtime execution, but its declarations still reference those packages and require the sibling package to be built/resolved. A relative source import would couple this package to an external checkout layout. Neither is necessary for editor operation.

The upstream schema validator is private to its versioned-definition adapter. The compatibility test reads the actual upstream TypeScript source, extracts the interface, checks structural equality through the TypeScript compiler, and evaluates only its pure adapter expression. It does not import the publication/ORM runtime or maintain a copied reference validator. Changes or missing upstream sources fail the check, not silently skip it. The default checkout location is `../UI Platform Data Services`; CI can set `UI_DATA_SERVICES_ROOT` to that checkout.

Verified differences:

- Local validation rejects missing/non-string field types and malformed Boolean flags more strictly than the upstream validator.
- Upstream validation compares `dataset.key` with an external registry reference. The source artifact adapter instead checks permanent dataset identity against `artifactId`.
- This adapter uses ordinary editable source; it does not reproduce the upstream draft/publish/version-history lifecycle.

A future upstream contracts-only export plus an exported pure schema validator would permit a direct import without the current lifecycle dependency. The local adapter and these deviations remain explicit until then.

## Windows replacement failure and transaction verification

The captured intermittent failure was `EPERM` replacing `presentation/active.css` in `src/server/json-files.ts`. That helper used a single rename attempt. The observation did not identify the locking process; antivirus, indexers, watchers, and other readers cannot be distinguished from the recorded exception alone.

A new test reproduces the same class of failure with a real Windows `FileStream` opened without delete sharing. The writer retains the existing destination while the handle is held and completes replacement after the handle closes. Deterministic filesystem fault tests cover permanent failures as well.

The presentation helper, ArtifactService transactional file writes, and application state JSON writes now reuse `@ui-platform/artifacts/storage`'s atomic writer. It creates a same-directory temporary file exclusively, writes and flushes it, closes the handle, and replaces the destination. On Windows only, `EPERM`, `EACCES`, and `EBUSY` receive five retries after 25, 50, 100, 200, and 400 ms (six attempts, 775 ms total scheduled delay). It never deletes the destination to force replacement. Other errors fail immediately; permanent errors still surface. Temporary-file cleanup is attempted on success and failure.

Verified save/recovery behavior:

- transient sharing violations complete without exposing a deleted destination;
- an exhausted replacement retry budget leaves the prior destination intact;
- a partial multi-file ArtifactService save restores existing files and removes newly added files;
- if rollback also fails, the original snapshot journal remains and the save fails explicitly;
- a fresh ArtifactService recovers that journal before returning an artifact;
- existing stale-checksum, invalid-source-save, interrupted-journal, and identity tests remain in place.

This is a logical all-or-rollback transaction for cooperating service consumers on one host. Files are replaced individually, manifest last. External writers do not honor the service lock and external readers may observe intermediate files. Persistent OS/storage failure can require operator recovery; bounded retries do not suppress it. File flushing does not promise universal power-loss durability of directory metadata on every filesystem. Watcher directory-move locking is a separate OS behavior, not fixed by retrying file replacement.

## Consumption contract

| Export | Entry point | Editor use |
| --- | --- | --- |
| `FileSystemArtifactService`, `ArtifactServiceOptions` | root | Create one server service per application; supply shared definitions, validators, and reference resolver. |
| `ArtifactService`, `EditableArtifact`, `ArtifactChanges`, `ArtifactSaveResult` | root, types | Load source, keep a working copy, save with `expectedChecksum`, consume returned diagnostics. |
| `ArtifactDefinitionRegistry`, `ArtifactDefinition` | root | Reuse registered types/capabilities; do not infer identity/type from folder names. |
| `ArtifactValidationResult`, `ValidationDiagnostic` | root types; also `./validation` types | Preserve codes, severity, message, file, line, column, field, path, and optional identity. |
| `ValidatorRegistry`, `validateValue`, `requiredValidator`, `maxLengthValidator` | root and `./validation` | Same implementations in server and browser; browser runtime has no imports. |
| `validationResult`, `validateReferences` | root | Shared server aggregation/reference checks; not a browser filesystem validator. |
| `ArtifactConflictError` | root | Reload/reconcile instead of overwriting a stale working copy. |
| `ArtifactValidationError` | root | Operational rejection retaining the original validation result; invalid source Save itself still succeeds. |
| `ArtifactWatchEvent`, `ArtifactWatchOptions`, `ArtifactWatcher` | root, types | Refresh after external change/removal and close subscriptions during shutdown. |
| `atomicWriteText`, `retryWindowsFileOperation` | `./storage`, Node-only | Shared persistence infrastructure; editors should use ArtifactService.save instead of writing bundles directly. |

Important semantics: malformed manifests have `manifest: null`; unknown/malformed types have `definition: null`; raw `manifestContent` remains available for repair. References expose outgoing links, not a built-in used-by index. Warnings do not invalidate an artifact. Reference existence/type validation needs the supplied resolver. Save allows invalid source, formats supported files, and returns updated validation. The service's checksum is an opaque concurrency token, not an artifact source revision. Watcher saves made by the same service are not re-emitted as external edits. There is no artifact publish/history API.

## Verification entry points

Verification on Windows/Node 24: the full suite passed **99 tests across 21 files**;
repository type checks, production build, and generated-interface documentation
checks passed. Presentation lifecycle and Windows storage tests also passed three
consecutive focused runs (nine tests per run). The build retains its existing
client bundle-size warning.

- `consumer-contract.test.ts`: real-service diagnostics/type recognition and CLI/consumer parity.
- `editor-package-contract.test.ts`: builds the package, loads public runtime exports in a separate Node process, type-checks an editor consumer through package exports, and verifies the browser validation runtime has no imports.
- `schema-adapter-compatibility.test.ts`: current upstream type/validation compatibility and explicit deviations.
- `windows-storage.test.ts`: real Windows lock reproduction and deterministic replacement/rollback/recovery failures.
- Existing `artifacts.test.ts` and watcher tests: save, format, identity, stale writes, external changes, and journal recovery.

## Actual TypeScript declarations

The following declarations are copied from the emitted package declarations by `scripts/document-artifact-contracts.mjs`. Run that script after building the artifact package; use `--check` to detect documentation drift. They are the actual interface surface, not a proposed editor-specific replacement.

<!-- artifact-contracts:start -->

```ts
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
    resolveReference?: (id: string) => Promise<{
        artifactType: string;
    } | undefined>;
    routes?: {
        bundlePath: string;
        manifest: ArtifactManifest;
    }[];
}
export type ArtifactValidator = (context: ArtifactValidationContext) => ValidationDiagnostic[] | Promise<ValidationDiagnostic[]>;
export type ArtifactFormatter = (file: ArtifactFile) => string | Promise<string>;
export type ArtifactReferenceExtractor = (context: ArtifactValidationContext) => ArtifactReference[];
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
    save(artifactIdOrPath: string, changes: ArtifactChanges): Promise<ArtifactSaveResult>;
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

export interface ArtifactServiceOptions {
    /** Artifact workspace root; .uib lives here. */
    root: string;
    definitions?: ArtifactDefinitionRegistry;
    validators?: ValidatorRegistry;
    resolveReference?: ArtifactValidationContext["resolveReference"];
    logger?: (event: ArtifactLogEvent) => void;
    /** Fault injection hook for testing storage failures. */
    beforeCommitFile?: (file: string, index: number) => void | Promise<void>;
}

export declare class ArtifactDefinitionRegistry {
    private readonly entries;
    constructor(builtins?: boolean);
    register(definition: ArtifactDefinition): void;
    get(artifactType: string): ArtifactDefinition | undefined;
    has(artifactType: string): boolean;
    list(): ArtifactDefinition[];
}

export declare class ValidatorRegistry {
    private readonly entries;
    constructor();
    register(validator: ValueValidator): void;
    get(name: string): ValueValidator | undefined;
    list(): ValueValidator[];
}

export declare function validateValue(value: unknown, configurations: ValidatorConfiguration[], registry?: ValidatorRegistry, field?: string): ValidationDiagnostic[];

export declare class ArtifactValidationError extends Error {
    readonly validation: ArtifactValidationResult;
    constructor(message: string, validation: ArtifactValidationResult);
}
```

<!-- artifact-contracts:end -->
