# PHASE 7 REMAINING GAP REGISTER
**Reference:** GPM-PHASE7-GAP-REGISTER  
**Date:** 2026-11-03  
**Status:** COMPLETE (GATE A — READ-ONLY DISCOVERY)  
**Authority:** Product Owner Directive (POD-06 Option B / POD-07)

---

## 1. Gap Classification & Severity Framework

Gaps are categorized by area and assigned severity ratings:
- **BLOCKER:** Must be resolved for Phase 7 acceptance; directly impacts core mission deliverables or security.
- **MAJOR:** Significant discrepancy between user experience and system state; required for end-to-end flow.
- **MINOR:** Cosmetic or edge-case enhancement; recommended for optimal UX polish.
- **DEFERRED (PHASE 8):** Explicitly out of scope for Phase 7 (e.g., video streaming playback, resume position).

---

## 2. Identified Gaps

### GAP-01: Synthetic Browser Blob Generator on Movie Detail Page
- **Area:** Frontend / Customer Download Experience
- **Severity:** BLOCKER
- **File:** `src/app/movies/[slug]/page.tsx` (lines 84-95)
- **Current Behavior:** The "Download Offline" button generates a synthetic `text/plain` or dummy `video/mp4` client-side blob with text `"GIFTEDproMovies Offline Package: ${movie.title}..."` and downloads it directly in the browser. It never communicates with the backend download authorization API.
- **Target Behavior:** 
  1. Call `POST /api/v1/download/authorize` with customer session credentials, content ID, and device metadata.
  2. Receive the authenticated, 900-second expiring Cloudflare R2 presigned URL.
  3. Initiate download of the real media file from Cloudflare R2.
  4. Automatically report delivery completion or failure to `POST /api/v1/download/report-delivery`.
- **Resolution Plan:** Replace synthetic blob logic with a unified `useDownloadManager` hook integrating real API endpoints and user-facing status indicators.

---

### GAP-02: Disconnected Customer Library & Hardcoded Mock Cards
- **Area:** Frontend / Customer Library
- **Severity:** BLOCKER
- **File:** `src/app/library/page.tsx`
- **Current Behavior:** 
  - "Active Passes & Entitlements" tab reads from static mock array `mockCustomerEntitlements`.
  - "Offline Downloads" tab renders a single hardcoded card: `"You have 1 active offline download license (John Wick: Chapter 4)"`.
  - "Continue Watching" tab renders static mock watch progress.
- **Target Behavior:**
  - Tab 1 ("Offline Downloads / Downloaded Content"): Connect to `GET /api/v1/download/licenses` (displaying active download-eligible licenses, quota remaining e.g., "3 of 5 downloads left", validity expiration) and `GET /api/v1/download/history`.
  - Tab 2 ("Active Passes & Entitlements"): Connect to `GET /api/v1/commercial/me/library` (displaying active rentals, purchases, and subscriptions).
  - Tab 3 ("Continue Watching"): Provide clean Phase 8 notice indicating streaming playback is coming in Phase 8, highlighting offline downloads as the Phase 7 primary viewing mode.
- **Resolution Plan:** Create real API client hooks (`useCustomerLibrary`, `useDownloadLicenses`) to populate `/library` with live database state.

---

### GAP-03: Complete Absence of Customer-Facing Device Management UI
- **Area:** Frontend / Device Management & Limits
- **Severity:** BLOCKER
- **File:** Missing in `src/app/library/page.tsx` and settings views.
- **Current Behavior:** 
  - Backend implements `GET /api/v1/devices` and `DELETE /api/v1/devices/:id` with POD-07 subscription-based device limits.
  - Frontend has zero interface for customers to view their registered devices, see their plan limit (e.g. "2 of 2 devices in use"), or remove an old device.
  - When a customer hits `DEVICE_LIMIT_EXCEEDED`, they have no UI mechanism to unregister a device.
- **Target Behavior:**
  - Introduce a "Manage Devices" section inside `/library` (or accessible via account menu).
  - Render list of registered devices showing device name, platform/type, last active date, and an indicator for the current active device.
  - Show the effective device limit and remaining capacity derived from the active subscription per POD-07.
  - Provide a "Remove" button with confirmation modal that calls `DELETE /api/v1/devices/:id` and revokes associated sessions.
- **Resolution Plan:** Build `<CustomerDeviceManager />` component and integrate into `/library`.

---

### GAP-04: Client Authentication Mock vs. Fastify HttpOnly Cookie Session
- **Area:** Architecture / Session & Auth
- **Severity:** MAJOR
- **File:** `src/services/authRepository.ts`, `src/context/AuthContext.tsx`
- **Current Behavior:** Frontend auth operates entirely on `localStorage` with mock accounts. Backend expects signed, HttpOnly session cookie `gifted_session` on port 3001. Cross-origin fetch requests without proper credential forwarding or reverse proxy will result in `401 Unauthorized`.
- **Target Behavior:**
  - Provide seamless proxying/forwarding: Configure Next.js rewrites in `next.config.ts` (e.g., `/api/:path* -> http://127.0.0.1:3001/api/:path*`) or configure API client with `credentials: 'include'` and environment-based baseURL.
  - Bridge `AuthContext` with `/api/v1/auth/login`, `/me`, and `/logout`.
- **Resolution Plan:** Update `next.config.ts` to proxy `/api/*` to the Fastify backend, and update the API client layer to support authenticated session requests.

---

### GAP-05: Backend `GET /api/v1/devices` Summary Limit Metadata
- **Area:** Backend API Polish
- **Severity:** MINOR
- **File:** `backend/src/controllers/DeviceController.ts`, `backend/src/services/DeviceService.ts`
- **Current Behavior:** `GET /api/v1/devices` currently returns `{ devices: [...] }`. While functional, the client has to infer the device limit or make an additional call.
- **Target Behavior:** Return `{ devices: [...], effectiveLimit: number, currentCount: number, remainingSlots: number }` using `CommercialAccessService.getEffectiveDeviceLimit(customerId)`.
- **Resolution Plan:** Enhance `DeviceController.listCustomerDevices` to include limit metadata in the JSON response.

---

### GAP-06: Customer Video Streaming Deferred (Phase 8 Boundary)
- **Area:** Architectural Boundary
- **Severity:** DEFERRED (PHASE 8)
- **Current State:** Backend route `/api/v1/playback/stream/:contentId` is gated with `CUSTOMER_STREAMING_ENABLED=false` returning HTTP 503 `STREAMING_COMING_SOON`.
- **Target Behavior:** Must be strictly preserved. Frontend movie player must gracefully inform users that streaming is scheduled for Phase 8, steering users to the offline download feature.
- **Resolution Plan:** Preserve 503 response; ensure frontend displays clear informational banner rather than raw HTTP error.
