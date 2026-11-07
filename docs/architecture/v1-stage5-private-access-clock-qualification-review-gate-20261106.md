# Stage 5 Private-Access and Clock Qualification Review Gate

**BLOCKED. Stage 5 and overall UI Platform V1 remain open.** The historical unexpected private-metadata HTTP 403 is still unattributed. New diagnostic journeys did not reproduce it. One fresh uninstrumented journey passed, while another failed earlier in Dataset authoring. Neither later passes nor measured clock differences establish the cause of an earlier untraced refusal. No implementation defect within the approved private-access contracts was demonstrated, so no security implementation correction was made.

UI Platform remains on `main` at `d3729a13c8312d35be4fe61b784f84f9e3bd4446`; Data Services remains at `81b769eef3763d02343f5347888c26edab6ef7bc`. All existing integration/WP3/RPC/owner-snapshot changes remain uncommitted. The user's acceptance of the bounded owner-snapshot performance correction is retained for its demonstrated local scope; it is not Stage 5 acceptance.

This package follows [the preceding clock/performance gate](v1-stage5-clock-consistency-performance-review-gate-20261106.md). Evidence is under `evidence/v1-stage5-private-clock-20261106/`. `attempts.json` records all ten launch attempts, including test/preparation failures. `changed-file-hashes.json` inventories proposed changed source, tests, review records and sanitized evidence across UI Platform and Data Services, excluding itself and ignored disposable targets.

## Private-metadata refusal investigation

**Exact attribution of the historical `full-001` refusal: unknown.** Its browser assertion at `tests/fixtures/stage5-integration-journey.ts:168` received HTTP 403 instead of 200. The runtime can produce this status itself, or translate a Data-side 403. Data can refuse at internal assertion verification, current identity/session authority, release authority, I-AM permission/resource checks, or private storage/index/version/hash checks. The retained original evidence does not discriminate these components. The relevant historical inventory remains unchanged. No request-specific evidence permits labeling that original refusal an `iat` failure, stale plan, missing permission or asset defect.

Two fresh diagnostic journeys instrumented **only physical disposable copies**. Each request carried an opaque local correlation identifier across fixed internal transports. Server-owned AsyncLocalStorage context and the existing parent IPC channel collected route classes, process-local monotonic durations, numeric JWT `iat`/`exp`/`nbf`, library rejection code/claim/reason, boolean authority outcomes and response status. No cookies, bearer assertions, signing keys, enrollment records, private content, provider credentials or raw request bodies were logged. Private route asset/version identifiers were replaced with placeholders. Cross-process records are joined causally; their wall clocks are not sorted into an assumed exact global order.

The trace covers browser runtime entry/response, both current browser session reads, remote enrollment/current identity, service RPC signature/audience/claim validation, actor assertion validation, current session/epoch checks, I-AM lease, release lease, private authorization/current assertions, private owner lookup and byte-read/response stages. I-AM permission and resource checks remain inside the original `asset.authorize` / current-check calls; the harness did not replace them. Detailed internal evaluator denial reasons are not claimed where only that enclosing stage was observed.

- `trace-004`: complete diagnostic journey passed in **111.715 seconds**. There were **24,024** trace events and no JWT rejection.
- `trace-005`: complete diagnostic journey passed in **172.727 seconds**, including **60 additional sequential private-metadata reads**, each independently recorded with status 200. There were **43,644** trace events and no JWT rejection. The additional reads were separate observations, not retries of failed requests.
- Both runs preserved the intentional post-role-revocation metadata 403. In `trace-005`, correlation ID `bc45cbc2-3ff6-4cfc-a01a-5299a68191cb` reached Data `asset.authorize`, completed private-owner lookup, then failed authorization and was translated by `PrivateAssets` to 403 and forwarded by runtime. JWT, identity/session and release stages had completed. This is attribution of an **expected revocation refusal**, not the historical unexpected refusal.
- Anonymous, guessed/foreign resources, malformed paths, revoked access, HEAD/range/cache behavior and management separation retain focused negative coverage and the successful fresh journey's checks.

The first instrumentation attempt failed at preparation string quoting, before any target was launched. A second failed creating a Windows dependency junction under restricted permissions, before tests. `trace-003` then failed because the initial temporary trace collector attempted a filesystem write from the read-only runtime child. Collection was moved to existing IPC; the runtime filesystem restriction was retained. All failures are separately recorded. No production permission was widened. Temporary diagnostics never entered original implementation sources and are absent from both final uninstrumented targets. Their exact disposable source variants and hashes remain reviewable.

