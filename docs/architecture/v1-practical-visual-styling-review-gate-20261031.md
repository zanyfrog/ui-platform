# V1 Page Builder — Practical Visual Styling Review Gate

2026-10-31. **Read-only assessment. No styling implementation, browser authoring or new qualification performed.** Image and Asset Selection is separately accepted and closed.

Recommend one bounded **Appearance and Layout inspector for selected managed HTML content**: expose color and typography through the existing Page stylesheet, and make the already supported layout controls understandable. No new framework, renderer, theme engine, layout model or appearance JSON is needed.

## Concrete existing contracts

| Author need | Existing capability and authority | Practical gap |
| --- | --- | --- |
| Background/text colors | Page `css` source is already editable (`src/client/visual-artifacts/editor.ts:115`), saved as the existing CSS role and mounted inside the artifact shadow root (`packages/visual-artifacts/src/runtime.ts:291`). CSS classes are editable through setNodeAttribute (`editor.ts:348`). | No selected-HTML color picker, palette or clear/inherit control. Authors must write CSS and understand selectors. |
| Font size/weight and text alignment | Ordinary Page CSS supports these declarations. Heading semantics H1–H6 already have a dedicated control; changing heading level preserves managed identity (`source.ts:168`). | No ordinary HTML font-size/weight/text-alignment inspector. Semantic heading level is not a visual font-size setting. |
| Padding/margins/gaps | Existing wrapper-keyed `metadata.layout` supports margin, padding and gap (`model.ts:21`); the inspector already edits them (`editor.ts:452`). | Raw property names and unrestricted text boxes require CSS knowledge; no clear presets, units or inheritance explanation. |
| Width/container alignment/responsiveness | Existing width/height, display, grid columns/span, flex direction, alignItems and justifyContent controls. `layoutCss` emits base, tablet ≤1023px and mobile ≤639px rules (`runtime.ts:39`). | No readable “Full width”, “Row/Column”, alignment choices or responsive override/reset guidance. `flex` exists in the model/runtime but is not among the inspector's fields. max-width is not an existing declarative layout field. |
| Site defaults | `app.settings.json` has existing `--app-*` theme variables and siteStyles. `themeCss` validates variable names/values (`composition.ts:49`); composition manager lists stylesheets and edits existing theme entries (`composition-manager.ts:102`). | The interface exposes variable keys/raw values, not an ordinary Page-author design panel. Presentation permissions are separate from Page editing; global edits affect other consumers. |
| UI Base appearances | Qualified public manifest describes Card variant elevated/outlined/flat, density comfortable/compact, cssClass, parts and `--uib-*` custom properties. Card Definition settings already route through the generic inspector's contract-driven controls (`editor.ts:398`). | Package-specific capabilities are not universal HTML controls. Legacy presentation records are explicitly unavailable without declared direct mappings (`editor.ts:391`); Heading size/alignment and Panel variant/density records must not be advertised as automatically editable instance settings. |

Template evidence: `templates/standard/files/app.settings.json` declares colors, font family/base size, heading scale and spacing tokens. `styles/site.css` actually consumes text/background/primary/font-family/base-size variables; `shells/public/shell.css` consumes surface and spacing tokens. A declared token is not proof every component or stylesheet consumes it. The template's Page stylesheet already uses `var(--app-color-primary)` for h2.

UI Base assessment used the already qualified public manifest snapshot `tests/d6-p2/bytes/40aa778eb59a7fb06b3bb420d11798d351a201597b329ba8a6142b29f7052469.txt` (SHA-256 equals its filename). No protected native implementation/root was changed or newly executed. Its Heading size/alignment and Panel presentation records are availability descriptions, not a new instance-mapping qualification. Card's declared builder settings are the concrete editable precedent. `--app-*` and `--uib-*` are distinct contracts; no universal automatic token mapping was found or assumed.

## Scope and cascade constraints

- Layout targets an existing Builder wrapper: the selected wrapper itself or its immediate parent, not necessarily the selected text/Image node. Validation requires a real wrapper (`validation.ts:168`); insertion already creates managed wrappers (`source.ts:277`). A clearer UI must name/highlight the target, preserving Page Region containment and IDs.
- Composed mounting supplies theme/site CSS and combines Shell CSS with Page Region CSS (`composition-runtime.ts:36`). Runtime order is presentation CSS → artifact CSS → generated layout CSS, with ordinary specificity still applying. Existing layout rules can override equally specific earlier CSS; duplicate appearance/layout authorities would confuse authors.
- Plain saved Preview uses mountVisualArtifact with the Page's own CSS and the accepted asset resolver (`preview.ts:66`); it does not receive the composed theme/site-style injection. `createVisualPage` likewise selects the plain mount by membership (`runtime.ts:318`). Theme availability/parity must not be promised for plain Pages. Page-local literal CSS can support both Page types without a renderer correction.
- Artifact shadow roots isolate selectors. Nested Platform Components deliberately clear presentationCss (`runtime.ts:248`); native component internals require their public settings/parts/custom-property contracts. Broad descendant CSS must not be sold as a way to style every component.
- Normal saved CSS already passes the existing syntax/compiler checks (`src/server/visual-candidate.ts:13`), revision capture and Save/Reload lifecycle. Those checks do not supply a safe structured CSS editor or guarantee a valid value for every declaration. The next increment must preserve this admission path.

