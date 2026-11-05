# Stage 4 Final Implementation Review Gate — 2026-11-05

Stage 4 remains **unaccepted and open**, pending explicit acceptance. No commit or push. Overall V1 remains open. This record supersedes the preservation stop condition in the earlier Stage 4 implementation review; it does not rewrite the historical evidence or resolve the missing lock.

## Preservation disposition

The owner explicitly accepted the unexplained absence of the historical shared-runtime-graph lock as an unresolved qualification for Stage 4 review and authorized Git synchronization only. The lock remains absent. Removal time, responsible process, operation and causal attribution remain unknown. Passing current hashes establish content agreement, not historical continuity. No lock recreation, recovery, replacement or other operation on the historical lock was authorized or performed.

The read-only reconciliation is recorded in `v1-stage4-lock-reconciliation-review-gate-20261105.md` and `evidence/v1-stage4-lock-reconciliation-20261105/summary.json`. Its Windows audit/USN access limitations remain. The exception does not authorize shared Component operations.

## Exact isolation correction

Only two executable files change relative to the investigation starting HEAD `e506df9549c9c565a94380e48ee3cedb50f11aea`:

- `tests/stage4-role-administration.test.ts`: before fixture setup or server launch, require an explicit isolated platform and original-root identity. Resolve the imported server `platformRoot`, working directory, Component root and graph package paths physically. Require the imported root and working directory to equal the isolated root, differ from the original, and keep the graph dependency paths within the isolated tree. A missing configuration or original-root configuration fails before any setup.
- `scripts/verify-stage4-isolation.mjs`: reuse the accepted Stage 3 physical-package preparation in a fresh UUID target. Copy source, Components and tests; exclude original Component `.uib` metadata. Keep admitted UI-Base package files physical with unchanged identities, versions and hashes. Point graph package imports to target copies. Run the tests and their child servers with the target working directory and existing physical-root setting. Preserve before/after original graph snapshots and observe its lock directory read-only. A changed snapshot, watcher event or watcher error fails the runner. `--assets-only` runs the two accepted asset journeys in another fresh target.

Existing Playwright tooling and Data Services test imports are reused through disposable sibling links. They do not redirect the Component graph. UI-Base and Data Services source trees and the normal dependency installation are unchanged. No runtime source, lock policy, authorization, native admission or transaction code changes. This is a test harness correction, not an operating-system security boundary against hostile test code.

Commands used:

```
node scripts/verify-stage4-isolation.mjs
node scripts/verify-stage4-isolation.mjs --assets-only
```

## Before/after root evidence

Previously, fresh `UI_APPS_DIR` and `UI_RUNTIME_DIR` stores could still run `src/server/index.ts` and test-side service imports from the original source root. `withApplicationMutation` derives the graph as `<platformRoot>/components`, so those stores alone were insufficient.

The corrected focused run imported source and graph packages from:

```
evidence/v1-stage4-isolation-20261105/disposable/ec9a4d69-1414-4685-bc02-3b5f0cf7bddc/platform
```

The final asset run used:

```
evidence/v1-stage4-isolation-20261105/asset-regression/disposable/bc91f4c8-4b5c-4e34-94d3-8e05a6dbef68/platform
```

For both, `src/server`, `components`, `packages/artifacts` and `node_modules/@ui-platform/artifacts` resolved within the target. `paths-and-inputs.json` records exact original/target paths and test/preparation hashes. The original graph metadata was not copied. Existing source-derived graph locking therefore operates on the disposable graph; the original is not an implicit fallback for these invocations.

Both final `completion.json` records report identical original graph snapshots, unchanged original lock-directory modification time and **zero original lock-directory events**. Original lock and recovery guard remained absent. Graph-lock metrics record actual acquisitions by test servers in the copied platform; they do not themselves encode graph paths, so root attribution uses the resolved-path evidence and unchanged source implementation together. Watcher observations are corroboration, not a forensic guarantee of historical continuity.

Two additional negative runs were executed from the disposable copy: missing isolation variables, and a requested original platform root. Both exited with the expected startup failure before fixture setup/server launch. `isolation-refusals.json` records those expected refusals; their individual JSON reports intentionally contain a failed test assertion. No mutation test ran against the original graph.

## Focused verification

Evidence root: `evidence/v1-stage4-isolation-20261105/`.

| Verification | Result | Evidence |
| --- | --- | --- |
| Role Administration browser and protected I-AM/WP3 journey | Passed | `results.json`, `v1-stage4-20261105/protected-results.json`, `administration-audit.json` in that subfolder |
| Pilot authority, protected Page/Form/DOE, route permissions, Stage 1 admission/release/pinning and Stage 2 Builder journey | Passed with one existing skip | Combined focused run: 8 files, **30 passed, 1 skipped**; `focused-tests.txt` |
| Isolation misconfiguration refusal | Both expected refusals verified | `isolation-refusals.json`, `missing-isolation.json`, `original-root-request.json` |
| Stage 3 protected upload and retained Presentation workflows | **2 passed** | `asset-regression/results.json`, `asset-regression/focused-tests.txt` |
| Shared original graph snapshot/watch checks | Passed for both final runs | Each group's `preservation-before.json`, `preservation-after.json`, `completion.json` |
| Current Component/package/repository preservation | Passed | `current-preservation.json` |

