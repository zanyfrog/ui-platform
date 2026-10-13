# Application Composition + Presentation V1

Status: implementation complete; verification and changed-file inventory are recorded in
`application-composition-presentation-v1-verification.md`.

## Reuse review and architectural decisions

Application discovery/creation (`src/server/applications.ts`) already copies the complete
`templates/standard/files` tree, substitutes creation tokens, writes immutable identity
to `app.manifest.json`, installs dependencies, builds services, and commits by directory
rename. Keep this path and template location. `app.settings.json` is the presentation
integration point; identity and template provenance remain in the existing manifest.

The Application Manager and Builder already host a Visual Artifact editor. Pages and
Platform Components use HTML, CSS, metadata, fixtures, and optional functions bundles.
`VisualArtifactService` supplies source reads, aggregate checksums, stale-save rejection,
and Recycle Bin deletion. The editor supplies polling/reload, conflict blocking, and
recovery downloads. Shells extend these same formats/services and editor.

Visual Artifact layout wrappers, responsive metadata, bindings, conditions, repeaters,
public properties, slots, events and service actions already exist. Form-capable Platform
Components use that runtime and the existing application data adapters. Reuse them;
Heroes remain Package/Platform Components. No new Form or Hero lifecycle is needed.

UI Base packages provide layout/navigation/hero primitives and public styling hooks.
Installed Package Components are discovered by `component-registry.ts`; Platform
Components are discovered from `components/`. Existing runtime uses ShadowRoot per
artifact/instance. Application CSS must be deliberately supplied to Shell/Page roots,
while Component roots retain isolation and inherit only CSS variables/public hooks.

Architectural mismatch: `src/shared/presentation.ts` currently defines fixed public,
authenticated and minimal appearance shells, route-level selection, navigation derived
from routes, and a mutable draft/immutable published lifecycle. New composition is an
explicit settings opt-in, present in newly copied Standard Applications only. Existing
Applications keep their existing behavior. No broad migration is performed.

Route reuse decision: the accepted Visual Artifact Page runtime owns its route string
in `page.visual.json`. The older generic Artifact Route/RouteGroup definitions and
proof editor validate `artifact.json` path/Page references but do not drive that visual
runtime. Composition extends the accepted Visual Page source with a permanent
`routeId`; its primary Route record is derived from that Page's identity/path. There
is no second editable route table. Generic Route/RouteGroup editing remains unchanged.
This source-format adaptation is an architectural deviation from representing every
composition primary Route as a generic Artifact bundle; the two formats are not
silently converted or synchronized.

Development/editor previews use current saved source. Published presentation retains
the existing Publish boundary. Source authority does not authorize automatic production
activation. Composition must integrate with that boundary rather than create a second
publication system or silently replace the old runtime.

Assets already exist in presentation draft/active storage with semantic IDs and usage
guards. Composition assets are Application-owned source files. Existing asset APIs
continue serving legacy Applications; portable relative references are used for new
source assets. Templates may supply assets, which become independently owned copies.

`exporter.ts` copies the complete clean Application tree and vendors declared external
file dependencies. Composition files and relationships therefore travel together.
Blueprint artifact import/export in `packages/artifacts` is a separate typed-artifact
path: its accepted formats must not silently become a competing composition format.
Preserve the existing security export exclusions.

## Required semantics

- A Shell is an Application-owned Visual Artifact; fixed content is edited only there.
- Region IDs are explicit source attributes, unique within a Shell, with independent
  editable display names. Classes and existing conditions control presentation.
- Pages persist one Shell ID at creation, resolving the current default if omitted.
  Later default changes affect only new Pages.
- Missing Page region uses Shell defaults; an explicit empty region suppresses them.
- Shell changes retain matching region IDs; unmatched definitions require mapping or
  explicit discard. Structural Shell changes must not silently orphan Page content.
- Menus are Application source definitions, recursively nested with stable item IDs.
  Page/Route targets use permanent identities; route parameters resolve explicitly.
  Current state and ancestor activePath are distinct. Page overrides hide, disable,
  or add local items without changing the base Menu.
- Branding references Application assets. Tokens emit stable CSS custom properties.
  Cascade: package styles, theme, site CSS, Shell CSS, Page CSS, isolated Component CSS.
- Template updates compare raw source paths/checksums against recorded prior template
  provenance. Explicit Add/Keep/Replace only; no merging or deletion. The processed
  version records completed decisions, not equality with the template. Application
  identity and creation substitutions must survive replacements.

## Deferred scope

Application-scoped Component ownership/creation/management, automatic
migration/synchronization/merging, live inheritance, visual diff, external
assets, conditional Shell selection, aliases, production identity, new publication UI,
deployment, and broad Builder completion remain excluded.

## Source model and implementation

The Standard template is version 2.0.0. Its `files/` directory is the complete copied
Application, including package dependencies, services, Pages, Shells, Menus,
branding assets, site styles and development/build entry points. Creation resolves
identity/path substitutions once and records `template.provenance.json`; the copied
tree has no runtime dependency on its originating template. Existing Applications do
not receive the `presentation.model: composition-v1` opt-in automatically.

`app.settings.json` stores the default Shell ID, branding, Menu aliases, site stylesheet
paths, theme variables and optional per-Shell public property configuration. Shells
live in `shells/<name>/shell.{html,css,visual.json,fixtures.json,functions.ts}` and use
the existing Visual Artifact bundle format with `kind: shell`. Pages remain ordinary
Visual Pages under `src/pages`, adding permanent `shellId` and `routeId` identities.
Primary Routes are derived from those Page records. Name/path changes do not replace
the identities used by Menus. Route parameters support `:name` and `[name]` segments.

