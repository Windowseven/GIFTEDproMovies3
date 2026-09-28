# GIFTEDproMovies

## Responsive Design & Multi-Device Experience Specification

**Document ID:** MD-22
**File:** `docs/22_RESPONSIVENESS.md`
**Version:** 1.0
**Status:** Frontend Implementation Contract
**Scope:** Frontend only
**Applies To:** Customer, Admin, Media Team

---

## 1. Purpose

This document defines how GIFTEDproMovies must behave across different screen sizes, devices, orientations, input methods, and viewport conditions.

Responsive design is not treated as:

> “Take the desktop UI and make everything smaller.”

The product must be intentionally designed for:

* Small mobile phones
* Standard smartphones
* Large smartphones
* Tablets
* Laptops
* Desktop monitors
* Wide desktop displays
* Portrait and landscape orientations
* Touch and pointer interaction

The interface must preserve the same product identity and business intent while adapting its **layout, density, interaction model, navigation, content hierarchy, and controls** to the available space.

---

# 2. Core Responsive Principle

> **Design mobile-first, then progressively enhance for larger screens.**

Every component must answer:

1. What is the most important information?
2. What is the most important action?
3. What can be hidden, collapsed, moved, or deferred?
4. What interaction is appropriate for touch?
5. What interaction is appropriate for pointer/keyboard?
6. How does the component behave when width or height changes?

Responsive behavior must be intentional.

---

# 3. Supported Viewport Classes

The implementation must not be tied exclusively to specific device models.

Use fluid layouts with breakpoint-driven transformations.

Recommended test classes:

| Class          | Approximate Width |
| -------------- | ----------------: |
| Small phone    |         320–375px |
| Standard phone |         376–389px |
| Large phone    |         390–430px |
| Small tablet   |         600–767px |
| Tablet         |        768–1024px |
| Laptop         |       1025–1279px |
| Desktop        |       1280–1439px |
| Wide desktop   |           1440px+ |

These are testing ranges, not rigid device requirements.

Components must remain usable at intermediate widths.

---

# 4. No Horizontal Page Overflow

The application must not create unintended horizontal page scrolling.

The following must be checked:

* Page containers
* Header
* Hero
* Content rails
* Cards
* Tables
* Forms
* Dialogs
* Bottom sheets
* Charts
* Player
* Images
* Admin navigation
* Media upload areas

Intentional horizontal scrolling is permitted only for explicitly designed interaction patterns such as:

* Movie rails
* Category rails
* Horizontal chip lists
* Certain mobile carousels

The entire page itself must not overflow horizontally because of layout mistakes.

---

# 5. Responsive Container System

The main content container should remain centered on larger screens while using safe horizontal padding on smaller screens.

Conceptual structure:

```text
Small Mobile
┌─────────────────────┐
│  16px content       │
│                     │
│      CONTENT        │
│                     │
│  16px content       │
└─────────────────────┘

Desktop
┌─────────────────────────────────────────────┐
│                                             │
│      ┌───────────────────────────────┐      │
│      │          CONTENT              │      │
│      │                               │      │
│      └───────────────────────────────┘      │
│                                             │
└─────────────────────────────────────────────┘
```

Use the maximum content width established by the Design System.

Do not allow ultra-wide displays to stretch content indefinitely.

---

# 6. Mobile-First Does Not Mean Mobile-Only

Mobile is the baseline.

Larger screens may progressively introduce:

* Additional navigation
* More columns
* Larger hero composition
* More metadata
* Multi-column forms
* Dense tables
* Sidebars
* Hover interactions
* Richer player controls
* Larger editorial layouts
* Expanded dashboards

Desktop should feel intentionally enhanced rather than merely stretched.

---

# 7. Global Navigation

## 7.1 Desktop

Desktop navigation may contain:

* GIFTEDproMovies branding
* Home
* Movies
* Series
* Categories
* Countries
* DJs/Translators
* Search
* Account
* Subscription-related entry where appropriate

The navigation must remain visually restrained.

Do not overcrowd the header.

---

## 7.2 Mobile

Mobile navigation must be simplified.

Primary navigation should prioritize:

* Brand
* Search
* Account/menu
* Primary discovery destinations

Secondary destinations may move into:

* Mobile menu
* Navigation drawer
* Account menu

Do not attempt to fit the entire desktop navigation into a narrow mobile header.

---

## 7.3 Mobile Menu

The mobile navigation may use a full-height or near-full-height drawer.

It must:

* Trap focus appropriately
* Be keyboard accessible
* Support touch
* Close intentionally
* Preserve navigation context
* Respect safe areas
* Avoid accidental background interaction

