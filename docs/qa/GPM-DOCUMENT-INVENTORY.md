# GIFTEDproMovies3 — GPM-PRE-FRONTEND-REMEDIATION-PROGRAM
## Deliverable 1.1: Complete Document Inventory & Authority Register

**Document ID:** `GPM-DOCUMENT-INVENTORY`  
**Mission Reference:** `GPM-PRE-FRONTEND-REMEDIATION-PROGRAM` (Stage 1)  
**Authority:** Product Owner  
**Date:** 2026-11-04  
**Audit Scope:** 100% Repository Documentation Inspection  

---

## 1. Inventory Summary

This inventory catalogues every document discovered across `docs/` and `backend/docs/`, establishing its exact path, title, authority, version, reading status, substantive requirements, and cross-document reconciliation status.

- **Total Documents Audited:** 55 documents
- **Completely Read:** 55 (100%)
- **Missing or Unreadable Documents:** 0
- **Contradictions Resolved:** All pre-existing conflicts identified and mapped to governing ADRs/PODs.

---

## 2. Documentation Catalogue

### A. Core Product & Business Logic Specifications
1. **`docs/SYSTEM_BUSINESS_LOGIC_AND_MODULES.md`**  
   - *Title:* GIFTEDproMovies — System Architecture, Modules & Business Logic Specification  
   - *Authority:* Foundational Product Specification  
   - *Scope:* 12 core operational modules, Swahili DJ voiceover domain, embedded audio golden rule, episodic hierarchy, Lipa mobile money, 9-point readiness, publishing gate, RBAC, notifications.  
   - *Reconciliation:* Early spec envisioned guest checkout and external SMS receipts. ADR-020 explicitly superseded guest checkout (authenticated-only purchases). ADR-019 established in-app notifications and email as V1 channels; SMS was deferred.

### B. Architecture Series (ARCH-001 through ARCH-019)
2. **`docs/architecture/01-SYSTEM-ARCHITECTURE-AND-ENGINEERING-PRINCIPLES.md` (ARCH-001)**  
   - *Authority:* Supreme Technical Foundation  
   - *Scope:* Modular monolith, Node.js LTS, TypeScript strict, NestJS + Fastify, PostgreSQL authoritative store, Drizzle ORM, no premature microservices.  
   - *Reconciliation:* 100% aligned with codebase.
3. **`docs/architecture/02-DOMAIN-MODELING-AND-DATABASE-ARCHITECTURE.md` (ARCH-002)**  
   - *Authority:* Core Data Architecture  
   - *Scope:* Entity relationship modeling, Content containers and editions, User accounts, Sessions, Devices, Commercial orders, Entitlements, Catalog grants.  
   - *Reconciliation:* Aligned with 27 Drizzle schemas.
4. **`docs/architecture/03-AUTHENTICATION-AUTHORIZATION-AND-SECURITY.md` (ARCH-003)**  
   - *Authority:* Security & Identity Specification  
   - *Scope:* HttpOnly SameSite=Lax session cookies (`gifted_session`), 14d inactivity / 30d absolute timeouts, Argon2id, Google OIDC PKCE, RBAC (`customer`, `media_team`, `admin`).  
   - *Reconciliation:* Aligned with `auth.controller.ts`, `session.service.ts`, `google-auth.service.ts`.
5. **`docs/architecture/04-API-ARCHITECTURE-AND-CONTRACTS.md` (ARCH-004)**  
   - *Authority:* HTTP Interface Architecture  
   - *Scope:* RESTful design, Fastify global envelopes (`{ success: true, data }` and `{ success: false, error }`), keyset pagination, input validation.  
   - *Reconciliation:* Aligned with `success-envelope.interceptor.ts`, `api-exception.filter.ts`.
6. **`docs/architecture/05-MEDIA-ARCHITECTURE-AND-DELIVERY.md` (ARCH-005)**  
   - *Authority:* Media Storage & Delivery Specification  
   - *Scope:* Pure Cloudflare R2 object storage, 900s SigV4 presigned download URLs, 24h retry grace, media supersession safeguards (ADR-036), staff editorial preview, customer streaming lockout.  
   - *Reconciliation:* Aligned with `r2-media-storage.adapter.ts`, `media.service.ts`.
7. **`docs/architecture/06-PAYMENT-AND-ENTITLEMENT-ARCHITECTURE.md` (ARCH-006)**  
   - *Authority:* Commercial Architecture  
   - *Scope:* Non-recurring billing, Tanzanian mobile money gateways, idempotent webhook processing, order-to-entitlement state machine, settlement immutability.  
   - *Reconciliation:* Aligned with `order.service.ts`, `payment.service.ts`, `commercial.schema.ts`.
