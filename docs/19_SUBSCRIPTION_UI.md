# GIFTEDproMovies — Subscription Experience & Membership UI Specification

**Document ID:** MD-19
**Version:** 1.0
**Status:** Frontend Specification
**Scope:** Frontend only
**Previous Document:** `18_DOWNLOAD_UI.md`
**Next Document:** `20_ADMIN_UI.md`

---

# 1. Purpose

This document defines the complete subscription experience for GIFTEDproMovies.

It covers:

* Subscription discovery
* Subscription plans
* Plan comparison
* Pricing presentation
* Subscription duration
* Included content
* Streaming access
* Download access
* Subscription purchase
* Active subscription
* Expired subscription
* Renewal
* Subscription-aware Library
* Account subscription page
* Subscription states
* Relationship between subscriptions and individual purchases
* Mobile and desktop UX
* Mock subscription architecture
* Frontend security boundaries

This document does **not** implement real payment processing, backend subscription management, billing infrastructure, or entitlement enforcement.

---

# 2. Core Subscription Principle

A subscription is an **access product**.

It is not the same thing as purchasing a specific movie.

The system must clearly distinguish:

```text
INDIVIDUAL PURCHASE
        ↓
Specific content entitlement
```

from:

```text
SUBSCRIPTION
        ↓
Subscription-based entitlement
        ↓
Eligible content
```

A customer may have both at the same time.

Example:

```text
Customer
│
├── Premium Subscription
│     ├── Movie A
│     ├── Movie B
│     └── Series C
│
└── Individual Purchase
      └── Movie X
```

These entitlements must remain logically independent.

---

# 3. Subscription Discovery

Customers should discover subscriptions naturally without being forced into them.

Primary discovery points:

* Header/navigation
* Homepage promotional area where appropriate
* Movie details
* Series details
* Checkout
* Account
* Library
* Access-denied/expired states

Example:

```text
Premium Access

Watch more. Download more.

[ VIEW PLANS ]
```

Subscription promotion must never obstruct normal browsing.

---

# 4. Subscription Route

Primary public route:

```text
/subscriptions
```

This is the subscription discovery and plan-selection page.

Authenticated users may also access:

```text
/account/subscription
```

This is their personal subscription-management page.

The two pages have different responsibilities.

---

# 5. `/subscriptions`

Purpose:

```text
Discover
Compare
Choose
Subscribe
```

It should answer:

* What plans exist?
* How much do they cost?
* How long do they last?
* What content is included?
* Does the plan support streaming?
* Does it support downloading?
* What are the limitations?

---

# 6. `/account/subscription`

Purpose:

```text
Understand current subscription
Manage subscription state
View access information
```

It should answer:

* What plan am I on?
* When does it expire?
* What access do I have?
* Is it active?
* Is it expired?
* What content is included?
* What should I do next?

---

# 7. Subscription Plan Model

Plans are Admin-configured.

The frontend must not hard-code:

```text
Monthly = TZS 10,000
Annual = TZS 100,000
```

unless those values actually come from the data source.

A plan conceptually contains:

```text
id
name
description
price
currency
duration
scope
streamingAccess
downloadAccess
includedContent
status
featured
```

The canonical domain model is defined in:

```text
08_DATA_MODELS.md
```

---

# 8. Subscription Duration

Duration is configurable by Admin.

Possible examples:

```text
7 Days
30 Days
90 Days
180 Days
365 Days
```

The frontend must display the configured value.

Do not assume:

```text
subscription = monthly
```

unless the actual plan says so.

---

# 9. Subscription Scope

A subscription may cover:

### Entire Platform

```text
All eligible movies and series
```

### Selected Categories

```text
Christian
Cartoon
Superhero
```

### Selected Collections

```text
Featured Collection
```

### Other Configured Scope

The frontend should support the domain model without inventing additional business rules.

---

# 10. Subscription Content Eligibility

Not every content item must automatically be subscription-accessible.

A movie may be:

```text
INDIVIDUAL_ONLY
```

or:

```text
SUBSCRIPTION_INCLUDED
```

or potentially:

```text
BOTH
```

Example:

```text
Premium Subscription
✓ Movie A
✓ Movie B
✓ Series C

Movie X
Individual Purchase Only
```

The UI must communicate this clearly.

---

# 11. Subscription Plan Card

Core component:

