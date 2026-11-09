# GIFTEDproMovies3 — GPM-PRE-FRONTEND-REMEDIATION-PROGRAM
## Deliverable 1.5: Legal & Operations Requirement Traceability Matrix

**Document ID:** `GPM-LEGAL-OPERATIONS-TRACEABILITY`  
**Mission Reference:** `GPM-PRE-FRONTEND-REMEDIATION-PROGRAM` (Stage 1)  
**Authority:** Product Owner  
**Date:** 2026-11-04  
**Scope:** Legal Drafts, Statutory Compliance, Operations Runbooks & Operational Monitoring  

---

## 1. Legal Obligations vs Technical Controls Matrix

| Statutory / Legal Domain | Source Document | Concrete Technical Implementation | Organizational / Legal Responsibility | Traceability Status | Block Frontend Integration? | Block Launch? |
| :--- | :--- | :--- | :--- | :---: | :---: | :---: |
| **Personal Data Protection Act, 2022 (Tanzania)** | `docs/legal/LEGAL_...` §1.1 | Data minimization, Argon2id passwords, no third-party tracking cookies, purpose-based DB structure | Formal registration of operating entity with Tanzania PDPC as Data Controller | **TECHNICAL VERIFIED / PROCEDURAL PENDING** | **NO** | **YES** |
| **Data Protection Officer (DPO)** | `docs/legal/LEGAL_...` §2 | Contact placeholders in privacy drafts | Formal appointment of designated DPO registered with PDPC | **ORGANIZATIONAL ACTION REQUIRED** | **NO** | **YES** |
| **Cybercrimes Act, 2015 (Tanzania)** | `docs/legal/LEGAL_...` §1.3 | Strict transport security, CSRF defense, rate limiting, append-only `audit_events` | Periodic third-party penetration testing | **TECHNICAL VERIFIED** | **NO** | **NO** |
| **Consumer Protection (Fair Competition Act)** | `docs/legal/LEGAL_...` §1.4 | Transparent pricing in TZS, clear pass duration displays, no auto-renewal | Customer terms of service published | **TECHNICAL VERIFIED** | **NO** | **NO** |
| **Commercial Refund Terms (ADR-026)** | `docs/legal/LEGAL_...` §2 | Immutable payment ledger, manual reconciliation service | Formal business refund policy and dispute workflow | **APPROVED V1 MANUAL PROCESS** | **NO** | **NO** |
| **Statutory Accounting Record Retention** | `docs/legal/LEGAL_...` §2 | Financial records preserved immutably in `orders` and `payment_settlements` | Legal confirmation of exact statutory retention window (5 vs 7 years under TRA) | **TECHNICAL VERIFIED / LEGAL CONFIRMATION PENDING** | **NO** | **NO** |
| **Google OAuth Brand & Scope Verification** | `docs/legal/LEGAL_...` §3 | Google Sign-in with basic non-sensitive scopes (`openid`, `email`, `profile`) | Domain ownership in Search Console and public consent screen submission | **TECHNICAL VERIFIED / GOOGLE SUBMISSION PENDING** | **NO** | **YES** |
| **Content Distribution & Voiceover Rights** | `docs/legal/LEGAL_...` §1.2 | N/A (Out of code scope) | Commercial contracts with translating DJs and copyright licensors | **ORGANIZATIONAL ACTION REQUIRED** | **NO** | **YES** |

---

## 2. Operations Runbooks & Infrastructure Procedures

| Operational Procedure | Runbook Source | Script / Implementation Evidence | Human / Operational Action Required | Operational Status |
| :--- | :--- | :--- | :--- | :---: |
| **PostgreSQL Base Backup & WAL Archiving** | `docs/operations/BACKUP-RESTORE-DR-RUNBOOK.md` §3 | `wal-g` / `pg_basebackup` configuration documented | Provisioning off-site object bucket and KMS key | **RUNBOOK ACTIVE / CLOUD PROVISIONING PENDING** |
| **Point-in-Time Recovery (PITR) Drill** | `docs/operations/BACKUP-RESTORE-DR-RUNBOOK.md` §4 | Step-by-step restoration procedure | Executing live restore drill on isolated staging cluster | **HUMAN OPERATIONAL GATE OPEN (PRE-LAUNCH)** |
| **Email Outbox Partitioned Retention Cleanup** | `backend/docs/operations/EMAIL_OUTBOX_OPERATIONS.md` §3 | `backend/scripts/cleanup-outbox.mjs` (`pnpm run outbox:cleanup`) | Scheduling nightly orchestrator cron task | **IMPLEMENTED & VERIFIED** |
| **Email Outbox AES-256-GCM Key Rotation** | `backend/docs/operations/EMAIL_OUTBOX_OPERATIONS.md` §4 | Draining outbox, generating 256-bit key, restarting worker | Human execution during maintenance window | **SOP DOCUMENTED & VERIFIED** |
| **Resend Production Domain DKIM/SPF Setup** | `backend/docs/operations/EMAIL_OUTBOX_OPERATIONS.md` §1 | `mail.giftedpromovies.com` DNS records defined | Publishing DNS TXT/MX records at registrar | **HUMAN ACTION REQUIRED (LAUNCH GATE)** |

---
*End of GPM-LEGAL-OPERATIONS-TRACEABILITY.*
