# GIFTEDproMovies — System Architecture & Engineering Principles

> **Document ID:** `ARCH-001`  
> **Status:** Authoritative Foundation Document (Revised & Cleaned)
> **Target Audience:** Engineering Leads, Backend Architects, Full-Stack Developers, Product Operations  
> **Scope:** High-Level Architecture, Modular Monolith Design, Engineering Standards & Performance Principles  
> **Location:** `docs/architecture/01-SYSTEM-ARCHITECTURE-AND-ENGINEERING-PRINCIPLES.md`  

---

## 1. Purpose

This document establishes the official engineering architecture and operational principles for the **GIFTEDproMovies** backend platform. It serves as the authoritative blueprint governing technical design, module boundaries, data flows, performance standards, and infrastructure decisions before implementation begins.

Its primary objectives are:
1. **Define the Architectural Model:** Articulate why and how a Modular Monolith structure satisfies current and near-future product requirements while eliminating unnecessary enterprise complexity.
2. **Codify Engineering Principles:** Establish non-negotiable principles for performance, maintainability, clean code, testability, security, and operational sustainability.
3. **Set Clear Boundaries:** Isolate domain business logic from infrastructure, third-party payment gateways, and high-volume media delivery pipelines.
4. **Enforce Technology Discipline:** Document the evaluation status of every technical choice (**ACCEPTED**, **PROVISIONAL**, **DEFERRED**, or **REQUIRES VALIDATION**) to prevent unvetted assumptions from turning into accidental technical debt.

---

## 2. Project Context

**GIFTEDproMovies** is a digital movie and video content platform requiring controlled content access, media delivery, customer accounts, administrative operations, payments, and entitlement management.

### 2.1 Confirmed Functional Scope
The platform architecture is designed to support:
* Customer account registration and authentication.
* Movie and episodic series browsing, search, and discovery.
* Taxonomy management across categories, countries, and associated voice commentators / translators (DJs).
* Versioned content access where a title container holds multiple media editions (e.g., editions featuring distinct commentators or audio mixes embedded directly within the video asset).
* Time-limited access passes (pay-per-view streaming and authorized offline download packages).
* Subscription and access plan evaluation.
* Media team intake and content management workflows.
* Administrative operations and publishing authorization gates.
* Regional payment method integration (including mobile money and card payment rails).
* Secure media delivery and entitlement enforcement.

The confirmed initial market is Tanzania and the currency is TZS. The payment provider remains pending; this market decision does not select a provider or establish taxes, fees, or pricing.

### 2.2 Operational Scale & Resource Constraints
The engineering team operates under deliberate, realistic constraints:
* **Team Size:** Small engineering team with limited operational capacity.
* **Budget:** Lean infrastructure model prioritizing cost-efficiency and minimizing idle cloud resources.
* **Client Environment:** Mobile-first users frequently accessing services over metered cellular networks.
* **Operational Simplicity:** Preference for the smallest infrastructure footprint that satisfies security, performance, and reliability standards.

---

## 3. Architecture Goals

The system architecture must achieve the following core goals:

1. **Performance First:** Provide low-latency API responses, minimal payload overhead, rapid media start times, and efficient compute resource utilization.
2. **Production-Grade Reliability:** Eliminate single points of application failure, protect transactions with ACID boundaries, and ensure data integrity during external network or payment callback delays.
3. **Maintainability & High Cohesion:** Structure the codebase so any single module (e.g., Payments, Entitlements, Catalog) can be understood, debugged, and modified independently without cascading side effects.
4. **Pragmatic Security:** Protect customer data, enforce role-based access control (RBAC), secure streaming assets with short-lived tokens, and safeguard payment webhooks with cryptographic verification.
5. **Cost & Operational Simplicity:** Minimize the count of distinct moving infrastructure components. A single, well-architected monolithic service and a managed relational database must handle initial production traffic.
6. **Provider Agnosticism:** Decouple core domain logic from volatile external vendors (payment gateways, media CDNs, SMS gateways) through clean interface abstractions.

---

## 4. Non-Goals

To prevent premature optimization and runaway complexity, the following are explicit **Non-Goals** for the initial system architecture:

* **Microservices Architecture:** We are NOT building distributed microservices. There will be no Kubernetes clusters, service meshes, distributed tracing fleets, or inter-service gRPC orchestration.
* **Premature Distributed Queues & Caching Fleets:** We will NOT deploy standalone Redis clusters, BullMQ fleets, Kafka brokers, or RabbitMQ servers unless measured workload bottlenecks objectively demand them.
* **Direct Video File Serving:** The backend application server will NEVER directly stream large video files (`.mp4`, `.mkv`) or store video binary data in the relational database.
* **Custom Transcoding Farms:** We will NOT manage self-hosted FFmpeg transcoding clusters on raw compute instances during the initial production phase.
* **Speculative Multi-Tenant SaaS Features:** The platform is built specifically for GIFTEDproMovies; we will not introduce speculative multi-tenant schema partitioning or generic white-label billing abstractions.
* **Stateful Compute Nodes:** The application compute layer will not store persistent in-memory session state; compute instances must remain horizontally replicable.

---

## 5. Architectural Principles

