# WP5-F D6 — remaining runtime Form regression

2026-10-19, America/New_York. Targeted correction authorized after review of the prior D6 implementation. This is implementation verification, not acceptance or closure. The approved graph-lock implementation and its five-second acquisition budgets are unchanged in this follow-up.

## Diagnosis and pre-D6 comparison

The failure is document teardown, not Dataset rejection or a Form conversion error. The real WP4 browser reproduction (`trace-before.json`) receives two unqualified `full-reload` messages after opening the running Application, navigates twice, and loses the entered name before submission. The pre-submit value assertion establishes loss before that test clicks Submit. Earlier empty transport captures are inconclusive: their generic URL filter did not match this Application's `/api/apps/wp4-created/application-data` endpoint.

`runtimeRevisionRefresh` subscribes to watcher add/unlink/change events; both Vite plugins also route relevant hot updates into it. After complete graph validation, the old function invalidates the graph and unconditionally sends `full-reload`. It does not compare the browser's loaded generation. A source-save event can finish validation after a new browser already loaded that same source. The refresh then destroys the live Form for no source-generation change.

Tracing the first correction attempt additionally identifies atomic-write sibling events, for example `page.html.<uuid>.tmp`, as refresh initiators. Foundation `atomicWrite` writes this sibling and renames it to the final role. The broad runtime source-root predicates treated those temporary add/unlink events as external changes. The attempted digest-only correction conservatively forced reload for these uncaptured paths, so that attempt still failed. Its evidence remains under `wp4-corrected/` and `wp4-corrected.json`.

The destructive refresh decision predates D6. `compare-pre-d6.mjs` extracts and executes the exact refresh function from pre-D6 HEAD `7050993160cee3ffeb49674fa4696dc6ff8f694a` and verifies byte identity with accepted WP2 commit `bb7b2b6`. A deterministic delayed hint with identical loaded/validated bytes causes `full-reload` without lock contention. `pre-d6-comparison.json` records the function hash and old/new messages. This isolates the mechanism rather than replaying the complete historical WP4 fixture; D6 admission waiting can shift its timing, but did not introduce that unconditional decision. The graph-lock architecture is not reopened.

## Exact correction

- `packages/visual-artifacts/src/runtime-revision.ts`: ignore only UUID atomic siblings whose final path is a captured source role; continue validating final-source events. Hash the complete generated module, inject a development-only registration, and publish validated module digests after existing coherent reader admission succeeds. The browser compares its own active digests rather than a server-global most-recent load. Bootstrap reconciliation retains a pending notification; the self-accepting watch sentinel retains only digests across its own HMR. Unknown module metadata falls back to the existing full reload. Failed validation keeps the current render and reports the existing error.
- `packages/visual-artifacts/src/revision-vite.ts` and `revision-composition-vite.ts`: register all development aggregate/forwarding modules and use the shared sentinel. Identify captured role/composition inputs. Helpers/assets outside that capture force the existing reload, and coalescing cannot erase an earlier forced event.
- `tests/runtime-refresh.test.ts`: deterministic lifecycle tests for matching/older independent clients, bootstrap, sentinel HMR, no cross-document state, coalescing, temporary siblings, validation failure and stale validation completion.
- `tests/visual-role-reader.test.ts`: deliver a same-byte watcher event explicitly while a real browser has unsubmitted input; verify the original document and input remain. Existing changed-generation reload and recovery-failure assertions remain.
- `tests/builder-v1-wp4.test.ts`: retain all prior authoring/native-422/isolated/ordinary persistence assertions; record browser refresh messages, assert exact outbound values and record identity, then query that same record through the existing original-User protected API. Remove the ineffective network-idle workaround. No submission retry or arbitrary delay is added.

The unchanged Form runtime is still responsible for conversion, calculation, field authorization, dirty state, operation/record initialization, submission and protected readback. The correction retains the existing instance only when its compiled generation is identical. It does not serialize, cache, restore, transfer, submit or persist Form values. No persistent browser storage, alternate User/Application identity, security bypass or source authority is added. Only current module digests and one pending notification survive sentinel HMR within the same document; Form values do not enter that structure. Different compiled definitions retain the existing reload boundary. User/session/record transitions keep their existing authority and Form initialization contracts.

This deliberately does not promise draft migration across changed Form definitions, helpers, assets, explicit browser reload, process restart or navigation. A compiled CSS/fixture/source change is a changed generation and conservatively reloads. Broader cross-generation state migration would require a separate lifecycle design. Matching-generation refresh is the bounded non-destructive case corrected here.

## Evidence and verification

New evidence is under `docs/architecture/evidence/builder-v1-wp5-f-form-refresh/`; earlier D6 evidence remains untouched. `prior-d6-inventory.json` preserves the prior inventory before this follow-up.

| Record | Result |
| --- | --- |
| `trace-before.json`, `trace-before/runtime-refresh.json` | Real WP4 value loss reproduced, with two unqualified reloads and repeated navigation |
| `pre-d6-comparison.json` | Exact pre-D6/WP2 mechanism reproduced without contention; corrected path publishes validated digest |
| `build-first.log` | Failed initial edit due to quoting; retained and corrected |
| `build-second.log`, `build-third.log` | Passed intermediate package builds |
| `refresh-unit.json` | Six initial deterministic lifecycle tests pass |
| `lifecycle.json` | 23/23 initial focused lifecycle/coherent-reader/admission tests pass |
| `wp4-corrected.json` | First correction remains failed; tracing exposes temporary siblings forcing reload |
| `build-final-product.log` | Package build passes after temporary-role filtering |
| `ui-full.json` | **494/496 — NOT PASSED**. WP4 request-observation failure and WP5-B stale-source preview rejection; overlapping independently launched fixture invalidated the clean-run setup |
| `wp4-verified.json` | Separate run stopped earlier waiting for generated Form heading, before exercising normal runtime |
| `data-services-full.json` | **760/760** unchanged sibling regressions |
| `data-services-typecheck.log`, `data-services-build.log` | Passed |
| `ui-build.log`, `ui-typecheck.log`, `production-exclusion.log` | Passed for final product |
| `editor-contracts.log` | **146/146**, serial, retry disabled |
| `ui-verified.json` | **495/496 — NOT PASSED**, 70/71 files pass. WP4, WP5-B simultaneous journey, all seven refresh tests and coherent-reader/lifecycle tests pass; sole failure is WP5-E Application creation rename EPERM |

