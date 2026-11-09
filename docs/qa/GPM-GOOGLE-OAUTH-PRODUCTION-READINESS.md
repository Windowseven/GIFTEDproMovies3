# GIFTEDproMovies3 — Google OAuth 2.0 & OIDC Production Readiness Assessment

**Document Reference:** `docs/qa/GPM-GOOGLE-OAUTH-PRODUCTION-READINESS.md`  
**Mission ID:** `GPM-PRE-FRONTEND-REMEDIATION-PROGRAM` (Stage 5)  
**Authority:** Product Owner Directive, ARCH-001, ARCH-003, ADR-030  
**Classification:** Security Audit & External Provider Configuration Guide  
**Status:** COMPLETE TECHNICAL VERIFICATION — EXTERNAL PROVIDER ACTION PENDING HUMAN GATE

---

## 1. Executive Summary

GIFTEDproMovies3 implements customer authentication via **Google Sign-In (OAuth 2.0 / OpenID Connect Core 1.0)** governed by **ADR-030**.

This assessment establishes:
1. **Implementation Security & Architecture:** The backend implementation (`backend/src/modules/identity/services/google-auth.service.ts`) enforces RFC 7636 PKCE, HMAC-SHA256 cryptographically signed state cookies, cryptographic nonces, anti-open-redirect sanitization, dedicated identity mapping (`user_identities`), strict Case C anti-account-takeover separation, and unlinking lockout defense.
2. **Scope Sensitivity & Verification Overhead:** The application requests exclusively **non-sensitive, standard OIDC scopes** (`openid`, `email`, `profile`). Under Google API Services User Data Policy, **these scopes DO NOT require Google Restricted Scope Verification, CASB audits, or Cloud Application Security Assessment (CASA) Tier 2/3 certifications**.
3. **Current Provider Publishing State:** The Google Cloud Platform (GCP) OAuth Consent Screen is currently configured in **Testing Mode**, restricting logins to designated internal test accounts.
4. **Transition to Production (Human Action Required):** Transitioning to **Production Publishing Status** requires domain verification via Google Search Console, public hosting of Privacy Policy and Terms of Service, and an operational human action gate.

---

## 2. Technical Implementation & Security Audit

### 2.1 Cryptographic & Protocol Architecture
| Protocol Component | Implementation Detail | Technical Security Benefit |
| :--- | :--- | :--- |
| **PKCE (RFC 7636)** | `generatePkcePair()` generates 43–128 character `code_verifier` with SHA-256 `code_challenge` (`code_challenge_method=S256`). | Neutralizes authorization code interception attacks on public and web clients. |
| **Signed State Cookie** | State payload (`state`, `codeVerifier`, `nonce`, `returnTo`) serialized with HMAC-SHA256 signature using `gp_oauth_state` cookie. | Eliminates server-side session memory overhead; prevents CSRF and state tampering. |
| **Cryptographic Nonce** | 32-byte cryptographically secure random token sent in authorization request and verified against ID token payload. | Mitigates token replay attacks. |
| **Open Redirect Defense** | `sanitizeRedirectUrl()` validates `returnTo` against `corsOrigins` whitelist and `frontendUrl`. Rejects cross-domain manipulation. | Protects users against phishing redirects after authentication. |
| **Identity Segregation** | Provider subject ID (`sub`) stored in dedicated `user_identities` table (`provider = 'google'`). | Decouples external provider subject identifiers from internal user UUIDs. |
| **Anti-Takeover Boundary (ADR-030 Case C)** | If a user attempts Google login with an email matching an existing password account that is not linked, login is rejected with HTTP 409 `EMAIL_EXISTS_LOCAL_AUTH`. Automatic auto-linking is prohibited. | Eliminates account hijacking via malicious or spoofed third-party email providers. |
| **Unlinking Lockout Defense** | `unlinkAccount()` verifies that `user.passwordHash` exists before allowing removal of the Google identity. | Prevents users from permanently locking themselves out of their account. |

---

## 3. Google OAuth Scope Analysis & Compliance

GIFTEDproMovies requests only the following three scopes:
```text
openid email profile
```

