# Shared Builder Demo

This is the persistent, mutable local Application requested for manual use and Codex browser testing. It uses the existing Standard template, authenticated Builder workspace, native Application creation ledger, I-AM administration, editing lifecycle and composition renderer. It is separate from accepted package evidence and disposable regression fixtures. This setup does not implement WP5-E or close any umbrella acceptance requirement.

## Start

For the simplest Windows controls, double-click **Start Demo.cmd** or **Stop Demo.cmd** in `C:\Projects\Modular\ui-platform`. These command files use Node and `npm.cmd`; they work with PowerShell script execution disabled and do not change execution policy.

From PowerShell, the equivalent is:

```powershell
Set-Location "C:\Projects\Modular\ui-platform"
& ".\Start Demo.cmd"
```

In another terminal, stop the services with:

```powershell
Set-Location "C:\Projects\Modular\ui-platform"
& ".\Stop Demo.cmd"
```

Start launches both demo groups: the saved Builder/UI, its management API, development WebSocket and Application UI/API preview, plus the existing composition reference's manager, API and Public/Admin site. Public/Admin URLs are printed after startup. Leave the Start window open. It does not launch unnecessary standalone sibling Data Services servers; the existing platform manages protected Dataset hosts as needed. A repeated Start reuses the active saved demo and starts missing groups through its local launcher instead of creating duplicate copies.

The single command now starts these services:

| Service | URL |
| --- | --- |
| Saved Builder | `http://localhost:5274/` |
| Saved demo API health | `http://localhost:5280/api/health` |
| Reference Public | `http://127.0.0.1:5193/` |
| Reference Admin | `http://127.0.0.1:5193/admin` |
| Reference manager | `http://127.0.0.1:5192/` |
| Reference API health | `http://127.0.0.1:4092/api/health` |

The saved Application's runtime uses its own printed port and Application base: Public is `http://localhost:<printed-port>/demo/` and Admin is `http://localhost:<printed-port>/demo/admin`. Those ports can change on restart. The reference and saved demo remain separate Applications; editing one does not modify the other. The reference retains its existing temporary-directory source location; use the saved Builder Demo for the shared persistent manual/Codex site.

Start now checks actual Builder/API pages, the Builder's optimized development JavaScript and Public/Admin runtime pages before reporting ready. An existing launcher with failed services is reported as unavailable rather than simply "running"; use Stop and then Start if its startup has stalled. The demo's manager cache is isolated in `runtime/manager-vite-cache` so other development runs do not invalidate its optimized dependencies. A cache failure may otherwise produce a blank page despite an HTTP-200 HTML response. After recovery, reload the browser tab and select the development identity again if needed.

Stop contacts only this demo launcher's private local process-control pipe, then stops both owned child process trees (including the reference API, Application previews and any managed host children). It never kills all Node processes, searches for processes to kill by port, or stops unrelated servers. Saved Application source, policy and data remain intact. After an OS reboot, stale launcher metadata is checked and removed on the next startup only when its recorded pipe is no longer active. A reference server started separately outside this launcher is not adopted or killed automatically; close that command window before starting the combined launcher if its ports are occupied.

For authoring only, without starting the running Application preview, use:

Run in PowerShell and leave the terminal open:

```powershell
Set-Location "C:\Projects\Modular\ui-platform"
npm.cmd run demo
```

Open **http://localhost:5274**, select **admin@example.local** in **Development identity**, open **Builder Demo**, then select **Pages**. The interface includes Pages, Shells, shared Components, Forms, Datasets, Workflows, Triggers, Menus and Application presentation/settings according to the existing platform contracts. The Standard template starts with Public and Admin Pages/Shells, native Menus, a logo and shared reference Component. No package Button or additional Component metadata is invented.

The saved demo's API health URL is **http://localhost:5280/api/health**, not port 4090. Port 4090 belongs to the ordinary `npm.cmd run dev` configuration. Port 5193 belongs to the separate `dev:composition-reference` example, now started alongside the saved demo by the combined command. Start Demo's status output prints both groups' URLs together.

The startup command creates this demo once through normal Application creation and protected onboarding. Its trusted local setup is explicitly scoped to the separate demo authority: security@example.local is the Platform security administrator; admin@example.local is the Application security administrator and receives native authoring permissions for this Application and the existing Platform creation/Component management permissions. Other development identities receive no new demo grants. These are development identities, not production credentials.

The files are saved outside the source repository:

| Location | Purpose |
| --- | --- |
| `C:\Projects\Modular\builder-demo\apps\demo` | Mutable Application source and installed dependencies |
| `C:\Projects\Modular\builder-demo\runtime` | Separate local policy, owner ledger and development runtime files |
| `C:\Projects\Modular\builder-demo\demo.json` | Permanent Application identity and setup completion marker |

Restarting does not reset the Application, restore grants or undo revocations. Startup refuses incomplete setup, mismatched ownership, missing authority or occupied ports; it never adopts an unrelated folder or kills another server. An incomplete setup needs explicit diagnosis; preserve its files. `UI_BUILDER_DEMO_ROOT` can select a different empty, dedicated demo root, but normally leave it unset so everyone uses the same saved site.

After pulling dependency changes, build from the appropriate repositories before starting:

```powershell
Set-Location "C:\Projects\Modular\UI Platform Data Services"
npm.cmd run build
Set-Location "C:\Projects\Modular\ui-platform"
npm.cmd run build
npm.cmd run demo
```

## View the running Application

Save changes with **Save Now**. Close the Builder authoring tab before the runtime check, then, in a second PowerShell terminal:

```powershell
Set-Location "C:\Projects\Modular\ui-platform"
npm.cmd run demo:preview
```

Open the **Public** and **Admin** URLs printed by that command. They use the existing protected preview startup and dynamically allocated ports, so use the printed URLs each time. The main demo terminal must remain running. Stop the demo with **Ctrl+C** in that terminal. Source, policy and data remain on disk.

The existing Builder/runtime source-reader contention limitation remains open for WP5-F. Closing the authoring tab is a workaround, not evidence of reliable simultaneous use. Save/close the authoring workspace before runtime startup, and close runtime tabs before returning to authoring. No locking or consistency check has been changed by this demo setup.

Design preview remains nonpersisting. This starter does not fabricate an applied Dataset, register an unapproved service, bypass protected submissions or promise that every service is connected. Use the existing authorized Dataset Apply/Connect and isolated testing controls when adding data-backed behavior. The one-Dataset host limit remains in effect.

## Codex testing agreement

- Prefer this named demo for exploratory, non-destructive browser checks when the user asks to test the current site.
- Inspect its current state first. Treat user changes as intentional; no automatic reset, reseeding, permission repair or template replacement.
- Preserve permanent identities, existing Application data, shared definitions and accepted evidence.
- Name new disposable artifacts **Codex Test <description>**. Clean up only artifacts created by the current test, when safe. Obtain explicit authorization for destructive tests against existing content/data.
- Keep deterministic package regressions on their own temporary fixtures. This continuously changing site is not a stable regression baseline or proof of WP6 UI-only onboarding.
- Store new screenshots/reports separately with a new timestamp, never over accepted historical evidence. Do not record session cookies or CSRF tokens.
- Before a manual backup, stop the demo. Preserve the whole demo root, including policy and owner ledger; copying only Application source is not an identity-safe restoration of the deployment.

WP5-D remains accepted and closed. D6 remains WP5-F, A37 remains WP6, all 40 umbrella requirements remain unchecked, and full Builder V1 acceptance remains pending.
