# GIFTEDproMovies — Backend Project Progress

> **Phase Milestones & Verification History**  
> **Last Updated:** 2026-09-30  

---

## Phase 1: Foundation, Stack & Delivery Controls
* **Status:** **COMPLETE & VERIFIED**
* **Milestones Completed:**
  - [x] NestJS 12 + Fastify 5 core application pipeline
  - [x] Request ID correlation (`x-request-id`) with format validation & propagation
  - [x] Security headers via `@fastify/helmet`
  - [x] CORS configuration with strict non-wildcard credentials support
  - [x] Bounded body limits (413 Payload Too Large on overflow)
  - [x] Global exception filter & standard API error envelope
  - [x] Global interceptor & standard API success envelope
  - [x] Environment variable strict parsing & secret redaction
  - [x] Structured Pino logger with recursive sensitive key masking
  - [x] PostgreSQL connection pool (`pg.Pool`) & Drizzle client
  - [x] Liveness (`/health/live`) & readiness (`/health/ready`) endpoints
  - [x] OpenAPI Swagger documentation generation (`/api/v1/docs`, disabled in production)
  - [x] Disposable migration fixture & tool evaluation
  - [x] Automated test suite (11 unit/HTTP tests passing, 0 failing, 1 integration test cleanly skipped)
  - [x] ADR-003 (NestJS+Fastify) & ADR-005 (Drizzle ORM) promoted to `ACCEPTED`

---

## Phase 2: Accounts, Authentication, Sessions, Devices & Authorization Foundation
* **Status:** **COMPLETE & VERIFIED**
* **Milestones Completed:**
  - [x] Database Schema: Drizzle schemas (`users`, `auth_tokens`, `sessions`, `devices`, `user_capabilities`, `notifications`, `audit_events`) registered in `ApplicationDatabase`
  - [x] Password Hashing: Argon2id with strict parameters (memoryCost: 64MB, timeCost: 3, parallelism: 4) & zero silent fallback
  - [x] Identity Lifecycle: Public registration (forces role=customer, status=pending_verification), email verification, password reset, account status transitions matrix
  - [x] Session Management: Opaque DB sessions, SHA-256 token hashing, 14d inactivity throttling (15m touch), 30d non-extensible absolute expiry, privilege rotation, revocation
  - [x] Device Tracking: Recognized device registration, non-authoritative metadata, cascade session revocation on device removal
  - [x] Central Account-Status Enforcement: Central boundary in `SessionAuthGuard` rejects suspended/deactivated accounts; restricts unverified accounts to `@AllowUnverified` operations
  - [x] Authorization: Role guards (`customer`, `media_team`, `admin`), staff capabilities (`CONTENT_PUBLISH`, etc.), customer-staff capability barrier
  - [x] Admin Bootstrap: Controlled CLI script (`scripts/bootstrap-admin.mjs`) with environment secret protection and Argon2id hashing
  - [x] Real Email Provider Adapter: `ResendEmailSender` implementing `EmailSender` interface; reads credentials from environment, dispatches verification and password reset emails, redacts secrets
  - [x] Notification Primitive: In-app notification persistence with unread count, pagination, IDOR protection & `EmailSender` port with dynamic provider selection
  - [x] Audit Logging: Append-only audit trail with recursive secret redaction and fail-closed semantics on critical security operations
  - [x] Automated Testing: Unit, integration, security negative tests, and regression suite (56 passing tests, 0 failing, 0 skipped)
  - [x] Real Email Inbox Confirmation: Live Resend dispatch verified with human confirmation and cryptographic token delivery to `lespikiusjunior@gmail.com`
  - [x] Full Auth E2E Lifecycle: Real registration, Resend verification invalidation, token verification, replay rejection, login session creation, password reset, session revocation, and account status enforcement (all verified against live database and Resend service)
  - [x] Quality Gates: `pnpm run build`, `pnpm run typecheck`, `pnpm run lint`, `pnpm run test` (all 100% green)

