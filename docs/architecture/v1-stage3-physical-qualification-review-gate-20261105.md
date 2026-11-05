# Stage 3 Implementation Review Gate — isolated physical-package qualification

November 5, 2026. Baseline `bccd9291f524b33b87ccbc32eb6bfb68503f22ec`. **Ready for explicit review; Stage 3 is not accepted or closed.** This report supersedes the November 4 blocked qualification report.

## Results

| Criterion | Local result | Evidence |
| --- | --- | --- |
| A1 | PASS within the admitted development boundary | `acceptance-results.json`, normal composition upload screenshot, `protected-results.json`, `size-rejection.json`, `revocation.json` |
| A2 | PASS for the tested local adapter/retained-interface and presentation-release contracts | Two passing real-Edge journeys; `frozen-bytes.json`, `rollback.json`, `retained-parity.json`, screenshots and package manifests |

Acceptance tests: **2 passed, 0 failed**. Focused regressions: **27 passed, 0 failed, 1 existing skip**. Machine-readable results are in `evidence/v1-stage3-physical-20261105/{acceptance-results,regression-results}.json`. Older failed/preparation runs are retained as diagnostic history and are not substituted for these final results.

## Physical-package preparation

Used the existing Stage 1 isolation pattern, with copies of the installed admitted inputs rather than updated dependency source. Fresh target: `evidence/v1-stage3-physical-20261105/platform-final`. Ordinary workspace package links and installation remain unchanged. The standard template also receives physical sibling file dependencies, and its application-local package links are replaced with physical copies inside its disposable application root. Every application package file is checked against its recorded SHA-256 before browser use/publication. Native Card activation uses the existing protected enable endpoint and explicit test-only package-administration grant.

Exact closure: UI 0.5.2; Forms 0.1.1; Hero 0.2.4; Assets 0.1.17; UI Layout, Theme, Design System, Core and Icons 0.1.0; Tour UI 0.1.1. The closure includes shared uploader and template dependencies. `package-closure.json` records source/destination identity, version and per-file hashes; `application-package-inputs.json` records the verified application-local copies. The installed artifact package's existing nested TypeScript compiler dependency is retained; no compiler upgrade or unrelated rebuild was performed.

Disposable package trees are ignored through the evidence folder's `.gitignore`. Their package bytes are inventoried in the closure manifest rather than treated as repository source edits. The preparation script is `scripts/prepare-stage3-physical.mjs`. Run tests with `UI_PLATFORM_STAGE3_PHYSICAL_ROOT` set to the prepared platform path; the UI Vite server uses current workspace authoring source, while the protected backend uses the isolated platform and physical packages.

## A1 browser and protected-transport evidence

Normal authenticated Builder creates a plain Page and Shell through dialogs, opens Presentation, initializes its lifecycle and opens **Shared Application asset uploader**. A browser-owned SVG File is uploaded through the protected composition multipart/File/path/expectedHash interface. Protected read-back matches its SHA-256; the existing hash is the revision token, with no new numeric revision or asset-ID migration.

Verified actual backend outcomes: stale hash returns **409**, bytes remain unchanged; ordinary replacement cancellation and explicit replacement succeed; a multipart file over the existing 100 MB request limit returns **413** and creates no asset; foreign-application/unrelated-user requests return **403**; expiring the author's existing role assignment causes subsequent protected access to return **403**. No test double supplies these security outcomes. Separate adapter-only browser tests use a labeled test transport for presentation feedback.

Original/recovered SVG SHA-256: `ed47ae055cff6e1a10d6246b90ec523dc78ec306a226b751ef253e16db2e5717`. Application ownership, permanent IDs and source paths are recorded in the protected evidence. Test grants and legacy-model fixture preparation are trusted setup, separate from ordinary author actions.

## A2 normal authoring and three-interface parity

