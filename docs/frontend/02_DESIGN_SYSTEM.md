# GIFTEDproMovies — Design System & UI Foundations

**Document ID:** MD-03
**File:** `02_DESIGN_SYSTEM.md`
**Version:** 1.0
**Status:** LOCKED FOUNDATION
**Scope:** Frontend Only
**Project:** GIFTEDproMovies

---

# 1. PURPOSE

This document defines the visual foundation of **GIFTEDproMovies**.

It establishes the rules for:

* Colors
* Typography
* Spacing
* Layout
* Surfaces
* Borders
* Shadows
* Buttons
* Inputs
* Badges
* Cards
* Movie cards
* Content rails
* Modals
* Bottom sheets
* Icons
* Images
* Responsive visual behavior
* Accessibility states
* Design tokens

The purpose is to ensure that every part of the frontend feels like one intentional product.

The AI coding agent MUST NOT invent visual styles that contradict this document.

---

# 2. DESIGN PHILOSOPHY

GIFTEDproMovies must feel:

* Cinematic
* Premium
* Modern
* Confident
* Immersive
* Clean
* Fast
* Professional
* Easy to navigate

The visual direction combines:

> **Premium streaming simplicity + intelligent content discovery + cinematic presentation + GIFTEDproMovies brand identity.**

The product MUST NOT look like:

* A generic movie-download website
* A generic SaaS dashboard
* A Netflix clone
* A template marketplace website
* An over-designed glassmorphism application
* A page filled with random gradients
* A Tailwind component showcase

The interface should feel designed by a professional product team.

---

# 3. BRAND VISUAL IDENTITY

## 3.1 Brand Name

The exact brand name is:

**GIFTEDproMovies**

Do not alter capitalization.

Correct:

`GIFTEDproMovies`

Incorrect:

* Gifted Pro Movies
* GIFTED Pro Movies
* giftedpromovies.com
* GIFTEDPROMOVIES
* GiftedproMovies

---

# 4. COLOR SYSTEM

The product uses a dark cinematic foundation.

## 4.1 Core Palette

| Token                      | Value     | Purpose                        |
| -------------------------- | --------- | ------------------------------ |
| `--color-background`       | `#08090C` | Main application background    |
| `--color-surface`          | `#111318` | Cards and primary surfaces     |
| `--color-surface-elevated` | `#181A21` | Elevated cards, dialogs, menus |
| `--color-crimson`          | `#B11226` | Primary brand/action color     |
| `--color-gold`             | `#D6A84F` | Premium/featured accent        |
| `--color-text-primary`     | `#F5F5F5` | Main text                      |
| `--color-text-secondary`   | `#A6A8B0` | Secondary text                 |
| `--color-text-muted`       | `#70737C` | Low-emphasis text              |
| `--color-border`           | `#262932` | Standard borders               |
| `--color-border-subtle`    | `#1C1E25` | Very subtle separation         |

---

# 5. SEMANTIC COLOR ROLES

Colors must be used according to meaning.

## 5.1 Crimson

Primary use:

* Main CTA
* Watch button
* LIPA button
* Active navigation
* Important actions
* Trending indicators
* Selected states
* Primary focus states

Crimson MUST NOT cover the entire interface.

It is an action and identity signal.

---

## 5.2 Gold

Primary use:

* Premium subscription
* Premium content
* Featured indicators
* Special promotional elements
* Important premium metadata
* Selected premium states

Gold should communicate:

> Premium / special / valuable

Gold MUST NOT replace crimson as the primary action color.

---

## 5.3 Neutral Colors

Neutral colors are the foundation of the application.

Most of the screen should consist of:

* Background
* Surface
* Elevated Surface
* White/near-white text
* Muted text
* Subtle borders

This creates the cinematic environment.

---

# 6. COLOR USAGE RULES

The following rules are mandatory:

### DO

* Use crimson for meaningful actions.
* Use gold for premium meaning.
* Use neutral surfaces for most UI.
* Use gradients primarily for image readability.
* Maintain strong contrast.

### DO NOT

* Make every button red.
* Make every heading gold.
* Use random Tailwind colors.
* Introduce purple/blue/green palettes without an approved semantic reason.
* Use bright backgrounds.
* Use excessive neon effects.
* Use gradients as decoration without purpose.

