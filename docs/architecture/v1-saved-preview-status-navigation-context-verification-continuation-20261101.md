# V1 Page Builder — Saved Preview Status and Navigation Context Acceptance Review Gate

2026-11-01. **Verification continuation submitted. NOT ACCEPTED OR CLOSED.**

Supplement to the unchanged [original gate](v1-saved-preview-status-navigation-context-acceptance-review-gate-20261101.md). [Exact continuation inventory](../../evidence/v1-saved-preview-continuation-20261101/files.json).

## 1. Previously verified plain behavior

Preserved earlier Chrome authoring/freshness evidence. Newly completed Mobile computed-style and exact saved-byte proof without editing that Page: 8px wrapper padding at measured iframe width 219px, blue RGB(36,86,166), 32px heading. Mounted revision equals SHA-256 of the existing server's ordered five-role saved bundle: `cddf67d0b164793280bced523bc8dd474b98e1d55bb78a517e84ef8755be17e1`. See exact-final-plain-proof.json and exact-final-plain-disk.json. The Builder remains at http://localhost:5374/ while the iframe owns its location.

## 2. Newly verified composed behavior

Created one disposable Page, codex-test-preview-controlled, route /codex-test-preview-controlled, with the existing shared website Shell. Preserved both earlier disposable Pages, including the malformed failure snapshot. Used ordinary Builder controls throughout; no direct source replacement or filesystem repair.

Created Page-owned Main Content; inserted heading, named saved-Page link, existing Application image and alt text. Saved and Reloaded between controlled steps. Applied blue text, 32px font and base 1rem / Mobile 0.5rem wrapper padding. Recorded selected node, save status and HTML in browser-transitions.json, and saved bundles/hashes at milestones. A consecutive text/destination edit sequence saved valid href/text and retained identities. Reload completion was awaited before the next selection.

Actual composed Preview decoded the image (complete=true, naturalWidth=240), with literal Application asset src and alt "Codex Test composed image". Computed heading color RGB(36,86,166), 32px font; wrapper padding 16px at iframe width 805px and 8px at 219px. Appearance remains in Page CSS; spacing remains in existing layout metadata. Shared Shell/Menu was not edited.

Repeated unsaved change → Save Now → saved-not-shown → explicit refresh on exact final source. The old mounted revision remained through editing and successful save, changing only on explicit refresh. Final mounted and saved-byte hashes match: `2af86fe3b6f67f65e73427dcbdd5ae0141c67c3763e3b68776466e1fb7d0bfd0`. See exact-final-browser-proof.json and exact-final-composed-disk.json.

Stable Page identity: art_7329ea42-126e-4148-a2a7-ce6bf685f060. Heading node_247ef9f8-ba4d-4feb-a017-0dd6377e1cd2 and Region node_b69e9eb2-da0f-4ec4-b0b4-b67a40a18fb9 persist. Final heading: "Codex Test controlled composed revision two final".

## 3. Malformed-source root cause and disposition

Confirmed a pre-existing product defect in Text content: it captured node.openEnd/closeStart when rendering the inspector. After a destination changed source, a late event from the old text control spliced at obsolete offsets. An isolated actual-editor regression failed before correction. Git HEAD contains the same vulnerable handler before the Preview increment. This establishes a defect capable of the malformed-source symptom; it does not prove every previous malformed byte had exactly that event order.

Narrow correction: capture copy/node identity; refuse changed selection; reparse current source; require one managed ordinary leaf; splice using current offsets. Existing mutation, validation, Undo/Redo and save contracts remain. The failing regression passes; a changed-selection assertion prevents a late control editing another target. Controlled and consecutive normal-Chrome link edits save valid source after correction.

Missing image/style observations have a separate disposition: existing asynchronous controls conservatively refuse when their captured source/save/selection context changes. A stable saved baseline and completed operations successfully persist src/alt and CSS. Some automation text attempts did not commit until a real focus change; successful runs click the editor heading to commit. A Reload helper initially expected exactly "Saved" and failed on the truthful "Saved · Source baseline replaced" notice; it now waits for the inert surface to resume and admits that notice. These retries are retained.

## 4. Final-source browser consistency

Reconciled production/disposable copies by hash before testing. Synchronized corrections again, reloaded only the new verification tab, and repeated the final browser checks. Final hashes match in both trees:

| File | SHA-256 |
| --- | --- |
| editor.ts | b25f8c6ed65e785b91c66f78e55ad4f59c8aadd4a87f90d8290c4d89a6518460 |
| preview.ts | c51010717c98d27dc23a36552f6aa0e09608a13d7d0d9f842718fc910cf2d0b5 |

