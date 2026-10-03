# GIFTEDproMovies

## Customer Library & Personal Content Experience

**Document ID:** MD-15
**File:** `docs/15_CUSTOMER_LIBRARY.md`
**Version:** 1.0
**Status:** Frontend Specification
**Product:** GIFTEDproMovies
**Scope:** Frontend only

---

# 1. Purpose

This document defines the authenticated customer's personal content experience.

The Customer Library is the central place where a customer can understand and access content associated with their account.

It must answer, at a glance:

* What am I currently watching?
* What movies or episodes can I access?
* What have I purchased?
* What access is about to expire?
* What have I downloaded?
* What subscription do I currently have?
* Where did I stop watching?
* What content is available to continue?

The Library must feel like a **personal media space**, not an administrative table.

---

# 2. Core Principle

The Library is not simply a purchase history.

It is:

> **The customer's personal content universe.**

Therefore the experience should prioritize **actionable content** over transaction records.

Bad:

```text
Movie Name | Purchase Date | Price | Status
```

Preferred:

```text
Continue Watching
Recently Added
Your Movies
Your Series
Downloads
Expiring Soon
Subscription
```

Transaction history may exist separately where required.

---

# 3. Primary Route

The main customer library route is:

```text
/library
```

This route requires an authenticated customer session.

Unauthenticated users attempting to access `/library` must be directed to authentication according to MD-14.

---

# 4. Library Experience Architecture

The conceptual hierarchy is:

```text
                    CUSTOMER
                       │
                       ▼
                    LIBRARY
                       │
        ┌──────────────┼───────────────┐
        ▼              ▼               ▼
Continue Watching   Your Content    Downloads
        │              │               │
        ▼              ▼               ▼
    Progress       Movies/Series    Download State
                       │
                       ▼
                Access / Entitlement
                       │
             ┌─────────┴─────────┐
             ▼                   ▼
          Active              Expired
             │
             ▼
       Watch / Download
```

---

# 5. Library Page Structure

Recommended high-level structure:

```text
┌──────────────────────────────────────────────────────────┐
│ Header                                                   │
├──────────────────────────────────────────────────────────┤
│                                                          │
│ My Library                                               │
│ Your movies, series and downloads                        │
│                                                          │
│ Continue Watching                                        │
│ [ Card ] [ Card ] [ Card ]                              │
│                                                          │
│ Recently Added                                           │
│ [ Card ] [ Card ] [ Card ] [ Card ]                     │
│                                                          │
│ Your Movies                                              │
│ [ Card ] [ Card ] [ Card ] [ Card ]                     │
│                                                          │
│ Your Series                                              │
│ [ Series ] [ Series ] [ Series ]                        │
│                                                          │
│ Downloads                                                │
│ [ Card ] [ Card ] [ Card ]                              │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The exact visible sections should adapt to the customer's actual state.

---

# 6. Personalization Principle

Do not render every section for every customer regardless of data.

For example:

A customer with no downloads should not receive a giant:

```text
Downloads
Nothing here yet
```

section occupying significant space.

Instead, the Library should prioritize available content.

Conceptually:

```text
IF continueWatching exists
    show Continue Watching

IF recentlyAdded exists
    show Recently Added

IF movies exist
    show Your Movies

IF series exist
    show Your Series

IF downloads exist
    show Downloads
```

Empty states should still exist where they provide useful guidance.

---

# 7. Library Header

The page should begin with:

```text
My Library
```

Supporting text may communicate:

```text
Your movies, series and downloads.
```

The header should feel personal and cinematic.

Avoid dashboard-style language such as:

```text
CONTENT MANAGEMENT
USER ASSET INVENTORY
MEDIA ENTITLEMENTS
```

---

# 8. Continue Watching

Continue Watching is one of the highest-priority sections.

It should appear near the top when the customer has active viewing progress.

Example:

```text
Continue Watching

┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│    POSTER    │  │    POSTER    │  │    POSTER    │
│              │  │              │  │              │
│ ▬▬▬▬▬ 62%    │  │ ▬▬▬ 31%      │  │ ▬▬▬▬▬ 84%    │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

# 9. Continue Watching Data

A Continue Watching item may include:

* Movie/series title
* Poster
* Episode title where applicable
* Season/episode information
* Progress percentage
* Progress duration
* Total duration
* Last watched time
* Watch CTA

For series:

```text
Breaking Bad
Season 2 · Episode 4
```

should be distinguishable from the series title.

---

# 10. Continue Watching Action

Selecting a Continue Watching item should return the customer to the relevant playback context.

Movie:

```text
Continue Watching
       ↓
Movie Player
       ↓
Resume position
```

Series:

```text
Continue Watching
       ↓
Relevant Episode
       ↓
Resume position
```

The frontend should use mock progress state during this phase.

Actual playback persistence belongs to the future backend/player integration.

---

# 11. Progress Indicator

Viewing progress should be visually obvious but subtle.

Recommended:

```text
Poster
────────────
████████░░░░
62% watched
```

or an equivalent progress bar.

Do not make the progress indicator visually louder than the poster/title.

---

# 12. Recently Added

Recently Added represents content that recently became available to the customer's account.

Examples:

* Recently purchased movie
* Newly accessible series
* Newly added episode
* Newly activated subscription content

This section should help customers discover newly acquired content.

---

# 13. Recently Added Ordering

Mock data should support chronological ordering.

Conceptually:

```text
newest entitlement
       ↓
older entitlement
```

The final ordering authority will eventually come from backend data.

---

# 14. Your Movies

This section contains movies the customer currently has access to through:

* Individual purchase
* Subscription
* Other approved entitlement source

The UI must distinguish access source when useful.

Example:

```text
Movie
Active until 18 Sep
```

or:

```text
Included with Premium
```

---

# 15. Your Series

Series should appear as series-level library items rather than presenting every episode as an independent movie-style card.

Example:

```text
Your Series

[ Series A ] [ Series B ] [ Series C ]
```

Opening a series should take the customer to the series experience defined in MD-13.

---

# 16. Series Progress

Series library items should communicate progress when available.

Example:

```text
Stranger Things

Season 2
Episode 5 of 9

████████░░ 56%
```

The customer should be able to continue from the appropriate episode.

---

# 17. Downloads

The Library may contain a Downloads section or link to:

```text
/downloads
```

Downloads represent content the customer has initiated or completed through the platform.

Possible states:

```text
Ready
Downloading
Paused
Failed
Expired
Unavailable
```

The detailed download experience will be defined in MD-18.

---

# 18. Download vs Library Ownership

A downloaded item and an owned item are not necessarily the same state.

Example:

```text
Customer owns movie
        ↓
Download not started
```

versus:

```text
Customer owns movie
        ↓
Download completed
```

The UI must not confuse:

```text
Entitlement
```

with:

```text
Download status
```

---

# 19. Active Access

Content the customer currently has permission to access should be presented clearly.

Possible label:

```text
Available
```

or:

```text
Active until 18 Sep
```

The exact visual treatment must remain consistent across Library, Movie Details and Player experiences.

---

# 20. Access Expiration

Individual purchases have configurable access durations defined by Admin.

Therefore the frontend must not assume a fixed duration.

Examples:

```text
Access until 18 Sep
```

```text
3 days remaining
```

```text
Expires today
```

The UI must consume the access information provided by the data layer.

It must not hard-code:

```text
30 days
```

or any other duration.

---

# 21. Expiring Soon

The Library should be able to highlight content approaching expiration.

Example:

```text
Expiring Soon

The Dark Knight
Access ends in 2 days
```

This is useful because expiration is a meaningful customer action signal.

The exact threshold should remain configurable rather than being permanently hard-coded unless the backend/product specification defines it.

---

# 22. Expired Content

Expired content should not disappear silently.

A customer may see an appropriate state such as:

```text
Access expired
```

The UI may provide:

```text
View Details
```

or:

```text
Purchase Again
```

where applicable.

Do not automatically grant access because the customer previously owned the content.

---

# 23. Expired vs Deleted

These are different concepts.

### Expired

The customer previously had access, but the entitlement is no longer active.

### Removed/Unavailable

The content itself may no longer be available.

The frontend should not treat these states as identical.

---

# 24. Subscription Content

Subscription access should appear naturally inside the Library.

If a movie is accessible because of an active subscription, the UI may indicate:

```text
Included with Premium
```

The customer should not be required to individually purchase content that is already included in their active subscription.

The actual entitlement determination is backend-authoritative in the future.

---

# 25. Individual Purchase Independence

Individual movie purchases remain independent from subscriptions.

Example:

```text
Movie A
Purchased individually
Access until 30 Sep

Subscription
Expires 12 Sep
```

After subscription expiration:

```text
Movie A
→ remains accessible until 30 Sep
```

assuming the individual entitlement is still active.

The frontend must represent entitlement source separately where necessary.

---

# 26. Multiple Versions

A movie may have multiple DJ/Translator versions.

The Library must respect version ownership.

Example:

```text
Movie
 ├── DJ Mack
 ├── DJ John
 └── DJ Peter
```

If the customer purchased:

```text
DJ Mack
```

the Library must not imply access to:

```text
DJ John
DJ Peter
```

---

# 27. Version Display

Where relevant, the Library card may show:

```text
DJ Mack Version
```

or:

```text
Swahili · DJ Mack
```

The exact display should remain consistent with Movie Details.

---

# 28. Customer Content Ownership

The Library should visually communicate:

```text
I have access to this
```

rather than:

```text
This exists on the platform
```

That distinction is fundamental.

Public discovery answers:

> What exists?

Library answers:

> What can I access?

---

# 29. Library Card Variants

Library should reuse the core MovieCard system rather than creating unrelated cards.

Possible variants:

```text
default
continueWatching
library
expiring
expired
download
```

Variants should change behavior and metadata—not completely reinvent visual identity.

---

# 30. Library Movie Card

A library movie card may include:

```text
Poster
Title
DJ/Translator
Version
Access state
Progress
Expiry
Primary action
```

Example:

```text
┌──────────────────┐
│                  │
│     POSTER       │
│                  │
├──────────────────┤
│ The Dark Knight  │
│ DJ Mack          │
│ Active · 18 Sep  │
│                  │
│ [ WATCH ]        │
└──────────────────┘
```

---

# 31. Library Card Interaction

Desktop:

* Hover reveals additional metadata
* Poster subtly scales
* Primary action becomes available
* Progress remains visible

Mobile:

* No hover dependency
* Tap opens content
* Primary action remains obvious

Follow MD-03 and MD-05.

---

# 32. Library Filters

For customers with significant content, filtering should be available.

Potential filters:

```text
All
Movies
Series
Downloads
Active
Expiring Soon
Expired
```

Filters should only appear where they improve usability.

Do not create a complex admin-style filter panel.

---

# 33. Library Search

A customer should be able to find content within their library if the library becomes large.

Search may support:

* Movie title
* Series title
* DJ/Translator

Search should operate only against the customer's library context.

It must not be confused with global platform search.

---

# 34. Library Sorting

Potential sorting:

```text
Recently Added
Recently Watched
Alphabetical
Expiring Soon
```

Only introduce sorting options that provide meaningful value.

Default ordering should prioritize customer actions.

---

# 35. Empty Library

A new customer may have no content.

Example:

```text
Your Library is empty

Find something worth watching.

[ EXPLORE MOVIES ]
[ EXPLORE SERIES ]
```

The empty state should be visually engaging rather than looking like an error.

---

# 36. Empty Downloads

If the customer has no downloads:

```text
No downloads yet

Movies you download will appear here.
```

CTA:

```text
EXPLORE MOVIES
```

The state should remain compact.

---

# 37. Empty Continue Watching

If there is no active progress, Continue Watching should generally not occupy a large area.

