# GIFTEDproMovies

## Series Experience & Episode Discovery Flow

**Document ID:** MD-13
**File:** `13_SERIES_EXPERIENCE.md`
**Version:** 1.0
**Status:** Frontend Specification
**Product:** GIFTEDproMovies
**Scope:** Frontend only

---

# 1. Purpose

This document defines the complete frontend experience for TV series and episodic content on GIFTEDproMovies.

The experience must support the complete content hierarchy:

```text
SERIES
  ↓
SEASONS
  ↓
EPISODES
  ↓
EPISODE ACCESS
  ↓
WATCH / DOWNLOAD
```

The series experience must feel like a first-class part of the platform.

It must not feel like a movie page with a few extra episode cards attached.

---

# 2. Core Principle

A series is a content container.

An episode is an individual playable content item.

Therefore:

```text
Series
├── Season 1
│   ├── Episode 1
│   ├── Episode 2
│   └── Episode 3
│
├── Season 2
│   ├── Episode 1
│   ├── Episode 2
│   └── Episode 3
│
└── Season 3
    ├── Episode 1
    └── Episode 2
```

The UI must preserve this hierarchy at all times.

---

# 3. Routes

Series details:

```text
/series/[slug]
```

Example:

```text
/series/the-last-kingdom
```

Episode route:

```text
/series/[seriesSlug]/season/[seasonNumber]/episode/[episodeNumber]
```

Example:

```text
/series/the-last-kingdom/season/2/episode/4
```

The public route should use human-readable slugs and numbers.

Internal database IDs must not become the primary public URL.

---

# 4. Series Entry Points

Customers may discover a series through:

* Homepage
* Search
* Trending content
* Featured content
* New releases
* Popular content
* Category pages
* Country pages
* DJ/Translator pages
* Related movies
* Related series
* Direct URL
* Shared URL
* Recommendations
* Continue Watching

All routes must lead to the same canonical series experience.

---

# 5. Series Details Page

The series page should communicate:

1. What is this series?
2. What is it about?
3. How many seasons exist?
4. How many episodes are available?
5. Which season is selected?
6. Which episodes are available?
7. What access/purchase options exist?
8. What content can the customer watch immediately?

---

# 6. Series Hero

The series page should use the same cinematic visual language established by MD-03 and MD-04.

Hero content may include:

* Backdrop
* Series poster
* Series title
* Description
* Release information
* Category/categories
* Country/countries
* Number of seasons
* Episode count
* Trailer
* Primary action where appropriate

Conceptually:

```text
┌─────────────────────────────────────────────┐
│                                             │
│  POSTER       SERIES TITLE                  │
│               Metadata                      │
│               Description                   │
│               Categories                    │
│               ▶ Trailer                     │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 7. Series Metadata

Relevant metadata may include:

* Release year
* Category
* Country
* Number of seasons
* Number of episodes
* DJ/Translator information where applicable
* Series status where available

Metadata should remain compact.

Do not overwhelm customers with internal data.

---

# 8. Series Description

The description follows the same principles as movie descriptions.

It must:

* Be readable.
* Support long descriptions.
* Maintain strong contrast.
* Work on mobile and desktop.
* Support expandable content when necessary.

Do not hide critical purchasing or access information inside the description.

---

# 9. Trailer

If a series trailer exists, provide:

```text
▶ Watch Trailer
```

The trailer should open using the same cinematic modal/player pattern defined for movies.

If no trailer exists:

* Do not show a broken trailer button.
* Do not create an empty player area.

---

# 10. Season Navigation

Season navigation is a primary interaction.

Example:

```text
Seasons

[ Season 1 ]
[ Season 2 ]
[ Season 3 ]
```

The selected season must have a strong active state.

Changing seasons should update the episode list without requiring a full page reload.

---

# 11. Season Selector Behavior

The selector must support:

* Click/tap selection.
* Keyboard navigation.
* Clear selected state.
* Smooth transition.
* Mobile-friendly interaction.

For a large number of seasons, use an appropriate compact selector rather than rendering a huge row of buttons.

Possible mobile presentation:

```text
Season 2       ▼
```

Opening it may present:

```text
Season 1
Season 2 ✓
Season 3
Season 4
```

---

# 12. Episode List

The selected season displays its episodes.

Each episode should communicate enough information for quick scanning.

Recommended:

```text
┌──────────────────────────────────────────────┐
│ Thumbnail  EPISODE 4                         │
│           The Long Road                      │
│           48 min                             │
│                                              │
│           [ WATCH ]                           │
└──────────────────────────────────────────────┘
```

Depending on screen size, the layout may become more compact.

---

# 13. Episode Information

An episode may display:

* Episode number
* Episode title
* Thumbnail
* Description/summary
* Duration
* Release date where available
* DJ/Translator/version information
* Access state
* Watch action
* Download action where available

Do not expose unnecessary technical media information.

---

# 14. Episode Card

Episode cards should be reusable.

A recommended shared product component may support:

```text
<EpisodeCard
  variant="default"