---

# 7. TYPOGRAPHY

Typography should feel modern and cinematic without becoming experimental.

## 7.1 Font Strategy

Use a modern sans-serif family with excellent readability.

Preferred implementation:

* Primary UI font: modern sans-serif
* Optional display treatment: same family with stronger weight

The system MUST avoid loading multiple unnecessary font families.

Consistency is more important than novelty.

---

# 8. TYPOGRAPHIC HIERARCHY

Use the following conceptual scale.

| Token        | Size |  Weight | Usage                  |
| ------------ | ---: | ------: | ---------------------- |
| `display-xl` | 56px | 700–800 | Hero titles            |
| `display-lg` | 48px | 700–800 | Large feature titles   |
| `heading-xl` | 36px |     700 | Page titles            |
| `heading-lg` | 30px |     700 | Major sections         |
| `heading-md` | 24px | 600–700 | Content sections       |
| `heading-sm` | 20px |     600 | Card/group headings    |
| `body-lg`    | 18px |     400 | Important descriptions |
| `body-md`    | 16px |     400 | Default body           |
| `body-sm`    | 14px | 400–500 | Secondary information  |
| `caption`    | 12px | 400–500 | Metadata               |

---

# 9. TYPOGRAPHY RULES

## Headings

Headings should be:

* Strong
* Clear
* Short
* Visually hierarchical

Avoid:

* Extremely thin headings
* Excessive uppercase text
* Long paragraphs inside headings

## Body

Body text must prioritize readability.

Recommended:

* 16px default desktop/mobile body
* Comfortable line-height
* Secondary text should not become too faint

## Metadata

Movie metadata may use smaller typography.

Examples:

`2026 • 2h 14m • Action`

or:

`Nigeria • English • DJ Mack`

Metadata should remain readable but visually subordinate.

---

# 10. SPACING SYSTEM

Use a consistent spacing scale.

Base unit:

**4px**

Recommended tokens:

| Token      | Value |
| ---------- | ----: |
| `space-1`  |   4px |
| `space-2`  |   8px |
| `space-3`  |  12px |
| `space-4`  |  16px |
| `space-5`  |  20px |
| `space-6`  |  24px |
| `space-8`  |  32px |
| `space-10` |  40px |
| `space-12` |  48px |
| `space-16` |  64px |
| `space-20` |  80px |
| `space-24` |  96px |

Do not randomly introduce values such as:

* 13px
* 17px
* 23px
* 37px

unless there is a documented design reason.

---

# 11. LAYOUT SYSTEM

The application should use a centered responsive content container.

Recommended maximum content width:

**1440px**

The container should maintain responsive horizontal padding.

Conceptually:

```text
┌─────────────────────────────────────────────────────┐
│                 Application Header                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│     ┌─────────────────────────────────────────┐     │
│     │                                         │     │
│     │             CONTENT CONTAINER           │     │
│     │                                         │     │
│     └─────────────────────────────────────────┘     │
│                                                     │
└─────────────────────────────────────────────────────┘
```

The interface MUST NOT allow content to become excessively wide on large monitors.

---

# 12. RESPONSIVE BREAKPOINTS

Use Tailwind's responsive system.

Primary conceptual breakpoints:

* Mobile: `< 640px`
* Small tablet: `640px+`
* Tablet: `768px+`
* Desktop: `1024px+`
* Large desktop: `1280px+`
* Wide desktop: `1536px+`

The exact layout should adapt rather than simply shrink.

---

# 13. MOBILE-FIRST RULE

The design MUST be mobile-first.

Mobile is not a reduced desktop version.

Mobile layouts should intentionally define:

* Navigation
* Card density
* Typography
* CTA placement
* Content rails
* Bottom sheets
* Search
* Filters
* Movie details

Desktop enhancements should build on the mobile foundation.

---

# 14. BORDER RADIUS

Use a restrained radius system.

Recommended:

| Token         |  Value | Usage                |
| ------------- | -----: | -------------------- |
| `radius-sm`   |    6px | Small controls       |
| `radius-md`   |   10px | Inputs/buttons       |
| `radius-lg`   |   14px | Cards                |
| `radius-xl`   |   18px | Large cards/surfaces |
| `radius-2xl`  |   24px | Major surfaces       |
| `radius-full` | 9999px | Pills/avatars        |

