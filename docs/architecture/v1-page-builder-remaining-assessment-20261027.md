# Remaining V1 Page Builder functionality

Date: 2026-10-27. **Planning only. No next-increment implementation authorized.**

The shortest path is to complete one normal-browser Page containing multiple existing UI Base components. There is no demonstrated need for another component model, renderer, instance store, package mechanism or architectural work package.

## Existing capabilities and evidence limits

| Capability | Current position |
| --- | --- |
| Ordinary startup and development sign-in | Operator observed at UI 5374/API 4390, using the existing I-AM identity and disposable Application. These addresses are observations, not permanent defaults. |
| Application → Pages → Visual Page creation | Operator observed. The authoring area is labeled **Pages**, not Builder. The existing fixture's legacy source-inspection Page is intentionally read-only. |
| Insert/select UI Base instances | Card insertion/managed selection observed normally; insertion choice retention corrected. Actual editor fixtures cover Card and Panel. Definition inspection is separate from inserting an instance. |
| Literal property/text editing | Normal Card edits update authoritative HTML. Fixture workflows cover Card and Panel supported contracts, stable identities and fieldwise legacy preservation. No claim that all UI Base components have equivalent editable contracts. |
| Save/Reload/Undo/Redo | Existing implementation and fixture evidence are available; the operator reported normal Card Save success. A complete recorded normal-browser round trip involving both components remains missing. |
| Design Preview | Narrow button increment accepted and closed. Saved Card is visibly rendered in a normal authorized Chrome session; Panel, failed requests and saved-only protection have scoped fixture evidence. Restricted Saved Preview is separate and remains unavailable. |
| Structure, insertion containers, named slots and order | Existing editor supports container/root insertion, declared slots, wrapper-aware move up/down and removal. Their normal-browser multi-component round trips remain unverified. |
| Layout | Existing wrapper-based base/tablet/mobile controls exist. This is not acceptance of responsive layout, nesting or usability for an entire Page. |
| Manual/legacy HTML | Preserved intentionally. A component reference alone is insufficient for a managed instance; split/missing identities do not receive property controls or automatic adoption. |

Sources: `src/client/visual-artifacts/editor.ts`, `src/client/builder-workspace/shell.ts`, shared Visual source/model contracts, and the retained HTML-first, Card-properties and accepted design-button reports. Presence of code is distinguished from observed end-to-end behavior.

The current editor also contains later workspace polling/focus-refresh scheduling changes, described in the closure addendum. This planning assessment does not extend the accepted Design Preview Button evidence to those changes.

## Gaps that matter next

**Functional verification gaps:** one normal session has not yet demonstrated Card and Panel on the same Page, independent selection and editing, one successful authorized Save, Reload with the same IDs/values/order, and both components in the same saved design Preview. Persistence of reorder/removal is also unproven normally. These are unverified existing capabilities, not established missing implementations.

**Concrete usability gaps:** the operator encountered unlabeled Page-name/route/Shell inputs; the left definition browser can be mistaken for insertion; managed node IDs and technical Structure labels obscure component selection; advanced source/repair controls dominate the ordinary path. These make the workflow error-prone even where the underlying operations exist. General visual redesign is unnecessary for the next proof.

**Contract limits:** some installed component entries are legacy/read-only definitions and do not expose the same declared properties/slots as Card. Panel's actual supported fields must guide the test; do not copy Card's contract onto it. Arbitrary nested/mixed content and all-component compatibility are not yet qualified.

**Saved-only verification gap:** unsaved protection and actionable errors pass scoped tests but have not been recorded across the full normal two-component flow. Autosave defaults can prevent a stable unsaved comparison. Use existing authorized settings if available; do not race the timer, add grants or bypass the session to manufacture that evidence. Record any remaining authority limitation precisely.

## Smallest practical next increment: two-component Page authoring pass

**Proposed outcome:** a fresh disposable Visual Page with sibling UI Base Card and Panel completes Add → Select → Edit → Save → Reload → Design Preview in the existing normal browser/session.

Bound the proposed implementation to visible labels/help for the existing Page creation fields and clear distinction between **inspect definition** and **insert into Page**. Reuse the existing picker, inspector and lifecycle. Address additional code only for a concrete defect reproduced during the flow; defer broad toolbar redesign, canvas editing and generalized component compatibility.

Proposed acceptance sequence:

1. Use the admitted disposable environment and existing principal. Create a fresh Page, leaving the existing saved smoke Page untouched.
2. Add Card and Panel through ordinary insertion controls. Confirm managed IDs; select each independently and edit only supported literal properties/content.
3. Save through the normal endpoint. Record owner/Application, Page locator, node IDs and saved hash without session secrets. Reload; confirm values, membership and order persist without duplicate instance JSON.
4. Open the existing design Preview and verify both actual UI Base implementations, saved content and matching revision hash. Explain normal slot precedence, such as a named header replacing fallback heading text.
5. Under existing permitted autosave controls, verify an unsaved edit cannot replace that saved Preview, then discard it. If this cannot be exercised under current authority, report the exact pending check instead of granting permissions.
6. Perform one move-up/down round trip, Save/Reload and Preview to establish multi-component order persistence. Treat removal, deeper nesting, responsive composition and a third component as follow-ups unless an immediate defect blocks this bounded flow.

Scoped regressions should cover any changed creation/insertion behavior; the actual normal-browser result is the acceptance evidence. Fixture callbacks cannot replace it. Stop on owner/session/permission/hash conflicts, foreign locks or recovery-required state; no recovery work belongs to this proposal.

**Excluded:** existing Page migration/repair, new identity or activation modes, a new renderer/property framework/store, forms/data/workflows/events expansion, restricted Saved Preview/production activation, Windows investigations and commits/pushes.

This is the recommended next increment, **not approval to execute it**. The broader normal-browser multi-component workflow remains open after the narrow Design Preview Button closure.
