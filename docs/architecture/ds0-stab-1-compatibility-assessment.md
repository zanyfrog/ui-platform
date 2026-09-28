# DS0 STAB-1 compatibility assessment

Date: September 27, 2026. **DESIGN ONLY — STOPPED AT STAB-1 DESIGN REVIEW GATE.**

STAB-0 is accepted by the user. B1 is closed for its recorded checkout and toolchain. This assessment preserves that baseline and evidence; it does not reopen provisioning, implement B2, authorize STAB-2/3, or begin DS0-WP2.

## 1. Recommendation and authority

Recommend a versioned VDR checksum format and an explicit separation between **inspection of stored content** and **consumption of checksum-verified content**. Do not put a blanket legacy-history rejection in the existing shared `getVersion`/`getActive` path: those methods also support historical viewing and draft identity checks.

Legacy content must never become verified merely because it can be read, its old checksum matches, or a new digest can be calculated. Preserve inspection; permit carefully qualified draft editing; block legacy publication/rollback and verified consumption until a separately approved compatibility procedure exists. A verified new active version need not make unrelated legacy history verified or require that all historical versions pass verification.

No definition store was found at the discoverable local defaults. This reduces the observed local rollout impact but does **not** establish that existing deployed histories are absent. Deployment to a store containing legacy histories needs an explicit owner-reviewed availability and compatibility decision.

Evidence sources are the September 26 preflight, September 27 stabilization plan and accepted STAB-0 report, supplemented by read-only source/configuration inspection and a bounded filesystem inventory. Proposed decisions below refine the plan; they are not yet approved architecture.

Repository aliases:

- **D:** `C:\Projects\Modular\UI Platform Data Services`
- **P:** `C:\Projects\Modular\ui-platform`
- **B:** `C:\Projects\Modular\ui-base`

| Repository | HEAD at assessment start (audited/accepted baseline) |
| --- | --- |
| D | `313b7e0c64e8e93f75632bb9dc015614d7709668` |
| P | `b8e495d94e9a49cc0122d5075f621a3ca609be52` |
| B | `96898f73809272e680fcb3402f064a039fff4350` |

D and B were clean on entry. P contained the existing untracked audit, plan, STAB-0 report and evidence. Only this assessment is added by this task. During the assessment, P advanced externally to `e6b6a86936b8aa24645f24ae53db3cf61a3c0345` (15:50:46 EDT, commit title “Stab-1 27 Sepetemner 2026”). Its diff from the audited SHA adds only the 27 prior report/evidence files; runtime source is unchanged. This task did not create that commit or alter it. The final P working tree contains only this untracked assessment; D and B remain clean at the listed SHAs. D's lockfile remains `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F` (SHA-256).

## 2. Checksum inventory: producers, consumers and comparisons

The inventory covers first-party source in D and P at the SHAs above, including callers whose methods do not contain the word checksum. Generated dist copies and third-party dependencies are not separate authorities. No claim is made about unidentified external consumers.

### 2.1 Data Services

| Files / surface | Producer, consumer or comparison | STAB-1 consequence |
| --- | --- | --- |
| D `packages/versioned-definition-registry/src/registry.ts:5` | Sole VDR producer: `digest(value)` hashes `JSON.stringify(value, Object.keys(value).sort())`, prefixed `sha256:`. The replacer filters nested keys. | Replace only this definition-content algorithm, with explicit format dispatch. |
| Same file, `getDraft` | Computes draft checksum and compares it directly with the active metadata checksum to report clean/modified. | Comparison must distinguish canonical verified equality, known difference and unavailable legacy comparison. |
| Same file, `publishDraft` | Computes normalized published content checksum; writes value, version metadata and refreshed draft. Changes previous active metadata before completion. | New-format publication must preflight verification/canonicalization before any mutation. Publication atomicity is a separate existing limitation, not solved by hashing. |
| Same file, `verifyIntegrity` | Loads each version payload and compares recomputed checksum to stored checksum; aggregates one boolean/errors list. | Return per-version outcomes; no legacy success or vacuous empty-history certification. |
| Same file, `listVersions`, `getVersion`, `getActive`, `getDefinition`, `rollback` | Transport metadata/checksums; reads do not verify. Rollback reads a historical value, overwrites draft, then republishes. | Separate inspection from verified reads; guard rollback before draft write. |
| D `packages/versioned-definition-registry/src/types.ts` | `DraftDefinition.checksum`, `PublishedDefinition.checksum`, `DefinitionSummary.versions`, `IntegrityReport`. All unqualified today. | Add format and explicit verification/comparison contracts; source/API compatibility review required. |
| D `packages/schema-manager/src/index.ts` | Wraps all VDR draft/version/active/publication/rollback/integrity operations. `ensureStableDatasetId` consumes `getActive` to compare permanent dataset ID before create/replace draft. | Identity inspection must not accidentally require legacy checksum verification or treat an unverifiable observed ID as authenticated. |
| D `packages/trigger-manager/src/index.ts` | Equivalent wrappers; `ensureStableTriggerId` checks ID through `getActive`. | Same distinction, including legacy trigger content. |
| D manager `src/service.ts` files | Serialize summary/draft/active/version/verify responses and call mutation APIs. Errors currently map mainly to 400, with 404/422 special cases. | HTTP callers need explicit response classification and legacy/conflict error mapping. |
| D `packages/schema-application/src/index.ts:11,24` | `PublishedSchemaIdentity` carries `{version, checksum, schemaId}`; resolver interface's expected value permits `{version, checksum?}`. State store persists identity; begin checks nonempty checksum but does not recompute or compare it to a publication. | Stored references lack a format discriminator. Preserve them as legacy/unqualified references; no implicit trust upgrade. Resolver is an interface, not implemented runtime consumption. |
| Same file, `RuntimeVerification.ormFingerprint` | Caller-supplied string; store persists it. No implemented ORM fingerprint producer or verifier. | Do not invent a hashing/activation implementation under STAB-1. |
| Same file, `digest`, `StateJournal`, `update`, `recoverLocked` | A **different** SHA-256 over ordinary `JSON.stringify(state)` produces before/next journal checksums. Recovery compares current state digest against them. | Do not change this algorithm or classify journal `sha256:` values as VDR legacy checksums. Doing so would alter state recovery compatibility. |
| D schema/trigger tests; schema-application state-store tests | Manager tests implicitly exercise publication/draft equality; state tests use literal fake published/fingerprint strings and reproduce the journal algorithm. | Add VDR integrity tests; preserve state-store fixture meaning. Literal `sha256:published` is not a real VDR checksum fixture. |

