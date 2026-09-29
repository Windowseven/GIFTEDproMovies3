# GIFTEDproMovies — System Architecture & Engineering Principles

> **Document ID:** `ARCH-001`  
> **Status:** Authoritative Foundation Document  
> **Target Audience:** Engineering Leads, Backend Architects, Full-Stack Developers, Product Operations  
> **Scope:** High-Level Architecture, Modular Monolith Design, Engineering Standards & Performance Principles  
> **Location:** `docs/architecture/01-SYSTEM-ARCHITECTURE-AND-ENGINEERING-PRINCIPLES.md`  

---

## 1. Purpose

This document establishes the official engineering architecture and operational principles for the **GIFTEDproMovies** backend platform. It serves as the authoritative blueprint that governs all technical design, module boundaries, data flows, performance standards, and infrastructure decisions before implementation begins.

Its primary objectives are:
1. **Define the Architectural Model:** Articulate why and how a Modular Monolith structure satisfies current and near-future product requirements while eliminating unnecessary enterprise complexity.
2. **Codify Engineering Principles:** Establish non-negotiable principles for performance, maintainability, clean code, testability, security, and operational sustainability.
3. **Set Clear Boundaries:** Isolate domain business logic from infrastructure, third-party payment gateways, and high-volume media delivery pipelines.
4. **Enforce Technology Discipline:** Document the evaluation status of every technical choice (**ACCEPTED**, **PROVISIONAL**, **DEFERRED**, or **REQUIRES VALIDATION**) to prevent unvetted assumptions from turning into accidental technical debt.

---

## 2. Project Context

**GIFTEDproMovies** is a commercial digital video-on-demand (VOD) and subscription streaming platform built specifically for East African audiences (Tanzania, Kenya, Uganda, Rwanda, Burundi, DRC) and the global Swahili-speaking diaspora.

### 2.1 The Core Cultural & Technical Reality
The platform's defining differentiator is Swahili-translated foreign and domestic cinema narrated by renowned voice commentators known as **Video Deejays (DJs)** (e.g., DJ Afro Amigo, DJ Murphy, DJ Mack, DJ Black, DJ Ally). 

Unlike Western multi-track audio streaming (where one video file switches language tracks dynamically), **Swahili DJ cinema uses permanently burned-in (hard-muxed) audio stems**. The DJ's commentary, humor, and sound effects are physically rendered into the video file's primary audio track. Consequently:
* A movie or episode title is a **logical container** holding one or more **discrete DJ Video Editions**.
* Changing a DJ requires streaming a completely separate video asset.
* The backend must manage multi-edition relationships, edition-specific pricing, and distinct media file references.

### 2.2 Operational Scale & Constraints
The engineering team operates under deliberate, realistic constraints:
* **Team Size:** Small engineering team with limited operational overhead.
* **Budget:** Lean infrastructure model; zero tolerance for idle cloud costs or bloated enterprise service fleets.
* **Target Environment:** Mobile-first user base predominantly accessing content over fluctuating 3G/4G cellular networks with metered mobile data packages.
* **Monetization Reality:** Reliance on local East African Mobile Money telco rails (M-Pesa, Tigo Pesa, Airtel Money, Halopesa) alongside card rails.

---

## 3. Architecture Goals

The GIFTEDproMovies system architecture must achieve the following core goals:

1. **Performance First:** Provide lightning-fast API responses, minimal payload overhead, low-latency streaming start times, and frugal resource utilization.
2. **Production-Grade Reliability:** Eliminate single points of application failure, protect transactions with ACID boundaries, and ensure zero data loss during network blips or telco webhook delays.
3. **Maintainability & High Cohesion:** Structure the codebase so any single module (e.g., Payments, Entitlements, Media) can be read, debugged, and modified independently without triggering cascading side effects.
4. **Pragmatic Security:** Protect customer data, enforce role-based access control (RBAC), secure streaming assets with short-lived tokens, and safeguard payment webhooks with cryptographic verification.
5. **Cost & Operational Simplicity:** Minimize the count of distinct moving infrastructure components. A single, well-architected monolithic service and a managed relational database must handle 100% of day-one traffic.
6. **Provider Agnosticism:** Decouple core domain logic from volatile external vendors (telco payment aggregators, media CDNs, SMS gateways) through clean interface abstractions.

---

## 4. Non-Goals

To prevent premature optimization and runaway complexity, the following are explicit **Non-Goals** for the initial system architecture:

* **Microservices Architecture:** We are NOT building distributed microservices. There will be no Kubernetes clusters, service meshes (Istio), distributed tracing fleets, or inter-service gRPC orchestration.
* **Premature Distributed Queues & Caching Fleets:** We will NOT deploy standalone Redis clusters, BullMQ fleets, Kafka brokers, or RabbitMQ servers unless measured workload bottlenecks objectively demand them.
* **Direct Video File Serving:** The backend application server will NEVER directly stream large video files (`.mp4`, `.mkv`) or store gigabyte video files in the relational database.
* **Custom Transcoding Farms:** We will NOT manage self-hosted FFmpeg transcoding clusters on raw compute instances during the initial production phase.
* **Universal Multi-Tenant SaaS Engine:** The platform is built specifically for GIFTEDproMovies; we will not introduce speculative multi-tenant schema partitioning or enterprise SaaS billing abstractions.
* **Complex Client-Side State Re-implementation on the Server:** The backend will not maintain persistent in-memory user session state machines; all application servers must remain strictly stateless.

---

## 5. Architectural Principles

Every technical decision, pull request, and design pattern in GIFTEDproMovies must satisfy eleven foundational architectural principles:

```text
+=============================================================================+
|                      FOUNDATIONAL ARCHITECTURAL PRINCIPLES                  |
+=============================================================================+
|  1. Performance First        | Latency, payload, and query efficiency first |
|  2. Maintainability          | High cohesion, low coupling, readable code   |
|  3. Clean Code Organization  | Thin controllers, focused domain services    |
|  4. Testability              | Isolated business logic, mockable providers  |
|  5. Evolvability             | Clear boundaries that permit modular growth  |
|  6. Sustainability           | Financially and operationally lean           |
|  7. Technical Debt Control   | Intentional, documented, and remediated debt |
|  8. Dependency Discipline    | Minimal external libraries; vetted tools     |
|  9. Upgradeability           | Standard platforms; no vendor entrapment     |
| 10. Human Comprehension      | Predictable conventions; clarity over clever |
| 11. Long-Term Code Health    | Predictable, reproducible, durable designs   |
+=============================================================================+
```

### 5.1 Performance First (The Primary Acceptance Rule)
A feature is **not architecturally successful merely because it produces correct output**. It must also be efficient across the entire lifecycle:
* It must not waste database connections or execute unindexed queries.
* It must not cause N+1 query cascades or load unneeded relations into memory.
* It must not block the event loop with synchronous computation or large JSON serializations.
* It must minimize network bandwidth consumed by mobile clients over cellular connections.

### 5.2 Maintainability
Architecture must optimize for long-term comprehension and debugging rather than developer shorthand. A developer joining the team must be able to understand the entire payment or entitlement flow within an hour without navigating across dozens of fragmented micro-repositories.

### 5.3 Clean Code & Code Organization
* **Single Responsibility:** Each class, function, and module must have one clearly defined reason to change.
* **Avoid Anti-Patterns:** Strictly prohibit God classes, God controllers, multi-thousand-line utility files, and mixed responsibilities.
* **Thin Controllers, Thick Services:** Controllers only parse HTTP requests, invoke domain services, and format responses. Business logic lives strictly in domain service classes.
* **Locality of Logic:** Logic related to an entity's domain rules must live within that entity's module directory.

### 5.4 Testability
Important business rules (pricing calculation, season pass discounts, entitlement verification, webhook signature parsing, publishing policy gates) must be easily unit-tested in-memory with zero network or database dependencies. External providers (telcos, storage, SMS) must be accessed via TypeScript interfaces that can be swapped with mock implementations in automated test suites.

### 5.5 Evolvability
Module boundaries must be cleanly drawn using contracts (DTOs and interfaces). If a specific module (e.g., Video Transcoding Webhook Ingestion or High-Throughput Notification Dispatching) ever experiences massive traffic spikes in the future, its clean encapsulation allows it to be extracted into a separate worker or service without rewriting the rest of the monolith.

### 5.6 Sustainability
Every single infrastructure dependency represents ongoing financial expenditure, maintenance overhead, security patching duties, and operational failure modes. The architecture prioritizes standard managed components (e.g., managed PostgreSQL) over novel multi-component infrastructure stacks.

### 5.7 Technical Debt Discipline
Technical debt must be explicitly acknowledged, labeled with `TODO: [ARCH-DEBT]`, logged in technical documentation, and accompanied by a planned remediation path. Temporary workarounds must never be merged silently as permanent architecture.

### 5.8 Dependency Discipline
Before adding any npm dependency:
1. Can this be accomplished safely using modern standard language/runtime APIs?
2. Is the library actively maintained, widely adopted, and free of security vulnerabilities?
3. Does the library introduce a deep tree of transitive dependencies?
If an existing standard utility or 20 lines of clean internal code can solve the problem, do not introduce an external library.

### 5.9 Upgradeability
Avoid non-standard monkey-patching, deprecated runtime features, or tightly coupled proprietary SDKs. Use runtime LTS releases and keep framework versions aligned with upstream stable channels.

### 5.10 Human Comprehension
Code readability always supersedes developer cleverness. Eschew overly abstract metaprogramming, dense point-free transformations, or obscure one-liners in favor of explicit, readable, strongly-typed domain code.

### 5.11 Long-Term Code Health
The system must maintain predictable performance and stability over months and years of operation. Database schemas must be protected by foreign keys and check constraints; API responses must adhere to strict contracts; and domain boundaries must be statically validated during linting and typechecking.

---

## 6. System Architecture Overview

The platform uses a decoupled three-tier architecture:

```text
+=============================================================================+
|                      GIFTEDproMovies TOPOLOGY                               |
+=============================================================================+

  [ CLIENT APPLICATIONS ]
   ├── Web Client (Next.js App Router, SSR/CSR, Responsive Mobile-First)
   └── Future Clients (Mobile Apps, Android TV, Smart TV Wrappers)
            |
            | HTTPS / JSON API (HttpOnly Cookies, Signed Tokens)
            v
  +-------------------------------------------------------------------------+
  |              APPLICATION TIER: MODULAR MONOLITH SERVICE                 |
  |              (Node.js LTS + NestJS + Fastify Adapter)                   |
  |                                                                         |
  |   +-----------------------------------------------------------------+   |
  |   |                       CORE DOMAIN MODULES                       |   |
  |   |  [Auth/RBAC]  [Catalog]  [Media-Team]  [Admin]  [Payments]     |   |
  |   |  [Entitlements]  [Playback]  [Notifications]  [Taxonomies]      |   |
  |   +-----------------------------------------------------------------+   |
  |          |                                            |                 |
  |          | Internal Interfaces                        | Presigned URLs  |
  |          v                                            v / Webhooks      |
  |   +--------------------------+          +---------------------------+   |
  |   | INFRASTRUCTURE ADAPTERS  |          | EXTERNAL CLOUD SERVICES   |   |
  |   |  - Drizzle ORM (SQL)     |          |  - Telco Webhooks (M-Pesa)|   |
  |   |  - Password Hashing      |          |  - Cloudflare Stream API  |   |
  |   |  - Cookie Session Auth   |          |  - Cloudflare R2 API      |   |
  |   |  - SMS Gateway Adapter   |          |  - Africa's Talking / Beem|   |
  |   +--------------------------+          +---------------------------+   |
  +----------------+--------------------------------------------------------+
                   |
                   | Pooled TCP Connections (pgBouncer / pg pool)
                   v
  +-------------------------------------------------------------------------+
  |                     MANAGED RELATIONAL DATABASE                         |
  |                     (PostgreSQL 16+ Engine)                             |
  |  - Relational Schemas & Constraints (ACID)                              |
  |  - B-Tree, Composite & Partial Indexes                                  |
  |  - Native Full-Text Search (tsvector)                                   |
  +-------------------------------------------------------------------------+
                   ^
                   | Metadata References (Asset IDs, Sign Keys)
                   v
  +-------------------------------------------------------------------------+
  |                    EDGE MEDIA DELIVERY & STORAGE (CDN)                  |
  |                                                                         |
  |  [ Cloudflare R2 ]                      [ Cloudflare Stream CDN ]       |
  |  - Direct-Upload Master Storage         - Transcoded Adaptive HLS       |
  |  - Presigned Secure S3 API              - Global Anycast Video Edge     |
  |  - Offline Download Storage             - Token-Gated Manifests         |
  +-------------------------------------------------------------------------+
```

