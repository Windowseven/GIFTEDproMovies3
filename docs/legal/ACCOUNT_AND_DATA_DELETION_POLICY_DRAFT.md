# Account & Data Deletion Policy — GIFTEDproMovies

> **DOCUMENT STATUS:** `DRAFT — PENDING BUSINESS OWNER AND LEGAL REVIEW`  
> **LAST UPDATED:** October 2026  
> **INTENDED PUBLIC ROUTE:** `/account-deletion` (linked from `/account/security` and `/privacy`)  
> **DISCLAIMER:** This document describes the operational rules, technical data categories, and deletion workflows for the GIFTEDproMovies platform in compliance with ADR-027 and applicable data protection legislation. It does not constitute formal legal advice.

---

## 1. Overview & Core Principles

At **GIFTEDproMovies**, we believe you should have control over your personal information. You have the right to request the deactivation and deletion of your account and associated personal data at any time.

Our deletion procedures are designed to honor your privacy rights while complying with mandatory legal, commercial, and tax obligations under **Architectural Decision ADR-027 (Purpose-Based Retention and Non-Cascading Account Deletion)**.

---

## 2. Account Deactivation vs. Permanent Deletion

We distinguish between two distinct account lifecycle states:

### 2.1 Account Deactivation (Temporary or Reversible)
* **What happens:** Your account status transitions to `deactivated`. All active login sessions across all devices are immediately revoked. You cannot log in or access library content.
* **Data state:** Your account record is preserved in a dormant state. If you wish to reactivate your account, you must contact customer support.

### 2.2 Permanent Deletion & Anonymization
* **What happens:** Your account is permanently closed. Personal identifying information (PII) is permanently erased or irreversibly anonymized.
* **Irreversibility:** Once completed, this action cannot be undone. Any remaining streaming windows, rental entitlements, or unused pass days are forfeited and cannot be recovered.

---

## 3. Data Classification & Retention Matrix (ADR-027)

To prevent data destruction that would violate statutory tax laws or compromise security audits, GIFTEDproMovies implements **non-cascading purpose-based data handling**:

| Data Category | Specific Elements | Action Upon Deletion Request | Retention Rationale |
| :--- | :--- | :--- | :--- |
| **Personal Identity & Credentials** | Email address, name, Argon2id password hash, email verification timestamps | **Permanently Erased / Anonymized**<br>(Email replaced with pseudonymized hash: `deleted_user_<id>@anonymized.local`; password hash wiped; identity unlinked) | Primary PII is removed from operational databases within 30 days. |
| **Third-Party Identity Links** | Google OAuth Subject ID (`sub`), email at link time (`user_identities` table) | **Permanently Deleted** | Link between your Google account and GIFTEDproMovies is severed. |
| **Active Sessions & Recognized Devices** | Session tokens, device names, client metadata (`sessions`, `devices` tables) | **Immediately Purged** | All active sessions and device tokens are revoked and deleted from the database. |
| **In-App Notifications** | User notification messages and read receipts (`notifications` table) | **Permanently Deleted** | Personal messaging and notification history are deleted. |
| **Commercial & Billing Records** *(Phases 4 & 5)* | Order IDs, transaction timestamps, payment reference IDs, amounts in TZS | **Retained in Pseudonymized Ledger**<br>(Account reference disassociated from personal identity) | **Mandatory Legal & Tax Retention:** Retained for statutory periods (typically 5–7 years under Tanzanian tax and accounting laws) for financial audit and VAT reconciliation. |
| **Security Audit Logs** | Append-only security events (`audit_events` table: login, password reset, deletion event) | **Retained (Append-Only)**<br>(Actor ID retained or pseudonymized; zero passwords/secrets stored) | **Fraud Prevention & Security Integrity:** Retained for security incident analysis, regulatory dispute defense, and system integrity. |

---

## 4. How to Request Account & Data Deletion

You can initiate account and data deletion through either of the following two methods:

### Method A: Self-Service Deletion via Account Settings *(Planned UI)*
1. Log in to your GIFTEDproMovies account.
2. Navigate to **Account Settings** (`/account/security` or `/account/settings`).
3. Scroll to the **"Danger Zone"** and select **"Delete Account & Data"**.
4. Confirm your password (or complete Google re-authentication).
5. A confirmation email will be delivered to your registered email address with a single-use verification link to prevent accidental or malicious deletion.
6. Click the verification link to authorize permanent deletion.

### Method B: Verified Email Request
If you cannot access your account, you may submit a deletion request via email:
1. Send an email to **`privacy@giftedpromovies.com`** from the **exact email address** associated with your GIFTEDproMovies account.
2. Use the subject line: `Account Deletion Request - [Your Registered Email]`.
3. To protect account owners against malicious deletion requests, our security team will verify your identity before processing the request (e.g., via a secure challenge link sent to the mailbox).

---

## 5. Deletion Timeline & Process

* **Immediate Action (Day 0):**
  * Account status is immediately changed to `deactivated`.
  * All active sessions (`gifted_session`) across all web and mobile devices are terminated.
  * You are logged out immediately.
* **Cooling-Off Window (Days 1–7):**
  * To protect users who may have initiated deletion by mistake or under duress, accounts are queued for permanent processing for seven (7) days.
* **Permanent Purging & Anonymization (Day 30):**
  * Within thirty (30) days of confirmation, all personal identifying records are permanently deleted or anonymized in accordance with Section 3.
  * Backups: Data contained within encrypted database disaster recovery backups will be naturally overwritten in accordance with our standard backup retention cycle (typically 30 days).

---

## 6. Impact on Active Purchases & Content Access

* **Forfeiture of Entitlements:** When your account is deleted, all active Pay-Per-View rentals, downloaded mobile packages, and unused VIP All-Access pass durations are permanently terminated.
* **No Automatic Refunds:** Account deletion does not entitle you to a refund for previously purchased digital content, rentals, or passes. If you believe you have an unresolved billing dispute, please resolve it with customer support before requesting account deletion.

---

## 7. Contact Information

For any questions, requests, or escalations regarding account and data deletion:

* **Data Privacy Officer:** `privacy@giftedpromovies.com`
* **Customer Support:** `support@giftedpromovies.com`
* **Physical Address:** `[Business Entity Name & Registered Address — Pending Final Legal Registration]`
