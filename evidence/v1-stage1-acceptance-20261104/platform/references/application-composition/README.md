# Application Composition reference

Run `npm run dev:composition-reference` from ui-platform. The launcher creates a real
Application from the current Standard template through the ordinary full-tree creation
service, including dependency installation. It preserves that Application on later runs.
Source lives in `<system temporary directory>/ui-platform-composition-reference-v1/apps/composition-reference`.
The launcher prints its absolute path. This stable local directory is reused across
runs and stays outside the repository's live source watchers. Windows locks prevented
the creation commit when installed files were staged underneath the watched repository.

- Public Page: http://127.0.0.1:5193/
- Admin Page: http://127.0.0.1:5193/admin
- Application Manager: http://127.0.0.1:5192 (select Composition Reference and open Builder)

The Public Shell supplies a default Hero and main navigation. The Admin Page explicitly
empties its Hero Region and uses a separate sidebar Shell/Menu. Both Pages render the
same Platform-owned `cmp_platform_composition-shared-help-reference` Component from
`components/composition-shared-help/` in the platform repository. It is available through
the existing Platform Component catalog/editor; the Application has no Component source
collection or Component creation capability. Its CSS has an isolated root.
Branding, token variables, site CSS and Shell/Page local CSS are Application source.

Use the Builder's Shell/Page Visual Artifact selector, Region tools and Change Page
Shell action. Fixed Shell nodes appear locked in Page structure and rendered preview.
The composition panel edits nested Menus, branding, tokens and site source with hash
conflict checks. Page menu overrides live in normal Page metadata.

Saved source changes are visible in development. Use the existing Presentation Publish
action before a production build. The build reads that immutable composition snapshot,
so later source saves do not silently change the published presentation. Referenced
Platform Components are frozen under `presentation/platform-components/` in the
published snapshot and portable export, retaining Platform identities. These are runtime
dependency copies and have no Application-scoped Component management endpoint.

The corrected reference uses a fresh directory so the previous review's generated
Application is not automatically migrated or overwritten.

The automated template-update test uses an isolated copy of version N, modifies it to
N+1, checks new/changed/removed items, applies explicit Keep/Replace/Add decisions,
and verifies customized assets, Application-only files and omitted files are retained.
It does not modify the official Standard template during verification.
