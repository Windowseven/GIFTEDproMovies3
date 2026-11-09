# GIFTEDproMovies3 — Local Environment Human Actions & Operator Manual

**Mission ID:** `GPM-LOCAL-ENVIRONMENT-AND-TEST-ACCOUNT-RECOVERY`  
**Execution Lead:** Antigravity  
**Authority:** Product Owner  
**Date:** November 2026  
**Status:** COMPLETE OPERATOR MANUAL & ACTIONS REGISTER  
**Environment:** Local Development Only  

---

# 1. EXECUTIVE OPERATOR SUMMARY

This manual provides developers and the Product Owner with standard operating procedures for starting, developing, testing, and managing the recovered local GIFTEDproMovies3 environment.

---

# 2. STANDARD DAILY LOCAL STARTUP PROCEDURE

To run the full-stack application locally, start the three components in order:

### Step 1: Start the Local PostgreSQL 18 Cluster (Port 5433)
If the PostgreSQL cluster is not already active:
```bash
/Library/PostgreSQL/18/bin/pg_ctl -D backend/.pg_test_cluster -o "-p 5433" -l backend/.pg_test_cluster/server.log start
```
*To verify cluster status: `/Library/PostgreSQL/18/bin/pg_ctl -D backend/.pg_test_cluster status`*

### Step 2: Start the Backend Service (Port 8001)
In a dedicated terminal window:
```bash
# From repository root:
pnpm --dir backend start:dev

# Or from backend directory:
cd backend && pnpm start:dev
```
*The backend binds to `http://127.0.0.1:8001` and connects to `giftedpro_dev`.*

### Step 3: Start the Next.js Frontend (Port 3000)
In a separate terminal window:
```bash
# From repository root:
pnpm dev
```
*Next.js starts on `http://localhost:3000` and automatically proxies `/api/v1/*` requests to `http://127.0.0.1:8001`.*

---

# 3. TEST ACCOUNT CREDENTIAL ACCESS & ROTATION

Three authentic local accounts are provisioned in `giftedpro_dev`.

### 3.1 Viewing Local Credentials
Passwords are saved in a local gitignored file with restricted permissions (`0600`):
```bash
cat backend/.local-test-credentials.json
```

### 3.2 Automated Credential Rotation
If credentials need to be regenerated or updated:
```bash
node backend/scripts/provision-local-accounts.mjs
```
*This script regenerates fresh cryptographic passwords, computes new Argon2id hashes, updates `users` and `user_capabilities` in `giftedpro_dev`, and updates `backend/.local-test-credentials.json`.*

### 3.3 Running Automated Authentication Verification
To execute the automated authentication and authorization test suite against the running backend:
```bash
node backend/scripts/verify-local-auth.mjs
```

---

# 4. RUNNING AUTOMATED UNIT & INTEGRATION TESTS SAFELY

The test harness in `backend/scripts/run-tests.mjs` targets the disposable test database `giftedpro_phase1_test`:
```bash
# Run all backend unit and database tests:
pnpm --dir backend test

# Or run non-database unit tests quickly:
node backend/scripts/run-tests.mjs rate-limiting.test.js password-hasher.test.js outbox-crypto.test.js
```
*Safety Guarantee: The test runner strictly verifies `identity.rows[0]?.database_name === "giftedpro_phase1_test"` and refuses to execute destructive resets against `giftedpro_dev`.*

---

# 5. OPTIONAL DEVELOPMENT HELPER ACTIVATION

If developers wish to display the local customer test helper on the login form:
1. Create `.env.local` in the project root (gitignored).
2. Add:
   ```env
   NEXT_PUBLIC_ENABLE_DEV_LOGIN_CARDS=true
   ```
3. Restart `pnpm dev`.
*Note: In production builds, this feature is completely stripped by dead-code elimination.*

---

# 6. ARCHITECTURAL INVARIANT RECORD

All frozen architectural invariants remain strictly verified and untouched:
- **ARCH-19 Domain Setup (`docs/architecture/19_DOMAIN SETUP AND CONFIGURATION`):**  
  `12ed1bc50c1e9b141ead7269dc0257f99043cbe4e6302414b94efa9f5693f5bd` — **VERIFIED MATCH**
- **Migration 0013 (`backend/drizzle/migrations/0013_phase6_7_supersession_and_downloads.sql`):**  
  `7a9f6db7ac14bed20fe291d1d69a88e27652ae6c624f253a8e0ac2c0e52dcf9f` — **VERIFIED MATCH**
- **Migrations Ledger:** Exactly 14 migrations (`0000` to `0013`); Migration 0014 was not created.
- **Git Operations:** Read-only posture respected; zero unauthorized git commits or pushes.
