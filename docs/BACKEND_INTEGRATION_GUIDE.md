# GIFTEDproMovies — System Architecture & Backend Integration Guide

> **Audience:** Backend Engineers, System Architects, DevOps, and Full-Stack Integrators.  
> **Platform Version:** 3.0 (Production Frontend Architecture)  
> **Brand Identity:** `GIFTEDproMovies` — The Premier East African Swahili-Translated Cinema Streaming Platform.

---

## 1. Executive Summary & Domain Fundamentals

### 1.1 What is GIFTEDproMovies?
GIFTEDproMovies is a video-on-demand (VOD) and subscription streaming platform built specifically for East African audiences (Tanzania, Kenya, Uganda, Rwanda, DRC, Burundi, and the global diaspora). The platform specializes in international and African cinema translated and commentated into Swahili by famous voice artists known as **Video Deejays (DJs)** such as **DJ Afro Amigo**, **DJ Murphy**, **DJ Mack**, **DJ Black**, and **DJ Ally**.

### 1.2 The Core Business Reality: Embedded DJ Audio (Approach A)
Unlike Hollywood multi-track audio (e.g., Netflix switching between English and Spanish audio tracks on the same video file), **Swahili DJ cinema uses permanently burned (hard-muxed) audio stems**:
* The DJ's voiceover, jokes, contextual cultural explanations, and sound effects are physically mixed directly into the movie's master audio channel.
* **Architecture Rule:** You **cannot** change the DJ on an existing video file without uploading the new DJ's dedicated video file.
* Therefore, the system models a Movie/Series title as a **Container of Embedded DJ Video Editions**. A single title (e.g., *Godzilla x Kong: The New Empire*) holds multiple DJ editions (`DJ Afro Edition`, `DJ Murphy Edition`), each pointing to its own distinct video files and playback passes.

---

## 2. Platform Portals & Access Control

The platform consists of **three distinct portals** sharing a unified authentication and authorization layer:

```text
               +----------------------------------+
               |    GIFTEDproMovies CLIENT APP    |
               +----------------+-----------------+
                                |
                                v
                   [ User Role & Active Route ]
                                |
       +------------------------+------------------------+
       |                        |                        |
       v                        v                        v
[ CUSTOMER PORTAL ]     [ MEDIA STUDIO ]        [ ADMIN PORTAL ]
  (/, /movies, ...)       (/media-team)           (/admin)
       |                        |                        |
       |-- Public Catalog       |-- Single-Pass Ingest   |-- Executive KPIs
       |-- LIPA PPV Checkout    |-- DJ Edition Manager   |-- Weekly Income Ledger
       |-- /watch Cinema Player |-- Completeness Score   |-- Approval Gate Toggle
       \-- Customer Library     \-- Submit for Review    \-- Taxonomy Governance
```

### 2.1 Role-Based Access Control (RBAC) Matrix

| User Role | Accessible Routes | Capabilities |
| :--- | :--- | :--- |
| **`customer` / Guest** | `/`, `/movies/*`, `/series/*`, `/djs/*`, `/categories/*`, `/countries/*`, `/subscriptions`, `/library`, `/watch/*` | Browse catalog, stream trailers, initiate LIPA payments (M-Pesa/Tigo/Airtel), watch entitled movies in cinema player, download offline packages. |
| **`media_team`** | `/media-team/*` (Dashboard, Movie Library, Series Studio, Review Queue) | Ingest video masters, create DJ editions, manage artwork, tag taxonomies. Can publish directly or submit to Admin based on platform approval policy. |
| **`admin`** | `/admin/*` + All Media Team + Customer routes | Approve/publish staged content, toggle platform publishing gate, manage weekly finances, configure DJ roster, manage countries & categories, audit user orders. |

---

## 3. Data Models & Entity Relationships

### 3.1 Entity Relationship Diagram (ERD)

