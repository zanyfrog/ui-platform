# UI Platform — Application-Level Presentation Architecture

## 1. Purpose

The **Application-Level Presentation Layer** defines the shared visual language, structural shell, reusable presentation assets, and application-wide display defaults for an application built with `System/ui-platform`.

Its purpose is to provide a consistent presentation system that can be inherited by:

- Application pages
- Page templates
- Workflows
- Workflow steps
- Heroes
- Reusable site components
- Forms
- Data-driven views
- Other presentation-capable artifacts

The application-level presentation layer sits above the page and workflow presentation layers and establishes the defaults they inherit.

---

## 2. Presentation Hierarchy

The recommended presentation hierarchy is:

```text
ui-base
   ↓
Application Presentation
   ↓
Page Template / Workflow Presentation
   ↓
Page / Workflow Step Presentation
   ↓
Component-specific overrides
```

This creates a predictable inheritance model.

### 2.1 `ui-base`

`ui-base` provides the shared foundational UI system:

- Base component styles
- Normalization/reset styles
- Base spacing and typography rules
- Accessibility-safe component behavior
- Core responsive behavior
- Primitive UI components

The application presentation layer **extends** `ui-base`; it does not replace it.

---

## 3. Application Presentation Responsibilities

Application-level presentation should answer questions such as:

- What does this application look like?
- What colors and typography does it use?
- What is the default application shell?
- What does navigation look like?
- What page templates are available?
- What heroes are available?
- What reusable visual assets exist?
- What are the default presentation rules for UI components?
- How should the application behave across desktop, tablet, and mobile?
- What does the application show for loading, empty, success, warning, and error states?

The application-level presentation layer should **not** contain the business logic of pages, workflows, or data operations.

---

# 4. Simplified Application Presentation Interface

The Application Presentation Manager should avoid exposing every presentation artifact as a separate top-level option.

The recommended primary groups are:

```text
Presentation
│
├── Styling
│
├── Layout & Structure
│
├── Assets
│
└── Preview / Publish
```

This provides a simpler mental model while still allowing detailed configuration within each area.

---

# 5. Styling

The **Styling** area combines application-wide visual appearance settings.

It should include:

## 5.1 Theme and Colors

Application-wide color definitions:

- Primary color
- Secondary color
- Accent color
- Background colors
- Surface colors
- Text colors
- Border colors
- Link colors
- Hover/focus colors
- Success
- Warning
- Error
- Information
- Disabled states

Applications may support multiple themes, such as:

```text
Default
Light
Dark
High Contrast
Custom Theme
```

---

## 5.2 Design Tokens

Design tokens provide named reusable presentation values instead of requiring repeated raw CSS values.

Examples:

```css
--app-color-primary
--app-color-surface
--app-spacing-sm
--app-spacing-md
--app-spacing-lg
--app-radius-card
--app-shadow-card
--app-font-body
--app-font-heading
--app-content-max-width
```

Recommended token categories include:

- Colors
- Spacing
- Typography
- Border radius
- Borders
- Shadows
- Control heights
- Container widths
- Breakpoints
- Z-index levels
- Animation timing

Design tokens should be available to application CSS, templates, pages, workflows, and components.

---

## 5.3 Typography

Application typography definitions should include:

- Body font
- Heading font
- Monospace font
- H1–H6 styles
- Paragraph styles
- Label styles
- Caption styles
- Link styles
- Font weight
- Line height
- Letter spacing

Typography should normally be expressed through design tokens and generated CSS variables.

---

## 5.4 Application CSS

Applications should support an application-specific stylesheet that works in conjunction with `ui-base`.

Recommended stylesheet precedence:

```text
ui-base stylesheet
        ↓
application theme / design tokens
        ↓
application stylesheet
        ↓
template stylesheet
        ↓
page or workflow stylesheet
        ↓
component-specific override
```

This hierarchy should be documented and enforced so presentation behavior is predictable.

---

## 5.5 Component Presentation Defaults

The application should be able to establish presentation defaults for reusable UI components without changing the component implementation.

Examples:

```text
Button
  defaultVariant: primary
  size: medium
  radius: medium

Card
  defaultVariant: elevated

TextInput
  size: medium
  labelPosition: top

Table
  density: comfortable
  stripedRows: true
```

The component itself remains supplied by `ui-base` or another UI package.

Application presentation only defines the default appearance and presentation behavior.

---

## 5.6 Form Presentation Defaults

Forms may inherit application-wide presentation rules such as:

- Label position
- Required-field indicator
- Help text location
- Field spacing
- Section spacing
- Validation appearance
- Error summaries
- Input density
- Submit-button placement

---

## 5.7 Data Presentation Defaults

Common data presentation defaults may include:

- Table density
- Row striping
- Header treatment
- Pagination appearance
- Sorting indicators
- Filter presentation
- Record card appearance
- Empty-data display
- Mobile table behavior

---

## 5.8 Motion and Animation

Application-wide motion settings may include:

- Transition duration
- Easing
- Menu animations
- Modal animations
- Page transitions
- Hover animations
- Reduced-motion behavior

Motion rules should respect accessibility settings.

---

# 6. Layout & Structure

The **Layout & Structure** area defines how application content is organized.

Recommended subareas:

```text
Layout & Structure
├── Application Shell
├── Navigation
├── Heroes
├── Page Templates
└── Responsive Behavior
```

---

# 7. Application Shell

The **Application Shell** is the persistent outer layout of the application.

It is similar to a template for templates, but should remain a distinct architectural artifact.

The relationship is:

```text
Application Shell
      ↓
Page Template
      ↓
Page
```

For example:

```text
Application Shell
├── Header
├── Primary Navigation
├── Optional Sidebar
├── Global Alert Region
├── Main Content Region
└── Footer
```

A page template defines the layout **inside the Main Content Region**.

Example:

```text
Application Shell
┌──────────────────────────────────┐
│ Header                           │
├──────────────────────────────────┤
│ Navigation                       │
├──────────────────────────────────┤
│                                  │
│   Page Template                  │
│   ┌──────────────────────────┐   │
│   │ Hero                     │   │
│   ├──────────────────────────┤   │
│   │ Main Content + Sidebar   │   │
│   └──────────────────────────┘   │
│                                  │
├──────────────────────────────────┤
│ Footer                           │
└──────────────────────────────────┘
```

### 7.1 Why Shell and Template Should Remain Separate

Keeping them separate allows:

- Changing the application header without modifying page templates
- Replacing navigation without rebuilding pages
- Reusing one page template under multiple shells
- Supporting public and authenticated shells
- Supporting administration shells
- Supporting mobile-specific shell behavior
- Cleaner inheritance and versioning

An application may define multiple shells.

Example:

```text
shells/
  public
  authenticated
  admin
  minimal
```

---

# 8. Navigation Presentation

Navigation data and navigation presentation should remain separate.

Application presentation may define:

- Top navigation
- Sidebar navigation
- Mobile navigation
- Dropdown presentation
- Selected-item presentation
- Breadcrumb presentation
- Footer navigation
- Navigation spacing
- Navigation icons
- Collapse behavior

The navigation system determines **what items exist**.

The presentation layer determines **how those items are displayed**.

---

# 9. Heroes

Heroes should be reusable application-level presentation artifacts.

An application may provide multiple hero definitions:

```text
heroes/
  standard
  landing
  compact
  image-left
  image-background
  dashboard
```

A hero definition should describe:

- Supported regions
- Image behavior
- Heading placement
- Subtitle placement
- Action/button positions
- Background behavior
- Responsive behavior
- Allowed configuration options

The hero should not normally contain page-specific text or business data.

A page selects the hero and supplies the content.

---

# 10. Page Templates

Page templates define reusable page structures inside the Application Shell.

Examples:

```text
Landing
Standard Content
Two Column
Dashboard
Form
Detail Record
Search Results
Administration
```

A template may define:

- Hero region
- Main content region
- Sidebar regions
- Column structure
- Component slots
- Allowed component types
- Default spacing
- Responsive behavior
- Template CSS
- Optional configuration metadata

Page templates should be able to inherit application-level styling and shell behavior.

---

# 11. Responsive Behavior

Application-wide responsive rules should define defaults such as:

- Breakpoints
- Maximum content width
- Page gutters
- Column stacking
- Navigation collapse
- Sidebar behavior
- Hero behavior
- Header behavior
- Footer behavior

Pages and templates may override these when necessary.

---

# 12. Assets

The **Assets** area manages reusable application-wide visual resources.

Recommended asset categories:

```text
Assets
├── Logos
├── Images
├── Icons
├── Illustrations
├── Backgrounds
└── Favicons / Application Identity
```

Pages, heroes, templates, workflows, and components should reference assets rather than copying them.

Asset metadata may include:

- Asset ID
- Name
- Type
- File path or resource location
- Alternate text
- Dimensions
- Usage category
- Created date
- Updated date
- Version
- Active state

