# Artifact Foundation v1.1

`@ui-platform/artifacts` provides shared bundle discovery, loading, saving,
formatting, validation, references, and active filesystem watching. The current
architecture baseline is [the v1.1 waypoint](../../docs/architecture/artifact-foundation-v1.1-waypoint.md).

Artifacts are editable UTF-8 source files. Invalid source can be saved. Git/GitHub
owns history, diffs, branches, rollback, and collaboration. Publish/deploy belongs
to the Application/Site layer.

Application build, migration, and deployment services are exported from this
package. See the [integration and operations guide](../../docs/architecture/application-build-integration.md)
for compiler/provider wiring, CLI commands, supported JSON ORM maintenance,
portable releases, and recovery procedures.

## CLI

From the repository (the command builds the artifact package automatically):

```sh
npm run uib -- artifact validate packages/artifacts/examples/form --json
npm run uib -- artifact discover ./my-artifacts
npm run uib -- artifact inspect form_tour_registration
npm run uib -- artifact save form_tour_registration
npm run uib -- artifact watch ./my-artifacts --json
```

After building/installing the package, use `uib artifact ...` directly.
`--root <workspace>` sets the artifact workspace and its `.uib` storage; it defaults
to the working directory. Targets are IDs, bundle paths, or `artifact.json` paths.
Validation also accepts a directory of bundles. Watch takes a directory and runs
until Ctrl+C/SIGTERM. JSON watch output contains change/removal events with the
updated artifact and validation result, following an initial `watching` status.
Errors go to stderr.

Exit codes: 0 success (including an invalid source save), 1 validation errors,
2 usage or operational failure. Artifact history and publish commands no longer exist.

## Service and editor integration

```ts
import { FileSystemArtifactService } from '@ui-platform/artifacts';

const service = new FileSystemArtifactService({ root: '/workspace/my-app' });
const artifact = await service.load('form_tour_registration');
const result = await service.save('form_tour_registration', {
  expectedChecksum: artifact.checksum,
  files: { 'form.json': editedSource },
});
// result.saved is true even when result.validation.valid is false.
const references = await service.getReferences('form_tour_registration');
const watcher = await service.startWatching({
  onChange: event => refreshEditorOrRegistry(event),
  onError: error => reportError(error),
});
// During shutdown:
await watcher.close();
```

`EditableArtifact` provides manifest, files with semantic roles, definition,
capabilities, diagnostics, references, and a derived concurrency checksum.
Malformed/structurally invalid manifests are null; unknown definitions are null.
`manifestContent` retains the raw manifest for repair. Identity is never invented.

`changes.manifest` accepts an object or raw string. `changes.files` maps declared
bundle-relative paths to text; null removes a declared file. New paths must also
be declared in the staged manifest. `artifactId` is immutable. Persistent identity
bindings support malformed-manifest repair across restarts. Moves retain the ID
from the manifest.

Supply the load checksum to reject stale editor saves. Every save also checks its
own starting state under a write lock before committing. On `ArtifactConflictError`,
reload and reconcile. Same-process operations queue for their bundle lock; a lock
held by another process can cause an operational failure requiring retry.

Save stages changes, formats supported files, commits transactionally, validates
what is now on disk, logs the result, and returns updated source/diagnostics.
Validation errors do not block saving. JSON, TypeScript, TSX, CSS, and Markdown use
Prettier and the closest project configuration. Unformattable content is retained
with formatting diagnostics. No artifact draft lifecycle or publication state is
maintained.

## Active watcher

`startWatching()` establishes the initial bundle state before returning. Native
recursive filesystem notifications trigger debounced reconciliation. Periodic
reconciliation (default 1000 ms) also catches missed events and supports systems
without native recursive watching. Default debounce is 150 ms; both are configurable.

