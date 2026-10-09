# Phase 4 Commercial Schema Design

> **Status:** Phase 4 design correction pass; design only
> **Scope:** Offers, orders, payment records, commercial policy snapshots, fulfillment, and entitlements
> **Authority:** Accepted Phase 4 decisions and ARCH-001–006; this document does not authorize implementation or Phase 5 work.

## 1. Final entity list

1. `access_plans` — stable administrative identity for a finite-duration access plan.
2. `plan_versions` — immutable plan terms; edits create a new version.
3. `offers` — purchasable catalog scope offer referencing one exact plan version.
4. `offer_catalog_policy_category_members` and `offer_catalog_policy_content_members` — normalized live catalog-policy membership for CATALOG offers.
5. `commercial_policy_snapshots` — immutable, purchase-time relational policy snapshot for catalog/category policy.
6. `commercial_policy_snapshot_categories` and `commercial_policy_snapshot_contents` — immutable members of the snapshot.
7. `orders` — one commercial purchase request and its immutable amount, target, plan-version terms, and historical policy reference. One order represents one purchase; there is no `order_items`.
8. `payment_attempts` — normalized provider collection attempts and payment state only.
9. `settlements` — immutable verified settlement facts.
10. `fulfillments` — authoritative fulfillment lifecycle, one row per order.
11. `entitlements` — current access grant for one exact typed catalog scope, with finite validity.
12. `entitlement_order_effects` — unique, durable record of each order's applied entitlement extension/grant.

Identity, catalog, categories, seasons, episodes, and audit actors remain owned by their existing domains. This design adds no payment provider implementation, runtime services, controllers, webhook runtime, queue system, or migration.

## 2. Final columns

All identifiers are UUIDs. All timestamps are `TIMESTAMPTZ`. Foreign keys to commercial history use restrictive deletion; account deletion must follow the approved anonymization/retention policy rather than cascading commercial records away.

### `access_plans`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `code` | Text, unique, immutable stable plan identity |
| `name` | Text |
| `created_at`, `updated_at` | Non-null timestamps |

Plan availability is represented by whether a purchasable current version is referenced by an active offer, not by a redundant active boolean.

### `plan_versions`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `access_plan_id` | Non-null FK to `access_plans.id` |
| `version_number` | Positive integer; unique with `access_plan_id` |
| `duration_value` | Positive integer |
| `duration_unit` | `HOUR` or `DAY` |
| `download_limit` | Non-negative integer or null only when the selected download policy means unlimited |
| `download_limit_type` | `UNIQUE_TITLES` or `DOWNLOAD_ACTIONS`, per the accepted quota model |
| `device_limit` | Non-negative integer when applicable |
| `concurrent_stream_limit` | Positive integer when applicable |
| `created_at` | Non-null timestamp |

Plan versions and their terms are immutable once referenced by an offer or order. A new access duration or plan term creates a new version. Each offer owns its catalog policy; plan versions do not own catalog memberships.

### `offers`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `code` | Text, unique |
| `name` | Text |
| `status` | `draft`, `active`, `inactive`, or `archived` |
| `starts_at`, `ends_at` | Non-null start and nullable end; end must be later than start |
| `target_kind` | `MOVIE`, `SERIES`, `SEASON`, `EPISODE`, or `CATALOG` |
| `target_movie_content_id` | Nullable FK to catalog content |
| `target_series_content_id` | Nullable FK to catalog content |
| `target_season_id` | Nullable FK to catalog season |
| `target_episode_id` | Nullable FK to catalog episode |
| `plan_version_id` | Non-null FK to the exact immutable `plan_versions.id` |
| `price_tzs` | Non-null integer amount in TZS; `CHECK (price_tzs >= 0)`; one stored unit is one TZS |
| `catalog_policy_type` | Nullable `ALL_CATALOG`, `CATEGORY_SET`, or `CONTENT_SET`; required only for `CATALOG` scope |
| `created_at`, `updated_at` | Non-null timestamps |

Offer target columns are mutually exclusive and checked against `target_kind`. `CATALOG` has all typed target columns null and requires a catalog policy. Non-CATALOG offers require exactly the typed target column matching their scope and must have null catalog-policy fields and no catalog-policy membership rows. Every offer references its exact immutable plan version. `offers` has no `is_active` column; availability is determined by status, dates, plan version, target, and valid policy.

