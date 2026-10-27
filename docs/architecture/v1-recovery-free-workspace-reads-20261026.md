# V1 recovery-free workspace reads

Date: 2026-10-26. Status: **V1 Recovery-Free Workspace Reads — Acceptance Review Gate**.

HTML-first remains accepted and closed. Normal-session Builder/browser verification remains open. No backend was started and no existing Application, identity, registry, Page, package store, lock or journal was acquired.

## Existing read-path corrections

| Product file | Exact change |
| --- | --- |
| `src/server/index.ts` | Visual workspace GET supplies `{ recovery: 'refuse', signal: acquisition.signal }` to the existing application graph wrapper and `visualWorkspace`. Visual Page/Component/Shell GET list, selected role read, code read and saved design Preview receive the same explicit refusal/cancellation. |
| `src/server/visual-artifacts.ts` | `visualWorkspace` snapshots its optional read options and forwards them to all three collection lists. Existing `list` already forwards options to root recovery checks and each `read`; existing `read` already forwards to Foundation roles. Refusal-mode batches now settle sibling reads before propagating failure, allowing owned-lock cleanup before the outer graph releases. |
| `src/server/visual-preview.ts` | Forwards snapshotted options into the existing runtime graph wrapper, both workspace captures and both composition captures. Saved hash/dependency checks and related-source authorization are retained. |
| `src/server/application-composition.ts` | Optional read options reach Page/Shell/Component lists used by saved design Preview. Refusal-mode sibling lists settle before rejection. Other callers retain default options. |

`composition-lock.ts` and all Foundation modules are unchanged. The existing wrapper already merges explicit options with request cancellation and passes them to `withRoleBundleGraph`. There is no new storage abstraction or graph lock. Save/Publish/mutation call sites still use their existing defaults; refusal is opt-in at the named GET boundary. This does not change unrelated GET endpoints or make global read-only claims.

The accepted D6-R1 graph/root/role checks reject retained pending journals, including missing-anchor membership, without reading journal content. Busy foreign locks are not probed for liveness or removed. Existing errors remain explicit: `source.recovery-required` maps to HTTP 409 through the unchanged server error mapper; busy/unknown-owner/unsafe admission remain 503 errors. There is no catch-and-retry using default recovery and no conversion of acquisition failures into partial workspace success. Existing identity validation and metadata diagnostics remain intact.

## Incidental writes and admission boundary

**Recovery-free does not mean write-free.** Foundation's unchanged graph and role acquisition:

1. Calls `storageDirectory`, creating `.uib` and `.uib/locks` directories with recursive mkdir as needed and checking symlinks.
2. Checks the target lock and recovery guard; exclusively opens its own lock with `wx`.
3. Writes the current PID and syncs that owned lock.
4. Checks root journal membership and captures source under the lock.
5. Closes and unlinks only its acquired lock. Coordination directories remain. Uncertain cleanup fails admission/success, as covered by retained D6-R1 tests.

Refusal avoids journal storage creation/replay and foreign lock cleanup, but even a refused request may have created coordination directories or briefly acquired its own graph/role lock. All executable product filesystem access in this review is guarded to disposable fixture roots; only ancestor lstat metadata is allowed outside them. Fixture setup and cleanup use ordinary test filesystem calls within named disposable roots. PID probing is replaced by a failing test tripwire and remains zero in the new workspace trace.

Another existing boundary remains: `getApp` may call `ensureAppManifest`, which can create a missing manifest. `discoverComponents` calls `getActiveAppPackages` → `getAppPackageCatalog` → `ensureAppManifest` and `refreshPackageCatalog`; the latter updates catalog state using mkdir/writeFile. These operations were inspected as source only, not executed or modified. They are not Foundation recovery, but preclude claiming the whole HTTP GET is side-effect-free. Real catalog access/writes still require separate admission.

## Verification and limits

Final workspace run: `evidence/v1-recovery-free-workspace-20261026/run-1793067523442`.

