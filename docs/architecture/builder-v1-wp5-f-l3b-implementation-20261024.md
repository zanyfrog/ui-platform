# WP5-F L3-B — Canonical Card Captured-Input Compatibility

2026-10-24, America/New_York. **Implemented within the authored-input boundary; awaiting increment acceptance.** [L3-A closure](builder-v1-wp5-f-l3a-closure-20261024.md) records the user's architecture-scope acceptance. Complete WP5-F, D6 and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.

## Outcome and exact implementation

New standalone modules under `src/client/native-card-preview/` implement narrow input admission, exact host-message checks, restricted frame construction and native Card rendering. No existing production source/call site is changed. The actual installed `@ui-base/ui` 0.5.1 canonical Definition, ComponentRegistry.registerManifest, Definition/settings validators, renderComponentInstance with preview:true and unchanged UibCard are used. There is no replacement Card renderer or live manifest retrieval.

`admission.ts` validates authored JSON before constructing a native Card: exact package/component/schema, canonical Definition digest, admitted executable-closure fingerprint, fixed bundle digest, authored activation, separately supplied original binding/epoch/allow answer, expiry, limits, canonical content digest and finite supported settings. Inputs are copied; malformed/accessor/non-JSON data and unknown capabilities reject. The actual Definition determines types, defaults, visible-when constraints and accessible-name requirements; the adapter does not silently translate unsupported behavior.

`host.ts` admits input before creating a new frame, checks exact trusted bootstrap bytes, then uses the existing opaque-origin allow-scripts/credentialless pattern and the **same CSP directives** as accepted fixture host. `frame.ts` admits the received captured input again before registerManifest/renderComponentInstance. Fixed trusted native-module registration happens earlier and is explicitly distinguished from input-dependent construction. Registry fetching, services, handlers, live resources and dynamic module imports are never invoked.

Refresh removes executable old content and may retain only textContent stale summary. Failed Refresh cannot leave a native interactive tree. Invalidation clears summary/frame and latches the host; terminal dispose removes it. Sequence guards prevent a late candidate from recreating the frame. The parent/frame exchange has exact Window/origin/nonce/session/identity/sequence/type checks; Save/Publish or arbitrary forwarding commands do not exist.

This is a new compatibility boundary, not ordinary Builder wiring, real source capture, trusted resource delivery or real authorization. The frame uses a fixed authored authority context and injected timestamp; there is no authority channel or autonomous production expiry scheduler. Numeric input limits/deadlines are supplied by the authored test profile, not production defaults. The bootstrap startup timeout follows the existing host pattern and is not a revocation/health SLA.

## Dependency admission before implementation

[The pre-implementation admission](builder-v1-wp5-f-l3b-preimplementation-admission-20261024.md) and `native-admission-before-code.json` were written before adapter/host/frame code. Installed export resolution points to the reviewed sibling package sources, not alternate nested copies. Exact closure: 13 native JS modules across UI 0.5.1, Core 0.1.0 and Icons 0.1.0, plus package export/version manifests and canonical Definition JSON. Every native file/manifest hash is checked before each verification run and in final preservation.

Fixed initialization registers 13 actual tags: uib-icon, stack/grid/row/column/panel/card/dialog/accordion/tab/tab-panel/tabs/splitter. Core's existing CSS-class prototype wrappers, local ID/catalog data and fixed icon SVG registry are included. No broad platform barrel, workspace/property editor, Visual runtime, Forms barrel or new service is executed. Registry's default loadCardRegistry fetch path is excluded.

Each run records closure/Definition/fixed-bundle digests, full source admission and esbuild graphs. Closure identity pins module byte hashes/package export maps/Definition manifest; the Definition digest separately hashes canonical Definition content. Bundle identity hashes the exact escaped trusted script, including test-only probe prelude in the final browser verification. Content identity binds schema/package/component/settings plus those byte identities and activation. Original binding/authorization epoch remains separate. Tokens and source/backend capabilities are not supplied to the frame.

Esbuild warns that import.meta is unavailable in IIFE for the uncalled loadCardRegistry default URL expression. The forbidden fetching loader is never used; direct supplied manifest registration succeeds. No native code/export/policy was changed to suppress this warning. The executed graph contains the actual admitted native implementation.

## Scoped verification and retained failures

Exact unit entry: `tests/preview-contract-model/native-card-admission.test.ts` (46 named tests). Pure closure: new admission/message, authored input helper/real manifest and native Definition validator; no DOM or native constructor executes in Node. Browser entries: new frame plus `tests/fixture-preview/native-card-capture-harness.ts`. Additional test-only `native-card-probe.js` runs first inside the hash-pinned script to count real registrations, Card createElement calls and MutationObserver observe/disconnect. It preserves underlying browser calls, does not replace native Card and is not part of production integration.

Dedicated verifier `scripts/verify-native-card-capture.mjs` rejects unlisted esbuild input files, hashes inputs, uses one named serial Node test with zero retries and no NODE_OPTIONS/NODE_PATH, and starts an exact two-route loopback server (`/`, `/harness.js`) with memory assets only. Browser execution is serial, no retries, no normal npm/Vite/Vitest/workspace setup. Old fixture smoke directly uses unchanged FixtureHost + Card/Panel defaults and existing bootstrap with only its pure composition/source helper closure; the broader editing harness was excluded. No accepted evidence was overwritten.

Evidence root: `evidence/builder-v1-wp5-f-l3b-20261024/`.

