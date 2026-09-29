# DS0-WP2-R2 implementation and acceptance report

September 29, 2026. **IMPLEMENTED FOR G3 REVIEW — acceptance pending. R2 remains uncommitted.**

## Outcome and authorization

R2 implements controlled runtime activation for the approved isolated development prototype: root ownership, closed admission, full handler draining, independent fresh runtime construction, R1 verification, real authorized HTTP health probes, flushed receipt evidence, confirmed applied-state promotion and verified same-version clean process restart.

Final Data Services build, typecheck and strict compilation pass. The full suite passes **482 tests across 18 files**, including **35 new R2 tests**. UI Platform compatibility, typecheck, production build/check and editor contracts pass. Runtime evidence comes from real temporary ORM/I-AM/DOE stores and the unchanged production request handler, including a restart in a new process. It is not inferred from compilation, synthetic metadata or generic HTTP 200 responses.

The [R0 contract](ds0-wp2-r0-contract-design.md) and G1 decisions remain the authority. Only R2 was implemented. No journal reconciliation, stale-lock takeover, force-unlock, upgrade, physical migration, published-trigger bridge, production hosting or UI Platform migration-state integration was added. No commit, push, package release, deployment or migration occurred in this turn.

## R1 acceptance and repository baseline

The [G2 acceptance record](ds0-wp2-r1-acceptance-record.md) records the user's scoped R1 acceptance. At entry, the approved eleven Data Services files were already committed in `07f11bc3ad16e249b97311be7641f1c91d48753e`. The commit's file set exactly matches the accepted manifest and all eleven hashes match. Therefore no duplicate commit was created. The original R1 report and evidence are preserved separately and unchanged.

| Repository | Entry and exit HEAD | Exit state |
| --- | --- | --- |
| Data Services, `C:\Projects\Modular\UI Platform Data Services` | `07f11bc3ad16e249b97311be7641f1c91d48753e` | Eleven uncommitted R2 files listed below; no staged changes |
| UI Platform, `C:\Projects\Modular\ui-platform` | `1259d92472ad2716b3e2d5386b160af6a0f9bd88` | New acceptance/report/evidence documents only; no tracked source changes |
| ui-base | `96898f73809272e680fcb3402f064a039fff4350` | Clean |

Node **24.19.0**, local npm **10.8.2**. The preserved STAB-0 explicit npm launcher was used for nested workspace commands; all **53 traced npm invocations** used 10.8.2. No installation or global tool change was performed. [Invocation trace](evidence/ds0-wp2-r2/npm-invocations.jsonl).

| Lockfile | Unchanged SHA-256 |
| --- | --- |
| Data Services | `84C088FD3F0652700B25A3A367CED095A8962229075F49405CF4F3B443A4155F` |
| UI Platform | `5E4A3F737256772D16427A4EB78B1E86336E8B11E4F555998BA76882DFC79EFA` |
| ui-base | `2A8BE906BE643F1DCBD2F33685ED5C3B711E99740F3D19CDB542276608A4673E` |

## Implemented behavior

### Ownership and authority

`ActivationOwner` exclusively creates `activation-owner.json` under the prototype root, writes and synchronizes its token/run/domain record, and retains it through the serving lifetime. The controller asserts ownership before transitions and the host checks it before each health query/write. Release requires stopped/drained work and a matching owner record. A loser does not mutate state or data. Missing/changed ownership closes admission; failures preserve owner/evidence rather than attempting takeover.

Root configuration must explicitly declare exclusive synthetic use and Data Services authority. Roots must exist, be absolute and separate, remain within the prototype root, and have no symlink/junction aliases. Overlap, extra authority settings and UI Platform authority conflict reject. These checks and caller attestation provide cooperative isolation only. Existing direct store/ORM users must remain excluded; no filesystem token fences an uncooperative writer.

### Admission and complete draining

The development host's ordinary listener starts closed. It returns the approved host-level 503 while unavailable. Before admitted work begins it resolves the current qualified runtime; registry mutations are denied by the prototype wrapper. Admitted normal production-handler auth and business-result envelopes are unchanged.

The gate counts a request before its first asynchronous check and releases it only after the actual handler promise settles. Response completion or client disconnect does not decrement the operation count. The drain deadline gates shutdown/activation without cancelling writes. Private probe calls also track handler promises; listener shutdown waits for settlement. Ownership is released only after drain and stop succeed.

A real DOE test deliberately ignores a nested child promise and disconnects the client while that child is blocked. Draining remains blocked; releasing the child permits the root to finish and fresh ORM readers observe both committed writes. A separate owned-host query barrier proves that a contender remains excluded throughout shutdown draining.

