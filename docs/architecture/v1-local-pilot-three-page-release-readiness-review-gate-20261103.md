# V1 Local Audience Pilot — Three-Page Release Readiness Review Gate

2026-11-03. Submitted for review; gate remains open. No acceptance or closure. The protected cleanup staging attempt produced a persisted **invalid/non-activatable candidate**. No permission was activated, and no Page, Shell or Menu was deleted or edited.

## Preserved site and current identity

The existing Demo browser initially returned unauthenticated. The operator selected Application Admin; the agent then successfully invoked Verify development session in that same tab. It returned authenticated principal `usr_f01e0c1c58424bed9ac4e8601ff9890a`, deployment `builder-demo`, authority `ui-platform-development`, registered Applications enabled, creation allowed, Platform security administration denied. The operator's inability to click the control was not classified as a product defect; the supported agent click succeeded after one browser-observation timeout.

The exact pilot remains `codex-test-v1-local-pilot-20261102`, permanent ID `de8d1851-3e36-435f-b093-95ce94d940e7`. Read-only policy inspection returns revision **9**. The saved Home `/`, About `/about`, Contact `/contact` identities and sources remain unchanged from the accepted composition evidence. Normal browser discovery lists all three. Saved Home Preview again confirms its exact saved paragraph, Local Pilot branding, Home/About/Contact links, admitted logo and shared footer. At mobile width, navigation to About and Contact confirmed their saved content and separate displayed Page status. Public Shell and `menu-main` remain in use. Presentation remains draft-only.

## Administration identity and references

- Page: `art_de8d1851-3e36-435f-b093-95ce94d940e7_admin_page`, `src/pages/admin/page.visual.json`.
- Route: `route_de8d1851-3e36-435f-b093-95ce94d940e7_admin`, path `/admin`.
- Assigned Shell: `art_de8d1851-3e36-435f-b093-95ce94d940e7_admin_shell`.
- Admin Shell uses Menu slot `admin`; composition settings map it to `menu-admin`.
- `menus/admin.json` item `admin-home` (“Overview”) targets that permanent Administration Route. Its child links to the public Home Page. Administration also has Page-local `menu-admin` overrides and a Documentation addition.
- Public Shell/Main Navigation and the other three Pages do not target Administration. The Page references the shared Composition Shared Help component; that is an outgoing dependency, not a reason to delete the component.

The existing `assertPageUnused` check found no incoming HTML links to `/admin`. However, an in-memory graph with only Administration removed, evaluated by the existing `compositionDiagnostics`, returns **`composition.menu-target`: “Menu menu-admin item admin-home has a missing or ambiguous destination.”** This is a concrete deletion guard blocker. No deletion operation was invoked and no live deletion success is inferred.

`src/server/index.ts` validates the remaining complete composition before deletion. `VisualArtifactService.remove` additionally requires the expected source hash, a dedicated Page bundle folder, repeat admission and a matching hash immediately before moving that folder to OS Trash. Its management admission requires `ui.page.admin` on the pilot Application's Page collection (`kind: page`, `id: pages`, parent pilot Application). The current endpoint does not offer a single-artifact permission resource. No broader permission is required by that mapping.

The simplest supported cleanup sequence therefore needs a normal **Menu item edit before deletion**: retarget `menu-admin`/`admin-home` to retained Home, or another approved reference-preserving destination, then verify the graph. This has not been done in this preparation phase. Admin Shell and Admin Navigation need not be deleted. Hiding the item alone would retain its invalid destination and is insufficient.

## Cleanup candidate preparation

The existing protected pilot panel's optional cleanup plan has an effective permission delta of **one** allow rule: `ui.page.admin`, exact Application resource `de8d1851-3e36-435f-b093-95ce94d940e7`, authority `ui-platform-development`, descendants true, enabling its Page collection. It does not grant another Application or Platform permission. The route's existing coarse Page collection resource means this cannot technically be limited to only the Administration artifact; the recorded reason and subsequent revocation constrain its intended use.

The panel submits the existing permission-set, role and assignment records together. A read-only exact JSON comparison confirms all three existing records equal the seven-permission plan. The cleanup variant retains those seven rules unchanged and appends only `ui.page.admin` (`local-pilot.de8d1851-3e36-435f-b093-95ce94d940e7.rule.7`). The separate initial security administrator anchor is untouched. Exact proposed documents are in `source-analysis.json`.

