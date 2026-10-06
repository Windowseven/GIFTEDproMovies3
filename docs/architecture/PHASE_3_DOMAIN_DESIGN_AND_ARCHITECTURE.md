# GIFTEDproMovies — Phase 3A: Domain Design and Architecture Specification

> **Document ID:** ARCH-018-DESIGN  
> **File:** `docs/architecture/PHASE_3_DOMAIN_DESIGN_AND_ARCHITECTURE.md`  
> **Status:** PHASE 3A — READY FOR FINAL HUMAN APPROVAL  
> **Authority:** Human Product Owner Approved Decisions, ARCH-001 through ARCH-017  
> **Implementation State:** Architecture & Domain Design Only (NO production code, NO migrations, NO schemas)

---

## 1. Purpose and Boundaries

### 1.1 Purpose
This document establishes the authoritative domain architecture, entity-relationship models, lifecycle state machines, readiness criteria, governance rules, and transaction boundaries for **Phase 3: Catalog, Taxonomy Governance & Content Lifecycle** of GIFTEDproMovies.com.

The primary objective of Phase 3 is to provide a robust, production-grade foundation for managing African and international cinema, multi-edition Swahili translated releases (translating DJ audio/video), episodic series, canonical taxonomies, and editorial publishing workflows without coupling to future payment or streaming delivery providers.

### 1.2 Architectural Boundaries and Out-of-Scope Domains
In accordance with the GIFTEDproMovies Modular Monolith Architecture (ADR-001) and the Phase 3 Controlled Engineering Protocol, the following boundaries are strictly enforced:

* **Commercial Decoupling (Phase 4 / 5):** Pricing policies, payment transactions, customer checkouts, mobile money settlement (Vodacom M-Pesa, Airtel Money, Tigo Pesa), and customer entitlements belong exclusively to the Commerce domain. Catalog entities carry baseline reference prices for operator convenience, but the Catalog domain never creates orders, verifies funds, or issues entitlement grants.
* **Storage and Delivery Decoupling (Phase 6 / 7):** Video and master files are never stored on or proxied through the application server (ADR-009). The Catalog domain stores provider-neutral identifiers (`streaming_file_key`, `download_file_key`) and normalized processing statuses (`ready`, `processing`, `needs_attention`, `unavailable`). No Cloudflare Stream SDKs, Cloudflare R2 presigned upload logic, HLS manifests, or transcode pipelines are implemented in Phase 3.
* **Infrastructure Simplicity (ADR-012, ADR-014, ADR-015):** No Redis, BullMQ, Kafka, RabbitMQ, Elasticsearch, or microservices. All relational data, state machines, full-text search, and background queues leverage PostgreSQL native capabilities.

---

## 2. Existing Architecture Compatibility

The domain design adheres strictly to all foundational architectural decisions established and verified in Phases 1 and 2:

```text
+------------------------------------------------------------------------------------+
|                         FOUNDATIONAL STACK ALIGNMENT                               |
+------------------------------------------------------------------------------------+
| Runtime / Language : Node.js LTS + TypeScript strict mode (ADR-002)                |
| Application Web   : NestJS 12 + Fastify 5 adapter (ADR-003)                        |
| Primary Database   : PostgreSQL managed relational store (ADR-004)                 |
| Persistence Layer  : Drizzle ORM / SQL-first relational persistence (ADR-005)      |
| Session Management : Opaque database-backed sessions with SHA-256 tokens (ADR-007) |
| Async Architecture : PostgreSQL-backed transactional outbox & worker (ADR-012)     |
| Audit Architecture : Append-only audit trail with recursive secret masking (ARCH-10)|
| Search Architecture: PostgreSQL native full-text search with simple dict (ADR-013) |
+------------------------------------------------------------------------------------+
```

All Catalog operations execute within this existing application container. Security boundaries, request ID propagation, global error envelopes (`success: false`, `error: { code, message }`), and structured Pino logging remain identical to Phases 1 and 2.

---

## 3. Authoritative Product-Owner Decisions (Locked Invariants)

