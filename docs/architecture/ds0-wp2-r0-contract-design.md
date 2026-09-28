# DS0-WP2-R0: bounded activation contract design

September 28, 2026. **DESIGN ONLY — STOPPED AT G1.** No R1–R4 implementation is authorized by this document.

## 1. Authority, scope and preservation

The user approved D1–D6 in the [readiness reconciliation](ds0-wp2-readiness-requirements-reconciliation.md) as a **new bounded increment**, authorizing R0 contract design only. The recovered original objectives remain runtime activation/reload verification, safe recovery and stronger durability/concurrency testing. The missing original complete WP2 plan and formal WP1 conditional criteria have not been recovered.

Scope: first activation of an already-published canonical schema and verified **same-version** controlled restart in a fresh isolated development environment. D state determines activation eligibility; verified Schema Manager/VDR publication determines canonical identity; actual registered ORM definitions determine observed runtime structure. P migration state is neither consulted as a fallback nor modified. There is no schema upgrade, migration, legacy activation, published-trigger bridge, automatic ambiguous recovery, production deployment or zero-downtime promise.

Baselines remain P `9560d104390a82141b7c311037ef66f640c8ddf4` and D `9a6f0d5623863a8d44b879eda08316b0e3c79571`. The [STAB-4 report](ds0-stab-4-consolidated-acceptance-report.md), [U1–U12 register](ds0-stab-4-unresolved-issues.md), all scoped B1–B4 closures and accepted evidence remain unchanged. This design creates no code, package/dependency/lock change, new commit or data mutation. Existing uncommitted reconciliation artifacts are preserved.

All contracts below are proposed R0 details requiring G1 approval. “Must” describes their intended implementation acceptance criteria, not functionality claimed to exist today.

## 2. Prototype configuration and trust boundary

One host, one environment and one target dataset per ownership domain. Configure an absolute `prototypeRoot` containing separate `publications/`, `orm/`, `state/` and `activation-evidence/` roots. A preflight resolves real paths and rejects reparse/symlink aliases, overlapping storage subroots, path traversal, mismatched environment/app/reference, configured P migration authority, or roots shared with another host/deployment. Identifiers used in paths must be nonempty single segments with no separators, dot segments, NUL or Windows reserved filenames. Do not scan unrelated disks or infer ownership merely because paths look empty.

Require an explicit synthetic-environment manifest listing the resolved roots, fixed environment, target identity, independently supplied ORM registration definition, health fixtures and trusted test actors. Creation of the already-published fixture and I-AM policies occurs in test setup, before the host starts and before preservation snapshots. Host startup does not publish schemas, create grants or rewrite definitions to obtain a match.

The launch controller is the trust boundary: it must prohibit other publishers, direct ORM writers, policy/registry administrators and direct state-store callers for this domain while owned. Filesystem checks cannot discover every external process or provide isolation from privileged/trusted code. A caller unable to attest exclusive synthetic ownership is rejected. This is cooperative exclusion, not a production security mechanism.

The host owns all runtime references; consumers receive only its admitted HTTP surface, not raw managers/ORM handles. No ordinary request can supply an activation capability, external transaction, parent context or ownership token. Keep the existing production request handler's auth/result behavior for admitted requests. Prototype administration is a local controller API, not a new HTTP registration or activation endpoint.

## 3. Identity and verified publication contracts

### 3.1 Complete pin

Proposed new immutable runtime-only type in `schema-application/src/activation-contracts.ts`:

```ts
interface ActivationPin {
  environmentId: string;
  appId: string;
  datasetId: string;                 // Permanent dataset ID
  reference: { appId: string; dataset: string }; // No namespace
  publication: {
    definitionType: "dataset-schema";
    definitionFormatVersion: 1;
    version: number;                 // Positive safe integer
    checksumFormat: "canonical-json-v1";
    checksum: string;                // sha256:<64 lowercase hex>
  };
}
```

Bind the pin to the resolved publication root/ownership domain in the controller. Dataset key must equal `reference.dataset`, publication reference app/key must match, and schema.dataset.id must equal datasetId. VDR's reference definitionId (currently app:key) is not a substitute for the permanent dataset ID. Permanent field IDs come from the verified publication, never from ORM names or a caller's mapping assertion.

First application must select exactly one verified active publication and match the requested pin. Read it using `SchemaManager.readVerifiedActive`; obtain the pinned version using `readVerifiedVersion` and require identical payload/checksum/identity. Capture and recheck the active-selection metadata before the first state mutation and immediately before promotion. Ambiguous/changed active state blocks the attempt; concurrent publication is unsupported.

