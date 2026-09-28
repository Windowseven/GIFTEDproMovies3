# GIFTEDproMovies

## Frontend Architecture & Application Structure

**Document ID:** MD-05
**File:** `05_FRONTEND_ARCHITECTURE.md`
**Version:** 1.0
**Status:** LOCKED FOUNDATION
**Scope:** Frontend only
**Product:** GIFTEDproMovies

---

# 1. Purpose

This document defines the frontend architecture of GIFTEDproMovies.

It establishes:

* application structure
* feature boundaries
* route organization
* component ownership
* data flow
* mock-data boundaries
* Server vs Client Component responsibilities
* reusable UI boundaries
* business-domain boundaries
* future API separation
* state ownership
* dependency direction

The objective is to ensure the frontend remains:

**scalable, maintainable, testable, reusable and ready for future backend integration.**

---

# 2. Core Architecture Principle

The frontend must not be built as a collection of unrelated pages.

It must be structured around:

```text
Product
   ↓
Features
   ↓
Components
   ↓
Typed Data
   ↓
Future Services
```

The architecture should allow the backend to be introduced later without requiring a complete frontend rewrite.

---

# 3. High-Level Architecture

The frontend follows this conceptual structure:

```text id="f6j2qp"
                    GIFTEDproMovies
                           │
                           ▼
                    Next.js App Router
                           │
             ┌─────────────┴─────────────┐
             │                           │
             ▼                           ▼
        Public Experience          Authenticated Experience
             │                           │
             ├── Discovery               ├── Library
             ├── Search                  ├── Player
             ├── Movies                  ├── Purchases
             ├── Series                  ├── Subscription
             └── Categories              └── Account
             
                           │
                           ▼
                    Shared Features
                           │
             ┌─────────────┼─────────────┐
             ▼             ▼             ▼
        Components      Typed Data    Services
             │             │             │
             │             │             ▼
             │             │        FUTURE API
             │             │
             └─────────────┴─────────────
```

---

# 4. Architectural Layers

The frontend is divided into logical layers.

## Layer 1 — Routes

Responsible for:

* URL structure
* page composition
* route-level metadata
* loading/error boundaries
* access-aware rendering

Routes should not contain large business logic.

---

## Layer 2 — Features

Responsible for product capabilities.

Examples:

* discovery
* movies
* series
* player
* commerce
* library
* authentication
* administration

Features contain domain-specific behavior.

---

## Layer 3 — Components

Responsible for reusable visual and interaction units.

Examples:

* MovieCard
* SearchBar
* ContentRail
* PriceDisplay
* PaymentSheet
* VideoPlayer

---

## Layer 4 — Data

Responsible for typed mock data during frontend development.

Example:

```text id="b5xw9u"
Movie
Series
Episode
DJ
Category
Country
User
Subscription
Purchase
```

No database access exists in this layer.

---

## Layer 5 — Services

Responsible for the boundary between the UI and future external data sources.

Conceptually:

```text id="y3hj9v"
Component
   ↓
Feature logic
   ↓
Service
   ↓
Mock implementation

Later:

Component
   ↓
Feature logic
   ↓
Service
   ↓
Real API
```

The UI should not care whether the data came from mock data or an API.

---

# 5. Recommended Project Structure

The frontend should follow this structure:

```text id="f7q4zp"
GIFTEDproMovies/
│
├── app/
│   ├── (public)/
│   ├── (auth)/
│   ├── (customer)/
│   ├── (admin)/
│   ├── (media-team)/
│   ├── layout.tsx
│   ├── loading.tsx
│   ├── error.tsx
│   ├── not-found.tsx
│   └── globals.css
│
├── components/
│   ├── ui/
│   ├── cinematic/
│   ├── media/
│   ├── navigation/
│   └── feedback/
│
├── features/
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
├── data/
│   ├── mock/
│   └── schemas/
│
├── services/
│   ├── movies/
│   ├── series/
│   ├── search/
│   ├── commerce/
│   ├── library/
│   └── auth/
│
├── hooks/
│
├── lib/
│
├── types/
│
├── config/
│
├── public/
│
├── docs/
│
├── next.config.*
├── tsconfig.json
├── package.json
└── README.md
```

This structure is the architectural baseline.

---

# 6. App Router Responsibility

The `app/` directory is responsible primarily for routing and page composition.

It should NOT become a dumping ground for:

* reusable components
* huge data arrays
* business rules
* API implementations
* payment logic
* complex feature logic

Pages should compose features.

Example:

```text id="j1j5yq"
Movie Details Page
        ↓
MovieDetailsFeature
        ↓
MovieHero
MovieMetadata
VersionSelector
PricingOptions
RelatedMovies
```

---

# 7. Route Groups

Route groups should be used to organize application areas without unnecessarily changing the public URL structure.

Conceptual groups:

```text id="5v3c4t"
(public)
(auth)
(customer)
(admin)
(media-team)
```

These are organizational boundaries.

They do not automatically mean the corresponding backend authorization exists.

---

# 8. Public Experience

The public area is the primary discovery experience.

It includes:

```text id="9w0vpp"
/                       Homepage
/movies                 Movies
/series                 Series
/search                 Search
/movies/[slug]          Movie details
/series/[slug]          Series details
/categories/[slug]      Category
/countries/[slug]       Country
/djs/[slug]             DJ/Translator
```

Exact route naming may be refined in the dedicated route-map document.

This document defines architecture, not the final route contract.

---

# 9. Customer Experience

Authenticated customer features may include:

```text id="g8r5yt"
/account
/library
/purchases
/subscription
/watch/[id]
/download/[id]
```

The exact public URL structure will be formally locked in MD-06.

---

# 10. Admin Experience

Admin routes should be isolated from public customer routes.

Conceptually:

```text id="5qlx4a"
/admin
/admin/movies
/admin/series
/admin/categories
/admin/countries
/admin/djs
/admin/users
/admin/media-team
/admin/payments
/admin/sales
/admin/subscriptions
/admin/settings
```

Admin-only financial information must never be rendered in customer or Media Team interfaces.

---

# 11. Media Team Experience

Media Team routes should focus on content management.

Conceptually:

```text id="8jglf7"
/media-team
/media-team/movies
/media-team/series
/media-team/uploads
```

Media Team must not receive financial dashboard features.

---

# 12. Feature-Based Architecture

Feature directories represent product capabilities.

Example:

```text id="u4qjgi"
features/movies/
```

may contain:

```text id="7v3m2k"
components/
hooks/
services/
types/
utils/
```

A feature should own logic specific to that domain.

---

# 13. Discovery Feature

`features/discovery/`

Responsible for:

* homepage content composition
* trending
* featured
* new releases
* popular content
* category discovery
* country discovery
* DJ/Translator discovery
* recommendation presentation

Discovery must not own payment logic.

---

# 14. Movies Feature

`features/movies/`

Responsible for:

* movie display
* movie metadata
* movie details
* movie versions
* DJ/Translator association
* movie categorization
* movie pricing presentation
* related movies

It should not directly implement payment processing.

---

# 15. Series Feature

`features/series/`

Responsible for:

```text id="9a8bq2"
Series
   ↓
Seasons
   ↓
Episodes
```

It owns:

* series presentation
* season navigation
* episode lists
* episode metadata
* series pricing presentation
* series-related discovery

---

# 16. Player Feature

`features/player/`

Responsible for the frontend streaming experience.

It may own:

* video player
* playback controls
* subtitles UI
* quality UI
* audio selection UI
* progress UI
* continue watching
* playback state

It must not implement actual streaming infrastructure.

---

# 17. Commerce Feature

`features/commerce/`

Responsible for frontend purchase interactions.

Examples:

* Watch option
* Download option
* pricing
* LIPA CTA
* checkout UI
* payment provider selection
* payment status presentation
* purchase confirmation

The actual payment gateway integration belongs to the future backend/service layer.

---

# 18. Library Feature

`features/library/`

Responsible for the customer's accessible content.

Examples:

* purchased content
* active access
* recently watched
* continue watching
* downloads
* expired content state

The frontend must distinguish:

```text id="2k1e4a"
Purchased
Active
Expired
Unavailable
```

---

# 19. Authentication Feature

`features/auth/`

Responsible for:

* login UI
* registration UI
* password UI
* account states
* authentication-related frontend flows

During frontend-only development, authentication may use mock states.

No real authentication backend should be implemented.

---

# 20. Admin Feature

`features/admin/`

Responsible for Admin-specific UI.

Examples:

* dashboard
* movie management
* series management
* user management
* Media Team management
* pricing management
* subscription management
* payment visibility
* sales
* categories
* countries
* DJs/Translators
* featured/trending controls
* settings

