# V1 Shared Website Composition — Settings Contract Blocker

2026-10-29. Implementation resumption preflight; **not an acceptance review gate**.

Mixed Plain/Composed Page Admission is accepted and closed separately. Its former whole-Application admission blocker is resolved. A distinct, concrete authorization conflict prevents the requested ordinary shared composition setup.

## Observed contract

The disposable Application at `C:/Projects/Modular/v1-normal-smoke-20261026-01/apps/v1-identity-fixture/app.settings.json` contains only application name/status; it has no presentation configuration.

`src/server/application-composition.ts` implements `compositionSettings` by returning settings only when `presentation.model === 'composition-v1'`. `compositionWorkspace` immediately returns null otherwise. An enabled workspace requires branding.applicationName, assetsRoot equal to assets, a siteStyles array, and a defaultShellId identifying a real Shell. `src/client/visual-artifacts/composition-manager.ts` also returns without a definition. The revision-aware composition plugin reads the presentation object from the same file. Therefore creating/selecting a Shell and adopting Pages alone cannot enable the existing composed workflow.

The 2026-10-29 authorization explicitly excludes settings changes. The earlier authorization likewise excludes settings changes. Enabling composition requires a change to this settings file under the existing architecture. Proceeding would either violate that exclusion or require bypassing the existing composition contract; neither is authorized.

## Required resolution

Authorize the narrowly scoped Application presentation settings needed to enable the existing composition-v1 contract: model, existing branding fields, assetsRoot, siteStyles and the selected defaultShellId. Existing settings outside that presentation configuration would remain unchanged. This is a prerequisite authorization adjustment, not a request for a new architecture or permission model.

No settings or product code was changed in this preflight. No Shell was created, Page adopted, Route identity allocated, host plugin launched or browser verification claimed. All prior evidence and source differences remain preserved. No commits or pushes were performed.

The mandatory host boundary remains outstanding: before any composition plugin launch, implement and verify a recovery-refusing source-read path within the admitted disposable roots while preserving ownership, authorization, dependency and integrity checks. The current plugin still calls recoverRoleBundleRoot in development; it was read only and was not launched.

## Exact file inventory for this resumption

- Added `docs/architecture/v1-mixed-page-admission-closure-20261029.md`.
- Added `docs/architecture/v1-shared-website-composition-settings-blocker-20261029.md` (this document).

No existing file was edited. No new implementation tests/builds were run because implementation is blocked before setup. Prior accepted verification is recorded in the original report and is not relabeled as new verification.
