# Builder V1 WP5-B - Changed-file inventory

WP5-B is implemented and verified, pending user review. This inventory does not mark it accepted or close the Builder V1 program.

The [machine inventory](builder-v1-wp5-b-files.json) records SHA-256 hashes for every listed file, including ignored verification logs. It excludes itself, this index and ordinary ignored build/runtime/dependency caches. Accepted historical evidence was restored byte for byte and therefore is not a changed source record.

## Implementation, tests and documentation

| Repository | File | Category |
| --- | --- | --- |
| ui-platform | [docs/architecture/builder-end-to-end-v1-acceptance-checklist.md](<C:/Projects/Modular/ui-platform/docs/architecture/builder-end-to-end-v1-acceptance-checklist.md>) | documentation |
| ui-platform | [docs/architecture/builder-end-to-end-v1-implementation-plan.md](<C:/Projects/Modular/ui-platform/docs/architecture/builder-end-to-end-v1-implementation-plan.md>) | documentation |
| ui-platform | [docs/architecture/builder-v1-wp5-a-verification.md](<C:/Projects/Modular/ui-platform/docs/architecture/builder-v1-wp5-a-verification.md>) | documentation |
| ui-platform | [docs/architecture/builder-v1-wp5-b-component-reuse.md](<C:/Projects/Modular/ui-platform/docs/architecture/builder-v1-wp5-b-component-reuse.md>) | documentation |
| ui-platform | [docs/architecture/builder-v1-wp5-b-verification.md](<C:/Projects/Modular/ui-platform/docs/architecture/builder-v1-wp5-b-verification.md>) | documentation |
| ui-platform | [docs/architecture/builder-v1-wp5-plan.md](<C:/Projects/Modular/ui-platform/docs/architecture/builder-v1-wp5-plan.md>) | documentation |
| UI Platform Data Services | [packages/dataset-operations/src/secured-engine.ts](<C:/Projects/Modular/UI Platform Data Services/packages/dataset-operations/src/secured-engine.ts>) | implementation |
| UI Platform Data Services | [packages/dataset-operations/src/secured-request-handler.ts](<C:/Projects/Modular/UI Platform Data Services/packages/dataset-operations/src/secured-request-handler.ts>) | implementation |
| ui-platform | [packages/platform-core/src/application-data.ts](<C:/Projects/Modular/ui-platform/packages/platform-core/src/application-data.ts>) | implementation |
| ui-platform | [packages/visual-artifacts/src/composition-validation.ts](<C:/Projects/Modular/ui-platform/packages/visual-artifacts/src/composition-validation.ts>) | implementation |
| ui-platform | [packages/visual-artifacts/src/model.ts](<C:/Projects/Modular/ui-platform/packages/visual-artifacts/src/model.ts>) | implementation |
| ui-platform | [packages/visual-artifacts/src/runtime.ts](<C:/Projects/Modular/ui-platform/packages/visual-artifacts/src/runtime.ts>) | implementation |
| ui-platform | [packages/visual-artifacts/src/source.ts](<C:/Projects/Modular/ui-platform/packages/visual-artifacts/src/source.ts>) | implementation |
| ui-platform | [packages/visual-artifacts/src/validation.ts](<C:/Projects/Modular/ui-platform/packages/visual-artifacts/src/validation.ts>) | implementation |
| ui-platform | [src/client/builder-workspace/shell.ts](<C:/Projects/Modular/ui-platform/src/client/builder-workspace/shell.ts>) | implementation |
| ui-platform | [src/client/visual-artifacts/authoring-controls.ts](<C:/Projects/Modular/ui-platform/src/client/visual-artifacts/authoring-controls.ts>) | implementation |
| ui-platform | [src/client/visual-artifacts/creation.ts](<C:/Projects/Modular/ui-platform/src/client/visual-artifacts/creation.ts>) | implementation |
| ui-platform | [src/client/visual-artifacts/editor.ts](<C:/Projects/Modular/ui-platform/src/client/visual-artifacts/editor.ts>) | implementation |
| ui-platform | [src/server/application-composition.ts](<C:/Projects/Modular/ui-platform/src/server/application-composition.ts>) | implementation |
| ui-platform | [src/server/application-diagnostic-adapters.ts](<C:/Projects/Modular/ui-platform/src/server/application-diagnostic-adapters.ts>) | implementation |
| ui-platform | [src/server/index.ts](<C:/Projects/Modular/ui-platform/src/server/index.ts>) | implementation |
| UI Platform Data Services | [packages/dataset-operations/tests/wp5-secured-engine.test.ts](<C:/Projects/Modular/UI Platform Data Services/packages/dataset-operations/tests/wp5-secured-engine.test.ts>) | test |
| ui-platform | [tests/builder-v1-wp5-b.test.ts](<C:/Projects/Modular/ui-platform/tests/builder-v1-wp5-b.test.ts>) | test |
| ui-platform | [tests/wp5-b-contract.test.ts](<C:/Projects/Modular/ui-platform/tests/wp5-b-contract.test.ts>) | test |

Product/documentation/test files: **24**. Generated or retained WP5-B evidence files: **157**.

## Evidence and preservation

- [Final review gates](evidence/builder-v1-wp5-b/review-gates.json).
- [Full UI 417/417](evidence/builder-v1-wp5-b/ui-full-review.json), [Data Services 760/760](evidence/builder-v1-wp5-b/data-services-final-rerun.json), [focused 29/29](evidence/builder-v1-wp5-b/focused-review.json).
- [Editor/storage 146/146](evidence/builder-v1-wp5-b/editor-contracts-review-rerun.log), builds/typechecks/production logs in the machine inventory.
- [Actual browser identities/results](evidence/builder-v1-wp5-b/browser-acceptance.json), screenshots and fresh compatibility evidence.
- [Lossless raw transcript archive](evidence/builder-v1-wp5-b/transcripts/index.md).
- Numbered unsuccessful browser runs, failed/transitional native/full-suite reports and logs remain listed in the machine inventory.
- [351 original evidence files preserved](evidence/builder-v1-wp5-b/prior-evidence-preservation.json), [original definition hashes](evidence/builder-v1-wp5-b/original-definition-preservation.json), [A01-A40 unchecked](evidence/builder-v1-wp5-b/umbrella-preservation.json).

No installed package Component definition/library, existing shared Platform definition, WP4 contract, Dataset migration/multi-Dataset host, automation registration, lock implementation or WP5-C source was changed.
