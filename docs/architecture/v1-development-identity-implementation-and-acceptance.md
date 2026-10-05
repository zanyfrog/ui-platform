# V1 development identity implementation and acceptance record

**Status: V1 DEVELOPMENT IDENTITY READY — PRODUCTION WP7 DEFERRED**

## Repository state

| Repository | HEAD at verification | Working tree |
| --- | --- | --- |
| UI Platform | `ccffd8c2b2b9540c04041613a7f4af026517ff93` | Uncommitted V1 implementation, tests and documentation |
| UI Platform Data Services | `cc9aea87f129802f53c0f61b810667c8a029f643` | Uncommitted I-AM User email contract, trusted actor assertion and tests |

No commit, push, release, migration or deployment was performed.

## Implementation

The source-only `V1DevelopmentIdentity` adapter provides one-click/email selection of predefined Users, an opaque eight-hour server-side session, an active-User check on every protected request and an I-AM evaluator-backed authorization method. Permanent generated User IDs are independent of email. The additive optional `SecurityUser.email` contract is validated, unique in the active graph and used only to find a predefined development User at login. Unknown or inactive Users fail closed. The dedicated `v1-identity-fixture` Application is generated only in development mode, marked as a fixture and assigned a stable permanent Application ID. The seed passes through WP1 validation and audited activation, creating actual Roles, composed Permission Sets, Permissions and Role assignments in the real I-AM store. No User receives a direct Permission Set assignment.

The browser management route registry maps current Application, Page, Presentation, artifact, application-package and platform-package operations to atomic I-AM Permissions. The editor resolves Form, Page and Workflow artifact types before authorization and filters discovery per User. Unknown management routes and other Application IDs fail closed. Direct API calls receive the same checks as editor controls. Application Admin remains a scoped Role backed by Permission Sets; Security Admin is separate. The fixture includes six development Users: Application Admin, Security Admin, Page/Form Editor, Workflow Editor, Mixed Permissions and a combined editor with two Role assignments. The mixed User may edit Page/Form resources but cannot edit Workflow, Application settings or security definitions. The V1 editor does not expose a WP1 activation shortcut; WP3 trusted administration remains authoritative.

The application-data proxy resolves the V1 session on the UI server, rejects browser-provided bearer credentials and sends a one-use, short-lived HMAC assertion to the loopback protected Data Services host. Its claim binds the stable User, Application, authority and exact I-AM policy digest. Data Services checks signature, time, replay, policy match and active User before giving DOE a trusted actor context. The V1 host configuration disables the former fixed-User bearer. DOE/I-AM and ORM remain the enforcement and persistence path. A session-only application-data transport lets Forms/Pages use the browser cookie without constructing an actor credential.

## Acceptance evidence

| Requirement | Result and evidence |
| --- | --- |
| Known, unknown and disabled login; stable User ID; no client actor substitution | **PASS** — `tests/v1-development-identity.test.ts`; seeded `SecurityUser` documents are read on each request |
| Development-only guard and public semantics | **PASS** — production/source guard test; loopback binding; production client exclusion; no synthetic Public User |
| Real Role/Permission Set/Permission evaluation and composition | **PASS** — `tests/v1-development-identity.test.ts` tests Application Admin, Security Admin, multiple Roles, composed sets and cross-Application denial through WP2 evaluator |
| Current management APIs checked at server boundary | **PASS** — `tests/v1-management-routes.test.ts` covers the route inventory; `tests/v1-management-server.test.ts` edits a real Page and Form and denies direct Workflow and Application/security mutations |
| Same User across editor and Dataset/DOE | **PASS** — `tests/v1-management-server.test.ts` signs in once, edits Page/Form, submits a Form through the session transport and real DOE/ORM, then switches User and observes Dataset denial |
| Server-to-server actor integrity | **PASS** — `packages/dataset-operations/tests/v1-development-assertion.test.ts` checks signed User binding, replay, forged bytes, policy mismatch, disabled User and legacy-token denial; UI proxy test checks browser bearer rejection |
| WP1–WP6 compatibility | **PASS** — full Data Services suite 724/724; full UI Platform suite 220/220; editor contract suite 106/106 |
| Builds, types and production exclusion | **PASS** — both workspaces build and typecheck; `node scripts/check-editor-production.mjs`; `git diff --check` in both repositories |

Verification commands: `npm test -- --reporter=dot --maxWorkers=2` in UI Platform (38 files, 220 tests); `npm test -- --reporter=dot` in Data Services (33 files, 724 tests); `npm run check:editor-contracts` in UI Platform (13 files, 106 tests); `npm run build` and `npm run typecheck` in each workspace; `node scripts/check-editor-production.mjs`; `git diff --check` in each repository. The initial unconstrained UI full-suite run exceeded Vitest's five-second deadline in the real cross-service test under concurrent worker load; the unchanged test passed in the full two-worker run. One editor-contract run encountered a transient Windows watcher rename `EPERM`; the unchanged rerun passed. Sandbox child-server runs can fail during Node's OS-user lookup (`uv_os_get_passwd ENOMEM`); normal local process runs passed. No assertion was weakened or timeout increased to hide these environment failures.

## Compatibility and limits

V1 grants only the deterministic fixture Application. Other Application management remains denied until an explicit I-AM provisioning workflow assigns authority; a new Application is not automatically controlled by its creator. Global Application creation and platform package administration are registered but unassigned to the seeded Users. The fixture Form/Workflow artifacts are test resources, not invented Account/People/Financial production components. Public health, template/component discovery and active runtime assets retain their existing behavior. Existing fixture-role editor and fixed-User Dataset paths remain available only when V1 mode is off; the protected Dataset host must set `allowLegacyToken:false` for the V1 browser path.

V1 sessions are in-process development sessions, and the signed actor handoff is a loopback development capability. Production IdP, MFA, passkeys, recovery, production session lifecycle, distributed revocation, machine/API authentication and identity linking remain WP7 or later. WP6 delegated Service execution and its approved executable boundary are unchanged. The acceptance gate stops here; no WP7 or later editor phase is authorized by this record.
