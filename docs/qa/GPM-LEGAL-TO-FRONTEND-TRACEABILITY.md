# GIFTEDproMovies3 — Legal-to-Frontend Traceability Matrix

**Document ID:** `docs/qa/GPM-LEGAL-TO-FRONTEND-TRACEABILITY.md`  
**Mission ID:** `GPM-LEGAL-TO-FRONTEND-READINESS`  
**Authority:** Product Owner  
**Date:** 2026-11-05  
**Status:** COMPLETE TRACEABILITY AUDIT — AUTHORIZED PRE-FRONTEND GATE  

---

## 1. Traceability Architecture & Objectives

This document establishes the exhaustive, bidirectional mapping between every legal policy, regulatory rule, copyright restriction, and privacy requirement in the GIFTEDproMovies3 documentation and its concrete user interface representation.

When Phase 7 Customer Frontend Integration commences, frontend developers and UI engineers must follow these exact behavioral contracts to ensure that the customer interface is legally compliant, transparent, and aligned with backend security controls.

### Status Classification Key:
- **`VERIFIED & READY FOR FRONTEND`**: Technical rule, backend contract, and UI requirement are completely aligned and ready for UI implementation.
- **`FRONTEND IMPLEMENTATION REQUIRED`**: UI component or screen must be created or updated during frontend integration.
- **`BACKEND DEPENDENCY`**: Frontend behavior relies on a verified Fastify backend endpoint.
- **`HUMAN ACTION REQUIRED`**: Requires human operational, legal, or administrative action prior to commercial launch.

---

## 2. Customer Touchpoint Traceability Matrix (14 Touchpoints)

---

### Touchpoint 1: Registration and Account Creation

- **Source Document & Clause:**  
  `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §2 ("Akaunti na Ustahiki / Account Eligibility");  
  `docs/legal/PRIVACY_POLICY_DRAFT.md` §3 ("Taarifa Tunazokusanya / Information We Collect");  
  Law of the Child Act, 2009 (Tanzania).
- **Approval Status:** Technical requirements approved; legal draft text pending corporate entity finalization.
- **Target Frontend Component:**  
  `src/components/auth/RegisterModal.tsx` & `/register` page.
- **Required UI Behavior & User Experience:**
  1. **Mandatory Acceptance Checkbox:** Checkbox element that must be checked before the "Create Account" button is enabled:  
     *"I confirm that I am at least 18 years old (or have parental consent) and I agree to the [Terms of Service](/terms) and [Privacy Policy](/privacy)."*
  2. **Active Links:** Links to `/terms` and `/privacy` must open in a new tab or modal without clearing form inputs.
  3. **Data Minimization:** Registration form must collect *only* Name, Email, and Password. No phone number or credit card required at registration.
  4. **Password Strength Meter:** Live indicator enforcing min 8 characters, uppercase, lowercase, and number.
  5. **Email Verification Notice:** On successful submission, redirect to verification pending screen: *"We sent a verification link to your email. Please verify your email before accessing your account."*
  6. **Rate Limit Handling (429):** Show countdown timer and disable submit button if 5 attempts / 60s is exceeded.
- **Backend API Dependency:**  
  `POST /api/v1/auth/register` (Returns 201 Created; rate-limited).
- **Automated Test / Acceptance Criterion:**  
  Suite: `backend/tests/rate-limiting.test.ts`; `backend/tests/auth.test.ts`.  
  Acceptance: Unchecked checkbox prevents submission; submit invokes `/api/v1/auth/register`; receives 201.
- **Responsible Human Approver:** Legal Counsel (age verification text) & Product Owner.

---

### Touchpoint 2: Login and Authentication

- **Source Document & Clause:**  
  `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §3 ("Usalama wa Akaunti / Account Security");  
  `docs/legal/COOKIE_AND_SESSION_NOTICE_DRAFT.md` §2.1 (`gifted_session`).
