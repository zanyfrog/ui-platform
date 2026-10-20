# Shared-role ownership diagnostic event contract — design v1

2026-10-20. Implementation-ready diagnostic specification; **not installed or activated against real storage**. The accompanying isolated fault probe uses its own small event record format and does not claim to implement or validate this entire contract. No ownership format, recovery authority, policy, acquisition budget, callback or application behavior changes are authorized by this specification.

## Purpose and noninterference requirements

Observe the existing acquisition lifecycle well enough to separate exclusive creation, PID publication, protected admission, guarded replacement and release. **Exclusive creation is distinct from protected admission.** Existing telemetry's `acquired:false` can coexist with an open newly created file when failure precedes callback admission; the disposable probe demonstrates this distinction.

An implementation MUST insert observations only at existing call/decision boundaries and use values already computed there. It MUST NOT add filesystem acquisition/read/recovery attempts, liveness probes, waits, retries, signals, protocol state, source writes or callback invocations. It MUST preserve the exact original returned value/error object, exception precedence and finally ordering. It MUST NOT aggregate errors or change cleanup logic under the label of instrumentation. No telemetry field participates in admission, liveness, authorization or recovery.

Emission MUST be nonthrowing, nonawaited and bounded on the protocol path. No synchronous log-file flush, filesystem stat, subprocess query or network operation is added within acquisition/publication/release. A bounded memory enqueue may drop records; the capture then becomes incomplete. Formatting, hashing and durable file writes occur outside the protocol path. No backpressure may delay the product awaiting a collector. A collector failure stops/invalidates diagnostic capture, **not admitted application work**. An external authorized test controller may separately cancel future test scheduling, but that is not an ownership-protocol decision.

Even bounded observation has timing/GC overhead. Record it as a limitation; never claim identical scheduling or zero perturbation. Serialize primitive values only; do not call user callbacks, `toJSON`, getters, custom inspectors or arbitrary error `toString` to construct telemetry. Error snapshots use safely available data fields, with unknown fields declared unavailable.

## Capture scope and activation

Each separately authorized capture has a signed-off manifest identifying run ID, allowed canonical root/anchor/key triples, graph context, source/dependency/executable hashes, participating producers, limits and output location. No wildcard store/root discovery is permitted by an exact-role profile. Startup checks are direct read-only filesystem checks outside product admission. A mismatch stops activation; no alias/key repair is attempted.

The contemplated real target is:

| Field | Exact value |
| --- | --- |
| canonicalOwnerRoot | `C:\Projects\Modular\ui-platform\components` |
| canonicalAnchor | `C:\Projects\Modular\ui-platform\components\customer-summary-card\component.visual.json` |
| identityKind | `canonical-role` |
| identityKey | `d179aa405e5fabc10c0dcd063888480c115eb75f2ef03df9f74ce3ec26e0043e` |
| expectedLock | `<canonicalOwnerRoot>\.uib\locks\<identityKey>.lock` |
| graph identity/key | `visual-runtime-graph-v1` / `236dfbe257a229da85d588f4f851f4ea1e72efefbe5565e69e305f0d6f69602d` |

A disposable profile records its **actual different** canonical root/anchor/key, plus `environment=disposable`. It cannot label itself the real target, reuse its key or accept arbitrary command-line target overrides. Diagnostic nonces and IDs are never written into the real PID file. No production setting, transport header, database, permission cache or source catalog is created for observation.

All source-capable consumers of an observed store may matter: API, Builder/Vite, managed runtime, independent development process, CLI and fixture workers. A declaration covers only identified participating processes, not an assumed universal fence. Unknown/inaccessible producers or untracked descendants make actor attribution partial. This specification does not authorize starting/stopping consumers or opening the unresolved real Component normally.

## Versioned event envelope

Every record is one UTF-8 JSON object terminated by a single LF; embedded newlines are JSON-escaped. Unknown values are explicit null plus a reason, not fabricated values. Integers that could exceed JavaScript's safe range are decimal strings. Hashes/byte hex are lowercase. Raw records are never newline-normalized after capture.

