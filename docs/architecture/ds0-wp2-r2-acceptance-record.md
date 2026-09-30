# DS0-WP2-R2 G3 acceptance record

The user accepted R2 for the documented isolated development-checkout scope and limitations on September 29, 2026. The implementation, original report and evidence remain preserved. This acceptance does not approve production hosting, stale-lock recovery, migrations or deployment.

The accepted eleven Data Services files were already committed as `d866b86d1fd7f2807ee3708a593b164930df156e` (`WP2-R2 is implemented`), parent `07f11bc3ad16e249b97311be7641f1c91d48753e`. The commit contains exactly the eleven reported files. A second commit was not created. The read-only review and per-file hash comparison are retained in [R3 baseline evidence](evidence/ds0-wp2-r3/before.json). Package versions and dependency locks remain unchanged.

## Separate follow-up issues — not authorized repairs

| ID | Defect / consequence | Required future review |
| --- | --- | --- |
| DS0-HTTP-QUERY-ERROR | The production query handler writes HTTP 200 headers before awaiting the query. A query error then attempts HTTP 400 headers and raises `ERR_HTTP_HEADERS_SENT`. The development adapter awaits the handler promise and destroys the failed connection; this contains the error only in that adapter. | Review production error/response ordering and compatibility; add real HTTP query-error tests. No production handler change is included in R3. |
| DS0-APPLIED-VALIDATOR | R1 `resolver.ts` and R2 `activation-state.ts` duplicate applied-state eligibility validation, creating drift risk. | Review a shared-validator contract, caller error behavior and regression coverage separately. R3 journal validation is a narrow independent invariant boundary, not approval to refactor these accepted validators. |

The accepted R2 report and its initial failure evidence are authoritative for the reproduced defect. Both follow-ups remain open.
