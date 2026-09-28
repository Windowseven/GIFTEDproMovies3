# GIFTEDproMovies — Mock API Boundary & Future Backend Integration Specification

**Document ID:** MD-28
**File:** `28_MOCK_API_BOUNDARY.md`
**Version:** 1.0
**Status:** Frontend Implementation Contract
**Project:** GIFTEDproMovies

---

# 1. Purpose

This document defines the boundary between the frontend application and its temporary mock data layer.

The goal is to ensure that:

* frontend UI is developed without a backend;
* mock data behaves like a future data source;
* components do not become dependent on mock-data implementation details;
* future API integration can replace the mock layer with minimal UI changes;
* business logic remains organized;
* API assumptions are not invented prematurely.

The mock layer is temporary.

The architecture is permanent.

---

# 2. Core Principle

> **The UI should not know whether data comes from mock data or a real API.**

Preferred architecture:

```text id="4x2n8r"
Page
 ↓
Feature Component
 ↓
Controller / Hook
 ↓
Repository
 ↓
Mock Data
```

Future:

```text id="g7m1pz"
Page
 ↓
Feature Component
 ↓
Controller / Hook
 ↓
Repository
 ↓
API Client
 ↓
Backend
```

The UI should not require a rewrite when the final backend is introduced.

---

# 3. What Is a Mock API Boundary?

The mock API boundary is an architectural contract separating:

### Frontend experience

from:

### Data source implementation.

The frontend should request meaningful domain operations rather than directly manipulating mock arrays everywhere.

Bad:

```text id="h9d1kf"
MoviePage
 ↓
movies.filter(...)
 ↓
movies.find(...)
 ↓
localStorage
```

Preferred:

```text id="z3k6pt"
MoviePage
 ↓
useMovie(...)
 ↓
movieRepository.getBySlug(...)
 ↓
mockMovieRepository
```

Later:

```text id="6qf0va"
useMovie(...)
 ↓
movieRepository.getBySlug(...)
 ↓
apiMovieRepository
```

---

# 4. Architectural Layers

The frontend should maintain the following conceptual layers:

```text id="7v4x1n"
┌──────────────────────────────┐
│           ROUTES              │
├──────────────────────────────┤
│      FEATURE COMPONENTS       │
├──────────────────────────────┤
│     CONTROLLERS / HOOKS       │
├──────────────────────────────┤
│        REPOSITORIES            │
├──────────────────────────────┤
│      DATA / API ADAPTER        │
├──────────────────────────────┤
│ MOCK DATA  →  FUTURE API      │
└──────────────────────────────┘
```

Each layer has a specific responsibility.

---

# 5. Routes

Routes are responsible for:

* receiving route parameters;
* composing page experiences;
* selecting appropriate feature components;
* handling route-level loading/error/not-found behavior.

Routes should not contain large data-access implementations.

Avoid:

```text id="0p6l9q"
app/movies/[slug]/page.tsx
    ↓
200 lines of filtering
    ↓
business logic
    ↓
mock mutations
```

Prefer:

```text id="f5d2lq"
Route
 ↓
Feature container
 ↓
Controller
 ↓
Repository
```

---

# 6. Feature Components

Feature components own product-specific presentation.

Examples:

```text id="5g3qpx"
MovieDetails
MovieVersionSelector
PurchaseOptions
SeriesSeasons
EpisodeList
CheckoutSummary
SubscriptionPlanCard
AdminMovieTable
MediaUploadForm
```

They should not know whether data comes from:

* mock arrays;
* REST API;
* GraphQL;
* future service;
* another backend mechanism.

---

# 7. Controllers and Hooks

Controllers/hooks coordinate UI state and data operations.

Examples:

```text id="3k6d9m"
useMovies()
useMovie(slug)
useSeries(slug)
useSearch()
useLibrary()
useSubscription()
useCheckout()
useDownloads()
useAdminMovies()
useMediaTeamContent()
```

Their responsibility may include:

* loading state;
* error state;
* data retrieval;
* user interaction;
* local UI state;
* repository calls.

They should not become giant business-logic containers.

---

# 8. Repository Layer

Repositories represent the application's data-access contract.

Example:

```text id="2y7qba"
MovieRepository
 ├── getAll()
 ├── getBySlug()
 ├── getFeatured()
 ├── getTrending()
 ├── getPopular()
 └── search()
```

Future implementation:

```text id="x6w2kf"
MovieRepository
 ├── MockMovieRepository
 └── ApiMovieRepository
```

The rest of the frontend should depend on the repository contract rather than its implementation.

---

# 9. Repository Contract Principle

A repository should describe what the product needs.

Avoid exposing mock implementation details.

Bad:

```text id="4k6f9s"
getMovieArray()
```

Preferred:

```text id="2u8m3k"
getMovieBySlug(slug)
```

The first exposes implementation.

The second expresses domain intent.

---

# 10. Domain-Oriented Operations

Repository operations should be meaningful to the product.

Examples:

### Movies

```text id="v7p2ak"
getMovieBySlug()
getTrendingMovies()
getFeaturedMovies()
getPopularMovies()
getNewReleases()
searchMovies()
```

### Series

```text id="8q0l3d"
getSeriesBySlug()
getSeasons()
getEpisodes()
getEpisode()
```

### Discovery

```text id="m9s2ec"
search()
getByCategory()
getByCountry()
getByDJ()
```

### Customer

```text id="f1r5cz"
getLibrary()
getPurchases()
getDownloads()
getSubscription()
```

### Commerce

```text id="x2k8nd"
createCheckoutContext()
getOrder()
getPaymentStatus()
```

These are frontend contracts, not final backend API definitions.

---

# 11. Mock Repository Structure

Recommended:

```text id="n4z6yp"
src/
├── data/
│   └── mock/
│
├── repositories/
│   ├── movies/
│   │   ├── movie.repository.ts
│   │   └── mock-movie.repository.ts
│   │
│   ├── series/
│   ├── discovery/
│   ├── library/
│   ├── commerce/
│   ├── subscriptions/
│   ├── downloads/
│   ├── auth/
│   ├── admin/
│   └── media-team/
│
└── services/
```

Exact folder naming may be adapted to the final codebase, but the architectural boundary must remain.

---

# 12. Mock Repository vs Mock Data

These are different concepts.

### Mock Data

Contains:

* movies;
* users;
* categories;
* orders;
* payments;
* subscriptions;
* entitlements;
* downloads;
* devices.

### Mock Repository

Defines:

* how the frontend retrieves them;
* how filtering works;
* how domain operations behave;
* how deterministic mock states are returned.

Therefore:

```text id="z5n2kp"
Mock Data
     ↓
Mock Repository
     ↓
Controller / Hook
     ↓
UI
```

---

# 13. No Direct Mock Data Access in UI

Feature components should not directly import large mock datasets.

Avoid:

```tsx id="b3w8km"
import { movies } from "@/data/mock/movies";
```

inside product pages/components unless the component is explicitly a data-preview/testing utility.

Preferred:

```text id="9p6x2c"
useMovies()
 ↓
MovieRepository
 ↓
Mock Data
```

This is critical for future API replacement.

---

# 14. Typed Contracts

Every repository operation must be strongly typed.

Example conceptual contract:

```text id="w4q8nz"
getMovieBySlug(slug)
→ Promise<MovieDetailModel | null>
```

Not:

```text id="s6y1df"
getMovieBySlug(slug)
→ any
```

No `any` should be introduced to bypass type problems.

---

# 15. Domain Models vs View Models

Repositories may return domain-oriented data.

Feature components may consume view models.

Example:

```text id="9h7r3m"
Domain Model
     ↓
Mapper
     ↓
MovieDetailViewModel
     ↓
MovieDetails UI
```

This allows backend/API differences to remain isolated.

---

# 16. DTO Boundary

When a future backend is introduced, API response shapes should not automatically become application-wide types.

Preferred:

```text id="q7x3vm"
API DTO
 ↓
Mapper
 ↓
Domain Model
 ↓
View Model
 ↓
UI
```

This prevents backend implementation details from leaking throughout the frontend.

---

# 17. Future API Replacement

The intended migration should look like:

```text id="w0n9kc"
CURRENT

UI
 ↓
Repository
 ↓
Mock Repository
 ↓
Mock Data
```

Then:

```text id="c5q8lv"
FUTURE

UI
 ↓
Repository
 ↓
API Repository
 ↓
API Client
 ↓
Backend
```

The UI should remain mostly unchanged.

---

# 18. API Client Boundary

When backend work begins, introduce a dedicated API client.

Conceptually:

```text id="e2h7pq"
Repository
    ↓
API Client
    ↓
HTTP
    ↓
Backend
```

The API client should own concerns such as:

* base URL;
* request handling;
* response parsing;
* authentication transport;
* common error normalization.

Feature components should not directly perform arbitrary `fetch()` calls.

---

# 19. No Random `fetch()` Calls

Avoid:

```text id="x6j1pb"
MovieCard
 ↓
fetch(...)
```

or:

```text id="y7m4zc"
AdminPage
 ↓
fetch(...)
fetch(...)
fetch(...)
```

Data access should have an identifiable owner.

Preferred:

```text id="r8n3wf"
AdminPage
 ↓
useAdminMovies()
 ↓
AdminMovieRepository
 ↓
API Client
```

---

# 20. Authentication Repository

Authentication should also follow the boundary:

```text id="j5q8mz"
Auth UI
 ↓
Auth Controller
 ↓
Auth Repository
 ↓
Mock Auth
```

Future:

```text id="p4k7xs"
Auth UI
 ↓
Auth Controller
 ↓
Auth Repository
 ↓
API Client
 ↓
Backend Auth
```

The UI should not implement authentication protocols directly.

---

# 21. Authorization Boundary

Authorization must remain backend-authoritative.

Frontend:

```text id="a3x6kp"
Role
 ↓
UI visibility
 ↓
UX protection
```

Backend:

```text id="v7m2qz"
User
+
Role
+
Permission
+
Resource
 ↓
Authorization decision
```

The mock system may simulate authorization for development but must not establish production security.

---

# 22. Commerce Repository

Commerce should have a clean boundary.

Conceptually:

```text id="g9s4lc"
Checkout UI
 ↓
Checkout Controller
 ↓
Commerce Repository
 ↓
Mock Commerce
```

Future:

```text id="q8f2yn"
Checkout UI
 ↓
Checkout Controller
 ↓
Commerce Repository
 ↓
API Client
 ↓
Backend
 ↓
Payment Provider
```

The frontend must not directly integrate payment-provider secrets.

---

# 23. Payment Status

The mock commerce layer should support:

```text id="m7c2vk"
PENDING
SUCCESS
FAILED
CANCELLED
```

It should not automatically turn:

```text id="u5f8qn"
LIPA clicked
```

into:

```text id="p1x7zr"
Payment successful
```

unless that is explicitly the selected mock scenario.

---

# 24. Entitlement Repository

Entitlement should have its own conceptual boundary.

```text id="h6z9km"
Content
 ↓
Entitlement Repository
 ↓
Access State
```

Possible states:

```text id="f2c8qa"
ACTIVE
EXPIRED
REVOKED
PENDING
```

Future backend remains authoritative.

---

# 25. Streaming Repository Boundary

Playback UI should not directly know how media authorization is implemented.

Preferred:

```text id="t8q5cx"
Player
 ↓
Playback Controller
 ↓
Playback Repository
 ↓
Mock Playback
```

Future:

```text id="r2m7vn"
Player
  ↓
Playback Controller
  ↓
Playback Repository
  ↓
API
  ↓
Authorized Media Service
```

### 25.1 Playback mock implementation (Phase 14)

The streaming mock layer is split into two boundaries that keep the UI agnostic of the source:

* `data/mock/mock-streaming.ts` — the *media manifest*. Every published movie version / episode with a `streamAsset` is deterministically mapped (djbHash) to a real playable MP4 sample. Published content without a stream asset maps to `null`, driving `CONTENT_UNAVAILABLE` / `PLAYBACK_UNAVAILABLE`.
* `services/playback.ts` — the *access boundary*. `PlaybackRepository.getMoviePlayback / getEpisodePlayback` resolve the current customer (via the auth repository), derive access (active purchase entitlement first, then active subscription scope/access-type coverage), select the version, and seed resume progress.
* `services/mock-playback-progress.ts` — a dev-only progress store. Checkpoints are written by the player through the `savePlaybackProgress` server action (`app/actions/playback.ts`) into the httpOnly `gpm_mock_playback_progress` cookie. Only episode checkpoints merge into the Library's WatchProgress model (movie progress stays in the session store and seeds the in-player resume prompt).
* `components/features/playback/use-video-player.ts` — the media adapter boundary between the player UI and the `<video>` element. The UI drives an adapter (`play()`/`pause()`/`seekTo()`/…) and reads a throttled `PlayerSnapshot`; an HLS/DASH implementation can replace it without touching the UI (§91-§92).

