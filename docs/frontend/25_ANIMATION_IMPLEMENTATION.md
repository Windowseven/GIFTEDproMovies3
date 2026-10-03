# GIFTEDproMovies

## Animation Implementation Architecture & Engineering Specification

**Document ID:** MD-25
**File:** `25_ANIMATION_IMPLEMENTATION.md`
**Version:** 1.0
**Status:** Frontend Implementation Specification
**Project:** GIFTEDproMovies
**Scope:** Frontend only

---

# 1. Purpose

This document converts the conceptual motion rules defined in:

* `04_MOTION_SYSTEM.md`
* `24_PERFORMANCE.md`

into **implementation-level engineering rules**.

MD-05 defines **what the motion should feel like**.

MD-24 defines **how performance must be protected**.

MD-25 defines:

> **How animations must actually be implemented in the frontend.**

The implementation must be intentional, reusable, interruptible, accessible, responsive, and performance-conscious.

The coding agent MUST NOT invent unrelated animation patterns.

---

# 2. Implementation Philosophy

Animation is part of the product interaction system.

It is not decoration.

Every animation must communicate at least one of:

* state change
* hierarchy
* navigation
* interaction feedback
* content relationship
* system status
* spatial continuity
* focus
* progress
* completion

The product should feel:

**cinematic + premium + responsive + controlled.**

It must NOT feel:

* over-animated
* game-like
* childish
* template-generated
* SaaS-dashboard-like
* slow
* distracting

---

# 3. Relationship With Other Documents

Animation implementation MUST remain consistent with:

```text
MD-03 DESIGN SYSTEM
        ↓
MD-04 VISUAL LANGUAGE
        ↓
MD-05 MOTION SYSTEM
        ↓
MD-24 PERFORMANCE
        ↓
MD-25 ANIMATION IMPLEMENTATION
```

If these documents conflict:

1. Project Constitution
2. Design System
3. Visual Language
4. Motion System
5. Performance
6. Animation Implementation

The implementation document cannot override higher-level product decisions.

---

# 4. Animation Technology Strategy

The project should use the **smallest animation technology stack that can satisfy the product requirements**.

Preferred hierarchy:

```text
CSS
 ↓
CSS transitions/keyframes
 ↓
React animation library where stateful orchestration is required
 ↓
Web/browser APIs only where they provide meaningful platform behavior
```

Do not introduce multiple animation libraries for different components.

The project should have **one primary animation approach**.

If a dedicated React animation library is introduced, it must be used consistently rather than mixing several competing animation systems.

---

# 5. CSS vs JavaScript Animation

## 5.1 Use CSS for

Prefer CSS transitions for:

* hover states
* focus states
* opacity changes
* scale changes
* border changes
* shadow changes
* simple button feedback
* card hover
* image zoom
* color transitions
* simple reveal states

Example conceptual behavior:

```text
MovieCard
hover
 ↓
transform: scale(...)
opacity transition
image transform
gradient transition
```

These should not require React state unless the interaction genuinely requires application logic.

---

# 6. Use JavaScript / Animation Library For

JavaScript-driven animation is justified for:

* page transitions
* coordinated entrance sequences
* shared element transitions
* modal orchestration
* bottom sheets
* drag interactions
* magnetic cursor behavior
* interactive carousels
* complex player controls
* gesture-based interactions
* interruptible animations
* animations dependent on application state
* coordinated multi-element transitions

Do not use JavaScript simply because CSS could already solve the problem.

---

# 7. Animation Tokens

Animation values must be centralized.

Do not scatter arbitrary durations throughout the codebase.

Recommended conceptual tokens:

```text
instant       = 100ms
micro         = 150ms
fast          = 200ms
standard      = 280ms
emphasis      = 400ms
cinematic     = 600ms
slow          = 900ms+
```

These values are guidelines rather than permission to animate everything.

---

# 8. Easing

Use a small controlled easing vocabulary.

Recommended:

```text
ease-out
    entrances / reveal

ease-in
    exits

ease-in-out
    state transitions

spring-like
    interactive physical movement

linear
    progress indicators / media progress
```

Avoid arbitrary easing curves for individual components.

Brand motion should feel:

**smooth → deliberate → confident.**

---

# 9. Distance Tokens

Movement should generally remain subtle.

Recommended conceptual movement:

```text
micro      2–4px
small      6–12px
medium     16–24px
large      32–48px
hero       48–80px+
```

Large movement must have a strong spatial reason.

Do not make normal interface elements fly across the screen.

---

# 10. Scale Tokens

Recommended:

```text
subtle     1.01
card       1.02–1.04
image      1.04–1.08
emphasis   1.05–1.10
```

