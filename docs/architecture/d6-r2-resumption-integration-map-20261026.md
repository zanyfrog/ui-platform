# D6-R2 resumption — exact owner/source/graph/authority integration map

2026-10-26. Ordinary implementation and accepted evidence inspection only. No product module or current owner/source/session/store was executed. Exact source hashes are in `evidence/d6-r2-resumption-20261026/source-admission.json`.

## Original identity and source owners

| Boundary | Existing actual contract | What it proves / remaining obligation |
| --- | --- | --- |
| Accepted request | `src/shared/saved-preview-request.ts`: original permanent Application UUID/key, owner-qualified saved Page, committed hash/node, canonical component/package/version/import/export/Definition revision, owner-selection context and source/selection generations; strict structural parser | Preserves original identity and retained provenance, not current server authority. Editor source/selection generations are not P2/P3 selection generations. No publication ID or activation certificate may be invented from these fields. |
| Original source-owner selection | `src/client/visual-artifacts/saved-card-target.ts`: retained committed baseline plus hardened shared parser/validation and canonical package metadata | Identifies a retained saved Card. Consumer cannot promote current draft/focus/DOM into committed identity or treat this as fresh server acquisition. |
| Permanent Application resolution | `DevelopmentApplicationRegistry.byApplicationId` / `byKey`, original manifest/settings checks and `appPath` | Registry is the reusable permanent owner authority. A path/key or supplied factory UUID is insufficient. Source inspection only; no SQLite/store/session initialization. |
| Saved Page | `VisualArtifactService.list(options)` / `read(locator, options)`, Application-owned `/src/pages`; exact roles `.html/.css/.visual.json/.fixtures.json/.functions.ts` | R1 mode propagates through actual Foundation role/root reads. Future capture must resolve permanent Page metadata uniquely within complete admitted membership, preserve exact required roles, and reject absent roles rather than certify legacy `?? ''` projections as complete bytes. |
| Hardened parser/validator | `packages/visual-artifacts/src/source.ts` / `validation.ts`; actual saved target owner uses these | Reuse exactly for duplicate/ambiguous node/Component refusal and supported Card semantics. No new scanner, parser or surrogate identity is needed or authorized. |
| P2 package publication | `PackagePublicationOwner.read(id,leaseMs)` / `readSelected(expectedGeneration,leaseMs)` | Verifies fixed 17-member native Card closure, original package/Definition ownership and exact `@ui-base/ui/card` / `UibCard` mapping, explicit null Definition revision, content identity and immutable bytes. It is not a current Application activation grant/binding. |
| P2 selection | Private `selection()` owns `package-publication-selection-v1`, owner, generation and publication ID | Explicit sealed reference only; accepted P2 deliberately does not modify normal package enable/disable. Its generation cannot be substituted for a current activation generation. |
| Real package activation | `packages.ts:getActiveAppPackages` → `getAppPackageCatalog` → `ensureAppManifest` / mutable discovery / `refreshPackageCatalog`; `AppPackageDeclaration` has enabled/version/resolution/timestamps | **Missing binding:** no exact selected seal ID or authoritative activation generation is present. Catalog resolution and live module paths do not certify the P2 seal corresponds to current Application activation. |
| P3 publication | `PresentationPublicationOwner.read` / `readSelected` plus `presentation-publication-contract.ts` | Verifies explicit completed restricted static snapshot, original Application, published-version record, JSON/CSS/settings/manifest membership and copied bytes. It does not qualify composed/asset/custom-style contexts. |
| P3 selected reference vs normal active version | New generation reference is distinct from ordinary presentation manifest `activeVersion` | Need an explicit owner crosscheck when claiming applicability to the current saved source. Historical sealed manifest/version is not a fresh observation of normal selection. No automatic adoption of P3 selection is allowed. |
| Trusted request authority | `V1DevelopmentIdentity.captureAdmission` captures original server session/resource and checks original continuity/current policy | Reusable source contract; qualified Preview closure admission and invalidation adapter remains absent. Client subject/session echoes, factory setup and nonproduction fixtures cannot become grants. |

## Canonical graph and reader composition

Existing graph identity is `visual-runtime-graph-v1` under canonical `platformComponentsRoot`. `withApplicationMutation`'s Application argument does not select another graph namespace. Graph precedes individual canonical role locks. R1 `recovery:'refuse'` must survive every graph/root/list/read/role edge; it is not ambient.

Both P2 and P3 public `read` / `readSelected` methods call their private `graph()` helper, which unconditionally acquires `withRoleBundleGraph`. Foundation explicitly rejects nested graph acquisition. Calling them inside a new outer capture graph fails; acquiring their leases outside the outer graph and skipping current selection-generation rechecks does not satisfy the requested whole-capture fence.

This is a **composable-reader implementation gap**, not evidence a new lock authority is required. A bounded owner-maintained read-under-current-admission helper could reuse the existing authority and private checks, provided it proves the exact active canonical scope, preserves cancellation/cleanup/lease rules and cannot bypass acquisition. It would be a routine additive integration once the required source/activation facts are defined. No helper or permissive admission token was fabricated in this stopped increment.

## Writer participation and current activation

Package `enableAppPackage` / `disableAppPackage` update app declarations through `setAppPackageDeclaration`. Inspected app routes call these functions directly. The declaration writer atomically writes JSON, without encompassing Foundation graph admission on those paths. A capture graph therefore does not fence all actual activation changes. P2's new seal/selection writers do participate, but the accepted writer matrix expressly excludes legacy activation from that guarantee.

Package installation, file-linked/npm/Foundation migration/build actors also remain legacy/unqualified producers, as previously documented. P2 seals solve immutability of the admitted implementation bytes; they do not retroactively bind these actors or current activation to those bytes. Repeating a mutable activation read or comparing version labels cannot supply an authoritative generation or rule out ABA changes.

Presentation Publish/metadata has participating graph paths, while asset copy/upload behavior remains outside P3's restricted subset. The initial R2 target would need to fit P3's explicit minimal legacy settings and resource-free semantics. The composed standard template cannot be silently converted to qualify.

## Required order, once the missing contracts exist

Trusted original server admission → registered permanent Application resolution → one canonical R1 refusal graph → authoritative activation/selection bindings → complete saved Page owner discovery/read → existing hardened parser/validator → exact already-qualified P2/P3 reads under the same admission → supported Card semantic/role closure → original Page/membership/activation/seal/selection/authority revalidation → immutable candidate with copied bytes and bounded lifetime.

Any absent identity, role, membership, dependency, activation binding, owner fence or currentness fact refuses. No production request, capture function, endpoint or renderer success is implemented by this map.
