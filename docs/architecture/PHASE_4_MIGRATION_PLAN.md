# Phase 4 Database Migration Plan

> **Status:** Planning only; no migration is authorized or implemented here
> **Baseline:** PostgreSQL Drizzle migration journal through `0004_chunky_clint_barton`
> **Authority:** Accepted Phase 4 schema contract in [PHASE_4_SCHEMA_DESIGN.md](./PHASE_4_SCHEMA_DESIGN.md)
> **Scope:** Add the approved Phase 4 commercial schema to the completed Phase 3C database

## 1. Purpose and boundaries

This document plans the database changes from migration `0004`; it is not SQL, a migration file, or authorization to change runtime behavior. Phase 4 architecture/schema acceptance and Schema Attack #3 PASS are treated as the supplied authorization context. Only planning is authorized now.

Do not edit migrations `0000`–`0004`, execute database DDL, add dependencies, seed offers/plans, or implement providers, webhooks, payment, fulfillment, entitlement services, or Phase 5. The approved schema remains authoritative. Any ambiguity identified below is a planning blocker to resolve before writing migrations, not permission to change the schema.

## 2. Inspected migration baseline and conventions

The production Drizzle journal at `backend/drizzle/migrations/meta/_journal.json` is PostgreSQL, migration format version 7, and has entries `idx` 0–4. Its current head is `0004_chunky_clint_barton.sql`.

| Migration | Actual content and compatibility relevance |
| --- | --- |
| `0000_hard_exiles.sql` | Creates `users`, `auth_tokens`, `devices`, `sessions`, `user_capabilities`, `notifications`, and `audit_events`. IDs are UUIDs with `gen_random_uuid()` defaults; timestamps are `timestamp with time zone` / `TIMESTAMPTZ`; it establishes existing FK delete behavior and indexes. |
| `0001_sharp_the_executioner.sql` | Creates `user_identities`, makes `users.password_hash` nullable, adds the user FK, and adds provider-subject and user-provider unique indexes. |
| `0002_quiet_outbox.sql` | Creates `email_outbox` and its status/availability, lease, and event/status indexes. This is the email-delivery outbox, not an approved general commerce/fulfillment outbox contract. |
| `0003_spotty_absorbing_man.sql` | Creates Phase 3 catalog tables and enums: `content_type` (`movie`, `series`), `content_status`, `episode_status`, `media_status`, plus the initial `pricing_model` enum. Creates `content`, `categories`, `content_categories`, `seasons`, `episodes`, and related catalog tables, FKs and indexes. |
| `0004_chunky_clint_barton.sql` | Removes `dj_voice_artists.tier`, `dj_voice_artists.contract_type`, `series_metadata.pricing_model`, and the `pricing_model` enum. It contains no Phase 4 object. |

The current schema sources under `backend/src/infrastructure/database/schemas/` confirm UUID identifiers, timezone-aware timestamps, Drizzle `pgEnum` definitions, explicit indexes, and named FKs. The migration configuration targets PostgreSQL, uses that schema directory and `backend/drizzle/migrations`, and has strict generation enabled. The journal uses generated tags and statement breakpoints. No Phase 4 entities/enums, Phase 4 migration runner command, or commercial backfill is present in the inspected migrations/source.

Reuse existing `users.id`, `content.id`, `content.content_type`, `categories.id`, `content_categories`, `seasons.id` / `seasons.series_id`, and `episodes.id` / `episodes.season_id`. Reuse `content_type` for trigger comparisons; do not create a second movie/series content-type enum. Do not recreate `pricing_model` or modify the existing `content_type` enum. Existing `audit_events` is generic (`resource_type`, `resource_id`) and has no commercial FKs; existing `email_outbox` is not a commerce event store.

The existing baseline’s catalog writes implement ADR-034 Option C, whose accepted residual risk permits direct SQL writes to bypass some catalog parent/child type rules. The accepted Phase 4 schema separately requires trigger-protected commercial target integrity, including guards against catalog hierarchy/type updates that invalidate referenced commercial targets. Phase 4 must meet that stricter commercial contract without editing old migrations or silently changing ADR-034’s accepted baseline.

### Architecture and ADR reconciliation

| Source | Migration-planning consequence |
| --- | --- |
| ARCH-002 / ARCH-006; ADR-004 / ADR-005 | PostgreSQL remains authoritative; use the existing Drizzle/PostgreSQL migration lineage and relational constraints. |
| ADR-008 and older ARCH-006 payment wording | Older material lists payment states without `UNKNOWN`. The accepted Phase 4 schema's six-state `payment_attempt_status`, including `UNKNOWN`, is the migration authority; do not omit it or fold it into `FAILED`. |
| ADR-012 | PostgreSQL outbox is an accepted direction, but does not identify an approved commerce outbox table. The email-specific `email_outbox` does not resolve this schema gap. |
| ADR-016 / ADR-017 | Preserve separate settlement/payment, fulfillment and entitlement facts and immutable purchased terms. The accepted Phase 4 vocabulary is `access_plans`/`plan_versions`; do not create subscription-named tables. |
| ADR-021 / ADR-027 | Use integer TZS as specified by the Phase 4 schema and preserve commercial records under controlled anonymization; do not infer tax or retention periods. |
| ADR-023 / ADR-034 | Catalog lifecycle does not revoke access. Keep ADR-034's existing Phase 3C migration unchanged while adding the stricter approved Phase 4 commercial target triggers. |

`backend/docs/PROJECT_STATE.md` still records Phase 4 as queued and awaiting Product Owner authorization and uses the old “Subscriptions” label. That status conflicts with the authorization supplied for this migration-planning task. This plan follows the supplied accepted-design/Schema Attack #3 status; the state document was not changed because only the requested Phase 4 plan and its ARCH-017 reference are in scope. Reconcile that stale status before implementation authorization is considered.

### Existing structures to leave untouched

