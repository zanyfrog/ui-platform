# Builder V1 WP0 — Development Application onboarding

Date: 2026-10-14 (America/New_York). Implementation complete; final verification recorded separately. WP1 has not begun.

## Authority and persistence

The prerequisite checkout is now writable. First-Application provisioning lives in the existing sibling `SecurityAdministrationService.provisionApplication`, rather than a replacement authorization path in UI Platform. It accepts a staged candidate plus the explicit existing administrator User and assignment IDs. A trusted creation ledger attests the permanent Application identity and owner both before authorization and inside serialized activation.

The only policy authority is the existing I-AM `SecurityDefinitionStore`: SQLite with WAL, `synchronous=FULL`, revision comparison, `BEGIN IMMEDIATE` activation, and policy plus administration audit committed together. UI Platform, management evaluation, WP3 administration and protected hosts share its exact file. Its default is `C:/Projects/Modular/.ui/iam-v1-development.sqlite`; `UI_RUNTIME_DIR` changes the `.ui` root, and `UI_PLATFORM_V1_POLICY_STORE` explicitly overrides the policy file. Source: `paths.ts`, `index.ts`, and `v1-development-identity.ts`. Runtime connections reject a different real policy-store path.

The pre-existing trusted initializer is `seedV1DevelopmentPolicy` in `v1-development-policy.ts`. It initializes known development Users, the identity fixture, capability definitions, sets and roles in an empty authority; its existing compatibility migration is unchanged. It does not establish Platform security administration or an Application creation grant. Its Platform Manager role is distinct from security administration. Once WP3 protection is enabled, ordinary WP1 activation is durably rejected without administration audit, including after reopening the store.

`development-applications.sqlite` is an owner/creation ledger, not a policy store. Its unique key/ID entries record successful normal creation and the admitted creator. A copied manifest alone never registers an Application. Identity changes, disabled settings, unknown IDs, duplicate registration, traversal and redirected paths fail closed. Management resources read this ledger; Dataset/Field ownership remains exclusively in Data Services' `AppliedResourceRegistry` and qualified applied-schema resolver.

## Explicit one-time local Platform setup

The existing V1 policy has no Platform security administrator. The new `initializeDevelopmentPlatformSecurity` is a development-only trusted initialization path alongside WP3. Its host-supplied setup boundary must prove a distinct setup capability, deployment and operator. There is no browser setup endpoint. The local command `scripts/bootstrap-development-security.ts` creates the opaque setup handle inside the operator's OS process, requires an explicit existing User, reason, grant ceiling and legacy anchor selections, and refuses a missing policy file. It never derives authority from a display name, email label, creator or environment flag alone.

Setup stages definitions and activates them through the existing durable store transaction with mandatory administration audit (`initialize-platform-security`). It creates a separate Platform security capability, its admin-only Role/Set, the selected non-expiring assignment, and an explicit platform-owned Grant Boundary. New host capability definitions, if needed, must be explicitly listed in the reviewed local input and included in the requested ceiling. Ordinary business-use permissions are not added to the selected Platform administrator.

The durable setup audit marker, and a pre-existing Platform security capability, both cause subsequent setup to fail closed. Startup never repeats setup or restores revoked grants. Existing valid Application anchors must survive. The legacy identity fixture lacks a WP3 grant boundary; explicit repair can add an admin-only path only for a selected User who already has current, unconditional, non-expiring administrator use in that fixture. It cannot invent a legacy Application administrator or expand that User's business access. The new Application contract uses `ui.application.security.admin`, separately from ordinary `ui.application.admin`.

Ordinary WP3 activation now also prevents removal of the last valid non-expiring Platform security administrator, in addition to its existing Application last-administrator, ceiling, ownership and self-escalation checks. Broader production assurance and recovery-provider integration remain deferred to production WP7.

## First Application scope

Provisioning is a separate authorized operation after source creation and after Platform setup. The candidate must contain exactly five new active records: the Application security record, an Application-owned admin-only Permission Set and Role, the explicit non-expiring User assignment, and its platform-owned Application-scoped Grant Boundary. The administrator capability must already exist as an active Platform permission. No User creation, business grants, imported sets, Service approvals, old-record edits or cross-Application ownership are accepted through this exception.