/>
```

Possible variants:

```text
default
compact
continueWatching
locked
owned
```

Do not create a separate component for every minor visual variation.

---

# 15. Episode Selection

Selecting an episode should navigate to its dedicated public route when the customer wants detailed episode information or playback.

Example:

```text
/series/the-last-kingdom/season/2/episode/4
```

However, quick actions may allow:

```text
WATCH
DOWNLOAD
```

directly from the episode card when the state is already clear.

---

# 16. Episode Details

The episode page should follow a simplified cinematic structure.

It should communicate:

```text
Series
↓
Season
↓
Episode
↓
Episode title
↓
Description
↓
Version
↓
Access
↓
Watch / Download
```

The episode page must make it obvious which series and season the customer is currently viewing.

---

# 17. Breadcrumb / Context

The episode experience should maintain contextual navigation.

Example:

```text
Series
/
Season 2
/
Episode 4
```

This helps the customer return to the series or season.

On mobile, this can be simplified to a compact back/context control.

---

# 18. Previous / Next Episode

The episode experience should support:

```text
← Previous Episode
Next Episode →
```

when applicable.

Do not show:

```text
Previous Episode
```

for the first episode.

Do not show:

```text
Next Episode
```

for the final available episode.

The controls should reflect actual available episode data.

---

# 19. Continue Watching

Authenticated customers may see continuation context.

Example:

```text
Continue Watching

Season 2 · Episode 4
```

The customer should be able to resume from the appropriate episode.

Playback progress itself will eventually be backend-authoritative.

The frontend may display mock progress during frontend development.

---

# 20. Episode Completion

The UI may represent:

```text
Watched
In Progress
Not Started
```

Example:

```text
Episode 4
████████░░ 80%
```

This is a presentation state only during frontend development.

The final playback/progress system belongs to the future backend/player architecture.

---

# 21. DJ / Translator Versions

If episodes support different DJ/Translator versions, the UI must clearly represent them.

Example:

```text
Episode 4

Version

[ DJ Mack ]
[ DJ John ]
[ Original ]
```

The selected version controls the applicable media/access information.

---

# 22. Version Isolation

If a customer has access to:

```text
DJ Mack
```

the UI must not imply access to:

```text
DJ John
```

unless the authoritative entitlement says so.

This is particularly important because version-specific purchasing is part of the GIFTEDproMovies business model.

---

# 23. Episode Pricing

Series pricing remains configurable.

The frontend must support future pricing models without redesigning the entire experience.

Potential models include:

```text
PER_EPISODE
PER_SEASON
FULL_SERIES
COMBINATION
```

These are provisional models defined in MD-08.

The final business decision has not yet been locked.

Therefore, the frontend must not assume one pricing model.

---

# 24. Per-Episode Purchase

If the configured series pricing supports episode-level purchase:

```text
Episode 4

WATCH
TZS X
Access for Y days

DOWNLOAD
TZS X
Access for Y days

[LIPA]
```

Prices and durations must come from data.

---

# 25. Per-Season Purchase

If the configured pricing supports season-level access:

```text
Season 2

Season Access
TZS X
Access for Y days

[LIPA]
```

The UI should make it clear that the purchase applies to the season.

Do not make the customer guess whether the purchase unlocks:

* One episode
* The entire season
* The entire series

---

# 26. Full-Series Purchase

If the configured pricing supports full-series access:

```text
Complete Series
TZS X
Access for Y days

[LIPA]
```

The scope must be explicitly communicated.

---

# 27. Combination Pricing

If multiple pricing options are enabled, the interface may present:

```text
Episode
Season
Complete Series
```

Example:

```text
Choose Access

○ Episode 4
  TZS X

○ Season 2
  TZS X

○ Complete Series
  TZS X
```

The UI should clearly identify the scope of every purchase.

---

# 28. Watch vs Download

Where both options are available, maintain the same distinction established for movies.

```text
WATCH
Stream online

