# GIFTEDproMovies3 — Legal Gaps, Statutory Reconciliation & Human Actions Register

**Document ID:** `docs/qa/GPM-LEGAL-GAPS-AND-HUMAN-ACTIONS.md`  
**Mission ID:** `GPM-LEGAL-TO-FRONTEND-READINESS`  
**Authority:** Product Owner  
**Date:** 2026-11-05  
**Classification:** Legal Compliance & Statutory Risk Register  
**Status:** FORMAL PRE-FRONTEND AUDIT — AUTHORIZED  

---

## 1. Statutory Compliance & Regulatory Context

GIFTEDproMovies operates primarily within the jurisdiction of the United Republic of Tanzania, delivering digital video entertainment across mobile and web channels. Consequently, commercial operations are governed by several key statutes:

1. **Personal Data Protection Act, 2022 (PDPA 2022):**  
   Governs data processing, data controller registration, personal data minimization, lawful basis, data security, and rights of data subjects (access, rectification, erasure).
2. **Electronic and Postal Communications Act (EPOCA) & TCRA Regulations:**  
   Regulates online content distribution, digital broadcasting, content ratings, and telecommunications standards.
3. **Cybercrimes Act, 2015:**  
   Mandates system integrity, cyber security safeguards, protection against unauthorized access, and preservation of electronic evidence.
4. **Fair Competition Act, 2003 (Consumer Protection Regulations):**  
   Requires transparent pricing (inclusive of taxes), prohibits deceptive marketing (e.g. hidden recurring billing), and regulates digital service contract terms.
5. **Tax Administration Act, 2015 (Tanzania Revenue Authority - TRA):**  
   Section 35(3) mandates that books of account, electronic records, and tax invoices must be retained for at least five (5) to seven (7) years.
6. **Copyright and Neighbouring Rights Act, 1999 (COSOTA):**  
   Governs audiovisual distribution licenses, derivative works (including audio translations and DJ voiceovers), and anti-piracy protections.
7. **National Payment Systems Act, 2015 (Bank of Tanzania - BOT):**  
   Regulates electronic payment transactions and requires integration through licensed payment system providers (AzamPay, ClickPesa, Selcom, Flutterwave).

---

## 2. Comprehensive Classification of Audit Findings

Every gap, policy requirement, and operational item is assigned one of the following authoritative classifications:

| Category Code | Classification Meaning | Actionable Stage |
| :--- | :--- | :--- |
| **`VERIFIED AND READY FOR FRONTEND`** | Technical control and data contract are 100% complete and tested in backend; ready for frontend client binding. | Phase 7 Customer Frontend Integration |
| **`DOCUMENTATION GAP`** | Policy text or technical runbook exists in draft or requires placeholder substitution. | Pre-Launch Documentation Clean-up |
| **`FRONTEND IMPLEMENTATION REQUIRED`** | Client UI screen, component, modal, or form must be constructed during Phase 7 frontend work. | Phase 7 Customer Frontend Integration |
| **`BACKEND DEPENDENCY`** | Frontend behavior relies on a verified Fastify backend endpoint or database invariant. | Phase 7 Frontend Integration Binding |
| **`HUMAN ACTION REQUIRED`** | An organizational, administrative, or commercial task that cannot be automated by code. | Pre-Launch Human Milestone |
| **`LEGAL COUNSEL CONFIRMATION REQUIRED`** | Requires formal review, customization, or sign-off by a licensed Tanzanian legal practitioner. | Pre-Launch Legal Clearance |
| **`PRODUCT OWNER DECISION REQUIRED`** | Strategic product governance decision reserved for the Product Owner. | Executive Governance Gate |

---

## 3. Detailed Findings & Statutory Gap Register

---

### Finding 1: Corporate Entity Identity & Registration Placeholders
- **Statutory Relevance:** Fair Competition Act 2003 §15; BRELA Business Names / Companies Act.
- **Current Repository State:** All 5 legal drafts in `docs/legal/` contain placeholders: `[Company Legal Name]`, `[Registration Number]`, `[Registered Office Address]`.
- **Classification:** **`DOCUMENTATION GAP`** & **`HUMAN ACTION REQUIRED`**
- **Impact on Frontend:** Frontend static pages (`/terms`, `/privacy`) can be built with environment-driven variables or clean constants.
- **Action Required:** Product Owner and business leadership must provide the official registered entity name (BRELA Certificate of Incorporation) and tax identification number (TIN) before commercial launch.

