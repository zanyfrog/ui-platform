# V1 Local Audience Pilot — Acceptance and Closure

2026-11-03. **ACCEPTED AND CLOSED WITH DOCUMENTED QUALIFICATIONS**, by the user's “Authorization — V1 Local Audience Pilot Closure and GitHub Checkpoint Preparation.” This record documents that decision; it does not rewrite earlier gates or extend acceptance to public hosting, unrestricted website delivery, or overall V1 completion.

## Accepted bounded result

The existing Builder Demo workflow demonstrated ordinary Page authoring, Save/Reload, Saved Design Preview, shared Shell/Menu/branding/assets, three-Page composition, Presentation initialization, explicit Publish, frozen published-v1 selection, production build and an independent loopback reader. Normal Chrome rendered the website and navigated between its three Pages at desktop and genuine 390px mobile viewport sizes. Removed and unknown routes showed the existing safe “Page not found” result.

| Identity or boundary | Accepted value |
| --- | --- |
| Deployment / authority | `builder-demo` / `ui-platform-development` |
| Application key | `codex-test-v1-local-pilot-20261102` |
| Permanent Application ID | `de8d1851-3e36-435f-b093-95ce94d940e7` |
| Application root | `C:/Projects/Modular/builder-demo/apps/codex-test-v1-local-pilot-20261102` |
| Author / publisher | Application Admin `usr_f01e0c1c58424bed9ac4e8601ff9890a` |
| Protected provisioning actor | Security Admin `usr_06fefc50791f4f15ac0139de699701b9` |
| Published Presentation | Active v1; exactly one published version |
| Exact reader routes | `/`, `/about`, `/contact`; no `/admin` Page |
| Reader | `http://127.0.0.1:5189/`, local operator review only |

Version checksum: `329fb00248abbceb655347d4889d5c4c79da8a8a49268bd221e516120dae3622`.

Frozen composition source fingerprint: `2d9c82d0944690fb0bb7c8f4df0bba0bdc59a369fc6b763f36a2dab67ee949fb`. All 35 frozen source files match accepted publication evidence. Production uses the existing active-version composition snapshot contract; authoring content was not altered to manufacture an isolation test.

## Final production output and verification

Output root: `C:/Projects/Modular/ui-platform/evidence/v1-final-published-reader-20261103/candidate`.

| Output | Bytes | SHA-256 |
| --- | ---: | --- |
| `index.html` | 355 | `06a54e7c303b7d613bd11b4f3fe1a7522ca13f11d310eaaf52ccdf9859721f33` |
| `assets/index-CuneOYWZ.js` | 495417 | `c29a4a88d1d08307f7ac06ee6e0a1f847ea55f76a3268d0b17426c307b143052` |
| `assets/index-BrMR0q6f.css` | 20670 | `f1eba974f702c42a3e33726c49fbfc30d88e1f452e6625dd4bd64b280cda5edb` |
| `assets/ui.component-D4ECKwkg.json` | 28739 | `40aa778eb59a7fb06b3bb420d11798d351a201597b329ba8a6142b29f7052469` |
| `assets/logo-CNSl1IAE.svg` | 207 | `32bfd72ea8a416b4895db187c9e5b83af6c1fde370be56aa2fc0cb7aaa435711` |

Inventory fingerprint: `ea5ad54337358c23a8d851336f931173d908e5a9f8b6f6cbc66fd9fb0584239d`. The logo is a byte-identical physical copy of the frozen source, referenced through an allowed root-relative URL. No `.gitkeep` files or runtime references remain. Both earlier candidates, including the blank-reader and placeholder-output failures, are preserved.

Accepted validation: visual-artifacts package TypeScript build; pilot production script including `tsc --noEmit`; **15/15 focused tests** (6 asset URL tests and 9 Application composition tests). The relevant logs are retained verbatim in the [closure evidence directory](../../evidence/v1-local-pilot-closure-20261103/). No build or test was rerun merely for closure.

Normal Chrome verified Home/About/Contact saved headings and paragraphs, shared Public Shell/Hero, navigation, physical logo and footer; direct About/Contact URLs and refresh; Home → About → Contact → Home; and Back/Forward. `/admin` and an unknown route show only “Page not found.” No fatal console error or Builder controls appeared in the observed reader. The [desktop screenshot](../../evidence/v1-final-published-reader-20261103/desktop-home.png) and [browser observations](../../evidence/v1-final-published-reader-20261103/browser-checks.json) remain unchanged.

At measured CSS viewport **390 × 844**, all three Pages rendered and navigation worked with the logo loaded. Document clientWidth and scrollWidth were both 373 after accounting for the vertical scrollbar, demonstrating no horizontal document overflow. Mobile element geometry and accessibility observations are evidence within their documented limits, not a substitute claim that a mobile screenshot was obtained. The temporary viewport override was reset.

## Security, preservation and reader lifecycle

Policy remains revision **11**. The original seven functional allow rules target only the pilot Application, under its existing authority, with these descendant settings:

| Permission | Descendants |
| --- | --- |
| `ui.application.view` | false |
| `ui.application.edit` | false |
| `ui.page.view` | true |
| `ui.page.edit` | true |
| `ui.presentation.view` | true |
| `ui.presentation.edit` | true |
| `ui.presentation.admin` | true |

