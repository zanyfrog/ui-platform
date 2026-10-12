# Trigger + Workflow V1

V1 adds Platform-wide, source-authoritative Trigger and Workflow artifacts. Neither is a Visual Artifact. The accepted Visual Artifact and Form packages remain the UI and Form architecture; this package adds an explicit Workflow event action to that runtime.

## Reuse review and boundaries

The implementation inspected the existing Data Services `TriggerRegistry`, protected `SecuredDatasetOperationEngine`, legacy `DatasetOperationManager`, service interpreter, Trigger Manager/versioned definitions, I-AM evaluator/security planner, applied-resource registry, and the Platform source/editor and Dataset transport paths.

The protected engine owns writes, nested transactions, authorization, commit, rollback and lifecycle dispatch. The existing registry gains a trusted source-provider seam and deterministic priority ordering. `AutomationRuntime` adapts validated source actions to registry handlers and protected DOE capabilities; it never accesses ORM rows directly or owns a Trigger transaction. No source definition is copied to a shadow database. Existing publication/delegation/service-program infrastructure remains present and is not exposed as a new V1 authoring model.

No separately callable single-record Workflow interpreter was found in the current Platform, UI Base or Data Services source trees. The existing `executeServiceProgram` interprets verified delegated DOE service programs with conditions/arithmetic and a different publication/authority contract. Those extra capabilities remain dormant. V1 adds a short sequential Workflow coordinator using protected DOE and approved registered services, without replacing that interpreter or adding a database-operation engine.

The legacy `DatasetOperationManager` continues to serve its existing contracts. V1 integration targets the real host-facing protected engine used by the accepted Form/Data reference; it does not open a legacy authorization bypass.

## Source representation and CRUD

Definitions live in `triggers/<name>/trigger.json` and `workflows/<name>/workflow.json`. `schemaVersion: 1`, `kind`, and permanent `id` identify a definition. They contain display name, description, enabled state, application/Dataset identity, primary key and ordered actions. Triggers additionally declare the verified physical Dataset key, phase and optional finite numeric priority. Platform-wide ownership does not confer cross-application execution authority: a Workflow must target the trusted caller's application, and protected DOE resolves every Dataset ID.

`AutomationStore` reads disk on every request. It validates definitions, checks duplicate permanent identities, rejects unsupported properties/action types and unsafe binding paths, confines locators, rejects symlinks, and writes through the existing atomic-text helper. Saves/deletes require the exact source hash. Editor saves cannot change permanent identity or artifact kind. External edits are authoritative; the editor polls, reloads clean copies and retains dirty copies as conflicts. Recovery download is available. Invalid enabled source fails runtime activation closed; invalid or unconfigured disabled source remains manageable without activating it.

The development management entry point is **Manage Triggers and Workflows**. It provides create/list/open/save/delete, name/display name, application and Dataset identity, enabled, Trigger phase/priority, action scope, and ordered action add/remove/move controls. Advanced action settings use JSON. It uses the existing trusted development session and a specific system-scoped `ui.platform.automation.admin` permission. The seed adds that permission to the established Platform Manager set; it does not grant that role to ordinary application administrators. Production identity/management composition remains deferred.

Delete checks inspect other automation source, known application Pages/Components and repository reference Pages for permanent identity references. They block known uses and do not rewrite dependents. Dataset/service IDs are derived dependencies plus optional explicit permanent dependency IDs; global service/Dataset deletion is not introduced here.

## Trigger execution

Supported phases are `beforeInsert`, `afterInsert`, `beforeUpdate`, `afterUpdate`, `beforeDelete`, `afterDelete`, and `afterCommit`. Lower numeric priority runs first; permanent Trigger ID breaks ties using stable string ordering. Filesystem enumeration never controls execution order. Disabled definitions remain editable and do not execute.

