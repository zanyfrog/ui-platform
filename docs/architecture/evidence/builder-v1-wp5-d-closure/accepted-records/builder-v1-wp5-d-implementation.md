# Builder V1 WP5-D — Menu and Branding Authoring

## Authorization and review boundary

WP5-C C1–C5 is **ACCEPTED AND CLOSED** by user review. Its 446/446 UI Platform, 760/760 Data Services and 146/146 editor/storage evidence, builds, typechecks, production exclusion, browser records and unsuccessful history remain accepted. WP5-D implements the approved Menu and branding allocation only. **Stop at WP5-D implementation verification/review.** WP5-E is not authorized. D6 remains WP5-F subject to admission/locking architecture review; A37 remains WP6. All A01–A40 umbrella requirements remain unchecked.

## Native contracts and reuse

Application Menus remain schemaVersion 1 `ApplicationMenu` sources in `menus/*.json`. Page and Route destinations reference permanent native identities. Nested children, stable `itemId`, browser target, hidden/disabled flags, sibling order and existing actions retain their native representation. The existing composition validators, source ownership checks, protected management routes, expected hashes, graph lock and atomic source writer remain authoritative. No schema, authorization or expression engine is added.

The generic workspace retains one focused source and WP2 `EditingLifecycle`: captured editing authority, debounce/save, conflict handling, Undo/Redo, reload and recovery. Workspace Menu creation and asset upload are explicit management operations, separate from a focused artifact's permitted mutation. They capture the development identity and permanent Application owner and send the existing owner header. Upload preserves native replacement confirmation and expected hash. Ordinary writes still recheck current authority before mutation.

## Authoring controls

- Native Menu item dialogs select an existing Application Page or Route, or an HTTP(S) external URL. They do not request JSON or raw artifact IDs. Adding generates one stable item identity; edits and moves retain it. Existing declarative action destinations are preserved when editing their label/target; this package does not add an alternative action authoring engine.
- Each item dialog refreshes the authoritative composition choices. A retained Menu tab therefore discovers Pages/Routes created after the tab opened without discarding its working copy. The browser regression deliberately opens the Menu before creating its new destination Page.
- Parameter controls derive names from the selected native Route path. `Current route value` omits that key from `destination.params`; the existing renderer inherits it from the current route. `Literal value` writes a string, including an intentional empty string. The existing `routePath` encodes values once. There is no expression interpolation or additional binding syntax. Existing additional parameter keys are retained and identified. Choosing a different destination intentionally starts new destination bindings. Missing targets remain explicit and saves fail through native validation.
- Nested addition, sibling ordering, label/destination editing, show/hide, enable/disable and confirmed removal use the existing Menu tree controls. Cancellation does not modify the working copy. A source change during an open item dialog requires reopening the dialog rather than overwriting the newer source.
- Shell Menu placement now selects an existing Menu by name and writes the existing `data-uip-menu` declaration. Supported native image/text Shell nodes expose the existing `data-uip-branding` attribute. Application Page instances and package/shared Component definitions are not modified by these bindings.
- Branding selectors enumerate portable Application asset paths. Existing paths missing from the inventory remain visible as missing; the native source validator rejects missing selected assets. Upload remains binary storage through `saveCompositionAsset`, with no new asset registry or persistence format.
- Logo selectors offer supported image extensions only. An existing unsupported image reference stays visible with an explicit diagnostic label rather than being silently replaced; the general asset inventory still includes supported non-image assets.
- Theme selection uses the existing `presentation.siteStyles` stylesheet list; configuration edits the existing `presentation.theme` `--app-*` tokens. The standard installed Application template currently supplies `styles/site.css`; there is no named composition-theme registry to fabricate. These controls select actual available native stylesheets and expose existing configured tokens, not invented named themes or package capabilities. Existing custom styles and tokens remain in native source. WP5-F owns focused representative theme samples.

## Read-only source-choice adapter

`GET /api/apps/:key/composition-asset?list=1` returns supported asset and stylesheet paths from the existing Application source tree. It uses the existing `ui.presentation.view` management check. Paths pass the existing composition path contract, root containment and symlink checks; recursive asset enumeration skips symlinks. Unsupported filenames/extensions do not become picker candidates. The inventory is advisory; authoritative source/asset writes validate current existence, revision, owner and permissions. No schema change or runtime authority is added.

Asynchronous composition operations make the editor inert and explicitly disable input/select/textarea fields until completion. This prevents refresh/save races from accepting input that the existing busy guard would discard. Lifecycle save and source polling remain unchanged. Dialog choices are retained only if the originating source remains current and focused.

## Rendering, portability and boundaries

Public and Admin Shells use the same existing `mountCompositionPage`, `composeShellMenus`, `themeCss` and branding asset URL resolver. No renderer changes are needed. Native `copyCompositionSnapshot` preserves Menu/settings and exact asset bytes for portable snapshots. Design preview retains WP4/WP5-B nonpersisting restrictions; this package adds no data effects or service capabilities.

The browser journey uses native setup for local identity, grants and Application provisioning. It then authors Menus, route destinations, nested bindings, assets, theme and Shell placements through the actual Builder without source editing. This is subsystem evidence, not WP6 UI-only Application provisioning. Builder is closed before runtime startup; that sequence does not prove simultaneous-use reliability. No graph admission or locking guarantee is weakened or claimed resolved.

The accepted legacy Page-local Menu override/action source capabilities remain available; this package's UI-only Menu journey covers Application Menu authoring and Shell consumption. It does not claim a new Page-local action authoring interface. Installed package metadata limitations and the absence of a manifest-backed package Button remain as documented in WP5-B. Focused Menu/theme sample adapters remain WP5-F.

See [verification and unsuccessful attempts](builder-v1-wp5-d-verification.md) and [changed-file inventory](builder-v1-wp5-d-files.md). Historical C source hashes remain snapshots of the accepted C verification, rather than being rewritten after closure annotations.
