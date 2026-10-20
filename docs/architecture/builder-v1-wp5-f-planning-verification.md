# Builder V1 WP5-F — planning verification

2026-10-18. **Architecture investigation and documentation only. No runtime/test implementation or execution.** Gate 1 D6 and Gate 2 focused preview await separate user review. Approval of architecture does not authorize implementation. WP5-E remains accepted and closed; WP5-F is neither accepted nor closed. WP5-G/WP6 not begun; WP5-I acceptance pending.

## Baseline reconciliation and preservation

User-supplied checkpoint: `a79490c8b97dd68fe6945f4846f8c14238e85a33`. Actual clean UI Platform `main` HEAD: `7050993160cee3ffeb49674fa4696dc6ff8f694a`, local `origin/main` matching. The sole later commit changes eleven demo launcher/documentation/health paths, summarized by read-only Git comparison. It does not change inspected core locking/rendering paths. No remote contact, reset, commit, push or index update was performed.

Unlike the earlier authorization's working-tree description, both repositories were clean at the start of this increment: no unrelated modified or untracked files were present. Nothing was cleaned, staged or removed. The later demo changes are already committed and remain preserved. Data Services HEAD is `81b769eef3763d02343f5347888c26edab6ef7bc`.

Before writing, SHA256 was collected for every existing Git-listed tracked/nonignored untracked file: **1,441 UI Platform files and 158 Data Services files**. Subsequent comparison found **zero changed or missing existing files**. This covers existing source, tests, configuration and repository historical evidence, including the retained evidence set; ignored runtime data was not enumerated or hashed. No runtime services, lock/recovery helpers or product tests were invoked, because even nominal reads can perform storage recovery. Preservation is a before/after byte check for this task, not a newly rerun historical acceptance suite.

Existing checkpoint confirmation reports **181 checkpoint files, 745 historical evidence hashes preserved**, accepted-source comparison and retained failures. Those records remain unchanged. The 40 unchecked umbrella rows were counted read-only and remain 40. Full UI remains **474/476 — NOT PASSED**. Both D6 failures remain unresolved; there is no new passing-test evidence.

## Inspected source paths

All paths below are relative to `ui-platform`. Inspection was textual, with targeted portions used for large files; this is not a claim that every line or every transitive dependency was audited.

| Paths | Investigation purpose |
| --- | --- |
| `packages/artifacts/src/storage.ts`, `role-bundle.ts`, `file-operations.ts` | Local/cross-process lock ownership, PID/recovery behavior, graph/role order, journal/admission/readback, Windows retries |
| `packages/visual-artifacts/src/runtime-read-admission.ts` | Existing bounded busy retry and callback scope |
| `packages/visual-artifacts/src/revision-vite.ts`, `revision-composition-vite.ts` | Runtime graph admission, recovery, closure capture, package/asset loading, validation/compile placement |
| `src/server/composition-lock.ts`, `visual-candidate.ts`, `visual-preview.ts` | Mutation namespace, dependency preparation/recheck, preview capture and limitations |
| `src/server/index.ts` | Visual GET/preview and normal save routes, related authorization and final admission integration |
| `src/server/builder-workspace.ts`, `application-problems.ts`, `application-diagnostics.ts` | Read-only workspace/Problems graph section, revision/membership/authority checks, diagnostic publication |
| `src/server/dataset-development.ts`, `artifact-editor.ts` | Dataset validation behind admission, conflict/error mapping |
| `src/server/component-registry.ts`, `preview.ts` | Installed package metadata/version/module URLs and ordinary runtime startup distinction |
| `src/client/visual-artifacts/preview.ts`, `src/client/artifact-editor/form-preview.ts` | Design flag, package execution, service routing, live resource URLs, dirty Form flush |
| `src/client/builder-workspace/coordinator.ts` | Original subject, owner-qualified tab identity, focus/suspend/disposal and draft ownership boundary |
| `packages/visual-artifacts/src/runtime.ts`, `composition-runtime.ts`, `form-runtime.ts` | Shared renderer entry points, custom element instantiation, event/service/navigation/Form execution surfaces |
| `tests/builder-v1-wp5-a.test.ts` | Existing deterministic child-process graph contention test and revocation assertions; inspected, not run |

Additional repository search located relevant preview, renderer, lock and verification paths. Search results are not treated as proof of complete call-graph coverage. No applicable root/UI Platform AGENTS.md was found by repository file inventory; `builder-demo/AGENTS.md` applies to the untouched demo subtree.

## Baseline documents and existing evidence inspected

