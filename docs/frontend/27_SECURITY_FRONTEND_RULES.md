# GIFTEDproMovies — Frontend Security Rules & Security Boundary Specification

**Document ID:** MD-27
**File:** `27_SECURITY_FRONTEND_RULES.md`
**Version:** 1.0
**Status:** Frontend Implementation Contract
**Project:** GIFTEDproMovies

---

## 1. Purpose

This document defines the security rules, boundaries, and implementation requirements for the GIFTEDproMovies frontend.

The purpose is to ensure that:

* sensitive information is not unnecessarily exposed;
* frontend code does not pretend to provide backend-level security;
* role boundaries are reflected correctly in the UI;
* authentication and authorization flows are implemented safely;
* protected media is not treated as public media;
* payment and financial information is handled safely;
* customer data remains isolated;
* future backend integration has a clear security boundary.

This document applies to the frontend only.

---

# 2. Core Security Principle

> **The frontend improves security and user experience, but it is never the final authority for security.**

Anything implemented in the browser can potentially be inspected, modified, bypassed, or replayed by a malicious user.

Therefore:

```text
Frontend Security
      ↓
UX protection + safe rendering + reduced exposure
      ↓
Future Backend
      ↓
Authentication + Authorization + Entitlement + Payment + Data Authority
```

The frontend MUST NOT claim that a client-side check alone prevents unauthorized access.

---

# 3. Security Scope

The frontend security scope includes:

* authentication UI;
* session state;
* role-aware navigation;
* route protection UX;
* safe rendering;
* URL handling;
* browser storage;
* environment variables;
* sensitive information exposure;
* payment UI boundaries;
* protected media UI;
* download UI;
* upload UI;
* customer data isolation;
* error disclosure;
* third-party dependency hygiene;
* security-conscious component architecture.

The following remain backend responsibilities:

* real authentication;
* password verification;
* authorization enforcement;
* entitlement validation;
* payment verification;
* payment callbacks;
* ownership verification;
* device enforcement;
* protected media authorization;
* download authorization;
* subscription validity;
* database security;
* rate limiting;
* fraud prevention;
* server-side file validation;
* DRM implementation;
* secret management.

---

# 4. Never Trust the Browser

The frontend MUST assume that a user can modify:

* JavaScript;
* local storage;
* session storage;
* URL parameters;
* cookies accessible to JavaScript;
* client state;
* mock data;
* request payloads;
* route parameters;
* browser requests.

Therefore:

```text
UI says "allowed"
≠
User is actually authorized
```

The backend MUST independently verify every protected operation in the future.

---

# 5. Authentication Boundary

The current frontend phase uses mock authentication only.

The frontend may simulate:

* login;
* registration;
* logout;
* session state;
* password reset;
* session expiration;
* role-specific sessions.

It MUST NOT implement fake production authentication.

The mock system must clearly remain replaceable by a future authentication service.

Architecture:

```text
Auth UI
   ↓
Auth Controller / Hook
   ↓
Auth Repository
   ↓
Mock Authentication
   ↓
[FUTURE AUTH API]
```

---

# 6. Password Rules

The frontend MUST:

* never display passwords in plain text by default;
* provide password visibility controls where appropriate;
* validate password requirements for UX;
* never log passwords;
* never place passwords in URLs;
* never include passwords in analytics events;
* never store real passwords in mock data;
* never hard-code real credentials.

Mock users should use clearly fake development credentials.

---

# 7. Session Rules

The frontend must support the following conceptual states:

```text
UNKNOWN
AUTHENTICATING
AUTHENTICATED
SESSION_EXPIRED
LOGGED_OUT
```

Session expiration should result in a clear user experience.

Example:

```text
Session expired
      ↓
User returns to Login
      ↓
Original context preserved where safe
      ↓
Successful authentication
      ↓
User returns to intended destination
```

The application MUST NOT silently pretend that an expired session remains valid.

---

# 8. Role Isolation

GIFTEDproMovies has three roles:

```text
ADMIN
MEDIA_TEAM
CUSTOMER
```

Their frontend experiences must remain clearly separated.

### ADMIN

May access:

* administration;
* content management;
* users;
* Media Team;
* subscriptions;
* pricing;
* orders;
* payments;
* sales;
* revenue;
* featured;
* trending;
* system settings.

### MEDIA_TEAM

