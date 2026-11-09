# GIFTEDproMovies3 — Phase 7 Frontend-to-Backend API Contract Reconciliation

**Document ID:** `docs/qa/GPM-PHASE7-FRONTEND-API-CONTRACT-RECONCILIATION.md`  
**Mission ID:** `GPM-PHASE7-CUSTOMER-FRONTEND-INTEGRATION`  
**Authority:** Product Owner Binding Directive  
**Date:** 2026-11-05  
**Status:** AUTHORITATIVE CONTRACT SPECIFICATION — STAGE 0 GATE  

---

## 1. Overview & Transport Standards

This document specifies the exact HTTP contracts, request/response schemas, cookie semantics, and error codes for every backend endpoint consumed by the GIFTEDproMovies customer frontend.

### Transport & Security Rules:
1. **Base URL:** `/api/v1` (Proxied via Next.js rewrite or direct backend URL `http://localhost:8001/api/v1` in dev, production domain in prod).
2. **Cookie Transport:** Session cookie `gifted_session` is `HttpOnly; SameSite=Lax; Path=/; Secure` (in production). All client `fetch` calls MUST supply `credentials: 'include'`.
3. **Response Envelope:** All success responses are formatted as `{ success: true, data: T }` or direct JSON payloads (Fastify).
4. **Error Envelope:**
   ```json
   {
     "statusCode": 400,
     "error": "Bad Request",
     "message": "Human readable message or validation error array"
   }
   ```
5. **Rate Limiting Headers:** 429 responses return `Retry-After: <seconds>` and standard `x-ratelimit-*` headers.

---

## 2. Exhaustive Endpoint Contract Register

---

### A. Authentication & Identity Management

#### 1. `POST /api/v1/auth/register`
- **Auth:** Public
- **Rate Limit:** 5 requests / 60 seconds per IP
- **Request Body:**
  ```json
  {
    "email": "customer@example.com",
    "password": "StrongPassword123!"
  }
  ```
  *Validation Rules:* Email must be valid; password requires min 8, max 128 characters, uppercase, lowercase, and number.
- **Success Response (201 Created):**
  ```json
  {
    "message": "Registration successful. Please check your email to verify your account.",
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "role": "customer",
      "status": "pending_verification",
      "emailVerified": false,
      "createdAt": "2026-11-05T00:00:00.000Z"
    }
  }
  ```
- **Error Responses:**
  - `400 Bad Request`: Validation failure (weak password, invalid email) or email already registered.
  - `429 Too Many Requests`: Rate limit exceeded.
- **Backend Test:** `backend/tests/auth.test.ts`, `backend/tests/rate-limiting.test.ts`.

#### 2. `POST /api/v1/auth/login`
- **Auth:** Public
- **Rate Limit:** 5 requests / 60 seconds per IP
- **Request Body:**
  ```json
  {
    "email": "customer@example.com",
    "password": "StrongPassword123!",
    "deviceIdentifier": "optional-uuid-or-fingerprint",
    "deviceName": "Chrome on macOS",
    "deviceType": "browser"
  }
  ```
- **Success Response (200 OK):**
  - Sets `gifted_session` cookie (`HttpOnly; Max-Age=2592000`).
  - Body:
    ```json
    {
      "user": {
        "id": "uuid",
        "email": "customer@example.com",
        "role": "customer",
        "status": "active",
        "emailVerified": true
      },
      "session": {
        "id": "uuid",
        "expiresAt": "2026-12-05T00:00:00.000Z",
        "lastActiveAt": "2026-11-05T00:00:00.000Z"
      }
    }
    ```
- **Error Responses:**
  - `401 Unauthorized`: Invalid email or password.
  - `403 Forbidden`: Account suspended, or email unverified (`EMAIL_NOT_VERIFIED`).
  - `429 Too Many Requests`: Rate limit exceeded.

#### 3. `POST /api/v1/auth/logout` & `POST /api/v1/auth/logout-all`
- **Auth:** Authenticated (`gifted_session`)
- **Success Response (200 OK):**
  - Clears `gifted_session` cookie (`Max-Age=0`).
  - Body: `{ "message": "Logged out successfully" }` / `{ "message": "Logged out from all sessions" }`.