```text
SubscriptionPlanCard
```

Example:

```text
┌───────────────────────────────────────┐
│ PREMIUM                               │
│                                       │
│ TZS 15,000                            │
│ 30 Days                               │
│                                       │
│ ✓ Stream eligible content             │
│ ✓ Download eligible content           │
│ ✓ Movies                              │
│ ✓ Series                              │
│                                       │
│ [ SUBSCRIBE ]                         │
└───────────────────────────────────────┘
```

---

# 12. Featured Subscription

Admin may mark a plan as featured.

Featured plan presentation may use:

* Gold accent
* subtle elevation
* `POPULAR` or `RECOMMENDED` badge
* stronger visual hierarchy

Avoid excessive visual effects.

Example:

```text
POPULAR
PREMIUM
```

The badge must not imply a plan is popular unless the data actually represents that state.

---

# 13. Plan Comparison

When multiple plans exist, customers should be able to compare them quickly.

Example:

| Feature   |   Basic | Premium |     VIP |
| --------- | ------: | ------: | ------: |
| Duration  | 30 Days | 30 Days | 90 Days |
| Streaming |       ✓ |       ✓ |       ✓ |
| Download  |       — |       ✓ |       ✓ |
| Movies    |       ✓ |       ✓ |       ✓ |
| Series    | Limited |       ✓ |       ✓ |

The actual features must come from plan data.

Do not invent feature limitations.

---

# 14. Mobile Plan Comparison

Desktop comparison tables should not be blindly copied to mobile.

Mobile should use:

```text
Plan Card
   ↓
Feature Summary
   ↓
Expand Details
```

or horizontally scrollable comparison when genuinely necessary.

Avoid tiny tables that require excessive zooming.

---

# 15. Subscription CTA

Primary CTA:

```text
SUBSCRIBE
```

If the product consistently uses the payment action language:

```text
LIPA
```

the checkout stage may use:

```text
LIPA
```

while the subscription discovery CTA remains:

```text
SUBSCRIBE
```

This keeps:

```text
Discovery intent
```

separate from:

```text
Payment intent
```

---

# 16. Subscription Purchase Flow

Recommended:

```text
/subscriptions
      ↓
Select Plan
      ↓
Review Subscription
      ↓
Login/Register if necessary
      ↓
Checkout
      ↓
Choose Mobile Money
      ↓
LIPA
      ↓
Payment Pending
      ↓
Payment Success
      ↓
Subscription Activated
```

The subscription should not be considered active merely because the customer clicked the payment button.

---

# 17. Guest Subscription Flow

Guests may browse plans.

When they select:

```text
SUBSCRIBE
```

they may be prompted to authenticate.

Flow:

```text
Guest
 ↓
Select Plan
 ↓
Login/Register
 ↓
Return to Selected Plan
 ↓
Checkout
```

The selected plan must not be lost.

---

# 18. Authentication Context Preservation

If authentication interrupts subscription checkout, preserve:

* selected plan
* selected subscription intent
* checkout context

Example:

```text
Premium
TZS 15,000
30 Days
```

After login, the customer should return to the same plan.

Do not return the customer randomly to the homepage.

---

# 19. Subscription Checkout Summary

Example:

```text
Premium

30 Days

Subscription
TZS 15,000

Access:
✓ Streaming
✓ Download

[ LIPA ]
```

Pricing must be transparent.

Do not hide the duration.

---

# 20. Mobile Money

Subscription payment supports Tanzania Mobile Money.

The exact providers remain a business/backend decision.

Do not hard-code providers before they are formally selected.

Potential future provider data may include:

```text
Provider
Display Name
Logo
Availability
Instructions
```

---

# 21. Payment Language

The platform's primary navigation and content labels remain English.

Payment instructions may be presented in Swahili where this improves usability.

Example:

```text
Lipa kupitia simu yako

Fuata maelekezo yaliyotumwa kwenye simu yako.
```

This language boundary should remain intentional.

---

# 22. Payment Pending

After payment initiation:

```text
Payment Pending

We're waiting for payment confirmation.

Please complete the payment on your phone.
```

Do not immediately show:

```text
Subscription Active
```

until the actual payment state is successful.

During frontend-only development, this may be represented using deterministic mock states.

---

# 23. Subscription Activation

Successful activation:

```text
✓ Subscription Active

Premium
30 Days

Expires:
24 October 2026

[ Start Watching ]
```

If download access is included:

```text
✓ Streaming
✓ Download
```

---

# 24. Subscription Success Page

After successful subscription:

```text
┌────────────────────────────────────┐
│ ✓ You're all set                   │
│                                    │
│ Premium                             │
│ Active for 30 Days                  │
│                                    │
│ Streaming ✓                         │
│ Downloads ✓                         │
│                                    │
│ [ START WATCHING ]                  │
│ [ VIEW SUBSCRIPTION ]               │
└────────────────────────────────────┘
```

Keep the experience cinematic and concise.

---

# 25. Active Subscription State

Authenticated customer account should clearly show:

```text
Premium
ACTIVE

Expires in 18 days
```

Potential supporting information:

```text
Streaming ✓
Downloads ✓
Eligible Content ✓
```

---

# 26. Expiring Soon

When the subscription is approaching expiration, show a contextual notice.

Example:

```text
Premium
Expires in 3 days

[ Renew Subscription ]
```

The exact threshold for "expiring soon" should remain configurable/product-defined.

Do not hard-code a business rule such as exactly 3 days unless approved.

---

# 27. Expired Subscription

Example:

```text
Subscription Expired

Your Premium subscription expired on
24 September 2026.

Your individually purchased content remains
available according to its own entitlement.

[ VIEW PLANS ]
```

This message is important because subscription expiry must not imply loss of individual purchases.

---

# 28. Subscription Renewal

If renewal is supported:

```text
Current Plan
Premium

Expires:
24 October 2026

[ RENEW ]
```

Renewal flow:

```text
Account
 ↓
Subscription
 ↓
Renew
 ↓
Review
 ↓
LIPA
 ↓
Payment
 ↓
Renewed
```

The exact renewal behavior is a business/backend decision.

The frontend must not assume whether renewal:

* extends current expiry
* starts after current expiry
* immediately replaces the existing period

until the backend contract defines it.

---

# 29. Plan Change

If plan switching is eventually supported, the UI must clearly distinguish:

```text
Upgrade
Downgrade
Change Plan
```

Do not implement plan-switching behavior until the billing rules are defined.

Potential complications include:

* remaining time
* prorating
* immediate activation
* next-cycle changes
* refund handling

These are backend/business concerns.

---

# 30. Subscription Cancellation

If cancellation is supported later, the UI should not automatically imply immediate loss of access.

Possible future state:

```text
Cancellation Scheduled

Your Premium access remains active until
24 October 2026.

[ Undo Cancellation ]
```

The exact cancellation behavior must be defined by the business/backend contract.

---

# 31. Subscription vs Individual Purchase

This is a critical product rule.

Example:

```text
Customer owns:

Premium Subscription
+
Movie X — Individual Purchase
```

If Premium expires:

```text
Premium
✕ Expired

Movie X
✓ Individually Purchased
✓ Still Available
```

The UI must use entitlement information rather than simply checking:

```text
subscriptionActive === false
```

to remove all access.

---

# 32. Subscription + Movie Purchase

If a customer attempts to purchase a movie already included in an active subscription, the UI should avoid creating unnecessary confusion.

Possible state:

```text
Included in your subscription

You already have access to this title.

[ WATCH ]
[ DOWNLOAD ]
```

The exact treatment of purchasing subscription-included content remains a business decision.

Do not invent refund or duplicate-purchase rules.

---

# 33. Subscription-Aware Movie Details

Movie details may show:

```text
Included with Premium
```

instead of only:

```text
DOWNLOAD — TZS 4,000
```

Example:

```text
Premium
✓ Included

[ WATCH ]
[ DOWNLOAD ]
```

If only streaming is included:

```text
Premium
✓ Streaming included

Download
TZS 4,000
```

The frontend must derive this from entitlement/plan data.

---

# 34. Subscription-Aware Series

Series may display:

```text
Included with Premium
```

at:

* series level
* season level
* episode level

depending on the actual subscription scope.

Do not assume that access to one episode means access to the entire series unless the entitlement model says so.

---

# 35. Subscription + DJ/Translator Versions

Subscription eligibility may need to account for versions.

Example:

```text
Premium

DJ Mack ✓
Original ✓
DJ John ✕
```

If version-specific subscription access is supported, the UI must communicate it.

