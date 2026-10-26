# Saved Card Identity to Production Builder Request — increment review

2026-10-26. **Integration implemented for acceptance review.** The actual production owner → adapter → coordinator → shell/view → SavedPreviewRequestController path now carries retained saved Card metadata and invalidation. The provider remains permanently unavailable. This is not fresh source acquisition, production authorization, actual rendering or Publish.

The previous owner increment is accepted/closed separately by `builder-v1-wp5-f-saved-card-selection-closure-20261026.md`. Its report/contract/inventory and passing/failed evidence are preserved. The preimplementation gate and exact intended wiring are recorded in `builder-v1-wp5-f-card-request-wiring-map-20261026.md`; the final metadata/lifecycle contract is `builder-v1-wp5-f-card-request-contract-20261026.md`.

## Exact production implementation

| Existing file | Change |
| --- | --- |
| `src/client/builder-workspace/shell.ts` | One additive field in tab projection: savedCardTarget from the actual editor abstraction. Static normalization removing only this field matches the entry source after line-ending normalization. No new root callback, service, poll or authority transition. |
| `src/client/builder-workspace/shell-view.ts` | Optional reader in ShellViewTab; one focused reader subscription with binding epoch, current-metadata comparison and source/selection generation fence; exact owner echo/node/hash projection; synchronous forced replacement; detach and uncertainty handling across navigation, context, park and disposal. No Page parser or source resolver import. |
| `src/client/builder-workspace/saved-preview-request.ts` | Compatible optional forced invalidation on select. Selection replacement and request cancellation occur before notification; forced callbacks cannot resume closed/suspended/parked lifecycle states. Existing async request generation check stays in force. |
| `src/shared/saved-preview-request.ts` | Optional strictly validated ownerSelection wire metadata, exact original identity/context consistency checks, complete metadata/generation key, and SOURCE_OWNER_UNAVAILABLE refusal. Fixed unavailable provider retains no success branch. |

Accepted source owner/helper, actual adapter/coordinator, parser/validator, Definition/package declarations, fixture/native code and L1/L2/L3 are byte-identical. The adapter already exposes the same reader and the coordinator already retains that editor; neither needed another implementation change. Builder/coordinator/controller do not interpret Page source or maintain a catalog. Request metadata is explicitly an echo, not source-owner authority.

## Gate and authority boundary

The existing reader supplies all required original metadata. The shell already has focused subject/session/Application/qualified artifact context, so it can compare the two without resolving an owner or fetching authority. Missing/conflicting context fails closed. No new production session/owner/backend transition was required or executed. Original-context rebinding, fresh server currentness, real rights and delivery remain separate prerequisites.

The bridge reads current owner metadata only. Original Application/Page/hash/node, Definition/package/export/revision, session and both owner counters are preserved; the exact node/hash also fill the preexisting sourceNode fields. RETAINED_SAVED_VERSION_ONLY remains provenance of a version previously known to the owner, never current permission/coherence or Preview readiness. The wire metadata carries no source, credential, resource URL or capability.

## Scoped verification

Final run: `evidence/builder-v1-wp5-f-card-request-integration-20261026/run-1793012122446`.

**41/41 named contract/controller tests passed**, including the 25 preserved original controller/contract tests plus 16 integration-specific tests. They cover exact copied owner metadata, source/implementation separation and explicit null revision; original Application/Page/owner/subject/session/node/hash conflicts; invalid generations/extra capability fields/provenance; unavailable owner with no node; all metadata/generation key changes; synchronous pending replacement, repeated identical owner emissions, late completion and parked/suspended/disposed refusal. Tests run serially, with zero configured retries and no workspace discovery/setup hooks.

**18 actual production-path integration checkpoints passed** in the admitted DOM environment:

- Exact owner → actual adapter → actual coordinator → shared production view/controller identity/hash/Definition/package/session/generation propagation and permanently unavailable status.
- Dirty edits immediately remove the saved target and cancel pending checks; navigation through the actual delegated view action uses only explicit new owner selection.
- Known source revision and qualified owner changes, session/subject suspension, park/remount, missing readers and same-node new owner generations cannot restore prior requests.
- Late callbacks from detached readers, older emissions on the same binding, and a delayed emission exposing an unseen current refusal cannot replace current identity. An uncertain getter clears the target.
- Undo/Redo remains usable and never restores cached request identity; close/disposal remove subscriptions and suppress late completions, including disposal with a pending request.
- Matched original-versus-current consumer bundles preserve editing and autosave traces; readiness checks introduce zero transport/authority/editor effects, including while an ordinary memory save is pending.

The final before bundle uses the exact preserved preincrement **view, controller and shared request schema**, alongside the identical accepted source owner/adapter/coordinator/editor and memory facades. The current bundle uses the actual changed modules. Matched snapshots include source bytes/SHA-256, file=`source`, range [3,11], history flags and actual Undo/Redo, dirty/pending/conflict state, exact save bodies/expected checksums/times, fixture text/kind/sample and existing navigation/session callback counts. Disabled autosave produces zero saves; enabled autosave produces exactly one ordinary memory save at 2,000 ms after the final edit/Redo (2,751 ms relative timestamp). Checks before/during/after pending save leave those snapshots/counters unchanged. Existing editing/lifecycle/persistence implementation is not modified.

