# GIFTEDproMovies3 — Frontend Human Actions & Operational Gates Register

**Mission ID:** `GPM-FRONTEND-INTEGRATION-REALITY-AND-UI-ALIGNMENT`  
**Execution Lead:** Antigravity  
**Authority:** Product Owner  
**Date:** November 2026  
**Status:** ACTIONABLE HUMAN GATES REGISTER  
**Primary Reference:** [`docs/frontend/UI-FIXES-AND-ALIGNMENT.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/frontend/UI-FIXES-AND-ALIGNMENT.md)  

---

# 1. EXECUTIVE SUMMARY

While all frontend software engineering, component integration, API alignment, and build validation tasks are 100% complete, live deployment to production requires specific external human actions, regulatory registrations, and cloud provider configurations.

This document provides the Product Owner, DevOps Lead, and Legal Counsel with an explicit, step-by-step register of remaining human gates.

---

# 2. ACTIONABLE HUMAN GATES REGISTER

```
┌────────────────────────────────────────────────────────────────────────┐
│                      OPERATIONAL READINESS GATES                       │
├─────────────┬──────────────────────────────────────────┬───────────────┤
│ Gate ID     │ Operational Domain                       │ Priority      │
├─────────────┼──────────────────────────────────────────┼───────────────┤
│ GATE-01     │ Google Cloud Console OAuth Configuration │ CRITICAL      │
│ GATE-02     │ Mobile Money Gateway Credentials         │ CRITICAL      │
│ GATE-03     │ Cloudflare R2 CORS & Bucket Policy       │ HIGH          │
│ GATE-04     │ BRELA & TRA Legal Entity Identifiers     │ HIGH          │
│ GATE-05     │ Staging Persona User Journey Sign-Off    │ IMMEDIATE     │
└─────────────┴──────────────────────────────────────────┴───────────────┘
```

---

## GATE-01: Google Cloud Console OAuth 2.0 Configuration

### Owner: Product Owner / GCP Project Administrator  
### Urgency: Critical for Google Sign-In Functionality  

The frontend now exposes the official [`GoogleAuthButton`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/auth/GoogleAuthButton.tsx) linking to `/api/v1/auth/google`. To ensure users do not encounter Google `access_denied` or unverified app warnings, the following setup must be completed in Google Cloud Console:

1. **OAuth 2.0 Client ID Credentials:**
   - Navigate to **APIs & Services > Credentials** in the GCP Console.
   - Create or edit the **OAuth 2.0 Web Application** client.
   - Set **Authorized JavaScript Origins:**
     - `https://giftedpromovies.com` (Production)
     - `https://staging.giftedpromovies.com` (Staging)
     - `http://localhost:3000` (Local Development)
   - Set **Authorized Redirect URIs:**
     - `https://giftedpromovies.com/api/v1/auth/google/callback`
     - `https://staging.giftedpromovies.com/api/v1/auth/google/callback`
     - `http://localhost:3001/api/v1/auth/google/callback`

2. **OAuth Consent Screen Configuration:**
   - Navigate to **APIs & Services > OAuth consent screen**.
   - **App Name:** `GIFTEDpro Movies`
   - **User Support Email:** `support@giftedpromovies.com`
   - **App Domain Links:**
     - Application home page: `https://giftedpromovies.com`
     - Privacy policy link: `https://giftedpromovies.com/privacy`
     - Terms of service link: `https://giftedpromovies.com/terms`
   - **Scopes:** Select `.../auth/userinfo.email`, `.../auth/userinfo.profile`, and `openid`.
   - **Publishing Status:**
     - For staging: Add tester Google accounts (e.g. `tester@giftedpromovies.com` or personal test emails) under **Test users**.
     - For production: Click **Publish App** to transition from "Testing" to "In Production" (avoiding the 100-user cap and Google unverified screen).

3. **Environment Secrets Population:**
   - Provide the generated credentials to the deployment environment:
     ```env
     GOOGLE_CLIENT_ID="<client-id>.apps.googleusercontent.com"
     GOOGLE_CLIENT_SECRET="<client-secret>"
     GOOGLE_CALLBACK_URL="https://giftedpromovies.com/api/v1/auth/google/callback"
     ```

---

## GATE-02: Mobile Money Payment Gateway Credentials

### Owner: Financial Operations / Backend Lead  
### Urgency: Critical for Real-Money Commercial Transactions  

The frontend [`LipaModal.tsx`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/customer/LipaModal.tsx) initiates real USSD mobile payment pushes via `POST /api/v1/orders/:id/checkout`.

1. **Telecom Provider Sandboxes:**
   - Configure sandbox merchant credentials in `backend/.env` for:
     - **Vodacom M-Pesa:** `MPESA_API_KEY`, `MPESA_PUBLIC_KEY`, `MPESA_SHORTCODE`
     - **Tigo Pesa:** `TIGO_PESA_CLIENT_ID`, `TIGO_PESA_CLIENT_SECRET`
     - **Airtel Money:** `AIRTEL_MONEY_CLIENT_ID`, `AIRTEL_MONEY_CLIENT_SECRET`
2. **Webhook Endpoint Verification:**
   - Ensure the public reverse proxy routes `/api/v1/payments/webhook` to the backend cluster without blocking or modifying POST signatures.

---

## GATE-03: Cloudflare R2 CORS & Storage Policies

### Owner: DevOps / Cloudflare Administrator  
### Urgency: Required for Customer Browser Downloads  

When customers click "Download Movie" on [`/movies/[slug]`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/app/movies/%5Bslug%5D/page.tsx) or [`/library`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/app/library/page.tsx), the backend generates a 900-second SigV4 presigned URL pointing directly to Cloudflare R2.

1. **Bucket CORS Configuration:**
   - Confirm that the R2 media bucket allows `GET` requests from `giftedpromovies.com`:
     ```json
     [
       {
         "AllowedOrigins": ["https://giftedpromovies.com", "http://localhost:3000"],
         "AllowedMethods": ["GET", "HEAD"],
         "AllowedHeaders": ["*"],
         "ExposeHeaders": ["Content-Length", "Content-Disposition", "ETag"],
         "MaxAgeSeconds": 3600
       }
     ]
     ```

---

## GATE-04: BRELA & TRA Legal Entity Identifiers

### Owner: Legal Counsel / Managing Director  
### Urgency: Legal Compliance Prior to Public Commercial Operations  

The static legal pages (`/terms`, `/privacy`, `/refunds`) currently display placeholder disclaimers (`[PENDING_FINAL_EXECUTION]`) in compliance with legal guidance forbidding synthetic entity numbers.

1. **Company Incorporation Details:**
   - Retrieve the official Business Registration and Licensing Agency (BRELA) Certificate of Incorporation number.
2. **Tax Registration Numbers:**
   - Retrieve the official Tanzania Revenue Authority (TRA) Taxpayer Identification Number (TIN) and Value Added Tax (VAT) registration certificate.
3. **Execution Action:**
   - Author an approved update replacing placeholders with official registration numbers in:
     - `docs/legal/GPM-TERMS-OF-SERVICE-DRAFT.md`
     - `docs/legal/GPM-PRIVACY-POLICY-DRAFT.md`
     - `docs/legal/GPM-REFUND-POLICY-DRAFT.md`
     - Client legal page footers and headers.

---

## GATE-05: Staging Persona User Journey Sign-Off

### Owner: QA Lead / Product Owner  
### Urgency: Immediate Verification  

Execute full end-to-end verification using the newly deployed [`QuickLoginCards.tsx`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/auth/QuickLoginCards.tsx) and credentials documented in `docs/qa/GPM-TEST-ACCOUNT-READINESS.md`:

1. **Customer User Journey:**
   - Open `/login` -> Click **Customer Persona** card (`tester@giftedpromovies.com`).
   - Enter password -> Verify redirect to homepage with authenticated header.
   - Browse `/movies` -> Select title -> Click **Buy Title Access** -> Verify pre-purchase waiver.
   - Open profile dropdown -> Click **My Orders & Receipts** -> Verify order history at `/account/orders`.
   - Open profile dropdown -> Click **Registered Devices** -> Verify active device slot.
2. **Media Team User Journey:**
   - Click **Media Team Persona** card (`media@giftedpromovies.com`) -> Verify metadata and ingest preview access.
3. **Admin User Journey:**
   - Click **Admin Persona** card (`admin@giftedpromovies.com`) -> Verify administrative audit and catalog management.

---

# 3. CONCLUSION

Upon completion of these 5 operational gates, GIFTEDproMovies3 will be fully cleared for public production launch.
