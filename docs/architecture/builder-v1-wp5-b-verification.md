# Builder V1 WP5-B - Verification and Review Record

2026-10-17. **WP5-B IMPLEMENTED AND VERIFIED - STOPPED AT USER VERIFICATION/REVIEW GATE. NOT ACCEPTED OR CLOSED. WP5-C HAS NOT BEGUN.** WP4 and WP5-A remain accepted and closed. Complete Builder V1 acceptance remains pending; all 40 umbrella requirements remain unchecked.

## Final evidence

| Gate | Result | Evidence |
| --- | --- | --- |
| Full UI Platform regression | **417/417**, 61 files | [machine report](evidence/builder-v1-wp5-b/ui-full-review.json) |
| Full Data Services regression | **760/760**, 35 files | [machine report](evidence/builder-v1-wp5-b/data-services-final-rerun.json) |
| Editor/storage contracts | **146/146**, 15 files | [final successful rerun](evidence/builder-v1-wp5-b/editor-contracts-review-rerun.log) |
| Focused accepted WP5-A and new WP5-B contracts | **29/29**; included in the full UI count | [machine report](evidence/builder-v1-wp5-b/focused-review.json) |
| UI build / typecheck | Passed | [build](evidence/builder-v1-wp5-b/ui-build-review.log), [typecheck](evidence/builder-v1-wp5-b/ui-typecheck-review.log) |
| Data Services build / typecheck | Passed across existing workspaces | [build](evidence/builder-v1-wp5-b/data-services-build.log), [typecheck](evidence/builder-v1-wp5-b/data-services-typecheck.log) |
| Production exclusion | Passed; no fixture selector, session client or editor transport in production client | [result](evidence/builder-v1-wp5-b/production-exclusion-review.log) |
| Historical evidence | **351/351** original files preserved byte for byte | [hash verification](evidence/builder-v1-wp5-b/prior-evidence-preservation.json) |
| Umbrella preservation | **A01-A40 all unchecked** | [machine verification](evidence/builder-v1-wp5-b/umbrella-preservation.json) |

These are reported implementation results for review, not a package acceptance decision or an independently completed Builder V1 reference journey. The [changed-file inventory](builder-v1-wp5-b-files.md) includes both repositories, source hashes, machine evidence and ignored verification logs. The [architecture and initial contract-review history](builder-v1-wp5-b-component-reuse.md) retain the user's approval and the earlier blocker investigation.

Raw logs, including unsuccessful runs and build/typecheck/production output, are also retained in the [lossless transcript archive](evidence/builder-v1-wp5-b/transcripts/index.md).

## Actual Builder and Application browser journey

The full suite runs real Edge/Playwright interactions in `tests/builder-v1-wp5-b.test.ts`. Application creation and explicit security setup use the existing native APIs; selected/unrelated records are seeded through protected Data Services. Authoring uses Builder controls, without source, schema or action JSON editing. This setup distinction is retained for WP6.

The successful journey:

1. Creates and configures a real Dataset, then explicitly validates, applies and connects it through Builder.
2. Creates a shared Platform Component and its public property/binding through controls.
3. Creates two Shells, authors their Regions/content independently, and creates Pages with explicit routes/Shell selection.
4. Inserts the actual installed `uib-card` implementation twice, with independent public settings. Package-owned instances have no writable Edit Definition command.
5. Inserts content into the package's declared footer slot, selects its native action mode, and authors its actual `uib-card-action` event to declared local state. Preview renders the real package and observes the event result.
6. Configures two consumers of the same shared Component; navigates to its definition and returns without changing that definition.
7. Declares local delete-result state and authors a versioned protected record-delete action, choosing the real applied Dataset and binding its target to `route.id`.
8. Creates a Form from that Dataset using existing WP4 controls; inserts independent consumers in both Pages and binds an Admin instance to route-selected edit operation/record ID. Navigates to the Form definition and returns.
9. Rejects a colliding parameterized route through the native creation API. Explicitly remaps unmatched Regions to the other Shell while retaining permanent Page/Route identities and authored content.
10. Exercises nonpersisting design preview: the delete action makes no storage change; the package's declarative local event remains observable.
11. Runs the normal Application on its managed base URL. The UI-authored Admin Form loads the selected record, edits/submits it through protected services, and verifies the persisted update.
12. Clicks the UI-authored delete action. The selected record is absent, the unrelated record remains unchanged, and the declared result-state binding reports the actual successful protected outcome.
13. Confirms invalid Dataset/primary-field/type targets, denied identity and revoked authority leave storage unchanged.

See [browser identities/results](evidence/builder-v1-wp5-b/browser-acceptance.json), [Builder screenshot](evidence/builder-v1-wp5-b/builder-authoring.png), and [running Application screenshot](evidence/builder-v1-wp5-b/running-delete.png). The full report also passes the existing WP0/WP3 restart, WP4 Form and Workflow browser regressions. Fresh compatibility output is archived under this package; accepted earlier evidence is restored, not replaced.

