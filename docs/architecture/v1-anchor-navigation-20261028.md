# V1 Page Builder — In-Page Anchor Navigation Acceptance Review Gate

2026-10-28. **Implementation and bounded normal-Chrome verification submitted for review. Not accepted or closed.** The previously qualified host is recorded separately in `v1-recovery-free-website-host-closure-20261028.md`; its historical report and inventory are preserved.

## Result and admitted environment

An ordinary author can give a managed Page-root section an Anchor ID, edit a literal fragment link, Save/Reload, and navigate to that section in saved Design Preview and the admitted pathname website host. HTML remains authoritative. No registry, reference map, router, renderer, instance store or layout metadata was added.

- Builder: `http://localhost:5374/`; API: `http://localhost:4390/`. Operator started/restarted the existing commands in regular Windows terminals, retaining the existing environment. The existing development identity selector chose **Application Admin (admin@example.local)**; no user, role, permission or authorization mechanism was created.
- Application: `C:\Projects\Modular\v1-normal-smoke-20261026-01\apps\v1-identity-fixture`, owner `dev-v1-identity-fixture`.
- Fresh Page: `src/pages/v1-anchor-navigation-20261028/page.visual.json`, artifact `art_30064bcb-5afb-4e8a-99cd-7f8310cb3659`.
- Website: **http://127.0.0.1:5188/v1-anchor-navigation-20261028#features**. Existing disposable host: `C:\Projects\Modular\v1-normal-smoke-20261026-01\ui-platform\references\visual-artifacts-host-20261028`. Component input remains its empty `.inputs/components`; package manifest input remains `[]`. Existing source/dependency/owner restrictions are unchanged.

## Narrow changes

| Source | Change |
|---|---|
| `packages/visual-artifacts/src/source.ts` | Derive Page-root section eligibility, IDs and incoming literal references from candidate HTML. Admit lowercase slug IDs, check all ordinary IDs, require a unique supported target, and refuse surviving references on rename/clear/removal. A section may be a direct root or the sole child of its own managed root layout wrapper, matching the accepted duplication boundary. |
| Same source helper | Page attribute edits explicitly supply artifact kind; generic/Component/Shell fragment editing retains its prior policy. The shared URL validator remains in the mutation path. Encoded/duplicate legacy ID representations that this conservative reader cannot prove unique cause refusal when introducing/changing anchors/references; they are never rewritten or migrated. Unchanged legacy references are not newly admitted or automatically repaired. |
| `src/client/visual-artifacts/editor.ts` | Ordinary Anchor ID field for eligible plain-Page sections; existing href control supplies Page context; Page removal uses the shared reference guard. Non-Page removal retains its previous path. Existing selection, layout, ownership and managed identities remain in place. |
| `src/server/visual-artifacts.ts` | Normal Page Save validates the previous/candidate HTML reference change inside the existing role-bundle validation transaction. Original authority admission, immutable identities, expected hash, graph validation and mutation/recovery semantics remain unchanged. Advanced Repair is not reclassified as ordinary Save. |
| `packages/visual-artifacts/src/runtime.ts` | Explicit host/iframe URL ownership enables delegated plain-Page fragment handling in the existing runtime. Unique, supported, visible targets scroll into view and receive focus. Initial attachment, hashchange, popstate, render/update and disposal use the existing lifecycle. Temporary tabindex is restored on blur/update/disposal rather than immediately removing keyboard focus. Missing/hidden/ambiguous/unsupported targets report visible feedback; failed link resolution does not add history. |
| `src/client/visual-artifacts/preview.ts` | Saved design Preview opts its own iframe into that behavior. It never writes the Builder parent's URL. |
| Disposable host `src/main.ts`, `vite.config.ts` | Import only the fresh Page; explicitly give its existing render context fragment ownership. The pathname router is unchanged. Use `.vite-cache-anchors-20261028` to issue fresh dependency URLs; preserve the old cache. No original reference-host source was changed. |

Unsupported new local fragments, Component-boundary targets, target/download link semantics and dynamic Page behavior remain refused by the bounded authoring admission. Full external URLs containing fragments are not reinterpreted as Page-local links. Duplication still refuses anchored/reference-bearing content; no automatic ID generation or link remapping was added. This policy is not comprehensive HTML sanitization.

## Normal Chrome observations

The fresh Page was created and authored through ordinary controls; source textareas were inspected, never edited. Its introduction section is `node_ce06ee13-344c-483f-970c-332a808b0332`, public ID `introduction`. Its target is `node_6281825f-5a7c-4b9a-b052-62216edda5e4`, public ID `features`, inside wrapper `node_9f64957d-c707-41e0-9aae-98404a027fb7`. Link `node_21bc692f-88eb-4f08-b6b3-bc09fbfb9292` has literal `href="#features"` and text “Jump to Features.” Eleven managed nodes retain their order and identities.

