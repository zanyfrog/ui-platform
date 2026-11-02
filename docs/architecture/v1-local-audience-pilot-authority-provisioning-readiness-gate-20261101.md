# V1 Local Audience Pilot — Authority and Provisioning Readiness Gate

2026-11-01. **Read-only verification complete. Execution remains blocked pending usable authority sessions and separate provisioning/pilot approval.** No Application, grant, publication, build or reader process was created.

## Recommended deployment and approved identities

Use the **Builder Demo deployment's existing authority**, separately from the disposable Builder at port 5374. Do not use its persistent Demo Application as the pilot. The eventual pilot must be a newly registered Application in an explicitly approved disposable root within the selected deployment's contracts.

| Approved role | Existing User ID | Established policy scope / limit |
| --- | --- | --- |
| Provisioning administrator: Security Admin | usr_06fefc50791f4f15ac0139de699701b9 | Existing Builder Demo Platform security role and system-scoped grant boundary; not authority imported into another store. |
| Creator, author, publisher: Application Admin | usr_f01e0c1c58424bed9ac4e8601ff9890a | Existing Demo creation grant and Demo/fixture author/Publish scopes; no future-Application grant yet. |
| Local operator candidate | NIMO-LAPTOP\zanyf | Previously observed current-process account. No elevation, exclusive-user authentication or successful reader-start capability asserted. |

Source-backed deployment support is present: `scripts/dev-demo.ts` supplies its own policy and creation-ledger paths, enables registered-Application/protected onboarding (`UI_PLATFORM_BUILDER_WP0=1`), and uses API/UI ports 5280/5274. It is not necessary or authorized to rerun that script to establish sessions in this phase: its setup/preview branches can log in, provision or start processes.

Read-only SQLite inspection reconfirmed Demo policy revision **7**. Existing `development.platform-security.boundary` is active at system `platform`, descendants included, and permits create/edit/assign/revoke/activate/archive within its listed permission ceiling. That ceiling includes the proposed Application/Page/Presentation permissions and `ui.application.security.admin`. This supports the protected provisioning design; it is not a live authenticated authorization decision.

The existing creation ledger has one registration: key `demo`, permanent ID **c6aa0b22-7aa2-4c9d-b659-76bf74802cc6**, creator **usr_f01e0c1c58424bed9ac4e8601ff9890a**. No fresh pilot registration exists. Policy and ledger were opened with `readOnly:true`, without their initializing store constructors, and their main file hashes matched before/after. No databases, manifests, sessions, credentials or grants were copied between deployments.

## Current authenticated-session status

**Security Admin: unresolved. Application Admin: unresolved in Builder Demo.**

The Chrome tab inventory contains no Demo Builder at port 5274. Existing 5374 tabs belong to the separate disposable Builder; its suspended Application Admin display does not attest a Demo session. Absence of a tab does not establish absence of all server sessions.

A supported credential-free GET navigation to **http://127.0.0.1:5280/api/health** failed with **net::ERR_CONNECTION_REFUSED**. Thus the expected Demo API was not reachable through that browser check. No server was started/restarted, alternate port guessed, identity selected, or authentication action attempted. This is a current endpoint-availability blocker, not proof that the stored authority definitions are invalid.

Source inspection identified these supported checks and limitations:

- `GET /api/development-identity/session` reports the caller's existing principal, but also creates an anonymous session if none exists and returns CSRF/revision material. It cannot enumerate or independently attest both approved users' sessions. It was not called or captured here.
- `GET /api/apps/<registered-key>/onboarding` requires a legitimate caller with Platform/Application security administration. Its optional runtime-readiness branch can contact an existing protected data host; it is not a universal side-effect-free session-enumeration endpoint. It was not called against the persistent Demo to manufacture session proof.
- Sessions are server-owned and transient. Stored User/role assignments, old setup login code, identity selector options and approval of candidate names are not authenticated-session evidence. No process-memory inspection, credential extraction, fabricated evaluator context or impersonation was used.

After separately authorized restoration of the legitimate environment, usable sessions must be demonstrated through supported checks in each approved principal's legitimate context, with only sanitized principal/status evidence recorded. This report neither creates those contexts nor asserts that a successful login already exists.

## Minimum future Application permissions

All future rules and assignments must reference the **new registered permanent Application ID**, authority `ui-platform-development`, with no scope inherited from the existing Demo/fixture. The following are the minimum relevant functional permissions for the requested work; administrative cleanup is distinguished explicitly.

| Capability | Required resource/scope | Purpose |
| --- | --- | --- |
| ui.application.view | New Application resource | Discover/read the Application. |
| ui.application.edit | Same Application | Edit Application settings through existing management controls. |
| ui.page.view | New Application's Page descendants | Read/list Pages and eligible destinations. |
| ui.page.edit | Same Page scope | Create/edit Pages and change Page Shell membership. |
| ui.presentation.view | New Application's presentation/artifact descendants | Read Shell/Menu, composition, styles and Application images. |
| ui.presentation.edit | Same presentation scope | Configure/edit Shell/Menu, presentation and local composition sources. |
| ui.presentation.admin | Same presentation scope | Explicit composed Presentation Publish; also guards presentation/Shell deletion where applicable. |
| ui.page.admin | Same Page scope; needed for pilot placeholder cleanup | Remove the fresh Standard template's unwanted Admin Page using existing dependency guards. Not necessary for ordinary non-destructive Page editing alone. |

