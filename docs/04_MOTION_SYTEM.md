# GIFTEDproMovies

## Motion System & Interaction Animation Specification

**Document ID:** MD-04
**File:** `04_MOTION_SYSTEM.md`
**Version:** 1.0
**Status:** LOCKED FOUNDATION
**Scope:** Frontend only
**Product:** GIFTEDproMovies

---

# 1. Purpose

This document defines the complete motion and interaction language for GIFTEDproMovies.

The purpose of motion is to make the platform feel:

* cinematic
* premium
* modern
* responsive
* intelligent
* intentional
* smooth
* alive

Motion must never exist only for decoration.

The core rule is:

> **Everything moves because the interaction has meaning.**

Every animation must communicate at least one of the following:

* something appeared
* something disappeared
* something changed
* something was selected
* something can be interacted with
* something moved to another state
* the system is processing something
* the user successfully completed an action

---

# 2. Motion Philosophy

GIFTEDproMovies is a media platform.

Its motion language must therefore feel closer to:

* premium streaming products
* cinematic interfaces
* modern entertainment applications

and less like:

* generic SaaS dashboards
* gaming interfaces
* excessive glassmorphism
* template websites
* AI-generated UI experiments

Motion should feel:

**smooth → controlled → cinematic → purposeful**

Not:

**fast → noisy → exaggerated → distracting**

---

# 3. Motion Hierarchy

Motion has five levels.

## Level 1 — Micro Interaction

Small interactions that provide immediate feedback.

Examples:

* button hover
* icon hover
* focus state
* checkbox selection
* filter selection
* favorite action

Typical duration:

`100ms – 180ms`

---

## Level 2 — Component Interaction

Movement inside a component.

Examples:

* movie card hover
* price change
* DJ/version selection
* dropdown
* tooltip
* card metadata reveal

Typical duration:

`180ms – 300ms`

---

## Level 3 — Surface Transition

Movement involving a larger UI surface.

Examples:

* modal
* bottom sheet
* mobile navigation
* filter drawer
* payment sheet
* login panel

Typical duration:

`250ms – 400ms`

---

## Level 4 — Page Transition

Movement between major application states.

Examples:

* movie → movie details
* login → account
* library → player
* search → search results

Typical duration:

`300ms – 500ms`

---

## Level 5 — Cinematic Motion

Large visual movement used for hero sections and major media transitions.

Examples:

* hero background movement
* shared poster → detail hero
* cinematic entrance
* featured content transition

Typical duration:

`500ms – 1200ms`

Cinematic motion must remain subtle.

---

# 4. Motion Timing Tokens

The implementation must use reusable motion tokens.

Recommended baseline:

```text
instant      = 100ms
fast         = 150ms
normal       = 200ms
medium       = 300ms
slow         = 450ms
cinematic    = 700ms
long         = 1000ms
```

Do not create random durations throughout the application.

For example:

BAD:

```text
173ms
267ms
382ms
641ms
913ms
```

GOOD:

```text
150ms
200ms
300ms
450ms
700ms
1000ms
```

Exceptions require a clear interaction reason.

---

# 5. Easing

Motion should generally use easing rather than linear movement.

Recommended categories:

```text
standard
enter
exit
emphasized
spring-like
```

General principles:

### Enter

Elements should feel as though they are naturally arriving.

### Exit

Elements should leave slightly faster than they arrive.

### Emphasized

Large cinematic transitions may use a more expressive easing curve.

### Spring-like

Use only for interactions where physical feedback makes sense.

Do not make the entire website feel like a bouncing physics demo.

---

# 6. Core Transform Rules

For frequent UI animation, prioritize:

```text
transform
opacity
```

Avoid animating layout-heavy properties unnecessarily.

Do not frequently animate:

```text
width
height
top
left
margin
padding
```

when the same effect can be achieved using:

```text
transform
opacity
```

Animations must avoid causing unnecessary layout recalculation.

---

# 7. Movie Card Motion

Movie cards are one of the most important interactive components.

Desktop hover should communicate:

> "This title is now active."

## Hover sequence

On hover:

1. Card scales slightly.
2. Poster image zooms subtly.
3. Overlay becomes visible.
4. Metadata becomes more prominent.
5. Watch/action control appears.
6. Optional crimson accent becomes visible.
7. Content remains readable.

