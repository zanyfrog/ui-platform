# Source Identity Parser Hardening — increment review

2026-10-25. **Shared parser hardening implemented for review; no saved-node selection feature implemented.** Gate A findings were accepted separately in `builder-v1-wp5-f-source-owner-gate-a-acceptance-20261025.md`. The original findings, probes, failed import-path attempt and historical evidence remain unchanged.

## Implementation and normalization

The preimplementation compatibility/normalization contract is `builder-v1-wp5-f-parser-hardening-contract-20261025.md`. Exactly two existing production source files changed:

| File | Change |
| --- | --- |
| `packages/visual-artifacts/src/source.ts` | Contiguous attribute lexing within the existing offset parser; detect duplicate effective identity names before overwriting; malformed-token refusal alternatives in the same tokenizer; suppress managed ids/references on parse errors; refuse mutation of erroneous source; replace existing mixed-case identity spellings safely during targeted edits. |
| `packages/visual-artifacts/src/validation.ts` | Return accumulated metadata/parser diagnostics on parse error before building node/reference maps. No extra parser or discovery path. |

Only ASCII A–Z are folded to a–z for the two exact effective names `data-uip-node` and `data-uip-component`. Values retain their case and are not trimmed. Duplicate identical values and conflicting values both fail, including mixed-case spellings. No first or last identity is published. Ordinary names retain case and duplicate last-value behavior. The four existing named value-entity decodings remain unchanged; identity values with other entity spellings are refused. Attribute names are never entity-decoded or Unicode-normalized into identity aliases.

Attribute syntax must be consumed without gaps. Whitespace uses the existing reader's `\s` rule; single/double quoted and supported unquoted assigned values remain usable. Boolean ordinary attributes remain usable; boolean/empty identities do not. Unsupported name characters (including ampersand/encoded spellings), malformed assignment/quotes, missing separators and unsupported identity syntax produce deterministic structured errors. Unquoted identity values adjoining a self-closing slash refuse; ordinary unquoted trailing-slash values retain their prior parser result. Case normalization is limited to identity names, not a general HTML reinterpretation.

The existing tokenizer retains its supported tag/comment/declaration/raw-body/optional-end behavior. Its refusal alternative catches malformed/incomplete ordinary tag tokens, unclosed comments/declarations and processing instructions. Spaced/numeric unsupported starts carrying identity-like spelling are refused in that same tokenizer; ordinary less-than numeric/prose text is preserved, not treated as an opening tag. Raw script/style/textarea bodies remain opaque; identities on those manual raw-text nodes refuse. No DOM fallback, second source catalog, Preview scanner or saved-content repair exists.

Cross-node duplicate node ids still produce the existing diagnostic. On **any parser error**, all returned nodes lose managed id and Component-reference attributes and become manual; source offsets and ordinary inspection attributes remain available. Warnings alone preserve supported ids. This intentionally prevents consumers that inspect nodes from accidentally selecting one ambiguous identity. componentReferences consequently returns no reference for refused documents. validateArtifact surfaces the same errors and stops identity interpretation. Diagnostic shape stays severity/message/optional node; new syntax refusals use stable category/name/offset messages. No Diagnostic or accepted L1/L2/L3 contract was changed.

Source bytes are never rewritten by parsing or validation. The existing explicit editing functions still return candidate strings only when called; setNodeAttribute now refuses documents with errors and uses a case-insensitive match only for identity attribute replacement. Insert/move already refuse parser errors. No automatic repair/save/history operation was introduced.

## Scoped verification and dependencies

Final passing run: `evidence/builder-v1-wp5-f-parser-hardening-20261025/run-1792967513729`.

**45/45 named parser/validation tests passed**, serial, zero configured retries. Coverage includes the two original counterexamples; identical/conflicting duplicate values; case-equivalent names; supported whitespace/quoting/entity/self-close variations; encoded-name/value refusal; malformed/incomplete/spaced/numeric openings and closing syntax; raw-text identity refusal; cross-element duplicate ids; deterministic repeated diagnostics; cleared ids/references; validation refusal; mutation refusal; canonical Card declaration; ordinary Visual markup and source editing operations.

Eight valid-source cases compare flattened nodes, parent/child relationships, exact offsets, attributes, manual flags and diagnostics to the preserved preimplementation parser, plus identical targeted edit output. They include comments, raw bodies, optional end tags, missing wrappers, ordinary duplicate attributes, greater-than signs in quoted values, boolean attributes, ordinary trailing slash values and less-than text. A canonical Card source using the existing package declaration retains parser output and validates with no diagnostics. This loads declaration JSON as data, not Component discovery, registration or rendering.

**Scoped strict TypeScript check passed** using the installed TypeScript 6.0.3 compiler API: ES2022, NodeNext, strict=true, skipLibCheck=true, noEmit=true, no automatic ambient types. Roots are source.ts and validation.ts. Exact seven-file source/type closure is source, validation, model, form, expression, composition and the existing pure sibling declarative-expression module; library declaration hashes/options are recorded in typecheck-admission.json. This is not a whole-workspace typecheck, package build or dist refresh.

