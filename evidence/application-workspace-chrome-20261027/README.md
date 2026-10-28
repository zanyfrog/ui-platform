# Application workspace header changes

User-authorized UI adjustment, 2026-10-27. Existing practical-authoring work remains open and is not reclassified by this change.

Two logical product files changed: src/client/main.ts and src/client/styles.css, synchronized to the admitted disposable copy after confirming both pre-edit copies had identical hashes.

Selected applications omit application-list search/New Application controls. Overview retains full information; editing tabs default to a compact name/status header with an accessible Show/Hide details toggle. The previously unbound hamburger button becomes a native details ellipsis menu, forwarding Preview, Export and Trash to existing handlers/confirmation paths. No actions were executed against an application during verification. Nested tab events cannot change the outer application header.

check.mjs executes the exact shell/renderApp declarations in an isolated DOM with explicit mock data and mount boundaries. It checks main.ts syntax, retained list controls, their absence inside an application, Overview/Pages header behavior, toggle state and forwarding an action to the existing control without calling its service. This is not normal-session proof or full semantic typechecking. Checks and git diff --check pass. A PowerShell pipe syntax typo and one runner invocation with the wrong relative path were corrected; neither modified product files. Final evidence is result.json.

The existing admitted Chrome tab reports ERR_CONNECTION_REFUSED at localhost:5374, so no live browser rendering is claimed. No server was started and no alternate operational environment was accessed. No Page, authorization, autosave, recovery, Preview renderer or pre-existing refresh-scheduling code was changed. All 25 previously existing Page-file hashes remain unchanged. No commits or pushes.

Pre-edit snapshots, exact changed-file hashes and Page preservation checks are retained in this directory.
