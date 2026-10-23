# WP5-F L2-B — pure contract model implementation

2026-10-23. **Implemented; awaiting increment acceptance.** L2-A approval is recorded in a [new addendum](builder-v1-wp5-f-l2a-approval-20261023.md); the original architecture report/inventory is preserved. Complete WP5-F, D6 and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.

## Implementation and exact boundary

New `src/preview-contract-model/model.ts` implements a standalone authored-data model, with no production callers or imports into accepted code. The only runtime dependency is Node `node:crypto` for SHA-256. All original binding/epoch/manifest answers are copied; resources are copied on capture and delivery. Clock and authority answers are constructor-injected. There are no timers, source readers, providers, endpoints, DOM, iframe, native renderer or record adapters.

Typed contracts cover original subject/session/Application/owner/selected identity, canonical decimal policy cursor, session/owner revision, validity epoch, channel events, structured immutable manifest, resource references and explicit caller-supplied limits. Authority answers are authored allow/deny values, **not an authorization evaluator**. Identity strings are opaque authored permanent-identity tokens; this model does not parse real UUID/workspace schemas or resolve actual owners. TypeScript private state is ordinary trusted in-process model encapsulation, not a hostile-JavaScript security boundary.

`PreviewModel` implements reconcile/receive/disconnect/invalidate, explicit Refresh and candidate completion/failure, source-stale state, resource prepare/send ordering and terminal dispose. A channel gap, conflict, foreign lineage, unhealthy/expired state or fresh-answer mismatch hides and generation-invalidates all capture state. Reconcile leaves display empty and Refresh-required. Pending candidates and one-use permits cannot revive discarded state. Health expiry is checked by explicit model operations/snapshot, not autonomous scheduling; real browser hiding requires future integration.

Manifest schema `preview-capture-model-v1` is an authored model projection of L2-A, not a persisted artifact or complete capture provider. Roles/revisions, dependency edges/membership, packages/activation/version/executable/resource references, route/Region ordinals, Shell/theme/style/asset references and renderer/policy version enter content identity. Subject/session and authorization epoch remain in separately pinned capture state. No real source formats or native semantics are inferred. Missing/duplicate/foreign resource or membership references, unknown fields/schemas, changed bytes, expiry and caller-supplied resource/concurrency/capture limits produce explicit errors.

Resource lookup accepts only an indexed capture/resource/digest and exact original binding/epoch. Prepare and send each invoke fresh authored authority admission; permit replay is denied. An observed invalidation before send produces no model bytes. After send, the returned bytes cannot be recalled: this is deliberately modeled as a limitation. No assertion is made about real network check-to-send races or zero post-commit disclosure.

## Canonicalization and exact authored vectors

[Canonical rules and pre-execution vectors](builder-v1-wp5-f-l2b-vectors-admission-20261023.md) were recorded before executing the model. Tests assert literal canonical strings and three fixed known SHA-256 values, plus independently computed SHA-256 over the other expected strings. Object-key permutation is invariant; array/semantic ordinal changes are not. Unknown prototypes/accessors/symbols/cycles/sparse arrays/unsupported values and unsafe integers reject without invoking getters. Unicode is preserved without normalization; key order is UTF-16 code-unit order, not locale collation.

The authored manifest tests prove role/resource/membership set permutation invariance, route ordinal sensitivity, same-version package-byte identity changes and content-hash independence from subject/epoch. The fixture explicitly includes selected and package roles, a dependency, closure membership, package/executable resource and route bytes; Shell/Region/theme/style/asset collections are typed optional empty sets in this fixture. These references are structurally checked, not proof of native resource compatibility or transitive real-world closure completeness.

## Source admission and verification

Exact test entry: `tests/preview-contract-model/model.test.ts`. Runtime imports: the model plus `node:test`, `node:assert/strict`, `node:crypto`. Type-only imports resolve to that same model. No other product module or transitive package is loaded. The dedicated runner `scripts/verify-preview-contract-model.mjs` uses only Node fs/path/crypto/child_process, checks admitted import paths and rejects dynamic import/require/fetch/timer calls in the two executed files. It records exact source hashes before and after child execution. The source inspection and [admission note](builder-v1-wp5-f-l2b-vectors-admission-20261023.md) precede test execution.

Child command uses one named test file, built-in Node TypeScript stripping, `--test-concurrency=1`, no discovery/config/setup/prebuild hooks, and removes NODE_OPTIONS/NODE_PATH. Node version and exact args/import graph are in each run's admission/result record. This increment does not use normal npm/Vite/Vitest configuration. Runner writes only new increment evidence; it starts no browser/server. No accepted fixture/shell regression suite was rerun.

| Evidence run under `evidence/builder-v1-wp5-f-l2b-20261023/` | Result and reason |
| --- | --- |
| `run-1792754687368` | 46/46, initial admitted model scenarios |
| `run-1792754728205` | 51/51 after adding malformed input, capture/send expiry, foreign reconciliation, capture binding/membership and cross-subject identity checks |
| `run-1792754756539` | **52/52 final**, after adding malformed incoming event fail-closed coverage |
| `typecheck.json` | Strict no-emit TypeScript check passes for the exact model and test, explicit Node types, no project config |

