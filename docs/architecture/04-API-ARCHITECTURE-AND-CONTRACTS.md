# API Architecture and Contracts

> **Document ID:** ARCH-004 · **Status:** Architecture guidance · **Depends on:** ARCH-001–003

## API role and boundaries

The API is the stable transport contract for web and future clients. It exposes domain capabilities through the modular monolith while keeping persistence, provider payloads, and internal service layouts private. Browser clients use server-controlled cookies as described in ARCH-003. Provider callbacks are separate authenticated integration boundaries and must not be treated as public customer endpoints.

The accepted direction is HTTPS/JSON with a major version prefix `/api/v1/` (ARCH-001). REST resource conventions are preferred: nouns for resources, HTTP methods for intent, standard status codes, and explicit commands when a transition cannot safely be represented as a generic update. This is architectural guidance, not a final endpoint inventory.

## Resource/module ownership

| Module | API responsibility (conceptual) |
| --- | --- |
| Auth / Users | Email/password registration, verification, login, current identity, own profile, session/device operations. Purchases require an authenticated customer; whether an unverified pending account may authenticate or purchase remains pending clarification. |
| Catalog / Taxonomies / DJs | Public published catalog discovery and authorized staff catalog management. |
| Media team | Upload coordination and content workflow commands. |
| Payments | Authenticated purchase/order initiation, payment-attempt status, fulfillment status, provider callback ingress. Payment `SUCCEEDED` and access fulfillment are separate states. |
| Entitlements / Playback | Own access library, subscription period/terms, playback and separate download authorization, progress where approved. |
| Admin | Explicit privileged governance and reporting operations. |
| Notifications | Persistent in-app history/read state and confirmed email delivery status; exact notification event/channel mapping remains pending. |

This mapping does not settle exact routes, query names, payloads, role permissions, or feature inclusion. They require domain and product confirmation before contract publication.

Purchasing, download authorization, session/device management, active-stream visibility/management, notification history/read actions, taxonomy requests, and content lifecycle commands are conceptual API capabilities. Exact endpoint paths and payloads are not prescribed here. Purchase operations are authenticated and owner-scoped. Download requests must be backend-authorized and quota enforcement atomic. API responses expose backend-reported download usage and fulfillment state; clients must not infer either from UI state. Customers can view/manage recognized devices and active playback sessions where appropriate; device-limit and concurrent-stream-limit errors are distinct machine-readable conditions. At device capacity, a new device cannot silently replace another; explicit removal/revocation is required. A registered device, session, and active stream must not be represented as interchangeable resources.

## Request validation and DTOs

Validate every path, query, header, and body field at the transport boundary using explicit DTOs/schemas. Reject malformed, out-of-range, oversized, or unexpected fields; normalize only where the contract defines normalization. Never bind client JSON directly to persistence records or permit clients to choose protected fields such as owner, settlement status, role, or entitlement state. DTOs express transport shape and do not replace domain invariants.

Requests have bounded payload size and timeouts. Upload data bypasses application compute through presigned storage flows (ARCH-005); API calls coordinate upload authorization and state only. Input validation errors should identify fields safely without echoing secrets or arbitrary attacker-controlled content.

## Responses and errors

Use the ARCH-001 success envelope (`success: true`, typed `data`, optional `meta`) and error envelope (`success: false`, structured machine code/message, optional field details, timestamp, request ID). Maintain stable error codes; human messages can evolve. Never return internal stack traces, SQL/provider dumps, secrets, or private records. Use a consistent serializer with explicit public projections and avoid leaking internal audit/deletion/vendor fields.

Status codes should reflect HTTP semantics, including 200/201/204 for success, 400 malformed input, 401 unauthenticated, 403 unauthorized, 404 absent or intentionally concealed resources, 409 state conflict, 422 semantically invalid input where selected, 429 rate limited, and 500 unexpected server failure. Avoid using 200 for failed business operations.

## Authentication and authorization

Document each operation's requirement as public, authenticated, owner-scoped, staff-scoped, or admin-only. Apply authorization server-side on every request and every resource reference. Cookie-based unsafe methods require CSRF protections (ARCH-003). Internal module calls use typed contracts and do not pass through the public HTTP API. Webhook routes use provider-specific verification and idempotency rather than customer sessions.

## Pagination, filters, search, and sorting

Collection operations must be bounded with a documented default and maximum page size selected during implementation based on workload. Cursor pagination is preferred for deep/high-volume feeds where stable keys exist. Cursors are opaque, validated, and scoped to the query so clients cannot change access boundaries. Filters and sort options are allowlisted; never translate arbitrary client sort strings into SQL. Search semantics and ranking follow ARCH-009 and remain subject to language/content validation.

## Idempotency and concurrency

For operations where client retries can create duplicate financial or state effects, accept a scoped idempotency key or equivalent request identity and persist its result consistently with the operation. Define scope, retention, conflict response, and key length when the concrete API is specified. Payment callbacks are independently idempotent (ARCH-006). Conditional state transitions should return conflict when current state no longer permits the requested action.

## Caching, performance, and request identity

Public slow-changing catalog responses may use explicit HTTP cache controls and validators where data freshness allows. Authenticated, user-specific, financial, entitlement, and playback authorization responses must not be placed in shared caches unless a safe, explicit policy exists. Avoid caching authorization decisions beyond their valid source state. Response projections should be view-specific, paginated, and compact; compression and protocol termination are configured at the appropriate application/edge layer (ARCH-009).

Every request receives or is assigned a trusted correlation/request ID. Untrusted caller-supplied IDs must be validated and bounded; logs and error envelopes carry the normalized ID (ARCH-010). Do not expose provider secrets or raw error context through responses.

## OpenAPI and evolution

Publish an OpenAPI contract generated from or kept in sync with DTOs, with authentication/error models and examples clearly labeled. Keep provider callback schemas separate from customer API schemas. Contract changes must be reviewed for compatibility: additive optional fields are generally safer; changing meaning, removing fields, or tightening validation can break clients. Breaking changes use a new major prefix. Deprecation windows and supported client policy are **REQUIRES VALIDATION**. Examples in architecture documents are illustrative, not approved endpoint contracts.

## Related documents

ARCH-001 API envelope/versioning · ARCH-003 security · ARCH-005 media upload/playback · ARCH-006 payment/access · ARCH-009 performance · ARCH-010 request IDs.
