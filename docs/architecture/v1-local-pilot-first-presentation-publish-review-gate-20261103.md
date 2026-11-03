# V1 Local Audience Pilot — First Presentation Publish Acceptance Review Gate

2026-11-03. **The one authorized Presentation Publish attempt succeeded. Active Presentation version is 1, and the persisted v1 snapshot was verified independently of the UI message.** Submitted for review; no acceptance, reader delivery or overall pilot completion is declared.

## Authenticated operation and exact inputs

The existing normal Chrome Demo context's Verify development session confirmed authenticated Application Admin `usr_f01e0c1c58424bed9ac4e8601ff9890a`, deployment `builder-demo`, authority `ui-platform-development`, registered Applications enabled. The target remains `codex-test-v1-local-pilot-20261102`, permanent ID `de8d1851-3e36-435f-b093-95ce94d940e7`.

Immediately before the attempt, read-only checks confirmed policy **11** and the original seven exact functional security documents/rules/scopes, including `ui.presentation.admin` at the pilot Presentation descendant scope and no temporary Page administration rule. All saved source files matched the accepted readiness baseline except permitted ordinary operation-log appends. Page/Route identities, Shells/Menus, branding, asset and CSS inputs were unchanged. Presentation was initialized with an existing draft, `activeVersion: null`, and no published versions. The UI displayed Draft only.

The existing trusted composition fingerprint/checksum functions captured these pre-Publish inputs:

| Input | SHA-256/checksum |
|---|---|
| Composition source fingerprint | `2d9c82d0944690fb0bb7c8f4df0bba0bdc59a369fc6b763f36a2dab67ee949fb` |
| Composition source checksum | `255a247717d011a9e3fd463e26eee94517c951596af55b948cdf7062d0505387` |
| Manifest file bytes before Publish | `f44224928911c0c78b00e759d0ee1d3d57149d881b11a79701ee6afbdbbf6f11` |
| Draft file bytes | `1181c7c7ed9177aa660e69586df51629fdf7532a772832e7211dd4221a210b28` |
| Draft semantic/version checksum | `329fb00248abbceb655347d4889d5c4c79da8a8a49268bd221e516120dae3622` |

Publish Changes was clicked **once** in the normal Presentation UI. No direct API write, manual version-file creation, source/permission adjustment or implementation change was used. The existing protected request preserved authentication/CSRF, effective `ui.presentation.admin` admission, composition/native-package validation, source and manifest checks and normal snapshot/history behavior. Completion of this protected operation demonstrates its live authorization admission; button visibility alone was not treated as proof.

## Persisted result

Normal Chrome now displays **v1 active** and **Published presentation matches saved source**. The persisted manifest independently confirms:

- `activeVersion: 1`.
- Exactly one version record: version 1.
- Version checksum `329fb00248abbceb655347d4889d5c4c79da8a8a49268bd221e516120dae3622`.
- Published timestamp `2026-11-03T20:37:50.172Z`.
- Existing draft still present, with unchanged content bytes. Its manifest bookkeeping timestamp was updated by the normal Publish contract.

`presentation/versions/v1/presentation.json` validates against that recorded semantic checksum. `presentation/versions/v1/composition.source-checksum` equals the pre-Publish fingerprint and the fingerprint recomputed from current saved sources. Every one of the **35 captured composition source files** matches its corresponding persisted snapshot bytes. The authoring fingerprint remains unchanged after Publish. Active CSS and v1/application.css both equal the existing generated draft CSS renderer output.

## Published routes and closure

The v1 composition snapshot contains exactly these Visual Page/Route identities:

| Reader route | Permanent Page ID | Permanent Route ID |
|---|---|---|
| `/` | `art_de8d1851-3e36-435f-b093-95ce94d940e7_public_page` | `route_de8d1851-3e36-435f-b093-95ce94d940e7_public` |
| `/about` | `art_3aed563f-5602-44f8-8aea-287edc4dad93` | `route_801558d2-8d78-44ec-9722-28642a26215e` |
| `/contact` | `art_89e4ba70-07fd-482f-ade7-e89a4911d915` | `route_d627c61f-6eb4-409c-a196-a5147641e76e` |

