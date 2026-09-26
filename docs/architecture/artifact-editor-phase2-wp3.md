# Generic Artifact Editor Phase 2 — WP3 descriptors, properties and plugins

Date: 2026-09-26. **WP3 stage gate: implemented and ready for review. WP4 has not started.**

Implements the approved Phase 2 plan's descriptor/field-component/plugin registry stage using the WP2 runtime and imperative DOM/UI Base architecture. Foundation and Phase 1 code and existing tests were preserved.

## Descriptor boundary and authority

`EditorDescriptorRegistry` registers JSON-safe presentation descriptors by **exact artifact type and definition version**, with unique registration, section and field IDs. Registration rejects executable values, accessors, non-plain objects, cycles, sparse arrays, non-finite numbers, unsafe property paths, duplicate IDs and editable identity/version/file-mapping bindings. Returned descriptors are detached copies. No raw `ArtifactDefinition`, validator, formatter or reference extractor is serialized.

`src/server/editor-presentation.ts` is the transitional display adapter. It defines display-only registrations for the current Route, RouteGroup, Form and Trigger version 1 definitions. Resolution checks the actual loaded canonical `EditableArtifact.definition`, its current version and declared file roles. Unknown types, unsupported versions and malformed manifests receive no descriptor. This is not a new artifact-definition or validation registry: it owns labels, control IDs, bindings and display choices only. Foundation remains authoritative for validity, formatting, references and persistence.

The plan's JSON transport bridge adds **one optional `presentation` property to the existing editor artifact response DTO**. Existing consumers and fixtures can omit it. Existing routes, save request DTOs, service signatures, working-copy/context methods and Foundation package exports are unchanged. The descriptor is projected inside the existing authorized load/save response, with the same application and artifact security boundary. There is no new endpoint, metadata service or persistence. This is the explicitly planned editor-only bridge, not an upstream Foundation API change.

Descriptors bind sections to raw manifest JSON or a declared file role, and fields to explicit structured paths. Control metadata supports text, long text, number, Boolean, selection, existing object collections, read-only fields, help, conditional visibility and optional preferred plugin IDs. Conditional visibility cannot expand permission. Identity, version and file mappings remain read-only. Future canonical presentation metadata can replace the registrations behind this adapter without introducing a second source of validity rules.

## Property editing and preservation

`EditorFieldRegistry` resolves control IDs to imperative renderers. The generic Properties panel uses existing `uib-forms-field` Web Components and native accessible controls within the existing `uib-tabs` shell. A field-component failure is isolated to that field. Unknown controls explain their absence and offer the read-only source preview.

All changes call the existing `EditorRuntimeContext.setManifest` or `setFile`. Field handlers re-read the newest shared snapshot before mutation; they do not retain an editable artifact model. Detached/stale panels check the current locator and descriptor before writing. Existing context permission and operation guards remain in force.

The JSON binding adapter parses source spans and replaces only the selected value or inserts a missing optional property path. It does not regenerate whole objects/files. Untouched extensions, unmodeled sections, whitespace and numeric lexemes remain intact in the working copy; subsequent formatting belongs to Foundation. A real Foundation save test verifies retention of a large numeric lexeme and unmodeled file properties. Manifest extensions are tested inside `config`, where Foundation permits them; arbitrary extra top-level manifest properties are rejected by the existing canonical parser and are not silently accepted by this editor.

Existing collection objects are located by permanent IDs where available, with descriptor-declared unique fallbacks (`field` for Form fields and `validator` for validator configurations). Reordering by another panel does not redirect a pending edit to a different ID. Missing/ambiguous identities, duplicate JSON keys, unexpected object/scalar shapes and invalid JSON pause affected structured editing and preserve the original content. Other independently representable sections can still be edited. A stale scalar edit refuses to overwrite an object introduced by another panel.

Incomplete numeric input such as `-` is retained in the shared source as a JSON string draft, rather than disappearing, becoming `NaN`/`null` or living in an independent draft store. Completing the input produces a number. Unsafe integer conversion is refused by retaining the entered text; controls do not round existing unsafe integer values. Invalid values/configurations can still use the existing autosave path. Incomplete numeric text may fail authoritative validation, as intended.

