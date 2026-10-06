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

---

## Phase 3: Catalog, Taxonomy Governance & Content Lifecycle

### Phase 3A: Domain Design & Decisions
* **Status:** **APPROVED BY PRODUCT OWNER**
* **Milestones Completed:**
  - [x] Architecture Specification: Authored `docs/architecture/PHASE_3_DOMAIN_DESIGN_AND_ARCHITECTURE.md` (and `ARCH-018`) detailing domain entities, relationships, state machines, readiness criteria, and governance rules with 100% portable plain-text ASCII diagrams.
  - [x] Final Archive Restoration Model: Replaced direct restoration with strict multi-step re-entry (`ARCHIVED` -> `DRAFT` -> `PENDING_REVIEW` -> `PUBLISHED` / auto-publish) requiring 100% publication readiness re-validation.
  - [x] Final Series Publication Invariant: Mandated that Series cannot publish as an empty "Upcoming" card; initial publication strictly requires Season 1 + Episode 1 with ready streaming & download media.
  - [x] Final Movie Edition Failure Model: Codified Case A (healthy secondary edition promoted to default; movie stays published) and Case B (no ready edition exists; movie transitions immediately to `UNPUBLISHED` while preserving customer entitlements).
  - [x] Submission Validation vs. Publication Readiness: Established clear architectural separation between editorial intake submission (completeness >= 80% + primary media passes) and authoritative server publication readiness (100% 9/9 checks verified inside publish transaction).
  - [x] Minimal Hierarchical Series Lifecycle: Defined lightweight parent/child model separating Series container status from Episode playback availability (`is_available`), ensuring newly added draft episodes never unpublish the live series.
  - [x] Rejection and Notification Ownership: Clarified `created_by`, `submitted_by`, and `assigned_to` responsibilities; preserved rejection review history; guaranteed that notification dispatch errors cannot roll back committed review decisions.
  - [x] Database Referential Integrity: Mandated PostgreSQL `ON DELETE RESTRICT` constraints for categories, countries, and DJs; added smart deletion safeguard with safe deactivation.
  - [x] ADR Status Governance: ADR-031, ADR-032, and ADR-033 maintained as `PROPOSED — PENDING PRODUCT OWNER REVIEW` in `docs/architecture/15-ARCHITECTURE-DECISIONS-AND-TRADEOFFS.md` awaiting final human approval.
  - [x] Scope Containment: Zero production code, schema migrations, or database changes introduced. Stopped awaiting final human product-owner sign-off before Phase 3B.

