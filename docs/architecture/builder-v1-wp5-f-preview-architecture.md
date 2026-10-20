# Builder V1 WP5-F — focused design-preview proposal

2026-10-18. **PROPOSED — GATE 2: PREVIEW ARCHITECTURE REVIEW. NO IMPLEMENTATION AUTHORIZED.** Functions-disabled, fixture-only, nonpersisting and non-effecting design inspection. Protected executable testing remains WP5-G. Ordinary running Applications retain authorized development persistence.

## Existing behavior and gaps

Reuse `src/server/visual-preview.ts`, native Visual/composition validation, `packages/visual-artifacts/src/runtime.ts`, `composition-runtime.ts`, `form-runtime.ts`, `composition.ts`, installed Component discovery and WP1/WP2 identity/lifecycle interfaces. The existing capture checks selected hash, discovers Visual dependencies, captures composition, checks related read authority and rereads participating bundles/composition. It is a useful starting point, not a demonstrated complete closure for this proposal.

`src/client/visual-artifacts/preview.ts` suppresses Visual functions and supplies empty services when a client message sets `design`. It still imports package modules, uses live package URLs and composition asset URLs, and otherwise can select ordinary Dataset services. It is not the required security boundary. `src/client/artifact-editor/form-preview.ts` flushes dirty work before opening; F must avoid that behavior. The existing `src/server/preview.ts` starts an ordinary Application runtime and is not a design host.

Native renderers interpret events, service/navigation declarations and instantiate custom elements. Empty service maps cannot control package initialization, browser-native links/forms, CSS requests or ambient browser APIs. The current implementation has no inspected comprehensive revocation push contract. No existing service is assumed to be globally snapshot-versioned.

## Capture and identity contract

An ephemeral preview session is scoped to original subject/session, authority, permanent Application ID (not key alone), selected owner-qualified artifact identity, mode=`design`, supported renderer version and capability-policy version. A random opaque session ID authorizes nothing by itself. Every retrieval requires matching original authority and fresh read admission. Requests cannot select another Application, live runtime mode or test service.

Capture identity is a deterministic hash of a canonical sorted manifest: selected artifact revision; all role-byte hashes; dependency identities/edges; collection membership needed for uniqueness/route validation; Platform Component revisions; package name, exact installed version, activation state, canonical manifest and participating executable/style/asset content digests; Shell/Region/routes; Menus; settings/theme/styles; asset bytes; renderer and policy version. Include safe sample-profile identity/values when producing a render identity. Keep authorization epoch/digest separate and bound to the session; it is a current authority check, not historical permission to display indefinitely. Hashes do not disclose source or grant access.

Use existing discovery/validators to compute transitive closure to a fixed point, with a visited owner-qualified identity set. Follow source references and metadata dependencies, nested Components/Forms, selected Shell/Regions, Menu routes and applicable theme/assets. Route tables and uniqueness checks may require wider Application metadata; record that membership without rendering unrelated Pages. Reject ambiguous IDs, missing required dependencies, unsupported edges/cycles under native rules, unreadable required definitions and unbounded/dynamic dependency discovery. Package module import and CSS resource closures must be complete before execution/loading. Package version strings alone do not establish immutable installed bytes.

Capture under the same D6 graph admission, using existing recovery-aware role readers. Record immutable bytes and inventories for participating inputs, release for pure validation where safe, then reacquire and recheck byte hashes, membership, activation, root identities and current authority. Only then publish a successful capture. Changes during capture yield explicit stale/busy/inconsistent failure; no partial render. A bounded read-only retry may begin a fresh complete capture within the explicit Refresh request; it cannot retain mixtures. No source writes or package installation occur.

Package installers, external tools and some asset writers may not cooperate with this graph lock. Inventory/hash rechecks detect observed races but are not proof against an adversarial external writer after the last check. Immutable delivery of captured bytes prevents later live substitution. If an input cannot be pinned and verified through the existing authority, preview is unavailable. Do not claim the graph lock snapshots I-AM, Data Services records, arbitrary modules or all runtime services.

