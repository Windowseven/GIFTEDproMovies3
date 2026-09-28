# GIFTEDproMovies — System Architecture, Modules & Business Logic Specification

> **Target Audience:** Backend Engineers, System Designers, Product Managers, and Technical Leads.  
> **Purpose:** Provide a complete functional breakdown of the platform—how the business operates, how each module works, the rules governing data transitions, and why specific design decisions were made—**before any API integration begins**.

---

## 1. Domain Background & Cultural Realities

### 1.1 What is GIFTEDproMovies?
In East Africa (Tanzania, Kenya, Uganda, DRC, Rwanda, and the diaspora), millions of viewers prefer watching foreign films and series translated into Swahili by famous voiceover commentators known as **Video Deejays (DJs)**.

Prominent DJs like **DJ Afro Amigo**, **DJ Murphy**, **DJ Mack**, **DJ Black**, and **DJ Ally** do far more than translate dialogue:
* They provide comedic narration, cultural context, and scene commentary.
* They explain complex plot lines so viewers of all backgrounds can follow along.
* Many viewers choose *who* to watch (e.g., "I only watch action movies translated by DJ Afro") rather than searching by the original Hollywood actor or director.

### 1.2 The Golden Rule of Swahili Cinema: Embedded (Hard-Muxed) Audio
In Hollywood streaming (Netflix, Apple TV), a single video file has multiple audio tracks (English, French, Spanish) that can be switched on the fly.

**In Swahili DJ cinema, this is technically and culturally impossible:**
* The DJ's voice is **physically recorded and burned directly into the video file's audio track** alongside the sound effects.
* **Core Rule:** **You cannot change a movie's DJ without replacing the video file.**
* If *Godzilla x Kong* is translated by DJ Afro and also by DJ Murphy:
  - There is **one** movie container (*Godzilla x Kong*).
  - Inside that container, there are **two distinct Video Editions**:
    1. `DJ Afro Edition` (points to `godzilla_dj_afro_1080p.mp4`)
    2. `DJ Murphy Edition` (points to `godzilla_dj_murphy_1080p.mp4`)
* When a customer picks DJ Murphy on the website or app, the player **must load DJ Murphy's dedicated video file**.

---

## 2. Complete Inventory of System Modules

The system is organized into **12 core operational modules** across four functional domains:
1. **Public & Customer Modules:** Discovery, Movie Experience, Series Experience, Monetization & Checkout, Cinema Playback, Customer Library.
2. **Media Team Operations Modules:** In-Flow Intake Studio, DJ Editions Manager, Content Readiness Engine.
3. **Admin Governance Modules:** Publishing Approval Gate, Taxonomies & Roster, Financial Intelligence & Reconciliation.
4. **Platform Infrastructure & Security Modules:** Authentication, Authorization & RBAC, Notification & Alerting Engine.

```text
+=============================================================================+
|                      GIFTEDproMovies SYSTEM ARCHITECTURE                    |
+=============================================================================+

 [1. CUSTOMER PORTAL]              [2. MEDIA TEAM STUDIO]     [3. ADMIN GOVERNANCE]
  (/, /movies, /series)             (/media-team)              (/admin)
          |                                 |                          |
          v                                 v                          v
 +----------------------+         +----------------------+   +----------------------+
 | Catalog & Discovery  |         | Single-Pass Ingest   |   | Executive KPIs       |
 |  - Billboard Hero    |         |  - Metadata & Art    |   |  - Revenue Today/Mo  |
 |  - Taxonomies/Search |         |  - Master File Drop  |   |  - Target Tracking   |
 +----------+-----------+         +----------+-----------+   +----------+-----------+
            |                                |                          |
            v                                v                          v
 +----------------------+         +----------------------+   +----------------------+
 | Movie & DJ Editions  |         | DJ Editions Manager  |   | Publishing Gate      |
 |  - Burned-in Audio   | <====== |  - +Add DJ Edition   |   |  - Require Approval  |
 |  - Afro, Murphy, etc |         |  - Stream/DL files   |   |  - 1-Click Approve   |
 +----------+-----------+         +----------+-----------+   +----------+-----------+
            |                                |                          |
            v                                v                          v
 +----------------------+         +----------------------+   +----------------------+
 | LIPA Mobile Checkout |         | Readiness Engine     |   | Series/Episode Admin |
 |  - M-Pesa, Tigo, etc |         |  - 9-Point Checklist |   |  - Granular PPV      |
 |  - STK Push Handshake|         |  - 0-100% Score      |   |  - Season Pass Disc. |
 +----------+-----------+         +----------+-----------+   +----------+-----------+
            |                                |                          |
            v                                +------------->------------+
 +----------------------+                                               |
 | Cinema Player /watch |                                               v
 |  - HLS 360p-1080p    |                                    +----------------------+
 |  - DJ Audio Badge    |                                    | 4-Week Income Ledger |
 +----------+-----------+                                    |  - VIP / Movie Split |
            |                                                |  - Historical Months |
            v                                                +----------------------+
 +----------------------+
 | Library & Pass Vault |
 |  - Continue Watching |
 |  - Active Pass Expiry|
 +----------------------+
```

