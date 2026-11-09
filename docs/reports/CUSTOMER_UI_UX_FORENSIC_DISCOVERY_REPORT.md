# GIFTEDproMovies3 — CUSTOMER EXPERIENCE UI FORENSIC DISCOVERY & DESIGN AUDIT
**Document Reference:** `GPM-DOC-UX-2026-001`  
**Classification:** Confidential • Technical Architecture & Product Design Forensic Report  
**Author:** Principal Frontend Architect & Senior Product UX Designer  
**Status:** COMPLETE FORENSIC DISCOVERY (READ-ONLY AUDIT)  
**Execution Date:** November 9, 2026  

---

## 1. EXECUTIVE SUMMARY

An exhaustive forensic audit of the customer-facing experience in **GIFTEDproMovies3** was conducted in strict read-only mode. The objective was to discover the structural, visual, data-contract, and responsive root causes behind why the customer interface currently feels unorganized, repetitive, and insufficiently cinematic—especially under small-catalog conditions.

### Key Forensic Discoveries:

1. **The Small-Catalog Multi-Rail Duplication Failure Mode:**  
   In `src/app/page.tsx`, the homepage renders four prominent vertical movie discovery zones: the `<HeroBillboard>`, followed sequentially by three `<ContentRail>` components titled *"New Releases"*, *"Trending Movies"*, and *"Popular Movies"*.  
   In `src/lib/repositories/adminRepository.ts` (lines 601–615), the four retrieval methods (`getHeroBillboardMovies()`, `getCustomerNewReleases()`, `getCustomerTrendingMovies()`, and `getCustomerPopularMovies()`) all execute the identical underlying call: `this.getMovies()`, which queries `catalogApi.listTitles({ type: "movie", limit: 100 })`. When the database contains a modest initial catalog (e.g., 1 to 4 published titles), all three rails and the hero billboard display the exact same movies in identical order, resulting in an immediate customer perception of a repetitive and broken UI.

2. **The Detail Route Mock-Data Architectural Disconnect:**  
   While the homepage (`src/app/page.tsx`) and catalog grid (`src/app/movies/page.tsx`) query PostgreSQL via `catalogApi.listTitles()`, the movie detail page (`src/app/movies/[slug]/page.tsx`, line 12), the search page (`src/app/search/page.tsx`, line 11), the search drawer (`src/components/customer/SearchDrawer.tsx`, line 19), and all category/country/DJ subpages import directly from `@/data/mock/customerData`. Consequently:
   - Any new title published in PostgreSQL by Admin or Media Team appears on the homepage, but clicking its card triggers `notFound()` (HTTP 404) on `/movies/[slug]`.
   - The search interface is completely blind to live database additions.

3. **Commercial Disconnect in Instant Checkout (`LipaModal.tsx`):**  
   When a user clicks "Watch" or "Lipa" on a movie card or billboard, `openLipa()` is called without an `offerId`. In `LipaModal.tsx` (lines 97–116), the checkout logic falls back to `commercialApi.listOffers()` and grabs whichever offer happens to be active in PostgreSQL (often an access pass or a different movie entirely). If no offers are active, checkout aborts with an error.

4. **Simulated Trailer Playback:**  
   `TrailerModal.tsx` does not render a video element or YouTube iframe; it displays a static mock frame with a pulsing play icon and a hardcoded timer (`00:42 / 02:18`).

5. **Design System & Typography Underutilization:**  
   Although `Bebas Neue` and `Space Grotesk` are loaded in `src/app/layout.tsx` and declared in `src/app/globals.css`, virtually all customer components rely on generic `font-sans` (Manrope) and `font-mono`. Movie cards lack mobile touch action visibility (`hidden sm:flex`), and small-screen viewports (360px) suffer from button wrapping that collides with carousel controls.

---

## 2. INVESTIGATION SCOPE AND LIMITATIONS

### Scope of Inspection
- **Frontend Architecture:** Next.js 16.3.5 App Router, React 19.2.8, Tailwind CSS v4, Context providers (`AuthProvider`, `NotificationProvider`, `CustomerProvider`).
- **Customer Pages:** 14 customer routes (`/`, `/movies`, `/movies/[slug]`, `/series`, `/series/[slug]`, `/categories`, `/categories/[slug]`, `/countries`, `/countries/[slug]`, `/djs`, `/djs/[slug]`, `/library`, `/subscriptions`, `/watch/[slug]`, `/search`, and `/account/*`).
- **Interactive Modals:** `LipaModal`, `TrailerModal`, `SearchDrawer`.
- **Backend API Integration:** `catalogApi`, `commercialApi`, `downloadApi`, `deviceApi`, `authApi`.
- **Database Alignment:** Schema migrations `0000_init_core.sql` through `0013_device_sessions_hardening.sql`, and seed script `backend/scripts/seed-local-demo.mjs`.

