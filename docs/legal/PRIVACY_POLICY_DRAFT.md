# Privacy Policy — GIFTEDproMovies

> **DOCUMENT STATUS:** `DRAFT — PENDING BUSINESS OWNER AND LEGAL REVIEW`  
> **LAST UPDATED:** October 2026  
> **INTENDED PUBLIC ROUTE:** `/privacy`  
> **DISCLAIMER:** This document is a draft operational privacy specification reflecting the actual system design, technical safeguards, and planned data flows of the GIFTEDproMovies platform. It does not constitute formal legal advice. It must be reviewed and certified by qualified legal counsel in Tanzania and any relevant operational jurisdictions prior to commercial production launch.

---

## 1. Introduction & Scope

GIFTEDproMovies ("we", "us", or "our") values and respects your personal privacy. This Privacy Policy describes how we collect, use, store, process, and protect your personal information when you access our streaming website, applications, APIs, and associated digital services (collectively, the "Services").

This policy applies to all users of the Platform, including public registered customers, media team staff, and administrative operators.

---

## 2. Personal Data We Collect

We adhere to the principle of **data minimization**—we only collect data that is strictly necessary to operate secure authentication, stream content, prevent fraud, fulfill orders, and comply with statutory obligations.

### 2.1 Information You Provide to Us
* **Account Identity (Implemented):**
  * Email address (used as your primary account identifier and for account recovery).
  * Password (cryptographically hashed using Argon2id; plaintext passwords are never stored or accessible to staff).
* **Third-Party Sign-In Data — Google OAuth (Implemented):**
  * When you choose "Sign in with Google", Google acts as an external Identity Provider. We receive your unique Google Subject Identifier (`sub`), verified email address, and profile name.
  * We store this mapping in a dedicated `user_identities` table. We do NOT receive your Google account password or access your private Google Drive, Gmail, or calendar data.

### 2.2 Automatically Collected Technical & Session Metadata
* **Session & Token Data (Implemented):**
  * Opaque session tokens (only SHA-256 cryptographic hashes are stored in the database).
  * Session creation timestamps, last active timestamps, and expiry dates.
* **Device Recognition Metadata (Implemented):**
  * Client-provided device identifiers, operating system name/version, browser user-agent string, and device classification (mobile, desktop, tablet, TV).
  * Used solely to recognize your devices, enforce security policies, manage concurrent streams, and allow remote session logout.
* **Network & Security Logs (Implemented):**
  * Client IP addresses and HTTP User-Agent headers recorded during authentication and privileged administrative actions.
  * Append-only security audit trail (`audit_events`) capturing login attempts, password resets, role changes, and account status transitions.
  * All sensitive authentication secrets, verification codes, and tokens are automatically redacted from logs.

### 2.3 Transaction & Media Data *(Scheduled for Phase 4 & Phase 5)*
* **Commercial Records:** Order numbers, amounts, currency (TZS), timestamps, and payment provider transaction reference numbers.
  * *Payment Security Note:* We do NOT collect or store full credit/debit card numbers, CVVs, or mobile money PINs on our servers. All financial payment processing is handled directly by licensed, PCI-DSS compliant third-party payment gateways.
* **Playback & Download Telemetry:** Content titles viewed, playback duration, download package access tokens, and device offline validity leases.

---

## 3. How We Use Your Personal Data

We process your personal information for the following specific purposes and legal bases:

| Purpose | Category of Data | Legal Basis / Operational Necessity |
| :--- | :--- | :--- |
| **Account Creation & Authentication** | Email address, Argon2id password hash, Google `sub` | Contractual necessity to provide access to the Services. |
| **Account Security & Mailbox Verification** | Verification tokens, password reset tokens, Resend email dispatches | Legitimate interest to verify mailbox control and prevent fraud. |
| **Session & Multi-Device Management** | Device metadata, session hashes, last active timestamp | Performance of service contract and account protection. |
| **Commerce & Entitlement Fulfillment** *(Future)* | Transaction references, purchase records, access grants | Contractual fulfillment and statutory accounting compliance. |
| **Security Auditing & Abuse Prevention** | IP address, User-Agent, audit event records | Compliance with legal obligations and protection against unauthorized access. |
| **In-App & Email Notifications** | Notification messages, read timestamps, email alerts | Service operation and customer communication. |

---

## 4. Third-Party Service Providers & Sub-Processors

We do not sell, rent, or monetize your personal information to third parties or data brokers. We share data only with trusted service providers who process data strictly on our instructions:

1. **Google LLC (Identity Provider):**
   * *Purpose:* Authentication via OAuth 2.0 / OpenID Connect.
   * *Data Shared:* Authorization code exchange and token verification over TLS.
   * *Privacy Policy:* [Google Privacy Policy](https://policies.google.com/privacy).
2. **Resend, Inc. (Transactional Email Dispatch):**
   * *Purpose:* Delivery of account verification, password recovery, and critical security notices.
   * *Data Shared:* Recipient email address and single-use security tokens.
   * *Privacy Policy:* [Resend Privacy Policy](https://resend.com/privacy).
3. **Authorized Payment Processors *(Planned for Phase 5)*:**
   * *Purpose:* Mobile money and card payment processing in Tanzania.
   * *Data Shared:* Order ID, customer email/phone, transaction amounts.
4. **Cloud Media Delivery Partners *(Planned for Phase 6/7)*:**
   * *Purpose:* Streaming video delivery (e.g., Cloudflare Stream / R2).
   * *Data Shared:* Short-lived cryptographic video access tokens and client IP for CDN routing.

---

## 5. Cookies & Session Storage

Our application uses strictly necessary HTTP-only cookies to maintain your login session and secure the OAuth flow:
* **`gifted_session`:** An encrypted/hashed HTTP-only session cookie that keeps you logged in across browser requests.
* **`gp_oauth_state`:** A short-lived (10 minutes), cryptographically signed, single-use HTTP-only cookie used to prevent Cross-Site Request Forgery (CSRF) during Google OAuth.

For comprehensive details on our cookie practices, please review our [Cookie and Session Notice](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/legal/COOKIE_AND_SESSION_NOTICE_DRAFT.md).

---

## 6. Data Retention & Deletion Policy

We retain personal data only for as long as necessary to fulfill the operational, commercial, security, and statutory requirements for which it was collected:

* **Authentication & Active Sessions:** Active sessions expire after 14 days of inactivity, or 30 days maximum. Expired session records are purged periodically.
* **Transient Security Tokens:** Email verification and password reset tokens expire in 15–60 minutes and are permanently invalidated once consumed or superseded.
* **Account Records:** Maintained while your account remains active.
* **Statutory & Audit Records (Non-Cascading Deletion):** In accordance with Architectural Decision **ADR-027**, account deactivation or deletion does NOT cascade-delete commercial invoices, payment references, or append-only security audit logs. These records are retained to satisfy tax accounting laws, regulatory requirements, and fraud dispute resolution.

For detailed procedures on requesting data removal, see our [Account and Data Deletion Policy](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/legal/ACCOUNT_AND_DATA_DELETION_POLICY_DRAFT.md).

---

## 7. Security Safeguards

We implement industry-standard technical and organizational security measures to protect your personal information:
* **Transport Encryption:** All web traffic, API requests, and third-party communications are encrypted in transit using Transport Layer Security (TLS 1.3 / HTTPS).
* **Password Hashing:** Passwords are hashed with **Argon2id** (64 MB memory cost, 3 time cost, 4 parallelism), an algorithm resilient to GPU brute-force cracking.
* **Token Hashing:** Session tokens and authentication tokens are stored in the database exclusively as cryptographic **SHA-256 hashes**.
* **Secret Redaction:** Production logging libraries recursively redact sensitive credentials, tokens, cookies, and secrets before logs are recorded.
* **Central Account Status Enforcement:** Access controls block suspended, deactivated, or unverified accounts at the gateway level.
* **Role-Based Access Control:** Fine-grained staff capabilities restrict access to sensitive administrative operations.

---

## 8. Your Data Protection Rights

Under applicable data protection legislation (including the **Tanzania Personal Data Protection Act, 2022** and international privacy frameworks where applicable), you have the right to:

1. **Right to Access:** Request a summary and copy of the personal data we hold about you.
2. **Right to Rectification:** Request correction of inaccurate or incomplete personal information.
3. **Right to Erasure / Deletion:** Request the deactivation and deletion of your account and personal identifying data, subject to lawful retention requirements.
4. **Right to Object / Restrict Processing:** Object to or restrict processing of your data under specific statutory circumstances.
5. **Right to Withdraw Consent:** Where processing is based on consent (such as voluntary third-party account linking), you may unlink your Google account from your Account Settings at any time (provided a password is set).

---

## 9. Children’s Privacy

The Services are intended for individuals who are at least 18 years old or the age of legal majority in their jurisdiction. We do not knowingly collect personal data from children under 13 (or under 18 without parental consent). If we discover that a minor has registered an unauthorized account, we will take steps to promptly suspend the account and delete the associated data.

---

## 10. Regulatory Context & International Transfers

* **Primary Launch Jurisdiction:** United Republic of Tanzania. Processing is designed to align with the **Personal Data Protection Act, 2022 (Act No. 11 of 2022)** and the **Personal Data Protection Regulations, 2023**.
* **Cross-Border Data Transfers:** To provide global cloud infrastructure, data may be hosted on secure servers or processed by service providers located in other jurisdictions (e.g., European Union or United States). Such transfers are governed by appropriate contractual safeguards ensuring an equivalent standard of protection.

---

## 11. Changes to this Privacy Policy

We may update this Privacy Policy from time to time to reflect operational changes, security enhancements, or legal requirements. Material updates will be announced via an in-app notice or email notification prior to the change taking effect. The "Last Updated" date at the top of this policy indicates the latest revision.

---

## 12. Contact Us & Privacy Requests

To exercise your privacy rights, request data deletion, or submit questions regarding this policy:

* **Data Privacy Officer:** `privacy@giftedpromovies.com`
* **General Customer Support:** `support@giftedpromovies.com`
* **Mailing Address:** `[Business Entity Name & Registered Address — Pending Final Legal Registration]`
