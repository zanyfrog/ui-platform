# Builder V1 WP1 — Application workspace architecture

Date: 2026-10-14. Scope: WP1 only. **BUILDER V1 WP1 — ACCEPTED AND CLOSED** by the user after architecture and verification review. WP0 remains accepted and closed. This record supplements its [authority, ownership and runtime contracts](builder-v1-wp0-development-onboarding.md) and [accepted limitations](builder-v1-wp0-verification.md). Retain documented Windows watcher/rename limitations. WP2 is next; do not begin automatically or start later work at this acceptance gate.

## Workspace and authoritative services

The normal V1 development management entry opens the Application Builder workspace from the Application's Pages tab. One collapsible navigation panel discovers authorized artifacts, one tab strip coordinates open artifacts, and one stage presents the focused editor. Inactive editor elements are detached, rather than stacked or merely visually obscured. Moving between Applications parks the same session workspace without closing its copies.

`BuilderWorkspaceCoordinator` owns navigation sequence numbers, tab identity, original subject, focus and suspension. It holds no draft or save model. `mountWorkspaceEditor` adapts the existing Visual editor, generic Artifact Editor/working copy, composition manager and automation editor. Those implementations remain authoritative for source, selection, validation, conflict checks and persistence. Package definitions and legacy Page source use explicitly read-only inspection.

The server workspace endpoint orchestrates existing Visual, composition, component catalog, generic artifact and automation discovery. It creates no persistent registry or policy store. Its summaries identify Pages, Shells, Components and Forms, Datasets, Workflows, Triggers, Menus, presentation/settings and other existing generic artifacts. Groups with no authorized entries are omitted. Composition styles lacking permanent identities are marked repair-only locators.

## Canonical identity

The tab key encodes owner kind and permanent owner ID, definition format, optional immutable Package version, and either permanent artifact ID or an explicitly separate repair locator. Application-owned keys include the permanent Application ID, so identical local artifact IDs in different Applications cannot collide. Platform Components use the existing Visual `artifactId` under the Platform authority; Form capability never registers a second artifact. Package definitions use their installed Package identity/version and declared Component identity; inferred legacy catalog entries remain repair locators. Application presentation settings use a stable, well-known settings slot under the permanent Application owner.

Names and transport locators are not permanent keys. Duplicate canonical identities discovered within a context are excluded from navigation and authorization rather than resolved by list order. Unknown targets, changed identities and invalid identity shapes fail closed.

Opening a shared Component through another authorized Application reuses its definition tab. The server reauthorizes that requesting Application. Specialized request paths and preview context are rebound to the freshly authorized Application; requests admitted under an earlier binding cannot adopt a later binding's response authority.

## Adapter lifecycle and retained state

The small adapter contract provides `element`, `focus(authorizedArtifact, target)`, `deactivate`, `suspend`, `state`, `guardClose` and `dispose`. Mounting happens once per canonical identity. Focus receives fresh server-authorized data. Editors retain their own local state:

| Editor | Retained context | Deactivation / disposal |
| --- | --- | --- |
| Visual Page/Shell/Component/Form | Files, baseline/hash, selected node, source-file section, invalid text and conflict | Polling pauses; preview iframe is removed; disposal removes timer, document and unload listeners |
| Generic Dataset and other artifacts | Existing working copy, selected internal tab/source document, generation, diagnostics/recovery state | Bound working-copy save semantics continue independently; suspension stops its transport/subscription and hides source; disposal deliberately discards only after workspace close consent |
| Composition Menu/settings/style | Existing source textarea, file hash, structured controls and invalid text | Request binding prevents inactive mutations; disposal removes the retained surface |
| Platform Workflow/Trigger | Definition/source, ordered actions, incomplete actions JSON, conflict and hash | Polling pauses; invalid actions block Save and count as unsaved; disposal clears timer/subscription |

Focus never invokes Save, discard or a selection change in another editor. Clean remote Visual/automation changes reconcile through the editor's existing hash behavior; conflicting local work remains intact. Composition saves continue using the existing expected hash and source validation. A failed or stale focus cannot reveal its surface. Stale orphan mounts are disposed; cleanup errors cannot remove another tab.

Close refuses an admitted pending operation. Unsaved, invalid or conflicting copies require an explicit discard confirmation; Cancel retains the tab. Generic editor's internal Close action uses the same workspace guard. Existing explicit compare/recovery/discard controls remain available. A user who deliberately discards a generic working copy can reopen that tab through a fresh authorized load.

## Authorization and suspension

Discovery and every open/focus use the existing server-side V1 identity, I-AM evaluator and Artifact Editor session boundary. The endpoint accepts only development source execution. It verifies the fixture's accepted permanent identity or WP0's authoritative registered Application ownership, then checks permissions through the existing services. Generic source is projected by the existing Artifact Editor security service; specialized dependencies are filtered before returning source. The endpoint rechecks session, policy digest and permanent owner after asynchronous reads.

Focus POSTs require same-origin CSRF and the current editor revision. The client tab map is never an authorization boundary. Existing mutation routes continue to authorize writes independently. No creator grant, fixture security shortcut, sibling contract, runtime proxy or Dataset host boundary changes in WP1.

Outgoing source is detached while navigation authorization runs. Identity changes revoke bindings and quarantine every tab; labels become “Suspended artifact” and cached source is not mounted. A different subject cannot adopt another subject's retained editor. The original subject must successfully reauthorize; generic copies additionally retain their explicit compare/recovery decision workflow. Visible focus checks current policy at a two-second interval, including policy changes without a browser identity switch; operation admission remains immediately server-authorized. Read-only focus disables specialized mutation controls and preserves the server write checks.

Once a workspace has been mounted, V1 identity changes preserve its in-memory copies and return management to authorized Application discovery. Existing standalone reference/fixture sign-in reload behavior remains unchanged. Browser reload/restart intentionally does not restore local tabs.

## Related definitions and Problems preparation

Selecting a Page Component instance exposes Edit Definition. It resolves the existing Component catalog identity and opens/focuses its separate shared definition. Instance configuration stays with the Page and returning retains its node/section/draft.

`WorkspaceTarget` contains canonical artifact identity plus optional node, field, step and section. `navigate` is the common entry for tab, related-definition and later Problems navigation. Visual editors accept node/source section; generic editors accept existing internal sections; automation accepts a known action step. Unsupported field/step locations provide an artifact-level fallback notice. This introduces no validator, Problems aggregation, create/link transaction or browser Back/Forward history.

## Boundaries retained for later packages

- Existing specialized manual saves and generic two-second working-copy saves remain distinct. Generic saves may complete for their own inactive copy; switching does not initiate a save. No WP2 autosave, Undo/Redo, common candidate-validation or multi-role transaction migration is claimed.
- Dataset tabs edit existing definitions through the generic editor. They do not apply, publish or configure serving resources; WP0's applied Dataset identity remains separate. WP3 onboarding is deferred.
- This is navigation integration, not WP4's complete instance-properties, typed service/action pickers or create-and-link authoring.
- Existing previews remain existing editor capabilities. No WP5 aggregated Problems, safe isolated test host or new focused preview suite is claimed.
- Browser evidence uses real editors, source services and trusted authorization. Programmatic source assembly is test preparation, not a completed WP6 UI-only authoring journey.
- Package and legacy source inspection remain read-only. Existing fixture/reference entry points and production exclusion remain protected.

See [verification](builder-v1-wp1-verification.md) and [exact inventory](builder-v1-wp1-files.txt).
