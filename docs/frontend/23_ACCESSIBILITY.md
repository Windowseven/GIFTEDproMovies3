# GIFTEDproMovies

## Accessibility & Inclusive Experience Specification

**Document ID:** MD-23
**File:** `docs/23_ACCESSIBILITY.md`
**Version:** 1.0
**Status:** Frontend Implementation Contract
**Scope:** Frontend only
**Applies To:** Customer, Admin, Media Team

---

# 1. Purpose

This document defines the accessibility requirements for GIFTEDproMovies.

Accessibility is a core product requirement, not a final testing step.

The platform must remain usable across:

* Keyboard navigation
* Screen readers
* Touch devices
* Pointer devices
* Different viewport sizes
* Different zoom levels
* Reduced-motion preferences
* Users with visual, motor, auditory, or cognitive accessibility needs

The goal is not to make the interface visually impressive while technically inaccessible.

The goal is:

> **A premium interface that remains understandable, navigable, and usable without depending on one specific ability or interaction method.**

---

# 2. Accessibility Principle

Every important action must have an accessible path.

If an interaction exists through:

```text
Mouse
```

there must be an equivalent through:

```text
Keyboard / Touch / Assistive Technology
```

where applicable.

Never make a critical action available only through:

* Hover
* Dragging
* Mouse movement
* Color
* Animation
* Sound

---

# 3. Accessibility Baseline

The implementation should target modern accessibility best practices and aim for **WCAG 2.2 AA-level behavior** where applicable.

The coding agent must not treat accessibility as:

> “Add some ARIA attributes.”

Accessibility must be achieved through:

1. Semantic HTML
2. Correct document structure
3. Keyboard behavior
4. Focus management
5. Accessible names
6. Color and contrast
7. State communication
8. Responsive interaction
9. Motion preferences
10. Assistive technology compatibility

---

# 4. Semantic HTML First

Use semantic HTML before adding ARIA.

Preferred elements include:

```text
<header>
<nav>
<main>
<section>
<article>
<aside>
<footer>
<button>
<a>
<form>
<label>
<input>
<select>
<textarea>
```

Do not replace native elements with generic `<div>` elements unnecessarily.

Bad:

```text
<div onClick={...}>Watch</div>
```

Preferred:

```text
<button>Watch</button>
```

or:

```text
<a href="/watch/...">Watch</a>
```

depending on the action.

---

# 5. Links vs Buttons

Use the correct interaction element.

### Use `<a>` when:

The action navigates to another location.

Examples:

* Movie details
* Search results
* Category page
* Country page
* DJ page
* Account page

### Use `<button>` when:

The action changes UI state.

Examples:

* Play
* Pause
* Open filter
* Open menu
* Select version
* Toggle favorite
* Open payment method
* Retry download

Do not use buttons for navigation when a link is more semantically correct.

---

# 6. Page Structure

Every page should have a clear structural hierarchy.

Conceptually:

```text
<body>
 ├── Header
 ├── Navigation
 └── Main
      ├── Page heading
      ├── Primary content
      └── Supporting content
 └── Footer
```

There should generally be one clear primary page heading.

Heading hierarchy must represent content structure rather than visual size.

---

# 7. Heading Hierarchy

Use headings logically:

```text
H1
 ├── H2
 │    ├── H3
 │    └── H3
 └── H2
```

Do not skip heading levels purely to achieve a desired font size.

Visual appearance should be controlled through CSS.

---

# 8. Landmark Navigation

Important page regions should use recognizable landmarks.

Examples:

* Header
* Navigation
* Main
* Complementary
* Footer

Users of screen readers must be able to understand the page structure without listening to every visual element.

---

# 9. Skip Navigation

The application should provide a keyboard-accessible skip mechanism.

Example concept:

```text
Skip to main content
```

It may remain visually hidden until focused.

The first meaningful keyboard interaction should allow users to bypass repetitive navigation.

---

# 10. Keyboard Navigation

All interactive functionality must be usable with a keyboard.

Users must be able to:

* Open navigation
* Search
* Open movie cards
* Select filters
* Choose versions
* Start playback
* Open player settings
* Purchase content
* Navigate checkout
* Manage downloads
* Use account pages
* Operate Admin interfaces
* Operate Media Team interfaces

No critical feature may require a mouse.

---

