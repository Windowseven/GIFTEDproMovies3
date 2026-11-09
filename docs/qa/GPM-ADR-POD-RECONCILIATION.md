# GIFTEDproMovies3 — GPM-PRE-FRONTEND-REMEDIATION-PROGRAM
## Deliverable 1.4: Master Architecture Decisions & Product Owner Decisions Reconciliation

**Document ID:** `GPM-ADR-POD-RECONCILIATION`  
**Mission Reference:** `GPM-PRE-FRONTEND-REMEDIATION-PROGRAM` (Stage 1)  
**Authority:** Product Owner  
**Date:** 2026-11-04  
**Source Decisions:** `docs/architecture/15-ARCHITECTURE-DECISIONS-AND-TRADEOFFS.md` & `docs/decisions/`  

---

## 1. Decision Register Reconciliation (ADR-001 through ADR-038)

| ADR ID | Decision Title | Governed Scope | Original Status | Current Status | Code Implementation Evidence | Verification Test Suite | Reconciled Findings & Residual Risk |
| :---: | :--- | :--- | :---: | :---: | :--- | :--- | :--- |
| **ADR-001** | Modular Monolith | Monolithic architecture | ACCEPTED | **IMPLEMENTED & VERIFIED** | `backend/src/modules/` | `http-foundation.test.ts` | 100% compliant. No microservices. |
| **ADR-002** | Node.js LTS + TypeScript Strict | Runtime & typing | ACCEPTED | **IMPLEMENTED & VERIFIED** | `backend/tsconfig.json` | `tsc -p tsconfig.build.json` | 100% compliant. 0 type errors. |
| **ADR-003** | NestJS + Fastify Adapter | HTTP Framework | ACCEPTED | **IMPLEMENTED & VERIFIED** | `backend/src/main.ts` | `http-foundation.test.ts` | 100% compliant. |
| **ADR-004** | PostgreSQL Authoritative Store | Persistence store | ACCEPTED | **IMPLEMENTED & VERIFIED** | PostgreSQL 18.6 | All 26 database tests | 100% compliant. Relational integrity. |
| **ADR-005** | Drizzle ORM SQL-First Persistence| Schema & migrations | ACCEPTED | **IMPLEMENTED & VERIFIED** | 14 migrations `0000`–`0013` | Migration check | Frozen migrations intact. |
| **ADR-006** | Server-Controlled HttpOnly Cookie| Session transport | ACCEPTED | **IMPLEMENTED & VERIFIED** | `auth.controller.ts` | `auth-http.integration.test.ts` | `gifted_session` cookie; SameSite=Lax. |
| **ADR-007** | Opaque Database Sessions | Session lifecycle | ACCEPTED | **IMPLEMENTED & VERIFIED** | `session.service.ts` | `session.service.test.ts` | 14d inactivity / 30d absolute timeout. |
| **ADR-008** | Provider-Agnostic Payment Adapter| Payment normalization | ACCEPTED | **IMPLEMENTED & VERIFIED** | `backend/src/modules/commercial/` | `palmpesa-gateway.unit.test.ts` | Normalized states: PENDING, SUCCEEDED, etc. |
| **ADR-009** | Media Delivery Separated from API | Object storage offload| ACCEPTED | **IMPLEMENTED & VERIFIED** | `r2-media-storage.adapter.ts` | `verify-e2e-media-delivery.mjs`| Media files stream directly from R2. |
| **ADR-010** | Cloudflare Stream Managed Video | Video streaming | POD-02 | **DEFERRED (Phase 8)** | `media.service.ts` (503) | `phase7-backend-master-e2e...` | Locked behind 503 `STREAMING_COMING_SOON`. |
| **ADR-011** | Cloudflare R2 Object Storage | Object storage | POD-02 | **IMPLEMENTED & VERIFIED** | `r2-media-storage.adapter.ts` | `simulator-elimination...` | Simulator deleted; pure R2. |
| **ADR-012** | PostgreSQL-Backed Outbox Pattern | Async jobs | ACCEPTED | **IMPLEMENTED & VERIFIED** | `email-outbox.service.ts` | `email-outbox-worker.test.ts` | Outbox worker with exponential backoff. |
| **ADR-013** | PostgreSQL Full-Text Search | Search engine | ACCEPTED | **IMPLEMENTED & VERIFIED** | `content.schema.ts` (GIN) | `customer-catalog.integration...`| Full text search on title/synopsis. |
| **ADR-014** | Avoid Premature Redis Fleet | Caching | DEFERRED | **DEFERRED BY APPROVED DECISION** | In-memory caching | Architecture specification | No standalone Redis fleet at launch. |
| **ADR-015** | No Premature Microservices | Infrastructure | ACCEPTED | **IMPLEMENTED & VERIFIED** | Single monolith | Deployment configuration | Single deployable backend. |
| **ADR-016** | Entitlements Separate from Payments| Commercial ledger | ACCEPTED | **IMPLEMENTED & VERIFIED** | `orders`, `entitlements` | `commercial-runtime.test.ts` | Entitlement starts upon activation. |
| **ADR-017** | One-Time Subscriptions | Commercial policy | ACCEPTED | **IMPLEMENTED & VERIFIED** | `entitlement.service.ts` | `commercial-runtime.test.ts` | No recurring billing; manual renewal. |
| **ADR-018** | Offline Download DRM / Licensing | Media licensing | ACCEPTED (POD-08) | **IMPLEMENTED & VERIFIED** | `media.service.ts` | `download-authorization...` | Option A approved for V1 Web Launch (R2 signed URLs, UNIQUE_TITLES quota, POD-07 devices). Multi-DRM deferred to V2. |
| **ADR-019** | In-App & Email Channel | Notifications | ACCEPTED | **IMPLEMENTED & VERIFIED** | `notifications.service.ts` | `notifications.test.ts` | In-app + email active. Push/SMS deferred. |
| **ADR-020** | Authenticated Purchases Only | Checkout boundary | ACCEPTED | **IMPLEMENTED & VERIFIED** | `orders.controller.ts` | `orders-runtime.test.ts` | Zero guest checkout. Session required. |
| **ADR-021** | Tanzania Launch Market & TZS | Currency/Market | ACCEPTED | **IMPLEMENTED & VERIFIED** | `commercial.schema.ts` | `orders-runtime.test.ts` | TZS currency enforced on offers. |
| **ADR-022** | Atomic Download Quota Semantics | Quota accounting | ACCEPTED | **IMPLEMENTED & VERIFIED** | `media.service.ts` | `download-authorization...` | Finite quotas decremented atomically. |
| **ADR-023** | Catalog Separate from Entitlement | Content lifecycle | ACCEPTED | **IMPLEMENTED & VERIFIED** | `content-lifecycle.service.ts` | `catalog-functional...` | Unpublishing content preserves valid grants. |
| **ADR-024** | Devices Distinct from Sessions | Device recognition | ACCEPTED | **IMPLEMENTED & VERIFIED** | `device.service.ts` | `device-limits.integration...` | Registered devices separate from streams. |
| **ADR-025** | Protected Media Authorization | Security tokens | ACCEPTED | **IMPLEMENTED & VERIFIED** | `media.service.ts` | `download-authorization...` | 900s SigV4 URLs; Range header support. |
| **ADR-026** | Refunds Excluded from V1 Launch | Commercial policy | DEFERRED | **DEFERRED BY APPROVED DECISION** | Manual reconciliation | ARCH-015 | Automated refunds excluded from launch. |
| **ADR-027** | Purpose-Based Data Retention | Privacy & retention | ACCEPTED | **APPROVED DESIGN / IMPLEMENTATION PENDING**| Models support retention | `cleanup-outbox.mjs` | Automated retention cron pending. |
| **ADR-028** | Backup, Restore & PITR Strategy | Disaster recovery | ACCEPTED | **IMPLEMENTED — TEST EVIDENCE INCOMPLETE** | `RUNBOOK-OPS-001` | Operational runbook | Staging recovery drill requires human gate. |
| **ADR-029** | Measurement-Led Performance | Observability | ACCEPTED | **IMPLEMENTED & VERIFIED** | `main.ts` onResponse hook | `http-foundation.test.ts` | Response times logged on all requests. |
| **ADR-030** | Google OAuth 2.0 / OIDC | Identity federation | ACCEPTED | **IMPLEMENTED & VERIFIED** | `google-auth.service.ts` | `google-auth-http.integration...`| Dedicated `user_identities` table. |
| **ADR-031** | 9-Point Readiness & Approval Gate | Content governance | ACCEPTED | **IMPLEMENTED & VERIFIED** | `content-lifecycle.service.ts` | `catalog-functional...` | Server-side 100% readiness validation. |
| **ADR-032** | Hard-Muxed DJ Editions Hierarchy | Swahili cinema | ACCEPTED | **IMPLEMENTED & VERIFIED** | `polymorphic-catalog.service.ts`| `catalog-polymorphic-domain...` | Distinct video files per voice artist. |
| **ADR-033** | Taxonomy Governance Safeguards | Reference integrity | ACCEPTED | **IMPLEMENTED & VERIFIED** | `taxonomy.service.ts` | `catalog-functional...` | Rejects referenced category deletion (409). |
| **ADR-034** | Polymorphic Type Integrity (Option C)| Domain validation | ACCEPTED | **IMPLEMENTED & VERIFIED** | `polymorphic-catalog.service.ts`| `catalog-polymorphic-domain...` | Application boundary validation. |
| **ADR-035** | Renewal Chaining (Policy D3) | Catalog renewals | ACCEPTED | **IMPLEMENTED & VERIFIED** | `entitlement.service.ts` | `commercial-access-runtime...` | Extends active grant `valid_until`. |
| **ADR-036** | Media Supersession (POD-03) | Asset replacement | ACCEPTED | **IMPLEMENTED & VERIFIED** | `media-supersessions.schema.ts` | `media-supersession-safeguards...`| Migration 0013 + DB triggers. |
| **ADR-037** | Download Quotas & 24h Grace (POD-05)| Quota & retry | ACCEPTED | **IMPLEMENTED & VERIFIED** | `download-attempts.schema.ts` | `phase7-backend-master-e2e...` | 24h retry grace without extra quota. |
| **ADR-038** | Subscription-Based Device Limits | Device capacity | POD-07 | **IMPLEMENTED & VERIFIED** | `device.service.ts` | `device-limits.integration...` | MAX(device_limit) from active catalog subs. |

---
*End of GPM-ADR-POD-RECONCILIATION.*
