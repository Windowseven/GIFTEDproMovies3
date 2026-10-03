# GIFTEDproMovies — Mock Data Contract & Frontend Data Seeding

**Document ID:** MD-09
**File:** `docs/09_MOCK_DATA_CONTRACT.md`
**Version:** 1.0
**Status:** LOCKED FOUNDATION
**Scope:** Frontend only
**Product:** GIFTEDproMovies

---

# 1. Purpose

This document defines how mock data must be structured, related, seeded, accessed, and consumed throughout the GIFTEDproMovies frontend.

The mock-data system exists to allow the frontend to be developed completely before the backend is implemented.

The mock layer must behave conceptually like a future data source:

```text
UI
 ↓
Feature
 ↓
Repository / Service
 ↓
Mock Data
```

Later:

```text
UI
 ↓
Feature
 ↓
Repository / Service
 ↓
API
```

The UI should not require architectural changes when mock data is replaced by the real API.

---

# 2. Core Rule

Mock data is not throwaway data.

It is a **frontend development contract**.

Therefore:

> Mock data must represent realistic product behavior, relationships, states, and edge cases.

Do not create unrealistic placeholder data merely to make the UI render.

---

# 3. Mock Data Must Follow MD-08

All mock data must conform to:

```text
docs/08_DATA_MODELS.md
```

The following must remain consistent:

* Movie
* MovieVersion
* Series
* Season
* Episode
* Category
* Country
* DJ/Translator
* User
* Order
* OrderItem
* Payment
* Entitlement
* SubscriptionPlan
* Subscription
* DownloadItem
* UserDevice
* Discovery models
* Metrics
* Status values

If MD-08 changes, mock data must be updated accordingly.

---

# 4. Mock Data Architecture

Implemented domain mock repository structure:

```text
src/
├── data/
│   └── mock/
│       ├── customerData.ts        # Customer catalog: movies, series, DJs, categories, countries, entitlements
│       ├── adminData.ts           # Admin domain: KPIs, orders, transactions, sales ledger, users, settings
│       └── mediaTeamData.ts       # Media team domain: content items, DJ editions, QC checklists, attention queue
├── lib/
│   └── repositories/
│       ├── adminRepository.ts     # Admin data access layer with reactive publishing gate state
│       └── mediaTeamRepository.ts # Media team data access layer with approval workflow
└── services/
    └── authRepository.ts          # Authentication state and mock session management
```

The domain data is partitioned into clean, cohesive domain files rather than one unmaintainable monolith, matching the three functional portals (Customer, Admin, Media Team).

---

# 5. Mock Data Must Be Typed

Every dataset must use the canonical TypeScript type.

Example:

```ts
const movies: Movie[] = [
  // ...
];
```

Not:

```ts
const movies = [
  // random objects
];
```

Likewise:

```ts
const categories: Category[] = [];
const countries: Country[] = [];
const djs: DJTranslator[] = [];
const users: User[] = [];
```

TypeScript must catch invalid mock relationships during development.

---

# 6. Stable Mock IDs

Mock IDs must remain stable.

Example:

```text
movie_001
movie_002
version_001
dj_001
category_001
country_001
```

Do not generate random IDs every time the application starts.

Bad:

```ts
id: crypto.randomUUID()
```

for static seeded entities.

Stable IDs make relationships predictable.

---

# 7. Slug Rules

Public-facing content must have realistic slugs.

Example:

```text
the-last-kingdom
avatar-fire-and-ash
christian-family-story
```

Slugs must be:

* lowercase
* URL-safe
* human-readable
* stable

Do not use:

```text
movie-001
```

as the only public-facing content slug unless it is intentionally part of the product.

---

# 8. Referential Integrity

Relationships between mock entities must be valid.

Example:

```text
Movie
versionIds
   ↓
MovieVersion.id
   ↓
djTranslatorId
   ↓
DJTranslator.id
```

If a movie contains:

```ts
versionIds: ["version_001"]
```

then:

```ts
version_001
```

must exist in the MovieVersion dataset.

The same rule applies to:

* categories
* countries
* seasons
* episodes
* users
* orders
* payments
* entitlements
* subscriptions.

---

# 9. Mock Data Relationship Graph

The complete mock dataset should conceptually form:

```text
                        MOVIE
                          │
              ┌───────────┼───────────┐
              ↓           ↓           ↓
          CATEGORY     COUNTRY      VERSION
                                      │
                                      ↓
                                DJ / TRANSLATOR
                                      │
                         ┌────────────┴────────────┐
                         ↓                         ↓
                    STREAM PRICE             DOWNLOAD PRICE
                         │                         │
                         └────────────┬────────────┘
                                      ↓
                                  PURCHASE
                                      ↓
                                   PAYMENT
                                      ↓
                                ENTITLEMENT
                                  ↙       ↘
                              STREAM    DOWNLOAD
```

Series:

```text
SERIES
  ↓
SEASON
  ↓
EPISODE
```

---

# 10. Minimum Mock Content

The mock dataset must be large enough to properly test the product.

The initial dataset should contain at minimum:

```text
Movies:             12+
Movie Versions:     18+
Series:              4+
Seasons:             6+
Episodes:           18+
Categories:          8+
Countries:           8+
DJs/Translators:     6+
Users:               4+
Subscription Plans:  3+
Orders:              5+
Payments:            5+
Entitlements:        5+
```

These are development targets, not final business quantities.

---

# 11. Why the Dataset Must Be Large

A single movie is insufficient for testing:

* horizontal rails
* search
* filters
* categories
* country discovery
* DJ filtering
* pagination
* responsive layouts
* recommendation logic
* trending
* featured content
* empty states
* long titles
* different price ranges.

The mock dataset must intentionally create variety.

---

# 12. Movie Variety

Movies should include different:

* titles
* descriptions
* release years
* durations
* countries
* categories
* DJs/Translators
* prices
* access durations
* featured states
* trending states.

Example conceptual dataset:

```text
Movie A
  Tanzania
  Christian
  DJ Mack
  Featured

Movie B
  Nigeria
  Action
  DJ John
  Trending

Movie C
  India
  Drama
  DJ Mack

Movie D
  USA
  Superhero
  DJ Sarah
  Featured + Trending
```

This is for testing UI behavior, not defining actual platform content.

---

# 13. Multiple DJ/Translator Versions

At least some movies must have multiple versions.

Example:

```text
Movie: Example Movie

Version 1
  DJ Mack
  Stream: TSh 3,000
  Download: TSh 5,000

Version 2
  DJ John
  Stream: TSh 3,500
  Download: TSh 5,500

Version 3
  DJ Sarah
  Stream: TSh 4,000
  Download: TSh 6,000
```

This is mandatory for testing the version-selection experience.

---

# 14. Version-Specific Pricing

Mock data must demonstrate that pricing belongs to the selected version.

Example:

```text
Movie
  ↓
DJ Mack
  Stream TSh 3,000
  Download TSh 5,000

DJ John
  Stream TSh 3,500
  Download TSh 5,500
```

The UI must update the price when the selected version changes.

It must not display one global movie price if multiple versions have different prices.

---

# 15. Access Duration Variety

Mock data must include multiple durations.

Examples:

```text
3 DAYS
7 DAYS
14 DAYS
30 DAYS
```

This proves that the frontend does not hard-code one duration.

---

# 16. Series Mock Data

Series must demonstrate the full hierarchy:

```text
Series
 ├── Season 1
 │    ├── Episode 1
 │    ├── Episode 2
 │    └── Episode 3
 │
 ├── Season 2
 │    ├── Episode 1
 │    ├── Episode 2
 │    └── Episode 3
 │
 └── Season 3
      ├── Episode 1
      └── Episode 2
```

At least one series should contain multiple seasons.

At least one season should contain several episodes.

---

# 17. Category Dataset

Categories should be realistic enough to test discovery.

Example:

```text
Action
Animation
Cartoon
Christian
Comedy
Drama
Horror
Superhero
```

The final category list remains Admin-controlled.

These are mock development values.

---

# 18. Country Dataset

Use a variety of countries.

Example:

```text
Tanzania
Nigeria
Kenya
South Africa
India
United States
United Kingdom
Ghana
```

Country data must be represented as entities rather than repeated strings everywhere.

Bad:

```ts
country: "Nigeria"
```

when the canonical model expects country relationships.

Preferred:

```ts
countryIds: ["country_ng"]
```

---

# 19. DJ / Translator Dataset

Use multiple mock DJs/Translators.

Example:

```text
DJ Mack
DJ John
DJ Sarah
DJ Mike
DJ Grace
DJ Alex
```

Each must have a stable ID and slug.

---

# 20. User Dataset