The following requirements have been finalized and approved by the Human Product Owner and serve as authoritative domain rules:

1. **Archive Restoration — Strict Multi-Step Re-entry (APPROVED FINAL DECISION):**  
   Archived content is retired from the active catalog. Direct restoration from `ARCHIVED` to `PUBLISHED` is strictly forbidden. An administrator restoring an archived item restores it to `DRAFT` (`ARCHIVED` $\rightarrow$ `DRAFT`). The title must then pass mandatory submission validation, enter `PENDING_REVIEW` (if approval is enabled) or auto-publish, and satisfy 100% server-side publication readiness before going live again.
2. **Series Initial Publication Invariant (APPROVED FINAL DECISION):**  
   A Series may NOT be initially published as an empty "Upcoming" announcement card. Initial publication requires 100% series metadata, at least Season 1, at least Episode 1, and Episode 1 must possess 100% ready media (`streaming_status == 'ready'` AND `download_status == 'ready'`). After initial publication, newly added episodes start in `DRAFT` (`is_available = false`) and do NOT unpublish the live series or existing published episodes.
3. **Movie Default Edition Failure & Fallback Invariant (APPROVED FINAL DECISION):**  
   A published Movie must always have at least one usable edition capable of delivering ready streaming and download media. If the current default edition becomes unavailable:
   * **Case A (Healthy Edition Available):** A verified ready edition is promoted as the new default; the movie remains `PUBLISHED`; the unavailable edition is set to `is_available = false`.
   * **Case B (No Ready Edition Exists):** The movie transitions immediately from `PUBLISHED` $\rightarrow$ `UNPUBLISHED` and is hidden from public discovery until an edition is restored and passes full publication readiness.
   * **Entitlement Invariant:** Unpublishing the movie **never cancels or revokes existing customer entitlements** (ADR-023).
4. **Submission Validation vs. Publication Readiness (APPROVED FINAL DECISION):**  
   * **Submission Validation:** Determines whether an operator can submit intake work into the workflow/review queue. Evaluates required editorial fields and baseline presence.
   * **Publication Readiness:** The authoritative, non-bypassable server-side gate evaluated within the publishing transaction. Requires 100% (9/9) verified checks. Incomplete content can never bypass publication readiness regardless of configuration.
5. **Publishing Approval Gate (APPROVED FINAL DECISION):**  
   When `publishingRequiresApproval = true`, submissions enter `PENDING_REVIEW` for human Admin sign-off. When `publishingRequiresApproval = false`, eligible submissions trigger system auto-publication immediately upon passing 100% publication readiness.
6. **Direct Published-Content Edits (APPROVED FINAL DECISION):**  
   Media Team metadata edits to published content go live directly without a second approval queue. Does not permit altering pricing, roles, or commercial entitlements.
7. **Rejection Feedback Routing (APPROVED FINAL DECISION):**  
   Admin rejection requires a non-empty written reason, stored in review history and routed to `assigned_to` / `created_by` via in-app notifications. Notification delivery failure cannot roll back the committed rejection.
8. **Taxonomy Database Referential Integrity (APPROVED FINAL DECISION):**  
   PostgreSQL foreign keys enforce `ON DELETE RESTRICT` on categories, countries, and DJs. Referenced deletions are blocked by both domain logic (`409 Conflict`) and database constraints, offering safe deactivation (`is_active = false`) instead.

---

## 4. Domain Entities and Relational Architecture

### 4.1 Domain Entity Relationships (ASCII Diagram)

