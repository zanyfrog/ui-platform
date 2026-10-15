# Builder V1 WP2 — Verification

Date: 2026-10-15. Windows, Node 24.19.0, Microsoft Edge/Playwright. **BUILDER V1 WP2 — ACCEPTED AND CLOSED** by the user following review of the completed READY FOR REVIEW implementation and evidence below. Accepted verification remains 362/362 UI Platform tests, 143/143 editor/storage contracts, browser checks, build, typechecks and production exclusion. All documented limitations remain in force. WP0/WP1 remain accepted and closed. WP3 is the next planning target only and has not begun; the complete WP6 UI-only journey is not claimed.

## Results

| Check | Final result |
| --- | --- |
| UI Platform regression | 362/362 tests, 53 files, zero failed/pending |
| Emitted editor/storage contracts | 143/143 tests, 15 files; emitted consumer and generated contract checks pass |
| Typechecks | Pass |
| Production build | Pass |
| Production-editor exclusion | Pass |
| Generic/settings/legacy browser | 7 PASS groups; four real-service/control groups plus three existing deterministic presentation harnesses |
| Specialized browser | 13 PASS groups across nine artifact kinds, plus standalone picker |
| Composition browser | 14 PASS groups including real composed development/production renders and portable export |
| Sibling source/contracts | No sibling changes; existing integration regressions exercised, no additional sibling-wide run claimed |

Machine evidence: [full regression](evidence/builder-v1-wp2/ui-results.json), [summary](evidence/builder-v1-wp2/verification-results.json), [generic/legacy browser](evidence/builder-v1-wp2/browser-results.json), [specialized browser](evidence/builder-v1-wp2/specialized-browser-results.json), [composition browser](evidence/builder-v1-wp2/composition-browser-results.json), [current WP0 regression](evidence/builder-v1-wp2/wp0-regression.json). Accepted WP0 evidence was restored byte-for-byte rather than replacing the accepted record with a disposable fixture.

## Meaningful boundaries exercised

The 14 common lifecycle tests cover inactivity debounce, no-op suppression, logical groups, both history bounds, Redo invalidation, Undo after save, invalid drafts/correction, delayed generations, failed retry, conflict retention, baseline notification, suspension/draining and native leave behavior. Generic service/security tests prove normal complete validation before persistence, protected 422 diagnostics, unchanged disk after invalid source, separate repair mode, original-author recovery and source races.

Six real V1 identity tests include queued Visual saves revoked by actual SQLite/I-AM policy or session before Foundation admission. These are real HTTP/service tests, not callback-only authority proofs. Existing WP0 protected runtime, forged authority, owner isolation, hidden-source and WP1 canonical-tab/session regressions remain in the full suite.

Sixteen explicit-role filesystem tests cover failures at each of five roles, partial writes, rollback failure, retained/corrupt/out-of-role journals, fresh-process restart recovery, killed writers, stale checksums, external edits, admission revocation, path ownership and Windows case aliases. A lock-publication test proves brief PID publication is awaited without stealing a live or permanently incomplete lock. Another test deliberately shows raw filesystem readers can see a partial bundle while a participating reader waits.

Nine Visual service tests validate complete normal candidates and composition/source integrity against real source files, each role's rollback, recovery-required failures, source races and admission revocation. Normal syntax/CSS validation is authoritative; advanced source repair remains separate.

Fifteen real Vite tests rerun the original mixed-role, cached-root and recovery counterexamples against default loading. They prove coherent Page/Shell/shared Component dependency capture, raw and private-journal blocking, lost-anchor recovery, external/incompatible-source rejection and shared ordinary helper identity. Static/transitive/dynamic/cached helper Visual-role bypasses are blocked; allowed ordinary literal imports work. Retained context/callback/metadata and private mutable cache patterns receive local diagnostics. Managed data mutation/cloned metadata/mixed roles are rejected.

The runtime test includes actual Edge rendering during a 500 ms paused multi-role transaction, successful validated refresh, failed rollback/unrecoverable recovery, retained prior render and fresh-reader rejection/current-source behavior. It uses real Vite and filesystem faults, not only storage assertions.

## Browser acceptance evidence

The generic browser uses real source services and authorized existing editors: invalid source remains local with unchanged disk; correction auto-saves; Undo survives save; Redo survives switching; Save Now writes real source. Native refresh warns for an invalid draft and permits clean leave. Legacy settings and presentation design/layout adapters are mounted with their actual common controls and source services in a small DOM harness, avoiding an unrelated preview launch for the minimal security fixture. Their saved bytes and independent histories are asserted. The three old editor presentation harnesses use deterministic transports and are explicitly separate evidence.