## Highest-impact missing controls

The largest gap is ordinary HTML appearance: authors can insert valid Heading/Paragraph/Image content but cannot readily choose a section background, readable text color, font size/weight or text alignment. Existing spacing/layout is powerful enough for useful pages, but its raw CSS terminology obscures it. A global theme redesign or an expanded component catalog would have a larger authority and permission footprint than addressing these two inspector gaps together.

## One recommended bounded increment

Add a compact **Appearance and Layout** inspector for selected, unambiguous managed HTML nodes in plain Pages or Page-owned composed Regions:

1. **Appearance:** Background color, text color, font size, font weight and text alignment, with small accessible choices, custom validated values and Reset/use stylesheet inheritance. Base appearance only initially; no new responsive typography/color system. Write only the selected node's controlled declarations into the existing Page CSS role using its stable `[data-uip-node="…"]` selector. No inline-style migration, appearance JSON, extra stylesheet registry or duplicate persisted properties.
2. **Space and layout:** Re-present the existing wrapper controls as readable padding/margin/gap, width, Row/Column/Grid, horizontal/vertical alignment and Desktop/Tablet/Mobile override controls. Map only to the existing metadata.layout fields and breakpoints; preserve their existing authority. Add useful literal rem/%/px presets rather than assuming Application theme variables exist on plain Pages. Keep advanced CSS/property entry available. Do not add max-width or a new responsive layout model in this increment.
3. **Explicit editing boundaries:** Show whether a field targets the selected HTML element or its existing layout wrapper. Keep Shell context locked, do not descend into component internals, and retain component Definition settings as a separate existing editing path. Never mutate a shared theme or Shell when a Page author changes a local appearance.
4. **Source preservation:** Treat Page CSS as the appearance authority. Use a narrowly delimited, readable rule area in that same CSS file for editor-owned declarations; preserve all unrelated stylesheet bytes. Do not rewrite arbitrary author rules, import computed styles as authored values, or silently remove advanced declarations/!important. When ownership/cascade is ambiguous, explain it and retain advanced stylesheet editing rather than guessing. Reset removes only an owned declaration/empty owned rule. Structured choices must validate values before forming CSS, then use existing complete-candidate save/validation.

This is one inspector improvement using two authorities already present: Page CSS for appearance, existing wrapper layout for spacing/layout. It does not add a second layout store or new per-instance JSON appearance authority. It can make a colored, readable, consistently spaced section practical without hand-authoring CSS, while retaining the current HTML-first model.

## Substantive implementation decisions and verification boundary

No fundamental runtime/storage blocker was found for this bounded recommendation. The material work is **safe, source-preserving CSS ownership and cascade handling**; it is not already supplied by the current CSS compiler. If targeted declarations cannot be edited without rewriting arbitrary CSS, stop and report that concrete limitation rather than introducing a general stylesheet engine. Do not implement a broad CSS parser/rewriter as a hidden dependency of this increment.

Plain/composed theme parity and styling component internals are genuine scope limits, not blockers for Page-local HTML controls. Defer global token editing, automatic --app/--uib mapping, new component appearance mappings, Shell redesign, pseudo-state editors, gradients/background images, new fonts/assets, responsive typography and production Publish/host expansion.

A later authorized implementation should verify source preservation, selected-node versus wrapper targeting, duplicate/manual/stale selection refusal, allowed/invalid values, Reset/inheritance/cascade behavior, unchanged IDs/Regions, existing layout breakpoints, Undo/Redo and Save/Reload. Demonstrate one disposable plain and one composed Page with actual saved Preview colors/typography/spacing, plus component/default-Shell preservation; retain existing permission, upload, screenshot and host qualifications. Unsaved-draft Preview protection remains outside scope.

Only this assessment and the separate acceptance-closure document were added. No product code or Application source changed, no builds/tests/browser authoring were performed, and no implementation is authorized by this recommendation.

**Stop: V1 Page Builder — Practical Visual Styling Review Gate. Await separate implementation authorization. No commits or pushes.**