# 11. Logical Tab Order

Keyboard focus must follow the visual and semantic order of the page.

Avoid manipulating tab order unnecessarily.

Do not use large collections of:

```text
tabIndex={1}
tabIndex={2}
tabIndex={3}
```

Prefer natural DOM order.

Use `tabIndex={0}` only when genuinely necessary.

Avoid positive tabindex values.

---

# 12. Visible Focus

Keyboard focus must always be visible.

Do not globally remove:

```text
outline: none;
```

without providing an equivalent focus indicator.

Focus indicators should be:

* Clearly visible
* High contrast
* Consistent
* Not dependent solely on color

Brand styling may use:

* Crimson
* Gold
* Light neutral focus rings

provided sufficient contrast is maintained.

---

# 13. Focus vs Hover

Focus must provide an equivalent visual state to hover where hover reveals important information.

Example:

```text
Desktop:
Hover movie card
      ↓
Reveal actions

Keyboard:
Focus movie card
      ↓
Reveal/focus actions
```

Never hide important actions exclusively behind hover.

---

# 14. Movie Card Accessibility

Every MovieCard must have an accessible name.

A screen reader should understand something similar to:

```text
Movie title
Country
Category
DJ/Translator
Available for streaming and download
```

Do not rely on the poster image alone.

The card must provide a meaningful interactive target.

---

# 15. Poster Images

Decorative images should not create unnecessary screen-reader noise.

For meaningful movie artwork, use appropriate alternative text.

Example concept:

```text
alt="Poster for [Movie Title]"
```

Do not use:

```text
alt="image"
alt="movie"
alt="poster"
```

when the actual content identity is available.

---

# 16. Decorative Images

If an image contributes no information, it should be treated as decorative.

Do not force screen readers to announce:

* Background textures
* Decorative gradients
* Glows
* Shadows
* Purely visual separators

---

# 17. Hero Accessibility

The cinematic hero must remain understandable without relying on the background image.

Essential information must exist as actual text:

* Movie title
* Description
* Metadata
* CTA
* Availability

Do not embed critical text directly inside an image.

---

# 18. Color Must Not Be the Only Signal

Never communicate state using color alone.

Bad:

```text
Green = Available
Red = Failed
Yellow = Pending
```

Instead combine:

* Color
* Text
* Icon
* Shape/status indicator

Example:

```text
✓ Payment Successful
```

not merely:

```text
[green indicator]
```

---

# 19. Brand Color Accessibility

The GIFTEDproMovies palette must be used carefully.

Primary brand colors:

```text
Crimson  #B11226
Gold     #D6A84F
```

must not automatically be assumed to have sufficient contrast in every combination.

Text/background combinations must be checked individually.

Do not place low-contrast gray text on dark surfaces merely because it looks subtle.

---

# 20. Text Contrast

Primary content must remain highly readable.

Pay particular attention to:

* Secondary metadata
* Placeholder text
* Disabled states
* Small labels
* Prices
* Status badges
* Player controls
* Admin table text
* Mobile sticky CTA text

Muted text must not become unreadable.

---

# 21. Text Resize and Zoom

The UI must remain usable when users increase browser zoom.

Do not design the application around the assumption that:

```text
100% zoom
```

is the only valid configuration.

Test:

* 100%
* 125%
* 150%
* 200%

where practical.

The interface must avoid unnecessary content loss or overlapping elements.

---

# 22. Responsive Accessibility

Accessibility must survive responsive transformations.

For example:

```text
Desktop sidebar
       ↓
Mobile menu
```

must remain keyboard and screen-reader accessible.

Likewise:

```text
Desktop modal
       ↓
Mobile bottom sheet
```

must preserve:

* Accessible name
* Focus management
* Close behavior
* Content access
* Keyboard behavior

---

# 23. Touch Target Requirements

Interactive controls must have sufficiently large touch areas.

Avoid tiny controls such as:

```text
[×]
```

that require precision tapping.

Important mobile actions include:

* Watch
* Download
* LIPA
* Search
* Menu
* Filter
* Version selection
* Player controls
* Next/Previous episode
* Retry

These must be comfortable to operate.

---

# 24. Touch Spacing

Touch targets must not be packed so tightly that users accidentally activate neighboring actions.

Particular attention:

* Player controls
* Header actions
* Mobile navigation
* Download actions
* Admin actions
* Filter chips
* Version selectors

---

# 25. Forms

Every form control must have an accessible label.

Preferred:

```text
<label>
  Email
  <input />
</label>
```

or equivalent programmatic association.

Do not rely solely on placeholder text as a label.

---

# 26. Form Labels

Labels must clearly describe the expected value.

Good:

```text
Email address
Password
Movie title
Release year
Streaming price
Download price
Access duration
```

Avoid vague labels such as:

```text
Value
Input
Data
Info
```

---

# 27. Required Fields

Required fields must be communicated semantically and visually.

Do not rely only on:

```text
*
```

Provide an accessible indication that the field is required.

---

# 28. Validation Errors

Validation errors must be:

* Clear
* Specific
* Associated with the relevant field
* Easy to discover
* Recoverable

Bad:

```text
Invalid input.
```

Better:

```text
Enter a valid email address.
```

The screen reader should also receive the error association.

---

# 29. Form Error Summary

For complex Admin and Media Team forms, a validation summary may be provided.

Example:

```text
Please correct 3 fields:

• Movie title is required.
• Streaming price is required.
• Country must be selected.
```

Each error should allow navigation to the relevant field.

---

# 30. Loading States

Loading states must be communicated to assistive technology where appropriate.

Visual skeletons alone are not enough for important asynchronous operations.

Examples:

```text
Loading movies…
Loading search results…
Checking access…
Processing payment…
Uploading media…
```

---

# 31. Skeleton Accessibility

Skeleton UI should not cause screen readers to announce dozens of meaningless placeholder elements.

Decorative skeletons should generally be hidden from assistive technology.

Provide a meaningful loading status instead.

---

# 32. Empty States

Empty states must be understandable without relying on illustration.

Example:

```text
Your Library is empty.

Movies and series you purchase or access through your
subscription will appear here.

[Browse Movies]
```

The illustration is secondary.

---

# 33. Error States

Error messages must explain:

1. What happened
2. What the user can do

Example:

```text
We couldn't load your downloads.

Please try again.

[Retry]
```

Avoid exposing raw technical errors.

---

# 34. Async Status Updates

Operations such as:

* Payment
* Download
* Upload
* Search
* Playback authorization

may change without full page navigation.

Important status changes should be communicated appropriately.

Examples:

```text
Payment pending
Download completed
Upload failed
Access expired
```

---

# 35. Toast Notifications

Toast notifications must not be the only way important information is communicated.

If a toast contains critical information:

* It should be accessible
* It should not disappear too quickly
* Important state should also exist in the page/interface

Do not require users to catch a notification before it disappears.

---

# 36. Dialog Accessibility

Every dialog must have:

* Accessible name
* Appropriate description where necessary
* Correct focus entry
* Correct focus return
* Keyboard close behavior
* Screen-reader isolation from background content

---

# 37. Dialog Focus Flow

Conceptually:

```text
Open Dialog
     ↓
Focus moves into Dialog
     ↓
User interacts
     ↓
Dialog closes
     ↓
Focus returns to trigger
```

Never leave keyboard focus lost somewhere on the page.

---

# 38. Modal Escape Behavior

Where appropriate, pressing:

```text
Escape
```

should close a dismissible dialog.

Exceptions must be intentional.

---

# 39. Bottom Sheet Accessibility

Mobile bottom sheets must behave like accessible dialogs or appropriate disclosure surfaces.

They must:

* Have a clear name
* Manage focus
* Provide a clear close mechanism
* Avoid inaccessible background interaction
* Remain scrollable
* Respect keyboard behavior

---

# 40. Navigation Drawer Accessibility

When mobile navigation opens:

* Focus should move appropriately
* Background interaction should be controlled
* Close action must be accessible
* Escape should close where appropriate
* Focus should return to the trigger

---

# 41. Search Accessibility

Search input must have a clear accessible label.

Example:

```text
Search movies, series, DJs, categories, or countries
```

Search suggestions must be understandable to keyboard and assistive technology users.

---

# 42. Search Suggestions

Keyboard behavior should support:

```text
Arrow Down
Arrow Up
Enter
Escape
```

where the interaction model provides suggestions.

The currently highlighted suggestion must be communicated.

---

# 43. Filter Accessibility

Filters must expose:

* Filter name
* Current state
* Selected values
* Clear action

Example:

```text
Country
Nigeria selected
```

not merely a colored chip.

---

# 44. Filter Bottom Sheet

On mobile:

```text
Filters
────────────
Content Type
Category
Country
DJ / Translator

[Clear All]
[Apply Filters]
```

Focus and keyboard behavior must remain predictable.

---

# 45. Movie Version Selector

DJ/Translator versions must be accessible.

The user should understand:

* Version name
* DJ/Translator
* Streaming price
* Download price
* Access duration
* Availability
* Selected state

Do not communicate selection using color alone.

---

# 46. Watch and Download Actions

Watch and Download must have clear accessible names.

Avoid ambiguous icon-only controls.

Bad:

```text
[▶] [↓]
```

Better:

```text
[Watch]
[Download]
```

Icons may support the text.

---

# 47. LIPA Accessibility

The primary payment CTA must have a meaningful accessible label.

Example:

```text
LIPA TZS 3,000
```

is more informative than:

```text
LIPA
```

when the price is already known.

The exact label may adapt to the selected purchase.

---

# 48. Subscription Accessibility

Subscription plans must communicate:

* Plan name
* Price
* Duration
* Scope
* Included access
* Streaming/download availability
* Current status

Do not make comparison dependent only on visual positioning.

---

# 49. Pricing Accessibility

Prices must be represented as readable text.

Do not rely on:

* Color
* Font size alone
* Visual hierarchy alone

Users must understand the difference between:

```text
Streaming Price
Download Price
```

and any applicable access duration.

---

# 50. Checkout Accessibility

Checkout must provide a clear sequence:

```text
Selected content
        ↓
Purchase type
        ↓
Version
        ↓
Price
        ↓
Access duration
        ↓
Payment method
        ↓
LIPA
```

The user must be able to understand what they are paying for before submitting.

---

# 51. Payment Status Accessibility

Payment states must be communicated through text.

Examples:

```text
Payment pending
Payment successful
Payment failed
Payment cancelled
```

Do not use animation or color alone.

---

# 52. Player Accessibility

The player must be accessible through keyboard and assistive technology.

Important controls include:

* Play/Pause
* Seek
* Volume
* Mute
* Fullscreen
* Captions/Subtitles
* Audio
* Quality
* Settings
* Next episode
* Previous episode

Every control requires a meaningful accessible name.

---

# 53. Player Control Labels

Do not rely on icon recognition.

Examples:

```text
Play
Pause
Mute
Unmute
Fullscreen
Exit fullscreen
Settings
Subtitles
Next episode
Previous episode
```

---

# 54. Player Keyboard Controls

Where supported, keyboard interaction should provide predictable controls.

Potential controls include:

```text
Space       Play/Pause
Arrow keys  Seek/Volume
M            Mute
F           Fullscreen
Escape      Exit fullscreen/dialog
```

The exact shortcuts must not conflict with normal browser or assistive technology behavior.

Keyboard shortcuts should be documented or discoverable where necessary.

---

# 55. Player Auto-Hide Controls

Auto-hiding player controls must not make keyboard users lose access.

When the user:

* Focuses a control
* Uses keyboard navigation
* Opens a settings menu

the controls must remain available.

---

# 56. Captions and Subtitles

When subtitle/caption functionality exists, it must be accessible.

The UI should distinguish:

* Subtitles
* Captions
* Audio tracks

Do not rely only on tiny icons.

---

# 57. Audio Accessibility

Where multiple audio tracks exist, the selector must expose the track name.

Example:

```text
Audio
English
Swahili
```

If DJ/Translator versions represent different media versions, the version identity must remain clear.

---

# 58. Player Status

Important player states must be communicated:

```text
Loading
Buffering
Playing
Paused
Playback failed
Access expired
Content unavailable
```

Do not communicate buffering only through a spinning animation.

---

# 59. Download Accessibility

Download states must be readable.

Examples:

```text
Preparing download
Downloading — 54%
Download paused
Download completed
Download failed
Download expired
```

Progress must not rely solely on animation.

---

# 60. Progress Indicators

Progress bars should have accessible semantics when they represent measurable progress.

Examples:

* Upload progress
* Download progress
* Playback progress
* Processing progress

Where the exact progress value is available, expose it appropriately.

---

# 61. Admin Accessibility

