# V1 Page Builder — In-Page Anchor Navigation Acceptance Review Gate

Date: 2026-10-28. **Blocked at ordinary website-host admission before implementation. Not accepted or closed.**

## Concrete conflict

The authorization requires actual saved Design Preview **and an existing supported ordinary website Page host**, and directs stopping on a host conflict before expanding scope. No qualifying website host has yet been established inside the admitted disposable environment:

1. `v1-normal-smoke-20261026-01/apps/v1-identity-fixture/package.json` contains only name/private/type. It has no dev script or website entry point. The earlier runtime Preview missing-script error is therefore not resolved by ordinary Builder startup, and that runtime Preview was not invoked again.
2. The repository's existing `references/visual-artifacts` host has a small pathname router: `history.pushState` followed by render, and popstate-triggered remount. It uses `createVisualPage`, making it a plausible existing host for later hash/mount qualification. However, this reference source is absent from the admitted disposable project, and its current Vite source-loader path is recovery-enabled.
3. Its Vite configuration supplies `componentsRoot` and the installed manifest path. `visualArtifacts` is an alias of `revisionVisualArtifacts`. That loader enters `withRuntimeGraphRead(...)` without explicit refusal, then calls `recoverRoleBundleRoot(options.componentsRoot)` and, for Page entries, `recoverRoleBundleRoot(pageOwner())` without refusal. The runtime graph wrapper defaults options to `{}`. `RuntimeRevision.visual` also uses default `readRoleBundle` calls for source snapshots/rechecks.
4. Foundation `recoverRoleBundleRoot` distinguishes explicit `recovery:'refuse'` from the default path. Refusal checks presence and throws without journal interpretation/replay; the default path can read pending journal bytes and call a default role read to recover. Starting the reference host would therefore enter a recovery-capable path and source roots that have not been admitted for this workflow.

This is **not** evidence that a pending journal exists, that recovery actually ran, or that the pathname router itself cannot support fragments. No operational journals/locks/identity databases were inspected. The specific blocker is qualifying a recovery-free existing ordinary host/source-loading path in disposable roots before the required browser test. It is not a Windows-security issue and does not justify token/VM/WinPE work.

## Work completed and stopped

Read-only inspection covered the disposable Application package, reference host/router/Page entry/Vite config, Visual runtime plugin alias/loader/graph admission/revision reader, Foundation recovery function source, and current editor/runtime source. Exact source snapshots/hashes are retained under `evidence/v1-anchor-host-blocker-20261028/inputs` with their path mapping in `source-admission.json`.

No anchor field, link/reference policy, shared runtime listener, history behavior or removal guard was implemented. No fresh Page was created. No browser, service, website host, startup, build or runtime module import was executed for this attempt. Focused tests, normal-browser deep-link/Back/Forward proof and saved/Preview hash comparisons are pending, not inferred from source inspection.

The already admitted saved Design Preview path remains distinct; its availability cannot substitute for ordinary website-host evidence. Existing section duplication's anchor/fragment refusal is unchanged. No new host/router/registry, local scroll approximation or production activation was introduced to evade the requirement.

## Minimum decision to resume

Identify an already admitted ordinary plain-Page host whose source path is explicitly recovery-refusing, **or separately authorize a narrow admission correction/adaptation of the existing Visual reference host into explicitly identified disposable roots**, reusing the accepted refusal contract. That work must not execute recovery or alter protected Component state. It should address the exact loader/root/read calls above, not introduce a new router or general hosting infrastructure.

Only after that existing-host path is safe should this increment proceed with the already authorized HTML id/href controls, shared reference checks, shared-runtime fragment/focus/history behavior, rename/removal guards, preserved duplication refusal and actual normal-browser proof. Host hash ownership is compatible in principle with pathname routing but remains unverified; no broad routing promise is made.

## Preservation and inventory

Only this blocker report, source snapshots and preservation/inventory evidence are new. Historical reports, acceptance closures, raw failures and inventories remain unchanged. Product code, accepted Pages, settings, identities, permissions, autosave, recovery state and previous refresh/header differences are untouched. No commits or pushes.

Normal-browser unsaved-draft Preview protection remains deferred and unaccepted. Restricted Saved Preview and production activation remain excluded.

Stop: **V1 Page Builder — In-Page Anchor Navigation Acceptance Review Gate**, blocked on the concrete ordinary-host admission decision. Exact inventory: `v1-anchor-navigation-host-blocker-files-20261028.json`.
