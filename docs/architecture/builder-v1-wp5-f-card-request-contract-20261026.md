# Saved Card identity to Builder request — metadata and lifecycle contract

2026-10-26. The request receives an optional `ownerSelection` metadata echo from the existing `savedCardTarget` reader. This echo is not the source owner's opaque result, an authorization token, server-current source evidence or Preview availability. The production provider still has only unavailable outcomes.

| Owner field | Request field / check |
| --- | --- |
| Original Application | Existing selection.applicationId must equal ownerSelection.target.source.applicationId; applicationKey stays a distinct routing key. |
| Owner-qualified Page | Existing selection.identity must match source.page exactly through workspaceIdentityKey, including owner revision. Identified metadata is valid only for a Page. |
| Committed hash / node | Full source metadata is echoed. Exact source.nodeId and committedHash map to legacy selection.sourceNode.nodeId/savedRevision; conflicting values refuse. No default or inferred node exists. |
| Definition/package/export/revision | target.implementation carries componentId, packageId, packageVersion, importPath, exportName and explicit nullable definitionRevision unchanged. These are implementation identity, separate from Page/node source identity. |
| Session | target.context subjectId/sessionRevision must equal the original focused selection metadata. No session/owner resolution or reauthorization occurs here. |
| Source/selection generations | Both safe nonnegative counters are echoed. They are owner currentness counters, distinct from the controller's request generation and the committed content hash. |
| Provenance | Identified metadata requires exact RETAINED_SAVED_VERSION_ONLY. This never produces ready/allowed/rendered/captured state. |
| Unavailable owner | Exact reason and generations are retained with target:null. sourceNode must be absent. Readiness returns SOURCE_OWNER_UNAVAILABLE. |
| Missing reader | No owner metadata or node is invented; a Visual Page remains SAVED_NODE_UNRESOLVED. Repair/package/unsupported precedence stays compatible. |
| Invalid/conflicting metadata | Strict plain-data/descriptor/exact-field validation rejects accessors, extra keys and conflicts; controller clears pending data and reports UNRESOLVED_IDENTITY. |

The legacy request contract remains compatible for existing explicit callers. The production view creates sourceNode only from an identified current owner snapshot. Strict request validation copies metadata; it does not validate source bytes, produce source-owner provenance, grant authority or make serialized copies into trusted owner results.

## Binding and request lifecycle

The production shell projects the actual adapter's existing optional reader through coordinator tabs into ShellViewTab. The shared view binds one mounted, active, focused, nonsuspended tab with a principal/session. It detaches on tab/context/reader change, disappearance, park and disposal. No source bytes or editor operations cross this bridge.

Each binding has a private epoch and last source/selection counters. Old detached callbacks are ignored. A delivered snapshot is compared with the same reader's current metadata; stale emissions cannot replace newer metadata. If a delayed event reveals an unseen current refusal, that current metadata is consumed and the old request is invalidated. Decreasing generations fail closed. This bookkeeping is one reader binding, not another source/identity catalog.

Owner emissions atomically replace the controller selection and cancel pending requests, even if metadata is repeated. No intermediate notification retains an old node/hash. Ordinary render updates preserve dirty hints without resetting an unchanged request. The controller's compatible forceInvalidation option cannot resume parked/suspended/disposed controllers. Existing request generation checks reject late asynchronous completions after any replacement/invalidation.

Reader subscription/getter/detach uncertainty cannot preserve a target. Missing current metadata clears node/hash. Late completions never restore prior readiness. Park/remount does not restore cached source identity; a current identified owner result is needed. Original session/owner context decisions remain the existing source owner/root's responsibility. The integration compares metadata and refuses conflicts; it does not create a second context authority.

Every completed production check returns an unavailable result. Identified retained metadata yields PROVIDER_NOT_QUALIFIED; owner refusal yields SOURCE_OWNER_UNAVAILABLE; missing/repair/package/unsupported inputs retain existing truthful refusals. The visible status continues to state that saved-artifact rendering is unavailable. The completion barrier is test sequencing only and cannot supply a grant, capture, success or renderer.

Fixture Preview, source ownership, parser/Definition semantics, editing/history/autosave/persistence, native Card/CSP/sandbox and accepted L1/L2/L3 contracts are unchanged.