```text
+------------------+         +--------------------+         +--------------------+
|  CUSTOMER_USER   | 1     * |       ORDER        | *     1 |   PAYMENT_METHOD   |
|------------------|---------|--------------------|---------|--------------------|
| id (PK)          |         | id (PK)            |         | id (PK)            |
| email / phone    |         | customer_id (FK)   |         | provider_name      |
| full_name        |         | amount_tsh         |         | mpesa / tigo / etc |
| is_vip           |         | status (SETTLED)   |         +--------------------+
+--------+---------+         | receipt_id         |
         |                   +---------+----------+
         | 1                           | 1
         |                             |
         v *                           v *
+------------------+         +--------------------+
|   ENTITLEMENT    |         |     ORDER_ITEM     |
|------------------|         |--------------------|
| id (PK)          |         | id (PK)            |
| customer_id (FK) |         | order_id (FK)      |
| item_slug        |         | target_edition_id  |
| access_type      |         +--------------------+
| expires_at       |
+------------------+

+------------------+ 1     * +--------------------+ *     * +--------------------+
|      MOVIE       |---------|   MOVIE_EDITION    |---------|    VOICE_ARTIST    |
|------------------|         |--------------------|         |     (DJ ROSTER)    |
| id (PK)          |         | id (PK)            |         |--------------------|
| title            |         | movie_id (FK)      |         | id (PK)            |
| slug             |         | dj_id (FK)         |         | name (DJ Afro)     |
| poster_url       |         | streaming_file     |         | dialect / bio      |
| backdrop_url     |         | download_file      |         +--------------------+
| status           |         | stream_price_tsh   |
+------------------+         | download_price_tsh |
                             +--------------------+

+------------------+ 1     * +--------------------+ 1     * +--------------------+
|      SERIES      |---------|       SEASON       |---------|      EPISODE       |
|------------------|         |--------------------|         |--------------------|
| id (PK)          |         | id (PK)            |         | id (PK)            |
| title            |         | series_id (FK)     |         | season_id (FK)     |
| lead_dj_id (FK)  |         | season_number      |         | episode_number     |
| poster_url       |         | season_pass_price  |         | stream_price_tsh   |
+------------------+         +--------------------+         | download_price_tsh |
                                                            | video_file_key     |
                                                            +--------------------+
```

---

### 3.2 Core Schemas

#### A. Movies & Embedded DJ Editions (`AdminMovie` / `MovieItem`)
```typescript
interface Movie {
  id: string;                      // e.g. "mov-101"
  title: string;                   // e.g. "Godzilla x Kong: The New Empire"
  originalTitle: string;           // e.g. "Godzilla x Kong: The New Empire"
  slug: string;                    // unique URL slug: "godzilla-x-kong-the-new-empire"
  releaseYear: number;             // e.g. 2024
  durationMinutes: number;         // e.g. 115
  description: string;
  posterUrl: string;               // 2:3 vertical portrait artwork
  backdropUrl: string;             // 16:9 widescreen backdrop
  trailerUrl?: string;             // YouTube / MP4 trailer stream
  genres: string[];                // ["Action", "Sci-Fi"]
  countries: string[];             // ["United States"]
  ageRating: string;               // "16+", "18+"
  rating: number;                  // 8.8 (out of 10)
  status: 'published' | 'draft' | 'pending_review' | 'archived';
  isFeatured: boolean;             // Featured billboard hero candidate
  isTrending: boolean;
  viewsCount: number;
  purchasesCount: number;
  downloadsCount: number;
  publishedAt: string;             // ISO-8601

  // Embedded DJ Video Editions
  versions: MovieVersionItem[];
}

interface MovieVersionItem {
  id: string;                      // e.g. "ver-dj-afro-101"
  djId: string;                    // Foreign Key -> DJ (e.g. "dj-afro")
  djName: string;                  // Snapshot name: "DJ Afro Amigo"
  versionLabel?: string;           // "DJ Afro Voiceover"
  
  // Storage & Media Files
  streamingFileName?: string;      // e.g. "godzilla_x_kong_2024_dj_afro_1080p.mp4"
  streamingStatus: 'ready' | 'processing' | 'not_available';
  downloadFileName?: string;       // e.g. "godzilla_x_kong_mobile_package.mp4"
  downloadStatus: 'ready' | 'processing' | 'not_available';
  
  // PPV Pricing
  streamingPriceTsh: number;       // e.g. 1500 TZS (48h Pass)
  downloadPriceTsh: number;        // e.g. 2500 TZS (7d Mobile License)
  accessDurationHours: number;     // e.g. 48
  isDefault: boolean;
}
```

