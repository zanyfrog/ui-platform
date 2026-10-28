# V1 Page Builder — Compact Problems View Acceptance Review Gate

Date: 2026-10-28. **Implemented and verified; submitted for review, not accepted or closed.**

## Implementation

Two logical client source files: new `src/client/visual-artifacts/editor-problems.ts` and its integration in existing `editor.ts`, synchronized to the admitted disposable copy. No backend, validator, diagnostic-policy, severity, Save-admission or Application Problems service changes.

The repeated inline paragraph area is now a native collapsible Editor Problems section. Its summary always exposes error/warning counts; errors open the outer panel and relevant groups automatically. Routine warning groups start collapsed. Equivalent messages group by source context/revision/severity/message, retaining separate affected-node rows. Exact deduplication additionally includes node identity. Saved-baseline and local-structure findings are never merged; summary counts explicitly count findings separately within each context. This is presentation-local grouping, not a persisted diagnostic identity system.

Local structure is labeled as HTML parsing rather than complete Page validation. Saved-baseline findings display the available hash prefix, with full revision in the tooltip, and explain that they may differ from the draft. Empty saved findings are described as not supplied rather than a claim of complete validation. The existing authoritative Application Problems service, freshness, navigation and Publish distinctions remain untouched.

Affected-node buttons delegate to the existing Structure change handler and inspector. The callback rechecks current parsed managed identity before selection. Missing/manual/malformed targets get an explanation; an intervening stale target is reported without source changes. Messages and labels use textContent. Existing inspector explanations for manual layout remain contextual; no repair/adoption/reload/save action was added. Native details/summary and buttons provide keyboard operation; no new UI framework, controller, endpoint or store.

## Normal Chrome verification

Used the already running admitted environment at UI http://localhost:5374/ and API http://localhost:4390/, existing Application Admin (admin@example.local) session, Application `v1-identity-fixture`, owner `dev-v1-identity-fixture`. The client-only update loaded by normal reload; no backend restart or security/environment change was needed.

Created fresh disposable Page `v1-compact-problems-20261028/page.visual.json`, route `/v1-compact-problems-20261028`, artifact `art_a29fd97b-c317-4e55-81f2-a07c432fd62b`. Through ordinary insertion/text/CSS-class controls, created two paragraphs then cleared the class of each generated wrapper. This creates legitimate manual-layout warnings on otherwise valid, managed source; it is not saved-source corruption. No layout rules depended on the removed classes.

| Required check | Observed result |
|---|---|
| Compact warnings/grouping | Initially 0 errors/2 local warnings; one equivalent-message group with both affected paragraph rows. Outer panel closed. |
| Keyboard accessibility | Enter on outer summary and group summary expanded them. Native buttons selected the affected element. |
| Current-node navigation | Selecting “p — First warning target” selected `node_ea1ddd15-475a-45cb-92de-b72522347711`; HTML remained byte-identical. |
| Controls usable while collapsed | Structure and Insert selected item remain visible; final collapsed area measured about 70.8px high in the existing browser styling. |
| Saved/local origin distinction | Reopening the clean saved Page supplied two saved-baseline warnings as well as two local parser warnings. They appear in two labeled contexts/groups, with saved revision 58ba5c737611. Summary counts 4 findings across those distinct contexts, not four unique affected elements. |
| Invalid local structure/error visibility | A temporary unclosed h2 was typed through the existing source control on this fresh Page, without invoking Save. Final UI showed 1 error/5 warnings, outer panel and error group open. The draft was retained verbatim, not silently repaired. |
| Missing target safety | While source was malformed, managed identities were conservatively unavailable. No target-selection buttons were offered; saved-baseline rows explained that there was no current managed target. No adoption or automatic repair occurred. |
| Undo | Undo restored the exact valid draft after both normal-browser error checks. Existing edit grouping/history was reused. |
| Saved preservation | Normal authenticated saved-role GETs before/after the local-error experiments returned equal hashes and all role-file values. No invalid marker persisted. |