---

## 7. Modular Monolith Strategy

### 7.1 What a Modular Monolith Means for GIFTEDproMovies
A Modular Monolith is a single deployable application unit whose internal codebase is partitioned into distinct, decoupled domain modules. Each module encapsulates its own domain logic, data models, and services behind well-defined internal interfaces.

### 7.2 Why It Is the Optimal Choice
1. **Single Deployment Pipeline:** Eliminates distributed deployment orchestration, container fleet networking, and distributed tracing costs.
2. **In-Process Communication:** Modules communicate via direct, type-safe in-memory method invocations (zero network serialization overhead, zero network partition risks).
3. **Local ACID Transactions:** Business operations spanning multiple domain entities (e.g., settling an Order and provisioning an Entitlement) execute within standard database transactions without requiring distributed sagas or two-phase commits.
4. **Minimal Infrastructure Footprint:** Can run reliably on a modest, cost-effective compute instance (e.g., 2 vCPU / 4GB RAM) with instant local health checks.

### 7.3 Module Boundary & Communication Rules
To prevent the monolith from degenerating into a "spaghetti" codebase, strict boundary rules are enforced:

```text
  [ Module A: Payments ]                       [ Module B: Entitlements ]
   +--------------------+                       +--------------------+
   | Controller / Route |                       | Controller / Route |
   +---------+----------+                       +---------+----------+
             |                                            |
             v                                            v
   +--------------------+                       +--------------------+
   | Domain Service     |                       | Domain Service     |
   | (PaymentEngine)    |                       | (EntitlementEngine)|
   +---------+----------+                       +---------+----------+
             |                                            ^
             | In-Process Method Call (via Interface DTO) |
             +--------------------------------------------+
```

* **Rule 1: No Cross-Module Direct Table Writes:** Module A must NEVER directly execute SQL `UPDATE` or `INSERT` statements against tables owned by Module B. Module A must invoke Module B's exported service method.
* **Rule 2: Interface-Driven Boundaries:** When Module A requires functionality from Module B, it must depend on an exported interface or DTO contract, never on internal implementation details.
* **Rule 3: Dependency Inversion for External Providers:** All third-party providers (payment gateways, SMS dispatchers, object storage) must implement domain-defined interfaces. The domain never imports SDK classes directly into business services.
* **Rule 4: In-Process Domain Events:** For asynchronous side-effects (e.g., sending an SMS receipt after order settlement), modules emit in-process events (e.g., using NestJS `EventEmitter2` or standard event listeners). The payment module fires `PaymentSettledEvent`, and the notification module handles it asynchronously without blocking the payment response.

### 7.4 Target Module Inventory
The backend modular monolith is organized into ten discrete functional modules:

```text
backend/src/modules/
├── auth/           # Identity, password hashing, sessions, cookie management, RBAC
├── users/          # Customer profiles, administrative staff accounts, VIP status
├── catalog/        # Public content: movies, series, seasons, episodes, categories, countries
├── djs/            # Voice artist roster, profiles, and associated video editions
├── media-team/     # Intake studio, master file staging, video metadata, quality audits
├── admin/          # Governance, publishing approval gate, settings, income reporting
├── payments/       # Provider-agnostic payment intents, STK pushes, webhook reconciliation
├── entitlements/   # Customer access passes, time-limited expirations, VIP subscriptions
├── playback/       # Stream authorization, signed token issuance, resume progress tracking
└── notifications/  # Transactional SMS dispatch, system banners, staff queue counters
```

---

## 8. Performance Architecture

Performance is analyzed and engineered across the complete request-response path. The architecture enforces optimizations across ten distinct technical dimensions:

```text
+=============================================================================+
|                      10 DIMENSIONS OF PERFORMANCE                           |
+=============================================================================+
| 1. Client Runtime    | Zero heavy computations; lean DOM; fast time-to-first |
| 2. Network Transit   | Small payloads; gzip/brotli compression; HTTP/2 & 3  |
| 3. API Execution     | Fastify engine; non-blocking handlers; minimal JSON  |
| 4. Database Engine   | B-tree indexes; single-query joins; connection pools |
| 5. Media Delivery    | Anycast Edge CDN; adaptive bitrate HLS (360p-1080p)   |
| 6. CPU & Memory      | Stateless nodes; streaming transforms; no big arrays |
| 7. Background Work   | Defer non-critical work; fire-and-forget events      |
| 8. Asset Loading     | Modern WebP/AVIF images; SVGs; immutable cache headers|
| 9. Query Efficiency  | Strict pagination; projection of required columns    |
| 10. Serialization    | Fast schema-based JSON serialization; no deep clones |
+=============================================================================+
```

