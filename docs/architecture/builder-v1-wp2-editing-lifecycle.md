# WP2 common editing lifecycle

2026-10-15. One lifecycle serves standalone and WP1 workspace editors. WP0/WP1 authority and permanent ownership remain in force. This adds no WP3 work, deployment, new publishing system or browser-restart persistence.

EditingLifecycle owns in-memory candidate/baseline, serialized saves, generations, status, logical Undo/Redo and suspension. Generic, Visual, automation, composition, Application settings and presentation adapters use it. Format services retain authoritative validation/persistence; this coordinator is not another storage engine.

## Behavior

Auto-save waits two seconds after inactivity. Related typing coalesces within 750 ms; structural/property operations retain logical boundaries. History is per artifact, survives successful saves and switching, invalidates Redo after a new edit, and is bounded by 100 entries and an 8 MiB conservative retained-value estimate.

Unchanged candidates do not write. Focus does not write by itself or cancel an authorized scheduled save. A save captures original generation, identity, owner, authority and checksum. Delayed responses cannot replace newer drafts; subsequent saves use the returned revision. Uncertain failures remain recoverable even after Undo to the former baseline. Conflicts retain local source and block automatic writes until explicit recovery.

| Status | Meaning |
| --- | --- |
| Unsaved | Local change awaiting debounce; invalid feedback pauses unchanged-candidate retry |
| Saving | Captured original operation in progress |
| Saved | Current candidate equals confirmed authoritative baseline |
| Save Failed | Failed/uncertain operation, local candidate retained |
| Conflict | Source/owner changed, local candidate retained and automatic writes blocked |

Native browser leave protection covers recoverable unsaved, invalid, failed and conflicted drafts. Successfully saved changes do not warn. Reload/discard confirms local loss when needed and visibly reports the artifact's Undo/Redo reset. Recovery download writes no source. There is no custom browser-close dialog or restart-persistence claim.

## Specialized coverage

| Editor | Shared lifecycle |
| --- | --- |
| Generic/source/properties | Same working-copy/context/shell; standalone and workspace history retention |
| Pages and Shells | Five-role candidates, source/property/structural operations, Save Now and recovery |
| Platform Components and Forms | Same Visual editor; public/Form definition operations retain canonical shared ownership |
| Triggers and Workflows | JSON/action list drafts, invalid action text retained, immutable identities validated |
| Menus/composition settings/styles | Per-source history, structured/source operations, full composition validation |
| Application settings | Per-User/permanent-Application copy and original file checksum; old timer replaced |
| Legacy design/layout/hero | Same engine, raw invalid form text retained, Foundation draft/manifest persistence |

Standalone Visual/composition pickers retain per-locator copies and refresh authoritative source on selection. Legacy Builder DOM is retained by original User and permanent Application across navigation. Normal saves always validate. Advanced repair remains separately named/confirmed and never changes subsequent auto-save mode.

Workspace adapters capture immutable original descriptor, User/session and Application before queuing. Inactive copies may finish already scheduled operations. Revoked copies are suspended/hidden; the next User cannot inherit source or credentials. Original-author recovery never uses a newly focused tab's context. Fresh real I-AM, owner and source checks run at server admission. Own in-flight commit notifications do not falsely become external conflicts.

General Application settings and composition settings share an existing file but have distinct scopes. Expected-source conflicts prevent silent overwrite; reload is explicit. Assets, Publish, source restore and other explicit multi-artifact operations retain their established flows without cross-artifact Undo.

See [runtime design](builder-v1-wp2-runtime-design.md), [reader guarantees](builder-v1-wp2-reader-contract.md) and [verification](builder-v1-wp2-verification.md). Specialized browser evidence is required in addition to storage tests.
