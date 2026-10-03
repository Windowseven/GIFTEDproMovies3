# GIFTEDproMovies — Data Models & Frontend Domain Types

**Document ID:** MD-08
**File:** `docs/08_DATA_MODELS.md`
**Version:** 1.0
**Status:** LOCKED FOUNDATION
**Scope:** Frontend only
**Product:** GIFTEDproMovies

---

## 1. Purpose

This document defines the canonical frontend data models, domain entities, enums, relationships, and TypeScript type expectations for GIFTEDproMovies.

The purpose is to ensure that:

* UI components use consistent data structures.
* Mock data follows one contract.
* Future API responses can map into the same domain model.
* Business concepts are represented explicitly.
* OpenCode does not invent fields or relationships.
* Movie, series, version, pricing, purchase, subscription, and access concepts remain distinct.

This document does **not** define:

* Database tables.
* SQL schemas.
* Prisma schemas.
* Backend models.
* API implementation.
* Payment integration.
* Authentication implementation.
* File storage implementation.

Those belong to the future backend phase.

---

# 2. Core Data Modeling Principle

The frontend must model the **business domain**, not the future database structure.

The architecture is:

```text
Backend / Future API
        ↓
API Response / DTO
        ↓
Mapping / Repository Layer
        ↓
Frontend Domain Models
        ↓
Features
        ↓
Components
        ↓
UI
```

The UI must not depend directly on database-shaped objects.

---

# 3. Domain Entity Map

The primary domain is:

```text
                        GIFTEDproMovies
                              │
             ┌────────────────┴────────────────┐
             │                                 │
          MOVIES                            SERIES
             │                                 │
      ┌──────┴──────┐                    ┌─────┴─────┐
      │             │                    │           │
   Version       Metadata             Seasons     Metadata
      │                              │
      │                              └── Episodes
      │
      ├── DJ/Translator
      ├── Pricing
      └── Media Asset

Customer
   │
   ├── Purchase
   │      └── Entitlement
   │
   ├── Subscription
   │      └── Entitlement
   │
   └── Device / Session

Commerce
   │
   ├── Order
   └── Payment

Discovery
   │
   ├── Category
   ├── Country
   ├── Featured
   ├── Trending
   └── Engagement
```

---

# 4. Global Identifier Rules

Every domain entity must have a stable unique identifier.

Frontend identifiers should be represented as strings:

```ts
type ID = string;
```

Example:

```ts
id: "movie_001"
```

The frontend must never assume that an ID is numeric.

IDs and public slugs are different concepts.

```ts
interface Identifiable {
  id: ID;
}

interface Sluggable {
  slug: string;
}
```

Example:

```ts
{
  id: "movie_001",
  slug: "the-last-kingdom"
}
```

The public URL uses the slug.

The internal/admin interface may use the ID.

---

# 5. Timestamp Rules

Dates must use ISO-compatible strings at the domain boundary:

```ts
type ISODateString = string;
```

Example:

```ts
createdAt: "2026-09-07T12:30:00Z"
```

The frontend may convert these values into `Date` objects for presentation or calculations, but domain data should remain serializable.

Required timestamp conventions:

```ts
createdAt: ISODateString;
updatedAt: ISODateString;
```

Optional timestamps should explicitly allow `null` when the concept exists but currently has no value.

---

# 6. User Roles

The canonical role enum is:

```ts
type UserRole =
  | "ADMIN"
  | "MEDIA_TEAM"
  | "CUSTOMER";
```

There is exactly one conceptual Admin account.

The frontend must not introduce additional business roles unless requirements are explicitly updated.

---

# 7. User Model

The customer authentication identity is based on email and password.

The frontend user model:

```ts
interface User {
  id: ID;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string | null;
  isActive: boolean;
  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

The frontend must never store or expose a user's plaintext password.

Password fields may exist only inside authentication form state when required.

They must not be part of:

* Movie models.
* User profile display models.
* Mock user records.
* Public API-facing user objects.

---

# 8. Media Content Types

The platform supports:

```ts
type ContentType =
  | "MOVIE"
  | "SERIES"
  | "EPISODE";
```

The distinction is important because a series is not a movie and an episode is not a standalone movie entity.

---

# 9. Content Publication Status

Content can have a lifecycle state:

```ts
type ContentStatus =
  | "DRAFT"
  | "PUBLISHED"
  | "ARCHIVED";
```

Meaning:

### DRAFT

Content exists but is not publicly available.

### PUBLISHED

Content is available according to its access rules.

### ARCHIVED

Content is no longer actively promoted or publicly discoverable.

The frontend must not automatically interpret `DRAFT` as publicly visible.

---

# 10. Category Model

```ts
interface Category {
  id: ID;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  isActive: boolean;
}
```

Examples:

```text
Cartoon
Superhero
Christian
Horror
Action
Drama
Comedy
```

The actual category list is controlled by Admin.

The frontend must not hard-code the final business category list.

---

# 11. Country Model

```ts
interface Country {
  id: ID;
  name: string;
  code?: string | null;
  slug: string;
  flagUrl?: string | null;
  isActive: boolean;
}
```

A movie may belong to one or multiple countries.

Therefore:

```ts
countryIds: ID[];
```

must be supported.

---

# 12. DJ / Translator Model

A DJ/Translator is a content identity associated with a specific version of media.

```ts
interface DJTranslator {
  id: ID;
  name: string;
  slug: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isActive: boolean;
}
```

The platform must treat DJs/Translators as searchable and filterable entities.

---

# 13. Media Asset Model

Images and media files should be represented separately from content metadata.

```ts
interface MediaAsset {
  id: ID;
  url: string;
  type: MediaAssetType;
  alt?: string | null;
  width?: number | null;
  height?: number | null;
}
```

Type:

```ts
type MediaAssetType =
  | "POSTER"
  | "BACKDROP"
  | "THUMBNAIL"
  | "TRAILER"
  | "VIDEO"
  | "AUDIO"
  | "OTHER";
```

The frontend should not assume that one URL represents every possible media representation.

---

# 14. Pricing Model

Streaming and downloading are separate commercial actions.

```ts
interface Price {
  amount: number;
  currency: "TZS";
}
```

Example:

```ts
{
  amount: 3000,
  currency: "TZS"
}
```

The UI must format prices for Tanzanian users.

Example presentation:

```text
TSh 3,000
```

The frontend must not assume that streaming and downloading have the same price.

---

# 15. Access Duration

Access duration is configurable by Admin.

It must never be hard-coded as a permanent business rule.

```ts
interface AccessDuration {
  value: number;
  unit: "HOURS" | "DAYS";
}
```

Examples:

```ts
{
  value: 3,
  unit: "DAYS"
}
```

or:

```ts
{
  value: 30,
  unit: "DAYS"
}
```

The frontend must display the configured duration.

It must not assume:

```text
7 days
```

or:

```text
30 days
```

unless that value is actually provided by the data.

---

# 16. Movie Version Model

A movie can have multiple DJ/Translator versions.

This is one of the most important domain concepts.

```ts
interface MovieVersion {
  id: ID;
  movieId: ID;
  djTranslatorId: ID;
  versionName?: string | null;

  streamPrice: Price;
  downloadPrice: Price;

  accessDuration: AccessDuration;

  streamAsset?: MediaAsset | null;
  downloadAsset?: MediaAsset | null;