- **Approval Status:** Verified and approved in Phase 7 Stage 2.
- **Target Frontend Component:**  
  `src/components/auth/LoginModal.tsx` & `/login` page.
- **Required UI Behavior & User Experience:**
  1. **Credential Inputs:** Email and Password fields with clear error handling.
  2. **Unverified Account Routing:** If backend returns `EMAIL_NOT_VERIFIED` (403), UI displays banner with "Resend Verification Email" action button.
  3. **Session Expiry Disclosure:** Informational helper text under login: *"By signing in, your session remains active for 14 days of inactivity (or 30 days maximum)."*
  4. **Forgot Password Link:** Clear navigation to `/forgot-password` modal.
  5. **Rate Limiting (429):** If 5 failed attempts in 60s occur, display: *"Too many login attempts. Please wait X seconds before trying again."*
- **Backend API Dependency:**  
  `POST /api/v1/auth/login` (Sets `HttpOnly` `gifted_session` cookie).
- **Automated Test / Acceptance Criterion:**  
  Suite: `backend/tests/rate-limiting.test.ts`, `backend/tests/session-management.test.ts`.  
  Acceptance: Valid credentials receive 200 OK + `Set-Cookie: gifted_session`; invalid receives 401.
- **Responsible Human Approver:** QA Lead & Product Owner.

---

### Touchpoint 3: Google OAuth Authentication

- **Source Document & Clause:**  
  `docs/legal/PRIVACY_POLICY_DRAFT.md` §3.2 ("Taarifa kutoka kwa Wengine / Third-Party Info");  
  `docs/legal/COOKIE_AND_SESSION_NOTICE_DRAFT.md` §2.2 (`gp_oauth_state`);  
  Google API Services User Data Policy.
- **Approval Status:** Backend complete; live browser handoff requires testing on official domain.
- **Target Frontend Component:**  
  `src/components/auth/GoogleAuthButton.tsx` (in Login & Register modals).
- **Required UI Behavior & User Experience:**
  1. **Google Identity Branding Compliance:** Must strictly comply with Google Identity Branding Guidelines (correct font, Google 'G' logo, neutral or standard dark styling; button text: *"Continue with Google"* or *"Sign in with Google"*).
  2. **Scope Disclosure:** Text near button: *"We only access your basic profile information (name and verified email address). We never post to your account."*
  3. **OAuth CSRF State:** Initiates navigation to `GET /api/v1/auth/google`, which sets `gp_oauth_state` (10-minute lifetime).
  4. **Account Linking / Conflict Handling:** If email already exists via local password registration (Case C), display user-friendly message: *"An account with this email already exists. Please log in with your password to link Google sign-in."*
- **Backend API Dependency:**  
  `GET /api/v1/auth/google`; `GET /api/v1/auth/google/callback`.
- **Automated Test / Acceptance Criterion:**  
  Suite: `backend/tests/google-oauth.test.ts` (OIDC flow, CSRF nonce verification).
- **Responsible Human Approver:** DevOps Lead (Google Cloud Console Consent Screen submission) & Legal Counsel.

---

### Touchpoint 4: Privacy Notices and Consent

- **Source Document & Clause:**  
  `docs/legal/PRIVACY_POLICY_DRAFT.md` §1–§8;  
  Tanzania Personal Data Protection Act, 2022 §22, §27, §34.
- **Approval Status:** Ready for frontend implementation with draft content.
- **Target Frontend Component:**  
  `src/app/privacy/page.tsx` (Static Legal Route).
- **Required UI Behavior & User Experience:**
  1. **Full Privacy Policy Route:** Dedicated page at `/privacy` rendering clean, accessible typography with table of contents.
  2. **Swahili & English Bilingual Support:** Toggle or section headers in English and Swahili.
  3. **Clear Presentation of Legal Bases:**
     - Contractual necessity (delivering purchased movies/passes).
     - Statutory requirement (tax and billing records).
     - Legitimate interest (security monitoring and fraud defense).
  4. **Customer Rights Section:** Explains how to exercise rights of access, correction, and deletion under Tanzania PDPA 2022.
  5. **DPO Contact Card:** Highlights dedicated contact: `privacy@giftedpromovies.com`.
