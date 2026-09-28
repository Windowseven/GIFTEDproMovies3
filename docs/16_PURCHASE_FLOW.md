# GIFTEDproMovies — Purchase & Checkout Experience Flow

**Document ID:** MD-16
**File:** `16_PURCHASE_FLOW.md`
**Version:** 1.0
**Status:** Frontend Specification
**Scope:** Frontend only
**Product:** GIFTEDproMovies

---

## 1. Purpose

This document defines the complete customer purchase and checkout experience for GIFTEDproMovies.

The checkout experience must make purchasing content:

* Clear
* Fast
* Trustworthy
* Mobile-friendly
* Visually premium
* Transparent about pricing and access
* Resistant to accidental duplicate actions
* Consistent with the cinematic identity of the platform

This document covers the **frontend experience only**.

It does not implement:

* Payment gateway APIs
* Mobile money APIs
* Backend order creation
* Backend payment verification
* Database persistence
* Real entitlement activation
* Real transaction processing

The frontend must instead use typed mock repositories and clearly defined boundaries that can later be connected to the backend.

---

# 2. Purchase Philosophy

GIFTEDproMovies must never make the customer wonder:

> “What exactly am I buying?”

Before payment, the customer must understand:

1. What content they selected
2. Which version/DJ they selected
3. Whether they are buying Watch/Stream or Download access
4. How much they will pay
5. How long the access lasts
6. Whether the purchase is individual or subscription-based
7. What happens after successful payment

The checkout experience should feel like a **premium media-commerce experience**, not a generic payment form.

---

# 3. Purchase Routes

The primary purchase routes are:

```text
/checkout
/checkout/success
/checkout/failed
```

### `/checkout`

Handles the purchase review and payment initiation experience.

### `/checkout/success`

Displays successful purchase confirmation and next actions.

### `/checkout/failed`

Displays unsuccessful, cancelled, or interrupted payment states and recovery actions.

---

# 4. Purchase Entry Points

Customers may enter the purchase flow from:

```text
Movie Details
    ↓
Version Selection
    ↓
Watch / Download / LIPA
    ↓
Checkout
```

For series:

```text
Series Details
    ↓
Episode / Season / Series Selection
    ↓
Pricing Option
    ↓
Watch / Download / LIPA
    ↓
Checkout
```

Other possible entry points include:

* Library
* Search results
* Trending
* Featured
* Popular
* Category pages
* Country pages
* DJ/Translator pages
* Subscription page

The purchase context must remain intact regardless of where the customer started.

---

# 5. Purchase Context

Before entering checkout, the frontend must know the selected purchase context.

Conceptually:

```text
PurchaseContext
├── content
│   ├── contentId
│   ├── contentType
│   └── title
│
├── version
│   ├── versionId
│   ├── djTranslator
│   └── versionName
│
├── accessType
│   ├── STREAM
│   └── DOWNLOAD
│
├── pricing
│   ├── amount
│   └── currency
│
└── accessDuration
    ├── value
    └── unit
```

The frontend must not reconstruct this information randomly inside the checkout page.

The checkout page should consume a defined purchase context.

---

# 6. Watch vs Download

For purchasable movies, the customer may have two distinct purchase options:

### Watch / Stream

Provides streaming access.

### Download

Provides download access.

These are separate commercial entitlements.

Example:

```text
Movie: The Example Movie
Version: DJ Mack

WATCH
TZS 2,000
Access: 7 Days

DOWNLOAD
TZS 3,500
Access: 7 Days
```

The exact prices and durations are controlled by the Admin.

The frontend must never hard-code business pricing.

---

# 7. Version-Specific Purchase

A movie may contain multiple DJ/Translator versions.

Example:

```text
The Example Movie

DJ Mack
DJ John
DJ Peter
```

Each version may represent a separate purchasable media version.

If the customer selects:

```text
DJ Mack
```

the checkout must clearly show:

```text
Version: DJ Mack
```

Purchasing DJ Mack must not visually imply ownership of:

* DJ John
* DJ Peter
* Other versions

Version ownership is isolated.

---

# 8. Checkout Screen Structure

The recommended desktop structure is:

```text
┌─────────────────────────────────────────────────────────────┐
│ GIFTEDproMovies                         Secure Checkout │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Purchase                                                  │
│                                                             │
│  ┌──────────────────────┐    ┌───────────────────────────┐ │
│  │                      │    │ Order Summary             │ │
│  │      POSTER          │    │                           │ │
│  │                      │    │ The Example Movie         │ │
│  │                      │    │ DJ Mack                   │ │
│  │                      │    │ Download                  │ │
│  │                      │    │                           │ │
│  │                      │    │ Price       TZS 3,500     │ │
│  │                      │    │ Access      7 Days        │ │
│  │                      │    │                           │ │
│  │                      │    │ TOTAL       TZS 3,500     │ │
│  │                      │    │                           │ │
│  └──────────────────────┘    │ [ LIPA ]                  │ │
│                              └───────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

Mobile should transform into a vertical flow:

```text
← Back

Purchase

[ Poster ]

The Example Movie
DJ Mack
Download

────────────────────

Price
TZS 3,500

Access
7 Days

────────────────────

Payment Method

[ Mobile Money ]

────────────────────

TOTAL
TZS 3,500

[ LIPA ]
```

---

# 9. Checkout Information Hierarchy

The customer should encounter information in this order:

1. Content identity
2. Version identity
3. Purchase type
4. Access duration
5. Price
6. Payment method
7. Total
8. LIPA action

Do not hide important commercial information behind expandable controls.

---

# 10. Order Summary

The order summary should contain:

* Poster
* Content title
* Content type
* DJ/Translator/version
* Purchase type
* Unit price
* Access duration
* Total

Example:

```text
The Example Movie

DJ Mack
Download Access

TZS 3,500

Access duration
7 Days

────────────────
Total
TZS 3,500
```

If taxes, fees, discounts, or other charges are introduced later, they must be explicitly represented.

The frontend must not invent additional charges.

---

# 11. Pricing Transparency

The customer must never see:

```text
Pay now
```

without understanding the amount.

The final payable amount must be clearly visible before the LIPA action.

Recommended hierarchy:

```text
TOTAL

TZS 3,500

[ LIPA ]
```

The LIPA button should be the strongest action on the checkout screen.

---

# 12. Access Duration

Access duration must be displayed whenever applicable.

Examples:

```text
Access: 3 Days
```

```text
Access: 7 Days
```

```text
Access: 30 Days
```

The frontend must not assume a universal duration.

Admin controls the configured duration.

The checkout UI should display the value provided by the purchase data.

---

# 13. Authentication Requirement

Customers may browse the platform without authentication.

However, completing a purchase requires an authenticated customer account.

Therefore:

```text
Guest
 ↓
Select content
 ↓
Select version
 ↓
Select Watch/Download
 ↓
Checkout
 ↓
Login/Register
 ↓
Return to Checkout
```

The customer should not lose the selected purchase context.

---

# 14. Guest → Login Flow

If an unauthenticated customer attempts checkout:

```text
Checkout
   ↓
Authentication Required
   ↓
Login / Register
   ↓
Successful authentication
   ↓
Return to Checkout
```

The system should preserve:

* Content
* Version
* Access type
* Pricing selection
* Intended purchase context

The customer should not have to restart the purchase manually.

---

# 15. Login vs Register

The authentication UI should provide:

```text
Already have an account?

[ Login ]

New to GIFTEDproMovies?

[ Create Account ]
```

Both routes must return the customer to the original checkout context after successful authentication.

Authentication details are defined in:

`14_AUTH_UI.md`

---

# 16. Payment Method

The platform is intended to support:

**Tanzania Mobile Money**

The final list of payment providers is not yet locked.

Therefore, the frontend must not permanently assume a specific provider list.

Possible providers may include services such as:

* M-Pesa
* Airtel Money
* Tigo Pesa → Mixx by Yas
* HaloPesa

However, these are **examples only** until the business confirms the final supported providers.

The UI should therefore be designed so payment providers can be added or removed without redesigning checkout.

---

# 17. Payment Method UI

Conceptually:

```text
Payment Method