### Normalized live catalog-policy membership tables

`offer_catalog_policy_category_members(offer_id, category_id)` and `offer_catalog_policy_content_members(offer_id, content_id)` each have a composite primary key and restrictive FKs. They are permitted only for CATALOG offers and represent current offer policy only. Never use JSON or a delimited list for membership.

### `commercial_policy_snapshots`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `policy_type` | `ALL_CATALOG`, `CATEGORY_SET`, or `CONTENT_SET` |
| `created_at` | Non-null timestamp |

No `owner_type`, `owner_id`, generic target ID, or policy JSON is stored. Ownership is one-to-one from an order through `orders.catalog_policy_snapshot_id`; that FK is unique and authoritative. Snapshots exist for CATALOG/category-policy purchases; a non-CATALOG purchase has no catalog-policy snapshot.

`commercial_policy_snapshot_categories(snapshot_id, category_id)` and `commercial_policy_snapshot_contents(snapshot_id, content_id)` have composite primary keys and restrictive FKs. For a `CATEGORY_SET`, snapshot content members are also the resolved content membership as of purchase; access checks do not re-join mutable live category memberships. The policy/member cardinality rules are specified in §6.

### `orders`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `customer_id` | Non-null FK to the customer/user identity |
| `offer_id` | Non-null FK to the originating offer, retained as provenance |
| `status` | `PENDING_PAYMENT`, `PAID`, `EXPIRED`, or `CANCELLED` |
| `target_kind` | `MOVIE`, `SERIES`, `SEASON`, `EPISODE`, or `CATALOG` |
| `target_movie_content_id` | Nullable typed FK |
| `target_series_content_id` | Nullable typed FK |
| `target_season_id` | Nullable typed FK |
| `target_episode_id` | Nullable typed FK |
| `plan_version_id` | Non-null FK to the exact purchased immutable `plan_versions.id` |
| `amount_tzs` | Non-null immutable integer payable amount in TZS; `CHECK (amount_tzs >= 0)`; one stored unit is one TZS |
| `duration_value`, `duration_unit` | Non-null immutable finite purchased duration (`HOUR` or `DAY`), copied from the referenced version |
| `catalog_policy_snapshot_id` | Nullable unique FK to `commercial_policy_snapshots.id`; required for a CATALOG purchase |
| `idempotency_key` | Non-null request key; unique within `customer_id` |
| `created_at`, `updated_at` | Non-null timestamps |

The target fields, offer/version provenance, amount, duration, and snapshot reference are immutable after order creation. One order is one purchase; there is no `order_items`.

### `payment_attempts`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `order_id` | Non-null FK to `orders.id` |
| `attempt_number` | Positive integer; unique with `order_id` |
| `provider_name` | Non-null provider identifier |
| `provider_reference` | Nullable provider reference; unique with `provider_name` when present |
| `provider_event_id` | Nullable provider event identity |
| `status` | `PENDING`, `UNKNOWN`, `SUCCEEDED`, `FAILED`, `CANCELLED`, or `EXPIRED` |
| `amount_tzs` | Non-null expected integer TZS amount; `CHECK (amount_tzs >= 0)` |
| `created_at`, `updated_at` | Non-null timestamps |

`payment_attempts` has no fulfillment timestamp or other fulfillment lifecycle field.

### `settlements`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `payment_attempt_id` | Non-null unique FK to `payment_attempts.id` for the accepted settlement |
| `provider_name`, `provider_event_id` | Non-null provider event identity |
| `provider_reference` | Non-null provider settlement/reference value |
| `amount_tzs` | Non-null verified integer TZS amount; `CHECK (amount_tzs >= 0)` |
| `settled_at`, `recorded_at` | Non-null timestamps |

Settlement rows are immutable evidence. `UNIQUE(provider_name, provider_event_id)` prevents duplicate settlement records, and `payment_attempt_id` is unique so an attempt has at most one accepted settlement.

### `fulfillments`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `order_id` | Non-null unique FK to `orders.id` |
| `status` | `PENDING`, `COMPLETED`, `FAILED_RETRYABLE`, or `FAILED_TERMINAL` |
| `attempt_count` | Non-negative integer |
| `last_error_code` | Nullable bounded business/operational code; no secrets or raw provider payload |
| `created_at`, `updated_at` | Non-null timestamps |
| `last_attempt_at`, `completed_at`, `failed_at` | Nullable timestamps consistent with status |