DOE, ORM, I-AM and runtime TriggerRegistry contain no VDR checksum producer/comparison. DOE still reads registered ORM definitions, and runtime TriggerRegistry stores independent registrations. There is no existing checksum-verified schema/trigger consumption path there to claim repaired.

### 2.2 UI Platform: distinct domains, not interchangeable hashes

| Producer / files | All identified first-party consumers and comparisons | Scope decision |
| --- | --- | --- |
| P `packages/artifacts/src/bundle.ts:194`, `checksum(snapshot)` | SHA-256 hex of JSON-serialized filename/content pairs sorted with localeCompare. `validation/validate-artifact.ts` places it on loaded artifacts. `artifact-service.ts` checks expectedChecksum, rechecks snapshots before save/commit, tracks own-save checksums and watcher suppression. `storage.ts` compares snapshots during save/recovery. `watcher.ts` computes bundle/fallback checksums and emits changes. `types.ts` carries checksum and expectedChecksum. | Artifact concurrency/source checksum, not publication integrity. Leave unchanged. |
| Same artifact checksum transported through P | `src/shared/artifact-editor.ts` DTO/save/event types; `src/server/artifact-editor.ts` load/save/events; `src/server/editor-security.ts` authorization-time expectedChecksum check; `src/client/artifact-editor/working-copy.ts` baseline, save result and event equality; `recovery.ts`, `context.ts`, `shell.ts` remote/local comparison and resume guards. Transport/CLI pass enclosing DTOs through without new digest production. | No conversion to VDR canonical format. |
| P `packages/artifacts/src/application/common.ts:7–18`, `canonical`/`fingerprint` | Recursive localeCompare-sorted objects, omitted undefined object values, arrays, fallback null for non-serializable primitive result; SHA-256 prefixed `sha256:`. Exported by package `src/index.ts`. | Existing build/migration fingerprint domain. Its serialization rules differ from the proposed strict VDR format. Do not share it by name or silently change it. |
| Same `fingerprint`, in `application/build.ts` | Diagnostics deduplication, source/configuration stamps, artifact/dependency cache keys, hashed cache/output filenames, output content validation, runtime manifest file-map comparison. Stores migration checksum map. | Existing cache/build identity unaffected. |
| `application/common.ts`, `filesUnder` | Produces raw file-byte SHA-256 hex values; build stores them; build, deployment and local-target fingerprint file maps to verify staging/bundles. | File integrity is distinct from semantic JSON hashing. |
| `application/migration-definition.ts:82`, `migrationChecksum` | Fingerprints the migration object excluding its own checksum; `migrationErrors` checks checksum syntax `sha256:[a-f0-9]{64}`, target schema fingerprint and recomputed migration checksum. Dataset schema adapter has no VDR publication metadata. | Do not change migration hash prefix/body or assume a schema fingerprint equals a VDR published checksum. |
| `application/migrations.ts` | Compares applied/source schema and field fingerprints; preview stores artifact source checksum and from/to fingerprints; confirmation rejects stale source/baseline/operation plans; constructs migration checksums; ledger checks enforce idempotency/conflicts and expected applied schema before/after execution. | No VDR import or checksum bridge exists. |
| `application/json-provider.ts` | Compares ledger migration checksums; fingerprints normalized schema/target (fields sorted by ID); fingerprints backup and checks it during backup verification. | Preserve current migration-state/backup formats. |
| `application/deployment.ts` | Fingerprints manifest and pending plans, verifies file-map fingerprints, compares bundled migration checksums to definitions and ledger. | Preserve deployment contract. |
| `application/local-target.ts` | Compares staged file-map fingerprint against manifest before staging verification/activation callbacks. | Preserve deployment contract. |
| P `packages/artifacts/src/storage.ts:18`, `storageKey(id)` | Raw SHA-256 hex of ID/path, used by storage for backup/journal/lock locations and by artifact-service for identity-binding filename. | Address derivation, not content verification. No change. |
| P `src/server/application-presentation.ts:22` | Ordinary JSON.stringify SHA-256 hex; draft/active equality, draft metadata at initialization/save, version metadata on publication, history log. `src/shared/presentation.ts` carries manifest/status fields. | Separate Application Presentation versioning. Do not tag/rewrite these histories as VDR. |
| P `src/server/page-builder.ts:51` | Raw source-text SHA-256 hex; page load hash and expectedHash save conflict. `src/shared/types.ts` carries hash; `src/client/builder.ts` holds/submits it; `src/server/index.ts` passes expectedHash to save. | Separate page-editor concurrency hash. No change. |