Every technical decision, pull request, and design pattern must satisfy eleven foundational architectural principles:

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
A feature is **not architecturally successful merely because it produces correct output**. It must also be efficient across its entire lifecycle:
* It must not waste database connections or execute unindexed queries.
* It must not cause N+1 query cascades or load unneeded relations into memory.
* It must not block the event loop with synchronous computation or large serializations.
* It must minimize network bandwidth consumed by mobile clients over cellular connections.
* Performance targets will be established through workload-specific benchmarking and production telemetry rather than unverified assumptions.

### 5.2 Maintainability
Architecture must optimize for long-term comprehension and debugging rather than developer shorthand. An engineer joining the project must be able to understand the payment or entitlement flow within an hour without navigating across dozens of fragmented micro-repositories.

### 5.3 Clean Code & Code Organization
* **Single Responsibility:** Each class, function, and module must have one clearly defined responsibility.
* **Avoid Anti-Patterns:** Strictly prohibit God classes, God controllers, multi-thousand-line utility files, and mixed responsibilities.
* **Thin Controllers, Focused Services:** Controllers only handle HTTP transport concerns, delegate to domain services, and return responses. Business logic lives strictly in domain service classes.
* **Locality of Logic:** Logic related to an entity's domain rules must live within that entity's module directory.

### 5.4 Testability
Important business rules (pricing evaluation, pass validity, entitlement verification, webhook signature parsing, publishing policy gates) must be easily unit-tested in-memory with zero network or database dependencies. External providers (payment gateways, storage, SMS) must be accessed via TypeScript interfaces that can be swapped with mock implementations in automated test suites.

### 5.5 Evolvability
Module boundaries must be cleanly drawn using contracts (DTOs and interfaces). If a specific module (e.g., Media Ingestion Webhooks or Notification Dispatching) ever experiences high traffic spikes in the future, its clean encapsulation allows it to be extracted into a separate worker or service without rewriting the rest of the monolith.

### 5.6 Sustainability
Every single infrastructure dependency represents ongoing financial expenditure, maintenance overhead, security patching duties, and operational failure modes. The architecture prioritizes standard managed components (e.g., managed PostgreSQL) over novel multi-component infrastructure stacks.

### 5.7 Technical Debt Discipline
Technical debt must be explicitly acknowledged, labeled with `TODO: [ARCH-DEBT]`, logged in technical documentation, and accompanied by a planned remediation path. Temporary workarounds must never be merged silently as permanent architecture.

### 5.8 Dependency Discipline
Before adding any external package:
1. Can this be accomplished safely using modern standard language/runtime APIs?
2. Is the library actively maintained, widely adopted, and free of security vulnerabilities?
3. Does the library introduce a deep tree of transitive dependencies?
If an existing standard utility or a small block of clean internal code can solve the problem safely, do not introduce an external library.

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
   └── Future Clients (Mobile Apps, TV Client Wrappers)
            |
            | HTTPS / JSON API (Server-Controlled HttpOnly Cookies, Signed Tokens)
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
  |   |  - Drizzle ORM (SQL)     |          |  - Payment Webhook API    |   |
  |   |  - Password Hashing      |          |  - Media Delivery CDN     |   |
  |   |  - Cookie Auth Handling  |          |  - Object Storage API     |   |
|   |  - Notification Adapter  |          |  - Email Delivery API     |   |
  |   +--------------------------+          +---------------------------+   |
  +----------------+--------------------------------------------------------+
                   |
                   | Pooled Database Connections
                   v
  +-------------------------------------------------------------------------+
  |                     MANAGED RELATIONAL DATABASE                         |
  |                     (PostgreSQL Engine)                                 |
  |  - Relational Schemas, Constraints & Foreign Keys (ACID)                |
  |  - B-Tree, Composite & Partial Indexes                                  |
  |  - Native Full-Text Search (tsvector)                                   |
  |  - Transactional Outbox / Job Tables for Durable Async Tasks            |
  +-------------------------------------------------------------------------+
                   ^
                   | Metadata References (Asset IDs, Sign Keys)
                   v
  +-------------------------------------------------------------------------+
  |                    EDGE MEDIA DELIVERY & STORAGE (CDN)                  |
  |                                                                         |
  |  [ Managed Object Storage ]             [ Media Delivery Network / CDN ]|
  |  - Direct-Upload Master Storage         - Transcoded Adaptive HLS       |
  |  - Presigned Secure S3-Compatible API   - Global Anycast Video Edge     |
  |  - Offline Download Package Storage     - Token-Gated Manifests         |
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
4. **Minimal Infrastructure Footprint:** Can run reliably on a modest compute instance with straightforward monitoring and health checks.

### 7.3 Module Boundary & Communication Rules
To prevent the monolith from degenerating into a coupled codebase, strict boundary rules are enforced:

```text
  [ Module A: Payments ]                       [ Module B: Entitlements ]
   +--------------------+                       +--------------------+
   | Controller / Route |                       | Controller / Route |
   +---------+----------+                       +---------+----------+
             |                                            |
             v                                            v
   +--------------------+                       +--------------------+
   | Domain Service     |                       | Domain Service     |
   | (PaymentService)   |                       | (EntitlementService|
   +---------+----------+                       +---------+----------+
             |                                            ^
             | In-Process Method Call (via Interface DTO) |
             +--------------------------------------------+
```

