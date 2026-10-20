# WP5-F protected-preview invalidation investigation

2026-10-18. Workstream B is **read-only investigation plus new documentation**. Gate 2 remains conditionally architecture-approved; no protected preview or invalidation mechanism is implemented or activated. **REQUIRES SEPARATE SECURITY ARCHITECTURE DECISION.**

## Authoritative components and inspected evidence

The sibling `UI Platform Data Services/packages/i-am/src/wp1/store.ts` is the existing durable definition authority. `SecurityDefinitionStore.activate` commits active documents, monotonically increasing revision, candidate result and mandatory audit in one SQLite transaction. `snapshot()` reads a coherent policy/revision. No change-feed subscription, transactional notification/outbox delivery or browser-facing invalidation API is present in this inspected store. Searching the I-AM source for emit/listener/subscription mechanisms did not identify an equivalent trusted cross-process policy invalidation contract.

The legacy `policy-store.ts`, `service.ts`, `authorization-service.ts` and `token-verifier.ts` were also inspected for notification/revocation hooks. The ORM policy store exposes grant/membership reads and transactional changes; the older authorization service returns an expiry-bound decision. Neither inspected contract supplies the required delivered invalidation signal. They are not the V1 `SecurityDefinitionStore` authority and should not become a competing authority merely to provide notifications. A decision TTL is not trusted push delivery.

`ui-platform/src/server/v1-development-identity.ts` owns development authentication sessions: opaque cookie, CSRF, original user, revision and expiry. Login/logout changes session revision; `currentUser`/identity verification rereads active User state and rejects expired/replaced sessions. Its evaluator consults existing policy/resource revisions, including the Application ownership registry. `policyDigest()` hashes a fresh authoritative snapshot. These are request-time freshness checks, not a delivered revocation notification. Policy-derived time expiry may occur without a new policy revision.

`src/server/editor-security.ts` owns editor revision/CSRF handles and original-subject checks, not policy authority. Existing SSE subscription authenticates, sends ready, remembers authorized scopes and closes on editor expiry/switch/revoke. `publish` reauthorizes artifact events before returning paths. `publishWorkspaceChange` sends a broad workspace-change event to a still-current subject. Artifact events are source/watch events, not a transactional I-AM policy change feed. Dropping an event after permission denial does not notify a browser to hide already-rendered source. An editor-session close does not establish coverage for another process committing I-AM policy or owner changes.

`src/client/artifact-editor/session.ts` provides local invalidation, original-generation bindings and same-browser localStorage identity-change notification. `transport.ts` consumes EventSource source events, reconciles on reconnect and refreshes session after stream errors; it does not provide an always-connected, sequenced authority channel or immediate hide-on-any-disconnect guarantee. These existing local mechanisms can be reused for immediate local suspension but cannot alone satisfy remote revocation.

`src/server/builder-workspace.ts`, `application-diagnostics.ts` and the preview source route in `index.ts` demonstrate current authority/revision checks before source return, including related read checks. This establishes integration points for rechecking every future capture/resource delivery, not proof that all present asset/module delivery paths enforce a captured preview capability. `component-registry.ts` exposes live module URLs; future design delivery must not inherit unrestricted ambient access. `application-data-proxy.ts` retains the separate existing protected data path; design preview must have no record transport.

## Feasibility of reuse

Reuse I-AM as sole policy authority, development identity as sole session authority, existing Application registry for permanent ownership, editor suspension/generation state, and authenticated SSE transport infrastructure. Do not create another policy database, grant cache that can independently allow access, identity broker or revocation authority.

There is **no demonstrated existing end-to-end trusted invalidation channel** meeting this requirement. Merely wiring workspace-change to the preview, watching SQLite/WAL files or periodically comparing digests would miss policy/session/ownership gaps or amount to polling. Per-delivery reauthorization can prevent future source delivery but cannot erase bytes already received. This prerequisite therefore requires an authority-contract extension and a separate security architecture review.

## Smallest compatible proposed contract — NOT IMPLEMENTED

Extend existing authority integration with a committed-change notification contract tied to the existing monotonic I-AM revision. Do not notify before transaction commit or treat notification success as part of a grant decision. A post-commit wakeup is only a hint; consumers must reconcile the durable revision/history at subscription, reconnect and sequence gaps. Every writer process using the authority must participate, including CLI/administration writers. An in-memory emitter in one UI process is insufficient. A crash between commit and publish must be recoverable through a durable authority-owned cursor/change record or a broker supported by the existing authority; the current store has no such delivery guarantee. Whether its existing audit/revision history can serve this cursor without a schema migration must be validated before implementation. No migration is authorized by this investigation.