If subscription applies to the content regardless of version, the backend entitlement contract should define that behavior.

The frontend must not guess.

---

# 36. Subscription + Download

If a plan includes downloads:

```text
Premium
✓ Download access
```

Movie:

```text
[ DOWNLOAD ]
Included with Premium
```

The actual download authorization remains backend-controlled.

The frontend only represents the current entitlement state.

---

# 37. Subscription + Streaming

If a plan includes streaming:

```text
[ WATCH ]
Included with Premium
```

If streaming is not included:

```text
WATCH
TZS 2,000
```

The UI must distinguish these states clearly.

---

# 38. Subscription Library

The Library should visually communicate subscription-based content without overwhelming the customer.

Example:

```text
YOUR LIBRARY

Continue Watching
...

Your Movies
...

Your Series
...

Premium Access
...
```

Content may carry a subtle badge:

```text
PREMIUM
```

or:

```text
SUBSCRIPTION
```

Do not badge every card unnecessarily.

---

# 39. Subscription Content Expiry

If content access depends on subscription:

```text
Premium
Expires in 3 days
```

the Library may show:

```text
Available through subscription
```

The UI should avoid suggesting that the customer permanently owns subscription content.

---

# 40. Individual Purchase Badge

Individually purchased content may display:

```text
PURCHASED
```

while subscription content may display:

```text
PREMIUM
```

This distinction helps customers understand why access exists.

---

# 41. Library Access Hierarchy

Recommended conceptual hierarchy:

```text
ACTIVE INDIVIDUAL ENTITLEMENT
        ↓
ACTIVE SUBSCRIPTION ENTITLEMENT
        ↓
OTHER VALID ACCESS
        ↓
EXPIRED
        ↓
UNAVAILABLE
```

The actual entitlement calculation belongs to the backend.

The frontend should consume the resulting state.

---

# 42. Account Subscription Page

Recommended structure:

```text
Subscription

┌─────────────────────────────────────┐
│ Premium                             │
│ ACTIVE                              │
│                                     │
│ Expires 24 October 2026             │
│                                     │
│ ✓ Streaming                         │
│ ✓ Downloads                         │
│                                     │
│ [ RENEW ]                            │
└─────────────────────────────────────┘


Included Access

Movies
Series
...
```

---

# 43. No Active Subscription

Example:

```text
No active subscription

Choose a plan to unlock subscription
access to eligible movies and series.

[ VIEW PLANS ]
```

The page should remain useful even without an active plan.

---

# 44. Subscription History

Subscription history may eventually be represented on:

```text
/account/subscription
```

Potential fields:

```text
Plan
Start Date
End Date
Status
```

However, detailed billing history belongs to the purchase/order architecture and should not be duplicated unnecessarily.

---

# 45. Subscription Statuses

Recommended states:

```text
ACTIVE
EXPIRED
PENDING
CANCELLED
SCHEDULED_FOR_CANCELLATION
PAYMENT_FAILED
```

Only implement states that are supported by the domain/backend contract.

---

# 46. Subscription State Machine

Conceptually:

```text
                 ┌─────────────┐
                 │   SELECT    │
                 │    PLAN     │
                 └──────┬──────┘
                        ↓
                 ┌─────────────┐
                 │   CHECKOUT  │
                 └──────┬──────┘
                        ↓
                 ┌─────────────┐
                 │   PENDING   │
                 └──────┬──────┘
                    ┌───┴────┐
                    ↓        ↓
                 ACTIVE    FAILED
                    │
                    ↓
              EXPIRING SOON
                    │
                    ↓
                 EXPIRED
```

Cancellation, renewal and plan-change states may branch from the active state once backend rules are defined.

---

# 47. Subscription Loading State

Example:

```text
Loading subscription...
```

Use skeletons for:

* plan card
* price
* status
* expiry
* included features

Avoid showing fake values while data is loading.

---

# 48. Subscription Error State

Example:

```text
We couldn't load your subscription.

[ Try Again ]
```

Do not expose backend errors.

---

# 49. Subscription Empty State

For public `/subscriptions`, there should ideally be an intentional state if no plans are currently available:

```text
Subscriptions are currently unavailable.

You can still purchase movies individually.

[ EXPLORE MOVIES ]
```

The exact copy can be refined during implementation.

---

# 50. Responsive Design

