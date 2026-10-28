# V1 practical website authoring — shared URL policy and editor implementation

Date: 2026-10-27. **Implementation tested; normal-browser three-section verification pending. Not accepted or closed.** The earlier blocked report and its diagnostic evidence remain unchanged.

## Implemented scope

Three logical product source files changed:

1. `packages/visual-artifacts/src/source.ts`: exports one `validateManagedUrlAttribute` policy and invokes it from existing managed `setNodeAttribute`. href/src/alt replacement recognizes existing uppercase spellings, avoiding a new duplicate on that ordinary edit. Existing identity/source admission and attribute escaping remain.
2. `packages/visual-artifacts/src/validation.ts`: uses the same policy for literal href/src on managed, nonmanual HTML a/img nodes. Existing normal candidate graph validation calls this validator before publication; no endpoint, authorization, saved-hash or recovery semantics changed.
3. `src/client/visual-artifacts/editor.ts`: Structure entries now indent by actual parsed parent chain and derive short summaries from existing region name, heading/alt, descendant heading or text. Node identity remains the option value and tooltip; no label data is stored. Managed generic a/img inspector fields edit href/src/alt through the same source helper. Manual/legacy selection handling remains.

No new renderer, component model, store or property framework. HTML remains authoritative for identities, containment, order, literal content and attributes; `.visual.json.layout` remains the layout authority. Pre-existing polling/focus-refresh code is untouched. Design Preview and production activation code are unchanged.

## Shared URL rules

- Anchor href: HTTP/HTTPS, mailto, tel, relative paths, query/fragment references. Image src: HTTP/HTTPS or relative paths; fragment/query-only image references refused.
- Explicit HTTP(S) requires `://` and a parsable host. WHATWG URL parsing checks protocol and relative origin; accepted literal text is never automatically normalized or rewritten.
- Unsupported schemes, protocol-relative references, backslashes, raw whitespace/control characters, markup delimiters, malformed percent escapes, percent-encoded controls and ambiguous HTML entity spellings are refused. Numeric entity starts are refused even without a trailing semicolon. Encoded ordinary spaces in asset paths are supported.
- Empty inspector URL fields are allowed as empty references. Alternative text uses existing literal attribute escaping, without URL filtering.
- Safe examples include `assets/logo.svg`, `assets/team%20photo.png`, `../assets/a.png` and `/api/apps/fixture-app/composition-asset?path=assets%2Fa.png`. These are policy test examples, not claims that those assets exist. No image asset has yet been identified in the admitted disposable Application.

Unmanaged legacy HTML is retained byte-for-byte and is not automatically adopted, rewritten or migrated. Managed HTML URL values must now satisfy the policy to pass shared validation; malformed/manual source remains governed by existing conservative admission. The inspected disposable Page HTML contains no existing href/src attributes, so no compatibility migration is needed there. No claim is made about uninspected operational Pages. URL validation is not complete HTML sanitization or production security qualification. Advanced repair semantics were not expanded or requalified.

## Verification

Final focused run: `evidence/v1-practical-authoring-20261027/resumed/run-1793122168646`.

- Eight source tests passed: four existing Card/Panel/source lifecycle cases plus allowed URL cases, denied/obfuscated/malformed cases, literal alt/uppercase handling/unmanaged preservation and actual VisualArtifactService normal candidate refusal with saved-hash preservation.
- Two actual-editor disposable-fixture workflows passed, autosave disabled/enabled. New checks exercise derived section labels, containment indentation, diagnostic identity and inspector refusal of unsafe href/src without changing source; safe href/src/alt edits succeed. Existing native Card/Panel Save/Reload/Preview and saved-only/error regressions remain covered.
- Four existing pure layout-CSS cases passed. Strict scoped typecheck reported zero diagnostics for source/validation/runtime/editor/Preview dependency roots. Existing package build `npm.cmd run build --workspace @ui-platform/visual-artifacts` passed. `git diff --check` passed.
- The first retained resumed run failed because it was launched from the repository parent rather than the runner's required `ui-platform` working directory; fixture bytes resolved to a nonexistent path. It was rerun from the correct directory. Subsequent runs preserve intermediate source/test refinements. No product assertion was weakened. The inherited unused native-loader import.meta/IIFE warning remains recorded.

Fixture source drafts and test-only authorization callbacks are isolated fixture mechanisms; they are not normal-session proof. No unsafe URL was rendered or sent to the running application. The scoped runner's real-browser count is zero.

## Normal application prerequisites still pending

The already-running normal Chrome session was identified as Application Admin in the existing disposable environment. The three-section Page has **not** been created or verified. No existing Page was edited.

The disposable client source and its actual copied shared-package sources/generated modules have been synchronized. The ordinary API command loads modules once and does not watch them. The operator was asked to stop the existing development command with Ctrl+C and run `npm.cmd run dev` in the same regular terminal with its admitted environment, then report both startup messages and the printed UI URL. No restricted-environment backend restart was attempted.

The admitted disposable Application contains no image files or configured image URL. The operator was asked for an existing authorized HTTP(S) image URL or Application asset path. No image was invented, uploaded or fetched as a substitute.

After those prerequisites: use a fresh disposable Page; create Introduction, Feature and Closing sections with existing containers, headings/body/link/image/Card controls; verify summaries/selection, content/order and one responsive override; Save/Reload; record stable IDs, attributes, layout, native Card/image rendering, screenshots and matching saved/Preview revision hashes. These results remain pending and must not be inferred from fixtures.

## Preservation and inventory

`resumed/preservation.json` records before/after hashes: all 25 existing Page files and the four other baseline pure modules remain unchanged; only the intended three original sources and copied editor differ among the 33 baseline entries. HEAD remains unchanged. `resumed/inputs` retains pre-edit sources and pre-sync disposable copies; `deployment-baseline.json` maps their hashes. `editor-change.diff` records the bounded difference from the exact pre-existing editor, including preservation of refresh scheduling.

Changed files comprise the three logical source files, their disposable source/generated copies, generated shared-package outputs, one runner, two focused test files, this report, new resumed evidence and a separate exact inventory. Historical blocked report/evidence/inventory and prior accepted reports/evidence remain unchanged. No Pages, settings, permissions, I-AM, recovery, Windows security, restricted Saved Preview or production state changed. No commits or pushes.

Normal-browser unsaved-draft protection remains deferred and unaccepted. Stop/status: **V1 Page Builder — Practical Website Authoring Acceptance Review Gate**, with normal-browser proof pending the two prerequisites above. Review or separate acceptance cannot be claimed from implementation tests alone.
