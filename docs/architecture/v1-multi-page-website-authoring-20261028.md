# V1 Multi-Page Website Authoring — Implementation and Verification Status

2026-10-28. **Implementation present; normal-browser qualification incomplete. Not submitted as accepted or closed.** The Multi-Page Website Authoring Acceptance Review Gate has not been reached.

## Implemented scope

- New pure Page-link helpers derive local literal references from HTML. Canonical plain Page paths are `/` or lowercase slug segments. New or changed local links must resolve exactly one valid saved plain Page; relative paths, query routes and cross-Page fragments refuse. Existing external URL policy and unchanged legacy HTML remain in place.
- Existing ordinary Page controls now include a saved-Page destination selector beside href. Choices derive from the authorized workspace Page listing. Selection writes a literal href without adding persistent link metadata.
- Plain Page creation checks canonical route uniqueness inside the existing application mutation callback. Normal Save validates changed Page links and guards route changes, including surviving self-links. Page deletion scans incoming saved literal route references and identifies referring Pages and managed links. Accepted composed-Page route validation is unchanged.
- Shared runtime, explicitly opted in by a host's admitted Page paths, delegates eligible unmodified root-relative links to the existing navigate adapter. Modified clicks, external links, target and download behavior retain their existing browser handling. Accepted same-Page fragments remain on their original path.
- The admitted disposable pathname host explicitly imports Home, About, Contact and the accepted anchor Page. It resolves before pushState, remounts on popstate, starts fresh navigation at the top and focuses the heading. It retains the empty Component input and empty package-manifest input, owner/source restrictions and recovery-refusal boundary.
- Saved Design Preview resolves destinations through authorized saved Page listing and the existing exact-hash saved Preview endpoint. Its logical URL uses query parameters for app, locator, revision, kind, design and Page route; fragments retain same-Page anchor meaning. URL reload initialization ignores the parent's stale initial message once initialized. History belongs to the iframe. Successful navigation disposes the previous runtime; failed revision reads preserve the current Page and URL. See `evidence/v1-multi-page-20261028/contract-notes.md`.

The existing Foundation graph boundary serializes participating Builder Create, Save and Delete operations. Candidate dependency capture occurs before target-role locking, validation executes in the role-bundle Save, and existing revision rechecks remain at admission. Focused disposable tests exercise the actual graph lock and role service. This is not a cross-artifact commit or protection from arbitrary filesystem writers. No lock, router, persistent registry, reference graph or Preview service was added.

## Normal Chrome observations completed

The ordinary Builder at `http://localhost:5374/`, existing Application Admin identity, and disposable application `dev-v1-identity-fixture` created the three Pages. Heading and link content was entered with ordinary keyboard controls; source textareas were read, never edited. All three Pages were saved/reloaded. Each has five managed nodes and literal links forming Home → About → Contact → Home.

| Page | Route | Existing creation identity retained | Saved and authorized Preview hash |
|---|---|---|---|
| Home | /home | art_47c10a1f-248d-4404-ac39-ee46a7db6c48 | 2337d7935ce3187d0e903608df48e1b6c1435d0636d5b89fb7df9855be00516c |
| About | /about | art_831b8cb4-a60f-4264-97ed-99d33205857a | e108a661ce886f9543fe7af5e5d5cf5a5c8894735d7d1a137db2a780d9e80c79 |
| Contact | /contact | art_380e4d4e-6289-413a-99b3-c7d345030806 | fe9176fa530046d221d976d8d4fb3e9a3b326952d26d969b8c9d1dcf520348ae |

Plain Page creation does not assign a routeId under the existing contract; none was invented. Existing saved artifact identities and section identities were retained. A heading in an interrupted, unsaved About draft was reauthored in the fresh authorized session; it is not described as a previously saved node.

Normal authorized GETs for saved bundles and exact-hash Preview responses agree byte-for-byte on all five roles for all three Pages (`normal-authorized-revisions.json`). The ordinary website at `http://127.0.0.1:5188/` passes the three-Page loop by mouse/Enter, heading focus and scroll position 0 on fresh navigation, Back/Forward, and direct Contact loading/Reload (`normal-website-navigation.json`, `normal-website-contact.png`). This short-Page observation does not establish nonzero history scroll restoration.

