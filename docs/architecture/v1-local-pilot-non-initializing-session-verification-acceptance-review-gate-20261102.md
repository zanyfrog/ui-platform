# V1 Local Audience Pilot — Non-Initializing Session Verification Acceptance Review Gate

2026-11-02. **Submitted for review, not accepted or closed. Security Admin live browser authentication remains pending operator interaction.**

## Implementation

GET /api/development-identity/status uses the existing V1 session resolver with expired-entry pruning disabled. It never initializes a session, sends Set-Cookie, changes a User/revision/expiry, or extends lifetime. Status evaluation also disables resolver pruning, including if a session expires during an awaited decision. It rechecks session identity and revision before returning authenticated results. No policy, grant or audit write path is called.

Anonymous/unknown/expired/inactive identity produces only unauthenticated status, false and null principal ID. Disabled development identity, refused forwarding or evaluation failure produces unavailable; unsupported methods are refused. Existing loopback/development restrictions apply. No CORS access is added. Responses use no-store and nosniff.

An authenticated active development User receives its canonical principal ID, the configured non-secret deployment label, the existing authority ID, registered-Application mode, and two own-principal decisions at the existing system/platform resource: ui.platform.security.admin and ui.platform.application.create. Both decisions use the existing authorize/evaluator path. No caller-specified permission/resource/principal is accepted. No session revision, CSRF, cookie, raw grant boundary, policy record, database path or security-store content is returned. Denied capability is false, not a bypass. The Demo launcher explicitly configures builder-demo; the fallback label is development and does not claim Demo identity.

The existing Development identity chrome now includes Verify development session. Clicking it performs a same-origin relative GET in the actual operator tab and displays a whitelisted sanitized result with textContent. It neither changes identity nor refreshes the initializing session endpoint. Identity changes clear prior results and invalidate outstanding status displays. Existing POST/DELETE authentication and CSRF behavior is retained. No cookie name/scope changes.

## Verification

Final focused run: **8 tests passed across 2 files**, covering new status behavior and existing identity/refusal/revocation regressions. New tests cover absent/unknown/malformed cookies, disabled adapter, unsupported method, forwarded request, anonymous before login, legitimate login and CSRF refusal, canonical principal/deployment/authority, live evaluator denial then allowance after isolated fixture policy activation, expiry without pruning, explicit sign-out, and exact in-memory session equality before/after reads including revisions/expiry. Every status response tested has no Set-Cookie; authenticated output is checked against an exact whitelist. Policy document digest is unchanged across status reads. Test-only grant activation occurs only in temporary fixture stores, never Demo.

Server typecheck passed. Platform UI Vite build passed, emitted into the new evidence directory; no website was built/exported. Full client typecheck still reports the seven previously recorded broader diagnostics (fixture/native preview declarations and main.ts); none references the changed display. git diff --check passed. No broader suite claim.

Retained failed attempts: initial restricted loopback test run had six EACCES connection failures and two passes; an outside-restriction run then had seven passes and one rejected test-fixture policy activation because the fixture did not register the requested platform-security permission. The isolated positive evaluator fixture was corrected to the already registered application-create permission. Final runs pass. This does not reclassify any earlier historical test failures.

## Same-context browser evidence and manual boundary

The managed existing Demo was restarted using its documented control stop and authoring-only npm run demo, without preview/setup/login flags. Its saved state was ready, so initialization/provisioning branches were not invoked. Restart necessarily discarded in-memory sessions. Owned startup shell PID 21532, execution session 21713. API 5280 and UI 5274 returned to healthy Demo status; no Application preview or reader was started. The environment remains running for the operator step. Its managed control stop is the cleanup operation when no longer needed; no unrelated process was stopped.

The existing operator tab 1964522428 at http://localhost:5274/ was reloaded to load the new display. The existing page initialization still has its pre-existing anonymous-session bootstrap; this is distinct from clicking Verify. Clicking Verify in that same tab displayed exactly status unauthenticated, authenticated false, principalId null. No separate verification tab or arbitrary fetch script was used. Browser proof establishes observability through the configured proxy; session/cookie non-mutation is established by source and focused fixtures, not browser cookie extraction. No cookie/CSRF capture occurred.

The operator was asked to perform the documented Sign out → Security Admin sequence (the selector already showed Sign out after restart). No operator completion was received during this work. The later browser observation timed out waiting for page state; no completed sign-in is inferred. The final display stale-result guard was added after the initial unauthenticated browser proof and built successfully, but that final UI adjustment was not re-demonstrated after the timeout.

**Security Admin principal and live Platform authority were not demonstrated in the live browser.** Exact remaining manual step: operator establishes Security Admin normally in the existing Demo tab, indicates readiness, then Verify development session must show usr_06fefc50791f4f15ac0139de699701b9, builder-demo, ui-platform-development, registeredApplications true and ui.platform.security.admin true. Stop there; do not switch to Application Admin automatically. Raw grant-boundary disclosure/verification is outside this endpoint and remains unqualified.

## Preservation and exact change inventory

Intentional source/test files:

- src/server/v1-development-identity.ts
- src/server/index.ts
- src/client/artifact-editor/identity-selector.ts
- scripts/dev-demo.ts
- tests/v1-development-status.test.ts (new)

Documentation: this new gate report. Evidence: evidence/v1-development-session-status-20261102/, with exact recursive file/hash inventory in files.json, source hashes in source-files.json, tracked source differences in source.patch, focused test/typecheck/build/startup logs, and preservation inventories. The build outputs are platform UI verification artifacts. Earlier reports/evidence are retained.

The first live file-hash attempt could not read six locked database/WAL/SHM files; these entries were not counted as preservation proof. A subsequent stopped baseline and readable post-start hash comparison found **875 files unchanged, zero mismatches/unreadable files**, including policy and creation-ledger files. Operation logs, volatile control record and Vite cache were excluded from that comparison. Sanitized post-start policy table counts remain documents 96, state 1, candidates 8, policy audit 7, admin audit 6, admin mode 1, delegation audit 0. No comprehensive binary/dependency requalification is claimed. Startup may append ordinary operational logs and refresh Vite/platform package build outputs through its existing predev contract.

No separate disposable deployment changes, security assignment changes, pilot Application creation, production Publish, website build/export, reader startup, commits or pushes. Shared accepted architecture is not reopened.

**Stop: V1 Local Audience Pilot — Non-Initializing Session Verification Acceptance Review Gate.** Environment and Session Verification Gate remains open; acceptance/closure requires separate approval and live Security Admin verification remains outstanding.