On restart, the recorded applied/pending identity fixes the version. It may be historical after a later, separately performed canonical publication: verify that exact version, do not follow latest active, and require a structurally consistent history/selection. A changed latest active never upgrades runtime. Corrupt/inconsistent selection blocks; readable unrelated legacy history remains unverified rather than being certified by the selected version. The pinned version itself must be canonical and verified. No publication operation occurs while the host owns the domain.

### 3.2 Compatibility with persisted state

Keep `PublishedSchemaIdentity {version, checksum, schemaId}`, state formatVersion 1, ledger shape and the existing journal digest unchanged. On first application persist only the existing projection of the pin. Do not add checksumFormat to old records. Reacquire format and verified payload from Schema Manager on **every** activation/restart; compare all stored identity components exactly. A `sha256:` prefix or matching stored string is not a trust upgrade.

New runtime contracts carry format explicitly. Existing `ResolvedAppliedSchema` remains structurally compatible; add a separate qualified result rather than silently changing its return shape:

```ts
interface QualifiedAppliedSchema {
  pin: Readonly<ActivationPin>;
  fields: readonly VerifiedFieldMapping[];
  verificationFingerprint: string;
  runtimeGeneration: string;
  readiness: "verified-serving";
}
```

A resolver implementing the existing `AppliedSchemaResolver` may return its legacy-shaped projection only after the same qualified checks. The host uses the qualified API. A separate private candidate-verification path handles applying/pending states; a normal resolver must not expose them as applied. Require expected version/checksum whenever supplied; unknown requested field IDs reject rather than disappear from results.

Persisted applied status alone is **eligibility for revalidation**, not proof that a new process has activated anything. Existing unqualified state outside the explicit synthetic manifest is not admitted. A8 remains deferred; any need for persisted format/identity migration returns to G1.

For both pending resume and applied restart, compare the freshly derived recognized fingerprint and the complete field mapping against the existing verification record before health. Normalize only mapping order by permanent field ID and omitted required=false as specified here; never rewrite the record to conceal a mismatch. An old/unknown fingerprint format, incomplete mapping or disagreement gates the attempt even when the publication checksum matches.

## 4. ORM mapping and fingerprint

### 4.1 Exact definition support

Verify `orm.getDatasetDefinition(appId, dataset)` from the actual constructed instance. Its registration manifest must be supplied independently at setup; the verifier must not manufacture observed equality by registering a conversion of the candidate as its own evidence. Registration is in-memory configuration, not physical data migration. Stored JSON rows do not carry permanent field IDs; this verification proves a binding to observed registered structure, not independently recoverable IDs in row files.

| Published field | Required observed ORM contract |
| --- | --- |
| string / number / boolean / date / json | Exact corresponding ORM type and exact field key/name |
| id | ORM string; required; mapped to the sole primary key |
| Other type | Reject `ACTIVATION_DEFINITION_UNSUPPORTED` |

For the current Schema Manager vocabulary, require exactly one required `id` key, type id or string, and ORM primaryKey `id`. Other id-typed fields reject in this increment. Dataset and field IDs/keys must be nonempty unique strings. Equal field sets are required: missing or extra ORM fields reject. Normalize omitted required to false; explicit invalid booleans reject. Optional default **absence differs from presence**, including null. Present defaults must be strict JSON and structurally equal on both sides, without coercion or omission. For typed health fixtures/defaults: string requires string, number finite number, boolean boolean, date a string with exact `new Date(value).toISOString() === value` round-trip, json a strict JSON value; optional null is allowed, required null is rejected. This is a prototype verifier/fixture rule, not a newly implemented DOE row validator.

Reject namespace-bearing references, duplicate primary keys/IDs/names, unsupported schema versions, non-JSON defaults and additional semantic properties not supported by this contract. Approved Schema Manager keys are the existing root definitionType/definitionFormatVersion/dataset/fields, dataset id/key/name/pluralName, and field id/key/type/required/default. Observed ORM fields permit name/type/required/defaultValue; a defined classification is unsupported in this prototype rather than ignored. ORM schemaVersion may be absent; if present it must equal the decimal pinned version. It is recorded in the fingerprint but is not independent integrity evidence.

No implicit casts, removed constraints, default creation, key rename or physical schema repair is permitted to make verification pass. A canonical publication can be valid for inspection yet unsupported for this prototype; report that distinction.

### 4.2 New fingerprint domain

Use `ds0-orm-verification-v1:sha256:<64 lowercase hex>` for new RuntimeVerification.ormFingerprint values. Existing strings are not rewritten; unsupported prior fingerprint formats cannot certify a restart. The new format fits the existing string field and is distinct from VDR publication checksums, P fingerprints and state/journal hashes.