---

## 9. Network Performance Strategy

Mobile clients in East Africa face high network latency (60ms–250ms) and metered cellular data costs. The backend must strictly minimize bytes transferred over the wire:

### 9.1 Payload Size & Response Shaping
* **No `SELECT *` Responses:** API responses must return only the fields required by the active view. For instance, catalog listing cards return `id`, `title`, `slug`, `posterUrl`, `releaseYear`, and `rating`. Large fields like `description`, `backdropUrl`, and complete episode arrays are omitted until the detail view is requested.
* **Lightweight Response DTOs:** Strip all internal fields (`deletedAt`, `updatedAt`, internal flags, raw vendor transaction dumps) from public payloads.

### 9.2 HTTP Compression & Transfer Protocols
* **Transport Compression:** Fastify must be configured with native Brotli and Gzip compression for all text-based JSON payloads exceeding 1 KB.
* **HTTP/2 & HTTP/3 Support:** Terminate client connections at the CDN edge using HTTP/2 and HTTP/3 to enable multiplexed requests over a single TCP connection, eliminating head-of-line blocking on cellular links.

### 9.3 HTTP Caching & Conditional Requests
* **Public Catalog Caching:** Catalog endpoints (`/catalog/movies`, `/catalog/djs`, `/catalog/categories`) must serve `Cache-Control: public, max-age=60, s-maxage=300, stale-while-revalidate=600` headers.
* **ETag Validation:** Dynamic catalog queries must generate lightweight ETags. Browsers sending `If-None-Match` receive an instant `304 Not Modified` (0 bytes payload) when the catalog has not changed.

### 9.4 Efficient Pagination Standards
* **Mandatory Pagination:** No public list endpoint may return an unbounded array. The default page size is 20 items, with a hard maximum of 50 items.
* **Cursor-Based Pagination for Feeds:** High-volume listings (infinite scroll movie feeds) use cursor-based pagination (`created_at` or `id` cursor) to eliminate the database performance penalty of high-offset SQL queries (`OFFSET 10000`).

---

## 10. System Performance Strategy

System performance governs server CPU, memory, event loop health, and database connection capacity:

### 10.1 High-Throughput HTTP Engine (Fastify Adapter)
NestJS must be paired with the **Fastify adapter** rather than Express:
* Fastify provides 2x–4x higher throughput and significantly lower request latency than Express under high concurrent connection loads.
* Utilizes `fast-json-stringify` for schema-based response serialization, bypassing standard V8 `JSON.stringify` bottlenecks.

### 10.2 Event Loop Protection
* **Zero Synchronous CPU Blocking:** Long-running computations, cryptographic key generation, or heavy parsing must never run synchronously on the main thread.
* **Streaming File Uploads:** Uploads of video masters or large artwork must never buffer entirely in server RAM. Master uploads bypass application compute entirely via direct-to-storage presigned URLs.

### 10.3 Database Connection Pool Discipline
* **Pool Sizing:** Configure connection pool sizes realistically (e.g., 10–20 connections per instance) rather than spawning hundreds of idle database threads that degrade PostgreSQL engine efficiency.
* **Transaction Longevity:** Keep transactions as short as possible. Never execute third-party HTTP network calls (e.g., calling an external telco API) while holding an open database transaction lock.

---

## 11. Lazy Loading and Deferred Work Strategy

> **Core Principle:** "Load what is necessary, when it is necessary, as efficiently as possible."

### 11.1 When to Apply Lazy Loading
* **Relational Data Joins:** When retrieving a movie title, do not eagerly load all historical audit logs, all user reviews, or all episode metadata. Load only the primary record and the published DJ editions.
* **Artwork & Media Metadata:** Do not return full-resolution image arrays or download master URLs during a catalog search request. Return lightweight preview thumbnails.
* **Episodic Deep Hierarchies:** When fetching a Series container, fetch only season summaries. Fetch individual episode lists on-demand when the user expands that specific season tab.

### 11.2 When NOT to Apply Lazy Loading
* **Critical Path Permissions:** Do not lazily load user roles or entitlement checks in multiple sequential database queries. Perform a single, efficient indexed query joining the user and their active entitlement for the target movie.
* **Core Application Startup:** Do not defer critical configuration validation or database schema checks to request time; fail fast during application bootstrap if database connectivity is unavailable.

### 11.3 Deferred & Non-Blocking Work
Work that does not directly influence the immediate client HTTP response must be deferred out of the request/response path:
* **Audit Logging:** Recording user navigation views or staff inspection logs is handled asynchronously after the response is dispatched.
* **Notification Dispatching:** Sending transactional SMS receipts or external webhooks is triggered as a background promise or local event without delaying the payment confirmation response.

---

## 12. Database Architecture Principles

PostgreSQL 16+ is the primary, authoritative relational database.

```text
+=============================================================================+
|                      DATABASE ARCHITECTURE BLUEPRINT                        |
+=============================================================================+

  [ Core Tables ]               [ Relationships ]            [ Integrity Rules ]
   movies                       1 -> N movie_versions        Foreign Keys (RESTRICT)
   series                       1 -> N seasons -> N episodes Cascading Deletes (Soft)
   customer_users               1 -> N orders -> N items     CHECK (price >= 0)
   customer_users               1 -> N entitlements          UNIQUE (user, slug, dj)
   voice_artists (DJs)          1 -> N movie_versions        Indexed Slugs & Status
```

