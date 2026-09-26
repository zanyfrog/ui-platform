# Generic Artifact Editor: transport and working copy

The first editor deliverable implements a browser consumer of the existing Artifact Foundation 0.1.0 service. The root workspace dependency is pinned to 0.1.0. Foundation definitions, validators, storage, schema adapter and public contracts are unchanged by this implementation.

## Server endpoints

Under `/api/apps/:appKey/artifacts`:

| Method | Suffix | Result |
| --- | --- | --- |
| GET | none | Discovered summaries, including malformed artifacts |
| GET | `/:locator` | Serializable editor artifact |
| PUT | `/:locator` | Save; requires `expectedChecksum` |
| GET | `/:locator/validation` | Authoritative saved-source diagnostics |
| GET | `/:locator/references` | Outgoing references |

Discovery supplies opaque process-local locators. They are scoped to the application and remain stable across identity repair for the lifetime of its workspace service. After a server restart, rediscover artifacts; a stale locator returns 404. Browser requests cannot supply a filesystem root or an arbitrary bundle path. Foundation retains its own realpath and file-safety checks. The adapter follows the existing local platform server access model; this repository has no user authentication or application ACL middleware. A remotely authenticated deployment needs that protection at the host boundary.

The server and watcher share one service per application. Browser payloads omit definitions and absolute bundle/file paths; diagnostic file locations become bundle-relative. `artifact-change` SSE payloads contain only application key, locator, changed/removed kind, and optional checksum. Browser reconnects reconcile missed changes through load. Conflicts return 409 separately from operational failures; server logs retain operational error details.

`ArtifactEditorWorkspace` accepts an optional build queue exposing the existing `ApplicationBuildEngine.onSourceChanged` method. Both successful saves and external watcher changes notify it. Observer failures cannot turn a committed save into a failed save response. The current platform server does not instantiate an application build engine, so production build execution remains unconnected until its host integration is configured. The integration hook is tested with both event origins; it does not introduce another queue or compiler.

## Browser host usage

Import `discoverEditorArtifacts` and `createArtifactEditorTransport` from `src/client/artifact-editor/transport.ts`, then create one `EditorWorkingCopyHost` per application. Call `host.open(locator)` for each artifact; repeated/concurrent opens return the same copy. Tabs subscribe to the copy, read immutable snapshots, and call `setManifest` or `setFile`. Adding/removing a declared file also requires updating its manifest mapping. No tab saves directly through the transport.

Snapshots expose the raw manifest, nullable parsed manifest, files with roles and paths, last saved validation, baseline checksum, local/saved generations, error, dirty flag and save state. The parsed manifest is provisional until server validation. Consumers should label dirty content as Editing, active writes as Saving, successful writes as Saved, and expose Validation errors independently of save failure. The visual shell and plugin compatibility metadata are deferred.

Autosave waits two seconds from the last edit and serializes requests. A save captures its generation and concurrency token. Returned formatting is adopted only for source unchanged since capture. New edits remain authoritative and get a subsequent save. Saved validation remains identifiable as the last server result, not a claim that the current unsaved content has been validated.

Conflict pauses saving and preserves local source. `compare()` returns local and freshly loaded remote copies. `reload()` explicitly discards local edits. `resolve(remote, merged)` accepts a user-reviewed merge based on a particular remote checksum; the next save still uses authoritative server concurrency checks. Save failures retain local content; explicit `flush()` retries. Invalid source and formatting failures can still produce successful saves with diagnostics.

Navigation should await `host.close(locator)` and stay on the editor if it returns false. `protectPendingChanges(copy)` adds a browser unload prompt and best-effort flush; browsers do not guarantee completion of asynchronous saves during unload. Detach this guard when the editor closes.

## Verification

`tests/artifact-editor.test.ts` covers source repair, unknown types, safe locators, required checksums, invalid-source save, real service conflicts, watcher/build notifications, debounce, shared copies, edit-during-save reconciliation, clean refresh, and explicit conflict resolution. Run the full test suite, typecheck and build to include emitted-package contracts, schema-adapter compatibility, recovery, and Windows storage regressions.
