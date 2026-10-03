# GIFTEDproMovies

## Component Architecture & UI Composition

**Document ID:** MD-07
**Version:** 1.0
**Status:** Frontend Foundation — Locked
**Previous:** MD-06 — Route Map & Navigation Architecture
**Next:** MD-08 — Data Models & Frontend Domain Types

---

# 1. Purpose

This document defines how the GIFTEDproMovies frontend is broken into reusable UI components.

It establishes:

* Component hierarchy.
* Component ownership.
* Reusable components.
* Feature-specific components.
* Page composition.
* Movie and series components.
* Navigation components.
* Discovery components.
* Commerce components.
* Player components.
* Customer components.
* Admin components.
* Media Team components.
* Component state boundaries.
* Composition rules.
* Reusability rules.
* Anti-patterns.

The goal is to make the application feel like **one coherent product**, not a collection of independently generated pages.

---

# 2. Core Component Philosophy

The frontend must follow:

> **Compose pages from small, intentional components instead of building pages as giant components.**

A page should describe **what the user sees**.

A component should describe **one meaningful UI responsibility**.

For example:

```text
HomePage
 ├── Header
 ├── Hero
 ├── TrendingRail
 │    └── MovieCard
 ├── FeaturedRail
 │    └── MovieCard
 ├── NewReleasesRail
 │    └── MovieCard
 ├── CategoryRail
 ├── CountryRail
 └── DJCollection
```

The page should not contain hundreds of lines of card, button, modal, filtering, and animation implementation.

---

# 3. Component Layers

Components are divided into five levels:

```text id="q6h1m7"
LEVEL 1 — Primitives
        ↓
LEVEL 2 — Shared UI
        ↓
LEVEL 3 — Product Components
        ↓
LEVEL 4 — Feature Components
        ↓
LEVEL 5 — Page Composition
```

---

# 4. Level 1 — UI Primitives

These are the smallest reusable building blocks.

Examples:

```text id="hsg4os"
Button
IconButton
Input
Textarea
Select
Checkbox
Switch
Badge
Avatar
Separator
Skeleton
Tooltip
Spinner
```

These components should have no knowledge of movies, payments, users, or Admin.

Bad:

```text id="b8b2ds"
<MovieButton />
```

Good:

```text id="a8od0m"
<Button />
```

The product meaning belongs to a higher-level component.

---

# 5. Level 2 — Shared UI Components

These combine primitives into commonly reused interfaces.

Examples:

```text id="1w9qf4"
SearchInput
FilterButton
Pagination
EmptyState
ErrorState
LoadingState
ConfirmDialog
BottomSheet
Modal
DropdownMenu
Tabs
DataTable
FormField
PriceDisplay
StatusBadge
```

These components may know general application concepts but should remain reusable.

---

# 6. Level 3 — Product Components

These represent recognizable GIFTEDproMovies UI patterns.

Examples:

```text id="0r9dcs"
MovieCard
SeriesCard
ContentRail
HeroBanner
MediaBadge
DJBadge
CountryBadge
WatchButton
DownloadButton
LipaButton
SubscriptionCard
```

These components are product-aware.

---

# 7. Level 4 — Feature Components

Feature components belong to a specific domain.

Examples:

```text id="3jpxzz"
MovieVersionSelector
PurchaseOptions
CheckoutSummary
PlayerControls
LibrarySection
SearchResults
AdminMovieTable
MediaUploadForm
SeriesEpisodeList
```

These components can contain domain-specific logic.

---

# 8. Level 5 — Page Composition

Pages combine feature and product components.

Example:

```text id="1v4yq8"
MovieDetailPage
 ├── MovieHero
 ├── MovieMetadata
 ├── MovieVersionSelector
 ├── PurchaseOptions
 ├── Description
 ├── RelatedMovies
 └── Footer
```

Pages should primarily compose components.

---

# 9. Recommended Folder Structure

The component architecture should align with MD-05.

Recommended structure:

