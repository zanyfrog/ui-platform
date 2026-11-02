# Security Admin Sign-In Workflow Diagnosis Gate

2026-11-02. **Diagnosis complete within read-only boundaries; Environment and Session Verification Gate remains open.** No further sign-in was attempted.

## Actual control and sequence

`src/client/artifact-editor/identity-selector.ts` implements the Development identity select. It is the local development authentication control, not a decorative identity label or a production password login. Initial mounting GETs /api/development-identity/session and displays the returned user's email. A change to Security Admin POSTs that endpoint with the existing CSRF-bound session, JSON content type and the predefined email. The server checks loopback/forwarding restrictions, allowed Origin, CSRF, unique predefined active User, then stores its canonical ID in the server session and rotates the session revision. The client adopts the successful response, refreshes the subordinate editor session and either reloads or retains the workspace. DELETE is explicit sign-out. Selecting an already selected option does not necessarily fire change, so it is not a fresh authentication attempt.

`src/server/v1-development-identity.ts` maintains sessions in process memory, with an eight-hour default lifetime; API restart loses that map. Protected calls revalidate the active User and evaluate I-AM permissions. The editor session is subordinate to that V1 identity, not a separate route to assume an identity. A successful sign-in does not imply every permission is allowed.

## Origin and cookie compatibility

`scripts/dev-demo.ts` configures UI 5274, API 5280, Builder WP0, the Demo runtime directory, Demo policy path and registered-Application ledger. `scripts/dev.mjs` passes those ports to the API and Vite. `vite.config.ts` proxies /api to 127.0.0.1:5280 with changeOrigin false. `src/server/index.ts` allows localhost and 127.0.0.1 origins for both configured ports. The UI's relative same-origin requests therefore match the intended API origin/CSRF contract; no source-level UI/API port mismatch was found. This is source/configuration evidence, not a new live deployment attestation.

The V1 cookie is host-only, HttpOnly, SameSite Strict, Path=/api, named uib_v1_development_session. It has no port-specific scope. localhost and 127.0.0.1 are different cookie hosts; ports on the same hostname share this cookie scope. Independent API instances use independent in-memory maps but the same cookie name/path. A request to a separate localhost deployment can therefore overwrite the browser's shared cookie with one that the Demo cannot recognize. This collision mechanism is established by source; it is not established as the cause of the earlier failure. No cookie values were inspected.

## Prior temporary check and current observation

The earlier supported GET returns an existing valid session unchanged, but initializes an anonymous session and sends Set-Cookie when it cannot recognize one. Therefore the temporary tab could have created an anonymous session and replaced the applicable browser cookie. Its sanitized false/null result cannot distinguish an already anonymous session from newly initialized anonymity. It cannot prove why the original session was unavailable, nor prove that the operator never authenticated. Whether the automation-created tab used precisely the operator tab's effective cookie context was not independently established. No credential/session extraction was used to resolve this.

Current supported observation of the existing operator tab shows localhost:5274, Security Admin selected and Error: V1_PERMISSION_DENIED. The supplied screenshot shows the same state. That error is a permission refusal, not specific evidence of failed sign-in; no link between that displayed error and a particular request was recorded. The generic User/user@example.com shell text is not authenticated-principal evidence. The selector can remain stale if another request changes the shared cookie; it has no continuous server revalidation. No raw session endpoint was opened in this diagnosis.

## Legitimate operator procedure and next action

The normal procedure is to use one connected browser context dedicated to Demo, avoid loading another localhost Builder deployment in that context during verification, open localhost:5274 and use Development identity. If signed out, select Security Admin and allow the request and refresh to finish. If Security Admin is already selected but a fresh session is required, explicitly choose Sign out, allow it to finish, then choose Security Admin; reselecting the same option is insufficient. A failed sign-out or a Development sign-in denied message requires stopping rather than assuming success. This procedure is documented only; no sign-out, reload, reset or identity change was performed here.

Before requesting that procedure again, use a verification method that remains in the operator's actual tab/context and returns only principal ID and live authorization decisions. The prior temporary GET is not a non-mutating status probe and should not be repeated as though it were. The current browser API does not expose a sanitized authenticated network-response reader, and its page evaluation is restricted to DOM inspection. Do not substitute cookie extraction, arbitrary fetch or fabricated evaluator contexts. A supported operator-assisted sanitized diagnostic or separately authorized narrowly scoped diagnostic enhancement is needed if the existing UI cannot expose the required live facts.

No specific failed sign-in implementation defect was demonstrated. Concrete design limitations are shared cookie scope across deployments and the initializing GET's unsuitability as a side-effect-free status check. If a product correction is separately approved, the smallest status-check improvement is a non-initializing, sanitized session-status operation; deployment-specific cookie names would address independent-deployment collisions. Neither change is implemented or authorized here. Neither alone establishes live Platform authority or its grant boundary.

## Preservation and stop

Only this diagnosis document was intentionally added. Source inspection and existing-tab observation only; no authentication request, session reset, cookie inspection, settings change, process start, Application creation, grants, Publish, build, host startup, commit or push. Earlier reports, including the unsuccessful verification, are preserved. Security Admin principal, live Platform authority and live grant boundary remain unverified. Application Admin verification has not begun.

**Stop: Security Admin Sign-In Workflow Diagnosis Gate.** Recommend agreeing on a sanitized same-context verification path before another operator sign-in attempt.