May access:

* content operations;
* movies;
* series;
* seasons;
* episodes;
* media uploads;
* content metadata.

MUST NOT receive:

* revenue;
* sales;
* payment information;
* sensitive financial analytics;
* customer financial information.

### CUSTOMER

May access:

* discovery;
* movie/series details;
* purchases;
* library;
* downloads;
* streaming;
* subscriptions;
* account.

MUST NOT access:

* Admin;
* Media Team management;
* financial administration;
* other customers' private data.

---

# 9. Client-Side Authorization Is Not Real Authorization

The frontend may hide navigation items based on role.

Example:

```text
ADMIN
  → Admin navigation visible

MEDIA_TEAM
  → Content operations visible

CUSTOMER
  → Customer navigation visible
```

However:

```text
Hidden button
≠
Protected operation
```

A malicious user can manually navigate to a route.

Therefore future backend authorization MUST independently enforce access.

---

# 10. Protected Routes

The frontend should provide route-level protection UX.

Examples:

```text
/admin/*
/media-team/*
/account/*
/library
/purchases
/downloads
/watch/*
/checkout/*
```

Possible frontend outcomes:

```text
Not authenticated
→ /login

Authenticated but wrong role
→ /unauthorized

Authenticated and authorized
→ requested page
```

These checks improve UX but do not replace backend authorization.

---

# 11. Financial Information Boundary

Financial information is highly sensitive.

The frontend MUST follow:

```text
ADMIN
  ↓
Financial information

MEDIA_TEAM
  ↓
No financial information

CUSTOMER
  ↓
Only own relevant purchase/payment information
```

The frontend MUST NOT preload financial datasets for unauthorized roles merely because the UI hides them.

Bad:

```text
Load all sales
Load all revenue
Load all payment records
Then hide them from Media Team
```

Preferred:

```text
Role
 ↓
Required data
 ↓
Only relevant data loaded
```

The future backend must enforce this boundary as well.

---

# 12. Customer Data Isolation

A customer must only see their own:

* library;
* purchases;
* downloads;
* subscription;
* playback progress;
* devices;
* account information.

The frontend mock layer must never accidentally expose another customer's private data through shared mutable state.

Never rely on:

```text
currentUser.id === displayedUser.id
```

as the final security mechanism.

The future backend must authorize ownership independently.

---

# 13. IDOR Protection Principle

The application must assume that a user can modify IDs.

Example:

```text
/orders/order-123
```

A malicious user could attempt:

```text
/orders/order-124
```

The frontend may prevent inappropriate navigation, but the backend must verify ownership.

This principle applies to:

* orders;
* purchases;
* payments;
* downloads;
* devices;
* subscriptions;
* customer profiles;
* admin resources;
* media resources.

> Never assume that possession of an ID means ownership.

---

# 14. Public Slugs vs Internal IDs

Public content pages should use human-readable slugs where appropriate:

```text
/movies/movie-title
/series/series-title
/djs/dj-name
```

Administrative operations may use internal IDs:

```text
/admin/movies/[id]/edit
```

Internal IDs MUST NOT automatically imply authorization.

The future backend must verify:

```text
authenticated user
+
role
+
resource ownership/permission
+
resource state
```

before allowing protected operations.

---

# 15. URL and Query Parameter Safety

Never blindly trust URL values.

Examples:

```text
/search?q=...
/checkout?movie=...
/checkout?returnTo=...
```

The frontend must safely parse and validate expected values.

Unknown or malformed values should produce:

* safe fallback;
* validation error;
* not-found;
* or redirect to a safe location.

Never inject raw URL content into HTML.

---

# 16. Open Redirect Prevention

Authentication flows may preserve a return destination.

Example:

```text
/movie/example
   ↓
Login
   ↓
returnTo=/movie/example
```

The return destination must be validated.

Do not blindly redirect to arbitrary external URLs.

Unsafe concept:

```text
/login?returnTo=https://malicious-site.com
```

Preferred:

```text
Allow internal application routes
Reject unexpected external destinations
```

---

# 17. Safe Rendering

All content must be rendered safely.

Movie descriptions, category names, DJ names, titles, and other content must be treated as data.

Avoid raw HTML rendering unless there is a documented, controlled reason.

The application should prefer:

```tsx
<p>{description}</p>
```