---

# 8. Header Transformation

The header must change intentionally between viewport classes.

### Desktop

```text
LOGO   Home Movies Series Categories Countries DJs     Search  Account
```

### Mobile

```text
LOGO                              Search  Menu
```

The mobile header should not simply reduce font size until the desktop header fits.

---

# 9. Homepage Responsiveness

The homepage must preserve the content hierarchy defined in MD-10.

Order remains:

1. Trending Movies
2. Featured Movies
3. New Releases
4. Popular Movies
5. Movies by Categories
6. Movies by Country
7. DJs/Translators Collection

The layout changes by viewport.

---

# 10. Hero Responsiveness

The hero must adapt dramatically to screen size.

## Desktop

May use:

* Large cinematic backdrop
* Poster
* Title
* Metadata
* Description
* CTA group
* Gradient overlays
* Supporting information

## Tablet

Reduce:

* Hero height
* Text width
* Metadata density
* Secondary content

## Mobile

The hero should prioritize:

1. Poster/backdrop
2. Title
3. Essential metadata
4. Short description
5. Primary CTA

Avoid creating an enormous vertical hero that pushes all actual movie discovery far below the fold.

---

# 11. Hero Image Behavior

Hero imagery must remain visually strong without destroying content readability.

The implementation must account for:

* `object-fit`
* Focal point
* Aspect ratio
* Different crop behavior
* Mobile portrait composition
* Desktop landscape composition
* Text-safe areas

The same image may require different positioning at different breakpoints.

Do not assume:

```text
background-position: center
```

will always produce the correct cinematic composition.

---

# 12. Movie Card Responsiveness

Movie cards are one of the most important responsive components.

Poster ratio remains:

> **2:3**

## Desktop

Cards may support:

* Hover scale
* Image zoom
* Metadata reveal
* Watch CTA
* Additional information
* Subtle cinematic interaction

## Tablet

Reduce hover-dependent information.

## Mobile

Do not depend on hover.

Use:

* Tap
* Press
* Card navigation
* Detail-page interaction

The user must always be able to understand what happens when a card is touched.

---

# 13. Movie Grid Responsiveness

Conceptually:

```text
Small Phone
[Card][Card]

Large Phone
[Card][Card]

Tablet
[Card][Card][Card][Card]

Desktop
[Card][Card][Card][Card][Card][Card]
```

Actual column count should be determined by available width and card usability rather than arbitrary device assumptions.

Cards must never become so narrow that:

* Titles become unreadable
* Poster composition becomes poor
* Touch interaction becomes difficult

---

# 14. Content Rails

Content rails remain horizontal discovery surfaces.

## Desktop

Support where appropriate:

* Pointer dragging
* Momentum-like movement
* Navigation arrows
* Hover interactions
* Keyboard navigation

## Mobile

Prioritize:

* Native touch swipe
* Natural horizontal scrolling
* Partial next-card visibility
* Minimal controls

Do not force desktop carousel controls onto mobile unnecessarily.

---

# 15. Rail Overflow

A mobile rail may intentionally extend beyond the viewport:

```text
┌─────────────────────────────┐
│ Movie  Movie  Movie  →      │
└─────────────────────────────┘
```

But the overflow must belong to the rail itself.

It must not cause:

```text
PAGE ─────────────────────────→
```

to overflow.

---

# 16. Search Responsiveness

## Desktop

Search may appear as:

* Header search
* Expanded search field
* Search overlay
* Search page

## Mobile

Search should become a dedicated focused experience.

Prioritize:

* Large touch-friendly input
* Clear button
* Suggestions
* Recent searches
* Keyboard-friendly behavior
* Filter access

Search suggestions must not extend outside the viewport.

---

# 17. Search Results

Desktop may use:

```text
Filters        Results
────────       ─────────────
Content Type   Movie
Category       Movie
Country        Series
DJ             Movie
```

Mobile should transform filters into:

```text
Search
────────────
Results: 24

[ Filters ]

Movie
Movie
Series
Movie
```

Filters should preferably open inside a:

* Bottom sheet
* Full-screen filter surface
* Appropriate mobile dialog

---

# 18. Category, Country and DJ Pages

These pages must use the same responsive discovery architecture.

Desktop may provide:

* Rich headers
* Multiple filter controls
* Larger grids
* Side-by-side discovery sections

Mobile should prioritize:

* Page title
* Active context
* Filter button
* Content grid/rail
* Compact metadata

---

# 19. Movie Details Responsiveness

## Desktop