Editing messages are labeled **Editing draft/Editing preview** and are separate from saved-source validation. Validator configuration previews call the existing browser-safe `ValidatorRegistry.validateConfiguration` implementation, including the reusable max-length validator; no competing structural validator was added. The Form registration exposes existing required/max-length configuration without hardcoding Last Name rules or injecting new validators into source. Saved diagnostics remain the service's result. The server/CLI proof editor walkthrough remains WP5 work.

Malformed manifests retain their raw source and saved diagnostics but do not acquire invented property metadata. Repair requiring raw source editing remains WP4. Valid JSON with unsupported structures is preserved and identified separately from syntactically invalid JSON. Source preview remains readable for authorized copies.

## Plugin architecture

`EditorPluginRegistry` separates JSON-safe plugin metadata from executable, browser-only renderers. Registrations declare compatible artifact types, exact definition versions and ordered tab/toolbar/context contributions. IDs are constrained to avoid ambiguous contribution keys; duplicate registrations/contributions and missing renderer functions fail registration. Compatible contributions are selected deterministically, and edit-only contributions are hidden for read-only copies. Missing preferred plugins and incompatible versions produce explanations without removing generic Properties or Source preview.

New compatible registrations update an already-mounted shell without a shell-code change. The default Configuration and Form fields tabs are **generic descriptor-section contributions**, not independent editors or new services. Multiple plugins can contribute to the same Form, and Properties plus plugin panels edit the same field in the same working copy.

Every renderer receives the actual shared `EditorRuntimeContext`. The plugin scope provides guarded events, guarded context subscriptions, cleanup registration and source-preview navigation. Synchronous/asynchronous render, event, subscription and cleanup errors are isolated to the contribution; failed contributions release their registered resources. Late async setup cannot register listeners after disposal. Source remains in the host. Shell re-rendering preserves the active tab and focused field/caret during ordinary input.

Plugins are **trusted application modules, not a sandbox**. Render functions must avoid source-changing side effects; user actions mutate through the shared context and must read its latest snapshot. Plugins must use the scope for subscriptions/events/cleanup and must not create direct save clients or persistence. Deliberately malicious code with arbitrary browser access is outside this registration framework's isolation guarantees. Headless Foundation validators/build tooling never import these DOM/plugin modules.

## Authorization and recovery compatibility

Property controls are disabled from effective copy capabilities/context state, and edit-only plugin actions are filtered. The server still authorizes every operation. No legacy discovery or management path is used for descriptors or fields.

WP2 identity invalidation removes every field, plugin, source preview and comparison from the DOM synchronously. The copy remains suspended in its existing host. Original-user authorization, fresh comparison, changed-checksum decisions, discard and admitted-save behavior are unchanged. Tests edit through descriptor bindings before identity changes and verify recovery of the same dirty source, followed by additional field edits through the original context.

## Scope adaptations and remaining limitations

- The optional response property is the plan's minimal presentation bridge; it does not extend executable Foundation definitions or add an endpoint.
- Properties and plugin contributions use UI Base Web Components and imperative TypeScript, adapting the illustrative component architecture to this repository.
- Collections support editing **existing** identified objects. Creation, deletion/reordering UI and richer validator builders are deferred to proof-editor work. Duplicate fallback identities disable that collection rather than risk editing the wrong item.
- Artifact reference values are plain ID fields validated by the server; authorized reference pickers/navigation and the full References panel remain deferred.
- There is no rich/raw editable source panel, code formatter UI, line navigation or visual code regeneration. The existing read-only preview is the integration seam. Raw malformed-source repair therefore remains unavailable in this stage.
- Specialized designers, full Form submission previews, Git/reverse-reference integration and a configured build engine remain deferred. No WP4/WP5 implementation was started.
- Browser integration suites are repeatable local browser harnesses, not a newly installed headless runner or hosted CI job.
- The intermittent Windows watcher issue is tracked independently in `artifact-watcher-windows-rename-issue.md`. It remains unresolved; green retries are not described as a fix.

## WP3 files and interfaces

