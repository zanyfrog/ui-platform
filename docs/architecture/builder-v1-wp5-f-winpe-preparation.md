# WP5-F WinPE preparation and feasibility review

Date: 2026-10-20. Decision requested: preparation acceptance only.

The design remains conditionally feasible, but is **not ready for a maintenance boot or recovery execution**. Eight final disposable native scenarios and the portable Foundation/definition-validation proof passed on normal Windows. Complete security-metadata capture and actual WinPE runtime compatibility have not been demonstrated. Neither the real lock nor its Component was acquired or modified. No boot, shutdown, media write, UI regression run or production change occurred.

## Results and limits

Evidence is under `evidence/builder-v1-wp5-f-winpe-preparation/`; `verification-summary.json` records final outcomes and `proof-results-v5.json` records collector completion details. The unchanged, previously verified stdout/stderr collector was reused.

| Disposable proof | Result |
| --- | --- |
| Exclusive handle; volume/file identity and content checks; quarantine and rollback | Passed |
| Native same-parent, same-volume rename with replacement disabled | Passed |
| Occupied destination and occupied rollback destination | Rejected without replacement |
| Changed file identity, content or declared volume identity | Rejected |
| Exit after completed quarantine, restart, verify and rollback | Passed; this is not a power-loss durability test |
| All fixture streams, available security descriptor and basic metadata comparison | Streams and owner/group/DACL matched; creation/write time and attributes unchanged |
| Complete security descriptor including SACL | **Not proven**: ACCESS_SYSTEM_SECURITY open failed with 1314; SACL read failed with 5 |
| Normal Foundation acquisition/read/release and normal definition validator | Passed; invalid definition rejected; functions not executed |
| Incorrect canonical mapping and case alias | Rejected in disposable reader proof |

Access/change times were recorded, not reset. No claim of complete timestamp preservation is made. Physical cross-volume renaming was not tested; the helper limits operations to one parent and rejects mismatched recorded volume identity. Stream enumeration and byte comparisons cover the created fixtures, not arbitrary production objects or a complete backup/restore implementation.

The helper opens one exclusive handle, verifies identity/content, renames with `SetFileInformationByHandle`, and verifies the resulting path through the held handle. It does not rely on a separate check-then-delete sequence. Native filename buffers include the terminating UTF-16 NUL. These mechanics do not establish an external maintenance boundary by themselves.

Earlier diagnostic failures are retained. The first attempt used an unsupported managed ADS path operation. Version 3 exposed a missing native filename terminator and an unexpectedly named fixture; its directory listing and files remain preserved. Corrected versions used fresh fixture roots. Final version 5 also records the security-privilege failure explicitly. Passing mechanic checks must not be interpreted as passing the complete-security prerequisite.

`FixtureRenameProof.cs` is compiled for x64 and hard-bound to the new disposable fixture tree and fixed scenarios. It rejects reparse paths and accepts no arbitrary recovery target. Its partial-security fallback is solely a disposable mechanics probe. **It is not an approved real-target recovery executable.** A later WinPE fixture test needs a reviewed fixture binding and designated scratch location; no helper may be repointed at the actual Component store under this authorization.

## Runtime and dependencies

`runtime-dependency-manifest.json` records source/destination hashes for the copied Node executable, five compiled Foundation modules, five compiled Visual validation modules, one Data Services expression module and the diagnostic reader. The isolated package metadata exposes only this dependency closure. Selected compiled product modules were copied unchanged; production builds or sources were not changed. The reader calls normal `readRoleBundle`, `parseMetadata` and `validateArtifact`; Component functions remain source text and a sentinel verifies they were not executed. This is not a substitute JSON validator.

`binary-and-resolution-manifest.json` records native imports and JavaScript resolution. The Node executable is v24.19.0, with a valid OpenJS Foundation signature. Static imports include CRYPT32, WS2_32, USER32, dbghelp, ADVAPI32, IPHLPAPI, USERENV, SHELL32, ole32, WINMM and KERNEL32. The native fixture helper requires the .NET Framework CLR. Static import resolution and execution on installed Windows do not prove availability of all dynamic dependencies or supported behavior in WinPE.

Microsoft requires ADK Deployment Tools and the separate matching WinPE add-on. Neither is present at the inspected standard installation locations. A future kit requires a trusted x64 image and matching optional components. WinPE-NetFX provides a reduced .NET subset, with component dependencies; its cryptographic and CLR compatibility with this helper remains an explicit boot-test gate. See [WinPE download requirements](https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/download-winpe--windows-pe?view=windows-11) and [optional components](https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/winpe-add-packages--optional-components-reference?view=windows-11).

## Machine, media and security feasibility

The operator confirmed physical console access and a dedicated spare USB. No drive was selected, formatted, written or booted. A future operator-reviewed media plan must identify the disposable USB unmistakably, verify trusted tool/image provenance and choose boot signing compatible with the machine's Secure Boot trust/revocation state. Media creation can erase the selected drive and requires separate authorization. See [Microsoft's media preparation requirements](https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/winpe-create-usb-bootable-drive?view=windows-11).

