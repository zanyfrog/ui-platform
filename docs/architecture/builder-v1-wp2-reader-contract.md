# WP2 explicit-role transaction and reader contract

2026-10-15. Normal Visual auto-save uses complete-candidate validation and Foundation's existing journaled engine. No arbitrary-filesystem atomicity is claimed.

## Exact transaction guarantees

The Node-only storage facade exposes explicit-role read/save, graph coordination and root recovery through existing Foundation locking, checksums, safe paths, commitTransaction and recoverTransaction. It does not duplicate the engine. HTML, CSS, .visual.json, fixtures and functions retain their names/formats; no implicit artifact.json is created.

Owner root, directory, canonical anchor and complete declared role set identify a transaction. Paths reject escapes, symlinks, duplicate case aliases and mismatched physical filename casing. Under the existing lock: capture before-image; check expected checksum; authoritatively validate complete candidate; recheck source; recheck original authority at admission; recheck source; journal/commit; verify complete readback. No-op saves retain checks without source writes.

| Situation | Guarantee |
| --- | --- |
| Participating same-process reader during commit/rollback | Waits on the existing lock; source captured after completion/recovery |
| Live writer in another process | Existing busy-lock failure; no indefinite cross-process wait promise |
| Dead writer | Stale PID handling and journal recovery before returning source |
| Write failure, rollback succeeds | Original snapshot restored; operation fails |
| Rollback fails | Journal retained; source.recovery-required; no successful new revision |
| Malformed/unlocatable/out-of-role journal | Fail closed; explicit operator recovery |
| External edit during validation/admission | Stale check rejects without overwriting that edit |
| Filesystem reader ignoring locks | May see sequential role replacements; no whole-bundle atomic visibility |

Root recovery precedes collection discovery, including a lost metadata anchor. Self-locating journals must match canonical identity, owner and complete role set; recovery verifies the original journal disappeared. Malformed journals are never silently discarded. Fault hooks are trusted service/test construction, never HTTP input.

## Reader and mutation coverage

| Path | Coordination |
| --- | --- |
| Generic editors | Existing Foundation transaction/recovery plus authoritative normal validation |
| Visual service read/list/save/create/remove | Recovery-aware explicit bundles; repair and normal saves share identity/lock |
| Page/Shell/Component/Form runtime | Default revision-aware Vite graph, complete validation, HTTP/module/cache guards |
| Generated/legacy Page entries | In-memory rewrite to same pinned Page/catalog graph |
| Settings, Menus and styles | Existing outer graph lock, candidate composition validation, expected-source checks |
| Shell/Region remap | Complete validated Page transaction, original authority |
| Source inspector | Protected complete snapshot and exact-hash function compilation |
| Application preview | Actual revision-aware Vite graph, shared helper identities |
| Application/workspace/Page discovery | Recovery-aware service/bundle capture |
| Fingerprint/copy/distribution/export | Captured role bytes, recovery first, private .uib storage excluded |
| Template update and presentation restore | Complete candidates validated, each bundle journaled, partial completion reported |
| Legacy presentation draft/manifest | Existing Foundation engine, original revision/owner/admission checks |

The existing outer Visual graph lock is acquired before role locks. It serializes cooperating graph work; it does not make a multi-artifact operation atomic. Explicit template/restore may complete some bundles/files before failing. Responses identify partial completion and retain source.recovery-required when relevant. There is no cross-artifact Undo or ACID rollback. Existing Publish/export behavior is preserved; normal editing never publishes or changes immutable published bytes.

Scheduled saves retain original User/session, permanent Application owner, policy authority and expected revision. Server admission rechecks captured session and fresh real I-AM authority, including after slow checks. Tab focus cannot substitute identity/owner/credentials. Revocation before admission blocks mutation.

## Remaining uncoordinated readers and external edits

Arbitrary filesystem readers, external tools ignoring locks, raw servers outside the installed plugins and custom plugins bypassing the guarded boundary are uncoordinated. The filesystem test deliberately proves raw partial visibility while a cooperating reader waits. Installed runtime readers separately prove that mixture cannot become their successful revision.

External partial/invalid source is rejected by complete capture validation and stale/inventory rechecks. Watcher refresh compiles only a valid complete current graph. There is no promise against an external actor intentionally racing after the final checksum check; that actor must cooperate with the same lock protocol. Advanced repair may persist invalid source, but does not make it loadable as a valid runtime revision.

## Recovery procedure

1. Stop the external writer/failed process. Preserve affected source and .uib/transactions for diagnosis. Do not delete a journal to make a save appear successful.
2. Retry a participating read. Foundation handles stale process locks and replays a valid before-image before returning source; collection recovery handles missing anchors first.
3. If source.recovery-required persists, keep the artifact blocked. Inspect canonical owner/anchor and the complete original role set; use verified before-image/backup and existing recovery. Malformed/unlocatable journals require explicit operator repair, never guessed replay.
4. Download a local recovery draft if needed, then explicitly reload/discard from authoritative source. The editor visibly resets/rebases only that artifact's history.
5. Correct invalid repaired source and use normal Save Now. A runtime revision becomes available only after validation, transaction completion and required recovery checks.

See [runtime design](builder-v1-wp2-runtime-design.md) for bounds/helper exceptions and [verification](builder-v1-wp2-verification.md) for fault injection.
