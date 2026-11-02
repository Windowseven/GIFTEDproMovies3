# GIFTEDproMovies3 — PHASE 7 STAGE 1 TEST EVIDENCE
## Automated Test Results, Concurrency Evidence & Regression Suites

**Document Version:** 1.0.0  
**Phase:** Phase 7 — Option B (Download-Focused Phase 7)  
**Stage:** Stage 1 — Backend Engineering  
**Test Environment:** macOS, Node.js v22, PostgreSQL 18.6 (Port 5433, Database: `giftedpro_phase1_test`)  
**Execution Date:** 2 November 2026  
**Status:** 100% PASS RATE — ZERO FAILING TESTS

---

## 1. TEST SUITE EXECUTION SUMMARY

| Test Suite | File | Tests Run | Pass | Fail | Duration |
|---|---|---|---|---|---|
| **Customer Device Limits** | `backend/tests/device-limits.integration.test.ts` | 10 | 10 | 0 | ~12.8s |
| **Download Authorization & Quota** | `backend/tests/download-authorization.integration.test.ts` | 19 | 19 | 0 | ~13.2s |
| **Media Delivery Unit Suite** | `backend/tests/media-delivery.unit.test.ts` | 9 | 9 | 0 | ~4.7s |
| **Media Supersession Safeguards** | `backend/tests/media-supersession-safeguards.test.ts` | 12 | 12 | 0 | ~10.4s |
| **Staff Media Preview Token** | `backend/tests/staff-media-preview.integration.test.ts` | 9 | 9 | 0 | ~11.1s |
| **Auth -> Catalog Cross-Phase** | `backend/tests/auth-phase3-integration.test.ts` | 8 | 8 | 0 | ~15.0s |
| **Password Change & Session Rotation** | `backend/tests/password-change.integration.test.ts` | 10 | 10 | 0 | ~14.1s |
| **TOTAL** | **7 Selected Suites** | **77** | **77** | **0** | **100% Pass** |

---

## 2. DETAILED TEST SUITE EVIDENCE

### 2.1 Customer Device Limits Suite (`device-limits.integration.test.ts`)

```
▶ Customer device limit enforcement, concurrency, and session revocation suite (CDL)
  ✔ CDL-01: Default device limit of 2 is enforced when customer has no custom plan (263.25733ms)
  ✔ CDL-02: Existing device update does NOT consume a new slot (fast-path update) (45.184295ms)
  ✔ CDL-03: Plan-based device limit = 4 is enforced for multi-device family plan (131.235186ms)
  ✔ CDL-04: Plan-based device limit = 1 is strictly enforced (30.509566ms)
  ✔ CDL-05: Concurrent device registration race (5 parallel requests) deterministically serializes via advisory lock (135.399405ms)
  ✔ CDL-06: Concurrent duplicate registrations of the same device identifier succeed idempotently (30.761901ms)
  ✔ CDL-07: Device removal frees device slot, allowing subsequent registration (128.234949ms)
  ✔ CDL-08: Device removal cascades session revocation for all sessions on that device (50.117098ms)
  ✔ CDL-09: IDOR protection: Customer cannot remove another customer's device (19.823101ms)
✔ Customer device limit enforcement, concurrency, and session revocation suite (CDL) (2282.772777ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 12815.968197
```

### 2.2 Download Authorization, Quota, History & Licenses Suite (`download-authorization.integration.test.ts`)

```
▶ Offline download authorization and quota enforcement suite (GPM-AUDIT-013)
  ✔ DLA-01: Unauthenticated request to /download/authorize returns 401 (123.295339ms)
  ✔ DLA-02: Non-customer role (admin) returns 403 Forbidden (62.089601ms)
  ✔ DLA-03: Customer without active entitlement returns 403 Forbidden (35.43801ms)
  ✔ DLA-04: Customer with plan where download_limit = 0 returns 403 Forbidden (32.826895ms)
  ✔ DLA-05: Customer requesting edition with pending download status returns 404 (28.413768ms)
  ✔ DLA-06: Customer with active entitlement on download-enabled plan authorizes ready movie download (161.207176ms)
  ✔ DLA-07: Customer authorizes ready episode download (37.403902ms)
  ✔ DLA-08: Audit event CUSTOMER_MEDIA_DOWNLOAD_AUTHORIZED is recorded (6.057422ms)
  ✔ DLA-09: Finite positive quota enforcement (limit = 1 unique title) (93.160105ms)
  ✔ DLA-10: Customer reports delivery failure activating retry grace (26.610254ms)
  ✔ DLA-11: 24-hour retry grace window permits re-download of failed attempt without consuming additional quota (45.83892ms)
  ✔ DLA-12: Customer reports delivery completion (19.307858ms)
  ✔ DLA-13: Concurrent download requests for distinct titles under limit = 1 serialize via order lock (74.85799ms)
  ✔ DLA-14: GET /api/v1/download/history returns paginated history with metadata and quota projection (25.51691ms)
  ✔ DLA-15: GET /api/v1/download/history supports status filtering (16.617926ms)
  ✔ DLA-16: GET /api/v1/download/history customer isolation (cannot view another customer's downloads) (13.57283ms)
  ✔ DLA-17: GET /api/v1/download/licenses returns active download-eligible licenses with quotaRemaining (16.243458ms)
  ✔ DLA-18: GET /api/v1/download/licenses excludes plans where download_limit = 0 (19.94158ms)
✔ Offline download authorization and quota enforcement suite (GPM-AUDIT-013) (2313.327363ms)
ℹ tests 19
ℹ suites 0
ℹ pass 19
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 13231.34114
```