---

# 21. Media Team Feature

`features/media-team/`

Responsible for:

* content upload UI
* movie editing UI
* series editing UI
* season/episode management
* poster management
* metadata management
* DJ/Translator management

Financial information must not exist in this feature.

---

# 22. Shared Components

`components/` contains reusable components that are not owned by a single business feature.

Examples:

```text id="zq9s0m"
components/ui/
    Button
    Input
    Dialog
    Sheet
    Badge
    Tabs
    Select

components/cinematic/
    Hero
    MovieCard
    ContentRail

components/media/
    Poster
    VideoThumbnail
    MediaPreview

components/navigation/
    Navbar
    MobileMenu
    Breadcrumbs

components/feedback/
    EmptyState
    ErrorState
    LoadingState
    Skeleton
```

---

# 23. Component Ownership Rule

Before creating a component, determine whether it is:

1. globally reusable
2. feature-specific
3. page-specific

Do not place every component in `components/`.

For example:

```text id="yqk1v5"
MovieCard
```

is potentially shared.

But:

```text id="AdminMovieApprovalPanel"
```

belongs to the relevant admin/media feature.

---

# 24. Avoid the Mega-Component

Do not create components such as:

```text id="u5a5w6"
MoviePageEverything.tsx
HomePageEverything.tsx
AdminDashboardEverything.tsx
```

A page should compose smaller responsibilities.

---

# 25. Page Composition

Recommended pattern:

```text id="xqz3bh"
Route
  ↓
Feature Container
  ↓
Feature Components
  ↓
Shared Components
```

Example:

```text id="n0w2yq"
/movies/[slug]
       ↓
MovieDetailsFeature
       ├── MovieHero
       ├── MovieMetadata
       ├── VersionSelector
       ├── PricingOptions
       ├── PurchaseActions
       └── RelatedMovies
```

---

# 26. Data Flow

The preferred data direction is:

```text id="x8i4zz"
Data Source
    ↓
Service
    ↓
Feature
    ↓
Component
    ↓
User Interaction
    ↓
Feature Action
    ↓
Service
```

Components should not independently invent or fetch unrelated data sources.

---

# 27. Mock Data Architecture

During frontend development:

```text id="6r9x8d"
UI
 ↓
Service
 ↓
Mock Repository
 ↓
Typed Mock Data
```

Example:

```text id="1o9lqx"
getMovies()
getMovieBySlug()
getTrendingMovies()
getSeries()
getCategories()
getCountries()
getDJs()
```

These functions represent future data access boundaries.

---

# 28. Future API Replacement

Later:

```text id="8nqj1r"
Current:

getMovies()
     ↓
mockMovies


Future:

getMovies()
     ↓
API request
     ↓
Backend
```

The UI should not need to know that the source changed.

---

# 29. No Direct Mock Data Imports in Complex UI

Avoid:

```text id="zqj0k4"
import movies from "@/data/mock/movies"
```

inside many unrelated components.

Prefer:

```text id="2gk5vy"
feature/service
       ↓
typed data
       ↓
component
```

This keeps the future API migration clean.

---

# 30. Type Ownership

Domain types should be centrally defined or owned by their relevant feature.

Examples:

```text id="6m0c5g"
Movie
MovieVersion
Series
Season
Episode
DJ
Category
Country
User
Purchase
Subscription
```

Do not recreate the same type differently in multiple components.

---

# 31. TypeScript Rule

TypeScript strictness is mandatory.

Avoid:

```text id="3n9p2c"
any
```

unless there is a documented and justified reason.

Prefer:

```text id="w9x4h7"
unknown
```

with explicit narrowing when dealing with uncertain data.

---

# 32. Server vs Client Components

Use Server Components by default where they are appropriate.

Use Client Components when the component requires browser interaction or client state.

Examples requiring Client Components:

* interactive carousel
* movie hover interaction where state is required
* video player
* payment selection
* form interaction
* dropdown interaction
* client-side search behavior
* browser APIs
* local interactive state

Do not mark entire pages `"use client"` unnecessarily.

---

# 33. Client Boundary Rule

Keep Client Components as close as possible to the interactive UI that needs them.

Conceptually:

```text id="2m4n7z"
Server Page
   │
   ├── Server Content
   │
   └── Client Interactive Component
```

Not:

```text id="7y6z0p"
Entire Application
        ↓
"use client"
```

