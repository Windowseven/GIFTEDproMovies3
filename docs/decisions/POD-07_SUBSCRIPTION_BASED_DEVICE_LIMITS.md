# GIFTEDproMovies3 — POD-07 DECISION RECORD
## Subscription-Based Device Limit Resolution & Enforcement Invariants

**Document ID:** POD-07 / ADR-038  
**Status:** ACCEPTED BY PRODUCT OWNER  
**Decision Date:** 2 November 2026  
**Authority:** Product Owner Decision POD-07  
**Scope:** Phase 7 Stage 1 Acceptance Closure  
**Related Documents:** `ADR-017`, `ADR-024`, `ADR-035`, `PHASE_4_SCHEMA_DESIGN.md`, `PHASE_7_STAGE_1_IMPLEMENTATION_REPORT.md`

---

## 1. CONTEXT & PROBLEM STATEMENT

In Phase 7 Stage 1, customer device limits were implemented to enforce device capacity based on customer access plans and default limits, with advisory locks protecting against race conditions during concurrent registrations.

During the Phase 7 Stage 1 Independent Acceptance Audit, the Product Owner identified the need for an authoritative business policy regarding how effective device limits are resolved across diverse entitlement types (e.g., direct one-time content purchases versus recurring catalog subscriptions), multiple concurrent subscriptions, and plan lifecycle transitions (expiry, cancellation, refund).

---

## 2. AUTHORITATIVE BUSINESS RULES (POD-07)

1. **Exclusively Subscription-Derived Capacity:**  
   A customer's effective device limit must be derived exclusively from currently active catalog subscription entitlements (`target_kind = 'CATALOG'`).
2. **One-Time Purchases Excluded:**  
   Direct movie purchases, series purchases, season passes, episode rentals, and other non-subscription transactional entitlements (`target_kind IN ('MOVIE', 'SERIES', 'SEASON', 'EPISODE')`) do NOT contribute to customer device capacity, regardless of any `device_limit` parameter on their associated plan versions.
3. **Non-Additive Maxima:**  
   If multiple active subscriptions exist concurrently, the customer's effective limit resolves to `MAX(device_limit)` among those active subscriptions. Device capacities are strictly non-additive.
4. **Active Lifecycle Invariant:**  
   Expired, suspended, refunded, or revoked subscriptions (tracked via `valid_until <= NOW()`, `entitlements.status != 'ACTIVE'`, or presence in `catalog_grant_revocations`) do not contribute to device capacity.
5. **Default Fallback:**  
   If no eligible active subscription exists, the customer capacity defaults to `DEFAULT_CUSTOMER_DEVICE_LIMIT = 2`.
6. **No Silent Eviction:**  
   When an active subscription expires or is revoked, reducing the effective device limit, previously registered devices must NOT be silently evicted or pruned. The user remains with their registered devices intact, but subsequent new device registrations are blocked (`403 DEVICE_LIMIT_EXCEEDED`) until the customer either removes sufficient devices or renews/upgrades their subscription.
7. **Concurrency & Advisory Serialization:**  
   Registration of new device slots must be serialized via PostgreSQL transaction-scoped advisory locks on `hashtext(userId)` to prevent race conditions from breaching capacity under concurrent load.

---

## 3. DOMAIN & SCHEMA EVIDENCE

Subscriptions and direct transactional purchases are distinguished authoritatively at the database level by PostgreSQL enum `commercial_target_kind`:

- **Subscription Entitlements:** `target_kind = 'CATALOG'`  
  - Linked to `orders` where `target_kind = 'CATALOG'` and `status = 'PAID'`.
  - Period grants recorded in immutable ledger `catalog_grants` (`valid_from <= NOW() AND valid_until > NOW()`).
  - Active lifecycle tracked in `entitlements` (`status = 'ACTIVE' AND expires_at > NOW()`).
  - Revocations recorded immutably in `catalog_grant_revocations`.
- **One-Time Purchases:** `target_kind IN ('MOVIE', 'SERIES', 'SEASON', 'EPISODE')`  
  - Linked to specific content targets (`target_movie_content_id`, `target_series_id`, etc.).
  - Granted access to individual titles, not catalog subscriptions.

---

## 4. IMPLEMENTATION SPECIFICATION

The effective limit query is implemented in `DeviceService.getEffectiveDeviceLimit`:

```sql
SELECT MAX(sub.device_limit)::int AS max_limit
FROM (
  SELECT pv.device_limit
  FROM catalog_grants cg
  JOIN orders o ON o.id = cg.order_id
  JOIN plan_versions pv ON pv.id = o.plan_version_id
  JOIN entitlements e ON e.id = cg.entitlement_id
  WHERE e.customer_id = :userId
    AND e.target_kind = 'CATALOG'
    AND e.status = 'ACTIVE'
    AND o.target_kind = 'CATALOG'
    AND o.status = 'PAID'
    AND cg.valid_from <= NOW()
    AND cg.valid_until > NOW()
    AND cg.order_id NOT IN (SELECT order_id FROM catalog_grant_revocations)
    AND pv.device_limit IS NOT NULL

  UNION

  SELECT pv.device_limit
  FROM entitlements e
  JOIN entitlement_order_effects eoe ON eoe.entitlement_id = e.id
  JOIN orders o ON o.id = eoe.order_id
  JOIN plan_versions pv ON pv.id = o.plan_version_id
  WHERE e.customer_id = :userId
    AND e.target_kind = 'CATALOG'
    AND e.status = 'ACTIVE'
    AND e.expires_at > NOW()
    AND o.target_kind = 'CATALOG'
    AND o.status = 'PAID'
    AND eoe.expires_at_after > NOW()
    AND eoe.order_id NOT IN (SELECT order_id FROM catalog_grant_revocations)
    AND pv.device_limit IS NOT NULL
) sub
```

---

## 5. AUTOMATED VERIFICATION MATRIX

The policy is verified in `backend/tests/device-limits.integration.test.ts`:

| Test ID | Scenario | Verified Invariant | Result |
|---|---|---|---|
| **POD07-01** | One-time movie purchase with `device_limit = 8` | Fallback to default limit (2); movie purchases do not expand device capacity | **PASS** |
| **POD07-02** | Active subscription (`limit = 3`) + movie purchase (`limit = 10`) | Limit resolves strictly to subscription limit (3); movie limit ignored | **PASS** |
| **POD07-03** | Multiple concurrent active subscriptions (`limit = 3` and `limit = 5`) | Limit resolves to `MAX(3, 5) = 5`; limits are non-additive | **PASS** |
| **POD07-04** | Expired, revoked, or cancelled subscriptions | Inactive subscriptions do not contribute; fallback to default (2) | **PASS** |
| **POD07-05** | Subscription expiry after device registration | Existing devices preserved (3 devices remain); new registrations rejected without silent eviction | **PASS** |
| **POD07-06** | 8 concurrent registrations against subscription (`limit = 4`) | Advisory lock serializes requests; exactly 4 succeed, exactly 4 rejected with 403 `DEVICE_LIMIT_EXCEEDED` | **PASS** |
