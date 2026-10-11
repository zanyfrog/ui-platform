# Visual Artifact + Platform Component V1

## Implementation boundary

Pages and Platform Components use `@ui-platform/visual-artifacts` for their model,
HTML parsing, targeted source edits, expressions, validation and browser runtime.
`VisualArtifactService` supplies the same filesystem CRUD implementation for both.
The Builder exposes a shared Visual Artifacts editor above the existing Page
source inspector. Existing Page sources have not been moved or converted.

Core visual controls cover artifact creation/selection, structure inspection,
HTML/Package/Platform insertion, layout wrappers, reordering, local CSS, explicitly
declared public properties, installed component settings, basic bindings and
preview. Conditions, repeaters, events, named data sources, public slots, constraints
and optional functions are editable in their source files. A polished panel for
each declaration is deliberately outside this gate.

## Authoritative files and locations

Platform Components live in the repository's shared `components/<name>/` directory.
Pages remain in each application's `src/pages/<name>/` directory.

Each bundle has these normal source files:

| Component | Page | Purpose |
| --- | --- | --- |
| `component.visual.json` | `page.visual.json` | Identity, interface and declarative behavior |
| `component.html` | `page.html` | Authoritative structure, node IDs and component settings |
| `component.css` | `page.css` | Primary local stylesheet |
| `component.fixtures.json` | `page.fixtures.json` | Source-controlled preview inputs |
| `component.functions.ts` | `page.functions.ts` | Optional trusted named functions |
| — | `index.ts` | Ordinary application Page module importing these sources |

The metadata does **not** contain another visual tree. The editor derives its
structure from HTML each time it opens or refreshes the bundle. Component settings
are JSON in the element's `data-uip-settings` attribute. Bindings and layout
declarations identify HTML nodes by `data-uip-node`.
For canonical package settings, ordinary source attributes are also read into the
settings inspector and validated. Explicit JSON settings override matching attributes;
the renderer does not reapply an overridden attribute after constructing the component.

Metadata schema version is `1`. An artifact has an `art_...` identity, kind, name,
display name, optional description, state, sources, bindings, conditions,
repeaters, event bindings, layout, on-load actions and dependency references.

A Page adds a route and optional development-only metadata. A Component adds a
`cmp_platform_...` identity and public interface; it cannot declare a route.
Identity and kind changes are rejected by editor saves of parseable metadata.
Renaming a folder or display name retains identity. New Components receive UUIDs.
The reference artifacts use fixed source-controlled IDs for reproducible tests.

## Package Components

The package adapter retains the complete current installed Component Definition,
including `identity.componentId`, settings, runtime contract and interaction rules.
It overlays canonical `ui.component.json` entries on Platform package manifests.
Installed UI Base web packages are also discovered from application/platform
dependencies because they do not have Platform service manifests. Explicitly
disabled application declarations remain disabled.

Canonical Components are referenced by their permanent ID. Runtime construction
delegates to UI Base's real `renderComponentInstance` and `ComponentRegistry`.
There are no copied component implementations, saved package revisions or package
migrations. The current definition validates saved settings at open/validation;
the package renderer validates effective bound values at runtime.

Some existing UI Base components, including Heading, still have legacy manifest
entries. These retain the existing registry ID `package-name:tag-name` and are
rendered as their installed custom element. They have only the contract information
their package currently declares. Card is the canonical reference. Converting
legacy package definitions is deferred rather than inventing new permanent IDs
or changing UI Base in this work package.

The API bundles installed browser modules and their imports before serving them.
This repairs the existing preview path's unresolved bare browser imports. The
bundles are build outputs of installed source, not another editable representation.

## Public interface and composition

Properties are explicit and support string, number, boolean, object and array.
Contracts support required/default/enum and simple numeric/string bounds. Object
contents are developer data; V1 does not add a recursive schema language.
Events declare named payload fields and their contracts. Slots have explicit names.

