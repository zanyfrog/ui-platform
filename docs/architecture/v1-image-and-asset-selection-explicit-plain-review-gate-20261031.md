# V1 Page Builder — Image and Asset Selection Acceptance Review Gate: Explicit Plain Creation

2026-10-31. **Bounded correction and verification submitted. Not accepted or closed. No commits or pushes.**

The new **Plain Page (no shared Shell)** option is implemented in the existing Create Page dialog and endpoint. Normal Chrome now demonstrates the genuine plain-Page Image chooser → literal src/alt → Save/Reload → close/reopen → saved Design Preview workflow. The existing composed Page still renders, and ordinary creation still uses the Application default Shell. Browser upload remains separately unverified under the retained automation limitation.

This submission adds to, and preserves unchanged, the original image-selection review and verification-continuation reports and evidence.

## Bounded correction

Three product files:

- `src/client/visual-artifacts/creation.ts`: adds the clearly labeled plain option while explicitly retaining the empty/default selection initially. Plain selection serializes `{pageMode:"plain"}` with no shellId. Ordinary default and selected-Shell choices retain their existing shellId serialization. The new intent is not persisted as Page metadata.
- `src/shared/page-creation.ts`: decodes creation intent. Omitted mode/empty ordinary Shell selection retain defaultShellId; explicit plain mode intentionally returns no Shell. Unsupported modes, non-string Shell selections and any simultaneous plain/Shell choice refuse with 422. Selecting a shared Shell without composition also refuses rather than silently discarding the selection.
- `src/server/index.ts`: consumes that intent in the existing protected creation endpoint. Page-only mode on other artifact kinds refuses. Plain creation uses the existing canonical plain route/uniqueness validator even when composition is enabled. Existing source creation, mutation serialization, ownership/permission admission, permanent identity allocation and selected-Shell existence checks remain in use.

No Page storage model, renderer, metadata authority, Shell detachment/conversion operation or admission exception was introduced. The existing service creates a plain Page with its ordinary managed section source and omits both shellId and routeId. Normal later saves and Preview continue using whole-Application mixed identity/reference/dependency validation. Composed membership/Region/Route checks were not changed.

## Normal Chrome — explicit plain creation and image workflow

The existing Builder tab was confirmed at `http://localhost:5374/`, using V1 Development Identity Fixture. Only browser APIs were used; no desktop automation, permission/policy changes or synthetic file mutation occurred.

The disposable API was restarted to load its corrected endpoint while the existing UI process remained running. Its original API/UI ports 4390/5374, Application/runtime/policy-store roots and normal V1 identity configuration were retained. The server and client source copies matched their primary sources before the correction. Restart invalidated in-memory sessions; Application Admin was selected again through the ordinary Development identity control. No I-AM configuration or Application settings were edited.

1. Create Page displayed **Application default Shell** as the initial selection and **Plain Page (no shared Shell)** as an explicit alternative. Selected the latter and created `image-selection-explicit-plain` at `/image-selection-explicit-plain`.
2. Created metadata has Page ID `art_e25966f7-b267-4513-9ffc-508b10a7d049`, no shellId and no routeId. Final metadata bytes equal the creation snapshot exactly. No source/metadata edits were used to simulate plain creation.
3. Selected the ordinary managed section in Structure, chose img in Insert element and used Insert selected item. Resulting identities: root section `node_ef6d31f1-653a-445b-a820-a9ee737f56f7`, layout wrapper `node_8535501b-4bc9-4788-8cf1-7a8b8cb8bca8`, Image `node_a74a9fa6-7937-4610-b04a-ca1ea611e46a`.
4. Choose Application image listed `image-selection-fixture.svg — assets/images/image-selection-fixture.svg`. The existing authorized asset is unchanged: SHA-256 `480751d64323c545b8eea3da2e8b820a78940133a7cd91af4ad5bf8ce2cc7c61`, 282 bytes.
5. An early selection during insertion saving was refused as stale and left src unchanged; an accompanying keyboard-entry attempt lost focus during rerender. The recorded chooser explains that the Image/Application/session changed. Cancelled that chooser, reselected the saved Image and opened a fresh chooser after saving settled. Selection then succeeded. No source or lifecycle workaround was used. This is retained refusal evidence, not represented as a successful first attempt.
6. Committed ordinary alternative text with keyboard entry and Tab after the src save settled. Existing autosave remained enabled under unchanged settings; Save Now was invoked when enabled. The successful final literal HTML is:

```html
<section class="uip-layout-item" data-uip-node="node_ef6d31f1-653a-445b-a820-a9ee737f56f7">
<div class="uip-layout-item" data-uip-node="node_8535501b-4bc9-4788-8cf1-7a8b8cb8bca8">
  <img data-uip-node="node_a74a9fa6-7937-4610-b04a-ca1ea611e46a" src="assets/images/image-selection-fixture.svg" alt="Explicit plain Page image fixture">
</div>
</section>
```

7. Reload / discard editor changes retained those literals. Closed and reopened the Page through normal navigation; source and identities remained the same.
8. Saved Design Preview rendered the Image. Chrome reports **complete=true, naturalWidth=240, naturalHeight=96**, with an actual rendered rectangle 240 × 96. The Image remains inside its original plain root section and has no Shell Region membership.
9. The rendered src is `/api/apps/v1-identity-fixture/composition-asset?path=assets%2Fimages%2Fimage-selection-fixture.svg`; currentSrc has that same API path under the confirmed origin. Stored HTML remains the literal Application-relative path, with no Builder-relative/API URL persisted.
10. Saved revision `2a323b72eed828e4c048b8a02fe14152dfe94927f5272eb83aeb64b54be9ea85` matches the Preview document URL, parent Preview feedback and SHA-256 of JSON.stringify(saved files) in service role order.