The specialized browser mounts the actual WP1 workspace with real API/I-AM: Pages, Shells, Platform Components, Forms, Triggers, Workflows, Menus, composition settings and styles. It verifies focus/no-op suppression, inactive saves with original context, structural/property/Form/action history, invalid 422 retention/native warning, external conflict/reload notification, delayed committed response/newer edit, failed retry and identity revocation. A standalone Visual picker separately demonstrates inactive saves and per-artifact Undo/Redo after switching. All bytes of a published snapshot remain unchanged; exactly one explicit setup Publish occurs and none is automatic. Zero page errors.

The composition browser verifies existing Standard Application creation, Shell/Region validation, asset stale checks, Menu/branding/theme/style/Component isolation, real Source inspector, actual Page/Shell/shared Component runtime, Publish/export and production snapshot immutability after a development edit. Its five deterministic composition harness cases remain distinct from real runtime assertions. Zero page errors.

Fixture assembly/bootstrap uses existing trusted development administration and explicit grants. Programmatic setup is supplemental test preparation, not UI-only creation/onboarding or WP6 acceptance. Unique test-owned source directories are verified before cleanup.

## Reproduce

From C:/Projects/Modular/ui-platform, run sequentially:

~~~powershell
$env:TEMP='C:/Projects/Modular/.wp2-test-temp'
$env:TMP=$env:TEMP
npm run typecheck
npm run build
node scripts/check-editor-production.mjs
npm run check:editor-contracts
npm test -- --maxWorkers=1 --testTimeout=15000 --retry=1 --reporter=json --outputFile=docs/architecture/evidence/builder-v1-wp2/ui-results.json
$env:UI_BUILDER_WP2_EVIDENCE='docs/architecture/evidence/builder-v1-wp2'
node --import tsx scripts/test-builder-wp2-generic.ts
node --import tsx scripts/test-builder-wp2-specialized.ts
# Use a short disposable Windows path for the existing portable ZIP tooling:
$env:TEMP='C:/Projects/Modular/.t'
$env:TMP=$env:TEMP
node scripts/test-application-composition.mjs
git diff --check
~~~

Create the indicated temporary directories first. Do not overlap filesystem-changing suites/browser fixtures. Restore accepted WP0 evidence after copying the current regression result.

## Failed attempts and Windows behavior

An earlier 360-test run had two failures: a legacy Page entry lacked a function import (three core roles), and a preview test omitted the newly required exact hash. The entry adapter now supports the empty function role; the preview test asserts missing/stale hashes fail and exact hashes succeed. Form reference checks now select the pinned Component catalog; behavioral assertions remain.

The composition browser reproduced transient cross-process busy admission, a PID-publication window, unnecessary refresh from published output, and Windows ZIP path-length failure. Busy admission remains fail-closed; the explicit test Publish retries only the exact pre-admission busy result. The existing Foundation lock briefly awaits PID publication, without stealing incomplete locks. Refresh ignores private storage and immutable output. ZIP errors now terminate/fail instead of returning a missing archive as success; a short disposable path avoids Windows archive path limits.

One final contract attempt failed an existing watcher directory rename with EPERM (142 passed, one failed). It was not counted as a pass, skipped or weakened; the unchanged suite was rerun. Windows may retain native build files until the test process exits. The composition runner closes its owned servers/browser and exits only after assertions and cleanup; any thrown assertion/error retains failure. Vite fault tests intentionally emit invalid-source/recovery errors and can report a middleware WebSocket port collision; those messages are not discarded assertions.

## Limits and deferred scope

No whole-bundle atomic visibility for arbitrary filesystem readers; only documented cooperating readers participate. Cross-artifact template/restore operations can partly complete and report committed items/recovery status; there is no cross-artifact Undo. Shared helpers keep ordinary Vite identity, but opaque/computed loading and revision-specific retained state are rejected locally. Isolated inspector helper imports requiring Application modules use Current Preview instead. Browser restart history is deferred. Active runtime modules remain alive until their realm is disposed, within bounded registries/captures.

No deployment, commit/push, generalized engine redesign or new Publish/version infrastructure. See [runtime design](builder-v1-wp2-runtime-design.md), [reader/recovery contract](builder-v1-wp2-reader-contract.md), [lifecycle](builder-v1-wp2-editing-lifecycle.md), [acceptance rows](builder-end-to-end-v1-acceptance-checklist.md) and [exact changed-file inventory](builder-v1-wp2-files.txt).
