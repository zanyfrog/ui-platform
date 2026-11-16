# CLI Increment 2: protected single-Dataset import

Accepted and closed by the owner after the disposable browser-paired workflow:
dry-run planned one insert and one update without changing the two-record file;
actual import committed the planned changes and preserved the unrelated record;
repeat import reported two unchanged rows and left the three-record file byte-for-byte unchanged.

This UI Platform checkpoint requires Data Services commit
`d6e37f2da8e930688e1cc1f35ba0c64cffc26945` on
`integration/troop883-v1.1-20261112`. Build and load its ORM and Dataset Operations
packages together with this implementation. Older installed package snapshots do
not provide the accepted trigger admission, concurrency, and import capabilities.
The package version remains unchanged; the paired commit identity is authoritative
for this integration checkpoint.

```powershell
uip data import --app <application-id> --dataset <dataset-id> --file scouts.json --dry-run
uip data import --app <application-id> --dataset <dataset-id> --file scouts.json
uip data import --app <application-id> --dataset <dataset-id> --file scouts.csv --dry-run
uip data import --app <application-id> --dataset <dataset-id> --file scouts.csv
```

Uses the existing browser-pairing flow and current IAM actor. Each invocation pairs
independently. Typed CSV uses the existing `#uip-json-cells-v1` JSON-cell convention.
Plain CSV cells remain strings; no guessing/coercion of field types is performed.

Supported scope: one existing connected JSON Dataset, nonempty batches of at most
10,000 rows, an explicit nonempty permanent string `id` per row, and a serialized
request of at most 900,000 bytes. Assignment-managed Datasets and non-JSON adapters
without the single-Dataset commit capability are rejected. No schemas or resources
are created. Missing update fields are preserved; inserts use existing defaults.

The protected engine rejects duplicate IDs, unknown/unsafe fields, invalid types,
missing required values, unauthorized Dataset/row/field operations, stale plans,
bindings/schema changes, and storage conflicts. Even unchanged rows undergo write
authorization. Unchanged rows do not stage writes; an all-unchanged batch does not
replace the Dataset file. Successful responses report `insert`, `update`, and
`unchanged` counts. Rejected batches report errors, zero accepted counts, and no
silent row filtering. Dry-run stages and validates in memory, rechecks permissions
and freshness, then rolls back. Its result never authorizes a later invocation.

The engine uses `TriggerRegistry.withImportAdmission()` for both dry-run and actual
import. Every active trigger phase and unsupported host source is rejected.
Import never dispatches trigger handlers, registers handlers, or invokes services.
Existing ordinary CRUD and trigger dispatch paths retain their behavior.

## Atomicity and outcomes

All inserts and updates share one JSON ORM transaction and one staged Dataset
snapshot. The host-only `withSingleDatasetCommit()` capability enforces that no
other Dataset is staged, holds the existing SQLite storage exclusion, and checks
authoritative read baselines before calling the protected precommit checks.
Authorization plans, resource/schema bindings and trigger eligibility are checked
before `lease.commit(transaction)` under that same exclusion. The transaction
publishes the entire batch through one temporary-file write and atomic rename of
the one Dataset file. Readers observe the prior or replacement file, never a
partially imported batch. This is not a power-loss durability guarantee.

Precommit validation, authorization, conflict and busy failures roll back without
replacing storage (`commitOutcome: not-committed`). Successful publication reports
`committed`. Failure after the wrapped commit attempt reports `unknown` and retains
the trigger admission closure; never automatically retry. Transport failures also
leave the client unable to confirm an outcome. Review authoritative storage before
any retry. No cross-file publication, external effects, migration or recovery
coordinator is part of this feature.

## Verification and interactive acceptance

Focused protected-engine checks use disposable stores and real IAM planning:

```powershell
# From adjacent Data Services
node node_modules/typescript/bin/tsc -p packages/orm/tsconfig.json
node node_modules/typescript/bin/tsc -p packages/dataset-operations/tsconfig.json
node node_modules/vitest/vitest.mjs run packages/dataset-operations/tests/protected-import.test.ts
# From UI Platform
node --import tsx --test --test-name-pattern="paired real session|executable help|readonly routes" tests/cli-readonly.test.ts
```

Interactive acceptance should use a disposable connected Dataset and hosts loading
the rebuilt ORM and Dataset Operations packages. Existing installed dependency
snapshots and the accepted pilot were not replaced or restarted by this pass.
Pair, dry-run a file containing an insert/update/unchanged row, execute it, repeat
it, then export to inspect results. Expect no publication on dry-run or repeat and
one atomic Dataset publication for the actual mixed batch.