Checksum-bearing tests/fixtures also occur in P `packages/artifacts/tests/{artifacts,editor-package-contract,migrations-deployment}.test.ts` and `tests/{editor-security,editor-security-client,editor-context,artifact-editor}.test.ts`. Keep their domain-specific expectations. `schema-adapter-compatibility.test.ts` checks the actual D schema interface and pure validation adapter; it deliberately does not consume VDR publication metadata. P's central trigger adapter consumes registry registrations without checksums.

Package-lock integrity values, npm tarball integrity and SHA-256 values in audit evidence are distribution/provenance checks, not runtime definition checksums. They are preserved. Searches found no further first-party checksum/hash implementation in platform-core or D I-AM/ORM/DOE. Third-party dependency internals and unidentified external callers are outside this completeness claim.

## 3. Read-only storage-root inventory

### Discovery method and limits

Checked only named configuration variables: `SCHEMA_DEFINITIONS_DIR`, `TRIGGER_DEFINITIONS_DIR`, `UI_APPS_DIR`, `UI_RUNTIME_DIR`, in Process/User/Machine environments. All were unset. No other environment values, credentials or application content were logged.

Read the service constructors and launch scripts. Both manager services default to `./data/definitions`, resolved against **process cwd**. The root `dev:schemas`/`dev:triggers` scripts delegate to workspace scripts. Inspection of the accepted local npm 10.8.2 run-script implementation confirms its child cwd is the workspace package path. Therefore the two workspace defaults differ from a direct root-cwd launch and from each other. No service was started to check this.

A read-only filesystem walker traversed `C:\Projects\Modular`, including hidden local configuration/runtime directories, excluding `.git`, `node_modules`, generated `dist`/`dist-server` and coverage. It did not follow symlinks/reparse links. At 15:48:55 EDT it visited 658 files, reported no skipped links or read errors, found zero `.env` assignments for definition-root variables, zero definition-type directories and zero `version.json` files. Source/config searches found no additional literal configured VDR roots. `C:\Projects\Modular\apps` was empty. P's `.uib`, `data` and sibling `.ui` yielded no definition-service root configuration references. A read-only Windows service/scheduled-task inventory found zero matches for the repository/product names, schema-manager, trigger-manager or the definition-root variable names. Full launcher command lines were not logged. Indirect generic launchers that contain none of those identifiers are not ruled out.

Inventory would classify metadata by absent `checksumFormat`, proposed `canonical-json-v1`, unknown format or malformed shape, and count drafts/missing payloads. It did **not** read or hash definition payloads, call VDR verification, or invoke schema-application snapshot/recovery APIs. Those state-store read-like methods acquire locks and can recover/write; they are unsuitable for this read-only assessment.

| Candidate root | Provenance | Exists | Published metadata / legacy / proposed new / unknown / drafts |
| --- | --- | --- | --- |
| `D\data\definitions` | Direct service launch with cwd D | No | 0 / 0 / 0 / 0 / 0 |
| `D\packages\schema-manager\data\definitions` | Documented npm schema workspace launch, no override | No | 0 / 0 / 0 / 0 / 0 |
| `D\packages\trigger-manager\data\definitions` | Documented npm trigger workspace launch, no override | No | 0 / 0 / 0 / 0 / 0 |

There are no local records to empirically classify beyond these zero counts. A format tag would establish only **claimed format**, never verified integrity. The broader scan found no additional stores to inspect. P's `ormDir` points to an absent `C:\Projects\Modular\orm` used by an exporter; it is not a discovered VDR store.

Tests inject ephemeral roots; previous audit temporary fixtures are synthetic evidence, not configured application stores, and were not counted as deployments. Constructors accept arbitrary caller-provided paths. Running services may have private environment overrides, and other machines, external mounts, indirect launchers or deployments may have roots not discoverable here. Their contents remain **UNKNOWN**. The user confirmed there are no confirmed external paths to provide and instructed that external deployments/other machines remain unverified. This is not evidence that those locations contain no published definitions. No whole-machine crawl or remote-store access was performed.