Capture objects/manifests are ephemeral transport/session state, not a new persisted artifact format or publication/storage authority. Reuse existing source/package asset resolution with capture-qualified delivery; no new on-disk source catalog or Publish. Memory/resource limits and disposal apply.

## Renderer selection and representative samples

| Focus | Existing renderer / proposed sample contract |
| --- | --- |
| Page | `mountComposedPage` for composed Pages, otherwise supported native `mountVisualArtifact`; exact saved Page and applicable Shell/Regions |
| Shell/Regions | Same composition renderer with visibly labeled temporary sample Page/Region inputs, no saved artifacts; show named Region occupancy/default behavior |
| Platform Component | Native Visual renderer with supported typed public props, bindings, slots and safe sample context |
| Installed Package Component | Actual installed implementation only after explicit design-safety admission and exact-byte capture; no arbitrary module import for discovery |
| Form | Native Form/Visual semantics, declared supported mode and create/edit appearance, synthetic record-shaped fixtures; submission unavailable |
| Menu | Existing Menu/composition resolution, captured route metadata and safe parameter samples; navigation inspection only |
| Theme/branding | Existing `themeCss`/composition styling and captured logo/assets in a labeled representative sample; show theme identity and saved revision |

Fixtures and sample Regions are explicit temporary inputs, not substitute Components presented as the real implementation. If a required real dependency cannot safely render, show unavailable rather than a false success. Missing package metadata/modules, duplicate tags, disabled activation or unsupported version receive specific non-sensitive diagnostics. Do not invent public contracts. Renderer parity means supported declarative semantics and actual approved implementations; arbitrary executable parity is excluded.

## Security boundary and enforcement

The recommended host combines server-enforced design sessions, constrained captured content and a browser-restricted rendering context. An iframe alone is insufficient. Before rendering, validate the entire HTML/CSS/resource and package closure against the design policy. Disallow executable HTML attributes/scripts, embedded documents, unapproved URL schemes and unresolved dynamic resource loading. A rejected construct makes that preview unavailable; do not silently rewrite semantics and call it parity.

Use a sandboxed opaque-origin frame allowing only the trusted renderer bootstrap scripts, with no same-origin permission, top navigation, popups, forms submission or downloads. Enforce a response CSP restricting scripts to exact approved bootstrap/package bytes, `connect-src 'none'`, no workers/objects/frames, and images/fonts/media/styles only from admitted captured resources. Exclude arbitrary blob-script execution and dynamic imports. Parent/frame communication checks exact frame window, per-session nonce, schema and sequence; opaque-origin messages cannot rely on an origin string alone. Capture transport into the frame is data-only; no credentials or live endpoints enter it. Prototype the module/CSP/captured-resource compatibility before claiming this combination works.

Browser restrictions do not fully sandbox allowed JavaScript or stop CPU denial of service. Therefore arbitrary custom/package code is excluded even inside this host. Admit only existing trusted package implementations with an audited non-effecting design path and a complete dependency closure; unknown implementations remain unavailable. A package requiring external effects or arbitrary initialization cannot run under F. Any required package API change is an explicit prerequisite, not permission to register new services.