An operation supplies arrays. Inserts supply new records; updates supply old/new records and per-record changed-field lists; deletes supply old records with empty new-record arrays. Old/result fields are separately READ-authorized, while caller-provided pending writes remain available as authorized operation input. Full internal ORM snapshots remain inside DOE. The context includes operation/root IDs, Dataset ID, lifecycle phase, inherited actor/source, affected IDs and the execution chain. Before-update input includes READ-authorized unchanged fields so services can inspect the record, while final write-field authorization still evaluates only requested/changed fields.

`each` is the default action scope. Actions execute in definition order; an each action is invoked once per affected record, in record order. It receives record/oldRecord/newRecord and its changed-field list. A batch action runs once and receives `context.newRecords`, `context.oldRecords`, corresponding changed-field arrays and IDs. Batch bindings do not implicitly select the first record.

The catalog is deliberately small:

| Action | Behavior |
| --- | --- |
| `set` | Each-scoped pending insert/update field assignment, with optional missing-value default. Primary keys cannot be set. |
| `reject` | Fail with a bounded action diagnostic; pre-commit failure rolls back. |
| `crud` | Protected DOE insert/update/delete, or protected read with explicit query settings. |
| `service` | Call a server-registered service identity. Before commit, the service must be explicitly classified transactional. |

Registered synchronous services may return explicit per-record `patches` before insert/update. These patches enter the same final Dataset validation and object/field authorization as `set` changes. After-phase record changes require normal DOE CRUD; patches after persistence are rejected.

No conditions, expressions, arbitrary code, field-change-specific events or browser service registration are introduced. Domain conditional logic belongs in an approved service.

## Transactions, downstream operations and failure

Before handlers execute before ORM staging; after handlers execute after staging while the transaction remains active. Any failure in a before/after handler or joined downstream write poisons the root transaction, including an ignored child failure. Bulk writes have no per-record partial-success mode. Existing nested concurrency restrictions, unsupported operations, scope enforcement and authority checks remain intact.

Trigger CRUD re-enters the existing protected engine. Applicable downstream before/after phases execute normally, with one shared transaction and a single root commit. Successful staged operations that have afterCommit handlers register their work with the root; the still-active read context is checked when collecting work, and dispatch keeps its normal context checks. Collection order follows successful operation completion, giving deterministic depth-first downstream-before-parent delivery. Rollback discards the collection.

After the root commit succeeds, collected callbacks execute sequentially. Failure in one operation's callback is recorded and does not prevent the remaining collected operation callbacks from being attempted. Each individual Trigger execution stops at its first failed action. There is no queue, worker, retry, replay or compensation.

DOE preserves `success: false, committed: true, commitOutcome: committed` for a post-commit failure and retains committed counts. Underlying bounded diagnostics are preserved. The Platform proxy adds separate `data` and `afterCommit` outcomes and `repeatWriteMayDuplicate: true`, with an explicit message that repeating the write may duplicate data. It never retries. A failure during the storage commit retains the accepted `unknown` outcome; no rollback/restoration claim is added.

The existing JSON adapter stages changes and supports pre-commit rollback, including cross-Dataset action failure. It does not provide crash-safe multi-file commits, cross-process isolation, writer fencing or atomic recovery from a mid-commit storage failure. Those limitations are unchanged.

The existing depth guard remains, and a propagated Trigger-ID chain detects re-entry. Unsafe recursion fails clearly with `TRIGGER_CYCLE_DETECTED` or `RECURSION_LIMIT_EXCEEDED`. Audits include the chain. Post-commit descendants use new transactions with retained lineage; they cannot undo the already committed parent.

## Workflow execution and visual invocation

A Workflow accepts exactly one scalar primary-record ID, loads that record through protected DOE, and executes CRUD/service actions sequentially. It refreshes the protected primary-record view before subsequent actions so services see preceding changes. There is no batch Workflow, nested Workflow action, parallelism, branching or scripting.

Each CRUD retains DOE's existing transaction boundary. A Workflow is not one transaction wrapping external services. Failure stops later actions and returns success, workflowId, primaryRecordId, executionId, completedSteps, failedStep/error and the number of confirmed committed DOE calls. Already completed external actions and earlier commits remain completed. A direct CRUD post-commit failure is explicitly identified as committed, with duplicate-write caution.

