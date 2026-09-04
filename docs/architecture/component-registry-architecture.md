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