Avoid excessive rounded corners.

The platform should feel cinematic, not playful.

---

# 15. SURFACE SYSTEM

Use layers to create depth.

## Layer 0 — Background

```text
#08090C
```

Used for:

* Main page background
* Large empty areas
* Player background

## Layer 1 — Surface

```text
#111318
```

Used for:

* Cards
* Navigation surfaces
* Content blocks

## Layer 2 — Elevated Surface

```text
#181A21
```

Used for:

* Dialogs
* Menus
* Dropdowns
* Bottom sheets
* Elevated cards

## Layer 3 — Temporary Overlay

Used for:

* Modal backdrop
* Player overlays
* Full-screen interactions

Overlays should usually use black with controlled opacity.

---

# 16. SHADOWS

Shadows should be subtle.

Dark interfaces should not rely on huge shadows to communicate depth.

Use:

* Small elevation → subtle shadow
* Medium elevation → moderate shadow
* Large modal elevation → stronger shadow

Avoid:

* Neon shadows everywhere
* Crimson glow on every card
* Gold glow on every premium element

Glow is an accent, not the foundation.

---

# 17. BORDERS

Default border:

```text
#262932
```

Subtle border:

```text
#1C1E25
```

Borders should primarily:

* Separate surfaces
* Define controls
* Improve clarity

Do not put visible borders around every piece of content.

---

# 18. BUTTON SYSTEM

Buttons must communicate hierarchy.

## 18.1 Primary Button

Purpose:

* Watch
* LIPA
* Subscribe
* Confirm important actions

Visual direction:

* Crimson background
* White text
* Strong contrast
* Medium/large height
* Rounded but not excessively

Example:

```text
[ ▶  WATCH NOW ]
```

---

# 19. SECONDARY BUTTON

Purpose:

* Add to Library
* More Info
* Cancel
* Alternative actions

Visual direction:

* Neutral elevated surface
* Light text
* Subtle border

Example:

```text
[ + MY LIST ]
```

---

# 20. GHOST BUTTON

Purpose:

* Low-priority actions
* Navigation utilities
* Player controls

Visual direction:

* Transparent background
* Light text
* Hover surface

---

# 21. PREMIUM BUTTON

Used for subscription or premium actions.

Visual direction:

* Gold accent
* Dark text where contrast permits
* Premium visual treatment

Example:

```text
[ ✦ GO PREMIUM ]
```

---

# 22. DESTRUCTIVE BUTTON

Used for:

* Delete
* Remove
* Revoke
* Dangerous administrative operations

Destructive styling must be visually distinct from normal crimson actions.

Do not use the normal primary action style for destructive actions.

---

# 23. BUTTON STATES

Every interactive button must support:

* Default
* Hover
* Active/pressed
* Focus
* Disabled
* Loading

Loading buttons should preserve their dimensions.

Example:

```text
[  ◌ Processing...  ]
```

The layout must not jump when loading begins.

---

# 24. INPUT SYSTEM

Inputs should feel integrated into the dark cinematic environment.

Default:

* Dark surface
* Subtle border
* White text
* Secondary placeholder
* Crimson focus indicator

States:

```text
Default
Hover
Focus
Filled
Error
Disabled
Loading
```

Error states must clearly communicate what went wrong.

Do not rely on color alone.

---

# 25. SEARCH INPUT

Search is a major discovery feature.

The search field should feel like a primary product interaction.

Desktop:

```text
[ 🔍  Search movies, series, DJs, categories... ]
```

Mobile may use a dedicated search screen or expanded search interaction.

Search UI must support the product's discovery model, not merely title matching.

---

# 26. BADGES

Badges communicate short metadata.

Examples:

* `TRENDING`
* `NEW`
* `PREMIUM`
* `SERIES`
* `HD`
* `SUBTITLE`

Badges should be compact.

Avoid putting badges everywhere.

---

# 27. PILL CONTROLS

Pills are appropriate for:

* Categories
* Filters
* DJ selection
* Version selection
* Content types

Example:

```text
[ All ] [ Movies ] [ Series ] [ Christian ]
```

Selected state should be obvious.

Primary selected controls may use crimson.

Premium selected controls may use gold.

---

# 28. MOVIE CARD SYSTEM

Movie cards are one of the most important components in the product.

