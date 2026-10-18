# Builder V1 WP5-D — Formal Closure and GitHub Checkpoint

2026-10-18. **WP5-D Menu and Branding Authoring is ACCEPTED AND CLOSED**, following explicit user review. This increment records closure and reconciles the repositories only. **WP5-E and subsequent work packages are not authorized.**

## Accepted verification and current confirmation

| Check | Accepted result | Closure treatment |
| --- | --- | --- |
| UI Platform full regression | 453/453; 65 files | Reused, not rerun |
| Data Services full regression | 760/760; 35 files | Reused, not rerun |
| Editor/storage contracts | 146/146; 15 files | Reused, not rerun |
| Focused checks | 7/7 | Reused, not rerun |
| Builds and typechecks | Both repositories passed | Reused, not rerun |
| Actual Builder/browser verification | Passed; Public/Admin Menu and branding evidence retained | Reused, not rerun |
| Production-client exclusion | Passed | Rerun during closure: passed |
| Historical evidence SHA-256 | 591/591 preserved | Rechecked during closure |
| Accepted WP5-D evidence SHA-256 | 136/136 preserved | Rechecked during closure |

All **32 modified/new source and test files across the two repositories** match their latest accepted B/C/D inventories. No source, runtime configuration, authorization, expression, renderer, editing lifecycle or test behavior changed during closure. Therefore the accepted full verification covers the exact source intended for commit. Only formal closure documentation and a narrowly scoped Git evidence-byte attribute were added in this increment. The [current confirmation record](evidence/builder-v1-wp5-d-closure/verification.json) identifies reused checks and new checks explicitly.

The original [D verification](builder-v1-wp5-d-verification.md), [D inventory](builder-v1-wp5-d-files.json), all original success/failure/transitional results and historical machine acceptance flags are retained. Current human closure annotations supersede historical pending-review wording without replacing the old test results. Pre-annotation copies of the five current tracking/architecture/verification documents are retained with their original hashes under [accepted records](evidence/builder-v1-wp5-d-closure/accepted-records.json).

## Repository reconciliation

| Repository | Established branch/upstream | Pre-checkpoint HEAD | Initial state |
| --- | --- | --- | --- |
| UI Platform | `main` / `origin/main` | `968ede9e7080db992680c66080dd1967807b3cfd` | 262 modified/nonignored untracked paths; no staged paths; upstream equal after fetch |
| Data Services | `master` / `origin/master` | `d58db877ca50947a97858acc59b4ba1bf141e79a` | Five accepted B/C source/test changes; no staged paths; upstream equal after fetch |

The [pre-closure reconciliation](evidence/builder-v1-wp5-d-closure/reconciliation-before.json) records every initial candidate, branch, upstream, source hash and ignored-output category. UI Platform's earlier uncommitted C implementation and D implementation are relevant accepted work and must travel together. Data Services' five earlier B/C changes supply the already accepted protected request, trusted service invocation and type contracts used by UI Platform; that repository receives a meaningful dependency checkpoint, not a fabricated D source change.

The two B-document inventory differences are formal B acceptance annotations, byte-identical to the preserved pre-D records. The C planning document and its three planning evidence files are legitimate historical C prerequisites and are preserved in the accepted D baseline. No source mismatch or uncertain-ownership change was found. The candidate credential-pattern/file-name scan found no matches; [scan scope and findings](evidence/builder-v1-wp5-d-closure/credential-scan.json) are retained. Absolute fixture paths and synthetic development identities inside historical evidence are descriptive test records, not deployment configuration.

Ignored dependencies, compiled `dist` outputs, `.uib` backup/runtime/scratch files, `data/` runtime state and duplicate root test logs remain ignored and untouched. They are not staged. **92 ignored files are accepted historical evidence logs**; these exact manifest-listed files are intentionally included, rather than excluding accepted evidence or broadly adding ignored outputs.

## Evidence bytes and Git

The existing `core.autocrlf=true` setting caused **185 already tracked historical evidence files** to have index bytes different from their accepted working-file hashes. Their original working bytes remain unchanged and verified. The new `.gitattributes` rule applies `-text` only to `docs/architecture/evidence/**`, preserving original snapshot bytes in Git and future checkouts. Staging the exact accepted originals repairs repository byte fidelity; it does not change their test results or replace them with new runs. Other source/configuration Git attributes are unchanged.

The first staging-byte check correctly stopped because Git retained cached normalized blobs after the attribute change. Its transcript is preserved as `checkpoint-attempt-1.log.txt`. An explicit index refresh with `git add --renormalize` is limited to the manifest-listed evidence paths and this closure's evidence. No working evidence file is rewritten.

The checkpoint inventory records the exact staged paths and byte hashes. Evidence blobs in the staged tree are checked against the 591 original hashes and all 136 accepted D evidence hashes. Historical C/D inventory snapshots are not regenerated. Source/index comparisons permit only the established Git CRLF-to-LF normalization of the previously untracked D browser test; its tested working-file hash and source content remain unchanged. Git synchronization is reported from actual verified local and remote commit IDs; this document does not assert its own commit was pushed before that check occurs.

The staged whitespace check passes for source, tests, scripts, the evidence attribute and this new closure document. The broader check reports one pre-existing extra blank line at EOF in the accepted D Markdown inventory. That historical inventory is intentionally preserved rather than reformatted; this is a documentation formatting observation, not a failed regression or changed test contract.

## Retained program boundaries

- **D6 contention remediation remains WP5-F**, subject to separate admission/locking architecture review. Existing quiescent Builder/runtime checks do not prove simultaneous-use reliability.
- **A37 full management-restart/browser evidence remains WP6.**
- **All 40 umbrella acceptance requirements remain unchecked. Full Builder V1 acceptance remains pending.**
- Accepted theme/package/Page-local capability limits and the complete successful, failed and transitional verification history remain in the D architecture and verification records.
- **WP5-E is not authorized and has not begun.**

The final closure report must use **STOP: WP5-D ACCEPTED AND CLOSED — GITHUB CHECKPOINT COMPLETE** only after both pushes and their remote commit IDs are verified. Otherwise it must report **STOP: WP5-D ACCEPTED — GITHUB CHECKPOINT BLOCKED** with the exact blocker.
