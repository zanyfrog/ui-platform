# UIB Component and Registry Architecture

This document was split out of docs/architecture/UIB-Architecture-Guide.md on 2026-09-03. The Architecture Guide remains the authoritative umbrella document; this file preserves and organizes the detailed architecture content for this topic.

---

# 9. Component Metadata and Discovery

The Page Builder should not need hard-coded knowledge of package-specific components.

Each component should expose metadata sufficient for discovery and editing.

Example:

```ts
{
  name: "Button",
  displayName: "Button",
  category: "Controls",
  icon: "button.svg",

  properties: {
    // metadata
  },

  events: {
    click: {
      // metadata
    }
  },

  slots: [],

  settings: {
    // component settings metadata
  }
}
```

A package may expose component discovery through a module or package definition:

```ts
export const packageDefinition = {
  components: [...],
  templates: [...],
  services: [...]
};
```

The complete component list should not have to be hard-coded centrally.

The Page Builder should query the Component Registry:

> What components are currently available?

It should not need to understand npm package details.

---

# 10. Registry Separation

The following should remain separate concepts:

```text
Package Registry
@uib/uib-base
     │
     ├──────── Component Registry
     │           Button
     │           Card
     │           Grid
     │
     └──────── Settings Registry
                 theme
                 animation
                 responsiveBreakpoints
```

Recommended registries include:

- Package Registry
- Component Registry
- Template Registry
- Settings Registry
- Service Registry
- Route Registry
- Admin Extension Registry
- Job Registry

This prevents package management from becoming tightly coupled to the Page Builder or runtime.

---

## Current Implementation: App Component Activation

The platform currently has two component catalog modes:

- The global component catalog remains a broad discovery view of platform packages and legacy component metadata.
- The app-scoped component catalog is an activation view. It includes components only from packages that are enabled in the application's `app.manifest.json`, resolved from the app-first package catalog, and compatible with the requested version.

Missing and incompatible package declarations remain visible as warnings in app package management views. They do not contribute components to the app-scoped component catalog until the package can be resolved compatibly.

This keeps the Page Builder aligned with the application folder as the source of truth while still allowing the platform administration view to discover global package inventory.