Use `ds0-wp2-verifier-v1` as the new RuntimeVerification.verifier tag and `ds0-wp2-activator-v1` as the RuntimeActivation.activator tag. These identify the approved contract version, not a package release. Runtime generation and attempt identifiers are fresh generated UUIDs; they never substitute for the pinned schema identity.

Digest bytes are UTF-8 of `ds0-orm-verification-v1`, one NUL byte, then strict canonical JSON of this descriptor:

```text
{
  "format": "ds0-orm-verification-v1",
  "pin": <complete ActivationPin>,
  "observed": {
    "primaryKey": "id",
    "schemaVersion": {"present": false} OR {"present": true, "value": "1"},
    "fields": [
      {"fieldId": "...", "key": "...", "schemaType": "...", "ormType": "...",
       "required": true OR false,
       "default": {"present": false} OR {"present": true, "value": <JSON>}}
    ]
  }
}
```

Sort fields by permanent fieldId using UTF-16 code-unit order; keys recursively use the same ordering. Preserve array order inside default JSON. Use finite JSON numbers (`-0` becomes `0`), no Unicode normalization, reject lone surrogates, cycles, accessors, custom prototypes, sparse arrays, symbols and unsupported values; limit to 1 MiB encoded JSON and depth 100, matching the accepted strict JSON domain. No locale sorting or toJSON invocation. Labels do not enter the observed structure, but the pin's publication checksum binds their published content. Timestamps, run IDs, process IDs and health rows do not enter this fingerprint.

Implement this as a private versioned serializer/fingerprint module using Node built-ins, pinned by golden vectors and parity tests against accepted canonical vectors. VDR's canonicalJson helper is not a package-root export, and schema-application has no direct VDR dependency. Do not deep-import its private source in production or change versions/locks to obtain it. A private implementation of these exact rules is proposed for G1 approval; tests may cross-check the VDR helper. Exposing a shared helper or adding dependency edges is an alternative requiring separate approval. This fingerprint is deterministic structural evidence, not a signature, capability or proof of concurrent storage isolation.

## 5. Whole-workflow ownership: additional mechanism requires approval

### 5.1 Existing lock is insufficient

`EnvironmentSchemaStateStore.withExclusive` owns `state.lock` only during an individual action. Each public read/update acquires and releases it. Verification, HTTP health, runtime construction and traffic admission occur outside those calls. Two callers can interleave complete activation workflows while every individual state operation is locked correctly. Wrapping public methods in withExclusive would attempt to reacquire the same non-reentrant lock and fail; it does not solve ownership.

The existing lock must remain unchanged and continue to guard each state operation. It does not fence direct ORM or VDR writers, nor does the state lock's fsync establish state/journal durability.

### 5.2 Proposed cooperative owner contract (G1-O)

Add a **separate** `prototypeRoot/activation-owner.json` file created with exclusive `wx`. Scope it to the entire prototype root, not merely the dataset, so separate environment aliases cannot concurrently use the same data roots. It is a new coordination sidecar, not a state/journal format change.

Record format `ds0-activation-owner-v1`, random 128-bit-or-stronger owner token, random run ID, process ID (diagnostic only), resolved root bindings, environment and acquisition time. Write/sync/close the record before proceeding. If initialization fails after creation, leave evidence and fail closed. No expiry, TTL, PID-only liveness inference, deletion by a contender, automatic takeover, or forced stale-lock cleanup. Token secrecy is not a security boundary; do not send it to ordinary clients.

Acquire before any mutating state call; order is owner → short state lock, never reverse. Hold ownership through verification, health, promotion and **the entire serving lifetime**. Releasing immediately after promotion would let a second host become active while the first still serves. A losing contender returns OWNER_BUSY without creating state files, reconciling journals or calling ORM writes.

Validate matching owner token/root bindings before transitions and admission; token change or missing owner closes admission and stops further work. There is no atomic filesystem CAS between that check and a write: this is explicitly **not fencing** against an uncooperative process. Normal release requires closing admission, draining all operations, stopping candidate/control endpoints and confirming no unresolved owned work; then verify token and unlink. On mismatch/error/ambiguous persistence retain the owner and gate; never delete another owner's file. Preserve release errors as diagnostics.

Clean controlled restart releases the owner only after complete shutdown, then a new process acquires and revalidates the same pin. Process crash leaves a stale owner and blocks restart. Read-only diagnostics remain available; operator removal/reassignment is a separate approved recovery action, outside R1–R4's automatic behavior. Test fixture teardown may remove its own disposable root after all child processes have exited, but must not be reported as successful production stale-lock recovery.