Fulfillment completion is represented exclusively by `fulfillments.status` and its timestamps.

### `entitlements`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `customer_id` | Non-null FK to customer/user |
| `target_kind` | `MOVIE`, `SERIES`, `SEASON`, `EPISODE`, or `CATALOG` |
| `target_movie_content_id` | Nullable typed FK |
| `target_series_content_id` | Nullable typed FK |
| `target_season_id` | Nullable typed FK |
| `target_episode_id` | Nullable typed FK |
| `status` | `ACTIVE`, `EXPIRED`, or `REVOKED` |
| `starts_at` | Non-null timestamp |
| `expires_at` | **Non-null** timestamp, later than `starts_at` |
| `created_at`, `updated_at` | Non-null timestamps |
| `revoked_at`, `revocation_reason`, `revoked_by` | Nullable audit fields, required consistently when status is `REVOKED` |

Entitlements point to the exact typed catalog scope; CATALOG uses no typed resource FK and its policy is resolved through the immutable order snapshot reached via `entitlement_order_effects.order_id` → `orders`. Entitlements do not duplicate `catalog_policy_snapshot_id`.

### `entitlement_order_effects`

| Column | Definition |
| --- | --- |
| `id` | UUID primary key |
| `order_id` | Non-null unique FK to `orders.id` |
| `entitlement_id` | Non-null FK to `entitlements.id` |
| `effect_kind` | `CREATED` or `EXTENDED` |
| `applied_at` | Non-null timestamp |
| `expires_at_after` | Non-null resulting expiry |

One order can affect access at most once. `UNIQUE(order_id)` is the durable idempotency key: a retry that finds the row must return the already-applied result without adding duration again. `applied_at` and `expires_at_after` preserve the effective interval/effect result for this order; for CATALOG scope, historical access resolves the order's immutable policy snapshot through this ledger. The row is committed atomically with the entitlement mutation and fulfillment completion.

## 3. Final enums and state transitions

* `commercial_target_kind`: `MOVIE`, `SERIES`, `SEASON`, `EPISODE`, `CATALOG`
* `commercial_policy_type`: `ALL_CATALOG`, `CATEGORY_SET`, `CONTENT_SET`
* `duration_unit`: `HOUR`, `DAY`
* `offer_status`: `draft`, `active`, `inactive`, `archived`
* `order_status`: `PENDING_PAYMENT`, `PAID`, `EXPIRED`, `CANCELLED`
* `payment_attempt_status`: `PENDING`, `UNKNOWN`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `EXPIRED`
* `fulfillment_status`: `PENDING`, `COMPLETED`, `FAILED_RETRYABLE`, `FAILED_TERMINAL`
* `entitlement_status`: `ACTIVE`, `EXPIRED`, `REVOKED`
* `entitlement_effect_kind`: `CREATED`, `EXTENDED`
* `download_limit_type`: `UNIQUE_TITLES`, `DOWNLOAD_ACTIONS`

There is no `TIER` enum or perpetual entitlement mode.

Allowed lifecycle transitions:

| Entity | Allowed transitions |
| --- | --- |
| Offer | Stored lifecycle values are exactly `draft`, `active`, `inactive`, and `archived`; purchasability additionally checks dates, plan version, target, and policy. No further transition graph is inferred here. |
| Order | `PENDING_PAYMENT` may become `PAID`, `EXPIRED`, or `CANCELLED`; an authoritative verified payment success is recorded as `PAID` even if previously expired/cancelled; once `PAID`, state cannot be reversed by fulfillment outcome. |
| Payment attempt | `PENDING` may become `UNKNOWN` or a resolved outcome; `UNKNOWN` requires authoritative reconciliation before it can resolve; `SUCCEEDED` is immutable and cannot regress. |
| Fulfillment | `PENDING` may complete or fail retryably/terminally; `FAILED_RETRYABLE` may return to `PENDING` for another attempt; terminal failure and completion do not transition back. |
| Entitlement | Time-window evaluation may mark an entitlement `EXPIRED`; a valid purchase may extend it and return it to `ACTIVE`; `REVOKED` stays revoked under ordinary purchase fulfillment. |