### Explicit Limitations Maintained:
- **Strict Read-Only Mode:** Zero code edits, zero styling tweaks, zero configuration alterations.
- **Integrity Verification:** Protected ARCH-19 SHA-256 (`12ed1bc5...`) and Migration 0013 SHA-256 (`7a9f6db7...`) remain bit-for-bit pristine.
- **Zero Real Transactions:** No mobile money push requests initiated; no media asset mutations or uploads executed.

---

## 3. PHASE A — FRONTEND ARCHITECTURE MAP

The application follows Next.js App Router conventions with a centralized context hierarchy:

```
[ RootLayout (src/app/layout.tsx) ]
  ├── Fonts: Bebas Neue (--font-bebas), Manrope (--font-manrope), Space Grotesk (--font-space)
  ├── AuthProvider (AuthContext.tsx) -> Session state via /api/v1/auth/me
  │     └── NotificationProvider (NotificationContext.tsx) -> SSE /api/v1/notifications/stream
  │           └── CustomerProvider (CustomerContext.tsx) -> Modals, Cart, Profile, Entitlements
  │                 └── Page Component (e.g., src/app/page.tsx)
  │                       ├── CustomerHeader (CustomerHeader.tsx)
  │                       │     ├── CustomerBrandLogo
  │                       │     ├── Search Trigger (⌘K) -> SearchDrawer
  │                       │     ├── NotificationBell
  │                       │     └── Profile / Auth Dropdown
  │                       ├── Main Content (Hero, Rails, Grids)
  │                       ├── Global Modals:
  │                       │     ├── TrailerModal (TrailerModal.tsx)
  │                       │     ├── LipaModal (LipaModal.tsx)
  │                       │     └── SearchDrawer (SearchDrawer.tsx)
  │                       └── CustomerFooter (CustomerFooter.tsx)
```

---

## 4. CUSTOMER ROUTE INVENTORY

| Route | File Path | Data Source | Backing API / Entity | Status & Observations |
|---|---|---|---|---|
| `/` | `src/app/page.tsx` | `adminRepository` | `catalogApi.listTitles()` | Live DB for movies/taxonomies; rails duplicate same 3 movies. |
| `/movies` | `src/app/movies/page.tsx` | `adminRepository` | `catalogApi.listTitles()` | Live DB; client-side filtering by genre/DJ; sorting works. |
| `/movies/[slug]` | `src/app/movies/[slug]/page.tsx` | Mock Data | `customerData.ts` (`getMovieBySlug`) | **Architectural Disconnect:** 404s on dynamic PostgreSQL titles. |
| `/series` | `src/app/series/page.tsx` | Mock Data | `customerData.ts` (`customerSeries`) | Hardcoded mock series. Backend has polymorphic title support. |
| `/series/[slug]` | `src/app/series/[slug]/page.tsx` | Mock Data | `customerData.ts` (`getSeriesBySlug`) | Hardcoded mock series detail. |
| `/categories` | `src/app/categories/page.tsx` | Mock Data | `customerData.ts` (`customerCategories`)| Hardcoded categories hub. `contentCount` is hardcoded. |
| `/categories/[slug]`| `src/app/categories/[slug]/page.tsx` | Mock Data | `customerData.ts` | Filtered from static mock array. |
| `/countries` | `src/app/countries/page.tsx` | Mock Data | `customerData.ts` (`customerCountries`) | Hardcoded countries hub. |
| `/countries/[slug]` | `src/app/countries/[slug]/page.tsx` | Mock Data | `customerData.ts` | Filtered from static mock array. |
| `/djs` | `src/app/djs/page.tsx` | Mock Data | `customerData.ts` (`customerDjs`) | Hardcoded DJ roster hub. |
| `/djs/[slug]` | `src/app/djs/[slug]/page.tsx` | Mock Data | `customerData.ts` | Filtered from static mock array. |
| `/library` | `src/app/library/page.tsx` | Live Backend | `commercialApi.getMyLibrary()`, `downloadApi.getLicenses()` | **Authentic:** Real entitlements, download counts, and R2 signed URLs. |
| `/subscriptions` | `src/app/subscriptions/page.tsx` | Mock Data | `customerData.ts` (`customerPlans`) | Displays 4 VIP tiers; triggers `openLipa()` with mock plan IDs. |
| `/watch/[slug]` | `src/app/watch/[slug]/page.tsx` | Mock Data + Live API | `customerData.ts` + `downloadApi` | Streaming locked (HTTP 503 Phase 8); R2 offline download works. |
| `/search` | `src/app/search/page.tsx` | Mock Data | `customerData.ts` | Client-side filter on mock items; ignores backend `/catalog/search`. |
| `/account/orders` | `src/app/account/orders/page.tsx` | Live Backend | `commercialApi.getCustomerOrders()` | **Authentic:** Paginated orders, status badges, amounts in TSh. |
| `/account/devices`| `src/app/account/devices/page.tsx` | Live Backend | `deviceApi.listDevices()`, `removeDevice()`| **Authentic:** Device session control with fingerprint metadata. |
| `/account/security`| `src/app/account/security/page.tsx`| Live Backend | `authApi.changePassword()`, `logoutAll()`| **Authentic:** Password rotation and global session revocation. |

