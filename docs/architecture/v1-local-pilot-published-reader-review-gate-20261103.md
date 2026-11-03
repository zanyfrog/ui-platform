# V1 Local Audience Pilot — Published Reader Acceptance Review Gate

2026-11-03. **Production build succeeded from published v1 composition, but the actual loopback reader failed to render Home. Reader qualification is blocked.** No acceptance, overall pilot completion or external website availability is declared. No repair or rebuild was attempted after the runtime failure.

## Verified release input and production path

Target remains Builder Demo Application `codex-test-v1-local-pilot-20261102`, permanent ID `de8d1851-3e36-435f-b093-95ce94d940e7`. Active Presentation is v1 with exactly one version record, checksum `329fb00248abbceb655347d4889d5c4c79da8a8a49268bd221e516120dae3622` and recorded composition fingerprint `2d9c82d0944690fb0bb7c8f4df0bba0bdc59a369fc6b763f36a2dab67ee949fb`.

All **35 published composition source files** were individually hashed against accepted publication evidence and match. Published metadata contains exactly `/`, `/about`, `/contact`, with their accepted permanent identities, Public Shell, Main Navigation, repaired Admin Navigation, branding/logo, footer and site CSS. There is no Administration Page/Route. Policy is 11, and all three active functional records match the original seven-rule plan.

The existing `applicationComposition` plugin exports `revisionApplicationComposition`. Its production branch (`config.command === 'build'`) reads the active manifest and selects `presentation/versions/v1/composition`; its development branch reads source. The companion Visual plugin delegates package/graph data to that composed module. The build therefore consumes the frozen composition rather than draft Page/Shell/Menu content. No new renderer or deployment framework was introduced.

The normal Application build still uses its runtime bootstrap, index.html, installed packages and application-services helper. Their exact input hashes are recorded separately in `verified-input.json`; the services source is the existing empty registration module. These inputs are not pinned by the Presentation fingerprint. This evidence establishes snapshot selection within the existing production mechanism and recorded unchanged inputs; no content-edit isolation experiment or reproducible-build claim is made.

## Build result and exact command

Working directory: `C:/Projects/Modular/builder-demo/apps/codex-test-v1-local-pilot-20261102`.

```text
npm.cmd run build -- --outDir C:/Projects/Modular/ui-platform/evidence/v1-published-reader-20261103/candidate
```

Child-only environment: `UI_APP_BASE=/`; `UI_PLATFORM_API_PORT` removed. No global environment or security settings changed. The existing script ran application-services build, `tsc --noEmit`, then Vite production build. **Exit 0; Vite 8.2.2 compiled 111 modules.** Its warning says the new output directory is outside the project and will not be emptied. No `--emptyOutDir` override or historical-output deletion was used.

Four generated files are preserved in the new unserved-then-served candidate directory:

- `index.html`
- `assets/index-bAfjR2T9.js`
- `assets/index-BrMR0q6f.css`
- `assets/ui.component-D4ECKwkg.json`

`output-inventory.json` records each exact size/hash and aggregate inventory fingerprint **`c2f711e76a4a583ee2bce29316cd8fdcedf15964cd7bcfd04ce4cf6e0cfdcc99`**. This output digest is distinct from the published source fingerprint. The output is not a successful runtime qualification merely because compilation passed.

## Reader admission, process and binding evidence

The supported Vite `resolveConfig` preview preflight resolved root base `/`, output exactly the new candidate, host **127.0.0.1**, port **5189**, strictPort true, no preview/server proxy and no custom preview-server hooks. Inherited management proxy activation was prevented in the child environment. No Builder API proxy was enabled and no session/security databases were copied into the four-file output.

The restricted connection probe returned EACCES; that failed result is retained in `preflight-restricted.json`. With authorized local access the same read-only TCP probe returned ECONNREFUSED, establishing no listener at that instant. Strict-port startup provides the subsequent collision refusal rather than fallback.

The existing static reader command was then started once:

```text
npm.cmd start -- --port 5189 --strictPort --outDir C:/Projects/Modular/ui-platform/evidence/v1-published-reader-20261103/candidate
```

Its existing script expands to `vite preview --host 127.0.0.1` with those arguments. The child retains `UI_APP_BASE=/` and has `UI_PLATFORM_API_PORT` removed. The CLI reports `http://127.0.0.1:5189/`. Actual Chrome reached this endpoint and loaded its built JavaScript, confirming reachability. No public/LAN binding option was used.

