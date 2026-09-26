# Generic Artifact Editor Phase 2 — WP4 rich source editing

Date: 2026-09-26. **WP4 stage gate: implemented; WP5 has not started.**

## Architecture

WP4 adds `src/client/artifact-editor/source-editor.ts`, an editor-local DOM panel layered on the existing `EditorRuntimeContext`. It exposes the manifest and every declared artifact file through one selectable raw-source control. A source input calls only `context.setManifest()` or `context.setFile()`. Consequently Properties, descriptor-section plugins and Source observe the same `EditorWorkingCopy`, generation, debounce, in-flight-save reconciliation, conflict handling, authorization checks and recovery flow. No formatter, validator, transport, source store, autosave timer or save endpoint was introduced.

Foundation already formats supported content inside its existing transactional save. The Source panel therefore describes and uses that behavior through the normal Save action rather than creating a competing client-side formatter. Saved diagnostics remain authoritative; drafts are not represented as validation results.

## Source safety and synchronization

Raw source is always retained verbatim until Foundation’s existing save transaction returns its formatted/validated response. JSON whose root is not an object and malformed JSON are explicitly marked as not safely representable by visual controls. Existing Properties compatibility guards continue to identify malformed JSON, duplicate keys, unexpected scalar/object shapes, ambiguous collection identities and unsupported collections, while leaving their source untouched. The source panel is intentionally the repair path for those cases.

Normal shell rendering re-reads the current shared snapshot, so a source edit refreshes Properties/plugins and a visual edit refreshes the selected source control. The panel preserves source-file selection; the shell’s existing focus/caret restoration remains in effect for ordinary edits. A selected authoritative diagnostic with `file`, `line` and optional `column` opens the relevant raw document and moves the caret to the closest valid location. Diagnostics without a supplied location say so rather than inventing a location.

Source controls and file selection are disabled when the context cannot edit. Identity invalidation continues to synchronously remove all source DOM. Original-user comparison/recovery, checksum decisions and read-only recovery remain owned by the WP2 runtime context.

## Compatibility and limitations

- The response DTO, Foundation APIs, Phase 1 host, descriptor registry, plugin registry and security boundaries are unchanged.
- The tab label changes from **Source preview** to **Source** because it is now a raw editor. Presentation tab ordering still uses the same `source` key.
- WP4 does not parse or regenerate TypeScript/CSS/Markdown in the browser, offer semantic code completion, invent diagnostic locations, perform visual edits for unsupported structures, add references UI, or start WP5 proof editors.
- The known Windows watcher directory-rename `EPERM` is still tracked separately in `artifact-watcher-windows-rename-issue.md`; WP4 neither changes nor masks it.

## Evidence

- `npm run typecheck` passed.
- `npm run check:editor-contracts` passed: 103/103 compatibility assertions in 13 files.
- `npm run check:editor-production` passed (production build plus editor-exclusion check). The existing >500 kB client chunk warning remains.
- Real-browser harnesses passed on local Vite: 10/10 Properties/plugins/source cases and 9/9 shell/runtime cases. Coverage includes malformed raw source, unsupported visual structure preservation, source/property synchronization, diagnostic location navigation, permission invalidation, original-user recovery, read-only recovery, conflicts and cleanup.
- `npm test -- --maxWorkers=2` completed 177/178 assertions: the only failure was the separately tracked Windows watcher rename `EPERM` in `packages/artifacts/tests/watcher.test.ts`.

**Stop at WP4. Do not begin WP5 without explicit authorization.**
