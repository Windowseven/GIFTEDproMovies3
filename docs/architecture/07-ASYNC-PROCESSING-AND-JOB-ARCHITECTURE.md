# Asynchronous Processing and Job Architecture

> **Document ID:** ARCH-007 · **Status:** Architecture guidance · **Depends on:** ARCH-001–006

## Purpose and operating model

Use synchronous work when the caller needs an immediate, bounded decision (validation, authorization, ordinary reads). Use durable asynchronous work when an outcome must survive process restarts, may take substantial time, or depends on a retryable external system. In-process events are only for non-critical, best-effort decoupling. Critical behavior must never rely on a fire-and-forget promise.

The initial durable-work direction is PostgreSQL-backed outbox/job tables with a lightweight worker/runner in the same deployable application or its operational process, as appropriate. This preserves one backend product and avoids introducing Redis, BullMQ, Kafka, or RabbitMQ without measured need (ARCH-001). It does not prescribe a separate worker service.

## Outbox/job responsibilities

Where a domain transaction requires follow-up work, write the business change and a durable job/outbox record in the same PostgreSQL transaction. A dispatcher claims eligible rows using safe concurrency control (for example row locking with skip-locked semantics where appropriate), performs bounded work outside the claim transaction, then records outcome. Never hold database locks while making network calls. Jobs carry a stable identity, type, minimal validated payload/reference, creation time, attempt metadata, availability time, and state; avoid duplicating sensitive domain data into job payloads.

The producer owns the business decision and payload contract. The job runner owns delivery/retry mechanics. A worker re-loads current domain state and re-checks required authorization/status before acting; queued payloads are not proof of continuing permission.

## Job lifecycle and retry rules

Conceptual states: pending/available, running/claimed, succeeded, retryable failure, and terminal failure requiring inspection. Exact names are implementation detail. Claims need leases or stale-claim recovery so a crashed process does not strand work indefinitely. Completion is idempotent; process death after remote success but before local acknowledgement must safely repeat or reconcile the operation.

Classify failures as transient, permanent, or ambiguous. Use bounded exponential/backoff retry with jitter where suitable, a maximum attempt/age policy chosen per job, and explicit terminal visibility. Do not retry invalid payloads or permanent provider rejection indefinitely. A “dead-letter” concept means inspectable terminal records; a separate broker or queue is not required. Retry schedules, maximum age, and operator replay permissions are **REQUIRES VALIDATION** per job type.

## Initial job families

* **Payment reconciliation:** revisit ambiguous/pending provider transactions and normalize a verified result (ARCH-006).
* **Payment fulfillment recovery:** after verified payment success, durable fulfillment work creates the order confirmation and entitlement idempotently. Payment state remains `SUCCEEDED` even while fulfillment is pending or operationally blocked. Reconciliation detects missing/incomplete fulfillment; retries must never require the customer to pay again or create duplicate entitlements. Persistent failures enter a recoverable operational state.
* **Notification delivery:** send approved communication intents through provider adapters (ARCH-008).
* **Media coordination:** process trusted completion/status events, query provider state, and reconcile missing callbacks (ARCH-005).
* **Cleanup:** only remove expired temporary references/assets after retention and ownership rules are approved (ARCH-002/005). No cleanup timer is assumed.

Verified-payment fulfillment recovery and payment reconciliation are required capabilities. Durable email delivery and in-app notification creation must follow the accepted notification requirements and approved event mapping. Media coordination and cleanup are applied where those workflows are in launch scope. Scheduled work must be safe with multiple app instances, using database coordination or a single controlled scheduler. Prevent overlapping execution and make schedule handlers idempotent.

Payment webhook/event identity and verified facts are durably recorded before business processing where appropriate. Webhook endpoints acknowledge receipt quickly only after durable acceptance; heavier fulfillment/reconciliation work uses the PostgreSQL-backed outbox/job pattern. Notification intents are recorded after the relevant business transaction commits and delivered durably. Persistent job failures remain inspectable and recoverable; they do not rewrite payment success as failure.

## Reliability, security, and observability

Each job has a stable deduplication key for its business effect. Persist unique constraints where duplicate creation is possible. Keep transaction boundaries short, bound batch size and runtime, honor provider timeouts, and ensure shutdown stops claiming work while allowing active operations to finish or safely release claims. Protect job payloads and admin replay tools; no user-provided job type or arbitrary callback can invoke internal work.

Measure queued count/age, processing duration, retries, terminal failures, and provider outcomes using low-cost logs/metrics. Alert thresholds must be based on service expectations and observed baseline, not invented here (ARCH-010). Provide an operator path to inspect, retry, or abandon terminal jobs with actor/reason audit when business-safe.

## Scale decision

PostgreSQL-backed processing remains the initial choice. Revisit a dedicated queue only when measured contention, backlog latency, job throughput, isolation needs, or PostgreSQL capacity demonstrates the current approach is insufficient and the team can operate the added infrastructure. That review must compare cost, failure modes, delivery guarantees, and operational ownership. It is **DEFERRED**, not an implied roadmap commitment.

## Related documents

ARCH-001 durable-work rules · ARCH-005 media · ARCH-006 payments · ARCH-008 notifications · ARCH-010 operations · ARCH-013 deployment.