* **Rule 1: No Cross-Module Direct Table Writes:** Module A must NEVER directly execute SQL `UPDATE` or `INSERT` statements against tables owned by Module B. Module A must invoke Module B's exported service method.
* **Rule 2: Interface-Driven Boundaries:** When Module A requires functionality from Module B, it must depend on an exported interface or DTO contract, never on internal implementation details.
* **Rule 3: Dependency Inversion for External Providers:** All third-party providers (payment gateways, notification dispatchers, object storage) must implement domain-defined interfaces. The domain never imports external vendor SDK classes directly into business services.
* **Rule 4: In-Process Domain Events vs. Durable Work:**
  - *In-Process Events:* Used strictly for decoupled, non-critical in-memory notifications within the monolith (e.g., updating an in-memory counter or triggering an internal log).
  - *Durable Asynchronous Work:* For operations that must survive process restarts (e.g., payment receipt dispatch, transaction webhooks), work must be recorded in a durable store (such as a database outbox table) rather than relying on unmonitored fire-and-forget in-memory promises.

### 7.4 Target Module Inventory
The backend modular monolith is organized into ten discrete functional modules:

```text
backend/src/modules/
├── auth/           # Identity, password hashing, session/cookie lifecycle, RBAC guards
├── users/          # Customer profiles, administrative staff accounts, access status
├── catalog/        # Content catalog: movies, series, seasons, episodes, categories, countries
├── djs/            # Voice commentator roster, profiles, and associated editions
├── media-team/     # Intake studio, master file staging, video metadata, quality audits
├── admin/          # Governance, publishing approval policy, system settings, financial reporting
├── payments/       # Provider-agnostic payment intents, transactions, webhook reconciliation
├── entitlements/   # Customer access passes, time-limited expirations, subscription plans
├── playback/       # Stream authorization, signed token issuance, resume progress tracking
└── notifications/  # Transactional communications, system banners, staff queue counters
```

---

## 8. Performance Architecture

Performance is analyzed and engineered across the complete request-response lifecycle. The architecture enforces optimizations across ten distinct technical dimensions:

```text
+=============================================================================+
|                      10 DIMENSIONS OF PERFORMANCE                           |
+=============================================================================+
| 1. Client Runtime    | Lean DOM, lightweight client payloads, fast rendering |
| 2. Network Transit   | Small payloads, compression, modern HTTP multiplexing |
| 3. API Execution     | Fastify engine, non-blocking handlers, fast parsing   |
| 4. Database Engine   | Proper indexing, bounded joins, connection pooling    |
| 5. Media Delivery    | Anycast Edge CDN, adaptive bitrate streaming          |
| 6. CPU & Memory      | Stateless nodes, streaming uploads, bounded objects   |
| 7. Background Work   | Durable backgrounding for heavy non-request tasks     |
| 8. Asset Loading     | Optimized image formats, modern caching headers       |
| 9. Query Efficiency  | Strict pagination, selective projection of columns    |
| 10. Serialization    | Schema-based serialization, avoiding deep clones      |
+=============================================================================+
```

---

## 9. Network Performance Strategy

For mobile clients operating over metered cellular connections, the backend must minimize total bytes transferred over the wire:

### 9.1 Payload Size & Response Shaping
* **Selective Column Projection:** API queries must return only the fields required by the active view. For instance, catalog listing cards return identifier, title, slug, poster artwork, and basic badges. Full descriptions, backdrop arrays, and episode lists are loaded only when navigating to detail views.
* **Lightweight Response Payloads:** Internal database metadata (`deleted_at`, internal audit fields, raw vendor dumps) must be stripped from public API responses.

### 9.2 HTTP Compression & Modern Protocols
* **Transport Compression:** Fastify must be configured with standard compression (Brotli / Gzip) for JSON payloads exceeding minimum size thresholds.
* **HTTP/2 & HTTP/3 at Edge:** Terminate client connections at the CDN edge using modern HTTP protocols to enable multiplexing over single connections, mitigating latency on mobile cellular links.

### 9.3 HTTP Caching & Conditional Requests
* **Public Catalog Caching:** Static and slow-changing catalog endpoints must provide appropriate `Cache-Control` headers calibrated to content volatility.
* **Conditional Validation (ETags):** Dynamic catalog queries should support ETag validation, allowing browsers to receive `304 Not Modified` responses when catalog data has not changed.

### 9.4 Efficient Pagination Standards
* **Mandatory Bounded Pagination:** Public listing endpoints must never return unbounded result sets. Every listing endpoint must enforce a default and maximum page size limit.
* **Cursor-Based Pagination for Deep Feeds:** High-volume listings (infinite scroll feeds) should prefer cursor-based pagination over high-offset SQL queries to maintain stable query performance regardless of catalog depth.

---

## 10. System Performance Strategy

System performance governs server CPU, memory, event loop health, and database capacity:

### 10.1 High-Throughput HTTP Engine (Fastify Adapter)
NestJS is paired with the **Fastify adapter** as a performance-oriented HTTP engine:
* Fastify is selected for its low overhead, schema-based serialization capabilities, and efficient routing.
* Actual throughput and latency characteristics will be validated against representative application workloads during performance benchmarking.

