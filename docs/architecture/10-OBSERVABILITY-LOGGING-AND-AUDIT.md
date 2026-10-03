# Observability, Logging, and Audit

> **Document ID:** ARCH-010 · **Status:** Architecture guidance · **Depends on:** ARCH-001–009

## Operational visibility

Provide enough visibility to answer: is the application alive and ready; are API/database/provider operations succeeding; are payment and media state transitions progressing; are durable jobs accumulating; and what happened during a customer or operator request? Use structured application logs, lightweight metrics, and health probes. A large dedicated observability stack is not a day-one requirement.

## Structured logs and correlation

Emit structured JSON to the configured process output, with timestamp, level, event/message, environment/service identity, and normalized request/correlation ID. Generate an ID when absent; validate and bound externally supplied IDs. Propagate correlation across in-process domain calls, durable jobs, payment callbacks, and notification attempts where possible. A job retains its originating correlation link and has its own stable job ID.

Log state transitions and meaningful outcomes, not every payload. Error records include a safe error class/code, operation, dependency, and retryability; stack traces stay in controlled server logs and never in client responses. Redact secrets before logging and avoid logging request bodies by default.

## Audit records

Audit logs capture security- and business-sensitive actions: actor or system source, action, target type/id, outcome, timestamp, correlation ID, and reason/context when applicable. Important examples include role or permission changes, publication decisions, price/configuration changes if approved, manual entitlement changes, and payment reconciliation overrides. Audit records are append-only from domain behavior; correction is a new event, not silent rewriting. Purpose-based preservation is accepted; detailed audit coverage follows relevant domain rules, and exact retention periods remain pending policy.

Accepted audit subjects also include session invalidation/expiry, logout-all, recognized-device registration/removal, active-stream lease start/renewal/release, download authorization/quota consumption and outcome, taxonomy request/review, protected content lifecycle actions, payment fulfillment recovery, and operational replay/reconciliation. Record outcomes and references, never raw session/media tokens or unnecessary personal data. Content unpublish/archive does not represent entitlement revocation; those events must remain separately observable.

Audit data is distinct from diagnostic logs: it must be queryable with controlled access and protected against ordinary application/operator mutation. Never include passwords, reset tokens, cookies, raw payment credentials, secret webhook bodies, or signed media URLs. Minimize personal data and apply retention/access controls consistently.

## Security and provider events

Record normalized payment lifecycle events, webhook verification outcome, media upload/processing state, playback authorization outcome, and security-relevant authentication/authorization failures. Provider payloads are not copied wholesale into logs. If evidence must be retained for reconciliation, store it in a protected, narrowly scoped record with a defined retention purpose rather than general logs.

Payment and fulfillment are separate observable lifecycles. A `SUCCEEDED` payment with pending or failed fulfillment must remain visible as such, with durable recovery status; do not collapse it into payment failure.

## Metrics and health

Candidate low-cardinality metrics include request count/duration/status and size by route class; API throughput/error rate; database connection use/query duration; event loop lag and memory; external provider error/latency; payment callback verification and reconciliation outcomes; media processing state age; durable job backlog/age/retry/terminal failure; notification delivery outcome; and automated backup completion/failure and last-success age. Avoid labels with user IDs, emails, order references, arbitrary URL values, or other unbounded identifiers.

Provide a lightweight liveness endpoint that indicates process/event-loop responsiveness and readiness that checks essential dependencies such as PostgreSQL. Readiness should fail when the instance cannot serve core requests, but avoid expensive deep dependency cascades. Health endpoints expose no secrets or sensitive topology. Probe paths and deployment semantics follow ARCH-013.

Operational alert thresholds and notification destinations are **REQUIRES VALIDATION**. Backup failure/unavailability must be monitored and alertable as a production control; exact threshold/destination are operational configuration. Start other alerts from service expectations and observed baselines, alert on actionable conditions (sustained errors, unavailable DB, stuck critical work, capacity exhaustion), and avoid noisy single-event alerts. No external alerting provider is selected.

## Retention and investigation

Apply purpose-based retention separately to account/customer PII, commercial records, security/audit records, operational/transient data, diagnostics, provider evidence, and notification history. Preserve commercial/security records needed for reconciliation, accounting, fraud investigation, disputes, legal obligations, or operational integrity; account deletion does not silently destroy them. Delete or anonymize PII when no longer needed where this does not compromise required records. Expired sessions/tokens and transient data may have shorter cleanup periods; notification history may have its own policy. Exact durations are **PENDING** policy decisions, not architectural constants. Incident investigation should correlate request ID, order/transaction ID, job ID, provider reference, and audit event without broad access to raw personal data. Preserve evidence securely, restrict access, and record privileged investigation access where appropriate.

## Related documents

ARCH-001 health/log direction · ARCH-003 security events · ARCH-006 payment audit · ARCH-007 job metrics · ARCH-012 secrets · ARCH-013 health deployment · ARCH-014 recovery.