**Deployment implication:** require explicit, reviewed absolute roots for both services at deployment. An absent local default must not cause a deployment to create a new empty store accidentally or be taken as proof there is no legacy compatibility problem.

## 4. Effects of legacy restrictions and proposed behavior

| Operation | Current path / risk of blanket rejection | Recommended approved-design candidate |
| --- | --- | --- |
| Historical inspection | getVersion reads raw value/metadata; a new rejection there would remove diagnostic access. | Dedicated inspection API returns content plus explicit unverified classification, subject to existing authorization. It never implies safe runtime use. |
| Draft creation/editing | SchemaManager/TriggerManager calls getActive for immutable ID checks. Rejection blocks even draft editing. | Use inspection for an **observed** identity comparison, allow same-ID edits against a single parseable active legacy version, and mark identity basis unverified. Draft remains non-runtime and non-publishable while baseline is unverified. |
| Dataset/trigger identity | Missing active is currently caught as not published; malformed/no-active histories can be confused with new definitions. | Distinguish genuinely empty definition history from ambiguous/damaged history. No ID reset on missing/duplicate active or malformed identity. Editing against a legacy ID is a consistency check, not authentication of that ID. |
| Draft comparison | Current equality trusts the legacy checksum. | Add an explicit comparison outcome. Legacy base => comparison unavailable and base unverified; do not call it clean. Compatibility state can remain modified with this qualification. |
| Publication | publish changes old status before normalization/storage finishes. A late legacy guard can partially mutate history. | Before **any** write, require valid normalized draft and either genuinely empty history or verified current identity/baseline. Legacy active blocks ordinary publication. No auto-conversion by publishing the same bytes under a new checksum. |
| Rollback | Reads historical source, writes draft, then publishes. | Require verified target and verified current baseline before touching draft/metadata. Legacy target blocks. Rollback remains a new publication, never modification of historical payloads. |
| Active schema consumption | Existing getActiveSchema is raw; DOE does not consume it today. | Explicit verified active-read API. It verifies a selected version, rejects ambiguous active selection and returns only a verified result. It does not implement DOE integration, physical-schema verification or activation. |
| Schema-application references | Existing records have unqualified version/checksum/schemaId; begin only validates nonempty checksum. | Preserve stored records. Absent format remains legacy/unqualified. A future resolver must compare format + checksum + version + identity after verification; a matching string alone is insufficient. No resolver or state migration here. |
| Trigger Manager | Shares VDR; raw active needed for observed ID guard. Runtime registry is separate. | Same inspection/verified split; no automatic runtime registration upon publication or verification. |
| UI Platform | Uses artifact concurrency and migration fingerprints, not VDR checksums. | Keep hash domains unchanged. Any future adapter must explicitly consume verified D identity rather than cast a P fingerprint to a D checksum. No integration bridge in STAB-1. |

Allowing legacy draft edits is a recommended refinement of the stabilization plan's blanket fail-closed direction and needs approval. Alternative: make legacy stores entirely read-only. That is simpler but intentionally breaks draft workflows. Neither alternative permits publishing or executing unverified content.

For observed-ID editing, mismatching IDs still reject. If historical identity is not parseable or active selection is ambiguous, block editing pending operator review; do not choose the first metadata record. Canonical payload integrity does not authenticate mutable metadata or defend against an actor who can rewrite both payload and digest. Registry access control and metadata/identity checks remain necessary; checksums are not signatures or proof of trusted provenance.

## 5. Precise API distinction proposed for approval

### Contracts

Introduce separate result types, rather than a caller-supplied allowLegacy switch on a verified method:

```ts
type ChecksumIdentity = {
  checksumFormat: "canonical-json-v1";
  checksum: string; // exactly sha256: plus 64 lowercase hexadecimal digits
};

type VersionCheckStatus =
  | "verified" | "legacy-unverified" | "unsupported-format"
  | "mismatch" | "missing-content" | "invalid-content"
  | "invalid-metadata";

// Inspection is not assignable to a verified result.
type InspectedVersion<T> = {
  kind: "inspection";
  declared: PublishedDefinition<T>; // stored claims, including optional format
  verification: "not-performed";
  formatClass: "legacy" | "supported" | "unsupported";
};

type VerifiedVersion<T> = {
  kind: "verified";
  definition: PublishedDefinition<T> & ChecksumIdentity;
  verification: { status: "verified"; verifiedAt: string };
};
```

These are illustrative design signatures, not added source. For unreadable/malformed content, inspection returns a structured unavailable/error variant rather than pretending the value satisfies T. Schema/trigger adapters remain responsible for semantic validation; a digest match alone does not make malformed business content valid.

