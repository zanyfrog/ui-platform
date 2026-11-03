# V1 Local Audience Pilot — Native Physical Installation Remediation Review Gate

2026-11-02. **Read-only assessment complete. No installation/remediation performed; authoring remains unqualified. No acceptance or closure declared.**

## Decision supported by the assessment

The minimum effective repair targets the **shared Builder installation**, not just the disposable Application. Recommend producing one ordinary npm tarball from the existing trusted **@ui-base/ui 0.5.1** source and installing it through npm at **C:\Projects\Modular\ui-platform\node_modules\@ui-base\ui**, retaining an archive dependency and lock integrity record. Do not replace every file dependency with physical packages, hand-edit node_modules, change trust rules or change the pilot's accepted policy.

This requires explicit approval of shared installation impact. It does not change persistent Demo content, but all Builder Applications served by this ui-platform installation may observe the repaired shared catalog/runtime. There is **no pilot-only physical install that fixes the presently demonstrated shared-root refusal** without changing existing resolution contracts. Do not describe it as isolated to the pilot.

## Exact rejection, roots and versions

Both inspected UI entries are links to the same known trusted source:

| Owner | Installed path | Current package declaration |
| --- | --- | --- |
| Shared Builder | C:\Projects\Modular\ui-platform\node_modules\@ui-base\ui | file:../ui-base/packages/ui-base-ui |
| Disposable pilot | C:\Projects\Modular\builder-demo\apps\codex-test-v1-local-pilot-20261102\node_modules\@ui-base\ui | file:../../../ui-base/packages/ui-base-ui |

Canonical source: **C:\Projects\Modular\ui-base\packages\ui-base-ui**. Both links report version **0.5.1**. Both lockfile entries explicitly have link:true and resolve to those source-directory references. The dependency specifications select that source, not a competing semver version; inspected package versions match. The pilot app.manifest.json has packages:{} and no explicit enabled native Card/Panel declaration. That does not bypass the catalog's physical-input validation.

The exact failing validator is nativeUiBaseEntry in src/server/native-ui-base.ts, invoked with the shared platformRoot by getAppPackageCatalog in src/server/packages.ts, before component discovery. The fixed root is platformRoot/node_modules/@ui-base/ui; app-local installation cannot override that probe. Other source discovery may read app-local foundation dependencies, so later authoring/runtime qualification remains necessary even after this one probe succeeds.

Required native contract, unchanged:

- Root, package.json, ui.component.json and each admitted entry module must not be symbolic links; their case-normalized realpath must equal the resolved expected path. This also catches redirected ancestors. A Windows junction/reparse redirection that changes realpath is not an acceptable workaround.
- Package identity @ui-base/ui with a string version; exactly one admitted Card and Panel manifest entry each, with original identity and module.
- Card ID cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1, module ./src/layout/uib-card.js; Panel ID @ui-base/ui:uib-panel, module ./src/layout/uib-panel.js.
- Explicit activation additionally requires enabled:true, a compatible declared version and platform-only resolution. Installation alone must not silently add/enable a native manifest declaration. Module admission remains restricted by assertNativeUiBaseModule; asset paths must stay inside their package root.

No arbitrary external package targets were followed. Inspection was confined to the already identified local UI Base package roots and the two recorded owner roots. Unknown links are not a trusted source merely because they resolve.

## Existing installation contracts and alternatives

Current toolchain: Node **v24.19.0**, npm **11.17.0**, install-links false, package-lock true; owner lockfiles are version 3. UI Base declares packageManager npm@10.8.2, so cross-version pack/install identity is not presumed. Pin the actually assessed npm version for remediation and record it; do not change global configuration or silently upgrade npm.

Normal Application creation calls npm install through the existing owner launcher. The Foundation source contract documents file dependencies and npm install --ignore-scripts. Repeating the current creation/install process with default link behavior is therefore not a remediation. No creation retry is proposed.

