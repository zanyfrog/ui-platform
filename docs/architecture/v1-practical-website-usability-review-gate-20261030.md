# V1 Page Builder — Practical Website Usability Review Gate

2026-10-30. Read-only assessment; no implementation authorization or acceptance declaration.

The shared three-Page website works within its accepted boundary. The largest remaining authoring barrier is turning a newly created composed Page into editable content without understanding stable Region identities. The recommended next increment is a guided Page-owned content entry point plus the existing saved-Page destination control for composed Page content links.

## Evidence and method

This is a source-backed cognitive walkthrough using the accepted normal-Chrome observations, retained screenshot and operator reports from the Shared Website Composition submission. It is not a new live-browser test or a new host qualification. An attempt to locate the previous Chrome tab did not find that tab; no new browser success is claimed. No authoring controls were used to modify content during this assessment.

Evidence remains in `evidence/v1-shared-composition-20261029/`, particularly `normal-composed-about.png`, `normal-website-navigation-final.json`, `normal-shared-propagation.json`, `normal-narrow-viewport.json`, `normal-composed-preview-transcript.json`, `operator-frame-reload-final.json` and `saved-preview-revisions-final.json`. The original report and exact inventory remain unchanged. Acceptance closure is recorded separately in `v1-shared-website-composition-closure-20261030.md`.

## Nontechnical author walkthrough

| Step | Existing experience and contract | Practical consequence |
| --- | --- | --- |
| Create/select Application | The workspace exposes Application selection, dependency configuration and multiple artifact categories. Composition requires an enabled presentation contract, a real default Shell and admitted dependencies. | The tested configured Application is usable; a first-time author still has to connect several setup concepts. This review does not claim a newly tested Application-creation journey. |
| Shared Shell and branding | A saved Shell can be selected by name. Application presentation supports default Shell, Application branding, branding assets and existing stylesheets. Shell elements can bind to branding values. | Reuse works, but authors must understand the difference between configuring branding values and placing a bound element in the Shell. |
| Add/edit Pages | Creation accepts a name, public route and Shell. A new composed Page initially inherits Shell defaults with no Page Region override. Content insertion requires a selected Page-owned Region; Add Region asks for a stable Region ID. | A new author can create a Page successfully and then encounter an unexplained content-insertion prerequisite. Existing plain-Page adoption already creates the required containment; that does not solve the new-Page journey. |
| Shared Menu | The ordinary Menu editor offers named Page destinations and shared item editing. The accepted Home/About/Contact navigation and shared edits work. | This is a usable existing contract. Placement and the distinction between shared Menu items and Page-specific overrides remain advanced concepts. |
| Content, links and images | Leaf text editing and HTML element insertion exist. Composed Page content links expose raw href; the saved-Page destination picker is limited to plain Pages. Application asset upload exists, while an ordinary image uses raw src/alt fields. | Authors must manually translate saved destinations and uploaded assets into paths in otherwise ordinary content controls. |
| Save, Reload and Preview | Save Now and Reload/discard exist. The working Saved design preview is separate from Fixture demonstration and restricted Saved Preview readiness. | Actual operator confusion between these areas occurred during verification. Authors need clear direction to the working saved design view and a clear statement of which saved version they are seeing. |
| Website and narrow viewport | Accepted evidence demonstrates shared navigation, history, focus, scrolling and a 434px viewport. The retained About screenshot shows default browser typography and a vertical bulleted Menu. | Functional composition is established; polished styling and easy responsive authoring are not. The disposable website host is a verification surface, not a general Publish workflow. |

## Findings ranked by author impact

