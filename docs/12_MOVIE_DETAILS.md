# GIFTEDproMovies

## Movie Details Experience & Content Conversion Flow

**Document ID:** MD-12
**File:** `12_MOVIE_DETAILS.md`
**Version:** 1.0
**Status:** Frontend Specification
**Product:** GIFTEDproMovies
**Scope:** Frontend only

---

## 1. Purpose

This document defines the complete frontend experience for the GIFTEDproMovies movie details page.

The movie details page is not simply an information page.

Its primary purposes are to:

1. Present the movie in a cinematic and premium way.
2. Give the customer enough information to make a decision.
3. Allow the customer to select a specific DJ/Translator version.
4. Clearly distinguish streaming from downloading.
5. Display version-specific pricing.
6. Display configurable access duration.
7. Guide the customer toward the correct action.
8. Respect authentication and entitlement states.
9. Encourage further discovery without distracting from the primary action.

The experience must feel like a premium streaming platform rather than a traditional movie-download website.

---

# 2. Route

The canonical public movie details route is:

```text
/movies/[slug]
```

Example:

```text
/movies/inception
```

The `slug` is public-facing and human-readable.

Admin/internal database IDs must never appear as the primary public route.

---

# 3. Entry Points

A customer may reach the movie details page from:

* Homepage
* Trending Movies
* Featured Movies
* New Releases
* Popular Movies
* Category pages
* Country pages
* DJ/Translator pages
* Search results
* Related movies
* Recommendation sections
* Direct URL
* Shared link
* Browser history
* Authenticated library/recommendation surfaces

All entry points should resolve to the same canonical movie detail experience.

---

# 4. Core Experience Principle

The page should answer these questions in this order:

```text
WHAT IS THIS?
      ↓
WHY SHOULD I WATCH IT?
      ↓
WHICH VERSION DO I WANT?
      ↓
HOW MUCH DOES IT COST?
      ↓
WHAT DO I GET?
      ↓
WHAT ACTION DO I TAKE?
```

The UI must not make customers hunt for:

* Movie title
* Version/DJ
* Price
* Access duration
* Watch option
* Download option
* Purchase action

---

# 5. Page Anatomy

The desktop experience should conceptually follow:

```text
┌──────────────────────────────────────────────────────────────┐
│ Global Navigation                                            │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│              CINEMATIC MOVIE HERO                            │
│                                                              │
│   ┌───────────────┐     Movie Title                         │
│   │               │     Metadata                             │
│   │    POSTER     │     Description                          │
│   │               │     Categories / Country                 │
│   │               │     Trailer / Actions                    │
│   └───────────────┘                                         │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ VERSION / DJ / TRANSLATOR SELECTION                         │
├──────────────────────────────────────────────────────────────┤
│ WATCH / STREAM                  DOWNLOAD                     │
│ Price                           Price                        │
│ Access duration                 Access duration              │
│ CTA                             CTA                          │
├──────────────────────────────────────────────────────────────┤
│ Additional Movie Information                                │
├──────────────────────────────────────────────────────────────┤
│ Related / More Like This                                    │
├──────────────────────────────────────────────────────────────┤
│ More from DJ / Category / Country                            │
└──────────────────────────────────────────────────────────────┘
```

Mobile must transform this hierarchy rather than simply shrink the desktop layout.

---

# 6. Cinematic Hero

The hero is the visual introduction to the movie.

It should use:

* High-quality backdrop
* Movie poster
* Strong title
* Supporting metadata
* Description
* Category information
* Country
* Release year
* Duration
* Trailer action where available
* Primary action area

The backdrop should visually dominate the upper portion of the page while maintaining sufficient contrast for readable content.

---

# 7. Backdrop Treatment

The backdrop should support:

* Large cinematic image
* Dark gradient overlay
* Bottom fade into page background
* Left-to-right readability gradient where appropriate
* Subtle image movement according to MD-05
* No excessive visual effects

