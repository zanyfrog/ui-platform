# WP5-F L1-A — D6 evidence correlation and coherent capture boundary audit

2026-10-23. **Documentation-only architecture review.** L2-B is [accepted within its model limits](builder-v1-wp5-f-l2b-closure-20261023.md). Complete WP5-F, D6 and WP5-I remain open and unaccepted; all 40 umbrella checks remain unchecked.

## Findings

Existing source establishes graph/role admission and repeated participating-byte checks, not a complete production capture authority or immutable resource provider. Historical evidence identifies some acquisition failures, but does not supply complete request-to-owner causality for all integration failures. The WP5-C failing insert cannot be reconstructed as a typed failure from the original record; the later complete diagnostic operation passed. No recovery prescription follows from ambiguous historical ownership.

This review read existing ordinary source and historical reports/JSON only. It did not invoke a source reader, inspect current owner/PID/lock state, access a Component/store/journal/transaction, launch backend/browser, read I-AM state, run tests/builds or implement a model. A stored JSON observation of a historical lock is evidence text, not a current-state check. No historical failure is replaced by a later pass.

## 1. Chronology and request-to-outcome ledger

References are existing architecture documents and their named evidence, not newly executed reproductions. Times retained as recorded; the October 20 01:15 UTC WP5-C reproduction occurred October 19 local evening and must not be conflated with the later owner observations.

| Stage and exact recorded boundary | Request / operation identity and typed result | Proven phase; missing correlation; replayability from records |
| --- | --- | --- |
| Pre-D6 full UI **474/476** and accepted-source investigations, summarized in `builder-v1-wp5-f-d6-architecture.md` | WP5-B Visual save and WP4 invalid Dataset-name journey; WP4 recorded generic HTTP 409 lock error instead of native 422 | Lock rejection mechanism recorded; exact owner PID/hold/nesting per request absent. Accepted-source WP5-B reproduced; WP4 comparison stopped earlier on missing Dataset contract. No complete workload/owner schedule can be replayed from records alone |
| D6 measured baseline and admission implementation, `builder-v1-wp5-f-d6-verification.md` | `measured-baseline.json` reports live-owner rejection with waiting disabled, typed `source.busy`/503 rather than historical generic 409 | Demonstrates acquisition mechanism, not identical historical status or cause. Measurements do not reconstruct missing original request correlation |
| D6 intermediate **476/488**, **34/35**, **21/22**, then bounded **35/35**, **72/72**, simultaneous **1/1** | Migration coordination failures, outer PID-test timeout, overlapping WP5-B read exhaustion; later bounded/corrected workloads pass | Each has its own assertion boundary. Passing strengthened journey retains three save/Problems/runtime overlaps; it does not retroactively diagnose every failure or establish arbitrary load fairness |
| D6 final **488/489**, isolated `wp4-ready.json` **0/1** | WP4 ordinary runtime Form; stronger pre-submit check finds `''` instead of `Browser Application` at test line 293. Diagnostic reports no application-data request | Input loss/source-triggered reload before write, not a demonstrated rejected storage transaction. Exact post-commit persistence failure cannot be inferred because no write occurred. Later Form-refresh/publication evidence addresses this workload separately |
| Subsequent publication/Windows verification **495/496**, elevated **493/496**, correction **499/501** | Historical rename EPERM, WP4 timeout (including recorded Modern Standby overlap in one run), WP5-C Save Now poll checkpoint | Preserve distinct cases. Windows operation predicate/holder and earlier WP5-C save-poll cause remain unknown. Do not equate source busy, malformed owner, NTFS rejection and UI timeout |
| Final UI follow-up 2026-10-19 **500/501**, `builder-v1-wp5-f-publication-final-ui.md`, `full-ui.log:872–886` | POST `/api/apps/wp5c-created/application-data/operations`, insert records `selected/Ada`, `unrelated/Keep`; test `builder-v1-wp5-c-browser.test.ts:161` receives `{success:false, committed:false}` | Assertion only. HTTP status, typed error, operation/correlation ID, commitOutcome and engine failure phase are **unknown**. Stops before Workflow authoring and prior Save Now poll. No recorded link to graph contention, watcher change or owner ambiguity. Cannot reproduce original failing operation from evidence alone |
| Targeted WP5-C passing diagnostic, `.../evidence/builder-v1-wp5-f-wp5c-insert-diagnostic/observations.jsonl:1–2` | Host POST `/operations` and matching platform route both HTTP 200; operation/correlation `2f96d69e-837c-4320-9953-619b2694a36c`; `success:true`, `committed:true`, `commitOutcome:committed`, 2 requested/succeeded | Host 01:15:35.608–01:15:36.389 UTC, platform observation 01:15:36.405 UTC on Oct 20. Both transport responses match; intended records later observed. This proves that successful attempt only; instrumentation can change scheduling. It does not recover missing failed response fields |
| Foundation diagnostic/remediation, historical **491/501**, then focused **56/62** | New typed unresolved-owner behavior and six retained UI failures detailed below | Classification correction has deterministic support; historical creator/publication history and causal attribution remain unproven. Focused result is not a full-suite replacement |
| October 20 checkpoint reconciliation | `c86ecb3708fd619791b7f667b02b0c4c673bd686`, parent `7050993160cee3ffeb49674fa4696dc6ff8f694a`; 26 non-documentation paths match applicable phase inventories | Source/provenance reconciliation, not test success, approval of commit act or proof of storage behavior. Eleven omitted diagnostic inventory entries, 17 CRLF/LF-only differences and ten intentionally unhashed manifest self-entries remain distinguished; later hash addendum does not establish original generation provenance |