Proposed reason: “V1 disposable local audience pilot: temporary Page administration solely to remove the unwanted Administration Page after guarded reference cleanup; retain all seven accepted functional permissions and revoke this cleanup rule through a separately reviewed audited candidate after deletion verification.”

The operator performed the normal explicit Sign out → Security Admin sequence. Same-context Verify development session confirmed authenticated Security Admin `usr_06fefc50791f4f15ac0139de699701b9`, `builder-demo`, `ui-platform-development`, registered Applications enabled, live `ui.platform.security.admin: true`, Application creation false. Protected pilot-status confirmed revision 9 and the existing exact-Application administrator assignment/boundary. No automated principal switching occurred.

The existing panel's cleanup checkbox was checked, a reason limiting the permission to this disposable Page cleanup and subsequent reviewed revocation was entered, and Stage functional permissions was invoked once through its normal request/CSRF contract. The exact recorded reason is in `staged-proposal.json`. The response refused staging validation with three `CHECKSUM_CONFLICT` diagnostics, one for each resubmitted existing definition.

- Persisted candidate: **`969220cf-fa79-4640-979e-9b3248ddbf39`**.
- Checksum: **`sha256:bfce2552d2b4e8f4caed59437137632f22259795eb62c07127cf7f38b9374c97`**.
- Base revision: **9**.
- Validation: `$.changes[0]`, `[1]`, `[2]` each “Existing definition checksum changed.”
- Result: null; **not activatable and not offered for activation approval**. No activation was attempted.
- Staging metadata records the legitimate Security Admin actor, source `api`, expected revision 9 and reason. No matching security administrator activation-audit row exists; no grant change or policy activation audit is claimed. Existing policy/audit rows are unchanged.

### Demonstrated product defect and smallest proposed correction

The fixed pilot panel was sufficient for first-time creation but does not satisfy the existing update contract. `pilotGrantChanges` constructs three existing-document upserts with no `expectedChecksum`; `PilotAdministration.stage` forwards them unchanged. Native I-AM `wp1/service.ts` requires `change.expectedChecksum === securityChecksum(previous)` for every existing record. The persisted submitted request confirms all three checksums were absent. This is a concrete integration defect, not an authentication failure or a demonstrated missing grant ceiling.

Recommended narrow correction, **not implemented**: extend the already restricted protected pilot-status response with current checksums for only these three fixed pilot records, captured with its policy revision, and attach those expected checksums to the existing panel's stage request after normal refresh. Retain existing stage, candidate, delegation, activation, revision and audit guards. Focused verification must cover absent initial records, exact existing-record updates, stale revision/checksum refusal, seven-rule preservation and cleanup-only delta. Do not weaken checksum validation or create substitute roles/candidates as a workaround. Separate product-correction authorization is required before implementation or restaging.

After a separately approved activation and guarded deletion, removal of only the cleanup rule must itself be staged, reviewed, separately activated and audited. Revocation is not automatic and must preserve the seven rules and initial security anchor.

## Current validation classification

Normal Validate Application again returned incomplete saved-source validation, 16 source validators, with the same findings as the composition review:

| Finding | Release relevance |
|---|---|
| `/admin` remains a composed Page | Actual blocker to exact three-route release membership. |
| Admin Navigation targets its permanent Route | Existing template dependency that blocks guarded deletion until retargeted; confirmed by native graph diagnostics. |
| Customer Summary Card revision `5e156a0a9a35…`: unresolved reference/source-incomplete | Existing shared template component issue. It contains an unresolved nested component reference. Not referenced by current pilot Pages/Shells or their required component closure; not demonstrated to block this composed consumer. Preserve diagnostics. |
| PersonForm revision `227e5035272d…`: unresolved reference/source-incomplete | Existing shared Form component requiring Dataset/services not admitted in this bounded author's validation scope. Not consumed by this informational composition. Do not grant Dataset/Form/service permissions or repair it here. |
| Legacy TypeScript Page validation unavailable/source-incomplete | Unavailable full authoring validation for a read-only legacy source. The composed runtime uses `definition.routes`, rather than discovering this legacy file as another reader route. Snapshot code still captures source files; this is not a claim that the file is absent from future distribution bytes. |
| Some scopes unavailable | Genuine validation qualification; do not equate authorized partial inventory with complete all-source validation. |
| Manual wrappers, named slots and manual UI Base elements | Existing warnings, not suppressed. Current Public Shell's nine warnings remain documented; warnings alone are not treated as a demonstrated admission failure. |