`hardware-and-trust.json` records ordinary-token read-only queries. The machine uses a signed Microsoft Standard NVM Express Controller driver (`stornvme.inf`) and Microsoft disk driver. This supports investigating inbox NVMe support first; actual WinPE access to this disk is untested. Do not inject unrelated Xbox or Storage Spaces drivers merely because they are installed. Any additional storage driver must match demonstrated hardware need and trusted provenance.

Encryption protection and Secure Boot status queries were denied by the current token. Their status is unknown. No recovery key, password or other secret was requested, displayed or stored. No protection or boot settings were changed. Operator-approved elevated read-only status inspection is still required. If encrypted, the operator must arrange offline unlock privately through an approved mechanism; credentials must never enter this evidence tree.

Complete metadata preservation requires proving the effective security/backup privileges needed to read and preserve owner, group, DACL, SACL and streams, and to restore the required metadata in disposable tests. Current failures 1314/5 mean this prerequisite is unmet. Do not change ACLs or weaken capture requirements to proceed. Administrative status alone is not evidence that each required privilege is enabled or each operation works.

## Canonical identity and offline mapping

The sole future eligible lock remains `components/.uib/locks/eeea95554098a2bf3112bf6532920d01f1393311b2047ed54a37bdb02126e5c5.lock`, associated with `components/wp5b-shared-9b12bff2/component.visual.json` beneath `C:\Projects\Modular\ui-platform`.

Recorded volume: `\\?\Volume{d195cd5b-ae06-4628-9924-2ece4aab7d9e}\`; serial 1344742221. Recorded GPT partition is disk 0 partition 3, offset 1132462080, size 998109085696; disk identity `eui.E8238FA6BF530001001B448B4F91048D`. The real lock's recorded file ID is `0x0000000000000000003c0000000a6ed8`, with zero bytes and SHA-256 `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

A drive letter alone is insufficient. Future maintenance must reconcile disk, partition, volume, file identity and preserved content, then prove Foundation sees the original canonical `C:\Projects\Modular\ui-platform\...` identity and calculates the original lock key. A path under a different offline drive letter cannot silently become a new authority. Do not use junctions or casing aliases to evade canonical checks. Actual offline mapping remains unproven; if the original path cannot be established safely, stop for architecture review. No mapping changes were made here.

## Future gates and stop conditions

1. Operator approves elevated read-only security/encryption and privilege checks. Record statuses only, never secrets.
2. Review trusted ADK/image provenance, driver requirements, signing compatibility, media identity, secure credential handling and backup locations. Authorize media preparation separately before writing any drive.
3. Review a fixture-only boot plan and explicitly authorize a maintenance boot/test. Verify Node, CLR/crypto, dependency closure, full metadata/stream preservation, native collision/interruption behavior and canonical mapping while the installed Windows environment remains inactive. Do not release the exclusive boundary merely to run the normal validator.
4. Preserve independent byte/metadata evidence and demonstrate rollback before considering an actual-target executable and execution plan. Any missing SACL/stream/identity information, unexpected reparse point, occupied destination, ambiguous interrupted state, inaccessible volume or failed validator is an immediate stop.
5. Only a later explicit real-recovery authorization may permit the exact lock operation. Preparation acceptance or fixture boot success is not recovery authorization. No automatic reclamation, owner-format change or global recovery-rule change is proposed.

If WinPE cannot host the required unmodified runtime/validator or metadata tools, an external full-Windows maintenance environment is the fallback for separate review. It must keep the original OS and every source consumer inactive throughout, supply trusted storage/unlock access and prove the same canonical identity. A second Windows installation's own C: mapping can create an additional obstacle. Its availability and identity mapping are not established. A live-host VM or returning to ordinary Windows early would not satisfy the boundary.

## Evidence and recommendation

The separate [evidence addendum](builder-v1-wp5-f-winpe-evidence-addendum.md) records the eleven previously unlisted outputs and seventeen CRLF/LF differences without rewriting historical evidence. `builder-v1-wp5-f-winpe-preparation-files.json` is the exact new-file inventory, including preserved failed attempts and fixture stream evidence. `preservation.json` records historical comparisons and target checks. **Final-check discrepancy (11:35 EDT): the recorded real lock is absent. This preparation did not remove, rename or recreate it; the cause is unknown. Target preservation cannot be certified. Reconcile this state before any further recovery planning or execution; the earlier recorded identity is historical evidence, not a current ownership claim.**

Recommend acceptance of this bounded preparation work with open feasibility gates, not authorization to boot or recover. Physical access is available; trusted media, privileged status/capture, complete metadata proof, offline mapping and actual WinPE runtime compatibility remain prerequisites. The preservation audit completed 2,385 comparisons: 2,381 matched and four did not. Three are `scripts/demo-health.mjs`, `scripts/dev-composition-reference.ts` and `tests/demo-health.test.ts`, already listed as modified in `status-before.txt`; this preparation did not edit them. The fourth is the absent real lock. These differences are retained explicitly rather than claiming a clean preservation result. All 40 umbrella requirements remain unchecked. D6, WP5-F and WP5-I remain unaccepted and open.

**STOP AT WINPE PREPARATION ACCEPTANCE REVIEW.**
