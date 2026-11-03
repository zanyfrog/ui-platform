# V1 Local Audience Pilot — Administration Cleanup Acceptance Review Gate

2026-11-03. **Administration cleanup committed and exact three-route composition verified. A post-deletion editor refresh defect is retained. Revocation staging awaits the operator's legitimate Security Admin session.** Submitted for review; no acceptance, closure or publication is declared.

This follows the preserved menu-repair interim continuation. Its then-pending confirmation state is historical; it is not overwritten. After the operator completed the existing Recycle Bin confirmation, the saved Administration bundle was absent. The browser's subsequent workspace error was initially described as a deletion refusal; read-only inspection corrected that interpretation before any retry. **Delete was never invoked a second time.**

## Author and baseline

The operator performed normal Sign out → Application Admin in the existing Demo context. Same-context Verify development session confirmed authenticated `usr_f01e0c1c58424bed9ac4e8601ff9890a`, deployment `builder-demo`, authority `ui-platform-development`, registered Applications enabled. The exact pilot remains `codex-test-v1-local-pilot-20261102`, ID `de8d1851-3e36-435f-b093-95ce94d940e7`.

Baseline snapshots recorded all four saved Visual Pages, their identities, complete role-bundle hashes/source, Shells, Menus, settings, Presentation manifest and all regular Application file hashes. Read-only policy inspection confirmed revision **10** and the eight active rules. Live Page administration was enforced by the ordinary protected DELETE admission/repeat-admission path, rather than a fabricated standalone evaluator session.

## Menu reference repair and persistence

Admin Navigation item `admin-home` (“Overview”) was retargeted through the ordinary Menu editor from Administration Route `route_de8d1851-3e36-435f-b093-95ce94d940e7_admin` to existing Home Route `route_de8d1851-3e36-435f-b093-95ce94d940e7_public` (`/`). Its permanent Menu/item IDs, label and `admin-public` Public site child are retained. Admin Shell is unchanged. Normal serialization adds explicit `_self` targeting and JSON formatting.

Save Now succeeded. Reload source reported a replaced saved baseline; reopening the ordinary item dialog showed `/`. The dialog was cancelled without another edit. The saved JSON independently confirms the exact permanent destination. No Menu file was manually rewritten.

The same existing graph functions which initially reported `composition.menu-target` after hypothetical Administration removal reported no incoming HTML Page references and no removal-graph errors after the Menu repair. These read-only checks omit a package catalog and are not substituted for full native deletion admission. The real protected operation independently ran its normal complete admission.

## Guarded deletion and observed refresh defect

The saved Administration editor metadata was checked before Delete:

- Page: `art_de8d1851-3e36-435f-b093-95ce94d940e7_admin_page`.
- Route: `route_de8d1851-3e36-435f-b093-95ce94d940e7_admin`, path `/admin`.
- Assigned Shell: retained `art_de8d1851-3e36-435f-b093-95ce94d940e7_admin_shell`.

Delete artifact was invoked once while Saved. Chrome displayed “Move this artifact bundle to the Recycle Bin?” Browser automation timed out on the native modal, so the operator completed that existing confirmation. No direct folder removal or alternate deletion command was used.

The normal server path requires `ui.page.admin` on the exact Application Page collection, checks source hash, references and remaining composition, requires the dedicated Page-bundle folder, repeats authorization/source-hash admission and calls the existing Windows `SendToRecycleBin` implementation. The folder subsequently disappeared and all four bundle files were removed from saved membership. The Recycle Bin contents were not independently enumerated or restored; this report establishes use of the normal Trash contract and committed source removal, not a separate recovery test.

The editor then showed **“Workspace access denied. Refresh authorization or recover under the original identity.”** The relevant source sequence explains the discrepancy: `visual-artifacts/editor.ts` awaits the successful DELETE, clears its selection/copy and then requests `/visual-artifacts`; `builder-workspace/adapters.ts` implements that read by reauthorizing the adapter's original artifact identity. That identity has just been deleted. The server's `/builder-workspace/authorize` cannot find it and returns `WORKSPACE_TARGET_DENIED`. This is a post-commit refresh/feedback defect; it is not evidence that the guarded deletion was denied. No network HTTP trace was extracted, and the conclusion is supported by saved state plus this explicit client/server sequence.

