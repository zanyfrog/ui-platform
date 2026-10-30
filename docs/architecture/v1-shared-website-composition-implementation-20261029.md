# V1 Shared Website Composition — Implementation and Verification

2026-10-29. Working implementation record; the separate Acceptance Review Gate submission follows completion of the final operator-assisted iframe Reload check. **No acceptance declaration, commits or pushes.**

## Bounded workflow

One saved Shell, `art_a8ca1455-8234-424c-ac66-6480701267f1`, is reused by the existing Home, About and Contact Pages. It owns the header, Application-name branding binding, secondary branding text, one identity-based navigation Menu and footer. Their unique content remains inside each Page's own `region-main`; no shared markup was copied into Page HTML.

| Page | Original artifact identity | Permanent Route identity | Public route |
|---|---|---|---|
| Home | `art_47c10a1f-248d-4404-ac39-ee46a7db6c48` | `route_9fc1fb85-c517-4b37-bcbe-97a98def5701` | `/home` |
| About | `art_831b8cb4-a60f-4264-97ed-99d33205857a` | `route_e1d92d04-1b84-4371-bfb5-5d1b3c7d57d9` | `/about` |
| Contact | `art_380e4d4e-6289-413a-99b3-c7d345030806` | `route_c560f64c-17ff-45ca-8443-ff800d9f8de3` | `/contact` |

Ordinary Chrome controls created and selected the Shell, enabled the approved presentation fields, adopted the three saved Pages, created the Menu, selected its Page destinations and placed it once in the header. Shared branding text, the About label and footer were subsequently edited once and observed on all three website routes. Shell context remains locked in the Page editor and edited in the Shell editor.

## Settings and explicit native dependency admission

The full required settings contract was checked before configuration. It needs only the approved model, actual defaultShellId, existing Application name, assetsRoot, siteStyles and empty theme. Optional branding/defaultMenus/shellConfiguration fields were not introduced. The original settings bytes and SHA-256 `4e18fc40680c03c56e30046165acebbe19b408c9e7a167ca87d1958dbaf62cf5` remain preserved. `settings-before-after.json` records the authorized presentation addition and unchanged settings outside it.

The earlier live failure is preserved in the dependency blocker report. Composition mode originally removed the Platform native fallback required by six retained plain Pages. The authorized correction uses the existing Application package declaration and Enable control, with explicit `@ui-base/ui`, compatible version `^0.5.1` and `platform-only` resolution. Only the real installed Card and Panel entries are projected from their native `ui.component.json`. No Platform service-package manifest was fabricated, no package was installed, and no new settings fields or general fallback were introduced. The actual package descriptor, component identities, canonical implementation modules and physical paths are checked. Disabled/version-incompatible declarations do not activate. Direct native package asset requests are restricted to the two admitted entry modules.

The existing Application package catalog represents this native manifest separately from service-package discovery. Enable uses the existing application mutation boundary and rechecks management authority before writing. The package UI's optional Foundation-source 403 no longer hides independently authorized Application package controls; the underlying denial and all permissions remain unchanged.

`saveCompositionSource` now calls discovery with the proposed presentation model before validating a settings candidate. A transition without explicit native admission refuses before changing settings, rather than validating with the old catalog. Tests cover that refusal, unchanged source, denied authority, incompatible versions and explicit successful admission.

Before any real Page adoption, an authorized normal-Chrome GET of the actual enabled composition returned all thirteen Pages and thirteen routes successfully. A contemporaneous filesystem check proved all 79 original Page files were unchanged. Evidence: `normal-native-restored-graph.json` and `native-restoration-preservation.json`.

## Source changes

- Application setup uses the existing settings service, expected-hash check, whole-Application validation and management authorization. Workspace-level setup lives in the Application toolbar; the focused artifact transport's create/link restriction remains intact.
- Plain adoption extends existing Change Page Shell: it requires a real main Region, wraps the original HTML bytes in one new managed Page-owned container and allocates a Route identity in the complete candidate transaction. It preserves existing identity, content, bindings and layout; subsequent Shell changes retain Route identity.
- Existing HTML insertion and Text content controls author the shared Shell. Header/nav/footer choices and a normal Menu-name dialog support the workflow without manual source editing or native-prompt dependence.
- Shared runtime pathname navigation is enabled for admitted Shell and composed Page roots through the existing host flag. Generated `_self` Menu anchors work alongside Page literal links. Existing modified-click/download/other-target behavior and plain fragment scope remain.
- Saved Design Preview uses the existing authorized saved-source capture, exact Page revision requests, disposal and iframe-owned logical URLs/history for composed destinations. Focus enters the Page's main Region.
- The Builder's development configuration excludes mutable Visual workspace outputs from prebundling, as the reference host already does. This resolves the observed stale-runtime cache failure while preserving old caches; it changes no Application settings, identity policy, autosave or recovery behavior.

## Recovery-refusing disposable host

The composition plugin was not launched until its development source-root preflight explicitly requested `recovery: 'refuse'`. Existing refusing role reads, graph admission, source revision rechecks, helper/dependency validation and managed-role HTTP/import protection remain. No second lock or renderer was introduced. The three qualified source-read modules remain unchanged.