### Phase 2 Extension: Google Authentication (OAuth 2.0 / OpenID Connect)
* **Status:** **COMPLETE & VERIFIED**
* **Milestones Completed:**
  - [x] Database Schema: Created `user_identities` table mapping `(provider, provider_subject)` uniquely to `users.id` with cascade deletion; updated `users.password_hash` to nullable for OAuth-only users without dummy passwords.
  - [x] Migration: Generated Drizzle migration `0001_sharp_the_executioner.sql` and applied to live PostgreSQL test database.
  - [x] Configuration: Added `googleClientId`, `googleClientSecret`, `googleCallbackUrl`, `frontendUrl` to strict environment parsing; updated sensitive logging paths for OAuth code, token, verifier, state, and nonce redaction.
  - [x] PKCE & State Security: Implemented `generatePkcePair` (`S256`), HMAC-SHA256 state serialization, 10-minute expiry enforcement, and single-use `gp_oauth_state` HttpOnly cookie with immediate post-callback clearance.
  - [x] Open Redirect Defense: Implemented strict URI validator neutralizing malicious protocols (`javascript:`, `data:`), protocol-relative links (`//`), backslashes (`\`), and foreign origins to `FRONTEND_URL`.
  - [x] Core OAuth Service (`GoogleAuthService`):
    - Case A: Existing Google identity login with central account status enforcement (`suspended` / `deactivated` blocked).
    - Case B: New user atomic transaction creating customer user (`role: 'customer'`, `status: 'active'`, `emailVerifiedAt: NOW()`) + `user_identities` link.
    - Case C: Conflict defense against account takeover when Google email matches existing local password account — redirects to `/auth/login?error=account_exists_link_required` without auto-linking.
    - Case D: Zero privilege modification on staff identity (`media_team`, `admin`).
    - Lockout Defense: Unlinking Google identity blocked with 400 Bad Request if user has no password set.
  - [x] HTTP Endpoints:
    - `GET /api/v1/auth/google` (initiates flow, sets cookie, 302 redirects)
    - `GET /api/v1/auth/google/callback` (handles code exchange, verifies claims, sets session cookie, clears state cookie, 302 redirects)
    - `POST /api/v1/auth/google/link` (links Google to active session)
    - `DELETE /api/v1/auth/google/unlink` (unlinks Google from active session with lockout protection)
  - [x] Automated Testing: 81 passing tests (25 new tests: 5 state/PKCE unit, 4 redirect validator unit, 6 service unit, 8 HTTP integration & attack suite, 2 config/resend unit). 0 failures, 0 skipped.
  - [x] Real Google E2E Script: Created `backend/scripts/run-real-google-e2e.mjs` with PKCE initiation, code exchange, tokeninfo validation, and live PostgreSQL verification.
  - [x] Live Real Google OAuth E2E Verification: Executed full authorization code exchange live with Google production token endpoints. Verified OIDC signature and claims via TokenInfo (`sub: 107679159903501725561`, `email: lespikiusjunior@gmail.com`). Linked identity in PostgreSQL, issued authoritative `gifted_session`, verified subsequent authenticated request, verified zero duplicate users/identities, and verified audit log integrity without secret leakage.
  - [x] Frontend Integration Documentation: Authored `docs/frontend/31_GOOGLE_AUTH_INTEGRATION.md` detailing contracts, redirect params, error messages, and UI linking checklist.
  - [x] Architecture Decision Record: Promoted ADR-030 to `ACCEPTED` in `docs/architecture/15-ARCHITECTURE-DECISIONS-AND-TRADEOFFS.md`.
  - [x] Quality Gates: `pnpm run build` (PASS), `pnpm run typecheck` (PASS), `pnpm run lint` (PASS), `pnpm run test` (81/81 PASS).

### Phase 2 Extension: Email Delivery & Verification Hardening
* **Status:** **COMPLETE / APPROVED**
* **Milestones Completed:**
  - [x] Database Schema: Created `email_outbox` table with explicit `lease_until`, `failure_code`, `encrypted_payload`, `payload_iv`, `payload_tag`, `attempts`, `max_attempts`, and compound performance indexes (`(status, available_at)`, `(lease_until)`, `(event_type, status)`).
  - [x] Migration: Generated Drizzle migration `0002_quiet_outbox.sql` and applied to live PostgreSQL test database.
  - [x] Payload Cryptography (`outbox-crypto.ts`): AES-256-GCM encryption with unique 96-bit IV per row, 128-bit authentication tag verification, and strict fail-closed error handling with zero secret leakage.
  - [x] Template Service (`email-template.service.ts`): Professional, responsive HTML and plain-text email templates with accessible CTA links (`/verify-email?token=...`, `/reset-password?token=...`) and rigorous HTML character escaping. Raw tokens completely eliminated from visible email copy.
  - [x] Outbox Service (`email-outbox.service.ts`): Atomic outbox job enqueueing inside existing Drizzle transaction boundaries; superseded job cancellation (`cancelSupersededJobs`).
  - [x] Dedicated Background Worker (`email-outbox.worker.ts`):
    - Concurrent-safe batch claiming using `FOR UPDATE SKIP LOCKED` and lease locking.
    - Automatic stale-lease recovery for crashed worker resiliency (`lease_until < NOW()`).
    - Authoritative pre-dispatch token validation against `auth_tokens` before calling provider without long open DB transactions.
    - Safe error categorization into transient (backoff retry) vs permanent failure codes (`NETWORK_TIMEOUT`, `PROVIDER_RATE_LIMIT`, `PROVIDER_5XX`, `PROVIDER_REJECTED`, `TOKEN_EXPIRED`, `TOKEN_ALREADY_USED`, `MAX_ATTEMPTS_EXCEEDED`, `PAYLOAD_DECRYPTION_FAILURE`).
    - Error message sanitization stripping emails, URLs, tokens, and bounding string lengths.
    - Bounded exponential backoff with configurable jitter.
  - [x] AuthService Decoupling: Refactored `register`, `resendVerification`, and `requestPasswordReset` to commit user, token, and encrypted outbox job in a single atomic database transaction. Synchronous dependency on external email provider completely removed (registration latency reduced to < 500ms).
  - [x] Automated Testing: 127 passing tests across entire backend test suite (46 new tests across `outbox-crypto.test.ts`, `email-template.test.ts`, `email-outbox-worker.test.ts`, `email-outbox-integration.test.ts`, `email-outbox-security-attack.test.ts`, `frontend-url-safety.test.ts`, `resend-outage-and-recovery.test.ts`, and `email-outbox-concurrency.test.ts`). 0 failures, 1 gracefully skipped.
  - [x] Mandatory Checkpoint A & B Verification:
    - Checkpoint A (Resend Provider Outage & Recovery): Verified registration succeeds in < 200ms when Resend is completely offline; worker performs exponential backoff and recovers automatically when Resend returns; outbox row transitions to `provider_accepted`; verification token consumed once; replay attacks rejected.
    - Checkpoint B (Password Reset Outage & Recovery): Verified password reset never throws on provider failure; user enumeration protections intact; worker dispatches on recovery; token works once and revokes active sessions.
  - [x] Production URL Safety Guardrails: Enforced HTTPS origin requirement in production; rejected HTTP/localhost/loopback, credentials, queries, fragments, subpaths, and unregistered origins (must match `CORS_ORIGINS`). Tested via `frontend-url-safety.test.ts` (8/8 pass).
  - [x] Production Resend Sending Domain Hardening:
    - Implemented: Configuration-driven `EMAIL_FROM` with strict fail-closed enforcement in production; forbidden development sender `@resend.dev` fallback in production.
    - Implemented: `EMAIL_PROVIDER` forbidden to be `in_memory` in production; `RESEND_API_KEY` strictly required.
    - Documented: Complete DNS specifications (SPF, DKIM, DMARC, MX) in `backend/docs/operations/EMAIL_OUTBOX_OPERATIONS.md`.
  - [x] Outbox Failure Visibility: Documented diagnostic SQL queries for operator visibility into permanently failed jobs, max retry exhaustion, and recent provider errors without adding external monitoring stacks.
  - [x] Outbox Retention & Cleanup Maintenance:
    - Implemented: CLI maintenance command `pnpm run outbox:cleanup` (`backend/scripts/cleanup-outbox.mjs`) supporting `--dry-run`, purging `provider_accepted` and superseded jobs older than 30 days while indefinitely preserving `failed` jobs for audit.
  - [x] Key Rotation Procedure: Documented safe drain, rotate, redeploy, and verify operational procedure in `backend/docs/operations/EMAIL_OUTBOX_OPERATIONS.md` with explicit notation of single-key zero-downtime operational limitation.
  - [x] Concurrency & At-Least-Once Delivery: Verified concurrent batch claiming across multiple workers using `FOR UPDATE SKIP LOCKED` without double-claiming, plus automatic reclamation of orphaned jobs via stale leases.
  - [x] Latency Isolation Benchmark: Confirmed complete decoupling between registration latency and external provider health:
    - Normal Provider: 171ms
    - Slow Provider (3000ms delay): 160ms
    - Outage Provider (Immediate Timeout Exception): 143ms
    - All scenarios strictly bounded < 500ms.
  - [x] Real Outbox E2E Verification: Executed live end-to-end against live PostgreSQL and real Resend production service:
    - Asynchronous registration completed in 315ms without blocking on Resend.
    - Verified encrypted payload in PostgreSQL `email_outbox` table.
    - Dedicated worker claimed job, validated token, and dispatched via Resend.
    - Received real Resend message ID (`01a106b1-f204-7ba1-b16c-59f96792df9e`).
    - Inspected delivered email content via Resend API: verified professional verification link and zero raw code exposure.
    - Consumed link via `POST /api/v1/auth/verify-email`, upgrading account status to `active`.
    - Verified single-use token replay rejection (`400 Bad Request`).
  - [x] Frontend Integration Documentation: Authored `docs/frontend/32_EMAIL_VERIFICATION_AND_RESET_CONTRACT.md` detailing `/verify-email` and `/reset-password` page routing, query param parsing, UI state machines, and security/privacy safeguards.
  - [x] Operational Documentation: Authored `backend/docs/operations/EMAIL_OUTBOX_OPERATIONS.md`.
  - [x] Quality Gates: `pnpm run build` (PASS), `pnpm run typecheck` (PASS), `pnpm run lint` (PASS), `pnpm run test` (127/127 PASS).
  - [x] Phase 2 Closure: **PHASE 2 — COMPLETE / APPROVED**. Ready to advance to Phase 3.

