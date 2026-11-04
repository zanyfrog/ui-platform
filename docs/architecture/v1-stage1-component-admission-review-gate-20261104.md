# Stage 1 Component Admission Review Gate

November 4, 2026. **Implementation complete for local Stage 1 review; user acceptance pending. No Stage 2 authorization or overall V1 acceptance.** The five November 3 planning documents remain the authoritative baseline, with their production and historical qualifications.

## Result

The eight initial tags and ninth Forms Select use owning metadata, explicit native admission, the existing generic inspector, HTML source, saved Preview and existing Presentation Publish. Card identity remains `cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1`. There is no component-specific editor, extra per-instance store or alternate publication pointer. Existing JSON-only legacy overrides retain compatibility; new literal scalar settings remain HTML.

UI-Base UI is 0.5.2, Forms 0.1.1 and Hero 0.2.4. Changes complete Panel/Action Button/Forms/Hero contracts, native module admission, URL/options validation, cancellation timing, visible action errors, focus restoration, Hero forwarding across the Action Group boundary, disabled Action Button/Form refusal, and frozen admitted component package inputs within the existing publication snapshot. New version records pin the package inventory hash; production composition refuses missing, changed, unlisted or tampered package bytes. Earlier releases retain their existing compatibility path.

## C1–C5

| Scenario | Result | Supporting proof |
| --- | --- | --- |
| C1: eight components | PASS, local boundary | Every initial tag plus Select was inserted and configured in the shared inspector, saved independently, reloaded with identical source, and shown in actual saved Preview. All nine render in the independent published reader. Boolean true/false, Number empty/zero/step/range, readonly Textbox, escaped Display Field and canonical Form submit were checked. Unsupported enum/URL/options saves return 422 without changing saved hashes. |
| C2: metadata-driven Select | PASS, local boundary | Scalar Hardware/Software options/value use the same inspector and owning Forms manifest. Published canonical change updates declarative local-state/value binding. Unsupported empty option segments are refused. No Select-specific editing or application logic was added. |
| C3: Card | PASS, local fixture records | Mouse and Enter/Space selection, distinct stable fixture record names A/B, declarative selected binding, mouse/keyboard action counts, disabled and noninteractive selection/action refusal, nested native button and nested Card isolation. Accessible-name/mode/unknown-setting refusals and accepted 0.5.1 identity/source compatibility have focused tests. |
| C4: Panel | PASS, local boundary | Literal collapsible/open save/reload/Preview; bound Boolean open state, keyboard collapse/expand, accessible name/content reference, retained control focus and independent second instance in published output. |
| C5: Hero | PASS, local allowlisted adapter | Published Shell supplies generic action adapters. One mouse/keyboard action; unified and legacy cancellation; disabled and unallowlisted-token refusal; visible failure; unsafe scheme/protocol-relative/control-character link refusals; safe link and exactly one native keyboard navigation. Only the unified event is exposed for new declarative configuration. |

[Per-component IDs/modules/versions/hashes](../../evidence/v1-stage1-acceptance-20261104/component-records.json), [ordinary inspector evidence](../../evidence/v1-stage1-acceptance-20261104/inspector-review-results.json), [published browser observations](../../evidence/v1-stage1-acceptance-20261104/published-v11-results.json), [inspector screenshot](../../evidence/v1-stage1-acceptance-20261104/inspector-review.png), [published screenshot](../../evidence/v1-stage1-acceptance-20261104/published-v11.png). The published screenshot includes intentionally exercised invalid input, disabled controls and visible action refusal.

## Verification and release

- Complete isolated Platform build passed, including the three prerequisite package builds, browser bundles and server TypeScript: [build log](../../evidence/v1-stage1-acceptance-20261104/build-gate3.txt).
- 42 focused tests across admission, release integrity/pins, package activation, visual source and composition passed: [test log](../../evidence/v1-stage1-acceptance-20261104/gate-source-tests.txt). Three additional workspace principal/ownership/staleness refusal tests passed; one junction-creation test was deliberately excluded after its recorded EPERM failure: [security log](../../evidence/v1-stage1-acceptance-20261104/security-refusals.txt).
- Actual Edge browser: 10 rendered tags (nine components plus Hero), 49 behavior assertions, no fatal page errors, one expected action-token refusal and one link navigation. The Builder/API was stopped before independent-reader browser checks. [Final browser run](../../evidence/v1-stage1-acceptance-20261104/release-loopback-gate.txt).
- Published Presentation v11; component inventory SHA-256 `a6241a5b5d207072f9c3d58e93df43212cd3981e34dc21bf38c97d3f824ef841`. 142 frozen files, including 7 CSS files. Every frozen file is listed and hashed. The build rejected altered/missing inventory and altered CSS; a build with intentionally changed installed Hero code still used frozen code. Later draft edits did not change the released reader. [Isolation checks](../../evidence/v1-stage1-acceptance-20261104/release-isolation.json).
- Actual archives were packed and physically extracted only into the disposable target. Offline lock reconciliation succeeded. Archive integrity matches the target lockfile: [package input hashes](../../evidence/v1-stage1-acceptance-20261104/package-inputs.json), [lock log](../../evidence/v1-stage1-acceptance-20261104/lock-gate3.txt). Shared default native UI installation remains 0.5.1; this work does not upgrade existing applications.
- [Direct HTTP source refusals](../../evidence/v1-stage1-acceptance-20261104/http-source-refusals.json) and [disabled/unadmitted module refusals](../../evidence/v1-stage1-acceptance-20261104/http-admission-refusals.json). The latter currently use the existing generic 500 classification while failing closed; no successful module response was returned.