## Native and protected invariants

The approved `record-delete` version 1 declaration stays within Visual schemaVersion 1. It requires permanent Dataset/applied primary-field identities, the existing scalar expression contract, and a correctly typed, explicitly declared local result state. Unknown versions/keys, malformed state containers/names and invalid expressions fail native validation. Reference extraction reuses the existing owner-qualified Dataset diagnostic dependency.

The protected engine resolves the applied identity/schema and constructs a single row using its actual primary key. Exact scalar type, current binding, operation/record authorization and current policy remain authoritative. No client physical key, actor, grant, schema, executable handler or bulk request is accepted by this adapter. Focused protected tests verify correct target/unrelated preservation; malformed, cross-Application, stale, missing, denied and revoked requests; copied Delete Trigger snapshot isolation; and an honest **committed failure** after an after-commit handler fails. Before-write failures are not committed; uncertain transport outcome is unknown and is never automatically retried.

Existing Form create/edit, mandatory Dataset validation, hidden-value semantics, calculations, generic service actions, shared rendering and WP2 editing/history/revision contracts remain compatible. Independent instance edits preserve every source role of the authored shared Component/Form, the installed Card module and its manifest. In addition, both original installed manifest files and all four pre-existing Platform Component metadata files still match their initial inventory hashes: [preservation evidence](evidence/builder-v1-wp5-b/original-definition-preservation.json).

## Unsuccessful and transitional evidence retained

Every earlier report remains in the WP5-B evidence directory; a later pass does not rewrite a failed run.

- The initial inventory/native expression probe and failed stdin probe remain unchanged. Initial builds exposed nullable-field and optional Shell-ID TypeScript issues; these were corrected. An initial backup command used the sibling working directory and copied nothing; the correct raw backup was taken before compatibility tests.
- `contracts-initial.json` failed before tests on a sandbox temporary-cache rename `EPERM`. Normal local filesystem/server access was used for subsequent verification.
- Browser attempts 1-3 exposed the test's missing explicit Shell permission, an unwrapped native fixture, premature focus assumptions, and a real creation-navigation bug where undefined Component IDs matched the wrong Shell. Trusted setup permissions, fixture/focus synchronization and permanent-identity matching corrected these. Inspector action selection retains its draft during refreshes.
- Attempts 4-7 retained URL-base, dialog cleanup and focus diagnostic failures. The harness now follows the actual managed redirect/base and waits for authoritative tab focus. Attempt 8 passed its browser/native checks. The final full-suite journey adds both authored Shells and actual routed Form read/edit before delete.
- `data-services-final.json` retained two assertion failures: Delete Triggers already expose copied public snapshots rather than mutable delete input rows, and after-commit outcomes retain both wrapper and underlying errors. Corrected assertions pass in the complete **760/760** rerun; no accepted Trigger contract was replaced.
- `ui-full-final.json` retained **413/414**: sharing route validation initially stopped independent composition diagnostics. `focused-closure.json` then caught the accepted malformed-metadata diagnostic-code contract. The authoritative collector was corrected, with accepted WP5-A tests unchanged; all 29 focused checks now pass.
- `ui-full-closure.json` retained a transitional **416/417** run against the earlier build when the newly tightened legacy mapping assertion was loaded. The final review build and **417/417** run use one fixed implementation revision. Hero's unsupported presentation-record alias is explicitly unavailable; no guessed attribute mapping remains.
- `editor-contracts-review.log` retained **145/146**, with a Windows watcher directory-rename `EPERM`. The unchanged contracts passed **146/146** on rerun. No product lock/consistency guarantee was weakened to obtain the pass.

A superseded preview request was correctly rejected with revision `409` after remapping; an explicit current preview rendered successfully. No stale source substitution is claimed.

## Retained limitations and next gates

The six legacy package entries have limited public metadata. Supported direct presentation settings are exposed; missing typed properties/slots/events and Hero `visual_mode` instance mapping remain explicit. Card is the complete metadata-driven reference. No manifest-backed package Button exists; HTML buttons are ordinary content. This host does not invent executable handler registrations.

D5 remains open: the trusted typed normal-host registration contract for `reference.notification` or another existing approved service requires review before WP5-C. D6 remains open: coherent-reader contention remediation planning and admission/locking design review belong to WP5-F; reliable simultaneous Builder/runtime operation is required before WP5-I. The browser journey closes Builder before normal Application startup and explicitly does **not** prove contention-free simultaneous use. Full management-restart/browser evidence A37 remains WP6. No WP5-C, WP5-F or WP6 implementation was started.

All 40 umbrella requirements remain unchecked. Earlier accepted WP0-WP5-A scope/evidence is preserved. **Return this record for WP5-B review; do not automatically proceed.**