| Check | Observed result |
|---|---|
| Ordinary authoring and persistence | Anchor field, section/link text and existing layout controls authored the Page. The existing editor Save lifecycle persisted it; Save Now became disabled at the saved baseline. No autosave setting/timer was changed or manipulated. Reload, the final editor reopen and authorized saved GET reproduce the exact authored HTML. This is not an unsaved-draft Preview test. |
| Reference refusals | Missing target, duplicate ID, referenced rename, clear and confirmed removal leave HTML unchanged and identify the referring managed link. The operator screenshot also shows the removal refusal and retained target. Anchored duplication refuses without changing HTML. The final Page-kind compatibility change was followed by a new normal-Chrome missing-target refusal and saved Preview check. |
| Saved Preview mouse / Enter | Own iframe URL becomes `/visual-preview.html#features`; target focus is true, with the same managed ID. Target moves from approximately 1065px below the frame viewport to approximately 0px. Builder URL remains `http://localhost:5374/`. |
| Saved Preview Back / Forward | Back removes the iframe fragment and restores its previous scroll position; Forward restores `#features`, target scrolling and focus. No Builder URL change. |
| Saved Preview initial fragment after frame reload | Operator reported Chrome “Reload frame,” with no apparent visual change. Subsequent inspection showed `#features`, the same focused target, ready status and unchanged Builder URL. The target remained visible at approximately 235px in that observation; this is not claimed as a measured new-frame mount count or exact top-alignment guarantee. |
| Website initial deep link | Direct load/reload of the website URL with `#features` focuses the saved target and moves it to approximately 0px. |
| Website hash changes and history | Changing to `#introduction` focuses that section. Click and Enter navigate to `#features`. Back and Forward traverse both fragments through the existing popstate/remount router. Measurements after the scheduled focus frame show the expected target focused and approximately 0px from the viewport top. Immediate pre-frame readings are retained separately, not treated as final failures. |
| Membership/layout/render agreement | Preview and website have the same 11 managed nodes/tags/IDs/link values in the same order and matching generated layout CSS. Saved metadata retains introduction height 1000px and target-wrapper height 1000px/padding 24px. The target section itself is about 66px high; wrapper sizing is not misreported as section height. |
| Errors | Final normal Preview and website console error captures are empty. Earlier input/automation failures and the reproduced focus defect remain in evidence. The unrelated foundation-source denial was not used as a navigation diagnosis. |

Saved bundle hash and normal authorized Preview response hash both equal:

`4781e9a0b21e855235d3a21569114c0d3569ddc7969f92d78df00afd2864d684`

HTML SHA-256: `afb36310ecd9f2ce857cb2843112e0cb274ae6fa7a79995c81a85e40b5dace5d`.
Metadata SHA-256: `b6196f24f56da8443af1fd3e790d291f63bdfab6a7d11c53e1ff64f0a2e907e7`.

These are real normal-session GETs to the existing saved/Preview endpoints, not a test authorization callback. `final-comparison.json` verifies byte-for-byte agreement with all five saved role files and the browser-authored HTML. The website does not display the management-service bundle hash: its exact input role bytes agree with that saved revision, and the qualified loader retains its existing role-bundle integrity verification. No additional host hash-reporting subsystem was invented.

## Focused verification and preservation

`node scripts/verify-anchor-navigation.mjs` passed in `evidence/v1-anchor-navigation-20261028/run-1793203125640`: **8 source/reference/service tests**, an actual shared-runtime isolated-DOM fixture, and **0 scoped typecheck diagnostics** for source/validation/runtime/editor/Preview/Save service. Tests include ordinary wrapper insertion, identity/containment/order preservation, invalid/duplicate/encoded/legacy cases, unresolved/manual targets, surviving-reference guards, unchanged hash after refused normal fixture Save, existing duplication refusals and non-Page compatibility. Runtime checks cover initial attachment, focus/blur restoration, visible hidden-target failure without a false history entry, update and disposal/cancellation. Fixture identity/admission is test-only and does not substitute for the separate Chrome evidence.

`npm.cmd run build --workspace @ui-platform/visual-artifacts` passed. An existing pinned native dependency emits an IIFE `import.meta` warning in the fixture build; the default branch is not exercised and no native authoring campaign or production qualification is inferred.

`check-final.mjs` passed: **55/55 pre-existing Page files**, **16/16 original reference-host files**, **3/3 qualified recovery-read source modules**, and **175 prior host report/evidence inventory entries** unchanged. The editor refresh-scheduling suffix and application-header files remain byte-identical to the captured inputs; they are not requalified. Final cloned source/build copies match the primary files. Historical reports, inventories, failed attempts and prior caches remain intact. No foreign locks/journals were inspected or cleaned.

Raw evidence includes `normal-preview-navigation.json`, `normal-website-navigation.json`, `normal-saved-bundle.json`, `normal-authorized-preview-response.json`, `rendered-dom-comparison.json`, `normal-reloaded-inspector.json`, refusal records, Page snapshots and successful PNGs (`normal-anchor-inspector.png`, `normal-final-saved-preview.png`, `normal-website-features.png`, plus the operator's removal-refusal screenshot). Failed native-window inspection, blocked direct source navigation/socket access and stale-module attempts are not described as successful captures or reasons for security changes. See `attempt-notes.json`.

## Limits and review decision requested

Bounded plain-Page anchors only: no cross-Page links, arbitrary router/hash ownership, new-tab semantics, Shell/Region or cross-component navigation, dynamic reference remapping, anchored duplication expansion, comprehensive security qualification, restricted Saved Preview or production activation. Normal-browser unsaved-draft Preview protection remains deferred and unaccepted. No I-AM, permission, settings, autosave, recovery, Windows token/VM/WinPE/elevation or protected Component changes; no commits or pushes.

The source helper's final artifact-kind narrowing was fixture-tested and rechecked in the normal Page editor; Component/Shell browser workflows were deliberately not repeated. General render-to-detached-host delays beyond the selected existing synchronous host are not qualified. The operator-assisted Preview frame reload is reported distinctly from automated observations.

Stop: **V1 Page Builder — In-Page Anchor Navigation Acceptance Review Gate**. Recommend reviewing this bounded implementation and evidence; no acceptance or closure is declared. Exact inventory: `v1-anchor-navigation-files-20261028.json`.