Recommended values:

```text
card scale:       1 → 1.03 / 1.04
image scale:      1 → 1.06 / 1.08
duration:         200–300ms
```

Do not use exaggerated scaling.

---

# 8. Movie Card Hover Information

The hover state may reveal:

* title
* year
* duration
* category
* country
* DJ/Translator
* rating if available
* Watch CTA
* LIPA CTA where appropriate

The card must not suddenly become a completely different component.

The transition should feel like the existing card is revealing more information.

---

# 9. Movie Card Exit

When the cursor leaves:

* overlay fades away
* metadata returns to default state
* image returns to normal scale
* card returns to original scale

Exit should be slightly faster than the cinematic entrance.

Avoid abrupt snapping unless the interaction is intentionally immediate.

---

# 10. Mobile Movie Cards

Mobile devices do not have hover.

Therefore:

**Do not depend on hover to reveal essential information.**

Mobile cards should expose enough information by default.

Interactions may use:

* tap
* press
* navigation to details
* quick action button

Long-press interactions must not be required for core functionality.

---

# 11. Hero Motion

The homepage hero is a cinematic surface.

Its animation should create depth without distracting from the movie.

Possible motion:

```text
background image:
slow scale / subtle movement

content:
fade + slight vertical entrance

CTA:
delayed entrance
```

Example sequence:

```text
Background
    ↓
Title
    ↓
Metadata
    ↓
Description
    ↓
CTA
```

The sequence must be subtle.

Do not animate every word independently.

---

# 12. Hero Background

Hero background movement should be slow.

Recommended behavior:

```text
scale: 1 → approximately 1.03–1.06
```

The movement should be almost subconscious.

The user should notice that the interface feels cinematic without thinking:

> "Why is this image moving so much?"

---

# 13. Hero Content Entrance

Recommended:

```text
opacity: 0 → 1
transform: translateY(12–24px) → 0
```

Stagger between major content groups:

```text
title
metadata
description
actions
```

Use small delays.

Do not create long sequences that make the homepage feel slow.

---

# 14. Magnetic CTA Interaction

Important primary CTAs may use subtle magnetic interaction.

Examples:

* WATCH
* DOWNLOAD
* LIPA
* SUBSCRIBE

The effect should be extremely small.

Recommended maximum movement:

```text
approximately 1–3px
```

The purpose is to make the control feel responsive.

It must never look like the button is chasing the cursor.

---

# 15. CTA Hover

Primary buttons should communicate state through:

* subtle translation
* subtle scale
* background transition
* shadow/glow where appropriate

Example:

```text
scale: 1 → 1.02
translateY: 0 → -1px
```

Do not combine:

* large scale
* large rotation
* large glow
* bouncing
* cursor-following

at the same time.

---

# 16. LIPA Motion

`LIPA` is an important business action.

Its interaction must feel confident and premium.

Recommended sequence:

```text
User clicks LIPA
        ↓
Button feedback
        ↓
Payment surface opens
        ↓
Backdrop fades in
        ↓
Payment content enters
```

The user should immediately understand:

> "I am now entering the payment process."

---

# 17. Payment Bottom Sheet

On mobile, payment UI should preferably appear as a bottom sheet where appropriate.

Animation:

```text
translateY(100%) → translateY(0)
opacity: 0 → 1
```

Backdrop:

```text
opacity: 0 → target opacity
```

The sheet should feel physically connected to the bottom of the screen.

---

# 18. Desktop Payment Modal

On larger screens, payment can use a centered modal or premium side/surface presentation depending on the final UX design.

Entrance:

```text
opacity: 0 → 1
scale: approximately 0.98 → 1
translateY: small offset → 0
```

Avoid dramatic zooming.

---

# 19. Watch vs Download Selection

When the user chooses:

```text
WATCH
DOWNLOAD
```

the selected option must have immediate visual feedback.

Possible motion:

* active border transition
* sliding indicator
* subtle scale
* icon transition
* price transition

The interaction must make the selected entitlement unmistakable.

---

# 20. DJ / Translator / Version Switching

A movie may have multiple versions.

When a user switches versions:

```text
Current version
      ↓
Selection changes
      ↓
Active indicator moves
      ↓
Price updates
      ↓
Available action updates
```

The interface should not abruptly redraw.

Price and metadata changes should transition smoothly.

