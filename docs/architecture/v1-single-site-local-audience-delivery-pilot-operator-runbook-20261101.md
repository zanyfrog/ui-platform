# Single-Site Local Audience Delivery Pilot — Operator Runbook

2026-11-01. **Prepared, not executed. Mandatory identity/operator prerequisites are pending.** This runbook does not supply credentials, grant authority or authorize a host start independently of the user's pilot decision.

## Admission record — complete before creating source or starting a reader

Record the responsible local operator and their fixed loopback port; approved disposable Application/build/output roots; existing creator/provisioning administrator/author/publisher immutable principal IDs and current authenticated contexts. Verify real permissions through existing protected operations. A development selector label, Application creator registration, a free port or an OS account name is not sufficient evidence.

Required capabilities remain those in the [delivery contract](v1-single-site-audience-delivery-contract-review-gate-20261101.md): creation `ui.platform.application.create`; legitimate initial provisioning by existing `ui.platform.security.admin`; explicit existing Application security administration and Page/Presentation authoring permissions; Application-scoped `ui.presentation.admin` for Publish. Provisioning an Application security administrator does not automatically grant ordinary author/publisher use. Stop on missing authority; do not bootstrap new administrator capabilities or bypass protected approvals.

## Create and author — only after admission

1. Create one genuinely fresh Application through normal supported creation. Record registered permanent ID and owner/creator provenance. Use existing protected onboarding/security administration APIs with the authorized administrator, explicit existing User IDs, intended scope, reason and required reviewed approvals. Preserve audit results without credentials, cookies or CSRF values.
2. Use ordinary Builder controls to configure Home/About/Contact and one shared Shell/Menu. Review the Standard template's extra Admin Page/Shell/Menu and component references explicitly. Remove only the pilot's owned placeholders through existing controls and reference guards. Do not assume a route named `/admin` has access protection.
3. Add admitted local text, links, Application image, CSS and wrapper layout; save/reload and verify stable identities. Exclude arbitrary executable functions/components, forms, private reader data, Workflow and dynamic data services. Stop if controls cannot produce the eligible composition; no manual Application source repair to manufacture success.

## Publish and prepare a candidate

Drain admitted saves; validate Pages/routes, Shell/Regions/Menu, assets and dependencies using existing composition contracts. Record complete membership and source identity. The authorized publisher invokes existing composed Presentation Publish. Record Application ID, active version, complete version snapshot and composition fingerprint. Refuse unexpected source/version changes; no claim of multi-artifact atomicity or exclusion of external writers.

Use existing Application production build scripts and supported Vite output selection to build a new, unserved candidate directory. Record actual commands, Node/template requirements, package/lock/configuration and dependency hashes. Inventory every candidate relative file path, size and SHA-256. Published version alone does not pin installed packages or external build helpers. No in-place rebuild of served output; no deterministic rebuild claim without proof.

## Reader startup admission

Inspect the exact effective Vite Preview configuration and plugin hooks without listening first. Require root base `/`, host `127.0.0.1`, the operator's fixed port, strict-port refusal and empty effective proxy. In a child-process-specific environment, prevent `UI_PLATFORM_API_PORT` and inherited configuration from enabling the template's `/api` management proxy. Record relevant environment names/configuration without secrets. Do not change global environment or security/network policy.

The chosen existing built-file server must serve only the candidate, not Builder/source roots, dev refresh, credentials or management/data APIs. Loopback is machine-local access, not authentication of a particular OS user. Any inability to establish this boundary is a pre-start refusal.

Only after operator admission, start the existing reader command. Record exact executable/arguments, working/output root, owned process ID and effective listener. Refuse occupied port without fallback or terminating another process. This is a disposable local demonstration, not production service certification.

## Verify reader and release separation

Use a reader context without a Builder session. Check direct Home/About/Contact URLs, hard Reload, Menu/content links, Back/Forward, real Page text, decoded images, computed styles and unsupported-route behavior. Compare reader-served entry/assets to declared candidate hashes; verify no management API/proxy or dev refresh is exposed and the listener stays loopback-only. HTTP 200 alone is insufficient.

Make one small ordinary saved edit. Verify old reader text, served files and output hashes remain unchanged. Explicitly Publish again, build into a second separate candidate and validate it. Only then explicitly replace the owned reader at the same fixed destination; downtime is acceptable. Verify the new version/output identity and reader content.

## Refusal, optional restoration and cleanup

Demonstrate invalid-candidate refusal using only owned disposable test input, without altering current served files or accepted content. If candidate startup/health fails, stop only the candidate, record failure and report unavailable. Do not claim atomic switching or automatic rollback.

An authorized operator may explicitly restart a retained previous complete output using the documented existing reader command/config. Independently verify its hashes/content/address. Presentation rollback-to-draft is not a live website rollback and must not substitute for this proof.

Stop only owned pilot processes. Retain evidence and previous output until reviewed. Remove disposable artifacts only when separately authorized and safe; never reset shared Applications, policy, accepted Pages, dependencies or recovery state. Record all commands, attempts, failures, ownership, inventories and preservation results. No commits or pushes.

## Current execution status

No Application was created/provisioned; no author/publisher capability was verified; no operator/fixed port was selected; no Publish/export/build/reader start or update/refusal/restoration demonstration occurred. Execution awaits the mandatory admission record. This is a prepared runbook, not a completed pilot or an acceptance claim.
