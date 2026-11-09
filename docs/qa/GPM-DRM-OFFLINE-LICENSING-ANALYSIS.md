# GIFTEDproMovies3 — DRM & Offline Media Licensing Analysis (ADR-018)

**Document Reference:** `docs/qa/GPM-DRM-OFFLINE-LICENSING-ANALYSIS.md`  
**Mission ID:** `GPM-PRE-FRONTEND-REMEDIATION-PROGRAM` (Stage 2)  
**Authority:** Product Owner Directive & ARCH-003, ARCH-005, ARCH-016, ADR-018, POD-05 (ADR-037)  
**Status:** COMPLETE ANALYSIS — PRODUCT OWNER DECISION GATE PENDING  
**Execution Stop Condition:** Section 7.4 Decision Gate active. Zero DRM code implemented pending PO approval.

---

## 1. Executive Summary & Objective

In accordance with **Stage 2 (DRM and Offline Media Licensing — ADR-018)** of the Master Pre-Frontend Remediation Program, this report provides a comprehensive, evidence-based investigation of offline media delivery, licensing boundaries, threat vectors, and architectural alternatives for GIFTEDproMovies3.

The current system implements **Phase 7 Model B (POD-05 / ADR-037)**: server-side authenticated, atomic download quota reservation and 900-second presigned Cloudflare R2 delivery with 24-hour retry grace and device registration (POD-07 / ADR-038). However, ADR-018 remains recorded in `15-ARCHITECTURE-DECISIONS-AND-TRADEOFFS.md` as **REQUIRES VALIDATION**.

This document formalizes the technical realities of digital rights management, maps the exact capabilities and limitations of Cloudflare R2/Stream, and presents a structured **Product Owner Decision Gate** to govern whether, where, and how true DRM or alternative licensing controls should be applied.

---

## 2. Current Implementation Inspection (Phase 7 Model B)

### 2.1 Codebase Artifacts & Authorization Flow
Inspection of `backend/src/modules/media/media.service.ts` and `backend/src/modules/commercial/commercial-access.service.ts` establishes the current download delivery architecture:

1. **Access Evaluation:** `CommercialAccessService.hasAccess()` evaluates customer entitlement validity, status (`ACTIVE`), and temporal window (`starts_at` / `expires_at`).
2. **Plan Capability Gate:** `assertCustomerCanDownload()` enforces `plan_versions.download_limit !== 0`. If a subscription or one-time plan forbids downloads (`download_limit === 0`), access is immediately rejected with HTTP 403 `FORBIDDEN`.
3. **Atomic Quota Reservation:** `MediaService.authorizeDownload()` executes within a serial transaction (`SELECT ... FOR UPDATE` on `orders`). It evaluates remaining quota according to `download_limit_type`:
   - `UNIQUE_TITLES`: Computes `COUNT(DISTINCT content_id)` across attempts. Once a movie/episode is counted, re-downloading that specific title under the same order does not consume additional quota slots.
   - `DOWNLOAD_ACTIONS`: Counts total attempted download actions.
4. **24-Hour Failure Grace Window:** Customers reporting delivery failure via `POST /api/v1/download/report-delivery` (`status = 'FAILED'`) receive a 24-hour retry window (`retry_grace_expires_at`). Retries re-issue a valid download token and URL without consuming an additional quota slot.
5. **Short-Lived Signed Delivery:** Presigned AWS SigV4 GET URLs are generated via `CloudflareR2StorageService.generatePresignedDownloadUrl()` pointing to Cloudflare R2 object storage with a strict **900-second (15-minute) TTL**.
6. **Device Registration Binding:** Customer accounts operate under subscription-derived device limits (ADR-038: `MAX(device_limit)` across active catalog subscriptions; default = 2). Registered devices are tracked in `customer_devices`.