  status: ContentStatus;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

Example conceptual relationship:

```text
Movie
 ├── DJ Mack Version
 │      ├── Stream Price
 │      ├── Download Price
 │      └── Access Duration
 │
 └── DJ John Version
        ├── Stream Price
        ├── Download Price
        └── Access Duration
```

A customer purchasing one version must not automatically receive another version.

---

# 17. Movie Model

```ts
interface Movie {
  id: ID;
  slug: string;

  title: string;
  description: string;

  contentType: "MOVIE";

  poster: MediaAsset;
  backdrop?: MediaAsset | null;
  trailer?: MediaAsset | null;

  releaseYear?: number | null;
  durationMinutes?: number | null;

  categoryIds: ID[];
  countryIds: ID[];

  versionIds: ID[];

  status: ContentStatus;

  isFeatured: boolean;
  isTrending: boolean;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

Important:

Movie-level metadata and version-level commercial data are separate.

For example:

```text
Movie
  title
  description
  country
  category
  poster

MovieVersion
  DJ
  streaming price
  download price
  access duration
  media file
```

This separation is mandatory.

---

# 18. Series Model

```ts
interface Series {
  id: ID;
  slug: string;

  title: string;
  description: string;

  contentType: "SERIES";

  poster: MediaAsset;
  backdrop?: MediaAsset | null;
  trailer?: MediaAsset | null;

  releaseYear?: number | null;

  categoryIds: ID[];
  countryIds: ID[];

  seasonIds: ID[];

  status: ContentStatus;

  isFeatured: boolean;
  isTrending: boolean;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

A Series does not directly contain every episode in its root model.

The relationship is:

```text
Series
  ↓
Season
  ↓
Episode
```

---

# 19. Season Model

```ts
interface Season {
  id: ID;
  seriesId: ID;

  seasonNumber: number;
  title?: string | null;

  poster?: MediaAsset | null;

  episodeIds: ID[];

  status: ContentStatus;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

---

# 20. Episode Model

```ts
interface Episode {
  id: ID;
  seriesId: ID;
  seasonId: ID;

  episodeNumber: number;
  title: string;
  description: string;

  thumbnail?: MediaAsset | null;

  durationMinutes?: number | null;

  status: ContentStatus;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

Episode-level pricing is intentionally not permanently defined here.

---

# 21. Series Pricing Model

The business requirement states that Admin controls series pricing.

Possible models may include:

```ts
type SeriesPricingModel =
  | "PER_EPISODE"
  | "PER_SEASON"
  | "FULL_SERIES"
  | "COMBINATION";
```

However, this is currently a **pending business decision**.

Therefore the frontend must not assume which model is active.

Until the owner confirms the final rule, this type should be treated as provisional.

---

# 22. Purchase Type

```ts
type PurchaseType =
  | "STREAM"
  | "DOWNLOAD";
```

This distinction is mandatory.

A customer can purchase streaming access without purchasing download access.

---

# 23. Order Model

An order represents the customer's commercial action.

```ts
interface Order {
  id: ID;
  userId: ID;

  items: OrderItem[];

  subtotal: Price;
  total: Price;

  status: OrderStatus;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

Order status:

```ts
type OrderStatus =
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";
```

---

# 24. Order Item

```ts
interface OrderItem {
  id: ID;

  contentType: ContentType;

  movieId?: ID | null;
  seriesId?: ID | null;
  seasonId?: ID | null;
  episodeId?: ID | null;

  movieVersionId?: ID | null;

  purchaseType: PurchaseType;

  price: Price;

  accessDuration?: AccessDuration | null;
}
```

Only the fields relevant to the selected content should be populated.

The frontend must not invent unrelated IDs.

---

# 25. Payment Model

```ts
interface Payment {
  id: ID;
  orderId: ID;
  userId: ID;

  amount: Price;

  provider: PaymentProvider;
  status: PaymentStatus;

  reference?: string | null;