Compatibility: existing direct state-store callers do not honor this new lock and must be excluded from the prototype's process topology. No existing store method/interface changes or claimed external writer protection. Approval of this new cooperative mechanism and its stale-lock availability cost is required at G1.

## 6. Controlled host and health contracts

### 6.1 Proposed controller ports (new interfaces; G1 approval)

Keep existing state/ORM/DOE result interfaces unchanged. Add runtime-only types:

```text
ActivationOwner.acquire(domain) -> OwnedDomain | OWNER_BUSY
OwnedDomain.assertOwned() / releaseAfterShutdown()
Admission.closeAndDrain(deadline) -> drained | blocked
RuntimeFactory.construct(registrationManifest) -> CandidateRuntime
CandidateRuntime.observeDefinition() / stop()
HealthProbe.run(candidate, pin, manifest) -> HealthEvidence | failure
ActivationController.activateFirst(pin) -> ActivationAttemptResult
ActivationController.restartSame(pin) -> ActivationAttemptResult
ActivationDiagnostics.inspect(domain) -> DiagnosticSnapshot
QualifiedResolver.resolve(pin, runtimeGeneration) -> QualifiedAppliedSchema
```

`ActivationAttemptResult` contains attemptId, pin, runtimeGeneration if constructed, stage, readiness (`blocked` or `verified-serving`), stateWriteOutcome (`not-attempted`, `confirmed`, `unknown`), typed sanitized errors and evidence IDs. It is **not DatasetOperationResult**; do not overload commitOutcome or alter its semantics. Codes include OWNER_BUSY/OWNER_LOST, AUTHORITY_CONFLICT, PIN_MISMATCH, DEFINITION_UNSUPPORTED, VERIFICATION_FAILED, DRAIN_BLOCKED, HEALTH_FAILED, STATE_OUTCOME_UNKNOWN, JOURNAL_REVIEW_REQUIRED and STALE_LOCK_REVIEW_REQUIRED. Prefix new controller codes consistently with `ACTIVATION_`. Errors report stage and uncertainty, not private row/path/token content.

### 6.2 Ordered lifecycle

1. Validate read-only configuration and pin syntax. Public listener is absent or admission is closed by default. No stored applied record opens it automatically.
2. Acquire G1-O ownership; reject shared authorities/root conflicts. Observe state/journal/lock inventory without recovery first.
3. Close ordinary admission and drain applicable requests: operations, queries, registry reads and any permitted control work. The prototype denies ordinary registry mutations instead of allowing an alternate write path. Track full handler/manager promise completion, including ignored nested operations and afterCommit work; response finish/disconnect is not operation completion. Stalled request body/handler or deadline blocks activation, never forcibly commits, cancels an uncertain write or transfers ownership.
4. Verify exact publication and existing state identity. For a new dataset call beginApplication only after preflight eligibility, preserving its returned operationId. For same-version existing records do not call beginApplication again.
5. Construct a **fresh** ORM and DOE/I-AM/central registry composition from the independent synthetic registration manifest. Retire old instance references only after drain. Verify the observed definition and exact field mapping; on initial applying state persist markVerifiedPendingActivation. Reverify pending/applied records without replacing old identities.
6. Run health through the candidate's private loopback listener using the **unchanged production request handler**. Only the owned controller/test actor reaches this listener; it is not the ordinary public admission path.
7. Recheck ownership, pin/publication condition, observed fingerprint and state phase. First activation/pending resume calls markApplied with derived RuntimeActivation; then inspect the confirmed state. A lost acknowledgment or residual journal gates the attempt, not an automatic retry. Same-version applied restart does not append another applied transition.
8. Atomically select this verified candidate in the host's in-memory routing reference, open ordinary admission and retain ownership while serving. Return verified-serving only now. Publication change does not hot-swap it. Stop closes admission/drains before releasing ownership.

A development wrapper may return a host-level 503 ACTIVATION_NOT_READY while admission is closed; the underlying handler's admitted HTTP 200 business-result envelopes/auth policy remain unchanged. This wrapper behavior is an explicit proposed prototype contract, not a silent edit to existing service.ts. Existing generic `/health` is liveness only. Do not change it to claim readiness; use the local controller result/evidence for readiness.

The private handler is currently typed RequestListener but implemented asynchronously. The prototype adapter must await its actual returned promise and account for all work until settlement; fail closed if that binding stops satisfying the async contract. Tests must prove drain on disconnect and ignored child promises. Do not decrement on response events or assume TypeScript's void return annotation proves completion. No public async handler type change is required by this proposal.