The ordering above groups implementation stages; historical full-suite counts are not monotonically improving results or additive coverage. Exact details remain in [D6 verification](builder-v1-wp5-f-d6-verification.md), [Form refresh](builder-v1-wp5-f-form-refresh.md), [publication correction](builder-v1-wp5-f-publication-correction.md), [final UI](builder-v1-wp5-f-publication-final-ui.md), [WP5-C diagnostic](builder-v1-wp5-f-wp5c-initial-insert-diagnostic.md), [Foundation diagnostic](builder-v1-wp5-f-foundation-lock-diagnostic.md), [remediation](builder-v1-wp5-f-foundation-remediation.md), [checkpoint review](builder-v1-wp5-f-exclusive-maintenance-git-review.md) and [provenance addendum](builder-v1-wp5-f-winpe-evidence-addendum.md).

### Focused Foundation selection: six distinct failures

Raw reference: `docs/architecture/evidence/builder-v1-wp5-f-foundation-remediation/ui-focused-results.json`; full stderr interpretation remains in the remediation report.

| Failure | Exact observable request/phase | Unknowns and safe inference |
| --- | --- | --- |
| Application composition, test line 91 | Stack: `VisualArtifactService.read` → `visual-source-plan.ts:76` → `template-updates.ts:89`; `ArtifactOwnerUnresolvedError`, code `source.owner-unresolved` (503 classification) | Shared-Component reread during source-plan commit is established. This test is not a uniquely correlated HTTP request; stack alone does not identify every observed lock or creator |
| WP4 line 142 | Click waits for Generic Editor Dataset Mapping tab, 15000ms timeout | UI boundary only; actual failing backend response/typed code/operation ID absent. No runtime Form submission reached |
| WP5-B line 137 | Waiting `/datasets/create` response, then `.manifest.artifactId` access fails on absent manifest | Request suffix and failed response shape known from test source; full response/status/correlation absent in assertion. No later Visual save/overlap evidence from this attempt |
| WP5-D line 140 | `menu record` tab attribute poll, 15000ms timeout | No uniquely identified backend failure; previous branding checkpoint not reached. Do not diagnose owner ambiguity from timeout |
| WP5-E line 159 | Page creation POST ending `/visual-pages`, expected 201, actual 503 with `source.busy`; local graph wait ~5005.6ms, hold=0, acquired=false, process ID 15104 in retained trace | Graph admission exhaustion established. Trace has no request ID/owner identity; process/time proximity is insufficient to prove which earlier operation or role caused contention |
| Visual artifact reference validation line 158 | Diagnostics unequal to empty; retained console has `Invalid artifact structure: Cannot read properties of undefined (reading 'metadata')` | Structural/diagnostic failure established. `VisualArtifactService.list()` can convert read failures into diagnostic bundles, but exact initiating role/request/causal chain not preserved for this assertion |

Separate historical `existing-lock-inspection.json` at **2026-10-20T02:45:59.285Z** names canonical anchor `components/wp5b-shared-9b12bff2/component.visual.json`, identity key `eeea95554098a2bf3112bf6532920d01f1393311b2047ed54a37bdb02126e5c5`, empty owner text and a `source.owner-unresolved`/503 refusal after about 5006.45ms. The record preserves unchanged before/after bytes and metadata and reports no admitted protected callback. This associates that historical explicit probe with that role; it does **not** identify a creator/PID, prove abandonment, explain the earlier WP5-C insert, or correlate all six UI failures to one lock. No current file or owner was inspected here.

