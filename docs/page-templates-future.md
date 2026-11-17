# Page Templates — Future Capability

Page Templates are a reserved future first-class UI Platform capability. This document records architectural principles only; it does not implement template functionality or decide its eventual scope.

## Accepted principles

| Concept | Meaning |
| --- | --- |
| Shell | A live shared layout with named content regions. |
| Page | An independently editable application Page. |
| Page Template | A reusable starting design copied when creating a Page, not linked inheritance. |
| Component | A reusable UI element shared by reference. |

Pages created from templates receive new permanent Page and Route identities. Each resulting Page is independent of its template; later template changes do not propagate into that Page. Applicable Shell and Component references remain shared by reference.

Future template-based creation should reuse the existing atomic complete-candidate Page creation service to validate a complete Page before publication.

Duplicate Page is a separate, already implemented feature. It copies an existing Page into a new independent Page; it does not create or manage a Page Template.

## Potential CLI commands

These command forms are reserved in documentation only. They do not define an implemented CLI contract.

| Potential command | Status |
| --- | --- |
| `uip page template list` | **PROPOSED — NOT IMPLEMENTED** |
| `uip page template save` | **PROPOSED — NOT IMPLEMENTED** |
| `uip page create --template <template-id>` | **PROPOSED — NOT IMPLEMENTED** |

## Decisions intentionally deferred

- Application-specific versus shared templates.
- Whether templates originate from existing Pages, independent creation, or both.
- Storage format and location.
- Permissions and ownership.
- Versioning and lifecycle.
- Builder integration and template gallery.
- Cross-application reuse.

This architectural stub introduces no implementation code, CLI placeholders, Builder changes, schemas, services, or APIs.