- **9 passing tests**, serial, zero automatic retries: actual workspace graph/list/read success; Page/Component/Shell membership and permanent identities; exact saved Page hash; each collection's pending/missing-anchor refusal; replayable journal preservation; foreign graph/role lock preservation with zero PID probes; duplicate/wrong-kind/path identity checks; existing Save validation/admission once with stale-hash and identity-replacement refusal; request cancellation and owned-resource cleanup; no caller downgrade to default recovery; composition forwarding across all three collections.
- Strict scoped no-emit typechecking: **zero diagnostics** for actual Foundation contracts, graph wrapper, Visual service/workspace, composition and design Preview source. The exact changed GET block is extracted from `index.ts` and typechecked without execution. Narrow surrounding HTTP/catalog declarations and throwing unused compilation/candidate boundaries are explicit in `typecheck-admission.json`. This is not a whole-backend typecheck or normal-session test.
- Source checks permit only the exact named GET edits in `index.ts`; the remaining route source, authorization/owner code, saved-hash checks, error mapper and mutation bodies match the pre-edit snapshot. Every noncollector service/composition method and the graph wrapper match their snapshots. Preview's two captures and two composition rechecks explicitly forward options. Preview delivery/compilation is not executed by these tests.
- Existing D6-R1 suite rerun: `evidence/d6-r1-recovery-free-read-20261026/run-1793067445558`: **16 passing tests**, strict scoped typecheck passes. Covers further unsafe/unknown-owner states, cancellation, queue behavior, canonical roots/roles and uncertain cleanup without callback replay.
- Exact input hashes, source snapshots, resolved graph, typecheck input hashes, filesystem traces and raw results are retained. `git diff --check` passes; Git emits line-ending notices only. No real authorization claim is made from test callbacks: the Save callbacks test the existing service contract on disposable source only.

Failed attempts are retained unchanged: `run-1793067346264` (missing guarded writeFile export for unused composition writes); `run-1793067357397` (test incorrectly prohibited recovery-guard lstat and used a singular identity regex); `run-1793067390982` (two incomplete typed tripwire return declarations); `run-1793067495818` (missing path import in extracted typecheck scope). Earlier passing `run-1793067437405` is retained. These are corrected named attempts, not automatic retries; no product safety condition was weakened.

## Conditions for the first real normal-application smoke test

Separate authorization must identify and admit:

1. The ordinary development environment, exact backend/UI ports, existing runtime paths, original identity/session and Application registry. Startup can initialize identity/registry state; none was run here.
2. One real Application with permanent owner ID, authorized user/session, Page locator and current saved hash. Current read/write permissions and dependency source permissions must be checked through the existing application routes. No fabricated session or callback substitutes for this.
3. Actual Page/Shell/Component roots and their ordinary **owned coordination writes**, plus existing manifest/catalog acquisition and catalog refresh writes. If existing locks are busy or any recovery is required, stop; this correction authorizes no stale-lock cleanup, journal replay or repair. Missing/invalid roots or identity conflicts also stop the smoke test.
4. Trusted installed UI Base component definitions/allowlist and native renderer delivery through the existing application. No installation, activation or publication is included here.
5. An authorized ordinary Save to that Page, retaining current ownership rechecks, expected hash and candidate validation. Mutation recovery semantics were preserved, not made recovery-free; a pending mutation/recovery state must stop the smoke test for separate review rather than be repaired implicitly.

Once admitted, use the actual printed normal UI URL (default `http://localhost:5174/`, not started or verified live here) in an already running normal browser: open Application/Builder → add Card → edit Properties → Save → Reload → existing design Preview. Record saved and Preview hashes, verify the saved rendering survives an unsaved draft, then repeat with Panel. Browser automation is optional. Prior Edge launch failures justify no Windows security changes.

Restricted production Preview remains unavailable and unqualified. No D6-A1/D6-R2, P2/P3, production migration, package publication or normal-browser acceptance is implied.

## File inventory and preservation

Four product files changed, as listed above. `composition-lock.ts` is preserved byte-for-byte. New support: `scripts/verify-workspace-reads.mjs`; five files under `tests/workspace-reads` (`workspace.test.ts`, `boundaries.ts`, `vite-boundary.ts`, `fs-guard.ts`, `source-check.mjs`); this report; retained evidence under the new increment directory and one new D6-R1 regression run. The prior HTML-first closure addendum is pre-existing and unchanged.

`evidence/v1-recovery-free-workspace-20261026/preservation.json` records baseline/current hashes, original HTML-first inventory comparison and HEAD comparison. `docs/architecture/v1-recovery-free-workspace-files-20261026.json` enumerates the exact product/support/evidence files with sizes and hashes; only its self-entry is unhashed. Historical inventories continue to record historical hashes. No existing evidence was overwritten, no content was migrated, and no commits or synchronization occurred.

Stop: **V1 Recovery-Free Workspace Reads — Acceptance Review Gate**.
