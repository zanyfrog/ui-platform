# V1 Page Builder — Guided Composed-Page Content Authoring Acceptance Review Gate

2026-10-30. Implementation and bounded verification submitted for review. **Not accepted or closed. No commits or pushes.**

The authorized guided authoring increment is implemented with the existing HTML, managed-node, Shell/Region, destination and saved Design Preview contracts. The new Services Page completed the normal-Chrome authoring and saved Preview workflow. The existing disposable website host returns “Page not found” for `/services`; no new route qualification or host-profile change is claimed. Screenshot collection failed, so browser evidence is retained as direct DOM/accessibility observations and source/revision proofs rather than screenshots.

## Implementation

- The Page editor identifies the selected saved Shell uniquely and resolves its actual main Region from the existing `region-main` identity or a Region container with semantic `main`/`role=main`. Display labels never determine identity. Missing, duplicate, malformed or multiple candidates refuse with an explanation. Invalid or ambiguous Shells refuse.
- New composed Pages continue inheriting the Shell default with no override. “Use shared Shell default main content” creates nothing. “Create Page-specific main content” explicitly invokes the same Add Region helper used by advanced Add Region, validates Region membership and uniqueness, allocates one managed container and selects it. Existing overrides are selected without replacement. Shared source is never mutated.
- Add Heading, Add Paragraph and Add Link buttons always insert through the existing HTML insertion handler into the Page-owned main Region. Existing Structure, text, heading-level and href controls edit the resulting managed nodes. No placement/properties JSON, renderer or content model was added.
- Saved Page destinations are available to composed Page content links. The picker offers canonical static unique paths with valid saved metadata and, for composed targets, a real Route identity and uniquely available valid Shell. It persists literal href. Parameterized routes remain an advanced concrete-link concern, not a guessed picker destination.
- Source review confirmed `prepareVisualCandidate` already invokes `validatePageLinks(..., {allowComposed: !!definition})`, then validates the complete composition/dependencies and rechecks captured sources. The client uses that existing composition-aware link validator for composed Page edits. Plain-Page filtering behavior and shared Menu behavior remain unchanged. Server authority remains decisive.
- “Saved Design Preview” is the ordinary Page action. Guidance explains saved content, saving before Preview, fixture testing and restricted readiness. The readiness label explicitly says “Restricted.” Preview feedback records the revision opened by that iframe, rather than implying that the editor revision tracks later navigation. Existing revision transport, source checks, iframe and lifecycle remain unchanged.

## Normal Chrome evidence

Application: `dev-v1-identity-fixture`, existing Builder at `http://localhost:5374/`. All authoring used normal controls. No direct file or browser-script content mutations were used for the demonstration.

1. Create Page → `services`, `/services`, Application default Shell. First attempt reported Windows EPERM on the staging-folder rename. One ordinary retry succeeded without permission, recovery or security changes. The service cleaned its failed staging folder; no hidden creating directory remained when inspected.
2. Services initially contained only the existing no-override HTML comment. `normal-default.txt` records the inheritance explanation and disabled insertion buttons; `page.html` and `page.visual.json` in the evidence root are the original creation snapshot. “Use shared Shell default main content” left source unchanged. `normal-inherited-preview.txt` records the inherited Shell rendering. The accepted main Region default is empty; surrounding header/Menu/footer remain visible.
3. Enter on “Create Page-specific main content” created and selected `node_a6da1338-fbf8-4935-b305-d0a8b77cec09`, with actual identity `region-main` and label “Main Content.” `normal-explicit-override.txt` records the explicit override and selection.
4. Add Heading/Paragraph/Link created Services, “Explore our website services.” and “Contact us.” Selecting saved Contact persisted `href="/contact"`. `normal-authored.txt` and `saved-services.json` retain literal HTML. Keyboard text entry followed by Tab committed the ordinary change events; early automation fill attempts did not commit text and were corrected before final Save/Reload.
5. Save Now where enabled, editor Reload, and later full Builder Reload retained all seven managed identities, original artifact/Route identities and the one Region. Existing autosave also ran according to unchanged settings; no claim that every intermediate save was manual. `normal-saved-services-preview.txt`, final observations and `revision-proof.json` establish saved output.
6. Saved Design Preview rendered Services and the literal Contact link. Enter navigated to Contact and focused its heading. Browser Back restored Services; Forward restored Contact. Parent remained `http://localhost:5374/`. See `normal-keyboard-contact.txt`, `normal-back.txt`, `normal-forward.txt`. The Alt+Left automation shortcut had no observable effect; only the subsequently successful browser Back/Forward operations are claimed.
7. A `/missing` edit in the href control refused with “missing, ambiguous or unsupported”; saved HTML remained `/contact`. `normal-missing-target-refusal.txt` retains the refusal and literal HTML. Reload restored the saved inspector. Final product feedback explicitly says “Opened saved revision”; `normal-final-preview.txt` captures that final wording.
8. Existing host `http://127.0.0.1:5188/services` returned “Page not found.” Host Home → About us → Contact worked with shared header/Menu/footer and proper Page headings; Contact navigation used Enter. See `normal-host-services.txt`, `normal-host-home.txt`, `normal-host-about.txt`, `normal-host-contact.txt`. The host was not restarted, modified or expanded to admit Services.

