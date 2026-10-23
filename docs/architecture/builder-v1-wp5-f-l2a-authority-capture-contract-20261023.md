# WP5-F L2-A — Authority and Capture-Delivery Architecture Contract

2026-10-23, America/New_York. **Proposed architecture, not implemented or accepted.** Inputs: [October 22 prerequisite review](builder-v1-wp5-f-production-preview-prerequisite-review-20261022.md), [security prerequisite](builder-v1-wp5-f-security-prerequisite.md), and [Preview architecture](builder-v1-wp5-f-preview-architecture.md). Existing fixture/shell acceptances remain bounded. Complete WP5-F, D6 and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.

## Decision requested

Approve or revise the following defaults before any implementation: authority-owned recoverable policy history; independent session/owner validity sources combined by a non-authoritative channel adapter; strict hide on uncertainty; explicit Refresh after reconciliation; separate content and authorization identity; exact immutable resource delivery with fresh authority admission. No protected Preview can activate until actual authority integration, D6 capture and native admission independently pass their gates.

All interfaces and examples below are authored specifications. They are not source files, installed services, existing endpoints, verified guarantees or authorization to migrate a database. Source-only inspection cannot prove deployed writer participation, durability under crash, bounded remote timing or current protected-state health.

## 1. Existing authorities and writer ownership

Paths are relative to `C:/Projects/Modular/ui-platform` unless prefixed `../UI Platform Data Services/`. Only source text was read; no constructors, SQLite connections, package discovery or protected readers were invoked.

| Concern | Existing source contract and writers inspected | Established by source / remaining boundary |
| --- | --- | --- |
| Active policy/security-definition revision | `../UI Platform Data Services/packages/i-am/src/wp1/store.ts`: `snapshot`, `activate`, `audit`; `wp1/service.ts:activate` | `BEGIN IMMEDIATE` validates expected revision, updates definitions and revision, appends audit and candidate result, then commits. Snapshot reads revision and active definitions in a transaction. No cursor/retention/subscription API. Revision is local to that authority database; database replacement/reset has no demonstrated lineage contract |
| Definition CLI and text reconciliation | `wp1/cli.ts`: stage/reconcile creates candidates; activate calls service/store | Staging alone is not a policy commit. Replayed already-activated candidate returns its recorded result without another revision. Caller text `--actor` does not establish Preview identity; retain existing administration gate |
| Administration, bootstrap and recovery policy writes | `wp3/service.ts` activation paths, including administration/provisioning/recover; `wp3/bootstrap.ts`; `wp3/cli.ts` | Inspected paths converge on `definitions.store.activate`; administration checks identity/resource/policy stamps. Recovery here means an existing I-AM administrative entry point in source, not Foundation recovery and not authorized execution. All successful policy commits must enter the same proposed feed regardless of entry point |
| UI activation and initialization | `src/server/editor-security.ts`, `v1-development-identity.ts`, `v1-development-policy.ts`; `index.ts` composes authorities | API routes delegate to administration or definition service; development seed uses service.activate. These writers must participate too. `wp2/index.ts` wraps the WP1 store as policy authority; it is not a second definition store |
| Original development subject/session and expiry | `v1-development-identity.ts`: process-local `sessions`, `handle`, `session`, `currentUser`, `authorizeUser`, `authority` | GET creates opaque session; POST/DELETE replace revision/login/logout; expiry removes session on observation; current User reread can deny disabled users. `close()` clears sessions. No durable cross-process session event log or scheduled expiry notification is demonstrated. Existing cookie/CSRF remains authority, not an iframe token |
| Editor handle and source event transport | `editor-security.ts`: revision handles, switch/expiry, `publish`, `publishWorkspaceChange`; client `artifact-editor/session.ts`, `transport.ts` | Editor cookie is revision/CSRF plumbing under original V1 subject. SSE rechecks events and may suppress denied artifacts, which cannot revoke already displayed bytes. Local identity signals/reconnect checks are useful but not a complete committed policy feed |
| Permanent Application ownership | `development-application-registry.ts`: `registerCreated`, `byKey`, `provisioning.resolve`, `revision`; `applications.ts:readApplicationOwnerId`; `index.ts` creation completion | Trusted creation registers permanent UUID/key after checking manifest/settings. Registry revision hashes rows and current provisioning results; manifest mismatch or disabled settings deny resolution. No general reassignment API, monotonic owner cursor or change feed was found in this class. Treat reassignment as invalidation/rebinding requiring explicit authority support, not an invented transfer operation |
| Artifact identity/revision/read scope | `shared/builder-workspace.ts:workspaceIdentityKey`; `server/builder-workspace.ts`; `visual-preview.ts`; owner services through existing graph admission | Owner-qualified permanent identity, package owner/version and repair-only locator are distinct. Workspace checks original subject, permanent Application/policy and current revisions. Legacy Preview rechecks participating hashes/composition; this is not a complete immutable capture. No new source catalog is needed. Repair-only identity must not activate protected executable Preview |