Admin interfaces must receive the same accessibility standard as customer pages.

Important areas:

* Dashboard
* KPI cards
* Charts
* Tables
* Filters
* Forms
* Uploads
* Dialogs
* Navigation
* User management
* Content management

“Internal dashboard” does not mean accessibility can be ignored.

---

# 62. Admin Tables

Tables must have:

* Correct headers
* Meaningful row/column relationships
* Keyboard-accessible actions
* Accessible sorting controls
* Clear pagination
* Understandable status values

On mobile card transformations, the semantic relationships between data points must remain understandable.

---

# 63. Admin Charts

Charts must not be the only representation of important information.

Where meaningful:

```text
Chart
+
Summary value
+
Accessible textual explanation
```

Example:

```text
Revenue
TZS 4,850,000

Revenue increased compared with the previous period.
```

Do not force screen-reader users to interpret a purely visual graph.

---

# 64. Media Team Accessibility

Media Team workflows must remain accessible:

* Movie creation
* Series creation
* Episode creation
* Upload
* Metadata editing
* Version management
* Publishing

Complexity must not be hidden behind inaccessible custom controls.

---

# 65. Upload Accessibility

Upload controls must support keyboard and accessible labeling.

Example:

```text
Upload movie poster
Upload backdrop
Upload trailer
Upload streaming media
Upload download media
```

Drag-and-drop may be supported as an enhancement.

It must never be the only upload mechanism.

---

# 66. Drag-and-Drop Accessibility

Whenever drag-and-drop exists, provide an alternative:

```text
[Choose File]
```

Never require:

> “Drag your file here”

as the only interaction.

---

# 67. Status Badges

Statuses must contain readable text.

Examples:

```text
Published
Draft
Archived
Pending
Failed
Completed
Expired
```

Icons and colors can reinforce the status but must not replace it.

---

# 68. Account and Role Accessibility

Role-specific interfaces must remain understandable.

Examples:

```text
Admin Dashboard
Media Team Workspace
Customer Account
```

The user should always know where they are.

---

# 69. Unauthorized Experience

The unauthorized page must clearly explain:

```text
You don't have permission to access this area.
```

Where appropriate:

```text
[Go Back]
[Return Home]
```

Do not simply render an empty page.

---

# 70. Authentication Accessibility

Login and registration must support:

* Keyboard input
* Clear labels
* Password visibility control
* Error messaging
* Loading state
* Focus management
* Screen-reader-friendly validation

Do not force users to interact with a visual-only password interface.

---

# 71. Password Visibility

The password visibility control must have a meaningful accessible label.

Example:

```text
Show password
Hide password
```

The state must update when toggled.

---

# 72. Error Focus

When a form submission fails, focus should move appropriately.

For example:

```text
Submit
 ↓
Validation errors
 ↓
Focus first relevant error
```

Do not leave the user searching through a long form to discover what failed.

---

# 73. Motion Accessibility

All motion must respect the user's reduced-motion preference.

Reference:

```text
prefers-reduced-motion
```

When enabled:

* Reduce transitions
* Disable unnecessary parallax
* Reduce card transforms
* Reduce cinematic page movement
* Avoid excessive animated loading
* Preserve functionality

---

# 74. Animation Must Never Communicate Critical Information Alone

Bad:

```text
Animation stopped
=
Payment failed
```

Good:

```text
Payment failed
```

with optional supporting animation.

---

# 75. Flashing and Rapid Motion

Avoid rapid flashing or visually aggressive effects.

The cinematic identity of GIFTEDproMovies must never come at the expense of user comfort or safety.

---

# 76. Cognitive Accessibility

Interfaces should be predictable.

Avoid:

* Unexpected navigation
* Unclear terminology
* Hidden primary actions
* Excessive simultaneous animations
* Unnecessary confirmation steps
* Confusing status changes

Use consistent terminology throughout the platform.

For example:

```text
Watch
Download
LIPA
Subscribe
Library
Purchases
Downloads
```

should retain consistent meanings.

---

# 77. Consistent Interaction

If the same interaction appears in multiple places, it should behave similarly.

Example:

```text
MovieCard → Movie Details
```

should not behave differently depending on which homepage rail contains it.

Consistency reduces cognitive load.

---

# 78. Accessible Tooltips

