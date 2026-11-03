# V1 Local Audience Pilot — Shared Native Installation Correction Acceptance Review Gate

2026-11-03. **Approved physical installation completed and verified. Normal-browser authoring requalification awaits operator Application Admin sign-in after maintenance restart. Submitted for review; not accepted or closed.**

## Mandatory preflight and controlled maintenance

Node v24.19.0/npm 11.17.0 match the assessment. All 54 reviewed trusted-source payload hashes, source version/name, known shared link target and all four shared/pilot package.json/package-lock.json hashes matched before any installation change. UI Base source commit remains 3cbe073c9192c4eba8086b88dd2978b179539b2f, with no package-source working-tree change observed. Baseline regular Application inventories, protected table digests, registrations, dependency tree and closure versions were recorded. Root dependency records and npm's installed lockfile were backed up; existing UI link target metadata retained. No identity database or policy was copied.

Current active UI Platform consumers were the documented Demo launcher/API descendant chain (launcher source PID 28844, dev front PID 32432, API PID 9936, with known npm/tsx ancestors including recorded root shell 19144). Other observed Node processes were tool/connector runtimes rather than separate project servers. No separate active disposable Builder project consumer was observed. Sanitized owned descendant IDs are in owned-demo-processes.json; no control token/session/cookie was captured in evidence. The documented Demo control stop shut down only that managed tree. No broad kill, port-based termination or unrelated process stop occurred.

The accepted pilot key/ID, administrator anchor and seven grants remained unchanged at policy revision 9 before modification. The separate disposable Builder deployment was not changed.

## Exact trusted archive and physical installation

Source: C:\Projects\Modular\ui-base\packages\ui-base-ui, @ui-base/ui **0.5.1**.

Retained archive: **C:\Projects\Modular\ui-platform\vendor\native\ui-base-ui-0.5.1.tgz**.

- Actual archive SHA-256: **046ed1ba1437aa6b64a51829e82f13bf8754b6e7910068db8ac98f5222d0dd27**.
- Actual SHA-512/SRI: **sha512-1+ZiiYZ4fEINYOUg6zxQG2Ruo82eMRDbYFGn6J0rY2XfFF7YZUvJzr3tBTXwANfB9fn7Ll+YifzEOiTqVCizmg==**.
- Actual archive SHA-1 matches reviewed dry-run 0307f71df81740cb7c87b65a4a62d78e5a5688ec.
- Exactly **54** regular payload files, no archive links; every extracted-in-memory payload size/hash matches the reviewed assessment. No filesystem extraction/copy into node_modules was performed. Trusted source rehashed unchanged.

Standard npm pack ran for only the known source with --ignore-scripts and an explicit retained destination. The ten-package wrapper was not invoked. A Python verification attempt could not run because the Windows app-alias executable was unavailable; the failure was preserved, and a Node/zlib archive verifier performed the complete actual-payload verification instead. This was a tooling fallback, not a package qualification bypass.

Lock preparation used the approved --package-lock-only --save-exact --ignore-scripts --offline --no-audit --no-fund --install-links=false procedure. Review confirmed only:

1. Root package.json @ui-base/ui changed from file:../ui-base/packages/ui-base-ui to **file:vendor/native/ui-base-ui-0.5.1.tgz**.
2. Lock root dependency changed to the same retained archive.
3. Lock node_modules/@ui-base/ui changed from link:true/source resolution to physical version 0.5.1/archive resolution/exact SRI, retaining the same four dependency ranges.
4. The old now-unreferenced ../ui-base/packages/ui-base-ui lock source record was removed.

All other package records and root dependency definitions are unchanged. No unrelated upgrades, closure additions, registry resolutions or lifecycle execution were admitted. Only after this diff passed, npm install --ignore-scripts --offline --no-audit --no-fund --install-links=false reified the lock. npm reported **changed 1 package**. No npm ci, manual node_modules replacement, global configuration change, audit fix or package-manager upgrade was used.

## Actual installed tree and native checks

Immediate before/after physical-tree inventory: entries 2959 → 3028, regular files 2643 → 2697, links 17 → 16. Exactly **71 changed inventory entries** are confined to @ui-base/ui (one link replaced by its physical directory tree: 54 files and 16 directories including root) and npm's node_modules/.package-lock.json. No unrelated installed package path changed. No unexpected nested UI node_modules or new registry package exists. Tree inventories deliberately do not follow arbitrary links.

