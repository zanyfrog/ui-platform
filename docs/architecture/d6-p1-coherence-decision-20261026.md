# D6-P1 coherence mechanism and implementation-admission decision

2026-10-26. **Gate A source ownership mapped. Gate B cannot qualify an existing complete coherence mechanism. Gate C not admitted; no product read implementation.**

## Chosen architecture direction

Recommend **existing-owner sealed publication, with mutable activation/selection pointers coordinated through the existing Foundation graph**. A publication would bind exact canonical package/Definition/export and theme/resource membership to immutable, owner-held bytes. Package/presentation owners remain the authorities used by both Preview and Publish. No second package registry, Preview catalog or new global lock is proposed.

This is a concrete architecture recommendation for separate approval, not a claim that a compatible publication certificate already exists. Establishing final seal visibility, failure handling, write-once/version retention, pointer binding and supported writer obligations would introduce a new publication protocol. Gate B explicitly requires stopping before that change. Neither a read adapter nor generated metadata can supply the missing producer guarantee.

## Mechanism assessment

| Existing candidate | Useful guarantee | Why insufficient for P1 |
| --- | --- | --- |
| Manual package staging/rename | New destination tree can be made visible after copy | No sealed complete dependency/resource index, activation binding, same-version replacement fencing or reader retention guarantee. |
| Package semver / manifest schema / Definition revision | Declared compatibility/identity | Does not certify exact bytes or uniqueness and completeness of dependency membership. |
| Foundation commit-named workspaces | Recorded immutable repository origin | Actual copied/build/installed tree is not verified/sealed by that name; refresh/migration/state can change independently. |
| Presentation `vN` and JSON checksum | Named owner version and JSON digest | CSS/assets/composition copies are outside the JSON checksum; copy errors are suppressed; copy helper permits force overwrite. No complete-byte publication certificate. |
| Existing Foundation graph alone | Orders participating callers and role transactions | Package, activation, resource and external build writers do not all participate. Two equal reads cannot rule out an ABA or mixed-state capture. |
| R1 recovery-free mode | Refuses recovery-required acquisition without recovery | Does not supply package publication semantics, immutable bytes or participation for plain-file/subprocess writers. |
| L1/L2/L3 manifests and immutable-input validators | Validate supplied closed bytes and binding invariants | Validate a claim supplied by an owner; do not create real owner provenance or publication guarantees. |

## Why stop rather than add a partial reader

Additive options can propagate recovery refusal, but cannot turn the existing version labels into sealed publications. A new reader returning copied files and hashes could prove what it copied, but not a complete owner-published closure or an atomic version shared with activation/theme/resource membership. Such a reader would be a speculative adapter under Gate C. Fencing a few writers would leave known paths unqualified; silently excluding their effects would violate complete closure.

The stop is based on ordinary implementation counterexamples, not missing access to current protected state. Live reads, operational repair or package migration cannot cure this source-contract gap. No such operation is requested or performed.

## Precise architecture decision required

Approve or revise this bounded producer-side publication contract before implementation:

1. **Publisher and scope:** existing package installer/build owner publishes the exact canonical implementation closure; existing presentation owner publishes exact version JSON/CSS/theme/assets. No package code is executed to discover metadata. Define whether Foundation/file-linked/npm packages can publish through this contract or remain explicitly unsupported.
2. **Complete index:** owner-produced normalized index binds logical resource identities, canonical Definition/export mapping, transitive static module/CSS/resource membership, byte lengths/media/digests and authoritative revision. An index cannot be inferred from catalog timestamps, a folder walk or package version alone.
3. **Seal lifecycle:** choose how staged complete bytes become an irrevocably visible publication, what marks incomplete/failed publication, whether existing versions may ever be overwritten, and how retained publications survive readers. This is the new protocol requiring approval; no persistent schema/location or cleanup/recovery algorithm is selected here.
4. **Mutable activation:** permanent Application-owned activation points to a specific sealed package publication, separate from installed identity. Published presentation selection points to a sealed presentation publication. Both use the existing canonical graph/role ordering or an explicitly approved owner fence; no new global lock authority.
5. **Writer obligations:** list all installation, activation, migration, removal, build, resource, template/settings and external actors admitted as producers. Prevent mutable source writes from changing sealed bytes. A writer that cannot satisfy the contract makes that target unavailable, rather than weakening the guarantee. Define retention/removal under active reads without new unapproved recovery semantics.
6. **Compatibility:** preserve existing editing/install/enable/publish workflows. Existing uncertified installations and legacy presentation versions must refuse P1 closure acquisition until an explicitly authorized owner publication exists; do not auto-migrate, repair, manufacture revisions or silently republish on read.

An alternative **all-writer existing-graph contract** could avoid a new immutable publication lifecycle only if an exhaustive, enforceable supported-writer boundary is approved, including same-version replacement, subprocesses and external file dependencies. That guarantee is absent in the inspected source. Merely declaring those actors inactive is not evidence. This is not the selected recommendation because immutable owner publication better matches reusable Preview/Publish inputs and finite retained capture bytes; neither alternative is implemented.

## Return to D6-R2

After architecture approval, implement and verify the producer contract and then a narrow owner read against disposable fixtures. Only then can D6-R2 acquire original saved Page/Card plus exact sealed package/theme/resource references under original authority, explicit R1 refusal, whole-closure revalidation and cancellation. Production trusted authority/disclosure and a separately approved named operational acquisition remain later gates.

Stop at **D6-P1 Package/Presentation Owner Contract — Acceptance Review Gate**. P1 read implementation is unimplemented and unaccepted; D6-R2 is not resumed. Complete WP5-F, D6 and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.