```text id="0ekqz4"
src/
│
├── app/
│
├── components/
│   │
│   ├── ui/
│   │   ├── button/
│   │   ├── input/
│   │   ├── dialog/
│   │   ├── sheet/
│   │   ├── tabs/
│   │   └── ...
│   │
│   ├── navigation/
│   │   ├── Header
│   │   ├── MobileNavigation
│   │   ├── UserMenu
│   │   └── Breadcrumbs
│   │
│   ├── cinematic/
│   │   ├── Hero
│   │   ├── MovieCard
│   │   ├── SeriesCard
│   │   ├── ContentRail
│   │   └── Poster
│   │
│   └── media/
│       ├── MediaBadge
│       ├── Rating
│       ├── Duration
│       └── Metadata
│
├── features/
│   │
│   ├── discovery/
│   ├── movies/
│   ├── series/
│   ├── player/
│   ├── commerce/
│   ├── library/
│   ├── auth/
│   ├── admin/
│   └── media-team/
│
└── ...
```

Exact file names may be refined during implementation, but the ownership model must remain.

---

# 10. Component Ownership Rule

Every component must have one clear owner.

Example:

```text id="x1d9s7"
MovieCard
→ components/cinematic

MovieVersionSelector
→ features/movies

CheckoutSummary
→ features/commerce

PlayerControls
→ features/player

AdminMovieTable
→ features/admin
```

Do not create the same component independently inside multiple features.

---

# 11. MovieCard — Core Product Component

`MovieCard` is one of the most important reusable components in the platform.

It will appear in:

* Trending.
* Featured.
* New Releases.
* Popular.
* Category pages.
* Country pages.
* DJ pages.
* Search results.
* Related content.
* Customer library.

Therefore:

**MovieCard MUST be reusable and configurable.**

---

# 12. MovieCard Responsibilities

MovieCard should handle:

```text id="r2f8u0"
Poster
Title
Year
Duration
Category metadata
Country
DJ/version indicator
Trending/featured badge where appropriate
Price indicator where appropriate
Hover interaction
Watch CTA where appropriate
```

It should NOT handle:

```text id="z3qv3v"
Payment processing
Authentication
API calls
Database access
Checkout
Global navigation
```

---

# 13. MovieCard Variants

The component may support intentional visual variants.

Example:

```text id="r8k2b4"
MovieCard
 ├── default
 ├── compact
 ├── search
 ├── library
 └── featured
```

Variants must represent genuine product contexts.

Do not create dozens of variants simply to avoid writing CSS.

---

# 14. MovieCard Interaction

Desktop:

```text id="z2pl2v"
Idle
 ↓
Hover
 ↓
Poster zoom
 ↓
Metadata reveal
 ↓
Action reveal
```

Motion follows MD-04.

Mobile:

```text id="5o9l7y"
Tap
 ↓
Navigate to detail
```

The mobile experience must not depend on hover.

---

# 15. SeriesCard

`SeriesCard` is similar to `MovieCard` but represents series.

It may display:

```text id="smq2l8"
Poster
Title
Number of seasons
Latest episode
Country
Category
DJ/version information where applicable
```

It must not pretend that a series is a movie.

---

# 16. ContentRail

`ContentRail` is the standard horizontal content collection.

Examples:

```text id="a5f43x"
Trending Movies
Featured Movies
New Releases
Popular Movies
```

Structure:

```text id="k3i9pr"
SectionHeader
      ↓
ContentRail
      ↓
MovieCard × N
```

---

# 17. ContentRail Responsibilities

ContentRail handles:

* Horizontal layout.
* Spacing.
* Scroll behavior.
* Navigation controls.
* Responsive behavior.
* Motion integration.
* Overflow handling.

It does NOT decide:

* Which movies are trending.
* Which content is popular.
* Pricing.
* Business rules.

The parent feature provides the content.

---

# 18. SectionHeader

A reusable `SectionHeader` should provide:

```text id="k1cv2v"
Title
Optional description
Optional action
```

Example:

```text id="7p7k0m"
Trending Movies
See all →
```

The component should support different contexts without becoming a complicated universal component.

---

# 19. Hero Component

The Hero is a cinematic discovery component.

It may contain:

```text id="u1g3dz"
Background image
Poster
Title
Metadata
Description
Watch CTA
LIPA CTA
Additional action
```

The Hero must remain visually focused.

Do not overload it with:

* Huge navigation menus.
* Multiple unrelated cards.
* Excessive badges.
* Long descriptions.
* Ten CTAs.

---

# 20. Hero Variants

Possible variants:

```text id="q7v1kw"
HomepageHero
MovieHero
SeriesHero
```

They may share lower-level cinematic primitives but should not be forced into one giant `UniversalHero` component.

---

# 21. Poster Component

A reusable `Poster` component should standardize:

* Aspect ratio.
* Image rendering.
* Loading state.
* Fallback state.
* Object positioning.
* Responsive behavior.

Default movie poster ratio:

```text id="m2s0q9"
2:3
```

The poster component should not contain movie-specific business logic.

---

# 22. Media Metadata Components

Reusable components may include:

```text id="y8x1x5"
Duration
ReleaseYear
CountryLabel
CategoryLabel
DJLabel
ContentTypeBadge
```

These should be small and composable.

Example:

```text id="r6b7h3"
2026 • Nigeria • 2h 10m
```

Do not duplicate formatting logic across every page.

---

# 23. Watch Button

`WatchButton` is a product-level CTA.

Responsibilities:

* Consistent visual appearance.
* Icon.
* Loading state.
* Disabled state.
* Motion.
* Accessibility.

It does NOT determine whether the user owns the content.

Access/business logic belongs above it.

---

# 24. Download Button

`DownloadButton` follows the same principle.

It represents the action.

The component itself must not decide:

```text id="0qk7fn"
whether the user paid
whether download access expired
whether subscription is active
whether device limit was reached
```

Those conditions come from the feature/domain layer.

---

# 25. LIPA Button

`LipaButton` is a branded commerce CTA.

It must visually communicate:

```text id="5sh8o9"
PAY / LIPA
```

The component must support:

* Loading.
* Disabled.
* Processing.
* Success.
* Error.

It must not implement payment-provider integration in the frontend component.

---

# 26. MovieVersionSelector

This is a feature-level component.

Responsibilities:

```text id="u9t7mz"
Display available versions
Display DJ/Translator
Select version
Update selected state
Display relevant pricing
Clearly indicate current selection
```

Example:

```text id="m1qz4k"
DJ Mack
● Selected

DJ John
○

Original
○
```

The selected version must be visually unambiguous.

---

# 27. PurchaseOptions

The purchase UI should clearly separate:

```text id="0x2wjy"
WATCH / STREAM
        vs
DOWNLOAD
```

Example:

```text id="d5k8d1"
WATCH
TSh X,XXX
Access: X days

DOWNLOAD
TSh X,XXX
Access: X days
```

The exact values come from data.

Never hardcode prices into this component.

---

# 28. Commerce Components

Commerce feature components may include:

```text id="y1y8ha"
PurchaseOptions
CheckoutSummary
PaymentMethodSelector
PaymentStatus
SubscriptionCard
SubscriptionComparison
OrderSummary
```

They must remain separated from public discovery components.

---

# 29. CheckoutSummary

Should show:

```text id="8d9q7n"
Content
Version
Purchase type
Price
Access duration
Total
```

It must provide clarity before payment.

---

# 30. PaymentMethodSelector

The frontend should support a provider-selection experience appropriate for Tanzania Mobile Money.

Example conceptual UI:

```text id="3f0w3q"
M-Pesa
Airtel Money
Mixx by Yas
HaloPesa
...
```

The final provider list remains a business decision.

Until confirmed, providers must be represented as configurable mock data.

---

# 31. Player Architecture

The player experience should be treated as its own feature.

Structure:

```text id="q5w8u2"
PlayerPage (/watch/[slug]?dj=...)
 ├── VideoSurface (HTML5 Video Element)
 ├── AccessGatekeeperOverlay (Locks unentitled streams; triggers LipaModal)
 ├── PlayerOverlay (Fade-out HUD controls on idle)
 ├── PlayerControls (Play/Pause, 10s Rewind/Forward, Fullscreen)
 ├── ProgressBar (Seekable progress & current/duration time)
 ├── VolumeControl (Mute toggle & slider)
 ├── QualitySelector (Auto, 1080p, 720p, 480p)
 ├── DjVersionSelector (Hard-muxed DJ edition switcher; reloads edition video)
 └── PlayerInfo (Title, active DJ badge, back button)
```