The browser evidence uses normal development sessions and existing controls in Edge. Role screenshots include assignment, assigned Editor Save/Reload, ceiling refusal, last-administrator refusal and revocation. They were captured from the isolated run, not substituted from the prior workspace run. The ceiling screenshot was visually inspected and shows `ADMIN_GRANT_CEILING` feedback. Browser automation assertions verify the remaining controls/results.

The asset journeys exercise protected upload/read-back, revision/digest/conflict/replacement/cancellation and size/revocation cases, normal visual selection and assignment, HTML reference Save/Reload, decoded Preview, physical-package publication, frozen released bytes following replacement, rollback and the retained Presentation interface. Retained asset IDs/paths/alt/version hashes and publication/rollback artifacts are under the asset group's `v1-stage3-20261104` and `v1-stage3-physical-20261105` folders. This reuses the accepted local test boundary; it does not expand production private-byte qualification.

Preparation qualifications are explicit in `preparation-qualifications.json`: the first focused attempt lacked resolution for existing Playwright tooling and relative Data Services imports; the first asset attempt lacked an expected evidence output directory. Preparation was corrected, assertions were unchanged, and final runs passed. Both initial attempts also had equal shared snapshots and zero watcher events. Duplicate raw attempts and disposable trees remain ignored. The existing Data Services sourcemap warning and legacy Forms-junction skip remain; the latter skips because Forms is already physical. No broad build or unrelated test suite was run.

## Updated I1–I5 local qualification

Authoritative rows: `v1-final-technical-planning-20261103/V1-FINAL-ACCEPTANCE-MATRIX.md`. Existing I-AM staging, current-policy activation and audit contracts remain authoritative.

| ID | Verified local behavior | Retained qualification |
| --- | --- | --- |
| I1 | Explicit Platform Administrator create grant creates distinct permanent application IDs; creation confers no automatic application read; unauthorized/anonymous creation refused. | Disposable trusted identities and local provisioning; no production sign-in or independent data/operations qualification. |
| I2 | Browser initial administrator provisioning, staged assignment/revocation, refresh and activation work. Actual WP3 audit correlates assignment/revocation. Grant ceiling, last administrator, foreign application/scope, original-ID mismatch and stale revision refusals remain. | Functional bundles/ceilings are explicit trusted fixture setup. Publication is rechecked through the existing Stage 3 fixture, not a new production administrator deployment. |
| I3 | Assigned Page browser edit/Save/Reload and direct Page/Form updates pass; unassigned Page refused and unassigned Form excluded. Editor shared edit, Publish and role administration return 403. Revoked Editor is refused in its already-open browser. | No new shared-grant UI or inheritance. The positive additional shared-grant scenario is not newly qualified by this isolation correction. Existing Form/DOE permission regression passes separately. |
| I4 | Viewer management source/export, upload, Publish and administration denied; intentionally public asset readable. Same signed-in User propagates through protected DOE/ORM regression. | Authorized private runtime content/data/thumbnail/range/field/row reader scenarios are not newly qualified. Production identity/runtime/private-byte qualification remains Stage 5. Do not mark the entire future production row passed. |
| I5 | Signed-out management/source/asset-management/creation refused; intentional public presentation bytes readable without a privileged principal; no anonymous role assignment invented. | Development management/public-asset boundary only. Public production site, private static/cache/range bypass and anonymous production data enforcement remain unverified Stage 5 work. |

## Preservation and exact inventory

All **23** accepted Component files match the Stage 3 baseline (allowing CRLF normalization); all **234** installed package file hashes match. UI-Base remains clean at `732eec58ca3d4bd2521197b9d3b6c0457dbc6608`; Data Services remains clean at `81b769eef3763d02343f5347888c26edab6ef7bc`. Component graph/storage source, package manifest and lockfile diffs against Stage 3 are empty. Physical package manifests preserve approved native identities, versions and hashes. HTML-first storage and existing settings are unchanged.

Of the prior 47-file Stage 4 inventory, 46 remain byte-identical; the only intentional difference is the Stage 4 test startup guard. The new inventories supersede that test's previous digest without rewriting historical evidence. `changed-file-hashes.json` lists the exact reviewable working-tree additions/modifications relative to starting HEAD. `stage4-consolidated-file-hashes.json` lists the complete Stage 4 review set relative to accepted Stage 3. Both contain SHA-256 of current bytes and exclude themselves to avoid circular digests; their external digests are reported with delivery. Ignored disposable targets, duplicate preparation attempts, raw browser control dumps and caches are excluded.

Only the test and runner above plus documentation/sanitized evidence changed in this correction. No staging, commit, push, shared-lock repair, production implementation or Stage 5 work. Current agreement and zero observed events do not resolve historical uncertainty.

**Stopped at the Stage 4 Final Implementation Review Gate for explicit acceptance.**
