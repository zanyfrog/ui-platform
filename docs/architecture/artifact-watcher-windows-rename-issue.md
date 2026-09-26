# Intermittent Windows artifact-watcher rename failure

Tracking status: **open, independent of Generic Artifact Editor WP3**. Updated 2026-09-26.

## Symptom and existing evidence

`packages/artifacts/tests/watcher.test.ts`, test “discovers new bundles and reports missing files, removed manifests and directory moves”, intermittently fails at the direct directory `rename(dir, moved)` operation (line 162) with Windows `EPERM`.

This failure was recorded before WP3 in both the WP1 and WP2 reports. During WP3 it occurred in the initial full regression run, a sequential targeted run and the initial compatibility run. It passed in the next full default-concurrency run, both subsequent complete two-worker runs, and the compatibility retry. It is therefore unresolved even when a later run is green.

Reproduction commands (unchanged tests):

```text
npx vitest run packages/artifacts/tests/watcher.test.ts --maxWorkers=1
npm run check:editor-contracts
npm test -- --maxWorkers=2
```

An isolated/sequential run is not guaranteed to pass. Lower worker count is not a fix for the rename failure.

## Impact and boundaries

The test exercises real recursive watcher directory moves. The symptom is distinct from the already tested file replacement/retry behavior in Foundation storage. No WP3 code touches the Foundation watcher or its tests. No assertion, timeout, skip, retry wrapper or automatic success classification was added to hide this failure.

The observed error does not establish which handle or process prevents the rename. Watcher handles, unrelated readers or security/indexing software require investigation; none has been identified as the cause. Passing retries do not establish a permanent fix.

## Follow-up scope

Investigate Windows directory handle lifetimes around recursive watcher registration, missing-file events and bundle moves. Record active watcher/handle timing and distinguish application handles from external readers before changing watcher behavior. Preserve coverage for new bundles, removals, moves and fallback watching. Any proposed lifecycle/storage change needs its own regression verification, outside the WP3 property/plugin work.

## Separate resource-contention observations

The first WP3 default-concurrency regression run also timed out two existing tests at their unchanged five-second deadline: the registered-type consumer contract and application build/cache invalidation. The timed-out build test then reported `ENOTEMPTY` during cleanup. Both tests passed sequentially. A second default-concurrency run still timed out the consumer contract, while the watcher passed. Full runs with two workers passed all 178 tests twice. These timeout observations are separate from the watcher `EPERM`; worker limits were command-line execution settings, not test changes.
