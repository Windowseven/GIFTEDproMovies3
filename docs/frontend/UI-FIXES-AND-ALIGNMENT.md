# Frontend UI Fixes and Architecture Alignment

> **Status:** Tracking document for future frontend integration/alignment. This document records required alignment; it does not authorize or implement frontend changes.
> **Authority:** Accepted product decisions and `docs/architecture/01`–`16`.

## Purpose

Record frontend contradictions that must be addressed during a separately authorized frontend/backend integration pass. Preserve the existing frontend as product evidence, but treat mock repositories, local state, hardcoded values, and sample media/payment flows as non-authoritative implementation details. Backend responses and authorization decisions are authoritative.

## Required alignment

| Area | Required future UI behavior |
| --- | --- |
| Purchase authentication | Remove guest checkout paths. Require authenticated customer before any movie, episode, season, full-series, download, or subscription purchase. |
| Subscription renewal | Describe one-time/manual renewal. Do not imply automatic recurring billing. |
| Subscription benefits | Explain unlimited streaming only for eligible catalog content during active validity; downloads remain limited by the applicable configured policy. |
| Commercial values | Load prices, currency, subscription duration, eligibility, download limit/type, device limit, and concurrent-stream limit from backend/Admin-owned policy. Do not retain hardcoded commercial limits as authority. |
| Purchased subscription terms | Where shown, represent the terms captured for that purchase period. Later Admin plan edits do not rewrite existing subscription rights; manual renewal uses current terms. |
| Payment result | Treat frontend redirect/callback as informational. Show payment succeeded separately from access processing, access available, and fulfillment recovery required. Never require another payment solely because browser redirect or fulfillment processing failed. |
| Payment/download mock flows | Replace fake payment confirmation and fake media/download behavior during integration with backend/provider-mediated flows. |
| Notifications | Replace static/toast-only notification assumptions with backend-owned persistent in-app history/read state and confirmed email flows. Toasts remain transient feedback. |
| Authentication | Replace mock/local authentication with backend email/password, required email verification, separate email password recovery, and backend-authoritative session state. Reflect session expiry and reauthentication. |
| Session management | Support logout and logout-all; future active-session management must reflect independently revocable sessions and must not conflate sessions with devices or active streams. |
| Device management | Show recognized/registered devices separately from sessions and active streams. At device capacity require explicit removal/revocation; do not silently replace another device. Removing a device invalidates its sessions, not purchased entitlements. |
| Streaming limits | Show active playback devices/sessions where appropriate. Distinguish stream-limit errors from device-limit errors. Playback UI state such as `isPlaying` is not authorization. |
| Download quota | Display backend-reported quota and usage. Do not calculate or enforce quota in the UI. A click alone does not consume quota; backend-authorized protected download attempts use atomic `UNIQUE_TITLES` or `DOWNLOAD_ACTIONS` policy. |
| Media authorization | Request backend authorization for each streaming/download operation. Do not expose public media URLs or assume short-lived access is DRM/anti-copy protection. Streaming should permit normal seeking/resume Range requests during valid access. |
| Media Team pricing | Remove Media Team price-edit capability. Media Team may view commercial metadata only where authorized; pricing is Admin-only. |
| Taxonomy | Replace direct Media Team creation of canonical taxonomy with Media Team request → Admin review/approval, represented by persistent Admin notification. |
| Publishing permissions | Reflect member-specific publishing capability. A user without it prepares content for review; publication requires backend readiness validation at 100%. UI readiness is not authoritative. |
| Content readiness | Align the step-by-step wizard with fixed backend-defined, per-content-type readiness rules, including `NOT_APPLICABLE` where returned by backend. Publishing is revalidated server-side. |
| Content lifecycle | Distinguish unpublish, archive, delete, and exceptional access revocation. Unpublish/archive remove public/active catalog availability but preserve valid entitlements. Delete must not silently destroy commercial/audit history. |
| Access status | Do not equate “content unavailable” with “entitlement expired/revoked.” Show catalog status and customer access status as separate facts. Access revocation requires an authorized audited action and customer notification. |

## Implementation boundary