---

## 3. Deep-Dive: Business Logic by Module

---

### Module 1: Movie Container & Embedded DJ Editions

#### Concept
A movie is not a flat video file. A movie is a **title container** that holds one or more **DJ Video Editions**.

```
[ Movie Container: Extraction 2 ]
 ├── Global Metadata: Title, Description, Poster (2:3), Backdrop (16:9), Genres, Country, Year
 └── Video Editions:
      ├── Edition A: DJ Afro Amigo
      │    ├── Streaming Master File: extraction2_dj_afro_1080p.mp4 (HLS manifest)
      │    ├── Offline Mobile File: extraction2_dj_afro_mobile.mp4
      │    ├── Stream Price: 1,500 TZS (48h Access)
      │    └── Download Price: 2,500 TZS (7d Offline License)
      └── Edition B: DJ Murphy
           ├── Streaming Master File: extraction2_dj_murphy_1080p.mp4
           ├── Offline Mobile File: extraction2_dj_murphy_mobile.mp4
           ├── Stream Price: 1,500 TZS (48h Access)
           └── Download Price: 2,500 TZS (7d Offline License)
```

#### Business Rules:
1. **Edition Independence:** Deleting or editing DJ Afro's video file has zero impact on DJ Murphy's edition.
2. **Edition Locking:** Once an edition is created and tagged with a DJ, its DJ cannot be changed on the fly because the video file already contains that DJ's audio. To introduce a new DJ, operators click **"+ Add Another DJ Edition"** and upload the corresponding video file.
3. **Customer Selection:** On the customer page, users toggle between available DJ editions. Switching tabs updates the price, access duration, and locks the player to that DJ's video file.

---

### Module 2: Series & Episodic Cinema

Serialized content (e.g., *Shogun*, *Fallout*, *House of the Dragon*) follows a strict **3-tier episodic hierarchy**:

```
[ Series Container: Shogun ]
 ├── Lead Voice Artist: DJ Afro Amigo (Pinned across all seasons & episodes)
 └── Seasons:
      ├── Season 1 (Season Pass Price: 3,500 TZS)
      │    ├── Episode 1 (Stream: 500 TZS | Download: 1,000 TZS | Status: LIVE)
      │    ├── Episode 2 (Stream: 500 TZS | Download: 1,000 TZS | Status: LIVE)
      │    └── Episode 3 (Stream: 500 TZS | Download: 1,000 TZS | Status: DRAFT)
      └── Season 2 ...
```

#### Business Rules:
1. **Single Lead DJ per Series:** To maintain voiceover continuity across multi-episode story arcs, each TV series has **one official Lead DJ**. Admins assign this DJ at the series level.
2. **Dual Pricing Model (Individual Episode vs Discounted Season Pass):**
   - **Individual Episode PPV:** Customers can buy access to a single episode (e.g., `500 TZS` stream / `1,000 TZS` download). Perfect for users on tight daily budgets.
   - **Discounted Season Pass:** Customers can buy an all-inclusive season pass (e.g., `3,500 TZS` instead of `5,000 TZS` for 10 individual episodes).
