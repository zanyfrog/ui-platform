# V1 Page Builder — Appearance and Layout Inspector Acceptance Review Gate

Date: 2026-11-01. Status: implementation and bounded verification complete; submitted for review, **not accepted or closed**. No commits or pushes.

## Scope and authority

The inspector adds background color, text color, font size, font weight and text alignment with readable presets, custom supported values and individual Reset controls. Appearance remains authoritative in Page CSS, in a delimited `uip-appearance` area keyed by literal managed-node selectors. There is no duplicate per-instance appearance JSON or inline HTML style authority. Changes preserve unrelated CSS bytes and participate in the existing save and Undo/Redo lifecycle.

Layout controls expose existing wrapper metadata: arrangement, spacing, size, grid and alignment, with Desktop/base, Tablet and Mobile selection, presets and resets. The inspector identifies the selected appearance target and the immediate parent layout wrapper separately. Existing native Card/Panel variants and wrapper layout remain available; generic appearance does not enter native component internals. Composed editing is confined to Page-owned Regions, using the existing authorized composition read to inspect shared CSS conflicts. No Shell, Menu, theme, renderer, framework, server authorization or schema changes were introduced.

Product files are `src/client/visual-artifacts/editor.ts`, `appearance-css.ts` and `style-controls.ts`, with identical copies in the existing disposable browser project. Verification adds `scripts/verify-appearance-layout.mjs` and the three files under `tests/appearance-layout/`. The exact absolute paths and SHA-256 hashes are in the accompanying inventory.

## Conservative CSS contract

Structured appearance mutation supports only the owned declarations and admitted flat CSS. Manual conflicts, malformed or duplicate owned areas/rules, ambiguous selectors, inline styles, duplicate relevant attributes, manual/native targets and stale selections are refused. Attribute-name casing is handled conservatively. Complex selectors, at-rules (including media/import), nesting, quoted values and custom token expressions are outside this bounded admission grammar; authors retain the advanced CSS editor. This is not a general CSS parser or stylesheet rewrite. Shared Shell/site CSS is subject to the same conservative conflict check. Composed authors without the existing required read authority receive refusal; permissions were not widened. Appearance is base-only; layout uses the existing responsive contract.

## Ordinary Chrome observations

Two new disposable Pages were authored through ordinary controls in the existing Application `v1-identity-fixture`, using its established session and ownership. The plain Page used explicit Plain Page creation. The composed Page used the existing default shared Shell and Page-specific main Region. Both received text, appearance presets and wrapper layout, then Save/Reload, reopen and Saved Design Preview verification. Browser evaluation was read-only observation; mutations used normal authoring controls.

| Page | Paragraph managed identity | Containment |
| --- | --- | --- |
| `appearance-plain` | `node_29cc1f5a-11c5-47d7-988f-acf5b1b60947` | Plain Page root and wrapper retained |
| `appearance-composed` | `node_85119859-8bcb-4c90-b72a-07baa7700f1a` | `region-main`, Region and wrapper retained |

Both saved Previews initially computed background `rgb(232, 241, 255)`, text `rgb(36, 86, 166)`, font size `24px`, weight `700`, alignment `center`. Wrapper layout alone supplied flex arrangement, gap `8px`, width `100%` and responsive padding/direction. HTML and managed identities remained stable during styling. The literal unrelated CSS prefix, including whitespace, was preserved:

```css
/* Authored CSS: preserve exactly. */
.note { border: 1px solid #526078; }

```

Actual saved Preview viewport measurements established the existing breakpoint boundaries for both Pages:

| Actual CSS viewport width | Wrapper padding | Flex direction |
| --- | --- | --- |
| 1024 | 16px | column |
| 1023 | 32px | row |
| 640 | 32px | row |
| 639 | 8px | column |

The first plain viewport requests produced scaled Windows widths; those raw observations are retained separately. Corrected observations use measured CSS widths, not requested tool dimensions. The temporary Preview tab was closed and viewport override reset.