┌───────────────────────┐
│ Mobile Money          │
│ Pay using mobile money│
└───────────────────────┘
```

If multiple providers are enabled:

```text
Choose Mobile Money

○ Provider A

○ Provider B

○ Provider C
```

The selected provider should have a clear active state.

Do not use excessive visual effects.

Payment selection should remain fast and obvious.

---

# 18. Language

The primary platform UI language is English.

However, payment instructions may be presented in Swahili where appropriate.

Example:

```text
Follow the instructions sent to your phone
to complete the payment.
```

A payment provider may later provide localized instructions such as:

```text
Fuata maelekezo yaliyotumwa kwenye simu yako
kukamilisha malipo.
```

This does not change the primary language of the platform.

---

# 19. LIPA CTA

The primary payment CTA should be:

**LIPA**

The button must clearly communicate that the customer is initiating payment.

Example:

```text
┌────────────────────────────┐
│          LIPA              │
└────────────────────────────┘
```

Recommended behavior:

```text
Idle
 ↓
LIPA
 ↓
Processing
 ↓
Payment Pending
 ↓
Success / Failed
```

During processing, the button must prevent accidental repeated submission.

---

# 20. Duplicate Click Protection

The frontend should prevent obvious accidental duplicate payment initiation.

When the customer presses:

```text
LIPA
```

the button enters a processing state:

```text
Processing...
```

The customer should not be able to repeatedly trigger the same action through rapid clicks.

This is a frontend UX protection only.

True duplicate-payment prevention must ultimately be enforced by the backend/payment system.

---

# 21. Payment Pending State

Mobile money payments may require the customer to complete an action outside the immediate UI.

The frontend must support:

```text
Payment Pending
```

Example:

```text
Payment is waiting for confirmation.

Check your phone and complete the
mobile money payment request.