A trusted host adapter combines that policy revision feed with the original session's revision/expiry and Application owner's revision. Session switch/logout/expiry and owner changes emit invalidation through their existing authoritative owners. Expiring role assignments need authority-scheduled invalidation or a validity ceiling, not only policy-write events. A stream health signal never extends permission past any known expiry or revocation.

Reuse the authenticated editor SSE connection only after extending its contract: scoped session/subject/owner binding, sequence/cursor, explicit authority-invalidated event, readiness only after current authorization, and fail-closed handling of gap or degraded authority coverage. Do not put source paths/denied identities in broad events. On invalidation, parent hides the protected surface synchronously in its event handler, aborts captures, destroys the isolated frame and revokes capture resource access. The isolated frame must not be trusted to report its own revocation. Parent session generation guards prevent late messages/responses from restoring display. A disconnected or unhealthy stream disables protected previews immediately when detected; reconnect requires fresh authority and explicit Refresh Preview, never automatic resurrection of retained content.

Every protected capture/resource response independently checks original session, permanent Application/subject, current read permissions, policy/owner context and capture capability. A stream event is never authorization. Avoid streaming sensitive resource bytes across an unbounded check-to-send interval; specify the delivery admission boundary and cancellation behavior. Existing immutable resource identity prevents substitution, but does not replace read authorization. No real records or live service capabilities are added.

## Timing and browser limits

1. **Local change:** on the initiating client's identity switch/logout or received invalidation, hide before awaiting network cleanup or accepting new rendering work; cancel pending results in the same generation change. This is an event-handler guarantee, not a promise of zero display latency in a suspended renderer.
2. **Remote policy commit:** no instantaneous browser guarantee. Commit-to-notification, network scheduling and browser event-loop delay are separate measured intervals. Delivery must be sequenced and recoverable; a finite maximum requires explicit host/network assumptions and acceptance limits. Do not invent a numeric SLA in planning.
3. **Connection failure:** an error/close event triggers immediate local hiding when processed. Silent partitions are only detected after a health deadline; define and review that bound. Heartbeats may establish channel liveness but are not policy polling and cannot replace a complete committed authority feed. There is inevitably a detection window.
4. **Frozen/background/offline pages:** JavaScript timers/events can be delayed indefinitely. Hide on pagehide/visibility loss and require fresh authority before redisplay, but a frozen compositor, screenshots, cached pixels or previously inspected bytes cannot be recalled. Browser code cannot erase information already disclosed. Do not claim server revocation forcibly removes offline pixels.
5. **Strict requirement:** if the user requires zero-delay remote disappearance even during browser suspension/partition, this browser design cannot meet it. Keep protected previews unavailable. The review must define an achievable connected-client timing contract and fail-closed activation conditions, or retain unavailability.

## Alternatives

| Option | Tradeoff |
| --- | --- |
| Reuse authority revisions plus recoverable committed feed and existing authenticated SSE | Recommended for review; one authority, explicit delivery/health contract; requires existing-authority integration work across writers |
| Local UI emitter only | Small but misses other writers and commit/publish crashes; insufficient |
| Poll policy digest/session or watch database files | Useful reconciliation hint but explicitly insufficient as protected-preview revocation mechanism |
| Central replacement security/notification service | Wider scope and competing-authority risk; reject |
| Keep protected preview unavailable | Safe current default; no new mechanism, reduced supported scope until prerequisite approved |

## Verification required after separate implementation authorization

- Commit policy revocation in an independent process; prove increasing committed revision reaches the correctly bound client and frame is hidden, with commit/server-send/client-receive/hide timestamps.
- Cover disabled User, permission/role removal, time expiry without policy write, owner/key reassignment, logout/switch, session expiry and editor revision replacement. Existing drafts remain recoverable under original WP2 identity.
- Force failure after policy commit before publish, process restart, dropped/duplicate/out-of-order events, cursor gaps and reconnect. No ready/allowed display before reconciliation and full reauthorization.
- Partition stream while HTTP still works, partition HTTP while stream appears healthy, kill authority reader, and freeze/background/offline the page. Verify reviewed health/expiry limits and honest browser limitations; no polling-only success criterion.
- Forge session/capture/frame messages, replay old cursors and cross-user/owner tokens, change rights during capture/resource delivery, and complete a late response after revocation. No denied source disclosure or display resurrection.
- Verify denied resource requests at the server and actual parent/frame visibility in the browser. Network/service/store observations prove no preview effects; UI labels alone are insufficient.

## Separate review gate

Decisions: approve/revise the authority-owned recoverable feed/cursor extension and its writer coverage; choose a demonstrably achievable remote delivery/health timing contract; confirm visibility-loss/reconnect behavior and permanent unavailability if that contract cannot be met. No production security code, I-AM store, session behavior, preview code, test or configuration changed under Workstream B. **STOP AT SEPARATE SECURITY ARCHITECTURE REVIEW.**