### 6.3 Concrete runtime-health evidence

Require an exact registered-definition observation/fingerprint, successful authenticated query and a complete synthetic insert → query → update → query → delete → query sequence through `createOperationRequestHandler`. Validate the response body, operation/correlation identifiers, success=true, committed=true, commitOutcome=committed, requested/succeeded counts, failed=unknown=0, expected returned records, and absence/presence of the reserved row as appropriate. Independently query a fresh ORM reader to confirm persisted values. Generic HTTP 200, `/health`, a stubbed callback or synthetic verification strings cannot pass.

Health uses a dedicated synthetic actor with pre-provisioned unscoped grants and an absent reserved primary key in the **target verified dataset**. Payloads are specified by the fixture manifest and satisfy every required field/type; update changes at least one non-primary value in the standard fixture. An id-only schema may exercise a documented id-preserving update, without claiming a changed-field test. All default/type variants need separate verifier cases. Confirm no enabled target-dataset triggers; reject a configuration with such triggers rather than disabling/replacing registrations. This prevents health probes from invoking unspecified application side effects while retaining the central registry and deferring the publication bridge.

These are intentional synthetic data writes while ordinary traffic is closed. Successful probe deletion restores logical rows but may create/reformat the dataset file; record the authorized footprint, not byte-identical storage. On any uncertain commit or failed probe, stop the sequence; do not automatically retry or run a cleanup write that obscures evidence. Keep admission closed and preserve probe/state files for diagnosis. This is why arbitrary existing datasets are excluded.

HealthEvidence binds attemptId/runId, runtimeGeneration, pin, verification fingerprint, actor/grant fixture identity, sanitized result summaries, fresh-reader assertions and timestamps. Write a receipt under activation-evidence using a unique attempt filename; failure to record it blocks promotion. Store only a versioned receipt digest/reference in existing RuntimeActivation.healthCheck, with activatedAt and a fixed activator version tag. No state fields are added. A receipt is diagnostic evidence, not a signed authorization token or a substitute for revalidation after restart. Old activation timestamps/receipts never certify the new process.

The receipt's `format` is `ds0-activation-health-v1`; hash its strict canonical JSON bytes (the rules in §4.2, without that section's ORM domain prefix) with SHA-256. The existing healthCheck string is `ds0-activation-health-v1:<attemptId>:sha256:<64 lowercase hex>`, referring only to `<attemptId>.json` under the configured evidence root. Restrict attemptId to a generated UUID; never interpret an arbitrary stored string as a filesystem path. The receipt does not contain its own digest. It records only fixture identifiers and assertions, not credentials, ownership tokens or complete row payloads. Every successful restart creates new evidence even though its existing applied record remains unchanged.

## 7. Transition and recovery matrix

Read-only diagnostics (RO) use direct byte reads/stat/inventory only, never snapshot/recoverState/withExclusive. Without ownership they label results non-atomic observations and never certify readiness. Record hashes, presence and parse/identity/phase findings without logging payloads; repeated byte reads can detect change but cannot prove global consistency. Mutating reconciliation (MR) requires ownership, closed admission and a separately classified action.

