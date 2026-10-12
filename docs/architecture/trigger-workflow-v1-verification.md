# Trigger + Workflow V1 verification

Verification uses the real protected Data Services engine, existing I-AM evaluator/security planner and JSON ORM. Persistence assertions reopen the ORM or read persisted file bytes, rather than relying on cached/in-memory echoes. Development services are deterministic and send no email or external notification.

## Recorded checks

| Check | Result |
| --- | --- |
| UI Platform production build | PASS |
| UI Platform type checks | PASS |
| UI Platform full regression suite, two workers, 60-second default test timeout | 45 files / 274 tests PASS |
| Focused automation source/protected DOE tests | 24 tests PASS |
| Automation real Edge browser checks | 3 tests PASS, 97.48 seconds |
| Existing Visual Artifact/real-package/editor browser harness | 10 checks PASS |
| Data Services full regression suite, one worker | 33 files / 724 tests PASS |
| Final affected Data Services protected-engine tests after record-ID metadata adjustment | 19 tests PASS |
| Data Services package build | PASS |
| Visual Artifact reference production build | PASS |
| Automation reference production build | PASS |
| Production client exclusion, including automation management/fixture markers | PASS |
| Diff whitespace checks in both repositories | PASS |

The full UI Platform suite includes the two initial automation browser tests. A separate launcher-management smoke test was added afterward; final targeted browser results are recorded below. The full-suite count is not inflated to include a test that was not in that invocation.

## Acceptance evidence

| Requirement | Evidence |
| --- | --- |
| Trigger/Workflow CRUD and stable identity | Both source-store CRUD tests; editor mutation cannot replace ID; external edits reload; stale hash rejected; deletion blocked by references. |
| Source-authoritative management | Real browser creates/edits/deletes a Trigger, observes manual disk edit, preserves dirty conflict, reloads explicitly, verifies unchanged ID. Workflow uses the same editor/store with its specialized fields and catalog. |
| Disabled and validated definitions | Disabled source remains listed/editable and does not execute; unknown phases, scopes/actions, nesting, credentials/authority properties and unsafe paths rejected. |
| Lifecycle arrays/context | All seven phases execute; two-record insert; update old/new/changed-fields; delete old records and empty new records; each invokes per record, batch once. |
| Deterministic ordering | Different priorities and same-priority permanent-ID ties; folder names intentionally oppose priority order. |
| Before changes and authority | Missing status default; required-field removal rejected; `set` and service patches cannot write a denied field. |
| Before/after rollback | Bulk insert failure plus before/after update/delete rejection; original persisted bytes unchanged and no post-commit delivery on rollback. |
| Downstream transactions | People afterInsert creates History through DOE; History beforeInsert/afterCommit execute; both resources visible on disk only after root commit; child failure rolls both back. |
| Protected reads | CRUD read action and approved service read use DOE and see transaction-staged records. |
| afterCommit | Deterministic downstream-before-parent callbacks; failure leaves committed data and counts, audit failure, separate Platform `data`/`afterCommit` results and duplicate-write caution. |
| Recursion | Pre-commit recursive writes fail with cycle diagnostic and roll back; post-commit recursion fails without undoing the original commit. |
| Workflow order/result | Single scalar ID; protected primary read; explicit dynamic bindings; primary view refresh; ordered CRUD/read/service steps; completed/failed-step counts; disabled rejection. |
| Workflow failure | Step 3 fails after two completed steps; step 4 never executes; earlier persisted update and deterministic external effect remain. |
| Visual/Form integration | Real Edge uses the accepted PersonForm, then Form recordCreated success invokes permanent PersonActivation; Page button invokes the same Workflow again; results displayed and persisted status/history verified. |
| Trusted identity/security | Existing development application-admin identity for data; separate explicitly assigned security-admin/Platform Manager for management; forged browser actor/grants rejected; prohibited field write rejected by backend. |
| Audit | Bounded diagnostic records, action/step IDs, scope/phase/order, actor IDs, affected IDs, errors and chains; no record payloads in routine logs. |
| Accepted baselines | Full Platform and Data Services suites, plus the existing Visual Artifact real-browser harness; no accepted stabilization test assertions weakened or removed. |

## Execution notes and limitations

Some browser and older deployed-host test attempts exceeded timeouts during concurrent workload or long host pauses. The final Data Services full suite ran with one worker and passed all 724 tests without changing the existing 30-second test timeout or its assertions. Earlier functional service-context regressions found during implementation were corrected before that passing run. Tests that launch TypeScript processes/real browsers ran outside the restricted Windows sandbox after a temporary-file rename restriction prevented the test runner from starting.

Automatic approval review rejected an intermediate proposal to skip a lease check for empty post-commit dispatches. That proposal was not applied. The applied alternative validates the active context when collecting callbacks and queues only operations with handlers; executing callbacks retain their context checks. No permission exception is pending.

The accepted storage limitations remain: no crash-safe multi-file commit recovery or cross-process writer isolation. V1 audits are bounded process diagnostics, not durable execution history. No production identity, publication/deployment, retries, queues, advanced workflow graphs, broad Builder work or legacy Form migration is included. The architecture document records the separate existing UI and applied-Dataset resource resolvers, the reference identities and the history-row reference simplification.

## Final targeted browser checks

All three checks passed in the recorded final browser run: Form success + Page invocation + protected persisted results and post-commit failure reporting; full Platform management editor behavior; and the launcher's protected management page. Deletion verification waits for both on-disk removal and disappearance of the exact catalog option. Test-created source artifacts are cleaned up even after a failure.

After separating background reload polling from user actions, both management browser checks passed again in 9.12 seconds; the final production build and strengthened exclusion check also passed. No test-created source artifacts remain.

The focused protected DOE suite also explicitly counts one transaction creation and one actual commit for the downstream People → History operation. The file inventory contains 39 Platform files and five sibling Data Services files; ignored build outputs are excluded.
