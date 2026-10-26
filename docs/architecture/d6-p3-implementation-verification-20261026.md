# D6-P3 Presentation-Owner Sealed Publication — implementation review

2026-10-26. **Implemented for Increment Acceptance Review**, limited to explicit owner-completed, resource-free static presentation snapshots. Standard composition-based templates and all unsupported resource semantics remain unavailable.

The final contract is `d6-p3-presentation-protocol-20261026.md`; ownership/dependency/writer map is `d6-p3-presentation-owner-writer-map-20261026.md`. The user-authorized P2 closure is recorded separately without rewriting historical reports.

## Implementation and admission

New `presentation-publications.ts` implements the actual internal presentation owner producer/reader, write-once per-version seal, generation-checked selected-publication reference, typed refusals and bounded immutable leases. New `presentation-publication-contract.ts` validates complete owner data and the supported semantic subset. Published manifest/record, JSON checksum, CSS and original Application binding must agree; unknown/duplicate/unsupported identity or dependencies refuse. Index membership/digests cover all four admitted resources, not merely JSON.

The existing owner exports the extension additively. Its pure default/validation/CSS functions move unchanged to `presentation-format.ts`; its normal edit/publish/rollback/source-copy/active-selection bodies remain identical after those exact source slices and import wiring are accounted for. There is no automatic sealing, legacy republishing or new endpoint.

Gate A/B design preceded runtime changes. It uses the already approved owner publication lifecycle and existing graph/role authority; no new Foundation lock format, recovery/transaction semantics, migration, renderer or permission model was required. Exact old pure function bytes and pre-edit owner source are retained.

`verify-d6-p3.mjs` writes exact source hashes, resolved module admission, tool versions, builtin allowlist, test setup and initialization before executable compilation. It rejects unlisted imports, bundles one named Node entry and uses serial execution with zero configured retries. Sources are the actual new owner/contract/format/shared types and actual Foundation primitives. Before-format regression module consists solely of exact pure slices from retained pre-edit source. No normal owner/backend, installed package/native code, session, database, source-store or workspace setup runs.

Product fs promises use the admitted fixture-root guard. Only disposable fixture roots and ancestor lstat safety metadata are permitted. Tests replace OS PID probing with a failing tripwire and disable diagnostic trace-file writes. Ordinary standard-template text is admitted as inert unsupported-context fixture data; no current Application settings are read. Source hashes, bundles, raw outputs, typecheck closure and guarded filesystem observations are retained per run.

Strict scoped no-emit typechecking covers the actual owner, contract, pure format/shared declarations and storage/type dependency closure. It does not initialize broad server dependencies or claim a full backend build/deployment. The final source hashes match the final admitted run.

## Verification record

All runs are retained under `evidence/d6-p3-presentation-seals-20261026/`:

| Run | Scope and result |
| --- | --- |
| `run-1793036827265` | Initial 18-case implementation verification passes with clean typecheck. Subsequent ordinary-source audit identifies that its settings fixture used an invented top-level UUID shape; this scope is superseded, not final owner compatibility evidence. Raw source/results remain unchanged. |
| `run-1793036957464` | Corrected actual `application.name/status` context, manifest-bound UUID and explicit standard-template refusal. 19/19 tests pass, clean typecheck. |
| `run-1793037045417` | 20/20 tests pass, clean typecheck. Adds wrong-owner/uncertain-release/altered-index checks and verifies any visible seal after commit cancellation. |
| `run-1793037354450` | Final **20/20 tests pass**, zero failures/skips/cancellations, strict typecheck diagnostics zero. Also refuses lossy UTF-8 decoding and nonstring draft-checksum metadata; these checks affect only the new seal contract. |

No executable attempt failed; the first successful run's source-shape limitation and its correction are preserved candidly. Each new scope was separately admitted with zero configured retries. Ordinary source-query misses are retained separately, not mislabeled as runtime failures.

Final coverage: exact published versus draft selection and active published-version binding; original UUID preservation; four complete resource bytes/index; missing CSS/context/assets and copy/write failure; unsupported CSS imports/URLs/fonts/heroes/defaults/routes/composition; required token/no-default refusal; duplicate versions and same-version overwrite prevention; checksum/CSS mismatch and duplicate JSON-key refusal; synchronous source-copy isolation; incomplete staging and rename failure; selected-publication generation/version changes; concurrent readers/publishers/selectors; disk corruption/missing/extra membership; cancellation at admission/staging/read/lease/commit; pointer interruption; retained old versions and expired/disposed leases; pending journal/foreign-lock refusal without replay/probe/foreign deletion; bounded contention; invalid ownership/limits/producer; real settings shape and composed standard template; wrong read owner, altered index and uncertain ownership cleanup.

The exact before/after pure owner functions execute on admitted valid legacy cases and produce identical defaults, normalized data and CSS. Static comparison proves every other normal edit/Publish/rollback/copy/selection function body is unchanged, with only compatible wiring added. **No full normal Publish/edit persistence suite was executed**; preservation evidence is exact source equivalence plus the admitted pure regression checks. No broad production compatibility claim is made.

## Preservation and restrictions

`preservation.json` contains exact baseline counts and before/after hashes; `docs/architecture/d6-p3-files-20261026.json` enumerates every changed/new file. Of 1,862 baseline files, 1,861 remain byte-identical, with no deletions. Exactly one existing runtime source file changes for the pure extraction/additive exports. New owner/contract/format/tests/verifier/authoring scripts and evidence are separately inventoried. The original owner source and extraction function hashes are retained.

All 151 digest-bearing P2 inventory entries still match, including accepted source and both unsuccessful attempts. R1's 133 digest-bearing entries also match. Native/package code, L1/L2/L3, CSP/sandbox, Foundation primitives, actual presentation data, package sealing and editing/history/autosave implementations are unchanged. HEAD remains unchanged. No current protected source, registry or operational state is acquired; no real publication/activation/migration/cleanup, recovery, database/session execution, Windows/elevation work, commit, push or synchronization occurs.

Test teardown alone makes test-only read-only files writable and removes verified disposable roots; it is not product cleanup/GC. No seal deletion API, automatic migration or read-triggered repair is added.

## Limits and next boundary

This is a presentation-owner seal, not complete Application style/source closure or current server authorization. Trusted factory setup must eventually come from the real permanent Application owner and canonical configured graph/root; syntax validation is not a grant. Full composition, assets, custom CSS/functions/fonts, broader settings and standard composed templates remain unsupported, with explicit refusals. Do not create/edit real source to manufacture an eligible target.

The API accepts explicit completed owner snapshots and does not qualify the upstream production snapshot preparation or integrate automatically with legacy Publish. Real source freshness, read visibility, owner/session invalidation, namespace permissions, writer deployment, rename behavior and retention require separate qualification. Source compilation is no-emit; deployed storage artifacts were not rebuilt or activated.

Joining P2/P3 in D6-R2 still requires a trusted original-request admission boundary, real saved Page/node resolution, exact applicable package/presentation selection and complete semantic dependency coverage. Any required source outside these subsets must refuse or receive separate owner-contract authorization. No provider-success or renderer response is introduced.

Stop at **D6-P3 Presentation-Owner Sealed Publication — Increment Acceptance Review Gate**. Complete WP5-F, D6 and WP5-I remain open and unaccepted. All 40 umbrella requirements remain unchecked.
