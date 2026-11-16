# Protected Visual Page discovery

From this isolated checkout:

```powershell
node .\scripts\uip.mjs page list --app <application-id> --server http://127.0.0.1:5490
node .\scripts\uip.mjs page show --app <application-id> --page <artifact-id> --server http://127.0.0.1:5490
```

Both commands use the existing browser pairing flow, memory-only credential and parent-session checks. Application IDs resolve through the registered application registry and require application-view permission. Page access requires `ui.page.view`, either on the Pages collection or the individual permanent artifact ID. No editor mutation session is required.

List returns only authorized page IDs, names, display names, routes and bundle revision hashes. Show returns only the selected page's metadata, hash, service read diagnostics and five source roles (`source`, `css`, `metadata`, `fixtures`, `code`). It does not return locators, filesystem roots, Components or Shell bundles. Diagnostics are source-read diagnostics, not a full dependency validation report.

Discovery uses the existing Visual Page service under the existing graph lock. Missing, malformed or duplicate permanent identities fail the application page request closed, including when the offending page is not otherwise visible. Unknown and inaccessible requested page IDs share a denial response. Pending or stale retained source journals are refused without replay. Source hashes describe the captured revision, not a promise that an external editor cannot change source afterward.

For one disposable interactive acceptance, use a separate registered development fixture application containing a uniquely identified Visual Page. Pair and run list; pair again and show its returned ID. Check the page metadata, HTML and hash. Do not point the instance at accepted pilot storage. Each invocation pairs independently, as existing CLI commands do.

Focused verification: `node --import tsx --test tests/cli-pages.test.ts tests/cli-readonly.test.ts`.

## Protected Page mutations (Increment 3B)

```powershell
node .\scripts\uip.mjs page create --app <app-id> --name news --route /news
node .\scripts\uip.mjs page create --app <app-id> --name news --route /news --shell <shell-artifact-id>
node .\scripts\uip.mjs page create --app <app-id> --name news --route /news --mode plain
node .\scripts\uip.mjs page update --app <app-id> --page <page-artifact-id> --file candidate.json --expected-hash <hash>
node .\scripts\uip.mjs page delete --app <app-id> --page <page-artifact-id> --expected-hash <hash>
```

Each command uses fresh normal browser pairing. Composed creation uses the application's existing default Shell unless `--shell` selects another unique valid Shell in that application. It requires Application composition and `ui.presentation.view` on the presentation. Missing/default-invalid, inaccessible, ambiguous or invalid Shells are refused; configure the default, select a valid Shell in a composed application, or explicitly use `--mode plain`. Plain mode cannot include `--shell`. There is no CLI Shell setting or Page template system. Plain Pages use the existing service's standalone identity behavior; composed Pages receive generated Page and Route identities.

Create/update require `ui.page.edit`; delete requires `ui.page.admin`. Application-view and original registered ownership are checked at entry and admission. The host-only principal bridge accepts only branded paired requests and rechecks their original parent session. Browser editor revision/CSRF/principal checks remain in force on browser requests. Only normal candidate updates are exposed.

Candidate JSON must be an object with exactly five string properties: `source`, `css`, `metadata`, `fixtures`, `code`. `metadata` and `fixtures` contain JSON text, not nested JSON values. Use the `files` object returned by show as a starting point; do not submit the entire show response. Preserve permanent identities. Page Shell changes still require the existing Change Page Shell workflow. The request limit is 2 MB. HTML remains authoritative for markup and node attributes.

Create returns `id`, `name`, `route`, `mode`, optional `shellId`, `hash`, and `commitOutcome`. Update returns `id`, `hash`, and `commitOutcome`. Delete returns `id`, `removed`, `mode: os-trash`, and `commitOutcome`. The complete shared reference/composition validation runs before removal.

Validation, authorization and stale-revision failures before admission return `commitOutcome: not-committed` with distinct error codes/statuses. Failures after admission are conservatively `unknown`; a lost/malformed response also leaves the client uncertain. The CLI never retries a mutation automatically. Inspect list/show and authoritative source before deciding whether another command is appropriate. No-op normal updates may return the existing hash.

Focused verification: `node --import tsx --test tests/cli-page-mutations.test.ts tests/cli-pages.test.ts tests/cli-readonly.test.ts`. These cover shared normal services on disposable files, actual OS trash, paired-principal revocation, reference refusals and conservative uncertain-outcome handling. An interactive mutation acceptance workflow remains separate: create one disposable Page, show it, update a complete five-role candidate with its hash, then delete the unused Page using the new hash. Do not use accepted pilot storage.

## Atomic Page duplication (Increment 3D)

```powershell
node .\scripts\uip.mjs page duplicate --app <app-id> --page <source-page-id> --name scout-profile-copy --route /scouts/profile-copy --expected-hash <source-hash>
```

Duplication stays within one registered Application. It requires source `ui.page.view`, destination collection `ui.page.edit`, current Application-view/ownership admission, and presentation-view permission for a composed Page's Shell. Source-only edit permission does not authorize destination creation. Every mutation uses the existing fresh browser pairing.

The complete creation companion in `VisualArtifactService` generates a new Page ID and, for composed Pages, a new Route ID. It copies HTML, CSS, fixtures and Page functions unchanged; metadata retains configuration while replacing destination identity, name, display name and route. Plain/composed mode and existing Shell/Component references are preserved. Page-local node/Region/anchor IDs stay local to the new Page with their bindings intact. Typed self Page/Route destinations in Menu overrides are remapped to the new identities. Other Page links retain their existing destinations, including links to the original Page. The generated entry point is regenerated, not copied from arbitrary source code.

The existing graph lock covers source capture, hidden staging, normal candidate validation, admission and atomic directory rename. The candidate validator supports an unpublished Page added to the proposed graph; it applies existing syntax, metadata, Page link/anchor, route, dependency, composition and Shell Region rules. No repair mode or public starter-then-update operation is used. Hidden staging is excluded from Visual and legacy Page discovery/source APIs.

Before publication, admission rechecks source-read, destination-create, Shell access, original session and registered Application ownership. Source hashes, captured Page/Shell/Component revisions and collection membership, composition files/Menu membership, package discovery, destination absence and staging bytes are rechecked. The local Windows filesystem publishes the complete dedicated directory through the existing rename behavior, refusing an existing destination. A validation/admission failure cleans hidden staging and reports not-committed; an uncertain rename/result reports unknown and is never automatically retried. As with existing local editing, arbitrary external filesystem writes cannot be prevented.

Success returns `id`, `name`, `route`, `mode`, selected `shellId`/new `routeId` for composed Pages, `hash` and `commitOutcome`. The source Page is unchanged. Content requiring repair, unsupported anchors or invalid dependencies is refused rather than silently rewritten. Export/Import, cross-Application copies and Page Templates are not included.

Focused verification: `node --import tsx --test tests/cli-page-duplicate.test.ts tests/cli-page-mutations.test.ts tests/cli-pages.test.ts`.