This list is for a future UI alignment task. It does not specify route paths, visual design, endpoint contracts, or additional notification triggers. Exact endpoint contracts are defined separately in ARCH-004; pending media/download/session/notification policies remain pending in ARCH-016. Do not invent download retry semantics, email templates, token lifetimes, or refund behavior in the UI.

## Authoritative Backend Finding & Integration Contract Register

This section tracks the backend remediation findings from `docs/qa/MASTER_REMEDIATION_CHECKLIST.md` that affect frontend capabilities. It establishes the verified HTTP contracts, authentication, authorization, error semantics, affected screens, and UI state expectations for subsequent frontend integration.

### Contract Status Legend
- **`VERIFIED CONTRACT`**: Implemented in backend, backed by passing automated integration test suites. Ready for frontend client consumption.
- **`TEST GAP`**: Implemented in backend code; requires live browser verification.
- **`PROPOSED / BLOCKED`**: Awaiting backend implementation or Product Owner governance decision. **Frontend integration must NOT proceed.**

---

### Finding 1: GPM-AUDIT-001 — Public Authentication Rate Limiting
- **Category:** Security, Authentication & Session Management
- **Contract Status:** `VERIFIED CONTRACT` (Test Suite: `backend/tests/rate-limiting.test.ts`, 11/11 pass)
- **Verified Endpoints & Limits:**
  - `POST /api/v1/auth/login` — 5 requests / 60 seconds per IP
  - `POST /api/v1/auth/register` — 5 requests / 60 seconds per IP
  - `POST /api/v1/auth/request-password-reset` — 3 requests / 15 minutes per IP
  - `POST /api/v1/auth/resend-verification` — 3 requests / 15 minutes per IP
  - `POST /api/v1/auth/reset-password` — 5 requests / 15 minutes per IP
  - `POST /api/v1/auth/change-password` — 5 requests / 60 seconds per user/IP
  - Global `/api/v1/*` — 100 requests / 60 seconds per IP
- **HTTP Response Semantics:**
  - Status: `429 Too Many Requests`
  - Headers: `Retry-After: <seconds>`, `x-ratelimit-limit`, `x-ratelimit-remaining`, `x-ratelimit-reset`
  - Body:
    ```json
    {
      "statusCode": 429,
      "error": "Too Many Requests",
      "message": "Rate limit exceeded. Try again in 42 seconds."
    }
    ```
- **Affected Frontend Components:**
  - `src/components/auth/LoginModal.tsx`
  - `src/components/auth/RegisterModal.tsx`
  - `src/components/auth/ForgotPasswordModal.tsx`
  - `src/components/auth/ResetPasswordModal.tsx`
  - `src/components/customer/SecurityTab.tsx`
- **Required UI States:**
  - *Loading:* Disable form submission, retain entered values, display loading spinner.
  - *Rate Limit Failure (429):* Parse `Retry-After` header or message; display amber warning banner: "Too many attempts. Please wait X seconds before retrying."; disable submit button with live countdown timer.
  - *Standard Error (400/401):* Show specific validation or credential rejection error message.
  - *Success:* Proceed to authenticated state or confirmation step.

---