Changes are compared by content, not timestamps. The watcher detects newly created
bundles, edits, referenced-file removal, manifest removal, and directory moves or
removal. Changed events include shared validation diagnostics; removed events
identify the former bundle path. Callback failures are isolated, and failed scans
are retried. `.uib`, `.git`, `node_modules`, build output, and transaction temporary
files are excluded. External changes are never automatically formatted.

Saves made by the same service are not reported again as external edits. Other
processes/services are external writers. Use one shared service per application
for an editor and its watcher. `close()` releases native watchers/timers and waits
for in-flight work; consumers should call it during shutdown.

The platform API automatically starts one artifact watcher per application under
`UI_APPS_DIR` (directories with `app.manifest.json`). This scopes IDs to an
application, includes newly added applications, and closes watchers for removed
applications. It emits `artifact-change` SSE events to connected consumers and
logs validation locally. The general workspace watcher ignores `.uib`, preventing
log writes from triggering workspace refresh loops.
The browser forwards updates as `ui-platform-artifact-change` custom events with
the artifact event in `detail`, ready for registry/editor consumers.

`handleExternalChange(path)` is also available for other filesystem integrations.
The service returns current diagnostics and logs PASSED/FAILED without creating
source revisions. The UI owns its working copy and display state; it should use
these events to refresh through the service.

## Definitions and shared validation

Built-ins are Form, Route, RouteGroup, Trigger, Dataset, and Migration. Definition and value-validator
registries are extensible. Browser/server form validation shares the dependency-free
entry point:

```ts
import { validateValue } from '@ui-platform/artifacts/validation';
const diagnostics = validateValue(values.lastName, field.validators, undefined, 'lastName');
```

`required` and `max-length` are reusable implementations. Form declarations only
configure them. Runtime form execution and the Dataset Operation Engine remain
outside this foundation.

Pass `resolveReference: async id => ({ artifactType: 'page' })` to integrate a
Registry; return undefined for missing IDs. With a resolver, missing references
and wrong types produce errors. Without one, references are extracted and checked
syntactically. Relative routes resolve through containing RouteGroup manifests;
duplicate resolved URLs and duplicate artifact IDs produce diagnostics.

Triggers explicitly declare dataset identity and Boolean active state. The
`createTriggerManifest` helper defaults priority to Normal/200 and active to true.
An omitted priority in manually authored source means Normal/200. Supported hooks:
`beforeInsert`, `afterInsert`, `beforeUpdate`, `afterUpdate`, `beforeDelete`,
`afterDelete`. Use direct named functions or function-valued constants with a
typed records-array first parameter and optional context second parameter.
Type-only exports are allowed; default/re-exported hooks are not supported.
Validation checks syntax/signatures without executing source or running a complete
application build.

## Recovery storage and migration from v1

`.uib/bundles` holds identity bindings, `.uib/locks` process-owned write locks,
`.uib/transactions` temporary rollback journals, and `.uib/logs/operations.jsonl`
operation logs. These are recovery/derived infrastructure, not source history.

Commits persist the original state in a journal and replace files atomically,
manifest last. A failed commit restores all previous files and removes newly
introduced ones. Discovery/load recover interrupted journals before exposing
source. Dead-process locks can recover; incomplete locks or failed rollback need
operator attention. Catastrophic storage failure may prevent recovery until the
storage is available. External tools do not honor service locks. This is a
single-host logical filesystem transaction, not a database transaction.

`saveDraft` is replaced by `save`. Artifact `publish`, `getHistory`,
`restoreRevision`, revision/version result fields, lifecycle, and publish/history
capabilities are removed. Existing `.uib/history` and `.uib/versions` data is left
untouched and ignored; no new revisions or published snapshots are created.
No Git commits or other source-control operations are performed automatically.

## Verification

`npm run typecheck`, `npm run build`, and `npm test` include this workspace.
Focused tests: `npx vitest run packages/artifacts/tests`.
Tests cover invalid saves, CLI parity, committed-source validation, formatting,
rollback/recovery, identity, legacy-data preservation, references, trigger rules,
and real filesystem watcher behavior.