For both Pages, changing text color to white, Undo to blue and Redo to white restored exact corresponding CSS and produced matching saved Preview computed colors. Reset Text color removed only the owned color declaration, restoring computed inherited black while retaining the background, size, weight and alignment. Final saved Preview revisions matched hashes of the actual saved role bytes:

| Page | Final saved revision |
| --- | --- |
| Plain | `c5a72013f6313e2a5ea19329230be987e41729e8454d0f8c3b84829075eaa3ea` |
| Composed | `f6f6ea3898f5819e8a1d4c0f81596725de65a5d6f41f806d25fd6180437c3464` |

The saved bundle, final revision, initial/reset computed-style, Undo/Redo and responsive JSON observations are retained under `evidence/v1-appearance-layout-20261031/` (the task's start-date directory). After the final attribute-casing safety hardening, both normal-browser targets were reloaded and admitted by the final controls, with unchanged saved revisions and correct rendered background; the entire earlier mutation sequence was not repeated after that narrow hardening.

The existing accepted explicit-plain image Page was also opened in Chrome: its saved image completed decoding at 240×96 with the existing managed identity and authorized asset URL. Browser upload was not attempted or newly qualified.

## Verification and preserved failures

The final focused run `run-1793509455004` passed: 49 collected unit tests, the retained 21 image checks, actual-editor plain/composed lifecycle checks, stale asynchronous selection refusal, wrapper-only layout and CSS-only appearance checks, native Card/Panel contract checks, runtime and saved Preview fixtures, and strict scoped typechecking with zero diagnostics. Fixture counters explicitly report zero real-browser workflows; ordinary Chrome evidence is recorded separately above.

The production build and server checks passed. Broader client typechecking retains the same seven pre-existing diagnostics (six UI Base declaration diagnostics and one `main.ts` string/boolean diagnostic). Previously blocked legacy suites were not rerun. `git diff --check` passed.

All earlier runs remain: the initial font-size validation test failure was corrected, and the actual-editor run exposed an unchanged-save epoch guard that incorrectly made controls stale. The final guard uses selection/lifecycle/context/content consistency and retains asynchronous stale-result refusal. No failures were erased. Initial immediate Preview attempts sometimes observed an older saved revision or a blank loading frame; successful evidence explicitly waits for Saved and reopens Saved Preview. Unsaved-draft Preview protection remains outside this increment.

`composed-styling.jpg` is a successful full Builder screenshot. The attempted clipped screenshot captured an unsuitable region and is not styling proof; the final mobile screenshot timed out, while its computed-style observation succeeded. Both failures are retained. DOM/computed-style, saved-byte and revision observations supply the detailed evidence.

## Preservation and inventory

The baseline preservation check covers 975 existing files: none missing, no historical evidence changed. Existing Application source changed only through its normal append-only operations log; the accepted Pages, shared Shell/Menu, Application settings, native references, identities and ownership remained unchanged. Authorized editor changes appear in the primary and disposable client copies. Only the two new disposable test Pages were authored. The existing development API was restarted after its overnight stop using the same established configuration; no security, policy, permission or I-AM changes were made.

`evidence/v1-appearance-layout-20261031/files.json` records exact hashes for source, disposable copies, verification, this report, all retained evidence, Application additions/changes against baseline and regenerated build outputs. The inventory excludes itself. Live service/operation logs are point-in-time hashes and can subsequently append. The two pre-existing untracked image-closure and practical-styling assessment documents were preserved and are not changes of this increment. Original image acceptance qualifications and evidence remain intact.

This gate does not qualify unrestricted website hosting or production Publish. Page revisions do not pin mutable Application asset bytes. Browser file upload remains unverified; prior service upload evidence is separate. No acceptance or closure is inferred from tests or disposable Preview results.

**Stop: V1 Page Builder — Appearance and Layout Inspector Acceptance Review Gate.**
