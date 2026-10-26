# D6-R1 recovery-free read contract

2026-10-26. Optional `recovery: 'refuse'` travels in the existing `ArtifactLockOptions` / additive `RoleBundleReadOptions`. Omission preserves existing recovery defaults. This is acquisition policy, never authority, source freshness or Preview readiness.

## Owner and propagation

`withRuntimeGraphRead(options)` → `withRoleBundleGraph(options)` → existing canonical graph lock → Foundation root refusal check → callback. `VisualArtifactService.list(options)` → Foundation root check → each `read(locator, options)` → `readRoleBundle(location, options)` → existing canonical anchor/role lock → Foundation root refusal check → existing capture. `read` alone uses the same role enforcement. No precheck followed by recovering capture. All options propagate; `saveRoleBundle` keeps its original default path. Existing composition lock forwards options unchanged.

The root check is the existing Foundation root traversal, branched before journal reading/parsing. In refuse mode any pending journal, including malformed/unlocatable or missing-anchor transactions, blocks the root. Unknown transaction entries and unsafe storage also block it. Empty legitimate transaction directories are allowed. This conservatively refuses unrelated retained journals under that owner root. It creates no transaction directories and never reads journal contents.

Existing canonical physical root/anchor identity, graph-before-role ordering, source capture/checksum, shared acquisition deadline, local queue, cancellation, callback-once and ownership cleanup remain in force. Refuse-mode foreign lock text is syntax checked only: valid PID text is busy, never liveness evidence. No PID probe, stale reclamation or recovery guard creation. Existing recovery guards/nonfile locks refuse. Only the caller's exclusively created lock is published, synced, closed and removed. Close uncertainty prevents unlink and success. Coordination directories may be created as required by the existing protocol.

## Refusal taxonomy

| Outcome | Meaning |
| --- | --- |
| `source.busy` | Existing valid-looking owner or exhausted acquisition budget. No dead/live inference. |
| `source.owner-unresolved` | Empty, malformed, unsafe integer or ambiguous owner publication. |
| `source.admission-unsafe` | Existing recovery guard or nonregular/symlink lock in refuse mode. |
| `source.recovery-required` | Pending journal, unknown/unsafe transaction membership or unreadable recovery-status metadata. No journal contents or underlying owner metadata attached in refuse mode. |
| Original abort reason | Cancellation, including during root inspection. No callback replay. |
| Existing canonical/path/order/IO/cleanup error | Admission failed; no snapshot returned. Existing errors remain distinguishable; consumers must not expose raw internal filesystem errors. |

Invalid mode values refuse before lock coordination. Busy/unresolved acquisition may wait within the caller's existing bound; no admitted callback is retried. Recovery-required and unsafe outcomes do not enter recovery or become successful partial collections. Visual validation diagnostics retain their existing meaning; successful file acquisition does not certify semantic validity.

## Limits

The mode does not change lock format, ownership authority, transaction semantics, filesystem adversary assumptions or participating-writer requirements. Individual role reads do not become a multi-artifact coherent capture. A caller establishing graph-wide coherence must hold the existing graph authority across the whole discovery/capture/revalidation closure. No operational qualification is implied. There is no automatic retry into default mode.

Stop at **D6-R1 Recovery-Free Read Admission Contract — Increment Acceptance Review Gate**. Complete WP5-F, D6 and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.
