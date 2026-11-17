# Application Composition uploader (Pilot 2B)

The existing `@ui-base/assets` file dependency remains
`file:../ui-base/packages/ui-base-assets`, version `0.1.17`. The installed junction
points to that sibling package. No installation or lockfile change is needed.

The linked integration UI-Base worktree receives only the four-file patch from
accepted UI-Base commit `c339f5f3ab1dba554cdef81ab1eb8e02ab76d8d3`:

- `packages/ui-base-assets/src/components/uib-asset-uploader.js`
- `packages/ui-base-assets/src/metadata.js`
- `packages/ui-base-assets/README.md`
- `packages/ui-base-assets/test/uib-asset-uploader.test.js`

Reproduce from the pre-Pilot-2A sibling package by applying that commit's diff
against its first parent, restricted to these paths (`git diff <commit>^ <commit>
-- packages/ui-base-assets`, then `git apply` in the sibling worktree). All four
resulting files match the accepted commit's blob bytes. This is an uncommitted
source overlay, not a merge, version upgrade, or publication. Carry it alongside
the Platform changes until a separately authorized dependency checkpoint is made.
Unrelated Forms and layout work is not part of this overlay.

Composition uses `mode="minimal"`, `heading="Upload Application asset"`, `embedded`
and the existing upload policy before attachment. No configuration changes occur
after selection. The component owns file selection and upload/validation events;
Platform owns destination paths, captured transport authority, confirmation,
expected hashes, cancellation feedback and workspace refresh.

Leave the destination blank for an automatic `assets/images/<sanitized-file-name>`
path. It is derived when Upload is pressed, since Pilot 2A exposes the file in its
upload request rather than a public selection-change event. A typed destination
is retained; clearing it returns to automatic naming. Subsequent file uploads in
automatic mode derive a fresh destination. The image chooser is unchanged.

Focused DOM tests use the real linked uploader and in-memory transport doubles.
They do not qualify browser file-picker behavior or protected backend end-to-end
authorization. The protected upload function and server implementation are unchanged.
