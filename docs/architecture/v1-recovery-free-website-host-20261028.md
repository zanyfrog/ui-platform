# V1 Page Builder — Recovery-Free Website Host Admission Review Gate

Date: 2026-10-28. **Bounded host adaptation and verification complete; submitted for review, not qualified or accepted. Anchor implementation remains paused.**

## Result and admitted inputs

The operator launched the existing Vite tool in a second regular terminal. Normal Chrome renders the disposable Page at **http://127.0.0.1:5188/v1-website-host-20261028**. Actual heading/paragraph/managed identities match the UI-authored source; browser runtime error log is empty. A verified screenshot is retained as `normal-website.png`.

| Input | Exact disposable location |
|---|---|
| Reference-host copy | `C:\Projects\Modular\v1-normal-smoke-20261026-01\ui-platform\references\visual-artifacts-host-20261028` |
| Application owner | `C:\Projects\Modular\v1-normal-smoke-20261026-01\apps\v1-identity-fixture` — `dev-v1-identity-fixture` |
| Page owner/entry | Application `src/pages`, selected `v1-website-host-20261028/index.ts` and its normal role bundle |
| Component owner | Host copy `.inputs/components` — newly created, no Component records |
| Explicit Component/package manifests | None; Application dependencies and manifest package entries must remain empty for this plain-host admission |
| System dependencies | Existing physical copies under disposable `ui-platform/node_modules`; notably Vite, Visual runtime/Vite plugin and platform-core application-data |
| Generated cache | Host copy `.vite-cache`; loopback 127.0.0.1, strict port 5188 |

The original reference host's 16 files are unchanged. The copy preserves its pathname router and popstate/remount behavior; only its Page import is redirected. Its index.html is an exact copy. Adapted Vite configuration provides explicit roots, owner-marker checks, strict filesystem allow roots and existing dependency deduplication. Visual runtime/guard prebundling is excluded to retain one guard-module identity; this is ordinary Vite configuration, not a new activation mode. No new router/renderer/framework or installed package.

The fresh Page was created and saved through the normal Builder at localhost:5374 using the existing Application Admin (admin@example.local) principal. Artifact `art_70940639-812c-4dba-8749-3130f441944f`, route `/v1-website-host-20261028`; heading “Recovery-free website host”; paragraph “This disposable Page is rendered by the existing Visual reference host.” No Component, Form, custom function or protected-data behavior is exercised. Ordinary website rendering retains the existing local public-development model; it is not an alternative management identity or permission grant.

Page HTML SHA-256, equal between the captured Builder source and current file:

`a8548edfed3a8277fc46bf45c27c9c17c341519124c2b93e7c4a0641b559a557`

## Recovery refusal at actual boundaries

Three logical product source files changed:

1. `revision-vite.ts`: Component-root and Page-root guard calls explicitly pass `recovery:'refuse'`; runtime graph capture also passes it explicitly.
2. `runtime-read-admission.ts`: the actual Foundation graph boundary forwards `{...options,recovery:'refuse'}`, so caller/default options cannot overwrite refusal. Timeout/cancellation options remain forwarded; capture replay semantics are unchanged.
3. `runtime-revision.ts`: both initial mutable role snapshot and the finish-time role recheck explicitly pass refusal.

These six calls are checked by TypeScript AST inspection, including that refusal is the final property rather than a value later overwritten by a spread. The selected host uses the mutable Page/Component read path; no immutable/published-input shortcut or compatibility fallback is used. Existing Foundation implementation is unchanged. The function named recoverRoleBundleRoot is used only in its already accepted refusal mode, which checks pending-state presence without interpreting/replaying journal bytes.

Recovery refusal is **not** a side-effect-free claim: healthy graph/role reads may create coordination directories and acquire/write/release their own lock files. Vite creates its own cache. Pending/foreign conditions must refuse; no foreign lock cleanup, liveness probe, journal replay or repair is admitted. Other host configurations, Shell/composition plugins, published inputs and arbitrary callbacks are not qualified by this report.

## Focused safety evidence

Final run: `evidence/v1-recovery-free-host-20261028/run-1793199263113`.