The active selection indicator may slide between options rather than disappear and reappear.

---

# 21. Content Rail Motion

Homepage content rails should feel fluid.

Desktop:

* mouse/trackpad horizontal scrolling
* optional drag interaction
* navigation arrows when useful

Mobile:

* native horizontal swipe
* momentum scrolling

Do not force a custom carousel where native scrolling provides a better experience.

---

# 22. Carousel Navigation

When a user clicks the next/previous control:

* cards move horizontally
* movement should feel continuous
* no abrupt page jump

The carousel must not overshoot excessively.

Controls should appear only when useful.

---

# 23. Scroll Reveal

Sections may reveal themselves as the user scrolls.

Recommended:

```text
opacity: 0 → 1
translateY: 16–24px → 0
```

Use section-level or group-level reveal.

Avoid:

```text
every card flies in
every text element rotates
every icon bounces
```

The platform should feel cinematic, not like a presentation slideshow.

---

# 24. Staggered Content

When several elements appear together, use controlled staggering.

Example:

```text
Section heading
    ↓ 40ms
Card 1
    ↓ 40ms
Card 2
    ↓ 40ms
Card 3
```

Do not create long cascading delays.

Users should never wait several seconds for content to finish animating.

---

# 25. Search Interaction

Search should feel immediate.

When search expands:

```text
width expands
opacity increases
input becomes active
```

Search results should transition without excessive page animation.

Filtering should feel like content is being refined rather than completely replaced.

---

# 26. Filter Interaction

Filters such as:

* Movie
* Series
* Category
* Country
* DJ/Translator

should provide immediate active-state feedback.

Recommended:

* active background transition
* border transition
* icon/indicator transition
* result content update

Avoid animated filters that delay the actual filtering experience.

---

# 27. Modal Motion

General modal behavior:

### Open

```text
backdrop: fade in
content: fade + slight scale/translate
```

### Close

```text
content: fade + slight exit
backdrop: fade out
```

The close animation should be short enough that the interface feels responsive.

---

# 28. Bottom Sheet Motion

Bottom sheets should:

* originate from the bottom
* move smoothly
* support touch interaction where appropriate
* close naturally

On mobile, avoid center-modal behavior for every interaction.

Bottom sheets are especially appropriate for:

* payment
* filters
* version selection
* mobile actions
* contextual menus

---

# 29. Navigation Motion

Desktop navigation should remain stable.

Do not animate the entire navbar every time the user changes route.

Possible motion:

* active navigation indicator
* dropdown appearance
* mobile menu slide
* subtle header transformation during scroll

The navigation must remain predictable.

---

# 30. Mobile Navigation

Mobile menu may use:

```text
translateX(100%) → 0
```

or another appropriate directional transition.

The backdrop should fade in.

Menu items may have a very small stagger.

Avoid excessive stagger.

---

# 31. Page Transitions

Major route changes may use:

```text
fade
small translate
shared-element transition where appropriate
```

Page transitions must never delay navigation unnecessarily.

The user should feel:

> "I moved somewhere."

not:

> "I am waiting for an animation."

---

# 32. Shared Element Transitions

A premium interaction may connect a movie card to its detail page.

Conceptually:

```text
Movie Card Poster
       │
       │ transition
       ▼
Movie Detail Hero Poster
```

The poster can visually morph from the card position into the detail-page position.

This is a high-value cinematic interaction.

Implementation must use a stable, production-appropriate mechanism supported by the chosen Next.js/React version.

Do not introduce unstable experimental APIs solely to achieve this effect.

If a required shared-transition API is not production-ready in the selected project version:

**fallback to a normal fade/transform transition.**

Never compromise application stability for an animation.

---

# 33. Movie Detail Page Entrance

When opening movie details:

Recommended order:

```text
Hero visual
     ↓
Title
     ↓
Metadata
     ↓
Description
     ↓
DJ/version selection
     ↓
Pricing
     ↓
Actions
```

The transition should feel like the selected movie has expanded into its full presentation.

---

# 34. Player Motion

The streaming player must feel like a professional media player.

Controls should:

* appear when the user interacts
* disappear after inactivity
* fade smoothly
* avoid distracting movement

Example:

```text
controls hidden
       ↓
user moves/taps
       ↓
controls fade in
       ↓
inactivity
       ↓
controls fade out
```