| Observed situation | Allowed next action / state change | Readiness, failure and recovery rule |
| --- | --- | --- |
| No state record/journal/locks, valid canonical pin | Acquire owner; full preflight; begin applying → verify → pending → health → applied | Reopen only after all evidence and confirmed promotion. |
| First-application rejection before begin | RO report only; release clean acquired owner after shutdown | Existing definitions/data/state bytes unchanged; only owner acquisition/removal is an allowed coordination effect. No health writes. |
| Existing applying, no journal/lock, exact same identity | Owned explicit resume revalidates everything; use existing operationId; may move to pending then applied | Never create a second application or infer a completed verification. Other version/identity rejects. |
| Existing pending, no journal/lock, exact same identity | Owned explicit resume rebuilds/reverifies and reruns health, then markApplied | Old verification metadata is insufficient. If it conflicts with new observed fingerprint/mapping, gate rather than overwrite it. |
| Existing applied, exact same identity | Owned restart constructs/reverifies/health-checks new generation; state record/ledger unchanged on success | No duplicate applied transition, no automatic latest-version selection. Ordinary traffic stays closed until new evidence exists. |
| Existing recovery-required or environment recovery gate | RO diagnosis only in this increment | No clear transition exists; no automatic clearing or reapplication. Separate operator/repair approval required. |
| Pending journal, current equals before or next digest | RO classify journal; do not call snapshot as inspection | Explicit owned `recoverState` may remove that journal only after G1-approved deterministic journal validation and classification; retain diagnostic copies/hashes first. This is MR, never proof of runtime success. Re-read and follow observed phase after reconciliation. |
| Journal invalid, digest mismatch, nextState inconsistent, or state malformed | RO evidence; block all automatic reconciliation | Existing recoverState can write recovery-required/remove journal, but the host must not invoke it blindly. Any repair/evidence-discarding mutation needs separate approval. |
| Live owner or state.lock | RO BUSY/LOCKED; no mutation by contender | Wait policy may report/retry acquisition only before any owned work; no TTL takeover. Do not treat lock creation as whole-workflow fencing. |
| Process crash with stale owner and/or state.lock | RO STALE_LOCK_REVIEW_REQUIRED | No automatic unlock or resume. Clean restart is supported; crash restart may remain blocked until a separately approved operator action. PID absence alone is insufficient proof to remove a lock. |
| Clean shutdown, no outstanding work/journal | Close/drain/stop; token-checked owner release; new process acquires | Reverify same version, even if persisted applied. |
| I/O exception during begin/pending/applied write | StateWriteOutcome=unknown, admission closed; retain owner and diagnostics | A thrown write may already have persisted. No blind retry or claimed rollback. Classify raw state/journal only; recovery per rows above. |
| Lost promotion response but applied bytes present | Treat attempt result unknown until owned inspection proves exact identity/phase/journal condition | No second markApplied. A later explicit same-version restart reruns verification/health; bytes alone do not reopen traffic. |
| Runtime created/health succeeded but promotion fails | Stop candidate admission, preserve receipt and evidence | No advertised applied runtime; no original write replay. Residual probe/data deltas may require separate review. |
| Crash after applied persistence before admission | Stale owner gates initial restart | After separately authorized stale-owner handling, revalidate same version; no assumption that old host served or new host is ready. |
| Probe commit throws, including partial multi-file persistence | Preserve STAB-2 unknown outcome, stop further probes, retain owner | No rollback/retry/cleanup after uncertain commit. Fresh readers diagnose; diagnosis is not repair. |
| Observed definition/pin/owner changes during activation | Close admission, do not promote/open | Integrity/ownership conflict; no self-repair of registration or schema. |

Journal validation before the narrow MR path must verify exact format/environment, strict JSON parse with no duplicate keys, full supported state/record/ledger invariants, recomputed nextState using the **unchanged ordinary JSON.stringify journal hash**, and exact current identity/phase consistency. Preserve parsed insertion order for that hash; do not canonicalize journal hashing. Pretty-printed valid JSON remains accepted. Preserve original bytes; parse/validation must not normalize then overwrite them. Unknown extra/incompatible state fields or an invariant that cannot be proved leads to diagnosis only. R0 proposes this host-side validation, not a change to the store algorithm. Approval G1-R must explicitly allow this limited MR path; otherwise all journals remain manual-review-only.

For this single-target prototype the supported MR invariants are deliberately narrow:

- Journal formatVersion is 1; transactionId is nonempty; createdAt is a valid timestamp; beforeChecksum/nextChecksum have the existing SHA-256 grammar. Each state has formatVersion 1 and the configured environment, at most the one manifest target record, no recovery gate and no unexplained extra properties. Missing current state means the store's exact empty-state object, not arbitrary empty bytes.
- Each record has a unique nonempty operationId; environment/app/dataset/reference and published identity match the pinned manifest; timestamps are valid; supported phases are applying, pending and applied. Applying has neither verification nor activation; pending has complete recognized verification and no activation; applied has both. Verification includes the exact recognized fingerprint, complete unique field mapping and verifier tag. Activation has the receipt-reference grammar and activator tag. Old opaque verification metadata remains diagnostic-only. No wall-clock monotonicity is inferred from timestamps.
- Ledger entry IDs are unique; every entry links to that record's operationId and identity. Its ordered phases are exactly applying, optionally pending, optionally applied, with no repeats/skips/orphans; the last entry matches the current phase and updatedAt. Fields/detail have the existing types. An empty record set requires an empty ledger.
- When current matches beforeChecksum, nextState must be exactly one supported store transition: empty→applying, applying→pending or pending→applied, with a single appended matching ledger entry, unchanged existing ledger prefix and unchanged identity/other record fields except the transition's existing patch/timestamp fields. When current matches nextChecksum, current and nextState must match structurally and pass those same final-state invariants; the absent preimage cannot be reconstructed or claimed verified. Both cases recompute nextChecksum. Any ambiguity is gated.

