# GIFTEDproMovies

## Authentication Experience & Account Access Flow

**Document ID:** MD-14
**File:** `docs/14_AUTH_UI.md`
**Version:** 1.0
**Status:** Frontend Specification
**Product:** GIFTEDproMovies
**Scope:** Frontend only

---

## 1. Purpose

This document defines the complete authentication experience for GIFTEDproMovies.

Authentication must feel like part of the cinematic product experience rather than a generic SaaS login screen.

The authentication system must support:

* Customer login
* Customer registration
* Forgot password
* Password reset
* Logout
* Authenticated account state
* Role-aware navigation
* Protected-action authentication
* Return-to-context behavior
* Unauthorized state
* Mock authentication for frontend development

This document does **not** implement real authentication infrastructure.

---

# 2. Authentication Philosophy

Authentication should happen when it provides value.

GIFTEDproMovies must **not force users to create an account before browsing**.

Guests should be able to:

* Browse movies
* Browse series
* Search
* Filter
* View movie details
* View series details
* View categories
* View countries
* Browse DJs/Translators
* See prices
* View trailers where available

Authentication becomes necessary when the user attempts an account-dependent action.

Examples:

```text
WATCH
DOWNLOAD
LIPA
SUBSCRIBE
OPEN LIBRARY
ACCOUNT
```

The goal is:

> Discover first. Authenticate when access becomes meaningful.

---

# 3. Authentication Routes

The frontend must support:

```text
/login
/register
/forgot-password
/reset-password
/unauthorized
```

Additional authenticated areas are defined by the route architecture document.

Authentication screens must not introduce undocumented authentication methods.

---

# 4. Supported Account Method

The confirmed customer account method is:

```text
Email + Password
```

The frontend must support:

* Email
* Password
* Password confirmation during registration

Do not invent:

* Phone-number login
* OTP login
* Google login
* Facebook login
* Apple login
* Social authentication
* Magic links
* Passkeys

These may only be introduced through a future approved product decision.

---

# 5. Login Experience

Route:

```text
/login
```

## 5.1 Login Screen Structure

Recommended composition:

```text
┌─────────────────────────────────────┐
│         GIFTEDproMovies         │
│                                     │
│        Welcome back                 │
│   Continue your movie experience    │
│                                     │
│   Email                             │
│   [________________________]        │
│                                     │
│   Password                          │
│   [______________________ 👁]       │
│                                     │
│   Forgot password?                  │
│                                     │
│   [        LOGIN        ]           │
│                                     │
│   Don't have an account? Register   │
│                                     │
└─────────────────────────────────────┘
```

The final visual design must follow:

* MD-02
* MD-03
* MD-04
* MD-05

The screen should feel cinematic, premium and minimal.

---

# 6. Login Fields

Required fields:

### Email

Input type:

```text
email
```

Requirements:

* Clear label
* Appropriate placeholder
* Browser/autocomplete support
* Invalid email state
* Required state
* Loading state
* Error state

### Password

Input type:

```text
password
```

Requirements:

* Hidden by default
* Visibility toggle
* Clear label
* Required validation
* Error state
* Loading state

The visibility toggle must not shift surrounding layout.

---

# 7. Password Visibility

Password fields should provide a visibility control.

States:

```text
Hidden
Visible
```

Example:

```text
••••••••••  👁
```

After activation:

```text
MyPassword  ◉
```

The control must:

* Be keyboard accessible
* Have an accessible label
* Not submit the form
* Preserve entered value
* Avoid layout shift

---

# 8. Login Validation

Frontend validation should catch obvious invalid input before submission.

Examples:

```text
Email is required.
Enter a valid email address.
Password is required.
```

Validation should be:

* Clear
* Short
* Human-readable
* Positioned close to the affected field

Avoid technical messages such as:

```text
ERR_AUTH_401
INVALID_CREDENTIAL_EXCEPTION
JWT_VALIDATION_FAILURE
```

Those belong to internal implementation, not customer-facing UI.

---

# 9. Login Loading State

When login is being submitted:

* Disable duplicate submission
* Keep entered values
* Show meaningful loading feedback
* Prevent accidental multiple requests
* Preserve page context

Example:

```text
[ Signing in... ]
```

Do not replace the entire screen with a generic spinner.

---

# 10. Login Failure

Incorrect credentials must produce a clear generic authentication failure.

Example:

```text
Email or password is incorrect.
Please check your details and try again.
```

The frontend must not expose sensitive implementation details.

Do not reveal whether an email address exists in the system unless that behavior is explicitly approved later.

---

# 11. Registration Experience

Route:

```text
/register
```

Purpose:

Allow a new customer to create an account.

Recommended structure:

```text
GIFTEDproMovies

Create your account
Start watching and managing your movies.

Email
[________________________]

Password
[________________________]

Confirm password
[________________________]

[ CREATE ACCOUNT ]

Already have an account?
Login
```

---

# 12. Registration Fields

Required:

```text
Email
Password
Confirm Password
```

No additional registration fields should be invented without a product requirement.

---

# 13. Registration Validation

The frontend must validate:

### Email

```text
Required
Valid email format
```

### Password

The UI should communicate password requirements clearly.

For example:

```text
Use a strong password that is difficult to guess.
```

If a concrete password policy is later provided, the UI must reflect that exact policy.

Do not invent arbitrary password requirements such as:

```text
Exactly 12 characters
Exactly one symbol
Exactly two numbers
```

unless the backend/product specification confirms them.

### Confirm Password

Must match the entered password.

Example:

```text
Passwords do not match.
```

---

# 14. Registration Success

After successful registration, the frontend should transition into the authenticated customer experience according to the future authentication contract.

The exact backend/session behavior is intentionally not implemented in this frontend phase.

The UI must nevertheless support the following conceptual state:

```text
Registration
     ↓
Account created
     ↓
Authenticated customer state
     ↓
Continue to intended destination
```

---

# 15. Forgot Password

Route:

```text
/forgot-password
```

Purpose:

Allow a customer who cannot remember their password to begin password recovery.

Structure:

```text
Forgot your password?

Enter your email and we'll help you reset your password.

Email
[________________________]

[ CONTINUE ]

Back to Login
```

The frontend must represent:

* Initial state
* Validation state
* Loading state
* Success state
* Error state

---

# 16. Forgot Password Success

After submitting a valid email format, the UI should provide a clear next-step message.

Example:

```text
Check your email

If an account is associated with this email,
follow the instructions to reset your password.
```

Do not expose sensitive account-existence information.

---

# 17. Reset Password

Route:

```text
/reset-password
```

The frontend must support:

```text
New password
Confirm new password
```

Possible states:

```text
Valid reset state
Invalid reset state
Expired reset state
Submitting
Success
Failure
```

---

# 18. Invalid or Expired Reset Token

The frontend must support a dedicated state for an invalid or expired reset context.

Example:

```text
This password reset link is no longer valid.

Please request a new password reset link.
```

CTA:

```text
Request new reset link
```

The frontend may represent this through mock state.

It must not pretend to validate real reset tokens.

---

# 19. Password Reset Success

After a successful mock reset:

```text
Password updated

Your password has been updated successfully.
You can now sign in with your new password.
```

CTA:

```text
LOGIN
```

---

# 20. Protected Action Authentication

Authentication must integrate naturally with the customer journey.

When a guest attempts:

```text
WATCH
DOWNLOAD
LIPA
SUBSCRIBE
```

the application should detect that authentication is required.

Preferred behavior:

```text
Guest
  ↓
Attempts protected action
  ↓
Authentication UI
  ↓
Login/Register
  ↓
Return to original context
  ↓
Continue intended action
```

---

# 21. Context Preservation

Context preservation is mandatory.

Example:

User is viewing:

```text
/movies/the-dark-knight
```

They click:

```text
DOWNLOAD
```

They are sent to:

```text
/login
```

After successful authentication, they should return to the relevant movie/action context rather than being unnecessarily dropped onto the homepage.

Conceptually:

```text
/movie
   ↓
DOWNLOAD
   ↓
LOGIN
   ↓
AUTH SUCCESS
   ↓
DOWNLOAD / CHECKOUT CONTEXT
```

The exact implementation mechanism may use route/query state or another approved frontend pattern.

---

# 22. Watch Authentication

Guest:

```text
Movie Details
      ↓
WATCH
      ↓
Login/Register
```

Authenticated customer:

```text
Movie Details
      ↓
WATCH
      ↓
Entitlement / access check
      ↓
Player or purchase flow
```

The frontend must not claim that the user owns content merely because they are authenticated.

Authentication and entitlement are separate concepts.

---

# 23. Download Authentication

Guest:

```text
Movie Details
      ↓
DOWNLOAD
      ↓
Login/Register
```

Authenticated customer:

```text
DOWNLOAD
   ↓
Access state
   ↓
Download flow
```

The frontend must never imply that login alone grants download rights.

---

# 24. LIPA Authentication

If a guest selects:

```text
LIPA
```

the authentication flow should preserve:

* Movie
* Series
* Episode
* Selected version
* Selected access type
* Selected purchase option
* Intended checkout context

Example:

```text
Movie
 ↓
DJ Mack version
 ↓
DOWNLOAD
 ↓
LIPA
 ↓
LOGIN
 ↓
CHECKOUT
```

The user should not have to rebuild the entire purchase selection after logging in.

---

# 25. Subscription Authentication

Guest:

```text
SUBSCRIBE
   ↓
LOGIN / REGISTER
   ↓
Return to subscription flow
```

The selected subscription context should remain available after authentication.

---

# 26. Authentication Modal vs Full Page

Authentication may be triggered through:

* Dedicated route
* Contextual modal
* Bottom sheet on mobile

However, the application must maintain one consistent authentication experience.

Do not build completely different login systems for:

```text
Movie page
Checkout
Subscription
Player
```

They should reuse the same authentication components and logic.

---

# 27. Authenticated Header

After authentication, the global header should reflect the user's signed-in state.

Conceptually:

```text
GIFTEDproMovies

Home
Movies
Series
Search

                 Account ▾
```

The account menu may contain:

```text
My Library
Purchases
Downloads
Subscription
Account
Logout
```

Only options appropriate to the current role may appear.

---

# 28. Customer Account Navigation

Customer navigation must include relevant authenticated destinations.

Possible destinations:

```text
Account
Library
Purchases
Downloads
Subscription
Logout
```

The UI must follow the established route map.

Do not create duplicate account systems.

---

# 29. Role-Aware Authentication

The system recognizes three roles:

```text
ADMIN
MEDIA_TEAM
CUSTOMER
```

Authentication establishes identity.

Authorization determines what that identity may access.

These concepts must remain separate.

---

# 30. CUSTOMER UI

Customer accounts may access:

```text
Library
Purchases
Downloads
Subscription
Account
Customer content experiences
```

Customers must not see:

```text
Admin dashboard
Sales
Revenue
Payments management
Media Team management
System administration
```

---

# 31. MEDIA TEAM UI

Media Team accounts may access content-management experiences assigned to the Media Team.

They may work with:

```text
Movies
Series
Seasons
Episodes
Posters
Descriptions
Categories
Countries
DJs/Translators
```

They must not see:

```text
Revenue
Sales
Payment records
Financial analytics
Sensitive financial information
```

---

# 32. ADMIN UI

Admin accounts may access administrative experiences.

Examples:

```text
Dashboard
Movies
Series
Categories
Countries
DJs/Translators
Users
Media Team
Subscriptions
Pricing
Orders
Payments
Sales
Featured
Trending
Settings
```

Financial information is Admin-only.

---

# 33. Unauthorized Experience

Route:

```text
/unauthorized
```

Purpose:

Handle authenticated users attempting to access a route outside their permitted role.

Example:

```text
Access restricted

You don't have permission to access this area.
```

CTA:

```text
GO TO MY ACCOUNT
```

or an appropriate destination based on role.

The frontend must not expose sensitive route details.

---

# 34. Frontend Route Protection

Frontend route protection should exist as a UX/navigation layer.

