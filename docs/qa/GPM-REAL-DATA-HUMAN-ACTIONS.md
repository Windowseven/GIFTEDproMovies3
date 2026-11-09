# GIFTEDproMovies3 — REAL DATA HUMAN ACTIONS & OPERATIONAL RUNBOOK
**Mission ID:** `GPM-REAL-DATA-INTEGRATION-AND-SEEDING`  
**Document ID:** `GPM-REAL-DATA-HUMAN-ACTIONS`  
**Status:** COMPLETE & VERIFIED  
**Date:** 2026-11-08  
**Environment:** Local Development (`giftedpro_dev`)  

---

## 1. Quick Start & Operational Instructions

To run and verify the GIFTEDproMovies3 local development environment:

### Step 1: Ensure Local PostgreSQL Cluster is Running
The persistent local development database cluster runs on port `5433`:
```bash
/Library/PostgreSQL/18/bin/pg_ctl -D backend/.pg_test_cluster -o "-p 5433" -l backend/.pg_test_cluster/server.log status
```
If not running:
```bash
/Library/PostgreSQL/18/bin/pg_ctl -D backend/.pg_test_cluster -o "-p 5433" -l backend/.pg_test_cluster/server.log start
```

### Step 2: Start the Backend Server (Port 8001)
In a dedicated terminal:
```bash
pnpm --dir backend start:dev
```
The NestJS/Fastify backend binds to `http://localhost:8001`.

### Step 3: Start the Next.js Frontend Server (Port 3000)
In a dedicated terminal:
```bash
pnpm dev
```
Open `http://localhost:3000` in your web browser.

---

## 2. Authentic Test Credentials

| Persona | Email | Password | Role | Permissions |
| :--- | :--- | :--- | :--- | :--- |
| **Admin** | `admin@giftedpromovies.com` | `Windowseven77.` | `admin` | Full system access, audit logs, pricing plans |
| **Media Team** | `media@giftedpromovies.com` | `Windowseven77.` | `media_team` | Studio catalog ingestion, DJ dubbing tracks, taxonomies |
| **Customer** | `tester@giftedpromovies.com` | `Windowseven77.` | `customer` | Catalog discovery, VIP passes, device management |

---

## 3. Maintenance & Re-Seeding Runbook

The local database can be re-seeded at any time safely and idempotently:
```bash
node backend/scripts/seed-local-demo.mjs
```
The script will refuse execution if `APP_ENV` is not `development`, if the connected database is not `giftedpro_dev`, or if the port is not `5433`.

---

## 4. Invariant Protection Notice

Never perform schema alterations, generate migration `0014`, or alter protected specification hashes:
- ARCH-19: `12ed1bc50c1e9b141ead7269dc0257f99043cbe4e6302414b94efa9f5693f5bd`
- Migration 0013: `7a9f6db7ac14bed20fe291d1d69a88e27652ae6c624f253a8e0ac2c0e52dcf9f`
