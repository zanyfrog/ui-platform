# Local Audience Pilot — Read-Only Identity, Capability and Port Inventory

2026-11-01. **Stopped after inventory. Recommended identity choices await approval; no pilot execution or grants authorized by this report.** This records the user's subsequent instruction to inventory first, without creating identities, assigning permissions, switching principals, creating an Application or starting a host.

## Method and authority boundaries

Read only `security_documents` and `security_state` using SQLite `readOnly:true` in three already documented deployment stores. Did not invoke the normal store constructor, which can initialize schema. Expanded existing active role assignments and permission-set includes; retained assignment and rule scopes/conditions in [the structured inventory](../../evidence/v1-local-pilot-prerequisite-inventory-20261101/identity-inventory.json). All main database file hashes matched before/after each read. No credentials, cookies, CSRF values, session tables, candidate payloads or audit payloads were extracted.

These are **assigned-policy capabilities, not live authenticated allow decisions**. Current-session usability is separately reported. Same principal ID in two stores does not transfer its permissions between those deployments. No evaluator context was fabricated to impersonate a candidate.

| Store | Revision | Findings |
| --- | --- | --- |
| `v1-normal-smoke-20261026-01/runtime/iam-v1-development.sqlite` | 1 | Six active Users, seven active role assignments, one fixture Application; no group memberships or grant boundaries. No Platform-security-administrator or Application-security-administrator permission definition/assignment. |
| `.ui/iam-v1-development.sqlite` | 1 | Same six Users and fixture-scoped relevant assignments; no qualifying provisioning administrator. |
| `builder-demo/runtime/iam-v1-development.sqlite` | 7 | Existing Platform security administrator, existing Application creator, and existing Demo Application security/admin/author/publisher assignments. These belong to this separate authority, not the current disposable Builder session. |

The currently documented disposable launcher sets `UI_PLATFORM_BUILDER_WP0=0`. Source creates the fresh-Application registry/protected onboarding integration only when that flag is enabled. No live process environment was inspected, so this is a launch-configuration prerequisite to verify, not a new runtime-proven failure. No flag or host configuration was changed.

## Candidates in the disposable/default stores

All following grants are scoped to **Application `dev-v1-identity-fixture` and its descendants**, not a future fresh Application. All inspected Users and assignments are active; assignments begin in 2020 and have no end date. Relevant effective allow rules are shown; unrelated Form/Workflow permissions are not a substitute for Page/Presentation authority.

| Existing name / email | Immutable User ID | Relevant assigned capability |
| --- | --- | --- |
| Application Admin — admin@example.local | usr_f01e0c1c58424bed9ac4e8601ff9890a | `ui.application.view/edit/admin`, `ui.page.view/edit/admin`, `ui.presentation.view/edit/admin`. Can cover author and publisher for this existing fixture scope. No assigned Platform creation or provisioning authority here. |
| Security Admin — security@example.local | usr_06fefc50791f4f15ac0139de699701b9 | `ui.application.view`, legacy fixture `ui.security.admin`. **Not** `ui.platform.security.admin` or `ui.application.security.admin` here. Cannot provision a fresh Application from this grant. |
| Page and Form Editor — page-form-editor@example.local | usr_80831c82612048e9bca61a5012dc7063 | `ui.application.view`, `ui.page.view/edit`; no Presentation edit or Publish. Insufficient for complete website authoring. |
| Page, Form and Workflow Editor — combined@example.local | usr_7485b37d5c274809ab503479212e8bd4 | Same relevant Page view/edit; additional Form/Workflow roles do not add Presentation edit or Publish. |
| Mixed Permissions — mixed@example.local | usr_9298a60d175a4e7f9ff4dd63a906bf77 | Relevant Page view/edit and Application view only; no Presentation edit or Publish. |
| Workflow Editor — workflow-editor@example.local | usr_b2137595f243461ebfe7cd5360467131 | Application view; no relevant Page/Presentation authoring or Publish. |

The Platform Manager role/set exists in these stores but has **no assigned User**. A role definition containing `ui.platform.application.create` is not usable creator authority by itself.

**Current-session usability, for each candidate:** the inspected Chrome Builder at http://localhost:5374/ displays Application Admin selected but the retained workspace reports “Access suspended.” Its live usability for this pilot is **not established**, despite its assigned fixture permissions. Every other candidate is unselected and **not authenticated/tested in this session**. No identity selector was changed, and no failed workspace was recovered. It would be inaccurate to report the other five as proven usable or definitively denied.