| Proposed VDR method | Contract |
| --- | --- |
| `inspectVersion(ref, version)` | Read raw stored claims/content without mutating, hashing or certifying; return inspection or structured availability failure. |
| `inspectActive(ref)` | Inspect uniquely declared active version; distinguish no history, no active, multiple active and invalid metadata. No verification claim. |
| `checkVersion(ref, version)` | Read and validate one version, dispatch by explicit format, return structured outcome. Do not recompute a legacy digest as a fallback to verification. |
| `readVerifiedVersion(ref, version)` | Return VerifiedVersion only for a successful check; otherwise throw a typed error. Return the same immutable snapshot whose digest was checked, not a second unchecked read. |
| `readVerifiedActive(ref)` | Validate active selection, check that version and detect selection change during read; otherwise return conflict. Does not guarantee freshness after return or implement runtime reload. |
| `inspectHistory(ref)` | Return per-version availability/format metadata for admin display, no implicit integrity result. |
| `verifyHistory(ref)` | Check all versions and return scoped per-version results plus aggregate completeness. Current active result reported separately. |

Use defensive copies/read-only contracts for checked data. A TypeScript marker is a compile-time aid, not a security boundary: untrusted serialized objects cannot declare themselves verified. The verifying service must perform the check. Existing authentication/authorization still applies to inspection and verified reads.

### Existing methods and HTTP compatibility

Recommended migration: introduce explicit APIs and update every internal caller; deprecate ambiguous names in a coordinated package release. Do **not** silently change `getVersion` to verified-only. Preserve its historical-inspection behavior during a documented transition, but label it unverified/deprecated and do not use it on any verified-consumption path. `getActive` is likewise deprecated raw inspection; new consumers use `readVerifiedActive`. Removing/changing those return types is a later explicit breaking change. This transitional API is less disruptive than replacing raw values with wrappers everywhere in one patch, but requires consumer inventory and tests to prevent accidental legacy consumption.

For SchemaManager/TriggerManager, add equivalent named inspection and verified-read methods. Change identity guards to explicit inspection. Define HTTP behavior explicitly for a coordinated service release:

- Historical `GET .../versions/{n}` stays available as inspection. Adding an inspection envelope is a breaking response change; prefer a new versioned route/contract if existing external clients cannot be updated together. Do not present a raw legacy response as verified.
- Add `GET .../versions/{n}/verified` and a verified active endpoint. Existing `/active` remains documented raw during compatibility staging; switching it to verified-only is a separately approved cutover, not an unnoticed patch change.
- `GET .../verify` can return HTTP 200 for a successfully generated integrity report even when records are unverified; its body carries the outcome. A verified-read request must fail rather than return unverified content.
- Proposed typed errors: `DEFINITION_CHECKSUM_LEGACY_UNVERIFIED`, `DEFINITION_CHECKSUM_FORMAT_UNSUPPORTED`, `DEFINITION_INTEGRITY_MISMATCH`, `DEFINITION_ACTIVE_AMBIGUOUS`, `DEFINITION_ACTIVE_CHANGED`, and missing/invalid content/metadata errors. Proposed service mapping: 404 for genuinely missing requested version; 409 for legacy/unsupported/ambiguous/conflicting stored state; 422 for invalid submitted draft. Stored corruption must not be confused with invalid caller input. Final HTTP mapping requires approval and contract tests.

A compatibility staging release with raw aliases is **not** a claim that existing callers are verified. Verified-only deployment is certified only after all required consumers use the explicit verified APIs or an approved endpoint cutover. No runtime caller integration is invented to make that claim today.

## 6. Canonical JSON checksum specification

Proposed identifier: **`canonical-json-v1`**. Keep digest spelling `sha256:<64 lowercase hex digits>` and record `checksumFormat` alongside it. The pair, not the prefix alone, is the checksum identity. Absence means legacy only in the VDR definition domain; null, empty or unknown format values are invalid/unsupported, not permission to fall back.

### Input and byte rules

1. Hash the normalized **definition value only**, not version number, publication time, active status, stored checksum or ref metadata. Schema and Trigger adapters choose normalization before hashing. Metadata/identity consistency is validated separately. This preserves the plan's minimal scope; envelope-binding or signatures would require a different format and approval.
2. Supported values are null, booleans, strings, finite JavaScript binary64 numbers, dense arrays and plain JSON objects. Reject undefined, non-finite numbers, BigInt, functions, symbols, cycles, sparse arrays, custom prototypes, getters/setters, toJSON hooks and unsupported properties rather than silently omit/coerce them. Objects reconstructed from JSON may have ordinary or null prototypes; property names such as `__proto__` are serialized as data, not assigned through prototype setters.
3. Sort object property names recursively by explicit UTF-16 code-unit lexicographic comparison. Never use localeCompare, locale-dependent collation or filesystem ordering. Preserve array order exactly. Do not sort fields merely because they have permanent IDs.
4. Serialize strings and property names using ECMAScript JSON string escaping, with no Unicode normalization. Reject unpaired surrogate code units rather than allowing encoding-dependent replacement. Canonically equivalent but differently encoded Unicode strings remain different values unless an approved domain adapter normalizes them before hashing.
5. Serialize finite numbers using ECMAScript JSON number serialization; `-0` becomes `0`, and numerically equivalent forms such as 1 and 1.0 produce the same canonical bytes. This is semantic hashing of the JS JSON model, not preservation of decimal tokens or arbitrary precision. IDs requiring exact large integers must be strings; broader numeric validation policy is not silently introduced here.
6. Use no insignificant whitespace, no BOM and no trailing newline. Encode canonical text as UTF-8 and compute SHA-256. Persist the format and checksum with new version metadata.
7. Raw JSON ingress/verified-read parsing must reject duplicate object member names before they collapse under JSON.parse. Reject malformed JSON. An object API cannot recover duplicate names already lost by its caller; document that boundary. Use bounded depth/size limits consistent with service limits, with explicit errors, not truncated hashes.