---

# 13. Icon Mapping

The application may define semantic icon aliases.

Example:

```text
save    → lucide:save
edit    → lucide:pencil
delete  → lucide:trash-2
user    → lucide:user
warning → lucide:triangle-alert
```

Pages and components may reference semantic names such as `save` instead of binding directly to a specific icon library.

This allows icon libraries or visual styles to change without editing every page.

---

# 14. Presentation States

Applications should define consistent presentation for common system states.

Recommended states include:

- Loading
- Empty
- No results
- Success
- Information
- Warning
- Error
- Permission denied
- Not found
- Offline
- Maintenance

These can be implemented as reusable presentation components.

---

# 15. Accessibility Presentation Defaults

Much accessibility behavior should remain in `ui-base`, but application presentation should allow policy-level defaults.

Examples:

- Minimum contrast target
- Focus indicator style
- Reduced-motion behavior
- Minimum control target size
- Link differentiation
- Form error visibility
- Heading conventions
- Accessibility warnings during design

The application should not be permitted to override accessibility behavior in a way that makes the UI unusable or inaccessible.

---

# 16. Application Presentation Preview

The Presentation Manager should provide an application preview.

Recommended preview modes:

```text
Desktop
Tablet
Mobile
```

Preview should support:

- Current published presentation
- Current draft presentation
- Side-by-side comparison
- Shell preview
- Template preview
- Hero preview
- Theme preview
- Component preview

The preview should use real `ui-base` components whenever practical so the editor shows the same presentation system used by the application.

---

# 17. Recommended Application-Level UI

The simplified Presentation Manager can be organized as:

```text
Presentation
│
├── Styling
│   ├── Colors / Theme
│   ├── Typography
│   ├── Design Tokens
│   ├── Component Defaults
│   └── CSS / Advanced
│
├── Layout & Structure
│   ├── Application Shell
│   ├── Navigation
│   ├── Heroes
│   ├── Page Templates
│   └── Responsive Rules
│
├── Assets
│   ├── Logos
│   ├── Images
│   ├── Icons
│   └── Other Brand Assets
│
└── Preview / Publish
    ├── Desktop
    ├── Tablet
    ├── Mobile
    ├── Draft
    ├── Active Version
    └── Publish
```

This provides a much less busy interface than presenting every artifact as an independent top-level management area.

---

# 18. Presentation Artifact Storage

A possible application folder structure is:

```text
application/
│
├── presentation/
│   ├── presentation.manifest.json
│   │
│   ├── styling/
│   │   ├── theme.json
│   │   ├── tokens.json
│   │   ├── typography.json
│   │   ├── components.json
│   │   └── application.css
│   │
│   ├── shells/
│   │   ├── public/
│   │   ├── authenticated/
│   │   └── admin/
│   │
│   ├── navigation/
│   │
│   ├── heroes/
│   │
│   ├── templates/
│   │
│   ├── states/
│   │
│   └── assets/
│
├── pages/
├── workflows/
├── data/
└── app.settings.json
```

The exact physical storage model may change, but the logical separation should remain.

---

# 19. Presentation Manifest

The application presentation layer should have discoverable metadata.

Example:

```json
{
  "type": "ui-platform.presentation",
  "applicationId": "customer-portal",
  "activeVersion": 7,
  "defaultShell": "authenticated",
  "defaultTheme": "default",
  "defaultTemplate": "standard",
  "uiBaseCompatibility": "^5.0.0",
  "artifacts": {
    "shells": true,
    "themes": true,
    "heroes": true,
    "templates": true,
    "assets": true
  }
}
```

The manifest should describe the presentation system without requiring the editor to inspect every file.

---

# 20. Versioning and Lifecycle

Application presentation definitions should follow the same **Versioned Definition Registry** principles used elsewhere in UI Platform.

Recommended lifecycle:

```text
Draft
   ↓
Publish
   ↓
Immutable Version
   ↓
Active Version
```

A published version should not be edited directly.

Changes begin in the draft.

Publishing creates a new immutable version.

Rollback should preserve history by taking a prior version and publishing it as the next active version rather than mutating historical versions.

Example:

```text
v5
v6
v7  ← active

Rollback requested to v5

v8  ← created from v5 and made active
```

This maintains complete historical traceability.

---

# 21. Draft Awareness

The presentation editor should clearly show:

- Active version
- Draft exists / does not exist
- Whether the draft differs from the active version
- Last published time
- Last modified time
- Checksum for active versions
- Who made the last change, where audit information is available

