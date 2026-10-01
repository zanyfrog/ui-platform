# WP0 proposed definition files and authoring contract

**WP0 approved format contract, not an implemented format.** See [approved decisions](../iam-wp0-contract-reconciliation.md). All example identities are synthetic. Existing artifacts keep their formats; new security definitions register new artifact types through the existing ArtifactDefinition mechanism.

## File layout

Use strict UTF-8 JSON, two-space indentation, LF and one terminal newline. No JSONC/YAML executable extensions, anchors or custom tags. Reject duplicate object keys, unknown fields, non-finite numbers, unsupported format versions and path escapes. Normalize optional defaults explicitly and sort unordered ID collections; preserve semantically ordered data such as delegation chains. Canonical digest excludes formatting, uses a versioned canonical JSON algorithm, and is distinct from the current ArtifactService raw-content checksum. Neither checksum grants authority.

Suggested application source layout (folder names may change without changing identity):

```text
<application>/security/
  application/artifact.json + definition.json
  roles/treasurer/artifact.json + definition.json
  groups/finance-committee/artifact.json + definition.json
  permission-sets/event-editor/artifact.json + definition.json
  permissions/<permission-id>/artifact.json + definition.json
  service-requirements/<requirement-id>/artifact.json + definition.json

<protected-deployment-security>/<application-id>/
  assignments/<assignment-id>/artifact.json + definition.json
  memberships/<membership-id>/artifact.json + definition.json
  service-assignments/<assignment-id>/artifact.json + definition.json
  service-approvals/<approval-id>/artifact.json + definition.json
```

Protected platform roots contain grant boundaries and capability catalogs; application administrators cannot acquire ownership by copying them into an application folder. Real Service principals and credentials are platform-managed operational records, even when scoped to one Application. Application-owned Service requirements may live in the application security source and still require a Security Administrator to provision a real Service. Reusable Roles/Sets live in their declared owning application, platform root or approved shared package. Application-owned Roles are reusable across assignments in that application; cross-application reuse requires the controlled shared/platform mechanism. The `owner.kind` value is `platform`, `application` or `shared-package`; `system` is reserved for principal type, not definition ownership. The registry verifies ownership independently of file contents.

The Artifact manifest remains its existing shape. Example:

```json
{
  "schemaVersion": 1,
  "artifactId": "ps-event-editor",
  "artifactType": "security.permission-set",
  "name": "event-editor",
  "definitionVersion": 1,
  "files": { "definition": "definition.json" }
}
```

`definitionVersion` is the artifact type's grammar version, not the policy revision. `formatVersion` versions the security document grammar. Content publication revision/digest, used-ever metadata, audit records, protection flags, session status and active-policy pointers are authority-managed and cannot be supplied or overridden by definition files. `artifactId` equals `definition.id`; names/keys are editable aliases. Existing owner Dataset/Field/Trigger IDs remain in their owning definitions, not duplicated as new security artifacts.

Permission Set definition:

```json
{
  "format": "ui-platform.security",
  "formatVersion": 1,
  "definition": {
    "kind": "permission-set",
    "id": "ps-event-editor",
    "key": "event-editor",
    "name": "Event Editor",
    "status": "active",
    "owner": { "kind": "application", "applicationId": "app-troop-883" },
    "includes": [{ "id": "ps-event-viewer" }],
    "rules": [{
      "id": "rule-event-edit",
      "permissionId": "cap-dataset-records-edit",
      "effect": "allow",
      "scope": {
        "resource": {
          "authorityId": "platform-resources",
          "applicationId": "app-troop-883",
          "kind": "dataset",
          "id": "dataset-events"
        },
        "descendants": true
      },
      "where": {
        "op": "eq",
        "left": { "kind": "field", "fieldId": "field-event-owner" },
        "right": { "kind": "fact", "factId": "actor.userId" }
      }
    }]
  }
}
```

The Dataset registry must already own these Dataset/Field IDs. `actor.userId` is a registered fact, absent for Services/Systems; a missing fact makes this rule unevaluable and the decision denies. No Person ID substitution. To allow service-owned records, define a separate explicit rule with appropriate facts. `where` syntax is a proposed declarative interchange AST, not a new executable language. WP4 will qualify a shared implementation or a restricted adapter to ORM operators. ORM lacks NOT; if a deny predicate cannot compile safely, DOE needs trusted evaluation before projection/pagination or must reject it, never drop the deny.

Companion Role, membership and assignment shapes (each is the `definition` member of the same document envelope):

```json
{
  "kind": "role",
  "id": "role-event-manager",
  "key": "event-manager",
  "name": "Event Manager",
  "status": "active",
  "owner": { "kind": "application", "applicationId": "app-troop-883" },
  "permissionSets": [{ "id": "ps-event-editor" }]
}
```

