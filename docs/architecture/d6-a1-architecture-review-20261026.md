# D6-A1 Application Activation Binding — Gate B review

2026-10-26. **Activation semantics investigated and bounded contract specified. Gate B does not admit product implementation. D6-A1 is unimplemented and unaccepted.**

The D6-R2 Gate A stopping findings are accepted in a separate addendum. R2 remains unimplemented/open/unaccepted. P2/P3 source, closures, verification and inventories are preserved.

## Why an additive reader is not yet truthful

The actual server has two activation mechanisms. Declared UIB packages use app enable/version/resolution plus catalog discovery. UI Base web packages, including the pinned Card, can instead be added through `installedUiBasePackages`, which uses dependency name sets, composition-dependent root precedence, an explicit disabled exclusion and mutable installed metadata. It does not apply the declaration's version/resolution rules in the same manner. The canonical asset resolver continues to return a live package file path.

Consequently, a binding next to `enabled:true` would not prove which native implementation is actually effective. An exact P2 seal cannot fill that gap: P2's accepted selection record intentionally does not redirect either activation resolver or ordinary package runtime path. Calling that record “activation” would create a second interpretation rather than integrate the real owner.

Known writer paths reinforce the gap. Package enable/disable and direct declaration writes are not all graph-fenced. Foundation migration changes dependency/import declarations, runs npm/build and can restore old manifest/lock bytes after an error; restored declarations do not prove all installed output returned to its old state. Nonparticipating same-version/file-linked/external writers are not covered by current graph authority. A generation stored only beside mutable/restored declarations cannot certify those operations without a defined writer/transition contract.

An exhaustive compatible supported-writer fence or an explicit real sealed effective-activation mode could solve this. Neither is established by the present owners. Implementing a metadata reader with successful fixtures would rely on the missing guarantee; the user explicitly prohibits that. No synthetic callback asserting activation, always-unavailable placeholder implementation or partial reader was added.

## Scope and gate results

| Gate | Outcome |
| --- | --- |
| Prior acceptance | R2 inventory and prior preservation reviewed; P2/P3 inventories independently match. Source findings were not represented as runtime tests. |
| A: actual semantics/writers | Mapped both resolver branches, declaration/catalog/install/migration/build/settings/owner writers and independent presentation applicability. |
| B: compatible owner contract | Requirements and candidate minimal record specified. Implementation not admitted because actual effective-resolution/writer compatibility remains unresolved; an architectural activation-mode decision is required before changing its meaning. |
| C: bounded implementation | No runtime changes, owner façades, source parser, provider or capture implemented. |
| D: verification | No tests/typecheck/product imports executed, because no executable implementation is admitted. Exact inspection/non-execution and raw source evidence retained. No new runtime result claimed. |

The stop does **not** depend on production authorization being absent or on current protected data being inaccessible. Internal nonproduction verification would be possible after source semantics are defined. No live read, OS investigation, lock repair, database or activation is requested to resolve this ordinary-source decision.

## Precise next architecture decision

Approve or revise **sealed effective activation in the existing Application/package owner**: exact resolution branch and semantics, original registered owner, canonical package/Definition/export/P2 identity, independent activation and seal-selection generations, supported writer transitions, rollback/nonparticipation refusal, and legacy runtime treatment. Specify whether and how all consumers of the bound state agree on immutable implementation identity; no hidden replacement of mutable runtime paths or browser delivery implementation is included by this report.

If mutable activation is retained instead, supply the enforceable writer boundary covering both resolver branches and unsupported actor disposition. Do not qualify it by semver, path, timestamp, a second mutable read or P2 selection. Any new transition/transaction/recovery/migration or non-additive activation change requires separate scope approval. No new global lock is recommended.

Presentation applicability can then be crosschecked independently for the accepted P3 subset against normal active-version record and exact JSON/CSS/context under the existing graph. Bounded owner-maintained read-under-current-admission façades can be implemented additively with actual canonical scope/lifetime proof, cancellation/R1 refusal and unchanged byte/lease rules. These helpers are not substitutes for the activation decision and were not implemented in isolation.

After A1 implementation and its required scoped actual-owner tests pass, return to R2 Page/Card acquisition with original registered Application/Page/node/hash, whole closure/selection/currentness revalidation and original server admission. Operational acquisition, immutable delivery and native rendering remain independent later authorizations. No R2 capture, package activation or Preview provider work occurs here.

## Preservation and exact deliverables

The owner/writer map and activation-to-seal/refusal contract accompany this report. `source-admission.json` records exact ordinary implementation hashes and no execution admission. Retained source excerpts demonstrate the two resolver paths, migration restoration and writer/reader contracts. `accepted-inventory-confirmation.json` confirms the old R2/P2/P3 exact inventories. No historical result or inventory is overwritten.

`preservation.json` reports all baseline files unchanged, zero deletions and unchanged HEAD. `docs/architecture/d6-a1-files-20261026.json` lists every new document/evidence file. No product/test/script/manifest/registry/publication/source-store changes. Existing installation/activation/presentation/editing/history/autosave behavior is preserved by unchanged source, not a newly executed compatibility test.

No current protected source or Application, operational enable/disable/activation/publication/selection/migration/cleanup, recovery/journal replay/foreign lock cleanup, Windows/elevation/VM investigation, production permission/database execution, native/browser delivery, commit, push or synchronization occurred.

Stop at **D6-A1 Application Activation Binding — Increment Acceptance Review Gate**, with an architecture decision required before implementation. Do not mark D6-R2, full D6, WP5-F or WP5-I complete. All 40 umbrella requirements remain unchecked.