Mock media samples: four 10-second, 360p MP4s are bundled at `public/mock/media/` (`bunny.mp4`, `jellyfish.mp4`, `sintel.mp4`, `flower.mp4`) sourced from test-videos.co.uk and MDN. The previously referenced `gtv-videos-bucket` (Google Cloud Storage) is no longer reachable (HTTP 403) and must not be relied on. The samples are demo placeholders only — a real backend delivers authorized media through the authorized media service.

---

# 26. Download Repository Boundary

Similarly:

```text id="k4w8ps"
Download UI
 ↓
Download Controller
 ↓
Download Repository
 ↓
Mock Download
```

Future:

```text id="v3n6qb"
Download UI
 ↓
Download Controller
 ↓
Download Repository
 ↓
API
 ↓
Authorized Download Service
```

The frontend should not know private storage implementation details.

---

# 27. Subscription Repository

Subscription UI should consume a subscription contract.

```text id="c8m2ry"
Subscription UI
 ↓
Subscription Controller
 ↓
Subscription Repository
```

It should support states such as:

```text id="x5q9nf"
NO_SUBSCRIPTION
ACTIVE
EXPIRING_SOON
EXPIRED
PENDING
```

Future backend determines the real state.

---

# 28. Library Repository

Library data should come through a customer-scoped repository.

```text id="j8v3mk"
Library
 ↓
Library Controller
 ↓
Library Repository
```

The repository should return only the current customer's relevant mock data.

---

# 29. Admin Repository Boundary

Admin data must remain separate from customer-facing repositories where appropriate.

Examples:

```text id="m4y7qp"
AdminDashboardRepository
AdminMovieRepository
AdminSeriesRepository
AdminPaymentRepository
AdminSalesRepository
AdminUserRepository
AdminMediaTeamRepository
```

Sensitive financial information must remain behind Admin-only data access.

---

# 30. Media Team Repository Boundary

Media Team repositories should focus on content operations.

Examples:

```text id="f7n2kx"
MediaTeamMovieRepository
MediaTeamSeriesRepository
MediaTeamUploadRepository
```

They MUST NOT expose:

* revenue;
* payment records;
* sales analytics;
* sensitive financial data.

---

# 31. Repository Errors

Repositories should return normalized application-level errors rather than leaking implementation details.

Conceptual categories:

```text id="b8x4mq"
NOT_FOUND
UNAUTHORIZED
FORBIDDEN
VALIDATION_ERROR
NETWORK_ERROR
PAYMENT_ERROR
ACCESS_EXPIRED
UNAVAILABLE
UNKNOWN_ERROR
```

The UI maps these to appropriate UX states.

---

# 32. Mock Latency

Mock repositories should not intentionally simulate large artificial delays.

Avoid:

```text id="n7p4sz"
setTimeout(..., 5000)
```

just to make the application appear realistic.

If asynchronous behavior is required for testing loading states, use controlled and minimal mechanisms.

The production architecture must not depend on artificial delays.

---

# 33. Deterministic Mock Behavior

Mock repositories should produce predictable results.

The same scenario should generally return the same state unless a test specifically requires mutation.

This allows reliable:

* QA;
* screenshots;
* development;
* automated tests;
* regression testing.

---

# 34. Mock Mutations

Some interactions may require mock mutations.

Examples:

* adding/removing a mock download;
* changing a selected subscription;
* simulating payment;
* updating a mock content status;
* changing a Media Team draft.

These mutations should remain clearly inside the mock repository/service layer.

Do not scatter mutable global state throughout UI components.

---

# 35. Browser Persistence

If browser persistence is used for mock behavior, it must be limited to appropriate development state.

Examples:

* recent searches;
* selected theme;
* mock session;
* temporary UI preferences.

Do not use browser persistence to pretend that production authorization is secure.

---

# 36. URL State Boundary

URL state should remain separate from repository state.

Examples:

```text id="q9m3kx"
/search?q=christian
/movies?category=action
/movies?country=nigeria
```

The controller interprets URL state and requests the appropriate repository operation.

---

# 37. Search Boundary

Search architecture:

```text id="w5k7np"
Search UI
 ↓
Search Controller
 ↓
Discovery Repository
 ↓
Mock Discovery
```

Future:

```text id="z2c8rm"
Search UI
 ↓
Search Controller
 ↓
Discovery Repository
 ↓
API
```

The search UI should not know whether ranking happens locally or remotely.

---

# 38. Filtering Boundary

Filters should be represented as structured input.

