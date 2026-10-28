# V1 Page Builder — Multi-Page Website Authoring Acceptance Review Gate

2026-10-28. **Implementation and bounded normal-Chrome verification submitted for review. Not accepted or closed.** This final submission supersedes the pending status in the preserved working report `v1-multi-page-website-authoring-20261028.md`; that report retains the failed attempts and diagnostic corrections.

## Result

An ordinary author can create Home, About and Contact, select saved Page destinations beside the existing href control, Save/Reload and follow Home → About → Contact → Home in the admitted pathname website host and saved Design Preview. HTML remains authoritative. Artifact and managed-node identities survive persistence; plain Pages retain the existing creation contract without inventing route IDs. No persistent navigation registry, dependency graph, new router, lock or Preview service was introduced.

The disposable application remains `dev-v1-identity-fixture`, in `v1-normal-smoke-20261026-01/apps/v1-identity-fixture`. Builder/API remain `http://localhost:5374/` and `http://localhost:4390/`. Verification uses the existing Application Admin development identity through the ordinary selector. The admitted website remains `http://127.0.0.1:5188/`, with explicit Page imports, empty Component input and empty package-manifest input. Existing ownership, dependency, source admission and recovery-refusal checks are retained.

## Changes and contracts

| Area | Bounded change |
|---|---|
| Shared Page-link helpers | Read local literal hrefs from candidate HTML. New or changed local destinations require one valid saved plain Page at a canonical root-relative slug path. Reject missing, ambiguous, relative/query and cross-Page-fragment destinations. Preserve external URL policy and unchanged legacy HTML. |
| Ordinary authoring | Saved-Page selector derives choices from the authorized workspace listing and writes literal href. Managed identity and HTML structure remain authoritative. |
| Plain Page Create/Save/Delete | Enforce canonical route uniqueness for plain Pages under the existing application mutation boundary. Normal Save revalidates changed links and protects incoming references during route changes, including surviving self-links. Delete reports incoming references before removal. Authors explicitly repair links; no cascade rewriting occurs. Accepted composed-Page route checks remain unchanged. |
| Shared runtime and host | Explicit admitted Page paths enable eligible unmodified root-relative link activation through the existing navigate adapter. Resolve before adding history. Retain external, modifier, target/download and accepted same-Page fragment behavior. Host explicitly registers the three Pages alongside the accepted anchor Page, restores history without pushing on popstate, and focuses the heading at the top for fresh navigation. |
| Saved Design Preview | Existing authorized saved listing and exact-hash Preview read resolve destinations. Iframe query parameters encode app, locator, revision, kind, design and logical Page route; fragments keep their accepted meaning. URL initialization supports reload. Page history is iframe-owned; previous mounts are disposed. Failed revision reads preserve the prior Page and URL. Parent URL is never written. |

Create, normal Save and Delete already run inside `withApplicationMutation`, which delegates to the existing Foundation graph lock. Candidate graph capture precedes target-role acquisition, complete candidate validation runs inside role-bundle Save, and existing dependency rechecks remain at admission. Focused tests exercise the actual graph and role service. These checks serialize participating Builder operations; they are not a multi-artifact commit or protection from unrelated filesystem writers. Recovery-enabled authoring semantics were not reclassified as website reads, and qualified recovery-read source modules were not changed.

## Normal Chrome evidence

Home, About and Contact were created through ordinary controls. Their headings and links were authored through ordinary keyboard input and the destination selector; source textareas were read, never edited. Save/Reload and later normal authorized saved GETs preserve all five roles and managed identities. A tall Home heading wrapper was authored through the existing layout control for a meaningful scroll-restoration check.

| Page | Route | Artifact identity | Final saved and authorized Preview hash |
|---|---|---|---|
| Home | /home | art_47c10a1f-248d-4404-ac39-ee46a7db6c48 | 48b2e2d7a5b73ef6cd13d4e9524eae05a5890b0a7416e75db3adee898f61a68b |
| About | /about | art_831b8cb4-a60f-4264-97ed-99d33205857a | e108a661ce886f9543fe7af5e5d5cf5a5c8894735d7d1a137db2a780d9e80c79 |
| Contact | /contact | art_380e4d4e-6289-413a-99b3-c7d345030806 | fe9176fa530046d221d976d8d4fb3e9a3b326952d26d969b8c9d1dcf520348ae |