| Required field | Type / rule |
| --- | --- |
| contract | Literal `shared-role-owner-observation/v1`; unsupported major version rejects analysis, not application work. |
| runId | UUID for one approved capture. |
| producer.instanceId | Random UUID allocated once at producer startup; never reused after restart. |
| producer.pid | Positive integer; not a complete process identity by itself. |
| producer.osStart | `{source, rawValue, reportedResolutionNs, hostBootIdentity}` or null with `osStartUnavailableReason`. Preserve OS/provider precision honestly; do not convert a millisecond rendering into an exact FILETIME claim. |
| producer.imageSha256 | Approved executable hash; source/module hashes are bound by capture manifest. Null requires coverage reason. |
| producer.parent | PID, OS start identity/known producer ID if observed; otherwise explicit unknown reason. Parent PID alone cannot establish a process-tree member across PID reuse. |
| producer.worker | Runtime/fixture worker ID, thread ID and parent worker link where available; otherwise null/reason. JS worker thread IDs are not native I/O thread IDs. |
| producerSeq | Strictly increasing decimal string per producer, assigned for **every attempted event**, including dropped attempts. No reset within an instance. |
| eventId | `<producer.instanceId>:<producerSeq>`; unique deduplication key. |
| clock | `monoNs`, `utc`, `calibrationId`, `utcResolutionNs`, `uncertaintyNs` (decimal strings where needed). See calibration rules below. |
| scope | Identity kind; exact canonical owner root; anchor or null for graph/control; identity key; environment; optional file object identity **with provenance** or explicit unknown reason. |
| operation | `operationId`, `acquisitionId`, `attemptId`, `spanId`, `parentSpanId`, `parentAcquisitionId`, existing request correlation ID or null/reason. Distinct role and outer graph acquisitions have distinct IDs. |
| event | Kind, phase, and event-specific payload from the tables below. |
| coverage | Domain (`declared-producers` or separately established wider coverage), state (`complete-for-declared-profile`, `partial`, `lost`, `unavailable`), reason codes and current dropped-event count. |

`operationId` identifies a calling source operation; `acquisitionId` covers one `withArtifactLock` invocation including local queue and all **existing** bounded attempts; `attemptId` distinguishes actual filesystem-attempt cycles. Observations must not introduce a new attempt. A subordinate role acquisition links to the graph acquisition when that relation is actually observed. Absence of correlation is unknown, never a timestamp-based invented parent. Reuse an existing request/correlation ID if safely available; do not add network headers or change request serialization solely to provide one.

## Events and insertion boundaries

The wire representation is `event: { name: "exclusive_create.begin", payload: { createPhase: "replacement", ... } }`. Table names are literal `event.name` values; a `begin/end` table entry expands to two names. Contextual lifecycle phases live in payload fields `createPhase`/`readPhase`, distinct from begin/end. Null context fields have a sibling `unknownReasons` map keyed by the unavailable field name. No undeclared free-form source, credentials or request body is admitted to payloads.

Each call span has `begin` and `end` records sharing span ID. End outcome is `ok` or `error`; errors retain safe original name/code/message, not a replacement product exception. Span begin with no end can mean process loss or event loss, **not automatically a syscall failure**.