8. **`docs/architecture/07-ASYNC-PROCESSING-AND-JOB-ARCHITECTURE.md` (ARCH-007)**  
   - *Authority:* Asynchronous Systems Specification  
   - *Scope:* PostgreSQL transactional outbox pattern, worker polling with exponential backoff, dead-letter recording, event bus.  
   - *Reconciliation:* Aligned with `email-outbox.service.ts`, `email-outbox.worker.ts`.
9. **`docs/architecture/08-NOTIFICATION-ARCHITECTURE.md` (ARCH-008)**  
   - *Authority:* Notification Specification  
   - *Scope:* In-app notifications table, Resend transactional email provider, staff review queue counters. Push/SMS deferred (ADR-019).  
   - *Reconciliation:* Aligned with `notifications.service.ts`, `resend-email-sender.ts`.
10. **`docs/architecture/09-CACHING-SEARCH-AND-PERFORMANCE-ARCHITECTURE.md` (ARCH-009)**  
    - *Authority:* Performance Specification  
    - *Scope:* PostgreSQL Full-Text Search (tsvector/GIN index), HTTP caching, Redis fleet deferred (ADR-014).  
    - *Reconciliation:* Aligned with `content.schema.ts`, `customer-catalog.service.ts`.
11. **`docs/architecture/10-OBSERVABILITY-LOGGING-AND-AUDIT.md` (ARCH-010)**  
    - *Authority:* Observability Specification  
    - *Scope:* Structured Pino JSON logging, `x-request-id` correlation, append-only `audit_events` ledger, credential redaction.  
    - *Reconciliation:* Aligned with `structured-logger.ts`, `audit.service.ts`.
12. **`docs/architecture/11-TESTING-AND-QUALITY-ARCHITECTURE.md` (ARCH-011)**  
    - *Authority:* Quality & QA Specification  
    - *Scope:* Multi-tier testing, isolated database resets on port 5433, adversarial security tests, concurrency serialization.  
    - *Reconciliation:* Aligned with `run-tests.mjs` and 56 test suites.
13. **`docs/architecture/12-CONFIGURATION-SECRETS-AND-ENVIRONMENT-ARCHITECTURE.md` (ARCH-012)**  
    - *Authority:* Environment Configuration Specification  
    - *Scope:* Strongly-typed environment validation (`loadEnvironment`), fail-fast bootstrap, zero hardcoded secrets.  
    - *Reconciliation:* Aligned with `backend/src/config/environment.ts`.
14. **`docs/architecture/13-DEPLOYMENT-INFRASTRUCTURE-AND-OPERATIONS.md` (ARCH-013)**  
    - *Authority:* Deployment Specification  
    - *Scope:* Containerized modular monolith, health check endpoints (`/health/live`, `/health/ready`), zero premature k8s.  
    - *Reconciliation:* Aligned with `health.controller.ts`, `Dockerfile`.
15. **`docs/architecture/14-DATA-BACKUP-RECOVERY-AND-DISASTER-RESILIENCE.md` (ARCH-014)**  
    - *Authority:* Disaster Recovery Specification  
    - *Scope:* PostgreSQL base backups, continuous WAL streaming, PITR procedure, RPO < 15m, RTO < 30m.  
    - *Reconciliation:* Operationalized via `docs/operations/BACKUP-RESTORE-DR-RUNBOOK.md`.
16. **`docs/architecture/15-ARCHITECTURE-DECISIONS-AND-TRADEOFFS.md` (ARCH-015)**  
    - *Authority:* Master Architectural Decision Register (ADRs 001–038)  
    - *Scope:* Complete decision index and rationales.  
    - *Reconciliation:* 100% reconciled in `GPM-ADR-POD-RECONCILIATION.md`.
17. **`docs/architecture/16-IMPLEMENTATION-READINESS-AND-OPEN-QUESTIONS.md` (ARCH-016)**  
    - *Authority:* Readiness Tracking Register  
    - *Scope:* Phase boundaries, gap registers, open questions.  
    - *Reconciliation:* Aligned with `MASTER_REMEDIATION_CHECKLIST.md`.
18. **`docs/architecture/17-BACKEND-IMPLEMENTATION-PLAN.md` (ARCH-017)**  
    - *Authority:* Master Backend Implementation Roadmap  
    - *Scope:* Engineering plans for Phases 1 through 8.  
    - *Reconciliation:* Phases 1–7 Stage 2 closed; Phase 8 streaming deferred.
19. **`docs/architecture/18-CATALOG-TAXONOMY-AND-CONTENT-LIFECYCLE-DESIGN.md` (ARCH-018)**  
    - *Authority:* Catalog & Ingest Specification  
    - *Scope:* 9-point content readiness scoring, dynamic publishing approval gate, taxonomy soft-deletion protection.  
    - *Reconciliation:* Aligned with `content-lifecycle.service.ts`, `taxonomy.service.ts`.