1. **Composition shared uploader:** ordinary Presentation controls, browser File upload, protected path/hash transport, confirmation/cancellation and feedback. Screenshot: `evidence/v1-stage3-20261104/normal-composition-upload.png`.
2. **Retained chooser:** ordinary Page navigation, admitted Card insertion, save insertion, choose `assets/images/stage3.svg` for metadata-declared `mediaSrc`, set `mediaAlt`, Save Now, Reload, verify exact path, open saved Design Preview and verify a decoded image with natural width 20. Screenshot: `evidence/v1-stage3-20261104/page-preview.png`. The chooser refuses stale source/selection rather than applying to another target; the journey explicitly reopens it if that guard fires.
3. **Retained version-owned Presentation form:** fresh disposable legacy-model fixture selected before opening the app. Ordinary Assets form uploads a File with ID `retained-logo`, path `retained-logo/retained.svg`, and alt `Retained alt`. Both uploads return **201**. Published versions, replacement and rollback preserve these semantics. Screenshot: `retained-interface.png`; state/digests: `retained-parity.json`. This fixture does not convert the authored composition application or alter its owner/policy.

Both models publish through the normal **Publish Changes** interface. Version 1 captures original bytes; authoring replacement does not alter version 1; version 2 captures replacement bytes. The existing protected rollback restores version 1 to draft, followed by explicit normal Publish creating version 3. Version 3 matches version 1 byte-for-byte. Rollback is not represented as silently changing the active pointer. Composition and retained-form replacement digests differ because their independently generated replacement SVGs differ. The focused asset URL test also passes actual Vite frozen-asset emission after authoring replacement.

## Implementation and preservation

The increment reuses the shared uploader, retained chooser, asset manager and existing component setting writer. HTML remains authoritative for placement/node identity; declared settings keep their established representation. Runtime maps metadata-declared image settings through the existing asset URL resolver. No duplicate registry or generalized storage system was added.

Follow-up fixes: stale asset hashes return 409; oversize requests are drained without retaining excess bytes and return 413; the new property chooser tracks its own selection generation instead of the unrelated saved-Card capture epoch; managed Preview readiness probes obey their existing time budget even if an individual HTTP request stalls. Existing saved-Card capture safeguards are unchanged. The latter change prevents the retained overview's automatic Preview from waiting indefinitely; actual full application startup remains separately qualified.

No UI-Base or Data Services source edits, workspace package-link replacement, native-admission relaxation, Stage 4/production work, commit or push. No original shared-lock recovery/removal/reacquisition was performed. The original unresolved runtime-graph lock remains present; its read-only hash check was refused because another process holds the file. Its historical ownership qualification is retained, not requalified. See `preservation.json`. Superseded test process trees were stopped; normal development services were left running. Final test teardown closes its disposable servers, browsers and stores. Earlier disposable diagnostic targets remain ignored evidence outputs. Stage 2 tracked evidence regenerated by regression tests was restored from HEAD.

## Retained qualifications

- Local V1 development identities and separately granted test capabilities; no production identity, private-byte enforcement, public deployment or Stage 5/6 runtime-security qualification.
- Release evidence covers local presentation snapshots, frozen bytes, protected rollback and actual Vite asset emission. It does not claim a production public reader deployment.
- The legacy overview's automatic application Preview is not used as proof of asset correctness; its native upload form, protected records and version bytes are directly checked. Decoded Page Design Preview is directly verified for the Card journey.
- The historical unresolved shared-root lock attribution remains open. No exception has been broadened.
- The preexisting six missing UI-Base declaration-import diagnostics remain a broad client-typecheck qualification. The visual-artifacts package build succeeded earlier; no full client typecheck pass is claimed. The existing Data Services sourcemap warning persists.
- The existing normal-browser unsaved-draft Preview qualification is not reopened. One existing Stage 1 test remains skipped.
- Preparation errors, chooser-context refusals and diagnostic teardown timeouts from superseded attempts remain in historical result files. Final acceptance and regression reports are the authoritative results for this run.

## Inventory and stop

Exact repository changes and evidence SHA-256 values are in `evidence/v1-stage3-physical-20261105/changed-file-hashes.json`. Physical UI-Base tree files are separately covered by `package-closure.json`; application copies are covered by `application-package-inputs.json`. The inventory excludes its own self-referential digest and disposable ignored platform copies. Ignored browser-attempt diagnostics are listed separately in the same inventory.

**Stop at the Stage 3 Implementation Review Gate for explicit acceptance.** No acceptance, closure, commit, push or next-stage execution is implied.
