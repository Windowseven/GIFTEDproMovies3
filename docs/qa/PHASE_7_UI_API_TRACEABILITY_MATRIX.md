# PHASE 7 UI-API TRACEABILITY MATRIX
**Reference:** GPM-PHASE7-TRACEABILITY-MATRIX  
**Date:** 2026-11-03  
**Status:** COMPLETE (GATE A — READ-ONLY DISCOVERY)  
**Authority:** Product Owner Directive (POD-06 Option B / POD-07)

---

## 1. Traceability Overview

This matrix maps every customer-facing UI view, action, state, and interaction in Phase 7 to its underlying Fastify backend API endpoint, data contracts, status codes, and error semantics.

---

## 2. Traceability Matrix

| UI Component & Flow | User Action / Trigger | Backend Endpoint & Method | Request Payload | Expected Response Payload | HTTP Codes & Error Handling |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Movie Detail Page** (`/movies/[slug]`) - Entitlement Check | On page load / user session resolved | `GET /api/v1/commercial/me/access/:contentId` | `params: { contentId: UUID }` | `{ allowed: boolean, reason?: string, entitlementType?: string, validUntil?: string }` | `200 OK`<br>`401 Unauthorized` -> Show login prompt<br>`404 Not Found` -> Show unpurchased |
| **Movie Detail Page** (`/movies/[slug]`) - Offline Download | Click "Download for Offline" button | `POST /api/v1/download/authorize` | `{ contentId: UUID, deviceId?: UUID, deviceName?: string, deviceType?: string, clientIp?: string, userAgent?: string }` | `{ downloadAttemptId: UUID, downloadUrl: string, expiresAt: string, quotaRemaining: number }` | `200 OK` -> Begin download stream<br>`401 Unauthorized` -> Prompt sign in<br>`403 ACCESS_DENIED` -> Prompt purchase<br>`403 DEVICE_LIMIT_EXCEEDED` -> Show device modal<br>`403 DOWNLOAD_LIMIT_EXCEEDED` -> Show quota exhausted<br>`409 CONCURRENT_DOWNLOAD_ACTIVE` -> Show in-progress warning |
| **Movie Detail Page** (`/movies/[slug]`) - Delivery Reporting | Triggered after download fetch or iframe/link start | `POST /api/v1/download/report-delivery` | `{ downloadAttemptId: UUID, status: "completed" \| "failed", bytesTransferred?: number, errorMessage?: string }` | `{ success: true, recordedStatus: string, quotaRemaining: number }` | `200 OK` -> Update UI state<br>`401 Unauthorized` -> Ignore background report<br>`404 Not Found` -> Invalid attempt ID |
| **Customer Library** (`/library`) - Active Entitlements Tab | Select "Active Passes & Entitlements" | `GET /api/v1/commercial/me/library` | None (reads session cookie) | `{ entitlements: [{ id, contentId, title, entitlementType, validFrom, validUntil, status, metadata }] }` | `200 OK` -> Render list/cards<br>`401 Unauthorized` -> Redirect to login |
| **Customer Library** (`/library`) - Offline Downloads Tab (Licenses) | Select "Offline Downloads" | `GET /api/v1/download/licenses` | None (reads session cookie) | `{ licenses: [{ licenseId, contentId, title, quotaTotal, quotaUsed, quotaRemaining, expiresAt, status, latestAttemptStatus }] }` | `200 OK` -> Render active download cards<br>`401 Unauthorized` -> Redirect to login |
| **Customer Library** (`/library`) - Offline Downloads Tab (History) | View "Download Activity History" sub-view | `GET /api/v1/download/history?page=1&limit=20` | `query: { page: number, limit: number }` | `{ history: [{ id, contentId, title, deviceName, startedAt, completedAt, status, failureReason }], pagination: { page, limit, total } }` | `200 OK` -> Render history table/list<br>`401 Unauthorized` -> Redirect to login |
| **Customer Library / Settings** - Device Management View | Open "Manage Recognized Devices" | `GET /api/v1/devices` | None (reads session cookie) | `{ devices: [{ id, deviceName, deviceType, lastSeenAt, isCurrentDevice }], effectiveLimit: number, currentCount: number, remainingSlots: number }` | `200 OK` -> Render device list & limit meter<br>`401 Unauthorized` -> Redirect to login |
| **Customer Library / Settings** - Revoke Device Action | Click "Remove Device" & confirm | `DELETE /api/v1/devices/:id` | `params: { id: UUID }` | `{ success: true, message: string }` | `200 OK` -> Remove from list, refresh capacity<br>`401 Unauthorized` -> Prompt login<br>`404 Not Found` -> Device not found<br>`403 Forbidden` -> Cannot delete unowned device |
| **Customer Login Modal / Bar** - Authentication Flow | User submits credentials | `POST /api/v1/auth/login` | `{ email: string, password: string }` | `{ user: { id, email, role, customerProfileId }, sessionExpiresAt: string }` | `200 OK` (Sets `gifted_session` cookie)<br>`401 Unauthorized` -> Invalid credentials |
| **Customer Auth Bar** - Session State Recovery | App boot / navigation | `GET /api/v1/auth/me` | None (reads session cookie) | `{ authenticated: boolean, user?: { id, email, role, customerProfileId } }` | `200 OK` -> Hydrate customer state<br>`401 Unauthorized` -> Set guest state |
| **Customer Auth Bar** - Sign Out | Click "Sign Out" | `POST /api/v1/auth/logout` | None (reads session cookie) | `{ success: true }` (Clears session cookie) | `200 OK` -> Clear client state, redirect home |

---

## 3. Boundary & Error Scenario Traceability

| Scenario | Trigger | API Contract | Expected Frontend UX |
| :--- | :--- | :--- | :--- |
| **Unauthenticated User clicks Download** | Click "Download" while guest | Client checks session; if unauth, prevents request or receives `401` | Modal appears: "Please sign in or create an account to download offline movies." |
| **Unpurchased Movie Download** | User has no entitlement for movie | API returns `403` with code `ACCESS_DENIED` | Banner: "You must rent or buy this movie before downloading." with action button "View Purchase Options". |
| **Device Limit Exceeded (POD-07)** | Customer has registered MAX allowed devices | API returns `403` with code `DEVICE_LIMIT_EXCEEDED` and `limit: 2` | Modal: "Device Limit Reached (2/2). You have reached the maximum number of devices allowed on your plan. Manage your devices in your Library to free up a slot." with direct link to Device Management. |
| **Download Quota Exhausted** | 5 downloads reached for this license | API returns `403` with code `DOWNLOAD_LIMIT_EXCEEDED` | Toast/Banner: "Download limit reached (5/5). Offline downloads for this license have reached their maximum limit." |
| **Concurrent Download in Progress** | Another download attempt within 15 mins is active | API returns `409` with code `CONCURRENT_DOWNLOAD_ACTIVE` | Banner: "A download for this movie is already in progress. Please wait for it to complete or try again in a few moments." |
| **Customer Attempts Video Streaming** | User clicks "Play Stream" | Route `/api/v1/playback/stream/:id` returns `503` `STREAMING_COMING_SOON` | Friendly modal: "Online streaming is coming soon in Phase 8! In the meantime, download this title to enjoy offline viewing anytime." |