  createdAt: ISODateString;
  completedAt?: ISODateString | null;
}
```

Payment providers are currently not finalized.

Provisional type:

```ts
type PaymentProvider =
  | "MPESA"
  | "AIRTEL_MONEY"
  | "YAS"
  | "HALOPESA"
  | "OTHER";
```

(Yas is the rebranded Tigo — Tigo Pesa is now "Mixx by Yas".)

The actual supported providers must come from Admin/system configuration once finalized.

---

# 26. Payment Status

```ts
type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED"
  | "CANCELLED";
```

The UI must clearly distinguish:

```text
Pending
Successful
Failed
Cancelled
```

---

# 27. Entitlement Model

An entitlement represents what a customer is currently allowed to access.

This is different from a purchase.

A purchase answers:

> What did the customer buy?

An entitlement answers:

> What can the customer access right now?

```ts
interface Entitlement {
  id: ID;
  userId: ID;

  contentType: ContentType;

  movieId?: ID | null;
  movieVersionId?: ID | null;

  seriesId?: ID | null;
  seasonId?: ID | null;
  episodeId?: ID | null;

  accessType: AccessType;

  startsAt: ISODateString;
  expiresAt?: ISODateString | null;

  isActive: boolean;
}
```

Access type:

```ts
type AccessType =
  | "STREAM"
  | "DOWNLOAD"
  | "STREAM_AND_DOWNLOAD";
```

---

# 28. Purchase vs Entitlement

These concepts must never be merged.

```text
Purchase
    ↓
Commercial transaction

Entitlement
    ↓
Access permission
```

Example:

```text
Customer buys Movie X
        ↓
Payment succeeds
        ↓
Entitlement created
        ↓
Customer can stream Movie X
        ↓
Entitlement expires
```

The purchase record remains historical.

The entitlement represents current access.

---

# 29. Subscription Plan

A subscription plan is configured by Admin.

```ts
interface SubscriptionPlan {
  id: ID;

  name: string;
  description?: string | null;

  price: Price;

  duration: AccessDuration;

  accessType: AccessType;

  scope: SubscriptionScope;

  isActive: boolean;