| Surface | Proposed enforcement and honest behavior |
| --- | --- |
| Dataset/record reads | No live record reads in F, including initialization and lookup labels. Server session has no data-service capability; frame has no authenticated transport. Synthetic samples only |
| Protected fields | Existing authority filters source/field metadata before delivery; excluded fields never enter capture/fixtures. Do not use copied real records. If a complete safe Form contract cannot be obtained, unavailable |
| Identity/ownership | Server binds permanent owner and original subject; admission checks at capture and every delivery. No key/focus retargeting; revoke on session/owner/policy change |
| Network/resources | CSP plus prevalidated URL/import/CSS closure, no live resource fallback, credentialless opaque host, no connect channel. Parent responds only to capture resource IDs, never arbitrary URLs |
| Menu/routes | Render captured destinations and record inspected intent. Do not navigate the Application, parent, external URL or ordinary runtime. Other route preview requires explicit selection/capture |
| Lifecycle hooks | Visual functions never compiled/delivered/executed for design; unsafe package initialization denied before import. Audit native trusted hooks for hidden effects |
| Forms/buttons/events | Local typed input/state/expression inspection permitted where native declarative behavior is safe. Submission, delete, upload and external/native form actions disabled at policy/host boundary; no live service adapters |
| Workflow/Trigger/services | No execution capability or endpoints in design sessions. Server denies design-session attempts even if requests are forged. Existing ordinary Application credentials must never be supplied to preview code |
| Uploads/mutations/Publish | No capability, no file-selection/upload path, no storage or release calls. Parent message handler has no forwarding command for them |
| Cross-origin/embeds | Deny frames/objects/remote images/fonts/styles/scripts, SVG external references and embedded executable content. Only validated captured resources; otherwise unavailable |

Capabilities are immutable server-issued design policy, never selected by an untrusted client `design` Boolean. A request to upgrade mode is denied. Existing protected APIs retain their own authority; extending mode enforcement must not introduce a competing identity/security authority. Native trusted code and policy enforcement need explicit negative tests; this document does not assert mechanisms already implemented.

Sample data is authored synthetic content labeled **SAMPLE DATA**, structurally validated against the supported public/Form schema and visibility policy. Never seed from production or development records, even for an edit sample. Editing samples changes only ephemeral state and marks sample variation; it neither edits saved source nor becomes a live record authority.

## Lifecycle, drafts and stale content

Preview state is owned alongside WP1 workspace tabs and keyed by original subject, Application, selected identity and capture ID. It does not own an editing working copy. Opening/refreshing reads the latest saved revision through existing services; it never calls `flush`, Save Now, reload/discard or editor-history operations. Display **Saved revision …; unsaved changes excluded** when dirty. Autosave keeps its existing configured behavior independently; any resulting source change marks the preview stale rather than silently replacing it.

States: empty → capturing → ready; dependency changes → **STALE PREVIEW**; explicit Refresh → capturing a candidate; failure → visible capture error, retaining the last authorized successful view with its original identity and truthful stale/last-capture status. Keep successful content separate from the pending capture so failed/late requests cannot replace it. Selection changes require a clearly identified new preview request; never relabel an old capture as the newly selected artifact. Sequence/disposal guards reject late responses.

Watch invalidations for transitive role, inventory, package activation/version/content, Menu/route, theme/style/asset and policy changes. Notifications trigger an identity/currentness check, not recapture. Watchers are hints; refresh/delivery rechecks hashes and membership. If currentness cannot be checked, label it unknown/stale, not current. On stale, disable all interactive behavior and retain historical display only, using inert host state and destroying listeners/timers; if native runtime cannot freeze safely, retain a safe static display of the last admitted DOM without rerunning hooks. If that cannot preserve safe/accurate content, show unavailable and explain. No stale record/service operation is possible.

Revocation is different from staleness: immediately hide/destroy protected display when trusted authority invalidation or subject/session change is observed; abort captures, clear resource access and discard retained content. Reauthorization does not silently restore old content; require explicit refresh. Server checks prevent further delivery but cannot recall disclosed bytes. Literal instantaneous remote revocation is not achievable by periodic polling. A trusted authority-driven invalidation channel, fail-closed connection handling and defined revocation semantics are missing prerequisites; protected preview activation must wait if the requirement cannot be met. This limitation must be reviewed explicitly, never redefined as stale retention.

