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

Content has a lifecycle state representing its readiness and governance approval:

```ts
// Media Studio status:
export type MediaContentStatus =
  | 'DRAFT'
  | 'READY_FOR_REVIEW'
  | 'PUBLISHED'
  | 'ARCHIVED';

// Admin & Catalog status (canonical):
export type ContentPublishStatus =
  | 'draft'
  | 'pending_review'
  | 'published'
  | 'archived';
```

Meaning:

### DRAFT (`draft`)

Content metadata and media are being prepared in the Catalog Intake Wizard or Edit Studio. It is not publicly discoverable and not yet submitted for review.

### READY_FOR_REVIEW (`pending_review`)

Content intake or revision is complete (completeness >= 80% with required media passes). It has been submitted to the Admin Review Queue and is awaiting administrator approval before going live (when `publishingRequiresApproval` is active).

### PUBLISHED (`published`)

Content has passed quality control and approval. It is live and accessible on the storefront and streaming player according to its access and pricing rules.

### ARCHIVED (`archived`)

Content is unlisted or deactivated from the catalog. It is no longer publicly discoverable.

The frontend must not interpret `DRAFT` or `READY_FOR_REVIEW` (`pending_review`) as publicly visible.

---

# 10. Category Model

The canonical category entity is managed by Admin and referenced across the Media Studio and storefront:

```ts
export interface AdminCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
  contentCount: number;
  isActive: boolean;
}
```

Examples:
- Action
- Bongo / Tanzanian
- Comedy
- Animation & Kids
- Drama
- Horror & Thriller
- Superhero / Sci-Fi
- Nigerian / Nollywood

The active category list is governed centrally by Admin (`/admin/categories`). The frontend dynamically fetches categories from `adminRepository` / `mediaTeamRepository`.

---

# 11. Country Model

The canonical country entity allows media titles to specify one or multiple production origins:

```ts
export interface AdminCountry {
  id: string;
  code: string;       // e.g. "TZ", "US", "NG", "KR", "IN"
  name: string;       // e.g. "Tanzania", "United States", "Nigeria"
  flagEmoji: string;  // e.g. "🇹🇿", "🇺🇸", "🇳🇬"
  contentCount: number;
  isActive: boolean;
}
```

A movie or series may belong to one or multiple countries (e.g. `countries: string[]`).

---

# 12. DJ / Translating Voice Artist Model

A translating DJ/Voice Artist is an essential first-class creator identity on GIFTEDproMovies:

```ts
export interface AdminDJ {
  id: string;
  name: string;
  stageName: string;
  slug: string;
  avatarUrl: string;
  bio: string;
  tier: string;             // e.g. "Resident Master", "Featured Guest", "Senior Artist"
  contractType: string;     // e.g. "Exclusive Royalty", "Standard"
  activeTitlesCount: number;
  totalStreams: number;
  status: 'active' | 'inactive';
  colorHex: string;         // Dedicated brand accent color
}
```

DJs are selectable in the customer storefront, featured in DJ spotlight rails, and linked to specific video editions (`MovieVersion`).

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

Streaming and downloading are distinct commercial actions with independent pricing in Tanzanian Shillings (TSh / TZS):

```ts
// Flat TSh pricing fields on MovieVersion, Episode, and Platform Settings:
streamingPriceTsh: number;  // e.g. 1000
downloadPriceTsh: number;   // e.g. 2000
```

Platform defaults are governed in `AdminPlatformSettings`:
- `defaultStreamingPriceTsh`: 1,000 TSh
- `defaultDownloadPriceTsh`: 2,000 TSh
- `defaultCurrency`: 'TZS'

Presentation:
- Formatted as `TSh 1,000` / `TSh 2,000` in the storefront and checkout modals.
- Streaming and downloading retain separate pricing across all movie versions and series episodes.

---

# 15. Access Duration

Access duration is configurable by Admin and stored as flat hours:

```ts
accessDurationHours: number; // default: 48 hours
```

Platform default:
- `defaultAccessDurationHours`: 48 hours (in `AdminPlatformSettings`).
- Displayed in the storefront as `"48 Hours Access"`.
- When an order completes, the customer's entitlement records `accessExpiresAt = new Date(Date.now() + accessDurationHours * 3600 * 1000).toISOString()`.

---

# 16. Movie Version Model

A movie can have multiple hard-muxed DJ video editions (e.g. DJ Afro, DJ Murphy, DJ Black). This is one of the foundational domain concepts of GIFTEDproMovies:

```ts
export interface MovieVersion {
  id: string;
  djId: string;
  djName: string;
  streamingPriceTsh: number;
  downloadPriceTsh: number;
  accessDurationHours: number;
  streamingStatus: MediaReadyStatus;
  downloadStatus: MediaReadyStatus;
  streamingFileName?: string;
  downloadFileName?: string;
  isDefault: boolean;
}
```

In the Media Studio intake and review workflows:
```ts
export interface MovieVersionItem {
  id: string;
  djId: string;
  djName: string;
  versionLabel?: string;
  streamingFileName?: string;
  streamingStatus: MediaReadinessStatus;
  downloadFileName?: string;
  downloadStatus: MediaReadinessStatus;
  readinessStatus: 'ready' | 'draft' | 'needs_attention';
  streamingPriceTsh?: number;
  downloadPriceTsh?: number;
}
```

