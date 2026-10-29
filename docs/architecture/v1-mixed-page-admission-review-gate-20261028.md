# V1 Page Builder — Mixed Plain/Composed Page Admission Review Gate

2026-10-28. **Bounded prerequisite implementation and verification submitted for review. Not accepted or closed. Shared Website Composition remains paused.**

## Result and authoritative distinction

One existing metadata-based rule distinguishes plain and composed Visual Pages. A Page with neither shellId nor routeId is plain. Declaring either enters composed admission and requires both valid identities, a real Shell and valid Region membership. Incidental HTML or file location never implies adoption. Plain Pages carrying Shell Regions or nonempty Shell Menu overrides refuse precisely instead of silently discarding that content.

Every Page remains in the composition definition and public-route capture. Plain routes have no invented Route identity; CompositionRoute.routeId is optional. Plain Page identity, dependency and canonical path checks still run. Composed Pages retain their strict Route/Shell/Region checks. Existing parameterized composed routes resolve concrete literal links through the existing matcher, with static-path precedence; incoming-reference guards protect their concrete links during route changes/removal. Public route signatures and composed Route identities remain unique across the graph.

No actual Page, settings file or Shell was changed. The real Home, About and Contact remain plain and byte-identical to their accepted saved revisions. Adoption, Region wrapping, Route-ID allocation, Shell setup and shared navigation implementation remain outside this prerequisite.

## Consistent consumers

| Source | Change |
|---|---|
| `packages/visual-artifacts/src/page-admission.ts` | Pure shared metadata classification, membership validation and all-Page route capture. Exported through the existing package barrel. |
| `composition-validation.ts`, `composition.ts` | Keep all Pages visible; composed-only membership requirements apply to composed Pages. Plain routes retain Page identity/path without synthetic Route IDs. Validate canonical literal route references across Pages and Shells, and Page/Route Menu targets. Preserve independent diagnostic collection and strict dependency validation. |
| `src/server/application-composition.ts` | Capture all Pages and apply the shared membership rule; only composed Pages undergo Shell projection/Region-map checks. Whole-graph validation remains mandatory. |
| `src/server/visual-candidate.ts` | Apply normal route-change, incoming-reference and changed-link validation to either Page kind. Mixed targets are admitted only under a validated composition definition. Existing identity, syntax, authority and revision rechecks remain. |
| `src/server/index.ts` | Page deletion checks surviving literal references for either kind. For a composition application it also validates the graph with the proposed Page/route removed, retaining real Component and package validation. Uses the existing application mutation boundary. |
| `src/server/visual-preview.ts` | Page reads capture and validate application composition when enabled, including selection of a plain Page. Existing related Shell-read authority is required for that graph capture. Plain selection returns the plain projection; composed selection returns its Shell projection. Exact saved-hash and final graph rechecks remain. |
| `revision-composition-vite.ts` | Existing definition capture keeps every Page and derives its route records through the shared helper before the same whole-graph validator. No recovery or root-admission policy was changed. This plugin was not launched. |
| `runtime.ts`, `menu-controls.ts` | A plain Page bound to a mixed graph uses the existing plain mount path, while a composed Page uses the existing composed mount path. Route-identity choices omit entries without a Route ID; Page-identity choices still represent plain Pages. No new renderer/router or navigation workflow was introduced. |

## Verification

`node scripts/verify-mixed-page-admission.mjs` passed in `evidence/v1-mixed-page-admission-20261028/run-1793243118840`:

- **30 passing focused tests**, including the 16 prior anchor/Page-link/editor-source/Foundation regressions and 14 mixed-admission tests.
- All thirteen existing plain Pages are validated from byte-preserved source snapshots with their previously authorized recorded package contracts. All thirteen remain visible with no Route-ID allocation.
- Hypothetical Home/About/Contact composition in detached fixtures coexists with ten unchanged plain Pages. An all-composed fixture remains valid. Missing/partial identities, missing Shells, absent/unmatched Regions, duplicate Page identities/routes, duplicate composed Route IDs, invalid references and missing Component contracts refuse.
- Mutation checks admit valid cross-kind references under composition and reject dangling links and unsafe proposed removals. Menu Page targets can address plain Pages; Route targets require real Route identities. Malformed composed candidates retain independent diagnostics.
- Actual shared-runtime anchor/literal-path regressions, an additional registered mixed-graph plain/composed rendering fixture, and the actual Preview-client lifecycle fixture pass in isolated DOM. The mixed fixture proves that the same registered graph selects the plain mount for a plain Page and the existing Shell/Region mount for a composed Page. Fake saved transport is not normal-browser or website-host evidence.
- **Zero strict scoped typecheck diagnostics** for the included source/runtime/editor/Preview/role-service inputs.