---

# 32. Player Responsibilities

Player components handle presentation and interaction.

They do NOT independently determine entitlement.

Conceptually:

```text id="z4j7q2"
Entitlement State
       ↓
Player Feature
       ↓
Video Player UI
```

If the customer does not have access, the UI should show an appropriate access state instead of pretending playback is available.

---

# 33. Library Components

Customer library may contain:

```text id="q5i7z6"
LibraryHeader
LibraryTabs
ContinueWatching
PurchasedContent
ActiveAccess
RecentlyViewed
DownloadList
```

Each section should reuse the same product cards where possible.

---

# 34. Search Components

Search feature may contain:

```text id="7z9f3h"
GlobalSearch
SearchInput
SearchSuggestions
SearchFilters
SearchResults
SearchResultTabs
SearchEmptyState
```

Search should support:

```text id="4m7u9r"
Movies
Series
DJs / Translators
Categories
Countries
```

---

# 35. Filter Components

Reusable filter components:

```text id="2g7z8m"
FilterBar
FilterDropdown
CategoryFilter
CountryFilter
DJFilter
ContentTypeFilter
SortSelector
```

Filter components should not fetch data directly.

They receive available options and return selected values.

---

# 36. Navigation Components

Navigation components:

```text id="r5z7u4"
Header
DesktopNavigation
MobileNavigation
SearchTrigger
UserMenu
AdminNavigation
MediaTeamNavigation
Breadcrumbs
```

Public navigation and staff navigation must remain conceptually separate.

---

# 37. Header

The public header should support:

```text id="4n8w0k"
Logo
Primary navigation
Search
Account / Login
```

Authenticated users may receive:

```text id="9n2y4q"
Library
Account
```

Do not turn the header into a dashboard.

---

# 38. MobileNavigation

Mobile navigation must be intentionally designed for touch.

Do not simply shrink desktop navigation.

It may use:

```text id="v1c3m8"
Bottom navigation
Drawer
Sheet
```

depending on the final UX.

The chosen pattern must remain consistent throughout the customer experience.

---

# 39. Admin Components

Admin UI requires a different information architecture but must retain the same design system.

Examples:

```text id="7q1x8d"
AdminSidebar
AdminHeader
DashboardMetric
AnalyticsCard
AdminDataTable
AdminFilters
AdminForm
MediaUpload
ContentEditor
PricingEditor
StatusControl
```

---

# 40. Admin Dashboard Metric

Examples:

```text id="2f9y6a"
Movies
Series
Users
Sales
Revenue
Views
Downloads
Subscriptions
```

The component should be generic enough to display different metrics without duplicating implementation.

---

# 41. Admin DataTable

Reusable table component should support:

* Columns.
* Sorting where required.
* Filtering.
* Pagination.
* Row actions.
* Loading.
* Empty state.
* Error state.
* Responsive behavior.

Do not build a separate table implementation for:

```text id="8b7x4f"
Movies
Users
Payments
Sales
Categories
```

unless their interaction requirements genuinely differ.

---

# 42. Admin Content Forms

Movie and series forms should use reusable field patterns.

Possible movie fields:

```text id="5y8k0q"
Title
Description
Poster
Country
Category
Release Year
Duration
DJ/Translator
Version
Streaming Price
Download Price
Access Duration
Featured
Trending Override
```

The exact final form schema belongs to the data-model documentation.

---

# 43. Media Upload Component

A reusable media upload experience should support:

```text id="w7h2k1"
Drag & Drop
File Selection
Upload Progress
Validation
Preview
Remove
Retry
Success
Error
```

The frontend should not assume a backend upload implementation yet.

For now:

```text id="7q9n2x"
UI
 ↓
Mock upload service
 ↓
Future upload API
```

---

# 44. Media Team Components

Media Team uses content-management components shared with Admin where appropriate.

Example:

```text id="8g2f5a"
MovieEditor
SeriesEditor
EpisodeEditor
MediaUpload
ContentPreview
```

However, the interface must not expose Admin-only financial controls.

---

# 45. Shared vs Feature-Specific Rule