### 10.2 Event Loop Protection
* **Zero Synchronous CPU Blocking:** Heavy computations, cryptographic hashing, or extensive parsing must never block the Node.js event loop.
* **Direct Master Uploads:** Large file uploads (video masters, high-resolution artwork) must bypass application server compute entirely via direct-to-storage presigned URLs.

### 10.3 Database Connection Pool Discipline
* **Pool Sizing:** Configure connection pool sizes to match database capacity and instance count, avoiding excessive connection overhead that degrades database engine performance.
* **Transaction Longevity:** Keep database transactions as short as possible. Never execute third-party HTTP network calls (e.g., calling an external payment gateway) while holding an open database transaction lock.

---

## 11. Lazy Loading and Deferred Work Strategy

> **Core Principle:** "Load what is necessary, when it is necessary, as efficiently as possible."

### 11.1 When to Apply Lazy Loading
* **Relational Data Joins:** When retrieving a movie title, do not eagerly load all historical audit logs or complete episode hierarchies. Load only the primary container and published editions.
* **Artwork & Media Metadata:** Return lightweight preview thumbnails during search or browsing; defer full-resolution assets until requested.
* **Episodic Deep Hierarchies:** When fetching a Series container, fetch season summaries first; fetch individual episode lists on-demand when a user expands a specific season.

### 11.2 When NOT to Apply Lazy Loading
* **Critical Path Authorization:** Do not lazily load user roles or entitlement checks in multiple sequential database queries. Perform a single, efficient indexed query joining the user and their active entitlement for the target item.
* **Application Bootstrap:** Do not defer critical configuration validation or database schema checks to request time; fail fast during application startup if core infrastructure is unavailable.

### 11.3 Durable Asynchronous Processing vs. In-Process Events
To ensure production reliability:
* **Non-Critical In-Process Notifications:** Simple in-memory events may be used for internal decoupling when task failure has no business or financial impact.
* **Critical Asynchronous Work:** For operations that must survive process restarts or crashes (e.g., payment fulfillment/reconciliation, confirmed email delivery, durable in-app notification creation, critical audit logging), work must be recorded durably (e.g., via a PostgreSQL-backed outbox or job table). A dedicated distributed queue (e.g., BullMQ/Redis) will only be introduced if measured requirements justify it.

---

## 12. Database Architecture Principles

PostgreSQL is the primary, authoritative relational database.

```text
+=============================================================================+
|                      DATABASE ARCHITECTURE BLUEPRINT                        |
+=============================================================================+

  [ Core Entities ]             [ Relationships ]            [ Integrity Rules ]
   movies                       1 -> N movie_versions        Foreign Keys (RESTRICT)
   series                       1 -> N seasons -> N episodes Cascading Deletes (Soft)
   customer_users               1 -> N orders -> N items     CHECK (price >= 0)
   customer_users               1 -> N entitlements          UNIQUE (user, item, version)
   voice_artists (DJs)          1 -> N movie_versions        Indexed Slugs & Status
```

### 12.1 Relational Normalization & Constraints
* **Third Normal Form (3NF):** Data is modeled relationally to eliminate duplication and update anomalies.
* **Database-Level Integrity:** Never rely solely on application code for data integrity. The PostgreSQL schema must enforce `NOT NULL`, `CHECK`, `UNIQUE`, and `FOREIGN KEY` constraints.
* **Controlled Denormalization:** Denormalization is permitted only for measured performance hotspots (e.g., pre-aggregated counter columns or generated search vectors updated via triggers).

### 12.2 Indexing Strategy
* **Lookup Columns:** Foreign keys and unique lookup fields (`slug`, `email`, `order_reference`) must always be indexed with standard B-tree indexes.
* **Composite Indexes:** Compound queries (e.g., querying content by `status = 'published'` ordered by publication date) must be supported by composite indexes matching the query predicate and sort order.
* **Partial Indexes with Immutable Predicates:** Partial indexes may be used to index subsets of rows based on static, immutable predicates (e.g., indexing active records where `status = 'active'`). Dynamic, non-immutable expressions (such as `NOW()`) must never be used in index predicates.
* **Full-Text Search Indexes:** Native text search is supported using PostgreSQL `tsvector` columns with GIN indexes.

### 12.3 Transaction Boundaries
* Financial transactions, order settlements, and entitlement issuances must execute inside explicit ACID database transactions.
* If any step fails, the entire transaction rolls back to ensure zero financial or licensing inconsistency.

### 12.4 Soft Deletion & Auditability
* Core business entities (`movies`, `series`, `customer_users`, `orders`) utilize soft deletion (`deleted_at TIMESTAMP WITH TIME ZONE NULL`) to prevent accidental data loss and preserve historical financial reporting integrity.
* Every table includes immutable `created_at` and automated `updated_at` audit timestamps.

---

## 13. API Architecture Principles

The API layer is the formal contract that decouples client applications from backend internals:

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
All API responses adhere to a consistent, predictable JSON format with distinct success and error shapes:
* **Success Responses:** Contain a boolean `success: true`, a typed `data` payload, and optional `meta` for pagination information.
* **Error Responses:** Contain a boolean `success: false`, a structured `error` object with machine-readable error code, human-readable message, optional field validation details, timestamp, and a correlation `requestId`.