Available supported npm mechanisms are directory packing via --install-links (does not affect workspaces) and installing a local package tarball. A broad install-links switch can change other file dependencies; it is not the smallest controlled choice for this shared tree. A single package tarball gives a narrower durable input and integrity record. [npm install documentation](https://docs.npmjs.com/cli/v11/commands/npm-install/)

UI Base already provides scripts/pack-packages.mjs using npm pack. That wrapper deletes/recreates its package-output directory and packs ten packages, so do **not** run the broad wrapper for this one-package task. Reuse its underlying standard npm pack operation for only the trusted UI package. The Platform's manual/registry UIB extension importer requires @uib/* and a Platform service manifest; @ui-base/ui instead uses the existing native ui.component.json projection. Do not route it through that unrelated importer or fabricate a service manifest. No registry publication/download or alternate registry provenance is proposed.

Only a **dry-run** pack was performed: npm pack <known-source> --dry-run --json --ignore-scripts. It reported 54 files, 63,008 packed bytes and 302,458 unpacked bytes. No tgz was created; no installation, file copy or lifecycle/build script ran. Dry-run and script suppression are documented npm pack options. [npm pack documentation](https://docs.npmjs.com/cli/v11/commands/npm-pack/)

## Exact dependency closure and hash expectations

| Package | Inspected source/Builder version | Declared direct dependencies |
| --- | --- | --- |
| @ui-base/ui | 0.5.1 | core ^0.1.0; icons ^0.1.0; hero ^0.2.1; tour-ui ^0.1.1 |
| @ui-base/core | 0.1.0 | none |
| @ui-base/icons | 0.1.0 | core ^0.1.0 |
| @ui-base/hero | 0.2.3 | ui ^0.5.1; assets ^0.1.17 |
| @ui-base/assets | 0.1.17 | ui ^0.5.1 |
| @ui-base/tour-ui | 0.1.1 | none |

The closure has cycles through UI/hero/assets. All six are currently present as known-source links in the shared Builder tree and satisfy these simple ranges. No external runtime package dependency is declared in this six-package closure. The pilot root lacks its own direct icons/assets/tour-ui entries; current linked-source resolution differs from a packed local install. Therefore a second pilot-local tarball install is **not part of the minimum shared-root repair**. If later browser/native runtime evidence requires it, return for review of that exact closure and matching pilot package.json/lock changes; do not opportunistically fetch registry packages or silently add them. No claim is made that physical UI alone requalifies the entire closure or avoids duplicate module instances through cyclic linked dependencies.

Trusted UI Base source commit observed: **3cbe073c9192c4eba8086b88dd2978b179539b2f**; the inspected six package directories had no git status changes. Content hashes, not commit alone, are the pin. Source inventory digest (ordered path/size/SHA-256 records, 54 files): **c0abc6659fc765a6ab7c1c7bb882fa2abdadb511bded075040f4c75300ee6d38**. The dry-run pack also includes those 54 files; installation-inventory.json contains every packed file's expected installed SHA-256, dependency metadata and current package/lock hashes.

Critical expected payload hashes:

| Relative file | SHA-256 |
| --- | --- |
| package.json | 308a510a0ffb8693bb9c93dee15e406ecf9cb4f445cd9954a74b2d08b2cb8edd |
| ui.component.json | 40aa778eb59a7fb06b3bb420d11798d351a201597b329ba8a6142b29f7052469 |
| src/layout/uib-card.js | 4f4317c5b07e3ac396f2283a9dd0a9b5063653ee9d9baf9a0778af0b7e82bf45 |
| src/layout/uib-panel.js | 7ee52b33b71ee2d8a6a993df88a375b3084208920ede26b3b5ebe2048ed5c3db |
| src/layout/index.js | e228e97fa0bc807ce9114827e569c04b0cd0809e688a57d1ea36e919575a538a |

Dry-run reported archive SHA-1 **0307f71df81740cb7c87b65a4a62d78e5a5688ec**, integrity **sha512-1+ZiiYZ4fEINYOUg6zxQG2Ruo82eMRDbYFGn6J0rY2XfFF7YZUvJzr3tBTXwANfB9fn7Ll+YifzEOiTqVCizmg==**. These are **predicted dry-run metadata**, not an independently hashed archive or installed package. Future actual pack must record its SHA-256 and SHA-512/SRI and compare payload hashes/file list before installation. If any prediction differs, stop for content/toolchain review before using the archive. The existing validator itself does not enforce this full hash inventory; these checks supplement, not replace, native admission.

## Recommended procedure — proposed only, not executed

1. Obtain separate approval covering the **shared Builder** package replacement and dependency record. Recheck source commit/file hashes, closure versions, current native link target and policy revision 9. Preserve the existing two root package manifests/lockfiles, hidden node_modules/.package-lock.json, installed UI link metadata, affected closure hashes, Demo/fixture/pilot inventories and audit/registration digests. Preserve a known-good rollback record without copying security stores or credentials.
2. Stop only documented owned Demo processes under the separately approved maintenance action. Identify other consumers of the shared root; do not terminate unrelated processes. No validation against stale API module/Vite caches is acceptable. Source directories and persistent Demo/fixture content stay unchanged.
3. Prepare a new retained archive location, refusing to overwrite an existing archive with different bytes. Use the following ordinary package-manager commands **only after that approval**:

```powershell
Set-Location C:\Projects\Modular\ui-platform
New-Item -ItemType Directory -Force vendor\native | Out-Null
npm pack C:/Projects/Modular/ui-base/packages/ui-base-ui --pack-destination ./vendor/native --ignore-scripts --json
```

Expected archive: C:\Projects\Modular\ui-platform\vendor\native\ui-base-ui-0.5.1.tgz. Verify actual archive/file hashes, no redirected archive path, exactly the trusted payload and admitted native manifest identities. Do not run prepack/build hooks or mutate trusted source.

4. Prepare a lock/manifest change before reifying node_modules, with networking and lifecycle scripts disabled:

```powershell
npm install ./vendor/native/ui-base-ui-0.5.1.tgz --package-lock-only --save-exact --ignore-scripts --offline --no-audit --no-fund --install-links=false
```

Review the diff: root @ui-base/ui dependency becomes the retained file:vendor/native/... archive; its lock entry becomes physical version 0.5.1 with archive resolution/integrity and no link:true. Lock metadata may retain or remove a now-unreferenced old source record. No unrelated version, registry resolution, workspace dependency or permission change is approved by this plan. If offline resolution needs an unreviewed artifact or produces broader re-resolution, stop rather than fetch/update/audit-fix or broaden the install.

5. Only after a bounded lock diff is verified, reify through npm (no manual node_modules edits):

```powershell
npm install --ignore-scripts --offline --no-audit --no-fund --install-links=false
```

This instructs npm to replace the linked UI entry with its recorded tarball package. Re-inventory the whole impacted tree; npm can hoist/dedupe despite a single requested package. If anything beyond the reviewed UI package/required lock metadata changes, stop and use the bounded rollback plan. Do not run npm ci against the active shared tree: it removes/recreates the entire installed tree. A later isolated reproduction using the retained archive, identical lock/toolchain and known relative source layout is the appropriate reproducibility check; it has not been performed in this assessment.

6. Validate before restarting: physical root and every admitted input/ancestor, exact native identities/module paths, all 54 expected payload hashes, unchanged trusted source, compatible closure versions, no unexpected nested/registry packages, and existing nativeUiBaseEntry/assertNativeUiBaseModule behavior. The existing physical/link regression tests must still pass without weakening any check. Run the focused workspace/native/identity regressions and server typecheck. If trust or required contract differs, stop before browser use. A successful npm exit is not qualification.
7. Restart only the normal authoring Demo under separate authorization. Let its existing module/Vite dependency state refresh through the documented launcher; no blanket cache deletion/global npm settings changes. Have the operator establish Application Admin normally and verify the canonical principal and revision. Recheck the exact pilot Overview → Pages list → existing eligible Page/editor and Presentation/Shell/Menu/asset views. Check shared Demo/fixture discovery read-only without editing them. Specifically look for changed module identities/custom-element duplication due to cyclic linked dependencies. Do not Publish or start preview/reader hosts. Saved Design Preview and one disposable Save/Reload demonstration require remaining current authoring authorization to be confirmed when installation is approved; no broad site construction is implicit.

## Expected change inventory and rollback/refusal

Minimum future changes: retained shared archive; ui-platform/package.json; ui-platform/package-lock.json; ui-platform/node_modules/@ui-base/ui link replaced with the 54-file physical npm payload; node_modules/.package-lock.json and ordinary npm cache/log metadata. Any necessary closure-tree change must first be exposed by the lock diff and reviewed, not assumed authorized. No pilot package.json/lock, persistent Demo/fixture content, app.manifest.json, native validator, package trust, I-AM definitions/assignments, registrations or security audit change belongs to this minimum plan. Shared native resolution and Vite/API module caches are operationally affected, even though Application content is untouched.

Rollback means stop the owned Demo and restore the exact previously recorded root dependency records and installation state through an approved bounded procedure, verifying the captured hashes/link target. Do not restore older authority databases, erase accepted revision 9, remove unrelated packages or roll back source/Application content. Returning to the recorded link restores the known blocker; it must not be described as successful native qualification. If npm cannot confine reification or rollback, stop for review rather than manual node_modules repair.

## Assessment preservation and stop

Read-only assessment actions: source/manifest/lock inspection; selected non-secret npm config/version reads; source package git inspection; guarded local metadata/hash inventory; npm pack **dry-run** with ignore-scripts; no archive created. No dependency install/copy/replacement, build, native validation/trust change, I-AM change, Application recreation/provisioning, edit, Publish, export, host/process start/stop, OS/security action, commit or push occurred. npm may append its ordinary cache/debug metadata during command use; no project dependency record is intentionally changed.

Evidence: evidence/v1-native-physical-assessment-20261102/{pack-dry-run.json, inspect.mjs, installation-inventory.json, preservation.json, files.json}. Source and owner dependency-record hashes are in installation-inventory.json; preservation.json retains the current 1707 Application-file inventory, registered identities and policy-table digests matching the prior Chrome continuation, including revision 9 security-state digest. Exact assessment artifact/report hashes are in files.json. No remediation or successful authoring is claimed.

**Stop: V1 Local Audience Pilot — Native Physical Installation Remediation Review Gate.** Await separate approval for the specifically shared, single-package physical-install procedure and required requalification.