### Fresh runtime and real serving assertion

The concrete composition lives only under `dataset-operations/tests/support`. It constructs fresh ORM, I-AM authorization/policy store, DOE and central TriggerRegistry instances. The target ORM registration is supplied independently in the manifest; no publication-to-registration conversion manufactures equality. R1 verifies the exact canonical pin, permanent field mapping and fingerprint.

The controller's actual `ServingRuntime` assertion checks generation/pin/fingerprint, owned record, open admission with a live ordinary listener, unchanged health receipt and absence of enabled target triggers. It is not a no-op. Qualified resolution additionally rechecks R1 publication, observed structure and applied state. Receipt tampering, owner loss or a stopped listener rejects and closes admission.

Applied-state eligibility is checked before admission opens. To preserve the accepted R1 public contract, R2 has a private read-only copy of R1's strict state parsing/applied validation. It does not invoke a fake serving assertion while admission is closed. No existing R1 implementation was edited.

### Health, receipt and promotion

The private probe listener has a fresh private bearer capability, separate from the ordinary listener token. Health uses the existing production handler and a pre-provisioned unscoped actor/grant fixture against the target dataset:

1. Authorized query confirms the reserved row is absent.
2. Insert and query confirm the inserted row.
3. Update and query confirm its changed value.
4. Delete and query confirm absence.

Every step includes a fresh independent ORM reader check. Write responses must have the expected record, correlation ID, operation ID, success/committed flags, `commitOutcome=committed`, requested/succeeded counts of one, zero failed/unknown counts and no errors. A generic 200, missing outcome, wrong counts/IDs, denied/scoped decision, post-commit failure or unknown commit cannot pass. An uncertain real commit stops the sequence with no update/delete/retry/cleanup; the test proves the persisted inserted row remains available for diagnosis.

Enabled target-dataset triggers reject activation. Disabled central registrations remain byte-identical and their handlers do not run. No trigger is silently disabled or bridged from published definitions.

The receipt binds owner run ID, attempt ID, runtime generation, complete pin, fingerprint, actor/grant fixture identifiers, seven result summaries, fresh-reader assertions and timestamp. It contains no full row payloads or credentials. It is written with exclusive creation, `FileHandle.sync`, close and readback before promotion. Its canonical bytes and SHA-256 are referenced through the existing `RuntimeActivation.healthCheck` string. Existing state/journal fields and hashing remain unchanged.

“Durable receipt” here means acknowledged file flush and readback. It does **not** claim cross-filesystem directory-entry durability, power-loss survival or a transaction spanning receipt and state. Receipt failure prevents promotion. Lost promotion acknowledgment yields `stateWriteOutcome=unknown`, closed admission and retained evidence even when applied bytes are present. The controller never infers readiness from those bytes alone or retries the transition.

### Clean restart and R3 boundary

Clean shutdown drains, stops and releases ownership. A new process acquires ownership, validates the existing applied state and receipt, re-verifies the exact pinned canonical version, constructs a new runtime and repeats health. The applied record/ledger bytes remain unchanged; a fresh runtime receipt is created. A newer active publication never changes the pinned version automatically.

Any existing journal, state lock, orphan temporary file, pending/recovery state or stale root owner blocks R2. No before/next checksum reconciliation is attempted, even if a journal might later prove safe. Process-death tests show that a second process does not steal the owner or alter evidence.

## Exact Data Services changes

Two existing files have append-only changes; nine files are new. Paths are relative to Data Services. [Final source hashes](evidence/ds0-wp2-r2/preservation.json) contain the full SHA-256 for every entry.

| File | Responsibility |
| --- | --- |
| `packages/schema-application/src/activation-owner.ts` | Cooperative root owner, strict root/authority configuration, checked release |
| `packages/schema-application/src/activation-controller.ts` | Activation orchestration, real serving assertion, receipt/promotion and clean shutdown |
| `packages/schema-application/src/activation-state.ts` | Private strict read-only state eligibility; no reconciliation |
| `packages/schema-application/src/index.ts` | Appended R2 exports only |
| `packages/schema-application/README.md` | Appended prototype contracts and limitations |
| `packages/dataset-operations/tests/support/activation-host.ts` | Development/test HTTP composition, independent registration, private health and admission gate |
| `packages/dataset-operations/tests/support/activation-child.ts` | IPC-controlled test child process |
| `packages/dataset-operations/tests/support/r2-fixtures.ts` | Disposable canonical publication, real ORM/I-AM fixtures and byte inventory |
| `packages/dataset-operations/tests/activation-http.test.ts` | 32 activation, health, failure, authority, preservation and admission tests |
| `packages/dataset-operations/tests/activation-drain.test.ts` | One real ignored-nested-operation/client-disconnect drain test |
| `packages/dataset-operations/tests/activation-process.test.ts` | Two real process contention/restart/death tests |

