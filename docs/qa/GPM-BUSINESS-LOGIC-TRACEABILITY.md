# GIFTEDproMovies3 — GPM-PRE-FRONTEND-REMEDIATION-PROGRAM
## Deliverable 1.3: System Business Logic & 12 Modules Traceability Matrix

**Document ID:** `GPM-BUSINESS-LOGIC-TRACEABILITY`  
**Mission Reference:** `GPM-PRE-FRONTEND-REMEDIATION-PROGRAM` (Stage 1)  
**Authority:** Product Owner  
**Date:** 2026-11-04  
**Source Document:** `docs/SYSTEM_BUSINESS_LOGIC_AND_MODULES.md`  

---

## 1. Module-by-Module Verification & Traceability

### Module 1: Movie Container & Embedded DJ Editions
- **Domain Rule 1.1: Golden Rule of Hard-Muxed Audio:** Translating DJ voiceover audio is physically multiplexed into the video file. Changing a DJ requires uploading a distinct video file.
  - *Implementation:* `polymorphic-catalog.service.ts` (`createMovieEdition`), `movie-editions.schema.ts`.
  - *Constraint:* `movie_editions.dj_id NOT NULL` referencing `dj_voice_artists.id`.
  - *Verification:* `backend/tests/catalog-polymorphic-domain.integration.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.
- **Domain Rule 1.2: Edition Independence & Locking:** Once an edition is created, its DJ cannot be mutated.
  - *Implementation:* `polymorphic-catalog.service.ts` (`updateMovieEdition`).
  - *Verification:* `backend/tests/catalog-polymorphic-domain.integration.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.

### Module 2: Series & Episodic Cinema
- **Domain Rule 2.1: 3-Tier Episodic Hierarchy:** `Series -> Season -> Episode`.
  - *Implementation:* `series-metadata.schema.ts`, `seasons.schema.ts`, `episodes.schema.ts`.
  - *Verification:* `backend/tests/catalog-functional-verification.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.
- **Domain Rule 2.2: Single Lead DJ per Series:** Lead DJ assigned at the series container level for voice continuity.
  - *Implementation:* `series_metadata.lead_dj_id` referencing `dj_voice_artists.id`.
  - *Verification:* `backend/tests/catalog-functional-verification.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.
- **Domain Rule 2.3: Dual Pricing Model (Episode vs Season Pass):**
  - *Implementation:* `commercial.schema.ts` (`offers.target_kind = 'SEASON' | 'EPISODE'`).
  - *Verification:* `backend/tests/orders-runtime.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.

### Module 3: Monetization, Billing & LIPA (Mobile Money)
- **Domain Rule 3.1: 3 Access License Types:**
  - Stream Pass: 24–48 hours access.
  - Offline Download: 7 days offline license.
  - VIP Ultra Subscription: 30 days unlimited catalog access.
  - *Implementation:* `commercial.schema.ts` (`plan_versions.duration_value`, `duration_unit`).
  - *Verification:* `backend/tests/commercial-runtime.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.
- **Domain Rule 3.2: LIPA Handshake & Webhook Settlement:**
  - *Implementation:* `commercial-webhooks.controller.ts`, `payment.service.ts`.
  - *Verification:* `backend/tests/payments-runtime.test.ts`, `reconciliation-runtime.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.
- **Domain Rule 3.3: Guest Checkout vs Authenticated Library:**
  - *Original Spec:* Frictionless guest purchases with later account linking.
  - *Superseding Decision:* **ADR-020 (Authenticated-Only Purchases)**. All purchases strictly require an authenticated customer session before order creation. Guest checkout was formally removed to ensure unambiguous order ownership.
  - *Status:* **NOT APPLICABLE / SUPERSEDED (ADR-020)**.

### Module 4: Dedicated Cinema Player (`/watch/[slug]`)
- **Domain Rule 4.1: Paywall Gatekeeper:** Unentitled users cannot stream.
  - *Implementation:* `commercial-access.service.ts` (`canAccess`).
  - *Verification:* `backend/tests/commercial-access-runtime.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.
- **Domain Rule 4.2: Adaptive Streaming (HLS) & Watch Progress Sync:**
  - *Governance Boundary:* Customer video streaming is deferred to Phase 8.
  - *Status:* **DEFERRED BY APPROVED DECISION (Phase 8 Boundary)**. Server returns HTTP 503 `STREAMING_COMING_SOON`.

