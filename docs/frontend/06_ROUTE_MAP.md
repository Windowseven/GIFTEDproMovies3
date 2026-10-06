# GIFTEDproMovies

## Route Map & Navigation Architecture

**Document ID:** MD-06
**Version:** 1.0
**Status:** Frontend Foundation — Locked
**Previous:** MD-05 — Frontend Architecture & Application Structure
**Next:** MD-07 — Component Architecture

---

# 1. Purpose

This document defines the complete frontend route and navigation structure for **GIFTEDproMovies**.

It establishes:

* Which pages exist.
* Their URL structure.
* Who can access each route.
* How users move between pages.
* Which information belongs in URL parameters.
* Which interactions should use routes versus modals/sheets.
* Public discovery routes.
* Customer routes.
* Admin routes.
* Media Team routes.
* Error and access-denied routes.

The implementation must follow this document.

An AI coding agent MUST NOT invent new primary routes without updating the project documentation first.

---

# 2. Core Routing Principle

GIFTEDproMovies is a **platform-first product**.

The homepage is not a traditional marketing landing page.

The primary experience is:

```text
GIFTEDproMovies
        ↓
    Discover
        ↓
 Search / Filter
        ↓
 Movie / Series Details
        ↓
 Select Version / DJ
        ↓
 Watch / Download / LIPA
        ↓
 Authentication when required
        ↓
 Payment / Access
        ↓
 Library / Player
```

The route structure must support this journey naturally.

---

# 3. Route Access Levels

Every route belongs to one of these access levels.

| Access Level  | Meaning                       |
| ------------- | ----------------------------- |
| PUBLIC        | Guest can access              |
| CUSTOMER      | Authenticated customer        |
| ADMIN         | Admin only                    |
| MEDIA_TEAM    | Media Team only               |
| STAFF         | Admin + Media Team            |
| AUTHENTICATED | Any authenticated account     |
| SYSTEM        | Internal/non-navigation route |

Access restrictions must never be communicated only through visual hiding.

The application must enforce route-level access behavior.

---

# 4. Primary Route Groups

The application is divided into four major route groups:

```text
PUBLIC
│
├── /
├── /search
├── /movies
├── /series
├── /categories
├── /countries
├── /djs
└── /...

CUSTOMER
│
├── /library (tabs: continue, passes, downloads, watchlist)
├── /watch/[slug] (?dj=...)
├── /subscriptions
└── [LipaModal] (In-context mobile checkout modal)

STAFF
│
├── /admin (16 governance & reporting sub-routes)
└── /media-team (12 intake, QC & transcoding sub-routes)

SYSTEM
│
├── /login
├── /register
├── /forgot-password
├── /reset-password
└── /unauthorized
```

---

# 5. Public Routes

## 5.1 Homepage

```text
/
```

**Access:** PUBLIC

This is the main discovery experience.

Homepage order:

```text
Hero / Featured Discovery
        ↓
Trending Movies
        ↓
Featured Movies
        ↓
New Releases
        ↓
Popular Movies
        ↓
Movies by Category
        ↓
Movies by Country
        ↓
DJs / Translators Collection
```

The exact visual composition belongs to the design and visual-language documents.

---

# 6. Movie Routes

## 6.1 Movie Collection

```text
/movies
```

**Access:** PUBLIC

Purpose:

* Browse all movies.
* Search within movies.
* Filter movies.
* Sort movies.
* Discover available content.

Supported filters may include:

```text
category
country
dj
year
```

Example:

```text
/movies?category=action
```

or:

```text
/movies?country=nigeria&dj=dj-mack
```

Filters should normally remain in query parameters rather than generating unnecessary routes.

---

# 7. Movie Detail Route

```text
/movies/[slug]
```

Example:

```text
/movies/mission-impossible-final-reckoning
```

**Access:** PUBLIC

Purpose:

Display the complete movie information:

* Poster
* Title
* Description
* Category
* Country
* Release year
* Duration
* DJ/Translator
* Available versions
* Streaming price
* Download price
* Access duration
* Watch CTA
* Download CTA
* LIPA CTA
* Related movies

The movie detail page must be accessible without authentication.

Authentication should occur when the user attempts an action that requires an account.

---

# 8. Movie Version / DJ Selection

A movie can contain multiple versions.

Example:

```text
Movie
 ├── DJ Mack Version
 ├── DJ John Version
 └── Original Version
```

The preferred public URL remains:

```text
/movies/[slug]
```

Version selection should normally happen inside the movie detail experience.

Do NOT create unnecessary primary routes such as:

```text
/movies/[movie]/dj/[dj]
```

unless future requirements prove that a dedicated URL is necessary.

The selected version can be represented through UI state or a query parameter where useful.

Example:

```text
/movies/avengers-endgame?version=dj-mack
```

---

# 9. Series Routes

## 9.1 Series Collection

```text
/series
```

**Access:** PUBLIC

Purpose:

* Browse series.
* Search series.
* Filter series.
* Discover categories and countries.

---

## 9.2 Series Detail

```text
/series/[slug]
```

Example:

```text
/series/the-chosen
```

**Access:** PUBLIC

The page presents:

```text
Series
 ↓
Description
 ↓
Available Seasons
 ↓
Season 1
   ├── Episode 1
   ├── Episode 2
   └── Episode 3
 ↓
Season 2
   ├── Episode 1
   └── Episode 2
```

Pricing and access rules must be presented according to the pricing model configured by Admin.

---

# 10. Season / Episode Navigation

Primary series discovery should remain under:

```text
/series/[slug]
```

Episode navigation can use nested routes where a dedicated player/detail page is required.

Recommended structure:

```text
/series/[seriesSlug]/season/[seasonNumber]/episode/[episodeNumber]
```

Example:

```text
/series/the-chosen/season/2/episode/4
```

This route should be used primarily for episode playback/detail experiences.

The series page remains the primary browsing experience.

---

# 11. Category Routes

```text
/categories
```

**Access:** PUBLIC

Purpose:

Display available movie/series categories.

Examples:

```text
Action
Cartoon
Christian
Horror
Superhero
Drama
Comedy
```

---

## 11.1 Category Detail

```text
/categories/[slug]
```

Example:

```text
/categories/christian
```

Purpose:

Show content belonging to a specific category.

The page may contain:

```text
Category Hero
        ↓
Featured
        ↓
Trending
        ↓
Movies
        ↓
Series
```

Categories should not be hardcoded into navigation.

They are content entities controlled by the system.

---

# 12. Country Routes

```text
/countries
```

**Access:** PUBLIC

Purpose:

Allow users to discover content by country.

Examples:

```text
Nigeria
India
USA
Tanzania
South Africa
```

---

## 12.1 Country Detail

```text
/countries/[slug]
```

Example:

```text
/countries/nigeria
```

Purpose:

Display movies and series associated with that country.

---

# 13. DJ / Translator Routes

```text
/djs
```

**Access:** PUBLIC

Purpose:

Display available DJs/translators.

Example:

```text
DJ Mack
DJ John
DJ XYZ
```

---

## 13.1 DJ Detail

```text
/djs/[slug]
```

Example:

```text
/djs/dj-mack
```

Purpose:

Display content associated with a specific DJ/translator.

Possible structure:

```text
DJ Profile
      ↓
Featured Movies
      ↓
Latest Movies
      ↓
Popular Movies
```

This route supports the platform's discovery model.

---

# 14. Search Route

```text
/search
```

**Access:** PUBLIC

The search page is a global discovery interface.

It should support searches across:

```text
Movies
Series
DJs / Translators
Categories
Countries
```

Example:

```text
/search?q=avengers
```

Combined filtering may use query parameters:

```text
/search?q=christian&type=movie&country=nigeria&dj=dj-mack
```

---

# 15. Search URL Rules

Search state belongs in the URL where practical.

Use query parameters for:

* Search term
* Filter
* Sort
* Page
* Content type

Example:

```text
/search?q=avengers&type=movie&country=usa
```

Benefits:

* Shareable searches.
* Browser back/forward works correctly.
* Refresh preserves state.
* Search results can be deep-linked.
* Better discoverability.

Do not encode temporary UI state into URLs unless it has meaningful navigation value.

---

# 16. Authentication Routes

Authentication routes:

```text
/login
/register
/forgot-password
/reset-password
```

**Access:** PUBLIC

Authentication is intentionally not required for basic browsing.

The user should be able to:

```text
Browse
 ↓
Search
 ↓
Open movie
 ↓
Inspect price
 ↓
Choose Watch / Download
 ↓
Login/Register when required
```

This reduces unnecessary friction.

---

# 17. Authentication Return Flow

When an unauthenticated customer attempts a protected action:

```text
Movie
 ↓
Watch / Download / LIPA
 ↓
Authentication required
 ↓
Login/Register
 ↓
Return to intended action
```

Example:

```text
/movies/movie-name
```

User clicks:

```text
WATCH
```

Application sends the user to:

```text
/login
```

while preserving the intended destination/action.

After successful authentication, the user should return to the appropriate movie/purchase/player flow.

Do not simply redirect every login to `/`.

---

# 18. Customer Account Routes

## Account

```text
/account
```

**Access:** CUSTOMER

Purpose:

* Profile
* Account settings
* Password/security settings
* Device/session management where implemented.

---

# 19. Customer Library

```text
/library
```

**Access:** CUSTOMER

This is the customer's personal content area.

Possible sections:

```text
Purchased
Active Access
Continue Watching
Recently Viewed
Subscriptions
Downloads
```

The exact visual grouping belongs to the customer-experience documentation.

---

# 20. Customer Purchases

```text
/purchases
```

**Access:** CUSTOMER

Purpose:

Display customer purchase-related content/history where required by the final product design.

This page must never expose financial information belonging to other users.

---

# 21. Customer Downloads

```text
/downloads
```

**Access:** CUSTOMER

Purpose:

Display content the customer is entitled to download or has downloaded.

Download access must respect:

* Account ownership
* Purchase entitlement
* Access duration
* Device restrictions
* Subscription rules
* Content availability

The frontend must never assume that a movie is downloadable simply because a movie exists.

---

# 22. Streaming / Watch Route

Cinema Theater Player:

```text
/watch/[slug]
```

**Query Parameters:**
* `?dj=[DJ_NAME]` — Selects the active hard-muxed DJ video edition (e.g. `?dj=DJ+Afro+Amigo` or `?dj=DJ+Murphy`).
* `?resolution=[1080p|720p|480p|auto]` — Resolution switcher.

**Access:** CUSTOMER / ENTITLED
* Verified via `useCustomer()` active entitlements or VIP pass status.
* If unentitled, renders the cinematic access lock gate with direct 1-click LIPA pass unlock (`LipaModal`).
* Includes custom HTML5 controls: play/pause, 10s skip backward/forward, volume/mute, resolution selector, fullscreen, and in-player DJ version switcher.

---

# 23. Purchase Flow

The preferred purchase flow is action-driven rather than creating many unnecessary pages.

Conceptually:

```text
Movie Detail
      ↓
Choose Version
      ↓
Choose:
  WATCH
  DOWNLOAD
      ↓
LIPA
      ↓
Payment
      ↓
Success
      ↓
Access
```

Possible dedicated routes:

```text
/checkout
/checkout/success
/checkout/failed
```

These routes are reserved for transaction flows that require dedicated navigation.

Do not create separate checkout routes for every movie type unless necessary.

---

# 24. Checkout Route

```text
/checkout
```