**Actual unchanged Visual editor nonpersisting regression passed in happy-dom 20.14.5**, not a native browser. The exact editor module and its existing editing lifecycle execute through the source-only test barrel; package runtime index, sessions and protected readers do not execute. Before/after bundles use the respective preserved/current parser and validation source. The harness authors memory bundles and transports only; driver instrumentation computes SHA-256 for those authored strings. No source acquisition endpoint exists. Memory PUT callbacks model the ordinary autosave response and never persist files or call a backend. This clarifies the preflight plan's no-source-GET/PUT boundary: no real source transport is admitted; only authored memory save callbacks are exercised.

Matched traces preserve source/checksums, file=`source`, range [3,11], selected structure ids, dirty/pending/conflict state, Undo/Redo availability and exact captured save body/expected hash/time. Two edits separated by 751 ms create distinct history entries; actual Undo returns the first edit and Redo restores the second. Disabled autosave produces zero saves; enabled autosave produces one memory save at 2,000 ms after the final edit/Redo (relative timestamp 2,751 ms). Before/after traces are exactly equal. Disposal clears all admitted editor timers. An additional actual-editor check shows duplicate identities only as manual structure entries and displays the refusal diagnostic. No source editing/autosave implementation was modified.

Network/fetch and iframe construction are forbidden by test probes. Final observations record no unexpected network requests, DOM errors or frames. No native Preview action is invoked. The test environment supplies an Option convenience constructor using real happy-dom option elements, and a deterministic clock; these are verification-platform shims, not product code or native-browser qualification. There is no claim of browser layout/security, full Builder, protected-store, real authority or saved-node provenance qualification.

Exact application input allowlists/hashes are written before bundling/loading, enforced by the dedicated verifier, and resolved graphs are saved before executing each bundle. The parser has no runtime imports; validation's pure graph is as recorded in the preimplementation contract. Editor regression additionally admits editor/menu-controls/authoring-controls, composition, editing-lifecycle/autosave configuration/specialized transport/saved-source and platform-settings via the exact test barrel. DEV=false removes default session execution. Node/esbuild/TypeScript/happy-dom are installed verification tooling; their versions/entry paths are recorded. No workspace test discovery or setup hooks are used.

## Retained attempts

Every invocation has its own run directory, raw unit output, admission hashes and failure/result record; separate invocation logs and verifier snapshots are retained. Zero configured retries does not conceal the explicitly corrected later invocations.

1. Parser/validation assertions passed; verifier failed because workspace TypeScript 7's default export lacks the older compiler API. Source/output retained.
2. Assertions and scoped TypeScript 6 check passed; Edge exited during sandbox startup before actual-editor execution. Logs retained. No elevation, token changes, browser-policy changes or process-sandbox escalation followed.
3. Narrow DOM execution detected missing Option constructor support and failed its no-errors assertion. Trace and verifier source retained.
4. Added the test-only Option constructor shim; tests/typecheck/editor regression passed.
5. Added malformed spaced/numeric/incomplete-close refusal cases; passed.
6. Compatibility review preserved ordinary unquoted trailing-slash values and added a baseline comparison; passed.
7. Restricted unsupported-start refusal to identity-bearing markup so numeric/prose less-than text stays compatible; final 45-test/typecheck/editor run passed.

The original historical parser probes remain as historical reproductions against the old implementation; they were not rewritten or rerun as expectations for hardened behavior.

## Preservation and inventory

Entry baseline enumerates **731** files in source, tests, scripts, documentation, historical evidence and Visual implementation source. Final comparison records **729 unchanged**, exactly the two authorized source changes, and no deletions. Prior accepted source, all nine identity-gap deliverables, all 15 source-owner findings deliverables and prior unsuccessful evidence are preserved within that enumeration. Existing Visual editor, editing lifecycle, autosave, Builder, accepted L1/L2/L3/native/fixture implementations remain byte-identical to entry. HEAD is unchanged. This is an enumerated baseline claim, not hashing protected saved artifacts or the entire workspace.

`preservation.json` records before/after hashes and prior-inventory checks. `builder-v1-wp5-f-parser-hardening-files-20261025.json` inventories every new/modified increment file, including all attempts and generated verification bundles; only its self-entry has no recursive digest. Files already changed/untracked on entry are preserved as found. No commits, pushes or synchronization occurred.

## Remaining prerequisites

Parser hardening removes the specific duplicate-attribute information-loss blocker; it does not establish a saved-node snapshot or accept a future source-owner contract. A separately authorized owner increment must still bind a unique committed node/reference from retained authorized saved source to original Application/owner-qualified Page and exact saved revision, canonical Definition/package/export identity and applicable revision semantics. It must verify completed-save/matching-baseline evidence, source visibility/currentness, and fail-closed generations/invalidation across draft edits, rename/removal, save success/failure/concurrency, external changes, navigation, Undo/Redo, owner/session changes, suspension/park/remount and disposal. Consumers must receive immutable metadata only, without parsing or acquiring source. No subscription or Builder target integration was added here.

No protected saved-source acquisition, Foundation/D6, locks/recovery, I-AM database, native renderer/Preview activation, registration/publication, new persistence/repair path, Windows token/elevation/VM/WinPE or GitHub synchronization occurred. No accepted L1/L2/L3 contracts changed.

Stop: **WP5-F Source Identity Parser Hardening — Increment Acceptance Review Gate**.

Saved-node selection remains unimplemented and unaccepted. Complete WP5-F, D6 and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.
