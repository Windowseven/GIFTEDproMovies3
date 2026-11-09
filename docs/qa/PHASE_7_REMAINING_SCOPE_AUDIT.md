# PHASE 7 REMAINING SCOPE AUDIT
**Reference:** GPM-PHASE7-AUDIT-SCOPE  
**Date:** 2026-11-03  
**Status:** COMPLETE (GATE A — READ-ONLY DISCOVERY)  
**Authority:** Product Owner Directive (POD-06 Option B / POD-07)

---

## 1. Executive Summary

Phase 7 Stage 1 established a hardened, verified backend for Customer Downloads, Commercial Access Evaluation, Recognized Device Limits (derived from subscription tiers per POD-07), and Cloudflare R2 presigned download authorization.

This audit evaluates the **current state of the frontend, backend integration, and end-to-end customer journey** to define the exact remaining scope for Phase 7 Stage 2 completion.

The primary finding of this audit is:
> **The backend APIs are fully operational, tested, and protected against concurrency/privilege escalation, but the frontend user experience remains disconnected and relies entirely on client-side mocks, localStorage authentication, and a synthetic browser Blob generator.**

Phase 7 Stage 2 must bridge this gap by replacing mock data and synthetic download logic with real Fastify backend integration while strictly respecting Phase 8 boundaries (customer streaming deferred with 503 `STREAMING_COMING_SOON`).

---

## 2. Invariant Baseline Verification

The following critical project invariants were verified in the clean working tree (commit `96ed20caa49e0f39bde3c0e2f4a4e51d51664e7a`):

1. **Domain Setup & Configuration Invariant:**
   - File: `docs/architecture/19_DOMAIN SETUP AND CONFIGURATION`
   - SHA-256: `12ed1bc50c1e9b141ead7269dc0257f99043cbe4e6302414b94efa9f5693f5bd` (100% MATCH).
2. **Database Migration Invariant:**
   - Migrations `0000_init.sql` through `0013_phase6_7_supersession_and_downloads.sql` are present and immutable.
   - Migration count: Exactly 14 migration files.
   - Migration `0014`: Zero. No schema migrations are required or permitted for Stage 2.
3. **Customer Streaming Lockout Invariant:**
   - Route: `/api/v1/playback/stream/:contentId`
   - Gate: `CUSTOMER_STREAMING_ENABLED=false` returns HTTP 503 `STREAMING_COMING_SOON`.
   - Streaming remains deferred to Phase 8.

---

## 3. Component-by-Component Scope Analysis

### 3.1 Backend API Layer (Phase 7 Stage 1 Status: Accepted)
| Endpoint | Method | Service / Controller | Stage 1 Status | Stage 2 Action |
| :--- | :--- | :--- | :--- | :--- |
| `/api/v1/download/authorize` | POST | `DownloadController` / `DownloadService` | Fully implemented, concurrency tested, R2 presigning active | Connect frontend client |
| `/api/v1/download/report-delivery` | POST | `DownloadController` / `DownloadService` | Fully implemented, verifies attempt ownership | Connect frontend client |
| `/api/v1/download/history` | GET | `DownloadController` / `DownloadService` | Offset pagination, customer isolated | Connect Library UI |
| `/api/v1/download/licenses` | GET | `DownloadController` / `DownloadService` | Lists active licenses + quota remaining | Connect Library UI |
| `/api/v1/commercial/me/library` | GET | `CommercialController` / `CommercialAccessService` | Lists active passes & entitlements | Connect Library UI |
| `/api/v1/commercial/me/access/:id` | GET | `CommercialController` / `CommercialAccessService` | Evaluates entitlement decision | Connect Movie Detail UI |
| `/api/v1/devices` | GET | `DeviceController` / `DeviceService` | Lists active recognized devices | Expose summary limit metadata; Connect UI |
| `/api/v1/devices/:id` | DELETE | `DeviceController` / `DeviceService` | Revokes device & terminates sessions | Connect Library/Settings UI |