Example:

```text
Active Version: v7
Draft: Modified
Draft differs from active: Yes
Last Published: 2026-09-15 13:42
```

If the user discards or replaces a draft, the system should warn that unpublished changes will be lost.

---

# 22. Inheritance and Overrides

Presentation should use explicit inheritance.

Recommended model:

```text
ui-base
   ↓
Application
   ↓
Shell / Template / Workflow
   ↓
Page / Workflow Step
   ↓
Component Instance
```

A lower level may override higher-level presentation settings when allowed.

Example:

```text
Application button default:
    primary

Page override:
    secondary

Single button override:
    danger
```

The editor should be capable of identifying whether a displayed value is:

- Inherited
- Locally defined
- Overridden

This will be especially valuable in visual editors.

---

# 23. Workflow Presentation Relationship

Workflows should inherit the Application Presentation Layer.

Workflow presentation may additionally define:

- Step layout
- Progress indicator
- Step navigation
- Previous / Next action locations
- Workflow-specific shell
- Wizard layout
- Completion state
- Workflow error state

Workflow presentation should not duplicate the application's theme, assets, or standard component styling unless explicitly overridden.

---

# 24. Page Presentation Relationship

Pages should inherit:

- Application theme
- Design tokens
- Typography
- Application shell
- Component defaults
- Assets
- Responsive rules

The page may then select:

- Page template
- Hero
- Navigation behavior
- Page-specific CSS
- Component arrangements
- Page-specific overrides

Example:

```text
Application
    Theme: Corporate Blue
    Shell: Authenticated
    Button: Rounded Primary

Page
    Template: Two Column
    Hero: Compact
    Page CSS: account.css
```

---

# 25. Separation of Presentation from Behavior

Presentation definitions should generally answer:

> "How should this appear?"

They should not answer:

> "What business operation should happen?"

For example:

```text
Presentation:
    Save button is primary and aligned right.

Behavior:
    Clicking Save invokes Dataset Operation Engine update.
```

This separation keeps UI Platform modular and allows presentation artifacts to be reused independently of data and workflow logic.

---

# 26. Recommended Core Application Presentation Artifacts

The initial application-level Presentation system should prioritize:

1. **Styling**
   - Theme
   - Colors
   - Typography
   - Design tokens
   - Application CSS
   - Component defaults

2. **Layout & Structure**
   - Application shell
   - Navigation
   - Heroes
   - Page templates
   - Responsive rules

3. **Assets**
   - Logos
   - Images
   - Icons
   - Brand assets

4. **Presentation States**
   - Loading
   - Empty
   - Error
   - Success
   - Warning

5. **Preview and Publishing**
   - Draft preview
   - Desktop/tablet/mobile preview
   - Version information
   - Publish
   - Rollback

This provides a strong application-level presentation system without making the initial interface unnecessarily complex.

---

# 27. Architectural Principle

The key principle is:

> **The Application Presentation Layer defines the application's visual system and structural defaults; page templates, pages, workflows, and components consume and selectively override that system.**

This keeps presentation:

- Consistent
- Modular
- Discoverable
- Reusable
- Versionable
- Editable
- Extensible

while avoiding duplication across pages and workflows.

---

# 28. Conceptual Architecture

```text
System/ui-platform
│
├── UI Base
│
│   └── Shared primitive UI components and base stylesheet
│
└── Presentation Services
    │
    ├── Application Presentation
    │   │
    │   ├── Styling
    │   │   ├── Theme
    │   │   ├── Design Tokens
    │   │   ├── Typography
    │   │   ├── Component Defaults
    │   │   └── Application CSS
    │   │
    │   ├── Layout & Structure
    │   │   ├── Application Shells
    │   │   ├── Navigation
    │   │   ├── Heroes
    │   │   ├── Page Templates
    │   │   └── Responsive Rules
    │   │
    │   ├── Assets
    │   │   ├── Logos
    │   │   ├── Images
    │   │   └── Icons
    │   │
    │   ├── Presentation States
    │   │
    │   └── Preview / Version / Publish
    │
    ├── Workflow Presentation
    │
    └── Page Presentation
```

---

## Status

This document represents the current recommended architecture for the **Application-Level Presentation Layer** of `System/ui-platform`.

It is intended to serve as the foundation for later architecture documents covering:

- Workflow-Level Presentation
- Page-Level Presentation
- Presentation Registry / Versioning implementation
- Presentation editor components
- Application Shell editor
- Hero editor
- Page Template editor
- Styling / Theme editor