### Writer completeness limitations

Source search of the inspected I-AM `src` and UI `src/server` identified direct activation call sites listed above. No assertion is made about deployment scripts, independent installed copies, direct SQL writers, other repositories, future entry points or operator actions. Existing legacy policy/ORM authority paths are not silently promoted to the V1 definition authority. Before integration, resolve the deployed sole authority/lineage and audit every process allowed to mutate it. If any writer bypasses the authority-owned revision/history contract, the channel cannot claim complete coverage; protected Preview stays unavailable.

The registry additionally depends on filesystem manifest/settings validity. Its current revision is a digest, not a durable event sequence. External edits/deletion, enable/disable and key/UUID remapping must be covered by an approved owner authority contract or conservatively make protected Preview unavailable. File watchers are hints, not committed ownership authority. No lock, manifest, Component or registry database was opened to establish operational facts here.

## 2. Proposed typed authority and cursor contracts

Illustrative TypeScript notation; opaque strings are server validated, never client-selected grants. Decimal revisions avoid unsafe JSON integer arithmetic. All timestamps are authority UTC values, mapped conservatively to local monotonic deadlines.

```ts
type Revision = string; // canonical unsigned decimal, compare as integers
type Digest = `sha256:${string}`;
type Cursor = { authorityId: string; lineage: string; revision: Revision };
type Binding = {
  authorityId: string;
  subjectId: string;
  sessionHandle: string; // server opaque reference, never cookie/CSRF/secret
  sessionRevision: string;
  applicationId: string; // permanent UUID, never key alone
  owner: { kind: 'application' | 'platform' | 'package'; id: string };
  selectedIdentity: string; // canonical owner-qualified permanent identity
};
type Epoch = {
  policy: Cursor;
  sessionRevision: string;
  ownerRevision: string; // authoritative validity token, not assumed monotonic
  scopeDigest: Digest;
  validUntil: string; // min of session, rights, owner and admission ceilings
};
type PolicyChange = {
  cursor: Cursor; previousRevision: Revision; committedAt: string;
  kind: 'policy-committed'; auditId: string;
}; // authority-internal; no policy/source payload sent broadly to browsers
interface PolicyHistory { // proposed extension of existing authority
  head(): Promise<{ cursor: Cursor; earliestReplayable: Revision }>;
  after(cursor: Cursor, limit: number): Promise<
    { kind: 'changes'; changes: PolicyChange[]; head: Cursor } |
    { kind: 'reset-required'; head: Cursor }>;
}
type ChannelEvent = {
  channelId: string; generation: string; sequence: Revision;
} & (
  { kind: 'ready'; epoch: Epoch; cursor: Cursor; healthDeadline: string } |
  { kind: 'invalidated'; reason: 'policy' | 'session' | 'owner' | 'expiry' } |
  { kind: 'reset-required' | 'unhealthy'; reason: string } |
  { kind: 'health'; reconciledThrough: Cursor; healthDeadline: string }
);
interface PreviewAuthority { // adapter, never an independent allow authority
  reconcile(original: Binding, resume?: Cursor): Promise<
    { kind: 'denied' | 'unavailable'; code: string } |
    { kind: 'reconciled'; epoch: Epoch; channelId: string; generation: string }>;
  admit(original: Binding, expected: Epoch, operation: 'capture' | 'resource'):
    Promise<{ epoch: Epoch; permitId: string }>; // fresh evaluation required
}
```