#### B. Series, Seasons & Episodes
```typescript
interface Series {
  id: string;
  title: string;
  slug: string;
  releaseYear: number;
  leadDjId: string;                // Single lead voiceover DJ per series
  leadDjName: string;              // e.g. "DJ Afro Amigo"
  posterUrl: string;
  backdropUrl: string;
  status: 'published' | 'draft' | 'pending_review' | 'archived';
  seasons: SeasonItem[];
}

interface SeasonItem {
  id: string;
  seasonNumber: number;            // e.g. 1
  title: string;                   // "Season 1"
  seasonPassPriceTsh: number;      // e.g. 3500 TZS (Discounted bundle for all episodes)
  episodes: EpisodeItem[];
}

interface EpisodeItem {
  id: string;
  episodeNumber: number;           // e.g. 1
  title: string;                   // "Episode 1: The Gathering"
  durationMinutes: number;         // e.g. 52
  streamingPriceTsh: number;       // e.g. 500 TZS
  downloadPriceTsh: number;        // e.g. 1000 TZS
  streamingFileName?: string;
  downloadFileName?: string;
  streamingStatus: 'ready' | 'processing' | 'not_available';
  isLive: boolean;                 // true = Live, false = Draft
}
```

#### C. Mobile Money Orders & Customer Entitlements
```typescript
interface Order {
  id: string;
  orderNumber: string;             // e.g. "ORD-9042"
  customerId: string;
  customerName: string;
  customerPhone: string;           // e.g. "0754123456"
  provider: 'mpesa' | 'tigo' | 'airtel' | 'halopesa';
  amountTsh: number;               // e.g. 1500
  status: 'completed' | 'processing' | 'pending' | 'failed';
  purchaseType: 'ppv_stream' | 'ppv_download' | 'subscription' | 'series_episode' | 'series_season';
  targetTitle: string;
  targetSlug: string;
  targetDj?: string;
  createdAt: string;
  receiptId?: string;              // e.g. "TZS-849201" from Telco gateway
}

interface CustomerEntitlement {
  id: string;
  customerId: string;
  itemTitle: string;
  itemSlug: string;
  itemType: 'movie' | 'series' | 'subscription';
  accessType: 'stream' | 'download' | 'vip_pass';
  djName?: string;
  expiresAt: string;               // ISO-8601 timestamp
  isActive: boolean;
  orderNumber: string;
}
```

---

## 4. Key Business Logic & Platform Workflows

### 4.1 Configurable Publishing Approval Gate
Governed by `adminRepository.isPublishingApprovalRequired()`:
* **When `true` (Default):**
  - Media Team cannot set a Movie or Series to `PUBLISHED` directly.
  - Submitting from the wizard flags the title as `pending_review` (`READY_FOR_REVIEW`).
  - An Admin must approve the title via `/admin/movies` or `/admin/series` to push it to the public catalog.
* **When `false`:**
  - Media Team operators can directly publish titles to the live catalog.

### 4.2 LIPA Checkout & Instant Playback Handshake
The end-to-end customer payment and playback flow:

```text
 Customer Phone            Frontend (LipaModal)             Backend API              Telco Gateway (Vodacom/Tigo)
       |                             |                            |                                |
       |  Clicks "WATCH / LIPA"      |                            |                                |
       |---------------------------->|                            |                                |
       |                             |  POST /payments/lipa-push  |                                |
       |                             |--------------------------->|                                |
       |                             |  (telco, phone, amount)    |  Initiate STK Push             |
       |                             |                            |------------------------------->|
       |  USSD PIN Prompt Pops Up    |                            |                                |
       |<------------------------------------------------------------------------------------------|
       |  "Enter PIN for TSh 1,500"  |                            |                                |
       |                             |                            |                                |
       |  Enters Mobile Money PIN    |                            |                                |
       |------------------------------------------------------------------------------------------>|
       |                             |                            |                                |
       |                             |                            |  Webhook: Payment Settled      |
       |                             |                            |<-------------------------------|
       |                             |                            |  - Record Order (SETTLED)      |
       |                             |  Poll / SSE Order Status   |  - Create Entitlement Record   |
       |                             |--------------------------->|                                |
       |                             |<---------------------------|                                |
       |                             |  Status: 'completed'       |                                |
       |  "Payment Confirmed!"       |                            |                                |
       |<----------------------------|                            |                                |
       |                             |                            |                                |
       |  Clicks "Start Watching"    |                            |                                |
       |---------------------------->|                            |                                |
       |                             |  Redirect: /watch/[slug]   |                                |
       |                             |  (Streams HLS Video Chunks)|                                |
```