Keep all `0000`–`0004` DDL and the Phase 3C table/enum definitions unchanged. In particular, do not reintroduce series pricing, alter existing user status/role storage, convert existing catalog enums, or cascade-delete commercial history through users/catalog records. No pre-existing table needs a Phase 4 column alteration. Phase 4 adds restrictive FKs to existing identity/catalog tables and may install narrowly scoped commercial integrity triggers on referenced catalog columns, as described in §8.

## 3. Exact proposed migration sequence from `0004`

The next journal index is `5`; append migrations at indices 5 onward. The filenames below identify ordered migration units. Drizzle Kit generates the physical tag suffix according to the repository’s naming convention; do not hand-edit prior journal entries or invent a different journal format.

| Journal index / logical file | Contents and dependency reason |
| --- | --- |
| `0005_phase4_plan_primitives` | Create new Phase 4 enums; create `access_plans` and `plan_versions`, their checks, FK, unique indexes, and supporting lookup indexes. Plan versions depend on access plans only. |
| `0006_phase4_offers_and_live_policy` | Create `offers` and the two normalized live policy membership tables; add offer-to-plan-version and membership FKs, target FKs, checks, uniqueness and lookup indexes. All referenced identity/catalog tables and plan versions already exist. |
| `0007_phase4_snapshots_and_orders` | Create `commercial_policy_snapshots`, both snapshot member tables, and `orders`; add the unique nullable order-to-snapshot FK, order idempotency/target constraints and indexes. The snapshot-to-order ownership check is deferred until both tables exist. |
| `0008_phase4_payment_and_settlement` | Create `payment_attempts` and `settlements`; add attempt/order and settlement/attempt FKs, provider/event identities, partial indexes, checks and lookup indexes. |
| `0009_phase4_fulfillments` | Create one-row-per-order `fulfillments` with its four-value status, status/timestamp checks, unique order FK and operational indexes. |
| `0010_phase4_entitlements_and_effects` | Create `entitlements` and `entitlement_order_effects`; add customer/typed-target FKs, finite expiry and revocation checks, exact-target partial unique indexes and unique order-effect constraint. |
| `0011_phase4_trigger_integrity` | Install trigger functions/triggers only after all dependent tables, FKs and indexes exist. Includes typed target and hierarchy guards, policy/member cardinality and snapshot ownership checks, and immutability guards. Run the read-only verification queries in §15 before release. |

`CREATE TYPE` operations must precede tables using them. Within a migration, create referenced parent tables before children, and create tables before their FKs, indexes, or triggers when the referenced object is in the same migration. This plan does not prescribe generated Drizzle snapshot contents or claim these logical names are actual files.

### Dependency graph

```text
Existing Phase 3C: users, content/content_type, categories/content_categories,
                   seasons, episodes; current Drizzle head 0004
                 │
                 ├── new Phase 4 enums
                 │    └── access_plans
                 │         └── plan_versions
                 │              └── offers ── live offer category/content members
                 │                  │
                 │                  └────────── orders
                 │                                ├── commercial_policy_snapshots
                 │                                │    ├── snapshot categories
                 │                                │    └── snapshot contents
                 │                                ├── payment_attempts
                 │                                │    └── settlements
                 │                                ├── fulfillments
                 │                                └── entitlement_order_effects
                 │                                      └── entitlements
                 └──────────────────────────────────────────┘
                            ↑ typed catalog/customer FKs

After all nodes exist:
  typed-target/catalog hierarchy triggers
  offer policy/cardinality triggers
  snapshot immutability/cardinality/ownership triggers
  plan/order/settlement immutability triggers
```

The order owns a snapshot using `orders.catalog_policy_snapshot_id`; snapshots do not have a generic owner or an order FK. This avoids a circular FK. A deferred constraint trigger, installed last, validates snapshot ownership at commit.

## 4. New enums and approved tables

All Phase 4 IDs use PostgreSQL `uuid` with `gen_random_uuid()` defaults, consistent with the existing schema. All time columns use `TIMESTAMPTZ`. Money is PostgreSQL `integer` in whole TZS units (`1` stored unit = `1` TZS); no cents conversion. Text identifiers below use PostgreSQL `text` where no bounded length is specified in the approved schema. Do not invent varchar lengths or additional enum values.

### Enums

Create these new enums (none exists in `0004`):

| Enum | Exact values |
| --- | --- |
| `commercial_target_kind` | `MOVIE`, `SERIES`, `SEASON`, `EPISODE`, `CATALOG` |
| `commercial_policy_type` | `ALL_CATALOG`, `CATEGORY_SET`, `CONTENT_SET` |
| `duration_unit` | `HOUR`, `DAY` |
| `offer_status` | `draft`, `active`, `inactive`, `archived` |
| `order_status` | `PENDING_PAYMENT`, `PAID`, `EXPIRED`, `CANCELLED` |
| `payment_attempt_status` | `PENDING`, `UNKNOWN`, `SUCCEEDED`, `FAILED`, `CANCELLED`, `EXPIRED` |
| `fulfillment_status` | `PENDING`, `COMPLETED`, `FAILED_RETRYABLE`, `FAILED_TERMINAL` |
| `entitlement_status` | `ACTIVE`, `EXPIRED`, `REVOKED` |
| `entitlement_effect_kind` | `CREATED`, `EXTENDED` |
| `download_limit_type` | `UNIQUE_TITLES`, `DOWNLOAD_ACTIONS` |

Do not reuse catalog lifecycle enums for offers or payment; do not add `TIER`, `PROCESSING`, generic `FAILED`, `AWAITING_PAYMENT`, or a perpetual duration.

### Entity columns and constraints

`PK` means primary key; `FK` means foreign key. Unless otherwise specified, required columns are `NOT NULL`. `created_at`/`updated_at` defaults are `now()` consistent with existing migrations. FK deletion defaults to `RESTRICT` for commercial/customer/catalog history unless explicitly listed otherwise.