Regions are HTML containers with `data-uip-region` identity and optional
`data-uip-region-name`. Recommended IDs are `region-hero`, `region-main`,
`region-sidebar`, and `region-footer`; custom stable IDs are supported.
Other recommended IDs include `region-header`, `region-navigation`, and
`region-secondary`. Page Region containers retain ordinary classes, layout, bindings and conditions.
All supplied Regions share one Page state/data scope. Normal Platform/Package
Components, including Form-capable Components, can be inserted there. Shell defaults
remain Shell-owned content; Page structure and previews show fixed Shell nodes locked.
The editor adds Region insertion/removal/reordering, display-name/class edits, Menu
placement, and explicit Change Shell mapping/discard decisions. Source edits that
remove a Region used by a Page, and deletion of a default/used Shell, are blocked.

Menus live in `menus/*.json`, identified by `menuId`, with recursively nested stable
`itemId` entries. Destinations are Page ID, primary Route ID with explicit parameters,
HTTP(S) URL, or ordinary Visual Artifact Action arrays. Browser targets and disabled
states render through the shared runtime; Action items use the existing service/event
mechanism. Current state identifies the destination Page/Route and parameter values;
`data-active-path` marks its ancestor entries. Page `menuOverrides` can hide or disable
base items, or add local items under stable parent IDs, without mutating the base Menu.
Shell `data-uip-menu` placeholders accept a Menu identity or an Application Menu alias.
The management panel edits nested Menus and also exposes their normal JSON source.

The Public Shell provides a default UI Base Hero Component in its Hero Region. Hero
is ordinary content: developers can replace it, configure it through ordinary Component
contracts, omit an override to keep the default, or supply an empty Region to suppress
it. There is no special Hero lifecycle or runtime conditional Shell selection.

Branding contains Application/short names, primary/secondary logos and favicon paths.
Shell `data-uip-branding` hooks render these values. Assets live under `assets/`; binary
uploads preserve bytes and require the current checksum before replacement. V1 managed
paths use lowercase names with dashes and SVG/PNG/JPG/JPEG/WebP/ICO/PDF/TXT extensions.
External asset management is deferred. Asset references in runtime attributes and CSS
are resolved through the same development/production asset map.

Theme entries become validated stable `--app-*` custom properties. Package styles load
first, then Application theme/site CSS, Shell CSS, and Page CSS in their respective
runtime roots. Component instance roots retain existing Shadow DOM isolation and
inherit variables/public styling hooks; site/Page CSS cannot reach Component internals.
New composition Apps discover Package Components only from their installed/declared
dependencies, so preview and exported runtime agree. Legacy catalog fallback is kept.

## Ownership, updates and publication

Composition settings/Menu/style saves and asset uploads use checksum conflict checks.
Visual bundles retain the accepted aggregate-hash source-repair/recovery workflow.
Application mutations and Publish share an in-process lock. The source editor and
development Vite plugin read saved files directly, with dependency watching/reload.
Malformed source remains repairable in the editor but blocks workspace validation and
Publish. Files changed directly by an external process retain the existing checksum
conflict behavior; the lock is not a cross-process filesystem transaction.

Template update compares the complete clean source tree with the recorded prior raw
template checksums after creation substitutions. It shows new, different, unchanged,
Application-only and removed-template paths. Each new/different file needs an explicit
Add/Keep/Replace decision; removed-template and Application-only files are retained.
Application identity files must be kept. A comparison checksum rejects stale decisions.
Per-file provenance and the processed template version advance after all decisions,
including Keep. That version means reviewed/applied decisions, not file equality.
There is no automatic synchronization, merge, delete, or live template inheritance.

The existing Presentation Publish operation validates composition, copies source and
the referenced shared Component dependency closure into the existing immutable version
directory, then activates the existing manifest pointer. Development uses current files;
production builds require and use the active published snapshot. Later source saves do
not change that snapshot. The existing status displays source changes as draft changes.
Existing rollback restores the historical composition files for review and subsequent
Publish; Application-only files are retained. No second publication/version UI exists.

Package Components are package-owned/shared. Developer-created V1 Components are
Platform Components, available to Applications through the Platform catalog and existing
Platform Component editor. Application-scoped Component ownership, creation and
management are deferred. Applications have no editable Component collection or
Application Component endpoint. The Standard Public/Admin Pages both reference
`cmp_platform_composition-shared-help-reference`, owned under the Platform's
`components/composition-shared-help/` directory, rather than copying it from the template.

The referenced Platform Component dependency closure is frozen on Publish and copied
on portable export under `presentation/platform-components/` (inside the existing
composition snapshot for a published version). These distribution copies retain the
original Platform identities and ordinary Visual Artifact format. They are runtime
dependencies, not independently owned/editable Application Components, and are never
discovered by Component management. Development uses current Platform source; a
standalone portable distribution can resolve its frozen dependencies without access to
the originating Platform. Production uses only the published dependency snapshot.

Portable Application ZIP export preserves the composition source relationships, assets,
template provenance and referenced Component closure using the accepted exporter and
dependency vendoring. Generic typed Blueprint import/export remains unchanged. The
primary-Route adaptation described above is the explicit reuse adaptation; there is no silent conversion between generic Artifact
bundles and Visual Artifact bundles.

## Reference and review entry points

Run `npm run dev:composition-reference` to create/preserve the reference through normal
Application creation, then open Public `/`, Admin `/admin`, and its Application Manager
on the ports documented in `references/application-composition/README.md`. Both Pages
share one Component, use separate Shells/Menus, and demonstrate default versus empty
Hero semantics. Use Builder for Shell/Page/Region editing and the composition panel for
Menus, branding, tokens, source assets and explicit template update decisions.