3. **Episode-Level Availability:** Individual episodes can be set to `LIVE` or `DRAFT`. A season can be published while future episodes are still being translated in the studio.

---

### Module 3: Monetization, Billing & LIPA (Mobile Money)

East Africa is a mobile-money-first economy. Credit cards represent less than 2% of transactions. The platform relies heavily on **M-Pesa (Vodacom)**, **Tigo Pesa (Yas)**, **Airtel Money**, and **Halopesa (Halotel)**.

#### 1. The 3 Access License Types:
* **Stream Online (Pay-Per-View):** Grants **24 to 48 hours** of high-speed streaming access on web, mobile, and TV.
* **Offline Download (Mobile License):** Grants **7 days** of offline playback permissions for a compressed mobile MP4.
* **VIP Ultra All-Access Subscription:** Grants unlimited streaming of all VIP-flagged movies and series for **30 days** (e.g., `15,000 TZS/month`).

#### 2. The LIPA Checkout Handshake:
1. **User triggers checkout:** Clicks *"WATCH / LIPA TSh 1,500"* on any movie, episode, or pass.
2. **Telco Selection:** Selects network (M-Pesa, Tigo Pesa, Airtel, Halopesa) and inputs phone number.
3. **Push Phase (STK Push):**
   - Backend initiates an STK push to the user's mobile device via the telco gateway.
   - The user receives a system prompt on their phone: *"Enter Mobile Money PIN to pay TSh 1,500 to GIFTEDproMovies"*.
4. **Settlement & Entitlement Creation:**
   - When the user enters their PIN, the telco sends a settlement webhook to the backend.
   - The backend records an `Order` (`SETTLED`) with receipt ID (e.g. `TZS-849201`).
   - The backend creates an **`Entitlement` record** linking `userId`, `itemSlug`, `accessType` (`stream` | `download`), `djName`, and `expiresAt`.
5. **Dynamic UI Success Redirection:**
   - **Stream Pass:** Primary button displays **`▶ Start Watching Now`** and routes directly to `/watch/[slug]?dj=[DJ_NAME]`.
   - **Download License:** Primary button displays **`⬇ Download Movie Now`**, initiating direct browser download and routing to `/library?tab=downloads`.
   - **VIP Pass:** Primary button displays **`👑 Explore VIP Catalog`**, routing to `/movies`.
6. **Guest Checkout vs Authenticated Library:**
   - If an unauthenticated guest buys a pass, a session token is created so they can watch immediately.
   - The modal prominently provides a *"Sign in to save this pass to your account across devices"* prompt.

---

### Module 4: Dedicated Cinema Player (`/watch/[slug]`)

#### Concept
Clicking *"Start Watching Now"* does not keep the user on a messy info page. It routes them into a clean, distraction-free **Cinema Theater View**.

#### Business Rules & Features:
1. **DJ Audio Confirmation:** The player header explicitly displays: `🎙️ [DJ Name] (Embedded Audio) • Crystal Clear HD Stereo`.
2. **In-Player DJ Edition Switcher:** If the movie has other editions (e.g. DJ Afro and DJ Murphy), a dropdown/panel in the theater allows the user to switch editions without returning to the home page.
3. **Paywall Gatekeeper:** If a guest or user attempts to open `/watch/[slug]` without an active entitlement or VIP subscription, the video is withheld, and a *"Pay-Per-View Cinema Pass Required"* prompt appears with a 1-click **`LIPA Sasa`** trigger.
4. **Adaptive Streaming (HLS):** The video player supports quality tiers (`Auto`, `1080p FHD`, `720p HD`, `480p SD`) so users on slow 3G networks experience zero buffering.
5. **Continuous Watch Progress Sync:** The player tracks `currentTime` and updates the user's **Continue Watching** shelf in `/library`.

---

### Module 5: Customer Library & Entitlement Vault (`/library`)