### 12.1 Relational Normalization & Constraints
* **Third Normal Form (3NF):** Data is modeled relationally to eliminate duplication and update anomalies.
* **Database-Level Integrity:** Never rely solely on application code for data integrity. The PostgreSQL schema must enforce `NOT NULL`, `CHECK`, `UNIQUE`, and `FOREIGN KEY` constraints.
* **Controlled Denormalization:** Denormalization is permitted only for measured performance hotspots (e.g., storing a pre-aggregated `views_count`, `purchases_count`, or a generated `search_vector` column updated via triggers).

### 12.2 Indexing Strategy
* **Lookup Columns:** Foreign keys and unique lookup fields (`slug`, `email`, `phone_number`, `order_reference`) must always be indexed.
* **Composite Indexes:** Compound queries (e.g., querying movies by `status = 'published' AND is_trending = true ORDER BY published_at DESC`) must be supported by composite indexes matching the query predicate and sort order.
* **Partial Indexes:** Optimize storage and cache hit rates using partial indexes (e.g., `CREATE INDEX idx_active_entitlements ON entitlements (customer_id, item_slug) WHERE expires_at > NOW();`).

### 12.3 Transaction Boundaries
* Financial transactions, order settlements, and entitlement issuances must execute inside explicit `BEGIN ... COMMIT` blocks.
* If any step fails (e.g., entitlement insertion fails after order completion), the entire transaction rolls back to ensure zero financial or licensing inconsistency.

### 12.4 Soft Deletion & Auditability
* Core business entities (`movies`, `series`, `customer_users`, `orders`) utilize soft deletion (`deleted_at TIMESTAMP WITH TIME ZONE NULL`) to prevent accidental data loss and maintain historical financial reporting integrity.
* Every table includes immutable `created_at` and automated `updated_at` audit timestamps.

---

## 13. API Architecture Principles

The API layer is the contract that decouples the frontend client from backend internals:

```text
  Client Request ---> [ Version Guard: /api/v1 ]
                             |
                             v
                      [ Global Validation Pipe (DTO) ]
                             |
                             v
                      [ Auth / RBAC Guards ]
                             |
                             v
                      [ Domain Controller ]
                             |
                             v
                      [ Standard Envelope Response ]
```

### 13.1 Uniform Envelope Structure
All API responses adhere to a consistent, predictable JSON format:

```typescript
// Standard Success Envelope
interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page?: number;
    pageSize?: number;
    totalItems?: number;
    totalPages?: number;
  };
}

// Standard Error Envelope (RFC 7807 Inspired)
interface ApiErrorResponse {
  success: false;
  error: {
    code: string;            // e.g. "ERR_ENTITLEMENT_EXPIRED"
    message: string;         // Human-readable message
    details?: Array<{
      field: string;
      message: string;
    }>;
  };
  timestamp: string;         // ISO-8601
  requestId: string;         // Correlation ID for log tracking
}
```

### 13.2 Strict Input Validation & DTOs
* Every incoming request body, query parameter, and path variable must be validated against a strict Data Transfer Object (DTO) schema.
* Malformed payloads or extra unrecognized fields must be rejected immediately (`400 Bad Request`) with precise field-level validation errors before reaching any domain service.

### 13.3 HTTP Semantics & Versioning
* Strictly adhere to RESTful status codes: `200 OK`, `201 Created`, `204 No Content`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`, `429 Too Many Requests`, and `500 Internal Error`.
* All endpoints are prefixed with a major API version: `/api/v1/`. Breaking changes require a version bump to `/api/v2/`.

---

## 14. Authentication and Security Principles

### 14.1 Server-Managed Authentication (HttpOnly Secure Cookies)
* **No `localStorage` Tokens:** Storing authentication tokens in browser `localStorage` or `sessionStorage` exposes customers to Cross-Site Scripting (XSS) token theft.
* **Encrypted HttpOnly Cookies:** Authentication sessions will be managed via secure, `HttpOnly`, `SameSite=Lax` (or `Strict`), cryptographically signed session cookies. The browser runtime cannot read these cookies via JavaScript, neutralizing XSS credential exfiltration.
* **Token Invalidation:** Server-side revocation ensures that logging out or administrative account suspension immediately invalidates active sessions.

### 14.2 Role-Based Access Control (RBAC)
The platform enforces three strictly separated roles via route guards:
* **`customer`:** Public browsing, checkout, viewing owned library items, stream access for valid entitlements. Forbidden from administrative and media intake routes.
* **`media_team`:** Ingesting master content, managing DJ editions, updating metadata, and submitting titles for review. Governed by the platform approval policy.
* **`admin`:** Full authority to approve staged content, toggle publishing gates, configure platform finances, audit user orders, and manage staff permissions.

### 14.3 Guest Checkout Bridging
* Unregistered users can purchase single movie stream passes using their mobile money phone number.
* Upon successful payment, an ephemeral signed session token is issued to the purchasing device.
* When the guest subsequently creates an account using that phone number, the backend automatically binds all orphaned purchase orders and entitlements to the newly registered customer ID.

### 14.4 Webhook Cryptographic Verification
* Telco payment webhooks (M-Pesa, Tigo, etc.) and media transcoding webhooks must be cryptographically verified:
  - Validate HMAC-SHA256 request signatures or shared webhook secrets.
  - Reject unverified or tampered payloads immediately.
  - Implement replay-attack mitigation using idempotency keys and request timestamps.

### 14.5 Rate Limiting & Abuse Prevention
* Implement sliding-window rate limiting on sensitive routes:
  - Authentication attempts (`/api/v1/auth/login`): 5 attempts per minute per IP.
  - Payment initiation (`/api/v1/payments/lipa-push`): 3 requests per minute per phone number.
  - SMS OTP requests: 1 request per 2 minutes per phone number.

---

## 15. Media Architecture

> **Primary Media Rule:** The application server is a metadata and business rules coordinator; it NEVER streams raw video files or handles bulk file uploads.

```text
+=============================================================================+
|                      MEDIA INGESTION & STREAMING PIPELINE                   |
+=============================================================================+

  [ 1. INGESTION PHASE (Media Team Operator) ]
   Operator UI ---> POST /media-team/upload-url ---> Backend validates operator
         |                                                 |
         |<--- Returns Presigned S3/R2 URL + Token <-------+
         |
         +----------------------------------------------> [ Cloudflare R2 Bucket ]
          Direct Binary Upload (Bypasses Backend Compute)  Raw Master Stored

  [ 2. TRANSCODING & ENCODING PHASE ]
   Cloudflare R2 ---> Ingested by Transcoder Engine ---> Multi-Bitrate HLS
                                                                |
                                                                v
                                                    [ Cloudflare Stream CDN ]
                                                    - 1080p, 720p, 480p, 360p

  [ 3. SECURE PLAYBACK PHASE (Customer Stream) ]
   Customer Watch UI ---> GET /playback/stream-token?slug=...&dj=...
                                |
                                v
                         Backend verifies Entitlement / VIP Pass
                                |
                                v
                         Issues Signed, Time-Limited Playback Token
                                |
                                v
   Customer Video Player <------+
         |
         | Uses Signed Token to fetch .m3u8 manifest
         v
   [ Cloudflare Stream Edge CDN ] ---> Streams HLS chunks directly to client