Example canonical text for differently ordered equivalent input:

```json
{"a":1,"b":{"x":null,"y":[true,"é"]}}
```

The rules are a project-defined versioned format, not a claim of compliance with an external canonicalization standard. Pin golden byte/digest vectors and test supported Node environments before declaring portability. Old semantic equivalences or unsupported input coercions must not be inferred from JSON.stringify's default omission rules.

### Why not reuse existing P canonicalization?

P uses localeCompare, omits undefined object properties and maps some non-JSON primitive results to null. Its existing hashes feed migration ledgers, build IDs and backups. Replacing that helper would silently change unrelated persisted contracts. Keep the new strict implementation private to D VDR initially; a shared checksum package is unnecessary scope. Do not alter schema-application journal hashing.

## 7. Mixed histories and reference semantics

Report each version independently: declared format, structural availability, check status and non-sensitive diagnostic codes. Do not log schema payloads, business names, field values, secrets or absolute storage paths in routine diagnostics. Authorized admin inspection may return content; operational reports should use counts and opaque references.

| History example | Aggregate | Active result / permitted verified read |
| --- | --- | --- |
| Empty | `empty`, not verified | Not published |
| All legacy | `unverified` | Legacy-unverified; blocked |
| Legacy historical + valid canonical active | `partially-verified` | Active verified; explicit verified read may succeed without certifying old history |
| Valid canonical historical + legacy active | `partially-verified` | Active blocked |
| All canonical and all checks pass | `verified` | Verified if active selection/identity is valid |
| Any mismatch/missing payload/invalid metadata | `failed` with per-version causes | Individually valid active can be reported, but metadata corruption affecting selection blocks active read; ordinary mutations remain blocked pending review of inconsistent history |
| Unknown future format | `unverified` or `partially-verified`, with unsupported count | Unsupported active blocked; no downgrade/fallback |

Return explicit counts (`total`, `verified`, `legacyUnverified`, `unsupported`, `failed`) and a separate active-selection result. Retain the old `IntegrityReport.valid` only as a conservative compatibility projection: true **only** for a nonempty completely verified history; never true just because the active version passes. `checkedVersions` should mean attempted checks, not certified versions; introduce `verifiedVersions` explicitly. No skipped legacy version may disappear from the report.

Draft comparison should return `equal | different | unavailable` plus `baseVerification`. Clean is allowed only for equal canonical content against a verified base. Legacy-base editing can continue with comparison unavailable and a modified compatibility state; do not assert it is known dirty merely from unavailable comparison. Malformed draft validation remains separate.

`PublishedSchemaIdentity` should eventually carry an optional format on read and require it for newly created canonical references through an explicit typed construction boundary. Existing references are never retagged on load. Expected-version comparisons must compare the whole identity tuple after loading a verified version. A state record can remain inspectable even if its published reference is unverified. Adding this metadata to new state records requires reviewed contract changes/tests; no applied resolver, activator, or conversion of existing state belongs in this implementation.

The two applied-state authorities remain unresolved. P's provider fingerprint cannot serve as a trusted replacement for a missing D publication format. Trigger checksum verification does not imply central runtime registration, handler availability or safe executable code.

## 8. Deployment and backward compatibility

### Recommended sequence

1. **Before implementation approval:** approve the API split, serialization rules, mixed-history reporting, identity-check policy and deployment scope. Keep accepted STAB-0 results attached to their SHAs/toolchain.
2. **Before deployment:** enumerate exact absolute definition roots and external consumers. Take a read-only classification inventory; preserve a recoverable byte-for-byte backup under a separately approved operational procedure. Establish whether any legacy active/history or stored checksum references exist. Local zero counts are not sufficient for another environment.
3. **Fresh empty roots:** after implementation and regression approval, deploy coordinated VDR/SchemaManager/TriggerManager versions and create only new-format publications through ordinary authorized operations. Do not initialize another empty root accidentally because cwd changed.
4. **Existing legacy roots:** do not automatically deploy a verified-only endpoint cutover that interrupts service. Permit an explicitly approved inspection/compatibility staging mode, visibly unverified, or hold deployment until a separate legacy transition plan is accepted. No allowLegacy bypass on a verified API. Do not automatically publish legacy bytes as a newly trusted version.
5. **Mixed roots:** per-version verification allows a valid canonical active version to be consumed if the owner has approved that deployed history and all identity/selection checks pass. Legacy rollback targets remain blocked. Ordinary publication requires a verified current baseline; unrelated readable legacy history remains visible and unverified. Corrupt/ambiguous history requires review.
6. **Writer coordination:** prohibit mixed old/new writers against one root. Old code ignores the format marker and can publish legacy content or apply incompatible comparisons. Pin compatible packages and update services together; do not rely on a marker alone to fence old writers.
7. **Rollback of code:** before any new-format writes, rollback is an ordinary code decision. After new-format writes, old binaries are not automatically a safe rollback target. Do not rewrite new history to appease old code. Use a compatible reader/writer rollback or a separately reviewed operational recovery plan. No data restoration is authorized here.