---

# 34. State Management

Do not introduce global state automatically.

Use the smallest appropriate state boundary.

Examples:

### Local component state

For:

* modal open/close
* selected tab
* hover state
* local input state

### Feature state

For:

* search filters
* selected movie version
* player state
* checkout state

### Global state

Only for genuinely cross-application concerns.

Potential examples:

* authenticated user session state
* persistent UI preferences

The exact state library, if any, must be justified.

---

# 35. URL State

Search and discovery filters that users may reasonably want to share or navigate back to should preferably be represented in the URL.

Examples:

```text id="g9e1ax"
?type=movie
?category=action
?country=nigeria
?dj=dj-mack
```

The final query parameter contract will be defined in the search/discovery documentation.

---

# 36. Forms

Forms should have:

* typed fields
* clear validation
* visible errors
* loading states
* success states
* accessible labels

Form behavior should be separated from presentation where complexity requires it.

---

# 37. Service Layer Rule

Services must provide a clean boundary.

Example conceptual interface:

```text id="u7c2o5"
MovieService

getMovies()
getMovie(id)
getTrending()
getFeatured()
searchMovies()
```

The current implementation may return mock data.

Later it may call the backend.

The component API should remain stable where practical.

---

# 38. No Backend Leakage

Frontend code must not contain assumptions such as:

```text id="3m5x5r"
SQL query
database schema
Prisma client
MySQL connection
server secret
payment secret
storage credentials
```

These belong outside the frontend.

---

# 39. Environment Variables

Only public frontend configuration may be exposed to the browser.

Sensitive secrets must never be placed in:

```text id="3v3gqy"
NEXT_PUBLIC_*
```

During frontend-only development, real secrets should not be required.

---

# 40. Business Rule Placement

Business rules should not be duplicated across UI components.

For example:

> Streaming price and Download price are different.

This should be represented in typed domain data and feature logic rather than manually hardcoded across several cards.

---

# 41. Access Duration

The frontend must treat access duration as configurable data.

It must NOT assume:

```text id="4f5t2p"
7 days
30 days
forever
```

unless that value exists in the current data.

The Admin-configured duration will eventually come from the backend.

---

# 42. Subscription Independence

The frontend must preserve the distinction between:

```text id="l7c4g1"
Individual Purchase
        ≠
Subscription Access
```

If a subscription expires, individually purchased content should not automatically become unavailable merely because of subscription expiry.

The UI must represent these states separately.

---

# 43. Device Access

The frontend may display device/access information when required.

However:

* the frontend does not define the security policy
* the frontend does not independently enforce device limits
* the backend will eventually enforce actual access rules

The frontend should represent backend-provided entitlement state.

---

# 44. Download Protection

The frontend must not assume that a download means:

```text id="5j0r8p"
public MP4 URL
```

Future download entitlement may be:

```text id="d8p0w3"
Authenticated user
       ↓
Valid entitlement
       ↓
Allowed device
       ↓
Valid access period
       ↓
Protected download
```

Actual protection is a backend concern.

---

# 45. Payment Boundary

The frontend may provide:

* payment UI
* provider selection
* order summary
* payment status
* success/failure screens

It must not contain:

* payment secrets
* provider credentials
* server-side verification logic
* direct secret-key gateway calls

---

# 46. Financial Data Boundary

Financial information must be restricted by role.

```text id="q4l7ad"
ADMIN
├── sales
├── revenue
├── payment history
├── failed payments
└── financial analytics

MEDIA TEAM
└── no financial data

CUSTOMER
└── own transaction/access information only
```

The frontend must not merely hide financial information visually while still loading unnecessary sensitive data into the client.

---

# 47. Role Architecture

Supported roles:

```text id="y8h3r0"
ADMIN
MEDIA_TEAM
CUSTOMER
```

Role checks should eventually be based on authenticated backend/session data.

Mock development may simulate these roles.

Do not create additional roles without approval.

---

# 48. Authentication Boundary

The frontend may simulate:

```text id="7m0tqk"
logged out
logged in
admin
media team
customer
```

But this is only for development.

It is not security.

Actual authorization must eventually be enforced by the backend.

---

# 49. Security Principle

Never trust the frontend to enforce authorization.

For example:

```text id="q2y1b8"
Hiding /admin
```

does NOT secure Admin functionality.

The future backend must enforce access.

The frontend only provides the correct user experience.

