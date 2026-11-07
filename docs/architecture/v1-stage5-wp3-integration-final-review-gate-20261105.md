# Stage 5 Integration-Readiness Final Review Gate — WP3 continuation

**BLOCKED — the final uninstrumented browser integration failed. No local-increment acceptance or checkpoint synchronization is recommended. Stage 5 and overall V1 remain open. No commit or push.** Platform baseline remains `d3729a13c8312d35be4fe61b784f84f9e3bd4446`; Data Services baseline is `81b769eef3763d02343f5347888c26edab6ef7bc`. The later WP3 extension authorization supersedes the earlier predicate-contract stop; those earlier records remain historical evidence, not current completion claims.

The final physical run (`603781e2-e64d-4558-ac79-1e20418017c8`) passed **151 I-AM tests** and **44 Platform tests**, with **one Platform failure and one existing skip**. Protected management returned `403 PROTECTED_REQUEST_DENIED` during initial Viewer-policy activation, where `200` was required. The precise intermittent identity/session/management failure cause is unresolved. No evaluator or authentication check was relaxed to obtain a passing result. Stop here for review of this blocker; implementation is not declared complete.

## Implemented contract

Data changes are restricted to WP3 `types.ts`, `graph.ts`, `service.ts` and `tests/wp3-template-contract.test.ts`. The separate Data review packet is `v1-stage5-wp3-data-review-20261105.md`. There are no evaluator, Dataset planner, bootstrap, UI-Base, manifest or dependency changes.

`AdministrationScopeAuthority.permitsTemplateRule` receives the complete rule, actual granting boundary, actual permission entry and applicable assignment scope. Predicate-bearing rules require a nonempty template-ID ceiling and this full-context validator; an expression-only `permitsPredicate` callback cannot authorize them. The accepted development adapter remains unchanged and predicate-denying.

`AdministrationConfiguration.templateAuthority` supplies synchronous stage capture, current-binding assertion and full boundary-delegation validation. Candidate binding stamps are service-instance-local; restarting requires restaging template candidates. Current-binding assertions run inside serialized WP3 activation and can return a lease held through policy commit/rollback. Delegation validation receives the authenticated actor, actual current administrative paths, previous/proposed boundaries and committed documents. Existing ownership, permission/operation ceilings, self-escalation, last-administrator and mandatory audit checks still execute. Non-template administration retains its existing path. Text drafts remain drafts and cannot acquire template authority by bypassing binding capture.

UI Platform's finite `InventoryPredicateTemplates` registry admits only:

| Property | Approved value |
| --- | --- |
| Template ID | `inventory.exclude-hidden.v1` |
| Permission/effect | `dataset.read` / **deny** |
| Predicate | `eq(field(nameId), literal("Hidden"))` |
| Field | The unique authoritative permanent `name` field ID from the actual applied inventory schema |
| Ownership | Exact Application, Dataset, canonical schema identity and existing application-administrator boundary/beneficiary |
| Assignment | The explicitly delegated application scope; no caller-defined expression or foreign scope |
| Registration | Current I-AM Platform Administrator capability and actual administrative path; independent audited action |

Registration does not grant a role or make an empty ceiling usable. Actual WP3 delegation must explicitly add the approved ID to the existing application ceiling; actual WP3 activation must then admit the Viewer policy. Unknown IDs, other operators/literals/fields/permissions/polarities/boundaries and stale/revoked bindings fail closed. Template revocation prevents new activation; it does not silently remove an already committed DENY rule and widen access.

The adapter binds immutable schema/publication/state content and a consistent **logical** snapshot of the owning resource registry. SQLite journal/checkpoint bytes are not treated as authority revisions. It verifies canonical application ownership and active status separately from presentation settings. During activation it holds both template-registry and resource-owner SQLite reservations through WP3 commit/rollback. The owner table layout is pinned to the current Data implementation; incompatible layout/binding changes fail closed. Production schema-writer coordination still requires target qualification.

## Actual local workflow