| Table | Columns, PostgreSQL types, and database requirements |
| --- | --- |
| `access_plans` | `id uuid PK DEFAULT gen_random_uuid()`; `code varchar(64) UNIQUE NOT NULL`; `name varchar(255) NOT NULL`; `created_at timestamptz NOT NULL DEFAULT now()`; `updated_at timestamptz NOT NULL DEFAULT now()`. `code` is immutable. |
| `plan_versions` | `id uuid PK`; `access_plan_id uuid FK access_plans(id)`; `version_number integer`; `duration_value integer`; `duration_unit duration_unit`; `download_limit integer NULL`; `download_limit_type download_limit_type` (nullable only when the accepted quota semantics permit it); `device_limit integer NULL`; `concurrent_stream_limit integer NULL`; `created_at timestamptz`. Unique `(access_plan_id, version_number)`; `version_number > 0`, `duration_value > 0`, `download_limit >= 0` when non-null, `device_limit >= 0` when applicable, and `concurrent_stream_limit > 0` when applicable. |
| `offers` | `id uuid PK`; `code varchar(64) UNIQUE NOT NULL`; `name varchar(255) NOT NULL`; `status offer_status`; `starts_at timestamptz`; `ends_at timestamptz NULL`; `target_kind commercial_target_kind`; nullable UUIDs `target_movie_content_id`, `target_series_content_id`, `target_season_id`, `target_episode_id`; `plan_version_id uuid FK plan_versions(id)`; `price_tzs integer`; `catalog_policy_type commercial_policy_type NULL`; `created_at`, `updated_at timestamptz`. Check `price_tzs >= 0`, `ends_at IS NULL OR ends_at > starts_at`, and target-kind/populated-column equivalence. CATALOG requires policy type and all target FKs null; non-CATALOG requires one matching target and null policy type. No `is_active`. |
| `offer_catalog_policy_category_members` | `offer_id uuid FK offers(id)`; `category_id uuid FK categories(id)`; composite PK `(offer_id, category_id)`. No duplicate category membership. |
| `offer_catalog_policy_content_members` | `offer_id uuid FK offers(id)`; `content_id uuid FK content(id)`; composite PK `(offer_id, content_id)`. No duplicate content membership. |
| `commercial_policy_snapshots` | `id uuid PK`; `policy_type commercial_policy_type`; `created_at timestamptz`. No `owner_type`, `owner_id`, JSON DSL, or generic target column. |
| `commercial_policy_snapshot_categories` | `snapshot_id uuid FK commercial_policy_snapshots(id)`; `category_id uuid FK categories(id)`; composite PK `(snapshot_id, category_id)`. |
| `commercial_policy_snapshot_contents` | `snapshot_id uuid FK commercial_policy_snapshots(id)`; `content_id uuid FK content(id)`; composite PK `(snapshot_id, content_id)`. |
| `orders` | `id uuid PK`; `customer_id uuid FK users(id)`; `offer_id uuid FK offers(id)`; `status order_status`; `target_kind commercial_target_kind`; nullable UUID target columns as for offers; `plan_version_id uuid FK plan_versions(id)`; `amount_tzs integer`; `duration_value integer`; `duration_unit duration_unit`; `catalog_policy_snapshot_id uuid NULL UNIQUE FK commercial_policy_snapshots(id)`; `idempotency_key varchar(128) NOT NULL`; `created_at`, `updated_at timestamptz`. Check `amount_tzs >= 0`, `duration_value > 0`, target/snapshot requirements and consistency with the source offer/version. Unique `(customer_id, idempotency_key)`. |
| `payment_attempts` | `id uuid PK`; `order_id uuid FK orders(id)`; `attempt_number integer`; `provider_name varchar(64) NOT NULL`; `provider_reference varchar(128) NULL`; `provider_event_id varchar(128) NULL`; `status payment_attempt_status`; `amount_tzs integer`; `created_at`, `updated_at timestamptz`. Check positive attempt number and non-negative amount. Unique `(order_id, attempt_number)`, unique `(provider_name, provider_event_id)` with PostgreSQL default NULL-distinct behavior, and partial unique `(provider_name, provider_reference) WHERE provider_reference IS NOT NULL`. |
| `settlements` | `id uuid PK`; `payment_attempt_id uuid UNIQUE FK payment_attempts(id)`; `provider_name varchar(64) NOT NULL`; `provider_event_id varchar(128) NOT NULL`; `provider_reference varchar(128) NOT NULL`; `amount_tzs integer`; `settled_at`, `recorded_at timestamptz`. Check non-negative amount. Unique `(provider_name, provider_event_id)`; provider/event/reference values are non-null. |
| `fulfillments` | `id uuid PK`; `order_id uuid UNIQUE FK orders(id)`; `status fulfillment_status`; `attempt_count integer`; `last_error_code varchar(64) NULL`; `created_at`, `updated_at timestamptz`; `last_attempt_at`, `completed_at`, `failed_at timestamptz NULL`. Check non-negative attempt count and status/timestamp consistency. |
| `entitlements` | `id uuid PK`; `customer_id uuid FK users(id)`; `target_kind commercial_target_kind`; nullable UUID target columns as for offers; `status entitlement_status`; `starts_at`, `expires_at timestamptz`; `created_at`, `updated_at timestamptz`; nullable `revoked_at timestamptz`, `revocation_reason text`, `revoked_by uuid FK users(id) ON DELETE SET NULL` audit fields. `expires_at NOT NULL` and `expires_at > starts_at`; target columns match scope; revoked fields are present consistently for `REVOKED`. No snapshot FK is duplicated here. |
| `entitlement_order_effects` | `id uuid PK`; `order_id uuid UNIQUE FK orders(id)`; `entitlement_id uuid FK entitlements(id)`; `effect_kind entitlement_effect_kind`; `applied_at timestamptz`; `expires_at_after timestamptz`. Unique order is the durable exactly-once key. |

