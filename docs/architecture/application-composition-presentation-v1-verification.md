# Application Composition + Presentation V1 verification

Verification date: 2026-10-12. Scope correction: Application Component ownership removed.
Review gate: **APPLICATION COMPOSITION + PRESENTATION V1 READY FOR FINAL ACCEPTANCE**.

## Component ownership correction

- Removed Application Component creation, editing routes, catalog discovery, preview
  endpoint routing and ownership from composition source/snapshot inputs.
- Removed `templates/standard/files/components/shared-help` entirely. Public and Admin
  now reference the same Platform-owned `cmp_platform_composition-shared-help-reference`
  under `components/composition-shared-help/` in the platform repository.
- Publish/export still copy the referenced Platform Component dependency closure, with
  original identities and the existing Visual Artifact format. Frozen distribution
  copies live under `presentation/platform-components/`, inside the existing composition
  version for Publish. They have no Application Component catalog or management API.
- Development resolves Platform-owned source; production resolves only its published
  dependencies; portable source can resolve its exported dependency copies.
- Application-scoped Component ownership/creation/management is explicitly deferred.

Updated real API/browser checks prove the absent creation button and GET/POST endpoint,
absence of a template/Application Component folder, ignored manually placed unsupported
Application Component files, identical Platform references in both Pages, real rendering
in separate Shells, and preserved identities in actual Publish and downloadable ZIP
export. Unit coverage retains transitive closure/fingerprint/frozen-source checks.

## Automated checks

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed: client, server, visual runtime, platform core and generic Artifact types |
| `npm run build` | Passed: packages, production client and server |
| `npm run check:editor-contracts` | Passed: 13 files, 106 tests; contract declarations and generated documentation checks |
| `npm run check:editor-production` | Passed: production client excludes editor fixture/session/control transport |
| `npm run test:visual-browser` | Passed: 10 accepted runtime/editor/Form/Package Component browser checks |
| `npm run test:composition` | Passed: build, 9 unit/integration tests and real API/browser Application flow |
| `npm test -- --maxWorkers=1 --testTimeout=15000 --sequence.shuffle --sequence.seed=112` | Passed after ownership correction: 46 files, all 288 tests; 99.10 seconds, no retries |
| `git diff --check` | Passed; only Windows line-ending notices |

All checks in the table were re-run after the Component ownership correction. The
composition check additionally exercised actual Publish/ZIP export of the shared
Platform Component and the absence of Application-scoped Component management.

Vitest's temporary-cache rename fails with EPERM inside the restricted sandbox, before
tests execute. Test commands above ran with approved local execution outside it. Initial
default-concurrency runs also exceeded existing time budgets; the complete suite uses
one worker and a 15-second default timeout. Assertions and existing explicit test
timeouts were not changed. Earlier runs with two workers passed 285 of 287 tests with
two timeouts; the subsequent one-worker run passed all 287 before the additional shared
Component closure test was added. A later run was interrupted by concurrent reference
creation triggering repository-wide browser reloads; that reference was moved outside
the watched tree. Two subsequent full runs hit an EPERM directory-rename race in the
unchanged generic Artifact watcher test, including one run with a test retry. The
watcher suite passed all five tests in isolation. The final complete run used the
reproducible shuffled order above and passed all 288 tests with no retries. The
post-correction run repeated that command and again passed all 288 tests, including
the watcher test, Trigger/Workflow browser checks and the Component closure test.

The composition test creates a real new Application with the Standard template, runs
normal dependency installation and service build, and verifies:

- Complete source-tree copying, permanent Application/template identity and provenance.
- New Pages persist the resolved default Shell; later default changes affect only new
  Pages. Stale settings/source saves fail.
- Shell changes fail until unmatched Regions receive explicit mapping/discard decisions;
  matching content survives. Used/default Shell deletion and destructive Region edits
  are blocked.
- Asset uploads preserve binary bytes and reject replacements with stale/missing hashes.
- Absent Region uses Shell default; empty Region suppresses it; supplied content replaces
  it. Page Regions share state, normal events and service actions.
- Nested Menus, browser targets, Page/Route/URL/Action destinations, current/activePath,
  hide/disable/add overrides, branding, Shell configuration, theme/site/Page styles and
  Component CSS isolation.
- Actual Page editor displays rendered Shell context with locked fixed nodes; actual
  Shell editor uses the accepted Visual Artifact editing/preview path.
- Copied Public/Admin Pages use separate Shells/Menus and the same shared Platform Component.
- Existing Publish freezes source; later source changes appear in development while
  production build still renders the published version.

Unit integration tests additionally exercise renamed Region labels with stable IDs,
collision-free remapping, stale Visual Artifact saves, template N to N+1 comparison and
explicit Add/Keep/Replace with no deletion, processed-version advancement after Keep,
unchanged binary assets, independent snapshots, and transitive shared Component closure
copying/fingerprinting without unrelated Components.

The accepted repository suites cover existing Visual Artifacts, Form/Dataset data flow,
Trigger/Workflow runtime/browser behavior, generic Artifact contracts, management
permissions, presentation lifecycle, export/security exclusions, and Windows storage.