Recommended structure:

```text
┌──────────────────────────────────────────┐
│              CINEMATIC HERO              │
│                                          │
│ Poster   Title                           │
│          Metadata                        │
│          Description                     │
│          Version                         │
│          Watch   Download                │
└──────────────────────────────────────────┘
```

## Mobile

Transform into:

```text
┌─────────────────────┐
│      BACKDROP       │
│                     │
│      POSTER         │
├─────────────────────┤
│ Title               │
│ Metadata            │
│ Description         │
│                     │
│ DJ / Version        │
│                     │
│ Watch               │
│ Download            │
└─────────────────────┘
```

The mobile layout must not attempt to preserve the exact desktop composition.

---

# 20. Mobile Purchase CTA

For important commerce actions, the interface may use a sticky mobile action area.

Example:

```text
┌─────────────────────────────┐
│ WATCH             LIPA      │
└─────────────────────────────┘
```

The sticky CTA must:

* Respect safe areas
* Not cover important content
* Remain dismissible when appropriate
* Maintain sufficient contrast
* Support keyboard/screen-reader behavior
* Avoid excessive screen occupation

---

# 21. DJ/Translator Version Selection

Desktop may use:

* Horizontal pills
* Selectors
* Side-by-side options

Mobile should use:

* Stacked options
* Compact pills
* Bottom sheet
* Select menu

depending on number of versions.

When the selected version changes:

* Price updates
* Access duration updates
* Version identity updates
* Availability state updates

must remain clearly associated with the selected version.

---

# 22. Series Responsiveness

Series pages must preserve:

```text
Series
  ↓
Season
  ↓
Episodes
```

Desktop may show:

* Season selector
* Episode list
* Episode metadata
* Progress
* Side-by-side content

Mobile should prioritize:

1. Series identity
2. Season selector
3. Episode list
4. Progress
5. Watch action

Episode lists should not become overly dense.

---

# 23. Episode Navigation

On mobile, Previous/Next Episode controls should be easy to reach.

Example:

```text
[ ← Previous ]       [ Next → ]
```

Controls must remain usable with touch.

Do not require precision tapping.

---

# 24. Checkout Responsiveness

Checkout is mobile-first.

## Mobile

Use:

```text
Selected Content
       ↓
Purchase Type
       ↓
Price
       ↓
Access Duration
       ↓
Payment Method
       ↓
LIPA
```

Avoid multi-column checkout layouts on narrow screens.

---

## Desktop

Checkout may use:

```text
┌──────────────────────┬─────────────────────┐
│ Purchase Information │ Order Summary       │
│                      │                     │
│ Payment Method       │ Total               │
│                      │ Access Duration     │
│                      │                     │
│                      │ LIPA                │
└──────────────────────┴─────────────────────┘
```

---

# 25. Payment Method Selection

On mobile, payment providers may be presented through a bottom sheet or full-width selection surface.

The active provider must be visually obvious.

Payment instructions can use Swahili where useful, while the product's navigation and primary content labels remain English.

---

# 26. Player Responsiveness

The player requires special responsive treatment.

## Desktop

May support:

* Large playback surface
* Full control bar
* Keyboard shortcuts
* Settings menus
* Episode navigation
* Theater mode
* Fullscreen
* Picture-in-picture where supported

## Mobile

Prioritize:

* Touch controls
* Large tap targets
* Minimal controls
* Fullscreen
* Orientation handling
* Auto-hide controls

---

# 27. Landscape Mobile Player

The player must support landscape mobile usage.

The interface should respond to:

* Viewport width changes
* Height reduction
* Browser chrome changes
* Fullscreen
* Device orientation

Do not assume mobile is always portrait.

---

# 28. Player Safe Areas

Where relevant, player controls must respect device safe areas.

Avoid placing critical controls directly against:

* Notches
* Rounded corners
* System gesture areas

Use appropriate safe-area-aware spacing.

---

# 29. Library Responsiveness

Desktop may use:

* Multiple content rails
* Larger cards
* Progress indicators
* Filters
* Download management

Mobile should prioritize:

* Continue Watching
* Recently Added
* Your Movies
* Your Series
* Downloads

Each section should remain easy to scan.

---

# 30. Downloads Responsiveness

Desktop may display:

```text
Title | Version | Progress | Status | Action
```

Mobile should transform download rows into cards:

```text
Poster
Movie Title
DJ / Version
Progress
Status
[Resume]
```

Do not force users to horizontally scroll a large desktop table on a phone.

---

# 31. Subscription Responsiveness

Desktop may display several plan cards side-by-side.

