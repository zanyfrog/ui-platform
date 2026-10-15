# WP2 focused runtime reader design review

2026-10-15. The approved narrow approach is implemented through the existing Visual/Vite boundaries. Ordinary non-Visual Application helpers retain their shared Vite identities. Managed Visual roles are revision-pinned or blocked. This adds no persistence engine, Publish/version-history system or WP3 work.

## Loading and dependency boundary

The existing visualArtifacts and applicationComposition plugins now use revision-aware loading by default, without an unsafe opt-out. The compatibility revisionPinned:true option no longer selects a separate prototype. Existing generated Page entries are adapted in memory, including entries with an empty function role. Permanent filenames, identities and source formats remain unchanged.

RuntimeRevision captures HTML, CSS, metadata, functions and fixtures through Foundation, plus relevant directory inventories, composition settings, Menus and styles. Complete artifact/composition validation precedes compilation. Captured functions compile into the same aggregate. Checksums and inventories are rechecked before output becomes available. Recovery precedes mutable source discovery/capture. Published immutable source is read without creating development journals inside its directory.

A composed Page resolves through the same aggregate as its Shell and required Platform Components/Forms. Page/catalog redirects consume that aggregate rather than independently cached role imports. An internal content hash identifies the graph. Runtime guards reject mixed dependencies, substituted roles, cloned managed metadata and substituted composition definitions. Source metadata/composition data are frozen. Trusted Menu/Region projections are explicitly bound to their originating graph; ordinary per-instance state remains mutable.

## Shared helper contract

The compiler uses the actual Vite resolver and leaves ordinary helpers external to the captured aggregate. A real Vite SSR test proves Application code and a pinned Visual action share the same helper counter/state object. Unrelated helpers are neither duplicated nor pinned.

The boundary recursively audits static imports, re-exports and literal dynamic imports, including cached modules. Managed Visual-role edges are explicitly blocked. Computed imports, opaque virtual/remote loading, require/eval/Function and glob loading are rejected where edges cannot be established.

Instrumented calls, property access/assignment, constructors and resolved Promise payloads guard shared state. Visual context, callbacks, metadata, role values and DOM state cannot be retained there. Private top-level mutable caches and opaque state/accessors receive a specific diagnostic: move that state into the Visual function instance and pass ordinary data to the shared helper. Direct re-export as a Visual action requires a local wrapper so context is not implicitly forwarded. These are local unsupported patterns, not a blanket ban on ordinary helpers or blanket transitive pinning.

## Refresh and previews

Fresh HTTP root requests invalidate compiled roots and recheck current source/recovery despite cached module URLs. Both module resolution and HTTP middleware block raw managed roles and private .uib access, including Windows case aliases and orphan canonical role filenames.

Watcher events trigger bounded debounced validation/compilation before full refresh. A self-accepting watch module suppresses Vite's independent HTML reload fallback. Busy writes retry within a bounded interval. Invalid/recovery-required source emits an error while an existing valid reader may retain its prior render. New readers fail until current source is recovered/valid; failed candidates never become successful new revisions.

The Source inspector fetches a protected complete graph snapshot and compiles the same captured function bytes. Its code endpoint requires the exact selected hash. Imports needing the Application environment are explicitly unsupported in this isolated inspector; Current Preview uses the real Application Vite graph and shared helpers.

## Bounds and limits

Server compilations are transient, with no historical generation directory/map: 32 MiB capture, 1,000 source checks, 64 MiB compiled output. Browser role-value and identity registries are bounded (32 MiB role values, 10,000 entries). Exceeding limits requires preview reload. Active readers retain their valid ESM modules until their realm is disposed; cleanup never deletes source or an active reader's revision. Normal full refresh releases the previous realm.

Ordinary helper code retains normal Vite update semantics. Arbitrary filesystem readers, raw servers outside these plugins and custom plugins bypassing the guarded boundary remain uncoordinated. No whole-bundle filesystem atomic visibility is claimed.

The original mixed-role, cached-root and recovery counterexamples now run as prevention tests against default loading. A real browser test pauses a multi-role commit, proves the prior render remains, then observes only the complete new graph; failed rollback/recovery cannot become a valid new render. See [reader guarantees](builder-v1-wp2-reader-contract.md) and [verification](builder-v1-wp2-verification.md).