- `builder-v1-wp5-plan.md`: accepted allocation, D3 functions-disabled policy, D6 and WP5-I dependencies.
- `builder-v1-wp0-development-onboarding.md`, `builder-v1-wp1-workspace-architecture.md`: authoritative identity/ownership and navigation boundaries.
- `builder-v1-wp2-reader-contract.md`, `builder-v1-wp2-editing-lifecycle.md`: coherent readers, graph/role ordering, expected-source and original-admission guarantees.
- Targeted accepted WP3 Dataset, WP4 Form/expression, WP5-B Component reuse, WP5-C D5 and WP5-D implementation records: data ownership, hidden-field/security distinction, render reuse, service and package limits.
- `builder-v1-wp5-e-closure.md`, `builder-v1-wp5-e-verification.md`, `builder-v1-wp5-e-files.md`: qualified acceptance, failed full regression and accepted-source limitations.
- `evidence/builder-v1-wp5-e/d6-lock-source-comparison.json`: four normalized accepted/current lock implementations equal at the recorded comparison.
- `evidence/builder-v1-wp5-e/wp4-rerun.txt`: actual 409 lock message at the expected-422 assertion.
- `evidence/builder-v1-wp5-e-closure/checkpoint-confirmation.json`: historical checkpoint/evidence counts and acceptance qualifications.
- `builder-end-to-end-v1-acceptance-checklist.md`: 40 unchecked rows.

The accepted-source WP5-B run and WP4 baseline conclusion are reused as reported and linked by accepted E verification; they were not rerun or regenerated here. The proposed investigation does not erase the inconclusive WP4 accepted-source result.

## Findings and evidence classification

**Confirmed by inspected implementation:** exclusive graph namespace shared by configured runtime/Builder callers; per-process serialization versus live cross-process rejection; runtime retries but mutation acquisition does not; read-only workspace/Problems work under the same graph lock; Dataset native validation occurs after lock admission; package imports continue in design mode; Form preview flushes dirty work; live resource endpoints are used by the current preview.

**Supported by existing retained evidence:** WP5-B reproduces without E; WP4 current run is a lock rejection, not established stale-revision rejection; normalized lock sources matched the accepted comparison; full UI failed 474/476. None is promoted to a newly verified result.

**Hypotheses/unresolved:** exact holder and critical-section timing at each failure; E diagnostics' contribution to contention; reachable nested deadlock; Windows sharing races as a historical cause; starvation/load bounds; all host roots aligning; complete package module/CSS/asset closure; safe package set; restricted host compatibility; authoritative immediate revocation delivery. Architectural proposals identify these as tests/prerequisites, not solved behavior.

## Proposed decisions awaiting user review

Gate 1: retain the existing authority/global graph identity, add bounded acquisition-only admission and nonreentrancy, then reduce safely detachable work with final revision/authority checks. Alternatives and deterministic/actual-browser verification are in [D6 architecture](builder-v1-wp5-f-d6-architecture.md).

Gate 2: fixture-only data; complete captured-byte closure; server-bound design capabilities; restricted host plus fail-closed package admission; focus/dirty-history preservation; explicit refresh with stale historical retention; authority invalidation as a prerequisite. Alternatives are constrained by existing renderer reuse and the functions-disabled policy. See [preview architecture](builder-v1-wp5-f-preview-architecture.md). Immediate remote revocation semantics require explicit resolution; no polling guarantee is invented.

The user already selected stale retention; it is not reopened. No implementation decision overrides accepted WP2, changes lock recovery, authorizes arbitrary JavaScript or introduces another authority.

## Documentation change inventory and checks

Exactly four new documents are authorized and delivered:

1. `docs/architecture/builder-v1-wp5-f-plan.md`
2. `docs/architecture/builder-v1-wp5-f-d6-architecture.md`
3. `docs/architecture/builder-v1-wp5-f-preview-architecture.md`
4. `docs/architecture/builder-v1-wp5-f-planning-verification.md`

No existing architecture/evidence document was rewritten. Review checks cover local link targets, expected headings/gates, complete four-document inventory, unchanged existing byte hashes and unchanged Data Services status. Product tests, builds, browser sessions, migrations, runtime starts and evidence regeneration are deliberately not performed in this planning-only scope. The deterministic and browser matrices are future verification plans, not completed tests.

**STOP AT WP5-F ARCHITECTURE REVIEW.** Separate Gate 1 and Gate 2 approval requested; neither implies implementation permission, WP5-F closure or checked umbrella requirements.