---

## 5. CURRENT HOMEPAGE AUDIT

The current homepage layout (`src/app/page.tsx`) stack:

```
+-------------------------------------------------------------------------+
| CustomerHeader (Fixed: Logo, Links, Search ⌘K, Library, Bell, Auth)     |
+-------------------------------------------------------------------------+
| 1. HeroBillboard (Carousel: 68vh, Ken-Burns, Scrim, 3 Action Buttons)    |
+-------------------------------------------------------------------------+
| [Continue Watching] (Conditionally rendered if authenticated)           |
+-------------------------------------------------------------------------+
| 2. ContentRail: "New Releases" (Recently Uploaded & Dubbed)             |
+-------------------------------------------------------------------------+
| 3. ContentRail: "Trending Movies" (Top 10 In East Africa, #1..#10 Ranks) |
+-------------------------------------------------------------------------+
| 4. ContentRail: "Popular Movies" (Most Watched & Downloaded)            |
+-------------------------------------------------------------------------+
| 5. CategoryRail (Grid of 6 genre cards, "0 titles")                    |
+-------------------------------------------------------------------------+
| 6. CountryRail (Grid of 6 country cards, "0 movies")                    |
+-------------------------------------------------------------------------+
| 7. DjSpotlightRail (Horizontal rail of DJ cards, "0 Releases")          |
+-------------------------------------------------------------------------+
| 8. VipPassPromoBanner (Gold VIP Callout Banner)                         |
+-------------------------------------------------------------------------+
| CustomerFooter (Brand, Links, Telco Badges, Disclaimer, Copyright)      |
+-------------------------------------------------------------------------+
```

### Forensic Critique of Current Homepage:
1. **Content Cannibalization & Repetition:**  
   Because `adminRepository.ts` maps `getHeroBillboardMovies()`, `getCustomerNewReleases()`, `getCustomerTrendingMovies()`, and `getCustomerPopularMovies()` to the single endpoint `GET /api/v1/catalog/titles`, a catalog of 3 movies creates 12 identical movie card impressions within 1200 vertical pixels.
2. **Missing Empty/Single-Item Guard:**  
   If the catalog contains 1 title, the Hero Billboard shows 1 slide, and Rails 1, 2, and 3 each show a single card aligned to the far left with vast black empty space spanning the right 80% of the screen.
3. **Ghost Metadata (Zero Counts):**  
   Every category card shows `0 titles`, every country card shows `0 movies`, and every DJ card shows `0 Releases` because backend taxonomies (`/catalog/taxonomies`) do not compute aggregate title counts on the fly.

---

## 6. MOVIE CARD AND CATALOG AUDIT

### MovieCard (`src/components/customer/MovieCard.tsx`) Anatomy:

```
+--------------------------------------------------+
| [#1 Rank / VIP Pick / 4K HD]      [ ★ 8.9 Rating]|
|                                                  |
|                                                  |
|                   2:3 PORTRAIT                   |
|                   POSTER IMAGE                   |
|                                                  |
|                                                  |
| [ DJ Afro Edition Pill ]                         |
| Bongo Secret Agent: Serengeti Strike             |
| 2024  •  Action  •  TSh 1,500                    |
|--------------------------------------------------|
| [ ▶ Watch ]               [ 🎞 Trailer ]         | <- Hidden on mobile (<640px)
+--------------------------------------------------+
```

### Forensic Deficiencies:
1. **Mobile Quick-Action Inaccessibility:**  
   The bottom action buttons are styled with `hidden sm:flex ... opacity-0 group-hover:opacity-100`. On touch devices (smartphones and tablets without mouse hover), users can never trigger direct Lipa checkout or trailer preview from the card; they must tap through to the detail page.
2. **Image Loading Vulnerability:**  
   Uses raw `<img>` tags (`<img src={movie.posterUrl} loading="lazy" ...>`) with an inline `onError` fallback to an Unsplash URL. It lacks responsive `srcset`, Next.js image optimization, and intrinsic aspect ratio preservation during network latency.
3. **Information Density Imbalance:**  
   On desktop cards (`w-56`), title lines are clamped to 1 line (`line-clamp-1`), truncating evocative Swahili titles such as *"Bongo Secret Agent: Serengeti Strike"* to *"Bongo Secret Agent: Seren..."*.
