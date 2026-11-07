# Controller-Owned Windows Release Handoff Review Gate

The approved intermediate checkpoint was synchronized by fast-forward. Data Services `master` is `e08565d9dbeab6518eaff23da6c5b65a138c04f7` (11 paths). UI Platform `main` is `b6dab568ba42cc0a64a662c029da2f8163941f26` (three paths). All staged and committed blobs matched the approved SHA-256 inventories. The live GitHub heads matched the local commits.

## Controller scope proved

The new host-only `withQuiescedServingOwner` operation checks the qualified controller, retains its existing owner, closes and drains protected admission, and takes the applied-state lock, publication lock and SQLite writer slot in that order. The controller checks that the preopened registry connection still identifies the physical `resources.sqlite` file for its owned domain and environment. It verifies the pinned publication from the owned root, the current ORM fingerprint and field map, and the registry's application, Dataset, field and binding identities on the held connection. It repeats the binding and owner checks before reopening. The ordinary qualified resolver still refuses closed admission and unexpected locks. A concurrent read during expected closure refuses without marking the transition failed solely because admission was closed.

The handoff callback and release observation are distinct trusted host ports. A receipt must match a fresh challenge, the requested release in both Runtime and Data observations, and the verified Data generation and schema fingerprint. The controller uses a 30-second transition signal. The host must honor cancellation. The controller retains exclusion while a callback remains outstanding and refuses to reopen after the deadline. A failure closes admission and keeps the controller owner for explicit review. The callback receives neither the raw lease nor a schema writer.

## Verification and limits

A fresh physical copy built versioned-definition-registry, schema-manager and schema-application. **235 tests passed in 12 files**, including existing activation, drain and process restart tests. The first disposable build reported TypeScript errors in the new projection and row narrowing. The final build passed after correcting those types.

The added test qualified a real Data controller with loopback HTTP, a real applied pin and a preopened registry. During the same scope, a separate schema manager, separate state store and separate SQLite connection were refused. Health returned 503 during closure and 200 after a matching receipt. A competing start, shutdown, transition and owner acquisition were refused. A mismatched receipt retained 503, with the owner still held. After the failed scope, the state lock, publication lock and SQLite writer slot were available again. The state bytes and registry revision matched after the successful scope.

The receipt came from the test host's fixture port. This proves controller receipt validation and admission behavior. It does not prove a real Windows Runtime and protected Data release switch.

## Windows integration still outstanding

The Stage 5 Windows Data process starts from an applied configuration and does not retain the controller. Its outgoing session-status clients and incoming verifiers are constructed with startup audiences. Runtime is configured with a fixed public root and release ID in that fixture, although `runtimeHandler` accepts a per-request selector. The tested controller port now provides a place to attach genuine observations. The host still needs to bind its release selector and protected Data resolution to the same immutable candidate, obtain both observations while normal admission is closed, and implement durable restart with fresh receiver audiences. Restarting the existing whole triplet during a held scope would release or strand the controller's process-owned lease. Reusing old receiver audiences to avoid that issue would violate the accepted JWT boundary. A viable integration can retain the Data process during a switch and use the existing Runtime selector seam, then verify a distinct controlled restart after the transition.

Phase C was not completed. No Windows A/B journey ran, and no actual A/B release identities, stale-write refusal, restart persistence across a release change, failed promotion, compatible rollback or incompatible rollback result was produced. The current test does not exercise operator authorization of real deployment operations. Stage 5 remains accepted for its tested Windows scope and 15-second proof budget. Stage 6, Stage 7 and overall V1 remain open.