Mock users must cover the major roles.

Minimum:

```text
1 ADMIN
1 MEDIA_TEAM
2+ CUSTOMER
```

Example conceptual identities:

```text
Admin User
Media Team User
Customer One
Customer Two
```

Passwords must never be represented in the normal User domain model.

If authentication screens need demo credentials, they must be handled by a dedicated mock-auth mechanism rather than embedding passwords into user records.

---

# 21. Mock Authentication

During frontend development, authentication may be simulated.

Example:

```text
Login
 ↓
Mock Authentication Service
 ↓
Selected Mock User
 ↓
Session State
```

The frontend must be able to simulate:

```text
ADMIN
MEDIA_TEAM
CUSTOMER
```

without requiring a backend.

This is strictly a development mechanism.

It must be replaceable by real authentication later.

---

# 22. Customer State Scenarios

The mock dataset should include customers in different states.

### Customer A

```text
Active subscription
Active movie entitlement
Completed purchase
```

### Customer B

```text
No active subscription
One expired subscription
One active entitlement
One expired entitlement
```

(Individual purchases remain independent of the expired subscription — MD-08 §32.)

### Customer C

```text
No purchases
No subscription
Empty library
```

This allows the UI to test realistic account states.

---

# 23. Subscription Mock Data

Create multiple plans with different:

* names
* prices
* durations
* access scopes
* access types.

Example:

```text
Plan A
  Monthly
  TSh 15,000
  All Content

Plan B
  Premium
  TSh 30,000
  All Content
  Stream + Download

Plan C
  Movies Only
  TSh 10,000
  Movies
```

These are sample values only.

Admin-controlled pricing remains the business rule.

At least one active plan is marked `featured: true` so the recommended-plan
presentation (MD-19 §11-§12) is exercised by the mock dataset. The featured
flag is data, never a hard-coded UI choice, and implies "Recommended" only.

---

# 24. Order Mock Data

Orders must cover different states:

```text
PAID
PENDING
FAILED
CANCELLED
```

This allows checkout and admin interfaces to display meaningful states.

---

# 25. Payment Mock Data

Payments should correspond to orders.

Example:

```text
Order #001
  Payment → SUCCESS

Order #002
  Payment → PENDING

Order #003
  Payment → FAILED
```

Do not create unrelated payment records merely to populate a table.

---

# 26. Entitlement Mock Data

Entitlements should demonstrate:

```text
Active
Expired
Stream only
Download only
Stream + Download
```

Example:

```text
Customer
 ↓
Movie Version
 ↓
STREAM_AND_DOWNLOAD
 ↓
Expires in 7 days
```

and:

```text
Customer
 ↓
Movie Version
 ↓
STREAM
 ↓
Expired
```

---

# 27. Download Mock Data

Download data should include multiple states:

```text
AVAILABLE
DOWNLOADING
COMPLETED
FAILED
EXPIRED
```

This allows the Downloads page to be designed before real download infrastructure exists.

---

# 28. Trending Mock Data

Trending content should not simply be:

```ts
isTrending: true
```

for every movie.

Create meaningful variation.

Example:

```text
Movie A → Trending
Movie B → Trending
Movie C → Normal
Movie D → Trending
```

Where possible, mock metrics should explain the ranking.

Example:

```ts
{
  views: 12000,
  searches: 3400,
  purchases: 920,
  downloads: 710
}
```

The frontend consumes the result.

It does not implement the production ranking algorithm.

---

# 29. Featured Mock Data

Featured content should also have variation.

Example:

```text
Movie A → Featured
Movie B → Not Featured
Movie C → Featured
```

This allows the homepage to verify that Featured content is intentionally selected.

---

# 30. Homepage Mock Dataset

The homepage must be able to populate:

```text
Trending Movies
        ↓
Featured Movies
        ↓
New Releases
        ↓
Popular Movies
        ↓
Movies by Categories
        ↓
Movies by Country
        ↓
DJs / Translators Collection
```

The mock dataset must support all of these sections.

---

# 31. Discovery Data Must Support Filtering

The mock dataset must allow combinations such as:

```text
Category = Christian
Country = Nigeria
Type = Movie
DJ = DJ Mack
```

and:

```text
Country = India
Type = Movie
```

and:

```text
Category = Cartoon
Type = Series
```

This is important because the search experience is a core product feature.

---

# 32. Search Mock Behavior

