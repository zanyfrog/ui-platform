# D6-P2 package owner, propagation and writer support

2026-10-26. Package-owner implementation only. No new registry or Preview-specific source authority.

## Implementation map

| File / boundary | Implemented responsibility |
| --- | --- |
| `src/server/package-installer.ts` | One additive re-export of the package-owner extension. Original installation body is unchanged, including staging, catalog/history and archive behavior. No automatic seal hook. |
| `src/server/package-publications.ts` | Actual internal owner producer, exact-index reader, bounded memory leases and separate generation-checked selection reference. Trusted setup includes original permanent Application ownership and canonical owner/graph roots. It does not resolve those through a new catalog or grant authority. |
| `src/server/package-publication-profile.ts` | Fixed accepted native Card byte/membership/edge and canonical Definition/export profile. Seventeen exact resources; canonical ownership, source owner and installation owner are distinct. No package imports or executable discovery. |
| Existing Foundation storage boundary | Actual `withRoleBundleGraph` → existing canonical graph lock → recovery-free root checks. Selection additionally uses `withArtifactLock` for canonical `selected.visual.json` under graph→role order and existing `atomicWriteText`. No accepted Foundation file changes. |
| Producer | Synchronous buffer copies and exact profile validation → Foundation graph → owner root refusal → private staging/exclusive flushed writes → candidate verification → atomic final rename. No source acquisition from mutable installed paths. |
| Reader | Explicit sealed ID → Foundation graph → owner root refusal → exact canonical index/membership/length/digest validation → private copied bytes → lease. |
| Selection | Explicit validated seal + expected generation → graph → selection-role lock → owner refusal check → compare-and-set atomic JSON write. ReadSelected requires exact current generation. This is a new sealed-reference API, not legacy package enablement. |

The profile carries the original canonical Card Definition ID, `@ui-base/ui` 0.5.1, actual `@ui-base/ui/card` / `UibCard` / module mapping, original canonical platform ownership and explicit null Definition revision. Application ownership of staged publication/selection does not transfer canonical Definition ownership. Historical native closure fingerprint and the new portable profile/index digests are separate fields; path-normalizing the new index does not rewrite historical fingerprints.

The retained Definition's alias metadata does not admit broad package barrels or other exports. Only the exact pinned Card/direct native entry closure is supported. These are package implementation bytes, not permission to use excluded native capabilities or a complete Application theme. Future consumers must reject unsupported entrypoints/semantics rather than follow unrelated exports found in the retained package declaration.

## Producer/writer matrix

| Writer class | Initial support and behavior |
| --- | --- |
| Explicit existing Application package build owner supplying `owner-staged-native-card-v1` complete staged byte snapshot | Supported only for the exact pinned profile/revision and all required resource bytes. Producer is internal, not reachable through a new endpoint. Owner setup must come from trusted server bindings; UUID syntax alone is not registry/authority qualification. |
| `publish`, `select` on the extension | Participate in the existing graph. Selection also uses the existing role lock. Concurrent publishers cannot overwrite one content identity; concurrent selection CAS has one winner. No new global lock or ownership model. |
| Existing manual installer and URL acquisition | Legacy behavior preserved; does not generate seals automatically. Folder/archive/npm/GitHub source classes are not admitted as dynamic sealed producers. No invocation against actual environment. |
| Existing enable/disable and core catalog APIs | Legacy behavior preserved. They are not certified sealed-selection writers and do not change the new selection reference automatically. Production activation integration is deferred. |
| Catalog refresh/repair, missing-manifest initialization | Unsupported for seal acquisition/production; readers never call them. Existing non-Preview behavior remains unchanged. |
| Foundation source install/refresh/update/migration/removal, npm installs and arbitrary builds | Unsupported producer classes for this increment. Their existing workflows are neither modified nor described as graph-fenced. Commit/version labels cannot substitute for the pinned byte profile or a future producer qualification. |
| Mutable package replacement or same-version source edit | Cannot change a valid existing seal. Reusing the content identity refuses; changed bytes fail the fixed profile. Future profile changes require a separately admitted profile and different publication identity; not an in-place replacement. |
| Asset/presentation/template/settings writers | Not sealed by P2. All original workflows remain unchanged. Presentation implementation and coordinated resource publication are the next separate increment. |
| External filesystem/build actors | Not asserted to participate in Foundation. They may change legacy mutable files without affecting copied leases/sealed identity. Unauthorized tampering with the private sealed namespace causes digest/membership refusal, not acceptance, repair or fallback. Exclusive namespace ownership is a required later operational qualification. |

No ordinary consumer can promote a legacy directory or partial staging file into a returned valid lease: only final publication identities are read, and all expected index bytes and resource hashes must match the fixed owner profile. Old selections never redirect to current mutable package paths. No lease or index is an access token.

## Deployment limits

This is source implementation and isolated verification, not deployed package qualification. The strict check is no-emit; installed `dist` artifacts were not rebuilt or activated. A later trusted adapter must bind the real registered permanent Application and exact canonical graph/owner roots, authorize before any protected acquisition and reauthorize disclosure. No such production adapter or endpoint is enabled here. Trusted setup is an internal precondition, not a permissive production authority implementation.