Movie cards must remain controlled.

The interface should never feel like cards are physically jumping toward the user.

---

# 11. Animation Ownership

Every animation must have a clear owner.

Example:

```text
MovieCard
 ├── hover animation → MovieCard
 ├── image zoom → MovieCard image
 └── metadata reveal → MovieCard

Movie Details
 ├── page transition → route/page layer
 ├── version selector → VersionSelector
 └── purchase CTA → PurchaseOptions
```

A parent should not randomly control the internal animation state of every child.

---

# 12. Component Animation Contract

Interactive components should expose predictable states.

Example:

```text
MovieCard

idle
hover
focus
pressed
selected
loading
disabled
```

Example:

```text
PaymentButton

idle
loading
success
error
disabled
```

Example:

```text
DownloadItem

idle
preparing
downloading
paused
completed
failed
expired
```

Animation should respond to these states.

---

# 13. State-Driven Animation

Animation must represent real UI state.

Correct:

```text
paymentStatus = pending
        ↓
show pending transition
```

Incorrect:

```text
timer
 ↓
random animation
```

Animations should not exist independently of the application's actual state unless they are purely decorative micro-interactions already approved by the motion system.

---

# 14. MovieCard Animation

MovieCard is one of the most important animated components in the product.

## Desktop

On hover:

```text
scale       → subtle increase
image       → subtle zoom
gradient    → reveal
metadata    → fade/slide
actions     → reveal
```

Recommended sequence:

```text
Pointer enters
      ↓
Card scale
      ↓
Image zoom
      ↓
Overlay gradient
      ↓
Metadata/actions reveal
```

The entire sequence should feel like one interaction.

---

# 15. MovieCard Hover Rules

Hover MUST NOT:

* dramatically resize the layout
* push neighboring cards unpredictably
* cause horizontal page overflow
* create excessive glow
* hide important information
* depend on hover for essential functionality

Hover is an enhancement.

It is not the only way to access functionality.

---

# 16. Mobile MovieCard

Mobile devices do not have reliable hover.

Therefore:

```text
Desktop:
hover → enhanced card interaction

Mobile:
tap → open details / reveal relevant interaction
```

Do not implement fake hover behavior on mobile.

The user must never need to hover to discover how to buy/watch/download content.

---

# 17. Hero Animation

The hero should feel cinematic but restrained.

Recommended sequence:

```text
Backdrop
   ↓
subtle scale/parallax

Title
   ↓
fade + slight vertical movement

Metadata
   ↓
fade

Description
   ↓
fade

CTA
   ↓
fade + subtle movement
```

Do not delay important content unnecessarily.

The user should be able to interact quickly.

---

# 18. Hero Background

Hero background motion may use:

* subtle scale
* very slow parallax
* controlled image movement

Avoid:

* aggressive zoom
* constant looping movement
* large parallax displacement
* excessive GPU-heavy effects

Hero motion should be barely noticeable.

The content remains the focus.

---

# 19. Magnetic Buttons

Magnetic interaction may be used selectively for major CTAs.

Examples:

* Watch
* LIPA
* Subscribe

Recommended movement:

```text
cursor influence
≈ 1–3px
```

The button must return naturally to its original position.

Do not apply magnetic movement to:

* every button
* navigation links
* every icon
* dense admin tables
* form controls

Magnetic interaction is a premium accent, not a global gimmick.

---

# 20. Magnetic Interaction Rules

Pointer tracking must:

* stop when pointer leaves
* reset position
* clean up event listeners
* avoid unnecessary React renders
* avoid updating global application state
* remain lightweight

Prefer direct transform updates or an animation system designed for high-frequency interaction rather than causing React re-renders on every pointer movement.

---

# 21. Tilt Interaction

Optional card tilt may be used sparingly.

Maximum tilt should remain extremely small.

Recommended conceptual range:

```text
±1° to ±2°
```

Tilt must never:

* distort text readability
* cause layout shift
* interfere with clicking
* continue after pointer leaves
* work against reduced-motion preferences

If tilt does not improve the experience, omit it.

---

# 22. ContentRail Animation

Content rails should feel fluid.

Desktop:

```text
drag
→ momentum
→ controlled stopping
```

Mobile:

```text
native touch swipe
→ smooth continuation
```

Cards may receive a subtle active scale.

Avoid:

* snapping that feels aggressive
* excessive spring effects
* auto-scrolling rails
* infinite decorative movement

---

# 23. Scroll Reveal

Sections may reveal when entering the viewport.

Recommended:

```text
heading
    ↓
cards
    ↓
secondary elements
```

A small stagger may be used.

Example conceptual stagger:

```text
40ms
60ms
80ms
```

Do not animate hundreds of cards independently when they enter the viewport.

Use a controlled reveal strategy.

---

# 24. Intersection Observer

Scroll-triggered reveals should use an efficient viewport detection mechanism such as:

```text
IntersectionObserver
```

Avoid continuous scroll listeners for simple reveal detection.

When an element has already revealed:

```text
do not repeatedly animate it
```

unless the design specifically requires replay.

---

# 25. Search Animation

Search should feel immediate.

When the search interface expands:

```text
search trigger
 ↓
input expansion
 ↓
focus
 ↓
suggestions
```

Suggestions should appear quickly.

Do not introduce long cinematic delays into search.

Search is a utility interaction.

---

# 26. Filter Animation

Filter changes should feel responsive.

Desktop:

```text
filter state changes
 ↓
results transition
```

Mobile:

```text
Filter
 ↓
Bottom Sheet
 ↓
selection
 ↓
Apply
 ↓
sheet closes
 ↓
results update
```

The animation must not delay the user from using the interface.

---

# 27. DJ / Translator Version Selector

When switching versions:

```text
selected version
 ↓
active indicator moves
 ↓
price updates
 ↓
relevant metadata/media context updates
```

The price transition should be subtle.

Do not animate currency values excessively.

The customer must always understand which version is selected.

---

# 28. Watch / Download / LIPA

Primary actions must have immediate feedback.

Example:

```text
LIPA
 ↓
pressed
 ↓
loading
 ↓
payment state
```

Never leave the user wondering whether the click registered.

Button loading animation should not alter the layout unexpectedly.

---

# 29. Modal Animation

Modals should use:

```text
backdrop
+
content panel
```

Backdrop:

```text
opacity 0 → target
```

Panel:

```text
opacity
+
small scale/translate
```

Exit animation should be shorter than or equal to entrance animation.

---

# 30. Bottom Sheet

Bottom sheets are important for mobile:

* payment methods
* filters
* account menus
* player settings
* mobile navigation

Recommended behavior:

```text
bottom: off-screen
        ↓
small upward movement
        ↓
rest position
```

The sheet must not feel like it is violently thrown upward.

If drag-to-dismiss is implemented, the interaction must be interruptible.

---

# 31. Interruptibility

Animations must be interruptible.

Example:

```text
Opening
   ↓
user closes immediately
   ↓
animation reverses naturally
```

Do not force the user to wait for an animation to finish before interacting again.

---

# 32. Animation Cancellation

When component state changes:

```text
old animation
     ↓
cancel / replace
     ↓
new animation
```

Avoid animation queues that continue playing after the UI state has already changed.

Examples:

* user changes selected DJ twice
* user opens then immediately closes modal
* user navigates away during page transition
* payment fails while success animation was starting

The latest valid state wins.

---

# 33. Race Conditions

Animation must not create false application state.

Incorrect:

```text
success animation starts
 ↓
payment actually fails
 ↓
success UI remains visible
```

Correct:

```text
application state
      ↓
animation reflects state
```

Business state always has authority over animation state.

---

# 34. Page Transitions

Page transitions should be subtle.

Recommended:

```text
current page
 ↓
opacity / slight movement
 ↓
new page
 ↓
fade in
```

Transitions must not make navigation feel slow.

The user should perceive continuity, not waiting.

---

# 35. Shared Element Transitions

Where technically stable and appropriate, shared visual continuity may be used.

Examples:

```text
MovieCard poster
      ↓
Movie Details poster/hero
```

The visual relationship should make the destination feel connected to the source.

If shared transitions become fragile or browser-dependent, fall back to a simple fade/transform transition.

Correctness > visual trick.

---

# 36. Browser View Transitions

Browser View Transitions may be used when:

* supported by the chosen implementation
* compatibility is acceptable
* the fallback is reliable
* accessibility is preserved
* performance remains acceptable

Do not make the application dependent on View Transitions.

Fallback:

```text
shared transition unavailable
        ↓
normal page transition
```

---

# 37. Player Animation

The player must prioritize the video.

Controls should:

```text
appear on interaction
 ↓
remain visible briefly
 ↓
fade away
```

Controls should reappear when:

* pointer moves
* user taps
* keyboard interaction occurs

Do not keep controls permanently visible unless required by accessibility or current interaction state.

---

# 38. Player Control Animation

Use:

* opacity
* transform
* small scale
* fade

Avoid expensive animations over the entire video surface.

The video itself must never be visually interrupted by unnecessary animation.

---

# 39. Player Settings

Menus for:

* quality
* audio
* subtitles
* playback options

should use small controlled transitions.