| Run | Retained outcome |
| --- | --- |
| `run-1792892713313` | 46/46 units; browser could not start inside tool sandbox. No product browser conclusion |
| `run-1792892729495` | 46/46; test-driver init-script registration metric saw zero instead of 13. Inspection/build graph showed native bytes included; fixed trusted-module registration was not absent |
| `run-1792892775832` | 46/46; explicit hash-pinned probe confirms 13 registrations and zero rejected-input Card constructions, then real constructor/defaults pass. Later authored disabled selectable input lacked the accessible name required by the unchanged Definition and correctly refused |
| `run-1792892796784` | 46/46; four browser checkpoints pass. Synchronous isDetached assertion ran before the browser detachment event; changed observation to await the actual event |
| `run-1792892810488` | **46/46 units and seven native browser checkpoints pass**, Edge 156.0.4314.42 |
| `typecheck.json` | Scoped no-emit TypeScript check passes for exact new modules/harness/helper and admitted imports. strictNullChecks enabled; noImplicitAny disabled for existing JS dependencies. Not a strict whole-workspace typecheck/build |

All earlier failures and raw browser/console/request observations remain. Subsequent runs follow specific harness changes; none is an automatic retry configured to obtain a pass. The initial browser startup restriction was addressed only by the tool's isolated-browser execution exception, as used for previous scoped runs. No OS token/elevation investigation, context diagnosis, VM or Foundation work occurred.

### Seven final browser checkpoints

1. Corrupt transit input reaches the trusted frame with fixed 13-tag registration complete, but **zero native Card constructions**, zero active Card observers and no Card DOM. Parent capability rejection separately creates no new frame.
2. Actual canonical Definition/defaults render with constructor name UibCard and constructor equality to customElements.get('uib-card'); one Card constructed. Default body is the real `Card body`.
3. Text slots, six native variant/density combinations, heading/label/accessibility, local selection event order (change then uib-card-select), keyboard toggle and disabled behavior. No handler/action callback is installed. Screenshot was visually inspected.
4. Media/link/action/handler/service/children inputs rejected before native construction; invalid Refresh removes the former frame and leaves only static stale summary.
5. Refresh/revocation race yields no late frame; actual Card removal disconnects its observer (active count zero), stale destroys the entire frame, three repeated reset/dispose cycles leave no frames, and host listeners/startup timers return to zero.
6. Strict CSP/opaque sandbox probes deny network POST, storage, top navigation, popup, form submission, file chooser/download and unapproved inline script. Wrong-channel/Save/Publish and frame self-sourced render messages do not mutate the single Card. Expected connect/img/script policy violations are captured; no unauthorized receiving-server request, page error, download, chooser or extra page occurs.
7. Unchanged accepted fixture Card and native Panel smoke succeeds. CSP directives match exactly after normalizing only the script hash. This is not a rerun of the earlier full seven-checkpoint editing suite.

Native listener cleanup evidence has a precise limit: native Card has a disconnect hook for its observer, but no exported API to remove every shadow/registry event listener from a detached element. This increment does not modify that native implementation. Host stale/disposal destroys the isolated document/frame, which confines listener/registration lifetime and leaves no stale interactive content; observer disconnection is separately measured on actual native removal. No general native listener-removal or arbitrary-code sandbox guarantee is claimed. The test-only probe can affect timing; actual production observer scheduling is not qualified by these synthetic runs.

## Capability matrix

| Supported within this increment | Rejected / still unqualified |
| --- | --- |
| Actual canonical Card text-only body/header/footer, heading/label/name/accessibility fields, real permitted defaults | Arbitrary children/elements, undeclared properties, executable HTML/user content, custom CSS/class input |
| elevated/outlined/flat; comfortable/compact; none/selectable; legitimate selected/disabled behavior | Link/action modes, media/external resource URLs, navigation/targets, serviceRefs/action tokens/handlers |
| Exact captured Definition/native closure/fixed-bundle identity and authored activation/digests | Unknown package/version, changed/missing/foreign bytes, live package/source fallback, dynamic imports or unapproved initialization |
| Copied authored binding/epoch/allow answers, expiry and bounded input checks | Real I-AM evaluation/invalidation, Application ownership/session mutation, remote timing, production check-to-send/disclosure semantics |
| Native restricted-host compatibility and unchanged fixture smoke | Actual saved artifact acquisition, D6, protected field/schema/source closure, ordinary Builder/full Visual/Form/native Region or production endpoints |

## Preservation and remaining prerequisites

`before.json` captured **1609 admitted existing source/evidence files** before implementation. Final preservation verifies every baseline byte unchanged, none missing and unchanged HEAD, including all UI Base native sources/Definition/package manifests, accepted L1/L2 models, fixture/shell/editing/autosave/runtime code and prior reports/inventories/closures. [The new exact inventory](builder-v1-wp5-f-l3b-files-20261024.json) lists each new source/test/runner/document/evidence file and raw SHA-256; self-entry is intentionally unhashed. No protected source/store or OS-wide preservation claim is made.

Remaining production dependencies: accepted D6 coherent protected acquisition and operational gates; actual owner/field/read visibility; trustworthy policy/session/owner invalidation and complete writer coverage; immutable authenticated delivery and reviewed disclosure-race/clock/health/expiry/resource ceilings; native admission of broader composition/Forms/resources. A synthetic fixed-bundle success supplies none of these by itself. Protected Preview remains unavailable.

No protected Component/store/lock/journal/transaction/recovery access, D6/Foundation operational execution, I-AM database, ordinary backend/Builder/Visual/Form launch, native source mutation, Windows Identity/N01/token/elevation/WinPE/VM, commit, push or GitHub synchronization occurred.

**STOP AT WP5-F L3-B Canonical Card Captured-Input Compatibility — Increment Acceptance Review Gate.** Acceptance remains the user's decision. Complete WP5-F, D6 and WP5-I remain open and unaccepted; all 40 umbrella requirements remain unchecked.
