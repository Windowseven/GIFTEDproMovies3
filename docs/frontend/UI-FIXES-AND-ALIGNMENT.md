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

## Phase 7 Frontend Integration Handoff & Contract Register

> **MANDATORY GOVERNANCE DIRECTIVE:**
> **FRONTEND INTEGRATION IS DEFERRED UNTIL BACKEND COMPLETION AND SEPARATE PRODUCT OWNER AUTHORIZATION.**
>
> All items in this section define the verified backend contracts, data structures, cookie requirements, and UI state flows established in Phase 7 Stages 1 and 2 (Backend Engineering). No frontend source code in `src/` has been modified during this mission. Frontend engineering is to be executed in a dedicated frontend integration phase following Product Owner review.

### 1. Architectural Foundations & Transport Security

1. **Zero Mock Policy:**
   - Eliminate all synthetic in-browser blobs (`new Blob(...)`), mock download links (`URL.createObjectURL`), and mock client device arrays (`DEFAULT_DEVICES`).
   - All customer download authorizations, device registrations, and entitlement queries must route through the authoritative Fastify backend (`/api/v1/*`).

2. **Session & Cookie Transport:**
   - **Cookie Name:** `gifted_session`
   - **Attributes:** `HttpOnly; SameSite=Lax; Path=/; Secure` (in production).
   - **Client Fetch Requirement:** All client API calls must supply `credentials: 'include'` (or `withCredentials: true` in Axios) so browser sessions are seamlessly authenticated.
   - **State Hydration:** Client bootstrap calls `GET /api/v1/auth/me`. If `401 Unauthorized`, clear local user state and redirect to login or present unauthenticated modal.

3. **Standard API Response Envelopes:**
   - **Global Success Envelope:** All 2xx endpoints wrap payloads via `SuccessEnvelopeInterceptor`:
     ```json
     {
       "success": true,
       "data": { ... }
     }
     ```
     *Frontend requirement:* Clients must unwrap `res.data.data` (or `(await res.json()).data`).
   - **Global Error Envelope:** All 4xx and 5xx errors are structured via `ApiExceptionFilter`:
     ```json
     {
       "success": false,
       "error": {
         "code": "STRING_ERROR_CODE",
         "message": "Human readable explanation",
         "details": null,
         "timestamp": "2026-11-03T02:00:00.000Z",
         "requestId": "req-1"
       }
     }
     ```
     *Frontend requirement:* Intercept `error.code` to show targeted contextual errors (e.g. `DEVICE_LIMIT_EXCEEDED`, `DOWNLOAD_QUOTA_EXHAUSTED`, `STREAMING_COMING_SOON`).

4. **Phase 8 Streaming Lockout Policy:**
   - `CUSTOMER_STREAMING_ENABLED = false` is active.
   - Customer playback requests receive HTTP `503 Service Unavailable` with `STREAMING_COMING_SOON`.
   - The UI video player must detect this error code and display the authorized branded placeholder: *"Customer streaming launches in Phase 8. Offline downloads are available for entitled members."*

---

### 2. Verified Backend API Contracts (Phase 7 Scope)

#### A. Commercial Access & Library

##### `GET /api/v1/commercial/me/access/:movieId`
- **Purpose:** Determine if current authenticated customer has valid entitlement/grant to download or view a movie.
- **Contract Status:** `VERIFIED CONTRACT` (Suite: `phase7-backend-master-e2e.integration.test.ts`, PJ-01, PJ-02)
- **Response Payload (`data`):**
  ```json
  {
    "granted": true,
    "decision": "CATALOG_GRANT",
    "reason": "Active catalog subscription grant",
    "entitlementId": "73d4cf8c-8be9-45e0-81fe-0a37db7bb1d3",
    "periodEnd": "2026-12-03T02:00:00.000Z"
  }
  ```
- **UI State Requirement:** If `granted === false`, display commercial purchase card / pass selection modal. If `granted === true`, unlock the Download action button.

##### `GET /api/v1/commercial/me/library`
- **Purpose:** Retrieve customer's active and historical commercial grants and passes.
- **Contract Status:** `VERIFIED CONTRACT` (Suite: `phase7-backend-master-e2e.integration.test.ts`, PJ-03)
- **Response Payload (`data`):**
  ```json
  {
    "grants": [
      {
        "id": "73d4cf8c-8be9-45e0-81fe-0a37db7bb1d3",
        "offerType": "CATALOG",
        "status": "ACTIVE",
        "validFrom": "2026-11-03T02:00:00.000Z",
        "validUntil": "2026-12-03T02:00:00.000Z",
        "downloadLimit": 5,
        "downloadLimitType": "UNIQUE_TITLES",
        "deviceLimit": 3
      }
    ]
  }
  ```
