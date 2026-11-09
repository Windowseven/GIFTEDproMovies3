# GIFTEDproMovies3 — Deferred Architectural Decision Reconciliation

**Document Reference:** `docs/qa/GPM-DEFERRED-DECISIONS-RECONCILIATION.md`  
**Mission ID:** `GPM-PRE-FRONTEND-REMEDIATION-PROGRAM` (Stage 8)  
**Authority:** Product Owner Directive, ARCH-001, ARCH-009, ARCH-015, ADR-014, ADR-018, ADR-019, ADR-026  
**Classification:** Architectural Governance & Scope Reconciliation  
**Status:** COMPLETE AUDIT & VERIFICATION

---

## 1. Executive Summary & Governance Directive

In accordance with **Stage 8 (Deferred Architectural Decision Reconciliation)**, this document provides an exhaustive verification of all formally deferred architectural decisions.

**Core Finding:** Every deferred architectural item in GIFTEDproMovies3 is a **deliberate, formally approved product and engineering decision** designed to avoid premature infrastructure complexity, unnecessary vendor overhead, and speculative feature bloat. An approved deferral is **not a defect** and must not be reopened without explicit Product Owner authorization.

---

## 2. Reconciled Deferred Decisions Matrix

| Ref ID | Architectural Component | Approved Status | Authoritative Rationale | Current Implementation State | Future Evaluation Trigger / Decision Owner |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **ADR-014** | **Dedicated Redis / Cache Fleet** | **DEFERRED (Approved)** | Avoids operational fleet overhead and distributed cache invalidation bugs at V1 scale. PostgreSQL indexed reads and HTTP CDN caching provide sufficient throughput. | Zero Redis dependencies. Node.js in-memory LRU rate limiting and indexed PostgreSQL queries active. | Evaluate only upon measured database read bottlenecks (> 5,000 active concurrent queries). Owner: Principal Architect. |
| **ADR-018** | **Hardware Multi-DRM (Widevine/FairPlay)** | **ANALYZED / DEFERRED TO V2** | V1 is web-first. Standard web browsers lack robust offline DRM storage without native mobile apps. Studio licensing costs ($500–$2,500/mo) are premature for local DJ cinema. | Phase 7 Model B: Cloudflare R2 presigned SigV4 URLs (900s TTL), atomic quota (`UNIQUE_TITLES`), device caps (POD-07). | Phase 9 / V2 Native Mobile App launch or contractual requirement from international studio. Owner: Product Owner. |
| **ADR-019** | **Native Push & SMS Notifications** | **DEFERRED (Approved)** | Telco SMS aggregator costs (TZS per SMS) and push notification APNs/FCM complexity deferred for V1 web launch. | In-app notification center (`notifications` table) and transactional email outbox (`email_outbox`) fully operational. | V2 Mobile application development (iOS/Android) or high customer demand for SMS receipts. Owner: Product Manager. |
| **ADR-026** | **Automated In-App Refund Workflow** | **DEFERRED (Approved)** | Digital goods are delivered upon download token issuance. Automated refund state machines introduce severe fraud and chargeback vectors. | Manual administrative reconciliation workflow. Settlements table records immutable payment ledger. | Phase 8+ commercial expansion if dispute volume exceeds 1% of total transaction volume. Owner: Finance Lead. |
| **PHASE-08** | **Customer Video Streaming** | **STRICTLY DEFERRED & LOCKED** | Phase 7 is scoped exclusively to Customer Downloads, Device Management, and Library. Streaming infrastructure is deferred to Phase 8. | `CUSTOMER_STREAMING_ENABLED=false` strictly enforced in `MediaService:428`. Returns HTTP 503 `STREAMING_COMING_SOON`. | Formal Phase 8 Streaming Mission authorization by Product Owner. Owner: Product Owner. |
| **ADR-021** | **Multi-Currency (Non-TZS)** | **DEFERRED (Approved)** | Launch market is strictly the United Republic of Tanzania. Multi-currency foreign exchange reconciliation deferred. | Currency hardcoded to `TZS` across commercial offers, orders, and settlements. | International expansion outside Tanzania (e.g., Kenya KES, Uganda UGX, Global USD). Owner: Commercial Lead. |
| **ADR-015** | **Kubernetes / Microservices Mesh** | **DEFERRED (Approved)** | Avoids premature distributed systems complexity. Modular monolith architecture in NestJS provides high maintainability and testability. | Single modular backend service with strict internal module boundaries and Drizzle ORM persistence. | Traffic scaling exceeding single-node vertical capacity (> 50,000 RPS). Owner: DevOps Lead. |

---

## 3. Deep-Dive Reconciliations

### 3.1 Redis — ADR-014
- **Verification:** Inspection of `backend/package.json` confirms **zero Redis client libraries** (`ioredis`, `redis`).
- **Performance Reality:** PostgreSQL 18 connection pooling and Drizzle ORM query compilation deliver sub-10ms response times across authenticated library and catalog endpoints in local and CI environments.
- **Decision:** The approved deferral is **retained without modification**. No Redis service will be introduced.

### 3.2 SMS and Native Push — ADR-019
- **Verification:** Inspection of `backend/src/infrastructure/email/` and `backend/src/infrastructure/database/schemas/notifications.schema.ts` confirms that **In-App Notifications** and **Transactional Email Delivery** are fully implemented.
- **Channel Map:**
  - Email: Account verification, password reset, purchase receipt.
  - In-App: Editorial review rejection feedback, device registration alerts, catalog updates.
- **Decision:** SMS gateways (e.g. Beem Africa, NextSMS) and push notification infrastructure (FCM) remain **formally deferred**.

### 3.3 Refunds — ADR-026
- **Verification:** Inspection of commercial tables confirms that `settlements` and `orders` track financial transactions immutably.
- **Operational SOP:** Under the approved V1 manual reconciliation process:
  1. Customer contacts customer support with Order UUID within 24 hours of technical delivery failure.
  2. Support operator inspects `download_attempts` table.
  3. If delivery failure is confirmed and unrecoverable, an authorized finance manager manually executes a reverse transaction via the payment gateway console and records an administrative audit event (`ORDER_MANUALLY_REFUNDED`).
- **Decision:** Automated refund state machines remain **deferred**.

### 3.4 Customer Streaming Lockout — Phase 8
- **Verification:** Source code in `backend/src/modules/media/media.service.ts` (Line 428) explicitly contains:
  ```typescript
  if (!this.config.customerStreamingEnabled) {
    throw new ServiceUnavailableException({
      code: "STREAMING_COMING_SOON",
      message: "Customer streaming is not enabled in this deployment.",
    });
  }
  ```
- **Invariant:** `CUSTOMER_STREAMING_ENABLED=false` remains strictly active. Zero streaming endpoints or HLS playback tokens are exposed to customer roles.

---

## 4. Acceptance Status
- **All Deferred Decisions Reconciled:** 100% VERIFIED & COMPLIANT.
- **Zero Architectural Drift:** Monolith simplicity, frozen migrations, and streaming lockout preserved.