Before creating a component, ask:

### Is it visually and behaviorally reused?

If yes:

```text id="v8z3c4"
Shared/Product component
```

If it only belongs to one feature:

```text id="z7k2m6"
Feature component
```

Do not move everything into `/components` just because it is technically reusable once.

---

# 46. Reuse Threshold

A component should generally become shared when:

* It is used in multiple meaningful places.
* Its design must remain consistent.
* It represents a recognizable product pattern.
* Reusing it reduces duplication without making the API confusing.

Do not abstract code merely because two components happen to contain similar JSX once.

---

# 47. Avoid Mega-Components

The following is prohibited:

```text id="3b7w1z"
MoviePage.tsx
    2,000+ lines
    ├── Hero
    ├── Cards
    ├── Payment
    ├── Player
    ├── Search
    ├── Modal
    ├── Reviews
    └── Admin logic
```

Instead:

```text id="g9y2q6"
MoviePage
 ├── MovieHero
 ├── MovieMetadata
 ├── MovieVersionSelector
 ├── PurchaseOptions
 ├── RelatedContent
 └── ...
```

---

# 48. Avoid Micro-Component Explosion

The opposite extreme is also prohibited.

Do not create components for meaningless fragments such as:

```text id="v7q0j2"
MovieTitleWrapper
MovieTitleTextContainer
MovieTitleInner
MovieTitleSpan
```

unless there is a genuine reuse or behavioral reason.

Componentization must improve architecture, not create noise.

---

# 49. Component Props

Props should describe meaningful configuration.

Good:

```text id="0y5h7u"
<MovieCard
  movie={movie}
  variant="compact"
/>
```

Bad:

```text id="v1m8s4"
<MovieCard
  showTitle={true}
  showImage={true}
  showBadge={true}
  showPrice={true}
  showCountry={false}
  showDJ={true}
  compact={true}
  dark={true}
  large={false}
  ...
/>
```

When props become excessive, reconsider whether multiple purposeful components or variants are required.

---

# 50. Component State Ownership

State must live as close as practical to the component that owns the interaction.

Example:

```text id="0z8f4q"
MovieVersionSelector
→ selectedVersion
```

Global state should not be used simply because a local state exists.

Use shared/global state only when multiple distant parts of the application genuinely require the same state.

---

# 51. Controlled vs Uncontrolled Components

Reusable form components should support controlled usage when necessary.

Example:

```text id="g4x7y1"
<SearchInput value={query} onChange={setQuery} />
```

Components must not secretly create independent copies of important application state.

---

# 52. Business Logic Separation

UI components must not contain complex business rules.

Bad:

```text id="w2q8m1"
MovieCard
 ├── checks payment
 ├── calculates subscription
 ├── validates entitlement
 ├── calls payment API
 └── renders UI
```

Good:

```text id="c8y2k5"
Feature / Service
       ↓
Prepared View State
       ↓
MovieCard
       ↓
UI
```

---

# 53. Data Access Rule

Components should not directly access databases or backend internals.

Even when the backend is introduced later:

```text id="m8s1k2"
Component
 ↓
Feature Hook / Service
 ↓
Repository / API Boundary
 ↓
Backend
```

This preserves the frontend architecture.

---

# 54. Loading State

Important components must support loading states.

Examples:

```text id="w9h4e2"
MovieCardSkeleton
HeroSkeleton
SearchSkeleton
TableSkeleton
PlayerLoading
CheckoutLoading
```

Loading states should use the design system.

---

# 55. Empty State

Empty states must be intentional.

Examples:

```text id="n4p8z0"
No search results
No purchased movies
No downloads
No active subscription
No movies in category
No uploaded content
```

Do not leave blank spaces.

---

# 56. Error State

Reusable error components should exist where useful.

Examples:

```text id="c7m3z1"
ContentError
NetworkError
PaymentError
UploadError
PlayerError
```

Errors must provide recovery actions where possible.

---

# 57. Responsive Components

Components must be designed mobile-first.

A component should define how it behaves at:

```text id="g3f8v2"
Mobile
Tablet
Desktop
Large Desktop
```

Do not rely on desktop CSS and hope it becomes responsive automatically.

---

