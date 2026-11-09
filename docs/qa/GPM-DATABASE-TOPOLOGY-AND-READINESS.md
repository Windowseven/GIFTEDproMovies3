# GIFTEDproMovies3 — Database Topology & Readiness Report

**Mission ID:** `GPM-LOCAL-ENVIRONMENT-AND-TEST-ACCOUNT-RECOVERY`  
**Execution Lead:** Antigravity  
**Authority:** Product Owner  
**Date:** November 2026  
**Status:** COMPLETE DATABASE TOPOLOGY & READINESS VERIFICATION  
**Classification:** `LOCAL_DATABASE_AVAILABLE`  

---

# 1. DATABASE CLASSIFICATION & DECISION

Following forensic inspection of the PostgreSQL clusters and databases:
- **Environment Classification:** `LOCAL_DATABASE_AVAILABLE`
- **Database Architecture:** Local native PostgreSQL 18 cluster running at `backend/.pg_test_cluster` on port `5433`.
- **Isolation Model:** Strict dual-database isolation separating disposable integration test runs from persistent local development.

---

# 2. TOPOLOGY & ISOLATION SPECIFICATION

```
┌────────────────────────────────────────────────────────────────────────┐
│               LOCAL POSTGRESQL 18 TOPOLOGY (PORT 5433)                 │
├───────────────────────────────┬────────────────────────────────────────┤
│ Disposable Test Database      │ Persistent Development Database        │
│ Name: giftedpro_phase1_test   │ Name: giftedpro_dev                    │
│ Owner: tester                 │ Owner: tester                          │
│ Purpose: Automated Test Suite │ Purpose: Local Dev Frontend & Backend  │
│ Reset Policy: DROPPED & RESET │ Reset Policy: IMMUTABLE & PERSISTENT   │
│ On every `run-tests.mjs` run  │ Data survives test runs and restarts   │
└───────────────────────────────┴────────────────────────────────────────┘
```

## 2.1 Test Database Isolation Safeguards
The integration test runner in [`backend/scripts/run-tests.mjs`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/backend/scripts/run-tests.mjs) enforces strict, hardcoded safeguards before executing destructive reset operations:

```javascript
// Verification from backend/scripts/run-tests.mjs lines 52-74
if (
  !["postgres:", "postgresql:"].includes(url.protocol) ||
  url.pathname !== "/giftedpro_phase1_test" ||
  !["localhost", "127.0.0.1", "::1"].includes(host)
) {
  throw new Error("Test database resets require a loopback PostgreSQL URL for giftedpro_phase1_test.");
}

const identity = await pool.query("SELECT current_database() AS database_name");
if (identity.rows[0]?.database_name !== "giftedpro_phase1_test") {
  throw new Error("Connected database is not the approved test database.");
}
```

### Safety Result
It is technically and mathematically impossible for the test runner to reset, truncate, or wipe `giftedpro_dev`. Any attempt to execute tests against `giftedpro_dev` fails closed immediately.

---

# 3. SCHEMA MIGRATION LEDGER (MIGRATIONS 0000–0013)

The persistent database `giftedpro_dev` was initialized using `drizzle-kit migrate --config=drizzle.config.ts`. All 14 frozen migrations executed cleanly:

| Migration Index | Migration Name | Applied Timestamp | Hash |
| :--- | :--- | :--- | :--- |
| `0000` | `0000_hard_exiles.sql` | `1791049281780` | `2544ecd4b0ea147a...` |
| `0001` | `0001_sharp_the_executioner.sql` | `1791067996689` | `312fbed6397348dd...` |
| `0002` | `0002_quiet_outbox.sql` | `1791100000000` | `5cf38a6b4749824b...` |
| `0003` | `0003_spotty_absorbing_man.sql` | `1791148719900` | `f778b774028b51c7...` |
| `0004` | `0004_chunky_clint_barton.sql` | `1791152319569` | `d6fa7aad85e1fc98...` |
| `0005` | `0005_phase4_plan_primitives.sql` | `1791200000005` | `f6bba0e9244b7178...` |
| `0006` | `0006_phase4_offers_and_live_policy.sql` | `1791200000006` | `08edfa85f0de8bb1...` |
| `0007` | `0007_phase4_snapshots_and_orders.sql` | `1791200000007` | `e030789eacc0f728...` |
| `0008` | `0008_phase4_payment_and_settlement.sql` | `1791200000008` | `68fe7d767ce33b51...` |
| `0009` | `0009_phase4_fulfillments.sql` | `1791200000009` | `513f7a3886743e14...` |
| `0010` | `0010_phase4_entitlements_and_effects.sql` | `1791200000010` | `a56e5393924b8686...` |
| `0011` | `0011_phase4_trigger_integrity.sql` | `1791200000011` | `46f7c73a093d0d4c...` |
| `0012` | `0012_phase4_catalog_grants.sql` | `1791200000012` | `0f52e5a043adc725...` |
| `0013` | `0013_phase6_7_supersession_and_downloads.sql` | `1791200000013` | `7a9f6db7ac14bed2...` |

**Migration Invariant:** Exactly 14 migrations (`0000` to `0013`). Zero schema alterations. Migration 0014 was not created.

---

# 4. TABLE INVENTORY IN `giftedpro_dev`

Query verification confirmed all 39 domain and operational tables exist:
- **Core Identity:** `users`, `user_capabilities`, `user_identities`, `sessions`, `devices`, `auth_tokens`.
- **Catalog & Media:** `content`, `movie_editions`, `seasons`, `episodes`, `categories`, `countries`, `dj_voice_artists`, `content_categories`, `content_countries`, `content_review_notes`, `series_metadata`, `media_asset_supersessions`.
- **Commerce & Billing:** `offers`, `access_plans`, `plan_versions`, `orders`, `payment_attempts`, `settlements`, `fulfillments`, `entitlements`, `entitlement_order_effects`, `catalog_grants`, `catalog_grant_revocations`, `commercial_policy_snapshots`, `commercial_policy_snapshot_contents`, `commercial_policy_snapshot_categories`, `offer_catalog_policy_content_members`, `offer_catalog_policy_category_members`.
- **Operations & System:** `audit_events`, `notifications`, `email_outbox`, `download_attempts`, `system_settings`.