[ I'm Still Waiting ]

[ Cancel ]
```

The exact verification mechanism belongs to the backend.

The frontend should present the state without pretending to verify payment independently.

---

# 22. Pending Payment Screen

Recommended visual hierarchy:

```text
Payment Pending

[ Animated status indicator ]

Check your phone to complete payment.

Amount
TZS 3,500

Movie
The Example Movie

Version
DJ Mack

[ Continue Waiting ]

[ Cancel Payment ]
```

Avoid excessive animation.

A subtle status animation is sufficient.

---

# 23. Payment Success

Successful payment should lead to:

```text
/checkout/success
```

The success screen should communicate:

* Payment successful
* Content purchased
* Version purchased
* Access type
* Access duration
* Next available action

Example:

```text
Payment Successful ✓

The Example Movie

DJ Mack
Download Access

Your access is active for 7 Days.

[ DOWNLOAD NOW ]

[ GO TO LIBRARY ]
```

For streaming:

```text
[ WATCH NOW ]
```

---

# 24. Entitlement Activation UX

After successful payment, the customer should see that access has been granted.

Example:

```text
Access Granted

You can now watch this movie.

Expires in 7 Days.
```

The frontend should display entitlement state returned by the future backend.

It must not independently declare a real payment successful.

---

# 25. Purchase Independence From Subscription

Individual purchases and subscriptions must remain separate concepts.

Example:

```text
Customer has:

Subscription
+
Individual Movie Purchase
```

If the subscription expires:

```text
Subscription Access → Expired

Individual Movie Purchase → Still Active
```

provided the individual purchase entitlement has not expired.

The checkout UI must not imply that a subscription is required to purchase an individual movie.

---

# 26. Subscription Purchase

Subscription purchase may use the same general checkout architecture.

However, the summary should describe the plan rather than a movie.

Example:

```text
GIFTEDproMovies Premium

Monthly Subscription

Price
TZS X

Duration
30 Days

Access
Included Content

[ LIPA ]
```

The exact subscription pricing, duration, and scope are Admin-configurable.

---

# 27. Series Purchase

Series purchases require additional context.

Possible business models include:

```text
Per Episode
Per Season
Full Series
Combination
```

These models are configurable and remain a business decision.

The frontend must support the models without hard-coding one as the permanent system.

Examples:

### Episode

```text
Series
Season 1
Episode 4

Watch
TZS X
```

### Season

```text
Series
Season 1

Season Access
TZS X
```

### Full Series

```text
Series

Full Series Access
TZS X
```

---

# 28. Series Order Summary

The customer must clearly understand the scope of the purchase.

Example:

```text
ORDER SUMMARY

Series: Example Series
Season: Season 1
Purchase: Full Season

Access: 30 Days

TOTAL
TZS X
```

Never display only:

```text
Example Series — TZS X
```

if the customer is actually purchasing only one season.

---

# 29. Download Purchase

Download purchases require special clarity.

The customer should understand:

```text
Download Access
```

rather than interpreting the transaction as permanent ownership of an unrestricted file.

Example:

```text
Download Access

Available for 7 Days
```

The actual protected download mechanism belongs to the backend architecture.

The frontend must not expose raw storage URLs or assume unrestricted file access.

---

# 30. Existing Entitlement

If the customer already owns the selected content/version, checkout should not encourage unnecessary repurchase.

Example:

```text
You already have access to this version.

Access expires:
12 September 2026

[ WATCH NOW ]

[ GO TO LIBRARY ]
```

If the customer owns a different DJ/version:

```text
You already own DJ Mack.

This purchase is for DJ John.

```

The UI should clearly distinguish the two.

---

# 31. Expired Entitlement

If previous access expired:

```text
Your previous access has expired.

You can purchase access again.

[ PURCHASE ACCESS ]
```

The customer should not see an expired entitlement as if it were still active.

---

# 32. Payment Failure

Failed payments should lead to:

```text
/checkout/failed
```

Example:

```text
Payment Failed

We could not complete your payment.

No successful access was granted.

[ TRY AGAIN ]

[ CHANGE PAYMENT METHOD ]

[ BACK TO MOVIE ]
```

The exact failure reason should only be shown if the system has a safe, meaningful message.

Avoid exposing internal payment gateway errors.

---

# 33. Cancelled Payment

A customer may cancel a payment.

The UI should clearly differentiate:

```text
Payment Failed
```

from:

```text
Payment Cancelled
```

Cancelled state:

```text
Payment Cancelled

Your payment was not completed.

[ TRY AGAIN ]

[ RETURN TO MOVIE ]
```

---

# 34. Abandoned Checkout

If the customer leaves checkout without completing payment, the purchase must not be presented as successful.

If they later return:

```text
Checkout
```

the frontend may restore the purchase context where appropriate.

However, the UI must not assume that an abandoned order was paid.

---

# 35. Retry Flow

Recommended retry flow:

```text
Failed
 ↓
Try Again
 ↓
Review Checkout
 ↓
LIPA
 ↓
Pending
 ↓
Success / Failed
```

If the failure is related to the payment provider, the customer should have an option to select another supported method if available.

---

# 36. Purchase Context Persistence

Checkout state should survive normal navigation transitions where practical.

For example:

```text
Movie Details
 ↓
Checkout
 ↓
Login
 ↓
Checkout
```

The customer should return to the same intended purchase.

However, sensitive payment information must never be stored in unsafe client persistence.

---

# 37. Browser Refresh

Refreshing `/checkout` should not create a duplicate purchase.

The frontend should restore the checkout context where possible.

If the context is no longer valid:

```text
This checkout session is no longer available.

[ Return to Movie ]
```

The backend will ultimately determine the authoritative order/payment state.

---

# 38. Browser Back Navigation

The browser back button should behave naturally.

Examples:

```text
Checkout
 ← Movie Details
```

and:

```text
Payment Pending
 ← Checkout
```

The UI must avoid trapping customers inside the payment experience.

However, once a payment request is actively processing, leaving the page may require a clear warning depending on the eventual payment architecture.

---

# 39. Loading States

Checkout must have deliberate loading states.

Examples:

```text
Loading purchase...
```

or skeleton representations for:

* Poster
* Title
* Version
* Pricing
* Access duration
* Payment method

Avoid blank screens.

---

# 40. Error States

Potential frontend errors include:

* Invalid purchase context
* Missing movie
* Missing version
* Missing price
* Unsupported purchase type
* Checkout session unavailable
* Payment method unavailable
* Generic service error

Each state must provide a useful recovery action.

Example:

```text
We couldn't load this purchase.

[ Try Again ]

[ Back to Movie ]
```

---

# 41. Empty States

Checkout normally should not have a traditional empty state.

If no purchase context exists:

```text
No purchase selected.

Choose a movie or series to continue.

[ Browse Movies ]
```

Do not render an empty checkout shell.

---

# 42. Mobile Checkout

Mobile is a first-class experience.

The layout should prioritize:

```text
Content
 ↓
Purchase Type
 ↓
Price
 ↓
Payment Method
 ↓
Total
 ↓
LIPA
```

The primary action may use a sticky bottom action area where appropriate.

Example:

```text
────────────────────────
Total
TZS 3,500

[ LIPA ]
────────────────────────
```

The sticky CTA must not cover important content.

---

# 43. Desktop Checkout

Desktop may use a two-column composition:

```text
Content / Purchase Details
            +
Order Summary / Payment
```

The order summary may remain visually anchored while the customer reviews the purchase.

Do not create excessive whitespace.

---

# 44. Responsive Transformation

Desktop:

```text
Two-column
Large poster
Side-by-side summary
```

Tablet:

```text
Reduced two-column layout
or
Stacked sections depending on available width
```

Mobile:

```text
Single column
Compact poster
Clear summary
Sticky LIPA action
```

The mobile layout must be intentionally designed rather than simply compressed.

---

# 45. Accessibility

Checkout must support:

* Keyboard navigation
* Visible focus states
* Proper form labels
* Screen-reader-friendly controls
* Sufficient contrast
* Clear validation messages
* Accessible payment-method selection
* Accessible loading states
* Accessible success/failure messaging
* Touch-friendly controls

The LIPA action must be reachable and understandable without relying only on color.

---

# 46. Motion

Checkout motion should be subtle and purposeful.

Recommended:

* Page entrance fade/transform
* Payment method selection transition
* LIPA processing transition
* Pending status animation
* Success confirmation animation
* Error transition
* Bottom-sheet entrance on mobile where used

Avoid:

* Continuous decorative animation
* Excessive bouncing
* Large card rotations
* Distracting payment animations

Refer to:

`04_MOTION_SYSTEM.md`

---

# 47. Payment Processing Animation

When LIPA is pressed:

```text
LIPA
 ↓
Processing...
 ↓
Payment Pending
```

The transition should communicate that the system has moved from user action to processing.

The button must not simply disappear.

---

# 48. Success Animation

Successful payment may use:

```text
✓
```

with a subtle scale/fade animation.

The animation should immediately transition attention toward:

```text
WATCH NOW
```

or:

```text
DOWNLOAD NOW
```

rather than becoming the main attraction.

---

# 49. Security Boundary

The frontend must never:

* Store payment credentials
* Store mobile-money PINs
* Expose sensitive payment tokens
* Treat client state as proof of payment
* Grant real access solely because a frontend flag changed
* Expose raw protected download URLs
* Trust client-side prices as authoritative
* Trust client-side entitlement state as authoritative

The backend/payment provider will be authoritative for:

```text
Payment
Order
Price
Entitlement
Access
Expiry
Download authorization
```

---

# 50. Price Authority

The frontend may display:

```text
TZS 3,500
```

but this is presentation data.

The backend must ultimately determine the authoritative amount charged.

The frontend must never be treated as the source of truth for transaction pricing.

---

# 51. Entitlement Authority

The frontend may display:

```text
Access: 7 Days
```

but actual access expiration must be determined by the backend.

The frontend must not calculate final entitlement authority independently.

It may calculate presentation values from authoritative backend data once the API exists.

---

# 52. Payment Credentials

The frontend must not collect or store:

* Mobile money PIN
* Card PIN
* Payment passwords
* Provider authentication secrets

If a future provider requires customer interaction, the frontend should display the provider's approved flow or instructions.

---

# 53. Mock Checkout Architecture

During frontend development:

```text
Checkout UI
      ↓
Purchase Controller / Hook
      ↓
Checkout Repository
      ↓
Typed Mock Data
```

Example conceptual methods:

```text
getCheckoutContext()
createMockOrder()
initiateMockPayment()
getMockPaymentStatus()
getMockEntitlement()
```

These are frontend development abstractions.

They are not real payment APIs.

---

# 54. Mock Payment States

The frontend must support deterministic mock states for:

```text
IDLE
PROCESSING
PENDING
SUCCESS
FAILED
CANCELLED
```

This allows all checkout states to be developed and tested without a real payment gateway.

---

# 55. Mock Success Rules

Mock success may simulate:

```text
Payment successful
 ↓
Order successful
 ↓
Entitlement granted
 ↓
Success screen
```

However, this must remain clearly inside the mock environment.

Production must never rely on frontend-generated success state.

---

# 56. Order Model

Checkout should consume the domain models defined in:

`08_DATA_MODELS.md`

Relevant entities include:

```text
Order
OrderItem
Payment
Entitlement
Subscription
```

The checkout UI should not create alternative competing definitions.

---

# 57. Order Item Presentation

An order item should communicate:

```text
What
Which version
Which access type
How much
How long
```

Example:

```text
The Example Movie
DJ Mack
Download
TZS 3,500
7 Days
```

---

# 58. Multi-Item Orders

The initial frontend should primarily optimize for the defined single-purchase journey.

If the business later introduces carts or multi-item checkout, the checkout architecture should be extendable.

Do not implement a shopping cart merely because an `Order` can theoretically contain multiple items.

This is scope control.

---

# 59. Customer-Specific State

Authenticated checkout may consider:

* Existing entitlement
* Existing subscription
* Previously purchased version
* Expired access
* Active access
* Available purchase options

However, the UI must only display information belonging to the authenticated customer.

---

# 60. Subscription Eligibility

If a subscription already includes the selected content, the UI may communicate:

```text
Included with your subscription
```

and offer:

```text
[ WATCH NOW ]
```

instead of unnecessarily pushing another purchase.

The final entitlement decision belongs to the backend.

---

# 61. Individual Purchase Priority

If the customer intentionally chooses an individual purchase, the checkout should clearly preserve that choice.

Subscription availability must not silently replace the selected individual purchase.

---

# 62. Download and Device Access

Download access may eventually be controlled by:

* Customer account
* Authorized device
* Active entitlement
* Access expiration
* Download authorization

The exact maximum-device policy remains unresolved.

Therefore, frontend checkout should not invent a permanent device limit.

If the backend later returns device-related information, the UI can present it.

---

# 63. Purchase Confirmation

A successful purchase confirmation should answer:

> “What did I just buy, and what can I do now?”

Minimum confirmation:

```text
Payment Successful

Content
Version
Purchase Type
Access Duration

[ WATCH NOW / DOWNLOAD NOW ]

[ GO TO LIBRARY ]
```

---

# 64. Post-Purchase Navigation

After success:

### Streaming

```text
Success
 ↓
Watch Now
 ↓
Player
```

### Download

```text
Success
 ↓
Download Now
 ↓
Download Experience
```

### General

```text
Success
 ↓
Library
```

The customer should always have a clear next action.

---

# 65. Success Page Visual Design

The success page should feel premium but restrained.

Recommended:

* Dark cinematic background
* Content poster
* Success indicator
* Clear confirmation
* Access information
* One primary action
* One secondary action

Avoid turning the page into a generic green “payment successful” banking screen.

---

# 66. Failure Page Visual Design

Failure should remain within the GIFTEDproMovies visual language.

Use:

* Dark background
* Clear error state
* Neutral/crimson emphasis
* Concise explanation
* Recovery actions

Do not use aggressive red everywhere.

---

# 67. Payment Method Availability

If no payment method is currently available:

```text
Payment is temporarily unavailable.

Please try again later.

[ BACK ]
```

Do not render an empty payment selector.

---

# 68. Network / Temporary Failure

If the frontend encounters a temporary failure:

```text
Something went wrong.

Your purchase status could not be loaded.

[ Try Again ]
```

The UI must not automatically assume failure means the payment failed.

Payment status must eventually come from the authoritative payment system.

---

# 69. Important Payment Ambiguity

A critical state exists where:

```text
Customer initiated payment
        ↓
Frontend loses connection
        ↓
Payment may or may not have completed
```

The frontend must **not** immediately tell the customer:

```text
Payment failed.
```

Instead, when the future backend supports it, the UI should use a state such as:

```text
Checking payment status...
```

This prevents misleading the customer.

---

# 70. Idempotency UX Concept

True payment idempotency is a backend responsibility.

The frontend nevertheless contributes by:

* Disabling repeated submission
* Showing processing state
* Preventing rapid duplicate clicks
* Maintaining payment context
* Avoiding automatic repeated payment initiation
* Handling uncertain payment states carefully

Backend implementation will later define the actual idempotency mechanism.

---

# 71. Checkout Component Composition

Recommended conceptual composition:

```text
CheckoutPage
├── CheckoutHeader
├── CheckoutContent
│   ├── PurchasePreview
│   ├── PurchaseDetails
│   └── PurchaseOptionSummary
│
├── PaymentSection
│   ├── PaymentMethodSelector
│   └── PaymentInstructions
│
└── CheckoutSummary
    ├── PriceBreakdown
    ├── Total
    └── LipaButton
```

For mobile:

```text
CheckoutPage
├── CheckoutHeader
├── PurchasePreview
├── PurchaseDetails
├── PaymentSection
├── CheckoutSummary
└── StickyCheckoutAction
```

---

# 72. Component Reuse

Reuse existing components where appropriate:

* Poster
* Movie metadata
* MovieVersionSelector
* PurchaseOptions
* Price display
* Button
* Modal
* BottomSheet
* Loading state
* Error state
* Success state

Do not duplicate movie/version display logic specifically for checkout.

---

# 73. Business Logic Separation

Checkout UI components should not contain large transaction workflows.

Prefer:

```text
UI
 ↓
Hook / Controller
 ↓
Repository
 ↓
Mock Data
```

Example conceptual responsibility:

```text
LipaButton
```

should trigger a purchase action.

It should not independently:

* calculate final prices
* generate entitlements
* verify payments
* decide subscription eligibility
* create database records

---

# 74. URL and State Rules

The checkout route may contain a controlled reference to the purchase context.

Do not place sensitive information directly into URLs.

Avoid:

```text
/checkout?mobileMoneyPin=...
```

Never.

Public URLs should not expose sensitive transaction data.

---

# 75. Deep Linking

If a customer opens checkout directly without a valid context:

```text
No purchase selected.
```

Provide:

```text
[ Browse Movies ]
```

or an appropriate recovery action.

Do not crash the application.

---

# 76. SEO

Checkout and payment-result pages are transactional experiences.

They are not primary search-engine landing pages.

The frontend should avoid treating checkout as public content.

Public movie/series pages remain the primary SEO surfaces.

---

# 77. Performance

Checkout should load quickly.

Priorities:

* Minimal JavaScript where possible
* Optimized poster
* No unnecessary large dependencies
* Lazy-load noncritical UI
* Avoid expensive payment animations
* Avoid unnecessary re-renders
* Keep purchase state predictable

The LIPA interaction should feel immediate even when the actual payment is processing asynchronously.

---

# 78. Accessibility of Payment States

Payment status changes must be accessible.

For example:

```text
Payment Pending
```

should be announced appropriately to assistive technologies.

Success/failure messages should not rely only on:

* Color
* Animation
* Icon

Text must communicate the state.

---

# 79. Acceptance Criteria

The purchase flow is considered complete when:

* [ ] `/checkout` exists
* [ ] `/checkout/success` exists
* [ ] `/checkout/failed` exists
* [ ] Guest checkout correctly triggers authentication
* [ ] Checkout context survives login/register
* [ ] Movie purchase is clearly represented
* [ ] Series purchase scope is clearly represented
* [ ] DJ/Translator version is clearly represented
* [ ] Watch vs Download is clearly represented
* [ ] Price is visible
* [ ] Access duration is visible
* [ ] Total is clearly visible
* [ ] LIPA is the primary payment action
* [ ] Payment provider architecture is configurable
* [ ] Provider list is not incorrectly hard-coded as final business truth
* [ ] Pending payment state exists
* [ ] Success state exists
* [ ] Failure state exists
* [ ] Cancelled state exists
* [ ] Retry flow exists
* [ ] Duplicate-click protection exists
* [ ] Existing entitlement state is handled
* [ ] Expired entitlement state is handled
* [ ] Subscription relationship is represented correctly
* [ ] Individual purchases remain independent from subscriptions
* [ ] Download purchase does not imply unrestricted raw-file access
* [ ] No payment credentials are stored
* [ ] No frontend-only payment verification is treated as authoritative
* [ ] Mock repository boundary exists
* [ ] Mock payment states are deterministic
* [ ] Mobile layout is intentionally designed
* [ ] Desktop layout is intentionally designed
* [ ] Accessibility requirements are met
* [ ] Loading states exist
* [ ] Error states exist
* [ ] Empty/invalid context state exists
* [ ] Browser refresh does not accidentally duplicate a purchase
* [ ] Browser navigation behaves predictably
* [ ] Motion follows the motion system
* [ ] Components are reused rather than duplicated
* [ ] No backend or real payment API is implemented in this frontend phase

---

# 80. AI Coding Agent Directive

An AI coding agent implementing this document MUST:

1. Read `00_PROJECT_RULES.md` first.
2. Read all preceding frontend documents relevant to checkout.
3. Treat this document as the checkout source of truth.
4. Never invent unsupported payment providers.
5. Never hard-code business pricing.
6. Never hard-code access duration.
7. Never implement a backend.
8. Never create a fake production payment gateway.
9. Never store payment credentials.
10. Never treat frontend state as proof of payment.
11. Never invent a device limit.
12. Never invent a final series pricing model.
13. Never silently change Watch vs Download behavior.
14. Preserve DJ/Translator version isolation.
15. Preserve subscription vs individual purchase independence.
16. Build all required loading, pending, success, failed, and cancelled states.
17. Prevent accidental repeated payment initiation at the UI level.
18. Keep payment architecture replaceable.
19. Use typed mock data.
20. Reuse established components.
21. Follow the existing design system.
22. Follow the motion system.
23. Build mobile-first and responsive behavior.
24. Respect accessibility requirements.
25. Do not turn unresolved business decisions into permanent implementation assumptions.
26. If a requirement is genuinely ambiguous, stop and request clarification rather than guessing.

---

# 81. Definition of Done

MD-16 is complete when the customer can visually experience the complete journey:

```text
Browse
  ↓
Movie / Series Details
  ↓
Select Version
  ↓
Select Watch / Download
  ↓
LIPA
  ↓
Authentication if required
  ↓
Checkout
  ↓
Select Mobile Money
  ↓
LIPA
  ↓
Processing
  ↓
Pending
  ↓
Success / Failed / Cancelled
  ↓
Access / Library / Retry
```

All states must work using deterministic typed mock data.

The frontend must be ready for future backend integration without requiring the checkout UI to be fundamentally redesigned.

---

# 82. Final Product Principle

The GIFTEDproMovies checkout should feel like:

> **“I know exactly what I'm buying, how much I'm paying, what access I'm getting, and what happens next.”**

No confusion.

No hidden assumptions.

No unnecessary friction.

No generic payment-page feeling.

The experience should combine:

**Premium cinematic design + clear commerce + African-market payment practicality + strong access control boundaries.**

---

# 83. Next Document

The next document is:

`17_STREAMING_UI.md`

It will define the complete streaming/watch experience, including:

* Video player architecture
* Movie playback
* Episode playback
* Player controls
* Continue Watching
* Progress tracking
* Subtitle/audio controls
* Fullscreen
* Quality selection
* Access validation UI
* Expired access
* Subscription access
* Purchased access
* Protected playback UX
* Mobile player
* Desktop player
* Loading/buffering/error states
* Player motion
* Next episode
* Autoplay behavior
* Resume playback
* Related content
* Watch-page architecture
* Frontend/backend boundary
* Accessibility
* Performance
* Security considerations
* AI coding-agent implementation rules
