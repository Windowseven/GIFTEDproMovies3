# GIFTEDproMovies3 — Test Account Readiness & Authentication Audit

**Mission ID:** `GPM-FRONTEND-INTEGRATION-REALITY-AND-UI-ALIGNMENT`  
**Execution Lead:** Antigravity  
**Authority:** Product Owner  
**Reference Document:** [`docs/frontend/UI-FIXES-AND-ALIGNMENT.md`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/docs/frontend/UI-FIXES-AND-ALIGNMENT.md)  
**Date:** November 2026  
**Status:** AUTHENTICATION VERIFICATION & STAGING TEST ACCOUNT SPECIFICATION  

---

# 1. AUTHENTICATION INTEGRITY & FLOW VERIFICATION

The platform's authentication subsystem was audited across all customer and staff entry points:

### 1.1 Password Security & Session Discovery
- **Hashing:** Argon2id with strict parameters (memoryCost: 64MB, timeCost: 3 iterations, parallelism: 4 threads).
- **Session Tokens:** 32-byte cryptographically secure random tokens hashed via SHA-256 for database lookup, stored in `HttpOnly`, `SameSite=Lax`, `Secure` cookie named `gifted_session`.
- **Session Discovery:** On mount, [`AuthContext.tsx`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/context/AuthContext.tsx) calls `GET /api/v1/auth/me`. If unauthenticated (401), it sets `status = 'UNAUTHENTICATED'` and `user = null` without error loops.
- **Session Invalidation:** `POST /api/v1/auth/logout` revokes the current session record in PostgreSQL and clears the client cookie. `POST /api/v1/auth/logout-all` revokes all active sessions for the user.

### 1.2 Google OAuth Architecture
- **Protocol:** OpenID Connect (OIDC) with RFC 7636 PKCE (code_challenge = SHA256(code_verifier)).
- **State Security:** Cryptographically signed and encrypted state cookie (`gp_oauth_state`) with 10-minute TTL, binding the CSRF token, code_verifier, and `returnTo` destination.
- **Backend Flow:**
  1. `GET /api/v1/auth/google?returnTo=...` sets `gp_oauth_state` cookie and redirects (302) to Google Accounts.
  2. `GET /api/v1/auth/google/callback` validates PKCE and state signature, retrieves user claims (email, name, sub), discovers or creates user with role `customer`, issues `gifted_session` cookie, and redirects to destination.
- **Frontend Implementation:** A dedicated [`GoogleAuthButton`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/src/components/auth/GoogleAuthButton.tsx) component is deployed on Login and Register surfaces, linking to `/api/v1/auth/google`, formatted according to Google Identity Branding rules, and rendering the approved scope disclaimer:
  > *"We only receive your name and verified email address."*

---

# 2. STAGING TEST ACCOUNT READINESS & PROVISIONING

### 2.1 Role-Specific Test Personas

To enable verifiable end-to-end testing across customer and staff workflows, the following three test personas are designated for Staging / UAT:

| Persona Role | Designated Email Identifier | Target Capabilities & Access Scope | Staging Provisioning Method |
| :--- | :--- | :--- | :--- |
| **Customer** | `tester@giftedpromovies.com` | Customer catalog, mobile money checkout, Cloudflare R2 downloads, registered device management, library. | Direct registration via `POST /api/v1/auth/register` + email token verification. |
| **Media Team** | `media@giftedpromovies.com` | Media Team Studio (`/media-team`), asset uploads, QC review, DJ edition audio tagging. | Admin capability grant via `AccountService.updateUserRole(adminId, userId, 'media_team')`. |
| **Platform Admin** | `admin@giftedpromovies.com` | Full platform governance (`/admin`), commercial pricing, plan management, financial reconciliation, audit logs. | CLI bootstrap via [`backend/scripts/bootstrap-admin.mjs`](file:///Users/furahamogela/Desktop/WINDOWSEVEN/GIFTEDproMovies3/backend/scripts/bootstrap-admin.mjs). |

### 2.2 Security Invariants for Test Accounts & Quick Login Cards
1. **No Production Hardcoded Secrets:** Passwords must never be bundled into client-side production JavaScript.
2. **Environment Isolation:** Quick Login Cards are strictly governed by `NEXT_PUBLIC_ENABLE_STAGING_DEMO_CARDS=true` or non-production environment (`process.env.NODE_ENV !== 'production'`).
3. **No Authentication Bypass:** Quick Login Cards in the UI populate form inputs to assist human testers; they **never bypass** the server-side `POST /api/v1/auth/login` verification, rate limiter, or Argon2id password hash verification.

### 2.3 Staging Account Provisioning Procedure (For SRE / Operators)

When initializing a fresh staging database, execute the following CLI commands:

```bash
# 1. Bootstrap Platform Admin Account
export DATABASE_URL="postgresql://..."
node backend/scripts/bootstrap-admin.mjs \
  --email="admin@giftedpromovies.com" \
  --password="<SECURE_STAGING_ADMIN_PASSWORD>"

# 2. Register Media Team & Customer Accounts
# Execute via API or node CLI script, then promote Media Team:
node -e '
const pg = require("pg");
const argon2 = require("argon2");
async function main() {
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const hash = await argon2.hash(process.env.STAGING_USER_PASSWORD, { type: argon2.argon2id });
  await pool.query(
    "INSERT INTO users (email, password_hash, role, status, email_verified_at) VALUES " +
    "(\x27media@giftedpromovies.com\x27, $1, \x27media_team\x27, \x27active\x27, now()), " +
    "(\x27tester@giftedpromovies.com\x27, $1, \x27customer\x27, \x27active\x27, now()) " +
    "ON CONFLICT (email) DO UPDATE SET password_hash = $1, status = \x27active\x27, updated_at = now();",
    [hash]
  );
  await pool.end();
}
main();
'
```

---

# 3. VERIFICATION CHECKLIST

- [x] Password complexity enforced (8+ chars, uppercase, lowercase, digit).
- [x] Zero plain-text credentials in Git history.
- [x] Google OAuth PKCE and CSRF cookies signed and validated.
- [x] Email verification required before account activation.
- [x] Rate limiting active on all authentication endpoints.
