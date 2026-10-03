# Notification Architecture

> **Document ID:** ARCH-008 · **Status:** Architecture guidance · **Depends on:** ARCH-001–007

## Scope and confirmed channels

Notifications are a delivery capability, not a source of business truth. A domain transition (for example payment settlement) is authoritative; a message saying it happened is secondary. **In-app notifications and email are confirmed.** In-app notifications are persistent backend-owned records that survive refresh and logout/login, have read/unread state, support mark-as-read and history, and are retrieved from backend APIs. Frontend toasts are temporary UI feedback and are not automatically persistent notifications.

Native push is **DEFERRED**. SMS is **NOT CURRENTLY REQUIRED**. Exact event-to-channel/recipient mapping, email templates/content, preferences, localization, sender identity, and delivery expectations remain **PENDING**. Do not invent triggers merely because the architecture can support them.

## Separation of concerns

1. **Domain event/fact:** an authoritative action occurred (owned by Payments, Auth, Catalog, or another domain).
2. **Notification intent:** a request to communicate an approved fact to a target recipient, with a template identifier and minimal safe variables.
3. **Delivery:** a channel-specific attempt, result, provider reference, and retry state.
4. **Provider adapter:** implements a stable interface behind which any selected email/SMS/push vendor is isolated.

The originating domain does not call a vendor SDK or format provider-specific requests. Notifications must not mutate payment, entitlement, account, or catalog status based on delivery outcome.

## Delivery lifecycle and reliability

For messages that must survive a restart, record notification intent durably in the same transaction as the triggering business change (or create it through an equivalent reliable outbox contract; ARCH-007). Delivery attempts are idempotent where provider support allows. Track pending, attempted, delivered/accepted, failed, and terminal states according to channel evidence; “provider accepted” must not be mislabeled as “recipient read.”

Retry transient delivery failures with bounded policy; suppress retries for invalid destinations, explicit opt-outs, or permanent provider rejection. Repeated jobs must not create uncontrolled duplicate messages. Provider idempotency capability varies and must be represented in the adapter. Delivery retry windows and duplicate tolerance are **REQUIRES VALIDATION**.

## Privacy and security

Use only recipient information and message content required for the approved purpose. Do not include passwords, reset codes beyond a specifically approved secure flow, session tokens, signed media URLs, full payment details, or unnecessary order/customer data. Sensitive links must be short-lived and scoped where applicable. Access to templates, delivery logs, and recipient data is restricted and audited. Consent, opt-out, and applicable legal requirements need business/legal validation; this document asserts no compliance status.

Templates are versioned, reviewed, and escaped appropriately. Provider credentials and webhook secrets are managed as secrets (ARCH-012). Delivery callbacks are authenticated and deduplicated. Do not treat delivery webhooks as proof of the underlying business event.

## Channel-specific posture

* **Email:** confirmed channel, including email verification and password recovery flows (ARCH-003). Exact templates and other notification events remain pending.
* **In-app:** confirmed persistent inbox/history and read/unread state, with backend APIs and ownership checks. Mark-as-read operations must be idempotent and customer-scoped. Admin receives persistent notification for taxonomy requests and commercially protected content actions routed for review, as defined by product decisions.
* **Native push:** deferred until a future product/client decision.
* **SMS:** not currently required; do not select a provider or add SMS workflows.
* **Operational/staff:** only actionable approved events are communicated, with least-privilege content. Do not add real-time counters absent a workflow need.

## Observability and provider replacement

Record intent ID, event type, channel, attempt count, normalized outcome, timestamps, correlation ID, and provider reference without logging message secrets or excessive personal data. Metrics should show backlog and failures, not message bodies. Replacing a channel provider must require adapter/configuration changes and potentially destination/template migration, not changes to payment or entitlement rules.

## Related documents

ARCH-001 provider abstraction · ARCH-003 security · ARCH-006 business events · ARCH-007 durable jobs · ARCH-010 logs/audit · ARCH-012 credentials.
