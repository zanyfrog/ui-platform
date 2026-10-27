# V1 Page Builder — unsaved Preview protection review

Date: 2026-10-27. Status: **V1 Page Builder — Unsaved Preview Protection Review Gate**. **Blocked by unavailable identified settings authority; deferred verification not performed or accepted.**

## Bounded investigation

Used the existing normal Chrome session at `http://localhost:5374/`, within the admitted disposable environment `C:\Projects\Modular\v1-normal-smoke-20261026-01`. No server startup, new authentication, raw policy/database acquisition, security change or alternate privilege route was attempted.

The existing principal is **Application Admin (admin@example.local)**. Before navigating to Settings, the Page editor's Save Now control was disabled. The normal Settings → Editor → Autosave screen shows:

| Observation | Result |
| --- | --- |
| Autosave | Enabled |
| Delay | 2.00 seconds |
| Enable autosave control | Disabled |
| Save settings | Disabled |
| Explanation | “Only Platform administrators may modify settings.” |

The existing identity selector lists Application Admin, Security Admin, Page/Form/Workflow editors and Mixed Permissions. It exposes no identified Platform Administrator identity. No identity was selected, signed out or switched during this investigation.

Source inspection of the **actual disposable server copy** establishes the gate: `index.ts` uses `developmentSecurityConfiguration.platformAdministratorPermissionId`, which is **`ui.platform.security.admin`**, for resource `{ authorityId: 'ui-platform-development', applicationId: null, kind: 'system', id: 'platform' }`. The existing settings handler checks current `canModify` before a PUT and rechecks original session/policy/revision at admission. No change to that behavior is authorized or made.

The seed's **Security Admin** is an application-scoped role with `ui.security.admin`, not evidence of the required Platform permission. The defined Platform Management set contains application-create/package/component/automation permissions; its name does not establish `ui.platform.security.admin`, and the initial assignments do not assign a Platform Administrator session. Seed inspection is explanatory, not a claim to have read the current policy database or proven that no legitimate administrator exists elsewhere.

**Conclusion:** no existing legitimate Platform Administrator session or permitted settings workflow was identified through the admitted normal session/UI and source configuration. The current principal cannot modify autosave. Switching among identities in search of privilege, trying bootstrap/recovery, editing policy/database files or invoking a denied settings mutation would not establish legitimate authority, so none was attempted. Investigation stopped at this boundary.

## Result and preservation

No autosave change was made. Autosave remains enabled with a two-second delay; no restoration operation is necessary. No unsaved edit was introduced, no Page Save was made and no timer race was attempted. Therefore this run supplies **no new evidence that a normal-browser unsaved edit preserves the saved Design Preview or authorized saved revision**. Prior scoped fixture evidence remains historical and is not substituted for the deferred normal test.

Evidence is under `evidence/v1-unsaved-preview-protection-20261027`:

- `normal-authority-result.json`: relevant normal-session identity choices and disabled settings controls, with no session secrets.
- `normal-settings-authority.png`: directly captured normal Settings screen.
- Four read-only inspected server-source snapshots and their references/hashes.
- `preservation-baseline.json` and `preservation-result.json`: source/Page fingerprints and prior accepted inventory comparison. Both disposable Pages and current source differences were left untouched.

Only this report, the two-component acceptance addendum, this increment's evidence and inventory are new. Product code, users, roles, permissions, authorization, settings and Page files are unchanged. No protected Component state, lock/journal state or recovery metadata was edited. No Windows token/VM/WinPE or recovery work, commits or pushes.

## Condition for continuation

An **already legitimate Platform Administrator session**, identified and authorized for this same admitted settings workflow, is required to proceed. This report grants or creates no such authority. Once available under an appropriate authorization, the remaining sequence is: record original settings and saved revision; temporarily disable autosave through the existing settings UI; introduce an unsaved Page edit; confirm that the existing saved Preview and authorized saved revision remain unchanged and dirty initiation is refused; discard the draft; restore the exact original autosave settings. No part of that sequence was executed here.

Stop: **V1 Page Builder — Unsaved Preview Protection Review Gate**. Deferred verification remains open and requires separate acceptance after actual evidence exists.
