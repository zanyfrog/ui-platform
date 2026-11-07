# Stage 5 Timing and Reliability Correction Review Gate

**BLOCKED overall. One bounded RPC sender defect is corrected; end-to-end reliability is not accepted. Stage 5 and UI Platform V1 remain open.** UI Platform stays on `main` at `d3729a13c8312d35be4fe61b784f84f9e3bd4446`; the Data Services baseline and existing four-file WP3 increment are unchanged. Nothing is staged, committed or pushed.

## Deterministic boundary finding and correction

The pinned `jose` 6.2.15 implementation floors JavaScript dates to integer NumericDate seconds. Its default `setIssuedAt()` samples `new Date()`; `setExpirationTime('15s')` independently samples another `new Date()` and adds 15. The verifier floors its current date, rejects future `iat` when `maxTokenAge` is specified, rejects `exp <= now`, rejects `nbf > now`, and checks maximum age. No general clock tolerance is configured.

The controlled-clock regression uses the real RPC client, real loopback mTLS, EdDSA assertions and the actual RPC verifier. Sender samples on opposite sides of a whole-second boundary demonstrate the defect **before correction**: `iat = N`, `exp = N + 16`, and the receiver refuses the locally generated assertion because its lifetime exceeds the existing 15-second ceiling. The receiver's strict check is correct; the sender generated an inconsistent pair of claims.

The only retained implementation correction is in `src/server/production/service-rpc.ts`: capture `issuedAt = Math.floor(Date.now() / 1000)` once, then pass `issuedAt` and `issuedAt + 15` explicitly to the builder. There is no backdating, extra lifetime, tolerance, cached authorization, retry or verifier relaxation. Internal actor assertions already used a single sample and are unchanged.

The **same regression source** fails before and passes after the patch. Its 16 labeled scenarios include 13 actual refusals: exact expiry, genuine future issue time at 1 ms and one second, future `nbf`, excessive age, replay, wrong audience/service/body/path/method/lifetime, and wrong signature. The valid boundary, just-before-expiry and first-use cases pass. This is one test with recorded scenarios, not 16 separately counted tests. `boundary-before.json` and `boundary-after.json` retain exact inputs, numeric observations and source hashes.

**This does not fix the previously observed future-`iat` rejection.** With integer timestamps sampled from one correctly ordered clock, normal flooring does not make the issue time future. The deterministic 1 ms receiver-behind case still fails, deliberately. The sender/receiver samples in earlier and current traces are genuinely inconsistent under the existing zero-future-time contract. Their underlying host cause—clock adjustment, process sampling or another timing effect—is not established; the normal quantization defect must not be conflated with it.

No future-time allowance is implemented. A measured 1 ms or 4 ms discrepancy is not a maximum bound. Any availability policy permitting genuinely future-issued assertions needs separate explicit review, including expiry/age/not-before semantics; a blanket `clockTolerance` option would affect more than the issue-time check and remains excluded.

## Committed write and read-back attribution

The corrected diagnostic run reproduces the exact **class of committed-write/read-back failure**, with separate request correlation IDs and contract labels:

| Request | Data wall time | Result |
| --- | ---: | --- |
| Page on-load query | 3,887.396 ms | HTTP 200 |
| Form write | 11,651.114 ms | HTTP 200; Form reports the write committed |
| `form-read` | 424.540 ms | HTTP 403; read-back fails |

The first rejecting component for `form-read` is **Data's `ServiceRpcVerifier`**, validating a runtime-to-Data `/identity/current` assertion. The captured JWT error has `claim=iat`, `iat=1793975730`, `exp=1793975745`, and receiving-clock sample `1793975729.996`: the issue-time second is **4 ms ahead of the sample immediately after rejection**. mTLS/key resolution and signature/audience validation precede that claim rejection. The assertion already has the corrected 15-second span.

The refusal propagates through the runtime's remote enrollment-current check, its session-status reply, Data's current-session check, I-AM's current-decision assertion (`DECISION_STALE`), and the Data HTTP boundary. This is a current-authentication failure, not a demonstrated business-permission denial, WP3 ceiling failure, schema/release mismatch or expired Form decision. The Form preserves **“Write committed. Read-back or post-commit processing failed”** and does not retry the write.

This directly attributes the new traced read-back incident. It does **not** uniquely establish the first denier in the previous uninstrumented incident, which lacked internal tracing. No separate lifecycle correction is justified by this trace: allowing this RPC would change the zero-future-time contract, so that remains blocked for separate approval.

## Deadline breakdown and stale-plan classification

`review-evidence/readback-and-latency.json` records per-request wall time, component counts, inclusive elapsed time, decision stamps, planner assertion stamps and rejection chains. Inclusive measurements overlap and nest; **they must not be added into a critical path**.

For the 11.651-second Form write:

| Component | Recorded work |
| --- | --- |
| Release byte/link checks | 17 hash passes; 450.621 ms inclusive hash time; 974.644 ms inclusive complete current-release assertions |
| Canonical applied-schema/registry inspection | 644 calls; 30,135.938 ms summed **overlapping** inclusive time; maximum single call 142.419 ms |
| Dataset planner | Three plan calls, 5,877.922 ms inclusive; four current assertions, 4,133.200 ms inclusive |
| Current identity/session checks | 206 session checks, 2,694.882 ms inclusive; 207 nested RPC server responses, 933.161 ms inclusive |
| Database work | Begin transaction 0.073 ms; insert 0.285 ms; persist 1.607 ms; three queries total 0.587 ms |
| Response | Successful Data response at 11,651.114 ms; response wall time includes the above work |