Example:

```text
button
 ↓
menu fades/slides
```

Menus should close cleanly.

Focus must move correctly when opened.

---

# 40. Checkout Animation

Checkout should feel trustworthy.

Recommended:

```text
Checkout
 ↓
payment method
 ↓
confirmation
 ↓
processing
 ↓
result
```

Do not use excessive cinematic motion here.

Commerce interactions require:

**clarity > spectacle.**

---

# 41. Payment Processing

During payment:

```text
LIPA
 ↓
processing state
 ↓
provider instruction/status
 ↓
success OR failure
```

The processing animation must communicate:

> “Your request is being processed.”

It must never imply payment success before actual state says so.

---

# 42. Success Animation

Successful actions may use:

* subtle scale
* opacity
* check icon reveal
* controlled confirmation motion

Examples:

* payment successful
* subscription activated
* download completed

Avoid:

* confetti everywhere
* fireworks
* bouncing UI
* exaggerated celebration

The brand should remain premium.

---

# 43. Error Animation

Errors should be clear rather than dramatic.

Recommended:

```text
error message
 ↓
fade/slide into visibility
```

A small shake may be used for an invalid form submission, but only when useful.

Do not shake entire pages.

---

# 44. Skeleton Animation

Skeletons may use subtle shimmer.

Requirements:

* lightweight
* low contrast
* no infinite excessive animation
* disabled/reduced under reduced-motion preference

Skeleton must preserve the final layout dimensions.

---

# 45. Loading States

Loading animation must correspond to actual loading.

Never implement:

```text
fake 3-second loading animation
```

just to make the interface appear sophisticated.

Use real application state.

---

# 46. Download Animation

Download states:

```text
idle
 ↓
preparing
 ↓
downloading
 ↓
completed
```

Progress should animate smoothly.

Do not update visible progress for every individual byte.

Progress UI updates should be throttled appropriately.

---

# 47. Upload Animation

Media Team uploads should communicate:

```text
selected
 ↓
preparing
 ↓
uploading
 ↓
processing
 ↓
completed
```

Progress indicators must reflect actual state in the future API implementation.

Mock phase may simulate deterministic states but must not create fake production security claims.

---

# 48. Admin Dashboard Animation

Admin dashboard animations must remain restrained.

Suitable:

* KPI number entrance
* chart reveal
* table row state changes
* drawer transitions
* modal transitions
* filter transitions

Avoid:

* animated charts constantly moving
* numbers continuously counting
* decorative background motion
* dashboard-wide effects

Admin users need information density and speed.

---

# 49. Media Team Animation

Media Team UI should emphasize workflow.

Useful animations:

* upload progress
* step progression
* validation state
* media preview
* save state
* publish state
* error feedback

Avoid decorative animation that slows content operations.

---

# 50. Mobile Animation Rules

Mobile animation must be lighter than desktop where necessary.

Do not assume desktop hardware performance.

Reduce:

* blur
* heavy shadows
* complex parallax
* cursor effects
* tilt
* large simultaneous animations

Mobile must still feel premium.

---

# 51. Reduced Motion

The application MUST respect:

```text
prefers-reduced-motion
```

When reduced motion is enabled:

Replace:

```text
large movement
parallax
tilt
magnetic interaction
long transitions
```

with:

```text
instant or short opacity/state transitions
```

Do not remove essential state feedback.

---

# 52. Accessibility + Animation

Animation must never:

* prevent keyboard interaction
* trap focus
* hide focused content
* make controls unreachable
* communicate essential information only through movement
* create inaccessible timing

Focus transitions must remain visible.

Dialogs and sheets must preserve correct focus behavior.

---

# 53. Focus Animation

Focus indicators may transition subtly.

However:

```text
focus state
```

must remain clearly visible even when motion is disabled.

Focus visibility is more important than visual elegance.

---

# 54. Blur and Backdrop Effects

Blur may be used for:

* navigation overlays
* bottom sheets
* payment surfaces
* selected premium surfaces

Do not apply large-area backdrop blur everywhere.

Blur is expensive and can weaken performance on lower-end devices.

Use opaque surfaces when blur does not materially improve the experience.

---

# 55. Glow

Crimson and gold glow effects must be extremely restrained.

Use glow primarily for:

* primary CTA emphasis
* selected state
* premium state
* focused interactive element

Do not glow every card.

---

# 56. Animation and Layout Stability

Animations must not cause:

* CLS
* unexpected reflow
* content jumping
* card displacement
* scrollbar changes

Prefer:

```text
transform
opacity
```

over:

```text
top
left
width
height
margin
padding
```

for animated movement.

---