### 2.2 Current Security Boundaries
As explicitly specified in `docs/architecture/05-MEDIA-ARCHITECTURE-AND-DELIVERY.md` (Line 64):
> *"Security Boundaries: Media tokens are cryptographically protected HMAC-SHA256 JWTs, expire quickly, and are scoped to a specific media resource and customer. Token values are never logged. Signed short-lived access is an authorization mechanism, not DRM and not a guarantee against copying or piracy."*

The current architecture provides **transport and origin access authorization**, but **zero post-download file protection**.

---

## 3. Comprehensive DRM Threat Model

A rigorous threat assessment identifies six primary threat vectors applicable to offline media downloads:

| Threat Vector | Description | Exploit Mechanism | Likelihood | Impact on Business | Mitigation in Current System |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **T-01: URL Leeching / Sharing** | Download link shared with unauthorized users before expiration. | Forwarding SigV4 presigned URL to unauthenticated third parties. | High | Medium | **Mitigated:** 900-second TTL limits attack window; downloads are recorded against customer quota. |
| **T-02: Plaintext File Redistribution** | Downloaded media file shared via USB, Bluetooth, or file-sharing sites. | User accesses local filesystem (e.g., `Downloads/movie.mp4`) and copies plaintext file. | Critical | Severe | **Unmitigated:** Delivered MP4 is standard unencrypted MPEG-4 Part 14. Zero barrier to file copying. |
| **T-03: Device Spoofing** | User registers unauthorized or automated clients beyond device caps. | Modifying User-Agent, Client IP, or spoofing device fingerprint headers. | Medium | Moderate | **Partially Mitigated:** Server-side device limits serialize via advisory locks; device sessions can be revoked by customer. |
| **T-04: Key Extraction (Client-Side)** | Extracting decryption keys if custom symmetric encryption is used. | Inspecting client memory, DevTools breakpoints, or hooking JS crypto APIs. | High | Severe | **N/A (Current):** No client-side encryption currently deployed. Relevant if custom web crypto container is attempted. |
| **T-05: Offline Clock Tampering** | Manipulating local device clock to extend offline viewing validity. | Rolling back OS system date/time while offline to prevent license expiration. | High | Moderate | **Unmitigated:** Plain MP4 has no playback expiration mechanism; plays indefinitely once stored locally. |
| **T-06: Screen Recording & Frame Scraping** | Capturing playing media using screen grabbers or HDMI capture cards. | Software screen capture (OBS, QuickTime) or hardware HDMI capture splitters. | High | Moderate | **Inherent Media Risk:** Standard DRM blocks OS-level screen capture; unencrypted media permits trivial capture. |

---

## 4. Architectural Alternatives Evaluation

We evaluate four architectural paths for offline content delivery and protection:

### Option A: Authenticated Signed URLs + Device Accounting (Status Quo / Baseline)
- **Mechanism:** Presigned Cloudflare R2 SigV4 URLs (900s TTL) + server-side atomic quota (`UNIQUE_TITLES`) + device limits (POD-07) + Terms of Service legal deterrent.
- **Security Guarantee:** Guarantees only entitled, authenticated customers can initiate downloads. Protects cloud storage bandwidth. Does not protect file post-download.
- **Platform Compatibility:** 100% universal (Web browsers, iOS Safari, Android Chrome, Desktop, Smart TVs).
- **Implementation Cost:** 0 hours (Already implemented and accepted in Phase 7 Stage 2).
- **Operational Cost:** Zero additional licensing fees (Cloudflare R2 egress is $0.00).
- **User Experience:** Instant, friction-free download directly to browser download manager; native video player playback offline.
- **Limitations:** Zero DRM. Raw MP4 files can be freely shared once downloaded.

