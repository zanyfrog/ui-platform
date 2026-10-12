# Visual Artifact + Form/Data Integration V1

## Architecture and reuse

A new Form is a Platform Component with `capabilities: ["visual", "form"]`.
It retains its permanent `cmp_platform_...` identity, HTML structure, CSS,
public interface, dependencies, and the ordinary VisualArtifactService CRUD,
revision/conflict handling, catalog, insertion, source editor and preview.
There is no Form repository, duplicated tree, persistence engine or expression language.
Legacy Form artifacts remain unchanged. Existing UI Base Form controls, control
validation, collection and submit event are reused. The new runtime adapter
connects that event to the existing ApplicationDataClient service interface.

## Source, creation and fields

`component.visual.json` adds the Form capability, `form`, and generic `modes`.
`component.html` remains the only structural tree. Field ordering is HTML order;
the ordinary structure editor moves wrappers without rebuilding source.
Each field declares a stable identity, node, Dataset field ID/key, scalar value
type, Dataset-required flag, label/help, visibility/editability, presentation
required/default, and optional create/edit applicability.

The editor offers Create Form from Dataset and Create blank Form. V1 imports
a published Dataset schema JSON (`dataset` plus `fields` with permanent IDs).
The existing protected runtime API has no schema-discovery endpoint; this
work package does not add a competing Dataset catalog. Generation supplies
scalar controls and explicit mappings. A blank Form intentionally requires
a Dataset target and source-authored field mappings before runtime use.
The root inspector edits Dataset/write/read targets and the default mode;
the field inspector edits common properties and mode overrides. Advanced
metadata remains source-editable and validated. Removing a field requires
removing its mapping as well as its HTML control. Ordinary non-field HTML
and nested Package/Platform Components retain their existing behavior.

## Modes, operation and encapsulation

`modes.default` names the restrictive public mode. `modes.overrides` maps names
to node override sets, never to duplicate trees. Resolution is base field,
default mode, selected mode, explicitly declared public inputs, then host
authorization restrictions. Unknown modes fail closed. Mode is a normal public
property and can be constant or use the existing named-source binding model.
It never selects itself from user roles. Generic node visibility, label and
read-only overrides are available to ordinary Components as well.

The reference exposes mode, operation, recordId, initialRecord, readOnly and
disabled. No field visibility/editability override object is public. Pages
cannot target internal field nodes. Operation is independently create or edit.
Edit uses an initial record or explicitly queries by recordId through the
declared read adapter. Page route parameters enter the existing route namespace.

## Submission, state and validation

The Form owns an explicit Dataset target and named write/read services.
The supplied application and preview adapters delegate to the existing
session ApplicationDataClient, UI proxy, signed identity assertion, protected
DOE and ORM. The browser supplies intent, never a trusted actor or grants.
Create uses insert; edit uses update. After a successful commit the runtime
queries the Dataset and displays that returned record, rather than a local echo.

Form state lives in Visual Artifact local state: values, dirty, submitting,
submitted, submitError, validation and savedRecord. It is not automatically
persisted. Mode/visibility changes retain values. Update payload construction
includes identity and changed visible/editable mapped values. Hidden/read-only
values remain in state but are excluded from writes. The backend independently
rejects crafted prohibited fields.

Validation combines the existing Package control validity, mapped scalar and
required checks, and protected Dataset/DOE validation and authorization.
Dataset-required fields remain required even when hidden or overridden;
explicit attempts to weaken their required flag are source validation errors.
The server remains authoritative for all published Dataset constraints.
Errors are shown beside fields and in the submission summary. Public events
include submitStarted, submitSucceeded, submitFailed, recordCreated and
recordUpdated with explicit result payloads. Pages can bind success/navigation
through the existing event-action model. The cancelRequested contract is
available for source-authored cancel controls; no automatic cancel UI is added.

## Authorization and development reference

`RuntimeOptions.fieldAuthorization` accepts host-provided read/write restrictions
by Dataset and field key. These intersect the effective mode; a Form mode
cannot grant authority. No new authorization-metadata endpoint is introduced.
Without metadata the UI can optimistically offer an action, and the protected
backend still enforces it and returns failure. Authorization is reevaluated by
the existing protected path on every request.

`PersonForm` is shared by `/people/register` (public/create) and
`/people/:id/edit` (admin/edit). The reference Dataset contains firstName,
lastName, email, status and internalNotes plus its record identity. The
development admin may create/read/update permitted fields; internalNotes
writes are explicitly denied in the isolated fixture policy. Public mode
hides status and internalNotes; admin mode exposes both subject to authority.

Run `npm run dev:form-reference`, open the printed loopback URL, and use the
development sign-in button. The launcher creates an isolated published/applied
development Dataset, real ORM storage, a policy authority, the existing V1
identity UI server, protected DOE host and reference Vite application. The
printed storage directory contains the real persisted JSON records. Open
`/people/<saved-id>/edit` to reload and edit. Storage is disposable and cleaned
on normal shutdown; no production Dataset or policy is used.

## Scope and deviations

Schema import replaces a live Dataset picker because no existing protected
schema catalog is available. Advanced rules, field mappings and success actions
can remain source-authored. Generation targets simple scalar fields; complex
Dataset derivation is deferred. UI Base Form controls have legacy custom-element
contracts and are imported from their installed package rather than duplicated
or assigned invented permanent IDs. No broad UI Base migration is performed.

The fixture uses the existing development identity; public presentation mode
does not imply anonymous authentication. No bulk legacy migration, workflow or
trigger editing, production identity, publication/versioning, application-scoped
Components, sandbox, deployment or broader Builder completion is included.

See the accompanying verification report and exact changed-file inventory for
the observed acceptance results.
