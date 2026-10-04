# 31. Google Authentication Integration Guide

## 1. Overview & Architectural Principles

GIFTEDproMovies backend implements Google Sign-In using server-side **OAuth 2.0 / OpenID Connect (OIDC) Authorization Code Flow with PKCE (`S256`)**.

### Fundamental Rules
1. **Google is solely an external Identity Provider (IdP).** The GIFTEDproMovies database is the single authority for user identity (`users.id`), role (`customer`, `media_team`, `admin`), capabilities, session management, and audit logging.
2. **Immutable Subject Identifier:** Accounts are mapped using Google's immutable `sub` claim in the `user_identities` table, NEVER mutable email strings.
3. **HTTP-Only Cookies:** Tokens (`id_token`, `access_token`, `refresh_token`, session secrets) are never exposed to JavaScript or client-side storage (`localStorage`/`sessionStorage`).
4. **Anti-Account Takeover Defense (Case C):** If a user attempts Google login with an email that already exists via password registration, the backend **does not** auto-link. It redirects to `/auth/login?error=account_exists_link_required`. The user must authenticate with their password first, then link Google from Account Settings.
5. **Lockout Defense on Unlink:** OAuth-only users without a set password cannot unlink their Google account (`400 Bad Request`).

---

## 2. API Contracts & Flow

### Flow 1: Initiating Google Sign-In
To start Google login or registration, the frontend simply navigates the browser or triggers a full-page redirect to:

```http
GET /api/v1/auth/google?returnTo=/catalog
```

* **Query Parameters:**
  * `returnTo` *(optional)*: A safe relative path (e.g. `/catalog`, `/account`) or trusted frontend origin to redirect after successful authentication. If omitted, invalid, or an external origin, the backend safely defaults to `${FRONTEND_URL}`.
* **Backend Processing:**
  * Generates cryptographically secure `state`, `nonce`, and PKCE `code_verifier` / `code_challenge`.
  * Sets an encrypted, HMAC-signed, single-use, `HttpOnly` cookie: `gp_oauth_state` (`Max-Age=600s`, `SameSite=Lax`, `Path=/api/v1/auth/google`).
  * Issues HTTP `302 Found` redirecting the browser to Google's OAuth 2.0 consent screen.

---

### Flow 2: Google Callback & Session Issuance
After the user grants consent, Google redirects the browser back to:

```http
GET /api/v1/auth/google/callback?code=<AUTH_CODE>&state=<STATE>
```

* **Backend Processing:**
  * Verifies and immediately clears the single-use `gp_oauth_state` cookie.
  * Exchanges `code` and PKCE `code_verifier` with Google's token endpoint over TLS.
  * Validates ID token cryptographic signature, `iss`, `aud`, `exp`, `sub`, `email_verified`, and `nonce`.
  * **Case A (Existing Linked Google User):** Validates account status (`active` allowed; `suspended` / `deactivated` blocked). Updates last login timestamp and audits event.
  * **Case B (New User):** Atomically creates new user (`role: 'customer'`, `status: 'active'`, `emailVerifiedAt: NOW()`) and links `user_identities` in a single transaction.
  * **Case C (Existing Password User with Same Email):** Rejects auto-linking to prevent account takeover. Redirects with error.
  * **Case D (Staff Member):** Preserves existing `media_team` or `admin` role and capabilities with zero role modification.
  * Sets standard `HttpOnly` session cookie (`gifted_session`).
  * Issues HTTP `302 Found` redirect to the validated `returnTo` destination (or error page).

---

## 3. Redirect Error Handling

When an error occurs during OAuth, the backend redirects the browser to:

```http
${FRONTEND_URL}/auth/login?error=<ERROR_CODE>
```

The frontend `/auth/login` page must check `router.query.error` (or `useSearchParams()`) and display the corresponding user-friendly alert:

| Error Code | User Message | Recommended Action |
| :--- | :--- | :--- |
| `account_exists_link_required` | "An account with this email already exists. Please sign in with your email and password, then link your Google account in Account Settings." | Focus email/password login form and highlight security tip. |
| `account_suspended` | "Your account has been suspended. Please contact customer support for assistance." | Show support contact link. |
| `account_deactivated` | "This account is deactivated. Please contact support to reactivate your account." | Show support contact link. |
| `email_not_verified` | "Your Google account email address is not verified by Google. Please verify your email with Google and try again." | Instruct user to verify email on Google. |
| `invalid_state` | "The sign-in request expired or could not be verified. Please try again." | Provide a "Try Again" button linking to `/api/v1/auth/google`. |
| `oauth_error` | "Sign in with Google was cancelled or encountered an error. Please try again." | Provide a "Try Again" button. |

---

## 4. Account Linking & Unlinking (Settings / Security)

Authenticated users can manage their linked Google identity from Account Settings (`/account/security`).

### Linking Google to an Existing Account
```http
POST /api/v1/auth/google/link
Content-Type: application/json
Cookie: gifted_session=...

{
  "code": "<AUTH_CODE_FROM_POPUP_OR_FLOW>",
  "state": "<STATE>"
}
```

* **Success (200 OK):**
  ```json
  {
    "message": "Google account linked successfully",
    "provider": "google",
    "providerEmail": "user@gmail.com"
  }
  ```
* **Failure (409 Conflict):** If this Google account is already linked to another user.

### Unlinking Google from an Account
```http
DELETE /api/v1/auth/google/unlink
Cookie: gifted_session=...
```

* **Success (200 OK):**
  ```json
  {
    "message": "Google account unlinked successfully"
  }
  ```
* **Lockout Prevention (400 Bad Request):**
  If the user has `passwordHash: null` (i.e. registered via Google and never set a local password), unlinking is strictly blocked:
  ```json
  {
    "success": false,
    "error": {
      "code": "BAD_REQUEST",
      "message": "The request is invalid."
    }
  }
  ```
  **Frontend Requirement:** Before displaying the "Unlink" button, check `user.hasPassword`. If `hasPassword === false`, disable the unlink button and display a message: *"You must set a password before unlinking your Google account to avoid losing access."*

---

## 5. Frontend UI Implementation Checklist

- [ ] **Login & Register Pages:**
  - Add "Continue with Google" button with official Google branding.
  - Clicking navigates to `${NEXT_PUBLIC_API_URL}/api/v1/auth/google?returnTo=${encodeURIComponent(destination)}`.
- [ ] **Error Handling:**
  - Inspect `error` URL parameter on `/auth/login` and render appropriate alert banners as specified in Section 3.
- [ ] **Hydrating User State:**
  - After successful redirect, call `GET /api/v1/auth/me` to hydrate user profile, role, and capabilities.
- [ ] **Security Settings Page (`/account/security`):**
  - Display "Linked Accounts" card showing Google status (`Linked` / `Not Linked`).
  - Show "Link Google" button if unlinked.
  - Show "Unlink Google" button if linked, disabled if user does not have a local password set.