### Finding 2: GPM-AUDIT-009 — Customer Catalog Discovery, Browsing & Search
- **Category:** Customer Catalog & Discovery
- **Contract Status:** `VERIFIED CONTRACT` (Test Suite: `backend/tests/customer-catalog.integration.test.ts`, 10/10 pass)
- **Verified Endpoints:**
  1. `GET /api/v1/catalog/titles`
     - Query Parameters: `cursor` (base64url keyset), `limit` (default 20, max 50), `kind` (`movie` | `series`), `categoryId` (UUID), `countryId` (UUID), `djProfileId` (UUID)
     - Auth: Public (no session required)
     - Invariants: Returns ONLY `status = 'published'` and `is_deleted = false`.
     - Response:
       ```json
       {
         "items": [
           {
             "id": "uuid",
             "codeId": "string",
             "contentType": "movie" | "series",
             "title": "string",
             "originalTitle": "string | null",
             "slug": "string",
             "releaseYear": 2024,
             "description": "string | null",
             "posterUrl": "string | null",
             "backdropUrl": "string | null",
             "trailerUrl": "string | null",
             "durationMinutes": 120,
             "publishedAt": "2026-10-25T12:00:00.000Z",
             "categories": [{ "id": "uuid", "name": "Action", "slug": "action" }],
             "countries": [{ "id": "uuid", "code": "TZ", "name": "Tanzania", "flagEmoji": "🇹🇿" }]
           }
         ],
         "nextCursor": "string | null",
         "hasMore": false
       }
       ```
  2. `GET /api/v1/catalog/titles/:slug`
     - Params: `slug` (string)
     - Auth: Public
     - Response (Movie): Includes `editions: [{ id, isDefault, dj: { id, stageName, slug, avatarUrl } }]`. Strictly excludes internal storage IDs, unready editions, and review diagnostics.
     - Response (Series): Includes `seasons: [{ id, seasonNumber, episodes: [{ id, episodeNumber, title, durationMinutes }] }]`.
     - Response (404): `{ "statusCode": 404, "error": "Not Found", "message": "Content not found" }`.
  3. `GET /api/v1/catalog/taxonomies`
     - Auth: Public
     - Response: `{ "categories": [...], "countries": [...], "voiceArtists": [...] }`.
  4. `GET /api/v1/catalog/search?q=...`
     - Query: `q` (string, min 1 char), `limit` (default 20, max 50), `cursor` (string)
     - Auth: Public
     - Backed by PostgreSQL full-text search (`ts_rank` over title and synopsis).
- **Affected Frontend Screens & Components:**
  - `src/app/page.tsx` (Hero showcase, trending carousel, new releases)
  - `src/app/movies/page.tsx`, `src/app/series/page.tsx` (Catalog grid & filtering)
  - `src/app/movies/[slug]/page.tsx`, `src/app/series/[slug]/page.tsx` (Detail views)
  - `src/app/categories/page.tsx`, `src/app/countries/page.tsx`, `src/app/djs/page.tsx`
  - `src/components/common/GlobalSearchModal.tsx`
- **Required UI States:**
  - *Loading:* Responsive skeleton cards with aspect-ratio matching (16:9 for backdrops, 2:3 for posters).
  - *Empty:* Centered illustration + "No titles found matching your selection" + "Reset Filters" action.
  - *Success:* Responsive grid; infinite scroll or paginated "Load More" consuming `nextCursor`.
  - *Error:* Non-blocking error toast or retry button.

---

### Finding 3: GPM-AUDIT-014 — Authenticated In-Session Password Change
- **Category:** Security, Authentication & Session Management
- **Contract Status:** `VERIFIED CONTRACT` (Test Suite: `backend/tests/password-change.integration.test.ts`, 9/9 pass)
- **Verified Endpoint:** `POST /api/v1/auth/change-password`
  - Auth: Any authenticated role (`customer`, `media_team`, `admin`) via `gifted_session` cookie.
  - Headers: Requires `Origin` header matching CORS whitelist.
  - Request Body:
    ```json
    {
      "currentPassword": "CurrentPassword123!",
      "newPassword": "NewStrongPassword456!"
    }
    ```
  - Validation Rules: `newPassword` requires min 8, max 128 chars, uppercase, lowercase, number. Cannot be identical to current password.
  - Response (200 OK):
    ```json
    {
      "message": "Password has been successfully changed"
    }
    ```
  - Cookie Behavior: Issues new rotated `gifted_session` cookie (`HttpOnly`, `SameSite=Lax`, `Max-Age=2592000`). All other concurrent sessions for the user are immediately revoked in the database.
  - Error Responses:
    - 400 Bad Request: Weak password, same password, or OAuth-only account (`passwordHash === null`).
    - 401 Unauthorized: Current password verification failed.
    - 403 Forbidden: Invalid or untrusted `Origin` header.
    - 429 Too Many Requests: Rate limit exceeded (5 requests/minute).
- **Affected Frontend Components:**
  - `src/app/account/security/page.tsx` / `src/components/customer/SecurityTab.tsx`
- **Required UI States:**
  - *Loading:* Button disabled with loading spinner.
  - *Success:* Form cleared, green success alert: "Password changed successfully. All other devices have been logged out."
  - *Failure (401):* Field-level error: "The current password you entered is incorrect."
  - *Failure (400):* Inline validation list displaying specific password requirements not met.

---