Repeated canonical inspection is a measured cost and a candidate for future focused profiling. It is **not yet demonstrated safe-to-remove work**: current resources, ownership and schema must remain authoritative at every required check. No authorization/resource cache or Data subsystem change is introduced to hide the cost. Database work is brief in this measured case; that is not a general contention guarantee.

The earlier request with at least 16,303.663 ms of Data work is retained in its immutable provenance. This new request remains below 15 seconds and therefore does not reproduce that deadline failure. The historical exact transport exception and critical path cannot be recovered retrospectively. The diagnostic transport instrumentation can record actual timeout errors, but no new timeout is observed in this diagnostic run. Unknown-outcome writes remain unknown; they are not relabeled uncommitted or retried.

The new read-back `DECISION_STALE` follows a failed current identity/session recheck. It is distinct from the historical **`PLAN_EVIDENCE_STALE`**, which has not been reproduced with issue/expiry/current-comparison evidence here. That historical cause remains unresolved. Neither an identity failure nor a long total request proves planner-proof expiry. The one-second factory proof default, 15-second test proof budget, three-second RPC timeout and 15-second runtime/management transport deadline remain unchanged.

## Fresh verification and repeatability

Every attempt uses a verified disposable physical copy and is recorded independently in `attempts.json`, including both sides of the deterministic regression. Temporary diagnostics are preserved as source provenance and selected redacted evidence, then removed from implementation and browser fixtures before final runs.

The first uninstrumented post-correction full run passes **151 I-AM tests and 44 Platform tests**, with **one integration failure and one existing skip**. It receives generic HTTP 403 during initial Viewer-policy staging. Its first internal denier is not captured, so it is not automatically attributed to either clock defect. The retained ten Stage 5 security tests, compiled contract/owner-lock checks and targeted Stage 1–4 regressions pass in that run.

The second planned uninstrumented browser attempt uses distinct stores, service processes and credentials and **passes the complete journey in 119.469 seconds**, after **63 focused WP3 tests pass**. It verifies publication A after draft B, committed Form/read-back, Viewer row/field filtering, private metadata/download/thumbnail/ranges, management isolation and open-session role/epoch/User/template revocation. Its exact result is recorded in `review-evidence/journey-002.json`. This is one passing journey; it does not supersede the independent full-run failure or establish sustained reliability. No partial outcomes from separate runs constitute a full pass, and repeated complete qualification remains blocked.

Strict production type/import checks and all four missing/original-root isolation refusals are recorded separately. The deterministic unit result is not a substitute for the browser gate.

## Preservation and review inventory

The evidence recorder verifies the preceding **249-file inventory** unchanged except the exact approved RPC sender patch, verifies its inventory manifest identity, and checks the patch against the actual before-test source. Data Services' existing WP3 source/test changes remain byte-identical. UI-Base stays clean at `732eec58ca3d4bd2521197b9d3b6c0457dbc6608`.

All **23 Component files and 234 installed native package files** retain their hashes. Dependency manifests, pinned security package identities/integrities and absence of install lifecycle hooks are rechecked. Native admission and development identity guards are unchanged. The accepted directory-only preservation safeguard is retained; no historical original graph-lock body is read, reconstructed, acquired, repaired, recovered or mutated.

`changed-file-hashes.json` inventories the final source, tests, records and sanitized evidence with SHA-256. Disposable runtime copies, generated credentials/stores and unnecessary raw diagnostics remain excluded from the proposed inventory. Exact raw-report hashes and per-run source/test inputs preserve provenance without changing prior evidence.

## Remaining decisions and qualifications

- **Future issue-time policy:** the deterministic 1 ms case remains denied and the traced read-back sees 4 ms. No broader tolerance is justified or implemented. Measure host clock ordering/discontinuities and choose any proposed bound through separate security review; preserve expiry, age, `nbf`, nonce, audience/key/certificate and request binding.
- **Reliability:** unexplained uninstrumented management refusals, historical stale-plan classification and complete repeated browser qualification remain blockers. Further profiling must preserve current authority and the existing deadlines; no timing increase is proposed as a substitute for diagnosis.
- **Independent review:** Data Services maintainer review of the existing WP3 increment remains required and is not claimed complete.
- **ZIP and production:** the Windows downloadable ZIP remains unverified; prepared-tree scans are not ZIP safety evidence and the exporter is unchanged. All **P1–P4, A3 and I1–I6** qualifications remain open, including real Auth0/MFA/lifecycle, Ubuntu/Caddy, independent Linux accounts, credentials, release/schema/private-asset ownership, CSP and operator qualification. No provider registration, purchasing, production operation, Stage 6 or Stage 7 execution occurred.

**Stop at this blocked Timing and Reliability Correction Review Gate. Do not request local integration acceptance while these failures remain. No staging, commit or push.**
