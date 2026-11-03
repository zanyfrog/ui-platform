# V1 Local Audience Pilot — Final Published Reader Acceptance Review Gate

Date: 2026-11-03. **Submitted for review with qualifications; acceptance and overall pilot completion are not declared.**

The placeholder correction, one new production build, controlled reader replacement and normal Chrome route checks completed. The independent reader renders the three saved Pages, shared branding/logo, Public Shell/Hero, navigation and footer. No fatal reader error was observed. Mobile screenshots and independent OS listener enumeration remain qualified below.

## Exact correction

`packages/visual-artifacts/src/revision-composition-vite.ts` now skips only regular asset files whose exact name is `.gitkeep`. It still refuses symbolic links before that exclusion, still recursively admits other directories/files, and retains the approved `?url&no-inline` imports for actual assets. Other dotfiles are not broadly suppressed. Source bytes and the published snapshot remain untouched. No global Vite configuration, managed URL validation, ownership mapping or native trust rule changed.

`tests/composition-asset-urls.test.ts` was extended with three placeholder directories and a legitimate hidden `.brand.svg`. It verifies no placeholder imports/runtime map references/output, continued admission and physical emission of both legitimate SVGs, byte-identical published logo, accepted physical URL and unsafe URL refusal. A deliberately different authoring fixture logo demonstrates production selecting the frozen fixture snapshot, while development compilation remains compatible. These temporary fixtures do not modify the pilot.

The visual-artifacts package build/typecheck passed. The asset regression (6 tests) and existing Application composition suite (9 tests) passed: **15/15**. The first run had a test-only whitespace-sensitive map assertion; it was corrected and the failed log retained. No product correction resulted from that failed assertion. The previously documented runtime read-admission timeout/message mismatch is retained as a separate qualification; no locking code was changed or that suite reclassified. Existing native path-regression results remain historical; this increment directly rechecks physical installation and all 54 accepted native payload hashes.

## Publication and one new build

Deployment `builder-demo`, authority `ui-platform-development`; Application `codex-test-v1-local-pilot-20261102`, permanent ID `de8d1851-3e36-435f-b093-95ce94d940e7`.

- Active Presentation remains v1, exactly one published version.
- Version checksum: `329fb00248abbceb655347d4889d5c4c79da8a8a49268bd221e516120dae3622`.
- Frozen source fingerprint: `2d9c82d0944690fb0bb7c8f4df0bba0bdc59a369fc6b763f36a2dab67ee949fb`.
- All 35 frozen source files match the accepted publication evidence before and after execution.
- Routes remain exactly `/`, `/about`, `/contact`; no `/admin` member or duplicate route.
- Native dependencies were checked unchanged before the build.

Exactly one new pilot candidate build ran from the existing Application root:

```text
npm.cmd run build -- --outDir C:/Projects/Modular/ui-platform/evidence/v1-final-published-reader-20261103/candidate
```

Child-only environment: `UI_APP_BASE=/`, `UI_PLATFORM_API_PORT` absent. Existing service build, `tsc --noEmit` and Vite production build passed. Vite 8.2.2 transformed 108 modules (three placeholder imports removed from the previous 111). The outside-root output warning remains recorded; no candidate was cleaned or overwritten.

| Output | Bytes |
| --- | ---: |
| `index.html` | 355 |
| `assets/index-CuneOYWZ.js` | 495417 |
| `assets/index-BrMR0q6f.css` | 20670 |
| `assets/ui.component-D4ECKwkg.json` | 28739 |
| `assets/logo-CNSl1IAE.svg` | 207 |

Inventory fingerprint: `ea5ad54337358c23a8d851336f931173d908e5a9f8b6f6cbc66fd9fb0584239d` (SHA-256 of the recorded JSON file inventory). Logo SHA-256: `32bfd72ea8a416b4895db187c9e5b83af6c1fde370be56aa2fc0cb7aaa435711`, identical to the frozen v1 logo and previous physical-logo candidate. CSS and component-manifest output hashes are unchanged. The five-file allowlist check passes; no `.gitkeep` file or JavaScript reference remains. The logo map points to `/assets/logo-CNSl1IAE.svg`.

Exact output hashes are in `evidence/v1-final-published-reader-20261103/output-inventory.json`.

## Reader lifecycle and loopback evidence

Before termination, every recorded old process name/parent matched, the launch and Vite commands matched the original failed candidate/port, and no unexpected descendant existed. Only that owned tree was stopped using `taskkill /PID 25068 /T /F`: PIDs 25068, 23720, 35460, 36048, 34384 and 7872. The stop log records success for each. Builder Demo and unrelated processes were not restarted or terminated.

The existing preflight then returned `ECONNREFUSED` / no loopback listener at 5189. Resolved Vite preview configuration was host `127.0.0.1`, port 5189, strictPort true, base `/`, the new candidate directory, no preview/server proxy and no configurePreviewServer hooks.

The existing command started once:

```text
npm.cmd start -- --port 5189 --strictPort --outDir C:/Projects/Modular/ui-platform/evidence/v1-final-published-reader-20261103/candidate
```

Its package script supplies `vite preview --host 127.0.0.1`. New owned chain: PowerShell 5280 → cmd 28776 → npm Node 25944 → cmd 10860 → Vite Node **28316**, plus conhost 14620. Execution session **9889** remains running for review. CLI reports `http://127.0.0.1:5189/`; Chrome accessed that exact destination.

