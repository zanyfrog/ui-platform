# V1 Page Builder — Image and Asset Selection Acceptance Review Gate: Verification Continuation

2026-10-30. **Verification continuation only. Not accepted or closed. Product code unchanged. No commits or pushes.**

This addendum preserves the original submission and its evidence unchanged. Actual normal-Chrome existing-image selection, src/alt persistence, Reload/reopen and saved Preview rendering now pass for the disposable composed Page. The required new plain-Page workflow is blocked by the existing creation/membership contract. Browser upload remains unverified; service fixture preparation is explicitly separate.

## Results by requirement

| Area | Actual result |
| --- | --- |
| Implementation regression | Pass: unchanged product sources/copies; 34 collected tests, 21 image checks and actual Preview/runtime fixtures pass again. |
| Authorized test-image setup | Pass: existing development-session and Application multipart upload APIs, normal permission/owner/path/hash checks. Separate service session under the same configured Application Admin identity; not browser upload evidence. |
| Composed Page existing-image chooser | Pass in existing normal Chrome Builder: real listing, selection/info verification, literal src, alt keyboard edit, saved Reload, close/reopen and cancellation without dirtying. |
| Composed saved Preview rendering | Pass: actual rendered SVG completes with natural size 240 × 96, rendered size 240 × 96, authorized Application asset URL, retained Image/Page/Region identities and matching saved revision. |
| New plain Page | Blocked before content editing: ordinary creation always applies default Shell; existing normal/repair saves prohibit removing it, and Change Page Shell requires another real Shell. No supported plain-creation/detach option found. No membership workaround attempted. |
| Plain saved Preview rendering | Not demonstrated in normal Chrome. Existing isolated-DOM resolver fixture still passes; it is not substituted for normal-browser evidence. |
| Browser upload | No successful browser upload. Prior extension file-access limitation remains; permissions/policies unchanged, no synthetic input mutation, no desktop fallback or security workaround used. |
| Screenshots | Two browser capture attempts timed out. No screenshot evidence is claimed; DOM observations and actual decoded-image/revision results are retained. |

## Authorized fixture preparation

Application key `v1-identity-fixture`, owner `dev-v1-identity-fixture`, origin `http://localhost:5374/`.

- Path: `assets/images/image-selection-fixture.svg`.
- SHA-256: `480751d64323c545b8eea3da2e8b820a78940133a7cd91af4ad5bf8ce2cc7c61`.
- Size: 282 bytes, intrinsic dimensions 240 × 96.
- Source: the prior disposable generated `image-test.svg`, with a teal circle and “Image test” on a dark rectangle.
- Creation used GET/POST `/api/development-identity/session` for the already configured `admin@example.local` / `usr_f01e0c1c58424bed9ac4e8601ff9890a`, GET `/api/apps` to verify owner, GET asset info to require absence, multipart POST `/api/apps/v1-identity-fixture/composition-asset` with `x-editor-application-id`, path and empty expectedHash, then info/list verification. The server returned 201 and the exact expected content hash.
- This was a separate authorized setup session for the same fixture identity, not extraction/adoption of another browser editor's session. No cookie/CSRF secret is retained in evidence. No I-AM or policy change occurred. An initial restricted local connection failed before sending a request; authorized local service execution then succeeded.

`asset-setup.json`, `prepare-asset.mjs` and the preserved initial failure describe the method precisely. No asset replacement was needed; the precondition refused a pre-existing fixture rather than overwriting it. No direct protected-root writes were made.

## Actual normal-Chrome composed workflow

The existing tab `1964522193` was claimed from the current browser inventory. Its URL was confirmed as `http://localhost:5374/`, with Application Admin selected and V1 Development Identity Fixture open. No desktop automation was used.

The existing disposable `image-selection-composed` Page was already **Saved**, with its Region and Image draft content retained. Initial browser source matched the saved baseline; no unsaved draft needed discarding. It was preserved. This differs from the prior submission's stopping-time unsaved state and does not rewrite that historical observation.

**Choose Application image** listed the service-prepared SVG with readable filename and full path. Selecting it and clicking **Use selected image** set the literal source through the ordinary inspector. The existing alt field was edited with actual keyboard input and Tab. An initial automation fill changed the displayed field but did not commit the change event; source observation caught this, and keyboard entry committed it. This is recorded as input-tool behavior, not claimed as successful initial editing.

Saved HTML contains:

```html
<img data-uip-node="node_fe3e65f7-4abc-4dad-aa87-15f00cdd4160"
     src="assets/images/image-selection-fixture.svg"
     alt="Composed Page image fixture">
```

The existing autosave operated under unchanged settings. When inspected after editing, Save Now was already disabled because the Page was saved. **Reload / discard editor changes** retained the literal src/alt. Closing and reopening the Page through normal controls retained the same HTML.

Saved Design Preview initially stayed at a blank `about:blank` document with loading feedback. A normal Page close/reopen and explicit Preview action loaded the real existing Preview document successfully. No product change was made and no cause is asserted for the transient load. The successful frame URL carries the saved revision and `/image-selection-composed` route. Browser observations establish:

- `complete: true`, `naturalWidth: 240`, `naturalHeight: 96`, visible bounding rectangle 240 × 96.
- Rendered src `/api/apps/v1-identity-fixture/composition-asset?path=assets%2Fimages%2Fimage-selection-fixture.svg`; currentSrc has the same path under the confirmed origin.
- Rendered Page ID `art_604e0cde-7fde-4855-a65f-b872f5afc967`.
- Image ID `node_fe3e65f7-4abc-4dad-aa87-15f00cdd4160`.
- Region `region-main`, owned by container `node_9f53ca8c-67ec-4681-af20-9f757b5ab6d1`, with wrapper `node_1a66d7b8-e634-46f8-a11c-d2e2f320bde6`.
- Original Route ID `route_c32ced29-9149-4a29-ba44-02f9fbbe5e29` and Shell ID `art_a8ca1455-8234-424c-ac66-6480701267f1` remain unchanged.
- Saved revision `15178dd8117eef7a0b47eb3b2a84d3fddf80310da5545d5a7308ca407037ce86` equals SHA-256 of JSON.stringify(files) in the actual service role order. Preview feedback reports that same opened revision.

`rendered-composed.json`, `revision-proof.json`, `saved-composed-bundle.json` and `normal-*.txt` contain the observations and saved role bytes. Verification also proves metadata bytes unchanged and that removing only the new src/alt from final source reproduces the original baseline hash. All three managed IDs and containment are therefore preserved.

A further ordinary chooser open → Cancel left source unchanged and Save Now disabled (`normal-cancel-composed.json`). Other permission/missing/stale/unsupported/conflict cases remain focused-test evidence; no accepted content was damaged to manufacture browser cases.

## Concrete new plain-Page setup limitation

Ordinary Create Page created `image-selection-plain`, intended as the new disposable plain test. The current contract attached the default Shell, so despite its name it is **an empty composed Page**, not evidence of plain-Page behavior. Artifact ID `art_bd1abcb8-51d8-4ce8-8ca6-6d71315e5287`, Route ID `route_72ff45fc-17a6-4467-80f7-3e9a123b382c`, default shared Shell unchanged. No content or metadata was edited after creation.

Read-only source review prevented the initially proposed metadata edit:

- `src/server/index.ts:435`: creation computes `input.shellId || composition.defaultShellId`; no explicit plain option survives this fallback.
- `src/server/visual-candidate.ts:52`: normal saves reject changes to Shell membership and require Change Page Shell.
- `src/server/application-composition.ts:197`: repair metadata writes also refuse a Shell change.
- `src/server/application-composition.ts:212`: Change Page Shell requires a real existing Shell; it cannot detach one.
- The ordinary creation dialog offers only the Application default or listed Shells.

No rejected metadata mutation was submitted. This is a source-backed existing setup limitation, not a demonstrated failure of the Image chooser or plain resolver. No new plain creation mode, source-admission exception, direct filesystem insertion, unguarded service call or alternate renderer was introduced. Completing the requested new plain-Page workflow requires a separately authorized supported setup/creation path; this continuation cannot claim it complete.

## Browser upload and remaining limits

The original file-chooser automation failed because the Chrome extension lacks file URL access. This continuation did not change that permission or repeat the blocked setFiles operation, and did not attempt desktop automation. No browser upload success/refresh/rendering evidence is claimed. The service-created asset does establish server upload and listing availability under the existing configured authority, while the normal browser demonstrates choosing that existing asset.

Browser screenshot captures again timed out at Page.captureScreenshot. The loading-frame observation and failed attempts remain preserved. No screenshot exists for this continuation. Website-host routes/profiles were not changed or newly qualified. No acceptance or atomic Page/asset content-pinning claim is made.

## Regression and preservation

`node scripts/verify-image-selection-continuation.mjs` passes in `evidence/v1-image-selection-continuation-20261030/run-1793406722801/`. This is the unchanged focused runner with only its output location redirected, retaining the previous 34 collected tests, 21 image checks, two Page-type Preview resolver/error fixtures, actual-editor checks, mixed runtime rendering, Preview lifecycle/regression checks and zero-diagnostic strict scoped typechecking. In-memory authorization/conflict and simulated image-error boundaries remain explicit. Existing pinned-native import.meta warnings remain in the log.

Product code did not change, so builds were not repeated. The original passing full build/server checks and seven unrelated broader-client diagnostics remain historical evidence, not newly rerun results. Blocked legacy suites remain unclaimed.

`preservation.json` checks every continuation baseline file: no missing files; original report, all original image-selection evidence, product sources, disposable code copies and existing tests are unchanged. The only changed originals are the disposable composed Page's `page.html` and the ordinary append-only Application operations log. New Application files are the uploaded SVG and six role/index files of the empty newly created composed test artifact. All accepted Home/About/Contact/Services, other plain Pages, shared Shell/Menu, settings, dependency declarations and native boundaries remain unchanged. No autosave, recovery, I-AM, security, browser permission or host configuration was modified.

`files.json` is the exact updated continuation inventory, including new evidence/report/verification runner and Application additions/changes. It also references the unchanged prior inventory and preserves its hash. The inventory excludes itself from its hash list. `verify-evidence.mjs` records the reproducible revision and preservation checks.

**Return: V1 Page Builder — Image and Asset Selection Acceptance Review Gate. Composed existing-image selection and rendering verified; new plain-Page verification blocked; browser upload unverified. Not accepted or closed. No commits or pushes.**