The personal portal for logged-in customers:
1. **Continue Watching Tab:** Displays unfinished titles with real percentage scrubber bars, time remaining, DJ name, and a 1-click **"Resume Playback"** button that directly launches the cinema player.
2. **Active Passes & Entitlements Tab:** Lists all currently paid titles, showing order numbers, price paid, DJ audio edition, and exact expiration countdown (`Expires on: Sep 21, 2026`).
3. **Offline Downloads Tab:** Lists offline MP4 packages licensed to the customer, with one-click redownload triggers.

---

### Module 6: Media Team In-Flow Intake Studio (`/media-team`)

Built for content operators who ingest and catalog new releases.

#### 1. Single-Pass Ingest Workflow
Older systems used disconnected "asset pools" where operators uploaded raw files first, then created a movie record, and tried to connect them. **GIFTEDproMovies uses Single-Pass Intake**:
* The operator opens **"Add New Movie"** or **"Create New Series"**.
* In **Step 5**, they drag and drop the master video file and compressed offline package directly into the movie record.

#### 2. The 6-Step Intake Wizard:
* **Step 1: Title & Info:** Title, Original Title, Slug (auto-generated), Release Year, Duration, Synopsis.
* **Step 2: Visual Artwork:** Poster URL (2:3 portrait), Backdrop URL (16:9 widescreen), Trailer link.
* **Step 3: Taxonomies:** Categories (Action, Drama, Sci-Fi) and Origin Countries (e.g. Kenya, Nigeria, USA).
* **Step 4: Translating DJ (Initial Edition):** Selects the voice artist whose audio is embedded in the video file. Shows clear guidance that audio is hard-muxed.
* **Step 5: Master Media Files:** File dropzone for Online Streaming Master (`streamingFileName`) and Offline Download Package (`downloadFileName`).
* **Step 6: Review & Completeness:** Live checklist calculating a **0–100% Content Readiness Score**.

#### 3. Content Readiness Calculation Formula:
The readiness score is calculated based on 9 discrete validation checks:
1. Basic Info present (Title, Description, Year, Duration)
2. Poster Artwork (2:3) provided
3. Backdrop Artwork (16:9) provided
4. Trailer URL provided
5. At least 1 Category selected
6. At least 1 Country selected
7. Translating DJ assigned
8. Streaming Master video attached
9. Offline Download package attached

$$\text{Readiness \%} = \left(\frac{\text{Completed Checks}}{\text{Total Checks (9)}}\right) \times 100$$

---

### Module 7: Configurable Publishing Approval Gate

Controls whether media operators can push movies live to the public catalog, or whether an Administrator must sign off.

```text
                      +-------------------+
                      | Media Operator    |
                      | Creates New Title |
                      +---------+---------+
                                |
                                v
                      +-------------------+
                      |      DRAFT        |
                      +---------+---------+
                                |
                   [ Operator Submits Title ]
                                |
                                v
               Is requirePublishingApproval == TRUE ?
                               / \
                              /   \
                        YES  /     \  NO (Direct Publishing)
                            /       \
                           v         v
                 +---------------+  +---------------+
                 | PENDING_REVIEW|  |   PUBLISHED   |
                 +-------+-------+  +---------------+
                         |                 ^
             Admin signs off & approves    |
                         +-----------------+
```

#### Business Rules:
1. **Global Toggle (`adminRepository.isPublishingApprovalRequired()`):** Located in `/admin/settings`.
2. **When Gate is Active (`requirePublishingApproval = true`):**
   - Media operators cannot select `PUBLISHED` in the dropdown.
   - The primary button says *"Submit for Review"*.
   - Title status becomes `pending_review` (`READY_FOR_REVIEW`).
   - The title appears in the Admin Attention Queue and Admin Pending filter with an amber badge (`⏳ Pending Approval`).
   - Admin clicks **1-Click "Approve & Publish"** to promote it live to customers.
3. **When Gate is Disabled (`requirePublishingApproval = false`):**
   - Media operators can directly set status to `PUBLISHED`.
   - The title appears in the customer catalog immediately.

---

### Module 8: Taxonomies & DJ Roster Governance

