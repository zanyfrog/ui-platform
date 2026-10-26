# Proposed next authorization — D6-R1 Recovery-Free Read Admission Contract

2026-10-26. **READY FOR SEPARATE APPROVAL; NOT AUTHORIZED OR IMPLEMENTED BY THIS DECISION.**

## Objective and scope

Extend the existing Foundation owner with an explicit recovery-free mode for future Preview acquisition. A requested read either obtains the existing graph/role admission and returns complete admitted bytes, or refuses without reclaiming another lock, replaying a journal or repairing source. Propagate the mode through the existing Visual owner. This materially removes the current incompatibility between the recovery-aware read stack and the no-recovery operational boundary. It does not fix historical operational failures, qualify coherence, authorize protected reads or enable the provider.

Use the same source/storage identity and lock protocol. No second coordinator, catalog, lock namespace, persistent format, identity model or Preview controller. Existing ordinary runtime/editor callers retain their current defaults and behavior.

## Exact prospective implementation boundary

Paths relative to ui-platform:

1. `packages/artifacts/src/storage.ts`: additive explicit acquisition option (proposed spelling `recovery: 'refuse'`, default retaining current behavior). In refuse mode do not enter the recovery-guard/stale-owner removal path. A foreign existing lock may remain typed busy; ambiguous owner publication remains typed unresolved. This mode need not probe an OS PID or infer a dead owner: valid-looking PID text alone is not liveness proof. Retain one acquisition deadline, cancellation, callback-once, lock-order and ownership-cleanup semantics. No budget increase or admitted callback replay.
2. `packages/artifacts/src/role-bundle.ts`: additive read options and a Foundation-owned nonrecovering root-readability check, or equivalent explicit owner API. Under the same ordered admission, pending/unknown/unlocatable journals refuse with recovery-required; never invoke recoverTransaction/recoverRoleBundleRoot in this mode. Root discovery must not silently lose membership whose anchor awaits recovery. No consumer-side filesystem scanner.
3. `packages/artifacts/src/storage-api.ts`: export only the necessary additive read option/check contracts through the existing boundary. No executable capability or grant object.
4. `src/server/visual-artifacts.ts`: propagate the explicit mode through existing list/read/discovery as needed, using the Foundation-owned refusal check instead of root recovery. Default paths stay unchanged. Never suppress protected/malformed siblings to obtain successful membership.
5. Named new isolated tests/verifier and new increment docs/evidence only. Existing composition-lock.ts/withRoleBundleGraph and runtime-read-admission.ts already forward options; alter them only if source review proves forwarding otherwise impossible, with an explicit inventory note. No new capture endpoint, request UI, provider-success branch, package/native/parser/policy/persistence or source-data change is included.

Before code, inspect exact signatures/transitive callers and write the mode/propagation/side-effect contract. Stop for architecture review if a mode cannot preserve existing defaults and owner cleanup without a protocol/format change. If more files are necessary, identify why before expanding the scope; do not silently fold capture, authority or recovery work into R1.

## Verification admission

Run exact named source tests serially with zero configured retries, using actual existing primitives and isolated in-memory/fault-injected filesystem/probe boundaries. Admit import graphs and initialization before execution; no normal workspace setup, launcher, backend, reader against a real project, current PID probe or protected storage access. Keep every unsuccessful attempt and raw before/after evidence. A fake transport is test instrumentation, not a production allow authority or a new acquisition model.

Required cases:

- No existing lock/journal: successful bounded admission and complete immutable read; only the caller's normal coordination lifecycle occurs.
- Foreign lock, valid-looking owner, transient incomplete publication and unresolved owner: bounded correct busy/unresolved refusal, no recovery guard creation, stale/foreign unlink, probe, read callback entry or ownership inference.
- Pending/malformed/unlocatable journal/root membership uncertainty: typed recovery-required, zero replay/rollback/source write and no partial candidate. No preflight-then-default-reader fallback.
- Queue contention/cancellation/deadline, callback-thrown busy-shaped errors, nested graph/role ordering and cleanup failure: preserve existing once-only work and safe ownership. No successful result after uncertain cleanup.
- Existing default-mode behavior remains compatible; selected no-recovery mode survives every graph→role→root/list/read call edge. Source writes, parser/validation/hash/identity and ordinary editor/autosave/history implementations remain unchanged.

Use a scoped typecheck of changed contracts and named consumers. Do not claim a full D6 pass, real filesystem liveness, current source readiness or production authorization from isolated tests. Preserve accepted L1/L2/L3, owner/request integration, original failures/inventories and unchecked umbrella requirements. No commits, pushes or synchronization.

## Operations still prohibited

No live protected Page/Component/package read, graph/role acquisition on project roots, lock/PID inspection, lock deletion, journal mutation, recovery, source repair, I-AM/registry database access, owner/session transition, native rendering, Windows token/elevation/N01/VM/WinPE work or paused Foundation investigation. The first code increment must run without those operations.

Normal lock metadata writes are inherent to later graph admission; they must be individually covered by the later operational authorization, not misrepresented as a fully read-only filesystem action. R1 tests touch no project coordination state.

## Acceptance gate and next operational decision

Accept R1 only when the real existing owner implementation has the opt-in fail-closed contract, its isolated execution proves no recovery/source mutation/foreign cleanup, all defaults and accepted work are preserved, and exact propagation/changed-file evidence is reviewable. Stop at **D6-R1 Recovery-Free Read Admission Contract — Increment Acceptance Review Gate**.

After R1, owner-capture and authority implementation/closure evidence remain necessary. The specific later D6 decision is whether to authorize **one named recovery-free acquisition-only qualification under real read authority**, covering the exact trusted Application/Page/node and required identity/package/theme closure, canonical hosts/roots, participating writers and ordinary runtime preservation. Its Foundation owner needs explicit permission to read participating coordination/recovery-status metadata; it may create/remove only its own approved coordination metadata, with no journal/source repair or browser disclosure of ownership/journal contents. Any unresolved/recovery-required/denied state stops; no repair follows. If the installation cannot supply that qualification while operational investigations remain paused, genuine saved Preview remains impossible to activate safely. No UI or synthetic substitute is proposed.

Complete WP5-F, D6 and WP5-I remain open and unaccepted; actual saved Preview/Publish remain unaccepted. All 40 umbrella requirements remain unchecked.