---

## 5. API Endpoints Required (Backend Specification)

### 5.1 Authentication, Authorization & RBAC (`/api/v1/auth`)
* `POST /api/v1/auth/login` — Phone/Email + Password. Returns JWT access & refresh tokens with user role (`customer` | `media_team` | `admin`).
* `POST /api/v1/auth/register` — User signup (phone number, full name, password). Automatically attaches guest purchase tokens if present.
* `GET  /api/v1/auth/me` — Returns authenticated user profile, VIP subscription status, and active entitlement passes.
* `POST /api/v1/auth/logout` — Revokes active refresh token and invalidates session.
* `POST /api/v1/auth/forgot-password` — Dispatches a secure 6-digit OTP via SMS / Email (valid 10 minutes).
* `POST /api/v1/auth/verify-otp` — Validates OTP; returns a short-lived password reset token.
* `POST /api/v1/auth/reset-password` — Sets a new hashed password using the verified reset token.


### 5.2 Public Content Catalog (`/api/v1/catalog`)
* `GET /api/v1/catalog/movies` — Paginated published movies. Query params: `genre`, `dj`, `country`, `sort` (trending, newest, popular).
* `GET /api/v1/catalog/movies/:slug` — Single movie detail with all published DJ versions.
* `GET /api/v1/catalog/series` — Paginated published series.
* `GET /api/v1/catalog/series/:slug` — Single series detail with seasons and episodes.
* `GET /api/v1/catalog/djs` — List all active video DJs.
* `GET /api/v1/catalog/djs/:slug` — DJ profile, bio, and all associated titles.
* `GET /api/v1/catalog/categories` — Catalog categories with title counts.
* `GET /api/v1/catalog/countries` — Catalog countries with flags and ISO codes.
* `GET /api/v1/catalog/search?q=...` — Universal instant search across movies, series, DJs, categories.

### 5.3 Customer Entitlements & Playback (`/api/v1/playback`)
* `GET /api/v1/playback/verify-access?slug=:slug&dj=:dj` — Checks if user has an active pass for this movie edition or active VIP.
* `GET /api/v1/playback/stream-token?slug=:slug&dj=:dj` — Generates a short-lived (e.g. 4 hours) HMAC SHA-256 signed HLS URL for `/watch/[slug]`.
* `GET /api/v1/playback/download-url?slug=:slug&dj=:dj` — Returns a presigned S3/R2 URL for the offline mobile MP4 package.
* `POST /api/v1/playback/progress` — Updates user continue-watching progress (`currentTimeSeconds`, `progressPercent`).

### 5.4 Mobile Money Payments (`/api/v1/payments`)
* `POST /api/v1/payments/lipa-push` — Initiates STK push to mobile phone (M-Pesa, Tigo, Airtel, Halopesa).
* `POST /api/v1/payments/webhooks/telco-callback` — Public webhook receiver for Telco payment settlements.
* `GET  /api/v1/payments/order-status/:orderId` — Polled by `LipaModal` to detect payment confirmation.

### 5.5 Media Team Studio & Ingestion (`/api/v1/media-team`)
* `GET  /api/v1/media-team/movies` — Movies catalog for operators (drafts, pending, published).
* `POST /api/v1/media-team/movies` — Create movie draft with initial DJ edition.
* `PUT  /api/v1/media-team/movies/:id` — Update movie metadata and DJ versions list.
* `POST /api/v1/media-team/upload-url` — Generates presigned S3/R2 direct upload URL for master video files (bypassing web servers).
* `POST /api/v1/media-team/movies/:id/versions` — Attach a new DJ video edition under an existing movie.
* `DELETE /api/v1/media-team/movies/:id/versions/:versionId` — Remove a DJ edition.
* `POST /api/v1/media-team/movies/:id/submit-for-review` — Transitions status to `pending_review`.