Application-scoped rules may use the exact new Application root with `descendants:true` where the existing Page/artifact hierarchy requires it, retaining permission applicable-kind validation. Application metadata permissions can be restricted to the exact root. Do not substitute system-wide, another Application's or unrestricted wildcard scope.

This is **seven functional permissions plus ui.page.admin for the requested cleanup**, not a broad Application Admin role copy. The initial administrator anchor is a separate **ui.application.security.admin** grant at the exact new Application resource, `descendants:false`; onboarding that anchor does not grant the eight business permissions above. There is no need to add Form/Workflow/Dataset, package-management, Platform-component-administration, export or protected-data rights for this restricted informational pilot. If actual ordinary controls demonstrate another requirement, report it before widening the assignment. Existing installed dependencies do not require permission to edit those dependencies.

Creation remains the already assigned **ui.platform.application.create** at system `platform`, outside future Application scope. No new creator capability is proposed. **ui.application.admin** is not needed merely to save content or publish; whole-Application deletion/template administration is outside the functional minimum here.

## Exact protected API and approval prerequisites

1. **Normal creation, later approval only:** `POST /api/apps` under the approved creator's legitimate session and existing creation permission. Successful creation must register permanent ID/key/creator through `DevelopmentApplicationRegistry`; a copied manifest is not registered ownership.
2. **Initial provisioning:** `POST /api/apps/<new-key>/onboarding`, legitimate existing Platform security administrator, `{administratorUserId, reason}` with the approved existing Application Admin ID and a nonempty reviewed reason. Same-origin/session/CSRF checks and active User checks remain mandatory; no secrets should enter reports.
3. The adapter stages exactly five new records: Application-security definition, administrator-only permission set, role, non-expiring assignment and platform-owned exact-Application grant boundary. `provisionApplication` checks registered active owner, unchanged owner revision, candidate ID/checksum, expected policy revision, fresh principal/session/resource decisions, exact scope and valid last-administrator anchor. Activation and mandatory administration audit are committed by the existing authority. It is not a generic automatic author grant.
4. **Separate author/publisher assignment:** protected `POST /api/apps/<new-key>/security/stage`, with reviewed changes/expected revision/reason; then `/security/activate`, with returned candidateId/checksum/base revision and nonempty approved reason. Existing Platform or appropriately authorized Application security administration, grant ceilings, operation delegation, owner restrictions, self-escalation/last-admin protections and live revalidation apply.
5. Use the approved Security Admin's existing Platform authority to perform any separately approved business grants within its current ceiling. The initial Application administrator's narrow boundary contains only ui.application.security.admin: it cannot be treated as permission to self-grant Page/Publish rights. The policy revision observed here must not be hardcoded into later activation.

The user has approved identity choices, **not these future permission mutations**. No staged candidate or activation was submitted. Mandatory audit includes actor, targets, Application, authority path, reason and before/after digests; UI Platform history's generic local-user label is not a substitute for that protected audit.

Sources: [onboarding/session adapter](../../src/server/v1-development-identity.ts), [permission mapping](../../src/server/v1-management-routes.ts), [registry](../../src/server/development-application-registry.ts), [Demo launcher](../../scripts/dev-demo.ts), and sibling I-AM `wp3/service.ts` provisioning/activation checks. The [previous inventory](v1-local-audience-pilot-identity-capability-inventory-20261101.md) remains unchanged.

## Ordinary-privilege operator and reader prerequisites

The existing process-launch contract uses normal child-process spawning/current-account npm execution. It contains no elevation/runas/service-install requirement. The template's reader command uses Vite preview bound to 127.0.0.1; Node >=22.12.0 is required by that template. This establishes **ordinary-user design intent**, not successful execution under this account. No privilege/token, elevation, firewall or Windows security investigation was performed.

Keep **127.0.0.1:5189 proposed, availability unconfirmed**. No new bind/probe was attempted in this phase. Earlier observations remain qualified: no visible netstat entry, CIM query unavailable, client probe EACCES. Existing Demo port preflight temporarily binds loopback and closes the probe; running it would start a listener and is prohibited here. Existing dynamic-port Preview selection does not satisfy the fixed-port contract.

Installed Vite preview supports explicit host/port and strict-port refusal; it inherits strictPort/server proxy settings unless explicitly controlled. Later effective configuration must verify exact fixed port, host 127.0.0.1, base `/`, no inherited UI_PLATFORM_API_PORT/API proxy, and no development/source exposure before startup. A strict-port conflict must refuse, never fall back or terminate unrelated processes. All launch/admission checks requiring a listener remain deferred to separate authorization.

## Disposition and exact changes

Recommended authority is structurally suitable and its existing grant ceiling supports the proposed bounded assignment. Genuine unresolved gates are: current Demo API availability; both legitimate authenticated sessions; future registered Application and explicitly approved scoped grants; operator launch/bind ability; fixed-port availability and effective reader isolation. None was bypassed.

Only this readiness report was added in this phase. Read-only source/ledger/policy/browser-tab inspection and the failed credential-free health GET were performed. No persistent Demo content, product/test code, settings, permission definitions/assignments, session identity selection, security configuration or historical evidence changed. No build, Publish, export, listener, host start, commit or push occurred.

**Stop: V1 Local Audience Pilot — Authority and Provisioning Readiness Gate. Await separate explicit approval for actual provisioning and pilot execution.**