```

### 15.1 Application Server vs Media Delivery Separation
* **Application Server Responsibilities:** Authenticating users, evaluating active entitlements or VIP subscriptions, tracking viewing progress, storing title metadata, and generating signed token URLs.
* **Media Delivery Responsibilities:** Storing multi-gigabyte video files, transcoding into multi-bitrate HLS streams, packaging mobile download packages, distributing video chunks via global Anycast edge nodes, and caching segments near East African users.

### 15.2 Ingestion via Presigned URLs
Media team operators upload high-definition master files directly from their browser or studio client to Cloudflare R2 object storage using time-limited presigned S3 URLs. Server CPU and memory remain entirely unburdened during multi-gigabyte uploads.

### 15.3 Time-Limited Signed Stream Tokens
To prevent unauthorized stream hotlinking or URL sharing, the backend generates HMAC-signed, time-limited video manifest URLs (valid for 4 hours). Only users with active entitlements can obtain a valid manifest signature.

---

## 16. Payment Architecture

Payments must be strictly **provider-agnostic**. The core domain must never depend on the idiosyncratic API structures, field names, or error codes of specific telcos (Vodacom M-Pesa, Tigo Pesa, Airtel Money) or aggregators.

```text
+=============================================================================+
|                      PROVIDER-AGNOSTIC PAYMENT MODEL                        |
+=============================================================================+

  [ Domain Business Layer ]
         |
         v
   PaymentService ------------------------+
   - createPaymentIntent()                |
   - processSettlement()                  |
   - issueEntitlement()                   |
         |                                |
         v                                v
  [ IPaymentProvider Interface ]    [ IPaymentProvider Interface ]
   (M-Pesa Adapter)                  (Tigo / Airtel Adapter)
         |                                |
         v                                v
  External M-Pesa API               External Tigo API
```

### 16.1 Core Domain Payment Abstractions
The domain models all payment operations around standardized domain entities:
* **`PaymentIntent`:** A customer's declared intention to purchase a specific item (Movie Edition, Season Pass, or VIP subscription) at a verified TSh price.
* **`PaymentTransaction`:** An immutable record of an attempted payment transaction, tracking status (`pending`, `processing`, `completed`, `failed`), amount, provider name, and external reference.
* **`PaymentProviderAdapter`:** An interface defining standard operations (`initiateStkPush()`, `verifyWebhook()`, `queryTransactionStatus()`).
* **`PaymentWebhookEvent`:** A normalized internal event representing an external payment callback, decoupling the settlement handler from telco-specific payload shapes.

### 16.2 Idempotent Webhook Processing
Telco networks frequently retry webhook deliveries upon transient network timeouts. The webhook receiver must be strictly idempotent:
* Each transaction records a unique provider transaction ID.
* If a webhook callback arrives for an already `completed` transaction, the system returns `200 OK` immediately without re-crediting the customer, re-issuing duplicate passes, or triggering duplicate SMS receipts.

---

## 17. Observability

A lean production system requires clear visibility without the operational burden of an enterprise observability cluster.

```text
  [ Incoming HTTP Request ] ---> Injects 'x-request-id'
                                      |
                                      v
  [ Structured JSON Log ] <----- Fastify / Pino Logger
  { "reqId": "...", "level": "info", "msg": "Payment settled", "orderId": "..." }
                                      |
                                      v
  [ Health Endpoints ] <-------- /health/live (Process alive)
                                 /health/ready (DB connection verified)