Matching a before digest permits the existing store to discard the uncommitted journal; it does **not** apply nextState. Matching a next digest permits removal of a redundant journal. The controller then reads the resulting phase and explicitly resumes/restarts from there. This contract never certifies the erased preimage or journal provenance cryptographically; it relies on the isolated fixture/ownership boundary. Orphan temporary files and a failed evidence copy block MR pending review, rather than being silently deleted.

## 8. Affected files/interfaces for later implementation

Paths are relative to D. These are proposed exact locations; **no files below are edited by R0**.

| File(s) | Proposed responsibility / compatibility |
| --- | --- |
| `packages/schema-application/src/activation-contracts.ts` (new) | Pin, qualified resolution, controller result, observations and ports. Additive types; no persisted-format edits. |
| `packages/schema-application/src/verification.ts`, `fingerprint.ts` (new) | Actual ORM/schema comparison, strict private descriptor serializer, new versioned fingerprint; existing OrmSchemaVerifier projection. No ORM/VDR private import or dependency change. |
| `packages/schema-application/src/resolver.ts` (new) | Qualified applied resolution through supplied SchemaManager and observed runtime; legacy interface projection only after validation. |
| `packages/schema-application/src/activation-owner.ts`, `diagnostics.ts` (new) | Cooperative root owner; RO byte diagnostics and journal classification. New coordination sidecar explicitly subject to G1-O. |
| `packages/schema-application/src/activation-controller.ts` (new) | Port-based orchestration/state transitions and result classification, without importing DOE/I-AM into this package. |
| `packages/schema-application/src/index.ts` | Add exports for accepted new types/classes only. Preserve all existing state-store implementation, identity/interface members, journal/state formats and digest. Any required change beyond additive exports returns to review. |
| `packages/schema-application/tests/verification.test.ts`, `fingerprint.test.ts`, `activation.test.ts`, `ownership.test.ts`, `restart-recovery.test.ts` (new) | R1/R3 deterministic unit/integration/process coverage; original state-store test unchanged. |
| `packages/dataset-operations/tests/support/activation-host.ts`, `activation-child.ts`, `activation-http.test.ts` (new) | Development/test-only composition connecting real packages and private production request handler; child-process entry. No new shipped service or dependency/lock change. Test imports may reference sibling source as existing tests do. |
| `packages/schema-application/README.md` | Approved contract/limitations and RO versus MR documentation. |
| P `docs/architecture/ds0-wp2-implementation-acceptance-report.md` and evidence (future) | Later execution evidence and G5 report; no P runtime/migration provider changes. |

Host integration is a repository development/test harness, not a packaged deployment artifact. Schema-application production additions use existing ORM/SchemaManager dependencies plus Node built-ins and injected runtime ports. Retain request-handler.ts/service.ts, DOE/I-AM/ORM behavior, package versions and locks. A proposal to ship the harness or add cross-package runtime imports requires a separate composition/dependency review.

## 9. Deterministic acceptance tests and gates

| IDs | Required tests and measurable result |
| --- | --- |
| V1–V3 | Golden descriptor bytes/digests; object key permutation equality; field-order normalization; differences for each permanent ID, key/type/required/default presence, pin/environment/version/checksum and observed schemaVersion; malformed JSON/defaults/unsupported fields reject. Include tests against accepted canonical vectors without claiming publication-digest equivalence. |
| V4–V6 | Actual independently registered ORM matches/mismatches, full field-ID/key mapping and primary-key rules; legacy/tampered/unknown-format pin rejects; candidate versus applied resolver boundaries and requested unknown field IDs. Existing persisted identity/journal bytes untouched on rejected verification. |
| H1–H4 | Real production-handler authorized CRUD/query probe, expected body/count/outcome, observed registered definition and fresh-reader rows; bogus HTTP 200/liveness, denied/scoped actor, stale runtime, callback error and missing receipt cannot promote. Enabled target trigger configuration rejects without changing registry. |
| A1–A4 | Admission closed before any ordinary request enters; IPC barriers hold an in-flight operation and ignored nested child, proving drain waits beyond response disconnect; timeout leaves gate closed; successful first activation shows ordered state/health/promotion/admission events. No response-event-only drain. |
| O1–O4 | Two actual child processes share resolved roots. Barrier holds A after owner acquire; B fails with unchanged state/data inventory; after fully clean A release, B can acquire. Repeat contender while A is serving to prove lifetime exclusion. Different path aliases/shared authorities reject. Do not use sleeps as ordering evidence. |
| R1–R4 | Clean process restart re-verifies same applied pin, fresh runtime/cache and real health; state/ledger unchanged on successful restart. New active publication never upgrades the pin. Kill owner at deterministic boundaries; stale owner/state lock block, RO diagnostics preserve bytes. Fixture cleanup only after child exit is not an unlock feature. |
| F1–F6 | Inject before/after each owner/state/journal/receipt write/rename, construction, health commit, promotion and admission; lost acknowledgment and partial persistence remain unknown/gated. Observe raw bytes and fresh readers. No rollback/retry after uncertain ORM commit; no automatic probe cleanup on failure. |
| J1–J4 | RO inspection never creates lock/files or removes journal. Approved MR only on validated before/next matching cases; invalid/mismatch/corrupt/unsupported state remains byte-identical and gated. Runtime revalidation still required after successful MR. |
| P1–P3 | Snapshot recursive filenames/directories and raw bytes of publication/state/policy/registry/P stores before/after; distinguish authorized owner/state/evidence/health footprint from rejected-operation zero mutation. Original journal/hash/state formats and published history stay intact. |
| G5 | Retain STAB suites: D build/typecheck/full tests plus new strict consumer types and integration/process tests; relevant P compatibility/typecheck/production/editor contracts. Record all exits, initial failures, exact unique counts/overlap and hashes; no skips/assertion weakening. |