```json
{
  "kind": "role-assignment",
  "id": "assignment-mary-events",
  "status": "active",
  "userId": "user-mary",
  "roleId": "role-event-manager",
  "scope": {
    "resource": {
      "authorityId": "platform-resources",
      "applicationId": "app-troop-883",
      "kind": "application",
      "id": "app-troop-883"
    },
    "descendants": true
  },
  "startsAt": "2026-01-01T00:00:00Z",
  "endsAt": null
}
```

```json
{
  "kind": "group-membership",
  "id": "membership-mary-finance",
  "applicationId": "app-troop-883",
  "userId": "user-mary",
  "groupId": "group-finance",
  "status": "active",
  "startsAt": null,
  "endsAt": null
}
```

| Artifact type | Definition shape (see [TypeScript](contracts.proposed.ts)) | Additional invariants |
| --- | --- | --- |
| `security.permission` | PermissionDefinition | Catalog-owner managed; deprecated/retired lifecycle, no ordinary active/inactive switch. |
| `security.permission-set` | PermissionSet | Cycle-free includes; all refs resolved; same application or explicitly approved shared package; every path retained. |
| `security.role` | Role | Sets only; no Role inheritance or Group links. |
| `security.group` | Group | Application owner required; sets only; membership records contain Users only. |
| `security.role-assignment` | RoleAssignment | User+Role+scope+dates; no overlapping duplicates. |
| `security.group-membership` | GroupMembership | User and Group application match; nullable start/end normalized; no Group nesting. |
| `security.service-requirement` | ServiceRequirement | Application-owned portable desired configuration; target approval/provisioning creates a new real Service identity. |
| `security.service-assignment` | ServiceAssignment | Service+set+scope+dates; no organizational Role/Group. |
| `security.service-use-approval` | ServiceUseApproval | Security-admin controlled execution capability, executable digest and permission ceiling; never granted by Trigger editing. |
| `security.grant-boundary` | GrantBoundary | Protected authority only; application files cannot self-certify protection/ownership. |
| `security.application` | ApplicationSecurity | Approved shared imports and administrator continuity capability; no switch to disable default deny. |

## Blueprint security slice

Blueprint's own `BlueprintManifest` contains a deterministic I-AM security section and references included application-owned definition bundles. Blueprint owns the file layout, serialization and import/export orchestration; I-AM supplies the security-section shape and validates proposed changes through the normal owner service. This proposed section does not claim that a full Blueprint importer exists today. Example security section (abbreviated; IDs are synthetic):

```json
{
  "formatVersion": 1,
  "sourceApplicationId": "app-troop-883",
  "definitions": [
    {
      "kind": "role",
      "id": "role-event-manager",
      "key": "event-manager",
      "name": "Event Manager",
      "status": "active",
      "owner": { "kind": "application", "applicationId": "app-troop-883" },
      "permissionSets": [{ "id": "ps-event-editor" }]
    }
  ],
  "platformDependencies": [
    {
      "id": "cap-dataset-records-edit",
      "kind": "permission",
      "revision": "rev-7",
      "digest": "sha256:example"
    }
  ],
  "sharedPackageDependencies": [],
  "serviceRequirements": []
}
```

The containing Blueprint manifest binds this section and its definition files by digest. `definitions` is the complete portable application-owned closure, including any referenced app-owned Permission Sets, Groups, Dataset/Field rules and custom capability definitions; the small example is illustrative only. Platform/shared definitions remain pinned references. A Service need becomes `serviceRequirements` without a Service principal, credential, assignment or approval. Blueprint rejects an incomplete dependency closure and records a reviewed source→target ID map for Application, resource and security definition references. Imported `status:"active"` describes the source definition's desired state; it does not activate the target policy. The target's authenticated security authority performs later activation.

Portable Blueprint export normally excludes Users, Person links, memberships, Role/Service assignments, Service principals and credentials, Service-use approvals, grant boundaries, security sessions/MFA state, active policy pointers, audit history and protected platform definition bodies. It also excludes application records and secrets from this I-AM slice. A same-installation backup/restore or explicit mapped migration may carry operational assignments under its own controlled workflow; it is not a portable Blueprint import. Export/import uses the same definition parser and validator as other authoring paths; it adds portability closure, ownership, dependency and target-binding validation. No Blueprint package can assert a target grant ceiling or choose its own Security Administrator. The exported application declares `@ui-platform/i-am` as a package dependency; the normal package/export mechanism resolves it rather than copying it as application-owned source.