The completed scenarios below describe the earlier **diagnostic** browser run `4dccd9b7-ae03-43f8-9d9d-e51a20e78689`, retained separately in `diagnostic-complete-integration/` with its result, source hashes and tracing provenance. Temporary error tracing did not change authority checks, but that run is not the final verification. The later uninstrumented full run stopped at Viewer activation, before the protected Form/private/revocation journey could complete. Its actual partial evidence is isolated in `current-run/integration-local/`; the two runs must not be combined into a passing final result.

The workflow uses supported Builder controls and existing protected APIs to provision an Application/admin anchor, create/apply an inventory Dataset, create its mapped Form, create a Page, insert the Form and persist a bounded Page query. The test waits for the actual applied Dataset selector and verifies the frozen query metadata. An Editor publication attempt is refused; an explicitly granted Publisher publishes A. The shared Form editor saves draft B with its name field noneditable. Release A remains selected and its Form remains executable.

Runtime Users are created and assigned through actual WP3, rather than inheriting unrelated Builder fixture scopes. Explicit local enrollment maps approved fixture issuer/subjects to those real I-AM Users. Separate Data, runtime and management processes use distinct certificate/signing identities, fixed mTLS transports and authenticated identity/session RPCs. Startup-issued local sessions are test composition, **not live Auth0 login evidence**.

The normal browser Form commits once through runtime/Data and reads back the saved record. The Page's real on-load query executes from frozen metadata. A Viewer receives the authorized row with `quantity` omitted, never receives the committed `Hidden` row, and cannot write. Private metadata, full download, thumbnail decoding, HEAD, ranges and private/no-store behavior use the actual private version/hash owner outside public roots. Screenshots mask private thumbnail bytes.

Existing role-administration controls revoke the Viewer assignment through management and WP3. Subsequent query/private requests from the already-open runtime session fail. Authenticated session-epoch revocation invalidates the Editor cookie; disabling the Viewer User through WP3 invalidates its still-open session. An independently revoked template invalidates a previously staged candidate. Disabled owner, wrong registration/schema, foreign ownership, forged definitions, stale release, unsupported contract and public management/development/static bypass checks are retained in the evidence.

The private-owner extension is necessary because the accepted Application asset/export manager is public and has no private persisted index. Public Stage 3 functionality is retained. Private creation uses an explicit local operator capability; no production private-upload UI or credential custody is claimed.

## Verification and preservation

Final counts, failure details and source reconciliation are in `evidence/v1-stage5-wp3-integration-20261105/verification-summary.json`. The Data suite passes all seven I-AM test files, including 24 new WP3 cases. The Platform suite passes the two compiled/owner-lock contract checks, ten retained Stage 5 security tests and accepted Stage 1–4 regressions, but **fails the new integration journey**. The one retained native-admission skip is not relabeled as a pass. Earlier test-wait failures and the later unresolved intermittent authority refusals are distinguished in the limitations and verification-attempt record. The normal recording command refuses a failed run; `--record-failed-run` records this blocked package without asserting acceptance.

The focused production-module TypeScript/import boundary checks run in the physical copy. Missing/original-root isolation configurations are refused before initialization. `run-source-inputs.json` identifies exact copied source/test bytes; `changed-file-hashes.json` and `data-changed-file-hashes.json` inventory the final review files. Any terminal-whitespace normalization is explicitly reconciled against the tested bytes, not hidden. Original 23 Component files, 234 installed native package files and dependency manifests are rechecked. UI-Base remains clean at `732eec58ca3d4bd2521197b9d3b6c0457dbc6608`. No original historical lock body is read, acquired, recreated, recovered or mutated; the accepted directory-preservation guard is retained unchanged.

No dependency was added. The existing nested security package pins/integrities remain unchanged; no install lifecycle script is introduced. Disposable build outputs, certificates, signing keys, cookies, private stores, raw failure diagnostics and archive files are excluded from the review inventory. Sanitized tests, audits, package identities, screenshots, binding/refusal results and preservation records are retained.

## Explicit remaining limitations

