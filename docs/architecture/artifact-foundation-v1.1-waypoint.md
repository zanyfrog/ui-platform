# UI Platform — Artifact Foundation v1.1 Waypoint Architecture

**Status:** Authoritative implementation waypoint  
**Audience:** Codex / UI Platform developers  
**Supersedes:** Earlier Artifact Foundation v1 guidance that described per-artifact publish, internal Draft revision numbering, and UI Platform-managed source version history.

## 1. Purpose

This document captures the current implementation direction for UI Platform Artifact Foundation.

The core simplification is:

> Individual artifacts are editable source files. They are saved, formatted, validated, and logged. Artifact source history is handled by Git/GitHub. Publish/Deploy is an Application/Site-level concern, not an artifact-level lifecycle.

## 2. Core principles

- Artifacts are ordinary human-readable source files in the application folder structure.
- Invalid artifacts may be saved.
- Explicit Save formats the artifact, writes it transactionally, validates it, and logs the result.
- Validation errors do not block continued development.
- UI, CLI, Registry, Import/Export, Application Build, and future editors call the same validation infrastructure.
- Git/GitHub handles source history, diff, branches, rollback, merge conflicts, and collaboration.
- UI Platform does not maintain Draft revision numbers or artifact-level published versions.
- Publish/Deploy applies to the Application/Site.
- Artifact-specific runtime state such as `active`, `inactive`, `enabled`, or `disabled` may still exist where it has semantic meaning. This is not Publish.

## 3. Artifact Bundle contract

For Artifact Foundation v1:

> Every editable artifact is represented by a directory containing `artifact.json`.

Example:

```text
forms/
└── tour-registration/
    ├── artifact.json
    └── form.json
```

Do not infer artifact identity from folder names alone.

## 4. Artifact manifest

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
```

Do not store derived values such as validation state, checksums, timestamps, dependencies, used-by references, editor tabs, or deployment state in `artifact.json`.

`artifactId` is immutable. Moving or renaming a bundle must not silently change its identity.

## 5. Artifact Definition contract

```ts
export interface ArtifactDefinition {
  artifactType: string;
  currentDefinitionVersion: number;
  fileRoles: Record<string, ArtifactFileRoleDefinition>;
  capabilities: ArtifactCapabilities;
  validators: ArtifactValidator[];
  formatter?: ArtifactFormatter;
  extractReferences?: ArtifactReferenceExtractor;
}
```

The Definition Registry must support:

```ts
register(definition)
get(artifactType)
has(artifactType)
list()
```

Unknown artifact types produce diagnostics rather than crash discovery.

## 6. Normalized EditableArtifact

```ts
export interface EditableArtifact {
  manifest: ArtifactManifest;
  bundlePath: string;
  files: ArtifactFile[];
  definition: ArtifactDefinition;
  capabilities: ArtifactCapabilities;
  validation: ArtifactValidationResult;
  references: ArtifactReferenceSummary;
}
```

The Generic Artifact Editor, CLI, Registry integration, Blueprint Import/Export, and Application validation/build tooling should consume this normalized representation.

## 7. Artifact Service

Recommended initial API:

```ts
export interface ArtifactService {
  discover(root: string): Promise<ArtifactSummary[]>;

  load(
    artifactIdOrPath: string
  ): Promise<EditableArtifact>;

  validate(
    artifactIdOrPath: string
  ): Promise<ArtifactValidationResult>;

  save(
    artifactId: string,
    changes: ArtifactChanges
  ): Promise<ArtifactSaveResult>;

  getReferences(
    artifactId: string
  ): Promise<ArtifactReferenceSummary>;
}
```

Do not add artifact-level methods such as `publishArtifact()`, `restoreArtifactVersion()`, or `getPublishedVersions()`.

## 8. Save behavior

Explicit Save must:

```text
load current artifact
↓
stage requested changes
↓
format staged files
↓
transactionally write all files
↓
validate resulting artifact
↓
log save and validation result
↓
return updated artifact/validation state
```

Important:

- invalid artifacts may be saved
- validation errors are returned to the caller
- validation errors do not block Save
- multi-file Save must provide all-or-rollback behavior

## 9. Formatting

Explicit Save automatically formats supported files.

Minimum formats:

```text
JSON
TypeScript
TSX
CSS
Markdown
```

Prefer the repository's existing formatter configuration, especially Prettier.

External manual edits are not automatically formatted merely because they are detected.

## 10. External file changes

```text
external change detected
↓
resolve owning Artifact Bundle
↓
load artifact
↓
validate
↓
log PASSED / FAILED
↓
refresh registry/editor state
```

Do not prevent external edits.

Do not create internal artifact revisions.

Git owns source history.

## 11. Shared validation

All validation consumers use the same validation infrastructure.

Validation stages for artifacts:

```text
1. artifact.json syntax
2. manifest structure
3. known artifactType
4. required file roles
5. referenced files exist
6. artifact-specific structural validation
7. artifact-specific semantic validation
8. reference validation
9. source syntax/build validation where applicable
```

Diagnostic contract:

```ts
export type DiagnosticSeverity =
  | "error"
  | "warning"
  | "info";

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
```

Warnings do not make an artifact invalid.

The shared validation framework will eventually support:

```text
Artifact Validation
Form Validation
Submission Validation
Dataset Validation
Application Validation
```

## 12. Initial artifact types

Artifact Foundation v1 should prove the model with:

```text
Route / RouteGroup
Form
Trigger
```

Schema can follow immediately after those three are working.

## 13. Route model

A Page and a Route are separate artifact types.

Example URLs:

```text
/tour/register
/tour/unregister
/tour/group-register
```

Example:

```text
routes/
└── tour/
    ├── artifact.json
    ├── register/
    │   └── artifact.json
    ├── unregister/
    │   └── artifact.json
    └── group-register/
        └── artifact.json
