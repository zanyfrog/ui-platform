# V1 Page Builder — Next Functional Increment Review Gate

Date: 2026-10-28. **Read-only assessment; no implementation begun or authorized by this document.**

## Recommendation and comparison

Recommend a **compact, actionable editor Problems view** as the next bounded usability increment. Repeated manual-layout warnings visibly consumed the user's editing area; the source still renders every diagnostic as an individual paragraph above Structure. Heading semantics and repetitive section authoring are now addressed by accepted functionality, making this demonstrated obstruction a stronger immediate priority than another component or verification campaign.

| Candidate improvement | Existing capability/gap | Relative benefit and scope |
|---|---|---|
| Compact editor Problems view | Confirmed presentation gap: inline warning paragraphs, including potentially overlapping saved-bundle/parser findings; node context is not shown in those rows | Immediate benefit on preserved and growing Pages: keeps content controls accessible and makes affected elements discoverable. Reuses existing diagnostics and selection; smallest recommended increment. |
| In-page section navigation | Literal fragment href is authorable, but ordinary HTML anchor-ID editing and end-to-end fragment navigation in shadow-rendered Preview are not qualified | Useful website function; needs a separate ID/reference/navigation contract assessment. Do not assume adding an ID field alone makes navigation work or relax duplication's reference refusals. |
| Easier grid/spacing authoring | Existing declarative fields accept raw values; a more guided ordinary UI could improve layout usability | Potentially valuable, but broader than the observed warning obstruction. No established missing grid engine; avoid inventing a replacement layout system. |
| Richer components, typography, rich text or reparenting | Varying existing contracts; these outcomes remain outside acceptance | Larger behavior/contract scope. No evidence requiring them before improving everyday editing. |

Accepted capabilities remain closed: practical text/link/image/Card authoring, semantic headings, supported layout/responsive behavior, content-only section duplication and saved Design Preview within their recorded limits. This assessment does not reopen those campaigns.

## Existing diagnostic contracts

- `editor.ts` concatenates retained `selected.diagnostics` with `parseSource(files.source).diagnostics` and renders paragraphs. Parser findings include `node` where available. The local pass is source-structure parsing, not complete validation of every unsaved contract.
- `builder-workspace/shell.ts` already has an Application Problems section. Validate Application reads authoritative saved-source reports; existing entries can navigate to artifact/source locations. It explicitly distinguishes local drafts and does not grant Publish approval.
- `application-diagnostics.ts` marks these reports `source: authoritative-saved`, records revisions/completeness and supplies a presentation envelope. `LatestProblems` already controls report freshness. A local UI improvement does not need a second validation service, merged registry or changes to refresh scheduling.

Do not flatten these into one unlabeled result set: a saved-baseline warning may describe another revision, while the local parser sees the current draft. Do not call local structural parsing complete Page validation or silently remove authoritative errors.

## Smallest proposed authorization

1. Replace the editor's repeated paragraph area with a keyboard-accessible collapsible **Problems** view and compact error/warning counts. Keep informational/manual-layout warnings collapsed by default; make errors discoverable and surface relevant action failures through the existing status path. Do not hide blocking errors or change their severity/admission effect.
2. Preserve diagnostic content and origin. Label local structure findings separately from saved-baseline findings, with revision context where actually available. Group repeated equivalent warnings with affected-node rows/counts rather than dropping distinct nodes. Exact deduplication should include severity/message/node and source context; do not invent stable cross-system diagnostic identities.
3. For a diagnostic with a currently usable managed node, select it through the existing Structure/inspector path. If malformed/manual source removes that identity or the node no longer exists, show the artifact-level explanation; no automatic adoption, repair, reload, save or recovery. A selected element may retain one short contextual explanation beside its controls.
4. Keep the existing authoritative Application Problems service, navigation and freshness protections. No new endpoint, validator, persistent store, controller or polling/focus behavior. The change is local presentation/actionability, not a promise to consolidate every diagnostic subsystem.
5. Verify on one fresh disposable Page: multiple node warnings grouped with correct counts/context; selecting a warning selects the right current element; an invalid local structure exposes its error without saving it; Undo restores the draft; a missing target remains safe. Confirm that local draft findings and saved-baseline findings stay distinguishable. Use focused rendering/selection/severity/preservation tests and scoped typecheck. Do not repeat accepted Card/image/heading/duplication/responsive campaigns or change accepted Pages to manufacture warnings.

Acceptance should be a compact workspace where warnings do not push Structure/content controls away, errors remain visible/actionable, and users can identify affected elements. Broader toolbar redesign, diagnostic-policy changes, saved-source validation expansion and infrastructure work are excluded. Implement only after separate authorization; report any contract conflict before expanding scope.

## Boundaries and preservation

Normal-browser unsaved-draft protection remains deferred; inspecting local parse feedback is not that Preview-protection experiment and must not be represented as closing it. No permission/settings/autosave changes are proposed. Restricted Saved Preview/production activation, comprehensive security qualification, arbitrary nesting and unsupported contracts remain unaccepted. Existing refresh/header source differences are preserved, not requalified.

This review uses read-only source/report inspection. No browser, operational state, product code, Page, permission, settings or recovery state changed; no server startup, tests, commits or pushes. Historical reports/evidence/inventories remain unchanged. Preservation hashes and exact new documentation inventory are under `evidence/v1-problems-planning-20261028`.

Stop: **V1 Page Builder — Next Functional Increment Review Gate**. Await separate implementation authorization.
