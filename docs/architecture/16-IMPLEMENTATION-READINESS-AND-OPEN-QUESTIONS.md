# Implementation Readiness and Open Questions

> **Document ID:** ARCH-016 · **Status:** Pre-implementation checkpoint · **Depends on:** ARCH-001–015 and accepted Phase 1/Phase 2 product decisions

## Readiness statement

The product rules below are accepted and must not be reopened as unknowns. The architecture remains **NOT READY for full backend implementation** until the explicitly pending provider, policy, and operational values are resolved for the affected capabilities. This document records implementation constraints; it does not authorize implementation.

## Fully decided

* Modular monolith, one deployable backend application, PostgreSQL, Node.js LTS/TypeScript; NestJS/Fastify and Drizzle retain their existing provisional status.
* Customer email/password authentication, required email verification, separate email password recovery, opaque database-backed sessions, independent revocation, concurrent sessions, logout/logout-all, and session invalidation after password recovery. Exact inactivity and absolute timeout values remain configuration/security-policy values.
* Purchases require authentication; there is no guest checkout. Launch market is Tanzania and currency is TZS. Provider, price, and tax treatment are not thereby decided.
* Payment, order, payment attempt, fulfillment, and entitlement are distinct. Payment states are `PENDING`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `EXPIRED`; only `SUCCEEDED` can fulfill. Verified provider success is authoritative; durable, idempotent, retryable fulfillment and reconciliation recover missing access without requiring another payment.
* Purchase units include movie, episode, season, full series, and subscription where applicable; series hierarchy is flexible. Individual access starts immediately after successful payment and entitlement activation, with backend-owned start/expiry.
* Subscriptions are one-time/manual purchases. They grant unlimited streaming of eligible catalog content during validity and limited downloads. Purchased terms are immutable snapshots; current plan changes affect future purchases only. Individual purchases survive subscription expiry.
* Download authorization and quota are backend-owned and atomic, with `UNIQUE_TITLES` and `DOWNLOAD_ACTIONS` semantics; attempts are auditable and UI usage comes from the backend.
* Catalog status and entitlement status are separate. Unpublish/archive preserve valid access; delete is commercially/audit protected; revocation is separate, exceptional, authorized, reasoned, audited, and customer-notified.
* Admin owns prices, subscription plans, customer account management, and canonical taxonomy. Media Team permissions are capability-based; publishing requires the member capability and fixed 100% backend readiness.
* Persistent in-app notifications and email are confirmed. In-app history/read state is backend-owned. Native push is deferred; SMS is not currently required.
* Devices, sessions, and active streams are distinct. Device and concurrent-stream limits are independently Admin-configured; active streams use backend leases/heartbeats. Subscription policy applicable to a purchase is captured in its immutable terms.
* Backend authorizes protected media before issuing short-lived, resource/operation-scoped access. Streaming supports Range requests; downloads use a separate authorization. Application compute does not proxy video bytes. Tokens are not DRM and are not IP-bound by default.
* PostgreSQL-backed outbox/job processing is the initial durable async approach; no Redis/BullMQ/Kafka/RabbitMQ or microservices/Kubernetes are justified by this handoff.
* Refund/chargeback workflows are **DEFERRED outside V1**. Preserve generic payment/order/entitlement separation and audit history without designing refund functionality.
* Purpose-based retention separates account/customer PII, commercial, security/audit, and operational/transient data. Account deletion/deactivation does not cascade-delete all history; preserve required commercial/security records and remove/anonymize PII where no longer needed and safe. Exact retention periods remain pending policy.
* Production backup/recovery strategy is accepted: automated PostgreSQL backups, protected separately from the primary environment, controlled/encrypted access, documented restore, periodic restore testing, and backup failure monitoring/alerting. Media recovery is separate. RPO/RTO values remain pending; backup presence alone is not demonstrated recovery readiness.
* Performance is measured and managed across API, database, frontend/network, media, and async work. Targets derive from observed workloads and production requirements; no arbitrary universal latency/SLA is promised.

## Provisional

* NestJS + Fastify, subject to representative benchmarking and integration validation.
* Drizzle ORM, subject to migration, constraint, transaction, and integration validation.
* Cloudflare Stream and Cloudflare R2, subject to capability, security, upload/playback, durability, cost, and margin validation.
* PostgreSQL full-text search is the initial technical direction; searchable fields, language, and ranking behavior require validation.

## Pending / requires validation before affected implementation