# 57. Performance Rule

Every animation must pass this test:

> Can this animation run without causing unnecessary layout, paint, or JavaScript work?

Prefer GPU-friendly properties where appropriate.

Avoid:

* animating huge DOM trees
* expensive filters
* continuous JavaScript loops
* unnecessary React renders
* high-frequency state updates

---

# 58. Animation During Video Playback

While video is playing:

* avoid page-wide animation
* avoid continuous background effects
* avoid unnecessary React updates
* avoid heavy listeners
* keep player controls isolated

Playback performance has priority over decorative site animation.

---

# 59. Pointer Tracking Performance

Pointer tracking must not trigger:

```text
setState()
```

for every pointer movement unless there is a strong reason.

Prefer:

* refs
* transforms
* requestAnimationFrame where appropriate
* animation-library motion values
* direct compositor-friendly updates

Clean up listeners when the component unmounts.

---

# 60. Lifecycle Cleanup

Every animation-related resource must be cleaned up.

Examples:

* event listeners
* observers
* animation frames
* timers
* subscriptions
* object references
* gesture handlers

Unmounted components must not continue performing animation work.

---

# 61. Animation Library Rules

If a motion library is used:

1. Use one primary library.
2. Do not add a second library for a small isolated effect.
3. Use library features only where they simplify implementation.
4. Keep animations close to component ownership.
5. Avoid importing heavy animation functionality unnecessarily.
6. Prefer tree-shakeable imports.
7. Do not animate everything through JavaScript.

---

# 62. Dependency Rule

Before adding an animation dependency, the developer must answer:

```text
Can CSS solve this?
```

If yes:

```text
Use CSS.
```

If no:

```text
Can existing project animation infrastructure solve it?
```

If yes:

```text
Reuse it.
```

Only introduce new dependencies when there is a genuine capability gap.

---

# 63. Animation API Design

Reusable components should expose semantic props rather than implementation details.

Good:

```text
<MovieCard variant="featured" />
```

Potentially acceptable:

```text
<MovieCard motion="subtle" />
```

Avoid:

```text
<MovieCard
  duration={273}
  y={17}
  scale={1.037}
  ease="custom..."
/>
```

Product components should not become animation configuration dumps.

---

# 64. Animation Variants

Where the same component needs controlled states, use named variants.

Example:

```text
MovieCard
 ├── default
 ├── featured
 ├── compact
 └── library
```

The animation differences should remain defined centrally.

---

# 65. Shared Animation Primitives

Potential reusable primitives:

```text
FadeIn
Reveal
ScaleIn
PageTransition
AnimatedPresence
MotionContainer
BottomSheet
```

Do not create a primitive for every tiny animation.

Create primitives only when:

* used multiple times
* behavior is consistent
* abstraction reduces duplication
* implementation remains understandable

---

# 66. Avoid Animation Wrapper Hell

Do not create:

```text
AnimatedContainer
  → MotionWrapper
    → FadeWrapper
      → ScaleWrapper
        → TransitionWrapper
```

just to display one card.

Animation should remain readable.

---

# 67. Route-Level Animation Ownership

Route transitions belong to the application/page layer.

Component animations belong to components.

Example:

```text
Route transition
    ↓
Page shell

Hero animation
    ↓
Hero

Card animation
    ↓
MovieCard
```

Avoid having each child independently animate the entire page.

---

# 68. Animation Sequencing

Sequencing should be intentional.

Recommended:

```text
Hero backdrop
      ↓
Title
      ↓
Metadata
      ↓
Description
      ↓
CTA
```

But avoid unnecessarily long sequences.

The page should become usable immediately.

---

# 69. Stagger Rules

Stagger is allowed for:

* hero content
* content sections
* small lists
* selected card groups

Stagger should not create:

```text
card 1 → 200ms
card 2 → 400ms
card 3 → 600ms
...
card 20 → 4 seconds
```

For large collections, use a short bounded stagger.

---

# 70. Animation Replay

Animations should generally play:

```text
on first meaningful entry
```

not every time the user scrolls a few pixels.

Repeated animation can quickly become annoying.

---

# 71. Hover State Hierarchy

Hover interactions should follow:

```text
Card
 ↓
image
 ↓
metadata
 ↓
actions
```

Do not independently animate every child with unrelated timings.

The card should feel like a single object.

---

# 72. Touch Feedback

Mobile controls should provide immediate touch feedback.

Examples:

```text
tap
 ↓
subtle scale/opacity response
```

Feedback should be fast enough to communicate that the touch was registered.

---

# 73. Button Press

Recommended:

```text
rest
 ↓
pressed
 ↓
released
```

Press feedback should be extremely short.