Conceptually:

```text id="g4x9vb"
{
  query,
  contentType,
  category,
  country,
  djTranslator
}
```

The controller passes this to the repository.

Do not scatter filter logic across multiple components.

---

# 39. Pagination Boundary

If the future backend uses pagination, the frontend should be capable of consuming paginated results without redesigning the entire discovery experience.

Conceptually:

```text id="v6p2qy"
{
  items,
  page,
  pageSize,
  total,
  hasNext
}
```

The exact final API contract remains a backend decision.

---

# 40. Infinite Scroll Boundary

Infinite scrolling should not be introduced simply because it is technically possible.

The frontend should support the product requirement selected later.

If used, it should remain behind the discovery controller/repository boundary.

---

# 41. Caching Boundary

Caching strategy should not leak into UI components.

The future data layer may use:

* request caching;
* route caching;
* client caching;
* revalidation;
* other appropriate mechanisms.

Components should request data rather than manually implementing ad-hoc caches.

---

# 42. Revalidation Boundary

When backend integration begins, the application may require data revalidation after:

* purchase;
* subscription activation;
* content update;
* Admin publishing;
* Media Team content update.

The repository/controller layer should own the refresh strategy.

---

# 43. Purchase → Entitlement Flow

The frontend architecture should represent:

```text id="e7x2mp"
Checkout
 ↓
Payment
 ↓
Order
 ↓
Entitlement
 ↓
Library / Watch / Download
```

But the frontend does not create authoritative entitlement records.

Future backend:

```text id="h5c9vz"
Payment verified
 ↓
Order confirmed
 ↓
Entitlement created
 ↓
Frontend refreshes state
```

---

# 44. Subscription → Access Flow

Conceptually:

```text id="n8k3qx"
Subscription
 ↓
Active Subscription
 ↓
Eligible Content
 ↓
Playback / Download
```

The frontend should retrieve authoritative access information.

---

# 45. Series Purchase Boundary

The repository architecture must support future configurable series pricing models:

```text id="r6m1tc"
PER_EPISODE
PER_SEASON
FULL_SERIES
COMBINATION
```

No model should be hard-coded as the permanent business rule.

---

# 46. DJ/Translator Boundary

Discovery and content repositories must support:

```text id="c3v7ny"
Movie
 ├── Version A / DJ A
 ├── Version B / DJ B
 └── Version C / DJ C
```

The repository must preserve version identity.

Frontend components should not flatten versions into one generic movie asset.

---

# 47. Media Asset Boundary

The UI should consume a media asset abstraction rather than storage-specific paths.

Example:

```text id="f9q2wk"
MediaAsset
 ├── type
 ├── URL/reference
 ├── metadata
 └── availability
```

Future storage implementation remains outside the UI.

---

# 48. No Storage Provider Coupling

Do not make components depend directly on:

* S3;
* Cloudinary;
* Firebase Storage;
* Supabase Storage;
* local filesystem;
* any specific future storage provider.

Those are backend/infrastructure decisions.

---

# 49. API Contract Is Not Being Finalized Yet

MD-28 does NOT define:

* final API URLs;
* HTTP methods;
* authentication headers;
* database schema;
* payment webhooks;
* storage architecture;
* exact response payloads;
* backend framework.

Those decisions belong to the backend phase.

This document defines the architectural boundary, not the final backend implementation.

---

# 50. No Backend Leakage

The frontend must not contain assumptions such as:

```text id="w6m3pa"
Prisma model names
MySQL table names
Laravel controllers
FastAPI route structures
database IDs
storage bucket names
payment webhook internals
```

unless explicitly required for the future API contract.

---

# 51. Environment Boundary

The frontend may eventually need:

```text id="q4n8yc"
NEXT_PUBLIC_API_BASE_URL
```

or an equivalent public configuration.

Private backend credentials must never be exposed through frontend configuration.

---

# 52. Error Normalization

The future API layer should translate transport-specific failures into application-level errors.

Example:

```text id="t7p2mx"
HTTP 404
 ↓
NOT_FOUND
```

```text id="r8c4vn"
HTTP 403
 ↓
FORBIDDEN
```

```text id="x3q9lb"
Network failure
 ↓
NETWORK_ERROR
```

UI should respond to application-level states rather than raw HTTP implementation details where possible.

---

# 53. Loading Boundary

Repositories should provide asynchronous behavior compatible with:

```text id="n5m8kq"
LOADING
SUCCESS
EMPTY
ERROR
```

The UI owns presentation of these states.

The repository owns data retrieval.

---

# 54. Empty Boundary

An empty dataset is valid data.

Example:

```text id="k7p3zr"
Library Repository
 ↓
[]
 ↓
Library Empty State
```

Do not throw an error merely because a collection is empty.

---

# 55. Not Found Boundary

A missing individual resource should be distinguishable.

Example:

```text id="v2n9xc"
getMovieBySlug()
 ↓
null
 ↓
Movie Not Found
```

Do not treat missing content as a generic application crash.

---

# 56. Access Denied Boundary

An unauthorized request should remain distinct from missing data.

```text id="g6q1mb"
FORBIDDEN
≠
NOT_FOUND
```

The UI should render the appropriate state.

---

# 57. Security Boundary

The repository layer does not become a security authority.

For example:

```text id="s9k4wp"
MockRepository
 ↓
returns ACCESS_GRANTED
```

is acceptable for a controlled mock scenario.

But production:

```text id="a5c8zn"
Frontend Repository
 ↓
"trust me, user owns movie"
```

is not acceptable.

Backend authorization remains authoritative.

---

# 58. Testability

Repositories should be replaceable and testable.

Example:

```text id="q7n3vx"
MovieRepository
       ↓
MockMovieRepository
       ↓
TestMovieRepository
       ↓
ApiMovieRepository
```

This allows the same UI logic to be tested against different data sources.

---

# 59. Dependency Injection Concept

Where useful, repositories may be provided through a controlled dependency mechanism.

The exact implementation may use:

* factory;
* context;
* module-level provider;
* dependency container;
* another lightweight approach.

Do not introduce a complex dependency-injection framework without a demonstrated need.

---

# 60. No Overengineering

The mock API boundary must remain lightweight.

Do not build:

* a fake production server;
* a fake database engine;
* unnecessary service workers;
* elaborate local API infrastructure;
* fake authentication infrastructure;
* unnecessary state-management frameworks.

The objective is architectural replaceability, not simulation of an entire backend.

---

# 61. Frontend-Only Phase

During the current phase:

```text id="m8q5xb"
NO DATABASE
NO BACKEND
NO REAL API
NO REAL PAYMENT
NO REAL AUTH SERVICE
NO REAL STORAGE SERVICE
```

Only the frontend experience and its boundaries are being built.

---

# 62. Future Backend Integration Sequence

When frontend work is complete:

```text id="c9v4ny"
1. Define backend domain
        ↓
2. Define database
        ↓
3. Define API contracts
        ↓
4. Define authentication
        ↓
5. Define payment integration
        ↓
6. Define storage/media delivery
        ↓
7. Define entitlement system
        ↓
8. Implement API repositories
        ↓
9. Replace mock repositories
        ↓
10. Integration testing
```

The UI should not need to be redesigned simply because the data source changes.

---

# 63. Mock-to-API Migration Rule

Migration should ideally involve:

```text id="y5q8kc"
Replace:

MockMovieRepository

with:

ApiMovieRepository
```

rather than:

```text id="x7m2pn"
Rewrite every MovieCard
Rewrite every MoviePage
Rewrite search
Rewrite library
Rewrite checkout
```

If replacing the data source requires rewriting large parts of the UI, the boundary has been violated.

---

# 64. Repository Naming

Use consistent names.

Examples:

```text id="h3q9xm"
movie.repository.ts
mock-movie.repository.ts

series.repository.ts
mock-series.repository.ts

library.repository.ts
mock-library.repository.ts

subscription.repository.ts
mock-subscription.repository.ts
```

Avoid random naming such as:

```text id="p6v2ka"
movieService2.ts
newMovieApi.ts
movieHelperFinal.ts
```

---

# 65. Service vs Repository

Repositories answer:

> “Where/how do I obtain or modify this domain data?”

Services may answer:

> “How do I coordinate a more complex application operation?”

Example:

```text id="k8r5bz"
Checkout Service
 ↓
Order Repository
Payment Repository
Entitlement Repository
```

Do not create services merely to add another abstraction layer.

---

# 66. Business Logic Boundary

Business rules should live outside presentational components.

Example:

Bad:

```text id="q4n7yc"
MovieCard
 ↓
calculate entitlement
 ↓
calculate payment
 ↓
determine subscription eligibility
```

Preferred:

```text id="t5m8vx"
Domain / Controller
 ↓
derived access state
 ↓
MovieCard
```

The UI renders the result.

---

# 67. Derived UI State

Derived values may include:

* formatted price;
* formatted duration;
* remaining access time;
* subscription badge;
* purchase state;
* download state;
* availability state.

These should be derived consistently rather than recalculated differently in multiple components.

---

# 68. Sensitive Derived State

Security-sensitive derived state must still be treated as presentation.

For example:

```text id="w2c7pn"
canDownload = true
```

does not mean the browser has authority to download the content.

It means:

> The current frontend state indicates that the user appears eligible.

Backend enforcement remains mandatory.

---

# 69. Mock API Boundary and Navigation

Navigation should consume application state rather than constructing arbitrary backend URLs.

Example:

```text id="r4n8xm"
Movie slug
 ↓
/movies/[slug]
```

not:

```text id="m6q2kp"
Movie slug
 ↓
https://future-storage-provider/... 
```

---

# 70. Mock API Boundary and SEO

Public routes remain independent of data-source implementation.

Examples:

```text id="x9k4vb"
/movies/[slug]
/series/[slug]
/categories/[slug]
/countries/[slug]
/djs/[slug]
```

Future API changes should not require changing public URLs.

---

# 71. Mock API Boundary and Caching

The frontend should not assume that mock data has the same caching behavior as production.

The architecture must leave room for:

* server rendering;
* request caching;
* revalidation;
* client cache;
* stale-while-revalidate patterns.

These can be introduced during API integration.

---

# 72. Mock API Boundary and Server Components

Where data does not require browser interaction, Server Components may consume repository functions where appropriate.

Interactive components remain Client Components.

The repository boundary should support both without forcing all data access into the browser.

---

# 73. Mock API Boundary and Client Components

Client Components should receive the minimum required data.

Avoid sending huge datasets into deeply nested interactive components.

Prefer:

```text id="c6q8mz"
Page
 ↓
Feature data
 ↓
Relevant props
 ↓
Interactive component
```

---

# 74. Mock API Boundary and Performance

Repositories should avoid unnecessary repeated work.

For example:

```text id="n3k7px"
20 MovieCards
 ↓
20 independent full dataset scans
```

should be avoided when a single controlled query can provide the necessary data.

---

# 75. Mock API Boundary and Accessibility

The data layer must expose enough semantic information for accessible UI.

Examples:

* title;
* content type;
* status;
* duration;
* availability;
* progress;
* access state.

Accessibility remains a UI responsibility, but data must not make accessible presentation impossible.

---

# 76. Mock API Boundary and Security

Repositories must not become a mechanism for leaking:

* payment details;
* financial data;
* passwords;
* secret tokens;
* private storage information;
* unrelated customer records.

Data returned by the repository should match the role and feature context.

---

# 77. Mock API Boundary and Analytics

Analytics should not be hard-wired into repositories.

Future analytics may observe events such as:

* movie viewed;
* search performed;
* purchase initiated;
* purchase completed;
* download started;
* playback completed.

Analytics should have its own abstraction.

Do not mix analytics implementation with data-access logic.

---

# 78. Mock API Boundary and Trending

Trending may eventually depend on backend-generated metrics.

Frontend should consume:

```text id="v8m2qx"
Trending content
```

rather than trying to become the production ranking engine.

The current mock repository may provide deterministic trending data.

---

# 79. Mock API Boundary and Recommendations

Recommendations should remain a data-source concern.

Frontend may display:

* related movies;
* similar content;
* popular content;
* personalized content.

It should not hard-code a fake production recommendation algorithm unless specifically required for the mock experience.

---

# 80. Mock API Boundary and Admin Publishing

Admin/Media Team publishing state may be represented through mock repositories.

Possible states:

```text id="k5q9vb"
DRAFT
PUBLISHED
ARCHIVED
```

The unresolved Media Team approval workflow must remain configurable and must not be silently finalized.

---

# 81. Mock API Boundary and Payment Providers

Exact Tanzania Mobile Money providers remain unresolved.

Therefore the frontend may use generic provider abstractions:

```text id="p7x3mz"
PaymentProvider
```

without permanently assuming:

* M-Pesa;
* Airtel Money;
* Mixx by Yas;
* HaloPesa;
* another provider.

The final provider list belongs to the business/backend phase.

---

# 82. Mock API Boundary and Device Policy

Device limits remain unresolved.