**Scoped strict TypeScript check passed** for the actual shared request schema and controller: ES2022/NodeNext, strict=true, skipLibCheck=true, noEmit and no automatic ambient types. Its recorded 13-file non-library closure includes the exact shared DTOs/workspace identity, pure Visual model/source/composition and sibling declarative-expression contract, the test type barrel and data-only artifacts/types.ts declarations. No storage/reader/operational module executes. Library declaration hashes/options are recorded. The actual view/adapter/coordinator/editor are syntax compiled/bundled and runtime exercised within the admitted closure; this is not a full editor/server/workspace typecheck or build.

## Exact execution admission and limitations

The dedicated verifier records hashes, raw input copies and replacement map before compilation; it denies unlisted executable inputs and saves resolved graphs before execution. Production source bytes are used for editor/helper, adapters.ts, coordinator.ts, shell-view/controller/shared contract, workspace identity, fixture panel/host/lifecycle/protocol/samples/raw bootstrap data, and the existing editing/autosave/specialized transport/saved-source stack. The accepted shared Visual pure graph is supplied by the exact existing source-only test barrel. Package declaration JSON is data only. The normal shell root is syntax/static compared and never launched.

The **actual adapter's Page branch executes**. Existing session/binding and workspace-request imports resolve only to explicitly admitted authored memory facades. Unrelated generic/form/composition/automation constructors and callbacks imported by that adapter resolve to throwing test stubs; any invocation fails verification. This avoids operational module initialization without replacing the Page adapter or source-owner implementation. The session facade contains authored subject/revision data and a noncredential header marker; it is not production authority qualification or another product identity source. Real session/request modules, I-AM, backend/default source readers, native renderer and package runtime index are excluded from executable graphs; DEV=false removes default session initialization.

The actual DOM/editor/view initializes existing listeners/timers in happy-dom. Test-platform DOM constructors/Option, realm-local clone for admitted plain metadata, deterministic clock and WebCrypto completion barriers are explicit tooling support. They do not qualify browser layout/focus/security or arbitrary structured-clone types. Memory callbacks model only authored ordinary navigation, known external refresh and matched autosave. Readiness adds no headers, authorization/navigation/source callback, save/flush/reload/discard, persistence or network request. Unexpected branches, fetches, native frames and DOM errors fail; final raw observations contain no unexpected callbacks/network/errors/frames. Disposal clears existing editor timers and session observers. Fixture rendering/native refresh is not invoked; fixture controls/state remain preserved.

## Retained attempts

1. Initial separately admitted run passed 40 tests, typecheck and 12 integration checkpoints.
2. Expanded lifecycle/pending-autosave checks passed contract/type phases but failed verifier cleanup: observation code directly read the deliberately throwing test reader getter. The production bridge had already cleared its target. Raw failure, progress, input copies and verifier source remain retained.
3. Observation cleanup recorded getter errors safely before disposal; the same scoped checks passed.
4. Added current-reader comparison/decreasing-generation fences and same-reader delayed callback coverage; passed.
5. Added unseen-current-refusal synchronization through delayed delivery; 41 tests/18 checkpoints/typecheck passed.
6. Strengthened the regression before bundle to use exact original view/controller/shared schema together; final 41/18/typecheck and matched traces passed.

Every invocation is separately admitted with zero configured retries. All raw outputs, resolved graphs, input versions, unsuccessful evidence and generated verification bundles are retained. Historical source-owner/parser failures and inventories were not rewritten.

## Preservation and inventory

Entry baseline enumerates **1,067** files across source/tests/scripts/docs/historical evidence and Visual implementation source. Final comparison records **1,063 unchanged**, exactly four authorized existing-file changes listed above, and no deletions. The prior accepted 239-entry owner inventory is rechecked unchanged. Accepted owner/adapter/coordinator, parser/Definition, native/CSP/sandbox, L1/L2/L3, fixture and editing/autosave/history implementations remain byte-identical within the enumeration. HEAD remains unchanged. This is a scoped preservation claim, not inspection of protected saved storage or the whole workspace.

`preservation.json` records every before/after hash and prior-inventory confirmation. `builder-v1-wp5-f-card-request-files-20261026.json` is the exact new/modified file inventory, including all attempts; only its self-entry omits a recursive digest. No commits, pushes or GitHub synchronization occurred.

## Remaining prerequisites for the first genuine saved Card Preview

The request now identifies the retained Card precisely but cannot acquire, authorize or render it. Fresh coherent saved-source/dependency capture still requires separately qualified Foundation/D6 participation/currentness and refusal semantics. Production subject/session/owner/policy admission, ordered invalidation and rights expiry remain unqualified. Immutable resource closure/delivery, approved activation/race/retention/concurrency limits and native capture-to-render integration also remain separate work. Publish is not implemented or qualified. No direct protected Component/D6/lock/recovery/I-AM access, native Card/CSP/sandbox/parser/Definition/L1/L2/L3/persistence change, Windows token/elevation/VM/WinPE or operational investigation occurred.

Stop: **WP5-F Saved Card Identity to Builder Request Integration — Increment Acceptance Review Gate**.

Complete WP5-F, D6 and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.