#### 4. `GET /api/v1/auth/me`
- **Auth:** Authenticated (`gifted_session`), permits unverified accounts (`@AllowUnverified()`).
- **Success Response (200 OK):**
  ```json
  {
    "user": {
      "id": "uuid",
      "email": "customer@example.com",
      "role": "customer",
      "status": "active",
      "emailVerified": true
    },
    "session": {
      "id": "uuid",
      "expiresAt": "2026-12-05T00:00:00.000Z",
      "lastActiveAt": "2026-11-05T00:00:00.000Z"
    },
    "capabilities": []
  }
  ```
- **Error Response:** `401 Unauthorized` if session is missing, invalid, or expired.

#### 5. `POST /api/v1/auth/resend-verification`
- **Auth:** Public
- **Rate Limit:** 3 requests / 15 minutes per IP
- **Request Body:** `{ "email": "customer@example.com" }`
- **Success Response (200 OK):**
  `{ "message": "If the email is registered and unverified, a verification link has been sent." }`

#### 6. `POST /api/v1/auth/change-password`
- **Auth:** Authenticated (`gifted_session`), any role.
- **Headers:** Requires valid `Origin` matching CORS whitelist.
- **Request Body:**
  ```json
  {
    "currentPassword": "CurrentPassword123!",
    "newPassword": "NewStrongPassword456!"
  }
  ```
- **Success Response (200 OK):**
  - Rotates `gifted_session` cookie. All other sessions are revoked.
  - `{ "message": "Password has been successfully changed" }`
- **Error Responses:** 400 (weak password / same password), 401 (incorrect current password), 403 (invalid origin), 429.

---

### B. Device Management (POD-07)

#### 7. `GET /api/v1/devices`
- **Auth:** Authenticated (`@Roles("customer", "admin")`)
- **Success Response (200 OK):**
  ```json
  {
    "devices": [
      {
        "id": "uuid",
        "userId": "uuid",
        "deviceName": "Chrome on macOS",
        "deviceType": "browser",
        "deviceIdentifier": "fingerprint-string",
        "lastActiveAt": "2026-11-05T00:00:00.000Z",
        "createdAt": "2026-11-05T00:00:00.000Z"
      }
    ],
    "effectiveLimit": 2,
    "currentCount": 1,
    "remainingSlots": 1
  }
  ```
- **POD-07 Resolution:** `effectiveLimit` derives from `MAX(active_subscriptions.device_limit)` defaulting to 2.

#### 8. `DELETE /api/v1/devices/:id`
- **Auth:** Authenticated (`@Roles("customer", "admin")`)
- **Success Response (200 OK):**
  `{ "message": "Device removed and associated sessions revoked" }`

---

### C. Public Catalog Discovery

