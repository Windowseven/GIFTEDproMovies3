# GIFTEDproMovies3 — Phase 7 Frontend Legal & Compliance Requirements Handoff

**Document ID:** `docs/frontend/LEGAL-UI-REQUIREMENTS-HANDOFF.md`  
**Mission ID:** `GPM-LEGAL-TO-FRONTEND-READINESS`  
**Target Milestone:** Phase 7 Customer Frontend Integration  
**Authority:** Product Owner  
**Date:** 2026-11-05  
**Classification:** Frontend Engineering Specification  
**Status:** READY FOR FRONTEND INTEGRATION  

---

## 1. Purpose & Scope

This document serves as the authoritative implementation handoff for the Frontend Engineering Team. It outlines every user interface component, static route, modal dialog, form validation check, error banner, and legal disclosure required to make the GIFTEDproMovies customer web application compliant with:
- The authoritative project legal drafts (`docs/legal/`);
- Accepted Product Owner decisions (POD-07, POD-08 Option A, ADR-018, ADR-026, ADR-027, ADR-032);
- Applicable Tanzanian statutory regulations (PDPA 2022, Cybercrimes Act, Fair Competition Act).

Frontend engineers must implement these requirements during Phase 7 Customer Frontend Integration without altering verified backend contracts.

---

## 2. Dedicated Legal Static Routes to Create

The frontend application must provide clean, accessible, responsive static pages for the following routes:

| Route | Target File Path | Content Source | Key Elements to Render |
| :--- | :--- | :--- | :--- |
| `/terms` | `src/app/terms/page.tsx` | `docs/legal/TERMS_OF_SERVICE_DRAFT.md` | Table of contents, bilingual headings (Swahili/English), 18+ eligibility, non-commercial viewing license, download restrictions, Tanzanian governing law. |
| `/privacy` | `src/app/privacy/page.tsx` | `docs/legal/PRIVACY_POLICY_DRAFT.md` | Data minimization disclosure, lawful processing bases (PDPA 2022), data subject rights (access, erasure), DPO contact card (`privacy@giftedpromovies.com`). |
| `/cookies` | `src/app/cookies/page.tsx` | `docs/legal/COOKIE_AND_SESSION_NOTICE_DRAFT.md` | Zero 3rd-party advertising cookies statement, first-party cookie breakdown table (`gifted_session`, `gp_oauth_state`), local storage disclosure. |
| `/account-deletion` | `src/app/account-deletion/page.tsx` | `docs/legal/ACCOUNT_AND_DATA_DELETION_POLICY_DRAFT.md` | Public explanation of erasure rights, account de-identification, forfeiture of active passes, 7-year statutory financial record retention explanation, link to in-app settings. |
| `/refunds` | `src/app/refunds/page.tsx` | `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §7 & ADR-026 | Immediate digital delivery waiver notice, 24-hour technical failure dispute window, step-by-step dispute filing instructions to `support@giftedpromovies.com`. |
| `/contact` | `src/app/contact/page.tsx` | `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §10 | Support email (`support@giftedpromovies.com`), Privacy email (`privacy@giftedpromovies.com`), Legal notice email (`legal@giftedpromovies.com`), dispute escalation info. |

---

## 3. Component-by-Component Legal UI Implementation Specifications

---

### Component A: `RegisterModal.tsx` (`src/components/auth/RegisterModal.tsx`)

#### 1. Mandatory Acceptance Checkbox
- **UI Element:** Checkbox input with required validation state.
- **Label Text:**
  ```html
  <span>
    I confirm that I am at least 18 years old (or have parental consent) and I agree to the
    <a href="/terms" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Terms of Service</a>
    and
    <a href="/privacy" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">Privacy Policy</a>.
  </span>
  ```
- **Validation Rule:** The "Create Account" submit button MUST remain disabled (`disabled={!acceptedTerms}`) until the checkbox is checked.
- **Form State:** Form values must not reset if the user clicks the legal links.

#### 2. Email Verification Notice Screen
- **Trigger:** On successful `POST /api/v1/auth/register` (201 Created).
- **UI State:** Transition modal to "Verification Sent" state:
  - Header: *"Check your email"*
  - Body: *"We've sent a verification link to **{userEmail}**. Please click the link to activate your account and start watching."*
  - Action: "Resend Verification Email" button (rate-limited via `POST /api/v1/auth/resend-verification`).

---

### Component B: `LoginModal.tsx` (`src/components/auth/LoginModal.tsx`)

#### 1. Session Lifetime Disclosure
- **Helper Text:** Place below password field in muted small text:
  *"Signing in keeps you logged in for 14 days of inactivity (or 30 days max)."*