4. **Multiple DJ Representation:**  
   If a movie has 3 DJ editions (e.g., DJ Afro, DJ Smith, DJ Murphy), the card only displays `movie.availableDjs[0]`. There is no visual indicator that other commentators are available.

---

## 7. MOVIE DETAILS AUDIT (`/movies/[slug]`)

### Component Architecture & Features:
- **Hero Billboard Backdrop:** Full-bleed backdrop with `animate-kenburns` and radial/linear scrims.
- **DJ Edition Switcher:** Selectable radio cards allowing customer to switch between DJ Afro, DJ Smith, etc., dynamically updating price and duration.
- **Dual Pass Purchase Matrix:** Distinct cards for 48-Hour Streaming Access (TSh 1,500) vs. Lifetime/Permanent Offline Download License (TSh 2,500).
- **Entitlement Awareness:** When authenticated, checks `CustomerContext.entitlements` to change "WATCH / LIPA" to "PLAY STREAM NOW" or "DOWNLOAD NOW".

### Critical Defect:
- **Mock Data Coupler (P0):**  
  Line 12: `import { getMovieBySlug, customerMovies } from "@/data/mock/customerData";`  
  Line 39: `const movie = getMovieBySlug(slug);`  
  If `movie` is not found in `customerData.ts`, it immediately calls Next.js `notFound()`. Real database content is completely unreachable on the detail page.

---

## 8. SEARCH AND DISCOVERY AUDIT

### Implementation Comparison:

| Feature | `SearchDrawer.tsx` (Global ⌘K) | `/search` Page | Backend Support (`/catalog/search`) |
|---|---|---|---|
| Trigger | Header button or `⌘K` / `Ctrl+K` | Direct URL `/search?q=...` | HTTP `GET /api/v1/catalog/search?q=...` |
| Execution | Client-side in-memory filter | Client-side in-memory filter | Full PostgreSQL `ILIKE` on title, originalTitle, description |
| Data Source | `@/data/mock/customerData` | `@/data/mock/customerData` | Real `movies`, `categories`, `countries`, `voice_artists` |
| Live Titles | **Inaccessible** | **Inaccessible** | **Fully supported** |
| Debounce | None (triggers on every keystroke) | None | Supported via query params |

**Forensic Finding:**  
The frontend contains two parallel search implementations (`SearchDrawer` and `/search`), both hardwired to mock data arrays, completely bypassing the fully operational backend `CustomerCatalogController.searchTitles()` endpoint.

---

## 9. CUSTOMER LIBRARY AND ACCOUNT AUDIT

Unlike the catalog discovery routes, the Customer Library (`/library`) and Account Management pages (`/account/*`) are **genuinely connected to backend microservices**:

1. **Active Access Passes (`/library?tab=passes`):**
   - Connected to `commercialApi.getMyLibrary()`.
   - Distinguishes between catalog-wide VIP grants (`CATALOG`) and title-specific stream passes (`EXACT`).
   - Renders live countdown badges showing expiration dates.
2. **Offline Download Licenses (`/library?tab=downloads`):**
   - Connected to `downloadApi.getLicenses()`.
   - Displays authorized devices, remaining download attempts, and triggers `downloadApi.authorizeDownload()` which returns signed Cloudflare R2 URLs (900s expiration TTL).
3. **Order & Payment Receipts (`/account/orders`):**
   - Connected to `commercialApi.getCustomerOrders()`.
   - Supports cursor-based pagination and displays real M-Pesa / Tigo Pesa transaction references.
4. **Device Management (`/account/devices`):**
   - Connected to `deviceApi.listDevices()` and `deviceApi.removeDevice()`.
   - Accurately tracks registered customer devices against the 3-device limit enforced by ARCH-19.

---

## 10. CHECKOUT AND PAYMENT UI AUDIT (`LipaModal.tsx`)

```
+------------------------------------------------------------+
| [Card Icon] LIPA Instant Mobile Checkout                [X]|
| Streaming Access / Offline Download License                |
+------------------------------------------------------------+
| Target: Bongo Secret Agent: Serengeti Strike               |
| Edition: DJ Afro Dub Edition (48 Hours Access)             |
| Amount Due: TSh 1,500                                      |
+------------------------------------------------------------+
| Select Mobile Network:                                     |
| [ (•) Vodacom M-Pesa ]   [ ( ) Tigo Pesa ]                 |
| [ ( ) Airtel Money   ]   [ ( ) Halopesa  ]                 |
+------------------------------------------------------------+
| Mobile Phone Number:                                       |
| [ +255 | 0754 123 456                                    ] |
+------------------------------------------------------------+
| [✓] Immediate Digital Delivery Waiver Checkbox             |
| "I acknowledge immediate digital delivery upon payment..." |
+------------------------------------------------------------+
| [ 💳 PAY NOW VIA M-PESA PUSH (TSh 1,500) ]                 |
+------------------------------------------------------------+
| Status States:                                             |
| 1. Select -> 2. Push Prompt Sent -> 3. Polling -> 4. Done  |
+------------------------------------------------------------+
```