```text
+-------------------------+                 +-------------------------+
|       CATEGORIES        |                 |        COUNTRIES        |
|-------------------------|                 |-------------------------|
| id: UUID (PK)           |                 | id: UUID (PK)           |
| name: VARCHAR(100)      |                 | code: VARCHAR(10) (UK)  |
| slug: VARCHAR(120) (UK) |                 | name: VARCHAR(100)      |
| description: TEXT       |                 | flag_emoji: VARCHAR(16) |
| display_order: INT      |                 | is_active: BOOLEAN      |
| is_active: BOOLEAN      |                 | created_at: TIMESTAMPTZ |
| created_at: TIMESTAMPTZ |                 +------------+------------+
+------------+------------+                              |
             |                                           |
             | 1..* (ON DELETE RESTRICT)                 | 1..* (ON DELETE RESTRICT)
             v                                           v
+------------+-------------------------------------------+------------+
|                       CONTENT ITEMS (MOVIES & SERIES)               |
|---------------------------------------------------------------------|
| id: UUID (PK)                                                       |
| code_id: VARCHAR(32) (UK) -- e.g. #GF-9042                          |
| content_type: ENUM ('movie', 'series')                              |
| title: VARCHAR(255)                                                 |
| original_title: VARCHAR(255) (Nullable)                             |
| slug: VARCHAR(280) (UK)                                             |
| release_year: INT                                                   |
| description: TEXT                                                   |
| poster_url: TEXT                                                    |
| backdrop_url: TEXT (Nullable)                                       |
| trailer_url: TEXT (Nullable)                                        |
| status: ENUM ('draft', 'pending_review', 'published',               |
|              'unpublished', 'archived')                             |
| is_featured: BOOLEAN                                                |
| is_trending: BOOLEAN                                                |
| published_at: TIMESTAMPTZ (Nullable)                                |
| created_by: UUID (FK -> users.id)                                   |
| submitted_by: UUID (FK -> users.id, Nullable)                       |
| assigned_to: UUID (FK -> users.id, Nullable)                        |
| approved_by: UUID (FK -> users.id, Nullable)                        |
| rejection_reason: TEXT (Nullable)                                   |
| created_at: TIMESTAMPTZ                                             |
| updated_at: TIMESTAMPTZ                                             |
+-------------------+-------------------------------------+-----------+
                    |                                     |
       [content_type = 'movie']              [content_type = 'series']
                    |                                     |
                    v                                     v
+-----------------------------------+ +-------------------------------+
|     MOVIE SPECIFIC ATTRIBUTES     | |   SERIES SPECIFIC ATTRIBUTES  |
|-----------------------------------| |-------------------------------|
| duration_minutes: INT             | | lead_dj_id: UUID (FK -> djs)  |
+-----------------+-----------------+ | pricing_model: ENUM           |
                  |                   |  ('per_episode', 'per_season',|
                  | 1..* (CASCADE)    |   'full_series','combination')|
                  v                   | def_stream_price_tsh: INT     |
+-----------------------------------+ | def_download_price_tsh: INT   |
|     MOVIE EDITIONS (VERSIONS)     | +---------------+---------------+
|-----------------------------------|                 |
| id: UUID (PK)                     |                 | 1..* (CASCADE)
| movie_id: UUID (FK -> content.id) |                 v
| dj_id: UUID (FK -> djs.id)        | +-------------------------------+
| streaming_file_key: TEXT          | |            SEASONS            |
| download_file_key: TEXT           | |-------------------------------|
| streaming_status: ENUM            | | id: UUID (PK)                 |
|  ('ready','processing',           | | series_id: UUID (FK -> series)|
|   'needs_attention','unavailable')| | season_number: INT            |
| download_status: ENUM             | | title: VARCHAR(255)           |
|  ('ready','processing',           | | season_pass_price_tsh: INT    |
|   'needs_attention','unavailable')| | is_active: BOOLEAN            |
| is_default: BOOLEAN               | +---------------+---------------+
| is_available: BOOLEAN             |                 |
| streaming_price_tsh: INT          |                 | 1..* (CASCADE)
| download_price_tsh: INT           |                 v
| access_duration_hours: INT (48)   | +-------------------------------+
+-----------------+-----------------+ |           EPISODES            |
                  |                   |-------------------------------|
                  | (ON DELETE        | id: UUID (PK)                 |
                  |  RESTRICT)        | season_id: UUID (FK -> season)|
                  |                   | episode_number: INT           |
                  |                   | title: VARCHAR(255)           |
                  |                   | duration_minutes: INT         |
                  |                   | description: TEXT             |
                  |                   | thumbnail_url: TEXT (Nullable)|
                  |                   | dj_id: UUID (FK -> djs.id)    |
                  |                   | streaming_file_key: TEXT      |
                  |                   | download_file_key: TEXT       |
                  |                   | streaming_status: ENUM        |
                  |                   | download_status: ENUM         |
                  |                   | stream_price_tsh: INT         |
                  |                   | download_price_tsh: INT       |
                  |                   | is_available: BOOLEAN         |
                  |                   | status: ENUM ('draft',        |
                  |                   |       'published','archived') |
                  |                   +---------------+---------------+
                  |                                   |
                  +-----------------+-----------------+
                                    | (ON DELETE RESTRICT)
                                    v
                      +-------------------------------+
                      |      DJ / VOICE ARTISTS       |
                      |-------------------------------|
                      | id: UUID (PK)                 |
                      | name: VARCHAR(150)            |
                      | stage_name: VARCHAR(150)      |
                      | slug: VARCHAR(160) (UK)       |
                      | avatar_url: TEXT              |
                      | bio: TEXT                     |
                      | tier: VARCHAR(50)             |
                      | contract_type: VARCHAR(50)    |
                      | color_hex: VARCHAR(10)        |
                      | status: ENUM ('active','inact')|
                      | created_at: TIMESTAMPTZ       |
                      +-------------------------------+
```