### Verification Requirements Comparison:
- **Restricted Scopes** (e.g. Google Drive, Gmail, Photos, YouTube write): Mandates formal third-party security assessment (CASA Tier 2/3, $5,000–$15,000 audit fee), annual re-verification, and video demonstration.
- **Sensitive Scopes** (e.g. Google Calendar read, Contacts): Requires Google verification video and written justification.
- **Non-Sensitive Scopes (`openid`, `email`, `profile` — GIFTEDproMovies3):**
  - **No CASA assessment required.**
  - **No annual third-party security fee.**
  - **Fast-Track Production Publishing:** Can be published directly in Google Cloud Console once authorized domains and legal URLs are completed.

---

## 4. Production Transition Checklist (Human Action Gate)

Transitioning the Google Cloud Console OAuth configuration from **Testing** to **In Production** requires completion of the following administrative tasks by the Google Cloud Project Owner:

### Phase A: Domain Ownership & Infrastructure (Human Lead: DevOps / Product Owner)
- [ ] **Step 1 (Domain Ownership):** Verify root domain `giftedpromovies.com` in [Google Search Console](https://search.google.com/search-console) using DNS TXT record.
- [ ] **Step 2 (Authorized Domains):** In Google Cloud Console (`APIs & Services > OAuth consent screen`), add authorized top-level domain:
  - `giftedpromovies.com`
- [ ] **Step 3 (Authorized Redirect URIs):** In Google Cloud Console (`APIs & Services > Credentials > OAuth 2.0 Client IDs`), configure exact authorized redirect URIs:
  - Production: `https://api.giftedpromovies.com/api/v1/auth/google/callback`
  - Staging: `https://api-staging.giftedpromovies.com/api/v1/auth/google/callback`
  - Local Dev (Preserved for tests): `http://localhost:3001/api/v1/auth/google/callback`

### Phase B: OAuth Consent Screen Public Assets (Human Lead: Product / Legal)
- [ ] **Step 4 (App Information):**
  - **App name:** `GIFTEDproMovies`
  - **User support email:** `support@giftedpromovies.com`
  - **Developer contact email:** `dev@giftedpromovies.com`
- [ ] **Step 5 (Legal Document Links):** Provide publicly accessible URLs on the authorized domain:
  - **Application home page:** `https://giftedpromovies.com`
  - **Application privacy policy:** `https://giftedpromovies.com/privacy`
  - **Application terms of service:** `https://giftedpromovies.com/terms`
- [ ] **Step 6 (Logo Fast-Path Decision):**
  - *Option 1 (Fast-Path / Zero Delay):* Do not upload a custom application logo during initial launch. Google permits immediate self-service transition to "Production" for non-sensitive scopes when no logo is uploaded.
  - *Option 2 (Brand Review):* Uploading an application logo triggers a manual Google Brand Review (typically takes 2–3 business days for approval).

### Phase C: Publish App to Production
- [ ] **Step 7:** Click **"Publish App"** in Google Cloud Console. Confirm transition from "Testing" to "In Production".
- [ ] **Step 8:** Verify that external Google accounts outside the 100 test-user limit can authenticate without encountering the *"Google hasn't verified this app"* warning screen.

---

## 5. Security Regression Test Evidence

The Google authentication module was executed across comprehensive test suites:
- `backend/tests/google-auth.test.ts`
- `backend/tests/google-auth-http.integration.test.ts`
- `backend/tests/oauth-state.test.ts`

**Test Cases Verified:**
1. Valid OAuth flow with PKCE code exchange and user creation.
2. Existing linked Google identity login and session issuance.
3. Tampered state cookie rejection (HMAC verification failure).
4. Expired state cookie rejection (>15 minutes TTL).
5. Nonce mismatch rejection.
6. Open-redirect attack rejection (`returnTo` manipulation).
7. Case C anti-takeover conflict rejection (unlinked email collision).
8. Lockout defense on unlinking (prevents unlinking if user has no password).

---

## 6. Acceptance Status
- **Backend Architecture & Code:** **100% COMPLETE & PRODUCTION-READY**
- **Test Verification:** **PASSING (0 Regressions)**
- **Production Console Status:** **PENDING HUMAN GATE (Google Cloud Console Publishing)**
- **Frontend Impact:** **NON-BLOCKING FOR FRONTEND INTEGRATION**. The frontend integrates with the standard backend endpoints (`GET /api/v1/auth/google`, `GET /api/v1/auth/google/callback`, `POST /api/v1/auth/google/link`, `DELETE /api/v1/auth/google/unlink`).