Platform instances use `<uip-component data-uip-component="cmp_platform_...">`.
Static public values use `data-uip-settings`; dynamic public values use metadata
bindings targeting `property:<public-name>`. Parents cannot target an internal node
because internal source and IDs are absent from the parent's tree. The validator
rejects nonpublic nested property/event/slot references. Opening the Component's
own source is how its internals are edited.

`<uip-slot name="footer">` defines a public region with optional fallback content.
Parents provide ordinary source children with `slot="footer"`. Native slot
projection supports nested Components and package slots. Projected markup belongs
to its authoring parent. Public events are emitted from the instance host; declared
internal/package events and common native UI events stop at the artifact root.
These are authoring boundaries, not a sandbox against trusted developer code.

Pages cannot be nested. Direct and indirect Component dependency cycles are
rejected with a dependency path. Pages alone supply top-level routes.

## Layout and CSS

Insertion creates real `.uip-layout-item` elements with stable source IDs around
ordinary HTML and Package/Platform Components. IDs are local to an artifact and
are independent of application HTML IDs and runtime instances. Reordering changes
source ranges and retains IDs. Layout belongs to wrappers; settings belong to
their contained components.

Declarative layout supports width, height, margin, padding, grid/flex placement,
alignment, gap and display/visibility. Base rules apply on desktop; tablet rules
apply at widths up to 1023px; mobile rules apply up to 639px. Advanced responsive
rules remain ordinary CSS. Wrapper removal is preserved and reported as limited
manual layout. Manual nested text/semantic markup needs no wrappers.

Every artifact instance has its own shadow root. The primary CSS and responsive
wrapper rules are installed inside that root. Page selectors cannot penetrate
nested Component roots, and identical Component instances have independent local
styles. CSS variables and inherited theme values retain normal web semantics;
authors can explicitly bind public properties to `style:--variable` hooks. This is
selector encapsulation, not a security boundary or a global styling editor.

## Data, state, expressions and events

Named namespaces are `public`, `local`, `route`, `context`, explicit named sources
and repeater aliases. Sources can contain fixture/default data or reference a
caller-supplied service adapter. Fixtures override source values only in preview.
Unresolved service references produce an understandable nonexecutable-adapter
warning. The runtime does not invent Dataset, DOE, Workflow or Trigger definitions.

Expressions are named paths, literal values, or small `not/eq/and/or` declarations.
They do not evaluate arbitrary strings as JavaScript. The existing foundation
compiler's expressions are not a browser evaluator, so V1 adds this deliberately
small shared browser-safe evaluator instead of importing server execution code.

Bindings target text, attributes, properties, canonical package settings or local
CSS variables. Conditions include/exclude a subtree. Repeaters specify collection,
item alias, optional index alias and an existing source subtree. Repeated instance
state is retained by source node plus array index; keyed reconciliation is deferred.

State is cloned for each instance and can change only through explicit behavior;
there is no implicit Dataset persistence. Event actions set state, emit a declared
event, request navigation, invoke an existing named service, or call a named trusted
function. Public payloads are checked before emission.

Applications supply service functions that call existing clients, for example:

```ts
services: { 'dataset:customer-count': () => applicationDataClient.count('customers') }
```

Browser tests exercise the real `ApplicationDataClient` session transport at this
adapter boundary. They use deterministic HTTP responses, not a production Dataset.
The existing protected DOE/ORM integration tests remain the security/data authority.
No Workflow/Trigger execution adapter is added; absent adapters stay explicitly
nonexecutable.

Custom functions receive public values, local state, their own shadow root, the
current event, `setState` and `emit`. They are trusted application code with normal
browser permissions. V1 does not install a sandbox or grant server filesystem or
database access. Declarative behavior is preferred; the reference needs no custom
function. Preview transpiles the function companion through the existing TypeScript
compiler. Dependency-importing function modules should use the application's normal
bundler; resolving arbitrary function imports in editor preview is deferred.

## Runtime, application builds and preview

`mountVisualArtifact` is the single renderer for both kinds of artifact. It renders
ordinary source HTML, real registered Package Components and recursively mounted
Platform Components. Nested state survives parent renders. Event listeners are
replaced rather than accumulated when nested hosts are reused.

