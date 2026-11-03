# V1 Local Audience Pilot — Checksum-Aware Cleanup Staging Acceptance Review Gate

Normal Chrome continuation, 2026-11-03. **Corrected staging demonstrated; candidate preserved, not activated. Submitted for review, not accepted or closed.** This continuation resolves the pending browser/sign-in qualification in `v1-local-pilot-checksum-aware-cleanup-staging-review-gate-20261103.md`; that original report, failed startup, restricted test failures and historical invalid candidate remain unchanged.

## Actual authenticated context

The operator performed normal Development identity Sign out → Security Admin in the existing connected Chrome tab at `localhost:5274`. Same-context Verify development session returned authenticated principal `usr_06fefc50791f4f15ac0139de699701b9`, deployment `builder-demo`, authority `ui-platform-development`, registered Applications enabled, live `ui.platform.security.admin: true`, Application creation false. No identity was selected automatically or inferred from a label.

Inspect disposable pilot administration confirmed key `codex-test-v1-local-pilot-20261102`, permanent ID `de8d1851-3e36-435f-b093-95ce94d940e7`, active policy revision **9**, and the existing Application Admin security anchor. The corrected protected response exposed exactly the three fixed record checksums:

| Record suffix under `local-pilot.de8d1851-3e36-435f-b093-95ce94d940e7` | Expected checksum |
|---|---|
| `.set` | `sha256:30de5bd6ea27e5c5852b694478c6cf611dfdcb142ee7a5661c88d2246eddf9da` |
| `.role` | `sha256:abfd45d6011697067e19d4c882451b960c004d4e566c793894d7f03551d001af` |
| `.assignment` | `sha256:39aac8bc5022842098d0f0083f6e232cc3469718e430daf721b4706b9fdaff7f` |

These values were read from the supported panel's DOM output and compared against the trusted read-only inspection and fixed plan before Stage. The request review confirmed exact registered Application, revision, records, scopes and each expected checksum. No arbitrary browser fetch or evaluator context was used. Sanitized state and `reviewed-request.json` preserve the review.

## New protected candidate

- **ID:** `99df834d-c6d7-4cb1-9b88-e07c33297b1a`
- **Checksum:** `sha256:b9db82140af1181c1457a01dd3da5284347d074a4a3048ed87b3b4066d130d4c`
- **Base policy revision:** 9
- **Validation:** diagnostics `[]`, activatable true
- **Activation result:** null; no activation attempted
- **Recorded actor/source:** Security Admin `usr_06fefc50791f4f15ac0139de699701b9`, `api`

The existing cleanup checkbox and a reason limiting use to guarded Administration cleanup and separately reviewed revocation were set. Stage functional permissions was invoked once. The UI reported **“Candidate staged, not activated”**, displayed the exact candidate and proposal, and kept Activate reviewed candidate disabled with its review checkbox unchecked. No provisioning, activation, identity switch or repeat stage followed.

The persisted native candidate was independently read without mutation. Its ID/checksum/base revision, empty diagnostics, exact request changes and reason match the reviewed request and browser output. Staging validity is not proof of protected activation admission: current authority, delegation/grant ceiling, candidate/checksum, policy revision and mandatory audit checks must still pass at any separately approved activation.

## Exact proposed permission records

The candidate upserts the same three existing records, attaching their observed expected checksums. It does not create replacement/duplicate roles or assignments. Application Admin remains `usr_f01e0c1c58424bed9ac4e8601ff9890a`.

All rules below are allows on resource `{authorityId: ui-platform-development, applicationId: de8d1851-3e36-435f-b093-95ce94d940e7, kind: application, id: de8d1851-3e36-435f-b093-95ce94d940e7}`:

| Permission | Descendants | Delta |
|---|---|---|
| `ui.application.view` | false | unchanged |
| `ui.application.edit` | false | unchanged |
| `ui.page.view` | true | unchanged |
| `ui.page.edit` | true | unchanged |
| `ui.presentation.view` | true | unchanged |
| `ui.presentation.edit` | true | unchanged |
| `ui.presentation.admin` | true | unchanged |
| `ui.page.admin` | true | **sole added rule**, `.rule.7` |

The first seven rule records compare exactly, including their IDs/scopes, with the active accepted plan. Role still references the same permission set. Assignment still names Application Admin, the same role and exact Application scope with descendants true, startsAt `2026-11-02T00:00:00Z`, endsAt null. Role and assignment documents are unchanged. No Form/Workflow/Dataset/package/Platform rule is added. The separate `initial.<Application ID>` security anchor is not included in the changes and is unchanged.

The existing Page admission API uses a collection resource, not an individual Page resource. Thus the proposed cleanup permission covers the exact pilot's Page collection; its intended Administration-only use is constrained by authorization/reason, not an invented artifact-specific permission. There is no automatic expiry/revocation. A separately staged, reviewed and activated audited removal of only `.rule.7` is required after verified deletion.

Exact full documents, expected checksums and recorded reason are in `chrome-continuation/stored-candidate.json` and `browser-candidate.json`.

## Preservation and audit verification

Compared with the completed implementation/pre-browser snapshot:

- **No regular Application file changed, was added or removed.** Website Pages, Menu, Shell, Presentation draft, persistent Demo and fixture are preserved.
- Only `security_candidates` changed, **11 → 12 rows**. The other six security-table digests are identical, including active documents, revision and both audit histories.
- Policy remains **9**. All three active functional-record checksums match; the seven accepted permissions have not changed and `ui.page.admin` has not become active.
- Old invalid candidate `969220cf-fa79-4640-979e-9b3248ddbf39` retains its exact complete row digest, checksum and three CHECKSUM_CONFLICT diagnostics. It was not overwritten, reused or activated.
- No policy or administrator **activation** audit row names the new candidate, consistent with no activation. The staged request and persisted candidate record the legitimate actor/source/reason; no activation audit success is claimed.
- Registration records, dependency package/lock/archive hashes, physical native root and all 54 admitted UI Base payload hashes remain unchanged.

No product source changed after the focused tests. The four implementation/test files remain exactly as recorded in the implementation report: shared plan/status types, protected identity server response, pilot panel client, and focused pilot administration test. The **10 passing focused tests**, server typecheck pass and seven retained broader client diagnostics apply to this same code. No further tests/builds were needed for this browser-only continuation. Earlier failed attempts remain failed evidence.

New artifacts are this continuation, root evidence `browser-protected-state.json` and `reviewed-request.json`, and the separate `chrome-continuation/` browser capture, stored candidate verification, snapshot/comparison helper outputs and exact inventory. The prior report/inventories are preserved. `chrome-continuation/files.json` lists the new evidence/report hashes and unchanged product-file hashes. Screenshots are partial viewport captures; the complete sanitized DOM record and stored proposal establish exact candidate contents.

## Stop and remaining work

Stopped at **V1 Local Audience Pilot — Checksum-Aware Cleanup Staging Acceptance Review Gate**. The new candidate awaits separate review and explicit activation approval. Its base revision/checksum must be reverified before activation; do not silently substitute or restage if stale.

Administration and its Menu reference remain unchanged. The existing graph guard still requires repairing `menu-admin`/`admin-home` before guarded Administration deletion; Admin Shell/Menu need not be removed. After separately authorized cleanup, verify exactly `/`, `/about`, `/contact`, then separately audit temporary permission revocation. Accepted mobile evidence remains qualified within its demonstrated Preview boundary.

No activation, revocation, deletion, Application recreation, provisioning repeat, Publish, export, website build, reader process, dependency/trust change, commits or pushes occurred. Security Admin remains signed in. The existing authoring-only Demo remains running under the previously recorded managed launcher; cleanup remains the documented owned-service stop when requested. No acceptance or closure is declared.