- **Backend API Dependency:**  
  Static Next.js page (no dynamic backend query required).
- **Automated Test / Acceptance Criterion:**  
  Acceptance: Route `/privacy` returns 200, renders all headings, contains valid email link.
- **Responsible Human Approver:** Data Protection Officer (DPO) & Legal Counsel.

---

### Touchpoint 5: Cookie and Session Disclosures

- **Source Document & Clause:**  
  `docs/legal/COOKIE_AND_SESSION_NOTICE_DRAFT.md` §1–§5.
- **Approval Status:** Ready for frontend implementation.
- **Target Frontend Component:**  
  `src/app/cookies/page.tsx` & Footer link.
- **Required UI Behavior & User Experience:**
  1. **Dedicated Route `/cookies`:** Clear explanation of why GIFTEDproMovies does not show an annoying cookie consent banner:  
     *"We do not track you across the internet. We do not use third-party advertising or analytics cookies. We use only strictly necessary first-party cookies to keep you signed in securely."*
  2. **Cookie Table:** Interactive or cleanly formatted table detailing:
     - `gifted_session`: Purpose = Authentication & security; Duration = 14 days idle / 30 days max; Type = Essential HTTP-only cookie.
     - `gp_oauth_state`: Purpose = OAuth CSRF prevention; Duration = 10 minutes; Type = Essential security cookie.
  3. **Local Storage Disclosure:** Clarifies that client `localStorage` is used solely for non-sensitive UI settings (dark mode theme, audio volume, temporary search filter state).
- **Backend API Dependency:**  
  Static Next.js route.
- **Automated Test / Acceptance Criterion:**  
  Acceptance: Route `/cookies` returns 200; page links to `/privacy`.
- **Responsible Human Approver:** Product Owner & Legal Counsel.

---

### Touchpoint 6: Customer Profile and Account Settings

