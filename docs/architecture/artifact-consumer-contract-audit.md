# Artifact consumer contract audit — 2026-09-25

## Existing implementation inspected

- `packages/artifacts/src/types.ts`: canonical `ArtifactService`, `ArtifactDefinition`, `EditableArtifact`, `ArtifactValidationResult`, and `ValidationDiagnostic` contracts.
- `artifact-service.ts`: real filesystem discovery, load, save, validation, identity binding, duplicate detection, reference extraction, and watcher integration.
- `definitions.ts`: shared `ArtifactDefinitionRegistry`; built-ins are Route, RouteGroup, Form, Trigger, Dataset, and Migration. Custom registrations use this same registry.
- `validation/validate-artifact.ts` and `validation/validator-registry.ts`: shared validation orchestration and value validators.

The application build service imports the canonical types and consumes the supplied ArtifactService instance. It does not construct another discovery service or registry. Normalized EditableArtifact objects retain the registered definition, capabilities, files, checksum, references, and validation result. Runtime compilation support is a separate capability: recognizing a registered type does not imply that the foundation compiler can compile it.

## Differences corrected

The graph previously added bundle paths and synthetic artifact IDs to shared diagnostics. It now retains diagnostics unchanged and tracks ownership privately for reachability policy. Malformed manifests still have no invented identity.

The graph also reproduced reference-type validation with a different message, and emitted a second duplicate-ID diagnostic. Duplicate detection now stays with ArtifactService. Reference checks were extracted from the existing validator into `validation/validate-references.ts`; both artifact validation and application-context validation import that implementation. Existing codes, messages, fields, and locations are preserved, and identical diagnostics are not added twice.

Migration source loading no longer reruns dataset/migration definition validation after ArtifactService has already validated the source. Failed source consumption throws `ArtifactValidationError`, exposing the original `ArtifactValidationResult` without translating its diagnostics. Provider baseline checks and checks on newly constructed migration definitions still use the registered definition's shared validation functions because those inputs have not been loaded/validated as source artifacts.

## Intentional distinctions and remaining integration difference

- `ApplicationValidationReport` is an application-level aggregation, not a replacement artifact-validation interface. Its `valid` flag expresses build-blocking policy over runtime reachability. An unused invalid artifact can therefore appear in `diagnostics` without blocking the build. ArtifactService's own `valid` semantics remain unchanged.
- Application validation may add reference diagnostics using the discovered application context when the supplied service has no reference resolver. Source diagnostics remain intact. Missing runtime dependencies, inactive central triggers, build cycles, and pending migration gates are additional application checks, not alternative artifact rules.
- Dataset and Migration are extensions registered through the existing ArtifactDefinitionRegistry. They do not introduce another artifact registry. Page and other custom types must be registered by the caller and are recognized by the consumer through that registration.
- **Remaining upstream difference:** `application/migration-definition.ts` contains a local `DatasetSchema` shape and schema adapter validation matching the sibling Data Services schema format. It is not a direct import of that package. Data Services' schema validator is currently private to its versioned-definition adapter and includes publication lifecycle behavior. Replacing the local adapter requires an exported, source-validation contract from that repository and an explicit package dependency; this audit does not claim that work is complete or silently change the upstream lifecycle. No alternative ArtifactService, ArtifactDefinition, or EditableArtifact interface was created.

## Contract and integration evidence

`packages/artifacts/tests/consumer-contract.test.ts` uses the real FileSystemArtifactService and registry with temporary source bundles. It checks:

- load/validate/discover/save/CLI agreement and normalized definition/reference/capability contracts;
- every registered built-in and a custom definition, with unknown types still diagnosed;
- exact equality of application and source diagnostic arrays, including custom diagnostic fields;
- malformed manifests and duplicate identities without rewritten diagnostics;
- reference message/code/location parity without duplicate reference errors;
- application CLI parity and migration errors retaining the original shared validation result.

The existing Artifact Foundation acceptance tests run alongside the new consumer tests. These tests import the shared implementation; they do not substitute a parallel validator or a mocked artifact service.