over arbitrary HTML injection.

---

# 18. `dangerouslySetInnerHTML`

`dangerouslySetInnerHTML` MUST NOT be used casually.

Default rule:

> Do not use `dangerouslySetInnerHTML` for normal product content.

If a future requirement genuinely requires trusted HTML:

* the source must be explicitly trusted;
* sanitization must occur before rendering;
* the reason must be documented;
* the component must have clear ownership;
* untrusted customer input must never be inserted directly.

---

# 19. XSS Prevention

Never interpolate untrusted content into:

* HTML;
* script contexts;
* inline JavaScript;
* CSS;
* URLs;
* iframe sources;
* event handler attributes.

React's normal escaped rendering should be preferred.

Never convert arbitrary user input into executable browser code.

---

# 20. Search Security

Search queries are user-controlled input.

The frontend should safely handle:

* quotes;
* special characters;
* very long queries;
* encoded characters;
* unexpected Unicode;
* malformed query parameters.

Search input must not be inserted into HTML or executable contexts.

---

# 21. Browser Storage Rules

Browser storage may be used for low-risk client preferences such as:

* theme;
* recent searches;
* UI preferences;
* non-sensitive temporary state.

Do NOT store in localStorage:

* passwords;
* payment credentials;
* secret API keys;
* private signing keys;
* sensitive financial information;
* protected media tokens;
* long-lived privileged credentials.

Sensitive authentication/session architecture should ultimately use a secure backend-managed mechanism appropriate to the authentication system.

---

# 22. Tokens and Secrets

Never place secrets in frontend source code.

Forbidden examples:

```text
SECRET_KEY
PRIVATE_KEY
DATABASE_PASSWORD
PAYMENT_SECRET
JWT_SIGNING_SECRET
```

A variable being placed in an environment file does not automatically make it secret.

Any variable exposed to browser code must be treated as public.

For Next.js:

```text
NEXT_PUBLIC_*
```

must NEVER contain secrets.

---

# 23. Environment Variables

Environment variables should be separated conceptually:

```text
Public configuration
        ↓
Safe for browser

Private configuration
        ↓
Server/backend only
```

During frontend-only development, do not create unnecessary private-looking variables that have no real backend purpose.

No fake payment secrets.

No fake production credentials.

---

# 24. Payment Security

GIFTEDproMovies uses Tanzania Mobile Money.

The frontend may provide:

* payment method selection;
* amount summary;
* payment instructions;
* payment pending state;
* payment success UI;
* payment failure UI;
* retry UI.

The frontend MUST NOT:

* store payment credentials;
* expose payment provider secrets;
* independently declare a payment successful;
* grant permanent access based only on client state;
* trust a URL parameter saying `payment=success`.

Payment authority belongs to the future backend/payment integration.

---

# 25. Payment Callback Principle

Conceptually:

```text
Customer
   ↓
Payment Provider
   ↓
Backend verification
   ↓
Payment confirmed
   ↓
Order confirmed
   ↓
Entitlement created
   ↓
Frontend displays success
```

Not:

```text
Customer clicks LIPA
   ↓
Frontend says SUCCESS
   ↓
Movie unlocked
```

The second flow is insecure.

---

# 26. Entitlement Security

Whether a customer can:

* stream;
* download;
* access a movie;
* access an episode;
* access a season;
* access subscription content;

must ultimately be determined by backend-authoritative entitlement data.

Frontend state may represent:

```text
ACCESS_GRANTED
ACCESS_DENIED
ACCESS_EXPIRED
PENDING
```

but it must not become the final authority.

---

# 27. Streaming Security

Streaming content must not be treated as ordinary public assets.

The frontend must not expose:

* private storage credentials;
* signing keys;
* secret streaming configuration;
* internal storage infrastructure;
* unnecessary raw media URLs.

Future protected playback may involve:

* authorized media URLs;
* short-lived access;
* protected playback mechanisms;
* encrypted media;
* DRM where appropriate.

The frontend must not falsely claim to provide DRM simply because a video player exists.

---

# 28. Download Security

Download is a protected business capability.

The frontend MUST NOT assume:

```text
Download button
→ permanent MP4 access
```

The future backend must control download eligibility.

Conceptually:

```text
Customer
 ↓
Entitlement check
 ↓
Version ownership check
 ↓
Access duration check
 ↓
Device/session policy
 ↓
Authorized download
```

