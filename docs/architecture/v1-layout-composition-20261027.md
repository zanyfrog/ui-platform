# V1 Page Builder — layout and composition verification

Status: **V1 Page Builder — Layout and Composition Acceptance Review Gate**. Submitted for review; no acceptance or closure is declared.

## Result and supported composition

The existing controls support the selected practical composition in normal Chrome: **a native UI Base Card inside the Page's managed HTML section**, centered horizontally with container padding and an explicit Card-wrapper width. Create → container selection → insertion → layout/property edits → Save → Reload → saved Design Preview passed. A meaningful width adjustment from **320px to 480px** also persisted and changed the measured native rendering.

**No product-code correction was needed.** No new renderer, layout store, component contract or persistence mechanism was introduced. Panel was not used or assumed to support content/nesting.

## Inspection and baseline

The editor already exposes width, height, margin, padding, display, gridTemplateColumns, gridColumn, gap, alignItems, justifyContent and flexDirection on the selected wrapper. Selecting a component targets its existing parent layout wrapper. Selecting the Page's generated section targets that section. Base/tablet/mobile selectors write the pre-existing `metadata.layout` contract; existing `layoutCss` derives CSS with 1023px tablet and 639px mobile media rules and refuses unsupported properties or unsafe values.

HTML remains authoritative for instance identities, literal Card properties, containment and order. Layout rules remain solely in the **already existing** `.visual.json.layout`, keyed by managed wrapper IDs. The renderer derives CSS from it. No second layout map, inline layout duplication or JSON component-property instance store was added.

Before execution, `evidence/v1-layout-composition-20261027/baseline.json` recorded 17 files: five relevant source files/copies and all twelve files of the two previously accepted Pages. Full source snapshots were retained. Current refresh scheduling was preserved exactly, including workspace/standalone polling distinction and focus listener/cleanup; it is not separately accepted by this verification. HEAD was `1f31251f33b5455660e1ddbf201e73d6415ecfd4` and remains unchanged.

## Normal Chrome workflow

Used the existing admitted environment and normal session: UI `http://localhost:5374/`, API `http://localhost:4390/`, Application `v1-identity-fixture`, permanent owner `dev-v1-identity-fixture`, principal **Application Admin (admin@example.local)**. No server startup, new identity, settings change or permission change occurred.

Created a fresh disposable Page through the normal Create Page dialog:

- Locator: `v1-layout-card-20261027/page.visual.json`.
- Route: `/v1-layout-card-20261027`.
- Artifact ID: `art_9b1844f5-6375-44f5-a5f3-b7fb5a6d75eb`.
- Storage: `C:\Projects\Modular\v1-normal-smoke-20261026-01\apps\v1-identity-fixture\src\pages\v1-layout-card-20261027`.

The generated section was selected in Structure. Its existing base layout controls were set to width `100%`, display `flex`, justifyContent `center`, padding `24px`. Card was inserted **into that selected section**, not as an artifact-root sibling. Using its declared controls, heading became `Centered layout Card`, body became `Card inserted inside the managed HTML section.`, and variant became `outlined`. Its existing wrapper width was set to `320px`.

| Managed element | Stable identity |
| --- | --- |
| HTML section/container | `node_fefe06c8-170c-43d4-9375-4aedc6bc8613` |
| Card layout wrapper | `node_81f0974c-91e0-4a21-9806-ac500570b76e` |
| Card instance | `node_d95aad5c-5eb2-4088-8890-a6b13e0fa620` |
| Card component reference | `cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1` |
| Body text node | `node_d019348f-2f8c-4e32-b8ae-67e17e6f42ed` |

The native Card rendered through the existing design iframe with its saved heading/body and a real shadow root. DOM measurements confirm its wrapper is a child of the SECTION with computed flex display, centered justification and 24px padding.

| Saved revision | Requested Card width | Rendered wrapper width | Horizontal center difference |
| --- | --- | --- | --- |
| Initial | 320px | 319.9875px | Approximately 0.000012px |
| Adjusted | 480px | 479.99997px | Approximately 0.000012px |

After the initial Save/Reload, the Card width control still showed `320px`. It was then changed through that same control to `480px`, saved and reloaded; the settled control and metadata both showed `480px`. Container rules, node identities and Card content remained stable. The larger native rendering remained centered. No source textarea edits were used to construct or lay out this composition.

One intermediate verification read after Reload captured the HTML source view when metadata was expected, causing a JSON parsing error in the verification expression. The raw capture is preserved as `failed-480-source-selection-read.txt`; the settled selector was then read again, and a normal server response independently confirmed the 480px metadata. No invalid metadata was saved and no product blocker was inferred from that read timing.