Do not continuously animate player controls.

---

# 35. Player Menus

Menus for:

* quality
* subtitles
* audio
* playback speed
* settings

should use short surface transitions.

Recommended:

```text
fade + translate/scale
```

Do not make menus bounce.

---

# 36. Playback Feedback

Important player actions should provide immediate feedback.

Examples:

```text
▶ Play
⏸ Pause
🔊 Volume
⏭ Skip
```

Feedback may use:

* icon transition
* brief visual confirmation
* progress animation

Do not display large notifications for every tiny player action.

---

# 37. Loading Skeleton Motion

Loading states should use subtle shimmer.

The shimmer must communicate:

> "Content is being loaded."

It must not become visual noise.

Use restrained movement.

When real content arrives:

```text
skeleton
   ↓
content
```

The transition should feel smooth rather than flashing.

---

# 38. Error State Motion

Errors should not shake aggressively.

For important validation errors, a very subtle horizontal movement may be used.

Example:

```text
small translateX sequence
```

But error animation must never make the user feel punished.

The message itself is more important than the animation.

---

# 39. Success Motion

Successful actions may use:

* check icon transition
* subtle scale
* opacity
* confirmation surface

Examples:

* payment successful
* movie purchased
* subscription activated
* download entitlement granted

Success should feel satisfying but professional.

Avoid excessive confetti unless specifically approved as a product decision.

---

# 40. Download State Motion

Download states should communicate progress.

Example:

```text
Download
   ↓
Preparing
   ↓
Downloading
   ↓
Completed
```

The progress indicator must represent actual state.

Never animate a fake progress bar indefinitely.

---

# 41. Subscription Motion

Subscription activation may use:

* selected plan transition
* price/state transition
* success confirmation

Premium subscription visuals may use the brand gold accent.

Gold should communicate premium value, not become the default animation color.

---

# 42. Admin Interface Motion

Admin is an operational interface.

Therefore motion must be more restrained than the customer-facing platform.

Use motion for:

* drawers
* modals
* confirmation states
* table interactions
* filters
* status changes
* navigation

Avoid cinematic hero-style animations in the admin dashboard.

---

# 43. Media Team Interface Motion

The Media Team interface should prioritize productivity.

Useful motion:

* upload progress
* drag-and-drop feedback
* file validation
* save confirmation
* content status changes
* modal/drawer transitions

Motion should improve workflow speed rather than slow it down.

---

# 44. Upload Animation

Upload interactions should communicate state clearly:

```text
Idle
 ↓
File selected
 ↓
Uploading
 ↓
Processing
 ↓
Ready
```

Each state must have a visually distinct but restrained transition.

If the backend later reports processing progress, the frontend must display real state rather than inventing progress.

---

# 45. Drag & Drop Motion

For content upload areas:

On drag-over:

* border changes
* surface slightly changes
* upload icon may move subtly

Do not use large bouncing icons.

The user must immediately understand:

> "Drop the file here."

---

# 46. Hover Policy

Hover animation is allowed only where hover exists.

Never make essential information or actions hover-only.

This is especially important for:

* mobile
* tablets
* accessibility devices
* touch interfaces

---

# 47. Touch Interaction

Touch interactions must feel immediate.

Avoid long press requirements for primary actions.

Buttons must respond visually without introducing noticeable interaction delay.

Swipe interactions should use native platform behavior whenever possible.

---

# 48. Reduced Motion

The application must respect:

```text
prefers-reduced-motion
```

When reduced motion is enabled:

* disable unnecessary movement
* reduce large transforms
* reduce parallax
* reduce cinematic transitions
* minimize stagger
* avoid continuous animations

Functional state changes must remain visible.

Reduced motion must not remove important feedback.

---

# 49. Accessibility Rule

Animation must never be the only way information is communicated.

For example:

BAD:

> selected item is only indicated by animation

GOOD:

> selected item has a persistent visual state, with animation providing additional feedback

---

# 50. Performance Rules

Motion must not damage application performance.

Prioritize:

```text
transform
opacity
```

Use GPU-friendly transforms where appropriate.

Avoid:

* unnecessary continuous animations
* large DOM animation trees
* expensive blur effects during constant movement
* layout-triggering animation
* unnecessary JavaScript animation loops
* animation on every element simultaneously

---

# 51. Continuous Animation Policy