**No bounded implementation fix or before-failing/after-passing implementation regression is claimed.** The evidence did not demonstrate an approved-contract defect to fix. Altering timestamp policy to explain away the historical refusal would exceed this authorization.

## Longer clock and restart measurements

`clock-002` ran a plain Node parent with independently spawned plain Node peers for **80.067 seconds**, from **2026-11-06T18:25:24Z to 18:26:44Z**. Starts were staggered at approximately 0, 3 and 11 seconds; the 3-second peer was terminated and replaced at approximately 35 seconds. The initial peer remained alive through the minute boundary. All processes used Node `v24.19.0` / V8 `13.6.233.17-node.51` on Windows. Vitest launched the measurement parent but did not supply its clock.

Ordered IPC records compare child send to later parent receive, and parent send to later child receive. A negative child-send-to-parent-receive delta proves a clock-ordering discrepancy for that exchange; a positive delta includes transport/scheduling delay and is not an exact offset. Process-local monotonic values are not directly compared across processes.

| Peer | Exchanges | Child-send → parent-receive min/max | Future integer `iat` cases | Local backward steps, parent/child |
| --- | ---: | --- | ---: | --- |
| Initial | 5,094 | −3 / +5 ms | 2 | 0 / 0 |
| Start +3s, stopped +35s | 2,050 | −4 / +3 ms | 3 | 0 / 0 |
| Start +11s | 4,354 | −4 / +1 ms | 3 | 0 / 0 |
| Restart +35s | 2,831 | +3 / +8 ms | 0 | 0 / 0 |

There were **14,329 exchanges and eight future-NumericDate comparisons** in total. These counts evaluate the current strict issue-time inequality on measured clock pairs; they are not eight observed failed HTTP requests. The prior deterministic tests using the pinned JWT verifier establish rejection semantics at a receiver's whole-second boundary. Those tests and strict validation remain unchanged.

Ten-second bucket samples changed during the observation. For example, the initial peer's delta was −2 ms in early buckets and 0/+1 ms around 60–80 seconds. The restarted peer's sampled delta was +3 ms at 40–50 seconds and +7/+8 ms at 60–80 seconds. Restarting does not establish a common clock domain. The new run does not supersede the preceding run's measured 6–7 ms lead or establish a universal maximum.

The read-only Windows System event query at `18:28:14Z` found **zero Kernel-General clock-adjustment events in its preceding 30-minute window**, which includes this probe. That means no such event was found, not proof that all OS time behavior was unchanged. The earlier recorded **1.674-second backward adjustment** remains historical evidence outside this probe window. It is not attributed as the cause of these new observations. No host time configuration changed.

The Windows process-local clock mechanism examined in the preceding report is consistent with independent anchors and changing relative offsets; these measurements do not prove an exact per-exchange native call path or NTP cause. **Ubuntu remains unmeasured.** No separately identified and authorized non-production Ubuntu target was available in this task. Windows offsets must not be transferred into a Linux qualification claim. No host was installed, started or deployed to manufacture a target.

`clock-001` failed before measurement because the new test-only child fixture lacked a closing function brace. Its failed report and exact copied fixture are preserved. The corrected independent `clock-002` passed as a measurement test, not as proof that the zero-future availability assumption holds.

## Timing-policy decision package — no implementation authorization

**Recommendation: retain current zero future tolerance in this increment and keep timing qualification blocked. Do not implement 8 ms or any other allowance based on the current samples.** The current host does not support an unconditional zero-future-time availability claim between independent Node clocks. Additional passing journeys do not change that fact.