### 2.3 Media Delivery Unit Suite (`media-delivery.unit.test.ts`)

```
▶ Task 5.B1 — Media Delivery & Playback Signer Unit Suite
  ✔ JwtPlaybackSignerAdapter: generates and verifies valid playback token (28.516625ms)
  ✔ JwtPlaybackSignerAdapter: rejects tampered token (1.39987ms)
  ✔ JwtPlaybackSignerAdapter: rejects expired token (0.679559ms)
  ✔ JwtPlaybackSignerAdapter: rejects invalid signature or wrong secret (0.571883ms)
  ✔ R2MediaStorageAdapter: constructor validates required parameters (404.619467ms)
  ✔ R2MediaStorageAdapter: generates presigned upload/download URLs and handles object lifecycle with mock S3Client (111.358686ms)
  ✔ MediaService: enforces customer streaming lockout with 503 STREAMING_COMING_SOON when customerStreamingEnabled is false (3700.52063ms)
  ✔ MediaService: download authorization directly invokes R2 generatePresignedDownloadUrl without simulation tokens (2.668224ms)
✔ Task 5.B1 — Media Delivery & Playback Signer Unit Suite (4259.346151ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 4685.127423
```

### 2.4 Media Supersession Safeguards Suite (`media-supersession-safeguards.test.ts`)

```
▶ Media asset replacement and supersession safeguards suite (GPM-AUDIT-017)
  ✔ MSS-01: Upload intent for ready movie edition with active commercial entitlement throws 409 (130.230418ms)
  ✔ MSS-02: Complete upload for ready movie edition with active commercial entitlement throws 409 (16.340226ms)
  ✔ MSS-03: Upload intent for pending edition on protected movie succeeds (200) (80.10928ms)
  ✔ MSS-04: Upload intent for ready movie edition without entitlement succeeds (200) (32.609515ms)
  ✔ MSS-05: Upload intent for ready episode with active commercial entitlement throws 409 (52.327934ms)
  ✔ MSS-06: Complete upload for ready episode with active commercial entitlement throws 409 (19.02872ms)
  ✔ MSS-07: Upload intent for ready episode without active commercial entitlement succeeds (200) (29.616742ms)
  ✔ MSS-08: Concurrent upload-intent requests against protected edition both receive 409 Conflict (43.27191ms)
  ✔ MSS-09: Authorized supersession workflow (POST /media/supersede) succeeds for ready edition with active commercial entitlement (200) (34.289727ms)
  ✔ MSS-10: Direct raw SQL update on ready edition with active entitlement without supersession record is blocked by DB trigger (10.948459ms)
  ✔ MSS-11: Customer role is rejected from POST /media/supersede with 403 Forbidden (8.8008ms)
✔ Media asset replacement and supersession safeguards suite (GPM-AUDIT-017) (1369.47449ms)
ℹ tests 12
ℹ suites 0
ℹ pass 12
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 10382.45778
```

### 2.5 Staff Media Preview Token Suite (`staff-media-preview.integration.test.ts`)

```
▶ Staff media preview token integration suite (GPM-AUDIT-016)
  ✔ SMP-01: Admin generates preview token for ready movie edition (154.831264ms)
  ✔ SMP-02: Staff with MEDIA_PREVIEW capability generates preview token (12.366417ms)
  ✔ SMP-03: Staff WITHOUT MEDIA_PREVIEW capability is rejected (403) (14.371877ms)
  ✔ SMP-04: Customer role (403) and unauthenticated (401) are rejected (10.763921ms)
  ✔ SMP-05: Non-ready edition is rejected with 400 (18.77988ms)
  ✔ SMP-06: Non-existent edition returns 404 (17.228198ms)
  ✔ SMP-07: Episode preview succeeds with episode ID (32.838672ms)
  ✔ SMP-08: Structured audit log verification (11.20603ms)
✔ Staff media preview token integration suite (GPM-AUDIT-016) (1394.621571ms)
ℹ tests 9
ℹ suites 0
ℹ pass 9
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 11134.77973
```

---

## 3. CONCURRENCY & RACE CONDITION VERIFICATION EVIDENCE

### 3.1 Device Limit Registration Race (`CDL-05`)
- **Setup:** A customer with default device limit = 2 initiates 5 simultaneous device registration requests with distinct `deviceIdentifier`s.
- **Mechanism:** `SELECT pg_advisory_xact_lock(hashtext(:userId))` inside a transaction.
- **Result:**
  - Successes: Exactly 2.
  - Failures: Exactly 3 with `code: "DEVICE_LIMIT_EXCEEDED"`.
  - Database verification: `SELECT COUNT(*) FROM devices WHERE user_id = :userId` returns exactly 2.

### 3.2 Download Quota Exhaustion Race (`DLA-13`)
- **Setup:** Customer under a plan with `download_limit = 1 UNIQUE_TITLES` initiates 2 simultaneous authorization calls for 2 distinct episodes.
- **Mechanism:** Pessimistic order row locking (`SELECT id FROM orders WHERE id = :orderId FOR UPDATE`).
- **Result:**
  - Statuses: `[200, 403]`.
  - The rejected request returns `DOWNLOAD_QUOTA_EXHAUSTED`.
  - Database verification: Exactly 1 download attempt created for the order.

---

## 4. TYPECHECK VERIFICATION

```
$ tsc --noEmit -p tsconfig.json
(Clean output, exit code 0, 0 errors)
```
- Full strict TypeScript typecheck passes across all backend modules, controllers, DTOs, and services.