Visual metadata uses:

```json
{ "kind": "workflow", "workflowId": "wfl_person_activation_v1", "primaryRecordId": "event.detail.result.id", "resultState": "result" }
```

The permanent Workflow ID is a typed external dependency. The shared `workflow.run` service adapter sends only Workflow ID and record ID through the existing application-data proxy to the authenticated protected host. The browser sends no actor, grants, credentials, source definition or execution authority. `resultState` must be declared local state. The reference invokes the same Workflow from Form `recordCreated` success and from a Page button. It embeds no Workflow definition in the Page or Form.

Automation value bindings are explicit JSON: `{literal: ...}`, `{from: record|oldRecord|newRecord|context, path: [...]}`, or a bounded `{fields: {...bindings}}` object constructor. They provide no interpolation, operators or executable code. No second UI expression system was added: Visual Artifacts retain their accepted binding evaluator.

## Audit and approved services

The bounded log retains the latest 500 diagnostic entries in process memory. Entries contain execution/artifact/Dataset IDs, phase/operation, affected IDs, action ID/scope/priority, completed/failed step, actor ID reference, timestamp, success/error and bounded chain. Reject diagnostics contain the configured short reason. Routine records omit full record payloads. Invalid record-ID invocations are not copied into audit as arbitrary payloads. The reference development launcher prints each diagnostic once. Logs are not durable history, a retry dashboard or an execution database.

Service registration is a trusted host composition map, with no HTTP registration route. Credentials belong to host-owned configuration, never source definitions. External side effects must be registered nontransactional and run only afterCommit or in Workflow steps. Domain services are responsible for truthful transactional classification. V1 neither adds nor exercises delegated execution authority; existing verified delegation paths remain protected and regression-tested. A legacy temporary delegated lease is not extended by this package; an executing post-commit callback with an expired lease fails closed.

## Reference and verification

Run `npm run dev:automation-reference`, open `http://127.0.0.1:5191`, sign in as the existing development application admin, and register a Person. The existing Form persists it, the beforeInsert Trigger defaults status, afterCommit records a deterministic notification, then Form success invokes PersonActivation. The Workflow updates status, calls the deterministic reference service, and inserts an activation-history row; the afterUpdate Trigger also inserts an update-history row through DOE. The Page button invokes the same Workflow again and displays its result.

To keep the development reference small, history entries use the same existing Person Dataset with history-specific values. Cross-Dataset nesting/rollback is separately proved with People and History Datasets in the real planner/ORM automated fixture. The production email/integration boundary is represented by `reference.notification`; no email is sent.

The same launcher exposes `/manage.html` for the source editor. Select `security@example.local` in the existing development identity selector, then open management. The ordinary Platform development shell also exposes the management entry point.

The reference explicitly assigns Platform Manager to the existing security-admin identity for management UI tests, and retains the application-admin identity for Dataset operations. This avoids conflating the current UI resource resolver with the separate applied-Dataset owner resolver. A merged production resource-authority host is deferred; no fake resource, grant bypass or new authentication infrastructure is introduced.

`npm run test:automation` covers focused protected DOE tests and real Edge browser references. The verification report records full Platform/Data Services regression results, build/type checks and production exclusion. The accompanying inventory includes both repositories.

Both the reference launcher and automation test command rebuild the sibling Dataset Operations package first, so the protected host uses the reviewed lifecycle integration rather than stale compiled output. They assume the accepted sibling dependency installation/build baseline.

## Deferred scope

No Workflow graphs, condition languages, nesting, batch Workflows, timers, approvals, compensation, retry/queue/replay, arbitrary JavaScript, production identity, publication/versioning UI, application-scoped automation, promotion, deployment or broad Builder completion is added. Existing Forms are not migrated. Source authoring is development-session protected; production composition and durable audit remain future work.