The image must never make the title or CTA difficult to read.

The background should feel cinematic, not like a decorative wallpaper.

---

# 8. Poster

The poster remains the primary recognizable representation of the movie.

Poster requirements:

* Aspect ratio: approximately `2:3`
* High-resolution source
* Consistent cropping
* Rounded corners according to MD-03
* No excessive border
* Optional subtle elevation
* Appropriate responsive sizing

Desktop:

```text
Backdrop
    +
Poster
    +
Information
```

Mobile:

```text
Backdrop
    ↓
Poster
    ↓
Information
```

The poster should not become so large on mobile that it pushes the important purchasing information too far down the page.

---

# 9. Movie Title

The title is the strongest textual element.

Hierarchy:

```text
Movie Title
Supporting metadata
Description
Categories / Country
```

The title should:

* Use the display typography defined by MD-02/MD-03.
* Support long titles.
* Wrap naturally.
* Never overflow horizontally.
* Maintain strong contrast.
* Avoid unnecessary uppercase transformation.

Do not artificially truncate a title when sufficient space exists.

---

# 10. Movie Metadata

The movie details area should expose relevant information such as:

```text
2026
•
2h 14m
•
Action
•
USA
```

Depending on available data, metadata can include:

* Release year
* Duration
* Category
* Country
* Content type
* DJ/Translator
* Version

Metadata must remain compact and scannable.

Do not create a huge technical specification table for normal customers.

---

# 11. Description

The description should provide the customer with enough context to understand the movie.

Requirements:

* Readable line length
* Strong contrast
* Comfortable spacing
* Responsive typography
* Expand/collapse only when genuinely necessary

For long descriptions:

```text
Short readable preview
        ↓
Read more
        ↓
Full description
```

Do not hide essential information inside a collapsed area.

---

# 12. Categories and Countries

Categories and countries should be presented as interactive discovery elements where appropriate.

Example:

```text
Action   Thriller   Adventure
```

and:

```text
United States
```

Clicking a category should lead to:

```text
/categories/[slug]
```

Clicking a country should lead to:

```text
/countries/[slug]
```

This creates a continuous discovery loop.

---

# 13. Trailer

If a trailer exists, the movie page may expose a trailer action.

Preferred experience:

```text
▶ Watch Trailer
```

The trailer should open through an appropriate cinematic modal/player rather than immediately navigating the customer away from the movie page.

Requirements:

* Dark backdrop
* Focus management
* Keyboard accessible close action
* Responsive player
* Appropriate loading state
* Escape-to-close on desktop
* Touch-friendly controls on mobile

If no trailer exists, do not render a broken or disabled-looking trailer control.

---

# 14. DJ / Translator / Version Model

A movie may have multiple versions.

Example:

```text
Movie: Example Movie

Available Versions

[ DJ Mack ]
[ DJ John ]
[ Original ]
[ Swahili Translator ]
```

The customer must understand that these represent distinct available versions.

Selecting a version changes the relevant information shown on the page.

---

# 15. Version Selection

Version selection is a core interaction.

The selected version must have a clearly visible active state.

Example:

```text
DJ Mack       DJ John       Original
────────
Selected
```

The interface should communicate:

```text
Selected Version
      ↓
Applicable Media
      ↓
Applicable Price
      ↓
Applicable Access
```

When the selected version changes:

* Price updates smoothly.
* Version identity updates.
* Relevant media information updates.
* CTA state updates.
* Selection feedback is immediate.

Do not reload the entire page simply because the customer selected another version.

---

# 16. Version-Specific Pricing

Pricing belongs to the selected version.

Example:

```text
DJ Mack

Watch
TZS 2,000
Access: 7 days

Download
TZS 3,500
Access: 7 days
```

Another version may legitimately have different pricing:

```text
DJ John

Watch
TZS 2,500

Download
TZS 4,000
```

The frontend must therefore never assume that all versions share the same price.

