# Stage 5 Integration-Readiness Final Review Gate — predicate contract decision

Historical stop record: the subsequent bounded WP3 contract authorization permits the extension identified here. See [the current implementation review gate](v1-stage5-wp3-integration-final-review-gate-20261105.md); the diagnostic and stop conclusions below describe the earlier unextended contract.

**STOPPED: a transaction-bound WP3 contract extension needs separate approval. The approved production adapter is not implemented. The resumed integration journey has not passed or resumed. Stage 5 and overall V1 remain open.**

The predicate-template authorization was read in full. Its stop condition applies: do not reinterpret existing grant ceilings or change accepted security semantics; return the exact required contract change if the current contracts are insufficient. No Data Services or UI-Base source change, development predicate relaxation, policy seeding, registration, commit, push or deployment occurred in this continuation.

## Verified contract limit

The actual I-AM `AdministrationScopeAuthority.permitsPredicate` interface accepts only `(templateIds, predicate)`. `boundaryAllowsRule` passes exactly those two arguments. It does not pass the rule effect, permission, rule/assignment scope, administrative boundary identity, actor or current owner/schema binding. Therefore a finite callback that matches the exact permanent-field equality expression cannot itself distinguish the authorized **deny** rule from an **allow** rule using the identical expression.

`tests/stage5-predicate-contract.test.ts` executes the existing compiled I-AM graph function in a verified physical copy. Its narrowly matching probe callback accepts both rule polarities and receives identical two-argument calls; changing the boundary identity also remains invisible to that callback. Unknown-template and wrong-field inputs are refused by the probe. The unchanged accepted development adapter still refuses the predicate. This is a passing **structural diagnostic**, not an approved adapter, successful WP3 activation or production-security pass. All locators in this diagnostic are synthetic; the earlier real inventory publication/schema evidence remains in the integration package.

There is a second limit in `SecurityAdministrationService.checkChange`: proposed `grant-boundary` permissions are converted to synthetic allow rules containing `permissionId` and `scope`. Their `predicateTemplateIds` are not carried into those rules or checked against the delegating boundary's template IDs. This observation comes from source inspection, **not** a new successful WP3 delegation exploit test. The new authorization requires explicit template delegation to remain inside the caller's ceiling; adding that missing enforcement would define behavior the current contract does not provide.

An HTTP precheck can inspect full rules, but it is not a replacement for a transaction-bound WP3 hook: staged candidates can have other entry points, and current schema, registry revocation and template delegation must remain binding during activation. No external template ledger is being treated as implicit permission to bypass WP3 or make an empty template-ID ceiling sufficient. No context is hidden in template strings or ambient mutable state to work around the interface.

## Exact proposed contract change for approval — not implemented

Limit changes to Data Services `packages/i-am/src/wp3/types.ts`, `graph.ts`, and `service.ts`, plus focused tests and corresponding generated output in disposable builds:

1. Add a host validation contract receiving the **full SecurityRule**, actual granting boundary/permission entry and optional assignment scope. Invoke it from `boundaryAllowsRule` while WP3 evaluates the live before/after policy during serialized activation. Pass data as explicit arguments. Existing evaluator and Dataset predicate execution semantics remain unchanged. For the production adapter, missing rule/boundary context must reject a templated rule.
2. Add a transaction-bound template-delegation validation contract when creating/editing/revoking a grant boundary. Pass the authenticated actor's actual administrative paths/ceilings, previous and proposed permission entries, target boundary identity and scope. Require explicitly approved template IDs and prevent copying a template outside its authorized boundary/application/Dataset/schema. Application Administrators may not mint IDs. This check is additional administrative grant-ceiling enforcement and needs explicit approval; it must not be silently inferred from an unfiltered permission grant.
3. Provide a host-owned current binding/revision assertion usable in staging and inside activation, covering the template registry revision/revocation and canonical applied-schema identity. Define stale-binding refusal and audit behavior. Do not resolve arbitrary async owner state by weakening the serialized policy gate. Specify compatibility explicitly: the accepted development adapter stays predicate-denying; older non-template flows retain their behavior; an unconfigured production template authority fails closed.

The UI Platform adapter can then bind the finite registry entry to the actual disposable inventory Application/Dataset, authoritative permanent `name` field ID, exact applied schema identity, `dataset.read`, **effect=deny**, `eq(field(nameId), literal("Hidden"))`, exact administrative boundary and approved assignment scope. Registration/revocation must require authenticated current Platform Administrator authority and retain audit records. No alternate operator, literal, field, polarity, application, schema or unknown template is admitted.

Approval is requested for these specific WP3 contract/enforcement additions. It would not authorize a general predicate language, a new evaluator, unrestricted row-policy creation or production deployment.

## Evidence, inventory and remaining qualifications

See `evidence/v1-stage5-integration-20261105/predicate-contract/inspection.json` for exact Data source hashes, physical probe location, source/package preservation checks and the diagnostic result. `predicate-contract/tests.json` records the single passing structural diagnostic. `changed-file-hashes.json` covers the current source/test/document and sanitized evidence inventory. Temporary application stores, sessions, certificates and disposable copies remain excluded.

The earlier regression result remains **42 passed, 1 existing skip, 1 failed integration journey at ADMIN_GRANT_CEILING**. Those tests were not rerun or relabeled after this read-only contract diagnosis; no runtime implementation changed in this continuation. The earlier publication/draft screenshots and frozen hashes remain valid within their stated scope.

| Criterion | Current local disposition | Production qualification |
| --- | --- | --- |
| P1 | Prior fixture security checks; authoritative identity adapter not fully integrated | Live Auth0/MFA/provider lifecycle pending |
| P2 | Prior session/mTLS checks; new cross-process workflow incomplete | Real HTTPS/Caddy, provider sessions and service custody pending |
| P3 | Actual inventory publication/applied inspection; A selection retained after draft B | Resumed protected browser execution and target qualification incomplete |
| P4 | Prior import/route checks | New complete process journey and independent Ubuntu identities/ACLs pending |
| A3 | Prior private transport tests; new owner integration unverified | Private owner/browser/export/storage qualification incomplete |
| I1 | Prior actual local provisioning/onboarding | Production identity/enrollment pending |
| I2 | Existing WP3 refusal preserved; callback context limitation demonstrated | Exact contract approval, finite adapter and delegation tests required |
| I3 | Prior Editor Dataset/Form/Page and separate Publisher progress | Existing production/shared-scope qualifications retained |
| I4 | Real Viewer row-policy activation remains blocked | No new row/field-filtered browser pass |
| I5 | Prior public/route negatives only | New full public/runtime journey and target proxy/cache pending |
| I6 | Revocation adapter code remains incompletely integrated | No new cross-process role/User-disable/private-session pass; provider disable pending |

The prior operator-readiness requirements remain: Auth0 plan/tenant/region/MFA/user counts and quote, exact HTTPS domains, Ubuntu host sizing/access, independent service credentials/custody, and real release/schema/private-asset ownership. No procurement or real-environment qualification starts at this gate.
