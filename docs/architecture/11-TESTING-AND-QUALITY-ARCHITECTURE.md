# Testing and Quality Architecture

> **Document ID:** ARCH-011 · **Status:** Architecture guidance · **Depends on:** ARCH-001–010

## Purpose

Testing verifies documented behavior, invariants, security boundaries, and provider contracts without turning mocks into an alternate production architecture. Important domain rules should be testable in memory; persistence constraints and integration behavior require a real PostgreSQL-compatible environment. External provider adapters are isolated behind interfaces and tested independently from business policy (ARCH-001).

## Test layers

| Layer | Verifies | Typical boundary |
| --- | --- | --- |
| Domain/unit | State transitions, pricing/offer rules once approved, entitlement validity, publication policy, idempotency decisions | Pure domain inputs; no network or database. |
| Application/service | Orchestration, transaction intent, permission checks, module contracts | Replace provider ports with deterministic fakes; do not mock the rule being tested. |
| Repository/integration | PostgreSQL mappings, constraints, locking, transaction rollback, query shape | Isolated disposable test database/schema. |
| API | DTO validation, envelopes, status codes, auth/CSRF, object-level access | Exercise real transport pipeline without external providers. |
| Adapter contract | Provider request/response mapping, signature verification, timeout/error normalization | Provider sandbox or captured non-secret fixtures where available. |
| End-to-end | Critical customer/staff journeys across modules | Minimal stable workflows in a controlled environment. |

## High-risk behavior coverage

Test email verification and separate password recovery tokens, opaque database sessions, regeneration, inactivity/absolute expiry, logout/logout-all, password-reset revocation, and independent concurrent sessions. Test recognized device limit/revocation separately from session and active-stream limits. Test distinct device-limit versus stream-limit errors, atomic stream lease enforcement/release, and subscription policy snapshots.

Test authenticated-only purchase (no guest order), accepted payment states, signature verification, replay/idempotency, amount/currency/order matching, out-of-order transitions, and reconciliation. Prove verified `SUCCEEDED` remains distinct from fulfillment state; injected failures/retries recover access without duplicate charge or entitlement. Test all failure points around transaction/outbox commit and operational recovery state.

Test individual access starts at successful payment/activation and backend expiry, subscription immutable purchased terms/manual renewal, eligible catalog checks, individual purchase preservation after subscription expiry, and unique-title/download-action quota under concurrent attempts. Test that UI clicks do not consume quota, protected media URL issuance requires current backend authorization, provider failure is distinguishable from customer interruption, and repeated Range requests for a valid playback authorization are handled without treating the token as DRM.

Test content lifecycle separately from customer access: unpublish/archive preserve valid entitlements; destructive delete is guarded by commercial/audit records; access revocation is a separate authorized, reasoned, audited action and emits the required customer notification. Test fixed per-type readiness and server-side revalidation, taxonomy request/review audit, and capability-based Media Team restrictions. Test persistent in-app read/unread/history and email intents/retries without mutating the business result.

Database tests should cover foreign keys, uniqueness, check constraints, delete/archive behavior, transaction atomicity, and concurrent state transitions. Race-focused tests use independent connections and deterministic coordination rather than timing guesses. Migration tests verify forward application and supported rollback/recovery approach on representative prior data; migrations are not defined by this document.

## Contracts and test data

Use small, explicit fixtures with synthetic identities and media/provider identifiers. Never use production personal data, real credentials, or live payment endpoints in ordinary test runs. Fixtures should name state and purpose, not rely on opaque global seed order. Provider contract tests should verify normalized semantics and signature handling without coupling domain tests to SDK objects.

Fakes are test tools at declared ports; they must preserve meaningful failures and state behavior. Do not fake persistence constraints in a way that hides invalid data, or build broad mock layers that duplicate the production system. Avoid live side effects by default; sandbox testing is explicit and isolated.

## Quality gates and performance/security checks

CI quality gates should include formatting/lint, strict type checks, unit and integration suites, migration validation, API contract generation/validation, dependency vulnerability review, and targeted static security checks. Exact tools are subject to the repository's implementation stack and dependency discipline. Failing checks should be actionable and reproducible.

Performance tests target measured representative catalog sizes, query plans, concurrent authorization/payment callbacks, response sizes, and job throughput. They establish future budgets; do not use synthetic microbenchmarks as production guarantees. Security testing includes dependency scanning, authorization regression cases, input fuzzing at critical parsers, webhook signature/replay tests, and periodic threat review. Penetration-testing scope/cadence is **REQUIRES VALIDATION**.

## Test isolation and reliability

Each test owns its data and cleans it deterministically; parallel suites must not collide on fixed global records. Use transaction rollback only where it faithfully exercises tested behavior; concurrency and commit/outbox tests need committed independent transactions. Tests must not depend on order, wall-clock timing, internet availability, or shared mutable provider sandboxes.

## Related documents

ARCH-001 testability · ARCH-002 invariants · ARCH-003 security · ARCH-005 media · ARCH-006 payments/access · ARCH-007 jobs · ARCH-012 environments.
