# Saved Card Target Identity and Selection Integration — contract inspection

2026-10-25. **Stopped before production implementation: required saved-node identity contract is absent.** This follows the user's explicit stop condition. No speculative surrogate, new source catalog, parser fallback or target mapping was added. Saved rendering remains unavailable. This report is a contract-gap deliverable, not a completed identity integration or rendering qualification.

## Identity and ownership map

Paths below are relative to the ui-platform repository; line references describe the preserved inspected source.

| Identity | Existing contract and owner | Admitted conclusion |
| --- | --- | --- |
| Original permanent Application | `src/shared/builder-workspace.ts`, `WorkspaceArtifact.applicationId`; production `shell-view.ts:77` forwards it separately from `applicationKey` | Already carried unchanged; applicationKey is routing context, not permanent identity. Application owner must match applicationId under the request validator. |
| Owner-qualified saved Page artifact | `WorkspaceIdentity` owner kind/id/optional revision, format and permanent id; `workspaceIdentityKey`; coordinator authorization identity comparison | Already forwarded as artifact identity. Repair locator is explicitly unavailable. This identifies an artifact, not a Card instance. |
| Stable saved Card node | `WorkspaceTarget.node` is optional navigation input; Visual editor `selectedNode` is private mutable editor state | No public saved-membership guarantee, committed-node provenance, uniqueness/ambiguity result or saved Card target. Navigation input cannot establish these facts. |
| Selected saved Page revision | `ArtifactBundle.hash` exists inside authorized Visual bundles; editor keeps `record.bundle.hash` and an editable baseline | No selected saved Page revision in `WorkspaceEditorState`, `ShellViewTab` or the view's request input. Owner revision, session revision and editing generations are not Page revision substitutes. |
| Canonical Card Definition and package | `WorkspaceArtifact.componentId` describes an artifact; editor inspector examines draft `data-uip-component` and workspace components/packages; `ComponentCatalogEntry` has packageName/exportedName | No public binding of the selected committed Page node to a canonical Card Definition and package identity/revision. A package entry alone is explicitly unavailable. |
| Dirty draft/editor | `EditingLifecycle.current/baseline`, local generation/savedGeneration, private selectedNode; adapter exposes dirty/pending/conflict/error | Informational editing state only. No inference from clean state, dirty state, retained focus, DOM options, labels, indexes or generated node ids is valid. |

## Exact dependency and lifecycle boundary

`shell.ts:164-165` projects coordinator tabs into the actual view using `tab.editor.state()`. `coordinator.ts` defines that state as dirty/pending/conflict/error, and leaves selection inside editors. `adapters.ts` forwards the Visual editor's state without a saved target. `shell-view.ts:74-79` therefore supplies subject/session/Application/artifact/kind/dirty only. The controller imports the shared request contract; that contract's sole runtime import is `workspaceIdentityKey`. No new dependency is introduced.

`visual-artifacts/editor.ts:29-30` holds selected artifact, files, baseline, hash and selectedNode privately. `renderStructure` at lines 109-112 parses current editable source and includes `manual:${index}` placeholders. Its selection listeners at lines 336-337 change selectedNode/render presentation without publishing a committed identity. Insert selects a newly generated draft child; remove clears selection. `focus` at lines 427-440 accepts navigation.node without proving committed membership. The public state at line 424 returns aggregate dirty, pending and conflict only.

The save lifecycle at lines 280-304 replaces the retained bundle after an ordinary save and tracks its hash. This is useful internal editing information but is not an exported, atomic, source-free saved-node/Definition mapping. `EditingLifecycle` generations sequence local edits and saves; they are not saved Page revisions. Obtaining source from authorized payloads, parsing a baseline or examining DOM options to fill this gap would exceed this increment's source-free boundary.

Existing sequencing, invalidation, suspension, park/remount and disposal code is byte-identical. No selection adapter, event listener, timer, source access, editor operation, history mutation, save/flush/reload/discard, renderer or authority behavior changed. Missing saved nodes continue through the existing `SAVED_NODE_UNRESOLVED` readiness result. The production interface cannot yet classify stale/duplicate/ambiguous saved targets individually; all lack an established saved target. Tests that directly author `sourceNode` do not prove production provenance.

## Minimal separately authorizable contract

Authorize the existing authoritative editor/source owner to expose one immutable, ordinary in-memory selection snapshot and invalidation subscription, without consumers acquiring or parsing source. It must bind the original Application and owner-qualified Page identity to the exact saved Page revision, unique committed Card node id, canonical Card Definition and package/export identity with its defined revision semantics. It must explicitly report absent, unsaved, renamed, stale, duplicate, ambiguous, repair-only, package-only and unsupported targets; dirty remains a separate informational flag.

The owner must define how that saved mapping is established and retained across edits, rename, save success/failure, concurrent save, external revision changes, Undo/Redo, navigation, owner/session change, suspension and disposal. A draft must never certify itself as committed. Every relevant change must invalidate the snapshot atomically before publication; delayed events/completions cannot restore an earlier target. Consumers must receive no source bytes or executable capability. Establishing or validating that provenance against saved source needs its own explicit authorization; this report does not authorize it or prescribe a new catalog/parser. Only after this contract exists can production adapter → coordinator → shared view → request identity plumbing and its memory tests be implemented honestly.

## Verification and preservation

This increment performed static contract inspection and byte-hash preservation checks only. No application/test module was imported or executed, no backend/browser/editor was launched, and no runtime identity assertions are claimed. Exact executable import admission for application tests is therefore not applicable: implementation and dynamic verification stopped at the mandatory contract gate. Existing verifier and historical 25-test/five-checkpoint evidence are preserved, including the unsuccessful attempt; they are not rerun or presented as verification of a new saved Card mapping.

`evidence/builder-v1-wp5-f-card-target-identity-20261025/baseline.json` enumerates the pre-write hashes of 707 files in source, tests, scripts, documentation, historical evidence and Visual model source. `preservation.json` records each after-hash, HEAD equality and exact new-file inventory. This is a scoped enumeration, not a protected-store or whole-workspace preservation claim. Original accepted code was already locally modified/untracked at entry; its bytes are compared to entry, not reset to HEAD. There are no changed or deleted baseline files. Thus editing, autosave, Undo/Redo, checksum and file/range implementations are preserved by byte comparison, not newly operationally qualified. No test attempt occurred in this increment; prior failed attempts remain intact.

No protected artifact/store/lock/journal/transaction reads, recovery or lock investigation continued. No D6/Foundation execution, I-AM database/production owner resolution, package registration, native construction, renderer change, endpoint, authority grant, permission bypass, Windows token/elevation/VM/WinPE work, commits, pushes or synchronization occurred.

Complete WP5-F, D6 and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.

Stop: **WP5-F Saved Card Target Identity and Selection Integration — Increment Acceptance Review Gate**.
