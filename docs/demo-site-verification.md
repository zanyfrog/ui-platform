# Persistent Builder Demo verification

Date: 2026-10-18. Scope: user-requested local demo setup, not a new Builder work package or acceptance review.

## Saved deployment

- Root: `C:/Projects/Modular/builder-demo`.
- Native Standard Application key: `demo`; display name: `Builder Demo`.
- Permanent Application ID: `c6aa0b22-7aa2-4c9d-b659-76bf74802cc6`.
- Builder: `http://localhost:5274`; local API: port 5280; dedicated development WebSocket: port 5276.
- Native preview allocates its own ports. Use `npm.cmd run demo:preview` to obtain the current Public/Admin URLs.

## Verified

- Created a separate development identity/policy store using the existing initializer and explicit local setup capability. Normal protected Platform role activation, Application creation, owner-ledger registration, first-Application onboarding and scoped authoring-role activation succeeded.
- Opened the actual authenticated Builder in the browser. Selected `admin@example.local`, opened Builder Demo → Pages, and verified native Create Page/Shell/Form/Dataset/Menu, asset upload and composition artifact controls.
- Opened Main Navigation, edited Home to **Demo Home** using the native Menu item dialog, and saved through **Save Now**. No Application JSON/source was edited to perform this change.
- Stopped only the verified demo process tree and restarted the existing deployment. Application ID, native policy revision **5**, Menu SHA-256 `37af65660eb39709455631b56b36d9f2767cbc5d82a8b8e119b67de8e2e86429`, and saved Menu label were identical. No bootstrap/grants were replayed. This local demo process-restart check is not A37 full management-restart acceptance.
- Started the existing protected managed preview with the saved owner identity. Actual browser navigation rendered the Public and Admin Shells and shared Platform Component. The Public Menu displayed **Demo Home**, and its Administration link navigated to the Admin Page.
- Anonymous management API access returned **401**. `mixed@example.local`, which received no demo grants, was denied access to the demo Application with **403**.
- A second launcher refused occupied port 5280 without stopping the current server, resetting source or changing authority.
- UI Platform typecheck passed. The standalone demo TypeScript check passed with Node types and the repository's NodeNext/strict settings. `node --check scripts/dev.mjs` passed. Production-client exclusion passed against the existing production build. The startup rebuilt platform-core, artifacts and visual-artifacts successfully.

Browser screenshots and before/after restart records are saved in `C:/Projects/Modular/builder-demo/evidence`. They are new demo evidence, separate from accepted package snapshots. Full package regressions, full production rebuild and Data Services regressions were not rerun for this local setup-only change; no Data Services source or production client implementation changed.

## Unsuccessful/transitional attempts retained

The following directories contain only setup attempts created during this request, preserved rather than silently removed:

1. `C:/Projects/Modular/builder-demo-setup-attempt-20261018-01`: the local security initializer correctly rejected setup without `NODE_ENV=development`. The demo command now explicitly selects development mode before initialization.
2. `C:/Projects/Modular/builder-demo-setup-attempt-20261018-02`: sandboxed platform immutable file links failed with EPERM. Normal approved local execution was used; no platform storage/locking check was weakened.
3. `C:/Projects/Modular/builder-demo-setup-attempt-20261018-03`: Node fetch rejected chosen port 4190 as a bad port. The API now uses 5280. An existing development server occupied default WebSocket port 24678; an optional WebSocket-port setting in the existing development launcher gives the demo its own port. The initial deprecated Vite HMR option was replaced with the installed Vite `server.ws` contract.
4. `C:/Projects/Modular/builder-demo-setup-attempt-20261018-04`: native onboarding rejected self-escalation when the proposed initial Application administrator was the acting Platform security administrator. Final setup uses separate administrators through the same native service, with no authorization exception.

Standalone TypeScript checking initially omitted the installed compiler's `--ignoreConfig` and explicit Node types; the corrected check passed without weakening compiler settings. No failed attempt was claimed as successful.

## Changed-file inventory

