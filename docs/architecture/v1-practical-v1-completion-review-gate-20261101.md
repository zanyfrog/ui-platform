# V1 Page Builder — Practical V1 Completion Review Gate

2026-11-01. **Read-only assessment. No implementation, deployment or new browser qualification.**

The accepted authoring loop supports a bounded useful website. The largest remaining completion gap is a supported, authorized way for its intended audience to access it outside the disposable Preview workflow. Recommend one bounded **single-site audience-delivery pilot**, beginning with a delivery-contract review, rather than another isolated editor feature or a general hosting platform.

## 1. Implemented and accepted

| Ordinary-author step | Established capability | Boundary |
| --- | --- | --- |
| Create website | Existing Application creation/onboarding, presentation configuration, shared Shell/Menu/branding and default Shell contracts. | Development onboarding and configured disposable-site evidence exist; a fresh nontechnical website setup journey is not newly qualified here. Security setup remains an explicit authorized operation. |
| Create Pages | Explicit plain Pages, composed Pages, permanent Page/Route identities, shared defaults and explicit Page-owned Main Content. | Supported routes, dependencies and Region containment remain bounded. |
| Add content/images/links | Managed headings/paragraphs/sections, leaf text, existing Application-image chooser and named eligible saved-Page destinations; corrected late text offsets. | Own-file browser upload remains unqualified; native Component settings and shared content retain separate authorities. |
| Style | Local appearance controls, individual Reset, Page CSS ownership and wrapper layout at existing responsive breakpoints. | Conservative CSS grammar and Page-owned targets; no universal design system or generic native-internals styling. |
| Save | Save Now, existing autosave, validation/conflict handling, Undo/Redo, Reload and recovery. | Cooperating-writer serialization is not multi-artifact atomicity or exclusion of unrelated filesystem writers. |
| Preview | Saved-only plain/composed rendering, decoded images, computed styles, readable status and editing/displayed Page context, confirmed Page-bundle hashes. | Native iframe Reload and other closure qualifications persist; hashes do not certify all dependencies/assets. |
| Navigate | Eligible saved-Page links, shared Menu, supported history/focus/scroll behavior, iframe location isolation. | Accepted disposable host and admitted routes only. |
| Reach audience | Export, development runtime and presentation-publication facilities exist in source. | Complete audience-facing website delivery is not established by these authoring acceptances. |

Evidence basis: [development onboarding closure](builder-v1-wp0-development-onboarding.md), [multi-Page closure](v1-multi-page-website-authoring-closure-20261028.md), [shared-composition closure](v1-shared-website-composition-closure-20261030.md), accepted guided-content/image/appearance reports, and the [Saved Preview closure](v1-saved-preview-status-navigation-context-acceptance-closure-20261101.md). This assessment reuses those records; it does not repeat historical investigations.

## 2. Genuine practical blockers and remaining friction

**Audience delivery is the completion blocker.** An author needs a supported destination, an explicit audience/access model, a clear distinction between saving and releasing, and a way to verify what readers actually receive. A local Builder iframe or disposable host URL does not establish this outcome. This is a qualification/operational gap, not proof that all underlying export/runtime code is absent or defective.

**The first-time website setup journey needs a bounded demonstration.** Application creation, identity/permission setup, presentation defaults and Shell/Menu configuration exist, but the recent successful workflows begin in a configured Application. Before claiming ordinary-author completion, demonstrate an authorized fresh Application through one small website without manual source or policy repair. Do not label this a demonstrated setup defect or redesign accepted onboarding without evidence.

**Bringing an author's own image remains an end-to-end evidence gap.** Existing-image placement works. A text-only site or a site using already admitted images can proceed; a promise that every author can upload their own image cannot yet be made. Browser upload must be qualified through the existing path, without changing its security environment. It is required for that product promise, not for every possible V1 site.

Other friction is genuine but currently nonblocking: advanced repair/source operations compete with ordinary editing; selected element versus layout wrapper versus shared Shell requires understanding; conservative async controls sometimes require reselection after source/save context changes. Improve these only when a small author walkthrough demonstrates a concrete obstacle. The accepted Preview increment resolves the previously highest-ranked freshness/context gap; it should not be reopened for polish alone.

## 3. Moving from Preview to an authorized hosted/published website

Source inspection confirms existing pieces rather than an empty slate:

- [exporter.ts](../../src/server/exporter.ts) creates a portable source workspace, vendors file dependencies, copies referenced composition content and enforces a portable security boundary. Its README describes install/build/start. This assessment does not execute export or prove a production-ready site artifact.
- [preview.ts](../../src/server/preview.ts) manages development child processes and returns loopback Preview URLs. The [host closure](v1-recovery-free-website-host-closure-20261028.md) explicitly qualifies only a disposable, bounded host.
- [main.ts](../../src/client/main.ts) exposes presentation Publish labels/actions. The [presentation publication contract](../../src/server/presentation-publication-contract.ts) includes a bounded static-card-presentation subset. These facts do not establish that publishing a presentation releases the whole composed website or grants audience access.

The next delivery review must select and document one existing path only after establishing:

1. **Audience and owner:** public readers, a named restricted audience, or local/operator-only use; the authorized Application owner and operator. Do not assume public exposure from a website-authoring request.
2. **Release scope and content:** supported Pages/routes, Shell/Menu, CSS, images and admitted package/runtime dependencies; define the source/release boundary and what changes can affect a running site. Reuse existing source/export/publication authority where applicable. Do not invent a second revision store to fill a status indicator.
3. **Operational destination:** one explicitly authorized host and supported build/start process, stable address/base path, asset paths and direct-link/history behavior. For remote delivery, specify appropriate transport, runtime configuration, secrets isolation and access enforcement through existing security contracts. Do not expose Builder/management endpoints as website delivery.
4. **Readiness and failure handling:** reproducible artifact/startup, admitted source/recovery behavior, unavailable-dependency refusal, health checks and an explicit supported restore/rollback or operator recovery procedure. Reuse existing mechanisms; do not infer whole-site rollback from presentation versioning.
5. **Audience proof:** the intended reader can open the site without Builder access, reach direct Page URLs, load actual images/styles, navigate/reload/history and see the identified release. An unauthorized reader is refused where access is restricted. Later editor changes must follow the declared delivery policy, rather than silently contradicting the author-facing release state.

These are review requirements, not a claim that a deployment, permission or security change is authorized now. If existing facilities cannot satisfy the selected path within their contracts, report the specific gap for separate authorization before implementation.

## 4. Optional deferred features

For a bounded informational V1 site, a theme designer, template marketplace, font/media library, background-image editor, arbitrary Components/routing, cross-Page fragments, advanced animations, SEO tooling, analytics, forms/data/Workflow expansion and general hosting-provider orchestration are not prerequisites. Their value depends on the intended site.

Custom domains and multiple hosting targets are optional for a first explicitly approved stable-address pilot. A universal Publish interface is not required before proving one supported delivery path. Unsaved-draft Preview protection remains deferred and should be scheduled according to demonstrated data-loss risk; this assessment neither implements it nor treats its deferral as closure of that concern. Native Chrome Reload and screenshot limitations remain recorded qualifications, not reasons to repeat accepted architecture work without a new issue.

## Smallest recommended next milestone

**V1 Single-Site Authorized Audience Delivery Pilot.** First submit a short delivery-contract gate naming one Application class, audience, operator, existing artifact/runtime path, host boundary and acceptance proof. Prefer the smallest informational website: three saved Pages, one shared Shell/Menu, admitted local styling and existing Application images; exclude forms, protected data, arbitrary code and multi-host orchestration unless specifically necessary.

After separate authorization, demonstrate fresh authorized website setup → normal authoring/save → saved Preview → explicit delivery → reader access, plus one small update using the declared release policy and an existing supported restore/refusal path. Include a fresh-Application walkthrough to establish setup usability. Qualify own-file upload only if included in that pilot's author promise; otherwise retain the existing-image limitation plainly.

Success is one repeatable, documented route from an ordinary author's saved website to its intended audience, with readable destination/release status and preserved authority. This recommendation does not preselect a vendor, widen permissions, launch a host, claim production readiness or authorize implementation. It does not require a replacement renderer, router, persistence model or a new generic deployment framework.

Only two new documents were added: the Saved Preview acceptance closure and this assessment. No product code, Application content/settings, dependencies, permissions, I-AM, recovery state or historical evidence changed. No builds, tests, browser authoring, exports or publication actions were performed. No commits or pushes.

**Stop: V1 Page Builder — Practical V1 Completion Review Gate. Await separate next-milestone authorization.**