DOWNLOAD
Offline access
```

Each option must show:

* Price
* Access duration
* Availability
* Current entitlement state

---

# 29. LIPA

Primary transaction action remains:

```text
LIPA
```

The CTA should be contextual.

Example:

```text
LIPA TZS X
```

The interface may adapt the CTA according to:

* Selected episode
* Selected season
* Full series
* Watch
* Download
* Selected version

---

# 30. Guest State

Guests can:

* Browse series.
* View series details.
* Browse seasons.
* View episodes.
* View pricing.
* View trailers.
* Explore DJs/categories/countries.
* View public episode details.

Authentication is required only when an action requires an account.

---

# 31. Authentication Flow

Example:

```text
Series
 ↓
Season 2
 ↓
Episode 4
 ↓
DOWNLOAD
 ↓
Login/Register
 ↓
Return to intended action
 ↓
Checkout
```

The customer must not lose:

* Series
* Season
* Episode
* Version
* Action
* Purchase scope

during authentication.

---

# 32. Active Entitlement

If an episode is already accessible:

```text
Access Active
Expires: [date]
```

The UI should provide:

```text
WATCH NOW
```

and, where permitted:

```text
DOWNLOAD
```

Do not force an unnecessary purchase flow.

---

# 33. Expired Access

If access has expired:

```text
Access Expired
```

The appropriate purchase options should become available.

The frontend must not invent the expiry date.

It should display the value supplied by the future authoritative source.

---

# 34. Subscription Access

If the series/episode is included in an active subscription:

```text
Included with your subscription
```

The customer can be directed toward:

```text
WATCH NOW
```

where appropriate.

Subscription access must remain independent from individually purchased entitlements.

---

# 35. Library Integration

Authenticated customers should be able to find series they have access to from:

```text
/library
```

A library item may show:

```text
Series
Season 2
Episode 4
Continue
```

The series page should recognize library/entitlement context where supplied.

---

# 36. Series Progress

For authenticated users, a series may show overall progress.

Example:

```text
Season 2
4 of 10 episodes watched
```

or:

```text
Continue Episode 5
```

This is a user-experience enhancement, not a replacement for backend playback tracking.

---

# 37. Series Recommendations

After the episode/season experience, related content may include:

```text
You May Also Like
```

```text
More Series in [Category]
```

```text
More from [Country]
```

```text
More from [DJ/Translator]
```

The recommendation system must remain consistent with MD-10 and MD-11 discovery principles.

---

# 38. Episode-to-Episode Navigation

The customer should be able to move naturally:

```text
Episode 1
 ↓
Episode 2
 ↓
Episode 3
 ↓
Episode 4
```

The interface should not force the customer to return to the series page after every episode.

---

# 39. Season-to-Season Navigation

The series page must make it easy to move:

```text
Season 1
 ↓
Season 2
 ↓
Season 3
```

Changing season should preserve the overall series context.

---

# 40. Mobile Experience

Mobile is a first-class experience.

Recommended structure:

```text
Backdrop
↓
Poster
↓
Series title
↓
Metadata
↓
Description
↓
Trailer
↓
Season selector
↓
Episode list
↓
Access / purchase state
↓
Related content
```

Season selection should be easy to reach.

---

# 41. Mobile Episode Cards

Mobile episode cards should prioritize:

1. Thumbnail
2. Episode number/title
3. Duration
4. Access state
5. Primary action

Do not cram every available piece of metadata into the card.

---

# 42. Desktop Experience

Desktop may use a more information-rich layout.

Example:

```text
Series Hero
        ↓
Season Navigation
        ↓
Episode Grid/List
        ↓