**Access:** CUSTOMER

Purpose:

Display the selected purchase:

```text
Movie / Episode
Version
Access type
Price
Duration
Payment method
```

Example:

```text
Mission Impossible
DJ Mack
Download
TSh X,XXX
30 Days
```

The frontend must obtain pricing from the application data/service boundary.

It must not hardcode business prices into UI components.

---

# 25. Payment Result Routes

Success:

```text
/checkout/success
```

Failure:

```text
/checkout/failed
```

Purpose:

Give the customer a clear result and next action.

Success may provide:

```text
Watch Now
Download
Go to Library
```

Failure may provide:

```text
Try Again
Choose Another Method
Return to Movie
```

The exact payment integration belongs to the future backend/payment documentation.

---

# 26. Subscription Routes

Subscription discovery:

```text
/subscriptions
```

**Access:** PUBLIC

Purpose:

Display available subscription plans.

---

## Subscription Checkout

```text
/subscriptions/checkout
```

**Access:** CUSTOMER

Purpose:

Allow an authenticated customer to purchase a selected subscription.

---

## Customer Subscription

```text
/account/subscription
```

**Access:** CUSTOMER

Purpose:

Display the customer's current subscription status.

Possible information:

```text
Plan
Status
Start date
Expiry date
Included access
```

---

# 27. Subscription Independence Rule

Individual purchases and subscriptions are separate entitlements.

Example:

```text
Customer buys Movie A
        ↓
Movie A access = 30 days

Customer subscribes
        ↓
Subscription = 30 days
```

If the subscription expires:

```text
Subscription → EXPIRED

Movie A individual purchase
→ remains available
→ until its own entitlement expires
```

The route architecture must not visually imply that subscription expiry deletes independent purchases.

---

# 28. Admin Routes

Admin has its own application area.

Root:

```text
/admin
```

**Access:** ADMIN only.

Suggested structure:

```text
/admin
/admin/movies
/admin/series
/admin/categories
/admin/countries
/admin/djs
/admin/users
/admin/media-team
/admin/subscriptions
/admin/pricing
/admin/orders
/admin/payments
/admin/sales
/admin/featured
/admin/trending
/admin/settings
```

---

# 29. Admin Dashboard

```text
/admin
```

Purpose:

High-level operational overview.

Possible information:

```text
Total Movies
Total Series
Users
Sales
Revenue
Views
Downloads
Subscriptions
Failed Payments
Trending
Recent Transactions
```

Financial information is ADMIN-only.

---

# 30. Admin Movie Management

```text
/admin/movies
```

Purpose:

* View movies.
* Search movies.
* Filter movies.
* Create movie.
* Edit movie.
* Manage versions.
* Manage pricing.
* Manage availability.
* Manage featured/trending status.

Create:

```text
/admin/movies/new
```

Edit:

```text
/admin/movies/[id]/edit
```

The `id` here is an internal management identifier.

Public URLs should continue using slugs.

---

# 31. Admin Series Management

```text
/admin/series
```

Create:

```text
/admin/series/new
```

Edit:

```text
/admin/series/[id]/edit
```

Season management belongs within the series management experience.

Episode management may use:

```text
/admin/series/[seriesId]/seasons/[seasonId]/episodes
```

or another nested management structure if implementation requires it.

The principle remains:

**Admin URLs may use internal IDs; public URLs should prefer stable slugs.**

---

# 32. Admin Content Taxonomy

Categories:

```text
/admin/categories
```

Countries:

```text
/admin/countries
```

DJs/Translators:

```text
/admin/djs
```

These are management routes.

They control the entities used throughout public discovery.

---

# 33. Admin User Management

```text
/admin/users
```

Purpose:

* View customers.
* Search users.
* Manage account status.
* Review account-related information permitted to Admin.

Admin-only financial information must remain protected.

---

# 34. Admin Media Team Management

```text
/admin/media-team
```

