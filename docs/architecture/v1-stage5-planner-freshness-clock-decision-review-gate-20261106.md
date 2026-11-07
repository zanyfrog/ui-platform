# Stage 5 Planner Freshness and Clock Decision Review Gate

**BLOCKED. The first rejecting predicate for the historical `PLAN_EVIDENCE_STALE` remains unresolved. No planner or security timing correction is justified or implemented. Stage 5 and overall UI Platform V1 remain open.** The accepted Builder witnesses are retained, with one demonstrated test-only readiness correction. A fresh uninstrumented Viewer-policy stage refusal remains separately unresolved.

UI Platform stays on `main` at `d3729a13c8312d35be4fe61b784f84f9e3bd4446`; Data Services stays at `81b769eef3763d02343f5347888c26edab6ef7bc`. Existing uncommitted integration/WP3 changes remain preserved. This package follows [the Builder/save gate](v1-stage5-builder-save-repeatability-review-gate-20261106.md). Evidence is under `evidence/v1-stage5-planner-clock-20261106/`; `attempts.json` records all six runs separately and `changed-file-hashes.json` records exact proposed file identities.

## Planner attribution

The preceding package's uninstrumented `full-002` Form write returned `PLAN_EVIDENCE_STALE`, not committed. The unchanged evaluator has two throwing branches in `SecurityAuthorizationEvaluator.assertPlannerCurrent`:

1. Missing/wrong planner capability, missing/mutated issued evidence, or expired issued evidence.
2. A re-evaluated decision differs in request digest, effect, conditionality, policy/principal/session/resource/fact revision, evaluated cells or provenance.

Its original evidence does not contain the evaluated operands. **No actual failing comparison can be recovered from that original request.** Request duration does not select a branch; an unrelated future-`iat` refusal does not select a branch either.

New diagnostics transform only verified disposable Data source before its disposable build. Original Data source/build/tests are unchanged. The diagnostic method preserves the original predicate order, short-circuit behavior and one expiry clock sample when prior predicates pass. It records the first failed comparison, sampled current/expiry/evaluation timestamps and opaque revision evidence. Session revisions and cell/provenance contents are hashed; capabilities are represented by booleans. No bearer assertions, cookies, identity bodies, private records or credentials are retained. A diagnostic-only global callback joins these events to the existing request-local IPC trace context, without an extra authority lookup or an alternative clock.

`trace-002` and `trace-003` both completed their diagnostic browser journeys. Each recorded **98 successful planner evidence rechecks, zero planner rejections and zero JWT rejections**. They passed in **103.646 seconds** and **119.883 seconds**, respectively. Thus they do not attribute, resolve or invalidate the historical failed run. No genuine policy/revision change, expiry, lifecycle defect or timestamp defect was demonstrated as its cause.

The earlier `trace-001` did not reach the planner because of the test-witness readiness issue below. Its diagnostic variant compared hashes of session revision strings; later variants preserve the original raw equality and hash only retained values. No planner evidence from `trace-001` is used to establish attribution. All source variants and their exact before/after hashes remain recorded.

## Controlled negative predicate verification

`negative-001` appends a test only to the physical copied WP4 test module, using its existing in-memory harness. This does not edit the original repository, activate real policy, seed application records or alter an I-AM contract. The diagnostic evaluator identifies the expected first predicate for each deliberate mutation:

| Controlled case | First rejected predicate |
| --- | --- |
| Wrong capability | `capability.same` |
| Unissued cloned decision | `issued.checksum` |
| Mutated issued evidence | `issued.checksum` |
| Exactly at evidence expiry | `issued.expiry` |
| Policy revision changed | `current.policyRevision` |
| Principal revision changed | `current.principalRevision` |
| Session revision changed | `current.sessionRevision` |
| Resource revision changed | `current.resourceRevision` |
| Fact revision changed | `current.factRevision` |
| Request operation changed | `current.requestDigest` |
| Role assignment revoked | `current.effect` |
| Changed cell evidence with unchanged effect | `current.evaluatedCells` |
| Changed provenance with unchanged effect/cells | `current.provenance` |

The unchanged control passed. Exact-expiry rejection used the existing harness's one-second freshness contract, not a new production budget. Cell/provenance mutations intentionally hold revision labels fixed to exercise those predicates; they are synthetic contract-adversarial cases, not claims about legitimate owner revision handling. These **14 controlled cases** passed within one added test, yielding **152 Data tests passed**, plus **14 Platform security tests passed**. The independent uninstrumented `focused-001` passed **151 unchanged I-AM tests and 14 Platform security tests**.

