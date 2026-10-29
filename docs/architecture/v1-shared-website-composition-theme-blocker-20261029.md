# Shared Website Composition — Required Theme Field Conflict

2026-10-29. **Stopped before configuration or implementation changes.**

The narrow Application presentation settings amendment resolves the previously reported absence of permission to enable composition. Its allowed field list omits an additional field required by the existing schema and validator: `presentation.theme`.

`packages/visual-artifacts/src/composition.ts` declares `CompositionSettings.theme` as a required `Record<string, string>`. `themeCss` calls `Object.entries(settings.theme)`. Both `saveCompositionSource` and composition graph validation call that function. Consequently an enabled presentation containing only the authorized fields cannot pass the existing validation rules. Making theme optional or inserting it implicitly would change those rules; writing it explicitly would exceed the amendment's field list.

The actual exported function was probed without writing any settings candidate or fabricating a Shell identity. With the theme field omitted it throws `TypeError: Cannot convert undefined or null to object`. With `theme: {}` it returns `:host,:root{}`. This is a pure validator probe, not a full enabled-graph test. Evidence: `evidence/v1-shared-composition-20261029/settings-contract-result.json`.

Required resolution: authorize the existing `presentation.theme` field with the empty object `{}`. This is the smallest schema-compliant value and introduces no theme variables or unrelated settings. All other limits and the mandatory recovery-refusing host boundary remain in force.

## Captured preservation baseline

The original disposable Application settings bytes are preserved in the new evidence directory's content-addressed `before` folder and indexed by `baseline.json`.

Original settings SHA-256: `4e18fc40680c03c56e30046165acebbe19b408c9e7a167ca87d1958dbaf62cf5`.

All 80 captured files remain byte-identical: 79 existing Page files plus settings. No Shell was created, settings changed, Page adopted, Route identity allocated, plugin launched, package deployed, commit made or push performed. No browser qualification or implementation completion is claimed. Prior reports, inventories and evidence remain unchanged.

## Added-file inventory for this attempt

- This blocker report.
- `evidence/v1-shared-composition-20261029/snapshot.mjs`.
- `evidence/v1-shared-composition-20261029/check-settings-contract.mjs`.
- `evidence/v1-shared-composition-20261029/baseline.json`.
- `evidence/v1-shared-composition-20261029/settings-contract-result.json`.
- Content-addressed original-byte snapshots enumerated by `baseline.json`.

No pre-existing file was edited. The previous closure and settings-blocker documents remain preserved. Shared Website Composition has not reached its Acceptance Review Gate.