Explicitly bounded VARCHAR columns standardize machine identifiers and error codes while preserving TEXT for human-readable reasons (e.g. `revocation_reason`). Specifically:
* `access_plans.code`: `varchar(64)`
* `offers.code`: `varchar(64)`
* `fulfillments.last_error_code`: `varchar(64)`
* `payment_attempts.provider_name` / `settlements.provider_name`: `varchar(64)`
* `orders.idempotency_key`: `varchar(128)`
* `provider_reference` / `provider_event_id`: `varchar(128)`

### FK and delete/update policy

* `access_plans → plan_versions → offers/orders` and `orders → payment_attempts/settlements/fulfillments/effects` use restrictive deletion. Settlements reference payment attempts; a payment attempt has at most one accepted settlement.
* Customer/order/entitlement references point to existing `users.id`; preserve commercial records through controlled anonymization, not cascade deletion.
* Target FKs reference `content.id`, `seasons.id`, and `episodes.id`; catalog deletion must not erase historical order/entitlement evidence.
* Offer membership FKs point to `offers`, `categories`, and `content`. Snapshot member FKs point to the immutable snapshot and existing categories/content. Snapshot and commercial rows use restrictive deletion; live memberships may only be changed through the offer-policy lifecycle and do not rewrite prior snapshots.
* `revoked_by` is an audit identity referencing `users(id)` with `ON DELETE SET NULL`. If a staff user account is removed or anonymized under ADR-027, the commercial entitlement record preserves `revoked_at` and `revocation_reason` intact while setting `revoked_by = NULL`, avoiding orphan constraint errors or cascading deletion.
* FK `ON UPDATE` remains `NO ACTION`, consistent with the current Drizzle migrations. Commercial identifiers are not updated in place.

## 5. Indexes, uniqueness, and checks

Create ordinary indexes for child-side FK lookup/query paths as needed (customer/status/time, order IDs, plan IDs, typed target IDs, and policy member references). Name indexes consistently with the existing `<table>_<columns>_idx` convention; these names are proposed, not existing database objects.

Required unique/partial indexes:

1. `access_plans(code)`, `offers(code)`.
2. `plan_versions(access_plan_id, version_number)`.
3. Member composite primary keys for both live offer members and both snapshot member tables.
4. `orders(customer_id, idempotency_key)` unique; `orders.catalog_policy_snapshot_id` unique, nullable.
5. `payment_attempts(order_id, attempt_number)` unique.
6. `payment_attempts(provider_name, provider_event_id)` unique with NULL-distinct semantics so multiple null event IDs are accepted while each non-null provider/event pair is unique.
7. `payment_attempts(provider_name, provider_reference) WHERE provider_reference IS NOT NULL` unique.
8. At most one unresolved attempt per order: unique `payment_attempts(order_id) WHERE status IN ('PENDING', 'UNKNOWN')`. `UNKNOWN` remains a true unresolved state and must not permit a second in-flight charge attempt until reconciled.
9. `settlements(payment_attempt_id)` unique and `settlements(provider_name, provider_event_id)` unique.
10. `fulfillments(order_id)` unique.
11. Four `entitlements(customer_id, target_<kind>_id)` unique partial indexes, each filtered to its target kind and non-null typed key; one unique `entitlements(customer_id) WHERE target_kind = 'CATALOG'`. Status is deliberately absent, so expired/revoked rows reserve the exact-target key.
12. `entitlement_order_effects(order_id)` unique.

Required CHECK constraints include positive plan version/duration and attempt number, nonnegative limits/prices/amounts, valid offer date range, target-kind and NULL-shape consistency on offers/orders/entitlements, CATALOG policy/snapshot presence, finite entitlement expiry, revocation-field consistency, fulfillment timestamp/status consistency, and policy-scoped member rules that can be expressed locally. Composite and cross-table policy/hierarchy requirements use triggers described in §8 rather than invalid cross-table CHECK expressions.

Provider/event uniqueness on payment attempts and settlements is exactly `UNIQUE(provider_name, provider_event_id)`. PostgreSQL's default NULLS DISTINCT semantics are intentional only for nullable attempt `provider_event_id`; settlement provider and event identifiers are both non-null.

## 6. Catalog policy and immutable purchase snapshots

`offers.catalog_policy_type` is populated only for CATALOG offers. Offer membership rows are valid only for CATALOG offers. The policy/member combinations are:

| Policy | Live offer membership | Snapshot membership |
| --- | --- | --- |
| `ALL_CATALOG` | Zero category and content member rows | Zero category and content snapshot rows |
| `CATEGORY_SET` | One or more category members; no explicit content members | One or more category IDs and the set of content IDs resolved from those categories at purchase; an empty resolved content set is valid when the selected categories currently resolve to none |
| `CONTENT_SET` | One or more content members; no category members | One or more content IDs; zero category IDs |

The precise CATEGORY_SET live-membership cardinality must be checked against the canonical offer policy rules at migration implementation review; the immutable snapshot rule above is mandatory. Do not allow a non-CATALOG offer to have a policy type or membership rows. Examples rejected by checks/deferred triggers include MOVIE + CATEGORY_SET, SERIES + ALL_CATALOG, CATALOG with null policy, and CATALOG with a typed target.

For a catalog-policy purchase, one transaction reads current offer membership, creates one `commercial_policy_snapshots` row and immutable member rows, resolves category content IDs through existing `content_categories`, and creates the order that points to that snapshot. Historical evaluation uses only the snapshot and does not join mutable offer membership or live category memberships. The snapshot is inserted before its order within the same transaction. A deferred constraint trigger checks at commit that every snapshot is referenced by exactly one order, and that CATALOG order/offer policy types agree. Non-CATALOG orders have no snapshot.