---

# 17. Streaming vs Download

Streaming and downloading are separate purchase/access options.

The UI must make this distinction obvious.

Recommended conceptual presentation:

```text
WATCH
Stream online
TZS X
Access for Y days
[ WATCH / LIPA ]

DOWNLOAD
Download for offline use
TZS X
Access for Y days
[ DOWNLOAD / LIPA ]
```

The exact wording may be refined during UI implementation, but the distinction must remain.

---

# 18. Access Duration

Access duration is configurable by Admin.

The frontend must consume the duration from data.

Examples:

```text
Access for 3 days
```

or:

```text
Access for 7 days
```

or:

```text
Access for 30 days
```

The frontend must NOT hardcode:

```text
7 days
```

or any other duration as a permanent business rule.

---

# 19. Primary Conversion Area

The purchase area should be visually important without becoming aggressive.

Recommended hierarchy:

```text
Selected Version
      ↓
Watch / Download Options
      ↓
Price
      ↓
Access Duration
      ↓
LIPA
```

The customer should immediately understand what they are paying for.

---

# 20. LIPA CTA

The purchase action should use the platform's defined purchase language.

Primary CTA concept:

```text
LIPA
```

or an appropriate contextual variant such as:

```text
LIPA TZS 2,000
```

The exact CTA presentation can adapt to the selected action.

Crimson should be used for primary transactional action according to MD-03.

Gold may be used for premium/subscription context.

---

# 21. Guest Customer State

Guests can:

* View movie details.
* View poster/backdrop.
* Read description.
* See metadata.
* Browse versions.
* See pricing.
* See access duration.
* Watch an available public trailer.
* Explore related content.

Guests do not need to authenticate merely to browse the page.

Authentication should become necessary when attempting an account-protected action.

---

# 22. Authentication Trigger

If a guest selects:

```text
WATCH
DOWNLOAD
LIPA
SUBSCRIBE
```

and authentication is required, the application should trigger the appropriate authentication flow.

Preferred flow:

```text
Movie Details
      ↓
Customer chooses action
      ↓
Login / Register
      ↓
Return to intended movie/action
      ↓
Continue checkout/access flow
```

The customer should not lose:

* Selected movie
* Selected version
* Selected action
* Relevant purchase context

after authentication.

---

# 23. Authenticated Customer State

Authenticated customers may see additional contextual information.

Examples:

```text
You own this movie
```

or:

```text
Available in your library
```

or:

```text
Included with your subscription
```

The exact state depends on future entitlement data.

The frontend must consume entitlement information rather than trying to calculate ownership itself.

---

# 24. Active Purchased State

If the customer already owns the selected version and access is active:

```text
Access Active
Expires: [date]
```

The CTA should change from purchase-oriented action to access-oriented action.

Example:

```text
▶ WATCH NOW
```

and, where permitted:

```text
↓ DOWNLOAD
```

Do not ask the customer to purchase the same active entitlement again.

---

# 25. Expired Entitlement

If the customer's previous access has expired:

```text
Access expired
```

The normal purchase options should become available again.

The customer should be able to purchase new access according to the current pricing configuration.

---

# 26. Version Ownership Isolation

If the customer owns:

```text
DJ Mack version
```

but not:

```text
DJ John version
```

the UI must reflect that difference.

Example:

```text
DJ Mack
✓ You have access

DJ John
TZS X
[ LIPA ]
```

Buying one version must never visually imply ownership of every version.

---

# 27. Subscription-Included State

If a selected movie/version is included in an active subscription:

```text
Included with your subscription
```

The primary action can become:

```text
▶ WATCH NOW
```

The UI may still explain applicable download restrictions where relevant.

Subscription logic must come from the future entitlement/subscription source.

Do not hardcode which movies belong to a subscription.

---

# 28. Subscription Does Not Replace Individual Ownership

The movie page must support both:

```text
Subscription access
```