```

### 17.1 Structured JSON Logging
* All application logs are output to `stdout` in structured JSON format using a high-performance logger (e.g., Pino).
* Every log line includes a unique `requestId` (passed from the client or generated via an inbound middleware), allowing complete request tracing during incident debugging.

### 17.2 Health Probes
The service exposes standard lightweight health endpoints:
* **`/health/live`:** Returns `200 OK` if the Node.js event loop is responsive.
* **`/health/ready`:** Executes a lightweight database ping (`SELECT 1`) to verify that the application is ready to accept user traffic.

### 17.3 Administrative & Financial Audit Logs
Critical administrative actions (e.g., publishing a movie, overriding an approval gate, modifying content pricing, issuing a manual entitlement) must write an immutable record to the `audit_logs` database table capturing `actor_id`, `action`, `resource_id`, and `ip_address`.

---

## 18. Cost and Operational Constraints

To ensure economic sustainability for GIFTEDproMovies:
1. **Zero Unjustified Infrastructure:** Do not deploy standalone Redis, Elasticsearch, Kafka, or worker containers during the initial deployment phase.
2. **Utilize PostgreSQL Built-Ins First:**
   * Use PostgreSQL native full-text search (`tsvector` and `tsquery`) instead of running a dedicated Elasticsearch or Meilisearch cluster.
   * Use PostgreSQL row locking (`SELECT ... FOR UPDATE SKIP LOCKED`) for simple internal job queues if background tasks are required, rather than provisioning a separate Redis queue instance.
3. **Bandwidth Cost Control:** Leverage Cloudflare's cost-effective zero-egress models (Cloudflare R2 to Cloudflare Stream) to eliminate bandwidth egress fees that typically cripple video platforms on traditional cloud providers (AWS S3/GCP).

---

## 19. Scalability Strategy

The system is designed to scale gracefully from initial launch to high regional concurrency:

```text
                           [ DNS / Anycast Edge ]
                                     |
                                     v
                       [ Reverse Proxy / Load Balancer ]
                                     |
                    +----------------+----------------+
                    |                                 |
                    v                                 v
        [ Monolith Instance 1 ]             [ Monolith Instance 2 ]
        (Stateless Node.js)                 (Stateless Node.js)
                    \                                 /
                     \                               /
                      v                             v
               +-------------------------------------------+
               |         Managed PostgreSQL Cluster        |
               |  - Primary Node (All Writes & Trans)      |
               |  - Optional Read Replica (Catalog Reads)  |
               +-------------------------------------------+