Operator identity is **`nimo-laptop\zanyf`** from `whoami`. Owned launch shell PID **25068**, npm Node PID **36048**, final Vite Node PID **7872**, execution session **7169**, with the intermediate parent chain in `owned-reader-processes.json`. The read-only broader process inventory records names/IDs only; no unrelated process was terminated or restarted. Existing Builder Demo was preserved.

Operational qualification: CIM's listener query returned no matching records despite reachability. The standard socket observation associated 127.0.0.1:5189 with owned PID 7872 but did not provide a LISTENING row. Exact exclusive OS listener enumeration is therefore **not independently qualified**. The supported resolved configuration, explicit command, CLI output and actual browser destination establish the intended loopback boundary; no stronger socket-inventory result is claimed. No Windows VM/token/elevation investigation was pursued.

The owned reader remains running for review, serving the preserved failed candidate; it is not a usable website. Its launch session/process chain identifies what may later be stopped. No cleanup or unrelated process stop was performed in this phase.

## Actual browser failure and immediate boundary

Normal Chrome opened `http://127.0.0.1:5189/` in a separate reader tab. Document title became Local Pilot, but actual content stayed blank. The browser console reports:

```text
Error: Unsupported or malformed img src URL. Use an allowed scheme or a relative path without whitespace or backslashes.
at .../assets/index-bAfjR2T9.js
```

The exact console record, sanitized empty accessibility state and desktop failure screenshot are preserved. No Design Preview was substituted, and neither the HTTP response nor title is reported as successful Home rendering.

Immediate read-only source/output inspection identifies the concrete mismatch: the composition plugin imports logo assets with Vite `?url`. The production output maps `assets/branding/logo.svg` to an inlined `data:image/svg+xml` value containing the accepted 64×64 logo. Existing `validateManagedUrlAttribute` permits HTTP/HTTPS or relative image URLs and rejects `data:`. The runtime exception matches that policy. This explains why the normal build can succeed while managed composition mounting fails.

The smallest remedy to review separately is preventing data-URL inlining for these trusted composition assets using existing Vite asset configuration or explicit non-inline imports, preserving the current URL validator. No scheme-policy weakening, source edit, configuration patch, second build or new Publish was attempted here. A separately authorized correction must verify the emitted logo path and actual runtime rendering, then use a new candidate directory.

In accordance with failure handling, further qualification stopped at this first render failure. About/Contact direct loads, cross-Page navigation, `/admin`/unknown-route behavior and mobile rendering are **not qualified in this reader**. The existing runtime has a Page-not-found branch for unmatched routes, but it was not presented as observed browser evidence. Prior mobile Design Preview evidence remains historical, not reader proof. No Builder management interface appeared in the blank reader; this is not a substitute for complete reader interface verification.

## Preservation and exact inventory

Before/after snapshots show **no changed, added or removed regular Application file**, including service build output content, all authoring Pages/draft, repaired Menus, Shells, active Presentation v1/35 snapshot files and publication manifest/history. Persistent Demo and fixture content are unchanged.

All seven security-table digests and Application registration records match. Policy remains 11, exactly seven accepted functional records remain, `ui.page.admin` remains absent, and the administrator anchor and all prior candidates/audits are preserved. Dependency package/lock/archive hashes match; UI Base remains physical and all 54 accepted payload hashes match. No installation, trust change or security-store write occurred.

All new build/output and evidence files are confined to `evidence/v1-published-reader-20261103/`, plus this separate report. `files.json` lists their exact paths/sizes/hashes; `preservation.json` records the scoped before/after comparison. The build log, restricted probe failure, successful configuration preflight, process/socket observations and browser failure are retained. Existing reports/evidence were not overwritten. Vite may create ordinary transient configuration/cache files; no whole-machine temporary-file inventory is claimed.

Stopped at **V1 Local Audience Pilot — Published Reader Acceptance Review Gate**, blocked on the production asset URL mismatch and with the listener-enumeration qualification stated above. No second Publish, authoring edit, permission/identity/registration change, production repair, export, dependency change, public/LAN deployment, commit or push occurred. Reader delivery and overall pilot completion are not declared.