| Kind / phase | Required payload and interpretation |
| --- | --- |
| `producer.start`, `scope.declared` | Process/worker identity, capture manifest hash, module hashes, declared allowed keys, configured collection bounds and coverage. |
| `clock.calibration` | Local monotonic-before, sampled wall clock, monotonic-after, provider precision, calibration ID. No product clock is overridden. |
| `acquisition.begin` | Requested original budget, original signal state, target identity, parent context. Never restart/extend a budget. |
| `queue.wait.begin/end` | Predecessor known/unknown, queue outcome and existing cancellation/deadline result. Do not expose/call predecessor work or reorder release. |
| `exclusive_create.begin/end` | Existing wx call, attempt ID, phase `initial` or `replacement`, outcome/error, actual handle token if returned. On success set diagnostic `exclusiveCreated=true`; this does not mean callback admission. |
| `owner_read.begin/end` | Existing actual read, phase `initial` or `guard-reread`, returned text, byte evidence as specified below, missing/error outcome. Never perform another read to fill this event. |
| `owner.classified` | Classification **actually selected by existing code**, valid numeric PID if parsed, reason, source read span. Values: unresolved metadata, valid PID, disappeared/contended, read error. Do not infer dead/corrupt from empty text. |
| `pid_probe.begin/end` | Existing input PID; result success, ESRCH, other error. Stable identity of the probed process is unknown unless separately observed; do not add another kill(pid,0) call. |
| `guard_create.begin/end` | Existing `<key>.lock.recovery` wx, outcome and returned handle token; no synthetic guard. |
| `guard.owner_compare` | Actual reread span, original/current parsed PID if available, comparison decision. Unresolved reread remains unresolved; observation cannot authorize removal. |
| `dead_owner_unlink.begin/end` | Existing old-main-file rm outcome; why original code entered this branch, referencing probe/compare spans. This is distinct from release unlink. |
| `guard_close.begin/end` | Existing recovery-handle close result, handle token/fd state when already available. |
| `guard_unlink.begin/end` | Existing guard rm result, exactly where the disposable fault was injected. Preserve ordering relative to replacement wx and main publication. |
| `pid_write.begin/end` | Existing `handle.writeFile(String(process.pid))`, requested exact decimal text/ASCII bytes, handle token and API completion/error. FileHandle.writeFile does not return a byte count; log no invented count. Do not add a second write or reopen. |
| `pid_sync.begin/end` | Existing sync completion/error on the same owned handle. A write completion is not a recorded sync completion. |
| `admission.result` | Existing abort/deadline decision after publication; original outcome. `protectedAdmitted` true only at the actual entered/callback boundary. Diagnostic observations never perform a new authority check. |
| `callback.begin/end` | Exactly one event pair for the original callback invocation; return/error/abort state as observed, no callback replay or interruption. Values/content are omitted unless explicitly approved non-sensitive primitives. |
| `main_close.begin/end` | Existing replacement/main handle close result. Record an absent end honestly. Never close a handle solely to obtain this event. |
| `release_unlink.begin/end` | Existing main-file rm result, original options; no new recovery/retry. |
| `acquisition.end` | Actual final value/error class, exclusiveCreated/protectedAdmitted, existing acquisition observation, last contention class, no diagnostic reclassification. Cleanup errors may override earlier errors under current code; event pairs preserve what was observed without changing that precedence. |
| `fixture_teardown.begin/end` | Fixture/worker identity, existing shutdown/drain action, exact process target and original result where already observed. No new process control is authorized by emission. |
| `process.exit_observed` | Collector-observed PID/start identity and exit status/signal, source of observation, last producer sequence/checkpoint. A producer cannot reliably log its own abrupt termination. |
| `collector.checkpoint`, `capture.end` | Accepted/written/attempted/dropped counts, per-producer high-water sequences, sealed segment hashes, producer completion/unknown status, coverage assessment. |
| `stream.loss`, `coverage.changed` | Explicit missing ranges/counts, collector failure/disconnect/overflow, unknown source, unavailable raw bytes or file identity. Never silently resume a continuous-looking stream. |

The insertion map is the current `storage.ts`/compiled storage `withArtifactLock` and `acquireArtifactLock` boundaries, plus diagnostic caller/fixture/process context outside the protocol. Future implementation must show a reviewed diff demonstrating no branch, call count, error propagation, finally coverage or scheduling-budget change. Merely adding a wrapper is not proof of noninterference.

## Actual owner-read bytes: a necessary coverage constraint

The installed implementation uses `readFile(file, 'utf8')` and receives a **decoded string**, not the raw buffer. Logging `Buffer.from(text, 'utf8')` as original bytes would be false for malformed UTF-8. A later direct read describes a later observation and cannot replace the failing read's bytes.

Every owner-read result therefore contains:

| Field | Rule |
| --- | --- |
| `returnedText` | Exact primitive string returned by that read, within approved payload bounds; truncation is explicit. |
| `byteEvidence.mode` | `actual-buffer` only when the actual read buffer is observed without a second file read; `ascii-equivalent` only when the full returned text consists exclusively of ASCII code points; otherwise `unavailable`. |
| `byteEvidence.hex` | Exact original-read bytes for actual-buffer, or uniquely corresponding ASCII bytes for ascii-equivalent. Empty text yields exact empty ASCII bytes. Null in unavailable mode. |
| `byteEvidence.provenance` | Actual call/buffer observation method or `existing-utf8-result-is-ascii`; unavailable reason otherwise. Never label a later snapshot as actual-read evidence. |
| `byteEvidence.complete` | False on truncated text, unavailable raw evidence, observer loss or unknown provenance. |
| `classification` | The original code's decision on its actual decoded text, irrespective of byte-evidence availability. |

For ordinary decimal PID/empty metadata, ASCII-equivalent evidence provides exact bytes without changing the read. Full fidelity for arbitrary malformed UTF-8 requires separately reviewed native/read-buffer observation; **this is an explicit implementation prerequisite for a full-byte profile**. Do not change the production read API, decoder, file-open sequence or callback semantics to close this gap under diagnostic-only permission. A decoded-text profile may be used only with declared partial byte coverage for non-ASCII/malformed records.

Similarly, a pathname stat before/after read does not prove which file object produced the bytes across an ABA replacement. The current APIs do not expose a stable read handle/file ID to this observation point. Set file-object identity unknown unless actual handle/native-event correlation is available through a separately reviewed method. Numeric fd is only a per-process handle token and can be reused; it is not a filesystem identity. No extra handle/stat/open is inserted on the protocol path to manufacture certainty.

