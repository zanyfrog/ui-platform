# V1 Design Preview button

Status: **V1 Design Preview Button — Acceptance Review Gate**.

## Observed cause and existing path

The button was receiving clicks and executing its registered `safe(showPreview)` handler. It created `/visual-preview.html` in the existing iframe, posted `uip-preview` with the saved locator/kind/hash/Application key, and the iframe fetched the authorized saved revision. The existing design renderer already displayed the saved Card. Before correction the actual Chrome DOM contained the rendered Card's header/body/footer, but the preview host's viewport top was **1766.36 px**, beyond the **1010 px** viewport. The host followed the entire Structure/Properties/source grid and had no visible loading/completion feedback or reveal behavior. This was a placement/feedback defect, not a failed renderer or security restriction.

The existing path remains: editor click → saved-only/clean-source guard → iframe → same-origin parent message → normal `/api/apps/<key>/visual-pages?preview=1&locator=...&hash=...` → existing authority/recovery-refusing revision service → existing UI Base registrations and Visual renderer. It is not a local draft-only render. The unrelated foundation-sources 403 was not used as evidence and was not changed. The separate restricted Saved Preview readiness panel remains unavailable; it is distinct from this design iframe.

## Minimal correction

- `src/client/visual-artifacts/editor.ts`: moves the existing host immediately below the editor actions, before diagnostics and the editing grid. Adds a **Saved design preview** heading, live status, and a programmatically focusable host. Explicit button clicks scroll/reveal and focus it; background automatic preview refreshes do not steal focus. Keeps the dirty/conflict guard before replacing the saved iframe. Captures the existing saved locator/kind/hash at initiation rather than rereading mutable selection when iframe load fires. Shows actionable iframe-load and child request/render errors. The completion listener accepts only the current iframe's same-origin messages and is removed on disposal.
- `src/client/visual-artifacts/preview.ts`: after the existing render succeeds, reports completion to its parent through the existing iframe message mechanism; its existing error catch also reports the error. Rendering, source loading, saved-hash validation, native implementation and service selection are unchanged.

Both source-only patches were applied to the matching disposable development source copy. No backend restart, Page Save, catalog/identity change, new renderer, activation path, instance store or preview subsystem was introduced. No source acquisition or authorization check was weakened.

## Verification

Final scoped run: `evidence/v1-design-preview-button-20261027/run-1793111845618`.

**Four source tests, two actual-editor workflows, zero strict scoped typecheck diagnostics.** Both autosave configurations exercise:

- Add/edit/save/reload Card and Panel with actual Foundation owner calls on guarded disposable roots and actual pinned UI Base classes.
- Actual Preview button dispatch, host placement above diagnostics, accessible heading/status and explicit scroll/reveal invocation.
- Saved Card heading attribute/body and Panel variant through the existing renderer, matching saved/Preview hashes.
- An unsaved draft cannot change the existing native Card or replace its iframe; dirty initiation refuses before removing it.
- A simulated failed saved-revision HTTP response travels through the actual preview catch and displays an actionable error in both the iframe and the parent status. This is test transport, not a real permission denial against the operator's session.
- Disposal and serial completion without asynchronous/network errors. No security/session setup runs in these fixtures.

The isolated DOM has no layout and disables iframe loading. A test-only scroll-call recorder and explicit iframe message bridge are documented in the verifier; actual rendering and status handlers execute. Its disabled-loader error immediately exercises the iframe-load explanation. The first two retained attempts expected a loading message before that synchronous fixture error; assertions were corrected to reflect the fixture behavior, leaving the product error handler intact. A third retained attempt repeated that failure after a preparation command used the wrong working-directory prefix. All raw run directories remain: `run-1793111390006`, `run-1793111410695`, `run-1793111423787`, followed by passing `run-1793111432006` then `run-1793111661998` and final `run-1793111845618` with strict typechecking of both changed client files. No automatic retries. The inherited unused native-loader IIFE/import.meta warning is retained and not exercised.

## Normal Chrome evidence

The operator's already running Chrome tab at `http://localhost:5374/` was used; no alternate server or session was created. Application Admin was already signed in. The saved Page was reopened through the actual Application → Pages → Page UI after reloading the source update. Save Now was disabled before testing, consistent with clean source.

On the final source version, clicking **Design preview** produced **Saved design preview ready.** and a focused preview host spanning approximately **0.15–580.27 px** inside the 1010 px viewport. The normal iframe DOM had a UI Base Card shadow root, heading attribute **My heading**, body **This is the Card's body**, header **My Header** and footer **My Footer**. The explicit named header occupies the rendered header slot; the saved heading attribute is retained. The cropped screenshot shows the existing native rendering and completion feedback.

Evidence: `normal-browser-result.json` and `normal-browser-preview-crop.png`. The crop was captured directly through the browser screenshot API at its observed 1.5 screenshot scale; no synthetic rendering or image editing was used. A transient full-page screenshot was discarded because it included unnecessary session-context diagnostics. No cookies, CSRF tokens or session secrets are recorded in the retained proof.

Normal-session saved Card visibility/rendering is verified. Normal-browser unsaved-draft/error/Panel experiments were not performed against the operator's Page; those cases pass in disposable fixtures. This does not declare the broader V1 Card/Panel normal workflow complete or qualify restricted production Preview.

## Preservation and exact files

The authorized disposable Page's HTML was snapshotted before investigation; final preservation checks confirm it is byte-identical. Original source snapshots, source admission hashes, compiled graphs, test failures/results, normal-browser evidence and copied-source checks are retained under `evidence/v1-design-preview-button-20261027`.

Changed logical product files: the editor and preview client above, plus their matching files under `C:\Projects\Modular\v1-normal-smoke-20261026-01\ui-platform\src\client\visual-artifacts`. New support: `scripts/verify-design-preview-button.mjs`, `tests/design-preview-button/harness.ts`, this report, exact inventory and evidence. No server, Foundation, authority, hash, package or native component implementation was edited. Existing accepted evidence is preserved; historical inventories retain their historical source hashes.

Exact path/size/SHA-256 inventory: `docs/architecture/v1-design-preview-button-files-20261027.json` (only its self-entry is unhashed). `git diff --check` passes. No Windows security work, protected recovery, production activation, commits or pushes.

Stop: **V1 Design Preview Button — Acceptance Review Gate**.