**Listener qualification:** Get-NetTCPConnection yielded no listening row, and focused netstat showed loopback connection rows associated with Vite 28316 but no LISTENING row. Thus independent exclusive OS-listener enumeration was not obtained. Loopback-only configuration/command, strict-port behavior contract, empty proxy/hook configuration and actual Chrome loopback access are demonstrated separately. No wildcard/LAN host configuration or management proxy was enabled. No network/security settings were altered to investigate the enumeration limitation.

The new reader remains intentionally running. Future cleanup should target only its recorded, reverified owned tree. Neither historical candidate was altered or removed.

## Actual normal Chrome results

Connected Chrome tab 1964522941, `http://127.0.0.1:5189/`; this is the independent production preview, not Builder or Saved Design Preview.

| Check | Observed result |
| --- | --- |
| Home | “Welcome to the local pilot” and the saved informational paragraph; Public Shell, Local Pilot branding, visible logo, Welcome Hero, Main navigation and shared footer. |
| About direct load and refresh | “About our local pilot” and the saved disposable-website paragraph; shared Shell, navigation, logo and footer retained. |
| Contact direct load and refresh | “Contact” and the saved paragraph explaining omitted contact details/no messages; shared elements retained. |
| Main navigation | Home → About → Contact → Home produced the correct URL and content at each step. |
| Back/Forward | Back from Home returned to Contact; Forward restored Home, with correct content. |
| Logo resolution | All checked Pages report complete image, nonzero naturalWidth and currentSrc `http://127.0.0.1:5189/assets/logo-CNSl1IAE.svg`. |
| `/admin` | Only “Page not found”; no Administration Page or Builder controls. |
| Unknown route | `/codex-reader-unknown-route` shows only “Page not found”. |
| Fatal errors | No error-level console entries across recorded reader checks or missing-route checks. |

No management/editor controls or private data appeared in the observed reader trees. No API/session secrets were captured. Source/menu identity and hash preservation independently establish that no website edits occurred.

Desktop screenshot `desktop-home.png` demonstrates actual rendered branding, logo, Hero and Home content. Ordinary desktop measurements were innerWidth 2133, document clientWidth/scrollWidth both 2116: no horizontal document overflow.

The initial viewport override produced an actual CSS width of 433; the override was adjusted until measured **innerWidth 390, innerHeight 844**. At that genuine 390px viewport, Home/About/Contact rendered correct content; navigation was exercised through all three; every logo remained loaded; clientWidth and scrollWidth both stayed **373** (vertical scrollbar excluded). Navigation links, logo and footer geometry were recorded, with visible layout boxes and no horizontal document overflow. The viewport override was reset afterward.

**Screenshot qualification:** The first full-page desktop capture timed out; an ordinary desktop capture succeeded. Both mobile captures timed out, so no mobile screenshot or full visual mobile review is claimed. Mobile evidence consists of actual Chrome accessibility/rendered-element observations, loaded-image properties, element geometry, navigation, and viewport/document measurements. No new reader failure was demonstrated; screenshot failures are retained as tooling limitations.

## Isolation and preservation

Production selection remains the existing activeVersion→`presentation/versions/v1/composition` path. Frozen file hashes, version checksum, source fingerprint, emitted logo hash and exact route membership connect the output to published v1. Authoring content was not edited to manufacture an isolation test. Runtime bootstrap/installed package inputs remain separately trusted as previously qualified; Page/source equality alone does not establish future mutable external asset or dependency freshness.

Before/after inventories contain 1,760 Application files across pilot, persistent Demo and fixture. No file content was added, removed or changed. All seven security-table hashes and registration records remain identical. Policy revision 11, original seven functional permissions, absence of active `ui.page.admin`, separate administrator anchor, candidate history and mandatory audits are preserved. No identities or sessions were switched.

Dependency records/archive hashes are unchanged; native UI Base remains physical, with all 54 accepted payload hashes unchanged. Both prior candidate directories, their logs, observations, inventories and reports match their historical evidence hashes (24 original-run and 26 corrected-run evidence/report entries checked). Historical product/test files were intentionally excluded from those evidence-only hash comparisons because this increment explicitly authorizes their further modification.

## Exact change inventory and limits

Current increment product/test changes:

1. `packages/visual-artifacts/src/revision-composition-vite.ts` — exact regular-file `.gitkeep` exclusion; approved non-inline imports retained.
2. `tests/composition-asset-urls.test.ts` — placeholder/legitimate-hidden-asset coverage and distinct authoring versus published fixture.

The existing package build regenerates the consumed `packages/visual-artifacts/dist/revision-composition-vite.js`; its hash is inventoried. New artifacts: this report and `evidence/v1-final-published-reader-20261103/`, including the five-file candidate, source difference, helper scripts, test/build logs, input/preservation inventories, process lifecycle records, browser observations and desktop screenshot. `files.json` supplies exact paths/sizes/hashes, excluding itself. Transient build caches are not a comprehensive machine filesystem inventory.

No second Publish, content edits, dependency changes, policy or registration changes, broad repairs, external/LAN deployment, commits or pushes occurred. No overall pilot acceptance is inferred from these results. The gate awaits separate review with the mobile screenshot, OS listener-enumeration and retained historical test qualifications above.