Do not create large button movement.

---

# 74. Navigation Drawer

Mobile navigation:

```text
trigger
 ↓
drawer enters
 ↓
backdrop appears
```

Closing:

```text
drawer exits
 ↓
backdrop disappears
```

Focus must move into the drawer when appropriate and return to the trigger when closed.

---

# 75. Account Menu

Account menus should use a short fade/scale transition.

Avoid large movement.

The menu should feel attached to the triggering control.

---

# 76. Library Animation

Library should prioritize content scanning.

Suitable:

* card reveal
* progress updates
* download state transition
* expiration badge appearance
* section entrance

Avoid continuously animating progress indicators after the state is already clear.

---

# 77. Subscription Animation

Subscription page may use premium motion for:

* featured plan
* plan selection
* pricing state
* CTA
* success state

Gold may be used as a premium visual accent.

Do not animate prices aggressively.

---

# 78. Admin Tables

Table animations should be minimal.

Good:

```text
row added
 ↓
fade/short highlight
```

Bad:

```text
every row continuously moves
```

For large tables, animation must never interfere with scrolling or interaction.

---

# 79. Form Validation Animation

Validation feedback may use:

* opacity
* short slide
* subtle shake for invalid submission

Do not shake individual fields repeatedly.

Error text must remain accessible without animation.

---

# 80. Loading-to-Content Transition

When content loads:

```text
Skeleton
 ↓
real content
```

The transition should avoid:

* sudden layout jump
* double rendering
* excessive fade duration

Reserve dimensions before content arrives.

---

# 81. Error Recovery Animation

When an error is retryable:

```text
error
 ↓
Retry
 ↓
loading
 ↓
success/error
```

The state change should be obvious.

Do not animate the entire page when only one component failed.

---

# 82. Empty States

Empty states may use a small entrance animation.

But the empty state should remain useful even with animation disabled.

Content:

```text
illustration/icon
heading
explanation
action
```

Animation is secondary.

---

# 83. Animation and Security

Animation must never expose sensitive information.

Examples:

Do not animate or reveal:

* payment credentials
* protected media URLs
* hidden admin information
* private customer data
* internal authorization state

Animation is presentation only.

---

# 84. Animation and Authorization

If a user is not authorized:

```text
authorization state
 ↓
appropriate UI
```

Do not briefly display protected UI and hide it through animation afterward.

Security-sensitive rendering must be correct before animation begins.

---

# 85. Animation and Content Availability

Similarly:

```text
content unavailable
```

must not briefly show:

```text
Watch
Download
```

and then animate them away.

The correct state should be rendered first.

---

# 86. Animation and Purchase State

If the customer already owns a movie:

```text
Purchase CTA
 ↓
Watch / Download
```

The animation may communicate the state change, but the business state itself comes from the authoritative data model.

---

# 87. Animation and Subscription State

Subscription expiration must not depend on animation.

Correct:

```text
subscription state
 ↓
UI state
 ↓
animation
```

Never:

```text
countdown animation
 ↓
assume expiration
```

The backend will eventually be authoritative.

---

# 88. Animation and Device State

Device access restrictions remain a future backend responsibility.

The frontend may animate:

```text
device limit reached
```

but must not determine authorization itself.

---

# 89. Mock Phase Rule

During frontend-only development:

```text
Typed Mock Data
      ↓
UI State
      ↓
Animation
```

No animation may require a fake backend implementation.

Mock state should be deterministic.

---

# 90. Testing Animation States

Every important animated component must be testable in:

```text
default
hover
focus
pressed
loading
success
error
disabled
reduced-motion
mobile
desktop
```

Only applicable states need to be implemented for each component.

---

# 91. Animation QA Matrix

Test at minimum:

| Area         | Desktop | Mobile | Keyboard | Reduced Motion |
| ------------ | ------: | -----: | -------: | -------------: |
| MovieCard    |       ✓ |      ✓ |        ✓ |              ✓ |
| Hero         |       ✓ |      ✓ |        ✓ |              ✓ |
| Search       |       ✓ |      ✓ |        ✓ |              ✓ |
| Filters      |       ✓ |      ✓ |        ✓ |              ✓ |
| Modal        |       ✓ |      ✓ |        ✓ |              ✓ |
| Bottom Sheet |       — |      ✓ |        ✓ |              ✓ |
| Checkout     |       ✓ |      ✓ |        ✓ |              ✓ |
| Player       |       ✓ |      ✓ |        ✓ |              ✓ |
| Library      |       ✓ |      ✓ |        ✓ |              ✓ |
| Downloads    |       ✓ |      ✓ |        ✓ |              ✓ |
| Subscription |       ✓ |      ✓ |        ✓ |              ✓ |
| Admin        |       ✓ |      ✓ |        ✓ |              ✓ |
| Media Team   |       ✓ |      ✓ |        ✓ |              ✓ |