Key principles:
1. Each DJ version links to its own streaming video file and download package.
2. A customer purchasing one DJ edition receives access to that specific hard-muxed video release.
3. The player switches editions dynamically via query param `?dj=[DJ_NAME]`.

---

# 17. Movie Model

The canonical movie entity across the catalog, Admin, and customer experience:

```ts
export interface AdminMovie {
  id: string;
  title: string;
  originalTitle: string;
  slug: string;
  releaseYear: number;
  durationMinutes: number;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl?: string;
  description: string;
  genres: string[];
  countries: string[];
  ageRating: string;
  rating: number;
  streamingStatus: MediaReadyStatus;
  downloadStatus: MediaReadyStatus;
  status: ContentPublishStatus;
  isFeatured: boolean;
  isTrending: boolean;
  versions: MovieVersion[];
  viewsCount: number;
  purchasesCount: number;
  downloadsCount: number;
  publishedAt: string;
}

// Customer alias:
export type MovieItem = AdminMovie;
```

In the Media Studio (`MediaContentItem`):
```ts
export interface MediaContentItem {
  id: string;
  slug: string;
  codeId: string; // e.g. #GF-9042
  title: string;
  originalTitle: string;
  contentType: 'MOVIE';
  releaseYear: number;
  durationMinutes: number;
  description: string;
  posterUrl: string;
  backdropUrl?: string;
  trailerUrl?: string;
  categoryNames: string[];
  countryNames: string[];
  versions: MovieVersionItem[];
  streamingStatus: MediaReadinessStatus;
  downloadStatus: MediaReadinessStatus;
  completenessPercent: number;
  checklist: ContentReadinessChecklist;
  status: MediaContentStatus;
  updatedAt: string;
  lastEditedBy?: string;
}
```

The 9-point content readiness checklist enforced in intake:
```ts
export interface ContentReadinessChecklist {
  basicInfo: boolean;       // title, description, release year, duration
  poster: boolean;          // vertical 2:3 artwork
  backdrop: boolean;        // horizontal 16:9 artwork
  trailer: boolean;         // trailer media URL or video
  categories: boolean;      // >= 1 category assigned
  countries: boolean;       // >= 1 country origin assigned
  djAssigned: boolean;      // translating DJ voice artist assigned
  streamingMedia: boolean;  // streamingStatus === 'ready'
  downloadMedia: boolean;   // downloadStatus === 'ready'
}
```

---

# 18. Series Model

The canonical episodic series entity:

```ts
export interface AdminSeries {
  id: string;
  title: string;
  slug: string;
  releaseYear: number;
  seasonsCount: number;
  episodesCount: number;
  posterUrl: string;
  backdropUrl: string;
  genres: string[];
  countries: string[];
  pricingModel: 'per_episode' | 'per_season' | 'full_series' | 'combination';
  status: ContentPublishStatus;
  isFeatured: boolean;
  isTrending: boolean;
  totalStreams: number;
  publishedAt: string;
  leadDjName?: string;                      // Dedicated voice artist continuity across seasons
  defaultEpisodeStreamPriceTsh?: number;    // e.g. 500 TSh
  defaultEpisodeDownloadPriceTsh?: number;  // e.g. 1000 TSh
  seasons?: AdminSeason[];
}

// Customer alias:
export type SeriesItem = AdminSeries;
```

In the Media Studio (`SeriesContentItem`):
```ts
export interface SeriesContentItem {
  id: string;
  slug: string;
  codeId: string;
  title: string;
  originalTitle: string;
  contentType: 'SERIES';
  releaseYear: number;
  posterUrl: string;
  backdropUrl?: string;
  trailerUrl?: string;
  categoryNames: string[];
  countryNames: string[];
  description: string;
  seasons: SeasonItem[];
  totalEpisodes: number;
  completenessPercent: number;
  status: MediaContentStatus;
  updatedAt: string;
}
```

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
export interface AdminSeason {
  id: string;
  seasonNumber: number;
  title: string;
  seasonPassPriceTsh: number;  // e.g. 3,500 TSh for full season access
  episodes: AdminEpisode[];
}
```

In the Media Studio:
```ts
export interface SeasonItem {
  id: string;
  seasonNumber: number;
  title: string;
  episodes: EpisodeItem[];
  status: MediaContentStatus;
}
```

---

# 20. Episode Model

```ts
export interface AdminEpisode {
  id: string;
  episodeNumber: number;
  title: string;
  durationMinutes: number;
  description: string;
  thumbnailUrl?: string;
  streamingStatus: MediaReadyStatus;
  downloadStatus: MediaReadyStatus;
  streamPriceTsh: number;      // e.g. 500 TSh
  downloadPriceTsh: number;    // e.g. 1000 TSh
  status: ContentPublishStatus;
  viewsCount?: number;
}
```

In the Media Studio:
```ts
export interface EpisodeItem {
  id: string;
  episodeNumber: number;
  title: string;
  durationMinutes: number;
  description: string;
  thumbnailUrl?: string;
  djName?: string;
  streamingStatus: MediaReadinessStatus;
  downloadStatus: MediaReadinessStatus;
  status: MediaContentStatus;
}
```

---

# 21. Series Pricing Model

The series pricing model is fully implemented and configurable:

```ts
export type SeriesPricingModel =
  | 'per_episode'
  | 'per_season'
  | 'full_series'
  | 'combination';
