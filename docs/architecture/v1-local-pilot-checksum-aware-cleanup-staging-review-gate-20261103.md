# V1 Local Audience Pilot — Checksum-Aware Cleanup Staging Acceptance Review Gate

2026-11-03. **Implementation and focused verification complete; normal-browser authenticated staging remains pending operator sign-in.** Submitted as an open gate, not acceptance or closure. No new candidate is claimed yet. Do not activate the earlier invalid candidate.

## Correction

The existing protected `security/pilot-status` response now returns `recordChecksums` for exactly these fixed records:

- `local-pilot.de8d1851-3e36-435f-b093-95ce94d940e7.set`
- `local-pilot.de8d1851-3e36-435f-b093-95ce94d940e7.role`
- `local-pilot.de8d1851-3e36-435f-b093-95ce94d940e7.assignment`

For each present document the server calls the existing trusted I-AM `securityChecksum`; an absent document is represented by null. The revision and documents come from the same committed `SecurityDefinitionStore.snapshot()`. No authoritative checksum is reconstructed from client-proposed records.

The existing admission remains: registered pilot key/permanent ID, Builder Demo deployment, canonical Security Admin principal and live Platform security authority. Only these three fixed checksums are added to the already protected output. No unrelated documents, grant records, cookie/session/CSRF material or security-store internals are returned.

The client verifies the response identity/revision as before and additionally requires exactly the three checksum keys, each null or a canonical sha256 value. Missing/malformed state is refused before staging. `PilotAdministration.stage` refreshes protected state and passes each present checksum as its corresponding `expectedChecksum`; null/absent records retain initial-create behavior. The fixed record IDs, seven rules, cleanup scope, role/assignment and administrator anchor are not substituted.

I-AM checksum checks, expected revision, graph/candidate validation, protected activation/delegation, audit, authentication and CSRF implementations are unchanged. Concurrent record/revision changes still reach the native stale-check refusal. Existing staged/not-activated feedback and separate review/activation controls remain.

## Exact intentional source changes

1. `src/shared/pilot-administration.ts`: fixed record IDs, checksum-map response type, optional expected-checksum attachment in the existing fixed plan.
2. `src/server/v1-development-identity.ts`: trusted checksum import and protected response fields from the same snapshot.
3. `src/client/artifact-editor/pilot-administration.ts`: fail-closed checksum-map validation and attachment after refresh.
4. `tests/pilot-administration.test.ts`: existing-record regression coverage through actual isolated protected contracts.

No product change was made in I-AM, native installation, dependencies, Page/Shell/Menu authoring or publication code. This report and `evidence/v1-checksum-aware-staging-20261103/` are separate new review artifacts. `files.json` provides scoped exact file/hash inventory. Temporary fixture files and ordinary test/development build caches are not represented as a complete whole-machine filesystem inventory.

## Focused verification

`vitest run tests/pilot-administration.test.ts tests/v1-development-identity.test.ts`: **10 tests passed, 2 files** with authorized loopback access. The first restricted run hit `connect EACCES` and reported 7 failed/3 passed; its raw log remains and is not reclassified as passing. The separately recorded successful run is the functional evidence.

The real protected integration fixture covers initial missing records/null checksums, first stage and activation in an isolated test store, exact existing-record checksum reporting, matching-checksum cleanup staging, missing/stale checksum refusal, stale policy revision, wrong registered owner and unauthorized principal, existing CSRF refusal, unchanged seven rules and exact one-rule `ui.page.admin` delta. A separate check refuses incomplete checksum state before sending stage. The active snapshot—including the initial anchor and unrelated definitions—remains identical after isolated cleanup staging. Fixture activation is not a Demo policy change.

Server `tsc --noEmit -p tsconfig.server.json`: passed. Client `tsc --noEmit -p tsconfig.json`: retains seven documented diagnostics in fixture/native Preview declarations and `main.ts`; no diagnostic names a changed file. This is not a clean broader client typecheck. The normal authoring launcher also completed its existing platform-core/artifacts/visual-artifacts development compilation. No production website build, export or Publish occurred.

## Environment restart and browser status

The documented managed Demo control was used to stop only its owned services and then restart the existing ready deployment with authoring-only `npm run demo`. No setup/reset/provision/preview/reference flags were used. The first startup failed its own Builder health timeout and exited; `startup.log` preserves this failure. A single retry passed the documented pages/dependency health checks and reports BUILDER DEMO READY; `startup-retry.log` preserves it. API 5280 and Builder UI 5274 are configured. No Application Preview or reader host was started.

The restricted local-control/process query was refused by the environment. The authorized control command succeeded with local access. A supplemental Windows listener query did not return matching records despite the documented health response; it was not used to infer process ownership or launch another instance. No Windows security/token changes or unrelated process termination were attempted.

The existing connected Chrome tab was reloaded. The initial connection-refused observation from the failed startup is retained as a failed attempt, followed by a successful normal Builder load after retry. In-memory sessions were cleared by restart. The last same-context Verify development session result is **unauthenticated**, principal null. The operator has been asked to perform normal Development identity **Sign out → Security Admin** in that existing tab. No automatic sign-in, historical session reuse, cookie extraction or fabricated evaluator context was used.

Remaining browser steps: verify canonical Security Admin/live authority; open protected pilot state; observe revision 9 and all three actual checksums; review the exact fixed cleanup request against active records/scopes/checksums; then invoke Stage once. If a conflict or unexpected delta occurs, stop. A newly valid candidate, its exact checksum, diagnostics and proposed records must be appended in a separate continuation before the browser qualification can be called complete. Activation remains unauthorized.

## Preservation

Read-only inspection confirms revision **9** and exact equality of all three existing active functional documents with the accepted seven-permission plan. The old candidate `969220cf-fa79-4640-979e-9b3248ddbf39`, checksum `sha256:bfce2552d2b4e8f4caed59437137632f22259795eb62c07127cf7f38b9374c97`, remains at base revision 9 with all three CHECKSUM_CONFLICT diagnostics. Its complete stored-row digest is captured for comparison; it was not modified, activated, reused or discarded.

The dependency records/archive and all 54 admitted native UI Base payload hashes match the accepted evidence; the installed root remains physical. Before/after Application/security snapshots and inspection outputs are retained. No active grant, policy/audit, registration, website, Presentation draft, Administration Page, Menu or Shell mutation is authorized or performed here. Exact scoped comparisons are in `preservation.json`.

The comparison confirms all seven security-table digests and registered Application records unchanged, including all 11 existing candidate rows. All regular Application files are unchanged except existing operation logs: pilot +402 bytes, persistent Demo +342 bytes, fixture +1,500 bytes, with each original prefix hash preserved. No Application files were added or removed. These normal startup/discovery log appends are retained rather than cleaned up.

The retry launcher remains running intentionally for operator verification (execution session 81996). Cleanup, when requested, is the normal `node scripts/demo-control.mjs stop`; no unrelated service should be terminated. The preceding failed startup was session 19296 and exited. No commits or pushes.

## Remaining release work

After a new valid cleanup candidate is reviewed and separately approved for activation, the retained Admin Navigation destination must be repaired through ordinary controls before guarded Administration deletion. Existing graph validation refuses deletion while `menu-admin`/`admin-home` targets the removed Route. Admin Shell/Menu need not be deleted. After deletion, reverify exactly `/`, `/about`, `/contact`, then separately stage/review/activate audited removal of the temporary cleanup rule. Neither revocation nor Publish is automatic.

The accepted 386px mobile qualification is retained without reopening it. This increment does not qualify publication or hosting. The review gate remains open pending legitimate normal-browser staging evidence and separate acceptance.