The website's accepted anchor deep link still focuses `features` on managed section `node_6281825f-5a7c-4b9a-b052-62216edda5e4` at approximately the viewport top (`normal-anchor-regression.json`).

A normal href edit to `/missing-page` refuses, names the managed link and leaves HTML unchanged (`normal-missing-destination.json`). Home saved Design Preview initially loads Home with its exact saved revision and an iframe-owned logical URL. Its first attempted cross-Page click loaded the Builder application inside the iframe: investigation proves the Builder's old immutable prebundle contains the anchor runtime but no `pageRoutes` handler. This is a failed attempt, not successful Preview navigation evidence.

A referenced-route change attempt remained `Saving` in its capture. The following Reload confirmation caused automation/focus timeouts. `normal-referenced-route-change.json` is incomplete and is not counted as a successful refusal. The saved Home route remains `/home`.

## Verification completed

`node scripts/verify-multi-page.mjs` passed in `evidence/v1-multi-page-20261028/run-1793211871047`:

- 16 passing focused tests, including the eight existing anchor tests, canonical and duplicate route checks, supported/unsupported targets, unchanged legacy/external links, incoming references, self-link route-change safety, actual Foundation graph serialization of competing route checks/creates, and unchanged actual role-bundle hash after refused Save.
- Actual shared-runtime isolated-DOM checks for anchors, literal Page paths, missing destinations, modifier/target/download behavior and disposal.
- Actual Preview client/shared renderer with fake saved transport: navigation, previous mount disposal, URL reload initialization, Back/Forward and failed revision retention without a history entry. This is not normal authorization or iframe-browser evidence.
- Zero strict scoped typecheck diagnostics for the source/runtime/editor/Preview/Save-service fixture inputs.

Full server typechecking and the Visual Artifacts package build pass. The disposable reference-host build passes after explicit three-Page registration. The broader client typecheck reports unrelated existing fixture native-declaration errors and `src/client/main.ts:588`; no errors were reported in changed client files. The isolated fixture retains its known native IIFE import.meta warning; no native authoring or production qualification is inferred.

Preservation checker passes: **61 accepted Page files** (55 earlier files plus six accepted anchor Page files), **3 qualified recovery-read source modules**, **16 original reference-host files**, **175 historical host evidence entries**, and the exact editor refresh-scheduling suffix remain unchanged. Historical reports, raw evidence, failed attempts, old caches and existing source differences are retained. No lock/journal state was enumerated or cleaned.

## Concrete remaining verification dependency

The disposable installed package copy originally lacked the new exports despite the workspace package build. It was updated and a fresh Node import confirmed the exports. The operator restarted the existing API; its in-memory identity session expired as expected. A fresh ordinary sign-in restored the same Application Admin identity; no permission or policy was changed. Retained old editors were left untouched.

The Builder still uses `runtime/vite-cache-anchors-final-20261028`, whose runtime prebundle demonstrably lacks `pageRoutes`. The operator has been asked to restart the existing disposable startup command with only `UI_PLATFORM_VITE_CACHE_DIR` pointing to the new `runtime/vite-cache-multipage-20261028`, preserving the old cache and all other environment values. Process inspection/restart from this session is denied by Windows CIM access. The fresh-cache startup reply is pending.

After that startup, remaining work is normal iframe cross-Page navigation, iframe Reload and Back/Forward with unchanged Builder URL; meaningful nonzero scroll restoration; normal duplicate/invalid-route and referenced deletion/route-change refusals; final revision/preservation comparisons, builds and inventory refresh. No normal-browser refusal or Preview check is claimed on the basis of the isolated fixture.

Exact current file inventory: `evidence/v1-multi-page-20261028/file-inventory.json`. Generated package outputs, installed disposable copies, host inputs/build outputs, fresh Page roles, evidence and generated cache inventories are recorded separately within it. This inventory is a work-in-progress snapshot and must be refreshed after remaining verification.

No I-AM, permission, application settings, autosave, recovery, Windows security/token/VM/WinPE or protected Component changes. No cross-Page fragments, general router, arbitrary Page discovery, Shell navigation, restricted Saved Preview, comprehensive security qualification or production deployment. Normal-browser unsaved-draft Preview protection remains deferred and unaccepted. No commits, pushes or acceptance declaration.

## Continuation after the operator's fresh-cache restart