These results verify that the diagnostic branches distinguish known stale/capability/revision/revocation mechanisms. They do **not** constitute before/after evidence for an implementation defect in the historical request. Existing Stage 5 identity/session, revoked access, RPC, private asset, finite-template and protected operation negative checks remain passing. No lifetime extension, authority cache, evaluation relaxation, proof-budget/deadline change or write retry is implemented.

## Demonstrated Builder witness readiness correction

The historical `field3` discrepancy remains unattributed and was not reproduced. Permanent-ID checks through naming, type/required edits, Save, server Reload and canonical apply remain intact; expected `active` is unchanged.

`trace-001` exposed a different, precise defect in the newly accepted **test helper**. It called `names.count()` while Dataset capabilities were still loading, obtaining zero. The subsequent Add field click auto-waited for that control to appear. At that point the original `id` field existed; Add produced a second field. The helper then expected `before + 1 = 1` but observed 2. The first divergent operation is the unsynchronized pre-click count, not a persisted field mutation.

The narrow correction waits for the first supported Field name control to be visible **before** counting. It changes one test fixture, keeps all permanent-ID and persisted-definition assertions, and adds no edit/write retry. Production Builder/save, HTML-first architecture and autosave configuration are unchanged. Subsequent diagnostic journeys and the fresh uninstrumented journey pass this boundary and retain exact saved/reloaded/canonical `active` identity evidence. This is before/after evidence for that readiness error only; it does not explain the old `field3` run.

`journey-001`, the bounded complete uninstrumented verification attempt, then failed at **Viewer policy staging**, `tests/fixtures/stage5-integration-journey.ts:139`: expected 200, received `{"code":"PROTECTED_REQUEST_DENIED"}` with HTTP 403. Its original first denier is untraced. It is neither relabeled a stale-plan failure nor attributed to the clock. A successful diagnostic journey cannot substitute for this failed attempt.

## Clock architecture decision

**Recommended next option: retain strict zero future-`iat` validation and separately authorize clock-health admission plus qualification on the intended Ubuntu target.** This is the least security-semantic change and should be evaluated before building a clock service or allowing future assertions. It is a conditional qualification recommendation, not an availability guarantee, implemented admission feature or production approval.

The approved architectural direction is Ubuntu **24.04**, Caddy and separate Data/runtime/management identities on a single host. The available Windows evidence includes a 6–7 ms ordered process-clock lead, changes with staggered starts/restarts, eight future-NumericDate comparisons in the 80-second probe, and a previous request-specific 1 ms future-`iat` rejection. An earlier 1.674-second host backward adjustment was outside those probe windows. None establishes an Ubuntu offset bound or the cause of the historical stale-plan request.