Failure injection wraps/delegates actual filesystem/runtime operations in test code; no production fault endpoint. Named child IPC messages coordinate stages; bound waits and capture child exit/error output, terminating only test-owned children on cleanup. A process killed after a write is not a power-loss simulator. Windows rename failures are distinct from the existing watcher EPERM, which remains open and is not the activation mechanism.

The current ORM cannot guarantee atomic multi-dataset writes, fsync durability, transaction isolation, stale-cache avoidance across arbitrary instances or fencing of uncooperative writers. The owner mechanism and fresh host construction do not change that algorithm. Tests must expose limitations and gate uncertainty, not claim those guarantees were implemented. If a required result needs stronger storage behavior, stop for separate design approval.

## 10. G1 decisions requiring explicit approval

| Decision | Recommended contract / unresolved approval |
| --- | --- |
| **G1-O** | Approve the new root-scoped cooperative owner sidecar, held throughout serving; explicit lack of fencing, stale-lock automatic recovery and availability after crash. Existing short state locks remain unchanged. |
| **G1-V** | Approve the complete pin, strict supported-definition subset, runtime-only format qualification, new fingerprint grammar and private serializer/parity tests. Do not expand persisted identities or reuse unrelated hashes. |
| **G1-H** | Approve test/development-only controlled host, admitted-handler compatibility, closed-admission 503 wrapper, private health capability and intentional synthetic target-dataset CRUD probes before promotion, including their failure footprint. |
| **G1-R** | Approve only the explicitly validated before/next journal reconciliation path under ownership, with evidence retention and full revalidation. All ambiguous/recovery-required/stale-lock cases stay gated. Alternative: defer all mutating journal reconciliation and narrow recovery claims accordingly. |
| **G1-I** | Approve the additive file/interface/export plan and test-only cross-package composition; preserve versions/locks and all existing production behavior until R1–R4 receive explicit implementation authorization. |

Open beyond this increment: operator stale-lock reclamation, clearing recovery-required state, upgrades/reapply transitions, authoritative P↔D bridge, production runtime hosting/auth/audit, published-trigger activation, legacy store transition, multi-writer fencing and power-loss durability. None is silently solved or authorized here.

## 11. R0 review evidence

The [read-only preservation record](evidence/ds0-wp2-r0/review.json) checks 69 Data Services files, 89 prior evidence files and 16 committed STAB-4 artifacts: 174 checks, zero mismatches. P/D/ui-base HEADs and lockfile hashes remain at their recorded baselines. Data Services and ui-base are clean; P has only the pre-existing reconciliation artifacts and the new R0 document/evidence as untracked additions. No tracked source diff or staged diff was present. The reconciliation document's SHA-256 remains `7324E72FF05DE35EF009C6CCA55AF0E9326787B9D1DDA12AB53042534CDF2BF4`.

This turn reviewed current interfaces, store/locking/recovery code, canonicalization and host/request-handler boundaries; it did not execute build or runtime suites. Prior STAB-4 results remain historical evidence: D 345 tests/12 files; P 12 focused and 103 editor-contract test instances, with three overlapping cases (112 unique tests/14 files). They are not evidence that these proposed R0 contracts are implemented. Later authorized implementation must execute §9 and report fresh results.

**STOP AT G1.** D1–D6 and R0 design authorization do not authorize R1–R4. No runtime behavior, source, existing data/history or protected evidence has been modified.
