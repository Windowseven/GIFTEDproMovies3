# GIFTEDproMovies3 — REAL DATA MOCK INVENTORY
**Mission ID:** `GPM-REAL-DATA-INTEGRATION-AND-SEEDING`  
**Document ID:** `GPM-REAL-DATA-MOCK-INVENTORY`  
**Status:** COMPLETE & VERIFIED  
**Date:** 2026-11-08  
**Environment:** Local Development (`giftedpro_dev`)  

---

## 1. Executive Summary

This inventory documents all historical mock and static business data sources across the GIFTEDproMovies3 frontend, mapping each dataset to its real backend API endpoints, persistent database entities, and live adapter layers.

Historically, the application used hardcoded TypeScript arrays located in `src/data/mock/` (`adminData.ts`, `customerData.ts`, `mediaTeamData.ts`). Under mission `GPM-REAL-DATA-INTEGRATION-AND-SEEDING`, all operational catalog, taxonomy, access plan, and device data paths are connected directly to PostgreSQL (`giftedpro_dev` on loopback port `5433`) via Fastify backend REST APIs on port `8001`.

---

## 2. Comprehensive Mock Data Inventory

| Domain / Persona | Historic Mock Source | Mock Records Count | Backend Entity / Table | Active Live API Endpoint | Integration Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Taxonomies: Categories** | `src/data/mock/adminData.ts` (`mockAdminCategories`) | 5 static categories | `categories` | `GET /api/v1/catalog/taxonomies`<br>`POST/PATCH/DELETE /api/v1/staff/taxonomies/categories` | **LIVE (Connected to DB)** |
| **Taxonomies: Countries** | `src/data/mock/adminData.ts` (`mockAdminCountries`) | 6 static countries | `countries` | `GET /api/v1/catalog/taxonomies`<br>`POST/PATCH/DELETE /api/v1/staff/taxonomies/countries` | **LIVE (Connected to DB)** |
| **Taxonomies: DJs / Voice Artists** | `src/data/mock/adminData.ts` (`mockAdminDJs`) | 4 static DJs | `dj_voice_artists` | `GET /api/v1/catalog/taxonomies`<br>`POST/PATCH/DELETE /api/v1/staff/taxonomies/djs` | **LIVE (Connected to DB)** |
| **Movies Catalog** | `src/data/mock/adminData.ts` (`mockAdminMovies`) | 6 static movies | `content` (type='movie'), `movie_editions` | `GET /api/v1/catalog/titles`<br>`GET /api/v1/catalog/titles/:slug`<br>`POST/PATCH /api/v1/staff/catalog` | **LIVE (Connected to DB)** |
| **Discovery: Billboard & Trending** | `src/data/mock/adminData.ts` (`mockFeaturedItems`, `mockTrendingItems`) | 12 static discovery cards | Dynamic query over published `content` | `GET /api/v1/catalog/titles` | **LIVE (Connected to DB)** |
| **Customer Library & Entitlements** | `src/data/mock/customerData.ts` (`mockCustomerEntitlements`) | 3 static entitlements | `entitlements`, `catalog_grants` | `GET /api/v1/commercial/me/library` | **LIVE (Connected to DB)** |
| **Commercial Plans & Offers** | `src/data/mock/adminData.ts` (`mockSubscriptionPlans`, `mockPPVRates`) | 4 static plans, 3 PPV rates | `access_plans`, `plan_versions`, `offers` | `GET /api/v1/admin/commercial/access-plans`<br>`GET /api/v1/admin/commercial/offers` | **LIVE (Connected to DB)** |
| **Devices** | `src/data/mock/adminData.ts` (embedded in customer objects) | Static device strings | `devices` | `GET /api/v1/devices`<br>`DELETE /api/v1/devices/:id` | **LIVE (Connected to DB)** |
| **Audit Logs** | `src/data/mock/adminData.ts` (`mockMediaAuditLogs`) | 8 static logs | `audit_events` | `GET /api/v1/admin/audit` | **LIVE (Connected to DB)** |
| **Customer Accounts** | `src/data/mock/adminData.ts` (`mockAdminCustomers`) | 4 static customers | `users`, `user_identities` | Verified live auth (`/api/v1/auth/me`) | **LIVE (Zero Mock Fallback)** |
| **Financial / Revenue Analytics** | `src/data/mock/adminData.ts` (`mockAdminKPIs`, `mockRevenueMix`, `mockMonthlySalesData`) | Hardcoded revenue numbers (e.g. 18.4M TZS) | N/A (Telemetry not yet implemented in backend) | N/A | **HONEST EMPTY / ZERO STATE (Simulated metrics eliminated)** |

---

## 3. Mock Fallback Elimination Policy

1. **No Silent Fallbacks:** When querying titles, taxonomies, or customer library, failure to connect to the backend emits honest errors or renders honest empty states (`No items currently available`).
2. **Zero Fabricated Financial Data:** All charts, revenue breakdowns, and financial KPIs that lack a backing ledger endpoint display `TZS 0` or `"No transactions recorded"` rather than fabricated figures.
3. **Persisted Development Data:** All newly created categories, countries, voice artists, and content editions are committed to PostgreSQL table storage.