- `README.md`: discoverable demo entry point.
- `package.json`: `demo` and `demo:preview` commands.
- `scripts/dev-demo.ts`: persistent opt-in local setup and startup; native identity-safe preview selection; no reset/regrant on ordinary restart.
- `scripts/dev.mjs`: optional `UI_PLATFORM_HMR_PORT` selects a separate development WebSocket port; the ordinary unset behavior is unchanged.
- `docs/demo-site.md`: startup, saved-file locations, limitations and Codex testing agreement.
- `docs/demo-site-verification.md`: this record.

Local runtime/Application files and the generated demo `AGENTS.md` live outside the source repository. Pre-existing new WP5-D browser evidence and separately appearing WP5 planning/prerequisite document changes were not created, edited, removed or reconciled by this demo work. No commit/push was performed.

## Retained boundaries

The mutable demo is not a deterministic regression fixture. Source-reader contention remains WP5-F; browser authoring was quiesced before runtime startup. No reliable simultaneous-use claim is made. No applied Dataset, unrestricted data endpoint, unapproved service registration or new policy/rendering engine was introduced. Existing native Apply/Connect is required for data-backed behavior. WP5-E was not implemented. A37 remains WP6, all 40 umbrella acceptance requirements remain unchecked, and full Builder V1 acceptance is pending.

## Start/Stop command files — 2026-10-18 follow-up

The user requested commands usable when PowerShell script execution is disabled, including stopping all services started for the demo. Added repository-root `Start Demo.cmd` and `Stop Demo.cmd`, plus `scripts/demo-control.mjs`. The opt-in demo launcher now accepts `--with-preview`, records a private local process-control pipe in its runtime directory, and stops only its own child service tree. No system execution policy is changed. No process is selected for termination by port, generic executable name or an unchecked PID. Saved source, policy, identity and data are untouched by Stop. Concurrent Stop requests share the same shutdown operation.

Actual verification used `powershell.exe -NoProfile -ExecutionPolicy Restricted -Command` to execute both `.cmd` files. Start launched Builder/API/WebSocket plus the native Application preview. Repeated Start reported the already-running demo. Stop completed successfully; observed ports 5274, 5276, 5280 and the allocated Application UI port 50043 were closed. A separately launched unrelated Node HTTP probe on port 64364 remained available. A repeated Stop reported no managed demo, without error. Start then relaunched the saved demo successfully. The temporary unrelated probe was closed after verification.

The Application manifest SHA-256 remained `4c64b462a5a9207ed245f76e8d905769ce9abe47392239248cded008bbbcb1a3`; the Menu hash remained `37af65660eb39709455631b56b36d9f2767cbc5d82a8b8e119b67de8e2e86429`. Standalone strict NodeNext demo TypeScript checking and Node syntax checking of the new controller passed. Full package regressions were not rerun for these local command wrappers. Unrelated concurrent repository changes and accepted evidence were left untouched.

Additional changed files: `Start Demo.cmd`, `Stop Demo.cmd`, `scripts/demo-control.mjs`; updated `scripts/dev-demo.ts`, `README.md`, `docs/demo-site.md` and this verification record. The existing authoring/runtime contention limitation remains; starting the required servers is not proof of reliable simultaneous browser use. After restarting services, select the development identity again because browser sessions are held by the running server.

## Blank-page / misleading-status reconciliation — 2026-10-18

The user reported that the old reference Admin URL on port 5193 and Builder on 5274 were unavailable despite launcher status. Direct checks found 5193 stopped (an obsolete reference deployment), while Builder HTML, management API health and the running preview HTML returned HTTP 200. Actual browser rendering reproduced a blank Builder. Its eight direct UI-Base optimized dependency requests returned HTTP 504 (outdated optimized dependencies). The shared development cache had been invalidated by other development runs. HTML/launcher liveness alone had incorrectly been treated as readiness. The previously printed `/admin` runtime URL also returned HTTP 404: the native managed preview uses the `/demo/` Application base.

