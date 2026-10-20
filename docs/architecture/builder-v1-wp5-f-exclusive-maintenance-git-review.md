# WP5-F — separate Git checkpoint reconciliation

2026-10-20. Read-only comparison of checkpoint `c86ecb3708fd619791b7f667b02b0c4c673bd686` with prior documented HEAD `7050993160cee3ffeb49674fa4696dc6ff8f694a`. No index, branch, configuration or object-store mutation, remote contact, commit, amend, reset, push or synchronization was performed.

## Provenance and scope

Current local branch is **main**, at `c86ecb3708fd619791b7f667b02b0c4c673bd686`. Its single parent is exactly `7050993160cee3ffeb49674fa4696dc6ff8f694a`. Git author and committer metadata both declare Kelly Harris, 2026-10-20 **10:05:28 -0400**, subject `pre Shared-Component Lock Recovery Review`. The local HEAD reflog records that commit at the same time. Signature status is `N` (no signature). Metadata/reflog provide declared local provenance, not independent authentication of the human actor or evidence of approval. The present review does not retroactively authorize a commit that earlier task instructions prohibited.

The checkpoint contains **683 changed paths: 657 documentation/evidence paths and 26 production/test/tooling paths**. Detailed per-path statuses, Git blob IDs, working-copy SHA-256, applicable phase inventory and reconciliation are in `checkpoint-reconciliation.json`. Planning documents are matched to the preserved pre-D6 baseline; the ordered D6/Form/watcher/diagnostic/remediation inventories establish the latest expected version of other paths.

All **26 non-documentation changes** match their latest applicable recorded phase inventory: D6 lock/source/read-admission and related regression work, reviewed Form refresh, the narrow watcher exclusion and the approved Foundation unresolved-owner correction. No unmatched code, test, production configuration, security invalidation, focused-preview implementation or WP5-G/WP6 source change was identified in this comparison. The four preserved pre-D6 planning documents match their existing baseline. Inventory correspondence supports scope/content reconciliation; it is not a substitute for human implementation or Git authorization.

The later Shared-Component Lock Recovery Review report/inventory/evidence remain untracked and outside this checkpoint, as expected from their creation after the checkpoint. This review adds its own untracked documentation/evidence only. All historical and actual-source hashes are additionally checked by the new phase's preservation record.

## Separate discrepancies and limitations

**1. Eleven generated WP5-E diagnostic outputs are outside their original inventory.** They are under:

`docs/architecture/evidence/builder-v1-wp5-f-windows-eperm/wp5-e-produced/builder-v1-wp5-e/browser-1792414064709/`

The paths are `administrator-disabled.png`, `dependency-refresh-after-save.png`, `final-or-failure.png`, `final-or-failure.txt`, `initial-problems.json`, `multiple-dirty-tabs.png`, `multiple-independent-problems.png`, `nonadministrator-readonly.png`, `problem-exact-node-navigation.png`, `restart-persisted-disabled.png`, and `verification.json`.

Their location/content is consistent with the documented authorized exact WP5-E diagnostic journey, and their committed blobs match their working-copy bytes. However, `builder-v1-wp5-f-windows-eperm-files.json` does not include them, so the prior manifest cannot independently establish their historical hashes or exact generation provenance. This is an **inventory/evidence-provenance gap**, not proof that the outputs were unauthorized or that production code changed outside scope. Their current hashes/blob identities are preserved in this review. Do not amend the old manifest, delete files or silently claim that the gap is closed.

**2. Seventeen paths differ bytewise between Git and preserved raw working copies solely by CRLF/LF conversion.** Local `core.autocrlf` reads `true`; the classification compares actual blob/working-copy bytes after CRLF-to-LF normalization and finds no other content difference. The initial raw comparison and final classified comparison are both retained. These are not semantic code changes, but they are a material distinction for evidence hashing: the Git checkpoint is **not a byte-identical archive** of those raw files under arbitrary checkout settings. Preserve existing bytes/hash records and do not rewrite them to match a Git representation. Paths and committed/raw SHA-256 are in `lineEndingOnlyDifferences` and the per-path records. A future archive/reconstruction policy should address this separately from lock recovery.

**3. Ten manifest self-entries intentionally have no self-hash.** This is declared in those inventories to avoid circular hashes. Git blob/work-copy comparison and later captured inventories provide additional context, but the null fields are not independent self-authentication. Their list is preserved in the reconciliation JSON.

After separating the 11 inventory gaps and 17 verified line-ending-only differences, there is **no remaining code-content discrepancy or other observed blob-content discrepancy**. This finding does not prove independent approval of every artifact, the original diagnostic causes, or the commit act itself. No remote status was fetched and no conclusion about current GitHub state is made.

## Method and operational notes

`reconcile.py` reads the two Git trees, phase inventories and original baseline; it computes current SHA-256 and Git blob correspondence without writing Git objects. One task-owned first attempt was stopped to replace whole-file hashing of the retained large trace with bounded streaming; `reconciliation-attempt-1.json` records the verified worker PID and that no historical file was changed. The completed streaming comparison and the separate bounded text-only line-ending classification are retained. No target runtime/process was stopped, no trace collected and no product test run.

The 11 artifact gaps and byte-representation issue should be reviewed as **separate evidence/Git governance items**. They do not authorize cleanup, amendment, synchronization or a change to the lock-recovery proposal. No discrepancy is folded into an incidental recovery action. **Stop at Exclusive Maintenance Boundary Architecture Approval Gate.**