- **UI State Requirement:** Populate Customer Library screen with real catalog subscription pass badges, validity dates, and plan tier limits.

---

#### B. Download Authorization & Delivery Telemetry

##### `POST /api/v1/download/authorize`
- **Purpose:** Authorize offline download for a movie edition; returns high-security presigned Cloudflare R2 URL.
- **Contract Status:** `VERIFIED CONTRACT` (Suite: `download-authorization.integration.test.ts`, `phase7-backend-master-e2e.integration.test.ts`, PJ-07)
- **Request Body:**
  ```json
  {
    "editionId": "uuid",
    "deviceId": "uuid"
  }
  ```
- **Response Payload (`data`):**
  ```json
  {
    "authorized": true,
    "downloadUrl": "https://pub-r2.giftedpromovies.com/movies/downloads/edition-123.mp4?X-Amz-Algorithm=...",
    "expiresAt": "2026-11-03T02:15:00.000Z",
    "expiresInSeconds": 900,
    "attemptId": "48bfa2e4-c2c6-4d0d-b4b1-8cbbfb6e09a4",
    "fileSizeBytes": 2147483648,
    "fileName": "The_Great_Adventure_Master.mp4"
  }
  ```
- **Error Codes to Handle:**
  - `401 UNAUTHORIZED`: Prompt login modal.
  - `403 FORBIDDEN / ACCESS_DENIED`: Customer has no active pass.
  - `403 DEVICE_NOT_RECOGNIZED`: Current device must be registered first.
  - `403 DOWNLOAD_QUOTA_EXHAUSTED`: Customer reached max allowed unique titles / downloads.
- **UI State Requirement:** On click, initiate background browser download via hidden anchor element pointing to `downloadUrl`. Record `attemptId` in component state for delivery telemetry.

##### `POST /api/v1/download/report-delivery`
- **Purpose:** Report download completion or network failure to server for accurate quota consumption and retry grace management.
- **Contract Status:** `VERIFIED CONTRACT` (Suite: `phase7-backend-master-e2e.integration.test.ts`, PJ-09, PJ-12)
- **Request Body:**
  ```json
  {
    "attemptId": "48bfa2e4-c2c6-4d0d-b4b1-8cbbfb6e09a4",
    "status": "COMPLETED",
    "failureReason": null
  }
  ```
- **Response Payload (`data`):**
  ```json
  {
    "attemptId": "48bfa2e4-c2c6-4d0d-b4b1-8cbbfb6e09a4",
    "status": "COMPLETED",
    "retryEligible": false,
    "retryGraceExpiresAt": null,
    "updatedAt": "2026-11-03T02:01:00.000Z"
  }
  ```
- **UI State Requirement:** If browser reports download interruption or client-side fetch error, submit `status: "FAILED"`. The server grants a 24-hour retry grace window permitting re-download without consuming a second quota slot.

##### `GET /api/v1/download/licenses`
- **Purpose:** Display remaining download quota and active offline download licenses.
- **Contract Status:** `VERIFIED CONTRACT` (Suite: `phase7-backend-master-e2e.integration.test.ts`, PJ-10)
- **Response Payload (`data`):**
  ```json
  {
    "licenses": [
      {
        "id": "uuid",
        "movieId": "uuid",
        "movieTitle": "The Great Adventure",
        "editionId": "uuid",
        "licenseExpiresAt": "2026-12-03T02:00:00.000Z",
        "status": "ACTIVE"
      }
    ],
    "quota": {
      "limit": 5,
      "used": 1,
      "remaining": 4,
      "policyType": "UNIQUE_TITLES"
    }
  }
  ```
- **UI State Requirement:** Render download quota progress bar (e.g. `4 / 5 downloads remaining`) on Movie Details and Customer Library views.

##### `GET /api/v1/download/history`
- **Purpose:** View paginated download attempt history for audit and transparency.
- **Contract Status:** `VERIFIED CONTRACT` (Suite: `phase7-backend-master-e2e.integration.test.ts`, PJ-11)
- **Query Params:** `page=1&limit=20`
- **Response Payload (`data`):**
  ```json
  {
    "items": [
      {
        "id": "48bfa2e4-c2c6-4d0d-b4b1-8cbbfb6e09a4",
        "movieId": "uuid",
        "movieTitle": "The Great Adventure",
        "status": "COMPLETED",
        "createdAt": "2026-11-03T02:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
  ```

---