---

### Finding 2: Mandatory Registration Checkbox & Age Verification (18+)
- **Statutory Relevance:** Law of the Child Act 2009 (Tanzania); Contract Act (Cap 33 R.E. 2019).
- **Current Repository State:** `docs/legal/TERMS_OF_SERVICE_DRAFT.md` §2 stipulates minimum age 18 or parental consent. Backend registration schema validates email and password, but does not capture explicit checkbox boolean.
- **Classification:** **`FRONTEND IMPLEMENTATION REQUIRED`** & **`VERIFIED AND READY FOR FRONTEND`**
- **Impact on Frontend:** `RegisterModal.tsx` must render an unchecked checkbox: *"I confirm I am at least 18 years old and agree to the Terms of Service and Privacy Policy"*. The form submit button must remain disabled until checked.
- **Backend Dependency:** Optional capture of `acceptedTermsVersion: string` in registration payload for audit logging.

---

### Finding 3: Data Controller Registration with Tanzania PDPC
- **Statutory Relevance:** Tanzania Personal Data Protection Act, 2022 (Act No. 11 of 2022) §14.
- **Current Repository State:** Technical architecture enforces purpose-based separation (ADR-027), data minimization, and Argon2id hashing. However, the operating company has not completed the formal administrative registration with the Tanzania Personal Data Protection Commission (PDPC).
- **Classification:** **`HUMAN ACTION REQUIRED`** & **`LEGAL COUNSEL CONFIRMATION REQUIRED`**
- **Launch Impact:** Mandatory Pre-Commercial Launch Gate. Does **not** block Phase 7 Frontend Integration.
- **Action Required:** Legal counsel must prepare and submit the Data Controller registration dossier to PDPC and obtain the official Certificate of Registration.

---

### Finding 4: Appointment & Notification of Data Protection Officer (DPO)
- **Statutory Relevance:** Tanzania PDPA 2022 §21.
- **Current Repository State:** Documentation and privacy drafts provide a functional contact alias (`privacy@giftedpromovies.com`).
- **Classification:** **`HUMAN ACTION REQUIRED`** & **`DOCUMENTATION GAP`**
- **Impact on Frontend:** UI displays `privacy@giftedpromovies.com` on `/privacy` and `/contact`.
- **Action Required:** Executive management must formally designate a qualified individual as DPO and notify the PDPC in writing.

---

### Finding 5: Account Deletion, Erasure Rights & 7-Year Tax Retention
- **Statutory Relevance:** Tanzania PDPA 2022 §34 (Right to Erasure) vs. Tanzania Tax Administration Act 2015 §35(3) (Mandatory 5-7 Year Financial Record Retention).
- **Current Repository State:** Handled in backend via non-cascading pseudonymization (ADR-027). User credentials and sessions are scrubbed; completed `orders` and `payment_settlements` retain anonymized customer IDs for 7 years.
- **Classification:** **`VERIFIED AND READY FOR FRONTEND`** & **`FRONTEND IMPLEMENTATION REQUIRED`**
- **Impact on Frontend:** High-friction Danger Zone on `/account/security` and public route `/account-deletion`. UI must clearly explain to the customer that financial order history is retained for statutory compliance while personal identity is erased.
- **Backend Dependency:** `POST /api/v1/auth/delete-account` (verified in `retention-cleanup.test.ts`).

---

### Finding 6: Non-Recurring Pass Pricing & Clear Tax Disclosure
- **Statutory Relevance:** Fair Competition Act 2003 (Consumer Protection); TRA VAT Act 2014.
- **Current Repository State:** Subscriptions are strictly non-recurring manual passes (`autoRenew = false`). Commercial pricing is in Tanzanian Shillings (TZS).
- **Classification:** **`VERIFIED AND READY FOR FRONTEND`** & **`FRONTEND IMPLEMENTATION REQUIRED`**
- **Impact on Frontend:** `LipaModal.tsx` and pricing cards must never state or imply auto-renewal. Every price badge must explicitly state: *"One-Time Payment • No Auto-Renewal • Inclusive of all taxes"*.