Mobile should stack plans vertically.

Example:

```text
┌──────────────────┐
│ Basic             │
│ TZS ...           │
│ ...               │
│ SUBSCRIBE         │
└──────────────────┘

┌──────────────────┐
│ Premium           │
│ TZS ...           │
│ ...               │
│ SUBSCRIBE         │
└──────────────────┘
```

Comparison information must remain understandable without excessive horizontal scrolling.

---

# 32. Account Pages

Account navigation should transform from desktop sidebar/navigation into:

* Compact tabs
* Select menu
* Mobile navigation list
* Accordion where appropriate

The user must always know which account section is active.

---

# 33. Admin Responsiveness

Admin is allowed to become denser on large screens.

Desktop:

```text
Sidebar
   │
   ├── Dashboard
   ├── Movies
   ├── Series
   ├── Users
   ├── Media Team
   ├── Payments
   ├── Sales
   └── Settings
```

Mobile:

```text
Header
   ↓
Menu
   ↓
Content
```

Do not force the complete desktop sidebar into a narrow viewport.

---

# 34. Admin Dashboard

Desktop may use:

* KPI grid
* Charts
* Tables
* Multiple analytical panels
* Content performance

Mobile should transform these into:

* Stacked KPI cards
* Horizontally scrollable chart areas only where necessary
* Compact summaries
* Prioritized tables/cards

Financial information remains Admin-only regardless of viewport.

Responsive design must never weaken role isolation.

---

# 35. Admin Tables

Desktop tables may contain many columns.

Mobile should prefer:

1. Priority columns
2. Card transformation
3. Row expansion
4. Detail drawer
5. Dedicated detail route

Avoid:

> “Just add `overflow-x: auto` to every table.”

Horizontal scrolling is a fallback, not the default responsive strategy.

---

# 36. Media Team Responsiveness

Media Team workflows must remain practical on mobile.

Especially:

* Movie creation
* Series creation
* Episode creation
* Metadata editing
* Uploads
* Preview
* Draft management

Forms must transform from multi-column desktop layouts into stacked mobile sections.

---

# 37. Media Upload on Mobile

The upload interface must explicitly support mobile usage.

Possible interaction:

```text
[ Select File ]
      ↓
Preparing
      ↓
Uploading
      ↓
Processing
      ↓
Completed
```

Upload progress must remain visible.

The UI must not assume:

* Desktop drag-and-drop
* Mouse hover
* Large screen
* Permanent high-speed network

Touch-friendly file selection must be supported.

---

# 38. Forms

Desktop may use:

```text
First Name       Last Name
Email            Phone
Category         Country
```

Mobile:

```text
First Name

Last Name

Email

Phone

Category

Country
```

Forms must maintain logical grouping.

Do not make fields unnecessarily narrow just to keep two columns.

---

# 39. Form Actions

Desktop may place actions horizontally:

```text
[Cancel] [Save Draft] [Publish]
```

Mobile may stack or prioritize:

```text
[Publish]

[Save Draft]

Cancel
```

The primary action must remain visually obvious.

---

# 40. Dialog Responsiveness

Desktop:

* Centered modal
* Controlled width

Mobile:

* Bottom sheet
* Full-width dialog
* Near-full-screen modal

depending on interaction complexity.

Dialogs must not exceed the viewport.

---

# 41. Bottom Sheets

Bottom sheets are preferred for mobile interactions such as:

* Filters
* Payment provider selection
* Version selection
* Sort options
* Additional actions

They must support:

* Clear dismissal
* Keyboard/focus behavior
* Touch gestures where appropriate
* Safe areas
* Scrollable content when necessary

---

# 42. Touch Interaction

Touch targets must be sufficiently large and separated.

Do not rely on:

* Tiny icons
* Hover-only menus
* Precision cursor movement
* Right-click
* Tooltips as the only explanation

Every important action must have an accessible touch equivalent.

---

# 43. Hover Behavior

Hover is progressive enhancement.

Desktop may use:

* Card hover
* Button hover
* Navigation hover
* Preview interactions
* Subtle magnetic interaction
* Cursor-aware effects

Mobile must never require hover for:

* Watching
* Downloading
* Purchasing
* Opening details
* Selecting a version
* Opening navigation
* Accessing account functionality

---

# 44. Typography Responsiveness

Typography must scale intentionally.

Do not simply use desktop font sizes everywhere.

Use:

* Design tokens
* Breakpoint adjustments
* Fluid sizing where appropriate
* Controlled line lengths

Large hero typography should reduce on smaller screens.

Body text must remain readable.

