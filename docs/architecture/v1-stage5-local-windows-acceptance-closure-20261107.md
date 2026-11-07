# Stage 5 Local Windows Integration acceptance — November 7, 2026

The owner accepted Recommendation A. **Stage 5 Local Windows Integration is accepted for the verified configuration. Overall V1 acceptance remains a separate decision.**

| Accepted input | Revision or configuration |
| --- | --- |
| UI Platform `main` | `10206d1b3a1492526f9ef78b6d17f5c881a77a6b` |
| Data Services `master` | `d2525592eee4d6286537a7093510e59fd4c342f2` |
| Integration target | Isolated local Windows environment with separate Runtime, Data and Management processes, loopback mTLS and local enrolled identities |
| Proof freshness | 15-second host proof budget used in the complete journeys. Full-journey behavior at the one-second factory default remains unqualified. |

The accepted [matrix](v1-final-technical-planning-20261103/V1-FINAL-ACCEPTANCE-MATRIX.md) covers Builder, Dataset, Form and Viewer workflows, permanent field identity through save, reload and canonical apply, publication and frozen releases, local permissions and WP3 templates, revocation, private assets and public isolation, internal JWT clock and replay checks, downloadable ZIP integrity, and Windows process and dependency boundaries. The evidence includes two complete clock-correction journeys and one complete ZIP-correction journey. The ZIP test verified 349 archived files against the prepared export and 46 included frozen composition files against the selected release. [Clock and replay review](v1-stage5-windows-clock-replay-correction-review-gate-20261106.md) · [ZIP review](v1-stage5-windows-zip-export-review-gate-20261106.md)

Retain `PLAN_EVIDENCE_STALE`, the unexpected private-metadata 403, the fresh Viewer policy-staging 403, historical Form and startup refusals, and the saved `field3` discrepancy as historical regression and availability findings. Subsequent passes establish behavior in the tested runs. The original unattributed failures remain unresolved. If one recurs, capture the first failing operation and request-specific evidence. The clock review retains the limits on detecting discontinuities between observations and the controlled relaunch requirement following a detected fault.

Independent WP3 review remains required before production or broader distribution. Production and provider qualification remain future work. Stage 6 and Stage 7 require separate authorization.

The 41 uncommitted historical clock diagnostic files remain a separate evidence set. Their existing inventory governs any later, separately authorized checkpoint. The acceptance checkpoint contains only the matrix update, the implementation sequence status update, this closure record and its hash inventory. Existing evidence retains its original findings. The owner accepted the retained test evidence for this closure.