### Finding 4: GPM-AUDIT-015 — Customer Order History Listing
- **Category:** Payments, Orders & Commercial Integrity
- **Contract Status:** `VERIFIED CONTRACT` (Test Suite: `backend/tests/orders-history.integration.test.ts`, 7/7 pass)
- **Verified Endpoint:** `GET /api/v1/orders`
  - Query Parameters: `cursor?: string`, `limit?: number (1..50, def 20)`, `status?: "PENDING_PAYMENT" | "PAID" | "FAILED" | "CANCELLED"`
  - Auth: `@Roles("customer")` via `gifted_session` cookie.
  - Tenant Isolation: Database query enforces `where eq(orders.customerId, authenticatedUserId)`. Customer A cannot access Customer B's orders (BOLA/IDOR protected).
  - Response (200 OK):
    ```json
    {
      "items": [
        {
          "id": "uuid",
          "status": "PAID",
          "totalAmountTsh": 5000,
          "planName": "Standard 30 Days",
          "planCode": "PLAN_30D",
          "planVersionNumber": 1,
          "createdAt": "2026-10-25T10:00:00.000Z",
          "paymentAttempt": {
            "id": "uuid",
            "provider": "palmpesa",
            "status": "SUCCEEDED",
            "providerReference": "REF-12345",
            "completedAt": "2026-10-25T10:02:00.000Z"
          },
          "fulfillment": {
            "id": "uuid",
            "status": "COMPLETED",
            "completedAt": "2026-10-25T10:02:01.000Z"
          }
        }
      ],
      "nextCursor": "string | null",
      "hasMore": false
    }
    ```
- **Affected Frontend Components:**
  - `src/app/account/orders/page.tsx`
  - `src/components/customer/OrdersTab.tsx`
- **Required UI States:**
  - *Loading:* Receipt card skeletons.
  - *Empty:* "You have no order history yet. Discover movies to get started."
  - *Success:* Chronological order cards with status badges (`PAID` in emerald, `PENDING_PAYMENT` in amber, `FAILED` in rose), itemized summary, price in TSh, and payment attempt details.
  - *Error:* Error notice with retry button.

---

### Finding 5: Commercial Checkout, Library & Playback Authorization
- **Category:** Payments, Commercial Entitlements & Media Playback
- **Contract Status:** `VERIFIED CONTRACT` (Test Suites: `phase5-commerce-to-streaming.integration.test.ts`, `commercial-runtime.test.ts`, `fulfillments-runtime.test.ts`)
- **Verified Endpoints:**
  1. `POST /api/v1/orders`
     - Auth: Customer session required.
     - Request Body: `{ "offerId": "uuid", "idempotencyKey": "string" }`
     - Response (201 Created): Returns newly created order record with `status: "PENDING_PAYMENT"`.
  2. `POST /api/v1/orders/:orderId/checkout`
     - Auth: Customer session required.
     - Request Body:
       ```json
       {
         "provider": "palmpesa" | "clickpesa" | "simulated",
         "phoneNumber": "0754123456"
       }
       ```
     - Response (200 OK):
       ```json
       {
         "attemptId": "uuid",
         "status": "PENDING",
         "provider": "palmpesa",
         "checkoutUrl": null,
         "instructions": "Please check your phone for the mobile money PIN prompt."
       }
       ```
  3. `GET /api/v1/commercial/me/library`
     - Auth: Customer session required.
     - Response (200 OK):
       ```json
       {
         "entitlements": [
           {
             "id": "uuid",
             "accessPlanId": "uuid",
             "planName": "Standard 30 Days",
             "status": "ACTIVE",
             "startsAt": "2026-10-25T00:00:00.000Z",
             "expiresAt": "2026-11-24T00:00:00.000Z",
             "downloadLimit": 5,
             "deviceLimit": 2,
             "concurrentStreamLimit": 2
           }
         ]
       }
       ```
  4. `POST /api/v1/playback/authorize`
     - Auth: Customer session required. Requires active commercial entitlement.
     - Request Body: `{ "editionId": "uuid" }`
     - Response (200 OK): `{ "playbackToken": "string", "manifestUrl": "string", "expiresAt": "ISO string" }`
     - Error (403 Forbidden): Caller lacks active entitlement covering this title.