### 5.6 Admin Management & Operations (`/api/v1/admin`)
* `GET  /api/v1/admin/kpis` — High-level metrics: revenue today, monthly target, total orders, active subscribers.
* `GET  /api/v1/admin/revenue/weekly?month=YYYY-MM` — 4-week breakdown of income by VIP passes, single movies, and series.
* `GET  /api/v1/admin/settings/publishing-policy` — Returns `{ requireApproval: boolean }`.
* `PUT  /api/v1/admin/settings/publishing-policy` — Toggle approval policy.
* `POST /api/v1/admin/movies/:id/approve` — 1-click approve & publish staged movie.
* `POST /api/v1/admin/series/:id/approve` — 1-click approve & publish staged series.
* `POST /api/v1/admin/countries` — Add new country with auto-detected flag & ISO code.
* `POST /api/v1/admin/djs` — Register new voice artist to the roster.

### 5.7 Notification & Alerting Engine (`/api/v1/notifications`)
* `POST /api/v1/notifications/sms/send-receipt` — Dispatches transactional M-Pesa / Tigo payment receipt SMS with movie watch link.
* `POST /api/v1/notifications/sms/send-reminder` — Automated cron/webhook to send pass expiration warning (2 hours before expiry).
* `GET  /api/v1/notifications/badges/staff-queue` — Returns live pending review counter badge for Admin navigation (e.g. `{ pendingReviews: 3 }`).
* `GET  /api/v1/notifications/user/announcements` — Fetches active system banners or maintenance alerts for the customer portal.

---


## 6. Video Storage, Transcoding & CDN Architecture

To deliver smooth streaming across fluctuating 3G/4G/5G mobile connections in East Africa:

1. **Storage Tier:**
   - Raw video masters are stored in **Cloud Object Storage** (AWS S3, Cloudflare R2, or Bunny Storage). Never stored in SQL/MongoDB.
2. **Adaptive Bitrate Streaming (HLS):**
   - Transcoder converts master videos into multi-bitrate HLS playlists (`.m3u8`):
     - `1080p` (5.0 Mbps) — FHD Screens & Smart TVs
     - `720p` (2.5 Mbps) — Standard HD
     - `480p` (1.2 Mbps) — Mobile Data Saver
     - `360p` (0.6 Mbps) — Low Connectivity / 3G
3. **Edge Caching (CDN):**
   - CDN Edge PoPs in Dar es Salaam, Nairobi, and Johannesburg cache video chunks locally.
   - Cache hit ratios exceed 98%, protecting origin servers and eliminating latency.

---

## 7. Frontend Integration Points (Where Mocks Live)

To transition from the current mock architecture to production APIs, replace the methods in these specific repository files:

| Frontend File | Current Mock Source | Target Production API |
| :--- | :--- | :--- |
| `src/lib/repositories/adminRepository.ts` | `src/data/mock/adminData.ts` | `/api/v1/admin/*` |
| `src/lib/repositories/mediaTeamRepository.ts` | `src/data/mock/mediaTeamData.ts` | `/api/v1/media-team/*` |
| `src/context/CustomerContext.tsx` | `src/data/mock/customerData.ts` | `/api/v1/catalog/*`, `/api/v1/payments/*`, `/api/v1/playback/*` |
| `src/context/AuthContext.tsx` | Mock user sessions | `/api/v1/auth/*` |

---

## 8. Summary Checklist for Backend Engineers

- [ ] Set up PostgreSQL / MySQL relational database using the schemas in Section 3.
- [ ] Implement Mobile Money Telco integration (Vodacom M-Pesa Daraja/OpenAPI, Tigo Pesa, Airtel Money).
- [ ] Connect Object Storage (S3/R2/Bunny) with presigned direct-upload URLs.
- [ ] Set up HLS Video Transcoder pipeline for Adaptive Bitrate Streaming (360p – 1080p).
- [ ] Implement token-based signed URL verification for HLS stream security.
- [ ] Connect the frontend repository files (`adminRepository.ts`, `mediaTeamRepository.ts`) to your live REST/GraphQL endpoints.
