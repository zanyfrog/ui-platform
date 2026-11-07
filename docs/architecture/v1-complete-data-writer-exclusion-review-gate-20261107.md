# Data Writer Exclusion and Windows Release Lifecycle Review Gate

UI Platform baseline `1cec112fc42a113620acdab297dd75d11028e561`. Data Services baseline `d2525592eee4d6286537a7093510e59fd4c342f2`.

## Verified increment

Dataset-schema publication writes now acquire a fail-fast lock at the publication root in `FileVersionedDefinitionRegistry`. This covers create, replace, publish and rollback, including callers that instantiate the registry independently of `SchemaManager`. SchemaManager exposes the host's matching inspection scope. Existing publication validation, integrity checks and non-schema registry behavior remain in use. The marker is checked before unlinking. Independent registry calls were refused, verified reads succeeded, and publication resumed after scope release and after a thrown callback.

`AppliedResourceRegistry.withWriterExclusion` reserves SQLite's existing writer slot with `BEGIN IMMEDIATE` and releases it with `ROLLBACK`. Registration, applied binding and retirement use the existing SQLite transactions. An independent database connection could read the revision but could not mutate it while the slot was held. The revision remained unchanged after a thrown callback and writes resumed afterward. This witness covers the shared SQLite writer boundary, rather than separate independent-process executions of every registry API.

The accepted applied-state lock ordering, marker cleanup, fail-fast semantics and independent writer test remain in place. The state lock now also supplies an in-scope assertion of its exact marker. `ActivationOwner` combines that assertion with its existing owner check and binds it to the state root and environment in an internal asynchronous scope. The scope expires before release. `QualifiedAppliedResolver.inspectUnderStateExclusion` verifies the actual applied pin, field map and ORM fingerprint while checking the active publication and exact state lock. It supplies the generation and fingerprint without a serving verdict. The ordinary resolver still refuses lock files. The focused test verified actual on-disk applied-state and publication inputs under the owned lock, refused calls outside the scope and rejected a replaced marker. It did not claim live serving.

## Verification

The final fresh physical Data copy rebuilt the versioned definition registry, schema manager and schema application packages. All **234 tests in 12 files** passed, including publication integrity, schema manager, state store, qualified resolver, registry, HTTP activation, drain and process restart cases. The earlier **149 activation/schema and 129 recovery** results remain accepted for the prior increment. The current build did not rerun the 129 recovery cases. No package installation or persistent source-tree build was used.

## Remaining handoff boundary

The three exclusion mechanisms and the scoped applied-state inspector are separately verified. The accepted Stage 5 host still does not retain a qualified controller in its protected Data process. The existing Data owner's domain identifies the publication, ORM and state roots but does not bind the resource-registry database connection. The normal applied-state inspector constructs an `AppliedResourceRegistry` that performs initialization writes and uses ordinary serving resolution. It cannot simply run on a second connection while the registry writer slot and state lock are held.

The next integration seam is a controller-owned registry binding that preopens the exact canonical registry for the domain and verifies its binding through the scoped resolver on the held connection. The controller also needs a host-only serving verification path during closed protected admission. Wire those together before declaring one complete transition scope or exposing a callback that changes release selection. No ordinary resolver override or mock serving confirmation was used to cross this boundary.

No controller handoff, Runtime/Data release pointer changes, or Windows A/B journey ran. Actual A/B activation identities, stale-write denial, restart persistence across release change, failed promotion and authorized rollback remain unverified. The Windows proof budget remains at the previously accepted scope. Stage 6, Stage 7 and overall V1 remain open.
