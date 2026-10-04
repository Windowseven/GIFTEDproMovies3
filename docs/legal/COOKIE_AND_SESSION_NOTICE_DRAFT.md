# Cookie & Session Notice — GIFTEDproMovies

> **DOCUMENT STATUS:** `DRAFT — PENDING BUSINESS OWNER AND LEGAL REVIEW`  
> **LAST UPDATED:** October 2026  
> **INTENDED PUBLIC ROUTE:** `/cookies` (or linked directly within `/privacy`)  
> **DISCLAIMER:** This document describes the precise technical implementation of cookies, session identifiers, and client storage mechanisms in the GIFTEDproMovies application. It does not constitute formal legal advice.

---

## 1. What Are Cookies & Session Identifiers?

Cookies are small data files placed on your computer, smartphone, or other Internet-connected device when you visit websites. They are widely used to make websites work properly, provide secure authentication, and remember preferences.

At **GIFTEDproMovies**, we prioritize user security and data privacy. We adhere to **Architectural Decision ADR-006 (Server-controlled HttpOnly Cookie Authentication)**: we use cookies strictly for secure session management and fraud prevention, and we **do not** use invasive third-party cross-site advertising tracking cookies.

---

## 2. Cookies Used by GIFTEDproMovies

The following table details every cookie used by our backend authentication and security infrastructure:

| Cookie Name | Category | Provider | Purpose | Duration | Security Attributes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`gifted_session`** | Strictly Necessary | First-Party (`giftedpromovies.com`) | Authenticates your active user session. Holds a 256-bit cryptographically secure session token hash so you remain securely logged in across pages. | 30 days (subject to a 14-day inactivity timeout) | `HttpOnly: true`<br>`Secure: true` (production)<br>`SameSite: Lax`<br>`Path: /` |
| **`gp_oauth_state`** | Strictly Necessary / Security | First-Party (`giftedpromovies.com`) | Secures the Google OAuth 2.0 / OpenID Connect authorization code flow. Stores HMAC-SHA256 signed state, nonce, and PKCE verification parameters to prevent Cross-Site Request Forgery (CSRF). | 10 minutes maximum (destroyed immediately upon callback) | `HttpOnly: true`<br>`Secure: true` (production)<br>`SameSite: Lax`<br>`Path: /api/v1/auth/google` |

### Key Technical Safeguards:
1. **`HttpOnly` Invariant:** Both cookies are marked `HttpOnly: true`. This prevents client-side JavaScript from accessing cookie values, completely eliminating the risk of token theft via Cross-Site Scripting (XSS).
2. **`Secure` in Production:** In production environments, cookies are served strictly over encrypted HTTPS connections (`Secure: true`).
3. **`SameSite=Lax`:** Protects against Cross-Site Request Forgery (CSRF) by preventing the browser from sending authentication cookies during cross-site sub-resource requests, while permitting legitimate top-level navigations (such as redirecting back from Google Sign-In).
4. **Single-Use Ephemeral OAuth Cookie:** The `gp_oauth_state` cookie is strictly single-use. The moment Google completes the callback exchange, the server explicitly issues a deletion command (`Max-Age=0`) to erase the cookie from your browser.

---

## 3. Client-Side Browser Storage (`localStorage`)

In addition to HTTP-only cookies, web applications may utilize browser storage (`localStorage` and `sessionStorage`):

* **What We Store in `localStorage`:**
  * Non-sensitive user interface preferences (such as light/dark mode theme preferences, volume level, or recent search history).
* **What We NEVER Store in `localStorage`:**
  * We **never** store passwords, session tokens, Google access/ID tokens, or billing credentials in client-side browser storage. This strict security boundary prevents credential harvesting by malicious browser extensions or scripts.

---

## 4. Third-Party Analytics & Advertising Trackers

* **Current Implementation:** GIFTEDproMovies backend **does not** set third-party marketing, ad-retargeting, or cross-site tracking cookies (such as Facebook Pixel or Google AdSense).
* **Third-Party Providers:** When interacting with Google Sign-In, Google may process information according to their standard OAuth protocol in accordance with [Google's Privacy Policy](https://policies.google.com/privacy).

---

## 5. How You Can Manage or Disable Cookies

You have the right to decide whether to accept or reject cookies. Most web browsers automatically accept cookies, but you can modify your browser settings to decline or delete cookies:

* **Chrome:** Settings > Privacy and Security > Third-party cookies
* **Firefox:** Preferences > Privacy & Security > Cookies and Site Data
* **Safari:** Preferences > Privacy > Block all cookies
* **Edge:** Settings > Cookies and site permissions

> **IMPORTANT WARNING:** The `gifted_session` and `gp_oauth_state` cookies are **strictly necessary** for the basic operation of the Platform. If you configure your browser to block all cookies, you will not be able to log in, access your purchased library, or use the Services.

---

## 6. Updates to this Notice

We may periodically revise this Cookie & Session Notice to reflect changes in technical implementation, security enhancements, or legal standards. Revisions will be indicated by the "Last Updated" date at the top of this page.

---

## 7. Contact Us

If you have questions regarding our use of cookies or session security:
* **Email:** `privacy@giftedpromovies.com`