Transitions are guarded by database transactions/row locks and audit where required. The lists above do not add additional persisted states.

## 4. Relationship matrix

| Parent | Child | Cardinality / constraint |
| --- | --- | --- |
| `access_plans` | `plan_versions` | 1:N; unique `(access_plan_id, version_number)` |
| `offers` | `plan_versions` | N:1 exact immutable version reference |
| `offers` | catalog policy members | 1:N only for CATALOG scope |
| `offers` | `orders` | 1:N; orders preserve immutable purchase terms |
| `orders` | `commercial_policy_snapshots` | 0:1 for non-CATALOG order; exactly 1 for CATALOG order; unique order FK |
| `commercial_policy_snapshots` | snapshot membership rows | 1:N by policy type; immutable |
| `orders` | `payment_attempts` | 1:N; unique attempt number per order |
| `payment_attempts` | `settlements` | 1:0..1 accepted verified settlement |
| `orders` | `fulfillments` | 1:0..1; unique order FK |
| `entitlements` | `entitlement_order_effects` | 1:N over successive unique orders |
| `orders` | `entitlement_order_effects` | 1:0..1; unique order FK is the durable exactly-once effect key |
| `customer` | `orders`, `entitlements` | 1:N |
| Catalog content/season/episode | typed target FKs | Restrictive references; trigger-validated target kind and hierarchy; CATALOG has no target FK |

There is no generic target-ID polymorphism and no order line-item table.

## 5. Database integrity enforcement matrix

| Invariant | Database enforcement |
| --- | --- |
| Target columns match `target_kind`; non-CATALOG has exactly one target populated and CATALOG has none | `CHECK` constraints on offers, orders, and entitlements |
| `MOVIE` target is content with `content_type = 'movie'` | Required trigger validation on insert/update of offers, orders, and entitlements |
| `SERIES` target is content with `content_type = 'series'` | Required trigger validation on insert/update |
| `SEASON` target belongs to a valid series hierarchy | Required trigger validation joining season to its series content |
| `EPISODE` target belongs to a valid season and series hierarchy | Required trigger validation joining episode → season → series content |
| Offer and order reference an exact valid access-plan version | FKs and trigger validation that the immutable version exists and the order matches its source offer |
| `CATALOG` scope has no typed resource target and all other scopes have exactly one typed target | `CHECK` constraints on offers, orders, and entitlements |
| Catalog hierarchy is enforced for raw SQL/DML as well as application writes | Triggers are the non-bypassable invariant; application checks are additional validation only |
| Finite positive entitlement validity | `NOT NULL`, `CHECK (expires_at > starts_at)`, duration checks |
| Single entitlement per exact target/customer | Partial unique indexes for each typed target kind on the corresponding typed ID and `customer_id`, plus one CATALOG-scope uniqueness rule per customer; status is not part of uniqueness |
| No duplicate order, event, or grant effect | Unique order idempotency key per customer; unique fulfillment/order effect; unique provider event keys |
| Provider event nullable semantics | PostgreSQL `UNIQUE(provider_name, provider_event_id)` using default `NULLS DISTINCT` semantics (or explicit `NULLS DISTINCT`); multiple null event IDs are allowed, non-null event IDs are unique per provider |
| Settlement event idempotency | `UNIQUE(provider_name, provider_event_id)` on `settlements`; both columns non-null |
| Settlement amount matches the successful attempt and its order | Check in the locked settlement transaction; settlement is immutable once committed |
| Plan/snapshot immutability | `BEFORE UPDATE OR DELETE` triggers reject mutation of plan versions, snapshots, and snapshot members; offer-membership edits affect only future orders; changes to purchased plan terms require a new version |
| Policy/member cardinality | Deferred constraint triggers at transaction end: `ALL_CATALOG` has zero category/content members; `CATEGORY_SET` has one or more category members and content members equal to the resolved purchase-time category membership (zero is valid for empty categories); `CONTENT_SET` has one or more content members and zero category members |
| Every snapshot is order-owned and not orphaned | Order's unique FK is the canonical ownership edge; snapshot insert is purchase-transaction-only and a deferred constraint trigger rejects a snapshot not referenced by exactly one order at commit |
| Offer purchasability | Lowercase status/date checks and trigger/application validation that target, plan version, and (only for CATALOG) catalog policy are valid; no active boolean |
| Fulfillment lifecycle | Status/timestamp consistency `CHECK`; unique `fulfillments.order_id` |
| Commercial history survives content/account lifecycle | Restrictive FKs; controlled anonymization rather than cascading deletion |