## Additional existing candidates in Builder Demo's separate store

These are the same existing User IDs above, with additional assignments in the Demo deployment:

| Candidate | Additional actual policy assignment and scope | Current-session usability |
| --- | --- | --- |
| Security Admin (`usr_06fefc50791f4f15ac0139de699701b9`) | `ui.platform.security.admin` at `ui-platform-development` system resource `platform`, descendants included; active existing Platform security role. Relevant grant-boundary records are retained in the structured inventory. | Candidate provisioning administrator **in the Demo deployment only**. No authenticated Demo administrator session was used or tested. |
| Application Admin (`usr_f01e0c1c58424bed9ac4e8601ff9890a`) | `ui.platform.application.create` at system `platform` through existing assignments. Demo Application `c6aa0b22-7aa2-4c9d-b659-76bf74802cc6` has `ui.application.security.admin` at its exact Application resource, plus Application/Page/Presentation view/edit/admin at its descendant scope. Also retains fixture grants. | Candidate creator and combined author/publisher for the **existing Demo Application**; no authenticated Demo session/operation tested. |
| Other four Users | Their relevant scopes remain the fixture Page-editor/viewer scopes above; no Demo-wide/future-Application publisher or provisioner assignment found. | Unselected and untested. |

The permanent Demo ID matches `builder-demo/apps/demo/app.manifest.json`. This does not authorize using the persistent Demo as the disposable pilot, modifying its policy, merging policy stores or moving its grants to the disposable Builder.

## OS operator and fixed-port check

Read-only current-process Windows account lookup returned **`NIMO-LAPTOP\zanyf`**. This identifies the account executing the check; it does not prove elevation, exclusive interactive-user identity, a new administrative capability or ability to start the eventual reader. No privilege/token inspection, elevation or impersonation occurred.

For proposed **127.0.0.1:5189**:

- `netstat -ano -p tcp` returned exit 0, four output lines and no `:5189` match. No occupied TCP entry was visible in that view.
- `Get-NetTCPConnection` could not access its CIM resource. Its earlier suppressed-error/no-row result is not treated as proof of availability.
- A client-only connection attempt to 127.0.0.1:5189 failed with **EACCES**, rather than a conclusive unoccupied-port result. No listener was opened and no port was reserved.

**Availability is unconfirmed.** Retain 5189 as the user's proposed fixed port, not an approved/verified available destination. Binding/host startup was outside this inventory-only instruction. No firewall/security or environment changes were attempted.

## Smallest recommended identity choices — for approval only

1. **Provisioning:** reuse existing Security Admin (`usr_06fefc50791f4f15ac0139de699701b9`) only in an approved deployment where its existing `ui.platform.security.admin` is present and its legitimate authenticated session is verified. The inspected Demo authority supplies such an assigned-policy candidate; the disposable/default authorities do not.
2. **Creation, authoring and publishing:** reuse existing Application Admin (`usr_f01e0c1c58424bed9ac4e8601ff9890a`) to minimize the set to two existing identities. It already has creator rights in Demo and combined author/Publish rights for existing Demo/fixture scopes. **It has no grant for a not-yet-created fresh Application.** These identity choices cannot yet be approved as a fully runnable fresh-pilot role assignment; future target-scoped provisioning/author/publisher authorization is a separate protected action requiring separate approval.
3. **Local operator:** the current process account `NIMO-LAPTOP\zanyf` is the observed candidate under the user's current-operator designation; host-operating ability and fixed-port availability remain unverified. No elevated privileges are assumed or requested.

No single inspected principal already covers provisioner + complete author + publisher for a fresh Application. Missing gates are: current disposable deployment's provisioning/creator authority, a verified legitimate administrator session in the chosen approved deployment, future Application-scoped grants, and a conclusive port check. Approving the two existing identity choices alone must not be interpreted as permission to grant, change deployment configuration, create the site, switch principals or start a reader.

Only inventory/report files were added. No identity/permission assignment, Application creation/modification, host start, security configuration change, build, Publish, export, commit or push occurred. Stop here pending the user's approval and separate instructions for any state-changing next step.
