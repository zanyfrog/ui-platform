# Generic Artifact Editor Phase 2 — WP1 security implementation report

Date: 2026-09-25. **WP1 stage gate: complete and ready for review.** WP2–WP5 have not been started. Fixture mode remains disabled by default.

## Implemented boundary

`ArtifactEditorSecurity` handles the existing artifact routes and `/api/events` before the platform's legacy dispatch, and denies legacy API routes centrally in fixture mode. It resolves the same application-scoped `ArtifactEditorWorkspace`; that workspace still owns the same Foundation service. No parallel artifact service, working copy, autosave timer, save queue, source version store or build engine was added.

Authentication uses explicitly configured development fixture IDs, opaque server-side sessions, an HttpOnly/SameSite=Strict cookie, and an eight-hour session lifetime. Fixture labels are display-only; email strings and arbitrary identity headers do not authenticate requests. No identity is selected automatically. Anonymous sessions cannot access artifacts.

Authorization uses explicit principal roles, application grants and server-owned artifact ownership metadata. Default fixtures are admin, editor, reviewer and viewer. All are restricted to the configured application list. Only admins can access system/package artifacts by default; Trigger and unknown/malformed artifact types default to system ownership. A configured `application:artifactId` ownership entry can override the default. Recognized application types include Foundation's actual `routeGroup` spelling. Browser capabilities are hints only; direct requests are checked independently.

Protected operations include discovery, load, save, saved validation, outgoing references, and SSE. Discovery filters restricted artifacts. References expose only unambiguous, readable discovered targets; hidden diagnostic details are redacted. Read/save DTOs contain diagnostics and references, so a custom policy denying either also denies the aggregate operation. Validation and references are taken from the same authoritative Foundation load snapshot that was authorized, avoiding a second-read/type-change race.

Saves still go through `ArtifactEditorWorkspace.save` and Foundation's checksum transaction. The authorization read and the submitted checksum must match. Missing checksums produce 400, missing identity 401, denied permissions/stale session revision 403, and stale artifact checksum 409. Operational and Foundation rejection details are not returned unsanitized. Switches, denials and mutation actors are logged without session tokens.

## Local-only and production behavior

Activation requires all of:

- `UI_PLATFORM_EDITOR=1`.
- `NODE_ENV=development`.
- Running the source TypeScript development server, not the emitted server.
- A server-only settings file configured by `UI_PLATFORM_EDITOR_CONFIG`.

In fixture mode the API, standalone Vite configuration, and the development launcher's front server bind to `127.0.0.1`. Requests must use configured loopback hosts/origins, a loopback peer, and no forwarded identity/address headers. Cross-origin/Fetch Metadata requests are denied; mutations require matching Origin, JSON content type, CSRF token and session revision. External reverse proxies are unsupported.

The emitted server refuses fixture enablement even if launched with `NODE_ENV=development`. Disabled development artifact routes return 401; production/emitted artifact routes and fixture endpoints return 404. Artifact watchers do not start when the editor is disabled. The legacy general workspace watcher remains part of the existing management server.

The fixture selector is imported only through `import.meta.env.DEV`. `check:editor-production` builds and inspects the production client for selector/session/transport markers. The production client contains none. The emitted **management server** still contains dormant editor modules; this change does not create a separate stripped server distribution or alter application runtime packaging.

## Identity changes, revocation and queued saves

Each browser transport binds to the session revision used for its initial load. It never adopts a replacement identity for an existing copy. Session switches invalidate browser bindings before sending the switch request; a storage notification invalidates other tabs, while the server revision remains authoritative even if browser notifications fail. Late responses from the previous revision are discarded. SSE disconnects refresh session status, and stale subscriptions close and detach.

The server marks a session as switching immediately and refuses new write admission. It waits for saves **already admitted to Foundation** before acknowledging the identity change. These admitted transactions may finish; they cannot be canceled through the existing Foundation interface. A request still reading/preparing its changes is rejected if the revision changes before admission. Revocation applies the same barrier across the subject's sessions and closes streams.

The original Phase 1 two-second debounce and in-flight reconciliation are unchanged. A denied queued save becomes the existing `error` state, keeps dirty source, and makes `host.close(locator)` return false. It does not silently save under a newly selected admin identity. An old response may correspond to a committed save but will not update a revoked browser copy; a fresh authorized load is necessary to determine disk state.