| Files | Role |
| --- | --- |
| `src/shared/editor-presentation.ts` | JSON-only descriptor types, registration and structural safety checks |
| `src/server/editor-presentation.ts` | Canonical-definition-gated display adapter |
| `src/shared/artifact-editor.ts`, `src/server/artifact-editor.ts` | Optional response projection through the existing service boundary |
| `src/client/artifact-editor/property-bindings.ts` | Targeted JSON span mutations and stable collection addressing |
| `src/client/artifact-editor/properties.ts` | Field-component registry and generic property panel |
| `src/client/artifact-editor/plugins.ts`, `default-plugins.ts` | Modular contribution registry, guarded lifecycle and default descriptor panels |
| `src/client/artifact-editor/shell.ts`, `editor.css` | Properties/plugin slots, reactive composition and input focus retention |
| `tests/editor-properties.test.ts` | Registry, mutation, preservation, actual Foundation saves and recovery tests |
| `tests/browser/editor-properties.html`, `editor-properties.ts` | Real-DOM/UI Base field/plugin integration harness |
| `scripts/check-editor-contracts.mjs`, `check-editor-production.mjs` | Include WP3 tests and production-exclusion markers |
| This report and the separate watcher issue | Architecture, scope and evidence |

New registry/rendering APIs are editor-local modules. No package dependency was added. No Foundation/Phase 1/context public method, autosave timer, save queue, validation engine, service or persistence mechanism was replaced or duplicated.

## Test evidence

- **178/178 full regression tests in 27 files passed**, using `npm test -- --maxWorkers=2`. The complete two-worker run passed twice, including the final runtime changes. Assertions and timeouts are unchanged.
- **103/103 compatibility tests in 13 files passed** on gate retry. This includes freshly built Foundation exports, consumer probes, browser validator isolation, schema-adapter compatibility, Windows storage, watcher, Phase 1, WP1/WP2 and WP3 tests.
- **16 new registry/property tests passed**, including actual service saves and invalid-draft diagnostics.
- **18 browser tests passed:** nine existing WP2 regression cases plus nine WP3 cases. WP3 covers multiple plugins sharing source, input focus, conditional fields, incomplete numeric drafts, shared-validator preview, unsupported/invalid source preservation, missing/version-incompatible plugins, sync/async plugin render/event/subscription/cleanup failures, permission changes, original-user recovery, read-only controls, malformed manifests and final cleanup.
- **Real-server browser walkthrough passed:** explicit app-editor identity, authorized discovery, descriptor-backed Form properties, edit synchronization to the Form fields plugin, existing autosave acknowledgement, preserved extensions/validators in saved source, reviewer-switch source removal, and original-user comparison/reload recovery. The real properties layout was visually inspected.
- **Workspace typecheck passed. Production client/server build and editor-exclusion check passed.** The existing 635.91 kB JavaScript chunk warning remains; production client assets do not contain descriptor/property/plugin UI markers.

Repeat browser tests by starting local Vite and visiting `/tests/browser/editor-properties.html` and `/tests/browser/editor-shell.html`. The pages show each assertion and a final result. They use real DOM/UI Base/context/shell modules with deterministic transport responses. The separate real-server walkthrough used isolated disposable Form/Route fixtures under the WP1 fixture boundary. Temporary servers and fixtures were cleaned up afterward.

Failures and retries were not hidden. Initial new-test failures came from a fixture containing a prohibited top-level manifest extension; the fixture was corrected to Foundation's supported `config` location. An initial browser focus assertion set the tab attribute without emitting UI Base's selection event; it was corrected to click the real tab. A final stale-panel guard initially needed an explicit TypeScript descriptor type; typecheck then passed. The first default full suite had 175 passes and three failures (watcher `EPERM`, consumer/build timeouts), with a timed-out build cleanup error. Sequential rerun passed the two timeout cases but reproduced watcher `EPERM`. The second default full run had 177 passes with only the consumer timeout. Two complete two-worker runs passed 178/178. Compatibility initially had 102 passes and watcher `EPERM`, then passed 103/103. No existing test or timeout was modified. Simultaneous browser fixture/test servers reported the known shared HMR-port warning; HTTP browser testing remained functional.

**Stop at WP3. Await approval before WP4.**