The first full run after temporary-role filtering reached successful Form persistence (visually verified screenshot), but a new request-observation assertion timed out because it matched the generic endpoint rather than the exact Application endpoint. `ui-full.json` retains that failure. The listener and transport capture are corrected to the exact Application path; all submitted-value, primary-key and protected readback assertions remain. This was a verification-instrumentation error, not a reason to loosen persistence requirements. A separately launched WP4 run overlapped later browser journeys in that full run. These fixtures share the repository Platform component collection, so that overlap was an invalid verification setup and can race their source inventories. The separate WP4 run failed earlier at the generated-Form heading; WP5-B rejected stale preview bytes (409). Both failures are retained without changing their assertions or attributing them to the runtime correction. Final verification uses one serial UI run with no separately launched UI fixture. Actual Builder/runtime concurrency inside the required journey remains enabled. In the corrected serial run, WP4 passes in 115.36 seconds. Two validated same-generation notifications arrive after Form entry starts, without an intervening navigation. The ordinary Application operation returns 200/committed, and the protected query returns record `e6e184e7-d348-4eaf-91d1-0309ceb42934` with name `Browser Application`, quantity 3, price 9 and total 27. The outgoing-record/returned-record identity assertions pass. The final navigation in the trace is the existing explicit post-persistence reload. The running screenshot was visually inspected. The final complete run is 495/496, so the full-suite acceptance condition is not satisfied. Final preservation and exact inventory are recorded separately below.

## Remaining full-suite blocker and review recommendation

The sole final-run failure is WP5-E at `tests/builder-v1-wp5-e-browser.test.ts:80`, expecting Application creation 201 and receiving 500. Windows rejects the existing `rename(tempDir, finalDir)` at `src/server/applications.ts:176` with EPERM, after installation/service build, before the Builder/runtime starts. That source file is unchanged. The new refresh lifecycle code has not executed at this point. The specific process/handle responsible is not established; do not label it a proven antivirus or sandbox failure. Earlier WP5-E runs passed, but that does not erase this final failure.

No creation retry, timeout increase, assertion relaxation, process quiescence inside the simultaneous journey, or Application lifecycle correction was introduced to conceal it. There is no automated broad retry and no additional full-run attempt solely to obtain a green result. Further Windows Application-creation/handle-lifetime diagnosis is required before a complete green suite can support acceptance.

**D6 IMPLEMENTATION BLOCKED at the full-suite verification gate.** The targeted Form value-loss correction and both original regression assertions are verified, but D6 is not ready for acceptance on the required complete-suite criterion. This report supersedes the prior remaining-Form-failure diagnosis and recommendation; prior reports and evidence remain unchanged. No acceptance or closure is declared.

## Preservation and exact inventory

`evidence/builder-v1-wp5-f-form-refresh/preservation-final.json` records hashes against the original 1,603-file UI/Data Services baseline and the prior D6 inventory. All 894 historical evidence files, all 128 prior D6 evidence files, existing documentation, the four preexisting planning documents, Data Services source and 40 unchecked umbrella requirements are preserved. The exact cumulative changed/new-file list and SHA-256 hashes, with the six code/test files in this follow-up identified separately, are in `builder-v1-wp5-f-form-refresh-files.json`. The manifest self entry is intentionally unhashed to avoid a circular checksum. The original D6 inventory is preserved unchanged.

## Measured simultaneous workload

The successful final-run WP5-B journey leaves Builder open, starts the managed runtime, and passes all three overlapping save/graph-read/Problems/reload rounds, ordinary Form persistence and protected delete/revocation checks. Its complete server capture contains 117 acquired graph observations and no non-entered observations; maximum acquisition wait is 3,772.9065 ms and maximum hold is 1,689.9652 ms. These include authoring/startup as well as the overlap rounds, not an isolated steady-state distribution. `simultaneous-measurement-summary.json` records the scope. Graph and role acquisition budgets remain 5,000 ms. No graph-lock implementation file changed during this follow-up.

## Security architecture decision acknowledged

The user approved the minimal existing-authority I-AM/session invalidation architecture with the stated conditions on 2026-10-19. The prior investigation remains historical evidence. Approved direction: existing policy/session/ownership authorities, recoverable committed change revisions, all relevant writers and expiry coverage, authenticated SSE reuse where compatible, sequence reconciliation and fail-closed health handling. Observed revocation/invalidation/channel failure hides protected previews; restoration requires fresh authorization and explicit Refresh Preview. Remote delivery/health limits must be measured and documented.

Security implementation, schema migration and any new authority contract beyond that approval are not implemented here. Protected preview remains unavailable pending separate implementation authorization and completed security verification. The runtime's development graph-digest notification is not a security invalidation channel and does not satisfy that prerequisite.

No focused preview implementation, WP5-G/WP6, GitHub synchronization, commit, push, umbrella check or D6/WP5-F/WP5-I acceptance/closure is authorized or performed. Stop at D6 acceptance review.
