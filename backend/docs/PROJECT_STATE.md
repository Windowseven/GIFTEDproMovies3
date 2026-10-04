# GIFTEDproMovies — Backend Project State

> **Authoritative State Record**  
> **Last Updated:** 2026-10-04  
> **Repository Branch:** `main`  
> **Stack:** NestJS 12, Fastify 5, TypeScript (strict), PostgreSQL, Drizzle ORM, Pino  

---

## 1. Current Phase Status

| Phase | Description | Status | Verification / Notes |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Foundation, Stack & Delivery Controls | **COMPLETE & VERIFIED** | All quality gates passed (build, typecheck, lint, 11 tests pass, 0 fail). ADR-003 and ADR-005 promoted to ACCEPTED. Zero domain leaks. |
| **Phase 2** | Accounts, Authentication, Sessions, Devices & Authorization Foundation (incl. Google OAuth & Hardened Email Outbox) | **COMPLETE / APPROVED** | 127 automated tests passing (0 fail, 1 skipped). Resend integration verified live. Google OAuth 2.0 / OIDC verified live. PostgreSQL Transactional Outbox + dedicated background worker with AES-256-GCM payload encryption, production URL safety guardrails, production sending domain validation (fail-closed, no dev fallback in prod), outbox retention cleanup maintenance command (`pnpm run outbox:cleanup`), and outage recovery verified live against Resend API. Link-based verification UX contract documented in `docs/frontend/32_EMAIL_VERIFICATION_AND_RESET_CONTRACT.md`. Operational runbook documented in `backend/docs/operations/EMAIL_OUTBOX_OPERATIONS.md`. Phase 2 Email Delivery & Verification Hardening is complete. Remaining items are operational deployment tasks or future hardening, not architectural blockers. |
| **Phase 3** | Catalog, Taxonomy Governance & Content Lifecycle | **QUEUED** | Authorized to proceed upon user kickoff. |
| **Phase 4** | Offers, Orders, Subscriptions & Entitlement Domain | **QUEUED** | Strictly deferred. |
| **Phase 5** | Payment Attempts, Verified Settlement & Fulfillment Recovery | **QUEUED** | Strictly deferred. Provider pending evaluation. |
| **Phase 6** | Media Intake & Provider Adapter | **QUEUED** | Strictly deferred. |
| **Phase 7** | Playback, Downloads, Quotas, Devices & Stream Leases | **QUEUED** | Strictly deferred. |
| **Phase 8** | Cross-System Production Readiness & Operational Proof | **QUEUED** | Strictly deferred. |

---

## 2. Active Implementation Directives & Boundaries

* **Phase Boundary Rule:** Only the authorized phase may be implemented. Do NOT pull forward entities or tables from subsequent phases (e.g., no Movie/Series/Commerce tables in Phase 2).
* **Source of Truth Precedence:**
  1. Approved User Requirements
  2. Authoritative Architecture Documents (`docs/architecture/01`–`17`)
  3. Accepted ADRs (`docs/architecture/15-ARCHITECTURE-DECISIONS-AND-TRADEOFFS.md`)
  4. Backend Implementation Plan (`ARCH-017`)
  5. Existing Implementation
* **Security Non-Negotiables:**
  - Opaque database-backed sessions with `HttpOnly`, `SameSite=Lax`, `Secure` cookies (`gifted_session`).
  - Passwords hashed using Argon2id with no silent fallback; nullable for OAuth-only users without dummy passwords.
  - Google Identity Provider boundary: Google is strictly an external IdP; GIFTEDproMovies database is the single authority for user ID, roles, capabilities, and sessions. Mapped via immutable `sub` in `user_identities`.
  - Anti-Account Takeover (Case C): Zero auto-linking on email collision without active authenticated session.
  - OAuth State Cookie: Short-lived (10 min), signed HMAC-SHA256, HttpOnly, single-use with immediate clearance.
  - Lockout Protection: Unlinking Google strictly blocked if user has no password set.
  - Device identifiers are recognition metadata only, never an authorization factor.
  - Tokens (`auth_tokens`, `sessions`) stored only as SHA-256 hashes in PostgreSQL.
  - Audit logging is append-only; high-risk operations fail closed on audit write failures.
  - Public registration defaults to `customer` role; `admin` bootstrap strictly restricted to secure CLI command.

---

## 3. Pending Decisions & Gates

* **Phase 2 Google Extension:** **COMPLETE & VERIFIED LIVE**. Real Google OAuth 2.0 flow executed live against Google production endpoints: authorization consent granted, authorization code exchanged, OIDC ID token validated via TokenInfo, immutable `sub` resolved (`107679159903501725561`), PostgreSQL identity record linked, authoritative `gifted_session` issued, subsequent authenticated request validated, and audit event logged without secrets. Automated test suite (81/81) and quality gates (build, typecheck, lint) 100% green.
* **Phase 3 Execution Gate:** Awaiting explicit user approval before Phase 3 implementation begins.
* **Payment Provider:** Pending evaluation before Phase 5.
* **Media Provider:** Cloudflare Stream / R2 provisional pending validation before Phase 6.