The mock layer may model device states but must not permanently hard-code a maximum device count.

Future backend determines the actual policy.

---

# 83. Mock API Boundary and Content Rights

The platform must only operate with content the business has appropriate authorization to distribute.

The frontend may represent content metadata and rights-related status where required, but legal/content-rights enforcement belongs to the business/backend process.

---

# 84. Final Architecture

The final frontend architecture should conceptually be:

```text id="z8c4np"
                    GIFTEDproMovies
                           │
                     Next.js App Router
                           │
          ┌────────────────┴────────────────┐
          │                                 │
      Public UX                       Protected UX
          │                                 │
          ├── Discovery                     ├── Customer
          ├── Movies                        ├── Admin
          ├── Series                        └── Media Team
          └── Search
          │
          ▼
      Feature Controllers / Hooks
          │
          ▼
       Repositories
          │
     ┌────┴─────┐
     │          │
   MOCK       FUTURE
   DATA        API
     │          │
     │       Backend
     │          │
     │       Database
     │          │
     │       Services
     │          │
     └────┬─────┘
          ▼
       UI Models
          ▼
       Components
```

---

# 85. Definition of Done

MD-28 is complete when:

* mock data is isolated from UI components;
* repositories define domain-oriented contracts;
* controllers/hooks coordinate data access;
* feature components do not depend on mock implementation details;
* authentication has a repository boundary;
* discovery has a repository boundary;
* library has a repository boundary;
* commerce has a repository boundary;
* subscriptions have a repository boundary;
* streaming has a repository boundary;
* downloads have a repository boundary;
* Admin has an appropriate repository boundary;
* Media Team has an appropriate repository boundary;
* sensitive financial information remains isolated;
* future API integration has a clear replacement point;
* no final backend API contract has been invented;
* no fake backend has been created;
* no fake payment integration has been created;
* no storage provider has been hard-coded;
* business rules remain configurable where unresolved;
* typed contracts are used;
* `any` is not used to bypass the architecture;
* errors/loading/empty states have clear boundaries;
* security responsibilities remain backend-authoritative;
* performance remains reasonable;
* the architecture is testable;
* the UI can transition from mock data to API data without a major rewrite.

---

# 86. AI Coding Agent Directive

Before implementing any data-driven feature, the coding agent MUST ask:

> “Does this belong in the UI, controller/hook, repository, or future backend?”

The agent MUST NOT:

* import large mock datasets directly into product components;
* scatter `fetch()` calls throughout the application;
* invent API endpoints;
* invent backend response structures;
* invent database schemas;
* invent payment webhooks;
* invent storage providers;
* create fake production APIs;
* move business rules into presentation components;
* use `any` to bypass type contracts;
* make mock authorization appear production-secure;
* expose sensitive mock data unnecessarily;
* couple UI components to future infrastructure.

If a requirement is ambiguous, stop and ask rather than inventing architecture.

---

# 87. Final Principle

The mock layer exists to accelerate frontend development.

It must never become technical debt that blocks the real backend.

The intended transition is:

```text id="y7p3qm"
Mock Today
    ↓
Same UI Contracts
    ↓
Real API Tomorrow
```

not:

```text id="m4x8nc"
Mock Today
    ↓
Rewrite Everything Tomorrow
```

The frontend should therefore be designed as a **real product consuming a temporary data source**, not as a fake application pretending to be a backend.

---

## Dependencies

This document depends on:

* `00_PROJECT_RULES.md`
* `01_TECH_STACK.md`
* `05_FRONTEND_ARCHITECTURE.md`
* `08_DATA_MODELS.md`
* `09_MOCK_DATA_CONTRACT.md`
* `11_SEARCH_DISCOVERY.md`
* `16_PURCHASE_FLOW.md`
* `17_STREAMING_UI.md`
* `18_DOWNLOAD_UI.md`
* `19_SUBSCRIPTION_UI.md`
* `20_ADMIN_UI.md`
* `21_MEDIA_TEAM_UI.md`
* `26_ERROR_EMPTY_LOADING_STATES.md`
* `27_SECURITY_FRONTEND_RULES.md`

---

## Next Document

**MD-29 — `29_QA_ACCEPTANCE.md`**

This document will define the actual quality gate: functional testing, responsive testing, accessibility testing, motion testing, performance testing, role isolation, security boundaries, customer journeys, Admin/Media Team workflows, and the conditions under which the frontend is considered **DONE**.