The frontend should never expose unnecessary raw storage URLs.

---

# 29. Device Access Boundary

GIFTEDproMovies may use controlled device access.

The frontend can display:

* current device;
* authorized devices;
* device limit;
* device management state;
* access denied due to device policy.

However, the frontend cannot enforce the actual device limit by itself.

Future backend enforcement is required.

The exact maximum number of devices remains a business decision and MUST NOT be invented.

---

# 30. DJ/Translator Version Security

A customer purchasing:

```text
Movie A
DJ Mack Version
```

must not automatically gain:

```text
Movie A
DJ Other Version
```

Frontend UI should represent version-specific ownership correctly.

But the backend must verify the entitlement against the specific version.

Conceptually:

```text
Movie
 ├── Version A
 │     └── Entitlement A
 │
 └── Version B
       └── Entitlement B
```

---

# 31. Subscription Security

Subscription access must not be determined only from:

```text
subscription === true
```

Future authorization should consider:

* subscription status;
* start date;
* expiry date;
* plan scope;
* content eligibility;
* stream/download permission;
* version eligibility where applicable.

Frontend should represent these states but not own the final decision.

---

# 32. Individual Purchase Independence

Individual purchases remain separate from subscriptions.

If:

```text
Subscription expires
```

the frontend must not automatically remove content that remains available through an independent valid purchase.

Access must be represented per entitlement.

---

# 33. File Upload Security

Media Team and Admin may upload:

* posters;
* backdrops;
* trailers;
* movie media;
* series media;
* episode media.

Frontend validation should provide a good UX:

* allowed file types;
* size limits;
* file name validation;
* upload state;
* preview;
* progress;
* cancellation;
* failure/retry.

However:

> Frontend file validation is UX validation, not security validation.

The future backend must validate the actual uploaded file.

---

# 34. SVG and Image Uploads

Uploaded SVG content can potentially contain unsafe content if processed incorrectly.

Do not automatically treat arbitrary SVG files as harmless images.

Where possible:

* prefer safe image formats;
* restrict accepted types;
* avoid injecting uploaded SVG markup directly into the DOM;
* sanitize trusted SVG content if SVG is genuinely required.

---

# 35. File Names

Uploaded file names are untrusted data.

The frontend should:

* display them safely;
* avoid using them as executable paths;
* avoid inserting them into HTML;
* avoid constructing unsafe URLs from them.

Future backend/storage systems must normalize and safely handle actual filenames.

---

# 36. Object URLs

Previewing uploaded files may use browser object URLs.

When object URLs are created:

```text
URL.createObjectURL(...)
```

they should be revoked when no longer needed:

```text
URL.revokeObjectURL(...)
```

This prevents unnecessary memory retention.

---

# 37. Third-Party Dependencies

Every dependency increases the application's attack surface.

Before adding a dependency, determine:

* Is it necessary?
* Is there already an existing solution?
* Is it actively maintained?
* Does it introduce unnecessary browser code?
* Does it access sensitive data?
* Does it significantly increase bundle size?

Do not install libraries simply because an AI coding agent recommends them.

---

# 38. Animation and Security

Animations must never control authorization.

Bad:

```text
Animation completes
→ assume payment succeeded
→ unlock content
```

Correct:

```text
Backend-authoritative state
→ UI state changes
→ animation represents the state
```

Motion is presentation, not security.

---

# 39. Error Message Security

Errors must not expose:

* stack traces;
* SQL errors;
* database credentials;
* API keys;
* internal file paths;
* private storage URLs;
* authentication tokens;
* payment credentials;
* internal infrastructure details.

Instead:

```text
Something went wrong.
Please try again.
```

with appropriate actionable information.

---

# 40. Mock Data Security

Mock data must still respect production boundaries.

Do not create mock data that teaches the application to expose:

```text
Customer
→ all users
→ all payments
→ all revenue
```

Instead, mock repositories should return role-appropriate data.

The mock phase should model the correct architecture:

```text
Role
 ↓
Repository
 ↓
Allowed dataset
 ↓
UI
```

---

# 41. No Fake Backend APIs

The frontend phase must not create fake production-looking API routes merely to simulate security.

Forbidden:

```text
/api/payments
/api/users
/api/download
/api/admin/revenue
```