**CATEGORY_SET snapshot concurrency protocol (F-304 resolved):**
The exact CATEGORY_SET content set must be resolved from one consistent purchase-time view even if catalog administration concurrently adds or removes content from categories in `content_categories`.
* **Database migration responsibility:** Create snapshot tables, member junction tables, composite primary keys, restrictive foreign keys, and deferred constraint triggers validating ownership and cardinality at transaction commit.
* **Runtime transaction responsibility:** To ensure snapshot construction reads an uncorrupted, non-phantom view of category-content associations:
  1. The purchase order creation transaction executes at `READ COMMITTED` (default) and acquires shared row locks on the relevant offer's category policy members:
     ```sql
     SELECT category_id
     FROM offer_catalog_policy_category_members
     WHERE offer_id = $offerId
     FOR SHARE;
     ```
  2. The transaction resolves the matching content IDs by querying `content_categories` and locks the resolved relation rows `FOR SHARE` (or executes the order creation within a `REPEATABLE READ` transaction block):
     ```sql
     SELECT DISTINCT cc.content_id
     FROM content_categories cc
     WHERE cc.category_id = ANY($categoryIds)
     FOR SHARE;
     ```
  3. The transaction inserts the `commercial_policy_snapshots` row, its `commercial_policy_snapshot_categories` rows, and the resolved `commercial_policy_snapshot_contents` rows.
  4. The order is inserted referencing the new snapshot ID.
  5. The deferred constraint trigger validates that the snapshot is referenced by exactly one order at commit time.
This protocol prevents concurrent administrative modifications to `content_categories` from producing a partially mixed or incomplete snapshot. The migration schema provides the necessary relational tables, foreign keys, and deferred triggers; runtime transaction management guarantees consistent read-and-materialize isolation.

Database `BEFORE UPDATE OR DELETE` guards reject mutation/deletion of snapshots and snapshot members. Plan version terms are immutable; a new term requires a new `plan_versions` row. Purchased order terms (`offer_id`, target, version, amount, duration, snapshot reference, customer and idempotency identity) are immutable after insert; lifecycle state/timestamps remain separately transitionable. Live offer membership edits may affect future purchases only.

## 7. Order/payment/settlement/fulfillment/idempotency contracts

### Order idempotency

`UNIQUE(customer_id, idempotency_key)` is the database guarantee. Both values are non-null, so NULL behavior does not create duplicate gaps. Runtime behavior must use `INSERT ... ON CONFLICT` or an equivalent transaction-safe pattern, return the existing order for a replay, and compare request identity/terms rather than silently treating a different payload as the same purchase. Unique constraint conflict handling, offer validation and order creation belong in a short runtime transaction; migrations do not provide that behavior.

### Payment attempts and `UNKNOWN`

`payment_attempts` references one order, has a unique order-local attempt number, and stores integer TZS amount. A partial unique index on `(order_id) WHERE status IN ('PENDING','UNKNOWN')` enforces one unresolved attempt at a time across ordinary concurrent inserts/updates. The index does not ensure all transitions are correct; runtime must lock/re-read the order and attempt, and reconcile `UNKNOWN` before allowing another unresolved attempt. `UNKNOWN` means provider outcome is ambiguous, is not `FAILED`, and cannot create a settlement or fulfillment.

Provider calls occur outside database locks. Provider event processing validates identity and amount before one short transaction changes payment facts. Composite provider/event uniqueness handles duplicate event identities, but the runtime must catch the unique conflict and load the canonical stored result without applying another transition.

### Durable settlement and payment success

One immutable settlement references one payment attempt and has a unique non-null provider/event identity. In one runtime transaction, lock and re-read the affected attempt and order; validate success, provider identifiers, customer/order correlation and integer TZS amount; insert settlement; change attempt to `SUCCEEDED` and order to `PAID`; then insert the `fulfillments` row with `status = 'PENDING'` atomically. After commit, a fulfillment failure cannot roll back a settlement or reverse `PAID`/`SUCCEEDED`, and must never prompt another customer charge.

**Fulfillment as the Phase 4 durable work queue (F-301 resolved):**
For Phase 4, the `fulfillments` table is the authoritative durable PostgreSQL-backed work queue for access fulfillment. A separate `commerce_outbox` table is NOT introduced in Phase 4. The Phase 4 fulfillment lifecycle itself provides durable work intent:

```text
payment success
    ↓
settlement committed
    ↓
fulfillment row exists with status = PENDING
    ↓
durable work intent
    ↓
fulfillment worker
    ↓
COMPLETED / FAILED_RETRYABLE / FAILED_TERMINAL
```

The runtime worker model operates conceptually as:
```sql
SELECT *
FROM fulfillments
WHERE status IN ('PENDING', 'FAILED_RETRYABLE')
ORDER BY created_at ASC
FOR UPDATE SKIP LOCKED;
```
This is documentation of the intended runtime contract only; no queue infrastructure, Redis, BullMQ, or Kafka is added. Status semantics are strict:
* `PENDING` means durable fulfillment work exists.
* `FAILED_RETRYABLE` means durable retryable work remains.
* `FAILED_TERMINAL` means the fulfillment attempt cannot automatically proceed and requires operational recovery.
* `COMPLETED` means the fulfillment obligation has been successfully applied.
* `entitlement_order_effects` remains the exact-once fulfillment ledger preventing duplicate duration grants upon worker retry.
* Payment success and settlement durability remain completely independent from fulfillment state.

Any future Phase 5 domain-event or integration-outbox requirement is a separate architectural decision for Phase 5 live payment integration and is NOT part of Phase 4. `fulfillments` is not a generic event bus; it is specifically the durable work queue for access fulfillment.

### Fulfillment

One `fulfillments` row per order; statuses are exactly `PENDING`, `COMPLETED`, `FAILED_RETRYABLE`, `FAILED_TERMINAL`. `attempt_count` is nonnegative, and `last_attempt_at`, `completed_at`, and `failed_at` must agree with the status. A transient failure remains retryable; a deterministic revoked-target failure is terminal and explicit. Payment success/order PAID/settlement persist independently. Runtime locks the fulfillment row and only retries fulfillment, never collection.

No additional `PROCESSING` or generic `FAILED` state is permitted. No `payment_attempts.fulfilled_at` exists; completion authority is solely `fulfillments.status` and fulfillment timestamps.