Tooltips may explain unfamiliar icons.

They must not be the only source of critical information.

Tooltips should not contain essential instructions that disappear before keyboard or touch users can access them.

---

# 79. Icon-Only Controls

Icon-only controls are permitted when the icon is universally understandable and the control has an accessible name.

Examples:

```text
Search
Menu
Close
Mute
Fullscreen
```

Every icon-only button requires an accessible label.

---

# 80. Icon + Text Preferred for Primary Actions

Primary business actions should generally use text.

Prefer:

```text
[Watch]
[Download]
[LIPA]
[Subscribe]
```

rather than:

```text
[▶]
[↓]
[$]
```

Icons may accompany the text.

---

# 81. Accessible Content Rails

Content rails must support keyboard navigation.

Users should be able to:

* Focus cards
* Navigate cards
* Activate cards
* Understand the current position where necessary

Arrow controls must have accessible names such as:

```text
Previous movies
Next movies
```

not merely:

```text
←
→
```

---

# 82. Carousel Accessibility

Carousels must avoid trapping keyboard users.

Users must be able to move into and out of the carousel naturally.

Do not create infinite keyboard traps.

If auto-rotation exists, it should be:

* Minimal
* Pausable
* User-friendly
* Disabled/reduced when appropriate

---

# 83. Search Result Accessibility

Search results should communicate:

* Number of results
* Result type
* Active filters
* Empty state
* Loading state

Example:

```text
24 results for "action"
```

This should exist as actual text, not only visual UI.

---

# 84. Filter State Accessibility

Selected filters must be announced or visually identifiable.

Example:

```text
Country: Nigeria
Category: Christian
Type: Movie
```

Clear actions should be explicit.

---

# 85. Library Accessibility

Library sections must communicate their purpose.

Examples:

```text
Continue Watching
Your Movies
Your Series
Downloads
```

Progress should be represented textually when useful.

Example:

```text
Episode 4 of 8
62% watched
```

---

# 86. Expiration Accessibility

Access expiration must not rely only on a countdown animation.

Provide text such as:

```text
Access expires in 2 days.
```

or:

```text
Access expired.
```

The exact expiration information must remain understandable without visual animation.

---

# 87. Subscription Accessibility

Subscription status must be clear.

Examples:

```text
Active
Expires in 5 days
Expired
```

Do not communicate subscription state solely through badges/colors.

---

# 88. Financial Information Accessibility

Admin-only financial information must remain accessible to authorized Admin users without exposing it to unauthorized roles.

Accessibility does not override authorization.

Correct hierarchy:

```text
Authorization
      ↓
Accessible presentation
```

not:

```text
Accessible presentation
      ↓
Authorization
```

---

# 89. Accessibility and Security

Do not solve accessibility by exposing sensitive information in:

* ARIA labels
* Hidden DOM content
* Screen-reader-only text
* Client-side attributes

For example, an unauthorized user must not receive sensitive Admin financial data simply because it is hidden visually.

---

# 90. Screen-Reader-Only Content

Visually hidden text may be used when it adds meaningful context.

Examples:

```text
Movie poster for ...
Opens movie details
Currently selected
Payment pending
```

But do not use hidden text to compensate for poor semantic structure.

---

# 91. Live Regions

Live regions may be used for important dynamic updates such as:

* Payment status
* Download status
* Upload status
* Search result count
* Form validation
* Playback state

Use them carefully.

Do not make the entire application a live region.

---

# 92. Focus Management Architecture

Reusable interactive components must define their focus behavior.

Examples:

```text
Dialog
Drawer
BottomSheet
Dropdown
Popover
SearchSuggestions
PlayerSettings
```

Each must define:

```text
Focus Enter
Focus Movement
Focus Exit
Focus Return
```

---

# 93. Accessibility Component Contract

Shared components should document accessibility behavior.

Example:

```text
MovieCard
 ├── Accessible name
 ├── Keyboard activation
 ├── Focus state
 └── Image alternative text

Dialog
 ├── Accessible title
 ├── Focus trap/containment
 ├── Escape behavior
 └── Focus return
```

Accessibility is part of the component contract.

---

# 94. Native Controls First

Prefer native browser controls when they provide the required functionality.

Examples:

* `<button>`
* `<input>`
* `<select>`
* `<details>`
* `<dialog>` where appropriate and compatible with the chosen implementation

