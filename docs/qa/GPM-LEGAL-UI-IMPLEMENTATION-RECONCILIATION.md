# GIFTEDproMovies3 — Legal UI Implementation Reconciliation Report

**Document ID:** `docs/qa/GPM-LEGAL-UI-IMPLEMENTATION-RECONCILIATION.md`  
**Mission ID:** `GPM-LEGAL-UI-RECONCILIATION`  
**Authority:** Product Owner  
**Execution Mode:** STRICT READ-ONLY UI & CONTRACT AUDIT  
**Date:** 2026-11-05  
**Classification:** Frontend-to-Legal Implementation Reconciliation  
**Status:** COMPLETE AUDIT & GAP REGISTER — PRE-FRONTEND INTEGRATION GATE  

---

## 1. Executive Summary & Audit Context

This reconciliation audit was conducted to verify whether the actual customer frontend implementation matches the requirements specified in [`docs/frontend/LEGAL-UI-REQUIREMENTS-HANDOFF.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/frontend/LEGAL-UI-REQUIREMENTS-HANDOFF.md) and [`docs/frontend/UI-FIXES-AND-ALIGNMENT.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/frontend/UI-FIXES-AND-ALIGNMENT.md).

### Crucial Architectural Context:
Under formal Product Owner directives (`GPM-PHASE7-STAGE2-BACKEND` and `GPM-PRE-FRONTEND-REMEDIATION-PROGRAM`), **Customer Frontend Integration was explicitly DEFERRED until backend completion and separate authorization**.

