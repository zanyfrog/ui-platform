# V1 Page Builder — Next Functional Increment Review Gate

Date: 2026-10-28. **Read-only capability review; proposed scope only. No implementation started.**

The accepted Builder now supports an ordinary-control multi-section text/link/image/Card Page with saved Design Preview. The next useful work should add a missing authoring function, rather than repeat that workflow or build verification infrastructure.

| Capability | Current position |
|---|---|
| Multi-component authoring, sibling reorder | Accepted within the Card/Panel contracts and recorded workflows. Panel content support remains limited to its actual declaration. |
| Container composition and responsive layout | Accepted for the documented section/Card rules and Preview widths, not arbitrary nesting or every layout combination. |
| Readable Structure; generic text/link/image controls | Accepted within practical-authoring scope. Source remains authoritative. |
| Save/Reload/native saved Design Preview | Accepted with recorded identity/hash agreement. Screenshot evidence is explicitly incomplete. |
| Ordinary heading hierarchy | **Missing from ordinary insertion/inspector controls:** the HTML picker offers h2 only; the generic inspector edits text/classes but cannot choose a heading level. A user cannot author a page-title h1 and subsection h3 without source editing. The renderer/parser's ability to retain other HTML tags is not an authoring control. |
| Duplicate a section / move between containers | No dedicated duplication or reparenting control in the inspected editor; current move helper exchanges siblings only. Useful later, but requires more identity/layout/reference handling than heading authoring. |
| Grids, richer slots/Shells, additional components | Some controls/contracts exist; broader outcomes remain unqualified. Do not treat unverified controls as confirmed missing or invent Panel content. |
| Draft/security/production and unrelated source changes | Remain outside acceptance exactly as stated in the closure. No new verification infrastructure or privilege route is recommended. |

## Recommended next increment: ordinary semantic heading authoring

Enable a user to give a Page an h1 title, retain h2 section headings and add an h3 subsection through ordinary insertion/inspector controls. This is a small, concrete content-authoring gap exposed by the existing three-section Page; it improves useful website structure without new components or architecture.

Proposed authorization scope:

- Add clearly named heading choices to the existing HTML insertion picker and a heading-level selector for managed heading nodes. Support h1–h6 as HTML semantics, without introducing a typography framework or promising visual polish.
- Change only the selected heading's paired tag names through the existing conservative HTML source machinery; retain node/wrapper identities, content, attributes, membership, order and existing layout rules. Refuse ambiguous/manual/malformed source rather than converting legacy HTML automatically.
- Use a fresh disposable Page for a page-title/section/subsection example. Verify the actual semantic tags and text through normal controls, Save/Reload and saved Design Preview. Confirm the changed heading remains selectable by its derived Structure label and saved/Preview hashes agree.
- Run focused mutation/identity/preservation tests and relevant editor regressions/typecheck. Preserve all accepted Pages and historical evidence; do not repeat the full image/Card/Panel/layout campaign unless a reproduced regression requires it.

Excluded: rich-text formatting, arbitrary tag conversion, CSS/typography redesign, section duplication/reparenting, new renderer/model/store, component-contract expansion, settings/I-AM changes, restricted Preview, production qualification or screenshot infrastructure.

## Priorities after that

1. Section duplication would reduce repetitive authoring; assess a bounded identity/layout remap before authorizing it, including explicit treatment of bindings/events. Do not introduce a duplicate instance store.
2. Review ordinary diagnostic presentation separately: repeated manual-layout warnings currently occupy the editor rather than a compact Problems view. This is usability work, not a reason to repair preserved HTML.

This review is based on the accepted reports and read-only inspection of `src/client/visual-artifacts/editor.ts` (insertion options, generic inspector, move controls) and `packages/visual-artifacts/src/source.ts` (conservative parsing/insertion and sibling move). No normal runtime state, browser, Page, product source, settings, identities, permissions or recovery state was changed. No tests or server startup were needed for this planning-only review. Preservation hashes and exact documentation inventory are under `evidence/v1-next-functional-review-20261028`.

Stop: **V1 Page Builder — Next Functional Increment Review Gate**. Await separate implementation authorization.
