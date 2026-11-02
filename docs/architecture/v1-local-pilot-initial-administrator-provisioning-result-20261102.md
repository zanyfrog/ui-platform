# V1 Local Audience Pilot — Initial administrator provisioning result

2026-11-02. **Approved initial administrator provisioning succeeded and was verified. Stopped before functional-permission staging. Submitted for review; no milestone acceptance or closure declared.**

The operator explicitly approved initial administrator provisioning only. In the existing normal Chrome Demo tab 1964522886 at http://localhost:5274/, the agent refreshed Verify development session. It confirmed canonical Security Admin usr_06fefc50791f4f15ac0139de699701b9, builder-demo, ui-platform-development, registeredApplications true, live ui.platform.security.admin true. The prepared panel identified only the existing pilot key codex-test-v1-local-pilot-20261102 and permanent Application de8d1851-3e36-435f-b093-95ce94d940e7. No sign-in/switching, cookie extraction, arbitrary fetch or fabricated context was used.

The agent clicked Provision initial administrator once using the exact approved reason: “V1 disposable local audience-delivery pilot — approved initial Application administrator provisioning.” The existing session-bound protected onboarding API reported activated. A subsequent read-only Refresh provisioning state confirmed policy revision **8** and the approved Application Admin anchor. No retry was performed.

## Exact admitted anchor and audit

- Administrator User: usr_f01e0c1c58424bed9ac4e8601ff9890a.
- Permission: ui.application.security.admin only.
- Resource: authority ui-platform-development; kind application; applicationId and resource ID de8d1851-3e36-435f-b093-95ce94d940e7; **descendants false**.
- Assignment: initial.de8d1851-3e36-435f-b093-95ce94d940e7.assignment.
- Boundary: initial.de8d1851-3e36-435f-b093-95ce94d940e7.boundary, same exact scope.
- Normal onboarding added exactly five records: Application-security definition, administrator permission set, role, assignment and boundary.
- Mandatory administration operation: provision-application; actor Security Admin; exact pilot Application; approved reason retained.
- Candidate: 4070fefa-8312-4b81-88e1-f50ba6c3bb87.
- Audit ID: 3b47e0e4-b9fa-4825-a5bf-5258ba676110, revision 8, occurred 2026-11-02T22:13:07.088Z. Both mandatory administration and policy audit records match actor, candidate, reason and revision.

Protected onboarding performed its existing stage/provision admission internally; no direct database mutation or alternate authorization was used. Read-only database inspection verified sanitized anchor scopes and audit metadata. No raw policy payload or authority path was copied to evidence.

## Preservation and limits

All **1707 inventoried existing regular Application files are unchanged** across this operation; registrations remain unchanged. Removing only the five admitted IDs from the current security-document snapshot reproduces the prior document-table digest. Prior administration audit, policy audit and candidates also retain their exact previous digests when excluding the newly admitted revision/candidate. Security administration-mode and delegation-audit digests remain unchanged.

Authorized logical policy changes: revision 7 → 8; documents 96 → 101; candidates 8 → 9; policy audit 7 → 8; administration audit 6 → 7. These persist through the existing Builder Demo runtime/iam-v1-development.sqlite and SQLite-managed storage; no comprehensive physical SQLite/WAL byte-change inventory is claimed. No Application source/settings/manifest or creation ledger change was needed.

During the successful POST the existing global settings notice briefly reported “Platform settings connection was lost”; it disappeared in the subsequent state observation. This was not interpreted as a provisioning failure or a claim that broader settings connectivity is qualified. The authoritative refreshed anchor and audit establish the result. Application Admin was not selected; its new anchor was not tested through a fresh Application Admin session. Ordinary pilot Pages/Presentation functionality remains unverified.

**No functional permission was staged or activated.** ui.page.admin remains unselected. No Application creation, source change, Publish, export, build, host/process start, automatic principal switch, commit or push occurred. Security Admin remains signed in. Although Stage functional permissions became available after anchor refresh, it was not clicked.

## Exact continuation inventory and stop

New report: this document. New evidence directory evidence/v1-pilot-initial-admin-provisioning-20261102/ contains before.json, after.json, verify.mjs (read-only), verification.json (sanitized derived scope/audit/preservation result), and files.json (exact hashes for those files and this report). Existing earlier evidence/review reports were not overwritten. No product/test source changed and no tests were rerun for this operational action.

**Stop: initial administrator provisioning result for review, within the Protected Administrative UI Integration Review Gate.** Further functional staging/review/activation requires separate explicit confirmation. No milestone acceptance or closure is inferred.