- The existing Windows ZIP subprocess failed. Public bundle and **prepared export tree** scans found no private bytes or credential/private-store files, but a downloadable ZIP archive is **not verified**. No exporter implementation was changed to hide this failure.
- The local multi-process host uses the existing evaluator's configurable **15-second** proof budget; the factory default remains **one second**. Every authority assertion still re-evaluates current policy, identity, session and binding; no cached allow or automatic write retry is added. Smaller budgets expired during complete frozen-release validation. Target latency, timeout and freshness settings require operator qualification.
- Repeated local runs also produced intermittent fail-closed refusals at the 15-second setting: `PLAN_EVIDENCE_STALE` before Form commit and generic identity/session/management denials. Their precise cause is **unresolved**. A diagnostic run completed all scenarios, including the exact stale-template diagnostic, without an unexpected RPC error. `verification-attempts.json` and the prior full test report retain the failures. A successful final run does not establish sustained reliability or explain those earlier failures; this remains a P2/I6 readiness qualification.
- Tests use loopback HTTPS, an ephemeral CA, local sessions and the same Windows account. Runtime/management Node filesystem permissions are not independent Ubuntu users/ACLs. The shared test composition bundle is not production deployment packaging.
- Actual Auth0/MFA/provider lifecycle, domains/Caddy/TLS/firewall, Linux behavior, serving-generation/owner wiring, production private storage and styled presentation under final CSP remain unqualified. WP3's existing `NODE_ENV=production` identity guard is retained; no production launcher bypass is supplied.
- This packet prepares Data changes for independent maintainer review; it does not claim a second reviewer or maintainer acceptance. Stage 6 activation and Stage 7 backup/recovery remain excluded.

## Criterion matrix

| Criterion | Local scope established | Production disposition |
| --- | --- | --- |
| P1 | Retained cryptographic provider fixtures; actual I-AM User/enrollment integration | **Blocked:** live Auth0/MFA/enrollment/lifecycle pending |
| P2 | Actual mTLS/RPC/session checks, epoch/User revocation and outage refusal | **Unqualified:** target HTTPS/provider lifecycle, credentials and proof/time budgets |
| P3 | Actual publication/applied schema, frozen query/Form execution and A after B | **Unqualified:** target serving/release ownership, packaging and final CSP/presentation |
| P4 | Route/import boundaries, separate credentials/processes and local filesystem restrictions | **Unqualified:** Ubuntu accounts/ACLs/network/Caddy/distribution inventory |
| A3 | Real private index/version/hash transport, browser thumbnail, range/HEAD/cache and revocation | **Unqualified:** production owner/storage/custody; ZIP archive verification remains open |
| I1 | Real local provision/onboard and explicit runtime User grants | **Unqualified:** production identity and enrollment |
| I2 | Finite template registration/delegation, current WP3 activation/refusal/audit and last-admin regressions | **Unqualified:** independent Data review and production management qualification |
| I3 | Supported Editor Dataset/Form/Page controls; explicit Publisher separation; retained restrictions | **Unqualified:** production/shared-scope qualification retained |
| I4 | Actual Viewer row/field projection and denied write | **Unqualified:** real identities/final applications/assets on target |
| I5 | Anonymous published Page; authenticated protected operations; public bypass refusals | **Unqualified:** target proxy/cache/public-site inventory |
| I6 | Open-session role/epoch/User disable, template revocation and owner/schema refusals | **Unqualified:** real owner/provider disable propagation and concurrent production writers |

The local-scope column records implementation and diagnostic-run observations, not an overall passing integration gate. The final failure additionally blocks local I2 and end-to-end I4–I6 confirmation; P2 reliability remains unresolved.

The separately authorized next qualification must settle Auth0 plan/tenant/region, MFA methods, user/client counts and a current quote; exact application/management HTTPS domains; Ubuntu capacity/access owners; independent accounts, CA/signing-key rotation and credential custody; real release/schema/private-asset ownership and writer coordination; and measured timeout/CSP/export behavior. No purchase, registration or deployment is performed here.

**Stop at the blocked Stage 5 Integration-Readiness Final Review Gate. Resolve and retest the management/identity/session refusal before requesting local acceptance.**
