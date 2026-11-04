# Dependency Alignment Review Gate

November 4, 2026. Ready for review; no commit/push or Stage 2 authorization is implied. Stage 1 acceptance and all historical qualifications remain intact.

## Change

The default UI Platform manifest now references `file:vendor/native/ui-base-ui-0.5.2.tgz`. The vendored payload is a byte-identical copy of the accepted Stage 1 archive. SHA-256: `7177d84c560f03e916067242556bea5a2a938e880c0fc1554d3169416d7ac3bf`. The default lockfile records UI 0.5.2 and matching SHA-512 integrity. Ordinary npm installation was executed in the actual UI Platform repository with offline mode and lifecycle scripts disabled; npm reported exactly one changed package. 54 installed package files match the extracted archive byte-for-byte ([file hashes](../../evidence/v1-default-ui-alignment-20261104/installed-package-files.json)). The installed UI package is a physical directory at the existing default path, not a workspace link. Hero 0.2.4's declared `^0.5.2` UI dependency is now satisfied. The retained 0.5.1 archive was not overwritten or removed.

No admission, physical-path, integrity, runtime publication or recovery implementation changed. The seven reviewed watcher/startup files remain byte-for-byte unchanged. The old compatibility test now extracts the retained 0.5.1 archive into a disposable fixture, rather than assuming the default install is permanently 0.5.1.

## Verification

| Check | Result |
| --- | --- |
| Actual default install | PASS: one package changed; manifest, lock, archive integrity and physical UI 0.5.2 installation agree. |
| Focused suites | PASS: 44 tests across default graph, legacy/native admission, activation, source, release integrity/pins and composition. |
| Build | PASS: a fresh disposable copy used the actual default installed dependency inputs; prerequisite workspace builds, Vite browser build and server TypeScript passed. No startup/recovery command was run. |
| Default-package browser | PASS: 19 checks in fresh Edge 156.0.4314.58, including all nine tags plus Hero rendering, Panel transitions/focus, Card selection, Select events, disabled action refusal and exactly one declared Hero action. Modules came from the actual default installed packages. |
| Existing published reader | PASS: original v11 output served read-only on loopback; one approved action, no fatal page errors. No Publish, historical build, source save or recovery was executed against that application. |
| Frozen input preservation | PASS: 1744 files across existing publication versions and the v11 reader match their pre-operation SHA-256 hashes. Package inventories for versions 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11 verified. Earlier intermediate versions are not newly reclassified as functionally accepted. |
| Legacy compatibility | PASS: physical 0.5.1 fixture retains Card/Panel admission. On new default 0.5.2, compatible `^0.5.1` declarations remain valid with stable identities and the admitted Action Button; an exact `0.5.1` request is incompatible rather than silently substituted. Wrong resolution/root module and existing Forms-junction refusals remain enforced. No stored application declaration or component instance was migrated. |

## Evidence and exact inventory

[Default install](../../evidence/v1-default-ui-alignment-20261104/default-install.txt), [focused tests](../../evidence/v1-default-ui-alignment-20261104/tests.txt), [build](../../evidence/v1-default-ui-alignment-20261104/build.txt), [default browser](../../evidence/v1-default-ui-alignment-20261104/browser-results.json), [default screenshot](../../evidence/v1-default-ui-alignment-20261104/browser.png), [frozen reader](../../evidence/v1-default-ui-alignment-20261104/frozen-reader-results.json), [preservation](../../evidence/v1-default-ui-alignment-20261104/preservation.json), [changed-file hashes](../../evidence/v1-default-ui-alignment-20261104/changed-files.json). Disposable source/dependency copies, caches and browser bundles are ignored; review logs and hashes remain separate.

## Qualifications and recommendation

Recommend accepting this UI dependency alignment. No new architecture or product decision was required. Default Forms remains an existing workspace junction and is still refused by explicit native Forms admission; this UI-only correction does not convert or certify default Forms physical admission. Direct browser registration of Forms does not waive that guard. Enabling that separate installation path would require its own bounded packaging authorization.

The original Windows junction-creation EPERM regression is not reclassified as passed. The preexisting Forms-junction refusal is separately exercised. Production identity, full default application provisioning, Stage 2 CRUD and historical startup/lock repairs remain outside this increment. No existing application stores or published bytes were rewritten. UI-Base and Data Services worktrees/HEADs are unchanged; UI Platform HEAD is unchanged and all changes remain uncommitted.
