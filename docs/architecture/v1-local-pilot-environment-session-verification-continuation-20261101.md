# V1 Local Audience Pilot — Environment and Session Verification Gate

2026-11-01. **Existing authoring environment restored. Stopped for operator-provided legitimate sessions. No provisioning or site delivery.** This continuation preserves the [earlier failed attempt](v1-local-pilot-environment-session-verification-gate-20261101.md) and its evidence unchanged.

## Actual API/UI health

The documented authoring-only command `npm run demo`, with no flags, now reports **BUILDER DEMO READY**. Final `node scripts/demo-control.mjs status` returns **exit 0**, with Builder dependencies responding and “Application preview has not been started.”

- GET http://127.0.0.1:5280/api/health: **HTTP 200**, JSON `ok: true`.
- GET http://127.0.0.1:5274/: **HTTP 200**, `text/html`.
- No Application/reference preview, reader host or website build was requested.

These were credential-free health/status operations, not authenticated authority checks. Builder is available at **http://localhost:5274/** for the operator's next action.

## Pre-start ownership and startup method

The restricted process/listener view remained incomplete. Read-only inspection outside that restriction identified the pre-existing disposable Builder processes (PIDs 31196 and 34952), owned by NIMO-LAPTOP\zanyf, and loopback activity on 4390/5374. The API's esbuild child path identifies the separate disposable checkout. Those processes were not stopped, adopted or modified. No managed Demo control instance or Demo-port listener was identified before starting.

Started exactly one new owned execution, session **76685**, root PowerShell PID **50124**, using the same current account **NIMO-LAPTOP\zanyf**. The OS process tree, parent IDs, account ownership and command lines are captured in owned-processes.json. This execution was outside restricted process/network visibility, **not a Windows elevation or token/security change**. No runas, firewall, global environment or OS-security changes occurred.

Used the documented authoring-only branch because Start Demo.cmd / start-all would automatically log in and start Application/reference runtimes. Existing Demo state was already ready; policy/schema/fixture preflight showed no initialization or migration was needed. No reset/setup/provisioning/login branch was invoked. The normal predev:api hook rebuilt platform-core, artifacts and visual-artifacts; it did not build a website or install dependencies.

The previous restricted attempt's failed handshake was not erased or relabeled. This attempt succeeds when run with the authorized normal-user process/network visibility. No product defect or Windows security root cause is asserted from that contrast.

## Confirmed authority configuration and preservation

The owned launch uses the existing Demo root `C:\Projects\Modular\builder-demo`, its own policy `runtime/iam-v1-development.sqlite`, creation ledger `runtime/development-applications.sqlite`, registered-Application mode, API/UI ports 5280/5274 and loopback development HMR configuration. No UI_BUILDER_DEMO_ROOT override was supplied. Source enables registered Application and protected onboarding contracts; no other deployment/store was merged or copied.

Saved Demo state/manifest and ledger remain consistent with existing permanent Application **c6aa0b22-7aa2-4c9d-b659-76bf74802cc6**. This persistent Application was not reused as a fresh pilot.

Before/after evidence covers **61 existing files**, excluding node_modules. No files are missing. All baseline files match except two operation logs: Demo operations.jsonl appended **171 bytes**, and the existing fixture's log appended **750 bytes**. Original byte prefixes are preserved. Application source/settings/manifests, Demo state, authority database and creation-ledger files match.

All seven policy-table digests/counts match: documents 96; state 1; candidates 8; policy audit 7; administration audit 6; administration-mode 1; delegation audit 0. No unintended security initialization, assignment, staged candidate, activation or audit mutation is evidenced. Protected table payloads were hashed rather than copied to evidence; no session/credential/control-token values were captured.

Source binds the API/UI to 127.0.0.1 in this development-identity mode; health succeeds over loopback. Native listener attribution remains qualified: the Get-NetTCPConnection snapshot did not expose the new listening records, and netstat captured loopback TIME_WAIT traffic rather than a useful listening/PID record. Actual owned process ancestry is verified, but a complete native listening-socket/PID proof is not claimed. No external-interface probe or new reader listener was used to fill that gap.

## Session and authority status — stop point

| Approved principal | Current result |
| --- | --- |
| Security Admin — usr_06fefc50791f4f15ac0139de699701b9 | Existing stored Demo Platform security assignment remains known; **legitimate authenticated session and live authority decision unverified**. |
| Application Admin — usr_f01e0c1c58424bed9ac4e8601ff9890a | Existing stored Demo creation and Demo/fixture author/Publish assignments remain known; **legitimate authenticated session and live authority decision unverified**. |

Browser inventory shows no existing Demo Builder tab at 5274. An old malformed health URL at 5280 is not session evidence. Absence of a tab does not prove absence of every server/browser session. No principal selector, historical login helper or fabricated context was used. No session API was called to create/replace an anonymous session or expose CSRF material. A fresh identity page can replace same-host API cookies used by another deployment, so it was not opened automatically.

**Required operator action:** establish legitimate supported interactive sessions for the approved Security Admin and Application Admin in separate, operator-controlled browser contexts at the restored Demo Builder. Separate contexts avoid overwriting another deployment/principal's cookie state. Identify which context belongs to each principal without sending credentials. Supported sanitized session/status and live authorization checks must then verify each actual principal ID and this deployment. Stop for this interaction; no automatic login or provisioning is authorized by this report.

## Reader and permission plan

**127.0.0.1:5189 remains proposed and unqualified.** No binding test, reader process, proxy activation, network exposure or new availability guarantee occurred. Read-only pre-start views did not identify a listener there, but that is not a reservation or successful bind test. Effective future reader no-proxy configuration remains to be qualified under a separately authorized reader phase.

Retained, not applied: future Application-scoped ui.application.view/edit, ui.page.view/edit, ui.presentation.view/edit/admin, ui.page.admin only for necessary placeholder cleanup, and separate exact-Application ui.application.security.admin onboarding anchor. No Form/Workflow/Dataset/package permission changes, new Application, Publish, export or website build.

## Process disposition and inventory

The new **authoring-only Demo remains running intentionally** to support the requested operator login. Owned root PID 50124 / execution session 76685 and descendants are recorded; existing disposable Builder processes remain separate. Use the documented Demo control stop operation or Stop Demo.cmd when this owned environment is no longer needed; it targets its recorded Demo tree. Do not use start-all, demo:preview, a port-based kill or all-Node termination. No process cleanup was executed after this successful startup.

New authored changes are this report and [the recheck evidence/inventory](../../evidence/v1-local-pilot-environment-recheck-20261101/files.json). Normal startup also regenerated package outputs/cache/control metadata and appended the two operation logs. These categories are distinguished in the inventory; cache/control files are listed by hashes only and are not source or secret exports. No comprehensive before/after cache/native-binary rehash is claimed. Prior reports, failed attempts and inventories are unchanged. No product/test source change, commit or push occurred.

**Stop: V1 Local Audience Pilot — Environment and Session Verification Gate. Environment health is confirmed; both authenticated-session/authority checks await operator interaction. No automatic provisioning or delivery continuation.**
