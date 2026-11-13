# Local read-only uip CLI

This is a local Windows development CLI. It retains V1's development identity selector qualification; pairing does not add production authentication. Live import/upsert, transaction dry-run, trigger coordination, schema management and page management are unavailable.

## Invocation

From this isolated UI Platform checkout with its existing dependencies:

```powershell
node .\scripts\uip.mjs --help
```

`npm run uip -- <arguments>` is also available. The package declares the `uip` bin; a global installation is unnecessary.

The updated Platform API and Builder must run from this source, using a separate authorized development runtime and the existing local startup flags. An already-running accepted pilot uses its previous source and does not gain these endpoints. Do not point this checkout at the accepted pilot storage merely to try the CLI. Existing applications must be registered to that development instance and Datasets connected through the ordinary Builder workflow. No automatic connection, Apply, copying or reseeding occurs.

For a separate existing development environment, set `NODE_ENV=development`, `UI_PLATFORM_V1_DEVELOPMENT_IDENTITY=1`, `UI_PLATFORM_BUILDER_WP0=1`, `UI_APPS_DIR`, `UI_RUNTIME_DIR` and `UI_PLATFORM_V1_POLICY_STORE` to that environment's own paths. Existing API/Builder source entry points remain `node --import tsx src/server/index.ts` and `node node_modules/vite/bin/vite.js`. API and Builder ports use `UI_PLATFORM_API_PORT` and `UI_PLATFORM_UI_PORT`. `UI_PLATFORM_BUILDER_HOSTS_FILE` retains its existing optional connection configuration meaning. Do not reuse accepted pilot paths for verification.

## Pairing and protected commands

```powershell
node .\scripts\uip.mjs app list --server http://127.0.0.1:5490
node .\scripts\uip.mjs dataset list --app <application-id> --server http://127.0.0.1:5490
node .\scripts\uip.mjs data export --app <application-id> --dataset <dataset-id> --format json --out scouts.json
node .\scripts\uip.mjs data export --app <application-id> --dataset <dataset-id> --format csv --out scouts.csv
```

The default API origin is `http://127.0.0.1:5490`; specify `--server` for another local instance. Each protected invocation displays a public challenge. In the signed-in Builder for the same instance, click **Pair local CLI**, paste the challenge, then enter its single-use code in the originating terminal within 60 seconds. No email, role, cookie, CSRF secret or signing key is accepted by the CLI as authentication. Possession of the browser code without the originating process's proof cannot redeem it.

The credential remains only in process memory, lasts at most five minutes, and is bound to the parent browser session revision and principal. Logout, identity change, parent expiry, revocation, Platform restart or CLI exit requires new pairing. The CLI never saves credentials or puts them in arguments or exports. This increment executes one command per paired process; repeated commands pair again.

Discovery returns registered applications with application-view authority, and only connected Datasets that pass a protected identity-field read probe. Dataset labels are currently IDs. Export traverses the existing Dataset-qualified application proxy and protected read planner, preserving host-enforced field/row projection. It never calls a mutation endpoint. Exports fail above 10,000 returned records or the existing proxy response-size limit; no silently truncated export is written. Export output uses exclusive creation and will not overwrite an existing file.

## File validation only

```powershell
node .\scripts\uip.mjs data validate --file scouts.json
node .\scripts\uip.mjs data validate --file scouts.csv
```

Local validation requires an array of records with explicit, nonempty string `id` values and no duplicate IDs or unsafe field names. CSV also requires unique headers, valid quoting and matching column counts. Plain CSV cells remain strings. uip CSV export has a `#uip-json-cells-v1` marker and JSON-valued cells to retain string/Boolean/number/null/object types, commas, quotes and embedded newlines. Sparse projected rows require JSON export; CSV fails rather than inventing null fields. Empty exports are supported.

This is **file-format/structure validation only**. No schema metadata is exposed by the new adapter. Required fields beyond `id`, schema field/type validity, IAM import permission, conflicts, trigger eligibility and transaction behavior are not validated. The command performs no network access and persists no Dataset changes. It is not an import dry-run.

## Focused verification

```powershell
node --import tsx --test tests/cli-readonly.test.ts tests/increment2-routing.test.ts
```

Tests use disposable fixture policies/storage and in-process HTTP adapters, including the actual Platform identity class and application proxy with a controlled protected-host response. No live Troop records or runtime are used. These fixtures do not claim a newly completed interactive browser/normal-service deployment acceptance cycle.