The operator confirmed the fresh-cache restart. A fresh normal Chrome session selected the existing Application Admin identity. Saved Design Preview then completed Home → About → Contact → Home by mouse and Enter. Destination heading focus and top-of-Page scrolling passed. Browser Back/Forward traversed iframe Pages, with the Builder parent remaining `http://localhost:5374/` (`normal-preview-navigation-final.json`). This resolves the previously observed stale-runtime failure.

Ordinary controls set the fresh Home heading wrapper height to 1200px for a meaningful scroll check, preserving all HTML and managed identities. Its final hash is `48b2e2d7a5b73ef6cd13d4e9524eae05a5890b0a7416e75db3adee898f61a68b`; About and Contact retain the hashes above. Normal saved and exact-hash authorized Preview GETs agree byte-for-byte for all three final revisions (`normal-authorized-revisions-final.json`, `saved-disk-bundles-final.json`). Iframe navigation from approximately 756px opened About at 0 with heading focus; Back restored Home to the same approximately 756px (`normal-preview-scroll.json`). The website also demonstrated fresh navigation at 0 and Back restoring a nonzero Home position (`normal-website-scroll.json`). The final host build passed with this saved layout.

Normal Create Page refuses duplicate `/about` and unsupported `/about?invalid` routes, without creating either probe directory (`normal-duplicate-route.json`, `normal-invalid-route.json`). Normal Save refuses Home's route change and names Contact's managed link `node_7e8be7a6-0f08-4aca-9462-7d19de402a53` (`normal-route-change-final.json`). The candidate was restored through its ordinary route field to `/home`, and the editor returned to Saved. The earlier incomplete route-change capture remains preserved.

Deletion-refusal verification is still incomplete. Automatic approval review initially rejected accepting the deletion confirmation because a failure could delete Home. Subsequent source inspection established that the incoming-reference guard precedes removal and the Windows helper exclusively uses SendToRecycleBin. The retried confirmation was no longer rejected, but browser focus-emulation/confirmation dispatch timed out, so no completed normal-browser deletion refusal is claimed. Home remains present and its saved roles agree with the final captured revision. No workaround or indirect deletion request was used.

Native Chrome window access for Reload frame timed out awaiting app approval. The operator was asked to use Reload frame inside the saved Design Preview. The separate Fixture demonstration's Refresh fixture button is not this workflow. An actual iframe Reload remains unverified; it is not inferred from the passing isolated URL-reinitialization test.

While reopening the correct Home editor for operator-assisted verification, normal application opening and browser endpoint navigation stopped responding. A direct health check then returned `curl: (7) Failed to connect to localhost:4390 ... Could not connect to server`. The API is now unavailable. Its terminal output has been requested for diagnosis; no startup environment, permission, recovery or security change was made to compensate. Final preservation still passes for all 61 accepted Page files, 3 qualified read modules, 16 original reference files and 175 historical host evidence entries.

Current remaining work: diagnose the API exit from the existing terminal output, verify actual iframe Reload and the normal deletion refusal, capture final readable review evidence and refresh the inventory. The acceptance review gate has not been reached. No commits, pushes or acceptance declaration.

### Correction to the API-outage diagnosis

Normal Chrome subsequently loaded `http://localhost:4390/api/health` and returned `{"ok":true}` (`normal-api-health.json`). The shell connection refusal did not establish an API outage. The earlier description of an API stop was incorrect; no API exit is shown in the operator's logs. The logged duplicate/invalid-route and incoming-reference errors are handled validation refusals. No restart or code change is justified by that diagnosis. Browser automation remains the source of the outstanding interaction timeouts.

### Final operator-assisted checks and submission

After a clean restart, the Builder proxy returned `{ "ok": true }` and normal application opening resumed. The operator completed Reload frame in the correctly identified saved Design Preview and the referenced Home deletion confirmation. Subsequent automated inspection recorded the final Home revision/heading identity, unchanged Builder URL, ready Preview, and the actual deletion refusal naming Contact's referring managed link. All final saved roles remain unchanged, and final console errors are empty. See `normal-operator-final-checks.json` and `normal-final-refusal-preview.png`.

The consolidated final submission is `v1-multi-page-website-authoring-review-gate-20261028.md`. This supersedes earlier pending statuses in this chronological working report. The bounded implementation and verification are submitted at the Multi-Page Website Authoring Acceptance Review Gate; no acceptance or closure is declared. No commits or pushes.