- Website mouse and Enter navigation complete the loop. Fresh navigation focuses the heading at scroll position 0. Direct Contact loading, Reload and Back/Forward pass. A final tall-Home check returns to a nonzero Home position after navigating to About at 0.
- Saved Design Preview completes the same loop by mouse/Enter. Back/Forward traverse the iframe Pages while the Builder URL remains `http://localhost:5374/`. Home scrolled to approximately 756px, About opened at 0 with heading focus, and Back restored the same approximately 756px position.
- The operator performed Chrome **Reload frame** inside the actual saved Design Preview. Subsequent automated inspection confirms Home's final saved hash in the iframe URL, its same heading node `node_bf16aa38-6a34-405b-916f-cf70da779808`, ready status and unchanged parent URL. This is operator-assisted Reload evidence, not an automated native-menu action or measured mount-count claim.
- Missing destination editing refuses without changing HTML. Duplicate `/about` and invalid `/about?invalid` creation refuse and leave no probe directories. Normal Save refuses changing Home's referenced route and names Contact's managed link.
- The operator clicked **Delete artifact** and completed its confirmation. Subsequent automated inspection records the actual refusal: `Page /home is referenced by: contact/page.visual.json (node_7e8be7a6-0f08-4aca-9462-7d19de402a53). Repair these links first.` Home remains present; all final saved role bytes are unchanged after the refusal. This is operator-assisted confirmation evidence.
- The accepted website `#features` deep link still focuses the same managed section and scrolls it into view. The shared-runtime fixture separately checks accepted anchor lifecycle behavior. Final normal Builder console error capture is empty.

Evidence is under `evidence/v1-multi-page-20261028/`: `normal-authorized-revisions-final.json`, `normal-preview-navigation-final.json`, `normal-preview-scroll.json`, `normal-website-navigation.json`, `normal-website-scroll.json`, the normal refusal captures, `normal-operator-final-checks.json`, `normal-final-refusal-preview.png`, `final-saved-preservation.json`, and `final-copy-comparison.json`.

## Focused verification and preservation

`node scripts/verify-multi-page.mjs` passed in `run-1793211871047`: **16 tests**, actual shared-runtime isolated-DOM navigation/anchor checks, actual Preview-client lifecycle checks with fake saved transport, and **zero scoped strict typecheck diagnostics**. Tests include canonical/duplicate route admission, missing/ambiguous/unsupported destinations, legacy/external preservation, incoming/self references, actual Foundation graph serialization of competing checks/creates and unchanged actual role-bundle hash after refused Save. Isolated transport is not presented as production authority evidence.

The full server typecheck, Visual Artifacts package build and final disposable reference-host build pass. The broader client typecheck has existing unrelated native fixture declaration errors and `src/client/main.ts:588`; the changed client inputs pass scoped checking. The retained isolated native fixture emits its known IIFE import.meta warning. No unrelated native authoring campaign was repeated.

Final preservation passes: **61 accepted Page files** (55 earlier files plus six accepted anchor files), **3 qualified recovery-read source modules**, **16 original reference-host files**, **175 historical host evidence entries**, and the byte-identical editor refresh-scheduling suffix. **19 disposable source/build copies** match the primary outputs. Historical reports, inventories, failed attempts, old caches and existing source differences are preserved. No lock/journal inventory or cleanup occurred.

The installed disposable package copy and Builder prebundle initially contained old code. Narrow generated copies were synchronized and the operator used a fresh Vite cache, preserving the old cache. A later development HTML build reload left the Builder proxy stalled while direct API reads remained healthy; a clean restart restored it. Shell connection refusal was initially misdiagnosed as an API exit; normal Chrome health reads corrected that diagnosis. These attempts and corrections remain in the working report. No permissions or security settings were changed to resolve them.

Automatic review initially rejected the automated deletion confirmation. Source inspection established the guard ordering and the existing recoverable Windows Recycle Bin action; a retry was permitted but native automation timed out. The explicitly requested operator action and observed refusal supply the final evidence. No indirect deletion workaround was used.

## Scope and stop

Plain saved Pages and the explicitly admitted pathname host only. No cross-Page fragments, Shell/Region navigation, arbitrary routers or Page discovery, automatic link rewriting, anchored duplication expansion, restricted Saved Preview, comprehensive security qualification or production deployment. Normal-browser unsaved-draft Preview protection remains deferred and unaccepted. No I-AM, permission, application settings, autosave, recovery, Windows token/VM/WinPE or protected Component changes. No commits or pushes.

Exact inventory: `v1-multi-page-website-authoring-files-20261028.json`, including generated/copy outputs and separate cache/build inventories. The preserved working report provides the longer attempt history.

Stop: **V1 Page Builder — Multi-Page Website Authoring Acceptance Review Gate**. Separate approval is required for acceptance or closure.