`createVisualPage` bridges this renderer into existing Page routers that expect a
`render(context)` function returning HTML. The Page entry exports its metadata
route and title. Application routers should honor the exported route when it differs
from their filename convention.

The `visualArtifacts` Vite plugin discovers Component metadata and emits ordinary
source imports into `virtual:uip-visual-artifacts`. It validates discovered
Components and dependencies, watches changes and invalidates the normal build.
It never copies source into an editor database or writes generated runtime source.
Configure it once in an application's Vite config, point it at the shared Component
folder and the application's installed package component manifests, and include
`@ui-platform/visual-artifacts/client` in TypeScript's types. The reference config
and Page entry show this integration. Existing application build configs are not
silently rewritten.

Editor preview runs in an iframe, loads the application's installed package modules,
loads optional function companions, and mounts the same artifact runtime. Inputs
are editable in the fixtures source file (`public`, `sources`, `context`, `route`).
Navigation is observed by the preview adapter; ordinary application navigation is
supplied by the application router. There is no component-specific preview renderer.

## CRUD, manual edits and diagnostics

The file service constrains locators to its Page/Component root, rejects symlink
bundle paths and writes through the existing atomic text writer. A checksum covers
all companion files. Saves require the checksum and are serialized per artifact.
Each changed file is committed separately; a multi-file editor save reports failures
and retains remaining dirty files rather than pretending the whole bundle committed.
This is optimistic concurrency, not collaborative editing or a filesystem lock
against an arbitrary external writer changing the file during the final rename.

The existing workspace watcher also observes shared Components. The visual editor
listens for workspace events and polls as a fallback. Clean work reloads automatically.
Dirty work plus a changed disk checksum enters conflict state and disables Save.
The user may reload/discard or download all unsaved files as a recovery JSON document.
The editor never automatically restores recovered work over disk source.

Offset-based source edits touch only selected opening tags or managed layout ranges.
Comments, manual markup and script/style regions elsewhere are retained. Unmanaged
regions remain visible in structure inspection. Ambiguous/unbalanced HTML blocks
visual source mutation until repaired, while raw source remains editable/savable.
Common optional end tags are retained as manual regions while managed markup elsewhere
remains editable. Managed HTML uses explicit end tags; this conservative parser is not a full HTML5,
JSX or arbitrary templating-language parser. Existing arbitrary TS/TSX Pages stay in
their original source editor; they are not silently converted.

Invalid artifacts can be opened and saved for repair. Invalid Components are excluded
from insertion; impossible rendering is blocked with diagnostics. Deletion checks
known source bundles across applications and shared Components, refuses known
references, and moves eligible dedicated bundle folders to the OS Recycle Bin.
Arbitrary dynamic references in legacy code are outside this bounded reference scan.

When V1 development authorization is enabled, Page operations retain Page permissions;
shared Component writes require the new platform-scoped `ui.platform.component.admin`
permission. Strict fixture-editor mode retains its existing denial of legacy
management routes; this work does not bypass that security boundary.

## Reference and verification

`components/customer-summary-card` demonstrates HTML, Card, Heading, local CSS,
public object/boolean inputs, an event payload, footer slot, state, a condition and
an event binding. `components/customer-list-item` proves nested encapsulation, slot
projection and event forwarding. The development-only Page in
`references/visual-artifacts/src/pages/customers` demonstrates a route, direct Card,
nested Components, fixture data, repeaters, state/event handling and responsive layout.

Run `npm run build`, then `npm run dev:visual-reference` and open
`http://127.0.0.1:5188/customers`. To inspect the reference application through the
Platform Builder in local development, set `UI_APPS_DIR` to this repository's
`references` directory before launching the Platform. Shared Components remain in
the repository's `components` directory.

Automated verification and exact changed files are recorded in
`visual-artifact-platform-component-v1-verification.md` and
`visual-artifact-platform-component-v1-files.txt`.

Publication/version selection, application-scoped Components, promotion,
collaboration, automatic dependent rewrites, broad UI Base migrations, full Form or
Workflow/Trigger editors, a general IDE and full Builder completion remain deferred.