There is no Administration Page or `/admin` composed route. The snapshot preserves Public Shell, Main Navigation, Local Pilot branding, shared footer, responsive site CSS and the admitted logo with exact source bytes. Retained Admin Shell and repaired Admin Navigation are also captured; the latter targets Home. The legacy source-inspection `src/pages/index.ts` is copied as source by the existing snapshot contract; it is not another member of `definition.routes`.

Inspection of captured HTML/component dependency metadata finds **no permanent shared Component references** required by these Pages/Shells. The required frozen Platform-component closure is therefore empty; no unused Customer Summary Card or PersonForm was introduced as a required snapshot dependency. Manual UI Base/Hero elements continue to depend on the admitted installed package catalog. This snapshot is not a standalone production bundle containing all dependency binaries, and no reader/runtime qualification is inferred.

## History and audit behavior

Exactly one normal `presentation.published` history entry was appended, naming version 1 and the matching version checksum at `2026-11-03T20:37:51.356Z`. Its existing history actor field is **`local-user`**, as is the version record. The canonical Application Admin was separately verified in the legitimate browser session; the generic persisted actor label is not claimed to provide richer per-principal publication attribution.

The existing Presentation Publish contract appends Application history; it does not perform I-AM permission activation. All seven security-table digests, including policy/administrator/delegation audits and prior candidates, remain unchanged. No security activation audit was invented or expected for this content publication. Historical initialization/deletion/candidate/refusal evidence is preserved.

## Exact change and preservation inventory

The snapshot comparison records **4 modified existing files, 38 new files, no removed files**, all confined to the pilot:

- Modified `presentation/presentation.manifest.json`: active pointer, version record and normal draft bookkeeping.
- Modified `presentation/active.css`: generated published draft CSS.
- Appended `history/app-history.jsonl`: +181 bytes, original prefix hash preserved.
- Appended `.uib/logs/operations.jsonl`: +201 bytes, original prefix hash preserved.
- Added `presentation/versions/v1/presentation.json`, `application.css` and `composition.source-checksum`, plus the 35 files under `composition/`.

`preservation.json` lists every exact absolute path, size and SHA-256, including the whole new snapshot. No other captured Application source changed. All three authoring Page bundles, settings, Shells/Menus, branding/assets, site CSS and draft content remain intact. Persistent Demo and fixture files and all registered Application records match baseline.

Policy remains **11**, with exactly the original seven accepted functional records. The initial administrator anchor, unrelated policy and historical candidates/audits are unchanged. Dependency package/lock/archive hashes match accepted evidence; UI Base remains physical and all 54 admitted payload hashes match. No new dependency/native qualification beyond these checks is claimed.

New review artifacts are this report and `evidence/v1-first-presentation-publish-20261103/`: before/after snapshots, trusted read-only inspection/finalization helpers and outputs, exact source/snapshot fingerprints, publication history, sanitized final browser record/partial screenshot, preservation inventory and `files.json`. Helpers only read publication/security/source state and write evidence; no authority database or session/credential material was copied. Historical reports were not overwritten.

## Stop and remaining delivery requirements

No Publish failure or partial-output recovery occurred, and no second attempt was made. No publication integrity blocker was found within these persisted-state checks. Accepted mobile/Preview and earlier validation qualifications remain in their original boundaries; no hosted browser render was tested here. The post-deletion stale-target UI defect remains documented and unmodified.

Reader delivery still requires separate explicit authorization for its build/runtime/host lifecycle, qualification of the intended loopback destination/strict binding and actual rendering/navigation from the selected published snapshot. No reader was started, no production build/export occurred, and no LAN/public deployment exists as a result of this Publish.

Stopped at **V1 Local Audience Pilot — First Presentation Publish Acceptance Review Gate**. Application Admin remains signed in; no identity, permission, Page/Menu/Shell source, dependency/trust or process changes were performed. No commits or pushes. Presentation publication success is reported within this local lifecycle only, not as successful reader delivery or overall V1 pilot completion.