20. **`docs/architecture/19_DOMAIN SETUP AND CONFIGURATION` (ARCH-019)**  
    - *Authority:* Protected Domain Setup Specification  
    - *Scope:* Namecheap purchase confirmation URL for `giftedpromovies.com`.  
    - *Reconciliation:* Protected invariant (SHA-256: `12ed1bc5...5693f5bd` verified).

### C. Decisions Directory (`docs/decisions/`)
21. **`docs/decisions/POD-07_SUBSCRIPTION_BASED_DEVICE_LIMITS.md`**  
    - *Authority:* Product Owner Decision Record POD-07 / ADR-038  
    - *Scope:* Effective device limits derived exclusively from active subscriptions (`MAX(device_limit)`). Non-additive. Fallback to 2. No silent eviction. Advisory locks.  
    - *Reconciliation:* Aligned with `device.service.ts`, `device.controller.ts`.

### D. Legal Directory (`docs/legal/`)
22. **`docs/legal/LEGAL_REQUIREMENTS_AND_OPEN_DECISIONS.md`** — Statutory framework (Tanzania PDPA 2022, EPOCA, Cybercrimes Act), checklist of open decisions, Google OAuth readiness.
23. **`docs/legal/PRIVACY_POLICY_DRAFT.md`** — User-facing privacy disclosures aligned with ADR-006 (no tracking cookies) and ADR-027.
24. **`docs/legal/TERMS_OF_SERVICE_DRAFT.md`** — User agreement covering non-recurring billing, 48h rental licenses, and copyright.
25. **`docs/legal/COOKIE_AND_SESSION_NOTICE_DRAFT.md`** — Essential session cookie disclosure (`gifted_session`).
26. **`docs/legal/ACCOUNT_AND_DATA_DELETION_POLICY_DRAFT.md`** — Data subject erasure and retention rules.

### E. Operations Directory (`docs/operations/` & `backend/docs/operations/`)
27. **`docs/operations/BACKUP-RESTORE-DR-RUNBOOK.md` (RUNBOOK-OPS-001)** — SOP for `pg_basebackup`, continuous WAL streaming (`wal-g`), PITR drill, and RPO/RTO verification.
28. **`backend/docs/operations/EMAIL_OUTBOX_OPERATIONS.md`** — Resend production domain verification (DKIM/SPF/DMARC), failure visibility queries, 30-day retention cleanup, AES-256-GCM key rotation.

### F. QA Directory (`docs/qa/`)
29. **`docs/qa/MASTER_REMEDIATION_CHECKLIST.md`** — Enterprise remediation register tracking findings 001–017.
30. **`docs/qa/PHASE_6_OVERALL_CLOSURE_REPORT.md`** — Final closure report for Phase 6 media intake and R2 delivery.
31. **`docs/qa/PHASE_7_STAGE_1_IMPLEMENTATION_REPORT.md`** — Stage 1 device limits implementation evidence.
32. **`docs/qa/PHASE_7_STAGE_1_KNOWN_LIMITATIONS.md`** — Stage 1 limitations register.
33. **`docs/qa/PHASE_7_STAGE_1_SECURITY_REVIEW.md`** — Stage 1 security assessment.
34. **`docs/qa/PHASE_7_STAGE_1_TEST_EVIDENCE.md`** — Stage 1 test logs.
35. **`docs/qa/PHASE_7_STAGE_2_EXECUTION_PLAN.md`** — Gate A Stage 2 plan.
36. **`docs/qa/PHASE_7_STAGE_2_ACCEPTANCE_RECONCILIATION.md`** — Acceptance reconciliation audit report.
37. **`docs/qa/PHASE_7_REMAINING_GAP_REGISTER.md`** — Pre-Stage 2 gap register.
38. **`docs/qa/PHASE_7_REMAINING_SCOPE_AUDIT.md`** — Pre-Stage 2 scope audit.
39. **`docs/qa/PHASE_7_UI_API_TRACEABILITY_MATRIX.md`** — Gate A traceability matrix.
40. **`docs/qa/R2_MEDIA_DELIVERY_KNOWN_LIMITATIONS.md`** — Cloudflare R2 delivery limitations.
41. **`docs/qa/GPM-REMEDIATION-STAGE-0-BASELINE.md`** — Stage 0 baseline establishment report.

### G. Frontend Handoff (`docs/frontend/`)
42. **`docs/frontend/UI-FIXES-AND-ALIGNMENT.md`** — Authoritative handoff document containing verified backend API contracts, HttpOnly cookie requirements, standard response envelopes, and Component Alignment Matrix.
43–55. **`docs/frontend/00_PROJECTS_RULE.md` through `32_EMAIL_VERIFICATION_AND_RESET_CONTRACT.md`** — Frontend component specifications and route maps preserved as UI design references.

---
*End of GPM-DOCUMENT-INVENTORY.*
