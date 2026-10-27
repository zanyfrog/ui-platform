# V1 HTML-first compatibility assessment

Date: 2026-10-26. Status: V1 HTML-First Simplification Acceptance Review Gate.

The approved HTML-first direction is compatible with the existing Visual editor. The implemented correction writes supported literal settings to existing HTML attributes and simple text slots, using existing UI Base contracts. It does not introduce a component model, renderer, parser or persistence service. Card and Panel exercise the shared mechanism; this is not a claim that every installed component binding has been migrated.

## Existing ownership and duplication

| Representation | Existing responsibility | Decision |
| --- | --- | --- |
| Page HTML | Managed node and Component identity, element type, wrappers, order, classes, children and content | Authoritative instance representation |
| HTML attributes and text slots | Literal component values | Properties now reads/writes supported declared mappings here |
| Inline `data-uip-settings` JSON | Legacy instance overrides, including values also representable as attributes | Redundant for mapped scalar/text values; remove only the explicitly edited key |
| `.visual.json` | Permanent artifact identity, route, reusable Component API, bindings/events/state/data/forms/modes | Independently necessary contracts retained |
| `.visual.json` layout entries | Per-node base/responsive layout declarations | Existing behavior retained; moving these into styles requires a compatible serialization decision |
| CSS role | Authored styling | Retained |
| Component/package Definition | Reusable implementation and property/binding contracts | Retained, not instance property storage |
| Functions/data/workflow resources | Independently executable or reusable behavior | Retained |

No separate per-instance `.visual.json` literal property dictionary was found. The concrete duplication was inline HTML JSON overriding literal HTML attributes. Existing `readPackageSettings` gives stored JSON precedence. Flipping precedence globally would change saved Pages, so untouched legacy values keep that behavior. Editing one supported field writes its HTML representation and removes its old JSON key; unrelated keys and source bytes remain. Empty settings bags are removed. No saved-content migration runs on load.

The shared source parser remains conservative and offset based. Its existing identity ambiguity refusals, supported entity decoding and ordinary attribute casing assumptions remain. No DOM parser or alternate Preview scanner was added.

## Implemented ownership path

`editor.ts` Properties → shared `setNodeSetting` → Page HTML → existing VisualArtifactService saveCandidate/validation → retained saved files/hash → existing Preview client → existing Visual runtime → actual UI Base renderer.

Canonical attribute bindings and simple text-slot bindings use HTML. Declared legacy same-name settings use HTML attributes with existing typed validation. Boolean presence/removal follows the existing contract; false against a true default retains its legacy representation where absence cannot express false. Multiline content uses a textarea and escaped text. Nested/mixed slot content is refused rather than flattened. The runtime suppresses a generated default slot value when authored children already supply that slot, preserving explicit legacy overrides.

Complex values, media/event bindings, undeclared JavaScript-property aliases and mode bindings retain their existing representation where no safe literal mapping is established. In particular Card `none` and `link` modes share an attribute tuple; that tuple alone cannot uniquely recover the selected mode. Replacing this representation requires an explicit compatible installed binding rule. Dynamic metadata bindings can still override literals by design. Those affected portions are not silently converted or deleted.

## D6 reassessment and shortest remaining path

Recovery-free Foundation admission, canonical root/role ordering, saved hash/coherence checks, original Application/session ownership, read permission and related dependency authorization remain essential wherever saved source is acquired. HTML-first does not replace those checks.

D6-A1 generalized activation binding, D6-R2 sealed capture orchestration, D6-P2 package publication seals and D6-P3 presentation seals are not prerequisites for editing literal HTML or completing Add/Edit/Save/Reload. Their broader immutable-capture/publication guarantees can remain deferred. Accepted work and guarantees are preserved; this increment does not claim that the existing design iframe has the security guarantees of the restricted production Preview provider.

The shortest next sequence is to verify the existing design Preview in a functioning real browser using disposable fixtures, then separately authorize and qualify one real saved target through the existing owner/session/read-permission path, expected saved hash, dependency permissions and trusted installed native modules. Reuse the existing Preview and renderer. Do not create another controller or package architecture. If the production restricted provider is used, retain its accepted L1/L2/L3 host, delivery and lifecycle checks; it remains unavailable today. No protected read, package activation or migration is authorized by this report.

The isolated workflow now passes with actual Card and Panel implementations. Actual production Preview remains unqualified, and neither complete WP5-F, D6 nor WP5-I is accepted. All 40 umbrella requirements remain unchecked.