---

## 5. Authoritative 5-State Content Lifecycle Model

```text
                               +-----------------------+
                               |        DRAFT          |
                               | (In intake / editing) |<-----------------------------+
                               +-----------+-----------+                              |
                                           |                                          |
                                           | [Submit for Review] (Staff)              |
                                           | (Submission Validation: >=80% + DJ/Media)|
                                           v                                          |
       +-----------------------+   +-----------------------+                          |
       |    REJECTED DRAFT     |<--+    PENDING_REVIEW     |                          |
       | (Rejection history in |   | (Admin Review Queue)  |                          |
       |  audit; notes in UI)  |   +-----------+-----------+                          |
       +-----------+-----------+               |                                      |
                   |                           | [Approve & Publish] (Admin)          |
                   | [Re-submit]               |        OR                            |
                   +-------------------------->| [Auto-Publish] (System when gate=false)
                                               | (100% Publication Readiness Gate)    |
                                               v                                      |
                                   +-----------------------+                          |
                                   |       PUBLISHED       |                          |
                                   | (Live on Storefront)  |                          |
                                   +----+-------------+----+                          |
                                        |             |                               |
                 [Emergency Unpublish]  |             |  [Retire Content]             |
                 (Admin or Case B failure)            v  (Admin archival)             |
                     +--------------------+         +--------------------+            |
                     |    UNPUBLISHED     |         |      ARCHIVED      |            |
                     | (Temporarily hidden|         | (Retired catalog   |            |
                     |  from public store)|         |  permanent records)|            |
                     +---------+----------+         +---------+----------+            |
                               |                              |                       |
                               | [Restore to Draft]           | [Restore to Draft]    |
                               | (Admin: Case B/re-intake)    | (Admin action)        |
                               +----------------------------->+-----------------------+
```

### 5.1 Formal State Definitions

1. **`DRAFT`:** Work in progress. Content is editable by Media Team staff with `CONTENT_WRITE`. Invisible to public queries.
2. **`PENDING_REVIEW`:** Content submitted for editorial and compliance review. Enqueued in the Admin Review Queue (`/admin/movies`, `/admin/series`). Locked against routine Media Team edits while under review.
3. **`PUBLISHED`:** Content is live on the public storefront, search feeds, and streaming player. Strictly requires 100% verified server publication readiness.
4. **`UNPUBLISHED`:** **Emergency Administrative Takedown or Default Edition Outage.**  
   Content is temporarily concealed from public browsing and search (`404 Not Found`). Used for copyright inquiries, editorial corrections, or when a movie loses its last usable media edition (Case B). **Existing customer entitlements remain 100% playable** in customer libraries (ADR-023).
