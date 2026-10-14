# Builder V1 WP0 — Development onboarding review

Date: 2026-10-13 (America/New_York). **BLOCKED before implementation. WP0 is not ready for review or accepted.**

## Controlling decisions

The user authorized a separate applied development Dataset owned by the new permanent Application ID, mandatory protected Workflow invocation, focused sibling changes where necessary, and explicitly documented controlled bootstrap. No automatic creator grants, fixture-owner reuse, production identity, or later Builder work is authorized. The user also instructed work to stop at a specific required sibling repository that is unavailable or not writable.

## Discovered prerequisite blocker

I-AM is located at `C:/Projects/Modular/UI Platform Data Services/packages/i-am`, as established by UI Platform's `package.json` dependency and the sibling package exports. Its accepted protected administration entry is `SecurityAdministrationService` in `packages/i-am/src/wp3/service.ts`.

That entry currently cannot create the first Application security scope:

1. `activate()` resolves the requested Application against the **before** snapshot. `target()` only accepts an already active `application-security` record. A new Application target therefore returns `ADMIN_TARGET_INVALID`, before platform fallback authorization is attempted.
2. Targeting the platform instead does not solve this: `checkChange()` requires every changed record's Application ownership to equal the request's `applicationId`. A new Application-owned security record does not equal platform scope (`null`), so this route rejects it with `ADMIN_OWNERSHIP_DENIED`.
3. `recover()` restores only a Role assignment or Group membership for an existing Application security record; it cannot create that record.
4. WP3's durable store protection rejects WP1 activation without administration audit (`ADMIN_GATE_REQUIRED`). Creating active definitions with the open fixture seeder instead of this gate would bypass the accepted administrative checks. The controlled-bootstrap authorization does not justify that substitution.

A narrow owner-attested first-Application onboarding contract is needed in the existing I-AM administrative service. It must check existing trusted platform security authority, validate the new permanent Application against its owner, preserve grant ceilings and self-escalation protection, establish the required non-expiring administrator anchor explicitly, and commit through existing policy activation/audit. Application creation and this security operation remain separate steps; no whole-onboarding atomicity is implied. This is a proposed prerequisite, not an implemented API or approved relaxation of security rules.

The sibling checkout's source is readable but it is outside this session's writable roots. Those roots cover UI Platform and the conversation's visualization directory only. A sibling Git status attempt also returned `Permission denied`; no sibling edit was attempted. Per the user's explicit stop instruction, work stops at this prerequisite. No replacement authorization implementation was added in UI Platform.

## Infrastructure inspected for reuse

| Area | Existing implementation / finding |
| --- | --- |
| Normal creation / immutable ID | `src/server/applications.ts:createApp` generates a permanent UUID, copies Standard, installs dependencies, builds services, and renames the prepared directory. `app-manifests.ts` owns the manifest. No security assignment occurs here. |
| Development sessions / management evaluator | `v1-development-identity.ts` uses stable I-AM Users, server cookies, origin/CSRF boundaries, attested requests, and current policy reads. Its management resource adapter and editor authorization still admit only the fixture Application. |
| Normal API management | `index.ts` hardcodes fixture key/ID eligibility; `v1-management-routes.ts` separately maps platform and Application permissions. Eligibility must be registered and owner-checked before this restriction is generalized. |
| Explicit security activation | I-AM WP3 service enforces evaluator decisions, grant boundaries, ownership, last-admin continuity, and durable audit. The existing fixture policy is WP1-seeded; it is not a general new-Application administrative contract. |
| Protected proxy | `application-data-proxy.ts` resolves the session User and signs a one-use server assertion with Application, authority, and policy digest. `index.ts` supplies the fixture Application ID. Generalization must resolve an explicitly registered Application and its host configuration server-side. |
| Applied resource ownership | Sibling `secured-development-host.ts` uses `AppliedResourceRegistry`, `QualifiedAppliedResolver`, canonical schema publications, and serving attestation. Management registration must not replace this authoritative Dataset ownership check. |
| DOE / ORM | The existing secured development host assembles I-AM evaluation/plans, protected DOE, Trigger registry, and JSON ORM. Its manifest accepts a permanent Application ID and requires it to match the applied pin. No second engine is needed. |
| Preview / Standard | `preview.ts` starts the normal Application development command with ports/base. Standard Vite has composition/visual plugins but no protected-service proxy configuration. Integration remains unimplemented. |
| Workflow / services | The protected host has a host-owned Workflow extension; the UI proxy already forwards Workflow intent. Approved implementations/secrets must remain host-owned. Application-specific availability and a successful protected invocation remain required and unverified. |

The four approved Builder planning documents and accepted I-AM reports were consulted; some combined report reads were truncated. This record describes inspected implementation contracts, not completion of the entire required architecture review or a runtime demonstration.

## Remaining contracts and recovery

After the prerequisite is resolved, onboarding must expose source-created, authority-required/configured, runtime-required, ready, and failed/incomplete states based on actual completed operations. Authorized retries must preserve the permanent ID and cannot reassert revoked grants. Readiness must require the correct applied Dataset owner and connected approved host/services, rather than a directory or Dataset source file alone. These states and their management path have not been implemented.

Acceptance must document the newly generated Application ID, its separate Dataset ID, publication/application/serving evidence, trusted assignments and activation audit, configured Workflow/service identity, and bootstrap commands. None has been created in this blocked pass. Builder Dataset authoring (WP3) and UI-only acceptance (WP6) remain untouched.

There are no architectural implementation deviations: no runtime code was changed. The necessary next action is to make the sibling checkout writable in the session and resume the narrow I-AM prerequisite plus the remaining WP0 integration and tests.
