# WP5-F L1-B — Pure Acquisition-Observation Model

2026-10-23. **Implemented within authored-data scope; awaiting increment acceptance.** [L1-A closure](builder-v1-wp5-f-l1a-closure-20261023.md) records the user's source-only audit acceptance separately. Original reports, failure results, inventories, accepted L2-B source and evidence remain unchanged. Complete WP5-F, D6 and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.

## Exact implementation

New `src/preview-contract-model/acquisition.ts` consumes injected authored first/validation observations and current authority answers. It never opens source or calls Foundation. Its only import is the unchanged admitted L2-B `model.ts`, whose sole runtime import is Node crypto. It reuses canonicalization, SHA-256, manifest normalization and binding/epoch validation; it does not instantiate L2-B PreviewModel or add production callers.

The contract fixes original binding, authorization epoch, owner validity, selected saved revision, required role keys, required collection scopes and explicit limits. Each entered observation supplies original authority/owner values, identity/permanent-ID tuples, per-role read outcomes, role/native revisions, full manifest/reference graph, exact resource bytes, package activation and ordinal-bearing collection members. Native closure admission is an authored assertion, not a native audit. Busy, owner-unresolved and recovery-required are a separate typed observation union.

`begin` returns a sequenced/generation-qualified candidate ticket and injected expiry. `first` invokes one injected first-pass callback and retains copied observations/bytes. `validate` invokes one validation callback, checks authority/ticket again after awaiting, validates its entire closure and compares the full normalized observation fingerprint. Only complete agreement produces a candidate. There is no acquisition loop, automatic retry, owner inference, recovery or partial candidate. A stale deferred completion cannot cancel a newer ticket.

The candidate contains copied normalized manifest, owner-qualified identity observations, ordered membership, copied bytes, original binding/epoch, expiry, content identity and full observation fingerprint. Caller mutation of output or snapshot cannot change retained data. Content identity includes semantic membership ordinals and permanent identity observations; binding/epoch remain separate. Invalidation clears previous and pending data, and is latched in that model instance; reuse after reauthorization requires a newly constructed model with an explicit fresh contract, not silent revival.

The previous successful candidate is data only. A failed source replacement leaves that authorized data intact until expiry; authority/owner invalidation, clock uncertainty and disposal clear it. There is no rendered surface, listener, timer or simulated stale executable content.

## Canonicalization and authored observation vectors

[Pre-execution vectors and admission](builder-v1-wp5-f-l1b-vectors-admission-20261023.md) fix the exact `a`/`b` UTF-8 bytes and known SHA-256 values, a literal canonical role projection and the authored base-observation shape. Exact test fixture source is `tests/preview-contract-model/acquisition.test.ts`; it contains the complete two-role, selected→dependency graph, ordered collection, package activation and memory-resource vector before execution.

Normalization reuses L2-B set rules for manifest fields, sorts identity/outcome/scope sets and sorts collection members by explicit ordinal. Storage-array permutation with unchanged ordinals is equivalent; ordinal changes are semantic changes. First/validation fingerprint includes original authority and full metadata. Final content projection is exactly:

```text
{schema: "acquisition-content-model-v1",
 manifest: normalizedL2Manifest,
 identities: sortedIdentityObservations,
 orderedMembership: sortedScopesWithMembersSortedByOrdinal}
```

It is hashed using unchanged L2 canonical UTF-8 JSON/SHA-256. No deadline, subject/session or authorization epoch enters content identity. A successful capture with different collection semantics gets a different content identity even if L2 manifest set fields happen to match. Identity/epoch separation and storage permutation equivalence are independently tested. This is a model schema, not a new persisted source format/catalog.

## Dependency and execution admission

Exactly one new test entry is executed: `tests/preview-contract-model/acquisition.test.ts`. Its executable closure is `acquisition.ts`, unchanged `model.ts`, and Node `test`, `assert/strict`, `crypto`. Type-only imports are the same admitted files. Full source/import paths and runner were inspected before execution. No production packages, storage paths, backend/session/owner services, setup hooks or native imports enter the closure.

Dedicated `scripts/verify-acquisition-contract-model.mjs` uses Node fs/path/crypto/child_process only. It checks exact imports, rejects dynamic and side-effect imports/require/fetch/timer calls in executed sources, records source hashes and invokes one named Node type-stripped test with concurrency 1 and zero retries. NODE_OPTIONS/NODE_PATH are removed for the child. No npm scripts, workspace test config, wildcard discovery, build hooks, browser or server runs. Strict no-emit typechecking uses explicit files/Node declarations and ignores workspace configuration; it executes no declared module/provider.

## Results and retained diagnostics

Evidence root: `evidence/builder-v1-wp5-f-l1b-20261023/`.

| Record | Outcome |
| --- | --- |
| `run-1792765262196` | Initial 54/54 tests pass; exact entry, serial, zero retries |
| `typecheck.json` | Initial strict check fails: discriminated union not narrowed after the throwing refusal branch, cascading implicit-any errors. Preserved in full |
| `run-1792765276471` and `typecheck-final.json` | 54/54 and strict check pass after making that branch explicitly return the never-returning rejection |
| `run-1792765325694` and `typecheck-content-identity.json` | **Final 56/56 and strict check pass**, after including ordered membership/identity observations in content identity and adding two corresponding invariants |

