# WP0 acceptance matrix for WP1–9

**All rows are planned and NOT RUN unless a later acceptance record explicitly supplies evidence.** WP0 source inspection and proposal compilation do not satisfy these tests. Each milestone stops for review; completion of one does not authorize the next. See [WP0 decisions](../iam-wp0-contract-reconciliation.md).

Blueprint is a separate product capability. WP1 establishes the portability contract and prevents existing export paths from leaking new security state; it does not require building a full Blueprint importer/exporter. The Blueprint integration cases under WP8 apply before that capability is enabled or accepted. If Blueprint is still absent, record those cases as deferred and keep the import/export security path unavailable.

Future evidence per row: exact source revision, test/fixture path and case name, strict consumer compilation result, command and exit code, expected/actual behavior, durable-state/audit observations, and limitations. Integration negatives must check persisted state through an independent reader, not only a returned error. No asserted pass count is provided here.

## IAM-0 traceability

| Gap | Primary closure | Dependent proof / scope retained |
| --- | --- | --- |
| IAM-01 layer separation | WP5, WP9 | Preserve existing correct division; trusted internal persistence remains explicit. |
| IAM-02 User/Person | WP1, WP7 | Unique Person linkage, provisioning and authenticated binding. |
| IAM-03 graph model | WP1, WP2 | No direct User sets; migration required; older proposed direct assignments superseded. |
| IAM-04 Service/System identity | WP6, WP7 | Explicit grants retained; identity/context cannot be forged. |
| IAM-05 composition/deny/time | WP1, WP2 | Architecture now decides deny precedence; proposed precise semantics await WP0 approval. |
| IAM-06 scoped writes | WP4, WP5 | Keep current containment until old/new/bulk/transaction checks pass. |
| IAM-07 field/row correlation | WP2, WP4, WP5 | Order-independent predicate composition; malformed scopes fail closed. |
| IAM-08 query enforcement | WP4, WP5 | Empty selection and inference protections, server entry points. |
| IAM-09 write payload | WP5, WP6 | Defaults/trigger mutations reauthorized; filter mode incompatible. |
| IAM-10 revisions/expiry | WP2, WP7 | WP2 revision foundations; independent-process invalidation at WP7. |
| IAM-11 editor identity | WP7, WP8 | Preserve development gates and drain/CSRF; production adapter. |
| IAM-12 administration | WP3, WP7 | Grant ceilings, reserved policy datasets, secured ingress. |
| IAM-13 audit | WP3, WP6, WP9 | Durable security/operation correlation, failure and integrity tests. |
| IAM-14 policy authority | WP2, WP7 | One deployment authority; no divergent standalone/embedded stores. |
| IAM-15 cross-resource integration | WP1, WP4, WP5, WP8 | Shared files/save rules, resource ownership, authenticated services. |
| IAM-16 restore/export | WP4, WP5, WP9 | Preserve unsupported restore; export cannot be certified solely from type vocabulary. |
| IAM-17 identity/classification | WP1, WP4 | Use owner IDs; classification is not implicitly a permission. |

## WP1 — identity and definitions

| ID | Scenario and expected outcome | Evidence boundary |
| --- | --- | --- |
| W1-01 | User exists without Person; multiple application Person links to one User succeed; second User for same Person fails atomically. Person cannot receive an assignment. | Identity repository + shared service. |
| W1-02 | User receives sets only through Role/Group; Service only through Service Assignment; Role/Group nesting and cross-app Group membership fail. | Schema + semantic validation; every authoring channel. |
| W1-03 | Direct and indirect set cycles reject; diamond includes succeed; unresolved and unauthorized cross-app references reject; pinned approved shared reference succeeds. | Graph/change-set validation. |
| W1-04 | Start inclusive/end exclusive; null end indefinite; future assignment inactive until start; invalid dates/end<=start reject. Adjacent intervals allowed; overlapping duplicates rejected under concurrent writers. | Trusted clock + transaction tests. |
| W1-05 | Rename retains ID; replacing ID fails; used definition archive retains history; never-used draft deletion permitted; used status cannot be reset in files. | Owner metadata, lifecycle and history. |
| W1-06 | Equivalent UI/API/CLI/text changes yield identical normalized definitions, diagnostics and checksums. Invalid draft remains editable without active-policy changes. | Real adapters, not shared-parser unit test alone. |
| W1-07 | Missed/duplicate watcher events, partial writes, rename, removal, unknown author and changed checksum cannot activate policy; authenticated explicit reconcile/activate succeeds. | Watcher + service + file inventories. |
| W1-08 | Strict JSON round-trip for every format; unknown/duplicate keys, version, path escapes and mismatched artifact/document ID rejected. | Golden schemas/fixtures + containment. |
| W1-09 | Dry-run legacy import preserves hashes and deterministic mapping, quarantines ambiguous grants, and does not create credentials or active unknown principals. | Migration adapter + old/new consumers strict-compiled. |
| W1-10 | Concurrent activation/CAS permits one revision; crash/retry/idempotency cannot split active policy and required audit intent; invalid candidate leaves active state intact. | Qualified persistence boundary; file-only prototype limitations explicit. |
| W1-11 | Ownership/portability metadata distinguishes application definitions from platform identities and application-scoped operational assignments. Existing broad application exporter refuses unsafe security content until a security allowlist exists; package dependency metadata uses normal `@ui-platform/i-am` resolution. | Definition/export boundary contract and secret/assignment negative fixtures. |

