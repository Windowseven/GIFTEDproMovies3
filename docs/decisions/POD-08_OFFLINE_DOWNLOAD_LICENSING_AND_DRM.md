# GIFTEDproMovies3 — POD-08 DECISION RECORD
## Offline Media Licensing & DRM Scope Resolution (ADR-018)

**Document ID:** POD-08 / ADR-018  
**Status:** ACCEPTED BY PRODUCT OWNER  
**Decision Date:** 4 November 2026  
**Authority:** Product Owner Decision POD-08 (`GPM-ADR-018-PO-DECISION`)  
**Scope:** V1 Web Launch & Pre-Frontend Integration Scope  
**Related Documents:** `ADR-011`, `ADR-018`, `ADR-022`, `ADR-024`, `ADR-025`, `ADR-037`, `ADR-038`, `POD-05`, `POD-07`, `docs/qa/GPM-DRM-OFFLINE-LICENSING-ANALYSIS.md`

---

## 1. CONTEXT & PROBLEM STATEMENT

Architectural Decision **ADR-018 (Offline Download DRM / Licensing)** was initially recorded in `docs/architecture/15-ARCHITECTURE-DECISIONS-AND-TRADEOFFS.md` with status `REQUIRES VALIDATION`.

During Phase 7 Stage 2 and the Pre-Frontend Compliance Audit, the technical and business boundaries of offline content protection were investigated:
1. **Technical Boundary:** The backend implements Phase 7 Model B (POD-05 / ADR-037), providing server-side authenticated, atomic download quota reservation and 900-second Cloudflare R2 presigned SigV4 delivery with 24-hour retry grace and subscription-based device limits (POD-07 / ADR-038).
2. **Threat Model Reality:** Presigned URLs protect origin storage access and bandwidth from unauthorized users. However, once downloaded by an entitled customer, unencrypted MP4 containers can technically be shared or copied locally on the user's filesystem.
3. **Hardware Multi-DRM Evaluation:** Implementing studio-grade hardware DRM (Google Widevine Modular, Apple FairPlay Streaming, Microsoft PlayReady) requires native mobile/desktop application containers, hardware Content Decryption Modules (CDMs), proprietary key broker infrastructure, and recurring third-party licensing fees ($500–$2,500/month). Standard web browsers offer fragile, fragmented support for persistent offline encrypted media storage.
4. **Market Context:** GIFTEDproMovies3 V1 is a web-first application targeting the Tanzanian and East African markets, specializing in local and Translating DJ cinema. Target users access the service primarily via mobile and desktop web browsers.

A formal Product Owner determination was requested under **Mission Section 7.4** to establish the authoritative catalog licensing scope.

---

## 2. PRODUCT OWNER DECISION (POD-08)

The Product Owner formally approves **Option A for V1 Web Launch**:

1. **Cloudflare R2 Signed Download URLs:**  
   Media downloads are delivered directly from Cloudflare R2 object storage using AWS S3-compatible SigV4 presigned GET URLs with a strict **900-second (15-minute) expiration window**. Direct origin bucket access is blocked.
2. **Atomic Quota Enforcement via `UNIQUE_TITLES`:**  
   Download quotas are decremented atomically under serial PostgreSQL row locks (`SELECT ... FOR UPDATE` on `orders`). Under the primary `UNIQUE_TITLES` policy, re-downloading a previously attempted title under an active order does not consume additional quota slots. Total action limits (`DOWNLOAD_ACTIONS`) are enforced where configured by plan.
3. **Subscription-Based Device Limits (POD-07):**  
   Customer device capacity is derived exclusively from active catalog subscriptions (`MAX(device_limit)`), serialized via transactional advisory locks on `hashtext(userId)`.
4. **Entitlement & Capability Enforcement:**  
   Every download request validates active customer authentication, active commercial entitlement (`CommercialAccessService.hasAccess()`), and plan capability (`download_limit !== 0`).
5. **24-Hour Failure Retry Grace:**  
   Customers reporting delivery failure via `POST /api/v1/download/report-delivery` (`status = 'FAILED'`) receive a **24-hour retry window** permitting a re-download without consuming additional quota slots.
6. **Contractual & Legal Deterrents:**  
   Protection against unauthorized content redistribution is governed legally by the platform Terms of Service, copyright notices, and account suspension policies, rather than client-side hardware decryption modules.

---

## 3. DEFERRED ITEMS (SCHEDULED FOR V2)

- **Multi-DRM Infrastructure:** Integration of hardware-backed DRM license servers (Google Widevine, Apple FairPlay, Microsoft PlayReady) is **FORMALLY DEFERRED TO V2**.
- **Native Mobile Containers:** Multi-DRM offline playback is scheduled to be evaluated and implemented alongside the official native iOS and Android mobile applications (Phase 9 / V2).
- **Client-Side Proprietary Encryption:** No proprietary, unverified application-layer AES container schemes will be introduced for the V1 web client.

---

## 4. STRICT NON-AUTHORIZATION BOUNDARIES

In accordance with the Product Owner Directive:
- **Zero New DRM Code:** Universal hardware DRM implementation is NOT authorized for V1.
- **Frozen Migrations:** No changes to database migrations `0000–0013`. Zero migration `0014`.
- **Protected ARCH-19:** `docs/architecture/19_DOMAIN SETUP AND CONFIGURATION` remains strictly protected.
- **Customer Streaming Lockout:** Phase 8 customer streaming remains strictly disabled (`CUSTOMER_STREAMING_ENABLED=false` returning HTTP 503 `STREAMING_COMING_SOON`).
- **Download Security Controls:** Existing download quota locks, token expiry, and device limits remain active and unaltered.
- **Production Safety:** Zero production deployment, database mutations, or external configuration changes.

---

## 5. AUDIT TRACEABILITY & VERIFICATION

| Verification Metric | Specification Baseline | Observed Evidence |
| :--- | :--- | :--- |
| **Download Token TTL** | 900 seconds | Verified in `MediaService.authorizeDownload` (`ttlSeconds: 900`) |
| **Presigned URL Expiration** | 900 seconds | Verified in `storage.generatePresignedDownloadUrl` (`expiresInSeconds: 900`) |
| **Row Locking Concurrency** | Serial transaction lock | Verified via `SELECT id FROM orders WHERE id = $1 FOR UPDATE` |
| **Quota Model** | `UNIQUE_TITLES` & `DOWNLOAD_ACTIONS` | Verified in `download-authorization.integration.test.ts` (22/22 pass) |
| **Retry Grace Window** | 24 hours (`retryGraceExpiresAt`) | Verified in `MediaService.reportDownloadDelivery` |
| **Device Capacity** | `MAX(device_limit)` (POD-07) | Verified in `device-limits.integration.test.ts` (17/17 pass) |

---

## 6. ACCEPTANCE CONCLUSION

**ADR-018 IS FORMALLY RESOLVED AND ACCEPTED AS POD-08.**  
Option A serves as the authoritative media delivery and licensing specification for GIFTEDproMovies3 V1.
