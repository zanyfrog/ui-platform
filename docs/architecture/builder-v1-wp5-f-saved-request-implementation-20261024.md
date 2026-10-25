# Production Builder Saved Preview Request and Readiness Wiring

2026-10-24. Implementation complete for increment review; acceptance is pending. Saved-artifact display remains unavailable. This is production-interface wiring, not coherent source acquisition, authorization or rendering qualification.

## Implemented boundary

The production Builder composition root constructs `SavedPreviewRequestController` and passes it to the shared `createBuilderShellView`. The isolated harness uses these identical modules. The visible **Check saved Preview availability** action invokes that controller through the existing delegated listener. Its status always states that saved-artifact rendering is unavailable. Existing fixture controls remain separate.

The shared runtime contract validates exact plain-data fields, original subject/session/Application/owner-qualified identity, optional explicitly supplied node/revision, kind and dirty hint. It rejects unexpected keys, accessors, symbols, conflicting ownership and invalid generations. It copies accepted values. A dirty hint is informational; unsaved content is never read into this request. The production view does not infer a source node from a package or locator.

| Input / lifecycle | Supported outcome |
| --- | --- |
| No selection | `NO_SELECTION` |
| Repair locator without permanent identity | `REPAIR_ONLY_IDENTITY` |
| Invalid or conflicting original identity | `UNRESOLVED_IDENTITY` |
| Package-owned or package Definition | `PACKAGE_DEFINITION_ONLY` |
| Unsupported artifact | `UNSUPPORTED_ARTIFACT` |
| Visual selection without explicit saved node | `SAVED_NODE_UNRESOLVED` |
| Authored complete visual selection | `PROVIDER_NOT_QUALIFIED` |
| Identity/source change or superseding check | Generation invalidation; late completion cannot restore prior result |
| Park, session/owner suspension, disposal | Clear pending request/result; disposal is terminal |

There is no available/authorized/success result, source provider, API route, capture, token, resource delivery or native host construction. An optional deterministic completion barrier cannot supply a result. Runtime imports of the new controller/contract are only the new contract and existing workspace identity helper. No L1/L2 Node model or NativeCardHost is imported.

## Production ownership and preservation

The preimplementation wiring map records exact ownership. Existing saved-source/workspace callbacks additionally invalidate readiness. Existing session/authority suspension paths additionally suspend it. No callback movement, new polling, listener, editor operation or scheduler was introduced. Root normalization removes only these documented additions and matches its starting source exactly. Actual production root execution is outside this verification boundary.

Of 1,661 enumerated starting files, **1,659 remain byte-identical**, exactly two authorized existing files changed (`shell.ts`, `shell-view.ts`), and none were deleted. HEAD is unchanged. `preservation.json` enumerates every starting hash and current hash, including accepted L1/L2/L3 sources, historical evidence, fixture/native code, editing/autosave and explicitly admitted sibling source files. Existing historical records and umbrella checklists were not rewritten. This is an enumerated baseline claim, not a claim to hash unlisted protected storage.

## Scoped verification

Exact source admission, hashes, resolved executable import graphs and production-module identity are recorded per run. The dedicated verifier compiles only explicit entries, denies unlisted input modules, uses no workspace test discovery/setup hooks, and runs one named test file serially with zero retries. Test compilation and harness bundling are scoped verification artifacts; no application build or ordinary backend launch occurred. The normal root is syntax-transformed/static-compared only.

Final run: `evidence/builder-v1-wp5-f-saved-preview-request-20261024/run-1792894403138`.

- **25/25 named contract/controller tests passed.** Includes unavailable codes, strict input rejection, identity copy, owner/session/Application/artifact/node changes, dirty-only stability, supersession, source change, park, suspension, disposal and late completions.
- **Five browser checkpoints passed**, using the actual shared production view/controller and real editing context/working-copy/coordinator/source-editor with authored session answers and memory transports. They cover the actual action, original identity, dirty source/checksum/history/file/range/editor DOM, navigation/source invalidation, park/remount, simulated session suspension/disposal, and forbidden-effect probes.
- Actual Undo/Redo remains usable after readiness checks and navigation/park/remount; the redo candidate and restored dirty draft are asserted. Matching no-check/check autosave traces preserve source, identity, checksums, file/range, history flags and operation calls: disabled autosave produces zero saves; enabled autosave produces one ordinary save at exactly 2,000 ms, including checks during pending save.
- Receiving loopback server observes only its memory HTML and harness bundle. Browser probes record no unexpected network/source requests, iframe construction, default-service callbacks, downloads, file chooser or navigation. A test-only exact session facade supplies authored identity; no real session or authority service is exercised.
- Scoped TypeScript check passed (`typecheck.json` contains exact flags/entries). It enables strict null checks with `noImplicitAny=false` and skips library checking; this is not a whole-workspace strict typecheck.

Historical attempts are retained: `run-1792894252462` passed the original 25 tests/five checkpoints. `run-1792894302867` passed unit tests but failed the newly added browser setup assertion that the undone selection was dirty. Two fills at the same controlled time belonged to the existing 750 ms edit group, so Undo returned to the clean baseline. The verifier now advances its injected clock by 751 ms between those edits. No production history code changed. This was a corrected test setup followed by a separately invoked final run, not a configured retry. All failed and successful artifacts remain inventoried.

Fixture implementation bytes are preserved and fixture control/status observations remain stable. Native fixture rendering was intentionally not launched; this increment does not repeat prior native security qualification. CSP/sandbox/security implementations remain byte-identical. Live production authority suspension is statically wired and deterministically modeled, not operationally qualified.

## Prerequisites for one real saved Card

1. Explicit original saved-artifact/node/revision mapping from Builder selection; package Definition identity alone is insufficient.
2. D6 operationally qualified coherent acquisition, participating membership/dependency closure, revision/byte consistency and complete source-writer coverage; refusal on ambiguous ownership or mixed generations.
3. Real trusted I-AM/session/permanent Application owner/policy integration, durable ordered invalidation and reconciliation, rights expiry and healthy-channel semantics. Injected answers remain model evidence only.
4. Immutable capture/resource identity, byte and membership validation, fresh delivery admission on every request and an approved production disclosure-race boundary. No live URL/source fallback.
5. Approved activation-blocking timing, heartbeat, retention, byte/resource/concurrency ceilings; no values are invented here.
6. Separate authorized integration of admitted native Card capability, captured resource closure and restricted frame, with native/browser/backend execution gates and captured-byte compatibility evidence.

No protected acquisition/store/lock/journal/transaction access, D6 execution, I-AM database access, Windows Identity/token/elevation/VM/WinPE/recovery, commits, pushes or synchronization occurred. Complete WP5-F, D6 and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.

Stop: **WP5-F Production Builder Saved Preview Request and Readiness Wiring — Increment Acceptance Review Gate**.

The exact new/modified file inventory and hashes are in `builder-v1-wp5-f-saved-request-files-20261024.json`; the inventory self-entry intentionally has no digest.