unless explicitly required by a future documented architecture.

Current architecture remains:

```text
UI
 ↓
Controller / Hook
 ↓
Repository
 ↓
Typed Mock Data
 ↓
[FUTURE API]
```

---

# 42. Browser APIs

Browser APIs must be treated carefully.

Examples:

* Clipboard API
* File System APIs
* Fullscreen
* Picture-in-Picture
* Media APIs
* Notifications
* Storage APIs

Only request permissions when necessary.

Do not request broad permissions simply because a browser API exists.

---

# 43. Iframes and Embedded Content

External content must not be embedded blindly.

For future trailers, players, or external services:

* verify the source;
* use appropriate iframe restrictions;
* avoid unnecessary permissions;
* avoid arbitrary user-controlled iframe URLs.

Do not allow arbitrary URLs to become embedded executable content.

---

# 44. HTTPS and Mixed Content

Production GIFTEDproMovies should use HTTPS.

The frontend must avoid loading insecure resources over HTTP from an HTTPS page.

Avoid mixed content such as:

```text
https://giftedpromovies.com
      ↓
http://example.com/video.mp4
```

Future deployment must configure HTTPS and appropriate security headers.

---

# 45. Security Headers

Security headers are primarily a deployment/server responsibility.

Future production configuration should consider appropriate headers such as:

* Content-Security-Policy;
* Strict-Transport-Security;
* X-Content-Type-Options;
* Referrer-Policy;
* frame/embed protections;
* appropriate permissions policy.

The frontend documentation should not pretend these are fully enforced during the mock-only phase.

---

# 46. Content Security Policy

A future CSP should be designed around actual application requirements.

Do not introduce an overly permissive policy such as:

```text
script-src *
```

without justification.

CSP implementation belongs to the deployment/backend layer but should be compatible with frontend architecture.

---

# 47. Clickjacking

Sensitive application pages should be protected against unauthorized framing where appropriate.

Especially important for:

* Admin;
* Media Team;
* checkout;
* account;
* payment-related flows.

This is primarily enforced through deployment/server security headers.

---

# 48. Source Maps and Production Builds

Production builds should not unnecessarily expose sensitive development information through source maps or debugging output.

Never place:

* secrets;
* credentials;
* private infrastructure details;

inside source code assuming source maps will hide them.

They will not.

---

# 49. Clipboard Handling

Clipboard features should only be used when necessary.

Never automatically copy:

* passwords;
* payment credentials;
* secret tokens;
* privileged credentials.

If a user explicitly copies a non-sensitive value, the action should be visible and understandable.

---

# 50. Logging and Telemetry

Frontend logs must never contain:

* passwords;
* authentication tokens;
* payment credentials;
* secret keys;
* private customer information;
* protected media URLs.

Development logging should be removed or appropriately controlled in production.

Analytics events should be privacy-conscious.

---

# 51. PII Minimization

Only collect or display information required by the product.

Do not expose unnecessary customer information in:

* Admin tables;
* Media Team screens;
* search results;
* browser state;
* URLs;
* analytics;
* logs.

Particularly avoid exposing customer information to Media Team.

---

# 52. Checkout and Browser History

Sensitive information should not unnecessarily appear in URLs.

Avoid:

```text
/checkout?cardNumber=...
```

Avoid placing secrets or sensitive credentials in query parameters.

Checkout URLs should contain only the minimum information needed to reconstruct safe UI context.

---

# 53. Optimistic UI Security

Optimistic UI may be used for non-security-critical interactions.

Do NOT use optimistic UI to permanently grant:

* streaming access;
* download access;
* subscription access;
* financial status;
* payment completion.

Example:

```text
Like button
→ optimistic update
```

is acceptable.

But:

```text
LIPA clicked
→ optimistic "Purchased"
→ permanent movie access
```

is not acceptable.

---

# 54. Payment and Entitlement State Machine

The frontend should preserve clear distinctions:

```text
PAYMENT_PENDING
PAYMENT_SUCCESS
PAYMENT_FAILED
PAYMENT_CANCELLED
```

and:

```text
ENTITLEMENT_PENDING
ENTITLEMENT_ACTIVE
ENTITLEMENT_EXPIRED
ENTITLEMENT_REVOKED
```

Never collapse these into:

```text
success = true
```

---

# 55. Security-Aware State Design

