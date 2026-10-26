# D6-A1 actual activation owner/writer and presentation applicability map

2026-10-26. Ordinary-source inspection only. All named functions below are inspected implementation, not executed services or current operational observations. Exact inspected hashes and decisive excerpts are under `evidence/d6-a1-activation-binding-20261026/`.

## Two effective activation paths

| Path | Existing owning inputs and resolver | Consequence |
| --- | --- | --- |
| Declared UIB extension packages | `packages.ts:getActiveAppPackages` → `getAppPackageCatalog` / `resolveAppPackageCatalog`; `AppPackageDeclaration.enabled/version/resolution`; `chooseCandidate` chooses app/platform discovery candidate | Effective identity includes authoritative Application declaration **and** actual resolved source/candidate/export. Semver, timestamps or a first-preferred candidate are not immutable identity. Catalog reads can initialize manifests/refresh derived state and are not a nonrepairing sealed-binding reader. |
| Installed UI Base web packages, including the canonical Card | `component-registry.ts:installedUiBasePackages`; Application/platform `package.json` dependency name sets; app declaration `enabled:false` exclusion; settings composition mode controls whether platform fallback is allowed; selected `node_modules` package metadata | Explicit source comment distinguishes these packages' `ui.component.json` from UIB service manifests. The resolver appends these packages even when absent from active UIB entries. It does not use the declaration's version/resolution policy in the same way as `chooseCandidate`. `enabled:true` alone does not establish which implementation is active. |
| Core package catalog API | `platform-core/src/package-catalog.ts:enablePackageForApp/disablePackageForApp` mutates catalog `enabledForApps` state | Existing exported surface, but not assumed to supersede the server's app-manifest/native-fallback rules. A1 must not invent one authority by merging derived states. |
| Immutable P2 reference | `PackagePublicationOwner.select/readSelected` records verified seal, original owner and selection generation | A different owning datum. It does not modify either effective activation resolver or redirect runtime module/resource resolution to sealed bytes. |

Effective canonical Card identity must therefore distinguish: permanent registered Application; actual resolver branch and source precedence; effective enabled state; canonical package/Definition/import/export; exact implementation/publication identity; activation generation/currentness. Package version text or factory UUID cannot fill any missing evidence.

## Registered permanent ownership

`DevelopmentApplicationRegistry.byApplicationId/byKey` checks the registration ledger against canonical Application directory, original manifest UUID and active settings. `getApp` obtains UUID from the Application manifest and display/status from settings; neither client key nor P2/P3 factory setup registers an owner. Registry revision digest is not assumed to be a durable activation-event generation. No registry/SQLite or session was initialized in A1.

An actual binding must originate from this existing owner authority, not a new directory-name registry, `enabled:true` callback or browser-selected UUID. Owner mismatch/remap/disable must invalidate the read independently of seal integrity.

## Writer inventory

| Supported existing surface / actor family | Can change effective activation by | Current fence / required treatment |
| --- | --- | --- |
| `enableAppPackage`, `disableAppPackage` | Writes enabled/version/resolution declarations and history through `setAppPackageDeclaration` | Inspected routes call them without the canonical graph wrapper. Any future bound activation must invalidate before a relevant change; re-enable cannot resurrect an old binding. |
| Direct `setAppPackageDeclaration` | Rewrites app manifest declaration; only atomic JSON replacement is supplied | No existing activation generation or seal field. Timestamp changes are not a fence. All callers need the same owner transition rule. |
| `ensureAppManifest`, `writeInitialAppManifest` | Initializes or reconstructs owning declarations during normal discovery/creation | Legacy workflow only; a read cannot manufacture missing sealed eligibility or adopt a copied manifest as registered ownership. |
| `recordFoundationImport`, `replaceFoundationImport` | Rewrites import/source declarations affecting runtime installation/resolution | Must be included in any activation writer scope. They are not P2 binding transitions today. |
| Manual folder/archive installer | Publishes a previously absent app/platform package by staged rename; changes candidate membership/precedence | Rejects an already existing destination, but a newly preferred candidate can still alter effective resolution. It has no encompassing capture graph contract on inspected paths. |
| npm/URL acquisition and GitHub/Foundation install/update/refresh/removal | Creates or removes candidate/source trees or changes source/package membership | Legacy/nonparticipating classes for sealed capture unless separately qualified. Commit labels and catalog metadata do not prove installed byte identity. |
| Foundation migration | Updates dependencies/imports, runs npm install/build, then records history; on failure restores old package/manifest/lockfile bytes | Restoration is not proof installed/build output was atomically restored. An activation generation embedded only in a blindly restored manifest could be rolled back too. No migration was run. |
| npm/build/file-linked package and external file actors | Replaces same-version module/Definition/export/resource bytes or changes symlinked source output | No existing enforceable Foundation participation or immutable installed-root guarantee. A graph-held metadata read cannot certify them. Exclusion must be real and cause refusal, not an undocumented assumption. |
| App/platform dependency declaration writers | Changes names or roots searched by `installedUiBasePackages` | Needed even if UIB app declaration is unchanged. App-first/platform fallback and composition mode are part of the actual resolution rules. |
| Application settings/template changes | Changes active status or composition mode/roots; may update dependency-related source | Some paths already use graph admission, but that does not cover downstream installs/builds or private external writes. Relevant owner/context changes must invalidate. |
| Core catalog enable/disable/refresh/save APIs | Changes catalog enable state or discovery selection/timestamps | Derived/public API state cannot be mistaken for the authoritative native activation record. Do not refresh/repair on A1 reads. |
| P2 publication/selection | Changes only new immutable publication/ref metadata under the existing graph/role order | Supported for the accepted P2 contract; does not establish current effective activation. Seal selection generations remain distinct. |
| Registered owner remap/manifest UUID change/Application disable | Changes or invalidates permanent owner context | Existing registry/owner must reject mismatch; no owner transition or permissive factory rebind is allowed. |

No generic in-place package replacement/uninstall endpoint was established by the inspected source search. That does not imply immutability: the concrete Foundation/npm/build/removal and dependency-precedence paths above are sufficient to change effective activation. Exporting a copy to a different Application is not treated as mutation of the original active Application.

## Presentation applicability, independently

`PresentationPublicationOwner.select/readSelected` proves exact P3 publication/selection generation. Normal `application-presentation.ts` owns mutable `activeVersion`, original version record/JSON/CSS and source role checksum. Publish runs under the existing graph but writes derived files before the final manifest role transaction; asset helpers have broader legacy behavior outside the P3 subset.

A compatible applicability check for the restricted P3 subset can compare the original owner and normal completed active-version record, exact admitted JSON/CSS/settings bytes, P3 index and P3 selected generation under the existing graph/role authority. Draft markup/checksum, a historic sealed manifest or matching version label alone are insufficient. Composed templates/assets/custom semantics must continue to refuse. This is a defined read-composition requirement, **not** evidence that new presentation publication or a new global lock is necessary.

## Reader composition

P2/P3 public reads each acquire the canonical graph. Nested admission is explicitly rejected by Foundation. An owner-maintained read-under-existing-admission façade must verify actual canonical scope/lifetime, retain R1 refusal and role locking, and reject mismatched, stale or caller-forged scope. A boolean or caller-created token is insufficient. Such a helper can be additive once activation semantics are settled; no lock bypass helper is implemented here.