- **Source Document & Clause:**  
  `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §3;  
  `docs/legal/PRIVACY_POLICY_DRAFT.md` §7;  
  `docs/decisions/POD-07_DEVICE_LIMIT_RESOLUTION.md`.
- **Approval Status:** Verified backend contract; UI implementation required.
- **Target Frontend Component:**  
  `src/app/account/profile/page.tsx` & `src/app/account/security/page.tsx`.
- **Required UI Behavior & User Experience:**
  1. **Password Change Component:** In-session form requiring Current Password, New Password, and Confirm New Password.
  2. **Multi-Session Revocation Warning:** Banner on Security tab: *"Changing your password will immediately sign out all other devices and active sessions."*
  3. **Device Management Tab (`/account/devices`):**
     - Lists all registered devices with Friendly Name, Type, Registration Date, and Last Seen timestamp.
     - Identifies "Current Device" with distinct badge.
     - Displays POD-07 derived device capacity: e.g. *"1 of 3 devices used"*.
     - Provides explicit "Remove Device" button for older devices.
     - Confirmation modal before removal: *"Removing this device will immediately sign it out."*
- **Backend API Dependency:**  
  `POST /api/v1/auth/change-password`; `GET /api/v1/devices`; `DELETE /api/v1/devices/:id`.
- **Automated Test / Acceptance Criterion:**  
  Suite: `backend/tests/password-change.integration.test.ts`, `backend/tests/device-limits.integration.test.ts`.  
  Acceptance: Changing password rotates session cookie and returns success; device deletion returns 200.
- **Responsible Human Approver:** QA Automation Lead & Product Owner.

---

### Touchpoint 7: Account Deactivation and Deletion

- **Source Document & Clause:**  
  `docs/legal/ACCOUNT_AND_DATA_DELETION_POLICY_DRAFT.md` §1–§6;  
  Tanzania PDPA 2022 §34;  
  Tanzania Tax Administration Act 2015 §35(3);  
  ADR-027.
- **Approval Status:** Verified backend architecture; UI implementation required.
- **Target Frontend Component:**  
  `src/app/account-deletion/page.tsx` & `src/components/customer/DangerZone.tsx`.
- **Required UI Behavior & User Experience:**
  1. **Dedicated Information Page (`/account-deletion`):** Publicly accessible route explaining the deletion process and legal consequences (also linked from mobile app store requirements).
  2. **In-App Danger Zone (within Account Settings):** High-friction deletion section with red borders/badges.
  3. **Pre-Deletion Warning Modal (Legal Transparency):**
     - *"All active subscriptions and passes will be permanently forfeited immediately without refund."*
     - *"All saved preferences, download history, and registered devices will be permanently erased."*
     - *"Statutory Notice: In compliance with Tanzanian tax law, past payment receipts and transaction records are preserved in pseudonymized form for 7 years and cannot be deleted."*
  4. **Two-Step Verification:** Requires user to type their current password AND type `"DELETE MY ACCOUNT"` in uppercase to enable the final confirmation button.
  5. **Post-Deletion Handling:** Immediately clears browser cookies/storage and redirects to `/` with notice: *"Your account has been deleted."*
- **Backend API Dependency:**  
  `POST /api/v1/auth/delete-account` (Invokes non-cascading pseudonymization; revokes sessions).
- **Automated Test / Acceptance Criterion:**  
  Suite: `backend/tests/retention-cleanup.test.ts`, `backend/tests/account-deletion.integration.test.ts`.
- **Responsible Human Approver:** Legal Counsel & DPO.

---

### Touchpoint 8: Customer Library and Content Access

- **Source Document & Clause:**  
  `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §4 ("Haki za Utazamaji na Leseni / Viewing Rights & Licensing");  
  ADR-018 / POD-08;  
  ARCH-19.
- **Approval Status:** Verified backend contract; UI implementation required.
- **Target Frontend Component:**  
  `src/app/library/page.tsx` & `src/components/customer/CustomerLibraryTab.tsx`.
- **Required UI Behavior & User Experience:**
  1. **License Disclaimer Banner:** *"Movies and series in your library are licensed for your personal, non-commercial entertainment. Commercial public screening, copying, or broadcasting is prohibited by Tanzanian law."*
  2. **Active Passes Presentation:** Displays active pass card (e.g. "VIP 30 Days") with valid-from and valid-until dates.
  3. **No Auto-Renewal Clarification:** Displays badge: *"One-Time Pass (Does not auto-renew)"*.
  4. **Phase 8 Streaming Placeholder:** When user clicks to watch/stream in web player, UI displays authorized branded card: *"Customer streaming launches in Phase 8. Offline downloads are currently active for your pass."*
- **Backend API Dependency:**  
  `GET /api/v1/commercial/me/library`; `GET /api/v1/commercial/me/access/:movieId`.
- **Automated Test / Acceptance Criterion:**  
  Suite: `backend/tests/phase7-backend-master-e2e.integration.test.ts` (PJ-01, PJ-02, PJ-03).
- **Responsible Human Approver:** Product Owner.

---

### Touchpoint 9: Download Authorization and Restrictions (POD-08 / Option A)

