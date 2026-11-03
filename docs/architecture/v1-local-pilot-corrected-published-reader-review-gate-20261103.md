# V1 Local Audience Pilot — Corrected Published Reader Acceptance Review Gate

Date: 2026-11-03. Status: **OPEN — stopped at the explicit unexpected-output condition; corrected reader not started or browser-qualified.** Acceptance and overall pilot completion are not declared.

## Result and stop condition

The targeted correction successfully emits the published logo as a separate, byte-identical SVG with an allowed root-relative URL. One new production candidate was built, once. However, applying non-inline imports to the existing complete composition asset collection also emits its directory placeholders as a deduplicated, one-byte newline `.gitkeep` asset. The build log rounds its size to 0.00 kB; it is not an empty file.

The authorization says: “If the change introduces unrelated output or dependency modifications, stop for review.” The newly emitted directory placeholder is unrelated website output. Accordingly, work stopped **before stopping the failed reader, checking port release, starting this candidate, or running Chrome acceptance**. No attempt was made to hide/remove the output, revise the correction again, or perform a second candidate build.

## Exact correction and boundary

In `packages/visual-artifacts/src/revision-composition-vite.ts`, composition asset imports change from `?url` to the installed Vite-supported `?url&no-inline`. Vite 8.2.2's existing asset plugin honors `no-inline` by refusing inlining. The managed asset map and its source ownership remain unchanged.

Previously, Vite inlined the small admitted logo into `data:image/svg+xml,...`. `validateManagedUrlAttribute` rejects `data:` for managed image sources, producing the observed Home runtime failure. This candidate maps the published logo to `/assets/logo-CNSl1IAE.svg`, which the unchanged validator admits. No URL policy, trusted composition admission, native validator, package dependency, logo bytes, or published snapshot was changed.

The same import handling affects the three existing `assets/documents/.gitkeep`, `assets/icons/.gitkeep`, and `assets/images/.gitkeep` entries. Their identical newline contents produce one deduplicated extra output. Vite's bundle spells that URL `/assets/.gitkeep-DcH8Kg-2.`; the Windows file inventory records `assets/.gitkeep-DcH8Kg-2` without the trailing period. No browser claim is made about that placeholder URL.

## Immutable publication and build

Target: Builder Demo / `ui-platform-development`, Application `codex-test-v1-local-pilot-20261102`, permanent ID `de8d1851-3e36-435f-b093-95ce94d940e7`.

- Active Presentation remains v1, with exactly one published version.
- Version checksum: `329fb00248abbceb655347d4889d5c4c79da8a8a49268bd221e516120dae3622`.
- Published source fingerprint: `2d9c82d0944690fb0bb7c8f4df0bba0bdc59a369fc6b763f36a2dab67ee949fb`.
- All 35 frozen source files match the accepted publication evidence before and after this work.
- Exact published routes remain `/`, `/about`, `/contact`; `/admin` is absent from the source graph.

Existing production composition selection still reads `presentation/versions/v1/composition` after resolving activeVersion 1. The correction changes emitted asset URLs, not the input-selection contract. The output logo hash matches the frozen v1 logo. Runtime bootstrap and installed dependencies remain separately trusted inputs, as previously qualified. No draft edits or artificial isolation experiment were performed.

Existing build command, run once from the pilot root:

```text
npm.cmd run build -- --outDir C:/Projects/Modular/ui-platform/evidence/v1-corrected-published-reader-20261103/candidate
```

Child-only environment: `UI_APP_BASE=/`; `UI_PLATFORM_API_PORT` removed. No global environment changes. Build exit 0; existing service build and `tsc --noEmit` passed; Vite transformed 111 modules. The existing outside-root warning was retained. Neither old output nor new output was cleaned.

New candidate inventory fingerprint: `f905aa4cdc82d5b14ecf6af4b55635c70a0491fa5ae7298a1349888a7b86170a` (SHA-256 of the JSON file inventory produced by the evidence helper).

| Output | Bytes |
| --- | ---: |
| `index.html` | 355 |
| `assets/index-vgV-8mxi.js` | 495599 |
| `assets/index-BrMR0q6f.css` | 20670 |
| `assets/ui.component-D4ECKwkg.json` | 28739 |
| `assets/logo-CNSl1IAE.svg` | 207 |
| `assets/.gitkeep-DcH8Kg-2` | 1 |

Logo SHA-256: `32bfd72ea8a416b4895db187c9e5b83af6c1fde370be56aa2fc0cb7aaa435711`. CSS and component-manifest hashes match the failed candidate. Exact output hashes and static route URL resolutions are in `evidence/v1-corrected-published-reader-20261103/output-inventory.json`. Root-relative logo resolution points to the same asset from all three routes; this is static verification, not browser/network proof.