```

1. **Stateless Compute Instances:** Because sessions are verified cryptographically via signed cookies and all state resides in PostgreSQL, the backend monolith can scale horizontally by launching additional compute nodes behind a simple reverse proxy/load balancer with zero code changes.
2. **Read Replica Offloading (Future Scale):** When public catalog browsing volume outpaces write traffic, read-only queries (`/catalog/*`) can be routed to a PostgreSQL read replica, preserving primary database capacity for payment checkouts and order processing.
3. **95%+ Edge Offload:** Video chunks (HLS TS/fMP4 segments) and static imagery represent >95% of total platform bandwidth. By offloading these assets to Cloudflare CDN edge nodes, the application server handles only lightweight JSON metadata and authorization requests.

---

## 20. Technology Decisions

The following technology stack represents the current architectural direction for the GIFTEDproMovies backend:

* **Runtime:** Node.js LTS (20.x or 22.x) with TypeScript (Strict mode enabled).
* **Application Framework:** NestJS utilizing the high-performance Fastify adapter.
* **Database Engine:** PostgreSQL 16+ (Managed instance).
* **Data Access & Query Layer:** Drizzle ORM (SQL-first, zero runtime overhead, strictly typed).
* **Authentication Strategy:** Server-managed HttpOnly signed cookies with Argon2id password hashing.
* **Media Storage & Streaming:** Cloudflare R2 (Master files & downloads) + Cloudflare Stream (Adaptive HLS streaming).
* **Payment Architecture:** Provider-agnostic adapter layer supporting Tanzanian Mobile Money (M-Pesa, Tigo, Airtel) and card rails.

---

## 21. Decision Status

Every architectural component is explicitly classified into one of four statuses:
* **ACCEPTED:** Confirmed and approved for implementation.
* **PROVISIONAL:** Current leading architectural choice; pending empirical verification during architecture spike.
* **DEFERRED:** Deliberately postponed to a future project phase to avoid premature complexity.
* **REQUIRES VALIDATION:** Involves business, financial, or third-party partner dependencies requiring external confirmation before commitment.

| Architectural Decision | Status | Rationale / Dependency |
| :--- | :--- | :--- |
| **Modular Monolith Architecture** | **ACCEPTED** | Best fit for team size, operational budget, and system cohesion. |
| **Node.js LTS + TypeScript** | **ACCEPTED** | Shares language and type models with Next.js frontend; strong ecosystem. |
| **PostgreSQL as Primary Database** | **ACCEPTED** | ACID compliance for payments, relational integrity, robust native full-text search. |
| **Server-Managed HttpOnly Auth** | **ACCEPTED** | Essential security posture; prevents XSS token theft inherent in `localStorage`. |
| **Provider-Agnostic Payment Abstraction** | **ACCEPTED** | Decouples business logic from fluctuating telco API shapes and provider outages. |
| **Direct-to-Storage Presigned Uploads** | **ACCEPTED** | Prevents multi-gigabyte video uploads from choking application server compute. |
| **NestJS + Fastify Adapter** | **PROVISIONAL** | Preferred for modular architecture and throughput; requires benchmarking vs pure Fastify. |
| **Drizzle ORM** | **PROVISIONAL** | Preferred for SQL transparency and low overhead; requires schema migration testing. |
| **Cloudflare Stream for Video Delivery** | **PROVISIONAL** | Preferred for cost-effective HLS delivery; requires pricing validation at scale. |
| **Cloudflare R2 for Storage** | **PROVISIONAL** | Preferred for zero-egress cost; requires evaluation of presigned upload reliability. |
| **Standalone Redis Cache / BullMQ** | **DEFERRED** | Unnecessary on day one; PostgreSQL handles queues and state until scale demands it. |
| **Microservices Partitioning** | **DEFERRED** | Premature; introduces unnecessary operational and financial overhead. |
| **Dedicated Search Engine (Elastic/Meili)** | **DEFERRED** | PostgreSQL `tsvector` is more than adequate for initial catalog size. |
| **Direct Carrier Billing vs Aggregator** | **REQUIRES VALIDATION** | Awaiting business decision on whether to integrate direct telco APIs (Daraja/Tigo) or a local aggregator (e.g., DPO, Selcom, Flutterwave). |
| **SMS Gateway Partner Selection** | **REQUIRES VALIDATION** | Requires throughput, delivery rate, and cost comparison between Africa's Talking and Beem Africa. |
| **Offline Video Package DRM / Encryption** | **REQUIRES VALIDATION** | Requires policy decision on whether MP4 mobile downloads require encrypted HLS/FairPlay/Widevine or standard signed URL download packages. |

---

## 22. Risks and Trade-offs

| Architectural Choice | Advantages | Risks / Trade-offs | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Modular Monolith** | Simple deployment, zero network latency between modules, local ACID transactions. | Risk of lazy imports blurring module boundaries over time. | Enforce strict linter rules, file organization conventions, and code review checklists. |
| **NestJS + Fastify** | High cohesion, built-in dependency injection, superior throughput over Express. | NestJS abstraction layer adds learning curve compared to bare Node scripts. | Standardize module structure; use thin controllers and pure TypeScript services. |
| **Drizzle ORM** | Zero overhead, SQL-first transparency, strict TypeScript inference. | Newer ecosystem compared to Prisma or TypeORM; fewer automatic migration bells. | Maintain explicit, reviewed SQL migration scripts; verify schema changes in CI. |
| **HttpOnly Cookie Auth** | Immune to XSS token exfiltration; automatic browser transmission. | Requires strict CSRF defenses and proper cookie domain configuration across ports/domains. | Enforce `SameSite=Lax`, secure headers, and CSRF double-submit token verification on mutating requests. |
| **Managed Video (Cloudflare)** | Eliminates self-hosted FFmpeg transcoding headaches and CDN maintenance. | Platform vendor lock-in for video encoding format and playback URLs. | Isolate media URL generation behind an internal `MediaDeliveryService` interface. |

---

## 23. Deferred Decisions

The following architectural decisions are deliberately deferred to future development phases:

1. **Standalone Redis Caching Cluster:** Caching will initially rely on HTTP gateway cache headers and PostgreSQL query optimization. A Redis cluster will be introduced only when database read metrics demonstrate contention.
2. **Dedicated Background Queue Worker Fleet:** Asynchronous jobs (email/SMS dispatch) will execute via in-process background promises or a simple database-backed queue table. Distributed BullMQ workers are deferred.
3. **Dedicated Search Engine Infrastructure:** Catalog search across movie titles, DJ names, and genres will be powered by PostgreSQL GIN-indexed full-text search (`to_tsvector('simple', title)`). Elasticsearch/Meilisearch is deferred until the catalog exceeds 100,000 titles.
4. **Native Mobile App Push Notification Engine:** Push notification integration (Firebase Cloud Messaging/APNs) is deferred until native iOS/Android client applications are developed.
5. **Multi-Region Active-Active Database Replication:** Single-region managed PostgreSQL with automated daily snapshots and point-in-time recovery is fully sufficient for initial operational scale.

---

## 24. Questions Requiring Future Validation

Before implementation begins on specific functional modules, the following open questions must be resolved through empirical technical spikes or business clarification:

1. **Payment Integration Rails:**
   * *Question:* Will GIFTEDproMovies integrate directly with carrier APIs (Vodacom M-Pesa Daraja, Tigo Pesa, Airtel Money OpenAPI) or route through a licensed payment aggregator (e.g., Selcom, DPO Pay, Flutterwave)?
   * *Impact:* Directly affects webhook payload structures, sandbox testing setup, and regulatory compliance requirements.
2. **SMS Delivery Rates in Tanzania:**
   * *Question:* What are the measured delivery latencies and per-message rates between Africa's Talking and Beem Africa when dispatching OTP tokens and transactional payment receipts to Vodacom and Airtel numbers?
   * *Impact:* Determines the primary SMS gateway adapter implementation.
3. **Cloudflare Stream Cost Modeling:**
   * *Question:* Does Cloudflare Stream's pricing ($5 per 1,000 minutes stored, $1 per 1,000 minutes viewed) align with projected margins for TSh 1,500 ($0.58) single-movie pay-per-view passes?
   * *Impact:* Validates whether Cloudflare Stream is economically viable or if a hybrid pipeline (Cloudflare R2 + self-packaged HLS via a worker) is required.
4. **Offline Download Security Constraints:**
   * *Question:* For mobile download passes (TSh 2,500), does the business require client-side DRM containerization, or are expiring signed direct-download MP4 links acceptable for initial release?
   * *Impact:* Determines media processing complexity and player client capabilities.

---

## 25. Architecture Evolution Strategy

The platform architecture is designed to evolve in three distinct, measured phases:

```text
  [ PHASE 1: MODULAR MONOLITH CORE ]
   Single service, managed PostgreSQL, Cloudflare edge, in-process events.
   Zero enterprise overhead. Fully serves launch requirements.
                 |
                 | (Traffic growth & measured bottlenecks)
                 v
  [ PHASE 2: TELEMETRY & TARGETED CACHING ]
   Horizontal compute replication (stateless nodes), read replica offload,
   lightweight Redis caching layer for hot catalog queries if justified.
                 |
                 | (High-volume operational scale)
                 v
  [ PHASE 3: SELECTIVE EXTRACTION ]
   Extract ONLY the independently bottlenecked module (e.g., Media Ingestion
   Transcoding Worker or SMS Queue Fleet) while leaving the core business
   monolith completely intact.
```

By following this evolution roadmap, GIFTEDproMovies ensures that technical architecture remains an enabler of business velocity, user performance, and economic sustainability, rather than an operational burden.
