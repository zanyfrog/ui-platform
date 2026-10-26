# D6-A1 activation-to-seal identity, generation and refusal contract

2026-10-26. **Bounded contract specification; implementation not admitted at Gate B.** No runtime schema, activation mode or migration is introduced by this document.

## Required identity and state

The existing Application/package owner must attest the registered permanent Application, effective resolver branch, effective enabled state, canonical package/Definition/import/export, exact sealed publication and original implementation identity, with an activation generation/currentness fence. P2 selection and its generation remain distinct. P3 applicability is independently crosschecked against normal published-version selection.

A minimal additive binding record could hold: schema, permanent Application UUID, package ID, activation generation, effective-resolution kind, exact P2 publication ID, canonical Definition/export/revision and the owner evidence needed to validate that association. It belongs to the existing authoritative owner metadata, never a Preview catalog. It must remain unavailable unless the **actual effective resolver and writer lifecycle** recognize the same meaning. This is a proposed record, not a new accepted persistent format or permission grant.

Generation must be authoritative and monotonic across relevant owner transitions; it cannot be inferred from semver, modification timestamps, cached catalog state, a Page hash or P2/P3 selection generation. Restored old declarations cannot revive a revoked binding. Original owner mismatch, uncertain writer state or unqualified effective source means refusal.

## Transition rules

| Transition | Required binding behavior |
| --- | --- |
| Legacy or implicit/fallback activation without completed owner binding | Legacy runtime behavior unchanged; sealed capture unavailable. Never infer binding from existing P2 selection. |
| Explicit future bind | Registered owner authorization and exact effective implementation/P2 identity must agree under the admitted fence; compare expected current activation generation. No read-triggered enablement/adoption/publication. |
| Disable | Advance/invalidate before a reader can certify current activation; no retained valid association. |
| Re-enable | New owner transition/generation. Previous P2 seal may be reused only through a fresh explicit verified association; never automatic resurrection. |
| Version/resolution/source precedence change | Invalidate whenever effective resolution may change, even if semver/bytes later compare equal. Rebind only after exact owner verification. |
| Replacement or same-version mutation | If not an immutable effective implementation or fully participating writer, refuse. Equal version labels or two matching reads do not prove a writer fence. |
| P2 selected-seal change | Do not silently alter actual activation. Refuse mismatch or require a fresh owner association; activation and seal-selection generations are independent. |
| P3 selected-seal/normal active-version change | Independently invalidate applicability or revalidate exact completed record/resources. P2 activation remains a separate fact. |
| Migration failure/rollback or unsupported external writer | Never restore a previously current association solely by restoring declaration bytes. Uncertain output or unqualified writer means unavailable. No repair/recovery follows. |
| Application disable/remap/owner/session/request change | Reject original-context mismatch, discard late results and require original-owner/session re-admission as applicable. No owner transfer. |

## Fence and immutable reads

Use the existing canonical graph `visual-runtime-graph-v1`, then canonical owner role locks, with explicit `recovery:'refuse'`. Every admitted writer affecting the association must participate from its first relevant mutation through final transition visibility, or produce an approved equivalent immutable effective-activation guarantee. A metadata precheck followed by unfenced source access is insufficient.

Reader acquisition and final activation/seal/selection/applicability revalidation must share that fence. Finite acquisition, cancellation and expired/stale scope refusal are mandatory. Owner-maintained composed readers must prove actual current canonical admission, not accept a supplied `enabled:true` or an ordinary marker object. Preserve accepted P2/P3 byte verification, lease lifetimes and no-fallback behavior.

No read may create manifests, repair catalogs, publish/repackage a source, enable a package, adopt a legacy installation, migrate, reclaim a foreign lock, replay journals or perform cleanup. Unknown writer participation is a refusal condition, not an allow answer. Seals/leases still are not access grants, and future disclosure needs original current authority.

## Structured refusal obligations

Distinguish: missing/unbound legacy activation; unsupported effective resolver/source; changed declaration/resolution/generation/implementation; disabled activation; owner mismatch; mismatched publication/Definition/export/P2 selection; incompatible P3 normal-version applicability; uncertain/nonparticipating writer; stale/expired/canceled scope; and R1 busy/unresolved/unsafe/recovery-required admission. No paths, lock owner, journal content or policy details leak. These are specification categories, not implemented error codes.

## Gate B decision required

**Recommended direction:** make an explicitly owner-authorized sealed implementation an actual effective-activation mode, recognized consistently by the Application/package owner and canonical UI Base resolution, while legacy declarations keep their current behavior and remain unqualified. Before implementation, decide the effective resolution/consumer contract and transition visibility/invalidation, including how legacy runtime consumers treat the new mode. A shadow sidecar binding ignored by those consumers is not sufficient.

Alternatively, retain mutable effective activation only if an enforceable supported-writer boundary covers both resolver branches, installation/replacement/build/subprocess/migration effects and rollback. No such complete boundary exists in the inspected source. It must specify how unsupported writers force unavailable state; a policy statement or matching byte sample is not enforcement.

A single atomic declaration/binding update **could** be compatible once the effective implementation and writer guarantees are defined; adding metadata does not inherently require a new transaction protocol. The current stop is therefore not a claim that a new global lock or recovery mechanism is inevitable. It is the unresolved actual-resolution/writer-compatibility decision: metadata-only changes cannot presently demonstrate the requested guarantee. Any solution that changes effective runtime resolution, introduces multi-file transition/recovery semantics or migration beyond additive owner metadata needs the separate architecture approval required by the user's Gate B.