Target triggers must also validate referenced rows on any catalog-side update that could invalidate a target or hierarchy. Direct database role permissions must not allow disabling triggers or bypassing constraints during ordinary writes.

## 6. Historical policy model

1. A CATALOG-scope order owns exactly one immutable `commercial_policy_snapshots` row through its unique `orders.catalog_policy_snapshot_id`. For these orders that order FK is the authoritative historical policy reference.
2. An entitlement does not duplicate the snapshot reference: it links to the order through `entitlement_order_effects`, and therefore inherits the order's immutable historical policy. There is no second independent entitlement snapshot and no equality problem between two policy FKs.
3. Snapshots use normalized relational members and only the allowed types:
   * `ALL_CATALOG`: zero category/content membership rows.
   * `CATEGORY_SET`: one or more category snapshot members plus the resolved content IDs matching those categories at purchase time. These resolved content members freeze category membership; historical access never joins live content-category membership.
   * `CONTENT_SET`: one or more content snapshot members; zero category members.
4. Snapshot and membership rows are immutable. Corrections or future commercial policy changes create a new policy/version/snapshot; they do not rewrite past purchases.
5. No arbitrary JSON policy DSL, generic polymorphic `owner_type + owner_id`, generic `target_id`, or live membership lookup is used to decide historical access. `ALL_CATALOG` is the immutable universal policy type and needs no member lookup; `CATEGORY_SET` uses its frozen resolved content members; `CONTENT_SET` uses its frozen content members.
6. This model avoids a cyclic snapshot → order FK: the ownership edge is order → snapshot, created in one purchase transaction. A deferred DB constraint trigger rejects an unreferenced snapshot at commit. Unique ownership and the immutable snapshot/member triggers make the relationship stable without a second owner FK.
7. **Historical guarantee:** After a customer has successfully paid, can any future mutation of the live Offer, Plan Version, catalog memberships, categories, content, or entitlement rewrite the historical policy purchased by that customer? **NO.** Orders preserve their price/terms and point to immutable snapshots; entitlement mutations affect grant status/validity only, not the purchase policy.

Live catalog membership may be consulted only for current CATALOG-offer validation before purchase. Historical access uses the order snapshot, never live offer membership. Non-CATALOG offers have null `catalog_policy_type`, no policy membership rows, and no order policy snapshot.

## 7. Payment, settlement, and fulfillment transaction contracts

### Order creation

In one PostgreSQL transaction, require an authenticated, verified, non-suspended customer; validate the active offer, date window, typed target/hierarchy, exact immutable plan version and live CATALOG policy; compute server-authoritative `amount_tzs` and finite duration; create the immutable order and purchase-time policy snapshot/members for CATALOG scope. Enforce customer idempotency by unique `(customer_id, idempotency_key)`. External payment calls occur only after commit and never while holding database locks.

### Payment attempt and verified settlement

Create each attempt with a unique order-local attempt number and exact order `amount_tzs`. Provider initiation happens outside a database transaction. A callback/event is authenticated and normalized before settlement handling; never trust a redirect or client claim. An ambiguous outcome is stored as `UNKNOWN` and must be reconciled; it is neither success nor failure and cannot trigger fulfillment.

For a verified success, one short PostgreSQL transaction locks the attempt and order, re-reads current states, checks provider/reference, integer TZS amount, order/customer correlation and permitted transition, inserts the `settlements` row under the provider/event unique key, records payment `SUCCEEDED` and order `PAID`, and inserts or ensures one `PENDING` fulfillment row plus durable PostgreSQL outbox intent. These facts commit atomically. Once committed, payment remains successful, order remains paid, and settlement remains durable regardless of later fulfillment outcome. A duplicate provider event conflicts on its unique identity and resolves to the already recorded result without a second settlement or grant. A non-success, `UNKNOWN`, or mismatched event cannot grant access.