Gate: stable definition model, common authoring rules, compatibility evidence. Before WP3 safety exists, WP1 tooling is confined to isolated trusted development; it is not production security administration.

## WP2 — evaluator

| ID | Scenario and expected outcome | Evidence boundary |
| --- | --- | --- |
| W2-01 | No matching allow denies; explicit deny overrides allows from any Role/Group/set; broad Dataset allow cannot erase field deny. | Pure evaluator with permutation cases. |
| W2-02 | Diamond paths deduplicate effective capability but retain every provenance path and deny reason. Explanation access is separately checked/redacted. | Graph + explain API. |
| W2-03 | Disabled User, Service, set, Role, Group or assignment removes effective access while preserving stored history; dates use current trusted time. | All dependency paths, not only direct assignment. |
| W2-04 | Application scope descends only for supported capability kinds; Dataset scope does not grant sibling/app/system rights; shared packages do not cross application authority. | Resource hierarchy fixtures. |
| W2-05 | Grants allowing different fields on different rows cannot create cross-product access; result independent of stored grant order. Conditional deny subtracts only matching rows/fields. | Truth-table oracle over a small synthetic dataset. |
| W2-06 | Malformed/unknown policy, missing fact, invalid resource, unavailable store and corrupt snapshot deny; empty canAny denies; can reports conditional access accurately. | Fault injection; no partial-policy allow. |
| W2-07 | Decision binds resource/action/fields/actor/request digest, revisions and expiry. Reuse for different request fails; TTL alone cannot authorize. | Decision adapter + revision authority. |

Gate: deterministic independent decisions and provenance. Dataset enforcement and cross-process session guarantees remain later gates.

## WP3 — security administration

| ID | Scenario and expected outcome | Evidence boundary |
| --- | --- | --- |
| W3-01 | Application Admin cannot manage security by default; Security Admin can grant inside ceiling without possessing business-use rights. Cross-app/system grants fail. | Authenticated admin APIs/UI/CLI/file activation. |
| W3-02 | Direct/self/indirect escalation via included set edits, Role changes, Group membership, reactivation, date changes, DENY removal or boundary edits fails. | Transitive pre/post graph comparison. |
| W3-03 | Last-admin disable/removal/archive/expiry change fails; replacement before removal succeeds; concurrent admins cannot each remove the other; future-only replacement insufficient. | Serialized mutations + timed continuity. |
| W3-04 | Protected/shared definitions cannot be overwritten through path/owner claims; raw policy datasets denied to ordinary DOE requests; internal I-AM repository still works. | Control-plane isolation integration. |
| W3-05 | Every security mutation has old/new, actor distinct from target, scope/time/revision; sensitive changes require configured reason. Required audit failure prevents activation. | Durable independent audit reader + failure injection. |
| W3-06 | Developer cannot create powerful Service, expand sets or approve its own executable; Security Admin can approve only inside ceiling. | Service administration and file/CLI equivalence. |
| W3-07 | Bootstrap/recovery requires a separate platform-level trusted I-AM recovery capability, deployment-designated operator, strong authentication and mandatory durable audit. Application Role/Group membership alone cannot invoke it; repeated startup never seeds/reasserts admin grants; recovery cannot erase history or leave invalid last-admin coverage. | Operational fixture, unauthorized-operator/weak-auth negatives, durable independent audit reader and replay. |
| W3-08 | Imported Blueprint roles/sets/groups or a copied owner field cannot grant target administration, alter protected platform/shared definitions or satisfy the last-admin anchor without target-authorized binding. | Target activation negatives across UI, CLI and text reconcile. |

Gate: identical protected administrative behavior on all channels, with explicit recovery responsibility.

## WP4 — resource and data-security plans

