# V1 Page Builder — Image and Asset Selection Acceptance Review Gate

2026-10-30. **Implementation submitted with an incomplete normal-browser verification gate. Not accepted or closed. No commits or pushes.**

The bounded Image chooser and plain-Page saved Design Preview resolver are implemented. Focused checks and relevant builds pass. Required normal-Chrome image selection, upload, Save/Reload and rendered-image verification for both Page types remain blocked and are not claimed as demonstrated.

## Implemented behavior

- Managed HTML Image inspectors offer **Choose Application image**, retaining ordinary literal src/alt controls and existing URL validation. Branding-bound Shell images retain their branding authority and do not offer conversion through the chooser.
- The chooser uses existing authorized Application asset listing and info endpoints. Canonical supported SVG/PNG/JPG/JPEG/WebP/ICO paths are eligible; PDF/TXT, malformed paths and duplicate full paths are excluded. Labels include both filename and path to distinguish duplicate basenames. Loading, empty, denied and failed states are distinct. Refresh and cancellation remain available.
- Selection rechecks asset info and refuses missing/unsupported/ambiguous choices. Captured editor identity, Page/Shell kind, managed node, source, metadata, Application key, lifecycle and selection generation must still match before existing setNodeAttribute changes literal src. Captured transport authority rejects revoked sessions. No API/object URL, filesystem path, asset UUID or JSON property is persisted.
- Upload shares the existing composition-manager path generator and upload operation: info lookup, explicit replacement confirmation, binary FormData, expectedHash and existing server serialization/ownership/permission checks. Successful upload refreshes chooser choices. Upload does not itself set src. Page edit grants no presentation permission; server view/edit checks remain decisive. No authorization or server route was changed.
- A dedicated, bounded asset transport is needed because focused artifact transports intentionally reject cross-artifact writes. It permits only GET or binary POST to that tab's original Application composition-asset endpoint, retains original session/Application ownership, and rechecks context around each request. The ordinary focused mutation transport is unchanged.
- The plain Page Preview mount receives the same resolver as composed Pages. Other plain artifact kinds retain their mounting options. Saved HTML and revision/lifecycle transport are unchanged.
- Existing runtime onError reports image load/decode failures for mounts using an asset resolver; saved Preview displays these in its existing events output. Extension eligibility is not a successful decode guarantee. No sanitizer/scanner was introduced.

The asset-info hash verifies bytes at selection time. Path references remain mutable through existing replacement operations; there is no content pinning or atomic Page/asset revision claim.

## Actual normal-Chrome evidence and blocker

The existing disposable Application is `dev-v1-identity-fixture` at `http://localhost:5374/`. Source copies were updated in its existing disposable client; no host profile was expanded.

1. Reload showed the existing session signed out. The existing Application Admin fixture was selected through the ordinary Development identity control. No I-AM policy or permissions were edited.
2. Through Pages → Create Page, created a new disposable composed Page `image-selection-composed`, route `/image-selection-composed`, using the default shared Shell. Artifact ID observed: `art_604e0cde-7fde-4855-a65f-b872f5afc967`.
3. Through **Create Page-specific main content**, Insert element → img → Insert selected item, created a draft Image in the Page-owned main Region. Observed Image ID `node_fe3e65f7-4abc-4dad-aa87-15f00cdd4160`, Region container `node_9f53ca8c-67ec-4681-af20-9f757b5ab6d1`, actual Region `region-main`. This draft was not saved.
4. **Choose Application image** opened and the real listing returned **No eligible Application images**. `normal-created-composed.txt` and `normal-choices.txt` contain direct DOM observations. There was no valid existing image to choose.
5. Expanded Upload Application image and invoked the real file chooser with the disposable generated `image-test.svg`. Browser upload automation failed: `To enable file upload, go to chrome://extensions in Google Chrome, click Details under the ChatGPT extension, and enable "Allow access to file URLs."` No upload POST was submitted by this workflow, and no asset was created. No extension setting was changed.
6. An ordinary native-picker fallback was attempted. Computer control stopped because it could not determine the current browser URL on Windows with enough confidence to enforce policy. No further browser or desktop input was sent.

