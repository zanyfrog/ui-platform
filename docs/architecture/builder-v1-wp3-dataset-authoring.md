# Builder V1 WP3 — Dataset authoring and development application

2026-10-15. WP0–WP2 remain accepted and closed. WP3 adds Dataset controls and development orchestration; WP4 and the complete WP6 UI-only journey remain separate.

## Identity and editing

Create Dataset in the existing Application workspace creates an ordinary Dataset artifact under the registered Application. The artifact ID equals the permanent Dataset ID. Dataset and field IDs are newly issued UUIDs. The generated physical key is independent of the display name. Field-name changes retain field IDs; removing and adding a field issues a new ID. Creation stages files in private `.uib` storage before moving the complete bundle into discovery. There is no additional definition or identity registry.

Fields, Relationships, Validation, Permissions, Development Apply/Connect and Records are contributions to the existing generic editor. Source remains available. Fields edits call the existing working copy and share WP2 normal validation, two-second autosave, Undo/Redo, checksum conflicts, suspension and original-author recovery. Explicit service operations participate in the editor's pending state without becoming source-history entries.

The field-type catalog comes from the authoritative schema-application verifier: id, string, number, boolean, date and json. Primary id is required and protected by the ordinary controls. Required and default controls retain the existing contracts. Date defaults require canonical UTC ISO values. JSON defaults commit a complete parsed value on leaving the control; incomplete JSON is reported rather than approximated. The ordinary journey uses scalar controls without schema JSON.

Relationships, labels, extra validation operators and schema-embedded visibility/editability/permission properties are unsupported by the current canonical verifier. The editor explains these limits. Required/default enforcement remains in protected DOE; no new authorization or validation engine is introduced.

## Authorities

Definition access uses the existing `ui.artifact.view` / `ui.artifact.edit` permissions. Apply and Connect require `ui.artifact.admin`, independently checked against the Application and selected artifact. Session, same-origin CSRF, registered Application ownership and source checksum are checked at admission and across asynchronous orchestration. Browser-supplied actors, credentials, paths and permission catalogs are not accepted.

Runtime reads, creates, updates and deletes use the existing `dataset.read`, `dataset.create`, `dataset.update`, `dataset.delete` operation catalog and `dataset.write` field-write permission. Permissions are explicitly configured through existing trusted I-AM administration. The Permissions panel exposes permanent references and the authority distinctions; it is not a second security editor. Creation and application grant no runtime or security-administration rights.

## Source, validation, publication, application and serving

Saving an artifact changes only source. Validate checks the complete saved candidate through the existing artifact contract and canonical schema/ORM verifier. The validated checksum is editor-service status, not another schema version. It is re-established after restart.

Apply requires explicit confirmation and the exact saved-source checksum. Trusted server assembly constructs a concrete ORM registration, which is independently compared by the canonical verifier. The adapter calls WP0's existing first-apply bootstrap: SchemaManager immutable publication, ActivationController, actual fresh-reader CRUD health receipts, qualified schema verification and AppliedResourceRegistry binding. It does not fabricate an Applied state file. Supported first application includes an id-only schema and all registered types.

Publication metadata, verified applied binding and live runtime readiness are separate status values. Applied verification reads real publication/history, registration, controller state and resource ownership. Ready requires an authenticated protected host returning the expected Application, Dataset, publication and serving proof. Source that differs from the applied revision is identified explicitly; it never silently changes serving storage.

Records controls use the verified applied schema returned by that status/discovery boundary. They require loading that schema before showing field inputs; a newer or invalid source draft never substitutes field names/types for the serving Dataset.

Any changed source revision after application is rejected for reapplication as `DATASET_MIGRATION_UNSUPPORTED`. This first-apply integration introduces no online migration or type conversion. A previously applied Dataset can continue serving its applied schema while its saved source changes. Existing controller recovery and immutable-version rules remain authoritative.

## Protected host and restart

Connect is separately confirmed. Configuration, assertion keys, policy-store paths, approved operation catalogs and host listeners are server-owned, outside Application source and exports. The management service starts the existing Builder protected host on loopback and installs its Application-qualified runtime connection. Standard managed preview uses the existing ApplicationDataClient → session proxy → trusted assertion → DOE → ORM path. No reference launcher is required.

Each protected host serves one Dataset. The active and durable connection selections reject a second Dataset instead of replacing the first. Discovery still uses permanent identities and can later support broader hosting without replacing the editor.

After management restart the source, publication, applied resource and records remain durable. Runtime is disconnected until an authorized, explicit Connect. Reconnection uses the exact existing pin with `ActivationController.restartSame`, fresh serving generation and real health checks, then verifies the existing owner binding. It neither republishes source nor reseeds ownership. Server configuration is connection material, not the authority for Dataset ownership.

The existing Trigger source adapter filters known foreign Application/Dataset definitions before resolving host-local bindings. Unidentifiable invalid source still fails closed. Approved Workflow execution remains gated by the existing host catalog; a managed host with no approved Workflow IDs rejects invocation. No Workflow interpreter or runtime expansion is added.

## Recovery and reader contention

Apply records an exclusive durable attempt before domain creation. An incomplete attempt/domain cannot be silently reused or reseeded; status reports incomplete activation and the existing Data Services recovery requirement. No rollback spanning source, publication, activation, binding and host connection is claimed. Source and permanent identities are retained.

Stale source, duplicate artifact IDs, redirected creation paths, incorrect ownership, unsupported definitions, revoked authority and serving mismatches fail closed. Connection setup failure disposes its listener and removes the incomplete in-memory connection so an authorized retry is possible.

Managed preview can briefly hold the accepted Foundation source graph lock. Workspace discovery/focus now distinguishes the exact live-writer busy error from authorization denial, corrupt/incomplete locks and policy changes. Only those read operations retry, at most twenty attempts over 1.9 seconds, under the same original session binding. Exhaustion still suspends access; permission denial never retries. No lock stealing or mutation retry was added.

The existing Visual and composition Vite readers also retry a complete graph capture when blocked by that exact live-writer error. Each attempt reacquires the authoritative graph lock and constructs a fresh revision. Initial managed preview therefore tolerates brief contention with Builder reads. The bound remains twenty attempts; incomplete/corrupt locks and validation/recovery failures still fail immediately. Production frozen composition loading is unchanged. Real lock tests prove no partial capture or live-lock stealing and continued incomplete-lock rejection.

## Form and acceptance boundary

Dataset discovery includes saved source and, separately, a verified applied schema/publication. Existing configured Forms can consume that applied schema and the shared Application data services. The verification journey mounts a configured Form through the existing renderer and proves persisted submission against the UI-authored Dataset. Form configuration is disclosed test preparation; visual Form mapping and create/link flows remain WP4.

Environment installation, predefined development Users and explicit trusted security setup are disclosed prerequisites. Dataset creation, supported scalar edits, apply confirmation, connection and record CRUD are demonstrated through actual Builder controls. The complete UI-only administration, Form authoring and reference Application journey remains WP6.