A movie card must communicate:

* Poster
* Title
* Important metadata
* Content type where relevant
* Price/access information where appropriate
* Availability/status where relevant

The card should remain visually clean.

---

# 29. MOVIE CARD IMAGE RATIO

Default poster ratio:

**2:3**

Example:

```text
┌──────────────┐
│              │
│    POSTER    │
│              │
│              │
└──────────────┘
```

The image must maintain consistent aspect ratio.

Do not allow random card heights caused by different poster dimensions.

---

# 30. MOVIE CARD STATES

Movie cards must support:

1. Default
2. Hover
3. Focus
4. Selected
5. Loading
6. Unavailable
7. Premium

Desktop hover may reveal additional information.

Mobile MUST NOT depend on hover.

---

# 31. MOVIE CARD VISUAL HIERARCHY

The poster is the dominant visual element.

Recommended hierarchy:

```text
POSTER
   ↓
TITLE
   ↓
METADATA
   ↓
OPTIONAL PRICE / STATUS
```

The card should not become a miniature dashboard.

---

# 32. CONTENT RAILS

Content should often be presented in horizontal rails.

Example:

```text
Trending Movies                         See All →
────────────────────────────────────────────────────

[Movie] [Movie] [Movie] [Movie] [Movie] →
```

Rails should:

* Maintain consistent card sizing
* Allow horizontal scrolling
* Work naturally with touch
* Support desktop navigation
* Avoid excessive visual clutter

---

# 33. SECTION HEADERS

Section headers should provide hierarchy.

Example:

```text
Trending Movies                         See All →
```

The heading should be more prominent than secondary actions.

Do not over-design every section header.

---

# 34. IMAGE GRADIENTS

Gradients may be used over movie imagery for:

* Text readability
* Hero transitions
* Card metadata
* Cinematic atmosphere

Gradient overlays should emerge from the image/content requirement.

Do not use gradients simply because gradients look modern.

---

# 35. NAVIGATION VISUAL FOUNDATION

The main navigation should be:

* Minimal
* Clear
* Dark
* Responsive
* Brand-aware

Navigation should prioritize important discovery actions.

Desktop may include:

```text
GIFTEDproMovies

Home
Movies
Series
Categories
Search

                         My Account
```

The exact route/navigation structure will be defined in a later document.

This document only establishes the visual foundation.

---

# 36. MODALS

Modals should use the elevated surface layer.

Requirements:

* Dark elevated background
* Strong visual hierarchy
* Clear close action
* Accessible focus handling
* Appropriate backdrop
* Responsive width

Avoid oversized desktop dialogs that become difficult to use on mobile.

---

# 37. BOTTOM SHEETS

Bottom sheets are especially useful for mobile actions.

Potential uses:

* LIPA
* Watch vs Download
* DJ/version selection
* Filters
* Subscription selection

They should feel like a natural extension of the current page.

---

# 38. ICON SYSTEM

Use one consistent icon library.

Recommended:

**Lucide Icons**

Icons should generally use:

* 16px for compact controls
* 20px for standard controls
* 24px for primary navigation/actions
* 32px+ only for prominent empty states or hero interactions

Do not mix multiple unrelated icon styles.

Icons should support text rather than replace meaningful labels where clarity matters.

---

# 39. IMAGE HANDLING

Images must be treated as a major part of the product experience.

Requirements:

* Correct aspect ratios
* Consistent object-fit behavior
* Lazy loading where appropriate
* Appropriate fallback
* No layout jumping
* Clear loading state

Broken images must have a designed fallback.

---

# 40. LOADING VISUAL LANGUAGE

Loading states should preserve the structure of the final content.

Use:

* Skeleton cards
* Skeleton text
* Subtle shimmer
* Placeholder surfaces

Avoid full-screen spinners for ordinary content loading.

A user should understand what is loading.

---

# 41. EMPTY STATES

Empty states should be:

* Clear
* Helpful
* Minimal
* Actionable where appropriate

Example:

```text
No movies found

Try changing your filters or search terms.

[ CLEAR FILTERS ]
```

Do not use unnecessarily large illustrations.

---

# 42. ERROR STATES

Errors must be understandable.

Example:

```text
Something went wrong

We couldn't load this content.

[ TRY AGAIN ]
```