No correction was implemented. A narrow future remedy would notify the coordinator of successful deletion, retire the deleted target/tab and obtain fresh Application-scoped discovery under the existing identity/owner/session guards. It should not reauthorize a nonexistent target, weaken authorization or retry a committed deletion. Focused regression coverage would require truthful success feedback, fresh membership, no duplicate DELETE and retained original session/Application protections. Separate authorization is needed for that product correction.

Ordinary Refresh artifacts restored current discovery. The old failed contexts remain visibly suspended; fresh Page contexts opened normally. This qualification is retained rather than hidden by rewriting source or resetting sessions.

## Exact saved membership and normal Chrome verification

Saved Visual Page/Route membership is now exactly:

| Page | Route | Permanent Page ID |
|---|---|---|
| Home | `/` | `art_de8d1851-3e36-435f-b093-95ce94d940e7_public_page` |
| about | `/about` | `art_3aed563f-5602-44f8-8aea-287edc4dad93` |
| contact | `/contact` | `art_89e4ba70-07fd-482f-ade7-e89a4911d915` |

All three permanent Route IDs, full saved role-bundle hashes and content compare exactly with the baseline. `/admin` is absent from the saved composition, not merely hidden from the public Menu. Retained Admin Navigation now has a valid Home destination; native static graph checks show no errors. Both Shells, composition settings, Main Navigation, assets and Presentation draft remain unchanged.

Fresh normal Chrome discovery lists the three saved Visual Pages; its separate legacy Home source-inspection entry remains read-only and is not a composed reader route. All three target editors opened successfully and showed Saved with the accepted copy. Saved Home Preview rendered its actual heading/paragraph, Local Pilot branding, three navigation links and shared footer. Home → About → Contact → Home navigation confirmed actual saved copy and the separate displayed Page/status. The admitted logo was complete, natural width 150, rendered width approximately 48px. No iframe load/HTTP 200 alone was used as proof.

Presentation opened as **Draft only**, initialized but unpublished. No Publish button was invoked. The existing 386px mobile qualification is reused because public Page/Shell/style source is unchanged; it was not presented as newly rerun.

Validate Application completed **15 source validators**, still incomplete. The known Customer Summary Card (`5e156a0a9a35…`) and PersonForm (`227e5035272d…`) unresolved-reference/source-incomplete findings remain, along with legacy TypeScript validation unavailable and unavailable scopes. They were neither suppressed nor repaired, and no unrelated permissions were granted. The shared manual-layout/UI Base warnings remain historical qualifications. These broader diagnostics are not claimed as a clean Publish approval.

## Revocation preparation

The existing checksum-aware panel can safely express removal-only staging with its cleanup checkbox unchecked. The prepared request retains the same permission-set, role and assignment IDs and the initial administrator anchor. Its proposed permission set is exactly the original seven rules; the sole removal is `ui.page.admin`. `revocation-proposal.json` records the exact current revision-10 expected checksums/documents and reason.

No revocation candidate is claimed yet. The operator has been asked to perform normal explicit Sign out → Security Admin in the same tab. Before any permitted stage, verify the canonical authenticated Security Admin/live authority, protected current revision/checksums and exact removal-only request. Do not stage on a mismatch or activate any candidate. Current active policy still contains the temporary rule at revision 10. Revocation is not automatic.

## Preservation and inventory

At the completed cleanup snapshot, only these scoped Application changes exist:

- Changed `menus/admin.json` as described.
- Existing pilot `.uib/logs/operations.jsonl` appended 3,819 bytes, original prefix hash preserved.
- Removed the authorized `src/pages/admin/` bundle's four regular files through the normal Trash path: `index.ts`, `page.css`, `page.html`, `page.visual.json`.
- No added Application files. All other captured Application files, including persistent Demo and fixture, are unchanged.

Registration and all seven security-table digests are unchanged from the cleanup baseline: revision 10, active grants/anchor, audits and prior candidates are preserved. No product source changed, so no regression suite/build was run. No dependency install, native trust change, reader host, Publish, export, Application recreation, commit or push occurred.

This report, the earlier interim report and separate evidence directory preserve the source snapshots, pre/post graph checks, exact comparison outputs, sanitized Preview/validation observations, partial normal-browser screenshot, prepared revocation request and read-only helpers. `final-files.json` gives the scoped exact artifact hashes; the interim `files.json` is preserved. No authority database, cookie or credential was copied. Any later staging must be recorded in a separate continuation with its candidate and preservation results.

Stopped at this open review gate pending operator-controlled Security Admin staging verification and separate acceptance. No revocation activation, publication or closure is declared.