No production `request-handler.ts`, `service.ts`, ORM algorithm, DOE/I-AM contract, package manifest, dependency lock or UI Platform source was changed. Cross-package composition imports remain test-only; schema-application runtime additions use existing dependencies and Node built-ins.

## Verification and command evidence

Commands ran in the actual checkouts. The [command record](evidence/ds0-wp2-r2/commands.json) and [final affected-check record](evidence/ds0-wp2-r2/verified-commands.json) give exact argument arrays, working directories, timestamps and exit codes. `npm-cli` below is the approved local npm 10.8.2 CLI with the STAB-0 shim on the child PATH.

| Check | Final result |
| --- | --- |
| D `node npm-cli run build` | All seven workspaces; exit 0 — [build](evidence/ds0-wp2-r2/verified-07-build.txt) |
| D `node npm-cli run typecheck` | Exit 0 — [typecheck](evidence/ds0-wp2-r2/verified-08-typecheck.txt) |
| D strict TypeScript compilation with `--noEmit --strict --skipLibCheck --target ES2022 --module NodeNext --moduleResolution NodeNext` | New R2 tests/support plus R1 and accepted STAB security/consumer fixtures; exit 0 — [strict](evidence/ds0-wp2-r2/verified-09-strict.txt) |
| D `node node_modules/vitest/vitest.mjs run` | **482/482, 18 files** — [full suite](evidence/ds0-wp2-r2/verified-10-full-tests.txt) |
| D focused R2 integration/drain/process runs | Earlier focused stages 16/16, 2/2 process, then 30/30; final expanded 35 R2 cases all included in the full suite — [expanded focused](evidence/ds0-wp2-r2/05-expanded-focused.txt) |
| P focused schema-adapter + migrations-deployment tests | **12/12, two files** — [compatibility](evidence/ds0-wp2-r2/11-platform-focused.txt) |
| P `node npm-cli run typecheck` | Exit 0 — [typecheck](evidence/ds0-wp2-r2/12-platform-typecheck.txt) |
| P `node npm-cli run check:editor-production` | Build and production-client check; exit 0 — [production](evidence/ds0-wp2-r2/13-platform-production.txt) |
| P `node npm-cli run check:editor-contracts` | **103/103, 13 files**, plus package/editor checks; exit 0 — [contracts](evidence/ds0-wp2-r2/14-platform-contracts.txt) |
| D `git diff --check` | Exit 0; Git reports LF/CRLF conversion advisories only |
| Read-only source/evidence preservation checks | Exit 0 — [manifest](evidence/ds0-wp2-r2/preservation.json) |

Count reconciliation: accepted D **447 + 35 new R2 = 482**. New R2 counts are 32 HTTP/activation + one drain + two process tests. The focused executions overlap the full suite; they are not extra unique coverage. All original STAB/R1 tests remain unchanged and included. P's 12 focused and 103 editor cases share three schema-adapter cases, yielding **112 unique tests across 14 files**, 115 executed instances. This is the relevant P selection, not its entire suite.

The final Data Services checks were rerun after the owner-run/receipt/private-listener/readiness refinements. UI Platform checks passed in the same review; its source, dependencies and referenced production behavior were unchanged by those later D-only refinements.

### Required failure and preservation evidence

- Contender while another process is serving: rejected, with complete shared-root inventory and bytes unchanged.
- Process killed while serving: stale owner retained; second process rejected without evidence mutation.
- Clean same-version process restart: different runtime generation, real repeated health, identical applied state bytes.
- Junction alias, overlapping roots, conflicting/extra authority: rejected before activation writes.
- Wrong independent ORM definition, legacy publication, enabled trigger or existing journal: no health/promotion; existing bytes preserved apart from the explicitly allowed coordination owner.
- Denied or record-scoped health actor: no certified health; target writes remain absent when authorization rejects.
- Invalid HTTP 200 business results and post-commit failure: blocked after the first committed probe; no original-write replay or cleanup.
- Real commit persists then throws: exactly one commit attempt, no later update/delete, persisted row visible to a fresh reader, owner retained.
- Injected before/after state-call failures and lost promotion acknowledgment: unknown state-write result, no retry, closed admission.
- Receipt filesystem obstruction: real probe sequence completes, receipt creation fails, promotion never occurs.
- Owner loss after insert: remaining probe sequence stops; replacement ownership evidence is untouched.
- Disabled trigger registrations and I-AM/publication files: preserved through successful activation.
- Receipt tamper, changed owner or stopped ordinary listener: actual serving assertion rejects and closes admission.