Consequently, direct source code inspection of `src/` reveals that **the frontend remains in its Phase 6 mock prototype state**:
1. **Zero Legal Routes Exist:** None of the 6 required static legal pages (`/terms`, `/privacy`, `/cookies`, `/account-deletion`, `/refunds`, `/contact`) currently exist in `src/app/`.
2. **Zero Legal Links in Footer:** [`src/components/customer/CustomerFooter.tsx`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/customer/CustomerFooter.tsx) contains links to `/movies`, `/series`, `/djs`, `/admin`, and `/media-team`, but **zero links** to legal or privacy policies.
3. **No Terms Checkbox in Registration:** [`src/components/auth/RegisterForm.tsx`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/auth/RegisterForm.tsx) collects username, email, and password, but contains **no terms checkbox, no privacy link, and no 18+ age declaration**.
4. **Synthetic Browser Blob Downloads:** Both [`src/components/customer/LipaModal.tsx`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/customer/LipaModal.tsx#L76-L90) and [`src/app/movies/[slug]/page.tsx`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/app/movies/%5Bslug%5D/page.tsx#L84-L95) simulate downloads by generating local browser blobs (`new Blob(...)` / `URL.createObjectURL`), entirely bypassing the backend `POST /api/v1/download/authorize` contract and Cloudflare R2 presigned URLs.
5. **Simulated Payment & Guest Checkout:** [`src/components/customer/LipaModal.tsx`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/customer/LipaModal.tsx) allows guest checkout and generates random simulated receipt IDs (`TZS-XXXXXX`) using a 1.2-second `setTimeout`.

This report reconciles every touchpoint, resolves critical legal contract questions, and establishes the formal pre-integration gap register.

---

## 2. Critical Legal / UI Contract Determinations

The Product Owner specifically directed the verification of eight (8) foundational legal, commercial, and architectural questions:

### 2.1. Conflation of 24-Hour Download Retry Grace with Refund Deadlines
- **Question:** *Whether the 24-hour download retry grace has incorrectly been represented as a 24-hour refund/dispute deadline.*
- **Findings:** **YES, DOCUMENTATION CONFLATION CONFIRMED.**
  - **Technical Origin:** The 24-hour window is strictly a **media delivery telemetry mechanism** in backend `download_attempts` (`retry_grace_expires_at = attempt_created_at + 24 hours`), governed by ARCH-005, POD-05, and ADR-037. If a download fails due to network interruption, reporting `status: "FAILED"` to `POST /api/v1/download/report-delivery` allows the user to re-download the same title within 24 hours without consuming an additional quota slot.
  - **Legal Draft Reality:** In [`docs/legal/TERMS_OF_SERVICE_DRAFT.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/legal/TERMS_OF_SERVICE_DRAFT.md) §6.3, the commercial refund draft specifies a **seven (7) day reporting window** for defective content or billing errors.
  - **Documentation Error:** Prior QA and handoff documents (`LEGAL-UI-REQUIREMENTS-HANDOFF.md` §2 and `GPM-LEGAL-DOCUMENT-INVENTORY.md` §4.1) mistakenly blended these concepts, describing a "24-hour technical failure dispute window" for refunds.
  - **Classification:** **`DOCUMENTATION GAP`** & **`PRODUCT OWNER DECISION REQUIRED`**.
  - **Resolution:** The 24-hour window must be strictly confined to download delivery retries. The refund dispute window must be formally decided by the Product Owner (7 days per draft vs. custom SLA).

---

### 2.2. Customer-Facing Refund Endpoint vs. Administrative Endpoint
- **Question:** *Whether customer-facing refund functionality calls an authorized customer endpoint rather than an administrative endpoint.*
- **Findings:** **NEITHER ENDPOINT EXISTS IN CODE; BOTH ARE FICTIONS IN V1.**
  - **Backend Reality:** Grep of `backend/src/` confirms there is **no customer refund endpoint** and **no `POST /api/v1/admin/refunds/...` endpoint**.
  - **Architectural Decision (ADR-026):** ADR-026 explicitly states:  
    *“Refund and chargeback features excluded from V1 — DEFERRED... Preserve generic separation/audit/history/extensibility; do not design refund workflows or refund-specific state machines now.”*
  - **Documentation Error:** `docs/qa/GPM-LEGAL-TO-FRONTEND-TRACEABILITY.md` §3 listed `POST /admin/refunds/...` as a backend dependency for Touchpoint 11.
  - **Classification:** **`BACKEND CONTRACT GAP`** & **`DOCUMENTATION GAP`**.
  - **Resolution:** In V1, customer refunds are strictly an **offline, manual support/finance reconciliation workflow**. The customer UI must direct users to `support@giftedpromovies.com` and must not attempt to call any refund API endpoint.

---

### 2.3. Visible Draft Treatment of Legal Documents
- **Question:** *Whether all legal documents are visibly treated as drafts until approved.*
- **Findings:** **DRAFT IN REPO; NOT YET RENDERED IN UI.**
  - **Repository Status:** All 5 legal files in `docs/legal/` carry explicit status: `> **Status:** DRAFT — PENDING BUSINESS OWNER AND LEGAL REVIEW`.
  - **Frontend Status:** The frontend currently has no legal static routes. When `/terms`, `/privacy`, `/cookies`, `/account-deletion`, and `/refunds` are implemented during Phase 7 frontend integration, they must display an amber prominent disclaimer:  
    *“NOTICE: This document is a pre-release draft for testing and review purposes and does not yet constitute a binding commercial agreement.”* until formal legal counsel sign-off.
  - **Classification:** **`FRONTEND IMPLEMENTATION GAP`** & **`LEGAL COUNSEL CONFIRMATION REQUIRED`**.

---

### 2.4. Age Restrictions (18+) Approval Status
- **Question:** *Whether age restrictions are based on an approved business/legal policy.*
- **Findings:** **NO, IT IS AN UNRESOLVED BUSINESS DECISION.**
  - **Evidence:** [`docs/legal/LEGAL_REQUIREMENTS_AND_OPEN_DECISIONS.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/legal/LEGAL_REQUIREMENTS_AND_OPEN_DECISIONS.md) §2 (Checklist of Unresolved Business Decisions) line 59 explicitly records:  
    *“Minor / Age of Consent Threshold: Exact age restriction for service accounts (18 years vs 13+ with parental consent). Drafted as 18 years... Business owner to decide whether teenage access with parental supervision will be supported.”*
  - **Classification:** **`PRODUCT OWNER DECISION REQUIRED`**.
  - **Resolution:** The Product Owner must formally decide between:
    - *Option A:* Strict 18+ adult-only service;
    - *Option B:* 18+ with legal parental consent under the Tanzanian Law of the Child Act, 2009.

---

### 2.5. VAT-Inclusive Pricing and Tax Status
- **Question:** *Whether VAT-inclusive pricing is supported by approved finance/legal requirements.*
- **Findings:** **PREMATURE; PENDING CORPORATE ENTITY & TAX REGISTRATION.**
  - **Evidence:** [`docs/legal/LEGAL_REQUIREMENTS_AND_OPEN_DECISIONS.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/legal/LEGAL_REQUIREMENTS_AND_OPEN_DECISIONS.md) line 52 identifies corporate identity and VAT status as an unresolved placeholder (`[Company Legal Name]`). Under Tanzania Value Added Tax Act 2014 §28, VAT registration is mandatory only upon meeting the TZS 100,000,000 annual turnover threshold.
  - Stating on customer checkout cards that prices are *"Inclusive of VAT"* is legally hazardous if the operating company is not yet incorporated or VAT-registered with the Tanzania Revenue Authority (TRA).
  - **Classification:** **`FINANCE/MANAGEMENT CONFIRMATION REQUIRED`** & **`LEGAL COUNSEL CONFIRMATION REQUIRED`**.
  - **Resolution:** Until TRA VAT registration is confirmed, UI pricing should be labeled *"TSh 5,000 (Gross price / No additional payment fees)"* rather than explicitly citing VAT inclusion.

---

### 2.6. Privacy, Cookie and DPO Contact Verification
- **Question:** *Whether privacy, cookie and DPO disclosures match actual system behavior and verified business contact details.*
- **Findings:** **TECHNICAL BEHAVIOR COHERENT; CONTACT IDENTITIES ARE PLACEHOLDERS.**
  - **System Behavior:** Backend sets only `gifted_session` (30-day session) and `gp_oauth_state` (10-minute CSRF state). Zero third-party ad tracking cookies are set by the backend. This matches the draft Cookie Notice.
  - **Contact Placeholders:** `privacy@giftedpromovies.com`, `dpo@giftedpromovies.com`, and `support@giftedpromovies.com` are unprovisioned placeholders. No DPO has been formally designated or registered with the Tanzania Personal Data Protection Commission (PDPC).
  - **Classification:** **`DOCUMENTATION GAP`** & **`HUMAN ACTION REQUIRED`**.

---

### 2.7. Account Deletion: PII Erasure vs. Statutory Tax Retention
- **Question:** *Whether account deletion accurately explains retained statutory financial records without implying that all personal data is retained indefinitely.*
- **Findings:** **POLICY IS ACCURATE; UI IS MISSING.**
  - **Architecture Alignment:** In [`backend/scripts/cleanup-retention.mjs`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/backend/scripts/cleanup-retention.mjs) and ADR-027, account deletion scrubs personal identity (email is hashed to `deleted_<id>@anonymized.invalid`, password cleared, sessions dropped, devices dropped). Financial records (`orders`, `payment_settlements`) preserve only transaction amounts and dates for 7 years under TRA Tax Administration Act 2015 §35(3).
  - **Frontend Gap:** The frontend has no deletion UI or explanation. When implemented, the UI must explain:  
    *“Your personal profile, email, credentials, and devices will be permanently erased immediately. In compliance with Tanzanian tax law, past payment receipt amounts are preserved in anonymized form for 7 years.”*
  - **Classification:** **`FRONTEND IMPLEMENTATION GAP`**.

---

### 2.8. No-Auto-Renewal Representations vs. Actual Billing Behavior
- **Question:** *Whether no-auto-renewal representations match actual billing behavior.*
- **Findings:** **VERIFIED 100% ACCURATE.**
  - **Backend Reality:** Backend commercial models enforce fixed-term access grants (`validUntil = validFrom + planDuration`). There is no recurring billing cron, no stored payment card tokenization, and no recurring mobile money mandate in ClickPesa/PalmPesa. Every purchase is a one-off payment.
  - **Classification:** **`VERIFIED`**.

---

## 3. Requirement-by-Requirement Customer Touchpoint Audit (14 Touchpoints)

---

### Touchpoint 1: Registration and Account Creation
- **Required Component:** `RegisterForm.tsx` & `/register` page.
- **Actual File & Lines:** [`src/components/auth/RegisterForm.tsx:1-204`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/auth/RegisterForm.tsx#L1-L204); [`src/app/register/page.tsx:1-50`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/app/register/page.tsx#L1-L50).
- **Actual User-Visible Behavior:** Form accepts username, email, password, and confirm password. Enforces 6-character password minimum (lines 52-55). Has no terms checkbox, no privacy policy link, and no age restriction disclosure. Submits to `AuthContext.register` which simulates account creation in local state.
- **Backend API Contract Used:** NONE (Mock implementation). Bypasses `POST /api/v1/auth/register`.
- **Error & Loading States:** Basic local state error alert (lines 82-90). No handling of HTTP 429 rate limiting or verification pending states.
- **Accessibility & Keyboard Behavior:** Input labels present; form submittable via Enter key. Accessible via Tab.
- **Test Evidence:** Zero frontend tests. Backend has `backend/tests/rate-limiting.test.ts` (11/11 passing).
- **Remaining Gaps:**
  1. Add mandatory unchecked checkbox: *"I confirm I am at least 18 years old and agree to the [Terms of Service](/terms) and [Privacy Policy](/privacy)"*.
  2. Align password rules with backend (min 8 chars, uppercase, lowercase, number).
  3. Route to email verification pending screen upon successful registration.
  4. Bind to `POST /api/v1/auth/register` with 429 countdown timer.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`**.

---

### Touchpoint 2: Login and Authentication
- **Required Component:** `LoginForm.tsx` & `/login` page.
- **Actual File & Lines:** [`src/components/auth/LoginForm.tsx:1-223`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/auth/LoginForm.tsx#L1-L223); [`src/app/login/page.tsx:1-50`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/app/login/page.tsx#L1-L50).
- **Actual User-Visible Behavior:** Form collects email and password. Includes a "Remember me on this browser" checkbox and "Quick Demo Accounts" (Admin, Media Team, Customer) that auto-fill hardcoded passwords (`Windowseven77.`).
- **Backend API Contract Used:** NONE (Mock implementation). Reads/writes `giftedpro_auth_user` in `localStorage`. Bypasses `POST /api/v1/auth/login`.
- **Error & Loading States:** Local error alert; no handling of HTTP 403 `EMAIL_NOT_VERIFIED` or HTTP 429 countdown.
- **Accessibility & Keyboard Behavior:** Standard form navigation; focusable inputs and button.
- **Test Evidence:** Zero frontend tests. Backend has `backend/tests/session-management.test.ts`.
- **Remaining Gaps:**
  1. Display 14-day inactivity / 30-day max session duration notice.
  2. Handle 403 `EMAIL_NOT_VERIFIED` with resend verification link button.
  3. Remove demo accounts box from production client.
  4. Bind to `POST /api/v1/auth/login` and receive `gifted_session` cookie.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`**.

---

### Touchpoint 3: Google OAuth Authentication
- **Required Component:** `GoogleAuthButton.tsx` (in Login & Register forms).
- **Actual File & Lines:** **DOES NOT EXIST.**
- **Actual User-Visible Behavior:** No Google Sign-in button is displayed anywhere in the UI.
- **Backend API Contract Used:** Backend has verified endpoints `GET /api/v1/auth/google` and `/callback` (`backend/tests/google-oauth.test.ts`), but they are not linked in frontend.
- **Error & Loading States:** N/A.
- **Accessibility & Keyboard Behavior:** N/A.
- **Test Evidence:** Backend test suite only.
- **Remaining Gaps:**
  1. Create `GoogleAuthButton.tsx` conforming to Google Identity Branding Guidelines.
  2. Display scope transparency notice: *"We only receive your name and verified email address."*
  3. Handle Case C local email conflict notification.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`** & **`HUMAN ACTION REQUIRED`** (Google Consent Screen verification).

---

### Touchpoint 4: Privacy Notices and Consent
- **Required Component:** Static page `src/app/privacy/page.tsx`.
- **Actual File & Lines:** **DOES NOT EXIST.**
- **Actual User-Visible Behavior:** Navigating to `/privacy` returns HTTP 404 Not Found.
- **Backend API Contract Used:** Static page.
- **Error & Loading States:** 404 page.
- **Accessibility & Keyboard Behavior:** N/A.
- **Test Evidence:** None.
- **Remaining Gaps:** Create `src/app/privacy/page.tsx` rendering `PRIVACY_POLICY_DRAFT.md` with visible draft disclaimer banner and table of contents.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`**.

---

### Touchpoint 5: Cookie and Session Disclosures
- **Required Component:** Static page `src/app/cookies/page.tsx`.
- **Actual File & Lines:** **DOES NOT EXIST.**
- **Actual User-Visible Behavior:** Navigating to `/cookies` returns HTTP 404 Not Found.
- **Backend API Contract Used:** Static page.
- **Error & Loading States:** 404 page.
- **Accessibility & Keyboard Behavior:** N/A.
- **Test Evidence:** None.
- **Remaining Gaps:** Create `src/app/cookies/page.tsx` rendering `COOKIE_AND_SESSION_NOTICE_DRAFT.md` detailing `gifted_session`, `gp_oauth_state`, and zero third-party ad cookies.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`**.

---

### Touchpoint 6: Customer Profile & Device Management (POD-07)
- **Required Component:** `/account/devices` & `/account/security`.
- **Actual File & Lines:** **DOES NOT EXIST.** (Only customer tabs are in `src/app/library/page.tsx`).
- **Actual User-Visible Behavior:** Customer has no interface to view registered devices, inspect device limits, or deregister devices.
- **Backend API Contract Used:** Backend endpoints `GET /api/v1/devices` and `DELETE /api/v1/devices/:id` verified in `backend/tests/device-limits.integration.test.ts` (15/15 passing), but not integrated.
- **Error & Loading States:** N/A.
- **Accessibility & Keyboard Behavior:** N/A.
- **Test Evidence:** Backend test suite only.
- **Remaining Gaps:** Create device management tab displaying POD-07 derived capacity (`MAX(device_limit)`), current device indicator, and deregistration modal with session revocation warning.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`**.

---

### Touchpoint 7: Account Deactivation and Deletion
- **Required Component:** Static route `/account-deletion` & `DangerZone.tsx` in account settings.
- **Actual File & Lines:** **DOES NOT EXIST.**
- **Actual User-Visible Behavior:** Navigating to `/account-deletion` returns HTTP 404 Not Found. No in-app deletion option exists.
- **Backend API Contract Used:** Backend retention script `backend/scripts/cleanup-retention.mjs` executes non-cascading pseudonymization (ADR-027).
- **Error & Loading States:** N/A.
- **Accessibility & Keyboard Behavior:** N/A.
- **Test Evidence:** Backend retention test suite only.
- **Remaining Gaps:**
  1. Create `/account-deletion` informational page.
  2. Implement high-friction Danger Zone requiring password and typing `"DELETE MY ACCOUNT"`.
  3. Explain 7-year tax records retention without implying indefinite PII storage.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`** & **`BACKEND CONTRACT GAP`** (Need formal customer deletion route binding).

---

### Touchpoint 8: Customer Library and Content Licensing
- **Required Component:** `src/app/library/page.tsx`.
- **Actual File & Lines:** [`src/app/library/page.tsx:1-240`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/app/library/page.tsx#L1-L240).
- **Actual User-Visible Behavior:** Displays mock passes and mock entitlements from `customerData.ts`. No personal non-commercial license banner. No "One-Time Pass (Does not auto-renew)" badge.
- **Backend API Contract Used:** Mock only. Does not query `GET /api/v1/commercial/me/library`.
- **Error & Loading States:** No loading skeletons; immediately renders static mock data.
- **Accessibility & Keyboard Behavior:** Tabs and buttons are focusable and navigable.
- **Test Evidence:** Zero frontend tests.
- **Remaining Gaps:** Bind to `GET /api/v1/commercial/me/library`; display personal viewing license banner; display "Does not auto-renew" badge on passes.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`**.

---

### Touchpoint 9: Download Authorization and Restrictions (POD-08 Option A)
- **Required Component:** `DownloadButton.tsx` & `src/app/movies/[slug]/page.tsx`.
- **Actual File & Lines:** [`src/app/movies/[slug]/page.tsx:84-95, 417-444`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/app/movies/%5Bslug%5D/page.tsx#L84-L95); [`src/components/customer/LipaModal.tsx:76-90`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/customer/LipaModal.tsx#L76-L90).
- **Actual User-Visible Behavior:** Generates a synthetic mock MP4 file using browser memory (`new Blob(...)`) and triggers simulated download! Does not display remaining download quota (`UNIQUE_TITLES`). Does not enforce device limits. Does not show copyright redistribution disclaimer.
- **Backend API Contract Used:** COMPLETELY BYPASSED. Does not call `POST /api/v1/download/authorize` or `POST /api/v1/download/report-delivery`.
- **Error & Loading States:** None (instant fake download).
- **Accessibility & Keyboard Behavior:** Buttons are keyboard accessible.
- **Test Evidence:** Zero frontend tests. Backend verified in `download-authorization.integration.test.ts`.
- **Remaining Gaps:**
  1. Remove `new Blob()` synthetic downloads.
  2. Bind to `POST /api/v1/download/authorize` (Cloudflare R2 presigned URLs with 900s TTL).
  3. Display plan quota from `GET /api/v1/download/licenses`.
  4. Submit telemetry to `POST /api/v1/download/report-delivery` (`COMPLETED` or `FAILED`).
  5. Offer 24-hour retry grace upon network failure.
  6. Add copyright redistribution warning.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`**.

---

### Touchpoint 10: Payment and Order Confirmation
- **Required Component:** `LipaModal.tsx` (`src/components/customer/LipaModal.tsx`).
- **Actual File & Lines:** [`src/components/customer/LipaModal.tsx:1-353`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/customer/LipaModal.tsx#L1-L353).
- **Actual User-Visible Behavior:** Modal allows guest checkout (lines 129-142). Telco selection and phone number input trigger a 1.2-second simulated delay, generating a fake receipt number (`TZS-XXXXXX`). Lacks plain-language "No Auto-Renewal" badge. Lacks tax disclosure. Lacks pre-purchase digital waiver.
- **Backend API Contract Used:** Mock only. Does not call `POST /api/v1/orders` or `POST /api/v1/orders/:id/checkout`.
- **Error & Loading States:** Simulated spinner only. No payment gateway timeout or retry recovery.
- **Accessibility & Keyboard Behavior:** Accessible via keyboard; closes on Escape or backdrop click.
- **Test Evidence:** Zero frontend tests. Backend payment state machine verified in `commercial-runtime.test.ts`.
- **Remaining Gaps:**
  1. Disallow guest checkout (require customer authentication).
  2. Bind to `POST /api/v1/orders` and `/checkout`.
  3. Add "One-Time Payment • No Auto-Renewal" badge.
  4. Add pre-purchase digital waiver notice.
  5. Add gross pricing clarity.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`**.

---

### Touchpoint 11: Refund and Cancellation Information (ADR-026)
- **Required Component:** Route `/refunds` & pre-purchase waiver in `LipaModal.tsx`.
- **Actual File & Lines:** Route does NOT exist. `LipaModal.tsx` lacks waiver.
- **Actual User-Visible Behavior:** 404 Not Found on `/refunds`. No refund policy disclosed in checkout.
- **Backend API Contract Used:** None. ADR-026 deferred automated refund endpoints from V1.
- **Error & Loading States:** 404.
- **Accessibility & Keyboard Behavior:** N/A.
- **Test Evidence:** None.
- **Remaining Gaps:**
  1. Create `/refunds` route explaining that digital goods are non-refundable once accessed, with support dispute instructions for technical failures.
  2. Render pre-purchase digital delivery waiver above "Pay Now" button in `LipaModal.tsx`.
  3. Product Owner decision required to standardize dispute reporting window (7 days per draft vs custom).
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`** & **`PRODUCT OWNER DECISION REQUIRED`**.

---

### Touchpoint 12: Copyright and Content Attribution
- **Required Component:** `src/app/movies/[slug]/page.tsx:235-301`.
- **Actual File & Lines:** [`src/app/movies/[slug]/page.tsx:235-301`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/app/movies/%5Bslug%5D/page.tsx#L235-L301).
- **Actual User-Visible Behavior:** Displays DJ voice artist tabs (DJ Afro, DJ Murphy, DJ Smith) with edition pricing. Mentions Swahili commentary edition.
- **Backend API Contract Used:** Mock only (`getMovieBySlug` from `customerData.ts`).
- **Error & Loading States:** 404 `notFound()` if slug does not match mock data.
- **Accessibility & Keyboard Behavior:** Edition buttons are focusable with active styles.
- **Test Evidence:** Zero frontend tests. Backend returns editions via `GET /api/v1/catalog/titles/:slug`.
- **Remaining Gaps:**
  1. Bind to backend catalog API.
  2. Add copyright notice and infringement takedown link (`legal@giftedpromovies.com`) in footer.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`**.

---

### Touchpoint 13: Contact, Complaints and Support
- **Required Component:** Static route `/contact`.
- **Actual File & Lines:** **DOES NOT EXIST.**
- **Actual User-Visible Behavior:** Navigating to `/contact` returns HTTP 404 Not Found.
- **Backend API Contract Used:** Static page.
- **Error & Loading States:** 404.
- **Accessibility & Keyboard Behavior:** N/A.
- **Test Evidence:** None.
- **Remaining Gaps:** Create `/contact` route listing support, privacy, and legal contact channels, with dispute escalation information.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`** & **`DOCUMENTATION GAP`** (Placeholder phone and address).

---

### Touchpoint 14: Persistent Footer Legal Links and Accessibility
- **Required Component:** `CustomerFooter.tsx` (`src/components/customer/CustomerFooter.tsx`).
- **Actual File & Lines:** [`src/components/customer/CustomerFooter.tsx:1-158`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/customer/CustomerFooter.tsx#L1-L158).
- **Actual User-Visible Behavior:** Renders brand manifesto, Discovery links, DJ links, supported telcos, and staff links (`/admin`, `/media-team`). **ZERO legal links exist.**
- **Backend API Contract Used:** None (Client layout).
- **Error & Loading States:** N/A.
- **Accessibility & Keyboard Behavior:** Existing links are keyboard focusable.
- **Test Evidence:** None.
- **Remaining Gaps:** Add legal links row/column with accessible links to `/terms`, `/privacy`, `/cookies`, `/account-deletion`, `/refunds`, `/contact`.
- **Classification:** **`FRONTEND IMPLEMENTATION GAP`**.

---

## 4. Master Requirement-by-Requirement Acceptance Matrix

| # | Touchpoint Name | Expected Legal UI Requirement | Actual Implementation File & Line | Current UI State | Status Classification |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **01** | Registration & Age | 18+ declaration, Terms/Privacy checkbox | `src/components/auth/RegisterForm.tsx:1-204` | Checkbox missing; 6-char password; mock state | **FRONTEND IMPLEMENTATION GAP** |
| **02** | Login & Sessions | 14d/30d session disclosure, 429 countdown | `src/components/auth/LoginForm.tsx:1-223` | Disclosure missing; demo accounts; mock state | **FRONTEND IMPLEMENTATION GAP** |
| **03** | Google OAuth | Google branding, scope notice, Case C conflict | None (Component missing) | Missing from UI | **FRONTEND IMPLEMENTATION GAP** |
| **04** | Privacy Policy | Dedicated `/privacy` route with PDPA terms | None (`src/app/privacy/` missing) | HTTP 404 Not Found | **FRONTEND IMPLEMENTATION GAP** |
| **05** | Cookie Notice | Dedicated `/cookies` route (no ad trackers) | None (`src/app/cookies/` missing) | HTTP 404 Not Found | **FRONTEND IMPLEMENTATION GAP** |
| **06** | Device Management | POD-07 limits display, device removal | None (`/account/devices` missing) | Missing from UI | **FRONTEND IMPLEMENTATION GAP** |
| **07** | Account Deletion | `/account-deletion` route & DangerZone modal | None (`src/app/account-deletion/` missing) | HTTP 404 Not Found | **FRONTEND IMPLEMENTATION GAP** |
| **08** | Library & Licensing | Non-commercial banner, "No Auto-Renewal" | `src/app/library/page.tsx:1-240` | Disclaimers missing; mock passes | **FRONTEND IMPLEMENTATION GAP** |
| **09** | Offline Downloads | R2 signed URLs, quota display, telemetry | `src/app/movies/[slug]/page.tsx:84-95` | `new Blob()` synthetic download | **FRONTEND IMPLEMENTATION GAP** |
| **10** | Checkout & Orders | Gross pricing, "No Auto-Renewal", USSD guide | `src/components/customer/LipaModal.tsx:1-353` | Guest checkout; simulated `setTimeout` receipt | **FRONTEND IMPLEMENTATION GAP** |
| **11** | Refund Policy | Dedicated `/refunds` route, checkout waiver | None (`src/app/refunds/` missing) | HTTP 404 Not Found | **FRONTEND IMPLEMENTATION GAP** |
| **12** | Voice Artists | DJ attribution, `/copyright` takedown link | `src/app/movies/[slug]/page.tsx:235-301` | DJ tabs present (mock); no copyright link | **FRONTEND IMPLEMENTATION GAP** |
| **13** | Contact & DPO | Dedicated `/contact` route with channels | None (`src/app/contact/` missing) | HTTP 404 Not Found | **FRONTEND IMPLEMENTATION GAP** |
| **14** | Footer Legal Links | Persistent links to all 6 legal routes | `src/components/customer/CustomerFooter.tsx` | All 6 legal links completely missing | **FRONTEND IMPLEMENTATION GAP** |

---

## 5. Summary of Gaps by Accountability Classification

### 1. FRONTEND IMPLEMENTATION GAP (In-Scope for Phase 7 Frontend Integration)
- Create 6 static legal routes: `/terms`, `/privacy`, `/cookies`, `/account-deletion`, `/refunds`, `/contact`.
- Add legal navigation links to `src/components/customer/CustomerFooter.tsx`.
- Add mandatory unchecked 18+ and Terms/Privacy acceptance checkbox to `src/components/auth/RegisterForm.tsx`.
- Replace `new Blob()` synthetic downloads in `MovieDetailPage` and `LipaModal` with real `POST /api/v1/download/authorize` and Cloudflare R2 delivery.
- Replace simulated `setTimeout` checkout in `LipaModal.tsx` with authenticated `POST /api/v1/orders` and `/checkout`.
- Remove guest checkout paths.
- Display "One-Time Pass • No Auto-Renewal" badge on checkout and library screens.
- Implement `/account/devices` with POD-07 effective limit resolution and device deregistration.
- Intercept HTTP 503 `STREAMING_COMING_SOON` in `VideoPlayer.tsx` with branded Phase 8 card.

### 2. BACKEND CONTRACT GAP
- The referenced `POST /admin/refunds/...` endpoint does not exist and must be removed from documentation (ADR-026 manual process).
- Bind customer deletion to formal backend retention controller.

### 3. PRODUCT OWNER DECISION REQUIRED
- Formally resolve age threshold policy: Strict 18+ vs. 18+ with legal parental consent.
- Standardize customer dispute reporting window (7 days per Terms draft vs. custom SLA), eliminating the 24-hour retry grace conflation.
- Authorize Phase 7 Customer Frontend Integration commencement.

### 4. LEGAL COUNSEL CONFIRMATION REQUIRED
- Replace corporate entity placeholders (`[Company Legal Name]`, `[Registered Address]`, `[Registration Number]`).
- Confirm exact statutory tax retention window (5 vs 7 years under TRA).
- Review and approve draft legal policies for formal publication on production domain.

### 5. FINANCE / MANAGEMENT CONFIRMATION REQUIRED
- Confirm TRA VAT registration status before authorizing "Inclusive of VAT" claims on checkout.
- Onboard with live payment aggregator (ClickPesa / AzamPay) for production mobile money merchant credentials.

### 6. VERIFIED
- No-auto-renewal representations match actual backend billing behavior (one-off passes only; zero recurring charge logic).
- Non-cascading pseudonymization (ADR-027) correctly separates PII erasure from 7-year statutory financial record retention.

---
*End of GPM-LEGAL-UI-IMPLEMENTATION-RECONCILIATION.*