### Missing correlation specification (proposal only)

For any separately authorized future reproduction, preserve one request/correlation ID from browser → API → normal host/engine and link it to operation ID, original subject/session generation, permanent Application/selected artifact identity, route/method, response status/full structured outcome and timestamps. Separate acquisition-start/entered/refused, authority check, schema/source validation, engine admission, commit/rollback/unknown commit, readback and transport delivery. Record safe source revision/owner-identity digests and graph-vs-role phase, not credentials or source payload. Duration-only graph metrics cannot supply that causal join. Missing typed outcomes must remain unknown; `committed:false` alone neither proves rollback nor identifies a pre-commit phase.

## 2. Existing source/read/write responsibilities

Only source text inspected; paths do not constitute execution permission.

| Existing source boundary | Readers / writers and responsibility | Actual protection / gap versus production capture |
| --- | --- | --- |
| `packages/artifacts/src/storage.ts:withArtifactLock` | Existing acquisition queue/exclusive filesystem protocol, cancellation, owner classification; journal/transaction functions called by role layer | Acquisition-only wait; admitted callback not replayed. Unknown owner fails closed. No new recovery authority. Source inspection does not establish current owner or operational availability |
| `packages/artifacts/src/role-bundle.ts:withRoleBundleGraph` | Shared graph namespace `visual-runtime-graph-v1` under canonical owner root | Cooperating graph readers/writers serialize when configured to the same root. Root equality and every-writer participation require integration proof. Not a multi-artifact transaction or policy lock |
| Same file: `locked`, `readRoleBundle` | Canonical root/path/casing checks; role lock; recovery-aware snapshot of explicit roles | Reader can invoke transaction recovery under its existing authority; therefore even a nominal read is prohibited in this review. Per-role coherence does not alone guarantee whole-graph/membership coherence |
| Same file: `saveRoleBundle` | Expected checksum, complete staged role validation, current-byte recheck before/after `admit`, journaled write and committed readback | Cooperating writer boundary. No multi-role-bundle ACID; no replay of admitted work. Capture must reuse it rather than read around refused admission |
| `server/composition-lock.ts:withApplicationMutation`; `visual-artifacts/src/runtime-read-admission.ts:withRuntimeGraphRead` | Application mutations use Platform Components graph root; runtime read wrapper delegates once with supplied options | Request acquisition can be cancelled. No second graph scheduler or retry of capture callbacks is needed. Existing configured runtime callers still need root/closure audit |
| `server/visual-artifacts.ts:VisualArtifactService` | List performs recovery-aware discovery and bounded reads; read captures roles/metadata/hash; save uses Foundation role writer; create/remove have their own admission/publication paths | Collection membership and diagnostic bundles must be treated explicitly. A failed list member is not a successful absent dependency. Do not skip unreadable shared Components to obtain a successful capture |
| `server/visual-source-plan.ts:prepareVisualSourcePlan` | Template/source multi-artifact planner lists shared definitions, stages Page/Shell changes; commit rereads role checksums, composition source strings and all captured shared Components; calls original admission | Caller holds graph. Per-artifact commits may produce explicit partial-operation failure; no cross-artifact Undo/transaction. This explains reachability of shared rereads, not every historical failure's causal identity |
| `server/visual-preview.ts:visualPreviewRevision` | Legacy reader enters runtime graph, discovers packages/workspace, checks selected expected hash, follows Component references/dependencies and applicable Shell, checks related read access, rereads participating bundles and composition | Useful existing revision pinning. Missing reference currently can `continue`; diagnostics and broad workspace validation may reject, but a complete explicit missing-edge refusal is not proven by this helper alone. Package discovery is not reread as exact immutable module/resource bytes. Compiled function code is legacy behavior, not approved F design execution |
| Runtime revision/source loaders in `packages/visual-artifacts/src/`; server normal Visual mutation routes | Graph capture/managed revision checks and source writer integration are existing callers; ordinary runtime helpers and mutations retain their own semantics | Broader normal execution not admitted here. External editors/package installers/assets may not cooperate. Final rechecks are observations, not protection from all post-check external writes |
| `server/builder-workspace.ts`, `shared/builder-workspace.ts` | Owner-qualified identity; permanent Application checks; policy digest/original-subject checks; Problems source/membership/revision revalidation | Reuse existing authorities and owner services. Repair-only locator is distinct from executable permanent identity. Workspace visibility or membership cannot replace per-source/related/field read admission |
| `development-application-registry.ts`, `applications.ts`; existing I-AM/session contracts | Registered permanent ownership plus current manifest/settings validity; original identity and policy read decisions | Source acquisition must pin/recheck original owner without recursive graph admission. Policy is independent of source lock. Schema/field visibility must be filtered by existing owner/security services, never by fixture assumptions or copied records |
| `component-registry.ts`, composition/presentation/package services | Package activation/catalog/module locations, routes/Shell/Region/Menu/theme/assets and writer-specific operations | Current live URLs/catalog metadata are insufficient immutable capture. Exact executable/style/resource bytes, activation and relevant collection membership must be admitted. No assertion that all installers/assets/settings writers already hold graph lock |