The read-only source graph has no current error with all four Pages. It uses existing graph validation with no package catalog and therefore is **not** a substitute for native package admission, live authorization or a full Publish dry run. No product defect requiring correction has been established by these findings.

## Genuine mobile Preview qualification

Using the existing browser viewport capability plus the ordinary collapsed Application navigation control, the actual child Preview document was measured. A nominal outer override of 390 initially yielded a 458px child viewport; that was not misreported as 390. A calibrated supported override of 342 yielded a genuine **386px child viewport**. No injected styles, iframe DOM mutation, copied Preview session or reader host was used.

At 386px, each Home/About/Contact child document had `clientWidth: 386` and `scrollWidth: 386`: no unexpected horizontal document overflow. All three headings rendered at 32px and approximately 338px content width. Contact's paragraph was 16px with 27.2px line height. Navigation Home → About → Contact worked through the actual Menu at this width and confirmed saved correspondence.

The shared header width/scroll width were both approximately 338px. The loaded 150px-native logo rendered at 48px, within the header. All three links fit within the header bounds; footer width and scroll width were approximately 338px at 14.4px text. The existing Hero introduces vertical scrolling; no claim of a short, above-the-fold layout is made. This qualifies the tested mobile Preview surface, not independent hosted-browser/device behavior. The temporary viewport override was reset. Exact measurements are in `mobile.json` and `mobile-shared.json`.

## Conditional release eligibility and remaining actions

Expected route membership after legitimate guarded cleanup is exactly `/`, `/about`, `/contact`, retaining their Page/Route IDs, Public Shell and Main Navigation. The existing composition path maps saved Visual Pages into routes and validates all Menus, including retained Admin Navigation. Thus deletion alone is insufficient. Required next actions are the Menu reference repair, reviewed temporary cleanup staging/activation, guarded deletion, exact three-route verification and separately audited cleanup revocation.

The existing composed Publish path is structurally applicable; no route-exclusion mechanism or broader architecture change is indicated. Actual admission remains unproven until these changes and a fresh native saved-composition check succeed. Publish was not invoked, and visibility of its button is not evidence of eligibility. No build, export or reader process was started.

## Preservation and inventory

No Application source, dependency, active permission, Page, Shell or Menu change has been performed in this phase. The authorized stage attempt adds one invalid candidate row; it does not change policy revision 9, active security documents or either policy/administrator audit history. Before/after snapshots and `preservation.json` record exact security-table differences and regular file changes, including the pilot's ordinary operation-log append. Registration, persistent Demo and fixture content, and earlier accepted site sources remain intact. The operator's legitimate session changes are retained; no cookie/session material was captured. Current browser context remains Security Admin.

Exact preservation result: 1,726 regular Application files captured; only `codex-test-v1-local-pilot-20261102/.uib/logs/operations.jsonl` changed, appending **1,407 bytes** with its original prefix hash preserved. No regular files were added or removed. Of seven security tables, only `security_candidates` changed, from 10 to 11 rows; the other six digests match exactly. Registered Application records match exactly. Candidate persistence is an authorized recorded failed staging attempt, not active permission mutation.

New artifacts are this separate report and `evidence/v1-three-page-release-readiness-20261103/`: before/after snapshots, read-only source inspection helper/output, finalization helper/preservation inventory, genuine mobile measurements, proposed request, refusal diagnostics, audit lookup and sanitized browser/screenshot evidence. `files.json` lists exact artifact paths and hashes. Source inspection scripts perform read-only in-memory graph checks, not native deletion or full Publish verification. No tests/builds, product correction, installs, trust changes, Publish, export, host start, commits or pushes were performed.

Stopped at this review gate. No acceptance, activation, deletion or closure is declared. The invalid candidate must not be activated. The smallest next approval is the checksum-aware staging integration correction and fresh candidate review; Menu reference cleanup, separately approved activation, guarded deletion and audited revocation remain subsequent execution steps.