Custom controls require substantially more accessibility responsibility.

Do not rebuild native behavior without a reason.

---

# 95. Custom Selectors

If a custom selector is necessary, it must define:

* Keyboard interaction
* Focus behavior
* Selected state
* Expanded state
* Accessible name
* Active option
* Closing behavior

Do not build a visually beautiful dropdown that behaves like a broken button.

---

# 96. Accessibility Testing Strategy

Testing should happen continuously, not only before launch.

Each major feature should be tested with:

### Keyboard

* Tab
* Shift + Tab
* Enter
* Space
* Escape
* Arrow keys where relevant

### Screen reader

Verify:

* Names
* Roles
* States
* Relationships
* Dynamic updates

### Visual

Verify:

* Focus
* Contrast
* Text readability
* Zoom
* Motion

### Touch

Verify:

* Target size
* Spacing
* Gestures
* Alternative interactions

---

# 97. Recommended Accessibility QA Pass

For every major route:

```text
1. Keyboard-only pass
2. Focus pass
3. Screen-reader pass
4. Contrast pass
5. Zoom pass
6. Reduced-motion pass
7. Touch pass
8. Responsive pass
```

Do not mark accessibility complete after only running an automated scanner.

---

# 98. Automated Testing

Automated accessibility testing may be incorporated into the frontend quality workflow.

It can help identify:

* Missing labels
* Invalid ARIA
* Contrast issues
* Structural problems
* Form association issues

However:

> Automated accessibility tools do not prove that the product is fully accessible.

Manual testing remains required.

---

# 99. Accessibility QA Matrix

| Feature       | Keyboard | Screen Reader | Touch | Focus | Contrast | Reduced Motion |
| ------------- | -------- | ------------- | ----- | ----- | -------- | -------------- |
| Header        | ✓        | ✓             | ✓     | ✓     | ✓        | ✓              |
| Search        | ✓        | ✓             | ✓     | ✓     | ✓        | ✓              |
| Movie Cards   | ✓        | ✓             | ✓     | ✓     | ✓        | ✓              |
| Movie Details | ✓        | ✓             | ✓     | ✓     | ✓        | ✓              |
| Series        | ✓        | ✓             | ✓     | ✓     | ✓        | ✓              |
| Checkout      | ✓        | ✓             | ✓     | ✓     | ✓        | ✓              |
| Player        | ✓        | ✓             | ✓     | ✓     | ✓        | ✓              |
| Library       | ✓        | ✓             | ✓     | ✓     | ✓        | ✓              |
| Downloads     | ✓        | ✓             | ✓     | ✓     | ✓        | ✓              |
| Subscription  | ✓        | ✓             | ✓     | ✓     | ✓        | ✓              |
| Admin         | ✓        | ✓             | ✓     | ✓     | ✓        | ✓              |
| Media Team    | ✓        | ✓             | ✓     | ✓     | ✓        | ✓              |

---

# 100. Accessibility Anti-Patterns

The coding agent MUST NOT implement:

### ❌ Clickable `<div>` instead of a button/link

### ❌ Icon-only critical actions without accessible names

### ❌ Hover-only functionality

### ❌ Color-only status indicators

### ❌ Placeholder-only form labels

### ❌ Removing focus outlines

### ❌ Positive tabindex values

### ❌ Keyboard traps

### ❌ Auto-playing content without appropriate control

### ❌ Auto-rotating carousels that cannot be controlled

### ❌ Tiny touch targets

### ❌ Drag-and-drop as the only interaction

### ❌ Important information hidden only in tooltips

### ❌ Critical information communicated only through animation

### ❌ Screen-reader users receiving sensitive unauthorized information

### ❌ Giant ARIA implementations compensating for incorrect HTML

### ❌ Using `aria-label` everywhere instead of semantic structure

---

# 101. Accessibility and Design System

Accessibility rules must be encoded into the Design System.

Reusable primitives should establish:

* Focus ring
* Button states
* Input states
* Error states
* Disabled states
* Contrast-safe combinations
* Touch dimensions
* Typography
* Reduced motion behavior

A developer should not need to reinvent accessibility for every component.

---

# 102. Accessibility and Motion System

MD-04 defines visual language.

MD-05 defines motion.

This document overrides decorative motion whenever accessibility requires reduced or removed motion.