Purpose:

* View Media Team members.
* Add Media Team members.
* Edit Media Team members.
* Disable/remove access.
* Control permissions where applicable.

---

# 35. Admin Pricing

```text
/admin/pricing
```

Purpose:

Manage business-configurable pricing.

Examples:

```text
Streaming price
Download price
Access duration
Subscription price
Subscription duration
Series pricing
```

The frontend must represent these values as configuration/data, not constants scattered across components.

---

# 36. Admin Payments & Sales

Payments:

```text
/admin/payments
```

Sales:

```text
/admin/sales
```

These areas are ADMIN-only.

They may contain sensitive information such as:

```text
Transactions
Revenue
Payment status
Failed payments
Sales performance
```

Media Team MUST NOT access these routes.

Customers MUST NOT access these routes.

---

# 37. Admin Featured & Trending

Featured:

```text
/admin/featured
```

Trending:

```text
/admin/trending
```

Trending supports both:

```text
Automatic ranking
+
Admin override
```

The UI must make the distinction clear.

Admin override should never silently destroy the underlying automatic ranking logic.

---

# 38. Admin Settings

```text
/admin/settings
```

Purpose:

Platform configuration that is explicitly part of the Admin control surface.

Potential areas include:

```text
Platform settings
Content settings
Access rules
Device policy
Subscription configuration
Payment configuration
```

Only settings defined by product requirements may be implemented.

Do not create arbitrary settings simply because the dashboard has an empty space.

---

# 39. Media Team Routes

Root:

```text
/media-team
```

**Access:** MEDIA_TEAM

Suggested structure:

```text
/media-team
/media-team/movies
/media-team/movies/new
/media-team/movies/[id]/edit
/media-team/series
/media-team/series/new
/media-team/series/[id]/edit
```

Media Team should have content-management capabilities only.

---

# 40. Media Team Financial Isolation

Media Team routes MUST NOT expose:

```text
Revenue
Sales
Payment records
Customer financial information
Platform financial analytics
```

The UI must not merely hide these items visually.

The route/access architecture must treat them as outside the Media Team permission boundary.

---

# 41. Media Team Publishing

Whether Media Team content requires Admin approval before publication is a pending business rule.

Until explicitly confirmed:

**Do not invent an approval workflow.**

If approval is later confirmed, the route architecture may be extended with appropriate states and management screens.

---

# 42. Error Routes

## Not Found

```text
/not-found
```

The application should use the framework's proper not-found handling where appropriate.

Examples:

```text
Movie does not exist
Series does not exist
Category does not exist
DJ does not exist
Invalid public slug
```

The user should receive a branded, useful experience rather than a generic browser error.

---

# 43. Unauthorized Route

```text
/unauthorized
```

Purpose:

Displayed when an authenticated user does not have permission to access a route.

Example:

```text
MEDIA_TEAM
 ↓
/admin/payments
 ↓
Unauthorized
```

The page should explain the situation without exposing sensitive information.

---

# 44. Error Handling

```text
/error
```

Used for unexpected application errors.

The error experience should provide:

```text
What happened
+
Safe recovery action
```

Examples:

```text
Try Again
Return Home
Return to Movie
```

Never expose internal stack traces or implementation details to customers.

---

# 45. Route Naming Rules

Routes must follow these rules:

### Public entities

Use readable slugs:

```text
/movies/movie-title
/series/series-title
/categories/category-name
/countries/country-name
/djs/dj-name
```

### Management entities

Internal identifiers may be used:

```text
/admin/movies/[id]/edit
```

### URL style

Use lowercase paths.

Prefer:

```text
/movie-name
```

over:

```text
/MovieName
```

Use hyphens for multi-word slugs:

```text
/dj-mack
/action-movies
```

Avoid unnecessary abbreviations.

---

# 46. Slug Rules

Public slugs must be:

* Human-readable.
* URL-safe.
* Stable.
* Unique within their route namespace.

Example:

```text
/movies/mission-impossible-final-reckoning
```

Not:

```text
/movies/123
```

unless there is a specific technical reason.

---

# 47. IDs vs Slugs

Use:

```text
PUBLIC → slug
ADMIN → internal ID where appropriate
```

Reason:

Public URLs are part of the customer-facing product and should remain readable.

Admin URLs are operational interfaces and may safely use internal identifiers.

---

# 48. Query Parameter Rules

Query parameters are appropriate for temporary or combinational discovery state.

Examples:

```text
/search?q=avengers
```

```text
/movies?category=action
```

```text
/movies?country=nigeria&dj=dj-mack
```

```text
/search?q=christian&type=series
```

Query parameters should not become an uncontrolled collection of UI state.

Only meaningful navigation/filter state belongs in the URL.

---

# 49. Modal vs Route Decision

Use a **route** when:

* The content deserves a direct URL.
* The user may refresh and return to it.
* The page is discoverable.
* Browser navigation should treat it as a destination.
* The content is significant enough to stand alone.

Use a **modal/bottom sheet** when:

* The interaction is short-lived.
* The user is choosing an option.
* The user should remain on the current context.
* The content does not require independent discovery.

Examples:

### Route

```text
Movie Details
Search
Library
Player
Checkout
Admin Movie Editor
```

### Modal / Sheet

```text
Choose DJ
Choose Watch vs Download
Payment method selection
Quick filter
Confirmation
```

---

# 50. Navigation Hierarchy

Public navigation should remain focused.

Primary navigation should prioritize:

```text
Home
Movies
Series
Categories
Search
```

Additional navigation can provide:

```text
Countries
DJs
Subscriptions
Account
Library
```

Do not overload the main navigation with every available entity.

---

# 51. Customer Navigation

Authenticated customers should gain access to personalized areas.

Conceptually:

```text
Home
Movies
Series
Search
        │
        └── Account
             ├── Library
             ├── Purchases
             ├── Downloads
             ├── Subscription
             └── Account Settings
```

---

# 52. Staff Navigation

Admin:

```text
Dashboard
Content
Users
Media Team
Commerce
Analytics
Configuration
```

Media Team:

```text
Dashboard
Movies
Series
Content Management
```

The Media Team navigation must not contain financial sections.

---

# 53. Deep Linking

Every meaningful public content page should support direct navigation.

Examples:

```text
/movies/movie-slug
/series/series-slug
/categories/christian
/countries/nigeria
/djs/dj-mack
```

A user should be able to open such a URL directly without first visiting `/`.

---

# 54. Browser Navigation

The application must respect:

```text
Back
Forward
Refresh
Deep Link
Open in New Tab
```

especially for:

```text
Search
Filters
Movie details
Series details
Player
Checkout
```

Do not implement navigation entirely through hidden client state.

---

# 55. Responsive Routing

Routes remain consistent across devices.

Do NOT create:

```text
/mobile/movies
/desktop/movies
```

or similar device-specific routes.

The same route must adapt its experience through responsive UI.

---

# 56. Route Transition Principles

Route transitions must follow MD-04.

Important transitions include:

```text
Movie Card
    ↓
Movie Detail

Movie Detail
    ↓
Player

Movie Detail
    ↓
Checkout

Search
    ↓
Movie Detail
```

Where technically appropriate, shared-element transitions may connect related views.

Animations must never interfere with navigation functionality.

---

# 57. SEO-Oriented Public Routes

The following are strong candidates for public indexing:

```text
/
 /movies
 /movies/[slug]
 /series
 /series/[slug]
 /categories/[slug]
 /countries/[slug]
 /djs/[slug]
```

Private routes such as:

```text
/account
/library
/checkout
/admin/*
/media-team/*
```

are not public discovery pages.

SEO implementation details belong in the relevant frontend implementation documentation.