Added an opt-in `UI_PLATFORM_VITE_CACHE_DIR` setting to the existing development launcher and configured this demo to use its own `runtime/manager-vite-cache`. No shared cache or Application source was deleted. Added `scripts/demo-health.mjs` and its TypeScript declaration. Startup and status now check Builder HTML, management API health, Builder entry JavaScript and optimized direct dependencies, plus `/demo/` and `/demo/admin` runtime responses. Startup distinguishes initialization from readiness; Start refuses to create another copy when the existing launcher is active but unhealthy. Stop remains available independently of HTTP health. Printed runtime links now include the correct Application base. These are local process/readiness checks, not an authorization or rendering engine, and do not remediate D6 source locking.

The improved status check detected the actual eight dependency HTTP-504 responses before recovery. After restarting with the isolated cache, live health checks passed and the browser rendered both the corrected Admin URL and the authenticated Builder workspace. The preserved Application ID remained `c6aa0b22-7aa2-4c9d-b659-76bf74802cc6`. Browser evidence is in the demo's separate `evidence` directory. During restart an active launcher was observed in its starting phase; the command correctly refused to create an additional instance, and subsequent health checks confirmed readiness.

Focused regression: `tests/demo-health.test.ts` **3/3 passed**, covering healthy dependencies/correct base path, HTTP-200 shell with a dependency HTTP-504 failure, and an unavailable Admin page. Strict standalone demo TypeScript and development-launcher syntax checks passed. No full package regression rerun or broader Builder acceptance is claimed. Other concurrent source, architecture and evidence changes were preserved.

## One-command combined demos — 2026-10-18

The user explicitly requested a single command starting all services for both demonstrations. `Start Demo.cmd` now launches the saved demo with `--with-preview --with-reference`. If its saved launcher is already active, an authenticated local process-control request starts any missing groups without duplicating processes. `Stop Demo.cmd` stops both owned service trees, including the reference API and Vite servers, saved Application preview/API, Builder/API/WebSocket and managed child hosts. No external process is adopted merely because it occupies a required port.

The reference reuses the existing `dev-composition-reference.ts` and native template installation. Its manager now has a separate cache and WebSocket port 5194 to avoid colliding with the saved manager. Its API explicitly disables the incompatible WP0 development flag when running the existing reference configuration. It retains its existing Application files under the system temporary reference directory; the persistent Codex/manual Application remains `builder-demo/apps/demo`. No Application identities, definitions, authorization contracts or renderer formats were replaced.

Readiness/status covers both groups. Expected reference services that are not ready are reported as unavailable, not silently treated as healthy. Fixed reference URLs: Public/Admin on 5193, manager on 5192 and API health on 4092. Saved Builder/API remain 5274/5280; saved Application preview uses its printed dynamic port and `/demo/` base. Ordinary development API port 4090 is not an additional requirement for these two groups.

Actual Restricted-policy command verification: repeated Start reused the running launcher; combined Stop succeeded; ports 4092, 5192, 5193, 5194, 5274, 5276, 5280 and the then-current saved Application UI port 52763 were confirmed closed. A fresh single Start then launched both groups and passed page/API/dependency health checks. The saved manifest and Menu hashes remained unchanged. Focused health regressions passed **3/3**, and strict TypeScript checks for both launchers passed. No full subsystem regression or simultaneous Builder/runtime source-lock acceptance is claimed.

During migration, an older Start command window was still awaiting its previous batch-file version; process ancestry was inspected rather than guessing a process to stop. A separate Start during initialization correctly reported starting state and did not create a duplicate. Fresh command execution was verified after the old launcher exited. Existing accepted evidence and unrelated working-tree changes were preserved.

Additional affected files for this follow-up: `Start Demo.cmd`, `scripts/dev-demo.ts`, `scripts/dev-composition-reference.ts`, `scripts/demo-control.mjs`, `scripts/demo-health.mjs`, `scripts/demo-health.d.mts`, `README.md`, `docs/demo-site.md` and this record. `Stop Demo.cmd` reuses the expanded owned-service shutdown.