## 8. Typed target integrity and trigger/function deployment

Each of `offers`, `orders`, and `entitlements` keeps its explicit columns: `target_movie_content_id`, `target_series_content_id`, `target_season_id`, `target_episode_id`. No generic `target_id` and no subscription target. Ordinary FKs and local CHECK constraints validate existence/shape; triggers validate semantic type and hierarchy for raw SQL/DML as required by F-203.

Install trigger functions only in migration `0011`, after all target tables/columns/FKs exist. Proposed stable SQL identifiers:

| Function | Trigger(s) and tables | Required action and event |
| --- | --- | --- |
| `phase4_validate_commercial_target()` | `offers`, `orders`, `entitlements`; `BEFORE INSERT OR UPDATE OF target_kind, target_movie_content_id, target_series_content_id, target_season_id, target_episode_id` | Validate MOVIE points to `content.content_type = 'movie'`; SERIES to `content_type = 'series'`; SEASON points to an existing season whose `series_id` identifies series content; EPISODE points to an existing episode → season → series-content hierarchy; CATALOG has all four target IDs NULL. Raise a constraint error on mismatch. |
| `phase4_guard_commercial_target_hierarchy_change()` | `content`, `seasons`, `episodes`; `BEFORE UPDATE OF content_type` on content, `BEFORE UPDATE OF series_id` on seasons, `BEFORE UPDATE OF season_id` on episodes | Reject a catalog update that would make any referenced offer/order/entitlement target invalid. Restrictive FKs already prevent deletion of referenced rows. This closes the possibility that a valid target is made invalid after the commerce-row insert. |
| `phase4_validate_offer_policy_membership()` | Offers and both live offer membership tables; deferred constraint triggers on `INSERT/UPDATE/DELETE` | At commit, require policy type/scope/member cardinality to agree; membership rows only for CATALOG; reject non-CATALOG policy/member rows and ALL_CATALOG with members. |
| `phase4_validate_snapshot_ownership_and_cardinality()` | Orders, snapshots, and both snapshot membership tables; deferred constraint triggers on `INSERT/UPDATE/DELETE` | At commit, enforce CATALOG↔snapshot presence, exactly one order reference per snapshot, matching policy type, and policy/member cardinalities. The runtime transaction resolves CATEGORY_SET contents from a consistent purchase-time view; the trigger does not treat later live memberships as historical truth. |
| `phase4_guard_plan_version_mutation()` | `plan_versions`; `BEFORE UPDATE OR DELETE` | Reject changing or deleting immutable version terms. |
| `phase4_guard_commercial_snapshot_mutation()` | Snapshot and snapshot-member tables; `BEFORE UPDATE OR DELETE` | Reject mutation/deletion of historical policy evidence. |
| `phase4_guard_order_purchase_terms()` | `orders`; `BEFORE UPDATE` | Reject changes to immutable purchase fields while allowing approved order lifecycle/timestamp updates. |
| `phase4_guard_settlement_mutation()` | `settlements`; `BEFORE UPDATE OR DELETE` | Preserve committed settlement facts as immutable. |

Trigger validation must run for direct SQL writes as well as application writes. No normal application role may have privileges to disable triggers or alter these functions. Deferred constraint triggers are necessary for transactionally creating the snapshot before its order and inserting the set of policy members before final cardinality validation. Keep triggers narrow; do not convert ADR-034’s entire catalog write architecture as part of this Phase 4 migration.

## 9. Entitlement uniqueness, extension, and exactly-once effects

The exact-target key is `(customer_id, target_kind, relevant typed target)` in meaning, but remains implemented with separate partial unique indexes over typed columns. Add one CATALOG uniqueness rule per customer. Do not include `status` in any exact-target uniqueness predicate: EXPIRED and REVOKED rows must prevent duplicate rows.

The database guarantees:

* Typed target FK existence, target-kind/NULL shape, trigger-validated target type/hierarchy.
* `expires_at NOT NULL`, `expires_at > starts_at`, and finite `HOUR`/`DAY` purchased duration.
* No duplicate exact-target entitlement for a customer.
* Exactly one `entitlement_order_effects` row per order.
* FK link from each effect to its entitlement and order.

The runtime transaction contract is not a migration guarantee:

1. Lock the exact entitlement row `FOR UPDATE`, then re-read status and `expires_at`.
2. If `REVOKED`, return controlled terminal business failure; never reactivate or insert a duplicate.
3. For ACTIVE and EXPIRED, calculate `GREATEST(current_expires_at, NOW()) + purchased_duration`, update expiry and ACTIVE status, insert the unique order effect, and complete fulfillment atomically.
4. For a new entitlement, use the exact-target unique index with `INSERT ... ON CONFLICT DO NOTHING RETURNING`; if another first-purchase transaction wins, re-read the exact row `FOR UPDATE` and apply the same extension contract.
5. New row `starts_at = transaction_timestamp()` and `expires_at = starts_at + purchased_duration`. Retry transaction-level serialization/deadlock errors as a whole. Check for the order effect first so fulfillment replay never extends twice.

The order-effect unique key is durable idempotency for duplicate webhook delivery, duplicate worker execution, crash/retry, and fulfillment replay. Database uniqueness prevents duplicate committed rows; row locks, transaction retries, state re-reads and correct conflict handling are runtime responsibilities.

## 10. Database-enforced guarantees vs runtime guarantees