Relationship:

```text
Visual Language
      ↓
Motion System
      ↓
Accessibility Preference
      ↓
Final Motion Behavior
```

---

# 103. Accessibility and Responsive Design

MD-22 defines responsive behavior.

Accessibility must remain valid across every responsive transformation.

Example:

```text
Desktop Modal
      ↓
Tablet Modal
      ↓
Mobile Bottom Sheet
```

All three must preserve the same semantic meaning and accessible interaction.

---

# 104. Accessibility and Product Identity

Accessibility must not destroy the premium visual identity.

The goal is not:

> “Make everything plain.”

The goal is:

> **Make the premium experience understandable and operable by more users.**

Cinematic visuals, motion, dark surfaces, crimson actions, gold premium accents, and immersive playback can coexist with strong accessibility.

---

# 105. Accessibility and Business Actions

The following must always remain clearly accessible:

```text
Watch
Download
LIPA
Subscribe
Login
Register
Search
Select Version
Choose Payment Method
Retry
Cancel
Continue
```

A beautiful CTA that cannot be operated with a keyboard is considered incomplete.

---

# 106. AI Coding Agent Directive

The coding agent MUST treat accessibility as a first-class implementation requirement.

The agent MUST NOT:

* Add accessibility only at the end
* Replace semantic HTML with generic containers
* Depend on hover
* Depend on color
* Remove focus indicators
* Create keyboard traps
* Create inaccessible custom controls
* Use inaccessible icon-only controls
* Make drag-and-drop mandatory
* Hide important information from assistive technologies
* Expose sensitive information through hidden accessibility markup
* Assume mobile users can hover
* Assume all users can see animations
* Assume all users can hear audio
* Assume all users can use a mouse

For every interactive component, the agent must consider:

```text
Semantic HTML
Accessible Name
Keyboard
Focus
Screen Reader
Touch
Contrast
Responsive Behavior
Reduced Motion
Dynamic State
Error Handling
```

If an interaction cannot reasonably be made accessible within the chosen component architecture, **STOP and resolve the design before implementation.**

---

# 107. Definition of Done

Accessibility is complete only when:

* [ ] Semantic HTML is used appropriately
* [ ] Keyboard navigation works
* [ ] Focus is visible
* [ ] Focus order is logical
* [ ] Dialogs manage focus correctly
* [ ] Mobile drawers/sheets are accessible
* [ ] Forms have proper labels
* [ ] Validation errors are associated with fields
* [ ] Loading states are communicated
* [ ] Important dynamic states are announced appropriately
* [ ] Images have meaningful alternatives where required
* [ ] Decorative images are ignored by assistive technology
* [ ] Color is not the only state indicator
* [ ] Text contrast is acceptable
* [ ] Primary actions are understandable
* [ ] Icon-only controls have accessible names
* [ ] Content rails are keyboard accessible
* [ ] Search is keyboard accessible
* [ ] Filters are accessible
* [ ] Checkout is accessible
* [ ] Player controls are accessible
* [ ] Downloads expose readable status
* [ ] Admin interfaces are accessible
* [ ] Media Team interfaces are accessible
* [ ] Touch targets are usable
* [ ] Zoom does not destroy usability
* [ ] Reduced motion is respected
* [ ] No critical feature depends on hover
* [ ] No page-wide keyboard trap exists
* [ ] Accessibility does not bypass authorization/security
* [ ] Manual accessibility testing has been performed

---

# 108. Final Product Principle

GIFTEDproMovies should not ask:

> “Can this user see our design?”

It should ask:

> **“Can this user understand, navigate, and complete the task?”**

The platform is successful when the same premium product remains usable through:

```text
Mouse
Keyboard
Touch
Screen Reader
Different Screen Sizes
Different Zoom Levels
Reduced Motion
```

without sacrificing the product's cinematic identity.

---

# 109. Document Dependencies

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
* `22_RESPONSIVENESS.md`

---

# 110. Next Document

The next document is:

```text id="q8v3nx"
24_PERFORMANCE.md
```

It will define the performance architecture for GIFTEDproMovies, including image optimization, loading strategy, route performance, Server/Client Component boundaries, bundle control, animation performance, streaming-page performance, mobile performance, Admin performance, upload UI performance, caching boundaries, perceived performance, and performance QA.