---

# 58. Complete Route Map

```text
PUBLIC
│
├── /
├── /search
│
├── /movies
│   └── /movies/[slug]
│
├── /series
│   └── /series/[slug]
│       └── /series/[seriesSlug]/season/[seasonNumber]/episode/[episodeNumber]
│
├── /categories
│   └── /categories/[slug]
│
├── /countries
│   └── /countries/[slug]
│
├── /djs
│   └── /djs/[slug]
│
└── /subscriptions


AUTH
│
├── /login
├── /register
├── /forgot-password
└── /reset-password


CUSTOMER
│
├── /library (tabs: ?tab=continue, ?tab=passes, ?tab=downloads, ?tab=watchlist)
├── /watch/[slug] (?dj=...)
├── /subscriptions
└── [LipaModal] (global in-context checkout modal)


ADMIN
│
├── /admin
├── /admin/movies
├── /admin/series
├── /admin/djs
├── /admin/categories
├── /admin/countries
├── /admin/orders
├── /admin/transactions
├── /admin/sales
├── /admin/users
├── /admin/media-team
├── /admin/subscriptions
├── /admin/pricing
├── /admin/featured
├── /admin/trending
├── /admin/content-performance
└── /admin/settings


MEDIA TEAM
│
├── /media-team                     (Content Operations Overview & KPIs)
├── /media-team/movies              (Movie Catalog Library)
│     ├── /media-team/movies/new    (Catalog Intake Wizard — 6 Steps)
│     └── /media-team/movies/[id]/edit (Movie Edit Studio)
├── /media-team/series              (Series & Episodic Studio)
│     ├── /media-team/series/new    (Series Intake Wizard)
│     └── /media-team/series/[id]/edit (Series Edit Studio)
├── /media-team/review              (Review Queue & Readiness Gate)
├── /media-team/assets              (Media Asset Library & File Storage)
├── /media-team/categories          (Category Taxonomy Reference)
├── /media-team/countries           (Country Taxonomy Reference)
├── /media-team/djs                 (Translating DJs Reference)
│
└── Automated Redirect Aliases:
      ├── /media-team/qc          → /media-team/review
      ├── /media-team/transcoding → /media-team/assets
      ├── /media-team/stems       → /media-team/djs
      └── /media-team/metadata    → /media-team/categories


SYSTEM
│
├── /login
├── /register
├── /forgot-password
├── /reset-password
└── /unauthorized
```


---

# 59. Route Ownership

| Route Group        | Owner          |
| ------------------ | -------------- |
| `/`                | Discovery      |
| `/movies/*`        | Movies         |
| `/series/*`        | Series         |
| `/categories/*`    | Discovery      |
| `/countries/*`     | Discovery      |
| `/djs/*`           | Discovery      |
| `/search`          | Discovery      |
| `/account/*`       | Customer       |
| `/library`         | Customer       |
| `/purchases`       | Customer       |
| `/downloads`       | Customer       |
| `/watch/*`         | Player         |
| `/checkout/*`      | Commerce       |
| `/subscriptions/*` | Commerce       |
| `/admin/*`         | Admin          |
| `/media-team/*`    | Media Team     |
| `/login/*`         | Authentication |
| `/error`           | System         |
| `/not-found`       | System         |
| `/unauthorized`    | System         |

---

# 60. Route Protection Rules

The application must protect:

```text
/account/*
/library
/purchases
/downloads
/watch/*
/checkout/*
/admin/*
/media-team/*
```

Public routes remain accessible to guests.

A guest should not be forced to authenticate simply to browse content.

---

# 61. No Route Duplication

Do not create multiple URLs for the same primary content without a documented reason.

Bad:

```text
/movie/123
/movies/123
/content/123
/watch/movie/123
```

when they all represent the same public movie.

Preferred:

```text
/movies/movie-slug
```

and, when playback is required:

```text
/watch/movie/movie-slug
```