Conceptually:

```text
Route
 ↓
Session state
 ↓
Role
 ↓
Allowed?
 ├── YES → Render
 └── NO  → Unauthorized / Login
```

However:

> Frontend route protection is not a security authority.

Real authorization must eventually be enforced by the backend.

---

# 35. Mock Authentication Architecture

During frontend development, authentication must use mock state.

Recommended boundary:

```text
Authentication UI
        ↓
Auth Controller / Hook
        ↓
Auth Repository
        ↓
Mock Session / Mock User
```

Future:

```text
Authentication UI
        ↓
Auth Controller / Hook
        ↓
Auth Repository
        ↓
Real Authentication API
```

The UI should not need to be rewritten when the real authentication service is introduced.

---

# 36. Mock Session

Mock authentication should support at minimum:

```text
Unauthenticated
Authenticated Customer
Authenticated Media Team
Authenticated Admin
```

It should also support useful UI states such as:

```text
Authentication loading
Authentication failure
Session expired
Unauthorized
```

---

# 37. Mock Credentials

Mock credentials may be used for development.

However:

**Never store realistic production passwords in the mock dataset.**

Do not present mock credentials as real accounts.

Development-only authentication behavior must be clearly isolated from production code.

---

# 38. Logout

Logout must be accessible through the authenticated account menu.

Conceptual flow:

```text
Account
 ↓
Logout
 ↓
Session cleared
 ↓
Public experience
```

The UI should provide appropriate feedback where necessary.

After logout:

* Customer-only navigation disappears
* Account-specific content is no longer presented
* Protected actions require authentication again

---

# 39. Session Expiration

The frontend must support a mock session-expired state.

Example:

```text
Your session has expired.

Please sign in again to continue.
```

CTA:

```text
LOGIN
```

If the user was in a meaningful flow, the original context should be preserved where appropriate.

---

# 40. Authentication State Model

The frontend should conceptually distinguish:

```text
AUTH_LOADING
AUTHENTICATED
UNAUTHENTICATED
AUTH_ERROR
SESSION_EXPIRED
UNAUTHORIZED
```

Avoid scattering independent boolean states such as:

```text
isLoggedIn
isLoading
hasError
isAdmin
isCustomer
```

across unrelated components when a centralized typed authentication state can represent the experience more safely.

---

# 41. Mobile Authentication UX

Mobile authentication must be designed intentionally.

Requirements:

* Full-width form controls
* Comfortable touch targets
* Clear field labels
* Visible password toggle
* Keyboard-friendly layout
* No horizontal overflow
* CTA accessible without excessive scrolling
* Proper spacing around form fields
* Appropriate viewport behavior

The experience must work on small Android devices as well as larger phones.

---

# 42. Desktop Authentication UX

Desktop layouts may use a cinematic composition.

Possible structure:

```text
┌───────────────────────────────────────────────────────┐
│                                                       │
│     Cinematic Visual       Authentication Panel       │
│                                                       │
│                          Email                        │
│                          Password                     │
│                          Login                        │
│                                                       │
└───────────────────────────────────────────────────────┘
```

The visual should support the authentication experience without distracting from the form.

Do not turn authentication into a marketing landing page.

---

# 43. Authentication Visual Language

Authentication should inherit the GIFTEDproMovies design system:

```text
Background:      #08090C
Surface:         #111318
Elevated:        #181A21
Crimson:         #B11226
Gold:            #D6A84F
Primary Text:    #F5F5F5
Secondary Text:  #A6A8B0
Muted:           #70737C
Border:          #262932
```

Crimson should communicate primary actions.

Gold should remain a premium accent.

Do not create a separate authentication color system.

---

# 44. Authentication Motion

Authentication follows MD-05.

Recommended motion:

### Form entrance

Subtle:

```text
opacity
+
small vertical movement
```

### Validation

Use restrained field-level feedback.

### Submit

Button transitions:

```text
idle
 ↓
loading
 ↓
success / error
```

### Page transition

Use subtle cinematic transition.

Avoid:

* excessive bouncing
* dramatic form movement
* unnecessary particle effects
* constant background animation