### Module 5: Customer Library & Entitlement Vault (`/library`)
- **Domain Rule 5.1: Active Passes & Entitlements:**
  - *Implementation:* `GET /api/v1/commercial/me/library`.
  - *Verification:* `phase7-backend-master-e2e.integration.test.ts` (PJ-03).
  - *Status:* **IMPLEMENTED & VERIFIED**.
- **Domain Rule 5.2: Download Licenses & History:**
  - *Implementation:* `GET /api/v1/download/licenses`, `GET /api/v1/download/history`.
  - *Verification:* `phase7-backend-master-e2e.integration.test.ts` (PJ-10, PJ-11).
  - *Status:* **IMPLEMENTED & VERIFIED**.

### Module 6: Media Team In-Flow Intake Studio (`/media-team`)
- **Domain Rule 6.1: Single-Pass Ingest Workflow:** Content metadata, artwork, and media files attached in a unified intake.
  - *Implementation:* `catalog.controller.ts` (`createTitle`), `media.service.ts`.
  - *Verification:* `backend/tests/catalog-functional-verification.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.
- **Domain Rule 6.2: 9-Point Content Readiness Calculation Formula:**
  - *Formula:* Completed Checks / 9 * 100.
  - *Implementation:* `content-lifecycle.service.ts` (`calculateReadiness`).
  - *Verification:* `backend/tests/catalog-functional-verification.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.

### Module 7: Configurable Publishing Approval Gate
- **Domain Rule 7.1: Approval Gate Policy Toggle:**
  - *Implementation:* `system-settings.service.ts`, `content-lifecycle.service.ts`.
  - *When Active:* Staff submission transitions to `pending_review`.
  - *When Inactive:* Staff can publish directly to `published`.
  - *Verification:* `backend/tests/catalog-functional-verification.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.

### Module 8: Taxonomies & DJ Roster Governance
- **Domain Rule 8.1: Admin-Only DJ Roster Management:**
  - *Implementation:* `taxonomy.controller.ts`, `taxonomy.service.ts`.
  - *Verification:* `backend/tests/authorization-guards.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.
- **Domain Rule 8.2: Smart Country Autocomplete & Flag Detection:**
  - *Implementation:* `taxonomy.service.ts` (`createCountry` calculates emoji flag).
  - *Verification:* `backend/tests/catalog-functional-verification.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.

### Module 9: Financial Intelligence & Reconciliation (`/admin/finances`)
- **Domain Rule 9.1: 4-Week Income Ledger & Revenue Streams:**
  - *Implementation:* `reconciliation.service.ts`, `orders.schema.ts`.
  - *Verification:* `backend/tests/reconciliation-runtime.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.

### Module 10: Video Storage, Transcoding & CDN Delivery
- **Domain Rule 10.1: Presigned Direct-to-Storage Ingest:**
  - *Implementation:* `r2-media-storage.adapter.ts` (`generatePresignedUploadUrl`).
  - *Verification:* `backend/scripts/verify-e2e-media-delivery.mjs`.
  - *Status:* **IMPLEMENTED & VERIFIED**.
- **Domain Rule 10.2: Automated Transcoding & Edge Caching:**
  - *Implementation:* Cloudflare R2 / Stream architecture.
  - *Verification:* Phase 6 E2E verification.
  - *Status:* **IMPLEMENTED & VERIFIED**.

### Module 11: Authentication, Authorization & RBAC
- **Domain Rule 11.1: 3-Tier RBAC (`customer`, `media_team`, `admin`):**
  - *Implementation:* `session-auth.guard.ts`, `roles.guard.ts`.
  - *Verification:* `backend/tests/authorization-guards.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.
- **Domain Rule 11.2: Password Recovery with 10-Minute Token:**
  - *Implementation:* `auth.service.ts` (`requestPasswordReset`, `resetPassword`).
  - *Verification:* `backend/tests/auth-phase3-integration.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.

### Module 12: Notification & Alerting Engine
- **Domain Rule 12.1: Transactional Mobile SMS:**
  - *Reconciliation:* Deferred per ADR-019. Launch utilizes in-app notifications and email.
  - *Status:* **DEFERRED BY APPROVED DECISION (ADR-019)**.
- **Domain Rule 12.2: Persistent In-App Notifications:**
  - *Implementation:* `notifications.service.ts`.
  - *Verification:* `backend/tests/notifications.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.
- **Domain Rule 12.3: Staff Attention Queue Counters:**
  - *Implementation:* `catalog.service.ts` (`getPendingReviewCount`).
  - *Verification:* `backend/tests/catalog-functional-verification.test.ts`.
  - *Status:* **IMPLEMENTED & VERIFIED**.

---
*End of GPM-BUSINESS-LOGIC-TRACEABILITY.*
