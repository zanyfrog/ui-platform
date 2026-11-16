# CLI import prerequisite: trigger admission

This pass implements the trigger-configuration prerequisite only. It does not add
CSV/JSON import commands or grant import authorization.

## Contract

`TriggerRegistry.withImportAdmission(appId, physicalDataset, action)` is the common
host-only entry point for future protected dry-run and import. It rejects any
active trigger, including `afterCommit`, before calling the action. Dataset/IAM,
schema, binding, and record concurrency checks remain the import operation's job.

The logical environment boundary consists of the canonical ORM storage root and
each declared source root. These are filesystem identities, not CLI input or a
process-local lock. Participating hosts that share storage share the same gates.
Roots for separate environments are independent. Whole-root exclusion is
conservative: unrelated trigger edits sharing a root are also refused during
admission. All gates are deduplicated and acquired by canonical path order.

The implementation reuses `SecurityWriterAdmission`: configuration writers hold
durable claims through settlement; import closes admission and drains existing
claims. Concurrent-writer admission alone is never used as import exclusion.
Blocked configuration mutations fail with `SECURITY_WRITER_ADMISSION_CLOSED`.

The action receives `assertCurrent()` and `commit(transaction)`. Use the latter
for the single import transaction: it rereads authoritative configuration just
before commit and holds all exclusions until commit returns. It permits one
attempt only. Return `{ outcome: 'committed', value }` after successful wrapped
commit, `'rolled-back'` after known rollback before any commit attempt, or
`'not-started'` for dry-run/preflight. A caught commit exception cannot be relabeled
as rollback or retried. A final revision check also runs before releasing gates.

An ordinary eligibility rejection releases admission because no transaction has
started. Failure to drain, revision disagreement during the action, unclassified
failure, uncertain commit, or process death retains claims/closures. There is no
lease expiry, automatic cleanup, takeover, or retry of an unknown commit.
Operator review must classify the actual transaction/configuration outcome before
manually recovering an abandoned gate. Ordinary Dataset CRUD does not acquire
these configuration gates and remains available.

## Participating writes and freshness

- `TriggerRegistry.create/update`: trigger writes use the existing ORM transaction.
- JSON ORM `insert/update/delete` of the persisted trigger Dataset automatically
  acquire a claim through commit/rollback. Unenrolled ORM writers and unadmitted
  direct `persist` calls fail closed. Trigger storage always bypasses the JSON
  cache; ordinary Dataset caching is unchanged.
- Platform `AutomationStore.create/save/remove` for `kind: 'trigger'` acquire the
  source-root claim before mutation. Workflow persistence is unchanged. Failures
  before a mutation attempt release the claim; uncertain mutations retain it.
- `AutomationRuntime.connect` supplies a disk-backed source snapshot and revision,
  without registering or running handlers during import admission. Ordinary
  trigger dispatch continues using the existing provider and handlers.

## Host sources and unsupported cases

Legacy `registerSourceProvider(provider)` remains valid for ordinary CRUD, but
import refuses it without calling it. A participating trusted host must supply
`{ boundary: TriggerConfigurationBoundary, snapshot }` as the second argument.
`snapshot()` must read authoritative configuration without handlers or external
effects and return a nonempty revision plus trigger rows. Every mutation of that
source must hold the exact same canonical boundary until settled. A callback
alone or an uncoordinated external source cannot satisfy this contract.

Source replacement is refused while this registry holds import admission. The
source declaration is also persisted under the ORM configuration gate before a
provider is installed. Another host cannot register a provider while that gate is
closed. Import compares all durable declarations with its own source composition;
an undeclared, missing, unsupported, or different source makes it fail closed.
Declarations use independent exclusive-created marker files, so concurrent source
registrations cannot overwrite and conceal each other. A single declared source
root is supported per storage root in this increment. Moving/replacing a root,
removing a provider, or replacing an unsupported provider requires reviewed host
reconciliation; declarations are deliberately not removed automatically.

The
host contract is an in-process trusted composition API, never file/CLI input or
an HTTP provider-registration endpoint. Non-JSON ORMs without the trigger-storage
capability remain unsupported for import; their ordinary CRUD is unchanged.

All processes sharing the environment must run the participating implementation.
Old executables and direct filesystem editors cannot be made cooperative by this
API. Stop those writers before enabling imports. The contract does not claim to
lock out arbitrary native filesystem writes or implement distributed locking
across machines/filesystems without local exclusive-file semantics.

## Focused verification

Build only the changed Data Services packages using their existing compiler:

```powershell
node node_modules/typescript/bin/tsc -p packages/orm/tsconfig.json
node node_modules/typescript/bin/tsc -p packages/dataset-operations/tsconfig.json
```

Then, from UI Platform:

```powershell
node --test tests/trigger-import-admission.test.mjs
```

The test bundles the two changed Platform adapters against the adjacent current
Data Services build, rather than changing installed dependencies or a running
host. All records, gate markers, and generated bundles use disposable OS-temp
directories. No pilot hosts, bindings, or records are opened or changed.