### Option B: Application-Layer Encrypted Containers (Proprietary / Encrypted Cache)
- **Mechanism:** Media files encrypted with AES-128-GCM at rest in R2; client mobile/desktop app downloads encrypted blob and decrypts chunks into memory during playback using an ephemeral key fetched online.
- **Security Guarantee:** Prevents casual double-click playback in VLC or file sharing by non-technical users.
- **Platform Compatibility:** Requires custom client application (Flutter/React Native mobile app or Electron desktop). Infeasible in standard web browsers due to browser storage limits (IndexedDB quota) and trivial key extraction via Web DevTools.
- **Implementation Cost:** 120–160 engineering hours (Custom packager, client decryptor, offline license cache).
- **Operational Cost:** Minimal infrastructure overhead; key management database load.
- **User Experience:** Media playable only inside the GIFTEDproMovies proprietary player app.
- **Limitations:** Vulnerable to memory dumping and reverse engineering on rooted/jailbroken devices. Does not satisfy major Hollywood studio DRM requirements.

### Option C: Industry-Standard Multi-DRM (Google Widevine, Apple FairPlay, Microsoft PlayReady)
- **Mechanism:** Common Encryption (CENC) using ISO/IEC 23001-7. Media is packaged as encrypted DASH/CENC (Widevine/PlayReady) and HLS (FairPlay). Offline licenses are issued with hardware-backed Content Decryption Modules (CDM) enforcing exact offline expiration timestamps and persistent license storage.
- **Security Guarantee:** Highest commercial security. Hardware-protected decoders (Widevine L1, Apple FairPlay), hardware HDMI HDCP enforcement, screen-recording blanking, tamper-proof offline license clocks.
- **Platform Compatibility:** 
  - Android: Widevine Modular (L1/L3).
  - iOS/iPadOS/macOS: Apple FairPlay Streaming (FPS).
  - Windows/Edge: Microsoft PlayReady / Widevine.
  - Web Browsers: Highly restrictive for offline downloads (ServiceWorker + IndexedDB + CDM persistent-license support is inconsistent across Chrome, Safari, and Firefox).
- **Implementation Cost:** 240–360 engineering hours + specialized third-party DRM license server integration (e.g., EZDRM, BuyDRM, Axinom) or Cloudflare Stream DRM.
- **Operational Cost:** High. Per-license issuance fees ($0.01 – $0.05 per license request), annual Apple FairPlay Deployment Server certificates ($99/yr Apple Developer Program + legal agreement), DRM provider monthly SaaS minimums ($500 – $2,500/month).
- **User Experience:** Seamless in native apps; complex key renewals and offline expiry prompts.
- **Limitations:** Extreme complexity; heavy operational dependencies; web browser offline support is fragile.

### Option D: Server-Side Forensic Dynamic Watermarking
- **Mechanism:** Dynamically injecting visible semi-transparent customer identification (User ID, Phone Number, Order UUID) or steganographic invisible watermarks into video frames during ingestion/delivery.
- **Security Guarantee:** Does not prevent copying, but eliminates anonymity. Any file leaked to social media or piracy networks can be traced to the exact customer account.
- **Platform Compatibility:** 100% universal (media plays in any player).
- **Implementation Cost:** 80–120 engineering hours if integrated with transcoding pipeline.
- **Operational Cost:** Substantial compute cost if rendered per-customer; incompatible with pre-transcoded static R2 downloads without edge compute.
- **User Experience:** Minor visual distraction if visible watermark is used.

---

## 5. Architectural Comparison Matrix

