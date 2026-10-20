# Builder V1 WP5-F — architecture plan

2026-10-18. **PLANNING ONLY. STOP AT TWO SEPARATE ARCHITECTURE REVIEW GATES.** Neither proposal is approved by this document; approval alone does not authorize implementation. WP5-E remains accepted and closed. WP5-F is not accepted or closed. WP5-G, WP5-I acceptance and WP6 remain pending; all 40 umbrella requirements remain unchecked.

## Baseline and scope

The supplied checkpoint is `a79490c8b97dd68fe6945f4846f8c14238e85a33`. The inspected checkout is clean `main` at `7050993160cee3ffeb49674fa4696dc6ff8f694a`, with the local tracking reference `origin/main` matching. The intervening commit changes eleven demo launcher, demo documentation and demo-health files, not the inspected graph-lock or renderer implementation. No fresh remote verification was performed. No reset, checkout, fetch, commit or push is needed for planning.

Accepted WP0–WP5-E contracts and evidence remain authoritative. Full UI regression remains **474/476 — NOT PASSED**. WP5-B Visual save and WP4 Dataset validation admission remain unresolved. The WP5-E accepted-source comparison demonstrates WP5-B reproduction without E; WP4's accepted-source run is inconclusive. This planning increment runs no product/browser tests and makes no passing-runtime claim.

Deliverables: [D6 proposal](builder-v1-wp5-f-d6-architecture.md), [preview proposal](builder-v1-wp5-f-preview-architecture.md), and [planning verification](builder-v1-wp5-f-planning-verification.md). Only these four planning documents may change.

## Reused authorities and gaps

Reuse Foundation storage locks, recovery journals and explicit-role transactions; original User/Application identity and final admission; WP1 navigation; WP2 working copies; native Visual/composition/Form/Menu/theme renderers and validators; existing installed package discovery. No new rendering engine, artifact format, persistence authority, service registration or editing lifecycle.

D6 gaps: cross-process admission is asymmetric; reads take the exclusive graph lock; some validation/compilation and HTTP response work occur while it is held; ownership of individual historical failures is not traced; nested acquisition has no explicit guard. Preview gaps: dirty Form preview flushes; package modules execute during design preview; live asset/module URLs are not a complete immutable closure; there is no demonstrated comprehensive network/effect boundary or immediate authorization-revocation delivery contract.

## Recommended sequence after separate authorization

| Stage | Proposed work | Gate / acceptance |
| --- | --- | --- |
| D6.1 | Deterministic holder/waiter tests and scoped contention observations, including Windows | Identify holder, resource and phase without changing admission semantics or exposing source |
| D6.2 | Same-authority bounded acquisition and explicit nonreentrant lock context; unify graph caller behavior | No live stealing; no callback retry after entry; expected revisions and final authority preserved |
| D6.3 | Move demonstrated expensive pure validation/compilation outside short capture sections where immutable inputs and final dependency rechecks suffice | No mixed graph, no silent stale substitution, recovery unchanged |
| D6.4 | Reverify WP5-B and WP4 unchanged assertions, affected WP2 contracts, actual simultaneous Builder/runtime browsers | Both failing regressions pass; no quiescing workaround; sustained contention has honest bounded busy handling |
| F.1 | Capture identity/closure and server-authorized design capabilities | Complete closure or explicit failure; no protected record reads |
| F.2 | Restricted host and safe package/asset admission | No arbitrary source execution, ambient credentials, network or storage effects |
| F.3 | Focused previews, sample inputs, stale retention and refresh | All supported types; unsupported types honest; no draft flush or history changes |
| F.4 | Security, lifecycle and browser verification matrix | Concurrent use, revocation, resource cleanup and effect absence evidenced |

These are proposed implementation stages, not instructions to execute now. D6 and preview architecture are independently reviewable. Pure preview state design, closure modeling and safety classification can be implemented independently only after explicit authorization. End-to-end capture integration and concurrency acceptance depend on verified D6 behavior. Security prerequisites can independently block preview release even after D6 succeeds. WP5-I requires D6 resolution and both affected regressions; no later acceptance is implied here.

## Decisions awaiting review

1. Gate 1: approve or revise same-lock bounded admission plus staged critical-section reduction; retain the global namespace initially rather than introduce reader/writer locking or sharding.
2. Gate 2: approve or revise fixture-only data, fail-closed package admission, restricted capture delivery and the preview state/security contracts.
3. Resolve the authorization-revocation prerequisite described in the preview proposal: literal immediate hiding cannot be guaranteed by polling. If existing authority cannot invalidate displayed content promptly through a trusted channel, affected protected previews remain unavailable pending a separately approved solution.

The user's stale decision is already settled: retain the last successful capture visibly marked **STALE PREVIEW**, refresh explicitly, and hide immediately on observed revocation. No further decision on ordinary stale retention is requested.

## Risks and acceptance boundary

Serial graph admission can still saturate under large captures. Shortening sections without complete membership checks would weaken coherence. Package trust metadata is not proof of safe initialization. HTTP authorization cannot recall bytes already delivered to a browser. These limits must remain visible in implementation and verification.

Planning acceptance means the two proposals can be reviewed separately with source-backed findings, alternatives and test plans. It does not mean D6 resolved, preview safe, tests passed or WP5-F closed. **Stop here for architecture review; implementation requires explicit authorization.**