Temporary `ui.page.admin` is revoked. The separate exact-Application `ui.application.security.admin` administrator anchor, original set/role/assignment IDs, registrations, historical candidates and mandatory audits remain preserved. Existing unrelated Demo/fixture grants are not represented as globally absent.

Closure read-only checks found all 1,760 accepted pilot/Demo/fixture files unchanged, all seven protected table digests and registration records unchanged, all 35 frozen source files unchanged, and all three candidate output inventories unchanged. Native UI Base remains physically installed with all 54 accepted payload hashes and dependency/archive records unchanged. This check verifies every accepted file; it is not a fresh exhaustive claim about out-of-band additions elsewhere on the machine. See [closure verification](../../evidence/v1-local-pilot-closure-20261103/verification.json).

The reader was left running. Read-only observation at 2026-11-03 22:46:09 UTC confirmed all saved process names/parents, creation times and owner `NIMO-LAPTOP\zanyf`; the Vite command still selects the final candidate. Root PowerShell PID **5280** owns conhost 14620 and the cmd 28776 → npm Node 25944 → cmd 10860 → Vite Node **28316** chain. [Ownership evidence](../../evidence/v1-local-pilot-closure-20261103/reader-ownership.json) contains the supported stop procedure: an operator must first reverify identity, creation time, command and descendants, then may stop only that owned tree using `taskkill /PID 5280 /T /F`. PID numbers alone must not be reused as proof of ownership. Closure performed no process starts/stops.

## Retained qualifications

- Mobile screenshot capture timed out. Actual mobile Chrome DOM/accessibility, geometry, navigation and viewport measurements were obtained; full visual mobile screenshot qualification is not claimed. The first desktop full-page capture also timed out before an ordinary desktop capture succeeded. Earlier native activation/screenshot failures remain historical.
- Independent OS LISTENING-row enumeration was unavailable. Loopback-only resolved Vite configuration, explicit command, strict port, empty management proxy/hooks, CLI destination and actual Chrome access were demonstrated; no independent exclusive socket-enumeration claim is added.
- The historical runtime read-admission test timed out, then returned an existing lock-ownership refusal differing from its expected message. It remains a failed historical test, not a green suite. Prior restricted junction, EACCES, test-fixture assertion and evidence-helper failures remain recorded. Broader client TypeScript diagnostics and earlier Vitest/node suite failures are not reclassified.
- Earlier Demo Page-workspace/installed-path failures, authentication attempts, cleanup adapter refresh behavior, image/style refusals and focus retries remain in their reports. The narrowly accepted corrections do not prove every earlier malformed-source byte had the same cause. No original end-to-end content-creation sequence is claimed to have been repeated after every later protocol change.
- Earlier native Chrome iframe Reload, browser image-upload and unsaved-draft protection qualifications remain bounded by their original evidence. The published-reader direct-route refresh is a separate demonstrated operation. Native dependency qualification is the specific accepted physical installation and 54-file verification, not comprehensive requalification of every binary dependency.
- Source/Page-bundle equality does not independently prove freshness of every external dependency or mutable asset byte. This pilot's frozen inputs, logo and separately admitted installed inputs were checked within their stated boundaries.
- This is a disposable single-site local reader. There is no public/LAN deployment, DNS/TLS qualification, production hosting or claim that unrestricted website delivery and overall V1 completion are accepted. The separate production Publish lifecycle and all other deferred capabilities remain at their existing boundaries.

All prior qualifications continue to apply even where not restated here. Historical reports retain their original point-in-time status; subsequent user decisions, including this closure, establish acceptance without editing those reports.

## Milestone evidence links

| Milestone | Preserved record |
| --- | --- |
| Authority/session verification | [Session verification implementation](v1-local-pilot-non-initializing-session-verification-acceptance-review-gate-20261102.md) and [authority readiness](v1-local-audience-pilot-authority-provisioning-readiness-gate-20261101.md) |
| Initial provisioning / seven grants | [Initial administrator](v1-local-pilot-initial-administrator-provisioning-result-20261102.md), [functional activation](v1-local-pilot-functional-permission-activation-result-20261102.md) |
| Authoring and native boundary | [Authoring gate](v1-local-pilot-fresh-application-authoring-acceptance-review-gate-20261102.md), [physical installation](v1-local-pilot-shared-native-installation-correction-review-gate-20261103.md) |
| Saved Preview and composition | [Preview requalification](v1-local-pilot-saved-design-preview-requalification-review-gate-20261103.md), [three-Page composition](v1-local-pilot-three-page-composition-review-gate-20261103.md) |
| Cleanup and permission restoration | [Guarded cleanup](v1-local-pilot-administration-cleanup-review-gate-20261103.md), [revocation to revision 11](v1-local-pilot-page-admin-revocation-activation-result-20261103.md) |
| Explicit Publish | [Final readiness](v1-local-pilot-final-publish-readiness-review-gate-20261103.md), [first Publish](v1-local-pilot-first-presentation-publish-review-gate-20261103.md) |
| Reader failures and corrections | [Original reader failure](v1-local-pilot-published-reader-review-gate-20261103.md), [non-inline correction/placeholder stop](v1-local-pilot-corrected-published-reader-review-gate-20261103.md), [accepted final reader gate](v1-local-pilot-final-published-reader-review-gate-20261103.md) |

Repository checkpoint preparation is a separate [review gate](v1-local-pilot-closure-github-checkpoint-review-gate-20261103.md). This acceptance record does not authorize a commit/push or assert GitHub synchronization.
