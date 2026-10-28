# V1 Page Builder — Practical Website Authoring Acceptance Review Gate

Date: 2026-10-28. **Observed normal-browser functional workflow passed. Submitted for review; no acceptance or closure declared. Screenshot evidence remains limited as detailed below.**

## Normal environment and outcome

The operator's terminal confirmed UI http://localhost:5374/ and API http://localhost:4390/. Used the admitted disposable environment `C:\Projects\Modular\v1-normal-smoke-20261026-01`, existing development identity selector, Application Admin (admin@example.local), Application `v1-identity-fixture`, permanent owner `dev-v1-identity-fixture`. No alternate authorization/session mechanism was used.

Continued the fresh Page created through ordinary controls in the retained 2026-10-27 attempt, rather than editing an accepted Page or creating another copy:

- Locator: `v1-practical-website-20261027/page.visual.json`.
- Route: `/v1-practical-website-20261027`.
- Artifact: `art_4fcfbaf1-ac40-449e-9f28-2b2174c97d7b`.

| Required behavior | Observed result |
|---|---|
| Create three sections and content through UI | Prior retained attempt created Introduction, Feature and Closing with HTML section/heading/paragraph/link/image controls and native Card. No HTML-source textarea edits. The same saved Page reopened normally today. |
| Hierarchical Structure selection | Each section selected by its readable `section — Introduction/Feature/Closing` label. Indentation reflects real containment, including existing automatic wrappers. Stable IDs remain option values/tooltips. |
| Ordinary link/image controls | Saved HTTPS and mailto destinations, image HTTPS src and literal alt persist. No upload/local image creation. |
| Updated URL policy in Chrome | javascript href and data image src each display the explicit unsupported/malformed URL error; authoritative HTML remains byte-identical after each refused edit. Selecting another node restores controls from unchanged source. These successful results supersede the earlier stale-module failed check without deleting that evidence. |
| Actual Save/Reload | Changed Closing paragraph through Text content to “Thank you for exploring. Contact us to plan your next visit.” Explicit Save completed; Reload reported Saved/baseline replaced. HTML before/after Reload is identical. |
| Responsive metadata | Section Base 24px/Mobile 12px padding and Card Base 480px/Mobile 100% width persist in the normal saved response, editor metadata and Preview revision. Existing controls were reselected after Reload. This does not extend prior responsive acceptance to all configurations. |
| Saved Design Preview | Ready status; Introduction, Feature, Closing headings in order; expected links/content/IDs; native UI Base Card has a real shadow root with saved heading/body. |
| Authorized external image | Exact Wikimedia HTTPS image fully loads with naturalWidth 10109 and expected alt. Current policies permit it; no network/CSP/security setting changed. |
| Reproduced image-overflow correction | Image now measures 720.769px inside its 720.825px container, height 323.850px, computed max-width 100%. Previous evidence records 10108.987px overflow. The small existing-renderer default rule is demonstrably loaded. |
| Saved revision agreement | Normal saved response and expected-hash Preview response agree on complete bundle hash, HTML and metadata. Reloaded editor HTML matches the saved response. |

## Stable identities and saved revision

| Element | Stable identity |
|---|---|
| Introduction section | `node_67dba64a-9624-49bc-a05c-21e50a81e659` |
| Feature section | `node_2a45d433-4110-439c-b771-e375faa52fb1` |
| Closing section | `node_1bde28f5-5cf6-424e-ab8b-c2917e1f0001` |
| Image | `node_2d400743-4104-4527-b759-97c7443ce6f6` |
| Native Card | `node_35f22e20-2ee0-4825-be78-b785ccd195f0` |
| Card component reference | `cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1` |

Both saved and Preview bundle hashes:

`a7535d9946d9860f64381778acbc3222a164d61ed53bee094b991270cbb147fb`

Normal browser GETs used the existing `/api/apps/v1-identity-fixture/visual-pages` endpoint with `locator=v1-practical-website-20261027/page.visual.json`, then `preview=1` and that expected hash. No fixture authorization callbacks or network interception supplied this proof. Temporary read tab closed; Page editor left open. Actual DOM IDs/order and returned source corroborate membership. This is not a claim of intercepting every click request.

Image URL: `https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg`. Alt: “Mountain landscape overlooking a lake in Switzerland”. Card heading: “A moment in the mountains”; body: “Build your next quiet escape around a view worth remembering.” Link destinations: Commons photograph description and `mailto:hello@example.com`.

## Corrections, tests and preserved differences

Four logical product source changes across the whole increment: shared URL policy in source.ts; shared managed-attribute validation in validation.ts; derived Structure labels/generic inspector controls in editor.ts; default responsive image sizing in existing runtime.ts. Their documented disposable/generated copies are synchronized. No new renderer, metadata authority, instance store or framework. Existing HTML and `.visual.json.layout` responsibilities remain.

Final scoped run remains `evidence/v1-practical-authoring-20261027/resumed/run-1793128703751`: eight source tests; two actual-editor workflows including URL/Structure and existing Card/Panel lifecycle/Preview regressions; zero scoped typecheck diagnostics; exact runtime image-rule assertion. Shared package build and diff whitespace check passed. All 72 recorded regression inputs still match, so no redundant rerun was needed today. Fixtures verify normal service candidate refusal and unchanged saved hash; normal Chrome verifies inspector refusal and authorized valid Save. No malicious raw browser Save request was manufactured.

All 33 current baseline entries remain unchanged today, including 25 pre-existing Page files. Only this increment's fresh Page received the deliberate Closing paragraph edit. Prior source differences and polling/focus-refresh changes remain preserved. The separately authorized application-header changes in main.ts/styles.css are present and remain outside practical-authoring acceptance scope. Historical reports, failures, snapshots and inventories were not rewritten. No permission/settings/autosave, recovery, protected operational-root, Windows-security, restricted Saved Preview, production activation, commit or push work occurred.

## Evidence and capture limitation

Evidence directory: `evidence/v1-practical-authoring-20261028`. It contains normal saved/Preview bundles; exact hash comparison; saved/reloaded HTML; UI refusal/selection/metadata proof; DOM-visible native Card, links, image and heading/order/identity/layout proof; before/after preservation; regression input comparison; final Page snapshot.

Screenshot capture did not produce an adequate final Page image. Full and correctly bounded CDP captures timed out; two returned crops showed navigation/background rather than the intended Preview and are explicitly retained as `failed-crop-navigation.png` and `failed-crop-blank.png`, **not successful screenshots**. A native Chrome capture attempt timed out awaiting tool approval; no approval/security change was made. One initial DOM proof expression referenced constructor.name, which the scoped DOM surface did not expose; the corrected proof uses DOM-visible attributes/text/shadow-root presence. Browser viewport override was reset. Raw geometry and native DOM proof are the rendered evidence submitted here; screenshots remain an unfulfilled evidence item, not a claim that the normal workflow failed.

Exact current file inventory: `v1-practical-authoring-final-files-20261028.json`, retaining previous inventory references and current hashes rather than altering historical ones. Inventory self-hash omitted.

## Remaining limits and recommendation

Normal-browser unsaved-draft protection remains deferred and unaccepted; no autosave setting or authority was changed. URL checks are not complete HTML sanitization or production qualification. No broader nesting/components, application runtime Preview, restricted Saved Preview or production activation is qualified. External image availability remains dependent on the remote host.

Review the functional and geometry evidence at **V1 Page Builder — Practical Website Authoring Acceptance Review Gate**. Decide whether to accept that bounded evidence or require an operator screenshot of the already-open Page before acceptance. No additional implementation or architecture is indicated by these results.