Avoid extremely long lines on desktop.

---

# 45. Responsive Spacing

Spacing should compress gradually.

Conceptually:

```text
Desktop
Section
   ↓
Large spacing
   ↓
Content

Mobile
Section
 ↓
Moderate spacing
 ↓
Content
```

Do not preserve large desktop whitespace on small screens.

At the same time, do not make mobile layouts feel cramped.

---

# 46. Image Responsiveness

Images must be optimized for their rendered size.

Use responsive image loading where supported.

Do not automatically load:

> Huge desktop hero assets on small mobile screens.

Images must support:

* Appropriate dimensions
* Lazy loading where appropriate
* Priority loading for above-the-fold content
* Correct aspect ratio
* Proper cropping
* Stable layout dimensions

---

# 47. Poster Ratio

Movie and series posters retain:

> **2:3**

This ratio must remain consistent throughout:

* Homepage
* Search
* Category pages
* Country pages
* DJ pages
* Library
* Admin previews
* Media Team previews
* Related content

The card may change size, but the visual ratio should remain stable.

---

# 48. Responsive Content Density

The same amount of information does not need to be displayed at every viewport.

### Desktop

Can show:

* More metadata
* Secondary actions
* Additional statistics
* Supporting descriptions

### Mobile

Prioritize:

* Identity
* Essential metadata
* Primary action

Secondary information can move behind:

* Detail pages
* Expanders
* Menus
* Secondary sections

---

# 49. Responsive Pagination

Desktop may use traditional pagination.

Mobile may use:

* Compact pagination
* Previous/Next
* Load more
* Infinite scrolling where appropriate

Do not introduce infinite scrolling merely because it is fashionable.

The chosen pattern must preserve usability and navigation context.

---

# 50. Responsive Loading States

Skeletons must reflect the responsive layout.

A desktop skeleton must not simply shrink into mobile.

Examples:

* Mobile card skeleton
* Desktop card skeleton
* Mobile hero skeleton
* Desktop hero skeleton
* Mobile table/card skeleton
* Mobile upload progress skeleton

Loading states should prevent major layout shifts.

---

# 51. Responsive Empty States

Empty states must remain useful at every width.

Mobile should not display:

* Huge empty illustrations
* Excessive copy
* Oversized buttons

Prioritize:

```text
Message
Short explanation
Primary action
```

---

# 52. Responsive Error States

Errors must remain:

* Visible
* Understandable
* Recoverable

Mobile error UI should not require horizontal scrolling.

Primary recovery actions must be touch-friendly.

---

# 53. Orientation Changes

Components must remain stable when the device rotates.

Important areas:

* Player
* Checkout
* Movie details
* Forms
* Upload
* Dialogs
* Navigation

Do not assume a component will only render once at a fixed viewport size.

---

# 54. Mobile Browser Height Changes

Mobile browsers may change the visible viewport when:

* Address bars appear/disappear
* Keyboard opens
* Orientation changes
* Fullscreen changes

Avoid hard-coded viewport heights that cause content to become inaccessible.

Use modern viewport-aware CSS behavior where appropriate.

---

# 55. Keyboard Responsiveness

When a mobile keyboard opens:

* Inputs must remain visible
* Submit actions must remain reachable
* Bottom sheets must adapt
* Fixed elements must not obscure focused fields

Search, login, registration, checkout, and admin forms require particular attention.

---

# 56. Accessibility Across Screen Sizes

Responsive design must preserve accessibility.

Verify:

* Keyboard navigation
* Visible focus
* Screen-reader labels
* Logical DOM order
* Touch target size
* Contrast
* Zoom support
* Reduced motion
* No information hidden only because viewport is small

Do not use responsive CSS to remove information that is required for understanding or completing an action.

---

# 57. Reduced Motion

All responsive layouts must respect:

```text
prefers-reduced-motion
```

When reduced motion is enabled:

* Disable unnecessary transforms
* Reduce parallax
* Remove strong card movement
* Reduce page transitions
* Reduce animated sheets
* Preserve functionality

This applies to mobile and desktop.

---

# 58. Responsive Motion

Motion may change by viewport.

Desktop may support:

* Hover scale
* Magnetic buttons
* Cursor-aware effects
* Richer transitions

Mobile should prioritize:

* Tap feedback
* Press states
* Short transitions
* Simple sheets
* Controlled page transitions

Never port every desktop animation directly to mobile.

---

# 59. Performance Requirements

Responsive design must also be performance-aware.

Prioritize:

* Responsive images
* Lazy loading
* Code splitting
* Route-level loading
* Minimal client-side JavaScript
* Efficient animation
* Avoiding unnecessary re-renders
* Avoiding large desktop assets on mobile
* Efficient list rendering
* Stable layout dimensions

Do not load functionality simply because another viewport uses it.

---

# 60. Server/Client Component Discipline

Where Next.js Server Components are appropriate, keep them server-rendered.

Use Client Components only when interaction requires browser state or APIs.

Responsive CSS should not be implemented through unnecessary JavaScript viewport detection.

Avoid patterns such as:

```text
if (window.innerWidth < 768) {
   render mobile
}
```

unless there is a genuine interaction or runtime requirement.

Prefer CSS and responsive layout primitives for visual adaptation.

---

# 61. Avoid JavaScript-Driven Responsiveness

Do not create duplicated mobile and desktop components simply because layouts differ slightly.

Prefer:

```text
Same component
      ↓
Responsive CSS/layout
      ↓
Different presentation
```

Create separate structures only when the interaction model genuinely differs.

---

# 62. Desktop vs Mobile Component Duplication

Duplication is justified only when:

* Information architecture changes significantly
* Interaction model is fundamentally different
* Accessibility would suffer from forcing one structure
* Performance requires a different implementation

Even then, share:

* Data models
* Business logic
* Validation
* State contracts
* Visual tokens
* Component primitives

---

# 63. Responsive Navigation State

Navigation state must survive viewport changes.

Example:

```text
Desktop
Account Menu Open
        ↓
Viewport Changes
        ↓
Mobile
Account Context Preserved
```

Do not create inconsistent navigation state after resizing.

---

# 64. Responsive URL State

Search/filter/sort state remains URL-addressable regardless of viewport.

Example:

```text
/search?q=action&country=nigeria&type=movie
```

Mobile and desktop must represent the same discovery state.

The UI may present the controls differently.

---

# 65. Responsive Role Isolation

Responsive transformation must never change permissions.

For example:

```text
ADMIN desktop
    ↓
ADMIN mobile
```

Both retain Admin privileges.

Likewise:

```text
MEDIA TEAM desktop
    ↓
MEDIA TEAM mobile
```

must never expose:

* Revenue
* Sales
* Sensitive payment information

merely because of a responsive layout implementation mistake.

---

# 66. Customer Privacy

Responsive layouts must not accidentally expose:

* Another customer's library
* Another customer's orders
* Payment information
* Protected media URLs
* Sensitive account data

Small-screen layout is not an excuse to simplify security boundaries.

---

# 67. Responsive Charts

Admin charts must adapt.

Desktop:

* Larger analytical charts
* Multiple dimensions
* Rich legends

Mobile:

* Reduced complexity
* Scrollable chart region where necessary
* Simplified labels
* Summary metrics

Do not create unreadable tiny charts just to preserve desktop dimensions.

---

# 68. Responsive Data Tables

Priority strategy:

```text
Desktop:
Full table

Tablet:
Reduced table

Mobile:
Card / Detail / Expand
```

If horizontal scrolling is unavoidable, it must be:

* Deliberate
* Visually obvious
* Touch-friendly
* Contained to the table
* Not page-wide

---

# 69. Responsive Account Menu

Desktop may use:

* Popover
* Dropdown

Mobile may use:

* Bottom sheet
* Drawer
* Dedicated account page

The interaction should match the available space.

---

# 70. Responsive Footer

The footer should not dominate mobile screens.

Desktop may use grouped navigation.

Mobile may use:

* Stacked groups
* Accordions
* Compact links

Do not create excessive vertical footer content.

---

# 71. Responsive Scroll Behavior

Scrolling should feel natural.

Avoid:

* Nested scroll containers without reason
* Locked body scroll
* Sticky elements covering content
* Scroll traps
* Unexpected scroll jumps

Horizontal scrolling should be reserved for components designed for it.

---

# 72. Sticky Elements

Sticky UI may be used for:

* Mobile purchase CTA
* Player controls
* Admin table controls
* Filter controls
* Important navigation

But sticky elements must not stack into a large portion of the viewport.

---

# 73. Responsive Modals and Drawers

Every modal must define:

* Desktop presentation
* Tablet presentation
* Mobile presentation
* Maximum height
* Overflow behavior
* Keyboard behavior
* Touch behavior
* Close behavior

Never allow modal content to become inaccessible.

---

# 74. Responsive Accessibility Testing

At minimum test:

### Small phone

* 320px
* 360px

### Common phone

* 390px
* 430px

### Tablet

* 768px
* 834px
* 1024px