### Phase 3B: Database Schemas & Migrations
* **Status:** **PHASE 3B ACCEPTED BY PRODUCT OWNER (OPTION C RESIDUAL RISK ACCEPTED)**
* **Milestones Completed:**
  - [x] PostgreSQL Enums: Implemented `content_type`, `content_status` (5-state: `draft`, `pending_review`, `published`, `unpublished`, `archived`), `episode_status` (`draft`, `published`, `archived`), and `media_status` (`pending`, `processing`, `ready`, `failed`). (Purged unapproved `pricing_model` enum).
  - [x] Core Catalog Schemas:
    - `categoriesTable`: Case-insensitive unique indexes on `lower(slug)` and `lower(name)`.
    - `countriesTable`: Unique indexes on `upper(code)` and `lower(name)`.
    - `djVoiceArtistsTable`: Case-insensitive unique index on `lower(slug)` and indexed `stage_name` (purged unapproved `tier` and `contract_type`).
    - `contentTable`: Movies and series container, `code_id` unique, `slug` unique, 5-state lifecycle enum, audit fields (`created_by` ON DELETE RESTRICT for audit retention, `submitted_by`, `assigned_to`, `approved_by`), rejection note, and transition timestamps.
    - `movieEditionsTable`: Compound unique index on `(movie_id, dj_id)` and partial unique index on `movie_id WHERE is_default = true` enforcing $\le 1$ default edition per movie at the database level.
    - `seriesMetadataTable`: Metadata referencing `lead_dj_id` (`ON DELETE RESTRICT`) with zero commerce leakage.
    - `seasonsTable`: Compound uniqueness on `(series_id, season_number)` and cascade deletion on series deletion.
    - `episodesTable`: Compound uniqueness on `(season_id, episode_number)`, `is_available` boolean, and independent `episode_status`.
    - `contentCategoriesTable` & `contentCountriesTable`: Composite primary keys and `ON DELETE RESTRICT` on taxonomy IDs.
    - `contentReviewNotesTable`: Historical append-only review notes capturing `rejection_reason` across state transitions.
    - `systemSettingsTable`: Platform configurations (`key` unique) supporting `publishingRequiresApproval`.
  - [x] Forward Migration Generation & Live Application:
    - Initial forward migration `0003_spotty_absorbing_man.sql` created catalog entities.
    - Remediation forward migration `0004_chunky_clint_barton.sql` cleanly dropped `series_metadata.pricing_model`, enum `pricing_model`, and `dj_voice_artists.tier` / `contract_type`.
    - Verified against live isolated PostgreSQL test cluster.
  - [x] Functional Database Integration Testing (`tests/catalog-database.integration.test.ts`):
    - 24 test assertions covering positive creation, relationships, and negative constraints (unique indexes, enums, `ON DELETE RESTRICT`, partial indexes, 0-default draft support, and settings key uniqueness). 24/24 PASS.
  - [x] Security Attack & Concurrency Testing (`tests/catalog-security-attacks.test.ts`):
    - 10 security test scenarios covering Attacks A through I (double default edition race, taxonomy deletion race, slug race, junction race, invalid FK attachment, lifecycle enum injection, media status enum injection, polymorphic cross-type attachment integrity, and account deletion audit retention). 10/10 PASS.
  - [x] Full Automated Regression Test Suite (`pnpm run test`):
    - 162 total test assertions: 161 PASS, 0 FAIL, 1 cleanly skipped.
  - [x] Quality Gates:
    - `pnpm run build`: PASS (Exit 0)
    - `pnpm run typecheck`: PASS (Exit 0)
    - `pnpm run lint`: PASS (Exit 0)
  - [x] Strict Scope Containment: Zero controllers, services, public APIs, or commerce tables introduced.
  - [x] ADR-034 Accepted: Polymorphic Relationship Integrity via Transactional Domain Enforcement (Option C) approved by Product Owner; direct SQL cross-type residual risk explicitly documented.