Pinned V8 source has different Windows and POSIX paths: Windows interpolates from an independently initialized anchor and periodically resamples; the POSIX `Time::Now` implementation calls `gettimeofday`. This supports testing the selected Linux build instead of transferring Windows behavior. It does not prove actual Ubuntu service agreement or immunity to wall-clock adjustments. [Pinned Node/V8 source](https://raw.githubusercontent.com/nodejs/node/v24.19.0/deps/v8/src/base/platform/time.cc).

| Option | Security and availability | Complexity and operational requirement |
| --- | --- | --- |
| Zero tolerance + clock-health admission | Retains present issue/expiry/age/`nbf` and revocation semantics. Fail-closed refusals remain possible between health observations; sampled agreement cannot prove continuous exact clock equality. An unhealthy or uncertain host must not be advertised as qualified. | Lowest protocol change. Requires actual target/build inventory, process-specific measurements, monitoring ownership, explicit admission/de-admission/rejoin criteria and documented residual availability risk. NTP “synchronized” alone is insufficient. |
| Shared trusted clock authority | Could provide one explicit issue/verify time domain for colocated services. Adds a trust/availability dependency; stale or uncertain samples cannot silently become valid time. Authority restart or time rollback must not extend token usability. | Higher complexity: authenticated local interface, authority epoch, permitted readers, latency budget, failure containment and operational ownership. Exact per-verification consultation versus cached anchors must be decided; cached anchors introduce uncertainty. Outage means fail closed. No authority or cache is implemented. |
| Bounded future-only `iat` allowance | Intentionally accepts some assertions early. Does not follow from a passing probe, and would change a current negative security expectation. Expiry, maximum age and `nbf` must receive no added slack. | Requires separately approved numeric δ and risk statement, precise claim/receiver-time comparisons and independent age enforcement compatible with pinned `jose`. Generic `clockTolerance` is excluded. The old 8 ms laboratory proposal remains unapproved, and no new δ is selected. |

`process.hrtime` is an interval clock with an arbitrary origin, not UTC. A silent swap to it or independent `performance.timeOrigin` anchors does not create a shared trusted wall-clock authority. [Pinned Node documentation](https://nodejs.org/download/release/v24.19.0/docs/api/process.html#processhrtimetime).

No authorized Ubuntu qualification host, hostname or access identity is supplied. The local Windows inventory only confirms that SSH and WSL client executables exist; that is not a designated target. No SSH connection, distro start, host construction, purchase or installation occurred. **Ubuntu qualification remains open.** On a designated host, first inspect the installed time service rather than assuming a default from a newer Ubuntu release. If Chrony is already present, `tracking`, `sources` and `sourcestats` are documented monitoring operations. No time-setting commands are proposed for the read-only phase. [Ubuntu 24.04 Chrony monitoring reference](https://manpages.ubuntu.com/manpages/noble/man1/chronyc.1.html).

## Separately approvable contracts and exact outstanding work

**A — Read-only target inventory and measurement authorization.** The owner must name the existing non-production host and access identity. Record OS/kernel/virtualization, exact Node/V8 executable/build identity, time-service identity and read-only synchronization/uncertainty metrics. Do not read credentials or change services/configuration. A separately approved ephemeral measurement harness should exercise all **six directed links** among three independent same-build peers for **30 minutes**, with staggered starts at **0/3/11 seconds**, at least **10,000 ordered exchanges per link** and **1,000 samples within ±10 ms of whole-second boundaries per link**. Count JWT future comparisons, local backward steps, observed uncertainty, latency and actual refusals separately. If quotas are unmet, report incomplete evidence rather than enlarging the campaign silently. These are proposed qualification sample counts, not executed tests or a production-wide bound.

**B — Clock-health admission contract.** Approve implementation only after A supplies target evidence. Proposed behavior: begin Not Ready; require a healthy named time source plus measured peer agreement; deny admission on any observed ordered future-`iat` discrepancy, local backward step, changed clock authority/boot identity or missing/stale health evidence. A proposed maximum health-observation age is **1,000 ms**, measured monotonically; it is an operational freshness candidate, not token slack or a proof of continuous agreement. No positive cross-peer allowance is proposed. Select an external UTC uncertainty limit from target/operator requirements before implementation—none is justified by current evidence. Readmission requires explicit healthy requalification, not automatic token regeneration or retries. Approve the remaining inter-observation availability risk explicitly. Keep the 15-second assertion span, one-use nonce handling, current authority checks and existing transport budgets.

**C — Restart/jump/outage qualification.** Actual service restarts, time-service outages, suspension or OS clock changes are outside read-only authorization and need a separate non-production fault-test approval. The proposed matrix is ten independent restarts per peer, receiver audience rotation, authority restart/outage, forward/backward simulated clock jumps at expiry boundaries and sleep/resume where relevant. Start with controlled test clocks; do not alter host time under A. Require expired/`nbf`/age/replay/audience/application/method/path/body/range and revoked-session negatives to remain refused, and record service availability separately. No rejoin can reuse the old receiver audience or resurrect sessions.

**D — Shared-authority fallback design.** If A/B cannot meet the required availability with zero tolerance, approve an architecture specification before code: one named authority/epoch and authenticated interface; no cross-host scope by implication; exact UTC/monotonic mapping; per-request consultation versus bounded samples; outage/restart/de-admission policy; audit custody; and compatibility within current deadlines. A clock discontinuity must fail closed rather than extend old assertions. No authority is implemented by this package.

**E — Future-only alternative, only after explicit security approval.** A proposal must select numeric δ from target evidence, specify precise `iat` representation/receiver comparison, independently enforce unchanged maximum age, strict expiry and strict `nbf`, retain `exp = issuedAt + 15`, all cryptographic/request/release bindings, replay capacity/cleanup and current User/enrollment/session/epoch/resource checks. It must test δ−ε/δ/δ+ε and exact expiry/age/`nbf`, jumps, restart and revocation. Early-acceptance risk must be approved as a security contract change. No token backdating, generic library tolerance or expiry extension is permitted by the current authorization.

## Fresh verification and preservation

| Run | Result |
| --- | --- |
| `trace-001` | Failed the initial-field count witness before planner entry; **151 Data tests passed**. Exact copied helper and diagnostics are retained. |
| `focused-001` | **151 unchanged I-AM tests and 14 Stage 5 tests passed**, uninstrumented. |
| `trace-002` | Complete diagnostic journey passed; **151 Data tests passed**, 98 planner allows and zero planner/JWT rejections. |
| `trace-003` | Independent complete diagnostic journey passed; **151 Data tests passed**, 98 planner allows and zero planner/JWT rejections. |
| `journey-001` | Uninstrumented journey passed Builder/save/reload/canonical checks, then failed Viewer policy staging with 403; **151 Data tests passed**. No overall pass. |
| `negative-001` | **152 Data tests and 14 Stage 5 tests passed**; unchanged control and all 13 deliberate stale/revision/revocation comparisons verified. |

Strict production type/import checks passed on the uninstrumented physical target. All four UI/Data missing-root and original-root configurations refused before initialization. Temporary diagnostic code is absent from the uninstrumented target. No extra uninstrumented rerun is represented as resolving the new 403.

The prior **545-entry** inventory, manifest SHA-256 `12e9585cbbcd682d15b8180d50b243834f58368e9739ca630c0ca53a6c3e4e1c`, is unchanged except `tests/fixtures/stage5-dataset-field-workflow.ts` for the readiness correction. Prior reports/evidence, production implementation, accepted Stage 1–4 behavior, single-sample RPC construction and owner-snapshot/fresh authority verification remain unchanged. Original Data evaluator source/build/tests and the existing WP3 increment are preserved. Only disposable Data evaluator/test copies were instrumented.

All **23 Component files and 234 native package files** rehash correctly; completed runs report equal before/after shared snapshots and zero original lock-directory events. Historical shared-runtime lock safeguards remain directory-only; no body access, acquisition, reconstruction, repair or recovery occurred. UI-Base remains read-only/clean at `732eec58ca3d4bd2521197b9d3b6c0457dbc6608`. Dependency manifests, pinned security identities/integrities and absence of install hooks remain verified. Raw physical targets, generated credentials/certificates, stores and unnecessary diagnostics are excluded; sanitized source identities, predicate evidence and reports are inventoried. Content review is scoped, not a universal absence proof.

## Updated qualification matrix

| Item | Local finding and outstanding qualification |
| --- | --- |
| P1 | Existing User/enrollment/provider fixtures preserved; actual Auth0/MFA/provider lifecycle unqualified. |
| P2 | Known stale predicates and legitimate negatives verified; historical stale first predicate, fresh untraced Viewer-stage 403, Windows clock availability and actual Ubuntu HTTPS/provider lifecycle remain blocked. |
| P3 | Permanent-ID edit/save/reload/canonical witnesses retained and readiness defect corrected; historical `field3`, target release/schema ownership, packaging/CSP and uninstrumented repeatability remain open. |
| P4 | Local process/filesystem/import/route boundaries preserved; Ubuntu accounts/ACLs/network/Caddy and credential custody unqualified. |
| A3 | Existing private transport/hash/version/refusal behavior retained; historical private-metadata 403, production ownership/storage and downloadable ZIP qualification open. |
| I1 | Local provisioning/onboarding retained; production identity/enrollment pending. |
| I2 | WP3 negatives pass; new uninstrumented Viewer staging refusal unresolved; independent Data maintainer review and production management qualification pending. |
| I3 | Supported Builder witnesses pass after readiness correction; historical field discrepancy and production/shared-scope qualification remain open. |
| I4 | Successful diagnostic Viewer row/field/write restrictions retained; complete uninstrumented repeatability and real application/identity qualification open. |
| I5 | Diagnostic public/protected route checks retained; target proxy/cache/site inventory and reliable complete execution open. |
| I6 | Controlled stale/revision/revocation checks fail correctly; historical stale cause, historical/new unexplained refusals, provider-only disable propagation and concurrent real-owner behavior remain open. |

No live provider registration/purchase, production operation, new host/clock authority, security timing policy, Stage 6/7 execution, staging, commit or push occurred. **Stop at this blocked Planner Freshness and Clock Decision Review Gate. No Stage 5 or overall V1 acceptance is declared or requested.**
