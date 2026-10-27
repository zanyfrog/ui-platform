# Recovery-free reads closure and normal development smoke test

Date: 2026-10-26.

## Closure

**ACCEPT AND CLOSE V1 Recovery-Free Workspace Reads within its verified scope**, per the user's acceptance. The prior report, nine workspace tests, sixteen D6-R1 tests, inventories and failed attempts are retained unchanged. HTML-first remains closed. Normal-browser verification, restricted production Preview, D6 and WP5-F remain open.

## Identified disposable environment

Root: `C:\Projects\Modular\v1-normal-smoke-20261026-01`.

| Purpose | Exact path / configuration |
| --- | --- |
| Normal backend/UI source | `ui-platform` beneath the disposable root; byte-verified ordinary source copy |
| Applications | `apps` beneath that root; `UI_APPS_DIR` |
| Runtime/identity | `runtime`; `UI_RUNTIME_DIR`; `UI_PLATFORM_V1_POLICY_STORE=runtime/iam-v1-development.sqlite` |
| Templates | `templates`; `UI_TEMPLATES_DIR` |
| Platform Components/catalog | Copied project's `components` and `data/package-catalog.manifest.json` |
| Vite cache | `runtime/vite-cache` |
| Normal development identity | Existing `V1DevelopmentIdentity`, built-in `v1-identity-fixture` Application, owner `dev-v1-identity-fixture` |
| Intended user | Existing seed `admin@example.local`, Application Admin |
| Intended UI/API | `http://localhost:5374/` / `http://localhost:4390/`; loopback development mode |

No existing operational `.ui`, `apps`, platform Components, catalog, identity or registry state was copied or acquired. Static ordinary application source and existing installed dependencies were copied; `.git`, `.uib` and protected configuration directories were excluded. Initial junction preparation was denied by the execution environment, so dependencies were physically copied without changing Windows settings. There were no package installs or activations. Missing nested/transitive dependencies in the first copy were corrected by copying the already installed dependencies, not changing product code.

The normal built-in disposable development Application is used intentionally; it is supported by the existing identity service and is not a substitute fixture callback. `UI_PLATFORM_BUILDER_WP0` is disabled; no additional application registry was needed or initialized. There is no custom server, authentication mechanism or renderer.

## Preflight and actual results

Before backend startup, nonmutating inspection found no pending journals, foreign locks or recovery guards in the disposable copy. Runtime and Application roots were initially empty. The existing development initializer created the dedicated fixture Application, and the real `V1DevelopmentIdentity`/I-AM initializer seeded a new policy SQLite file. The existing host-only `authorizeEditor` returned true for view/edit/admin of Pages for the intended user and Application. The permanent owner matched the existing fixture contract. This host-side permission result is **not a normal browser-session authorization result**.

`evidence/environment-admission.json` records roots, expected coordination, build/cache, policy, manifest/catalog and Page-save write footprints. Original runtime/database records were never replaced. Before the second startup, disposable roots were inspected again for lock/journal conditions; none were found.

| Step | Actual outcome |
| --- | --- |
| Ordinary source copy | 385 baseline source/build entries match the originals; still match after attempted startup |
| Normal predev build | Passed after the copy's existing nested TypeScript dependency was restored |
| Existing authority preflight | Passed through actual I-AM host-side authorization; no callback substitute |
| Normal `npm run dev` | Attempted twice, with raw logs retained |
| API startup | Second attempt logged `UI Platform API listening on http://localhost:4390` |
| UI startup | No `UI Platform: ...` ready message; launcher could not establish its required API connection |
| HTTP reachability | No successful HTTP result captured. Post-interruption checks of API health and UI both failed with socket access-permission errors |
| Normal browser session | Not established or verified |
| Open Builder / Add / Edit / Save / Reload | Not reached for Card or Panel |
| Saved HTML/hash and design Preview hash | Not produced by this normal run |
| Visible rendering | Not verified; no screenshot |

An already running Chrome browser is available. Only its inventory was inspected. Existing localhost tabs were not reused because their server roots and operational state were not admitted. No automated Edge launch was attempted and browser automation is not a prerequisite.