Payment `SUCCEEDED`, order `PAID`, and a durable settlement do not imply fulfillment completion. Fulfillment completion is represented exclusively by `fulfillments.status` and its timestamps. There is no `payment_attempts.fulfilled_at`. Fulfillment failure never reverses successful payment/order state, and the customer is never charged again merely because fulfillment failed.

### Fulfillment processing

Process the unique fulfillment row under a short transaction/row lock without adding an in-progress lifecycle value or calling external providers while holding the lock. The entitlement change, unique `entitlement_order_effects` insert, fulfillment completion, and corresponding audit/outbox intent commit atomically. A transient failure records `FAILED_RETRYABLE`; a deterministic business failure (including a revoked exact-target grant) records `FAILED_TERMINAL` with an explicit error outcome. A retryable failure can return to `PENDING` as the retry is claimed, without an additional state. Fulfillment failure does not alter `SUCCEEDED`, `PAID`, or settlement history. Recovery retries fulfillment only, never collection; no customer charge is repeated.

## 8. Entitlement extension contract

All time arithmetic uses PostgreSQL `transaction_timestamp()` (equivalent to stable `NOW()` within the transaction). Convert the immutable purchased duration to an interval from a positive integer `duration_value` and `HOUR`/`DAY`.

### Existing exact-target entitlement

```text
BEGIN
→ lock the exact (customer, typed target) entitlement row FOR UPDATE
→ re-read status and expires_at under the lock
→ if status = REVOKED: stop; return controlled REVOKED_TARGET business failure
→ calculate:
    new_expires_at =
      GREATEST(current_expires_at, NOW()) + purchased_duration
→ update expires_at = new_expires_at
→ set status = ACTIVE
→ insert entitlement_order_effects(order_id UNIQUE, entitlement_id, EXTENDED, ...)
→ complete fulfillment in this same transaction
→ COMMIT
```

The formula applies identically to `ACTIVE` and `EXPIRED` rows. `starts_at` remains the original start for an existing entitlement. The order-effect uniqueness and fulfillment-row lock make retries for the same order no-ops after the first committed application.

### New exact-target entitlement

