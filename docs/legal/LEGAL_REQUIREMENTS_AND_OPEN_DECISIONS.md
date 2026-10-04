# GIFTEDproMovies — Legal Requirements and Open Decisions

> **STATUS: DRAFT — PENDING BUSINESS OWNER AND LEGAL REVIEW**  
> *Notice: This document synthesizes applicable statutory and regulatory requirements, identifies open commercial decisions, evaluates third-party platform readiness (including Google OAuth production verification), and maps compliance against implemented and planned architecture. This document does not constitute formal legal advice.*

---

## 1. Regulatory & Statutory Framework (Tanzania & Cross-Border)

GIFTEDproMovies operates primarily from the United Republic of Tanzania, providing digital streaming, offline rental downloads, and translated Swahili audio commentary for international and regional films. The platform must adhere to the following statutory regimes:

### 1.1 Personal Data Protection Act, 2022 (Act No. 8 of 2022) & 2023 Regulations
The Personal Data Protection Act (PDPA) established the Personal Data Protection Commission (PDPC) and governs all processing of personal data in mainland Tanzania:
* **Registration of Data Controllers and Processors:** The operating entity of GIFTEDproMovies must formally register with the PDPC as a Data Controller (and Data Processor where applicable) prior to commercial launch.
* **Lawful Bases for Processing:**
  * *Contractual Necessity:* Creating accounts, authenticating users, tracking active sessions, issuing 48-hour rental entitlements, and delivering media streams.
  * *Legal Obligation:* Preserving financial ledgers, transactional logs, and statutory accounting records for tax authorities.
  * *Legitimate Interests:* Maintaining append-only security audit logs (`audit_events`), detecting fraud, preventing token abuse, and securing platform infrastructure.
  * *Consent:* Marketing communications (opt-in only), optional analytics, and specific third-party integrations.
* **Data Subject Rights:** The platform must provide verifiable mechanisms for data subjects to exercise rights of access, rectification, erasure (deletion), restriction, objection, and data portability within 30 days of request.
* **Cross-Border Data Transfers:** Transfer of personal data outside Tanzania (e.g., transmitting emails via Resend US/EU servers, token verification via Google APIs, cloud hosting) requires either:
  * Demonstration of adequate protection in the recipient jurisdiction,
  * Binding contractual safeguards (Standard Contractual Clauses / Data Processing Agreements), or
  * Explicit data subject consent under Section 31 of the PDPA.
* **Data Breach Notification:** Security breaches presenting risks to data subject rights must be reported to the PDPC without undue delay (and within statutory notification windows), as well as to affected users.

### 1.2 Electronic and Postal Communications Act, 2010 (EPOCA) & Online Content Regulations
* **Online Content Hosting & Delivery:** Tanzanian online media services and digital broadcasting are subject to licensing and compliance overseen by the Tanzania Communications Regulatory Authority (TCRA).
* **Content Classification & Copyright:** All translated audio commentaries and digital distribution agreements must comply with local classification standards, intellectual property rights, and fair usage laws.

### 1.3 Cybercrimes Act, 2015
* Criminalizes unauthorized access, interception of data, system interference, and illegal data disclosures.
* Requires the platform to maintain adequate system integrity, credential hashing (enforced via Argon2id), encrypted data transport (TLS 1.3 / HTTPS), and restricted administrative access with comprehensive audit trails.

### 1.4 Fair Competition Act, 2003 & Consumer Protection
* Enforces transparent pricing in Tanzanian Shillings (TZS) or clearly stated currencies.
* Prohibits misleading promotional representations regarding content availability, rental duration, or technical streaming qualities.
* Requires plain-language disclosure of non-recurring billing (VIP passes) and clear refund terms.

### 1.5 International Data Protection (GDPR / UK GDPR)
* To the extent that GIFTEDproMovies targets, markets to, or monitors the behavior of users within the European Economic Area (EEA) or the United Kingdom (e.g., Tanzanian diaspora), European data protection regulations apply extraterritorially.
* Compliance is maintained through strict data minimization, zero-third-party tracking cookies, purpose-based retention (ADR-027), and standard contractual clauses with third-party service providers.

---

## 2. Checklist of Unresolved Business & Commercial Decisions

The following business, operational, and commercial parameters must be formally resolved by the business owners and qualified legal counsel prior to commercial launch:

| Item | Open Decision / Missing Information | Current Implementation State | Required Action |
| :--- | :--- | :--- | :--- |
| **Corporate Identity** | Official legal entity name, BRELA incorporation number, TIN, and VAT status. | Placeholder: `GIFTEDproMovies / [Legal Entity Name]` | Legal team to provide registered company details and physical office address in Dar es Salaam / Tanzania. |
| **Data Protection Officer (DPO)** | Formal appointment and contact details of the DPO registered with the PDPC. | Placeholder: `privacy@giftedpromovies.com` / `dpo@giftedpromovies.com` | Appoint a designated officer and register with the Tanzania PDPC. |
| **Commercial Refund Terms (ADR-026)** | Conditions, timeframes, and fee deductions for digital refunds. | Deferred to Phase 5. Baseline: No automatic refund once media playback begins, with discretionary refunds for verified technical delivery failure within 24 hours. | Business owner to establish commercial refund policy and payment dispute workflow. |
| **Payment Gateway Selection (Phase 5)** | Selection of primary mobile money and card aggregators (AzamPay, Flutterwave, DPO Pay, Stripe). | Architecture ready for non-recurring webhooks; no provider locked in yet. | Select payment partners, review merchant agreements, and finalize PCI-DSS compliance scope (redirect/hosted checkout). |
| **Cloud Media & Storage Infrastructure (Phase 6)** | Primary CDN, cloud object storage, and media transcoding providers (AWS S3/CloudFront, Cloudflare R2/Stream, Backblaze B2). | Phase 6 planned. Architectural decision pending infrastructure cost modeling. | Select media CDN provider and execute Data Processing Agreements (DPAs) covering cross-border video caching. |
| **Statutory Record Retention Period** | Exact number of years to retain completed financial transactions and tax records under the Tanzania Tax Administration Act, 2015. | Retained indefinitely or until statutory threshold; marked `RETAIN_STATUTORY` in ADR-027. | Legal/accounting team to confirm whether 5 or 7 years is required by TRA for electronic tax audits. |
| **Audit Log Retention Window** | Maximum operational retention window for security audit logs in `audit_events`. | Architecture preserves audit events append-only; no automated truncation scheduled yet. | Security and legal teams to set retention window (recommended: 24 to 36 months for forensics, then archived or purged). |
| **Minor / Age of Consent Threshold** | Exact age restriction for service accounts (18 years vs 13+ with parental consent). | Drafted as 18 years (or minimum age of digital majority in user's jurisdiction). | Business owner to decide whether teenage access with parental supervision will be supported. |

---

## 3. Google OAuth 2.0 & OpenID Connect Production Readiness

The Google Sign-In extension has completed backend architecture, automated test suites (81/81 passing), and real live OAuth 2.0 / OIDC verification against Google production authorization and token endpoints. To publish the OAuth client for general consumer use without Google warning screens, the following steps are required:

### 3.1 OAuth Consent Screen Configuration
* **User Type:** External (accessible to any Google account user).
* **Publishing Status:** Currently in **Testing** mode (restricted to registered test accounts, maximum 100 test users).
* **Transition to Production:** Requires completing the app branding profile and public documentation links in the Google Cloud Console.

### 3.2 Required Public URIs & Metadata
Before Google approves the production OAuth consent screen, the following public URLs must be configured and hosted on verified domains:
1. **Application Home Page:** `https://giftedpromovies.com` (or verified production domain).
2. **Application Privacy Policy Link:** `https://giftedpromovies.com/privacy` (reflecting `PRIVACY_POLICY_DRAFT.md`).
3. **Application Terms of Service Link:** `https://giftedpromovies.com/terms` (reflecting `TERMS_OF_SERVICE_DRAFT.md`).
4. **Authorized Redirect URIs:**
   * Production: `https://api.giftedpromovies.com/api/v1/auth/google/callback` (or configured production API callback).
   * Development / Staging: `http://localhost:8000/api/v1/auth/google/callback` (restricted to test environments).

### 3.3 Scope Analysis & Verification Tier
* **Requested Scopes:**
  1. `openid` — Core OpenID Connect user authentication.
  2. `https://www.googleapis.com/auth/userinfo.email` — Access to user's primary email address and verification status.
  3. `https://www.googleapis.com/auth/userinfo.profile` — Access to basic profile name and avatar picture.
* **Verification Assessment:**
  * All three requested scopes are classified by Google as **Non-Sensitive / Basic** scopes.
  * **No CASA (Cloud Application Security Assessment) or Tier-2/3 Third-Party Security Audits are required** for these scopes.
  * Google only requires basic Brand Verification:
    * Domain ownership verified via Google Search Console.
    * Transparent privacy policy explaining how Google user data is used (solely for account creation and session authentication, never sold or used for third-party advertising).
    * Compliant visual branding (official Google sign-in buttons following Google Identity Branding Guidelines).

---

## 4. Architectural Alignment & Compliance Verification

The prepared legal and privacy documents have been cross-checked against implemented backend code, active database schemas, and approved Architectural Decision Records (ADRs). Zero architectural contradictions exist:

| Architectural Component | Implemented Behavior / ADR | Legal & Privacy Draft Representation | Status |
| :--- | :--- | :--- | :--- |
| **Authentication & IdP Linking** | ADR-002, ADR-006, Google OAuth extension: Account created with immutable Google `sub` in `oauth_identities`. Google access/refresh tokens are **never stored**; only OIDC identity token is verified. | Privacy Policy §3.2 & Cookie Notice §2: Accurately states that Google credentials and external tokens are never persisted in GIFTEDproMovies databases. | **ALIGNED** |
| **Password Storage** | ADR-002: Passwords hashed with Argon2id; plain-text passwords never logged or saved. | Privacy Policy §7: Explicitly describes Argon2id cryptographic hashing and zero plain-text storage. | **ALIGNED** |
| **Session Lifecycle & Security** | ADR-006, ADR-007: `gifted_session` cookie is `HttpOnly`, `SameSite=Lax`, `Secure` in production, with 14-day inactivity timeout and 30-day non-extensible absolute expiration. | Cookie Notice §2 & Privacy Policy §4.3: Exact cookie parameters, inactivity rules, and absolute lifetime are documented verbatim. | **ALIGNED** |
| **OAuth State Cookie Lifecycle** | Hardened Google Auth Plan: `gp_oauth_state` is `HttpOnly`, `SameSite=Lax`, `Secure` in production, restricted to `/api/v1/auth/google`, max-age 600s, HMAC-signed, single-use. | Cookie Notice §2: Full cryptographic lifecycle, one-time consumption, and short expiration explicitly documented. | **ALIGNED** |
| **Local Storage Usage** | Frontend integration contract: `localStorage` strictly restricted to non-sensitive UI states (e.g., active tab, volume preference). Session IDs and tokens forbidden in `localStorage`. | Cookie Notice §3: Transparently explains non-sensitive `localStorage` usage and confirms zero tokens or session secrets are stored there. | **ALIGNED** |
| **Guest Checkout Prohibition** | ADR-017: No anonymous checkout; all rentals and purchases require an authenticated user account. | Terms of Service §3.1: Explicitly states that active registration and authentication are required for all rentals and passes. | **ALIGNED** |
| **Commerce & Subscriptions** | ADR-020: Non-recurring billing; 48-hour PPV rental window; 30-day offline download window; manual renewal of VIP passes; no auto-recurring credit card subscriptions. | Terms of Service §5: Accurately defines access models as non-recurring one-time purchases and rentals with strict expiration timelines. | **ALIGNED** |
| **Account Deletion & Data Retention** | ADR-027: Non-cascading deletion; PII erased/anonymized; active sessions terminated; commercial transactions preserved for statutory tax compliance; audit logs preserved for security forensics. | Deletion Policy §3 & Privacy Policy §6: Accurately defines the Purpose-Based Retention matrix and explains why financial ledgers and audit events are not cascade-deleted. | **ALIGNED** |
| **Sub-Processors** | Production environment: Google Cloud (OAuth / IdP), Resend Inc. (Transactional Email). Phase 5/6: Mobile money gateways, Cloud Media CDNs. | Privacy Policy §5: Exhaustively enumerates current sub-processors, their roles, and future planned categories without misrepresenting unselected vendors. | **ALIGNED** |

---

## 5. Next Steps for Stakeholders

1. **Retain Qualified Legal Counsel in Tanzania:** Review all four draft policies (`TERMS_OF_SERVICE_DRAFT.md`, `PRIVACY_POLICY_DRAFT.md`, `COOKIE_AND_SESSION_NOTICE_DRAFT.md`, and `ACCOUNT_AND_DATA_DELETION_POLICY_DRAFT.md`) for compliance with the Tanzania Personal Data Protection Act, 2022 and TCRA regulations.
2. **Execute Corporate Filings:** Finalize BRELA entity registration, obtain TIN and tax clearance, and register as a Data Controller with the Tanzania Personal Data Protection Commission (PDPC).
3. **Resolve Phase 5 Commercial Terms:** Approve final refund and cancellation policy parameters in conjunction with the selected payment aggregator(s).
4. **Deploy Legal Routes on Production Web Frontend:** When the web client is deployed, publish `/terms` and `/privacy` publicly, verify the domain in Google Search Console, and submit the Google Cloud OAuth Consent Screen for production publication.