## Concrete blocker and stop

Normal startup's existing artifact watcher attempted `FileSystemArtifactService.refresh` → `immutableWrite` → filesystem `link`. That operation returned **EPERM** while publishing its immutable artifact bundle identity at:

`apps/v1-identity-fixture/.uib/bundles/52c59e0cfb76c8535593fbf2e66724c21b02af6b3a69e4b02ad908ec626adbf3.json`

The source temporary file and destination were both inside the admitted disposable Application. This is existing artifact identity publication during watcher initialization, not package publication or a new activation mechanism. It exposes an additional normal-startup write footprint beyond simple coordination locks. It is not a failed Card edit or evidence that HTML-first is defective.

The unchanged watcher repeated its initialization attempts on its normal interval before the run was interrupted; those errors are retained. No agent-issued recovery retry, stale-lock cleanup, journal replay, immutable-write bypass or security change was made. The execution session was interrupted with Ctrl+C and ended. Post-interruption socket checks were denied by the execution environment, so they do not prove host listener shutdown or a live server. CIM/process inspection was unavailable; no permission escalation or investigation followed.

The launcher's ordinary API readiness connection and subsequent explicit loopback probes also encounter socket access-permission restrictions. This environment therefore has not qualified either unchanged hard-link publication or normal loopback reachability. These are the precise blockers to completing this smoke test here. A normal development execution environment that supports both operations must be separately identified/admitted; do not weaken Foundation publication or change Windows security to force this run through. No product correction is justified by these environmental failures.

## Manual continuation, pending

Intended entry URL: **http://localhost:5374/**. It is **not verified live** and the UI was not reported ready. Do not treat this as an instruction to use an existing unrelated server at that URL.

After a qualified, separately admitted normal launch prints its actual UI URL, use that exact URL in the existing browser. Sign in using the normal development identity selector as `admin@example.local`; open `V1 Development Identity Fixture` and its Builder. Create/select an authorized Visual Page; add UI Base Card, edit heading/body/variant/density, Save, then Reload. Record node identity, saved HTML and save hash. Open design Preview and confirm its request hash equals the saved hash and the actual Card renders. With autosave disabled, make an unsaved draft change: the saved Preview must retain the saved content and dirty Preview initiation must be refused. Repeat Add/Edit/Save/Reload/Preview for Panel. Stop on foreign/busy/unknown locks, recovery-required state, owner/session/permission failures, invalid catalog or hash conflict.

All of these browser steps remain pending; no partial result is presented as a completed workflow. Restricted production Preview remains unavailable and unqualified.

## Evidence and preservation

All new runtime/build/preflight evidence is retained under the disposable root's `evidence` directory, including both startup logs, both build logs, the authority result, admission record, source hashes, post-interruption HTTP errors and preservation results. The initial `.ts` preflight failed before execution because its parent had no ESM package context; the preserved `.mts` copy executed successfully. Initial junction errors and that first transform error were displayed in the tool transcript; they are described in failure notes rather than misrepresented as raw log files.

Ordinary writes observed: copied build/dependency files; newly initialized development policy SQLite/WAL/SHM; the dedicated fixture Application's standard files; Application `.uib` coordination/bundle directories and attempted immutable identity writes. No catalog refresh, Page Save, saved Card/Panel or normal-session request was reached. Later inspection found no retained lock, recovery-guard or pending-journal files in the disposable operational roots. No such files were removed or repaired.

**This turn changes no original product source.** The four product modifications visible in the original checkout belong to the accepted prior increment. New files are this closure/smoke report, its exact inventory, and the disposable environment. `source-preservation.json` verifies 385 original baseline entries unchanged and no clone baseline differences. The full inventory enumerates copied files and evidence separately by path and hash. The original acceptance evidence and source remain intact; HEAD remains `87edf535cbe197c7defba822104bd853eec8c098`. No commits, pushes or GitHub synchronization occurred.

Stop: **V1 Normal Builder Smoke Test — Acceptance Review Gate** — blocked before normal browser workflow, not accepted as complete.