### Phase 3C: Services, Lifecycle State Machines & Business Logic
* **Status:** **PHASE 3C STAGE 3 — FINAL EVIDENCE VERIFIED (READY FOR PRODUCT OWNER ACCEPTANCE)**
* **Milestones Completed:**
  - [x] Stage 0 & 1 Design Package completed: Module boundaries, service contracts, repository pattern, database privilege model, and test matrix.
  - [x] Stage 1 Design Refinement (`docs/architecture/PHASE_3C_STAGE_1_REFINED_DESIGN.md`): Review Items A–D resolved and approved by Product Owner with 10 mandatory implementation refinements.
  - [x] Stage 2 Implementation (`src/modules/catalog/`):
    - [x] Polymorphic Domain Integrity: Negative enforcement against cross-type attachments (`Movie` -> `series_metadata`/`seasons`, `Series` -> `movie_editions`), positive attachments with canonical row locking.
    - [x] Canonical Row Locking Protocol: Single lock order established (`content FOR UPDATE` -> `movie_editions FOR UPDATE ORDER BY id ASC`) for edition mutations; hierarchical key share locking (`content FOR KEY SHARE` -> `seasons FOR KEY SHARE` -> authoritative re-read) for episode attachments.
    - [x] Content Discriminator Immutability: `content_type` strictly excluded from update DTOs, interfaces, and repository update helpers.
    - [x] Authoritative 9/9 Publication Readiness Engine: Evaluated strictly in-transaction before transition to `published`.
    - [x] Series Initial Gate: Enforces Season 1 + Episode 1 with ready media before initial series publication.
    - [x] Movie Default Edition Outage Fallback: Case A promotes secondary ready edition; Case B unpublishes movie if no ready edition remains.
    - [x] Strict Archive Restoration: Enforces `ARCHIVED` -> `DRAFT` only; direct restoration to `PUBLISHED` rejected.
    - [x] Rejection Workflow: Requires non-empty written reason, transitions to `draft`, inserts append-only review note, emits in-transaction audit event, triggers post-commit notification via existing `NotificationsService` without new queue infrastructure.
    - [x] In-Transaction Audit Atomicity: Extended `AuditService.recordEvent({ tx, failClosed: true })`. Write failures throw and trigger PostgreSQL `ROLLBACK` of business mutation.
    - [x] Taxonomy Safeguards: Smart deletion blocks deletion of referenced entities (`409 TAXONOMY_IN_USE`) and recommends safe deactivation (`is_active: false`).
    - [x] Staff REST Controllers & Security Guards: Endpoints protected by `SessionAuthGuard`, `RolesGuard`, and `CapabilitiesGuard` (`CONTENT_CREATE`, `CONTENT_EDIT`, `CONTENT_PUBLISH`, `CONTENT_ARCHIVE`, `TAXONOMY_MANAGE`).
    - [x] Error Handling: Global `ApiExceptionFilter` returns canonical domain error envelopes with zero SQL/schema leaks.
  - [x] Stage 3 Functional Verification & Evidence Gap Closure:
    - [x] Comprehensive Functional Verification Test Suite (`tests/catalog-functional-verification.test.ts`): 37/37 tests PASS covering Domains A through J:
      - Domain A: Lifecycle transitions, emergency unpublish, archive restoration strictly to draft, rejection reason required, review note creation.
      - Domain B: Authoritative 9/9 publication readiness checklist with isolated negative testing of each criterion, separate movie publication prerequisite (`DEFAULT_EDITION_REQUIRED`), and ready movie publication.
      - Domains C & D: Compound edition uniqueness, single default edition invariant, outage fallback Case A (promote secondary ready edition) and Case B (unpublish movie).
      - Domain E: Series initial publication gate (Season 1 + Episode 1 ready media required, with Gap B fully verified across 9 explicit assertions for pending media) and subsequent draft episode resilience (no unpublishing of live series).
      - Domain F: Taxonomy governance, case-insensitive collision detection (409 `SLUG_ALREADY_EXISTS`), unreferenced deletion, and referenced deletion blocking (409 `TAXONOMY_IN_USE`).
      - Domain G: Review & approval workflow, Gap A verified (`publishingRequiresApproval = true` keeps ready content in `pending_review` with zero `CONTENT_PUBLISH` audit events and 1 `CONTENT_SUBMIT_REVIEW` event), auto-publishing (`publishingRequiresApproval = false`), rejection review note recording, and in-app author notification delivery.
      - Domain H: Audit correctness, actorId/action/resource/metadata validation, and fail-closed transactional rollback on audit write failure.
      - Domain I: Authorization & capabilities HTTP injection testing (401 unauthenticated, 403 customer, 403 unprivileged staff, 201 staff with capability, 201 admin).
      - Domain J: Standard API error envelope `{ success: false, error: { code, message, timestamp, requestId } }`, canonical HTTP status codes, and sanitized 500 internal errors with zero SQL/schema leakage.
    - [x] Full Regression Suite (`pnpm run test`): 223 tests total (222 PASS, 0 FAIL, 1 cleanly skipped).
    - [x] Quality Gates:
      - `pnpm run build`: PASS (Exit 0)
      - `pnpm run typecheck`: PASS (Exit 0)
      - `pnpm run lint`: PASS (Exit 0)
  - [x] Scope Containment: Zero schema modifications, zero migrations, zero database triggers, zero commerce/playback/payment leakage, zero Redis/BullMQ/Kafka queues introduced.
  - [x] Stage 4 Security & Integrity Adversarial Verification:
    - [x] Comprehensive Adversarial Test Suite (`tests/catalog-stage4-adversarial.test.ts`): 26/26 attacks PASS across 15 threat categories against local PostgreSQL 16 test cluster.
      - Category A (Attacks A.1–A.4): 401 unauthenticated, 403 customer horizontal IDOR, central status blocking for suspended/deactivated, central status blocking for pending verification.
      - Category B (Attacks B.1–B.2): Staff capability boundaries enforced (`CONTENT_CREATE` unable to edit/publish/archive/manage taxonomy), role escalation payload tampering neutralized.
      - Category C (Attacks C.1–C.3): Swapped parent/child season IDOR rejected (404), cross-movie default edition manipulation rejected (422), outage fallback cross-movie IDOR rejected (422).
      - Category D (Attacks D.1–D.4): Polymorphic cross-type attachment blocked (movie editions on series, series metadata on movie, seasons on movie all return 422), `contentType` immutability verified.
      - Category E (Attack E.1): Invalid lifecycle transitions strictly rejected with 400 `INVALID_LIFECYCLE_TRANSITION`.
      - Category F (Attack F.1): 9-point publication readiness checklist strictly enforced; missing criteria enumerated in 422 error response.
      - Category G (Attack G.1): Partial unique index `idx_movie_editions_single_default` verified in PostgreSQL (SQLSTATE 23505 on raw attempt to create 2 default editions).
      - Category H (Attack H.1): Outage fallback Case A and Case B maintain exact default edition count and lifecycle invariants.
      - Category I (Attack I.1): Series publication without Season 1 Episode 1 ready media strictly rejected (422).
      - Category J (Attack J.1): In-use taxonomy deletion blocked (409 `TAXONOMY_IN_USE`).
      - Category K (Attack K.1): `publishingRequiresApproval` system setting dynamically switches review queue vs auto-publish; unauthorized route access rejected (401/404).
      - Category L (Attack L.1): Fail-closed audit failure verified to trigger complete transactional rollback.
      - Category M (Attacks M.1–M.2): SQL injection payloads in title/slug safely parameterized without execution; unhandled 500 errors sanitized with zero database internals/relation leakage.
      - Category N (Attack N.1): Concurrent default edition promotion race settled cleanly with 0 deadlocks (SQLSTATE 40P01) and deterministic serialization.
      - Category O (Attack O.1): ADR-034 residual risk re-verified; application layer blocks cross-type writes; raw direct SQL write bypass confirms production requirement for database role restrictions.
    - [x] Full Backend Regression Suite (`pnpm test`): 248 PASS / 0 FAIL / 1 SKIPPED across 249 tests.
    - [x] Quality Gates: `pnpm run build` (PASS), `pnpm run typecheck` (PASS), `pnpm run lint` (PASS).
    - [x] Findings: 0 Security Findings, 0 Integrity Findings, 0 Scope Violations.
  - [x] Stage 5 Remediation Review & No-Finding Closure:
    - [x] Comprehensive review of all 26 Stage 4 attack vectors and results.
    - [x] Findings Classification: 25 vectors classified as Expected Behavior; 1 vector (Attack O.1) classified as Accepted Residual Risk (ADR-034 Option C).
    - [x] Genuine Security Findings: 0. Genuine Integrity Findings: 0.
    - [x] Production Code Remediation: NONE — NO REMEDIATION REQUIRED. Zero runtime source code or database schemas altered.
    - [x] Formal Engineering Verdict: **STAGE 5 COMPLETE — NO REMEDIATION REQUIRED**. Ready for Stage 6 authorization.
  - [x] Stage 6 Final Architecture, Security, Integrity & Scope Audit:
    - [x] Comprehensive independent verification across all 26 required audit areas.
    - [x] Confirmed zero genuine security findings, zero integrity findings, zero scope contamination, and zero documentation discrepancies.
    - [x] ADR-034 direct-SQL residual risk re-verified and documented. Quality gates 100% green.
    - [x] Formal Engineering Verdict: **STAGE 6 FINAL AUDIT COMPLETE — NO FINDINGS — READY FOR STAGE 7**.
  - [x] Stage 7 Product Owner Acceptance & Formal Closure:
    - [x] Final Product Owner acceptance review of complete Phase 3C delivery across Stages 0 through 6.
    - [x] All 7 stage gates verified with executable repository evidence.
    - [x] 0 blockers, 0 security/integrity findings, 0 scope contamination.
    - [x] ADR-034 direct-SQL residual risk explicitly accepted.
    - [x] Acceptance Date: **2026-10-06**.
    - [x] Formal Status: **PHASE 3C — PRODUCT OWNER ACCEPTED AND CLOSED**.