## Reference

`npm run dev:composition-reference` was smoke-tested and starts the Manager on 5192,
Application on 5193, and API on 4092. A reference was created through normal creation at:

`C:\Users\zanyf\AppData\Local\Temp\ui-platform-composition-reference-v1\apps\composition-reference`

The launcher preserves it. This location avoids a reproducible Windows rename lock
under the actively watched repository; the initial repository-local creation attempts
were cleaned by the existing failed-creation cleanup. The tracked source of the
reference is the Standard template plus its documented launcher, rather than a second
diverging copy. The corrected reference uses a fresh directory and preserves the
previous review's generated Application without automatically migrating it. Browser
verification uses isolated temporary Applications instead.

## Scope and review notes

Existing Applications remain on their accepted presentation model. Composition opts in
through newly copied settings. No broad migration, template inheritance, automatic
overwrite/delete, new publication system, deployment or later Builder work was done.

Primary Routes adapt the existing Visual Page format with permanent route identities;
generic Route/RouteGroup bundles remain unchanged. Package Components remain package-owned
and developer-created V1 Components remain Platform-owned. Application-scoped Components
are deferred. Referenced Platform Components travel with Publish and portable export as
frozen runtime dependencies, retaining their existing format/identities. These reuse adaptations and V1 source/path constraints are documented
in `application-composition-presentation-v1.md`.

Windows can retain the native Vite build library until the test process exits, preventing
immediate temporary-fixture removal. The browser runner reports such a retained fixture;
it does not alter the source or published outcome. No generated build output, installed
reference dependencies, or test fixtures are part of the tracked implementation.

The added real ZIP export check initially failed because a PowerShell 7 host's inherited
module search path prevented Windows PowerShell from loading its archive module. The
test's API subprocess now lets Windows PowerShell resolve its own module path. Exporter
behavior was preserved; the corrected environment passed real archive/download checks.

## Exact changed-file inventory

Repository-relative paths: M = modified, A = added. Generated/ignored output is excluded.

```text
M package.json
M packages/visual-artifacts/client.d.ts
M packages/visual-artifacts/src/index.ts
M packages/visual-artifacts/src/model.ts
M packages/visual-artifacts/src/runtime.ts
M packages/visual-artifacts/src/validation.ts
M packages/visual-artifacts/src/vite.ts
M src/client/builder.ts
M src/client/main.ts
M src/client/visual-artifacts/editor.ts
M src/client/visual-artifacts/preview.ts
M src/server/app-manifests.ts
M src/server/application-presentation.ts
M src/server/applications.ts
M src/server/component-registry.ts
M src/server/exporter.ts
M src/server/index.ts
M src/server/v1-management-routes.ts
M src/server/visual-artifacts.ts
M src/shared/types.ts
M templates/standard/files/app.settings.json
M templates/standard/files/package.json
M templates/standard/files/src/main.ts
M templates/standard/files/src/pages/index.ts
M templates/standard/files/tsconfig.json
M templates/standard/files/vite.config.js
M templates/standard/template.json
A components/composition-shared-help/component.css
A components/composition-shared-help/component.html
A components/composition-shared-help/component.visual.json
A docs/architecture/application-composition-presentation-v1-verification.md
A docs/architecture/application-composition-presentation-v1.md
A packages/visual-artifacts/src/composition-runtime.ts
A packages/visual-artifacts/src/composition-vite.ts
A packages/visual-artifacts/src/composition.ts
A references/application-composition/README.md
A scripts/dev-composition-reference.ts
A scripts/test-application-composition.mjs
A src/client/visual-artifacts/composition-manager.ts
A src/server/application-composition.ts
A src/server/composition-lock.ts
A src/server/composition-snapshots.ts
A src/server/template-updates.ts
A templates/standard/files/assets/branding/logo.svg
A templates/standard/files/assets/documents/.gitkeep
A templates/standard/files/assets/icons/.gitkeep
A templates/standard/files/assets/images/.gitkeep
A templates/standard/files/menus/admin.json
A templates/standard/files/menus/main.json
A templates/standard/files/shells/admin/shell.css
A templates/standard/files/shells/admin/shell.html
A templates/standard/files/shells/admin/shell.visual.json
A templates/standard/files/shells/public/shell.css
A templates/standard/files/shells/public/shell.html
A templates/standard/files/shells/public/shell.visual.json
A templates/standard/files/src/pages/admin/index.ts
A templates/standard/files/src/pages/admin/page.css
A templates/standard/files/src/pages/admin/page.html
A templates/standard/files/src/pages/admin/page.visual.json
A templates/standard/files/src/pages/public/index.ts
A templates/standard/files/src/pages/public/page.css
A templates/standard/files/src/pages/public/page.html
A templates/standard/files/src/pages/public/page.visual.json
A templates/standard/files/styles/site.css
A tests/application-composition.test.ts
A tests/browser/application-composition-live.html
A tests/browser/application-composition.html
A tests/browser/application-composition.ts
```