Within a `READ COMMITTED` fulfillment transaction, first check for an existing effect for the order; if present, do not apply it again. Attempt to insert a new entitlement with `starts_at = NOW()` and `expires_at = starts_at + purchased_duration`, protected by the customer/exact typed-target unique index (including a dedicated uniqueness rule for the customer's CATALOG-scope grant). Use `INSERT ... ON CONFLICT DO NOTHING RETURNING id`; if another first-purchase transaction won the exact-target race, select the now-existing exact row `FOR UPDATE`, re-read status/expiry, and apply the existing-entitlement contract. `READ COMMITTED` ensures the follow-up statement can observe the winning committed row; serialization/deadlock errors are retried as whole transactions without external side effects. A conflict with `REVOKED` returns the controlled failure; it never creates a duplicate row or silently reactivates it.

Insert the unique order effect and mark fulfillment complete in the same transaction as either creation or extension. A concurrent first-purchase race therefore converges on one entitlement row; each distinct paid order applies at most one duration, and retries of the same order cannot extend twice.

### Revocation

An ordinary purchase does not reactivate a `REVOKED` exact target and does not insert a duplicate exact-target row. Fulfillment terminates in a deterministic controlled failure requiring an explicit authorized administrative re-grant/reactivation path with reason, audit, and notification. No silent reactivation.

## 9. Idempotency model

* Order-create request: unique `(customer_id, idempotency_key)`.
* Payment attempt: unique `(order_id, attempt_number)`; provider reference unique per provider when present.
* Provider event: unique `(provider_name, provider_event_id)` on attempts and settlements. PostgreSQL's default null-distinct unique semantics allow multiple null attempt event IDs.
* Settlement: one accepted settlement per attempt, plus globally unique provider/event identity.
* Fulfillment: unique `order_id`; status transition/claim is locked and conditional.
* Entitlement effect: unique `order_id` means an order can create/extend at most once.
* Exact-target row: per-kind partial unique index prevents concurrent first-purchase duplicate grants, including when the prior row is `EXPIRED` or `REVOKED`.
* Duplicate, reordered, delayed, and retried callbacks/jobs converge on canonical persisted state. Reconciliation retries fulfillment, not collection and not an already-applied entitlement effect.

## 10. Migration ordering (design only)

No migrations are created in this pass. When implementation is separately authorized, create schema in dependency order:

1. Confirm catalog/user table identifiers and referenced enums; no new catalog schema here.
2. Create commercial enums, `access_plans`, and immutable `plan_versions`.
3. Create `offers` and normalized `offer_catalog_policy_category_members` / `offer_catalog_policy_content_members`; add typed target FKs/checks after referenced catalog tables are present.
4. Create `commercial_policy_snapshots` and member tables with allowed policy types and indexes.
5. Create `orders` with typed targets and the unique FK to snapshots; the purchase transaction inserts snapshot first, then order. Add deferred orphan-snapshot/cardinality constraint triggers once both sides exist.
6. Create payment attempt, settlement, fulfillment, entitlement, and entitlement-effect tables and their uniqueness/check constraints.
7. Add immutability, typed target/hierarchy, offer-validity, and deferred policy-cardinality triggers after all referenced tables exist.
8. Validate constraints/triggers in PostgreSQL integration tests, including raw SQL writes and concurrent insert/extension races, before any future release gate.

This is sequencing guidance only, not a migration script, implementation task, or Phase 5 authorization.

## 11. Non-negotiable invariants

* Payment, order, settlement, fulfillment, and entitlement are distinct records and lifecycles. Order states are exactly `PENDING_PAYMENT`, `PAID`, `EXPIRED`, `CANCELLED`; attempt states exactly `PENDING`, `UNKNOWN`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `EXPIRED`; fulfillment states exactly `PENDING`, `COMPLETED`, `FAILED_RETRYABLE`, `FAILED_TERMINAL`; entitlement states exactly `ACTIVE`, `EXPIRED`, `REVOKED`.
* `payment_attempts` has no `fulfilled_at`; fulfillment completion is exclusively `fulfillments.status` and its timestamps.
* `entitlements.expires_at` is `NOT NULL`; only finite `HOUR` and `DAY` purchase durations exist.
* TZS money is integer-valued in `price_tzs` / `amount_tzs`; one stored unit is one TZS and all constraints are non-negative.
* New grants start at the current transaction time and expire at start plus purchased duration.
* Existing grant extension is exactly `GREATEST(current_expires_at, NOW()) + purchased_duration`.
* `REVOKED` is not reactivated by ordinary fulfillment.
* One order applies an entitlement effect at most once.
* Orders own immutable purchase-time catalog policy snapshots; entitlements resolve historical policy through their order.
* No historical access decision reads mutable live memberships.
* Typed target columns and DB triggers protect application and raw SQL/DML paths.
* Offer status values are exactly lowercase `draft`, `active`, `inactive`, `archived`. Availability is derived from status, date window, valid plan version, typed target, and valid catalog policy. Non-CATALOG offers have no catalog policy fields or members.
* Provider event identity is `(provider_name, provider_event_id)` with nullable-attempt multiple-NULL semantics.
* Movie scope is movie-level; a movie entitlement grants eligible published DJ editions. Series/season/episode evaluation follows catalog hierarchy. Catalog depublication does not revoke durable entitlements; a suspended account is denied access without deleting/revoking its entitlement.
* Only verified, non-suspended accounts may purchase. Audit actor/reason/time/correlation remains required for privileged commercial and entitlement actions. PostgreSQL outbox, reconciliation, locking, and no external calls inside DB locks are preserved.
* There are no generic target IDs, plan targets, order items, edition-specific prices, coupons, referrals, gifts/vouchers, carts, multi-currency, recurring billing, perpetual access, Redis, BullMQ, Kafka, a live provider integration, fulfillment runtime, webhook runtime, refunds/chargebacks, DRM, Cloudflare media infrastructure, or Phase 5 work.

## 12. Rejected alternatives

| Alternative | Reason rejected |
| --- | --- |
| `payment_attempts.fulfilled_at` | Mixes payment state with fulfillment lifecycle and creates a second completion authority. |
| Nullable entitlement expiry or `FOREVER` | V1 approves only finite HOUR/DAY access. |
| Separate entitlement policy snapshot/FK | Duplicates order-owned history without a concrete invariant; risks divergence. |
| Polymorphic `owner_type + owner_id` | Not database-referential; order FK is the canonical ownership edge. |
| Arbitrary JSON policy DSL | Unbounded and not relationally constrained; use explicit policy enum and member tables. |
| Live membership lookup for historical access | Future offer/catalog edits could rewrite purchased policy. |
| Generic `target_id` | Loses typed referential integrity and hierarchy validation. |
| Application-only target validation | Raw SQL/DML could violate target/hierarchy rules; triggers are required. |
| `offers.is_active` | Redundant with status, date window, and validity checks. |
| A separate in-progress fulfillment state | The approved lifecycle distinguishes pending, completed, retryable failure, and terminal failure; transactional locking serializes DB-only processing without adding another state. |
| Reactivating revoked grants during purchase | Silent privilege restoration is not an approved business operation. |
| Duplicate entitlement row after revoke | Conflicts with exact-target uniqueness and obscures revocation history. |
| Order line items or edition-specific pricing | Not part of this approved single-purchase V1 design. |
| Recurring billing, payment provider runtime, or distributed queue | Explicitly outside this design pass and Phase 4 scope. |

## 13. Reconciliation of F-201 through F-205

| Requirement | Final design reconciliation |
| --- | --- |
| F-201 | Preserves separate order/payment/settlement/fulfillment/grant records, immutable order commercial terms, and finite entitlement validity; successful payment alone does not mean access is fulfilled. |
| F-202 | Preserves a normalized immutable purchase-time policy snapshot owned by the order; entitlement history resolves through that order and cannot be rewritten by future live-policy changes. |
| F-203 | Preserves `target_movie_content_id`, `target_series_content_id`, `target_season_id`, and `target_episode_id` on offers/orders/entitlements; the only commercial scopes are MOVIE, SERIES, SEASON, EPISODE, CATALOG. Required database triggers validate content type and season/episode hierarchy, including raw SQL/DML. |
| F-204 | `offers.is_active` remains removed. Availability is lowercase status + starts_at + ends_at + valid plan version + valid target + valid catalog policy (CATALOG scope only). |
| F-205 | Provider event identity remains `UNIQUE(provider_name, provider_event_id)` on attempts and settlements. Nullable attempt event IDs use PostgreSQL null-distinct uniqueness so multiple nulls are allowed and non-null identities remain unique per provider. |

## 14. Final self-attack

| Attack | Defense / remaining boundary |
| --- | --- |
| Change an offer, plan version, category, content row, or live membership after payment | Snapshot/member immutability and order-owned history ensure the purchased policy does not change; historical access never queries live membership. |
| Insert a movie offer pointing at a series, or mismatched season/episode hierarchy using raw SQL | `CHECK`/FK plus mandatory DB target triggers reject invalid type/hierarchy on direct writes. |
| Retry one successful payment callback or fulfillment job repeatedly | Composite provider-event uniqueness, one fulfillment per order, order-effect uniqueness, and guarded transactions prevent duplicate settlement/grant effects. |
| Two different first-purchase orders race for one exact target | Typed partial unique target index elects one row; loser locks/re-reads and extends deterministically unless revoked. |
| Retry fulfillment for an order after it has extended an entitlement | Unique `entitlement_order_effects.order_id` and locked fulfillment state prevent a second extension. |
| Ordinary purchase targets a revoked entitlement | Existing exact row is locked and re-read; fulfillment records controlled failure; no duplicate or silent reactivation. |
| Client reports payment success or supplies a price/expiry | Server recomputes order terms; only verified provider settlement transitions to paid and schedules fulfillment. |
| Use NULL provider event IDs repeatedly | Allowed on attempts by PostgreSQL null-distinct uniqueness; settlement event IDs are non-null and composite-unique. |
| Treat successful payment as completed access | Payment/order success remains distinct; fulfillment status/timestamps alone represent fulfillment completion. |
| Grant indefinite access by omitting expiry | Impossible: `expires_at NOT NULL`, strict `expires_at > starts_at`, and duration enum limited to HOUR/DAY. |

Known external choices such as provider selection, tax treatment, offer price values, retention, and operational retry limits remain outside this schema decision and must not weaken these invariants.

## 15. Final status

**PHASE 4 SCHEMA DESIGN — DOCUMENTATION RECONCILED**

This is documentation reconciliation only. It does not authorize migrations or implementation and does not claim Product Owner acceptance.