---

# 50. Error Boundaries

The application should have clear error handling at:

* global level
* route level
* feature level where necessary

Errors must have:

* readable message
* recovery action where possible
* retry capability when appropriate
* no raw technical secrets exposed to users

---

# 51. Loading Architecture

Loading states should exist at the appropriate boundary.

Examples:

```text id="b6s7p2"
Homepage
→ section skeleton

Movie Details
→ hero/details skeleton

Search
→ results skeleton

Player
→ player loading state

Admin
→ dashboard/table skeleton
```

Avoid one global spinner for the entire application.

---

# 52. Empty States

Every collection should have a meaningful empty state.

Examples:

* no search results
* no purchases
* no downloads
* no active subscription
* no movies in category
* no episodes
* no upload history

Empty states must explain:

1. what happened
2. what the user can do next

---

# 53. Responsive Architecture

Responsiveness is not a final CSS step.

The architecture must support:

```text id="q7s0m5"
Mobile
Tablet
Desktop
Large Desktop
```

Components should be designed with responsive behavior from the beginning.

---

# 54. Mobile-First Principle

The default interaction model should support touch.

Desktop enhancements may then add:

* hover
* cursor interaction
* richer rails
* wider layouts
* expanded navigation

Do not design desktop first and attempt to shrink it into mobile.

---

# 55. Image Architecture

Media-heavy content is central to GIFTEDproMovies.

Images should be:

* optimized
* responsive
* appropriately sized
* lazy-loaded where appropriate
* prioritized when above the fold
* given meaningful alternative text when required

Poster and hero images should use the project's image optimization strategy rather than arbitrary `<img>` usage everywhere.

---

# 56. Slug Architecture

Public media content should use stable readable identifiers where appropriate.

Example:

```text id="q9w1e2"
/movies/inception
/series/the-chosen
```

Do not expose unnecessary internal database IDs in public URLs if a stable slug can be used.

---

# 57. SEO Architecture

Public content pages should be structured so that search engines can understand:

* movie title
* description
* category
* country
* release year
* media type
* relevant metadata

The public movie/series detail layer should therefore be treated as a real product surface, not merely a modal.

---

# 58. Dependency Direction

The preferred dependency direction is:

```text id="5z1r3p"
Routes
  ↓
Features
  ↓
Shared Components
  ↓
UI primitives
```

Data/services should be accessed through defined feature boundaries.

Avoid circular dependencies.

---

# 59. Import Discipline

Prefer clear aliases such as:

```text id="h0s4z8"
@/components
@/features
@/lib
@/services
@/types
```

Avoid deeply nested relative imports such as:

```text id="4z1n6b"
../../../../../../../components/...
```

---

# 60. Utility Functions

Small generic utilities may live in:

```text id="5p0v7c"
lib/
```

Examples:

* formatting
* URL helpers
* date formatting
* common validation helpers

Domain-specific logic should remain inside its feature.

---

# 61. Hooks

Custom hooks belong in:

```text id="v3p5y7"
hooks/
```

when genuinely shared.

Feature-specific hooks should preferably remain inside their feature.

Examples:

```text id="1x7c9m"
features/player/hooks/
features/search/hooks/
features/commerce/hooks/
```

---

# 62. Configuration

Application-level configuration may live in:

```text id="z6h3r8"
config/
```

Examples:

* navigation configuration
* feature flags
* application constants
* supported media types

Do not use configuration files to hide business logic.

---

# 63. Feature Flags

Feature flags may be introduced when useful.

Examples:

```text id="k7p4d0"
newPlayer
newDiscovery
subscriptionUI
```

But do not create a feature-flag system before there is a real need.

---

# 64. Testing Architecture

The architecture must remain testable.

Priority areas:

* utility functions
* feature logic
* data transformation
* forms
* critical user flows
* payment UI states
* player states
* role-based rendering

Visual components should be designed so important states can be tested independently.

---

# 65. Accessibility Architecture

Every interactive component must support:

* keyboard interaction where applicable
* visible focus
* semantic HTML
* accessible labels
* appropriate ARIA only where necessary
* reduced motion
* readable contrast

Accessibility must be part of component architecture, not a final patch.

---

# 66. Performance Architecture

The platform is media-heavy.

Therefore:

* avoid unnecessary client rendering
* use Server Components where appropriate
* lazy-load heavy interactive modules
* optimize images
* avoid unnecessary global state
* avoid rendering huge collections unnecessarily
* keep animation performant
* avoid excessive JavaScript