### Forensic Deficiencies:
1. **Disconnected Offer Resolution:**  
   `openLipa()` is invoked with `itemTitle`, `itemType`, `amountTsh`, and `itemSlug`, but **no `offerId`**.  
   `handlePay()` attempts to resolve an offer by listing all offers via `commercialApi.listOffers()` and picking the first active one. If the first active offer in PostgreSQL is a 30-Day VIP Pass (TSh 10,000), an order for the VIP Pass is generated instead of the movie rental, creating a critical billing discrepancy.
2. **Simulated Polling Fallback:**  
   If the backend does not update the order status within 60 seconds (30 attempts at 2s intervals), line 157 arbitrarily transitions the UI to `step = "success"`, falsely telling the customer that their payment was successful.

---

## 11. RESPONSIVE DEVICE AUDIT

| Viewport | Device Class | Observed Behavior | Deficiencies & Vulnerabilities |
|---|---|---|---|
| **360 × 800** | Small Mobile | Layout functional; single-column rails; hamburger menu active. | **Critical Collision:** Hero action buttons wrap into 3 vertical rows, overlapping slide indicator capsules at `bottom-6 right-6`. Card hover buttons inaccessible. |
| **390 × 844** | Standard Mobile | 1.8 cards visible per rail (peek effect); smooth horizontal scroll. | Card title truncation severe. Modal bottom sheets touch screen edges without margin. |
| **430 × 932** | Large Mobile | Clean visual presentation; good card proportion. | Same mobile touch limitation (hover buttons missing). |
| **768 × 1024** | Tablet (Portrait) | 3 cards visible per rail; desktop nav collapses to hamburger. | Hero billboard text feels stretched across wide viewport without proportional height increase. |
| **1280 × 800** | Small Laptop | Full desktop nav visible; 5 cards per rail; scroll arrows appear. | Rails with only 3 movies leave 40% empty void on the right. |
| **1440 × 900** | Desktop Standard | High aesthetic quality; Ken-Burns backdrop animation smooth. | Repetitive rail content glaringly obvious across 3 vertical viewports. |
| **1920 × 1080**| Large Desktop | Max-width constraint (`max-w-7xl` = 1280px) centers layout with vast black side gutters. | Hero image banner stretches; side gutters feel uncinematic compared to edge-to-edge OTT layouts. |

---

## 12. EXISTING DESIGN SYSTEM INVENTORY

### CSS Variables & Palette Tokens (`src/app/globals.css`):
- `--color-canvas`: `#000000` (Pitch Black)
- `--color-canvas-base`: `#08090C` (OLED Dark Charcoal)
- `--color-surface`: `#111318` (Card Surface)
- `--color-surface-elevated`: `#181A21` (Hover & Control Surface)
- `--color-surface-card`: `#121317`
- `--color-crimson`: `#E50914` (Cinema Red / Brand Accent)
- `--color-crimson-core`: `#B11226`
- `--color-gold`: `#F59E0B`
- `--color-gold-vip`: `#D6A84F` (VIP Pass Gold Accent)
- `--color-green-tsh`: `#10B981` (Tanzanian Shilling Price Green)
- `--color-border-subtle`: `#262932`
- `--color-border-glass`: `rgba(255, 255, 255, 0.08)`

### Typography Forensics:
- **Declared in `layout.tsx`:** `Bebas Neue` (`--font-bebas`), `Manrope` (`--font-manrope`), `Space Grotesk` (`--font-space`).
- **Actual Component Usage:**
  - `font-sans`: Resolves to Manrope (clean, legible body font).
  - `font-mono`: Resolves to system monospace for price tags, timestamps, and badges.
  - `font-bebas`: **0 occurrences in customer components.** The bold, condensed cinematic display font specifically loaded for movie titles is never utilized in `HeroBillboard.tsx` or `MovieCard.tsx`.

---

## 13. CINEMATIC DESIGN RESEARCH (BENCHMARKS & PRINCIPLES)

To elevate GIFTEDproMovies3 to a world-class cinematic standard without mimicking generic streaming clones, four premier entertainment platforms were forensically benchmarked:

### 1. MUBI (The Master Reference for Small Catalogs)
- **Core Principle:** *"Curated Scarcity as a Premium Virtue."*
- **Application to GIFTEDproMovies3:** MUBI operates with a focused selection of titles. Instead of pretending to have 50,000 movies by rendering empty horizontal rails, MUBI presents a prominent **"Movie of the Day"**, followed by deep editorial essays, director retrospectives, and rich visual stills.
- **Actionable Rule:** When GIFTEDproMovies has 1–5 titles, the UI should pivot from a multi-rail warehouse layout to an **Editorial Spotlight Showcase**, emphasizing the Swahili voice artist"s commentary and full-bleed cinematic imagery.