#### 2. Unverified Account State Handling
- **Trigger:** Backend returns HTTP 403 with `error.code === 'EMAIL_NOT_VERIFIED'`.
- **UI State:** Render inline amber alert:
  - *"Your email address has not been verified yet."*
  - Button: *"Resend Verification Link"* (triggers `/api/v1/auth/resend-verification`).

#### 3. Rate Limit Timer (429)
- **Trigger:** Backend returns HTTP 429 with `Retry-After: <seconds>`.
- **UI State:** Disable submit button, display countdown: *"Too many login attempts. Please wait {countdown}s before trying again."*

---

### Component C: `GoogleAuthButton.tsx` (`src/components/auth/GoogleAuthButton.tsx`)

#### 1. Google Identity Branding Guidelines
- Use official Google SVG logo with authentic colored 'G' or white on dark button.
- Button text: *"Continue with Google"* or *"Sign in with Google"*.
- Do not alter official aspect ratios or padding.

#### 2. Scope & Transparency Notice
- Tooltip or caption below button:
  *"We only receive your name and verified email address. We never post to your Google account."*

#### 3. Account Conflict Resolution (Case C)
- If OAuth callback returns error indicating email exists locally (`EMAIL_EXISTS_LOCAL_AUTH`):
  Display notification modal: *"An account with this email was registered using a password. Please sign in with your password to access your account."*

---

### Component D: `LipaModal.tsx` / Commercial Checkout (`src/components/customer/LipaModal.tsx`)

#### 1. Price & Currency Transparency (Fair Competition Act)
- Display prices prominently in Tanzanian Shillings: e.g. `TSh 5,000` or `5,000 TZS`.
- Explicit tax notice below price: *"Price includes all applicable statutory taxes (VAT)."*

#### 2. Plain-Language "No Auto-Renewal" Badge
- Render a distinct badge or notice:
  *"One-Time Access Pass • Does NOT renew automatically • No recurring charges."*

#### 3. Statutory Digital Waiver Notice (ADR-026)
- Render directly above the "Pay Now" / "Lipa Sasa" button:
  ```html
  <p class="text-xs text-muted-foreground mt-2">
    By confirming payment, you authorize immediate access and agree that digital passes
    cannot be cancelled or refunded once content playback or download has started.
    If you experience a technical failure preventing access, you may dispute the transaction
    with support@giftedpromovies.com within 24 hours.
  </p>
  ```

#### 4. USSD Mobile Money Prompt Guidance
- After clicking submit:
  - Transition to waiting state with animated phone illustration.
  - Text: *"Check your mobile handset for the push prompt. Enter your Mobile Money PIN to complete payment."*
  - Notice: *"GIFTEDproMovies never requests, sees, or stores your secret PIN."*
  - Automated status polling against `GET /api/v1/orders/:orderId`.

---

### Component E: `DownloadButton.tsx` & Offline Delivery (`src/components/movie/DownloadButton.tsx`)

#### 1. Quota & Policy Display (POD-08 Option A)
- Display remaining quota badges derived from `GET /api/v1/download/licenses`:
  *"Downloads: {quota.remaining} of {quota.limit} remaining ({quota.policyType})"*.
- If `quota.remaining === 0`:
  - Disable button.
  - On hover or click: show modal: *"Download limit reached for this pass. Upgrade your pass or wait for pass renewal to download more titles."*

#### 2. Cloudflare R2 Direct Download Execution
- On click: call `POST /api/v1/download/authorize` with `{ editionId, deviceId }`.
- Backend returns `{ downloadUrl, attemptId, expiresInSeconds: 900 }`.
- Initiate direct browser download via invisible anchor (`<a href={downloadUrl} download={fileName} />`).

#### 3. Delivery Outcome Telemetry
- Listen for download stream completion or error:
  - If success: send `POST /api/v1/download/report-delivery` with `{ attemptId, status: "COMPLETED" }`.
  - If network disconnect / error: send `{ attemptId, status: "FAILED" }`.
  - On failure, show amber banner: *"Download was interrupted. You have 24 hours to retry downloading this movie without using an additional quota slot."*

#### 4. Copyright & Personal Use Disclaimer
- Microcopy below download progress:
  *"Downloaded files are strictly for your personal, offline entertainment on this registered device. Redistribution, broadcasting, or file copying is strictly prohibited."*

---

### Component F: `DeviceManagementTab.tsx` (`src/components/customer/DeviceManagementTab.tsx`)