| ID | Scenario and expected outcome | Evidence boundary |
| --- | --- | --- |
| W4-01 | Dataset/Field rename preserves access IDs; same-name replacement gets no old access; retired IDs remain explainable; unapplied/stale schema binding rejects. | Real owner registry + applied resolver. |
| W4-02 | Application/namespace ambiguity fails resolution; field parent/foreign IDs reject; registry registration is owner-authorized, not policy-authored. | Identity adapter. |
| W4-03 | Read field deny omits property while allowed null remains null. Requested write to denied field rejects whole operation. | Decision-plan conformance harness; DOE proof at WP5. |
| W4-04 | Forbidden filter/sort/group/aggregate/join/computed/export dependencies reject, including hidden aliases and empty projection/cardinality inference. | Full query AST traversal + negative fixtures. |
| W4-05 | Expression compiler and reference evaluator agree on typed/null/missing facts, allow union/deny subtraction and mixed field predicates. Unsupported NOT/operator cannot become unrestricted. | Bounded synthetic truth tables; shared-engine choice recorded. |
| W4-06 | New fields follow explicit approved broad-scope semantics; field-specific denies remain; retired/deprecated capabilities and unknown classifications do not invent rights. | Schema evolution + permission catalog. |

Gate: versioned enforceable plans; unsupported query/expression capabilities explicitly deny. Group/aggregate support is not invented merely to test the denial contract.

## WP5 — DOE enforcement

| ID | Scenario and expected outcome | Evidence boundary |
| --- | --- | --- |
| W5-01 | Actual authenticated Caller→DOE→I-AM→ORM path permits authorized CRUD and denies unauthorized requests, including select=[] and malformed custom decisions. | Real composition/HTTP plus independent persistence reader. |
| W5-02 | Query row filtering precedes pagination/counts; row-correlated projections and inference protections hold. No disallowed property, row count or ordering leaks. | End-to-end data fixtures, not only mock I-AM. |
| W5-03 | Insert final row, update old+new row, delete old row scope enforced; ownership change, mixed authorized bulk and missing old snapshot reject atomically. | Transaction and fresh-reader/raw-byte proof. |
| W5-04 | Defaults and before-trigger changed fields require final authorization; conflicting allowed/denied plan rejects; legacy filter/partial-write options cannot bypass. | Final payload adapter tests. |
| W5-05 | Expired/stale/resource-mismatched plan, I-AM failure and unknown resource deny; no fallback evaluator or raw ORM path. | Failure injection in production composition. |
| W5-06 | Crafted Form/Page/direct HTTP input cannot change actor, policy, resource ID binding or enforcement options; non-data management APIs have their own guards. | Real ingress and resource services. |
| W5-07 | Existing nested rollback poisoning, joined transaction, confirmed/unknown commit reporting and afterCommit semantics remain true. Restore remains unsupported; export only enabled with its full contract. | Accepted STAB/R1–R4 compatibility suites + new security cases. |

Gate: protected application data may rely on DOE only within the accepted identity/deployment boundary. This does not waive WP7 production credential requirements.

## WP6 — delegated execution

| ID | Scenario and expected outcome | Evidence boundary |
| --- | --- | --- |
| W6-01 | Normal root User Trigger inherits User; nested User→Service→inherit retains Service executor and original User initiator. Service/System root jobs remain distinct. | Actual Trigger chain/OperationContext/audit. |
| W6-02 | Developer selects approved Service without receiving its permissions; foreign/stale/unapproved executable digest/capability denied. Editing source cannot reuse broader approval. | Authoring + runtime approval checks. |
| W6-03 | Service permission set AND execution ceiling apply; cross-app/revoked Service or approval rejects; no default impersonation or System bypass. | Runtime decision integration. |
| W6-04 | Mutating handler-visible actor/source/chain cannot change trusted context; nested operations still call DOE and reauthorize. | JavaScript runtime negative, not type-only test. |
| W6-05 | Unauthorized child poisons/rolls back pre-commit root even when handler ignores rejection; afterCommit child failure preserves truthful parent commit. Initiator/executor/approval/decision audit persists. | Real transaction, nested/async and audit tests. |
| W6-06 | Resumed Workflow/job reauthenticates/rechecks current grants, Service approval and executable binding; old queued context cannot resurrect revoked rights. | Job/runtime fixture; no claim generic runner already exists. |

Gate: delegated execution is safe only within accepted underlying enforcement/authentication boundaries.

## WP7 — authentication, sessions and immediate revocation