- **Affected Frontend Components:**
  - `src/components/customer/LipaModal.tsx`
  - `src/app/watch/[slug]/page.tsx`
  - `src/context/CustomerContext.tsx`
- **Required UI States:**
  - *LipaModal Checkout Initiation:* Collect mobile provider + phone number -> submit -> show USSD PIN push instructions -> poll order status.
  - *Watch Page:* Check access -> if entitled, mount HLS video player with signed token; if unentitled, present access purchase CTA.

---

### Finding 6: GPM-AUDIT-016 — Dedicated Staff Media Preview Token
- **Category:** Media Ingestion & Editorial Review
- **Contract Status:** `VERIFIED CONTRACT` (Test Suite: `backend/tests/staff-media-preview.integration.test.ts`, 9/9 pass)
- **Verified Endpoint:** `POST /api/v1/staff/media/:editionId/preview-token`
  - Auth: `@Roles("media_team", "admin")` + capability `@RequireCapability("MEDIA_PREVIEW")`.
  - Response (200 OK):
    ```json
    {
      "token": "signed_token",
      "manifestUrl": "https://stream.giftedpromovies.com/.../manifest.m3u8",
      "expiresAt": "2026-10-28T03:05:00.000Z",
      "ttlSeconds": 300
    }
    ```
  - Customer role rejected with 403 Forbidden.
- **Affected Frontend Components:**
  - `src/app/admin/movies/page.tsx`
  - `src/app/admin/media-team/page.tsx`
- **Required UI States:**
  - Editorial player mounts preview stream with a visible 5-minute countdown timer.

---

### Finding 7: GPM-AUDIT-006 — Administrative Audit Query Controller
- **Category:** Audit Logging & Operations
- **Contract Status:** `VERIFIED CONTRACT` (Test Suite: `backend/tests/admin-audit.integration.test.ts`, 9/9 pass)
- **Verified Endpoint:** `GET /api/v1/admin/audit`
  - Query Parameters: `cursor`, `limit` (max 100), `actorId`, `resourceType`, `action`, `startDate`, `endDate`
  - Auth: `@Roles("admin")` strictly. Customer and Media Team roles receive 403 Forbidden.
- **Affected Frontend Screens:**
  - `src/app/admin/transactions/page.tsx`, `src/app/admin/settings/page.tsx`

---

### Finding 8: GPM-AUDIT-002 — Live Client Google OAuth Verification Gap
- **Category:** Authentication & Session Management
- **Contract Status:** `TEST GAP` (Backend complete; live browser OAuth handoff requires live testing on port 3000/8001).
- **Backend Endpoints:**
  - `GET /api/v1/auth/google`: Initiates OIDC flow.
  - `GET /api/v1/auth/google/callback`: Sets `gifted_session` cookie, redirects to frontend.
- **Affected Frontend Screens:**
  - `src/components/auth/LoginModal.tsx` ("Continue with Google" button)

---