### 2. Apple TV+ (Immersive Atmosphere & Scrim Craft)
- **Core Principle:** *"Edge-to-edge key art with architectural typography and restrained UI chrome."*
- **Application to GIFTEDproMovies3:** Apple TV+ utilizes fluid 16:9 and 21:9 key art with multi-stop linear and radial scrims that dissolve seamlessly into deep OLED black (`#08090C`). UI elements float gracefully with subtle translucent glassmorphism (`backdrop-filter: blur(24px)`).
- **What NOT to Copy:** Apple"s heavy dependence on multi-million-dollar custom motion title treatments.

### 3. A24 (Boutique Cultural Identity)
- **Core Principle:** *"Film as an exclusive cultural artifact."*
- **Application to GIFTEDproMovies3:** In East Africa, DJ commentary (DJ Afro, DJ Smith) turns foreign films into localized cultural phenomena. A24 treats audio tracks and stems as premier collector items. GIFTEDproMovies should elevate the DJ from a tiny badge pill to a **co-featured artist profile** with commentary soundbites.

### 4. Netflix (What to Avoid Under Small Catalog)
- **Anti-Pattern Warning:** Netflix relies entirely on algorithmic rails (Trending, Top 10, Because You Watched). When applied to a catalog of 3 titles, this pattern completely collapses, generating identical duplicate rails that destroy user trust.

---

## 14. FRONTEND-TO-BACKEND DATA CONTRACT MATRIX

| UI Claim / Section | Frontend Implementation | Real Backend Support | Contract Status | Forensic Recommendation |
|---|---|---|---|---|
| **Hero Billboard** | `HeroBillboard.tsx` | `GET /catalog/titles` | **Partial** | Needs backend `is_featured_billboard` filtering; do not show all catalog titles in hero. |
| **New Releases** | `ContentRail.tsx` | `GET /catalog/titles` | **Partial** | Must sort by `published_at DESC` on backend; limit to genuinely new titles. |
| **Trending Movies** | `ContentRail.tsx` | None in backend | **Unverified** | Backend lacks analytical trending engine. Rails currently show arbitrary movies with fake `#1..#10` badges. |
| **Popular Movies** | `ContentRail.tsx` | None in backend | **Unverified** | Backend has no view/download counter query on public endpoint. Rail duplicates catalog. |
| **Movie Details** | `/movies/[slug]` | `GET /catalog/titles/:slug` | **Broken** | Detail page imports mock data! Must switch to `catalogApi.getTitleBySlug(slug)`. |
| **Offline Download** | `/library`, `/movies/[slug]` | `POST /downloads/authorize` | **Verified Real** | Backend validates exact entitlement or VIP pass, generates 900s signed Cloudflare R2 URL. |
| **Live Streaming** | `/watch/[slug]` | HTTP 503 (Disabled) | **Verified Real** | Respects Phase 8 lockdown. Displays clear countdown notice. |
| **Lipa Mobile Money** | `LipaModal.tsx` | `POST /commercial/checkout` | **Vulnerable** | Frontend fails to pass `offerId`. Order binds to random offer. Must wire explicit offer resolution. |
| **Device Limit (3)** | `/account/devices` | `GET/DELETE /devices` | **Verified Real** | Hardware fingerprinting and device eviction fully operational. |

---

## 15. ACCESSIBILITY AND PERFORMANCE FINDINGS

### Accessibility Audit (WCAG 2.1 AA):
1. **Focus Trapping Missing in Modals:** `TrailerModal`, `SearchDrawer`, and `LipaModal` do not trap tab focus. Keyboard users can tab into background page elements while the modal is open.
2. **Text Contrast Deficiencies:**  
   - Monospace secondary labels (`text-gray-500` / `#6B7280`) on pitch black (`#08090C`) exhibit a contrast ratio of **3.8:1**, failing the WCAG AA minimum threshold of **4.5:1** for normal text.
   - Gold badge text (`#D6A84F`) on translucent gold background (`rgba(214,168,79,0.15)`) requires a darker backing scrim for optimal legibility.
3. **Screen Reader Semantic Hierarchy:**  
   The homepage skips from `<h1>` in the Hero Billboard to `<h3>` inside the Continue Watching card without an intermediate `<h2>`.

### Performance Forensics:
1. **Unoptimized Image Payload:**  
   The application uses raw `<img>` tags throughout (`src/components/customer/MovieCard.tsx`, line 24). High-resolution Unsplash backdrops (1200px+) are loaded without WebP/AVIF compression or modern responsive `sizes` attributes, causing Largest Contentful Paint (LCP) delays.