The browser may retain the native file picker and unsaved composed-Page draft. No browser cancellation/cleanup success is claimed. The two generated files in evidence are test inputs, not uploaded Application assets. No screenshot succeeded or was captured in this increment.

**Still required:** normal-browser existing-image selection, upload success/refusal, Save/Reload/literal src and alt persistence, actual image decoding and saved Preview for composed and plain Pages, browser denied/missing/stale/unsupported demonstrations, and existing qualified host navigation checks. A plain test Page has not been created. No new route qualification is claimed. Do not treat the focused fixtures below as substitutes for these browser requirements.

## Focused verification and builds

Final runner: `node scripts/verify-image-selection.mjs`, output `evidence/v1-image-selection-20261030/run-1793406094433/`.

- 34 collected passing source/service regression tests retained from the guided/mixed-Page boundary runner.
- 21 image checks in `images.json`: image-only/canonical-path filtering, duplicate paths/basenames, empty/denied/failed listing, verified literal path, missing path refusal, stale async selection, cancel during loading, replacement cancellation, binary upload/expectedHash, upload permission refusal, hash conflict, stale upload before write, existing path generation, upload refresh, actual editor cancellation without source/dirty changes, src/alt Save/Reload with managed identity and Region containment, actual node/Application context changes and advanced invalid src refusal.
- `image-preview.json` executes the actual saved Preview client and runtime with fake revision transport for both Page types. Both resolve literal assets/images/test.png to the existing authorized API URL and preserve authoritative HTML. Simulated error events produce visible load/decode failure output.
- Existing actual-editor guided content, mixed runtime rendering and Preview revision refusal/disposal/Reload/Back/Forward fixtures pass.
- Strict scoped typechecking passes with zero diagnostics. The changed adapter is also covered by the broader client check, which reports no new diagnostics.
- Full `npm run build` passes: platform core, artifacts, visual-artifacts, production Vite client and server TypeScript compilation. Server no-emit check passes separately.
- Broader client typecheck retains exactly seven unrelated diagnostics: six existing sibling ui-base fixture/native declaration gaps and the main.ts string-or-boolean diagnostic. Raw logs are retained. Pinned native import.meta bundling warnings remain. Previously blocked legacy suites were not rerun and are not represented as passing.

All chooser/upload permission and conflict checks above use in-memory transports. The Preview decode error event is simulated. They do not establish actual browser decoding, production authorization or filesystem conflict behavior. Earlier passing run directories and logs remain unchanged; later runs add Preview checks, invalid URL checks and the Page-only resolver scope.

## Preservation and exact inventory

`preservation.json` checks 667 baseline files. Every pre-existing Application source file and accepted guided historical evidence file matches. The sole changed original Application file is its ordinary append-only `.uib/logs/operations.jsonl` after creating the disposable Page. Existing Home/About/Contact, Services, ten unrelated plain Pages, shared Shell/Menu, settings and package declarations remain unchanged. Accepted native fixture hashes are checked by the runner. No protected Component root, dependency declaration, host configuration, permissions, autosave, recovery or Windows security file was edited.

`files.json` is the exact SHA-256 inventory grouped by product source, disposable copies, verification files, report, evidence, Application additions/changes and regenerated build outputs. `source.diff` retains the tracked implementation delta; new source files are included individually in files.json. The two pre-existing untracked closure/assessment documents are excluded from this increment's changed-file inventory and remain unchanged.

Product files (six):

- `src/client/visual-artifacts/image-selection.ts` (new)
- `src/client/visual-artifacts/editor.ts`
- `src/client/visual-artifacts/preview.ts`
- `src/client/visual-artifacts/composition-manager.ts`
- `src/client/builder-workspace/adapters.ts`
- `packages/visual-artifacts/src/runtime.ts`

Verification files: `scripts/verify-image-selection.mjs`, `tests/image-selection/browser.ts`, `tests/image-selection/check.mjs`, `tests/image-selection/preview-check.mjs`.

**Stop: V1 Page Builder — Image and Asset Selection Acceptance Review Gate, browser evidence incomplete. Separate approval is required for acceptance or closure.**