#### 1. DJ Roster Management (`/admin/djs`)
* DJs are first-class platform entities:
  - Name (e.g. `DJ Afro Amigo`)
  - Unique slug (`dj-afro`)
  - Dialect / Style (e.g. `Nairobi Urban Sheng`, `Swahili Pwani`)
  - Tier (`Premier Exclusive`, `Veteran Showcase`, `Rising Talent`)
  - Bio & Avatar Photo
  - Active Titles Count (computed from catalog movies and series)
* **Rule:** Only Administrators can add or edit DJs. Media team operators select from the active DJ roster.

#### 2. Smart Country Autocomplete & Flag Detection (`/admin/countries`)
* Adding a country does not require memorizing ISO codes or finding emojis:
  - Admin types: *"Kenya"*
  - System automatically resolves:
    - Name: `Kenya`
    - ISO-3166 2-Letter Code: `KE`
    - Native Flag Emoji: `🇰🇪` (computed algorithmically via Unicode offset)
    - Region: `East Africa`
* Prevents duplicate country creation.

---

### Module 9: Financial Intelligence & Reconciliation (`/admin/finances`)

Financial tracking is strictly aligned to the **3 revenue streams**:
1. **VIP Passes** (Monthly subscriptions)
2. **Single Movies** (PPV rentals & downloads)
3. **Series & TV Shows** (Individual episodes & season passes)

#### The 4-Week Income Ledger
The financial dashboard features a **Weekly Income Breakdown** synchronized with monthly totals:
* **Week 1 (Days 1–7):** Income collected, Orders count, VIP Pass split, Single Movie split, Series split.
* **Week 2 (Days 8–14):** Income collected, Orders count, splits.
* **Week 3 (Days 15–21):** Income collected, Orders count, splits.
* **Week 4 (Days 22–End of Month):** Income collected, Orders count, splits.
* **Historical Month Selector:** Admins can select previous months (e.g., *August 2026*, *July 2026*) to view historical financial snapshots.

---

### Module 10: Video Storage, Transcoding & CDN Delivery

#### 1. Why Movies Are Never in Databases
* Video files are never stored as binary BLOBs in SQL or MongoDB.
* The database only stores metadata and secure storage keys (`godzilla_dj_afro_1080p.m3u8`).

#### 2. The Video Delivery Pipeline:
1. **Direct Presigned Ingest:** Media Team uploads directly from their browser to Object Storage (S3 / Cloudflare R2 / Bunny Storage). Web servers never process gigabytes of video traffic.
2. **Automated Transcoding:** The master video is sliced into **Adaptive HLS Chunks (360p, 480p, 720p, 1080p)**.
3. **Edge Caching (CDN):** Local edge caches in Dar es Salaam, Nairobi, and Johannesburg store popular segments. 98%+ of traffic is served from the edge.
---

### Module 11: Authentication, Authorization & RBAC

#### 1. The 3 Role Tiers & Permission Matrix
Access control is enforced strictly at both the Next.js Route Guard (middleware) level and the backend API gateway:

```text
                     +---------------------------------------+
                     | Incoming Request to Protected Route   |
                     +-------------------+-------------------+
                                         |
                                         v
                         +-------------------------------+
                         | Valid JWT Session Token Found?|
                         +---------------+---------------+
                                         |
                       +-----------------+-----------------+
                       | YES                               | NO
                       v                                   v
        +------------------------------+         +-------------------+
        | Extract User Role from Token |         | Is Guest Allowed? |
        +--------------+---------------+         +---------+---------+
                       |                                   |
         +-------------+-------------+             +-------+-------+
         |             |             |             | YES           | NO
         v             v             v             v               v
    [ customer ]  [ media_team ]  [ admin ]    [ Allow ]     [ Redirect: ]
         |             |             |         (Public       [ /login    ]
   Allow Public  Allow Media   Allow All       Catalog)
   & /watch &    & Ingest &    & Settings
   /library      Review Queue  & Finance
```

* **Role 1: `customer` (Default):**
  - Access to public catalog, search, trailer modals, and account settings.
  - Can initiate LIPA checkout, link entitlements, and access `/library`.
  - Can stream on `/watch/[slug]` **only if an active entitlement or VIP pass exists**.
  - Forbidden from `/media-team/*` and `/admin/*`. Attempted access routes to `/unauthorized`.
