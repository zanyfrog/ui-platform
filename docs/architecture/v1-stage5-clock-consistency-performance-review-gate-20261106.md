# Stage 5 Clock Consistency and Performance Review Gate

**BLOCKED overall. The owner-snapshot performance correction is implemented and tested; no clock tolerance or timing-policy change is implemented. Stage 5 and UI Platform V1 remain open.** `main` remains at `d3729a13c8312d35be4fe61b784f84f9e3bd4446`; Data Services stays at `81b769eef3763d02343f5347888c26edab6ef7bc` with the existing four-file WP3 increment unchanged. Nothing is staged, committed or pushed.

## Clock findings

The accepted single-sample RPC construction is retained unchanged: integer `iat` is sampled once and `exp = iat + 15`. Its existing deterministic regression and 13 negative cases pass in the new full suite. No backdating, future allowance, expiry extension or general library `clockTolerance` is introduced.

The actual chain is JavaScript `Date.now()`/`new Date()`, V8's millisecond-valued platform clock, then the pinned JWT library's `Math.floor(milliseconds / 1000)`. On this runtime, Node's platform delegates to `SystemClockTimeMillis`; that routes through V8's OS clock implementation. The tagged Windows source interpolates high-resolution elapsed ticks from a locally sampled system-time anchor, with periodic or backward-change resampling. This is a source-supported mechanism for independent process offsets; it is not a measured claim about every binary/build or every individual rejection. Sources: [V8 Date clock dispatch](https://raw.githubusercontent.com/nodejs/node/v24.19.0/deps/v8/src/objects/js-objects.cc), [Node platform clock](https://raw.githubusercontent.com/nodejs/node/v24.19.0/src/node_platform.cc), [platform helper](https://raw.githubusercontent.com/nodejs/node/v24.19.0/deps/v8/src/init/v8.cc), [Windows clock implementation](https://raw.githubusercontent.com/nodejs/node/v24.19.0/deps/v8/src/base/platform/time.cc).

The live probes compare **message order**, not uncalibrated `performance.now()` values from different processes. Each exchange records parent send, child receive/send, parent receive and local monotonic samples. All are measurements, not assertions that the host satisfies the security clock contract.

| Independent process pair | Exchanges | Child timestamp ahead of later parent receive | Whole-second future-`iat` ordering | Observed receive-minus-send range |
| --- | ---: | ---: | ---: | --- |
| First Vitest/Node pair | 200,000 | 162,360 | 141 | −1 to 0 ms |
| Second Vitest/Node pair | 200,000 | 0 | 0 | +1 to +3 ms |
| Separate plain Node/Node pair | 200,000 | 200,000 | 1,532 | −7 to −6 ms |

The plain Node pair rules out treating this only as a Vitest-context artifact. Neither peer in that pair recorded a local backward step during its approximately 5.5-second probe. Independent sampled wall clocks nevertheless violated the ordering required by strict zero-future-`iat` verification. Integer-second conversion magnifies a small offset at the boundary; **ordinary same-clock flooring alone does not produce it**.

Controlled tests confirm that same-clock samples before and across a second boundary pass, while receiver-behind cases of 1 ms and 4 ms and a backward-clock scenario fail under the current policy. The tests distinguish representation from inconsistent clock observations; they do not authorize accepting genuine future issue times.

A read-only Windows Kernel-General event query first failed in the restricted context, then succeeded in an expanded read-only context. It recorded a **−1,673.8801 ms** adjustment at `2026-11-06T15:05:44.8505996Z`, followed by two small forward changes. These events precede the live probe windows and are **not attributed as their cause**. Only old/new timestamps and numeric reason fields were retained; no clock configuration was changed. `host-clock-events.json` retains the observations. The event reason is not interpreted as proof of a specific NTP or virtualization cause.

## Performance root cause and bounded correction

The Stage 5 adapter previously called `inspectDevelopmentDataset` on every resource lookup. That helper constructed and closed a registry on each call. Consequently the adapter could not use the existing Data-owned `AppliedResourceRegistry.withVerifiedSnapshot` API already employed by the accepted Data host around planner validation.

The correction is restricted to `applied-integration.ts` and the local host composition in `stage5-integration-process.ts`:

- Keep the original canonical inspector as startup preflight. Construct the **same public Data-owned manager, qualified resolver and resource registry** once for the host, using dependencies already declared by the owning Data package. No package installation or dependency-manifest change.
- Wrap **each planner `plan` and each `assertCurrent` separately** in the existing owner snapshot. The Data API checks owner revision, shares verification only inside that validation scope, clears scope state in `finally`, and performs fresh external verification before returning. There is no cross-point or cross-request authorization cache.
- Keep every binding call. Binding-only paths no longer fetch an additional full schema value merely to discard it; the owner still verifies canonical schema, publication history, applied state, mapping and ownership. Explicit `inspect()` still returns the actual published schema.
- Bind the retained registry handle to its declared backing-file identity and check it before/after binding and scope operations. Replacement requires refusal/restart, not reuse of a detached old handle. This is not a claim of adversarial filesystem race-proofing; coordinated owner lifecycle, host accounts and Linux storage behavior remain qualifications.
- Expose an explicit host `close()` for the retained handle. Caller shutdown/drain and production owner-generation wiring remain unqualified. No Data Services source, security/planner contract, permission ceiling or identity behavior is changed.

The counted before regression records **16 canonical verifications for eight binding calls at one validation point**. The same test source after correction records **two** and then **two fresh verifications at the next point**. Applied-state corruption during and between points, owner revision mutation, and foreign resources are refused. The two earliest prototype-counter attempts observed the wrong module identity and returned zero; they are retained as failed harness attempts and excluded from the performance claim. The valid counter was injected only into **disposable generated resolver output**, with before/after hashes; no original Data source or generated installation was patched.

## Actual elapsed profile

The post-correction diagnostic browser run passed completely. Its Form write measured **3,539.885 ms**, compared with the earlier independently recorded **11,651.114 ms** sample. This is an observed comparison across fresh runs, not a universal latency guarantee or a controlled host-load benchmark. The deterministic 16-to-2 verification-count test supplies the specific causal regression.

The Form still made **644 binding checks and 206 current-session checks**. The correction reused canonical work only in the approved owner validation scopes; it did not suppress these checks. The new trace records 108 canonical resolver verifications. Three planner plans, four current assertions and 17 release hash passes remain present. Database work remains brief relative to validation.

`critical-path.json` retains request wall time and parent/child spans. At each parent, **the union of child intervals** is subtracted to find exclusive time. Top-level interval union plus unattributed remainder equals request elapsed time. Parallel and nested inclusive totals are not summed into wall time. Cross-process RPC waits stay inside their calling session-check span. This provides elapsed-path accounting rather than relabeling the old overlapping 30-second aggregate as a sequential request cost.

For the first Form write, top-level span coverage is **3,520.447 ms** and the unattributed remainder **19.438 ms**, totaling **3,539.885 ms**. Form read-back covers **1,686.447 ms** plus **18.265 ms** remainder, totaling **1,704.712 ms**. The full parent/child tree is retained so these values can be checked without adding overlapping inclusive measurements.

The new profile also records successful Form read-back. It does not retrospectively explain the old 16.3-second request or reproduce its exact transport exception. Proof budgets and transport deadlines remain unchanged: one-second factory proof default, 15-second local test proof budget, three-second service-RPC timeout and 15-second runtime/management transport deadline. Writes are never automatically retried.

## Fresh verification outcomes

Every attempt is separate in `attempts.json`, with exact source/test inputs and immutable raw-report hashes. No partial runs are combined into a passing result.

- **Owner-snapshot regression:** the valid before test fails the count bound and scoped owner-revision case; the final after test passes all three cases. Intermediate guard/binding refinements and both invalid-counter attempts are recorded.
- **Clock tests:** controlled semantics and independent ordering probes pass as measurement tests; their recorded ordering anomalies are failures of the host's zero-future-time availability assumption, not a passing clock qualification.
- **Unchanged Data owner tests:** **72 passed** across registry, resolver and canonical verification suites in the verified physical Data target.
- **First uninstrumented full run:** **151 I-AM tests passed; 45 Platform tests passed, one failed and one existing test remained skipped.** The accepted RPC boundary regression passed. The browser reached private metadata access and received unexpected HTTP 403. Its first internal denier is untraced and remains a blocker; it is not automatically labeled a clock refusal.
- **Second uninstrumented journey:** **passed in 88.067 seconds**, after **63 focused WP3 tests passed**, using new stores, processes and credentials. It verifies management Viewer staging/activation, publication A after draft B, Form commit/read-back, Viewer row/field restrictions, private metadata/download/thumbnail/range/cache behavior, management separation and open-session revocation.
- **Profiled journey:** separately passed in 85.016 seconds with temporary timing instrumentation. It is diagnostic performance evidence, not an uninstrumented repeatability substitute.

Temporary implementation diagnostics and generated counters are absent from the final full/browser targets. Strict production type/import and four missing/original-root isolation checks are recorded separately. The historical `PLAN_EVIDENCE_STALE` and historical uninstrumented refusals remain qualified as unresolved unless a specific trace establishes their cause; performance improvement does not erase them.

## Clock decision and separate proposal — not implemented

**Current decision: retain zero future allowance and keep the integration gate blocked.** The measured process ordering demonstrates why a zero-future-time availability guarantee cannot be assumed for this host. No justified production-wide upper bound follows from three short probes.

A future review can compare two alternatives:

1. **Coherent clock authority:** define a shared, trusted clock source/epoch for the service peers, with startup, restart, suspension and wall-clock-adjustment handling. A common clock domain could preserve strict future rejection and exact expiry without tolerance. The authority, distribution and lifecycle must be specified; simply swapping to an independently anchored monotonic epoch is not proof of cross-process agreement. No such protocol is implemented here.
2. **Explicit future-only policy:** an **8 ms laboratory candidate** covers the largest **7 ms observed integer-millisecond lead** plus one millisecond of representation margin; it is **not a demonstrated host bound or a production recommendation**. Candidates of 1 ms and 4 ms do not cover the observed 7 ms pair. Larger startups, host adjustments or sleep/resume may exceed 8 ms; the recorded 1.674-second adjustment must remain a fail-closed clock-health event, not be absorbed as tolerance.

The second alternative changes the accepted negative expectation: a genuine 1 ms future assertion currently fails and would intentionally become early-acceptable. Its effective early-acceptance window grows even if the `exp` field is not extended. This requires explicit separate authorization. The pinned library floors receiver time for `maxTokenAge`, so adding `clockTolerance: 0.008` would not correctly express the proposed millisecond boundary, while a blanket one-second setting would relax expiry/`nbf` and is excluded.

Before implementation, the proposal must specify independently enforced issue-time/age precision while retaining strict expiry and `nbf`, the unchanged 15-second assertion span, replay/nonces, mTLS service identity and method/path/body/audience binding. Proposed tests must include 0, 1, 4, 7, 8, 8.001 and 9 ms future offsets, exact expiry, future `nbf`, age, replay, misbinding, clock jumps and peer restart. These are proposed policy tests, **not claimed executed implementation tests**. Longer, multi-start and target-host measurements are required before selecting a bound. No allowance is implemented or requested as implicit local acceptance.

## Preservation and remaining qualifications

The prior **297-file inventory** and its manifest identity remain unchanged except the two authorized performance files. The accepted RPC correction, its deterministic test and all other prior evidence remain unchanged. Data Services' existing WP3 source/test increment is byte-identical; the original owner SDK source and generated resolver remain unchanged. UI-Base remains read-only and clean at `732eec58ca3d4bd2521197b9d3b6c0457dbc6608`.

All **23 Component files and 234 native package files**, dependency manifests, pinned security identities/integrities and install-hook absence are reverified. Native admission, development identity guards and the accepted directory-only preservation safeguard remain intact. No historical shared-lock body is accessed, reconstructed, acquired, repaired or recovered. Exact source/test/sanitized evidence SHA-256 values are in this package's `changed-file-hashes.json`; disposable copies, generated credentials/stores and unnecessary raw diagnostics remain outside its proposed inventory.

Independent Data maintainer review remains required. The Windows ZIP subprocess limitation is retained: prepared-tree scans do not verify a downloadable archive, and the exporter is unchanged. All **P1–P4, A3 and I1–I6** production qualifications remain open, including actual Auth0/MFA/lifecycle, Ubuntu/Caddy, independent Linux accounts, credentials, real release/schema/private-asset ownership, final CSP and operator qualification. No production operation, purchase, provider registration, Stage 6 or Stage 7 execution occurred.

**Stop at this blocked Clock Consistency and Performance Review Gate. No integration acceptance, commit or push.**
