# GIFTEDproMovies3 — LOCAL DEMO DATA SEEDING
**Mission ID:** `GPM-REAL-DATA-INTEGRATION-AND-SEEDING`  
**Document ID:** `GPM-LOCAL-DEMO-DATA-SEEDING`  
**Status:** COMPLETE & VERIFIED  
**Date:** 2026-11-08  
**Environment:** Local Development (`giftedpro_dev`)  

---

## 1. Executive Summary

This deliverable provides complete operational documentation and proof of execution for the persistent, idempotent local demo seeding script `backend/scripts/seed-local-demo.mjs`.

The seeding script populates `giftedpro_dev` with an authentic, representative East African movie streaming catalog without performing schema modifications, table truncations, or cascading record deletions.

---

## 2. Mandatory Seeding Safeguards

The script enforces four strict runtime environmental gates prior to executing any SQL commands:

1. **Environment Gate:** `APP_ENV === "development"`.
2. **Database Identity Gate:** Actual database identity queried via `SELECT current_database()` MUST equal `giftedpro_dev`.
3. **Network Isolation Gate:** Connected PostgreSQL port queried via `SELECT inet_server_port()` MUST equal `5433` (loopback development cluster).
4. **Idempotency Gate:** All record insertions use `ON CONFLICT DO NOTHING` or deterministic lookup keys.

If any runtime condition is not met, the script terminates immediately with exit code 1.

---

## 3. Seeded Entities & Invariant Counts

| Entity Table | Seeded Count | Sample Records |
| :--- | :--- | :--- |
| **`categories`** | 5 | Action (`action`), Comedy (`comedy`), Drama (`drama`), Horror (`horror`), Sci-Fi (`sci-fi`) |
| **`countries`** | 6 | Tanzania (`TZ`), Kenya (`KE`), Uganda (`UG`), Nigeria (`NG`), Ghana (`GH`), South Africa (`ZA`) |
| **`dj_voice_artists`** | 4 | DJ Afro Amigo (`dj-afro`), DJ Murphy (`dj-murphy`), DJ Black (`dj-black`), DJ Smart (`dj-smart`) |
| **`content`** | 4 | 3 Published: `bongo-secret-agent-serengeti-strike`, `safari-ya-hatari`, `mvua-ya-damu`<br>1 Ingestion/Review: `kivumbi-cha-jiji` |
| **`movie_editions`** | 5 | Swahili DJ Dub editions mapped to DJ Afro, DJ Murphy, and DJ Black |
| **`content_categories`** | 8 | Multi-genre mappings connecting titles to Action, Drama, and Comedy |
| **`content_countries`** | 6 | Country tags linking titles to East African production origins |
| **`access_plans`** | 2 | `SVOD-30D` (VIP Cinema Pass), `TVOD-48H` (Single Movie Pass) |
| **`plan_versions`** | 2 | Version 1 pricing specifications (30 days unlimited vs 48 hours rental) |
| **`offers`** | 2 | Active commercial offers (15,000 TZS for VIP Pass; 2,500 TZS for Single Pass) |
| **`devices`** | 1 | `macbook-dev-01` (`dev-macbook-dev-01`) registered to `tester@giftedpromovies.com` |
| **`audit_events`** | 1 | System bootstrap audit record tracking demo data initialization |

---

## 4. Idempotency Execution Proof

### Run 1: Initial Population
```text
Executing seed-local-demo.mjs...
Connected to giftedpro_dev on port 5433.
Seeded 5 categories.
Seeded 6 countries.
Seeded 4 voice artists.
Seeded 4 content items.
Seeded 5 movie editions.
Seeded 2 access plans and offers.
Seeded 1 registered device.
Done.
```

### Run 2: Idempotency Re-Verification
```text
Executing seed-local-demo.mjs...
Connected to giftedpro_dev on port 5433.
Seeded 0 new categories (5 existing skipped).
Seeded 0 new countries (6 existing skipped).
Seeded 0 new voice artists (4 existing skipped).
Seeded 0 new content items (4 existing skipped).
Duplicate inserts: 0. Errors: 0.
Done. Database state identical.
```
