# V1 Shared Website Composition — Contract Blocker

2026-10-28. **Stopped during read-only preflight, before implementation**, under the authorization's instruction to report an essential contract conflict rather than introduce architectural expansion. No acceptance or closure is declared.

## Required workflow versus existing contract

The authorization requires adopting the existing saved Home, About and Contact Pages in their existing disposable application while preserving other accepted Pages. The application currently has **13 Visual Pages; all 13 are plain Pages without shellId or routeId**. Ten are outside the requested three-Page adoption. Current settings do not enable composition-v1.

Existing composition admission is application-wide:

- `src/server/application-composition.ts:20` (`compositionWorkspace`) lists all Visual Pages under the application's `src/pages`. Once composition-v1 is enabled, it requires every Page node to belong to a Shell Region, and every Page to have permanent Route and Shell identities. It does not expose a selected-Page or mixed-mode admission option.
- `packages/visual-artifacts/src/composition-validation.ts` independently enforces Region membership and Shell/Route identities for every Page in the captured definition.
- `src/server/visual-preview.ts` calls that full application composition capture for a selected Shell-backed Page before narrowing the returned composition to the selected Page. Selecting just Home for Preview does not bypass the full-graph requirements.
- `packages/visual-artifacts/src/revision-composition-vite.ts` recursively captures all application Visual Pages and validates the resulting definition. Its options are root, sharedComponentsRoot and revisionPinned; there is no existing selected-Page composition scope.

Therefore, adopting only the three requested Pages and enabling composition would leave ten preserved plain Pages outside the required contract. Ordinary composed validation, saved Preview and host composition loading would reject that graph. Migrating those other Pages would exceed the authorized scope. Copying the three Pages into another application would not meet the required existing-Page/ownership workflow. Filtering Pages only in the host or disabling validation would not resolve the server and Preview contracts.

## Required decision before implementation

An explicit **mixed plain/composed Page admission contract** is needed if the existing three Pages must be adopted while the other ten remain unchanged. This would define which Pages participate in Shell composition, keep ordinary plain Pages supported, and validate route uniqueness and references across both sets. It must apply consistently to normal candidate validation, composition workspace capture, saved Preview and the revision-aware host loader. Simply dropping unassigned Pages from one reader is not sufficient and must not silently weaken whole-application validation.

That is a change to the current application-wide composition contract, not merely adding Shell controls or reusing the renderer. It requires separate authorization of this narrow prerequisite, or a revised requirement permitting a fresh composition-only application and fresh Page identities. Neither alternative was implemented or inferred as approved.

## Additional confirmed prerequisites

`changePageShell` remaps existing Regions and assigns shellId; it does not establish plain-body containment in region-main or allocate a missing routeId. Explicit identity-preserving adoption still needs implementation after the graph contract is resolved. Existing Page source, node IDs and layout must be retained inside the new Page-owned Region without copying Shell markup into Pages.

The current revision-aware composition plugin also invokes recovery-enabled root recovery in development. It must be explicitly adapted and qualified to use the existing recovery-refusing boundary before entering the admitted website host. No such read was executed, and no recovery state or qualified source module was changed during this preflight. The plugin's production-build path selects a published presentation snapshot; it cannot be treated as production qualification under this authorization.

## Evidence and preservation

Read-only input hashes and all 13 Page metadata summaries are recorded in `evidence/v1-shared-composition-preflight-20261028/contracts-and-pages.json`. Preservation checking confirms all **61 accepted earlier Page files**, **3 qualified recovery-read modules**, **16 original reference-host files** and **175 historical host evidence entries** remain unchanged. The three accepted multi-Page bundles were additionally compared with their final saved role captures.

No product code, application settings, Pages, ownership, permissions, autosave, recovery state or host qualification was changed. No browser mutation campaign or implementation test run was started. Only this blocker report and new preflight evidence were added. No commits or pushes.

The **V1 Page Builder — Shared Website Composition Acceptance Review Gate** has not been reached. The concrete blocker is coexistence of the requested three adopted Pages with the ten preserved plain Pages under existing whole-application composition admission.