Continuous animation must be rare.

Allowed examples:

* subtle skeleton shimmer
* carefully controlled hero movement
* media playback indicators
* progress indicators

Do not continuously animate:

* movie cards
* navigation
* entire sections
* background decorations
* random gradients

unless there is a specific product reason.

---

# 52. Animation Ownership

Every animation must have a clear owner.

For example:

```text
MovieCard
→ owns card hover animation

Hero
→ owns hero entrance animation

PaymentSheet
→ owns payment surface animation

PlayerControls
→ owns player control visibility

PageTransition
→ owns route transition
```

Do not create global animation logic that makes unrelated components move together.

---

# 53. Component Motion API

Reusable components should expose controlled states rather than arbitrary animation props everywhere.

Example conceptual states:

```text
idle
hovered
focused
active
selected
loading
success
error
disabled
```

The component decides how those states move.

This prevents inconsistent motion across the platform.

---

# 54. Animation Library Policy

A dedicated animation library may be used if it provides clear value.

Potential use cases:

* complex gestures
* shared transitions
* orchestrated animations
* spring interactions
* layout transitions

Do not add an animation dependency merely because:

> "It has cool animations."

Every dependency must justify:

* functionality
* performance
* maintenance
* bundle impact
* compatibility

Simple transitions should use CSS when CSS is sufficient.

---

# 55. JavaScript Animation Policy

JavaScript-driven animation should be used only when the interaction genuinely requires runtime calculations.

Examples:

* magnetic CTA
* cursor-relative interaction
* drag physics
* complex gesture interaction

For simple hover/fade/transform:

**prefer CSS.**

---

# 56. Cursor-Based Effects

Cursor-based effects must be subtle.

Examples:

* magnetic buttons
* very small card tilt
* pointer-following highlight

Maximum movement should generally remain very small.

Never allow cursor effects to interfere with:

* clicking
* reading
* scrolling
* accessibility
* performance

---

# 57. Card Tilt

Card tilt is optional.

If implemented:

```text
maximum rotation ≈ 1–2°
```

The effect should be almost imperceptible.

If it makes the card look like a 3D game object:

**remove it.**

---

# 58. Blur and Glow Motion

Blur/glow may be animated sparingly.

Do not animate large expensive blur regions continuously.

Use glow primarily for:

* active CTA
* focused content
* premium state
* selected item

The brand crimson glow should remain subtle.

---

# 59. Brand Motion Language

Motion must reinforce the brand palette.

### Crimson

Use for:

* primary action
* active state
* trending signal
* important CTA

### Gold

Use for:

* premium
* subscription
* special/high-value state

### Neutral

Use for:

* navigation
* standard interaction
* secondary actions

Do not make every animation glow red or gold.

---

# 60. Motion and Content Hierarchy

The most important content should receive the strongest motion priority.

Priority:

```text
Movie / Series
      ↓
Primary action
      ↓
Important metadata
      ↓
Secondary controls
      ↓
Decorative elements
```

Decorative elements should never visually overpower the movie.

---

# 61. Motion and Loading

Never block the interface simply because an animation is running.

Animations should be:

**interruptible where appropriate.**

If the user clicks another action during an animation, the UI should respond naturally.

---

# 62. Motion and Navigation Speed

The user must always be able to move quickly.

Rules:

* no unnecessary intro animation
* no forced animation before interaction
* no long transition before showing useful content
* no artificial loading delay

Animation supports navigation.

Animation must never become navigation.

---

# 63. Motion Anti-Patterns

Never implement:

```text
❌ bouncing navbar
❌ spinning movie cards
❌ excessive page zoom
❌ huge hover scale
❌ permanent floating decorations
❌ random parallax everywhere
❌ excessive glass blur
❌ animation on every text element
❌ long entrance sequences
❌ fake progress animations
❌ hover-only critical actions
❌ continuous background movement everywhere
❌ excessive cursor-following effects
❌ animations that block interaction
```

---

# 64. Motion Quality Test

Before approving an animation, ask:

1. What interaction does this represent?
2. Does it improve understanding?
3. Does it improve perceived quality?
4. Does it feel cinematic?
5. Does it feel too exaggerated?
6. Does it work on mobile?
7. Does it work with reduced motion?
8. Does it maintain performance?
9. Does it interrupt the user?
10. Can the same result be achieved more simply?

