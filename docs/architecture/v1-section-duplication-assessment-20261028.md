# V1 Page Builder — Next Functional Increment Review Gate

Date: 2026-10-28. **Read-only assessment. Implementation is not authorized by this proposal.**

## Recommendation

Add **Duplicate section** for a bounded, content-only managed section. A user could build one feature section with heading, paragraph and Card, duplicate it beside the original, then change the copy's content independently. This materially reduces repeated insertion/content/layout work; it does not require a new component model or infrastructure.

| Current capability | Position after heading closure |
|---|---|
| Ordinary multi-section text/link/image/Card authoring | Accepted within Practical Website Authoring scope; screenshot limitation remains historical. |
| H1–H6 insertion and level editing | Accepted and closed; do not repeat that verification campaign. |
| Container/layout/responsive controls; sibling reorder | Existing and accepted within their documented boundaries. No arbitrary nesting/reparenting claim. |
| Duplicate an existing section | **Missing:** inspected editor has insert/remove/move controls, and source helpers insert new empty nodes or exchange managed siblings. No duplicate-section action/helper is present. |
| Forms, bindings, events, Regions, richer component contracts | Existing specialized contracts make broad copying materially different from literal content duplication. Keep outside the first increment. |

## Existing contracts and implications

| Contract inspected | Consequence for a duplicate |
|---|---|
| `parseSource` requires unique data-uip-node identities; malformed/duplicate identities are refused | Every cloned managed descendant, including wrapper/content nodes, needs a fresh collision-checked node ID. Original IDs and bytes stay unchanged. Do not copy identity strings verbatim or replace arbitrary text containing them. |
| `insertNode` supplies a layout wrapper; `moveNode` resolves a selected node's parent wrapper and exchanges siblings | Resolve the selected section plus its existing outer layout wrapper, where applicable, as one item. For the first increment, require a Page-root section/item and insert its copy immediately after it under the same parent. No reparenting or wrapper invention. |
| `.visual.json.layout` is keyed by managed node/wrapper IDs with Base/Tablet/Mobile rules | Deep-copy only the included layout entries onto the new IDs in that same existing map. Retain original entries. No second layout authority or shared mutable rule objects. |
| data-uip-component identifies a reusable definition, unlike data-uip-node instance identity | Retain the same existing admitted Component reference; do not duplicate/acquire/publish definitions or regenerate Component IDs. Literal Card attributes and supported managed content remain in cloned HTML. |
| Metadata bindings, conditions, repeaters, events, modes and form fields refer to nodes; Page/Component/Shell/Route identities have separate ownership | A generic deep copy would leave old targets or duplicate external behavior. Do not clone artifact/route identities or automatically remap these contracts in a content-only increment. |
| Region IDs, slots, menu declarations and branding have separate composition rules | Reject Region/slot/menu/branding composition rather than copying IDs and changing Shell behavior. |
| Ordinary HTML id, fragment href, label/ARIA ID references and node-specific CSS/functions may carry cross-references outside node metadata | Raw copying is not safe just because data-uip-node IDs are remapped. Explicitly refuse unsupported reference-bearing source; do not silently guess anchors, rewrite code/CSS or break accessibility links. |
| Existing lifecycle saves source and metadata together under Application/session/expected-hash validation | Stage the duplicate as one ordinary editor edit/Undo step using that lifecycle; retain existing Save validation and recovery refusal. No new transaction/storage mechanism. |

Sources: `packages/visual-artifacts/src/source.ts`, `model.ts`, `validation.ts`, `composition.ts`, and `src/client/visual-artifacts/editor.ts`. These are source-contract findings, not a claim that duplication already works.

## Smallest proposed authorization

1. Add an existing-toolbar **Duplicate section** control for a managed, explicitly balanced Page-root HTML section and its existing automatic outer wrapper. All included element nodes must have valid managed IDs. Start with literal HTML headings/paragraphs/links/images and the already demonstrated native Card contract/content; do not infer Panel nesting or arbitrary component compatibility.
2. Build an operation-local old→new node-ID map, clone the exact source subtree conservatively through existing offsets/attribute helpers, and copy its existing layout rules. Reuse definition references. Select the new section and insert it directly after the original. The map is temporary computation, not a registry or stored instance model.
3. For this first increment, limit admission to a content-only Page without dynamic binding/event/condition/repeater/form/mode/onLoad behavior, custom CSS or custom functions (generated empty function boilerplate is not custom code). Reject manual/ambiguous source, Regions/slots/menus/branding, unknown component contracts, and unsupported reference-bearing attributes/directives, including ordinary HTML IDs and fragment/ARIA/label references. Shared URL and component validation still applies. Determine these refusal checks against actual contracts before coding; if a required case cannot be safely classified, report the precise conflict rather than expand into generic reference rewriting.
4. Use one fresh disposable Page with one managed section containing a heading, paragraph and Card plus one existing layout rule. Duplicate it, edit the copy, and verify the original stays unchanged; verify fresh instance/wrapper IDs, shared definition reference, order and copied layout. Exercise Undo/Redo and normal Save/Reload/Design Preview with revision agreement. Test malformed/duplicate/unsupported-reference refusal and refusal without partial source/metadata edits. Avoid rerunning unrelated image/responsive/heading campaigns.

These admission limits intentionally make this **content-only section duplication**, not a promise that every existing Page can be duplicated. Show an understandable refusal for unsupported selections; never repair/migrate them automatically. If the supported section cannot be expressed with existing helpers, return the concrete conflict for review.

## Priorities and exclusions

Section duplication is recommended ahead of further verification infrastructure or expanding component contracts. Diagnostic consolidation into a Problems view remains a useful separate usability task. Reparenting, section templates, rich text and broader semantic/reference remapping should remain later explicit decisions.

No new renderer, component framework, instance store, label/layout registry, package mechanism, cloning controller or general compatibility framework is indicated. Do not change settings, identity/authorization, autosave, recovery, restricted Saved Preview or production activation. Normal-browser unsaved-draft protection remains deferred and unaccepted. Existing polling/focus-refresh and application-header changes retain their prior status.

This review and the separate heading closure add documentation only; no browser interaction, product/Page edit, operational state acquisition, tests, server startup, recovery, commit or push. Existing reports/evidence/inventories remain untouched. Preservation checks and exact new-file hashes are recorded under `evidence/v1-section-duplication-review-20261028`.

Stop: **V1 Page Builder — Next Functional Increment Review Gate**. Await separate authorization before implementation.