Instead, the page should prioritize:

```text
Recently Added
Your Movies
Your Series
```

---

# 38. Empty Subscription

If the customer has no active subscription, subscription information may show:

```text
No active subscription

Explore plans designed for your watching needs.

[ VIEW PLANS ]
```

The subscription experience itself is defined in MD-19.

---

# 39. Personalized Recommendations

The Library may contain a recommendation section near the lower part of the page.

Possible:

```text
Because You Watched...
```

or:

```text
You May Also Like
```

Recommendations must not dominate owned content.

Priority remains:

```text
Owned / Accessible
        ↓
Continue Watching
        ↓
Recently Added
        ↓
Recommendations
```

---

# 40. Discovery Loop

The Library should maintain a healthy loop:

```text
Watch
 ↓
Progress saved
 ↓
Continue Watching
 ↓
Finish content
 ↓
Related recommendation
 ↓
Discover
 ↓
Purchase / Subscribe
 ↓
Library
```

This creates a continuous customer experience.

---

# 41. Recently Viewed

The frontend may represent recently viewed content separately from purchased content.

Recently viewed does not mean owned.

Example:

```text
Recently Viewed
```

may contain content that the customer only browsed.

It must not automatically appear inside:

```text
Your Movies
```

unless an entitlement exists.

---

# 42. Access Source

Where useful, the UI can communicate how access was obtained:

```text
Purchased
Included with Subscription
```

Avoid exposing unnecessary transaction details directly on every card.

---

# 43. Purchase History Boundary

A dedicated purchase history route exists:

```text
/purchases
```

The Library should focus on content.

The Purchases page should focus on transactions.

This separation prevents the Library from becoming an accounting dashboard.

---

# 44. Downloads Boundary

A dedicated route exists:

```text
/downloads
```

Library may surface downloads, but detailed download management belongs to the Downloads experience.

---

# 45. Subscription Boundary

A dedicated customer subscription route exists:

```text
/account/subscription
```

Library may summarize subscription state.

Detailed subscription management belongs to the subscription/account experience.

---

# 46. Account Boundary

Account information belongs to:

```text
/account
```

Library should not become a profile-management page.

---

# 47. Library Navigation

The authenticated customer should be able to move between:

```text
Library
Purchases
Downloads
Subscription
Account
```

without losing context.

Mobile navigation may use an account menu or bottom navigation depending on the final navigation architecture.

---

# 48. Mobile Library

Mobile is a first-class experience.

Recommended structure:

```text
My Library

Continue Watching
[ horizontal rail ]

Recently Added
[ horizontal rail ]

Your Movies
[ 2-column grid ]

Your Series
[ 2-column grid ]

Downloads
[ horizontal rail ]
```

The layout should avoid excessive vertical density.

---

# 49. Desktop Library

Desktop may use wider content rails and grids.

Example:

```text
My Library

Continue Watching
[ card ][ card ][ card ][ card ]

Recently Added
[ card ][ card ][ card ][ card ][ card ]

Your Movies
[ card ][ card ][ card ][ card ][ card ][ card ]
```

Maximum content width follows the global design system.

---

# 50. Responsive Transformation

Desktop and mobile should not simply be the same layout at different widths.

Example:

```text
Desktop
6 cards per row
        ↓
Tablet
4 cards per row
        ↓
Mobile
2 cards per row
```

Rails may remain horizontal on mobile.

Controls should transform appropriately rather than merely shrink.

---

# 51. Loading State

Library loading should use cinematic skeletons.

Examples:

```text
Poster skeleton
Title skeleton
Metadata skeleton
```

Use shimmer sparingly.

Do not display a blank screen while the Library initializes.

---

# 52. Error State

If Library data cannot be loaded:

```text
We couldn't load your library.

Please try again.
```

CTA:

```text
TRY AGAIN
```

Do not display raw API errors.

---

# 53. Partial Data Failure

If one optional section fails while others remain available, the entire Library should not necessarily become unusable.

Example:

```text
Continue Watching
✓ Available

Your Movies
✓ Available

Recommendations
⚠ Unavailable
```

Optional content should fail gracefully.

---

# 54. Access State Hierarchy

The frontend should conceptually handle:

```text
NOT_AUTHENTICATED
AUTHENTICATED
NO_ACCESS
ACTIVE_ACCESS
EXPIRING_ACCESS
EXPIRED_ACCESS
SUBSCRIPTION_ACCESS
DOWNLOAD_AVAILABLE
```

These states must not be collapsed into a single generic status.

---

# 55. Access Calculation Boundary

The frontend may display access information.

It must not become the authority that decides ownership.

Future architecture:

```text
Backend entitlement
        ↓
Customer Library repository
        ↓
Typed Library models
        ↓
UI
```

Not:

```text
Frontend date calculation
        ↓
Customer gets access
```

---

# 56. Expiration Presentation

The frontend may calculate presentation values such as:

```text
3 days remaining
```

from authoritative entitlement data.

However, the frontend must not grant or extend access based on local calculations.

---

# 57. Device Context

The broader platform may eventually enforce a maximum number of active devices.

Library should be prepared to display appropriate device-related messages if the backend eventually returns them.

Do not invent the final device limit.

The exact maximum number of devices remains a product decision.

---

# 58. Security Boundary

Library data is customer-specific.

The frontend must not assume that hiding a card is sufficient protection.

Future backend authorization must ensure that a customer can only retrieve their own:

* Entitlements
* Purchases
* Downloads
* Progress
* Subscription information
* Device information

The frontend should consume only the authorized dataset.

---

# 59. No Cross-User Mock Leakage

Mock data must preserve customer boundaries.

Example:

```text
Customer A
→ Movie A
→ Movie B

Customer B
→ Movie C
```

Customer A must not accidentally render Customer B's library items.

Mock repositories should filter by mock user identity.

---

# 60. Mock Library Architecture

Recommended:

```text
Library UI
      ↓
useCustomerLibrary()
      ↓
Customer Library Repository
      ↓
Mock Entitlements
Mock Progress
Mock Downloads
Mock Subscriptions
Mock Users
```

This maintains the future API boundary.

---

# 61. Domain Data Required

The Library experience should consume typed models including:

* User
* Movie
* MovieVersion
* Series
* Season
* Episode
* Entitlement
* Subscription
* DownloadItem
* LibraryItem
* Viewing progress
* Relevant timestamps

These models are defined by MD-08.

---

# 62. Library View Model

The UI may use a derived view model.

Example concept:

```text
LibraryItemViewModel

{
  content
  accessState
  accessSource
  expiresAt
  progress
  downloadState
  primaryAction
}
```

The view model must be derived from domain data.

Do not duplicate business truth across multiple mock datasets.

---

# 63. Component Architecture

Suggested feature structure:

```text
features/
└── library/
    ├── components/
    │   ├── LibraryPage.tsx
    │   ├── ContinueWatchingRail.tsx
    │   ├── LibraryContentRail.tsx
    │   ├── LibraryMovieCard.tsx
    │   ├── LibrarySeriesCard.tsx
    │   ├── LibraryFilters.tsx
    │   ├── LibrarySearch.tsx
    │   ├── LibraryEmptyState.tsx
    │   ├── LibraryErrorState.tsx
    │   └── LibrarySkeleton.tsx
    │
    ├── hooks/
    │   └── useCustomerLibrary.ts
    │
    ├── services/
    │   └── libraryRepository.ts
    │
    └── types/
        └── library.types.ts
```

Actual placement must remain consistent with MD-06 and MD-07.

---

# 64. Component Reuse

Reuse:

* MovieCard
* SeriesCard
* Poster
* ContentRail
* SectionHeader
* Buttons
* Badges
* Progress indicators
* Empty states
* Skeletons

Do not rebuild the same visual primitives specifically for Library.

---

# 65. Library-Specific Components

Library-specific components should exist only where the Library has genuinely unique behavior.

