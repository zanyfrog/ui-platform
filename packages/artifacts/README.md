# Artifact Foundation v1

`@ui-platform/artifacts` is the shared boundary for bundle discovery, validation,
explicit saves, recovery, draft history, and publication. It includes Form,
Route/RouteGroup, and Trigger definitions. The Generic Artifact Editor and other
future consumers should call this service rather than write bundle files.

## Quick start

Create a directory beneath your workspace with these two files.

`artifact.json`:

```json
{
  "schemaVersion": 1,
  "artifactId": "form_tour_registration",
  "artifactType": "form",
  "name": "tour-registration",
  "definitionVersion": 1,
  "files": { "definition": "form.json" },
  "config": { "dataset": "tour-registration" }
}
```

`form.json`:

```json
{
  "fields": [{
    "field": "lastName",
    "label": "Last Name",
    "type": "text",
    "validators": [
      { "validator": "required", "message": "Last name is required." },
      { "validator": "max-length", "max": 25 }
    ]
  }]
}
```

From this repository:

```sh
npm run uib -- artifact validate packages/artifacts/examples/form --json
npm run uib -- artifact discover ./my-artifacts
npm run uib -- artifact inspect form_tour_registration
npm run uib -- artifact validate ./my-artifacts --json
npm run uib -- artifact save form_tour_registration
npm run uib -- artifact history form_tour_registration
npm run uib -- artifact publish form_tour_registration
```

After building/installing the package the same commands are available as
`uib artifact ...`. `--root <workspace>` selects the artifact workspace and the
location of its `.uib` storage; it defaults to the working directory. Targets may
be manifest IDs, bundle paths, or paths to `artifact.json`. Validate also accepts
a directory of bundles. Exit codes: 0 success (including saving an invalid draft),
1 validation/publication rejection, 2 usage or operational failure.

## Service contract for editor authors

```ts
import { FileSystemArtifactService } from '@ui-platform/artifacts';

const service = new FileSystemArtifactService({ root: '/workspace' });
const artifact = await service.load('form_tour_registration');
const result = await service.saveDraft('form_tour_registration', {
  expectedChecksum: artifact.checksum,
  files: { 'form.json': editedSource },
});
// saved remains true when result.validation.valid is false.
const publication = await service.publish('form_tour_registration');
const history = await service.getHistory('form_tour_registration');
await service.restoreRevision('form_tour_registration', history[0].revision);
```

`EditableArtifact` contains the manifest, files with semantic roles, definition,
capabilities, diagnostics, references, lifecycle, and checksum. A malformed or
structurally invalid manifest is `null`; unknown definitions are `null`. This is
intentional: diagnostics must remain available without fabricating an identity
or pretending an unknown definition is valid. `manifestContent` preserves the raw
manifest so an editor can repair it. Pass `changes.manifest` as an object or raw
string. `changes.files` maps declared bundle-relative paths to text (or `null` to
delete a file). New paths must also be declared in the staged manifest.

Use the checksum from load for stale-editor protection. Independently of this
optional caller token, each save verifies its starting files again under a write
lock before committing. `ArtifactConflictError` means reload and reconcile.
Locks are fail-fast: retry after an active writer completes. Capabilities are
definition-owned. Manifest identity bindings survive service restarts; renaming
or moving a bundle preserves its manifest ID and ID-based history.

Explicit saves format JSON, TypeScript, TSX, CSS, and Markdown with Prettier and
the nearest project configuration. Formatting failures become errors but do not
prevent draft saves. Restore goes through the same save/format/validate pipeline
and creates a revision of the state being replaced. Publish validates a formatted
snapshot without rewriting the draft and creates a new immutable version only
when all validation passes. Lifecycle remains `draft`, with a separate
`latestPublishedVersion` pointer derived from version storage.

## Definitions, references, and reusable validation

`ArtifactDefinitionRegistry` supports register/get/has/list and rejects duplicate
registrations. Definitions supply file roles, validators, capabilities, optional
formatters, and reference extraction. `ValidatorRegistry` can be extended with
value validators; the Form definition checks their configurations through that
same registry. Browser consumers can import the dependency-free entry point:

```ts
import { validateValue } from '@ui-platform/artifacts/validation';
const diagnostics = validateValue(values.lastName, field.validators, undefined, 'lastName');
```

The same `required` and `max-length` implementations work for client form and
server submission validation. Runtime form execution and dataset triggers are
separate concerns and are not implemented here.

Pass `resolveReference: async id => ({ artifactType: 'page' })` (or `undefined`
for a missing ID) to integrate a Registry. With a resolver, missing targets and
wrong types are validation errors. Without one, syntactic references are checked
and extracted, but existence is not asserted. Route relative paths resolve
against the nearest containing RouteGroup manifest; absolute paths stand alone.
Duplicate resolved URLs and duplicate artifact IDs are diagnostics.

Triggers require an explicit dataset and Boolean `active`. The creation helper
`createTriggerManifest` supplies `active: true` and Normal priority 200 by default.
An omitted priority in a manually authored manifest means Normal/200.
Trigger source is parsed, never executed. Supported hooks are `beforeInsert`,
`afterInsert`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, and `afterDelete`.
Use direct named exported functions (or function-valued exported constants), with
a typed array first parameter and optional context second parameter:

```ts
export function beforeInsert(records: Record<string, unknown>[]) {
  return records;
}
```

Type-only exports are allowed. Default/re-exported lifecycle functions are not
supported in v1. This performs source syntax and signature checks, not a complete
application TypeScript build or trigger execution.

## Storage, external changes, and recovery

System-managed data lives outside bundles:

```text
.uib/
  bundles/       persistent identity bindings
  history/       r1.json, r2.json, ... under hashed artifact IDs
  versions/      v1.json, v2.json, ... under hashed artifact IDs
  transactions/  pending rollback journals
  locks/         process-owned write locks
  logs/          operations.jsonl
```

Paths are hashed to avoid treating arbitrary IDs as filesystem paths. Revisions
and versions have separate numbering. Published snapshots are exclusively
created, read-only files and are never overwritten by the service. They are not
tamper-proof against a filesystem administrator. A revision may be invalid; a
failed save may leave a useful previous-state revision.

Saves prepare and validate an in-memory staging snapshot, persist a rollback
journal, and replace each file atomically, manifest last. A failed commit restores
the complete previous snapshot, including removing newly introduced files.
Discovery/load recover an interrupted journal under the bundle lock before
returning content. Dead-process locks can be recovered; an incomplete lock or
failed rollback requires operator attention and retains recovery data. This is a
logical filesystem transaction, not a database transaction: consumers must use
the service for coordinated reads/writes. External tools do not honor its locks,
and catastrophic storage failure can prevent rollback until storage recovers.
The v1 storage implementation targets a single host and UTF-8 text bundles.
Symlinks, traversal, reserved system paths, and writes into nested bundles are
rejected.

Call `service.handleExternalChange(changedPath)` from a future watcher. It finds
the nearest owning bundle, records history, validates, and logs PASSED/FAILED
without formatting. When this service instance has observed the previous state,
that state is backed up; otherwise only the newly observed external state is
available. Logs are operational JSONL records, separate from future audit logs.
The watcher itself, artifact deletion, runtime routing, trigger execution, full
Registry, and editor UI are outside v1.

## Verification

`npm run typecheck`, `npm run build`, and `npm test` include this workspace.
For focused checks: `npx vitest run packages/artifacts/tests/artifacts.test.ts`.
The suite includes the architecture's form acceptance flow, CLI/service parity,
invalid drafts, publication isolation, formatting, revisions, rollback, crash
recovery, external changes, route references, and trigger metadata/signatures.