#### C. Device Management & POD-07 Effective Limit Resolution

##### `GET /api/v1/devices`
- **Purpose:** Fetch customer's registered devices and authoritative effective capacity limit derived per POD-07.
- **Contract Status:** `VERIFIED CONTRACT` (Suite: `device-limits.integration.test.ts`, CDL-10; `phase7-backend-master-e2e.integration.test.ts`, PJ-04)
- **Response Payload (`data`):**
  ```json
  {
    "devices": [
      {
        "id": "e0b8d2ef-50d4-4bb0-8025-bdf67eb85458",
        "deviceName": "Furaha MacBook Pro",
        "deviceType": "DESKTOP",
        "registeredAt": "2026-11-03T02:00:00.000Z",
        "lastSeenAt": "2026-11-03T02:00:00.000Z",
        "isCurrentDevice": true
      }
    ],
    "effectiveLimit": 3,
    "currentCount": 1,
    "remainingSlots": 2
  }
  ```
- **POD-07 Resolution Invariant:**
  - `effectiveLimit` is derived exclusively from active subscription entitlements (`MAX(device_limit)`).
  - Defaults to `2` if no active subscription exists.
  - Limits are non-additive.
- **UI State Requirement:** Display device capacity pill badge (e.g. `1 of 3 devices used`). If `remainingSlots === 0`, disable the "Add Device" button and display prompt explaining that an existing device must be removed before registering a new one.

##### `POST /api/v1/devices`
- **Purpose:** Register the current browser/device in the customer's account.
- **Contract Status:** `VERIFIED CONTRACT` (Suite: `device-limits.integration.test.ts`, `phase7-backend-master-e2e.integration.test.ts`, PJ-05, PJ-06)
- **Request Body:**
  ```json
  {
    "deviceName": "Chrome on macOS",
    "deviceType": "BROWSER",
    "deviceFingerprint": "sha256-fingerprint-string"
  }
  ```
- **Error Behavior (Capacity Exceeded):**
  - Status: `403 Forbidden`
  - Body:
    ```json
    {
      "success": false,
      "error": {
        "code": "DEVICE_LIMIT_EXCEEDED",
        "message": "Device registration limit reached (3/3). Please remove an existing device."
      }
    }
    ```
- **UI State Requirement:** On `DEVICE_LIMIT_EXCEEDED`, launch a modal prompting the user to review and deregister an older device.

##### `DELETE /api/v1/devices/:id`
- **Purpose:** Deregister a recognized device.
- **Contract Status:** `VERIFIED CONTRACT` (Suite: `device-limits.integration.test.ts`, `phase7-backend-master-e2e.integration.test.ts`, PJ-14, PJ-15)
- **Response Payload (`data`):**
  ```json
  {
    "success": true,
    "message": "Device removed successfully"
  }
  ```
- **Security Invariant:** Removing a device immediately revokes all active sessions linked to that device ID. If the user removes the *current* device, they are logged out.

---

### 3. Component-by-Component UI Alignment Matrix

| UI Component File | Current Implementation (Mock / Drift) | Required Target Implementation (Phase 7 Frontend Integration) |
| :--- | :--- | :--- |
| `src/context/AuthContext.tsx` | Mock user state in `localStorage` | Authenticate against `/api/v1/auth/login`, read `gifted_session` cookie via `credentials: 'include'`, fetch profile from `/api/v1/auth/me`. |
| `src/components/movie/MovieDetailModal.tsx` | Synthetic download simulation generating dummy `.mp4` blob via `new Blob()` | Query `GET /api/v1/commercial/me/access/:id`. If granted, invoke `POST /api/v1/download/authorize` and download directly from Cloudflare R2 presigned URL. |
| `src/components/movie/DownloadButton.tsx` | Instant progress bar animation without network request | Display remaining quota (`remainingDownloads`). Initiate R2 download and send completion telemetry to `POST /api/v1/download/report-delivery`. |
| `src/components/customer/CustomerLibraryTab.tsx` | Static placeholder passes and mock licenses | Fetch from `GET /api/v1/commercial/me/library` and `GET /api/v1/download/licenses`. Render active passes with real dates and remaining download quotas. |
| `src/components/customer/DeviceManagementTab.tsx` | Hardcoded `DEFAULT_DEVICES` array with 5 mock devices | Fetch from `GET /api/v1/devices`. Render real devices, current device indicator, `effectiveLimit`, `currentCount`, and `remainingSlots`. Provide delete action to `/api/v1/devices/:id`. |
| `src/components/video/VideoPlayer.tsx` | Direct playback attempt | Intercept 503 `STREAMING_COMING_SOON` and display authorized placeholder message for Phase 8. |