The existing evaluator authenticates an already-authorized Platform security administrator. Activation reuses WP3 graph validation, transitive grant ceilings, delegated-operation ceilings, self-escalation protection, all Application anchors, the Platform anchor and durable audit. The chosen owner proof is checked again inside the transaction. Unknown/inactive Users, unknown/mismatched owners, existing scopes, duplicate or competing creation, future/expiring anchors, unauthorized actors, self-grants and above-ceiling permissions are rejected. A failed audit insert leaves the policy, revision and scope unchanged.

Application creation grants nothing. Management, business-data and Workflow roles are explicitly staged and activated afterward through the same service. The test creator is denied access immediately after normal creation and gains only explicitly reviewed permissions later.

## Management and runtime integration

Enable `UI_PLATFORM_V1_DEVELOPMENT_IDENTITY=1`, `UI_PLATFORM_BUILDER_WP0=1`, and `NODE_ENV=development` in the TypeScript development server. WP0 refuses a production/built runtime before constructing its creation ledger. Existing fixture behavior remains available without the WP0 flag.

Normal creation uses the existing Standard template installation, service build, permanent UUID and final rename, then records the authoritative owner. Registered IDs replace fixture-only eligibility for management, editor authorization and export ownership. Existing V1 cookies, local-address restrictions, origin checks, live User checks, attested requests and policy revisions remain in use. Administration also requires the session CSRF token and rechecks its live revision/User/expiry across asynchronous authorization.

Protected administration endpoints:

- `POST /api/platform/security/stage` and `/activate`: already-authorized Platform security administration.
- `GET /api/apps/<key>/onboarding`: authorized status without side effects.
- `POST /api/apps/<key>/onboarding`: explicit first administrator selection, reason and CSRF token; uses first-scope provisioning.
- `POST /api/apps/<key>/security/stage` and `/activate`: scoped trusted role administration; the authenticated User is taken from the server session, never the request body.

A reviewed local `UI_PLATFORM_BUILDER_HOSTS_FILE` lists Application ID/key, loopback host URL, server-only assertion key, the shared policy path, Dataset ID and approved Workflow IDs. It lives outside Application source and portable exports. It cannot register resources or grant security authority. The scoped proxy `/api/apps/<key>/application-data/{queries,operations,workflows}` resolves the registered owner and this configuration on every request. Browser actor/bearer/authority input is rejected. The existing one-use HMAC assertion binds the current User, Application, authority and live policy digest. Windows cross-process clocks were observed differing by one millisecond; the issuer now timestamps 100 milliseconds conservatively early, shortening the existing 15-second lease without relaxing future-time or replay rejection.

The sibling host retains the existing protected DOE, planner, evaluator, Trigger registry and ORM. Management ancestry is composed through a trusted read-only adapter with a combined bounded revision digest. Management metadata cannot resolve or replace Dataset/Field/Record ownership. The host's Workflow catalog is local configuration; a configured Workflow ID and current invocation permission are mandatory before execution. The Builder host uses the existing AutomationRuntime and source stores, inherited User execution and protected Dataset CRUD only. Arbitrary/external services and service credentials are not supplied by Application source.

Authenticated host readiness binds the applied Dataset and returns publication/serving evidence plus currently available approved Workflow IDs. The Builder adapter verifies enabled Workflow source, Application/Dataset ownership, diagnostics and supported action availability before reporting readiness or executing it.

Standard Page/Form services now use the Application-qualified endpoint for both Dataset operations and Workflow invocation. Standard Vite forwards `/api` to the management server. Normal managed preview registers only that Application's server-created preview origin and preserves the browser hostname for cookies. Both protected Dataset reads and successful Workflow writes are tested through the ordinary preview port. Windows preview shutdown stops and waits for its process tree.

## Controlled development Dataset bootstrap and recovery

