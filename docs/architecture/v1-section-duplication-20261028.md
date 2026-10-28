# V1 Page Builder — Content-Only Section Duplication Acceptance Review Gate

Date: 2026-10-28. **Implemented; normal-browser supported workflow passed. Submitted for review, not accepted or closed.**

## Implementation and admission

`packages/visual-artifacts/src/duplicate-section.ts` adds one shared source/layout helper, exported through the existing barrel. `editor.ts` adds Duplicate section to the existing controls and applies its complete returned file candidate through one existing editing-lifecycle edit. The helper has no IO or persistent identity map and does not mutate its inputs.

Selection must identify an explicitly balanced, managed Page-root section, optionally inside its own existing outer layout wrapper. The copy is inserted immediately after the original under the same parent and its section is selected. Each included node/wrapper gets a fresh collision-checked ID; generation retries are bounded and failure changes nothing. Original source bytes remain intact. Existing Component references are retained rather than duplicating definitions. Existing Base/Tablet/Mobile layout entries are deep-copied onto new IDs in the same `.visual.json.layout`; original entries remain unchanged.

Content-only admission is deliberately conservative across the Page: only known literal HTML and the admitted typed native Card, supported literal attributes and known literal layout-rule shapes. The Card allowance is limited to heading/label/variant/density/disabled/css-class/aria-label and default managed content, intersected with its declared attribute contracts. Reference/action-bearing Card fields are refused. Named-slot composition is not admitted by this increment.

Dynamic/unknown Page metadata, composition/Shell contracts, bindings/events/conditions/repeaters/modes/forms/onLoad/state, nonempty fixtures, custom CSS/functions, manual/malformed/duplicate source, ordinary HTML IDs, fragment references, reference-bearing ARIA/label/directive attributes, Regions/slots/menus/branding and unsupported components are refused before returning any changes. Empty functions or generated `export {};` boilerplate are supported. Shared URL/component/artifact validation applies before and after cloning. Strict admission is not a general sanitizer or compatibility framework; no automatic repair or migration occurs.

## Normal Chrome evidence

The operator restarted the admitted regular-terminal development command in `C:\Projects\Modular\v1-normal-smoke-20261026-01\ui-platform`, preserving the existing environment and using its existing disposable Vite cache option. UI http://localhost:5374/; API http://localhost:4390/. Used Application Admin (admin@example.local) through the existing development selector, Application `v1-identity-fixture`, permanent owner `dev-v1-identity-fixture`.

Fresh Page created through the normal dialog: `v1-section-duplication-20261028/page.visual.json`, route `/v1-section-duplication-20261028`, artifact `art_59e29f04-2f61-4af3-8cd8-d99a4c79df29`. Accepted Pages were not edited. Source textareas were read for evidence, never edited to create/duplicate content.

| Check | Observed result |
|---|---|
| Initial section | Ordinary insertion/property controls created heading, paragraph, native Card/body and Base 24px/Mobile 12px section padding; explicit Save completed. |
| Duplicate/placement/selection | Duplicate section created a new adjacent section and selected it. Original and copy each have eight managed nodes; all sixteen IDs are unique, with no original ID reused by the copy. |
| Original/source/definition | Final HTML retains the entire original Page source as an exact prefix. Both saved Card instances reference the same `cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1` definition. |
| Initial copied layout | Copy initially matches original Base/Mobile rules exactly. |
| Undo/Redo | One ordinary Undo restored exact pre-duplicate HTML and metadata, removing copied layout entries. Redo restored exact duplicate HTML/layout and the same fresh IDs/selected section. These were ordinary immediate editor actions before the later Save, without changing or suppressing autosave. No post-Save history guarantee is claimed. |
| Independent edits | Copy heading/paragraph/Card heading and padding were changed through ordinary controls; original content and 24px padding stayed unchanged. Copy has 40px Base padding and retains its copied Mobile rule. |
| Normal refusal | Selecting a Card rather than a section and clicking Duplicate section reports an understandable refusal; HTML and metadata remain unchanged. Broader unsupported-reference refusals have focused fixture evidence. |
| Save/Reload | Explicit final Save completed. Reload returned byte-identical final HTML and equal metadata. Original/copy membership, identities, content/order/layout persist. |
| Saved Design Preview | Ready status; actual Chrome DOM contains original then copied section, correct heading/paragraph/Card values, native Card shadow roots and measured section padding 24px/40px. Renderer consumes definition references; source/normal saved responses, rather than a retained DOM attribute, prove definition reuse. |

