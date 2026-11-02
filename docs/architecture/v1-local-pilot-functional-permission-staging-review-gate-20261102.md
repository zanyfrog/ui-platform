# V1 Local Audience Pilot — Functional Permission Staging and Review Gate

2026-11-02. **Seven-permission candidate staged and reviewed. STOPPED BEFORE ACTIVATION. Initial administrator provisioning was not repeated.**

## Verified context and candidate

The existing normal Chrome Demo tab 1964522886 at localhost:5274 was reused. Before staging the agent refreshed Verify development session and provisioning state: canonical Security Admin usr_06fefc50791f4f15ac0139de699701b9; builder-demo; authority ui-platform-development; live ui.platform.security.admin true; registeredApplications true; policy revision **8**; approved existing exact-Application administrator anchor present. No principal switching or manufactured session occurred.

The cleanup/ui.page.admin checkbox was unchecked. The agent entered the staging reason and clicked Stage functional permissions once. The existing protected API returned a validated activatable candidate and the panel explicitly reported staged/not activated.

- Candidate ID: **620e2102-a549-47e9-8aa6-f564fa50f74b**
- Checksum: **sha256:bd8d448c2d63573a51e3cf2960366ffc05569b5e5cc02c4b9a528075015ad9f8**
- Base revision: **8**; current active policy revision after staging: **8**.
- Validation: activatable true; persisted diagnostics **[]**.
- Persisted activation result: **null**; proposed assignment absent from active security documents.
- Actor: usr_06fefc50791f4f15ac0139de699701b9; source api.
- Reason: “V1 disposable local audience-delivery pilot — approved staging and review of seven Application-scoped functional permissions; activation requires separate approval.”

Activatable means staging validation succeeded, not that a future activation is approved or guaranteed. Existing session, owner, revision, candidate-checksum, delegation, ceiling and audit admission must still be satisfied at activation.

## Exact proposed records and scopes

All resource references use authority **ui-platform-development**, resource kind **application**, resource ID and applicationId **de8d1851-3e36-435f-b093-95ce94d940e7**. No other Application or system/wildcard scope is proposed.

| Permission | Descendants |
| --- | --- |
| ui.application.view | false |
| ui.application.edit | false |
| ui.page.view | true |
| ui.page.edit | true |
| ui.presentation.view | true |
| ui.presentation.edit | true |
| ui.presentation.admin | true |

Each rule is allow, with no field/predicate additions. ui.page.admin is absent; there are no additional permissions, Form/Workflow/Dataset/export/package/Platform-component grants or changes to the existing administrator anchor.

Exactly three proposed records:

1. Application-owned permission set **local-pilot.de8d1851-3e36-435f-b093-95ce94d940e7.set**, containing only those seven rules, no included sets.
2. Application-owned role **local-pilot.de8d1851-3e36-435f-b093-95ce94d940e7.role**, referencing only that set.
3. Role assignment **local-pilot.de8d1851-3e36-435f-b093-95ce94d940e7.assignment**, assigning that role to Application Admin **usr_f01e0c1c58424bed9ac4e8601ff9890a**, at the same exact Application root with **descendants true**, startsAt 2026-11-02T00:00:00Z, endsAt null. The descendant assignment permits evaluation of the listed Page/Presentation rules; metadata rules remain exact-root only.

The complete authorized proposed records and scopes are retained in candidate-review.json. Read-only database verification compared the persisted candidate ID/checksum/base revision with the observed UI, verified exactly three records/seven permissions and each scope, and found no active proposed assignment. No raw session, cookie, CSRF, credential, grant-boundary records or unrelated policy payload was captured.

## Preservation and exact inventory

Before/after snapshots: **1707 existing regular Application files unchanged**, registrations unchanged. All six non-candidate security tables have identical digests (documents, state, administration mode, policy audit, administration audit, delegation audit). Active documents remain 101; policy audit 8; administration audit 7; delegation audit 0. Policy revision remains 8. The only logical security mutation is **one staged candidate**: candidates 9 → 10. Removing this candidate reproduces the prior candidates-table digest exactly; prior history is preserved. No activation audit row exists for this candidate.

No product/test source changed, and no build or tests were required for this bounded operation. No creation retry, initial provisioning repeat, identity switching, permission activation, Publish, export, website build, host/process start, commit or push occurred. Security Admin remains signed in. The UI review checkbox remains unchecked and Activate remains disabled; the staged candidate is retained in the panel. Runtime log/cache files outside the regular Application inventory are not comprehensively requalified.

New files: this report and evidence/v1-pilot-functional-stage-20261102/{before.json, after.json, verify.mjs, candidate-review.json, files.json}. files.json contains exact hashes of the report/helper/evidence. The read-only verifier initially attempted to inspect keys of a null activation result and failed; its corrected null check and final verifier establish the pending activation result, without changing the candidate. Earlier historical reports/evidence remain unchanged.

**STOP BEFORE ACTIVATION.** Candidate 620e2102-a549-47e9-8aa6-f564fa50f74b requires separate explicit approval. No activation request was sent and no acceptance or closure is declared.