Desktop:

```text
Plans → Horizontal comparison
```

Tablet:

```text
Plans → Flexible cards
```

Mobile:

```text
Plans
 ↓
Stacked cards
 ↓
Expandable details
 ↓
Sticky CTA where useful
```

Never shrink desktop layouts until they become unreadable.

---

# 51. Mobile Subscription CTA

On long plan-detail views, a sticky mobile CTA may be used:

```text
Premium · TZS 15,000

[ SUBSCRIBE ]
```

It must not cover important content.

Respect safe-area insets on devices that require them.

---

# 52. Subscription Motion

Use restrained motion.

### Plan selection

```text
Unselected
   ↓
Selected
```

Use:

* border transition
* subtle elevation
* small scale
* active indicator

### Activation

Use:

* subtle success transition
* status change
* controlled checkmark

### Expiry

No dramatic animation.

Motion follows:

```text
04_MOTION_SYSTEM.md
```

---

# 53. Subscription Card Interaction

Desktop:

* hover may elevate the selected/interactive card
* featured plan may reveal subtle premium treatment

Mobile:

* no hover dependency
* tap selects
* expanded information appears intentionally

Do not hide critical plan information behind hover.

---

# 54. Accessibility

Subscription experience must support:

* keyboard navigation
* visible focus
* screen-reader labels
* accessible radio/selection semantics
* clear status announcements
* sufficient contrast
* touch-friendly targets

Plan selection must not rely only on color.

Example:

```text
✓ SELECTED
```

is preferable to changing border color without additional semantic indication.

---

# 55. Pricing Accessibility

Always communicate:

```text
Price
Currency
Duration
```

Example:

```text
TZS 15,000
30 Days
```

Avoid:

```text
15,000
```

without currency.

---

# 56. Financial Security Boundary

Customer-facing subscription UI must never expose:

* internal revenue
* total platform sales
* other customers' payments
* payment credentials
* provider secrets
* internal transaction IDs unless intentionally customer-safe
* API keys
* private payment metadata

The customer's subscription information is allowed.

Admin financial information remains restricted to Admin.

---

# 57. Frontend Authorization Boundary

Frontend may determine what UI to **present** based on the current session/mock state.

It must not be the ultimate authority.

Example:

```text
Frontend:
Premium active
```

does not replace:

```text
Backend:
Subscription entitlement verified
```

Backend will ultimately control access to:

* streaming
* downloads
* subscription content
* protected media

---

# 58. Mock Subscription Architecture

Recommended:

```text
Subscription UI
      ↓
Subscription Controller
      ↓
Subscription Repository
      ↓
Typed Mock Subscription Data
```

Future:

```text
Subscription UI
      ↓
Subscription Controller
      ↓
Subscription Repository
      ↓
Backend API
      ↓
Billing / Subscription System
```

---

# 59. Mock Subscription Data

Mock data must include varied states.

Minimum recommended scenarios:

```text
Active subscription
Expired subscription
Pending subscription
Payment failed
Featured plan
Multiple plans
Streaming-only plan
Streaming + download plan
Different durations
Different prices
Different content scopes
```

Only implement states represented by the approved domain model.

---

# 60. Mock Customer Scenarios

At least these customer profiles should exist in mock development data:

### Customer A

```text
No subscription
No individual purchases
```

### Customer B

```text
Active subscription
```

### Customer C

```text
Expired subscription
Individual purchase still active
```

### Customer D

```text
Active subscription
+
Multiple individual purchases
```

These scenarios are critical for validating entitlement-aware UI.

---

# 61. Subscription Data Boundary

Components should receive typed view models.

Example:

```text
SubscriptionPlanViewModel
SubscriptionStatusViewModel
SubscriptionAccessViewModel
```

Do not spread raw backend-shaped objects throughout the UI.

Use mapping at the repository/service boundary when needed.

---

# 62. No Direct Payment Integration

During frontend implementation, do not add:

```text
M-Pesa API
Airtel Money API
Mixx by Yas API
HaloPesa API
```

or any real payment provider integration.

The payment provider decision is still pending.

The frontend should use mock payment states.

---

# 63. No Fake Subscription Activation

Do not create an implementation where:

```text
User clicks SUBSCRIBE
        ↓
setSubscription(true)
```

and treat this as a production-ready billing model.