### Desktop

* 1280px
* 1440px
* 1920px

Also test between these widths.

---

# 75. Required Responsive QA Matrix

| Area          | Mobile | Tablet | Desktop |
| ------------- | ------ | ------ | ------- |
| Header        | ✓      | ✓      | ✓       |
| Navigation    | ✓      | ✓      | ✓       |
| Homepage      | ✓      | ✓      | ✓       |
| Hero          | ✓      | ✓      | ✓       |
| Movie Cards   | ✓      | ✓      | ✓       |
| Rails         | ✓      | ✓      | ✓       |
| Search        | ✓      | ✓      | ✓       |
| Filters       | ✓      | ✓      | ✓       |
| Movie Details | ✓      | ✓      | ✓       |
| Series        | ✓      | ✓      | ✓       |
| Checkout      | ✓      | ✓      | ✓       |
| Player        | ✓      | ✓      | ✓       |
| Library       | ✓      | ✓      | ✓       |
| Downloads     | ✓      | ✓      | ✓       |
| Subscription  | ✓      | ✓      | ✓       |
| Admin         | ✓      | ✓      | ✓       |
| Media Team    | ✓      | ✓      | ✓       |
| Forms         | ✓      | ✓      | ✓       |
| Dialogs       | ✓      | ✓      | ✓       |
| Upload        | ✓      | ✓      | ✓       |

---

# 76. Responsive QA Checklist

Before considering a responsive feature complete, verify:

* [ ] No unintended horizontal page overflow
* [ ] No desktop-only interaction is required on mobile
* [ ] Touch targets are usable
* [ ] Header transforms correctly
* [ ] Navigation transforms correctly
* [ ] Hero remains readable
* [ ] Cards remain usable
* [ ] Rails swipe correctly
* [ ] Search works correctly
* [ ] Filters are usable
* [ ] Forms stack correctly
* [ ] Dialogs fit the viewport
* [ ] Bottom sheets respect safe areas
* [ ] Checkout remains usable
* [ ] Player works in portrait
* [ ] Player works in landscape
* [ ] Library remains scannable
* [ ] Downloads remain manageable
* [ ] Subscription plans remain understandable
* [ ] Admin tables transform appropriately
* [ ] Admin financial data remains restricted
* [ ] Media Team upload works on mobile
* [ ] Loading states match layout
* [ ] Empty states remain useful
* [ ] Error states remain recoverable
* [ ] Keyboard remains usable
* [ ] Screen readers retain logical structure
* [ ] Reduced motion works
* [ ] Images load appropriately
* [ ] No unnecessary mobile JavaScript exists
* [ ] No layout-breaking viewport assumptions exist

---

# 77. Responsive Anti-Patterns

The coding agent MUST NOT implement:

### ❌ Shrunk desktop

```text
Desktop layout
     ↓
scale(0.6)
     ↓
Mobile
```

### ❌ Hover-dependent mobile UI

```text
Hover card
     ↓
Important information
```

when no equivalent touch interaction exists.

### ❌ Page-wide horizontal scrolling

```text
body
──────────────→
```

### ❌ Tiny desktop tables on mobile

### ❌ Desktop sidebar squeezed into mobile

### ❌ Huge desktop hero preserved on phones

### ❌ Fixed heights that break when the keyboard opens

### ❌ Desktop assets loaded unnecessarily on mobile

### ❌ JavaScript `window.innerWidth` for ordinary responsive layout

### ❌ Duplicate entire applications for mobile and desktop

### ❌ Removing important functionality purely because the screen is small

---

# 78. Responsive Design Philosophy

The product should feel like:

> **One GIFTEDproMovies experience intelligently adapting to different environments.**

Not:

> “Desktop website”

and:

> “Mobile version”

as two unrelated products.

Brand identity remains constant.

Interaction adapts.

Information hierarchy adapts.

Density adapts.

Layout adapts.

---

# 79. Responsive Architecture

Conceptually:

```text
                 GIFTEDproMovies
                          │
                    Shared Domain
                          │
                  Shared Components
                          │
             ┌────────────┴────────────┐
             │                         │
       Responsive Layout        Responsive Interaction
             │                         │
      ┌──────┴──────┐           ┌──────┴──────┐
      │             │           │             │
   Mobile        Desktop      Touch        Pointer
      │             │           │             │
      └─────────────┴───────────┴─────────────┘
                          │
                    Same Product Rules
```

Responsive behavior belongs primarily to presentation and interaction layers.

Business rules remain shared.

---

# 80. Business Rules Must Not Change With Viewport

