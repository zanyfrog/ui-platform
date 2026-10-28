# V1 Page Builder — In-Page Navigation Review Gate

Date: 2026-10-28. **Read-only feasibility assessment; no implementation or browser experiment performed.**

## Current capability and gaps

| Author goal | Existing code and implication |
|---|---|
| Give a section a stable anchor | Generic HTML mutation can retain literal attributes, but the inspector has no ordinary HTML id field. `data-uip-node` is the permanent managed instance identity; it must not become the public anchor or be regenerated when an anchor changes. |
| Link to a section | Existing literal href editor/shared URL policy already admits `#fragment`. It does not establish target existence, uniqueness or a supported navigation scope. |
| Jump in saved Design Preview | Renderer mounts content in artifact shadow roots. No Page-local literal fragment resolver/scroll handler is present. Preview's navigate adapter logs declared navigation actions; that is not handling ordinary anchor activation. |
| Work in a website | `createVisualPage` and composed routes reuse the same renderer. A shared fix can serve Preview and ordinary Page mounts, but document/iframe/route hash ownership and mount timing need a bounded host test. Production activation is not required or implied. |
| Duplicate/remove safely | Accepted duplication explicitly refuses ordinary IDs and fragments; keep that restriction. Current removal slices source after confirmation and has no incoming-fragment check. It can therefore leave a link dangling if anchors are introduced without a guard. |

Native fragment lookup selects document-tree elements rooted at the document, while the section here is in a shadow root. Thus adding an id field alone is insufficient; this conclusion follows from the existing renderer plus the [HTML Standard's fragment-target algorithm](https://html.spec.whatwg.org/multipage/browsing-the-web.html#scroll-to-fragid), not from a new normal-browser test. No claim is made that every external host/router behaves identically.

## Smallest feasible end-to-end increment

Recommend **same-Page anchors on managed Page-root sections**, initially on an ordinary Page without Shell/Region or cross-component targets:

1. **HTML-first authoring:** a section inspector “Anchor ID” field writes ordinary `id="features"`; keep its existing managed ID, wrapper, attributes/content, position and layout. Start with a documented conservative slug grammar such as lowercase letter followed by lowercase letters/digits/hyphens. Uniqueness must consider every ordinary HTML id already in that Page, including preserved source, not just managed nodes. No anchor registry or duplicate metadata.
2. **Literal links:** reuse the existing href field for `#features`; an optional section-target choice can be derived directly from current HTML. A shared Page-local anchor check should reject newly authored duplicate/ambiguous targets and unresolved supported managed fragment links before normal Save. Shared URL refusal remains intact. Do not reinterpret full URLs with fragments as local links or rewrite encoded/legacy values automatically.
3. **Existing renderer behavior:** add a narrow delegated handler in the shared Page runtime for supported same-Page anchors, resolving a unique section within that Page root rather than searching other component roots. Reuse existing render/update/destroy cleanup; no new router or renderer. Handle ordinary click and keyboard activation, scroll the target into view and provide appropriate keyboard focus. Do not let Preview navigate its iframe away or change the Builder parent's URL. Missing/hidden/ambiguous targets need explicit feedback through existing mechanisms rather than a misleading jump.
4. **URL and mount semantics:** test a single supported ordinary website Page host as well as the existing saved Preview. Resolve fragment state only after that Page is attached; define initial fragment and back/forward/hash-change behavior using the host's existing URL/history ownership. The iframe owns its Preview fragment; a website Page must not seize an unrelated application's hash router. No source evidence yet qualifies arbitrary host adapters. If the selected existing host cannot safely own this hash behavior, report that concrete contract conflict before extending scope; do not substitute scroll-only behavior and claim complete deep-link semantics.
5. **Reference safety:** block clearing/renaming a referenced anchor or removing a subtree whose anchors are targeted by surviving same-Page literal links. Identify the incoming links so the author can update/remove them explicitly first. Removal of a target and all its incoming links together is safe only when no surviving references remain. Use the same narrow anchor analysis for inspector, removal admission and changed managed Save candidates; no silent link deletion, generic reference rewriting or stale persisted map. Preserve existing legacy HTML, and stop on an ambiguous/unclassifiable compatibility case rather than migrate it.
6. **Duplication stays closed:** anchored sections or Pages with fragment references continue to receive the accepted conservative refusal. Do not auto-generate new public anchor names, copy references or relax the whitelist. A link-free, unanchored supported Page retains its accepted behavior.

The naming/target/reference rules are new bounded authoring contracts requiring explicit implementation authorization. They should be scoped to newly authored/changed supported managed anchor content rather than used as a pretext for unrelated legacy Save-policy changes. No new persistent data or architecture is needed; derive relationships from the authoritative candidate HTML for each operation.

## Proposed acceptance evidence

One fresh disposable Page: two separated sections, one named target and one literal fragment link. Through normal controls assign the anchor/link, Save/Reload, inspect stable node IDs/HTML/layout and saved/Preview hash agreement, activate by mouse/keyboard and measure target scroll/focus in the saved Preview. Use an existing plain website Page mount for the shared runtime/hash/mount lifecycle behavior, with actual browser evidence; this is not production or restricted Preview qualification. Do not reopen unrelated Card/image/responsive campaigns.

Focused tests should cover duplicate/invalid anchors; case/encoding/missing-target decisions; unchanged managed IDs/layout; incoming references on rename/clear/remove; refusal without partial edits; retained duplication refusals; keyboard/focus; initial/hash/back-forward behavior in the chosen host; listener cleanup and no extra Save on navigation. Existing Problems can display findings without a new diagnostic service.

## Limits and recommendation

Feasible with small existing inspector/source-validation/runtime/removal changes, subject to confirming the selected host's hash contract during bounded implementation. An id field alone or Preview-only scroll hack is not the recommended result. Cross-Page links, Shell/Region/component boundary navigation, modified/new-tab semantics, fragment text directives, automatic reference remapping and anchored-section duplication remain outside the first increment.

Normal-browser unsaved-draft Preview protection remains deferred and unaccepted. No change is proposed to permissions, identity, settings, autosave, recovery, security policies, restricted Saved Preview or production activation. Existing refresh/header differences remain preserved. Historical reports/evidence/inventories are untouched.

Sources inspected: editor.ts (literal fields/removal), source.ts (URL/mutation), validation.ts, duplicate-section.ts, runtime.ts (`mountVisualArtifact`/`createVisualPage`), composition-runtime.ts and preview.ts. Standards reference above supports the shadow-root distinction. This review adds only documentation and preservation/inventory evidence under `evidence/v1-anchor-navigation-review-20261028`; no product/Page/browser mutation, tests, operational-state acquisition, commits or pushes.

Stop: **V1 Page Builder — In-Page Navigation Review Gate**. Recommend a separate bounded authorization for the above end-to-end capability; do not begin implementation automatically.