`scripts/bootstrap-development-dataset.ts` calls the sibling `bootstrapDevelopmentDataset` with a reviewed local schema plus independently authored ORM registration. The owner must already be registered by normal Application creation. The sibling uses SchemaManager publication, the real ActivationController, fresh-reader insert/update/delete health probes, durable health receipts, qualified verification and AppliedResourceRegistry binding. It never fabricates an Applied state file and never writes security storage. Schema probes are explicit local owner setup against the new isolated development Dataset; ordinary runtime writes remain protected DOE operations.

Creation, security provisioning, Dataset activation and runtime connection are separate operations, not a whole-onboarding transaction. Status exposes `sourceCreated`, `authorityConfigured`, `runtimeConnected`, and `authority-required`, `runtime-required`, `failed-incomplete` or `ready` from actual state. Missing host configuration requires connection; invalid configuration or unavailable/unqualified hosts produce failed/incomplete diagnostics. Authorized correction/reconnection preserves the permanent ID and existing policy. Replaying setup or first-scope provisioning cannot reassert revoked access. A failed Dataset activation retains controller journals/owner/evidence and requires the existing explicit Data Services recovery procedure; automatic retry or fabricated recovery is not introduced. A creation-ledger I/O failure is an operator repair condition, not permission to adopt an arbitrary folder.

## Local operator procedure

1. Start the existing V1 development server once to establish its existing User/capability fixture in the authoritative policy file. Enabling WP0 also protects that file through WP3.
2. Review a local setup JSON file containing `administratorUserId`, `reason`, `grantablePermissionIds`, optional `capabilityDefinitions`, and explicit `applicationAnchors`. Choose existing immutable User IDs deliberately. For the legacy fixture, select an existing non-expiring administrator-use holder; the command validates this. Run `node --import tsx scripts/bootstrap-development-security.ts --input <reviewed-setup.json>` with `NODE_ENV=development` and the same runtime/policy settings as the server. Repeated setup is rejected.
3. Under that administrator's trusted V1 session, explicitly activate a separate creator/manager's scoped role if needed. Create an Application through the normal API/manager. Select its initial security administrator explicitly through the onboarding API. Grant only reviewed management/data/Workflow roles through protected stage/activate operations.
4. Use the reviewed local Dataset input with `node --import tsx scripts/bootstrap-development-dataset.ts <input.json> <new-output.json>`. The input identifies `applicationKey`, isolated absolute `root`, schema with new permanent IDs, and independent registration. The output contains the pin, paths, serving fingerprint and controller evidence; output refuses overwriting an existing file.
5. Compose a trusted Builder host file from that output, the same `paths.policyStore`, inherited identity with `allowLegacyToken:false`, server-only key, operation/field permission catalog, approved `workflows` and host-owned `automation` roots, plus `management.registryFile` and `management.applicationsRoot`. Run `node --import tsx scripts/builder-development-host.ts <host.json>`. Add its reviewed connection to `UI_PLATFORM_BUILDER_HOSTS_FILE`, then inspect onboarding status and use normal managed preview.

No actual user deployment authority was silently selected or modified during implementation. The acceptance harness explicitly selects existing development Users in a disposable environment. Its provenance and exact generated IDs are in `evidence/builder-v1-wp0/acceptance.json`.

## Boundaries retained

This is development-only WP0. It supplies headless onboarding/owner/runtime adapters and normal-preview wiring; it does not claim UI-only onboarding or the WP6 reference journey. Dataset design/apply UI, Workspace tabs, autosave, Undo/Redo, Problems, focused test isolation, production identity/deployment, Publish, export-format work and WP1 remain outside this work. No second authorization evaluator, schema store, data engine, Workflow registry or portable credential path was added.

Each protected host serves one configured applied Dataset. The current evaluator conservatively validates all of a User's policy resource references: a foreign exact-Dataset grant whose authoritative owner is unavailable to that host fails closed. Application-scoped development grants and independently owner-verified local Dataset access are covered here; federating foreign Dataset catalogs is not claimed. Recovery from severe owner-store I/O failure remains explicit operator work. These limits do not relax cross-Application ownership or authorization.
