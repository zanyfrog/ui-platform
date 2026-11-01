# V1 Page Builder — Integrated Website Authoring Review Gate

2026-11-01. **Read-only assessment. No implementation or new browser qualification.** Appearance and Layout Inspector acceptance is recorded separately in its closure document.

Recommend one bounded increment: **make the saved Page → Preview → navigation handoff understandable and trustworthy**, using the existing saved Design Preview and save lifecycle.

## Existing complete workflow

This assessment combines source inspection with the accepted normal-Chrome evidence; it does not claim one new uninterrupted browser run containing every step. Sources include the guided-content, image-selection/explicit-plain, appearance/layout, multi-Page and shared-composition review reports and closures. Their raw observations and qualifications remain authoritative.

| Author step | Accepted capability | Remaining practical friction |
| --- | --- | --- |
| Create Page | Explicit Plain Page or existing default/selected Shell; mixed plain/composed validation and preserved identities. | Application setup and choosing shared versus standalone content still require understanding scope. Plain Pages do not inherit composed theme injection. |
| Add Content | Managed headings, paragraphs, sections and leaf text; explicit Page-specific main content for a composed Page, preserving shared defaults until chosen. | Structure selection, insertion target and immediate parent layout wrapper are distinct concepts. Routine authoring sits beside source/recovery and component-definition operations. |
| Add Image/Link | Application-image chooser, literal `src`/`alt`, decoded saved rendering for both Page types; named eligible saved-Page link destinations with literal `href` and reference guards. | Ordinary browser upload remains unverified. Choosing an existing asset works; a first-time author's own-file journey cannot yet be claimed complete. |
| Style | Accepted local appearance presets/custom values/reset and readable wrapper layout with existing breakpoints. | Conservative CSS refusals and native/shared boundaries require clear explanations. These are deliberate authority constraints, not a reason to silently override authored styles. |
| Save | Existing save state, Save Now, Reload/discard, validation/conflict handling and preserved saved identities. | Authors must distinguish current editor state, in-flight saving and an already open Preview snapshot. |
| Preview | Saved Design Preview renders actual saved plain/composed Pages, images and styles; saved hashes were checked against source bytes. | Retained observations include older-revision and blank/loading attempts before successful reopen. A revision hash and explanatory text alone do not give an ordinary author a clear “your latest changes are showing” signal. |
| Navigate | Accepted named-Page links, shared Menu, saved Preview navigation/history, focus and scrolling within admitted routes. | The Preview can move to a different saved Page while the Builder is still editing the original Page. That distinction should be visible without reading URLs or hashes. The disposable host remains bounded. |

## Top findings

1. **Highest impact: the save-to-Preview handoff lacks a simple freshness and location story.** The latest actual-browser evidence required waiting for Saved and reopening Preview after older-revision/loading observations. The editor already labels Saved Design Preview and explains it is saved content (`src/client/visual-artifacts/editor.ts`); this is a remaining status/interaction gap, not absence of a Preview feature. Authors need to distinguish saving, loading, ready, blocked and newer edits, and know which Page they are looking at.
2. **The core authoring controls are now sufficient for a bounded useful site, but finding the right target remains demanding.** Managed content, shared Regions, wrapper layout, native Definition settings and advanced source all have legitimate separate authorities. Progressive disclosure and target guidance would improve routine use; a replacement editor/model is not justified by this review.
3. **The asset journey has an evidence gap at the ordinary file chooser.** Existing-image placement is accepted, including actual decoding. Browser upload must retain its qualification until a supported normal-browser demonstration succeeds. This does not establish a product defect or justify an alternate uploader/security workaround.

## Recommended bounded next increment

**Saved Design Preview status and navigation context.** Reuse the existing Save Now action, saved revision capture, Preview iframe and navigation callbacks:

- Put a readable save/Preview state beside the existing Preview action: saving, loading, displaying saved changes, newer editor changes, or blocked with the existing reason. Make the normal next action clear. Derive freshness from existing authoritative state; do not infer success from button clicks or a stale frame.
- Make “Open/Refresh saved Preview” reuse the current saved-only entry point after the existing save has completed successfully. Do not silently discard edits, preview unsaved bytes, bypass conflicts or introduce automatic save policy changes. Whether an already open Preview protects unsaved drafts remains deferred.
- Show the actual Preview Page name/route and its mounted saved revision separately from the Page being edited. The current `preview.ts` posts a generic ready message after navigation, while the parent feedback uses its initially captured revision; source inspection therefore identifies a concrete context gap. Any richer message must retain origin/frame checks and report the successfully mounted result, including history navigation. This is a proposed change, not a newly reproduced product failure or correction performed here.
- Keep fixture demonstrations and restricted Preview readiness clearly separate using the existing labels; do not activate restricted Preview, launch a website host or add Publish.

This increment should change only presentation/state reporting and the existing saved-Preview action handoff. It needs no new renderer, theme system, storage authority, routing model or asset service. It should not auto-reload an author's open Preview in response to editing.

## Verification and blockers for a later authorized implementation

Demonstrate a disposable plain and composed Page through the full chain: create, add text/image/link, style, save, open Preview, navigate and return. Verify visible current Page/revision, actual decoded image/computed styles, matched saved bytes, keyboard access and frame-owned navigation/history. Include a delayed save/load and a refused save/Preview using safe focused fixtures; retain edits and last valid state, and prevent late responses from falsely reporting readiness for a different Application/Page. Verify source, permissions, shared content and recovery preservation. Do not manufacture failures by changing accepted Shells/Pages.

No fundamental architecture blocker was found for this recommendation. The substantive work is accurately deriving and correlating editor/save/frame/navigation state, especially asynchronous changes. Parent freshness must compare against the Page actually displayed, not blindly the editor's current Page hash. Ambiguous or unavailable state must be reported honestly. Existing unsaved-draft Preview protection requires separate scope/authorization and is not smuggled into this increment. Ordinary browser upload and broader host/Publish qualification remain independent limitations.

Only the separate closure and this assessment are added. No product code, Application content, settings, dependencies, permissions or recovery state changed; no tests/builds or live-browser authoring were performed. Historical evidence and inventories remain untouched. No commits or pushes.

**Stop: V1 Page Builder — Integrated Website Authoring Review Gate. Await separate implementation authorization.**