Each route must have a distinct purpose.

---

# 62. Resolved Operational Decisions

The core platform operational rules have been finalized and implemented in the frontend architecture:

### 1. Media Team approval (RESOLVED & IMPLEMENTED)

Governed dynamically via `adminPlatformSettings.publishingRequiresApproval` (queried by `adminRepository.isPublishingApprovalRequired()`):
- When enabled (`true`): Media Team intake creates `'READY_FOR_REVIEW'` records requiring Admin review at `/admin/movies` or `/admin/series` before live publication.
- When disabled (`false`): Media Team can publish directly to the live catalog.

### 2. Series pricing (RESOLVED & IMPLEMENTED)

Configured via `pricingModel` (`'per_episode' | 'per_season' | 'full_series' | 'combination'`):
- Episode pricing: `streamPriceTsh` and `downloadPriceTsh` per episode.
- Season Pass pricing: `seasonPassPriceTsh` on each season.
- Series default fallbacks on `AdminSeries`.

### 3. Maximum active devices (RESOLVED & IMPLEMENTED)

Governed via `adminPlatformSettings.maxActiveDevicesPerUser` (default: 3 devices per customer account) and tracked in `CustomerDevice`.

### 4. Payment providers (RESOLVED & IMPLEMENTED)

Implemented for Tanzania Mobile Money and Cards via `PaymentMethod = 'mpesa' | 'tigo' | 'airtel' | 'halopesa' | 'card'` (M-Pesa, Tigo Pesa, Airtel Money, HaloPesa, Visa/MasterCard).

---

# 63. Definition of Done

MD-06 is considered implemented when:

* All primary routes exist.
* Route naming follows this document.
* Public routes are accessible without unnecessary authentication.
* Protected routes enforce access boundaries.
* Admin and Media Team areas are separated.
* Public URLs use readable slugs.
* Admin management URLs can use internal IDs.
* Search/filter state is URL-aware where appropriate.
* Browser back/forward works correctly.
* Deep links work.
* Unknown content produces a proper not-found experience.
* Unauthorized users receive an appropriate access-denied experience.
* No duplicate primary routes exist.
* No undocumented major route is introduced.

---

# 64. AI Coding Agent Directive

You are implementing the route architecture of **GIFTEDproMovies**.

You MUST:

1. Follow MD-01.
2. Follow MD-02.
3. Follow MD-03.
4. Follow MD-04.
5. Follow MD-05.
6. Follow this MD-06.
7. Never invent major routes.
8. Never create device-specific routes.
9. Never expose Admin routes to Media Team.
10. Never expose financial routes to customers or Media Team.
11. Never require authentication for basic public discovery.
12. Prefer public slugs over internal IDs.
13. Use query parameters for meaningful search/filter state.
14. Keep route responsibilities clear.
15. Do not implement backend functionality.
16. Do not invent unresolved business rules.
17. If implementation requires a route not defined here, STOP and request documentation clarification before creating it.

---

# 65. Final Route Philosophy

GIFTEDproMovies should feel like a **real streaming platform**, not a collection of disconnected pages.

The navigation model must make the following journey feel natural:

```text
DISCOVER
   ↓
SEARCH
   ↓
EXPLORE
   ↓
DETAIL
   ↓
CHOOSE VERSION
   ↓
WATCH / DOWNLOAD
   ↓
LIPA
   ↓
ACCESS
   ↓
LIBRARY
```

Every route exists to support part of this journey.

No route should exist merely because it is technically easy to create.

---

# 66. Document Status

**MD-06 is the route-level source of truth.**

It defines the navigation contract but does not define individual component implementation.

The next document will define the component system.

**Next:**

```text
07_COMPONENT_ARCHITECTURE.md
```

That document will define exactly how the UI is broken into reusable components, feature components, cinematic components, navigation components, cards, rails, modals, sheets, forms, tables, and role-specific UI.