and:

```text
Individual purchase access
```

If a customer has individually purchased a movie and their subscription later expires, the UI must not incorrectly remove the independently owned entitlement.

The frontend should display the state supplied by the authoritative future data source.

---

# 29. Related Content

After the primary movie information and purchase decision, show related discovery.

Possible sections:

```text
You May Also Like
```

```text
More from [Category]
```

```text
More from [Country]
```

```text
More from [DJ/Translator]
```

Related content must not dominate the page before the primary movie decision.

---

# 30. Discovery Loop

The movie page should help customers continue exploring.

Example:

```text
Movie
 ↓
DJ
 ↓
More from DJ
 ↓
Another Movie
 ↓
Category
 ↓
More Movies
```

This should feel intentional rather than like an infinite collection of random cards.

---

# 31. Movie Card Reuse

Related content must reuse the canonical `MovieCard` component defined in MD-07.

Do not create separate visually inconsistent cards specifically for the movie details page unless a clearly documented variant is required.

Allowed:

```text
<MovieCard variant="compact" />
```

Not preferred:

```text
<MovieDetailsRelatedMovieCard />
```

when the existing component can satisfy the requirement.

---

# 32. Desktop Layout

Desktop should use a wide cinematic composition.

Conceptually:

```text
┌──────────────────────────────────────────────────────┐
│                                                      │
│  POSTER        TITLE                                 │
│                Metadata                              │
│                Description                           │
│                Categories                            │
│                Trailer / secondary action            │
│                                                      │
└──────────────────────────────────────────────────────┘

              VERSION SELECTION

        ┌─────────────┐   ┌─────────────┐
        │    WATCH    │   │   DOWNLOAD  │
        │    TZS X    │   │    TZS X    │
        │   Y DAYS    │   │    Y DAYS    │
        │    LIPA     │   │     LIPA    │
        └─────────────┘   └─────────────┘
```

The layout should feel spacious and premium.

---

# 33. Mobile Layout

Mobile must prioritize:

1. Movie identity
2. Description
3. Version
4. Purchase options
5. Related discovery

Conceptually:

```text
Backdrop
   ↓
Poster
   ↓
Title
   ↓
Metadata
   ↓
Description
   ↓
Trailer
   ↓
Version Selector
   ↓
Watch / Download
   ↓
Related Movies
```

Avoid forcing desktop two-column layouts onto narrow screens.

---

# 34. Mobile Purchase Area

The primary purchase/action area should remain easy to reach.

Where appropriate, a sticky bottom action bar may be used:

```text
┌─────────────────────────────────┐
│ WATCH                 LIPA      │
└─────────────────────────────────┘
```

However, sticky actions must not:

* Cover important content.
* Block navigation.
* Interfere with browser controls.
* Become visually overwhelming.

Use safe-area spacing on supported mobile devices.

---

# 35. Loading State

Movie details must have a dedicated skeleton state.

Skeleton should represent:

* Backdrop
* Poster
* Title
* Metadata
* Description
* Version selector
* Purchase options
* Related content

Do not display a blank page while the movie data is loading.

Skeleton animation must follow MD-05.

---

# 36. Not Found State

If the movie slug does not resolve:

```text
Movie not found
```

Provide:

```text
Back to Movies
```

and optionally:

```text
Explore Trending
```

The page should remain within the platform's visual language.

---

# 37. Error State

For recoverable loading/data errors:

```text
Something went wrong
```

Provide:

```text
Try again
```

where retry is meaningful.

Do not expose technical errors such as:

```text
AxiosError 500
PrismaException
SQL connection failed
```

to customers.

---

# 38. Empty Data States

Optional data must degrade gracefully.

Examples:

No trailer:

```text
Trailer unavailable
```

No related movies:

Do not create an awkward empty section.

No additional DJ versions:

Do not show an empty version selector.

The UI should adapt to available data.

---

# 39. Motion