## Focused verification and retained failures

- Visual-artifacts package TypeScript build: passed.
- New `tests/composition-asset-urls.test.ts`: 6 passed after correcting its initial fixture to supply the required default Shell. It exercises actual composition import generation in development and production, installed Vite's in-memory asset build, byte preservation, allowed output URL, and rejection of data/javascript/blob/protocol-relative/backslash image URLs. The fixture is temporary and unrelated to the pilot.
- Existing Application composition suite: 9 passed.
- Native workspace discovery suite: 4 passed under ordinary machine-user execution. Its initial restricted-process run refused the temporary junction with EPERM; that failed attempt remains recorded. No machine security settings were changed.
- Runtime read-admission suite: 1 passed, 1 failed. The incomplete-lock case first exceeded its 5-second timeout; with a longer test limit it refused admission with “Artifact lock ownership is unresolved; exclusive admission was not obtained” instead of the expected “Artifact lock is incomplete; operator recovery is required.” No lock/runtime product code or assertion was changed. The broader suite is not reported as passing.
- The initial evidence helper incorrectly searched for absence of every `data:image/svg+xml` literal in the entire native-package bundle. Read-only inspection found unrelated existing package helper/inspector literals. The evidence helper was narrowed to the published logo's actual URL and file hash; its failed attempt and correction are documented in `static-check-first.txt`. This did not trigger another build.

The development compilation fixture passes, but actual Saved Design Preview compatibility has not been re-demonstrated in Chrome in this increment. No full repository typecheck or historical failed suite is reclassified as passing.

## Reader and browser qualification

The previously recorded process chain remains present with matching process names and parent IDs: launch PowerShell 25068 → cmd 35460 → npm Node 36048 → cmd 34384 → Vite Node 7872 (owned conhost 23720 also preserved). Read-only inspection confirms Vite 7872 still targets the original failed candidate and port 5189. Sanitized observations are retained; no process was terminated or started.

The prior reader remains intentionally running at `http://127.0.0.1:5189/` with the previously failed output. It is not a corrected deliverable. Builder Demo was not restarted. Existing loopback/strict-port/empty-proxy evidence remains historical; no new port-release, binding or corrected-host claim is made. The copied preflight helper was prepared for the new candidate but was **not run**.

Corrected Home, About, Contact, shared navigation/branding/footer, refresh, Back/Forward, `/admin`, unknown-route behavior, desktop rendering, genuine 390px viewport, horizontal overflow, and absence of runtime exceptions are **not browser-qualified**. No screenshot of a corrected reader exists. Earlier failed-reader screenshots and observations remain intact.

## Preservation and exact change inventory

Before/after inventories cover 1,760 Application files across pilot, persistent Demo and fixture. No file was added, removed, or content-changed. All seven security-table hashes and registered-Application records are identical. Policy remains revision 11 with the exact original seven rules, no active `ui.page.admin`, and unchanged separate administrator anchor. Candidates and mandatory historical audits remain unchanged. No session or identity switching occurred.

Accepted dependency records and archive hashes remain identical. Native UI Base remains physically installed, with all 54 accepted payload hashes unchanged. Every file listed in the original failed-run evidence inventory still matches its recorded hash, including failed candidate, logs, observations, inventories and original gate report.

Product/test changes:

1. `packages/visual-artifacts/src/revision-composition-vite.ts` — targeted non-inline composition asset import and comment.
2. `tests/composition-asset-urls.test.ts` — focused regression coverage.

The existing package build regenerates its derived `packages/visual-artifacts/dist/revision-composition-vite.js`; that consumed module is hashed in the inventory. New review artifacts are this document and `evidence/v1-corrected-published-reader-20261103/`, including the separately preserved six-file candidate, helper scripts, all test/build logs and preservation inventories. `files.json` lists exact paths, sizes and hashes, excluding itself. Transient compiler/Vite caches are not presented as a comprehensive machine filesystem inventory.

## Recommended next action

Review the unexpected placeholder emission before authorizing any continuation. The next bounded correction should keep physical URLs for actual managed assets while avoiding publication of directory-placeholder entries, preserve the unchanged URL validator and published v1, and add regression coverage for that placeholder case. Another separately authorized candidate build and controlled reader replacement would then be required before Chrome requalification. No such additional correction or build was performed here.

No second Publish, permissions or registration changes, website edits, dependency changes, reader replacement, public/LAN exposure, commits or pushes occurred.
