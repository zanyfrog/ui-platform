# V1 HTML-first implementation and verification

Date: 2026-10-26. Final scope: `evidence/v1-html-first-20261026/run-1793064739188`.

## Changes

| File | Change |
| --- | --- |
| `packages/visual-artifacts/src/source.ts` | Read/write declared literal attributes and simple text slots; remove edited legacy duplicate only; refuse unsafe content replacement |
| `packages/visual-artifacts/src/model.ts` | Read declared legacy settings from same-name literal attributes with preserved stored override precedence |
| `packages/visual-artifacts/src/validation.ts` | Apply the same legacy literal setting conversion in shared validation |
| `packages/visual-artifacts/src/runtime.ts` | Avoid generated slot default duplication when authored children supply content |
| `src/client/visual-artifacts/editor.ts` | Use shared HTML setting helpers; multiline slot controls; limit mode reset to mode edits |
| `tests/source-identity/visual-source-barrel.ts` | Additive exports for existing editor regression imports |

New `tests/html-first` files provide actual-editor fixtures, actual owner save/read bridge, parser tests, pinned native execution and optional real-browser verification. `scripts/verify-html-first.mjs` records exact dependency admission, source snapshots, initialization and resolved graphs before execution. The inventory lists every file and hash.

## Executable admission and limits

The verifier admits actual shared parser/model/validation, editor, VisualArtifactService, Foundation primitives, Preview client and Visual runtime. Filesystem access is guarded to disposable fixtures using the existing D6-R1 guard. Package metadata and the 17-member native closure are taken from the retained P2 fixture manifest and checked by hash; 13 native JavaScript members execute. Current protected package stores are not read. Unused Forms/service/server branches have explicit tripwire facades; development session execution is disabled. No production backend starts.

Strict no-emit typechecking uses the recorded source/type closure and a narrow native interface declaration; actual pinned native JavaScript execution is verified separately. The native registry's unused default fetching loader produces an IIFE `import.meta` warning; it is not called. The DOM fixture includes a recorded self-replacement no-op shim for a happy-dom incompatibility. This is a test platform adjustment, not a product renderer change.

## Final results

Serial execution, zero automatic retries: **4 source tests, 2 editor workflows, 0 typecheck diagnostics**. See final `result.json`, `unit-results.txt`, `workflow-results.json`, admissions and graphs.

Both workflows use actual editor controls with autosave disabled/enabled, real Card and Panel contracts, and actual `UibCard`/`UibPanel` classes. Add, property edit, actual owner Save, Reload, matched Undo/Redo, second edit, Save and Reload preserve node identities, order, attributes and multiline child content. The tested values have no duplicate settings bag. Special quotes, ampersands, dollar sequences and angle brackets survive. Parser tests cover legacy fieldwise preservation and unsafe nested/mixed-content and duplicate-identity refusal.

The actual existing Preview frontend receives the editor's saved hash and reads saved files through the fixture bridge to the actual owner. It renders the second saved heading and original children, without the default Card body duplication. An unsaved draft edit cannot change that saved Preview, and dirty Preview initiation is refused. Unexpected external network and workflow errors are empty. This bridge is nonproduction admission, not the real HTTP session/authorization boundary. Iframe delivery is simulated in the isolated DOM.

Two separately admitted real Edge attempts failed before application loading: `run-1793064617504` (launch) and `run-1793064683785` (fresh persistent fixture profile). Raw launch failures are retained. No real-browser workflow or production authority is qualified; no screenshot was produced. Browser work stopped without permission/token changes or Windows investigation. The final default run records this limitation; `--real-browser` is optional and not reported as passed.

## Retained unsuccessful attempts

| Run suffix | Result / correction |
| --- | --- |
| 3840070 | Admission refused incorrect test-barrel import paths; corrected relative paths |
| 3850879, 3912876 | Early DOM assertions/teardown error; raw available artifacts retained; cross-realm comparison and settling corrected |
| 3940292 | Undo/Redo comparison before reload completion; wait for actual editor idle |
| 3979124, 4019782, 4062453 | Preview query/platform diagnosis; use native shadow root and recorded DOM self-replacement shim |
| 4121182 | Six scoped typecheck diagnostics; exact missing Vite/automation type inputs admitted |
| 4408423 | Two textarea/input union diagnostics; input type guards corrected |
| 4617504, 4683785 | Browser launch failure before fixture loading; unqualified |

All suffixes have prefix `run-179306`. Earlier successful scopes 4184380 and 4433841 are retained too. These are separately corrected attempts, not automatic retries. The first two fatal teardown stderr streams were shown in the tool transcript rather than fully captured as main failure files; this limitation is explicit. Existing raw files are not rewritten.

## Preservation and stopping point

`preservation.json` compares the pre-edit baseline with current files: exact changed hashes, unchanged count, deletions and Git HEAD comparison. Existing historical reports and raw evidence remain unchanged. Old inventories of source legitimately retain the old hashes; they are not rewritten to conceal this authorized correction. New inventory includes all new evidence, tests and reports, with its own hash omitted to avoid recursion.

No Foundation, accepted L1/L2/L3, native implementation, CSP, authority/provider, publisher or persistence service changes. No protected reads, recovery, production migration, package activation, I-AM mutations, commits, pushes or synchronization.

The baseline comparison records 2,019 unchanged files, six authorized modifications, no deleted baseline files and unchanged HEAD. Two disposable Page directories from interrupted early fixture attempts remain under this increment's evidence directory and are included in the inventory; they are nonprotected test data, retained rather than silently removed. `git diff --check` passes (Git emits only line-ending conversion notices).

Stop: **V1 HTML-First Simplification Acceptance Review Gate**. Remaining compatibility portions are listed in the assessment. Real-browser and production Preview qualification remain open.
