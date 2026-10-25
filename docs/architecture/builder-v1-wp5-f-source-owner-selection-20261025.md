# Authoritative Saved-Node Selection Contract — Visual source-owner decision

2026-10-25. **Gate A does not pass with the existing parsing contract. Stop before snapshot implementation.** The retained saved-bundle lifecycle provides a useful starting point, but the existing parser discards identity ambiguity within a single opening tag. Publishing a committed Card target from that result would not establish unambiguous source provenance. No snapshot API, subscription, Builder integration, parser change or production feature was implemented.

## Source ownership and provenance inspected

Inspection read implementation source and package declaration metadata only. No live retained bundle, saved artifact, protected filesystem store, backend, lock or recovery path was accessed. The executable probe uses authored strings, not protected or mutable editor source.

| Boundary | Exact existing source / finding |
| --- | --- |
| Owner | `src/client/visual-artifacts/editor.ts:24-30`: copies retain bundle, editing lifecycle and captured save request; private files/baseline/hash/selectedNode remain editor-owned. No source interpretation moves into the Builder shell. |
| Previously authorized saved baseline | `editor.ts:280-304`: initial/opened bundle supplies files/hash; `EditingLifecycle` clones baseline/current separately. Retained bundle and baseline can describe a prior completed saved state, subject to the existing transport/visibility context. Merely retaining them does not prove external currentness. |
| Normal completed save | `editor.ts:285-289` awaits the captured transport response before replacing record.bundle and returning saved.files; `editing-lifecycle.ts:88-92` updates baseline/savedGeneration after awaiting save. An eventual snapshot would require matching returned saved files/hash, baseline, original identity and unchanged lifecycle generation/currentness; the candidate or a pending request is insufficient. No save was executed here. |
| Failure/concurrency | `editing-lifecycle.ts:82-108` serializes in-flight flushes and marks uncertain failed responses. A failed response may conceal a committed write. That requires immediate refusal, not certification of either draft or old baseline as current. |
| External replacement | `editor.ts:398-415`, `427-440`: refresh/focus compare bundle hashes, preserve dirty conflicts, and replace clean baselines. These are existing acquisition paths, inspected but never executed. They cannot be invoked by the proposed metadata consumer under this authorization. |
| Saved source node | `packages/visual-artifacts/src/source.ts:35-56`: parseSource extracts data-uip-node, validates its syntax and detects repeated ids across parsed nodes. It does not preserve repeated attributes on a node. |
| Definition mapping | `validation.ts:86-91` checks one combined match across retained platform components and packages; the editor inspector instead uses first-match lookups at `editor.ts:196-197`. A provenance snapshot must retain the validator's ambiguity refusal, never the inspector's first-match behavior. |
| Package/export metadata | `src/server/component-registry.ts:58-83` retains the original explicit entry as definition while projecting packageName/packageVersion. Existing Card package declaration has canonical componentId, ownership.package, implementation.importPath/exportName and version.packageVersion; revisionId is explicitly null. `PackageDefinition`'s narrow TypeScript type omits these richer fields. The metadata can be present at runtime; absence must refuse, and null revision must not become a fabricated revision. No registry or package acquisition executed. |
| Original owner/Application/session | `builder-workspace.ts`, `adapters.ts`: ordinary authorized wrapper contains owner-qualified artifact identity; Visual options pass applicationId but not that complete identity/session contract. A future implementation must pass the existing original metadata into the owner and invalidate on changes, rather than derive owner from locator or application routing key. |

## Precise Gate A blocker

`parseSource` assigns `attributes[attr[1]] = decode(...)` for each attribute at source.ts:37. A later same-name attribute overwrites the earlier value. At line 38 the parser derives node id from this collapsed object. Lines 50-54 only detect duplicate resulting ids across nodes. Neither the node nor diagnostics retains attribute multiplicity. Existing validation consumes that already-collapsed result.

Authored counterexamples verified with the exact existing parser:

```html
<uib-card data-uip-node="original" data-uip-node="replacement" data-uip-component="card"></uib-card>
<uib-card data-uip-node="savedCard" data-uip-component="other" data-uip-component="card"></uib-card>
```

The first produces node id `replacement` without an error. The second produces the same attribute map and diagnostics as a tag containing only `data-uip-component="card"`. These strings are probe data, not an actual package identity or saved Card claim. No browser interpretation or real saved rendering was tested.

Thus counting parsed nodes and checking parser errors cannot distinguish the ambiguous source from an unambiguous committed node/reference. Rejecting all dirty drafts, checking the bundle hash, or matching a package does not restore discarded source evidence. Scanning opening tags with a new regex, reparsing with a DOM or importing another parser would introduce new parsing semantics. This increment expressly requires a stop when that is needed. No such workaround was added. Source hashes identify content but do not certify unique semantic identity.

## Minimal separately authorizable contract

