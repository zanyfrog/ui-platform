# V1 Page Builder — Multi-Page Website Authoring Review Gate

2026-10-28. Read-only functional assessment following anchor-navigation acceptance. No implementation or browser qualification performed.

## Smallest practical workflow

Create Home at `/home`, About at `/about` and Contact at `/contact` through the existing Page creation controls. Save each Page, insert ordinary links in each Page, choose another saved Page as the destination, then Save/Reload. Open the admitted website at `/home`, follow Home → About → Contact → Home, reload a direct `/contact` URL, and use Back/Forward. Use explicit paths initially; a `/` alias can select Home in the host without changing Home's identity. Shared Shell navigation is unnecessary for three Pages.

## Existing contracts and gaps

| Contract | Evidence and implication |
|---|---|
| Page routes and identities | `src/client/visual-artifacts/editor.ts` requests a route on Page creation. `src/server/visual-artifacts.ts` stores metadata.route and generates a Page module exporting route and render. Save protects artifactId and existing routeId. Retain these identities; a route is a public address, not an identity. Route uniqueness and canonical-path admission across Pages need explicit verification before implementation. |
| Literal links | The ordinary inspector edits href through the shared source mutation path. Keep literal HTML such as `<a href="/about">About</a>` authoritative. Add a small saved-Page destination choice next to the existing control, deriving choices from the existing workspace listing and writing the chosen route into href. No persistent reference registry is needed. Existing URL safety validation remains in force. |
| Admitted host | The disposable `v1-normal-smoke-20261026-01/ui-platform/references/visual-artifacts-host-20261028/src/main.ts` imports only the anchor Page, matches its route or `/`, uses pushState in navigate and remounts on popstate. Three explicit Page imports and a unique route lookup are sufficient for this bounded workflow; do not introduce dynamic discovery or broaden loader admission. |
| Shared runtime | `packages/visual-artifacts/src/runtime.ts` exposes navigate and passes the host adapter through createVisualPage. Declared navigate actions use it, while ordinary click handling currently covers only literal fragments. Add narrowly opted-in interception of eligible same-origin Page-path links through the existing adapter. Preserve modifier keys, external links, download/target semantics and the accepted fragment behavior. |
| Saved Design Preview | `src/client/visual-artifacts/preview.ts` mounts the selected saved artifact and its navigation adapter logs requests. An iframe path `/about` cannot simply load the Builder application route. A bounded saved-Page resolver must load the destination through existing authorized saved Preview reads, mount it inside the iframe and maintain an iframe-owned logical Page URL/history. Preserve the Builder parent's URL and saved-only semantics. This is a separate gap from working website navigation. |

## Minimum proposed changes

1. Derive a small route-to-saved-Page view from existing workspace metadata. Admit unique canonical root-relative Page paths for this increment, reject missing/ambiguous destinations, and expose the Page choice in ordinary href controls. Keep arbitrary external URLs under existing policy; do not reinterpret them as managed references.
2. Validate newly introduced or changed managed Page links on ordinary Save against the same application Page set. Keep existing legacy links readable without silently rewriting them. Establish how the existing serialized mutation boundary prevents validation racing destination removal before claiming removal safety.
3. For Page deletion or route changes, scan current saved Page HTML for incoming literal managed paths and refuse if surviving references remain, reporting the referring Page/link. Require authors to repair links first. Do not cascade rewrites or create a general dependency framework. Draft links get revalidated on Save; saved-reference protection alone cannot promise protection of every open draft.
4. Register the three saved Pages explicitly in the disposable host and handle eligible literal clicks through the shared navigation adapter. Resolve before pushState so missing destinations do not create false successful entries. Back/Forward must remount without pushing another entry. Define fresh Page navigation as top-of-Page with focus at the Page heading/main target; verify history scroll restoration and focus after mount. Keep same-Page fragments on the accepted path. Cross-Page fragments can remain outside this first increment.
5. Add saved Preview destination resolution and iframe-only history, including popstate and disposal of the previous runtime. Reuse authorized saved reads and existing integrity/admission checks; never call recovery reads or expose recovery state to the website host. A Preview-specific logical route encoding must be defined before implementation so direct reload resolves the same saved Page without navigating the Builder parent.

## Proposed review evidence

Demonstrate ordinary creation, destination selection, Save/Reload and stable identities for all three Pages; matching saved/Preview revisions; mouse and Enter navigation in website and saved Preview; direct website loads/reloads; Back/Forward without duplicate entries; iframe history with unchanged Builder URL; rejected missing/duplicate routes and destinations; deletion/route-change refusal with incoming links; and unchanged accepted anchors. Verify host input qualification and preservation using the existing inventories. Do not claim production, arbitrary routers, cross-Page fragments, Shell/Region navigation, restricted Preview or deferred unsaved-draft Preview protection.

Recommendation: authorize only this bounded end-to-end three-Page increment after resolving canonical route admission, Save/delete serialization and the iframe logical URL contract. No implementation, commits or pushes are authorized by this assessment.

Stop: **V1 Page Builder — Multi-Page Website Authoring Review Gate**