# 58. Accessibility

Reusable components must support:

* Keyboard navigation.
* Visible focus.
* Accessible labels.
* Correct button/link semantics.
* Sufficient contrast.
* Screen-reader-friendly state.
* Reduced-motion behavior.

Clickable `div` elements must not replace real buttons or links when semantic controls are appropriate.

---

# 59. Animation Ownership

Animation belongs to the component responsible for the interaction.

Examples:

```text id="7v0k2m"
MovieCard
→ card hover animation

ContentRail
→ rail interaction

BottomSheet
→ sheet entrance/exit

MovieVersionSelector
→ selection transition

PlayerControls
→ controls visibility
```

Do not create a global animation system that blindly animates every component.

MD-04 remains the source of truth for motion behavior.

---

# 60. Component Variants and Design Tokens

Variants must use the design system from MD-03.

Do not introduce random:

```text id="8m0r2c"
colors
border radii
shadows
spacing
font sizes
```

inside individual components.

If a new visual token is genuinely required, update the design system first.

---

# 61. Product Identity in Components

Components should communicate GIFTEDproMovies through:

* Crimson action language.
* Gold premium accents.
* Near-black cinematic surfaces.
* Strong imagery.
* Controlled typography.
* Intentional motion.

Do not turn every component crimson.

Brand identity comes from the complete system.

---

# 62. Component Composition Example

Homepage:

```text id="5y4n7d"
<HomePage>

  <Header />

  <Hero />

  <Section>
    <SectionHeader />
    <ContentRail>
      <MovieCard />
      <MovieCard />
      <MovieCard />
    </ContentRail>
  </Section>

  <Section>
    <SectionHeader />
    <ContentRail>
      <MovieCard />
      <MovieCard />
      <MovieCard />
    </ContentRail>
  </Section>

  <CategoryCollection />

  <CountryCollection />

  <DJCollection />

  <Footer />

</HomePage>
```

The page remains readable because responsibilities are delegated.

---

# 63. Movie Detail Composition

```text id="f4r1a8"
<MovieDetailPage>

  <MovieHero />

  <MovieMetadata />

  <MovieVersionSelector />

  <PurchaseOptions />

  <Description />

  <RelatedContent />

</MovieDetailPage>
```

The actual page may evolve, but the separation of responsibilities remains.

---

# 64. Checkout Composition

```text id="k2d8q4"
<CheckoutPage>

  <CheckoutHeader />

  <CheckoutSummary />

  <PaymentMethodSelector />

  <OrderTotal />

  <LipaButton />

</CheckoutPage>
```

Payment-provider implementation is not part of this document.

---

# 65. Admin Composition

```text id="r5x8p1"
<AdminLayout>

  <AdminSidebar />

  <AdminHeader />

  <AdminPage>

    <PageHeader />

    <AdminFilters />

    <AdminDataTable />

  </AdminPage>

</AdminLayout>
```

Individual admin pages compose specialized content into this structure.

---

# 66. Layout Components

The application should use layout-level components for repeated structure.

Examples:

```text id="w3k7q9"
PublicLayout
CustomerLayout
AdminLayout
MediaTeamLayout
```

Layouts provide:

* Navigation.
* Shared structure.
* Consistent spacing.
* Access boundary.
* Persistent UI where appropriate.

They should not contain feature-specific business logic.

---

# 67. Footer

A reusable public `Footer` may contain:

```text id="p8z4s2"
Brand
Navigation
Categories
Support
Legal
Social links
```

The footer must remain visually secondary to the content.

Do not make it unnecessarily large.

---

# 68. Component Naming

Use clear names.

Good:

```text id="6q4v1p"
MovieCard
MovieRail
MovieHero
MovieVersionSelector
PaymentMethodSelector
AdminMovieTable
```

Avoid vague names:

```text id="b1q7x5"
Box
Thing
SectionThing
ContentStuff
Card2
NewComponent
```

---

# 69. File Naming

Use consistent naming throughout the project.

Recommended:

```text id="v9k1r7"
movie-card.tsx
movie-hero.tsx
movie-version-selector.tsx
content-rail.tsx
payment-method-selector.tsx
```

or the project's chosen convention consistently.

