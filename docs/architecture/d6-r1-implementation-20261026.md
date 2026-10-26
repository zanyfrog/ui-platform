# D6-R1 implementation and acceptance review

2026-10-26. **Implemented for Increment Acceptance Review; no protected or live read is authorized.**

The existing Foundation owner now accepts optional `recovery: 'refuse'`. Its existing graph/role/root paths can refuse recovery-required conditions without recovery. Visual Artifact Service read/list forwards the same mode to Foundation. Default callers retain their recovery-capable behavior. The exact contract and refusal taxonomy are in `d6-r1-recovery-free-contract-20261026.md`.

## Source review and implementation map

Controlling references: `builder-v1-wp5-f-preview-unblocking-decision-20261026.md` and `builder-v1-wp5-f-preview-unblocking-next-authorization-20261026.md`, bounded by the user's current restrictions. Ordinary source review inspected storage acquisition/cleanup, canonical role identity, root recovery/discovery, role read/save, Visual read/list/save callers and graph forwarding. There was no import of a normal application/backend entry point or inspection of existing protected state.

| Modified source | Responsibility and retained behavior |
| --- | --- |
| `packages/artifacts/src/storage.ts` | Optional lock mode, generic unsafe-admission error, existing-guard/nonfile refusal and branch before PID probe/reclamation. Options copied before asynchronous work. Same hash namespace, queue, deadline, order, owned-handle cleanup and callback-once logic. |
| `packages/artifacts/src/role-bundle.ts` | Additive read options; graph callback and role capture run Foundation's existing root traversal in refusal mode. Branch before journal byte access, parsing, recovery or replay. Unknown transaction names/non-directory membership also refuse. Cancellation retains its original reason. No transaction directory creation in the root refusal path. |
| `packages/artifacts/src/storage-api.ts` | Additive option type and unsafe-admission error exports through the existing storage boundary. |
| `src/server/visual-artifacts.ts` | Optional options on `read` and `list`, copied at entry and forwarded unchanged. List acquisition failures throw in refuse mode; default diagnostic fallback remains. Parsing, source roles, hashes, persistence, validation diagnostics and save callers remain unchanged. |

`withRuntimeGraphRead` and `withApplicationMutation` already forward options and are unchanged. Actual runtime forwarding is included in the scoped test/type closure. Composition forwarding was source-inspected. This increment does not add recovery-free acquisition to normal runtime consumers automatically; future capture must explicitly pass the mode through every participating read/list call. The option is not an ambient permission or a restriction on arbitrary trusted code supplied as a graph callback.

Graph identity remains `visual-runtime-graph-v1` under the canonical root. Role identity remains the canonical physical anchor path under the same root. Root inspection remains owned by Foundation, using the existing recovery traversal with a status-only branch. It is conservative across the entire owner root, including missing-anchor membership, and does not establish cross-owner coherence. No second scanner, lock authority, catalog, lock format, recovery model or transaction protocol was introduced.

## Exact execution admission

`scripts/verify-d6-r1.mjs` writes the exact source hashes, builtin allowlist, module replacements, tool versions and initialization admission **before** compiling/executing the named test entry. Its resolver rejects all unadmitted imports. Every run retains its input bytes, resolved graph, bundled executable and raw output. No workspace test configuration/setup is loaded; test concurrency is one and configured retries are zero.

The actual Foundation closure is `storage-api`, `storage`, `role-bundle`, `bundle`, `file-operations` and type declarations. Visual service imports actual `json-files`, actual pure Visual model/source/validation/form/composition exports and the canonical pure declarative-expression source. The runtime read-forwarding module is actual source. Unused `applications`, `trash` and `paths` imports resolve only to an admitted test tripwire: no app, session, trash, backend or installed source initialization. Native fs promises used by product sources are mediated by a fixture-root guard. The PID probe is replaced by a deterministic test-only ESRCH injection before tests; no OS PID probe executes. Graph trace-file output is disabled.

Execution uses only named disposable `d6-r1-*` directories. Product IO is restricted to that fixture root, except ancestor `lstat` metadata required by canonical safety checks. Each fixture's recursive removal first verifies the exact allowed parent/prefix. No current project store, lock, journal, saved Page/Component or production source is acquired. Fixture setup deliberately writes faults, and the two default compatibility cases deliberately exercise existing recovery/write semantics on fixture bytes only. These are not authorized operations against real source.

Strict scoped typechecking covers the storage API, actual Visual service, runtime adapter and their admitted pure source/type dependencies. Unused backend types use the test tripwire boundary. Node declarations and TypeScript standard libraries are type-only inputs, inventoried before diagnostics. Package build/dist generation, normal Builder/backend execution and broad suites were not run.

## Verification and retained attempts

All runs are under `evidence/d6-r1-recovery-free-read-20261026/`:

| Run | Result |
| --- | --- |
| `run-1793025701950` | 13/15 tests pass; two default compatibility cases fail on Windows file replacement in the temporary fixture directory. Raw EPERM errors, source bytes and bundle retained. No protected-state investigation followed. |
| `run-1793025729462` | 15/15 tests pass after relocating fixtures to the writable evidence directory. Strict typecheck refuses seven diagnostics caused by the verifier's Windows path normalization for backend type replacements. |
| `run-1793025759818` | 15/15 tests pass. Three type errors expose the test tripwire's zero-argument signature; retained unchanged. |
| `run-1793025820949` | **16/16 tests pass; zero failures, skips or configured retries. Strict scoped typecheck passes with no diagnostics.** Adds a caller-option mutation regression and retained guarded filesystem traces. |

The final run checks healthy graph/role/Visual read and list, original bytes/checksum/hash, own-lock release, injected dead/valid owner busy refusal, empty/malformed/ambiguous owner refusal, existing recovery guards/nonfile locks, pending/malformed/legacy/missing-anchor journals, unsafe/unknown transaction membership and injected metadata faults, no journal byte reads or foreign deletion, bounded queue/foreign contention, cancellation, exact abort reason, callback-thrown busy error once, graph/role ordering and identities, uncertain cleanup blocking success, default lock reclamation/recovery/save compatibility, truthful Visual acquisition refusal and option mutation protection. The final `filesystem-traces.json` retains product IO events from each fixture, plus injected probe accounting; real PID probes are zero.

The first failure was fixture placement; the next two were verification harness type-boundary defects. No product behavior was weakened to obtain passing results. Each corrected run was separately admitted; no configured automatic test retry was used. Existing internal acquisition polling and default Windows IO retries are protocol behavior, not suite retries.

## Preservation

The pre-edit baseline contains **1,533 ordinary source/test/script/document/evidence files**. Exactly four existing product files change; **1,529 remain byte-identical**, with no deletions. Prior architecture inventory entries all match. HEAD is unchanged. Exact before/after SHA-256 values are in `preservation.json`; all added/modified files, including raw failed attempts, are enumerated in `docs/architecture/d6-r1-files-20261026.json`.

The actual editing, history, autosave, parser, saved-target integration, L1/L2/L3, native renderer, CSP, authority and persistence implementations are unchanged. Foundation transaction/save implementation bodies remain unchanged; scoped default writer/recovery checks use only disposable fixtures. Accepted source and historical evidence were neither rewritten nor removed. No commits, pushes or synchronization occurred.

## Remaining limits and D6-R2 prerequisites

R1 is an opt-in safety contract, not operational qualification or a repair for historical failures. The tested filesystem guards and injected probes do not prove real installation liveness, multi-process Windows behavior, permissions or current protected-source availability. Unsafe/unreadable metadata and any pending journal stop admission. Source visibility, authorization and safe error serialization remain independent caller responsibilities. Multi-artifact capture requires the existing outer graph authority and verified participation by writers; independent role/list reads alone do not prove a coherent closure. Every read/list edge must explicitly carry refuse mode.

The next separately authorizable increment is **D6-R2 Real Owner Capture Boundary**, with the provider still unavailable:

1. Specify one real server/source-owner capture boundary, consuming the accepted original Application/Page/node/hash and original session/owner context, without a second identity catalog or consumer parser.
2. Define exact canonical owners/roots, participating writer/graph guarantees, membership, Page roles, installed Component/Definition/package/version/export/revision, theme and resource closure. Missing or ambiguous membership/ownership must refuse.
3. Use this recovery-free mode on the existing graph and every role/list/root edge. Preserve one captured provenance model and recheck closure/source/authority before returning a closed immutable capture; no default recovery fallback.
4. Reuse existing L1/L2/L3 literal-input validation and real owner contracts. Define cancellation, source/authority invalidation and late-result rejection. No resource delivery or native renderer activation in R2.
5. Admit exact ordinary-source implementation/dependencies and isolated nonprotected fixtures first. Obtain separate authority evidence before any real read: original session, permanent Application owner, access policy, revocation and source/dependency invalidation.
6. Separately authorize one named recovery-free acquisition-only operational qualification, with exact roots, identity closure, allowed metadata reads and own-lock writes. Any busy/unresolved/unsafe/recovery-required condition stops without remediation. R1 grants no protected read, PID inspection, journal operation, lock repair or owner transition.

If canonical owner participation, authoritative identity/dependency closure or real read authority cannot be established without the prohibited operational work, stop the affected R2 implementation and document that exact gap. Immutable authenticated delivery and native-host activation remain later independent gates; no genuine saved Preview can yet be claimed.

Stop at **D6-R1 Recovery-Free Read Admission Contract — Increment Acceptance Review Gate**. Complete WP5-F, D6 and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.
