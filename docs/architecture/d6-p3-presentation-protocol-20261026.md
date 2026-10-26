# D6-P3 Gate A/B — presentation owner seal and refusal contract

2026-10-26. Narrow implementation admitted under the approved owner-seal architecture. No new Foundation lock, recovery/transaction mechanism, migration or automatic integration is needed.

## Real owner data and first subset

Existing `application-presentation.ts` owns manifest, published `versions/vN/presentation.json` / `application.css`, draft, assets and mutable active-version pointer. Its checksum hashes presentation JSON only. The new explicit internal producer accepts a completed owner-staged snapshot: original Application UUID, version, and exactly four resources: `publication.manifest.json`, `presentation.json`, `application.css`, `app.settings.json`. These are complete bytes supplied by the existing owner, not fetched from current stores or inferred by a consumer.

The manifest must name that permanent Application, contain one unique matching published-version record, and select the requested positive version as active. All version numbers must be unique; record checksum must equal the original owner checksum of parsed published JSON. A draft exists only as informational manifest metadata; no draft markup, default theme or optimistic save result establishes publication. A matching draft checksum is insufficient. No read automatically seals a legacy version.

The supported static Card presentation subset is explicit schema 1.0.0, nonempty name, supported static color/length/system-font tokens, empty typography/component defaults/assets/heroes/custom CSS, and a fully specified minimal/standard layout with no routes/navigation/logos/footer effects. Every supplied field is checked; no normalization may silently repair/drop source. App settings must use the actual legacy owner shape `application: {name,status:'active',description?}`. Permanent UUID remains bound through trusted setup and the published manifest, never invented in settings. Presentation/composition/theme/resource models or unknown settings refuse; the current composition-based standard template is therefore unsupported. The owner CSS must equal the existing `renderPresentationCss` output exactly. Its fixed stylesheet and supplied tokens have no external dependencies. No resource is silently omitted: any asset declaration, missing CSS, URL/import/font dependency, custom style, function, composition or other semantics refuses this first subset.

The existing pure default/validation/CSS functions are moved byte-for-byte into `presentation-format.ts`; the existing owner imports/re-exports them. Their behavior and all normal Publish/edit/selection function bodies remain unchanged. The new seal API is an additive owner export with no endpoint or automatic Publish hook. Trusted setup supplies original Application ownership and canonical owner/graph roots; syntactic UUID checking is not authority qualification.

## Persistent index and visibility

Namespace: owner-root `.uib/presentation-publications-v1/{staging,sealed,selection}`. Private UUID staging holds exclusive flushed, read-only blobs named by SHA256 and canonical `index.json`. Schema `presentation-publication-v1` includes original owner, explicit producer/subset, exact published version/record, JSON checksum and complete four-resource index with media/length/digest and known dependencies. No credentials or grants are manufactured; settings are restricted to admitted nonsecret identity/name metadata.

Publication ID is `pres_<version>_<SHA256(canonical index)>`. The final slot is `sealed/v<version>`. One existing graph-held atomic directory rename is the sole visibility point. The version slot is never overwritten: exact duplicates and same-version changed content both refuse. No separate version catalog is introduced. A reader validates both the ID digest and version slot; a directory label alone proves nothing. Unsupported/malformed index, extra/missing members, unsafe links, changed bytes or wrong owner refuse.

Before rename, interrupted candidates remain invisible and retained. At rename, a complete seal commits; cancellation/IO uncertainty racing afterward may refuse the call while complete retained bytes exist. It cannot auto-select or revive an old request. No rollback, recovery, stage completion or cleanup follows. Failed writes/copies are errors, never suppressed.

## Selection, retention and Foundation ordering

New sealed selection schema `presentation-publication-selection-v1` contains original owner, exact seal and monotonic compare-and-set generation. It is separate from legacy `activeVersion`, draft and immutable version identity. Changing either legacy draft or normal active version does not automatically update it. Existing graph (`visual-runtime-graph-v1`) → canonical selected-role lock uses explicit R1 `recovery: 'refuse'`, including owner-root refusal checks. Legacy unrelated callers retain their defaults.

Each acquisition is finite, positive and at most five seconds. Admitted filesystem work checks cancellation between operations; the budget bounds waiting rather than pretending to interrupt an admitted OS operation. Reader lease is explicit, monotonic, positive and at most 30 seconds; metadata is deeply frozen and each access returns fresh bytes. Expired/canceled/disposed leases refuse. Existing admitted leases retain exact bytes through selection changes; a new read with stale generation refuses.

Seals are retained indefinitely. No cleanup/delete/GC API or timer exists. Read-only flags and write-once owner API discipline prevent supported in-place mutation; unauthorized filesystem tampering is detected/refused, not claimed impossible under arbitrary host permissions. Private namespace permissions/atomic visibility require later operational qualification.

## Refusals and compatible scope

Typed generic outcomes distinguish invalid owner/input; unsupported producer/content; incomplete membership; unpublished/draft/version/checksum mismatch; existing version; changed bytes; missing/unsealed data; stale selection; cancellation/expiry/disposal; busy/unresolved/unsafe/recovery-required admission; and IO uncertainty. No protected path, PID, journal content or underlying cause escapes. No fallback to default-mode recovery, current mutable resources or a substitute theme.

Supported producer is explicitly `owner-completed-presentation-v1` supplying a closed newly staged owner snapshot. Existing asset/publish/copy/overwrite/template/settings actors remain legacy writers, not asserted to participate in sealing. Their mutable files cannot mutate copied leases or valid seal identity. The initial subset excludes all asset/composition/resource writers by refusing those semantics, rather than pretending they are coordinated. General presentation sealing requires a later expanded owner/writer/resource contract.

Tests must use actual pure owner functions plus the new owner extension and actual Foundation primitives on named disposable roots. Exact imports/setup/side effects are admitted before execution, serial, zero retries. No protected acquisition, operational publication, D6-R2, production authority, renderer/CSP/L1/L2/L3 or package-seal changes.