- Six tests pass against actual loader, RuntimeRevision and Foundation source modules: successful Page plus Component capture; Component/Page root pending-state refusal; initial role and finish-time recheck refusal; foreign Page-role lock preservation; foreign graph-lock refusal/cancellation with no callback; outside-owner Page entry refusal before acquisition.
- Guarded filesystem traces confine product IO to authored disposable fixture roots. Malformed test-owned pending journal bytes are never read by the refusal paths. Foreign locks remain unchanged. PID probes are replaced by a throwing tripwire; none occur. Healthy reads leave their own lock directories empty. Test teardown removes only checked, test-authored fixture trees after assertions; it is not runtime recovery or operational cleanup.
- Static dependency admission and exact input snapshots are retained. Six read-boundary calls require explicit refusal and final-option precedence. Source hashes are rechecked after execution; no silent default read path is substituted.
- `check-host-inputs.mjs` passes physical disposable-root checks, original-router/index comparisons, empty Component input check, Page/owner/dependency checks, ESM export resolution and copied-reader hash equivalence. The live host uses these explicit inputs and unchanged manifest contracts.
- Existing shared-package build (`npm.cmd run build --workspace @ui-platform/visual-artifacts`) and diff whitespace check pass. This strict package build covers the changed TypeScript readers; no Foundation writer or mutation contract changed.

Startup alone is not the recovery evidence: the explicit call inspection, actual fault tests/traces and input/dependency admission establish the bounded read contract before startup. No real journal, foreign operational lock, protected Component root, policy database or security token was inspected to manufacture proof.

## Normal website evidence

Operator command, from the disposable ui-platform directory:

`node.exe .\node_modules\vite\bin\vite.js --config .\references\visual-artifacts-host-20261028\vite.config.ts`

Printed Vite 8.2.2 Ready and http://127.0.0.1:5188/. Chrome directly loaded the saved route. Actual shared-runtime shadow DOM contains artifact `art_70940639-812c-4dba-8749-3130f441944f`, heading node `node_bca9c772-ef5e-4ffd-91bd-6d0c2df6890d`, paragraph node `node_9b091f0a-e09d-4897-81ac-78841cd48555`, expected text and all five managed IDs. No runtime console errors were recorded. Screenshot was visually inspected and shows the correct website content.

The management API later refused an optional final saved-role comparison at localhost:5374; it was not restarted or bypassed. The host continues to render from its admitted filesystem source. The captured normal Builder source, on-disk Page HTML and metadata match the browser identities/content; no final management API hash comparison is claimed or required to substitute for source pinning. This does not qualify new authentication or management behavior.

## Preservation and limits

All 49 pre-existing Page files and all 16 original reference-host files remain unchanged. Of 73 baseline entries, only the three intended runtime read sources differ; the other 70 are unchanged. Foundation role-bundle/storage source, existing client/header/refresh differences and historical evidence/inventories are preserved. HEAD comparison is recorded; no commits/pushes.

Evidence directory: `evidence/v1-recovery-free-host-20261028`. It contains baseline/pre-edit/deployment snapshots, exact test admissions/graphs/static calls/results/traces, host root/dependency admission, normal UI source, website DOM/errors/screenshot, final Page snapshot, input comparisons and preservation checks. Failed attempts remain: initial root TypeScript 7 compiler API mismatch corrected to the existing package's TypeScript 6.0.3; an over-strict fixture assertion corrected to permit refusal's metadata-only lstat of a recovery guard; CommonJS resolution of an import-only export corrected to inspect its existing ESM import condition; a Create Page route locator narrowed to its dialog before either route was edited. Details are in attempt-notes.json; no product safety policy was relaxed.

Exact inventory: `v1-recovery-free-website-host-files-20261028.json`. It distinguishes product/test/host/Page/evidence files from a generated-host-cache snapshot. Live owned coordination directories are not treated as product source or frozen historical artifacts; no cleanup was performed.

This establishes one candidate plain website host for review, not full runtime recovery safety across every plugin, production delivery/security, restricted Saved Preview, Component execution or host routing configuration. Initial-fragment/click/history/focus/anchor behavior was **not** implemented or qualified. No I-AM, permission/settings/autosave, Windows token/VM/WinPE, protected source mutation or production activation work. Normal-browser unsaved-draft Preview protection remains deferred.

Stop: **V1 Page Builder — Recovery-Free Website Host Admission Review Gate**. Review is required before the host is qualified; do not resume anchor-navigation implementation until this gate is accepted.
