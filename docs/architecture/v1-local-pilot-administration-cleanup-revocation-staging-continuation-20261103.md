# V1 Local Audience Pilot — Administration Cleanup Acceptance Review Gate

Revocation-staging continuation, 2026-11-03. **The exact removal-only candidate is staged and preserved, not activated.** Submitted for review. No acceptance, closure, revocation activation or publication is declared.

This resolves the pending Security Admin staging step in `v1-local-pilot-administration-cleanup-review-gate-20261103.md`. That report, the earlier modal/menu-repair continuation and all source/error evidence are preserved. The guarded cleanup has saved membership exactly `/`, `/about`, `/contact`; the accepted three Pages, public Shell/Menu, branding/assets and unpublished Presentation are unchanged. The post-deletion stale-target refresh defect remains documented and unmodified. This continuation does not repeat deletion or reopen that investigation.

## Actual authority and request review

The operator performed normal explicit Sign out → Security Admin in the existing Demo Chrome tab. Same-context Verify development session confirmed canonical principal `usr_06fefc50791f4f15ac0139de699701b9`, authenticated in `builder-demo` / `ui-platform-development`, registered Applications enabled, live `ui.platform.security.admin: true`, creation false. No automatic identity switch, credential/cookie extraction or fabricated evaluator context was used.

Inspect disposable pilot administration returned the exact pilot key `codex-test-v1-local-pilot-20261102`, permanent ID `de8d1851-3e36-435f-b093-95ce94d940e7`, policy revision **10**, and the unchanged Application Admin anchor. Protected current checksums were:

| Record suffix under `local-pilot.de8d1851-3e36-435f-b093-95ce94d940e7` | Expected checksum |
|---|---|
| `.set` | `sha256:2a0463a939c59971d2b16482b7df5c7bfa2d466bf4667fcbafc00074a5b67cc1` |
| `.role` | `sha256:abfd45d6011697067e19d4c882451b960c004d4e566c793894d7f03551d001af` |
| `.assignment` | `sha256:39aac8bc5022842098d0f0083f6e232cc3469718e430daf721b4706b9fdaff7f` |

The live protected state was compared with the prepared read-only proposal before staging. Exact record IDs, Application/authority, expected revision/checksums and full changes matched. The existing panel's cleanup checkbox remained **unchecked**. The reason identifies completed guarded cleanup and verified three-route composition, with removal solely of temporary `ui.page.admin` and preservation of all seven rules/IDs/anchor. Stage functional permissions was invoked once using its existing protected checksum-aware request. No correction or alternate request path was introduced.

## Exact new candidate

- **ID:** `a0f32d75-045e-4b7f-919f-59a99fd9cfe8`.
- **Checksum:** `sha256:25ab79548f648465d31dca922bd7f3d9655dbee48c26c245f802f8591538d684`.
- **Base revision:** **10**.
- **Validation:** diagnostics `[]`, activatable true.
- **Activation result:** null; no activation attempted.
- **Actor/source:** canonical Security Admin, `api`.

The UI reported **“Candidate staged, not activated.”** Its activation review checkbox remains unchecked and Activate reviewed candidate is disabled. The persisted native candidate ID/checksum, base revision, empty diagnostics, full request, expected checksums and reason match the reviewed proposal and browser output. Native staging validity is not a claim that protected activation/delegation admission has already occurred.

## Exact removal and retained records

Beneficiary remains Application Admin `usr_f01e0c1c58424bed9ac4e8601ff9890a`. The proposal updates the existing `.set`, `.role` and `.assignment` records with their observed expected checksums; it does not introduce replacement identities or roles. The sole permission delta removes `.rule.7` / `ui.page.admin` from the permission set.

The proposed resulting allow rules all retain resource `{authorityId: ui-platform-development, applicationId: de8d1851-3e36-435f-b093-95ce94d940e7, kind: application, id: de8d1851-3e36-435f-b093-95ce94d940e7}`:

| Permission | Descendants |
|---|---|
| `ui.application.view` | false |
| `ui.application.edit` | false |
| `ui.page.view` | true |
| `ui.page.edit` | true |
| `ui.presentation.view` | true |
| `ui.presentation.edit` | true |
| `ui.presentation.admin` | true |

These are the original seven complete rule records, unchanged in IDs/effects/scopes. The role still references the same permission set. Its assignment document is unchanged: same beneficiary/role, exact pilot scope with descendants true, startsAt `2026-11-02T00:00:00Z`, endsAt null. The separate initial administrator anchor is not among the changes. No unrelated or broader permission is added, removed or activated.

Exact full proposed documents and reason are preserved in `revocation-proposal.json`, `revocation-browser-candidate.json` and `revocation-stored-candidate.json` under the cleanup evidence directory.

## Preservation and bounded inventory

Compared with the cleanup baseline, only `security_candidates` changes, **12 → 13 rows**. All other six security-table digests match: active eight-rule policy and revision **10**, administrator anchor/unrelated documents, administration mode and policy/administrator/delegation audits are unchanged. No matching administrator or policy activation audit exists for this new candidate because it has not been activated. The persisted request/candidate records the legitimate staging actor, reason and source; no revocation audit success is claimed.

Every older complete candidate row matches its original aggregate digest. This preserves both the invalid `969220cf-fa79-4640-979e-9b3248ddbf39` and activated temporary-grant `99df834d-c6d7-4cb1-9b88-e07c33297b1a`, including their results and diagnostics.

The total scoped Application inventory for the entire cleanup remains:

- Changed pilot `menus/admin.json` only as previously described.
- Pilot `.uib/logs/operations.jsonl` appended **4,020 bytes** from the cleanup baseline; original prefix hash preserved.
- Removed exactly the authorized Administration bundle's four files: `src/pages/admin/index.ts`, `page.css`, `page.html`, `page.visual.json`.
- No added Application files. All other retained pilot, persistent Demo and fixture files match. Registered Application records match exactly.

No product source, dependency, native trust, validator or authentication/security contract changed. No tests/builds were run for this browser/security-state staging continuation. Prior accepted tests and qualifications are retained without claiming a new pass. The accepted mobile evidence is not rerun or expanded.

New continuation artifacts are this report, root `revocation-browser-candidate.json` and `revocation-stored-candidate.json`, plus `revocation-staging/` protected browser state, before/after snapshots, sanitized DOM record, partial screenshot and full cleanup comparison. The previously prepared read-only revocation helper/proposal and verification helper are included in the scoped `revocation-staging/files.json` inventory. Earlier reports and inventories were not overwritten. No authority database or session secret was copied.

## Stop boundary

Stopped at **V1 Local Audience Pilot — Administration Cleanup Acceptance Review Gate** with the revocation candidate ready for separate review. Temporary `ui.page.admin` is **still active** until a separately approved protected activation passes fresh authority, candidate/checksum/revision, delegation and audit safeguards. Do not silently restage or substitute if the candidate becomes stale.

Security Admin remains signed in. No revocation activation, further Page/Menu/Shell edit, deletion retry, Publish, export, production build, reader startup, Application recreation, dependency change, commit or push occurred. The existing authoring-only Demo remains running; no process was started or stopped in this continuation. No acceptance or closure is declared.
