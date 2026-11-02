# V1 Local Audience Pilot — Environment and Session Verification Gate

2026-11-01. **Controlled startup attempted; environment did not become healthy. No provisioning or pilot execution.**

## Actual outcome

| Required result | Observation |
| --- | --- |
| Existing managed launcher | Documented `node scripts/demo-control.mjs status` returned exit 1 before and after this attempt; no control record remains. No active managed launcher was identified. This does not rule out every unrelated or orphan process. |
| API 5280 | Owned startup log reached “UI Platform API listening on http://localhost:5280”, but its parent timed out connecting to 127.0.0.1:5280. Browser GET http://127.0.0.1:5280/api/health then failed with ERR_CONNECTION_TIMED_OUT. **Health not confirmed.** |
| Builder UI 5274 | Browser navigation to http://127.0.0.1:5274/ failed with ERR_CONNECTION_REFUSED. Launcher never reported ready. |
| Security Admin session | **Unresolved.** No login, identity selection, session extraction or authenticated decision request occurred. |
| Application Admin session | **Unresolved.** Existing policy assignment/approval of the User is not live session proof. |
| Reader 127.0.0.1:5189 | Remains proposed, not confirmed available. No reader, binding test or new reader-port probe was performed. |

The selected approved Users remain Security Admin `usr_06fefc50791f4f15ac0139de699701b9` and Application Admin `usr_f01e0c1c58424bed9ac4e8601ff9890a`. Current-process account lookup again returned `NIMO-LAPTOP\zanyf`; no elevation or privileges were assumed or inspected.

## Startup branch and intended authority configuration

Inspected the normal launch procedures before execution. **Start Demo.cmd was not run**: it requests `--with-preview --with-reference` or `start-all`, whose existing implementation automatically logs in as Application Admin and starts Application/reference runtimes. Likewise, no historical login/provisioning helper or `demo:preview` was invoked.

Used the separately documented **authoring-only `npm run demo`**, with no flags, from `C:\Projects\Modular\ui-platform`. Saved `demo.json` was already ready and matched permanent Demo ID `c6aa0b22-7aa2-4c9d-b659-76bf74802cc6`. Existing fixture marker/content prerequisites were present. Read-only preflight confirmed the existing policy's automation permission and required schema columns, so startup's conditional permission-migration/initialization branches were not needed. No setup/reset/provisioning branch was invoked to force startup.

The inspected launcher supplies the Demo's own `apps`, `runtime/iam-v1-development.sqlite` and `runtime/development-applications.sqlite`, API/UI/HMR ports 5280/5274/5276, registered-Application mode enabled, and development identity mode enabled. It does not merge with the separate disposable Builder store. The launch process had no UI_BUILDER_DEMO_ROOT override; the documented default `C:\Projects\Modular\builder-demo` applies. These are verified saved configuration and owned-launch code paths, **not a successful live authenticated deployment attestation**, because health failed.

`npm run demo` automatically invoked the existing `predev:api` hook, rebuilding platform-core, artifacts and visual-artifacts before launching the API. Those package builds completed in the log. **No website build** or source/dependency installation occurred. No product-code change was made. Regenerated package outputs are enumerated separately in the evidence inventory.

## Process ownership, failure and cleanup

Initial read-only netstat output showed no matching 5280/5274/5276/5189 entries; process enumeration did not identify an owned active instance. CIM process/listener inspection was unavailable (“Access to a CIM resource was not available to the client”). Sparse process output was not treated as proof of exclusive ownership. The documented launcher's own fixed-port checks were allowed as part of the authorized environment startup; no test bound 5189.

Started one owned command execution, session **38382**, recording its output in `authoring-only-start.log`. The source/log ownership chain is npm → dev-demo.ts → scripts/dev.mjs → npm dev:api → tsx API. OS process IDs/parentage could not independently be captured in this execution environment; this is a command/session ownership record, not a verified PID tree.

Failure: scripts/dev.mjs timed out waiting for the API and exited; dev-demo.ts reported “Demo server stopped during startup.” No retries, port fallback or alternate launch path were attempted. Interrupted only owned execution session 38382; it returned exit 1. Final supported control status is exit 1 with no Demo control record. No unrelated process was stopped.

**Independent descendant cleanup confirmation remains unavailable.** The launcher child had already exited when its normal cleanup path ran; that alone does not prove every API descendant stopped. Before another startup, the operator must check for residual processes/listeners from this owned attempt and identify ownership before stopping anything. Do not terminate by port or kill all Node processes. No persistent reader/service was intentionally left running.

## Preservation evidence

Captured a 61-file baseline across the two existing Demo-deployment Applications (excluding node_modules) and selected Demo state/authority/ledger files. After the attempt:

- No baseline files were missing. All persistent Application source, settings, manifests, Demo state, policy database and creation-ledger files matched.
- Only the Demo and existing fixture `.uib/logs/operations.jsonl` files grew, by 171 and 750 bytes respectively. Both original byte prefixes remain intact.
- Independently compared all seven existing policy table contents by digest and count: security_documents **96**, security_state **1**, security_candidates **8**, security_audit **7**, security_admin_audit **6**, security_administration_mode **1**, security_delegation_audit **0**. All matched. No unintended security initialization, permission grant, candidate stage/activation or audit rewrite is evidenced.
- No credentials, cookies, CSRF material or control tokens were captured. Table payloads were hashed, not copied into evidence. Existing session data was not extracted or restored; no authenticated session existed in the newly started API by any action taken here. Pre-existing session availability remains unverified rather than inferred from policy.

See `preservation-before.json`, `preservation-after.json` and `startup-and-health.json` in [the new evidence directory](../../evidence/v1-local-pilot-environment-readiness-20261101/files.json). Native binaries/node_modules and all historical evidence were not comprehensively rehashed; no native installation or new qualification is claimed.

## Permission plan and operator action

The approved future plan is unchanged and **not applied**: new-Application-scoped ui.application.view/edit, ui.page.view/edit, ui.presentation.view/edit/admin; ui.page.admin only for necessary placeholder cleanup; separate exact-Application ui.application.security.admin onboarding anchor. No Form/Workflow/Dataset/package rights were staged or activated.

Required next operator action is to establish a healthy existing Demo through the **authoring-only documented procedure**, first resolving/checking this owned attempt's residual process state through legitimate normal-user controls. No Windows security, token, firewall, global environment or recovery investigation was undertaken. This report does not diagnose the connection failure as a product defect or authorize bypassing the readiness check.

After health is established, each approved principal requires its own legitimate supported interactive sign-in/session check and current authority decision. That may require operator interaction. Do not use the automatic login helper or manufacture server context. Stop for that interaction rather than proceeding to future Application creation or grants. Provisioning and site delivery still require separate explicit approval.

## Exact change inventory and stop

New authored files: this report plus `evidence/v1-local-pilot-environment-readiness-20261101/**` (baseline/digests, sanitized observations, startup log and exact inventory). Existing generated package build outputs and the two appended operation logs are separately listed in files.json. No product/test source, configuration, settings, authority data, registered Application, historical evidence, commit or push was changed by the assistant. Earlier untracked reports/evidence predate this phase and remain untouched.

**Stop: V1 Local Audience Pilot — Environment and Session Verification Gate. Environment and both live-session checks remain incomplete; no automatic provisioning or delivery continuation.**
