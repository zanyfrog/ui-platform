# D6-P3 exact presentation owner, source and writer map

2026-10-26. Ordinary source/template inspection only. No current protected presentation, Page, Component, package, registry, settings or coordination state was acquired.

## Source semantics and responsibility

| Data / interface | Existing owner semantics | P3 handling |
| --- | --- | --- |
| Permanent Application | `applications.ts` returns UUID from app manifest; the trusted registry validates that binding and active `settings.application.status`. Settings do not supply a top-level UUID. | Trusted owner setup supplies the original UUID and canonical roots; published manifest must match. No registry/database is initialized and UUID syntax alone is not authorization. |
| Presentation manifest | `application-presentation.ts` owns type/schema/Application, mutable `activeVersion`, draft metadata and version records. `versions/vN` is distinct from draft. | Complete owner manifest bytes are one sealed resource. Requested positive version must be the selected published record; duplicate versions or missing/changed record refuse. Draft checksum is informational and never membership proof. |
| Published JSON | Owner `versionPath` and JSON checksum of validated published data | Exact JSON bytes and original checksum retained, separately from the new full resource index. No inference that the legacy JSON checksum covered CSS/assets. |
| CSS | Existing `renderPresentationCss` derives a fixed stylesheet plus supplied tokens/custom CSS; published CSS is a separate file | Actual owner renderer function is reused unchanged. Supplied CSS must equal it exactly. Custom CSS, imports, URL resources and non-system fonts refuse the initial subset. |
| App settings / composition | Actual legacy shape has `application.name/status`. `compositionSettings` selects composition-v1 from top-level presentation. Standard source template is composed and includes themes/styles/assets/menus. | Only explicit minimal legacy settings (`application` with name, active status, optional description) are admitted. Composition-based standard template and unknown context fields refuse; no fake settings UUID or default model is introduced. |
| Layout, defaults, heroes, assets | Mutable/normalized legacy source can name navigation, logos, heroes, custom component defaults and copied asset resources | Initial supported presentation has explicit minimal/standard layout, all shell effects disabled, empty navigation/routes/defaults/heroes/assets/typography/custom CSS and complete supported static tokens. Any additional dependency refuses, including a declared asset whose bytes are absent. |
| Legacy active CSS/assets/runtime/composition copies | Derived outputs written separately from manifest transaction; copy errors historically may be suppressed | Not read or certified by P3. The new producer accepts complete explicit staged owner data only; no copy-to-seal path, suppression or live source fallback. Legacy behavior remains unchanged. |
| New seal/index | Presentation owner extension `.uib/presentation-publications-v1` | Four complete resources plus canonical metadata index and content/version identity. Private staging; one final rename; no overwrite, repair or cleanup. This is owner publication metadata, not a parallel catalog. |
| New selected seal | Owner-qualified reference plus generation | Separate from normal `activeVersion`. CAS under existing graph→role order; no legacy activation/selection migration. |

## Existing and admitted writers

| Writer | Existing participation / scope | Seal qualification |
| --- | --- | --- |
| `initializeApplicationPresentation`, `savePresentationDraft` | Existing graph wrappers and presentation role transactions; draft normalization and source history | Bodies unchanged. Not implicit seal producers. Draft save/completion cannot be relabeled as published. |
| `publishPresentation` | Existing graph wrapper; computes JSON checksum, writes version JSON/CSS/copies/derived runtime, then saves active manifest pointer | Body unchanged. No automatic seal integration added. P3 requires an explicit completed owner-staged snapshot with matching record/JSON/CSS and supported context. Ordinary Publish does not certify a seal by itself. |
| `rollbackPresentation` | Explicit historical version to editable draft, under graph | Unchanged. Not a sealed-content rollback or automatic selection update. A new sealed-reference selection may point to retained bytes only through explicit CAS. |
| `uploadPresentationAsset`, `removePresentationAsset` | Byte mutation can precede separately locked metadata save | Not claimed fenced by P3. All asset semantics refuse this subset. No adapter scans these mutable trees to produce partial success. |
| `copyPresentationAssetsToVersion`, `syncDraftAssetsToActive` | Force-copy helpers with suppressed errors; version copy helper itself is not a write-once boundary | Unchanged and not used by the new producer. A new staged write failure refuses; no ignored copy failure can certify new data. |
| Composition/source snapshots and template/settings edits | Relevant existing graph wrappers; broader resource and module behavior | Unchanged. Composed/custom resource context refuses P3. Their bytes cannot be assumed covered merely because some writers participate. |
| Explicit `owner-completed-presentation-v1` publisher | New internal presentation-owner extension; synchronous copies, strict owner-data/semantic validation, graph and R1 root checks, exclusive staged writes, candidate revalidation and atomic final rename | Supported only for this exact resource-free static subset. Caller is a trusted owner, not a browser-selected authority. No route or production caller is wired. |
| P3 `select` / `readSelected` | Existing graph, then canonical selected-role lock, R1 refusal, generation CAS and existing atomic JSON writer | Supported sealed reference only. A stale generation cannot return a new target. Older admitted leases keep their exact publication. |
| External file/asset/source actors | No universal graph or immutable-publication participation established | Not covered or promoted. Mutating legacy inputs cannot change copied bytes. Tampering with private seals is detected/refused; real exclusive namespace permissions remain an operational prerequisite. |

## Exact implementation/dependency map

`application-presentation.ts` imports/re-exports unchanged pure functions from `presentation-format.ts` and additively exports the new owner factory/error. The latter depends on `presentation-publication-contract.ts` → actual pure format functions/shared presentation types, plus the existing Foundation storage API. New graph calls explicitly use `recovery:'refuse'`; owner-root checks and every selected-role lock carry it too. The mode is never replaced by a precheck plus recovering read.

Canonical graph is the existing `visual-runtime-graph-v1`; selection role is physical `selected.visual.json` under the canonical owner root. Staging UUIDs are private writer-owned destinations, not saved identities or a new lock authority. The source owner's final `vN` slot is validated against `pres_N_<index SHA256>`; version directory names alone are never accepted as authority.

No P2 primitive or accepted package implementation was changed/extracted. The same public lease surface (publication ID, immutable index, expiry, copied reads, disposal) and acquisition/retention discipline is retained with presentation-specific version/resource semantics. Package and presentation ownership remain distinct; no joined D6-R2 candidate is produced.