* **Role 2: `media_team` (Content Operations Staff):**
  - Access to `/media-team/*` (Dashboard, Movie Library, Series Studio, Review Queue).
  - Can create and edit titles, upload master files, and configure DJ editions.
  - **Governed by Approval Policy:** If `requirePublishingApproval` is active, media team cannot publish live directly; their submission is routed to `PENDING_REVIEW`.
  - Forbidden from `/admin/finances`, `/admin/settings`, and altering global platform policies.
* **Role 3: `admin` (Platform Leadership & Superusers):**
  - Unrestricted access across `/admin/*`, `/media-team/*`, and customer portals.
  - Can 1-click approve staged movies and series, toggle the approval gate, add DJs to the roster, register new countries, and inspect financial income.

#### 2. Guest Browsing vs Authenticated Library Handshake
* **Frictionless Guest Purchasing:** Unauthenticated users can browse the entire catalog and pay via LIPA by simply entering their mobile money phone number.
* **Session Bridge:** Upon successful payment, the guest device receives a temporary entitlement session token, unlocking `/watch/[slug]` immediately.
* **Permanent Library Binding:** The LIPA success modal and watch player prominently offer: *"Create an account or Sign In to link this pass to your account across your phone, laptop, and smart TV."*
* When a guest logs in or registers with the same phone number used for LIPA, all orphan entitlements are bound to their permanent `userId`.

#### 3. Password Recovery & Security
* **Routes:** `/forgot-password` and `/reset-password`.
* User enters their registered phone number or email.
* System dispatches a secure 6-digit OTP (One-Time PIN) valid for 10 minutes.
* Submitting the verified OTP grants a single-use token to set a new password hash (Argon2id or bcrypt).

---

### Module 12: Notification & Alerting Engine

The notification engine ensures real-time operational transparency for customers, media operators, and platform administrators across **four distinct delivery channels**:

```text
+=============================================================================+
|                      NOTIFICATION & ALERTING PIPELINE                       |
+=============================================================================+

  [ Trigger Events ]                 [ Processing Engine ]      [ Delivery Channels ]
         |                                     |                         |
         |-- Telco Payment Settled             v                         v
         |--------------------------> +------------------+ ---> [ Transactional SMS ]
         |                            | Notification Hub |      "Malipo TSh 1,500..."
         |-- Pass Expiring in 2h      |  - Template Parse|
         |--------------------------> |  - Channel Route | ---> [ Push Notification ]
         |                            |  - Queue Dispatch|      "Pass expires soon!"
         |-- Title Submitted by Staff +------------------+
         |-------------------------->          |           ---> [ Admin Dashboard ]
         |                                     |                "⏳ 3 Pending Review"
         |-- Media Save / Delete Ops           v
         \--------------------------> +------------------+ ---> [ In-App UI Toast   ]
                                      | Toast Dispatcher |      "Saved as Draft!"
                                      +------------------+
```

#### Channel 1: Transactional Mobile SMS (External Gateway)
* **Immediate Payment Receipt SMS:** Sent as soon as an M-Pesa / Tigo / Airtel callback settles:
  > *"GIFTEDproMovies: Malipo ya TSh 1,500 yamepokelewa (Risiti: TZS-849201). Tazama 'Extraction 2' (DJ Afro) sasa hapa: https://giftedpromovies.com/watch/extraction-2?dj=DJ+Afro. Pass yako inaisha baada ya saa 48."*
* **Pass Expiration Warning:** Sent 2 hours before a 24h or 48h streaming pass expires, allowing users to renew or finish watching.
* **VIP Renewal Reminder:** Sent 3 days before monthly subscription renewal.

#### Channel 2: Real-Time UI Action Toasts
* Lightweight, non-intrusive floating toasts across all portals:
  - **Media Team:** `"Movie saved as draft"`, `"Uploaded 1080p master file"`, `"Title submitted for Admin review"`.
  - **Admin:** `"Approved & published live to catalog"`, `"Country Kenya added with flag 🇰🇪"`, `"Settings policy updated"`.
  - **Customer:** `"Pass unlocked"`, `"Offline download started"`.