All 54 installed payload hashes match the admitted archive and reviewed source. Every payload path and its ancestors through the shared root satisfy the unchanged realpath/non-symbolic contract. The native entry function admits enabled version 0.5.1 with platform-only resolution without changing any Application declaration. Card/Panel identities/modules pass existing admission, including Card cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1 at ./src/layout/uib-card.js and Panel @ui-base/ui:uib-panel at ./src/layout/uib-panel.js. Full hashes and the returned native projection are in archive-verification.json/installed-verification.json.

The existing logical closure is unchanged: ui 0.5.1, core 0.1.0, icons 0.1.0, hero 0.2.3, assets 0.1.17, tour-ui 0.1.1. Other UI Base packages remain their original known-source links. No cyclic dependency resolver rewrite or new framework was introduced. The pilot's own dependency records/links were not altered. Possible browser module-identity/custom-element effects of the physical UI plus linked cyclic closure still need normal authoring/runtime observation; installation success is not claimed as that qualification.

Focused regressions: **27 tests passed, five files**, covering native physical/link admission/refusal, workspace routing/session/owner boundaries, client workspace requests and existing identity/status behavior. Server typecheck passed; git diff --check passed. No production build, website build/export or Publish was run. Tests only modified the usual .vite/vitest/.../results.json cache after immediate tree verification; post-verification inventory records that separately. Existing unrelated client diagnostics were not expanded into this dependency-maintenance task.

## Demo restart and browser qualification boundary

After native/tests/typecheck passed, normal authoring-only npm run demo restarted the existing ready deployment with no setup/login/provision/preview/reference flags. New owned startup shell PID **31632**, execution session **64250**. API 5280/UI 5274 are healthy; Application preview has not been started. Existing predev package compilation occurred through the documented launcher; no production website release was built. The managed Demo remains running for operator checks; documented demo-control stop remains its cleanup operation.

The existing connected Chrome Demo tab 1964522886 at localhost:5274 was reloaded. The normal Development identity, Verify, Applications and other Builder chrome render with the physical package; it is signed out after API restart. No principal was selected automatically. The existing unauthenticated Platform settings notice appeared; it was not interpreted as an installation/authoring verdict. The operator was asked to establish Application Admin normally and click Verify. No readiness response arrived during this work.

Therefore **Pages/artifact discovery, eligible Page editing, Presentation/Shell/Menu/assets, disposable Save/Reload/Saved Design Preview and shared Demo/fixture read-only discovery checks are pending**, not passing. No browser custom-element duplication failure was observed in the signed-out chrome, but this does not qualify the requested authoring flow. Once the operator is ready, verify canonical usr_f01e0c1c58424bed9ac4e8601ff9890a, builder-demo/ui-platform-development and current revision 9, then perform only the authorized bounded browser checks. Stop on a new distinct problem; do not broaden this repair. No reader/preview host launch is authorized.

## Preservation and exact inventory

All seven policy-table digests/counts and registered identities are unchanged; security_state digest retains revision 9, documents 104, administration audit 8, policy audit 9, candidates 10, delegation audit 0. Existing anchor and seven functional grants are unchanged. Baseline Application inventory covers 1707 files: **1704 unchanged; three operation logs appended with original prefixes preserved** (pilot +201, Demo +171, fixture +750 at snapshot). No Demo/fixture/pilot source/settings/manifest changed. Pilot package.json/lock hashes still match the reviewed baseline.

Intentional project dependency changes: **package.json**, **package-lock.json**, **vendor/native/ui-base-ui-0.5.1.tgz**. npm-managed changes are the physical installed UI tree and installed lock metadata described above; archive acquisition/cache/debug metadata and normal test cache may also be maintained by npm/tools. No native validator, package trust, source package, permission, identity or product implementation was changed in this increment.

New documentation: this report. New evidence directory evidence/v1-shared-native-installation-20261103/ includes exact root-record/installed-lock backups, preflight/owned-process/archive/lock/tree verification, application/security snapshots and comparison, focused tests/typecheck/startup logs, recorded failed verification helper and final read-only verifiers. files.json gives exact evidence/report hashes; dependency-files.json hashes the changed root records/archive; dependency.patch records the bounded diff. Prior evidence is preserved. The full immediate installed-path delta is in installed-verification.json, and only later normal test cache differences are in preservation-comparison.json.

Rollback was not needed or attempted: package payload and tree remained within scope. Backups/link metadata are retained for a separately verified bounded restoration if a later runtime issue requires review. Accepted policy revision 9 must never be rolled back as dependency restoration. No commits or pushes.

**Stop: V1 Local Audience Pilot — Shared Native Installation Correction Acceptance Review Gate.** Physical installation/native checks passed; normal-browser authoring requalification is pending operator interaction. No acceptance/closure or successful authoring is declared.
