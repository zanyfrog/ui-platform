# D6-P2 detailed package publication protocol — Gate A

2026-10-26. Implements the user's approved new existing-owner sealed-publication protocol. No new global lock or change to lock format, Foundation recovery/transaction semantics or automatic migration is required. Presentation publication, real authority, D6-R2 and renderer activation remain excluded.

## Ownership and initial producer

An internal package-owner extension accepts trusted setup: an original permanent Application UUID, its owner-controlled publication root and the existing canonical Foundation graph root. These are server-owner bindings, not derived from directory names, package labels or browser input. There is no route or automatic install/build hook. Initial support is Application-owned, explicitly completed `owner-staged-native-card-v1` build snapshots only. Platform publications, npm/GitHub/file-linked source discovery, arbitrary builds/resources and unsealed legacy installations refuse. The extension is exposed additively through the existing package installer owner; existing installation and activation functions remain unchanged.

The static profile is taken from the accepted L3-B native admission: exactly 13 native JavaScript modules, three package declarations and one canonical Definition manifest, with their exact hashes, lengths and already-admitted static edges. No package code executes, no new dependency scanner or catalog is introduced. This is an implementation-only package closure: it does not claim an Application theme or complete saved Card capture. Producer-supplied bytes are copied synchronously before asynchronous work and must exactly match the fixed profile. Changed same-version bytes, extra/missing members, unsupported producer classes or conflicting metadata refuse.

## Persistent schema and identity

Under the trusted owner's existing root, the additive namespace is `.uib/package-publications-v1/`:

- `staging/<random UUID>/`: incomplete private candidate; never searched by readers.
- `sealed/<publicationId>/index.json` and `bytes/<content SHA256>`: complete write-once publication.
- `selection/selected.visual.json`: optional explicit package-publication selection reference. It is separate from legacy package enablement and does not activate a package in normal workflows.

`index.json` is canonical JSON, schema `package-publication-v1`, containing owner binding, fixed producer/profile revision, package/Definition/export identity and a sorted complete resource index (logical id, length, media, SHA256, static dependencies). Definition revision is explicitly null where absent in the admitted canonical manifest. The publication identity is `pub_` plus SHA256 of the entire canonical index. No filesystem path, timestamp, session or permission grant belongs in the index. Source/byte profile revision and historical native admission fingerprints remain separately labeled.

The selection JSON is schema `package-publication-selection-v1`, exact owner binding, monotonically increasing safe-integer generation and exact publication ID. Explicit select requires the expected generation; absent selection has generation zero only for this compare-and-set write, never a readable default target. Selection is not installation identity or authorization.

## Visibility, failure and writer ordering

Use the existing canonical graph lock (`visual-runtime-graph-v1`) with `recovery: 'refuse'`, finite acquisition budget and cancellation. Validate the owner's root safety and recovery status. Stage complete exact bytes using exclusive creates, flush/close, verify index/bytes and set files read-only. Rename the nonempty candidate directory to its content-addressed final name as the sole visibility point. All supported producers serialize through the existing graph; an existing final identity always refuses and is never replaced. No merge, overwrite, recovery or partial completion is attempted.

Incomplete/interrupted staging remains retained and invisible; no automatic cleanup. A failure before rename cannot publish. Rename is the commit linearization point: if cancellation or an IO uncertainty races with its completion, the call may refuse without a result while a completely sealed directory exists. It is never selected automatically; a later explicit reader independently validates it. A directory or partial metadata alone is insufficient. Corruption/tampering refuses and is never repaired.

Selection writes use existing graph→canonical selection-role `withArtifactLock` order and existing `atomicWriteText`, after full seal validation and compare-and-set generation. No new transaction/recovery protocol is added. Selection readers use the same order and recovery-free root checks. All supported writes into the new namespace are owner methods; no existing installer, external build or catalog refresh is asserted to participate. They cannot produce a seal by changing legacy bytes. Direct hostile filesystem alteration is outside owner-write authority; readers still reverify every byte and refuse tampering. Read-only file flags are defense in depth, not a claim of Windows ACL enforcement.

## Lease, retention and immutable output

Readers open only an explicit sealed ID or exact expected selection generation. Under admission they verify canonical index identity/profile/membership and all byte lengths/digests, then return a private in-memory lease with frozen metadata and fresh byte copies on every access. No live file/path fallback. An admitted old lease remains bound to its original publication when selection changes. New opens at an old selection generation refuse. Cancellation before returned admission or lease expiry/disposal makes the handle unusable.

Each graph/role acquisition timeout is finite, positive and at most 5 seconds; it bounds waiting, not admitted filesystem work. Lease duration is explicit, positive and at most 30 seconds, measured with the monotonic clock. No lease extends itself or starts a cleanup timer. Sealed publications are retained indefinitely; no deletion/GC API exists. Lease expiration never redirects to mutable source. Eventual cleanup requires separately approved reader-retention, expiry, crash and deletion semantics.

## Refusals and compatibility

Structured generic refusal codes cover invalid input/owner, unsupported producer/profile, membership/identity mismatch, changed bytes, missing/unsealed publication, duplicate publication, stale selection, cancellation/expiry/disposal, bounded busy/unresolved/unsafe/recovery-required admission and generic IO/publication uncertainty. No original filesystem error/cause, PID, journal or policy details escape. Existing default behavior is unchanged. No unsealed installation is reinterpreted, migrated, repaired, repackaged or published on read. Failed selection writes do not change the legacy activation path. Caller-requested selection rollback is a new generation pointing to a retained valid seal; no content rollback or recovery occurs.

Gate B admits this narrow producer/reader and new selection reference only. It does not admit operational publication/selection, presentation sealing, current protected native/package reads, production authority, cleanup, package migration, D6-R2 orchestration or Preview. All verification uses disposable roots and the exact ordinary repository implementation bytes as nonexecuted fixture data; no installed/protected package source is acquired.
