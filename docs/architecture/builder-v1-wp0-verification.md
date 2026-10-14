# Builder V1 WP0 — Verification record

Date: 2026-10-14 (America/New_York). **BUILDER V1 WP0 — ACCEPTED AND CLOSED**. The user completed the architecture and verification review and accepted WP0, its 290/290 UI Platform tests, 747/747 Data Services tests, builds, typechecks and focused security/runtime evidence. Documented limitations are accepted WP0 boundaries; they do not claim completed WP3 or UI-only WP6 functionality. The next authorized planning target is WP1 — Application Workspace and Artifact Tabs. No later work package is begun by this closure.

## Results

| Verification | Result |
| --- | --- |
| Full UI Platform regression | 290 passed / 0 failed / 0 skipped; 1 worker, 15-second default test timeout |
| Full sibling Data Services regression | 747 passed / 0 failed / 0 skipped |
| Focused I-AM administration suite included above | 39 passed, including provisioning, one-time setup, ceiling, audit rollback and last-Platform-administrator checks |
| UI Platform build and typecheck | Passed |
| Sibling full build and workspace typecheck | Passed |
| Final isolated Dataset-bootstrap guard | Focused WP0/owner/DOE-boundary rerun recorded in verification.json |
| Whitespace validation across both repositories | Passed |

Machine-readable suite summaries are in [verification.json](evidence/builder-v1-wp0/verification.json). The final generated Application/Dataset/Field/Workflow identities, qualified activation/publication/serving evidence, actor-bound administration audit and successful Workflow result are in [acceptance.json](evidence/builder-v1-wp0/acceptance.json). The test environment is disposable; its Applications, processes, policy file and data storage are cleaned up. No user's real deployment authority was automatically selected or granted.

## WP0 evidence

`tests/builder-v1-wp0.test.ts` starts the ordinary TypeScript management server against an isolated copy of the existing authoritative V1 development policy contract. It performs explicit trusted local Platform setup, with separate creator, Platform security administrator and Application security administrator selections. Both Applications are created through the normal creation API using the real Standard template, dependency installation, service build and permanent ID issuance. No new Application, data resource, Workflow or business role is security-fixture-seeded.

The test proves:

- New source has no automatic creator access. Unauthorized onboarding is rejected. Explicit first-Application provisioning and later role activation use protected WP3 paths and durable actor-bound audit.
- A separate new permanent Dataset/Field identity belongs to the new Application. Schema publication, the real ActivationController's CRUD health sequence/receipt, qualified serving verification and AppliedResourceRegistry binding succeed.
- The same signed-in development User reads actual persisted records, commits a permitted insert, and is denied a protected-field update with byte-for-byte unchanged storage.
- The host-approved permanent Workflow ID requires a current invocation permission and performs a real protected persisted update. An unrelated User and unknown Workflow are rejected.
- Crafted actor, bearer and Application-authority overrides, unknown/foreign Dataset IDs and cross-Application security owner capture are rejected. A second normally created Application remains inaccessible to the creator without an explicit grant.
- Normal managed preview starts the new Standard Application, serves its actual HTML, and forwards authenticated Dataset reads and a successful protected Workflow write through its own preview port.
- Role revocation immediately denies subsequent Workflow and write admission, preserving storage. Replaying first-scope provisioning or local setup cannot restore authority.
- Source-created/authority-required/runtime-required/ready/failed-incomplete states are observable. Correcting the reviewed host connection restores readiness without recreating identity or granting policy.

`tests/development-application-registry.test.ts` additionally covers unregistered/copied manifests, immutable identity, duplicate capture, traversal, disabled Application ownership, authoritative revision changes and reopening the durable owner ledger. Existing V1 identity/session, management routes, fixture, security, production-exclusion, DOE-only boundary, Form, Workflow, composition, artifact and stabilization suites pass in the full regression.

Sibling `wp3-administration.test.ts` tests unauthorized/forged contexts, unknown/mismatched/stale owners, expiring/future anchors, self-grants, business-grant injection, foreign scopes, undelegated permissions, extra records, duplicate/competing provisioning, durable reopening, failed audit rollback, setup proof/User/development guards, bootstrap replay, refusal to invent legacy administrator use, and last-Platform-administrator preservation, alongside the accepted WP3 regressions.

## Commands and environment

Final commands used from the respective repositories:

```text
UI Platform:
npm run build
npm run typecheck
npm test -- --maxWorkers=1 --testTimeout=15000 --reporter=json --outputFile=C:/Projects/Modular/.wp0-ui-review-results.json
npx vitest run tests/builder-v1-wp0.test.ts tests/development-application-registry.test.ts tests/wp5-dataset-boundary.test.ts --maxWorkers=1 --testTimeout=15000 --reporter=json --outputFile=C:/Projects/Modular/.wp0-ui-targeted-review-results.json

Data Services:
npm run build
npm run typecheck
npm test -- --reporter=json --outputFile=C:/Projects/Modular/.wp0-sibling-review-results.json
npm run build --workspace @ui-platform/dataset-operations
npm run typecheck --workspace @ui-platform/dataset-operations

git diff --check (both repositories)
```

`TEMP` and `TMP` point to the explicitly writable `C:/Projects/Modular/.wp0-test-temp`. Restricted initial regressions failed on temporary-file rename and local HTTP access; approved local execution was required. A local package link operation also required approved Windows symlink access. No automatic approval rejection occurred.

Earlier broad UI runs caught a direct-ORM dependency boundary violation, optional draft-reason JSON serialization, a doubled preview slash and missing per-preview origins. These were fixed in the implementation; assertions were retained. Heavy parallel UI runs also had build-test timeouts; the final suite uses one worker and the repository review's previously used 15-second default. A temporary diagnostic established an exact one-millisecond cross-process future timestamp as the intermittent assertion failure. Issuance now subtracts 100 milliseconds; receiver validation was not relaxed. Temporary diagnostic code was removed. Windows preview child cleanup was corrected and test-owned processes are stopped by exact process-tree identity.

## Scope and limits

The architecture/runbook is [builder-v1-wp0-development-onboarding.md](builder-v1-wp0-development-onboarding.md); exact changed files are in [builder-v1-wp0-files.txt](builder-v1-wp0-files.txt). Current evidence is a real API/host/managed-preview integration journey, not a browser-recorded UI-only authoring journey. Headless local Dataset/Workflow preparation is disclosed in the evidence provenance and remains distinct from later Builder UI work.

One configured applied Dataset is served per protected host. Unsupported foreign exact-Dataset references fail closed when that host lacks their authoritative owner catalog. Severe owner-store I/O failures and failed activation journals require explicit operator recovery; no automatic adoption or reseeding is introduced. New service/external-side-effect approval paths, production WP7, Publish/deployment/export changes, Workspace implementation and WP1 were not begun.

**BUILDER V1 WP0 — ACCEPTED AND CLOSED**