Security-sensitive state should be explicit.

Examples:

```text
AUTHENTICATED
UNAUTHENTICATED
SESSION_EXPIRED

ACCESS_GRANTED
ACCESS_DENIED
ACCESS_EXPIRED

PAYMENT_PENDING
PAYMENT_SUCCESS
PAYMENT_FAILED

SUBSCRIPTION_ACTIVE
SUBSCRIPTION_EXPIRED
```

This reduces accidental authorization assumptions.

---

# 56. Protected Media Error Handling

If protected media access fails, do not reveal internal reasons unnecessarily.

Preferred:

> We couldn't authorize playback. Please try again.

Not:

> Storage bucket `gifted-prod-private-media-eu-1` returned token validation error XYZ.

The latter leaks infrastructure information.

---

# 57. Security and Loading States

Loading states must not accidentally reveal private information.

For example, do not preload private customer data before verifying the current account context.

Sensitive content should follow:

```text
Session
 ↓
Authorization context
 ↓
Data request
 ↓
Render
```

where future backend integration requires it.

---

# 58. Security and Error Boundaries

React error boundaries should prevent a single component failure from exposing the application's internal implementation.

User-facing errors should remain safe and actionable.

Development environments may provide richer diagnostics, but production UI should not display internal stack traces.

---

# 59. Security Threat Model

The frontend should consider at least the following threats:

| Threat                 | Frontend Response         | Final Authority            |
| ---------------------- | ------------------------- | -------------------------- |
| XSS                    | Safe rendering            | Backend + browser security |
| Modified URL           | Validate route/query      | Backend                    |
| Fake payment success   | Do not trust client state | Payment backend            |
| Unauthorized download  | Hide/guard UI             | Backend                    |
| Unauthorized streaming | Access-state UI           | Backend                    |
| Role manipulation      | Role-aware UI             | Backend                    |
| IDOR                   | Avoid assuming ownership  | Backend                    |
| Secret exposure        | Never bundle secrets      | Server/deployment          |
| Malicious upload       | UX validation             | Backend                    |
| Account sharing        | Device UI                 | Backend                    |
| Session expiry         | Clear session UX          | Auth system                |
| Data leakage           | Minimize client data      | Backend + frontend         |
| Open redirect          | Validate destinations     | Frontend + backend         |

---

# 60. Common Attack Scenario: Modified Role

User changes browser state from:

```text
CUSTOMER
```

to:

```text
ADMIN
```

Expected frontend behavior:

* UI may appear inconsistent;
* protected pages must not expose real sensitive data;
* future API requests must still be rejected by backend authorization.

Never treat a browser-stored role as authoritative.

---

# 61. Common Attack Scenario: Fake Purchase

User manually changes:

```text
purchased = true
```

Expected:

* UI may temporarily show an altered local state;
* real protected content must still require backend-authoritative entitlement;
* future streaming/download services must reject unauthorized access.

---

# 62. Common Attack Scenario: Modified Price

User changes:

```text
price = 100
```

to:

```text
price = 1
```

The frontend must not be the final pricing authority.

Future checkout/order processing must use server-authoritative pricing.

---

# 63. Common Attack Scenario: Modified Access Duration

User changes:

```text
accessDuration = 30 days
```

to:

```text
accessDuration = 365 days
```

The frontend must not determine the actual entitlement expiration.

Backend must calculate authoritative entitlement duration.

---

# 64. Common Attack Scenario: Different DJ Version

User buys:

```text
DJ Mack
```

then manually attempts to access:

```text
DJ Other
```

The backend must verify version-specific entitlement.

The frontend should represent the correct version relationship but must not assume ownership.

---

# 65. Common Attack Scenario: Customer Accessing Admin URL

Customer manually enters:

```text
/admin
```

Expected UX:

```text
Authorization check
 ↓
Unauthorized
```

But real backend authorization must independently reject administrative operations.

---

# 66. Common Attack Scenario: Media Team Accessing Revenue

Media Team manually navigates to:

```text
/admin/revenue
```

Expected frontend:

```text
Unauthorized
```

Future backend:

```text
403 Forbidden
```

Financial information must never be sent to the Media Team merely because the UI can hide it.

---

# 67. Security and Component Architecture

Security boundaries should be reflected in architecture.

Recommended:

```text
features/
├── auth/
├── commerce/
├── library/
├── player/
├── admin/
└── media-team/
```

Sensitive business logic should not be scattered across random UI components.

Components should consume controlled domain/view models rather than directly manipulating sensitive data sources.

---

# 68. Security and Repository Layer

Protected data access should have a clear boundary:

```text
UI
 ↓
Controller / Hook
 ↓
Repository
 ↓
Typed Data Source
```

Future:

```text
UI
 ↓
Controller / Hook
 ↓
Repository
 ↓
API
 ↓
Backend Authorization
```

This makes security-sensitive data access easier to audit and replace.

---

# 69. Security and Mock Sessions

Mock sessions must support:

```text
ADMIN
MEDIA_TEAM
CUSTOMER
```

and test:

* correct navigation;
* unauthorized navigation;
* role switching;
* session expiration;
* logout;
* customer isolation;
* financial visibility boundaries.

Mock role switching is for development only.

It must never be presented as production authentication.

---

# 70. Security and Responsive Design

Security behavior must remain consistent across:

* desktop;
* laptop;
* tablet;
* mobile.

A mobile layout must not accidentally expose information hidden on desktop.

Example:

```text
Desktop: financial column hidden from Media Team
Mobile: financial column hidden from Media Team
```

Responsive transformation must not change authorization rules.

---

# 71. Security and Accessibility

Security controls must remain accessible.

Examples:

* unauthorized messages must be readable;
* session expiry must be announced appropriately;
* payment errors must be understandable;
* access-denied states must have clear focus;
* destructive security-sensitive actions require accessible confirmation.

Do not rely only on color to communicate security state.

---

# 72. Security and Motion

Security state changes should not depend on animation completion.

Example:

```text
Access denied
 ↓
Immediate state update
 ↓
Optional visual transition
```

not:

```text
Animation completes
 ↓
Access denied becomes true
```

State must always exist independently of motion.

---

# 73. Security and Performance

Security should not become an excuse for unnecessary client-side complexity.

Avoid:

* giant security libraries for simple UI checks;
* repeated authorization computations;
* unnecessary polling;
* unnecessary client-side encryption;
* loading sensitive datasets "just in case."

Prefer clear boundaries.

---

# 74. Future Backend Security Contract

When backend development begins, the frontend must expect the backend to enforce:

```text
Authentication
Authorization
Ownership
Pricing
Payment verification
Entitlement
Subscription status
Device policy
Media authorization
Download authorization
Upload validation
Rate limiting
Audit/security logging
```

The frontend consumes the result.

It does not replace these systems.

---

# 75. Security Documentation Rule

Any future implementation that introduces:

* authentication;
* payment;
* protected media;
* downloads;
* device access;
* customer private data;
* Admin financial data;

must update the relevant documentation before implementation.

Security-sensitive changes must not be silently introduced.

---

# 76. AI Coding Agent Security Rules

The coding agent MUST:

1. Never claim frontend-only authorization is secure.
2. Never invent payment providers or payment security mechanisms.
3. Never add secrets to frontend code.
4. Never expose sensitive mock data unnecessarily.
5. Never create fake production security APIs.
6. Never store passwords or secrets in browser storage.
7. Never trust URL parameters for authorization.
8. Never treat client-side roles as authoritative.
9. Never treat `purchased=true` as proof of ownership.
10. Never treat `subscription=true` as proof of entitlement.
11. Never expose raw protected media URLs unnecessarily.
12. Never implement fake DRM.
13. Never expose financial data to Media Team.
14. Never expose other customers' private data.
15. Never use `dangerouslySetInnerHTML` without documented justification and sanitization.
16. Never introduce arbitrary external redirects.
17. Never expose stack traces or internal infrastructure details to users.
18. Never silently weaken a security boundary to make a feature easier to implement.
19. Never invent unresolved business rules.
20. Ask for clarification when a security-sensitive requirement is ambiguous.

---

# 77. Security QA Checklist

Before considering the frontend complete, verify:

### Authentication

* [ ] Login state works.
* [ ] Logout works.
* [ ] Session expiration is represented.
* [ ] Passwords are never logged.
* [ ] Passwords are not stored insecurely.

### Roles

* [ ] Admin UI is isolated.
* [ ] Media Team UI is isolated.
* [ ] Customer UI is isolated.
* [ ] Media Team has no financial UI.
* [ ] Customer has no administrative UI.