The host retains the exact disposable Application/marker identity, physical roots, strict filesystem boundary and the explicit native declaration. It refuses other Application dependencies/declarations and checks the owner/declaration again on composition capture. Native inputs are hash-pinned and physical. Its explicit manifest contains only Card and Panel, with their canonical descriptors unchanged; a pinned physical source snapshot supports canonical relative module paths. The first attempt rewrote descriptor paths and was correctly refused by the native registry. That failure and the corrected input snapshots remain preserved; the registry validator was not relaxed.

`host-final-admission.json` records successful refusal-mode preflight on the actual live source roots, current plugin hash, unchanged canonical native descriptors and pinned physical inputs. Negative pending-journal tests run only in new detached fixture roots, for each of the four source collections; journal bytes remain unchanged. No live journals or locks were manually changed or recovered. Application serialization is a cooperating-writer boundary, not a multi-artifact atomic commit or exclusion of unrelated filesystem writers.

## Normal Chrome evidence

`normal-website-navigation*.json`, `normal-shared-propagation.json` and `normal-composed-about.png` record:

- Home/About/Contact composed rendering with the same header, identity-based Menu, branding and footer.
- Mouse and Enter navigation, active Menu indication and focus on the new Page heading.
- Existing Page-owned literal links.
- Direct URL and full Reload, Back/Forward and restoration of Home's nonzero scroll position.
- One shared branding/Menu/footer edit appearing on all three routes.
- Preserved plain initial-fragment navigation: `#features` focuses the section and scrolls to it.
- No horizontal overflow at the actual narrow Chrome viewport of 434 CSS pixels (requested override 390; Chrome reported 434); browser sizing was reset.

Actual saved Preview rendering shows the same composed content. Mouse and Enter navigation and iframe Back/Forward change the child URL/revision while the Builder parent stays `http://localhost:5374/`. Final revision and operator Reload evidence is recorded separately when that check completes. Fixture demonstration and restricted Saved Preview are not treated as this saved Design Preview.

The successful normal-Chrome Preview results are preserved as `normal-composed-preview-transcript.json`, explicitly transcribed from the actual tool outputs. The first array-export helper wrote an empty array; that failed collection remains in `normal-composed-preview-navigation.json`. `saved-preview-revisions-final.json` compares the three observed URL hashes to the current saved role-file bytes and passes. This is not relabeled as a new browser run or raw network capture. After the later operator restart, Chrome automation began timing out on focus/read/navigation commands, including after documented tab reconnection and an automation-session reset. No browser security, Windows settings or permissions were changed. The operator reports that the stale native Menu prompt is no longer showing; actual iframe Reload has not yet been confirmed. The last operator request gives the complete ordinary workflow to reopen the saved Preview and finish that check.

## Focused verification

- Thirty passing accepted admission/anchor/Page-navigation tests and strict scoped typechecking: `evidence/v1-mixed-page-admission-20261028/run-1793301406044`.
- Actual registry, native package declaration, settings service and Foundation mutation in detached roots: `native-1793300955567/result.json`. Includes prospective refusal, authority/version refusal, unchanged failed settings, exactly two admitted contracts, enabled graph validation, disabled handling and denied unadmitted module paths. No native implementation was executed in that fixture.
- Actual role-service setup/adoption checks: `run-1793301048411/result.json`.
- Actual composition-plugin refusing source capture, pending-journal refusals and explicit-contract checks: `run-1793301048411/host-read-result.json`.
- Thirteen-Page snapshot captures and actual service-capture checks remain retained with their scoped qualifications. They use detached owners/package inputs and do not establish production filesystem or live authority.
- Actual composed Preview client/runtime lifecycle checks in isolated DOM: `native-composed-preview-lifecycle.json`; fake saved transport, separately supplemented by normal Chrome evidence.
- Server typecheck and client production build pass. The broader client typecheck retains the same seven unrelated diagnostics; no changed file adds a diagnostic. Visual package build passed. The two historical Vitest suites did not collect because of Windows EPERM and were not retried.

## Preservation and remaining limits

`final-preservation.json` proves six authorized Page role changes and 73 unchanged original files. All ten unrelated plain Pages remain byte-identical. The adopted Pages retain the original HTML bytes inside their wrappers, original managed IDs/order, artifact identities, route paths and metadata/layout except the explicit Shell/Route membership. The three qualified read modules and settings outside presentation remain unchanged.

`history-preservation-final.json` verifies all 513 original blocker-report/evidence/verification files against the prior exact inventory. New continuation outputs are separate; historical reports, failed attempts, inventories and source snapshots remain. Earlier temporary rewrites of verification output were restored to their recorded bytes, with continuation results retained under new names.

The Shell is a basic semantic website composition, with empty theme/site stylesheet settings; this is not a new theme designer or responsive navigation framework. Existing manual-layout warnings and unrelated generic Form/Workflow/legacy validation limitations remain. The disposable host is bounded and does not establish production deployment, arbitrary component execution, unrestricted routing, cross-Page fragments, Shell/Region route targets or comprehensive security qualification. Normal-browser unsaved-draft Preview protection remains deferred and unaccepted. No I-AM, permissions, user definitions, platform settings, autosave, protected Component roots or Windows-security changes. No commits or pushes.