Fixtures and fault injection are development/test-only. They do not add production registration/fault endpoints. Cleanup removes only disposable test roots after child processes stop; it is not stale-lock recovery.

## Initial failure and correction

The first focused run had **15 passed / one timeout**, plus one unhandled rejection. The denied health query exposed an existing production-handler defect: the `/queries` expression prepares a 200 response before awaiting authorization/query completion, and its catch then tries to write 400 headers. Node throws `ERR_HTTP_HEADERS_SENT`.

The initial private health listener passed the asynchronous handler directly to Node, which does not await listener promises. The approved R0 adapter requirement already covers this case: await the returned promise and fail closed on fatal rejection. The adapter was corrected to track and settle that promise and close a fatally rejected connection. The health request then fails and admission stays closed; no substitute success response is fabricated. The original handler source, successful admitted envelopes and authentication policy were not modified. This avoided an unrelated handler repair or public contract expansion. [Initial failure retained](evidence/ds0-wp2-r2/01-initial-focused.txt), [corrected focused run](evidence/ds0-wp2-r2/03-focused.txt).

The same containment applies to fatal handler rejection in the development admission adapter: it closes admission/transport rather than pretending a business result exists. This does not fix the original production service's error path. All subsequent R2/full test runs pass. Final review also tightened owner-run receipt binding, complete private-promise settlement, separate private bearer capability and live-listener readiness, with fresh strict/build/full-suite evidence retained for those revisions.

## Preservation

The [entry snapshot](evidence/ds0-wp2-r2/before.json) records the clean accepted R1 checkout. All **78 original Data Services files** preserve their original content: **76 whole-file hashes unchanged**, and exact original-byte prefixes verified for the appended index/README. All original package manifests and locks are included. The eleven R1 files were independently matched before R2 edits, and only their two documented append-only surfaces changed.

All **134 prior evidence checks** match: 89 earlier artifacts, 16 committed STAB-4 artifacts and 29 R1 report/evidence artifacts. The accepted R0 document also matches its recorded SHA-256. B1–B4 scoped closures, accepted R1 source/test evidence, original state/journal algorithms and all historical reports remain intact. No staged changes were found. The new R2 report and its evidence are separate from those protected records.

## Outstanding limitations and R3 dependencies

| Issue | R2 disposition / next authorization needed |
| --- | --- |
| Existing journal, pending/recovery state or orphan temporary file | Always blocked. No reconciliation or resume. R3 must independently establish every approved before/next invariant and preserve ambiguous evidence; checksum equality alone will not suffice. |
| Stale owner/state lock after crash | Always blocked. No expiry, PID-based stealing or force-unlock. Operator reclamation needs separate approved policy; R3 authorization alone must not imply it. |
| Failure availability | R2 conservatively retains ownership after any failed startup, including some clean preflight failures. There is no automatic retry/release-on-failure workflow. |
| Non-atomic persistence/durability | ORM multi-file commits and existing state journal algorithm remain unchanged. File flush/readback is not power-loss/parent-directory durability certification. No cross-file atomicity, fencing or arbitrary-reader cache consistency claim. |
| Shared/direct writers | Only the approved cooperative topology is supported. The owner cannot protect callers that bypass the host or lie about exclusive synthetic ownership. |
| Production handler query-error defect | Newly reproduced limitation; contained in the development adapter, not fixed in production. A source/error-envelope repair requires separate scope approval. |
| Applied validation maintenance | R2's private read-only validator copies accepted R1 invariants to keep pre-admission validation separate from serving readiness. Future changes must preserve parity or separately approve extracting a shared contract; R1 was not refactored here. |
| Production identity/auth/hosting | The composition and fixtures are development-only. Existing request actor-binding/audit limitations remain. No production deployment or user-data certification. |
| Legacy stores/external deployments | No activation or migration; external machines/deployments remain unverified. |
| Two applied-state authorities / trigger publication bridge | UI Platform migration state stays separate; no published-trigger activation or authority integration. |
| Scoped writes and unsupported operations | Accepted STAB-3 containment remains; full record-scope evaluation and restore remain separate work. |
| Windows watcher and other known limits | Original EPERM watcher issue remains open and unrelated to activation. The production build still reports the known large-chunk warning. Selected passing watcher tests do not close the original issue. |
| Original DS0 plan/WP1 criteria | Still not recovered; this remains the separately approved bounded increment. |

**G3 recommendation:** accept R2 only for the documented development-checkout scope and limitations. R2 is uncommitted pending explicit user review. Do not begin R3/R4, commit R2, migrate data, push, release or deploy without further authorization.
