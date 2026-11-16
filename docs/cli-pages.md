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