2. **Component Re-Render Cascades:**  
   In `src/app/page.tsx`, `loadData()` triggers 7 discrete state setter calls (`setHeroList`, `setReleasesList`, `setTrendingList`, etc.) rather than a unified state dispatch, triggering multiple intermediate reconciliation passes.

---

## 16. PRIORITIZED UX/UI FINDINGS

| ID | Severity | Affected Area | Observed Behavior & Root Cause | Customer Impact | Recommendation Type |
|---|---|---|---|---|---|
| **P0-1** | **P0 Critical** | `/movies/[slug]` | Hardcoded mock data import (`getMovieBySlug`). Real PostgreSQL movies return HTTP 404. | Customers cannot view or purchase newly published movies. | **Frontend-Only** |
| **P0-2** | **P0 Critical** | `LipaModal.tsx` | Checkout does not receive explicit `offerId`; grabs first arbitrary offer in database. | Customer pays for wrong item or checkout crashes. | **Frontend-Only** |
| **P1-1** | **P1 High** | `src/app/page.tsx` | All 3 homepage rails query `getMovies()`, repeating identical 3 movies 3 times vertically. | Interface looks broken, repetitive, and untrustworthy. | **Frontend-Only** (Dynamic layout adapt) |
| **P1-2** | **P1 High** | `SearchDrawer` & `/search` | Both search interfaces query mock array; completely blind to backend database. | Search returns zero results for real movies. | **Frontend-Only** |
| **P1-3** | **P1 High** | `CategoryRail` & `CountryRail` | Taxonomies display hardcoded `"0 titles"` and `"0 movies"`. | Gives false impression of an empty platform. | **Frontend-Only** (Hide count or compute) |
| **P1-4** | **P1 High** | `TrailerModal.tsx` | Mock player with pulsing icon and hardcoded timer; no real video or trailer stream. | Frustrating dead-end for customers previewing content. | **Frontend-Only** (Embed video or notice) |
| **P2-1** | **P2 Medium** | `MovieCard.tsx` | Action buttons have `hidden sm:flex`; invisible to touch screen users. | Mobile customers cannot trigger quick Lipa or preview. | **Frontend-Only** |
| **P2-2** | **P2 Medium** | `HeroBillboard.tsx` | 3 buttons wrap on 360px viewport, colliding with slide indicator capsules. | Visual breakage and unclickable controls on small phones. | **Frontend-Only** |
| **P2-3** | **P2 Medium** | Layout & Headers | `Bebas Neue` font declared in layout but unused across all components. | Platform lacks distinct cinematic typography. | **Frontend-Only** |
| **P3-1** | **P3 Low** | All Media Cards | Raw `<img>` tags without Next.js optimization or blur placeholders. | Slower page loads and cumulative layout shifts. | **Frontend-Only** |

---

## 17. RECOMMENDED CUSTOMER EXPERIENCE ARCHITECTURE

### The "Adaptive Catalog Density" Strategy:
The frontend must adapt its homepage structure based on the **actual quantity of published titles**:

```
IF (Total Published Movies <= 5):
    RENDER: "Boutique Editorial Cinema Layout"
    ├── 1. Grand Hero Showcase (Primary Blockbuster with DJ audio snippet)
    ├── 2. Editorial Spotlight Deck (Featured Titles displayed as rich landscape cards with synopsis & DJ roster)
    ├── 3. DJ Masters Showcase (Interactive voice artist selector displaying their specific titles)
    ├── 4. VIP All-Access Cinema Pass Banner
    └── (DO NOT render redundant New Releases / Trending / Popular rails)

ELSE IF (Total Published Movies > 5):
    RENDER: "Dynamic Multi-Rail Cinema Layout"
    ├── 1. Grand Hero Billboard Carousel
    ├── 2. Continue Watching (if authenticated)
    ├── 3. New Releases Rail (Filtered by published_at)
    ├── 4. Featured Collections Rail
    ├── 5. DJ Spotlight Rail
    ├── 6. Browse by Category & Country
    └── 7. VIP All-Access Callout
```

### Cinematic Visual Enhancements:
1. **Typography Elevation:** Apply `font-bebas` (`Bebas Neue`) to all major movie titles in Hero Billboard and detail headers with letter-spacing tracking (`tracking-wide`).
2. **True Mobile Card Design:** On mobile viewports (<640px), replace hover buttons with an always-visible, compact action pill (e.g., `TSh 1,500 • Watch`).
3. **DJ Co-Star Treatment:** Feature the DJ commentator"s badge with distinct colored accents (e.g., DJ Afro crimson, DJ Smith electric blue, DJ Murphy emerald) so customers immediately identify the commentary style.

---

## 18. ALTERNATIVE DESIGN DIRECTIONS AND TRADE-OFFS

### Direction A: "Pure OTT Streaming Replica" (Netflix / Prime clone)
- *Concept:* Standard horizontal scrolling poster carousels with top 10 badges.
- *Pros:* Familiar to users.
- *Cons:* Complete disaster when catalog is small (1–5 movies). Exposes empty rails and content duplication.
- *Recommendation:* **Reject.**