## Sequencing, calibration and integrity

Producer sequence establishes that producer's observation order. Begin/end span links and actual parent/request links establish causal relationships. Cross-process wall timestamps alone do not establish a total order. Collect a calibration at startup and at approved periodic checkpoints outside acquisition, using monotonic-before/wall/monotonic-after brackets. Record the bracket width and real wall-clock precision; increase uncertainty/mark a discontinuity on clock steps. Never compare raw hrtime/performance origins across processes as if they shared one epoch.

Collector writes immutable numbered NDJSON segments, with exact source bytes, not reformatted JSON. A sidecar records each line offset/length and a chain `H_i = SHA256(H_(i-1) || raw_record_UTF8_without_LF)`, starting from 32 zero bytes; segment headers bind run/producer IDs and the previous segment digest. The sidecar is separate to avoid circular self-hashes. Seal each segment with raw size/SHA-256; the final manifest binds all segment/sidecar hashes, command/tool/source versions, process identities, coverage and native exit records. A later inventory can hash that final manifest; it does not hash itself circularly.

Hashes show byte integrity relative to preserved records, not independent authentication of an actor or proof that a producer emitted every event. No Git checkout/filter is assumed to be a raw-byte archive. Keep raw collector bytes, diagnostic analysis derivatives and historical evidence distinct. Outputs are fresh exclusive-create paths under approved diagnostic evidence; no previous file/manifest is rewritten.

## Bounds, loss and completeness

A capture manifest MUST set finite duration, event/byte/segment/payload limits before activation. A proposed short profile is **60 seconds**, **100000 attempted events**, **16 MiB ring per producer**, **64 MiB total output**, **4 MiB sealed segments**, **64 KiB per encoded record**, **4096 bytes owner payload**. These are **diagnostic collection limits only**, not acquisition budgets or application timeouts. They require review for the selected workload; reaching one stops collection and marks subsequent coverage unavailable, without changing product execution. Longer observation requires another explicit bounded plan, not automatic extension.

Reserve control capacity for loss/checkpoint counters. On ring overflow increment attempted sequence/drop counters and retain missing ranges when possible; do not block the product. Collector validates monotonic sequences, duplicate IDs, begin/end pairing and declared producer membership. Overflow, pipe/collector error, oversized/truncated payload, unknown child/consumer, missing calibration, absent producer end, process crash or unsealed tail makes the affected claim partial/lost. An abrupt crash can erase unexported events before its last counter; an apparently contiguous persisted prefix is not proof that no later event existed. Silence is not proof of abandonment or no activity.

Full profile completeness requires every declared producer accounted for, raw owner evidence sufficient for the claim, identity/correlation available, no loss/truncation, valid calibration and sealed manifests. `complete-for-declared-profile` still does **not** mean every uncooperative external actor was observed. Wider all-consumer coverage requires independent operational evidence; a quiet process list is insufficient. Loss of coverage never changes fail-closed ownership decisions or permits recovery.

## Analysis outcomes and activation prerequisites

| Desired distinction | Evidence required | If evidence is absent |
| --- | --- | --- |
| Live owner awaiting publication | Same object/key creator process identity, wx success, actual empty read, creator demonstrably alive, then linked PID write/sync outcome. | Unknown owner/publication phase. PID presence elsewhere does not identify it. |
| Abandoned empty file | Exact creator/object association, observed exit before completed publication, retained empty object, complete relevant producer coverage. | Empty/old metadata alone remains unknown; no reclaim authority. |
| Failed/interrupted publication | Actual write/sync error or missing completion bracketed by authenticated process exit, followed by observed cleanup outcomes. | Missing end may be loss; do not invent a syscall failure. |
| Another process/fixture contention | Distinct stable process identities, common canonical role key, overlapping actual create/read/probe observations and fixture/request links. | Graph wait duration alone cannot identify a role or actor. |
| Owner state changed between acquisition and inspection | Actual read bytes/object provenance and later identified object/state transitions, with sequence/correlation. | Later stat/read is a different snapshot; actor/ABA relationship remains unproved. |

Before any implementation/activation: approve source/dependency hashes and observation-only diff, byte/file-ID coverage profile, process/fixture coverage, collector trust/privileges, finite capture bounds, output protection and stop policy. Resolve the real unresolved lock through its own separate operational gate before any future request that would acquire it. This design does not authorize recovery, active real-store observation or further tests.

**STOP AT DIAGNOSTIC DESIGN AND DISPOSABLE PROBE REVIEW GATE. D6, WP5-F and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.**
