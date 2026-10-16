# WP4 canonical declarative expression contract — version 1

2026-10-16. Implementation contract under the user's approved D2. This is not WP4 acceptance.

## Reconciliation

The existing Visual model supports named paths, typed literals and `not/eq/and/or`, evaluated in `packages/visual-artifacts/src/expression.ts`. General node conditions exclude subtrees; Form modes intersect presentation with host restrictions. Form fields previously had no calculated declaration/dependency ordering. DOE validates final proposed rows after defaults and before-Trigger transformations complete staging, independently reauthorizes writes and commits through ORM. I-AM expressions are a separate authorization contract and are not a browser calculation language.

The canonical pure module is `UI Platform Data Services/packages/dataset-operations/src/declarative-expression.ts`, exported through `@ui-platform/dataset-operations/expression`. Visual's former evaluator delegates to that module; it does not retain a second implementation. Existing legacy declarations preserve their behavior and diagnostics. I-AM continues to own security expressions unchanged.

## Declaration and typing

A versioned declaration is `{ version: 1, expression: node }`. Nodes are scalar typed literals, `{ kind: 'field', fieldId: permanentDatasetFieldId }`, or `{ kind: 'operator', operator, args }`. Accepted operators are `add/subtract/multiply/divide` over numbers, `concat` over strings, `eq` over matching scalar types, numeric `lt/gt`, Boolean `and/or/not`, and `if` with a Boolean condition and matching branch types. Binary operators require two operands; `not` requires one and `if` three. No coercion, string evaluation, IO, clock, random source, service invocation or custom function is available. Unsupported versions/operators/nodes, unknown members, unsafe field identities, malformed arity, excessive depth (24) or node count (256), nonfinite literals/results and missing dependency values fail closed. Both conditional branches are type checked; only the chosen branch is evaluated.

Form fields add an optional `calculation: { expression, persist }`. Type comes from the mapped field contract. Dependency ordering is stable and topological; direct/indirect cycles and persisted dependence on a display-only calculated field are rejected. A calculated control is not user-editable. Values are recalculated on changes using permanent IDs, with current applied field keys as the transport mapping. Source identities are not changed by presentation label edits.

Versioned node conditions must produce Boolean values. Existing legacy paths/operators retain their accepted semantics. Modes are public presentation inputs, not role selectors or grants. Calculations cannot read a dependency excluded by host-provided restrictions; protected execution independently checks dependency read permission.

## Protected persisted values

Builder-authored Forms mark the existing Form definition with `contractVersion: 1`; submissions carry only `formId` as an untrusted reference to that existing shared definition. Browser JSON never supplies the calculation contract. The protected host resolves the permanent Component identity from the authoritative five-role source bundle, checks the Dataset target and binds every mapped field ID/key to the existing applied Dataset registry. It rejects incompatible mapped types/required hints and missing required mappings. The source hash is rechecked during the write boundary.

DOE uses the same pure evaluator on final proposed rows after defaults and before-Trigger transformations have been applied. Dependencies require separate current-actor READ authorization, calculated writes require normal WRITE authorization, and mismatched client results are rejected atomically. Missing/unreadable dependencies do not disclose hidden values. Definition changes during staging fail closed. There is no new schema or authorization engine.

Calculations are Form submission constraints, not a new Dataset schema invariant. An independently authorized ordinary Dataset operation remains governed by the existing Dataset contract; referencing a Form confers no authority. This distinction preserves existing Dataset and automation boundaries. The Form test endpoint is separately bound to the selected Form and Dataset. No mutation is retried automatically; commit and read-back outcomes remain distinct.

## Preview and Date/JSON boundaries

Design preview supplies fixtures without persistence adapters. Explicit isolated submission tests bootstrap a fresh one-Dataset domain through existing WP3/Data Services services with the same schema and policy authority, distinct ORM/publication/registry paths, and an empty automation catalog. They never connect that domain to the normal Application runtime. Normal running Applications retain their existing protected connected store and renderer.

Date controls use a lossless UTC ISO text representation, not a date-only input that drops time/zone data. JSON is exposed as unsupported for automatic generation; an explicit manual object editor can parse JSON objects without coercion. Arrays/scalars are rejected by that mapping rather than converted. Required unsupported/unmapped fields block protected submission. Existing source formats and identities remain intact.