Later runs verify changed source and added invariants; they are not retries of a failing test. Each runner has zero retries; all test runs passed. The failed initial typecheck remains recorded. Each run retains exact args/imports/source digests, full named TAP, stderr, exit/signal/error and unchanged-during-run source check. No accepted L2-B tests/evidence are regenerated.

## Named scenario and refusal coverage

Full exact names/outcomes are in final `tests.tap`. Coverage groups:

| Scenario | Expected result established by authored model |
| --- | --- |
| Matching first and validation passes | Complete candidate, separate original binding/epoch, exact bytes, one callback per phase |
| Role bytes change with same native revision / revision-only change | Entire candidate refused `changed`; no mixed first/new resources |
| Added/removed/renamed/reordered collection members | New closure/order refused `changed`, or `missing` when original required role disappears; duplicate member `ambiguous` |
| Missing/unreadable/denied dependency or required role | Explicit `missing`/`denied`, never skipped shared definition |
| Duplicate identity / same owner-permanent-ID alias | `ambiguous` |
| Original Application or selected owner/owner validity change | `owner-changed`; previous authorized data cleared |
| Permission/session/policy/owner epoch/subject changes | `authority-changed` before callback or after await; pending and previous cleared |
| Same package version/new executable bytes; activation-only change | `changed` |
| Dependency cycle / disconnected or unsupported native closure | `cycle` / `unsupported`; no native admission claim |
| Busy / owner-unresolved / recovery-required | Exact distinct refusal at either phase, one callback only, no retries or recovery |
| Expiry / superseded ticket / deferred Refresh race | Exact `expired`/`superseded`; older completion cannot cancel newer candidate |
| Refresh versus revocation / terminal disposal | `authority-changed`/`disposed`, no late restoration |
| Malformed metadata/envelope/accessor or invalid bytes | `malformed` or `changed`; property getter not executed; no output candidate |
| Explicit role/edge/member/identity/byte limits | `limit`; constructor rejects incompatible declared contract limits |
| Callback rejection / backwards clock | One `acquisition-error`, or `clock-invalid` and cleared retained state |
| Failed replacement with valid authority | Prior candidate data retained unchanged until expiry; revocation clears it |
| Content/epoch separation, copied outputs and semantic ordinals | Same captured content across different original authority has same content ID but different observation fingerprint; semantic order changes content ID; returned data cannot mutate retained capture |

No numeric limit is a production default. Deadlines and limits are mandatory authored inputs. The model detects refusal/expiry only on explicit operations/snapshot, not autonomous scheduler execution. Constructor errors use `ContractError` with an `ACQUISITION_` code; first/validation failures return an explicit refusal result. Malformed or unsupported observations never become a partially complete candidate.

## Supported / unsupported matrix

| Supported here | Still unsupported / requires separate qualification |
| --- | --- |
| Agreement of two complete authored observations, explicit required roles/scopes and immutable copied resource data | Actual source acquisition, graph-root equality, reader/writer participation, D6 concurrency, recovery-aware protected snapshots and operational availability |
| Original owner/Application/binding/epoch comparison | Real permanent ownership resolution, source/field visibility, I-AM/session authority and trusted invalidation delivery |
| Finite connected authored DAG with conservative cycle refusal | Native cycle semantics, real transitive discovery, dynamic references, wider unrelated collection metadata, native renderer/package/resource admission |
| Ordered membership and package/content digest comparisons | Atomic multi-authority/source snapshot, external writers/ABA invisible to supplied observations, package installer/asset coordination or complete real closure proof |
| Deterministic deferred sequencing, refusal and no callback replay | Filesystem acquisition budgets, lock owner/PID/liveness, journals/transactions/recovery, real schedule fairness and source consistency under concurrent protected writes |
| Pure candidate bytes and previous-candidate data policy | Browser display, secure network delivery, immutable endpoint provider, production check-to-send semantics, ordinary Builder/autosave/history integration |

Two agreeing authored observations cannot prove that an actual filesystem snapshot ever existed, that all required native edges were supplied or that a real read was authorized. The model validates the declared finite contract and injected answers; it is not an authority or source catalog. These limitations prevent pure-model acceptance from being relabeled D6 or production capture qualification.

## Preservation and next gate

Before implementation, `before.json` captured **1497 existing admitted file hashes** and HEAD, including accepted L2-B source/evidence and previous reports/inventories/closures. Final comparison preserves all baseline files byte-for-byte with no missing files and unchanged HEAD. [The exact inventory](builder-v1-wp5-f-l1b-files-20261023.json) hashes every new source/test/runner/document/evidence file except its intentionally unhashed self-entry. Scope is ordinary enumerated workspace/evidence and previously admitted sibling source; no protected-store or OS preservation claim.

No production code, existing L2-B source/evidence, accepted fixture/shell/editing/autosave/native/security implementation or historical record changed. No Foundation readers/writers, protected Component/store/lock/journal/transaction access, current owner/PID/process inspection, D6 operational verification, recovery, backend/browser launch, Windows Identity/N01/token/elevation/VM/WinPE, commit, push or GitHub synchronization occurred.

**STOP AT WP5-F L1-B Pure Acquisition-Observation Model — Increment Acceptance Review Gate.** Acceptance remains the user's decision. Complete WP5-F, D6 and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.
