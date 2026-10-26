# D6-P1 complete source-owner closure and refusal contract

2026-10-26. **Specification for architecture review only; no runtime API, publication protocol or authority grant is implemented.** Depends on `d6-p1-coherence-decision-20261026.md`. No accepted L1/L2/L3 contract changes.

## Owner inputs and immutable result

The trusted caller supplies original permanent Application/owner binding and the required canonical Card implementation identity. Browser package paths, owner/session strings and source metadata are consistency candidates, never permissions. Each dependency must resolve exactly once through its existing owner and an admitted publication. Do not use fallback IDs, first/last catalog matches or editor draft metadata.

Required distinct bindings:

| Binding | Required evidence |
| --- | --- |
| Installed package | Canonical owning scope/identity, exact package name/version and sealed byte publication identity/revision. A version is a label, not the seal. |
| Activation | Permanent owning Application, authoritative enable/resolution declaration, exact selected package publication/export and activation revision. Distinct from installation and from core catalog cache status. |
| Definition/export | Canonical Component ID, exact Definition metadata/digest, package/version, import/export/module mapping and explicit Definition revision, including legitimate null absence only where its canonical contract permits. |
| Presentation selection | Explicit owner-qualified published version/revision and theme selection. Draft is a distinct source. No active version or unavailable theme is a refusal, not permission to substitute defaults. An explicit absence is admissible only if the owning contract proves it. |
| Resources | Complete normalized logical membership, owner, role/type/media, byte length, digest, dependency edges and publication identity. No live path or URL substitutes for bytes. |

The result must contain an authoritative immutable dependency index and copy-isolated exact bytes matching it, with both source and implementation provenance. Complete transitive imports/reexports, styles, theme tokens, required fonts/images/icons/assets and semantic dependencies must be represented or refused. Duplicate/conflicting exports, paths, owner aliases or identities refuse. Completeness must derive from the producer contract, not from executing package code or treating a directory listing as a semantic dependency proof.

Output bytes must remain unaffected by mutation of source files, caller buffers or previous returned buffers. Freezing an object containing mutable typed arrays is not sufficient. Prefer owner-held sealed storage plus bounded copied byte access consistent with accepted immutable-input validation. Never include credentials, authorization tokens or lock/journal/policy metadata in the returned index. Candidate/source provenance is not disclosure permission.

## Ordering, currentness and cancellation

Resolve mutable activation and presentation pointers under one correctly ordered existing Foundation graph acquisition, then declared owner role locks. Pass `recovery: 'refuse'` explicitly through every participating Foundation graph/role/root/list/read. Existing plain package IO must not be presumed covered by that mode; it requires the approved publication owner.

Read only already-complete sealed publications. Verify the entire index and all bytes/digests, recheck activation/owner membership/revision/currentness before return, and reject a superseded request/session/owner generation. Equal first/last reads are validation, not proof of producer coordination. Authoritative publication seals and pointer fences supply that separate guarantee.

Use one approved finite acquisition budget and cancellation signal. Cancellation discards pending results and prevents publication of late responses; admitted work must not be retried automatically. No reader-triggered install, refresh, manifest creation, publication, migration, repair, recovery, reclamation or substituted source is allowed. Missing limits, unsafe publication state or inability to prove writer obligations refuse.

## Initial static Card subset

Reuse the previously accepted canonical Card identity/schema/package/native profile rather than create a new component Definition. The existing L3-A/L3-B reports are the reference for exact admitted native bytes; this specification does not claim current installation qualification.

Start with text-only Card settings/slots and the finite variants/density already allowed by accepted admission. Require an explicit, complete published theme/style/native closure, even for a visually simple Card. No arbitrary package/child code, handlers, services, navigation, data/media loading, dynamic imports, runtime-fetched fonts/resources, custom icons or unsupported semantic dependency. Additional child content, CSS imports/URLs, assets or functions may not be dropped: either the approved producer contract completely supports them or this initial subset refuses. An empty fixture/default theme is not an accepted substitute for real owner evidence. Legitimate absence must be proved, not inferred.

This subset constrains owner closure eligibility only. P1 does not select a saved Page node, orchestrate D6-R2 capture, render anything, activate a provider or change the native renderer's allowed behavior.

## Structured refusal obligations

| Refusal class | Trigger / public disclosure rule |
| --- | --- |
| Ownership / identity unresolved | Missing or ambiguous canonical owner, Definition/export/package identity, activation authority or required revision. No path/owner-record details. |
| Publication unqualified / incomplete | No seal, failed/in-progress publication, missing resource/index member, unsupported producer/writer or unavailable retained bytes. No reader repair. |
| Unsupported closure | Dynamic dependency, executable metadata discovery, external resource or semantic feature outside the admitted static subset. Never partial success. |
| Changed / superseded | Activation/theme/source publication membership or original request/session/owner generation changes. Discard the candidate. |
| Busy / owner unresolved / unsafe / recovery required | Preserve R1 distinctions from the existing owner, without exposing PID, journal contents, protected paths or underlying policy details. No default-mode fallback. |
| Canceled / acquisition limit | Original cancellation or finite acquisition exhaustion. No late success or unbounded retry. |
| Authority unavailable / denied | Trusted read/disclosure authority absent or denied; browser metadata and test fixtures do not promote this result. |

These are semantic requirements, not new implemented error codes. Existing public contracts and R1 error codes remain unchanged.

## Required isolated verification after implementation admission

Before executing any product/test import, admit the exact producer/read dependency graph, initialization, filesystem boundary and fault hooks. Use actual owner modules, disposable nonprotected roots, serial execution and zero configured retries. Cover healthy complete publication/read, installation versus activation changes, same-version replacement, missing/ambiguous Definition/export, added/removed dependencies, failed copy/seal, theme/resource mutation, competing writers, cancellation/late completion, immutable output and structured non-disclosing refusals. Include default installation/activation/presentation regressions and strict scoped typechecking. Prove no recovery fallback, source mutation or catalog manufacture during read.

Gate C was not admitted in this increment, so none of those execution results is claimed. A successful test using a fabricated publication producer would not qualify the actual owner.
