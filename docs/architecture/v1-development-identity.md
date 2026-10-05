# V1 development identity and permissions

This is a local development adapter for exercising UI Platform authorization. It is not production authentication or WP7. A browser selects one of the predeclared development emails; the server stores an opaque, `HttpOnly`, `SameSite=Strict` session containing only a stable I-AM User ID. The current I-AM User record and policy are consulted again for protected requests. Unknown email, inactive User, missing policy, stale authority and unrecognized application scope fail closed. `Public` means no authenticated User; it is not a Role or synthetic User.

## Enablement and trust boundary

Set `NODE_ENV=development` and `UI_PLATFORM_V1_DEVELOPMENT_IDENTITY=1` for the TypeScript source development server. The emitted server and production mode reject this adapter. The API server, Vite and the `scripts/dev.mjs` front server bind to loopback in this mode. The adapter refuses forwarded requests. The development login endpoint is `/api/development-identity/session`; `GET` establishes an anonymous CSRF-bound session, `POST` selects a predeclared email, and `DELETE` signs out. A login selection never accepts a client-supplied User ID, Role, Group, Permission Set or DOE actor. The editor session remains a subordinate revision/CSRF handle bound to the V1 User; its former fixture selector cannot switch identity in V1 mode.

By default, the dedicated policy authority is `UI_RUNTIME_DIR/iam-v1-development.sqlite`. `UI_PLATFORM_V1_POLICY_STORE` may set an absolute alternative. A fresh authority is seeded once through WP1 validation and audited activation. An existing authority must contain the V1 fixture Application, required Users and registered Permissions; the adapter never silently overwrites it. To reset a disposable fixture, deliberately choose a fresh development policy-store path. Do not point V1 at a production authority.

The development Application key is `v1-identity-fixture`, with permanent I-AM Application ID `dev-v1-identity-fixture`. Startup creates this clearly marked fixture if it is absent and refuses an existing directory with the same key but no matching fixture marker and Application ID. The fixture contains a Page and Form/Workflow artifacts for authorization checks. It is not a production Account, People or Financial component. Other Applications receive no implicit grants and their management APIs fail closed until separately provisioned. New Application creation and platform package administration have registered permissions but no seeded platform-wide administrator assignment.

For protected Dataset operations, enable the existing `UI_PLATFORM_WP5_APPLICATION_DATA=1` proxy and configure its existing loopback `UI_PLATFORM_WP5_DATASET_HOST_URL`. Set `UI_PLATFORM_V1_TRUSTED_UI_KEY` to a server-only key of at least 32 characters. The protected Data Services host must use the **same** I-AM policy-store file and set `identity.trustedUiServerKey` to that key, `identity.allowLegacyToken` to `false`, `identity.applicationId` to the V1 fixture ID and `identity.authorityId` to `ui-platform-development`. The browser sends only its V1 session cookie to UI Platform. UI Platform resolves the User and sends a short-lived, one-use HMAC assertion directly to the loopback Data Services host. The assertion binds User, Application, authority and a digest of the current complete I-AM policy snapshot. Data Services rejects altered, replayed, expired and mismatched-policy assertions, verifies the active User and then gives DOE the trusted actor context. DOE still applies WP4/WP5/WP6 security and ORM persistence. The fixed-User bearer remains available for earlier standalone development fixtures unless `allowLegacyToken:false`; it is never accepted from the V1 browser proxy.

## Authorization model

The seeded graph is `User → Role → Permission Set → Permission`. Email is an optional contact/login attribute on the canonical I-AM User; the permanent User ID does not change with an email edit. The development login allowlist is limited to the predefined User IDs. Application Admin, Security Admin, Page/Form Editor, Workflow Editor and Mixed Permissions are application-scoped Roles. A sixth combined editor holds two Roles. Viewer, Editor and Admin Permission Sets compose without direct User-to-set grants. Application Admin has application, Page, Form, Workflow, Presentation, artifact and application-package sets; it is not an evaluator bypass and does not imply Security Admin. Security Admin is separate. The registered atomic capabilities are enumerated by `managementPermissions` in the browser management API owner and have resource-kind metadata for a future Permission Set editor.

All existing browser management routes in the current UI server pass through a server-side I-AM check. The route inventory maps Application, Page, Presentation, package and platform-management operations to their owning capability. Artifact discovery and edits use the manifest's actual resource type, so a Page/Form editor does not thereby gain Workflow access. Unknown management routes have no implicit permission. The `/api/apps` list is filtered by the current User's application authority. Downloaded exports are bound to the requesting User, Application and a short expiry. Public health, template/component discovery and runtime-served active assets retain their existing public treatment; draft/management operations require authorization. UI controls are convenience only; direct requests are checked again. WP3 trusted security administration is not replaced by the fixture login, and WP1 activation is not exposed through the V1 editor.

## Development Users

| Email | Responsibility | Representative access |
| --- | --- | --- |
| `admin@example.local` | Application Admin | Fixture Application and component management; no Security Admin bypass |
| `security@example.local` | Security Admin | Security permission; no Page/Form edit |
| `page-form-editor@example.local` | Page/Form Editor | Page and Form view/edit |
| `workflow-editor@example.local` | Workflow Editor | Workflow view/edit |
| `mixed@example.local` | Mixed Permissions | Page and Form view/edit; Workflow, Application edit and Security Admin denied |
| `combined@example.local` | Combined editor | Page, Form and Workflow edit through two Role assignments |

The examples `account.*`, `people.*` and `financial.*` are intentionally absent because those production components are not present. Dataset permissions used in the integration test are explicitly test-only additions to the fixture policy and do not appear as production component registrations.

## Compatibility and deferred work

The original editor fixture flow and fixed-User Dataset host remain available when V1 mode is off, for WP1–WP6 regression fixtures. V1 mode uses the real I-AM policy and one browser identity. A new application requires an explicit I-AM provisioning workflow before its management APIs can be used; V1 grants nothing automatically to the creator. Application-level Security Administration activation remains governed by the WP3 trusted host, and no WP8 administration UX is introduced here.

Production IdP linking, passkeys, MFA, production sessions, distributed revocation, recovery, passwords/credential management, machine/API authentication and production identity linking remain WP7 or later. The development session map is in-process and intentionally short-lived; it is not a production session store. No deployment, migration or production cutover is performed by this task.
