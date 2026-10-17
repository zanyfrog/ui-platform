# Visual Artifact + Form/Data Integration V1 — verification

Date: 2026-10-11. Review status: **VISUAL ARTIFACT + FORM/DATA INTEGRATION V1 READY FOR REVIEW**.

## Final automated results

| Check | Result |
| --- | --- |
| `npm run build` | Passed |
| `npm run typecheck` | Passed |
| `npx vitest run --maxWorkers=2 --testTimeout=60000` | **43 files, 248 tests passed** |
| `vite build --config references/visual-artifacts/vite.config.ts` | Passed |
| `node scripts/test-visual-artifacts-browser.mjs` | All 10 browser checks passed |
| `node scripts/check-editor-production.mjs` | Passed; production client excludes development identity/editor session machinery |

The complete suite includes `tests/form-data-integration.test.ts`. Its three
tests cover source-service generation/conflicts, mode/validation/payload
contracts, and a real browser plus protected Dataset/DOE integration. The
browser integration also executes the focused checks in
`references/form-data/src/checks.ts` using real installed UI Base controls.

## Real data acceptance evidence

The test publishes the reference Person Dataset, verifies its ORM registration,
installs isolated development application/resource and I-AM policy authorities,
and starts the existing protected Data Services host and source-development UI
server. Browser sign-in uses `admin@example.local` through the existing V1
session flow. The protected host disables legacy bearer authentication and
requires the UI server's signed, one-use trusted identity assertion.

The browser then:

1. Opens `/people/register`, using the shared PersonForm in public/create mode.
2. Enters Ada, Lovelace and an email through actual Package controls; status is hidden.
3. Submits through ApplicationDataClient → session proxy → protected DOE → real ORM.
4. Receives a committed result, queries the saved record, and displays it.
5. Reads the actual ORM JSON file and confirms the persisted value.
6. Opens `/people/<saved-id>/edit`, loading the same record into the same Component in admin/edit mode.
7. Changes firstName to Augusta and status to active, submits an update, then reads/displays the updated record.
8. Sends a crafted update containing prohibited internalNotes. DOE returns `success:false`, `committed:false`; the storage file is byte-for-byte unchanged.
9. Sends a crafted create missing mandatory Dataset fields. It is rejected and storage remains unchanged.
10. Reloads the admin route and verifies the persisted firstName is Augusta.

The Dataset uses a deterministic definition and isolated temporary authority
and storage directories. Individual record IDs are generated uniquely. Test
cleanup removes those disposable records after persistence has been verified;
no production data or identity authority is used.

## Contract and browser coverage

| Requirement | Evidence |
| --- | --- |
| Platform Component identity, discovery, Dataset and blank creation | Both paths use VisualArtifactService; ordinary catalog listing returns Form capability and permanent component ID |
| Stable Dataset mappings and field reorder | Generated mappings checked; moving HTML wrappers changes presentation order; stale revision save rejected |
| Source authority and external reload/conflicts | Existing editor browser check passes unchanged behavior |
| Ordinary content and Package controls | Reference includes HTML heading/instructions/layout/CSS and installed Form controls; actual Page → Form → Package rendering tested |
| Default/public, selected/admin, inheritance | Default restrictions and selected overrides checked; same Form reused |
| Fixed and dynamically bound mode | Routed Pages use constants; browser check changes an existing local-state binding through an event action |
| Create/edit and field population | Real browser flow checks new record creation and route-driven reload/edit |
| Hidden/read-only preservation | Browser mode switches preserve internalNotes in local state; authorization metadata disables its control |
| Changed permitted update set | Original browser adapter check received identity plus changed firstName while the other fields were unchanged or host-denied; it did not prove editable hidden-field submission. Superseded for visibility semantics by [WP4 reconciliation](builder-v1-wp4-hidden-field-reconciliation.md) |
| Mandatory validation cannot be weakened | Source validation rejects a required override; runtime prevents invalid adapter calls; protected backend rejects missing required fields |
| Authorization precedence | Host-provided restriction overrides admin editability in browser; crafted field write independently rejected by real DOE |
| Submission state and events | Browser checks submitStarted, submitSucceeded, recordUpdated, submitFailed, dirty/submitting/submitted, validation and error state |
| Real protected create/read/update | Browser plus real V1 session, DOE host, ORM file verification and updated-record reload |
| Preview runtime | Existing live preview passes; added check opens PersonForm in the editor, fills its real Package control and verifies public-mode visibility |
| Production exclusion | Production checker passes; reference fixture/schema/session launcher are not imported by the production UI entry |

## Observed issues and limits

An initial default-concurrency run hit three existing five-second test
timeouts. A later two-worker run passed 247 tests and encountered the existing
Windows watcher directory-rename `EPERM`. The final two-worker run passed all
248 tests. This does not close the separately tracked intermittent watcher
issue: see `artifact-watcher-windows-rename-issue.md`. No watcher assertions,
skips or automatic retries were introduced.

The new browser checks caught a missing success-state/event update during
implementation; it was restored and the final complete suite verifies it.
Editor preview also verified that Form package registration belongs in the
shared runtime, avoiding unsupported bare package imports in served custom
functions. Final reference custom code is empty.

Architecture limits are explicit: Dataset creation starts from imported
published schema JSON rather than a new live schema catalog; complex field
derivation and advanced rule panels remain source-authored/deferred. The
runtime accepts host-provided authorization metadata, but this package does
not invent a permission-discovery endpoint. Backend authorization remains
authoritative regardless of available UI metadata. Legacy Form artifacts are
not bulk-migrated. See `visual-artifact-form-data-integration-v1.md` for the
full architecture, reuse decisions and deferred scope.

## Review artifacts

- Architecture: `visual-artifact-form-data-integration-v1.md`
- Component: `components/person-form/component.visual.json` and its normal source bundle
- Dataset and Pages: `references/form-data/`
- Development launcher: `npm run dev:form-reference`
- Focused verification: `npm run test:form-data`
- Exact source/document inventory: `visual-artifact-form-data-integration-v1-files.txt`

Work stops at this review gate. No Workflow/Trigger editing, production
identity, deployment, publication/versioning or application-scope Components
were added.