---

# 45. Reduced Motion

When:

```text
prefers-reduced-motion: reduce
```

the interface must reduce or remove non-essential animation.

Authentication functionality must remain fully usable.

---

# 46. Accessibility

Authentication is a critical accessibility surface.

Requirements:

* Semantic form elements
* Proper labels
* Keyboard navigation
* Visible focus states
* Accessible password toggle
* Screen-reader-friendly validation
* Appropriate autocomplete attributes
* Error messages associated with fields
* Sufficient contrast
* No color-only error communication
* Touch-friendly controls

Focus management must be handled intentionally after:

* validation errors
* modal authentication
* route transitions
* authentication success/failure where applicable

---

# 47. Password UX Security Principles

Frontend implementation must follow basic security hygiene.

Never:

* Display passwords by default
* Log passwords
* Put passwords in URLs
* Store passwords in mock analytics
* Expose passwords through debug UI
* Hard-code real credentials
* Claim frontend validation provides security

Password validation improves UX.

It does not replace server-side security.

---

# 48. Sensitive Data Boundary

The frontend must never expose:

* Payment credentials
* Authentication secrets
* Private tokens
* Server secrets
* Password databases
* Administrative credentials

Environment variables containing secrets must never be exposed through public client-side variables.

---

# 49. Authentication and Payments

Authentication and payment are related but separate concerns.

Correct conceptual flow:

```text
Authentication
      ↓
Identity established
      ↓
Purchase context
      ↓
Checkout
      ↓
Payment
      ↓
Entitlement
```

Do not implement payment logic inside authentication components.

---

# 50. Authentication and Entitlements

Being logged in does not mean the customer owns every movie.

The frontend must distinguish:

```text
Authenticated
```

from:

```text
Has Access
```

Example:

```text
LOGIN SUCCESS
      ↓
Movie details
      ↓
Check access state
      ├── Has access → WATCH
      └── No access  → Purchase options
```

Actual entitlement authority will belong to the future backend.

---

# 51. Return-to Behavior

Every protected action should preserve meaningful user intent.

Examples:

```text
/movie/action
/series/episode/action
/subscriptions/action
/checkout/action
```

After authentication, the user should continue from the appropriate point.

The system must avoid unnecessary loops such as:

```text
Login
 → Homepage
 → Movie
 → Download
 → Login
```

---

# 52. Browser Back/Forward Behavior

Authentication navigation must respect browser history.

Examples:

```text
Movie
 ↓
Login
 ↓
Back
 ↓
Movie
```

The application must not create confusing redirect loops.

---

# 53. Deep Linking

Authenticated routes may be opened directly.

The frontend must support conceptual states such as:

```text
Direct protected route + authenticated
Direct protected route + unauthenticated
Direct protected route + wrong role
```

Expected behavior:

```text
Authenticated + allowed
→ render destination

Unauthenticated
→ login
→ return to destination

Authenticated + unauthorized
→ /unauthorized
```

---

# 54. SEO

Authentication pages are not primary discovery pages.

They should not compete with public movie/series pages for search visibility.

The implementation should use appropriate metadata and indexing strategy when the final deployment configuration is created.

Public content remains the primary SEO surface.

---

# 55. Component Architecture

Authentication should reuse the shared design system.

Suggested structure:

```text
features/
└── auth/
    ├── components/
    │   ├── LoginForm.tsx
    │   ├── RegisterForm.tsx
    │   ├── ForgotPasswordForm.tsx
    │   ├── ResetPasswordForm.tsx
    │   ├── PasswordField.tsx
    │   ├── AuthShell.tsx
    │   └── AuthFeedback.tsx
    │
    ├── hooks/
    │   └── useAuth.ts
    │
    ├── services/
    │   └── authRepository.ts
    │
    └── types/
        └── auth.types.ts
```

Exact structure may follow the broader architecture if a better consistent arrangement is established.

---

# 56. Shared Authentication Components

The same components should power:

```text
Login route
Register route
Protected-action modal
Checkout authentication
Subscription authentication
```

Do not duplicate:

```text
LoginForm
PasswordField
Validation
AuthFeedback
```

for every feature.

---

# 57. Authentication UI State Ownership

Authentication state should have clear ownership.

Example:

```text
Auth Repository
      ↓
Auth Controller / Hook
      ↓
Auth UI
```

Forms own temporary input state.

Global authentication state owns session identity.

Page routing owns navigation context.

Do not allow random components to mutate global authentication state directly.

---

# 58. No Backend in This Phase

This document does not authorize implementation of:

* Authentication API
* Database users
* Password hashing
* JWT infrastructure
* Refresh tokens
* Email delivery
* Password-reset email service
* OAuth
* Session database
* Server-side authorization

Those belong to the future backend phase.

---

# 59. No Fake Security

The frontend must never claim:

```text
Your account is securely protected by...
```

unless the actual underlying infrastructure exists.

Mock authentication is for UI development.

It must not be presented as production security.

---

# 60. Error State Architecture

Authentication must handle:

```text
Validation error
Authentication failure
Registration failure
Reset failure
Session expiry
Unauthorized access
Unexpected error
```

Errors must be:

* Human-readable
* Recoverable where possible
* Visually clear
* Non-technical

---

# 61. Loading State Architecture

Loading states must exist for:

```text
Login
Registration
Forgot password
Reset password
Session initialization
Logout
```

Buttons should prevent duplicate submission.

The rest of the interface should remain stable where possible.

---

# 62. Empty State

Authentication forms normally do not require empty states.

However, account-related authenticated surfaces may use empty states defined by later customer-library/account documents.

Do not invent empty-state behavior unnecessarily inside authentication.

---

# 63. Authentication Flow Summary

### Guest browsing

```text
HOME
 ↓
MOVIE
 ↓
BROWSE
```

No authentication required.

### Guest Watch

```text
MOVIE
 ↓
WATCH
 ↓
LOGIN / REGISTER
 ↓
RETURN
 ↓
ACCESS CHECK
```

### Guest Download

```text
MOVIE
 ↓
DOWNLOAD
 ↓
LOGIN / REGISTER
 ↓
RETURN
 ↓
PURCHASE / ACCESS
```

### Guest Purchase

```text
MOVIE
 ↓
VERSION
 ↓
WATCH / DOWNLOAD
 ↓
LIPA
 ↓
LOGIN / REGISTER
 ↓
CHECKOUT
```

### Existing customer

```text
LOGIN
 ↓
CUSTOMER EXPERIENCE
 ↓
LIBRARY / WATCH / DOWNLOAD / ACCOUNT
```

### Media Team

```text
LOGIN
 ↓
MEDIA TEAM EXPERIENCE
 ↓
CONTENT MANAGEMENT
```

### Admin

```text
LOGIN
 ↓
ADMIN EXPERIENCE
 ↓
FULL ADMINISTRATION
```

---

# 64. Authentication State Matrix

| State      | Public Content | Customer Area         | Media Team       | Admin          |
| ---------- | -------------- | --------------------- | ---------------- | -------------- |
| Guest      | Allowed        | Login required        | Login required   | Login required |
| Customer   | Allowed        | Allowed               | Blocked          | Blocked        |
| Media Team | Allowed        | Not customer-specific | Allowed          | Blocked        |
| Admin      | Allowed        | Admin-controlled      | Admin-controlled | Allowed        |

This table defines frontend visibility expectations only.

Backend authorization remains authoritative.

---

# 65. Anti-Patterns

The implementation must NOT:

* Force login before browsing
* Create phone authentication
* Add social login without approval
* Duplicate login forms
* Store real passwords
* Put passwords in URLs
* Expose secrets
* Treat frontend role checks as security
* Automatically redirect every login to homepage
* Lose the user's original purchase context
* Mix payment logic into authentication
* Mix entitlement logic into login
* Create separate authentication designs per feature
* Build an unnecessarily complicated auth flow

---

# 66. Quality Bar

Authentication is successful when:

* It feels native to GIFTEDproMovies
* Login is fast and clear
* Registration is simple
* Password handling is intuitive
* Errors are understandable
* Protected actions preserve context
* Customer, Media Team and Admin experiences are visually separated
* Mobile UX is excellent
* Keyboard navigation works
* Motion is restrained
* No fake backend exists
* Components are reusable
* Future authentication integration will not require redesigning the UI

---

# 67. Acceptance Criteria

The frontend implementation is accepted only when:

### Login

* [ ] `/login` exists
* [ ] Email field exists
* [ ] Password field exists
* [ ] Password visibility toggle works
* [ ] Validation exists
* [ ] Loading state exists
* [ ] Failure state exists

### Registration

* [ ] `/register` exists
* [ ] Email field exists
* [ ] Password field exists
* [ ] Confirm password field exists
* [ ] Validation exists
* [ ] Loading state exists
* [ ] Success state exists

### Password Recovery

* [ ] `/forgot-password` exists
* [ ] Email validation exists
* [ ] Loading state exists
* [ ] Success state exists
* [ ] `/reset-password` exists
* [ ] New password field exists
* [ ] Confirm password field exists
* [ ] Invalid/expired reset state exists
* [ ] Success state exists

### Protected Actions

* [ ] WATCH can trigger authentication
* [ ] DOWNLOAD can trigger authentication
* [ ] LIPA can trigger authentication
* [ ] SUBSCRIBE can trigger authentication
* [ ] Original context is preserved

### Session

* [ ] Mock authenticated state exists
* [ ] Mock unauthenticated state exists
* [ ] Customer role exists
* [ ] Media Team role exists
* [ ] Admin role exists
* [ ] Logout exists
* [ ] Session-expired state exists

### Authorization UX

* [ ] Unauthorized page exists
* [ ] Role-aware navigation exists
* [ ] Financial UI is hidden from Customer and Media Team
* [ ] Admin UI is not exposed to Customer
* [ ] Media Team UI is not exposed to Customer

### UX

* [ ] Responsive
* [ ] Accessible
* [ ] Keyboard usable
* [ ] Mobile friendly
* [ ] Motion follows MD-05
* [ ] No authentication duplication
* [ ] No backend implementation
* [ ] No real credentials
* [ ] No fake security claims

---

# 68. AI Coding Agent Directive

An AI coding agent implementing this document MUST:

1. Read MD-01 through MD-14 before implementation.
2. Treat all previous documents as binding.
3. Use email + password as the confirmed account method.
4. Never invent authentication methods.
5. Never add social login without explicit approval.
6. Never implement a backend.
7. Never create a fake production authentication API.
8. Use typed mock authentication.
9. Preserve protected-action context.
10. Reuse authentication components.
11. Respect role boundaries.
12. Never expose financial UI to unauthorized roles.
13. Never store real passwords.
14. Never claim frontend authorization is security.
15. Follow the established design system.
16. Follow the established motion system.
17. Support mobile and desktop.
18. Respect accessibility requirements.
19. Do not silently change authentication behavior.
20. If a requirement is missing or contradictory, stop and ask for clarification rather than inventing a product decision.

---

# 69. Definition of Done

MD-14 is considered implemented when the authentication experience provides a complete, coherent frontend journey:

```text
PUBLIC EXPERIENCE
       ↓
PROTECTED ACTION
       ↓
AUTHENTICATION
       ↓
CONTEXT RESTORATION
       ↓
ROLE-AWARE EXPERIENCE
       ↓
ACCESS / PURCHASE / CONTENT FLOW
```

The experience must feel like one product rather than a collection of unrelated forms.

---

# 70. Next Document

Next:

```text
MD-15
15_CUSTOMER_LIBRARY.md
```

The next document defines the authenticated customer's personal content experience, including:

* My Library
* Purchased content
* Active access
* Expired access
* Continue Watching
* Recently Viewed
* Downloads
* Subscription access
* Movie/series progress
* Customer account content states
* Empty library
* Access expiry presentation
* Library filtering and organization
* Mobile and desktop library UX
* Personalized discovery
* Customer-side content ownership presentation
* Frontend-only mock data boundaries

**End of MD-14**