### 13.2 Strict Input Validation & DTOs
* Every incoming request body, query parameter, and path variable must be validated against a strict Data Transfer Object (DTO) schema.
* Malformed payloads or extra unrecognized fields must be rejected immediately (`400 Bad Request`) with precise field-level validation errors before reaching any domain service.

### 13.3 HTTP Semantics & Versioning
* Strictly adhere to RESTful status codes (`200`, `201`, `204`, `400`, `401`, `403`, `404`, `409`, `422`, `429`, `500`).
* All public endpoints are prefixed with a major API version: `/api/v1/`. Breaking changes require a version bump to `/api/v2/`.

---

## 14. Authentication and Security Principles

### 14.1 Server-Controlled Authentication Architecture
* **Accepted Session Model:** Authentication uses database-backed server-side sessions. The cookie is opaque, `HttpOnly`, `Secure`, narrowly scoped, and configured with an appropriate `SameSite` policy. It does not carry complete authentication state.
* **Session Lifecycle:** Each session has server-enforced inactivity and absolute timeouts. Regenerate the session identifier after authentication and appropriate security-sensitive transitions. Multiple concurrent sessions are allowed and independently revocable. Logout invalidates the current server-side session and clears the cookie; logout-all invalidates all sessions. Password reset/security recovery invalidates existing sessions. Exact timeout values are configuration/security-policy values, not architectural constants.
* **Account Devices and Streams:** Registered devices, sessions, and active streams are distinct concepts. Admin-configured registered-device limits require explicit customer removal/revocation at capacity. Active stream limits are independently Admin-configured and enforced through backend-managed leases/heartbeats; individual purchases do not bypass the account-level limit. Subscription-specific device and stream policy is captured in immutable purchased subscription terms. Exact limits remain product configuration, not assumptions in this foundation.

### 14.2 Role-Based Access Control (RBAC)
The platform enforces three distinct roles via route guards:
* **`customer`:** Account self-management, catalog browsing, purchasing passes, viewing owned library items, and streaming authorized content. Forbidden from administrative and media intake routes.
* **`media_team`:** Ingesting master content, managing title editions, updating metadata, and submitting titles for review. Governed by the platform approval policy.
* **`admin`:** Full administrative authority to approve staged content, toggle publishing gates, manage platform finances, audit user orders, and manage staff permissions.

### 14.3 Purchase Authentication and Email Verification
* Customer authentication is **email/password**. Email verification is required; registration creates an unverified/pending account. The backend issues a secure, single-use, expiring verification token and sends it by email. Verification confirms mailbox control, not real-world identity. Password recovery is email-based and uses a separate token concern.
* Customers must authenticate before initiating or completing any purchase. Guest checkout is not supported. Orders and resulting entitlements belong to the authenticated customer account.

### 14.4 Webhook Cryptographic Verification
* External payment and media transcoding webhooks must be cryptographically verified:
  - Validate HMAC request signatures or shared webhook secrets.
  - Reject unverified or tampered payloads immediately.
  - Implement replay-attack mitigation using idempotency keys and request timestamps.

### 14.5 Rate Limiting & Abuse Prevention
* Implement rate limiting on sensitive routes (authentication attempts, payment requests, OTP dispatching). Specific thresholds will be calibrated based on traffic telemetry, threat modeling, and provider API constraints.

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
         |<--- Returns Presigned Upload URL + Token <------+
         |
         +----------------------------------------------> [ Managed Object Storage ]
          Direct Binary Upload (Bypasses Backend Compute)  Raw Master Stored

  [ 2. TRANSCODING & PACKAGING PHASE ]
   Object Storage ---> Ingested by Transcoder Engine ---> Multi-Bitrate HLS
                                                                |
                                                                v
                                                    [ Media Delivery CDN Edge ]
                                                    - Adaptive Bitrate Profiles

  [ 3. SECURE PLAYBACK PHASE (Customer Stream) ]
   Customer Watch UI ---> GET /playback/stream-token?slug=...&version=...
                                |
                                v
                         Backend verifies Entitlement / Access Pass
                                |
                                v
                         Issues Signed, Time-Limited Playback Token
                                |
                                v
   Customer Video Player <------+
         |
         | Uses Signed Token to fetch .m3u8 manifest
         v
   [ Media Delivery CDN Edge ] ---> Streams HLS chunks directly to client
```

### 15.1 Application Server vs Media Delivery Separation
* **Application Server Responsibilities:** Authenticating users, evaluating active entitlements or access passes, tracking viewing progress, storing title metadata, and generating signed token URLs.
* **Media Delivery Responsibilities:** Storing video files, transcoding into multi-bitrate HLS streams, packaging authorized download files, and distributing video segments via global Anycast edge nodes.

### 15.2 Ingestion via Presigned URLs
Media team operators upload master video files directly from their studio client to object storage using time-limited presigned URLs. Server CPU and memory remain entirely unburdened during large file uploads.

### 15.3 Protected Media Authorization
The backend issues cryptographically protected, short-lived media authorization scoped to a specific resource and operation after checking the customer, entitlement, content/media availability, and applicable device/stream/download policy. Streaming authorization supports the normal HTTP Range requests required for seeking and resume within a valid playback session. Downloads use separate authorization and quota checks. Token TTL and reuse policy remain pending; do not bind tokens permanently to IP by default or claim that expiry removes bytes already buffered by a client. Signed access is not DRM or a guarantee against copying. The CDN/media provider delivers bytes; application compute does not proxy heavy video.

---

## 16. Payment Architecture

Payments must be strictly **provider-agnostic**. The core domain must never depend on the idiosyncratic API structures, field names, or error codes of specific payment gateways or telco carriers.

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
   (Provider Adapter A)              (Provider Adapter B)
         |                                |
         v                                v
  External Gateway A API            External Gateway B API
```