5. **`ARCHIVED`:** **Permanent Catalog Retirement.**  
   Content is retired from active distribution. Retains complete relational identity, editions, and purchase history for commercial audit. Active customer entitlements remain valid.

### 5.2 Archive Restoration Lifecycle (APPROVED FINAL DECISION)

Direct restoration from `ARCHIVED` to `PUBLISHED` is strictly blocked:
* Admin executes `POST /api/v1/admin/content/:id/restore-to-draft`.
* Content status transitions from `ARCHIVED` $\rightarrow$ `DRAFT`.
* Staff make necessary updates and run submission validation.
* The item follows the normal publication workflow: enters `PENDING_REVIEW` (if approval is enabled) or auto-publishes (if approval is disabled) **after passing 100% server publication readiness**.

---

## 6. Submission Validation vs. Publication Readiness

To eliminate confusion between workflow intake eligibility and legal broadcast eligibility, the system enforces a strict two-stage validation barrier:

```text
+------------------------------------------------------------------------------------+
|                         TWO-STAGE VALIDATION ARCHITECTURE                          |
+------------------------------------------------------------------------------------+
|                                                                                    |
|  1. SUBMISSION VALIDATION (Media Team Gate)                                        |
|     - Purpose: Assesses whether draft intake is coherent enough to enter review.    |
|     - Scope: Evaluates title, release year, description, >= 1 category,             |
|              >= 1 country, DJ voice artist assigned, and initial media uploaded.   |
|     - Threshold: Completeness >= 80% with required primary media passes.           |
|     - Outcome: Transitions DRAFT -> PENDING_REVIEW (or triggers auto-publish gate). |
|     - NOTE: Passing submission validation NEVER guarantees live publication!       |
|                                                                                    |
|                                         |                                          |
|                                         v                                          |
|  2. PUBLICATION READINESS (Authoritative Server Gate)                              |
|     - Purpose: Guarantees broadcast, streaming, and legal compliance live on store.|
|     - Scope: Deterministic 9-point checklist evaluated inside publish transaction. |
|     - Threshold: 100% (9/9) PASSED. Zero tolerance for missing assets.             |
|     - Outcome: Transitions to PUBLISHED. Any defect aborts with 422 Unprocessable. |
+------------------------------------------------------------------------------------+
```

### Authoritative 9-Point Publication Checklist Matrix:
1. `basicInfo`: `title != ''`, `description != ''`, `release_year >= 1900`, `duration_minutes >= 1`.
2. `poster`: Valid vertical (2:3) image URL reachable on storage.
3. `backdrop`: Valid horizontal (16:9) image URL reachable on storage.
4. `trailer`: Valid trailer video URL or media stream.
5. `categories`: `COUNT(content_categories) >= 1`.
6. `countries`: `COUNT(content_countries) >= 1`.
7. `djAssigned`: Movie has at least 1 edition with assigned DJ (or Series has `lead_dj_id`).
8. `streamingMedia`: Default edition has `streaming_status == 'ready'` and non-empty key.
9. `downloadMedia`: Default edition has `download_status == 'ready'` and non-empty key.

---

## 7. Movie & Edition Readiness Invariants

### 7.1 Multi-Edition Architecture

A Movie is a logical catalog container holding one or more hard-muxed Swahili DJ releases (`MovieEdition`):

```text
+-----------------------------------------------------------------------------------+
|                        MOVIE & EDITION AVAILABILITY MODEL                         |
|                                                                                   |
|  MOVIE: "Gladiator II" (status: PUBLISHED)                                        |
|                                                                                   |
|  EDITION 1 (DJ Afro) [DEFAULT]                                                    |
|  ├── streaming_status: 'ready'                                                    |
|  ├── download_status:  'ready'                                                    |
|  └── is_available: true  ===> [STREAMABLE & DOWNLOADABLE]                         |
|                                                                                   |
|  EDITION 2 (DJ Murphy)                                                            |
|  ├── streaming_status: 'ready'                                                    |
|  ├── download_status:  'processing'                                               |
|  └── is_available: false ===> [EXCLUDED FROM PLAYER SELECTOR]                     |
+-----------------------------------------------------------------------------------+
```