Examples:

```text
ContinueWatchingRail
LibraryFilters
AccessStatus
LibrarySearch
```

---

# 66. Motion

Library motion follows MD-05.

Recommended:

### Card hover

```text
scale
image zoom
metadata reveal
```

### Continue Watching

Progress indicator should remain stable.

### Content loading

Skeleton → content transition.

### Filtering

Content should transition smoothly rather than abruptly flashing.

### Empty state

Subtle entrance only.

Avoid excessive animation on every card.

---

# 67. Accessibility

Requirements:

* Keyboard navigable cards
* Visible focus
* Accessible progress indicators
* Clear expiration messaging
* Accessible filters
* Screen-reader-friendly headings
* Touch-friendly mobile controls
* No hover-only functionality
* Meaningful button labels

Example:

Do not use:

```text
▶
```

as the only accessible meaning.

Use an accessible label such as:

```text
Continue watching The Dark Knight
```

---

# 68. Performance

Library may contain many content items.

Therefore:

* Lazy-load images
* Use optimized image components
* Avoid unnecessary client-side rendering
* Avoid rendering hundreds of hidden cards
* Keep filtering efficient
* Avoid expensive animation loops
* Preserve smooth scrolling
* Load lower-priority sections progressively where useful

---

# 69. State Ownership

The Library should distinguish:

### Server/domain state

Future:

```text
Entitlements
Purchases
Progress
Downloads
Subscription
```

### UI state

```text
Selected filter
Search query
Expanded menu
Active tab
```

### Navigation state

```text
URL
Route
Deep-link context
```

Do not mix these responsibilities.

---

# 70. URL State

If Library filters/search become URL-addressable, use the URL as the source of truth for shareable/navigation state.

Example:

```text
/library?type=movies
```

or:

```text
/library?status=expiring
```

Do not introduce URL parameters unless the feature actually requires them.

---

# 71. Customer Journey: New Customer

```text
Register
   ↓
Library
   ↓
Empty State
   ↓
Explore Movies
   ↓
Movie Details
   ↓
Purchase
   ↓
Access Granted
   ↓
Library
   ↓
Watch
```

---

# 72. Customer Journey: Returning Customer

```text
Login
   ↓
Library
   ↓
Continue Watching
   ↓
Resume Movie
```

---

# 73. Customer Journey: Series

```text
Library
   ↓
Series
   ↓
Continue Watching
   ↓
Episode
   ↓
Resume
   ↓
Next Episode
```

---

# 74. Customer Journey: Expiring Content

```text
Library
   ↓
Expiring Soon
   ↓
Movie
   ↓
Watch
```

If access expires:

```text
Expired
   ↓
Movie Details
   ↓
Purchase Again
```

where applicable.

---

# 75. Customer Journey: Subscription

```text
Library
   ↓
Included with Subscription
   ↓
Watch
```

If subscription expires:

```text
Subscription expires
       ↓
Access state changes
       ↓
Content may become unavailable
       ↓
Customer can subscribe again
```

Individually purchased content remains governed by its own entitlement.

---

# 76. Anti-Patterns

The implementation must NOT:

* Turn Library into an admin dashboard
* Show every transaction on the Library homepage
* Treat recently viewed as purchased
* Treat login as ownership
* Grant access based on frontend state
* Show another customer's content
* Hide expired content without explanation
* Hard-code access duration
* Hard-code subscription duration
* Assume one DJ version grants all versions
* Build a completely separate card system
* Make hover mandatory
* Overload mobile screens
* Show unnecessary empty sections
* Invent a device limit
* Invent subscription rules
* Add unsupported business logic

---

# 77. Quality Bar

The Library should feel like:

> **“My personal GIFTEDproMovies.”**

Not:

> “A database of things I bought.”

It should immediately communicate:

* Personal ownership/access
* Current viewing activity
* Available content
* Progress
* Expiration
* Downloads
* Subscription relationship
* Next action

---

# 78. Acceptance Criteria

### Core