Read/write coverage is a responsibility audit, not a claim that every repository/deployment writer is enumerated or operationally verified. Legacy preview, workspace discovery, template update, runtime compile and normal Visual mutation are distinct workloads even when they share the graph root.

## 3. Proposed minimal synthetic coherent-capture contract (not implemented)

Use L2-A original binding and separate authority epoch, and L2-B canonical content identity/resources. Extend the authored model with **source acquisition observations**, not a provider or second source catalog. Types below are specification only; no `.ts` file or tests are created.

```ts
type RoleObservation = {
  ownerQualifiedIdentity: string; role: string;
  nativeRevision: string; byteDigest: string; bytes: Uint8Array;
};
type Membership = { scope: string; orderedIdentities: string[]; digest: string };
type SourcePass = {
  originalApplicationId: string; ownerValidity: string;
  selectedIdentity: string; selectedRevision: string;
  roles: RoleObservation[];
  edges: { from: string; to: string; kind: string }[];
  memberships: Membership[];
  admission: 'entered' | 'busy' | 'owner-unresolved' | 'recovery-required';
};
type CaptureDecision =
  | { kind: 'complete'; immutableContentId: string }
  | { kind: 'refused'; reason: 'busy' | 'owner-unresolved' | 'recovery-required' |
      'owner-changed' | 'missing' | 'ambiguous' | 'changed' | 'visibility' |
      'unsupported' | 'limit' | 'authority-changed' };
```

Authored procedure:

1. Pin original permanent Application, owner-qualified selected identity, selected saved revision and current authority epoch. Reject repair-only/duplicate/ambiguous identity, missing owner validity or denied schema/field scope. Draft bytes never enter acquisition; capture does not flush/save/reload/discard or alter history/autosave.
2. Model acquisition of the **existing** graph then role boundaries. Busy/unresolved/recovery-required produces refusal with no candidate. No ownership inference, bypass, source fallback or callback retry after entry. The model cannot claim actual graph participation merely because an authored admission answer says entered.
3. Build selected role set and dependency closure to a finite fixed point. Include applicable Shell/Regions, nested Components/Form metadata, routes/Menus and uniqueness membership, packages/activation/manifests/executable/resources, theme/styles/assets. Each required reference resolves exactly once under original owner and visibility. Missing/unreadable/ambiguous/dynamic/unsupported edges refuse. Native cycle rules require Lane 3: model detection is not native admission.
4. Copy exact role/resource bytes with native revisions/digests and collection membership/order. Use explicit semantic ordinals rather than sorting away route precedence. Record deleted/added/renamed collection members even when selected role bytes are unchanged. No private fields/records are copied to samples.
5. If validation is detached from graph admission, a later approved acquisition/recheck must compare all participating bytes/revisions, owner validity, dependency edges, package activation/exact bytes and necessary membership, plus fresh authority. A changed revision/owner/member/dependency is refusal of the **whole candidate**, never partial replacement. No nested graph admission or replay of an already admitted callback. Exact detach/reacquire policy remains an architecture detail to approve, not a source implementation claim.
6. Only an entirely matching, authorized closure becomes a canonical immutable content manifest plus separate original binding/epoch. Immutable retained bytes, not live paths, are the sole future delivery inputs. L2-B's typed memory model is reusable vocabulary; it does not acquire coherent saved bytes or prove real visibility.

Authored scenarios for a future separately authorized model: matching passes → complete; selected/role byte or revision change → changed; added/removed/reordered membership → changed; missing dependency → missing; two owners or duplicate identity → ambiguous; owner validity switch → owner-changed; acquisition refusal → original typed refusal; denied field → visibility; package same version/new bytes → changed; policy/session change between passes → authority-changed. Preserve a prior authorized display only under L2-A stale rules; a failed new candidate must not mix its resources with that prior capture. Revocation clears both. No model execution occurs in L1-A.