The mounted development selector displays the current role and instructs the developer to reopen editors after switching. `guardEditorControls` supplies WP2's panel integration seam: use the authorized DTO's `capabilities.edit`, disable mutations/hide edit-only actions for read-only users, and hide the old source panel when its session changes. It does not create a panel, toolbar, tab system or working-copy store. Since the artifact shell does not exist until WP2, actual shell integration and browser UI end-to-end testing remain future work.

## Interface inventory

**Unchanged:** Foundation 0.1.0 exports, `ArtifactEditorWorkspace` signatures, `ArtifactEditorTransport` signatures, all existing editor DTO shapes, `EditorWorkingCopy`, `EditorWorkingCopyHost`, snapshots/save states, checksum behavior and the existing build notification hook. The existing unrelated uncommitted Foundation/Phase 1 work was retained.

**Additive security interfaces:** `EditorPrincipal`, `EditorSessionDto`, `EditorOperation`, the server `EditorScope`, `EditorAuthorizer`, `EditorIdentityProvider`, `EditorSecurityOptions`, and the new security boundary/session/selector helpers. The initial identity implementation is the development session provider. Real identity-provider integration remains deferred; no production login is implied.

**HTTP security requirements:** artifact fetches now carry `x-editor-revision`; mutations also carry `x-editor-csrf` and same-origin Origin. These are wired inside the existing transport, leaving its calling signature unchanged. EventSource uses the existing `/api/events` URL with an optional `appKey` filter and the same session cookie. No event payload fields changed. The shared event endpoint now requires an authenticated fixture session; it is disabled together with the editor.

**New endpoint:** `GET /api/editor/session` obtains an anonymous/current session and allowed fixture labels; `POST` selects a configured `fixtureId`; `DELETE` signs out. POST/DELETE use JSON, CSRF and revision protection. The endpoint is unavailable when fixture mode is disabled.

**Intentional policy restriction:** non-admins cannot change artifact identity/type or save an unparsable raw manifest. Admins retain malformed-manifest source repair. Invalid declared file contents still autosave for app editors. This avoids deriving a less-restricted policy from newly supplied/unknown identity metadata; the Foundation parser and validation rules are unchanged.

## Legacy route audit

In fixture mode the central server guard intercepts every `/api` route before the existing dispatcher, after first handling the existing session, event and artifact endpoints. It allows only GET `/api/health`, `/api/templates`, and the global `/api/components` catalog to fall through. The deny is independent of role, so even the development admin fixture cannot reach a legacy writer/export route. Anonymous calls receive 401; any selected identity receives 403. With fixture mode disabled, the new guard returns control to the unchanged legacy dispatcher.

The audited server route families include platform application/template/component discovery and creation; platform/app package catalogs, install/acquire/enable/disable and package assets; foundation source discovery/install/refresh/update-preview/migrations/removal and app foundation dependencies; application info/settings/presentation initialization, draft save, publish, rollback, assets; page tree/move/source read/write/delete; app-service module reads; preview; application deletion; export and generated download retrieval; artifact endpoints; and global downloads. Encoded, unknown, trailing, and otherwise unmatched API aliases also hit the central deny-by-default guard. The tests exercise legacy source read/write/delete, app CRUD, app-services, package assets, presentation source/assets, app and platform package install/acquire, foundation operations, app settings, preview, component metadata and asset access, export/download, and general app/package catalogs.

Only health and global template/component metadata remain generally accessible. App-specific component discovery and package module URLs are denied. Project and installed app metadata returned by `/api/apps` is denied in fixture mode; user-authorized artifact discovery is the scoped alternative. This leaves the existing management interface limited in fixture mode until its future identity-aware redesign, while keeping unrelated safe local diagnostics and shared catalog data available.

## Remaining security and compatibility issues