| Option | Feasibility and complexity | Required separate decision |
| --- | --- | --- |
| Retain zero tolerance and current clocks | Lowest implementation change; secure refusals remain possible at boundaries. Startup checks alone cannot prove agreement after restarts, long runtimes or host adjustments. | Accept a documented local availability limitation or authorize a fail-closed clock-health design and a target qualification campaign. This is not production acceptance. |
| Shared trusted clock authority | Can preserve one issue/verify time domain, but requires an explicit authenticated authority, failure handling, epoch distribution and restart semantics. Independent process-local monotonic origins alone do not provide it. Consulting a central clock adds latency and a new availability/trust dependency; uncertain distributed samples cannot silently be treated as exact. | Approve architecture and threat model first; specify precision, uncertainty, host boundaries, health gating and how current 3s/15s deadlines remain viable. No service or native clock adapter has been implemented. |
| Separate future-only rule | Requires changing the accepted future-`iat` negative contract and replacing or separating the pinned library's floored `maxTokenAge` future check. A general `clockTolerance` would also affect expiry/`nbf` and is excluded. Current measurements cannot justify a production bound. | Select a numeric bound from target evidence and explicitly accept its early-acceptance risk. The historical 8 ms laboratory proposal remains unapproved and unimplemented. |

If a future-only design is separately approved, its proposed contract must specify all of the following before code changes:

| Check | Required explicit contract |
| --- | --- |
| Issue time | Define finite claim precision and the exact future comparison in milliseconds, with a separately approved numeric δ. No backdating, receiver timestamp substitution or silently rounded one-second slack. Integer `iat` does not retain the sender's subsecond issue instant. |
| Expiry | Strictly reject at/after `exp`, without adding δ. Keep the original `exp = issuedAt + 15` construction and reject a span above 15 seconds. No expiry extension. |
| Maximum age | Define the exact receiver-age comparison independently from future allowance; no age extension by δ. Verify compatibility against pinned JWT behavior before adopting any more precise comparison. |
| Not-before | Reject while `now < nbf`, with zero not-before allowance. Future-only δ must not enter this comparison. |
| Replay | Preserve issuer/nonce isolation, bounded nonce storage, expiry-based cleanup and no reuse. No automatic retry of writes or reissuing authority after a rejected assertion. |
| Identity and binding | Retain EdDSA, mTLS peer fingerprint, service/path admission, audience/issuer/type, application, method/path/range/body and release binding. Clock health never supplies User authority. |
| Revocation | Preserve each current enrollment/User/session/epoch/policy/resource/schema/release verification; no new authority cache. |
| Clock jumps and health | Define detection against a trusted reference, permitted uncertainty and fail-closed behavior. A large backward jump must not prolong usable assertions or be absorbed into δ. A forward jump may refuse assertions; recovery must reestablish health explicitly. |
| Restart | Preserve fresh receiver audiences, lost in-memory replay/session state and session invalidation. Define clock-authority epoch changes; require healthy rejoin before serving. Restaging remains required for instance-bound administration candidates. |

A separately authorized validation matrix must cover δ−ε/δ/δ+ε, exact expiry, age and `nbf`, replay/capacity, all misbindings, role/epoch/User revocation, long-lived peers, staggered restarts, sleep/resume, forward/backward host jumps and clock-authority outage. δ is **not selected** here. No policy-changing implementation or changed expectation was tested or accepted in this package.

## Fresh verification and the additional Builder/setup failure

| Attempt | Outcome |
| --- | --- |
| `focused-001` | **14 Platform security tests passed**, plus **63 WP3 tests passed**. RPC boundary/negative regression, real mTLS/internal assertion refusal cases, session/identity lifecycle, private assets, process filesystem restrictions and finite predicate contracts remain covered. The 15-second real RPC probe made **889 calls with zero refusals**; that sample does not prove all clock boundaries safe. |
| `journey-001` | **Failed at test line 170**, before protected service startup: saved Dataset keys were `id,name,quantity,field3`, expected `id,name,quantity,active`. The test had observed “Saved”, validated and applied that saved definition. This proves a saved-definition/test-expectation discrepancy; it does not distinguish an editor/save race from automation input loss. No clock or authorization cause is established. |
| `journey-002` | **Complete uninstrumented journey passed in 97.439 seconds**, plus **63 WP3 tests passed**. Uses new stores/processes/credentials; verifies public Page, publication A after draft B, Form commit/read-back, Viewer row/field restrictions and denied write, private metadata/download/thumbnail/HEAD/range/no-store, management separation and open-session role/epoch/User/template revocation. |
| Production boundaries and isolation | Strict production type/import checks passed in the final uninstrumented physical target. All four UI/Data missing-root and original-root cases refused before initialization. |

The Dataset discrepancy is retained as an additional repeatability blocker. No Builder implementation or test expectation was changed to obtain a pass. It is outside the authorized private-access implementation correction; further Builder/save investigation requires separate scope. The second independent journey does not resolve it. No partial runs are combined into an overall passing result.