---

# 92. Performance Testing

Animation must be checked under:

* normal desktop
* low-end laptop
* mobile CPU
* slow network
* large movie catalog
* many cards
* player playback
* Admin tables
* Media Team upload states

The goal is not merely:

> “It works.”

The goal is:

> “It remains smooth under realistic conditions.”

---

# 93. Animation Profiling

When an animation feels slow or causes jank, inspect before optimizing blindly.

Check:

* unnecessary React renders
* layout recalculation
* paint cost
* compositing
* expensive filters
* excessive DOM
* event frequency
* animation library overhead
* image size
* simultaneous animations

Do not add random memoization or disable animation without identifying the problem.

---

# 94. Avoid Continuous Animation

The following should generally NOT continuously animate:

* movie cards
* background gradients
* dashboard metrics
* navigation
* subscription cards
* admin UI
* player background
* buttons

Continuous animation must have a strong product reason.

---

# 95. Avoid Animation Fatigue

A user may interact with the site for hours.

Therefore:

```text
premium
≠
constant motion
```

The strongest motion should happen when it matters.

---

# 96. Brand Motion Language

GIFTEDproMovies motion should communicate:

**confident → cinematic → premium → controlled.**

Not:

**loud → flashy → chaotic → excessive.**

Crimson interactions should feel decisive.

Gold interactions should feel premium.

Neutral transitions should feel calm.

---

# 97. Responsive Motion Architecture

Animation behavior may change based on interaction model.

Example:

```text
Desktop
 ├── hover
 ├── magnetic
 └── pointer interactions

Mobile
 ├── tap
 ├── swipe
 └── touch feedback
```

Do not simply disable all animation on mobile.

Adapt the interaction.

---

# 98. Reduced Motion Architecture

The application should have a consistent reduced-motion policy.

Conceptually:

```text
normal motion
      ↓
prefers-reduced-motion
      ↓
reduced motion variants
```

Do not implement reduced motion independently and inconsistently in every component.

---

# 99. Animation Configuration

If global configuration is necessary, centralize:

```text
motion/
 ├── tokens
 ├── transitions
 ├── variants
 └── utilities
```

But do not build a massive internal animation framework.

The goal is consistency, not abstraction for its own sake.

---

# 100. Recommended Motion Architecture

Conceptually:

```text
src/
├── components/
│   ├── cinematic/
│   ├── media/
│   └── navigation/
│
├── features/
│   ├── discovery/
│   ├── commerce/
│   ├── player/
│   ├── library/
│   ├── admin/
│   └── media-team/
│
├── motion/
│   ├── tokens.ts
│   ├── transitions.ts
│   ├── variants.ts
│   └── utilities.ts
│
└── styles/
    └── globals.css
```

Exact folder naming may follow the final project structure as long as ownership remains clear.

---

# 101. Animation Dependency Boundary

Animation dependencies must remain frontend-only.

They must not affect:

* data models
* repositories
* authentication logic
* payment logic
* entitlement logic
* future API contracts

The architecture remains:

```text
Domain State
     ↓
UI State
     ↓
Animation
```

Never:

```text
Animation
     ↓
Business Logic
```

---

# 102. Animation Must Never Control Business State

Incorrect:

```text
animation completes
 ↓
assume payment succeeded
```

Correct:

```text
payment state changes
 ↓
success UI
 ↓
success animation
```

This rule applies to:

* payments
* subscriptions
* downloads
* purchases
* playback authorization
* uploads
* publishing
* authentication

---

# 103. No Fake Cinematic Delays

Do not intentionally delay:

* Watch
* Download
* LIPA
* Subscribe
* Search
* Login
* Navigation
* Retry

just to make the product feel cinematic.

Motion must enhance speed, not fight it.

---

# 104. No Animation Blocking

Critical actions must remain available whenever the application state allows them.

Example:

If the user wants to close a modal during its entrance:

```text
close immediately
```

Do not force completion of the opening animation.

---

# 105. Animation Error Handling

If an animation mechanism fails:

```text
functional UI must still work
```

Animation is enhancement.

The application must never become unusable because a motion effect failed.

---

# 106. Browser Compatibility

Animation implementation must have graceful degradation.

Where advanced features are unsupported:

```text
advanced animation
       ↓
simple transition fallback
```

The product must remain functional.

---

# 107. Quality Bar

Before accepting an animation, ask:

### Visual