---

### Finding 7: Commercial Refund Policy & Dispute Window (ADR-026)
- **Statutory Relevance:** Consumer Protection Regulations; ADR-026.
- **Current Repository State:** Digital goods delivered instantly. Terms specify waiver of statutory withdrawal upon access/download, with a 24-hour technical failure dispute window.
- **Classification:** **`VERIFIED AND READY FOR FRONTEND`** & **`FRONTEND IMPLEMENTATION REQUIRED`**
- **Impact on Frontend:** `LipaModal.tsx` must include clear waiver text before payment: *"Digital passes are non-refundable once content access or download begins. For technical failures, contact support within 24 hours."* Static route `/refunds` must explain dispute resolution.

---

### Finding 8: Download Quota, Device Limits & DRM Staging (POD-08 Option A)
- **Statutory Relevance:** Copyright and Neighbouring Rights Act 1999 (COSOTA); POD-08; POD-07.
- **Current Repository State:** Product Owner approved Option A for V1: Cloudflare R2 signed download URLs (900s TTL), atomic `UNIQUE_TITLES` quota enforcement, and POD-07 device limits. Universal hardware DRM (Widevine/FairPlay) deferred to V2.
- **Classification:** **`VERIFIED AND READY FOR FRONTEND`** & **`FRONTEND IMPLEMENTATION REQUIRED`**
- **Impact on Frontend:** `DownloadButton.tsx` and `MovieDetailModal.tsx` must render remaining quota slots, trigger direct R2 download, report telemetry to `POST /api/v1/download/report-delivery`, and display copyright redistribution warning.
- **Backend Dependency:** `POST /api/v1/download/authorize`, `POST /api/v1/download/report-delivery`.

---

### Finding 9: Content Acquisition & Voiceover Talent Agreements
- **Statutory Relevance:** Copyright and Neighbouring Rights Act, 1999 (COSOTA); ADR-032.
- **Current Repository State:** Database architecture models translating DJs (`dj_voice_artists`, `movie_editions`) and attributes them on catalog endpoints.
- **Classification:** **`HUMAN ACTION REQUIRED`** & **`LEGAL COUNSEL CONFIRMATION REQUIRED`**
- **Launch Impact:** Mandatory Pre-Commercial Launch Gate. Does **not** block frontend engineering.
- **Action Required:** Content Acquisition Lead and Legal Counsel must execute binding bilateral contracts with studio rights holders and translating DJs (e.g. DJ Afro, DJ Murphy) governing translation rights and commercial royalties.

---

### Finding 10: Google OAuth Production Verification & Scopes
- **Statutory Relevance:** Google API Services User Data Policy.
- **Current Repository State:** Backend implements standard OIDC scopes (`openid`, `email`, `profile`), state nonce verification, and PKCE.
- **Classification:** **`HUMAN ACTION REQUIRED`** & **`FRONTEND IMPLEMENTATION REQUIRED`**
- **Impact on Frontend:** `GoogleAuthButton.tsx` must conform to Google Identity Branding Guidelines.
- **Action Required:** Product Owner/DevOps must verify domain ownership in Google Search Console and submit OAuth Consent Screen for production verification to remove unverified app warning screens.

---

### Finding 11: Production Mobile Money Merchant Onboarding
- **Statutory Relevance:** Bank of Tanzania National Payment Systems Act; anti-money laundering (AML/CFT) regulations.
- **Current Repository State:** Backend payment provider abstraction supports PalmPesa, ClickPesa, and simulated providers (ADR-008).
- **Classification:** **`HUMAN ACTION REQUIRED`**
- **Launch Impact:** Mandatory Pre-Commercial Launch Gate.
- **Action Required:** Finance Lead must finalize merchant agreements with licensed mobile money aggregators, obtain live production API keys and webhook secrets, and configure them in production environment secrets.

---