Related Content
```

Episode cards may use larger thumbnails and richer hover interactions.

---

# 43. Hover Behavior

Desktop episode cards may reveal:

* Watch
* Download
* Duration
* Progress
* Access state

Hover must not be required to discover essential information.

Mobile must expose equivalent functionality through tap/detail interactions.

---

# 44. Loading State

Series loading state should include skeletons for:

* Hero
* Poster
* Metadata
* Season selector
* Episode list
* Related content

Episode loading should use a dedicated episode skeleton.

Do not show a blank page.

---

# 45. Empty Seasons

If a season contains no published episodes, the UI should communicate:

```text
No episodes available yet.
```

Avoid rendering an empty grid with no explanation.

---

# 46. Empty Series

If a series exists but currently has no available seasons/episodes:

```text
Episodes coming soon.
```

The exact copy may be refined during implementation.

The page should remain useful through:

* Series information
* Trailer
* Related content
* Discovery navigation

where available.

---

# 47. Not Found

Invalid series:

```text
Series not found
```

Invalid episode:

```text
Episode not found
```

Provide appropriate navigation back to:

* Series
* Movies
* Trending
* Search

---

# 48. Error State

Recoverable data errors should provide:

```text
Something went wrong
[Try Again]
```

Do not expose:

* API stack traces
* Database errors
* Internal IDs
* Framework errors
* Payment provider errors

to normal customers.

---

# 49. Accessibility

Series and episode experiences must support:

* Keyboard navigation
* Visible focus states
* Semantic headings
* Accessible season selectors
* Accessible episode cards
* Accessible buttons
* Accessible dialogs
* Screen-reader-friendly state information
* Reduced motion
* Touch-friendly controls
* Sufficient contrast

The active season must be programmatically identifiable.

---

# 50. Motion

Motion follows MD-05.

Appropriate motion includes:

* Series hero entrance
* Season selector transition
* Episode list reveal
* Active season indicator
* Episode card hover
* Trailer modal
* Purchase state changes
* Previous/next episode transition
* Continue Watching interaction

Motion must remain purposeful.

Do not animate every episode card continuously.

---

# 51. Performance

Series pages can contain significantly more content than movie pages.

Therefore:

* Do not render unnecessary seasons simultaneously.
* Load only the selected season's episode content where practical.
* Lazy-load below-the-fold content.
* Optimize episode thumbnails.
* Avoid rendering hundreds of heavy media components at once.
* Keep player code isolated from browsing UI.
* Avoid expensive continuous animations.
* Prefer Server Components where possible.
* Use client components only for interactive behavior.

---

# 52. Data Boundary

Required frontend architecture:

```text
Series UI
    ↓
Series Controller / Hook
    ↓
Series Repository
    ↓
Typed Mock Data
```

Future:

```text
Series UI
    ↓
Series Controller / Hook
    ↓
Series Repository
    ↓
API
```

The page must not directly depend on database structure.

---

# 53. No Backend Implementation

This document does not authorize:

* Database implementation
* API implementation
* Payment integration
* Mobile money integration
* Video storage
* Streaming backend
* Download backend
* DRM
* Real authentication
* Real entitlement verification
* Playback tracking backend

These belong to future backend specifications.

---

# 54. Business Decisions Still Open

The following remain intentionally configurable:

### Series pricing

Final model is not yet locked:

```text
PER_EPISODE
PER_SEASON
FULL_SERIES
COMBINATION
```

### Payment provider

Exact Tanzania Mobile Money providers remain pending.

### Device limit

Maximum active devices remains pending.

### Media Team approval

Whether Media Team content requires Admin approval remains pending.

The frontend must not silently make any of these decisions.

---

# 55. Component Reuse

The series experience should reuse established components where appropriate:

```text
MovieCard
SeriesCard
ContentRail
SectionHeader
Poster
Badge
Button
Modal
BottomSheet
PaymentMethodSelector
```

Series-specific components may include:

```text
SeriesHero
SeasonSelector
EpisodeCard
EpisodeList
EpisodeNavigation
SeriesProgress
```

These should live within the appropriate feature boundary.

---

# 56. Component Ownership

Recommended structure:

```text
features/
└── series/
    ├── components/
    │   ├── SeriesHero
    │   ├── SeasonSelector
    │   ├── EpisodeCard
    │   ├── EpisodeList
    │   ├── EpisodeNavigation
    │   └── SeriesProgress
    │
    ├── hooks/
    ├── services/
    └── types/
```

Shared primitives remain outside the feature.

---

# 57. URL State

The canonical series route is:

```text
/series/[slug]
```

The canonical episode route is:

```text
/series/[seriesSlug]/season/[seasonNumber]/episode/[episodeNumber]
```

If season selection is represented in the URL during implementation, it must remain compatible with canonical routing and deep linking.

Do not create multiple conflicting URLs for the same episode.

---

# 58. SEO

Public series and episode routes should support appropriate metadata.

Series:

```text
Title
Description
Open Graph image
Canonical URL
```

Episode:

```text
Series title
Episode title
Episode description
Open Graph image
Canonical URL
```

Do not expose private entitlement or customer information.

---

# 59. Shareability

Series URLs should be directly shareable.

Episode URLs should also be directly shareable.

A customer receiving:

```text
/series/example-series/season/2/episode/4
```

should be able to open the public page without authentication.

Authentication is only required for protected actions.

---

# 60. Customer Journey — Browse Series

```text
Homepage
 ↓
Series
 ↓
Series Details
 ↓
Season 1
 ↓
Episode 1
 ↓
Episode Details
```

---

# 61. Customer Journey — Watch Episode

```text
Series
 ↓
Season 2
 ↓
Episode 4
 ↓
WATCH
 ↓
Login if required
 ↓
Payment if required
 ↓
Watch
```

---

# 62. Customer Journey — Download

```text
Series
 ↓
Season 2
 ↓
Episode 4
 ↓
