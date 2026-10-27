# V1 Page Builder — Responsive Layout Acceptance Review Gate

Date: 2026-10-27. Verification complete; acceptance remains pending a separate user decision.

The preceding layout/composition acceptance is recorded separately in `v1-layout-composition-acceptance-closure-20261027.md`. Historical evidence and accepted Pages were not rewritten.

## Normal Chrome result

Passed Create → Insert Card inside HTML section → Base/Tablet/Mobile layout edits → Save → Reload → Design Preview using the running normal application at http://localhost:5374/ (API http://localhost:4390/), the existing Application Admin (admin@example.local) session and Application `v1-identity-fixture` / owner `dev-v1-identity-fixture`. No session, role or settings substitution was used.

A fresh disposable Page preserves the accepted Pages: `v1-responsive-card-20261027/page.visual.json`, route `/v1-responsive-card-20261027`, artifact `art_2eff0038-fda2-40ce-b3c7-25374ae7a5a4`.

Stable saved/reloaded identities:

| Element | ID |
|---|---|
| HTML section | `node_339d6a38-4b46-48cb-a263-be19bd329e81` |
| Card wrapper | `node_b0feaf65-728f-421e-822d-9de614c18d62` |
| Native UI Base Card | `node_5fdf0145-87b9-4bab-820e-3b896e3196b1` |
| Body span | `node_eab4e9fa-c60f-4dae-a4b0-ef318fa457c6` |
| Component reference | `cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1` |

Existing controls set section Base width 100%, flex display, horizontal centering and padding 24px; Mobile padding 12px. Wrapper Base width is 480px, Tablet 360px and Mobile 100%. Reload preserved these overrides, membership, identity, heading “Responsive layout Card” and body “Same saved Card at desktop, tablet and mobile widths.” HTML remains authoritative for instances/content; existing `.visual.json.layout` remains authoritative for layout. No duplicate layout metadata or renderer was introduced.

## Actual responsive geometry

| Profile | Chrome outer CSS viewport | Preview document width | Card computed/measured width | Section padding |
|---|---:|---:|---:|---:|
| Desktop | 1920 × 900 | 1111px | 480px / 479.99997px | 24px |
| Tablet | 1024 × 900 | 680px | 360px / 359.99997px | 24px |
| Mobile | 390 × 900 | 285px | 245.625px / 245.62498px (100% content width) | 12px |

All three measurements show flex centering, fit within the section and less than 0.00003px center difference. The same Card identity, heading/body and native shadow root were observed at every width. Screenshots: `normal-desktop.png`, `normal-tablet.png`, `normal-mobile.png` in the evidence directory.

Media queries apply to the iframe document, not the outer application viewport: existing Tablet max-width 1023px and Mobile max-width 639px rules explain these results. Chrome's existing scaling made requested viewport dimensions differ from actual CSS dimensions; measurements report actual dimensions, and no zoom/security settings were changed. Navigation was temporarily collapsed for measurement, then restored; viewport override was reset. This verifies three representative widths, not all breakpoints, devices or application-shell responsiveness.

## Saved revision proof

Saved and authorized expected-hash Preview responses both reported:

`e8a4a5cf9c6e7133b5e1ca31f4c573bf6aac17e6722303bcf8fa4f6e7d8b33e6`

Normal-session reads used `/api/apps/v1-identity-fixture/visual-pages?locator=v1-responsive-card-20261027%2Fpage.visual.json` and the same endpoint with `preview=1` and `hash` set to that revision. Response sources and layout metadata matched. Editor HTML before and after Reload matched exactly; no edits occurred between viewport measurements. These are direct authorized read/hash comparisons, not a claim that a network trace intercepted every button request. The existing Design Preview button displayed the native saved Card at all three widths.

## Scoped verification and preservation

`node scripts/verify-responsive-layout.mjs` from `ui-platform` passed. Run evidence: `evidence/v1-responsive-layout-20261027/run-1793118843176`.

- Four source tests, two actual-editor disposable-fixture workflows, zero strict scoped typecheck diagnostics; serial execution without retries.
- Exact runtime layout CSS checks cover Base/Tablet/Mobile rules, cascade order, unsafe value refusal and unsupported property refusal.
- Existing Card/Panel saved-only and preview-error regressions remain covered. Isolated runner reports zero real-browser workflows; the separate normal Chrome evidence above supplies browser proof.
- All 26 baseline file hashes remain unchanged: eight source/copy files and eighteen files across the three previously accepted Pages. HEAD is unchanged. Pre-existing polling/focus-refresh differences remain preserved and unreviewed.
- No product source changed, no concrete product blocker was reproduced, and no backend restart, recovery, permission/settings change, commit or push was performed. `git diff --check` passed.

One automation locator initially assumed an exact “Breakpoint” accessible label; the existing label included option text. Selecting the existing `data-breakpoint` control resolved this without product changes. Initial Page creation was asynchronous; the prior tab was read before navigation completed, and no edits occurred until the new Page became active. One evidence-command JavaScript syntax error was corrected before execution; it performed no filesystem operation.

Full raw browser measurements, saved bundle, HTML, screenshots, workflow record, baseline snapshots, scoped test inputs/results and preservation comparison remain in `evidence/v1-responsive-layout-20261027`. Exact new-file hashes are listed in `v1-responsive-layout-files-20261027.json`; its own hash is intentionally omitted.

## Remaining limits and next step

Normal-browser unsaved-draft protection remains deferred and unaccepted. This increment does not qualify broader nesting/component contracts, all responsive configurations, restricted Saved Preview or production activation. No new architecture is indicated by this verification. Review this bounded evidence at **V1 Page Builder — Responsive Layout Acceptance Review Gate** before deciding acceptance or further work.
