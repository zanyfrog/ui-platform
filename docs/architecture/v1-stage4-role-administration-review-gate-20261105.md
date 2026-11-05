# Stage 4 Implementation Review Gate — blocked by preservation discrepancy

November 5, 2026. Baseline `86380f6430fcc4eea1a4d31c55a1951749707f9f`. **Stage 4 is not accepted or closed. No commit or push. Overall V1 remains open.**

## Stop condition

At the preservation check, the original lock `components/.uib/locks/236dfbe257a229da85d588f4f851f4ea1e72efefbe5565e69e305f0d6f69602d.lock` was absent. A read-only host-side check at **09:54:27 Eastern, November 5** confirmed `Test-Path=False`; the locks directory had no entry and quarantine contained no matching lock. `preservation.json` records the observation. The accepted historical content hash was `9C1EA1A0CF2D1F07973EC0F060882227072E23A4306074525790EE917CCC3D72`; it is historical, not a new measurement.

**Attribution is unknown.** No lock-state snapshot was captured at Stage 4 startup, so neither removal time nor writer can be established. This run used existing regression/library paths as well as isolated fixtures. Their incidental lock behavior has not been attributed, and external activity has not been excluded. No explicit lock recovery, removal or replacement command was issued. No claim that the lock was preserved can be made. Implementation/test work stopped when absence was observed; no recreation, reacquisition or repair followed.

Affected requirement: preservation of the existing shared Component lock and its unresolved qualification. Smallest next step: explicit owner disposition of this newly observed absence, optionally a separately bounded read-only provenance investigation. Do not restore a historical PID, create a replacement lock, recover the lock or resume Component operations implicitly. The old documentation/Git synchronization exception does not resolve this new discrepancy.

## Implemented scope

- A role administration panel in the existing development administration chrome: protected state refresh, existing active users/application roles/scopes, initial administrator provisioning, staged assignment/revocation, exact operation review, activation and feedback.
- Existing role definitions and permission-set metadata are reused. Names confer no authority. Onboarding keeps the accepted admin-only five-record contract; functional role bundles and explicit platform-owned ceilings remain separate configuration, not inferred from titles. Test setup installs its explicit Application Administrator, Editor and Viewer bundles through protected staging/activation; its Platform Administrator has explicit create authority.
- New protected `/security/roles`, `/security/assign` and `/security/revoke` adapters use the existing I-AM store and WP3 activation API. Grant ceilings, self-escalation rules, current-policy checks, ownership and last-administrator protection remain authoritative in I-AM. No I-AM/Data Services source change was needed.
- UI mutations pin the loaded permanent Application ID. Session/policy changes during the administrative gate fail closed; activation remains subject to WP3's current transaction checks. Changing role/user/scope/reason invalidates the local candidate.
- The existing broad `pages`/`v1-form` discovery gates blocked exact-resource Editors. Builder and visual workspace responses now filter Pages by permanent-ID authority; direct saved-Page reads/writes use the stored ID when broad authority is absent. Explicit application navigation permits reaching the existing generic per-artifact Form filter. Unassigned Page/Form sources remain excluded. Existing broad grants and native admission are retained.

## I1–I5 evaluation

| ID | Verified local evidence | Qualification |
| --- | --- | --- |
| I1 | Explicit Platform Administrator create grant creates fresh applications and permanent IDs. Creation gives no automatic application read. Application Administrator and anonymous create attempts are refused. | Fixture identities and local provisioning; production sign-in and independent operational/data qualification are not claimed. |
| I2 | Browser provisions the initial administrator, assigns and revokes roles, refreshes protected state, and verifies assignments through another administration session. Foreign application/scope and original-application-ID mismatches are refused. Actual WP3 activation returns `ADMIN_GRANT_CEILING`, `LAST_ADMIN_REQUIRED`, and stale `REVISION_CONFLICT` refusals. Browser screenshots show the ceiling/last-admin feedback. | Functional roles/ceilings are explicit trusted fixture setup. Actual publishing is re-exercised in the preserved Stage 3 physical-target regression, not production. |
| I3 | Browser Editor opens the assigned Page, edits through controls, saves/reloads; direct assigned Page and Form updates succeed. Unassigned Page reads fail and the unassigned Form is excluded. Editor shared edits, Publish and role administration are refused. A browser already open as Editor receives 403 after revocation. | Existing Form/DOE integration regressions also pass. No new shared-edit grant UI or role inheritance is introduced. |
| I4 | Authenticated Viewer fixture has no management grants: application source/export, uploads, Publish and role administration are refused; an intentionally public presentation asset returns 200. Existing signed-in-User DOE/ORM permission regression passes independently. | Authorized private runtime content/data/thumbnail/range/field/row reader scenarios are **not newly qualified by this Stage 4 test**. Production identity/runtime/private-byte portions remain Stage 5. Do not label the entire future production I4 row passed. |
| I5 | Signed-out management/source/asset-management requests and creation are refused; intentionally public presentation asset bytes return 200 without a privileged principal. No anonymous Role assignment is created. | This is a development management/public-asset boundary. Public production site, private static bypass/cache/range and production anonymous data enforcement remain unverified Stage 5 work. |