### Saved revision and HTML integrity

Normal authenticated browser reads used the existing saved-role endpoint and existing `preview=1` endpoint with the expected saved hash. Their sources/metadata matched the editor after Reload; the actual design iframe rendered the same identities, values and measured layout. No fixture callbacks or network interception substituted for this normal-session evidence.

Initial saved and Preview revision hash:

`ac4235eaf56ebda9745e44f9b67fecbbf1fba7c304de388b61b8955a09de0a4d`

Adjusted saved and Preview revision hash:

`8e2dda14324e52a2897ced2a36382d8497d6b83c4f6cc5cc68da28a95b3edbdb`

Raw HTML SHA-256 is identical before/after both Reloads and across the width change:

`cc3cd31130ce4d42e4ad88c25f5e3ae43cd8e46174eb1de3ebcd9d2068d60604`

Only the existing layout metadata changes between those two saved revisions. The authored CSS role remains empty. Saved HTML, metadata, complete normal response bundles and hash comparisons are retained under the evidence directory.

## Scoped verification

Final scoped run: `evidence/v1-layout-composition-20261027/run-1793117455314`.

- **Four source tests** pass for owner Save/Reload, HTML literals, compatibility preservation and conservative identity/content refusal.
- **Two extended actual-editor fixture workflows** pass with autosave disabled/enabled. They select a managed HTML section, configure its existing flex layout, insert Card inside it, set wrapper width to 320px, Save/Reload, adjust to 480px and Save/Reload again. HTML remains unchanged across the layout-only edit; bundle hash changes; layout values and identities persist. The actual existing runtime emits the 480px CSS and retains the container relationship. Existing Panel and saved-only/error-feedback tests also remain passing as regressions; Panel nesting is not exercised.
- **Four pure layout-CSS cases** pass: base container/child rules, existing tablet/mobile media rules, unsafe-value refusal and unsupported-property refusal. The helper executes the exact pure declarations extracted from the actual runtime source, excluding native-registration imports; full actual runtime/native rendering is separately exercised by fixture/browser tests.
- **Zero strict scoped typecheck diagnostics** for actual editor/preview and shared source/runtime contracts. No new production code was introduced. `git diff --check` passes.

The fixture DOM has no geometry and uses the recorded scroll/iframe bridges inherited from the accepted harness. Only normal Chrome supplies the rendered-width/centering measurements above. The scoped runner's `realBrowserWorkflows: 0` describes that isolated run, not the separate normal Chrome proof. There were no failed scoped runs or automatic retries. The inherited unused native-loader IIFE/import.meta warning is retained and not exercised.

## Preservation, files and limitations

Evidence is under `evidence/v1-layout-composition-20261027`: baseline/source snapshots, saved/reloaded HTML, both layout metadata revisions, authenticated response/hash proofs, normal DOM/geometry summary, 320px/480px screenshots, the intermediate read capture, scoped admissions/inputs/graphs/results and final Page snapshot. Screenshots and summaries exclude session secrets.

`preservation-and-hashes.json` confirms all 17 baseline files are unchanged, including all files of `v1-card-panel-smoke` and `v1-two-component-20261027`. Source hashes and HEAD are unchanged. Historical reports/inventories and pre-existing refresh-scheduling changes were not rewritten or reclassified. Only the fresh Page and normal owned development coordination/catalog/Save writes were exercised. No foreign-lock cleanup, journal replay, protected recovery, Component-store edit, permission change, Windows work, commits or pushes occurred.

Changed files comprise the six files of the newly created Page, verification support (`scripts/verify-layout-composition.mjs`, three files under `tests/layout-composition`), this report, evidence and exact inventory. **No existing product source file changed.** Exact path/size/SHA-256 inventory: `docs/architecture/v1-layout-composition-files-20261027.json`; only its self-entry is unhashed.

Limits: the normal-browser proof covers this one HTML-container/Card base layout and width adjustment. Tablet/mobile controls and CSS generation were inspected/tested, but alternate viewport rendering was not qualified. Panel content/nesting, broader component composition, grid layouts and production/restricted Saved Preview remain outside this proof. The previously deferred normal unsaved-draft check remains deferred and unaccepted; settings/authority were not changed to enable it.

Recommended next step: review this bounded result. If accepted, an independently authorized check of one existing tablet/mobile override would be a small follow-up; no architectural mechanism is indicated by this workflow.

Stop: **V1 Page Builder — Layout and Composition Acceptance Review Gate**. Acceptance/closure requires a separate decision.