The second paragraph is `node_d01faed8-6f45-48e9-84d9-d90946116203`. Root section is `node_98e19cd6-5123-48c3-9705-668208ead760`.

Saved hash unchanged throughout the local-error/navigation tests:

`58ba5c737611adac7e9de82e514305e9ee47dd9e677eae29fddd18132b3c12fe`

These reads used the existing `/api/apps/v1-identity-fixture/visual-pages` endpoint with this locator and normal session. No fixture authorization callback substituted for normal evidence. Temporary read tabs closed; the Page remains open with Problems collapsed. This increment does not repeat saved Preview or image/Card/heading/duplication/responsive campaigns. Normal unsaved-draft Preview protection remains deferred and unaccepted.

The diagnostic renderer itself performs no Save or source mutation. Fixtures assert zero added PUTs during diagnostic/error/selection rendering. In normal Chrome no Save action was requested during malformed-draft checks; existing autosave policy was not disabled or intercepted. We do not infer absence of every possible autosave attempt from the saved hash. The demonstrated result is that the saved revision stayed unchanged and Undo restored the draft.

## Focused tests and scope

Final run: `evidence/v1-compact-problems-20261028/run-1793195608854`.

- Four source tests pass: same-context exact deduplication with distinct nodes retained; saved/draft/revision separation; severity/message distinctions; artifact-level findings and input preservation.
- One actual-editor fixture workflow plus direct actual presentation-module cases pass: counts/default collapse, grouping/origins/affected targets, delegated navigation, stale callback explanation, missing targets, errors auto-opening, escaped message text, usable insertion controls, invalid draft retained/no implicit Save and Undo to the prior valid draft. Actual saved fixture source remains unchanged.
- Strict scoped typecheck reports zero diagnostics for actual editor/presentation module and its existing dependency roots. Diff whitespace check passes. No shared package source changed, so no package rebuild was required for this client-only change.

Retained failures: the first new runner initially omitted the previously accepted duplicate-section module from its explicit source admission list; that exact existing dependency was then admitted. A fixture initially assumed adjacent source-input edits had separate Undo entries; existing coalescing returned the earlier snapshot. Adding an ordinary insertion/text edit between the fixture source edits established the intended prior-draft history boundary without changing production history behavior. The browser's first navigation locator omitted the displayed em dash; inspection showed the actual label and the corrected locator selected it. Initial raw evidence retains plural “1 errors”; a small presentation grammar correction is covered by the final run and final normal-browser singular “1 error” observation. No safety assertion or diagnostic policy was weakened. Inherited unused import.meta/IIFE warning remains recorded.

## Preservation and inventory

All 43 previously existing Page files remain unchanged. Of 49 baseline entries, only original/copied editor.ts differ; the other 47 are unchanged. Authoritative Problems files, main.ts/styles.css header changes and existing polling/focus-refresh code are preserved without requalification. Historical reports, failed attempts and exact inventories remain untouched. HEAD comparison is recorded; no commits or pushes.

Evidence under `evidence/v1-compact-problems-20261028`: baseline/pre-edit editor, exact fixture source admissions/graphs/results and failures, normal warning/navigation/collapse/error/Undo/origin/missing-target data, invalid and restored source, authenticated saved-role responses/hash preservation, final Page snapshot and preservation comparisons. Evidence is normal DOM/source/geometry, without claiming new screenshot qualification.

Exact changed-file inventory: `v1-compact-problems-files-20261028.json`. It covers original/disposable editor and presentation module, focused runner/test/harness, this report, the fresh Page and evidence; inventory self-hash omitted.

No validation expansion, service consolidation, toolbar redesign, persistence architecture, settings/permissions/I-AM/autosave/recovery/Windows-security change, restricted Saved Preview or production work. Broader visual polish, comprehensive security, arbitrary source repair and normal unsaved-Preview protection are not qualified.

Stop: **V1 Page Builder — Compact Problems View Acceptance Review Gate**. Recommended next action is review of the bounded UI and evidence; acceptance/closure requires a separate user decision.
