# GIFTEDproMovies3 — Cloudflare R2 Media Delivery Architecture & Known Limitations

**Document Reference:** `docs/qa/R2_MEDIA_DELIVERY_KNOWN_LIMITATIONS.md`  
**Classification:** Engineering Architecture & Operational Documentation  
**Status:** Active / Authoritative  
**Phase:** Phase 6.B Media Delivery Verification

---

## 1. Executive Summary

This document provides architectural clarity regarding media storage and delivery within GIFTEDproMovies3 following the complete elimination of media simulation (`LocalSimulatorMediaAdapter`) and the consolidation of storage operations onto Cloudflare R2 (`R2MediaStorageAdapter`).

It documents the operational behavior of media delivery, explains the distinct mechanisms for customer downloads versus video streaming, details why customer streaming is server-locked behind HTTP 503 `STREAMING_COMING_SOON`, and outlines the Phase 8 roadmap for Cloudflare Stream / Workers edge delivery.

---

## 2. Media Delivery Architecture Overview

The application utilizes `R2MediaStorageAdapter` implementing `MediaStoragePort` for all media persistence operations. All media assets are stored in private Cloudflare R2 buckets. Direct public read access to the bucket is prohibited.

```
                           +-------------------------------------+
                           |         GIFTEDproMovies3 API        |
                           +-------------------------------------+
                                     /                 \
                 Customer Downloads /                   \ Staff Preview
                                   v                     v
                generatePresignedDownloadUrl()     getPlaybackUrl()
                                   |                     |
                AWS SigV4 Presigned GET URL       Raw Object URL + JWT
                (900s TTL, Private R2 Bucket)     (Staff Preview Token, 300s TTL)
                                   |                     |
                                   v                     v
                       Direct Fetch from Cloudflare R2 Storage
```

---

## 3. Customer Downloads vs. Media Playback

### 3.1 Customer Downloads (Active & Fully Operational)
- **Method:** `mediaStorage.generatePresignedDownloadUrl({ storageKey, expiresInSeconds: 900 })`
- **Protocol:** AWS Signature Version 4 (SigV4) presigned URL targeting Cloudflare R2 S3-compatible API.
- **Access Control:** Server-enforced via `DownloadAuthorizeDto`:
  - Active commercial entitlement check via `CommercialAccessService.canAccess()`.
  - Access plan download capability check (`download_limit > 0`).
  - Strict atomic quota enforcement (either `UNIQUE_TITLES` or `DOWNLOAD_ACTIONS`).
  - Row locking on `orders` to serialize concurrent requests and prevent race conditions.
  - 24-hour retry grace period on failed transfers (`download_attempts.retry_grace_expires_at`).
- **Delivery Mechanism:** The client issues a direct HTTP `GET` to Cloudflare R2 using the presigned URL. R2 validates the cryptographic SigV4 parameters (`X-Amz-Signature`, `X-Amz-Expires`, `X-Amz-Date`, `X-Amz-Credential`).
- **Integrity:** Byte-for-byte fidelity confirmed via direct cryptographic SHA-256 matching.
- **Range Support:** Full HTTP 206 Partial Content support for resumable chunked downloads.

### 3.2 Staff Media Preview (Active for Internal Operators)
- **Method:** `POST /api/v1/staff/media/:editionId/preview-token`
- **RBAC & Capabilities:** Restricted strictly to `media_team` and `admin` roles possessing the explicit `MEDIA_PREVIEW` capability (`user_capabilities`).
- **Token Generation:** `playbackSigner.generatePlaybackToken()` generates an HMAC-SHA256 signed playback JWT with 300-second (5-minute) TTL.
- **URL Generation:** Uses `mediaStorage.getPlaybackUrl(key)`, appending the signed token: `${basePlaybackUrl}?token=${previewToken}`.
- **Purpose:** Internal inspection, QA review, and operator pre-release verification.

---

## 4. Known Architectural Limitation: `getPlaybackUrl()` and Customer Streaming

### 4.1 Implementation of `getPlaybackUrl()`
`R2MediaStorageAdapter.getPlaybackUrl(key)` generates an object URL with the format:
```
${this.endpoint}/${this.bucketName}/${key}
```