1. **High — new composed Page content requires technical Region knowledge.** `src/server/visual-artifacts.ts:105` deliberately creates no override; `src/client/visual-artifacts/editor.ts:138` prompts for Region identity, and insertion at line 487 refuses content outside a Page Region. Inheritance is correct, but the ordinary next action should explain and create a Page-owned content area explicitly. An empty override replaces the Shell default, so silently creating it would change meaning.
2. **High — Preview terminology obscures the working path.** The actual Saved design preview is in `src/client/visual-artifacts/editor.ts:540`; `src/client/builder-workspace/shell-view.ts` also mounts Fixture Preview and “Saved Preview · unavailable.” Retained operator questions demonstrate confusion, rather than merely predicting it. Clear labels and contextual guidance are warranted; enabling restricted Preview or changing draft protection is outside this recommendation.
3. **High — composed content links lack ordinary Page selection.** The href picker at `src/client/visual-artifacts/editor.ts:286` explicitly requires no Shell identity and filters destination choices accordingly. Shared Menu selection already demonstrates a named destination workflow. This is a control gap, not evidence that existing literal composed links or Menu navigation fail.
4. **Medium — image upload and image placement are disconnected.** Application upload/asset choices already exist in the workspace and composition manager, but the selected image inspector requires src text. Reusing asset choices would avoid manual path copying without introducing media storage or a new renderer.
5. **Medium — styling starts too close to source editing.** `src/client/visual-artifacts/composition-manager.ts:105` selects existing stylesheets and line 107 only edits existing theme entries. With the accepted empty theme, there is no initial palette to adjust. Raw classes and CSS layout values remain available, but they are a substantial barrier to a polished site. A visual result at 434px does not establish a 390px design or a responsive styling workflow.
6. **Medium — advanced operations compete with routine editing.** The editor presents source repair, recovery download, deletion, source files, raw tags and layout controls beside normal Save/content operations. Better progressive disclosure could reduce mistakes; it should preserve access and existing validation rather than alter permissions or recovery behavior.

## Recommended bounded increment

**Guided content authoring for a new composed Page.** Reuse the existing Shell/Region/Page model and HTML mutation controls:

- For the supported shared Shell, offer its real main Region by display name. Explain “Use shared default” versus “Write this Page's content.” On explicit selection of the latter, use the existing Add Region operation and select the resulting Page-owned container. Do not suppress inherited content without that choice, invent Region IDs, migrate other Pages or choose among ambiguous Regions silently.
- Make heading, paragraph and link insertion operate within that selected container, with a clear content-area label. Keep HTML and managed-node identities authoritative.
- Extend the existing saved-Page destination selector to admitted composed Pages and eligible saved destinations. Persist ordinary literal href values and retain existing route/reference/dependency validation. Reuse current composition-aware validation; do not merely remove the UI condition and assume the plain-Page validator is sufficient.
- Give this flow a clear action leading to the existing saved Design preview. Limit Preview work to labels/context and saved-version guidance; do not add a Preview lifecycle, host launcher or draft-protection policy.

The future demonstration should create one disposable composed Page, explicitly author its main content, add text and a selected Contact destination, Save/Reload, inspect its saved Design preview and navigate in the already qualified host where admitted. Verify Shell default inheritance before opting into an override, unchanged shared content, correct HTML/identities, existing missing-target/reference guards, matching saved revisions, keyboard use and navigation history. Preserve the accepted three Pages and unrelated plain Pages. This is proposed verification, not work performed in this assessment.

Image selection and initial styling controls remain valuable subsequent increments; including a media library, design system, template framework or Publish workflow would make this first increment unnecessarily broad. Existing templates and native components should continue through their current contracts, not become another rendering system.

No new architectural blocker is established. Region ambiguity and composition-aware link validation must be handled explicitly within the existing contracts during any separately authorized implementation. Existing validation limitations, restricted Publish qualification and all acceptance-closure qualifications remain in force.

## Exact assessment change inventory

Only two new documents were created:

- `docs/architecture/v1-shared-website-composition-closure-20261030.md`
- `docs/architecture/v1-practical-website-usability-review-gate-20261030.md`

No product code, accepted source, Page content, settings, dependency policy, authorization or recovery state was changed. No builds or tests were rerun for this documentation-only assessment. No commits or pushes were performed.

Stopped at **V1 Page Builder — Practical Website Usability Review Gate**.