No existing historical checksum can establish the omitted nested content's authenticity retroactively. A later transition might use independently trusted source/provenance and a newly approved publication or external attestation; recomputing current legacy content alone is insufficient. Both the mechanism and its approval are outside STAB-1 assessment. Never rewrite historical checksums, version numbers, payloads or state references silently.

All packages currently use 0.1.0. Recommend a coordinated explicitly incompatible minor release (for example 0.2.0) where contracts/behavior change, with exact dependency updates and release notes **only when implementation is approved**. Version selection itself is a review decision. A semver bump does not discover or protect unknown external consumers.

## 9. Alternatives and decisions requiring approval

| Decision | Alternatives | Recommendation / compatibility cost |
| --- | --- | --- |
| A1: Inspection versus verified APIs | Blanket verification in old getters; additive explicit APIs; replace all returns with wrappers immediately | Add explicit APIs and deprecate raw aliases with a coordinated cutover. Preserves inspection; transitional callers are not certified until migrated. |
| A2: Legacy draft editing | Block all editing; permit same observed-ID edits with unverified base | Permit qualified same-ID editing, block ambiguity and publication. Requires explicit acknowledgement that observed ID is not authenticated. |
| A3: Digest scope | Value only; ref/version-bound envelope; signed metadata | Value-only canonical-json-v1 plus separate identity checks. No claim to authenticate metadata or provenance. Broader envelope/signature design is separate. |
| A4: Serialization | Reuse P helper; strict project format; adopt a separately researched standard | Strict specified project format with golden vectors. No silent P fingerprint migration. |
| A5: Mixed histories | Entire history must verify for every read; per-version verified read with honest history report | Per-version reads; conservative aggregate valid. Legacy old versions remain unverified. |
| A6: Legacy deployment | Automatic cutover; automatic rehash/republish; hold or explicit inspection-only staging | Hold verified-only cutover until root/consumer inventory and separate legacy policy approved. No automatic conversion. |
| A7: HTTP migration | Silently change old routes; new/versioned routes and documented cutover | Explicit route/response contract migration; approve status/error mapping. Avoid accidental availability break. |
| A8: Schema-state identities | Infer from checksum prefix; convert on load; retain old and qualify new references | Preserve old identities; explicit format on new references only after contract approval. No resolver/activation work. |
| A9: Package release | Keep indistinguishable 0.1.0; coordinated incompatible release | Coordinated reviewed release and dependency pins, not an incidental lockfile update. |

The user has approved the general planning direction, not these implementation choices. Remaining deployment-root and external-consumer unknowns must remain explicit. This document does not independently resolve applied-state ownership or trigger publication/runtime-registration integration.

## 10. Affected files and interfaces for a future authorized implementation

| Area | Expected files | Notes |
| --- | --- | --- |
| VDR implementation | D `packages/versioned-definition-registry/src/registry.ts`; private new canonicalization/parser helper if needed | Digest dispatch, read/verify split, comparison and pre-write guards. Avoid unrelated publication transaction redesign. |
| VDR public types/exports | D `packages/versioned-definition-registry/src/types.ts`, `src/index.ts` | Format identity, inspection/verified variants, rich integrity report and draft comparison. |
| Manager adapters | D `packages/schema-manager/src/index.ts`; `packages/trigger-manager/src/index.ts` | Explicit observed-ID inspection, verified wrappers, publication/rollback prerequisites. |
| HTTP contracts | D manager `src/service.ts` files | Explicit routes/errors/response migration; authentication unchanged. |
| State reference contract, if A8 approved | D `packages/schema-application/src/index.ts` types/input handling and tests | Preserve journal algorithm and existing state bytes; no resolver implementation. |
| Documentation | D root README and VDR/manager package docs; P assessment/results documents | Legacy support matrix, roots/cwd, API migration, no invented acceptance. |
| Tests | New VDR canonicalization/integrity/legacy tests; existing schema-manager and trigger-manager tests; dedicated HTTP contract tests; schema-application reference compatibility tests if changed | Read-only/blocked-operation file preservation is essential. |
| Package metadata, only at release approval | D affected package.json dependencies and root lockfile | Explicit release work; never regenerate the lockfile as a side effect of assessment. |
| P regression consumers | `packages/artifacts/tests/schema-adapter-compatibility.test.ts`, artifact/build/migration/editor tests | Verify no cross-domain changes. No P checksum producer change expected. |