Every run is serial with zero retries. The later runs verify changed code/new scenarios, not attempts to erase failures; all three passed and remain retained. No source changed during a run. TAP preserves every exact named outcome; `result.json` includes exit/signal/error and raw source change checks. Type checking checks types only, without executing any declared dependency or workspace build hook.

## Negative scenario mapping and expected outcomes

| L2-A scenario | Final modeled expectation / coverage |
| --- | --- |
| Policy removal during capture | Fresh authored answer denies; late candidate never visible |
| Policy removal during delivery | Prepare-to-send invalidation emits no bytes; invalidation after send cannot recall returned bytes |
| Session replacement while connected | Session/subject/epoch mismatch hides; session event also invalidates synchronously |
| Logout with pending responses | Immediate generation invalidation; disposed/late completion cannot restore display |
| Owner reassignment | Changed owner validity answer/event blocks old capture; capture cannot change Application binding |
| Rights expiry without source write | Injected validity ceiling causes hidden/expired state without source event |
| Commit-to-publication interruption | Authored committed head advances during disconnect; obsolete cursor rejected; reconciliation with current head leaves Refresh-required. No durable store or publisher exists in model |
| Duplicate/corrupt/skipped/out-of-order event | Exact retained duplicate is idempotent; conflicting/too-old replay, gap, stale cursor, malformed fields/accessor and foreign channel/lineage hide |
| Reconnect obsolete cursor | Old/foreign cursor cannot reconcile; current cursor with new generation never restores old capture |
| Partition/health timeout | Explicit disconnect hides; injected health boundary hides on next model operation/snapshot; no autonomous time or remote SLA claim |
| Source stale with authority valid | Historical model capture remains visible but inert; failed Refresh remains stale; authority failure clears it |
| Same package version/different executable bytes | Different content digest; captured bytes must match immutable index |
| Expired capture/resource replay | Prepare or send denies at exact injected expiry; no resource/source fallback |
| Cross-user/resource replay | Original binding/epoch, handle, resource ID and digest checked; unknown paths never fetched |
| Concurrent Refresh/revocation | Pending candidate generation is cleared; superseded candidate cannot replace current |
| Disposal/late response | Terminal empty state, cleared buffers/permits; reconcile/complete reject |

Additional tests cover explicit byte/resource/capture/concurrency/replay-retention limits, one-use permits, copied input/output bytes, backwards clocks and authority exceptions. All numeric values are authored test inputs. They do not choose production heartbeat, lifetime, retention, byte, resource or concurrency ceilings. No model pass supplies a production default.

## Supported / unsupported matrix

| Supported within pure model | Explicitly unsupported / remaining prerequisite |
| --- | --- |
| Typed authored binding/cursor/epoch consistency and injected fresh allow/deny | Real I-AM evaluation, definition writers, durable policy history, audit cursor retention/lineage, migration/outbox feasibility |
| Deterministic ordered channel events, duplicate/gap/retention/reset behavior | Actual SSE, commit/publication recovery, cross-process writer completeness, channel transport health and remote revocation timing |
| Generation/lifecycle/expiry transitions and explicit Refresh | Browser visibility, frozen compositor behavior, scheduled expiry, real renderer cleanup and ordinary Builder integration |
| Deterministic content identity and indexed immutable memory bytes | D6 protected capture/coherence, real membership/authority/field visibility, native schema validation, package execution admission and external writer safety |
| Abstract prepare/send permit ordering and replay denial | Network response boundary atomicity, elimination/acceptance of disclosure race, real cancel/partial-send behavior |
| Caller-supplied test limits and explicit errors | Production limit values, hostile/unbounded-input CPU or memory hardening, deployment resource governance |

## Preservation, inventory and remaining decisions

The pre-change baseline `before.json` contains **1472 existing files**, including accepted source, evidence, inventories, closure records and seven explicitly admitted sibling I-AM source references. Final raw comparison records zero changed/missing baseline files and unchanged HEAD. No existing code/test/configuration/report/closure/inventory is edited. The [new exact inventory](builder-v1-wp5-f-l2b-files-20261023.json) lists every new model/test/runner/document/evidence file with size and SHA-256, except its intentionally unhashed self-entry. This is enumerated ordinary file preservation, not OS/protected-store preservation.

Remaining production decisions: verify authority history/cursor lineage and all writer participation; choose accepted session/owner cross-process signals; define timing/clock/health/expiry/replay-retention and resource limits; decide whether an authority-owned outbox is needed; review actual admission-to-send race semantics; qualify coherent source acquisition and immutable transport; admit actual native/resource closure and compatible restrictions. Models cannot settle those integration questions. Pure-model approval must not activate protected Preview.

No real authority/store/session/Application mutation, backend route/SSE/authenticated delivery, protected capture, D6/Foundation reader/lock/journal/transaction/recovery, native/iframe/Builder execution, Windows Identity/N01/token/elevation/WinPE/VM work, commit, push or GitHub synchronization occurred.

**STOP AT WP5-F L2-B Pure Contract Model — Increment Acceptance Review Gate.** L2-B acceptance remains the user's decision. Complete WP5-F, D6 and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.
