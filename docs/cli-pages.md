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
