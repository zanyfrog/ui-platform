# V1 Design Preview Button — acceptance closure

Date: 2026-10-27. Decision: **ACCEPTED AND CLOSED — V1 Design Preview Button**, as explicitly directed by the user.

Acceptance is limited to the submitted placement, reveal/focus and loading/completion/error-feedback correction to the existing design iframe. The accepted evidence is documented in [the implementation and verification report](v1-design-preview-button-20261027.md), with its [exact inventory](v1-design-preview-button-files-20261027.json). This addendum closes that review gate without rewriting its historical report, raw attempts, tests, screenshots or inventories.

The evidence establishes normal-session saved Card rendering visibly in Chrome and the documented scoped Card/Panel, unsaved-draft and failure-feedback fixture results. It does **not** accept a complete normal-browser multi-component Page workflow, broader Card/Panel workflows, restricted Saved Preview, production activation, D6, WP5-F or unrelated architectural work.

Closure-time preservation check: 486 hashed inventory entries were checked; 484 match. The original and disposable `editor.ts` now both have SHA-256 `0df13c562132b249fb29b25dd0e6a2deb8a67dc26da63b632e6c9fd66ea58be6`, differing from the submitted snapshot `373817170ea7f0acd4897b50a02a82ee7dd2a384f6afcf02e7cea2125250bd31`. The difference is already-present workspace polling/focus-refresh scheduling and corresponding listener cleanup. The accepted source snapshot remains intact under the final run's `inputs` directory. These later changes were neither made nor reverted by this documentation task and are not included in this narrow acceptance. Historical evidence and inventories were not rewritten to absorb them.

The existing saved Page and HTML-first component-instance ownership remain preserved. Application/session authorization, expected saved hashes, source validation, accepted recovery-refusing read contracts and existing rendering remain unchanged. No new code, Page edits, server startup, Windows token/VM/WinPE activity, recovery, commits or synchronization is authorized or performed by this closure.

Next-increment planning is recorded separately in [the remaining V1 Page Builder assessment](v1-page-builder-remaining-assessment-20261027.md). It is a proposal only; implementation requires separate authorization.
