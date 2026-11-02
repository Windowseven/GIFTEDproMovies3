# GIFTEDproMovies3 — PHASE 7 STAGE 1 KNOWN LIMITATIONS
## Scope Boundaries, Architecture Constraints & Deferred Deliverables

**Document Version:** 1.0.0  
**Phase:** Phase 7 — Option B (Download-Focused Phase 7)  
**Stage:** Stage 1 — Backend Engineering  
**Date:** 2 November 2026  
**Status:** ACTIVE

---

## 1. PURPOSE & ARCHITECTURAL INTENT

This document records deliberate architecture boundaries, environmental constraints, and deferred work items identified during Phase 7 Stage 1 execution.

These limitations are **intended by design** under Product Owner Decision **POD-06** and the Phase 7 Master Execution Directive. None constitute software defects or security vulnerabilities.

---

## 2. FORMAL KNOWN LIMITATIONS REGISTER

### 2.1 Customer Video Streaming Lockout (Deferred to Phase 8)
- **Constraint:** Customer streaming authorization (`POST /api/v1/playback/authorize`) remains strictly disabled when `CUSTOMER_STREAMING_ENABLED=false` (the default).
- **Behavior:** Returns HTTP 503 Service Unavailable with:
  ```json
  {
    "statusCode": 503,
    "error": "Service Unavailable",
    "message": "STREAMING_COMING_SOON: Customer streaming playback is currently unavailable.",
    "code": "STREAMING_COMING_SOON"
  }
  ```
- **Rationale:** Under POD-06, Phase 7 focuses exclusively on offline downloads. All streaming infrastructure—including concurrent stream lease tracking, heartbeat renewal, recovery timeouts, and video player UI streaming integration—is formally deferred to Phase 8.
- **Safety Guarantee:** Verified by unit test in `backend/tests/media-delivery.unit.test.ts`.

### 2.2 Customer Frontend Download UI (Deferred to Phase 7 Stage 2)
- **Constraint:** Frontend customer UI components (`frontend/src/`) have not been modified during Stage 1.
- **Behavior:** The backend APIs (`GET /api/v1/download/history`, `GET /api/v1/download/licenses`, `DELETE /api/v1/devices/:id`, `POST /api/v1/download/authorize`, `POST /api/v1/download/report-delivery`) are fully operational and verified, but client-side visual integration is pending.
- **Rationale:** The Master Execution Directive explicitly separated Stage 1 (Backend Engineering) from Stage 2 (Frontend Integration). Stage 2 requires separate Product Owner authorization.

### 2.3 PostgreSQL Client Connection Pool Sizing for High Concurrency
- **Constraint:** In local test environments with default database pool limits (e.g., `max: 10`), firing more than 10 simultaneous requests where each opens a long transaction (such as transaction-scoped advisory locks) can exhaust pool connections.
- **Mitigation & Production Guidance:**
  - Production deployments should size `DATABASE_POOL_MAX` appropriately (e.g., 20–50 connections per instance depending on CPU/RAM).
  - Integration tests configure a dedicated pool and bound test concurrency to ensure reliable execution within resource limits.

### 2.4 Device Identifier Nature (Metadata vs Authentication Factor)
- **Constraint:** Device identifiers and device names (`deviceName`, `deviceType`) are provided by the client application.
- **Rationale & Security Posture:** Device identification is strictly an **accounting and metadata mechanism** to enforce plan device quotas. It is **never** used as an authentication factor. User authentication relies solely on secure HTTP-only cookies with 256-bit entropy. If a client attempts to forge a device name or reuse an existing device identifier, it cannot elevate privileges or access another user's account.

---

## 3. DEFERRED WORK ITEMS BY PHASE

| Item | Description | Target Phase | Prerequisites |
|---|---|---|---|
| **Phase 7 Stage 2** | Frontend customer download UI (download buttons, progress reporting, history table, device management list) | Phase 7 Stage 2 | Product Owner Stage 2 Authorization |
| **Phase 8 Streaming** | Concurrent stream lease tracking, lease heartbeat recovery, customer streaming playback unlock | Phase 8 | Phase 7 Formal Acceptance & PO Streaming Approval |
| **Phase 8 Disaster Recovery** | Real physical cloud DR drill, streaming WAL verification, empirical RTO/RPO | Phase 8 | Production Cloud Infrastructure & Live Database Deployment |