Movie details must use the motion principles defined in:

```text
04_MOTION_SYSTEM.md
```

Recommended interactions include:

* Hero entrance animation
* Poster transition
* Metadata stagger
* CTA hover feedback
* Version selector transition
* Price transition
* Trailer modal entrance
* Related content reveal
* Smooth state changes

Motion must communicate hierarchy and interaction.

Do not animate every element independently.

---

# 40. Shared Element / Page Transition

When supported reliably by the chosen Next.js/React implementation, navigation from a MovieCard to its details page may use a shared visual transition.

Concept:

```text
MovieCard Poster
       ↓
     expands
       ↓
Movie Details Poster/Hero
```

This should be treated as progressive enhancement.

The page must remain correct if the transition is unavailable.

---

# 41. Accessibility

The movie page must support:

* Keyboard navigation
* Visible focus states
* Semantic headings
* Accessible buttons
* Accessible version selection
* Accessible trailer dialog
* Screen-reader-friendly metadata
* Sufficient color contrast
* Reduced-motion preference
* Touch-friendly controls
* No hover-only essential information

The selected version must have a programmatically understandable state.

---

# 42. SEO

Because movie details are public discovery pages, the route should support appropriate metadata.

Each movie page should derive public metadata from movie data:

```text
Title
Description
Open Graph title
Open Graph description
Open Graph image
Canonical URL
```

Use:

```text
/movies/[slug]
```

as the canonical public URL.

Do not expose private customer information in metadata.

---

# 43. Sharing

The movie details URL should be directly shareable.

Example:

```text
https://giftedpromovies.com/movies/example-movie
```

Sharing should open the public movie page without requiring authentication.

Authentication is only required when performing protected actions.

---

# 44. Data Boundary

The page must not directly depend on backend implementation.

Required architecture:

```text
Movie Details UI
        ↓
Movie Details Hook / Controller
        ↓
Movie Repository
        ↓
Typed Mock Data
```

Future:

```text
Movie Details UI
        ↓
Movie Details Hook / Controller
        ↓
Movie Repository
        ↓
API
```

The UI should not need to be rewritten when mock data is replaced with real API data.

---

# 45. No Backend Implementation

This document does NOT authorize implementation of:

* Database
* Prisma
* MySQL
* API endpoints
* Payment gateway
* Mobile money integration
* Real authentication backend
* Video storage
* DRM
* Download server
* Subscription backend
* Entitlement backend

Those belong to future backend specifications.

---

# 46. Business Rules That Must Remain Configurable

The frontend must not invent fixed values for:

* Streaming price
* Download price
* Access duration
* Subscription price
* Subscription duration
* Series pricing model
* Payment provider
* Maximum devices
* Media Team publishing approval

These values must come from typed data/configuration.

---

# 47. Security Boundary

The frontend may display entitlement states, but must never be treated as the authority for access.

For example:

```text
isPurchased: true
```

is a UI representation.

The future backend must remain authoritative for:

* Ownership
* Payment verification
* Entitlement validity
* Streaming authorization
* Download authorization
* Subscription validity
* Device access

Frontend state must never be considered proof of payment.

---

# 48. Component Composition

A movie details page may conceptually compose:

```text
<MovieDetailsPage>

  <MovieHero />

  <MovieMetadata />

  <TrailerButton />

  <MovieVersionSelector />

  <PurchaseOptions />

  <WatchOption />

  <DownloadOption />

  <RelatedContent />

</MovieDetailsPage>
```

Actual component names should follow MD-07 and existing project conventions.

Do not create duplicate components when an existing shared component already satisfies the requirement.

---

# 49. State Ownership

The page should distinguish:

### URL state

Examples:

```text
movie slug
```

### UI state

Examples:

```text
selected version
trailer open/closed
expanded description
```

### Data state

Examples:

```text
movie
versions
related movies
```

### Auth/entitlement state

Examples:

```text
authenticated user
active entitlement
subscription status
```