  /**
   * MD-19 §11-§12 — featured plan presentation is data-driven and must never
   * imply popularity. `true` maps to a "Recommended" treatment only.
   */
  featured?: boolean;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

---

# 30. Subscription Scope

```ts
type SubscriptionScope =
  | "ALL_CONTENT"
  | "MOVIES"
  | "SERIES"
  | "SELECTED_CONTENT";
```

If selected content is supported:

```ts
interface SubscriptionScopeSelection {
  movieIds?: ID[];
  seriesIds?: ID[];
  categoryIds?: ID[];
}
```

The final business rules determine which scope options are enabled.

---

# 31. Customer Subscription

```ts
interface Subscription {
  id: ID;

  userId: ID;
  planId: ID;

  status: SubscriptionStatus;

  startsAt: ISODateString;
  expiresAt: ISODateString;

  autoRenew?: boolean;

  createdAt: ISODateString;
  updatedAt: ISODateString;
}
```

Status:

```ts
type SubscriptionStatus =
  | "ACTIVE"
  | "EXPIRED"
  | "CANCELLED"
  | "PENDING";
```

---

# 32. Subscription Independence Rule

Individual purchases and subscriptions are independent.

Example:

```text
Movie purchased individually
        ↓
Access expires: 30 Sept

Subscription
        ↓
Expires: 15 Sept
```

After 15 Sept:

```text
Subscription access → expired
Individual movie entitlement → still active
```

The frontend must not remove an individually purchased entitlement merely because a subscription expired.

---

# 33. Download Access Model

Download access must be treated as an entitlement-controlled capability.

The frontend should represent download state explicitly.

```ts
type DownloadStatus =
  | "AVAILABLE"
  | "STARTING"
  | "DOWNLOADING"
  | "COMPLETED"
  | "PAUSED"
  | "FAILED"
  | "EXPIRED";
```

Optional UI model:

```ts
interface DownloadItem {
  id: ID;

  userId: ID;

  contentType: ContentType;

  contentId: ID;

  movieVersionId?: ID | null;

  status: DownloadStatus;

  progress?: number;

  expiresAt?: ISODateString | null;
}
```

The frontend must not expose unrestricted media URLs merely because a customer owns download access.

Actual download security is a backend concern.

---

# 34. Device Model

The product may use controlled device access to reduce account sharing and protect downloads.

```ts
interface UserDevice {
  id: ID;

  userId: ID;

  name: string;
  type: DeviceType;

  lastActiveAt?: ISODateString | null;

  isActive: boolean;
}
```

Device type:

```ts
type DeviceType =
  | "MOBILE"
  | "TABLET"
  | "DESKTOP"
  | "TV"
  | "OTHER";
```

The maximum number of active devices is currently **not finalized**.

Therefore:

> The frontend must not hard-code a maximum device count.

---

# 35. Featured Content

Featured status is represented directly on content:

```ts
isFeatured: boolean;
```

The Admin UI may later expose ordering/priority.

If ordering is required:

```ts
featuredOrder?: number | null;
```

Do not add this field unless the feature requires it.

---

# 36. Trending Content

Trending is not simply another permanent category.

A content item can be trending based on engagement.

Frontend representation:

```ts
interface TrendingMetadata {
  score?: number;
  rank?: number;
  reason?: TrendingReason;
}
```

Possible reasons:

```ts
type TrendingReason =
  | "VIEWS"
  | "SEARCHES"
  | "PURCHASES"
  | "DOWNLOADS"
  | "RECENT_ACTIVITY"
  | "MANUAL";
```

The actual ranking algorithm belongs to the future backend.

The frontend only consumes the resulting ranking.

---

# 37. Engagement Metrics

Admin dashboards may display aggregate engagement data.

```ts
interface ContentMetrics {
  views: number;
  searches: number;
  purchases: number;
  downloads: number;
}
```

These metrics are informational.

The frontend must not implement the business algorithm that determines trending status.

---

# 38. Content Discovery Relationship

A movie may reference:

```text
Movie
 ├── Categories
 ├── Countries
 ├── Versions
 │     └── DJ/Translator
 ├── Featured status
 ├── Trending status
 └── Metrics
```

This supports searches such as:

```text
DJ Mack
+
Nigeria
+
Movie
```

or:

```text
Christian
+
Series
```

---

# 39. Search Result Model

Search results should not require every full domain object.

A lightweight search result can be:

```ts
interface SearchResult {
  id: ID;
  type: ContentType | "DJ" | "CATEGORY" | "COUNTRY";

  title: string;
  slug: string;

  imageUrl?: string | null;

  subtitle?: string | null;
}
```

The frontend can then navigate to the appropriate detail page.

---

# 40. Movie Card View Model

UI components should not necessarily receive the complete Movie entity.

A dedicated view model is allowed:

```ts
interface MovieCardModel {
  id: ID;
  slug: string;

  title: string;

  posterUrl: string;

  releaseYear?: number | null;
  durationMinutes?: number | null;

  categoryNames?: string[];
  countryNames?: string[];

  djTranslatorNames?: string[];

  isTrending: boolean;
  isFeatured: boolean;

  streamPrice?: Price | null;
  downloadPrice?: Price | null;
}
```

This allows the UI to receive exactly what it needs.

---

# 41. Movie Detail View Model

```ts
interface MovieDetailModel {
  movie: Movie;

  categories: Category[];
  countries: Country[];

  versions: MovieVersion[];

  djsTranslators: DJTranslator[];

  relatedMovies: Movie[];
}
```

The detail page can therefore resolve:

```text
Movie
 ↓
Versions
 ↓
DJ/Translator
 ↓
Prices
 ↓
Access Duration
 ↓
Watch / Download
```

---

# 42. Series Detail View Model

```ts
interface SeriesDetailModel {
  series: Series;

  categories: Category[];
  countries: Country[];

  seasons: Season[];
  episodes: Episode[];

  relatedSeries?: Series[];
}
```

---

# 43. Customer Library Model

The customer's library is access-oriented.

```ts
interface LibraryItem {
  id: ID;

  contentType: ContentType;

  contentId: ID;

  title: string;

  posterUrl: string;

  accessType: AccessType;

  startsAt: ISODateString;
  expiresAt?: ISODateString | null;

  isActive: boolean;
}
```

The library must not be confused with raw purchase history.

---

# 44. Role-Based Data Visibility

The frontend must respect role boundaries.

### ADMIN

May receive/display:

```text
Users
Sales
Orders
Payments
Revenue
Subscriptions
Content
Media Team
Analytics
System settings
```

### MEDIA TEAM

May receive/display:

```text
Movies
Series
Seasons
Episodes
Posters
Descriptions
Categories
Countries
DJs/Translators
Content status
```

Must not expose:

```text
Revenue
Payment details
Sales totals
Financial analytics
Sensitive payment information
```

### CUSTOMER

May receive/display:

```text
Public content
Own library
Own purchases
Own subscription
Own downloads
Own account
```

---

# 45. Nullability Rules

Use `null` when a known field has no current value.

Example:

```ts
trailer: null
```

Use optional properties when the field is not guaranteed to exist in a particular view model.

Example:

```ts
trailer?: MediaAsset | null;
```

Do not randomly mix:

```ts
undefined
null
""
```

for the same semantic condition.

---

# 46. Derived Data Rules

Derived values should not be duplicated unnecessarily.

For example, if:

```ts
movie.versionIds
```

already identifies versions, do not add:

```ts
versionCount
```

unless the UI/API specifically needs a precomputed value.

Likewise, do not duplicate:

```ts
djTranslatorName
```

inside Movie when the relationship belongs to MovieVersion.

The frontend should derive relationships through the appropriate model.

---

# 47. Relationship Rules

Canonical relationships:

```text
Movie
 ├── Category[]
 ├── Country[]
 └── MovieVersion[]
          └── DJTranslator
```

```text
Series
 └── Season[]
       └── Episode[]
```

```text
User
 ├── Order[]
 ├── Purchase[]
 ├── Entitlement[]
 ├── Subscription[]
 └── Device[]
```

```text
Order
 ├── OrderItem[]
 └── Payment
```

---

# 48. Public vs Internal Data

Public-facing data should contain only what the public experience needs.

Internal/admin data may contain additional management fields.

For example:

```ts
Movie
```

is the canonical domain model.

A public movie page may receive:

```ts
PublicMovie
```

while an admin edit form may receive:

```ts
AdminMovie
```

These are allowed as presentation-specific models when necessary.

Do not force one giant object into every screen.

---

# 49. Frontend DTO Mapping

Future API responses must be mapped into domain models.

Conceptually:

```text
API Response
     ↓
Mapper
     ↓
Domain Model
     ↓
Feature
```

Example:

```ts
function mapMovieResponse(response: unknown): Movie {
  // implementation belongs to the future API integration phase
}
```

No backend implementation is required now.

---

# 50. Mock Data Requirements

Mock data must follow the exact domain types.

Example:

```ts
const movie: Movie = {
  id: "movie_001",
  slug: "sample-movie",
  title: "Sample Movie",
  description: "A sample movie description.",
  contentType: "MOVIE",
  poster: {
    id: "asset_001",
    url: "/images/sample-poster.jpg",
    type: "POSTER",
  },
  backdrop: null,
  trailer: null,
  releaseYear: 2026,
  durationMinutes: 120,
  categoryIds: ["category_action"],
  countryIds: ["country_tanzania"],
  versionIds: ["version_001"],
  status: "PUBLISHED",
  isFeatured: true,
  isTrending: true,
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-07T10:00:00Z",
};
```

Mock data must not invent alternative shapes for convenience.

---

# 51. Example Movie Version

```ts
const movieVersion: MovieVersion = {
  id: "version_001",
  movieId: "movie_001",
  djTranslatorId: "dj_mack",
  versionName: "DJ Mack Version",
  streamPrice: {
    amount: 3000,
    currency: "TZS",
  },
  downloadPrice: {
    amount: 5000,
    currency: "TZS",
  },
  accessDuration: {
    value: 7,
    unit: "DAYS",
  },
  streamAsset: {
    id: "video_001",
    url: "/mock/video/sample-stream.mp4",
    type: "VIDEO",
  },
  downloadAsset: null,
  status: "PUBLISHED",
  createdAt: "2026-09-01T10:00:00Z",
  updatedAt: "2026-09-07T10:00:00Z",
};
```

---

# 52. Type Safety Rules

TypeScript must operate in strict mode.

The frontend must avoid:

```ts
any
```

unless there is a documented and unavoidable reason.

Prefer:

```ts
unknown
```

at untrusted boundaries and validate/map the data.

Avoid:

```ts
as Movie
```

as a substitute for validation.

Type assertions must not be used to hide incorrect data.

---

# 53. Enum Strategy

String unions are preferred for frontend domain states:

```ts
type PaymentStatus =
  | "PENDING"
  | "SUCCESS"
  | "FAILED";
```

This keeps mock data serializable and easy to consume.

Do not introduce TypeScript `enum` declarations unless there is a clear project-wide reason.

---

# 54. Money Rules

All commercial values must explicitly include currency.

Do not pass raw values such as:

```ts
price: 3000
```

when the meaning could be ambiguous.

Prefer:

```ts
price: {
  amount: 3000,
  currency: "TZS"
}
```

The frontend must not silently convert TZS into another currency.

---

# 55. Access Calculation

Access expiry must be based on the entitlement data.

The frontend may calculate:

```text
remaining time
expired/not expired
```

from:

```ts
startsAt
expiresAt
```

But the backend remains the authoritative source for actual access permission.

The frontend must never grant access solely because a local timer says access is still valid.

---

# 56. Security Boundary

The frontend is not a security authority.

The following must always be enforced by the future backend:

```text
Payment success
Purchase ownership
Entitlement
Download authorization
Stream authorization
Subscription validity
Role authorization
Admin permissions
Media Team permissions
Device restrictions
```

Frontend checks exist for UX.

Backend checks will be authoritative.

---

# 57. Pending Business Decisions

The following remain intentionally unresolved:

### 57.1 Media Team publishing approval

Still to confirm:

```text
Media Team uploads
        ↓
Direct publish
```

or:

```text
Media Team uploads
        ↓
Admin review
        ↓
Publish
```

The frontend must not permanently assume either workflow until confirmed.

---

### 57.2 Series pricing

Still to confirm:

```text
Per Episode
Per Season
Full Series
Combination
```

---

### 57.3 Payment providers

Tanzania Mobile Money is required.

Exact providers remain to be confirmed.

---

### 57.4 Maximum active devices

Controlled device access is recommended.

The actual maximum number of devices remains to be confirmed.

---

# 58. Data Modeling Anti-Patterns

OpenCode must NOT:

* Put DJ information directly into Movie when it belongs to MovieVersion.
* Treat Series as a Movie.
* Treat Episode as a Movie.
* Merge Purchase and Entitlement.
* Assume purchase means permanent access.
* Assume subscriptions replace individual purchases.
* Assume streaming and downloading share the same price.
* Hard-code access duration.
* Hard-code subscription pricing.
* Hard-code final categories.
* Hard-code final payment providers.
* Store passwords in normal user models.
* Expose financial data to Media Team.
* Treat frontend state as authoritative authorization.
* Create database models in the frontend.
* Introduce Prisma.
* Introduce SQL schemas.
* Introduce backend repositories.
* Invent API fields to make components easier.

---

# 59. Recommended Type Organization

Types should be grouped by domain.

Recommended structure:

```text
src/
└── types/
    ├── common.ts
    ├── user.ts
    ├── movie.ts
    ├── series.ts
    ├── category.ts
    ├── country.ts
    ├── dj-translator.ts
    ├── commerce.ts
    ├── payment.ts
    ├── subscription.ts
    ├── entitlement.ts
    ├── download.ts
    ├── discovery.ts
    └── index.ts
```

Feature-specific view models may live inside their feature when they are not reusable domain entities.

---

# 60. Canonical Type Ownership

A type should have one canonical owner.

For example:

```text
Movie
→ types/movie.ts

Series
→ types/series.ts

Payment
→ types/payment.ts
```

Do not redefine:

```ts
interface Movie
```

inside multiple components.

---

# 61. View Models vs Domain Models

Domain model:

```ts
Movie
```

represents the business concept.

View model:

```ts
MovieCardModel
```

represents what a specific UI surface needs.

This separation is encouraged.

Example:

```text
Domain Model
     ↓
Selector / Mapper
     ↓
MovieCardModel
     ↓
MovieCard
```

This prevents UI components from becoming coupled to large domain objects.

---

# 62. Data Flow Rule

Preferred:

```text
Mock Repository
      ↓
Feature Hook
      ↓
View Model
      ↓
Component
```

Future:

```text
API Repository
      ↓
Mapper
      ↓
Feature Hook
      ↓
View Model
      ↓
Component
```

The UI should not care whether data came from mock data or the future API.

---

# 63. Data Model Definition of Done

MD-08 is considered implemented when:

* Core domain types exist.
* Movie and MovieVersion are separated.
* Series → Season → Episode hierarchy exists.
* DJ/Translator relationships exist.
* Category and Country relationships exist.
* Streaming and Download pricing are separate.
* Access duration is configurable.
* Purchase and Entitlement are separate.
* Subscription and individual purchases are independent.
* Payment and Order concepts exist.
* Download state exists.
* User roles are defined.
* Content states are defined.
* Mock data can be typed against the models.
* No database schema has been introduced.
* No backend implementation has been introduced.
* No business assumption has been silently added.

---

# 64. AI Coding Agent Directive

OpenCode must treat this document as the canonical frontend data contract.

Before creating or modifying a domain object:

1. Search this document.
2. Check whether the entity already exists.
3. Reuse the canonical type.
4. Check its relationships.
5. Do not create duplicate representations.
6. Do not invent missing business fields.
7. If a required field is genuinely missing, stop and report the ambiguity rather than silently modifying the domain.

When uncertain:

```text
DO NOT GUESS.
DO NOT INVENT.
DO NOT SILENTLY CHANGE THE MODEL.
```

---

# 65. Relationship With Previous Documents

MD-08 depends on:

```text
MD-01 → Project Rules
MD-02 → Technology Stack
MD-03 → Design System
MD-04 → Visual Language
MD-05 → Motion System
MD-06 → Frontend Architecture
MD-07 → Route Map
MD-08 → Data Models
```

The exact filenames remain the source of truth for implementation order.

---

# 66. Final Data Philosophy

GIFTEDproMovies should not be modeled as:

```text
Movie
+ price
+ download
```

It is a richer domain:

```text
CONTENT
   ↓
MOVIE / SERIES
   ↓
VERSION / SEASON / EPISODE
   ↓
DJ / TRANSLATOR
   ↓
PRICING
   ↓
PURCHASE
   ↓
PAYMENT
   ↓
ENTITLEMENT
   ↓
STREAM / DOWNLOAD
```

This distinction is what allows the platform to scale from a simple movie-selling website into a real streaming-commerce product.

---

# 67. Next Document

The next document is:

```text
MD-09
09_MOCK_DATA_CONTRACT.md
```

It will define exactly how frontend mock data is organized, seeded, related, consumed, and replaced by the future API without changing the UI architecture.