DOWNLOAD
 ↓
Login
 ↓
Select applicable access
 ↓
LIPA
 ↓
Success
 ↓
Download/access
```

---

# 63. Customer Journey — Continue Watching

```text
Library
 ↓
Series
 ↓
Continue Episode
 ↓
Episode
 ↓
WATCH NOW
```

---

# 64. Customer Journey — Next Episode

```text
Episode 4
 ↓
NEXT EPISODE
 ↓
Episode 5
 ↓
WATCH
```

The transition should feel continuous rather than forcing unnecessary navigation.

---

# 65. Anti-Patterns

Do NOT implement:

* A series page that looks exactly like a movie page.
* A giant list of every episode from every season.
* Season selection buried inside a menu.
* Unclear episode numbering.
* Purchase buttons without scope.
* Prices without indicating what they unlock.
* Hardcoded series pricing.
* Hardcoded access duration.
* Hardcoded payment provider.
* Frontend-only entitlement verification.
* Fake payment processing.
* Episode cards that require hover on mobile.
* Huge unoptimized episode images.
* Excessive animation.
* Generic SaaS dashboard aesthetics.
* Netflix cloning.

---

# 66. Acceptance Criteria

The series experience is accepted only when:

* Series route works.
* Episode route works.
* Series hierarchy is clear.
* Series hero is cinematic.
* Series metadata is readable.
* Trailer works when available.
* Seasons can be selected.
* Selected season is obvious.
* Episodes display correctly.
* Episode information is readable.
* Episode cards are reusable.
* Episode navigation works.
* Previous/next states are correct.
* Multiple DJ/Translator versions can be represented.
* Version selection is clear.
* Version-specific access can be represented.
* Episode/season/full-series pricing models can be represented.
* No pricing model is hardcoded.
* Watch and Download are clearly distinguished.
* LIPA is clear.
* Access duration is data-driven.
* Guest browsing works.
* Protected actions can trigger authentication.
* Purchase context can survive authentication.
* Active entitlement is represented.
* Expired entitlement is represented.
* Subscription inclusion is represented.
* Series progress can be represented.
* Continue Watching can be represented.
* Loading states exist.
* Empty states exist.
* Error states exist.
* Not-found states exist.
* Mobile experience is intentionally designed.
* Desktop experience is polished.
* Accessibility requirements are satisfied.
* Motion follows MD-05.
* Performance requirements are respected.
* SEO metadata is supported.
* Deep links work conceptually.
* No backend implementation is introduced.
* No financial authority exists in the frontend.
* No unresolved business decision is silently invented.

---

# 67. AI Coding Agent Directive

The coding agent MUST treat this document as an implementation contract.

The agent MUST NOT assume:

* Every series has the same pricing model.
* Every episode has the same price.
* Every episode has the same access duration.
* Every episode has the same DJ/Translator versions.
* Every customer owns the entire series after buying one episode.
* Subscription access means permanent ownership.
* Individual purchase disappears when subscription expires.
* A particular payment provider is final.
* A fixed device limit is final.
* Media Team publishing rules are final.

When a business rule is unresolved, the implementation must preserve configurability.

The agent must not solve business ambiguity through hardcoded UI assumptions.

---

# 68. Definition of Done

The series experience is complete when the customer can intuitively understand:

```text
What series is this?
        ↓
Which season?
        ↓
Which episode?
        ↓
Which version?
        ↓
What access do I have?
        ↓
What does it cost?
        ↓
What does the purchase unlock?
        ↓
Can I WATCH or DOWNLOAD?
```

The entire experience should feel like one connected cinematic journey.

---

# 69. Relationship With Previous Documents

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
12_MOVIE_DETAILS.md
```

MD-13 extends the movie/content architecture without replacing the established system.

---

# 70. Next Document

Next:

```text
14_AUTH_UI.md
```

This document will define the complete authentication experience:

```text
LOGIN
REGISTER
FORGOT PASSWORD
RESET PASSWORD
SESSION STATES
ROLE-AWARE UI
AUTH REDIRECTS
GUEST → CUSTOMER TRANSITION
```

It will also define how authentication fits into the purchase, subscription, library, streaming and download journeys without implementing a real authentication backend.

---

# FINAL DIRECTIVE

GIFTEDproMovies must treat series as **structured cinematic content**, not as a collection of random video files.

The customer should be able to move naturally:

```text
SERIES
  ↓
SEASON
  ↓
EPISODE
  ↓
VERSION
  ↓
ACCESS
  ↓
WATCH / DOWNLOAD
```

The experience must remain:

**Cinematic. Clear. Intelligent. Responsive. Scalable. Premium.**
