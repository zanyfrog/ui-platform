# V1 Local Audience Pilot — Workspace Discovery Correction Acceptance Review Gate

2026-11-02. **Direct native-discovery failure reproduced; narrow error-classification defect corrected and regression-tested. Installed-path admission remains blocked. Normal-browser corrected-path confirmation awaits operator sign-in after API restart. Submitted for review, not accepted or closed.**

## Diagnosis and supporting evidence

The accepted pilot identity, grants and revision 9 remain unchanged. Target: builder-demo, codex-test-v1-local-pilot-20261102, permanent ID de8d1851-3e36-435f-b093-95ce94d940e7. No recreation, provisioning or permission changes occurred.

The failing Pages discovery path is shell.ts discover() → requests.ts workspaceRequest() → GET /api/apps/<key>/builder-workspace. The server validates the subordinate editor principal and registered owner, evaluates existing Page/Presentation/Application capabilities, then calls discoverComponents(key). That calls getActiveAppPackages → getAppPackageCatalog → nativeUiBaseEntry. A focused read-only invocation of discoverComponents for this pilot reproduced **Native UI Base inputs must use physical installed paths**, with that exact stack. Filesystem observation established:

- Expected installed root: C:\Projects\Modular\ui-platform\node_modules\@ui-base\ui.
- lstat.isSymbolicLink(): **true**.
- Physical target: C:\Projects\Modular\ui-base\packages\ui-base-ui.

The existing validator intentionally rejects a linked native input before manifest/module admission. Its physical-path check is functioning as written. The concrete localized implementation defect is that the workspace catch mislabeled this installation failure as WORKSPACE_TARGET_DENIED/403. This directly reproduces the earlier Presentation installed-path error at the shared native package boundary; Presentation was not separately re-opened in this increment.

The direct discovery invocation is an internal read-only reproduction, not an authenticated API request or invented evaluator context. It identifies the deterministic native failure on that dependency path; the precise live request's newly classified result must still be observed after the required operator sign-in. Existing Page/Presentation grants are not inferred missing from the generic denial. No private session, cookie, CSRF, protected policy payload or raw request headers were captured.

## Exact correction and scope limit

src/server/native-ui-base.ts now throws a dedicated NativeUiBasePathError at the existing physical-path rejection, retaining the same predicate and message. src/server/builder-workspace.ts catches only that typed error and returns HTTP **503**, code **WORKSPACE_NATIVE_INSTALLATION_INVALID**, with an actionable sanitized installation-review message. No filesystem path, source data, native manifest or grant record is included in the client response. All other existing authorization/session/owner refusal logic remains unchanged; this is not a general diagnostics framework or catch rewrite.

No native path is canonicalized to bypass the check. No symlink, installed package, dependency, trust rule, grant or resolver policy was changed. The installed symlink therefore remains rejected. Fixing the environment's native installation is a distinct trust-sensitive installation change, not an implementation fix to authorization. No such repair was silently applied. A separately reviewed plan would need to establish the supported physical-install procedure and requalify native contracts before changing that package; no copy, reinstall or broad dependency repair is attempted here.

## Focused verification

**27 tests passed across five files:** workspace-native-discovery, builder-workspace, builder-workspace-requests, v1-development-status and v1-development-identity. New regression coverage checks the demonstrated typed native failure's 503 response without source/path disclosure, genuine principal and cross-Application owner refusal before discovery, successful registered owner-qualified discovery with admitted source-service test doubles, stale subordinate-session refusal before source return, and the actual native validator accepting an isolated physical Card/Panel fixture while rejecting a linked fixture. Existing real identity/evaluator/status and client workspace regressions pass.

The new server routing tests use explicit source/security-service doubles to isolate classification and boundary order; they do not establish that the installed Demo native package is admissible or that live pilot discovery succeeds. Real native-path guard tests exercise temporary files/junctions, not workspace dependencies. No security-policy or native validation rule was weakened to make tests pass.

Server typecheck passes; git diff --check passes. No production/website build ran. The existing client was not changed; the seven previously recorded unrelated client diagnostics are retained without broadening this investigation. No successful fresh-pilot live discovery, Page editing or Save/Reload/Preview evidence is claimed.

## Runtime/browser verification boundary

The managed existing authoring Demo was healthy, stopped through documented demo-control stop, and restarted authoring-only with npm run demo to load the server classification. No setup/reset/provisioning/login/preview/reference flags were used. Existing ready state was retained. New owned startup shell PID **19144**, execution session **77684**. API 5280 and UI 5274 are healthy; Application preview was not started. The existing predev package compilation contract ran, not a production/website build. Demo stays running for the operator check; documented demo-control stop is the cleanup operation.

The existing Chrome tab 1964522886 at localhost:5274 was reloaded. It showed signed out after API restart; no identity was selected automatically. The operator was asked to establish Application Admin normally and click Verify. No readiness response arrived during this work. Therefore normal-browser Overview → Pages recheck, and confirmation that the live request reaches the newly typed native failure rather than an earlier session check, remain **pending**. No Page, Presentation, Shell, Menu, asset or Preview action was attempted while unauthenticated. No successful authoring is inferred from test doubles or stored grants.

Exact next manual step: operator signs in as Application Admin through the normal control and indicates readiness; the agent refreshes non-initializing Verify, confirms canonical User/deployment, then opens only the existing pilot Overview and Pages. If the classified physical-install failure appears, stop for installation review. Do not change native dependencies or repeat provisioning. If another boundary fails first, record it before any further correction.

## Preservation and exact inventory

Before/after snapshots cover 1707 existing regular Application files: **1704 unchanged; three operation logs appended**, preserving original byte prefixes (pilot +201, Demo +171, fixture +750 at snapshot). Registered identities and all seven security-table digests/counts are unchanged; revision remains 9; policy/administration audits remain 9/8, delegation audit 0. Existing Demo/fixture/pilot source/settings/manifests and prior protected history are preserved. Runtime caches/control metadata, native binaries and directory-junction targets are not comprehensively rehashed or requalified. Earlier evidence contents remain unchanged.

Changed source/test files only:

- src/server/native-ui-base.ts — typed physical-path refusal, same validation.
- src/server/builder-workspace.ts — narrow sanitized 503 classification.
- tests/workspace-native-discovery.test.ts — focused regression coverage (new).

Documentation: this new gate report. Evidence directory evidence/v1-workspace-discovery-correction-20261102/ contains before/after inventories, focused-test/server-typecheck/startup logs, diagnose.mjs/native-diagnosis.json, compare.mjs/comparison.json, source.patch, source-files.json and files.json. Exact file hashes and inventories are recorded there; no product client, package installation or Application source edits occurred. No commits or pushes.

**Stop: V1 Local Audience Pilot — Workspace Discovery Correction Acceptance Review Gate.** Classification correction is tested; browser confirmation and any physical native-install remediation remain outstanding. No acceptance/closure, permission expansion, Publish, export, website build, reader host, Windows/security/recovery investigation or broad redesign occurred.