`node scripts/verify-mixed-capture.mjs` passed in `capture-1793243036840`. It executes the actual `compositionWorkspace`, `visualPreviewRevision` and `prepareVisualCandidate` functions against detached role-bundle doubles and fixture-only settings files for all-plain, three-composed and all-composed cases. Each capture retains thirteen Pages/routes. Home, About, Contact and the anchor Page select the expected plain/composed Preview projection. Normal candidates validate; dangling changes, stale expected hashes and denied related-source authority refuse.

Those service tests use explicit recovery-refusing read/graph doubles and test-only reuse of prevalidated fixture syntax. They do not establish filesystem locking, production authority, ownership admission or host qualification. Existing focused Foundation tests separately cover the established cooperating-writer boundary. No composition-plugin load or recovery-enabled website-host reader was executed.

The Visual Artifacts package build and full server typecheck pass; logs are in the new evidence directory. The broader client typecheck still reports the documented unrelated native fixture declaration errors and `src/client/main.ts:588`; changed scoped inputs pass. The attempted legacy Vitest suites `application-composition.test.ts` and `builder-v1-wp5-a.test.ts` failed before collecting tests because temporary-file rename was denied (EPERM). They are not claimed as passing. No Windows setting/elevation workaround was used. The relevant malformed-diagnostic regression is covered by the isolated runner. Its existing native fixture emits the known IIFE import.meta warning.

## Compatibility and remaining limits

- The composition public-route type now permits absent Route IDs for plain Pages. Consumers needing a Route identity must filter those entries or refuse precisely; they must not invent one. Page-identity destinations can still resolve them.
- Whole-graph capture now refuses missing/ambiguous canonical literal Page paths and Menu identity targets that were previously unchecked in some composed paths. It does not rewrite old links. Relative/query/cross-Page-fragment behavior is not newly admitted; external URL behavior retains its existing policy. Changed local references remain subject to the supported mutation validator.
- A plain Page must have a supported canonical path and no Shell-owned Region/Menu override state. Malformed partial compositions refuse; no legacy repair or migration occurs.
- In a composition-enabled application, saved plain-Page Preview validates the complete application graph and requires its existing related Shell-read authority. It does not render or return a fabricated Shell projection for the plain Page. No permission definitions or bypasses were added.
- The current revision-aware composition plugin still has recovery-enabled development-root reads and a published-snapshot production build path. It must not be launched in the qualified host until the subsequent authorized composition work explicitly qualifies a recovery-refusing bounded path. This prerequisite neither changes nor qualifies that boundary.
- Generic non-Visual Page modules, new ordinary adoption controls, composed website navigation, composed Preview navigation and production activation are not demonstrated here. Ordinary composed destination-authoring/navigation changes remain in the paused subsequent increment.

## Preservation and inventory

`preservation.json` confirms **79 existing Page files**, including all **15 accepted Home/About/Contact roles**, remain byte-identical. The **three qualified recovery-read modules**, application settings and **800 prior multi-Page evidence/report entries** remain unchanged. The earlier blocker report, accepted reports, inventories, failed attempts and existing source differences are preserved. No live disposable source/build deployment was performed.

Exact source/test/documentation and generated-build/evidence inventory: `v1-mixed-page-admission-files-20261028.json`. Before hashes distinguish this increment from pre-existing source differences. Historical menu-control bytes come from the prior accepted focused-run snapshot; the current change only excludes routes lacking real Route identities from the Route selector. New evidence records failed attempts as well as passing runs.

No real Page adoption, Shell creation, route-ID allocation, settings, I-AM, permissions, autosave, recovery-state, protected Component-root or Windows-security changes. No commits or pushes. No restricted Saved Preview, website-host/security qualification or production activation. Normal-browser unsaved-draft Preview protection remains deferred and unaccepted.

Stop: **V1 Page Builder — Mixed Plain/Composed Page Admission Review Gate**. Separate acceptance and approval are required before resuming Shared Website Composition.