Do not mix these responsibilities into one uncontrolled component.

---

# 50. Version Selection State

Selected version should be deterministic.

Preferred priority:

```text
Explicit URL selection, if implemented
        ↓
Previously selected valid version
        ↓
First available version
```

If there is only one version, the UI should avoid creating unnecessary selection complexity.

---

# 51. Purchase Context Preservation

When the customer begins an action, preserve:

```text
movie
selected version
action type
```

Example:

```text
Movie: Example Movie
Version: DJ Mack
Action: DOWNLOAD
```

If login is required, this context must survive the authentication flow.

---

# 52. UX Rule: Never Hide the Important Decision

The customer must never have to:

* Open several unrelated menus to find the price.
* Scroll excessively to discover whether download is available.
* Guess which DJ is selected.
* Guess whether access is temporary.
* Guess whether the movie is already owned.
* Guess whether subscription access applies.

The page should communicate these states visually.

---

# 53. Visual Priority

Priority order:

```text
1. Movie identity
2. Selected version
3. Watch / Download
4. Price
5. Access duration
6. Description
7. Metadata
8. Related discovery
```

This does not mean the description must literally appear below pricing on every screen.

It means the visual hierarchy must support the customer's decision-making process.

---

# 54. Performance

The movie details page must:

* Optimize large backdrop images.
* Optimize poster loading.
* Lazy-load below-the-fold content.
* Avoid unnecessary client-side JavaScript.
* Use Server Components where possible.
* Keep interactive components client-side only where needed.
* Avoid expensive continuous animation.
* Use transform/opacity for animation.
* Avoid layout-heavy animation.
* Support responsive image sizing.

The hero image must not unnecessarily block the entire page from becoming interactive.

---

# 55. Responsive Transformation

Responsive behavior must be designed, not merely inherited from CSS.

Desktop:

```text
cinematic wide composition
```

Tablet:

```text
compressed cinematic composition
```

Mobile:

```text
vertical cinematic experience
```

Cards, typography, spacing, controls and purchase actions must all adapt.

---

# 56. Anti-Patterns

Do NOT implement:

* Generic movie download website UI
* Netflix clone
* Giant red buttons everywhere
* Price hidden behind multiple clicks
* DJ selection as plain unstyled `<select>` when a better component is appropriate
* Unrelated information overload
* Desktop layout squeezed into mobile
* Hover-only functionality
* Excessive glassmorphism
* Excessive blur
* Excessive animations
* Fake backend logic
* Hardcoded prices
* Hardcoded access duration
* Hardcoded payment provider
* Client-side payment verification
* Client-side entitlement authority

---

# 57. Customer Journey Examples

## Scenario A — Guest watches

```text
Homepage
 ↓
Movie
 ↓
Select DJ Mack
 ↓
WATCH
 ↓
Login/Register
 ↓
Payment flow
 ↓
Success
 ↓
Watch
```

---

## Scenario B — Existing customer watches

```text
Movie
 ↓
DJ Mack already owned
 ↓
Access Active
 ↓
WATCH NOW
 ↓
Player
```

No unnecessary purchase flow.

---

## Scenario C — Customer chooses another DJ

```text
Movie
 ↓
DJ Mack
 ↓
DJ John
 ↓
Price changes
 ↓
Customer selects DOWNLOAD
 ↓
LIPA
```

The UI must clearly indicate that the customer is purchasing the selected DJ/version.

---

## Scenario D — Expired access

```text
Movie
 ↓
DJ Mack
 ↓
Access Expired
 ↓
Purchase Options
 ↓
LIPA
```

---

## Scenario E — Subscription access

```text
Movie
 ↓
Selected version
 ↓
Included with subscription
 ↓
WATCH NOW
```

The individual purchase option may still be presented where business rules require it.

---

# 58. Acceptance Criteria

The movie details experience is accepted only when:

* `/movies/[slug]` works with typed mock data.
* Movie information is presented clearly.
* Poster and backdrop are responsive.
* Title and metadata hierarchy is strong.
* Description is readable.
* Categories and countries support discovery.
* Trailer works when available.
* Missing trailer does not create broken UI.
* Multiple DJ/Translator versions can be selected.
* Selected version is visually obvious.
* Version selection updates relevant information.
* Streaming and download are visually distinct.
* Prices are version-specific.
* Access duration is data-driven.
* No fixed price is hardcoded.
* No fixed access duration is hardcoded.
* Guest browsing works without authentication.
* Protected actions can trigger authentication.
* Intended action context survives login flow.
* Active entitlement state is represented.
* Expired entitlement state is represented.
* Subscription-included state can be represented.
* Version-specific ownership is represented correctly.
* Related content works.
* Loading state exists.
* Error state exists.
* Not-found state exists.
* Empty optional data is handled gracefully.
* Desktop layout is polished.
* Mobile layout is intentionally designed.
* Accessibility requirements are satisfied.
* Motion follows MD-05.
* Performance rules are respected.
* Public metadata is generated from movie data.
* No backend implementation is introduced.
* No financial authority is implemented on the frontend.
* Existing shared components are reused where appropriate.

---

# 59. AI Coding Agent Directive

The coding agent MUST treat this document as an implementation contract.

The agent MUST NOT:

* Invent business rules.
* Invent prices.
* Invent access durations.
* Assume one DJ per movie.
* Assume one version per movie.
* Assume subscription replaces individual purchases.
* Assume a fixed payment provider.
* Implement backend functionality.
* Implement real payment processing.
* Implement fake payment verification.
* Treat frontend entitlement state as authoritative.
* Create duplicate components unnecessarily.
* Replace the established visual language with generic UI.
* Turn the movie page into a Netflix clone.
* Ignore mobile behavior.
* Remove loading/error/empty states.
* Add decorative animations without interaction purpose.

If a requirement is ambiguous, the agent must stop and identify the ambiguity instead of silently choosing a business rule.

The agent may make implementation-level decisions only when they do not alter the product behavior defined by the documentation.

---

# 60. Definition of Done

MD-12 is considered implemented when the movie details page feels like a production-quality GIFTEDproMovies experience.

The page should communicate:

```text
This is the movie.
        ↓
This is the version I want.
        ↓
This is what I will get.
        ↓
This is how much it costs.
        ↓
This is how long I have access.
        ↓
This is how I WATCH or DOWNLOAD.
```

The customer should never need technical knowledge to understand the experience.

The implementation must remain compatible with the future backend architecture.

---

# 61. Relationship With Previous Documents

This document depends on:

```text
00_PROJECT_RULES.md
01_TECH_STACK.md
02_DESIGN_SYSTEM.md
03_VISUAL_LANGUAGE.md
04_MOTION_SYSTEM.md
05_FRONTEND_ARCHITECTURE.md
06_ROUTE_MAP.md
07_COMPONENT_ARCHITECTURE.md
08_DATA_MODELS.md
09_MOCK_DATA_CONTRACT.md
10_PUBLIC_EXPERIENCE.md
11_SEARCH_DISCOVERY.md
```

These documents collectively define the foundation for MD-12.

MD-12 does not override previous documents unless an explicit future revision says so.

---

# 62. Next Document

Next:

```text
13_SERIES_EXPERIENCE.md
```

That document will define the complete Series → Season → Episode experience, including series discovery, season navigation, episode selection, episode-specific access, pricing presentation, subscription context, playback flow and responsive behavior.

---

# FINAL DIRECTIVE

Build the movie details page as a **cinematic product experience**, not as a database record.

The customer should feel that GIFTEDproMovies understands what they want to watch and makes the decision to watch, download or purchase extremely clear.

**Premium. Cinematic. Intelligent. Fast. Responsive. Conversion-focused.**