### Data

* [ ] Customer data is isolated.
* [ ] Mock data follows role boundaries.
* [ ] Sensitive data is not unnecessarily loaded.
* [ ] IDs are never treated as ownership proof.

### Payment

* [ ] Payment state is explicit.
* [ ] Pending ≠ success.
* [ ] Frontend does not independently authorize payment.
* [ ] No payment credentials are stored.
* [ ] No payment secrets are bundled.

### Media

* [ ] Streaming access is entitlement-aware.
* [ ] Download access is entitlement-aware.
* [ ] DJ/version ownership is isolated.
* [ ] Raw protected media URLs are not unnecessarily exposed.
* [ ] No fake DRM claims exist.

### Input

* [ ] User content renders safely.
* [ ] URLs are validated.
* [ ] Return URLs are validated.
* [ ] No unsafe HTML injection exists.
* [ ] File uploads have frontend validation.
* [ ] SVG handling is safe.

### Browser

* [ ] No secrets in localStorage.
* [ ] No secrets in sessionStorage.
* [ ] Object URLs are revoked.
* [ ] Browser permissions are requested only when necessary.

### Errors

* [ ] No stack traces in production UI.
* [ ] No credentials in errors.
* [ ] No private storage URLs in errors.
* [ ] No infrastructure details are unnecessarily exposed.

---

# 78. Security Acceptance Criteria

The implementation is acceptable only when:

1. Frontend security boundaries are explicit.
2. Authentication is clearly separated from authorization.
3. Client-side checks are never treated as final authority.
4. Admin financial data is isolated.
5. Media Team cannot access financial UI/data.
6. Customer data is isolated.
7. Payment state is not confused with entitlement.
8. Subscription state is not confused with individual purchase ownership.
9. DJ/version ownership is represented correctly.
10. Protected streaming/download concepts are preserved.
11. No secrets exist in browser code.
12. User-controlled content is rendered safely.
13. URLs and redirects are validated.
14. Error messages do not leak sensitive information.
15. Uploads are treated as untrusted input.
16. Mock architecture remains replaceable by a real API.
17. Security behavior remains consistent across responsive layouts.
18. Accessibility is preserved.
19. Performance is not unnecessarily compromised.
20. No unresolved security-sensitive business rule has been invented.

---

# 79. Definition of Done

MD-27 is considered implemented when:

* security boundaries are reflected in the architecture;
* role isolation is visible in the UI;
* mock sessions support all required roles;
* protected states are represented correctly;
* payment/security boundaries are respected;
* sensitive information is not unnecessarily exposed;
* safe rendering rules are followed;
* browser storage follows the defined rules;
* no secrets are bundled;
* protected media boundaries are preserved;
* upload handling follows the defined principles;
* errors do not leak implementation details;
* security-sensitive state is explicit;
* responsive and accessible behavior remain intact;
* no frontend feature falsely claims backend-level security;
* all future API replacement points remain clear.

---

# 80. Final Security Principle

GIFTEDproMovies should feel secure without pretending that the browser is a trusted environment.

The frontend's responsibility is to:

> **minimize exposure, guide the user safely, represent security state correctly, and maintain clean boundaries.**

The backend's future responsibility is to:

> **enforce authentication, authorization, ownership, payment, entitlement, media access, and all security-critical decisions.**

The architecture must make these responsibilities impossible to confuse.

---

## Dependency

This document depends on:

* `00_PROJECT_RULES.md`
* `01_TECH_STACK.md`
* `02_DESIGN_SYSTEM.md`
* `05_FRONTEND_ARCHITECTURE.md`
* `08_DATA_MODELS.md`
* `09_MOCK_DATA_CONTRACT.md`
* `14_AUTH_UI.md`
* `16_PURCHASE_FLOW.md`
* `17_STREAMING_UI.md`
* `18_DOWNLOAD_UI.md`
* `19_SUBSCRIPTION_UI.md`
* `20_ADMIN_UI.md`
* `21_MEDIA_TEAM_UI.md`
* `26_ERROR_EMPTY_LOADING_STATES.md`

---

## Next Document

**MD-28 — `28_MOCK_API_BOUNDARY.md`**

This will define exactly how the frontend's mock repositories/services are structured so that the future backend/API can replace them without rewriting the UI.
