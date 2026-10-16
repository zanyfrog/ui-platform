# Builder V1 WP4 — Visual Form authoring

2026-10-16. Implementation follows the approved [WP4 decisions and plan](builder-v1-wp4-plan.md). WP4 acceptance and the complete Builder V1 journey are separate review gates. WP0–WP3 ownership, security, schema application, lifecycle and documented V1 limitations remain the baseline.

## Shared definition and generic editor

A Form remains the existing Form-capable Platform Component: permanent artifact/Component identities and one HTML, CSS, metadata, fixtures and functions bundle. `visual-form-transport.ts` projects those five roles into the generic Artifact Editor DTO without manufacturing or persisting a generic manifest. Existing VisualArtifactService and Foundation own validation, identity checks and transactional saves. Legacy generic Form artifacts retain their existing format.

The shared Form uses one `EditorRuntimeContext` / `EditorWorkingCopy` / WP2 lifecycle, with two-second autosave, explicit Save Now, bounded logical Undo/Redo, retained invalid source drafts, original-identity admission, expected-checksum conflicts and existing comparison/recovery. `setFiles` makes coordinated structure/mapping changes one history command and one complete candidate. The workspace continues to authorize canonical Platform-owned definition tabs in the requesting Application context.

Form contributions expose Dataset Mapping, Structure and Fields, Validation and Calculations, Modes, Preview and Submission Test, and Advanced Source. Creation supports a blank Form or an authorized applied Dataset picker. The inspector edits supported field labels/help/defaults, required/read-only/visibility, operation applicability, order, mappings and modes; no source JSON is required for the ordinary journey. Read/write adapters remain the approved `dataset.read`/`dataset.write` services.

## Dataset mapping and A18

Discovery reuses WP3's Application-qualified source/applied distinction. Executable mappings use the verified applied schema and permanent Dataset/field IDs; keys/types/required hints are checked against actual applied binding at protected submission. A newer Dataset source draft cannot replace runtime authority. No schema application, migration, grant or connection happens implicitly.

Create Dataset from Form calls the existing WP3 creation route and opens the Dataset's existing generic editor. An owner-qualified origin token retains the actual Form editor, original User, requesting Application, Component identity and local generation. Return/link reauthorizes both artifacts, checks valid saved target source and its checksum, verifies that the origin is still open/current, and refuses implicit remapping of existing fields. Cancellation, failed creation, changed/closed origins and revocation cannot attach a Dataset to a different Form. Apply/Connect remain explicit WP3 actions.

Date fields use exact UTC ISO text so time/zone information is preserved. Unsupported JSON automatic generation is exposed explicitly; a manual JSON-object mapping uses existing textarea controls and parses without coercion. Arrays/scalars are rejected by that mapping, not silently converted. Missing required mappings fail protected submission. The Dataset schema and permanent identities remain unchanged.

## Conditions and calculations

The [canonical versioned expression contract](builder-v1-wp4-expression-contract.md) reconciles the existing bounded presentation evaluator, Form model and DOE. One pure browser/server module handles legacy presentation expressions and typed version-1 declarations. There is no second expression, schema or authorization engine. Versioned conditions require Boolean results; calculations use stable field references, deterministic typed operators, bounded declarations, topological dependency ordering and cycle detection.

The common Form runtime recalculates and re-renders conditions on actual value changes, preserves values across presentation changes, and excludes hidden/read-only values from ordinary writes. Calculated controls remain read-only even under mode overrides. Invalid JSON text remains a per-field runtime draft until corrected. Unchanged blur/change events do not rebuild a Form during its Submit click. UI Base checkbox reflection is consumed through its existing checkbox-change event.

Builder-authored definitions select Form contract version 1. Submission supplies a permanent Form reference; the protected host resolves the authoritative source rather than trusting client declarations. DOE checks applied field identities/types/required hints and required mappings. Persisted calculations require separately authorized dependency READ and normal target WRITE authority, and the same evaluator validates final values after defaults and before-Trigger transformations have been applied. Tampering, missing/unreadable dependencies and stale definitions fail without committing.

These are Form submission constraints. Independently authorized Dataset and automation operations retain existing Dataset authority; Form definitions do not create new Dataset schema invariants or grant permissions.

## Preview and protected execution

The renderer and Form runtime are shared by design preview, isolated submission testing and the running Application. Design preview supplies fixtures, no persistence services and no executable Form function module. Unsupported function-dependent behavior is reported rather than executed in design mode. Ordinary runtime functions and services retain their existing contracts.

The workspace holds the preview iframe outside the generic shell's rerendered controls. Routine same-session authority refreshes do not remount stateful panels; real identity/revision changes still suspend source immediately. Focused preview capture uses the existing bounded coherent graph-read helper. The Builder's Vite watcher ignores shared authoring bundle files so source saves do not reload the editor; running Applications retain their own revision-aware readers/watchers.

Explicit submission tests bootstrap a fresh bounded one-Dataset domain through the existing WP3/Data Services bootstrap, registry, DOE/I-AM and ORM. Test storage/publications/registry paths are separate, the automation catalog is empty, and test routing is bound to the original User, Application, Dataset and Form. Test startup requires existing Dataset administration and source authority; no grants are created. Test targets never replace the normal Application connection. Ending a target closes its host; isolated files remain available for local diagnostics until the containing development/test workspace is removed.

Normal Application submissions continue through ApplicationDataClient, the Application-qualified proxy and trusted server identity to DOE/I-AM/ORM. A committed write with failed read-back or post-commit processing is reported distinctly, with no automatic mutation retry or false rollback claim.

## Verification boundary

See [verification](builder-v1-wp4-verification.md) and [changed-file inventory](builder-v1-wp4-files.txt) for actual results, browser provenance, unsuccessful attempts and retained limitations. Complete program-level route/Menu/automation authoring, application-wide diagnostics, general isolated test infrastructure and WP6 acceptance remain outside WP4. WP3 migration and multi-Dataset hosting limitations remain unchanged.
