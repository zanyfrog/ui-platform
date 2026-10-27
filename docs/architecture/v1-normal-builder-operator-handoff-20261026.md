# Normal Windows development smoke-test handoff

The previous normal smoke report is accepted as a correctly documented blocked attempt. **The V1 Normal Builder Smoke Test remains open.** This handoff makes no normal-browser success claim. No full startup was repeated in the restricted environment.

## Operator launch

Open a fresh, ordinary **unelevated PowerShell** terminal. Open `C:\Projects\Modular\ui-platform\scripts\operator-v1-normal-smoke.ps1`, copy its complete contents, and paste them into that terminal. The helper is newly authored for this handoff; its final application command is the existing **`npm.cmd run dev`**, verified in the copied package.json. It changes only that terminal's product environment variables. No execution-policy or Windows-security change is required or authorized.

Exact working directory: `C:\Projects\Modular\v1-normal-smoke-20261026-01\ui-platform`.

The previous disposable copy remains present. Inspection during this handoff found no retained lock, recovery guard or pending journal. Its owner marker, manifest, active settings and expected identity database are present. This is nonmutating inspection, not a database repair/integrity or live-session guarantee; the operator procedure rechecks ownership/state before startup. Do not use an original operational Application as a fallback. If this copy fails the checks, stop and preserve the result; no replacement setup is needed based on current inspection.

Admitted writes remain within `C:\Projects\Modular\v1-normal-smoke-20261026-01`: copied project build outputs, cache, catalog, Components coordination; disposable `apps` source/coordination/normal Save staging and immutable artifact identity publication; `runtime` development identity SQLite/WAL/SHM; and unique `operator-checks` probe files. `UI_APPS_DIR`, `UI_RUNTIME_DIR`, `UI_TEMPLATES_DIR`, `UI_PLATFORM_V1_POLICY_STORE` and Vite cache explicitly point there. V1 development identity is enabled; WP0 is disabled, matching the existing built-in development Application mechanism. No registry/identity outside this root is admitted.

The helper first checks for unexpected reparse points and lock/journal conditions without reading journal contents or changing them. It then creates a hard link between new probe filenames on the same filesystem; tests HTTP through both 127.0.0.1 and localhost using its own short-lived server; and tests exclusive binding of requested ports **4390, 5374 and 5375**. Each temporary listener closes before application startup; new probe files and `result.json` are retained. Any failure stops before `npm run dev`. Do not free ports by killing unrelated processes or bypass publication.

Port availability can race after inspection. Treat startup bind failures as a stop. Required success messages are:

```text
UI Platform API listening on http://localhost:<api-port>
UI Platform: http://localhost:<ui-port>
UI Platform API: http://localhost:<api-port>
```

Use the URL printed after **`UI Platform:`**. The requested UI port is 5374, but a planned address is not proof of readiness. Do not append Markdown asterisks. If only the API message appears, the UI is not ready. If errors appear even alongside readiness messages, stop rather than treating the launch as clean.

Stop normally with **Ctrl+C in the launching terminal**. The existing dev launcher handles SIGINT/SIGTERM, closes Vite/front and signals the API; the API has its own shutdown handler. If shutdown is uncertain or a subsequent launch sees retained coordination state, stop for operator review; no force cleanup or recovery is included.

## One workflow checklist

1. Retain the environment-check `result.json` and actual API/UI addresses. Open the printed UI URL in the existing normal browser.
2. In **Development identity**, select the option containing **admin@example.local**. This uses the existing session endpoint and I-AM policy; record whether sign-in succeeds. Never record cookies, CSRF tokens or session revisions.
3. Open **V1 Development Identity Fixture**, owner **dev-v1-identity-fixture**, and its **Builder**. Confirm there is no owner, permission, source or catalog error. If needed use the existing **Create Page** control to create a disposable Visual Page named `v1-card-panel-smoke`, then select it. If a different UI prevents this, record the exact state rather than changing architecture.
4. Add **UI Base Card** using the existing component picker. In Properties set heading `V1 saved Card A` and body `Saved Card body A`. Click **Save Now**, wait for success, then **Reload / discard editor changes**. Confirm the heading/body and node identity persist.
5. Click **Design preview** inside the Visual editor. Confirm visible UI Base Card rendering and saved values. Record the selected Page locator, node ID, save/read hash and Preview request hash. The latter hashes must agree. Use browser Network response/request inspection if needed; do not share a raw HAR containing credentials.
6. For the unsaved test, first disable autosave through the existing **Settings → Editor → Autosave** screen **only if the current authority permits it**. Do not add grants, edit the database or race the default autosave delay. If that setting is unavailable/denied, leave this check pending and report the exact limitation. With autosave confirmed off, change the heading to `V1 unsaved Card B`, do not Save: the existing saved Preview must still show A, and dirty Preview initiation must be refused. Reload/discard and confirm A returns.
7. Repeat Add → Properties edit → Save Now → Reload → Design preview with **UI Base Panel**, using distinctive supported values/text. Record identity and saved/Preview hashes, plus its visible rendering. If its property contract lacks a particular Card field, use Panel's actual supported controls and record them.
8. Record each step as passed/failed/pending with exact observed messages and screenshots of rendering where available. Stop on recovery-required state, busy/foreign/unknown locks, cleanup errors, invalid owner/session, unauthorized source, invalid manifest/catalog, or conflicting hash. Do not use Advanced source repair, Current Preview/application runtime, or restricted production Preview for this test.

A successful probe or startup alone is not acceptance. Card and Panel Add/Edit/Save/Reload/design Preview and saved-only behavior must actually be observed. If a product defect appears after a clean launch, retain its reproduction and identify the smallest affected existing component before proposing a direct fix.

## Handoff validation

The helper was parsed as PowerShell and its embedded JavaScript syntax checked without executing probes or starting servers. The existing command, root variables, readiness strings, sign-in selector and editor labels were verified from the disposable copy's source. The previous smoke evidence and accepted HTML-first/recovery-free changes were not rewritten. No product code, Foundation hard-link behavior, authorization, renderer or persistence architecture changed. No commits or synchronization.

Operator execution and normal browser verification: **pending**.
