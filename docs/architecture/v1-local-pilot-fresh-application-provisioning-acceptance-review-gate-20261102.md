# V1 Local Audience Pilot — Fresh Application and Provisioning Acceptance Review Gate

2026-11-02. **Stopped on normal creation-flow HTTP 403, as instructed. One fresh Application is persisted and registered; onboarding and functional grants were not attempted. Not accepted or closed. Do not retry creation.**

## Principal and normal creation

The existing operator tab 1964522428 at http://localhost:5274/ was used. Immediately before creation, Verify development session returned authenticated Application Admin usr_f01e0c1c58424bed9ac4e8601ff9890a, builder-demo, ui-platform-development, registeredApplications true, ui.platform.application.create true and ui.platform.security.admin false. No synthetic session, cookie extraction or identity switch occurred.

The ordinary Applications → New Application form offered Standard application. The authorized form submission used:

- Name: Codex Test V1 Disposable Local Audience Pilot 20261102
- Key: codex-test-v1-local-pilot-20261102
- Permanent ID: de8d1851-3e36-435f-b093-95ce94d940e7
- Creator: usr_f01e0c1c58424bed9ac4e8601ff9890a
- Disposable root: C:\Projects\Modular\builder-demo\apps\codex-test-v1-local-pilot-20261102
- Template: standard, version 2.0.0; manifest creation timestamp 2026-11-02T18:51:37.297Z

Read-only inspection confirmed matching permanent manifest identity and a new normal creation-ledger row containing that key, permanent ID and creator. The existing Demo registration remains present. No manifest, store or grants were copied. The initial form-name entry rerendered the key input and invalidated its old UI handle; fresh observation and the replacement key input were used before submission. This was an input retry, not a second creation request.

## Failure and stop boundary

The Builder showed Creating / installing, then **Request failed: 403** on the creation form. It did not open the new Application. This UI error alone must not be described as proof that no Application was created: the registration and files exist.

Read-only source inspection explains the sequence boundary without broad investigation: the submit handler creates through POST /api/apps, then refreshes discovery, then calls renderApp; renderApp first GETs the newly created Application. The server registers normal creation before returning its creation response, and creation grants no Application read authority. The new Application has not been provisioned with ui.application.view. Thus post-creation read denial is consistent with the observed result. The exact failed network request was not captured, so the 403 is not independently attributed to a specific request. No request replay, permission workaround or code correction was attempted.

Per authorization's failure instruction, work stopped. Security Admin was not selected; its earlier verified principal remains the authorized future provisioner but was not used for a protected change here. No onboarding POST, stage, activation or admin-anchor creation occurred. **Activated grants: none. Administrator anchor: absent/not provisioned.** No reason/audit entry for provisioning was manufactured. The future approved reason remains the V1 disposable local audience-delivery pilot; it has not been submitted.

Ordinary new-Application Pages and Presentation accessibility is **not tested**, since provisioning did not proceed. The earlier Demo workspace denial and installed-path errors remain historical qualifications, not reproduced or resolved in this new Application. No future-Application permission is inferred from existing Demo/fixture grants.

## Preservation and exact inventory

Evidence directory: evidence/v1-fresh-pilot-provisioning-20261102/. before.json and after.json inventory regular Application-root files and sanitized security-table hashes/counts plus registered identities; changes.json lists exact added files and changed existing files; files.json inventories the continuation evidence and report hashes. snapshot.mjs and compare.mjs are read-only inspection helpers, not product changes.

Comparison: **861 existing regular files unchanged; zero changed/missing existing files; 846 added regular files under the new disposable Application root.** Directory links/junctions are not recursively inventoried. This is not comprehensive dependency-binary qualification. The exact new file hashes are in changes.json. Existing persistent Demo and fixture regular files are preserved within this inventory.

All seven security tables have identical before/after counts and digests: documents 96, state 1, candidates 8, security audit 7, administration audit 6, administration mode 1, delegation audit 0. **No security audit entries or policy changes were added.** Creation history gained exactly the one authorized registration; existing registration preserved. Normal creation performed its existing dependency installation and generated app-services build, recorded in the running Demo's operational output; no additional build command, website build/export, Publish, preview/reader startup or package remediation was invoked. The existing startup log consequently appended creation output; earlier evidence contents were not rewritten. Demo runtime/control remains running as before.

No product-code edits, persistent Demo/fixture edits, permission changes, principal switch, broader repair, OS/security changes, commits or pushes. Report/evidence additions are the only intentional ui-platform filesystem additions during this increment.

## Review result

One authorized disposable Application exists, but the normal creation flow ended with 403 and protected provisioning is incomplete. Any separately authorized continuation must reuse the recorded key and permanent ID, not create another Application, and begin with legitimate Security Admin authentication/reverification before the protected onboarding operation. The current tooling has no demonstrated onboarding UI in the ordinary Builder; legitimate same-context protected API execution must be established rather than extracting credentials or fabricating sessions.

**Stop: V1 Local Audience Pilot — Fresh Application and Provisioning Acceptance Review Gate.** Await review; do not proceed to publishing, reader hosting or automatic provisioning.
