# V1 Page Builder — two-component normal-browser verification

Status: **V1 Page Builder — Two-Component Normal-Browser Acceptance Review Gate**. Submitted for review; no acceptance or closure is declared.

## Result

The normal Chrome workflow passed for one new disposable Page: Create → insert sibling Card/Panel → independently select/edit supported fields → authorized Save → Reload → native saved Design Preview. Moving Panel before Card, Save, Reload and Preview also passed. The previous smoke Page is unchanged.

The stable unsaved-draft normal-browser experiment was **not performed**: the current Application Admin cannot disable the enabled two-second autosave. No timing race, identity switch, grant change or authority bypass was attempted. This limitation is documented rather than substituted with fixture success.

## Baseline and pre-existing differences

Before source edits, `evidence/v1-two-component-browser-20261027/baseline.json` captured 12 files: three original client sources, their three disposable copies and all six files of the previous `v1-card-panel-smoke` Page. Original HEAD was `57a69387a580d6e6601defe7268be08e124ba4ee`. Nonmutating inspection of admitted coordination roots found no retained lock/recovery/pending-journal condition.

Both pre-edit editor copies had SHA-256 `0df13c562132b249fb29b25dd0e6a2deb8a67dc26da63b632e6c9fd66ea58be6`. They already differed from accepted Design Preview Button snapshot `373817170ea7f0acd4897b50a02a82ee7dd2a384f6afcf02e7cea2125250bd31`: workspace-hosted editors no longer start a three-second timer; standalone editors retain it; window focus refresh and disposal cleanup were added. Those changes were preserved, not overwritten/reverted, and are not retroactively included in Design Preview Button acceptance. `pre-existing-refresh.diff` and the exact pre-edit snapshots record this reconciliation. Scoped comparisons prove this increment adds only the intended wording changes to that editor baseline.

## Normal environment and authority

Used the already running Chrome session at **http://localhost:5374/** and existing API **http://localhost:4390/**. No server startup or environment/security probe was repeated.

- Source: `C:\Projects\Modular\v1-normal-smoke-20261026-01\ui-platform`.
- Application: `v1-identity-fixture`, permanent owner `dev-v1-identity-fixture`.
- Principal: **Application Admin (admin@example.local)** through the existing development identity/I-AM session.
- New Page: `v1-two-component-20261027/page.visual.json`, route `/v1-two-component-20261027`, artifact ID `art_118018ee-5b6b-47e4-96bc-d98ffde987ed`.
- Existing Page `v1-card-panel-smoke` was not edited, saved, repaired or migrated.

Creation and editing used normal UI controls and their existing authorized endpoints. Hash proof used normal authenticated browser GETs to the existing saved-role endpoint and the existing `preview=1` expected-hash revision endpoint. Responses had the same saved source as the editor after Reload. The actual design iframe independently rendered those same node IDs/values. This was not network interception or a fixture/session callback substitute. No cookies, CSRF tokens or session secrets are stored in proof artifacts.

## Observed workflow

| Step | Normal-browser result |
| --- | --- |
| Create Page | Visible Page name/route/Shell labels; created fresh Page with unique route; permanent identity assigned by existing service. |
| Add siblings | Card and Panel inserted at artifact root using the existing picker/button; wrappers and child IDs assigned by existing source helper. The Page's initially generated empty section remains unchanged. |
| Select/edit Card | Heading `Two-component Card`, body `Saved Card body in the two-component workflow.`, footer `Card footer saved`, variant `outlined`. Actual declared property controls used. |
| Select/edit Panel | Variant `outlined`, density `compact`, independently selected through Structure. Its installed legacy contract declares **only these two settings**, no body/heading or public insertion slots. No Card-like contract or nested composition was invented. |
| Save/Reload | Waited for Saved status; source before/after Reload was identical. Selecting each component again showed its saved properties/content. |
| Design Preview | Both `uib-card` and `uib-panel` had actual native shadow roots, correct IDs, properties and DOM order. Card heading/body/footer visibly rendered. Panel rendered as an empty outlined compact native panel, matching its available contract. |
| Reorder | Selected Panel; used **Move layout item up**. Order changed from Card → Panel to Panel → Card, retaining component/wrapper/content IDs. |
| Save/Reload/Preview after reorder | Source remained identical across Reload; normal saved revision and native rendering retained the new order and values. |
| Unsaved protection | Not exercised normally: settings showed enabled autosave, disabled toggle and Save settings, and “Only Platform administrators may modify settings.” No denied mutation was attempted. |

The initial automation fill operation did not commit change-driven text fields; the source was inspected and ordinary keyboard typing plus blur was used successfully before the confirmed saves. This was not treated as a reproduced product defect. Existing autosaves may occur during ordinary editing; final explicit Save Now and settled normal saved reads establish the recorded revisions. No owner/session/permission/hash/recovery error occurred in the Page workflow.

### Identities and hashes