Do not mix multiple naming conventions randomly.

---

# 70. Import Discipline

Prefer imports from stable ownership boundaries.

Avoid deeply reaching into unrelated feature internals.

Bad:

```text id="e7y1u3"
features/admin/internal/private/component
```

from public discovery code.

Good:

```text id="z4p8w2"
components/cinematic/MovieCard
```

when the component is intentionally shared.

---

# 71. Feature Isolation

Features should not become mutually dependent without a clear reason.

Avoid:

```text id="u2r7m5"
admin → player → commerce → search → admin
```

This creates circular architecture.

Prefer:

```text id="n6x2q8"
Shared UI
    ↑
Features
    ↑
Pages
```

with explicit service/data boundaries.

---

# 72. Shared Component Dependency Rule

Shared components must remain lower-level than feature components.

Therefore:

```text id="j9c4x0"
MovieCard
```

must not import:

```text id="q3v8n1"
AdminPaymentService
```

or:

```text id="a7k2w5"
CheckoutPage
```

Shared components should remain reusable.

---

# 73. Component Testing Direction

High-value reusable components should eventually have tests.

Priority:

```text id="z7r1c4"
MovieCard
Search
MovieVersionSelector
PurchaseOptions
Checkout
PlayerControls
Forms
Admin tables
```

Testing implementation will be defined later.

---

# 74. Definition of Done

MD-07 is considered implemented when:

* Component ownership is clear.
* Shared UI primitives exist.
* Product components are reusable.
* Feature components are isolated.
* Pages primarily compose components.
* MovieCard is reusable.
* ContentRail is reusable.
* Navigation is separated from content.
* Commerce is separated from discovery.
* Player is isolated as a feature.
* Admin and Media Team components are separated appropriately.
* Components support loading/empty/error states where necessary.
* Components are responsive.
* Components respect accessibility requirements.
* Components follow MD-03 design tokens.
* Components follow MD-04 motion rules.
* No mega-components exist.
* No unnecessary micro-component explosion exists.
* Business logic is not embedded into presentation components.
* Backend logic is not implemented inside components.

---

# 75. AI Coding Agent Directive

When implementing components for GIFTEDproMovies:

1. Follow MD-01 through MD-06.
2. Follow this MD-07.
3. Before creating a component, identify its ownership level.
4. Reuse existing components before creating new ones.
5. Do not duplicate MovieCard, buttons, rails, forms, or navigation.
6. Do not create mega-components.
7. Do not create meaningless micro-components.
8. Do not put business logic inside visual primitives.
9. Do not allow shared components to depend on feature-specific internals.
10. Do not invent new design tokens.
11. Do not invent new routes.
12. Do not invent business rules.
13. Keep Admin and Media Team boundaries intact.
14. Keep payment logic outside presentation components.
15. Keep entitlement logic outside simple UI components.
16. Follow MD-04 for all animation.
17. Follow MD-03 for all visual styling.
18. If an architectural conflict appears, STOP rather than silently creating a workaround.

---

# 76. Final Component Principle

The quality of GIFTEDproMovies should be visible in the architecture.

A strong implementation should make this possible:

```text id="c3k7x1"
One MovieCard
        ↓
Trending
Featured
New Releases
Popular
Categories
Countries
DJs
Search
Library
Related Content
```

And:

```text id="p8m2v4"
One Design System
        ↓
Public Experience
Customer Experience
Admin Experience
Media Team Experience
```

And:

```text id="q7n1z5"
One Product Architecture
        ↓
Consistent UI
Consistent Interaction
Consistent Motion
Consistent Responsive Behavior
```

The objective is not to have the **fewest components**.

The objective is to have the **right components with clear responsibilities**.

---

# 77. Document Status

**MD-07 is the component architecture source of truth.**

It defines how the interface is composed but does not yet define the complete domain/data model.

The next document will define the frontend domain entities and TypeScript data structures that power these components.

**Next:**

```text id="m5x8q2"
08_DATA_MODELS.md
```

That document will define the structure of:

Movie, Movie Version, Series, Season, Episode, Category, Country, DJ/Translator, User, Purchase, Entitlement, Subscription, Payment, and the supporting frontend states.