### 7.2 Movie Edition Failure Rules (APPROVED FINAL DECISION)

A published Movie must always have at least one usable edition capable of delivering ready streaming and download media:

* **Case A: Secondary Ready Edition Exists:**  
  If the current default edition fails or becomes unavailable, but another verified ready edition exists:
  1. The ready edition is promoted to `is_default = true`.
  2. The defective edition is set to `is_available = false`.
  3. The Movie remains `PUBLISHED`.
  4. An audit log (`CATALOG_EDITION_DEFAULT_PROMOTED`) is recorded.
* **Case B: No Ready Edition Exists:**  
  If all editions become unavailable (or the sole default edition fails and no ready alternative exists):
  1. The Movie transitions immediately from `PUBLISHED` $\rightarrow$ `UNPUBLISHED`.
  2. The Movie is removed from public discovery.
  3. An audit log (`CATALOG_EMERGENCY_UNPUBLISHED`, reason: `DEFAULT_EDITION_MEDIA_UNAVAILABLE`) is recorded.
  4. **Entitlement Protection:** Active customer rentals remain valid in customer libraries (ADR-023).

---

## 8. Series, Season, and Episode Hierarchy Model

### 8.1 Minimal Parent/Child Availability Model

To avoid unnecessary state machine complexity across three layers, GIFTEDproMovies enforces a clear distinction between **Container Lifecycle (`status`)** and **Playback Availability (`is_available`)**:

```text
+------------------------------------------------------------------------------------+
|                         HIERARCHICAL LIFECYCLE MODEL                               |
+------------------------------------------------------------------------------------+
|                                                                                    |
|  1. SERIES (Logical Container)                                                     |
|     - Lifecycle: status IN ('draft', 'pending_review', 'published',                |
|                             'unpublished', 'archived')                             |
|     - Initial Publication Invariant: Requires 100% metadata + Season 1 + Episode 1 |
|       with ready media. Empty "Upcoming" publication is strictly forbidden.        |
|                                                                                    |
|  2. SEASONS (Structural Grouping)                                                 |
|     - Minimal Attribute: is_active (boolean, default true)                         |
|     - Decoupled: Seasons do not require a separate complex state machine.         |
|       A season is discoverable if parent Series is PUBLISHED and is_active=true.  |
|                                                                                    |
|  3. EPISODES (Playback Units)                                                      |
|     - Lifecycle: status IN ('draft', 'published', 'archived')                      |
|     - Playback Availability: is_available (boolean)                                |
|     - Rule: is_available = true IFF streaming_status=='ready' AND                  |
|             download_status=='ready' AND status=='published'.                      |
+------------------------------------------------------------------------------------+
```

### 8.2 Hierarchy Publication & Isolation Rules

1. **Progressive Episode Publishing (APPROVED FINAL DECISION):**  
   After initial Series publication, Media Team staff can add Episode 2, 3, etc. Newly created episodes start in `status = 'draft'` with `is_available = false`.
2. **Zero Cascading Failure (APPROVED FINAL DECISION):**  
   A newly added, incomplete, or defective draft episode **never unpublishes Season 1 or the parent Series**. Existing published episodes remain fully available to customers.
3. **Loss of Playable Content Invariant (APPROVED FINAL DECISION):**  
   If an entire published Series loses all playable episodes (e.g. storage outage or administrative withdrawal of all episodes), the Series transitions from `PUBLISHED` $\rightarrow$ `UNPUBLISHED` until at least one episode is restored.

---

## 9. Rejection, Notification Ownership, and Transaction Safety