### Direction B: "Boutique Editorial Film Club" (MUBI / Criterion / A24 Hybrid) — **RECOMMENDED**
- *Concept:* High-impact visual storytelling, grand heroic photography, curated spotlights, audio commentator prominence.
- *Pros:* Looks ultra-premium whether catalog has 2 movies or 200 movies. Celebrates the uniqueness of Swahili DJ translations.
- *Cons:* Requires disciplined editorial metadata (good backdrop images and synopses).
- *Recommendation:* **Adopt.**

---

## 19. PROPOSED DESIGN PRINCIPLES

1. **Honesty Over Simulation:** Never render duplicate movie cards to make the catalog look bigger. Never show fake trailers or unverified trending algorithms.
2. **Audio Artists as Headliners:** In East African cinema culture, the DJ is as famous as the Hollywood lead actor. The UI must treat DJ commentators as primary navigation anchors.
3. **Mobile-First Touch Ergonomics:** Touch targets must be at least 44×44px. Critical actions (Watch, Download, Trailer) must never be hidden behind hover states on touch screens.
4. **Cinematic Dark Immersion:** Preserve OLED true black (`#08090C` / `#000000`) with multi-directional gradients that let movie artwork bleed into the canvas.

---

## 20. TECHNICAL DEPENDENCIES AND RISKS

1. **Zero Database Migrations Required:** All discovery and proposed remediations are 100% frontend and client-routing architecture. PostgreSQL schema (0000–0013) remains untouched.
2. **Backend API Readiness:** Backend controllers (`CustomerCatalogController`, `CustomerCommercialController`, `DownloadController`) already provide the required endpoints (`GET /catalog/titles/:slug`, `GET /catalog/search`, etc.).
3. **Safe Redesign Boundaries:** Modifying customer presentation will not impact Admin (`/admin/*`) or Media Team (`/media-team/*`) portals.

---

## 21. UNANSWERED QUESTIONS REQUIRING PRODUCT OWNER INPUT

1. **Homepage Rail Threshold:** Do you approve switching to the "Boutique Editorial Showcase" layout whenever the published movie count is below 6?
2. **Trailer Modal Strategy:** When no authentic MP4 or YouTube trailer URL exists for a title, should the UI:
   - Option A: Hide the "Watch Trailer" button entirely.
   - Option B: Open the trailer modal showing a certified 30-second audio/video preview snippet.
3. **Commercial Offer Mapping:** For pay-per-movie rentals, should the frontend automatically query `catalogApi.getTitleBySlug(slug)` to retrieve the edition"s specific `offerId`, or should the backend provide an explicit `/catalog/titles/:slug/offers` endpoint?

---

## 22. EVIDENCE APPENDIX: FILES, ROUTES & CONTRACTS INSPECTED

### Frontend Files Inspected:
- `src/app/page.tsx` (Homepage architecture and rail duplication)
- `src/app/movies/page.tsx` (Catalog grid and filtering)
- `src/app/movies/[slug]/page.tsx` (Detail view mock data dependency)
- `src/app/watch/[slug]/page.tsx` (Phase 8 streaming gate and R2 download)
- `src/app/library/page.tsx` (Live customer entitlements and license management)
- `src/app/subscriptions/page.tsx` (VIP pass matrix)
- `src/app/search/page.tsx` & `src/components/customer/SearchDrawer.tsx` (Mock search)
- `src/components/customer/HeroBillboard.tsx` (Billboard carousel & mobile controls)
- `src/components/customer/MovieCard.tsx` (Card anatomy and hover button restrictions)
- `src/components/customer/LipaModal.tsx` (Mobile money checkout flow & offer resolution)
- `src/components/customer/TrailerModal.tsx` (Trailer modal mock canvas)
- `src/components/customer/CategoryRail.tsx`, `CountryRail.tsx`, `DjSpotlightRail.tsx` (Taxonomy rails)
- `src/lib/repositories/adminRepository.ts` (Dynamic discovery methods lines 601–615)
- `src/data/mock/customerData.ts` (Mock catalog data)
- `src/app/globals.css` & `src/app/layout.tsx` (Design tokens & typography)

### Backend Controllers & Contracts Inspected:
- `backend/src/modules/catalog/controllers/customer-catalog.controller.ts` (Titles, Slugs, Taxonomies, Search)
- `backend/src/modules/commercial/controllers/customer-commercial.controller.ts` (Orders, Library, Checkout)
- `backend/src/modules/download/controllers/download.controller.ts` (License check, R2 authorization)
- `backend/scripts/seed-local-demo.mjs` (3 published demo titles)

---
*End of Forensic Discovery Report. Awaiting Product Owner Briefing Review.*