| Evaluation Dimension | Option A: Signed R2 URLs (Current) | Option B: App-Layer AES Containers | Option C: Multi-DRM (Widevine/FairPlay) | Option D: Watermarking |
| :--- | :--- | :--- | :--- | :--- |
| **Protection Level** | Transport / Storage access only | Obfuscation against casual users | Studio-grade hardware cryptographic DRM | Deterrent / Traceability |
| **Post-Download Copying** | Possible | Prevented for non-technical users | Cryptographically prevented by CDM | Possible, but traceable to user |
| **Web Browser Support** | Complete & Universal | Infeasible / Highly Fragile | Streaming only (Offline Web CDM fragile) | Complete & Universal |
| **Mobile App Support** | Native file download | Native custom player | Native ExoPlayer / AVPlayer DRM | Native file download |
| **Studio Contract Compliance** | Indie / Local content only | Typically rejected by major studios | Accepted by all major studios | Supplemental only |
| **Third-Party SaaS Cost** | $0.00 | $0.00 | $500 – $2,500 / month + per-license | Compute / worker cost |
| **Time to Market** | Immediate (V1 Ready) | 4–6 weeks (Requires Mobile Apps) | 8–12 weeks (Requires Mobile Apps & DRM SaaS) | 3–4 weeks |
| **Lock-in Risk** | Zero (Standard Cloudflare R2 / S3) | Low (Proprietary) | High (DRM Key Broker / Certificate Authorities) | Low |

---

## 6. Tanzanian & East African Market Context

1. **Market Reality:** In Tanzania, broadband penetration is heavily mobile-data driven (Tigo, Vodacom, Airtel, Halotel). Customers purchase bundle packages (MB/GB) and download movies at night or over Wi-Fi hotspots for offline consumption.
2. **Content Portfolio:** GIFTEDproMovies specializes in localized cinema featuring Translating DJs (voice artists who interpret and localize dialogue). Content agreements are primarily negotiated directly with local producers, DJ talent, and regional distributors.
3. **Hardware Ecosystem:** The vast majority of target users access the service via mid-range Android smartphones and mobile web browsers. Requiring proprietary DRM software with strict Widevine L1 requirements can lead to playback failures on uncertified or budget devices (falling back to low-resolution L3 or failing entirely).
4. **V1 Customer Expectation:** Customers expect downloaded MP4 videos to play reliably on their phones, even in poor connectivity conditions, without complex cryptographic handshake failures or license refresh timeouts.

---

## 7. Product Owner Decision Gate (Section 7.4)

In compliance with **Mission Section 7.4**, the engineering team **STOPS all DRM implementation** and presents the following structured decision to the Product Owner:

### Decision Scope Questions:
1. **Catalog Scope:** Does DRM protection apply to:
   - **Scope 1 (Universal):** All downloadable movies and episodes on GIFTEDproMovies3?
   - **Scope 2 (Selective/Tiered):** Only specific premium or international studio-licensed titles that contractually mandate DRM, while local Tanzanian and DJ-translated cinema remains on Option A?
   - **Scope 3 (V1 Exemption):** V1 operates entirely under **Option A (Signed Cloudflare R2 URLs + Atomic Quota + Device Caps + Legal Terms)**, deferring hardware Multi-DRM (Option C) to V2 alongside the native iOS/Android mobile applications?

### Architectural Recommendation:
**The Principal Architecture Team strongly recommends SCOPE 3 for V1:**
- **Rationale:** 
  1. Phase 7 Model B is already fully implemented, tested with 586 passing tests, and formally accepted.
  2. GIFTEDproMovies3 V1 is a web-first application (Next.js frontend). True offline Multi-DRM (Widevine/FairPlay) cannot be reliably delivered or stored offline in web browsers without native mobile application containers.
  3. Option A provides robust commercial protection against unauthorized access: downloads require active paid subscriptions, are strictly capped by quota (`UNIQUE_TITLES`), enforce registered device caps, and use short-lived 900s SigV4 URLs.
  4. Preserves zero egress bandwidth costs via Cloudflare R2 and avoids premature monthly DRM SaaS overhead.
  5. Multi-DRM (Option C) should be formally scheduled for Phase 9 / V2 in conjunction with the official Flutter/React Native mobile app rollout.

### Formal Status:
- **ADR-018 Status:** FORMALLY RECORDED AS ANALYZED; SCOPE DECISION PENDING PRODUCT OWNER DETERMINATION.
- **Implementation State:** ZERO UNAPPROVED DRM CODE ADDED. CODEBASE PRESERVED IN STABLE STATE.