```

Parent route group:

```json
{
  "schemaVersion": 1,
  "artifactId": "route_group_tour",
  "artifactType": "routeGroup",
  "name": "tour",
  "definitionVersion": 1,
  "files": {},
  "config": {
    "path": "/tour"
  }
}
```

Child route:

```json
{
  "schemaVersion": 1,
  "artifactId": "route_tour_register",
  "artifactType": "route",
  "name": "register",
  "definitionVersion": 1,
  "files": {},
  "config": {
    "path": "register",
    "page": "page_tour_register"
  }
}
```

## 14. Form example

```json
{
  "fields": [
    {
      "field": "lastName",
      "label": "Last Name",
      "type": "text",
      "validators": [
        {
          "validator": "required",
          "message": "Last name is required."
        },
        {
          "validator": "max-length",
          "max": 25,
          "message": "Last name cannot exceed 25 characters."
        }
      ]
    }
  ]
}
```

Implement reusable validators:

```text
required
max-length
```

The Form artifact declares validator use. Validator implementation belongs to shared validation infrastructure.

Form validation belongs to the Form lifecycle, not a Dataset `before` trigger.

## 15. Trigger storage

Triggers are centrally stored and may be physically grouped by Dataset.

```text
system/
└── triggers/
    └── customer/
        └── normalize-name/
            ├── artifact.json
            └── trigger.ts
```

Example manifest:

```json
{
  "schemaVersion": 1,
  "artifactId": "trigger_customer_normalize_name",
  "artifactType": "trigger",
  "name": "normalize-name",
  "label": "Normalize Customer Name",
  "definitionVersion": 1,
  "files": {
    "source": "trigger.ts"
  },
  "config": {
    "dataset": "customer",
    "active": true,
    "priority": 200
  }
}
```

Dataset identity is explicitly declared and not inferred from folder location.

Triggers process arrays of records.

## 16. CLI

Initial CLI commands call ArtifactService:

```bash
uib artifact discover <root>
uib artifact inspect <artifact-or-path>
uib artifact validate <artifact-or-path>
uib artifact validate <root>
uib artifact validate <artifact> --json
```

The CLI must not implement separate validation rules.

## 17. Git expectations

UI Platform should expect Git or another source-control system as a development best practice.

Git/GitHub provides:

```text
history
diff
branches
rollback
merge conflict handling
collaboration
remote source backup
```

Do not implement a replacement version-control engine inside Artifact Foundation.

## 18. Application-level Build/Publish boundary

Artifact Foundation supplies:

```text
discover artifacts
load artifacts
save artifacts
validate artifacts
resolve references
provide diagnostics
```

A later Application-level layer supplies:

```text
validate application
aggregate artifact diagnostics
perform cross-artifact checks
build application
apply environment validation policy
publish/deploy application
```

## 19. Generic Artifact Editor boundary

The future Generic Artifact Editor should use:

```text
ArtifactService
EditableArtifact
ArtifactDefinition
ArtifactValidationResult
```

The editor owns UI-only state such as:

```text
unsaved changes
selected tab
in-memory working copy
validation display
```

It does not own filesystem persistence, artifact discovery, validation implementation, source history, or application deployment.

## 20. Revised Definition of Done

Artifact Foundation v1 is complete when:

- Artifact Bundle format is implemented.
- `artifact.json` can be parsed and validated.
- Artifact Definitions can be registered.
- Route/RouteGroup, Form, and Trigger definitions exist.
- ArtifactService can discover/load/save/validate artifacts.
- invalid artifacts can be saved.
- explicit Save formats supported files.
- multi-file saves provide all-or-rollback behavior.
- external edits are detected, validated, and logged.
- `required` and `max-length` validators work through shared validation.
- Trigger Dataset identity comes from metadata.
- CLI and ArtifactService return equivalent validation results.
- no artifact-level publish/version-history mechanism is implemented.
- Git/GitHub is treated as the source history/versioning solution.
- the architecture exposes the information needed by a future Application Validation + Build/Publish layer.

## 21. Acceptance scenario

```text
1. Create a Form Artifact manually.

2. Define Last Name:
   required
   max-length = 25.

3. Run:
   uib artifact validate <form>

4. Confirm validation succeeds.

5. Break the Form configuration.

6. Save the invalid artifact.

7. Confirm:
   Save succeeds.
   validation errors are returned.
   errors are logged.

8. Run CLI validation.

9. Confirm CLI reports the same validation diagnostics.

10. Fix the artifact.

11. Save again.

12. Confirm:
    Save succeeds.
    files are formatted.
    validation passes.

13. Edit an artifact file outside UI Platform.

14. Confirm:
    change is detected.
    artifact is revalidated.
    pass/fail is logged.
    file is not automatically reformatted solely due to the external change.

15. Confirm no internal Draft revision or artifact publish version was created.

16. Confirm Git can provide file history independently.
```

## 22. Next architecture milestone

The next architecture topic is:

> **Application Validation + Build/Publish Policy**

That layer will determine:

- what constitutes application-level validation
- how artifact diagnostics are aggregated
- what cross-artifact checks exist
- which diagnostics block a build
- whether build and deploy have different policies
- environment-specific validation policies
- how development behaves when artifacts are invalid
- whether partial builds are allowed
- how build output is promoted between environments