#### Channel 3: Operational Policy Banners
* **Approval Policy Banner:** When the Admin Approval Gate is active (`requirePublishingApproval = true`), a persistent amber banner is rendered on `/media-team`:
  > *"Admin Approval Policy Active — New movies and series submitted by media operators will be staged for Admin authorization before appearing live in the public catalog."*
* **System Maintenance / Degradation Banners:** Centrally triggered by Admins to inform customers of telco gateway maintenance.

#### Channel 4: Staff Attention Queue Badges
* **Pending Review Counters:** The Admin top navigation and Review Queue tab display real-time pulsating badges indicating unreviewed submissions (e.g., `⏳ 3 Pending Review`).
* **Instant Operator Feedback:** When an Admin approves or rejects a staged title, the media team dashboard updates the status pill in real-time (`PENDING_APPROVAL` → `PUBLISHED`).

---

## 4. Entity Lifecycle & State Machines

### 4.1 Content State Transition

| Initial State | Event / Trigger | Target State | Permitted Roles |
| :--- | :--- | :--- | :--- |
| *None* | Create Title | `DRAFT` | `media_team`, `admin` |
| `DRAFT` | Operator clicks "Submit for Review" (Approval Gate Active) | `PENDING_REVIEW` | `media_team` |
| `DRAFT` | Operator clicks "Publish Live" (Approval Gate Disabled) | `PUBLISHED` | `media_team`, `admin` |
| `PENDING_REVIEW` | Admin clicks "Approve & Publish" | `PUBLISHED` | `admin` |
| `PENDING_REVIEW` | Admin rejects title | `DRAFT` | `admin` |
| `PUBLISHED` | Content removed from circulation | `ARCHIVED` | `admin` |

---

### 4.2 Order & Entitlement State Transition

```text
 [ User clicks LIPA & enters phone ]
                |
                v
       +-----------------+
       |  ORDER: PENDING |
       +--------+--------+
                |
       (Telco STK Push Sent)
                |
                v
       +--------------------+
       | ORDER: PROCESSING  |
       +--------+-----------+
               / \
   User cancels   Telco Webhook: PIN Verified
             /     \
            v       v
 +---------------+ +------------------+
 | ORDER: FAILED | | ORDER: COMPLETED |
 +---------------+ +--------+---------+
                            |
                   (Create Entitlement)
                            |
                            v
                   +------------------+
                   |   PASS: ACTIVE   |
                   | (24h / 48h / 30d)|
                   +--------+---------+
                            |
                   (Expiration Reached)
                            |
                            v
                   +------------------+
                   |  PASS: EXPIRED   |
                   +------------------+
```

---

## 5. Summary Checklist for Backend Engineers

Before writing any database queries or API endpoints, ensure your technical design handles these requirements:

1. **Movie Container Model:** Ensure your `movies` table has a one-to-many relationship with `movie_versions` (the DJ editions).
2. **Hard-Muxed Audio Stems:** Never allow updating a DJ on an existing edition without requiring the dedicated video file for that edition.
3. **Episodic Hierarchy:** Model `series -> seasons -> episodes` with support for both individual episode pricing and season pass bundling.
4. **Publishing Policy Flag:** Implement the `require_publishing_approval` setting that gates `media_team` submissions.
5. **Mobile Money Webhooks:** Build idempotent telco webhook receivers for M-Pesa, Tigo, Airtel, and Halopesa.
6. **Entitlement Expirations:** Store `expires_at` timestamps on entitlements and automatically deny playback when expired.
7. **Direct-to-Storage Uploads:** Implement presigned upload URLs for S3/R2 so that media staff upload directly to storage buckets.
8. **HLS Stream Protection:** Generate short-lived signed tokens for `.m3u8` manifests.
9. **Role-Based Access Control (RBAC):** Implement JWT token authentication carrying user roles (`customer`, `media_team`, `admin`) with route protection and guest session bridging.
10. **Transactional SMS & Notification Gateway:** Connect an SMS gateway (e.g. Africa's Talking, Beem Africa) for instant payment confirmation receipts, pass expiration reminders, and operational staff queue badges.