### Findings 9 & 10: GPM-AUDIT-017 & GPM-AUDIT-013 — Media Supersession & Offline Downloads
- **Category:** Media Supersession & Offline Downloads
- **Frontend Integration Status:** `DEFERRED` (Tracked for future frontend integration milestone).
- **Backend Implementation Status:** `VERIFIED CONTRACT` (Migration 0013 applied; Model B supersession & download attempts active; 100% test pass rate).
- **Verified Download Authorization Endpoint:**
  - **Route:** `POST /api/v1/download/authorize`
  - **Auth:** Session cookie (`gifted_session`), Role: `customer`
  - **Request Body (`application/json`):**
    ```json
    {
      "contentId": "uuid-optional",
      "episodeId": "uuid-optional",
      "editionId": "uuid-optional",
      "djId": "uuid-optional"
    }
    ```
  - **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "authorized": true,
        "downloadUrl": "https://stream.giftedpro.test/hls/movies/downloads/ready-offline.mp4?token=ey...",
        "downloadToken": "ey...",
        "expiresAt": "2026-10-29T01:30:00.000Z",
        "targetKind": "movie",
        "contentId": "uuid",
        "editionId": "uuid",
        "djId": "uuid",
        "downloadLimit": 5,
        "downloadLimitType": "UNIQUE_TITLES",
        "attemptId": "uuid",
        "isRetry": false
      }
    }
    ```
  - **Error Responses:**
    - `401 Unauthorized`: Missing or invalid session cookie.
    - `403 Forbidden`: Non-customer role, `NO_ACTIVE_ENTITLEMENT`, `DOWNLOAD_NOT_PERMITTED` (when limit = 0), or `DOWNLOAD_QUOTA_EXHAUSTED` (when positive quota cap is reached).
    - `404 Not Found`: Media download asset is unready or pending.

- **Verified Download Delivery Reporting Endpoint:**
  - **Route:** `POST /api/v1/download/report-delivery`
  - **Auth:** Session cookie (`gifted_session`), Role: `customer`
  - **Request Body (`application/json`):**
    ```json
    {
      "attemptId": "uuid",
      "status": "COMPLETED | FAILED",
      "failureReason": "optional-string-when-failed"
    }
    ```
  - **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "attemptId": "uuid",
        "status": "COMPLETED | FAILED",
        "retryEligible": true,
        "retryGraceExpiresAt": "2026-10-30T01:30:00.000Z",
        "updatedAt": "2026-10-29T01:30:00.000Z"
      }
    }
    ```
  - **Behavior:** Reporting `FAILED` activates the 24-hour retry grace window, permitting a re-download of the same title without consuming an additional quota slot.

- **Verified Media Asset Supersession Endpoint (Media Team / Admin):**
  - **Route:** `POST /api/v1/media/supersede`
  - **Auth:** Session cookie (`gifted_session`), Role: `media_team`, `admin`
  - **Request Body (`application/json`):**
    ```json
    {
      "targetId": "uuid",
      "contentKind": "movie | episode",
      "fileType": "streaming | download",
      "newStorageKey": "movies/hls/new-version/master.m3u8",
      "reason": "4K Remaster upgrade authorized"
    }
    ```
  - **Success Response (200 OK):**
    ```json
    {
      "success": true,
      "data": {
        "supersessionId": "uuid",
        "contentKind": "movie",
        "targetId": "uuid",
        "fileType": "streaming",
        "previousFileKey": "movies/hls/old/master.m3u8",
        "newFileKey": "movies/hls/new-version/master.m3u8",
        "supersededAt": "2026-10-29T01:30:00.000Z"
      }
    }
    ```
  - **Security Invariant:** Direct SQL updates without a registered supersession record within 60 seconds are rejected by the database trigger with `DIRECT_SQL_MUTATION_DENIED`.

- **Frontend Implementation Requirements (When Scheduled):**
  - Trigger `POST /api/v1/download/authorize` upon customer clicking offline download button.
  - Listen for client-side download completion or network failure and post outcome to `POST /api/v1/download/report-delivery`.
  - On network failure, offer the user a retry action that invokes `POST /api/v1/download/authorize` within the 24-hour grace window.
  - Display plan download quota remaining (`downloadLimit` / `downloadLimitType`).
  - Gracefully handle `403 DOWNLOAD_QUOTA_EXHAUSTED` with plan upgrade prompt.
  - In Admin/Media Team dashboard, use `POST /api/v1/media/supersede` for non-destructive replacement of existing media assets.

---

## Future UI & Interaction References

### Dqnamo Receipt Printer
- **Reference:** [https://www.dqnamo.com/experiments/receipt-printer](https://www.dqnamo.com/experiments/receipt-printer)
- **Component:** Dqnamo Receipt Printer
- **Context & Future Role:** Future UI/interaction reference for a receipt-printing simulation, especially where a relevant checkout or payment-success experience exists in GIFTEDproMovies.
- **Demonstrated Features:**
  - A simulated receipt printer and receipt-paper animation.
  - Processing, printing, and completion states.
  - An itemized receipt and payment confirmation.
  - An animated interaction that makes the payment-success experience more tangible.
- **Status & Important Constraints:**
  - **Marked as a future consideration only — not approved for implementation yet.**
  - Must not expand the current task's scope.
  - This is currently a design reference only. Do not assume it provides actual physical-printer integration.
  - Do not install, copy, or integrate it during this task.
  - Review its implementation compatibility and reuse/licensing terms before adopting any code.