| Instance | Stable node ID | Component reference |
| --- | --- | --- |
| Card | `node_0b12d213-1aa2-406b-bc4f-974aed2be630` | `cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1` |
| Panel | `node_4db07aad-8520-4aa4-a990-8794811135af` | `@ui-base/ui:uib-panel` |

Initial normal saved bundle and Preview revision hash both equal:

`d46ed59fc3abee397eaf88cd75811be3ec1039afab451507431752ea2a733e96`

After reorder, normal saved bundle and Preview revision hash both equal:

`fd93462f9867bc3cf754cbeddd506e4e27e1b4bd5580adee770ab7309dbcd4c2`

These are existing complete-role bundle hashes, not raw HTML hashes. Raw HTML SHA-256 before and after initial Reload is `02ff58149e148077fcc6a41a96f8feff6735a96f994659f12d2bf6ec961aa64d`. Reordered HTML before and after Reload is `3fd8aac18bd944d034533beaa48c459be6e8cb311194dd0c413f2d8e5cdc5bdd`. Only order changes between those two revisions; membership and values persist. Full source, normal response bundles, DOM proof and summaries are retained.

## Minimal source changes

Three logical product files, plus their matching disposable copies:

1. `src/client/visual-artifacts/creation.ts`: visible/accessible Page name, Page route and Page Shell labels; existing name-format help. Existing validation and name/route/Shell return contract retained; non-Page fields remain hidden.
2. `src/client/visual-artifacts/editor.ts`: explains where insertion occurs and that navigation inspects definitions; button now says **Insert selected item**. No event, selection, lifecycle, property or refresh behavior changed.
3. `src/client/builder-workspace/shell-view.ts`: adds help distinguishing artifact/definition navigation from inserting a Page instance.

No new functional product defect was reproduced requiring a correction. No component implementation, parser, renderer, server, source ownership, permission check, saved-hash verification, storage/recovery contract or package mechanism changed. HTML remains authoritative for instances and literal properties; no duplicate instance store or property framework was added.

## Scoped regression and typecheck

Final run: `evidence/v1-two-component-browser-20261027/run-1793115233436`.

- Five creation/label/preservation cases pass using the actual creation adapter: visible/accessibility labels; invalid names refused; unchanged creation return contract; hidden non-Page fields; cancellation without creation.
- Exact source comparisons prove only intended wording changed in editor/shell view, preserving the pre-existing polling/focus changes. Shell-view full source parses; its unchanged TypeScript behavior was not separately subjected to a full dependency-graph typecheck.
- Four source tests and two actual-editor fixture workflows pass with autosave disabled/enabled, including existing Card/Panel Save/Reload/native Preview, saved hash, unsaved-draft refusal and actionable Preview failure feedback.
- Strict scoped typecheck has **zero diagnostics** for the actual editor, creation adapter, preview client and shared source/runtime contracts. Test-only unused service boundaries remain explicit. These fixture results supplement, not replace, the normal-browser proof above.
- The first retained run `run-1793115196435` failed because happy-dom lacks the browser's Option constructor. The same test-only Option adapter already used by the accepted harness corrected that environment gap. No product logic was changed or safety assertion weakened. Both attempts and raw outputs are retained; zero automatic retries. The existing unused native-loader IIFE/import.meta warning remains recorded.

## Evidence, preservation and limitations

All evidence is under `evidence/v1-two-component-browser-20261027`: baseline and source snapshots, creation screenshot, normal saved/reloaded HTML, authenticated response bundles/hash proofs, native DOM/order summaries, before/after reorder screenshots, autosave authority screenshot/result, regression inputs/graphs/results, final Page snapshot and preservation hashes. Screenshot crops exclude session-context diagnostics.

`preservation-and-hashes.json` confirms all six files of the previous smoke Page are unchanged and records HEAD comparison and exact pre/post source hashes. Historical acceptance reports, raw evidence and inventories were not rewritten. Only the new Page and expected ordinary development coordination/catalog writes occurred through existing services. No protected Component state was edited and no journal replay, lock recovery, repair, Windows-security work, production activation, commits or pushes were performed.

Exact file inventory: `docs/architecture/v1-two-component-browser-files-20261027.json`, including original/disposable product sources, the new Page files, support/tests/report and evidence. Pre-existing differences are retained explicitly in the baseline and refresh diff. Only the inventory's self-entry is unhashed.

Remaining limitations: normal unsaved protection remains unverified under the current principal; Panel has no declared content-editing contract; this increment does not qualify nesting, responsive composition, additional components, restricted Saved Preview or production activation. Existing nonblocking layout/slot warnings were not redesigned.

Recommended next step: review this bounded result. To finish the normal unsaved-draft check, separately authorize use of an already permitted Platform-admin autosave setting, or decide whether a narrowly scoped ordinary draft-control change is needed; do not add permissions just to make the test pass. Panel content-contract work should be a separate explicit decision if required for V1.

Stop: **V1 Page Builder — Two-Component Normal-Browser Acceptance Review Gate**. Acceptance/closure requires a separate user decision.