```

Supported commercial flows:
- **Per Episode**: Individual episodes purchased at `streamPriceTsh` or `downloadPriceTsh`.
- **Per Season**: Season Pass purchased at `seasonPassPriceTsh` (unlocks all episodes in that season).
- **Full Series / Combination**: Allows both individual episode purchases and season/series passes.

---

# 22. Purchase Type

The platform defines distinct purchase types across single items, episodic content, and passes:

```ts
export type PurchaseType =
  | 'subscription'
  | 'vip_pass'
  | 'ppv_stream'
  | 'ppv_download'
  | 'series_episode'
  | 'series_season'
  | 'series_bundle';
```

This distinction allows precise entitlement calculation, accounting, and download authorization.

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

# 57. Resolved Operational & Business Decisions

The key operational decisions have been resolved and implemented in the frontend architecture:

### 57.1 Media Team publishing approval (RESOLVED & IMPLEMENTED)

Implemented as a dynamic governance gate controlled by `AdminPlatformSettings.publishingRequiresApproval` (toggleable in `/admin/settings` and queried by `adminRepository.isPublishingApprovalRequired()`):

```text
When publishingRequiresApproval === true:
Media Team Intake / Edit
        ↓
Submit for Review (status = 'READY_FOR_REVIEW' / 'pending_review')
        ↓
Admin Review Queue (/admin/movies or /admin/series)
        ↓
Approve & Publish (status = 'PUBLISHED' / 'published')

When publishingRequiresApproval === false:
Media Team Intake / Edit
        ↓
Direct Publish (status = 'PUBLISHED' / 'published')
```

### 57.2 Series pricing (RESOLVED & IMPLEMENTED)

Implemented with multiple configurable commercial strategies:
- `pricingModel: 'per_episode' | 'per_season' | 'full_series' | 'combination'`
- Per-episode pricing: `streamPriceTsh` and `downloadPriceTsh` on `AdminEpisode`.
- Season Pass pricing: `seasonPassPriceTsh` (e.g. 3,500 TSh) on `AdminSeason`.
- Series-level defaults: `defaultEpisodeStreamPriceTsh` and `defaultEpisodeDownloadPriceTsh` on `AdminSeries`.

### 57.3 Payment providers (RESOLVED & IMPLEMENTED)

Implemented via `PaymentMethod = 'mpesa' | 'tigo' | 'airtel' | 'halopesa' | 'card'`:
- **M-Pesa** (Vodacom Tanzania)
- **Tigo Pesa** (Yas / Tigo Tanzania)
- **Airtel Money** (Airtel Tanzania)
- **HaloPesa** (Halotel Tanzania)
- **Card** (Visa / MasterCard)

### 57.4 Maximum active devices (RESOLVED & IMPLEMENTED)

Implemented via `AdminPlatformSettings.maxActiveDevicesPerUser` (default: 3 concurrent devices) and tracked per user in `CustomerDevice` (`id`, `deviceName`, `deviceType`, `lastActive`, `isCurrent`).

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

# 59. Implemented Type Organization

The codebase organizes domain types into 3 clean, domain-aligned files in `src/types/`:

```text
src/
└── types/
    ├── admin.ts        # Admin entities, commercial rates, KPIs, platform settings, canonical models
    ├── mediaTeam.ts    # Media Studio intake models, readiness checklist (9-point), review contracts
    └── customer.ts     # Customer storefront views, entitlements, continue-watching, search results
```

1. **`src/types/admin.ts`**:
   Authoritative platform models: `AdminMovie`, `MovieVersion`, `AdminSeries`, `AdminSeason`, `AdminEpisode`, `AdminDJ`, `AdminCategory`, `AdminCountry`, `AdminOrder`, `AdminPaymentRecord`, `AdminCustomer`, `AdminPlatformSettings`, `PPVRateTier`, `SubscriptionPlanConfig`, `CustomerDevice`, `MediaReadyStatus`, `ContentPublishStatus`.

2. **`src/types/mediaTeam.ts`**:
   Media operations and intake models: `MediaContentItem`, `MovieVersionItem`, `ContentReadinessChecklist`, `MediaContentStatus`, `SeriesContentItem`, `SeasonItem`, `EpisodeItem`, `AttentionItem`, `MediaAssetItem`, `UploadSession`.

3. **`src/types/customer.ts`**:
   Customer consumption views: `MovieItem = AdminMovie`, `SeriesItem = AdminSeries`, `DjItem = AdminDJ`, `CategoryItem = AdminCategory`, `CountryItem = AdminCountry`, `SubscriptionPlan`, `ContinueWatchingItem`, `CustomerEntitlement`, `CustomerProfile`, `SearchResultGroup`.

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