These remain identical across devices:

* Movie pricing
* Download pricing
* Streaming pricing
* Access duration
* Subscription eligibility
* Individual purchase entitlement
* DJ/version ownership
* Series pricing model
* Role permissions
* Admin financial visibility
* Media Team restrictions
* Content availability

Only the presentation and interaction model may change.

---

# 81. Responsive State Consistency

A user must be able to:

```text
Desktop
   ↓
Search
   ↓
Select filters
   ↓
Open movie
   ↓
Resize browser
   ↓
Continue interaction
```

without losing important state unnecessarily.

The same principle applies to:

* Checkout
* Search
* Filters
* Player
* Library
* Account
* Admin forms

---

# 82. Responsive Performance Principle

> **Small screens are not permission to ship large experiences inefficiently.**

Especially on mobile:

* Reduce unnecessary assets
* Avoid excessive client JavaScript
* Avoid continuous animation
* Lazy-load below-the-fold content
* Optimize image dimensions
* Keep interaction responsive
* Avoid expensive DOM structures

---

# 83. Responsive Definition of Done

A responsive feature is complete only when:

1. It works on small phones.
2. It works on common phones.
3. It works on tablets.
4. It works on desktop.
5. It works at intermediate widths.
6. It does not depend on hover for critical functionality.
7. It does not introduce page-wide horizontal overflow.
8. It preserves accessibility.
9. It respects reduced motion.
10. It maintains product/business rules.
11. It uses the established Design System.
12. It does not duplicate unnecessary logic.
13. It performs appropriately across viewport classes.
14. It survives orientation and viewport-height changes where relevant.
15. It has been manually tested at representative widths.

---

# 84. AI Coding Agent Directive

The coding agent MUST treat this document as an implementation contract.

The agent MUST NOT:

* Build desktop first and “fix mobile later”
* Treat mobile as a scaled desktop
* Invent breakpoint behavior
* Introduce arbitrary device-specific hacks
* Use hover as a required mobile interaction
* Create page-wide horizontal overflow
* Duplicate entire page implementations unnecessarily
* Remove important functionality without explicit instruction
* Change business rules for mobile
* Expose Admin-only information in another role
* Expose Media Team financial information
* Introduce viewport-specific business logic
* Use arbitrary hard-coded widths/heights that break responsiveness

When implementing a component, the agent must explicitly consider:

```text
Mobile
Tablet
Desktop
Touch
Pointer
Keyboard
Orientation
Reduced Motion
Accessibility
Performance
```

If responsive behavior is ambiguous and cannot be reasonably inferred from the existing documentation, **STOP and ask for clarification rather than inventing product behavior.**

---

# 85. Final Product Standard

GIFTEDproMovies must feel premium regardless of device.

On mobile:

> **Compact, cinematic, touch-first, focused.**

On tablet:

> **Balanced, spacious, adaptive.**

On desktop:

> **Immersive, editorial, information-rich.**

On wide displays:

> **Premium, centered, controlled — never stretched into emptiness.**

The goal is not maximum information density.

The goal is:

> **Maximum usability within the available space.**

---

# 86. Document Dependencies

This document builds upon:

* `00_PROJECT_RULES.md`
* `01_TECH_STACK.md`
* `02_DESIGN_SYSTEM.md`
* `03_VISUAL_LANGUAGE.md`
* `04_MOTION_SYSTEM.md`
* `05_FRONTEND_ARCHITECTURE.md`
* `06_ROUTE_MAP.md`
* `07_COMPONENT_ARCHITECTURE.md`
* `08_DATA_MODELS.md`
* `09_MOCK_DATA_CONTRACT.md`
* `10_PUBLIC_EXPERIENCE.md`
* `11_SEARCH_DISCOVERY.md`
* `12_MOVIE_DETAILS.md`
* `13_SERIES_EXPERIENCE.md`
* `14_AUTH_UI.md`
* `15_CUSTOMER_LIBRARY.md`
* `16_PURCHASE_FLOW.md`
* `17_STREAMING_UI.md`
* `18_DOWNLOAD_UI.md`
* `19_SUBSCRIPTION_UI.md`
* `20_ADMIN_UI.md`
* `21_MEDIA_TEAM_UI.md`

This document establishes responsive behavior for all of them.

---

# 87. Next Document

The next document is:

```text
23_ACCESSIBILITY.md
```

It will define the accessibility architecture and implementation requirements for GIFTEDproMovies across Customer, Admin, Media Team, player, checkout, forms, navigation, motion, keyboard interaction, screen readers, focus management, contrast, and assistive technology.