- **Source Document & Clause:**  
  `docs/decisions/POD-08_OFFLINE_DOWNLOAD_LICENSING_AND_DRM.md`;  
  `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §5 ("Upakuaji wa Nje ya Mtandao / Offline Downloads");  
  ADR-018.
- **Approval Status:** Formally approved by Product Owner (POD-08 Option A).
- **Target Frontend Component:**  
  `src/components/movie/DownloadButton.tsx` & `src/components/movie/MovieDetailModal.tsx`.
- **Required UI Behavior & User Experience:**
  1. **Quota Display:** Render remaining download quota prominently: e.g. *"Downloads remaining: 4 / 5"*.
  2. **Download Trigger:** Clicking "Download" passes registered `deviceId` to backend `POST /api/v1/download/authorize`.
  3. **Cloudflare R2 Signed URL Handling:** Receives presigned URL (900-second TTL); triggers direct browser download without proxying heavy binary data through web server.
  4. **Delivery Telemetry:**
     - On successful browser download event: submits `status: "COMPLETED"` to `POST /api/v1/download/report-delivery`.
     - On client network abort or connection error: submits `status: "FAILED"`. UI displays: *"Download interrupted. You have 24 hours to retry this download without using another quota slot."*
  5. **Quota Exhausted State (403):** If user has 0 quota remaining, disable button and show prompt: *"Download limit reached for this pass. Upgrade your pass to download more titles."*
  6. **Legal Copyright Notice on Download:** Tooltip or modal footer: *"Downloaded files are for personal offline viewing on this device only. Redistribution is prohibited."*
- **Backend API Dependency:**  
  `POST /api/v1/download/authorize`; `POST /api/v1/download/report-delivery`; `GET /api/v1/download/licenses`.
- **Automated Test / Acceptance Criterion:**  
  Suite: `backend/tests/download-authorization.integration.test.ts`, `backend/tests/phase7-backend-master-e2e.integration.test.ts` (PJ-07, PJ-09, PJ-10, PJ-12).
- **Responsible Human Approver:** Product Owner & QA Lead.

---

### Touchpoint 10: Payment and Order Confirmation

- **Source Document & Clause:**  
  `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §6 ("Malipo na Bei / Pricing and Payments");  
  Tanzania Fair Competition Act, 2003 §15–§20 (Consumer Protection);  
  Bank of Tanzania National Payment Systems Act.
- **Approval Status:** Verified backend payment state machine (ADR-008); UI implementation required.
- **Target Frontend Component:**  
  `src/components/customer/LipaModal.tsx` & `src/app/checkout/page.tsx`.
- **Required UI Behavior & User Experience:**
  1. **Price Transparency:** All prices shown in Tanzanian Shillings (e.g. `TSh 5,000`), explicitly labeled *"Inclusive of all applicable taxes"*.
  2. **Non-Recurring Notice:** Prominently display: *"This is a one-time payment. You will NOT be charged automatically when this pass expires."*
  3. **Payment Provider Disclaimer:** *"Payments are securely processed via licensed mobile money aggregators (M-Pesa, Tigo Pesa, Airtel Money, Halopesa). GIFTEDproMovies does not store your PIN."*
  4. **Mobile USSD Push Instructions:** Clear step-by-step guidance after initiating checkout:
     - Step 1: Check your mobile phone (`+255...`).
     - Step 2: Enter your Mobile Money PIN on the USSD pop-up prompt.
     - Step 3: Wait for confirmation (polling order status automatically).
  5. **Payment Failure Recovery:** If payment fails or times out, display clear error with retry button. Never prompt user to pay twice for an order already in `PAID` state.
- **Backend API Dependency:**  
  `POST /api/v1/orders`; `POST /api/v1/orders/:orderId/checkout`; `GET /api/v1/orders/:orderId`.
- **Automated Test / Acceptance Criterion:**  
  Suite: `backend/tests/commercial-runtime.test.ts`, `backend/tests/orders-history.integration.test.ts`.
- **Responsible Human Approver:** Commercial Lead & Legal Counsel.

---

### Touchpoint 11: Refund and Cancellation Information (ADR-026)