System principals/profiles, User provisioning, provider bindings, Person links, security sessions and credentials are managed operational records, not ordinary portable application definitions. The platform-level trusted I-AM recovery capability and deployment-designated operators are also controlled operational configuration, not Application Roles/Groups or auto-seeded administrators. Recovery requires strong authentication and mandatory durable audit. Platform-managed User→Role and User→Group assignment records are application-scoped operational state. These records use the same authenticated mutation/validation/audit boundary, but do not become public application source files. Assignment files contain IDs only; environments keep them in an access-controlled security workspace. Portable packages omit environment-specific assignments and may supply an explicit reviewed binding plan. No passwords, tokens or personal profile exports are proposed.

Trigger/Workflow next-version configuration adds:

```json
{
  "executionIdentity": {
    "mode": "service",
    "serviceId": "service-expense-approval",
    "approvalId": "approval-expense-trigger-v3",
    "executionCapabilityId": "cap-execute-expense-approval"
  }
}
```

Ordinary execution uses `{ "mode": "inherit" }`. This is an addition to each owner's future format, not a patch to current trigger formats. The Service-use approval is a separate security document bound to the canonical executable digest and resource; its scope cannot be changed by editing this selection. Source artifact, published version and runtime registration identity are explicitly linked before activation.

## One authoritative pipeline

1. **Capture candidate.** UI, CLI, API and watcher provide immutable file snapshots, content checksum, expected policy revision and changeset identity. A watcher detects changes and reports them; it cannot infer an actor from an OS file owner, email, filename or commit author.
2. **Parse/normalize.** Same strict parser, canonical defaults and version dispatch for every route. Unknown schema or duplicate IDs produce precise diagnostics; no partial interpretation.
3. **Validate structure and references.** Resolve Users/resources/sets from one revision; validate parentage, dates, lifecycle, DAG, duplicate intervals, Person-link uniqueness and shared import pins. All files in a changeset are validated together, so new mutually referenced objects can be added atomically.
4. **Security validation.** Authenticate the submitting/activating context, check application boundary, management capability, grant ceiling, transitive changes, protected definitions, Service approvals, and last-admin continuity. Validation diagnostics/reference exploration also require read/discover authority to avoid catalog leakage.
5. **Stage/save.** Persist candidate and diagnostics. Invalid or incomplete draft bytes may remain editable, matching ArtifactService behavior; `saved` never means `active`. A rejection leaves the prior active policy revision intact. UI should show both draft status and active revision.
6. **Activate.** An authenticated UI action, CLI command or API request supplies candidate checksum, expected active revision and idempotency key. Repeat security/reference checks inside the serialized transaction; stale sessions, changed files or changed policy produce conflicts/denials. Commit active snapshot plus audit/outbox and revision atomically. Required audit failure prevents activation. Return `unknown` if outcome cannot be established and resolve using the change ID.
7. **Reconcile/report.** Repeated watcher notifications are idempotent. Watch polling catches missed native events. Renames preserve IDs. File removal is a proposed change, never automatic permission removal or hard deletion; used objects require explicit archive/deactivation. A syntax error or temporarily missing reference never invalidates the last accepted snapshot by accident. Security revocation uses an authorized activation, not waiting for filesystem polling.

Proposed CLI additions (not available today): `uib security validate`, `stage`, `reconcile`, `diff`, `activate`, `explain`, `archive`, with machine-readable diagnostics and the same service calls as UI/API. Existing `uib artifact save/watch` remains a draft tool; it must not be described as security activation. Remote credentials are obtained through the central authentication boundary; an arbitrary `--actor` flag cannot authenticate.

Automatic activation is excluded by the approved D1 default. A later explicitly configured automation could submit under a narrow Service identity and undergo the identical checks. It must report that Service as the submitting actor, preserve detected source metadata separately and never attribute an unverified human author. This is the D1 gate choice.

## Persistence and history

Human-editable definitions remain complete and exportable. Active snapshots/indexes are derived operational representations with source digests and revision references, not an opaque UI-only source. Rebuilding them from source still requires authenticated validation/activation; copying a cache or swapping an active-pointer file cannot authorize a change.

Use immutable version history and canonical integrity conventions from the definition registry where compatible, with a separate transactional activation authority. Keep draft working files outside evaluator read paths. Failed changes preserve active policy; corrupt/unresolvable *active* policy fails closed. Retained historical definitions and resource tombstones support explanations at a prior revision; they never resurrect current access. Rollback is a new authorized revision evaluated under current safety rules, not raw pointer reversal.

WP1 must supply JSON Schemas, registries, parser diagnostics and golden round-trip fixtures for every proposed artifact type. This WP0 package supplies proposed shapes/examples and acceptance requirements only; it does not register formats or change any loaders.