* Does it feel premium?
* Does it match the cinematic identity?
* Is it subtle enough?
* Is the hierarchy clear?

### Interaction

* Does it explain the state?
* Is it immediate?
* Can it be interrupted?
* Does it work without hover?

### Performance

* Does it avoid unnecessary layout?
* Does it avoid unnecessary renders?
* Is it smooth on mobile?
* Does it avoid expensive effects?

### Accessibility

* Does keyboard interaction remain clear?
* Is focus preserved?
* Does reduced motion work?
* Is information available without motion?

---

# 108. AI Coding Agent Directive

The coding agent MUST follow these rules:

1. Do not invent new animation styles.
2. Read `04_MOTION_SYSTEM.md` before implementing animation.
3. Read `24_PERFORMANCE.md` before implementing animation.
4. Use existing motion tokens.
5. Reuse existing animation primitives.
6. Prefer CSS for simple interactions.
7. Use JavaScript animation only when justified.
8. Do not install multiple animation libraries.
9. Do not animate every component.
10. Do not introduce continuous decorative animation.
11. Do not use animation to implement business logic.
12. Do not fake payment, subscription, download, authorization, or playback states.
13. Respect reduced motion.
14. Respect keyboard and touch interactions.
15. Preserve layout stability.
16. Clean up listeners, observers, timers, and animation frames.
17. Keep animation ownership local to the responsible component or feature.
18. Do not create giant animation abstractions.
19. Do not create arbitrary per-component motion values without justification.
20. If an animation requirement is ambiguous, STOP and ask instead of inventing behavior.

---

# 109. Definition of Done

MD-25 is considered implemented when:

* [ ] animation technology is intentionally selected
* [ ] animation dependencies are controlled
* [ ] motion tokens exist
* [ ] component animation ownership is clear
* [ ] MovieCard motion is implemented
* [ ] Hero motion is implemented
* [ ] ContentRail motion is implemented
* [ ] CTA interaction feedback is implemented
* [ ] DJ/version transitions are implemented
* [ ] Search/filter transitions are implemented
* [ ] modal/bottom-sheet transitions are implemented
* [ ] checkout/payment transitions are implemented
* [ ] player controls are implemented
* [ ] library/download/subscription transitions are implemented
* [ ] Admin motion is restrained
* [ ] Media Team upload motion is implemented
* [ ] loading/success/error states have appropriate motion
* [ ] reduced-motion behavior exists
* [ ] keyboard focus remains accessible
* [ ] mobile interaction does not depend on hover
* [ ] animations do not introduce layout instability
* [ ] pointer interactions are performance-safe
* [ ] animation lifecycle cleanup is handled
* [ ] animation does not control business logic
* [ ] no fake backend behavior has been introduced
* [ ] no unnecessary animation dependencies exist
* [ ] QA covers desktop/mobile/accessibility/reduced-motion
* [ ] implementation remains consistent with MD-05 and MD-24

---

# 110. Final Engineering Principle

GIFTEDproMovies's animation system should never make users think:

> “Wow, this website has many animations.”

It should make them feel:

> **“Damn… this website feels expensive.”**

That distinction is the entire point.

The best animation is often the one the user notices emotionally without consciously noticing technically.

---

# 111. Dependencies

This document depends on:

```text
00_PROJECT_RULES.md
01_TECH_STACK.md
02_DESIGN_SYSTEM.md
03_VISUAL_LANGUAGE.md
04_MOTION_SYSTEM.md
05_FRONTEND_ARCHITECTURE.md
07_COMPONENT_ARCHITECTURE.md
08_DATA_MODELS.md
09_MOCK_DATA_CONTRACT.md
10_PUBLIC_EXPERIENCE.md
11_SEARCH_DISCOVERY.md
12_MOVIE_DETAILS.md
13_SERIES_EXPERIENCE.md
14_AUTH_UI.md
15_CUSTOMER_LIBRARY.md
16_PURCHASE_FLOW.md
17_STREAMING_UI.md
18_DOWNLOAD_UI.md
19_SUBSCRIPTION_UI.md
20_ADMIN_UI.md
21_MEDIA_TEAM_UI.md
22_RESPONSIVENESS.md
23_ACCESSIBILITY.md
24_PERFORMANCE.md
```

---

# 112. Next Document

The next document is:

```text
26_ERROR_EMPTY_LOADING_STATES.md
```

It will define the complete system for:

* loading states
* skeletons
* empty states
* errors
* retry behavior
* not-found states
* unavailable content
* payment failures
* playback failures
* download failures
* upload failures
* authorization failures
* expired access
* subscription expiration
* responsive state presentation
* accessibility
* state consistency across the entire application