- **Source Document & Clause:**  
  `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §7 ("Sera ya Marejesho / Refund Policy");  
  `docs/architecture/15-ARCHITECTURE-DECISIONS-AND-TRADEOFFS.md` (ADR-026).
- **Approval Status:** ADR-026 approved (V1 manual refund workflow).
- **Target Frontend Component:**  
  `src/app/refunds/page.tsx` & Checkout footer link.
- **Required UI Behavior & User Experience:**
  1. **Pre-Purchase Digital Waiver Notice:** Inside `LipaModal` above payment button:  
     *"By completing this purchase, you consent to immediate digital delivery and acknowledge that digital passes are non-refundable once content access or download has commenced."*
  2. **Technical Failure Dispute Window:** Explains that if customer experiences technical failure preventing content delivery, they must report the issue to customer support within 24 hours of payment:  
     *"If a payment succeeds but content cannot be accessed due to platform failure, contact support@giftedpromovies.com within 24 hours with your Transaction Reference."*
  3. **Dedicated Route `/refunds`:** Full text detailing the dispute review process, SLA (3 business days), and payout mechanism (original mobile money wallet).
- **Backend API Dependency:**  
  Customer-facing: Static text and receipt references. Admin-facing: `POST /api/v1/admin/refunds/process` (audited).
- **Automated Test / Acceptance Criterion:**  
  Suite: `backend/tests/admin-audit.integration.test.ts`.
- **Responsible Human Approver:** Legal Counsel & Managing Director.

---

### Touchpoint 12: Copyright and Content Attribution

- **Source Document & Clause:**  
  `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §8 ("Hakimiliki na Wasanii wa Sauti / Copyright & Voice Artists");  
  Copyright and Neighbouring Rights Act, 1999 (Tanzania COSOTA);  
  ADR-032.
- **Approval Status:** Architectural schema verified (`dj_voice_artists`, `movie_editions`).
- **Target Frontend Component:**  
  `src/app/movies/[slug]/page.tsx` & `src/app/djs/[slug]/page.tsx`.
- **Required UI Behavior & User Experience:**
  1. **DJ / Voice Artist Attribution:** Every movie detail view must clearly display the translator/DJ voice artist (e.g. *"Tafsiri ya Kiswahili: DJ Afro / DJ Murphy"*), with avatar and bio link.
  2. **Edition Selector:** When multiple DJ voiceovers exist for a title, allow the user to select their preferred edition.
  3. **Copyright Infringement Notice (DMCA / COSOTA Notice):** Footer link to `/copyright` providing instructions for copyright owners to report alleged infringement:  
     *"If you believe content on this platform infringes your copyright, submit a takedown notice to legal@giftedpromovies.com."*
- **Backend API Dependency:**  
  `GET /api/v1/catalog/titles/:slug` (Returns `editions` with DJ metadata).
- **Automated Test / Acceptance Criterion:**  
  Suite: `backend/tests/customer-catalog.integration.test.ts`.
- **Responsible Human Approver:** Content Acquisition Lead & Legal Counsel.

---

### Touchpoint 13: Contact, Complaints and Support