A public channel sequence and durable policy revision are different domains. A scope-filtered stream cannot infer missing policy revisions from its own sequence. Recommended default: invalidate all protected captures of the bound subject on any new policy revision, with no sensitive affected-scope details. This is conservative and avoids an unproven dependency filter. Session/owner/expiry events are emitted by their actual owners; the adapter orders their delivery within a channel generation but does not invent a global transaction or total order across authorities. Any epoch change invalidates existing captures even if a later evaluation still allows access.

### Durability and recovery rules

1. Each newly committed policy revision must have a transactionally associated replay record. Prefer a minimal adapter over the existing same-transaction `security_audit` if an independent audit proves complete contiguous history, stable lineage, retention and efficient bounded reads. Current `audit()` returns an unbounded array; it is not the proposed cursor API. Do not expose full audit before/after definitions as browser events.
2. If that existing history cannot supply the contract, propose an authority-owned transactional outbox extension for separate migration approval. Never rely on notification success or a local emitter to make a grant valid. A wakeup after commit only tells a reconciler to read durable history. Crash after commit/before send recovers from that history; a callback before commit must never announce success.
3. A lineage identifies one authority history. A reset/replacement/rollback or cursor ahead of head is not normal reconnect: hide, reset, fresh authority reconciliation. Persistent lineage ownership is an unresolved authority design item; do not generate a new random lineage on each connection and call it durable.
4. Exact duplicate cursor/events are idempotent. Same cursor with different content is corruption/unhealthy. Out-of-order older events cannot restore state. A skipped channel sequence, policy-history gap, retention miss, excessive delay or unknown lineage immediately hides protected display. No optimistic rendering while filling a gap.
5. Retention policy must declare earliest replayable cursor. Default: bounded replay then reset-and-reconcile; never require indefinite retention of browser delivery history. Numeric duration/size is pending workload/security review. A health event cannot attest completeness beyond the adapter's reconciled durable head or extend any rights/session deadline.
6. Ready requires subscribe/reconcile fencing: establish durable head A, attach ongoing observation, read current subject/session/owner/policy and earliest expiry, reconcile through head B, recheck all bound stamps and buffered invalidations, then publish ready only if unchanged. Concurrent change makes this attempt invalid/unhealthy. No cross-authority snapshot is assumed. D6 protects source acquisition, not these authority owners.
7. Session loss/server restart invalidates process-local handles and their channels. Do not introduce durable login storage under this proposal. Other-process session replacement requires an existing authoritative session signal or separate extension; absent coverage, multi-process protected activation is unavailable. Expiry has an authority deadline even with no write; the host and server must enforce it, not wait for a policy event.

## 3. Protected display state machine

Authority state and capture state are orthogonal. Render only when authority is reconciled/healthy, original binding unchanged, epoch current, capture unexpired, page visible and capture/render policy admitted.