* [ ] `/library` exists
* [ ] Authentication is required
* [ ] Customer-specific mock data is used
* [ ] Library is not accessible as a public content collection

### Content

* [ ] Continue Watching exists
* [ ] Recently Added exists
* [ ] Your Movies exists
* [ ] Your Series exists
* [ ] Downloads can be surfaced
* [ ] Subscription content can be surfaced
* [ ] Expiring content can be surfaced
* [ ] Expired content is represented appropriately

### Ownership

* [ ] Login does not equal ownership
* [ ] Entitlement is distinct from authentication
* [ ] DJ/Translator version ownership is respected
* [ ] Subscription access is distinct from individual purchase
* [ ] Individual purchase remains independent of subscription expiry

### UX

* [ ] Empty states exist
* [ ] Loading state exists
* [ ] Error state exists
* [ ] Responsive desktop/mobile layouts exist
* [ ] Filters work where applicable
* [ ] Library search works where applicable
* [ ] Continue Watching resumes correct content context
* [ ] Expiry information is understandable

### Architecture

* [ ] Typed data models are used
* [ ] Repository boundary exists
* [ ] Components are reusable
* [ ] No backend is implemented
* [ ] No database is implemented
* [ ] No real authentication is implemented
* [ ] No fake entitlement security exists

### Quality

* [ ] Accessible
* [ ] Keyboard usable
* [ ] Touch friendly
* [ ] Motion follows MD-05
* [ ] Performance-conscious
* [ ] Consistent with MD-03 and MD-04

---

# 79. AI Coding Agent Directive

An AI coding agent implementing MD-15 MUST:

1. Read MD-01 through MD-15.
2. Treat previous documents as binding.
3. Build Library as a customer experience, not an admin dashboard.
4. Preserve the distinction between authentication and entitlement.
5. Preserve individual purchase independence from subscriptions.
6. Respect DJ/Translator version ownership.
7. Never hard-code access duration.
8. Never invent subscription rules.
9. Never invent device limits.
10. Never expose another customer's content.
11. Use typed mock data.
12. Maintain the repository boundary.
13. Reuse MovieCard and shared components.
14. Support empty/loading/error states.
15. Support responsive behavior.
16. Follow the motion system.
17. Follow accessibility requirements.
18. Never implement backend authorization.
19. Never silently invent missing business rules.
20. Stop and request clarification whenever an unresolved product decision is required.

---

# 80. Definition of Done

MD-15 is complete when a customer can conceptually move through:

```text
LOGIN
  ↓
MY LIBRARY
  ↓
SEE WHAT I CAN ACCESS
  ↓
SEE WHAT I'M WATCHING
  ↓
RESUME CONTENT
  ↓
SEE PURCHASED / SUBSCRIPTION CONTENT
  ↓
SEE DOWNLOADS
  ↓
UNDERSTAND EXPIRATION
  ↓
DISCOVER WHAT TO WATCH NEXT
```

The Library must make the customer's relationship with the platform immediately understandable.

---

# 81. Final Product Principle

GIFTEDproMovies should not simply remember what a customer purchased.

It should understand the customer's **content state**.

```text
What they own
      +
What they can access
      +
What they are watching
      +
Where they stopped
      +
What is expiring
      +
What they downloaded
      +
What their subscription provides
      ↓
A personal media experience
```

That is the purpose of the Customer Library.

---

# 82. Next Document

Next:

```text
MD-16
16_PURCHASE_FLOW.md
```

MD-16 will define the complete **purchase and checkout experience**, including:

* Watch vs Download purchase decision
* Version selection
* Individual movie purchase
* Series purchase models
* Pricing presentation
* LIPA CTA
* Checkout
* Order summary
* Mobile Money payment UX
* Payment provider selection
* Payment pending
* Payment success
* Payment failure
* Cancelled payment
* Entitlement activation UX
* Context preservation
* Guest → Login → Checkout
* Subscription vs individual purchase
* Access duration presentation
* Frontend-only payment mock boundary

**End of MD-15**