---

### 4. Legal, Statutory & Compliance UI Requirements Register

> **Authority Reference:**  
> Complete audit and mapping details are codified in:
> - [`docs/frontend/LEGAL-UI-REQUIREMENTS-HANDOFF.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/frontend/LEGAL-UI-REQUIREMENTS-HANDOFF.md)
> - [`docs/qa/GPM-LEGAL-DOCUMENT-INVENTORY.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/qa/GPM-LEGAL-DOCUMENT-INVENTORY.md)
> - [`docs/qa/GPM-LEGAL-TO-FRONTEND-TRACEABILITY.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/qa/GPM-LEGAL-TO-FRONTEND-TRACEABILITY.md)
> - [`docs/qa/GPM-LEGAL-GAPS-AND-HUMAN-ACTIONS.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/qa/GPM-LEGAL-GAPS-AND-HUMAN-ACTIONS.md)

| Legal / Compliance Area | Required Frontend UI Behavior | Target Route / Component | Legal & Regulatory Source |
| :--- | :--- | :--- | :--- |
| **Registration Age & Legal Consent** | Mandatory unchecked checkbox: *"I am at least 18 (or have parental consent) and agree to [Terms](/terms) and [Privacy Policy](/privacy)"*. Submit button disabled until checked. | `src/components/auth/RegisterModal.tsx` | TOS §2, Privacy §3, Law of the Child Act 2009 |
| **Login Session Disclosure** | Clear microcopy disclosing 14-day inactivity / 30-day max session duration. Unverified email returns action button to resend verification. | `src/components/auth/LoginModal.tsx` | TOS §3, Cookie Notice §2.1 |
| **Google Sign-In Compliance** | Strictly follow Google Identity Branding guidelines. Display scope disclaimer: *"We only receive your name and verified email address."* Handle local email collision gracefully. | `src/components/auth/GoogleAuthButton.tsx` | Privacy §3.2, Google User Data Policy |
| **Zero-Ad Cookies Disclosure** | Dedicated page explaining zero 3rd-party ad trackers. Table breaking down `gifted_session` (30d) and `gp_oauth_state` (10m) as essential cookies. | `src/app/cookies/page.tsx` | Cookie Notice §1–§5, Tanzania PDPA 2022 |
| **Transparent Pricing & Non-Renewal** | Display prices in Tanzanian Shillings (TZS) inclusive of taxes. Distinct badge: *"One-Time Payment • Does NOT renew automatically"*. | `src/components/customer/LipaModal.tsx` | Fair Competition Act 2003, TRA VAT Act |
| **Instant Delivery Refund Waiver** | Display statutory digital waiver above payment button: *"Digital passes cannot be refunded once playback or download begins. 24h technical dispute window applies."* | `src/components/customer/LipaModal.tsx`, `/refunds` | TOS §7, ADR-026 |
| **Atomic Download Quota & Telemetry** | Render remaining quota (`UNIQUE_TITLES`). Initiate Cloudflare R2 download via presigned URL. Report completion/interruption telemetry (`report-delivery`) to enable 24h retry grace. | `src/components/movie/DownloadButton.tsx` | POD-08 Option A, ADR-018 |
| **Device Capacity & Revocation** | Render registered device slots per POD-07 (`MAX(device_limit)`). At capacity, require removing older device with clear session revocation notice. | `src/components/customer/DeviceManagementTab.tsx` | POD-07, TOS §3 |
| **Account Erasure vs. Tax Retention** | In-app Danger Zone with password + typed text confirmation (`"DELETE MY ACCOUNT"`). Warns of active pass forfeiture and explains 7-year statutory financial record retention. | `src/components/customer/DangerZone.tsx`, `/account-deletion` | PDPA 2022 §34, TRA Tax Admin Act 2015, ADR-027 |
| **Translator / DJ Attribution** | Clearly display Swahili translation voice artist credit (e.g. *"Tafsiri: DJ Afro"*) on movie cards and detail pages. Provide edition selector. | `src/app/movies/[slug]/page.tsx` | TOS §8, COSOTA 1999, ADR-032 |
| **Dedicated Static Legal Pages** | Accessible, responsive static pages rendering complete policy text. | `/terms`, `/privacy`, `/cookies`, `/account-deletion`, `/refunds`, `/contact` | Global Legal & WCAG 2.1 AA |
| **Persistent Global Legal Footer** | Persistent footer links on all viewports to all 6 legal routes + copyright notice. | `src/components/common/Footer.tsx` | TCRA Regs, Consumer Protection |

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