| Input/state | Display and transition | Required action |
| --- | --- | --- |
| Initial / reconciled without capture | Empty; Refresh available | Readiness never resurrects old bytes |
| Explicit Refresh with no successful capture | Capturing; no protected display | Fresh admission, new candidate sequence and generation |
| Fresh/current capture | Ready, permitted local design interaction only | Display exact capture/selected identity and saved revision; dirty draft excluded |
| Source changes, authority valid | Stale and inert | Destroy runtime behavior; retain only safe static historical representation if possible; otherwise unavailable. No silent capture |
| Refresh pending with old authorized capture | Old view visibly stale/inert, pending candidate separate | Failure may retain old static view only while authority remains valid and old capture unexpired |
| Observed authority invalidation / session or owner change | Hidden immediately; blocked | Synchronously hide, increment generation, detach protected frame; then abort/dispose/revoke resources asynchronously |
| Channel error/close, gap, unknown sequence or unhealthy authority | Hidden; uncertain | Same hide path. HTTP success alone cannot restore channel health |
| Silent channel failure | Hidden when detection deadline is processed | Ceiling bounded only under accepted host/network/event-loop assumptions |
| Capture/rights/session expires | Hidden; expired/blocked | Deny future resources, destroy retained static bytes; explicit Refresh after fresh authority |
| Reconnect / reauthorization succeeds | Empty, refresh-required | New generation; no automatic replay of old frame/capture/sample state |
| Page hidden/pagehide/offline transition | Hidden; uncertain | Visibility return requires reconciliation and explicit Refresh; browser freeze limits below apply |
| Disposed | Terminal, empty | Abort candidates, clear buffers/URLs/listeners/timers, end capture access; ignore all late results |

All async capture, resource and frame messages carry channel generation, selection identity and candidate sequence. Completion checks them before any DOM installation. Invalidating increments generation synchronously before cleanup awaits. Source-stale is not authority-revoked: stale retention never survives a trust failure. Revoke/dispose does not save, flush, discard drafts, reload source or mutate editor history; actual editor ownership stays with WP2/Builder.

## 4. Timing assumptions and limitations

Let `Tc` be authority commit, `Ts` notification send, `Tr` client receipt, `Th` synchronous handler hiding, and `Tf` last proven channel-health point. Track these as distinct observations, with clock skew/error when comparing hosts. `Th` precedes awaiting asynchronous cleanup after `Tr` is processed. It is not necessarily the browser compositor's physical disappearance time.

Remote exposure delay is commit-to-send + network + browser scheduling; current source proves no finite bound for any term. Silent partition is detected by an agreed health deadline relative to `Tf`, subject to monotonic clock mapping and event-loop scheduling. A heartbeat cannot renew expired rights or attest a stale authority reader. Proposed numeric heartbeat interval, silence ceiling, maximum healthy lag, skew margin and resource-send duration remain **activation-blocking decisions**, not default constants invented here. Recommended policy: fail closed on expired or uncertain bounds, including backward/unsafe clock mapping.

Hide on observed local logout before its request/cleanup awaits. Authority-invalidating server requests deny future delivery as soon as their fresh check observes denial. Bytes already sent, copied, cached, viewed or held in a frozen compositor cannot be recalled; no zero-delay remote or offline pixel-erasure guarantee exists. Visibility handling reduces exposure but cannot prove behavior while JavaScript is indefinitely suspended. If the requirement disallows this residual window, protected browser Preview remains unavailable.

## 5. Immutable manifest and resource delivery

Separate a canonical content manifest from its original-bound admission envelope. Both must be bound by the server; neither a digest nor opaque resource handle grants permission. Do not include cookie/CSRF, raw decision secrets or real records in either frame payload.

```ts
type ByteRef = { id: string; sha256: Digest; byteLength: number; mediaType: string };
type CaptureContent = {
  schema: 'preview-capture-v1';
  applicationId: string;
  owner: Binding['owner']; selectedIdentity: string;
  selectedRevision: string;
  roles: { identity: string; role: string; revision: string; bytes: ByteRef }[];
  dependencies: { from: string; to: string; kind: string }[];
  membership: { scope: string; identities: string[]; digest: Digest }[];
  packages: { name: string; version: string; activationRevision: string;
    manifest: ByteRef; executable: ByteRef[]; resources: ByteRef[] }[];
  composition: { routes: ByteRef[]; shells: string[]; regions: ByteRef[];
    theme: ByteRef[]; styles: ByteRef[]; assets: ByteRef[] };
  rendererVersion: string; capabilityPolicyVersion: string;
  sampleProfile?: { schema: string; valueDigest: Digest }; // authored only
};
type CaptureEnvelope = {
  captureId: Digest; // hash(canonical CaptureContent)
  original: Binding; epoch: Epoch; // not hashed into content identity
  channelId: string; generation: string;
  createdAt: string; expiresAt: string;
  limits: { totalBytes: number; resources: number; concurrentDeliveries: number };
  resourceIndex: ByteRef[];
};
type ResourceRequest = {
  captureHandle: string; resourceId: string; expectedDigest: Digest;
  generation: string;
}; // authenticated parent transport, never ambient frame credentials
type DeliveryResult =
  { kind: 'delivered'; bytes: Uint8Array; digest: Digest; mediaType: string } |
  { kind: 'denied' | 'expired' | 'revoked' | 'unavailable'; code: string };
```