Preservation is **blocked**, regardless of functional passes. No I1–I5 overall production acceptance or Stage 4 acceptance is asserted.

## Evidence and verification

`evidence/v1-stage4-20261105/results.json` is the final audited Role Administration browser/direct-endpoint run. `protected-results.json` records the actual permanent application/assignment IDs and refusal results. `administration-audit.json` records actual WP3 administration events and before/after digests; the test asserts matching assignment and revocation audit entries. Denied requests are evidenced by their protected responses; no durable denied-event collection or retention claim is made.

Screenshots: `assignment.png`, `assigned-editor.png`, `grant-ceiling-refusal.png`, `last-admin-refusal.png`, `revocation.png`. They use disposable local fixture identities. Reasons, role grants, policy scopes and candidate checksums are review metadata, not credentials. No real user/application security state was intentionally changed; fixed development identity IDs are freshly seeded in disposable policy stores, not new production identities.

- Administration, editor security, Page/Form/DOE and Stage 1–2 regression group: **62 passed, 1 existing skip** (`regressions.json`). The initial restricted-network run failed to connect to loopback; its authorized rerun passed.
- Final authority/pinning group: **7 passed**, including the Role Administration journey and existing pilot/Page/Form/DOE tests (`final-results.json`). This overlaps the larger regression group.
- Audited Role Administration rerun: **1 passed** (`results.json`), covering the same journey plus actual WP3 audit correlation.
- Stage 3 current-source physical-target browser regressions: **2 passed** (`asset-regression/results.json`), covering upload/selection/Save/Reload/decoded Preview, publication, frozen bytes, replacement, rollback and retained Presentation form. `scripts/verify-stage4-assets.mjs` reuses the accepted Stage 3 preparation/tests, redirects all evidence, avoids copying original Component `.uib` metadata, verifies physical package inputs, and removes its generated test files. Its input digests and package manifests are retained. No normal workspace package links are replaced.
- Server typecheck passed. Broad client typecheck reports the same six missing declaration imports from UI-Base fixture/native-preview modules; no new administration diagnostic was reported. Existing Data Services sourcemap warning remains.

## Repository boundaries and inventory

No UI-Base or Data Services source edits were made; their worktrees were clean at read-only verification. All **234** installed package files recorded by the accepted Stage 3 manifest still match their SHA-256 values (`installed-package-preservation.json`). There is no package manifest/lockfile or dependency installation replacement. Existing HTML-first persistence, native component admission and protected asset transport remain unchanged.

The Stage 2 regression regenerated two accepted evidence files; those were restored byte-for-byte from HEAD. Disposable platform/package trees and raw regression diagnostic attempts are ignored. No tracked shared-lock file was edited, but its actual absence remains an unresolved preservation discrepancy. The repository's accepted historical evidence and source files must not be mistaken for proof of current lock preservation.

`changed-file-hashes.json` lists exact Stage 4 source, tests, script, documentation and retained evidence with SHA-256 values, excluding its own self-referential hash and ignored disposable trees. No Git staging, commit or push was performed. No Stage 5 implementation or production-readiness claim.

**Stopped at the Stage 4 Implementation Review Gate with the preservation blocker above. Further implementation/testing requires disposition of the missing-lock discrepancy.**