1. **Payment provider:** choose only after evaluating integration requirements, settlement, fees, reliability, KYC/business requirements, webhook support, reconciliation capability, and operations. Tanzania/TZS does not select the provider or resolve taxes.
2. **Session policy values:** exact inactivity/absolute timeout values and detailed rotation triggers. Database-backed sessions, concurrent sessions, independent revocation, logout-all, and password-reset revocation are accepted.
3. **Subscription plan version representation:** choose the implementation representation for immutable plan versions/snapshots. Preserve the accepted snapshot contents and future-purchases-only changes. Also settle any policy details not stated by the handoff without weakening accepted behavior.
4. **Download edge cases:** exact treatment of retries after provider delivery failure versus customer interruption, including the quota consumption/retry point. Atomic quota rules and attempt audit are accepted.
5. **Media access values:** exact token TTL and reuse policy, operational access logging detail, provider-specific Range behavior, and related expiry handling. Short-lived resource/operation scope, protected delivery, and no default IP binding are accepted.
6. **Offline licensing:** DRM/containerization and offline licensing requirements remain **REQUIRES VALIDATION**; signed access is not DRM.
7. **Notification details:** exact event/channel/recipient mapping, email templates/content, preferences, localization, delivery retry window, and retention. In-app and email support are accepted; push is deferred; SMS is not required.
8. **Hosting and operations:** hosting/provider choice, exact retention durations, RPO/RTO values, restore exercise cadence, and numerical service/performance targets remain operational values to establish. Purpose-based retention, backup/restore controls, and measurement-led performance management are accepted; establishing a universal numeric target is not a prerequisite where no meaningful workload/service requirement exists. Do not invent values.
9. **Other unresolved domain rules:** refund/chargeback feature remains deferred, not a V1 decision to elaborate; tax treatment and any unsupplied business policies remain unknown.

## Safely deferred

* Refund/chargeback functionality and related UI/workflows/state machines are outside V1; preserve extensible generic payment event handling and immutable commercial history only.
* Native push notification engine until a future product/client decision.
* Standalone Redis/cache/queue fleet, dedicated search infrastructure, microservices, Kubernetes, service mesh, and multi-region active-active database unless concrete measured requirements justify architectural review.
* Read replica until measured read pressure justifies the added complexity.
* Custom transcoding fleet; managed media remains the direction, with specific providers provisional.

Temporary limitations and revisit conditions follow ARCH-001, ARCH-007, ARCH-009, and ARCH-013. Deferral does not authorize a substitute hidden implementation.

## Highest-risk areas

* Verified payment success with delayed, failed, or duplicated fulfillment and the recovery/reconciliation path.
* Atomic subscription/download quotas and account-level concurrent-stream lease handling under races.
* Session/device/stream separation, expiry, revocation, and security-sensitive reauthentication.
* Protected media tokens, Range requests, expiry behavior, provider failure semantics, and the limits of anti-copy protection.
* Purchased subscription terms remaining immutable through plan edits and manual renewal.
* Commercial-history safeguards during content delete/revocation and accurate separation of content availability from entitlement status.
* Provisional provider economics and the remaining operational targets.
* Backup configuration and restore capability must be verified in operation; production recovery targets cannot be claimed until RPO/RTO are defined and tested.

## Assumptions that must never enter implementation

Do not infer a payment provider, prices, taxes, fees, exact retention durations, RPO/RTO values, exact session/token TTLs, download retry policy, notification event mapping/templates, DRM/licensing terms, hosting vendor, numerical performance targets, or other business rules not accepted here. Do not add automatic recurring billing, guest purchase, refund/chargeback workflows, SMS, push, or unlimited subscription downloads. Do not treat frontend playback state, displayed payment success, or UI-computed quota as backend authority. Never implement account deletion as an indiscriminate cascade across commercial, security/audit, and operational records.

## Implementation constraints

When implementation is separately authorized: read ARCH-001 and applicable domain documents; preserve module ownership and exported contracts; keep provider SDKs in adapters; never trust client-set price, payment, access, readiness, or quota state; keep critical fulfillment durable and idempotent; use database constraints as well as domain checks; enforce object-level authorization; keep secrets and tokens out of logs; measure before infrastructure additions; and record intentional technical debt with remediation path. This document is not authorization to begin implementation.

## Implementation readiness checklist

- [ ] Payment provider selected and callback/reconciliation contract validated.
- [ ] Remaining payment data/tax policy and order confirmation behavior approved; no refund feature is included in V1.
- [ ] Session timeout/rotation values and remaining security configuration approved.
- [ ] Download retry/quota-consumption edge cases decided; atomic authorized attempt behavior retained.
- [ ] Media token TTL/reuse and provider-specific Range behavior validated; offline licensing decision made for any offline feature in scope.
- [ ] Subscription version/snapshot representation preserves all accepted immutable purchased terms.
- [ ] Notification event/channel mapping, email content, preferences, and operational retry/retention policy approved.
- [ ] Hosting, secrets delivery, migration/release process, restore objectives, and operational ownership approved.
- [ ] Backup protection, retention policy, restore procedure/ownership, and backup-failure alerting approved and documented.
- [ ] RPO/RTO values established from business/hosting/operational needs and restore tests demonstrate whether they are met; do not claim targets until measured.
- [ ] Exact purpose-based retention durations and deletion/anonymization criteria established as operational/legal policy without changing the accepted data-category separation.
- [ ] Performance telemetry and measurement are in place; establish budgets/targets from observed workloads where they materially improve decisions, without an unsupported universal latency/SLA claim.
- [ ] Provisional technology/provider validations recorded in ARCH-015.
- [ ] Cross-document terminology and requirements reviewed; implementation scope authorized separately.

## Related documents

ARCH-001 foundation · ARCH-015 decision register · ARCH-002–014 detailed architecture.
