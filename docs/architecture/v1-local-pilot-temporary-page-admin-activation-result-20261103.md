# V1 Local Audience Pilot — Temporary Page Administration Activation Review

2026-11-03. **The exact approved candidate was activated once and verified at policy revision 10.** Submitted for review; no broader site-delivery acceptance or closure is declared. Work stopped after activation verification.

## Exact target and admission

- Deployment/authority: `builder-demo` / `ui-platform-development`.
- Application: `codex-test-v1-local-pilot-20261102`, permanent ID `de8d1851-3e36-435f-b093-95ce94d940e7`.
- Activating principal: Security Admin `usr_06fefc50791f4f15ac0139de699701b9`.
- Beneficiary: Application Admin `usr_f01e0c1c58424bed9ac4e8601ff9890a`.
- Approved/activated candidate: `99df834d-c6d7-4cb1-9b88-e07c33297b1a`.
- Exact checksum: `sha256:b9db82140af1181c1457a01dd3da5284347d074a4a3048ed87b3b4066d130d4c`.
- Base policy revision: **9**; resulting active revision: **10**.

Before activation, Verify development session in the existing connected Chrome tab confirmed the canonical Security Admin, Builder Demo authority, registered Applications enabled and live `ui.platform.security.admin: true`. No identity was selected automatically. The existing panel still held the exact approved candidate, its checksum/base revision and reviewed proposal.

A read-only store check confirmed current revision 9, empty native candidate diagnostics, null prior activation result, unchanged request compared with the reviewed staging evidence and exact seven-rule active baseline. No candidate was restaged, modified or substituted. The eight-rule proposal and scopes were reviewed before checking the panel's explicit review checkbox.

Activate reviewed candidate was invoked once through the existing supported protected operation. Its normal authenticated request/CSRF, current pilot-status, expected revision/checksum, candidate, delegation/grant-boundary and audit admission remained in effect. No alternate transport or direct policy-store write was used. The recorded candidate reason was retained verbatim as required by the reviewed plan, including its staging wording; this user decision separately authorized activation.

## Outcome and audits

The UI reported “Functional permissions activated”. Refresh provisioning state then returned **revision 10**, the same Security Admin, exact pilot identity, unchanged administrator anchor and updated permission-set checksum. The review checkbox was cleared by this read and Activate remained disabled. No second activation was attempted.

The persisted candidate result is:

```json
{
  "status": "activated",
  "revision": 10,
  "auditId": "0ec92b7b-5be1-41ba-8d2f-416c3587cc61"
}
```

Both mandatory audit records exist, each naming this candidate, revision 10, Security Admin and the recorded reason:

- Administrator audit `0ec92b7b-5be1-41ba-8d2f-416c3587cc61`, kind `administration`, operation `assign+edit`, exact pilot Application, three fixed pilot record targets. The authority path is the existing `development.platform-security.assignment` and `development.platform-security.boundary`.
- Policy audit with the same audit ID/revision, source `api`.

All older administrator and policy audit rows match their pre-activation digests exactly. Audit counts advanced **8 → 9** and **9 → 10**, respectively. No unrelated history was removed or rewritten.

## Exact active rules and scopes

All eight allow rules belong to `local-pilot.de8d1851-3e36-435f-b093-95ce94d940e7.set`. Each scope resource is exactly `{authorityId: ui-platform-development, applicationId: de8d1851-3e36-435f-b093-95ce94d940e7, kind: application, id: de8d1851-3e36-435f-b093-95ce94d940e7}`:

| Permission | Descendants | Verification |
|---|---|---|
| `ui.application.view` | false | unchanged |
| `ui.application.edit` | false | unchanged |
| `ui.page.view` | true | unchanged |
| `ui.page.edit` | true | unchanged |
| `ui.presentation.view` | true | unchanged |
| `ui.presentation.edit` | true | unchanged |
| `ui.presentation.admin` | true | unchanged |
| `ui.page.admin` | true | sole addition, rule `.rule.7` |

The first seven complete rule records—including IDs, effect and scope—compare exactly against the pre-activation active set. The role and assignment documents compare exactly with their originals. The role references the same permission set; the active assignment still binds Application Admin to that role at the exact Application scope, descendants true, startsAt `2026-11-02T00:00:00Z`, endsAt null.

The permission-set checksum is now `sha256:2a0463a939c59971d2b16482b7df5c7bfa2d466bf4667fcbafc00074a5b67cc1`. Role and assignment checksums remain `sha256:abfd45d6011697067e19d4c882451b960c004d4e566c793894d7f03551d001af` and `sha256:39aac8bc5022842098d0f0083f6e232cc3469718e430daf721b4706b9fdaff7f`.

This verifies the active native documents and role/assignment graph. It does not claim a new Application Admin browser authoring/deletion check; Security Admin remains signed in, as requested. The existing Page API uses a Page collection resource under this Application; this grant is not represented as a single-artifact-only technical scope. Its authorized purpose remains the disposable Administration cleanup, with later separately approved audited revocation required. No expiry or revocation was introduced in this step.

## Preservation and exact inventory

Read-only before/after checks establish:

- No regular Application file changed, was added or removed. The entire captured pilot, persistent Demo and fixture trees—including Pages, Menu/Shell, Presentation draft and ordinary operation logs—match the baseline.
- Registered Application records are unchanged.
- Among active security documents, only the approved permission-set definition differs. Every other document, including the role/assignment and entire separate initial administrator anchor, matches one aggregate digest before and after. There remain 104 active documents.
- Candidate count remains 12. Only the approved candidate's activation result changed; every other complete candidate row matches its prior digest.
- Invalid candidate `969220cf-fa79-4640-979e-9b3248ddbf39` retains its exact complete row digest, original checksum/base revision and all three CHECKSUM_CONFLICT diagnostics. It was not reused or activated.
- The five changed security tables are `security_documents` (same count, approved permission-set update), `security_state` (revision 9 → 10), `security_candidates` (approved result update), `security_admin_audit` (+1), and `security_audit` (+1). Administration-mode and delegation-audit table digests are unchanged.
- Dependency package/lock/archive hashes match the accepted baseline. Shared UI Base remains physical and all 54 admitted payload files match accepted hashes.

No product source or test file changed. No tests/builds were run for this protected state operation; earlier accepted implementation regressions are preserved, not presented as newly rerun.

New files are this separate report and `evidence/v1-temporary-page-admin-activation-20261103/`: before/after Application/security snapshots, reviewed browser candidate, final sanitized browser state and partial screenshot, read-only verification/finalization helpers, before/after verification records, preservation output and `files.json`. The latter lists exact artifact paths and hashes. SQLite changes were made only by the protected activation operation; these evidence helpers opened it read-only and did not copy the authority database. Prior reports and evidence were not overwritten.

## Stop boundary

Security Admin remains signed in. No Application Admin switch, Admin Navigation edit, Administration Page deletion, permission revocation, Publish, export, build, reader start, Application recreation, dependency/native change, commit or push occurred. The existing authoring-only Demo remains running; no process was started or stopped in this increment.

This result is returned for review. The retained Menu reference still must be repaired before separately authorized guarded Administration deletion, and temporary permission revocation still requires its own reviewed audited operation. Neither is authorized by this activation result alone.