All proof budgets and deadlines remain byte-identical: one-second default proof budget, 15-second local qualification budget, three-second service-RPC timeout and 15-second runtime/management transport deadlines. Accepted single-sample issue time with the original 15-second lifetime and scoped owner-snapshot/fresh verification remain unchanged. No dependency, Data contract, private ownership rule or security semantics changed.

## Qualification matrix and preservation

| Item | Current demonstrated local scope | Remaining qualification |
| --- | --- | --- |
| P1 | Existing provider cryptographic fixtures and local I-AM User/enrollment integration | Actual Auth0 plan/tenant/MFA, enrollment and provider lifecycle remain open. |
| P2 | Current mTLS/RPC/session/epoch checks; focused tests and one fresh full journey pass | Historical unexpected private 403 unattributed; clock availability and fresh-run repeatability blocked; target HTTPS/provider lifecycle and credentials unqualified. |
| P3 | Actual publication/applied schema, frozen Form/query and A after B in successful journeys | New saved Dataset field discrepancy; target serving/release/schema ownership, packaging and final CSP remain open. |
| P4 | Separate processes/credentials, runtime filesystem restriction, route/import boundaries | Ubuntu sizing/accounts/ACLs/network/Caddy/distribution and credential custody unqualified. |
| A3 | Real private index/version/hash, thumbnail/range/HEAD/no-store and intentional revocation refusal | Original metadata refusal unattributed; production asset ownership/storage/custody and downloadable ZIP verification open. |
| I1 | Existing local provision/onboard and explicit runtime User grants | Production identity/enrollment pending. |
| I2 | Existing finite template administration, current WP3 activation, revocation and audit checks | Independent Data maintainer review and production management-origin qualification pending. |
| I3 | Editor Dataset/Form/Page flow succeeds in complete runs; Publisher separation retained | New saved-definition discrepancy and production/shared-scope qualification remain open. |
| I4 | Fresh successful Viewer row/field restrictions and denied write | Real identities/final applications/assets on target and repeatability unqualified. |
| I5 | Fresh successful public Page and authenticated protected routes, bypass refusals | Target proxy/cache/public-site inventory and overall repeatability unqualified. |
| I6 | Fresh role/epoch/User/template revocation and focused negative checks | Historical `PLAN_EVIDENCE_STALE`, unexplained historical refusals, provider-only disable propagation and concurrent real-owner writers remain open. |

The preceding **373-file inventory** verifies byte-for-byte with no exceptions. Its manifest SHA-256 is `959b91949bd3b9a7258ad4e3816d0bd3b55a91c65f546f666c7dbd420cd2663a`. New work consists of the isolated diagnostic/clock harness, measurement test/fixture, evidence recorder and this review package. No prior implementation, dependency manifest, accepted test or evidence file changed. Data Services' existing four-file WP3 increment is unchanged. UI-Base stays clean/read-only at `732eec58ca3d4bd2521197b9d3b6c0457dbc6608`.

All **23 Component files and 234 native package files** rehash correctly. Completed attempts report equal before/after shared snapshots and zero original lock-directory events. The failed junction preparation never reached test startup; final independent preservation hashing still verifies the original files. Original shared-runtime lock checks remain directory-only: no lock body was read, acquired, reconstructed, repaired or recovered. Native admission and global recovery policy were untouched.

Pinned security dependency versions/integrities and absence of install hooks are reverified against unchanged manifests. Proposed new evidence excludes credentials, temporary certificates, private bytes, runtime databases, physical copies and unnecessary raw diagnostics. Selected masked screenshots and redacted request traces are preserved with exact source identities. Content scanning is bounded evidence review, not a universal absence-of-secrets proof.

Windows ZIP export remains unverified: prepared-tree scans do not prove a downloadable archive, and the exporter is unchanged. Independent Data maintainer review remains required. No Auth0 registration, purchasing, credential generation for a real environment, production host/network/DNS/firewall change, Stage 6 or Stage 7 execution occurred. Disposable test credentials stayed outside the proposed inventory. No staging, commit or push occurred.

**Stop at this blocked Stage 5 Private-Access and Clock Qualification Review Gate. No integration or production acceptance is recommended.** The next decisions are scope for the new Builder/save discrepancy and a separately reviewed clock architecture/policy; the historical private 403 remains an explicit unresolved qualification.