If the animation cannot justify itself:

**remove it.**

---

# 65. Responsive Motion Rules

Motion must adapt to viewport and input type.

### Desktop

May support:

* hover
* magnetic CTA
* cursor interaction
* drag
* richer card interaction

### Tablet

Reduce cursor-dependent behavior.

### Mobile

Prioritize:

* tap
* swipe
* bottom sheets
* short transitions
* native scrolling

Never blindly copy desktop hover animations to mobile.

---

# 66. Motion Breakpoint Philosophy

Responsive motion is not simply:

```text
desktop animation
↓
smaller desktop animation
↓
mobile animation
```

Instead:

```text
Desktop
rich interaction

Tablet
reduced interaction

Mobile
touch-first interaction
```

The interaction model changes with the device.

---

# 67. Motion State Consistency

The same interaction must behave consistently across the application.

For example:

If primary buttons use a subtle lift on hover, then:

* Watch
* Download
* Subscribe
* LIPA

should share the same fundamental interaction language.

They may differ in visual importance, but not in basic motion logic.

---

# 68. Motion and Design Tokens

Motion values must eventually be represented as reusable tokens.

Conceptually:

```text
--motion-duration-fast
--motion-duration-normal
--motion-duration-medium
--motion-duration-slow

--motion-ease-standard
--motion-ease-enter
--motion-ease-exit
--motion-ease-emphasized
```

Exact implementation may be CSS variables, Tailwind theme tokens, or another appropriate project-level mechanism.

The principle is:

**Do not scatter magic animation values throughout the codebase.**

---

# 69. Motion Documentation Rule

Any new complex animation introduced after this document must include a short explanation in its implementation or component documentation describing:

* purpose
* trigger
* states
* reduced-motion behavior
* performance considerations

---

# 70. Definition of Done — Motion

Motion implementation is considered complete only when:

* [ ] Movie cards have polished interaction
* [ ] Hero motion is cinematic and restrained
* [ ] Primary CTAs have consistent interaction
* [ ] LIPA interaction is clear
* [ ] Payment surfaces animate naturally
* [ ] DJ/version switching feels responsive
* [ ] Content rails feel fluid
* [ ] Search/filter transitions feel immediate
* [ ] Loading skeletons are subtle
* [ ] Player controls animate correctly
* [ ] Success/error states have appropriate feedback
* [ ] Mobile does not depend on hover
* [ ] Reduced motion is supported
* [ ] Animations avoid unnecessary layout work
* [ ] Motion tokens are reused
* [ ] No unnecessary animation dependencies are added
* [ ] No animation blocks normal interaction
* [ ] No excessive animation exists

---

# 71. Final Motion Principle

GIFTEDproMovies must not look animated.

It must look **alive**.

There is a difference.

Animation should be subtle enough that users experience the interface as:

> **smooth, responsive, cinematic and premium**

rather than thinking about the animations themselves.

The best motion is often the motion the user feels without consciously noticing.

---

# 72. AI Coding Agent Directive

The coding agent MUST NOT:

* invent animations
* add random effects
* introduce animation libraries without justification
* animate every component
* copy animation patterns from unrelated websites
* use hover-only functionality
* ignore reduced-motion requirements
* create performance-heavy continuous animations
* change the established motion language without approval

If a requested interaction is not defined in this document:

**STOP and ask for clarification before implementing a new motion pattern.**

The agent may reuse an existing approved motion pattern when the interaction is functionally equivalent.

---

# 73. Relationship With Other Documents

This document depends on:

```text
MD-01
00_PROJECT_RULES.md

MD-02
01_TECH_STACK.md

MD-03
02_DESIGN_SYSTEM.md

MD-04
03_VISUAL_LANGUAGE.md
```

This document defines:

```text
motion
animation
interaction transitions
animation performance
responsive motion
accessibility motion behavior
```

It does NOT define:

* backend
* database
* payment API
* authentication backend
* media storage
* streaming infrastructure
* download infrastructure

Those remain outside the current frontend scope.

---

# 74. Next Document

After this document, continue with:

```text
05_FRONTEND_ARCHITECTURE.md
```

That document will define the frontend architecture, feature boundaries, folder responsibilities, data flow, component boundaries, server/client responsibilities, and the separation between UI and future backend services.

**END OF MD-04**