- **Source Document & Clause:**  
  `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §10;  
  `docs/legal/PRIVACY_POLICY_DRAFT.md` §8.
- **Approval Status:** Ready for frontend implementation.
- **Target Frontend Component:**  
  `src/app/contact/page.tsx` & `src/components/common/Footer.tsx`.
- **Required UI Behavior & User Experience:**
  1. **Support Channels:** Dedicated contact page listing:
     - Customer Support: `support@giftedpromovies.com`
     - Privacy & Data Requests: `privacy@giftedpromovies.com`
     - Legal & Copyright Notices: `legal@giftedpromovies.com`
     - Phone / WhatsApp Support: `+255 [Placeholder]`
  2. **Dispute Escalation Notice:** In accordance with Tanzanian Consumer Protection standards, explains that disputes should first be submitted for informal resolution (14-day review window) before statutory arbitration.
- **Backend API Dependency:**  
  Static page / Contact form dispatch.
- **Automated Test / Acceptance Criterion:**  
  Acceptance: Route `/contact` loads; contact email links are clickable (`mailto:`).
- **Responsible Human Approver:** Customer Operations Lead.

---

### Touchpoint 14: Persistent Footer Legal Links and Accessibility

- **Source Document & Clause:**  
  Web Content Accessibility Guidelines (WCAG 2.1 AA);  
  Tanzania TCRA Consumer Regulations.
- **Approval Status:** Ready for frontend implementation.
- **Target Frontend Component:**  
  `src/components/common/Footer.tsx` (Global Layout Footer).
- **Required UI Behavior & User Experience:**
  1. **Persistent Global Presence:** Rendered on all customer-facing routes.
  2. **Required Legal Links:**
     - Terms of Service (`/terms`)
     - Privacy Policy (`/privacy`)
     - Cookie & Session Notice (`/cookies`)
     - Account Deletion & Data Rights (`/account-deletion`)
     - Refund Policy (`/refunds`)
     - Contact & Support (`/contact`)
  3. **Copyright Notice:** `© 2026 GIFTEDproMovies. All rights reserved.`
  4. **Accessibility (a11y):** Full keyboard navigability, high color contrast ratio (> 4.5:1), screen-reader accessible ARIA labels.
- **Backend API Dependency:**  
  None (Global client component).
- **Automated Test / Acceptance Criterion:**  
  a11y audit passes WCAG 2.1 AA standards.
- **Responsible Human Approver:** UI/UX Lead & QA Automation Lead.

---

## 3. Frontend Legal Integration Summary Table

| Touchpoint # | Feature / Screen | Primary Route / Component | Legal Source | Backend API | Launch Gate Type |
| :---: | :--- | :--- | :--- | :--- | :--- |
| **01** | Registration Age & Terms | `RegisterModal.tsx` | TOS §2, Privacy §3 | `POST /auth/register` | Pre-Frontend Ready |
| **02** | Login Session Disclosure | `LoginModal.tsx` | TOS §3, Cookie §2.1 | `POST /auth/login` | Pre-Frontend Ready |
| **03** | Google OAuth Scope Notice | `GoogleAuthButton.tsx` | Privacy §3.2, Cookie §2.2 | `GET /auth/google` | Google Consent Gate |
| **04** | Privacy Policy Page | `/privacy` | Privacy Policy Draft | Static Next.js | Pre-Frontend Ready |
| **05** | Cookie & Session Page | `/cookies` | Cookie Notice Draft | Static Next.js | Pre-Frontend Ready |
| **06** | Profile & Device Limits | `/account/devices` | TOS §3, POD-07 | `GET /devices` | Pre-Frontend Ready |
| **07** | Deletion & Tax Retention | `/account-deletion` | Deletion Policy, ADR-027 | `POST /auth/delete-account` | Pre-Frontend Ready |
| **08** | Library License Notice | `/library` | TOS §4, POD-08 | `GET /commercial/me/library` | Pre-Frontend Ready |
| **09** | Download R2 Quota & Notice | `DownloadButton.tsx` | POD-08, TOS §5 | `POST /download/authorize` | Pre-Frontend Ready |
| **10** | Checkout Tax & Non-Renew | `LipaModal.tsx` | TOS §6, FCA 2003 | `POST /orders/:id/checkout`| Merchant Account Gate |
| **11** | Refund Waiver & Dispute | `/refunds`, `LipaModal` | TOS §7, ADR-026 | `POST /admin/refunds/...` | Operational SOP Gate |
| **12** | Voice Artist Attribution | `/movies/[slug]` | TOS §8, COSOTA 1999 | `GET /catalog/titles/:slug`| Content Contracts Gate |
| **13** | Contact & DPO Channels | `/contact` | TOS §10, Privacy §8 | Static Next.js | Pre-Frontend Ready |
| **14** | Footer Navigation Links | `Footer.tsx` | WCAG, TCRA Regs | None (Client layout) | Pre-Frontend Ready |

---
*End of GPM-LEGAL-TO-FRONTEND-TRACEABILITY.*