---

# 67. Heavy Components

Potentially heavy features include:

* video player
* advanced carousel
* large admin tables
* rich upload UI
* complex payment interaction

These should be loaded and structured carefully.

Do not ship unnecessary heavy functionality to every page.

---

# 68. Admin and Customer Isolation

Customer pages should not import Admin-only feature modules simply because they exist in the same project.

Likewise:

Media Team pages should not import financial dashboards.

Architectural separation should support role separation.

---

# 69. No Copy-Paste Architecture

If two features contain nearly identical logic, determine whether it should become:

* shared component
* shared utility
* shared hook
* shared service
* domain abstraction

Do not blindly duplicate code.

However, do not abstract components merely because two pieces of code look similar.

Abstraction must improve maintainability.

---

# 70. Avoid Premature Abstraction

Do not create:

```text id="4w2n7c"
GenericUniversalCard
UniversalContentEngine
MegaRepository
BaseEverything
```

without a demonstrated need.

Abstractions should emerge from actual repeated behavior.

---

# 71. Documentation Boundary

Every major feature should eventually have documentation describing:

* purpose
* inputs
* outputs
* states
* user interactions
* dependencies
* future API boundary

This prevents future developers and AI coding agents from guessing.

---

# 72. AI Coding Agent Rules

The coding agent MUST:

* respect folder ownership
* respect feature boundaries
* use existing components before creating duplicates
* use typed data
* use service boundaries
* keep backend concerns out of the frontend
* avoid global state unless justified
* avoid `"use client"` unnecessarily
* preserve role separation
* preserve the public/customer/admin architecture
* follow existing naming conventions
* avoid moving files without architectural reason

The agent MUST NOT:

* create arbitrary folders
* create a second architecture
* mix backend code into frontend
* create random API routes
* create database files
* create payment integrations
* introduce undocumented global state
* duplicate existing domain types
* rewrite architecture without approval

---

# 73. Architecture Change Rule

If the agent believes the architecture should change, it must first explain:

1. current limitation
2. proposed change
3. affected modules
4. benefit
5. potential risks

Then wait for approval.

Architecture must not silently evolve during implementation.

---

# 74. Definition of Done

The architecture is considered correctly implemented when:

* [ ] App Router structure exists
* [ ] route groups are organized
* [ ] feature boundaries exist
* [ ] shared components are separated
* [ ] mock data is typed
* [ ] services separate UI from data source
* [ ] Server/Client boundaries are intentional
* [ ] customer/admin/media-team areas are separated
* [ ] financial data boundaries are respected
* [ ] no backend implementation exists
* [ ] no database implementation exists
* [ ] no real payment integration exists
* [ ] no real authentication backend exists
* [ ] imports remain clean
* [ ] domain types are not duplicated
* [ ] responsive architecture is supported
* [ ] loading/error/empty states have architectural boundaries
* [ ] architecture can accept a future API without major UI rewrite

---

# 75. What MD-05 Locks

This document locks:

* frontend architecture
* application layering
* feature boundaries
* component ownership principles
* data/service boundary
* mock-data strategy
* role-area separation
* Server/Client component principles
* state-management principles
* security boundaries
* frontend/backend separation
* architectural quality rules

---

# 76. What MD-05 Does Not Lock

This document does not yet lock:

* final URL list
* exact route parameters
* exact component inventory
* exact data schema
* exact mock dataset
* exact API endpoints
* backend architecture
* database schema
* payment providers
* streaming infrastructure

Those will be defined separately.

---

# 77. Final Architecture Directive

The frontend must be treated as a real production application even though the backend does not exist yet.

The correct mindset is:

```text id="6h2n9p"
BUILD FRONTEND NOW
      ↓
WITH REAL ARCHITECTURE
      ↓
USING TYPED MOCK DATA
      ↓
THROUGH CLEAN SERVICE BOUNDARIES
      ↓
READY FOR FUTURE BACKEND
```

Do not build a prototype that will later need to be thrown away.

Build the frontend as the first production layer of GIFTEDproMovies.

---

# 78. Next Document

The next document is:

```text id="n4q7x1"
06_ROUTE_MAP.md
```

That document will formally define every frontend route, its purpose, access level, page type, navigation relationship, URL structure and role boundary.

**END OF MD-05**