### 4.2 Why Customer Downloads Do Not Use `getPlaybackUrl()`
Cloudflare R2 is configured as a **private** bucket without public read access. An unsigned HTTP GET request to `${endpoint}/${bucketName}/${key}` returns HTTP 400 Bad Request or HTTP 403 Forbidden from Cloudflare R2.

Customer downloads bypass `getPlaybackUrl()` entirely. Instead, customer downloads call `generatePresignedDownloadUrl()`, which issues a time-bounded (900s), tamper-resistant AWS SigV4 signed URL that Cloudflare R2 authenticates natively at the storage layer.

### 4.3 Why Customer Streaming Is Server-Locked (HTTP 503)
Video streaming (HLS/DASH) requires segmented media playlists (`.m3u8`, `.mpd`) and segment chunks (`.ts`, `.m4s`). Cloudflare R2 is a pure object store; it does not natively inspect or validate custom JWT tokens passed in query strings (`?token=...`) on raw bucket requests.

To protect system security and prevent leaking raw storage URLs or exposing private storage keys to end-users without an edge verification layer:
1. **Server-Enforced Lockout:** In `backend/src/modules/media/media.service.ts`, `authorizePlayback()` immediately evaluates `environment.customerStreamingEnabled`.
2. **Default State:** `CUSTOMER_STREAMING_ENABLED=false` by default in all environments.
3. **Response:** Throws HTTP 503 `ServiceUnavailableException` with:
   ```json
   {
     "statusCode": 503,
     "error": "Service Unavailable",
     "message": "STREAMING_COMING_SOON: Customer streaming playback is currently unavailable.",
     "code": "STREAMING_COMING_SOON"
   }
   ```
4. **Safety Guarantee:** No customer can initiate unauthenticated or broken raw R2 streaming sessions.

---

## 5. Production Hostname & Endpoint Configuration Observations

1. **R2 Endpoint Format:** Cloudflare R2 S3 endpoints conform to `https://<account-id>.r2.cloudflarestorage.com`.
2. **Path vs Virtual-Hosted Style:** Direct PUT/GET requests issued via AWS SDK presigner utilize virtual-hosted bucket addressing (`https://<bucket-name>.<account-id>.r2.cloudflarestorage.com/<key>`) or path addressing depending on endpoint parameters. Both are supported and verified on Cloudflare R2 staging.
3. **Security Invariant:** All production R2 credentials (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_ACCOUNT_ID`) must remain strictly in secret managers / environment configurations and must never be exposed via client responses or logged in plaintext.

---

## 6. Roadmap: Phase 8 Streaming Architecture

To enable customer video streaming safely in Phase 8, the following architectural path is established:

```
[Customer Client] 
       │ 
       ▼ (HLS Playlist Request with Token)
[Cloudflare Edge Worker / Cloudflare Stream] 
       │ 
       ├─ Validates signed playback token at the edge
       ├─ Restricts access by IP / customer session / expiration
       ▼ (Authorized Segment Fetch)
[Cloudflare R2 Private Bucket / Stream Storage]
```

1. **Cloudflare Stream Integration:** Ingest and transcode master video files directly into Cloudflare Stream, leveraging built-in signed token playback.
2. **Cloudflare Worker Edge Gatekeeper:** Deploy a lightweight Cloudflare Worker in front of the private R2 media bucket to validate the backend HMAC-SHA256 signed playback tokens on every HLS playlist and segment request.
3. **Activation Criteria:** The `CUSTOMER_STREAMING_ENABLED` feature flag will only be set to `true` once the edge token verification layer is deployed and verified end-to-end.

---

## 7. Operational Verification Summary

The end-to-end operational verification suite (`backend/scripts/verify-e2e-media-delivery.mjs`) has definitively verified:
- Upload intent presigned URL generation and direct HTTP PUT upload to Cloudflare R2.
- Backend object verification via HeadObject and lifecycle transition to `ready`.
- Customer download authorization with SigV4 presigned download URL generation (900s TTL).
- Direct client HTTP GET download from Cloudflare R2 with exact byte-for-byte SHA-256 match.
- HTTP 206 Range request chunk retrieval.
- Delivery completion reporting (`COMPLETED`).
- 24-hour retry grace period without quota consumption.
- Comprehensive enforcement of all negative, quota, role, and adversarial security controls.
- Clean post-verification cloud object deletion and absence verification.
