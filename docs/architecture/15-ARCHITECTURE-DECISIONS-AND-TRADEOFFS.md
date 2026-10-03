# Architecture Decisions and Trade-offs

> **Document ID:** ARCH-015 · **Status:** Decision register · **Authority:** ARCH-001 for foundation decisions

This register indexes existing architectural decisions and makes their current status visible. It does not supersede ARCH-001 or silently promote provisional choices. New evidence or changes require a dated, reviewed ADR update with impact on dependent documents.

| ID | Decision | Status | Rationale / trade-off | Related |
| --- | --- | --- | --- | --- |
| ADR-001 | Modular monolith; one deployable backend with explicit domain boundaries | **ACCEPTED** | Fits team/operational capacity and permits local transactions; requires discipline to prevent boundary erosion. | ARCH-001, 002, 013 |
| ADR-002 | Node.js LTS + TypeScript strict mode | **ACCEPTED** | Shared language ecosystem and typed contracts; runtime upgrades and dependency hygiene remain necessary. | ARCH-001, 011, 013 |
| ADR-003 | NestJS + Fastify adapter | **ACCEPTED** | Evaluated and confirmed in Phase 1 spike; cohesive modular framework with Fastify HTTP performance, custom request tracing, security headers, and standard error envelopes. | ARCH-001, 004, 009 |
| ADR-004 | PostgreSQL managed relational database as authoritative store | **ACCEPTED** | ACID transactions, relational integrity, and built-in search; requires connection/pool and restore discipline. | ARCH-001, 002, 006, 014 |
| ADR-005 | Drizzle ORM / SQL-first persistence | **ACCEPTED** | Evaluated and confirmed in Phase 1 spike; typed transparent SQL access, clean connection pooling via `pg.Pool`, repeatable migration tooling via `drizzle-kit`, without persistence defining domain concepts. | ARCH-001, 002, 011 |
| ADR-006 | Server-controlled HttpOnly cookie authentication | **ACCEPTED** | Reduces JavaScript token exposure; CSRF defenses and cookie/session configuration are required. | ARCH-001, 003, 004 |
| ADR-007 | Opaque database-backed sessions; multiple independently revocable sessions | **ACCEPTED** | Server-side revocation; inactivity (throttled write, qualifying operations only) and non-extensible absolute timeouts; session rotation at privilege transitions and password reset. | ARCH-001, 003, 012 |
| ADR-008 | Provider-agnostic payment adapter and normalized states | **ACCEPTED** | Core states are `PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `EXPIRED`; provider remains PENDING selection. | ARCH-001, 006, 007 |
| ADR-009 | Media delivery separated from application API; managed delivery/storage behind ports | **ACCEPTED** | Keeps large media bandwidth and processing away from application compute; creates provider dependency isolated by adapter. | ARCH-001, 005, 009 |
| ADR-010 | Cloudflare Stream for managed video delivery | **PROVISIONAL** | Candidate for managed adaptive streaming; cost, playback, security, and business margin validation required. | ARCH-001, 005, 014 |
| ADR-011 | Cloudflare R2 for object storage | **PROVISIONAL** | Candidate for master/download storage and direct upload; presigned flow, durability, and total cost require validation. | ARCH-001, 005, 014 |
| ADR-012 | PostgreSQL-backed outbox/job pattern initially | **ACCEPTED direction** | Durable asynchronous processing without another fleet; contention/throughput limits must be measured. | ARCH-001, 007, 013 |
| ADR-013 | PostgreSQL full-text search initially | **ACCEPTED direction** | Avoids dedicated search infrastructure at launch; language/ranking quality needs content validation. | ARCH-001, 002, 009 |
| ADR-014 | Avoid standalone cache/Redis initially; use HTTP/CDN/database efficiency | **DEFERRED** (Redis/cache fleet) | Minimize infrastructure; revisit only on measured database/read bottleneck and invalidation design. | ARCH-001, 009 |
| ADR-015 | No premature microservices/Kubernetes/service mesh | **ACCEPTED** | Avoids operational complexity without proven isolation/scale need; future extraction remains evidence-driven. | ARCH-001, 013 |
| ADR-016 | Access recorded as entitlements separate from payment status | **ACCEPTED** | Verified successful payment is distinct from retryable fulfillment and scoped entitlement; individual access starts at activation. | ARCH-002, 006, 007 |
| ADR-017 | One-time subscriptions with eligible-catalog streaming and immutable purchased terms | **ACCEPTED** | No recurring billing; manual renewal purchases current terms; individual purchases remain independent. | ARCH-002, 006, 016 |
| ADR-018 | Offline download DRM/licensing | **REQUIRES VALIDATION** | Security and user experience depend on business constraints and delivery capability. | ARCH-003, 005, 016 |
| ADR-019 | Persistent in-app notifications and email channel | **ACCEPTED** | In-app history/read state is backend-owned; native push deferred, SMS not currently required; event/channel map and templates pending. | ARCH-008, 012 |
| ADR-020 | Authenticated-only purchases; no guest checkout | **ACCEPTED** | Customer/order/entitlement ownership is unambiguous from purchase initiation. | ARCH-001, 002, 003, 004, 006 |
| ADR-021 | Tanzania launch market and TZS | **ACCEPTED** | Market/currency only; provider, prices, and tax treatment remain unresolved. | ARCH-001, 006, 016 |
| ADR-022 | Atomic download authorization and quota semantics | **ACCEPTED** | `UNIQUE_TITLES` and `DOWNLOAD_ACTIONS`; backend authorizes every attempt, records use atomically, and reports usage to UI. | ARCH-002, 004, 005, 006, 009, 011 |
| ADR-023 | Catalog lifecycle separate from customer entitlement | **ACCEPTED** | Unpublish/archive preserve valid grants; access revocation is exceptional, authorized, reasoned, audited, and customer-notified. | ARCH-002, 005, 006, 010, 011 |
| ADR-024 | Registered devices distinct from sessions and active streams | **ACCEPTED** | Admin-configured device and concurrent-stream caps are separate; devices provide recognition metadata, not user identity or authorization factor; device removal revokes associated sessions. | ARCH-002, 003, 005, 006, 011 |
| ADR-025 | Protected media authorization semantics | **ACCEPTED** | Short-lived resource/operation-scoped protected access; streaming supports Range; tokens are not DRM and are not IP-bound by default. | ARCH-003, 005, 009 |
| ADR-026 | Refund and chargeback features excluded from V1 | **DEFERRED** | Preserve generic separation/audit/history/extensibility; do not design refund workflows or refund-specific state machines now. | ARCH-006, 016 |
| ADR-027 | Purpose-based retention and non-cascading account deletion | **ACCEPTED** | Separate account PII, commercial, security/audit, and operational/transient data; preserve required records and delete/anonymize unnecessary PII where safe. Exact periods remain pending policy. | ARCH-002, 003, 010, 014, 016 |
| ADR-028 | Production backup, restore, and recovery strategy | **ACCEPTED** | Automated protected PostgreSQL backups, access controls/encryption, documented restore, periodic restore tests, and failure monitoring. RPO/RTO values remain pending and must be demonstrated. Media recovery is separate. | ARCH-013, 014, 016 |
| ADR-029 | Measurement-led performance and service targets | **ACCEPTED** | Instrument and manage API, database, frontend/network, media, and async performance; set targets from observed workload and production needs. No universal latency/SLA number is assumed. | ARCH-001, 004, 009, 010, 011, 016 |

## Alternatives and trade-off handling

Alternatives are evaluated only when a concrete need arises. For persistence, compare Drizzle against viable maintained options using migration/test ergonomics and team skill, without allowing ORM choice to reshape domain invariants. The session mechanism is accepted as database-backed; remaining session policy values are finalized through security/configuration review, not by reopening a stateless-token alternative. For media/payment providers, compare required features, security protocol, market availability, service support, reconciliation, and total unit economics. For queues/cache/search, measure current PostgreSQL/application limits before adding a new component.

## Change control

Any proposed change must identify the ADR, evidence, status transition, affected documents, data migration/provider lock-in consequences, operations owner, and rollback/recovery strategy. A conflict with ARCH-001 is **REQUIRES ARCHITECTURAL REVIEW**; dependent documents must not redefine the foundation by implication.

## Related documents

ARCH-001 is the detailed source of accepted architectural direction; ARCH-016 is the readiness summary.