### Finding 12: Production Email Domain Verification (Resend DKIM/SPF)
- **Statutory Relevance:** Cybercrimes Act 2015; Anti-Spam / TCRA Electronic Messaging Regulations.
- **Current Repository State:** Email worker with AES-256-GCM outbox encryption, sanitization, and automated cleanup implemented (`cleanup-outbox.mjs`).
- **Classification:** **`HUMAN ACTION REQUIRED`**
- **Launch Impact:** Mandatory Pre-Commercial Launch Gate.
- **Action Required:** DevOps Lead must publish DKIM, SPF, and DMARC TXT records for `mail.giftedpromovies.com` at the domain registrar.

---

## 4. Master Statutory Reconciliation Matrix

| Statutory Mandate | Applicable Law | Technical Enforcement in Backend | Required Frontend Experience | Human / Legal Action Required |
| :--- | :--- | :--- | :--- | :--- |
| **Data Protection & Privacy** | Tanzania PDPA 2022 | Argon2id, TLS 1.3, Purpose-based DB isolation (ADR-027) | `/privacy`, `/cookies`, no ad cookies disclosure | PDPC Data Controller Registration, DPO notification |
| **Age of Consent (18+)** | Law of the Child Act 2009 | Session authorization, role checks | Mandatory 18+ checkbox on `RegisterModal` | Legal confirmation of age verification policy |
| **Consumer Protection** | Fair Competition Act 2003 | Non-recurring pass pricing in TZS | Clear "No Auto-Renewal", tax inclusion, USSD guidance | Finalized Terms of Service adoption |
| **Cybersecurity & Evidence** | Cybercrimes Act 2015 | Append-only audit events, signed cookies, CSRF defense | Secure session management, multi-device revocation | Third-party vulnerability assessment |
| **Tax Records Retention** | TRA Tax Admin Act 2015 | Immutable orders and settlements (7-year retention) | Notice on `/account-deletion` explaining tax records retention | TRA Electronic Fiscal Device (EFD) compliance review |
| **Copyright & Translations** | COSOTA Act 1999 | Polymorphic DJ edition binding (ADR-032) | DJ attribution on movie pages, `/copyright` notice | Executed talent & studio distribution contracts |
| **Payment Integrity** | BOT Payment Systems Act | Idempotent payment ledger, webhook signature checks | Transparent mobile money checkout, dispute instructions | Commercial merchant onboarding with aggregator |

---

## 5. Actionable Checklists by Human Owner

### A. Legal Counsel Checklist (Pre-Commercial Launch)
- [ ] Replace all `[Company Legal Name]` and corporate address placeholders in `docs/legal/*.md`.
- [ ] Confirm exact statutory retention duration for digital transactions (5 vs 7 years under TRA).
- [ ] Submit formal Data Controller registration dossier to Tanzania Personal Data Protection Commission (PDPC).
- [ ] Formally notify PDPC of the appointed Data Protection Officer (DPO).
- [ ] Review and sign off on customer dispute and refund SLA (ADR-026).
- [ ] Standardize copyright infringement notification workflow and review DMCA/COSOTA takedown template.

### B. Product Owner & Executive Checklist
- [ ] Approve finalized Terms of Service and Privacy Policy for publication on production web domain.
- [ ] Execute bilateral licensing agreements with copyright owners and voiceover translation DJs.
- [ ] Confirm pricing tiers, download quotas (`UNIQUE_TITLES`), and device limits (`MAX(device_limit)`).
- [ ] Authorize Phase 7 Customer Frontend Integration execution.

### C. Commercial & Finance Lead Checklist
- [ ] Finalize merchant onboarding with ClickPesa / AzamPay / PalmPesa for live Tanzanian mobile money processing.
- [ ] Establish business bank accounts in Dar es Salaam for settlement payouts.
- [ ] Define finance SOP for executing manual customer dispute refunds under ADR-026.

### D. DevOps & SRE Lead Checklist
- [ ] Publish DNS records (SPF, DKIM, DMARC, MX) for `mail.giftedpromovies.com` on Resend.
- [ ] Submit Google OAuth Consent Screen for production verification in Google Cloud Console.
- [ ] Configure production Cloudflare R2 bucket with custom streaming and download domains.
- [ ] Conduct staging Point-in-Time Recovery (PITR) drill according to `RUNBOOK-OPS-001`.

---
*End of GPM-LEGAL-GAPS-AND-HUMAN-ACTIONS.*