| ID | Scenario and expected outcome | Evidence boundary |
| --- | --- | --- |
| W7-01 | Invalid/expired/revoked/wrong-audience/issuer credentials, body actor substitution and fabricated Service/System fail. Provider subject binds uniquely to intended principal. | Actual host middleware and provider adapter. |
| W7-02 | User disable, set/membership/Role/Service revoke, policy deny and session revocation affect every new decision immediately after commit in two independent processes. | Separate readers/processes; no shared mock cache. |
| W7-03 | Partition/unavailable authority denies; activation revision race cannot produce stale new allow; assignment time boundary honored without waiting for TTL. | Fault/clock/concurrency tests. |
| W7-04 | Admitted operation behavior matches approved snapshot semantics; final-write checks/new child/resumed job decisions use current authority; completed commits not falsely undone. | Interleaving tests and audit timeline. |
| W7-05 | Development fixture/shared bearer cannot enable protected production routes; editor CSRF/origin/drain behavior preserved; required step-up blocks insufficient assurance. | Production-mode and editor regression suite. |
| W7-06 | Standalone evaluator and DOE point at same configured authority; wrong/unconfigured authority fails closed; credential rotation/revocation binds intended Service. | Real deployment composition. |

Gate: trusted production principal binding and revision consistency proven. Provider choice/local auth remains configurable, not a mandatory password database.

## WP8 — administration UX and diagnostics

| ID | Scenario and expected outcome | Evidence boundary |
| --- | --- | --- |
| W8-01 | Same edit via UI/CLI/text/API yields equivalent active policy and diagnostics; conflicts/invalid drafts/missing refs remain visible; no UI-only validation or approval rule. | Channel parity integration. |
| W8-02 | UI hides/disables unavailable actions/fields but crafted requests still denied; diagnostic/discovery/reference/SSE endpoints do not leak inaccessible resources. | Client and server tests. |
| W8-03 | Effective-access explorer shows all allow/deny paths and time/scope/lifecycle reasons; unauthorized explanation/audit access is denied/redacted. | Role-separated diagnostic fixtures. |
| W8-04 | Service selector lists only approved contexts, reports stale executable approval and never grants business access to developer. Text editing and CLI can do every equivalent operation. | UI + CLI + server. |
| W8-05 | Blueprint's security provider exports complete app-owned Role/Group/Permission Set/capability/Dataset/Field rules and Service requirements with pinned platform/shared references; excludes identities, assignments, actual Service principals/credentials, approvals, ceilings and active/audit state. | Blueprint manifest/archive inspection and restricted-file negatives. |
| W8-06 | Blueprint import remaps Application, Dataset, Field, artifact and app security IDs, stages drafts with zero effective access, and blocks missing/retired/incompatible dependencies, collisions and incomplete DENY closure. | Cross-environment dry run and independent target policy reader. |
| W8-07 | Blueprint owns orchestration; its I-AM provider reads and writes through the same owner service as UI/CLI/text. `@ui-platform/i-am` resolves through normal package export, with no copied application-owned engine source or independent policy store. | Provider/normal package export contract and source provenance. |
| W8-08 | Portable Blueprint excludes User assignments; separately authorized same-installation backup/restore or mapped migration may preserve them. Imported Service requirements remain unresolved until target Security Administrator provisions/approves a new Service and target executable binding. | Portable-export negative, backup/mapping cases and cross-environment Service execution negatives. |

Gate: security is operable without the UI; administration is not mistaken for new authority.

## WP9 — hardening and production record

| ID | Scenario and expected outcome | Evidence boundary |
| --- | --- | --- |
| W9-01 | Inventory every ingress and direct ORM import, privileged plugin/handler, migration/deployment/recovery path; each either enforces authority or has an approved bounded trusted exception. | Source/deployment review with owner and rationale. |
| W9-02 | Run adversarial escalation, mixed row/field inference, stale revisions, Service misuse and cross-app cases across real interfaces. | Negative integration suite, defects recorded. |
| W9-03 | Tampered audit/history, sink outage before/after commit, retention/access controls and recovery preserve truthful outcomes and required durable evidence. | Failure injection + independent readers. |
| W9-04 | Load/revocation tests establish latency and graph-size budgets without stale-authority fallback or silently truncated evaluation. | Measured workloads, limits and deployment-specific thresholds approved before run. |
| W9-05 | Migration dry run/cutover/recovery and supported legacy/v2 consumer pairs pass; package locks/history/raw bytes preserved where promised. | Fresh compatibility/build/strict compile/regression evidence. |
| W9-06 | Production acceptance names protected resources, excluded paths, outstanding defects, exact test counts, known limitations, trusted exceptions, deployment/migration and recovery requirements. | Signed/reviewed acceptance record; no automatic production declaration. |
| W9-07 | Portable application export and Blueprint export have distinct recognizable formats; import rejects generic ZIP as security-approved Blueprint and fails on tampered dependency pins or leaked restricted files. | Archive tamper, format-confusion and deployment export/import tests. |

Gate: formal scoped production acceptance. Historical G5 counts remain historical; no previous test number is relabeled as an I-AM production result.