## Target and authority qualifications

Ordinary authoring was performed by the authorized local test driver against a fresh disposable application and copied Platform. The trusted fixture Application ID is `stage1-disposable-20261104`; no I-AM application registration is claimed. The final ordinary workflow application is `stage1-admission-review`; the end-to-end publish/behavior fixture is `stage1-admission-r2`, Page `art_c9a9728e-06e7-4390-914b-fd0298771882`, Shell `art_8a137669-3b32-4f7b-afad-5b4efe2ba7b2`. Other disposable attempts and intermediate releases remain preserved.

The existing local test API ran with Editor and V1 identity disabled. This is trusted local development acceptance, not a claim of production identity or I-AM role qualification. Supplementary bindings, stable fixture record IDs, Shell setup and allowlisted service adapters were trusted setup using existing Save/Change Shell/Publish paths; they are not claimed as Stage 2 visual CRUD authoring or protected data writes. Browser tests use a fresh Edge profile. Final test launchers restrict the API listener to 127.0.0.1 with a test-only preload; Vite and the independent reader bind loopback. Earlier disposable API attempts used the existing development wildcard listener; those processes were stopped, and no LAN acceptance is claimed. Server production binding/identity code was not changed.

The initial Windows junction-creation regression failed with EPERM, before reaching its refusal assertion. It remains failed/unverified as that exact test. A separate read-only test successfully refused the already existing Forms junction and accepted the physical legacy 0.5.1 Card/Panel installation. No Windows repair was attempted. Supplemental attempts to start the existing Base Card unit suite did not run assertions (Base runner module-path failure; Platform runner missing happy-dom). These logs remain; actual Edge Card behavior and focused compatibility tests provide the C3 proof. No required C1–C5 scenario remains unverified within this declared local boundary.

Historical pilot evidence, deferred unsaved-draft/mobile/upload qualifications and unresolved production decisions remain unchanged. No Data Services source change/build, Stage 2 implementation, production identity/deployment/recovery change, commit or push was performed. Source-only constructors/tests use disposable roots; prerequisite outputs, archives, API stores, publications and browser evidence are under the documented Stage 1 evidence target. Earlier test attempts and failures are retained rather than relabeled.

## Source inventory and baselines

| Repository | Baseline HEAD |
| --- | --- |
| ui-platform | `503effe4cc66229306cd30fc11a4389c8139a8ea` |
| ui-base | `3cbe073c9192c4eba8086b88dd2978b179539b2f` |
| Data Services | `81b769eef3763d02343f5347888c26edab6ef7bc` |

All changed/new source and review files:

| Repository | File |
| --- | --- |
| ui-platform | `docs/architecture/v1-stage1-component-admission-review-gate-20261104.md` |
| ui-platform | `package-lock.json` |
| ui-platform | `packages/visual-artifacts/package.json` |
| ui-platform | `packages/visual-artifacts/src/component-packages.ts` |
| ui-platform | `packages/visual-artifacts/src/model.ts` |
| ui-platform | `packages/visual-artifacts/src/revision-composition-vite.ts` |
| ui-platform | `packages/visual-artifacts/src/runtime.ts` |
| ui-platform | `scripts/prepare-stage1-acceptance.mjs` |
| ui-platform | `scripts/record-stage1-evidence.mjs` |
| ui-platform | `scripts/verify-stage1-browser.mjs` |
| ui-platform | `scripts/verify-stage1-inspector.mjs` |
| ui-platform | `scripts/verify-stage1-release.mjs` |
| ui-platform | `src/server/application-presentation.ts` |
| ui-platform | `src/server/component-registry.ts` |
| ui-platform | `src/server/native-ui-base.ts` |
| ui-platform | `src/server/packages.ts` |
| ui-platform | `src/shared/presentation.ts` |
| ui-platform | `tests/stage1-component-admission.test.ts` |
| ui-platform | `tests/stage1-component-pin.test.ts` |
| ui-platform | `tests/stage1-component-release.test.ts` |
| ui-base | `package-lock.json` |
| ui-base | `packages/ui-base-forms/package.json` |
| ui-base | `packages/ui-base-forms/src/uib-forms-form.js` |
| ui-base | `packages/ui-base-forms/ui.component.json` |
| ui-base | `packages/ui-base-hero/package.json` |
| ui-base | `packages/ui-base-hero/src/uib-hero.js` |
| ui-base | `packages/ui-base-hero/ui.component.json` |
| ui-base | `packages/ui-base-ui/package.json` |
| ui-base | `packages/ui-base-ui/src/actions/uib-action-button.js` |
| ui-base | `packages/ui-base-ui/src/layout/index.js` |
| ui-base | `packages/ui-base-ui/src/platform/definition.js` |
| ui-base | `packages/ui-base-ui/src/platform/renderer.js` |
| ui-base | `packages/ui-base-ui/ui.component.json` |

[Exact source before/after hashes](../../evidence/v1-stage1-acceptance-20261104/source-inventory.json) and [generated file inventory](../../evidence/v1-stage1-acceptance-20261104/output-inventory.json) enumerate the files. External dependency junctions are recorded without traversing or modifying their targets. The November 4 partial-progress evidence remains separate and preserved.

## Recommendation

Accept Stage 1 within the local qualifications above and retain the pinned package inputs as the review baseline. Stage 2 may be considered after the user accepts this gate and separately authorizes it. This report neither starts Stage 2 nor constitutes overall V1 acceptance.
