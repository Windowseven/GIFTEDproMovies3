# GIFTEDproMovies3 — Local Test Account Readiness Report

**Mission ID:** `GPM-LOCAL-ENVIRONMENT-AND-TEST-ACCOUNT-RECOVERY`  
**Execution Lead:** Antigravity  
**Authority:** Product Owner  
**Date:** November 2026  
**Status:** COMPLETE PROVISIONING & VERIFICATION  
**Target Database:** `giftedpro_dev`  
**Security Posture:** Passwords Redacted in Git-Tracked Reports — Stored in `backend/.local-test-credentials.json` (chmod 0600)  

---

# 1. PROVISIONING SUMMARY

In compliance with the Product Owner's mandate, three distinct local development accounts were provisioned in the persistent development database `giftedpro_dev`.

All accounts were created using the backend's standard cryptographic password hasher ([`PasswordHasherService`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/backend/src/modules/identity/services/password-hasher.service.ts)):
- **Algorithm:** `argon2id`
- **Memory Cost:** `65536` (64 MB)
- **Time Cost:** `3` iterations
- **Parallelism:** `4` threads

Plaintext passwords have been excluded from this report to prevent credential exposure in Git history. The credentials have been written to a gitignored local file:
`backend/.local-test-credentials.json` (POSIX permissions: `-rw-------`, `0600`).

---

# 2. PROVISIONED ACCOUNT LEDGER

| Account Persona | Email Address | Role | Account Status | Email Verified | Database UUID | Capabilities Assigned |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Customer** | `tester@giftedpromovies.com` | `customer` | `active` | `VERIFIED` | `ce1ba52b-751d-4cb7-ba9f-3c02c9e14156` | None (Standard customer rights) |
| **Media Team** | `media@giftedpromovies.com` | `media_team` | `active` | `VERIFIED` | `1dc8cea0-8506-4d49-a866-15f77f6c9bb6` | `MEDIA_PREVIEW`, `CONTENT_UPLOAD`, `CONTENT_CREATE`, `CONTENT_EDIT` |
| **Admin** | `admin@giftedpromovies.com` | `admin` | `active` | `VERIFIED` | `589cebbf-bf12-4c72-8458-0c7695ec1bb6` | Full platform administrative rights |

---

# 3. DATABASE VERIFICATION EVIDENCE

A direct query to `giftedpro_dev` verified the accounts in PostgreSQL:
```sql
SELECT id, email, role, status, email_verified_at FROM users;
```

### Result:
```
                  id                  |           email            |    role    | status |       email_verified_at       
--------------------------------------+----------------------------+------------+--------+-------------------------------
 ce1ba52b-751d-4cb7-ba9f-3c02c9e14156 | tester@giftedpromovies.com | customer   | active | 2026-11-06 13:52:09.732762+03
 1dc8cea0-8506-4d49-a866-15f77f6c9bb6 | media@giftedpromovies.com  | media_team | active | 2026-11-06 13:52:09.889965+03
 589cebbf-bf12-4c72-8458-0c7695ec1bb6 | admin@giftedpromovies.com  | admin      | active | 2026-11-06 13:52:10.098849+03
```

### Assigned Capabilities Verification:
```sql
SELECT u.email, uc.capability 
FROM user_capabilities uc 
JOIN users u ON u.id = uc.user_id;
```

```
           email           |   capability   
---------------------------+----------------
 media@giftedpromovies.com | MEDIA_PREVIEW
 media@giftedpromovies.com | CONTENT_UPLOAD
 media@giftedpromovies.com | CONTENT_CREATE
 media@giftedpromovies.com | CONTENT_EDIT
```

---

# 4. CREDENTIAL ACCESS FOR PRODUCT OWNER

The Product Owner can retrieve the actual generated credentials locally at any time by reading:
```bash
cat backend/.local-test-credentials.json
```

Or by re-running the automated provisioning script if a credential rotation is desired:
```bash
node backend/scripts/provision-local-accounts.mjs
```