Authorize a narrowly scoped extension to the **existing source owner's parser/validation contract**, with explicit identity-attribute normalization, multiplicity and unsupported-markup refusal semantics. It must preserve or reject ambiguous data-uip-node and data-uip-component attributes before information loss, including case/encoding/unsupported syntax according to an approved rule. It should expose a structured unambiguous managed-node/reference result from the same parser, not a second catalog or consumer-side source parser. The scope must cover the interpretation shared by source validation and owner selection; no runtime/renderer or accepted L1/L2/L3 change is assumed authorized here.

After that contract is approved and verified, the owner can be assessed for a metadata-only snapshot using the already-authorized retained saved bundle: original Application and owner-qualified Page, exact saved hash, unique committed node/reference, unique retained canonical Definition/package/export mapping and applicable declared revision (including explicit absence). The owner must bind provenance to a matching completed-save/baseline state, visibility/session context and currentness generation. Missing metadata or stale external knowledge must refuse. This is the next prerequisite, not authorization to perform a protected read or to claim all other gates pass.

## Required refusal / transition matrix — design only

No rows below are implemented snapshot behavior. With Gate A unresolved, no saved target is published at all.

| Event / condition | Required future fail-closed transition |
| --- | --- |
| Unique saved node + matching Page hash + unique canonical Definition/package/export | Eligible only after approved parsing and current original identity evidence; metadata never grants Preview. |
| Missing/manual/duplicate/ambiguous node or reference; unsupported parse | Invalidate/refuse immediately; never invent ids, select first match or use DOM/index fallback. |
| Draft insertion/removal/rename | Invalidate on the editing event before any recomputation; a draft id cannot establish committed membership. No source mutation to obtain a target. |
| Save starts / overlapping save / late response | Invalidate; publish nothing from candidate/attempt. Any later evaluation requires completed authoritative response, matching retained baseline and current identity/generation. |
| Save failure/conflict/uncertain response | Remain refused; prior request/target cannot return. No recovery, reload or flush initiated by selection logic. |
| External revision or dependency change | Invalidate old hash and mapping; no retained stale result restored. Acquisition remains separately controlled. |
| Selection/navigation/root/manual/package-only selection | Increment generation, clear previous target, refuse absent/non-instance targets; navigation.node is only a candidate, never proof. |
| Undo/Redo | Invalidate as an edit; local generation and history position are not committed Page revisions. |
| Owner/Application/session/visibility change | Invalidate before further publication; retain original qualified identity and refuse cross-context completion. |
| Suspension/park | Clear target; no callback can restore it. |
| Remount/resume | Explicit current-context evaluation required; never restore a cached target by focus alone. |
| Disposal | Terminal invalidation, unsubscribe, reject all late completion. |

## Scoped verification and preservation

Gate A probe imports only its exact test entry, Node test/assert builtins and `packages/visual-artifacts/src/source.ts`. That parser has one erased type-only import and no runtime imports. Node v24.19.0 runs serially with zero configured retries, no workspace configuration/discovery or setup hooks. Exact file hashes and intended closure were admitted before each invocation. No package index, editor, transport, validation module, server, renderer or accepted native contract executed.

Attempt 1 failed before parser execution because the probe's relative import mistakenly resolved outside ui-platform. Its output, source and admission remain retained. The corrected path was separately hashed/admitted for attempt 2, which passed **3/3** bounded parser assertions: duplicate node attributes collapse without an error; duplicate Definition attributes collapse to the unambiguous attribute map/diagnostics; duplicate ids on distinct nodes do produce an error. These are blocker-reproduction tests, not verification of a snapshot implementation or completed Gate D. No automatic retry occurred.

No editing context, selection snapshot or production view was launched. Matching checksum/file/range/Undo/Redo/autosave runtime traces were not repeated because implementation stops at Gate A. Existing source and historical traces are preserved by byte comparison; that is preservation evidence, not fresh operational qualification. No actual retained saved bundle or package currentness was certified.

Evidence: `evidence/builder-v1-wp5-f-source-owner-selection-20261025/`. Entry baseline enumerates 716 files in source/tests/scripts/docs/historical evidence and Visual source. Final preservation comparison covers every entry file, including the nine prior increment files; the separately inspected sibling package declaration is hashed separately. Inventory records every new file and its hash, with only the inventory self-entry lacking a digest. No baseline source/evidence file changed or was deleted; HEAD unchanged. The initial source state includes accepted local modifications/untracked files and is preserved as found.

No new protected reads/acquisition, backend or Foundation/D6 execution, lock investigation/recovery, I-AM database, production endpoint, native construction/rendering, registration/persistence/repair path, authority grant, Windows token/elevation/VM/WinPE work, commits, pushes or synchronization occurred.

Complete WP5-F, D6 and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked. The earlier identity integration is not implemented or closed as a successful production feature.

Stop: **WP5-F Authoritative Saved-Node Selection Contract — Increment Acceptance Review Gate**.