| Concern | Database migration guarantee | Runtime transaction guarantee |
| --- | --- | --- |
| Referential integrity and deletes | FKs, restrictive commercial-history delete behavior | Controlled anonymization workflow |
| Target kind and hierarchy | Typed FKs, shape CHECKs, target/hierarchy triggers including catalog-side invalidation guard | User-facing validation/error mapping and retry handling |
| Offer/policy/snapshot validity | CHECKs, composite PK/unique indexes, deferred constraint triggers, immutable row triggers | Read/resolve live offer policy at purchase, serialize category-membership resolution against concurrent edits, and build snapshot rows atomically |
| Order request idempotency | Unique `(customer_id, idempotency_key)` | Return canonical order and reject a mismatched replay |
| In-flight payment attempt | Partial unique index for PENDING/UNKNOWN | Lock/re-read; do not begin another collection while outcome is ambiguous |
| Provider event / settlement idempotency | Composite unique provider/event indexes; one settlement per attempt | Verify provider event, validate amount/order, handle unique conflicts and reconciliation |
| Payment success durability | Persisted settlement/attempt/order/fulfillment rows; immutable settlement guard | Commit payment success, PAID order, settlement, and durable work intent atomically |
| Fulfillment retry | Unique order row, enum/status/timestamp checks | Lock row, retry boundedly, classify terminal/retryable errors, never charge again |
| Entitlement exact-target race | Per-kind partial unique indexes | `FOR UPDATE`, `ON CONFLICT`, re-read winner, and transaction-level retry |
| Entitlement exactly once per order | Unique `entitlement_order_effects.order_id` | Insert effect in same transaction as entitlement mutation and completion |
| Audit | Existing audit schema remains the persistence target; no new table or FK is inferred | Write required actor/reason/correlation audit record in the same transaction where the approved audit contract requires it |
| Outbox | No approved general-purpose outbox table is in the schema inventory | Atomic durable follow-up intent is required by the design but the database representation is a blocker pending explicit resolution (§7) |

Migrations alone do not implement `FOR UPDATE`, transaction boundaries, provider verification, callbacks, retry schedules, reconciliation, or business outcome mapping.

## 11. Existing data and backfill assessment

The migration lineage contains no access plans, plan versions, offers, orders, payment attempts, settlements, fulfillments, entitlements, or commercial policy rows. `0004` also removed the old `pricing_model`; no approved mapping exists from its former values to a Phase 4 access plan. Therefore this plan includes **no automatic commercial backfill or seed data**.

The schema source has Phase 3C users, content, categories, seasons, episodes, and category memberships that Phase 4 FKs can reference. Before production deployment, inspect the actual deployed database (read-only) for migration journal consistency, catalog FK/orphan integrity, table sizes, active sessions/transactions, and deployed head. This plan did not connect to or mutate any database, and the migration files do not establish whether a particular environment contains production-like data.

Preflight data checks required before DDL:

* Confirm every `seasons.series_id` referenced for commercial targeting identifies series content and every `episodes.season_id` resolves to an existing season/series hierarchy.
* Confirm referenced users/content/categories rows are not scheduled for deletion during rollout; existing restrictive FKs and new commercial FKs must preserve history.
* Confirm deployed migration journal is exactly through `0004` or produce an environment-specific reconciliation plan; never stamp a missing migration as applied.
* Confirm no operator has manually created conflicting Phase 4 names/types.

Since Phase 4 rows are new and no rows need conversion, there is no large-table backfill in this plan. If preflight finds incompatible catalog rows or manually created objects, stop and prepare a separately reviewed repair/backfill plan; do not disable constraints or weaken target validation.

## 12. Transaction boundaries, lock implications, and failure recovery

Each migration unit is additive and should execute as one PostgreSQL transaction where all statements support transactional DDL. Do not use `CREATE INDEX CONCURRENTLY` inside a transaction. These Phase 4 tables begin empty and their indexes can be built with normal transactional DDL. Existing catalog trigger installation and FK additions take locks on referenced tables; schedule the short metadata changes in a controlled deployment window and verify lock queues and long-running transactions beforehand. Do not rewrite old migrations to reduce locking.

No data-copy/backfill step is required, so no multi-batch data migration or dual-write period is planned. Trigger-function creation and trigger attachment are brief DDL operations but lock their target relations; attach after all table/index preparation. Deferred triggers validate at transaction commit and must be tested with the exact snapshot-before-order insertion sequence.

Failure handling:

* If a migration transaction fails, PostgreSQL should roll that migration unit back; verify the Drizzle journal did not advance and inspect the database before retry.
* Do not blindly rerun partially committed non-transactional operations. This plan avoids concurrent index creation and requires all DDL to be transactional; if the actual migration runner uses different transaction boundaries, settle that before authoring.
* Migration units already committed remain in the journal. Apply a reviewed forward corrective migration; do not edit/replay already-applied migrations and do not use destructive reset/rollback in a shared environment.
* For failed preflight, failed verification, or missed deployment window, stop before exposing Phase 4 writes. Do not serve partial schema behavior.
* Production recovery is forward-only. Database restore is an operational disaster-recovery action governed by existing backup/restore policy, not a schema “down” migration.

The inspected backend package defines Drizzle schema generation but no production migrate script. Before execution is ever separately authorized, migration invocation, credentials, transaction behavior, and deployment locking must be explicitly selected and documented. Do not add a runner or change infrastructure as part of this planning task.

## 13. Offer, plan-version, and money rules

Offer availability is `status + starts_at + ends_at + valid plan version + valid target + valid catalog policy`; there is no `offers.is_active`. Status values remain lowercase exactly `draft`, `active`, `inactive`, `archived`. An archived offer is retained rather than deleted.

Access plans are stable identities; edits to commercial terms create a new immutable `plan_versions` row. Offers reference one exact version; orders preserve that version and copied purchased terms. A new version must not update an existing version or rewrite historical order terms. Access duration is finite and uses only `HOUR` or `DAY`.

`price_tzs` and `amount_tzs` are PostgreSQL integer TZS. Each integer represents one TZS. CHECK constraints are `>= 0`, not `> 0`; no cents, ×100 conversion, multi-currency column, tax calculation, edition pricing, or recurring price is added.

Movie editions remain separate catalog presentations, not separately priced targets. Movie-level commercial targeting remains `target_movie_content_id`; movie entitlements grant eligible published editions under the approved access evaluation semantics. Series/season/episode hierarchy is preserved by typed target constraints and triggers. Catalog depublication does not revoke durable entitlements; suspended-account denial does not delete or rewrite them.