#### 1. POD-07 Effective Limit Display
- Fetch from `GET /api/v1/devices`.
- Display capacity bar: *"Registered Devices: {currentCount} / {effectiveLimit} allowed"*.
- List each registered device: Friendly Name, Device Type (Desktop, Mobile, Browser), Registered At date, and Last Seen date.
- Show "Current Device" badge next to active device.

#### 2. Capacity Constraint UI
- If `currentCount >= effectiveLimit`:
  - Show warning banner: *"Device limit reached. To watch or download on a new device, you must first remove one of your existing registered devices below."*

#### 3. Device Deregistration Confirmation
- Clicking "Remove Device" launches modal:
  *"Are you sure you want to remove '{deviceName}'? This will immediately log out that device and invalidate any offline download authorization tokens on it."*
- Calls `DELETE /api/v1/devices/:id`.

---

### Component G: `DangerZone.tsx` & Account Deletion (`src/components/customer/DangerZone.tsx`)

#### 1. In-App Deletion Section
- Located at bottom of `/account/security`.
- Red-bordered card titled *"Delete Account & Personal Data"*.

#### 2. Multi-Step Confirmation Modal
- **Warning Step:**
  - *"Warning: This action cannot be undone."*
  - *"Any active passes or downloads will be immediately forfeited without refund."*
  - *"In accordance with Tanzanian tax law, past payment receipts and transaction records are retained in pseudonymized form for 7 years."*
- **Verification Step:**
  - Input: Current Password.
  - Confirmation text: Must type `"DELETE MY ACCOUNT"` exactly.
  - Submit button: *"Permanently Delete Account"*.
- **Post-Action:** Calls `POST /api/v1/auth/delete-account`, clears local browser state, redirects to `/` with toast notification.

---

### Component H: `VideoPlayer.tsx` & Phase 8 Streaming Lockout (`src/components/video/VideoPlayer.tsx`)

#### 1. HTTP 503 Interception
- When attempting video playback: backend returns HTTP 503 Service Unavailable with `error.code: "STREAMING_COMING_SOON"`.
- Video player must intercept this code and replace video canvas with authorized branded card:
  - Title: *"Streaming Launches in Phase 8"*
  - Body: *"Web streaming is currently in pre-release testing. Your pass includes instant offline downloads. Click below to download this movie for offline viewing."*
  - Action Button: *"Download Movie Now"* (focuses Download button).

---

### Component I: `Footer.tsx` (`src/components/common/Footer.tsx`)

#### 1. Persistent Global Footer Links
Must be present on every page:
```html
<footer class="border-t border-border bg-background py-8">
  <div class="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
    <div class="text-sm text-muted-foreground">
      &copy; 2026 GIFTEDproMovies. All rights reserved.
    </div>
    <nav class="flex flex-wrap gap-6 text-sm text-muted-foreground">
      <a href="/terms" class="hover:text-foreground">Terms of Service</a>
      <a href="/privacy" class="hover:text-foreground">Privacy Policy</a>
      <a href="/cookies" class="hover:text-foreground">Cookie Notice</a>
      <a href="/account-deletion" class="hover:text-foreground">Account Deletion</a>
      <a href="/refunds" class="hover:text-foreground">Refund Policy</a>
      <a href="/contact" class="hover:text-foreground">Contact & Support</a>
    </nav>
  </div>
</footer>
```

---

## 4. Frontend Acceptance & Verification Checklist

During Phase 7 Customer Frontend Integration, QA will verify:
- [ ] `/terms`, `/privacy`, `/cookies`, `/account-deletion`, `/refunds`, `/contact` routes render without runtime errors.
- [ ] Registration requires checking the 18+ and Terms/Privacy acceptance checkbox before submitting.
- [ ] Google OAuth button adheres to Google Identity Branding guidelines and displays privacy notice.
- [ ] Checkout modal (`LipaModal`) displays tax-inclusive pricing, "No Auto-Renewal" notice, and ADR-026 digital delivery waiver.
- [ ] Download button displays accurate remaining quota (`UNIQUE_TITLES`), handles direct R2 signed links, and reports delivery telemetry (`COMPLETED`/`FAILED`).
- [ ] Device management renders active device slots according to POD-07 resolution and provides device removal with session invalidation warning.
- [ ] Video player handles HTTP 503 `STREAMING_COMING_SOON` with branded Phase 8 placeholder.
- [ ] Account deletion modal requires password and explicit text confirmation, while explaining 7-year tax records retention.
- [ ] Global footer contains all 6 legal links on all viewport sizes.

---
*End of LEGAL-UI-REQUIREMENTS-HANDOFF.*
