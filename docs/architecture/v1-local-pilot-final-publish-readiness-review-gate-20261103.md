# V1 Local Audience Pilot — Final Publish-Readiness Acceptance Review Gate

2026-11-03. **The existing composed Publish operation is ready for separate explicit authorization within the qualifications below. No current composition/draft admission blocker was demonstrated. A complete nonmutating Publish dry run does not exist, so successful publication is not guaranteed or claimed.** No acceptance, release completion, reader availability or publication is declared.

## Current author and authority

The operator performed normal explicit Sign out → Application Admin in the existing Chrome Demo tab. Verify development session confirmed authenticated `usr_f01e0c1c58424bed9ac4e8601ff9890a`, deployment `builder-demo`, authority `ui-platform-development`, registered Applications enabled, Platform security administration false and Application creation true. No automatic identity switch or fabricated session/evaluator context was used.

Read-only native policy inspection confirms revision **11**. The three functional security documents exactly match the original seven-rule plan, with the same permission-set/role/assignment IDs. All allow rules retain the exact pilot Application resource. `ui.application.view/edit` have descendants false; `ui.page.view/edit` and `ui.presentation.view/edit/admin` have descendants true. Temporary `ui.page.admin` is absent from that set. The initial administrator anchor and all other active policy are unchanged.

Normal authorized reads and editor access demonstrate view access and exposed editor availability. Protected save/Publish actions were not invoked to test write admission. Publish maps to the existing `ui.presentation.admin` evaluation on the pilot Presentation child resource, covered by the existing descendant scope; its live mutating admission must still succeed when separately authorized. No Page administration permission is needed or restored for this operation.

## Exact saved composition

Target remains key `codex-test-v1-local-pilot-20261102`, permanent Application ID `de8d1851-3e36-435f-b093-95ce94d940e7`. Saved Visual membership has exactly three unique routes, with preserved Page and Route identities:

| Route | Permanent Page ID | Permanent Route ID |
|---|---|---|
| `/` | `art_de8d1851-3e36-435f-b093-95ce94d940e7_public_page` | `route_de8d1851-3e36-435f-b093-95ce94d940e7_public` |
| `/about` | `art_3aed563f-5602-44f8-8aea-287edc4dad93` | `route_801558d2-8d78-44ec-9722-28642a26215e` |
| `/contact` | `art_89e4ba70-07fd-482f-ade7-e89a4911d915` | `route_d627c61f-6eb4-409c-a196-a5147641e76e` |

There is no saved Administration Page or `/admin` composition Route. The legacy Home source-inspection entry remains separate read-only source; the composed runtime uses `definition.routes` and does not discover it as another reader route. The Publish snapshot collector captures source files, so absence from route membership is not a claim that legacy source bytes are excluded from a future snapshot.

All three Pages retain Public Shell `art_de8d1851-3e36-435f-b093-95ce94d940e7_public_shell`. Composition settings retain Main Navigation `menu-main`, Local Pilot branding, logo/favicon `assets/branding/logo.svg`, shared footer and `styles/site.css`. Main Navigation targets only the three intended Pages. Admin Navigation's `admin-home` targets the permanent Home Route; its child also targets Home. No Menu destination points to Administration. Retained Admin Shell/Menu names and the settings' `admin` slot are not additional reader routes. Native graph checks find no duplicate routes or invalid destinations.

Presentation is initialized and **Draft only**. Its manifest remains `activeVersion: null`, versions `[]`, with an existing draft. Normal Chrome showed Publish Changes and saved source differing from published Presentation. The button was not clicked; its visibility is not used as proof of admission.

## Actual nonmutating admission evidence

The existing server supports protected `GET /api/apps/:key/composition`, which calls `compositionWorkspace(key, await discoverComponents(key))`. The ordinary Presentation composition manager uses this read. Saved Design Preview also calls the same composition loader with the actual installed component catalog and rechecks captured composition before returning a saved bundle. Both ordinary Presentation loading and actual saved Preview succeeded in the legitimate author context.

That shared loader validates saved Page/Shell metadata and artifact errors, permanent Route/Shell membership, route uniqueness, region mappings, Menu identities/targets/overrides, rendered Shells, theme/settings and branding asset resolution. Its success is stronger than the supplementary in-memory graph check recorded in `composition.json`, which intentionally uses no package catalog. Native package/path admission was not bypassed.

Existing pure `validatePresentation` and `renderPresentationCss` checks were run on the saved draft, plus the existing esbuild CSS transform on generated draft CSS and saved site CSS. They passed, with no CSS warnings. These calls were read-only; no initialization, save, snapshot copy or new preflight framework was introduced.