### 3.2 Frontend Movie Detail & Download Experience (`src/app/movies/[slug]/page.tsx`)
- **Current State:**
  - Content metadata, pricing, and media assets are read from static mock `src/data/mock/customerData.ts`.
  - The "Download" action executes lines 84-95:
    ```typescript
    const blob = new Blob([`GIFTEDproMovies Offline Package...`], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    // triggers browser download of synthetic text file
    ```
- **Remaining Stage 2 Scope:**
  - Connect real access decision check (`GET /api/v1/commercial/me/access/:contentId`).
  - Wire download button to `POST /api/v1/download/authorize`.
  - Trigger real browser download via the returned secure Cloudflare R2 presigned URL.
  - Automatically report delivery outcome via `POST /api/v1/download/report-delivery` (with fallback handling if user closes tab/finishes).
  - Provide clear UI feedback: Loading state, Quota exceeded warning (403 `DOWNLOAD_LIMIT_EXCEEDED`), Device limit exceeded warning (403 `DEVICE_LIMIT_EXCEEDED`), Expired entitlement warning.

### 3.3 Frontend Customer Library Integration (`src/app/library/page.tsx`)
- **Current State:**
  - Reads exclusively from `src/context/CustomerContext.tsx` and `src/data/mock/customerData.ts`.
  - **Tab 1: "Continue Watching"** displays mock data (`mockContinueWatching`). Since video playback and resume progress belong to Phase 8, this tab must either display a clear "Streaming playback coming in Phase 8" empty state or reflect downloaded offline content ready for viewing.
  - **Tab 2: "Active Passes & Entitlements"** displays `mockCustomerEntitlements`. Never calls backend.
  - **Tab 3: "Offline Downloads"** displays a single hardcoded card: *"You have 1 active offline download license (John Wick: Chapter 4)"*.
- **Remaining Stage 2 Scope:**
  - Connect Tab 2 to `GET /api/v1/commercial/me/library` to display real active entitlements, validity windows, and license types.
  - Connect Tab 3 to `GET /api/v1/download/licenses` (active licenses & remaining quota) and `GET /api/v1/download/history` (download history audit).
  - Add real download status indicators (completed, pending, failed).

### 3.4 Recognized Device Management UI
- **Current State:**
  - Frontend has **zero UI** for customer device management. There is no place for a user to see what devices are registered to their account, nor can they revoke an old device.
- **Remaining Stage 2 Scope:**
  - Add a dedicated "Manage Devices" section inside `/library` (or `/account/devices`).
  - Display registered devices: Device name, device type, last active timestamp, current device indicator (`isCurrentDevice`).
  - Display effective device limit and remaining capacity (derived from active subscription per POD-07).
  - Implement "Remove Device" action with confirmation dialog, calling `DELETE /api/v1/devices/:id`.

### 3.5 Authentication & Session Bridge
- **Current State:**
  - Frontend `src/services/authRepository.ts` stores user accounts in `localStorage`.
  - Backend uses Fastify session cookies (`gifted_session`, HttpOnly, Signed, SameSite).
- **Remaining Stage 2 Scope:**
  - Integrate frontend auth state with backend session endpoints (`/api/v1/auth/login`, `/me`, `/logout`).
  - Ensure Next.js API client passes `credentials: 'include'` to exchange cookies with the Fastify backend on port 3001 (or configure Next.js route rewrite `/api/:path* -> http://127.0.0.1:3001/api/:path*`).

---

## 4. Scope Boundaries & Exclusions
1. **No Customer Streaming:** All video streaming endpoints must remain gated behind 503 `STREAMING_COMING_SOON`.
2. **No Schema Migrations:** No migration `0014` will be created. All tables (`customer_devices`, `content_download_licenses`, `content_download_attempts`, `commercial_entitlements`) are complete.
3. **No Unauthenticated Content Leaks:** Cloudflare R2 presigned URLs must strictly expire after 900 seconds and be issued solely upon authorization.
