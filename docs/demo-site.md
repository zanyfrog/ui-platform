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

Start launches the Builder/UI, management API, development WebSocket and the running Application's UI/API preview. Public/Admin URLs are printed after startup. Leave the Start window open. It does not launch unnecessary standalone sibling Data Services servers; the existing platform manages protected Dataset hosts as needed. A repeated Start reports the active demo instead of creating another one.

Stop contacts only this demo launcher's private local process-control pipe, then stops its owned child process tree (including preview and any managed host children). It never kills all Node processes, searches for processes to kill by port, or stops unrelated servers. Your saved Application, policy and data remain intact. After an OS reboot, stale launcher metadata is checked and removed on the next startup only when its recorded pipe is no longer active. A server started outside this launcher is not killed automatically.

For authoring only, without starting the running Application preview, use:

Run in PowerShell and leave the terminal open:

```powershell
Set-Location "C:\Projects\Modular\ui-platform"
npm.cmd run demo
```

Open **http://localhost:5274**, select **admin@example.local** in **Development identity**, open **Builder Demo**, then select **Pages**. The interface includes Pages, Shells, shared Components, Forms, Datasets, Workflows, Triggers, Menus and Application presentation/settings according to the existing platform contracts. The Standard template starts with Public and Admin Pages/Shells, native Menus, a logo and shared reference Component. No package Button or additional Component metadata is invented.

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