Error UI must not expose technical information such as:

* Stack traces
* Database errors
* API implementation details
* Internal IDs

---

# 43. FOCUS STATES

Keyboard focus must always be visible.

Recommended:

* Crimson focus ring
* Sufficient contrast
* No removal of browser focus without replacement

Interactive elements must be keyboard accessible.

---

# 44. DISABLED STATES

Disabled controls should communicate that interaction is unavailable.

Use:

* Reduced contrast
* Reduced emphasis
* No pointer interaction

Do not make disabled elements completely invisible.

---

# 45. ACCESSIBILITY

The visual system must maintain accessible contrast.

Important rules:

* Primary text must have strong contrast.
* Secondary text must remain readable.
* Interactive controls must have visible focus.
* Color must not be the only method of communicating state.
* Icons that communicate important meaning should have accessible labels.
* Touch targets should be sufficiently large on mobile.

Accessibility is part of the design system, not a later patch.

---

# 46. DESIGN TOKEN IMPLEMENTATION

The visual values in this document should become reusable design tokens.

Conceptually:

```text
Design Tokens
    │
    ├── Colors
    ├── Typography
    ├── Spacing
    ├── Radius
    ├── Shadows
    └── Breakpoints
          │
          ▼
      Components
          │
          ▼
        Pages
```

Components should consume tokens rather than hard-coded visual values whenever possible.

---

# 47. TAILWIND USAGE

Tailwind CSS is the styling foundation.

However:

> Tailwind utility classes are implementation tools, not the design system itself.

The agent must not scatter arbitrary values throughout the application.

Prefer:

```text
Design Token
      ↓
Tailwind Theme / CSS Variable
      ↓
Reusable Component
      ↓
Page
```

Avoid:

```text
Random class
Random color
Random spacing
Random radius
Random shadow
```

---

# 48. SHADCN/UI RULE

shadcn/ui may be used for:

* Dialogs
* Dropdowns
* Selects
* Form primitives
* Tabs
* Tooltips
* Other accessibility-heavy primitives

However:

**shadcn/ui MUST NOT define the visual identity of GIFTEDproMovies.**

Components should be adapted to the GIFTEDproMovies design system.

The product must not look like an untouched shadcn template.

---

# 49. DESIGN CONSISTENCY RULE

Before creating a new visual component, the agent must ask:

1. Does an existing component already solve this?
2. Can the existing component be extended?
3. Is this genuinely a new interaction?
4. Does it follow the existing design tokens?
5. Does it maintain visual hierarchy?

Do not create five visually different versions of the same component.

---

# 50. VISUAL DENSITY

GIFTEDproMovies should balance:

**Content richness + visual breathing room.**

The interface should show enough movies to encourage discovery without becoming visually crowded.

Desktop may support higher content density.

Mobile should prioritize:

* Clear hierarchy
* Touch usability
* Content visibility
* Simple interactions

---

# 51. PREMIUM VISUAL LANGUAGE

Premium does NOT mean:

* Gold everywhere
* Huge shadows
* Excessive blur
* Excessive gradients
* Glowing borders
* Luxury clichés

Premium means:

* Consistency
* Restraint
* Strong typography
* Good spacing
* High-quality imagery
* Clear hierarchy
* Smooth interaction
* Intentional details

---

# 52. DO / DON'T

## DO

* Use deep cinematic backgrounds.
* Use crimson strategically.
* Use gold selectively.
* Use strong movie imagery.
* Keep typography clean.
* Maintain consistent spacing.
* Use reusable components.
* Preserve hierarchy.
* Design mobile intentionally.
* Keep surfaces restrained.

## DON'T

* Clone Netflix.
* Use red everywhere.
* Use random colors.
* Use random border radii.
* Use excessive glassmorphism.
* Add unnecessary gradients.
* Make every card glow.
* Create inconsistent buttons.
* Depend on hover for mobile.
* Use arbitrary spacing.
* Build every section differently.

---

# 53. COMPONENT VISUAL PRIORITY

The following components are considered high-priority visual primitives:

1. Movie Card
2. Hero
3. Primary Button
4. Secondary Button
5. Search
6. Content Rail
7. Section Header
8. Badge
9. Filter Pill
10. Modal
11. Bottom Sheet
12. Input
13. Navigation
14. Poster/Image
15. Loading Skeleton