For the frontend prototype, mock state is acceptable.

But the architecture must clearly separate:

```text
UI simulation
```

from:

```text
real subscription activation
```

---

# 64. Subscription Expiration

Expiration should be represented through data.

Example:

```text
expiresAt
```

rather than hard-coded UI logic such as:

```text
if plan === "Premium" → expires in 30 days
```

The UI may format:

```text
Expires in 12 days
```

from the supplied expiration timestamp.

---

# 65. Subscription Countdown

A live countdown is not required.

Prefer:

```text
Expires 24 October 2026
```

and optionally:

```text
12 days remaining
```

where appropriate.

Do not run continuous timers unnecessarily across the entire application.

---

# 66. Content Access Messaging

Good:

```text
Included with Premium
```

Good:

```text
Purchased
```

Good:

```text
Download available
```

Avoid ambiguous:

```text
Unlocked
```

unless the exact access meaning is clear.

---

# 67. Subscription Discovery Loop

Subscription should integrate with content discovery.

Example:

```text
Movie Details
     ↓
"This movie is included with Premium"
     ↓
[ VIEW PLANS ]
     ↓
Subscriptions
     ↓
Choose Plan
     ↓
Subscribe
     ↓
Return to Movie
     ↓
WATCH
```

This creates a contextual conversion flow instead of a disconnected pricing page.

---

# 68. Return Context After Subscription

After successful subscription, customers should have a clear path back to the content they intended to access.

Example:

```text
Movie Details
 ↓
View Plans
 ↓
Subscribe
 ↓
Success
 ↓
Back to Movie
 ↓
Watch
```

The original context should be preserved where technically appropriate.

---

# 69. Subscription + Search

Search results may show:

```text
Premium
```

for eligible content.

However, search results must remain content-first.

Do not transform search into a subscription sales page.

---

# 70. Subscription + Trending

Trending content may include subscription-accessible titles.

The Trending rail should not become dominated by subscription labels.

Subscription is an access property, not the primary content identity.

---

# 71. Subscription + Download Page

The `/downloads` experience defined in MD-18 must understand subscription-derived entitlement.

Example:

```text
The Dark Journey
Premium Download
Expires with subscription
```

Only show this wording if the entitlement model explicitly supports it.

---

# 72. Subscription + Player

The streaming player must not assume that:

```text
subscriptionActive = true
```

is sufficient.

The player should consume the actual playback authorization state.

See:

```text
17_STREAMING_UI.md
```

---

# 73. Subscription + Device Access

If future subscription rules limit devices, the UI may show:

```text
Active devices
2 / 3
```

or:

```text
Device limit reached
```

However, the exact maximum number of devices is still unresolved.

Do not hard-code a device limit.

---

# 74. Subscription Security

Never expose:

* subscription authorization tokens
* internal billing credentials
* provider secrets
* private API responses
* customer billing data belonging to other users

The frontend should receive only the minimum data required to render the customer's subscription experience.

---

# 75. Performance

Subscription pages should remain lightweight.

Use:

* optimized plan cards
* lazy loading where justified
* minimal animation
* no unnecessary polling
* efficient state updates

Do not continuously recalculate subscription status on every render.

---

# 76. SEO

The public `/subscriptions` page may be indexable because it represents a public product offering.

The authenticated:

```text
/account/subscription
```

page must not be treated as public content.

Private account information must not be exposed through metadata.

---

# 77. Component Architecture

Recommended:

```text
features/subscriptions/
├── components/
│   ├── SubscriptionPlanCard.tsx
│   ├── SubscriptionPlanGrid.tsx
│   ├── SubscriptionFeatureList.tsx
│   ├── SubscriptionStatusCard.tsx
│   ├── SubscriptionBadge.tsx
│   ├── SubscriptionAccessSummary.tsx
│   └── SubscriptionEmptyState.tsx
│
├── hooks/
│   ├── useSubscription.ts
│   └── useSubscriptionPlans.ts
│
├── services/
│   └── subscriptionRepository.ts
│
├── types/
│   └── subscription.types.ts
│
└── utils/
    └── subscriptionFormatters.ts
```

Follow the broader architecture defined in:

```text
05_FRONTEND_ARCHITECTURE.md
07_COMPONENT_ARCHITECTURE.md
```

---

# 78. Component Reuse

The same subscription plan component should be reusable in:

* `/subscriptions`
* checkout
* account
* contextual upgrade prompts

Use variants rather than duplicate components.

Example:

```text
SubscriptionPlanCard
variant="full"
variant="compact"
variant="checkout"
```

---

# 79. Business Logic Separation

Components should not calculate complex entitlement rules.

Avoid:

```text
if subscription && movie.category === ...
```

inside random UI components.

Prefer:

```text
Subscription Repository
        ↓
Access View Model
        ↓
UI
```

This keeps business rules centralized.

---

# 80. Loading / Error / Empty

Every subscription surface must intentionally support:

```text
Loading
Loaded
Empty
Error
```

For example:

```text
Loading plans...
```

```text
No subscription plans available
```

```text
Unable to load plans
[ Try Again ]
```

Do not leave blank screens.

---

# 81. Anti-Patterns

Do not build:

* generic SaaS pricing page
* excessive pricing gradients
* three identical cards with no hierarchy
* fake "best value" labels
* fake discount percentages
* hard-coded plan prices
* hard-coded duration
* hard-coded device limits
* fake payment success
* subscription boolean as the entire entitlement model
* hiding individual purchases after subscription expiry
* forcing subscription before browsing
* confusing subscription with ownership
* backend/payment code inside UI components
* frontend-only authorization

---

# 82. Acceptance Criteria

MD-19 is complete only when:

* `/subscriptions` exists
* subscription plans are represented using typed data
* plan price is visible
* plan duration is visible
* plan scope is represented
* streaming access is represented
* download access is represented
* featured plan state is supported
* multiple plans can be displayed
* plan selection works in mock mode
* guest authentication flow is represented
* checkout transition is represented
* payment pending state is represented
* payment success state is represented
* payment failure state is represented
* active subscription state exists
* expired subscription state exists
* renewal UI can be represented
* individual purchases remain independent
* subscription content can be distinguished from purchased content
* subscription-aware movie/series states are supported
* subscription-aware Library state is supported
* `/account/subscription` exists
* empty state exists
* loading state exists
* error state exists
* mobile experience is intentionally designed
* desktop experience is intentionally designed
* accessibility requirements are met
* motion follows MD-05
* no real payment provider is implemented
* no backend subscription system is implemented
* no fake production security claims are made
* no business rules are invented
* mock subscription data supports realistic customer scenarios

---

# 83. AI Coding Agent Directive

The implementation agent MUST treat this document as a binding frontend specification.

The agent MUST NOT:

* invent subscription prices
* invent subscription durations
* invent subscription scopes
* invent payment providers
* invent renewal rules
* invent cancellation rules
* invent refund rules
* invent prorating
* invent device limits
* invent content eligibility
* invent version eligibility
* treat subscription as permanent ownership
* remove individually purchased content after subscription expiry
* implement real payment APIs
* implement backend subscription logic
* create fake production authorization
* silently modify business rules

If a requirement is undefined:

```text id="d4p0ak"
STOP
↓
Identify ambiguity
↓
Ask for clarification
```

---

# 84. Final Product Principle

GIFTEDproMovies's subscription experience must communicate one simple idea:

> **Subscribe for broader access. Purchase individually when you want specific content.**

The architecture must preserve the distinction:

```text
SUBSCRIPTION
     ↓
Temporary access based on plan
```

versus:

```text
INDIVIDUAL PURCHASE
     ↓
Specific purchased entitlement
```

A customer can have both.

The UI must never make the customer wonder:

> "If my subscription ends, do I lose the movie I already bought?"

The answer must remain clear:

```text
Subscription expires
        ↓
Subscription access ends

Individual purchase
        ↓
Remains available according to its own entitlement
```

That separation is a core GIFTEDproMovies product rule.

---

# 85. Next Document

Proceed to:

```text
20_ADMIN_UI.md
```

The next document will define the **Admin experience**, including:

* Admin dashboard
* Revenue and sales visibility
* Movies management
* Series management
* Seasons and episodes
* Categories
* Countries
* DJs/Translators
* Users
* Media Team management
* Subscriptions
* Pricing
* Orders
* Payments
* Featured content
* Trending controls
* System settings
* Content publishing
* Upload workflows
* Admin-only financial information
* Responsive admin experience
* Permissions and UI boundaries
* Mock Admin architecture
* QA and acceptance criteria