Search must be tested against:

* movie title
* series title
* DJ/Translator
* category
* country.

Example:

```text
Search:
"Mack"
```

should be able to return relevant DJ/Translator and content results.

Search:

```text
"Christian"
```

should discover Christian content.

Search:

```text
"Nigeria"
```

should discover Nigerian content.

---

# 33. Related Content

Movie detail pages should have enough mock content to produce meaningful related-content sections.

Possible relationship logic:

```text
Same category
+
Same country
+
Same DJ
+
Similar content type
```

The frontend may use deterministic mock logic.

The final recommendation algorithm belongs to the backend phase.

---

# 34. New Releases

The mock dataset must contain different `createdAt` or release values so the UI can produce a meaningful New Releases section.

Do not make every movie have the same date.

---

# 35. Popular Content

Mock popularity should vary.

Example:

```text
Movie A → 100,000 views
Movie B → 70,000 views
Movie C → 10,000 views
```

This allows sorting and ranking interfaces to be tested.

---

# 36. Admin Mock Data

Admin pages should not rely exclusively on the same minimal public dataset.

The mock environment should contain enough information to demonstrate:

```text
Dashboard
Movies
Series
Categories
Countries
DJs
Users
Media Team
Subscriptions
Pricing
Orders
Payments
Sales
Featured
Trending
Settings
```

---

# 37. Media Team Mock Data

The Media Team environment should demonstrate content-management workflows.

Mock records should include:

```text
Draft movie
Published movie
Archived movie
Draft series
Published series
```

This allows status filters and content-management UI to be tested.

---

# 38. Empty-State Scenarios

The mock layer must support empty states intentionally.

Examples:

```text
Customer with no purchases
Customer with no downloads
Search with zero results
Category with no content
Country with no content
DJ with no assigned content
```

Do not remove these scenarios simply because they make the UI harder to build.

They are part of the product.

---

# 39. Loading-State Scenarios

The repository/service layer should allow simulated delays where useful.

Conceptually:

```ts
await delay(600);
return movies;
```

This should only exist in development/mock infrastructure.

It allows testing:

* skeleton loaders
* transitions
* loading indicators
* perceived performance.

---

# 40. Error-State Scenarios

The mock layer should support controlled failure scenarios.

Example:

```text
Mock movie request
        ↓
Simulated error
        ↓
Movie loading error UI
```

Possible errors:

```text
Content unavailable
Search failed
Checkout failed
Payment pending
Download failed
```

The error should be deterministic when a specific test scenario is selected.

---

# 41. Repository Boundary

Components must not directly import large mock arrays whenever a feature requires business/data operations.

Bad:

```ts
import { movies } from "@/data/mock/movies";
```

inside every component.

Preferred:

```text
Component
   ↓
Feature Hook
   ↓
Repository
   ↓
Mock Repository
```

Example:

```ts
interface MovieRepository {
  getMovies(): Promise<Movie[]>;
  getMovieBySlug(slug: string): Promise<Movie | null>;
  searchMovies(query: string): Promise<Movie[]>;
}
```

The mock implementation satisfies this interface.

---

# 42. Future API Replacement

The intended replacement is:

```text
Current:

MovieRepository
      ↓
MockMovieRepository
      ↓
Mock Data


Future:

MovieRepository
      ↓
ApiMovieRepository
      ↓
Backend API
```

Feature components should not need to know which implementation is active.

---

# 43. No Mock Logic in UI

Do not implement business/data rules inside JSX.

Bad:

```ts
if (movie.price > 3000 && movie.country === "Nigeria") {
  ...
}
```

inside a presentational component without a documented product reason.

Instead:

```text
Repository
 ↓
Selector / Feature Logic
 ↓
View Model
 ↓
Component
```

The component should focus on presentation and interaction.

---

# 44. Mock Data Factories

Factories may be used when generating large test datasets.

Example:

```ts
createMockMovie()
createMockUser()
createMockOrder()
```

However, factories must still produce valid canonical domain objects.

Factories must not become a reason to bypass type safety.

---

# 45. Deterministic Data

The initial mock environment should be deterministic.

The same application state should produce the same:

* IDs
* content
* prices
* relationships
* dates
* user states.

Randomized data should only be used intentionally for special testing.

---

# 46. Image Asset Rules

Mock images must follow the visual requirements from the Design System and Visual Language documents.

Each movie should ideally have:

```text
Poster
Backdrop
Optional trailer thumbnail
```

The mock system must not rely on broken external image URLs.

Prefer stable local development assets or approved image sources.

---

# 47. Video Mock Assets

The frontend may use placeholder/sample videos for:

* player development
* controls
* progress states
* fullscreen
* playback UI
* loading behavior.

The mock video must not be treated as production content.

Production media delivery belongs to the future backend/media infrastructure.

---

# 48. Data Access Examples

Public movie listing:

```text
Homepage
 ↓
MovieRepository.getMovies()
 ↓
Filter/selector
 ↓
MovieCardModel[]
 ↓
ContentRail
```

Movie detail:

```text
/movie/[slug]
 ↓
MovieRepository.getMovieBySlug()
 ↓
MovieDetailModel
 ↓
MovieDetailPage
```

Search:

```text
/search?q=...
 ↓
SearchRepository
 ↓
SearchResult[]
 ↓
Search UI
```

---

# 49. Customer Library Example

```text
/login
 ↓
Mock Customer Session
 ↓
LibraryRepository
 ↓
Entitlements
 ↓
LibraryItem[]
 ↓
Library UI
```

The UI should behave as though a real authenticated customer exists.

---

# 50. Checkout Example

```text
Movie Detail
 ↓
Select DJ Version
 ↓
Select STREAM / DOWNLOAD
 ↓
Create Mock Order
 ↓
Mock Payment
 ↓
Payment Result
 ↓
Mock Entitlement
 ↓
Success Page
```

This allows the complete customer journey to be implemented before backend integration.

---

# 51. Mock Checkout States

The frontend must support:

```text
Checkout
 ↓
Pending
 ↓
Success
```

and:

```text
Checkout
 ↓
Pending
 ↓
Failed
```

The UI must not assume every payment succeeds.

---

# 52. Mock Admin Analytics

Admin dashboard metrics may use:

```ts
interface AdminDashboardMetrics {
  totalMovies: number;
  totalSeries: number;
  totalUsers: number;
  totalSales: number;
  totalViews: number;
  totalDownloads: number;
  activeSubscriptions: number;
  pendingPayments: number;
  failedPayments: number;
}
```

These values are mock values until the backend exists.

Media Team must not receive this financial dataset.

---

# 53. No Fake Backend Endpoints

Do not create:

```text
/api/movies
/api/payments
/api/users
```

as fake Next.js backend endpoints merely to simulate the API.

The current project is frontend-only.

Use repository/service abstractions instead.

---

# 54. No Database Simulation

Do not introduce:

* SQLite
* Prisma
* MySQL
* PostgreSQL
* MongoDB
* IndexedDB as a fake production database

unless a later document explicitly authorizes it.

The mock data is sufficient for the current frontend phase.

---

# 55. Local State vs Mock Repository

Use local component state for:

```text
Modal open/close
Selected DJ
Selected purchase type
Filter UI state
Player controls
Form fields
```

Use repository/mock data for:

```text
Movies
Series
Users
Orders
Payments
Entitlements
Subscriptions
```

Do not store the entire mock database inside React component state.

---

# 56. URL State

Search/filter state that should survive navigation or browser refresh should be represented through URL parameters.

Example:

```text
/search?q=avatar&type=movie&country=nigeria
```

Mock repositories must be able to consume these parameters.

---

# 57. Mock Data Reset

Development should be able to return to a known initial state.

Conceptually:

```text
Reset Mock Data
        ↓
Initial deterministic dataset
```

The mechanism may be implemented later if required by the testing workflow.

---

# 58. Data Isolation

Feature code should not mutate shared mock records directly.

Bad:

```ts
movie.isFeatured = true;
```

inside a component.

Instead, future mutation behavior should go through a repository/service boundary.

For frontend-only development, mutations may be simulated in memory.

---

# 59. Mock Mutation Behavior

Admin UI should be able to demonstrate actions such as:

```text
Create
Edit
Archive
Publish
Feature
Unfeature
```

without requiring a backend.

However, these changes are development-only state changes.

They must not be mistaken for persistent production behavior.

---

# 60. Mock Data and Permissions

Mock authorization must be testable.

Example:

```text
ADMIN
 → Can access Admin UI

MEDIA_TEAM
 → Can access Media Team UI

CUSTOMER
 → Cannot access Admin UI
 → Cannot access Media Team UI
```