Original section ID: `node_58c7e0a2-42e2-4955-9dbf-1041302fab39`. Copied section ID: `node_af222942-36b0-4174-8188-58a0376d8bb9`.

Original Card ID: `node_0cf717ca-480d-493d-8651-0cd8b2e56f52`; copied Card ID: `node_3865f2f8-b2a4-480d-9f80-f9097b11c455`. All eight original/copied IDs are in `normal-proof.json`.

Original values remain “Original feature”, “This content belongs to the original section.” and “Original Card”. Final copy values are “Copied feature”, “Only the copied section changes.” and “Independent copied Card”. Card body content is retained in both.

Normal authorized saved-role and expected-hash Preview responses both report:

`f91912a4a2816698aac54586fe15c3cbdb93a0ffb0d17bde0060e28021691b8c`

HTML/metadata match between responses; reloaded editor HTML matches saved source. Reads used the existing `/api/apps/v1-identity-fixture/visual-pages` endpoint with this locator, then `preview=1` and that expected hash. No fixture session/authorization callback supplied normal proof. The temporary read tab closed; the saved Page remains open. Evidence is actual DOM/source/history/geometry, without a screenshot claim or another image/heading/responsive campaign.

## Focused tests and build

Final run: `evidence/v1-section-duplication-20261028/run-1793193823325`.

- Four source tests pass for exact original bytes/input immutability, managed Card/content and layout duplication, ID uniqueness/collision retries/refusal, outer-wrapper placement, literal link/image attributes, deep layout independence, unsupported behavior/references/Card action fields, unknown layout-schema refusal, malformed/manual/non-root source and shared unsafe-URL refusal.
- One actual-editor disposable-service workflow passes for automatic selection, copied layout and fresh IDs, one-step Undo/Redo including layout, independent Card/layout edits, atomic refusal, actual Save/Reload and existing runtime two-section output.
- Strict scoped typecheck: zero diagnostics. Existing shared package build and diff whitespace check pass. Actual VisualArtifactService and guarded disposable Foundation role operations use recovery refusal; fixture admission callbacks are explicitly nonproduction and are not browser proof.

The first retained run failed in a new test-only metadata reader: it attempted to read an unsupported lifecycle current value and parsed HTML as JSON. The reader was corrected to use existing source-role controls; product code and assertions were not weakened. Subsequent retained runs tighten Card reference admission and layout schema refusal. The final layout-shape refusal guard was added after the successful normal supported flow and is covered by the final actual-editor/source tests; that additional negative case was not separately exercised in Chrome. Supported normal inputs are known literal Base/Mobile rules and unchanged by that guard. An initial Chrome sign-in locator timed out during startup; inspecting the ready UI then using its existing selector succeeded. No owner/hash/permission/recovery failure occurred in the authorized Page flow. The inherited unused import.meta/IIFE warning remains retained.

## Preservation and exact inventory

All 37 previously existing Page files remain unchanged. Of 45 baseline entries, only the intended original editor/barrel/test-barrel and disposable editor differ; the other 41 are unchanged. Existing heading/URL/runtime source, application-header main.ts/styles.css and polling/focus-refresh code remain preserved and unexpanded. HEAD comparison is recorded; no commits or pushes.

Evidence under `evidence/v1-section-duplication-20261028` contains baseline/pre-edit snapshots, deployment snapshots, exact test inputs/admissions/graphs/results and failed attempt, ordinary browser source/layout/history/refusal/identity/DOM proof, normal saved/Preview bundles, final Page snapshot and preservation checks. Historical reports/evidence/inventories are not rewritten.

Exact inventory: `v1-section-duplication-files-20261028.json`. Logical product changes: new shared helper, existing shared barrel and editor; matching disposable/generated copies. Support changes: existing test barrel export, heading-derived focused runner/harness plus duplication source tests. The inventory also lists report, new Page and evidence; its own hash is omitted.

No new renderer, instance/layout store, controller, identity registry, history mechanism, publication/activation system or generic reference remapper. No I-AM, permission, setting, autosave, recovery, Windows-security, restricted Saved Preview or production change. Normal-browser unsaved-draft protection remains deferred and unaccepted. Unsupported Pages receive refusal rather than automatic conversion.

Stop: **V1 Page Builder — Content-Only Section Duplication Acceptance Review Gate**. Recommended next action is review of this bounded evidence, not broader implementation. Acceptance/closure requires a separate user decision.
