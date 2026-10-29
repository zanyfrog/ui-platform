# Shared Website Composition — Native Dependency Admission Blocker

2026-10-29. **Stopped on a substantive existing-contract conflict. The Shared Website Composition Acceptance Review Gate has not been reached.** No acceptance or closure is declared.

## Concrete finding

Enabling `presentation.model: composition-v1` changes the actual server package catalog, independently of the accepted mixed Page-membership rule. `src/server/component-registry.ts`, in `installedUiBasePackages`, includes Platform-installed UI Base dependencies and searches Application/Platform roots for a non-composition Application. For a composition Application it includes only Application-declared dependencies and searches only its Application root. This rule is unchanged by the current work.

The disposable Application has no `package.json` dependencies and its `app.manifest.json` has an empty packages object. Six of the ten unrelated retained plain Pages contain the already accepted Card reference `cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1`; one also contains `@ui-base/ui:uib-panel`. These contracts were previously available from the Platform-installed native UI Base manifest. That catalog becomes unavailable after enabling composition, even though the Pages remain plain and their bytes remain intact.

Ordinary Chrome successfully enabled the specifically authorized presentation configuration. The subsequent ordinary Home Change Page Shell operation refused the complete candidate before writing any Page roles. Whole-Application validation in the same authorized Chrome session then reported unknown/ambiguous Card/Panel dependencies in both Visual and composition scopes. Evidence is preserved in `evidence/v1-shared-composition-20261029/normal-dependency-blocker-dom.txt`.

The new setup flow exposed a validation gap: `saveCompositionSource` obtains `discoverComponents(appKey)` from the current settings before validating the proposed settings. It validated setup using the pre-switch catalog, rather than the catalog that would apply after saving. The detached tests supplied stable package inputs and therefore did not establish this live transition's correctness. Their passing results are retained, without claiming that they prove a working enabled Application.

## Why implementation stopped

Completing the workflow requires an explicit, consistent admission path for the retained Pages' existing Card/Panel contracts in the enabled mixed Application. Silently restoring the broad Platform fallback would change the existing composed dependency policy. Changing Application package declarations or installing native dependencies is outside the specifically approved presentation-field change and requires a contract/scope decision here. Native UI Base has `ui.component.json`; it is not itself an available Platform service-package manifest, so ordinary service-package activation is not established as a solution.

The staged host's explicit native manifests do not resolve the server catalog conflict. They must not be used to bypass ordinary Save/Preview validation. No host launch or weakening of ownership, authorization, dependency or integrity checks was attempted.

The smallest next scope should cover both:

1. Validate a presentation settings candidate against its prospective package-admission mode before saving, rather than its old mode.
2. Establish one bounded explicit admission for the retained native Card/Panel contracts across normal Save, whole-Application capture, saved Preview and the disposable host, using the existing package contracts. Choose that admission explicitly; do not add a global fallback, new registry or renderer.

No dependency-policy change, package declaration, package installation or unrelated configuration change was made after this finding.

## Exact live state at stop

- One shared Shell was created and authored through ordinary Chrome controls: `shared-website/shell.visual.json`, identity `art_a8ca1455-8234-424c-ac66-6480701267f1`. Header precedes the main Region; branding binds to the existing Application name; footer is saved once in Shell HTML.
- The approved `presentation` section **is enabled**, with exactly `model`, `branding.applicationName`, `assetsRoot`, `siteStyles: []`, `defaultShellId` pointing to that real Shell, and `theme: {}`. Settings outside presentation remain unchanged. Before/after bytes, hashes and structural diff are recorded in `settings-before-after.json` and `settings-after.json`.
- Original settings SHA-256: `4e18fc40680c03c56e30046165acebbe19b408c9e7a167ca87d1958dbaf62cf5`.
- **All 79 existing Page files remain byte-identical.** Home/About/Contact remain plain with their original artifact and managed-node identities; no Route identities were allocated to them. All ten unrelated plain Pages remain unchanged.
- The enabled whole-Application composition graph currently refuses because the native dependencies are unavailable under the existing composition catalog rule. Live composed saved Preview and composed website verification are consequently incomplete.
- Settings were not silently rolled back: `saveCompositionSource` forbids removing the composition model, and generic `saveSettings` preserves an existing composition presentation. Bypassing these services would violate the requested boundary. The enabled, blocked state is reported explicitly for the next decision.
- Three qualified source-read modules remain unchanged. The corrected composition reader and staged host have not been launched in the admitted website. Existing plain host configuration remains active.

## Implementation and evidence retained

The progress report records setup/adoption controls, existing-runtime/Preview changes, explicit recovery refusal and the scoped package-manifest capture addition. After the operator restarted the disposable API, the focused Shell-tab transport correctly refused an Application-level setup POST. Setup was moved to the Application toolbar, using its existing session/owner headers and server authorization, without widening the focused-tab allowlist. The ordinary Application-level setup then succeeded.

Thirty focused admission/navigation tests, scoped typechecking, real detached service/adoption checks, composition-plugin recovery-refusal tests in four physical fixture collections, a thirteen-Page snapshot capture and isolated composed Preview lifecycle checks passed. These remain detached tests, not live transition or complete browser success. Client production build passes after the toolbar change. The broader client typecheck still reports the same seven unrelated diagnostics and none in the changed toolbar/editor files. The two historical Vitest suites remain uncollected because of their recorded Windows EPERM; they were not retried.

Normal Chrome evidence covers Shell creation/header/branding/footer authoring, actual settings setup, Home adoption refusal and whole-Application dependency errors. It does **not** establish completed adoption, shared Menu authoring, composed saved revisions, live composed navigation or history. A screenshot attempt for the final dependency state timed out in Chrome; the DOM evidence was saved before that failure. The earlier successful Shell screenshot remains retained. No unrelated Windows, native fixture or recovery investigations were repeated.

Recovery-refusal tests used new detached fixtures and retained the pending-journal bytes unchanged. No live journal or lock was manually altered. The composition plugin's source-root reads explicitly request refusal; the existing three qualified read modules were not edited. Application serialization remains a cooperating-writer boundary, not a multi-artifact atomicity guarantee or protection from unrelated filesystem writers.

The separate Mixed Admission closure and all historical blocker/progress reports, failed attempts, original evidence and exact inventories remain preserved. Current source changes and narrow disposable copies are intentionally retained as unfinished work. Exact inventory: `v1-shared-website-composition-dependency-blocker-files-20261029.json`.

No production, comprehensive security, unrestricted host, cross-Page fragment, Shell/Region navigation or deferred normal-browser unsaved-draft Preview acceptance is implied. No commits or pushes.