These components must receive careful design attention because they will be reused extensively.

---

# 54. VISUAL QUALITY CHECK

Before considering a UI section complete, verify:

### Brand

* Does it look like GIFTEDproMovies?
* Is the crimson used intentionally?
* Is gold reserved for premium meaning?

### Typography

* Is hierarchy obvious?
* Is text readable?
* Are weights consistent?

### Spacing

* Is spacing systematic?
* Is the interface breathing?
* Are elements unnecessarily crowded?

### Components

* Are existing components reused?
* Are states handled?
* Is the component consistent with the system?

### Responsive

* Does it work on mobile?
* Does it work on tablet?
* Does it work on desktop?
* Does the hierarchy remain clear?

### Accessibility

* Is focus visible?
* Is contrast sufficient?
* Can the interface be understood without color alone?

### Visual discipline

* Are there unnecessary gradients?
* Are there unnecessary shadows?
* Are there arbitrary colors?
* Are there random border radii?

---

# 55. DESIGN ACCEPTANCE CRITERIA

This document is considered correctly implemented when:

* The entire frontend uses the defined dark visual foundation.
* Brand colors are tokenized.
* Typography follows a consistent hierarchy.
* Spacing follows a consistent scale.
* Buttons have a clear hierarchy.
* Movie cards have consistent dimensions.
* Content rails behave consistently.
* Inputs have defined states.
* Modals and sheets use the correct elevation system.
* Icons follow one visual language.
* Loading, empty, error, focus, and disabled states exist.
* Mobile and desktop layouts are intentionally designed.
* No random visual system has been introduced.

---

# 56. WHAT THIS DOCUMENT LOCKS

This document locks:

* Color system
* Semantic color usage
* Typography foundation
* Typography hierarchy
* Spacing system
* Layout foundation
* Responsive visual foundation
* Border radius
* Surface hierarchy
* Border system
* Shadow philosophy
* Button hierarchy
* Input foundation
* Badge foundation
* Pill foundation
* Movie card foundation
* Content rail foundation
* Modal foundation
* Bottom sheet foundation
* Icon direction
* Image treatment foundation
* Loading/empty/error visual foundation
* Accessibility visual foundation
* Design token philosophy

These decisions MUST NOT be changed casually.

---

# 57. WHAT THIS DOCUMENT DOES NOT LOCK

This document does NOT define:

* Complete page architecture
* Route structure
* Full navigation structure
* Detailed movie page layout
* Full admin dashboard layout
* Search algorithms
* Recommendation algorithms
* Backend architecture
* Database structure
* Payment implementation
* Authentication implementation
* Streaming implementation
* Download implementation
* Animation implementation
* API contracts

Those belong to later documents.

---

# 58. RELATIONSHIP WITH FUTURE DOCUMENTS

This document is the visual foundation.

Future documents must build on it.

```text
00_PROJECT_RULES.md
        │
        ▼
01_TECH_STACK.md
        │
        ▼
02_DESIGN_SYSTEM.md
        │
        ├──────────────► 03_VISUAL_LANGUAGE.md
        │
        ├──────────────► 04_MOTION_SYSTEM.md
        │
        ├──────────────► 05_FRONTEND_ARCHITECTURE.md
        │
        └──────────────► Future UI Documents
```

No future UI document should introduce a competing design system.

---

# 59. FINAL AGENT DIRECTIVE

The implementation agent MUST treat this document as the visual source of truth.

Before introducing any new UI styling, the agent must check:

1. Existing design tokens.
2. Existing reusable components.
3. Existing visual hierarchy.
4. Existing responsive behavior.
5. Accessibility requirements.

If a new design decision is necessary but is not covered here, the agent must not silently invent a permanent visual rule.

Instead:

> Propose the design decision, explain why it is necessary, and wait for approval when the decision materially affects the product's visual identity.

The goal is not to produce a collection of beautiful individual components.

The goal is to produce **one coherent product experience**.

---

# 60. STATUS

**MD-03 / `02_DESIGN_SYSTEM.md`**

Status:

**LOCKED FOUNDATION**

Any major change requires explicit project approval.

Next document:

**`03_VISUAL_LANGUAGE.md` — GIFTEDproMovies Visual Language & Cinematic UI Direction**