## 4. Answerable questions and separate verification boundaries

| Category | What this review can conclude / next bounded decision |
| --- | --- |
| Existing records/source answer | The listed assertion/HTTP boundaries, known successful operation ID, recorded unresolved-owner probe identity, graph-vs-role structure, repeated source checks, missing immutable package/resource proof and limits of historical attribution |
| Additional correlation instrumentation needed | Full failed WP5-C response and host/engine phases; request↔graph/role wait join; complete Dataset/Page creation failures and source diagnostics behind UI timeouts. Design exact fields and privacy/error handling first; do not implement observers under this authorization |
| Pure authored model could answer | No-mixture decision invariants, membership/owner/byte-change refusal, canonical manifest inputs and candidate sequencing. Needs separate model implementation/test authorization and exact import/setup allowlist |
| Real D6/protected execution required | Actual acquisition/root equality/writer participation, recovery-aware readers, concurrent saved changes, partial writes/refusal, field visibility/owner revalidation, real failed-request reproduction and original editing/runtime preservation. No actual protected action is authorized now |
| Authority/native integration independently required | L2-A durable all-writer invalidation and fresh per-delivery authority; L3 native execution/resource closure. Coherent bytes alone cannot activate production Preview |

Smallest separately authorizable increments:

1. **L1-B pure acquisition-observation model**, authored passes only, reusing L2 identity/manifest concepts; exact newly named files and serial zero-retry test entry, no imports of Foundation/readers/services. Acceptance limited to no mixed generations and explicit typed refusals.
2. **Correlation design/instrumentation review**, initially source/document-only: identify the one operation capable of answering a specific unknown, define full structured response/phase capture and preserve accepted assertions. Instrumentation implementation, if later authorized, must be isolated and must not change actor/authority, readiness, budgets or retries. Do not run a complete suite seeking green.
3. **One correlated reproduction**, only with explicit real-backend/protected-state execution authorization, safe readiness and separately resolved operational prerequisites. Candidate is WP5-C initial insert for unknown operation phase, or a single source-admission request for contention—not a conflated workload. A new pass cannot reconstruct the old failure. If protected admission refuses, preserve that refusal and stop affected execution; no cleanup follows.
4. **D6 focused verification**, only after its unresolved operational gate is separately addressed and exact tests/root/writer closure are admitted. Preserve original functional assertions and strengthened simultaneous behavior; reconsider complete-suite readiness only on evidence. Existing 55 deferred Foundation tests are not allowlisted here.

## 5. Activation conditions and stop

Saved-artifact capture must remain unavailable until all applicable conditions are separately evidenced and accepted: D6 graph/role acquisition and coherent membership under cooperating writers; unresolved operational blockers handled by an independently authorized decision; permanent original owner/schema/field read visibility; complete transitive native/package/resource closure; canonical exact-byte capture and explicit changed/missing/ambiguous refusal; immutable delivery with no live fallback; trusted policy/session/owner invalidation and healthy reconciliation; reviewed timing/limits and production disclosure-race semantics; native design admission; editing/autosave/runtime preservation and cleanup/concurrency evidence. No increased timeout, skipped shared Component, inferred dead owner or second scheduler substitutes for these conditions.

No recovery is prescribed solely from the historical empty owner. Windows Identity/N01, token/elevation, VM/WinPE, current owner/PID/lock inspection and Foundation recovery remain paused. Missing evidence stops the affected causal conclusion; independent source/document review is complete without speculative diagnosis.

## Inventory and preservation

Only this audit, the L2-B closure and [new inventory](builder-v1-wp5-f-l1a-files-20261023.json) are added. Before these documents, the inventory captured **1494 admitted existing file hashes** in the workspace and checked the L2-B hashed entries with no mismatch. Final inventory records before/after preservation, reference hashes and new-file hashes; its self-entry is intentionally unhashed. Historical reports/evidence, accepted code/tests/configuration, inventories and checklists are preserved. This is enumerated ordinary source/evidence accounting, not protected-store or OS preservation.

**STOP AT WP5-F L1-A Coherent Capture Evidence and Boundary — Architecture Review Gate.** No implementation, tests/builds, source acquisition, backend/I-AM access, protected Component/store/lock/journal/transaction/recovery access, Windows work, commit, push or GitHub synchronization occurred. D6, complete WP5-F and WP5-I remain unaccepted and open; all 40 umbrella requirements remain unchecked.
