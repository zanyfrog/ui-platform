# V1 Page Builder — Appearance and Layout Inspector Acceptance Closure

2026-11-01. **ACCEPTED AND CLOSED — WITH DOCUMENTED QUALIFICATIONS**, by the user's explicit decision. This separate closure records that decision without changing the historical submission status or inventory.

## Accepted scope

Accepted references:

- [Acceptance review gate](v1-appearance-and-layout-inspector-acceptance-review-gate-20261101.md).
- [Exact implementation inventory](../../evidence/v1-appearance-layout-20261031/files.json).

Acceptance covers ordinary managed HTML in plain Pages and Page-owned composed Regions: background/text colors, font size/weight and text alignment; supported presets, validated custom values and individual Reset; Page CSS as sole appearance authority in the delimited `uip-appearance` area keyed by stable managed-node selectors; conservative mutation/refusal and exact preservation of unrelated authored CSS; and clearer existing wrapper layout controls for spacing, width/height, arrangement, alignment and Desktop/Tablet/Mobile overrides using existing layout metadata.

The user accepts the submitted ordinary-Chrome Save/Reload, Undo/Redo, Reset, computed-style and saved-revision evidence for both Page kinds, the 49 passing focused tests, scoped typechecking, production build, server checks and preservation evidence. These are accepted historical results, not newly rerun tests or browser demonstrations during closure.

## Explicit qualifications retained

- Structured CSS editing supports only the admitted flat grammar. Complex selectors, at-rules, nesting, quoted values and custom token expressions remain outside scope.
- Ambiguous manual CSS, invalid ownership, stale selections and unsupported targets must continue to refuse.
- Appearance is base-only; responsive layout uses the existing breakpoints.
- Generic controls do not style native component internals or shared Shell/theme content.
- Plain Pages do not automatically receive composed theme/site-style injection.
- The full browser mutation sequence was not repeated after final attribute-casing hardening. The final browser check and passing regression evidence remain separate.
- Initial Preview loading/stale-revision observations, the unsuitable clipped screenshot and the mobile screenshot timeout remain documented. The successful full Builder screenshot does not erase those attempts.
- Seven pre-existing broader client diagnostics remain.
- Legacy suites previously blocked by Windows EPERM were not rerun.
- Browser asset upload, production Publish, unrestricted website hosting and unsaved-draft Preview protection remain unqualified or deferred. Service upload is not browser-upload proof. Page revisions do not permanently pin mutable asset bytes.

## Read-only preservation verification

The accepted inventory remains unchanged, SHA-256 `094b4da62178efae084d268fa5fd0faf92052de5d49557125a787c5ef0d57fd6`. The historical review report remains unchanged, SHA-256 `2145d4f55701d81fbecefb6c61afcdb9a0c2dae8891cfffdbeb0f023d4746f2b`.

A read-only check of all 1,096 inventory entries found none missing and 1,095 matching exactly. The sole difference is the explicitly live Application `.uib/logs/operations.jsonl`: 17,290,791 bytes at inventory time, 17,300,313 bytes at closure verification. Its complete original prefix matches the accepted SHA-256; the difference is a 9,522-byte append. The log was not rewritten or normalized. Historical reports, failed attempts, exact inventories, source differences and browser observations remain preserved.

No product code, accepted Page, shared Shell/Menu, Application settings, native dependency, permission, recovery boundary or historical source was modified during closure. No tests, builds, browser authoring, commits or pushes were performed. The previously accepted source differences remain in place.

Exactly two documents are added by this closure and the requested read-only assessment:

- This acceptance-closure document.
- [Integrated Website Authoring Review Gate](v1-integrated-website-authoring-review-gate-20261101.md).

The Appearance and Layout Inspector is accepted and closed with these qualifications. The next-step review is assessment only and does not authorize implementation.