#### 9. `GET /api/v1/catalog/titles`
- **Auth:** Public
- **Query Params:** `cursor?: string`, `limit?: number (def 20, max 50)`, `kind?: "movie" | "series"`, `categoryId?: UUID`, `countryId?: UUID`, `djProfileId?: UUID`
- **Success Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "uuid",
        "codeId": "string",
        "contentType": "movie",
        "title": "Title Name",
        "slug": "title-slug",
        "releaseYear": 2024,
        "description": "Synopsis text",
        "posterUrl": "https://...",
        "backdropUrl": "https://...",
        "trailerUrl": "https://...",
        "durationMinutes": 120,
        "publishedAt": "2026-10-25T12:00:00.000Z",
        "categories": [{ "id": "uuid", "name": "Action", "slug": "action" }],
        "countries": [{ "id": "uuid", "code": "TZ", "name": "Tanzania" }]
      }
    ],
    "nextCursor": null,
    "hasMore": false
  }
  ```

#### 10. `GET /api/v1/catalog/titles/:slug`
- **Auth:** Public
- **Success Response (200 OK):**
  Returns movie/series detail with `editions: [{ id, isDefault, dj: { id, stageName, slug, avatarUrl } }]`.

#### 11. `GET /api/v1/catalog/taxonomies`
- **Auth:** Public
- **Success Response (200 OK):**
  `{ "categories": [...], "countries": [...], "voiceArtists": [...] }`

#### 12. `GET /api/v1/catalog/search?q=...`
- **Auth:** Public
- **Query Params:** `q: string`, `limit?: number`, `cursor?: string`
- **Success Response (200 OK):** Returns matching published titles.

---

### D. Commercial Library, Orders & Checkout

#### 13. `GET /api/v1/commercial/me/library`
- **Auth:** Authenticated (`@Roles("customer", "admin")`)
- **Success Response (200 OK):**
  ```json
  {
    "grants": [
      {
        "id": "uuid",
        "offerType": "CATALOG",
        "status": "ACTIVE",
        "validFrom": "2026-11-05T00:00:00.000Z",
        "validUntil": "2026-12-05T00:00:00.000Z",
        "downloadLimit": 5,
        "downloadLimitType": "UNIQUE_TITLES",
        "deviceLimit": 2
      }
    ]
  }
  ```

#### 14. `GET /api/v1/commercial/me/access/:contentId`
- **Auth:** Authenticated
- **Success Response (200 OK):**
  `{ "granted": true, "decision": "CATALOG_GRANT", "reason": "Active catalog subscription grant", "periodEnd": "..." }`

#### 15. `POST /api/v1/orders`
- **Auth:** Authenticated (`@Roles("customer")`)
- **Request Body:**
  ```json
  {
    "offerId": "uuid",
    "idempotencyKey": "order-12345"
  }
  ```
- **Success Response (201 Created):** Returns created order record with `status: "PENDING_PAYMENT"`.

#### 16. `POST /api/v1/orders/:orderId/checkout`
- **Auth:** Authenticated (`@Roles("customer")`)
- **Request Body:**
  ```json
  {
    "phoneNumber": "0754123456",
    "returnUrl": "https://giftedpromovies.com/library",
    "cancelUrl": "https://giftedpromovies.com/movies"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "attemptId": "uuid",
    "attemptNumber": 1,
    "orderId": "uuid",
    "orderReference": "ORD-123",
    "paymentMode": "ASYNC_PROMPT",
    "amountTzs": 5000,
    "currency": "TZS",
    "status": "PENDING",
    "expiresAt": "2026-11-05T01:30:00.000Z"
  }
  ```

#### 17. `GET /api/v1/orders` & `GET /api/v1/orders/:id`
- **Auth:** Authenticated (`@Roles("customer")`)
- **Success Response (200 OK):** Returns customer's isolated order history.

---

### E. Download Delivery & Licensing (POD-08 Option A)

#### 18. `POST /api/v1/download/authorize`
- **Auth:** Authenticated (`@Roles("customer")`)
- **Request Body:**
  ```json
  {
    "contentId": "uuid-optional",
    "editionId": "uuid-optional",
    "deviceId": "uuid-optional"
  }
  ```
- **Success Response (200 OK):**
  ```json
  {
    "authorized": true,
    "downloadUrl": "https://pub-r2.giftedpromovies.com/movies/downloads/ready.mp4?X-Amz-...",
    "downloadToken": "ey...",
    "expiresAt": "2026-11-05T01:35:00.000Z",
    "expiresInSeconds": 900,
    "attemptId": "uuid",
    "targetKind": "movie",
    "isRetry": false
  }
  ```
- **Error Codes:** `401 Unauthorized`, `403 ACCESS_DENIED`, `403 DOWNLOAD_QUOTA_EXHAUSTED`, `403 DEVICE_LIMIT_EXCEEDED`, `404 ASSET_NOT_READY`.

#### 19. `POST /api/v1/download/report-delivery`
- **Auth:** Authenticated (`@Roles("customer")`)
- **Request Body:**
  ```json
  {
    "attemptId": "uuid",
    "status": "COMPLETED",
    "failureReason": null
  }
  ```
  *(Or `status: "FAILED"` on network interruption, activating 24h retry grace).*
- **Success Response (200 OK):**
  `{ "attemptId": "uuid", "status": "COMPLETED", "retryEligible": false, "retryGraceExpiresAt": null }`

#### 20. `GET /api/v1/download/licenses`
- **Auth:** Authenticated (`@Roles("customer")`)
- **Success Response (200 OK):**
  ```json
  {
    "licenses": [...],
    "quota": {
      "limit": 5,
      "used": 1,
      "remaining": 4,
      "policyType": "UNIQUE_TITLES"
    }
  }
  ```

---

### F. Playback Boundary (Phase 8 Lockout)

#### 21. `POST /api/v1/playback/authorize`
- **Auth:** Authenticated
- **Behavior:** With `CUSTOMER_STREAMING_ENABLED = false`, backend returns:
  - **HTTP Status:** `503 Service Unavailable`
  - **Error Code:** `STREAMING_COMING_SOON`
  - **Message:** `"Customer streaming launches in Phase 8. Offline downloads are available for entitled members."`

---
*End of GPM-PHASE7-FRONTEND-API-CONTRACT-RECONCILIATION.*