Original subject/session belongs to the envelope so two authorized subjects may share identical *content identity* without sharing capability or access. No cross-user cache/dedup access is assumed. Permanent Application/owner and selected identity are in both content scope and binding. Epoch is separate and must be fresh for capture and each resource delivery. Owner key is a lookup hint only; repair-only or ambiguous identities reject. ScopeDigest covers required source/field visibility; unreadable fields never enter content or samples.

Canonicalization is versioned: UTF-8, deterministic object-key ordering, explicit null/omission rules, no undefined/nonfinite numbers, no duplicate keys/IDs, sorted unique identity/edge/membership arrays and exact byte digests. Preserve semantic order where native behavior depends on it (for example route precedence) with explicit ordinal fields in the canonical record; never sort away semantics. Source revision tokens retain their native meaning; byte digest is independently recorded. Specify one canonicalization algorithm and authored vectors before implementing. Manifest shape is proposed, not a new saved artifact format.

Capture resolves transitive dependencies to a finite fixed point through existing authorities, records necessary uniqueness/route collection membership and verifies bytes/revisions under D6's eventual admitted acquisition contract. Captured package version alone is insufficient: same-version different bytes means different content identity or failed validation, never live substitution. Renderer/capability versions and safe sample profile bind output identity. No live source lookup, module import, network URL or ordinary service is available to the frame. Approved native executable bytes must be preadmitted as the exact trusted bootstrap/resource set; this contract authorizes neither dynamic imports nor arbitrary package execution. Existing all-resource-denied fixture CSP is not changed here; captured-resource compatibility requires Lane 3 approval and its own host verification.

### Delivery admission and race semantics

1. Parent presents the existing authenticated original session and capture handle; server resolves only a resource ID in that capture's immutable in-memory index. Reject arbitrary path/URL, missing resource, digest/media mismatch, cross-user/session/owner binding, expired handle or unknown generation. Never discover or load replacement source on a miss.
2. Freshly verify current policy, session, owner, source-read/field scope and expiry for **every** delivery; compare epoch and healthy channel/capture state. Any epoch change invalidates the capture, even if fresh permission remains allow. A stream event is not an authorization decision.
3. Allocate a cancellable, bounded delivery permit tied to the checked epoch. Recheck immediately before committing response headers/bytes. An observed invalidation before that boundary sends a non-sensitive denial with zero protected bytes. On observed invalidation after send begins, cancel remaining transfer and invalidate parent generation; already emitted bytes cannot be recalled. Do not hold the policy database transaction open across network I/O or pretend it is atomic with another authority.
4. A policy commit between final check and first byte remains a race unless the authority supplies a proven ordered admission/invalidation barrier. Recommended default: define delivery as authorized at its checked admission point, cancel on observed invalidation, explicitly accept/measure the residual check-to-send window. **This needs architecture acceptance; it is not a claim of zero post-commit byte disclosure.** If stricter semantics are required, keep activation blocked pending an authority-owned barrier design. No callback replay or transaction cancellation is implied.
5. Prefer bounded complete resource buffers and a single admitted send rather than unbounded streaming; maximum resource/send duration is a pending reviewed limit. Do not cache responses in shared caches, service workers or disk; require no-store and reject unsupported range/redirect behavior. Authentication/CSRF/origin checks reuse existing authorities. No actual route/header change is made here.
6. Parent verifies generation/digest before delivering data to the restricted frame. Frame messages check exact source window, nonce, capture/selection and sequence. No message handler forwards arbitrary URLs, save, record, upload, Workflow/Trigger or Publish operations. Frame receives no credential, service adapter or resource fetch authority.