Potential breaking changes include unsupported non-JSON inputs, new error/status cases, unavailable legacy comparison, blocked legacy publication/rollback, new verified-read availability restrictions, richer report semantics, optional-to-required format boundaries for new identities and eventually removal of ambiguous getters. Each needs a compatibility test/release note; calling the additions “optional fields” does not remove behavioral impact.

## 11. Recommended acceptance tests

### Canonical bytes and digest

- Golden canonical text and SHA-256 vectors for nested objects, arrays, empty containers, primitives, Unicode and escaped control characters; repeat under supported Node versions/platforms/locales.
- Key insertion order does not matter; explicit code-unit sorting handles uppercase/lowercase, accents, numeric-looking keys and non-ASCII consistently. Array reorder changes digest.
- Nested dataset name, permanent IDs, field type/required/default and nested JSON defaults all affect digest. The audit's exact undetected-change case must fail with new-format tampering.
- Null versus missing key differs; true/false and numbers/strings differ; -0/0 and equivalent numeric token forms follow the declared rules.
- Reject undefined, sparse arrays, non-finite numbers, BigInt, symbols/functions, cycles, accessors, custom serialization/prototypes, duplicate raw JSON names and unpaired surrogates. No silent omission or executable getter/toJSON invocation.
- Payload serialization/readback preserves the hashed value; malformed digest or unknown marker fails closed. Hashing metadata rather than payload by accident must be detected.

### Legacy/mixed compatibility and zero mutation

- Inspect legacy active/historical versions successfully with explicit unverified status. Legacy getter compatibility is documented/tested, never promoted to VerifiedVersion.
- Snapshot all fixture bytes before and after inspection, verifyHistory, failed verified read, blocked publish and blocked rollback: **zero file changes or additions**, including draft and old active metadata.
- Same-ID legacy draft editing, if approved, succeeds with unverified base; changed-ID editing rejects. Truly empty history permits initial draft. Missing/duplicate active and malformed metadata do not permit identity reset.
- Legacy base comparison is unavailable, not clean. Fresh canonical publish -> clean; nested edit -> different/modified. Distinguish validation failure from checksum comparison availability.
- Mixed legacy + valid canonical active yields partially-verified history and a verified active snapshot. Legacy active or rollback target remains blocked. Corruption and missing payload are not mislabeled legacy-unverified.
- Empty history is not verified; every historical record appears in aggregate counts. Unsupported future format never falls back to old/new digest guessing.
- New-format publication and rollback fixtures validate prerequisites before normalization/write side effects; rejected legacy rollback leaves draft unchanged.
- Verified active read returns the exact checked snapshot; pointer/content changes during read yield a conflict or checked immutable snapshot with bounded selection semantics, not an unchecked second read.

### Contracts and deployment safety

- Schema/Trigger Manager identity paths use inspection intentionally; runtime verified API cannot accept an inspection object or a caller-forged verification marker.
- Historical HTTP inspection remains usable; verified endpoints reject legacy/mismatch/ambiguous cases with agreed statuses and no payload/path leakage in errors. Existing response compatibility or route versioning is tested explicitly.
- Canonical digest success is distinguished from schema semantic validation and identity/metadata validity.
- Old schema-application state loads without rewrite; unqualified published references remain unverified. Format-aware expected-identity comparisons do not compare P migration fingerprints or journal digests accidentally. No activator/resolver is introduced.
- Pin old/new binary interoperability tests: old writer is excluded from new-format stores operationally; unsupported new format is not considered safe by an unreviewed client. No automatic code/data downgrade.
- Run D build/typecheck/full tests with the accepted local npm 10.8.2/Node 24.19.0 baseline; report original eight tests separately from new test counts. Run P schema contract and relevant artifact/migration compatibility regressions without changing their hash semantics.

These are proposed tests, not tests added or executed in this assessment. Existing Windows watcher EPERM remains a documented separate issue; no watcher fix, retry suppression or broad regression success is claimed.

## 12. Execution record and review gate

Completed read-only Git status/HEAD checks, checksum/caller source searches, service/npm cwd inspection, whitelisted configuration lookup, matching Windows service/scheduled-task inventory, bounded metadata-only root inventory and baseline lockfile/report hash checks. Final comparison against STAB-0's 56-file Data Services inventory found zero changed files. No manager/runtime APIs, installs, builds, tests, migration tools, schema publication commands or deployed services were invoked. Inventory code existed only as a temporary read-only audit script, not a runtime implementation.

STAB-0 report SHA-256 remains `EA1394C439425805B51FAED4E7633C82F14311DFC60E0328162257B7DF8E16DE`; stabilization plan SHA-256 remains `03647EE877E701923B0ABB53E1FAB3AF106751A55AD622DE9E7970852EECF270`. Their evidence and source baseline are preserved. No legacy version was read into a hashing routine or rewritten; no application data or runtime behavior changed.

**STOP: STAB-1 design review gate.** Approve or revise decisions A1–A9 and identify any external stores/consumers before authorizing implementation. B1 remains accepted/closed for its recorded environment; B2–B4 remain unresolved. Full record-scoped authorization remains a separate future work item. No STAB-1 implementation, other stabilization package or DS0-WP2 work is authorized by this assessment.