Exact-final-source checks repeat reopening, keyboard Preview action, text mutation, Save, explicit refresh, revision equality, desktop/Mobile styles, keyboard link activation and Back/Forward. Content creation occurred on the corrected text-handler source before final Preview context guards; it was not all recreated after those guards. No source changed after the final browser run.

## 5. Protocol/history and remaining Reload qualification

Keyboard Enter on the composed link navigates to codex test preview plain. Status retains Editing: codex test preview controlled and separately reports the displayed plain Page, route, hash and explicit different-Page status. Chrome Back returns to the composed Page/hash; Forward returns to plain. Repeated on exact final source. The Builder URL remains unchanged. This verifies targeted keyboard activation, not an exhaustive accessibility audit.

Hardened the existing iframe load/message handoff: each document load gets fresh parent admission; embedded URL restoration waits for admission and retains the iframe's history Page. Old-session replies cannot introduce unseen retired document IDs. Origin/frame/application checks remain. Deactivation clears removed-frame context, focus repaints status, and hidden/suspended editors ignore frame replies. No new renderer, revision authority, source permission or automatic reload policy.

Actual-client/runtime fixtures cover embedded Reload admission, current-history context, wrong origin/source, duplicate requests, retired/unseen old-document replies, delayed/out-of-order navigation lookup, failed saved-revision admission retaining prior Page/URL, delayed saves, failure feedback and preserved drafts. Reload uses an isolated DOM and fake source transport.

**Native normal-Chrome iframe Reload remains unverified.** Browser automation exposes no frame Reload operation. Frame right-click exposed no native menu through page accessibility. Native Chrome activation failed with unavailable coordinate geometry, a black screenshot and failed-to-activate-captured-window. No guessed menu keys, injected reload scripts, security changes or alternate browser environment were used. Screenshots remain unavailable. Outstanding: invoke Chrome Reload frame after navigation and confirm displayed Page/hash and new-document admission. The passing fixture is not normal-browser Reload proof.

## 6. Regression and preservation

Final focused runner: `SAVED_PREVIEW_EVIDENCE=evidence/v1-saved-preview-continuation-20261101 node scripts/verify-saved-preview-status.mjs` — PASS, run-1793546107914. Retains 49 collected tests, actual editor/runtime/Preview and image/native/layout fixtures, strict scoped typechecking (zero diagnostics), plus new text/protocol assertions. Fixture result correctly reports zero real-browser workflows; Chrome evidence is separate. Failed and preliminary attempts remain in diagnosis-run-* and earlier run-* directories.

`npm run build` and `git diff --check` pass. Broad client TypeScript retains the same seven diagnostics: six UI Base declaration diagnostics and main.ts string/boolean. Previous EACCES and Vitest/node:test suite failures remain failures; they were not rerun or represented as passing. Logs: final-focused.log, final-build.log, broad-client-typecheck.log.

Preservation baseline covers 1,110 existing Application/previous Preview evidence files: 1,109 match; operations.jsonl only grew, with its original byte prefix preserved. Existing source, earlier failed Page, settings, Shell/Menu and previous Preview evidence match. Only the new controlled Page is added to Application source. Prior accepted 975-file baseline: no missing files; same three known differences (editor.ts, its disposable copy, operation log). Against 881 accepted evidence/Application inventory entries, 878 match; two active API logs and the operation log grew, all retaining original byte prefixes. Historical evidence was not overwritten.

Dependency binaries are not comprehensively represented by that baseline (nativeFilesChecked=0). No dependencies/manifests/lockfiles were installed or edited; retained pinned native fixture regressions pass. This does not establish new host/native-dependency qualification.

## Updated inventory and gate status

Production: src/client/visual-artifacts/editor.ts; src/client/visual-artifacts/preview.ts.

Verification: tests/guided-content/editor-check.mjs; tests/guided-content/preview-protocol-check.mjs; scripts/verify-saved-preview-status.mjs.

Documentation: this continuation. Original gate, closure and assessment documents remain unchanged. Evidence: evidence/v1-saved-preview-continuation-20261101/**. Exact inventory separately enumerates regenerated builds, two synchronized disposable client files and the new disposable Page. Initial diagnosis runs were moved from the prior evidence directory into this continuation; original entries remain byte-identical.

No commits/pushes, server/I-AM/settings/permission/recovery/dependency changes or direct Application source replacement. Page hashes prove Page bundles, not independent Shell or asset-byte freshness. Unsaved-draft protection, upload, Publish and broader hosting remain deferred.

Returned to the requested Review Gate with composed authoring and plain Mobile/hash gaps resolved. Native Chrome iframe Reload and screenshots retain the qualifications above. Acceptance and closure require separate approval.