1. **Revoked-copy recovery UI is deferred to WP2.** WP1 supplies the existing copy's `suspend`, `recover` and `discard` methods plus `suspendCopyOnIdentityChange` and `recoverSuspendedCopy`. WP2 must connect each open copy to the identity lifecycle, hide its pane on a revision change, and offer fresh comparison, reload/merge and explicit discard. No production shell existed in WP1 to mount those controls.
2. **Authorization unit is the artifact, not individual source fields.** Outgoing-reference metadata and generated diagnostics are filtered, but an authorized artifact's raw source can itself contain an authored ID referring to a restricted target. Source is not rewritten/redacted, which would corrupt editing. Field-level confidentiality is not implemented.
3. **In-flight transaction cancellation is unavailable.** Identity switching drains admitted transactions before acknowledgement; it cannot retroactively stop a transaction already inside Foundation. The new discard waits for admitted writes, explicitly makes no cancellation claim, then releases local memory. No transactional cancellation/authorization hook was added upstream.
4. **Future integrations remain disconnected.** Real I-AM authentication, production sessions, ACL administration, central stores outside the existing application service root, and build-engine instantiation are not part of this stage. The shared service/build hooks remain intact.

## Configuration for local verification

Use a server-only JSON settings file, with the actual application keys substituted:

```json
{
  "applications": ["tour-registration"],
  "ownership": {
    "tour-registration:restricted-artifact-id": "system"
  }
}
```

This creates the four default fixture identities scoped to those applications. An optional `fixtures` array can supply explicit `subjectId`, `label`, `roleIds`, `applicationKeys` and `isDevelopmentFixture: true`. No wildcard application grant is inferred.

Set `UI_PLATFORM_EDITOR=1`, `UI_PLATFORM_EDITOR_CONFIG` to that file, and start `npm run dev`. The launcher supplies `NODE_ENV=development` unless explicitly set otherwise. Direct `npm run dev:api` additionally needs `NODE_ENV=development`. Visit the local UI and choose **Development identity**. This is deliberate local impersonation, so every developer who can use the selector can choose any configured fixture; it is not authentication against hostile local users.

## Changed files

| Files | Purpose |
| --- | --- |
| `src/server/editor-security.ts`, `editor-security-config.ts` | Session, policy, request/event guards and configuration around existing workspace |
| `src/shared/editor-security.ts` | Serializable identity/session types |
| `src/client/artifact-editor/session.ts`, `identity-selector.ts`, `transport.ts`, `recovery.ts`, `working-copy.ts` | Revision-bound transport, selector, panel guards, recovery adapter and additive Phase 1 pause/recover/discard methods |
| `src/server/index.ts`, `scripts/dev.mjs`, `vite.config.ts`, `src/client/main.ts` | Route integration, loopback bindings and development-only mounting |
| `tests/artifact-editor.test.ts`, `tests/editor-security.test.ts`, `editor-security-client.test.ts`, `editor-security-server.test.ts` | Foundation host recovery, HTTP/SSE, transport, legacy-denial and real-process integration tests |
| `scripts/check-editor-contracts.mjs`, `check-editor-production.mjs`, `package.json` | Compatibility/security gate and production-client exclusion check |
| This report | Stage handoff, decisions and unresolved issues |

No dependencies were added; the pre-existing lockfile changes were preserved.

## Test evidence

- Security and recovery tests cover anonymous/denied/admin access to legacy aliases, preserved health/template/component routes, cross-application locator isolation, CSRF/origin/host checks, filtered artifact discovery/references/diagnostics/SSE, identity changes/revocation/expiry, rejected queued saves, original-user-only recovery, changed-checksum conflict choices, deliberate discard, and disabled/production server behavior.
- Full regression suite: **149 tests in 25 files passed**.
- Extended `check:editor-contracts`: **74 tests in 11 files passed**, including the original Phase 1, emitted exports, browser validation isolation, Windows storage, watcher and schema-adapter compatibility suites, recovery coverage and the compile-only consumer probe.
- Workspace typecheck passed.
- `check:editor-production` passed, including the full client/server build. Vite retains its existing non-blocking 635.92 kB chunk warning.

Failures and retries: the HTTP harness now uses raw Node HTTP because Node fetch omitted the hostile Host override, and it sets explicit DELETE-body framing. Real-server tests initially could not start tsx inside the Windows sandbox (`uv_os_get_passwd`/ENOMEM); they passed when rerun outside it. One compatibility run hit an intermittent Windows `EPERM` while renaming a directory under the existing recursive watcher test. The watcher suite passed on isolated single-worker retry, the compatibility gate passed on retry (**74/74**), and the complete suite passed (**149/149**). No Foundation or Phase 1 test was removed or weakened.

These results verify the artifact boundary, legacy API closure and recovery mechanics. WP2 remains unauthorized; no shell or recovery UI was started.
