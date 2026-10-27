# V1 Page Builder — Practical Website Authoring Acceptance Review Gate

Date: 2026-10-27. **Blocked before implementation at the authorized URL-validation boundary. No acceptance or closure claimed.**

## Concrete finding

The requested ordinary link/image fields must reuse existing attribute mutation and validation while retaining unsafe-value refusal. Inspection and a disposable source-only reproduction found no URL-scheme refusal in the relevant existing contracts:

- `packages/visual-artifacts/src/source.ts`, `setNodeAttribute`: checks attribute name, source structure and unambiguous managed identity, then escapes attribute markup. It does not validate href/src URL values.
- `packages/visual-artifacts/src/validation.ts`, `validateArtifact`: validates artifact/identity/component/layout and related declarations, but the reproduced literal link URL receives no error.
- The exact helper accepts `javascript:alert(1)` as a managed link's href; the exact shared validator returns zero errors. Attribute escaping is effective for quotes/markup, but is not URL-scheme refusal.

This is a source-contract observation, **not** a claim of browser execution, exploitability through every existing endpoint, or a production security audit. No unsafe URL was rendered, navigated to, sent to a service or saved. The source-only probe also records image src handling, an ordinary relative link and correctly escaped literal alt text. No URL policy was invented from those observations.

The scoped authorization explicitly directs stopping on a validation-contract conflict before expanding architecture. Adding controls directly over the existing helper would expose unsafe values without the required refusal. A UI-only scheme check would introduce a new policy absent from the existing shared validation contract, and would not establish consistent Save/renderer behavior. Neither route was taken. Structure labeling was not changed after reaching the stop boundary; no partial product change is submitted.

## Evidence and checks performed

Evidence: `evidence/v1-practical-authoring-20261027`.

- `baseline.json`: pre-work hashes for eight source/copy files and all existing files beneath the admitted disposable Application's Page directory, plus HEAD.
- `inputs/`: exact pure source/model/validator/form/expression snapshots and canonical declarative-expression module. No service or operational store is imported.
- `probe.mjs`, `probe-modules.mjs`, `resolved-graph.json`: explicit six-module admission, exact-source compilation and execution. Unknown imports are refused; no substitute validator is used.
- `url-contract-result.json`: literal input, escaped source and actual shared-validator errors for four cases. The assertion confirms the JavaScript-scheme URL currently receives no validation error.
- `preservation-result.json`: source/Page hashes and HEAD compared after assessment; existing editor polling/focus changes remain untouched.

Command: `node evidence/v1-practical-authoring-20261027/probe.mjs` from `ui-platform`. Result: confirmed the contract gap. This is a diagnostic reproduction, not a passing unsafe-URL-refusal regression.

Normal Chrome tab inventory was read to locate the admitted session. No Page interaction, application request or workflow was performed. No fresh Page was created; there are no workflow screenshots or new saved/Preview hashes. Card/Panel lifecycle regressions and scoped typecheck were not run because no implementation was made and the contract stop was reached. Historical accepted evidence remains valid within its original scope.

## Minimum decision required to continue

Approve a narrowly shared literal href/src validation policy, or identify the existing authoritative validator that should be reused. The policy must explicitly determine permitted relative/fragment URLs and schemes for links versus images, treatment of existing authorized asset URLs, unsafe/obfuscated scheme refusal and legacy-source preservation. Confirm where refusal belongs so the inspector and normal Save validation agree; do not silently change existing legacy Pages or broaden rendering/activation.

With that specific decision, resume the already authorized Structure/inspector changes and fresh three-section normal-browser workflow. No renderer, store, component framework, asset manager or generalized property machinery is indicated. The remaining link/image safety tests, Card/Panel regressions, typecheck and actual browser proof remain pending.

## Inventory and boundaries

New files comprise this report, its exact inventory and the diagnostic evidence directory. **Zero product source or Page changes.** No permissions, settings, autosave, I-AM, recovery, restricted Saved Preview, production activation, Windows security, commits or pushes. Unsaved-draft normal-browser protection remains deferred and unaccepted. Accepted Pages and historical reports/inventories were not rewritten.

Stop: **V1 Page Builder — Practical Website Authoring Acceptance Review Gate**, with the concrete URL-policy blocker above. Implementation and normal-browser verification are incomplete.