Capture expiry is the minimum of configured capture lifetime, session expiry, earliest applicable rights expiry and owner/policy validity ceiling. Set numeric byte/resource/count/per-user/concurrency/lifetime limits before activation; exceedance returns explicit unavailable/limit errors without partial rendering. Pending Refresh has its own candidate budget; old resources do not live longer because another request is pending. Disposal/revocation releases retained bytes, URLs, registrations and permits. Revoked capture handles never resurrect; require a new explicit capture after reconciliation.

## 6. Authored negative and recovery matrix

These are expected outcomes, **not executed tests**. `M` means pure authored contract modeling can establish state/ordering invariants; `I` means actual I-AM/session/owner/backend/channel integration required; `D` means D6/protected source qualification; `R` means native/restricted-browser resource execution evidence.

| Scenario / authored sequence | Required result and recovery | Proof boundary |
| --- | --- | --- |
| Permission removed during capture: start epoch P10, commit P11 before candidate completes | Hide/invalidate generation; reject candidate despite valid bytes; fresh allow later requires explicit Refresh | M guards; I commit/event/read authority; D capture concurrency |
| Removal during delivery: permit P10, P11 before/after header boundary | Before send: zero protected bytes. After send: cancel remainder/hide; preserve residual-race limitation and timestamps | M ordering; I real admission/transport race |
| Connected session replacement S1→S2 | Original S1 handle/captures fail, hidden even if same User; no identity retargeting | M identity checks; I session owner event coverage |
| Logout with pending resource/capture | Synchronously hide/increment generation locally; server denies old session; late responses ignored | M late-result guard; I server logout; R visible frame cleanup |
| Owner reassignment A/key→different UUID or owner validity token | Hide; original capture cannot bind by key; no transfer API inferred. New owner requires explicit authorized selection/capture | M permanent identity; I actual owner path/external writer coverage |
| Rights expiry E with unchanged source/policy revision | Enforce min deadline; hide/deny at expiry, no event-write dependency | M clock boundary; I evaluator validity ceiling; R delayed timers limitation |
| Server crash after P11 commit before publication | Recover P11 from durable history; old channel unhealthy on detection; no ready before head reconciliation | M replay algorithm; I transaction/crash/restart durability |
| Duplicate seq 7 / same cursor | Idempotent exact duplicate; conflicting payload is unhealthy; no repeated display installation | M; I wire serialization |
| Receive seq 9 after 7, or delayed seq 6 after 9 | Gap hides/reset; old event never restores; reconcile head before ready | M; I actual channel fault/replay |
| Reconnect cursor older than retained history or wrong lineage | Reset required; remain empty; fresh reconciliation then explicit Refresh | M; I retained cursor storage/lineage |
| Partition with HTTP still working; health deadline passes | Hide on detection; HTTP allow cannot make channel healthy; reconcile after reconnect | M deadlines; I network failure; R background/frozen behavior |
| Source stale with otherwise valid epoch | Old capture static/inert only while authorized/unexpired; no auto recapture; Refresh may fail honestly | M lifecycle; D revision/membership; R native freeze/disposal |
| Package version v1 unchanged, executable digest X→Y | New capture identity or reject changed closure; never deliver live Y for captured X | M digest matching; D acquisition; R admitted bytes |
| Expired capture handle replayed for resource | Deny no bytes, no source fallback; fresh capture required | M expiry/binding; I actual server response |
| Refresh candidate C2 concurrent with revoke of C1 epoch | Revoke generation wins; neither C1 nor late C2 visible; allow later leaves empty | M deterministic barriers; I authority timing; R visibility |
| Health heartbeat arrives but policy reconciler stalled / epoch expired | No lease extension past known ceiling or reconciled head; unhealthy hides | M; I authority/channel-health implementation |
| Cross-user or cross-owner capture/resource replay | Generic denial with zero protected bytes; no identity/source details in broad error/event | M; I authenticated routing and scope checks |
| Dispose while resources pending; terminal late frame message | Empty terminal state, no callback or restored frame, release buffers/permits | M; R listeners/URLs/actual native teardown |