Services artifact: `art_02163a94-d76c-4b25-ac28-42ddc98999d7`. Route identity: `route_27e0fff6-0ca7-4865-91a6-5ab0a2267961`. Shell: unchanged `art_a8ca1455-8234-424c-ac66-6480701267f1`.

Saved Services revision is `7f7e9f23f6cd4b467a1637d77349a7e4ecccab34d45c62f6a988f937f1a466f8`. Recomputing SHA-256 of JSON.stringify(files) in service role order matches the actual normal-Chrome iframe revision. Original creation metadata bytes equal final metadata bytes. Contact navigation used existing revision `2dd519468e79167c9cd771848dbd6bc412a372274fbd960c04da5113efee10d5`.

## Tests and builds

`node scripts/verify-guided-content.mjs` passed in `evidence/v1-guided-content-20261030/run-1793387743233/`:

- 34 collected unit tests: previous mixed/plain admission, anchor/link routes, uniqueness, missing/invalid targets, incoming-reference protection, composition dependencies and four guided main-resolution cases.
- Actual editor in isolated DOM: no silent override, explicit override selection, Heading/Paragraph/Link containment, saved Contact literal href, missing-target refusal, Save/Reload source/identity preservation and Preview opened-revision metadata. `guided-editor.json` retains source, managed IDs and transport calls. In-memory transport is explicitly a fixture, not production authorization or filesystem proof.
- Existing actual runtime navigation and saved Preview lifecycle fixtures, including revision refusal, disposal, Reload and Back/Forward.
- Strict scoped typechecking: zero diagnostics.

Visual package build, client production build and server no-emit typecheck passed. Broader client typecheck still reports seven pre-existing diagnostics: six missing declarations in fixture/native Preview imports from sibling ui-base, and the existing main.ts string-or-boolean diagnostic. Raw logs are retained. Legacy suites that previously failed collection were not rerun and are not represented as passing. Bundling warnings about import.meta in pinned native test inputs remain retained.

The initial editor fixture failed because isolated DOM lacked Option; a second instrumentation attempt had a syntax error. The fixture now supplies Option as existing harnesses do. All failed logs and run directories remain preserved. The initial unavailable Windows Python launcher and denied process-inventory probe caused no product changes. Browser screenshot attempts timed out at Page.captureScreenshot; native screenshot fallback timed out awaiting app access. No screenshot exists for this increment and no screenshot success is claimed.

## Preservation and exact inventory

`baseline.json` captured 403 original Application/historical-evidence files before authoring. `preservation.json` records one changed original: the Application's ordinary append-only operations log. All other captured files match, including the original thirteen Pages, accepted Shell/Menu, settings and package declaration. The ten unrelated plain Pages remain byte-identical; Home/About/Contact remain byte-identical. Historical shared-composition evidence remains unchanged. No shared/native Card/Panel input, host configuration, permissions, recovery state or Windows security was edited.

`files.json` is the exact hashed inventory: three product sources, three matching disposable-client copies, verification runner and three supporting test files, this report, source differences, all new evidence, all new Services role/index files and normal operation-history additions. Original reports and source snapshots remain preserved. Build-output files are listed separately as regenerated outputs, without claiming every output differs from its pre-build bytes.

## Remaining limits and stop

Normal Chrome demonstrates the requested create → explicit override → content/link → Save/Reload → saved Design Preview path. Missing/ambiguous main Region behavior is tested in focused fixtures, not by damaging the accepted shared Shell in Chrome. Screenshot evidence is unavailable. New `/services` website-host admission is unqualified; the current host refused it. No new host qualification, Publish workflow, draft protection, image picker, styling system, template, data store, framework, settings/permission/recovery changes or acceptance declaration is included.

**Stop: V1 Page Builder — Guided Composed-Page Content Authoring Acceptance Review Gate. Separate approval is required for acceptance or closure.**