The mock session should expose the selected user's role.

---

# 61. Sensitive Mock Data

Even mock financial data should follow production visibility rules.

Do not display payment/revenue information in Media Team mock screens merely because the data exists in the local project.

Role-based visibility must be tested during frontend development.

---

# 62. Business Rules Must Remain Consistent

The mock environment must demonstrate:

### Individual Purchase

```text
Purchase
 ↓
Entitlement
 ↓
Configured expiry
```

### Subscription

```text
Subscription
 ↓
Subscription access
```

### Expired Subscription

```text
Subscription expired
+
Individual entitlement still active
```

The second access path must remain valid.

---

# 63. Device Mock Scenarios

Where device management is implemented, mock data should demonstrate:

```text
Phone
Laptop
```

for one customer.

The exact maximum number of devices remains unresolved.

Therefore the mock system must not hard-code a production limit.

---

# 64. Mock Data Naming

Use clear names:

```text
mockMovies
mockSeries
mockUsers
mockOrders
```

Avoid vague names:

```text
data
stuff
items
things
temp
```

Domain-specific naming improves maintainability.

---

# 65. Export Strategy

A central mock index may expose datasets:

```ts
export {
  mockMovies,
  mockMovieVersions,
  mockSeries,
  mockSeasons,
  mockEpisodes,
  mockCategories,
  mockCountries,
  mockDjsTranslators,
  mockUsers,
  mockOrders,
  mockPayments,
  mockEntitlements,
  mockSubscriptions,
};
```

Feature repositories should preferably consume these through the repository layer rather than importing everything directly.

---

# 66. Mock Data Quality Checklist

Before adding a dataset, verify:

```text
[ ] Correct TypeScript type
[ ] Stable ID
[ ] Valid slug where required
[ ] Valid relationships
[ ] Realistic values
[ ] Valid status
[ ] Valid timestamps
[ ] Correct pricing structure
[ ] Correct access duration
[ ] Correct role visibility
[ ] Supports required UI states
```

---

# 67. AI Coding Agent Rules

OpenCode must:

1. Read MD-08 before creating mock data.
2. Use canonical types.
3. Preserve stable IDs.
4. Preserve referential integrity.
5. Never invent business relationships.
6. Never create backend endpoints.
7. Never create database schemas.
8. Never hard-code production business rules into mock data.
9. Include realistic success, failure, empty, loading, and expired states.
10. Keep mock infrastructure replaceable.

If a UI requires data that does not exist in MD-08:

```text
STOP.
REPORT THE MISSING MODEL OR FIELD.
DO NOT INVENT IT.
```

---

# 68. Definition of Done

MD-09 is considered implemented when:

* Mock data has a clear folder structure.
* All mock entities use canonical types.
* Relationships are valid.
* Movies have multiple versions.
* Versions can have different DJs and prices.
* Streaming and downloading are distinct.
* Access durations vary.
* Series contain seasons and episodes.
* Search/filter scenarios are supported.
* Homepage sections can be populated.
* Customer states can be simulated.
* Admin states can be simulated.
* Media Team states can be simulated.
* Payment success/failure/pending states exist.
* Entitlement states exist.
* Download states exist.
* Empty/loading/error states can be tested.
* Data access happens through a replaceable repository boundary.
* No backend implementation exists.
* No database implementation exists.

---

# 69. Final Mock Architecture

The intended frontend architecture is:

```text
                    ┌──────────────────┐
                    │       UI         │
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │     Feature      │
                    └────────┬─────────┘
                             ↓
                    ┌──────────────────┐
                    │ Repository Layer │
                    └────────┬─────────┘
                             ↓
                  ┌──────────────────────┐
                  │   Mock Data Source   │
                  └──────────────────────┘


                     FUTURE REPLACEMENT

                  ┌──────────────────────┐
                  │    API Repository    │
                  └──────────┬───────────┘
                             ↓
                       Future Backend
```

The critical architectural principle is:

> **Replace the data source, not the product UI.**

---

# 70. Next Document

The next document is:

```text
MD-10
10_PUBLIC_EXPERIENCE.md
```

This document will define the complete public/customer-facing experience before authentication is required:

```text
Homepage
Search
Browse
Filters
Movie Details
Series Details
Categories
Countries
DJs/Translators
Subscriptions
Guest → Customer conversion
```

It will define exactly what a visitor can see, what they can do, and where authentication/payment enters the experience.