### 9.1 Multi-User Media Team Ownership Fields
* `created_by`: Immutable UUID of the Media Team member who initiated content intake.
* `submitted_by`: UUID of the Media Team member who performed the most recent submission.
* `assigned_to`: Mutable UUID of the staff member responsible for resolving review feedback (defaults to `submitted_by`, reassignable by Admin).

### 9.2 Rejection Notification Routing (APPROVED FINAL DECISION)
1. **Targeting:** Notifications route to `assigned_to` if present; fallback to `submitted_by`; fallback to `created_by`.
2. **Rejection History:** The written reason is appended to `content_review_notes` and `audit_events` to preserve history even after status returns to `DRAFT`.
3. **Decoupled Delivery Guarantee:** In-app notifications are written directly to `notificationsTable` inside the database transaction. Optional email notifications are processed asynchronously via `email_outbox` (ADR-012). **A failure in external email delivery cannot roll back or invalidate the committed administrative review decision.**

---

## 10. Database Referential Integrity & Smart Deletion

### 10.1 Database Constraints
PostgreSQL foreign key constraints provide non-bypassable referential safety:
* `content_categories.category_id` $\rightarrow$ `categories.id` (`ON DELETE RESTRICT`).
* `content_countries.country_id` $\rightarrow$ `countries.id` (`ON DELETE RESTRICT`).
* `movie_editions.dj_id` $\rightarrow$ `dj_voice_artists.id` (`ON DELETE RESTRICT`).
* `series_metadata.lead_dj_id` $\rightarrow$ `dj_voice_artists.id` (`ON DELETE RESTRICT`).
* `episodes.dj_id` $\rightarrow$ `dj_voice_artists.id` (`ON DELETE RESTRICT`).

### 10.2 Smart Deletion Workflow
* Application queries count of linked content items.
* If references $> 0$, the request is rejected with `409 Conflict` (`ErrorCode: CANNOT_DELETE_REFERENCED_CAT`) and prompts the Admin to deactivate (`is_active = false`).
* If a race condition occurs, PostgreSQL's `RESTRICT` constraint blocks the deletion with error `23503 foreign_key_violation`.

---

## 11. Architecture Decision Records (ADRs) Governance

The following ADRs in [`docs/architecture/15-ARCHITECTURE-DECISIONS-AND-TRADEOFFS.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/architecture/15-ARCHITECTURE-DECISIONS-AND-TRADEOFFS.md) remain:

* **`ADR-031`:** Backend-Enforced 9-Point Readiness Checklist and Dynamic Publishing Approval Gate.  
  * **Status:** `PROPOSED — PENDING PRODUCT OWNER REVIEW`
* **`ADR-032`:** Hard-Muxed DJ Video Editions and Flexible Episodic Series Hierarchy.  
  * **Status:** `PROPOSED — PENDING PRODUCT OWNER REVIEW`
* **`ADR-033`:** Taxonomy Governance, Smart Deletion Safeguards, and In-App Review Routing.  
  * **Status:** `PROPOSED — PENDING PRODUCT OWNER REVIEW`

---

## 12. Recommended Phase 3B Implementation Sequence

Upon final human product-owner sign-off, Phase 3B will execute as follows:
1. Author Drizzle ORM schemas in `backend/src/infrastructure/database/schemas/`:
   * `categories.schema.ts`
   * `countries.schema.ts`
   * `dj-voice-artists.schema.ts`
   * `content.schema.ts` (movies & series base)
   * `movie-editions.schema.ts`
   * `series.schema.ts`
   * `seasons.schema.ts`
   * `episodes.schema.ts`
   * `content-categories.schema.ts` & `content-countries.schema.ts` (junctions)
   * `content-review-notes.schema.ts` (review history)
   * `system-settings.schema.ts` (`publishingRequiresApproval`)
2. Export schemas in `schemas/index.ts` and register in `ApplicationDatabase`.
3. Generate migration `0003_catalog_tables.sql` via `drizzle-kit generate`.
4. Apply migration against PostgreSQL and verify foreign keys and indexes.
5. Execute regression test suite (127/127 tests pass).
6. Present Phase 3B verification report to Human Product Owner.