Recovery never means repairing Foundation locks or restoring revoked captures. It means replay/reconciliation under the existing authorities and a new explicit capture only after successful authority admission. No pure-model result can prove real commit participation, external writer completeness, crash durability, browser pixel hiding, coherent protected bytes or production revocation timing.

## 7. Open choices, recommended defaults and separate increments

| Choice | Recommended default / gate |
| --- | --- |
| Durable feed backing and lineage | Audit same-transaction audit history first; if inadequate, separate authority-owned outbox migration proposal. No migration now |
| Policy scope filtering | Conservative invalidate all subject-bound protected captures on any policy revision; optimize only after complete dependency proof |
| Session/owner multi-process coverage | Existing owners must supply complete validity/invalidation; unsupported deployment topology remains unavailable |
| Timing/health/clock budgets and resource limits | Explicit measured/accepted values required before activation; no unsupported numeric defaults |
| Check-to-send semantics | Reviewed admission-point authorization plus best-effort cancellation/explicit residual race; strict zero-post-commit requirement blocks activation pending barrier design |
| Reconnect/visibility return | Empty after reconciliation, explicit Refresh, no automatic restoration |
| Resource execution | Captured exact bytes only; no dynamic import/live fallback. Lane 3 independently admits unchanged native closure and compatible host policy |

Separately authorizable sequence:

1. **L2-B pure contract model:** implement only authored binding/epoch/cursor/state/manifest canonicalization logic, deterministic scenario examples and exact-file serial zero-retry tests after full import/setup admission. No authority provider, product wiring, storage or backend. Accept only model invariants and vectors, never production security.
2. **Authority source/design completion:** validate every deployed policy writer, audit retention/lineage and session/owner notification feasibility; decide achievable timing and delivery-race contract. If changes require migration or a new owner signal, stop for that exact authority extension decision. No protected source acquisition needed for this design work.
3. **Authority integration:** separately authorize existing-authority feed/health/expiry and delivery admission implementation, then real cross-process/crash/reconnect/replay tests with authorized disposable state. This requires I-AM/backend access and cannot follow from L2-A approval alone.
4. **Immutable capture/delivery integration:** after D6 and native admission gates, separately authorize coherent saved source capture and exact-resource transport. Require current authority at each response, simultaneous-source scenarios and browser denial/cleanup evidence. No protected Preview activation before all lanes pass.

L1-A evidence correlation and L3-A native source audit remain independent roadmap work. D6 operational verification, protected Components, Foundation locks/journals/recovery and Windows Identity/N01/token/elevation/VM/WinPE remain paused. Missing source/coverage stops only its affected conclusion, not independent documentation. No competing permission store, source catalog, session system or ambient ordinary service is proposed.

## 8. Preservation and gate

Only this contract document and its [new inventory](builder-v1-wp5-f-l2a-contract-files-20261023.json) are added. The inventory was written with a **1470-file before baseline in the workspace before this document**, avoiding reliance on transient per-call temp storage. It records exact source-reference hashes (including seven named sibling I-AM source files), final raw comparisons, HEAD observation and exact new-file hashes; its self-entry is intentionally unhashed. Historical reports, inventories, evidence, accepted closures, code/tests/runtime and all umbrella checks remain unchanged. Hashing ordinary admitted files is not a product test or protected-state read.

**STOP AT WP5-F L2-A Authority and Capture-Delivery Contract — Architecture Decision Review Gate.** Architecture approval would not authorize implementation, migrations or protected Preview activation. No tests/builds/backend calls/database reads, protected Component/lock/journal access, D6 operation, recovery, Windows work, commit, push or GitHub synchronization occurred. Complete WP5-F, D6 and WP5-I remain open and unaccepted.