Evidence: `created-plain-metadata.json`, `saved-plain-bundle.json`, `rendered-plain.json`, `normal-plain-*.txt`, `normal-create-*.txt`, `normal-plain-stale-refusal.txt` and `verify-plain.mjs` under `evidence/v1-explicit-plain-20261031/`.

## Composed and default-creation regressions

- Existing `image-selection-composed` was opened without editing its content. Saved Design Preview still reports complete=true and natural dimensions 240 × 96, with Image ID `node_fe3e65f7-4abc-4dad-aa87-15f00cdd4160` in `region-main`. Saved revision remains `15178dd8117eef7a0b47eb3b2a84d3fddf80310da5545d5a7308ca407037ce86`. See `rendered-composed-regression.json` and `normal-composed-regression.txt`.
- A second ordinary Create Page dialog again started with **Application default Shell**, value empty. Without changing that choice, created disposable `image-selection-default-check`, route `/image-selection-default-check`. Its Page ID is `art_6a65f1f1-2d5e-4c96-86b1-b31891de9c07`, Shell remains `art_a8ca1455-8234-424c-ac66-6480701267f1`, and the service allocated real composed Route ID `route_e134fca6-3b23-4eea-acdf-3669da5607e4`. See `normal-default-choice.json` and `created-default-metadata.json`.
- The earlier misleadingly named `image-selection-plain` remains composed and byte-identical, including its original Page/Shell/Route identities. It was not converted.

No disposable website-host profile or route qualification was expanded. These are Builder saved Design Preview results.

## Focused checks and builds

Final focused command `node scripts/verify-explicit-plain.mjs` passed in `evidence/v1-explicit-plain-20261031/run-1793462439024/`:

- **39 collected passing tests**: the prior 34 mixed/plain/guided source/service regressions plus default and selected Shell decoding, serialized explicit plain intent, unsupported/ambiguous refusal, actual service plain creation with no synthetic identities and Image Save/Reload, and actual service composed creation with real Route allocation/strict Region membership.
- Actual creation-dialog isolated-DOM checks cover initial default selection and exact serialized default/plain/selected-Shell requests. The first fixture run exposed default-selection behavior in the isolated DOM; the dialog now explicitly sets its initial value, and the final run passes. Initial failed-run logs remain preserved. That run's completed unit checks are not confused with a fully passing run.
- Existing **21 Image checks**, actual editor mutation/identity/Region/Save/Reload checks, both Page-type saved Preview resolver/error fixtures, mixed runtime/dependency enforcement and Preview lifecycle/revision/disposal/Reload/history regressions still pass. Simulated authorization/error events remain fixture evidence and are not browser upload proof.
- Strict scoped typechecking includes the new helper and dialog and passes with zero diagnostics. Full server no-emit typechecking passes.
- Full `npm run build` passes: platform core, artifacts, visual-artifacts, production Vite client and server TypeScript compilation.
- Broader client no-emit checking retains exactly the same **seven unrelated diagnostics**: six sibling ui-base declaration gaps and the main.ts string-or-boolean diagnostic. Existing pinned-native import.meta bundling warnings remain in focused logs. Previously blocked legacy suites were not rerun or represented as passing.

Additionally, four **actual authorized service requests** against the corrected existing endpoint returned 422 for an unsupported mode, combined plain/empty Shell intent, non-string Shell selection, and Page mode on Shell creation. No refusal-test artifact was created. `api-refusals.json` records these results and the separate normal Application Admin fixture session; credentials are not retained. These requests supplement, rather than replace, the normal browser creation/selection evidence.

## Preservation and inventory

`preservation.json` checks 711 baseline files with none missing. The only changed original Application file is the ordinary append-only operations log. All existing Page/Shell/Menu/settings/dependency/asset sources, including Home/About/Contact/Services, previously accepted plain Pages, both earlier image-test Pages and the SVG, remain unchanged. Original image-selection reports, failed attempts, source differences and historical evidence remain unchanged. Pinned native inputs continue matching the qualified fixture hashes.

Product changes are limited to the three files listed above and matching disposable source copies. New Application source files belong only to the two newly created disposable Pages. No protected Component root, I-AM policy, permissions, autosave configuration, recovery state, Windows security or browser policy was changed. Existing mutation/session admission and source-read boundaries remain decisive.

`files.json` is the exact SHA-256 inventory, grouped as product sources, disposable copies, verification files, report, evidence, Application additions/changes and regenerated build outputs. It references the unchanged prior inventory hashes and excludes its own self-hash. Build outputs are listed as regenerated without claiming every output changed. The disposable API remains running; its ordinary runtime logs and operations history can append after this captured inventory. `source.diff` preserves the tracked correction; the new helper is separately listed in the inventory.

## Retained qualifications and stop

Browser upload remains **unverified** due to the existing Chrome file-picker automation limitation. No extension/Windows/browser policy setting was changed, no browser upload was forced, and the earlier service-prepared SVG is not presented as browser upload evidence. No new uploader or automation framework was added.

Screenshot capture again timed out at Page.captureScreenshot; no screenshot is claimed. Actual DOM/decoded-image/revision evidence is retained. Initial stale chooser refusal, interrupted typing and failed test attempt remain visible in the record. No content pinning or atomic consistency between Page revisions and mutable asset bytes is claimed.

**Stop: V1 Page Builder — Image and Asset Selection Acceptance Review Gate. Plain and composed existing-image selection/rendering verified; browser upload remains unverified. Separate approval is required for acceptance or closure. No commits or pushes.**
