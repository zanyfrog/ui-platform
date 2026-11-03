# V1 Local Audience Pilot — Page Administration Revocation Activation Review

2026-11-03. **The exact approved revocation candidate was activated once. Active policy advanced from 10 to 11, restoring exactly the original seven functional rules. Temporary `ui.page.admin` is removed from the pilot's active permission set.** Submitted for acceptance review; no broader publication, acceptance or closure is declared.

## Approved operation and preflight

Target: Builder Demo, authority `ui-platform-development`, Application `codex-test-v1-local-pilot-20261102`, permanent ID `de8d1851-3e36-435f-b093-95ce94d940e7`. Beneficiary remains Application Admin `usr_f01e0c1c58424bed9ac4e8601ff9890a`.

Approved and activated candidate:

- ID `a0f32d75-045e-4b7f-919f-59a99fd9cfe8`.
- Checksum `sha256:25ab79548f648465d31dca922bd7f3d9655dbee48c26c245f802f8591538d684`.
- Base policy revision **10**.

In the existing connected Chrome tab, Verify development session confirmed authenticated Security Admin `usr_06fefc50791f4f15ac0139de699701b9`, `builder-demo`, `ui-platform-development`, registered Applications enabled and live `ui.platform.security.admin: true`. No identity switch occurred.

The displayed candidate and persisted native candidate were rechecked against the exact reviewed staging evidence. Policy was 10; diagnostics were empty; candidate was activatable; prior activation result was null. The full three-record request, reason and sole removal matched. Every expected checksum was verified against the corresponding active document through trusted I-AM `securityChecksum`:

| Fixed record suffix under `local-pilot.de8d1851-3e36-435f-b093-95ce94d940e7` | Verified expected checksum |
|---|---|
| `.set` | `sha256:2a0463a939c59971d2b16482b7df5c7bfa2d466bf4667fcbafc00074a5b67cc1` |
| `.role` | `sha256:abfd45d6011697067e19d4c882451b960c004d4e566c793894d7f03551d001af` |
| `.assignment` | `sha256:39aac8bc5022842098d0f0083f6e232cc3469718e430daf721b4706b9fdaff7f` |

The exact candidate review checkbox was checked only after these checks. Activate reviewed candidate was invoked **once** through the existing protected workflow. Its fresh authority/status, authentication/CSRF, candidate/checksum/revision, delegation/grant-boundary and mandatory audit enforcement remained unchanged. No direct security-store mutation, restage, substitution or checksum reconstruction from proposed client records occurred.

## Verified result and mandatory audits

The UI reported activation success. Refresh provisioning state returned revision **11**, the same Security Admin and pilot, unchanged initial administrator anchor and restored seven-rule set checksum. The candidate's persisted result is:

```json
{
  "status": "activated",
  "revision": 11,
  "auditId": "31e74614-fe42-4f78-b1ee-c9ed3d46da7d"
}
```

Exactly one administrator audit and one policy audit name this candidate at revision 11, with audit ID `31e74614-fe42-4f78-b1ee-c9ed3d46da7d`, canonical Security Admin actor and the reviewed removal-only reason. The administrator record identifies the exact pilot, three fixed target records and existing Platform assignment/boundary authority path. Its native operation label is `assign+edit` for this three-document candidate. The policy record has source `api`.

Administrator audit count advanced **9 → 10**, policy audit count **10 → 11**. All historical audit rows excluding this newly approved activation match their pre-activation digests exactly. Evidence includes sanitized audit IDs, actor, target, authority path, reason and before/after digests; no session/credential material was captured.

## Exact active permissions

The existing permission set now contains exactly these seven allow rules, with original IDs and scopes. Each resource remains `{authorityId: ui-platform-development, applicationId: de8d1851-3e36-435f-b093-95ce94d940e7, kind: application, id: de8d1851-3e36-435f-b093-95ce94d940e7}`:

| Permission | Descendants |
|---|---|
| `ui.application.view` | false |
| `ui.application.edit` | false |
| `ui.page.view` | true |
| `ui.page.edit` | true |
| `ui.presentation.view` | true |
| `ui.presentation.edit` | true |
| `ui.presentation.admin` | true |

All seven complete rule records match their pre-revocation originals. Only `.rule.7` / `ui.page.admin` was removed. The active set exactly matches the original accepted seven-rule plan. Its checksum returned to `sha256:30de5bd6ea27e5c5852b694478c6cf611dfdcb142ee7a5661c88d2246eddf9da`.

The `.role` and `.assignment` documents are unchanged. Application Admin remains assigned to the same role/set, exact Application resource with descendants true, startsAt `2026-11-02T00:00:00Z`, endsAt null. Their checksums remain the values above. The separate initial administrator anchor and every unrelated active document match the pre-activation aggregate digest exactly. There remain 104 active documents.

This verifies the native active documents and role/assignment graph. No Application Admin browser session was created and no prohibited delete-denial probe was attempted. Security Admin remains signed in.

## Exact preservation inventory

- **No captured regular Application file changed, was added or removed**, including all three saved website Pages, their identities/content, repaired Admin Navigation, retained Shells, Main Navigation, logo/assets, styles, Presentation draft, persistent Demo, fixture and existing operation logs.
- Registered Application records are unchanged.
- Among active security documents, only the approved pilot permission-set definition changes. Role, assignment, anchor and unrelated policy are unchanged.
- Candidate count remains **13**. Only this approved candidate's activation result changes. Every previous complete candidate row is preserved, including invalid `969220cf-fa79-4640-979e-9b3248ddbf39` and temporary-grant activation `99df834d-c6d7-4cb1-9b88-e07c33297b1a` with their original diagnostics/results.
- Changed security tables are `security_documents` (104 rows, approved set update), `security_state` (revision 10 → 11), `security_candidates` (13 rows, approved result update), `security_admin_audit` (+1) and `security_audit` (+1). Administration-mode and delegation-audit digests are unchanged.
- Dependency package/lock/archive hashes match accepted evidence. Shared UI Base remains physical, and all 54 admitted payload hashes match.

No product source or tests were changed. No test/build command was run for this protected activation; previous implementation tests remain historical evidence. New artifacts are this separate report and `evidence/v1-page-admin-revocation-activation-20261103/`: before/after Application/security snapshots, read-only verification/finalization helpers, exact reviewed browser candidate, sanitized final browser state/partial screenshot, before/after verification and preservation records, and `files.json` with exact artifact hashes. Prior reports/inventories were not overwritten. Evidence helpers opened the authority store read-only and did not copy its database.

## Stop

Stopped after revocation verification and returned for acceptance review. No identity switch, content edit, further deletion, Publish, export, production build, reader startup, Application recreation, dependency/trust change, commit or push occurred. No process was started or stopped; the existing authoring-only Demo remains running.

The accepted exact three-route composition and mobile qualification are preserved. The documented post-deletion refresh defect and unrelated validation qualifications remain recorded; no repair, publication readiness expansion or closure is inferred from this revocation result.