On close, owner switch, logout, revocation or eviction: abort pending work; destroy runtime instances; remove listeners/observers; cancel timers; revoke object/resource URLs; release captured buffers/package registrations by disposing the frame; end server session. Bound per-user/session count, byte size and lifetime with explicit resource-limit errors. Expired sessions release resources and require explicit refresh. Existing dirty drafts remain recoverable under their original WP2 identity.

## Implementation stages, dependencies and risks

After explicit implementation authorization: (1) audit supported types and safe packages; define immutable capture and design capability contract; (2) implement and prove restricted delivery/host and authority invalidation; (3) integrate existing renderers and focus-preserving state; (4) add representative samples and stale/cleanup behavior; (5) execute verification matrix. Unsupported executable components remain unavailable throughout, rather than becoming a reason to run code.

D6 supplies the capture acquisition/freshness contract. Local state and pure policy/closure work can be independently authorized, but concurrent capture integration cannot be accepted before D6 evidence. No second graph coordinator. Risks include incomplete module/CSS closure, mutable package bytes, native browser behavior, unversioned authority, freeze accuracy and memory pressure. A security-boundary compatibility failure is a prerequisite stop, not permission for a new renderer or relaxed policy.

## Verification plan after implementation authorization

Actual browser verification must use the intended restricted host, not only mocked APIs. Record supported versions, artifact/capture identity, safe sample identity and denied capability outcomes. New evidence belongs in a separate location; historical evidence remains untouched.

| Coverage | Required observations |
| --- | --- |
| Page, Shell/Regions, Platform Component, admitted installed Component, Form, Menu, theme/branding | Actual shared-renderer output, representative supported props/slots/Region samples, Form modes and route parameters; exact identity visible |
| Selected saved revision with dirty drafts | No save/flush request due to preview; dirty bytes, focus, selection and Undo/Redo retained; sample data clearly labeled |
| Dependency/asset/theme/package changes | Old content retained visibly stale and inert; no automatic replacement; explicit refresh captures new complete identity |
| Change during capture, missing/cyclic/denied dependency, package module changed at same version | No mixed/partial new render; safe failure then explicit recovery; last authorized successful capture preserved truthfully |
| Unsupported executable Component | No import or initialization observed, clear unavailable state; no misleading replacement |
| Denied/revoked identity, owner switch and invalidation-channel loss | No protected source on denial; displayed content hidden on invalidation; pending responses discarded; server resources unavailable |
| Forms/buttons/links/navigation/uploads | Safe local state only while current; no native navigation, submit, mutation, Workflow/Trigger or Publish; stale state inert |
| Network and storage probes | Browser request interception plus server/service spies and before/after development/production store hashes prove zero unauthorized requests/reads and zero writes/effects; include CSS URLs, fonts, images, embeds, native forms, hooks and forged messages |
| Simultaneous Builder/runtime | Keep both processes/browsers active, overlap saves, Problems, capture/refresh and runtime loads; D6 coherence and ordinary runtime persistence preserved |
| Cleanup and races | Close/reopen, late capture response, repeated refresh, expired session, revoked resource URL and cross-session token replay; no retained executable instance or leaked access |

Unit/contract tests should cover manifest canonicalization, closure membership/ABA changes, capability tampering, stale sequencing and scope disposal with deterministic barriers. Browser tests must independently observe side effects at receiving services/network and compare stores; hiding controls or absence of a displayed success message is not evidence of isolation. Unsupported states count as honest safety coverage, not proof that all package types render.

## Gate 2 acceptance and decisions

Approve/revise fixture-only reads, exact captured-byte delivery, restricted host and fail-closed package admission; identify the initially supported safe package set through audit rather than assumption. Resolve authorization invalidation semantics/prerequisite before enabling protected display. The stale-retention decision is already approved by the user. Acceptance requires all supported artifact types and security/lifecycle cases evidenced, with explicit unavailable states and remaining limitations. **STOP AT GATE 2. Architecture approval alone does not authorize implementation, WP5-G or closure.**