Source inspection of `application-presentation.ts` confirms the composed Publish path obtains the initialized validated draft, runs the same `compositionWorkspace`, copies the composition and referenced shared-component closure, writes the source fingerprint/version/assets/generated runtime/CSS, and finally saves the active manifest using its expected role-bundle checksum and repeated admission, then appends history.

There is **no supported complete nonmutating Publish admission/dry-run endpoint**. Remaining risks that could only be established during the separately authorized operation include fresh authenticated `ui.presentation.admin`/CSRF admission, concurrent source/policy changes, filesystem/version/asset snapshot writes, referenced component snapshot eligibility and the final manifest checksum/admission/history write. The implementation writes version outputs before final manifest advancement; a later failure may leave partial outputs. This phase did not test rollback/recovery or manufacture a successful write. Any actual failure requires recording the precise result rather than automatically retrying Publish.

## Validation classification

| Finding | Current relevance |
|---|---|
| Actual composition/draft admission rejection | None demonstrated by successful native composition reads/Preview and draft/CSS validators. Full protected Publish admission remains untested. |
| Existing Public Shell/manual layout and manual UI Base Hero warnings | Retained nonblocking warnings in this demonstrated loader path; not suppressed or treated as full release approval. |
| Customer Summary Card `5e156a0a9a35…` unresolved reference/source-incomplete | Existing unused shared component with unresolved nested reference. Not consumed by current Pages/Shells or their required shared closure. |
| PersonForm `227e5035272d…` unresolved reference/source-incomplete | Existing unused component requiring Dataset/services unavailable to this bounded author. No related permissions were granted. |
| Legacy TypeScript source validation unavailable/source-incomplete | Read-only legacy authoring validation qualification; not another composed Route. Source bytes may still be captured in the snapshot. |
| Some source scopes unavailable | Genuine author-scoped validation limit. No inference that hidden/unavailable sources are valid. |
| Runtime/native requirements | Existing physical trusted UI Base installation and dependencies must remain admitted. UI Base remains physical with all 54 accepted payload hashes matching; actual Preview/installed-catalog composition loading succeeded. No new native qualification is asserted for unrelated binaries. |

Normal Validate Application ran **15 source validators** and remains incomplete with the same known findings above. The report explicitly says it is not Publish approval. The actual composed publication path selects referenced shared components; it does not equate this broad all-source report with a publication veto for every unused component. No validator, package, source or permission was changed to improve the result.

## Normal Chrome observations

Home, About and Contact editors each opened through ordinary navigation and showed Saved with accepted content. Saved Preview rendered the actual Home heading/paragraph, Local Pilot branding and shared footer. Navigation Home → About → Contact confirmed each actual saved paragraph and correct separate displayed Page/status. The logo reported complete, natural width 150 and rendered width approximately 48px. Preview correspondence was not inferred from an iframe load or HTTP 200 alone.

Presentation opened as initialized, draft-only and unpublished, with valid Public Shell/default settings and its existing Publish control. No content was edited or saved to repeat accepted evidence. The previously accepted genuine 386px mobile behavior is reused because all relevant public source/style hashes are unchanged. Hosted/direct-reader behavior is not newly qualified.

The previously documented post-deletion stale-target refresh defect remains recorded and unmodified. No deletion was attempted here; fresh ordinary artifact contexts worked.

## Preservation and exact inventory

All seven security-table digests and registered Application records match before/after: revision 11, seven functional rules, initial anchor, prior candidates (including invalid/deletion-related history) and all audit records are unchanged. No staging or activation occurred.

All captured pilot, persistent Demo and fixture regular files are unchanged except the pilot's existing `.uib/logs/operations.jsonl`: **1,809 bytes appended**, original prefix hash preserved. No Application file was added or removed. Website Pages, repaired Admin Navigation, both Shells, Main Navigation, logo/assets, CSS and Presentation draft remain byte-identical.

Root dependency package/lock/archive hashes match accepted evidence; physical UI Base and all 54 payload hashes match. No product source changed. New artifacts are this report and `evidence/v1-final-publish-readiness-20261103/`: before/after snapshots, bounded read-only inspection/finalization helpers, composition inventory, draft/CSS validation output, sanitized Preview/validation/Presentation observations and exact `files.json`/`preservation.json`. Prior evidence was preserved, not overwritten. No credentials, cookies, CSRF/session secrets or authority database were copied.

No Publish, export, production build, reader startup, content/Presentation mutation, Page creation/deletion, permission change, dependency/trust change, architecture work, Windows security work, commit or push occurred. Application Admin remains signed in. The existing authoring-only Demo remains running; no process was started or stopped.

Stopped at **V1 Local Audience Pilot — Final Publish-Readiness Acceptance Review Gate**. The demonstrated composition and existing permission plan support requesting separate explicit authorization for one bounded Publish attempt, retaining the incomplete-validation and nonmutating-preflight limits. This is not Publish success, release completion or reader availability.