## 14. Audit and outbox relationships

## 14. Audit and outbox relationships

Existing `audit_events` has nullable `actor_id`, `resource_type`, and string `resource_id`, with indexes but no FK to arbitrary resource tables. Preserve it; do not add a polymorphic FK, replace it, or create a new audit table. The Phase 4 migration does not claim database-level referential integrity for this legacy generic audit reference. Entitlement revocation audit fields preserve `revocation_reason` and `revoked_at` permanently, while `revoked_by` references `users(id) ON DELETE SET NULL` per F-303, aligning with ADR-027 account anonymization.

There is no approved Phase 4 audit-link column/table in the canonical entity inventory. Required admin/revocation/plan edit audit events therefore use the existing audit capability and its current logical resource identity; transaction atomicity for audit is a runtime contract, not an additional schema entity in this plan.

Likewise, do not link fulfillment jobs to `email_outbox`. Per F-301, the `fulfillments` table with its `PENDING` and `FAILED_RETRYABLE` states serves directly as the authoritative durable work queue for access fulfillment. Payment success and fulfillment scheduling are atomic within PostgreSQL without requiring a separate outbox table in Phase 4.

## 15. Post-migration verification plan

Verification is read-only with respect to source artifacts and uses a disposable PostgreSQL test database once implementation is authorized. No database was used for this planning task. Required checks before release:

1. Journal indices are contiguous from existing `0`–`4` through the appended Phase 4 units; schemas/snapshots are generated consistently with Drizzle and no earlier journal entry is altered.
2. Catalog baseline object list is unchanged except for specifically approved commercial target guards; no changes to `0000`–`0004` or Phase 3C columns/enums.
3. Every approved Phase 4 table, column type/nullability/default, enum value, FK/delete action, CHECK, unique/partial index, and trigger exists and matches the schema contract.
4. Direct-SQL negative tests reject MOVIE→series, SERIES→movie, invalid season/series and episode/season/series hierarchies, CATALOG with target fields, non-CATALOG with policy/member rows, policy/member cardinality errors, orphan snapshots, and mutation/deletion of immutable plan/snapshot/settlement facts.
5. Direct catalog updates that would invalidate an existing commercial typed target are rejected; ordinary valid catalog publication/depublication without hierarchy change remains unaffected.
6. Repeated NULL payment attempt event IDs succeed; duplicate non-null `(provider_name, provider_event_id)` fails; duplicate settlement provider/event and second settlement per attempt fail. More than one PENDING/UNKNOWN attempt for one order fails, while a resolved prior attempt permits the next attempt.
7. Duplicate `(customer_id, idempotency_key)`, attempt number, fulfillment order, exact target/customer entitlement, and `entitlement_order_effects.order_id` fail at the database layer.
8. `expires_at` cannot be NULL or `<= starts_at`; integer money accepts zero and rejects negative values.
9. Deferred checks pass for valid transaction ordering: snapshot and its members inserted before the owning CATALOG order, and matching snapshot category/content resolution. Invalid final transaction state fails at commit.
10. Runtime integration tests (separately authorized) prove settlement+order paid durability despite fulfillment failure, `UNKNOWN` reconciliation behavior, entitlement `FOR UPDATE` extension formula, revoked-target terminal result, concurrent first-grant convergence, transaction retry, and exactly-once effect semantics.
11. Confirm no `payment_attempts.fulfilled_at`, generic `target_id`, `TIER`, recurring model, `order_items`, `is_active` on offers, edition-specific pricing, or out-of-scope infrastructure/provider/refund schema has been introduced.

Database constraints/triggers must be tested against raw SQL as well as ORM writes. Build/typecheck/runtime suites are implementation validation, not part of this documentation-only plan.

## 16. Reconciliation with accepted contract and audit findings

This plan preserves F-201 through F-205, exact target columns, fixed HOUR/DAY entitlements, non-null `expires_at`, order-owned immutable policy snapshots, integer TZS, distinct payment/settlement/fulfillment/entitlement lifecycles, no silent revoked-entitlement reactivation, and `entitlement_order_effects` exactly-once uniqueness.

All findings from the independent migration plan audit have been formally resolved in this document:

1. **F-301 (Commerce/fulfillment durable work intent):** Resolved. The `fulfillments` table is the authoritative durable PostgreSQL-backed work queue for access fulfillment. No separate `commerce_outbox` table is introduced in Phase 4. Workers query pending/retryable fulfillment rows (`FOR UPDATE SKIP LOCKED`).
2. **F-302 (Bounded string types):** Resolved. Short identifiers and codes are explicitly bounded (`access_plans.code varchar(64)`, `offers.code varchar(64)`, `fulfillments.last_error_code varchar(64)`, `orders.idempotency_key varchar(128)`, provider references `varchar(128)`), while preserving `text` for descriptions and reasons.
3. **F-303 (Revocation actor FK deletion semantics):** Resolved. `entitlements.revoked_by` explicitly references `users(id) ON DELETE SET NULL`. If an actor account is anonymized or removed under ADR-027, the commercial entitlement record preserves `revoked_at` and `revocation_reason` intact while setting `revoked_by = NULL`.
4. **F-304 (CATEGORY_SET purchase-time consistency):** Resolved. The runtime transaction acquires `FOR SHARE` locks on the offer's category members and matching `content_categories` rows (or runs in `REPEATABLE READ`), ensuring uncorrupted materialization of snapshot content rows before commit.
5. **F-305 (Project state record):** Resolved. `backend/docs/PROJECT_STATE.md` has been updated to reflect the approved Phase 4 Commercial Foundation scope and migration planning gate.

## 17. Final status

**PHASE 4 MIGRATION PLANNING — CORRECTIONS COMPLETE**

**READY FOR INDEPENDENT MIGRATION PLAN RE-ATTACK**

**NO MIGRATIONS IMPLEMENTED**

**NO IMPLEMENTATION AUTHORIZED**
