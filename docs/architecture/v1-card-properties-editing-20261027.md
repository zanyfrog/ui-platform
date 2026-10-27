# V1 Card properties editing investigation

Status: **V1 Card Properties Editing Acceptance Review Gate**. Normal development startup/sign-in/Page creation are operator-observed; normal-browser Card/Panel properties completion remains open.

## Precise cause and classification

A read-only inspection was limited to the explicitly authorized disposable Page `v1-card-panel-smoke/page.html` under `C:\Projects\Modular\v1-normal-smoke-20261026-01\apps\v1-identity-fixture\src\pages`. Its original bytes are retained as `evidence/v1-card-properties-20261027/observed-page-readonly.html`; no source service, lock acquisition, journal read or recovery was involved. The Page was not saved or modified by this investigation.

The saved opening tag contains **`data-ui`, then blank lines, then `p-node="node_b24d4dcb-3da1-4f7a-ae3e-7a353e271c55"`**. HTML whitespace separates attributes; this is two attributes, not `data-uip-node`. The Card's `data-uip-component="cmp_platform_5d42b928-83bf-4b18-a4c0-48b06c2efa1"` reference is intact.

The actual installed shared parser reports `id: null`, `manual: true`, and attribute names `data-ui`, `p-node`, `data-uip-component`. There are no HTML syntax errors: the markup is syntactically valid but lacks a managed-node identity. Thus the answers are:

1. **Yes, it is intentionally classified as manual**, based on the saved HTML, not its tag name or Card type.
2. **Yes, the required node identity attribute is missing as an HTML attribute.** A component reference identifies the reusable definition; it does not identify the instance.
3. **No Card property registration or ordinary insertion defect was reproduced.** `insertNode` emits an intact node attribute for wrapper and child. New Card and Panel instances have IDs and existing editable properties. The origin of the saved attribute's line breaks is unestablished; do not attribute them to user action or the insertion code without evidence.

`renderStructure` correctly represents an unidentified node as `manual:<index>`. `renderInspector` previously searched only managed IDs and then displayed the generic “Select a managed node” prompt, obscuring why the selected Card had no controls. Weakening the parser to alias split attribute names, adopting every component reference, or manufacturing identities would change manual-source semantics and is not justified.

## Small compatible correction

`src/client/visual-artifacts/editor.ts` now recognizes a selected manual Structure entry for **explanation only** and states that its HTML has no usable `data-uip-node`, that a component reference alone is insufficient, and that existing source is preserved. Property eligibility, parsing, insertion, identity validation and persistence are unchanged. This exact source-only patch was copied to the disposable development project's corresponding editor file after checking that it matched the pre-edit snapshot. No backend restart was performed.

This is a correction to misleading selection feedback, **not automatic repair of the saved Card**. The existing Card remains manual. A new Card inserted through the ordinary controls is managed/editable in the verified fixtures. Making the old Card managed would require an explicit ordinary HTML edit and a normal authorized Save; no identity normalization, migration, Advanced Repair or Page rewrite was performed here.

## Verification

Final run: `evidence/v1-card-properties-20261027/run-1793106774436`.

- Four existing source/owner tests pass, covering HTML literal settings, legacy fieldwise preservation, native Panel contracts, and identity/content refusal.
- Two extended actual-editor workflows pass with autosave disabled/enabled. Initial fixture HTML contains the same ordinary managed section structure as a newly created Page. Actual Structure selection events and insertion controls are used, including Card insertion into the selected section.
- Both Card and Panel split-attribute scenarios reproduce manual selection and now show the explicit explanation. Undo restores exact fixture source without adopting or altering manual identities.
- Card Add → Select → Edit heading/body/header/footer/variant/density → actual owner Save → Reload passes, preserving node identity and literal HTML without a duplicate settings bag. A second Card property edit, Undo/Redo, Save and Reload also pass.
- Panel Add → Select → Edit variant/density → Save → Reload passes; its property controls remain available when selected after Reload. IDs, order and saved hashes are retained.
- Actual existing design Preview and pinned native Card/Panel rendering also pass in the isolated DOM. Preview uses saved hash/content and rejects dirty initiation. This is fixture transport, not normal-session/browser or production Preview qualification.
- Strict scoped typechecking: **zero diagnostics**. `git diff --check` passes. The inherited unused native loader `import.meta` IIFE warning remains recorded; it is not exercised.

The initial retained run `run-1793106703547` reproduces failure of the new manual-message assertion against the old generic inspector. Its raw failure is retained. An earlier preparation command had a PowerShell quoting error before creating files; its tool-transcript output is retained and no product operation executed. The intermediate passing run `run-1793106714592` is retained before extending Panel's post-reload checks.

The verifier reuses the accepted source admission/guarded disposable Foundation owner and actual editor. Backend/request authority in these tests is the explicitly nonproduction fixture bridge, never a claim of normal-session authorization. Exact admitted source hashes, typecheck inputs, compiled graphs, raw results and errors are retained in each run.

## Preservation, inventory and next normal check

`observed-diagnosis.json` records the saved Page hash `dae9f55b3ca5791e33522599c20427828988b1521c9f73a55e396639b2a34bf6` and confirms the Page remained byte-identical after testing. Existing Pages, definitions, metadata, ownership/session authorizers, expected-hash checks, Foundation/recovery boundaries and package activation are unchanged. No protected state, Windows security changes, production Preview, commits or pushes.

Changed logical product file: `src/client/visual-artifacts/editor.ts` (and its byte-matched disposable source copy). New support: `scripts/verify-card-properties.mjs`, `tests/card-properties/backend.ts`, `tests/card-properties/harness.ts`, this report and the evidence directory. The support copies use existing actual implementations; no renderer, property framework or component-instance store was introduced. The exact path/size/hash inventory is `docs/architecture/v1-card-properties-files-20261027.json`; only its self-entry is unhashed.

Operator continuation: reload the browser and reopen the saved Page. Existing manual Card selection should explain its missing identity. Select the intended container or artifact root, choose **Card** in the insertion dropdown, and click **Insert with layout wrapper**. Select the new `uib-card` entry with a node ID (not `(manual)`); use its existing property controls, Save Now and Reload. Repeat with Panel. Leave the old manual Card unchanged during this verification. Record any error; normal-browser completion is pending, not inferred from these fixture results.

Stop: **V1 Card Properties Editing Acceptance Review Gate**.