### 16.1 Core Domain Payment Abstractions
The domain models all payment operations around standardized domain entities:
* **`PaymentIntent`:** A customer's declared intention to purchase a specific item (Movie Edition, Season Pass, or Access Plan) at a verified price.
* **`PaymentTransaction`:** An immutable record of an attempted transaction, tracking the normalized status (`PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `EXPIRED`), amount, provider name, and external reference. Fulfillment-processing state is separate from payment state.
* **`PaymentProviderAdapter`:** An interface defining standard operations (`initiatePayment()`, `verifyWebhook()`, `queryTransactionStatus()`).
* **`PaymentWebhookEvent`:** A normalized internal event representing an external payment callback, decoupling settlement logic from vendor payload shapes.

### 16.2 Idempotent Webhook Processing
Payment networks frequently retry webhook deliveries upon transient network timeouts. The webhook receiver must be strictly idempotent:
* Each transaction records a unique provider transaction reference.
* Replayed or duplicate events are acknowledged safely without duplicate settlement, entitlement, or notification effects. A verified `SUCCEEDED` payment remains distinct from fulfillment processing. Durable fulfillment is idempotent, retryable, and recoverable through the PostgreSQL-backed outbox/job pattern; persistent failures enter an operational recovery state. Reconciliation detects successful payments with incomplete fulfillment. Customer-facing state distinguishes payment succeeded, access processing, access available, and fulfillment recovery needed. Notifications are recorded only after the relevant business transaction commits.

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
                                 /health/ready (Database connection verified)
```

### 17.1 Structured JSON Logging
* All application logs are output to `stdout` in structured JSON format using a high-performance logger (e.g., Pino).
* Every log line includes a unique `requestId` (passed from the client or generated via inbound middleware), enabling request correlation during debugging.

### 17.2 Health Probes
The service exposes standard lightweight health endpoints:
* **`/health/live`:** Returns `200 OK` if the application event loop is responsive.
* **`/health/ready`:** Executes a lightweight database ping (`SELECT 1`) to verify that the application is ready to accept traffic.

### 17.3 Administrative & Financial Audit Logs
Critical administrative actions (e.g., publishing content, overriding an approval gate, modifying pricing, manual entitlement adjustments) must write an immutable record to an `audit_logs` database table capturing actor ID, action, resource ID, timestamp, and IP address.

---

## 18. Cost and Operational Constraints

To ensure economic sustainability:
1. **Zero Unjustified Infrastructure:** Do not deploy standalone Redis, Elasticsearch, Kafka, or dedicated worker fleets during initial deployment.
2. **Utilize PostgreSQL Built-Ins First:**
   * Use PostgreSQL native full-text search (`tsvector` and `tsquery`) instead of running a dedicated search cluster.
   * Use PostgreSQL row locking (`SELECT ... FOR UPDATE SKIP LOCKED`) or transactional outbox tables for durable asynchronous jobs rather than provisioning a separate queue instance.
3. **Bandwidth Cost Control:** Leverage managed object storage and CDN delivery models that eliminate or minimize high egress fees for media assets.

---

## 19. Scalability Strategy

The system is designed to scale gracefully from initial launch to higher concurrency:

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
        (Stateless Compute)                 (Stateless Compute)
                    \                                 /
                     \                               /
                      v                             v
               +-------------------------------------------+
               |         Managed PostgreSQL Database       |
               |  - Primary Node (Writes & Transactions)   |
               |  - Optional Read Replica (Catalog Reads)  |
               +-------------------------------------------+
```

1. **Stateless Compute Instances:** Because the application compute layer maintains no persistent in-memory session state, the backend monolith can scale horizontally by launching additional compute nodes behind a load balancer with zero code changes.
2. **Read Replica Offloading (Future Scale):** When catalog browsing volume increases, read-only queries (`/catalog/*`) can be routed to a PostgreSQL read replica, preserving primary database capacity for payment checkouts and order processing.
3. **Edge Asset Offload:** Video segments and static imagery represent the vast majority of raw bandwidth. By offloading these assets to edge CDN nodes, the application server handles only lightweight JSON metadata and authorization requests.

---

## 20. Technology Decisions

The following represents the current architectural direction for the GIFTEDproMovies backend:

* **Runtime:** Node.js LTS with TypeScript (Strict mode enabled).
* **Application Framework:** NestJS utilizing the Fastify adapter.
* **Database Engine:** PostgreSQL (Managed instance).
* **Data Access & Query Layer:** Drizzle ORM (SQL-first, typed, low-overhead).
* **Authentication Strategy:** Server-controlled HttpOnly secure cookies with Argon2id password hashing.
* **Media Storage & Streaming:** Managed Object Storage (Master files & downloads) + Managed Media Delivery CDN (Adaptive HLS streaming).
* **Payment Architecture:** Provider-agnostic adapter layer supporting regional mobile money and card payment rails.

---

## 21. Decision Status

Every architectural component is explicitly classified into one of four statuses:
* **ACCEPTED:** Confirmed and approved for architecture foundation.
* **PROVISIONAL:** Current leading architectural choice; pending empirical verification during architecture evaluation.
* **DEFERRED:** Deliberately postponed to a future project phase to avoid premature complexity.
* **REQUIRES VALIDATION:** Involves business, financial, or third-party partner dependencies requiring external confirmation.
* **PENDING:** An intentionally unresolved selection or policy value that must remain open until its stated evaluation/approval is complete.

| Architectural Decision | Status | Rationale / Dependency |
| :--- | :--- | :--- |
| **Modular Monolith Architecture** | **ACCEPTED** | Best fit for team size, operational budget, and system cohesion. |
| **Node.js LTS + TypeScript** | **ACCEPTED** | Shares language and type models with Next.js frontend; strong ecosystem. |
| **PostgreSQL as Primary Database** | **ACCEPTED** | ACID compliance for payments, relational integrity, robust native full-text search. |
| **Server-Controlled HttpOnly Auth** | **ACCEPTED** | Essential security posture; prevents XSS token theft inherent in `localStorage`. |
| **Customer Auth via Email/Password** | **ACCEPTED** | Confirmed customer authentication model. |
| **Email Verification and Email Password Recovery** | **ACCEPTED** | Separate single-use expiring verification and password-recovery token workflows. |
| **Subscription Product and Manual Renewal** | **ACCEPTED** | Eligible-catalog streaming, limited configurable downloads, and immutable purchased plan terms; no recurring billing. |
| **Payment State and Fulfillment Separation** | **ACCEPTED** | Normalized payment state is distinct from durable, retryable fulfillment and entitlement issuance. |
| **Account Devices and Concurrent Streams** | **ACCEPTED** | Distinct registered-device and active-stream limits; backend authoritative, independently enforced. |
| **Persistent In-App Notifications and Email** | **ACCEPTED** | Backend-owned in-app history/read state plus email delivery; event/channel mapping remains pending. |
| **Initial Market and Currency** | **ACCEPTED** | Tanzania launch market, TZS currency; no provider, tax, or price decision is implied. |
| **Purpose-Based Data Retention and Deletion** | **ACCEPTED** | Separate account, commercial, security/audit, and operational data; preserve required history, with exact periods set by later policy. |
| **Production Backup and Restore Strategy** | **ACCEPTED** | Automated protected PostgreSQL backups, documented restore, periodic tests, failure monitoring; RPO/RTO values remain pending. Media recovery is separate. |
| **Measurement-Led Performance Targets** | **ACCEPTED** | Measure observed workloads and establish useful targets from production requirements; no arbitrary universal latency/SLA promise. |
| **Provider-Agnostic Payment Abstraction** | **ACCEPTED** | Decouples business logic from external payment API variations. |
| **Direct-to-Storage Presigned Uploads** | **ACCEPTED** | Prevents large video uploads from burdening application server compute. |
| **Application Server vs. Media Delivery Separation** | **ACCEPTED** | Application server coordinates authorization; media delivery is handled by edge CDN. |
| **NestJS + Fastify Adapter** | **PROVISIONAL** | Preferred for modular architecture and throughput; requires benchmarking. |
| **Drizzle ORM** | **PROVISIONAL** | Preferred for SQL transparency and low overhead; requires schema migration testing. |
| **Cloudflare Stream for Video Delivery** | **PROVISIONAL** | Leading candidate for managed HLS streaming; requires pricing and margin validation. |
| **Cloudflare R2 for Storage** | **PROVISIONAL** | Leading candidate for low-egress master storage; requires presigned upload validation. |
| **Database-Backed Opaque Sessions** | **ACCEPTED** | Server-side records support independent revocation; exact timeouts are configuration/security-policy values. |
| **Customer Email Verification** | **ACCEPTED** | Required mailbox-control verification and separate email-based password recovery flows. |
| **Authenticated Purchase; No Guest Checkout** | **ACCEPTED** | All purchases and resulting entitlements belong to an authenticated customer account. |
| **Payment Provider & Rails Selection** | **PENDING** | Provider is unselected; evaluate integration, settlement, fees, reliability, KYC/business requirements, webhooks, reconciliation, and operations. |
| **Tanzania Launch Market / TZS Currency** | **ACCEPTED** | Launch market and currency are confirmed; this does not decide pricing, taxes, or payment provider. |
| **Email and Persistent In-App Notifications** | **ACCEPTED** | In-app history is backend-owned with read state; email is supported. Exact event/channel mapping and templates remain pending. |
| **Offline Download Licensing & DRM Requirements** | **REQUIRES VALIDATION** | Requires policy decision on DRM containerization vs. expiring signed download URLs. |
| **Standalone Redis Cache / BullMQ** | **DEFERRED** | Unnecessary on day one; PostgreSQL handles queries and durable jobs until measured requirements justify another component. |
| **Microservices Partitioning** | **DEFERRED** | Premature; introduces unnecessary operational and financial overhead. |
| **Dedicated Search Engine (Elastic/Meili)** | **DEFERRED** | PostgreSQL native `tsvector` is sufficient for initial catalog size. |
| **Native Mobile Push Notification Engine** | **DEFERRED** | Deferred until native mobile clients enter active development. |
| **Multi-Region Active-Active Database** | **DEFERRED** | Single-region managed PostgreSQL is the initial direction; adequacy against eventual RPO/RTO requirements must be validated before claiming recovery targets. |

---

## 22. Risks and Trade-offs

| Architectural Choice | Advantages | Risks / Trade-offs | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Modular Monolith** | Simple deployment, zero network latency between modules, local ACID transactions. | Risk of loose imports blurring module boundaries over time. | Enforce strict linter boundaries, folder conventions, and code review checklists. |
| **NestJS + Fastify** | High cohesion, built-in dependency injection, efficient serialization. | NestJS abstraction layer adds conceptual overhead compared to bare scripts. | Standardize module structure; use thin controllers and focused domain services. |
| **Drizzle ORM** | Zero runtime overhead, SQL-first transparency, strict TypeScript inference. | Younger ecosystem than older ORMs; fewer automated migration tools. | Maintain explicit, reviewed SQL migration scripts; verify schema changes in CI. |
| **Server-Controlled Cookie Auth** | Immune to JavaScript XSS token theft; automatic browser transmission. | Requires strict CSRF defenses and proper cookie domain configuration. | Enforce `SameSite=Lax`, secure headers, and CSRF token verification on state-mutating requests. |
| **Managed Media Infrastructure** | Eliminates self-hosted transcoding maintenance and streaming server complexity. | Reliance on external provider encoding formats and playback URLs. | Isolate media URL generation behind an internal `MediaDeliveryService` interface. |

---

## 23. Deferred Decisions

The following architectural decisions are deliberately deferred to future development phases:

1. **Standalone Redis Caching Cluster:** Caching will initially rely on HTTP gateway cache headers and PostgreSQL query optimization. A Redis cluster will be introduced only when database read metrics demonstrate contention.
2. **Dedicated Distributed Queue Fleet:** Asynchronous jobs will execute via transactional outbox or database-backed job tables. Distributed BullMQ workers are deferred.
3. **Dedicated Search Engine Infrastructure:** Catalog search will be powered by PostgreSQL GIN-indexed full-text search (`tsvector`). External search clusters are deferred until catalog size warrants it.
4. **Native Mobile App Push Notification Engine:** Push notification integration is deferred until native client applications are developed.
5. **Multi-Region Database Replication:** Single-region managed PostgreSQL with automated backups is the initial direction. Backup configuration and restore capability must be verified; adequacy against eventual RPO/RTO targets remains to be demonstrated. Multi-region replication stays deferred unless requirements justify it.

---

## 24. Decisions Requiring Future Validation or Pending Selection

The following are the remaining architecture/business items. Their unresolved status does not reopen accepted decisions elsewhere in this document:

1. **Payment Provider:** Selection is **PENDING** after evaluating integration requirements, settlement, fees, reliability, KYC/business requirements, webhook and reconciliation capabilities, and operational constraints. Tanzania/TZS is confirmed but does not select a provider or establish tax treatment.
2. **Media Delivery Unit Economics:** Validate Cloudflare Stream/R2 capability, security, cost, and margin before promoting either from **PROVISIONAL**.
3. **Download Licensing:** Offline/download licensing and DRM requirements remain **REQUIRES VALIDATION**. Protected short-lived access is not a DRM guarantee.
4. **Operational Values:** Hosting choice, exact backup retention periods, RPO/RTO values, and measured performance targets remain open as recorded in ARCH-013/014/016. Purpose-based retention, a production backup/restore strategy, and measurement-led performance management are accepted; no arbitrary durations or universal latency promise is asserted.
5. **Session and Media Token Policies:** Session timeout values and media authorization TTL/reuse values are configuration/security-policy decisions; they must be set and validated before affected launch behavior, not invented as architectural constants.

---

## 25. Architecture Evolution Strategy

The platform architecture is designed to evolve in three distinct, measured phases:

```text
  [ PHASE 1: MODULAR MONOLITH CORE ]
   Single service, managed PostgreSQL, edge media delivery, durable database jobs.
   Zero enterprise overhead. Fully serves launch requirements.
                 |
                 | (Traffic growth & measured bottlenecks)
                 v
  [ PHASE 2: TELEMETRY & TARGETED CACHING ]
   Horizontal compute replication (stateless nodes), read replica offload,
   lightweight Redis caching layer for hot catalog queries if justified by telemetry.
                 |
                 | (High-volume operational scale)
                 v
  [ PHASE 3: SELECTIVE EXTRACTION ]
   Extract ONLY the independently bottlenecked module (e.g., Media Ingestion
   Transcoding Worker or SMS Queue Fleet) while leaving the core business
   monolith completely intact.
```

By following this evolution roadmap, GIFTEDproMovies ensures that technical architecture remains an enabler of business velocity, user performance, and economic sustainability, rather than an operational burden.
